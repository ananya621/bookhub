import Link from "next/link";
import { notFound } from "next/navigation";
import { bookById } from "@/lib/mock";
import { seedLists, slugify } from "@/app/lists/data";
import { getCurrentUser } from "@/lib/auth";

/*
 * Ported from the `isShared` block in Prototype with Admin.dc.html
 * (lines 1197-1221) — the public, read-only view of a reading list, as
 * a visitor (not necessarily logged in) sees it via its share link.
 *
 * The export keeps this screen out of its `chrome` list (no nav bar),
 * and its wrapper is a plain centered div rather than `.wrap` — same
 * as the other chrome-less screens (login, request, etc.) — so neither
 * is added here.
 *
 * The list is looked up by slugifying `seedLists` from `app/lists/data`
 * (the same two lists shown on /lists, from the export's state at
 * source line ~1690). An unknown slug — including a list deleted on
 * the /lists screen, which only removes it from that page's local
 * state — 404s via `notFound()`, since there's no dedicated not-found
 * screen in scope here.
 *
 * `params` is a Promise in this Next.js version — see
 * node_modules/next/dist/docs/01-app/api-reference/03-file-conventions/dynamic-routes.md.
 *
 * Unlike the /home and /profile "Maya" bugs, this one has no real fix
 * available yet: seedLists has no owner field at all (there's no lists
 * table, so nothing to own a list yet), and this page is public — a
 * true anonymous visitor has no signed-in user to read a name from
 * either. Best available: show the current visitor's own name if
 * they're signed in (right in the common case, since the same demo
 * account "owns" every seeded list everywhere else in this port), and
 * a generic fallback rather than a specific wrong person's name
 * otherwise.
 */

export default async function SharedListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const readerName = user?.displayName || "a reader";
  const list = seedLists.find((l) => slugify(l.name) === slug);
  // "Private" only means the list is hidden from the owner's public
  // profile — per the source copy ("PRIVATE — LINK ONLY"), anyone with
  // the share link can still open it, so visibility isn't gated here.
  if (!list) notFound();

  const listBooks = list.bookIds.map((id) => bookById(id)).filter((b) => b !== undefined);

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 24px 60px" }}>
      <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 8 }}>
        A READING LIST SHARED BY {readerName.toUpperCase()}
      </div>
      <h1 style={{ fontSize: 36, margin: "0 0 4px" }}>{list.name}</h1>
      <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginBottom: 24 }}>
        {listBooks.length + " BOOKS · VIEW ONLY"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {listBooks.map((b) => (
          <div key={b.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="cover" style={{ aspectRatio: "2/3" }}>
              <span className="mono">COVER</span>
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 15 }}>{b.title}</div>
          </div>
        ))}
      </div>
      <div className="blueprint" style={{ padding: 20, background: "var(--color-accent-100)" }}>
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, marginBottom: 4 }}>Want a list like this?</div>
        <p style={{ fontSize: 13, marginBottom: 14 }}>Make a free account and start tracking what you read.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/start" className="btn btn-primary">Get Started</Link>
          <Link href="/lists" className="btn btn-secondary">Back to my lists</Link>
        </div>
      </div>
    </div>
  );
}
