-- ============================================================
--  SORTIMENT PR. UGEDAG   (5. september 2026)
-- ============================================================
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER: menukort-antal-og-dage.sql
--  Kør derefter: proev-kategori-ugedage.sql (skal skrive 12 × BESTOD)
--
--  HVORFOR FILEN FINDES
--  ------------------------------------------------------------
--  Kundens ord 5/9: "derudover skal de vælge hvilket mad der
--  f.eks er de forskellige dage — sådan fx weekenderne er det kun
--  friture eller det 'nemme', så man ik kan bestille dagensret og
--  burger de dage, eller mandag til torsdag have alt sortiment
--  men ikke dürüm."
--
--  Kolonnen `dage` kunne tre ting: alle | hverdage | weekend.
--  MANDAG TIL TORSDAG ER INGEN AF DEM — 'hverdage' er man-fre, og
--  fredag er netop den dag, en grillbar har travlt. Ejeren kunne
--  altså ikke skrive det, han bad om.
--
--  ⚠️ DE TRE ORD BLIVER. Der står rækker i produktionen med
--  'hverdage' og 'weekend' i dag, og en migrering, der byttede
--  dem ud, ville ændre hvad der kan bestilles på en forretning i
--  drift — uden at nogen havde bedt om det. De er genveje nu, og
--  betyder præcis det samme som før.
--
--  ⚠️ DET NYE FORMAT ER CIFRE: '1' = mandag … '7' = søndag, i
--  stigende rækkefølge og uden gentagelser. Mandag-torsdag er
--  '1234'; lørdag og søndag er '67'.
--
--  Hvorfor cifre og ikke syv boolean-kolonner: syv kolonner skal
--  bæres med af HVER eneste skrivning til rækken, ellers tørres
--  de af — arret fra bordloftet 1/9 og fra `vis_fra` på nyheder
--  28/8. Én tekstkolonne kan ikke komme i det uføre.
--
--  ⚠️ OG '' (TOM) ER IKKE LOVLIG. En kategori uden en eneste dag
--  kan aldrig bestilles, og så ville ejeren have slukket den uden
--  at kunne se hvorfor — fluebenet "aktiv" er stedet at gøre det.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) CHECK'ET UDVIDES — de tre ord PLUS et cifferformat
--    ---------------------------------------------------------
--    ⚠️ MØNSTRET KRÆVER STIGENDE OG UNIKKE CIFRE. Uden det ville
--    '11' og '21' være lovlige, og to skærme kunne læse dem
--    forskelligt. Regexen tillader kun hvert ciffer én gang og
--    kun i rækkefølge.
-- ------------------------------------------------------------
alter table public.menu_kategorier
  drop constraint if exists kategori_dage_ok;

alter table public.menu_kategorier
  add constraint kategori_dage_ok
  check (
    dage in ('alle', 'hverdage', 'weekend')
    or dage ~ '^1?2?3?4?5?6?7?$' and dage <> ''
  );

comment on column public.menu_kategorier.dage is
  'Hvilke dage kategorien kan bestilles. alle | hverdage (man-fre) | weekend (lør-søn) — eller cifre 1-7 i rækkefølge (isodow), fx 1234 = man-tors.';


-- ------------------------------------------------------------
-- 2) HJÆLPEREN LÆSER BEGGE FORMATER
--    ---------------------------------------------------------
--    ⚠️ ÉN FUNKTION, FORDI TO STEDER SPØRGER — bremsen og
--    js/store.js. Et "hverdag", der betyder noget forskelligt i
--    databasen og i browseren, er den slags fejl, der ser helt
--    rigtig ud på skærmen.
--
--    isodow: 1 = mandag … 7 = søndag. Bruges frem for dow, som
--    har søndag = 0 og gør weekend til et opdelt interval.
-- ------------------------------------------------------------
create or replace function public.mosede_kategori_paa_dagen(p_dage text, p_dato date)
returns boolean
language sql
immutable
as $$
  select case coalesce(nullif(btrim(p_dage), ''), 'alle')
    when 'alle'     then true
    when 'hverdage' then extract(isodow from p_dato) between 1 and 5
    when 'weekend'  then extract(isodow from p_dato) between 6 and 7
    else strpos(btrim(p_dage),
                extract(isodow from p_dato)::int::text) > 0
  end;
$$;

comment on function public.mosede_kategori_paa_dagen(text, date) is
  'Er kategorien åben den dato? alle=altid, hverdage=man-fre, weekend=lør-søn, eller cifre 1-7 (isodow).';

commit;


-- ============================================================
--  RAPPORT
-- ============================================================
select
  'Kategorier i alt'                      as hvad,
  count(*)::text                          as svar
from public.menu_kategorier
union all
select 'Med de tre gamle ord',
  count(*)::text from public.menu_kategorier
  where dage in ('alle', 'hverdage', 'weekend')
union all
select 'Med egne ugedage (cifre)',
  count(*)::text from public.menu_kategorier
  where dage ~ '^[1-7]+$'
union all
select 'Man-tors kan nu skrives (1234)',
  case when public.mosede_kategori_paa_dagen('1234', date '2026-09-07')  -- mandag
        and public.mosede_kategori_paa_dagen('1234', date '2026-09-10')  -- torsdag
        and not public.mosede_kategori_paa_dagen('1234', date '2026-09-11') -- fredag
       then '✅ ja' else '❌ NEJ' end
union all
select 'De gamle ord virker uændret',
  case when public.mosede_kategori_paa_dagen('hverdage', date '2026-09-11')
        and not public.mosede_kategori_paa_dagen('hverdage', date '2026-09-12')
        and public.mosede_kategori_paa_dagen('weekend', date '2026-09-12')
       then '✅ ja' else '❌ NEJ' end;
