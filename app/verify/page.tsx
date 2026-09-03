"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resendConfirmation, type ActionResult } from "@/app/actions/auth";

/*
 * Ported from the `isVerify` block in Prototype with Admin.dc.html
 * (search for `{{ isVerify }}` — the anchor, not the line number, since
 * that shifts on every design export). Chrome-less screen, no <Nav />.
 *
 * Two deliberate changes from both the export and the wireframe board
 * (B5, Wireframes Pulp-print.dc.html).
 *
 * It no longer asks for a 6-digit code, and never will — this is not a
 * missing feature. The hosted Supabase plan only supports link-based
 * confirmation, so there is no code to type; the persistent "unverified"
 * banner, the verify-to-post gate modal and the locked-sharing notice
 * the board also shows are dropped for the same root reason, one level
 * up: Supabase refuses to sign anyone in until their email is confirmed
 * (see the comment on siteUrl() below and lib/auth.ts), so a
 * signed-in-but-unverified user can never exist here. That whole state
 * is unreachable, and building its UI would be dead code.
 *
 * And it happens right after signup, not last. The export's step 4 has
 * become step 2 — picking a name and doing the survey come after the
 * link is clicked, not before.
 *
 * This page is therefore reached with NO session. The email address
 * comes from the URL, because there is nothing to read it back from.
 * Anyone who is already signed in gets sent to /home by proxy.ts.
 *
 * "Send it again" and "Wrong address?" sit side by side, matching B5.
 * Wrong address goes back to /signup, same as the export's changeEmail
 * handler — there's no session yet to edit, so starting over is the
 * only option.
 */
function VerifyContent() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const linkError = params.get("error");

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    resendConfirmation,
    undefined
  );

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "56px 24px" }}>
      <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 10 }}>
        STEP 2 OF 4
      </div>
      <h1 style={{ fontSize: 34, margin: "0 0 6px" }}>Check your email</h1>
      <p style={{ fontSize: 14, marginBottom: 8 }}>
        We&apos;ve sent a link to <strong>{email || "your email address"}</strong>.
        Open it and tap the link to confirm it&apos;s really you.
      </p>
      <p style={{ fontSize: 14, marginBottom: 24 }}>
        Once you&apos;ve done that we&apos;ll ask what to call you, and what you
        like reading. It takes about a minute.
      </p>

      <div
        className="blueprint"
        style={{ padding: 20, marginBottom: 18, background: "var(--color-surface)" }}
      >
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <div className="mono" style={{ color: "var(--color-neutral-700)", lineHeight: 1.7 }}>
          NOTHING IN YOUR INBOX? CHECK THE SPAM FOLDER FIRST. THE LINK ONLY
          WORKS ONCE, AND IT EXPIRES, SO ASK FOR A FRESH ONE IF IT&apos;S BEEN
          A WHILE.
        </div>
      </div>

      {/* Red, per RULES — errors only, never the orange used for the
          primary action or the accent-700 kicker labels. All three
          messages below are errors. */}
      {linkError === "expired" && (
        <div className="mono" style={{ color: "var(--color-problem-text)", marginBottom: 14 }}>
          THAT LINK HAS EXPIRED OR WAS ALREADY USED — ASK FOR A NEW ONE BELOW.
        </div>
      )}
      {linkError === "link" && (
        <div className="mono" style={{ color: "var(--color-problem-text)", marginBottom: 14 }}>
          THAT LINK DIDN&apos;T LOOK RIGHT — ASK FOR A NEW ONE BELOW.
        </div>
      )}
      {state?.error && (
        <div className="mono" style={{ color: "var(--color-problem-text)", marginBottom: 14 }}>
          {state.error}
        </div>
      )}

      <form action={formAction}>
        <input type="hidden" name="email" value={email} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="submit"
            disabled={pending || !email}
            className="btn btn-ghost"
          >
            {pending ? "Sending…" : "Send it again"}
          </button>
          <Link href="/signup" className="btn btn-ghost">
            Wrong address?
          </Link>
        </div>
      </form>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
        <Link href="/login" className="btn btn-ghost">
          Back to log in
        </Link>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense fallback={null}>
      <VerifyContent />
    </Suspense>
  );
}
