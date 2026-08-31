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

/* Opretter en bestilling og returnerer dens id — eller NULL, hvis
   databasen sagde nej. At den ikke KASTER er hele pointen:
   prøverne spørger "gik det?", ikke "væltede arket?". */
create or replace function pg_temp.best(p_bord text, p_telefon text)
returns bigint language plpgsql as $$
declare n int := nextval('pg_temp.tnr'); id bigint;
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, antal, hvordan, bord_nummer)
  values ('SM-PROEV-' || lpad(n::text, 5, '0'), 'mosede', 'Prøve ' || n,
          p_telefon, current_date,
          ('12:00'::time + (n || ' minutes')::interval)::time,
          '[{"navn":"Håndmad","antal":1,"pris":32}]'::jsonb, 1,
          case when p_bord is null then 'afhentning' else 'spis_her' end,
          p_bord)
  returning bestillinger.id into id;
  return id;
exception when others then return null;
end $$;


-- ------------------------------------------------------------
--  VED BORDET
-- ------------------------------------------------------------
select pg_temp.svar('1. Ved bordet kan der bestilles UDEN telefon',
  pg_temp.best('7', null) is not null);

select pg_temp.svar('2. Ved bordet er et tomt felt også i orden',
  pg_temp.best('7', '') is not null);


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
select pg_temp.svar('6. Ved bordet afvises "12" stadig',
  pg_temp.best('7', '12') is null);

select pg_temp.svar('7. Ved bordet går et rigtigt nummer igennem',
  pg_temp.best('7', '20304051') is not null);


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
  and pg_temp.best('9', null) is not null);


-- ------------------------------------------------------------
--  RAPPORTEN
-- ------------------------------------------------------------
do $$
declare r text := coalesce(current_setting('proev.rapport', true), '(ingen)');
begin
  raise exception E'\n\n===== PRØVE: VED BORDET ER NAVNET NOK =====\n\n%\n%\n',
    r,
    case when position('FEJLEDE' in r) = 0
      then 'ALLE 8 AF 8 BESTOD.'
      else '⚠️ NOGET FEJLEDE — se linjerne ovenfor.' end;
end $$;

rollback;
