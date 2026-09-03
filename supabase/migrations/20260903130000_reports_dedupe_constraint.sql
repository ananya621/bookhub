-- submitReport()'s duplicate-report guard tried to pre-check with a
-- SELECT scoped to the reporter's own row, but reports_select_admin is
-- the only select policy on this table (nobody reads their own filed
-- reports back, by design) -- so that SELECT always returned nothing
-- and the guard never actually fired.
--
-- Fixing it without adding a read path: a unique constraint, and treat
-- the resulting insert failure as "already reported", the same pattern
-- already used for list_books (app/actions/lists.ts) and books
-- (app/actions/books.ts).
create unique index reports_reporter_target_uidx
  on public.reports (reporter_id, target_type, target_id);
