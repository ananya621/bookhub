import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/server";
import ReviewQueue, { type QueueRow } from "./ReviewQueue";

const TYPE_LABEL: Record<string, string> = {
  rude: "RUDE TO OTHER READERS",
  bad_language: "BAD LANGUAGE OR SLURS",
  off_topic: "NOTHING TO DO WITH THE BOOK",
  spam: "SPAM OR ADVERTISING",
};

/*
 * Rewritten from a pure-mock page reading `adminReviews` into a server
 * component reading real reviews and reports.
 *
 * A review is live the moment it's posted — there's no "pending,
 * awaiting a first look" review status — so this queue is really "reviews
 * with at least one report against them", not every review. safety_concern
 * reports are deliberately excluded: they go to /admin/safeguarding only,
 * kept out of the ordinary queues on purpose (same as that page's own
 * banner says), matching the two-queues decision already made for this
 * table.
 *
 * reports.target_id has no real foreign key (it's polymorphic — a review
 * or a reader), and reviews.user_id/reports.reporter_id both point at
 * auth.users, not profiles, so nothing here can be embedded by
 * PostgREST — every piece is fetched separately and merged in JS, same
 * pattern as the admin users list.
 */
export default async function AdminReviewsPage() {
  const supabase = await createClient();

  const { data: reportRows } = await supabase
    .from("reports")
    .select("id, target_id, reporter_id, type, note, status, created_at")
    .eq("target_type", "review")
    .neq("type", "safety_concern")
    .order("created_at", { ascending: false });

  const reviewIds = Array.from(new Set((reportRows ?? []).map((r) => r.target_id as string)));
  if (reviewIds.length === 0) {
    return (
      <>
        <AdminNav />
        <div className="wrap">
          <h1 style={{ fontSize: 38, margin: "0 0 18px" }}>Reviews</h1>
          <ReviewQueue rows={[]} />
        </div>
      </>
    );
  }

  const { data: reviewRows } = await supabase
    .from("reviews")
    .select("id, book_id, user_id, stars, text, status, created_at")
    .in("id", reviewIds);

  const bookIds = Array.from(new Set((reviewRows ?? []).map((r) => r.book_id as string)));
  const peopleIds = Array.from(
    new Set(
      [
        ...((reviewRows ?? []).map((r) => r.user_id as string)),
        ...((reportRows ?? []).map((r) => r.reporter_id as string)),
      ]
    )
  );

  const [{ data: books }, { data: profiles }] = await Promise.all([
    bookIds.length ? supabase.from("books").select("id, title").in("id", bookIds) : Promise.resolve({ data: [] }),
    peopleIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", peopleIds)
      : Promise.resolve({ data: [] }),
  ]);

  const bookTitleById = new Map((books ?? []).map((b) => [b.id as string, b.title as string]));
  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, (p.display_name as string) ?? "(no name set yet)"]));
  const reviewById = new Map((reviewRows ?? []).map((r) => [r.id as string, r]));

  type ReportRow = {
    id: string;
    target_id: string;
    reporter_id: string;
    type: string;
    note: string | null;
    status: string;
    created_at: string;
  };
  const reportsByReview = new Map<string, ReportRow[]>();
  for (const r of (reportRows ?? []) as ReportRow[]) {
    const list = reportsByReview.get(r.target_id) ?? [];
    list.push(r);
    reportsByReview.set(r.target_id, list);
  }

  const rows: QueueRow[] = reviewIds
    .map((id) => {
      const review = reviewById.get(id);
      if (!review) return null;
      const reports = reportsByReview.get(id) ?? [];
      const openCount = reports.filter((r) => r.status === "open").length;

      const typeCounts = new Map<string, number>();
      for (const r of reports) typeCounts.set(r.type as string, (typeCounts.get(r.type as string) ?? 0) + 1);
      let topType = "";
      let topCount = 0;
      for (const [t, c] of typeCounts) {
        if (c > topCount) {
          topType = t;
          topCount = c;
        }
      }
      const why = topType ? `${TYPE_LABEL[topType] ?? topType.toUpperCase()} ×${topCount}` : "";

      return {
        id,
        book: bookTitleById.get(review.book_id as string) ?? "(deleted book)",
        who: nameById.get(review.user_id as string) ?? "(no name set yet)",
        userId: review.user_id as string,
        stars: review.stars as number,
        text: review.text as string,
        when: new Date(review.created_at as string).toLocaleDateString(),
        status: review.status as "allowed" | "deleted",
        openCount,
        why,
        reporters: reports
          .slice()
          .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
          .map((r) => ({
            who: nameById.get(r.reporter_id as string) ?? "(no name set yet)",
            reason: TYPE_LABEL[r.type as string] ?? (r.type as string).toUpperCase(),
            when: new Date(r.created_at as string).toLocaleDateString(),
            note: (r.note as string | null) ?? "",
          })),
      };
    })
    .filter((r): r is QueueRow => r !== null);

  return (
    <>
      <AdminNav />
      <div className="wrap">
        <h1 style={{ fontSize: 38, margin: "0 0 18px" }}>Reviews</h1>
        <ReviewQueue rows={rows} />
      </div>
    </>
  );
}
