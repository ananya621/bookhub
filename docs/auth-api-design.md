# Signup, verification and survey — proposed API and schema

Covers `/signup`, `/profile/setup`, `/survey`, `/verify`, plus `/login` and
password reset, since they share the same tables.

Grounded in the ported screens and the export's handlers. Supabase behaviour
checked against the docs rather than recalled — the two findings that change
the design are in **Two things Supabase decides for us** below.

---

## 1. What Supabase owns, and what we own

`auth.users` is Supabase-managed. We never write to it directly — the docs are
explicit that direct SQL inserts leave rows in a broken state and surface later
as `Database error saving new user`. Everything we add hangs off it by id.

It already holds: `id`, `email`, `encrypted_password`, `email_confirmed_at`,
`banned_until`, `last_sign_in_at`, `created_at`.

### Two things Supabase decides for us

**The 6-digit code needs a template change.** Our `/verify` screen takes a
6-digit numeric code. Supabase's default confirm-signup email sends
`{{ .ConfirmationURL }}` — a magic link, no code. A template containing
`{{ .Token }}` renders a 6-digit OTP instead, which is then verified with
`supabase.auth.verifyOtp(...)`. So the "Confirm signup" template has to be
changed, or `/verify` has nothing to accept.

> Confirm the exact `type` argument against the `verifyOtp` reference when
> implementing. `'signup'` is the signup type; the docs' custom confirm-page
> example passes `'email'`. One of the two, worth 30 seconds to check.

**Banning is already built.** `auth.users.banned_until`, set via
`auth.admin.updateUserById(id, { ban_duration })`. Supabase refuses
authentication for a banned user itself. That is exactly the lockout model we
chose, so the admin ban button becomes one admin API call and needs no custom
enforcement anywhere.

**Do not duplicate verification state.** `email_confirmed_at IS NOT NULL` is
the single source of truth for "verified". A `verified` boolean of our own
would drift.

---

## 2. Tables

### `public.profiles` — 1:1 with `auth.users`

```sql
create extension if not exists citext;

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  citext unique,                    -- null until the profile step
  avatar_color  text not null default 'Blue'
                check (avatar_color in ('Red','Orange','Yellow','Lime','Blue','Purple','Pink')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

`citext`, not `text`: the export lowercases before testing its taken-names
list, so `Maya` and `maya` must collide. A plain unique index on `text` would
let both exist and break the availability check.

`display_name` is nullable because signup happens before the profile step —
the account exists for a moment with no name. The seven `avatar_color` values
are the export's palette.

### `public.user_roles` — deliberately its own table

```sql
create table public.user_roles (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false
);
```

`is_admin` is **not** on `profiles`, on purpose. The UPDATE policy that lets a
user rename themselves would otherwise also let them set their own
`is_admin`. Column-level grants can stop that, but they are easy to get wrong
and easy to lose in a later migration. A table with no user-facing write policy
at all cannot be got wrong. Admin is granted by SQL or the service role.

### `public.surveys` — 1:1 with a profile

```sql
create table public.surveys (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  genres           text[] not null default '{}',
  reading_level    text not null
                   check (reading_level in ('Middle Grade','Young Adult','Adult')),
  preferred_length text not null
                   check (preferred_length in
                     ('Under 200 pages','200–400 pages','400–600 pages','600+ pages','Any')),
  updated_at       timestamptz not null default now()
);

create index surveys_genres_idx on public.surveys using gin (genres);
```

Two things that will bite if missed:

- **`'Any'` must be in the length constraint.** It is the fifth option, "I
  don't mind", and it is not one of the four `allLengths` values. A constraint
  built from `allLengths` alone rejects a valid survey.
- **`genres` may contain `'Other'`**, which is likewise not in `allGenres` —
  the survey concatenates it locally. Either allow free text (as above) or
  constrain against the list plus `'Other'`.

`text[]` with a GIN index rather than a join table: the only query is genre
overlap for recommendations (`genres && survey.genres`), which GIN serves
directly. A join table would normalise better and is the right call if genres
ever need their own attributes; they don't yet.

`reading_level` is safeguarding-relevant, not cosmetic — the survey screen
shows an age warning when Young Adult or Adult is picked, and the level should
gate what gets recommended.

### `public.reserved_names`

```sql
create table public.reserved_names (
  name   citext primary key,
  reason text
);
-- seed: bookhub, moderator, support, admin, official
```

Names that impersonate the site. The export keeps these separate from
profanity, and so should we — they produce a different message.

Profanity stays in a **function**, not a table, because the hard part is the
folding (homoglyphs, leetspeak, collapsed repeats), which is code. The export
keeps two lists for a reason worth preserving:

- `alwaysBad` — matched anywhere inside a word
- `wholeWords` — rejected only when they *are* the word

Its own comment explains why: substring matching alone creates the Scunthorpe
problem, and a filter that rejects real words teaches children the product is
broken.

### The signup trigger

```sql
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_roles (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Keep it this small. A trigger that throws here fails the whole signup
transaction and shows up as `Database error saving new user`, which reads like
a Supabase fault rather than our bug.

---

## 3. Onboarding step should be derived, not stored

The persona fixtures currently carry `onboardingStep` as a field. For the real
thing, **don't store it** — every input already exists:

```
display_name is null        -> 'profile'
no surveys row              -> 'survey'
email_confirmed_at is null  -> 'verify'
otherwise                   -> null (done)
```

A stored column is a fourth copy of state derived from the other three, and it
desyncs the first time someone verifies out of band or an update misses a step.
Derive it in `getCurrentUser()`.

The order matches the export's real handler chain (profile → survey → verify,
verified at source lines 1916 / 1976 / 2002), and it produces the same
`CurrentUser` shape `lib/auth.ts` already exports — so this swaps the body of
`getCurrentUser()` and changes nothing else.

---

## 4. RLS

Route guards are UX. These are the enforcement.

| Table | select | insert | update | delete |
|---|---|---|---|---|
| `profiles` | any authenticated user | trigger only | own row | — |
| `user_roles` | own row | — | — | — |
| `surveys` | own row | own row | own row | — |
| `reserved_names` | via function only | — | — | — |

`profiles` is readable by all signed-in users on purpose: display name and
avatar colour appear on every review. They are public by design. Nothing
private belongs on that table — email lives in `auth.users`, which is not
exposed.

`user_roles` has no write policy for anyone. That is the point.

---

## 5. API surface

Server Actions for the mutations, since these are all form submissions and it
avoids inventing a REST surface we would only call from our own forms. One
route handler for the availability check, because it fires on keystroke rather
than submit.

Error strings below are the exact copy already in the ported screens.

### `checkDisplayName(candidate)` → `GET /api/display-name?q=`

Returns one of `short | banned | reserved | taken | available`.

Backed by a `security definer` function so the client never reads
`reserved_names` or enumerates `profiles` directly. Client already debounces
700ms and drops stale responses by sequence number — keep both.

This inherently confirms whether a name is taken; that is unavoidable in any
availability checker and acceptable, since display names are public anyway.

### `signUp(email, password)` — `/signup`

1. `email` contains `@` → else `ENTER A VALID EMAIL ADDRESS`
2. `password.length >= 8` → else `PASSWORD NEEDS AT LEAST 8 CHARACTERS`
3. `supabase.auth.signUp({ email, password })` — trigger creates the rows,
   Supabase sends the OTP email
4. → `/profile/setup`

### `saveProfile(displayName, avatarColor)` — `/profile/setup`

1. non-empty → else `PICK A DISPLAY NAME FIRST`
2. **re-run the full check server-side** → else `THAT NAME WON'T WORK — SEE ABOVE`
3. `update profiles set display_name, avatar_color`
4. → `/survey`

Step 2 is not redundant. The debounced check is a hint for the UI; the unique
index and this re-check are what actually hold, and they close the race where
two people claim a name between keystroke and submit.

### `saveSurvey(genres, readingLevel, preferredLength)` — `/survey`

1. `upsert surveys` on `user_id`
2. → `/verify` if `email_confirmed_at is null`, else `/home`

Upsert, not insert: the same screen is reachable later from *Edit my answers*
on `/profile`.

### `verifyEmail(token)` — `/verify`

1. six digits → else `ENTER THE 6-DIGIT CODE FROM YOUR EMAIL`
2. `supabase.auth.verifyOtp({ email, token, type })` (see §1)
3. → `/home`

Nothing of ours to update: Supabase sets `email_confirmed_at`, and the
unverified banner and both verify gates read from that.

### `resendCode()` — `/verify`

`supabase.auth.resend({ type: 'signup', email })`. Supabase rate-limits this;
surface its error rather than adding our own counter.

### `signIn(email, password)` — `/login`

`EMAIL OR PASSWORD DIDN'T MATCH` for every ordinary failure — never
distinguish "no such account" from "wrong password", or the form becomes an
email enumerator.

**One deliberate exception:** a banned account should get its own message, not
the generic one. Supabase returns a distinguishable error for `banned_until`.
Telling a child their account is suspended, rather than implying they typed
their password wrong, is the kinder and more honest behaviour, and the ban is
already visible to them by email.

### `requestReset(email)` — `/reset`

1. non-empty and valid → else `ENTER THE EMAIL YOU SIGNED UP WITH`
2. `supabase.auth.resetPasswordForEmail(email)`
3. Show *Check your email* **whether or not the account exists** — same
   enumeration reason as login.

### `setNewPassword(password, confirm)` — `/reset/new`

1. equal → else `THE TWO PASSWORDS DON'T MATCH`
2. `length >= 8` → else `PASSWORD NEEDS AT LEAST 8 CHARACTERS`
3. `supabase.auth.updateUser({ password })`

### `signOut()`

`supabase.auth.signOut()`, clear cookies, → `/`.

---

## 6. Flow

```
/signup      signUp()                     auth.users + profiles + user_roles
   |                                      OTP email sent
/profile/setup  checkDisplayName() xN
                saveProfile()             profiles.display_name, avatar_color
   |
/survey      saveSurvey()                 surveys row
   |
/verify      verifyEmail()                auth.users.email_confirmed_at
   |
/home
```

A user who abandons midway is picked up by the derived step in §3 and returned
to the right screen — which is what `proxy.ts` already does with the persona
fixtures.

---

## 7. Decisions

- **OTP, not magic link.** Change the Confirm signup template to carry
  `{{ .Token }}` and verify with `verifyOtp`, so `/verify` keeps its 6-digit
  code screen as designed. Still worth checking `'signup'` vs `'email'` for
  the `type` argument against the reference when writing it.
- **Display names are unique.** `citext unique` on `profiles.display_name`
  stands, along with the availability check and the server-side re-check.
- **Age/consent deferred.** COPPA and GDPR-K are not being handled: this is a
  coursework project, not a service, and it is not collecting real users.

## 8. Why the coursework banner is load-bearing

Deferring the age question is reasonable *because* every page carries a notice
saying this is not a real service — `components/ProjectBanner.tsx`. The two
decisions are linked, so they should move together.

It sits in the root layout, not in `Nav`. `Nav` renders on nine screens, and
the ones it skips are the auth screens — signup, login, verify, reset — which
are precisely where someone is asked for an email and a password, and so
precisely where the notice has to appear.

It is not development-only, unlike the persona switcher. It matters most in
production, where someone can arrive without any of the surrounding context.

The copy asks people not to reuse a password rather than not to use a real
email, because Supabase has to deliver the OTP somewhere — a real address is
required for the flow to work at all. Password reuse is the risk that is
actually avoidable.

If this ever stops being coursework, the banner comes out and the age question
has to be answered first, in that order.

## 9. Still open

- **`email_change` and `reauthentication` templates** also default to link or
  OTP variants. Out of scope here, but they exist and will surprise us later.

- **The name filter misses `v` for `u`.** `fvck` comes back `available`. This
  is faithful — the export's `fold()` maps `vv` to `w` but never `v` to `u`,
  so the original allows it too. Confirmed against the live function:
  `vvanker` folds to `wanker` and is caught; `fvck` folds to `fvck` and is not.

  Worth fixing, but it is not a one-line change: the `vv` to `w` rule has to
  run *before* any `v` to `u` mapping, or `vvanker` folds to `uuanker` and the
  filter gets worse rather than better. The current order in `fold_name` is
  translate, then `vv`, so adding `v` to the translate map alone would break
  the case that currently works.

  Worth remembering what this filter is for: it stops a child picking an
  obviously offensive display name. It is not, and cannot be, a complete
  defence against someone determined to get one past it — reporting and
  moderation are what cover that.
