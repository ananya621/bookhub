"use client";

import { useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import AdminNav from "@/components/AdminNav";
import { adminAccounts } from "@/lib/mock";

type AccountStatus = "pending" | "allowed" | "deleted" | "renamed";

/*
 * Ported from the `isAdminAccounts` block in Prototype with Admin.dc.html
 * (lines 523-557). Allow/Delete/Undo/Force rename have no moderation API
 * yet, so they update local state optimistically (see the export's
 * `allow` / `del` / `rename` / `undo` actions around line 2202).
 *
 * "Force rename" is simplified: the export opens a dialog that captures
 * a replacement display name (`renaming` / `renameValue` state); that
 * dialog isn't built here, so this just marks the row renamed directly.
 *
 * "Open profile" links to /admin/users/[id], matching the export's
 * `openUser` (line ~2213, `screen: 'adminUser'` keyed on the account id).
 *
 * Deviation: a4 (zeni_reads) has status "clean" in the mock data, not
 * "pending" — it's shown as a control row, per its `why`: "NO ACTION
 * NEEDED — SHOWN FOR CONTEXT". The export's own flagLabel/flagStyle/done
 * ternaries (line ~2206) have no branch for "clean", so run verbatim
 * they'd mislabel it "Reported" with a pink tag and a live Undo button.
 * That reads as a bug rather than an intended nuance, so this port adds
 * an explicit "clean" branch: a neutral tag, no action buttons.
 */
export default function AdminAccountsPage() {
  const [rows, setRows] = useState(() =>
    adminAccounts.map((a) => ({ ...a, status: a.status as AccountStatus | "clean" })),
  );

  const setStatus = (id: string, status: AccountStatus) =>
    setRows((rs) => rs.map((a) => (a.id === id ? { ...a, status } : a)));

  return (
    <>
      <Nav />
      <Nav />
    <AdminNav />
      <div className="wrap">
        <h1 style={{ fontSize: 36, margin: "0 0 18px" }}>Accounts</h1>
        <div style={{ borderTop: "3px solid var(--color-text)" }}>
          {rows.map((a) => {
            const clean = a.status === "clean";
            const pending = a.status === "pending";
            const done = a.status === "allowed" || a.status === "deleted" || a.status === "renamed";
            const isName = a.flag === "name" && !done;
            const flagLabel = clean
              ? "No action needed"
              : a.status === "allowed"
                ? "Allowed"
                : a.status === "deleted"
                  ? "Deleted"
                  : a.status === "renamed"
                    ? "Rename forced"
                    : a.flag === "name"
                      ? "Name refused"
                      : "Reported";
            const flagStyle = clean
              ? { background: "transparent", color: "var(--color-neutral-700)", borderColor: "var(--color-divider)" }
              : a.status === "allowed" || a.status === "renamed"
                ? { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" }
                : a.status === "deleted"
                  ? { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" }
                  : a.flag === "name"
                    ? { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" }
                    : { background: "#ff3d9a", color: "#14110f", borderColor: "#14110f" };

            return (
              <div key={a.id} className="qrow" style={{ alignItems: "center" }}>
                <div
                  style={{
                    display: "inline-grid",
                    placeItems: "center",
                    width: 46,
                    height: 46,
                    flex: "none",
                    border: "3px solid var(--color-text)",
                    background: a.colour,
                    color: a.ink,
                    fontFamily: "var(--font-heading)",
                    fontWeight: 700,
                    fontSize: 20,
                  }}
                >
                  {a.name.slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18 }}>
                      {a.name}
                    </div>
                    <span className="tag" style={flagStyle}>
                      {flagLabel}
                    </span>
                  </div>
                  <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 4 }}>
                    JOINED {a.joined} · {a.meta}
                  </div>
                  <div
                    className="mono"
                    style={{ color: "var(--color-accent-700)", fontWeight: 700, marginTop: 4 }}
                  >
                    {a.why}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flex: "none", alignSelf: "center" }}>
                  {pending && (
                    <>
                      <button className="btn btn-primary" onClick={() => setStatus(a.id, "allowed")}>
                        Allow
                      </button>
                      {isName && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => setStatus(a.id, "renamed")}
                        >
                          Force rename
                        </button>
                      )}
                      <button className="btn btn-secondary" onClick={() => setStatus(a.id, "deleted")}>
                        Delete
                      </button>
                      <Link href={`/admin/users/${a.id}`} className="btn btn-secondary">
                        Open profile
                      </Link>
                    </>
                  )}
                  {done && (
                    <button className="btn btn-ghost" onClick={() => setStatus(a.id, "pending")}>
                      Undo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 16, lineHeight: 1.6 }}>
          DELETING AN ACCOUNT TAKES ITS REVIEWS AND LISTS WITH IT. IN THE BUILD THIS ASKS YOU TO
          TYPE THE DISPLAY NAME FIRST, AND SOFT-DELETES SO IT IS RECOVERABLE.
        </div>
      </div>
    </>
  );
}
