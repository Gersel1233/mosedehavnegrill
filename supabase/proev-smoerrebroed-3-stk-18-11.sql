-- ============================================================
--  PRØVE: 3 STK.-PRISEN  (18/11) — prøver smoerrebroed-3-stk-18-11.sql
--  ------------------------------------------------------------
--  Kør EFTER smoerrebroed-3-stk-18-11.sql. Ruller sig selv tilbage
--  (fejlen til sidst er med vilje). Prøven laver sin egen forretning.
--
--  Det, der betyder noget: en gæst kan ikke skrive sit eget fradrag,
--  og rejemad til 99 tæller ikke med i 3 stk. til 140.
-- ============================================================
begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-3s', '3 stk.-prøven', 'Vej 1', '2670', 'Greve', '11111111')
on conflict (id) do nothing;

create or replace function pg_temp.svar(navn text, ok boolean) returns text
language plpgsql as $$
declare linje text := case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
begin
  perform set_config('proev.rapport',
    coalesce(current_setting('proev.rapport', true), '') || linje || E'\n', true);
  raise notice '%', linje;
  return linje;
end $$;
create or replace function pg_temp.proev(sql text) returns text
language plpgsql as $$
begin
  execute sql;
  return 'gik igennem';
exception when others then return coalesce(sqlerrm, '?');
end $$;

insert into public.menu_kategorier (id, lokation_id, afdeling, navn, sortering, aktiv, rolle, pakke_antal, pakke_pris, pakke_stykpris)
values (990001, 'proev-3s', 'mad', 'Alm. smørrebrød (prøve)', 1, true, 'haandmadder', 3, 110, 39),
       (990002, 'proev-3s', 'mad', 'Stort smørrebrød (prøve)', 2, true, 'smoerrebroed', 3, 140, 55);
insert into public.menu_varer (kategori_id, lokation_id, navn, pris, aktiv, sortering) values
  (990001, 'proev-3s', 'PRØVE-LEVER, alm.', 39, true, 1),
  (990001, 'proev-3s', 'PRØVE-RULLE, alm.', 39, true, 2),
  (990002, 'proev-3s', 'PRØVE-LEVER', 55, true, 1),
  (990002, 'proev-3s', 'PRØVE-REJE', 99, true, 2);

-- Som produktionen: mindst 1 stk. smørrebrød (ellers er 3 stk. for lidt)
insert into public.indstillinger (lokation_id, noegle, vaerdi) values ('proev-3s', 'bestilling_min_stk', '1');

create or replace function pg_temp.laeg(i int, linjer jsonb)
returns text language plpgsql as $$
declare n int;
begin
  select coalesce(sum((l ->> 'antal')::int), 0) into n from jsonb_array_elements(linjer) l;
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, fyld, antal, hvordan, kanal)
  values ('3S-' || i, 'proev-3s', 'Smørrebrødsgæst', '2060' || lpad(i::text, 4, '0'),
          current_date + 2, '12:00'::time + (i || ' minutes')::interval,
          linjer, '[]'::jsonb, n, 'afhentning', 'smoerrebroed');
  return '3S-' || i;
end $$;

set local role anon;
/* ⚠️ rollen SKAL stå i claims: mosede_er_gaest læser den, og uden
   den springes gæstens værn over — så måler prøven ingenting. */
set local request.jwt.claims = '{"role":"anon"}';
do $$
begin
  perform pg_temp.svar('1) uden 3 stk.-linje lander en bestilling som før',
    pg_temp.proev($s$select pg_temp.laeg(1, '[{"navn":"PRØVE-LEVER, alm.","antal":2,"pris":39}]')$s$) = 'gik igennem');
  perform pg_temp.svar('2) 2 lever + 1 rulle (alm.) giver ét sæt à −7 — blandet er ok',
    pg_temp.proev($s$select pg_temp.laeg(2, '[{"navn":"PRØVE-LEVER, alm.","antal":2,"pris":39},{"navn":"PRØVE-RULLE, alm.","antal":1,"pris":39},{"navn":"3 stk. Alm. smørrebrød 110,-","antal":1,"pris":-7,"emballage":true,"pakke":990001}]')$s$) = 'gik igennem');
  perform pg_temp.svar('3) 7 alm. giver to sæt (den syvende til fuld pris)',
    pg_temp.proev($s$select pg_temp.laeg(3, '[{"navn":"PRØVE-LEVER, alm.","antal":7,"pris":39},{"navn":"3 stk.","antal":2,"pris":-7,"emballage":true,"pakke":990001}]')$s$) = 'gik igennem');
  perform pg_temp.svar('4) for mange sæt afvises',
    pg_temp.proev($s$select pg_temp.laeg(4, '[{"navn":"PRØVE-LEVER, alm.","antal":3,"pris":39},{"navn":"3 stk.","antal":2,"pris":-7,"emballage":true,"pakke":990001}]')$s$) like '%bestilling_pakke_forkert%');
  perform pg_temp.svar('5) et selvskrevet fradrag afvises',
    pg_temp.proev($s$select pg_temp.laeg(5, '[{"navn":"PRØVE-LEVER, alm.","antal":3,"pris":39},{"navn":"3 stk.","antal":1,"pris":-100,"emballage":true,"pakke":990001}]')$s$) like '%bestilling_pakke_forkert%');
  perform pg_temp.svar('6) rejemad til 99 tæller ikke med i 3 stk. stort',
    pg_temp.proev($s$select pg_temp.laeg(6, '[{"navn":"PRØVE-LEVER","antal":2,"pris":55},{"navn":"PRØVE-REJE","antal":1,"pris":99},{"navn":"3 stk.","antal":1,"pris":-25,"emballage":true,"pakke":990002}]')$s$) like '%bestilling_pakke_forkert%');
  perform pg_temp.svar('7) alm. og stort blandes ikke i ét sæt',
    pg_temp.proev($s$select pg_temp.laeg(7, '[{"navn":"PRØVE-LEVER","antal":2,"pris":55},{"navn":"PRØVE-LEVER, alm.","antal":1,"pris":39},{"navn":"3 stk.","antal":1,"pris":-25,"emballage":true,"pakke":990002}]')$s$) like '%bestilling_pakke_forkert%');
  perform pg_temp.svar('8) to fradragslinjer for samme kategori afvises',
    pg_temp.proev($s$select pg_temp.laeg(8, '[{"navn":"PRØVE-LEVER, alm.","antal":6,"pris":39},{"navn":"3 stk.","antal":1,"pris":-7,"emballage":true,"pakke":990001},{"navn":"3 stk. igen","antal":1,"pris":-7,"emballage":true,"pakke":990001}]')$s$) like '%bestilling_pakke_forkert%');
  perform pg_temp.svar('9) en kategori uden 3 stk.-pris afvises',
    pg_temp.proev($s$select pg_temp.laeg(9, '[{"navn":"PRØVE-LEVER, alm.","antal":3,"pris":39},{"navn":"3 stk.","antal":1,"pris":-7,"emballage":true,"pakke":1}]')$s$) like '%bestilling_pakke_forkert%');
  perform pg_temp.svar('10) 3 stort giver ét sæt à −25',
    pg_temp.proev($s$select pg_temp.laeg(10, '[{"navn":"PRØVE-LEVER","antal":3,"pris":55},{"navn":"3 stk.","antal":1,"pris":-25,"emballage":true,"pakke":990002}]')$s$) = 'gik igennem');
end $$;
reset role;

do $$
declare b record;
begin
  select * into b from public.bestillinger where reference = '3S-2';
  perform pg_temp.svar('11) bestillingens sum er 110 kr.',
    (select sum((l ->> 'pris')::numeric * (l ->> 'antal')::numeric) from jsonb_array_elements(b.linjer) l) = 110);
  perform pg_temp.svar('12) fradraget er gemt med pakke-mærket', b.linjer -> 2 ->> 'pakke' = '990001');
end $$;

do $$
declare r text := current_setting('proev.rapport', true);
begin
  raise exception E'\n%\n%', r,
    case when r like '%FEJLEDE%' then 'NOGET FEJLEDE' else
      'ALLE ' || (length(r) - length(replace(r, E'\n', ''))) || ' AF '
      || (length(r) - length(replace(r, E'\n', ''))) || ' BESTOD' end;
end $$;
