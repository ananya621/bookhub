import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SurveyForm, { type SurveyInitial } from "./SurveyForm";

/*
 * Ported from the `isSurvey` block in Prototype with Admin.dc.html
 * (search for `{{ isSurvey }}` — the anchor, not the line number, since
 * that shifts on every design export). Chrome-less screen, no <Nav /> —
 * see app/start for why.
 *
 * This is step 4 of 4 in OUR onboarding order, not the export's step 3.
 * The export runs signup -> profile -> survey -> verify, but Supabase
 * refuses to sign anyone in until their email is confirmed, so
 * verifying had to move right after signup instead of last (see
 * siteUrl() in app/actions/auth.ts). The real order here is
 * signup(1) -> verify(2) -> profile/setup(3) -> survey(4), which is
 * why this screen's kicker reads "STEP 4 OF 4" rather than the export's
 * "STEP 3 OF 4" — a deliberate, already-decided departure from
 * wireframe board B4, not an oversight.
 *
 * This is also the export's "edit my answers" screen, reached from
 * /profile (the isSurvey block's surveyEditing flag: kicker "EDIT YOUR
 * ANSWERS", CTA "Save and refresh recommendations"). That reuse used to
 * be unwired here; now it reads the signed-in user's existing survey
 * row and pre-fills the form with it. There's no query-string flag for
 * "editing" — proxy.ts only ever routes someone to /survey mid-onboarding
 * while they still owe it (getCurrentUser().onboardingStep === "survey"),
 * so once onboarding is finished (onboardingStep === null) landing here
 * again can only mean editing, which is what /profile's "Edit my
 * answers" link does.
 */
export default async function SurveyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/start");

  const editing = user.onboardingStep === null;

  // Only fetch the existing answers when there's a reason to — a
  // first-time visitor mid-onboarding has no survey row yet, so there's
  // nothing to pre-fill.
  let initial: SurveyInitial = null;
  if (editing) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("surveys")
      .select("genres, reading_level, preferred_length")
      .eq("user_id", user.id)
      .maybeSingle();
    initial = data as SurveyInitial;
  }

  return <SurveyForm editing={editing} initial={initial} />;
}
