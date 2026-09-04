"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  adminBanAccount,
  adminDeleteAccount,
  adminForceRename,
  adminLiftBan,
  adminRestoreAccount,
  type ActionResult,
} from "@/app/actions/accounts";
import { adminModerateReview, type ActionResult as ReviewActionResult } from "@/app/actions/reviews";
import { adminSetReportStatus, type ActionResult as ReportActionResult } from "@/app/actions/reports";
import { daysLeft, formatDate, isInFuture } from "@/lib/dates";
import { REVIEW_STATUS_STYLE } from "@/lib/review-status";

export type UserReview = {
  id: string;
  book: string;
  stars: number;
  text: string;
  when: string;
  status: "allowed" | "deleted";
  openCount: number;
  why: string;
};

export type UserReport = {
  id: string;
  who: string;
  reason: string;
  when: string;
  note: string;
  status: "open" | "actioned";
};

type Account = {
  id: string;
  displayName: string | null;
  email: string | null;
  avatarColor: string;
  joined: string;
  isAdmin: boolean;
  isSelf: boolean;
  pending: { deletedBy: "self" | "admin"; deletedAt: string; purgeAt: string } | null;
  ban: { reason: string; bannedAt: string; bannedUntil: string | null } | null;
  openReportCount: number;
};

const BAN_OPTIONS: { label: string; caption: string; rec?: boolean }[] = [
  { label: "warning", caption: "NO BAN. RIGHT FOR A FIRST OFFENCE." },
  { label: "6 hours", caption: "A COOLING-OFF PERIOD. INTERRUPTS AN ARGUMENT WITHOUT ENDING ANYONE’S EVENING.", rec: true },
  { label: "1 day", caption: "A SECOND OFFENCE AFTER A WARNING, OR UNKINDNESS AIMED AT ANOTHER READER." },
  { label: "1 week", caption: "REPEAT OFFENDER, OR SOMETHING DELIBERATELY NASTY." },
  { label: "1 month", caption: "EFFECTIVELY A GOODBYE AT THIS AGE. FOR SPAM ACCOUNTS OR TARGETED BULLYING." },
];

export default function UserDetail({
  account,
  initialReviews: reviews,
  reports,
}: {
  account: Account;
  initialReviews: UserReview[];
  reports: UserReport[];
}) {
  const [deleteState, deleteAction] = useActionState<ActionResult, FormData>(
    adminDeleteAccount,
    undefined
  );
  const [restoreState, restoreAction] = useActionState<ActionResult, FormData>(
    adminRestoreAccount,
    undefined
  );
  const [reviewState, reviewAction, reviewPending] = useActionState<ReviewActionResult, FormData>(
    adminModerateReview,
    undefined
  );
  const [liftBanState, liftBanAction] = useActionState<ActionResult, FormData>(adminLiftBan, undefined);
  const [reportState, reportAction, reportPending] = useActionState<ReportActionResult, FormData>(
    adminSetReportStatus,
    undefined
  );
  const [renameState, renameAction, renamePending] = useActionState<ActionResult, FormData>(
    adminForceRename,
    undefined
  );
  const [banState, banAction, banPending] = useActionState<ActionResult, FormData>(adminBanAccount, undefined);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const [banOpen, setBanOpen] = useState(false);
  const [banDuration, setBanDuration] = useState("6 hours");

  const isBanned = Boolean(account.ban?.bannedUntil && isInFuture(account.ban.bannedUntil));
  const isWarned = Boolean(account.ban && !account.ban.bannedUntil);

  // Both dialogs are local UI state (renameOpen/banOpen), not something
  // the server response can drive directly, so a successful submit needs
  // an explicit close — everywhere else in this file, "the thing the
  // state controls" is derived straight from the account/report/review
  // data that revalidatePath refreshes, so nothing extra is needed there.
  // This closes during render rather than in an effect (comparing
  // against the last-seen state, React's own recommended way to react to
  // a value changing) since setting state from inside an effect just to
  // reflect another state change is the cascading-render effect misuse
  // the lint rule set-state-in-effect exists to catch.
  const [prevRenameState, setPrevRenameState] = useState(renameState);
  if (renameState !== prevRenameState) {
    setPrevRenameState(renameState);
    if (renameState && "ok" in renameState) {
      setRenameOpen(false);
      setRenameValue("");
    }
  }

  const [prevBanState, setPrevBanState] = useState(banState);
  if (banState !== prevBanState) {
    setPrevBanState(banState);
    if (banState && "ok" in banState) setBanOpen(false);
  }

  const error =
    (deleteState && "error" in deleteState && deleteState.error) ||
    (restoreState && "error" in restoreState && restoreState.error) ||
    (reviewState && "error" in reviewState && reviewState.error) ||
    (liftBanState && "error" in liftBanState && liftBanState.error) ||
    (reportState && "error" in reportState && reportState.error) ||
    null;

  return (
    <>
      <Link href="/admin/users" className="btn btn-ghost" style={{ marginBottom: 16, display: "inline-block" }}>
        ← All users
      </Link>

      {error && (
        <div className="mono" style={{ color: "var(--color-problem-text)", marginBottom: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 10 }}>
        <div
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: 64,
            height: 64,
            flex: "none",
            border: "3px solid var(--color-text)",
            background: account.avatarColor,
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: 28,
          }}
        >
          {(account.displayName || "?").slice(0, 1).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 36, margin: "0 0 4px" }}>{account.displayName || "(no name set yet)"}</h1>
          <div className="mono" style={{ color: "var(--color-neutral-700)" }}>
            JOINED {formatDate(account.joined)}
          </div>
          {/* Every account signed up with an address, so a missing one
              here means the lookup failed rather than that there isn't
              one. Say that, instead of rendering nothing and leaving an
              admin to conclude this reader somehow has no email. */}
          <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 3 }}>
            {account.email ?? "EMAIL UNAVAILABLE — THE LOOKUP FAILED"}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            {account.isAdmin && <span className="tag tag-accent">Admin</span>}
            {account.isSelf && <span className="tag tag-neutral">You</span>}
            {account.pending && (
              <span className="tag" style={{ background: "#FFD400", color: "#14110f" }}>
                Pending deletion · {daysLeft(account.pending.purgeAt)}d left
              </span>
            )}
            {isWarned && (
              <span className="tag" style={{ background: "#FFD400", color: "#14110f" }}>
                Warned
              </span>
            )}
            {account.openReportCount > 0 && (
              <span className="tag" style={{ background: "#ff3d9a", color: "#14110f" }}>
                Reported ×{account.openReportCount}
              </span>
            )}
          </div>
        </div>
        {!account.isSelf && (
          <div style={{ display: "flex", gap: 8, flex: "none" }}>
            {account.pending ? (
              <form action={restoreAction}>
                <input type="hidden" name="userId" value={account.id} />
                <button type="submit" className="btn btn-primary">
                  Lift the ban
                </button>
              </form>
            ) : confirmingDelete ? (
              <form action={deleteAction} style={{ display: "flex", gap: 8 }}>
                <input type="hidden" name="userId" value={account.id} />
                <button type="submit" className="btn btn-danger">
                  Confirm delete
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={() => setRenameOpen(true)}>
                  Force rename
                </button>
                {isBanned ? (
                  <form action={liftBanAction}>
                    <input type="hidden" name="userId" value={account.id} />
                    <button type="submit" className="btn btn-primary">
                      Lift the ban
                    </button>
                  </form>
                ) : (
                  <button className="btn btn-secondary" onClick={() => setBanOpen(true)}>
                    Ban account
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => setConfirmingDelete(true)}>
                  Delete account
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isBanned && account.ban && (
        <div
          style={{
            background: "var(--color-problem)",
            color: "var(--color-cream-fixed)",
            border: "3px solid var(--color-text)",
            boxShadow: "4px 4px 0 var(--color-text)",
            padding: "12px 16px",
            margin: "12px 0 6px",
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16 }}>
            Banned for {account.ban.reason}
          </div>
          <p style={{ fontSize: 13, margin: "4px 0 0" }}>
            Their reviews and lists have been removed, and their email is blocked from signing up
            again. They cannot post, share or request anything until the ban lifts.
          </p>
        </div>
      )}

      {renameOpen && (
        <div className="dialog-backdrop">
          <div className="dialog blueprint">
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            <div className="card-kicker">Force rename</div>
            <div className="dialog-title">Rename {account.displayName || "this reader"}</div>
            <p className="dialog-body" style={{ margin: 0 }}>
              Pick the name they will be given. They can choose their own again later, as long as
              it passes the same checks anyone else&apos;s does.
            </p>
            <form action={renameAction}>
              <input type="hidden" name="userId" value={account.id} />
              <div className="field">
                <label>New display name</label>
                <input
                  className="input"
                  style={{ minHeight: 42 }}
                  name="newName"
                  placeholder="e.g. reader_4821"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                />
              </div>
              {renameState && "error" in renameState && (
                <div className="mono" style={{ color: "var(--color-problem-text)", fontWeight: 700 }}>
                  {renameState.error}
                </div>
              )}
              <div className="dialog-actions" style={{ justifyContent: "flex-start" }}>
                <button type="submit" className="btn btn-primary" disabled={renamePending}>
                  {renamePending ? "Renaming…" : "Rename"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setRenameOpen(false);
                    setRenameValue("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {banOpen && (
        <div className="dialog-backdrop">
          <div className="dialog blueprint" style={{ width: "min(500px, 100%)" }}>
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            <div className="card-kicker">Check before you act</div>
            <div className="dialog-title">Ban {account.displayName || "this reader"}?</div>
            <p className="dialog-body" style={{ margin: 0 }}>
              A ban stops them posting reviews, sharing lists and requesting books. Their reviews
              and lists are removed, and their email address can never be used to sign up again —
              a warning does neither.
            </p>
            <form action={banAction}>
              <input type="hidden" name="userId" value={account.id} />
              <div>
                <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 8 }}>
                  HOW LONG? PICK THE SMALLEST THING THAT WILL WORK
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {BAN_OPTIONS.map((o) => (
                    <label
                      key={o.label}
                      className="radio"
                      style={{ alignItems: "flex-start", border: "3px solid var(--color-divider)", padding: "10px 12px" }}
                    >
                      <input
                        type="radio"
                        name="duration"
                        value={o.label}
                        checked={banDuration === o.label}
                        onChange={() => setBanDuration(o.label)}
                      />
                      <span className="dot" style={{ marginTop: 2 }} />
                      <span style={{ flex: 1 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15 }}>
                            {o.label === "warning" ? "Warning only" : o.label}
                          </span>
                          {o.rec && (
                            <span className="tag" style={{ background: "#c6f24e", color: "#14110f" }}>
                              Start here
                            </span>
                          )}
                        </span>
                        <span className="mono" style={{ display: "block", color: "var(--color-neutral-700)", lineHeight: 1.6, marginTop: 3 }}>
                          {o.caption}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 10, lineHeight: 1.6 }}>
                  YOU CAN ALWAYS EXTEND A BAN. YOU CANNOT UN-LOSE A READER WHO DECIDED THE SITE WAS
                  UNFAIR.
                </div>
              </div>
              {banState && "error" in banState && (
                <div className="mono" style={{ color: "var(--color-problem-text)", fontWeight: 700 }}>
                  {banState.error}
                </div>
              )}
              <div className="dialog-actions" style={{ justifyContent: "flex-start" }}>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={banPending}
                >
                  {banPending
                    ? "Working…"
                    : banDuration === "warning"
                      ? "Send the warning"
                      : `Ban for ${banDuration}`}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setBanOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {account.pending && (
        <div
          style={{
            background: "var(--color-problem)",
            color: "var(--color-cream-fixed)",
            border: "3px solid var(--color-text)",
            boxShadow: "4px 4px 0 var(--color-text)",
            padding: "12px 16px",
            margin: "12px 0 6px",
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16 }}>
            {account.pending.deletedBy === "self" ? "They deleted their own account" : "Deleted by an admin"} ·{" "}
            {daysLeft(account.pending.purgeAt)} days left
          </div>
          <p style={{ fontSize: 13, margin: "4px 0 0" }}>
            They cannot sign in until this is undone. Gone for good once the days run out.
          </p>
        </div>
      )}

      {reports.length > 0 && (
        <>
          <h4 style={{ margin: "18px 0 10px" }}>Reports about them</h4>
          <div style={{ borderTop: "3px solid var(--color-text)", marginBottom: 16 }}>
            {reports.map((rep) => {
              const open = rep.status === "open";
              return (
                <div key={rep.id} className="qrow">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span
                        className="tag"
                        style={
                          open
                            ? { background: "#ff3d9a", color: "#14110f", borderColor: "#14110f" }
                            : { background: "#c6f24e", color: "#14110f", borderColor: "#14110f" }
                        }
                      >
                        {open ? "Open" : "Actioned"}
                      </span>
                      <span className="mono" style={{ color: "var(--color-neutral-700)" }}>
                        FROM {rep.who} · {rep.when}
                      </span>
                    </div>
                    <div style={{ borderLeft: "5px solid var(--color-text)", paddingLeft: 12 }}>
                      <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginBottom: 4 }}>
                        {rep.reason}
                      </div>
                      {rep.note && <p style={{ fontSize: 14, margin: 0 }}>{rep.note}</p>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flex: "none", alignSelf: "center" }}>
                    <form action={reportAction}>
                      <input type="hidden" name="reportId" value={rep.id} />
                      <input type="hidden" name="status" value={open ? "actioned" : "open"} />
                      <button type="submit" className={open ? "btn btn-primary" : "btn btn-ghost"} disabled={reportPending}>
                        {open ? "Mark as actioned" : "Reopen"}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <h4 style={{ margin: "18px 0 10px" }}>Their reviews</h4>
      {reviews.length === 0 ? (
        <div style={{ border: "3px dashed var(--color-divider)", padding: 26, textAlign: "center" }}>
          <div className="mono" style={{ color: "var(--color-neutral-700)" }}>
            NOTHING POSTED YET
          </div>
        </div>
      ) : (
        <div style={{ borderTop: "3px solid var(--color-text)" }}>
          {reviews.map((r) => {
            const live = r.openCount > 0;
            const rLabel = live ? `Reported ×${r.openCount}` : r.status === "allowed" ? "Allowed" : "Deleted";
            const rStyle = live ? REVIEW_STATUS_STYLE.pending : REVIEW_STATUS_STYLE[r.status];
            return (
              <div key={r.id} className="qrow">
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className="tag" style={rStyle}>
                      {rLabel}
                    </span>
                    <span className="mono" style={{ color: "var(--color-neutral-700)" }}>
                      ON &ldquo;{r.book.toUpperCase()}&rdquo; · {r.when} · {r.stars}/5
                    </span>
                  </div>
                  <div style={{ borderLeft: "5px solid var(--color-text)", paddingLeft: 12 }}>
                    <p style={{ fontSize: 14, margin: 0 }}>{r.text}</p>
                  </div>
                  {r.why && (
                    <div className="mono" style={{ color: "var(--color-accent-700)", fontWeight: 700, marginTop: 8 }}>
                      {r.why}
                    </div>
                  )}
                </div>
                {live && (
                  <div style={{ display: "flex", gap: 8, flex: "none", alignSelf: "center" }}>
                    <form action={reviewAction}>
                      <input type="hidden" name="reviewId" value={r.id} />
                      <input type="hidden" name="decision" value="allowed" />
                      <button type="submit" className="btn btn-primary" disabled={reviewPending}>
                        Allow
                      </button>
                    </form>
                    <form action={reviewAction}>
                      <input type="hidden" name="reviewId" value={r.id} />
                      <input type="hidden" name="decision" value="deleted" />
                      <button type="submit" className="btn btn-secondary" disabled={reviewPending}>
                        Delete
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="mono" style={{ color: "var(--color-neutral-700)", marginTop: 16, lineHeight: 1.7 }}>
        REPORTED CONTENT STAYS VISIBLE TO READERS UNTIL YOU DECIDE — NOTHING IS HIDDEN AUTOMATICALLY.
        A REPORT IS NOT A VERDICT.
      </div>
    </>
  );
}
