import type { SupabaseClient } from "@supabase/supabase-js";

/*
 * The one way to ask "is there something in this text we shouldn't
 * publish".
 *
 * It exists because of a bug worth not repeating. Every caller used to
 * do this:
 *
 *   const { data: hasBanned } = await supabase.rpc("contains_banned_word", { v: text });
 *   if (hasBanned) return { blocked: true };
 *
 * which reads fine and is wrong. It takes `data` and drops `error`. When
 * the call failed -- and in production it failed every single time, on a
 * missing execute grant deep inside the function -- `data` came back
 * null, null is falsy, and the text sailed through as if it had been
 * checked and found clean. The filter was doing nothing at all on a
 * site built for children, and nothing said so.
 *
 * So this FAILS CLOSED. If the check cannot be completed, the answer is
 * "treat it as banned", never "assume it's fine". Refusing to publish
 * something that was probably harmless is a nuisance; publishing
 * something harmful because a database call errored is the thing this
 * whole filter exists to stop.
 *
 * It also logs, because the first version of this bug was invisible.
 * A filter that has quietly stopped working should show up in the logs,
 * not just in what gets published.
 */
export async function containsBannedWord(
  supabase: SupabaseClient,
  text: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("contains_banned_word", { v: text });

  if (error) {
    console.error(
      "[word-filter] contains_banned_word failed, refusing the text rather " +
        "than letting it through unchecked:",
      error.message
    );
    return true;
  }

  return Boolean(data);
}
