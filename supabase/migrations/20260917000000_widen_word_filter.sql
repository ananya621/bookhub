-- Widens contains_banned_word()'s coverage (shared by reviews, the
-- onboarding/profile display-name screens, and Force rename) two ways:
--
-- 1. fold_name() gains a handful of Cyrillic look-alike letters
--    (а е о р с х у і ѕ -> a e o p c x y i s) on top of the existing
--    leet substitutions. These are the same "looks identical, isn't
--    the same character" trick as an IDN homograph attack -- typing a
--    Cyrillic а (U+0430) instead of Latin a renders indistinguishably
--    but used to sail straight through the filter unfolded.
--
-- 2. always_bad and whole_words both get a wider set of slurs and
--    profanity. Additions were picked the same way the original list
--    was: real cusswords/slurs with no plausible innocent collision,
--    checked against common English words before going in. A few
--    obvious candidates were deliberately left OUT, for the same
--    reason "grape" is allow-listed instead of "rape" being removed:
--      - "fag"/"dyke": both have everyday non-slur meanings a real
--        book can genuinely contain -- "fag" as British slang for a
--        cigarette (or the "fagging" system in classic school
--        stories like Tom Brown's Schooldays), "dyke" as the
--        embankment/sea-wall a nonfiction book about the Netherlands
--        would use. "faggot"/"fagot" (already listed) still catch the
--        slur itself without catching either of those.
--      - "cracker"/"spook": both are far more often the food or "to
--        startle" than the slur, so adding them would misfire on
--        ordinary text constantly -- the exact failure mode the
--        "as"/"ass" bug (20260904000000) already burned us on once.
--      - "queer": increasingly the neutral or self-chosen term for a
--        whole genre of YA fiction this catalogue is meant to carry,
--        not something to block.
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
                           '|!¡1lı0ø3€4@5$§78926+аеорсхуіѕ',
                           'iiiiiiooeeaassstbgzgtaeopcxyis'),
                 'ph', 'f', 'g'),
               'vv', 'w', 'g'),
             '[^a-z]', '', 'g'),
           '(.)\1{2,}', '\1', 'g');
$fn$;

create or replace function public.contains_banned_word(v text)
returns boolean
language plpgsql
stable
set search_path = ''
as $fn$
declare
  allow_list  text[] := array['scunthorpe','penistone','therapist','therapists','therapy','pussycat','shiitake','assassin','assemble','assembly','classic','analysis','cockatoo','cockerel','peacock','shuttlecock','pedometer','grape','grapes','raccoon','raccoons','sauerkraut'];
  always_bad  text[] := array['fuck','fuk','fck','phuck','motherfuck','bitch','biatch','wanker','twat','twunt','bollocks','nigger','nigga','faggot','fagot','retard','spastic','mongoloid','chink','kike','wetback','gook','beaner','raghead','towelhead','cracka','tranny','whore','pedoph','paedoph','asshole','arsehole','dickhead','knobhead','bullshit','shithead','tosser','skank','douche','bastard','jizz','dumbass','jackass','bellend','shit','shite','cocksucker','blowjob','handjob','jackoff','cumshot'];
  whole_words text[] := array['shit','shite','crap','arse','ass','asses','dick','cock','piss','prick','slag','slut','git','knob','damn','goddamn','hoe','tit','tits','fanny','spic','paki','pedo','cum','wang','turd','prat','plonker','cunt','cnut','rapist','pussy','shag','shagging','wank','nonce','minger','bugger','buggered','hooker','crappy','pissed','pissing'];
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

  -- Must include the same Cyrillic look-alikes fold_name() folds --
  -- otherwise this tokenizer treats them as separators and chops a
  -- homoglyph-spelled slur apart before fold_name ever sees a whole
  -- token to convert ("сum" with a Cyrillic с split into "" and "um").
  tokens := regexp_split_to_array(coalesce(v, ''), '[^A-Za-z0-9@$!|+*аеорсхуіѕ]+');

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
