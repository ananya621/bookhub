-- Ban account. Two tables, because a ban has two effects with
-- different lifetimes:
--
-- account_bans -- bookkeeping for the *temporary* sign-in block, one
-- current row per user (like pending_deletions). The actual block is
-- Supabase's own auth.users.banned_until, set via the admin API in
-- app/actions/accounts.ts -- this table exists so the admin Users/user
-- pages can show "banned until X, because Y" cheaply, without an
-- admin-API call per row. banned_until is null here for a
-- warning-only action (no real ban), reason holds the duration label
-- picked ('6 hours', '1 week', ...) or 'warning'.
--
-- banned_emails -- the *permanent* effect: once banned for real (not
-- a warning), that email can never sign up again, even after the ban
-- lapses or the account is later deleted. Checked at signup by
-- is_email_banned() below, which -- like check_display_name() --
-- never exposes the underlying list to the browser, just a yes/no.
create table public.account_bans (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  banned_by    uuid references auth.users(id) on delete set null,
  reason       text not null,
  banned_at    timestamptz not null default now(),
  banned_until timestamptz
);

alter table public.account_bans enable row level security;

create policy account_bans_select_admin
  on public.account_bans for select
  to authenticated
  using ((select public.is_admin()));

create policy account_bans_insert_admin
  on public.account_bans for insert
  to authenticated
  with check ((select public.is_admin()));

create policy account_bans_update_admin
  on public.account_bans for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy account_bans_delete_admin
  on public.account_bans for delete
  to authenticated
  using ((select public.is_admin()));

create table public.banned_emails (
  email     text primary key,
  banned_by uuid references auth.users(id) on delete set null,
  banned_at timestamptz not null default now()
);

alter table public.banned_emails enable row level security;

create policy banned_emails_select_admin
  on public.banned_emails for select
  to authenticated
  using ((select public.is_admin()));

create policy banned_emails_insert_admin
  on public.banned_emails for insert
  to authenticated
  with check ((select public.is_admin()));

create policy banned_emails_delete_admin
  on public.banned_emails for delete
  to authenticated
  using ((select public.is_admin()));

-- Callable by anyone attempting to sign up, including anon -- it only
-- ever answers true/false for the one address asked about.
create or replace function public.is_email_banned(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.banned_emails where email = lower(trim(p_email))
  );
$fn$;

revoke all on function public.is_email_banned(text) from public;
grant execute on function public.is_email_banned(text) to anon, authenticated;
