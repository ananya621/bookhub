import Link from "next/link";
import Nav from "@/components/Nav";
import { books, avg, starStr, reviewsFor } from "@/lib/mock";

/*
 * Ported from the `isRecs` block in Prototype with Admin.dc.html
 * (lines 859-886).
 *
 * The source scores every book against the reader's survey answers
 * (genres/level/length) and falls back to the whole catalogue sorted
 * by rating when nothing scores above zero (renderVals(), ~line 1847
 * and the `recBooks` assignment at ~line 1849). Survey answers live in
 * the survey screen's own local state and aren't shared across pages
 * in this port, so there's nothing here to score against — this page
 * always takes that same fallback path: every book, best-rated first.
 * "MATCHED ON" shows a generic label instead of inventing specific
 * survey answers; wire it to real answers once survey state is shared
 * across routes.
 *
 * No interactivity on this screen beyond navigation, so it stays a
 * server component.
 */
export default function RecsPage() {
  const recs = books
    .slice()
    .sort((a, b) => avg(b) - avg(a))
    .map((book) => ({
      book,
      starStr: starStr(avg(book)),
      ratingStr: `${avg(book).toFixed(1)} · ${reviewsFor(book).length} REVIEWS`,
    }));
  const noRecs = recs.length === 0;

  return (
    <>
      <Nav />
      <div className="wrap">
        <h1 style={{ fontSize: 36, margin: "0 0 4px" }}>Recommendations</h1>
        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 24 }}>
          MATCHED ON: YOUR SURVEY ANSWERS ·{" "}
          <Link href="/survey" style={{ cursor: "pointer" }}>
            EDIT MY ANSWERS
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {recs.map(({ book, starStr: stars, ratingStr }) => (
            <Link
              key={book.id}
              href={`/book/${book.id}`}
              className="card blueprint rowlink"
              style={{ gap: 10, color: "inherit" }}
            >
              <i className="corner tl" />
              <i className="corner tr" />
              <i className="corner bl" />
              <i className="corner br" />
              <div className="cover" style={{ aspectRatio: "2/3" }}>
                <span className="mono">COVER</span>
              </div>
              <div className="card-title">{book.title}</div>
              <div className="card-meta">{book.author}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="stars" style={{ fontSize: 13 }}>
                  {stars}
                </span>
                <span className="mono text-muted">{ratingStr}</span>
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {book.genres.map((t) => (
                  <span key={t} className="tag tag-accent">
                    {t}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
        {noRecs && (
          <div style={{ border: "1px dashed var(--color-divider)", padding: 30, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 21 }}>Nothing matched exactly</div>
            <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 14px" }}>
              Widen your answers and we&apos;ll try again.
            </p>
            <Link href="/survey" className="btn btn-secondary">
              Edit my answers
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
