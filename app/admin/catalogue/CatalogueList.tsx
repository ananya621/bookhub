"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { allGenres, allLevels, lengthLabel } from "@/lib/mock";
import { addBookCover, removeBook, updateBook, type ActionResult } from "@/app/actions/books";

export type CatalogueBook = {
  id: string;
  title: string;
  author: string;
  pages: number | null;
  summary: string | null;
  coverUrl: string | null;
  genres: string[];
  readingLevel: string | null;
  isSeries: boolean;
  source: string;
};

/*
 * The "In the catalogue" section of Prototype Admin.dc.html's isCatalogue
 * block — previously just a plain list with a count. Missing, and added
 * here: the filter box, the dashed .nocover indicator distinct from an
 * ordinary loading placeholder, and working "Add a cover" / "Remove" /
 * "Edit" per book. The dashboard's "No cover" tile links here
 * specifically so an admin can fix one — before this there was nowhere
 * to actually do that once you arrived.
 *
 * "Edit" has no screen of its own in the design — nothing there covers
 * correcting a book after it's already live — so it reuses the same
 * field set and word-filter rule as Step 2 of import (see
 * updateBook()), in a dialog rather than a dedicated page, matching how
 * every other "edit this thing" admin action in this app already works
 * (Force rename, Ban account, the report dialog).
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
  const noCover = !b.coverUrl;
  const [editOpen, setEditOpen] = useState(false);

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
        {coverError && (
          <div className="mono" style={{ color: "var(--color-problem-text)", marginTop: 6 }}>
            {coverError}
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
            onChange={() => formRef.current?.requestSubmit()}
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
          <button type="submit" className="btn" style={{ background: "#C41031", color: "#EFECE3" }}>
            Confirm
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancelRemove}>
            Cancel
          </button>
        </form>
      ) : (
        <div style={{ display: "flex", gap: 6, flex: "none" }}>
          <button className="btn btn-secondary" onClick={() => setEditOpen(true)}>
            Edit
          </button>
          <button className="btn btn-secondary" onClick={onStartRemove}>
            Remove
          </button>
        </div>
      )}
      {editOpen && <EditBookDialog book={b} onClose={() => setEditOpen(false)} />}
    </div>
  );
}

function EditBookDialog({ book: b, onClose }: { book: CatalogueBook; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(updateBook, undefined);
  const [title, setTitle] = useState(b.title);
  const [author, setAuthor] = useState(b.author);
  const [pages, setPages] = useState(b.pages ? String(b.pages) : "");
  const [summary, setSummary] = useState(b.summary ?? "");
  const [genres, setGenres] = useState(new Set(b.genres));
  const [readingLevel, setReadingLevel] = useState(b.readingLevel ?? allLevels[0]);
  const [isSeries, setIsSeries] = useState(b.isSeries);
  const [removeCover, setRemoveCover] = useState(false);
  const [newCoverPreview, setNewCoverPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Closes on a successful save. Nothing needs to react to an error —
  // it's shown right here in the still-open dialog via `state`.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state && "ok" in state) onClose();
  }

  function toggleGenre(g: string) {
    setGenres((gs) => {
      const next = new Set(gs);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  function onFileChosen(file: File | undefined) {
    if (!file) return;
    setRemoveCover(false);
    setNewCoverPreview(URL.createObjectURL(file));
  }

  const error = state && "error" in state ? state.error : null;
  const coverPreview = newCoverPreview ?? (removeCover ? null : b.coverUrl);

  return (
    <div className="dialog-backdrop">
      <div className="dialog blueprint" style={{ width: "min(720px, 100%)" }}>
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <div className="card-kicker">Edit</div>
        <div className="dialog-title">{b.title}</div>
        <form action={formAction}>
          <input type="hidden" name="bookId" value={b.id} />
          <input type="hidden" name="isSeries" value={isSeries ? "on" : ""} />
          <input type="hidden" name="readingLevel" value={readingLevel} />
          <input type="hidden" name="removeCover" value={removeCover ? "on" : ""} />
          {[...genres].map((g) => (
            <input key={g} type="hidden" name="genres" value={g} />
          ))}

          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 18 }}>
            <div>
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverPreview}
                  alt=""
                  style={{ width: "100%", height: 210, objectFit: "cover", border: "3px solid var(--color-text)", marginBottom: 8 }}
                />
              ) : (
                <div className="cover" style={{ height: 210, marginBottom: 8 }}>
                  <span className="mono">NO COVER</span>
                </div>
              )}
              <input
                ref={fileInput}
                type="file"
                name="coverFile"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={(e) => onFileChosen(e.target.files?.[0])}
              />
              <button
                type="button"
                className="btn btn-secondary btn-block"
                style={{ minHeight: 40 }}
                onClick={() => fileInput.current?.click()}
              >
                Replace
              </button>
              {coverPreview && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ minHeight: 40 }}
                  onClick={() => {
                    setRemoveCover(true);
                    setNewCoverPreview(null);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                >
                  Remove cover
                </button>
              )}
            </div>

            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div className="field">
                  <label htmlFor="edit-title">Title</label>
                  <input
                    id="edit-title"
                    name="title"
                    className="input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit-author">Author</label>
                  <input
                    id="edit-author"
                    name="author"
                    className="input"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                  />
                </div>
              </div>

              <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 5 }}>
                GENRES
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {allGenres.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={genres.has(g) ? "tag tag-select" : "tag tag-outline"}
                    onClick={() => toggleGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 14 }}>
                <div>
                  <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 6 }}>
                    READING LEVEL
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {allLevels.map((l) => (
                      <button
                        key={l}
                        type="button"
                        className={readingLevel === l ? "tag tag-select" : "tag tag-outline"}
                        onClick={() => setReadingLevel(l)}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="field" style={{ marginBottom: 8 }}>
                    <label htmlFor="edit-pages">Pages</label>
                    <input
                      id="edit-pages"
                      name="pages"
                      type="number"
                      className="input"
                      value={pages}
                      onChange={(e) => setPages(e.target.value)}
                    />
                  </div>
                  <div className="mono" style={{ color: "var(--color-neutral-700)" }}>
                    {pages ? lengthLabel(Number(pages)).toUpperCase() : "—"}
                  </div>
                  <label
                    className="radio"
                    style={{ marginTop: 10, border: "3px solid var(--color-divider)", padding: "8px 12px", minHeight: 40 }}
                  >
                    <input type="checkbox" checked={isSeries} onChange={(e) => setIsSeries(e.target.checked)} />
                    <span className="dot" />
                    Part of a series
                  </label>
                </div>
              </div>

              <div className="field" style={{ marginBottom: 4 }}>
                <label htmlFor="edit-summary">Summary</label>
                <textarea
                  id="edit-summary"
                  name="summary"
                  className="input"
                  style={{ minHeight: 90 }}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mono" style={{ color: "var(--color-problem-text)", marginTop: 10 }}>
              {error}
            </div>
          )}

          <div className="dialog-actions" style={{ justifyContent: "flex-start" }}>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
