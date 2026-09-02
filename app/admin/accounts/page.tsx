import AdminNav from "@/components/AdminNav";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AccountsList, { type AccountRow } from "./AccountsList";

/*
 * Rewritten from a pure-mock page (`useState(() => adminAccounts...)`,
 * "no moderation API yet") into a server component reading real
 * accounts, now that Delete/Undo have somewhere real to act on — see
 * app/actions/accounts.ts and the migration it's built on.
 *
 * profiles, user_roles and pending_deletions all reference auth.users
 * independently rather than each other, so PostgREST can't embed them
 * in one query (there's no direct FK between any two of the three).
 * Fetched separately and merged here instead.
 *
 * The report/flag/"why" columns the mock had (Reported, Name refused,
 * etc.) are dropped — there's no reports table yet, so there was
 * nothing real to show there. This page now shows what's actually real:
 * who exists, who's admin, and who's pending deletion.
 */
export default async function AdminAccountsPage() {
  const me = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: profiles }, { data: roles }, { data: pending }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_color, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, is_admin"),
    supabase.from("pending_deletions").select("user_id, deleted_by, deleted_at, purge_at"),
  ]);

  const adminById = new Map((roles ?? []).map((r) => [r.user_id as string, r.is_admin as boolean]));
  const pendingById = new Map((pending ?? []).map((p) => [p.user_id as string, p]));

  const accounts: AccountRow[] = (profiles ?? []).map((p) => {
    const pend = pendingById.get(p.id as string);
    return {
      id: p.id as string,
      displayName: p.display_name as string | null,
      avatarColor: p.avatar_color as string,
      joined: p.created_at as string,
      isAdmin: adminById.get(p.id as string) ?? false,
      isSelf: p.id === me?.id,
      pending: pend
        ? {
            deletedBy: pend.deleted_by as "self" | "admin",
            deletedAt: pend.deleted_at as string,
            purgeAt: pend.purge_at as string,
          }
        : null,
    };
  });

  return (
    <>
      <AdminNav />
      <div className="wrap">
        <h1 style={{ fontSize: 36, margin: "0 0 6px" }}>Accounts</h1>
        <p style={{ fontSize: 14, marginBottom: 20 }}>
          Everyone with an account. Deleting one bans it for 14 days — recoverable from Trash until
          then, gone for good after.
        </p>
        <AccountsList accounts={accounts} />
      </div>
    </>
  );
}
