"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import { bookById, reviewsFor, avg, starStr, lengthLabel, steps, type Book } from "@/lib/mock";

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
 * - Reading status (`st.read/reading/want`) and reading progress are
 *   local `useState` — there's no shared tracker state across pages in
 *   this port (the tracker screen is a separate agent's scope), so the
 *   status picked here doesn't persist or show up on /tracker. It's a
 *   comment-flagged local-only stand-in per the porting rules.
 * - "＋ Add to a list" has no lists data or list-picker UI available on
 *   this page (the lists screen that owns that state is out of scope),
 *   so the button is inert rather than faking a list. `st.listedIn` is
 *   dropped for the same reason.
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

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const book = bookById(id);
  if (!book) notFound();

  return <BookDetail key={id} id={id} book={book} />;
}

function BookDetail({ id, book }: { id: string; book: Book }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justPosted = searchParams.get("posted") === "1";

  const [status, setStatus] = useState<ReadingStatus>("none");
  const [progressKey, setProgressKey] = useState(steps[0].key);
  const [myReview, setMyReview] = useState<LocalReview | null>(() => readLocalReview(id));

  function deleteMyReview() {
    window.localStorage.removeItem(localReviewKey(id));
    setMyReview(null);
  }

  const rating = avg(book);
  const progressStep = steps.find((s) => s.key === progressKey) ?? steps[0];
  const reviews = reviewsFor(book);
  const reviewCount = reviews.length + (myReview ? 1 : 0);

  return (
    <>
      <Nav />
      <div className="wrap">
        <button type="button" className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => router.back()}>
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
            <div className="mono" style={{ margin: "16px 0 6px", color: "var(--color-accent-700)" }}>
              READING STATUS
            </div>
            <div className="seg" style={{ width: "100%", flexDirection: "column" }}>
              <label className="seg-opt" data-state="read" style={{ justifyContent: "center", minHeight: 44, borderLeft: 0 }}>
                <input type="radio" name="st" checked={status === "read"} onChange={() => setStatus("read")} />
                Read
              </label>
              <label
                className="seg-opt"
                data-state="reading"
                style={{ justifyContent: "center", minHeight: 44, borderLeft: 0, borderTop: "3px solid var(--color-divider)" }}
              >
                <input type="radio" name="st" checked={status === "reading"} onChange={() => setStatus("reading")} />
                Currently Reading
              </label>
              <label
                className="seg-opt"
                data-state="want"
                style={{ justifyContent: "center", minHeight: 44, borderLeft: 0, borderTop: "3px solid var(--color-divider)" }}
              >
                <input type="radio" name="st" checked={status === "want"} onChange={() => setStatus("want")} />
                Want to Read
              </label>
            </div>
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
                      <input type="radio" name="prog" checked={progressKey === s.key} onChange={() => setProgressKey(s.key)} />
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
          <div>
            <h1 style={{ fontSize: 42, margin: "0 0 4px" }}>{book.title}</h1>
            <div style={{ fontSize: 16, marginBottom: 12 }}>{book.author}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span className="stars" style={{ fontSize: 19 }}>
                {starStr(rating)}
              </span>
              <span className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
                {`${rating.toFixed(1)} AVERAGE · ${reviewCount} REVIEWS`}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
              {book.genres.map((t) => (
                <span key={t} className="tag tag-accent">
                  {t}
                </span>
              ))}
              {[book.level, lengthLabel(book.pages)].concat(book.series ? ["Part of a series"] : []).map((t) => (
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
