-- ============================================================
--  PRØVE AF KANALKOLONNEN  (8. sep 2026)
--  ------------------------------------------------------------
--  Kør EFTER bestilling-kanal.sql. Hver prøve skriver BESTOD
--  eller FEJLEDE, og rapporten kommer til sidst som én "fejl" —
--  det er den ene kanal Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der ruller prøvens data tilbage.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  Kolonnens vigtigste egenskab er, at den ALDRIG må kunne
--  afvise en bestilling. En oplysning om, hvilken side gæsten
--  kom ind ad, er ikke værd at have, hvis en tastefejl i en
--  data-attribut kan lukke bestilling på netop den side.
--
--  Derfor måler prøven begge retninger: de fem ord OG den tomme
--  værdi skal tages imod, og kun en værdi, ingen side sender,
--  bliver afvist.
--
--  ⚠️ EGNE DATA, IKKE EJERENS. Dagen, tiden og varen er prøvens
--  egne — læren fra proev-bord-uden-telefon.sql, som faldt TRE
--  gange hos kunden, fordi den lånte ejerens dag, hans vare og
--  hans borde. `bestillinger` har tretten udløsere på sig, og
--  ni af dem kan sige nej til en helt almindelig bestilling.
--
--  KØRER DU DEN PÅ EN BAR POSTGRES? Kør først:
--    grant all on all tables in schema public to anon, authenticated;
--    grant usage, select on all sequences in schema public
--      to anon, authenticated;
-- ============================================================

begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-k', 'Kanalprøven', 'Vej 1', '2670', 'Greve', '11111111')
on conflict (id) do nothing;

create or replace function pg_temp.svar(navn text, ok boolean) returns text
language plpgsql as $$
declare linje text := case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
begin
  perform set_config('proev.rapport',
    coalesce(current_setting('proev.rapport', true), '') || linje || E'\n', true);
  raise notice '%', linje;
  return linje;
end $$;

/* ⚠️ DAGEN OG TIDEN REGNES UD, DE SKRIVES IKKE AF. Et fast
   årstal er en prøve, der holder op med at virke, når
   kalenderen går videre — arret fra 2099-datoen i
   proev-bestillingsnummer.sql (3/9). Og varen har et navn, der
   med vilje ikke kan stå på et menukort: de tre navneværn
   (pris, udsolgt, kategoriens dag) rører aldrig et navn, de
   ikke kan finde. */
create or replace function pg_temp.saet(k text, i int)
returns text language plpgsql as $$
declare
  ref text := 'SM-KANAL-' || i::text;
  /* ⚠️ HVERT INDLÆG SKAL HAVE SIT EGET KLOKKESLÆT, og det kostede
     en kørsel. `bestilling_ikke_dobbelt` er et unikt indeks på
     (lokation, telefon, hent_dato, hent_tid) — så prøve 2 til 5
     blev afvist af DUBLETVAGTEN og ikke af kanalen, og rapporten
     sagde "1 af 5" om en kolonne, der var helt i orden.

     Det er husets ældste ar i prøvernes egen forklædning: en
     prøve, der falder på et VÆRN, den ikke handler om, peger et
     helt andet sted hen end fejlen. Se noten i
     proev-bord-uden-telefon.sql om de tretten udløsere. */
  tid time := ('12:00'::time + (i || ' minutes')::interval);
  /* ⚠️ OG SIT EGET TELEFONNUMMER. `bestilling_bremse_nummer`
     holder FEM bestillinger pr. nummer pr. time (bremse.sql
     linje 90), så prøve nummer seks blev afvist af BREMSEN — og
     rapporten sagde "tom kanal afvist", som om null var
     ulovligt. Prøven udmattede sit eget værn, præcis som
     proev-udlejning.sql gjorde med sine fjorten indsættelser
     (5/9). */
  tlf text := '2030' || lpad(i::text, 4, '0');
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, fyld, antal, hvordan, kanal)
  values (ref, 'proev-k', 'Kanalgæst', tlf,
          current_date + 2, tid,
          '[{"navn":"PRØVEVARE-KANAL","antal":1,"pris":50}]'::jsonb,
          '[]'::jsonb, 1, 'afhentning', k);
  return ref;
end $$;

set local role anon;
set local request.jwt.claims = '{}';

-- =============== 1) DE FEM ORD TAGES IMOD ===================
do $$
declare
  ord text;
  n int := 0;
  i int := 0;
begin
  foreach ord in array array['forside', 'smoerrebroed', 'tapas', 'bestil', 'bord']
  loop
    i := i + 1;
    begin
      perform pg_temp.saet(ord, i);
      n := n + 1;
    exception when others then
      raise notice 'afvist: % (%)', ord, sqlerrm;
    end;
  end loop;
  perform pg_temp.svar('1) alle fem kanaler tages imod (' || n || ' af 5)', n = 5);
end $$;

-- =============== 2) TOM ER OGSÅ ET SVAR =====================
/* ⚠️ DEN VIGTIGSTE PRØVE I FILEN. Gamle rækker har ingen kanal,
   og klienten sender null, når den ikke kender siden. Kunne
   null ikke gemmes, ville hver bestilling fra en ny side blive
   afvist med en rå databasefejl — og gæsten kunne ikke gøre
   noget ved det. */
do $$
declare gik boolean := false;
begin
  begin
    perform pg_temp.saet(null, 10);
    gik := true;
  exception when others then
    raise notice 'tom kanal afvist: %', sqlerrm;
  end;
  perform pg_temp.svar('2) en bestilling UDEN kanal tages imod', gik);
end $$;

-- =============== 3) OG KUN DET UKENDTE AFVISES ==============
/* Modstykket til 1 og 2. Uden den her ville en regel, der tog
   imod ALT, bestå begge de to ovenfor — og så dokumenterer
   kolonnen ikke længere sit eget ordforråd. */
do $$
declare gik boolean := false;
begin
  begin
    perform pg_temp.saet('facebook', 11);
    gik := true;
  exception when others then null;
  end;
  perform pg_temp.svar('3) et ord, ingen side sender, afvises', not gik);
end $$;

-- =============== 4) FEJLEN NÆVNER REGLENS NAVN ==============
/* js/store.js oversætter navnet til dansk. Skifter det, får
   gæsten den rå SQL-fejl at se — samme lov som
   bestilling_dato_ok (3/9). */
do $$
declare navnet boolean := false;
begin
  begin
    perform pg_temp.saet('instagram', 12);
  exception when others then
    navnet := position('bestilling_kanal_ok' in sqlerrm) > 0;
  end;
  perform pg_temp.svar('4) afslaget nævner bestilling_kanal_ok', navnet);
end $$;

-- =============== 5) KOLONNEN AFGØR INGENTING ================
/* ⚠️ KANALEN ER GÆSTENS EGET ORD, IKKE ET BEVIS. Den kommer fra
   browseren og kan ændres med to linjer i en konsol. Det gør
   ikke noget — så længe den ikke kan bruges til at slippe forbi
   et værn.

   Prøven her er derfor den, der beskytter alle de andre: en
   bestilling med kanal 'bord' må IKKE få et bordnummer eller en
   spis her-status af den grund. Databasen binder de to i
   bestilling_bord_hvordan_ok, og kanalen rører ikke den regel.

   ⚠️ OG DEN SKAL LÆSE SOM EJEREN, IKKE SOM GÆSTEN. Første udgave
   stod med `set local role anon` fra indsættelserne — og anon må
   IKKE læse `bestillinger` (det er prøve 7's hele pointe). Så
   fandt SELECT'en ingen række, `r.hvordan = 'afhentning'` blev
   NULL, og prøven skrev FEJLEDE om en række, der var helt rigtig.
   En prøve, der læser med de forkerte øjne, måler ingenting. */
reset role;

do $$
declare r record;
begin
  select bord_nummer, hvordan into r
    from public.bestillinger where reference = 'SM-KANAL-5';
  perform pg_temp.svar(
    '5) kanal ''bord'' giver hverken bordnummer eller spis her',
    r.bord_nummer is null and r.hvordan = 'afhentning');
end $$;

set local role anon;

-- =============== 6) GAMLE RÆKKER FÅR IKKE ET GÆT ============
/* Migreringen har med vilje ingen `default` og ingen
   efterudfyldning. En bestilling fra 19. august kom ind ad en
   side, vi ikke kan vide hvilken var, og et 'forside' skrevet
   på den ville være en påstand, ingen har målt. */
do $$
declare std text;
begin
  select column_default into std
    from information_schema.columns
   where table_schema = 'public' and table_name = 'bestillinger'
     and column_name = 'kanal';
  perform pg_temp.svar('6) kolonnen har ingen standardværdi', std is null);
end $$;

-- =============== 7) OG GÆSTEN MÅ IKKE LÆSE DEN ==============
/* Adgangsreglen på `bestillinger` er urørt: gæsten må skrive,
   ikke læse. Kanalen ændrer ikke det — og hvis den gjorde,
   kunne enhver med anon-nøglen se hele dagens omsætning fordelt
   på sider. */
do $$
declare n int := -1;
begin
  begin
    select count(*) into n from public.bestillinger where lokation_id = 'proev-k';
  exception when others then
    n := -1;
  end;
  perform pg_temp.svar('7) gæsten kan ikke læse bestillingerne', n <= 0);
end $$;

-- ------------------------------------------------------------
--  RAPPORTEN
-- ------------------------------------------------------------
do $$
declare r text := coalesce(current_setting('proev.rapport', true), '(ingen prøver kørte)');
declare antal int := (length(r) - length(replace(r, 'BESTOD', ''))) / 6;
declare faldt int := (length(r) - length(replace(r, 'FEJLEDE', ''))) / 7;
begin
  raise exception E'\n\n===== PRØVE AF KANALKOLONNEN =====\n%\n%\nProevens dato: %\n\n(Fejlen her er med vilje: den ruller proevens data tilbage.)\n',
    r,
    case when faldt = 0
      then 'ALLE ' || antal || ' AF ' || (antal + faldt) || ' BESTOD'
      else '⚠️  ' || faldt || ' FEJLEDE — læs linjerne ovenfor' end,
    current_date + 2;
end $$;

rollback;
