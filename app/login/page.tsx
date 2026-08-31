"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/*
 * Ported from the `isLogin` block in Prototype with Admin.dc.html
 * (lines 1322-1340). Chrome-less screen, no <Nav /> — see app/start
 * for why.
 *
 * `submitLogin` is copied verbatim from the export: it never actually
 * checks a password against an account (there's no backend for
 * that), it just requires an "@" in the email and a non-empty
 * password, same as the source does. Success navigates to /home;
 * that's unauthenticated navigation until the real login API exists.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loginError, setLoginError] = useState("");

  function submitLogin() {
    if (!email.includes("@") || pw.length < 1) {
      setLoginError("EMAIL OR PASSWORD DIDN’T MATCH");
      return;
    }
    setLoginError("");
    router.push("/home");
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "64px 24px" }}>
      <h2 style={{ margin: "0 0 6px" }}>Welcome back</h2>
      <p style={{ fontSize: 14, marginBottom: 24 }}>
        Log in to get to your recommendations and shelves.
      </p>

      <div className="field" style={{ marginBottom: 14 }}>
        <label>Email</label>
        <input
          className="input"
          style={{ minHeight: 42 }}
          placeholder="you@school.uk"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setLoginError("");
          }}
        />
      </div>
      <div className="field" style={{ marginBottom: 6 }}>
        <label>Password</label>
        <input
          className="input"
          type="password"
          style={{ minHeight: 42 }}
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setLoginError("");
          }}
        />
      </div>

      {loginError && (
        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 14 }}>
          {loginError}
        </div>
      )}

      <button
        className="btn btn-primary btn-block blueprint"
        style={{ minHeight: 46, marginTop: 14 }}
        onClick={submitLogin}
      >
        Log in
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
        <button className="btn btn-ghost" onClick={() => router.push("/reset")}>
          Forgot password
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
        <span style={{ fontSize: 14, flex: 1 }}>No account yet?</span>
        <button className="btn btn-secondary" onClick={() => router.push("/signup")}>
          Sign up
        </button>
      </div>
    </div>
  );
}
