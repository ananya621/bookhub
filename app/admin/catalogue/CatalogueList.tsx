"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { addBookCover, removeBook, type ActionResult } from "@/app/actions/books";
import { MAX_COVER_BYTES, MAX_COVER_LABEL } from "@/lib/cover-limits";

export type CatalogueBook = {
  id: string;
  title: string;
  author: string;
  pages: number | null;
  coverUrl: string | null;
  genres: string[];
  readingLevel: string | null;
  source: string;
};

/*
 * The "In the catalogue" section of Prototype Admin.dc.html's isCatalogue
 * block — previously just a plain list with a count. Missing, and added
 * here: the filter box, the dashed .nocover indicator distinct from an
 * ordinary loading placeholder, and working "Add a cover" / "Remove"
 * per book. The dashboard's "No cover" tile links here specifically so
 * an admin can fix one — before this there was nowhere to actually do
 * that once you arrived.
 */
export default function CatalogueList({ books }: { books: CatalogueBook[] }) {
  const [filter, setFilter] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [removeState, removeAction] = useActionState<ActionResult, FormData>(removeBook, undefined);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    );
  }, [books, filter]);

  const removeError = (removeState && "error" in removeState && removeState.error) || null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>In the catalogue</h2>
        <span className="mono" style={{ color: "var(--color-neutral-700)", flex: 1 }}>
          {books.length} BOOKS · EVERYTHING A READER CAN SEARCH
        </span>
        <input
          className="input"
          style={{ width: 230 }}
          placeholder="Filter the catalogue"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {removeError && (
        <div className="mono" style={{ color: "var(--color-problem-text)", marginBottom: 10 }}>
          {removeError}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mono" style={{ color: "var(--color-neutral-700)", padding: "20px 0" }}>
          NOTHING MATCHES THAT FILTER.
        </div>
      ) : (
        <div style={{ borderTop: "3px solid var(--color-text)" }}>
          {filtered.map((b) => (
            <CatalogueRow
              key={b.id}
              book={b}
              removing={removingId === b.id}
              onStartRemove={() => setRemovingId(b.id)}
              onCancelRemove={() => setRemovingId(null)}
              removeAction={removeAction}
            />
          ))}
        </div>
      )}
    </>
  );
}

function CatalogueRow({
  book: b,
  removing,
  onStartRemove,
  onCancelRemove,
  removeAction,
}: {
  book: CatalogueBook;
  removing: boolean;
  onStartRemove: () => void;
  onCancelRemove: () => void;
  removeAction: (formData: FormData) => void;
}) {
  const [coverState, coverAction] = useActionState<ActionResult, FormData>(addBookCover, undefined);
  const fileInput = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [tooBig, setTooBig] = useState<string | null>(null);
  const noCover = !b.coverUrl;

  const coverError = coverState && "error" in coverState && coverState.error;

  return (
    <div className="qrow" style={{ alignItems: "center" }}>
      {noCover ? (
        <div className="nocover" style={{ width: 42, height: 62, flex: "none" }}>
          <span className="mono" style={{ color: "var(--color-neutral-700)" }}>
            !
          </span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={b.coverUrl!}
          alt=""
          width={42}
          style={{ height: 62, objectFit: "cover", flex: "none", border: "3px solid var(--color-text)" }}
        />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17 }}>{b.title}</div>
        <div className="mono" style={{ color: "var(--color-neutral-700)", margin: "3px 0 6px" }}>
          {(b.author || "unknown author").toUpperCase()}
          {b.pages ? ` · ${b.pages} PAGES` : ""}
          {b.readingLevel ? ` · ${b.readingLevel.toUpperCase()}` : ""}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {b.genres.map((g) => (
            <span key={g} className="tag tag-neutral">
              {g}
            </span>
          ))}
          <span className="tag tag-outline">{b.source === "manual" ? "Typed in" : "From search"}</span>
        </div>
        {(coverError || tooBig) && (
          <div className="mono" style={{ color: "var(--color-problem-text)", marginTop: 6 }}>
            {coverError || tooBig}
          </div>
        )}
      </div>
      {noCover && (
        <form ref={formRef} action={coverAction}>
          <input type="hidden" name="bookId" value={b.id} />
          <input
            ref={fileInput}
            type="file"
            name="coverFile"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              // Checked before submitting, not after. Next rejects an
              // over-sized body before the action runs, so posting it
              // anyway would return a bare 413 the admin sees as an
              // unexplained failure. The action keeps its own check —
              // this one is for the person, not for safety.
              const file = e.target.files?.[0];
              if (file && file.size > MAX_COVER_BYTES) {
                setTooBig(
                  `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB — ${MAX_COVER_LABEL} is the most we can take.`
                );
                e.target.value = "";
                return;
              }
              setTooBig(null);
              formRef.current?.requestSubmit();
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: "none" }}
            onClick={() => fileInput.current?.click()}
          >
            Add a cover
          </button>
        </form>
      )}
      {removing ? (
        <form action={removeAction} style={{ display: "flex", gap: 6, flex: "none" }}>
          <input type="hidden" name="bookId" value={b.id} />
          <button type="submit" className="btn btn-danger">
            Confirm
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancelRemove}>
            Cancel
          </button>
        </form>
      ) : (
        <button className="btn btn-secondary" style={{ flex: "none" }} onClick={onStartRemove}>
          Remove
        </button>
      )}
    </div>
  );
}
