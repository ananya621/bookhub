# Deploying

How the site gets from your laptop to the internet.

The short version: you push to `main`, GitHub checks the code, applies any
new database changes, and then puts the new version live on Vercel. If any
step fails, the steps after it don't run, so a broken build never reaches
the live site.

Nothing in here happens until you do the setup below. Do the steps in
order — later ones need answers from earlier ones.

---

## What you need before you start

- The GitHub repo (`ananya621/bookhub`).
- A Vercel account.
- The Supabase project (`book hub`).

You do not need to install anything, except in one optional step where
`npx vercel link` is the easy way to find two ID numbers.

---

## Step 1 — Make the Vercel project

1. Go to [vercel.com](https://vercel.com) and log in.
2. On the dashboard, click **Add New…** → **Project**.
3. Under **Import Git Repository**, find `bookhub`. If you don't see it,
   click **Adjust GitHub App Permissions** and give Vercel access to the
   repo.
4. Click **Import**.
5. Leave the framework as **Next.js**. Don't change the build settings.
6. Don't add environment variables here yet. Click **Deploy**.

**Whatever that first deploy does, ignore it.** It may be skipped, it may
fail, or it may succeed and give you a broken-looking site — none of that
matters, because the settings it needs don't exist yet. The repo contains
a `vercel.json` that tells Vercel not to deploy on its own; see
[Why Vercel doesn't deploy by itself](#why-vercel-doesnt-deploy-by-itself)
at the end. Deploying is GitHub's job now, and the real first deploy
happens in Step 5.

What you actually needed from this step is the project itself, and its
web address.

### Find your web address

Go to the project → **Settings** → **Domains**. You will see something
like `bookhub-xyz.vercel.app`. **Write it down.** The next two steps both
need it.

In these instructions it is called `YOUR-SITE-URL`. Always write it with
`https://` in front and no slash on the end, like
`https://bookhub-xyz.vercel.app`.

### Set the Node version

Go to **Settings** → **General** → **Node.js Version** and set it to
**22.x**. The workflow files build with Node 22. If Vercel runs a different
version, you can get bugs that only appear on the live site.

---

## Step 2 — Add the environment variables in Vercel

These are settings the app reads while it runs. They live in Vercel, not
in the repo.

Go to the project → **Settings** → **Environment Variables**. Add these
four. For each one, tick **Production** *and* **Preview**.

| Name | Value | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Copy from your `.env.local` | Or: Supabase → **Project Settings** → **Data API** → **Project URL** |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Copy from your `.env.local` | Or: Supabase → **Project Settings** → **API Keys** → the publishable key |
| `NEXT_PUBLIC_SITE_URL` | `https://litconnect.io` | Your domain — see Step 3a |
| `GOOGLE_BOOKS_API_KEY` | Copy from your `.env.local` | Or: Google Cloud console → **APIs & Services** → **Credentials** |

The first two are safe to expose. They are sent to every visitor's browser
on purpose.

`GOOGLE_BOOKS_API_KEY` is different — treat it as private. Without it the
"suggest a book" search says it is not set up rather than failing
silently, so the site still works, but nobody can search for a book to
ask for. What actually protects the data is the row-level security
rules in the database, not these keys. They still belong in Vercel rather
than typed into the code, so the code works the same whichever project it
points at.

### `NEXT_PUBLIC_SITE_URL` — read this bit

This one is easy to get wrong and the damage is not obvious.

When someone signs up, the app asks Supabase to email them a confirmation
link. The app builds that link out of `NEXT_PUBLIC_SITE_URL`. On your
laptop that value is `http://localhost:3000`, which is correct there.

If you forget to set it on Vercel, the app falls back to
`http://localhost:3000` anyway. Real people would then be emailed a link
pointing at *their own* computer. It will not work. They can never
confirm their account, and nothing in the deploy logs will look wrong.

So: set it, set it to the real address, and set it for **Preview** as
well as Production. Preview deploys each get their own random address, so
pointing them at the production site is the sensible choice — someone
signing up from a preview still ends up confirmed on the real site.

---

## Step 3a — Point litconnect.io at the site

You own the domain; this tells Vercel to answer for it.

1. Vercel → your project → **Settings** → **Domains**
2. Type `litconnect.io` and press **Add**
3. Add `www.litconnect.io` too, and set it to redirect to the bare domain
4. Vercel then shows you the DNS records it wants

Now go to wherever you bought the domain and add those records. It is
usually one of these two shapes:

| Record | Name | Points at |
|---|---|---|
| `A` | `@` | the IP address Vercel shows you |
| `CNAME` | `www` | `cname.vercel-dns.com` |

Vercel tells you the exact values — use those rather than anything you
read elsewhere, because they do change.

Then wait. DNS updates spread across the internet slowly; usually minutes,
occasionally a couple of hours. Vercel's Domains page shows a tick when it
has worked, and issues the certificate for `https://` on its own.

**Do not set `NEXT_PUBLIC_SITE_URL` to the domain until that tick
appears.** Until then the domain does not answer, so confirmation emails
would point somewhere that does not load. Use the `.vercel.app` address
Vercel gave you in Step 1 in the meantime, and switch it over afterwards.

---

## Step 3 — Tell Supabase about the new address

Supabase will not send people to an address it doesn't recognise. Right
now it only knows about `localhost`.

Add **both** the `.vercel.app` address and `https://litconnect.io`, so
the site keeps working while the domain is still propagating and after it
has finished.

1. Go to your Supabase project.
2. **Authentication** → **URL Configuration**.
3. Set **Site URL** to `YOUR-SITE-URL`.
4. Under **Redirect URLs**, click **Add URL** and add both of these:
   - `YOUR-SITE-URL/auth/confirm`
   - `YOUR-SITE-URL/auth/confirm?next=/reset/new`
5. Leave the existing `http://localhost:3000` entries alone, so local
   development keeps working.

The second entry is for the password reset email, which comes back to the
same page but with something extra on the end of the address. The list is
matched against the whole address, so the plain entry on its own may not
cover it. Adding both is the safe option. (If you would rather have one
entry, `YOUR-SITE-URL/auth/confirm**` covers both — but Supabase
recommends listing exact addresses in production, so two entries is the
better habit.)

If you skip this, signup emails will be sent, but clicking the link gives
an error instead of signing the person in.

> **Also worth knowing:** Supabase's built-in email sending is rate
> limited to a handful of messages per hour. It is meant for testing. If
> signups start silently failing to arrive, that limit is the usual
> reason. Sending more needs your own email provider set up under
> **Authentication** → **Emails** → **SMTP Settings**.

---

## Step 4 — Add the secrets in GitHub

These are the passwords and tokens the workflow needs. GitHub keeps them
hidden and hides them from the logs.

Go to the repo → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**. Add all five.

### `VERCEL_TOKEN`

Lets GitHub deploy on your behalf.

Vercel → click your avatar (top right) → **Account Settings** → **Tokens**
→ **Create Token**. Give it a name like `github-actions`. Set the scope to
your account. Create it, then **copy it straight away** — Vercel only
shows it once.

### `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`

Tell the Vercel command line which account and which project to deploy to.

The easiest way to get both, in a terminal in the project folder:

```bash
npx vercel link
```

Answer the questions and pick the project you made in Step 1. It writes a
file called `.vercel/project.json`. Open it:

```bash
cat .vercel/project.json
```

`orgId` is `VERCEL_ORG_ID`. `projectId` is `VERCEL_PROJECT_ID`. The
`.vercel` folder is already ignored by git, so it will not get committed.

If you would rather not use the terminal: `VERCEL_PROJECT_ID` is on the
project's **Settings** → **General** page, near the bottom, as **Project
ID**. `VERCEL_ORG_ID` is on your **Account Settings** → **General** page
as your team or user ID.

### `SUPABASE_ACCESS_TOKEN`

Lets GitHub log in to Supabase.

Supabase → click your avatar (top right) → **Account Settings** →
**Access Tokens** → **Generate new token**. Name it something like
`github-actions`. Copy it straight away — this one is also only shown
once.

### `SUPABASE_DB_PASSWORD`

The database's own password. Needed to apply migrations.

This is the password that was chosen when the Supabase project was first
created. If you have it written down, use that.

If you don't have it, you can set a new one: Supabase project →
**Settings** → **Database** → **Database password** → **Reset database
password**. Copy the new one into the GitHub secret.

> Resetting the password breaks anything else that was using the old one.
> For this project that is unlikely to be a problem, but check before you
> reset if you have connected any other tool.

### What is *not* a secret

The project reference `vzznwebsaielxpsscwlw` is written directly into the
workflow files. That is deliberate — it is the same string that appears in
the Supabase dashboard URL and inside `NEXT_PUBLIC_SUPABASE_URL`, which
every visitor's browser already receives. It is an address, not a key.

---

## Step 5 — Do the first deploy

Go to the repo → **Actions** tab → **Deploy** in the left sidebar → **Run
workflow** → **Run workflow**.

Watch it run. It takes a few minutes. When it goes green, open
`YOUR-SITE-URL`.

On this first run the migrations stage will say **"Remote database is up
to date."** and finish in seconds. That is correct, not a failure —
every migration in `supabase/migrations/` has already been applied to the
database by hand, so there is nothing left to do. The stage only does
work when you add a new `.sql` file.

Then test the thing most likely to be broken: sign up with a real email
address you can check, and confirm the link in the email points at
`YOUR-SITE-URL` and not at `localhost`.

---

## What happens when you push

Every push to `main` — including merging a pull request — runs the
**Deploy** workflow. It has three stages, and each only starts if the one
before it passed.

**1. Checks.** Installs the packages, generates the route types, runs the
typechecker, runs the linter, and builds the app. This stage needs no
secrets at all, so it works even if you have not finished the setup above.

**2. Database migrations.** Applies any new `.sql` files in
`supabase/migrations/` to the Supabase database. It first prints the list
of what it is about to apply, then applies it.

**3. Deploy.** Builds the app again, this time with the real production
settings pulled from Vercel, and puts it live.

The order is on purpose. The database changes first, the app second. If a
new page reads a new column, that column has to exist before the page goes
live, or the page breaks for everyone in the gap between the two.

### The tradeoff in that order

Because the database goes first, there is a short window — usually a
minute or two — where the **new** database is being used by the **old**
app. Almost always that is fine. It stops being fine if a migration
removes or renames something the old app still uses.

So, the rule to follow when writing migrations:

- **Adding** things is safe. New tables, new columns, new functions.
- **Removing or renaming** things is not. Do it in two separate merges:
  first ship the app change that stops using the old column, then, in a
  later merge, ship the migration that drops it.

There is a second consequence. If stage 3 fails after stage 2 succeeded,
the database has moved forward but the app has not. The old app keeps
serving traffic. If you have followed the rule above, the old app still
works fine against the newer database, and you can simply fix the problem
and push again. This is the main reason the checks in stage 1 include a
full build: it means we already know the code compiles before we touch the
database.

Migrations are not undone automatically, and the workflow deliberately
does not try. Guessing at how to reverse a half-finished schema change is
more dangerous than leaving it alone. If a migration fails, read
[When a deploy fails](#when-a-deploy-fails) below.

---

## Pull requests

Opening a pull request against `main` runs the **Preview** workflow:

- the same checks as above;
- a **dry run** of the migrations, which prints what *would* be applied if
  you merged, without applying anything;
- a preview deployment on its own URL, posted as a comment on the pull
  request.

Two things to know about previews:

**Previews use the real database.** There is only one Supabase project.
Anything you create, edit or delete while clicking around a preview is
real, and everyone else sees it. Be careful with the admin pages.

**A preview does not include that pull request's migrations.** They are
only applied when you merge. So if your branch adds a new column and a
page that reads it, the preview of that page will error. That is expected.
The dry-run output tells you which migrations are waiting.

---

## When a deploy fails

You will get an email from GitHub. You can also check the **Actions** tab:
a red cross next to a run means it failed.

Click the failed run, then click the job with the red cross, then click
the step with the red cross to see the output. The last few lines are
usually the actual error.

Which stage failed tells you what state things are in:

### "Checks" failed

**The live site is untouched.** Nothing was deployed and the database was
not changed. This is the safe failure.

- *Typecheck or lint errors* — fix them and push again. You can see the
  same errors on your own machine with `npx tsc --noEmit` and
  `npx eslint`. If the typecheck complains it cannot find `LayoutProps` or
  `PageProps`, run `npx next typegen` first; those types are generated by
  Next, not written by hand.
- *Build errors* — reproduce with `npm run build`.

### "Database migrations" failed

**The live site is untouched**, still running the previous version.

The database may be partly changed. If your push contained three
migration files and the second one failed, the first one has already been
applied and is still there. Don't assume the database is back how it
started — check.

1. Read the error. It is Postgres's own message, usually near the end.
2. Find out what actually got applied:

   ```bash
   supabase migration list
   ```

   That prints your local migration files next to the ones the database
   has recorded, so you can see exactly where it stopped.
3. Fix the `.sql` file and push again. Migrations that already succeeded
   are skipped, so re-running is safe.

If the failed file had already done some of its work before erroring, you
may need to tidy that up by hand in the Supabase SQL editor before the
retry will succeed.

### "Found local migration files to be inserted before the last migration"

This one has its own error message, and it is worth recognising. It means
one of your new `.sql` files has a timestamp *older* than a migration that
is already applied. It usually happens when you wrote a migration, someone
else's got merged first, and yours is now out of order.

Nothing has been applied. The job stops before changing anything.

The CLI will suggest re-running with `--include-all`. You have two
choices:

- **Rename the file** so its timestamp is newer than everything already
  applied. This is usually the right fix. The number at the front is just
  `YYYYMMDDHHMMSS` — pick a time later than the last applied migration.
- **Use `--include-all`**, which applies it anyway, out of order. Only do
  this if your migration genuinely does not depend on the ones that
  jumped ahead of it. Applying schema changes out of order is how you get
  a database that no longer matches what the files say it should be.

### "Deploy to Vercel" failed

**The live site is untouched**, but the database has already been
migrated. The old version of the app is still serving people.

- *An authentication or "not found" error* — one of `VERCEL_TOKEN`,
  `VERCEL_ORG_ID` or `VERCEL_PROJECT_ID` is wrong or expired. Redo Step 4.
- *A build error here that did not appear in stage 1* — almost always a
  missing environment variable. Stage 1 builds without them; this stage
  builds with the ones from Vercel. Check Step 2, and check each variable
  is ticked for **Production**.

Fix it and push again. There is nothing to undo.

### The deploy went green but the site is broken

The workflow only knows whether the build succeeded. It cannot tell
whether the app actually works.

Go to the Vercel dashboard → your project → **Logs** to see errors from
the running app.

To get the previous version back quickly: Vercel dashboard → your project
→ **Deployments** → find the last deployment that worked → the **…** menu
on the right → **Promote to Production**. That switches the live site back
in a few seconds.

**This does not undo database migrations.** If the broken deploy also
migrated the database, rolling the app back leaves the newer database in
place. This is exactly the situation the "only add, never remove" rule
above protects you from.

---

## Why Vercel doesn't deploy by itself

Normally, connecting a repo to Vercel makes Vercel deploy every push by
itself. We do not want that here, for one specific reason: Vercel's own
deploys would not wait for the checks or the migrations. A push would race
two deploys against each other, and the app could go live *before* the
database changes it depends on.

So `vercel.json` in the root of the repo contains:

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

That switches off Vercel's automatic deploys. Deploys still happen — they
are just driven by GitHub Actions, in the right order. This is the only
reason that file exists.

One side effect: you lose Vercel's own "Visit Preview" links on pull
requests. The Preview workflow posts its own comment with the link
instead.

---

## Optional things you might want later

**Make deploys wait for your approval.** Repo → **Settings** →
**Environments** → **New environment**, call it `production`, and add
yourself under **Required reviewers**. Then add `environment: production`
to the `deploy` job in `.github/workflows/deploy.yml`.

**Put the app nearer the database.** The Supabase project is in Sydney.
Vercel runs the app in Washington DC by default, so every page load
crosses the Pacific twice — and `proxy.ts` makes three database queries on
almost every request, so this is worth more than it sounds. You can change
it in **Settings** → **Functions** → **Function Region**, or by adding
`"regions": ["syd1"]` to `vercel.json`. Check your Vercel plan first;
choosing a region is not available on every plan.

**A separate database for previews.** The cleanest fix for previews
sharing the real data is a second Supabase project used only by previews,
with its URL and key set as the **Preview** environment variables in
Vercel. That is a bigger change and is not set up here.
