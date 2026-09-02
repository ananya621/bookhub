-- On-demand version of purge_expired_deletions() for one account, for
-- the Trash screen's "Delete for good" button — same effect the
-- schedule would eventually have, just not waiting for it. Admin-only,
-- and only for an account already pending deletion (never a live one).
create or replace function public.purge_account_now(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;

  if not exists (select 1 from public.pending_deletions where user_id = p_user_id) then
    raise exception 'that account is not pending deletion';
  end if;

  delete from auth.users where id = p_user_id;
end;
$fn$;

revoke all on function public.purge_account_now(uuid) from public, anon;
grant execute on function public.purge_account_now(uuid) to authenticated;
