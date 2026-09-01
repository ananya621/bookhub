import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import SearchResults, { type CatalogueBook } from "./SearchResults";

/*
 * Ported from the `isSearch` block in Prototype with Admin.dc.html
 * (lines 887-965), now reading the real catalogue.
 *
 * A server component so the books come from the database rather than
 * being fetched in the browser. The filters, paging and the search box
 * are real within-screen interactivity, so those live in SearchResults.
 *
 * The whole catalogue is read in one go. That is fine while it is
 * small — every book here was approved by hand — and it keeps filtering
 * instant. If it ever grows past a few hundred, this becomes a query
 * with the filters pushed into it.
 *
 * Two things from the export are missing, both because the tables do
 * not exist yet: star ratings and the "most reviewed" sort need
 * reviews, and the reading-status badge needs the tracker. Sorted
 * newest-first meanwhile, so a book someone just had approved is at the
 * top where they will see it.
 */
export default async function SearchPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("books")
    .select("id, title, author, pages, summary, cover_url, genres, reading_level, is_series")
    .order("created_at", { ascending: false });

  const books: CatalogueBook[] = (data ?? []).map((b) => ({
    id: b.id as string,
    title: b.title as string,
    author: (b.author as string) ?? "",
    pages: b.pages as number | null,
    summary: b.summary as string | null,
    coverUrl: b.cover_url as string | null,
    genres: (b.genres as string[]) ?? [],
    readingLevel: (b.reading_level as string) ?? "",
    isSeries: Boolean(b.is_series),
  }));

  return (
    <>
      <Nav />
      <div className="wrap">
        <SearchResults books={books} />
      </div>
    </>
  );
}
