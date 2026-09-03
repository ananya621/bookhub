"use client";

import Link from "next/link";
import { matchedOnLabel, type Survey } from "@/lib/mock";
import { rankCatalogueBooks, type CatalogueBook } from "@/lib/catalogue";

export default function RecsList({ books, survey }: { books: CatalogueBook[]; survey: Survey | null }) {
  const recs = rankCatalogueBooks(books, survey);
  const emptyCatalogue = books.length === 0;
  const nothingMatched = !emptyCatalogue && recs.length === 0;

  return (
    <>
      <h1 style={{ fontSize: 36, margin: "0 0 4px" }}>Recommendations</h1>
      <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 24 }}>
        MATCHED ON: {matchedOnLabel(survey)} ·{" "}
        <Link href="/survey" style={{ cursor: "pointer" }}>
          EDIT MY ANSWERS
        </Link>
      </div>

      {recs.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {recs.map((book) => (
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
              {book.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.coverUrl}
                  alt=""
                  style={{ aspectRatio: "2/3", objectFit: "cover", width: "100%", border: "3px solid var(--color-text)" }}
                />
              ) : (
                <div className="cover" style={{ aspectRatio: "2/3" }}>
                  <span className="mono">COVER</span>
                </div>
              )}
              <div className="card-title">{book.title}</div>
              <div className="card-meta">{book.author}</div>
              <span className="mono text-muted">NO REVIEWS YET</span>
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
      )}

      {emptyCatalogue && (
        <div style={{ border: "1px dashed var(--color-divider)", padding: 30, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 21 }}>There are no books here yet</div>
          <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 14px" }}>
            Every book is added by hand, so the shelf starts empty. Ask for the first one.
          </p>
          <Link href="/requests/new" className="btn btn-primary">
            Suggest a book
          </Link>
        </div>
      )}

      {nothingMatched && (
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
    </>
  );
}
