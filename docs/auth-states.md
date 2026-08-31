# Auth states — what changes per page

Derived from the export (`web-app-design-system/Prototype with Admin.dc.html`),
not invented. Source line numbers cited throughout.

## It's four states, not two

The design doesn't have a logged-in/logged-out binary. It has four, plus one
cross-cutting:

| State | Condition in export | Meaning |
|---|---|---|
| **Guest** | `guest: true` (line 1682) | No account. Can browse. |
| **Unverified** | `!guest && !verified` | Has an account, email not confirmed. Can browse *and track*, but nothing public. |
| **Verified** | `!guest && verified` | Full reader. |
| **Admin** | `isAdmin` on User | Everything above, plus `/admin`. |
| *Banned* | `banned` (cross-cutting) | Blocked from write actions; still reads. |

The unverified tier is the one that's easy to miss and it is explicitly
designed. The banner copy (line 73-79) states the rule:

> Your email isn't verified yet. **You can browse and track books — reviews and
> shared lists unlock once it is.**

So verification gates *public* output only (reviews, shared lists). Private
activity (shelves, lists, recommendations) works unverified.

## The gate cascade

Every gated action in the export runs the same four checks in this order
(line 2056-2064, the book page's `writeReview` is the full version):

```
guest?      → signup gate dialog   "Sign up to write a review"
banned?     → ban block
!verified?  → verify gate dialog   "Verify your email to post a review"
else        → perform the action
```

Order matters. A banned guest sees the signup gate, not the ban notice.

Two things follow from this that shape the implementation:

1. **Gates are dialogs, not redirects.** The export never bounces a guest to
   `/login`. It keeps them on the page and opens a dialog explaining what
   they'd get. The page behind stays readable.
2. **Nothing is hidden — it's intercepted.** Guests still *see* the reading
   status buttons and the review form entry. Clicking is what triggers the
   gate. Hiding the controls would remove the signup prompt the design uses
   them for.

## Screen-level guards

Six routes call `guard(screen, why)` — a guest clicking the nav link gets the
signup dialog with this reason instead of the page:

| Route | Gate copy |
|---|---|
| `/tracker` | Keep track of what you read |
| `/lists` | Build your own reading lists |
| `/recs` | See books picked for you |
| `/profile` | Save your reading preferences |
| `/requests` | Keep track of the books you ask for |
| `/requests/new` | Ask us to add a missing book |

## Action-level gates

Signup gates (`gate:`), all on the book page:

| Action | Gate copy |
|---|---|
| Set status Read / Reading / Want (×3) | Sign up to save what you read |
| Write a review | Sign up to write a review |
| Add to a list | Sign up to build reading lists |

Verify gates (`verifyGate:`) — logged in but unverified:

| Action | Gate copy |
|---|---|
| Post a review (line 2063) | Verify your email to post a review |
| Share a list (line 2104) | Verify your email to share a list |

## The unverified banner

Pink bar under the nav, on these seven screens only (line 1929):

`home`, `recs`, `search`, `book`, `tracker`, `lists`, `profile`

Not on auth screens, not on admin, not on the public shared-list view.

---

# Page by page

Legend: **G**uest · **U**nverified · **V**erified · **A**dmin.
"—" = route not available to that state.

## Global chrome

| Element | G | U | V | A |
|---|---|---|---|---|
| Nav bar (9 pages only, per `chrome` line 1886) | "Get Started" button | Avatar monogram | Avatar monogram | Avatar + **Admin** button (purple) |
| Unverified banner | — | Shown on 7 screens | — | — |
| Light/Dark toggle | ✓ | ✓ | ✓ | ✓ |

The Admin button appears in the reader nav (line 67-69) — admin isn't a
separate login, it's an extra control on the normal nav.

## Public pages — no account needed

### `/` Landing
| | G | U / V | A |
|---|---|---|---|
| Shown | Hero, "Find Your Next Book!", why-this-exists, 4 benefit cards | same | same |
| Actions | **Get Started** → `/start`, **Browse as guest** → `/search` | Should redirect to `/home` — a logged-in user has no use for the guest pitch | same as V |

**Change needed:** logged-in users hitting `/` should land on `/home`.

### `/search`
| | G | U | V | A |
|---|---|---|---|---|
| Shown | Query box, genre/length/level filters, results, pagination | + **reading-status badges** on results (`hasBadge`, line 1824) | same as U | same as U |
| Actions | Filter, paginate, open a book | same | same | same |

**Change needed:** `hasBadge`/`badgeLabel` (Read / Reading / Want to read) render
per result once there's a reading status to read. Currently not implemented —
`port-browse` flagged it as needing cross-page state.

### `/book/[id]`
The page with the most state-dependence.

| | G | U | V | A |
|---|---|---|---|---|
| Cover, summary, pages, genres, level | ✓ | ✓ | ✓ | ✓ |
| Other people's reviews | ✓ | ✓ | ✓ | ✓ |
| Status control (Read/Reading/Want) | visible, click → signup gate | **works** | works | works |
| Progress self-report | hidden (needs "reading" status) | works | works | works |
| Write a review | click → signup gate | click → **verify gate** | works | works |
| Your own review (edit/delete) | — | — | shown when `mine` (line 2038) | ✓ |
| Add to a list | click → signup gate | works | works | works |
| Report a review / reader | — | ✓ | ✓ | ✓ (plus can act on it) |

### `/lists/[slug]` Shared list (public view)
| | G | U / V | Owner |
|---|---|---|---|
| Shown | List name, books, owner | same | same |
| Footer CTA | **"Want a list like this? Make a free account"** + Get Started | Should not show the signup CTA | "Back to my lists" |

**Change needed:** the CTA is guest-only; members shouldn't be pitched signup.

### `/start`, `/signup`, `/login`, `/reset`, `/reset/new`
| | G | U / V / A |
|---|---|---|
| Access | ✓ the point of them | **Redirect away** — a logged-in user has no business on login/signup |

### `/not-found`
Public. No state difference.

## Onboarding — member only, and order-sensitive

Real order (verified against handlers at 1916 / 1976 / 2002):
`/start → /signup → /profile/setup → /survey → /verify → /home`

| Route | G | U | V |
|---|---|---|---|
| `/profile/setup` | redirect to `/signup` | ✓ step 2 | ✓ (re-editable from `/profile`) |
| `/survey` | redirect to `/signup` | ✓ step 3 | ✓ re-edit; CTA copy changes when `surveyEditing` |
| `/verify` | redirect to `/signup` | ✓ step 4 | **redirect to `/home`** — already done |

`/survey` is reachable two ways and the export changes its kicker/CTA for each
(onboarding vs "Edit my answers" from `/profile`). Currently hardcoded to the
onboarding copy.

## Account-gated pages — guard() redirects guests

### `/home`
| | G | U | V |
|---|---|---|---|
| Access | → landing + signup gate | ✓ | ✓ |
| Shown | — | Picked-for-you (from survey), Currently reading + progress, shelves | same |
| Actions | — | Open tracker, Mark as read, See all recommendations | same |

### `/recs`
| | G | U / V |
|---|---|---|
| Access | gate: "See books picked for you" | ✓ |
| Shown | — | Books scored against survey answers, **"MATCHED ON: …"** line |

**Change needed:** currently falls back to rating-sorted with a generic matched-on
line, because survey answers aren't readable cross-route.

### `/tracker`
| | G | U / V |
|---|---|---|
| Access | gate: "Keep track of what you read" | ✓ |
| Shown | — | Three shelves: Currently Reading / Want to Read / Read |
| Actions | — | Move book between shelves (`<select>`), remove |

### `/lists`
| | G | U | V |
|---|---|---|---|
| Access | gate: "Build your own reading lists" | ✓ | ✓ |
| Create / delete a list | — | ✓ | ✓ |
| Add/remove books | — | ✓ | ✓ |
| Public/private toggle | — | ✓ | ✓ |
| **Open share link** | — | **verify gate** — "Verify your email to share a list" | ✓ |

This is the sharpest unverified/verified split: you can build and mark a list
public, but you cannot open its share link until verified.

### `/profile`
| | G | U | V |
|---|---|---|---|
| Access | gate: "Save your reading preferences" | ✓ | ✓ |
| Reading preferences + Edit my answers | — | ✓ | ✓ |
| Public lists | — | ✓ (shown, not shareable) | ✓ |
| Book requests → `/requests` | — | ✓ | ✓ |
| Name & colour, Change password | — | ✓ | ✓ |
| Delete my account | — | ✓ | ✓ |
| **Verify-email prompt** | — | **shown** | hidden |

### `/requests`, `/requests/new`
| | G | U / V |
|---|---|---|
| Access | gates: "Keep track of…" / "Ask us to add…" | ✓ |
| Shown | — | Approved / declined (+reason) / pending requests |

### `/book/[id]/review`
| | G | U | V |
|---|---|---|---|
| Access | → signup gate | → **verify gate** | ✓ |
| Shown | — | — | Star picker, text area, post |

Reachable only through the book page's gated `writeReview`, so its own guard is
a backstop — but it must exist, since the URL is directly navigable.

## Admin — 9 pages

| | G / U / V | A |
|---|---|---|
| All of `/admin/*` | **404** (not 403 — don't reveal it exists) | ✓ |

`/admin`, `/admin/reviews`, `/admin/accounts`, `/admin/users`,
`/admin/users/[id]`, `/admin/catalogue`, `/admin/safeguarding`, `/admin/trash`,
`/admin/requests`.

Admin actions all mutate other users' data (allow/delete reviews, ban accounts,
force rename, restore from trash, import catalogue books, approve/decline
requests), so these need enforcement at the database, not just the route.

---

# How to implement it

## 1. Supabase Auth with `@supabase/ssr`

Cookie-based sessions, readable in Server Components, Route Handlers and
middleware. Install `@supabase/supabase-js` + `@supabase/ssr`, add
`.env.local` with the project URL and anon key (project ref
`vzznwebsaielxpsscwlw`).

Three clients: browser, server, middleware. Standard pattern.

**Use `supabase.auth.getUser()`, never `getSession()`, on the server.**
`getSession()` reads the cookie without revalidating it — trivially forged.
`getUser()` round-trips to the auth server.

## 2. RLS is the enforcement; everything else is UX

Route guards and hidden buttons are convenience. The actual boundary is
Postgres row-level security on every table in `data/diagrams.md`. Rough shape:

| Table | Policy |
|---|---|
| `users` | read own row; admins read all |
| `surveys` | owner only |
| `reading_status`, `reading_lists` | owner only; public lists readable by anyone when `is_public` |
| `reviews` | anyone reads approved; insert requires `auth.uid()` **and** `email_confirmed_at IS NOT NULL`; update/delete own |
| `reports` | insert authenticated; read admin only |
| `book_requests` | own rows; admin reads all |
| `trash_items` | admin only |

The verify gate becomes a real constraint here — `email_confirmed_at IS NOT
NULL` in the reviews insert policy — not just a dialog.

## 3. Middleware for session refresh + coarse routing

`middleware.ts` refreshes the auth cookie on every request (required, or
sessions expire mid-visit) and handles the redirects that are genuinely
route-level:

- `/admin/*` without admin → `notFound()`
- `/login`, `/signup`, `/start`, `/reset*` while logged in → `/home`
- `/` while logged in → `/home`

Do **not** put the six `guard()` routes here as redirects — the design wants a
dialog on the page, not a bounce. See §5.

## 4. Get the user to the components — server-side

This matters because of the hydration bug we just fixed. Reading auth state on
the client during render produces exactly that class of mismatch: server
renders the guest nav, client renders the member nav, React reports a mismatch
and leaves the wrong one on screen.

So: read the user in a **Server Component** and pass it down as props.

- `app/layout.tsx` stays a server component; fetch the user there.
- `Nav` currently hardcodes the guest state. Give it
  `user: { displayName, avatarColor, isAdmin, verified } | null` as a prop.
  It stays `"use client"` for the theme toggle, but auth arrives as a prop, so
  server and client render identically.
- Same for the unverified banner — render it in the layout from server state.

## 5. Gates as a client component, not redirects

Add `components/SignupGate.tsx` and `components/VerifyGate.tsx` (the export's
two dialogs, currently unported), plus a small hook:

```
useGate(user) → (action, gateCopy) => void
```

which runs the cascade from §2 and either opens a dialog or performs the
action. That's one place to change the rule, and it keeps the six `guard()`
routes rendering their real page behind a dialog rather than bouncing.

For direct URL navigation to a guarded route while a guest, the page itself
(server component) renders the landing content with the gate dialog open —
matching what the export does on click.

## 6. Replace the duplicated seed state

Three files currently define their own reader name, survey answers and shelf
map because there's no shared store. Once auth lands these all become queries
against the signed-in user, and the duplication goes away. Worth doing in the
same pass, since they'll otherwise drift.

## Suggested order

1. Schema + RLS (blocks everything; also settles the two open modelling
   questions — `Report` polymorphic target, book caching strategy).
2. Supabase clients + `.env.local` + middleware session refresh.
3. Real signup/login/verify replacing the local-state auth screens.
4. Server-side user → layout → `Nav` props. Delete the hardcoded guest state.
5. Gate dialogs + `useGate`.
6. Swap `lib/mock.ts` reads for real queries, page by page.
7. Admin gating last — it's the smallest surface and needs the rest working.
