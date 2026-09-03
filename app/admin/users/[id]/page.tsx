import { notFound } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import UserDetail, { type UserReview } from "./UserDetail";

const TYPE_LABEL: Record<string, string> = {
  rude: "RUDE TO OTHER READERS",
  bad_language: "BAD LANGUAGE OR SLURS",
  off_topic: "NOTHING TO DO WITH THE BOOK",
  spam: "SPAM OR ADVERTISING",
};

/*
 * Ported from the `isUser` block in Prototype Admin.dc.html (the
 * current, updated file — lines 385-443), which is where account
 * moderation lives now instead of a standalone Accounts screen.
 *
 * Real: identity, admin/self badges, the delete/restore actions (see
 * app/actions/accounts.ts), and now "Their reviews" too — reading real
 * reviews and reports the same way app/admin/reviews/page.tsx does
 * (see that file for why openCount, not review status, decides whether
 * Allow/Delete show).
 *
 * Still mock, on purpose: two buttons the design has here that this
 * port doesn't build — "Ban account" (a separate, temporary,
 * arbitrary-duration restriction with its own confirm dialog in the
 * design — a distinct feature from the 14-day recoverable deletion
 * this session built, not a stand-in for it) and "Force rename". Both
 * stay local-only, same as before this rewrite.
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

  const { data: reviewRows } = await supabase
    .from("reviews")
    .select("id, book_id, stars, text, status, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const bookIds = Array.from(new Set((reviewRows ?? []).map((r) => r.book_id as string)));
  const reviewIds = (reviewRows ?? []).map((r) => r.id as string);

  const [{ data: books }, { data: reportRows }] = await Promise.all([
    bookIds.length ? supabase.from("books").select("id, title").in("id", bookIds) : Promise.resolve({ data: [] }),
    reviewIds.length
      ? supabase
          .from("reports")
          .select("target_id, type")
          .eq("target_type", "review")
          .neq("type", "safety_concern")
          .eq("status", "open")
          .in("target_id", reviewIds)
      : Promise.resolve({ data: [] }),
  ]);

  const bookTitleById = new Map((books ?? []).map((b) => [b.id as string, b.title as string]));
  const openReportsByReview = new Map<string, string[]>();
  for (const r of reportRows ?? []) {
    const list = openReportsByReview.get(r.target_id as string) ?? [];
    list.push(r.type as string);
    openReportsByReview.set(r.target_id as string, list);
  }

  const reviews: UserReview[] = (reviewRows ?? []).map((r) => {
    const openTypes = openReportsByReview.get(r.id as string) ?? [];
    const counts = new Map<string, number>();
    for (const t of openTypes) counts.set(t, (counts.get(t) ?? 0) + 1);
    let topType = "";
    let topCount = 0;
    for (const [t, c] of counts) {
      if (c > topCount) {
        topType = t;
        topCount = c;
      }
    }
    return {
      id: r.id as string,
      book: bookTitleById.get(r.book_id as string) ?? "(deleted book)",
      stars: r.stars as number,
      text: r.text as string,
      when: new Date(r.created_at as string).toLocaleDateString(),
      status: r.status as "allowed" | "deleted",
      openCount: openTypes.length,
      why: topType ? `${TYPE_LABEL[topType] ?? topType.toUpperCase()} ×${topCount}` : "",
    };
  });

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
