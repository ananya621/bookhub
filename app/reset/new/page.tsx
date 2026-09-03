"use client";

import { useActionState } from "react";
import { setNewPassword, type ActionResult } from "@/app/actions/auth";

/*
 * Ported from the `isNewPassword` block in Prototype with Admin.dc.html
 * (search for `{{ isNewPassword }}` — the anchor, not the line number,
 * since that shifts on every design export). Chrome-less screen, no
 * <Nav /> — see app/start for why.
 *
 * The two checks (8+ characters, both fields matching) are the export's
 * own. They now run in the setNewPassword server action, which changes
 * the password in Supabase.
 *
 * You only reach this with a valid reset session — the link in the email
 * goes via /auth/confirm, which signs you in first. Without that,
 * Supabase has no account to change and returns an error.
 */
export default function NewPasswordPage() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    setNewPassword,
    undefined
  );

  return (
    <form action={formAction} style={{ maxWidth: 420, margin: "0 auto", padding: "64px 24px" }}>
      <div
        className="mono"
        style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 10 }}
      >
        PASSWORD RESET · STEP 2 OF 2
      </div>
      <h1 style={{ fontSize: 34, margin: "0 0 6px" }}>Set a new password</h1>
      <p style={{ fontSize: 14, marginBottom: 22 }}>
        You came here from the link in your email. Pick something you have
        not used before.
      </p>

      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="password">New password</label>
        <input
          id="password"
          name="password"
          className="input"
          type="password"
          style={{ minHeight: 42 }}
          placeholder="At least 8 characters"
          required
        />
      </div>
      <div className="field" style={{ marginBottom: 6 }}>
        <label htmlFor="confirm">Type it again</label>
        <input
          id="confirm"
          name="confirm"
          className="input"
          type="password"
          style={{ minHeight: 42 }}
          required
        />
      </div>

      {state?.error && (
        <div className="mono" style={{ color: "var(--color-problem-text)", fontWeight: 700 }}>
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-block"
        style={{ minHeight: 46, marginTop: 18 }}
      >
        {pending ? "Saving…" : "Save and log in"}
      </button>
    </form>
  );
}
