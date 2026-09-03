import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import TrackerShelves, { type ShelfBook } from "./TrackerShelves";

/*
 * Ported from the `isTracker` block in Prototype with Admin.dc.html
 * (lines 1085-1118), now reading the real reading_status table (see
 * supabase/migrations/20260902160000_reading_status.sql) instead of
 * the persona fixture — same fix as /home's shelf counts and the book
 * page's status picker, all three built together.
 *
 * reading_status.book_id references books(id) directly, so PostgREST
 * can embed the book row in one query (unlike the profiles/user_roles/
 * pending_deletions situation elsewhere in the admin panel, which have
 * no direct FK between them and need separate queries merged by hand).
 *
 * The Read column also needs each book's own-review star rating (board
 * C1: "★★★★☆ REVIEWED" vs "＋ WRITE A REVIEW"), so the signed-in
 * reader's reviews come along too. `.eq("user_id", user.id)` is doing
 * real work here, not just belt-and-braces: reviews' RLS also has a
 * "public can read anything allowed" policy, and Postgres ORs
 * permissive policies together, so leaving that filter off would
 * return every reader's public reviews, not just this reader's own.
 */
export default async function TrackerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data }, { data: reviewRows }] = await Promise.all([
    supabase
      .from("reading_status")
      .select("status, progress, books(id, title, author, cover_url)")
      .order("updated_at", { ascending: false }),
    user ? supabase.from("reviews").select("book_id, stars").eq("user_id", user.id) : Promise.resolve({ data: [] }),
  ]);

  const rows = (data ?? []) as unknown as {
    status: "want" | "reading" | "read";
    progress: string | null;
    books: { id: string; title: string; author: string; cover_url: string | null } | null;
  }[];
  const myStarsByBook = new Map((reviewRows ?? []).map((r) => [r.book_id as string, r.stars as number]));

  const shelves: { name: string; key: "reading" | "want" | "read"; emptyMsg: string; books: ShelfBook[] }[] = [
    { name: "Currently Reading", key: "reading", emptyMsg: "MARK A BOOK AS CURRENTLY READING", books: [] },
    { name: "Want to Read", key: "want", emptyMsg: "NOTHING SAVED FOR LATER YET", books: [] },
    { name: "Read", key: "read", emptyMsg: "FINISHED BOOKS LAND HERE", books: [] },
  ];

  for (const row of rows) {
    if (!row.books) continue; // The book was deleted from the catalogue; cascade removed this row's usefulness too.
    const shelf = shelves.find((s) => s.key === row.status);
    shelf?.books.push({
      id: row.books.id,
      title: row.books.title,
      author: row.books.author,
      coverUrl: row.books.cover_url,
      progress: row.progress,
      myStars: myStarsByBook.get(row.books.id) ?? null,
    });
  }

  return (
    <>
      <Nav />
      <div className="wrap">
        <h1 style={{ fontSize: 36, margin: "0 0 22px" }}>Reading tracker</h1>
        <TrackerShelves shelves={shelves} />
      </div>
    </>
  );
}
