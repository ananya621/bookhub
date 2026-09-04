"use client";

import Link from "next/link";
import BookCover from "@/components/BookCover";
import { matchedOnLabel, starStr, type Survey } from "@/lib/mock";
import { rankCatalogueBooks, type CatalogueBook } from "@/lib/catalogue";

export default function RecsList({
  books,
  survey,
}: {
  books: CatalogueBook[];
  survey: Survey | null;
}) {
  const recs = rankCatalogueBooks(books, survey);
  const emptyCatalogue = books.length === 0;
  const nothingMatched = !emptyCatalogue && recs.length === 0;

  return (
    <>
      <h1 style={{ fontSize: 36, margin: "0 0 4px" }}>Recommendations</h1>
      <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 8 }}>
        MATCHED ON: {matchedOnLabel(survey)} ·{" "}
        <Link href="/survey" style={{ cursor: "pointer" }}>
          EDIT MY ANSWERS
        </Link>
      </div>
      <p className="text-muted" style={{ fontSize: 13, maxWidth: 620, marginBottom: 24 }}>
        Each book here gets a point for every one of your answers it matches — genre, reading
        level, length — then they&apos;re sorted by that score, highest first, with better-rated
        books breaking any tie. A book doesn&apos;t need to match everything to show up, and if
        nothing matches closely, you&apos;ll see the catalogue&apos;s highest-rated books instead.
      </p>

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
              <BookCover src={book.coverUrl} />
              <div className="card-title">{book.title}</div>
              <div className="card-meta">{book.author}</div>
              {book.avgStars != null ? (
                <span className="stars">{starStr(book.avgStars)}</span>
              ) : (
                <span className="mono text-muted">NO REVIEWS YET</span>
              )}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {book.genres.map((t) => (
                  <span key={t} className="tag tag-genre">
                    {t}
                  </span>
                ))}
                {book.readingLevel && (
                  <span className="tag tag-neutral">{book.readingLevel}</span>
                )}
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
