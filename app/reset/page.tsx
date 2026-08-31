"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/*
 * Ported from the `isReset` block in Prototype with Admin.dc.html
 * (lines 1342-1366). Chrome-less screen, no <Nav /> — see app/start
 * for why.
 *
 * Two sub-states from the source, kept as local state instead of the
 * export's shared `resetSent` flag: the request form, and the "check
 * your email" confirmation once it's been sent. `sendReset`'s
 * validation (just needs an "@") is copied verbatim — there's no real
 * email-sending backend yet.
 */
export default function ResetPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  function sendReset() {
    if (email.includes("@")) {
      setResetError("");
      setResetSent(true);
    } else {
      setResetError("ENTER THE EMAIL YOU SIGNED UP WITH");
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "64px 24px" }}>
      {resetSent && (
        <div className="blueprint" style={{ padding: 26 }}>
          <i className="corner tl" />
          <i className="corner tr" />
          <i className="corner bl" />
          <i className="corner br" />
          <h2 style={{ margin: "0 0 8px" }}>Check your email</h2>
          <p style={{ fontSize: 14 }}>
            We&apos;ve sent a link to set a new password. It works once and
            expires in an hour.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={() => router.push("/reset/new")}>
              Open the link
            </button>
            <button className="btn btn-secondary" onClick={() => router.push("/login")}>
              Back to log in
            </button>
          </div>
        </div>
      )}

      {!resetSent && (
        <>
          <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 10 }}>
            PASSWORD RESET
          </div>
          <h2 style={{ margin: "0 0 6px" }}>Forgotten your password?</h2>
          <p style={{ fontSize: 14, marginBottom: 22 }}>
            Enter your email and we&apos;ll send a link to set a new one.
          </p>
          <div className="field" style={{ marginBottom: 6 }}>
            <label>Email</label>
            <input
              className="input"
              style={{ minHeight: 42 }}
              placeholder="you@school.uk"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setResetError("");
              }}
            />
          </div>
          {resetError && (
            <div className="mono" style={{ color: "var(--color-accent-700)", marginTop: 10 }}>
              {resetError}
            </div>
          )}
          <button
            className="btn btn-primary btn-block"
            style={{ minHeight: 46, marginTop: 18 }}
            onClick={sendReset}
          >
            Send reset link
          </button>
          <button
            className="btn btn-ghost"
            style={{ marginTop: 14 }}
            onClick={() => router.push("/login")}
          >
            Back to log in
          </button>
        </>
      )}
    </div>
  );
}
