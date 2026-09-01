import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isPersonaId } from "@/lib/personas";

/*
 * Dev-only fake login. POST { persona } signs that persona in; DELETE
 * signs out.
 *
 * This exists as a route handler rather than the switcher writing
 * document.cookie, because that is the shape a real login has: the
 * server sets an httpOnly session cookie and the client never touches
 * it. Two things follow.
 *
 * First, swapping in Supabase Auth changes what this handler does, not
 * how the rest of the app reads auth — pages keep calling
 * getCurrentUser().
 *
 * Second, httpOnly means client components cannot read the session
 * during render. That structurally rules out the hydration mismatch
 * class we hit with the theme toggle, where the server rendered one
 * thing and a client-side read rendered another.
 */

const disabledInProduction = () =>
  process.env.NODE_ENV === "production"
    ? // 404 rather than 403: in production this endpoint should look
      // like it does not exist.
      new NextResponse(null, { status: 404 })
    : null;

export async function POST(request: Request) {
  const blocked = disabledInProduction();
  if (blocked) return blocked;

  let persona: unknown;
  try {
    ({ persona } = await request.json());
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  if (typeof persona !== "string" || !isPersonaId(persona)) {
    return NextResponse.json({ error: `Unknown persona: ${String(persona)}` }, { status: 400 });
  }

  const response = NextResponse.json({ persona });

  if (persona === "guest") {
    // Guest is the absence of a session, not a session that says
    // "guest" — same as signing out. This also ends any REAL Supabase
    // session, so picking "Site visitor" is the way to sign out of a
    // test account while developing.
    const supabase = await createClient();
    await supabase.auth.signOut();
    response.cookies.delete(SESSION_COOKIE);
  } else {
    response.cookies.set(SESSION_COOKIE, persona, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      // No `secure`: this only runs in development, over http.
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return response;
}

export async function DELETE() {
  const blocked = disabledInProduction();
  if (blocked) return blocked;

  const supabase = await createClient();
  await supabase.auth.signOut();

  const response = NextResponse.json({ persona: "guest" });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
