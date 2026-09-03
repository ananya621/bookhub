"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/*
 * Reading lists. See supabase/migrations/20260903000200_lists.sql for
 * the tables, RLS and get_shared_list() — the design's "PRIVATE — LINK
 * ONLY" model, not access control, so is_public never gates a read
 * here; it only decides whether a list would show up somewhere
 * browsable (nothing does yet).
 */

export type ActionResult = { error: string } | { ok: string } | undefined;

function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "list"}-${suffix}`;
}

export async function createList(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "NAME YOUR LIST FIRST" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "SIGN UP TO BUILD READING LISTS" };

  // A slug collision (two different random suffixes landing on the
  // same value) is rare enough to just retry rather than guard against
  // up front.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase
      .from("lists")
      .insert({ user_id: user.id, name, slug: makeSlug(name) });
    if (!error) {
      revalidatePath("/lists");
      revalidatePath("/home");
      return { ok: "created" };
    }
    if (error.code !== "23505") return { error: error.message.toUpperCase() };
    if (error.message.includes("user_id_name")) {
      return { error: "YOU ALREADY HAVE A LIST WITH THAT NAME" };
    }
    // Otherwise it was the slug that collided — loop and try again.
  }
  return { error: "SOMETHING WENT WRONG" };
}

export async function deleteList(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const listId = String(formData.get("listId") ?? "");
  if (!listId) return { error: "SOMETHING WENT WRONG" };

  const supabase = await createClient();
  const { error } = await supabase.from("lists").delete().eq("id", listId);
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/lists");
  revalidatePath("/home");
  return { ok: "deleted" };
}

export async function setListVisibility(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const listId = String(formData.get("listId") ?? "");
  const isPublic = formData.get("isPublic") === "true";
  if (!listId) return { error: "SOMETHING WENT WRONG" };

  const supabase = await createClient();
  const { error } = await supabase.from("lists").update({ is_public: isPublic }).eq("id", listId);
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/lists");
  return { ok: "updated" };
}

export async function addBookToList(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const listId = String(formData.get("listId") ?? "");
  const bookId = String(formData.get("bookId") ?? "");
  if (!listId || !bookId) return { error: "SOMETHING WENT WRONG" };

  const supabase = await createClient();
  const { error } = await supabase.from("list_books").insert({ list_id: listId, book_id: bookId });
  // 23505 = already on that list -- treat as success, not an error.
  if (error && error.code !== "23505") return { error: error.message.toUpperCase() };

  revalidatePath("/lists");
  revalidatePath(`/book/${bookId}`);
  return { ok: "added" };
}

export async function removeBookFromList(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const listId = String(formData.get("listId") ?? "");
  const bookId = String(formData.get("bookId") ?? "");
  if (!listId || !bookId) return { error: "SOMETHING WENT WRONG" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("list_books")
    .delete()
    .eq("list_id", listId)
    .eq("book_id", bookId);
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/lists");
  revalidatePath(`/book/${bookId}`);
  return { ok: "removed" };
}
