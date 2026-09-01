"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestReset, type ActionResult } from "@/app/actions/auth";

/*
 * Ported from the `isReset` block in Prototype with Admin.dc.html
 * (lines 1342-1366). Chrome-less screen, no <Nav /> — see app/start
 * for why.
 *
 * Two sub-states from the source: the request form, and the "check your
 * email" confirmation.
 *
 * The confirmation is shown whether or not that email has an account.
 * That is on purpose — if it only appeared for real accounts, this form
 * would be a way to find out who has signed up. For the same reason the
 * action doesn't report whether the send worked.
 *
 * The export had an "Open the link" button that jumped straight to the
 * new-password screen, which was fine for a prototype. It's gone now:
 * the real link arrives by email and carries a token, and without that
 * token the new-password screen has nothing to act on.
 */
export default function ResetPage() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      const result = await requestReset(prev, formData);
      return result ?? { error: "" }; // "" means sent, see below
    },
    undefined
  );

  const sent = state !== undefined && state.error === "";

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "64px 24px" }}>
      {sent ? (
        <div className="blueprint" style={{ padding: 26 }}>
          <i className="corner tl" />
          <i className="corner tr" />
          <i className="corner bl" />
          <i className="corner br" />
          <h2 style={{ margin: "0 0 8px" }}>Check your email</h2>
          <p style={{ fontSize: 14 }}>
            If that address has an account, we&apos;ve sent a link to set a new
            password. It works once and expires in an hour.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/login" className="btn btn-secondary">
              Back to log in
            </Link>
          </div>
        </div>
      ) : (
        <form action={formAction}>
          <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 10 }}>
            PASSWORD RESET
          </div>
          <h2 style={{ margin: "0 0 6px" }}>Forgotten your password?</h2>
          <p style={{ fontSize: 14, marginBottom: 22 }}>
            Enter your email and we&apos;ll send a link to set a new one.
          </p>
          <div className="field" style={{ marginBottom: 6 }}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              style={{ minHeight: 42 }}
              placeholder="you@school.uk"
              required
            />
          </div>
          {state?.error ? (
            <div className="mono" style={{ color: "var(--color-accent-700)", marginTop: 10 }}>
              {state.error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary btn-block"
            style={{ minHeight: 46, marginTop: 18 }}
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
          <Link href="/login" className="btn btn-ghost" style={{ marginTop: 14 }}>
            Back to log in
          </Link>
        </form>
      )}
    </div>
  );
}
