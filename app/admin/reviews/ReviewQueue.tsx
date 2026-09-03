"use client";

import { useActionState, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { adminModerateReview, type ActionResult } from "@/app/actions/reviews";

/*
 * Rows and actions for the real admin Reviews queue — split out from
 * the page so it can stay a server component. Same overall shape as
 * the export's `isAdminReviews` block (Prototype with Admin.dc.html,
 * lines 484-522: search box, page controls, "Who reported it?",
 * Allow/Delete/Undo/View reader) but the flag styling now reflects
 * real report counts and review status instead of the mock's
 * hand-written `flag`/`status` fields — see page.tsx for how `openCount`
 * and `why` are derived.
 */

export type QueueRow = {
  id: string;
  book: string;
  who: string;
  userId: string;
  stars: number;
  text: string;
  when: string;
  status: "allowed" | "deleted";
  openCount: number;
  why: string;
  reporters: { who: string; reason: string; when: string; note: string }[];
};

const PAGE_SIZE = 5;

const FLAG_STYLE: Record<string, CSSProperties> = {
  pending: { background: "#ff3d9a", color: "#14110f", borderColor: "#14110f" },
  allowed: { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" },
  deleted: { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" },
};

export default function ReviewQueue({ rows }: { rows: QueueRow[] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(adminModerateReview, undefined);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [openReporters, setOpenReporters] = useState<string | null>(null);

  const error = (state && "error" in state && state.error) || null;

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.book.toLowerCase().includes(q) ||
          r.who.toLowerCase().includes(q) ||
          r.text.toLowerCase().includes(q)
      )
    : rows;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <div className="mono" style={{ color: "var(--color-neutral-700)", padding: "28px 0" }}>
        NO REVIEWS HAVE BEEN REPORTED.
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mono" style={{ color: "var(--color-problem-text)", marginBottom: 14 }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18 }}>
        <input
          className="input"
          style={{ flex: 1, minHeight: 44 }}
          placeholder="Search reviews, books or readers"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <span className="mono" style={{ color: "var(--color-neutral-700)" }}>
          PAGE {currentPage + 1} OF {pageCount}
        </span>
        <button className="btn btn-secondary" onClick={() => setPage((p) => Math.max(0, p - 1))}>
          ←
        </button>
        <button className="btn btn-secondary" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>
          →
        </button>
      </div>
      <div style={{ borderTop: "3px solid var(--color-text)" }}>
        {pageRows.map((r) => {
          const isPending = r.openCount > 0;
          const flagLabel = isPending
            ? `Reported ×${r.openCount}`
            : r.status === "allowed"
              ? "Allowed"
              : "Deleted";
          const flagStyle = isPending ? FLAG_STYLE.pending : FLAG_STYLE[r.status];
          const reportersOpen = openReporters === r.id;

          return (
            <div key={r.id} className="qrow">
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span className="tag" style={flagStyle}>
                    {flagLabel}
                  </span>
                  {r.reporters.length > 0 && (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 12 }}
                      onClick={() => setOpenReporters(reportersOpen ? null : r.id)}
                    >
                      Who reported it?
                    </button>
                  )}
                  <span className="mono" style={{ color: "var(--color-neutral-700)" }}>
                    ON &ldquo;{r.book.toUpperCase()}&rdquo; · BY {r.who} · {r.when}
                  </span>
                </div>
                <div style={{ borderLeft: "5px solid var(--color-text)", paddingLeft: 12 }}>
                  <div className="mono" style={{ color: "var(--color-neutral-700)", marginBottom: 4 }}>
                    {r.stars}/5
                  </div>
                  <p style={{ fontSize: 14, margin: 0 }}>{r.text}</p>
                </div>
                {r.why && (
                  <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginTop: 8 }}>
                    {r.why}
                  </div>
                )}
                {reportersOpen && (
                  <div style={{ border: "3px solid var(--color-divider)", padding: 10, marginTop: 8 }}>
                    {r.reporters.map((rep, i) => (
                      <div key={i} style={{ fontSize: 13, marginBottom: 6 }}>
                        <b>{rep.who}</b> · {rep.reason} · <span className="mono">{rep.when}</span>
                        {rep.note && <div style={{ color: "var(--color-neutral-700)" }}>&ldquo;{rep.note}&rdquo;</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flex: "none", alignSelf: "center" }}>
                {isPending && (
                  <>
                    <form action={action}>
                      <input type="hidden" name="reviewId" value={r.id} />
                      <input type="hidden" name="decision" value="allowed" />
                      <button type="submit" className="btn btn-primary" disabled={pending}>
                        Allow
                      </button>
                    </form>
                    <form action={action}>
                      <input type="hidden" name="reviewId" value={r.id} />
                      <input type="hidden" name="decision" value="deleted" />
                      <button type="submit" className="btn btn-secondary" disabled={pending}>
                        Delete
                      </button>
                    </form>
                    <Link href={`/admin/users/${r.userId}`} className="btn btn-secondary">
                      View reader
                    </Link>
                  </>
                )}
                {!isPending && (
                  <form action={action}>
                    <input type="hidden" name="reviewId" value={r.id} />
                    <input type="hidden" name="decision" value="undo" />
                    <button type="submit" className="btn btn-ghost" disabled={pending}>
                      Undo
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
