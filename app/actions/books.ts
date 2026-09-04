"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { containsBannedWord } from "@/lib/word-filter";
import { searchGoogleBooks, type GoogleBook, type SearchOutcome } from "@/lib/google-books";
import {
  deleteCover,
  storeCoverFromFile,
  storeCoverFromUrl,
  MAX_COVER_BYTES,
  MAX_COVER_LABEL,
} from "@/lib/storage";

/*
 * Searching for books, asking for missing ones, and the admin side of
 * approving them.
 *
 * The rule this whole file exists to keep: a book only reaches the
 * catalogue when an admin puts it there. Searching Google never adds
 * anything. That is the one point where a person checks a book is
 * suitable for children, so it is deliberately not automated.
 */

export type ActionResult = { error: string } | { ok: string } | undefined;

/* --- Reader: searching ---------------------------------------------- */

/**
 * Google results for the "suggest a book" form, with anything we already
 * hold filtered out — there is no point asking for a book that is
 * already on the shelf.
 *
 * Passes the reason through when the search couldn't run, so the form
 * can say why instead of showing an empty list that reads as "no such
 * book".
 */
export async function suggestFromGoogle(query: string): Promise<SearchOutcome> {
  const outcome = await searchGoogleBooks(query);
  if (outcome.books.length === 0) return outcome;

  const supabase = await createClient();
  const { data: known } = await supabase
    .from("books")
    .select("external_id")
    .in(
      "external_id",
      outcome.books.map((r: GoogleBook) => r.externalId)
    );

  const have = new Set((known ?? []).map((k) => k.external_id));
  return { books: outcome.books.filter((r: GoogleBook) => !have.has(r.externalId)) };
}

/* --- Reader: asking for a book -------------------------------------- */

export async function requestBook(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "WE NEED AT LEAST A TITLE" };

  const pagesRaw = String(formData.get("pages") ?? "");
  const pages = Number.parseInt(pagesRaw, 10);

  const supabase = await createClient();

  // The reader's own words, so the same filter review text goes through.
  // Not the title or author: those are usually Google's, and an admin
  // reads every request before it becomes a book anyway.
  const note = String(formData.get("note") ?? "").trim() || null;
  if (note) {
    const hasBanned = await containsBannedWord(supabase, note);
    if (hasBanned) return { error: "THAT NOTE CAN’T BE SENT — TRY REWORDING IT" };
  }

  // request_book() does the merging: if somebody already asked for this
  // book and it is still waiting, we join their request instead of
  // making a second identical one.
  const { error } = await supabase.rpc("request_book", {
    p_external_id: String(formData.get("externalId") ?? "") || null,
    p_title: title,
    p_author: String(formData.get("author") ?? "").trim(),
    p_pages: Number.isFinite(pages) ? pages : null,
    p_summary: String(formData.get("summary") ?? "") || null,
    p_cover_url: String(formData.get("coverUrl") ?? "") || null,
    p_note: note,
  });

  if (error) {
    // The function raises readable messages ("that book is already in
    // the catalogue"), so show them rather than something generic.
    return { error: error.message.toUpperCase() };
  }

  revalidatePath("/requests");
  return { ok: "sent" };
}

/* --- Admin: settling requests ---------------------------------------- */

export async function declineRequest(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const reason = String(formData.get("reason") ?? "").trim();
  // The reader is shown this, so make them pick something.
  if (!reason) return { error: "PICK A REASON — THE READER SEES IT" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_book_request", {
    p_request_id: String(formData.get("requestId") ?? ""),
    p_reason: reason,
  });

  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/admin/requests");
  revalidatePath("/requests");
  return { ok: "declined" };
}

/* --- Admin: importing a book (Step 2 of the catalogue screen) -------- */

/**
 * Saves a book from the catalogue's Step 2 form — every field is
 * whatever the admin left in the form, not necessarily what Google or
 * the original request said, since the whole point of Step 2 is
 * reviewing and correcting that before it goes live.
 *
 * Doubles as request approval: if `requestId` is present and
 * `fulfilRequest` is checked, the newly-created book is linked to that
 * request via link_book_to_request() (see the migration of the same
 * name). A book with no matching request just skips that step.
 *
 * Only admins get here — the insert policy on `books` and the admin
 * check inside link_book_to_request() both enforce that independently,
 * so this cannot be worked around by calling the action directly.
 */
export async function importBook(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "A TITLE IS REQUIRED" };

  const summary = String(formData.get("summary") ?? "").trim();

  const supabase = await createClient();

  // Title and summary are the two fields on this form that go straight
  // onto the book's public page as free text, so they get the same word
  // filter a review or a display name does. Step 2 exists precisely so
  // an admin can retype whatever Google (or a reader's request) supplied
  // — that retyped text can still carry something that shouldn't go
  // live, same as any other typed field. Author is left unchecked: it's
  // a real person's name rather than free text, so the filter is far
  // more likely to misfire on it (a surname containing a banned
  // substring) than to ever catch anything genuine.
  const titleBanned = await containsBannedWord(supabase, title);
  if (titleBanned) return { error: "THAT TITLE CAN’T BE USED — CHECK IT FOR TYPOS" };
  if (summary) {
    const summaryBanned = await containsBannedWord(supabase, summary);
    if (summaryBanned) return { error: "THAT SUMMARY CAN’T BE USED — TRY REWORDING IT" };
  }

  const pages = Number.parseInt(String(formData.get("pages") ?? ""), 10);
  const externalId = String(formData.get("externalId") ?? "").trim() || null;
  const requestId = String(formData.get("requestId") ?? "").trim() || null;
  const fulfilRequest = formData.get("fulfilRequest") === "on";

  // The cover is stored once, here, at save time — not on every click
  // while the admin is still deciding. "api" re-hosts Google's image so
  // the link never rots; "upload" stores whatever file they picked.
  const coverMode = String(formData.get("coverMode") ?? "none");
  let coverUrl: string | null = null;
  if (coverMode === "api") {
    const apiCoverUrl = String(formData.get("apiCoverUrl") ?? "").trim();
    if (apiCoverUrl) coverUrl = await storeCoverFromUrl(apiCoverUrl);
  } else if (coverMode === "upload") {
    const file = formData.get("coverFile");
    if (file instanceof File) {
      if (file.size > MAX_COVER_BYTES) {
        return { error: `THAT IMAGE IS TOO BIG — ${MAX_COVER_LABEL} OR LESS` };
      }
      coverUrl = await storeCoverFromFile(file);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inserted, error } = await supabase
    .from("books")
    .insert({
      source: externalId ? "google" : "manual",
      external_id: externalId,
      title,
      author: String(formData.get("author") ?? "").trim(),
      pages: Number.isFinite(pages) ? pages : null,
      summary: summary || null,
      cover_url: coverUrl,
      genres: formData.getAll("genres").map(String),
      reading_level: String(formData.get("readingLevel") ?? "Middle Grade"),
      is_series: formData.get("isSeries") === "on",
      added_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    // The unique index on external_id means "already imported".
    if (error.code === "23505") return { error: "THAT BOOK IS ALREADY IN THE CATALOGUE" };
    return { error: error.message.toUpperCase() };
  }

  revalidatePath("/admin/catalogue");
  revalidatePath("/search");

  if (requestId && fulfilRequest) {
    const { error: linkError } = await supabase.rpc("link_book_to_request", {
      p_request_id: requestId,
      p_book_id: inserted.id as string,
    });
    revalidatePath("/admin/requests");
    revalidatePath("/requests");
    // The book is safely in the catalogue either way by this point — a
    // failure here (someone else already settled the request) shouldn't
    // read as the whole import having failed.
    if (linkError) return { ok: "added-unlinked" };
    return { ok: "added-and-fulfilled" };
  }

  return { ok: "added" };
}

/* --- Admin: the "In the catalogue" list ------------------------------- */

/**
 * "Add a cover" on an already-catalogued book that has none — the
 * counterpart to importBook()'s cover handling, for a book that's
 * already live. Only ever a file upload here: there's no Google result
 * still in hand for an existing row to re-fetch from.
 */
export async function addBookCover(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const bookId = String(formData.get("bookId") ?? "");
  const file = formData.get("coverFile");
  if (!bookId) return { error: "NO BOOK SPECIFIED" };
  if (!(file instanceof File) || file.size === 0) return { error: "PICK A FILE FIRST" };
  if (file.size > MAX_COVER_BYTES) {
    return { error: `THAT IMAGE IS TOO BIG — ${MAX_COVER_LABEL} OR LESS` };
  }

  const coverUrl = await storeCoverFromFile(file);
  if (!coverUrl) return { error: "COULDN'T STORE THAT FILE — TRY A DIFFERENT IMAGE" };

  const supabase = await createClient();
  const { data: previous } = await supabase
    .from("books")
    .select("cover_url")
    .eq("id", bookId)
    .maybeSingle();

  const { error } = await supabase.from("books").update({ cover_url: coverUrl }).eq("id", bookId);
  if (error) return { error: error.message.toUpperCase() };

  await deleteCover(previous?.cover_url as string | null);

  revalidatePath("/admin/catalogue");
  revalidatePath("/admin");
  revalidatePath("/search");
  revalidatePath(`/book/${bookId}`);
  return { ok: "cover-added" };
}

/**
 * Editing an already-catalogued book — the same fields Step 2 of
 * import sets (title, author, pages, summary, genres, reading level,
 * series), on a book that's already live. No screen for this exists in
 * the design; built to the same shape as importBook()'s Step 2 fields
 * and the same word-filter rule (title/summary checked, author isn't —
 * see importBook()'s comment on why).
 *
 * Cover handling mirrors addBookCover()/removeBook(): a newly uploaded
 * file replaces whatever was stored (the old file deleted only after
 * the new one is safely saved), and checking "Remove cover" on its own
 * clears it back to no-cover. Leaving both alone keeps the existing
 * cover untouched.
 */
export async function updateBook(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const bookId = String(formData.get("bookId") ?? "");
  if (!bookId) return { error: "NO BOOK SPECIFIED" };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "A TITLE IS REQUIRED" };

  const summary = String(formData.get("summary") ?? "").trim();

  const supabase = await createClient();

  const titleBanned = await containsBannedWord(supabase, title);
  if (titleBanned) return { error: "THAT TITLE CAN’T BE USED — CHECK IT FOR TYPOS" };
  if (summary) {
    const summaryBanned = await containsBannedWord(supabase, summary);
    if (summaryBanned) return { error: "THAT SUMMARY CAN’T BE USED — TRY REWORDING IT" };
  }

  const pages = Number.parseInt(String(formData.get("pages") ?? ""), 10);

  const { data: existing } = await supabase
    .from("books")
    .select("cover_url")
    .eq("id", bookId)
    .maybeSingle();

  let coverUrl = (existing?.cover_url as string | null) ?? null;
  let oldCoverToDelete: string | null = null;

  const file = formData.get("coverFile");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_COVER_BYTES) {
      return { error: `THAT IMAGE IS TOO BIG — ${MAX_COVER_LABEL} OR LESS` };
    }
    const newCoverUrl = await storeCoverFromFile(file);
    if (!newCoverUrl) return { error: "COULDN'T STORE THAT FILE — TRY A DIFFERENT IMAGE" };
    oldCoverToDelete = coverUrl;
    coverUrl = newCoverUrl;
  } else if (formData.get("removeCover") === "on") {
    oldCoverToDelete = coverUrl;
    coverUrl = null;
  }

  const { error } = await supabase
    .from("books")
    .update({
      title,
      author: String(formData.get("author") ?? "").trim(),
      pages: Number.isFinite(pages) ? pages : null,
      summary: summary || null,
      cover_url: coverUrl,
      genres: formData.getAll("genres").map(String),
      reading_level: String(formData.get("readingLevel") ?? "Middle Grade"),
      is_series: formData.get("isSeries") === "on",
    })
    .eq("id", bookId);

  if (error) return { error: error.message.toUpperCase() };

  if (oldCoverToDelete) await deleteCover(oldCoverToDelete);

  revalidatePath("/admin/catalogue");
  revalidatePath("/admin");
  revalidatePath("/search");
  revalidatePath(`/book/${bookId}`);
  return { ok: "updated" };
}

/** "Remove" on the catalogue list — takes the book off the shelf entirely. */
export async function removeBook(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const bookId = String(formData.get("bookId") ?? "");
  if (!bookId) return { error: "NO BOOK SPECIFIED" };

  const supabase = await createClient();
  const { data: removing } = await supabase
    .from("books")
    .select("cover_url")
    .eq("id", bookId)
    .maybeSingle();

  const { error } = await supabase.from("books").delete().eq("id", bookId);
  if (error) return { error: error.message.toUpperCase() };

  await deleteCover(removing?.cover_url as string | null);

  revalidatePath("/admin/catalogue");
  revalidatePath("/admin");
  revalidatePath("/search");
  return { ok: "removed" };
}
