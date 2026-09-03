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
 * The locale is pinned on purpose. A bare toLocaleDateString() asks the
 * machine it runs on, and a client component runs on BOTH — Node during
 * the server render, then the browser during hydration. When the two
 * disagree React throws away the tree and re-renders it: the admin's
 * user page really did this, rendering "03/09/2026" on the server and
 * "3/9/2026" in the browser.
 *
 * en-GB because that is where this is used — the design writes dates as
 * day/month/year throughout.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB");
}
