"use client";

import { useActionState, useState } from "react";
import { deleteMyAccount, type ActionResult } from "@/app/actions/accounts";

/*
 * Split out of page.tsx so the page itself can be a server component.
 *
 * Now real: deleteMyAccount() bans the account for 14 days (recoverable
 * by an admin from /admin/trash) and signs out. See
 * supabase/migrations/20260902140000_recoverable_account_deletion.sql
 * for the design this implements.
 */
export default function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    deleteMyAccount,
    undefined
  );

  if (!confirming) {
    return (
      <button
        className="btn"
        style={{ background: "#C41031", color: "#EFECE3" }}
        onClick={() => setConfirming(true)}
      >
        Delete my account
      </button>
    );
  }

  return (
    <form action={formAction}>
      <p style={{ fontSize: 13, marginBottom: 10 }}>
        Are you sure? Your account is recoverable for 14 days, then it&apos;s gone for good.
      </p>
      {state !== undefined && "error" in state && (
        <div className="mono" style={{ color: "var(--color-problem-text)", marginBottom: 10 }}>
          {state.error}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn" style={{ background: "#C41031", color: "#EFECE3" }} disabled={pending}>
          {pending ? "Deleting…" : "Yes, delete my account"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
