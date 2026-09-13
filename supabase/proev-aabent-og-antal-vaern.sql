-- ============================================================
--  PRØVE: ÅBENT ER ÅBENT — OG ET ANTAL ER ET LOFT  (13. sep 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet EFTER aabent-og-antal-vaern.sql. Skriver
--  ingenting, der bliver stående: alt sker i en transaktion, der
--  rulles tilbage til sidst.
--
--  Skal skrive: ALLE 8 AF 8 BESTOD.
--
--  ⚠️ DEN LÅNER IKKE EJERENS DATA. Egne forretninger, egne
--     åbningstider, egne dagens retter og en vare, der med vilje ikke
--     kan stå på et kort. Og HVER prøve har et modstykke, der SKAL gå
--     igennem — ellers ville et værn, der sagde nej til alt, bestå.
-- ============================================================
begin;

do $$
begin
  if not exists (select 1 from pg_trigger
                  where tgname = 'bestilling_dagens_ret_vaern'
                    and tgrelid = 'public.bestillinger'::regclass) then
    raise exception 'KOER supabase/aabent-og-antal-vaern.sql FOERST — værnet findes ikke, saa proeven kan ikke maale noget.';
  end if;
end $$;

create temp table _svar (nr int, navn text, bestod boolean, grund text)
  on commit drop;

-- ⚠️ lokationer har tre not null-felter (setup.sql linje 101).
insert into public.lokationer (id, navn, adresse, postnr, by) values
  ('proev-aab',  'Prøvehavnen',   'Prøvevej 1', '2670', 'Greve'),
  ('proev-aab2', 'Prøvehavnen 2', 'Prøvevej 2', '2670', 'Greve')
on conflict (id) do nothing;

-- Dag A (om to dage) er åben 10-20; dag B (om tre dage) er lukket.
-- Ugedag 0 er mandag (isodow − 1). proev-aab2 har INGEN åbningstider.
insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker) values
  ('proev-aab', extract(isodow from current_date + 2)::int - 1, false, '10:00', '20:00'),
  ('proev-aab', extract(isodow from current_date + 3)::int - 1, true,  '10:00', '20:00');

insert into public.dagens_retter (lokation_id, dato, navn, pris, aktiv, sortering, antal_tilbage) values
  ('proev-aab', current_date + 2, 'PRØVE-DAGENS-RET', 99, true, 1, 3),
  ('proev-aab', current_date + 2, 'PRØVE-FRI-RET',    99, true, 2, null);

/* Én indsættelse med sit eget telefonnummer: bremsen holder fem pr.
   nummer, og dubletvagten er unik på (telefon, dato, tid). */
create or replace function pg_temp.best(
  lok text, ref text, dage int, tid text, linjer jsonb, nr int)
returns text language plpgsql as $$
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     antal, linjer, status, hvordan)
  values
    (ref, lok, 'Prøve Person', '2200' || lpad(nr::text, 4, '0'),
     current_date + dage, tid::time, 1, linjer, 'ny', 'afhentning');
  return null;
exception when others then
  return sqlerrm;
end $$;

insert into _svar
select 1, 'En lukket ugedag i åbningstiderne afvises', g like '%bestilling_lukket_dag%', coalesce(g, 'GIK IGENNEM')
  from (select pg_temp.best('proev-aab', 'PR-AAB-1', 3, '12:00', '[{"navn":"PRØVE-VARE-UDEN-KORT","antal":1,"pris":50}]', 1) g) x;
insert into _svar
select 2, 'Modstykke: en åben dag inden for tiden går igennem', g is null, coalesce(g, 'gik igennem')
  from (select pg_temp.best('proev-aab', 'PR-AAB-2', 2, '12:00', '[{"navn":"PRØVE-VARE-UDEN-KORT","antal":1,"pris":50}]', 2) g) x;
insert into _svar
select 3, 'Før åbningstid afvises', g like '%bestilling_uden_for_aabningstid%', coalesce(g, 'GIK IGENNEM')
  from (select pg_temp.best('proev-aab', 'PR-AAB-3', 2, '09:00', '[{"navn":"PRØVE-VARE-UDEN-KORT","antal":1,"pris":50}]', 3) g) x;
insert into _svar
select 4, 'Efter lukketid afvises', g like '%bestilling_uden_for_aabningstid%', coalesce(g, 'GIK IGENNEM')
  from (select pg_temp.best('proev-aab', 'PR-AAB-4', 2, '21:00', '[{"navn":"PRØVE-VARE-UDEN-KORT","antal":1,"pris":50}]', 4) g) x;
insert into _svar
select 5, 'En forretning uden åbningstider afviser ikke', g is null, coalesce(g, 'gik igennem')
  from (select pg_temp.best('proev-aab2', 'PR-AAB-5', 3, '12:00', '[{"navn":"PRØVE-VARE-UDEN-KORT","antal":1,"pris":50}]', 5) g) x;
insert into _svar
select 6, 'Dagens ret: 4 af 3 afvises', g like '%bestilling_for_faa_tilbage%', coalesce(g, 'GIK IGENNEM')
  from (select pg_temp.best('proev-aab', 'PR-AAB-6', 2, '13:00', '[{"navn":"PRØVE-DAGENS-RET","antal":4,"pris":99}]', 6) g) x;
insert into _svar
select 7, 'Dagens ret: 3 af 3 går igennem og tæller ned til udsolgt',
       g is null and (select antal_tilbage = 0 and udsolgt from public.dagens_retter
                       where lokation_id = 'proev-aab' and navn = 'PRØVE-DAGENS-RET'),
       coalesce(g, 'gik igennem · tilbage: ' || (select antal_tilbage from public.dagens_retter
                       where lokation_id = 'proev-aab' and navn = 'PRØVE-DAGENS-RET'))
  from (select pg_temp.best('proev-aab', 'PR-AAB-7', 2, '14:00', '[{"navn":"PRØVE-DAGENS-RET","antal":3,"pris":99}]', 7) g) x;
insert into _svar
select 8, 'En dagens ret uden antal har intet loft', g is null, coalesce(g, 'gik igennem')
  from (select pg_temp.best('proev-aab', 'PR-AAB-8', 2, '15:00', '[{"navn":"PRØVE-FRI-RET","antal":50,"pris":99}]', 8) g) x;

select nr, navn,
  case when coalesce(bestod, false) then 'BESTOD' else 'FEJLEDE' end as udfald,
  grund
from _svar order by nr;

select
  'Proevens dato: ' || current_date || ' · forretninger: proev-aab, proev-aab2' as udgave,
  case
    when (select count(*) from _svar where coalesce(bestod, false)) = 8
    then 'ALLE 8 AF 8 BESTOD'
    else (select count(*) from _svar where not coalesce(bestod, false))
         || ' AF 8 FEJLEDE — se grund-kolonnen ovenfor'
  end as resultat;

rollback;
