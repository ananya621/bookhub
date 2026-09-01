"use client";

import { useActionState, useState } from "react";
import { saveSurvey, type ActionResult } from "@/app/actions/auth";
import { allGenres, allLevels, allLengths } from "@/lib/mock";

/*
 * Ported from the `isSurvey` block in Prototype with Admin.dc.html
 * (lines 748-786). Chrome-less screen, no <Nav /> — see app/start for
 * why.
 *
 * This is step 3 of 4 in the export's onboarding order (signup ->
 * profile setup -> survey -> verify -> home — `submitSignup` sends
 * the user to `profileSetup`, `submitProfile` sends them to `survey`,
 * and `submitSurvey` sends them to `verify` when they aren't verified
 * yet). The export also reuses this screen later for "edit your
 * answers" from an existing profile (`surveyEditing`, with a
 * different kicker/CTA and a `home` destination) — that entry point
 * isn't wired here since editing an existing profile is out of scope
 * for this onboarding flow, so the kicker/CTA are hardcoded to the
 * onboarding copy.
 *
 * The survey's two option lists are NOT plain `allGenres`/`allLengths`
 * — the export builds its own on top of them, and only here:
 *
 *   genreOpts  (line 1990) = allGenres.concat(['Other'])
 *   lengthOpts (line 1995) = five prose labels mapped onto the four
 *                            allLengths values plus a fifth, 'Any'
 *
 * `allGenres` itself stays unchanged — the search screen's genre
 * filters (line 2014) map it directly and must NOT gain an "Other"
 * entry, which is why both extras are built locally here rather than
 * added to mock.ts.
 */

/* Display label -> the value stored on the survey, exactly as the
   export pairs them at line 1996. */
const LENGTH_OPTS: { label: string; value: string }[] = [
  { label: "Short — under 200 pages", value: "Under 200 pages" },
  { label: "Medium — 200 to 400 pages", value: "200–400 pages" },
  { label: "Long — 400 to 600 pages", value: "400–600 pages" },
  { label: "Very long — 600 pages and up", value: "600+ pages" },
  { label: "I don’t mind", value: "Any" },
];

const GENRE_OPTS = [...allGenres, "Other"];
export default function SurveyPage() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    saveSurvey,
    undefined
  );
  const [genres, setGenres] = useState<string[]>([]);
  const [level, setLevel] = useState(allLevels[0]);
  const [length, setLength] = useState(allLengths[1]);

  function toggleGenre(g: string) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  const levelWarnShow = level === "Young Adult" || level === "Adult";
  const levelWarnHead =
    level === "Adult" ? "ADULT — WHAT THIS CAN INCLUDE" : "YOUNG ADULT — WHAT THIS CAN INCLUDE";
  const levelWarnText =
    level === "Adult"
      ? "ADULT BOOKS CAN CONTAIN EXPLICIT SEXUAL CONTENT, GRAPHIC VIOLENCE, DRUG USE AND DISTRESSING THEMES WITH NO AGE FILTERING AT ALL. CHOOSING THIS IS YOUR DECISION AND YOURS ALONE — THE SITE IS NOT RESPONSIBLE FOR WHAT YOU CHOOSE TO READ. IF YOU ARE UNSURE, TALK TO A PARENT, CARER OR TEACHER."
      : "YOUNG ADULT BOOKS OFTEN CARRY STRONGER LANGUAGE, VIOLENCE, ROMANCE AND SEXUAL REFERENCES, AND THEMES LIKE SELF-HARM, GRIEF, BULLYING AND DRUG USE. CHOOSING THIS IS YOUR DECISION AND YOURS ALONE — THE SITE IS NOT RESPONSIBLE FOR WHAT YOU CHOOSE TO READ. IF YOU ARE UNSURE, TALK TO A PARENT, CARER OR TEACHER.";

  return (
    <form action={formAction} style={{ maxWidth: 620, margin: "0 auto", padding: "48px 24px 72px" }}>
      <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 10 }}>
        STEP 3 OF 4
      </div>
      <h1 style={{ fontSize: 34, margin: "0 0 6px" }}>What do you like to read?</h1>
      <p style={{ fontSize: 14, marginBottom: 28 }}>
        Pick anything that sounds like you. You can change these answers any
        time.
      </p>

      <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, marginBottom: 4 }}>
        Favourite genres
      </div>
      <div
        className="mono"
        style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 12 }}
      >
        CHOOSE ONE OR MORE
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 30 }}>
        {GENRE_OPTS.map((g) => (
          <label
            key={g}
            className="radio"
            style={{ border: "1px solid var(--color-divider)", padding: 10, minHeight: 44 }}
          >
            <input type="checkbox" checked={genres.includes(g)} onChange={() => toggleGenre(g)} />
            <span className="dot" />
            {g}
          </label>
        ))}
      </div>

      <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, marginBottom: 4 }}>
        Which age range suits you?
      </div>
      <div
        className="mono"
        style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 12 }}
      >
        PICK ONE
      </div>
      <div className="seg" style={{ marginBottom: 30 }}>
        {allLevels.map((l) => (
          <label key={l} className="seg-opt" style={{ minHeight: 44 }}>
            <input type="radio" name="lvl" checked={level === l} onChange={() => setLevel(l)} />
            {l}
          </label>
        ))}
      </div>

      {levelWarnShow && (
        <div style={{ border: "3px solid #C41031", padding: "12px 14px", margin: "-18px 0 30px" }}>
          <div className="mono" style={{ color: "var(--color-problem-text)", fontWeight: 700, marginBottom: 5 }}>
            {levelWarnHead}
          </div>
          <div className="mono" style={{ color: "var(--color-problem-text)", lineHeight: 1.7 }}>
            {levelWarnText}
          </div>
        </div>
      )}

      <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, marginBottom: 4 }}>
        How long do you like your books?
      </div>
      <div
        className="mono"
        style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 12 }}
      >
        PICK ONE
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
        {LENGTH_OPTS.map((p) => (
          <label key={p.value} className="radio" style={{ minHeight: 40 }}>
            <input
              type="radio"
              name="len"
              checked={length === p.value}
              onChange={() => setLength(p.value)}
            />
            <span className="dot" />
            {p.label}
          </label>
        ))}
      </div>

      {/* The answers live in React state so the age warning can react to
          them, so they go to the server as hidden fields. */}
      {genres.map((g) => (
        <input key={g} type="hidden" name="genres" value={g} />
      ))}
      <input type="hidden" name="readingLevel" value={level} />
      <input type="hidden" name="preferredLength" value={length} />

      {state?.error && (
        <div className="mono" style={{ color: "var(--color-accent-700)", marginBottom: 12 }}>
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-block blueprint"
        style={{ minHeight: 48, fontSize: 17 }}
      >
        {pending ? "Saving your answers…" : "Find My Perfect Book!"}
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
      </button>
    </form>
  );
}
