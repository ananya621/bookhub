import { allGenres } from "@/lib/mock";

/*
 * Best-effort guess at which of our genres a Google Books category
 * belongs to, so Step 2 of importing a book opens with genres already
 * ticked. Not meant to be exact — the design's own words are "mapped
 * from the API, correct what is wrong": an admin always reviews and can
 * untick or add before saving. Nothing here writes to the catalogue on
 * its own.
 *
 * Keyword matching, not a lookup table, because Google's categories are
 * free text ("Juvenile Fiction / Fantasy & Magic", "Fiction / Horror",
 * "Juvenile Nonfiction / General" ...) rather than a fixed list.
 */
const KEYWORD_TO_GENRE: [RegExp, (typeof allGenres)[number]][] = [
  [/fantasy|magic|dragon/, "Fantasy"],
  [/adventure|action/, "Adventure"],
  [/science fiction|sci-fi/, "Sci-Fi"],
  [/romance/, "Romance"],
  [/mystery|detective|thriller|suspense/, "Mystery/Thriller"],
  [/horror/, "Horror"],
  [/historical/, "Historical Fiction"],
  [/humorous|humor|humour|comic/, "Comedy/Humour"],
  [/nonfiction|non-fiction|biography/, "Non-fiction"],
];

export function guessGenres(categories: string[]): string[] {
  const found = new Set<string>();
  for (const category of categories) {
    const lower = category.toLowerCase();
    for (const [pattern, genre] of KEYWORD_TO_GENRE) {
      if (pattern.test(lower)) found.add(genre);
    }
  }
  return [...found];
}
