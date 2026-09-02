import Nav from "@/components/Nav";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/server";
import RequestQueue, { type QueueRow } from "./RequestQueue";

/*
 * Ported from the `isAdminRequests` block in Prototype with Admin.dc.html
 * (lines 558-605), now reading real requests.
 *
 * A server component so the queue is rendered from the database rather
 * than fetched in the browser. The row actions live in RequestQueue,
 * which is a client component.
 *
 * The counted "N people asked" is the whole reason book_request_voters
 * exists: two people wanting the same book join one request instead of
 * filling the queue with duplicates, and how many asked is the most
 * useful thing an admin can know when deciding what to add next.
 */
export default async function AdminRequestsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("book_requests")
    .select(
      "id, title, author, pages, summary, cover_url, note, status, decline_reason, created_at, book_request_voters(user_id)"
    )
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  const rows: QueueRow[] = (data ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    author: (r.author as string) ?? "",
    pages: r.pages as number | null,
    summary: r.summary as string | null,
    coverUrl: r.cover_url as string | null,
    note: r.note as string | null,
    status: r.status as QueueRow["status"],
    declineReason: r.decline_reason as string | null,
    askedBy: Array.isArray(r.book_request_voters) ? r.book_request_voters.length : 0,
  }));

  return (
    <>
      <Nav />
      <AdminNav />
      <div className="wrap">
        <h1 style={{ fontSize: 36, margin: "0 0 6px" }}>Book requests</h1>
        <p style={{ fontSize: 14, marginBottom: 20 }}>
          Books readers have asked for. “Find &amp; import” takes you to the
          catalogue with the title already searched — the request closes once
          the book actually lands, not before.
        </p>
        <RequestQueue rows={rows} />
      </div>
    </>
  );
}
