import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/server";
import ImportBook from "./ImportBook";
import CatalogueList, { type CatalogueBook } from "./CatalogueList";

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
    .select("id, title, author, pages, summary, cover_url, genres, reading_level, is_series, source, created_at")
    .order("created_at", { ascending: false });

  const books: CatalogueBook[] = (data ?? []).map((b) => ({
    id: b.id as string,
    title: b.title as string,
    author: (b.author as string) ?? "",
    pages: b.pages as number | null,
    summary: b.summary as string | null,
    coverUrl: b.cover_url as string | null,
    genres: (b.genres as string[]) ?? [],
    readingLevel: b.reading_level as string | null,
    isSeries: Boolean(b.is_series),
    source: b.source as string,
  }));

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
      <AdminNav />
      <div className="wrap">
        <h1 style={{ fontSize: 38, margin: "0 0 6px" }}>Catalogue</h1>
        <p style={{ fontSize: 14, marginBottom: 20 }}>
          Every book readers can find. Nothing appears here on its own — each
          one was approved from a request, or added here by hand.
        </p>

        <ImportBook initialQuery={initialQuery} requestContext={requestContext} />

        <CatalogueList books={books} />
      </div>
    </>
  );
}
