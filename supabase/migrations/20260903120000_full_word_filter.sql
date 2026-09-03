-- Expands the display-name filter to the design's actual word lists
-- (Prototype with Admin.dc.html's hasBanned(), ~line 1762) and shares
-- it with review text via one function, contains_banned_word().
--
-- The version this replaces (20260901044724) only ported a handful of
-- words from each list as a placeholder -- 7 "always bad" and 14
-- "whole word only", against the design's ~38 and ~38, and dropped the
-- allow-list of real words (Scunthorpe, therapist, assassin, grape...)
-- that must never be caught. This is the full set, and the same
-- three-pass check the design uses: fold each token, drop the
-- allow-listed ones, then check the survivors both individually and
-- rejoined (catches "f u c k" spaced out to dodge a per-token check)
-- against the always-bad substrings, and separately against the
-- whole-word list as exact matches only -- so "sparse"/"assassin"
-- never trip it just for containing a short word.
--
-- fold_name() gains the three foldings the previous version missed:
-- 6->g, +->t, and ph->f (so "phuck" and "fuck" fold the same).
create or replace function public.fold_name(v text)
returns text
language sql
immutable
set search_path = ''
as $fn$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(
                 translate(lower(coalesce(v, '')),
                           '|!¡1lı0ø3€4@5$§78926+',
                           'iiiiiiooeeaassstbgzgt'),
                 'ph', 'f', 'g'),
               'vv', 'w', 'g'),
             '[^a-z]', '', 'g'),
           '(.)\1+', '\1', 'g');
$fn$;

create or replace function public.contains_banned_word(v text)
returns boolean
language plpgsql
stable
set search_path = ''
as $fn$
declare
  allow_list  text[] := array['scunthorpe','penistone','therapist','therapists','therapy','pussycat','shiitake','assassin','assemble','assembly','classic','analysis','cockatoo','cockerel','peacock','shuttlecock','pedometer','grape','grapes'];
  always_bad  text[] := array['fuck','fuk','fck','phuck','motherfuck','bitch','biatch','wanker','twat','twunt','bollocks','nigger','nigga','faggot','fagot','retard','spastic','chink','kike','wetback','tranny','whore','pedoph','paedoph','asshole','arsehole','dickhead','knobhead','bullshit','shithead','tosser','skank','douche','bastard','jizz','dumbass','jackass','bellend'];
  whole_words text[] := array['shit','shite','crap','arse','ass','asses','dick','cock','piss','prick','slag','slut','git','knob','damn','goddamn','hoe','tit','tits','fanny','spic','paki','pedo','cum','wang','turd','prat','plonker','cunt','cnut','rapist','pussy','shag','shagging','wank','nonce','minger','bugger','buggered'];
  allow_f text[];
  bad_f   text[];
  whole_f text[];
  tokens  text[];
  suspect text[] := '{}';
  tok     text;
  ft      text;
  joined  text;
  w       text;
begin
  allow_f := array(select public.fold_name(x) from unnest(allow_list) as x);
  bad_f   := array(select public.fold_name(x) from unnest(always_bad) as x);
  whole_f := array(select public.fold_name(x) from unnest(whole_words) as x);

  tokens := regexp_split_to_array(coalesce(v, ''), '[^A-Za-z0-9@$!|+*]+');

  -- Innocent words that happen to contain a banned string are taken
  -- out first -- "therapist", "assassin" must never be refused.
  foreach tok in array tokens loop
    ft := public.fold_name(tok);
    if ft = '' or ft = any(allow_f) then
      continue;
    end if;
    suspect := array_append(suspect, ft);
  end loop;

  foreach ft in array suspect loop
    foreach w in array bad_f loop
      if w <> '' and ft like '%' || w || '%' then
        return true;
      end if;
    end loop;
  end loop;

  -- Separators are not a disguise: with the allow-listed words already
  -- removed, rejoin what is left so "f_u_c_k" collapses back to "fuck".
  joined := array_to_string(suspect, '');
  foreach w in array bad_f loop
    if w <> '' and joined like '%' || w || '%' then
      return true;
    end if;
  end loop;

  if exists (select 1 from unnest(suspect) as s where s = any(whole_f)) then
    return true;
  end if;

  return false;
end;
$fn$;

-- check_display_name() and everything that already calls it (signup,
-- profile setup, Force rename) picks up the full lists automatically.
create or replace function public.is_name_allowed(v text)
returns boolean
language sql
stable
set search_path = ''
as $fn$
  select not public.contains_banned_word(v);
$fn$;
