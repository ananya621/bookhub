"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { adminAccounts } from "@/lib/mock";

/*
 * Ported from the `isAdminUsers` block in Prototype with Admin.dc.html
 * (lines 95-122). The source pages `adminAccounts` 3-per-page,
 * filterable by display name (source lines ~2272-2299) — reimplemented
 * here as local `useState` since each screen is its own component
 * rather than one shared state object.
 *
 * Rows link through to /admin/users/<id> (the source's `u.open`).
 * There's no mutation on this screen, so no local copy of
 * `adminAccounts` is needed — filtering/paging read the import
 * directly.
 */

const PAGE_SIZE = 3;

const STATE_LABEL: Record<string, string> = {
  pending: "Reported",
  banned: "Banned",
  deleted: "Deleted",
  allowed: "Cleared",
  renamed: "Renamed",
  warned: "Warned",
  clean: "OK",
};

const STATE_STYLE: Record<string, CSSProperties> = {
  pending: { background: "#ff3d9a", color: "#14110f", borderColor: "#14110f" },
  banned: { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" },
  deleted: { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" },
  allowed: { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" },
  renamed: { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" },
  warned: { background: "#FFD400", color: "#14110f", borderColor: "#14110f" },
  clean: { background: "transparent", color: "var(--color-text)", borderColor: "var(--color-text)" },
};

const NAME_REFUSED_STYLE: CSSProperties = { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" };

export default function AdminUsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () => adminAccounts.filter((a) => !search || a.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function openUser(id: string) {
    router.push(`/admin/users/${id}`);
  }

  return (
    <>
      <AdminNav />
      <div className="wrap">
        <h1 style={{ fontSize: 36, margin: "0 0 6px" }}>All users</h1>
        <p style={{ fontSize: 14, marginBottom: 20 }}>
          Every account, not just the reported ones. Open anyone to see their reviews and act on
          them.
        </p>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input
            className="input"
            style={{ flex: 1, minHeight: 44 }}
            placeholder="Search display names"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div style={{ borderTop: "3px solid var(--color-text)" }}>
          {pageUsers.map((a) => {
            const nameRefused = a.status === "pending" && a.flag === "name";
            const label = nameRefused ? "Name refused" : STATE_LABEL[a.status];
            const style = nameRefused ? NAME_REFUSED_STYLE : STATE_STYLE[a.status];
            return (
              <div
                key={a.id}
                className="qrow rowlink"
                style={{ alignItems: "center", padding: "12px 8px" }}
                onClick={() => openUser(a.id)}
              >
                <div
                  style={{
                    display: "inline-grid",
                    placeItems: "center",
                    width: 40,
                    height: 40,
                    flex: "none",
                    border: "3px solid var(--color-text)",
                    background: a.colour,
                    color: a.ink,
                    fontFamily: "var(--font-heading)",
                    fontWeight: 700,
                    fontSize: 17,
                  }}
                >
                  {a.name.slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17 }}>
                    {a.name}
                  </div>
                  <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 3 }}>
                    JOINED {a.joined} · {a.reviews} {a.reviews === 1 ? "REVIEW" : "REVIEWS"} ·{" "}
                    {a.lists} {a.lists === 1 ? "LIST" : "LISTS"}
                  </div>
                </div>
                <span className="tag" style={style}>
                  {label}
                </span>
                <button
                  className="btn btn-secondary"
                  style={{ flex: "none" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openUser(a.id);
                  }}
                >
                  Open
                </button>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
          <button className="btn btn-secondary" onClick={() => setPage((p) => Math.max(0, p - 1))}>
            ← Previous
          </button>
          <span className="mono" style={{ color: "var(--color-neutral-700)" }}>
            PAGE {page + 1} OF {pageCount}
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next →
          </button>
        </div>
      </div>
    </>
  );
}
