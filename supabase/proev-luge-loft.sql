-- ============================================================
--  PRØVE: LOFTET PR. TIDSRUM VED LUGEN  (4. september 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet EFTER luge-loft.sql. Skriver ingenting,
--  der bliver stående: alt sker i en transaktion, der rulles
--  tilbage til sidst.
--
--  Skal skrive: ALLE 14 AF 14 BESTOD.
--
--  ⚠️ DEN LÅNER IKKE EJERENS DATA. Egen forretning, egne borde,
--     egne telefonnumre og en vare, der med vilje ikke kan stå på
--     et menukort. Læren fra proev-bord-uden-telefon.sql, som
--     faldt TRE gange hos kunden, fordi den lånte ejerens dag,
--     hans vare og hans borde — og hver gang med en fejlbesked,
--     der pegede et helt andet sted hen end fejlen.
-- ============================================================
begin;

do $$
begin
  if not exists (select 1 from pg_proc p
                  join pg_namespace ns on ns.oid = p.pronamespace
                 where ns.nspname = 'public'
                   and p.proname = 'mosede_luge_loft') then
    raise exception 'KOER supabase/luge-loft.sql FOERST — funktionen mosede_luge_loft findes ikke, saa proeven her kan ikke maale noget.';
  end if;
end $$;

create temp table _svar (nr int, navn text, bestod boolean, grund text)
  on commit drop;

-- ⚠️ lokationer har tre not null-felter (setup.sql linje 101).
insert into public.lokationer (id, navn, adresse, postnr, by)
values ('proev-lugl', 'Prøvehavnen', 'Prøvevej 1', '2670', 'Greve')
on conflict (id) do nothing;

-- Prøvens eget bord. Ejerens hedder 1-55 og er LÅST (koden er
-- sat), og en prøve, der skriver i hans rækker, arver alt, hvad
-- der står på dem.
insert into public.borde (lokation_id, nummer, aktiv)
values ('proev-lugl', 'PRØVE-L', true)
on conflict do nothing;

/* Én indsættelse med sit eget telefonnummer.

   ⚠️ NUMMERET SKAL VÆRE FORSKELLIGT PR. RÆKKE, og det er ikke
   pynt: `bestilling_bremse` holder fem pr. nummer pr. døgn, og
   dubletvagten er unik på (telefon, dato, tid). Med ét nummer
   ville prøven falde på en helt anden regel end den, den måler.

   ⚠️ OG VAREN KAN MED VILJE IKKE STÅ PÅ ET KORT. De tre
   navneværn (pris, udsolgt, kategoriens dage) rører aldrig et
   navn, de ikke kan finde. */
create or replace function pg_temp.best(
  ref text, tid text, dage int default 0,
  nr int default 1, bord text default null)
returns text language plpgsql as $$
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     antal, linjer, status, bord_nummer, hvordan)
  values
    (ref, 'proev-lugl', 'Prøve Person', '2100' || lpad(nr::text, 4, '0'),
     current_date + dage, tid::time, 2,
     '[{"navn":"PRØVE-VARE-UDEN-KORT","antal":2,"pris":50}]'::jsonb,
     'ny', bord,
     case when bord is null then 'afhentning' else 'spis_her' end);
  return null;
exception when others then
  return sqlerrm;
end $$;

create or replace function pg_temp.saetLoft(v text)
returns void language plpgsql as $$
begin
  if v is null then
    delete from public.indstillinger
     where lokation_id = 'proev-lugl' and noegle = 'luge_loft_pr_tid';
  else
    insert into public.indstillinger (lokation_id, noegle, vaerdi)
    values ('proev-lugl', 'luge_loft_pr_tid', to_jsonb(v))
    on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;
  end if;
end $$;

-- ------------------------------------------------------------
-- 1) Værnet er security definer med låst søgesti
-- ------------------------------------------------------------
insert into _svar
select 1, 'vaernet er security definer med laast search_path',
  exists (select 1 from pg_proc p
           join pg_namespace ns on ns.oid = p.pronamespace
          where ns.nspname = 'public'
            and p.proname = 'mosede_luge_loft'
            and p.prosecdef
            and array_to_string(p.proconfig, ',') like '%search_path=%'),
  null;

-- ------------------------------------------------------------
-- 2) ⚠️ IKKE SAT ER IKKE NUL. En indstilling, ingen har rørt,
--    må aldrig kunne lukke for noget — huset har den lov fra
--    bordloftet, hvor `Number(null)` blev 0 og lukkede hver
--    eneste dag.
-- ------------------------------------------------------------
do $$
declare g text; fejl int := 0;
begin
  perform pg_temp.saetLoft(null);
  for i in 1..5 loop
    g := pg_temp.best('PRV-LL-A' || i, '11:00', 0, i);
    if g is not null then fejl := fejl + 1; end if;
  end loop;
  insert into _svar values (2, 'uden et loft gaar fem til samme tid igennem',
    fejl = 0, fejl || ' af 5 blev afvist');
end $$;

-- ------------------------------------------------------------
-- 3) Nul er heller ikke et loft
-- ------------------------------------------------------------
do $$
declare g text;
begin
  perform pg_temp.saetLoft('0');
  g := pg_temp.best('PRV-LL-B1', '11:30', 0, 10);
  insert into _svar values (3, 'et loft paa nul er ikke et loft',
    g is null, coalesce(g, 'gik igennem'));
end $$;

-- ------------------------------------------------------------
-- 4) Med loftet på 2 går de to første igennem
-- ------------------------------------------------------------
do $$
declare g1 text; g2 text;
begin
  perform pg_temp.saetLoft('2');
  g1 := pg_temp.best('PRV-LL-C1', '12:00', 1, 11);
  g2 := pg_temp.best('PRV-LL-C2', '12:00', 1, 12);
  insert into _svar values (4, 'de to foerste gaar igennem',
    g1 is null and g2 is null,
    coalesce(g1, '') || ' / ' || coalesce(g2, ''));
end $$;

-- ------------------------------------------------------------
-- 5) Og den TREDJE bliver afvist. Det er filens grund.
-- ------------------------------------------------------------
do $$
declare g text;
begin
  g := pg_temp.best('PRV-LL-C3', '12:00', 1, 13);
  insert into _svar values (5, 'nummer tre bliver afvist',
    g is not null and g like 'bestilling_luge_fuldt%',
    coalesce(g, 'INGEN FEJL — den gik igennem'));
end $$;

-- ------------------------------------------------------------
-- 6) ⚠️ BESKEDEN SIGER TIDEN. Uden klokkeslættet ved gæsten
--    ikke, om hun skal lave dagen eller tiden om.
-- ------------------------------------------------------------
do $$
declare g text;
begin
  g := pg_temp.best('PRV-LL-C4', '12:00', 1, 14);
  insert into _svar values (6, 'beskeden naevner klokkeslaettet',
    coalesce(g, '') like '%12:00%', coalesce(g, 'INGEN FEJL'));
end $$;

-- ------------------------------------------------------------
-- 7) Et andet klokkeslæt samme dag er frit
-- ------------------------------------------------------------
do $$
declare g text;
begin
  g := pg_temp.best('PRV-LL-D1', '12:30', 1, 15);
  insert into _svar values (7, 'et andet klokkeslaet samme dag er frit',
    g is null, coalesce(g, 'gik igennem'));
end $$;

-- ------------------------------------------------------------
-- 8) Og den samme tid en anden dag er fri.
--    ⚠️ Uden den her prøve kunne værnet tælle hele dagen under
--    ét og bestå prøve 5 alligevel.
-- ------------------------------------------------------------
do $$
declare g text;
begin
  g := pg_temp.best('PRV-LL-E1', '12:00', 2, 16);
  insert into _svar values (8, 'samme tid en anden dag er fri',
    g is null, coalesce(g, 'gik igennem'));
end $$;

-- ------------------------------------------------------------
-- 9) ⚠️ ET AFSLAG FRIGIVER TIDEN IGEN. Samme regel som
--    reservationernes pladser: en afvist bestilling laves
--    aldrig, så den må ikke holde et tidsrum optaget. Uden den
--    ville et fejltryk lukke kl. 12.00 for altid.
-- ------------------------------------------------------------
do $$
declare g text;
begin
  update public.bestillinger set status = 'afvist'
   where reference = 'PRV-LL-C1';
  g := pg_temp.best('PRV-LL-C5', '12:00', 1, 17);
  insert into _svar values (9, 'et afslag frigiver tiden igen',
    g is null, coalesce(g, 'gik igennem'));
end $$;

-- ------------------------------------------------------------
-- 10) En slettet bestilling holder heller ikke tiden.
--     Skraldespanden er 30 dages fortrydelse, ikke en plads i
--     køen.
-- ------------------------------------------------------------
do $$
declare g text;
begin
  update public.bestillinger set slettet = now()
   where reference = 'PRV-LL-C2';
  g := pg_temp.best('PRV-LL-C6', '12:00', 1, 18);
  insert into _svar values (10, 'en slettet bestilling holder ikke tiden',
    g is null, coalesce(g, 'gik igennem'));
end $$;

-- ------------------------------------------------------------
-- 11) ⚠️ BORDET RAMMES IKKE. Et bord vælger ingen hentetid —
--     den er klokken NU — så et loft pr. tidsrum ville lukke
--     frokosten for dem, der SIDDER der.
--
--     ⚠️ OG TIDSRUMMET SKAL VÆRE FYLDT FØRST, ellers måler prøven
--     INGENTING. Første udgave sendte bare tre bordbestillinger
--     til et tomt kl. 14.00 — og de gik selvfølgelig igennem,
--     også med springet over bordene FJERNET, fordi tællingen
--     alligevel kun ser lugens rækker. Falsifikationen fandt det;
--     kørslen gjorde ikke. Nu står der ÉN bestilling fra lugen i
--     tidsrummet, og loftet er ét: uden springet bliver det
--     første bord afvist.
-- ------------------------------------------------------------
do $$
declare gl text; g1 text; g2 text; g3 text;
begin
  perform pg_temp.saetLoft('1');
  gl := pg_temp.best('PRV-LL-F0', '14:00', 1, 19);          -- lugen fylder tiden
  g1 := pg_temp.best('PRV-LL-F1', '14:00', 1, 20, 'PRØVE-L');
  g2 := pg_temp.best('PRV-LL-F2', '14:00', 1, 21, 'PRØVE-L');
  g3 := pg_temp.best('PRV-LL-F3', '14:00', 1, 22, 'PRØVE-L');
  insert into _svar values (11, 'bordet rammes ikke af et fyldt tidsrum',
    gl is null and g1 is null and g2 is null and g3 is null,
    'lugen: ' || coalesce(gl, 'ok') || ' · bordene: '
      || coalesce(g1, 'ok') || ' / ' || coalesce(g2, 'ok')
      || ' / ' || coalesce(g3, 'ok'));
end $$;

-- ------------------------------------------------------------
-- 12) Og visningen tæller heller ikke bordene med.
--     ⚠️ Gjorde den det, ville vælgeren sige FULDT om et
--     tidsrum, lugen har helt fri — og værnet ville tage imod.
--     De to skal svare det samme, ellers ser begge rigtige ud
--     hver for sig.
-- ------------------------------------------------------------
insert into _svar
select 12, 'visningen taeller ikke bordene med',
  coalesce((select taget from public.luge_fyldte_tider
             where lokation_id = 'proev-lugl'
               and dato = current_date + 1
               and tid = '14:00'), -1) = 1,
  'visningen siger: ' || coalesce((select taget::text from public.luge_fyldte_tider
             where lokation_id = 'proev-lugl'
               and dato = current_date + 1
               and tid = '14:00'), 'INGEN RAEKKE') || ' (skal vaere 1)';

-- ------------------------------------------------------------
-- 13) ⚠️ VISNINGEN MÅ ALDRIG FÅ EN KOLONNE MERE. Den kører med
--     sin EJERS øjne og springer adgangsreglerne over — kommer
--     der et navn eller et telefonnummer med, er dagens
--     bestillingsliste åben for internettet.
-- ------------------------------------------------------------
insert into _svar
select 13, 'visningen har praecis fire kolonner',
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'luge_fyldte_tider') = 4,
  'kolonner: ' || (select string_agg(column_name, ', ' order by ordinal_position)
                     from information_schema.columns
                    where table_schema = 'public'
                      and table_name = 'luge_fyldte_tider');

-- ------------------------------------------------------------
-- 14) Og visningen tæller det SAMME som værnet.
--     ⚠️ To udgaver af "hvor mange er der taget" ville betyde,
--     at vælgeren sagde ledigt, mens databasen sagde nej — og
--     begge ville se rigtige ud hver for sig.
--     Kl. 12.00 i morgen: C1 er afvist, C2 er slettet, tilbage
--     står C4? nej (afvist ved indsættelse), C5 og C6. Altså 2.
-- ------------------------------------------------------------
insert into _svar
select 14, 'visningen taeller det samme som vaernet',
  coalesce((select taget from public.luge_fyldte_tider
             where lokation_id = 'proev-lugl'
               and dato = current_date + 1
               and tid = '12:00'), -1) = 2,
  'visningen siger: ' || coalesce((select taget::text from public.luge_fyldte_tider
             where lokation_id = 'proev-lugl'
               and dato = current_date + 1
               and tid = '12:00'), 'INGEN RAEKKE');

-- ------------------------------------------------------------
--  RAPPORT
-- ------------------------------------------------------------
/* ⚠️ EN NULL ER HVERKEN BESTOD ELLER FEJLEDE, og uden coalesce
   tælles den ingen af stederne — så rapporten kan sige "0 AF 14
   FEJLEDE", mens der står FEJLEDE i tabellen ovenfor. Arret fra
   proev-bestilling-status.sql. */
select nr, navn,
  case when coalesce(bestod, false) then 'BESTOD' else 'FEJLEDE' end as udfald,
  grund
from _svar order by nr;

select
  'Proevens dato: ' || current_date || ' · forretning: proev-lugl · bord: PRØVE-L' as udgave,
  case
    when (select count(*) from _svar where coalesce(bestod, false)) = 14
    then 'ALLE 14 AF 14 BESTOD'
    else (select count(*) from _svar where not coalesce(bestod, false))
         || ' AF 14 FEJLEDE — se grund-kolonnen ovenfor'
  end as resultat;

rollback;
