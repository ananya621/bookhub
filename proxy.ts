import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { PERSONAS, isPersonaId } from "@/lib/personas";
import { refreshSession } from "@/lib/supabase/proxy";

/*
 * Route-level auth rules, and session refresh.
 *
 * This is `proxy.ts`, not `middleware.ts`: Next 16 deprecated the
 * middleware file convention and renamed it to proxy. Same behaviour,
 * runs before routes render.
 *
 * Refreshing the session here is not optional — Supabase sessions
 * expire, and if nothing renews the cookie people get logged out
 * mid-visit.
 *
 * The redirects below are convenience, not security. They keep people
 * off pages that would be meaningless for them. What actually stops
 * someone reading another user's data is row-level security in Postgres.
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

type RoutingUser = {
  emailVerified: boolean;
  isAdmin: boolean;
  onboardingStep: "profile" | "survey" | "verify" | null;
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always refresh first, so the cookie is current whatever we decide
  // to do with the request.
  const { response, user: authUser, supabase } = await refreshSession(request);

  const to = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    // Carry over any refreshed session cookies, or the refresh is lost
    // on every redirect.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  let user: RoutingUser | null = null;

  if (authUser) {
    const [{ data: profile }, { data: role }, { data: survey }] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", authUser.id).maybeSingle(),
      supabase.from("user_roles").select("is_admin").eq("user_id", authUser.id).maybeSingle(),
      supabase.from("surveys").select("user_id").eq("user_id", authUser.id).maybeSingle(),
    ]);

    const emailVerified = Boolean(authUser.email_confirmed_at);
    user = {
      emailVerified,
      isAdmin: Boolean(role?.is_admin),
      onboardingStep: !profile?.display_name
        ? "profile"
        : !survey
          ? "survey"
          : !emailVerified
            ? "verify"
            : null,
    };
  } else if (process.env.NODE_ENV !== "production") {
    // Development-only fallback to the fake persona, matching
    // getCurrentUser(). Production has no fallback.
    const cookie = request.cookies.get(SESSION_COOKIE)?.value;
    const persona = cookie && isPersonaId(cookie) ? PERSONAS[cookie].user : null;
    if (persona) {
      user = {
        emailVerified: persona.emailVerified,
        isAdmin: persona.isAdmin,
        onboardingStep: persona.onboardingStep,
      };
    }
  }

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
    return response;
  }

  // --- Signed in ----------------------------------------------------

  // Finish onboarding before anything else, otherwise a half-finished
  // account can wander into pages that assume a profile.
  if (user.onboardingStep) {
    const step = ONBOARDING_ROUTE[user.onboardingStep];
    if (pathname !== step) return to(step);
    return response;
  }

  if (pathname === "/verify" && user.emailVerified) return to("/home");
  if (SIGNED_OUT_ONLY.includes(pathname)) return to("/home");

  // Posting a review is one of the two things that need a confirmed
  // email (the other is opening a list's share link, which is a control
  // inside /lists rather than a route of its own).
  if (!user.emailVerified && /^\/book\/[^/]+\/review$/.test(pathname)) {
    return to("/verify");
  }

  if (pathname.startsWith("/admin") && !user.isAdmin) return to("/home");

  return response;
}

export const config = {
  // Everything except Next internals, API routes (the dev persona
  // endpoint and the auth callback must stay reachable) and static files.
  matcher: ["/((?!_next/|api/|auth/|favicon.ico|.*\\.[^/]+$).*)"],
};
