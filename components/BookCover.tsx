/*
 * The full-width 2/3 cover used by every book *card* — Home, Recs and a
 * shared list. Three copies of this had drifted into three files, which
 * is why "make every cover fill its box" had to be made in several
 * places at once rather than one.
 *
 * Row thumbnails (the small fixed-size covers in list rows and admin
 * queues) are deliberately NOT here: they vary in size, element and
 * flex handling per screen, and folding them together would mean
 * changing markup rather than sharing it.
 *
 * A missing cover is a labelled placeholder, never a broken image —
 * `cover_url` is null until an admin adds one.
 */
export default function BookCover({ src }: { src: string | null | undefined }) {
  if (!src) {
    return (
      <div className="cover" style={{ aspectRatio: "2/3" }}>
        <span className="mono">COVER</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      style={{ aspectRatio: "2/3", objectFit: "cover", width: "100%", border: "3px solid var(--color-text)" }}
    />
  );
}
