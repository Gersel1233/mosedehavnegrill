-- ============================================================
--  HVOR MANGE BORDE MÅ BOOKES PR. DAG?  (1. sep 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER borde.sql, bordkort.sql og dagsregler.sql.
--  Filen kan køres igen uden at ødelægge noget.
--
--  ------------------------------------------------------------
--  HVORFOR
--  ------------------------------------------------------------
--  Kundens ord 31/8 om Borde-fanen: *"det er bare den fane, folk
--  booker bord ... man skal bare kunne booke bord til den og den
--  dag, og måske som det eneste administrere, hvor mange borde
--  man kan bestille ud af de 55 på i dag eller dit og dat dag."*
--
--  Indtil nu kunne ALT bookes. `bord_pladser` i indstillinger er
--  et tal, personalet skrev selv, og det bliver kun VIST ("24 af
--  40 pladser sagt ja til") — det spærrer ingenting. En lørdag
--  kunne altså tage tres bookinger til femoghalvtreds borde, og
--  ingen ville opdage det, før folk stod på molen.
--
--  ------------------------------------------------------------
--  ⚠️ GRUNDTALLET ER BORDENE SELV, IKKE ET TAL, VI FINDER PÅ
--  ------------------------------------------------------------
--  Har ejeren ikke sat noget, er loftet antallet af AKTIVE borde
--  i tabellen `borde`. De 55 er data, han selv styrer — og
--  slukker han bord 9 for en sæson, falder loftet med af sig
--  selv. Et hårdkodet 55 ville skulle rettes to steder den dag.
--
--  Tre lag, det snævreste vinder:
--    1) dags_regler.bord_loft         — den ENE dag
--    2) indstillinger.bord_loft_pr_dag — alle dage
--    3) antallet af aktive borde       — grundtallet
--
--  ⚠️ OG VÆRNET LIGGER I DATABASEN, ikke i browseren. To familier,
--  der trykker på det sidste bord i det samme sekund, er ikke et
--  sjældent tilfælde en lørdag i juli — det er dét, der sker, når
--  linket lige er delt. Samme begrundelse som
--  reservation_bremse og udlejning_dagen_er_taget.
--
--  ⚠️ AFVISTE TÆLLER IKKE MED. Et afslag frigiver bordet igen —
--  ellers ville en aflyst booking spærre for en, der gerne vil.
--  Samme regel som pladserne på et arrangement.
-- ============================================================

begin;

-- ------------------------------------------------------------
--  1) LOFTET FOR ÉN DAG
-- ------------------------------------------------------------
alter table public.dags_regler
  add column if not exists bord_loft int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'dagsregel_bord_loft_ok') then
    alter table public.dags_regler
      add constraint dagsregel_bord_loft_ok
      check (bord_loft is null or bord_loft between 0 and 500);
  end if;
end $$;

comment on column public.dags_regler.bord_loft is
  'Højst så mange borde må bookes den dag. Tom = brug det almindelige '
  'loft (indstillinger.bord_loft_pr_dag), ellers antallet af aktive borde. '
  '0 betyder LUKKET for bookinger den dag — og det er noget andet end tom.';


-- ------------------------------------------------------------
--  2) HVAD ER LOFTET SÅ?
--  ------------------------------------------------------------
--  security definer, fordi den skal kunne tælle bordene og læse
--  indstillingerne på gæstens vegne. Søgestien er låst: uden den
--  kunne en angriber lægge sin egen `borde` foran vores.
-- ------------------------------------------------------------
create or replace function public.mosede_bord_loft(p_lokation text, p_dato date)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dag  int;
  v_alle int;
  v_borde int;
begin
  select bord_loft into v_dag
    from public.dags_regler
   where lokation_id = p_lokation and dato = p_dato;
  if v_dag is not null then return v_dag; end if;

  select nullif(btrim(vaerdi #>> '{}'), '')::int into v_alle
    from public.indstillinger
   where lokation_id = p_lokation and noegle = 'bord_loft_pr_dag';
  if v_alle is not null then return v_alle; end if;

  select count(*) into v_borde
    from public.borde
   where lokation_id = p_lokation and aktiv;
  /* ⚠️ INGEN BORDE OPRETTET = INTET LOFT, IKKE NUL.
     bord/ har taget imod bookinger siden fase 4, længe før
     tabellen `borde` fandtes — og en forretning, der ikke har
     tastet sine borde ind, har ikke sagt, at der er lukket.
     Returnerede vi nul her, ville hver eneste booking blive
     afvist i det sekund, filen blev kørt, og ejeren ville ikke
     kunne se hvorfor. Ejerens egne nul (dagens eget loft og det
     almindelige) lukker stadig dagen — dét er en beslutning. */
  return nullif(v_borde, 0);
exception when others then
  /* ⚠️ ET UBRUGELIGT TAL MÅ IKKE LUKKE BOOKINGEN. Står der
     "otte borde" i feltet, fejler ::int — og så er svaret
     bordene selv, ikke nul. Et nul her ville lukke hele
     bookingsiden på en tastefejl. */
  select count(*) into v_borde
    from public.borde
   where lokation_id = p_lokation and aktiv;
  return nullif(v_borde, 0);
end $$;

comment on function public.mosede_bord_loft(text, date) is
  'Hvor mange borde må bookes den dag: dagens eget loft, ellers det '
  'almindelige, ellers antallet af aktive borde.';


-- ------------------------------------------------------------
--  3) VÆRNET
-- ------------------------------------------------------------
create or replace function public.bord_loft_vaern()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_loft  int;
  v_taget int;
begin
  v_loft := public.mosede_bord_loft(new.lokation_id, new.dato);

  /* Ingen borde oprettet endnu, og intet loft sat: så er der
     ikke noget at spærre med, og bookingen går igennem som før
     filen blev kørt. Se noten i mosede_bord_loft. */
  if v_loft is null then return new; end if;

  select count(*) into v_taget
    from public.bordbestillinger b
   where b.lokation_id = new.lokation_id
     and b.dato = new.dato
     and b.slettet is null
     and b.status <> 'afvist';

  if v_taget >= v_loft then
    raise exception 'Der er ikke flere borde den dag. Prøv en anden dag, '
      'eller ring til os — vi kan nogle gange finde plads alligevel.'
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists bord_loft on public.bordbestillinger;
create trigger bord_loft
  before insert on public.bordbestillinger
  for each row execute function public.bord_loft_vaern();


-- ------------------------------------------------------------
--  4) HVILKE DAGE ER FYLDT?
--  ------------------------------------------------------------
--  ⚠️ VISNINGEN MÅ ALDRIG FÅ EN KOLONNE MERE. Den kører med sin
--  EJERS øjne og springer adgangsreglerne over — det er hele
--  meningen, for gæsten skal kunne se "den dag er fuld" uden at
--  kunne læse, HVEM der har taget bordene. Kommer der et navn
--  eller et telefonnummer med, er gæstelisten åben for
--  internettet. Samme regel som optagne_dage og
--  arrangement_pladser.
--
--  Kun 60 dage frem: bookingsiden viser fjorten, og en visning
--  over hele historikken ville være et opslag i hver eneste
--  booking, der nogensinde er lavet.
--
--  ⚠️ ÉN RÆKKE PR. DAG, OGSÅ DE TOMME. Første udgave grupperede
--  BOOKINGERNE — altså fandtes en dag kun i visningen, hvis nogen
--  allerede havde booket den. Så kunne et loft på nul aldrig ses
--  på hjemmesiden: dagen manglede i svaret, striben tilbød den,
--  og gæsten fik først nej ved afsendelsen. Og det er præcis den
--  lukkede lørdag, ejeren bad om at kunne lave. Dagene tælles
--  derfor frem, og bookingerne slås op pr. dag.
-- ------------------------------------------------------------
create or replace view public.bord_fyldte_dage
with (security_invoker = false) as
  select l.id as lokation_id,
         g.dag::date as dato,
         (select count(*)::int
            from public.bordbestillinger b
           where b.lokation_id = l.id
             and b.dato = g.dag::date
             and b.slettet is null
             and b.status <> 'afvist') as taget,
         public.mosede_bord_loft(l.id, g.dag::date) as loft
    from public.lokationer l
   cross join generate_series(current_date - 1, current_date + 60,
                              interval '1 day') as g(dag);

comment on view public.bord_fyldte_dage is
  'Hvor mange borde er taget pr. dag, og hvad er loftet. KUN tal — '
  'tilføj aldrig navn, telefon eller besked her.';

revoke all on public.bord_fyldte_dage from public;
grant select on public.bord_fyldte_dage to anon, authenticated;

commit;

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'dags_regler'
      and column_name = 'bord_loft')
    as "dagens loft findes (skal vaere 1)",
  (select count(*) from pg_trigger where tgname = 'bord_loft')
    as "vaernet staar (skal vaere 1)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'bord_fyldte_dage')
    as "visningens kolonner (skal vaere 4)";
