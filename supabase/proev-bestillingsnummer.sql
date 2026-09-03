-- ============================================================
--  PRØVE: BESTILLINGSNUMMERET  (31. august 2026, rettet 3/9)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet EFTER bestillingsnummer.sql.
--  Skriver ingenting, der bliver stående: alt sker i en
--  transaktion, der rulles tilbage til sidst.
--
--  Skal skrive: ALLE 7 AF 7 BESTOD.
--
--  ⚠️ FILEN KUNNE IKKE BESTÅ I PRODUKTIONEN, SOM DEN VAR
--  ------------------------------------------------------------
--  Fundet 3/9, mens datoværnet blev skrevet. Tre fejl, og alle
--  tre er den SAMME fejl som proev-bord-uden-telefon.sql faldt
--  på tre gange hos kunden: prøven lånte virkeligheden i stedet
--  for at have sin egen.
--
--    1) `antal` mangler. Kolonnen er not null (setup.sql linje
--       309) og udfyldes af INGEN udløser — klienten regner den
--       ud af linjerne. Uden den falder hver eneste indsættelse
--       på 23502, altså på noget helt andet end nummereringen.
--    2) `hent_dato = '2099-01-01'` ligger 73 år ude.
--       Datoreglen holder current_date + 120, så alle fire
--       indsættelser blev afvist.
--    3) Varen hed "Rejemad" og forretningen 'mosede'. Så dømmer
--       ejerens eget menukort, hans lukkedage og hans sæson med
--       — prøve 3, 4 og 7 slugte fejlen og ville have bestået af
--       den forkerte grund.
--
--  ⚠️ PRØVEN LÅNER IKKE EJERENS DATA LÆNGERE. To EGNE
--     forretninger (tælleren er pr. forretning, og det kan kun
--     ses med to), en dato inde i vinduet, og en vare, der med
--     vilje ikke kan stå på kortet — de tre navneværn (pris,
--     udsolgt, kategoriens dage) rører aldrig et navn, de ikke
--     kan finde.
-- ============================================================

begin;

create temp table _svar (nr int, navn text, bestod boolean, grund text)
  on commit drop;

-- Prøvens to egne forretninger. ⚠️ lokationer har tre not
-- null-felter (setup.sql linje 101) — en stub med kun id og navn
-- faldt 30/8.
insert into public.lokationer (id, navn, adresse, postnr, by)
values ('proev-nr1', 'Prøvehavnen 1', 'Prøvevej 1', '2670', 'Greve'),
       ('proev-nr2', 'Prøvehavnen 2', 'Prøvevej 2', '2670', 'Greve')
on conflict (id) do nothing;

-- ⚠️ EN VARE, DER IKKE KAN STÅ PÅ KORTET. mosede_pris_vaern,
-- mosede_udsolgt_vaern og mosede_kategori_dag_vaern slår alle op
-- på NAVNET og rører kun navne, de FINDER. Et navn med et tegn,
-- ejeren aldrig ville skrive, går derfor fri af alle tre — og af
-- delte kategorier, hvor lokation_id er null.
create or replace function pg_temp.varen() returns jsonb
language sql immutable as $$
  select '[{"navn":"Prøvevare — rulles tilbage","antal":1,"pris":85}]'::jsonb
$$;

-- En bestilling som gæstens egen — kun de påkrævede felter.
-- ⚠️ HVERT KALD SIT EGET NUMMER OG SIN EGEN TID: bremsen (højst
-- 5 pr. telefon pr. døgn) og dubletvagten (samme nummer, dag og
-- tid) er slået TIL på den rigtige database, og en prøve, der
-- selv render ind i dem, måler bremsen og ikke nummereringen.
--
-- ⚠️ OG DEN SVARER MED FEJLGRUNDEN. En rød linje, der kun siger
-- "det gik ikke", er dét, der kostede tre runder 2/9 — man kan
-- ikke se, om prøven bestod af den rigtige årsag.
create or replace function pg_temp.laeg_ind(
  ref text, lok text, nr int, num integer default null,
  gammel boolean default false)
returns text language plpgsql as $$
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, antal, nummer, oprettet)
  values
    (ref, lok, 'Prøve Person', '000031' || (10 + nr),
     -- ⚠️ INDE I VINDUET, OG UDREGNET. Et fast årstal er en
     -- prøve, der holder op med at virke, når kalenderen går
     -- videre — og '2099-01-01' virkede aldrig.
     current_date + 2,
     make_time(12, nr, 0),
     pg_temp.varen(), 1, num,
     case when gammel then now() - interval '2 hours' else now() end);
  return null;
exception when others then
  return sqlerrm;
end $$;

-- Nummeret læses TILBAGE af rækken, ikke af `returning`. Det er
-- udløserens virkning set udefra — husets regel om, at ét af
-- tallene skal komme et andet sted fra end det, der måles.
create or replace function pg_temp.nummeret(ref text) returns integer
language sql as $$
  select nummer from public.bestillinger where reference = ref
$$;

-- 1) Kolonne, trigger og funktion findes
insert into _svar
select 1, 'kolonne, taeller-trigger og nummer-funktion findes',
  exists (select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'bestillinger'
            and column_name = 'nummer')
  and exists (select 1 from pg_trigger where tgname = 'bestilling_nummer')
  and exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
              where ns.nspname = 'public'
                and p.proname = 'mosede_giv_bestillingsnummer' and p.prosecdef)
  and exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
              where ns.nspname = 'public'
                and p.proname = 'mosede_bestillingsnummer' and p.prosecdef),
  null;

-- 2) To bestillinger taeller op, et ad gangen
do $$
declare
  ga text; gb text; a integer; b integer;
begin
  ga := pg_temp.laeg_ind('PRV-NR-1', 'proev-nr1', 1);
  gb := pg_temp.laeg_ind('PRV-NR-2', 'proev-nr1', 2);
  a  := pg_temp.nummeret('PRV-NR-1');
  b  := pg_temp.nummeret('PRV-NR-2');
  insert into _svar values (2, 'numrene taeller op, et ad gangen',
    a is not null and b = a + 1, coalesce(ga, gb));
end $$;

-- 3) Gaestens eget bud paa et nummer smides vaek
do $$
declare
  g text; n integer;
begin
  g := pg_temp.laeg_ind('PRV-NR-3', 'proev-nr1', 3, 1);
  n := pg_temp.nummeret('PRV-NR-3');
  insert into _svar values (3, 'klientens eget nummer overskrives',
    n is not null and n <> 1, g);
end $$;

-- 4) En anden forretning begynder ved 1 — ikke ved den foerstes
--    tal. ⚠️ MED EN GLOBAL TAELLER ville den her vaere nummer 4,
--    saa proeven maaler stadig forskellen, ogsaa naar den ikke
--    laener sig paa ejerens raekker.
do $$
declare
  g text; n integer;
begin
  g := pg_temp.laeg_ind('PRV-NR-4', 'proev-nr2', 4);
  n := pg_temp.nummeret('PRV-NR-4');
  insert into _svar values (4, 'hver forretning har sin egen taeller',
    n = 1, g);
end $$;

-- 5) Gaesten kan slaa SIT eget nummer op paa referencen
insert into _svar
select 5, 'kvitteringen kan hente nummeret paa referencen',
  public.mosede_bestillingsnummer('PRV-NR-1') is not null,
  null;

-- 6) En reference, der ikke findes, giver ingenting
insert into _svar
select 6, 'en fremmed reference giver ingenting',
  public.mosede_bestillingsnummer('PRV-FINDES-IKKE') is null,
  null;

-- 7) Og en gammel raekke giver heller ingenting — kvitteringen
--    staar paa skaermen nu, ikke i morgen
do $$
declare
  g text; n integer;
begin
  g := pg_temp.laeg_ind('PRV-NR-7', 'proev-nr1', 7, null, true);
  n := pg_temp.nummeret('PRV-NR-7');
  insert into _svar values (7, 'en time efter svarer opslaget ikke laengere',
    n is not null and public.mosede_bestillingsnummer('PRV-NR-7') is null, g);
end $$;

-- ------------------------------------------------------------
--  RAPPORT
--  ⚠️ LINJEN "PROEVENS DATO" AFGOER, HVILKEN UDGAVE DER KOERTE.
--     Filen faldt hos kunden med en dato i 2099; kunne man ikke
--     se datoen i rapporten, ville en gammel fane i browseren
--     ligne den rettede fil. Læren fra 2/9.
-- ------------------------------------------------------------
select nr, navn,
  case when bestod then 'BESTOD' else 'FEJLEDE' end as udfald,
  grund
from _svar order by nr;

select
  'Proevens dato: ' || (current_date + 2)
    || ' · forretninger: proev-nr1/proev-nr2' as udgave,
  case
    when (select count(*) from _svar where bestod) = 7
    then 'ALLE 7 AF 7 BESTOD'
    else (select count(*) from _svar where not bestod)
         || ' AF 7 FEJLEDE — se grund-kolonnen ovenfor'
  end as resultat;

rollback;
