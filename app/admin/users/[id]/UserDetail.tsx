"use client";

import { useActionState, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { adminDeleteAccount, adminRestoreAccount, type ActionResult } from "@/app/actions/accounts";
import { adminModerateReview, type ActionResult as ReviewActionResult } from "@/app/actions/reviews";

export type UserReview = {
  id: string;
  book: string;
  stars: number;
  text: string;
  when: string;
  status: "allowed" | "deleted";
  openCount: number;
  why: string;
};

type Account = {
  id: string;
  displayName: string | null;
  avatarColor: string;
  joined: string;
  isAdmin: boolean;
  isSelf: boolean;
  pending: { deletedBy: "self" | "admin"; deletedAt: string; purgeAt: string } | null;
};

const REVIEW_STATE_STYLE: Record<string, CSSProperties> = {
  allowed: { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" },
  deleted: { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" },
  pending: { background: "#ff3d9a", color: "#14110f", borderColor: "#14110f" },
};

function daysLeft(purgeAt: string): number {
  const ms = new Date(purgeAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function UserDetail({
  account,
  initialReviews,
}: {
  account: Account;
  initialReviews: UserReview[];
}) {
  const [deleteState, deleteAction] = useActionState<ActionResult, FormData>(
    adminDeleteAccount,
    undefined
  );
  const [restoreState, restoreAction] = useActionState<ActionResult, FormData>(
    adminRestoreAccount,
    undefined
  );
  const [reviewState, reviewAction, reviewPending] = useActionState<ReviewActionResult, FormData>(
    adminModerateReview,
    undefined
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const reviews = initialReviews;

  const error =
    (deleteState && "error" in deleteState && deleteState.error) ||
    (restoreState && "error" in restoreState && restoreState.error) ||
    (reviewState && "error" in reviewState && reviewState.error) ||
    null;

  return (
    <>
      <Link href="/admin/users" className="btn btn-ghost" style={{ marginBottom: 16, display: "inline-block" }}>
        ← All users
      </Link>

      {error && (
        <div className="mono" style={{ color: "var(--color-problem-text)", marginBottom: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 10 }}>
        <div
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: 64,
            height: 64,
            flex: "none",
            border: "3px solid var(--color-text)",
            background: account.avatarColor,
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: 28,
          }}
        >
          {(account.displayName || "?").slice(0, 1).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 36, margin: "0 0 4px" }}>{account.displayName || "(no name set yet)"}</h1>
          <div className="mono" style={{ color: "var(--color-neutral-700)" }}>
            JOINED {new Date(account.joined).toLocaleDateString()}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            {account.isAdmin && <span className="tag tag-accent">Admin</span>}
            {account.isSelf && <span className="tag tag-neutral">You</span>}
            {account.pending && (
              <span className="tag" style={{ background: "#FFD400", color: "#14110f" }}>
                Pending deletion · {daysLeft(account.pending.purgeAt)}d left
              </span>
            )}
          </div>
        </div>
        {!account.isSelf && (
          <div style={{ display: "flex", gap: 8, flex: "none" }}>
            {account.pending ? (
              <form action={restoreAction}>
                <input type="hidden" name="userId" value={account.id} />
                <button type="submit" className="btn btn-primary">
                  Lift the ban
                </button>
              </form>
            ) : confirmingDelete ? (
              <form action={deleteAction} style={{ display: "flex", gap: 8 }}>
                <input type="hidden" name="userId" value={account.id} />
                <button type="submit" className="btn" style={{ background: "#C41031", color: "#EFECE3" }}>
                  Confirm delete
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <button className="btn btn-secondary" title="Not built yet — flags a display name as impersonation/refused and forces a new one" disabled>
                  Force rename
                </button>
                <button className="btn btn-secondary" title="Not built yet — a separate, temporary restriction, distinct from Delete" disabled>
                  Ban account
                </button>
                <button className="btn btn-secondary" onClick={() => setConfirmingDelete(true)}>
                  Delete account
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {account.pending && (
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
            {account.pending.deletedBy === "self" ? "They deleted their own account" : "Deleted by an admin"} ·{" "}
            {daysLeft(account.pending.purgeAt)} days left
          </div>
          <p style={{ fontSize: 13, margin: "4px 0 0" }}>
            They cannot sign in until this is undone. Gone for good once the days run out.
          </p>
        </div>
      )}

      <h4 style={{ margin: "18px 0 10px" }}>Their reviews</h4>
      {reviews.length === 0 ? (
        <div style={{ border: "3px dashed var(--color-divider)", padding: 26, textAlign: "center" }}>
          <div className="mono" style={{ color: "var(--color-neutral-700)" }}>
            NOTHING POSTED YET
          </div>
        </div>
      ) : (
        <div style={{ borderTop: "3px solid var(--color-text)" }}>
          {reviews.map((r) => {
            const live = r.openCount > 0;
            const rLabel = live ? `Reported ×${r.openCount}` : r.status === "allowed" ? "Allowed" : "Deleted";
            const rStyle = live ? REVIEW_STATE_STYLE.pending : REVIEW_STATE_STYLE[r.status];
            return (
              <div key={r.id} className="qrow">
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className="tag" style={rStyle}>
                      {rLabel}
                    </span>
                    <span className="mono" style={{ color: "var(--color-neutral-700)" }}>
                      ON &ldquo;{r.book.toUpperCase()}&rdquo; · {r.when} · {r.stars}/5
                    </span>
                  </div>
                  <div style={{ borderLeft: "5px solid var(--color-text)", paddingLeft: 12 }}>
                    <p style={{ fontSize: 14, margin: 0 }}>{r.text}</p>
                  </div>
                  {r.why && (
                    <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginTop: 8 }}>
                      {r.why}
                    </div>
                  )}
                </div>
                {live && (
                  <div style={{ display: "flex", gap: 8, flex: "none", alignSelf: "center" }}>
                    <form action={reviewAction}>
                      <input type="hidden" name="reviewId" value={r.id} />
                      <input type="hidden" name="decision" value="allowed" />
                      <button type="submit" className="btn btn-primary" disabled={reviewPending}>
                        Allow
                      </button>
                    </form>
                    <form action={reviewAction}>
                      <input type="hidden" name="reviewId" value={r.id} />
                      <input type="hidden" name="decision" value="deleted" />
                      <button type="submit" className="btn btn-secondary" disabled={reviewPending}>
                        Delete
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 16, lineHeight: 1.7 }}>
        REPORTED CONTENT STAYS VISIBLE TO READERS UNTIL YOU DECIDE — NOTHING IS HIDDEN AUTOMATICALLY.
        A REPORT IS NOT A VERDICT.
      </div>
    </>
  );
}
