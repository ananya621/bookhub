-- Marks a pending request fulfilled by a book that was already created
-- (by the admin-edited Step 2 form), rather than creating the book
-- itself the way approve_book_request() does. That function stays in
-- place for now but is no longer called from the catalogue screen.
create or replace function public.link_book_to_request(
  p_request_id uuid,
  p_book_id    uuid
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
     set status = 'approved', book_id = p_book_id,
         resolved_at = now(), resolved_by = auth.uid()
   where id = p_request_id and status = 'pending';

  if not found then raise exception 'that request is not pending'; end if;
end;
$fn$;

revoke all on function public.link_book_to_request(uuid, uuid) from public, anon;
grant execute on function public.link_book_to_request(uuid, uuid) to authenticated;
