-- ============================================================
--  PRØVE: EN LEVERING SKAL VÆRE VALIDERET AF SERVEREN  (20/9 2026)
--  ------------------------------------------------------------
--  Kør EFTER levering-zone.sql og levering-valideret.sql. Skriver
--  ingenting, der bliver stående: alt rulles tilbage til sidst.
--
--  Skal skrive: ALLE 14 AF 14 BESTOD.
--
--  ⚠️ DE TO VIGTIGSTE ER NR. 8 OG 9 — manipulationen. Resten er
--     værn; de to er selve pointen: klientens adressefelt må ikke
--     kunne bestemme, hvor maden køres hen.
--
--  ⚠️ GÆSTEN SPILLES MED request.jwt.claims = {"role":"anon"}, som i
--     proev-gaestens-regler.sql. Personalet har ingen claims og
--     dømmes ikke.
-- ============================================================
begin;

do $$
begin
  if to_regproc('public.mosede_levering_valideret') is null then
    raise exception 'KØR supabase/levering-valideret.sql FØRST.';
  end if;
end $$;

create temp table _svar (nr int, navn text, bestod boolean, grund text) on commit drop;

-- ---- KULISSEN: egen forretning, egne varer, egen zone ----
insert into public.lokationer (id, navn, adresse, postnr, by)
values ('proev-lv', 'Leveringsprøven', 'Prøvevej 7', '2670', 'Greve')
on conflict (id) do nothing;

insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker)
select 'proev-lv', d, false, '00:00', '23:59' from generate_series(0, 6) d;

create temp table _kat on commit drop as
with k as (
  insert into public.menu_kategorier (lokation_id, navn, aktiv, afdeling)
  values ('proev-lv', 'PRØVE Retter', true, 'mad') returning id)
select id from k;

insert into public.indstillinger (lokation_id, noegle, vaerdi) values
  ('proev-lv', 'varsel_min_togo', '30'::jsonb),
  ('proev-lv', 'levering', 'true'::jsonb),
  ('proev-lv', 'leverings_gebyr', '0'::jsonb),
  ('proev-lv', 'leverings_zoner', $j$
    { "godkendt": false, "zoner": [
        { "navn": "kerne", "svar": "ja",
          "polygon": [[12.20,55.55],[12.30,55.55],[12.30,55.62],[12.20,55.62]] } ] }
   $j$::jsonb);

insert into public.indstillinger (lokation_id, noegle, vaerdi)
select 'proev-lv', 'bestilbare_kategorier', coalesce(jsonb_agg(k.id), '[]'::jsonb)
  from _kat k
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

insert into public.menu_varer (kategori_id, lokation_id, navn, pris, aktiv, udsolgt)
values ((select id from _kat), 'proev-lv', 'PRØVE-BURGER', 80, true, false);

-- ---- KVITTERINGER, som Edge Function'en ville have udstedt ----
insert into public.leverings_valideringer
  (token, lokation_id, dawa_id, adresse, vejnavn, husnr, postnr, by, lng, lat, zone, udloeber)
values
  ('T-GREVE',   'proev-lv', 'id-greve',   'Havnevej 20, 2670 Greve',
   'Havnevej', '20', '2670', 'Greve', 12.28463387, 55.5664776, 'ja',  now() + interval '2 hours'),
  ('T-UDENFOR', 'proev-lv', 'id-udenfor', 'Rådhuspladsen 1, 1550 København V',
   'Rådhuspladsen', '1', '1550', 'København V', 12.5683, 55.6761, 'nej', now() + interval '2 hours'),
  ('T-UDLOEBET','proev-lv', 'id-udl',     'Havnevej 22, 2670 Greve',
   'Havnevej', '22', '2670', 'Greve', 12.2846, 55.5665, 'ja',  now() - interval '1 minute'),
  ('T-BRUGT',   'proev-lv', 'id-brugt',   'Havnevej 24, 2670 Greve',
   'Havnevej', '24', '2670', 'Greve', 12.2846, 55.5665, 'ja',  now() + interval '2 hours'),
  ('T-ANDEN',   'mosede',   'id-anden',   'Havnevej 26, 2670 Greve',
   'Havnevej', '26', '2670', 'Greve', 12.2846, 55.5665, 'ja',  now() + interval '2 hours');

update public.leverings_valideringer set brugt_af = 1 where token = 'T-BRUGT';

-- ---- VÆRKTØJ ----
create or replace function pg_temp.best(ref text, adresse text, token text,
                                        rolle text default 'anon',
                                        hvordan text default 'levering')
returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when rolle is null then '' else json_build_object('role', rolle)::text end, true);
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid, antal, linjer,
     status, hvordan, leverings_adresse, leverings_token)
  /* ⚠️ EGET TELEFONNUMMER PR. PRØVE. Husets værn bestilling_ikke_dobbelt
     er et unikt indeks på forretning, telefon, dato og tid — det fanger
     dobbeltklik. Delte prøverne ét nummer, ville den ANDEN bestilling,
     der går igennem, falde som en gentagelse, og prøven ville melde en
     fejl, der ikke findes. Nummeret hentes ud af referencen. */
  values (ref, 'proev-lv', 'Prøve Person',
          '3000' || lpad(regexp_replace(ref, '\D', '', 'g'), 6, '0'),
          current_date + 2, '13:00', 1,
          '[{"navn":"PRØVE-BURGER","antal":1,"pris":80}]'::jsonb,
          'ny', hvordan, adresse, token);
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
create or replace function pg_temp.lig(nr int, navn text, faktisk text, ventet text)
returns void language sql as $$
  insert into _svar values (nr, navn, faktisk is not distinct from ventet,
    coalesce(faktisk, '(null)') || ' — ventede ' || coalesce(ventet, '(null)'));
$$;

-- ---- VÆRNENE ----
select pg_temp.nej(1, 'Levering uden token afvises',
  pg_temp.best('PR-LV-1', 'Havnevej 20, 2670 Greve', null), 'levering_ikke_valideret');

select pg_temp.nej(2, 'Et token, ingen har udstedt, afvises',
  pg_temp.best('PR-LV-2', 'Havnevej 20, 2670 Greve', 'FIND-PAA-ET'),
  'levering_ikke_valideret');

select pg_temp.nej(3, 'Et udløbet token afvises',
  pg_temp.best('PR-LV-3', 'Havnevej 22, 2670 Greve', 'T-UDLOEBET'),
  'levering_validering_udloebet');

select pg_temp.nej(4, 'Et brugt token afvises',
  pg_temp.best('PR-LV-4', 'Havnevej 24, 2670 Greve', 'T-BRUGT'),
  'levering_validering_brugt');

/* Et token udstedt til en ANDEN forretning må ikke kunne bruges her.
   Uden den kontrol kunne en kvittering vandre mellem lokationer. */
select pg_temp.nej(5, 'Et token fra en anden forretning afvises',
  pg_temp.best('PR-LV-5', 'Havnevej 26, 2670 Greve', 'T-ANDEN'),
  'levering_ikke_valideret');

select pg_temp.nej(6, 'En adresse uden for zonen afvises',
  pg_temp.best('PR-LV-6', 'Rådhuspladsen 1, 1550 København V', 'T-UDENFOR'),
  'levering_uden_for_omraadet');

-- ---- MODSTYKKET ----
select pg_temp.ja(7, 'Modstykke: gyldigt token inde i zonen går igennem',
  pg_temp.best('PR-LV-7', 'Havnevej 20, 2670 Greve', 'T-GREVE'));

-- ============================================================
--  MANIPULATIONEN — de to vigtigste
-- ============================================================

/* ⚠️ 8) Klienten sender et GYLDIGT Greve-token sammen med en falsk
   adresse i Aalborg. Bestillingen må gerne gå igennem — men
   køkkenet skal få GREVE-adressen. Serverens data vinder. */
insert into public.leverings_valideringer
  (token, lokation_id, dawa_id, adresse, vejnavn, husnr, postnr, by, lng, lat, zone, udloeber)
values ('T-MANIP', 'proev-lv', 'id-manip', 'Havnevej 20, 2670 Greve',
        'Havnevej', '20', '2670', 'Greve', 12.28463387, 55.5664776, 'ja',
        now() + interval '2 hours');

select pg_temp.ja(8, 'Manipulation: falsk adresse sendt med gyldigt token — gik igennem',
  pg_temp.best('PR-LV-8', 'Boulevarden 1, 9000 Aalborg', 'T-MANIP'));

select pg_temp.lig(9, 'Manipulation: køkkenet fik SERVERENS adresse, ikke klientens',
  (select leverings_adresse from public.bestillinger where reference = 'PR-LV-8'),
  'Havnevej 20, 2670 Greve');

/* ⚠️ 10) Omvendt: et token til en adresse UDEN FOR zonen sendes
   sammen med et tilladt postnummer i teksten. Postnummeret må ikke
   kunne redde den. */
select pg_temp.nej(10, 'Manipulation: tilladt postnummer i teksten redder ikke et token udenfor',
  pg_temp.best('PR-LV-10', 'Havnevej 20, 2670 Greve', 'T-UDENFOR'),
  'levering_uden_for_omraadet');

-- ---- ET TOKEN KAN KUN BRUGES ÉN GANG ----
select pg_temp.nej(11, 'Det samme token kan ikke bruges to gange',
  pg_temp.best('PR-LV-11', 'Havnevej 20, 2670 Greve', 'T-GREVE'),
  'levering_validering_brugt');

-- ---- GRÆNSEN FLYTTES, MENS TOKENET LEVER ----
/* Kvitteringen sagde 'ja', da den blev udstedt. Flytter ejeren
   grænsen, skal det NYE område gælde — derfor regnes zonen igen. */
insert into public.leverings_valideringer
  (token, lokation_id, dawa_id, adresse, postnr, lng, lat, zone, udloeber)
values ('T-FLYT', 'proev-lv', 'id-flyt', 'Havnevej 28, 2670 Greve',
        '2670', 12.28463387, 55.5664776, 'ja', now() + interval '2 hours');

update public.indstillinger set vaerdi = $j$
  { "zoner": [ { "navn": "mikro", "svar": "ja",
      "polygon": [[12.00,55.00],[12.01,55.00],[12.01,55.01],[12.00,55.01]] } ] }
$j$::jsonb
 where lokation_id = 'proev-lv' and noegle = 'leverings_zoner';

select pg_temp.nej(12, 'Grænsen flyttet: et gammelt token holder ikke',
  pg_temp.best('PR-LV-12', 'Havnevej 28, 2670 Greve', 'T-FLYT'),
  'levering_uden_for_omraadet');

-- ---- DE ANDRE SLAGS BESTILLINGER ----
select pg_temp.ja(13, 'En afhentning kræver ingen kvittering',
  pg_temp.best('PR-LV-13', null, null, 'anon', 'afhentning'));

/* Personalet tager bestillinger i telefonen og skal ikke igennem et
   adresseopslag for at skrive en adresse, de kender. */
select pg_temp.ja(14, 'Personalet må levere uden kvittering',
  pg_temp.best('PR-LV-14', 'Et sted, vi kender, 2670 Greve', null, null));

select nr, navn,
  case when coalesce(bestod, false) then 'BESTOD' else 'FEJLEDE' end as udfald, grund
from _svar order by nr;

select
  'Proevens dato: ' || current_date || ' · forretning: proev-lv' as udgave,
  case
    when (select count(*) from _svar) <> 14
    then 'PROEVEN ER UFULDSTAENDIG: ' || (select count(*) from _svar) || ' af 14 linjer'
    when (select count(*) from _svar where coalesce(bestod, false)) = 14
    then 'ALLE 14 AF 14 BESTOD'
    else (select count(*) from _svar where not coalesce(bestod, false))
         || ' AF 14 FEJLEDE — se grund-kolonnen ovenfor'
  end as resultat;

rollback;
