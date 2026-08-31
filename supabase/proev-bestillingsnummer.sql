-- ============================================================
--  PRØVE: BESTILLINGSNUMMERET  (31. august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet EFTER bestillingsnummer.sql.
--  Skriver ingenting, der bliver stående: alt sker i en
--  transaktion, der rulles tilbage til sidst.
--
--  Skal skrive: ALLE 7 AF 7 BESTOD.
-- ============================================================

begin;

create temp table _svar (nr int, navn text, bestod boolean) on commit drop;

-- Prøvens egen forretning nummer to — tælleren skal være pr.
-- forretning, og det kan kun ses med to.
insert into public.lokationer (id, navn, adresse, postnr, by)
values ('proev-nr2', 'Prøvehavnen', 'Prøvevej 1', '2670', 'Greve')
on conflict (id) do nothing;

-- En bestilling som gæstens egen — kun de påkrævede felter.
-- ⚠️ HVERT KALD SIT EGET NUMMER OG SIN EGEN TID: bremsen (højst
-- 5 pr. telefon pr. døgn) og dubletvagten (samme nummer, dag og
-- tid) er slået TIL på den rigtige database, og en prøve, der
-- selv render ind i dem, måler bremsen og ikke nummereringen.
create or replace function pg_temp.laeg_ind(
  ref text, lok text, nr int, num integer default null,
  gammel boolean default false)
returns integer language plpgsql as $$
declare
  n integer;
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, nummer, oprettet)
  values
    (ref, lok, 'Prøve Person', '000031' || (10 + nr), '2099-01-01',
     make_time(12, nr, 0),
     '[{"navn":"Rejemad","antal":1,"pris":85}]'::jsonb, num,
     case when gammel then now() - interval '2 hours' else now() end)
  returning nummer into n;
  return n;
end $$;

-- 1) Kolonne, trigger og funktion findes
insert into _svar
select 1, 'kolonne, taeller-trigger og nummer-funktion findes',
  exists (select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'bestillinger'
            and column_name = 'nummer')
  and exists (select 1 from pg_trigger where tgname = 'bestilling_nummer')
  and exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
              where ns.nspname = 'public'
                and p.proname = 'mosede_bestillingsnummer' and p.prosecdef);

-- 2) To bestillinger faar 1 og 2 mere end taellerens stand
do $$
declare
  a integer; b integer;
begin
  a := pg_temp.laeg_ind('PRV-NR-1', 'mosede', 1);
  b := pg_temp.laeg_ind('PRV-NR-2', 'mosede', 2);
  insert into _svar values (2, 'numrene taeller op, et ad gangen',
    a is not null and b = a + 1);
end $$;

-- 3) Gaestens eget bud paa et nummer smides vaek
do $$
declare
  n integer;
begin
  n := pg_temp.laeg_ind('PRV-NR-3', 'mosede', 3, 1);
  insert into _svar values (3, 'klientens eget nummer overskrives',
    n is not null and n <> 1);
exception when others then
  insert into _svar values (3, 'klientens eget nummer overskrives', false);
end $$;

-- 4) En anden forretning begynder ved 1 — ikke ved Mosedes tal
do $$
declare
  n integer;
begin
  n := pg_temp.laeg_ind('PRV-NR-4', 'proev-nr2', 4);
  insert into _svar values (4, 'hver forretning har sin egen taeller', n = 1);
exception when others then
  insert into _svar values (4, 'hver forretning har sin egen taeller', false);
end $$;

-- 5) Gaesten kan slaa SIT eget nummer op paa referencen
insert into _svar
select 5, 'kvitteringen kan hente nummeret paa referencen',
  public.mosede_bestillingsnummer('PRV-NR-1') is not null;

-- 6) En reference, der ikke findes, giver ingenting
insert into _svar
select 6, 'en fremmed reference giver ingenting',
  public.mosede_bestillingsnummer('PRV-FINDES-IKKE') is null;

-- 7) Og en gammel raekke giver heller ingenting — kvitteringen
--    staar paa skaermen nu, ikke i morgen
do $$
declare
  n integer;
begin
  n := pg_temp.laeg_ind('PRV-NR-7', 'mosede', 7, null, true);
  insert into _svar values (7, 'en time efter svarer opslaget ikke laengere',
    public.mosede_bestillingsnummer('PRV-NR-7') is null);
end $$;

select nr, navn, case when bestod then 'BESTOD' else 'FEJLEDE' end as udfald
from _svar order by nr;

select case
  when (select count(*) from _svar where bestod) = 7
  then 'ALLE 7 AF 7 BESTOD'
  else 'NOGET FEJLEDE — se listen ovenfor'
end as resultat;

rollback;
