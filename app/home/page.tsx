"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { useCurrentUser, useSessionData } from "@/components/AuthProvider";
import Nav from "@/components/Nav";
import { books, avg, starStr, lengthLabel, steps, type Book } from "@/lib/mock";

/*
 * Ported from the `isHome` block in Prototype with Admin.dc.html
 * (lines 787-858).
 *
 * The export drives "picked for you", shelf badges and "currently
 * reading" progress off one big shared state object (`statuses`,
 * `progress`, `survey`). There's no account/backend yet, so this page
 * seeds its own local copies of that shape — a few books already on
 * shelves, a finished book, and a completed survey — just so the
 * screen has something to show. Moving a book to "Read" here only
 * updates this page's local state; it isn't shared with the Tracker
 * screen, which seeds its own independent copy of the same shape,
 * until there's a real account to hang this off.
 *
 * "MY LISTS" mirrors the count of the two lists seeded in /lists
 * rather than importing that page's data, to keep the pages
 * independent until lists live behind an API.
 *
 * Book cover art isn't in the export (it comes later from the Google
 * Books API), so covers stay the "COVER" placeholder box, same as the
 * landing page hero.
 */

type Status = "read" | "reading" | "want" | "none";
type StepKey = (typeof steps)[number]["key"];
const badgeStyles: Record<Exclude<Status, "none">, CSSProperties> = {
  read: { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" },
  reading: { background: "#ff3d9a", color: "#14110f", borderColor: "#14110f" },
  want: { background: "#1B3BFF", color: "#EFECE3", borderColor: "#14110f" },
};

const badgeLabels: Record<Exclude<Status, "none">, string> = {
  read: "Read",
  reading: "Reading",
  want: "Want to read",
};

// Same scoring the export uses: genre overlap + level match + length
// match, falling back to highest-rated first if nothing scores. Takes
// the survey as an argument because it belongs to the signed-in reader
// now — an account that skipped the survey scores nothing and gets the
// highest-rated fallback, which is what the export does too.
type Survey = { genres: string[]; level: string; length: string };

function recommend(survey: Survey | null): Book[] {
  if (!survey) return books.slice().sort((a, c) => avg(c) - avg(a)).slice(0, 5);
  const scored = books
    .map((b) => ({
      book: b,
      hits:
        b.genres.filter((g) => survey.genres.includes(g)).length +
        (b.level === survey.level ? 1 : 0) +
        (lengthLabel(b.pages) === survey.length ? 1 : 0),
    }))
    .filter((o) => o.hits > 0)
    .sort((a, c) => c.hits - a.hits || avg(c.book) - avg(a.book));
  const ranked = scored.length
    ? scored.map((o) => o.book)
    : books.slice().sort((a, c) => avg(c) - avg(a));
  return ranked.slice(0, 5);
}

export default function HomePage() {
  const router = useRouter();
  const user = useCurrentUser();
  const sessionData = useSessionData();
  const [statuses, setStatuses] = useState<Record<string, Status>>(sessionData.statuses);
  const [progress] = useState<Record<string, StepKey>>(sessionData.progress);
  const survey = sessionData.survey;
  const homeRecs = recommend(survey);

  const statusOf = (id: string): Status => statuses[id] ?? "none";
  const markRead = (id: string) => setStatuses((s) => ({ ...s, [id]: "read" }));

  const reading = books.filter((b) => statusOf(b.id) === "reading");
  const readCount = books.filter((b) => statusOf(b.id) === "read").length;
  const wantCount = books.filter((b) => statusOf(b.id) === "want").length;

  const basedOn = survey
    ? (survey.genres.length ? survey.genres.join(" · ") + " · " : "") +
      survey.level +
      " · " +
      survey.length
    : "YOUR SURVEY ANSWERS";

  return (
    <>
      <Nav />
      <div className="wrap">
        <h1 style={{ fontSize: 36, margin: "0 0 4px" }}>Welcome back, {user?.displayName || "Reader"}</h1>
        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 8 }}>
          BASED ON: {basedOn} · <Link href="/survey" style={{ cursor: "pointer" }}>EDIT</Link>
        </div>
        {readCount > 0 && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              background: "#c6f24e",
              color: "#14110f",
              border: "3px solid var(--color-text)",
              padding: "6px 14px",
              marginBottom: 26,
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1 }}>✓</span>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15 }}>
              {readCount} {readCount === 1 ? "book finished" : "books finished"}
            </span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <h4 style={{ margin: 0 }}>Picked for you</h4>
          <Link href="/recs" className="btn btn-ghost">See all recommendations</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 36 }}>
          {homeRecs.map((b) => {
            const status = statusOf(b.id);
            return (
              <div
                key={b.id}
                className="rowlink"
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
                onClick={() => router.push(`/book/${b.id}`)}
              >
                <div className="cover" style={{ aspectRatio: "2/3" }}>
                  <span className="mono">COVER</span>
                </div>
                {status !== "none" && (
                  <div style={{ display: "flex" }}>
                    <span className="tag" style={badgeStyles[status]}>{badgeLabels[status]}</span>
                  </div>
                )}
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{b.title}</div>
                <span className="stars" style={{ fontSize: 13 }}>{starStr(avg(b))}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 28 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <h4 style={{ margin: 0 }}>Currently reading</h4>
              <Link href="/tracker" className="btn btn-ghost">Open tracker</Link>
            </div>
            {reading.length > 0 ? (
              <div style={{ border: "1px solid var(--color-divider)" }}>
                {reading.map((b) => {
                  const step = steps.find((s) => s.key === progress[b.id]) ?? steps[0];
                  return (
                    <div
                      key={b.id}
                      style={{ display: "flex", gap: 12, padding: 12, alignItems: "center", borderBottom: "3px solid var(--color-divider)" }}
                    >
                      <div className="cover" style={{ width: 36, height: 52, flex: "none" }} />
                      <div
                        className="rowlink"
                        style={{ flex: 1 }}
                        onClick={() => router.push(`/book/${b.id}`)}
                      >
                        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17 }}>{b.title}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                          <div style={{ flex: 1, maxWidth: 150, height: 10, border: "2px solid var(--color-text)" }}>
                            <div style={{ width: `${step.pct}%`, background: "#ff3d9a", height: "100%" }} />
                          </div>
                          <span className="mono" style={{ color: "var(--color-neutral-700)" }}>{step.caption}</span>
                        </div>
                      </div>
                      <button className="btn btn-secondary" onClick={() => markRead(b.id)}>Mark as read</button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ border: "1px dashed var(--color-divider)", padding: 26, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>Nothing on the go</div>
                <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 14px" }}>
                  Open a book and mark it as Currently Reading.
                </p>
                <Link href="/search" className="btn btn-secondary">Browse books</Link>
              </div>
            )}
          </div>
          <div>
            <h4 style={{ margin: "0 0 10px" }}>Your shelves</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div
                className="card rowlink"
                style={{ gap: 2, background: "#c6f24e", color: "#14110f", boxShadow: "4px 4px 0 var(--color-text)" }}
                onClick={() => router.push("/tracker")}
              >
                <div style={{ fontFamily: "var(--font-display)", fontSize: 32, lineHeight: 1 }}>{readCount}</div>
                <div className="mono" style={{ fontWeight: 700 }}>READ</div>
              </div>
              <div
                className="card rowlink"
                style={{ gap: 2, background: "#ff3d9a", color: "#14110f", boxShadow: "4px 4px 0 var(--color-text)" }}
                onClick={() => router.push("/tracker")}
              >
                <div style={{ fontFamily: "var(--font-display)", fontSize: 32, lineHeight: 1 }}>{reading.length}</div>
                <div className="mono" style={{ fontWeight: 700 }}>CURRENTLY READING</div>
              </div>
              <div
                className="card rowlink"
                style={{ gap: 2, background: "#1B3BFF", color: "#EFECE3", boxShadow: "4px 4px 0 var(--color-text)" }}
                onClick={() => router.push("/tracker")}
              >
                <div style={{ fontFamily: "var(--font-display)", fontSize: 32, lineHeight: 1 }}>{wantCount}</div>
                <div className="mono" style={{ fontWeight: 700 }}>WANT TO READ</div>
              </div>
              <div className="card rowlink" style={{ gap: 2 }} onClick={() => router.push("/lists")}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 32, lineHeight: 1 }}>{sessionData.lists.length}</div>
                <div className="mono" style={{ fontWeight: 700, color: "var(--color-neutral-700)" }}>MY LISTS</div>
              </div>
            </div>
            <Link href="/requests/new" className="btn btn-secondary btn-block" style={{ minHeight: 42 }}>
              Request a missing book
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
