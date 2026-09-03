/*
 * Pure formatting helper for the nav avatar, split out from lib/auth.ts
 * on purpose: auth.ts pulls in the server-only Supabase client (it reads
 * cookies via next/headers), and Nav/MobileNav are client components, so
 * importing from auth.ts there would drag that server-only module into
 * the client bundle. This file has no such dependency, so it is safe for
 * either side to import.
 */

/** Initials for the nav avatar, matching the export's monogram. */
export const initialsOf = (displayName: string) =>
  displayName.trim().slice(0, 1).toUpperCase() || "?";
