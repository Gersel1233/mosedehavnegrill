-- ============================================================
--  PRØVE: LEVERINGSZONEN  (20. sep 2026)
--  ------------------------------------------------------------
--  Kør EFTER supabase/levering-zone.sql. Skriver ingenting, der
--  bliver stående: alt rulles tilbage til sidst.
--
--  Skal skrive: ALLE 16 AF 16 BESTOD.
--
--  ⚠️ DEN LÅNER IKKE EJERENS GRÆNSE. Prøven har sin egen forretning
--     og sin egen zone — et kvadrat med kendte hjørner. Målte vi mod
--     den rigtige polygon, ville prøven falde, den dag ejeren flytter
--     grænsen, og så havde vi en prøve, der straffer en beslutning i
--     stedet for at finde en fejl.
--
--  ⚠️ TALLENE KOMMER UDEFRA. Kvadratets hjørner er valgt i hånden, og
--     punkterne er regnet i forhold til dem. Cafeens eget punkt
--     (12.28463387, 55.5664776) er MÅLT hos DAWA 20/9 — ikke gættet.
-- ============================================================
begin;

do $$
begin
  if to_regprocedure('public.mosede_punkt_i_polygon(numeric,numeric,jsonb)') is null then
    raise exception 'KØR supabase/levering-zone.sql FØRST — funktionen findes ikke.';
  end if;
end $$;

create temp table _svar (nr int, navn text, bestod boolean, grund text) on commit drop;

create or replace function pg_temp.ja(nr int, navn text, faktisk boolean) returns void
language sql as $$
  insert into _svar values (nr, navn, coalesce(faktisk, false),
    case when coalesce(faktisk, false) then 'sandt' else 'FALSK — ventede sandt' end);
$$;
create or replace function pg_temp.lig(nr int, navn text, faktisk text, ventet text)
returns void language sql as $$
  insert into _svar values (nr, navn, faktisk is not distinct from ventet,
    coalesce(faktisk, '(null)') || ' — ventede ' || coalesce(ventet, '(null)'));
$$;

-- Et kvadrat: længde 12.20-12.30, bredde 55.55-55.62.
create temp table _kvadrat on commit drop as
select '[[12.20,55.55],[12.30,55.55],[12.30,55.62],[12.20,55.62]]'::jsonb as p;

-- ---- GEOMETRIEN ----
select pg_temp.ja(1, 'Et punkt midt i kvadratet er inde',
  public.mosede_punkt_i_polygon(12.25, 55.58, (select p from _kvadrat)));

select pg_temp.ja(2, 'København er udenfor',
  not public.mosede_punkt_i_polygon(12.5683, 55.6761, (select p from _kvadrat)));

select pg_temp.ja(3, 'Aarhus er udenfor',
  not public.mosede_punkt_i_polygon(10.2039, 56.1629, (select p from _kvadrat)));

/* ⚠️ DEN KLASSISKE FEJL: længde og bredde byttet om. Mosede bliver
   til et punkt ud for Afrikas horn. Et system, der sagde ja til
   dét, ville sige ja til hvad som helst. */
select pg_temp.ja(4, 'Ombyttede koordinater er udenfor',
  not public.mosede_punkt_i_polygon(55.58, 12.25, (select p from _kvadrat)));

select pg_temp.ja(5, 'Kanten svarer det samme to gange i træk',
  public.mosede_punkt_i_polygon(12.20, 55.58, (select p from _kvadrat))
  is not distinct from
  public.mosede_punkt_i_polygon(12.20, 55.58, (select p from _kvadrat)));

/* ⚠️ VANDRET KANT = DIVISION MED NUL, hvis testen og divisionen står
   i samme udtryk. PostgreSQL garanterer ikke, at `and` kortslutter,
   så værnet er en ydre if. Prøven her ville fejle med
   "division by zero" og ikke med et forkert svar, hvis den forsvandt. */
select pg_temp.ja(6, 'En vandret kant vælter ikke funktionen',
  public.mosede_punkt_i_polygon(12.25, 55.55, (select p from _kvadrat)) is not null);

-- ---- UGYLDIGE DATA MÅ ALDRIG BLIVE ET JA ----
select pg_temp.ja(7, 'Uden koordinater er svaret nej',
  not public.mosede_punkt_i_polygon(null, 55.58, (select p from _kvadrat))
  and not public.mosede_punkt_i_polygon(12.25, null, (select p from _kvadrat)));

select pg_temp.ja(8, 'To punkter er ikke en polygon',
  not public.mosede_punkt_i_polygon(12.25, 55.58, '[[12.20,55.55],[12.30,55.55]]'::jsonb));

select pg_temp.ja(9, 'En polygon, der ikke er en liste, afvises',
  not public.mosede_punkt_i_polygon(12.25, 55.58, '"Greve"'::jsonb)
  and not public.mosede_punkt_i_polygon(12.25, 55.58, 'null'::jsonb)
  and not public.mosede_punkt_i_polygon(12.25, 55.58, '{}'::jsonb));

select pg_temp.ja(10, 'Et hjørne, der ikke er to tal, afvises',
  not public.mosede_punkt_i_polygon(12.25, 55.58,
    '[[12.20,55.55],["12.30","55.55"],[12.30,55.62],[12.20,55.62]]'::jsonb)
  and not public.mosede_punkt_i_polygon(12.25, 55.58,
    '[[12.20,55.55],[12.30],[12.30,55.62],[12.20,55.62]]'::jsonb));

-- ---- ZONERNE: tre udfald, og første træffer vinder ----
insert into public.lokationer (id, navn, adresse, postnr, by)
values ('proev-lz', 'Zoneprøven', 'Prøvevej 5', '2670', 'Greve')
on conflict (id) do nothing;

insert into public.indstillinger (lokation_id, noegle, vaerdi) values
  ('proev-lz', 'leverings_zoner', $j$
   { "godkendt": false, "zoner": [
       { "navn": "kerne",  "svar": "ja",
         "polygon": [[12.22,55.56],[12.26,55.56],[12.26,55.60],[12.22,55.60]] },
       { "navn": "kanten", "svar": "spoerg",
         "polygon": [[12.20,55.55],[12.30,55.55],[12.30,55.62],[12.20,55.62]] } ] }
   $j$::jsonb)
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

select pg_temp.lig(11, 'Midt i kernen er et ja',
  public.mosede_leveringszone(12.24, 55.58, 'proev-lz'), 'ja');

select pg_temp.lig(12, 'Uden for kernen, inde i kanten, er et spørg',
  public.mosede_leveringszone(12.29, 55.61, 'proev-lz'), 'spoerg');

select pg_temp.lig(13, 'Uden for begge er et nej',
  public.mosede_leveringszone(12.5683, 55.6761, 'proev-lz'), 'nej');

/* ⚠️ INGEN GRÆNSE = INGEN LEVERING. En forretning uden zone må ikke
   svare ja til hele landet, bare fordi feltet er tomt. */
select pg_temp.lig(14, 'Uden en zone er svaret nej — ikke ja',
  public.mosede_leveringszone(12.24, 55.58, 'findes-ikke'), 'nej');

/* Et svar, der hverken er ja eller spoerg, er en tastefejl i
   opsætningen og må ikke blive til en leveringsaftale. */
update public.indstillinger set vaerdi = $j$
  { "zoner": [ { "navn": "fejl", "svar": "maaske",
      "polygon": [[12.20,55.55],[12.30,55.55],[12.30,55.62],[12.20,55.62]] } ] }
$j$::jsonb
 where lokation_id = 'proev-lz' and noegle = 'leverings_zoner';

select pg_temp.lig(15, 'Et ukendt zonesvar springes over',
  public.mosede_leveringszone(12.25, 55.58, 'proev-lz'), 'nej');

-- ---- EJERENS EGEN GRÆNSE: cafeen skal kunne levere til sig selv ----
/* Punktet er MÅLT hos DAWA 20/9: Havnevej 20, 2670 Greve. Går den
   her i stykker, er grænsen flyttet, så cafeen ligger uden for sit
   eget leveringsområde — og det skal nogen se med det samme. */
select pg_temp.lig(16, 'Cafeen ligger selv i sin egen zone',
  public.mosede_leveringszone(12.28463387, 55.5664776, 'mosede'), 'ja');

select nr, navn,
  case when coalesce(bestod, false) then 'BESTOD' else 'FEJLEDE' end as udfald, grund
from _svar order by nr;

select
  'Proevens dato: ' || current_date as udgave,
  case
    when (select count(*) from _svar) <> 16
    then 'PROEVEN ER UFULDSTAENDIG: ' || (select count(*) from _svar) || ' af 16 linjer'
    when (select count(*) from _svar where coalesce(bestod, false)) = 16
    then 'ALLE 16 AF 16 BESTOD'
    else (select count(*) from _svar where not coalesce(bestod, false))
         || ' AF 16 FEJLEDE — se grund-kolonnen ovenfor'
  end as resultat;

rollback;
