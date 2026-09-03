import Nav from "@/components/Nav";

/*
 * Ported from the `isLanding` block in Prototype with Admin.dc.html
 * (lines 606-632). Structure and classes are taken directly from there.
 * The "Why this exists" copy is the site owner's own words, not the
 * source's placeholder text. The hero is a placeholder box in the
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
            borderTop: "1px solid var(--color-divider)",
            paddingTop: 28,
          }}
        >
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ margin: "0 0 8px" }}>Why this exists</h3>
            <p style={{ fontSize: 14 }}>
              If someone says they don&apos;t like reading, I think it&apos;s
              often just that they haven&apos;t found the right book yet. I
              got frustrated having to travel to my nearest bookshop just to
              browse and find something I might enjoy — and sites like
              Goodreads never quite worked for me either, since I&apos;d have
              to search for books I&apos;d already read and liked before it
              could suggest anything similar.
            </p>
            <p style={{ fontSize: 14 }}>
              So I built this instead: somewhere you can discover books based
              on your own interests, favourite genres, tropes and
              preferences — without needing to already know what you&apos;re
              looking for.
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
                  Reading regularly exposes you to words in meaningful
                  contexts, helping new vocabulary stick naturally. Research
                  by Cunningham &amp; Stanovich (1998) found that reading
                  experience is strongly linked to vocabulary growth and
                  knowledge development. The more you read, the more words
                  you encounter — and the more confidently you can use them.
                </p>
              </div>
              <div className="card">
                <div className="card-title">Knowledge</div>
                <p className="card-body">
                  Books can take you beyond your everyday experiences,
                  introducing you to history, science, cultures and places
                  you may never encounter personally. Stanovich &amp;
                  Cunningham (1993) found that reading contributes
                  significantly to general knowledge, even beyond what is
                  learned through formal education. Every book can therefore
                  become a small window into a much bigger world.
                </p>
              </div>
              <div className="card">
                <div className="card-title">Imagination</div>
                <p className="card-body">
                  Reading requires you to create the characters, settings
                  and scenes in your own mind. Research by Mar &amp; Oatley
                  (2008) suggests that reading fiction can engage mental
                  processes involved in imagining other people, situations
                  and experiences. Unlike a screen, a book gives your brain
                  the freedom to build the picture itself.
                </p>
              </div>
              <div className="card">
                <div className="card-title">Relaxation</div>
                <p className="card-body">
                  Reading provides a simple way to slow down and step away
                  from everyday demands. A study by Lewis (2009), reported
                  by the University of Sussex, found that just six minutes
                  of reading was associated with reduced stress levels and
                  a slower heart rate. Even a short reading session can
                  therefore create a valuable moment of calm.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
