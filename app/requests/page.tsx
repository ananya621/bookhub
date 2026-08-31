import Link from "next/link";
import Nav from "@/components/Nav";
import { requests } from "@/lib/mock";

/*
 * Ported from the `isRequests` block in Prototype with Admin.dc.html
 * (lines 1270-1289). The export derives each row's tag colour, label
 * and status note from `r.status` in its `myRequests` computed
 * property (lines 2126-2139 of the same file) — `lib/mock.ts` only
 * stores the raw `status`/`reason`, so `statusMeta` below reproduces
 * that derivation verbatim, keyed by status instead of the shared
 * component's inline object literal.
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

export default function RequestsPage() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 24px 60px" }}>
        <h1 style={{ fontSize: 36, margin: "0 0 6px" }}>Books you&apos;ve asked for</h1>
        <p style={{ fontSize: 14, marginBottom: 26 }}>
          Anything missing from the catalogue that you&apos;ve told us about, and where it got to.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {requests.map((r) => {
            const meta = statusMeta(r.status);
            return (
              <div key={r.title} className="card" style={{ gap: 8 }}>
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
                {r.reason && <p style={{ fontSize: 13, margin: 0 }}>{r.reason}</p>}
              </div>
            );
          })}
        </div>
        <Link href="/requests/new" className="btn btn-primary" style={{ marginTop: 22 }}>
          Ask for another book
        </Link>
      </div>
    </>
  );
}
