-- ============================================================
--  LUKKEDE DAGE AFVISES AF DATABASEN  (august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  HULLET, DEN LUKKER
--  ------------------------------------------------------------
--  Siden viser ikke lukkede dage i datovælgeren — men det er
--  BROWSEREN, der holder øje. Går man udenom siden med to linjer
--  i en konsol, kunne man bestille mad til juleaftensdag eller et
--  bord midt i vinterlukningen, og køkkenet ville først opdage
--  det, når gæsten stod der. Fundet i spiis-gennemlæsningen af
--  vores kode (23/8): det eneste egentlige hul i CHECK-reglerne.
--
--  Reglen bor nu som before-insert-udløsere på BEGGE tabeller,
--  gæsten kan skrive i med en dato: bestillinger og
--  bordbestillinger. Tre spørgsmål pr. række:
--
--    1) Er dagen en lukkedag i kalenderen (også en periode)?
--    2) Er der en tidlig lukning, og ligger tiden efter den?
--       Afhentning skal ligge en halv time før lukketid — samme
--       regel som tidsvælgeren på siden.
--    3) Er der lukket for sæsonen (indstillingen 'saeson')?
--
--  Skraldespandens gendannelse er en UPDATE af slettet-flaget og
--  rammer ikke en insert-udløser — en bestilling, personalet
--  fortryder at have smidt ud på en dag, der siden er lukket,
--  kan stadig hentes tilbage.
--
--  Fejlteksterne ('bestilling_lukket_dag' osv.) oversættes til
--  dansk i js/store.js — navnene her og dér skal følges ad.
--
--  Filen kan køres igen: create or replace + drop/create trigger.
-- ============================================================

/* SECURITY DEFINER, OG HVORFOR DET IKKE ER VALGFRIT.
   ------------------------------------------------------------
   Værnet kører, når GÆSTEN indsætter — altså som rollen anon, med
   row level security slået til. Så er spørgsmålet ikke bare "står
   lukkedagen i kalenderen", men "må den, der bestiller, SE den".

   I dag må hun: kalender_laes_alle lukker med vilje lukkedage og
   tidlige lukninger ud til alle, fordi de afgør, om der er åbent.
   Værnet virkede derfor også uden det her — indtil nogen strammer
   den regel.

   MÅLT på en rigtig Postgres (23/8): sættes læsereglen til
   'using (offentlig)', hvad der ser fornuftigt ud, kunne gæsten
   bestille på en lukket dag igen. Ingen fejl, intet spor — værnet
   så bare en tom kalender og sagde ja. Præcis den stille fejl,
   bremserne har security definer for at undgå.

   search_path = '' og fuldt udskrevne navne hører med: en
   security definer-funktion med løs søgesti er den klassiske vej
   til at køre fremmed kode som ejeren. */
create or replace function public.mosede_dag_aaben()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dato   date;
  v_tid    time;
  v_lukker time;
  v_saeson jsonb;
begin
  /* De to tabeller staver dato og tid forskelligt — det er
     kolonnenavnene fra deres egne skemaer, ikke en smag. Begge
     tidskolonner ER time; første udgave pakkede hent_tid ind i
     nullif(.., '') som var den tekst, og selve sammenligningen
     med '' væltede hver eneste indsættelse. Fundet af prøven:
     de POSITIVE prøver fældede den. */
  if tg_table_name = 'bestillinger' then
    v_dato := new.hent_dato;
    v_tid  := new.hent_tid;
  else
    v_dato := new.dato;
    v_tid  := new.tid;
  end if;

  -- 1) Lukkedag, også som periode (slut_dato tom = én dag)
  if exists (
    select 1 from public.kalender k
     where k.lokation_id = new.lokation_id
       and k.type = 'lukkedag'
       and v_dato between k.dato and coalesce(k.slut_dato, k.dato)
  ) then
    raise exception 'bestilling_lukket_dag';
  end if;

  -- 2) Tidlig lukning: sidste afhentning en halv time før
  select min(k.lukker_kl) into v_lukker
    from public.kalender k
   where k.lokation_id = new.lokation_id
     and k.type = 'tidlig_lukning'
     and v_dato between k.dato and coalesce(k.slut_dato, k.dato)
     and k.lukker_kl is not null;
  if v_lukker is not null and v_tid is not null
     and v_tid > v_lukker - interval '30 minutes' then
    raise exception 'bestilling_efter_lukketid';
  end if;

  -- 3) Sæsonlukning
  select i.vaerdi into v_saeson
    from public.indstillinger i
   where i.lokation_id = new.lokation_id
     and i.noegle = 'saeson';
  if coalesce((v_saeson->>'lukket')::boolean, false) then
    raise exception 'bestilling_saeson_lukket';
  end if;

  return new;
end $$;

drop trigger if exists bestilling_dag_aaben on public.bestillinger;
create trigger bestilling_dag_aaben
  before insert on public.bestillinger
  for each row execute function public.mosede_dag_aaben();

drop trigger if exists bord_dag_aaben on public.bordbestillinger;
create trigger bord_dag_aaben
  before insert on public.bordbestillinger
  for each row execute function public.mosede_dag_aaben();


-- Rapport. Supabases SQL Editor viser kun den sidste sætnings
-- svar — se README-afsnittet "Supabases SQL Editor viser ikke
-- beskeder".
select
  case when (
    select count(*) from information_schema.triggers
     where trigger_name in ('bestilling_dag_aaben', 'bord_dag_aaben')
  ) >= 2
    then '✅ VÆRNET STÅR PÅ BEGGE TABELLER — kør supabase/proev-lukkedag-vaern.sql som efterprøvning'
    else '❌ EN UDLØSER MANGLER — kør filen igen, og læs fejlbeskeden ovenfor'
  end as svar;
