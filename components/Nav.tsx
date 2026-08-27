"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/*
 * Ported from the `.wnav` block in Prototype with Admin.dc.html (lines
 * 51-71). That file drives everything from one shared state object, so
 * "logged in vs guest" and "which link is current" come from a single
 * source there. We don't have auth yet, so for now this always renders
 * the guest state (Get Started button, no avatar) — this will switch to
 * a real logged-in/guest check once auth is built.
 *
 * The Light/Dark buttons are real and working: they toggle a
 * data-theme attribute on <html> and remember the choice in
 * localStorage, matching the toggle shown in the export's nav.
 */
export default function Nav() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-theme") === "dark"
  );

  function setTheme(dark: boolean) {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("bookhub-theme", dark ? "dark" : "light");
    setIsDark(dark);
  }

  return (
    <div className="wnav">
      <Link href="/" className="mono" style={{ all: "unset", cursor: "pointer" }}>
        <b style={{ display: "block" }}>Book Hub</b>
      </Link>
      <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
        Home
      </Link>
      <Link href="/search" aria-current={pathname === "/search" ? "page" : undefined}>
        Search
      </Link>
      <Link href="/recs" aria-current={pathname === "/recs" ? "page" : undefined}>
        Recommendations
      </Link>
      <Link href="/tracker" aria-current={pathname === "/tracker" ? "page" : undefined}>
        Tracker
      </Link>
      <Link href="/lists" aria-current={pathname === "/lists" ? "page" : undefined}>
        My Lists
      </Link>
      <Link href="/profile" aria-current={pathname === "/profile" ? "page" : undefined}>
        Profile
      </Link>
      <Link href="/start" className="btn btn-primary">
        Get Started
      </Link>
      <span className="mode-seg">
        <button
          style={
            !isDark
              ? { background: "var(--color-link)", color: "var(--color-bg)" }
              : undefined
          }
          onClick={() => setTheme(false)}
        >
          Light
        </button>
        <button
          style={
            isDark
              ? { background: "var(--color-link)", color: "var(--color-bg)" }
              : undefined
          }
          onClick={() => setTheme(true)}
        >
          Dark
        </button>
      </span>
    </div>
  );
}
