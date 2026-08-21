-- ============================================================
--  FJERN DEMO-INDHOLDET IGEN
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Fjerner præcis det, supabase/demo-indhold.sql lagde ind —
--  hverken mere eller mindre. Har personalet skrevet en RIGTIG
--  dagens ret, en rigtig besked eller rigtige nyheder oveni,
--  bliver de stående: filen rammer kun på det nøjagtige indhold,
--  demo-filen skrev.
--
--  Det er en bevidst forskel fra "slet alt". En oprydning, der
--  også tager personalets eget arbejde med, bliver kørt én gang
--  og aldrig igen — og så bliver demo-indholdet stående for evigt
--  i stedet.
--
--  Bagefter skjuler forsiden de blokke, der ikke har noget at
--  vise. Det er ikke en fejl; det er reglen: en overskrift over
--  ingenting fortæller gæsten, at der aldrig sker noget her.
-- ============================================================

begin;

-- Dagens ret — kun hvis den stadig er DEN, demo-filen skrev.
update public.indstillinger
   set vaerdi = jsonb_build_object('navn', '', 'beskrivelse', '', 'pris', null),
       aendret = now()
 where lokation_id = 'mosede'
   and noegle = 'dagens_ret'
   and vaerdi->>'navn' = 'Stegt flæsk med persillesovs';

-- Dagens besked — slås fra, teksten bliver stående, så man kan se
-- hvad der stod. Et tomt felt fortæller ingenting bagefter.
update public.indstillinger
   set vaerdi = jsonb_set(vaerdi, '{vis}', 'false'::jsonb),
       aendret = now()
 where lokation_id = 'mosede'
   and noegle = 'dagens_besked'
   and vaerdi->>'tekst' = 'Vi holder åbent hele weekenden — kom ned og få en is på trædækket.';

delete from public.kalender
 where lokation_id = 'mosede'
   and titel = 'Live musik på molen';

delete from public.nyheder
 where lokation_id = 'mosede'
   and titel in (
     'Længere åbent i weekenden',
     'Nyt i køledisken',
     'Smørrebrød ud af huset'
   );

commit;


-- Rapport. Se noten i demo-indhold.sql om hvorfor det skal være
-- en select til sidst.
select
  case when
       (select count(*) from public.indstillinger
         where lokation_id = 'mosede' and noegle = 'dagens_ret'
           and vaerdi->>'navn' = 'Stegt flæsk med persillesovs') = 0
   and (select count(*) from public.kalender
         where lokation_id = 'mosede' and titel = 'Live musik på molen') = 0
   and (select count(*) from public.nyheder
         where lokation_id = 'mosede'
           and titel in ('Længere åbent i weekenden', 'Nyt i køledisken',
                         'Smørrebrød ud af huset')) = 0
    then '✅ DEMO-INDHOLDET ER VÆK — det personalet selv har skrevet, står der stadig'
    else '❌ NOGET STÅR TILBAGE — se tallene herunder'
  end                                                            as svar,
  (select count(*) from public.nyheder
    where lokation_id = 'mosede' and aktiv)                       as nyheder_tilbage,
  (select count(*) from public.kalender
    where lokation_id = 'mosede' and type = 'arrangement'
      and offentlig and dato >= current_date)                     as arrangementer_tilbage;
