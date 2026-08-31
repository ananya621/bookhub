"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

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

/* Which button is highlighted comes from <html data-theme>, which the
   inline script in layout.tsx sets before React hydrates. That makes it
   external state, not React state: reading it during render (the old
   `typeof document !== "undefined"` check) returned false on the server
   and true on the client, so the server shipped Light highlighted while
   the client rendered Dark highlighted, and React reported a hydration
   mismatch and left the buttons wrong until the next re-render.

   useSyncExternalStore is the primitive for exactly this. React uses
   getServerSnapshot for the server render AND the hydration render, so
   the first client render matches the HTML; it then reads getSnapshot
   and re-renders if they differ. Correct markup, no mismatch. */

const THEME_CHANGE = "bookhub-theme-change";

function subscribeToTheme(onChange: () => void) {
  window.addEventListener(THEME_CHANGE, onChange);
  return () => window.removeEventListener(THEME_CHANGE, onChange);
}

const getThemeSnapshot = () =>
  document.documentElement.getAttribute("data-theme") === "dark";

// The server has no localStorage, so it always renders the light default.
const getThemeServerSnapshot = () => false;

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const isDark = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  function setTheme(dark: boolean) {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("bookhub-theme", dark ? "dark" : "light");
    // Tells useSyncExternalStore to re-read the attribute above.
    window.dispatchEvent(new Event(THEME_CHANGE));
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
      <button className="btn btn-primary" onClick={() => router.push("/start")}>
        Get Started
      </button>
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
