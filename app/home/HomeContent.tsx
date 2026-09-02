"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { useCurrentUser, useSessionData } from "@/components/AuthProvider";
import { books, matchedOnLabel, steps } from "@/lib/mock";
import { rankCatalogueBooks, type CatalogueBook } from "@/lib/catalogue";

/*
 * Ported from the `isHome` block in Prototype with Admin.dc.html
 * (lines 787-858). Split out of page.tsx (a server component now, see
 * there) so this can stay a client component for the interactive bits.
 *
 * "Picked for you" reads the real catalogue (catalogueBooks, fetched by
 * page.tsx) instead of lib/mock.ts's fixture books — it was showing
 * fixture "recommendations" that don't exist in the real catalogue even
 * once that catalogue was genuinely empty, while /search correctly said
 * so. Same fix as /recs.
 *
 * "Currently reading" and the shelf counts (Read/Reading/Want/Lists)
 * are a different feature — personal tracking state — and there's no
 * reading_status table yet at all, so they're unchanged: still the
 * fixture `books`/`statuses`/`progress` from useSessionData(), not the
 * real catalogue. A status badge on a real recommended book will never
 * show for the same reason (its id has no fixture status to match) —
 * correct given there's no real tracking yet, not a bug to chase.
 *
 * "MY LISTS" mirrors the count of the two lists seeded in /lists
 * rather than importing that page's data, to keep the pages
 * independent until lists live behind an API.
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

export default function HomeContent({ catalogueBooks }: { catalogueBooks: CatalogueBook[] }) {
  const router = useRouter();
  const user = useCurrentUser();
  const sessionData = useSessionData();
  const [statuses, setStatuses] = useState<Record<string, Status>>(sessionData.statuses);
  const [progress] = useState<Record<string, StepKey>>(sessionData.progress);
  const survey = sessionData.survey;
  const homeRecs = rankCatalogueBooks(catalogueBooks, survey).slice(0, 5);

  const statusOf = (id: string): Status => statuses[id] ?? "none";
  const markRead = (id: string) => setStatuses((s) => ({ ...s, [id]: "read" }));

  const reading = books.filter((b) => statusOf(b.id) === "reading");
  const readCount = books.filter((b) => statusOf(b.id) === "read").length;
  const wantCount = books.filter((b) => statusOf(b.id) === "want").length;

  const basedOn = matchedOnLabel(survey);

  return (
    <>
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
      {homeRecs.length > 0 ? (
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
                {b.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.coverUrl}
                    alt=""
                    style={{ aspectRatio: "2/3", objectFit: "cover", width: "100%", border: "3px solid var(--color-text)" }}
                  />
                ) : (
                  <div className="cover" style={{ aspectRatio: "2/3" }}>
                    <span className="mono">COVER</span>
                  </div>
                )}
                {status !== "none" && (
                  <div style={{ display: "flex" }}>
                    <span className="tag" style={badgeStyles[status]}>{badgeLabels[status]}</span>
                  </div>
                )}
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{b.title}</div>
                <span className="mono text-muted" style={{ fontSize: 11 }}>NO REVIEWS YET</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ border: "1px dashed var(--color-divider)", padding: 26, textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>There are no books here yet</div>
          <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 14px" }}>
            Every book is added by hand, so the shelf starts empty.
          </p>
          <Link href="/requests/new" className="btn btn-secondary">Suggest a book</Link>
        </div>
      )}

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
    </>
  );
}
