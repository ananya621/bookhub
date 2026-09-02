import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import HomeContent from "./HomeContent";
import type { CatalogueBook } from "@/lib/catalogue";

/*
 * Split out of what used to be a single client component so "Picked
 * for you" can read the real catalogue (see HomeContent.tsx for why —
 * this was showing lib/mock.ts fixture books as "recommendations" even
 * once the real catalogue was genuinely empty, same bug /recs had).
 * Everything else — reading status, shelf counts, survey — still comes
 * from the client-side session fixture, unchanged; that part stays in
 * HomeContent.
 */
export default async function HomePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("books")
    .select("id, title, author, pages, cover_url, genres, reading_level")
    .order("created_at", { ascending: false });

  const catalogueBooks: CatalogueBook[] = (data ?? []).map((b) => ({
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
        <HomeContent catalogueBooks={catalogueBooks} />
      </div>
    </>
  );
}
