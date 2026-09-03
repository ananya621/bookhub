import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import ListsClient, { type ListRow } from "./ListsClient";

/*
 * Ported from the `isLists` block in Prototype with Admin.dc.html
 * (lines 1119-1196), now a server component reading the real `lists` /
 * `list_books` tables (see supabase/migrations/20260903000200_lists.sql)
 * instead of the persona fixture (lib/personas.ts's PersonaData.lists —
 * that fixture only ever fed the dev-only persona switcher's fake
 * session anyway; a real signed-in reader was seeing it regardless,
 * same bug class the reviews/reading-status work fixed elsewhere this
 * session).
 *
 * The reader's own reading_status is fetched too, purely to drive each
 * book's "ALSO IN: ..." line the same way the original mock version
 * did — real now instead of the hand-seeded shelfStatuses map.
 */
export default async function ListsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: listRows }, { data: statusRows }] = await Promise.all([
    user
      ? supabase
          .from("lists")
          .select("id, name, slug, is_public, created_at, list_books(book_id, added_at, books(id, title, author, cover_url))")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    user ? supabase.from("reading_status").select("book_id, status") : Promise.resolve({ data: [] }),
  ]);

  const statusByBook = new Map((statusRows ?? []).map((s) => [s.book_id as string, s.status as string]));

  type Raw = {
    id: string;
    name: string;
    slug: string;
    is_public: boolean;
    list_books: {
      book_id: string;
      added_at: string;
      books: { id: string; title: string; author: string; cover_url: string | null } | null;
    }[];
  };

  const lists: ListRow[] = ((listRows ?? []) as unknown as Raw[]).map((l) => ({
    id: l.id,
    name: l.name,
    slug: l.slug,
    isPublic: l.is_public,
    books: l.list_books
      .slice()
      .sort((a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime())
      .filter((lb) => lb.books !== null)
      .map((lb) => ({
        id: lb.books!.id,
        title: lb.books!.title,
        author: lb.books!.author,
        coverUrl: lb.books!.cover_url,
        status: statusByBook.get(lb.books!.id) ?? null,
      })),
  }));

  return (
    <>
      <Nav />
      <div className="wrap">
        <ListsClient lists={lists} />
      </div>
    </>
  );
}
