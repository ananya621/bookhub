"use client";

import { useState } from "react";
import Link from "next/link";

/*
 * Ported from the `isRequest` block in Prototype with Admin.dc.html
 * (lines 1295-1321). The export keeps `reqTitle`/`reqAuthor`/`reqError`
 * and a `requestSent` flag on the shared component state, and on send
 * prepends the new request to `s.requests` (lines 2114-2122 of the
 * same file). There's no requests API yet, so `sendRequest` below only
 * flips local `requestSent` state to show the confirmation panel — the
 * request itself isn't persisted anywhere until that API exists.
 *
 * The export's `sendRequest` also rejects titles matching a banned-word
 * list (`hasBanned`) before checking for an empty title. That list
 * isn't in `lib/mock.ts`, so only the empty-title validation is ported
 * here, with the export's exact error copy.
 *
 * The "Anything else?" textarea isn't wired to any state in the source
 * either — it's an inert field there too — so it's left uncontrolled.
 */
export default function NewRequestPage() {
  const [reqTitle, setReqTitle] = useState("");
  const [reqAuthor, setReqAuthor] = useState("");
  const [reqError, setReqError] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  function sendRequest() {
    if (!reqTitle.trim()) {
      setReqError("WE NEED AT LEAST A TITLE");
      return;
    }
    setReqError("");
    setRequestSent(true);
  }

  return (
    <>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 24px" }}>
        {requestSent ? (
          <div className="blueprint" style={{ padding: 28 }}>
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            <h2 style={{ margin: "0 0 8px" }}>Request sent</h2>
            <p style={{ fontSize: 14 }}>
              Thanks &mdash; we&apos;ll look it up by hand and add it if we can find it.
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
            <h2 style={{ margin: "0 0 6px" }}>Ask us to add a book</h2>
            <p style={{ fontSize: 14, marginBottom: 20 }}>
              Tell us what&apos;s missing and we&apos;ll look it up by hand.
            </p>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Book title</label>
              <input
                className="input"
                style={{ minHeight: 42 }}
                value={reqTitle}
                onChange={(e) => {
                  setReqTitle(e.target.value);
                  setReqError("");
                }}
              />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Author (if you know it)</label>
              <input
                className="input"
                style={{ minHeight: 42 }}
                value={reqAuthor}
                onChange={(e) => setReqAuthor(e.target.value)}
              />
            </div>
            <div className="field" style={{ marginBottom: 20 }}>
              <label>Anything else?</label>
              <textarea className="input" style={{ minHeight: 72 }} />
            </div>
            {reqError && (
              <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 12 }}>
                {reqError}
              </div>
            )}
            <button
              className="btn btn-primary btn-block"
              style={{ minHeight: 46 }}
              onClick={sendRequest}
            >
              Send request
            </button>
          </>
        )}
      </div>
    </>
  );
}
