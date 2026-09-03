"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { allGenres, allLevels, lengthLabel } from "@/lib/mock";
import { guessGenres } from "@/lib/genre-mapping";
import { importBook, suggestFromGoogle, type ActionResult } from "@/app/actions/books";
import type { GoogleBook } from "@/lib/google-books";

/*
 * Ported from the `isCatalogue` block in Prototype Admin.dc.html — the
 * two-part "Step 1 — find it in the API" / "Step 2 — check it before it
 * goes live" flow (source lines 113-266). Rewritten from the old
 * AddBook.tsx, which only had step 1: picking a search result used to
 * fill hidden, uneditable fields instead of opening an editable draft.
 *
 * Also reachable from the request queue via "Find & import"
 * (?q=...&requestId=...) — see the export's note on the requests
 * screen: "the request closes when the book lands, not before." The
 * page looks the request up server-side and passes requestContext
 * down; when it's set, Step 2 shows the
 * "N people asked for this" banner and defaults to marking it fulfilled
 * on save.
 *
 * Simplification from the export: the export tries to match a specific
 * search result back to a specific request by title. Here, arriving
 * with a requestId means "the admin is here to fulfil this request" —
 * the banner shows regardless of which result they pick, or even for a
 * hand-typed entry. Simpler and no less correct for how this is
 * actually used (you only arrive with a requestId by clicking "Find &
 * import" on that exact request).
 */

type Draft = {
  title: string;
  author: string;
  pages: string;
  summary: string;
  genres: Set<string>;
  readingLevel: string;
  isSeries: boolean;
};

type CoverMode = "api" | "upload" | "none";

function draftFromGoogle(book: GoogleBook): Draft {
  return {
    title: book.title,
    author: book.author,
    pages: book.pages ? String(book.pages) : "",
    summary: book.summary ?? "",
    genres: new Set(guessGenres(book.categories)),
    readingLevel: allLevels[0],
    isSeries: false,
  };
}

const BLANK_DRAFT: Draft = {
  title: "",
  author: "",
  pages: "",
  summary: "",
  genres: new Set(),
  readingLevel: allLevels[0],
  isSeries: false,
};

export default function ImportBook({
  initialQuery = "",
  requestContext = null,
}: {
  initialQuery?: string;
  requestContext?: { requestId: string; askedBy: number } | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    importBook,
    undefined
  );

  const [open, setOpen] = useState(Boolean(initialQuery || requestContext));
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [searching, setSearching] = useState(() => initialQuery.trim().length >= 2);
  const [note, setNote] = useState("");

  // Step 2. `picked` is only set when the draft came from a Google
  // result — needed so "Use the API cover" and externalId have
  // something to refer back to. A hand-typed entry leaves it null.
  const [picked, setPicked] = useState<GoogleBook | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const [coverMode, setCoverMode] = useState<CoverMode>("none");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [fulfil, setFulfil] = useState(true);

  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // suggestFromGoogle() itself sets `searching`; this is only the part
  // that runs once the results (or a reason there aren't any) are back.
  function applySearchOutcome(outcome: Awaited<ReturnType<typeof suggestFromGoogle>>) {
    setSearching(false);
    setResults(outcome.books);
    setNote(
      "reason" in outcome
        ? outcome.reason === "no-key"
          ? "BOOK SEARCH ISN’T SET UP — TYPE THE DETAILS IN INSTEAD."
          : outcome.reason === "quota"
            ? "BOOK SEARCH IS BUSY — TRY AGAIN SHORTLY, OR TYPE THE DETAILS IN."
            : "COULDN’T REACH BOOK SEARCH — TYPE THE DETAILS IN INSTEAD."
        : outcome.books.length === 0
          ? "NOTHING IN THE API FOR THAT — CHECK THE SPELLING, OR IT MAY NOT BE INDEXED."
          : ""
    );
  }

  function runSearch(value: string) {
    setSearching(true);
    const mine = ++seq.current;
    suggestFromGoogle(value).then((outcome) => {
      if (seq.current === mine) applySearchOutcome(outcome);
    });
  }

  // Auto-search once when arriving via "Find & import" with a title
  // already in hand. `searching`'s initial value (not a setState call
  // here) covers the "search is in flight" state for that first render.
  useEffect(() => {
    if (initialQuery.trim().length < 2) return;
    const mine = ++seq.current;
    suggestFromGoogle(initialQuery).then((outcome) => {
      if (seq.current === mine) applySearchOutcome(outcome);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onQueryChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);

    if (value.trim().length < 2) {
      setResults([]);
      setSearching(false);
      setNote("");
      return;
    }

    setSearching(true);
    timer.current = setTimeout(() => runSearch(value), 500);
  }

  function startImportFromResult(book: GoogleBook) {
    setPicked(book);
    setDraft(draftFromGoogle(book));
    if (fileInput.current) fileInput.current.value = "";
    if (book.coverUrl) {
      setCoverMode("api");
      setCoverPreview(book.coverUrl);
    } else {
      setCoverMode("none");
      setCoverPreview(null);
    }
  }

  function startManualEntry() {
    setPicked(null);
    setDraft({ ...BLANK_DRAFT, genres: new Set() });
    if (fileInput.current) fileInput.current.value = "";
    setCoverMode("none");
    setCoverPreview(null);
  }

  function cancelImport() {
    setPicked(null);
    setDraft(null);
  }

  function toggleGenre(g: string) {
    setDraft((d) => {
      if (!d) return d;
      const genres = new Set(d.genres);
      if (genres.has(g)) genres.delete(g);
      else genres.add(g);
      return { ...d, genres };
    });
  }

  function useApiCover() {
    if (!picked?.coverUrl) return;
    if (fileInput.current) fileInput.current.value = "";
    setCoverMode("api");
    setCoverPreview(picked.coverUrl);
  }

  function onFileChosen(file: File | undefined) {
    if (!file) return;
    setCoverMode("upload");
    setCoverPreview(URL.createObjectURL(file));
  }

  function removeCover() {
    if (fileInput.current) fileInput.current.value = "";
    setCoverMode("none");
    setCoverPreview(null);
  }

  const added = state !== undefined && "ok" in state;
  const addedMessage =
    state !== undefined && "ok" in state
      ? state.ok === "added-and-fulfilled"
        ? "Added, and the request it was for is marked fulfilled."
        : state.ok === "added-unlinked"
          ? "Added — but the matching request couldn’t be marked fulfilled. Check the requests queue."
          : "Added to the catalogue."
      : "";

  if (!open) {
    return (
      <div style={{ marginBottom: 24 }}>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          Add a book
        </button>
        {added && (
          <span className="mono" style={{ marginLeft: 12, color: "var(--color-accent-700)" }}>
            {addedMessage.toUpperCase()}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {/* --- Step 1 — find it in the API --------------------------------- */}
      <div
        className="blueprint"
        style={{ padding: 18, marginBottom: 20, background: "var(--color-surface)" }}
      >
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />

        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
          <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, flex: 1 }}>
            STEP 1 — FIND IT IN THE API
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="input"
            style={{ flex: 1, minHeight: 46 }}
            placeholder='Try "dragon", "rundell" or "skandar"'
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            autoComplete="off"
          />
        </div>

        {searching && (
          <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 10 }}>
            SEARCHING…
          </div>
        )}
        {!searching && note && (
          <div className="mono" style={{ color: "var(--color-accent-700)", marginTop: 10 }}>
            {note}
          </div>
        )}

        {!searching && results.length > 0 && (
          <div style={{ borderTop: "3px solid var(--color-divider)", marginTop: 14 }}>
            {results.map((b) => (
              <div key={b.externalId} className="qrow" style={{ alignItems: "center" }}>
                {b.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.coverUrl}
                    alt=""
                    style={{ width: 40, height: 58, objectFit: "cover", flex: "none", border: "3px solid var(--color-text)" }}
                  />
                ) : (
                  <span className="cover" style={{ width: 40, height: 58, flex: "none" }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16 }}>
                    {b.title}
                  </div>
                  <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 3 }}>
                    {(b.author || "unknown author").toUpperCase()}
                    {b.pages ? ` · ${b.pages} PAGES` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: "none" }}
                  onClick={() => startImportFromResult(b)}
                >
                  Import
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="btn btn-ghost"
          style={{ marginTop: 12 }}
          onClick={startManualEntry}
        >
          Can’t find it — type the details in by hand
        </button>
      </div>

      {/* --- Step 2 — check it before it goes live ----------------------- */}
      {draft && (
        <div
          style={{
            border: "3px solid var(--color-text)",
            boxShadow: "8px 8px 0 var(--color-accent)",
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 14 }}>
            STEP 2 — CHECK IT BEFORE IT GOES LIVE
          </div>

          {requestContext && (
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
                  {requestContext.askedBy} {requestContext.askedBy === 1 ? "person" : "people"} asked
                  for this
                </div>
                <div className="mono" style={{ fontWeight: 700, marginTop: 3 }}>
                  IMPORTING THIS CAN CLOSE THEIR REQUEST AND TELL THEM IT IS HERE
                </div>
              </div>
              <label
                className="radio"
                style={{ flex: "none", border: "3px solid #14110f", padding: "8px 12px", minHeight: 44 }}
              >
                <input type="checkbox" checked={fulfil} onChange={(e) => setFulfil(e.target.checked)} />
                <span className="dot" />
                Mark it fulfilled
              </label>
            </div>
          )}

          <form action={formAction}>
            <input type="hidden" name="externalId" value={picked?.externalId ?? ""} />
            <input type="hidden" name="coverMode" value={coverMode} />
            <input type="hidden" name="apiCoverUrl" value={picked?.coverUrl ?? ""} />
            {requestContext && (
              <>
                <input type="hidden" name="requestId" value={requestContext.requestId} />
                <input type="hidden" name="fulfilRequest" value={fulfil ? "on" : ""} />
              </>
            )}
            {draft.genres.size > 0 &&
              [...draft.genres].map((g) => <input key={g} type="hidden" name="genres" value={g} />)}
            <input type="hidden" name="isSeries" value={draft.isSeries ? "on" : ""} />

            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 22 }}>
              {/* --- Cover --- */}
              <div>
                <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 8 }}>
                  COVER
                </div>
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverPreview}
                    alt=""
                    style={{
                      width: "100%",
                      height: 250,
                      objectFit: "cover",
                      border: "3px solid var(--color-text)",
                      marginBottom: 8,
                    }}
                  />
                ) : (
                  <div
                    className="cover"
                    style={{ height: 250, marginBottom: 8 }}
                  >
                    <span className="mono">NO COVER YET</span>
                  </div>
                )}

                <input
                  ref={fileInput}
                  type="file"
                  name="coverFile"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => onFileChosen(e.target.files?.[0])}
                />

                {picked?.coverUrl && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    style={{ minHeight: 44 }}
                    onClick={useApiCover}
                  >
                    Use the API cover
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  style={{ minHeight: 44 }}
                  onClick={() => fileInput.current?.click()}
                >
                  Upload my own
                </button>
                {coverPreview && (
                  <button type="button" className="btn btn-ghost" style={{ minHeight: 44 }} onClick={removeCover}>
                    Remove
                  </button>
                )}
                <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 10, lineHeight: 1.6 }}>
                  STORE THE IMAGE YOURSELF — API COVER URLS ROT, AND A WALL OF BROKEN COVERS IS WORSE THAN NONE.
                </div>
              </div>

              {/* --- Fields --- */}
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div className="field">
                    <label htmlFor="draft-title">Title</label>
                    <input
                      id="draft-title"
                      name="title"
                      className="input"
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="draft-author">Author</label>
                    <input
                      id="draft-author"
                      name="author"
                      className="input"
                      value={draft.author}
                      onChange={(e) => setDraft({ ...draft, author: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 5 }}>
                  GENRES — MAPPED FROM THE API, CORRECT WHAT IS WRONG
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                  {allGenres.map((g) => {
                    const on = draft.genres.has(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        className={on ? "tag tag-select" : "tag tag-outline"}
                        onClick={() => toggleGenre(g)}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 14 }}>
                  <div>
                    <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 6 }}>
                      READING LEVEL — YOUR CALL, NOT THE API’S
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {allLevels.map((l) => (
                        <button
                          key={l}
                          type="button"
                          className={draft.readingLevel === l ? "tag tag-select" : "tag tag-outline"}
                          onClick={() => setDraft({ ...draft, readingLevel: l })}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <input type="hidden" name="readingLevel" value={draft.readingLevel} />
                    <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 8, lineHeight: 1.6 }}>
                      THE ONE FIELD NEVER TO TRUST THE API ON. THIS IS WHAT KEEPS ADULT TITLES OFF AN
                      11-YEAR-OLD’S SCREEN.
                    </div>
                  </div>
                  <div>
                    <div className="field" style={{ marginBottom: 10 }}>
                      <label htmlFor="draft-pages">Pages</label>
                      <input
                        id="draft-pages"
                        name="pages"
                        type="number"
                        className="input"
                        value={draft.pages}
                        onChange={(e) => setDraft({ ...draft, pages: e.target.value })}
                      />
                    </div>
                    <div className="mono" style={{ color: "var(--color-neutral-700)", lineHeight: 1.6 }}>
                      LENGTH BAND: {draft.pages ? lengthLabel(Number(draft.pages)).toUpperCase() : "—"} — WORKED
                      OUT FROM THE PAGE COUNT, NOT TYPED
                    </div>
                    <label
                      className="radio"
                      style={{ marginTop: 12, border: "3px solid var(--color-divider)", padding: "9px 12px", minHeight: 44 }}
                    >
                      <input
                        type="checkbox"
                        checked={draft.isSeries}
                        onChange={(e) => setDraft({ ...draft, isSeries: e.target.checked })}
                      />
                      <span className="dot" />
                      Part of a series
                    </label>
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 14 }}>
                  <label htmlFor="draft-summary">Summary</label>
                  <textarea
                    id="draft-summary"
                    name="summary"
                    className="input"
                    style={{ minHeight: 80 }}
                    value={draft.summary}
                    onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                  />
                </div>

                {state !== undefined && "error" in state && (
                  <div className="mono" style={{ color: "var(--color-problem-text)", fontWeight: 700, marginBottom: 12 }}>
                    {state.error}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" className="btn btn-primary" disabled={pending}>
                    {pending ? "Adding…" : "Add to the catalogue"}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={cancelImport}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
