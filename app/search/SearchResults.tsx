"use client";

import Link from "next/link";
import { useState } from "react";
import Sheet from "@/components/Sheet";
import { allGenres, allLengths, allLevels, lengthLabel } from "@/lib/mock";

/*
 * The search box, the filters and the results list. Split out from the
 * page so the page can stay a server component and read the catalogue
 * from the database.
 *
 * Filtering happens here rather than in the query because the whole
 * catalogue is already loaded — every book was approved by hand, so
 * there are not many — and this keeps typing instant.
 *
 * "Suggest a book" appears in two places on purpose. Once in the empty
 * state, which is obvious, and once permanently at the bottom, because
 * finding five books that are not the one you wanted is just as much a
 * dead end as finding none.
 */

export type CatalogueBook = {
  id: string;
  title: string;
  author: string;
  pages: number | null;
  summary: string | null;
  coverUrl: string | null;
  genres: string[];
  readingLevel: string;
  isSeries: boolean;
};

const PER_PAGE = 5;

export default function SearchResults({ books }: { books: CatalogueBook[] }) {
  const [query, setQuery] = useState("");
  const [fGenres, setFGenres] = useState<string[]>([]);
  const [fLengths, setFLengths] = useState<string[]>([]);
  const [fLevels, setFLevels] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : list.concat(value));
    setPage(0);
  }

  const q = query.trim().toLowerCase();
  const results = books.filter(
    (b) =>
      (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) &&
      (!fGenres.length || b.genres.some((g) => fGenres.includes(g))) &&
      // Length filters are bands, and a book with no page count can't be
      // placed in one, so it drops out rather than being guessed at.
      (!fLengths.length || (b.pages !== null && fLengths.includes(lengthLabel(b.pages)))) &&
      (!fLevels.length || fLevels.includes(b.readingLevel))
  );

  const pageResults = results.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const emptyCatalogue = books.length === 0;
  const noResults = !emptyCatalogue && results.length === 0;
  const manyResults = results.length > PER_PAGE;
  const resultPageLabel = `PAGE ${page + 1} OF ${Math.max(1, Math.ceil(results.length / PER_PAGE))}`;
  const plural = results.length === 1 ? "BOOK" : "BOOKS";
  const resultCount = query
    ? `${results.length} ${results.length === 1 ? "RESULT" : "RESULTS"} FOR "${query.toUpperCase()}"`
    : `${results.length} ${plural}`;

  function clearFilters() {
    setFGenres([]);
    setFLengths([]);
    setFLevels([]);
    setQuery("");
    setPage(0);
  }

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <input
          className="input"
          style={{ flex: 1, minHeight: 44 }}
          placeholder="Search by title or author"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
        {/* Mobile: opens the same filters as a bottom sheet instead of
            the always-visible column desktop uses. */}
        <button
          type="button"
          className="btn btn-secondary mobile-only"
          style={{ flex: "none", minHeight: 44 }}
          onClick={() => setFilterSheetOpen(true)}
        >
          Filters{(fGenres.length + fLengths.length + fLevels.length) > 0 && ` (${fGenres.length + fLengths.length + fLevels.length})`}
        </button>
      </div>

      <Sheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Filters"
      >
        <div className="mono" style={{ color: "var(--color-neutral-700)", marginBottom: 8 }}>GENRE</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {allGenres.map((g) => (
            <button
              key={g}
              type="button"
              className={fGenres.includes(g) ? "chip on" : "chip"}
              onClick={() => toggle(fGenres, setFGenres, g)}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="mono" style={{ color: "var(--color-neutral-700)", marginBottom: 8 }}>LENGTH</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {allLengths.map((l) => (
            <button
              key={l}
              type="button"
              className={fLengths.includes(l) ? "chip on" : "chip"}
              onClick={() => toggle(fLengths, setFLengths, l)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="mono" style={{ color: "var(--color-neutral-700)", marginBottom: 8 }}>READING LEVEL</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {allLevels.map((l) => (
            <button
              key={l}
              type="button"
              className={fLevels.includes(l) ? "chip on" : "chip"}
              onClick={() => toggle(fLevels, setFLevels, l)}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ minHeight: 52 }}
          onClick={() => setFilterSheetOpen(false)}
        >
          Show {results.length}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          style={{ minHeight: 48, marginTop: 8 }}
          onClick={clearFilters}
        >
          Clear everything
        </button>
      </Sheet>

      <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 32 }}>
        <div className="desktop-only">
          <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 12 }}>
            FILTERS
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 15, marginBottom: 6 }}>Genre</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
            {allGenres.map((g) => (
              <label key={g} className="radio">
                <input
                  type="checkbox"
                  checked={fGenres.includes(g)}
                  onChange={() => toggle(fGenres, setFGenres, g)}
                />
                <span className="dot" />
                {g}
              </label>
            ))}
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 15, marginBottom: 6 }}>Length</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
            {allLengths.map((l) => (
              <label key={l} className="radio">
                <input
                  type="checkbox"
                  checked={fLengths.includes(l)}
                  onChange={() => toggle(fLengths, setFLengths, l)}
                />
                <span className="dot" />
                {l}
              </label>
            ))}
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 15, marginBottom: 6 }}>
            Reading level
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {allLevels.map((l) => (
              <label key={l} className="radio">
                <input
                  type="checkbox"
                  checked={fLevels.includes(l)}
                  onChange={() => toggle(fLevels, setFLevels, l)}
                />
                <span className="dot" />
                {l}
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" style={{ marginTop: 16 }} onClick={clearFilters}>
            Clear all filters
          </button>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 14,
            }}
          >
            <span
              className="mono"
              style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}
            >
              {resultCount}
            </span>
            <span className="mono" style={{ color: "var(--color-accent-700)" }}>
              SORT: NEWEST FIRST
            </span>
          </div>

          <div style={{ borderTop: "1px solid var(--color-divider)" }}>
            {pageResults.map((b) => (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  gap: 16,
                  padding: "16px 0",
                  borderBottom: "1px solid color-mix(in srgb, var(--color-text) 9%, transparent)",
                }}
              >
                <Link
                  href={`/book/${b.id}`}
                  className="rowlink"
                  style={{ width: 68, flex: "none", color: "inherit" }}
                >
                  {b.coverUrl ? (
                    // Google's URLs, not files we hold, so there is nothing
                    // for next/image to optimise and it would need every
                    // Google host allow-listed in next.config.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.coverUrl}
                      alt=""
                      width={68}
                      style={{ border: "3px solid var(--color-text)", display: "block" }}
                    />
                  ) : (
                    <span className="cover" style={{ width: 68, height: 100, display: "grid" }}>
                      <span className="mono">COVER</span>
                    </span>
                  )}
                </Link>
                <Link
                  href={`/book/${b.id}`}
                  className="rowlink"
                  style={{ flex: 1, color: "inherit", fontWeight: "normal" }}
                >
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>{b.title}</div>
                  <div
                    className="mono"
                    style={{
                      color: "color-mix(in srgb, var(--color-text) 55%, transparent)",
                      marginBottom: 6,
                    }}
                  >
                    {[b.author || "unknown author", b.pages ? `${b.pages} pages` : null]
                      .filter(Boolean)
                      .join(" · ")
                      .toUpperCase()}
                  </div>
                  {b.summary && (
                    <p style={{ fontSize: 13, marginBottom: 8 }}>
                      {b.summary.length > 220 ? `${b.summary.slice(0, 220)}…` : b.summary}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {b.genres
                      .concat(b.readingLevel ? [b.readingLevel] : [])
                      .concat(b.pages !== null ? [lengthLabel(b.pages)] : [])
                      .concat(b.isSeries ? ["Part of a series"] : [])
                      .map((t) => (
                        <span key={t} className="tag tag-neutral">
                          {t}
                        </span>
                      ))}
                  </div>
                </Link>
                <div style={{ alignSelf: "center", flex: "none", textAlign: "right" }}>
                  <Link href={`/book/${b.id}`} className="btn btn-secondary">
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {manyResults && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Previous
              </button>
              <span className="mono" style={{ color: "var(--color-neutral-700)", flex: 1 }}>
                {resultPageLabel} · FIVE BOOKS A PAGE
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPage((p) => ((p + 1) * PER_PAGE < results.length ? p + 1 : p))}
              >
                Next →
              </button>
            </div>
          )}

          {emptyCatalogue && (
            <div style={{ border: "1px dashed var(--color-divider)", padding: 30, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 21 }}>
                There are no books here yet
              </div>
              <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 14px" }}>
                Every book is added by hand, so the shelf starts empty. Ask for
                the first one.
              </p>
              <Link href="/requests/new" className="btn btn-primary">
                Suggest a book
              </Link>
            </div>
          )}

          {noResults && (
            <div style={{ border: "1px dashed var(--color-divider)", padding: 30, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 21 }}>No books matched</div>
              <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 14px" }}>
                Try fewer filters, or ask us to add the book.
              </p>
              <Link href="/requests/new" className="btn btn-secondary">
                Suggest a book
              </Link>
            </div>
          )}

          {/* Always here, not just when nothing matched. Finding five books
              that are not the one you wanted is as much a dead end as
              finding none. */}
          {!emptyCatalogue && (
            <div
              style={{
                border: "1px dashed var(--color-divider)",
                padding: 16,
                marginTop: 20,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 17 }}>
                  Not what you were looking for?
                </div>
                <p className="text-muted" style={{ fontSize: 13, margin: "2px 0 0" }}>
                  Search for it and we&apos;ll add it if it&apos;s right for the site.
                </p>
              </div>
              <Link href="/requests/new" className="btn btn-secondary">
                Suggest a book
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
