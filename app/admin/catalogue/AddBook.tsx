"use client";

import { useActionState, useRef, useState } from "react";
import { allGenres, allLevels } from "@/lib/mock";
import { suggestFromGoogle, addBookDirectly, type ActionResult } from "@/app/actions/books";
import type { GoogleBook } from "@/lib/google-books";

/*
 * Adding a book straight to the catalogue, with no request and no
 * queue. For when an admin already knows what they want to add.
 *
 * Same Google search as the reader's suggest form, so the details come
 * across filled in. Typing it all in by hand still works for books
 * Google does not have.
 *
 * This skips the queue, not the check. The genres and reading level are
 * still chosen by hand, because that is the moment someone decides who
 * a book is for — and it is the only such moment on this path.
 *
 * Only admins can reach this, and the database enforces that
 * separately: the insert policy on `books` tests is_admin(), so calling
 * the action directly gets you nowhere.
 */
export default function AddBook() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    addBookDirectly,
    undefined
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [picked, setPicked] = useState<GoogleBook | null>(null);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState("");

  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onQueryChange(value: string) {
    setQuery(value);
    setPicked(null);
    if (timer.current) clearTimeout(timer.current);

    if (value.trim().length < 2) {
      setResults([]);
      setSearching(false);
      setNote("");
      return;
    }

    setSearching(true);
    const mine = ++seq.current;
    timer.current = setTimeout(async () => {
      const outcome = await suggestFromGoogle(value);
      if (seq.current !== mine) return;
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
            ? "NOTHING MATCHED, OR IT IS ALREADY IN THE CATALOGUE."
            : ""
      );
    }, 500);
  }

  const added = state !== undefined && "ok" in state;

  if (!open) {
    return (
      <div style={{ marginBottom: 24 }}>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          Add a book directly
        </button>
        {added && (
          <span className="mono" style={{ marginLeft: 12, color: "var(--color-accent-700)" }}>
            ADDED.
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="blueprint"
      style={{ padding: 20, marginBottom: 24, background: "var(--color-surface)" }}
    >
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, flex: 1 }}>
          Add a book directly
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>

      <p className="mono" style={{ color: "var(--color-neutral-700)", marginBottom: 14, lineHeight: 1.6 }}>
        THIS SKIPS THE REQUEST QUEUE. IT GOES STRAIGHT ON THE SHELF WHERE
        READERS WILL SEE IT.
      </p>

      <div className="field" style={{ marginBottom: 8 }}>
        <label htmlFor="adminq">Search for it</label>
        <input
          id="adminq"
          className="input"
          style={{ minHeight: 42 }}
          placeholder="Title, or title and author"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          autoComplete="off"
        />
      </div>

      {searching && (
        <div className="mono" style={{ color: "var(--color-neutral-700)", marginBottom: 10 }}>
          SEARCHING…
        </div>
      )}
      {!searching && note && (
        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 10 }}>
          {note}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ borderTop: "3px solid var(--color-text)", marginBottom: 14 }}>
          {results.map((b) => {
            const isPicked = picked?.externalId === b.externalId;
            return (
              <button
                key={b.externalId}
                type="button"
                onClick={() => setPicked(isPicked ? null : b)}
                className="rowlink"
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 6px",
                  background: isPicked ? "var(--color-accent-100)" : "transparent",
                  border: 0,
                  borderBottom: "3px solid var(--color-divider)",
                  cursor: "pointer",
                }}
              >
                {b.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.coverUrl}
                    alt=""
                    width={34}
                    style={{ flex: "none", border: "3px solid var(--color-text)" }}
                  />
                ) : (
                  <span className="cover" style={{ width: 34, height: 50, flex: "none" }} />
                )}
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontFamily: "var(--font-heading)", fontWeight: 700 }}>
                    {b.title}
                  </span>
                  <span className="mono" style={{ display: "block", color: "var(--color-neutral-700)" }}>
                    {(b.author || "unknown author").toUpperCase()}
                    {b.pages ? ` · ${b.pages} PAGES` : ""}
                  </span>
                </span>
                {isPicked && <span className="tag tag-done">Picked</span>}
              </button>
            );
          })}
        </div>
      )}

      <form action={formAction}>
        {picked ? (
          <>
            <input type="hidden" name="externalId" value={picked.externalId} />
            <input type="hidden" name="title" value={picked.title} />
            <input type="hidden" name="author" value={picked.author} />
            <input type="hidden" name="pages" value={picked.pages ?? ""} />
            <input type="hidden" name="summary" value={picked.summary ?? ""} />
            <input type="hidden" name="coverUrl" value={picked.coverUrl ?? ""} />
          </>
        ) : (
          <>
            <div className="field" style={{ marginBottom: 10 }}>
              <label htmlFor="mtitle">Title</label>
              <input id="mtitle" name="title" className="input" style={{ minHeight: 40 }} />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label htmlFor="mauthor">Author</label>
              <input id="mauthor" name="author" className="input" style={{ minHeight: 40 }} />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="mpages">Pages</label>
              <input id="mpages" name="pages" type="number" className="input" style={{ minHeight: 40 }} />
            </div>
          </>
        )}

        <div className="mono" style={{ color: "var(--color-neutral-700)", marginBottom: 6 }}>
          GENRES
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {allGenres.map((g) => (
            <label key={g} className="radio" style={{ border: "1px solid var(--color-divider)", padding: "6px 8px" }}>
              <input type="checkbox" name="genres" value={g} />
              <span className="dot" />
              {g}
            </label>
          ))}
        </div>

        <div className="mono" style={{ color: "var(--color-neutral-700)", marginBottom: 6 }}>
          WHO IS IT FOR?
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {allLevels.map((l, i) => (
            <label key={l} className="seg-opt" style={{ minHeight: 38 }}>
              <input type="radio" name="readingLevel" value={l} defaultChecked={i === 0} />
              <span className="dot" />
              {l}
            </label>
          ))}
        </div>

        {state !== undefined && "error" in state && (
          <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 12 }}>
            {state.error}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Adding…" : "Add to the catalogue"}
        </button>
      </form>
    </div>
  );
}
