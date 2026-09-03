"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useCurrentUser, useSessionData } from "@/components/AuthProvider";
import { matchedOnLabel, steps } from "@/lib/mock";
import { rankCatalogueBooks, type CatalogueBook } from "@/lib/catalogue";
import { setReadingStatus } from "@/app/actions/reading";
import type { ShelfBook } from "@/app/tracker/TrackerShelves";

/*
 * Ported from the `isHome` block in Prototype with Admin.dc.html
 * (lines 787-858). Split out of page.tsx (a server component now, see
 * there) so this can stay a client component for the interactive bits.
 *
 * "Picked for you" reads the real catalogue (catalogueBooks). "Currently
 * reading", the shelf counts (readCount/wantCount/reading) and "MY
 * LISTS" (listsCount) all read real tables now, fetched by page.tsx —
 * all were showing fixture data that didn't reflect what's actually
 * tracked, same bug class as the recommendations issue.
 */

export default function HomeContent({
  catalogueBooks,
  readCount,
  wantCount,
  reading,
  listsCount,
}: {
  catalogueBooks: CatalogueBook[];
  readCount: number;
  wantCount: number;
  reading: ShelfBook[];
  listsCount: number;
}) {
  const router = useRouter();
  const user = useCurrentUser();
  const sessionData = useSessionData();
  const [pending, startTransition] = useTransition();
  const survey = sessionData.survey;
  const homeRecs = rankCatalogueBooks(catalogueBooks, survey).slice(0, 5);

  function markRead(bookId: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("bookId", bookId);
      formData.set("status", "read");
      await setReadingStatus(undefined, formData);
      router.refresh();
    });
  }

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
          {homeRecs.map((b) => (
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
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{b.title}</div>
              <span className="mono text-muted" style={{ fontSize: 11 }}>NO REVIEWS YET</span>
            </div>
          ))}
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
                const step = steps.find((s) => s.key === b.progress) ?? steps[0];
                return (
                  <div
                    key={b.id}
                    style={{ display: "flex", gap: 12, padding: 12, alignItems: "center", borderBottom: "3px solid var(--color-divider)" }}
                  >
                    {b.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.coverUrl}
                        alt=""
                        style={{ width: 36, height: 52, flex: "none", objectFit: "cover", border: "3px solid var(--color-text)" }}
                      />
                    ) : (
                      <div className="cover" style={{ width: 36, height: 52, flex: "none" }} />
                    )}
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
                    <button className="btn btn-secondary" disabled={pending} onClick={() => markRead(b.id)}>
                      Mark as read
                    </button>
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
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, lineHeight: 1 }}>{listsCount}</div>
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
