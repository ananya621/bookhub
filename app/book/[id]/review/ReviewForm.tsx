"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitReview } from "@/app/actions/reviews";

/*
 * The star-picker/textarea form for app/book/[id]/review/page.tsx —
 * split out as a client component so the page above can stay a server
 * component that fetches the book and any existing review first. See
 * the comment there for what's ported vs. deliberately dropped.
 *
 * The "can't be posted" banner is real now — submitReview runs the
 * text through the same word filter display names use (see
 * app/actions/reviews.ts) and returns `{ blocked: true }` rather than
 * an error when it trips, which is what shows this banner instead of
 * the plain error line. The text is never cleared either way, same as
 * the design.
 */
export default function ReviewForm({
  id,
  book,
  initialStars,
  initialText,
}: {
  id: string;
  book: { title: string; author: string };
  initialStars: number;
  initialText: string;
}) {
  const router = useRouter();
  const [stars, setStars] = useState(initialStars);
  const [text, setText] = useState(initialText);
  const [error, setError] = useState("");
  const [reviewBlocked, setReviewBlocked] = useState(false);
  const [pending, setPending] = useState(false);

  async function postReview() {
    if (!stars) return setError("PICK A STAR RATING FIRST");
    if (text.trim().length < 4) return setError("WRITE A LINE OR TWO SO IT HELPS SOMEONE");
    setPending(true);
    const formData = new FormData();
    formData.set("bookId", id);
    formData.set("stars", String(stars));
    formData.set("text", text);
    const result = await submitReview(undefined, formData);
    setPending(false);
    if (result && "blocked" in result) return setReviewBlocked(true);
    if (result && "error" in result) return setError(result.error);
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
            setReviewBlocked(false);
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
        <button type="button" className="btn btn-primary" onClick={postReview} disabled={pending}>
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
