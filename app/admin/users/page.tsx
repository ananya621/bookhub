import AdminNav from "@/components/AdminNav";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import UsersList, { type UserRow } from "./UsersList";

/*
 * Rewritten from a pure-mock page reading `adminAccounts` into a server
 * component reading real accounts — this is now where account
 * moderation actually happens (see /admin/users/[id]), replacing the
 * standalone /admin/accounts screen the current design dropped.
 *
 * profiles, user_roles and pending_deletions all reference auth.users
 * independently (no direct FK between any two), so PostgREST can't
 * embed them in one query — fetched separately and merged here, same
 * pattern as the account-deletion work this replaces.
 */
export default async function AdminUsersPage() {
  const me = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: profiles }, { data: roles }, { data: pending }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_color, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, is_admin"),
    supabase.from("pending_deletions").select("user_id, deleted_by, purge_at"),
  ]);

  const adminById = new Map((roles ?? []).map((r) => [r.user_id as string, r.is_admin as boolean]));
  const pendingById = new Map((pending ?? []).map((p) => [p.user_id as string, p]));

  const users: UserRow[] = (profiles ?? []).map((p) => {
    const pend = pendingById.get(p.id as string);
    return {
      id: p.id as string,
      displayName: p.display_name as string | null,
      avatarColor: p.avatar_color as string,
      joined: p.created_at as string,
      isAdmin: adminById.get(p.id as string) ?? false,
      isSelf: p.id === me?.id,
      pending: pend
        ? { deletedBy: pend.deleted_by as "self" | "admin", purgeAt: pend.purge_at as string }
        : null,
    };
  });

  return (
    <>
      <AdminNav />
      <div className="wrap">
        <h1 style={{ fontSize: 38, margin: "0 0 6px" }}>Users</h1>
        <p style={{ fontSize: 14, marginBottom: 20 }}>
          Every account, not just the reported ones. Open anyone to see their reviews and act on
          them.
        </p>
        <UsersList users={users} />
      </div>
    </>
  );
}
