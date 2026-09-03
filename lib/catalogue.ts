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
 * (readingLevel vs level, no reviews to rate a fallback sort by) that
 * forcing them through one function would need awkward renaming at
 * every call site for no real benefit.
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
};

/**
 * Genre overlap + level match + length match, same scoring rankBooks()
 * uses. No rating to fall back to (real books have no reviews table
 * yet), so with no survey — or nothing scoring above zero — this just
 * keeps the catalogue's own order (newest-first, same as /search).
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
