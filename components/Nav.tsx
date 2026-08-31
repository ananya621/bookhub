"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useCurrentUser } from "@/components/AuthProvider";
import { initialsOf } from "@/lib/personas";

/*
 * Ported from the `.wnav` block in Prototype with Admin.dc.html (lines
 * 51-71). That file drives everything from one shared state object, so
 * "logged in vs guest" and "which link is current" come from a single
 * source there. The signed-in user comes from AuthProvider, which the
 * root layout fills in on the server — this component must never work
 * out who is signed in itself, or the nav would differ between the
 * server and client renders and hydration would mismatch.
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
  const user = useCurrentUser();
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
    <>
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
      {user ? (
        <span
          title={user.displayName}
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: 32,
            height: 32,
            flex: "none",
            border: "3px solid var(--color-text)",
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: 15,
            background: user.avatarColor,
            color: user.avatarInk,
          }}
        >
          {initialsOf(user.displayName)}
        </span>
      ) : (
        <button className="btn btn-primary" onClick={() => router.push("/start")}>
          Get Started
        </button>
      )}
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
      {/* Admin sits in the reader nav, after the theme toggle, exactly
          where the export puts it (source lines 67-69). Admin is an
          extra control on the normal site, not a separate app. */}
      {user?.isAdmin && (
        <Link
          href="/admin"
          className="btn btn-secondary"
          style={{ flex: "none", background: "#7B2DFF", color: "#EFECE3" }}
        >
          Admin
        </Link>
      )}
      </div>
      <UnverifiedBanner />
    </>
  );
}

/*
 * The pink "verify your email" bar. The export shows it only on these
 * seven screens (source line 1929) — not on the auth screens, not on
 * the public shared-list view, and not in admin.
 */
const BANNER_ROUTES = ["/home", "/recs", "/search", "/tracker", "/lists", "/profile"];

function UnverifiedBanner() {
  const user = useCurrentUser();
  const pathname = usePathname();

  const onBannerRoute =
    BANNER_ROUTES.includes(pathname) || pathname.startsWith("/book/");
  if (!user || user.emailVerified || !onBannerRoute) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "#ff3d9a",
        color: "#14110f",
        borderBottom: "3px solid var(--color-text)",
        padding: "10px 28px",
      }}
    >
      <div style={{ flex: 1 }}>
        <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15 }}>
          Your email isn&apos;t verified yet.
        </span>{" "}
        <span className="mono" style={{ fontWeight: 700 }}>
          YOU CAN BROWSE AND TRACK BOOKS — REVIEWS AND SHARED LISTS UNLOCK ONCE IT IS.
        </span>
      </div>
      <Link
        href="/verify"
        className="btn btn-secondary"
        style={{ borderColor: "#14110f", color: "#14110f" }}
      >
        Enter my code
      </Link>
    </div>
  );
}
