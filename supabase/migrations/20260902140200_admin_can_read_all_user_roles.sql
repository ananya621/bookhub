-- The existing user_roles_select_own policy only lets you see your own
-- row, which was deliberate (see the comment on user_roles in the
-- original migration) -- but it also means an admin couldn't see who
-- else is admin, which the accounts screen needs. RLS policies are
-- OR'd together, so this adds admin visibility without loosening the
-- self-read policy for anyone else.
create policy user_roles_select_admin
  on public.user_roles for select
  to authenticated
  using ((select public.is_admin()));
