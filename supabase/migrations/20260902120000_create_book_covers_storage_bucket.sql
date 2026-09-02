-- Public bucket for book cover images. Public because covers must be
-- visible to guests with no session; write access is restricted below
-- to admins only, same pattern as the `books` table itself.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-covers', 'book-covers', true, 5242880, array['image/jpeg','image/png','image/webp']);

create policy book_covers_select_all
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'book-covers');

create policy book_covers_insert_admin
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'book-covers' and public.is_admin());

create policy book_covers_update_admin
  on storage.objects for update
  to authenticated
  using (bucket_id = 'book-covers' and public.is_admin())
  with check (bucket_id = 'book-covers' and public.is_admin());

create policy book_covers_delete_admin
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'book-covers' and public.is_admin());
