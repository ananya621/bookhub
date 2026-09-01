"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/*
 * Everything that changes who is signed in, or what their account says.
 *
 * These run on the server. The browser never talks to Supabase Auth
 * directly, so the session cookie stays out of reach of page scripts.
 *
 * Error strings are the exact wording already on the screens — they get
 * shown as-is, so don't reword them here without changing the design.
 */

export type ActionResult = { error: string } | undefined;

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/* --- Signing up ---------------------------------------------------- */

export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email.includes("@")) return { error: "ENTER A VALID EMAIL ADDRESS" };
  if (password.length < 8) return { error: "PASSWORD NEEDS AT LEAST 8 CHARACTERS" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl()}/auth/confirm` },
  });

  if (error) {
    // Supabase's own wording is clearer than anything generic we could
    // put here (already registered, password too weak, and so on).
    return { error: error.message.toUpperCase() };
  }

  // The database trigger has already made the profile and role rows.
  // Next stop is picking a display name.
  redirect("/profile/setup");
}

/* --- Display name and avatar --------------------------------------- */

export async function checkDisplayName(candidate: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_display_name", { candidate });
  if (error) return "idle";
  return data as string;
}

export async function saveProfile(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const avatarColor = String(formData.get("avatarColor") ?? "Blue");

  if (!displayName) return { error: "PICK A DISPLAY NAME FIRST" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Checked again here, on purpose. The check while typing is only a
  // hint for the person filling the form; this is the one that counts,
  // and it closes the gap where two people claim the same name between
  // the last keystroke and pressing the button.
  const { data: verdict } = await supabase.rpc("check_display_name", {
    candidate: displayName,
  });
  if (verdict !== "available") return { error: "THAT NAME WON’T WORK — SEE ABOVE" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, avatar_color: avatarColor })
    .eq("id", user.id);

  // A unique-index violation here means someone took the name in the
  // last moment, which is exactly what the index is for.
  if (error) return { error: "THAT NAME WON’T WORK — SEE ABOVE" };

  revalidatePath("/", "layout");
  redirect("/survey");
}

/* --- Survey --------------------------------------------------------- */

export async function saveSurvey(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const genres = formData.getAll("genres").map(String);
  const readingLevel = String(formData.get("readingLevel") ?? "Middle Grade");
  const preferredLength = String(formData.get("preferredLength") ?? "Any");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Upsert, not insert: this same screen is reachable later from
  // "Edit my answers" on the profile page.
  const { error } = await supabase.from("surveys").upsert({
    user_id: user.id,
    genres,
    reading_level: readingLevel,
    preferred_length: preferredLength,
  });

  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/", "layout");
  // Verifying is the last step. Someone editing their answers later has
  // already done it and just goes home.
  redirect(user.email_confirmed_at ? "/home" : "/verify");
}

/* --- Verifying ------------------------------------------------------ */

export async function resendConfirmation(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "WE COULDN’T FIND YOUR EMAIL ADDRESS" };

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
    options: { emailRedirectTo: `${siteUrl()}/auth/confirm` },
  });

  // Supabase rate-limits this, and its message says how long to wait,
  // which is more useful than anything we'd invent.
  if (error) return { error: error.message.toUpperCase() };
}

/* --- Signing in and out --------------------------------------------- */

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // A banned account gets told so. Everything else gets the same
    // message whether the account exists or not — otherwise this form
    // becomes a way to find out who has signed up.
    if (/banned|suspended/i.test(error.message)) {
      return { error: "THIS ACCOUNT IS SUSPENDED — CHECK YOUR EMAIL" };
    }
    return { error: "EMAIL OR PASSWORD DIDN’T MATCH" };
  }

  revalidatePath("/", "layout");
  redirect("/home");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/* --- Password reset -------------------------------------------------- */

export async function requestReset(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) return { error: "ENTER THE EMAIL YOU SIGNED UP WITH" };

  const supabase = await createClient();
  // Deliberately ignoring the result. The screen says "check your email"
  // either way, so this can't be used to find out who has an account.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reset/new`,
  });
}

export async function setNewPassword(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password !== confirm) return { error: "THE TWO PASSWORDS DON’T MATCH" };
  if (password.length < 8) return { error: "PASSWORD NEEDS AT LEAST 8 CHARACTERS" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message.toUpperCase() };

  revalidatePath("/", "layout");
  redirect("/home");
}
