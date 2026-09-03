"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/AuthProvider";
import { initialsOf } from "@/lib/avatar";
import { useTheme } from "@/lib/useTheme";
import MobileNav from "@/components/MobileNav";
import type { CurrentUser } from "@/lib/auth";

/*
 * Ported from the `.wnav` block in Prototype with Admin.dc.html (lines
 * 51-71), then brought back in line with the static wireframe boards
 * (Wireframes Pulp-print.dc.html — A1/A2/A3 for guests, B6/C1/C2/D1 for
 * signed in, C3 for the trimmed variant below) for which links appear in
 * which state. Specific divergences from those boards, and why:
 *
 * - No "Reviews" link. The boards list one, and a note on A3 says it
 *   "points to the reader's own reviews, not a global feed" — but no
 *   board actually builds that destination (D1's own Profile board has
 *   no reviews list), and there is no such page anywhere in this app.
 *   Adding the word to the nav with nowhere real to send it would be
 *   worse than leaving it out. Flagged to the lead as a possible future
 *   page rather than guessed at here.
 *
 * - Guests get a plain "Log in" link here, not a standing "Get Started"
 *   button. Every full-nav board (A1/A2/A3) shows guests exactly that —
 *   plain text, no button — and A1 already has its own orange "Get
 *   Started" as the page's hero action, so a second orange button in the
 *   nav on that same screen would break the RULES plate's "one primary
 *   action per screen". The highlighted button only reappears on C3,
 *   the trimmed nav below, which has no hero of its own to compete with.
 *
 * - Guests don't get a "Profile" link — A1/A2/A3 drop it entirely rather
 *   than pointing it at a sign-in gate, since a guest has no profile yet.
 *
 * The Light/Dark buttons are real and working: they toggle a
 * data-theme attribute on <html> and remember the choice in
 * localStorage. The boards only show this control on A1 (guest
 * landing), but it is kept on every page here, signed in or not — it
 * is already a shipped, working feature, matches how the interactive
 * Prototype with Admin.dc.html renders it (unconditionally, on every
 * page, in its shared `topbar` chrome), and restricting it to one guest-only page
 * would take dark mode away from every signed-in reader with no upside.
 * Flagged to the lead as a deliberate keep rather than a fidelity gap.
 *
 * Wrapped in .desktop-only and paired with <MobileNav /> so every
 * existing `<Nav />` call site gets the right chrome for both
 * breakpoints without having to import a second component everywhere.
 */
export default function Nav({ minimal = false }: { minimal?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  const { isDark, setTheme } = useTheme();

  /*
   * The trimmed nav from board C3: a guest arriving on a shared list
   * link "has one job" (C3's own note), so this drops every link but
   * Search and swaps the avatar/Get-Started slot's plain Log in for a
   * highlighted button — C3 is the one place in the whole design that
   * shows both side by side. No board gives this its own mobile layout,
   * and it is short enough (two or three items) to read fine at any
   * width, so unlike the full nav below it does not pair with
   * <MobileNav /> or swap out at 640px — that bottom tab bar implies the
   * full app, which is exactly what a page with "one job" shouldn't
   * offer.
   */
  if (minimal) {
    return (
      <div className="wnav">
        <Link href="/" className="mono" style={{ all: "unset", cursor: "pointer" }}>
          <b style={{ display: "block" }}>Book Hub</b>
        </Link>
        <Link href="/search">Search</Link>
        {user ? (
          <Avatar user={user} />
        ) : (
          <>
            <Link href="/login">Log in</Link>
            <button className="btn btn-primary" onClick={() => router.push("/start")}>
              Get Started
            </button>
          </>
        )}
      </div>
    );
  }

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
        {user && (
          <Link href="/profile" aria-current={pathname === "/profile" ? "page" : undefined}>
            Profile
          </Link>
        )}
        {user ? (
          <Avatar user={user} />
        ) : (
          <Link href="/login">Log in</Link>
        )}
        <span className="mode-seg">
          {/* --color-cream-fixed, not --color-bg: this is a blue fill,
              and blue always takes cream text in both themes (see the
              note on that token in globals.css) — --color-bg itself
              flips to ink in dark mode, which would leave the active
              toggle button unreadable there. */}
          <button
            style={
              !isDark
                ? { background: "var(--color-link)", color: "var(--color-cream-fixed)" }
                : undefined
            }
            onClick={() => setTheme(false)}
          >
            Light
          </button>
          <button
            style={
              isDark
                ? { background: "var(--color-link)", color: "var(--color-cream-fixed)" }
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

/** The monogram chip shared by the full nav and the trimmed C3 variant. */
function Avatar({ user }: { user: CurrentUser }) {
  return (
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
  );
}
