"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { containsBannedWord } from "@/lib/word-filter";

/*
 * Reviews — one per (reader, book). See
 * supabase/migrations/20260902180000_reviews.sql for the table and its
 * RLS. A reader's own insert/update goes through the normal RLS-scoped
 * client; the `reviews_protect_status` trigger stops a non-admin edit
 * from smuggling in a status change, so `submitReview` never touches
 * status at all.
 *
 * The word filter (contains_banned_word(), see
 * supabase/migrations/20260903120000_full_word_filter.sql) blocks a
 * review before it's ever saved — same gate the design's hasBanned()
 * uses, and the same one display names already went through. `blocked`
 * is its own result variant (not just an error) so the write-review
 * screen can show the design's "This one can't be posted" banner
 * instead of a plain error line, and keep the reader's text on screen
 * rather than wiping it.
 */

export type ActionResult = { error: string } | { ok: string } | { blocked: true } | undefined;

export async function submitReview(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const bookId = String(formData.get("bookId") ?? "");
  const stars = Number(formData.get("stars") ?? 0);
  const text = String(formData.get("text") ?? "").trim();

  if (!bookId || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { error: "PICK A STAR RATING FIRST" };
  }
  if (text.length < 4) {
    return { error: "WRITE A LINE OR TWO SO IT HELPS SOMEONE" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "SIGN UP TO WRITE A REVIEW" };

  const hasBanned = await containsBannedWord(supabase, text);
  if (hasBanned) return { blocked: true };

  const { error } = await supabase
    .from("reviews")
    .upsert(
      { book_id: bookId, user_id: user.id, stars, text },
      { onConflict: "book_id,user_id" }
    );
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath(`/book/${bookId}`);
  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/users/${user.id}`);
  return { ok: "posted" };
}

export async function deleteOwnReview(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const bookId = String(formData.get("bookId") ?? "");
  if (!bookId) return { error: "SOMETHING WENT WRONG" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "NOT SIGNED IN" };

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("user_id", user.id)
    .eq("book_id", bookId);
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath(`/book/${bookId}`);
  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/users/${user.id}`);
  return { ok: "deleted" };
}

/*
 * Admin moderation. Every review is live the moment it's posted (there
 * is no "pending, awaiting first look" review status) — what the admin
 * Reviews queue actually lists is reviews with at least one *open*
 * report against them. "Allow" and "Delete" both settle that: the
 * review's status is set accordingly and its open reports are marked
 * actioned, which is what drops it out of the "needs a look" list.
 * "Undo" reopens those reports — same "puts it back in the queue"
 * meaning as the book-requests Undo — rather than pretending to
 * restore deleted content, since "Delete" here was always a status
 * flip, never a real delete (only the reader's own `deleteOwnReview`
 * above does that). RLS's `reviews_update_own_or_admin` /
 * `reports_update_admin` policies are what actually allow this for an
 * admin.
 */
export async function adminModerateReview(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const reviewId = String(formData.get("reviewId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!reviewId || !["allowed", "deleted", "undo"].includes(decision)) {
    return { error: "SOMETHING WENT WRONG" };
  }

  const supabase = await createClient();

  if (decision === "undo") {
    const { error } = await supabase
      .from("reports")
      .update({ status: "open" })
      .eq("target_type", "review")
      .eq("target_id", reviewId)
      .eq("status", "actioned");
    if (error) return { error: error.message.toUpperCase() };
    revalidatePath("/admin/reviews");
    return { ok: "updated" };
  }

  const { data, error } = await supabase
    .from("reviews")
    .update({ status: decision })
    .eq("id", reviewId)
    .select("book_id, user_id")
    .maybeSingle();
  if (error) return { error: error.message.toUpperCase() };

  await supabase
    .from("reports")
    .update({ status: "actioned" })
    .eq("target_type", "review")
    .eq("target_id", reviewId)
    .eq("status", "open");

  if (data) {
    revalidatePath(`/book/${data.book_id as string}`);
    revalidatePath(`/admin/users/${data.user_id as string}`);
  }
  revalidatePath("/admin/reviews");
  return { ok: "updated" };
}
