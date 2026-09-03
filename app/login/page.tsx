"use client";

import Link from "next/link";
import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type ActionResult } from "@/app/actions/auth";

/*
 * Ported from the `isLogin` block in Prototype with Admin.dc.html
 * (search for `{{ isLogin }}` — the anchor, not the line number, since
 * that shifts on every design export). Chrome-less screen, no <Nav />
 * — see app/start for why.
 *
 * `signIn` (app/actions/auth.ts) is real: it calls Supabase's own
 * signInWithPassword, so a wrong email/password is actually rejected —
 * this isn't the export's no-backend version that accepted anything
 * with an "@" and a non-empty password.
 *
 * Also carries the "your account is banned" notice — board G3's first
 * variant (Wireframes Pulp-print.dc.html). The board draws it as a
 * dialog over the app, but a banned account here has no session to be
 * "over" — proxy.ts signs out an existing session the moment it spots
 * a ban and redirects to /login?banned=1 (see the note on
 * ONBOARDING_ROUTE and the ban check in proxy.ts), and a fresh sign-in
 * attempt on a banned account is refused before one ever starts. So
 * this renders as the page itself, not a modal, which is also what the
 * lead asked for.
 *
 * One deliberate gap: the board's notice states the ban's length and
 * start time ("BANNED FOR 6 HOURS · STARTED 14/08 AT 16:20"). Nothing
 * on this page can know that — by the time someone lands here the
 * session that could have read it is already gone, and
 * current_user_state() (lib/auth.ts) only ever exposes an is_banned
 * boolean, not the row in account_bans that has the reason and
 * banned_until. Showing a real duration would mean proxy.ts reading
 * that before it signs out and passing it through the redirect's query
 * string — a proxy.ts change, out of scope here, so flagged to the lead
 * rather than guessed at. This reads the same two params if they're
 * ever added (`until`, an ISO timestamp; `reason`, the admin's chosen
 * label) and falls back to generic copy when they're not there, which
 * is always, today.
 *
 * Also adapted: the board's second line says "reply to the email we
 * sent you", but nothing here currently emails a banned account (see
 * adminBanAccount in app/actions/accounts.ts) — that would be a false
 * instruction, so the copy below asks them to contact support instead
 * of claiming an email exists. Flagged to the lead alongside the
 * duration gap; both point at the same fix (send a real ban email that
 * explains why and for how long).
 */
function LoginContent() {
  const params = useSearchParams();
  const banned = params.get("banned") === "1";
  const bannedUntil = params.get("until");
  const bannedReason = params.get("reason");

  // "I understand" reveals the ordinary form underneath, in case this
  // is a shared device and someone else wants to sign in.
  const [acknowledged, setAcknowledged] = useState(false);

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    signIn,
    undefined
  );

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "64px 24px" }}>
      {banned && !acknowledged && (
        <div
          style={{
            border: "3px solid var(--color-text)",
            boxShadow: "5px 5px 0 var(--color-text)",
            marginBottom: 28,
          }}
        >
          <div style={{ background: "var(--color-problem)", color: "var(--color-cream-fixed)", padding: "14px 16px" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 22 }}>
              Your account is banned
            </div>
            {(bannedUntil || bannedReason) && (
              <div className="mono" style={{ fontWeight: 700, marginTop: 4 }}>
                {bannedReason ? bannedReason.toUpperCase() + " · " : ""}
                {bannedUntil ? "UNTIL " + new Date(bannedUntil).toLocaleString("en-GB").toUpperCase() : ""}
              </div>
            )}
          </div>
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 14, margin: 0 }}>
              While the ban lasts you can still read everything. You cannot
              post reviews, share lists or ask for new books.
            </p>
            <p style={{ fontSize: 14, margin: 0 }}>
              If you think this is a mistake, contact us and a real person
              will look into it.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setAcknowledged(true)}
              >
                I understand
              </button>
              <Link href="/" className="btn btn-secondary">
                Keep browsing
              </Link>
            </div>
          </div>
        </div>
      )}

      {(!banned || acknowledged) && (
        <form action={formAction}>
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
            // Red, per RULES — errors only, never the orange used for
            // the primary action or the accent-700 kicker labels.
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
      )}
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
