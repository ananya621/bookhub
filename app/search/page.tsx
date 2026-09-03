import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import SearchResults, { type CatalogueBook } from "./SearchResults";

/*
 * Ported from the `isSearch` block in Prototype with Admin.dc.html
 * (lines 887-965), now reading the real catalogue.
 *
 * A server component so the books come from the database rather than
 * being fetched in the browser. The filters, paging, sort and the
 * search box are real within-screen interactivity, so those live in
 * SearchResults.
 *
 * The whole catalogue is read in one go. That is fine while it is
 * small — every book here was approved by hand — and it keeps filtering
 * instant. If it ever grows past a few hundred, this becomes a query
 * with the filters pushed into it.
 *
 * Star ratings and the "most reviewed" sort read book_review_stats
 * (supabase/migrations/20260903150000_book_review_stats.sql), a view
 * that averages and counts each book's reviews in the database —
 * one query for every book's rating, not one query per book or a
 * client-side average over every review row. The reviews table has
 * existed since migration 20260902180000_reviews.sql; an earlier
 * version of this comment said it didn't, which was stale even when
 * it was written and has been wrong for a while.
 *
 * The reading-status badge (a signed-in reader's own Read/Reading/
 * Want to Read on each result) is real too, read from reading_status
 * for the current user — empty for a guest, who has none.
 */
export default async function SearchPage() {
  const supabase = await createClient();

  const [{ data }, { data: statsRows }, { data: userData }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, author, pages, summary, cover_url, genres, reading_level, is_series")
      .order("created_at", { ascending: false }),
    supabase.from("book_review_stats").select("book_id, review_count, avg_stars"),
    supabase.auth.getUser(),
  ]);

  const statsByBook = new Map(
    (statsRows ?? []).map((s) => [s.book_id as string, { count: s.review_count as number, avg: s.avg_stars as number }])
  );

  // Only fetched when signed in — RLS scopes reading_status to the
  // caller's own rows anyway, but there's no point querying for a
  // guest, who can't have any.
  const me = userData.user;
  let statusByBook = new Map<string, "read" | "reading" | "want">();
  if (me) {
    const { data: statusRows } = await supabase
      .from("reading_status")
      .select("book_id, status")
      .eq("user_id", me.id);
    statusByBook = new Map((statusRows ?? []).map((s) => [s.book_id as string, s.status as "read" | "reading" | "want"]));
  }

  const books: CatalogueBook[] = (data ?? []).map((b) => {
    const stats = statsByBook.get(b.id as string);
    return {
      id: b.id as string,
      title: b.title as string,
      author: (b.author as string) ?? "",
      pages: b.pages as number | null,
      summary: b.summary as string | null,
      coverUrl: b.cover_url as string | null,
      genres: (b.genres as string[]) ?? [],
      readingLevel: (b.reading_level as string) ?? "",
      isSeries: Boolean(b.is_series),
      avgStars: stats?.avg ?? null,
      reviewCount: stats?.count ?? 0,
      myStatus: statusByBook.get(b.id as string) ?? null,
    };
  });

  return (
    <>
      <Nav />
      <div className="wrap">
        <SearchResults books={books} />
      </div>
    </>
  );
}
