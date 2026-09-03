#!/usr/bin/env node
// Local development seed data.
//
// Run with:  node scripts/seed-local.mjs
//
// Fills your local database with a small, realistic catalogue and two
// real Supabase auth accounts to sign in as, so there is something to
// look at when the app boots and something to click through as both a
// reader and an admin. This replaces the old dev "persona" fake-login
// system -- from now on, local testing uses real accounts like the live
// site would.
//
// If every insert here fails with "permission denied for table ...",
// your database doesn't have `auto_expose_new_tables = true` applied --
// see the note in supabase/config.toml and docs/local-development.md,
// and run `supabase db reset`.
//
// AUTH ACCOUNTS, NOT SQL ROWS
// ----------------------------
// The two accounts below are created through the Admin API
// (auth.admin.createUser), never by inserting into auth.users directly.
// supabase/migrations/20260901170000_seed_first_admin_by_email.sql
// explains why: hand-inserted auth rows are left in a broken state and
// later fail with "Database error querying schema". createUser with
// email_confirm: true does the same thing a real signup + email click
// would do, just without the click.
//
// Making the admin an admin: the handle_new_user trigger (same
// migration) only grants is_admin when the signing-up address is
// already listed in admin_emails at the moment the row is inserted --
// so this script writes to admin_emails FIRST, then creates the user.
// That is the one supported path into that table (no policy allows a
// normal write to it) and it means we never have to touch user_roles
// by hand.
//
// IDEMPOTENCY: A MIX, ON PURPOSE
// -------------------------------
// The two accounts are matched by EMAIL (the real uniqueness rule
// auth.users enforces) and reused if they already exist -- recreating a
// Supabase auth user isn't possible anyway, and there is no reason to.
// Their profile and survey rows are upserted so re-running always
// leaves them finished with onboarding, even if you'd hand-edited one.
//
// Everything else -- the catalogue, reviews, reading-tracker rows,
// lists, requests, reports -- is wiped and reseeded on every run. Those
// tables have real uniqueness constraints that cross several rows at
// once (one review per reader per book, one pending request per title,
// one report per reporter/target...), so "insert if missing" would mean
// re-deriving all of them by hand. Deleting this script's own rows
// (matched by the fixed book ids and the two seed users below) and
// reinserting is simpler, and it means the seed data always ends up in
// exactly the state described here, never a stale mix of two versions
// of this script.
//
// Nothing here touches anything you created by hand through the app --
// only rows tied to the fixed ids this file defines.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

// ---------------------------------------------------------------------
// .env.local isn't loaded automatically outside of `next dev` -- read
// the handful of keys we need ourselves rather than adding a dotenv
// dependency for it.
function loadEnvLocal() {
  let contents;
  try {
    contents = readFileSync(path.join(repoRoot, ".env.local"), "utf8");
  } catch {
    return; // fine -- the values might already be in the environment
  }
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY. Is .env.local present, and is " +
      "`supabase start` running?",
  );
  process.exit(1);
}

if (!SUPABASE_URL.includes("127.0.0.1") && !SUPABASE_URL.includes("localhost")) {
  console.error(
    `SUPABASE_URL (${SUPABASE_URL}) doesn't look local. Refusing to seed ` +
      "test data into what might be the live database.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------
// The two accounts.

const ADMIN_EMAIL = "admin@bookhub.test";
const ADMIN_PASSWORD = "bookhub-admin-pw";
const READER_EMAIL = "reader@bookhub.test";
const READER_PASSWORD = "bookhub-reader-pw";

// Only used the very first time each account is created. After that,
// the id already in the database wins -- see ensureAuthUser().
const ADMIN_ID_HINT = "11111111-1111-4111-8111-111111111111";
const READER_ID_HINT = "22222222-2222-4222-8222-222222222222";

// ---------------------------------------------------------------------
// The catalogue. Fixed ids so this script can find and wipe its own
// rows next time round. A few genres and reading levels, and three of
// the eight with no cover so the placeholder state actually shows up.

const BOOKS = [
  {
    id: "b0000000-0000-4000-8000-000000000001",
    title: "The Wind in the Willows",
    author: "Kenneth Grahame",
    pages: 259,
    summary: "Four animal friends and a river, a road, and a wild wood.",
    cover_url: "https://covers.openlibrary.org/b/isbn/9780141322549-L.jpg",
    genres: ["Adventure", "Classics"],
    reading_level: "Middle Grade",
    is_series: false,
  },
  {
    id: "b0000000-0000-4000-8000-000000000002",
    title: "The Lightning Thief",
    author: "Rick Riordan",
    pages: 375,
    summary: "A boy finds out the Greek gods are real, and one of them is his father.",
    cover_url: "https://covers.openlibrary.org/b/isbn/9780786838653-L.jpg",
    genres: ["Fantasy", "Adventure"],
    reading_level: "Middle Grade",
    is_series: true,
  },
  {
    id: "b0000000-0000-4000-8000-000000000003",
    title: "The Hunger Games",
    author: "Suzanne Collins",
    pages: 374,
    summary: "A televised fight to the death, and a girl who volunteers to take her sister's place.",
    cover_url: "https://covers.openlibrary.org/b/isbn/9780439023528-L.jpg",
    genres: ["Dystopian", "Adventure"],
    reading_level: "Young Adult",
    is_series: true,
  },
  {
    id: "b0000000-0000-4000-8000-000000000004",
    title: "Speak",
    author: "Laurie Halse Anderson",
    pages: 198,
    summary: "A freshman stops speaking after a summer party, and slowly finds her voice again.",
    cover_url: null,
    genres: ["Contemporary", "Drama"],
    reading_level: "Young Adult",
    is_series: false,
  },
  {
    id: "b0000000-0000-4000-8000-000000000005",
    title: "The Book Thief",
    author: "Markus Zusak",
    pages: 552,
    summary: "A girl in Nazi Germany steals books, narrated by Death itself.",
    cover_url: "https://covers.openlibrary.org/b/isbn/9780375842207-L.jpg",
    genres: ["Historical Fiction", "War"],
    reading_level: "Young Adult",
    is_series: false,
  },
  {
    id: "b0000000-0000-4000-8000-000000000006",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    pages: 432,
    summary: "Five sisters, a ballroom, and a great deal of misjudged first impressions.",
    cover_url: "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg",
    genres: ["Classics", "Romance"],
    reading_level: "Adult",
    is_series: false,
  },
  {
    id: "b0000000-0000-4000-8000-000000000007",
    title: "Educated",
    author: "Tara Westover",
    pages: 334,
    summary: "A childhood off the grid in Idaho, and the long road to a classroom.",
    cover_url: null,
    genres: ["Memoir", "Nonfiction"],
    reading_level: "Adult",
    is_series: false,
  },
  {
    id: "b0000000-0000-4000-8000-000000000008",
    title: "Where the Crawdads Sing",
    author: "Delia Owens",
    pages: 384,
    summary: "A girl raises herself in the marshes of North Carolina, and becomes a murder suspect.",
    cover_url: null,
    genres: ["Mystery", "Literary Fiction"],
    reading_level: "Adult",
    is_series: false,
  },
];

// Titles used for the two seed book requests -- kept separate from
// BOOKS above (a pending request for a book that's already in the
// catalogue doesn't make sense) and used to find-and-wipe them next run.
const REQUEST_TITLES = ["The Name of the Wind", "Diary of a Wimpy Kid"];

// ---------------------------------------------------------------------

async function findAuthUserByEmail(email) {
  const perPage = 200;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listing users: ${error.message}`);
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) return null;
  }
}

/** Reuses the account if the email already exists; otherwise creates it
 *  confirmed, via the Admin API. Returns the real user, whose id may
 *  not match idHint if the account already existed under a different
 *  one -- everything downstream uses the id this returns, never the
 *  hint. */
async function ensureAuthUser({ idHint, email, password }) {
  const existing = await findAuthUserByEmail(email);
  if (existing) {
    console.log(`  ${email} already exists (${existing.id}) -- reusing`);
    return existing;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    id: idHint,
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`creating ${email}: ${error.message}`);
  console.log(`  created ${email} (${data.user.id})`);
  return data.user;
}

async function ensureProfile({ id, displayName, avatarColor }) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id, display_name: displayName, avatar_color: avatarColor }, { onConflict: "id" });
  if (error) throw new Error(`upserting profile for ${id}: ${error.message}`);
}

async function ensureSurvey({ userId, genres, readingLevel, preferredLength }) {
  const { error } = await supabase.from("surveys").upsert(
    {
      user_id: userId,
      genres,
      reading_level: readingLevel,
      preferred_length: preferredLength,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`upserting survey for ${userId}: ${error.message}`);
}

async function wipeContentData(userIds) {
  const bookIds = BOOKS.map((b) => b.id);

  // Order doesn't strictly matter -- books/lists cascade their children
  // in the schema -- but deleting the leaves first keeps this readable
  // and doesn't rely on cascade behaviour to do the right thing.
  await mustNotError(
    supabase.from("reports").delete().in("reporter_id", userIds),
    "wiping reports",
  );
  await mustNotError(
    supabase.from("reviews").delete().in("user_id", userIds),
    "wiping reviews",
  );
  await mustNotError(
    supabase.from("reading_status").delete().in("user_id", userIds),
    "wiping reading_status",
  );
  await mustNotError(
    supabase.from("lists").delete().in("user_id", userIds), // cascades list_books
    "wiping lists",
  );
  await mustNotError(
    supabase.from("book_requests").delete().in("title", REQUEST_TITLES), // cascades voters
    "wiping book_requests",
  );
  await mustNotError(
    supabase.from("books").delete().in("id", bookIds),
    "wiping books",
  );
}

async function mustNotError(promise, what) {
  const { error, ...rest } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return rest;
}

async function main() {
  console.log("Seeding local BookHub data...\n");

  console.log("Accounts:");

  // admin_emails first: handle_new_user only grants is_admin to an
  // address already on this list at the moment the account is created.
  await mustNotError(
    supabase
      .from("admin_emails")
      .upsert({ email: ADMIN_EMAIL, note: "Local seed admin (scripts/seed-local.mjs)" }, { onConflict: "email" }),
    "adding admin@bookhub.test to admin_emails",
  );

  const adminUser = await ensureAuthUser({
    idHint: ADMIN_ID_HINT,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const readerUser = await ensureAuthUser({
    idHint: READER_ID_HINT,
    email: READER_EMAIL,
    password: READER_PASSWORD,
  });

  // Belt and braces: if the admin account already existed from before
  // admin_emails had this address (e.g. an interrupted first run),
  // promote it directly rather than requiring a fresh signup.
  await mustNotError(
    supabase.from("user_roles").update({ is_admin: true }).eq("user_id", adminUser.id),
    "promoting admin account",
  );

  await ensureProfile({ id: adminUser.id, displayName: "Local Admin", avatarColor: "Purple" });
  await ensureProfile({ id: readerUser.id, displayName: "Local Reader", avatarColor: "Lime" });

  await ensureSurvey({
    userId: adminUser.id,
    genres: ["Fantasy", "Mystery"],
    readingLevel: "Adult",
    preferredLength: "400–600 pages",
  });
  await ensureSurvey({
    userId: readerUser.id,
    genres: ["Adventure", "Fantasy", "Dystopian"],
    readingLevel: "Young Adult",
    preferredLength: "Any",
  });

  console.log("\nCatalogue and activity:");

  await wipeContentData([adminUser.id, readerUser.id]);

  await mustNotError(
    supabase.from("books").insert(BOOKS.map((b) => ({ ...b, source: "manual", added_by: adminUser.id }))),
    "inserting books",
  );
  console.log(`  ${BOOKS.length} books`);

  const bookId = (i) => BOOKS[i].id;

  await mustNotError(
    supabase.from("reading_status").insert([
      { user_id: readerUser.id, book_id: bookId(0), status: "read" },
      { user_id: readerUser.id, book_id: bookId(1), status: "reading", progress: "halfway" },
      { user_id: readerUser.id, book_id: bookId(3), status: "want" },
      { user_id: readerUser.id, book_id: bookId(6), status: "read" },
      { user_id: adminUser.id, book_id: bookId(5), status: "reading", progress: "started" },
    ]),
    "inserting reading_status",
  );
  console.log("  5 reading-tracker rows");

  const { data: reviewRows } = await mustNotError(
    supabase
      .from("reviews")
      .insert([
        // Every row needs the same keys -- PostgREST builds one bulk
        // insert from the union of columns across the array and sends
        // an explicit NULL for any row missing one, which would blow
        // through `status`'s NOT NULL default rather than using it.
        { book_id: bookId(0), user_id: readerUser.id, stars: 5, text: "Read this every autumn. Still holds up.", status: "allowed" },
        { book_id: bookId(2), user_id: readerUser.id, stars: 4, text: "Could not put it down, even knowing what happens.", status: "allowed" },
        {
          book_id: bookId(4),
          user_id: readerUser.id,
          stars: 2,
          text: "Seed data: a review in the 'deleted' moderation state, to test the admin queue.",
          status: "deleted",
        },
      ])
      .select("id"),
    "inserting reviews",
  );
  console.log(`  ${reviewRows.length} reviews`);

  const { data: listRows } = await mustNotError(
    supabase
      .from("lists")
      .insert([
        { user_id: readerUser.id, name: "Summer Favourites", slug: "summer-favourites-seed", is_public: true },
        { user_id: readerUser.id, name: "Want to Reread", slug: "want-to-reread-seed", is_public: false },
      ])
      .select("id, name"),
    "inserting lists",
  );
  const listId = (name) => listRows.find((l) => l.name === name).id;

  await mustNotError(
    supabase.from("list_books").insert([
      { list_id: listId("Summer Favourites"), book_id: bookId(0) },
      { list_id: listId("Summer Favourites"), book_id: bookId(2) },
      { list_id: listId("Summer Favourites"), book_id: bookId(5) },
      { list_id: listId("Want to Reread"), book_id: bookId(1) },
      { list_id: listId("Want to Reread"), book_id: bookId(4) },
    ]),
    "inserting list_books",
  );
  console.log(`  ${listRows.length} lists, 5 list entries`);

  const { data: requestRows } = await mustNotError(
    supabase
      .from("book_requests")
      .insert([
        {
          title: "The Name of the Wind",
          author: "Patrick Rothfuss",
          note: "Heard so much about this one -- any chance we can get it added?",
        },
        {
          title: "Diary of a Wimpy Kid",
          author: "Jeff Kinney",
        },
      ])
      .select("id"),
    "inserting book_requests",
  );
  await mustNotError(
    supabase
      .from("book_request_voters")
      .insert(requestRows.map((r) => ({ request_id: r.id, user_id: readerUser.id }))),
    "inserting book_request_voters",
  );
  console.log(`  ${requestRows.length} book requests`);

  await mustNotError(
    supabase.from("reports").insert([
      {
        reporter_id: readerUser.id,
        type: "bad_language",
        target_type: "review",
        target_id: reviewRows[2].id,
        note: "Seed data: routine report, to test the ordinary moderation queue.",
      },
      {
        reporter_id: readerUser.id,
        type: "safety_concern",
        target_type: "user",
        target_id: adminUser.id,
        note: "Seed data: flags the Safeguarding queue so it isn't empty locally.",
      },
    ]),
    "inserting reports",
  );
  console.log("  2 reports (1 routine, 1 safety_concern)");

  console.log("\nDone. Sign in at http://localhost:3000/login with:\n");
  console.log(`  Admin:  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  Reader: ${READER_EMAIL} / ${READER_PASSWORD}`);
  console.log("\nBoth are pre-confirmed and past onboarding. Run this script again any time --");
  console.log("the catalogue and activity get wiped and rebuilt; the accounts are reused.");
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message ?? err);
  process.exit(1);
});
