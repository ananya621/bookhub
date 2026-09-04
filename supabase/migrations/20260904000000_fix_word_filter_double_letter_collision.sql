-- fold_name() collapsed ANY run of a repeated letter down to one
-- instance (so "fuuuuck" -> "fuck", catching that evasion) -- but the
-- same collapse turns the ordinary word "ass" (a-s-s) into "as",
-- which then exactly matches the equally-folded, extremely common
-- word "as" itself. Since wholeWords is an exact-match check, that
-- makes contains_banned_word() true for almost any real sentence,
-- since "as" appears constantly in ordinary prose (found live-blocking
-- a real book summary on production).
--
-- Only collapsing 3-or-more repeats (not 2) keeps catching the
-- letter-stretching evasion this was built for while leaving ordinary
-- double letters alone -- "ass" and "as" go back to being different
-- strings, "class"/"glass"/"spell" are unaffected, and "fuuuuck"
-- (4 u's) still collapses to "fuck".
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
           '(.)\1{2,}', '\1', 'g');
$fn$;
