-- ============================================================
--  PRØVE: TILVALG PÅ DAGENS RET, OG VARER MED ET DATOVINDUE
--         (1. okt 2026)
--  ------------------------------------------------------------
--  Kør EFTER tilvalg-og-tidsbegraensede-varer-1-10.sql. Skriver
--  ingenting, der bliver stående: alt rulles tilbage til sidst.
--
--  Skal skrive: ALLE 14 AF 14 BESTOD.
--
--  ⚠️ DEN LÅNER IKKE EJERENS DATA. Egen forretning, egen kategori,
--     egne varer — og hver regel har et modstykke, der SKAL gå
--     igennem. Uden modstykkerne ville et værn, der afviser ALT,
--     bestå prøven.
--  ⚠️ GÆSTEN SPILLES MED request.jwt.claims = {"role":"anon"},
--     som i proev-vare-valg.sql.
-- ============================================================
begin;

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'dagens_retter'
                    and column_name = 'tilvalg') then
    raise exception 'KOER supabase/tilvalg-og-tidsbegraensede-varer-1-10.sql FOERST.';
  end if;
end $$;

create temp table _svar (nr int, navn text, bestod boolean, grund text) on commit drop;

insert into public.lokationer (id, navn, adresse, postnr, by)
values ('proev-tv', 'Tilvalgshavnen', 'Prøvevej 5', '2670', 'Greve')
on conflict (id) do nothing;

insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker)
select 'proev-tv', d, false, '00:00', '23:59' from generate_series(0, 6) d;

insert into public.indstillinger (lokation_id, noegle, vaerdi) values
  ('proev-tv', 'varsel_min_togo', '30'::jsonb);

create temp table _kat on commit drop as
with k as (
  insert into public.menu_kategorier (lokation_id, navn, aktiv, afdeling)
  values ('proev-tv', 'PRØVE Retter', true, 'mad') returning id)
select id from k;

-- Se noten i proev-vare-valg.sql: uden listen er kategorien ikke
-- bestilbar, og kanal-værnet svarer før det, prøven måler på.
insert into public.indstillinger (lokation_id, noegle, vaerdi)
select 'proev-tv', 'bestilbare_kategorier', coalesce(jsonb_agg(k.id), '[]'::jsonb)
  from _kat k
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

/* ⚠️ VINDUERNE SÆTTES VED OPRETTELSEN, ikke med en update — samme
   fælde som tillægget 20/9: menu_vare_pris_ejer er BEFORE UPDATE,
   og en SQL-fil uden claims er ikke ejer. */
insert into public.menu_varer
  (kategori_id, lokation_id, navn, pris, aktiv, udsolgt, vis_fra, vis_til) values
  ((select id from _kat), 'proev-tv', 'PRØVE-FAST',   40, true, false, null, null),
  ((select id from _kat), 'proev-tv', 'PRØVE-TILBUD', 25, true, false,
     current_date, current_date + 10),
  ((select id from _kat), 'proev-tv', 'PRØVE-UDLOEBET', 25, true, false,
     current_date - 10, current_date + 1);

-- Dagens ret på den dag, pg_temp.best henter (current_date + 3).
insert into public.dagens_retter (lokation_id, dato, navn, pris, aktiv, udsolgt, tilvalg) values
  ('proev-tv', current_date + 3, 'PRØVE-KARTOFFEL', 55, true, false,
   '[{"navn":"Oksekød","pris":10},{"navn":"Kylling","pris":10}]'::jsonb),
  ('proev-tv', current_date + 3, 'PRØVE-SUPPE', 45, true, false, null);

create or replace function pg_temp.sql(s text) returns text language plpgsql as $$
begin
  execute s;
  return null;
exception when others then
  return sqlerrm;
end $$;

create or replace function pg_temp.best(ref text, tid time, linjer jsonb, nr int,
                                        rolle text default 'anon')
returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when rolle is null then '' else json_build_object('role', rolle)::text end, true);
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid, antal, linjer, status, hvordan)
  values (ref, 'proev-tv', 'Prøve Person', '3400' || lpad(nr::text, 4, '0'),
          current_date + 3, tid,
          (select coalesce(sum((l ->> 'antal')::int), 0) from jsonb_array_elements(linjer) l),
          linjer, 'ny', 'afhentning');
  perform set_config('request.jwt.claims', '', true);
  return null;
exception when others then
  perform set_config('request.jwt.claims', '', true);
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
--  KOLONNENS EGET KRAV
-- ------------------------------------------------------------
select pg_temp.nej(1, 'Tilvalg skal være en liste, ikke en tekst',
  pg_temp.sql($s$update public.dagens_retter set tilvalg = '"Kylling"'
              where navn = 'PRØVE-SUPPE'$s$),
  'dagens_tilvalg_ok');

select pg_temp.nej(2, 'Et tilvalg uden navn afvises',
  pg_temp.sql($s$update public.dagens_retter set tilvalg = '[{"pris":10}]'
              where navn = 'PRØVE-SUPPE'$s$),
  'dagens_tilvalg_ok');

/* ⚠️ DEN FARLIGE: prisen som TEKST. mosede_tilvalg_tillaeg kræver
   et tal og svarer 0 for alt andet — så gæsten fik kyllingen gratis,
   og først kassen ved lugen ville opdage det. */
select pg_temp.nej(3, 'En pris skrevet som tekst afvises',
  pg_temp.sql($s$update public.dagens_retter set tilvalg = '[{"navn":"Kylling","pris":"10"}]'
              where navn = 'PRØVE-SUPPE'$s$),
  'dagens_tilvalg_ok');

select pg_temp.nej(4, 'Et vindue, der slutter før det begynder, afvises',
  pg_temp.sql($s$insert into public.menu_varer
                 (kategori_id, lokation_id, navn, pris, aktiv, udsolgt, vis_fra, vis_til)
               select id, 'proev-tv', 'PRØVE-BAGLÆNS', 10, true, false,
                      current_date + 5, current_date + 1 from _kat$s$),
  'vare_vindue_ok');

-- ------------------------------------------------------------
--  GÆSTEN OG TILVALGENE
-- ------------------------------------------------------------
select pg_temp.ja(5, 'Dagens ret med ét tilvalg: 55 + 10 = 65 går igennem',
  pg_temp.best('PR-TV-5', '12:00',
    '[{"navn":"PRØVE-KARTOFFEL","antal":1,"pris":65,"tilvalg":["Oksekød"]}]', 5));

select pg_temp.ja(6, 'To tilvalg lægges sammen: 55 + 10 + 10 = 75',
  pg_temp.best('PR-TV-6', '12:30',
    '[{"navn":"PRØVE-KARTOFFEL","antal":2,"pris":75,"tilvalg":["Oksekød","Kylling"]}]', 6));

select pg_temp.ja(7, 'Store bogstaver er ligegyldige — som ved valgene',
  pg_temp.best('PR-TV-7', '13:00',
    '[{"navn":"PRØVE-KARTOFFEL","antal":1,"pris":65,"tilvalg":["oksekød"]}]', 7));

select pg_temp.nej(8, 'Tilvalg til grundprisen afvises som prisfusk',
  pg_temp.best('PR-TV-8', '13:30',
    '[{"navn":"PRØVE-KARTOFFEL","antal":1,"pris":55,"tilvalg":["Oksekød"]}]', 8),
  'bestilling_pris_aendret');

/* ⚠️ DEN, DER FÅR KØKKENET TIL AT GÆTTE: et tilvalg, ejeren aldrig
   har skrevet. Tillægget er 0, så prisen passer — og uden værnet
   ville »PRØVE-KARTOFFEL · Hummer« stå på bonen til 55 kr. */
select pg_temp.nej(9, 'Et tilvalg, ejeren ikke har skrevet, afvises',
  pg_temp.best('PR-TV-9', '14:00',
    '[{"navn":"PRØVE-KARTOFFEL","antal":1,"pris":55,"tilvalg":["Hummer"]}]', 9),
  'bestilling_ukendt_tilvalg');

select pg_temp.nej(10, 'En ret UDEN tilvalgsliste tager ikke imod tilvalg',
  pg_temp.best('PR-TV-10', '14:30',
    '[{"navn":"PRØVE-SUPPE","antal":1,"pris":45,"tilvalg":["Oksekød"]}]', 10),
  'bestilling_ukendt_tilvalg');

select pg_temp.ja(11, 'Modstykke: dagens ret UDEN tilvalg går igennem til sin egen pris',
  pg_temp.best('PR-TV-11', '15:00',
    '[{"navn":"PRØVE-KARTOFFEL","antal":1,"pris":55}]', 11));

-- ------------------------------------------------------------
--  GÆSTEN OG DATOVINDUET
-- ------------------------------------------------------------
select pg_temp.ja(12, 'En vare INDEN FOR sit vindue kan bestilles',
  pg_temp.best('PR-TV-12', '15:30', '[{"navn":"PRØVE-TILBUD","antal":1,"pris":25}]', 12));

/* ⚠️ bestilling_ukendt_vare og IKKE bare "ingen pris": lå vinduet i
   prisopslagets `filter`, ville rækken stadig være kendt uden pris,
   prischecket ville blive sprunget over, og en gammel fane kunne
   sende fredagsbarens 55,- i november. Se noten i værnet. */
select pg_temp.nej(13, 'En vare, hvis vindue er udløbet, kan ikke bestilles',
  pg_temp.best('PR-TV-13', '16:00', '[{"navn":"PRØVE-UDLOEBET","antal":1,"pris":25}]', 13),
  'bestilling_ukendt_vare');

select pg_temp.ja(14, 'Modstykke: en vare UDEN vindue står som altid',
  pg_temp.best('PR-TV-14', '16:30', '[{"navn":"PRØVE-FAST","antal":1,"pris":40}]', 14));

select nr, navn,
  case when coalesce(bestod, false) then 'BESTOD' else 'FEJLEDE' end as udfald,
  grund
from _svar order by nr;

select
  'Proevens dato: ' || current_date || ' · forretning: proev-tv' as udgave,
  case
    when (select count(*) from _svar) <> 14
    then 'PROEVEN ER UFULDSTAENDIG: ' || (select count(*) from _svar) || ' af 14 linjer'
    when (select count(*) from _svar where coalesce(bestod, false)) = 14
    then 'ALLE 14 AF 14 BESTOD'
    else (select count(*) from _svar where not coalesce(bestod, false))
         || ' AF 14 FEJLEDE — se grund-kolonnen ovenfor'
  end as resultat;

rollback;
