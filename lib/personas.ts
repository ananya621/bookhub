import type { CurrentUser } from "@/lib/auth";

/*
 * Fake accounts for testing the UI in every auth state, driven by the
 * dev-only persona switcher. Development only — the switcher and its
 * route handler are both disabled outside development, so nothing here
 * reaches a production build's behaviour.
 *
 * Each persona carries the same two halves a real account will:
 *   user  — the session identity (lib/auth.ts CurrentUser)
 *   data  — the rows that would belong to that user in Postgres
 *
 * Personas are chosen to cover the states that render differently, not
 * to be a plausible spread of users. Two are easy to overlook and are
 * here on purpose:
 *
 *   - `unverified` has the most unique UI of any state (the banner on
 *     seven screens, plus the two verify gates on posting a review and
 *     opening a list's share link).
 *   - `empty` is the only way to reach the four empty states the export
 *     ships: "Nothing on the go", "This list is empty", "No books
 *     matched" and "Nothing matched exactly". A fully-populated account
 *     can never render them.
 *
 * There is no banned persona: a banned account cannot log in, so it has
 * no signed-in UI to test. See the note in lib/auth.ts.
 */

export type Status = "read" | "reading" | "want" | "none";
export type StepKey = "started" | "halfway" | "nearly";

export type PersonaData = {
  statuses: Record<string, Status>;
  progress: Record<string, StepKey>;
  lists: { name: string; isPublic: boolean; bookIds: string[] }[];
  /** Reviews this user has written, keyed by book id. */
  myReviews: Record<string, { stars: number; text: string }>;
  requests: { title: string; author: string; status: string; reason: string }[];
  survey: { genres: string[]; level: string; length: string } | null;
};

export type Persona = {
  id: PersonaId;
  /** Shown in the switcher. */
  label: string;
  /** One line on what this persona is for. */
  note: string;
  user: CurrentUser | null;
  data: PersonaData;
};

export type PersonaId =
  | "guest"
  | "onboarding"
  | "unverified"
  | "empty"
  | "full"
  | "admin";

const NO_DATA: PersonaData = {
  statuses: {},
  progress: {},
  lists: [],
  myReviews: {},
  requests: [],
  survey: null,
};

/* The populated account, shared by `unverified`, `full` and `admin` so
   the three differ only by the flags under test, not by content. */
const LIVED_IN: PersonaData = {
  statuses: {
    hobbit: "read",
    nevermoor: "reading",
    skellig: "reading",
    coraline: "want",
    holes: "want",
  },
  progress: { nevermoor: "halfway", skellig: "started" },
  lists: [
    { name: "Favourite Fiction Reads", isPublic: true, bookIds: ["hobbit", "nevermoor"] },
    { name: "Scary but not too scary", isPublic: false, bookIds: ["coraline"] },
  ],
  myReviews: {
    hobbit: { stars: 5, text: "The riddles in the dark chapter is the best bit. Read it twice." },
  },
  requests: [
    { title: "Impossible Creatures", author: "Katherine Rundell", status: "approved", reason: "" },
    {
      title: "The Boy in the Striped Pyjamas",
      author: "John Boyne",
      status: "declined",
      reason:
        "This one is written for older readers and we keep the catalogue to Middle Grade and Young Adult. Ask your school library about it.",
    },
    { title: "Skandar and the Unicorn Thief", author: "A.F. Steadman", status: "pending", reason: "" },
  ],
  survey: { genres: ["Fantasy", "Adventure"], level: "Middle Grade", length: "200–400 pages" },
};

export const PERSONAS: Record<PersonaId, Persona> = {
  guest: {
    id: "guest",
    label: "Site visitor",
    note: "Not signed in. Browse only; every account action opens a signup gate.",
    user: null,
    data: NO_DATA,
  },

  onboarding: {
    id: "onboarding",
    label: "Just signed up",
    note: "Mid-onboarding — walks profile setup, then the survey, then verify.",
    user: {
      id: "u-onboarding",
      displayName: "",
      email: "new@school.uk",
      avatarColor: "#1B3BFF",
      avatarInk: "#EFECE3",
      emailVerified: false,
      isAdmin: false,
      onboardingStep: "profile",
    },
    data: NO_DATA,
  },

  unverified: {
    id: "unverified",
    label: "Signed up, not verified",
    note: "Can browse and track. Reviews and shared lists are locked; banner on 7 screens.",
    user: {
      id: "u-unverified",
      displayName: "Sam",
      email: "sam@school.uk",
      avatarColor: "#FF3D9A",
      avatarInk: "#14110F",
      emailVerified: false,
      isAdmin: false,
      onboardingStep: null,
    },
    data: LIVED_IN,
  },

  empty: {
    id: "empty",
    label: "Verified, nothing tracked",
    note: "Finished onboarding but has no data — the only way to see the empty states.",
    user: {
      id: "u-empty",
      displayName: "Ada",
      email: "ada@school.uk",
      avatarColor: "#C6F24E",
      avatarInk: "#14110F",
      emailVerified: true,
      isAdmin: false,
      onboardingStep: null,
    },
    data: { ...NO_DATA, survey: { genres: [], level: "Middle Grade", length: "Any" } },
  },

  full: {
    id: "full",
    label: "Verified, full account",
    note: "Shelves, lists, a posted review and past requests. The everyday case.",
    user: {
      id: "u-full",
      displayName: "Maya",
      email: "maya@school.uk",
      avatarColor: "#1B3BFF",
      avatarInk: "#EFECE3",
      emailVerified: true,
      isAdmin: false,
      onboardingStep: null,
    },
    data: LIVED_IN,
  },

  admin: {
    id: "admin",
    label: "Admin",
    note: "Everything the full account has, plus Admin in the nav and the /admin pages.",
    user: {
      id: "u-admin",
      displayName: "Mr Hale",
      email: "hale@school.uk",
      avatarColor: "#7B2DFF",
      avatarInk: "#EFECE3",
      emailVerified: true,
      isAdmin: true,
      onboardingStep: null,
    },
    data: LIVED_IN,
  },
};

export const PERSONA_ORDER: PersonaId[] = [
  "guest",
  "onboarding",
  "unverified",
  "empty",
  "full",
  "admin",
];

export const isPersonaId = (v: string): v is PersonaId => v in PERSONAS;

/** Initials for the nav avatar, matching the export's monogram. */
export const initialsOf = (displayName: string) =>
  displayName.trim().slice(0, 1).toUpperCase() || "?";
