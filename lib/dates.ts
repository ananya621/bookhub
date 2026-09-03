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
