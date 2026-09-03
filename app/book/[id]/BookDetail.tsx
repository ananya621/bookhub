"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import Sheet from "@/components/Sheet";
import { lengthLabel, starStr, steps } from "@/lib/mock";
import { setReadingStatus } from "@/app/actions/reading";
import { deleteOwnReview } from "@/app/actions/reviews";
import { submitReport } from "@/app/actions/reports";
import { addBookToList, createList, removeBookFromList } from "@/app/actions/lists";

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
 * - "＋ Add to a list" opens a real picker now (the reader's own lists,
 *   fetched by the page, each a toggle button) with a "new list" field
 *   at the bottom — same list-picker dialog reused for both the
 *   desktop button and the mobile sheet's copy of it. `st.listedIn`
 *   (the "IN LIST: ..." line under the reading-status control) is
 *   still dropped: the source only ever shows the reader's *current*
 *   list, singular, but a book can be on several lists at once here,
 *   so one line can't say which — the picker itself is the source of
 *   truth for that instead.
 * The book, and now its reviews, come from the database, passed in by
 * the page — `myReview` and `reviews` are real rows (real, RLS'd),
 * matching the source's `r.mine`/`r.notMine` split by comparing
 * `user_id` server-side instead of a display name.
 *
 * The report dialog (ported from Prototype with Admin.dc.html's
 * `reportOpen` block, ~line 1497) is real too: picking one of the five
 * reasons and sending it writes a row to `reports`. See
 * app/actions/reports.ts for the one deliberate deviation from the
 * source (a reason is required there). The source's `REPORT_LIMIT`
 * repeat-cap is dropped — same as `reviewBlocked` on the write-review
 * page, it's a constant the export never defines, so it never actually
 * triggers there either.
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

const REPORT_REASONS: { label: string; type: string }[] = [
  { label: "Rude or unkind to other readers", type: "rude" },
  { label: "Bad language or slurs", type: "bad_language" },
  { label: "Nothing to do with the book", type: "off_topic" },
  { label: "Spam or advertising", type: "spam" },
  { label: "Something that worries me about their safety", type: "safety_concern" },
];

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

export type DetailReview = {
  id: string;
  userId: string;
  who: string;
  avatarColor: string;
  stars: number;
  text: string;
  date: string;
  mine: boolean;
  alreadyReported: boolean;
};

type ReportTarget = {
  kind: "review" | "reader";
  targetType: "review" | "user";
  targetId: string;
  who: string;
  /** The review card this report was opened from — the key the "Reported" badge tracks, since reporting either the review or its author retires both buttons on that one card. */
  reviewId: string;
};

export default function BookDetail({
  id,
  book,
  initialStatus,
  initialProgress,
  isGuest,
  myReview: initialMyReview,
  reviews,
  myLists,
}: {
  id: string;
  book: DetailBook;
  initialStatus: ReadingStatus;
  initialProgress: string | null;
  isGuest: boolean;
  myReview: DetailReview | null;
  reviews: DetailReview[];
  myLists: { id: string; name: string; hasBook: boolean }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justPosted = searchParams.get("posted") === "1";
  const [, startTransition] = useTransition();

  const [status, setStatus] = useState<ReadingStatus>(initialStatus);
  const [progressKey, setProgressKey] = useState(
    (initialProgress as (typeof steps)[number]["key"] | null) ?? steps[0].key
  );
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [myReview, setMyReview] = useState<DetailReview | null>(initialMyReview);

  const [reportOpen, setReportOpen] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportNote, setReportNote] = useState("");
  const [reportError, setReportError] = useState("");
  const [justReported, setJustReported] = useState<Set<string>>(new Set());

  const [listPickerOpen, setListPickerOpen] = useState(false);
  // Overrides layered on top of the `myLists` prop rather than a copy of
  // it, so a newly created list (which only exists once the page
  // re-fetches after router.refresh()) shows up without this state
  // going stale relative to the prop.
  const [listOverrides, setListOverrides] = useState<Record<string, boolean>>({});
  const [newListName, setNewListName] = useState("");
  const [listError, setListError] = useState("");
  const [listPending, setListPending] = useState(false);

  const lists = myLists.map((l) => ({ ...l, hasBook: listOverrides[l.id] ?? l.hasBook }));

  async function toggleList(listId: string, hasBook: boolean) {
    setListOverrides((o) => ({ ...o, [listId]: !hasBook }));
    const formData = new FormData();
    formData.set("listId", listId);
    formData.set("bookId", id);
    const result = await (hasBook ? removeBookFromList : addBookToList)(undefined, formData);
    if (result && "error" in result) {
      setListOverrides((o) => ({ ...o, [listId]: hasBook }));
      setListError(result.error);
    }
  }

  async function addNewList() {
    const name = newListName.trim();
    if (!name) return;
    setListPending(true);
    const formData = new FormData();
    formData.set("name", name);
    const result = await createList(undefined, formData);
    setListPending(false);
    if (result && "error" in result) return setListError(result.error);
    setNewListName("");
    setListError("");
    startTransition(() => router.refresh());
  }

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

  async function deleteMyReview() {
    setMyReview(null);
    const formData = new FormData();
    formData.set("bookId", id);
    await deleteOwnReview(undefined, formData);
    startTransition(() => router.refresh());
  }

  function openReport(target: ReportTarget) {
    setReportOpen(target);
    setReportReason("");
    setReportNote("");
    setReportError("");
  }
  function cancelReport() {
    setReportOpen(null);
    setReportReason("");
    setReportNote("");
    setReportError("");
  }
  async function sendReport() {
    if (!reportOpen) return;
    if (!reportReason) {
      setReportError("PICK A REASON");
      return;
    }
    const formData = new FormData();
    formData.set("type", reportReason);
    formData.set("targetType", reportOpen.targetType);
    formData.set("targetId", reportOpen.targetId);
    formData.set("note", reportNote);
    const result = await submitReport(undefined, formData);
    if (result && "error" in result) {
      setReportError(result.error);
      return;
    }
    setJustReported((s) => new Set(s).add(reportOpen.reviewId));
    setReportOpen(null);
    setReportReason("");
    setReportNote("");
    setReportError("");
  }

  const progressStep = steps.find((s) => s.key === progressKey) ?? steps[0];
  const reviewCount = reviews.length + (myReview ? 1 : 0);
  const isSafeguarding = reportReason === "safety_concern";

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
            {book.coverUrl ? (
              // Google's URLs (or an admin-uploaded file's), not
              // something next/image can optimise without every host
              // allow-listed, so a plain img — objectFit fills the
              // same 230x330 box the placeholder below reserves,
              // whatever the source image's own proportions are.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.coverUrl}
                alt=""
                style={{ width: "100%", height: 330, objectFit: "cover", border: "3px solid var(--color-text)" }}
              />
            ) : (
              <div className="cover blueprint" style={{ height: 330 }}>
                <i className="corner tl" />
                <i className="corner tr" />
                <i className="corner bl" />
                <i className="corner br" />
                <span className="mono">COVER FROM API</span>
              </div>
            )}
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
              <button
                type="button"
                className="btn btn-secondary btn-block"
                style={{ minHeight: 42 }}
                onClick={() => setListPickerOpen(true)}
              >
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
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, minHeight: 48 }}
                  onClick={() => {
                    setStatusSheetOpen(false);
                    setListPickerOpen(true);
                  }}
                >
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
                      {myReview.date}
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
              {reviews.map((r) => {
                const reported = r.alreadyReported || justReported.has(r.id);
                return (
                  <div key={r.id} className="card">
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
                    {!isGuest && !reported && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() =>
                            openReport({ kind: "review", targetType: "review", targetId: r.id, who: r.who, reviewId: r.id })
                          }
                        >
                          Report this review
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() =>
                            openReport({ kind: "reader", targetType: "user", targetId: r.userId, who: r.who, reviewId: r.id })
                          }
                        >
                          Report this reader
                        </button>
                      </div>
                    )}
                    {!isGuest && reported && (
                      <span
                        style={{
                          alignSelf: "flex-start",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          background: "#c6f24e",
                          color: "#14110f",
                          border: "3px solid var(--color-text)",
                          padding: "4px 10px",
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 15, lineHeight: 1 }}>✓</span>
                        <span className="mono" style={{ fontWeight: 700 }}>
                          REPORTED — WE&apos;LL TAKE A LOOK
                        </span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {reportOpen && (
        <div className="dialog-backdrop">
          <div className="dialog blueprint" style={{ width: "min(520px, 100%)" }}>
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            <div className="card-kicker">Report</div>
            <div className="dialog-title">
              {reportOpen.kind === "reader" ? `Report ${reportOpen.who}` : "Report this review"}
            </div>
            <p className="dialog-body" style={{ margin: 0 }}>
              {reportOpen.kind === "reader"
                ? "What is the problem with this reader? Only the site owner sees this — they will not know who reported them."
                : "What is the problem with this review? Only the site owner sees this — the author will not know who reported it."}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.type}
                  className="radio"
                  style={{ border: "3px solid var(--color-divider)", padding: "10px 12px", minHeight: 44 }}
                >
                  <input
                    type="radio"
                    name="rep"
                    checked={reportReason === r.type}
                    onChange={() => {
                      setReportReason(r.type);
                      setReportError("");
                    }}
                  />
                  <span className="dot" />
                  {r.label}
                </label>
              ))}
            </div>
            <div className="field">
              <label>Anything else? (optional)</label>
              <textarea
                className="input"
                style={{ minHeight: 70 }}
                placeholder="Tell us in your own words"
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
              />
            </div>
            {isSafeguarding && (
              <div
                style={{
                  background: "#C41031",
                  color: "#EFECE3",
                  border: "3px solid var(--color-text)",
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                  If someone is in danger, tell an adult you trust
                </div>
                <p style={{ fontSize: 13, margin: 0 }}>
                  We read every report, but we are a book site — we cannot help in an emergency.
                  Speak to a parent, carer or teacher as well.
                </p>
              </div>
            )}
            {reportError && (
              <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700 }}>
                {reportError}
              </div>
            )}
            <div className="dialog-actions" style={{ justifyContent: "flex-start" }}>
              <button type="button" className="btn btn-primary" onClick={sendReport}>
                Send report
              </button>
              <button type="button" className="btn btn-secondary" onClick={cancelReport}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {listPickerOpen && (
        <div className="dialog-backdrop">
          <div className="dialog blueprint" style={{ width: "min(420px, 100%)" }}>
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            <div className="card-kicker">Lists</div>
            <div className="dialog-title">Add &ldquo;{book.title}&rdquo; to a list</div>
            {lists.length === 0 ? (
              <p className="dialog-body" style={{ margin: 0 }}>
                You don&apos;t have any lists yet — start one below.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lists.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className="btn"
                    style={l.hasBook ? { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" } : undefined}
                    onClick={() => toggleList(l.id, l.hasBook)}
                  >
                    {l.hasBook ? "✓ " : ""}
                    {l.name}
                  </button>
                ))}
              </div>
            )}
            <div className="field">
              <label>New list</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="input"
                  placeholder="e.g. Scary but not too scary"
                  value={newListName}
                  onChange={(e) => {
                    setNewListName(e.target.value);
                    setListError("");
                  }}
                />
                <button type="button" className="btn btn-secondary" onClick={addNewList} disabled={listPending}>
                  Add
                </button>
              </div>
            </div>
            {listError && (
              <div className="mono" style={{ color: "var(--color-problem-text)", fontWeight: 700 }}>
                {listError}
              </div>
            )}
            <div className="dialog-actions" style={{ justifyContent: "flex-start" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setListPickerOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
