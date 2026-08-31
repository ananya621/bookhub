"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PERSONAS, PERSONA_ORDER, type PersonaId } from "@/lib/personas";

/*
 * Dev-only floating persona switcher.
 *
 * Picking a persona POSTs to /api/dev/persona, which sets the same
 * httpOnly session cookie a real login would, then refreshes so the
 * server re-renders with the new user. Nothing here reads or writes
 * the cookie directly — the client is not supposed to be able to.
 *
 * The root layout only mounts this outside production, and the route
 * handler 404s there too, so it cannot ship by accident.
 *
 * Styling is deliberately not the Pulp design system: this is scaffolding,
 * not part of the product, and it should never be mistaken for a real
 * control while testing.
 */

export default function DevPersonaSwitcher({ current }: { current: PersonaId }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function pick(id: PersonaId) {
    setOpen(false);
    startTransition(async () => {
      await fetch("/api/dev/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: id }),
      });
      // Re-runs the server components so getCurrentUser() sees the new
      // cookie. Without this the nav would keep the old user until a
      // full navigation.
      router.refresh();
    });
  }

  const active = PERSONAS[current];

  return (
    <div style={S.root}>
      {open && (
        <div style={S.menu} role="menu" aria-label="Test personas">
          <div style={S.menuHead}>Sign in as</div>
          {PERSONA_ORDER.map((id) => {
            const p = PERSONAS[id];
            const isActive = id === current;
            return (
              <button
                key={id}
                role="menuitem"
                onClick={() => pick(id)}
                style={{ ...S.item, ...(isActive ? S.itemActive : null) }}
              >
                <span style={S.itemLabel}>
                  {isActive && <span aria-hidden="true">→ </span>}
                  {p.label}
                </span>
                <span style={S.itemNote}>{p.note}</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        style={S.fab}
        title="Switch test persona (development only)"
      >
        <span style={S.fabDot} aria-hidden="true" />
        {pending ? "switching…" : active.label}
      </button>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    bottom: 16,
    left: 16,
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 8,
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
  },
  fab: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "#1c1c22",
    color: "#f2f2f4",
    font: "500 12px/1 ui-sans-serif, system-ui, sans-serif",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(0,0,0,0.32)",
  },
  fabDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#5ad07a",
    flex: "none",
  },
  menu: {
    width: 310,
    padding: 6,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "#1c1c22",
    boxShadow: "0 12px 34px rgba(0,0,0,0.42)",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  menuHead: {
    padding: "8px 10px 6px",
    font: "600 10px/1 ui-sans-serif, system-ui, sans-serif",
    letterSpacing: "0.09em",
    textTransform: "uppercase",
    color: "#8b8b96",
  },
  item: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: "8px 10px",
    borderRadius: 8,
    border: 0,
    background: "transparent",
    color: "#f2f2f4",
    textAlign: "left",
    cursor: "pointer",
  },
  itemActive: { background: "rgba(255,255,255,0.09)" },
  itemLabel: { font: "600 13px/1.3 ui-sans-serif, system-ui, sans-serif" },
  itemNote: { font: "400 11px/1.45 ui-sans-serif, system-ui, sans-serif", color: "#9a9aa6" },
};
