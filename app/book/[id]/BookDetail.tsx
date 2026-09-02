"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import Sheet from "@/components/Sheet";
import { lengthLabel, starStr, steps } from "@/lib/mock";
import { setReadingStatus } from "@/app/actions/reading";

/*
 * Ported from the `isBook` block in Prototype with Admin.dc.html
 * (lines 966-1048).
 *
 * `params` is a Promise in this Next.js version (see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md).
 * This is a Client Component (reading-status radios, progress steps),
 * so it unwraps params with React's `use()` rather than `await`.
 *
 * Deviations from the source, and why:
 *
 * - Reading status and progress are real now (reading_status table,
 *   app/actions/reading.ts) — the page fetches the signed-in reader's
 *   current status server-side and passes it in as initialStatus/
 *   initialProgress; picking a new one here saves it for real and does
 *   show up on /tracker and /home. `useState` still holds it
 *   client-side for instant feedback (optimistic — set locally, then
 *   confirmed/corrected by the server action's result), not because
 *   it's fake.
 * - A guest picking a status gets the server action's error message
 *   rather than a sign-up prompt — there's no gate-dialog component in
 *   this port yet (see docs/auth-states.md).
 * - "＋ Add to a list" has no lists data or list-picker UI available on
 *   this page (the lists screen that owns that state is out of scope),
 *   so the button is inert rather than faking a list. `st.listedIn` is
 *   dropped for the same reason.
 * The book itself now comes from the database, passed in by the page.
 * Reviews do not exist as a table yet, so the only review that can
 * appear is one this browser posted, kept in localStorage.
 *
 * - There's no auth/identity yet, so "my review" can't be told apart
 *   from a stranger's the way the source does (`r.who === name`).
 *   Reviews the reader posts locally (see the review screen) are
 *   tracked via localStorage per book id and rendered with the
 *   edit/delete controls the source shows for `r.mine`; every other
 *   review gets the report buttons the source shows for `r.notMine`.
 *   The report buttons don't open anything — the report modal is out
 *   of scope for this pass (see task notes).
 * - `justPosted` — the source sets this in local state right after
 *   posting. Since posting happens on a different route
 *   (/book/[id]/review), that page redirects back with `?posted=1`
 *   and this page reads it via `useSearchParams`.
 *
 * The per-book state (reading status, progress, the locally-posted
 * review) lives in a child keyed on the book id, so navigating
 * straight from one book page to another resets it instead of
 * leaking the previous book's state — and so the localStorage read
 * that seeds `myReview` happens once, in a lazy `useState`
 * initializer, rather than as a setState call inside an effect.
 */

type ReadingStatus = "none" | "read" | "reading" | "want";
type LocalReview = { stars: number; text: string };

const STATUS_LABEL: Record<Exclude<ReadingStatus, "none">, string> = {
  read: "Read",
  reading: "Currently Reading",
  want: "Want to Read",
};
const STATUS_STYLE: Record<Exclude<ReadingStatus, "none">, React.CSSProperties> = {
  read: { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" },
  reading: { background: "#ff3d9a", color: "#14110f", borderColor: "#14110f" },
  want: { background: "#1B3BFF", color: "#EFECE3", borderColor: "#14110f" },
};

const localReviewKey = (id: string) => `bookhub-review-${id}`;

function readLocalReview(id: string): LocalReview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(localReviewKey(id));
    return raw ? (JSON.parse(raw) as LocalReview) : null;
  } catch {
    return null;
  }
}


/** The shape the page hands in, mapped from the books table. */
export type DetailBook = {
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

export default function BookDetail({
  id,
  book,
  initialStatus,
  initialProgress,
}: {
  id: string;
  book: DetailBook;
  initialStatus: ReadingStatus;
  initialProgress: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justPosted = searchParams.get("posted") === "1";

  const [status, setStatus] = useState<ReadingStatus>(initialStatus);
  const [progressKey, setProgressKey] = useState(
    (initialProgress as (typeof steps)[number]["key"] | null) ?? steps[0].key
  );
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [myReview, setMyReview] = useState<LocalReview | null>(() => readLocalReview(id));

  // Optimistic: the UI updates immediately, then the server action's
  // result either confirms it silently or surfaces an error (a guest,
  // most likely) without reverting the click — same feel as the
  // radios/sheet buttons had when this was local-only.
  async function saveStatus(newStatus: Exclude<ReadingStatus, "none">, newProgress?: string) {
    setStatus(newStatus);
    if (newProgress) setProgressKey(newProgress as (typeof steps)[number]["key"]);
    const formData = new FormData();
    formData.set("bookId", id);
    formData.set("status", newStatus);
    if (newStatus === "reading") formData.set("progress", newProgress ?? progressKey);
    const result = await setReadingStatus(undefined, formData);
    setStatusError(result && "error" in result ? result.error : null);
  }

  function deleteMyReview() {
    window.localStorage.removeItem(localReviewKey(id));
    setMyReview(null);
  }

  const progressStep = steps.find((s) => s.key === progressKey) ?? steps[0];
  // No reviews table yet, so the only one that can exist is this
  // browser's own.
  const reviews: { who: string; stars: number; date: string; text: string }[] = [];
  const reviewCount = reviews.length + (myReview ? 1 : 0);

  return (
    <>
      <Nav />
      <div className="wrap">
        {/* Hidden on mobile — the app-bar's own back arrow already does this there. */}
        <button
          type="button"
          className="btn btn-ghost desktop-only"
          style={{ marginBottom: 16 }}
          onClick={() => router.back()}
        >
          ← Back
        </button>
        {justPosted && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#c6f24e",
              color: "#14110f",
              border: "3px solid var(--color-text)",
              boxShadow: "4px 4px 0 var(--color-text)",
              padding: "12px 16px",
              marginBottom: 22,
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontSize: 24, lineHeight: 1 }}>✓</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17 }}>Review posted</div>
              <div className="mono">IT IS PUBLIC NOW · YOU CAN EDIT IT ANY TIME</div>
            </div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 36 }}>
          <div>
            <div className="cover blueprint" style={{ height: 330 }}>
              <i className="corner tl" />
              <i className="corner tr" />
              <i className="corner bl" />
              <i className="corner br" />
              <span className="mono">COVER FROM API</span>
            </div>
            {/* Desktop: the existing inline segmented control, unchanged. */}
            <div className="desktop-only">
              <div className="mono" style={{ margin: "16px 0 6px", color: "var(--color-accent-700)" }}>
                READING STATUS
              </div>
              <div className="seg" style={{ width: "100%", flexDirection: "column" }}>
                <label className="seg-opt" data-state="read" style={{ justifyContent: "center", minHeight: 44, borderLeft: 0 }}>
                  <input type="radio" name="st" checked={status === "read"} onChange={() => saveStatus("read")} />
                  Read
                </label>
                <label
                  className="seg-opt"
                  data-state="reading"
                  style={{ justifyContent: "center", minHeight: 44, borderLeft: 0, borderTop: "3px solid var(--color-divider)" }}
                >
                  <input type="radio" name="st" checked={status === "reading"} onChange={() => saveStatus("reading")} />
                  Currently Reading
                </label>
                <label
                  className="seg-opt"
                  data-state="want"
                  style={{ justifyContent: "center", minHeight: 44, borderLeft: 0, borderTop: "3px solid var(--color-divider)" }}
                >
                  <input type="radio" name="st" checked={status === "want"} onChange={() => saveStatus("want")} />
                  Want to Read
                </label>
              </div>
              {statusError && (
                <div className="mono" style={{ color: "var(--color-problem-text)", marginTop: 8 }}>
                  {statusError}
                </div>
              )}
              {/* Local only — no lists feature/state available on this page. */}
              <button type="button" className="btn btn-secondary btn-block" style={{ minHeight: 42 }}>
                ＋ Add to a list
              </button>
              {status === "reading" && (
                <div style={{ marginTop: 16 }}>
                  <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 6 }}>
                    HOW FAR ARE YOU?
                  </div>
                  <div style={{ height: 12, border: "3px solid var(--color-text)", marginBottom: 8 }}>
                    <div style={{ width: `${progressStep.pct}%`, background: "#ff3d9a", height: "100%" }} />
                  </div>
                  <div className="seg" style={{ width: "100%", flexDirection: "column" }}>
                    {steps.map((s) => (
                      <label key={s.key} className="seg-opt" data-state="prog" style={{ justifyContent: "center", minHeight: 42, borderLeft: 0 }}>
                        <input type="radio" name="prog" checked={progressKey === s.key} onChange={() => saveStatus("reading", s.key)} />
                        {s.label}
                      </label>
                    ))}
                  </div>
                  <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 8 }}>
                    NO PAGE NUMBERS — WORKS FOR EBOOKS AND AUDIOBOOKS TOO
                  </div>
                </div>
              )}
            </div>

            {/* Mobile: a trigger that opens the same choice as a bottom
                sheet, matching Prototype Mobile.dc.html's statusSheet
                (lines 613-638) instead of the inline control above. */}
            <div className="mobile-only">
              <button
                type="button"
                className="btn btn-block"
                style={{ minHeight: 44, ...(status !== "none" ? STATUS_STYLE[status] : {}) }}
                onClick={() => setStatusSheetOpen(true)}
              >
                {status === "none" ? "Set reading status" : STATUS_LABEL[status]}
              </button>
            </div>
            <Sheet
              open={statusSheetOpen}
              onClose={() => setStatusSheetOpen(false)}
              title="Where are you with this?"
              subtitle="TAP ONE — IT SAVES STRAIGHT AWAY"
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(Object.keys(STATUS_LABEL) as Exclude<ReadingStatus, "none">[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="btn"
                    style={status === key ? STATUS_STYLE[key] : undefined}
                    onClick={() => saveStatus(key)}
                  >
                    {STATUS_LABEL[key]}
                  </button>
                ))}
              </div>
              {statusError && (
                <div className="mono" style={{ color: "var(--color-problem-text)", marginTop: 10 }}>
                  {statusError}
                </div>
              )}
              {status === "reading" && (
                <div style={{ borderTop: "3px solid var(--color-divider)", marginTop: 16, paddingTop: 14 }}>
                  <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 8 }}>
                    HOW FAR ARE YOU?
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {steps.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        className="btn"
                        style={progressKey === s.key ? { background: "#ff3d9a", color: "#14110f", borderColor: "#14110f" } : undefined}
                        onClick={() => saveStatus("reading", s.key)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                {/* Local only — same limitation as the desktop button. */}
                <button type="button" className="btn btn-secondary" style={{ flex: 1, minHeight: 48 }}>
                  ＋ Add to a list
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: "none", minHeight: 48 }}
                  onClick={() => setStatusSheetOpen(false)}
                >
                  Done
                </button>
              </div>
            </Sheet>
          </div>
          <div>
            <h1 style={{ fontSize: 42, margin: "0 0 4px" }}>{book.title}</h1>
            <div style={{ fontSize: 16, marginBottom: 12 }}>{book.author}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
                {reviewCount === 0 ? "NO REVIEWS YET" : `${reviewCount} REVIEW${reviewCount === 1 ? "" : "S"}`}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
              {book.genres.map((t) => (
                <span key={t} className="tag tag-accent">
                  {t}
                </span>
              ))}
              {/* Genres are already shown above in accent tags, so this
                  second row is only the level, length and series flag. */}
              {(book.readingLevel ? [book.readingLevel] : [])
                .concat(book.pages !== null ? [lengthLabel(book.pages)] : [])
                .concat(book.isSeries ? ["Part of a series"] : [])
                .map((t) => (
                  <span key={t} className="tag tag-neutral">
                    {t}
                  </span>
                ))}
            </div>
            <h4 style={{ margin: "0 0 6px" }}>Summary</h4>
            <p style={{ fontSize: 15, maxWidth: 620, marginBottom: 28 }}>{book.summary}</p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                borderTop: "1px solid var(--color-divider)",
                paddingTop: 20,
                marginBottom: 16,
              }}
            >
              <h4 style={{ margin: 0 }}>Reviews ({reviewCount})</h4>
              <Link href={`/book/${id}/review`} className="btn btn-primary">
                {myReview ? "Edit my review" : "Write a review"}
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {myReview && (
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div className="card-title" style={{ fontSize: 16 }}>
                      You
                    </div>
                    <span className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
                      TODAY
                    </span>
                  </div>
                  <span className="stars" style={{ fontSize: 13 }}>
                    {starStr(myReview.stars)}
                  </span>
                  <p className="card-body">{myReview.text}</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Link href={`/book/${id}/review`} className="btn btn-ghost">
                      Edit my review
                    </Link>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ color: "var(--color-problem-text)" }}
                      onClick={deleteMyReview}
                    >
                      Delete my review
                    </button>
                  </div>
                </div>
              )}
              {reviews.map((r, i) => (
                <div key={`${book.id}:${i}`} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div className="card-title" style={{ fontSize: 16 }}>
                      {r.who}
                    </div>
                    <span className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
                      {r.date}
                    </span>
                  </div>
                  <span className="stars" style={{ fontSize: 13 }}>
                    {starStr(r.stars)}
                  </span>
                  <p className="card-body">{r.text}</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" className="btn btn-ghost">
                      Report this review
                    </button>
                    <button type="button" className="btn btn-ghost">
                      Report this reader
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
