"use client";

import { useState } from "react";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import { adminReviews, adminAccounts, requests, safeguarding } from "@/lib/mock";

/*
 * Ported from the `isAdminHome` block in Prototype with Admin.dc.html
 * (lines 424-483). Copy, structure and inline styles are taken directly
 * from there.
 *
 * The four counts and `allClear` are derived from the mock arrays the
 * same way the export's state does it (see the `pendingReviews` /
 * `pendingAccounts` / `pendingRequests` / `allClear` getters around line
 * 2164 of the source) rather than hardcoded, so this stays correct as
 * the queues below get actioned. The "Last seven days" table numbers
 * (128, 9, 41, 6) are literal in the export too — there's no history
 * data behind them yet — so they're kept as static text here.
 *
 * "Ban my own account" has no auth or ban API yet. It's a prototype-only
 * control (see the export's `banSelf` action) wired to local state just
 * so it's clickable; it doesn't actually gate anything.
 */
export default function AdminHomePage() {
  const [bannedSelf, setBannedSelf] = useState(false);

  const pendingReviews = adminReviews.filter((r) => r.status === "pending").length;
  const pendingAccounts = adminAccounts.filter((a) => a.status === "pending").length;
  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  const safeguardingCount = safeguarding.filter((x) => x.status === "open").length;
  const allClear =
    adminReviews.every((r) => r.status !== "pending") &&
    adminAccounts.every((a) => a.status !== "pending") &&
    requests.every((r) => r.status !== "pending");

  return (
    <>
      <AdminNav />
      <div className="wrap">
        <h1 style={{ fontSize: 40, margin: "0 0 20px" }}>What needs you</h1>

        <Link
          href="/admin/safeguarding"
          className="rowlink"
          style={{
            border: "3px solid var(--color-text)",
            background: "#C41031",
            color: "#EFECE3",
            boxShadow: "5px 5px 0 var(--color-text)",
            padding: 16,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontSize: 44, lineHeight: 1 }}>
            {safeguardingCount}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 19 }}>
              Safeguarding reports
            </div>
            <div className="mono" style={{ fontWeight: 700, marginTop: 3 }}>
              READERS WORRIED ABOUT SOMEONE&apos;S SAFETY — READ THESE FIRST
            </div>
          </div>
          <span className="tag" style={{ background: "#EFECE3", color: "#14110f", flex: "none" }}>
            Open queue
          </span>
        </Link>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 30 }}>
          <Link
            href="/admin/reviews"
            className="rowlink"
            style={{
              border: "3px solid var(--color-text)",
              background: "#ff3d9a",
              color: "#14110f",
              boxShadow: "5px 5px 0 var(--color-text)",
              padding: 16,
            }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 44, lineHeight: 1 }}>
              {pendingReviews}
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18 }}>
              Reviews to look at
            </div>
            <div className="mono" style={{ fontWeight: 700, marginTop: 4 }}>
              REPORTED AND AUTO-BLOCKED
            </div>
          </Link>
          <Link
            href="/admin/accounts"
            className="rowlink"
            style={{
              border: "3px solid var(--color-text)",
              background: "#ff3d9a",
              color: "#14110f",
              boxShadow: "5px 5px 0 var(--color-text)",
              padding: 16,
            }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 44, lineHeight: 1 }}>
              {pendingAccounts}
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18 }}>
              Accounts to look at
            </div>
            <div className="mono" style={{ fontWeight: 700, marginTop: 4 }}>
              REPORTED AND REFUSED NAMES
            </div>
          </Link>
          <Link
            href="/admin/requests"
            className="rowlink"
            style={{
              border: "3px solid var(--color-text)",
              background: "#ff3d9a",
              color: "#14110f",
              boxShadow: "5px 5px 0 var(--color-text)",
              padding: 16,
            }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 44, lineHeight: 1 }}>
              {pendingRequests}
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18 }}>
              Book requests
            </div>
            <div className="mono" style={{ fontWeight: 700, marginTop: 4 }}>
              WAITING ON A DECISION
            </div>
          </Link>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            border: "3px dashed var(--color-divider)",
            padding: "14px 16px",
            marginBottom: 26,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17 }}>
              Reported content stays live until you decide
            </div>
            <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 3 }}>
              NOTHING IS HIDDEN AUTOMATICALLY — A REPORT IS NOT A VERDICT
            </div>
          </div>
          <Link href="/admin/users" className="btn btn-secondary">
            Browse all users
          </Link>
          <Link href="/admin/catalogue" className="btn btn-secondary">
            Add a book
          </Link>
          <button className="btn btn-secondary" onClick={() => setBannedSelf((v) => !v)}>
            {bannedSelf ? "Lift ban on my own account" : "Ban my own account"}
          </button>
        </div>

        {allClear && (
          <div
            style={{
              border: "3px solid var(--color-text)",
              background: "#c6f24e",
              color: "#14110f",
              boxShadow: "5px 5px 0 var(--color-text)",
              padding: "18px 20px",
              marginBottom: 26,
            }}
          >
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20 }}>
              Every queue is empty
            </div>
            <p style={{ fontSize: 13, margin: "4px 0 0" }}>
              Nothing is waiting on you. Undo is still available on anything you cleared this
              session.
            </p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 }}>
          <div>
            <h4 style={{ margin: "0 0 10px" }}>Last seven days</h4>
            <table className="table">
              <tbody>
                <tr>
                  <td>Reviews posted</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    128
                  </td>
                </tr>
                <tr>
                  <td>Reviews auto-blocked by the filter</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    9
                  </td>
                </tr>
                <tr>
                  <td>New accounts</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    41
                  </td>
                </tr>
                <tr>
                  <td>Display names refused</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    6
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4 style={{ margin: "0 0 10px" }}>Watch the ratio</h4>
            <p style={{ fontSize: 14 }}>
              If refusals spike, the word list is too aggressive and you are turning away real
              readers. If reports spike, it is too loose. Neither number means much alone.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
