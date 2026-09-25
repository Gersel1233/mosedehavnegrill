-- ============================================================
--  PRØVE: VALG PÅ EN VARE ER DATA  (15. sep 2026)
--  ------------------------------------------------------------
--  Kør EFTER vare-valg.sql og gaestens-regler.sql. Skriver ingenting,
--  der bliver stående: alt rulles tilbage til sidst.
--
--  Skal skrive: ALLE 13 AF 13 BESTOD.
--
--  ⚠️ DEN LÅNER IKKE EJERENS DATA. Egen forretning, egen kategori, egne
--     varer — og hver regel har et modstykke, der SKAL gå igennem.
--  ⚠️ GÆSTEN SPILLES MED request.jwt.claims = {"role":"anon"}, som i
--     proev-gaestens-regler.sql.
-- ============================================================
begin;

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'menu_varer'
                    and column_name = 'valg') then
    raise exception 'KOER supabase/vare-valg.sql FOERST — kolonnen findes ikke.';
  end if;
end $$;

create temp table _svar (nr int, navn text, bestod boolean, grund text) on commit drop;

insert into public.lokationer (id, navn, adresse, postnr, by)
values ('proev-vv', 'Valghavnen', 'Prøvevej 3', '2670', 'Greve')
on conflict (id) do nothing;

insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker)
select 'proev-vv', d, false, '00:00', '23:59' from generate_series(0, 6) d;

insert into public.indstillinger (lokation_id, noegle, vaerdi) values
  ('proev-vv', 'varsel_min_togo', '30'::jsonb);

create temp table _kat on commit drop as
with k as (
  insert into public.menu_kategorier (lokation_id, navn, aktiv, afdeling)
  values ('proev-vv', 'PRØVE Retter', true, 'mad') returning id)
select id from k;

/* ⚠️ PRØVENS KATEGORI SKAL VÆRE BESTILBAR (tilføjet 16/9).

   Kanal-værnet (supabase/kanal-vaern.sql) kom til samme dag og
   spørger, om varens kategori er åben ét eller andet sted. Uden
   en liste blev PRØVE-PITA og PRØVE-COLA afvist med
   bestilling_kategori_lukket — og værnet havde ret:
   Butik.salgsKategorier viser kun smørrebrødets kategorier, når
   ingen liste er sat. Kulissen var en forretning, der ikke
   fandtes. */
insert into public.indstillinger (lokation_id, noegle, vaerdi)
select 'proev-vv', 'bestilbare_kategorier', coalesce(jsonb_agg(k.id), '[]'::jsonb)
  from _kat k
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

insert into public.menu_varer (kategori_id, lokation_id, navn, pris, aktiv, udsolgt, valg) values
  ((select id from _kat), 'proev-vv', 'PRØVE-PITA', 65, true, false, '["Kebab","Kylling","Tun"]'::jsonb),
  ((select id from _kat), 'proev-vv', 'PRØVE-COLA', 25, true, false, null),
  /* ⚠️ TILLÆGGET SÆTTES VED OPRETTELSEN (20/9), ikke med en update:
     prisværnet menu_vare_pris_ejer er BEFORE UPDATE og vogter nu også
     pengene i valglisten. En update herinde ville dø på
     kun_ejeren_saetter_priser, fordi en SQL-fil uden claims ikke er
     ejer — præcis den fælde, proev-pris-vaern.sql beskriver. */
  ((select id from _kat), 'proev-vv', 'PRØVE-IS', 30, true, false,
   '["Vaffel","Bæger",{"navn":"Glutenfri vaffel","tillaeg":3}]'::jsonb);

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
  /* ⚠️ antal ER SUMMEN AF LINJERNE (26/9), som Butik.bestil bygger
     den. Her stod et fast 1 — også på en linje med to is — og
     gaestens-vaern-26-9.sql afviser nu en bestilling, hvis kolonne
     ikke passer til linjerne. Kulissen skal sende det, siden sender. */
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid, antal, linjer, status, hvordan)
  values (ref, 'proev-vv', 'Prøve Person', '3400' || lpad(nr::text, 4, '0'),
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

-- Kolonnens eget krav: en liste med 2-12.
select pg_temp.nej(1, 'Ét valg er ikke et valg',
  pg_temp.sql($s$update public.menu_varer set valg = '["Kebab"]' where navn = 'PRØVE-PITA'$s$),
  'vare_valg_ok');
select pg_temp.nej(2, 'Valg skal være en liste, ikke en tekst',
  pg_temp.sql($s$update public.menu_varer set valg = '"Kebab, Kylling"' where navn = 'PRØVE-PITA'$s$),
  'vare_valg_ok');

-- Gæsten.
select pg_temp.nej(3, 'Pitabrød uden valg afvises',
  pg_temp.best('PR-VV-3', '12:00', '[{"navn":"PRØVE-PITA","antal":1,"pris":65}]', 3),
  'bestilling_mangler_valg');
select pg_temp.nej(4, 'Et valg, der ikke er på listen, afvises',
  pg_temp.best('PR-VV-4', '12:30', '[{"navn":"PRØVE-PITA","antal":1,"pris":65,"variant":"Pølse"}]', 4),
  'bestilling_mangler_valg');
select pg_temp.ja(5, 'Modstykke: et valg fra listen går igennem (store bogstaver er ligegyldige)',
  pg_temp.best('PR-VV-5', '13:00', '[{"navn":"PRØVE-PITA","antal":2,"pris":65,"variant":"kylling"}]', 5));
select pg_temp.ja(6, 'Modstykke: en vare UDEN valg kræver ingenting',
  pg_temp.best('PR-VV-6', '13:30', '[{"navn":"PRØVE-COLA","antal":1,"pris":25}]', 6));
select pg_temp.ja(7, 'En SQL-fil uden claims dømmes ikke af gæstens regler',
  pg_temp.best('PR-VV-7', '14:00', '[{"navn":"PRØVE-PITA","antal":1,"pris":65}]', 7, null));

-- Ejeren tager valgene af igen.
update public.menu_varer set valg = null where navn = 'PRØVE-PITA';
select pg_temp.ja(8, 'Uden valg på varen går pitabrødet igennem igen',
  pg_temp.best('PR-VV-8', '14:30', '[{"navn":"PRØVE-PITA","antal":1,"pris":65}]', 8));

/* ============================================================
   ET VALG MÅ KOSTE EKSTRA  (20. sep 2026)
   ------------------------------------------------------------
   Det trykte is-kort lover "glutenfri vaffel +3,-". Databasen skal
   både KENDE valget i objektform (ellers ville hver isbestilling dø
   på bestilling_mangler_valg) og kræve den RIGTIGE pris — ellers
   kunne en gammel fane bestille den glutenfri vaffel til 30. */
select pg_temp.ja(9, 'Objektformen er stadig et gyldigt valg — med tillægget lagt på',
  pg_temp.best('PR-VV-9', '15:00',
    '[{"navn":"PRØVE-IS","antal":1,"pris":33,"variant":"Glutenfri vaffel"}]', 9));

select pg_temp.nej(10, 'Det glutenfri valg til grundprisen afvises',
  pg_temp.best('PR-VV-10', '15:30',
    '[{"navn":"PRØVE-IS","antal":1,"pris":30,"variant":"Glutenfri vaffel"}]', 10),
  'bestilling_pris_aendret');

select pg_temp.ja(11, 'Modstykke: et valg UDEN tillæg koster stadig grundprisen',
  pg_temp.best('PR-VV-11', '16:00',
    '[{"navn":"PRØVE-IS","antal":2,"pris":30,"variant":"Vaffel"}]', 11));

select pg_temp.nej(12, 'Modstykke: grundprisen PLUS tillæg afvises på et valg uden tillæg',
  pg_temp.best('PR-VV-12', '16:30',
    '[{"navn":"PRØVE-IS","antal":1,"pris":33,"variant":"Bæger"}]', 12),
  'bestilling_pris_aendret');

/* ⚠️ Et valg uden navn er det farlige: siden filtrerer det tomme navn
   fra, og er der så under to tilbage, forsvinder HELE valget, og
   varen får en almindelig tæller igen. Prøves på COLA, som ingen
   tillæg har — ellers ville prisværnet svare først. */
select pg_temp.nej(13, 'Et valg uden navn afvises',
  pg_temp.sql($s$update public.menu_varer set valg = '["Vaffel",{"ingen":"navn"}]'
              where navn = 'PRØVE-COLA'$s$),
  'vare_valg_ok');

select nr, navn,
  case when coalesce(bestod, false) then 'BESTOD' else 'FEJLEDE' end as udfald,
  grund
from _svar order by nr;

select
  'Proevens dato: ' || current_date || ' · forretning: proev-vv' as udgave,
  case
    when (select count(*) from _svar) <> 13
    then 'PROEVEN ER UFULDSTAENDIG: ' || (select count(*) from _svar) || ' af 13 linjer'
    when (select count(*) from _svar where coalesce(bestod, false)) = 13
    then 'ALLE 13 AF 13 BESTOD'
    else (select count(*) from _svar where not coalesce(bestod, false))
         || ' AF 13 FEJLEDE — se grund-kolonnen ovenfor'
  end as resultat;

rollback;
