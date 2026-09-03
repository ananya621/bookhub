import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/*
 * Ported from the `isRequests` block in Prototype with Admin.dc.html
 * (lines 1270-1289), now a server component reading the reader's real
 * requests instead of lib/mock.ts's `requests` fixture — that fixture
 * was showing the same 3 hardcoded example requests to every reader,
 * regardless of what they'd actually asked for, same bug class as the
 * reviews/reading-status/lists/survey fixes elsewhere this session.
 *
 * book_request_voters is the join table: a reader "asked for" a book
 * by having a row there, and book_requests carries the actual
 * title/author/status/decline_reason — same join /profile already
 * uses for its own request count.
 */

function statusMeta(status: string) {
  switch (status) {
    case "approved":
      return {
        label: "Approved",
        chip: { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" },
        note: "IT IS IN THE CATALOGUE NOW — SEARCH FOR IT",
      };
    case "declined":
      return {
        label: "Declined",
        chip: { background: "#C41031", color: "#EFECE3", borderColor: "#14110f" },
        note: "WHY:",
      };
    default:
      return {
        label: "Pending",
        chip: {
          background: "transparent",
          color: "var(--color-text)",
          borderColor: "var(--color-text)",
        },
        note: "WE LOOK AT THESE BY HAND — USUALLY WITHIN A FEW DAYS",
      };
  }
}

export default async function RequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/start");

  const supabase = await createClient();
  const { data: voterRows } = await supabase
    .from("book_request_voters")
    .select("created_at, book_requests(id, title, author, status, decline_reason)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const requests = (voterRows ?? [])
    .map((v) => v.book_requests as unknown as
      | { id: string; title: string; author: string; status: string; decline_reason: string | null }
      | null)
    .filter((r): r is { id: string; title: string; author: string; status: string; decline_reason: string | null } => r !== null);

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px 60px" }}>
        <h1 style={{ fontSize: 36, margin: "0 0 6px" }}>Books you&apos;ve asked for</h1>
        <p style={{ fontSize: 14, marginBottom: 26 }}>
          Anything missing from the catalogue that you&apos;ve told us about, and where it got to.
        </p>
        {requests.length === 0 ? (
          <div style={{ border: "1px dashed var(--color-divider)", padding: 30, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>
              You haven&apos;t asked for anything yet
            </div>
            <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 0" }}>
              Can&apos;t find a book in the catalogue? Ask for it.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {requests.map((r) => {
              const meta = statusMeta(r.status);
              return (
                <div key={r.id} className="card" style={{ gap: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div className="card-title">{r.title}</div>
                      <div className="card-meta">{r.author || "Author not given"}</div>
                    </div>
                    <span className="tag" style={meta.chip}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="mono" style={{ color: "var(--color-neutral-700)" }}>
                    {meta.note}
                  </div>
                  {r.decline_reason && <p style={{ fontSize: 13, margin: 0 }}>{r.decline_reason}</p>}
                </div>
              );
            })}
          </div>
        )}
        <Link href="/requests/new" className="btn btn-primary" style={{ marginTop: 22 }}>
          Ask for another book
        </Link>
      </div>
    </>
  );
}
