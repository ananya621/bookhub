import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import HomeContent from "./HomeContent";
import type { CatalogueBook } from "@/lib/catalogue";
import type { ShelfBook } from "@/app/tracker/TrackerShelves";
import type { Survey } from "@/lib/mock";

/*
 * Split out of what used to be a single client component so "Picked
 * for you" can read the real catalogue (see HomeContent.tsx for why —
 * this was showing lib/mock.ts fixture books as "recommendations" even
 * once the real catalogue was genuinely empty, same bug /recs had).
 *
 * "Currently reading" and the shelf counts now read the real
 * reading_status table too (see /tracker, built alongside this) —
 * fetched here the same way /tracker does, for the same reason: a
 * server component so it comes from the database, not the persona
 * fixture. "MY LISTS" now reads the real lists table too.
 *
 * The survey used to score "Picked for you" is real now too — it was
 * still reading useSessionData().survey (the dev-persona fixture), so
 * every real signed-in reader was getting recommendations scored
 * against the fixture's fake answers instead of their own, same bug
 * class as the rest of this list. Matches /profile's own real
 * surveys query.
 *
 * "Picked for you" cards used to always say "NO REVIEWS YET" — that was
 * true of every book because nothing fetched the real reviews table to
 * say otherwise (see supabase/migrations/20260902180000_reviews.sql,
 * used properly for the first time on /book/[id]). The ratings come
 * from the book_review_stats view, which averages in Postgres, so this
 * reads one row per book rather than every review ever written. The
 * search page reads the same view — one definition of "a book's
 * rating", not three.
 */
export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: books }, { data: statusRows }, { count: listsCount }, { data: surveyRow }, { data: reviewRows }] =
    await Promise.all([
      supabase
        .from("books")
        .select("id, title, author, pages, cover_url, genres, reading_level")
        .order("created_at", { ascending: false }),
      supabase.from("reading_status").select("status, progress, books(id, title, author, cover_url)"),
      supabase.from("lists").select("*", { count: "exact", head: true }),
      supabase.from("surveys").select("genres, reading_level, preferred_length").maybeSingle(),
      // book_review_stats, not the raw reviews: the database has already
      // done the averaging, so this reads one row per book instead of
      // every review ever written. See the view's own migration.
      supabase.from("book_review_stats").select("book_id, avg_stars"),
    ]);

  const survey: Survey | null = surveyRow
    ? {
        genres: surveyRow.genres as string[],
        level: surveyRow.reading_level as string,
        length: surveyRow.preferred_length as string,
      }
    : null;

  const catalogueBooks: CatalogueBook[] = (books ?? []).map((b) => ({
    id: b.id as string,
    title: b.title as string,
    author: (b.author as string) ?? "",
    pages: b.pages as number | null,
    coverUrl: b.cover_url as string | null,
    genres: (b.genres as string[]) ?? [],
    readingLevel: (b.reading_level as string) ?? "",
  }));

  const rows = (statusRows ?? []) as unknown as {
    status: "want" | "reading" | "read";
    progress: string | null;
    books: { id: string; title: string; author: string; cover_url: string | null } | null;
  }[];

  const readCount = rows.filter((r) => r.status === "read").length;
  const wantCount = rows.filter((r) => r.status === "want").length;
  const reading: ShelfBook[] = rows
    .filter((r) => r.status === "reading" && r.books)
    .map((r) => ({
      id: r.books!.id,
      title: r.books!.title,
      author: r.books!.author,
      coverUrl: r.books!.cover_url,
      progress: r.progress,
      // Home's "Currently reading" rows never show a rating (only the
      // tracker's Read shelf does, per ShelfBook's own comment) — always
      // null here rather than fetching a review that nothing displays.
      myStars: null,
    }));

  const ratingByBookId = new Map(
    (reviewRows ?? []).map((r) => [r.book_id as string, Number(r.avg_stars)])
  );
  for (const b of catalogueBooks) b.avgStars = ratingByBookId.get(b.id) ?? null;

  return (
    <>
      <Nav />
      <div className="wrap">
        <HomeContent
          catalogueBooks={catalogueBooks}
          readCount={readCount}
          wantCount={wantCount}
          reading={reading}
          listsCount={listsCount ?? 0}
          survey={survey}
        />
      </div>
    </>
  );
}
