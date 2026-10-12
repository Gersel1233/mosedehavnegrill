-- ============================================================
--  PRØVE: ARRANGØREN, STEDERNE, VENTELISTEN OG BREMSEN  (12. okt 2026)
--  ------------------------------------------------------------
--  Kør EFTER arrangoer.sql. Rapporten kommer til sidst som én
--  "fejl" — den ene kanal, Supabases SQL Editor altid viser — og
--  afbrydelsen ruller alt tilbage.
--
--  ⚠️ DEN HALVDEL, DER BETYDER NOGET, ER "KAN IKKE": at arrangøren
--  kan lægge et arrangement ind, er rart; at hun IKKE kan læse en
--  gæsts udlejning eller lukke caféen, er værnet. Derfor parvis.
--
--  ⚠️ RLS SVARER IKKE MED EN FEJL på en læsning — den rammer bare
--  ingen rækker. Så VÆRDIEN måles, i sin egen sætning (roller.sql's
--  ar fra 2/9: én select så sit eget øjebliksbillede fra før).
--
--  Prøven laver sin egen forretning og rører ikke Mosedes rækker.
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

/* Svarer med BESKEDEN — en prøve, der kun spørger "blev det afvist?",
   består af enhver grund (2/9). */
create or replace function pg_temp.proev(sql text) returns text
language plpgsql as $$
begin
  execute sql;
  return 'gik igennem';
exception when others then return coalesce(sqlerrm, '?');
end $$;

create or replace function pg_temp.tal(sql text) returns bigint
language plpgsql as $$
declare n bigint;
begin
  execute sql into n;
  return n;
end $$;

-- ------------------------------------------------------------
--  Prøvens egen forretning, hold og kulisse (som superbruger)
-- ------------------------------------------------------------
insert into public.lokationer (id, navn, adresse, postnr, by, aktiv, sortering)
values ('proev-arrg', 'Prøvehavn', 'Prøvevej 1', '2670', 'Greve', true, 99),
       ('proev-andet', 'Anden havn', 'Andenvej 1', '2670', 'Greve', true, 98);

insert into public.admin_adgang (email, lokation_id, rolle, aktiv, navn) values
  ('chef@proev.dk',  'proev-arrg', 'ejer',        true, 'Chefen'),
  ('lone@proev.dk',  'proev-arrg', 'medarbejder', true, 'Lone'),
  ('anna@proev.dk',  'proev-arrg', 'arrangoer',   true, 'Anna');

insert into public.arrangement_steder (lokation_id, navn, baglokale, hele_stedet, sortering)
values ('proev-arrg', 'Terrassen', false, false, 1),
       ('proev-arrg', 'Baglokalet', true, false, 2),
       ('proev-andet', 'Fremmed sted', false, false, 1);

/* En gæsts udlejning — persondata, som medarbejderen skal kunne se
   og arrangøren ikke. */
insert into public.udlejninger (lokation_id, reference, navn, telefon, dato, antal_personer, besked)
values ('proev-arrg', 'PROEV-AU1', 'Gæst Hansen', '11112222', current_date + 3, 30, 'Fødselsdag');

/* En lukkedag, som arrangøren ikke må røre. */
insert into public.kalender (lokation_id, type, dato, titel)
values ('proev-arrg', 'lukkedag', current_date + 40, 'Lukket for sæsonen');

/* Arrangementerne, bremsen prøves på — lagt ind som superbruger, så
   bremsens regler måles alene. */
insert into public.kalender (lokation_id, type, dato, start_kl, titel, offentlig, tilmelding, pladser,
                             venteliste, max_pr_tilmelding, tilmelding_lukker_timer, aflyst)
values
  ('proev-arrg', 'arrangement', current_date + 10, '19:00', 'Fuld med venteliste', true, true, 4,  true,  null, null, false),
  ('proev-arrg', 'arrangement', current_date + 10, '19:00', 'Fuld uden venteliste', true, true, 4, false, null, null, false),
  ('proev-arrg', 'arrangement', current_date + 10, '19:00', 'Højst tre pr. tilmelding', true, true, 50, false, 3, null, false),
  ('proev-arrg', 'arrangement', current_date + 10, '19:00', 'Uden eget loft', true, true, 100, false, null, null, false),
  ('proev-arrg', 'arrangement', current_date + 1,  '19:00', 'Fristen er gået', true, true, 50, false, null, 48, false),
  ('proev-arrg', 'arrangement', current_date + 10, '19:00', 'Fristen er ikke gået', true, true, 50, false, null, 48, false),
  ('proev-arrg', 'arrangement', current_date + 10, '19:00', 'Aflyst koncert', true, true, 50, false, null, null, true),
  ('proev-arrg', 'arrangement', current_date + 10, '19:00', 'Har tilmeldte', true, true, 50, false, null, null, false),
  ('proev-arrg', 'arrangement', current_date + 10, '19:00', 'Uden tilmeldte', true, true, 50, false, null, null, false);

/* Tre telefoner, fem fra den første — bremsen giver nummer seks et nej
   for en gæst. Fem forskellige arrangementer (dubletvagten er pr.
   arrangement). */
insert into public.kalender (lokation_id, type, dato, start_kl, titel, offentlig, tilmelding)
select 'proev-arrg', 'arrangement', current_date + 20 + g, '19:00', 'Spam ' || g, true, true
  from generate_series(1, 7) g;

set local role authenticated;


-- ============================================================
--  ROLLEN
-- ============================================================
set local request.jwt.claims = '{"email":"anna@proev.dk"}';

select pg_temp.svar('1. Arrangøren er arrangør, og admin ved det',
  public.min_rolle() = 'arrangoer');

select pg_temp.svar('2. Arrangøren kan arrangere — men er IKKE admin (alle 18 tabellers dør)',
  public.kan_arrangere_for('proev-arrg') and not public.is_admin_for('proev-arrg')
  and not public.is_admin());

select pg_temp.svar('3. Arrangøren kan IKKE læse en gæsts udlejning',
  pg_temp.tal($$select count(*) from public.udlejninger where lokation_id = 'proev-arrg'$$) = 0);

set local request.jwt.claims = '{"email":"lone@proev.dk"}';
select pg_temp.svar('4. … men medarbejderen kan stadig (intet er taget fra hende)',
  pg_temp.tal($$select count(*) from public.udlejninger where lokation_id = 'proev-arrg'$$) = 1
  and public.is_admin_for('proev-arrg') and public.min_rolle() = 'medarbejder');


-- ============================================================
--  KALENDEREN: ARRANGEMENTER JA, LUKKEDAGE NEJ
-- ============================================================
set local request.jwt.claims = '{"email":"anna@proev.dk"}';

select pg_temp.svar('5. Arrangøren kan lægge et arrangement ind på et sted',
  pg_temp.proev($$insert into public.kalender (lokation_id, type, dato, titel, offentlig, sted_id)
                   select 'proev-arrg', 'arrangement', current_date + 14, 'Annas quiz', true, s.id
                     from public.arrangement_steder s
                    where s.lokation_id = 'proev-arrg' and s.navn = 'Terrassen'$$) = 'gik igennem');

select pg_temp.svar('6. Serveren skriver, hvem der lagde det ind — ikke browseren',
  pg_temp.tal($$select count(*) from public.kalender
                 where titel = 'Annas quiz' and oprettet_af = 'anna@proev.dk'$$) = 1);

select pg_temp.svar('7. Arrangøren kan IKKE lukke caféen (en lukkedag)',
  pg_temp.proev($$insert into public.kalender (lokation_id, type, dato, titel)
                   values ('proev-arrg', 'lukkedag', current_date + 15, 'Lukket')$$)
  like '%row-level security%');

select pg_temp.svar('8. … og kan IKKE rette sit arrangement OM til en lukkedag',
  pg_temp.proev($$update public.kalender set type = 'lukkedag'
                   where titel = 'Annas quiz'$$) like '%row-level security%');

update public.kalender set titel = 'Åbent alligevel'
 where lokation_id = 'proev-arrg' and type = 'lukkedag';
select pg_temp.svar('9. … og kan IKKE flytte på en lukkedag (ingen rækker rammes)',
  pg_temp.tal($$select count(*) from public.kalender
                 where lokation_id = 'proev-arrg' and type = 'lukkedag'
                   and titel = 'Åbent alligevel'$$) = 0);

select pg_temp.svar('10. Et sted fra en anden forretning afvises',
  pg_temp.proev($$insert into public.kalender (lokation_id, type, dato, titel, sted_id)
                   select 'proev-arrg', 'arrangement', current_date + 16, 'Forkert sted', s.id
                     from public.arrangement_steder s where s.navn = 'Fremmed sted'$$)
  like '%sted_findes_ikke%');

select pg_temp.svar('11. "Book bord" og en tilmelding på én gang afvises',
  pg_temp.proev($$insert into public.kalender (lokation_id, type, dato, titel, tilmelding, bord_booking)
                   values ('proev-arrg', 'arrangement', current_date + 17, 'To knapper', true, true)$$)
  like '%kalender_bord_eller_tilmelding%');


-- ============================================================
--  STEDERNE: OMDØBES AF ARRANGØREN, LÆSES AF ALLE
-- ============================================================
select pg_temp.svar('12. Arrangøren kan omdøbe et sted',
  pg_temp.proev($$update public.arrangement_steder set navn = 'Træterrassen'
                   where lokation_id = 'proev-arrg' and navn = 'Terrassen'$$) = 'gik igennem'
  and pg_temp.tal($$select count(*) from public.arrangement_steder
                    where lokation_id = 'proev-arrg' and navn = 'Træterrassen'$$) = 1);

select pg_temp.svar('13. Arrangementet følger med, når stedet skifter navn',
  pg_temp.tal($$select count(*) from public.kalender k
                  join public.arrangement_steder s on s.id = k.sted_id
                 where k.titel = 'Annas quiz' and s.navn = 'Træterrassen'$$) = 1);

reset role;
set local role anon;
set local request.jwt.claims = '{}';

select pg_temp.svar('14. En gæst kan læse stederne (de står på siden)',
  pg_temp.tal($$select count(*) from public.arrangement_steder where lokation_id = 'proev-arrg'$$) = 2);

select pg_temp.svar('15. … men kan IKKE omdøbe dem',
  pg_temp.proev($$update public.arrangement_steder set navn = 'Hacket'
                   where lokation_id = 'proev-arrg'$$) <> 'gik igennem'
  or pg_temp.tal($$select count(*) from public.arrangement_steder where navn = 'Hacket'$$) = 0);


-- ============================================================
--  BREMSEN — SOM GÆST
-- ============================================================
create or replace function pg_temp.meld(titel text, tlf text, antal int, status text default 'ny')
returns text language plpgsql as $$
begin
  return pg_temp.proev(format(
    $f$insert into public.reservationer (lokation_id, kalender_id, reference, navn, telefon, antal_personer, status)
       select 'proev-arrg', k.id, 'RE-' || md5(random()::text), 'Gæst', %L, %s, %L
         from public.kalender k where k.lokation_id = 'proev-arrg' and k.titel = %L$f$,
    tlf, antal, status, titel));
end $$;

select pg_temp.svar('16. Et aflyst arrangement tager ikke imod',
  pg_temp.meld('Aflyst koncert', '20000001', 2) like '%reservation_aflyst%');

select pg_temp.svar('17. Fristen er gået (48 timer før, i morgen) — nej',
  pg_temp.meld('Fristen er gået', '20000002', 2) like '%reservation_frist%');

select pg_temp.svar('18. … og før fristen — ja',
  pg_temp.meld('Fristen er ikke gået', '20000003', 2) = 'gik igennem');

select pg_temp.svar('19. Flere end arrangementets eget loft pr. tilmelding (3) — nej',
  pg_temp.meld('Højst tre pr. tilmelding', '20000004', 4) like '%reservation_for_mange%');

select pg_temp.svar('20. Uden eget loft gælder 20 som før — 21 er nej, 20 er ja',
  pg_temp.meld('Uden eget loft', '20000005', 21) like '%reservation_for_mange%'
  and pg_temp.meld('Uden eget loft', '20000006', 20) = 'gik igennem');

/* Fyld de fire pladser. */
select pg_temp.meld('Fuld med venteliste', '20000010', 4);
select pg_temp.meld('Fuld uden venteliste', '20000011', 4);

select pg_temp.svar('21. Fuldt UDEN venteliste — nej, udsolgt',
  pg_temp.meld('Fuld uden venteliste', '20000012', 2) like '%reservation_udsolgt%');

select pg_temp.svar('22. Fuldt MED venteliste — gæsten kommer på ventelisten',
  pg_temp.meld('Fuld med venteliste', '20000013', 2) = 'gik igennem');

reset role;
select pg_temp.svar('23. … rækken står som venteliste, og pladserne tæller den ikke',
  (select r.status from public.reservationer r join public.kalender k on k.id = r.kalender_id
    where k.titel = 'Fuld med venteliste' and r.telefon = '20000013') = 'venteliste'
  and (select p.optaget from public.arrangement_pladser p join public.kalender k on k.id = p.kalender_id
        where k.titel = 'Fuld med venteliste') = 4);

select pg_temp.svar('24. Visningen har stadig præcis fire kolonner (ingen navne ud)',
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'arrangement_pladser') = 4);

set local role anon;
set local request.jwt.claims = '{}';
select pg_temp.svar('25. En gæst, der SENDER venteliste med ledige pladser, får en plads',
  pg_temp.meld('Fristen er ikke gået', '20000014', 2, 'venteliste') = 'gik igennem');
reset role;
select pg_temp.svar('    … (målt i sin egen sætning)',
  (select r.status from public.reservationer r where r.telefon = '20000014') = 'ny');

set local role anon;
set local request.jwt.claims = '{}';
/* Bremsen sætter selv status ('ny' eller 'venteliste'), FØR politikken
   ser rækken — så en gæst, der sender "kommet", lander som en almindelig
   tilmelding. Det, der måles, er hvad rækken BLEV. */
select pg_temp.meld('Fristen er ikke gået', '20000015', 2, 'bekraeftet');
reset role;
select pg_temp.svar('26. En gæst kan ikke gøre sig selv til "kommet" — rækken er "ny"',
  (select r.status from public.reservationer r where r.telefon = '20000015') = 'ny');
set local role anon;
set local request.jwt.claims = '{}';

/* Spambremsen: fem fra samme nummer på 24 timer er nok for en gæst. */
select pg_temp.meld('Spam 1', '20000099', 1);
select pg_temp.meld('Spam 2', '20000099', 1);
select pg_temp.meld('Spam 3', '20000099', 1);
select pg_temp.meld('Spam 4', '20000099', 1);
select pg_temp.meld('Spam 5', '20000099', 1);
select pg_temp.svar('27. Nummer seks fra samme telefon er nej for en gæst',
  pg_temp.meld('Spam 6', '20000099', 1) like '%reservation_bremse_nummer%');


-- ============================================================
--  PERSONALET OG ARRANGØREN: VENTELISTEN, TELEFONEN, SLET
-- ============================================================
reset role;
set local role authenticated;
set local request.jwt.claims = '{"email":"anna@proev.dk"}';

select pg_temp.svar('28. Arrangøren kan læse tilmeldingerne til arrangementerne',
  pg_temp.tal($$select count(*) from public.reservationer where lokation_id = 'proev-arrg'$$) >= 8);

select pg_temp.svar('29. En aftale i telefonen er ikke spam — arrangøren kan tage nummer seks',
  pg_temp.meld('Spam 7', '20000099', 1) = 'gik igennem');

select pg_temp.svar('30. … og må skrive flere end loftet pr. tilmelding (det er hendes aftale)',
  pg_temp.meld('Højst tre pr. tilmelding', '20000020', 8) = 'gik igennem');

select pg_temp.svar('31. Ryk op fra ventelisten, når der IKKE er plads — nej',
  pg_temp.proev($$update public.reservationer set status = 'ny'
                   where telefon = '20000013'$$) like '%reservation_udsolgt%');

update public.reservationer set status = 'afvist' where telefon = '20000010';
select pg_temp.svar('32. … og når en plads er givet fri — ja',
  pg_temp.proev($$update public.reservationer set status = 'ny'
                   where telefon = '20000013'$$) = 'gik igennem');

select pg_temp.svar('33. Flere personer på en tilmelding end der er plads — nej',
  pg_temp.proev($$update public.reservationer set antal_personer = 9
                   where telefon = '20000013'$$) like '%reservation_udsolgt%');

select pg_temp.meld('Har tilmeldte', '20000030', 2);
select pg_temp.svar('34. Et arrangement med tilmeldte kan IKKE slettes — det aflyses',
  pg_temp.proev($$delete from public.kalender where titel = 'Har tilmeldte'$$)
  like '%arrangement_har_tilmeldte%');

set local request.jwt.claims = '{"email":"chef@proev.dk"}';
select pg_temp.svar('35. … heller ikke af chefen',
  pg_temp.proev($$delete from public.kalender where titel = 'Har tilmeldte'$$)
  like '%arrangement_har_tilmeldte%');

select pg_temp.svar('36. Et arrangement uden tilmeldte kan slettes',
  pg_temp.proev($$delete from public.kalender where titel = 'Uden tilmeldte'$$) = 'gik igennem'
  and pg_temp.tal($$select count(*) from public.kalender where titel = 'Uden tilmeldte'$$) = 0);

select pg_temp.svar('37. Chefen kan give en arrangør adgang',
  pg_temp.proev($$insert into public.admin_adgang (email, lokation_id, rolle, navn)
                   values ('ny-arr@proev.dk', 'proev-arrg', 'arrangoer', 'Ny arrangør')$$) = 'gik igennem');

set local request.jwt.claims = '{"email":"anna@proev.dk"}';
select pg_temp.svar('38. Arrangøren kan IKKE give sig selv mere (ejer)',
  pg_temp.proev($$update public.admin_adgang set rolle = 'ejer' where email = 'anna@proev.dk'$$) <> 'gik igennem'
  or pg_temp.tal($$select count(*) from public.admin_adgang
                   where email = 'anna@proev.dk' and rolle = 'ejer'$$) = 0);


-- ------------------------------------------------------------
--  RAPPORTEN
-- ------------------------------------------------------------
reset role;
do $$
declare r text := coalesce(current_setting('proev.rapport', true), '(ingen)');
begin
  raise exception E'\n\n===== PRØVE: ARRANGØREN =====\n\n%\n%\n',
    r,
    case when position('FEJLEDE' in r) = 0
      then 'ALLE BESTOD.'
      else '⚠️ NOGET FEJLEDE — se linjerne ovenfor.' end;
end $$;

rollback;
