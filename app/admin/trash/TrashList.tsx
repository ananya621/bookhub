"use client";

import { useActionState, useState } from "react";
import {
  adminPurgeAccountNow,
  adminRestoreAccount,
  type ActionResult,
} from "@/app/actions/accounts";
import { daysLeft } from "@/lib/dates";

export type TrashRow = {
  userId: string;
  displayName: string | null;
  deletedBy: "self" | "admin";
  deletedAt: string;
  purgeAt: string;
};

export default function TrashList({ rows }: { rows: TrashRow[] }) {
  const [restoreState, restoreAction] = useActionState<ActionResult, FormData>(
    adminRestoreAccount,
    undefined
  );
  const [purgeState, purgeAction] = useActionState<ActionResult, FormData>(
    adminPurgeAccountNow,
    undefined
  );
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const error =
    (restoreState && "error" in restoreState && restoreState.error) ||
    (purgeState && "error" in purgeState && purgeState.error) ||
    null;

  return (
    <>
      {error && (
        <div className="mono" style={{ color: "var(--color-problem-text)", marginBottom: 14 }}>
          {error}
        </div>
      )}
      <div style={{ borderTop: "3px solid var(--color-text)" }}>
        {rows.map((t) => (
          <div key={t.userId} className="qrow" style={{ alignItems: "center" }}>
            <span className="tag tag-neutral" style={{ flex: "none" }}>
              Account
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16 }}>
                {t.displayName || "(no name set)"}
              </div>
              <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 3 }}>
                {t.deletedBy === "self" ? "Deleted by themselves" : "Deleted by an admin"} ·{" "}
                {new Date(t.deletedAt).toLocaleDateString()}
              </div>
            </div>
            <span className="tag" style={{ flex: "none", background: "#FFD400", color: "#14110f" }}>
              {daysLeft(t.purgeAt)} {daysLeft(t.purgeAt) === 1 ? "day left" : "days left"}
            </span>
            <div style={{ display: "flex", gap: 8, flex: "none" }}>
              <form action={restoreAction}>
                <input type="hidden" name="userId" value={t.userId} />
                <button type="submit" className="btn btn-primary">
                  Put it back
                </button>
              </form>
              {confirmingId === t.userId ? (
                <form action={purgeAction} style={{ display: "flex", gap: 8 }}>
                  <input type="hidden" name="userId" value={t.userId} />
                  <button type="submit" className="btn" style={{ background: "#C41031", color: "#EFECE3" }}>
                    Confirm
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirmingId(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <button className="btn btn-secondary" onClick={() => setConfirmingId(t.userId)}>
                  Delete for good
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
