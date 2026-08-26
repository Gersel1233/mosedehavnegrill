-- ============================================================
--  PRØVE AF ANTAL TILBAGE OG DAGE PR. KATEGORI  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER menukort-antal-og-dage.sql. Rapporten kommer til
--  sidst som én "fejl" — den ene kanal, Supabases SQL Editor
--  altid viser, og afbrydelsen er samtidig det, der rydder op.
--
--  DET, DER SKAL MÅLES, ER DE TO TING, DER GØR NOGET AF SIG SELV:
--  tællingen og de to værn. Kolonner og regler kan man se ved at
--  kigge; en bremse, der tæller forkert, ser rigtig ud.
--
--  ⚠️ PRØVE 0 ER EN POSITIV KONTROL. Uden den ville en prøve, der
--  bare siger "det blev afvist", bestå af den forkerte grund den
--  dag et andet værn afviser ALT — og så måler resten ingenting.
-- ============================================================

begin;

create or replace function pg_temp.svar(navn text, ok boolean) returns text
language plpgsql as $$
declare linje text := case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
begin
  perform set_config('proev.rapport',
    coalesce(current_setting('proev.rapport', true), '') || linje || E'\n', true);
  raise notice '%', linje;
  return linje;
end $$;

/* HVER BESTILLING FÅR SIT EGET NUMMER OG SIT EGET KVARTER. To
   værn står ellers i vejen, og begge har ret til det:
   bestilling_ikke_dobbelt (samme telefon + dag + tid) og
   bestilling_bremse (antal pr. nummer i døgnet). Prøven er ikke
   én gæst, der bestiller ti gange — det er ti gæster. */
create sequence if not exists pg_temp.proev_nr;

create or replace function pg_temp.bestil(p_dato date, p_navn text, p_antal int)
returns void language plpgsql as $$
declare n int := nextval('pg_temp.proev_nr');
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid, linjer, antal)
  values ('SM-PROEV-' || lpad(n::text, 5, '0'), 'mosede',
          'Prøve Gæst ' || n, '0000' || lpad(n::text, 4, '0'),
          p_dato, ('11:00'::time + (n || ' minutes')::interval)::time,
          jsonb_build_array(jsonb_build_object('navn', p_navn, 'antal', p_antal, 'pris', 89)),
          p_antal);
end $$;

/* Sandt hvis bestillingen blev AFVIST — og prøven siger hvorfor
   i sit eget navn, så en afvisning af den forkerte grund kan ses
   i rapporten. */
create or replace function pg_temp.afvist(p_dato date, p_navn text, p_antal int)
returns boolean language plpgsql as $$
begin
  perform pg_temp.bestil(p_dato, p_navn, p_antal);
  return false;
exception when others then
  return true;
end $$;

-- ------------------------------------------------------------
--  OPSTILLINGEN
--  Egne kategorier og varer, så prøven ikke hviler på, hvad der
--  tilfældigvis står i ejerens menukort.
-- ------------------------------------------------------------
insert into public.menu_kategorier (lokation_id, navn, afdeling, sortering, aktiv, dage)
values ('mosede', 'PRØVE Hverdagsmad', 'mad', 900, true, 'hverdage'),
       ('mosede', 'PRØVE Altid',       'mad', 901, true, 'alle');

/* ⚠️ DEN HER SÆTTER IKKE dage, OG DET ER HELE POINTEN.

   Første udgave af prøve 3 læste 'PRØVE Altid' — som blev
   oprettet MED dage = 'alle' lige ovenfor. Den læste altså sit
   eget svar tilbage og bestod, uanset hvad standardværdien var.

   Målt: sættes default til 'hverdage', bestod alle 20 alligevel.
   Og dét er den dyreste fejl, filen kan lave — 21 kategorier,
   ingen har rørt, ville tømme menukortet hver lørdag. */
insert into public.menu_kategorier (lokation_id, navn, afdeling, sortering, aktiv)
values ('mosede', 'PRØVE Urørt', 'mad', 902, true);

insert into public.menu_varer (kategori_id, navn, pris, aktiv, sortering)
select id, 'PRØVE Hverdagsburger', 99, true, 1
  from public.menu_kategorier where navn = 'PRØVE Hverdagsmad';

insert into public.menu_varer (kategori_id, navn, pris, aktiv, sortering, antal_tilbage)
select id, 'PRØVE Kage', 45, true, 1, 10
  from public.menu_kategorier where navn = 'PRØVE Altid';

insert into public.menu_varer (kategori_id, navn, pris, aktiv, sortering)
select id, 'PRØVE Pølse', 35, true, 2
  from public.menu_kategorier where navn = 'PRØVE Altid';

/* Nærmeste mandag og lørdag frem i tiden. Faste datoer ville
   gøre prøven afhængig af, hvornår den køres — og den skal give
   det samme svar på en tirsdag i november. */
create or replace function pg_temp.naeste(p_isodow int)
returns date language sql immutable as $$
  select (current_date + ((p_isodow - extract(isodow from current_date)::int + 7) % 7 + 7))::date;
$$;

-- ------------------------------------------------------------
--  0) POSITIV KONTROL
-- ------------------------------------------------------------
select pg_temp.svar('0. En almindelig bestilling går IGENNEM (positiv kontrol)',
  not pg_temp.afvist(pg_temp.naeste(1), 'PRØVE Pølse', 2));

-- ------------------------------------------------------------
--  KOLONNERNE
-- ------------------------------------------------------------
select pg_temp.svar('1. antal_tilbage findes på menu_varer',
  (select count(*) = 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'menu_varer'
      and column_name = 'antal_tilbage'));

select pg_temp.svar('2. dage findes på menu_kategorier',
  (select count(*) = 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'menu_kategorier'
      and column_name = 'dage'));

/* ⚠️ DEFAULT SKAL VÆRE 'alle'. Var den 'hverdage', ville hele
   menukortet tømme sig selv om lørdagen i det sekund, filen blev
   kørt — på 21 kategorier, ingen havde rørt. */
select pg_temp.svar('3. En kategori, ingen har rørt, gælder ALLE dage',
  (select dage = 'alle' from public.menu_kategorier
    where navn = 'PRØVE Urørt'));

do $$
declare gik boolean := false;
begin
  begin
    update public.menu_kategorier set dage = 'kun-tirsdag' where navn = 'PRØVE Altid';
    exception when check_violation then gik := true;
  end;
  perform pg_temp.svar('4. En dageværdi, der ikke findes, afvises', gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    update public.menu_varer set antal_tilbage = -1 where navn = 'PRØVE Kage';
    exception when check_violation then gik := true;
  end;
  /* Et negativt tal ville gøre en udsolgt vare bestilbar igen —
     og se ud som et almindeligt tal i admin imens. */
  perform pg_temp.svar('5. Et negativt antal afvises', gik);
end $$;

-- ------------------------------------------------------------
--  TÆLLINGEN
-- ------------------------------------------------------------
select pg_temp.bestil(pg_temp.naeste(1), 'PRØVE Kage', 3);

select pg_temp.svar('6. En bestilling tæller varen ned',
  (select antal_tilbage = 7 from public.menu_varer where navn = 'PRØVE Kage'));

/* NAVNET SAMMENLIGNES UDEN HENSYN TIL STORE BOGSTAVER OG
   MELLEMRUM — som de tre andre værn gør det. En vare, der hedder
   "PRØVE Kage " med et mellemrum til sidst, ville ellers aldrig
   blive talt ned. */
select pg_temp.bestil(pg_temp.naeste(1), '  prøve kage ', 2);

select pg_temp.svar('7. Store bogstaver og mellemrum tæller også',
  (select antal_tilbage = 5 from public.menu_varer where navn = 'PRØVE Kage'));

/* En vare UDEN et tal tælles ikke. Det er pølsen, køkkenet laver
   i det uendelige — og et nul dér ville melde den udsolgt. */
select pg_temp.bestil(pg_temp.naeste(1), 'PRØVE Pølse', 4);

select pg_temp.svar('8. En vare uden et tal røres ikke',
  (select antal_tilbage is null and not udsolgt
     from public.menu_varer where navn = 'PRØVE Pølse'));

-- ------------------------------------------------------------
--  VED NUL LUKKER VAREN SIG SELV
-- ------------------------------------------------------------
select pg_temp.bestil(pg_temp.naeste(1), 'PRØVE Kage', 5);

select pg_temp.svar('9. Ved nul sætter varen sig selv udsolgt',
  (select antal_tilbage = 0 and udsolgt
     from public.menu_varer where navn = 'PRØVE Kage'));

-- ------------------------------------------------------------
--  VÆRNET MOD FOR MANGE
-- ------------------------------------------------------------
update public.menu_varer set antal_tilbage = 4, udsolgt = false
 where navn = 'PRØVE Kage';

select pg_temp.svar('10. Fire tilbage: fem bliver afvist',
  pg_temp.afvist(pg_temp.naeste(1), 'PRØVE Kage', 5));

/* ⚠️ OG AFVISNINGEN MÅ IKKE HAVE TAGET NOGET. Værnet er BEFORE
   og tællingen AFTER; byttede de plads, ville en afvist
   bestilling have trukket fra alligevel, og køkkenet ville
   mangle fire kager, ingen havde bestilt. */
select pg_temp.svar('11. En afvist bestilling har ikke talt ned',
  (select antal_tilbage = 4 from public.menu_varer where navn = 'PRØVE Kage'));

select pg_temp.svar('12. Fire tilbage: fire går igennem',
  not pg_temp.afvist(pg_temp.naeste(1), 'PRØVE Kage', 4));

-- ------------------------------------------------------------
--  DAGE PR. KATEGORI
-- ------------------------------------------------------------
select pg_temp.svar('13. Hverdagsmad kan bestilles til en MANDAG',
  not pg_temp.afvist(pg_temp.naeste(1), 'PRØVE Hverdagsburger', 1));

select pg_temp.svar('14. … og IKKE til en LØRDAG',
  pg_temp.afvist(pg_temp.naeste(6), 'PRØVE Hverdagsburger', 1));

select pg_temp.svar('15. En kategori på alle dage kan bestilles om lørdagen',
  not pg_temp.afvist(pg_temp.naeste(6), 'PRØVE Pølse', 1));

/* ⚠️ DER FILTRERES PÅ BESTILLINGENS DATO, IKKE PÅ I DAG. Prøve 13
   og 14 er kørt den SAMME dag — det er hentedatoen, der skiller
   dem. Læste værnet current_date, ville begge give det samme
   svar, og prøven ville bestå den ene dag og falde den næste. */
select pg_temp.svar('16. Hjælperen svarer på DATOEN og ikke på i dag',
  (select public.mosede_kategori_paa_dagen('hverdage', pg_temp.naeste(1))
      and not public.mosede_kategori_paa_dagen('hverdage', pg_temp.naeste(6))
      and public.mosede_kategori_paa_dagen('weekend', pg_temp.naeste(7))
      and public.mosede_kategori_paa_dagen('alle', pg_temp.naeste(6))));

/* Et navn, der IKKE står på kortet, skal slippe igennem. Dagens
   ret bor i sin egen tabel, og afviste værnet alt, det ikke kunne
   finde, ville en ret, ejeren skrev i hånden, blive umulig at
   bestille. Samme regel som pris- og udsolgt-værnet. */
select pg_temp.svar('17. Et navn, der ikke står på kortet, røres ikke',
  not pg_temp.afvist(pg_temp.naeste(6), 'PRØVE Noget Ejeren Skrev I Haanden', 1));

-- ------------------------------------------------------------
--  DET SAMME NAVN I TO KATEGORIER
-- ------------------------------------------------------------
insert into public.menu_varer (kategori_id, navn, pris, aktiv, sortering)
select id, 'PRØVE Hverdagsburger', 99, true, 5
  from public.menu_kategorier where navn = 'PRØVE Altid';

/* Står burgeren OGSÅ i en kategori, der laves alle dage, kan den
   købes om lørdagen. "Hver eneste" og ikke "den første" — samme
   greb som udsolgt-værnet, og af samme grund. */
select pg_temp.svar('18. Samme navn i en anden kategori åbner lørdagen igen',
  not pg_temp.afvist(pg_temp.naeste(6), 'PRØVE Hverdagsburger', 1));

/* ⚠️ OG ET TAL PÅ DEN ENE RÆKKE MÅ IKKE BLIVE ET LOFT PÅ BEGGE.
   Den nye burger har intet antal. Talte værnet bare max() over
   rækkerne, ville en udsolgt tvilling sætte loftet til 0 og gøre
   varen ubestillelig — uden at nogen havde meldt den udsolgt. */
update public.menu_varer set antal_tilbage = 1
 where navn = 'PRØVE Hverdagsburger'
   and kategori_id = (select id from public.menu_kategorier where navn = 'PRØVE Hverdagsmad');

select pg_temp.svar('19. Har én række intet tal, tælles der ikke på varen',
  not pg_temp.afvist(pg_temp.naeste(6), 'PRØVE Hverdagsburger', 9));

-- ------------------------------------------------------------
--  RAPPORTEN — afbrydelsen ER oprydningen.
-- ------------------------------------------------------------
do $$
declare
  rapport text := rtrim(coalesce(current_setting('proev.rapport', true), ''), E'\n');
  linjer  text[] := case when rapport = '' then '{}'::text[]
                         else string_to_array(rapport, E'\n') end;
  antal   int := coalesce(array_length(linjer, 1), 0);
  fejl    int;
begin
  select count(*) into fejl from unnest(linjer) as l where l like 'FEJLEDE%';
  raise exception E'\n===== RESULTATET AF MENUKORTETS ANTAL- OG DAGE-PRØVE =====\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alt er som før.\n\n'
    '%\n\n%\n'
    '==========================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 20 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
