"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/AuthProvider";
import { initialsOf } from "@/lib/personas";
import { useTheme } from "@/lib/useTheme";
import MobileNav from "@/components/MobileNav";

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
 *
 * Wrapped in .desktop-only and paired with <MobileNav /> so every
 * existing `<Nav />` call site gets the right chrome for both
 * breakpoints without having to import a second component everywhere.
 */
export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  const { isDark, setTheme } = useTheme();

  return (
    <>
      <div className="wnav desktop-only">
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
      <MobileNav />
    </>
  );
}
