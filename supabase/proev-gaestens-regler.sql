-- ============================================================
--  PRØVE: GÆSTENS REGLER I DATABASEN — OG INGEN KAPLØB  (15/9)
--  ------------------------------------------------------------
--  Kør EFTER gaestens-regler.sql. Skriver ingenting, der bliver
--  stående: alt sker i én transaktion, der rulles tilbage til sidst.
--
--  Skal skrive: ALLE 32 AF 32 BESTOD.
--
--  ⚠️ DEN LÅNER IKKE EJERENS DATA. Egne forretninger, egne kategorier,
--     egne varer, egne åbningstider og eget bord. Og hver regel har et
--     modstykke, der SKAL gå igennem — ellers ville et værn, der sagde
--     nej til alt, bestå.
--
--  ⚠️ GÆSTEN SPILLES MED request.jwt.claims = {"role":"anon"}. Det er
--     dét, Supabase sætter for hvert kald med anon-nøglen, og det er
--     det, reglerne ser på. Prøve 18 og 19 er modstykket: personalet
--     og en SQL-fil dømmes ikke af et varsel.
--
--  ⚠️ proev-gr ER DØGNÅBEN ALLE SYV DAGE, så prøverne, der regner fra
--     "nu", ikke falder på åbningstiden, uanset hvornår filen køres.
--     Sidste bestilling prøves på proev-gr2, som har almindelige tider.
--
--  ⚠️ KAPLØBET KAN IKKE PRØVES I ÉN SESSION. Prøve 25 ser, at låsene
--     står i funktionerne; at de VIRKER, er målt med to samtidige
--     forbindelser (se CLAUDE.md, 15/9).
-- ============================================================
begin;

do $$
begin
  if not exists (select 1 from pg_trigger
                  where tgname = 'bestilling_gaestens_regler'
                    and tgrelid = 'public.bestillinger'::regclass) then
    raise exception 'KOER supabase/gaestens-regler.sql FOERST — værnet findes ikke, saa proeven kan ikke maale noget.';
  end if;
end $$;

create temp table _svar (nr int, navn text, bestod boolean, grund text) on commit drop;
create temp table _kat (hvad text primary key, id bigint) on commit drop;

-- ⚠️ lokationer har tre not null-felter (setup.sql linje 101).
insert into public.lokationer (id, navn, adresse, postnr, by) values
  ('proev-gr',  'Prøvehavnen',   'Prøvevej 1', '2670', 'Greve'),
  ('proev-gr2', 'Prøvehavnen 2', 'Prøvevej 2', '2670', 'Greve')
on conflict (id) do nothing;

insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker)
select 'proev-gr', d, false, '00:00', '23:59' from generate_series(0, 6) d;
insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker)
values ('proev-gr2', extract(isodow from current_date + 3)::int - 1, false, '10:00', '20:00');

with k as (
  insert into public.menu_kategorier (lokation_id, navn, aktiv) values
    ('proev-gr',  'PRØVE Smørrebrød', true),
    ('proev-gr',  'PRØVE Morgenmad',  true),
    ('proev-gr',  'PRØVE Grill',      true),
    ('proev-gr2', 'PRØVE Grill 2',    true)
  returning id, navn)
insert into _kat
select case navn when 'PRØVE Smørrebrød' then 'smoer'
                 when 'PRØVE Morgenmad'  then 'morgen'
                 when 'PRØVE Grill'      then 'grill'
                 else 'grill2' end, id
  from k;

insert into public.menu_varer (kategori_id, lokation_id, navn, pris, aktiv, udsolgt) values
  ((select id from _kat where hvad = 'smoer'),  'proev-gr',  'PRØVE-FLÆSK',      55, true, false),
  ((select id from _kat where hvad = 'morgen'), 'proev-gr',  'PRØVE-RUNDSTYKKE', 20, true, false),
  ((select id from _kat where hvad = 'grill'),  'proev-gr',  'PRØVE-BURGER',     89, true, false),
  ((select id from _kat where hvad = 'grill2'), 'proev-gr2', 'PRØVE-BURGER-2',   89, true, false);

-- Ejerens tal, som produktionen har dem (15/9) — plus et vindue på
-- morgenmaden og ingen halv time før lukning på den døgnåbne.
insert into public.indstillinger (lokation_id, noegle, vaerdi)
select 'proev-gr', n, v from (values
  ('varsel_min_togo',         '30'::jsonb),
  ('varsel_min_bord',         '15'::jsonb),
  ('bestilling_varsel_timer', '24'::jsonb),
  ('bestilling_min_stk',      '4'::jsonb),
  ('levering',                'false'::jsonb),
  ('emballage_pris',          '10'::jsonb),
  ('emballage_navn',          '"Emballage"'::jsonb),
  ('leverings_gebyr',         '79'::jsonb),
  ('sidste_bestilling_min',   '0'::jsonb),
  ('kategori_tider', jsonb_build_object(
     (select id from _kat where hvad = 'smoer')::text,  jsonb_build_object('varsel_min', 1440),
     (select id from _kat where hvad = 'morgen')::text, jsonb_build_object('fra', '10:00', 'til', '12:30')))
) x(n, v);

insert into public.indstillinger (lokation_id, noegle, vaerdi) values
  ('proev-gr2', 'varsel_min_togo',       '30'::jsonb),
  ('proev-gr2', 'koekken_lukker',        '"19:00"'::jsonb),
  ('proev-gr2', 'sidste_bestilling_min', '30'::jsonb);

insert into public.borde (lokation_id, nummer, aktiv) values ('proev-gr', 'PRØVE-GR', true);

insert into public.dagens_retter (lokation_id, dato, navn, pris, aktiv, sortering, antal_tilbage, udsolgt) values
  ('proev-gr', current_date + 3, 'PRØVE-DAGENS',   99, true, 1, null, true),
  ('proev-gr', current_date + 3, 'PRØVE-DAGENS-2', 99, true, 2, null, false);

-- "Om N minutter" i dansk tid, som gæstens vælger regner.
create or replace function pg_temp.om(m int) returns timestamp language sql as $$
  select date_trunc('minute', (now() at time zone 'Europe/Copenhagen') + make_interval(mins => m))
$$;

/* Én bestilling med sit eget nummer (bremsen holder fem pr. nummer, og
   dubletvagten er unik på telefon + dag + tid). rolle = null er en
   SQL-fil uden claims. */
create or replace function pg_temp.best(
  lok text, ref text, dag date, tid time, linjer jsonb, nr int,
  hvordan text default 'afhentning', rolle text default 'anon', bord text default null)
returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when rolle is null then '' else json_build_object('role', rolle)::text end, true);
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     antal, linjer, status, hvordan, bord_nummer, leverings_adresse)
  values
    (ref, lok, 'Prøve Person',
     case when bord is null then '3300' || lpad(nr::text, 4, '0') end,
     dag, tid,
     greatest((select coalesce(sum((l ->> 'antal')::int), 1) from jsonb_array_elements(linjer) l), 1),
     linjer, 'ny', hvordan, bord,
     case when hvordan = 'levering' then 'Prøvevej 9, 2670 Greve' end);
  perform set_config('request.jwt.claims', '', true);
  return null;
exception when others then
  perform set_config('request.jwt.claims', '', true);
  return sqlerrm;
end $$;

create or replace function pg_temp.sql(s text) returns text language plpgsql as $$
begin
  execute s;
  return null;
exception when others then
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

-- ------------------------------------------------------------
--  LEVERING
-- ------------------------------------------------------------
select pg_temp.nej(1, 'Levering slået fra afvises',
  pg_temp.best('proev-gr', 'PR-GR-1', current_date + 3, '12:00',
    '[{"navn":"PRØVE-BURGER","antal":1,"pris":89},{"navn":"Levering","antal":1,"pris":79,"emballage":true}]',
    1, 'levering'), 'bestilling_levering_lukket');

update public.indstillinger set vaerdi = 'true'::jsonb
 where lokation_id = 'proev-gr' and noegle = 'levering';

select pg_temp.ja(2, 'Modstykke: slået til går den igennem — med ejerens fragt',
  pg_temp.best('proev-gr', 'PR-GR-2', current_date + 3, '12:30',
    '[{"navn":"PRØVE-BURGER","antal":1,"pris":89},{"navn":"Levering","antal":1,"pris":79,"emballage":true}]',
    2, 'levering'));

-- ------------------------------------------------------------
--  TIDEN OG VARSLET
-- ------------------------------------------------------------
select pg_temp.nej(3, 'En tid, der er gået, afvises',
  pg_temp.best('proev-gr', 'PR-GR-3', pg_temp.om(-2)::date, pg_temp.om(-2)::time,
    '[{"navn":"PRØVE-BURGER","antal":1,"pris":89}]', 3), 'bestilling_tid_gaaet');

select pg_temp.nej(4, 'Om ti minutter er for kort varsel ud af huset (30)',
  pg_temp.best('proev-gr', 'PR-GR-4', pg_temp.om(10)::date, pg_temp.om(10)::time,
    '[{"navn":"PRØVE-BURGER","antal":1,"pris":89}]', 4), 'bestilling_for_kort_varsel');

select pg_temp.ja(5, 'Modstykke: om tyve minutter er inden for margenen — med emballage',
  pg_temp.best('proev-gr', 'PR-GR-5', pg_temp.om(20)::date, pg_temp.om(20)::time,
    '[{"navn":"PRØVE-BURGER","antal":1,"pris":89},{"navn":"Emballage","antal":1,"pris":10,"emballage":true}]', 5));

select pg_temp.nej(6, 'Smørrebrødets døgn: om to timer afvises',
  pg_temp.best('proev-gr', 'PR-GR-6', pg_temp.om(120)::date, pg_temp.om(120)::time,
    '[{"navn":"PRØVE-FLÆSK","antal":4,"pris":55}]', 6), 'bestilling_for_kort_varsel');

select pg_temp.ja(7, 'Modstykke: smørrebrød om tre dage går igennem',
  pg_temp.best('proev-gr', 'PR-GR-7', current_date + 3, '13:00',
    '[{"navn":"PRØVE-FLÆSK","antal":4,"pris":55}]', 7));

select pg_temp.nej(8, 'Tre smørrebrød er under mindsteantallet (4)',
  pg_temp.best('proev-gr', 'PR-GR-8', current_date + 3, '13:30',
    '[{"navn":"PRØVE-FLÆSK","antal":3,"pris":55}]', 8), 'bestilling_for_faa_smoerrebroed');

select pg_temp.ja(9, 'Bordet: ét smørrebrød nu — intet varsel, intet mindsteantal',
  pg_temp.best('proev-gr', 'PR-GR-9', pg_temp.om(0)::date, pg_temp.om(0)::time,
    '[{"navn":"PRØVE-FLÆSK","antal":1,"pris":55}]', 9, 'spis_her', 'anon', 'PRØVE-GR'));

select pg_temp.nej(10, 'Morgenmaden kl. 13 er uden for kategoriens vindue (til 12.30)',
  pg_temp.best('proev-gr', 'PR-GR-10', current_date + 3, '13:00',
    '[{"navn":"PRØVE-RUNDSTYKKE","antal":1,"pris":20}]', 10), 'bestilling_kategori_tid');

select pg_temp.ja(11, 'Modstykke: morgenmaden kl. 11 går igennem',
  pg_temp.best('proev-gr', 'PR-GR-11', current_date + 3, '11:00',
    '[{"navn":"PRØVE-RUNDSTYKKE","antal":1,"pris":20}]', 11));

-- ------------------------------------------------------------
--  NAVNET OG PRISEN ER KORTETS
-- ------------------------------------------------------------
select pg_temp.nej(12, 'En burger til 1 kr. afvises',
  pg_temp.best('proev-gr', 'PR-GR-12', current_date + 3, '14:00',
    '[{"navn":"PRØVE-BURGER","antal":1,"pris":1}]', 12), 'bestilling_pris_aendret');

select pg_temp.nej(13, 'En vare, der ikke står på kortet, afvises',
  pg_temp.best('proev-gr', 'PR-GR-13', current_date + 3, '14:30',
    '[{"navn":"PRØVE-FINDES-IKKE","antal":1,"pris":10}]', 13), 'bestilling_ukendt_vare');

select pg_temp.nej(14, 'Emballage til en anden pris end ejerens afvises',
  pg_temp.best('proev-gr', 'PR-GR-14', current_date + 3, '15:00',
    '[{"navn":"PRØVE-BURGER","antal":1,"pris":89},{"navn":"Emballage","antal":1,"pris":1,"emballage":true}]',
    14), 'bestilling_pris_aendret');

select pg_temp.nej(15, 'Emballage på spis her afvises',
  pg_temp.best('proev-gr', 'PR-GR-15', current_date + 3, '15:30',
    '[{"navn":"PRØVE-BURGER","antal":1,"pris":89},{"navn":"Emballage","antal":1,"pris":10,"emballage":true}]',
    15, 'spis_her'), 'bestilling_tillaeg_forkert');

-- ------------------------------------------------------------
--  SIDSTE BESTILLING (proev-gr2: lugen 20, køkkenet 19, en halv time)
-- ------------------------------------------------------------
select pg_temp.nej(16, 'Kl. 18.45 er efter sidste bestilling (18.30)',
  pg_temp.best('proev-gr2', 'PR-GR-16', current_date + 3, '18:45',
    '[{"navn":"PRØVE-BURGER-2","antal":1,"pris":89}]', 16), 'bestilling_efter_sidste_bestilling');

select pg_temp.ja(17, 'Modstykke: kl. 18.30 går igennem',
  pg_temp.best('proev-gr2', 'PR-GR-17', current_date + 3, '18:30',
    '[{"navn":"PRØVE-BURGER-2","antal":1,"pris":89}]', 17));

-- ------------------------------------------------------------
--  GÆSTENS REGLER GÆLDER GÆSTEN
-- ------------------------------------------------------------
select pg_temp.ja(18, 'Personalet må tage en bestilling til om ti minutter',
  pg_temp.best('proev-gr', 'PR-GR-18', pg_temp.om(10)::date, pg_temp.om(10)::time,
    '[{"navn":"PRØVE-BURGER","antal":1,"pris":89}]', 18, 'afhentning', 'authenticated'));

select pg_temp.ja(19, 'En SQL-fil uden claims dømmes ikke af varslet',
  pg_temp.best('proev-gr', 'PR-GR-19', pg_temp.om(10)::date, pg_temp.om(10)::time,
    '[{"navn":"PRØVE-BURGER","antal":1,"pris":89}]', 19, 'afhentning', null));

-- ------------------------------------------------------------
--  DAGENS RET
-- ------------------------------------------------------------
select pg_temp.ja(20, 'Dagens ret kendes, og prisen er dens egen',
  pg_temp.best('proev-gr', 'PR-GR-20', current_date + 3, '16:00',
    '[{"navn":"PRØVE-DAGENS-2","antal":1,"pris":99}]', 20));

select pg_temp.nej(21, 'Dagens ret til en anden pris afvises',
  pg_temp.best('proev-gr', 'PR-GR-21', current_date + 3, '16:30',
    '[{"navn":"PRØVE-DAGENS-2","antal":1,"pris":50}]', 21), 'bestilling_pris_aendret');

select pg_temp.nej(22, 'Dagens ret meldt udsolgt uden et antal afvises (også uden claims)',
  pg_temp.best('proev-gr', 'PR-GR-22', current_date + 3, '17:00',
    '[{"navn":"PRØVE-DAGENS","antal":1,"pris":99}]', 22, 'afhentning', null), 'bestilling_udsolgt_vare');

-- ------------------------------------------------------------
--  QR-SPÆRREN LÆSER ADMINS KONTAKT
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi)
values ('proev-gr', 'bordbestilling_aaben', 'false'::jsonb);

select pg_temp.nej(23, '"Tag ikke imod fra bordene" spærrer QR',
  pg_temp.best('proev-gr', 'PR-GR-23', pg_temp.om(0)::date, pg_temp.om(0)::time,
    '[{"navn":"PRØVE-BURGER","antal":1,"pris":89}]', 23, 'spis_her', null, 'PRØVE-GR'),
  'bestilling_qr_lukket');

update public.indstillinger set vaerdi = 'true'::jsonb
 where lokation_id = 'proev-gr' and noegle = 'bordbestilling_aaben';
insert into public.indstillinger (lokation_id, noegle, vaerdi)
values ('proev-gr', 'qr_aaben', 'false'::jsonb);

select pg_temp.ja(24, 'Modstykke: den gamle nøgle qr_aaben spærrer ingenting',
  pg_temp.best('proev-gr', 'PR-GR-24', pg_temp.om(0)::date, pg_temp.om(0)::time,
    '[{"navn":"PRØVE-BURGER","antal":1,"pris":89}]', 24, 'spis_her', null, 'PRØVE-GR'));

-- ------------------------------------------------------------
--  KØEN
-- ------------------------------------------------------------
insert into _svar
select 25, 'Lofterne står i kø (fem låse)',
  (select bool_and(pg_get_functiondef(p.oid) like '%pg_advisory_xact_lock%')
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and (p.proname in ('bord_loft_vaern', 'mosede_luge_loft', 'forespoergsel_bremse',
                         'mosede_dagen_er_optaget')
           or (p.proname = 'mosede_bord_loft' and p.pronargs = 0)))
  and pg_get_functiondef('public.reservation_bremse'::regproc) like '%for update%',
  'læst i funktionerne';

-- ------------------------------------------------------------
--  BAGLOKALET
-- ------------------------------------------------------------
create or replace function pg_temp.foresp(ref text, dag date, tlf text, st text) returns text
language plpgsql as $$
begin
  insert into public.forespoergsler (reference, lokation_id, type, navn, telefon, dato, antal_personer, status)
  values (ref, 'proev-gr', 'baglokale', 'Prøve Gæst', tlf, dag, 20, st);
  return null;
exception when others then return sqlerrm;
end $$;

create or replace function pg_temp.udl(ref text, dag date, tlf text) returns text
language plpgsql as $$
begin
  insert into public.udlejninger (reference, lokation_id, navn, telefon, dato, antal_personer, status)
  values (ref, 'proev-gr', 'Prøve Gæst', tlf, dag, 20, 'ny');
  return null;
exception when others then return sqlerrm;
end $$;

-- "Lås dagen": forespørgslen er aftalt, udlejningen oprettes bagefter.
select pg_temp.foresp('PR-FO-1', current_date + 20, '44110001', 'aftalt');
select pg_temp.ja(26, 'Lås dagen: udlejningen til den SAMME gæst kan oprettes',
  pg_temp.udl('PR-UD-1', current_date + 20, '44110001'));
select pg_temp.ja(27, 'Lås dagen: og bekræftes med forespørgslens reference i noten',
  pg_temp.sql($s$update public.udlejninger set status = 'bekraeftet',
      intern_note = 'Aftalt i telefonen ud fra PR-FO-1.' where reference = 'PR-UD-1'$s$));
select pg_temp.nej(28, 'En ANDEN gæst kan ikke få en udlejning den dag',
  pg_temp.udl('PR-UD-1B', current_date + 20, '44119999'), 'mosede_dagen_er_optaget');

-- Venteforløbet: forespørgsel → udlejning → bekræftet → aftalt.
insert into _svar
select 29, 'Book lokalet til dem: hele forløbet går igennem',
  g is null, coalesce(g, 'gik igennem')
  from (select coalesce(
    pg_temp.foresp('PR-FO-2', current_date + 21, '44110002', 'kontaktet'),
    pg_temp.udl('PR-UD-2', current_date + 21, '44110002'),
    pg_temp.sql($s$update public.udlejninger set status = 'bekraeftet',
        intern_note = 'Aftalt i telefonen ud fra PR-FO-2.' where reference = 'PR-UD-2'$s$),
    pg_temp.sql($s$update public.forespoergsler set status = 'aftalt' where reference = 'PR-FO-2'$s$)) g) x;

-- Dobbeltbooking gennem en status: udlejningen står, en anden aftales.
select pg_temp.foresp('PR-FO-3', current_date + 22, '44110033', 'ny');
select pg_temp.udl('PR-UD-3', current_date + 22, '44110003');
select pg_temp.sql($s$update public.udlejninger set status = 'bekraeftet',
    intern_note = 'Aftalt i telefonen.' where reference = 'PR-UD-3'$s$);
select pg_temp.nej(30, 'En anden gæsts forespørgsel kan ikke aftales på en udlejet dag',
  pg_temp.sql($s$update public.forespoergsler set status = 'aftalt' where reference = 'PR-FO-3'$s$),
  'mosede_dagen_er_optaget');

-- Den modsatte vej: forespørgslen er aftalt, en anden udlejning bekræftes.
select pg_temp.udl('PR-UD-4', current_date + 23, '44110004');
select pg_temp.foresp('PR-FO-4', current_date + 23, '44110044', 'aftalt');
select pg_temp.nej(31, 'En anden gæsts udlejning kan ikke bekræftes på en aftalt dag',
  pg_temp.sql($s$update public.udlejninger set status = 'bekraeftet',
      intern_note = 'Aftalt i telefonen.' where reference = 'PR-UD-4'$s$),
  'mosede_dagen_er_optaget');

-- Skraldespanden: en udlejning, der hentes tilbage, er et nyt ja.
select pg_temp.udl('PR-UD-5', current_date + 24, '44110005');
select pg_temp.sql($s$update public.udlejninger set status = 'bekraeftet' where reference = 'PR-UD-5'$s$);
select pg_temp.sql($s$update public.udlejninger set slettet = now() where reference = 'PR-UD-5'$s$);
select pg_temp.foresp('PR-FO-5', current_date + 24, '44110055', 'aftalt');
select pg_temp.nej(32, 'En udlejning hentet op af skraldespanden kan ikke tage en aftalt dag',
  pg_temp.sql($s$update public.udlejninger set slettet = null where reference = 'PR-UD-5'$s$),
  'mosede_dagen_er_optaget');

-- ------------------------------------------------------------
--  RAPPORTEN
-- ------------------------------------------------------------
select nr, navn,
  case when coalesce(bestod, false) then 'BESTOD' else 'FEJLEDE' end as udfald,
  grund
from _svar order by nr;

select
  'Proevens dato: ' || current_date || ' · dansk tid: '
    || to_char(now() at time zone 'Europe/Copenhagen', 'HH24:MI')
    || ' · forretninger: proev-gr, proev-gr2' as udgave,
  case
    when (select count(*) from _svar) <> 32
    then 'PROEVEN ER UFULDSTAENDIG: ' || (select count(*) from _svar) || ' af 32 linjer'
    when (select count(*) from _svar where coalesce(bestod, false)) = 32
    then 'ALLE 32 AF 32 BESTOD'
    else (select count(*) from _svar where not coalesce(bestod, false))
         || ' AF 32 FEJLEDE — se grund-kolonnen ovenfor'
  end as resultat;

rollback;
