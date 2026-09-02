import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import RecsList from "./RecsList";
import type { CatalogueBook } from "@/lib/catalogue";

/*
 * Ported from the `isRecs` block in Prototype with Admin.dc.html
 * (lines 859-886), now reading the real catalogue — same fix as
 * /search already had and /home just got: this used to always fall
 * back to lib/mock.ts's fixture books, so it kept showing "recommended"
 * books that don't exist in the real (and currently empty) catalogue,
 * with a "matched on: your survey answers" label that didn't
 * correspond to anything real either.
 *
 * A server component again (it briefly wasn't, to read survey data
 * from useSessionData()) — that part of the ranking now happens in
 * RecsList, the client child, using lib/catalogue.ts's
 * rankCatalogueBooks() shared with /home.
 */
export default async function RecsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("books")
    .select("id, title, author, pages, cover_url, genres, reading_level")
    .order("created_at", { ascending: false });

  const books: CatalogueBook[] = (data ?? []).map((b) => ({
    id: b.id as string,
    title: b.title as string,
    author: (b.author as string) ?? "",
    pages: b.pages as number | null,
    coverUrl: b.cover_url as string | null,
    genres: (b.genres as string[]) ?? [],
    readingLevel: (b.reading_level as string) ?? "",
  }));

  return (
    <>
      <Nav />
      <div className="wrap">
        <RecsList books={books} />
      </div>
    </>
  );
}
