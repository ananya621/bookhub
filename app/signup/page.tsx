"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type ActionResult } from "@/app/actions/auth";

/*
 * Ported from the `isSignup` block in Prototype with Admin.dc.html
 * (search for `{{ isSignup }}` — the anchor, not the line number, since
 * that shifts on every design export). Chrome-less screen, no <Nav /> —
 * see app/start for why.
 *
 * This now creates a real account. The form posts to the signUp server
 * action, which does the same two checks the export did (email has an
 * "@", password is 8+ characters) and then calls Supabase. The error
 * wording is unchanged from the export.
 *
 * On success Supabase emails a confirmation link and the person carries
 * on to profile setup — the export's order too: profile setup, survey,
 * then verify last.
 */
export default function SignupPage() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    signUp,
    undefined
  );

  return (
    <form action={formAction} style={{ maxWidth: 440, margin: "0 auto", padding: "56px 24px" }}>
      <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 10 }}>
        STEP 1 OF 4
      </div>
      <h1 style={{ fontSize: 34, margin: "0 0 6px" }}>Make your account</h1>
      <p style={{ fontSize: 14, marginBottom: 24 }}>
        Email and a password — that&apos;s it. Then two quick questions and
        you&apos;re reading.
      </p>

      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="email">Email address</label>
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
      <div className="field" style={{ marginBottom: 6 }}>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          style={{ minHeight: 42 }}
          placeholder="At least 8 characters"
          required
        />
      </div>

      {state?.error && (
        // Red, not the orange step-kicker colour — RULES reserves red
        // for errors and nothing else. This used to be accent-700,
        // which reads as a shade of the primary-action orange.
        <div className="mono" style={{ color: "var(--color-problem-text)", marginBottom: 14 }}>
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-block blueprint"
        style={{ minHeight: 46, marginTop: 14 }}
      >
        {pending ? "Making your account…" : "Continue"}
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
        <Link href="/login" className="btn btn-ghost">
          I already have an account
        </Link>
        <Link href="/reset" className="btn btn-ghost">
          Forgot password
        </Link>
      </div>
    </form>
  );
}
