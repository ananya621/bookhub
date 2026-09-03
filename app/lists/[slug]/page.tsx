import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import BookCover from "@/components/BookCover";
import Nav from "@/components/Nav";

/*
 * Ported from the `isShared` block in Prototype with Admin.dc.html
 * (lines 1197-1221) — the public, read-only view of a reading list, as
 * a visitor (not necessarily signed in) sees it via its share link.
 *
 * Now backed by the real get_shared_list() database function (see
 * supabase/migrations/20260903000200_lists.sql) instead of the
 * hand-seeded `seedLists` fixture — that function is the only way to
 * read a list by slug from outside its owner, since the `lists` table
 * itself is owner-only. An unknown slug (including a deleted list)
 * still 404s, same as before.
 *
 * This is board C3, which gets its own trimmed nav (Book Hub · Search ·
 * Log in/Get Started, or the reader's own avatar if they followed the
 * link while signed in) rather than the full site nav — a visitor
 * here "has one job" (C3's own note), and the full nav's Tracker/My
 * Lists/Recommendations links would suggest there's more to do on this
 * page than there is. See the `minimal` branch in components/Nav.tsx
 * for that variant. The content below still isn't wrapped in `.wrap`
 * (the same plain centered div as before) — C3's own width and padding
 * don't match the standard page shell.
 */
export default async function SharedListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_shared_list", { p_slug: slug }).maybeSingle();
  if (!data) notFound();

  // Most people who open a shared link are strangers who don't have an
  // account, which is the whole point of this screen. Only offer "back
  // to my lists" to someone who actually has some — for a guest it is a
  // link to a page they'd immediately be bounced off.
  const viewer = await getCurrentUser();

  const list = data as {
    name: string;
    owner_display_name: string | null;
    books: { id: string; title: string; author: string; coverUrl: string | null }[];
  };
  const readerName = list.owner_display_name || "a reader";

  return (
    <>
      <Nav minimal />
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 24px 60px" }}>
        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 8 }}>
          A READING LIST SHARED BY {readerName.toUpperCase()}
        </div>
        <h1 style={{ fontSize: 36, margin: "0 0 4px" }}>{list.name}</h1>
        <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginBottom: 24 }}>
          {list.books.length + " BOOKS · VIEW ONLY"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          {list.books.map((b) => (
            <div key={b.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <BookCover src={b.coverUrl} />
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 15 }}>{b.title}</div>
            </div>
          ))}
        </div>
        <div className="blueprint" style={{ padding: 20, background: "var(--color-accent-100)" }}>
          <i className="corner tl" />
          <i className="corner tr" />
          <i className="corner bl" />
          <i className="corner br" />
          {viewer ? (
            <>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, marginBottom: 4 }}>
                Fancy making your own?
              </div>
              <p style={{ fontSize: 13, marginBottom: 14 }}>
                Your lists live on your own page, and share the same way this one did.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <Link href="/lists" className="btn btn-primary">Back to my lists</Link>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, marginBottom: 4 }}>
                Want a list like this?
              </div>
              <p style={{ fontSize: 13, marginBottom: 14 }}>
                Make a free account and start tracking what you read.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <Link href="/start" className="btn btn-primary">Get Started</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
