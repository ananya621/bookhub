import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import RecsList from "./RecsList";
import type { CatalogueBook } from "@/lib/catalogue";
import type { Survey } from "@/lib/mock";

/*
 * Ported from the `isRecs` block in Prototype with Admin.dc.html
 * (lines 859-886), now reading the real catalogue — same fix as
 * /search already had and /home just got: this used to always fall
 * back to lib/mock.ts's fixture books, so it kept showing "recommended"
 * books that don't exist in the real (and currently empty) catalogue,
 * with a "matched on: your survey answers" label that didn't
 * correspond to anything real either.
 *
 * The survey is real now too, fetched here instead of RecsList reading
 * useSessionData().survey (the dev-persona fixture) — same fix just
 * applied to /home, and for the same reason: a real signed-in reader's
 * recommendations were being scored against the fixture's fake
 * answers, not their own.
 *
 * Same star-rating fix as /home: B6's "Picked for you" cards (this
 * page's own "see all" destination) show a rating on every one, so this
 * computes real averages from the reviews table too, instead of the
 * permanent "NO REVIEWS YET" every card used to show. See /home for
 * the fuller explanation — there's no separate board for this page's
 * own full-grid layout, but the card itself should match.
 */
export default async function RecsPage() {
  const supabase = await createClient();

  const [{ data }, { data: surveyRow }, { data: reviewRows }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, author, pages, cover_url, genres, reading_level")
      .order("created_at", { ascending: false }),
    supabase.from("surveys").select("genres, reading_level, preferred_length").maybeSingle(),
    // book_review_stats, not the raw reviews: the database has already
    // done the averaging, so this reads one row per book instead of
    // every review ever written. See the view's own migration.
    supabase.from("book_review_stats").select("book_id, avg_stars"),
  ]);

  const books: CatalogueBook[] = (data ?? []).map((b) => ({
    id: b.id as string,
    title: b.title as string,
    author: (b.author as string) ?? "",
    pages: b.pages as number | null,
    coverUrl: b.cover_url as string | null,
    genres: (b.genres as string[]) ?? [],
    readingLevel: (b.reading_level as string) ?? "",
  }));

  const survey: Survey | null = surveyRow
    ? {
        genres: surveyRow.genres as string[],
        level: surveyRow.reading_level as string,
        length: surveyRow.preferred_length as string,
      }
    : null;

  const ratingByBookId = new Map(
    (reviewRows ?? []).map((r) => [r.book_id as string, Number(r.avg_stars)])
  );
  for (const b of books) b.avgStars = ratingByBookId.get(b.id) ?? null;

  return (
    <>
      <Nav />
      <div className="wrap">
        <RecsList books={books} survey={survey} />
      </div>
    </>
  );
}
