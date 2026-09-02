"use client";

import { useActionState, useState } from "react";
import { adminDeleteAccount, adminRestoreAccount, type ActionResult } from "@/app/actions/accounts";

export type AccountRow = {
  id: string;
  displayName: string | null;
  avatarColor: string;
  joined: string;
  isAdmin: boolean;
  isSelf: boolean;
  pending: { deletedBy: "self" | "admin"; deletedAt: string; purgeAt: string } | null;
};

function daysLeft(purgeAt: string): number {
  const ms = new Date(purgeAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function AccountsList({ accounts }: { accounts: AccountRow[] }) {
  const [deleteState, deleteAction] = useActionState<ActionResult, FormData>(
    adminDeleteAccount,
    undefined
  );
  const [restoreState, restoreAction] = useActionState<ActionResult, FormData>(
    adminRestoreAccount,
    undefined
  );
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const error =
    (deleteState && "error" in deleteState && deleteState.error) ||
    (restoreState && "error" in restoreState && restoreState.error) ||
    null;

  if (accounts.length === 0) {
    return (
      <div className="mono" style={{ color: "var(--color-neutral-700)", padding: "28px 0" }}>
        NO ACCOUNTS YET.
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
      <div style={{ borderTop: "3px solid var(--color-text)" }}>
        {accounts.map((a) => (
          <div key={a.id} className="qrow" style={{ alignItems: "center" }}>
            <div
              style={{
                display: "inline-grid",
                placeItems: "center",
                width: 46,
                height: 46,
                flex: "none",
                border: "3px solid var(--color-text)",
                background: a.avatarColor,
              }}
            >
              {(a.displayName || "?").slice(0, 1).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18 }}>
                  {a.displayName || "(no name set yet)"}
                </div>
                {a.isAdmin && <span className="tag tag-accent">Admin</span>}
                {a.isSelf && <span className="tag tag-neutral">You</span>}
                {a.pending && (
                  <span className="tag" style={{ background: "#FFD400", color: "#14110f" }}>
                    Pending deletion · {daysLeft(a.pending.purgeAt)}d left
                  </span>
                )}
              </div>
              <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 4 }}>
                JOINED {new Date(a.joined).toLocaleDateString()}
              </div>
            </div>
            {!a.isSelf && (
              <div style={{ display: "flex", gap: 8, flex: "none" }}>
                {a.pending ? (
                  <form action={restoreAction}>
                    <input type="hidden" name="userId" value={a.id} />
                    <button type="submit" className="btn btn-primary">
                      Put it back
                    </button>
                  </form>
                ) : confirmingId === a.id ? (
                  <form action={deleteAction} style={{ display: "flex", gap: 8 }}>
                    <input type="hidden" name="userId" value={a.id} />
                    <button type="submit" className="btn" style={{ background: "#C41031", color: "#EFECE3" }}>
                      Confirm delete
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setConfirmingId(null)}>
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button className="btn btn-secondary" onClick={() => setConfirmingId(a.id)}>
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
