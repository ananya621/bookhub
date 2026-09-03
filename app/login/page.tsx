"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type ActionResult } from "@/app/actions/auth";

/*
 * Ported from the `isLogin` block in Prototype with Admin.dc.html
 * (lines 1322-1340). Chrome-less screen, no <Nav /> — see app/start
 * for why.
 *
 * `signIn` (app/actions/auth.ts) is real: it calls Supabase's own
 * signInWithPassword, so a wrong email/password is actually rejected —
 * this isn't the export's no-backend version that accepted anything
 * with an "@" and a non-empty password.
 */
export default function LoginPage() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    signIn,
    undefined
  );

  return (
    <form action={formAction} style={{ maxWidth: 420, margin: "0 auto", padding: "64px 24px" }}>
      <h2 style={{ margin: "0 0 6px" }}>Welcome back</h2>
      <p style={{ fontSize: 14, marginBottom: 24 }}>
        Log in to get to your recommendations and shelves.
      </p>

      <div className="field" style={{ marginBottom: 14 }}>
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
      <div className="field" style={{ marginBottom: 6 }}>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          style={{ minHeight: 42 }}
          required
        />
      </div>

      {state?.error && (
        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 14 }}>
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-block blueprint"
        style={{ minHeight: 46, marginTop: 14 }}
      >
        {pending ? "Logging in…" : "Log in"}
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 18,
          borderBottom: "1px solid var(--color-divider)",
          paddingBottom: 18,
        }}
      >
        <Link href="/reset" className="btn btn-ghost">
          Forgot password
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
        <span style={{ fontSize: 14, flex: 1 }}>No account yet?</span>
        <Link href="/signup" className="btn btn-secondary">
          Sign up
        </Link>
      </div>
    </form>
  );
}
