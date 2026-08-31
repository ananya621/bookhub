"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import AdminNav from "@/components/AdminNav";
import { safeguarding } from "@/lib/mock";

/*
 * Ported from the `isAdminSafeguarding` block in Prototype with Admin
 * .dc.html (lines 211-238). This queue is deliberately kept apart from
 * the ordinary moderation queues (source comment: "safeguarding, kept
 * out of the ordinary queues on purpose") and carries its own red
 * banner and copy — ported verbatim, not softened.
 *
 * "Mark as actioned" only flips local state here; the source is
 * explicit that it records something done outside the app (told a
 * safeguarding lead, contacted a school), not a moderation decision.
 */

export default function AdminSafeguardingPage() {
  const [cases, setCases] = useState(safeguarding);

  function action(id: string) {
    setCases((cs) => cs.map((x) => (x.id === id ? { ...x, status: "done" } : x)));
  }
  function undo(id: string) {
    setCases((cs) => cs.map((x) => (x.id === id ? { ...x, status: "open" } : x)));
  }

  return (
    <>
      <Nav />
      <Nav />
    <AdminNav />
      <div className="wrap">
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
        <div style={{ borderTop: "3px solid var(--color-text)" }}>
          {cases.map((x) => {
            const open = x.status === "open";
            return (
              <div key={x.id} className="qrow">
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                      flexWrap: "wrap",
                    }}
                  >
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
                  {open ? (
                    <button className="btn btn-primary" onClick={() => action(x.id)}>
                      Mark as actioned
                    </button>
                  ) : (
                    <button className="btn btn-ghost" onClick={() => undo(x.id)}>
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 16, lineHeight: 1.7 }}>
          &ldquo;MARK AS ACTIONED&rdquo; MEANS YOU HAVE DONE SOMETHING OUTSIDE THIS APP — TOLD A
          SAFEGUARDING LEAD, CONTACTED A SCHOOL, OR ESCALATED. IT IS NOT A MODERATION DECISION.
        </div>
      </div>
    </>
  );
}
