"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
 * Ported from the `.anav` block in Prototype with Admin.dc.html (lines
 * 84-95). Same shape as Nav.tsx but for the admin shell: no theme
 * toggle and no avatar there, and "Back to site" is a plain link to /
 * rather than the export's admin.exit state change.
 *
 * There is no auth yet, so this renders for anyone who visits /admin —
 * gating it on User.isAdmin comes with auth.
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
