"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { setReadingStatus, clearReadingStatus } from "@/app/actions/reading";
import { useTheme } from "@/lib/useTheme";
import { starStr } from "@/lib/mock";

export type ShelfBook = {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  progress: string | null;
  // The reader's own rating for this book, if they've reviewed it —
  // only ever set for books on the Read shelf, since that's the only
  // place it's shown (board C1).
  myStars: number | null;
};

type ShelfKey = "reading" | "want" | "read";

type Shelf = {
  name: string;
  key: ShelfKey;
  emptyMsg: string;
  books: ShelfBook[];
};

/*
 * Board C1's colour rule for the three shelves — pink/blue/lime, straight
 * from the RULES plate (Currently Reading is "live", Want to Read is a
 * navigation choice, Read is "done"). The old version of this file had no
 * colour on the shelf headers at all, which is exactly the kind of drift
 * the accent system is meant to prevent.
 *
 * Text uses --color-ink-fixed/--color-cream-fixed, not --color-text/
 * --color-bg — this text sits ON a fixed accent colour, so it must not
 * flip with the theme the way --color-text does (see globals.css's own
 * note by the same pair on .tag-done/.tag-live).
 */
const SHELF_STYLE: Record<ShelfKey, { background: string; color: string }> = {
  reading: { background: "var(--color-accent-2)", color: "var(--color-ink-fixed)" },
  want: { background: "var(--color-link)", color: "var(--color-cream-fixed)" },
  read: { background: "var(--color-done)", color: "var(--color-ink-fixed)" },
};

/* Book cover thumbnail, clickable through to the book page. Kept at
   module scope (not defined inside TrackerShelves) so it isn't torn
   down and rebuilt as a new component type on every render — e.g.
   every tab switch on mobile — which would otherwise remount every
   cover image in the list for no reason. Same for the other small
   pieces below. */
function Cover({ book, w, h, onOpen }: { book: ShelfBook; w: number; h: number; onOpen: () => void }) {
  return book.coverUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={book.coverUrl}
      alt=""
      className="rowlink"
      style={{ width: w, height: h, flex: "none", objectFit: "cover", border: "3px solid var(--color-text)" }}
      onClick={onOpen}
    />
  ) : (
    <div className="cover rowlink" style={{ width: w, height: h, flex: "none" }} onClick={onOpen} />
  );
}

/* The per-book <select> that moves a book between shelves or removes
   it, wired to the real setReadingStatus/clearReadingStatus actions
   via the onMove callback. "MOVE ▾" is muted grey on light, but that
   grey nearly disappears on the ink ground, so F2 swaps it to lime
   (--color-done) — one of the few spots dark mode needs a real branch
   rather than a variable that already flips (see globals.css's
   dark-theme block for the ones that do). */
function MoveControl({
  book,
  shelfKey,
  size,
  isDark,
  pending,
  onMove,
}: {
  book: ShelfBook;
  shelfKey: ShelfKey;
  size: "sm" | "lg";
  isDark: boolean;
  pending: boolean;
  onMove: (bookId: string, value: string) => void;
}) {
  const moveColor = isDark ? "var(--color-done)" : "color-mix(in srgb, var(--color-text) 55%, transparent)";
  return (
    <select
      aria-label={`Move ${book.title}`}
      style={{
        background: "transparent",
        border: "none",
        color: moveColor,
        fontFamily: "var(--font-mono)",
        fontSize: size === "lg" ? 12 : 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
      value={shelfKey}
      disabled={pending}
      onChange={(e) => onMove(book.id, e.target.value)}
    >
      <option value="read">Read</option>
      <option value="reading">Reading</option>
      <option value="want">Want</option>
      <option value="none">Remove</option>
    </select>
  );
}

/* The Read column's review nudge (board C1, note 03: finishing a book
   is the moment to ask for a review) — shown alongside MoveControl,
   not instead of it. The wireframe's own Read card drops the move
   control entirely, but clearReadingStatus has no other way in from
   this app (the book page's own status picker only switches between
   read/reading/want, it never clears), so dropping it here would
   quietly remove the only "take this off Read" affordance in the
   whole site. Departing from the board on purpose — flagged to the
   design lead. */
function ReviewLine({ book }: { book: ShelfBook }) {
  return (
    <Link href={`/book/${book.id}/review`} className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700 }}>
      {book.myStars ? `${starStr(book.myStars)} REVIEWED` : "＋ WRITE A REVIEW"}
    </Link>
  );
}

function EmptyBox({ shelf }: { shelf: Shelf }) {
  return (
    <div style={{ border: "1px dashed var(--color-divider)", padding: "22px 14px", textAlign: "center" }}>
      <div className="mono text-muted">{shelf.emptyMsg}</div>
    </div>
  );
}

/*
 * Desktop is the fixed three-column board (C1); under 640px it becomes
 * the three-tab layout from E3/F2, with the "only a couple on the go"
 * nudge those boards add. Both trees are always in the DOM and swapped
 * with the site's usual .mobile-only/.desktop-only CSS toggle (see
 * globals.css) — the same approach BookDetail.tsx uses for its status
 * picker — so there's one source of state and no hydration mismatch.
 *
 * router.refresh() after a move re-runs the server component's query,
 * so a moved book actually leaves its old shelf and appears on the new
 * one instead of the page only updating once you next navigate here.
 */
export default function TrackerShelves({ shelves }: { shelves: Shelf[] }) {
  const router = useRouter();
  const { isDark } = useTheme();
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<ShelfKey>("reading");

  function move(bookId: string, value: string) {
    startTransition(async () => {
      if (value === "none") {
        const formData = new FormData();
        formData.set("bookId", bookId);
        await clearReadingStatus(undefined, formData);
      } else {
        const formData = new FormData();
        formData.set("bookId", bookId);
        formData.set("status", value);
        await setReadingStatus(undefined, formData);
      }
      router.refresh();
    });
  }

  return (
    <>
      {/* ---- Desktop: three fixed columns (board C1) ---- */}
      <div className="desktop-only" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        {shelves.map((shelf) => (
          <div key={shelf.key}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: SHELF_STYLE[shelf.key].background,
                color: SHELF_STYLE[shelf.key].color,
                border: "3px solid var(--color-text)",
                padding: "7px 12px",
                marginBottom: 12,
              }}
            >
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16 }}>{shelf.name}</div>
              <span className="mono" style={{ fontWeight: 700 }}>{shelf.books.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {shelf.books.map((b) => (
                <div key={b.id} className="card" style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <Cover book={b} w={34} h={50} onOpen={() => router.push(`/book/${b.id}`)} />
                  <div className="rowlink" style={{ flex: 1 }} onClick={() => router.push(`/book/${b.id}`)}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: 15 }}>{b.title}</div>
                    <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                      {(b.author || "unknown author").toUpperCase()}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                    <MoveControl book={b} shelfKey={shelf.key} size="sm" isDark={isDark} pending={pending} onMove={move} />
                    {shelf.key === "read" && <ReviewLine book={b} />}
                  </div>
                </div>
              ))}
              {shelf.books.length === 0 && <EmptyBox shelf={shelf} />}
            </div>
          </div>
        ))}
      </div>

      {/* ---- Mobile: three tabs, one shelf visible at a time (boards E3/F2) ---- */}
      <div className="mobile-only">
        <div style={{ display: "flex", borderBottom: "3px solid var(--color-text)" }}>
          {shelves.map((shelf, i) => {
            const on = shelf.key === activeTab;
            return (
              <button
                key={shelf.key}
                type="button"
                onClick={() => setActiveTab(shelf.key)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "12px 4px",
                  fontSize: 12,
                  fontWeight: on ? 700 : 500,
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                  border: "none",
                  borderRight: i < shelves.length - 1 ? "3px solid var(--color-text)" : "none",
                  background: on ? SHELF_STYLE[shelf.key].background : "transparent",
                  color: on ? SHELF_STYLE[shelf.key].color : "var(--color-neutral-700)",
                }}
              >
                {shelf.name.replace("Currently Reading", "Reading").replace("Want to Read", "Want")} {shelf.books.length}
              </button>
            );
          })}
        </div>
        {shelves
          .filter((s) => s.key === activeTab)
          .map((shelf) => (
            <div key={shelf.key} style={{ padding: "16px 0" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {shelf.books.map((b) => (
                  <div
                    key={b.id}
                    className="card"
                    style={{ flexDirection: "row", gap: 12, alignItems: "center", minHeight: 74 }}
                  >
                    <Cover book={b} w={40} h={58} onOpen={() => router.push(`/book/${b.id}`)} />
                    <div className="rowlink" style={{ flex: 1 }} onClick={() => router.push(`/book/${b.id}`)}>
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{b.title}</div>
                      <div className="mono" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                        {(b.author || "unknown author").toUpperCase()}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <MoveControl book={b} shelfKey={shelf.key} size="lg" isDark={isDark} pending={pending} onMove={move} />
                      {shelf.key === "read" && <ReviewLine book={b} />}
                    </div>
                  </div>
                ))}
              </div>
              {shelf.books.length === 0 && <EmptyBox shelf={shelf} />}

              {/* The "only a couple on the go" nudge (E3/F2) — shown on
                  the Reading tab only, and only while it's worth
                  nudging: empty already has its own message above, and
                  a reader with three or more in progress doesn't need
                  encouragement to add a fourth. Threshold is a judgement
                  call, not a value from the boards. */}
              {shelf.key === "reading" && shelf.books.length > 0 && shelf.books.length <= 2 && (
                <div
                  style={{
                    border: isDark ? "3px dashed #6b5b48" : "1px dashed var(--color-divider)",
                    padding: "22px 16px",
                    textAlign: "center",
                    marginTop: 16,
                  }}
                >
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: isDark ? 700 : 400, fontSize: isDark ? 18 : 17 }}>
                    Only two on the go?
                  </div>
                  <p className="text-muted" style={{ fontSize: 13, margin: "4px 0 12px" }}>
                    Add something from your Want to Read pile.
                  </p>
                  {/* F2's note calls this out by name: orange dims on
                      ink, so the dark variant is the one place this CTA
                      goes from secondary to primary, to hold its edge —
                      not a mistake carried over from the light board. */}
                  <button
                    type="button"
                    className={isDark ? "btn btn-primary" : "btn btn-secondary"}
                    style={{ minHeight: 44 }}
                    onClick={() => setActiveTab("want")}
                  >
                    See Want to Read
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
    </>
  );
}
