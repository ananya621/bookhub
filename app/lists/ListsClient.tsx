"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createList,
  deleteList,
  removeBookFromList,
  setListVisibility,
  type ActionResult,
} from "@/app/actions/lists";

/*
 * The interactive half of /lists — split out so the page can stay a
 * server component reading real lists. See page.tsx for what changed
 * from the persona-fixture version this replaces.
 */

const alsoInLabel: Record<string, string> = {
  read: "ALSO IN: READ",
  reading: "ALSO IN: CURRENTLY READING",
  want: "ALSO IN: WANT TO READ",
};

export type ListRow = {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
  books: { id: string; title: string; author: string; coverUrl: string | null; status: string | null }[];
};

export default function ListsClient({ lists }: { lists: ListRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [createState, createAction, creating] = useActionState<ActionResult, FormData>(
    createList,
    undefined
  );
  const [selectedId, setSelectedId] = useState<string | null>(lists[0]?.id ?? null);
  const [listDeleted, setListDeleted] = useState<{ slug: string } | null>(null);
  const [error, setError] = useState("");

  const curList = lists.find((l) => l.id === selectedId) ?? lists[0] ?? null;

  const createError = createState && "error" in createState ? createState.error : "";

  function selectAndClearNotice(id: string) {
    setSelectedId(id);
    setListDeleted(null);
  }

  async function doDelete() {
    if (!curList) return;
    if (!window.confirm(`Delete "${curList.name}"? This can't be undone.`)) return;
    const formData = new FormData();
    formData.set("listId", curList.id);
    const result = await deleteList(undefined, formData);
    if (result && "error" in result) return setError(result.error);
    setListDeleted({ slug: curList.slug });
    setSelectedId(null);
    startTransition(() => router.refresh());
  }

  async function setPublic(isPublic: boolean) {
    if (!curList) return;
    const formData = new FormData();
    formData.set("listId", curList.id);
    formData.set("isPublic", String(isPublic));
    const result = await setListVisibility(undefined, formData);
    if (result && "error" in result) return setError(result.error);
    startTransition(() => router.refresh());
  }

  async function removeBook(bookId: string) {
    if (!curList) return;
    const formData = new FormData();
    formData.set("listId", curList.id);
    formData.set("bookId", bookId);
    const result = await removeBookFromList(undefined, formData);
    if (result && "error" in result) return setError(result.error);
    startTransition(() => router.refresh());
  }

  if (lists.length === 0 && !listDeleted) {
    return (
      <div style={{ maxWidth: 420, margin: "40px auto" }}>
        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 12 }}>
          MY LISTS (0)
        </div>
        <div style={{ border: "1px dashed var(--color-divider)", padding: 30, textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>No lists yet</div>
          <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 0" }}>
            Start one below, then open a book and use &ldquo;Add to a list&rdquo;.
          </p>
        </div>
        <form action={createAction} style={{ display: "flex", gap: 6 }}>
          <input className="input" name="name" placeholder="New list name" />
          <button className="btn btn-primary" type="submit" disabled={creating}>
            Add
          </button>
        </form>
        {createError && (
          <div className="mono" style={{ color: "var(--color-problem-text)", fontWeight: 700, marginTop: 8 }}>
            {createError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 32 }}>
      <div>
        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 12 }}>
          MY LISTS ({lists.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {lists.map((l) => (
            <div
              key={l.id}
              className="rowlink"
              style={{
                padding: "10px 12px",
                border: "1px solid var(--color-divider)",
                background: l.id === selectedId ? "var(--color-accent-100)" : undefined,
              }}
              onClick={() => selectAndClearNotice(l.id)}
            >
              <div style={{ fontSize: 14, fontFamily: "var(--font-heading)" }}>{l.name}</div>
              <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                {(l.isPublic ? "PUBLIC" : "PRIVATE") + " · " + l.books.length + " BOOKS"}
              </div>
            </div>
          ))}
        </div>
        <form action={createAction} style={{ display: "flex", gap: 6, marginTop: 14 }}>
          <input className="input" name="name" placeholder="New list name" />
          <button className="btn btn-secondary" type="submit" disabled={creating}>
            Add
          </button>
        </form>
        {createError && (
          <div className="mono" style={{ color: "var(--color-problem-text)", fontWeight: 700, marginTop: 8, lineHeight: 1.6 }}>
            {createError}
          </div>
        )}
      </div>
      <div>
        {error && (
          <div className="mono" style={{ color: "var(--color-problem-text)", marginBottom: 14 }}>
            {error}
          </div>
        )}
        {curList ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h2 style={{ margin: "0 0 4px" }}>{curList.name}</h2>
                <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                  {curList.books.length + " BOOKS · " + (curList.isPublic ? "PUBLIC" : "PRIVATE")}
                </div>
              </div>
              <button className="btn btn-ghost" onClick={doDelete}>
                Delete list
              </button>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: "1px solid var(--color-divider)",
                padding: "12px 14px",
                margin: "20px 0",
              }}
            >
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
              <input className="input" value={`bookhub.example/lists/${curList.slug}`} readOnly />
              <Link href={`/lists/${curList.slug}`} className="btn btn-primary">
                Open share link
              </Link>
            </div>
            <div style={{ borderTop: "1px solid var(--color-divider)" }}>
              {curList.books.map((b, i) => (
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
                  <span className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
                    {i + 1}
                  </span>
                  <Link href={`/book/${b.id}`} className="rowlink" style={{ flex: "none" }}>
                    {b.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.coverUrl}
                        alt=""
                        style={{ width: 34, height: 50, objectFit: "cover", border: "3px solid var(--color-text)" }}
                      />
                    ) : (
                      <span className="cover" style={{ width: 34, height: 50, display: "block" }} />
                    )}
                  </Link>
                  <Link href={`/book/${b.id}`} className="rowlink" style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: 17 }}>{b.title}</div>
                    <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                      {b.status ? alsoInLabel[b.status] : "NOT ON A SHELF"}
                    </div>
                  </Link>
                  <button className="btn btn-ghost" onClick={() => removeBook(b.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
            {curList.books.length === 0 && (
              <div style={{ border: "1px dashed var(--color-divider)", padding: 30, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>This list is empty</div>
                <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 14px" }}>
                  Open a book and use &ldquo;Add to a list&rdquo;.
                </p>
                <Link href="/search" className="btn btn-secondary">
                  Browse books
                </Link>
              </div>
            )}
          </>
        ) : (
          listDeleted && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#C41031",
                color: "#EFECE3",
                border: "3px solid var(--color-text)",
                padding: "12px 14px",
              }}
            >
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15 }}>List deleted.</span>{" "}
                <span className="mono" style={{ fontWeight: 700 }}>ITS SHARE LINK NOW SHOWS A NOT-FOUND PAGE.</span>
              </div>
              <button className="btn btn-ghost" style={{ color: "#EFECE3" }} onClick={() => setListDeleted(null)}>
                Dismiss
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
