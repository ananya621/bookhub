import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/*
 * Where the "confirm your email" link lands.
 *
 * We cannot put a 6-digit code in the signup email: editing Supabase's
 * email templates needs a custom SMTP server, which this project does
 * not have. So we use the default email, which contains a link, and the
 * /verify screen tells people to tap it rather than type a code.
 *
 * The link goes to Supabase first. Supabase checks it, then sends the
 * person here with a `code` in the URL, which we swap for a real
 * session. After that auth.users.email_confirmed_at is set, which is
 * what the whole app reads to decide if someone is verified.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (!code) {
    // No code means the link was malformed or already used.
    return NextResponse.redirect(`${origin}/verify?error=link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/verify?error=expired`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
