import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { PERSONAS, isPersonaId } from "@/lib/personas";

/*
 * Route-level auth rules.
 *
 * This is `proxy.ts`, not `middleware.ts`: Next 16 deprecated the
 * middleware file convention and renamed it to proxy. Same behaviour,
 * runs before routes render.
 *
 * This is UX, not security. It keeps people out of pages that would be
 * meaningless or broken for them; it is not what stops someone reading
 * another user's data. That job belongs to row-level security in
 * Postgres once the schema lands — see docs/auth-states.md.
 *
 * When Supabase Auth arrives this file keeps the same rules and swaps
 * how it identifies the user: refresh the auth cookie and read the
 * session here, instead of looking up a persona fixture.
 */

/** Guests get bounced off these; they have nothing to show without an account. */
const ACCOUNT_ONLY = [
  "/home",
  "/recs",
  "/tracker",
  "/lists",
  "/profile",
  "/profile/setup",
  "/requests",
  "/requests/new",
  "/survey",
  "/verify",
];

/** Signed-in users have no use for these. */
const SIGNED_OUT_ONLY = ["/", "/start", "/signup", "/login", "/reset", "/reset/new"];

/** Where each unfinished onboarding step lives. */
const ONBOARDING_ROUTE = {
  profile: "/profile/setup",
  survey: "/survey",
  verify: "/verify",
} as const;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const user = cookie && isPersonaId(cookie) ? PERSONAS[cookie].user : null;

  // --- Signed out ---------------------------------------------------
  if (!user) {
    const needsAccount =
      ACCOUNT_ONLY.includes(pathname) || /^\/book\/[^/]+\/review$/.test(pathname);
    // The design would rather show the page with a signup dialog over
    // it than bounce (see "Gates are dialogs, not redirects" in
    // docs/auth-states.md). Those dialogs aren't ported yet, so this
    // redirects for now — revisit when the gate components land.
    if (needsAccount) return to("/start");
    if (pathname.startsWith("/admin")) return to("/");
    return NextResponse.next();
  }

  // --- Signed in ----------------------------------------------------

  // Finish onboarding before anything else. Without this the "just
  // signed up" persona could wander into pages that assume a profile.
  if (user.onboardingStep) {
    const step = ONBOARDING_ROUTE[user.onboardingStep];
    if (pathname !== step) return to(step);
    return NextResponse.next();
  }

  if (pathname === "/verify" && user.emailVerified) return to("/home");
  if (SIGNED_OUT_ONLY.includes(pathname)) return to("/home");

  // Posting a review is one of the two things that need a confirmed
  // email (the other is opening a list's share link, which is a control
  // inside /lists rather than a route of its own). The export shows a
  // "Verify your email to post a review" dialog here; until that dialog
  // is ported, send them to the verify screen.
  if (!user.emailVerified && /^\/book\/[^/]+\/review$/.test(pathname)) {
    return to("/verify");
  }

  // Non-admins are sent away rather than shown a 403 — no point
  // confirming the section exists.
  if (pathname.startsWith("/admin") && !user.isAdmin) return to("/home");

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, the dev persona endpoint (it must
  // stay reachable to switch out of a persona) and static files.
  matcher: ["/((?!_next/|api/|favicon.ico|.*\\.[^/]+$).*)"],
};
