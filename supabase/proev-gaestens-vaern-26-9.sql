-- ============================================================
--  PRØVE: GÆSTENS VÆRN — FIRE HULLER  (26. sep 2026)
--  ------------------------------------------------------------
--  Kør EFTER gaestens-vaern-26-9.sql. Skriver ingenting, der bliver
--  stående: alt sker i én transaktion, der rulles tilbage til sidst.
--
--  Skal skrive: ALLE 31 AF 31 BESTOD.
--
--  ⚠️ DEN ER SET FEJLE. Kørt mod en database bygget af mappens egne
--     filer UDEN gaestens-vaern-26-9.sql faldt den på hvert af de fire
--     huller (tallene står i commit-beskeden og i docs/HISTORIK.md) —
--     og modstykkerne bestod, så det var værnene, der manglede, og
--     ikke kulissen, der var skæv.
--
--  ⚠️ DEN LÅNER IKKE EJERENS DATA. Egne forretninger (proev-gv og
--     proev-gv2), egne kategorier, varer, åbningstider (døgnåbent, så
--     klokken ikke afgør noget), eget bord, eget arrangement og eget
--     personale. Tre fald 2/9 skyldtes en prøve, der lånte ejerens dag.
--
--  ⚠️ IDENTITETERNE ER SUPABASES EGNE CLAIMS (request.jwt.claims):
--       gæst      {"role":"anon"}                       — anon-nøglen
--       fremmed   {"role":"authenticated", en e-mail uden adgang}
--                 — en bruger, der har oprettet sig selv
--       personale {"role":"authenticated", aktiv medarbejder her}
--       stoppet   {"role":"authenticated", medarbejder slået fra}
--       sql       ingen claims — SQL Editor, demoen, prøverne
--     Rækkerne indsættes som databasens ejer, så RLS måles IKKE her
--     (det gør proev-adgang.sql og proev-skraldespand.sql) — kun
--     udløserne, som er dem, filen retter.
--
--  ⚠️ HVERT NEJ HAR ET MODSTYKKE, DER SKAL GÅ IGENNEM. Ellers ville et
--     værn, der sagde nej til alt, bestå.
-- ============================================================
begin;

create temp table _svar (nr int, navn text, bestod boolean, grund text) on commit drop;
create temp table _id (hvad text primary key, id bigint) on commit drop;
create sequence pg_temp.tnr;

-- ⚠️ lokationer har tre not null-felter (setup.sql linje 101).
insert into public.lokationer (id, navn, adresse, postnr, by) values
  ('proev-gv',  'Prøvehavnen GV',   'Prøvevej 26', '2670', 'Greve'),
  ('proev-gv2', 'Prøvehavnen GV 2', 'Prøvevej 27', '2670', 'Greve')
on conflict (id) do nothing;

/* Døgnåbent alle syv dage: prøven regner fra "nu" (bordet), og en
   åbningstid må ikke afgøre, om den består. */
insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker)
select l, d, false, '00:00', '23:59'
  from unnest(array['proev-gv', 'proev-gv2']) l, generate_series(0, 6) d
on conflict (lokation_id, ugedag) do nothing;

with k as (
  insert into public.menu_kategorier (lokation_id, navn, aktiv, afdeling, dage) values
    ('proev-gv', 'PRØVE-GV Is',     true, 'is',  'alle'),
    ('proev-gv', 'PRØVE-GV Lukket', true, 'mad', 'alle')
  returning id, navn)
insert into _id select case navn when 'PRØVE-GV Is' then 'is' else 'lukket' end, id from k;

insert into public.menu_varer (kategori_id, navn, pris, aktiv, udsolgt) values
  ((select id from _id where hvad = 'is'),     'PRØVE-GV-SOFTICE', 45, true, false),
  ((select id from _id where hvad = 'lukket'), 'PRØVE-GV-SLIDER',  40, true, false);

/* Ejerens slags tal — men prøvens egne: intet varsel (så en dag om
   tre døgn aldrig er "for kort"), emballage til 10 kr., levering slået
   til, og kun is-kategorien åben (kanal-værnet). */
insert into public.indstillinger (lokation_id, noegle, vaerdi)
select 'proev-gv', n, v from (values
  ('bestilling_varsel_timer', '0'::jsonb),
  ('sidste_bestilling_min',   '0'::jsonb),
  ('emballage_pris',          '10'::jsonb),
  ('levering',                'true'::jsonb),
  ('bestilbare_kategorier',   jsonb_build_array((select id from _id where hvad = 'is')))
) x(n, v)
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

insert into public.indstillinger (lokation_id, noegle, vaerdi) values
  ('proev-gv2', 'bestilling_varsel_timer', '0'::jsonb)
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

with b as (
  insert into public.borde (lokation_id, nummer, aktiv) values ('proev-gv', 'PRØVE-GV-7', true)
  returning id)
insert into _id select 'bord', id from b;

/* Personalet: én aktiv, én slået fra — begge i proev-gv. */
insert into public.admin_adgang (email, lokation_id, rolle, aktiv) values
  ('personale@proev-gv.dk', 'proev-gv', 'medarbejder', true),
  ('stoppet@proev-gv.dk',   'proev-gv', 'medarbejder', false);

-- "I dag" er dansk tid, som Butik.nu() — ikke serverens UTC-dato.
create or replace function pg_temp.idag() returns date language sql stable as $$
  select (now() at time zone 'Europe/Copenhagen')::date
$$;
create or replace function pg_temp.nu() returns time language sql stable as $$
  select date_trunc('minute', now() at time zone 'Europe/Copenhagen')::time
$$;

with a as (
  insert into public.kalender (lokation_id, type, dato, titel, offentlig, tilmelding)
  values ('proev-gv', 'arrangement', pg_temp.idag() + 7, 'PRØVE-GV koncert', true, true)
  returning id)
insert into _id select 'arrangement', id from a;

create or replace function pg_temp.som(hvem text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', case hvem
    when 'gaest'     then '{"role":"anon"}'
    when 'fremmed'   then '{"role":"authenticated","email":"fremmed@eksempel.dk"}'
    when 'personale' then '{"role":"authenticated","email":"personale@proev-gv.dk"}'
    when 'stoppet'   then '{"role":"authenticated","email":"stoppet@proev-gv.dk"}'
    else '' end, true);
end $$;

-- Et nyt telefonnummer pr. række: bremsen holder fem pr. nummer,
-- og dubletvagten er unik på nummer, dag og tid.
create or replace function pg_temp.tlf() returns text language sql as $$
  select '26' || lpad(nextval('pg_temp.tnr')::text, 6, '0')
$$;

/* Én bestilling. Svarer null, når den gik igennem, ellers databasens
   hele besked — så en rød linje siger HVORFOR. Ved bordet er dagen i
   dag og tiden nu, som js/bestilling.js sender dem. */
create or replace function pg_temp.best(
  hvem text, ref text, linjer jsonb, antal int,
  hvordan text default 'afhentning', bord text default null,
  dag date default null, tlf text default null,
  oprettet timestamptz default null, lok text default 'proev-gv')
returns text language plpgsql as $$
begin
  perform pg_temp.som(hvem);
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid, antal, linjer,
     hvordan, bord_nummer, leverings_adresse, oprettet)
  values
    (ref, lok, 'Prøve Person',
     case when bord is null then coalesce(tlf, pg_temp.tlf()) end,
     coalesce(dag, case when bord is null then pg_temp.idag() + 3 else pg_temp.idag() end),
     case when bord is null then '12:00'::time else pg_temp.nu() end,
     antal, linjer, hvordan, bord,
     case when hvordan = 'levering' then 'Prøvevej 9, 2670 Greve' end,
     coalesce(oprettet, now()));
  perform pg_temp.som(null);
  return null;
exception when others then
  perform pg_temp.som(null);
  return sqlerrm;
end $$;

create or replace function pg_temp.bordbook(
  hvem text, ref text, dag date, bord bigint default null, oprettet timestamptz default null)
returns text language plpgsql as $$
begin
  perform pg_temp.som(hvem);
  insert into public.bordbestillinger
    (reference, lokation_id, navn, telefon, dato, tid, antal_personer, bord_id, oprettet)
  values (ref, 'proev-gv', 'Prøve Person', pg_temp.tlf(), dag, '18:00', 2, bord,
          coalesce(oprettet, now()));
  perform pg_temp.som(null);
  return null;
exception when others then
  perform pg_temp.som(null);
  return sqlerrm;
end $$;

create or replace function pg_temp.foresp(hvem text, ref text, oprettet timestamptz)
returns text language plpgsql as $$
begin
  perform pg_temp.som(hvem);
  insert into public.forespoergsler
    (reference, lokation_id, type, navn, telefon, dato, antal_personer, oprettet)
  values (ref, 'proev-gv', 'catering', 'Prøve Person', pg_temp.tlf(),
          pg_temp.idag() + 30, 20, oprettet);
  perform pg_temp.som(null);
  return null;
exception when others then
  perform pg_temp.som(null);
  return sqlerrm;
end $$;

create or replace function pg_temp.udl(hvem text, ref text, oprettet timestamptz)
returns text language plpgsql as $$
begin
  perform pg_temp.som(hvem);
  insert into public.udlejninger
    (reference, lokation_id, navn, telefon, dato, antal_personer, oprettet)
  values (ref, 'proev-gv', 'Prøve Person', pg_temp.tlf(), pg_temp.idag() + 40, 20, oprettet);
  perform pg_temp.som(null);
  return null;
exception when others then
  perform pg_temp.som(null);
  return sqlerrm;
end $$;

create or replace function pg_temp.resv(hvem text, ref text, oprettet timestamptz)
returns text language plpgsql as $$
begin
  perform pg_temp.som(hvem);
  insert into public.reservationer
    (reference, lokation_id, kalender_id, navn, telefon, antal_personer, oprettet)
  values (ref, 'proev-gv', (select id from _id where hvad = 'arrangement'),
          'Prøve Person', pg_temp.tlf(), 2, oprettet);
  perform pg_temp.som(null);
  return null;
exception when others then
  perform pg_temp.som(null);
  return sqlerrm;
end $$;

create or replace function pg_temp.nej(nr int, navn text, g text, kode text) returns void
language sql as $$
  insert into _svar values (nr, navn, coalesce(g like '%' || kode || '%', false), coalesce(g, 'GIK IGENNEM'));
$$;
create or replace function pg_temp.ja(nr int, navn text, g text) returns void
language sql as $$
  insert into _svar values (nr, navn, g is null, coalesce(g, 'gik igennem'));
$$;

/* "Gik igennem, OG rækken står med databasens tid."
   ⚠️ TO SÆTNINGER, IKKE ÉN. Første udgave indsatte og læste rækken
   tilbage i den SAMME select — og læste "ingen række" hver gang: en
   sætning ser databasen, som den var, da sætningen begyndte, og ikke
   det, en funktion i den selv har indsat. Svaret gemmes derfor i _g,
   og rækken læses i en sætning for sig.
   now() er transaktionens start — den samme for hele filen — så en
   række, der fik den, har PRÆCIS den. Tallet, der sammenlignes med,
   kommer fra databasens ur, ikke fra prøven. */
create temp table _g (nr int primary key, g text) on commit drop;
create or replace function pg_temp.gem(nr int, g text) returns void
language sql as $$ insert into _g values (nr, g) $$;

create or replace function pg_temp.oprettet(tabel text, ref text) returns timestamptz
language plpgsql as $$
declare o timestamptz;
begin
  execute format('select oprettet from public.%I where reference = $1', tabel) into o using ref;
  return o;
end $$;

create or replace function pg_temp.nutid(nr_ int, navn text, tabel text, ref text,
                                         skal timestamptz default null) returns void
language plpgsql as $$
declare g text := (select _g.g from _g where _g.nr = nr_);
        o timestamptz := pg_temp.oprettet(tabel, ref);
begin
  insert into _svar values (nr_, navn, g is null and o = coalesce(skal, now()),
    coalesce(g, 'oprettet = ' || coalesce(o::text, 'INGEN RÆKKE')));
end $$;

-- Linjerne, prøven sender. Softice er 45, emballagen 10.
create or replace function pg_temp.is2() returns jsonb language sql as $$
  select '[{"navn":"PRØVE-GV-SOFTICE","antal":2,"pris":45}]'::jsonb
$$;


-- ------------------------------------------------------------
--  0) FILEN ER KØRT
-- ------------------------------------------------------------
insert into _svar
select 1, 'Udløseren aa_oprettet_er_serverens står på alle fem gæstetabeller',
       count(*) = 5, count(*) || ' af 5'
  from pg_trigger t
 where t.tgname = 'aa_oprettet_er_serverens' and not t.tgisinternal;


-- ------------------------------------------------------------
--  A) `oprettet` ER SERVERENS  (hul 1)
-- ------------------------------------------------------------
select pg_temp.gem(2, pg_temp.best('gaest', 'PR-GV-02', pg_temp.is2(), 2, oprettet => '2020-01-01'));
select pg_temp.nutid(2, 'Bestilling: gæstens oprettet 2020 bliver databasens', 'bestillinger', 'PR-GV-02');

select pg_temp.gem(3, pg_temp.bordbook('gaest', 'PR-GV-03', pg_temp.idag() + 10, oprettet => '2020-01-01'));
select pg_temp.nutid(3, 'Bordbooking: gæstens oprettet 2020 bliver databasens', 'bordbestillinger', 'PR-GV-03');

select pg_temp.gem(4, pg_temp.foresp('gaest', 'PR-GV-04', '2020-01-01'));
select pg_temp.nutid(4, 'Forespørgsel: gæstens oprettet 2020 bliver databasens', 'forespoergsler', 'PR-GV-04');

select pg_temp.gem(5, pg_temp.udl('gaest', 'PR-GV-05', '2020-01-01'));
select pg_temp.nutid(5, 'Udlejning: gæstens oprettet 2020 bliver databasens', 'udlejninger', 'PR-GV-05');

select pg_temp.gem(6, pg_temp.resv('gaest', 'PR-GV-06', '2020-01-01'));
select pg_temp.nutid(6, 'Tilmelding: gæstens oprettet 2020 bliver databasens', 'reservationer', 'PR-GV-06');

/* Den anden vej: en række dateret 2099 tæller for evigt i bremsen. */
select pg_temp.gem(7, pg_temp.best('gaest', 'PR-GV-07', pg_temp.is2(), 2, oprettet => '2099-01-01'));
select pg_temp.nutid(7, 'Bestilling: gæstens oprettet 2099 bliver databasens', 'bestillinger', 'PR-GV-07');

/* ⚠️ DET, HULLET KOSTEDE: bremsen holder fem bestillinger pr. nummer i
   døgnet (bremse.sql). Fem dateret 2020 fra samme nummer — og den
   sjette skal afvises. Før rettelsen gik den igennem. */
select pg_temp.best('gaest', 'PR-GV-08-' || n, pg_temp.is2(), 2,
                    dag => pg_temp.idag() + 3 + n, tlf => '26999908', oprettet => '2020-01-01')
  from generate_series(1, 5) n;
select pg_temp.nej(8, 'Bremsen tæller dem: den sjette fra samme nummer afvises',
  pg_temp.best('gaest', 'PR-GV-08-6', pg_temp.is2(), 2,
               dag => pg_temp.idag() + 9, tlf => '26999908', oprettet => '2020-01-01'),
  'bestilling_bremse_nummer');

select pg_temp.gem(9, pg_temp.best('fremmed', 'PR-GV-09', pg_temp.is2(), 2, oprettet => '2020-01-01'));
select pg_temp.nutid(9, 'En bruger uden adgang (authenticated) får også databasens tid', 'bestillinger', 'PR-GV-09');

select pg_temp.gem(10, pg_temp.best('personale', 'PR-GV-10', pg_temp.is2(), 2, oprettet => '2020-01-01'));
select pg_temp.nutid(10, 'Personalet får også databasens tid', 'bestillinger', 'PR-GV-10');

/* ⚠️ MODSTYKKET: en SQL-fil uden claims beholder sin dato.
   demo-indhold.sql og tre prøver dater rækker tilbage med vilje. */
select pg_temp.gem(11, pg_temp.best('sql', 'PR-GV-11', pg_temp.is2(), 2,
                                    oprettet => '2020-01-01 00:00+00'));
select pg_temp.nutid(11, 'Modstykke: en SQL-fil uden claims beholder sin egen dato',
                     'bestillinger', 'PR-GV-11', '2020-01-01 00:00+00');


-- ------------------------------------------------------------
--  B) GÆSTEN ER ALLE UDEN FOR PERSONALET  (hul 2)
-- ------------------------------------------------------------
select pg_temp.nej(12, 'En bruger uden adgang dømmes af gæstens regler (ukendt vare)',
  pg_temp.best('fremmed', 'PR-GV-12', '[{"navn":"PRØVE-GV-FINDES-IKKE","antal":1,"pris":1}]', 1),
  'bestilling_ukendt_vare');

select pg_temp.nej(13, 'En bruger uden adgang dømmes af kanal-værnet (lukket kategori)',
  pg_temp.best('fremmed', 'PR-GV-13', '[{"navn":"PRØVE-GV-SLIDER","antal":1,"pris":40}]', 1),
  'bestilling_kategori_lukket');

select pg_temp.nej(14, 'En bruger uden adgang kan ikke få levering uden kvittering',
  pg_temp.best('fremmed', 'PR-GV-14', pg_temp.is2(), 2, 'levering'),
  'levering_ikke_valideret');

select pg_temp.nej(15, 'En bruger uden adgang kan ikke tage et bord til sig selv',
  pg_temp.bordbook('fremmed', 'PR-GV-15', pg_temp.idag() + 11, (select id from _id where hvad = 'bord')),
  'bord_plads_kun_personale');

/* ⚠️ is_admin_for KRÆVER aktiv (roller.sql). En medarbejder, ejeren
   har slået fra, er gæst igen — ellers var "deaktivér" en farve. */
select pg_temp.nej(16, 'En medarbejder, der er slået fra, er gæst igen',
  pg_temp.best('stoppet', 'PR-GV-16', '[{"navn":"PRØVE-GV-FINDES-IKKE","antal":1,"pris":1}]', 1),
  'bestilling_ukendt_vare');

/* Personale i ÉN forretning er gæst i den næste (flerlejer.sql). */
select pg_temp.nej(17, 'Personale i en anden forretning er gæst her',
  pg_temp.best('personale', 'PR-GV-17', '[{"navn":"PRØVE-GV-FINDES-IKKE","antal":1,"pris":1}]', 1,
               lok => 'proev-gv2'),
  'bestilling_ukendt_vare');

select pg_temp.nej(18, 'Gæsten med anon-nøglen dømmes stadig (den gamle dør holder)',
  pg_temp.best('gaest', 'PR-GV-18', '[{"navn":"PRØVE-GV-FINDES-IKKE","antal":1,"pris":1}]', 1),
  'bestilling_ukendt_vare');

select pg_temp.ja(19, 'Modstykke: personalet dømmes ikke af gæstens regler',
  pg_temp.best('personale', 'PR-GV-19', '[{"navn":"PRØVE-GV-FINDES-IKKE","antal":1,"pris":1}]', 1));

select pg_temp.ja(20, 'Modstykke: personalet tager en levering i telefonen uden kvittering',
  pg_temp.best('personale', 'PR-GV-20', pg_temp.is2(), 2, 'levering'));

select pg_temp.ja(21, 'Modstykke: personalet kan give en booking et bord',
  pg_temp.bordbook('personale', 'PR-GV-21', pg_temp.idag() + 12, (select id from _id where hvad = 'bord')));


-- ------------------------------------------------------------
--  C) LINJENS ANTAL  (hul 3)
-- ------------------------------------------------------------
/* ⚠️ ANGREBET, ORDRET: 2 × 45 + (-9) × 10 = 0 kr., og kolonnen siger
   2, så kolonnens eget CHECK (1-500) ikke opdager noget. */
select pg_temp.nej(22, '2 × Softice + Emballage × -9 (0 kr.) afvises',
  pg_temp.best('gaest', 'PR-GV-22',
    '[{"navn":"PRØVE-GV-SOFTICE","antal":2,"pris":45},{"navn":"Emballage","antal":-9,"pris":10,"emballage":true}]', 2),
  'bestilling_antal_ok');

select pg_temp.nej(23, 'En linje med antal 0 afvises',
  pg_temp.best('gaest', 'PR-GV-23',
    '[{"navn":"PRØVE-GV-SOFTICE","antal":2,"pris":45},{"navn":"PRØVE-GV-SOFTICE","antal":0,"pris":45}]', 2),
  'bestilling_antal_ok');

select pg_temp.nej(24, 'En linje over kolonnens loft (501) afvises',
  pg_temp.best('gaest', 'PR-GV-24', '[{"navn":"PRØVE-GV-SOFTICE","antal":501,"pris":45}]', 2),
  'bestilling_antal_ok');

select pg_temp.nej(25, 'Et antal som tekst ("2") afvises — siden sender et tal',
  pg_temp.best('gaest', 'PR-GV-25', '[{"navn":"PRØVE-GV-SOFTICE","antal":"2","pris":45}]', 2),
  'bestilling_antal_ok');

select pg_temp.nej(26, 'Kolonnen antal skal være summen af linjerne (50 mod 2)',
  pg_temp.best('gaest', 'PR-GV-26', pg_temp.is2(), 50),
  'bestilling_antal_ok');

/* ⚠️ MODSTYKKET ER SIDENS EGEN FORM: Butik.bestil sender emballagen
   som en linje og tæller den med i antal (js/store.js). */
select pg_temp.ja(27, 'Modstykke: 2 × Softice + 1 × Emballage med antal 3 går igennem',
  pg_temp.best('gaest', 'PR-GV-27',
    '[{"navn":"PRØVE-GV-SOFTICE","antal":2,"pris":45},{"navn":"Emballage","antal":1,"pris":10,"emballage":true}]', 3));


-- ------------------------------------------------------------
--  D) VED BORDET ER DAGEN I DAG  (hul 4)
-- ------------------------------------------------------------
select pg_temp.ja(28, 'Modstykke: en bordordre dateret i dag (dansk tid) går igennem',
  pg_temp.best('gaest', 'PR-GV-28', '[{"navn":"PRØVE-GV-SOFTICE","antal":1,"pris":45}]', 1,
               'spis_her', 'PRØVE-GV-7'));

-- I dag er lukket — kalenderens egen lukkedag.
insert into public.kalender (lokation_id, type, dato, titel)
values ('proev-gv', 'lukkedag', pg_temp.idag(), 'PRØVE-GV lukket');

/* ⚠️ HULLET: lukkedagen dømmes på hent_dato, og den var klientens.
   Før rettelsen gik bordordren igennem på en lukket dag, bare den
   sagde "i morgen". */
select pg_temp.nej(29, 'På en lukkedag: en bordordre, der siger "i morgen", afvises',
  pg_temp.best('gaest', 'PR-GV-29', '[{"navn":"PRØVE-GV-SOFTICE","antal":1,"pris":45}]', 1,
               'spis_her', 'PRØVE-GV-7', pg_temp.idag() + 1),
  'bestilling_bord_ikke_i_dag');

select pg_temp.nej(30, 'En bordordre, der siger "i går", afvises',
  pg_temp.best('gaest', 'PR-GV-30', '[{"navn":"PRØVE-GV-SOFTICE","antal":1,"pris":45}]', 1,
               'spis_her', 'PRØVE-GV-7', pg_temp.idag() - 1),
  'bestilling_bord_ikke_i_dag');

select pg_temp.ja(31, 'Modstykke: personalet kan skrive en bordordre ind til i morgen',
  pg_temp.best('personale', 'PR-GV-31', '[{"navn":"PRØVE-GV-SOFTICE","antal":1,"pris":45}]', 1,
               'spis_her', 'PRØVE-GV-7', pg_temp.idag() + 1));


-- ------------------------------------------------------------
--  RAPPORTEN
-- ------------------------------------------------------------
select nr, navn,
  case when coalesce(bestod, false) then 'BESTOD' else 'FEJLEDE' end as udfald,
  grund
from _svar order by nr;

select
  'Proevens dato: ' || pg_temp.idag() || ' (dansk) · klokken '
    || to_char(now() at time zone 'Europe/Copenhagen', 'HH24:MI')
    || ' · forretninger: proev-gv, proev-gv2' as udgave,
  case
    when (select count(*) from _svar) <> 31
    then 'PROEVEN ER UFULDSTAENDIG: ' || (select count(*) from _svar) || ' af 31 linjer'
    when (select count(*) from _svar where coalesce(bestod, false)) = 31
    then 'ALLE 31 AF 31 BESTOD'
    else (select count(*) from _svar where not coalesce(bestod, false))
         || ' AF 31 FEJLEDE — se grund-kolonnen ovenfor'
  end as resultat;

rollback;
