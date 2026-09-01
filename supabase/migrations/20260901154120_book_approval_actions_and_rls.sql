-- Approving a request: copy it into the catalogue and mark it done, in
-- one step so a book can never be created without the request being
-- settled, or the other way round.
--
-- The admin passes genres and reading level because Google does not
-- supply ours, and because deciding the reading level is the moment
-- someone checks a book is suitable for children.
create or replace function public.approve_book_request(
  p_request_id    uuid,
  p_genres        text[] default '{}',
  p_reading_level text default 'Middle Grade'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  r public.book_requests%rowtype;
  v_book uuid;
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;

  select * into r from public.book_requests where id = p_request_id for update;
  if not found then raise exception 'no such request'; end if;
  if r.status <> 'pending' then raise exception 'that request is already settled'; end if;

  insert into public.books
    (source, external_id, title, author, pages, summary, cover_url,
     genres, reading_level, added_by)
  values
    (case when r.external_id is null then 'manual' else 'google' end,
     r.external_id, r.title, r.author, r.pages, r.summary, r.cover_url,
     p_genres, p_reading_level, auth.uid())
  returning id into v_book;

  update public.book_requests
     set status = 'approved', book_id = v_book,
         resolved_at = now(), resolved_by = auth.uid()
   where id = p_request_id;

  return v_book;
end;
$fn$;

create or replace function public.decline_book_request(
  p_request_id uuid,
  p_reason     text
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;

  update public.book_requests
     set status = 'declined',
         -- The reader is shown this, so it should never be blank.
         decline_reason = coalesce(nullif(trim(p_reason), ''), 'No reason given'),
         resolved_at = now(), resolved_by = auth.uid()
   where id = p_request_id and status = 'pending';

  if not found then raise exception 'no pending request with that id'; end if;
end;
$fn$;

revoke all on function public.approve_book_request(uuid, text[], text) from public, anon;
revoke all on function public.decline_book_request(uuid, text) from public, anon;
grant execute on function public.approve_book_request(uuid, text[], text) to authenticated;
grant execute on function public.decline_book_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------- RLS

alter table public.books                enable row level security;
alter table public.book_requests        enable row level security;
alter table public.book_request_voters  enable row level security;

-- The catalogue is public: guests browse and search it.
create policy books_select_all
  on public.books for select
  to anon, authenticated
  using (true);

-- Admins can add a book directly, skipping the request queue, and can
-- correct one afterwards.
create policy books_insert_admin
  on public.books for insert
  to authenticated
  with check ((select public.is_admin()));

create policy books_update_admin
  on public.books for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy books_delete_admin
  on public.books for delete
  to authenticated
  using ((select public.is_admin()));

-- You can see a request if you asked for it. Admins see all of them.
create policy book_requests_select_own_or_admin
  on public.book_requests for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.book_request_voters v
      where v.request_id = id and v.user_id = (select auth.uid())
    )
  );

-- No insert or update policy on purpose: requests are only created
-- through request_book(), and only settled through the approve and
-- decline functions, both of which check for admin.

create policy voters_select_own_or_admin
  on public.book_request_voters for select
  to authenticated
  using ((select public.is_admin()) or user_id = (select auth.uid()));
