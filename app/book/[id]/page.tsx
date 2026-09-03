import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import BookDetail, { type DetailBook, type DetailReview } from "./BookDetail";

/*
 * The book page, reading the real catalogue.
 *
 * A server component so the book, its reviews and the reader's own
 * report history all come from the database. Everything interactive —
 * reading status, progress, review edit/delete, the report dialog —
 * lives in BookDetail, which is a client component.
 *
 * `params` is a Promise in this Next.js version, so it is awaited here.
 * The client half used to unwrap it with React's `use()`; now that the
 * lookup happens on the server, `await` is the right tool.
 *
 * The id is a uuid from the books table, not the short hand-written
 * name the mock data used, so an old link like /book/hobbit correctly
 * 404s rather than showing something unrelated.
 *
 * reviews.user_id references auth.users, not profiles, so PostgREST
 * can't embed a display name/avatar colour onto each review — fetched
 * separately and merged here, same "one data model, two views" fetch
 * pattern used for the admin users list.
 */
export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const [{ data }, { data: userData }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, author, pages, summary, cover_url, genres, reading_level, is_series")
      .eq("id", id)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!data) notFound();

  const me = userData.user;

  // Only fetched when signed in — reading_status is RLS'd to the
  // caller's own rows anyway, but there's no point querying for a
  // guest, who can't have one.
  let initialStatus: "none" | "want" | "reading" | "read" = "none";
  let initialProgress: string | null = null;
  if (me) {
    const { data: status } = await supabase
      .from("reading_status")
      .select("status, progress")
      .eq("user_id", me.id)
      .eq("book_id", id)
      .maybeSingle();
    if (status) {
      initialStatus = status.status as "want" | "reading" | "read";
      initialProgress = status.progress as string | null;
    }
  }

  const { data: reviewRows } = await supabase
    .from("reviews")
    .select("id, user_id, stars, text, created_at")
    .eq("book_id", id)
    .eq("status", "allowed")
    .order("created_at", { ascending: false });

  const userIds = Array.from(new Set((reviewRows ?? []).map((r) => r.user_id as string)));
  const { data: profileRows } = userIds.length
    ? await supabase.from("profiles").select("id, display_name, avatar_color").in("id", userIds)
    : { data: [] as { id: string; display_name: string | null; avatar_color: string }[] };
  const profileById = new Map((profileRows ?? []).map((p) => [p.id as string, p]));

  // Which of this page's targets (each other reader's review, and each
  // other reader themself) this signed-in reader has already reported —
  // so the button can come back as "Reported" across visits, not just
  // for the session.
  let alreadyReported = new Set<string>();
  if (me) {
    const targetIds = Array.from(new Set([id, ...userIds, ...(reviewRows ?? []).map((r) => r.id as string)]));
    const { data: myReports } = await supabase
      .from("reports")
      .select("target_type, target_id")
      .eq("reporter_id", me.id)
      .in("target_id", targetIds);
    alreadyReported = new Set((myReports ?? []).map((r) => `${r.target_type as string}:${r.target_id as string}`));
  }

  // The reader's own lists, and which already hold this book — for the
  // "＋ Add to a list" picker.
  let myLists: { id: string; name: string; hasBook: boolean }[] = [];
  if (me) {
    const { data: listRows } = await supabase
      .from("lists")
      .select("id, name, list_books(book_id)")
      .eq("user_id", me.id)
      .order("created_at", { ascending: true });
    myLists = ((listRows ?? []) as unknown as { id: string; name: string; list_books: { book_id: string }[] }[]).map(
      (l) => ({ id: l.id, name: l.name, hasBook: l.list_books.some((lb) => lb.book_id === id) })
    );
  }

  let myReview: DetailReview | null = null;
  const reviews: DetailReview[] = [];
  for (const r of reviewRows ?? []) {
    const profile = profileById.get(r.user_id as string);
    const entry: DetailReview = {
      id: r.id as string,
      userId: r.user_id as string,
      who: (profile?.display_name as string | null) ?? "(no name set yet)",
      avatarColor: (profile?.avatar_color as string) ?? "#c6f24e",
      stars: r.stars as number,
      text: r.text as string,
      date: formatDate(r.created_at as string),
      mine: me ? r.user_id === me.id : false,
      // Combined, matching the design: reporting either the review or
      // its author retires both buttons on this card at once, behind
      // one "Reported" badge, not two independent ones.
      alreadyReported:
        alreadyReported.has(`review:${r.id as string}`) ||
        alreadyReported.has(`user:${r.user_id as string}`),
    };
    if (entry.mine) myReview = entry;
    else reviews.push(entry);
  }

  const book: DetailBook = {
    id: data.id as string,
    title: data.title as string,
    author: (data.author as string) ?? "",
    pages: data.pages as number | null,
    summary: data.summary as string | null,
    coverUrl: data.cover_url as string | null,
    genres: (data.genres as string[]) ?? [],
    readingLevel: (data.reading_level as string) ?? "",
    isSeries: Boolean(data.is_series),
  };

  // Keyed on the id so moving straight from one book to another resets
  // the per-book state instead of carrying the last one's over.
  return (
    <BookDetail
      key={book.id}
      id={book.id}
      book={book}
      initialStatus={initialStatus}
      initialProgress={initialProgress}
      isGuest={!me}
      myReview={myReview}
      reviews={reviews}
      myLists={myLists}
    />
  );
}
