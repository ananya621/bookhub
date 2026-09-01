import Nav from "@/components/Nav";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/server";
import AddBook from "./AddBook";

/*
 * Ported from the `isAdminCatalogue` block in Prototype with Admin.dc.html
 * (lines 274-423), now reading the real catalogue.
 *
 * A server component: the list comes from the database, and the
 * add-a-book form is a client component beside it.
 *
 * The export's import flow searched a fake API and mapped its subject
 * words onto genres. The real thing splits in two: readers ask through
 * /requests/new and an admin approves in the request queue, or an admin
 * adds one straight from here. Both paths still make a person choose
 * the genres and the reading level, which is where someone decides who
 * a book is for.
 */
export default async function AdminCataloguePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("books")
    .select("id, title, author, pages, cover_url, genres, reading_level, source, created_at")
    .order("created_at", { ascending: false });

  const books = data ?? [];

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

        <AddBook />

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
