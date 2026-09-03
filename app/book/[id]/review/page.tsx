import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewForm from "./ReviewForm";

/*
 * Ported from the `isReview` block in Prototype with Admin.dc.html
 * (lines 1049-1084), now a server component so the book and the
 * reader's own existing review (if any) come from the database instead
 * of localStorage.
 *
 * `params` is a Promise in this Next.js version — see the comment in
 * app/book/[id]/page.tsx. Posting happens in ReviewForm, a client
 * component, via app/actions/reviews.ts's submitReview.
 *
 * The source's `isReview` screen is deliberately outside the site
 * chrome (not in the `chrome` list that gates the nav bar), so unlike
 * the other ported screens there is no `<Nav />` here either.
 *
 * The source also runs review text through a profanity filter
 * (`hasBanned`) and shows a "can't be posted" banner when it trips.
 * That filter is unrelated content-moderation logic, out of scope for
 * this pass (see task notes) — `reviewBlocked` stays a structural dead
 * branch that never triggers, same as before this rewrite.
 */
export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: book }, { data: userData }] = await Promise.all([
    supabase.from("books").select("id, title, author").eq("id", id).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!book) notFound();

  let existing: { stars: number; text: string } | null = null;
  if (userData.user) {
    const { data } = await supabase
      .from("reviews")
      .select("stars, text")
      .eq("book_id", id)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (data) existing = { stars: data.stars as number, text: data.text as string };
  }

  return (
    <ReviewForm
      key={id}
      id={id}
      book={{ title: book.title as string, author: (book.author as string) ?? "" }}
      initialStars={existing?.stars ?? 0}
      initialText={existing?.text ?? ""}
    />
  );
}
