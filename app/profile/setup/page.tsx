"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { palette } from "@/lib/mock";

/*
 * Ported from the `isProfileSetup` block in Prototype with Admin.dc.html
 * (lines 701-746). Chrome-less screen, no <Nav /> — see app/start for
 * why.
 *
 * The export runs a real display-name validator here (banned words,
 * leetspeak folding, taken/reserved names, an async "checking…"
 * state — see source lines ~1758-1800 and 1941-1962). Porting that
 * whole thing wasn't required for this pass. What's wired instead is
 * basic client-side validation — empty, too short, and taken against
 * a small stand-in list — using three names already present in
 * mock.ts's adminAccounts rather than invented ones. The full filter
 * comes with the real signup API.
 *
 * `submitProfile`'s gating (must land on "available" before
 * continuing) matches the export's logic. On success the export goes
 * to the survey screen next, which this follows.
 */

const TAKEN_NAMES = ["zeni_reads", "kofi_a", "bookhub_official"];

type NameStatus = "idle" | "short" | "taken" | "available";

function nameState(name: string): NameStatus {
  const trimmed = name.trim();
  if (!trimmed) return "idle";
  if (trimmed.length < 2) return "short";
  if (TAKEN_NAMES.includes(trimmed.toLowerCase())) return "taken";
  return "available";
}

const STATUS_CHIP: Record<Exclude<NameStatus, "idle">, { mark: string; text: string; bg: string; ink: string }> = {
  short: { mark: "!", text: "A bit short — 2 characters or more", bg: "#C41031", ink: "#EFECE3" },
  taken: { mark: "✕", text: "Taken already — try one of these", bg: "#C41031", ink: "#EFECE3" },
  available: { mark: "✓", text: "That one’s free", bg: "#c6f24e", ink: "#14110f" },
};

export default function ProfileSetupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [avatarColorName, setAvatarColorName] = useState("Blue");
  const [nameError, setNameError] = useState("");

  const status = nameState(displayName);
  const swatch = palette.find((p) => p.name === avatarColorName) ?? palette[4];
  const initials = (displayName.trim() || "?").slice(0, 1).toUpperCase();

  const suggestions =
    status === "taken"
      ? (() => {
          const base = displayName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || "reader";
          return [`${base}_${new Date().getFullYear() % 100}`, `${base}42`, `${base}_reads`]
            .filter((x) => !TAKEN_NAMES.includes(x))
            .slice(0, 3);
        })()
      : [];

  function submitProfile() {
    if (status === "idle") {
      setNameError("PICK A DISPLAY NAME FIRST");
      return;
    }
    if (status !== "available") {
      setNameError("THAT NAME WON’T WORK — SEE ABOVE");
      return;
    }
    setNameError("");
    router.push("/survey");
  }

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "56px 24px" }}>
      <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 10 }}>
        STEP 2 OF 4
      </div>
      <h1 style={{ fontSize: 34, margin: "0 0 6px" }}>What should we call you?</h1>
      <p style={{ fontSize: 14, marginBottom: 26 }}>
        This is the name shown on your reviews and any lists you share. It
        doesn&apos;t have to be your real name.
      </p>

      <div className="field" style={{ marginBottom: 8 }}>
        <label>Display name</label>
        <input
          className="input"
          style={{ minHeight: 42 }}
          placeholder="e.g. maya, or bookdragon03"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setNameError("");
          }}
        />
      </div>

      {status !== "idle" && (
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              border: "3px solid #14110F",
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
              className="btn btn-secondary"
              style={{ fontSize: 13, padding: "7px 12px" }}
              onClick={() => setDisplayName(s)}
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

      {nameError && (
        <div className="mono" style={{ color: "var(--color-accent-700)" }}>
          {nameError}
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

      <button
        className="btn btn-primary btn-block blueprint"
        style={{ minHeight: 46, marginTop: 30 }}
        onClick={submitProfile}
      >
        Continue
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
      </button>
    </div>
  );
}
