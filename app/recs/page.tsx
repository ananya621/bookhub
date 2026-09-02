"use client";

import Link from "next/link";
import Nav from "@/components/Nav";
import { useSessionData } from "@/components/AuthProvider";
import { avg, starStr, reviewsFor, rankBooks, matchedOnLabel } from "@/lib/mock";

/*
 * Ported from the `isRecs` block in Prototype with Admin.dc.html
 * (lines 859-886).
 *
 * Previously always fell back to "every book, best-rated first" — it
 * had no access to survey data and its own comment said so. /home
 * genuinely scores against the survey; this now shares that same
 * function (lib/mock.ts's rankBooks/matchedOnLabel, extracted from what
 * used to be /home's own local recommend()) instead of duplicating a
 * second, fake version of it. The only real difference from /home:
 * this shows the full ranked list, not just the top 5.
 *
 * A client component now (it wasn't before) because survey data comes
 * from useSessionData(), the same fixture-context hook every other
 * reader page reads it from — this page just hadn't been wired to it.
 */
export default function RecsPage() {
  const sessionData = useSessionData();
  const survey = sessionData.survey;

  const recs = rankBooks(survey).map((book) => ({
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
          MATCHED ON: {matchedOnLabel(survey)} ·{" "}
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
