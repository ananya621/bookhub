-- reviews only had an index on book_id (partial, allowed-only), which
-- is the reader-facing lookup. The admin side added two queries the
-- other way round -- "their reviews" on /admin/users/[id], and the bulk
-- status flip when an account is banned -- both filtering on user_id
-- alone, and both scanning the whole table without this.
--
-- Not partial, unlike reviews_book_idx: the admin screens deliberately
-- want deleted and pending rows too, so a `where status = 'allowed'`
-- index would not be usable for them.
create index reviews_user_idx on public.reviews (user_id);
