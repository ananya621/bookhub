import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import RecsList from "./RecsList";
import type { CatalogueBook } from "@/lib/catalogue";
import type { Survey } from "@/lib/mock";

/*
 * Ported from the `isRecs` block in Prototype with Admin.dc.html
 * (lines 859-886), now reading the real catalogue — same fix as
 * /search already had and /home just got: this used to always fall
 * back to lib/mock.ts's fixture books, so it kept showing "recommended"
 * books that don't exist in the real (and currently empty) catalogue,
 * with a "matched on: your survey answers" label that didn't
 * correspond to anything real either.
 *
 * The survey is real now too, fetched here instead of RecsList reading
 * useSessionData().survey (the dev-persona fixture) — same fix just
 * applied to /home, and for the same reason: a real signed-in reader's
 * recommendations were being scored against the fixture's fake
 * answers, not their own.
 */
export default async function RecsPage() {
  const supabase = await createClient();

  const [{ data }, { data: surveyRow }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, author, pages, cover_url, genres, reading_level")
      .order("created_at", { ascending: false }),
    supabase.from("surveys").select("genres, reading_level, preferred_length").maybeSingle(),
  ]);

  const books: CatalogueBook[] = (data ?? []).map((b) => ({
    id: b.id as string,
    title: b.title as string,
    author: (b.author as string) ?? "",
    pages: b.pages as number | null,
    coverUrl: b.cover_url as string | null,
    genres: (b.genres as string[]) ?? [],
    readingLevel: (b.reading_level as string) ?? "",
  }));

  const survey: Survey | null = surveyRow
    ? {
        genres: surveyRow.genres as string[],
        level: surveyRow.reading_level as string,
        length: surveyRow.preferred_length as string,
      }
    : null;

  return (
    <>
      <Nav />
      <div className="wrap">
        <RecsList books={books} survey={survey} />
      </div>
    </>
  );
}
