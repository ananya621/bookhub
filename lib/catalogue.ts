import { lengthLabel, type Survey } from "@/lib/mock";

/*
 * The real catalogue's book shape, and matching it against a survey —
 * used everywhere a page reads actual `books` rows rather than the
 * lib/mock.ts fixture: /search (already did), and /home + /recs (fixed
 * here — they were scoring and displaying the fixture books instead,
 * which meant they kept showing "recommendations" that don't exist in
 * the real catalogue even after it's genuinely empty).
 *
 * Not merged into lib/mock.ts's rankBooks(): the shapes differ enough
 * (readingLevel vs level) that forcing them through one function would
 * need awkward renaming at every call site for no real benefit. Reviews
 * exist for real books too (supabase/migrations/20260902180000_
 * reviews.sql) — an earlier version of this comment said they didn't,
 * which was already false when it was written. See avgStars/
 * reviewCount below and the comment on rankCatalogueBooks() for where
 * that stands today.
 */
export type CatalogueBook = {
  id: string;
  title: string;
  author: string;
  pages: number | null;
  summary?: string | null;
  coverUrl: string | null;
  genres: string[];
  readingLevel: string;
  isSeries?: boolean;
  /**
   * Average of the book's 'allowed' reviews' star ratings, from the
   * book_review_stats view (see supabase/migrations/
   * 20260903150000_book_review_stats.sql) — null when there are no
   * reviews yet, not zero, so "no reviews" and "reviewed badly" don't
   * look the same. Optional because not every page that builds a
   * CatalogueBook fetches it yet.
   */
  avgStars?: number | null;
  reviewCount?: number;
  /**
   * The signed-in reader's own reading status for this book, if any —
   * shown as a badge on search results so a reader browsing can see at
   * a glance what they've already read, are reading, or saved.
   * Undefined/null for a guest, who has none.
   */
  myStatus?: "read" | "reading" | "want" | null;
};

/**
 * Genre overlap + level match + length match, same scoring rankBooks()
 * uses, with the same rating tie-break the design's own recBooks does
 * (Prototype with Admin.dc.html ~line 1867:
 * `.sort((a, c) => c.hits - a.hits || this.avg(c.x) - this.avg(a.x))`)
 * — this port had dropped that second half, so two books tied on hits
 * fell back to insertion order instead of the better-rated one first.
 *
 * With no survey — or nothing scoring above zero — this also now
 * matches the design's fallback exactly: highest-rated first, not the
 * catalogue's own newest-first order. A book with no reviews yet sorts
 * as if rated below every reviewed book, not above (null is not the
 * same as "best"), but still appears — this is a fallback, not a
 * filter.
 */
export function rankCatalogueBooks(books: CatalogueBook[], survey: Survey | null): CatalogueBook[] {
  const byRating = (a: CatalogueBook, c: CatalogueBook) => (c.avgStars ?? -1) - (a.avgStars ?? -1);
  if (!survey) return books.slice().sort(byRating);
  const scored = books
    .map((book) => ({
      book,
      hits:
        book.genres.filter((g) => survey.genres.includes(g)).length +
        (book.readingLevel === survey.level ? 1 : 0) +
        (book.pages !== null && lengthLabel(book.pages) === survey.length ? 1 : 0),
    }))
    .filter((o) => o.hits > 0)
    .sort((a, c) => c.hits - a.hits || byRating(a.book, c.book));
  return scored.length ? scored.map((o) => o.book) : books.slice().sort(byRating);
}
