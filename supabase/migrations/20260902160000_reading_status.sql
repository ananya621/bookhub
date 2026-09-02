-- Reading tracker: which shelf a book is on for a given reader (Want
-- to Read / Currently Reading / Read), plus a self-reported progress
-- step while reading. Entirely private — RLS restricts every operation
-- to the row's own owner, same pattern as `surveys`.
--
-- No 'none' status: removing a book from your shelves deletes its row
-- rather than storing a fourth state for "not tracked".
create table public.reading_status (
  user_id    uuid not null references auth.users(id) on delete cascade,
  book_id    uuid not null references public.books(id) on delete cascade,
  status     text not null check (status in ('want','reading','read')),
  progress   text check (progress in ('started','halfway','nearly')),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

-- Used by /tracker (three shelves for the signed-in reader) and
-- /home's shelf counts.
create index reading_status_user_idx on public.reading_status (user_id, status);

alter table public.reading_status enable row level security;

create policy reading_status_select_own
  on public.reading_status for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy reading_status_insert_own
  on public.reading_status for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy reading_status_update_own
  on public.reading_status for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy reading_status_delete_own
  on public.reading_status for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create trigger reading_status_touch_updated_at
  before update on public.reading_status
  for each row execute function public.touch_updated_at();
