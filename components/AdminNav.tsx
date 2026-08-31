"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
 * Ported from the `.anav` block in Prototype with Admin.dc.html (lines
 * 84-95), with one deliberate change: the export made admin a separate
 * shell that replaced the site nav, so it needed a "Back to site"
 * button. Here admin is a section of the site — the reader nav renders
 * above this bar on every /admin page — so that button is gone and this
 * is purely the section nav.
 *
 * Non-admins are redirected away from /admin/* in middleware.ts, so
 * this bar only ever renders for an admin.
 */

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/users", label: "All users" },
  { href: "/admin/catalogue", label: "Catalogue" },
  { href: "/admin/safeguarding", label: "Safeguarding" },
  { href: "/admin/trash", label: "Trash" },
  { href: "/admin/requests", label: "Requests" },
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
    </div>
  );
}
