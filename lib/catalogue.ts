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
 * uses. With no survey — or nothing scoring above zero — this keeps
 * the catalogue's own order (newest-first, same as /search).
 *
 * A rating fallback (like rankBooks()'s highest-rated-first) would fit
 * naturally now: every caller populates avgStars from the
 * book_review_stats view, so it would work rather than silently doing
 * nothing. Deliberately not added here — it changes which books get
 * recommended, which deserves its own thinking about whether "popular"
 * should outrank "matches what you said you like", rather than being
 * slipped in as a tie-breaker.
 */
export function rankCatalogueBooks(books: CatalogueBook[], survey: Survey | null): CatalogueBook[] {
  if (!survey) return books;
  const scored = books
    .map((book) => ({
      book,
      hits:
        book.genres.filter((g) => survey.genres.includes(g)).length +
        (book.readingLevel === survey.level ? 1 : 0) +
        (book.pages !== null && lengthLabel(book.pages) === survey.length ? 1 : 0),
    }))
    .filter((o) => o.hits > 0)
    .sort((a, c) => c.hits - a.hits);
  return scored.length ? scored.map((o) => o.book) : books;
}
