"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/*
 * The reading tracker (Want to Read / Currently Reading / Read, plus a
 * progress step while reading) — see
 * supabase/migrations/20260902160000_reading_status.sql for the table
 * and its RLS. Plain upsert/delete through the normal RLS-scoped
 * client is enough here; unlike account deletion this never needs the
 * admin API, since a reader only ever touches their own row and RLS
 * already guarantees that.
 *
 * No gate-dialog component exists in this port for "guest tried a
 * signed-in action" (see the note in docs/auth-states.md) — a guest
 * calling either of these just gets an error back rather than a
 * sign-up prompt, same as every other write action in this codebase
 * that doesn't have one built yet.
 */

export type ActionResult = { error: string } | { ok: string } | undefined;

export async function setReadingStatus(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const bookId = String(formData.get("bookId") ?? "");
  const status = String(formData.get("status") ?? "");
  const progress = String(formData.get("progress") ?? "") || null;

  if (!bookId || !["want", "reading", "read"].includes(status)) {
    return { error: "SOMETHING WENT WRONG" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "SIGN UP TO TRACK YOUR READING" };

  const { error } = await supabase
    .from("reading_status")
    .upsert(
      { user_id: user.id, book_id: bookId, status, progress },
      { onConflict: "user_id,book_id" }
    );
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath(`/book/${bookId}`);
  revalidatePath("/tracker");
  revalidatePath("/home");
  return { ok: "saved" };
}

export async function clearReadingStatus(
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
    .from("reading_status")
    .delete()
    .eq("user_id", user.id)
    .eq("book_id", bookId);
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath(`/book/${bookId}`);
  revalidatePath("/tracker");
  revalidatePath("/home");
  return { ok: "cleared" };
}
