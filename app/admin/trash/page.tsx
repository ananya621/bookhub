"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import AdminNav from "@/components/AdminNav";
import { trash } from "@/lib/mock";

/*
 * Ported from the `isAdminTrash` block in Prototype with Admin.dc.html
 * (lines 240-266). A 14-day soft-delete list. In the source both
 * "Put it back" and "Delete for good" simply drop the item from
 * `trash` (source lines ~2233-2238) — there's no real distinction yet
 * between restoring and purging without a backend to restore *to*, so
 * that's kept as-is here rather than inventing different behaviour.
 */

export default function AdminTrashPage() {
  const [items, setItems] = useState(trash);

  function remove(id: string) {
    setItems((ts) => ts.filter((x) => x.id !== id));
  }

  return (
    <>
      <Nav />
      <Nav />
    <AdminNav />
      <div className="wrap">
        <h1 style={{ fontSize: 36, margin: "0 0 6px" }}>Trash</h1>
        <p style={{ fontSize: 14, marginBottom: 22 }}>
          Everything you deleted or banned, kept for 14 days. Nothing here is visible to readers,
          and anything can be put back.
        </p>
        {items.length === 0 && (
          <div style={{ border: "3px dashed var(--color-divider)", padding: 30, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20 }}>
              Trash is empty
            </div>
            <p className="mono" style={{ color: "var(--color-neutral-700)", margin: "6px 0 0" }}>
              NOTHING DELETED IN THE LAST 14 DAYS
            </p>
          </div>
        )}
        <div style={{ borderTop: "3px solid var(--color-text)" }}>
          {items.map((t) => (
            <div key={t.id} className="qrow" style={{ alignItems: "center" }}>
              <span className="tag tag-neutral" style={{ flex: "none" }}>
                {t.kind}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16 }}>
                  {t.name}
                </div>
                <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 3 }}>
                  {t.by} · {t.when}
                </div>
              </div>
              <span className="tag" style={{ flex: "none", background: "#FFD400", color: "#14110f" }}>
                {t.daysLeft} {t.daysLeft === 1 ? "day left" : "days left"}
              </span>
              <div style={{ display: "flex", gap: 8, flex: "none" }}>
                <button className="btn btn-primary" onClick={() => remove(t.id)}>
                  Put it back
                </button>
                <button className="btn btn-secondary" onClick={() => remove(t.id)}>
                  Delete for good
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 16, lineHeight: 1.7 }}>
          AFTER 14 DAYS ITEMS ARE REMOVED AUTOMATICALLY. THAT WINDOW IS WHY DELETES ARE SOFT IN THE
          DATABASE RATHER THAN DESTRUCTIVE.
        </div>
      </div>
    </>
  );
}
