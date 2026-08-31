"use client";

import Link from "next/link";
import { useState } from "react";
import Nav from "@/components/Nav";
import { books, allGenres, allLengths, allLevels, avg, starStr, reviewsFor, lengthLabel } from "@/lib/mock";

/*
 * Ported from the `isSearch` block in Prototype with Admin.dc.html
 * (lines 887-965). Filter/sort/paginate logic is lifted from the
 * `results` computation in `renderVals()` (~lines 1849-1856 and
 * 2016-2025): filter by query/genre/length/level, sort by review
 * count descending, five results per page.
 *
 * The source also shows a reading-status badge on each result
 * (`b.hasBadge`/`badgeLabel`, from `decorate()`), sourced from a
 * global reading-tracker state (`statusOf`). That state isn't shared
 * across pages in this port — the tracker screen keeps its own local
 * state and is out of scope here — so the badge is left off rather
 * than invented.
 *
 * Filter checkboxes, the query box and pagination are real
 * within-screen interactivity, so this is a client component.
 */
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [fGenres, setFGenres] = useState<string[]>([]);
  const [fLengths, setFLengths] = useState<string[]>([]);
  const [fLevels, setFLevels] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : list.concat(value));
    setPage(0);
  }

  const q = query.trim().toLowerCase();
  const results = books
    .filter(
      (b) =>
        (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) &&
        (!fGenres.length || b.genres.some((g) => fGenres.includes(g))) &&
        (!fLengths.length || fLengths.includes(lengthLabel(b.pages))) &&
        (!fLevels.length || fLevels.includes(b.level))
    )
    .sort((a, b) => reviewsFor(b).length - reviewsFor(a).length);

  const pageResults = results.slice(page * 5, page * 5 + 5);
  const noResults = results.length === 0;
  const manyResults = results.length > 5;
  const resultPageLabel = `PAGE ${page + 1} OF ${Math.max(1, Math.ceil(results.length / 5))}`;
  const resultCount = `${results.length}${query ? ` RESULTS FOR "${query.toUpperCase()}"` : " BOOKS"}`;

  function clearFilters() {
    setFGenres([]);
    setFLengths([]);
    setFLevels([]);
    setQuery("");
    setPage(0);
  }

  return (
    <>
      <Nav />
      <div className="wrap">
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
          <button type="button" className="btn btn-primary" style={{ padding: "0 24px" }}>
            Search
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 32 }}>
          <div>
            <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 12 }}>
              FILTERS
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 15, marginBottom: 6 }}>Genre</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
              {allGenres.map((g) => (
                <label key={g} className="radio">
                  <input type="checkbox" checked={fGenres.includes(g)} onChange={() => toggle(fGenres, setFGenres, g)} />
                  <span className="dot" />
                  {g}
                </label>
              ))}
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 15, marginBottom: 6 }}>Length</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
              {allLengths.map((l) => (
                <label key={l} className="radio">
                  <input type="checkbox" checked={fLengths.includes(l)} onChange={() => toggle(fLengths, setFLengths, l)} />
                  <span className="dot" />
                  {l}
                </label>
              ))}
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 15, marginBottom: 6 }}>Reading level</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {allLevels.map((l) => (
                <label key={l} className="radio">
                  <input type="checkbox" checked={fLevels.includes(l)} onChange={() => toggle(fLevels, setFLevels, l)} />
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <span className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
                {resultCount}
              </span>
              <span className="mono" style={{ color: "var(--color-accent-700)" }}>
                SORT: MOST REVIEWED
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
                    className="cover rowlink"
                    style={{ width: 68, height: 100, flex: "none", color: "inherit" }}
                  >
                    <span className="mono">COVER</span>
                  </Link>
                  <Link
                    href={`/book/${b.id}`}
                    className="rowlink"
                    style={{ flex: 1, color: "inherit", fontWeight: "normal" }}
                  >
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>{b.title}</div>
                    <div
                      className="mono"
                      style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginBottom: 6 }}
                    >
                      {`${b.author} · ${b.pages} pages`.toUpperCase()}
                    </div>
                    <p style={{ fontSize: 13, marginBottom: 8 }}>{b.summary}</p>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span className="stars" style={{ fontSize: 13 }}>
                        {starStr(avg(b))}
                      </span>
                      {b.genres
                        .concat([b.level, lengthLabel(b.pages)])
                        .concat(b.series ? ["Part of a series"] : [])
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
                <button type="button" className="btn btn-secondary" onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  ← Previous
                </button>
                <span className="mono" style={{ color: "var(--color-neutral-700)", flex: 1 }}>
                  {resultPageLabel} · FIVE BOOKS A PAGE
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPage((p) => ((p + 1) * 5 < results.length ? p + 1 : p))}
                >
                  Next →
                </button>
              </div>
            )}
            {noResults && (
              <div style={{ border: "1px dashed var(--color-divider)", padding: 30, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 21 }}>No books matched</div>
                <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 14px" }}>
                  Try fewer filters, or ask us to add the book.
                </p>
                <Link href="/requests" className="btn btn-secondary">
                  Request a missing book
                </Link>
              </div>
            )}
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
                  Couldn&apos;t find the book you wanted?
                </div>
                <p className="text-muted" style={{ fontSize: 13, margin: "2px 0 0" }}>
                  Tell us and we&apos;ll look it up by hand.
                </p>
              </div>
              <Link href="/requests" className="btn btn-secondary">
                Request it
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
