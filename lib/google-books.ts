/*
 * Looking books up in Google Books.
 *
 * An API key IS required, despite a lot of older advice saying
 * otherwise. Calling the volumes endpoint without one now returns 429
 * with "quota_limit_value": "0" — the anonymous allowance is zero, not
 * small. Checked against the live API on 2026-09-01.
 *
 * The key goes in GOOGLE_BOOKS_API_KEY. Without it this returns a
 * `reason` the caller can show, rather than an empty list that looks
 * like "no books found" and sends someone hunting for a bug that isn't
 * there.
 *
 * Nothing here writes to our database. Searching Google only ever
 * suggests a book to ask for — a book reaches the catalogue when an
 * admin approves it, so nothing unchecked can appear in front of a
 * child.
 */

export type GoogleBook = {
  externalId: string;
  title: string;
  author: string;
  pages: number | null;
  summary: string | null;
  coverUrl: string | null;
  /** Google's own subject words. Only a hint for the admin. */
  categories: string[];
};

type Volume = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    pageCount?: number;
    description?: string;
    categories?: string[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

export type SearchOutcome =
  | { books: GoogleBook[] }
  | { books: []; reason: "no-key" | "quota" | "unavailable" };

export async function searchGoogleBooks(query: string): Promise<SearchOutcome> {
  const q = query.trim();
  if (q.length < 2) return { books: [] };

  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) return { books: [], reason: "no-key" };

  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("printType", "books");
  // Books written for children are the point of this site, so ask for
  // the safer slice of Google's index rather than filtering afterwards.
  url.searchParams.set("safe", "true");
  url.searchParams.set("key", key);

  let response: Response;
  try {
    response = await fetch(url, {
      // Google's results barely change, and a person retyping a search
      // shouldn't cost a fresh call.
      next: { revalidate: 60 * 60 },
    });
  } catch {
    // Their service being down should not take our page down with it.
    return { books: [], reason: "unavailable" };
  }

  if (response.status === 429) return { books: [], reason: "quota" };
  if (!response.ok) return { books: [], reason: "unavailable" };

  const data = (await response.json()) as { items?: Volume[] };

  const books = (data.items ?? [])
    .filter((v): v is Volume & { id: string } => Boolean(v.id && v.volumeInfo?.title))
    .map((v) => {
      const info = v.volumeInfo!;
      return {
        externalId: v.id,
        title: info.title!,
        author: (info.authors ?? []).join(", "),
        pages: info.pageCount ?? null,
        summary: info.description ?? null,
        // Google serves these over http by default, which a https page
        // will refuse to load.
        coverUrl:
          (info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail)?.replace(
            /^http:/,
            "https:"
          ) ?? null,
        categories: info.categories ?? [],
      };
    });

  return { books };
}
