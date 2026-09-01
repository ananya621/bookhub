-- Is the current user an admin? Used by policies on every table an
-- admin can write to. SECURITY DEFINER because user_roles is readable
-- only for your own row, and a policy needs to ask about the caller
-- without granting them wider read access.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce(
    (select r.is_admin from public.user_roles r where r.user_id = auth.uid()),
    false
  );
$fn$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- The catalogue. Books are not typed in by hand as a rule -- they are
-- copied from Google Books once an admin has approved them, so nothing
-- reaches children unchecked. An admin can also add one directly.
create table public.books (
  id            uuid primary key default gen_random_uuid(),
  source        text not null default 'google'
                check (source in ('google','manual')),
  -- Google's volume id. Kept so the same book cannot be imported twice.
  -- Null for books an admin typed in themselves.
  external_id   text,
  title         text not null,
  author        text not null default '',
  pages         integer,
  summary       text,
  cover_url     text,
  genres        text[] not null default '{}',
  reading_level text check (reading_level in ('Middle Grade','Young Adult','Adult')),
  is_series     boolean not null default false,
  -- Who approved or added it. Kept for the admin catalogue screen.
  added_by      uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index books_external_id_idx
  on public.books (external_id) where external_id is not null;

-- Search is by title and author, so index both together.
create index books_title_author_idx
  on public.books (lower(title), lower(author));

create index books_genres_idx on public.books using gin (genres);

create trigger books_touch_updated_at
  before update on public.books
  for each row execute function public.touch_updated_at();

comment on table public.books is
  'The catalogue. A book only lands here once an admin approved a request for it, or added it directly - never automatically from a search.';
