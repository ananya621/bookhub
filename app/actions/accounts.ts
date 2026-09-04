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

  // Collected rather than returned on the first problem: by the time
  // any of these can fail, the sign-in block below has already taken
  // effect on Supabase's side. Bailing out early would leave that
  // un-recorded in account_bans and the admin none the wiser that
  // anything happened at all. Better to still do everything that can be
  // done and tell the admin plainly what didn't — see the doc comment
  // on this function for why a partial ban must never be reported as a
  // full one.
  const failures: string[] = [];

  if (duration !== "warning") {
    const picked = BAN_DURATIONS[duration];
    const admin = createAdminClient();

    const { error: banError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: picked.supabaseDuration,
    });
    if (banError) return { error: banError.message.toUpperCase() };

    const { data: target, error: lookupError } = await admin.auth.admin.getUserById(userId);
    const email = target?.user?.email?.toLowerCase().trim();

    if (lookupError) {
      // Dropping this used to mean `email` silently became undefined
      // and the banned_emails insert below just quietly didn't happen —
      // no error anywhere, and the admin was told the ban worked.
      console.error(
        "[accounts] getUserById failed while banning, email block skipped:",
        lookupError.message
      );
      failures.push("their email couldn't be looked up, so it wasn't blocked from signing up again");
    }

    // Three independent writes — blocking the email, removing their
    // lists, and pulling their reviews. Nothing here reads what the
    // others wrote, so they go together. Each result is checked below;
    // Promise.all used to just discard whatever came back, which is how
    // a ban could report success while a write silently failed.
    const [emailResult, listsResult, reviewsResult] = await Promise.all([
      email
        ? supabase
            .from("banned_emails")
            // upsert + ignoreDuplicates, not insert: if an admin retries
            // after seeing a partial failure below, this write may have
            // already gone through, and a duplicate-key error on retry
            // would then be reported as a fresh failure when it isn't one.
            .upsert({ email, banned_by: me.id }, { onConflict: "email", ignoreDuplicates: true })
        : Promise.resolve({ error: null as { message: string } | null }),
      supabase.from("lists").delete().eq("user_id", userId),
      supabase.from("reviews").update({ status: "deleted" }).eq("user_id", userId),
    ]);

    if (email && emailResult.error) {
      console.error("[accounts] banned_emails write failed:", emailResult.error.message);
      failures.push("their email wasn't blocked from signing up again");
    }
    if (listsResult.error) {
      console.error("[accounts] lists delete failed while banning:", listsResult.error.message);
      failures.push("their lists weren't removed");
    }
    if (reviewsResult.error) {
      console.error("[accounts] reviews update failed while banning:", reviewsResult.error.message);
      failures.push("their reviews weren't removed");
    }

    bannedUntil = new Date(Date.now() + picked.ms).toISOString();
  }

  const { error } = await supabase
    .from("account_bans")
    .upsert({ user_id: userId, banned_by: me.id, reason: duration, banned_until: bannedUntil });
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);

  // The sign-in block and the account_bans record (the two things that
  // can't partially fail — each is a single write, checked above) both
  // succeeded here, or this is a warning, which never touches either of
  // the other two. Only surface the parts that actually failed, by
  // name, rather than telling the admin it all worked. There's no
  // separate "partial success" variant of ActionResult to return here —
  // an error string that says which part didn't apply is what the UI
  // (UserDetail.tsx) already knows how to show in red, and it keeps the
  // ban dialog open so the admin notices instead of it quietly closing.
  if (failures.length > 0) {
    return {
      error: `THE SIGN-IN BLOCK WORKED, BUT ${failures.join("; ")}. CHECK THE LOGS, THEN TRY AGAIN.`.toUpperCase(),
    };
  }

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
