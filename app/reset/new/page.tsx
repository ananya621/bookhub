"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/*
 * Ported from the `isNewPassword` block in Prototype with Admin.dc.html
 * (lines 197-206). Chrome-less screen, no <Nav /> — see app/start for
 * why.
 *
 * `savePassword`'s validation (8+ characters, both fields matching) is
 * copied verbatim from the export. There's no real password-reset
 * backend, so success just sends the user to /login.
 */
export default function NewPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [pwError, setPwError] = useState("");

  function savePassword() {
    if (newPassword.length < 8) {
      setPwError("AT LEAST 8 CHARACTERS");
      return;
    }
    if (newPassword !== newPassword2) {
      setPwError("THE TWO PASSWORDS DON’T MATCH");
      return;
    }
    setPwError("");
    router.push("/login");
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "64px 24px" }}>
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
        <label>New password</label>
        <input
          className="input"
          type="password"
          style={{ minHeight: 42 }}
          placeholder="At least 8 characters"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setPwError("");
          }}
        />
      </div>
      <div className="field" style={{ marginBottom: 6 }}>
        <label>Type it again</label>
        <input
          className="input"
          type="password"
          style={{ minHeight: 42 }}
          value={newPassword2}
          onChange={(e) => {
            setNewPassword2(e.target.value);
            setPwError("");
          }}
        />
      </div>

      {pwError && (
        <div className="mono" style={{ color: "var(--color-problem-text)", fontWeight: 700 }}>
          {pwError}
        </div>
      )}

      <button
        className="btn btn-primary btn-block"
        style={{ minHeight: 46, marginTop: 18 }}
        onClick={savePassword}
      >
        Save and log in
      </button>
    </div>
  );
}
