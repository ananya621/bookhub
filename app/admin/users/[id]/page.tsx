import { notFound } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import UserDetail, { type UserReview, type UserReport } from "./UserDetail";

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
 * Real: identity, admin/self badges, the delete/restore actions, Force
 * rename and Ban account too now (see app/actions/accounts.ts), and
 * "Their reviews" — reading real reviews and reports the same way
 * app/admin/reviews/page.tsx does (see that file for why openCount,
 * not review status, decides whether Allow/Delete show).
 *
 * "Reports about them" (target_type='user' reports — filed via "Report
 * this reader" on the book page) is new: previously those saved for
 * real but had nowhere to be seen or acted on. Deliberately NOT
 * resolved by Force rename or Ban/Warning — a rename only fixes a name
 * problem and a ban doesn't necessarily mean every report was correct,
 * so each report is only cleared by an explicit Mark as
 * actioned/Reopen here, same shape as Safeguarding. safety_concern
 * reports are excluded, same as everywhere else — those go to
 * Safeguarding only.
 */
export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const me = await getCurrentUser();

  // Checked here, not left to proxy.ts. Everything else on this page goes
  // through the RLS-scoped client, where an admin-only policy is the real
  // gate and a routing mistake costs nothing. The email below does not —
  // it is read with the service-role client, which bypasses RLS entirely,
  // so the redirect would be the ONLY thing standing in front of it. As
  // proxy.ts says of its own redirects: convenience, not security.
  if (!me?.isAdmin) notFound();

  const supabase = await createClient();

  // auth.users.email isn't reachable through the normal RLS-scoped
  // client — nothing in this app grants a select on that table, on
  // purpose. The service-role client is the same one accounts.ts already
  // uses for banning.
  const admin = createAdminClient();

  const [{ data: profile }, { data: role }, { data: pending }, { data: ban }, { data: authUser, error: authUserError }] =
    await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_color, created_at").eq("id", id).maybeSingle(),
      supabase.from("user_roles").select("is_admin").eq("user_id", id).maybeSingle(),
      supabase.from("pending_deletions").select("deleted_by, deleted_at, purge_at").eq("user_id", id).maybeSingle(),
      supabase.from("account_bans").select("reason, banned_at, banned_until").eq("user_id", id).maybeSingle(),
      admin.auth.admin.getUserById(id),
    ]);

  if (!profile) notFound();

  // Every account here has an email — it is how they signed up — so a
  // missing one means the lookup failed, not that there isn't one.
  // Worth saying out loud: this silently rendered nothing at all when it
  // failed, which reads to an admin as "this reader has no email"
  // rather than "we couldn't fetch it", and left no trace anywhere.
  if (authUserError) {
    console.error(
      "[admin/users/[id]] getUserById failed, showing the page without the " +
        "email rather than pretending the account hasn't got one:",
      authUserError.message
    );
  }

  // Their reviews depend on nothing the reports need, so the two chains
  // run alongside each other rather than one after the other.
  const reviewsQuery = supabase
    .from("reviews")
    .select("id, book_id, stars, text, status, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const { data: userReportRows } = await supabase
    .from("reports")
    .select("id, reporter_id, type, note, status, created_at")
    .eq("target_type", "user")
    .eq("target_id", id)
    .neq("type", "safety_concern")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  const reporterIds = Array.from(new Set((userReportRows ?? []).map((r) => r.reporter_id as string)));
  const { data: reporterProfiles } = reporterIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", reporterIds)
    : { data: [] as { id: string; display_name: string | null }[] };
  const reporterNameById = new Map(
    (reporterProfiles ?? []).map((p) => [p.id as string, (p.display_name as string | null) ?? "(no name set yet)"])
  );

  const userReports: UserReport[] = (userReportRows ?? []).map((r) => ({
    id: r.id as string,
    who: reporterNameById.get(r.reporter_id as string) ?? "(no name set yet)",
    reason: TYPE_LABEL[r.type as string] ?? (r.type as string).toUpperCase(),
    when: formatDate(r.created_at as string),
    note: (r.note as string | null) ?? "",
    status: r.status as "open" | "actioned",
  }));
  const openUserReportCount = userReports.filter((r) => r.status === "open").length;

  const { data: reviewRows } = await reviewsQuery;

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
      when: formatDate(r.created_at as string),
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
            email: authUser?.user?.email ?? null,
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
            ban: ban
              ? {
                  reason: ban.reason as string,
                  bannedAt: ban.banned_at as string,
                  bannedUntil: ban.banned_until as string | null,
                }
              : null,
            openReportCount: openUserReportCount,
          }}
          initialReviews={reviews}
          reports={userReports}
        />
      </div>
    </>
  );
}
