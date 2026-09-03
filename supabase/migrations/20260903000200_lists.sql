-- Reading lists. A reader owns lists; each list holds books.
--
-- slug is generated once at creation (slugified name + a short random
-- suffix, see app/actions/lists.ts) and never changes -- the design
-- doesn't offer renaming a list, so there's no "slug drifts out of
-- sync with the name" problem to worry about, and the random suffix
-- is what keeps two different readers' "Favourites" from colliding.
--
-- "Private" means unlisted, not access-controlled -- the design's own
-- copy is "PRIVATE — LINK ONLY", i.e. anyone with the link can still
-- open it. Row Level Security can't tell "looked up by its one known
-- slug" apart from "browsed the whole table", so a public SELECT
-- policy would let anyone list every reader's lists, private ones
-- included. Instead the table stays owner-only, and
-- get_shared_list() below -- security definer, like is_admin() /
-- check_display_name() -- is the only way to fetch a list by slug
-- from outside its owner, matching that "link only" model exactly.
create table public.lists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  slug       text not null unique,
  is_public  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index lists_user_idx on public.lists (user_id);

alter table public.lists enable row level security;

create policy lists_select_own
  on public.lists for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy lists_insert_own
  on public.lists for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy lists_update_own
  on public.lists for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy lists_delete_own
  on public.lists for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- So a real ban (app/actions/accounts.ts) can remove a banned
-- reader's lists the same way it removes their reviews.
create policy lists_delete_admin
  on public.lists for delete
  to authenticated
  using ((select public.is_admin()));

create table public.list_books (
  list_id  uuid not null references public.lists(id) on delete cascade,
  book_id  uuid not null references public.books(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, book_id)
);

alter table public.list_books enable row level security;

create policy list_books_select_own
  on public.list_books for select
  to authenticated
  using ((select l.user_id from public.lists l where l.id = list_id) = (select auth.uid()));

create policy list_books_insert_own
  on public.list_books for insert
  to authenticated
  with check ((select l.user_id from public.lists l where l.id = list_id) = (select auth.uid()));

create policy list_books_delete_own
  on public.list_books for delete
  to authenticated
  using ((select l.user_id from public.lists l where l.id = list_id) = (select auth.uid()));

-- The public share page (app/lists/[slug]/page.tsx) reads through
-- this instead of the table directly -- see the comment above lists
-- for why. Returns nothing for an unknown slug (page 404s), and
-- doesn't gate on is_public: that flag only decides whether a list
-- would show up somewhere browsable (nothing does yet), not whether
-- its own direct link works.
create or replace function public.get_shared_list(p_slug text)
returns table (
  id                 uuid,
  name               text,
  is_public          boolean,
  owner_display_name text,
  created_at         timestamptz,
  books              jsonb
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    l.id, l.name, l.is_public, p.display_name, l.created_at,
    coalesce(
      (select jsonb_agg(
                jsonb_build_object(
                  'id', b.id, 'title', b.title, 'author', b.author, 'coverUrl', b.cover_url
                )
                order by lb.added_at
              )
       from public.list_books lb
       join public.books b on b.id = lb.book_id
       where lb.list_id = l.id),
      '[]'::jsonb
    ) as books
  from public.lists l
  join public.profiles p on p.id = l.user_id
  where l.slug = p_slug;
$fn$;

revoke all on function public.get_shared_list(text) from public;
grant execute on function public.get_shared_list(text) to anon, authenticated;
