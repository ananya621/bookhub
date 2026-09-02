-- Recoverable account deletion, for both a reader deleting their own
-- account and an admin deleting someone else's.
--
-- The mechanism reuses banning rather than inventing a new one: the app
-- already treats a banned account as signed-out (see
-- 20260901160000_current_user_state_with_ban_check.sql and the note in
-- lib/auth.ts about why that check exists), and Supabase's admin API
-- can ban and un-ban instantly and reversibly. So "delete" here means
-- "ban for 14 days and record it here"; "undo" means "un-ban and remove
-- the record"; the actual ban/un-ban calls happen in server code with
-- the service-role key, since that's an auth-admin operation, not
-- something plain SQL can do.
--
-- After 14 days, pg_cron permanently deletes the auth.users row
-- directly in SQL — this is one of Supabase's own documented ways to
-- delete a user, and doing it here (rather than a scheduled function
-- calling back out to the admin API) means the actual permanent delete
-- doesn't depend on any external code running on time. Every table that
-- references auth.users already cascades (profiles, user_roles,
-- surveys, book_request_voters), so nothing further to clean up by hand.

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create table public.pending_deletions (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  deleted_by text not null check (deleted_by in ('self', 'admin')),
  deleted_at timestamptz not null default now(),
  purge_at   timestamptz not null default (now() + interval '14 days')
);

alter table public.pending_deletions enable row level security;

-- Admin-only read (the Trash screen). No insert/update/delete policy:
-- rows are only ever touched through the two functions below.
create policy pending_deletions_select_admin
  on public.pending_deletions for select
  to authenticated
  using ((select public.is_admin()));

-- Called right after the caller has already banned the account via the
-- admin API. Self-service is only allowed for your own id; anyone else
-- requires admin.
create or replace function public.request_account_deletion(
  p_user_id    uuid,
  p_deleted_by text
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if p_deleted_by not in ('self', 'admin') then
    raise exception 'deleted_by must be self or admin';
  end if;

  if p_deleted_by = 'self' then
    if auth.uid() <> p_user_id then
      raise exception 'can only request deletion of your own account this way';
    end if;
  elsif not public.is_admin() then
    raise exception 'admins only';
  end if;

  insert into public.pending_deletions (user_id, deleted_by)
  values (p_user_id, p_deleted_by)
  on conflict (user_id) do nothing;
end;
$fn$;

revoke all on function public.request_account_deletion(uuid, text) from public, anon;
grant execute on function public.request_account_deletion(uuid, text) to authenticated;

-- Admin-only. The caller must also un-ban via the admin API separately
-- — this just clears the record so the account stops being "pending".
create or replace function public.restore_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;

  delete from public.pending_deletions where user_id = p_user_id;
end;
$fn$;

revoke all on function public.restore_account(uuid) from public, anon;
grant execute on function public.restore_account(uuid) to authenticated;

-- Not reachable over the API at all (no grant to anon/authenticated) —
-- only pg_cron calls this, on the schedule below.
create or replace function public.purge_expired_deletions()
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  delete from auth.users
   where id in (
     select user_id from public.pending_deletions where purge_at <= now()
   );
end;
$fn$;

revoke all on function public.purge_expired_deletions() from public, anon, authenticated;

select cron.schedule(
  'purge-expired-account-deletions',
  '0 3 * * *',
  $$select public.purge_expired_deletions();$$
);
