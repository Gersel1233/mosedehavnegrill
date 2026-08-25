-- ============================================================
--  NYHEDER, DER TÆNDER OG SLUKKER SIG SELV  (august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kan køres igen uden at ødelægge noget.
--
--  HVAD DEN GØR
--  ------------------------------------------------------------
--  To valgfrie datoer på en nyhed: vis_fra og vis_til.
--
--  HVORFOR
--  ------------------------------------------------------------
--  "Live musik på molen · lørdag 22. august" skal væk om
--  søndagen. Uden datoer skal NOGEN huske det — og det er den
--  slags, ingen husker, når der er travlt. En nyhed om en fredag,
--  der stadig står i november, får gæsten til at holde op med at
--  læse nyhederne overhovedet.
--
--  TOM BETYDER ALTID. En nyhed uden datoer opfører sig præcis som
--  før, så alt det, der allerede står, bliver stående.
--
--  ⚠️ DET ER IKKE ET FILTER I DATABASEN. Rækkerne hentes stadig
--  alle sammen, og browseren afgør, hvad der vises — ellers ville
--  personalet ikke kunne SE i admin, at en nyhed venter eller er
--  udløbet. Reglen står i Butik.nyhedSynlig i js/store.js.
-- ============================================================

begin;

alter table public.nyheder
  add column if not exists vis_fra date;

alter table public.nyheder
  add column if not exists vis_til date;

comment on column public.nyheder.vis_fra is
  'Vis først fra og med denne dag. Tom = altid.';
comment on column public.nyheder.vis_til is
  'Vis til og med denne dag. Tom = altid.';

/* En slutdato før startdatoen er en nyhed, der aldrig kan vises.
   Den er ikke farlig — den er bare usynlig, og så leder nogen
   efter en fejl i koden. */
alter table public.nyheder
  drop constraint if exists nyhed_vindue_ok;

alter table public.nyheder
  add constraint nyhed_vindue_ok
  check (vis_fra is null or vis_til is null or vis_til >= vis_fra);

commit;

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'nyheder'
      and column_name in ('vis_fra', 'vis_til'))
    as "kolonner (skal være 2)",
  (select count(*) from pg_constraint where conname = 'nyhed_vindue_ok')
    as "vinduet er tjekket (skal være 1)";
