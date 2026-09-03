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
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
