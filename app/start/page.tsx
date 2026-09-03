"use client";

import { useRouter } from "next/navigation";

/*
 * Ported from the `isStart` block in Prototype with Admin.dc.html
 * (search the file for `{{ isStart }}` — anchors survive the file's
 * re-exports, line numbers don't, so that's the reliable way to find
 * it again). This is one of the export's "chrome-less" screens —
 * its own `chrome` flag only turns the site nav on for
 * landing/home/recs/search/book/tracker/lists/profile/requests, so
 * (like the rest of the auth flow) it renders with no <Nav /> and no
 * `.wrap`, matching the source markup exactly.
 *
 * No auth backend exists yet, so both buttons just navigate to the
 * next screen in the flow.
 */
export default function StartPage() {
  const router = useRouter();

  return (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: "64px 24px" }}>
      <h1 style={{ fontSize: 34, margin: "0 0 6px" }}>Welcome to Book Hub</h1>
      <p style={{ fontSize: 14, marginBottom: 26 }}>New here, or coming back?</p>

      <div className="blueprint" style={{ padding: 20, marginBottom: 16 }}>
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 21 }}>
          I&apos;m new
        </div>
        <p style={{ fontSize: 13, margin: "4px 0 16px" }}>
          Make a free account and answer three quick questions so we can
          recommend books.
        </p>
        <button
          className="btn btn-primary btn-block"
          style={{ minHeight: 46, margin: 0 }}
          onClick={() => router.push("/signup")}
        >
          Sign up
        </button>
      </div>

      <div style={{ border: "1px solid var(--color-divider)", padding: 20 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 21 }}>
          I&apos;ve been here before
        </div>
        <p style={{ fontSize: 13, margin: "4px 0 16px" }}>
          Log in to pick your reading back up.
        </p>
        <button
          className="btn btn-secondary btn-block"
          style={{ minHeight: 46, margin: 0 }}
          onClick={() => router.push("/login")}
        >
          Log in
        </button>
      </div>

      <button
        className="btn btn-ghost"
        style={{ marginTop: 20 }}
        onClick={() => router.push("/")}
      >
        Keep browsing without an account
      </button>
    </div>
  );
}
