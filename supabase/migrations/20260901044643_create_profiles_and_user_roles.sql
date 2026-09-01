-- Profiles: 1:1 with auth.users. Supabase owns auth.users; we never write
-- to it directly (direct inserts leave rows in a broken state).
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  -- Null until the profile-setup step: the account exists for a moment
  -- between signup and choosing a name.
  display_name text,
  avatar_color text not null default 'Blue'
    check (avatar_color in ('Red','Orange','Yellow','Lime','Blue','Purple','Pink')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Case-insensitive uniqueness. The design notes proposed citext, but on
-- Supabase extensions live in the `extensions` schema, and our SECURITY
-- DEFINER functions run with `search_path = ''` -- an unqualified citext
-- cast would fail to resolve there. A functional unique index on
-- lower(display_name) gives the same guarantee with no extension
-- dependency: 'Maya' and 'maya' cannot both exist.
create unique index profiles_display_name_lower_idx
  on public.profiles (lower(display_name));

comment on column public.profiles.display_name is
  'Public. Shown on reviews and shared lists. Unique case-insensitively.';

-- Admin lives in its own table on purpose. If is_admin sat on profiles,
-- the same UPDATE policy that lets someone rename themselves would let
-- them grant themselves admin. This table has no write policy at all,
-- so it can only be changed by SQL or the service role.
create table public.user_roles (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Runs inside the signup transaction. Keep it minimal: anything that
-- throws here fails the whole signup and surfaces as the opaque
-- "Database error saving new user".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_roles (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
