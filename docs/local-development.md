# Working on this locally

Your machine runs its own copy of the database. It shares nothing with
the live site.

That matters more than it sounds. Signing up while testing creates an
account in *your* database, not a real one. Deleting everything to start
again costs nothing. And a migration that turns out to be wrong breaks
your copy, which you can throw away, rather than the site people use.

---

## What you need

- **Docker**, running. The local database lives inside it.
- **The Supabase CLI** (`supabase --version` to check).

---

## Starting up

Two commands, in two terminals.

```bash
supabase start     # the database, auth, and a fake inbox
npm run dev        # the website
```

The first one takes a minute the first time and a few seconds after
that. It prints a block of URLs and keys — you can ignore all of it,
because `.env.local` already has what the app needs.

Then:

| What | Where |
|---|---|
| The site | http://localhost:3000 |
| The data, as tables you can click through | http://localhost:54323 |
| **Emails the site "sent"** | http://localhost:54324 |

That third one is the good bit.

---

## Emails go to a fake inbox

Nothing is really sent. Every confirmation and password-reset email
lands at **http://localhost:54324**, where you open it and click the
link like a normal person.

Two things follow:

- **No rate limit.** The live project only sends a handful of emails an
  hour, and it is easy to run out while testing. Here there is no limit
  at all.
- **You can test with any address.** `someone@example.com` works fine.
  Nothing leaves your machine.

---

## Confirming an email works the same way here

The live project makes people confirm their address before they can sign
in, and so does this one — `enable_confirmations = true` in
`supabase/config.toml`.

That is deliberate, and worth leaving alone. With it off, signing up
locally would log you straight in, and the entire confirmation flow —
the "check your email" screen, the link handler, the first sign-in —
would never run on your machine. The only place it ran would be
production, which is the worst place to find out it is broken.

---

## Changing the database

Never edit the live database by hand. Write a migration, try it locally,
then apply it.

```bash
# 1. make an empty migration file
supabase migration new what_you_are_doing

# 2. write the SQL in the file it just made, under supabase/migrations/

# 3. wipe your local database and rebuild it from every migration
supabase db reset
```

`db reset` is the important one. It throws your local data away and
replays every migration from nothing, which is exactly what will happen
on a database that has never seen them. If it works after a reset, the
migration is sound.

Once it is right, commit it. Applying it to the live database is a
separate step — see `docs/deployment.md`.

---

## Filling it with something to look at

A fresh database is empty, which makes it hard to actually look at the
site. Run:

```bash
node scripts/seed-local.mjs
```

It creates two real accounts to sign in as -- an admin and an ordinary
reader -- plus a small catalogue and some activity to go with them:
reviews, reading-tracker entries, a couple of lists, a couple of book
requests, and a couple of reports (including one on the Safeguarding
queue, so that isn't empty either). It prints both logins when it's
done; by default they're `admin@bookhub.test` / `bookhub-admin-pw` and
`reader@bookhub.test` / `bookhub-reader-pw`.

These are real Supabase accounts, made the same way signing up through
the app makes one, not rows inserted by hand. That matters: there is no
dev "fake login" any more, so this script is how you get a signed-in
admin and a signed-in reader to test as, without typing a survey out by
hand every time.

Run it as often as you like. It reuses the two accounts if they already
exist, and wipes and rebuilds everything else -- the catalogue, reviews,
lists, requests, reports -- so you always get back to the same known
state rather than a pile-up of old test data.

**If everything comes back "permission denied for table ..."**, see the
`auto_expose_new_tables` note in `supabase/config.toml` just below.

---

## Why `auto_expose_new_tables` is set in `supabase/config.toml`

Supabase used to expose every table in `public` to the API automatically.
It doesn't any more -- a table now has to opt in, or nothing can read or
write it, and every request comes back "permission denied". Our
migrations were written for the old behaviour and never grant table
access themselves, so a database built from nothing -- a fresh
`supabase db reset`, or anyone setting the project up for the first
time -- would hit that wall on every table, seed script included.
`auto_expose_new_tables = true` turns the old behaviour back on so that
keeps working.

That setting is temporary -- Supabase has said it will stop reading it
on **2026-10-30**. The real fix is a migration that grants the tables
explicitly, the way production will eventually need to. We're deferring
that on purpose: it's a production-affecting change, worth doing
carefully and not as a side effect of a local dev fix.

---

## Stopping

```bash
supabase stop
```

Your data survives. `supabase stop --no-backup` throws it away instead,
which is sometimes what you want.

---

## If something looks wrong

**The site loads but nothing has any data.** Expected. Your local
database starts empty — no books, no accounts. The live site's content
is not here. Sign up and add things.

**"Failed to fetch" or connection errors.** `supabase start` is probably
not running, or Docker is not. Check Docker is up, then run it again.

**Signup says the email is invalid.** The live project rejects obviously
fake domains like `example.com`. Locally it does not. If you see this,
you are pointed at the live database — check `.env.local`.

**You are not sure which database you are on.** Look at
`SUPABASE_URL` in `.env.local`. `127.0.0.1` is yours.
Anything ending `.supabase.co` is the live one.

---

## Pointing at the live database on purpose

Sometimes you need to, usually to look at something that only happens
with real data. Change the two Supabase values in `.env.local` to the
ones from Vercel, and **change them back afterwards**.

While they are changed there is no safety net. Signing up creates a real
account. Deleting something deletes it for everyone.
