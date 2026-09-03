import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import HomeContent from "./HomeContent";
import type { CatalogueBook } from "@/lib/catalogue";
import type { ShelfBook } from "@/app/tracker/TrackerShelves";

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
 */
export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: books }, { data: statusRows }, { count: listsCount }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, author, pages, cover_url, genres, reading_level")
      .order("created_at", { ascending: false }),
    supabase.from("reading_status").select("status, progress, books(id, title, author, cover_url)"),
    supabase.from("lists").select("*", { count: "exact", head: true }),
  ]);

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
    }));

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
        />
      </div>
    </>
  );
}
