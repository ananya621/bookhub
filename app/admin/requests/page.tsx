"use client";

import { useState } from "react";
import AdminNav from "@/components/AdminNav";
import { requests } from "@/lib/mock";

type RequestStatus = "pending" | "approved" | "declined";

/*
 * Decline reasons + their canned default text, lifted verbatim from the
 * export's `declineReasons` state (Prototype with Admin.dc.html,
 * ~line 2550). Picking a reason swaps in its default text; "Other"
 * starts blank.
 */
const DECLINE_REASONS: { label: string; text: string }[] = [
  {
    label: "Too old for the catalogue",
    text: "This one is written for older readers and we keep the catalogue to Middle Grade and Young Adult. Ask your school library about it.",
  },
  {
    label: "Couldn’t find it",
    text: "We could not find this one in the book database we use. Double-check the spelling of the title and author and send it again.",
  },
  {
    label: "Already on the site",
    text: "Good news — this one is already here. Search for it and it should come up.",
  },
  { label: "Other", text: "" },
];

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
};
const STATUS_STYLE: Record<RequestStatus, { background: string; color: string; borderColor: string }> = {
  pending: { background: "#ff3d9a", color: "#14110f", borderColor: "#14110f" },
  approved: { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" },
  declined: { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" },
};

/*
 * Ported from the `isAdminRequests` block in Prototype with Admin.dc.html
 * (lines 558-605). Approve/decline have no request API yet, so they
 * update local state optimistically (see the export's `approve` /
 * `sendDecline` / `undo` actions around line 2525).
 *
 * The decline flow (reason radios + free text) is ported as inline local
 * state on the row rather than a modal, per this task's brief — there's
 * only ever one row declining at a time, tracked by index.
 *
 * The requests in lib/mock.ts have no `id`, so rows are keyed on title
 * (unique across the three seeded entries) and actions close over the
 * array index.
 */
export default function AdminRequestsPage() {
  const [rows, setRows] = useState(() =>
    requests.map((r) => ({ ...r, status: r.status as RequestStatus })),
  );
  const [decliningIdx, setDecliningIdx] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState(DECLINE_REASONS[0].label);
  const [declineText, setDeclineText] = useState(DECLINE_REASONS[0].text);

  const approve = (i: number) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, status: "approved", reason: "" } : r)));

  const startDecline = (i: number) => {
    setDecliningIdx(i);
    setDeclineReason(DECLINE_REASONS[0].label);
    setDeclineText(DECLINE_REASONS[0].text);
  };

  const cancelDecline = () => setDecliningIdx(null);

  const pickReason = (label: string) => {
    setDeclineReason(label);
    setDeclineText(DECLINE_REASONS.find((d) => d.label === label)?.text ?? "");
  };

  const sendDecline = () => {
    if (decliningIdx === null) return;
    const idx = decliningIdx;
    setRows((rs) => rs.map((r, j) => (j === idx ? { ...r, status: "declined", reason: declineText } : r)));
    setDecliningIdx(null);
  };

  const undo = (i: number) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, status: "pending", reason: "" } : r)));

  return (
    <>
      <AdminNav />
      <div className="wrap">
        <h1 style={{ fontSize: 36, margin: "0 0 18px" }}>Book requests</h1>
        <div style={{ borderTop: "3px solid var(--color-text)" }}>
          {rows.map((q, i) => {
            const pending = q.status === "pending";
            const decided = q.status !== "pending";
            const hasReason = !!q.reason;
            const isDeclining = decliningIdx === i;

            return (
              <div key={q.title} className="qrow" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div className="cover" style={{ width: 44, height: 64, flex: "none" }}>
                    <span className="mono">API</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18 }}>
                      {q.title}
                    </div>
                    <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 4 }}>
                      {(q.author || "AUTHOR NOT GIVEN").toUpperCase()}
                    </div>
                    {hasReason && <p style={{ fontSize: 13, margin: "6px 0 0" }}>{q.reason}</p>}
                  </div>
                  <span className="tag" style={STATUS_STYLE[q.status]}>
                    {STATUS_LABEL[q.status]}
                  </span>
                  {pending && (
                    <div style={{ display: "flex", gap: 8, flex: "none" }}>
                      <button className="btn btn-primary" onClick={() => approve(i)}>
                        Approve &amp; import
                      </button>
                      <button className="btn btn-secondary" onClick={() => startDecline(i)}>
                        Decline
                      </button>
                    </div>
                  )}
                  {decided && (
                    <button className="btn btn-ghost" style={{ flex: "none" }} onClick={() => undo(i)}>
                      Undo
                    </button>
                  )}
                </div>
                {isDeclining && (
                  <div style={{ border: "3px solid var(--color-text)", background: "var(--color-accent-100)", padding: 14 }}>
                    <div
                      className="mono"
                      style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 10 }}
                    >
                      WHY ARE YOU DECLINING? THE READER SEES THIS WORD FOR WORD
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                      {DECLINE_REASONS.map((d) => (
                        <label
                          key={d.label}
                          className="radio"
                          style={{
                            flex: "none",
                            border: "3px solid var(--color-divider)",
                            padding: "8px 12px",
                            minHeight: 42,
                            background: "var(--color-bg)",
                          }}
                        >
                          <input
                            type="radio"
                            name="dr"
                            checked={declineReason === d.label}
                            onChange={() => pickReason(d.label)}
                          />
                          <span className="dot" />
                          {d.label}
                        </label>
                      ))}
                    </div>
                    <textarea
                      className="input"
                      style={{ minHeight: 70 }}
                      value={declineText}
                      onChange={(e) => setDeclineText(e.target.value)}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button className="btn btn-primary" onClick={sendDecline}>
                        Send decline
                      </button>
                      <button className="btn btn-secondary" onClick={cancelDecline}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 16, lineHeight: 1.6 }}>
          APPROVING OR DECLINING HERE UPDATES THE READER&apos;S OWN “BOOKS YOU&apos;VE ASKED FOR”
          SCREEN — ONE DATA MODEL, TWO VIEWS. GO TO PROFILE → SEE MY REQUESTS TO CHECK.
        </div>
      </div>
    </>
  );
}
