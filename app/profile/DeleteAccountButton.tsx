"use client";

import { useRouter } from "next/navigation";

/*
 * Split out of page.tsx so the page itself can be a server component.
 *
 * Still local-only for the moment — real self-deletion needs Supabase's
 * admin API (the service-role key), which isn't wired up yet. See the
 * conversation this was flagged in: the button's own copy below
 * ("only the site owner can recover it, for 14 days") describes a
 * soft-delete/recoverable design, which is a different thing from what
 * a real implementation of this button would do.
 */
export default function DeleteAccountButton() {
  const router = useRouter();

  function deleteMyAccount() {
    if (
      window.confirm(
        "Delete your account? Everything goes, and only the site owner can recover it, for 14 days."
      )
    ) {
      router.push("/");
    }
  }

  return (
    <button className="btn" style={{ background: "#C41031", color: "#EFECE3" }} onClick={deleteMyAccount}>
      Delete my account
    </button>
  );
}
