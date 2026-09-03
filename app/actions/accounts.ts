"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

/*
 * Recoverable account deletion — self-service and admin. See
 * supabase/migrations/20260902140000_recoverable_account_deletion.sql
 * for the full design. Short version: "delete" bans the account for 14
 * days (instant, reversible, and the app already treats a banned
 * account as signed-out) and records it in pending_deletions; "restore"
 * un-bans and clears that record; after 14 days a scheduled database
 * job erases the account for real.
 *
 * The ban/un-ban calls need the service-role client (lib/supabase/admin.ts)
 * — that's an auth-admin operation, not something the normal RLS-scoped
 * client can do. The pending_deletions bookkeeping goes through the
 * normal client instead, on purpose: request_account_deletion() and
 * restore_account() re-check admin status themselves, so a bug here
 * can't silently skip that check.
 */

export type ActionResult = { error: string } | { ok: string } | undefined;

const DELETION_BAN = "336h"; // 14 days

/** A reader deleting their own account, from /profile. */
export async function deleteMyAccount(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "NOT SIGNED IN" };

  const admin = createAdminClient();
  const { error: banError } = await admin.auth.admin.updateUserById(user.id, {
    ban_duration: DELETION_BAN,
  });
  if (banError) return { error: banError.message.toUpperCase() };

  const { error } = await supabase.rpc("request_account_deletion", {
    p_user_id: user.id,
    p_deleted_by: "self",
  });
  if (error) return { error: error.message.toUpperCase() };

  await supabase.auth.signOut();
  redirect("/");
}

/** An admin deleting someone else's account, from /admin/users/[id]. */
export async function adminDeleteAccount(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "NO ACCOUNT SPECIFIED" };

  const me = await getCurrentUser();
  if (!me) return { error: "NOT SIGNED IN" };
  if (!me.isAdmin) return { error: "ADMIN ONLY" };

  const supabase = await createClient();
  const admin = createAdminClient();

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: DELETION_BAN,
  });
  if (banError) return { error: banError.message.toUpperCase() };

  const { error } = await supabase.rpc("request_account_deletion", {
    p_user_id: userId,
    p_deleted_by: "admin",
  });
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/trash");
  return { ok: "deleted" };
}

/** Undoes a pending deletion — self or admin-initiated, either way admin-only to reverse. */
export async function adminRestoreAccount(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "NO ACCOUNT SPECIFIED" };

  const me = await getCurrentUser();
  if (!me) return { error: "NOT SIGNED IN" };
  if (!me.isAdmin) return { error: "ADMIN ONLY" };

  const supabase = await createClient();
  const admin = createAdminClient();

  const { error: unbanError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (unbanError) return { error: unbanError.message.toUpperCase() };

  const { error } = await supabase.rpc("restore_account", { p_user_id: userId });
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/trash");
  return { ok: "restored" };
}

/*
 * Force rename and Ban account — see the plain-English design covering
 * both, and supabase/migrations/20260903000000_profiles_admin_update.sql
 * / 20260903000100_account_bans.sql.
 */

const BAN_DURATIONS: Record<string, { supabaseDuration: string; ms: number }> = {
  "6 hours": { supabaseDuration: "6h", ms: 6 * 60 * 60 * 1000 },
  "1 day": { supabaseDuration: "24h", ms: 24 * 60 * 60 * 1000 },
  "1 week": { supabaseDuration: "168h", ms: 7 * 24 * 60 * 60 * 1000 },
  "1 month": { supabaseDuration: "720h", ms: 30 * 24 * 60 * 60 * 1000 },
};

/** Always available — nothing in the real, filter-at-signup system ever flags a name automatically, so this isn't gated behind that. */
export async function adminForceRename(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = String(formData.get("userId") ?? "");
  const newName = String(formData.get("newName") ?? "").trim();
  if (!userId || !newName) return { error: "TYPE A NAME FIRST" };

  const supabase = await createClient();

  const { data: verdict } = await supabase.rpc("check_display_name", { candidate: newName });
  const MESSAGE: Record<string, string> = {
    short: "AT LEAST 2 CHARACTERS",
    banned: "THAT NAME ISN’T ALLOWED HERE",
    reserved: "THAT ONE’S RESERVED — PICK ANOTHER",
    taken: "TAKEN ALREADY — PICK ANOTHER",
  };
  if (verdict !== "available") return { error: MESSAGE[verdict as string] ?? "SOMETHING WENT WRONG" };

  const { error } = await supabase.from("profiles").update({ display_name: newName }).eq("id", userId);
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: "renamed" };
}

/**
 * "Warning only" (duration === "warning") records the warning and stops
 * there — no Supabase ban, no content removed, no email blocked. A real
 * ban does all three: temporary sign-in block (Supabase's own
 * banned_until, same mechanism account deletion already uses), their
 * reviews and lists removed, and their email permanently blocked from
 * signing up again — see the design note above account_bans.
 */
export async function adminBanAccount(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = String(formData.get("userId") ?? "");
  const duration = String(formData.get("duration") ?? "");
  if (!userId || (duration !== "warning" && !BAN_DURATIONS[duration])) {
    return { error: "SOMETHING WENT WRONG" };
  }

  const supabase = await createClient();
  const me = await getCurrentUser();
  if (!me) return { error: "NOT SIGNED IN" };
  if (!me.isAdmin) return { error: "ADMIN ONLY" };

  let bannedUntil: string | null = null;

  if (duration !== "warning") {
    const picked = BAN_DURATIONS[duration];
    const admin = createAdminClient();

    const { error: banError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: picked.supabaseDuration,
    });
    if (banError) return { error: banError.message.toUpperCase() };

    const { data: target } = await admin.auth.admin.getUserById(userId);
    const email = target.user?.email?.toLowerCase().trim();

    // Three independent writes — blocking the email, removing their
    // lists, and pulling their reviews. Nothing here reads what the
    // others wrote, so they go together.
    await Promise.all([
      email
        ? supabase.from("banned_emails").insert({ email, banned_by: me.id })
        : Promise.resolve(),
      supabase.from("lists").delete().eq("user_id", userId),
      supabase.from("reviews").update({ status: "deleted" }).eq("user_id", userId),
    ]);

    bannedUntil = new Date(Date.now() + picked.ms).toISOString();
  }

  const { error } = await supabase
    .from("account_bans")
    .upsert({ user_id: userId, banned_by: me.id, reason: duration, banned_until: bannedUntil });
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: duration === "warning" ? "warned" : "banned" };
}

/** Lifts the temporary sign-in block early. Doesn't undo the content removal or the email block — those are the permanent part of a real ban, same as the design says a warning does neither. */
export async function adminLiftBan(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "NO ACCOUNT SPECIFIED" };

  const me = await getCurrentUser();
  if (!me) return { error: "NOT SIGNED IN" };
  if (!me.isAdmin) return { error: "ADMIN ONLY" };

  const admin = createAdminClient();
  const { error: unbanError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
  if (unbanError) return { error: unbanError.message.toUpperCase() };

  const supabase = await createClient();
  const { error } = await supabase.from("account_bans").delete().eq("user_id", userId);
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: "unbanned" };
}

/** "Delete for good" on the Trash screen — purges immediately rather than waiting out the 14 days. */
export async function adminPurgeAccountNow(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "NO ACCOUNT SPECIFIED" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("purge_account_now", { p_user_id: userId });
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/trash");
  return { ok: "purged" };
}
