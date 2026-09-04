/*
 * The two date questions the admin screens keep asking: how long a
 * pending deletion has left before it is purged for good, and whether a
 * ban is still running.
 *
 * Both are used by server pages and client components, so nothing
 * server-only belongs in here.
 */

/** Whole days until `purgeAt`, floored at 0 — a passed date reads as 0, never negative. */
export function daysLeft(purgeAt: string): number {
  const ms = new Date(purgeAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function isInFuture(iso: string): boolean {
  return new Date(iso).getTime() > Date.now();
}

/*
 * A date the reader can read, formatted the same way everywhere.
 *
 * BOTH the locale and the time zone are pinned, and it takes both. A
 * client component renders twice — once in Node during the server
 * render, then again in the browser during hydration — and anything the
 * two disagree about makes React throw the tree away and rebuild it.
 *
 * Pinning only the locale fixed half of it and looked finished: it
 * stopped "03/09/2026" vs "3/9/2026". But toLocaleDateString still asks
 * the runtime for the time zone, and the server runs in UTC while the
 * reader's browser does not. An account created at 20:07 UTC on the 3rd
 * is already the 4th in India, so the server sent "03/09/2026" and the
 * browser rendered "04/09/2026" — a real mismatch in production that
 * never once reproduced locally, because a dev server and its browser
 * share a machine and therefore a time zone.
 *
 * Europe/London because this is a British school project — the design
 * writes dates day/month/year and the readers are in the UK. A date is
 * shown as the day it was in the school's own time, not the day it
 * happened to be wherever the server was.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "Europe/London" });
}
