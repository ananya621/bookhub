"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type UserRow = {
  id: string;
  displayName: string | null;
  avatarColor: string;
  joined: string;
  isAdmin: boolean;
  isSelf: boolean;
  pending: { deletedBy: "self" | "admin"; purgeAt: string } | null;
  isBanned: boolean;
  reportCount: number;
};

const PAGE_SIZE = 3;

function daysLeft(purgeAt: string): number {
  const ms = new Date(purgeAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function UsersList({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () =>
      users.filter(
        (u) => !search || (u.displayName ?? "").toLowerCase().includes(search.toLowerCase())
      ),
    [users, search]
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function openUser(id: string) {
    router.push(`/admin/users/${id}`);
  }

  return (
    <>
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
      {pageUsers.length === 0 ? (
        <div className="mono" style={{ color: "var(--color-neutral-700)", padding: "28px 0" }}>
          NO MATCHING ACCOUNTS.
        </div>
      ) : (
        <div style={{ borderTop: "3px solid var(--color-text)" }}>
          {pageUsers.map((u) => (
            <div
              key={u.id}
              className="qrow rowlink"
              style={{ alignItems: "center", padding: "12px 8px" }}
              onClick={() => openUser(u.id)}
            >
              <div
                style={{
                  display: "inline-grid",
                  placeItems: "center",
                  width: 40,
                  height: 40,
                  flex: "none",
                  border: "3px solid var(--color-text)",
                  background: u.avatarColor,
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: 17,
                }}
              >
                {(u.displayName || "?").slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17 }}>
                    {u.displayName || "(no name set yet)"}
                  </div>
                  {u.isAdmin && <span className="tag tag-accent">Admin</span>}
                  {u.isSelf && <span className="tag tag-neutral">You</span>}
                </div>
                <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 3 }}>
                  JOINED {new Date(u.joined).toLocaleDateString()}
                </div>
              </div>
              {u.pending && (
                <span className="tag" style={{ background: "#FFD400", color: "#14110f" }}>
                  Pending deletion · {daysLeft(u.pending.purgeAt)}d left
                </span>
              )}
              {u.isBanned && (
                <span className="tag" style={{ background: "#C41031", color: "#EFECE3" }}>
                  Banned
                </span>
              )}
              {u.reportCount > 0 && (
                <span className="tag" style={{ background: "#ff3d9a", color: "#14110f" }}>
                  Reported ×{u.reportCount}
                </span>
              )}
              <button
                className="btn btn-secondary"
                style={{ flex: "none" }}
                onClick={(e) => {
                  e.stopPropagation();
                  openUser(u.id);
                }}
              >
                Open
              </button>
            </div>
          ))}
        </div>
      )}
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
    </>
  );
}
