-- ============================================================
--  PRØVE: LEVERINGENS TID — KØKKENET + KØRETUREN  (8/10 2026)
--  ------------------------------------------------------------
--  Kør EFTER levering-tid-8-10.sql. Skriver ingenting, der bliver
--  stående: alt rulles tilbage til sidst.
--
--  Skal skrive: ALLE 15 AF 15 BESTOD.
--
--  Kulissen: to-go 30 min., køkkenets tid før en levering 30 min.,
--  køretider Karlslunde (2690) 15 og Køge (4600) 30. Databasen giver
--  15 minutters margen (MARGEN i værnet), så en levering til
--  Karlslunde afvises under 30 min. (30 + 15 − 15), og til Køge under
--  45 (30 + 30 − 15).
--
--  ⚠️ DE AFVISTE TIDER ER VALGT, SÅ DEN GAMLE REGEL LOD DEM GÅ. 20 min.
--     til Karlslunde og 40 til Køge kom igennem før 8/10 (to-go'ens
--     30 − 15). Falder prøve 1, 3, 5, 8 eller 11, når lappen tages ud
--     af værnet, er det den, der måles — ikke en anden regel.
--
--  ⚠️ GÆSTEN SPILLES MED request.jwt.claims = {"role":"anon"}, som i
--     proev-levering-valideret.sql. Personalet har ingen claims og
--     dømmes ikke.
-- ============================================================
begin;

do $$
begin
  if to_regproc('public.mosede_gaestens_regler') is null
     or pg_get_functiondef(to_regproc('public.mosede_gaestens_regler'))
        not like '%leverings_koeretid%' then
    raise exception 'KØR supabase/levering-tid-8-10.sql FØRST.';
  end if;
end $$;

create temp table _svar (nr int, navn text, bestod boolean, grund text) on commit drop;

-- ---- KULISSEN: egen forretning, egne varer, egen zone ----
insert into public.lokationer (id, navn, adresse, postnr, by)
values ('proev-lt', 'Leveringstidsprøven', 'Prøvevej 8', '2670', 'Greve')
on conflict (id) do nothing;

insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker)
select 'proev-lt', d, false, '00:00', '23:59' from generate_series(0, 6) d;

create temp table _kat (navn text, id bigint) on commit drop;
with k as (
  insert into public.menu_kategorier (lokation_id, navn, aktiv, afdeling)
  values ('proev-lt', 'PRØVE Retter', true, 'mad'),
         ('proev-lt', 'PRØVE Frokost', true, 'mad')
  returning navn, id)
insert into _kat select navn, id from k;

insert into public.menu_varer (kategori_id, lokation_id, navn, pris, aktiv, udsolgt)
values ((select id from _kat where navn = 'PRØVE Retter'),  'proev-lt', 'PRØVE-BURGER',  80, true, false),
       ((select id from _kat where navn = 'PRØVE Frokost'), 'proev-lt', 'PRØVE-FROKOST', 90, true, false);

insert into public.indstillinger (lokation_id, noegle, vaerdi) values
  ('proev-lt', 'varsel_min_togo', '30'::jsonb),
  ('proev-lt', 'sidste_bestilling_min', '0'::jsonb),
  ('proev-lt', 'bestilling_min_stk', '1'::jsonb),
  ('proev-lt', 'levering', 'true'::jsonb),
  ('proev-lt', 'leverings_gebyr', '0'::jsonb),
  ('proev-lt', 'varsel_min_levering', '30'::jsonb),
  ('proev-lt', 'leverings_koeretid', '{"2690": 15, "4600": 30}'::jsonb),
  ('proev-lt', 'dagens_ret', '{"navn": "PRØVE-DAGENS", "pris": 70}'::jsonb),
  ('proev-lt', 'leverings_zoner', $j$
    { "godkendt": false, "zoner": [
        { "navn": "kerne", "svar": "ja",
          "polygon": [[12.20,55.55],[12.30,55.55],[12.30,55.62],[12.20,55.62]] } ] }
   $j$::jsonb);

insert into public.indstillinger (lokation_id, noegle, vaerdi)
select 'proev-lt', 'bestilbare_kategorier', coalesce(jsonb_agg(k.id), '[]'::jsonb)
  from _kat k
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

/* Frokosten kræver en time, som smørrebrødet — kategoriens eget varsel. */
insert into public.indstillinger (lokation_id, noegle, vaerdi)
select 'proev-lt', 'kategori_tider',
       jsonb_build_object((select id from _kat where navn = 'PRØVE Frokost')::text,
                          '{"varsel_min": 60}'::jsonb);

-- ---- VÆRKTØJ ----
/* Ét token pr. prøve (et token kan kun bruges én gang), alle inde i
   zonen; postnummeret er det, prøven handler om. */
create or replace function pg_temp.token(t text, postnr text, by text) returns void
language sql as $$
  insert into public.leverings_valideringer
    (token, lokation_id, dawa_id, adresse, vejnavn, husnr, postnr, by, lng, lat, zone, udloeber)
  values (t, 'proev-lt', 'id-' || t, 'Havnevej 20, ' || postnr || ' ' || by,
          'Havnevej', '20', postnr, by, 12.28463387, 55.5664776, 'ja',
          now() + interval '2 hours');
$$;

/* Bestil til "om N minutter", dansk tid. ⚠️ +1: tiden skæres ned til
   hele minutter, så uden den ville "om 30" være 29 og noget. */
create or replace function pg_temp.best(ref text, token text, om_min int,
                                        hvordan text default 'levering',
                                        vare text default 'PRØVE-BURGER',
                                        pris numeric default 80,
                                        adresse text default null,
                                        rolle text default 'anon')
returns text language plpgsql as $$
declare
  t timestamp := date_trunc('minute', now() at time zone 'Europe/Copenhagen')
                 + make_interval(mins => om_min + 1);
begin
  perform set_config('request.jwt.claims',
    case when rolle is null then '' else json_build_object('role', rolle)::text end, true);
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid, antal, linjer,
     status, hvordan, leverings_adresse, leverings_token)
  /* ⚠️ EGET TELEFONNUMMER PR. PRØVE — bestilling_ikke_dobbelt er et
     unikt indeks på forretning, telefon, dato og tid. */
  values (ref, 'proev-lt', 'Prøve Person',
          '3100' || lpad(regexp_replace(ref, '\D', '', 'g'), 6, '0'),
          t::date, t::time, 1,
          jsonb_build_array(jsonb_build_object('navn', vare, 'antal', 1, 'pris', pris)),
          'ny', hvordan,
          case when hvordan = 'levering'
               then coalesce(adresse, 'Havnevej 20, 2670 Greve') end,
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

select pg_temp.token('T1', '2690', 'Karlslunde'), pg_temp.token('T2', '2690', 'Karlslunde'),
       pg_temp.token('T3', '4600', 'Køge'),       pg_temp.token('T4', '4600', 'Køge'),
       pg_temp.token('T5', '2635', 'Ishøj'),      pg_temp.token('T6', '2635', 'Ishøj'),
       pg_temp.token('T8', '2690', 'Karlslunde'), pg_temp.token('T9', '2690', 'Karlslunde'),
       pg_temp.token('T10', '4600', 'Køge'),      pg_temp.token('T11', '4600', 'Køge'),
       pg_temp.token('T12', '2690', 'Karlslunde'),
       pg_temp.token('T13', '2690', 'Karlslunde'), pg_temp.token('T14', '2690', 'Karlslunde');

-- ---- KØRETUREN PR. POSTNUMMER ----
select pg_temp.nej(1, 'Karlslunde om 20 min. afvises (køkken 30 + køretur 15)',
  pg_temp.best('PR-LT-1', 'T1', 20), 'bestilling_for_kort_varsel');
/* ⚠️ 35 OG IKKE MERE: et værn, der altid tog den LÆNGSTE køretid (30),
   ville afvise 35 til Karlslunde. Det er her, postnummerets eget tal
   måles. */
select pg_temp.ja(2, 'Modstykke: Karlslunde om 35 min. går igennem (sit eget tal, ikke Køges)',
  pg_temp.best('PR-LT-2', 'T2', 35));

select pg_temp.nej(3, 'Køge om 40 min. afvises (køkken 30 + køretur 30)',
  pg_temp.best('PR-LT-3', 'T3', 40), 'bestilling_for_kort_varsel');
select pg_temp.ja(4, 'Modstykke: Køge om 65 min. går igennem',
  pg_temp.best('PR-LT-4', 'T4', 65));

/* Et postnummer uden sit eget tal får den LÆNGSTE køretid — hellere en
   tid for sent i vælgeren end en levering, bilen ikke kan nå. */
select pg_temp.nej(5, 'Et postnummer uden tal (Ishøj) får den længste: om 40 min. afvises',
  pg_temp.best('PR-LT-5', 'T5', 40), 'bestilling_for_kort_varsel');
select pg_temp.ja(6, 'Modstykke: Ishøj om 65 min. går igennem',
  pg_temp.best('PR-LT-6', 'T6', 65));

-- ---- DE ANDRE SLAGS BESTILLINGER ER URØRTE ----
select pg_temp.ja(7, 'En afhentning om 20 min. går stadig igennem (to-go 30)',
  pg_temp.best('PR-LT-7', null, 20, 'afhentning'));

-- ---- KATEGORIENS VARSEL VINDER, OG KØRETUREN LÆGGES OVENI ----
select pg_temp.nej(8, 'Frokost (60 min.) til Karlslunde om 55 min. afvises (60 + 15)',
  pg_temp.best('PR-LT-8', 'T8', 55, 'levering', 'PRØVE-FROKOST', 90),
  'bestilling_for_kort_varsel');
select pg_temp.ja(9, 'Modstykke: frokost til Karlslunde om 80 min. går igennem',
  pg_temp.best('PR-LT-9', 'T9', 80, 'levering', 'PRØVE-FROKOST', 90));

-- ---- DAGENS RET (ingen kategori) FÅR OGSÅ KØRETUREN ----
select pg_temp.nej(10, 'Dagens ret til Køge om 40 min. afvises',
  pg_temp.best('PR-LT-10', 'T10', 40, 'levering', 'PRØVE-DAGENS', 70),
  'bestilling_for_kort_varsel');

/* ⚠️ SERVERENS POSTNUMMER, IKKE GÆSTENS TEKST. Tokenet er Køge; teksten
   siger Karlslunde. Ellers kunne et redigeret felt købe et kvarter. */
select pg_temp.nej(11, 'Køge-token med Karlslunde i teksten: om 40 min. afvises',
  pg_temp.best('PR-LT-11', 'T11', 40, 'levering', 'PRØVE-BURGER', 80,
               'Havnevej 20, 2690 Karlslunde'),
  'bestilling_for_kort_varsel');

-- ---- EJERENS EGNE TAL ----
update public.indstillinger set vaerdi = '45'::jsonb
 where lokation_id = 'proev-lt' and noegle = 'varsel_min_levering';
select pg_temp.nej(12, 'Køkkenets tid sat til 45: Karlslunde om 40 min. afvises (45 + 15)',
  pg_temp.best('PR-LT-12', 'T12', 40), 'bestilling_for_kort_varsel');

/* Uden en eneste køretid er levering, som den var: køkkenets tid alene. */
update public.indstillinger set vaerdi = '30'::jsonb
 where lokation_id = 'proev-lt' and noegle = 'varsel_min_levering';
update public.indstillinger set vaerdi = '{}'::jsonb
 where lokation_id = 'proev-lt' and noegle = 'leverings_koeretid';
select pg_temp.ja(13, 'Uden køretider: Karlslunde om 20 min. går igennem (køkken 30 − margen)',
  pg_temp.best('PR-LT-13', 'T13', 20));
select pg_temp.nej(14, 'Uden køretider: om 10 min. afvises stadig',
  pg_temp.best('PR-LT-14', 'T14', 10), 'bestilling_for_kort_varsel');

-- ---- PERSONALET ----
/* Personalet tager bestillinger i telefonen og dømmes ikke af et varsel. */
select pg_temp.ja(15, 'Personalet må lægge en levering om 5 min.',
  pg_temp.best('PR-LT-15', null, 5, 'levering', 'PRØVE-BURGER', 80, null, null));

select nr, navn,
  case when coalesce(bestod, false) then 'BESTOD' else 'FEJLEDE' end as udfald, grund
from _svar order by nr;

select
  'Proevens dato: ' || current_date || ' · forretning: proev-lt' as udgave,
  case
    when (select count(*) from _svar) <> 15
    then 'PROEVEN ER UFULDSTAENDIG: ' || (select count(*) from _svar) || ' af 15 linjer'
    when (select count(*) from _svar where coalesce(bestod, false)) = 15
    then 'ALLE 15 AF 15 BESTOD'
    else (select count(*) from _svar where not coalesce(bestod, false))
         || ' AF 15 FEJLEDE — se grund-kolonnen ovenfor'
  end as resultat;

rollback;
