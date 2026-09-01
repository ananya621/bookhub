-- The onboarding survey that drives recommendations. One per reader.
create table public.surveys (
  user_id uuid primary key references public.profiles(id) on delete cascade,

  -- May contain 'Other', which the survey screen appends locally and is
  -- deliberately NOT in the shared genre list -- the search filters must
  -- not offer it. Left unconstrained rather than pinned to a list that
  -- would reject a valid answer.
  genres text[] not null default '{}',

  reading_level text not null
    check (reading_level in ('Middle Grade','Young Adult','Adult')),

  -- 'Any' is the fifth option ("I don't mind") and is not one of the four
  -- length values used elsewhere. A constraint built from those four
  -- alone would reject a valid survey.
  preferred_length text not null
    check (preferred_length in
      ('Under 200 pages','200–400 pages','400–600 pages','600+ pages','Any')),

  updated_at timestamptz not null default now()
);

-- Recommendations score books by genre overlap (genres && survey.genres),
-- which GIN serves directly.
create index surveys_genres_idx on public.surveys using gin (genres);

create trigger surveys_touch_updated_at
  before update on public.surveys
  for each row execute function public.touch_updated_at();

comment on column public.surveys.reading_level is
  'Safeguarding-relevant, not cosmetic: the survey screen shows an age warning for Young Adult and Adult, and this should gate what gets recommended.';
