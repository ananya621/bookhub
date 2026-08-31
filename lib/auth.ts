import { cookies } from "next/headers";
import { PERSONAS, type PersonaId } from "@/lib/personas";

/*
 * The single seam between the app and "who is signed in".
 *
 * Today `getCurrentUser()` reads a fake session cookie set by the dev
 * persona switcher. When Supabase Auth lands it calls
 * `supabase.auth.getUser()` and joins the profile row instead — the
 * return type stays the same, so nothing that imports from here has to
 * change. Keep it that way: no other module should read the session
 * cookie or decide what "logged in" means.
 *
 * Note for the real implementation: use `getUser()`, never
 * `getSession()`. getSession() trusts the cookie without revalidating
 * it against the auth server, so it can be forged.
 */

export const SESSION_COOKIE = "bookhub-session";

export type CurrentUser = {
  id: string;
  displayName: string;
  email: string;
  /** Hex, from the export's avatar palette. */
  avatarColor: string;
  avatarInk: string;
  emailVerified: boolean;
  isAdmin: boolean;
  /**
   * Which onboarding step this account still owes, or null when it has
   * finished. Signup order is profile -> survey -> verify (verified
   * against the export's handlers at lines 1916 / 1976 / 2002).
   */
  onboardingStep: "profile" | "survey" | "verify" | null;
};

/*
 * There is deliberately no `isBanned` here. A banned account cannot
 * authenticate at all, so it can never be the current user — the ban
 * lives on the admin-facing account records, not on the session. (The
 * export took the other route, keeping banned users signed in and
 * read-only; we chose lockout, so its `banBlock` dialog is not ported.)
 */

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value as PersonaId | undefined;
  if (!id) return null;
  return PERSONAS[id]?.user ?? null;
}

/** Convenience wrappers so pages don't re-derive these rules. */
export const isSignedIn = (u: CurrentUser | null) => u !== null;
export const isOnboarding = (u: CurrentUser | null) =>
  u !== null && u.onboardingStep !== null;
