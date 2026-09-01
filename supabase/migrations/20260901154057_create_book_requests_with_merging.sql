-- "Please add this book" from a reader.
--
-- Two people asking for the same book join ONE request rather than
-- creating two. That is what the unique indexes below enforce, and why
-- book_request_voters exists -- the admin queue should show one row
-- saying four people asked, not four identical rows.
create table public.book_requests (
  id             uuid primary key default gen_random_uuid(),
  -- Google volume id when the reader picked a real search result. Null
  -- when they typed the title in freehand.
  external_id    text,
  title          text not null,
  author         text not null default '',
  pages          integer,
  summary        text,
  cover_url      text,
  -- The reader's "anything else?" note, from whoever asked first.
  note           text,
  status         text not null default 'pending'
                 check (status in ('pending','approved','declined')),
  decline_reason text,
  -- Filled in when approved, so the queue can link to the real book.
  book_id        uuid references public.books(id) on delete set null,
  resolved_at    timestamptz,
  resolved_by    uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Merge keys. Both are partial indexes on `pending` only, deliberately:
-- once a request has been approved or declined, a fresh ask should start
-- a new request rather than reopening a settled one.
create unique index book_requests_pending_external_idx
  on public.book_requests (external_id)
  where status = 'pending' and external_id is not null;

create unique index book_requests_pending_title_idx
  on public.book_requests (lower(title), lower(author))
  where status = 'pending';

create index book_requests_status_idx on public.book_requests (status, created_at desc);

create trigger book_requests_touch_updated_at
  before update on public.book_requests
  for each row execute function public.touch_updated_at();

-- Everyone who asked for a given book. One row per person per request.
create table public.book_request_voters (
  request_id uuid not null references public.book_requests(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);

create index book_request_voters_user_idx on public.book_request_voters (user_id);

-- Asking for a book, done in one place so the merge cannot race.
--
-- Two people submitting the same book at the same moment would both see
-- "no pending request exists" if this were done as separate select and
-- insert calls in the app. Here the insert either wins or hits the
-- unique index, and either way we end up attached to the one request.
create or replace function public.request_book(
  p_external_id text,
  p_title       text,
  p_author      text,
  p_pages       integer default null,
  p_summary     text default null,
  p_cover_url   text default null,
  p_note        text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
begin
  if v_user is null then
    raise exception 'must be signed in to request a book';
  end if;

  if coalesce(trim(p_title), '') = '' then
    raise exception 'a title is required';
  end if;

  -- Already in the catalogue? Then there is nothing to request.
  if p_external_id is not null and exists (
    select 1 from public.books b where b.external_id = p_external_id
  ) then
    raise exception 'that book is already in the catalogue';
  end if;

  -- Join the pending request if there is one, by volume id first and
  -- then by title and author for freehand asks.
  select r.id into v_id
  from public.book_requests r
  where r.status = 'pending'
    and (
      (p_external_id is not null and r.external_id = p_external_id)
      or (lower(r.title) = lower(trim(p_title))
          and lower(r.author) = lower(coalesce(trim(p_author), '')))
    )
  limit 1;

  if v_id is null then
    insert into public.book_requests
      (external_id, title, author, pages, summary, cover_url, note)
    values
      (p_external_id, trim(p_title), coalesce(trim(p_author), ''),
       p_pages, p_summary, p_cover_url, p_note)
    on conflict do nothing
    returning id into v_id;

    -- Lost the race: somebody else created it a moment ago.
    if v_id is null then
      select r.id into v_id
      from public.book_requests r
      where r.status = 'pending'
        and (
          (p_external_id is not null and r.external_id = p_external_id)
          or (lower(r.title) = lower(trim(p_title))
              and lower(r.author) = lower(coalesce(trim(p_author), '')))
        )
      limit 1;
    end if;
  end if;

  insert into public.book_request_voters (request_id, user_id)
  values (v_id, v_user)
  on conflict do nothing;

  return v_id;
end;
$fn$;

revoke all on function public.request_book(text, text, text, integer, text, text, text)
  from public, anon;
grant execute on function public.request_book(text, text, text, integer, text, text, text)
  to authenticated;
