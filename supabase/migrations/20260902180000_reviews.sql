-- Reviews: one per (reader, book). status is the admin moderation
-- state, not a "was this approved before going live" gate -- a review
-- is public the moment it's posted (matches the design's "posted
-- reviews are public, you can edit yours later"), and 'deleted' is a
-- reversible admin action (Undo), not a hard delete.
create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references public.books(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  stars      integer not null check (stars between 1 and 5),
  text       text not null,
  status     text not null default 'allowed' check (status in ('allowed', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, user_id)
);

create index reviews_book_idx on public.reviews (book_id) where status = 'allowed';

alter table public.reviews enable row level security;

-- Public reads only what's still live.
create policy reviews_select_public
  on public.reviews for select
  to anon, authenticated
  using (status = 'allowed');

-- You can always see your own, even if a moderator deleted it.
create policy reviews_select_own
  on public.reviews for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy reviews_select_admin
  on public.reviews for select
  to authenticated
  using ((select public.is_admin()));

create policy reviews_insert_own
  on public.reviews for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Owner edits text/stars; admin moderates status. Both go through this
-- one policy -- the trigger below is what actually keeps a non-admin
-- from sneaking a status change through their own edit.
create policy reviews_update_own_or_admin
  on public.reviews for update
  to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()))
  with check ((select auth.uid()) = user_id or (select public.is_admin()));

-- "Delete my review" -- a real delete, only ever your own. Admin's
-- "Delete" in the moderation queue is a status change instead (via the
-- update policy above), so it can be undone.
create policy reviews_delete_own
  on public.reviews for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create trigger reviews_touch_updated_at
  before update on public.reviews
  for each row execute function public.touch_updated_at();

-- RLS can't restrict a policy to specific columns, so a non-admin's own
-- update (editing their text/stars) could otherwise also smuggle in a
-- status change -- this forces status back to whatever it already was
-- unless the caller is admin.
create or replace function public.reviews_protect_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if not public.is_admin() then
    new.status := old.status;
  end if;
  return new;
end;
$fn$;

create trigger reviews_protect_status
  before update on public.reviews
  for each row execute function public.reviews_protect_status();
