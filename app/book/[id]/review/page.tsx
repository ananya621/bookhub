"use client";

import { use, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { bookById, type Book } from "@/lib/mock";

/*
 * Ported from the `isReview` block in Prototype with Admin.dc.html
 * (lines 1049-1084).
 *
 * `params` is a Promise here too — see the comment in
 * `app/book/[id]/page.tsx` and
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md.
 * Client Component, so params is unwrapped with `use()`.
 *
 * The source's `isReview` screen is deliberately outside the site
 * chrome — it's not in the `chrome` list that gates the nav bar
 * (renderVals(), ~line 1849), so unlike the other ported screens here
 * there is no `<Nav />`.
 *
 * There's no reviews API yet, so posting is local-only: the review is
 * written to localStorage keyed by book id, and the reader is sent
 * back to /book/[id]?posted=1, which reads it back out (see that
 * file). Editing an existing local review pre-fills the star picker
 * and text from the same storage.
 *
 * The source also runs review text through a profanity filter
 * (`hasBanned`, defined ~line 1780 against word lists that live
 * outside this screen's block) and shows a "can't be posted" banner
 * when it trips. That filter is unrelated content-moderation logic
 * out of scope for this pass, so `reviewBlocked` is kept as a
 * structural dead branch (never triggers) rather than reimplementing
 * a word-list filter here — the star-rating/text-length validation
 * below is ported as-is.
 *
 * The form state is in a child keyed on the book id (see the same
 * pattern in app/book/[id]/page.tsx) so an existing local draft seeds
 * the star picker and textarea via a lazy `useState` initializer
 * instead of a setState call inside an effect, and editing two
 * different books' reviews back-to-back doesn't leak one draft into
 * the other.
 */

const localReviewKey = (id: string) => `bookhub-review-${id}`;

function readLocalReview(id: string): { stars: number; text: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(localReviewKey(id));
    return raw ? (JSON.parse(raw) as { stars: number; text: string }) : null;
  } catch {
    return null;
  }
}

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const book = bookById(id);
  if (!book) notFound();

  return <ReviewForm key={id} id={id} book={book} />;
}

function ReviewForm({ id, book }: { id: string; book: Book }) {
  const router = useRouter();
  const [stars, setStars] = useState(() => readLocalReview(id)?.stars ?? 0);
  const [text, setText] = useState(() => readLocalReview(id)?.text ?? "");
  const [error, setError] = useState("");
  const reviewBlocked = false;

  function postReview() {
    if (!stars) return setError("PICK A STAR RATING FIRST");
    if (text.trim().length < 4) return setError("WRITE A LINE OR TWO SO IT HELPS SOMEONE");
    window.localStorage.setItem(localReviewKey(id), JSON.stringify({ stars, text }));
    router.push(`/book/${id}?posted=1`);
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 24px" }}>
      <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginBottom: 8 }}>
        REVIEWING
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
        <div className="cover" style={{ width: 44, height: 64, flex: "none" }} />
        <div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 21 }}>{book.title}</div>
          <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            {book.author.toUpperCase()}
          </div>
        </div>
      </div>
      <div className="field" style={{ marginBottom: 18 }}>
        <label>Your rating</label>
        <div style={{ display: "flex", gap: 2, marginLeft: -6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`starbtn ${n <= stars ? "on" : ""}`}
              onClick={() => {
                setStars(n);
                setError("");
              }}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div className="field" style={{ marginBottom: 18 }}>
        <label>What did you think?</label>
        <textarea
          className="input"
          placeholder="What did you like? Who would enjoy it?"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError("");
          }}
        />
      </div>
      {reviewBlocked && (
        <div
          style={{
            background: "#C41031",
            color: "#EFECE3",
            border: "3px solid var(--color-text)",
            boxShadow: "4px 4px 0 var(--color-text)",
            padding: "14px 16px",
            marginBottom: 16,
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17, marginBottom: 4 }}>
            This one can&apos;t be posted
          </div>
          <p style={{ fontSize: 13, margin: 0 }}>
            Reviews are public and plenty of younger readers use this site. Have another go without the offensive
            language — your words are still below, nothing was deleted.
          </p>
        </div>
      )}
      {error && (
        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 14 }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="btn btn-primary" onClick={postReview}>
          Post review
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
      <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginTop: 12 }}>
        POSTED REVIEWS ARE PUBLIC · YOU CAN EDIT YOURS LATER
      </div>
    </div>
  );
}
