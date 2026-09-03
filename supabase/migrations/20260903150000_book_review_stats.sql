-- Average rating and review count per book, computed in the database
-- so a page that lists many books (the search results list) can show
-- a star rating and sort by "most reviewed" with one query, instead of
-- fetching every review row for every book and averaging in
-- JavaScript. Only 'allowed' reviews count -- a review an admin has
-- taken down shouldn't move a book's average or its review count.
--
-- The book detail page doesn't use this: it already has to fetch
-- every review for that one book to render the review list, so it
-- averages that same array in JS instead of adding a second query --
-- there's nothing wasteful about reusing data you already fetched.
-- security_invoker matters here. A view runs as its OWNER by default,
-- and migrations run as `postgres`, so without this the view would read
-- `reviews` with RLS switched off — the thing every other read in this
-- app is careful not to do. With it on, the view is read as whoever
-- queried it.
--
-- It changes no numbers: reviews_select_public already lets anon and
-- authenticated read exactly the rows this aggregates (status =
-- 'allowed'). A signed-in reader also holds reviews_select_own, so they
-- can see their own moderator-removed review -- but the filter below
-- excludes it anyway, so nobody's average shifts based on who is asking.
create view public.book_review_stats
with (security_invoker = on) as
select
  book_id,
  count(*)::int as review_count,
  avg(stars)::numeric(3, 1) as avg_stars
from public.reviews
where status = 'allowed'
group by book_id;
