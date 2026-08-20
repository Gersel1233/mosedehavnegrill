-- ============================================================
--  SPIS HER ELLER TAG MED  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER setup.sql. Kan køres igen uden at ødelægge noget.
--
--  ------------------------------------------------------------
--  HVORFOR EN KOLONNE OG IKKE ET ORD I BESKEDEN
--  ------------------------------------------------------------
--  Spiis lader gæsten vælge "To-go" eller "Spis her", og
--  forskellen er ikke kosmetisk: den ene skal pakkes i en pose,
--  den anden skal stå på et bord med bestik. Skrev gæsten det i
--  fritekstfeltet, ville køkkenet skulle LÆSE sig til det midt i
--  en frokost — og en besked, man kan overse, er en bestilling,
--  der bliver pakket forkert.
--
--  Som kolonne kan admin vise det som et mærke på kortet, og
--  databasen kan afvise alt andet end de to svar.
--
--  Standarden er 'afhentning'. ALLE bestillinger, der allerede
--  ligger i tabellen, er afhentning — det er den eneste form,
--  siden har kunnet indtil nu, så standarden er ikke et gæt.
--
--  OM DET OVERHOVEDET KAN VÆLGES, er ejerens beslutning og står
--  i indstillinger (spis_her). Er den ikke sat, spørger
--  formularen ikke, og hver bestilling er afhentning som før.
-- ============================================================

begin;

alter table public.bestillinger
  add column if not exists hvordan text not null default 'afhentning';

/* Lag 3 af valideringen, som altid: formularen kan omgås med to
   linjer i en browserkonsol, databasen kan ikke. Navnet står i
   fejlen med vilje — js/store.js oversætter det. */
alter table public.bestillinger
  drop constraint if exists bestilling_hvordan_ok;

alter table public.bestillinger
  add constraint bestilling_hvordan_ok
  check (hvordan in ('afhentning', 'spis_her'));

comment on column public.bestillinger.hvordan is
  'afhentning eller spis_her. Standard afhentning — det er den eneste form, siden har kunnet indtil august 2026.';

commit;

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'bestillinger'
      and column_name = 'hvordan') as "kolonnen (skal være 1)",
  (select count(*) from pg_constraint
    where conname = 'bestilling_hvordan_ok') as "reglen (skal være 1)",
  (select count(*) from public.bestillinger where hvordan = 'afhentning')
    as "gamle bestillinger sat til afhentning";

-- ------------------------------------------------------------
--  BAGEFTER
--  Kør supabase/proev-spis-her.sql. Den beviser, at kun de to
--  svar tages imod, og ruller sig selv tilbage.
-- ------------------------------------------------------------
