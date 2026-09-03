import Link from "next/link";
import { countLabel } from "@/lib/plural";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import DeleteAccountButton from "./DeleteAccountButton";

/*
 * Ported from the `isProfile` block in Prototype with Admin.dc.html
 * (lines 1222-1269).
 *
 * Rewritten from a pre-auth placeholder that hardcoded "Maya" regardless
 * of who was actually signed in, and whose "Log out" button didn't call
 * the real sign-out action — it just navigated to "/", leaving the
 * session cookie in place. `/profile` is in proxy.ts's protected-route
 * list, so getCurrentUser() here is never null.
 *
 * Preferences and requests come from the real `surveys` and
 * `book_requests` tables — /survey, /home and /requests read the same
 * real tables now too, so this page's numbers actually match what
 * those screens show (they used to read the persona fixture instead,
 * a leftover from before real auth existed).
 *
 * Public lists read the real `lists` table too.
 */
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/start");

  const supabase = await createClient();

  const [{ data: survey }, { data: voterRows }, { data: listRows }] = await Promise.all([
    supabase
      .from("surveys")
      .select("genres, reading_level, preferred_length")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("book_request_voters")
      .select("book_requests(id, status)")
      .eq("user_id", user.id),
    supabase
      .from("lists")
      .select("name, is_public, list_books(book_id)")
      .eq("user_id", user.id),
  ]);

  // D1 colours these two groups differently: genres are the accent
  // tag, reading level and length are the plain neutral one — so the
  // genres (the thing survey answers are mostly about) read as the
  // headline and the other two as supporting detail.
  const genreTags = survey ? (survey.genres as string[]) : [];
  const otherTags = survey ? [survey.reading_level as string, survey.preferred_length as string] : [];

  const myRequests = (voterRows ?? [])
    .map((v) => v.book_requests as unknown as { id: string; status: string } | null)
    .filter((r): r is { id: string; status: string } => r !== null);
  const pendingRequests = myRequests.filter((r) => r.status === "pending").length;

  const lists = (listRows ?? []) as unknown as {
    name: string;
    is_public: boolean;
    list_books: { book_id: string }[];
  }[];
  const publicLists = lists.filter((l) => l.is_public);
  const privateCount = lists.filter((l) => !l.is_public).length;

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div
            className="blueprint"
            style={{
              width: 60,
              height: 60,
              flex: "none",
              display: "grid",
              placeItems: "center",
              background: user.avatarColor,
            }}
          >
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 28, color: user.avatarInk }}>
              {(user.displayName || "?").slice(0, 1).toUpperCase()}
            </span>
          </div>
          <h1 style={{ fontSize: 36, margin: 0 }}>{user.displayName || "Your"}’s profile</h1>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-kicker">Reading preferences</div>
          {genreTags.length > 0 || otherTags.length > 0 ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0 10px" }}>
              {genreTags.map((t) => (
                <span key={t} className="tag tag-genre">{t}</span>
              ))}
              {otherTags.map((t) => (
                <span key={t} className="tag tag-neutral">{t}</span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, margin: "4px 0 10px" }}>No preferences saved yet.</p>
          )}
          <Link href="/survey" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>Edit my answers</Link>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-kicker">Public lists</div>
          <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
            SHOWN TO ANYONE WHO VISITS THIS PROFILE
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            {publicLists.map((l) => (
              <Link
                key={l.name}
                href="/lists"
                className="rowlink"
                style={{ flex: 1, minWidth: 160, border: "1px solid var(--color-divider)", padding: 12 }}
              >
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{l.name}</div>
                <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                  {countLabel(l.list_books.length, "book")}
                </div>
              </Link>
            ))}
            <div style={{ flex: 1, minWidth: 160, border: "1px dashed var(--color-divider)", padding: 12, display: "grid", placeItems: "center" }}>
              <span className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                {privateCount + " PRIVATE LISTS HIDDEN"}
              </span>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-kicker">Book requests</div>
          <div className="mono" style={{ color: "var(--color-neutral-700)" }}>
            {myRequests.length} ASKED FOR · {pendingRequests} STILL PENDING
          </div>
          <Link href="/requests" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>See my requests</Link>
        </div>

        <div className="card">
          <div className="card-kicker">Account</div>
          <div style={{ fontSize: 15 }}>{user.email}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <Link href="/profile/setup" className="btn btn-secondary">Name &amp; colour</Link>
            <Link href="/reset" className="btn btn-secondary">Change password</Link>
            <form action={signOut}>
              <button type="submit" className="btn btn-ghost">Log out</button>
            </form>
          </div>
        </div>

        <div style={{ border: "3px solid #C41031", padding: 16, marginTop: 22 }}>
          <div className="mono" style={{ color: "var(--color-problem-text)", fontWeight: 700, marginBottom: 6 }}>
            DELETE MY ACCOUNT
          </div>
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            Everything goes — shelves, lists, reviews and requests. Only the site owner can recover it, and only for 14 days.
          </p>
          <DeleteAccountButton />
        </div>
      </div>
    </>
  );
}
