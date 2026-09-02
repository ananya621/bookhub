"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

/** An admin deleting someone else's account, from /admin/accounts. */
export async function adminDeleteAccount(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "NO ACCOUNT SPECIFIED" };

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

  revalidatePath("/admin/accounts");
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

  const supabase = await createClient();
  const admin = createAdminClient();

  const { error: unbanError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (unbanError) return { error: unbanError.message.toUpperCase() };

  const { error } = await supabase.rpc("restore_account", { p_user_id: userId });
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/admin/accounts");
  revalidatePath("/admin/trash");
  return { ok: "restored" };
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

  revalidatePath("/admin/accounts");
  revalidatePath("/admin/trash");
  return { ok: "purged" };
}
