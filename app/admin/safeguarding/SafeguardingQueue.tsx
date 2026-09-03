"use client";

import { useActionState } from "react";
import { adminSetReportStatus, type ActionResult } from "@/app/actions/reports";

/*
 * Ported from the `isAdminSafeguarding` block in Prototype with Admin
 * .dc.html (lines 211-238), split out from the page so it can stay a
 * server component. "Mark as actioned" records something done outside
 * the app (told a safeguarding lead, contacted a school), not a
 * moderation decision — same banner copy as before this rewrite,
 * unchanged.
 */

export type CaseRow = {
  id: string;
  who: string;
  target: string;
  when: string;
  text: string;
  status: "open" | "actioned";
};

export default function SafeguardingQueue({ cases }: { cases: CaseRow[] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(adminSetReportStatus, undefined);
  const error = (state && "error" in state && state.error) || null;

  return (
    <>
      <div
        style={{
          background: "#C41031",
          color: "#EFECE3",
          border: "3px solid var(--color-text)",
          boxShadow: "5px 5px 0 var(--color-text)",
          padding: "18px 20px",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 34, margin: "0 0 6px" }}>Safeguarding</h1>
        <p style={{ fontSize: 14, margin: 0 }}>
          These are reports where a reader said they were worried about someone&apos;s safety.
          They are kept out of the ordinary queues so they never wait behind spam. Read them
          first, every time.
        </p>
      </div>
      {error && (
        <div className="mono" style={{ color: "var(--color-problem-text)", marginBottom: 14 }}>
          {error}
        </div>
      )}
      {cases.length === 0 ? (
        <div style={{ border: "3px dashed var(--color-divider)", padding: 26, textAlign: "center" }}>
          <div className="mono" style={{ color: "var(--color-neutral-700)" }}>
            NOTHING HERE
          </div>
        </div>
      ) : (
        <div style={{ borderTop: "3px solid var(--color-text)" }}>
          {cases.map((x) => {
            const open = x.status === "open";
            return (
              <div key={x.id} className="qrow">
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span
                      className="tag"
                      style={
                        open
                          ? { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" }
                          : { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" }
                      }
                    >
                      {open ? "Open" : "Actioned"}
                    </span>
                    <span className="mono" style={{ color: "var(--color-neutral-700)" }}>
                      FROM {x.who} · ABOUT {x.target} · {x.when}
                    </span>
                  </div>
                  <div style={{ borderLeft: "5px solid #C41031", paddingLeft: 12 }}>
                    <p style={{ fontSize: 14, margin: 0 }}>{x.text}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flex: "none", alignSelf: "center" }}>
                  <form action={action}>
                    <input type="hidden" name="reportId" value={x.id} />
                    <input type="hidden" name="status" value={open ? "actioned" : "open"} />
                    <button type="submit" className={open ? "btn btn-primary" : "btn btn-ghost"} disabled={pending}>
                      {open ? "Mark as actioned" : "Reopen"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 16, lineHeight: 1.7 }}>
        &ldquo;MARK AS ACTIONED&rdquo; MEANS YOU HAVE DONE SOMETHING OUTSIDE THIS APP — TOLD A
        SAFEGUARDING LEAD, CONTACTED A SCHOOL, OR ESCALATED. IT IS NOT A MODERATION DECISION.
      </div>
    </>
  );
}
