import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookDetail, { type DetailBook } from "./BookDetail";

/*
 * The book page, reading the real catalogue.
 *
 * A server component so the book comes from the database. Everything
 * interactive — reading status, progress, the locally-posted review —
 * lives in BookDetail, which is a client component.
 *
 * `params` is a Promise in this Next.js version, so it is awaited here.
 * The client half used to unwrap it with React's `use()`; now that the
 * lookup happens on the server, `await` is the right tool.
 *
 * The id is a uuid from the books table, not the short hand-written
 * name the mock data used, so an old link like /book/hobbit correctly
 * 404s rather than showing something unrelated.
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

  // Only fetched when signed in — reading_status is RLS'd to the
  // caller's own rows anyway, but there's no point querying for a
  // guest, who can't have one.
  let initialStatus: "none" | "want" | "reading" | "read" = "none";
  let initialProgress: string | null = null;
  if (userData.user) {
    const { data: status } = await supabase
      .from("reading_status")
      .select("status, progress")
      .eq("user_id", userData.user.id)
      .eq("book_id", id)
      .maybeSingle();
    if (status) {
      initialStatus = status.status as "want" | "reading" | "read";
      initialProgress = status.progress as string | null;
    }
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
    />
  );
}
