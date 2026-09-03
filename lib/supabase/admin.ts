import { createClient } from "@supabase/supabase-js";

/*
 * The service-role client. Bypasses every RLS policy and can act as any
 * user — this is what backs Supabase's admin API (banning, un-banning).
 *
 * Only import this into server actions and route handlers, never
 * anything a client component could pull in. It reads
 * SUPABASE_SERVICE_ROLE_KEY, which must never have the NEXT_PUBLIC_
 * prefix and must never be sent to the browser.
 *
 * Right now the only caller is app/actions/accounts.ts, for the ban/
 * un-ban calls behind recoverable account deletion — reach for
 * lib/supabase/server.ts for everything else, which respects RLS the
 * way a normal signed-in user would.
 */
export function createAdminClient() {
  /*
   * Said plainly, because the alternative is not. Missing this variable
   * gets you "supabaseKey is required" from deep inside the Supabase
   * library, with nothing naming the setting or the environment — which
   * is exactly what production did, surfacing to an admin as a bare
   * internal error on a page that had simply never been given the key.
   */
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Banning, un-banning and the " +
        "admin's view of a reader's email all need it. Add it to .env.local " +
        "locally, or to the Vercel project's environment variables in " +
        "production — see docs/deployment.md."
    );
  }

  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
