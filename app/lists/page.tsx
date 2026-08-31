"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Nav from "@/components/Nav";
import { bookById } from "@/lib/mock";
import { seedLists, slugify, type ReadingList } from "@/app/lists/data";

/*
 * Ported from the `isLists` block in Prototype with Admin.dc.html
 * (lines 1119-1196).
 *
 * The two lists (`seedLists`) and the `slugify` helper live in
 * ./data.ts, not here — see that file for why: this page is a client
 * component, and `app/lists/[slug]/page.tsx` (a server component)
 * can't reliably import plain data back out of a "use client" module
 * in this Next.js version.
 *
 * `hasBanned`, the profanity/impersonation filter the export runs list
 * names through, isn't available data here (it's inline in the export,
 * not exposed via lib/mock.ts), so `createList` substitutes a
 * duplicate-name check instead — the nearest reasonable validation we
 * can actually derive.
 *
 * The export doesn't offer renaming a list on this screen (only create,
 * delete, and toggling public/private), so that's all that's wired up
 * here — matching the source exactly.
 *
 * Shelf status (used for each book's "ALSO IN: ..." line) is seeded
 * locally, matching the same seed used on Home/Tracker. It isn't
 * shared across those pages — see the comment there — so moving a book
 * on Tracker won't update the label here until there's a real account
 * to store it against.
 *
 * The share link shown/opened here points at our real `/lists/[slug]`
 * route (built from the list name) rather than the export's fake
 * `bookhub.example/l/<n>fk2p` string, so "Open share link" actually
 * works. Because that route reads the static `seedLists` from
 * ./data.ts rather than this page's live state, deleting a list here
 * won't make its share link 404 the way the export's "Try the old
 * link" flow implies — there's no backend yet to persist the deletion.
 */

type Status = "read" | "reading" | "want" | "none";

const shelfStatuses: Record<string, Status> = {
  hobbit: "read",
  nevermoor: "reading",
  skellig: "reading",
  coraline: "want",
  holes: "want",
};

const alsoInLabel: Record<Status, string> = {
  read: "ALSO IN: READ",
  reading: "ALSO IN: CURRENTLY READING",
  want: "ALSO IN: WANT TO READ",
  none: "NOT ON A SHELF",
};

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ReadingList[]>(seedLists);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [newListName, setNewListName] = useState("");
  const [listError, setListError] = useState("");
  const [listDeleted, setListDeleted] = useState(false);

  const curList = lists[selectedIndex] ?? { name: "—", isPublic: false, bookIds: [] };
  const curListBooks = curList.bookIds.map((id, i) => {
    const book = bookById(id);
    const status = shelfStatuses[id] ?? "none";
    return {
      n: String(i + 1),
      id,
      title: book?.title ?? id,
      author: book?.author ?? "",
      alsoUp: alsoInLabel[status],
    };
  });
  const slug = slugify(curList.name);

  const removeBook = (id: string) => {
    setLists((ls) =>
      ls.map((l, i) => (i === selectedIndex ? { ...l, bookIds: l.bookIds.filter((x) => x !== id) } : l))
    );
  };

  const createList = () => {
    const name = newListName.trim();
    if (!name) return;
    if (lists.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
      setListError("YOU ALREADY HAVE A LIST WITH THAT NAME");
      return;
    }
    setLists((ls) => [...ls, { name, isPublic: false, bookIds: [] }]);
    setSelectedIndex(lists.length);
    setNewListName("");
    setListError("");
  };

  const deleteList = () => {
    if (lists.length === 0) return;
    if (!window.confirm(`Delete "${curList.name}"? This can't be undone.`)) return;
    setLists((ls) => ls.filter((_, i) => i !== selectedIndex));
    setSelectedIndex((i) => Math.max(0, i - 1));
    setListDeleted(true);
  };

  const setPublic = (isPublic: boolean) => {
    setLists((ls) => ls.map((l, i) => (i === selectedIndex ? { ...l, isPublic } : l)));
  };

  return (
    <>
      <Nav />
      <div className="wrap">
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 32 }}>
          <div>
            <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 12 }}>
              MY LISTS ({lists.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {lists.map((l, i) => (
                <div
                  key={l.name}
                  className="rowlink"
                  style={{ padding: "10px 12px", border: "1px solid var(--color-divider)" }}
                  onClick={() => {
                    setSelectedIndex(i);
                    setListDeleted(false);
                  }}
                >
                  <div style={{ fontSize: 14, fontFamily: "var(--font-heading)" }}>{l.name}</div>
                  <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                    {(l.isPublic ? "PUBLIC" : "PRIVATE") + " · " + l.bookIds.length + " BOOKS"}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
              <input
                className="input"
                placeholder="New list name"
                value={newListName}
                onChange={(e) => {
                  setNewListName(e.target.value);
                  setListError("");
                }}
              />
              <button className="btn btn-secondary" onClick={createList}>Add</button>
            </div>
            {listError && (
              <div className="mono" style={{ color: "var(--color-problem-text)", fontWeight: 700, marginTop: 8, lineHeight: 1.6 }}>
                {listError}
              </div>
            )}
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h2 style={{ margin: "0 0 4px" }}>{curList.name}</h2>
                <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                  {curListBooks.length + " BOOKS · " + (curList.isPublic ? "PUBLIC" : "PRIVATE")}
                </div>
              </div>
              <button className="btn btn-ghost" onClick={deleteList}>Delete list</button>
            </div>
            {listDeleted && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "#C41031",
                  color: "#EFECE3",
                  border: "3px solid var(--color-text)",
                  padding: "12px 14px",
                  marginTop: 14,
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15 }}>List deleted.</span>{" "}
                  <span className="mono" style={{ fontWeight: 700 }}>ITS SHARE LINK NOW SHOWS A NOT-FOUND PAGE.</span>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ borderColor: "#EFECE3", color: "#EFECE3" }}
                  onClick={() => router.push(`/lists/${slug}`)}
                >
                  Try the old link
                </button>
                <button className="btn btn-ghost" style={{ color: "#EFECE3" }} onClick={() => setListDeleted(false)}>
                  Dismiss
                </button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--color-divider)", padding: "12px 14px", margin: "20px 0" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>Who can see this list?</div>
                <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
                  PUBLIC — SHOWS ON YOUR PROFILE. PRIVATE — LINK ONLY.
                </div>
              </div>
              <div className="seg">
                <label className="seg-opt" style={{ minHeight: 40 }}>
                  <input type="radio" name="vis" checked={curList.isPublic} onChange={() => setPublic(true)} />
                  Public
                </label>
                <label className="seg-opt" style={{ minHeight: 40 }}>
                  <input type="radio" name="vis" checked={!curList.isPublic} onChange={() => setPublic(false)} />
                  Private
                </label>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
              <input className="input" value={`bookhub.example/lists/${slug}`} readOnly />
              <button className="btn btn-primary" onClick={() => router.push(`/lists/${slug}`)}>Open share link</button>
            </div>
            <div style={{ borderTop: "1px solid var(--color-divider)" }}>
              {curListBooks.map((b) => (
                <div
                  key={b.id}
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: "12px 0",
                    alignItems: "center",
                    borderBottom: "1px solid color-mix(in srgb, var(--color-text) 9%, transparent)",
                  }}
                >
                  <span className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>{b.n}</span>
                  <div
                    className="cover rowlink"
                    style={{ width: 34, height: 50, flex: "none" }}
                    onClick={() => router.push(`/book/${b.id}`)}
                  />
                  <div className="rowlink" style={{ flex: 1 }} onClick={() => router.push(`/book/${b.id}`)}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: 17 }}>{b.title}</div>
                    <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>{b.alsoUp}</div>
                  </div>
                  <button className="btn btn-ghost" onClick={() => removeBook(b.id)}>Remove</button>
                </div>
              ))}
            </div>
            {curListBooks.length === 0 && (
              <div style={{ border: "1px dashed var(--color-divider)", padding: 30, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>This list is empty</div>
                <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 14px" }}>
                  Open a book and use &ldquo;Add to a list&rdquo;.
                </p>
                <Link href="/search" className="btn btn-secondary">Browse books</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
