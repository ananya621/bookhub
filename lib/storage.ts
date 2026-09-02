import { createClient } from "@/lib/supabase/server";

/*
 * Putting a book cover into the `book-covers` storage bucket (see
 * supabase/migrations/20260902120000_create_book_covers_storage_bucket.sql).
 *
 * A book's cover_url always points at a file WE hold, never at Google's
 * own image link directly — the design's own note explains why: "API
 * cover URLs rot, and a wall of broken covers is worse than none."
 */

const BUCKET = "book-covers";

function extensionFor(contentType: string | null | undefined): string {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  return "jpg";
}

async function upload(
  bytes: Blob,
  contentType: string
): Promise<string | null> {
  const supabase = await createClient();
  const path = `${crypto.randomUUID()}.${extensionFor(contentType)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) return null;

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Downloads whatever is at `url` (Google's cover link) and re-hosts it. */
export async function storeCoverFromUrl(url: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  return upload(await response.blob(), contentType);
}

/** Stores a file the admin picked from their own computer. */
export async function storeCoverFromFile(file: File): Promise<string | null> {
  if (file.size === 0) return null;
  return upload(file, file.type || "image/jpeg");
}
