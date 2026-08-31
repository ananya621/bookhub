"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/*
 * Ported from the `isVerify` block in Prototype with Admin.dc.html
 * (lines 671-700). Chrome-less screen, no <Nav /> — see app/start for
 * why.
 *
 * In the export this is step 4 of 4, reached after profile setup and
 * the survey, right before the user lands on their home page — not
 * straight after signup. `submitVerify`, `resend` and `verifyLater`
 * are copied verbatim: a 6-digit code is the only check (there's no
 * real email/code backend), "send it again" just flips a local
 * "resent" flag, and skipping goes straight to /home like the source
 * does.
 *
 * `accountEmail` in the export falls back to a hardcoded
 * 'maya@school.uk' whenever no email was typed on the signup screen
 * (`s.email || 'maya@school.uk'`) — there's no session to read the
 * real address back from yet, so this keeps that same fallback rather
 * than inventing a new placeholder.
 */
export default function VerifyPage() {
  const router = useRouter();
  const accountEmail = "maya@school.uk";
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [resent, setResent] = useState(false);

  function submitVerify() {
    if (verifyCode.length < 6) {
      setVerifyError("ENTER THE 6-DIGIT CODE FROM YOUR EMAIL");
      return;
    }
    setVerifyError("");
    router.push("/home");
  }

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "56px 24px" }}>
      <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 10 }}>
        STEP 4 OF 4
      </div>
      <h1 style={{ fontSize: 34, margin: "0 0 6px" }}>One last thing</h1>
      <p style={{ fontSize: 14, marginBottom: 4 }}>
        We&apos;ve emailed <b>{accountEmail}</b>. Tap the link in it, or type
        the 6-digit code below — either works.
      </p>
      <p className="mono" style={{ color: "var(--color-neutral-700)", marginBottom: 24 }}>
        THE CODE EXPIRES IN 10 MINUTES
      </p>

      <div className="field" style={{ marginBottom: 6 }}>
        <label>Verification code</label>
        <input
          className="input"
          style={{
            minHeight: 56,
            fontFamily: "var(--font-mono)",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.35em",
            textAlign: "center",
          }}
          placeholder="000000"
          value={verifyCode}
          onChange={(e) => {
            setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setVerifyError("");
          }}
        />
      </div>

      {verifyError && (
        <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700 }}>
          {verifyError}
        </div>
      )}

      <button
        className="btn btn-primary btn-block blueprint"
        style={{ minHeight: 48, marginTop: 18 }}
        onClick={submitVerify}
      >
        Verify my email
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 16,
        }}
      >
        {!resent && (
          <button className="btn btn-ghost" onClick={() => setResent(true)}>
            Send it again
          </button>
        )}
        {resent && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#c6f24e",
              color: "#14110f",
              border: "3px solid var(--color-text)",
              padding: "5px 11px",
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontSize: 17, lineHeight: 1 }}>
              ✓
            </span>
            <span className="mono" style={{ fontWeight: 700 }}>
              SENT AGAIN
            </span>
          </span>
        )}
        <button
          className="btn btn-ghost"
          onClick={() => {
            setVerifyCode("");
            setVerifyError("");
            router.push("/signup");
          }}
        >
          Wrong address?
        </button>
      </div>

      <div
        style={{
          borderTop: "3px solid var(--color-divider)",
          marginTop: 22,
          paddingTop: 18,
        }}
      >
        <p className="mono" style={{ color: "var(--color-neutral-700)", marginBottom: 10 }}>
          CAN&apos;T FIND IT? CHECK SPAM — SCHOOL EMAIL FILTERS ARE STRICT.
        </p>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setVerifyError("");
            router.push("/home");
          }}
        >
          Skip — take me to my books
        </button>
      </div>
    </div>
  );
}
