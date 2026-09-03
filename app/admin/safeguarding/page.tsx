import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/server";
import SafeguardingQueue, { type CaseRow } from "./SafeguardingQueue";

/*
 * Rewritten from a pure-mock page reading `safeguarding` into a server
 * component reading real reports. Kept out of the ordinary moderation
 * queues on purpose (same reasoning as before this rewrite) by only
 * ever querying type = 'safety_concern' — see app/admin/reviews/page.tsx,
 * which explicitly excludes that type the other way.
 *
 * reports.target_id is polymorphic (a review or a reader, no real
 * foreign key), and none of reviews/reports/profiles/books share a
 * direct FK PostgREST could embed across, so everything here is
 * fetched separately and merged in JS.
 */
export default async function AdminSafeguardingPage() {
  const supabase = await createClient();

  const { data: reportRows } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reporter_id, note, status, created_at")
    .eq("type", "safety_concern")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  const reviewTargetIds = Array.from(
    new Set((reportRows ?? []).filter((r) => r.target_type === "review").map((r) => r.target_id as string))
  );
  const { data: reviewRows } = reviewTargetIds.length
    ? await supabase.from("reviews").select("id, book_id").in("id", reviewTargetIds)
    : { data: [] as { id: string; book_id: string }[] };

  const bookIds = Array.from(new Set((reviewRows ?? []).map((r) => r.book_id as string)));
  const { data: books } = bookIds.length
    ? await supabase.from("books").select("id, title").in("id", bookIds)
    : { data: [] as { id: string; title: string }[] };
  const bookTitleByReviewId = new Map(
    (reviewRows ?? []).map((r) => [r.id as string, (books ?? []).find((b) => b.id === r.book_id)?.title as string | undefined])
  );

  const userTargetIds = Array.from(
    new Set((reportRows ?? []).filter((r) => r.target_type === "user").map((r) => r.target_id as string))
  );
  const peopleIds = Array.from(
    new Set([...userTargetIds, ...(reportRows ?? []).map((r) => r.reporter_id as string)])
  );
  const { data: profiles } = peopleIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", peopleIds)
    : { data: [] as { id: string; display_name: string | null }[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, (p.display_name as string | null) ?? "(no name set yet)"]));

  const cases: CaseRow[] = (reportRows ?? []).map((r) => ({
    id: r.id as string,
    who: nameById.get(r.reporter_id as string) ?? "(no name set yet)",
    target:
      r.target_type === "user"
        ? `the reader ${nameById.get(r.target_id as string) ?? "(no name set yet)"}`
        : `a review on “${bookTitleByReviewId.get(r.target_id as string) ?? "(deleted book)"}”`,
    when: new Date(r.created_at as string).toLocaleDateString(),
    text: (r.note as string | null) ?? "(no further detail given)",
    status: r.status as "open" | "actioned",
  }));

  return (
    <>
      <AdminNav />
      <div className="wrap">
        <SafeguardingQueue cases={cases} />
      </div>
    </>
  );
}
