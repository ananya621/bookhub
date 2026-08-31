"use client";

import { useState } from "react";
import { useSessionData } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { books } from "@/lib/mock";

/*
 * Ported from the `isTracker` block in Prototype with Admin.dc.html
 * (lines 1085-1118).
 *
 * Each shelf is a plain <select> per book, exactly as in the export —
 * there's no segmented control or progress self-report on this screen.
 * That `.seg-opt[data-state=...]` colour-coded control (and the
 * three-step progress picker) lives on the book detail screen
 * (`isBook`, source ~line 980), which is out of scope here.
 *
 * Shelf membership is local `useState`, seeded with a few books
 * already sorted onto shelves so the screen has something to show.
 * This mirrors — but doesn't share — the same seed used on the Home
 * screen: moving a book here doesn't update Home, and vice versa,
 * until there's a real account to store shelf status against.
 */

type Status = "read" | "reading" | "want" | "none";

/* Shelves come from the signed-in reader (persona fixture today,
   Supabase later) rather than a hardcoded seed, so an account with
   nothing tracked renders the empty shelves. */

// Order and copy match `shelfDefs` in the source exactly.
const shelfDefs: { name: string; key: Exclude<Status, "none">; emptyMsg: string }[] = [
  { name: "Currently Reading", key: "reading", emptyMsg: "MARK A BOOK AS CURRENTLY READING" },
  { name: "Want to Read", key: "want", emptyMsg: "NOTHING SAVED FOR LATER YET" },
  { name: "Read", key: "read", emptyMsg: "FINISHED BOOKS LAND HERE" },
];

export default function TrackerPage() {
  const router = useRouter();
  const sessionData = useSessionData();
  const [statuses, setStatuses] = useState<Record<string, Status>>(sessionData.statuses);

  const statusOf = (id: string): Status => statuses[id] ?? "none";
  const move = (id: string, status: Status) => setStatuses((s) => ({ ...s, [id]: status }));

  const shelves = shelfDefs.map((shelf) => ({
    ...shelf,
    books: books.filter((b) => statusOf(b.id) === shelf.key),
  }));

  return (
    <>
      <Nav />
      <div className="wrap">
        <h1 style={{ fontSize: 36, margin: "0 0 22px" }}>Reading tracker</h1>
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
                    <div
                      className="cover rowlink"
                      style={{ width: 36, height: 52, flex: "none" }}
                      onClick={() => router.push(`/book/${b.id}`)}
                    />
                    <div className="rowlink" style={{ flex: 1 }} onClick={() => router.push(`/book/${b.id}`)}>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{b.title}</div>
                      <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                        {b.author.toUpperCase()}
                      </div>
                    </div>
                    <select
                      className="input"
                      style={{ width: 42, padding: 4, fontSize: 11 }}
                      value={statusOf(b.id)}
                      onChange={(e) => move(b.id, e.target.value as Status)}
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
      </div>
    </>
  );
}
