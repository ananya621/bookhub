"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { declineRequest, type ActionResult } from "@/app/actions/books";

/*
 * The rows and their actions. Split out from the page so the page can
 * stay a server component and read the queue from the database.
 *
 * "Find & import" replaces what used to be an inline approve-with-
 * genres form here — that called approve_book_request(), which built
 * the book straight from the request's own stored fields with no
 * chance to correct them. The updated design moves approval into the
 * catalogue's Step 1/Step 2 flow instead (see ImportBook.tsx), so an
 * admin can fix a wrong title, add a cover, correct genres, before it
 * goes live — and the catalogue page settles the request afterwards via
 * link_book_to_request(). approve_book_request() is left in the
 * database unused rather than removed, in case something else still
 * expects it.
 *
 * Decline reasons come from the export (line 2550). The reader is shown
 * whichever is picked, so it can never be left blank.
 */

export type QueueRow = {
  id: string;
  title: string;
  author: string;
  pages: number | null;
  summary: string | null;
  coverUrl: string | null;
  note: string | null;
  status: "pending" | "approved" | "declined";
  declineReason: string | null;
  askedBy: number;
};

const DECLINE_REASONS = [
  "Too old for the catalogue",
  "Couldn’t find it",
  "Already on the site",
  "Other",
];

const STATUS_STYLE: Record<QueueRow["status"], React.CSSProperties> = {
  pending: { borderColor: "#14110f" },
  approved: { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" },
  declined: { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" },
};

const STATUS_LABEL: Record<QueueRow["status"], string> = {
  pending: "Waiting",
  approved: "Added",
  declined: "Declined",
};

export default function RequestQueue({ rows }: { rows: QueueRow[] }) {
  const [declineState, declineAction, declining] = useActionState<ActionResult, FormData>(
    declineRequest,
    undefined
  );

  const [openDecline, setOpenDecline] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="mono" style={{ color: "var(--color-neutral-700)", padding: "28px 0" }}>
        NOBODY HAS ASKED FOR A BOOK YET.
      </div>
    );
  }

  const error = (declineState && "error" in declineState && declineState.error) || null;

  return (
    <>
      {error && (
        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 14 }}>
          {error}
        </div>
      )}

      <div style={{ borderTop: "3px solid var(--color-text)" }}>
        {rows.map((r) => (
          <div key={r.id} className="qrow" style={{ alignItems: "flex-start" }}>
            {r.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.coverUrl}
                alt=""
                style={{ width: 48, height: 70, objectFit: "cover", flex: "none", border: "3px solid var(--color-text)" }}
              />
            ) : (
              <div className="cover" style={{ width: 48, height: 70, flex: "none" }} />
            )}

            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17 }}>
                {r.title}
              </div>
              <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 3 }}>
                {(r.author || "unknown author").toUpperCase()}
                {r.pages ? ` · ${r.pages} PAGES` : ""}
                {" · "}
                {/* The count is the point of merging duplicate requests. */}
                <strong>
                  {r.askedBy} {r.askedBy === 1 ? "PERSON ASKED" : "PEOPLE ASKED"}
                </strong>
              </div>

              {r.note && (
                <p style={{ fontSize: 14, marginTop: 8 }}>
                  <span className="mono" style={{ color: "var(--color-neutral-700)" }}>
                    THEY SAID:{" "}
                  </span>
                  {r.note}
                </p>
              )}

              {r.status === "declined" && r.declineReason && (
                <p className="mono" style={{ color: "var(--color-problem-text)", marginTop: 8 }}>
                  DECLINED — {r.declineReason.toUpperCase()}
                </p>
              )}

              {r.status === "pending" && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link
                      href={`/admin/catalogue?q=${encodeURIComponent(r.title)}&requestId=${r.id}`}
                      className="btn btn-primary"
                    >
                      Find &amp; import
                    </Link>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setOpenDecline(openDecline === r.id ? null : r.id)}
                    >
                      Decline
                    </button>
                  </div>

                  {openDecline === r.id && (
                    <form
                      action={declineAction}
                      style={{
                        marginTop: 12,
                        borderTop: "3px solid var(--color-divider)",
                        paddingTop: 12,
                      }}
                    >
                      <input type="hidden" name="requestId" value={r.id} />
                      <div
                        className="mono"
                        style={{ color: "var(--color-neutral-700)", marginBottom: 6 }}
                      >
                        WHY? THE READER SEES THIS.
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                        {DECLINE_REASONS.map((d, i) => (
                          <label key={d} className="radio">
                            <input type="radio" name="reason" value={d} defaultChecked={i === 0} />
                            <span className="dot" />
                            {d}
                          </label>
                        ))}
                      </div>
                      <button type="submit" className="btn btn-secondary" disabled={declining}>
                        {declining ? "Declining…" : "Send decline"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            <span className="tag" style={{ ...STATUS_STYLE[r.status], flex: "none" }}>
              {STATUS_LABEL[r.status]}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
