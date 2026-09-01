alter table public.profiles       enable row level security;
alter table public.user_roles     enable row level security;
alter table public.surveys        enable row level security;
alter table public.reserved_names enable row level security;

-- PROFILES ------------------------------------------------------------
-- Display name and avatar colour are public by design: they appear on
-- every review and on shared lists, which guests can read. Nothing
-- private lives on this table -- email stays in auth.users, which is not
-- exposed.
create policy profiles_select_all
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No INSERT policy: rows are created only by the signup trigger, which is
-- SECURITY DEFINER and bypasses RLS.
-- No DELETE policy: deleting the account cascades from auth.users.

-- USER_ROLES ----------------------------------------------------------
-- Readable only for yourself, and writable by nobody. This is the whole
-- reason is_admin is not a column on profiles.
create policy user_roles_select_own
  on public.user_roles for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- SURVEYS -------------------------------------------------------------
-- Entirely private to its owner.
create policy surveys_select_own
  on public.surveys for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy surveys_insert_own
  on public.surveys for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy surveys_update_own
  on public.surveys for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- RESERVED_NAMES ------------------------------------------------------
-- RLS on with zero policies denies everyone. Reachable only through
-- check_display_name(), which is SECURITY DEFINER.
