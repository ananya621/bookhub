/*
 * Shared seed data for /lists and /lists/[slug].
 *
 * Lifted verbatim from the export's seeded state (source line ~1690:
 * `lists: [...]` in Prototype with Admin.dc.html) — not in lib/mock.ts
 * because lists are reader-owned data, not catalogue data.
 *
 * This lives in its own plain module, separate from app/lists/page.tsx,
 * because that page is a "use client" component: importing a value
 * export from it into the server-rendered `[slug]/page.tsx` fails at
 * runtime in this Next.js version (the client-reference wrapper isn't
 * a plain array — `seedLists.find` throws "not a function"). A small
 * shared, non-client module is the fix.
 */

export type ReadingList = {
  name: string;
  isPublic: boolean;
  bookIds: string[];
};

export const seedLists: ReadingList[] = [
  { name: "Favourite Fiction Reads", isPublic: true, bookIds: ["hobbit", "nevermoor"] },
  { name: "Scary but not too scary", isPublic: false, bookIds: ["coraline"] },
];

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
