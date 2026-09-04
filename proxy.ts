import { NextResponse, type NextRequest } from "next/server";
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
];

/** Signed-in users have no use for these. */
const SIGNED_OUT_ONLY = ["/", "/start", "/signup", "/login", "/reset", "/reset/new"];

/** Where each unfinished onboarding step lives. */
const ONBOARDING_ROUTE = {
  profile: "/profile/setup",
  survey: "/survey",
} as const;

type RoutingUser = {
  isAdmin: boolean;
  onboardingStep: "profile" | "survey" | null;
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
    // One call. See the note on current_user_state() in the migration:
    // the ban check needs a database function regardless, so it answers
    // everything at once rather than adding a fourth query.
    const { data, error } = await supabase.rpc("current_user_state").maybeSingle();
    const state = data as {
      display_name: string | null;
      is_admin: boolean;
      has_survey: boolean;
      is_banned: boolean;
    } | null;

    if (error) {
      // Same trade as getCurrentUser() (lib/auth.ts) — this RPC is the
      // only thing that knows whether the session we just refreshed
      // belongs to a banned account, and a failed call means we cannot
      // tell. Treating "cannot tell" as "not banned" is the exact
      // fail-open bug this pass exists to remove, so log it and fall
      // into the same branch a real ban does, below.
      console.error(
        "[proxy] current_user_state failed, signing the request out:",
        error.message
      );
    }

    if (error || state?.is_banned) {
      // Supabase leaves an existing session working for up to an hour
      // after a ban, so end it here rather than waiting for it to
      // expire. Signing out is better than ignoring the session: it
      // clears the cookie, so they stop being asked about on every
      // subsequent request.
      //
      // A failed check ends the session too — "cannot tell" must not
      // mean "not banned" — but it deliberately does NOT claim they
      // were banned. Being wrongly told your account is banned is
      // frightening, and most of the people reading it are children;
      // a database hiccup should not accuse someone of something they
      // did not do. They get the ordinary sign-in page and log back
      // in, none the wiser, and the real reason is in the log above.
      await supabase.auth.signOut();
      return to(state?.is_banned ? "/login?banned=1" : "/login");
    }

    user = {
      isAdmin: Boolean(state?.is_admin),
      onboardingStep: !state?.display_name
        ? "profile"
        : !state.has_survey
          ? "survey"
          : null,
    };
  }
  // No real session means signed out — no fallback, matching
  // getCurrentUser(). `user` stays null and falls through below.

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

  // Signed in means confirmed, so the "check your email" page has
  // nothing left to say.
  if (pathname === "/verify") return to("/home");
  if (SIGNED_OUT_ONLY.includes(pathname)) return to("/home");

  if (pathname.startsWith("/admin") && !user.isAdmin) return to("/home");

  return response;
}

export const config = {
  // Everything except Next internals, API routes, the auth callback
  // (which must stay reachable) and static files.
  matcher: ["/((?!_next/|api/|auth/|favicon.ico|.*\\.[^/]+$).*)"],
};
