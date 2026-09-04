/*
 * How big a book cover may be, kept in its own file with no imports.
 *
 * It lives apart from lib/storage.ts because both sides need it: the
 * server action that stores the file, and the admin's browser, which
 * checks the size the moment a file is picked. lib/storage.ts reaches
 * for the Supabase server client, which reaches for next/headers, and a
 * client component importing that chain breaks the build — the same
 * reason lib/avatar.ts exists.
 *
 * The number is below next.config.ts's 5MB Server Action body limit on
 * purpose. That limit covers the whole multipart request — the rest of
 * the form, and multipart's own boundaries and headers — not just the
 * file, so a file sitting exactly at the limit still arrives over it.
 */
export const MAX_COVER_BYTES = 4 * 1024 * 1024;

/** Human-readable, for the message shown when a cover is too big. */
export const MAX_COVER_LABEL = "4MB";
