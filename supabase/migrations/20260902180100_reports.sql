-- Reports: one table for routine moderation reports AND safeguarding
-- concerns, distinguished by `type`. The Safeguarding queue is this
-- table filtered to type = 'safety_concern' -- same "one data model,
-- two views" pattern already used for book requests, not a second
-- table. Polymorphic target (a review or a reader directly) via
-- target_type/target_id rather than two nullable foreign keys, since a
-- report is on exactly one or the other, never both.
--
-- No real foreign key on target_id -- it points at either
-- public.reviews or auth.users depending on target_type, and Postgres
-- foreign keys can't be conditional on another column. Same tradeoff
-- already accepted in data/diagrams.md for this exact table.
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('rude', 'spam', 'off_topic', 'bad_language', 'safety_concern')),
  target_type text not null check (target_type in ('review', 'user')),
  target_id   uuid not null,
  note        text,
  status      text not null default 'open' check (status in ('open', 'actioned')),
  created_at  timestamptz not null default now()
);

create index reports_target_idx on public.reports (target_type, target_id);
create index reports_type_status_idx on public.reports (type, status);

alter table public.reports enable row level security;

-- Nobody reads their own filed reports back -- there's no "my reports"
-- screen in this design, only the admin queues.
create policy reports_select_admin
  on public.reports for select
  to authenticated
  using ((select public.is_admin()));

create policy reports_insert_own
  on public.reports for insert
  to authenticated
  with check ((select auth.uid()) = reporter_id);

create policy reports_update_admin
  on public.reports for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
