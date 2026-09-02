import { notFound } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { adminReviews } from "@/lib/mock";
import UserDetail from "./UserDetail";

/*
 * Ported from the `isUser` block in Prototype Admin.dc.html (the
 * current, updated file — lines 385-443), which is where account
 * moderation lives now instead of a standalone Accounts screen.
 *
 * Real: identity, admin/self badges, and the delete/restore actions
 * (see app/actions/accounts.ts, same backend as the retired
 * /admin/accounts screen).
 *
 * Still mock, on purpose: "Their reviews" (no reviews table exists),
 * and two buttons the design has here that this port doesn't build —
 * "Ban account" (a separate, temporary, arbitrary-duration restriction
 * with its own confirm dialog in the design — a distinct feature from
 * the 14-day recoverable deletion this session built, not a stand-in
 * for it) and "Force rename". Both stay local-only, same as before
 * this rewrite, just carried into the new real-data version of the
 * page.
 */
export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const me = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: profile }, { data: role }, { data: pending }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_color, created_at").eq("id", id).maybeSingle(),
    supabase.from("user_roles").select("is_admin").eq("user_id", id).maybeSingle(),
    supabase.from("pending_deletions").select("deleted_by, deleted_at, purge_at").eq("user_id", id).maybeSingle(),
  ]);

  if (!profile) notFound();

  const reviews = adminReviews.filter((r) => r.who === profile.display_name);

  return (
    <>
      <AdminNav />
      <div className="wrap">
        <UserDetail
          account={{
            id: profile.id as string,
            displayName: profile.display_name as string | null,
            avatarColor: profile.avatar_color as string,
            joined: profile.created_at as string,
            isAdmin: role?.is_admin ?? false,
            isSelf: profile.id === me?.id,
            pending: pending
              ? {
                  deletedBy: pending.deleted_by as "self" | "admin",
                  deletedAt: pending.deleted_at as string,
                  purgeAt: pending.purge_at as string,
                }
              : null,
          }}
          initialReviews={reviews}
        />
      </div>
    </>
  );
}
