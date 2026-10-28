-- ============================================================
--  PRØVE AF lancering-28-10.sql — levering pr. dag og morgenmadens tilkøb
--  ------------------------------------------------------------
--  Kør EFTER lancering-28-10.sql. Skriver intet blivende (rollback).
--  Hver linje er BESTOD/FEJLEDE med grunden; den sidste siger
--  "ALLE N AF N BESTOD".
-- ============================================================
begin;

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_name = 'dags_regler' and column_name = 'luk_levering')
     or not exists (select 1 from information_schema.columns
                  where table_name = 'menu_varer' and column_name = 'tilvalg') then
    raise exception 'KØR supabase/lancering-28-10.sql FØRST';
  end if;
end $$;

create temp table _svar (nr int, navn text, bestod boolean, grund text) on commit drop;
create temp table _kat (hvad text primary key, id bigint) on commit drop;

insert into public.lokationer (id, navn, adresse, postnr, by) values
  ('proev-l', 'Lanceringshavnen', 'Prøvevej 1', '2670', 'Greve')
on conflict (id) do nothing;
insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker)
select 'proev-l', d, false, '00:00', '23:59' from generate_series(0, 6) d;

with k as (
  insert into public.menu_kategorier (lokation_id, navn, aktiv, afdeling)
  values ('proev-l', 'PRØVE Morgenmad', true, 'mad') returning id)
insert into _kat select 'morgen', id from k;

insert into public.menu_varer (kategori_id, lokation_id, navn, pris, aktiv, udsolgt, tilvalg) values
  ((select id from _kat), 'proev-l', 'PRØVE-ENGLISH', 99, true, false,
   '[{"navn":"Grønt","pris":10},{"navn":"Ekstra spejlæg","pris":10}]'),
  ((select id from _kat), 'proev-l', 'PRØVE-ALLINONE', 40, true, false, null);

insert into public.indstillinger (lokation_id, noegle, vaerdi)
select 'proev-l', n, v from (values
  ('varsel_min_togo', '30'::jsonb), ('bestilling_varsel_timer', '24'::jsonb),
  ('levering', 'true'::jsonb), ('leverings_gebyr', '79'::jsonb),
  ('sidste_bestilling_min', '0'::jsonb),
  ('leverings_zoner', $j$
     { "godkendt": false, "zoner": [
         { "navn": "kerne", "svar": "ja",
           "polygon": [[12.20,55.55],[12.30,55.55],[12.30,55.62],[12.20,55.62]] } ] }
   $j$::jsonb)
) x(n, v);
insert into public.indstillinger (lokation_id, noegle, vaerdi)
select 'proev-l', 'bestilbare_kategorier', jsonb_agg(id) from _kat;

/* +3: levering lukket for sig · +4: to-go lukket, levering åben ·
   +5: to-go lukket, levering TOM (følger to-go) */
insert into public.dags_regler (lokation_id, dato, luk_takeaway, luk_spis_her, luk_levering) values
  ('proev-l', current_date + 3, false, false, true),
  ('proev-l', current_date + 4, true,  false, false),
  ('proev-l', current_date + 5, true,  false, null);

create or replace function pg_temp.best(
  lok text, ref text, dag date, tid time, linjer jsonb, nr int,
  hvordan text default 'afhentning', rolle text default 'anon', bord text default null,
  email text default null)
returns text language plpgsql as $$
declare v_token text;
begin
  /* ⚠️ EN LEVERING SKAL BÆRE EN KVITTITERING SIDEN 20/9
     (supabase/levering-valideret.sql). Hjælperen udsteder den, som
     Edge Function'en ville have gjort — ellers ville hver
     leveringsprøve i filen falde på levering_ikke_valideret, og det
     ville se ud som en fejl i gæstens regler.

     ⚠️ Punktet er MÅLT: 12.2846, 55.5665 er Havnevej 20 i Greve,
     hentet hos Dataforsyningen 20/9. Det ligger inde i zonen, som
     forretningen fik ovenfor. */
  if hvordan = 'levering' then
    v_token := 'PROEV-' || ref;
    insert into public.leverings_valideringer
      (token, lokation_id, dawa_id, adresse, postnr, by, lng, lat, zone, udloeber)
    values (v_token, lok, 'proev-' || ref, 'Prøvevej 9, 2670 Greve',
            '2670', 'Greve', 12.28463387, 55.5664776, 'ja', now() + interval '1 hour')
    on conflict (token) do nothing;
  end if;

  perform set_config('request.jwt.claims',
    case when rolle is null then ''
         else jsonb_strip_nulls(jsonb_build_object('role', rolle, 'email', email))::text end, true);
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     antal, linjer, status, hvordan, bord_nummer, leverings_adresse, leverings_token)
  values
    (ref, lok, 'Prøve Person',
     case when bord is null then '3300' || lpad(nr::text, 4, '0') end,
     dag, tid,
     greatest((select coalesce(sum((l ->> 'antal')::int), 1) from jsonb_array_elements(linjer) l), 1),
     linjer, 'ny', hvordan, bord,
     case when hvordan = 'levering' then 'Prøvevej 9, 2670 Greve' end,
     v_token);
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

-- ---------- LEVERING PR. DAG ----------
select pg_temp.nej(1, 'Levering lukket for sig: levering afvises',
  pg_temp.best('proev-l', 'PL-1', current_date + 3, '12:00',
    '[{"navn":"PRØVE-ALLINONE","antal":1,"pris":40},{"navn":"Levering","antal":1,"pris":79,"emballage":true}]',
    1, 'levering'), 'bestilling_levering_lukket_i_dag');
select pg_temp.ja(2, 'Levering lukket for sig: to-go går stadig igennem',
  pg_temp.best('proev-l', 'PL-2', current_date + 3, '12:00',
    '[{"navn":"PRØVE-ALLINONE","antal":1,"pris":40}]', 2, 'afhentning'));
select pg_temp.nej(3, 'To-go lukket, levering åben: to-go afvises',
  pg_temp.best('proev-l', 'PL-3', current_date + 4, '12:00',
    '[{"navn":"PRØVE-ALLINONE","antal":1,"pris":40}]', 3, 'afhentning'), 'bestilling_takeaway_lukket');
select pg_temp.ja(4, 'To-go lukket, levering åben: LEVERING går igennem (leveringsdagen)',
  pg_temp.best('proev-l', 'PL-4', current_date + 4, '12:00',
    '[{"navn":"PRØVE-ALLINONE","antal":1,"pris":40},{"navn":"Levering","antal":1,"pris":79,"emballage":true}]',
    4, 'levering'));
select pg_temp.ja(5, 'To-go lukket, levering åben: spis her går igennem',
  pg_temp.best('proev-l', 'PL-5', current_date + 4, '12:00',
    '[{"navn":"PRØVE-ALLINONE","antal":1,"pris":40}]', 5, 'spis_her'));
select pg_temp.nej(6, 'Gammel række (luk_levering tom): levering følger to-go og afvises',
  pg_temp.best('proev-l', 'PL-6', current_date + 5, '12:00',
    '[{"navn":"PRØVE-ALLINONE","antal":1,"pris":40},{"navn":"Levering","antal":1,"pris":79,"emballage":true}]',
    6, 'levering'), 'bestilling_levering_lukket_i_dag');
select pg_temp.ja(7, 'En dag uden regel tager imod levering',
  pg_temp.best('proev-l', 'PL-7', current_date + 6, '12:00',
    '[{"navn":"PRØVE-ALLINONE","antal":1,"pris":40},{"navn":"Levering","antal":1,"pris":79,"emballage":true}]',
    7, 'levering'));

-- ---------- MORGENMADENS TILKØB ----------
select pg_temp.ja(8, 'English Breakfast med Grønt + Ekstra spejlæg til 119 går igennem',
  pg_temp.best('proev-l', 'PL-8', current_date + 6, '12:00',
    '[{"navn":"PRØVE-ENGLISH","antal":1,"pris":119,"tilvalg":["Grønt","Ekstra spejlæg"]}]', 8));
select pg_temp.nej(9, 'Tilkøb uden at betale for dem afvises som ny pris',
  pg_temp.best('proev-l', 'PL-9', current_date + 6, '12:00',
    '[{"navn":"PRØVE-ENGLISH","antal":1,"pris":99,"tilvalg":["Grønt","Ekstra spejlæg"]}]', 9),
  'bestilling_pris_aendret');
select pg_temp.nej(10, 'Et tilkøb, retten ikke har, afvises',
  pg_temp.best('proev-l', 'PL-10', current_date + 6, '12:00',
    '[{"navn":"PRØVE-ENGLISH","antal":1,"pris":99,"tilvalg":["Hummer"]}]', 10),
  'bestilling_ukendt_tilvalg');
select pg_temp.nej(11, 'Tilkøb på en ret uden tilkøb afvises',
  pg_temp.best('proev-l', 'PL-11', current_date + 6, '12:00',
    '[{"navn":"PRØVE-ALLINONE","antal":1,"pris":40,"tilvalg":["Grønt"]}]', 11),
  'bestilling_ukendt_tilvalg');
select pg_temp.ja(12, 'Retten uden tilkøb går igennem som før',
  pg_temp.best('proev-l', 'PL-12', current_date + 6, '12:00',
    '[{"navn":"PRØVE-ENGLISH","antal":1,"pris":99}]', 12));
-- ---------- LEVERINGSDAGEN, NÅR LEVERING ELLERS ER SLÅET FRA ----------
update public.indstillinger set vaerdi = 'false'::jsonb
 where lokation_id = 'proev-l' and noegle = 'levering';
insert into public.dags_regler (lokation_id, dato, luk_takeaway, luk_spis_her, luk_levering)
values ('proev-l', current_date + 7, true, false, false);
select pg_temp.ja(14, 'Levering slået fra, men dagen åbner den: levering går igennem',
  pg_temp.best('proev-l', 'PL-14', current_date + 7, '12:00',
    '[{"navn":"PRØVE-ALLINONE","antal":1,"pris":40},{"navn":"Levering","antal":1,"pris":79,"emballage":true}]',
    14, 'levering'));
select pg_temp.nej(15, 'Levering slået fra og ingen dag åbner den: afvises som før',
  pg_temp.best('proev-l', 'PL-15', current_date + 8, '12:00',
    '[{"navn":"PRØVE-ALLINONE","antal":1,"pris":40},{"navn":"Levering","antal":1,"pris":79,"emballage":true}]',
    15, 'levering'), 'bestilling_levering_lukket');

insert into _svar select 13, 'Listen skal være navn + tal — en pris som tekst afvises',
  g is not null and g like '%vare_tilvalg_ok%', coalesce(g, 'GIK IGENNEM')
  from (select pg_temp.sql($s$update public.menu_varer set tilvalg = '[{"navn":"Grønt","pris":"ti"}]'
         where navn = 'PRØVE-ENGLISH'$s$) g) x;

select nr, navn, case when coalesce(bestod, false) then 'BESTOD' else 'FEJLEDE' end as udfald, grund
  from _svar order by nr;
select case
  when (select count(*) from _svar) <> 15 then 'PROEVEN ER UFULDSTAENDIG: ' || (select count(*) from _svar) || ' af 15'
  when (select count(*) from _svar where coalesce(bestod, false)) = 15 then 'ALLE 15 AF 15 BESTOD'
  else (select count(*) from _svar where not coalesce(bestod, false)) || ' AF 15 FEJLEDE' end as resultat;

rollback;
