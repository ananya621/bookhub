import { createClient } from "@/lib/supabase/server";

/*
 * The single place that answers "who is signed in".
 *
 * A real Supabase session always wins. If there isn't one, the answer is
 * signed out — in every environment, with no fallback.
 *
 * Note there is no `emailVerified` here. Supabase is set to require a
 * confirmed email before anyone can sign in at all, so every signed-in
 * user is confirmed by definition. A field that is always true is worse
 * than no field — it invites branches that can never run.
 *
 * A banned account returns null, exactly like being signed out. That is
 * not automatic: Supabase blocks a banned person from signing IN again
 * but leaves any session they already have working until it next
 * refreshes, which can be an hour. Checking here is what closes that
 * window, and it is why this asks the database rather than trusting the
 * token alone.
 *
 * Nothing else in the app should read session cookies or decide what
 * logged-in means. Everything imports from here.
 */

export type CurrentUser = {
  id: string;
  displayName: string;
  email: string;
  /** Hex, from the export's avatar palette. */
  avatarColor: string;
  avatarInk: string;
  isAdmin: boolean;
  /**
   * Which onboarding step this account still owes, or null when it has
   * finished. Confirming the email happens before any of this — you
   * cannot be signed in without having done it — so the order that
   * remains is profile, then survey.
   *
   * Derived, never stored. The two things it reads already decide the
   * answer, so a stored copy would be a third version of the same fact
   * and would drift.
   */
  onboardingStep: "profile" | "survey" | null;
};

/*
 * No `isBanned` here on purpose. Supabase refuses to authenticate a
 * banned account (auth.users.banned_until), so a banned user can never
 * be the current user. The ban lives on the admin-facing records.
 */

const PALETTE: Record<string, { css: string; ink: string }> = {
  Red: { css: "#C41031", ink: "#EFECE3" },
  Orange: { css: "#FF4D00", ink: "#EFECE3" },
  Yellow: { css: "#FFD400", ink: "#14110F" },
  Lime: { css: "#C6F24E", ink: "#14110F" },
  Blue: { css: "#1B3BFF", ink: "#EFECE3" },
  Purple: { css: "#7B2DFF", ink: "#EFECE3" },
  Pink: { css: "#FF3D9A", ink: "#14110F" },
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // One call, not four. The ban check has to read auth.users, which
    // needs a database function anyway, so that function answers
    // everything at once.
    const { data } = await supabase.rpc("current_user_state").maybeSingle();
    const state = data as {
      display_name: string | null;
      avatar_color: string;
      is_admin: boolean;
      has_survey: boolean;
      is_banned: boolean;
    } | null;

    // Treated as signed out. Their session is technically still valid;
    // we simply stop honouring it.
    if (state?.is_banned) return null;

    const colour = PALETTE[state?.avatar_color ?? "Blue"] ?? PALETTE.Blue;

    return {
      id: user.id,
      displayName: state?.display_name ?? "",
      email: user.email ?? "",
      avatarColor: colour.css,
      avatarInk: colour.ink,
      isAdmin: Boolean(state?.is_admin),
      onboardingStep: !state?.display_name
        ? "profile"
        : !state.has_survey
          ? "survey"
          : null,
    };
  }

  // No real session. No fallback, in any environment: signed out.
  return null;
}

/** Convenience wrappers so pages don't re-derive these rules. */
export const isSignedIn = (u: CurrentUser | null) => u !== null;
export const isOnboarding = (u: CurrentUser | null) =>
  u !== null && u.onboardingStep !== null;
