"use client";

import { useActionState, useRef, useState } from "react";
import { palette } from "@/lib/mock";
import { checkDisplayName, saveProfile, type ActionResult } from "@/app/actions/auth";

/*
 * Ported from the `isProfileSetup` block in Prototype with Admin.dc.html
 * (search for `{{ isProfileSetup }}` — the anchor, not the line number,
 * since that shifts on every design export). Chrome-less screen, no
 * <Nav /> — see app/start for why.
 *
 * The name check is now real. It calls check_display_name() in the
 * database, which returns short / banned / reserved / taken / available.
 * That function holds the rude-word filter and the reserved-name list,
 * so the browser never sees either — it only learns the verdict on the
 * one name it asked about.
 *
 * Two details copied from the export because both matter. The check
 * waits 700ms after you stop typing, so it isn't fired on every
 * keystroke. And each check carries a number, so a slow earlier answer
 * can't overwrite a newer one and show the wrong verdict.
 *
 * The check while typing is only a hint. saveProfile runs it again on
 * the server before saving, which is what actually decides.
 *
 * The wireframe board (B3, Wireframes Pulp-print.dc.html) shows a
 * seventh reference state, "invalid characters" — "letters, numbers
 * and underscores only" — alongside short/banned/reserved/taken/
 * available. There is no such verdict here on purpose: the database's
 * name_status enum (supabase/migrations/20260901044724_create_display_
 * name_rules.sql) only ever returns short, banned, reserved, taken or
 * available — nothing enforces a character allow-list server-side, so
 * a client-only "invalid characters" state would reject names the
 * server would happily accept, which is worse than not having it. If a
 * character restriction is wanted, it needs to start in the database
 * (a new migration is out of this screen's scope), not here.
 */

type NameStatus =
  | "idle"
  | "checking"
  | "short"
  | "banned"
  | "reserved"
  | "taken"
  | "available";

const STATUS_CHIP: Record<
  Exclude<NameStatus, "idle" | "checking">,
  { mark: string; text: string; bg: string; ink: string }
> = {
  short: { mark: "!", text: "A bit short — 2 characters or more", bg: "#C41031", ink: "#EFECE3" },
  banned: { mark: "!", text: "That name isn’t allowed here", bg: "#C41031", ink: "#EFECE3" },
  // Exact wording from board B3's reference key — was "pick another".
  reserved: { mark: "!", text: "That one’s reserved — pick something else", bg: "#C41031", ink: "#EFECE3" },
  taken: { mark: "✕", text: "Taken already — try one of these", bg: "#C41031", ink: "#EFECE3" },
  available: { mark: "✓", text: "That one’s free", bg: "#c6f24e", ink: "#14110f" },
};

export default function ProfileSetupPage() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    saveProfile,
    undefined
  );

  const [displayName, setDisplayName] = useState("");
  const [avatarColorName, setAvatarColorName] = useState("Blue");
  const [status, setStatus] = useState<NameStatus>("idle");

  // Rising number per check. Only the newest answer is allowed to win,
  // so a slow earlier reply can't overwrite a newer one.
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Done here rather than in an effect: the check is a response to
  // typing, not something that follows from rendering.
  function onNameChange(value: string) {
    setDisplayName(value);
    if (timer.current) clearTimeout(timer.current);

    const name = value.trim();
    if (!name) {
      setStatus("idle");
      return;
    }
    setStatus("checking");

    const mine = ++seq.current;
    timer.current = setTimeout(async () => {
      const verdict = await checkDisplayName(name);
      if (seq.current === mine) setStatus(verdict as NameStatus);
    }, 700);
  }

  const swatch = palette.find((p) => p.name === avatarColorName) ?? palette[4];
  const initials = (displayName.trim() || "?").slice(0, 1).toUpperCase();

  const suggestions =
    status === "taken"
      ? (() => {
          const base =
            displayName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || "reader";
          return [`${base}_${new Date().getFullYear() % 100}`, `${base}42`, `${base}_reads`].slice(
            0,
            3
          );
        })()
      : [];

  return (
    <form action={formAction} style={{ maxWidth: 440, margin: "0 auto", padding: "56px 24px" }}>
      <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 10 }}>
        STEP 3 OF 4
      </div>
      <h1 style={{ fontSize: 34, margin: "0 0 6px" }}>What should we call you?</h1>
      <p style={{ fontSize: 14, marginBottom: 26 }}>
        This is the name shown on your reviews and any lists you share. It
        doesn&apos;t have to be your real name.
      </p>

      <div className="field" style={{ marginBottom: 8 }}>
        <label htmlFor="displayName">Display name</label>
        <input
          id="displayName"
          name="displayName"
          className="input"
          style={{ minHeight: 42 }}
          placeholder="e.g. maya, or bookdragon03"
          value={displayName}
          onChange={(e) => onNameChange(e.target.value)}
          autoComplete="off"
        />
      </div>

      {status === "checking" && (
        // Same chip shape as the resolved states below (board B3's
        // reference key draws "checking" as a bordered, unfilled chip
        // with a "···" mark), rather than a plain mono line — so the
        // layout doesn't jump once a verdict arrives.
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              border: "3px solid var(--color-text)",
              padding: "6px 12px",
            }}
          >
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15 }}>
              ···
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 14 }}>
              Checking if that&apos;s free…
            </span>
          </div>
        </div>
      )}

      {status !== "idle" && status !== "checking" && (
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              border: "3px solid var(--color-text)",
              padding: "6px 12px",
              background: STATUS_CHIP[status].bg,
              color: STATUS_CHIP[status].ink,
            }}
          >
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15 }}>
              {STATUS_CHIP[status].mark}
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 14 }}>
              {STATUS_CHIP[status].text}
            </span>
          </div>
        </div>
      )}

      {status === "taken" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 13, padding: "7px 12px" }}
              onClick={() => onNameChange(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mono" style={{ color: "var(--color-neutral-700)", lineHeight: 1.6 }}>
        WE NEVER SHOW YOUR EMAIL ADDRESS TO ANYONE UNLESS REQUIRED BY LAW.
        THIS DISPLAY NAME IS THE ONLY NAME OTHERS SEE — IT APPEARS ON YOUR
        REVIEWS AND ON YOUR PROFILE.
      </div>

      {state?.error && (
        // Red, per RULES — errors only, never the orange used for the
        // primary action or the accent-700 kicker/label colour.
        <div className="mono" style={{ color: "var(--color-problem-text)" }}>
          {state.error}
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--color-divider)", margin: "26px 0 0", paddingTop: 22 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>Your monogram colour</div>
        <div
          className="mono"
          style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 14 }}
        >
          PICK ONE — CHANGE IT ANY TIME
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            className="blueprint"
            style={{
              width: 84,
              height: 84,
              flex: "none",
              display: "grid",
              placeItems: "center",
              background: swatch.css,
            }}
          >
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 38, color: swatch.ink }}>
              {initials}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
              {palette.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className="btn"
                  title={c.name}
                  style={{
                    minHeight: 44,
                    fontSize: 15,
                    borderColor: "var(--color-divider)",
                    color: c.ink,
                    background: c.css,
                  }}
                  onClick={() => setAvatarColorName(c.name)}
                >
                  {c.name === avatarColorName ? "✓" : ""}
                </button>
              ))}
            </div>
            <div
              className="mono"
              style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginTop: 10 }}
            >
              SELECTED: {avatarColorName.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <input type="hidden" name="avatarColor" value={avatarColorName} />

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-block blueprint"
        style={{ minHeight: 46, marginTop: 30 }}
      >
        {pending ? "Saving…" : "Continue"}
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
      </button>
    </form>
  );
}
