import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/*
 * Keeps the signed-in session alive.
 *
 * Supabase sessions expire. Something has to refresh them on each
 * request or people get silently logged out mid-visit, so this runs
 * from proxy.ts before any page renders.
 *
 * Calling getUser() is what does the refreshing — it is not just a
 * lookup. Do not remove it because "nothing uses the result here".
 */
export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The client is returned too so the caller can look up the few extra
  // facts routing needs (display name, survey, admin) without building a
  // second client.
  return { response, user, supabase };
}
