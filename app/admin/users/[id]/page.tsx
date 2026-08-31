"use client";

import { use, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { adminAccounts, adminReviews } from "@/lib/mock";

type Account = (typeof adminAccounts)[number] & { banUntil?: string };
type Review = (typeof adminReviews)[number];

/*
 * Ported from the `isAdminUser` block in Prototype with Admin.dc.html
 * (lines 123-183). Source line ~2306 builds this screen from
 * `s.adminAccounts.find(x => x.id === s.adminUser)`; here the id comes
 * from the dynamic route segment instead. `params` is a Promise in
 * this Next.js version, unwrapped with `use()` since this needs to be
 * a Client Component for the ban/delete/allow buttons.
 *
 * The source's ban flow opens a shared confirm dialog with a duration
 * picker (`user.askBan` → `confirm: { kind: 'ban', ... }`, defined
 * around source line 2222 alongside the moderation queues) that lives
 * outside this port's scope. Ban and delete act immediately here
 * instead, using the confirm dialog's own default duration
 * ('1 week') rather than inventing a picker UI that isn't in this
 * block.
 *
 * State is local to this page — banning or deleting a review here
 * doesn't update /admin/users or the moderation queues, since there's
 * no shared store yet.
 */

const STATE_LABEL: Record<string, string> = {
  pending: "Reported — content still live",
  banned: "Banned",
  deleted: "Deleted",
  allowed: "Cleared",
  renamed: "Rename forced",
  warned: "Warned",
  clean: "No action needed",
};

const STATE_STYLE: Record<string, CSSProperties> = {
  pending: { background: "#ff3d9a", color: "#14110f", borderColor: "#14110f" },
  banned: { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" },
  deleted: { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" },
  allowed: { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" },
  renamed: { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" },
  warned: { background: "#FFD400", color: "#14110f", borderColor: "#14110f" },
  clean: { background: "transparent", color: "var(--color-text)", borderColor: "var(--color-text)" },
};

const REVIEW_STATE_STYLE: Record<string, CSSProperties> = {
  allowed: { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" },
  deleted: { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" },
  pending: { background: "#ff3d9a", color: "#14110f", borderColor: "#14110f" },
};

export default function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const initialAccount = adminAccounts.find((a) => a.id === id);
  if (!initialAccount) notFound();

  const [account, setAccount] = useState<Account>(initialAccount);
  const [reviews, setReviews] = useState<Review[]>(
    adminReviews.filter((r) => r.who === initialAccount.name)
  );

  const isBanned = account.status === "banned";
  const actionable = account.status !== "deleted";

  function ban() {
    // Local-only until there's an API — skips the shared ban-duration
    // dialog and applies its default ('1 week').
    setAccount((a) => ({ ...a, status: "banned", banUntil: "1 week" }));
  }
  function unban() {
    setAccount((a) => ({ ...a, status: "pending", banUntil: "" }));
  }
  function deleteAccount() {
    setAccount((a) => ({ ...a, status: "deleted" }));
  }
  function allowReview(reviewId: string) {
    setReviews((rs) => rs.map((r) => (r.id === reviewId ? { ...r, status: "allowed" } : r)));
  }
  function deleteReview(reviewId: string) {
    setReviews((rs) => rs.map((r) => (r.id === reviewId ? { ...r, status: "deleted" } : r)));
  }

  return (
    <>
      <AdminNav />
      <div className="wrap">
        <Link
          href="/admin/users"
          className="btn btn-ghost"
          style={{ marginBottom: 16, display: "inline-block" }}
        >
          ← All users
        </Link>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 8 }}>
          <div
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 64,
              height: 64,
              flex: "none",
              border: "3px solid var(--color-text)",
              background: account.colour,
              color: account.ink,
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              fontSize: 28,
            }}
          >
            {account.name.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 36, margin: "0 0 4px" }}>{account.name}</h1>
            <div className="mono" style={{ color: "var(--color-neutral-700)" }}>
              JOINED {account.joined} · {account.meta}
            </div>
            <div style={{ marginTop: 8 }}>
              <span className="tag" style={STATE_STYLE[account.status]}>
                {STATE_LABEL[account.status]}
              </span>
            </div>
          </div>
          {actionable && (
            <div style={{ display: "flex", gap: 8, flex: "none" }}>
              {isBanned && (
                <button className="btn btn-primary" onClick={unban}>
                  Lift the ban
                </button>
              )}
              <button className="btn btn-secondary" onClick={ban}>
                Ban account
              </button>
              <button className="btn btn-secondary" onClick={deleteAccount}>
                Delete account
              </button>
            </div>
          )}
        </div>
        {isBanned && (
          <div
            style={{
              background: "#C41031",
              color: "#EFECE3",
              border: "3px solid var(--color-text)",
              boxShadow: "4px 4px 0 var(--color-text)",
              padding: "12px 16px",
              margin: "12px 0 6px",
            }}
          >
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16 }}>
              Banned for {account.banUntil}
            </div>
            <p style={{ fontSize: 13, margin: "4px 0 0" }}>
              They cannot post reviews, share lists or request books until it lifts. Their existing
              reviews stay visible unless you delete them individually.
            </p>
          </div>
        )}
        <div
          className="mono"
          style={{ color: "var(--color-accent-700)", fontWeight: 700, margin: "18px 0 10px" }}
        >
          {account.why}
        </div>
        <h4 style={{ margin: "0 0 10px" }}>Their reviews</h4>
        {reviews.length === 0 ? (
          <div style={{ border: "3px dashed var(--color-divider)", padding: 26, textAlign: "center" }}>
            <div className="mono" style={{ color: "var(--color-neutral-700)" }}>
              NOTHING POSTED YET
            </div>
          </div>
        ) : (
          <div style={{ borderTop: "3px solid var(--color-text)" }}>
            {reviews.map((r) => {
              const live = r.status === "pending" && account.status !== "deleted";
              const rLabel =
                r.status === "allowed" ? "Allowed" : r.status === "deleted" ? "Deleted" : "Still live";
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
                      <span className="tag" style={REVIEW_STATE_STYLE[r.status]}>
                        {rLabel}
                      </span>
                      <span className="mono" style={{ color: "var(--color-neutral-700)" }}>
                        ON &ldquo;{r.book.toUpperCase()}&rdquo; · {r.when} · {r.stars}/5
                      </span>
                    </div>
                    <div style={{ borderLeft: "5px solid var(--color-text)", paddingLeft: 12 }}>
                      <p style={{ fontSize: 14, margin: 0 }}>{r.text}</p>
                    </div>
                    <div
                      className="mono"
                      style={{ color: "var(--color-accent-700)", fontWeight: 700, marginTop: 8 }}
                    >
                      {r.why}
                    </div>
                  </div>
                  {live && (
                    <div style={{ display: "flex", gap: 8, flex: "none", alignSelf: "center" }}>
                      <button className="btn btn-primary" onClick={() => allowReview(r.id)}>
                        Allow
                      </button>
                      <button className="btn btn-secondary" onClick={() => deleteReview(r.id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 16, lineHeight: 1.6 }}>
          REPORTED CONTENT STAYS VISIBLE TO READERS UNTIL YOU DECIDE — NOTHING IS HIDDEN
          AUTOMATICALLY.
        </div>
      </div>
    </>
  );
}
