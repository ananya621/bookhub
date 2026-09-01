-- Names that impersonate the site or staff. Kept separate from profanity
-- because they produce a different message to the reader.
create table public.reserved_names (
  name   text primary key,
  reason text
);

insert into public.reserved_names (name, reason) values
  ('bookhub',   'Impersonates the site'),
  ('moderator', 'Impersonates staff'),
  ('support',   'Impersonates staff'),
  ('admin',     'Impersonates staff'),
  ('official',  'Impersonates the site');

-- Folds leetspeak and homoglyphs, drops non-letters, collapses repeats,
-- so 'f_u_c_k' and 'ffuuck' reduce to the same string. Ported from the
-- design export's fold(); see the note in docs/auth-api-design.md about
-- what it does and does not catch.
create or replace function public.fold_name(v text)
returns text
language sql
immutable
set search_path = ''
as $fn$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               translate(lower(coalesce(v, '')),
                         '|!¡1lı0ø3€4@5$§7892',
                         'iiiiiiooeeaassstbgz'),
               'vv', 'w', 'g'),
             '[^a-z]', '', 'g'),
           '(.)\1+', '\1', 'g');
$fn$;

-- Two lists, not one, and this matters. Substring matching alone creates
-- the Scunthorpe problem: "sparse" contains "arse" and "class" contains a
-- slur fragment, and a filter that rejects ordinary words teaches children
-- the product is broken.
--   * the first list is matched anywhere inside a word
--   * the second is rejected only when it IS the word
create or replace function public.is_name_allowed(v text)
returns boolean
language sql
stable
set search_path = ''
as $fn$
  select not (
    exists (
      select 1
      from unnest(array['fuck','fck','bitch','wanker','twat','bollocks','motherf']) as w
      where public.fold_name(v) like '%' || public.fold_name(w) || '%'
    )
    or exists (
      select 1
      from unnest(regexp_split_to_array(coalesce(v, ''), '[^A-Za-z0-9@$!|+*]+')) as tok
      where public.fold_name(tok) <> ''
        and public.fold_name(tok) in (
          select public.fold_name(w)
          from unnest(array['shit','damn','crap','arse','ass','dick','cock','piss',
                            'prick','slag','whore','bastard','git','knob']) as w
        )
    )
  );
$fn$;

create type public.name_status as enum
  ('short','banned','reserved','taken','available');

-- The availability check behind the debounced field on /profile/setup.
-- SECURITY DEFINER so the client never reads reserved_names or enumerates
-- profiles directly; it only ever learns the verdict on the one name it
-- asked about.
create or replace function public.check_display_name(candidate text)
returns public.name_status
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v text := trim(coalesce(candidate, ''));
begin
  if length(v) < 2 then
    return 'short';
  end if;

  if not public.is_name_allowed(v) then
    return 'banned';
  end if;

  if exists (select 1 from public.reserved_names r where r.name = lower(v)) then
    return 'reserved';
  end if;

  if exists (select 1 from public.profiles p where lower(p.display_name) = lower(v)) then
    return 'taken';
  end if;

  return 'available';
end;
$fn$;

revoke all on function public.check_display_name(text) from public;
grant execute on function public.check_display_name(text) to anon, authenticated;
