"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/components/AuthProvider";
import { resendConfirmation, type ActionResult } from "@/app/actions/auth";

/*
 * Ported from the `isVerify` block in Prototype with Admin.dc.html
 * (lines 671-700), step 4 of 4. Chrome-less screen, no <Nav />.
 *
 * Changed from the export on purpose. The design asks for a 6-digit
 * code typed into boxes, but putting a code in the email needs a custom
 * SMTP server, which this project isn't setting up. Supabase's own
 * email carries a link instead, so this screen now says "tap the link"
 * rather than asking for something the email never contains. Everything
 * else about verifying is unchanged: the pink banner, and the two
 * actions that wait for a confirmed email.
 *
 * Tapping the link goes to Supabase, then to /auth/confirm, which sets
 * the session. This page is only ever shown before that happens —
 * proxy.ts sends verified people to /home.
 *
 * The email shown is the real one from the session, not the export's
 * hardcoded 'maya@school.uk' fallback.
 */
export default function VerifyPage() {
  const user = useCurrentUser();
  const params = useSearchParams();
  const linkError = params.get("error");

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async () => resendConfirmation(),
    undefined
  );

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "56px 24px" }}>
      <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 10 }}>
        STEP 4 OF 4
      </div>
      <h1 style={{ fontSize: 34, margin: "0 0 6px" }}>One last thing</h1>
      <p style={{ fontSize: 14, marginBottom: 8 }}>
        We&apos;ve emailed <strong>{user?.email ?? "your email address"}</strong>. Open
        it and tap the link to confirm it&apos;s really you.
      </p>
      <p style={{ fontSize: 14, marginBottom: 24 }}>
        You can carry on without this — browsing and your shelves work either
        way. Writing reviews and sharing lists wait until it&apos;s confirmed.
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

      {linkError === "expired" && (
        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 14 }}>
          THAT LINK HAS EXPIRED OR WAS ALREADY USED — ASK FOR A NEW ONE BELOW.
        </div>
      )}
      {linkError === "link" && (
        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 14 }}>
          THAT LINK DIDN&apos;T LOOK RIGHT — ASK FOR A NEW ONE BELOW.
        </div>
      )}
      {state?.error && (
        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 14 }}>
          {state.error}
        </div>
      )}

      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-secondary btn-block"
          style={{ minHeight: 44 }}
        >
          {pending ? "Sending…" : "Send the email again"}
        </button>
      </form>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
        <Link href="/home" className="btn btn-ghost">
          I&apos;ll do this later
        </Link>
      </div>
    </div>
  );
}
