"use client";

import { useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import AdminNav from "@/components/AdminNav";
import { adminReviews, adminAccounts } from "@/lib/mock";

type ReviewStatus = "pending" | "allowed" | "deleted";

/*
 * The "Who reported it?" list is lifted verbatim from the export's
 * showReporters handler (state definition around line 2176 of
 * Prototype with Admin.dc.html) — it's not in lib/mock.ts, because the
 * isAdminReviews markup block (484-522) only carries a `reports` count
 * and a `why` summary per review. Kept here and sliced to
 * `Math.max(1, reports)` the same way the export does, per PORTING.md's
 * "derive it locally" fallback.
 */
const REPORTERS = [
  { who: "zeni_reads", reason: "Rude or unkind to other readers", when: "3 DAYS AGO", note: "calling people idiots for liking a book" },
  { who: "ines_p", reason: "Nothing to do with the book", when: "3 DAYS AGO", note: "this is just having a go at people, it says nothing about the story" },
  { who: "kofi_a", reason: "Spam or advertising", when: "2 DAYS AGO", note: "" },
  { who: "tomasb", reason: "Bad language or slurs", when: "YESTERDAY", note: "not swearing exactly but really nasty" },
];

/*
 * Ported from the `isAdminReviews` block in Prototype with Admin.dc.html
 * (lines 484-522). Allow/Delete/Undo have no moderation API yet, so they
 * update local state optimistically (see the export's `allow` / `del` /
 * `undo` actions around line 2189).
 *
 * "View reader" resolves the reviewer's username against adminAccounts
 * to link to /admin/users/[id], matching the export's `openUser`
 * (line ~2192, `s.adminAccounts.find(x => x.name === r.who)`). Falls
 * back to the users list if no matching account exists in the mock data.
 *
 * Keep an eye on r2 and r4 below: r2 is auto-blocked by the word filter
 * but flagged as a likely false positive, and r4 is reported but its
 * text is innocuous. The `why` line under each review is there so both
 * are judgeable rather than auto-actioned.
 */
export default function AdminReviewsPage() {
  const [rows, setRows] = useState(() =>
    adminReviews.map((r) => ({ ...r, status: r.status as ReviewStatus })),
  );
  const [search, setSearch] = useState("");
  const [openReporters, setOpenReporters] = useState<string | null>(null);

  const setStatus = (id: string, status: ReviewStatus) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.book.toLowerCase().includes(q) ||
          r.who.toLowerCase().includes(q) ||
          r.text.toLowerCase().includes(q),
      )
    : rows;

  return (
    <>
      <Nav />
      <Nav />
    <AdminNav />
      <div className="wrap">
        <h1 style={{ fontSize: 36, margin: "0 0 18px" }}>Reviews</h1>
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <input
            className="input"
            style={{ flex: 1, minHeight: 44 }}
            placeholder="Search reviews, books or readers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ borderTop: "3px solid var(--color-text)" }}>
          {filtered.map((r) => {
            const pending = r.status === "pending";
            const done = !pending;
            const flagLabel =
              r.status === "allowed"
                ? "Allowed"
                : r.status === "deleted"
                  ? "Deleted"
                  : r.flag === "blocked"
                    ? "Auto-blocked"
                    : `Reported ×${r.reports}`;
            const flagStyle =
              r.status === "allowed"
                ? { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" }
                : r.status === "deleted"
                  ? { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" }
                  : r.flag === "blocked"
                    ? { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" }
                    : { background: "#ff3d9a", color: "#14110f", borderColor: "#14110f" };
            const hasReporters = r.reports > 0 && pending;
            const reportersOpen = openReporters === r.id;

            return (
              <div key={r.id} className="qrow">
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
                    <span className="tag" style={flagStyle}>
                      {flagLabel}
                    </span>
                    {hasReporters && (
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 12 }}
                        onClick={() => setOpenReporters(reportersOpen ? null : r.id)}
                      >
                        Who reported it?
                      </button>
                    )}
                    <span className="mono" style={{ color: "var(--color-neutral-700)" }}>
                      ON “{r.book.toUpperCase()}” · BY {r.who} · {r.when}
                    </span>
                  </div>
                  <div style={{ borderLeft: "5px solid var(--color-text)", paddingLeft: 12 }}>
                    <div className="mono" style={{ color: "var(--color-neutral-700)", marginBottom: 4 }}>
                      {r.stars}/5
                    </div>
                    <p style={{ fontSize: 14, margin: 0 }}>{r.text}</p>
                  </div>
                  <div
                    className="mono"
                    style={{ color: "var(--color-accent-700)", fontWeight: 700, marginTop: 8 }}
                  >
                    {r.why}
                  </div>
                  {reportersOpen && (
                    <div style={{ border: "3px solid var(--color-divider)", padding: 10, marginTop: 8 }}>
                      {REPORTERS.slice(0, Math.max(1, r.reports)).map((rep) => (
                        <div key={rep.who} style={{ fontSize: 13, marginBottom: 6 }}>
                          <b>{rep.who}</b> · {rep.reason} ·{" "}
                          <span className="mono">{rep.when}</span>
                          {rep.note && (
                            <div style={{ color: "var(--color-neutral-700)" }}>“{rep.note}”</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flex: "none", alignSelf: "center" }}>
                  {pending && (
                    <>
                      <button className="btn btn-primary" onClick={() => setStatus(r.id, "allowed")}>
                        Allow
                      </button>
                      <button className="btn btn-secondary" onClick={() => setStatus(r.id, "deleted")}>
                        Delete
                      </button>
                      <Link
                        href={
                          adminAccounts.find((a) => a.name === r.who)
                            ? `/admin/users/${adminAccounts.find((a) => a.name === r.who)!.id}`
                            : "/admin/users"
                        }
                        className="btn btn-secondary"
                      >
                        View reader
                      </Link>
                    </>
                  )}
                  {done && (
                    <button className="btn btn-ghost" onClick={() => setStatus(r.id, "pending")}>
                      Undo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
