"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setReadingStatus, clearReadingStatus } from "@/app/actions/reading";

export type ShelfBook = {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  progress: string | null;
};

type Shelf = {
  name: string;
  key: "reading" | "want" | "read";
  emptyMsg: string;
  books: ShelfBook[];
};

/*
 * The per-book <select> that moves a book between shelves or removes
 * it, wired to the real setReadingStatus/clearReadingStatus actions.
 * router.refresh() re-runs the server component's query afterward, so
 * a moved book actually leaves its old shelf and appears on the new
 * one instead of the page only updating once you next navigate here.
 */
export default function TrackerShelves({ shelves }: { shelves: Shelf[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function move(bookId: string, value: string) {
    startTransition(async () => {
      if (value === "none") {
        const formData = new FormData();
        formData.set("bookId", bookId);
        await clearReadingStatus(undefined, formData);
      } else {
        const formData = new FormData();
        formData.set("bookId", bookId);
        formData.set("status", value);
        await setReadingStatus(undefined, formData);
      }
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
      {shelves.map((shelf) => (
        <div key={shelf.key}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              borderBottom: "1px solid var(--color-divider)",
              paddingBottom: 6,
              marginBottom: 14,
            }}
          >
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>{shelf.name}</div>
            <span className="mono" style={{ color: "var(--color-accent-700)" }}>{shelf.books.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {shelf.books.map((b) => (
              <div key={b.id} className="card" style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                {b.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.coverUrl}
                    alt=""
                    className="rowlink"
                    style={{ width: 36, height: 52, flex: "none", objectFit: "cover", border: "3px solid var(--color-text)" }}
                    onClick={() => router.push(`/book/${b.id}`)}
                  />
                ) : (
                  <div
                    className="cover rowlink"
                    style={{ width: 36, height: 52, flex: "none" }}
                    onClick={() => router.push(`/book/${b.id}`)}
                  />
                )}
                <div className="rowlink" style={{ flex: 1 }} onClick={() => router.push(`/book/${b.id}`)}>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{b.title}</div>
                  <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                    {(b.author || "unknown author").toUpperCase()}
                  </div>
                </div>
                <select
                  className="input"
                  style={{ width: 42, padding: 4, fontSize: 11 }}
                  value={shelf.key}
                  disabled={pending}
                  onChange={(e) => move(b.id, e.target.value)}
                >
                  <option value="read">Read</option>
                  <option value="reading">Reading</option>
                  <option value="want">Want</option>
                  <option value="none">Remove</option>
                </select>
              </div>
            ))}
            {shelf.books.length === 0 && (
              <div style={{ border: "1px dashed var(--color-divider)", padding: "22px 14px", textAlign: "center" }}>
                <div className="mono text-muted">{shelf.emptyMsg}</div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
