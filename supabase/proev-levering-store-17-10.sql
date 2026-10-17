-- ============================================================
--  PRØVE: STORE BESTILLINGER TAGER LÆNGERE  (17/10 2026)
--  ------------------------------------------------------------
--  Kør EFTER levering-store-17-10.sql. Skriver ingenting, der bliver
--  stående: alt rulles tilbage til sidst.
--
--  Skal skrive: ALLE 10 AF 10 BESTOD.
--
--  Kulissen: køkkenets tid før en levering 30 min., køretur til
--  Karlslunde (2690) 15. Databasen giver 15 minutters margen (MARGEN i
--  værnet), så uden trin afvises en levering til Karlslunde under
--  30 min. (30 + 15 − 15). Trinene er en kulisse — prøvens egne tal,
--  ikke chefens: fra 15 stk. 45 min., fra 30 stk. 60 min.
--
--  ⚠️ DE AFVISTE TIDER ER VALGT, SÅ DEN GAMLE REGEL LOD DEM GÅ. 20 stk.
--     om 35 min. og 30 stk. om 50 min. kom igennem før 17/10 (30 + 15
--     − 15 = 30). SET FEJLE 17/10 på den lokale database uden lappen:
--     prøve 2 og 5 faldt (GIK IGENNEM), de 8 andre bestod. Nr. 5 fælder
--     også et værn, der tog det FØRSTE trin i stedet for det højeste;
--     nr. 7 et, der talte fragten med.
--
--  ⚠️ GÆSTEN SPILLES MED request.jwt.claims = {"role":"anon"}, som i
--     proev-levering-tid-8-10.sql. Personalet har ingen claims og
--     dømmes ikke.
-- ============================================================
begin;

do $$
begin
  if to_regproc('public.mosede_gaestens_regler') is null
     or pg_get_functiondef(to_regproc('public.mosede_gaestens_regler'))
        not like '%levering_store%' then
    raise exception 'KØR supabase/levering-store-17-10.sql FØRST.';
  end if;
end $$;

create temp table _svar (nr int, navn text, bestod boolean, grund text) on commit drop;

-- ---- KULISSEN: egen forretning, egne varer, egen zone ----
insert into public.lokationer (id, navn, adresse, postnr, by)
values ('proev-ls', 'Prøven af store bestillinger', 'Prøvevej 17', '2670', 'Greve')
on conflict (id) do nothing;

insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker)
select 'proev-ls', d, false, '00:00', '23:59' from generate_series(0, 6) d;

create temp table _kat (navn text, id bigint) on commit drop;
with k as (
  insert into public.menu_kategorier (lokation_id, navn, aktiv, afdeling)
  values ('proev-ls', 'PRØVE Retter', true, 'mad'),
         ('proev-ls', 'PRØVE Frokost', true, 'mad')
  returning navn, id)
insert into _kat select navn, id from k;

insert into public.menu_varer (kategori_id, lokation_id, navn, pris, aktiv, udsolgt)
values ((select id from _kat where navn = 'PRØVE Retter'),  'proev-ls', 'PRØVE-BURGER',  80, true, false),
       ((select id from _kat where navn = 'PRØVE Frokost'), 'proev-ls', 'PRØVE-FROKOST', 90, true, false);

insert into public.indstillinger (lokation_id, noegle, vaerdi) values
  ('proev-ls', 'varsel_min_togo', '30'::jsonb),
  ('proev-ls', 'sidste_bestilling_min', '0'::jsonb),
  ('proev-ls', 'bestilling_min_stk', '1'::jsonb),
  ('proev-ls', 'levering', 'true'::jsonb),
  ('proev-ls', 'leverings_gebyr', '0'::jsonb),
  ('proev-ls', 'varsel_min_levering', '30'::jsonb),
  ('proev-ls', 'leverings_koeretid', '{"2690": 15}'::jsonb),
  ('proev-ls', 'leverings_zoner', $j$
    { "godkendt": false, "zoner": [
        { "navn": "kerne", "svar": "ja",
          "polygon": [[12.20,55.55],[12.30,55.55],[12.30,55.62],[12.20,55.62]] } ] }
   $j$::jsonb);

insert into public.indstillinger (lokation_id, noegle, vaerdi)
select 'proev-ls', 'bestilbare_kategorier', coalesce(jsonb_agg(k.id), '[]'::jsonb)
  from _kat k
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

/* Frokosten kræver en time — kategoriens eget varsel, som smørrebrødet. */
insert into public.indstillinger (lokation_id, noegle, vaerdi)
select 'proev-ls', 'kategori_tider',
       jsonb_build_object((select id from _kat where navn = 'PRØVE Frokost')::text,
                          '{"varsel_min": 60}'::jsonb);

-- ---- VÆRKTØJ ----
create or replace function pg_temp.token(t text) returns void
language sql as $$
  insert into public.leverings_valideringer
    (token, lokation_id, dawa_id, adresse, vejnavn, husnr, postnr, by, lng, lat, zone, udloeber)
  values (t, 'proev-ls', 'id-' || t, 'Havnevej 20, 2690 Karlslunde',
          'Havnevej', '20', '2690', 'Karlslunde', 12.28463387, 55.5664776, 'ja',
          now() + interval '2 hours');
$$;

/* Bestil `stk` af én vare til "om N minutter", dansk tid. Med fragt
   lægges fragtlinjen på (emballage: true) — den tæller i kolonnen
   antal, men ikke i køkkenets stk.
   ⚠️ +1: tiden skæres ned til hele minutter. */
create or replace function pg_temp.best(ref text, token text, om_min int, stk int,
                                        hvordan text default 'levering',
                                        vare text default 'PRØVE-BURGER',
                                        pris numeric default 80,
                                        med_fragt boolean default false,
                                        rolle text default 'anon')
returns text language plpgsql as $$
declare
  t timestamp := date_trunc('minute', now() at time zone 'Europe/Copenhagen')
                 + make_interval(mins => om_min + 1);
  linjer jsonb := jsonb_build_array(jsonb_build_object('navn', vare, 'antal', stk, 'pris', pris));
begin
  if med_fragt then
    linjer := linjer || jsonb_build_array(jsonb_build_object(
      'navn', 'Levering', 'antal', 1, 'pris', 0, 'emballage', true));
  end if;
  perform set_config('request.jwt.claims',
    case when rolle is null then '' else json_build_object('role', rolle)::text end, true);
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid, antal, linjer,
     status, hvordan, leverings_adresse, leverings_token)
  values (ref, 'proev-ls', 'Prøve Person',
          '3200' || lpad(regexp_replace(ref, '\D', '', 'g'), 6, '0'),
          t::date, t::time, stk + case when med_fragt then 1 else 0 end, linjer,
          'ny', hvordan,
          case when hvordan = 'levering' then 'Havnevej 20, 2690 Karlslunde' end,
          token);
  perform set_config('request.jwt.claims', '', true);
  return null;
exception when others then
  perform set_config('request.jwt.claims', '', true);
  return sqlerrm;
end $$;

create or replace function pg_temp.nej(nr int, navn text, g text, kode text) returns void
language sql as $$
  insert into _svar values (nr, navn, coalesce(g like '%' || kode || '%', false),
    coalesce(g, 'GIK IGENNEM'));
$$;
create or replace function pg_temp.ja(nr int, navn text, g text) returns void
language sql as $$
  insert into _svar values (nr, navn, g is null, coalesce(g, 'gik igennem'));
$$;

select pg_temp.token('S1'), pg_temp.token('S2'), pg_temp.token('S3'),
       pg_temp.token('S4'), pg_temp.token('S5'), pg_temp.token('S6'),
       pg_temp.token('S7'), pg_temp.token('S8'), pg_temp.token('S9'),
       pg_temp.token('S10');

-- ---- UDEN TRIN ER ALT SOM FØR ----
select pg_temp.ja(1, 'Uden trin: 20 stk. til Karlslunde om 35 min. går igennem (30 + 15)',
  pg_temp.best('PR-LS-1', 'S1', 35, 20));

-- ---- CHEFENS TRIN ----
insert into public.indstillinger (lokation_id, noegle, vaerdi)
values ('proev-ls', 'levering_store', '[{"fra": 15, "min": 45}, {"fra": 30, "min": 60}]'::jsonb);

select pg_temp.nej(2, 'Fra 15 stk. 45 min.: 20 stk. om 35 min. afvises (45 + 15)',
  pg_temp.best('PR-LS-2', 'S2', 35, 20), 'bestilling_for_kort_varsel');
select pg_temp.ja(3, 'Modstykke: 20 stk. om 50 min. går igennem',
  pg_temp.best('PR-LS-3', 'S3', 50, 20));
/* Under det første trin gælder køkkenets egen tid. */
select pg_temp.ja(4, 'Under trinet: 14 stk. om 35 min. går igennem (30 + 15)',
  pg_temp.best('PR-LS-4', 'S4', 35, 14));

/* Det HØJESTE trin, bestillingen når — ikke det første. */
select pg_temp.nej(5, 'Fra 30 stk. 60 min.: 30 stk. om 50 min. afvises (60 + 15)',
  pg_temp.best('PR-LS-5', 'S5', 50, 30), 'bestilling_for_kort_varsel');
select pg_temp.ja(6, 'Modstykke: 30 stk. om 65 min. går igennem',
  pg_temp.best('PR-LS-6', 'S6', 65, 30));

/* ⚠️ FRAGTEN ER IKKE ET STK. Med fragtlinjen er kolonnen antal 15 —
   køkkenets stk. er stadig 14. */
select pg_temp.ja(7, 'Fragten tæller ikke: 14 stk. + fragt om 35 min. går igennem',
  pg_temp.best('PR-LS-7', 'S7', 35, 14, 'levering', 'PRØVE-BURGER', 80, true));

/* Kategoriens varsel og trinet: den længste vinder, køreturen oveni. */
select pg_temp.nej(8, 'Frokost (60) med 20 stk.: om 55 min. afvises (60 + 15, ikke 45 + 15)',
  pg_temp.best('PR-LS-8', 'S8', 55, 20, 'levering', 'PRØVE-FROKOST', 90),
  'bestilling_for_kort_varsel');

-- ---- DE ANDRE SLAGS BESTILLINGER ER URØRTE ----
select pg_temp.ja(9, 'En afhentning på 30 stk. om 35 min. går igennem (trinene er leveringens)',
  pg_temp.best('PR-LS-9', null, 35, 30, 'afhentning'));

/* Personalet tager bestillinger i telefonen og dømmes ikke af et varsel. */
select pg_temp.ja(10, 'Personalet må lægge 30 stk. til levering om 5 min.',
  pg_temp.best('PR-LS-10', null, 5, 30, 'levering', 'PRØVE-BURGER', 80, false, null));

select nr, navn,
  case when coalesce(bestod, false) then 'BESTOD' else 'FEJLEDE' end as udfald, grund
from _svar order by nr;

select
  'Proevens dato: ' || current_date || ' · forretning: proev-ls' as udgave,
  case
    when (select count(*) from _svar) <> 10
    then 'PROEVEN ER UFULDSTAENDIG: ' || (select count(*) from _svar) || ' af 10 linjer'
    when (select count(*) from _svar where coalesce(bestod, false)) = 10
    then 'ALLE 10 AF 10 BESTOD'
    else (select count(*) from _svar where not coalesce(bestod, false))
         || ' AF 10 FEJLEDE — se grund-kolonnen ovenfor'
  end as resultat;

rollback;
