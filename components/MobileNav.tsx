"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/AuthProvider";
import { initialsOf } from "@/lib/personas";
import { useTheme } from "@/lib/useTheme";

/*
 * Ported from Prototype Mobile.dc.html's shared chrome (lines 46-57 for
 * the app-bar, 601-607 for the tab bar) — two separate pieces, not one
 * "mobile nav": a top app-bar (back + title + avatar + theme toggle)
 * and a bottom 5-tab bar (Home/Search/Shelves/Lists/You), both always
 * present together rather than either alone. Rendered by Nav.tsx
 * alongside the desktop .wnav, CSS-swapped at 640px (see globals.css).
 *
 * The design's tab bar gates every tab but Search behind a sign-up
 * prompt for guests (a dedicated "gate" sheet). That gate UI doesn't
 * exist anywhere else in this port — the desktop nav's equivalent
 * links don't gate inline either, they just navigate and let
 * proxy.ts's route protection redirect. Mobile tabs do the same here,
 * for consistency with the nav they're standing in for rather than
 * inventing a new pattern only mobile would have.
 *
 * No book title is available here (Nav has no book data), so book
 * detail/review pages fall back to a generic title rather than the
 * real one.
 */

const TAB_ROOTS = ["/", "/home", "/search", "/tracker", "/lists", "/profile"];

const TABS = [
  { href: "/", label: "Home", icon: "⌂", activeOn: ["/", "/recs", "/home"] },
  { href: "/search", label: "Search", icon: "⌕", activeOn: ["/search"], activePrefix: "/book/" },
  { href: "/tracker", label: "Shelves", icon: "▤", activeOn: ["/tracker"] },
  { href: "/lists", label: "Lists", icon: "≣", activeOn: ["/lists"], activePrefix: "/lists/" },
  { href: "/profile", label: "You", icon: "●", activeOn: ["/profile", "/requests"] },
];

function titleFor(pathname: string): string {
  if (pathname === "/") return "Book Hub";
  if (pathname === "/start") return "Get Started";
  if (pathname === "/search") return "Search";
  if (pathname === "/recs") return "For You";
  if (pathname === "/tracker") return "Shelves";
  if (pathname === "/lists") return "My Lists";
  if (pathname.startsWith("/lists/")) return "Shared List";
  if (pathname === "/profile") return "Profile";
  if (pathname === "/profile/setup") return "Name & Colour";
  if (pathname === "/requests") return "My Requests";
  if (pathname === "/requests/new") return "Ask For A Book";
  if (pathname.startsWith("/book/") && pathname.endsWith("/review")) return "Write A Review";
  if (pathname.startsWith("/book/")) return "Book";
  if (pathname === "/login") return "Log In";
  if (pathname === "/signup") return "Sign Up";
  if (pathname === "/verify") return "Verify Email";
  if (pathname === "/survey") return "Survey";
  if (pathname === "/reset") return "Reset Password";
  if (pathname === "/reset/new") return "New Password";
  return "Book Hub";
}

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  const { isDark, setTheme } = useTheme();

  const canGoBack = !TAB_ROOTS.includes(pathname);

  return (
    <>
      <div className="appbar mobile-only">
        {canGoBack && (
          <button className="btn btn-secondary" style={{ padding: "0 12px", flex: "none" }} onClick={() => router.back()}>
            ←
          </button>
        )}
        <b>{titleFor(pathname)}</b>
        {user && (
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
              fontSize: 14,
              background: user.avatarColor,
              color: user.avatarInk,
            }}
          >
            {initialsOf(user.displayName)}
          </span>
        )}
        <button
          className="btn btn-secondary"
          style={{ padding: "0 12px", flex: "none" }}
          onClick={() => setTheme(!isDark)}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? "☀" : "☾"}
        </button>
      </div>

      <div className="tabs mobile-only">
        {TABS.map((tab) => {
          const active =
            tab.activeOn.includes(pathname) || (tab.activePrefix ? pathname.startsWith(tab.activePrefix) : false);
          return (
            <Link key={tab.href} href={tab.href} className={active ? "tab on" : "tab"}>
              <i>{tab.icon}</i>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </>
  );
}
