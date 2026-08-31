"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import Nav from "@/components/Nav";
import AdminNav from "@/components/AdminNav";
import { allGenres, allLevels, apiLibrary, catalogue, lengthLabel, requests } from "@/lib/mock";

type CatalogueBook = (typeof catalogue)[number];
type ApiBook = (typeof apiLibrary)[number];
type RequestItem = (typeof requests)[number];

type Draft = {
  title: string;
  author: string;
  pages: string;
  summary: string;
  series: boolean;
  genres: string[];
  level: string;
  cover: "api" | "upload" | null;
  subjects: string[];
  fulfilIndex: number;
  fulfil: boolean;
};

/*
 * Ported from the `isAdminCatalogue` block in Prototype with Admin
 * .dc.html (lines 274-423). Two modes in one screen: searching the
 * book API (`apiLibrary`) to import a title, and browsing/filtering
 * the existing `catalogue`.
 *
 * `subjectMap`/`mapSubjects` (source lines ~1580-1595) aren't exported
 * from lib/mock.ts, so they're reimplemented below verbatim — a
 * subject that names a reading level sets the level, anything else
 * becomes a genre.
 *
 * The "Search the API" button has no handler in the source either —
 * results are computed live from the query on every keystroke — so
 * it's kept as an inert button here rather than wired to a redundant
 * onClick.
 *
 * All of catalogue/draft/requests state below is local to this page
 * (no backend yet): importing, saving, and removing books only affect
 * this screen's own state, with a comment at each action.
 */

const SUBJECT_MAP: Record<string, string> = {
  "juvenile fiction": "Middle Grade",
  "young adult fiction": "Young Adult",
  "fantasy & magic": "Fantasy",
  fantasy: "Fantasy",
  dragons: "Fantasy",
  "action & adventure": "Adventure",
  "mystery & detective": "Mystery/Thriller",
  "horror tales": "Horror",
  "humorous stories": "Comedy/Humour",
  "historical fiction": "Historical Fiction",
  "social themes": "Realistic/Contemporary Fiction",
  "science fiction": "Sci-Fi",
};

function mapSubjects(subjects: string[]): { genres: string[]; level: string } {
  const genres: string[] = [];
  let level = "Middle Grade";
  subjects.forEach((s) => {
    const hit = SUBJECT_MAP[s.toLowerCase()];
    if (hit && (allLevels as readonly string[]).includes(hit)) level = hit;
    else if (hit && !genres.includes(hit)) genres.push(hit);
  });
  return { genres, level };
}

const CHIP_ON: CSSProperties = { background: "var(--color-link)", color: "#EFECE3", borderColor: "var(--color-text)" };
const CHIP_OFF: CSSProperties = { background: "transparent", color: "var(--color-text)", borderColor: "var(--color-text)" };

export default function AdminCataloguePage() {
  const [catalogueBooks, setCatalogueBooks] = useState<CatalogueBook[]>(catalogue);
  const [requestsList, setRequestsList] = useState<RequestItem[]>(requests);

  const [apiQuery, setApiQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState("");
  const [justAdded, setJustAdded] = useState<{ title: string; closed: boolean; cover: boolean } | null>(
    null
  );
  const [catFilter, setCatFilter] = useState("");

  const trimmedQuery = apiQuery.trim().toLowerCase();
  const matchesQuery = (x: ApiBook) => (x.title + " " + x.author).toLowerCase().includes(trimmedQuery);
  const apiMatches = trimmedQuery ? apiLibrary.filter(matchesQuery) : [];
  const hasApiResults = !!trimmedQuery && apiMatches.length > 0;
  const noApiResults = searched && trimmedQuery.length > 1 && apiMatches.length === 0;

  function startImport(src: ApiBook, fulfilIndex: number) {
    const m = mapSubjects(src.subjects);
    setDraft({
      title: src.title,
      author: src.author,
      pages: String(src.pages),
      series: src.series,
      summary: src.summary,
      genres: m.genres,
      level: m.level,
      cover: null,
      subjects: src.subjects,
      fulfilIndex,
      fulfil: true,
    });
    setDraftError("");
    setJustAdded(null);
  }

  function cancelImport() {
    setDraft(null);
    setDraftError("");
  }

  function toggleGenre(g: string) {
    setDraft((d) => (d ? { ...d, genres: d.genres.includes(g) ? d.genres.filter((x) => x !== g) : [...d.genres, g] } : d));
  }

  function saveBook() {
    if (!draft) return;
    if (!draft.title.trim()) {
      setDraftError("A BOOK NEEDS A TITLE");
      return;
    }
    if (draft.genres.length === 0) {
      setDraftError("GIVE IT AT LEAST ONE GENRE — RECOMMENDATIONS MATCH ON THESE");
      return;
    }
    const closed = draft.fulfilIndex > -1 && draft.fulfil;
    const title = draft.title.trim();
    setCatalogueBooks((cs) => [
      ...cs,
      {
        id: "c" + Date.now(),
        title,
        author: draft.author.trim(),
        pages: parseInt(draft.pages, 10) || 0,
        level: draft.level,
        genres: draft.genres,
        cover: draft.cover,
      },
    ]);
    if (closed) {
      setRequestsList((rs) =>
        rs.map((r, i) => (i === draft.fulfilIndex ? { ...r, status: "approved", reason: "" } : r))
      );
    }
    setJustAdded({ title, closed, cover: !!draft.cover });
    setDraft(null);
    setDraftError("");
  }

  const filteredCatalogue = catalogueBooks.filter(
    (c) => !catFilter || (c.title + " " + c.author).toLowerCase().includes(catFilter.toLowerCase())
  );

  return (
    <>
      <Nav />
      <Nav />
    <AdminNav />
      <div className="wrap">
        <h1 style={{ fontSize: 36, margin: "0 0 6px" }}>Catalogue</h1>
        <p style={{ fontSize: 14, marginBottom: 22 }}>
          Search the book API, import what you want, tag it and give it a cover. You never need a
          reader to ask first.
        </p>

        <div
          style={{
            border: "3px solid var(--color-text)",
            boxShadow: "5px 5px 0 var(--color-text)",
            padding: 18,
            marginBottom: 24,
          }}
        >
          <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 10 }}>
            STEP 1 — FIND IT IN THE API
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="input"
              style={{ flex: 1, minHeight: 46 }}
              placeholder="Try “dragon”, “rundell”, “skandar” or “nevermoor”"
              value={apiQuery}
              onChange={(e) => {
                setApiQuery(e.target.value);
                setSearched(true);
              }}
            />
            <button className="btn btn-primary" style={{ padding: "0 22px" }}>
              Search the API
            </button>
          </div>
          {hasApiResults && (
            <div style={{ borderTop: "3px solid var(--color-divider)", marginTop: 16 }}>
              {apiMatches.map((r) => {
                const already = catalogueBooks.some((c) => c.title.toLowerCase() === r.title.toLowerCase());
                const ri = requestsList.findIndex(
                  (req) => req.status === "pending" && req.title.toLowerCase() === r.title.toLowerCase()
                );
                const matchesRequest = ri > -1 && !already;
                return (
                  <div key={r.id} className="qrow" style={{ alignItems: "center" }}>
                    <div className="cover" style={{ width: 44, height: 64, flex: "none" }}>
                      <span className="mono">API</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17 }}>
                        {r.title}
                      </div>
                      <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 3 }}>
                        {(r.author + " · " + r.pages + " pages").toUpperCase()}
                      </div>
                      <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 3 }}>
                        API SUBJECTS: {r.subjects.join(", ").toUpperCase()}
                      </div>
                    </div>
                    {matchesRequest && (
                      <span className="tag" style={{ background: "#ff3d9a", color: "#14110f", flex: "none" }}>
                        Someone asked for this
                      </span>
                    )}
                    {already && (
                      <span className="tag" style={{ background: "#c6f24e", color: "#14110f", flex: "none" }}>
                        ✓ Already in catalogue
                      </span>
                    )}
                    {!already && (
                      <button
                        className="btn btn-primary"
                        style={{ flex: "none" }}
                        onClick={() => startImport(r, ri)}
                      >
                        Import
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {noApiResults && (
            <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 14 }}>
              NOTHING IN THE API FOR THAT — CHECK THE SPELLING, OR IT MAY NOT BE INDEXED.
            </div>
          )}
        </div>

        {draft && (
          <div
            style={{
              border: "3px solid var(--color-text)",
              boxShadow: "8px 8px 0 var(--color-accent)",
              padding: 20,
              marginBottom: 26,
            }}
          >
            <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 14 }}>
              STEP 2 — CHECK IT BEFORE IT GOES LIVE
            </div>
            {draft.fulfilIndex > -1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background: "#ff3d9a",
                  color: "#14110f",
                  border: "3px solid var(--color-text)",
                  padding: "12px 14px",
                  marginBottom: 18,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16 }}>
                    {requestsList[draft.fulfilIndex]?.title} was asked for by a reader
                  </div>
                  <div className="mono" style={{ fontWeight: 700, marginTop: 3 }}>
                    IMPORTING THIS CAN CLOSE THEIR REQUEST AND TELL THEM IT IS HERE
                  </div>
                </div>
                <label
                  className="radio"
                  style={{ flex: "none", border: "3px solid #14110f", padding: "8px 12px", minHeight: 44 }}
                >
                  <input
                    type="checkbox"
                    checked={draft.fulfil}
                    onChange={() => setDraft((d) => (d ? { ...d, fulfil: !d.fulfil } : d))}
                  />
                  <span className="dot" />
                  Mark it fulfilled
                </label>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 22 }}>
              <div>
                <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 8 }}>
                  COVER
                </div>
                {draft.cover ? (
                  <div className="cover" style={{ height: 240, border: "3px solid var(--color-text)" }}>
                    <span className="mono">
                      {draft.cover === "upload" ? "YOUR UPLOAD · STORED BY US" : "FROM THE API · COPIED TO OUR STORAGE"}
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      height: 240,
                      display: "grid",
                      placeItems: "center",
                      border: "3px dashed var(--color-neutral-600)",
                      background:
                        "repeating-linear-gradient(135deg, var(--color-neutral-300) 0 6px, transparent 6px 12px)",
                    }}
                  >
                    <span className="mono" style={{ color: "var(--color-neutral-700)" }}>
                      NO COVER YET
                    </span>
                  </div>
                )}
                <button
                  className="btn btn-secondary btn-block"
                  style={{ minHeight: 44 }}
                  onClick={() => setDraft((d) => (d ? { ...d, cover: "api" } : d))}
                >
                  Use the API cover
                </button>
                <button
                  className="btn btn-secondary btn-block"
                  style={{ minHeight: 44 }}
                  onClick={() => setDraft((d) => (d ? { ...d, cover: "upload" } : d))}
                >
                  Upload my own
                </button>
                {draft.cover && (
                  <button
                    className="btn btn-ghost"
                    style={{ minHeight: 44 }}
                    onClick={() => setDraft((d) => (d ? { ...d, cover: null } : d))}
                  >
                    Remove
                  </button>
                )}
                <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 10, lineHeight: 1.6 }}>
                  STORE THE IMAGE YOURSELF — API COVER URLS ROT, AND A WALL OF BROKEN COVERS IS WORSE
                  THAN NONE.
                </div>
              </div>
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div className="field">
                    <label>Title</label>
                    <input
                      className="input"
                      value={draft.title}
                      onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : d))}
                    />
                  </div>
                  <div className="field">
                    <label>Author</label>
                    <input
                      className="input"
                      value={draft.author}
                      onChange={(e) => setDraft((d) => (d ? { ...d, author: e.target.value } : d))}
                    />
                  </div>
                </div>
                <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 5 }}>
                  GENRES — MAPPED FROM THE API, CORRECT WHAT IS WRONG
                </div>
                <div className="mono" style={{ color: "var(--color-neutral-700)", marginBottom: 10 }}>
                  FROM: {draft.subjects.join(", ").toUpperCase()}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                  {allGenres.map((g) => (
                    <button
                      key={g}
                      className="tag"
                      style={draft.genres.includes(g) ? CHIP_ON : CHIP_OFF}
                      onClick={() => toggleGenre(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 14 }}>
                  <div>
                    <div
                      className="mono"
                      style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 6 }}
                    >
                      READING LEVEL — YOUR CALL, NOT THE API&apos;S
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {allLevels.map((l) => (
                        <button
                          key={l}
                          className="tag"
                          style={draft.level === l ? CHIP_ON : CHIP_OFF}
                          onClick={() => setDraft((d) => (d ? { ...d, level: l } : d))}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 8, lineHeight: 1.6 }}>
                      THE ONE FIELD NEVER TO TRUST THE API ON. THIS IS WHAT KEEPS ADULT TITLES OFF AN
                      11-YEAR-OLD&apos;S SCREEN.
                    </div>
                  </div>
                  <div>
                    <div className="field" style={{ marginBottom: 10 }}>
                      <label>Pages</label>
                      <input
                        className="input"
                        value={draft.pages}
                        onChange={(e) =>
                          setDraft((d) => (d ? { ...d, pages: e.target.value.replace(/\D/g, "") } : d))
                        }
                      />
                    </div>
                    <div className="mono" style={{ color: "var(--color-neutral-700)", lineHeight: 1.6 }}>
                      LENGTH BAND: {lengthLabel(parseInt(draft.pages, 10) || 0)} — WORKED OUT FROM THE
                      PAGE COUNT, NOT TYPED
                    </div>
                    <label
                      className="radio"
                      style={{ marginTop: 12, border: "3px solid var(--color-divider)", padding: "9px 12px", minHeight: 44 }}
                    >
                      <input
                        type="checkbox"
                        checked={draft.series}
                        onChange={() => setDraft((d) => (d ? { ...d, series: !d.series } : d))}
                      />
                      <span className="dot" />
                      Part of a series
                    </label>
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label>Summary</label>
                  <textarea
                    className="input"
                    style={{ minHeight: 80 }}
                    value={draft.summary}
                    onChange={(e) => setDraft((d) => (d ? { ...d, summary: e.target.value } : d))}
                  />
                </div>
                {draftError && (
                  <div className="mono" style={{ color: "var(--color-problem-text)", fontWeight: 700, marginBottom: 12 }}>
                    {draftError}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-primary" onClick={saveBook}>
                    Add to the catalogue
                  </button>
                  <button className="btn btn-secondary" onClick={cancelImport}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {justAdded && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: "#c6f24e",
              color: "#14110f",
              border: "3px solid var(--color-text)",
              boxShadow: "5px 5px 0 var(--color-text)",
              padding: "14px 16px",
              marginBottom: 24,
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontSize: 26, lineHeight: 1 }}>✓</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17 }}>
                &ldquo;{justAdded.title}&rdquo; is in the catalogue
              </div>
              <div className="mono" style={{ fontWeight: 700, marginTop: 3 }}>
                {justAdded.closed
                  ? "REQUEST CLOSED AND THE READER TOLD IT IS HERE"
                  : "NO REQUEST WAS WAITING — YOU ADDED IT YOURSELF"}
                {justAdded.cover ? "" : " · STILL NEEDS A COVER"}
              </div>
            </div>
            <button
              className="btn btn-secondary"
              style={{ borderColor: "#14110f", color: "#14110f" }}
              onClick={() => setJustAdded(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>In the catalogue</h2>
          <span className="mono" style={{ color: "var(--color-neutral-700)", flex: 1 }}>
            {catalogueBooks.length} BOOKS · {catalogueBooks.filter((c) => !c.cover).length} WITHOUT A
            COVER
          </span>
          <input
            className="input"
            style={{ width: 230 }}
            placeholder="Filter the catalogue"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          />
        </div>
        <div style={{ borderTop: "3px solid var(--color-text)" }}>
          {filteredCatalogue.map((c) => (
            <div key={c.id} className="qrow" style={{ alignItems: "center" }}>
              {c.cover ? (
                <div className="cover" style={{ width: 42, height: 62, flex: "none" }} />
              ) : (
                <div
                  style={{
                    width: 42,
                    height: 62,
                    flex: "none",
                    display: "grid",
                    placeItems: "center",
                    border: "3px dashed var(--color-neutral-600)",
                    background:
                      "repeating-linear-gradient(135deg, var(--color-neutral-300) 0 6px, transparent 6px 12px)",
                  }}
                >
                  <span className="mono" style={{ color: "var(--color-neutral-700)" }}>
                    !
                  </span>
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17 }}>
                  {c.title}
                </div>
                <div className="mono" style={{ color: "var(--color-neutral-700)", margin: "3px 0 6px" }}>
                  {(c.author + " · " + c.pages + " pages · " + c.level).toUpperCase()}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[...c.genres, lengthLabel(c.pages)].map((t) => (
                    <span key={t} className="tag tag-neutral">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              {!c.cover && (
                <button
                  className="btn btn-primary"
                  style={{ flex: "none" }}
                  onClick={() =>
                    setCatalogueBooks((cs) => cs.map((x) => (x.id === c.id ? { ...x, cover: "upload" } : x)))
                  }
                >
                  Add a cover
                </button>
              )}
              <button
                className="btn btn-secondary"
                style={{ flex: "none" }}
                onClick={() => {
                  // Removing here would land the book in Trash in the
                  // real app; there's no shared store yet, so this
                  // just drops it from this page's own list.
                  setCatalogueBooks((cs) => cs.filter((x) => x.id !== c.id));
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
