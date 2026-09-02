"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
 * Ported from the `.anav` block in Prototype with Admin.dc.html (lines
 * 84-95). Admin is its own shell: this bar replaces the reader nav
 * rather than sitting under it, so "Back to site" is the only way out
 * — a plain link to / here, rather than the export's admin.exit state
 * change.
 *
 * The current prototype (Prototype Admin.dc.html) replaces "Back to
 * site" with a static "OWNER" label and drops the exit link entirely.
 * Decided to keep both rather than lose the only way out of admin —
 * see the conversation this was flagged in.
 *
 * Non-admins are redirected away from /admin/* in middleware.ts, so
 * this bar only ever renders for an admin.
 */

// Order and labels match the current admin prototype's nav bar exactly
// (Prototype Admin.dc.html line 35-44). It has no separate "Accounts"
// link — account moderation lives on /admin/users/[id] now, see the
// commit that retired the standalone Accounts screen.
const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/catalogue", label: "Catalogue" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/safeguarding", label: "Safeguarding" },
  { href: "/admin/trash", label: "Trash" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="anav">
      <b>Book Hub Admin</b>
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          // /admin is a prefix of every other admin route, so it only
          // counts as current on an exact match.
          aria-current={pathname === l.href ? "page" : undefined}
        >
          {l.label}
        </Link>
      ))}
      <span className="mono" style={{ color: "var(--color-neutral-700)" }}>
        OWNER
      </span>
      <Link href="/" className="btn btn-secondary">
        Back to site
      </Link>
    </div>
  );
}
