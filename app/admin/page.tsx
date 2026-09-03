import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/server";

/*
 * Rebuilt against the current admin prototype (Prototype Admin.dc.html,
 * lines 47-111), which changed substantially from what this page had:
 * a 4th dashboard card ("No cover"), a catalogue-count banner with an
 * "Add a book" button, and a different stats table + note. This page
 * hadn't been touched since the older prototype, so it had drifted —
 * see the "Ban my own account" button that used to be here, which the
 * current design doesn't have at all (it was a scoped-out prototype-only
 * stand-in per the original comment, not a real feature to begin with).
 * The "every queue is empty" celebration banner and the
 * users/catalogue/ban button row below the tiles are both gone too —
 * neither exists in the current design.
 *
 * Reviews, Accounts and Safeguarding now read real reports (see
 * app/admin/reviews, app/admin/safeguarding and app/actions/reports.ts
 * for the table). The "Accounts" tile counts reported readers only —
 * there's no persistent "refused name" flag anywhere in the database
 * (check_display_name only ever runs once, at signup, to block a bad
 * name before an account is even created; it doesn't leave a record
 * behind to retroactively count), so that half of the original mock
 * count is dropped rather than faked. Requests, catalogue size and
 * missing-cover count are real too, using the same tables
 * /admin/requests and /admin/catalogue already read from.
 *
 * The "last seven days" table stays static numbers, matching the
 * prototype's own literal values — there's no import/search history
 * being recorded yet to compute them for real.
 */
export default async function AdminHomePage() {
  const supabase = await createClient();

  const [
    { count: pendingRequests },
    { count: catalogueCount },
    { count: missingCovers },
    { count: safeguardingCount },
    { data: reportedReviewRows },
    { data: reportedUserRows },
  ] = await Promise.all([
    supabase.from("book_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase.from("books").select("*", { count: "exact", head: true }).is("cover_url", null),
    supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("type", "safety_concern")
      .eq("status", "open"),
    supabase
      .from("reports")
      .select("target_id")
      .eq("target_type", "review")
      .neq("type", "safety_concern")
      .eq("status", "open"),
    supabase
      .from("reports")
      .select("target_id")
      .eq("target_type", "user")
      .neq("type", "safety_concern")
      .eq("status", "open"),
  ]);

  const pendingReviews = new Set((reportedReviewRows ?? []).map((r) => r.target_id as string)).size;
  const pendingAccounts = new Set((reportedUserRows ?? []).map((r) => r.target_id as string)).size;

  return (
    <>
      <AdminNav />
      <div className="wrap">
        <h1 style={{ fontSize: 42, margin: "0 0 18px" }}>What needs you</h1>

        <Link
          href="/admin/safeguarding"
          className="rowlink"
          style={{
            border: "3px solid var(--color-text)",
            background: "#C41031",
            color: "#EFECE3",
            boxShadow: "5px 5px 0 var(--color-text)",
            padding: 16,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontSize: 44, lineHeight: 1 }}>
            {safeguardingCount ?? 0}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 19 }}>
              Safeguarding reports
            </div>
            <div className="mono" style={{ fontWeight: 700, marginTop: 3 }}>
              READERS WORRIED ABOUT SOMEONE&apos;S SAFETY — READ THESE FIRST
            </div>
          </div>
          <span className="tag" style={{ background: "#EFECE3", color: "#14110f", flex: "none" }}>
            Open queue
          </span>
        </Link>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
          <Link
            href="/admin/requests"
            className="rowlink"
            style={{ border: "3px solid var(--color-text)", background: "#ff3d9a", color: "#14110f", boxShadow: "5px 5px 0 var(--color-text)", padding: 14 }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 40, lineHeight: 1 }}>
              {pendingRequests ?? 0}
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16 }}>Book requests</div>
            <div className="mono" style={{ fontWeight: 700, marginTop: 3 }}>WAITING ON YOU</div>
          </Link>
          <Link
            href="/admin/reviews"
            className="rowlink"
            style={{ border: "3px solid var(--color-text)", background: "#ff3d9a", color: "#14110f", boxShadow: "5px 5px 0 var(--color-text)", padding: 14 }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 40, lineHeight: 1 }}>
              {pendingReviews}
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16 }}>Reviews</div>
            <div className="mono" style={{ fontWeight: 700, marginTop: 3 }}>REPORTED</div>
          </Link>
          <Link
            href="/admin/users"
            className="rowlink"
            style={{ border: "3px solid var(--color-text)", background: "#ff3d9a", color: "#14110f", boxShadow: "5px 5px 0 var(--color-text)", padding: 14 }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 40, lineHeight: 1 }}>
              {pendingAccounts}
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16 }}>Accounts</div>
            <div className="mono" style={{ fontWeight: 700, marginTop: 3 }}>REPORTED READERS</div>
          </Link>
          <Link
            href="/admin/catalogue"
            className="rowlink"
            style={{ border: "3px solid var(--color-text)", background: "#FFD400", color: "#14110f", boxShadow: "5px 5px 0 var(--color-text)", padding: 14 }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 40, lineHeight: 1 }}>
              {missingCovers ?? 0}
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16 }}>No cover</div>
            <div className="mono" style={{ fontWeight: 700, marginTop: 3 }}>A SHELF OF GREY BOXES SELLS NOTHING</div>
          </Link>
        </div>

        <Link
          href="/admin/catalogue"
          className="rowlink"
          style={{
            border: "3px solid var(--color-text)",
            boxShadow: "5px 5px 0 var(--color-text)",
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 26,
          }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontSize: 44, lineHeight: 1, color: "var(--color-accent)" }}>
            {catalogueCount ?? 0}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20 }}>
              Books in the catalogue
            </div>
            <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 3 }}>
              READERS ONLY EVER SEE THESE — NOTHING COMES STRAIGHT FROM THE API
            </div>
          </div>
          <span className="btn btn-primary">Add a book</span>
        </Link>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 }}>
          <div>
            <h4 style={{ margin: "0 0 10px" }}>Last seven days</h4>
            <table className="table">
              <tbody>
                <tr>
                  <td>Books imported</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>12</td>
                </tr>
                <tr>
                  <td>Requests closed by an import</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>5</td>
                </tr>
                <tr>
                  <td>Reviews auto-blocked by the filter</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>9</td>
                </tr>
                <tr>
                  <td>Searches with no results</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>41</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4 style={{ margin: "0 0 10px" }}>The number that matters</h4>
            <p style={{ fontSize: 14 }}>
              &ldquo;Searches with no results&rdquo; tells you what to import next, and it beats the
              request queue as a signal — most readers search, find nothing, and never bother asking.
            </p>
            <p style={{ fontSize: 14, margin: 0 }}>
              If refusals by the word filter spike, the list is too aggressive. If reports spike, it
              is too loose.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
