"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { palette, requests } from "@/lib/mock";
import { seedLists } from "@/app/lists/data";

/*
 * Ported from the `isProfile` block in Prototype with Admin.dc.html
 * (lines 1222-1269). This is a plain page (not a layout) so it doesn't
 * interfere with the sibling `app/profile/setup/page.tsx` route, which
 * belongs to another screen ("Name & colour" links there).
 *
 * `profile` is in the export's `chrome` list, so — unlike the
 * chrome-less `isShared`/`isRequest` screens — it gets the nav bar, even
 * though its own wrapper here is the plain centered div from the
 * source, not `.wrap`.
 *
 * There's no persisted account yet, so display name, avatar colour and
 * email fall back to the export's own defaults ('Maya', the palette's
 * default 'Blue', 'maya@school.uk') exactly as the source does when
 * nothing has been entered. Public lists are read from the same
 * `seedLists` used by /lists and /lists/[slug]; picking one here just
 * opens /lists rather than pre-selecting it, since there's no shared
 * state to carry a selection across pages yet.
 *
 * "Log out" and "Delete my account" need a real session/backend that
 * doesn't exist yet, so they're wired to local, optimistic actions
 * (see comments below) rather than an invented fetch() call.
 */

const READER_NAME = "Maya";
const ACCOUNT_EMAIL = "maya@school.uk";
const AVATAR_COLOR_NAME = "Blue";
const avatar = palette.find((p) => p.name === AVATAR_COLOR_NAME) ?? palette[4];

// Matches the export's default seeded survey answers (see app/home/page.tsx).
const survey = {
  genres: ["Fantasy", "Adventure"],
  level: "Middle Grade",
  length: "200–400 pages",
};
const prefTags = [...survey.genres, survey.level, survey.length];

const publicLists = seedLists.filter((l) => l.isPublic);
const privateCount = seedLists.filter((l) => !l.isPublic).length;

export default function ProfilePage() {
  const router = useRouter();

  const logout = () => {
    // Local-only: there's no session to clear yet, so this just sends
    // the reader back to the landing page.
    router.push("/");
  };

  const deleteMyAccount = () => {
    // Local-only: no backend to actually delete against yet.
    if (window.confirm("Delete your account? Everything goes, and only the site owner can recover it, for 14 days.")) {
      router.push("/");
    }
  };

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div
            className="blueprint"
            style={{ width: 60, height: 60, flex: "none", display: "grid", placeItems: "center", background: avatar.css }}
          >
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 28, color: avatar.ink }}>
              {READER_NAME.slice(0, 1).toUpperCase()}
            </span>
          </div>
          <h1 style={{ fontSize: 36, margin: 0 }}>{READER_NAME}’s profile</h1>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-kicker">Reading preferences</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0 10px" }}>
            {prefTags.map((t) => (
              <span key={t} className="tag tag-accent">{t}</span>
            ))}
          </div>
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
                  {l.bookIds.length + " BOOKS"}
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
            {requests.length} ASKED FOR · {requests.filter((r) => r.status === "pending").length} STILL PENDING
          </div>
          <Link href="/requests" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>See my requests</Link>
        </div>

        <div className="card">
          <div className="card-kicker">Account</div>
          <div style={{ fontSize: 15 }}>{ACCOUNT_EMAIL}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <Link href="/profile/setup" className="btn btn-secondary">Name &amp; colour</Link>
            <Link href="/reset" className="btn btn-secondary">Change password</Link>
            <button className="btn btn-ghost" onClick={logout}>Log out</button>
          </div>
        </div>

        <div style={{ border: "3px solid #C41031", padding: 16, marginTop: 22 }}>
          <div className="mono" style={{ color: "var(--color-problem-text)", fontWeight: 700, marginBottom: 6 }}>
            DELETE MY ACCOUNT
          </div>
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            Everything goes — shelves, lists, reviews and requests. Only the site owner can recover it, and only for 14 days.
          </p>
          <button className="btn" style={{ background: "#C41031", color: "#EFECE3" }} onClick={deleteMyAccount}>
            Delete my account
          </button>
        </div>
      </div>
    </>
  );
}
