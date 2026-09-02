import Nav from "@/components/Nav";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/server";
import ImportBook from "./ImportBook";

/*
 * Ported from the `isAdminCatalogue` block in Prototype Admin.dc.html
 * (the STEP 1 / STEP 2 import flow), now reading the real catalogue.
 *
 * A server component: the list comes from the database, and the
 * import form is a client component beside it.
 *
 * Also the landing spot for "Find & import" from the requests queue
 * (?q=<title>&requestId=<id>&askedBy=<n>) — see the export's note on
 * that screen: "the request closes when the book lands, not before."
 * When requestId is present we look the request up (title + how many
 * people asked) so ImportBook can show the "N people asked for this"
 * banner without re-deriving it client-side.
 */
export default async function AdminCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; requestId?: string }>;
}) {
  const { q, requestId } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("books")
    .select("id, title, author, pages, cover_url, genres, reading_level, source, created_at")
    .order("created_at", { ascending: false });

  const books = data ?? [];

  let initialQuery = q ?? "";
  let requestContext: { requestId: string; askedBy: number } | null = null;

  if (requestId) {
    const { data: request } = await supabase
      .from("book_requests")
      .select("title, status")
      .eq("id", requestId)
      .single();

    if (request?.status === "pending") {
      const { count } = await supabase
        .from("book_request_voters")
        .select("*", { count: "exact", head: true })
        .eq("request_id", requestId);

      initialQuery = initialQuery || request.title;
      requestContext = { requestId, askedBy: count ?? 1 };
    }
    // A request that's already settled (or doesn't exist) is treated as
    // a plain search — no banner, nothing to fulfil.
  }

  return (
    <>
      <Nav />
      <AdminNav />
      <div className="wrap">
        <h1 style={{ fontSize: 36, margin: "0 0 6px" }}>Catalogue</h1>
        <p style={{ fontSize: 14, marginBottom: 20 }}>
          Every book readers can find. Nothing appears here on its own — each
          one was approved from a request, or added here by hand.
        </p>

        <ImportBook initialQuery={initialQuery} requestContext={requestContext} />

        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 10 }}>
          {books.length === 0
            ? "NOTHING IN THE CATALOGUE YET"
            : `${books.length} BOOK${books.length === 1 ? "" : "S"} IN THE CATALOGUE`}
        </div>

        <div style={{ borderTop: "3px solid var(--color-text)" }}>
          {books.map((b) => (
            <div key={b.id as string} className="qrow" style={{ alignItems: "center" }}>
              {b.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.cover_url as string}
                  alt=""
                  width={40}
                  style={{ flex: "none", border: "3px solid var(--color-text)" }}
                />
              ) : (
                <div className="cover" style={{ width: 40, height: 58, flex: "none" }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17 }}>
                  {b.title as string}
                </div>
                <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 3 }}>
                  {((b.author as string) || "unknown author").toUpperCase()}
                  {b.pages ? ` · ${b.pages} PAGES` : ""}
                  {b.reading_level ? ` · ${(b.reading_level as string).toUpperCase()}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: "none" }}>
                {((b.genres as string[]) ?? []).map((g) => (
                  <span key={g} className="tag tag-neutral">
                    {g}
                  </span>
                ))}
              </div>
              {/* Where it came from, so it is clear which books skipped the
                  request queue. */}
              <span className="tag tag-outline" style={{ flex: "none" }}>
                {b.source === "manual" ? "Typed in" : "From search"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
