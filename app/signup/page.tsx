"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/*
 * Ported from the `isSignup` block in Prototype with Admin.dc.html
 * (lines 653-669). Chrome-less screen, no <Nav /> — see app/start for
 * why.
 *
 * The export's own `submitSignup` handler is copied verbatim: it only
 * checks the email has an "@" and the password is 8+ characters, then
 * moves on. There's no real signup API yet, so this still just does
 * that same shape check and navigates — nothing invented beyond what
 * the source already did here. On success the export sends the user
 * to `profileSetup` next (not `verify` — verification is the export's
 * step 4, after profile setup and the survey), so that's what this
 * button does too.
 */
export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [signupError, setSignupError] = useState("");

  function submitSignup() {
    if (!email.includes("@")) {
      setSignupError("ENTER A VALID EMAIL ADDRESS");
      return;
    }
    if (pw.length < 8) {
      setSignupError("PASSWORD NEEDS AT LEAST 8 CHARACTERS");
      return;
    }
    setSignupError("");
    router.push("/profile/setup");
  }

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "56px 24px" }}>
      <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 10 }}>
        STEP 1 OF 4
      </div>
      <h1 style={{ fontSize: 34, margin: "0 0 6px" }}>Make your account</h1>
      <p style={{ fontSize: 14, marginBottom: 24 }}>
        Email and a password — that&apos;s it. Then two quick questions and
        you&apos;re reading.
      </p>

      <div className="field" style={{ marginBottom: 14 }}>
        <label>Email address</label>
        <input
          className="input"
          style={{ minHeight: 42 }}
          placeholder="you@school.uk"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSignupError("");
          }}
        />
      </div>
      <div className="field" style={{ marginBottom: 6 }}>
        <label>Password</label>
        <input
          className="input"
          type="password"
          style={{ minHeight: 42 }}
          placeholder="At least 8 characters"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setSignupError("");
          }}
        />
      </div>

      {signupError && (
        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 14 }}>
          {signupError}
        </div>
      )}

      <button
        className="btn btn-primary btn-block blueprint"
        style={{ minHeight: 46, marginTop: 14 }}
        onClick={submitSignup}
      >
        Continue
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
        <button className="btn btn-ghost" onClick={() => router.push("/login")}>
          I already have an account
        </button>
        <button className="btn btn-ghost" onClick={() => router.push("/reset")}>
          Forgot password
        </button>
      </div>
    </div>
  );
}
