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
      <Link href="/" className="btn btn-secondary">
        Back to site
      </Link>
    </div>
  );
}
