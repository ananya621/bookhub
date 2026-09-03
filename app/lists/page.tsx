import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import ListsClient, { type ListRow } from "./ListsClient";

/*
 * Ported from the `isLists` block in Prototype with Admin.dc.html,
 * now a server component reading the real `lists` / `list_books`
 * tables (see supabase/migrations/20260903000200_lists.sql). It used to
 * read a hardcoded fixture belonging to a dev-only "persona" fake-login
 * system, which a real signed-in reader was being shown too. Both the
 * fixture and that whole system have since been deleted.
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
    created_at: string;
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
    // Board C2 shows "9 BOOKS · UPDATED 2 DAYS AGO" under the list name.
    // There's no updated_at column on `lists` itself (a visibility flip
    // doesn't bump anything), so this uses the most recent book added
    // to the list as the honest stand-in, falling back to when the list
    // was created if it's still empty. Shown as a plain date rather
    // than a relative "2 days ago" string — every other real timestamp
    // in this app (reviews, admin's "joined"/"deleted") is formatted
    // the same way, and adding a relative-time formatter just for this
    // one field would be a new convention for no real gain.
    updatedLabel: formatDate(
      l.list_books.reduce((max, lb) => (lb.added_at > max ? lb.added_at : max), l.created_at)
    ),
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
