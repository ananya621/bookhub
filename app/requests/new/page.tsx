"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { suggestFromGoogle, requestBook, type ActionResult } from "@/app/actions/books";
import type { GoogleBook } from "@/lib/google-books";

/*
 * Ported from the `isRequest` block in Prototype with Admin.dc.html
 * (lines 1295-1321), then extended.
 *
 * The export had people type a title and author freehand. This searches
 * Google Books as they type instead, so the request arrives with the
 * real title, author, cover, page count and description already
 * attached — which means an admin can approve it in one click rather
 * than retyping it all.
 *
 * Freehand is still there, for books Google does not have. Those arrive
 * with just a title and author for the admin to fill in.
 *
 * Searching Google adds nothing to the catalogue. It only ever produces
 * a request. A book appears on the site when an admin approves it, and
 * that is the point where a person checks it is suitable for children.
 *
 * Same debounce and sequence-number trick as the display-name check:
 * wait until typing stops, and let only the newest answer win.
 */

type Mode = "search" | "freehand";

export default function NewRequestPage() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    requestBook,
    undefined
  );

  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [picked, setPicked] = useState<GoogleBook | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchNote, setSearchNote] = useState("");

  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onQueryChange(value: string) {
    setQuery(value);
    setPicked(null);
    if (timer.current) clearTimeout(timer.current);

    if (value.trim().length < 2) {
      setResults([]);
      setSearching(false);
      setSearchNote("");
      return;
    }

    setSearching(true);
    const mine = ++seq.current;
    timer.current = setTimeout(async () => {
      const outcome = await suggestFromGoogle(value);
      if (seq.current !== mine) return;

      setSearching(false);
      setResults(outcome.books);

      // Say why there is nothing, rather than showing an empty list that
      // reads as "no such book".
      if ("reason" in outcome) {
        setSearchNote(
          outcome.reason === "no-key"
            ? "BOOK SEARCH ISN’T SET UP ON THIS COPY OF THE SITE — YOU CAN STILL TYPE THE DETAILS IN BELOW."
            : outcome.reason === "quota"
              ? "BOOK SEARCH IS BUSY RIGHT NOW — TRY AGAIN IN A MOMENT, OR TYPE THE DETAILS IN BELOW."
              : "COULDN’T REACH THE BOOK SEARCH — TYPE THE DETAILS IN BELOW INSTEAD."
        );
      } else if (outcome.books.length === 0) {
        setSearchNote("NOTHING MATCHED. TRY FEWER WORDS, OR TYPE THE DETAILS IN BELOW.");
      } else {
        setSearchNote("");
      }
    }, 500);
  }

  const sent = state !== undefined && "ok" in state;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 24px" }}>
      {sent ? (
        <div className="blueprint" style={{ padding: 28 }}>
          <i className="corner tl" />
          <i className="corner tr" />
          <i className="corner bl" />
          <i className="corner br" />
          <h2 style={{ margin: "0 0 8px" }}>Request sent</h2>
          <p style={{ fontSize: 14 }}>
            Thanks — someone will look at it and add it if it&apos;s right for
            the site. If other people have already asked for the same book,
            you&apos;ve been added to their request.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/requests" className="btn btn-primary">
              See my requests
            </Link>
            <Link href="/search" className="btn btn-secondary">
              Back to browsing
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 10 }}>
            MISSING BOOK
          </div>
          <h1 style={{ fontSize: 34, margin: "0 0 6px" }}>Ask us to add a book</h1>
          <p style={{ fontSize: 14, marginBottom: 22 }}>
            Search for it below. If we can find it, we&apos;ll already have all
            the details.
          </p>

          {mode === "search" && (
            <>
              <div className="field" style={{ marginBottom: 8 }}>
                <label htmlFor="q">Search for the book</label>
                <input
                  id="q"
                  className="input"
                  style={{ minHeight: 42 }}
                  placeholder="Title, or title and author"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  autoComplete="off"
                />
              </div>

              {searching && (
                <div className="mono" style={{ color: "var(--color-neutral-700)", marginBottom: 12 }}>
                  SEARCHING…
                </div>
              )}

              {!searching && searchNote && (
                <div
                  className="mono"
                  style={{ color: "var(--color-accent-700)", marginBottom: 12, lineHeight: 1.6 }}
                >
                  {searchNote}
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
                          gap: 14,
                          alignItems: "center",
                          width: "100%",
                          textAlign: "left",
                          padding: "12px 8px",
                          background: isPicked ? "var(--color-accent-100)" : "transparent",
                          border: 0,
                          borderBottom: "3px solid var(--color-divider)",
                          cursor: "pointer",
                        }}
                      >
                        {b.coverUrl ? (
                          // A plain img on purpose: these are Google's URLs,
                          // not files we hold, so there is nothing for
                          // next/image to optimise and it would need every
                          // Google host allow-listed in next.config.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.coverUrl}
                            alt=""
                            width={40}
                            style={{ flex: "none", border: "3px solid var(--color-text)" }}
                          />
                        ) : (
                          <div className="cover" style={{ width: 40, height: 58, flex: "none" }} />
                        )}
                        <span style={{ flex: 1 }}>
                          <span
                            style={{
                              display: "block",
                              fontFamily: "var(--font-heading)",
                              fontWeight: 700,
                              fontSize: 16,
                            }}
                          >
                            {b.title}
                          </span>
                          <span
                            className="mono"
                            style={{ display: "block", color: "var(--color-neutral-700)", marginTop: 3 }}
                          >
                            {(b.author || "unknown author").toUpperCase()}
                            {b.pages ? ` · ${b.pages} PAGES` : ""}
                          </span>
                        </span>
                        {isPicked && (
                          <span className="tag tag-done" style={{ flex: "none" }}>
                            Picked
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginBottom: 18 }}
                onClick={() => setMode("freehand")}
              >
                Can&apos;t find it? Type the details in yourself
              </button>
            </>
          )}

          <form action={formAction}>
            {mode === "search" && picked && (
              <>
                <input type="hidden" name="externalId" value={picked.externalId} />
                <input type="hidden" name="title" value={picked.title} />
                <input type="hidden" name="author" value={picked.author} />
                <input type="hidden" name="pages" value={picked.pages ?? ""} />
                <input type="hidden" name="summary" value={picked.summary ?? ""} />
                <input type="hidden" name="coverUrl" value={picked.coverUrl ?? ""} />
              </>
            )}

            {mode === "freehand" && (
              <>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label htmlFor="title">Book title</label>
                  <input
                    id="title"
                    name="title"
                    className="input"
                    style={{ minHeight: 42 }}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label htmlFor="author">Author (if you know it)</label>
                  <input id="author" name="author" className="input" style={{ minHeight: 42 }} />
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ marginBottom: 14 }}
                  onClick={() => setMode("search")}
                >
                  Back to searching
                </button>
              </>
            )}

            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="note">Anything else?</label>
              <textarea
                id="note"
                name="note"
                className="input"
                style={{ minHeight: 70 }}
                placeholder="Tell us why you'd like it, if you want"
              />
            </div>

            {state !== undefined && "error" in state && (
              <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 14 }}>
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending || (mode === "search" && !picked)}
              className="btn btn-primary btn-block blueprint"
              style={{ minHeight: 46 }}
            >
              {pending
                ? "Sending…"
                : mode === "search" && !picked
                  ? "Pick a book above first"
                  : "Send request"}
              <i className="corner tl" />
              <i className="corner tr" />
              <i className="corner bl" />
              <i className="corner br" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
