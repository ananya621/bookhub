import Link from "next/link";

/*
 * Ported from the `isNotFound` block in Prototype with Admin.dc.html
 * (lines 184-196). This is Next.js's built-in `app/not-found.tsx`, not
 * a route of its own: it renders inside the root layout for any URL
 * that doesn't match a route (and later for whatever calls
 * `notFound()`).
 *
 * No <Nav /> here: the export's `chrome` flag (line 1886) lists the
 * screens that get the reader nav, and notFound isn't one of them —
 * it's a full-bleed takeover with its own way back.
 *
 * "Back to safety" and "Find something to read" are plain navigation
 * in the export (`goHomeFrom404`, `nav.search`), so both are real
 * links here rather than click handlers.
 */
export default function NotFound() {
  return (
    <>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "72px 24px" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 140,
            lineHeight: 0.82,
            color: "var(--color-accent)",
            textTransform: "uppercase",
          }}
        >
          404
        </div>
        <h1 style={{ fontSize: 44, margin: "14px 0 12px" }}>This page has gone missing</h1>
        <p style={{ fontSize: 16, maxWidth: 460 }}>
          The list or profile you were looking for has been deleted by whoever made it, so the
          link no longer points anywhere. Nothing has gone wrong at your end.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <Link
            href="/"
            className="btn btn-primary blueprint"
            style={{ padding: "13px 24px", fontSize: 16 }}
          >
            Back to safety
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
          </Link>
          <Link
            href="/search"
            className="btn btn-secondary"
            style={{ padding: "13px 24px", fontSize: 16 }}
          >
            Find something to read
          </Link>
        </div>
        <div
          className="mono"
          style={{ color: "var(--color-neutral-700)", marginTop: 34, lineHeight: 1.7 }}
        >
          ALSO SHOWN FOR: A DELETED ACCOUNT, A LIST SET BACK TO PRIVATE, A BOOK REMOVED FROM THE
          CATALOGUE.
        </div>
      </div>
    </>
  );
}
