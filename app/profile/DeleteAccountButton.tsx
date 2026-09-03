"use client";

import { useActionState, useState } from "react";
import { deleteMyAccount, type ActionResult } from "@/app/actions/accounts";

/*
 * Split out of page.tsx so the page itself can be a server component.
 *
 * Real: deleteMyAccount() bans the account for 14 days (recoverable by
 * an admin from /admin/trash) and signs out. See
 * supabase/migrations/20260902140000_recoverable_account_deletion.sql
 * for the design this implements.
 *
 * The confirmation used to be a plain inline swap (button turns into a
 * paragraph and two buttons in place). Rebuilt as G3's third dialog —
 * "Check before you act" / "Delete your account?" — using the same
 * dialog-backdrop/dialog shell as the report and add-to-list dialogs on
 * /book/[id], so the most destructive action on the site gets at least
 * as much visual weight as picking a list.
 */
export default function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    deleteMyAccount,
    undefined
  );

  return (
    <>
      <button
        className="btn btn-danger"
        onClick={() => setConfirming(true)}
      >
        Delete my account
      </button>

      {confirming && (
        <div className="dialog-backdrop">
          <div className="dialog blueprint" style={{ width: "min(440px, 100%)" }}>
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            <div className="card-kicker">Check before you act</div>
            <div className="dialog-title">Delete your account?</div>
            <p className="dialog-body" style={{ margin: 0 }}>
              Everything goes: your shelves, your lists, your reviews and your requests. This
              cannot be undone by you — only the site owner can recover it, and only for 14 days.
            </p>
            {state !== undefined && "error" in state && (
              <div className="mono" style={{ color: "var(--color-problem-text)" }}>
                {state.error}
              </div>
            )}
            <form action={formAction}>
              <div className="dialog-actions">
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={pending}
                >
                  {pending ? "Deleting…" : "Yes, delete everything"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
