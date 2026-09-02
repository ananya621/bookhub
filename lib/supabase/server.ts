import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/*
 * Supabase client for server components, server actions and route
 * handlers. It reads and writes the session cookies, so the signed-in
 * user is resolved on the server and never worked out in the browser.
 *
 * Always use `supabase.auth.getUser()` with this, never `getSession()`.
 * getSession() trusts whatever is in the cookie without checking it with
 * Supabase, so it can be faked. getUser() actually verifies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server components are not allowed to set cookies. That is
            // fine: proxy.ts refreshes the session on every request, so
            // the cookie is already up to date by the time we get here.
          }
        },
      },
    }
  );
}
