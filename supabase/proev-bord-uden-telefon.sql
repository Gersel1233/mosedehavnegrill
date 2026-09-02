-- ============================================================
--  PRØVE AF "VED BORDET ER NAVNET NOK"  (31. aug 2026)
--  ------------------------------------------------------------
--  Kør EFTER bord-uden-telefon.sql. Rapporten kommer til sidst
--  som én "fejl" — den ene kanal, Supabases SQL Editor altid
--  viser, og afbrydelsen er samtidig det, der rydder op.
--
--  Filen skriver ingenting, der bliver stående: den ruller
--  tilbage til sidst.
--
--  ⚠️ PRØVE 3 OG 4 ER DE VIGTIGE. Uden dem ville filen bevise, at
--  telefonen må være tom — og IKKE at den stadig er påkrævet på
--  en bestilling til lugen. Det er dér, opkaldet er den eneste
--  vej tilbage til gæsten.
-- ============================================================

begin;

create or replace function pg_temp.svar(navn text, ok boolean) returns text
language plpgsql as $$
declare linje text := case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
begin
  perform set_config('proev.rapport',
    coalesce(current_setting('proev.rapport', true), '') || linje || E'\n', true);
  raise notice '%', linje;
  return linje;
end $$;

create sequence if not exists pg_temp.tnr;

/* ============================================================
   ⚠️ PRØVEN SKAL VÆLGE EN DAG OG EN TID, DER ER ÅBEN  (2/9)
   ------------------------------------------------------------
   Første udgave bestilte til `current_date` kl. 12.00 med varen
   "Håndmad". Alle tre tal var gæt om ejerens virkelighed, og i
   produktionen faldt SEKS af otte prøver på dem — ikke på
   telefonen, som filen handler om.

   Tabellen `bestillinger` har fjorten udløsere. Ni af dem kan
   sige nej til en helt almindelig bestilling: lukkedagen,
   sæsonen, lukketiden, kategoriens dage, antallet på lager,
   prisen, det udsolgte, bremsen og dubletvagten. En prøve, der
   vælger sin dag og sin vare i hånden, prøver dem alle sammen
   ved siden af den ene, den er skrevet for.

   Derfor: dagen og tiden LÆSES af åbningstiderne, og varen er et
   navn, der med vilje ikke kan stå på kortet.
   ============================================================ */

/* Første åbne dag inden for fjorten dage. Er der lukket i dag —
   vinterlukning, en lukkedag i kalenderen, en ugedag med
   `lukket` — er det ikke prøvens sag; den skal bare finde en dag,
   hvor forretningen tager imod. */
create or replace function pg_temp.dagen() returns date
language sql stable as $$
  select coalesce(min(d.dato), current_date + 1)
    from (select (current_date + g)::date as dato
            from generate_series(0, 14) as g) d
    join public.aabningstider a
      on a.lokation_id = 'mosede'
     and a.ugedag = extract(dow from d.dato)::int
   where not a.lukket
     and a.aabner is not null
     and not exists (
       select 1 from public.kalender k
        where k.lokation_id = 'mosede'
          and k.type = 'lukkedag'
          and d.dato between k.dato and coalesce(k.slut_dato, k.dato));
$$;

/* En halv time inde i åbningstiden — aldrig før der er åbnet, og
   aldrig så sent at en tidlig lukning rammer. */
create or replace function pg_temp.tiden() returns time
language sql stable as $$
  select coalesce(
    (select a.aabner + interval '30 minutes'
       from public.aabningstider a
      where a.lokation_id = 'mosede'
        and a.ugedag = extract(dow from pg_temp.dagen())::int
        and not a.lukket),
    '12:00'::time);
$$;

/* ⚠️ ET NAVN, DER IKKE KAN STÅ PÅ KORTET.

   Pris-værnet, udsolgt-værnet og antals-værnet slår alle op på
   `lower(btrim(navn))` i `menu_varer` — og de rører ALDRIG et
   navn, der ikke er en menuvare (se noten i pris-vaern.sql).
   "Håndmad" var ejerens egen vare, og så afhang prøven af, hvad
   der stod på kortet den dag. Det her navn gør ikke. */
create or replace function pg_temp.varen() returns text
language sql immutable as $$ select 'Prøvevare — rulles tilbage'::text $$;

/* Opretter en bestilling og returnerer dens id — eller NULL, hvis
   databasen sagde nej. At den ikke KASTER er hele pointen:
   prøverne spørger "gik det?", ikke "væltede arket?".

   ⚠️ MEN DEN SKRIVER HVORFOR  (2/9). Første udgave slugte
   fejlen, og så sagde en rød linje kun "det gik ikke" — uden at
   sige, om det var telefonen, bordet, lukketiden eller
   menukortet. Da filen faldt med 6 af 8 i produktionen, kunne
   ingen se af rapporten, hvad der var galt.

   Det er præcis den lære, prøve 6 fik allerede: en prøve, der
   kun spørger "blev den afvist?", består af enhver grund. Nu
   gælder det dem alle sammen — grunden står i rapporten, og
   ÉN kørsel er nok til at vide, hvad der skal rettes. */
create or replace function pg_temp.best(p_bord text, p_telefon text)
returns bigint language plpgsql as $$
declare n int := nextval('pg_temp.tnr'); id bigint;
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, antal, hvordan, bord_nummer)
  values ('SM-PROEV-' || lpad(n::text, 5, '0'), 'mosede', 'Prøve ' || n,
          p_telefon, pg_temp.dagen(),
          (pg_temp.tiden() + (n || ' minutes')::interval)::time,
          ('[{"navn":' || to_jsonb(pg_temp.varen())::text
            || ',"antal":1,"pris":32}]')::jsonb, 1,
          case when p_bord is null then 'afhentning' else 'spis_her' end,
          p_bord)
  returning bestillinger.id into id;
  return id;
exception when others then
  perform set_config('proev.grund',
    coalesce(current_setting('proev.grund', true), '') || '           ↳ ' ||
    coalesce(sqlerrm, '?') || E'\n', true);
  return null;
end $$;
/* Hvorfor sagde databasen nej? En prøve, der kun spørger "blev
   den afvist?", består af enhver grund — også fordi bordet ikke
   fandtes. Prøve 6 skal handle om TELEFONEN. */
create or replace function pg_temp.hvorfor(p_bord text, p_telefon text)
returns text language plpgsql as $$
declare n int := nextval('pg_temp.tnr');
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, antal, hvordan, bord_nummer)
  values ('SM-PROEV-' || lpad(n::text, 5, '0'), 'mosede', 'Prøve ' || n,
          p_telefon, pg_temp.dagen(),
          (pg_temp.tiden() + (n || ' minutes')::interval)::time,
          ('[{"navn":' || to_jsonb(pg_temp.varen())::text
            || ',"antal":1,"pris":32}]')::jsonb, 1,
          case when p_bord is null then 'afhentning' else 'spis_her' end,
          p_bord);
  return 'gik igennem';
exception when others then return coalesce(sqlerrm, '');
end $$;


/* ⚠️ BORDET SKAL FINDES, FØR DER KAN BESTILLES TIL DET.
   ------------------------------------------------------------
   `mosede_bord_findes` i supabase/bordkort.sql afviser enhver
   bestilling, hvis bord_nummer ikke står som et AKTIVT bord i
   tabellen `borde`. Uden linjerne her fejler hver eneste prøve
   med et bord — og de gør det med `bestilling_ukendt_bord`, som
   intet har med telefonen at gøre.

   ⚠️ OG PRØVEN BRUGER SINE EGNE BORDE, IKKE EJERENS 7 OG 9
   (2/9). Første udgave oprettede "7" og "9", hvis de manglede —
   og satte ejerens egne aktive, hvis de fandtes. To ting var
   galt med det: den skrev i hans data (rullet tilbage, men
   alligevel), og den arvede alt, hvad der stod på DE borde. I
   Mosede-projektet er de LÅST med en QR-nøgle, og så afviste
   `bestilling_bord_noegle` hver eneste bestilling med
   `bord_kode_mangler`. Fem prøver faldt på en nøgle, filen slet
   ikke handler om.

   Numrene her kan ikke være ejerens: hans er tal. Bordene ryddes
   af rollback til sidst som alt andet i filen. */
insert into public.borde (lokation_id, nummer, aktiv)
select 'mosede', n, true
  from (values ('PRØVE-A'), ('PRØVE-B')) as v(n)
 where not exists (select 1 from public.borde
                    where lokation_id = 'mosede' and btrim(nummer) = v.n);


-- ------------------------------------------------------------
--  VED BORDET
-- ------------------------------------------------------------
select pg_temp.svar('1. Ved bordet kan der bestilles UDEN telefon',
  pg_temp.best('PRØVE-A', null) is not null);

select pg_temp.svar('2. Ved bordet er et tomt felt også i orden',
  pg_temp.best('PRØVE-A', '') is not null);


-- ------------------------------------------------------------
--  ⚠️ MEN KRAVET ER IKKE VÆK — DET ER FLYTTET
-- ------------------------------------------------------------
select pg_temp.svar('3. Uden bord kræves der stadig et nummer',
  pg_temp.best(null, null) is null);

select pg_temp.svar('4. Uden bord afvises et ugyldigt nummer stadig',
  pg_temp.best(null, '12') is null);

select pg_temp.svar('5. Uden bord går et rigtigt nummer igennem',
  pg_temp.best(null, '20304050') is not null);


-- ------------------------------------------------------------
--  ⚠️ ET SKREVET NUMMER SKAL STADIG VÆRE ET NUMMER
--  Skriver gæsten ved bordet alligevel sit nummer, må "12" ikke
--  slippe igennem i ly af undtagelsen — så ville personalet
--  ringe forgæves.
-- ------------------------------------------------------------
/* ⚠️ OG AFSLAGET SKAL HANDLE OM TELEFONEN. Spurgte prøven kun
   "blev den afvist?", ville den bestå, også fordi bordet ikke
   fandtes — og det var netop dét, der skjulte fejlen ovenfor. */
select pg_temp.svar('6. Ved bordet afvises "12" stadig — og det er telefonens skyld',
  pg_temp.hvorfor('PRØVE-A', '12') like '%bestilling_telefon_ok%');

select pg_temp.svar('7. Ved bordet går et rigtigt nummer igennem',
  pg_temp.best('PRØVE-A', '20304051') is not null);


-- ------------------------------------------------------------
--  ⚠️ DUBLETVAGTEN MÅ IKKE SPÆRRE FOR DEN NÆSTE
--  To borde uden telefon på samme dag ville med den GAMLE,
--  ubetingede unique (telefon, hent_dato, hent_tid) have været to
--  NULL'er — som Postgres tillader — men det delvise indeks fra
--  restaurant.sql holder bordene helt ude. Prøven her er værnet
--  om, at ingen "retter" indekset tilbage.
-- ------------------------------------------------------------
select pg_temp.svar('8. To borde uden telefon på samme minut er to bestillinger',
  (select count(*) from public.bestillinger
    where bord_nummer is not null and telefon is null) >= 1
  and pg_temp.best('PRØVE-B', null) is not null);


-- ------------------------------------------------------------
--  RAPPORTEN
-- ------------------------------------------------------------
do $$
declare
  r text := coalesce(current_setting('proev.rapport', true), '(ingen)');
  g text := coalesce(current_setting('proev.grund', true), '');
begin
  raise exception E'\n\n===== PRØVE: VED BORDET ER NAVNET NOK =====\n\n%\n%\n%\n%\n',
    r,
    /* ⚠️ AFVISNINGERNE STÅR MED, OGSÅ NÅR ALT BESTOD. Prøve 3 og
       4 SKAL afvises, og deres grund er svaret på, om de bestod
       af den rigtige årsag — det var netop dét, der skjulte
       fejlen i august. */
    case when g = '' then '' else E'Databasens egne afslag:\n' || g || E'\n' end,
    'Prøven bestilte til ' || pg_temp.dagen() || ' kl. '
      || to_char(pg_temp.tiden(), 'HH24:MI') || ' — ' || pg_temp.varen() || E'.\n',
    case when position('FEJLEDE' in r) = 0
      then 'ALLE 8 AF 8 BESTOD.'
      else '⚠️ NOGET FEJLEDE — se linjerne ovenfor.' end;
end $$;

rollback;
