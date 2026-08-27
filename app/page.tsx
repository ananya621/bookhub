import Nav from "@/components/Nav";

/*
 * Ported from the `isLanding` block in Prototype with Admin.dc.html
 * (lines 606-632). Copy, structure and classes are taken directly from
 * there — nothing rewritten. The hero is a placeholder box in the
 * source too ("HERO — COLLAGE OF WELL-KNOWN COVERS"); real book cover
 * images aren't in the export, they come later from the Google Books
 * API, so this stays a placeholder for now rather than inventing images.
 */
export default function Home() {
  return (
    <>
      <Nav />
      <div className="wrap">
        <div className="cover" style={{ height: 220, marginBottom: 28 }}>
          <span className="mono">HERO — COLLAGE OF WELL-KNOWN COVERS</span>
        </div>

        <h1 style={{ fontSize: 52, margin: "0 0 10px" }}>Find Your Next Book!</h1>
        <p style={{ fontSize: 16, maxWidth: 500 }}>
          Tell us what you like and we&apos;ll line up books you&apos;ll actually
          want to read. Free, no adverts, takes a minute.
        </p>

        <div style={{ display: "flex", gap: 12, margin: "22px 0 40px" }}>
          <a
            href="/start"
            className="btn btn-primary blueprint"
            style={{ padding: "12px 22px", fontSize: 16 }}
          >
            Get Started
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
          </a>
          <a
            href="/search"
            className="btn btn-secondary"
            style={{ padding: "12px 22px", fontSize: 16 }}
          >
            Browse books as a guest
          </a>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 36,
            borderTop: "1px solid var(--color-divider)",
            paddingTop: 28,
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 8px" }}>Why this exists</h3>
            <p style={{ fontSize: 14 }}>
              I got tired of walking into a bookshop and standing there for
              twenty minutes with no idea what to pick up next. So I built the
              thing I wanted: somewhere that asks what you like and then just
              tells you.
            </p>
            <p style={{ fontSize: 14 }}>
              No algorithms you can&apos;t see, no adverts, no cost. Just
              books, reviews from other readers, and a place to keep track of
              what you&apos;ve finished.
            </p>
          </div>
          <div>
            <h3 style={{ margin: "0 0 12px" }}>Why is reading important?</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div className="card">
                <div className="card-title">Vocabulary</div>
                <p className="card-body">
                  You pick up words without trying, and they stay.
                </p>
              </div>
              <div className="card">
                <div className="card-title">Knowledge</div>
                <p className="card-body">
                  Stories smuggle in history, science and places you&apos;ve
                  never been.
                </p>
              </div>
              <div className="card">
                <div className="card-title">Imagination</div>
                <p className="card-body">Nobody draws the pictures for you.</p>
              </div>
              <div className="card">
                <div className="card-title">Relaxation</div>
                <p className="card-body">
                  Twenty quiet minutes that aren&apos;t a screen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
