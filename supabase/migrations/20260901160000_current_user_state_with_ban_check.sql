-- Everything the app needs to know about whoever is signed in, in one
-- call.
--
-- This exists because of the ban check. Supabase does not proactively
-- end a banned person's session -- bans are noticed "whenever a session
-- is refreshed next", and access tokens last an hour by default. So
-- banning someone stops them signing in again, but leaves an existing
-- session working for up to an hour, and none of our row-level rules
-- look at ban status. Reading auth.users.banned_until is the fix, and
-- that needs SECURITY DEFINER because the auth schema is not exposed.
--
-- Having written a function for that, it may as well answer the other
-- three questions too: one round trip instead of four, and the ban
-- can never be accidentally skipped by a caller that forgets to ask.
--
-- Always returns exactly one row, even for an account whose profile
-- row somehow does not exist, so callers never have to handle "no rows".
create or replace function public.current_user_state()
returns table (
  display_name text,
  avatar_color text,
  is_admin     boolean,
  has_survey   boolean,
  is_banned    boolean
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    (select p.display_name from public.profiles p where p.id = auth.uid()),
    coalesce(
      (select p.avatar_color from public.profiles p where p.id = auth.uid()),
      'Blue'
    ),
    coalesce(
      (select r.is_admin from public.user_roles r where r.user_id = auth.uid()),
      false
    ),
    exists (select 1 from public.surveys s where s.user_id = auth.uid()),
    -- banned_until is a timestamp, not a flag: a ban can be temporary,
    -- and one that has run out should not lock anyone out.
    coalesce(
      (select u.banned_until > now() from auth.users u where u.id = auth.uid()),
      false
    );
$fn$;

revoke all on function public.current_user_state() from public, anon;
grant execute on function public.current_user_state() to authenticated;
