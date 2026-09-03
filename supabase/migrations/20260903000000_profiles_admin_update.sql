-- Force rename needs an admin to be able to change someone else's
-- display name. The only existing UPDATE policy on profiles is
-- owner-only (auth.uid() = id), which an admin acting on someone
-- else's account doesn't satisfy -- so this adds a second policy,
-- OR'd with the existing one, the same shape as reviews_update_own_or_admin.
create policy profiles_update_admin
  on public.profiles for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
