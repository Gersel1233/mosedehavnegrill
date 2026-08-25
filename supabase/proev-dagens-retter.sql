-- ============================================================
--  PRØVE AF DAGENS RETTER  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER dagens-retter.sql. Rapporten kommer til sidst som én
--  "fejl" — den ene kanal, Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der rydder op.
--
--  DET, DER SKAL MÅLES, ER TÆLLINGEN. Alt andet i filen er
--  kolonner og regler, man kan se ved at kigge. Tællingen er den
--  eneste del, der gør noget af sig selv — og den eneste, der kan
--  gøre det forkert uden at nogen opdager det.
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

-- Bestillinger laves med en hjælper, så prøverne kan læses.
/* HVER BESTILLING FÅR SIT EGET TIDSPUNKT. bestilling_ikke_dobbelt
   fanger samme telefon + dag + tid, og det er dens ret — men her
   er det seks bestillinger fra den samme prøvegæst, og de skal
   alle sammen igennem for at måle tællingen. */
create sequence if not exists pg_temp.proev_nr;

/* HVER BESTILLING FÅR SIT EGET NUMMER OG SIT EGET TIDSPUNKT.

   To værn står i vejen for en prøve, der laver seks bestillinger
   i træk, og begge to har ret til at gøre det:

   · bestilling_ikke_dobbelt fanger samme telefon + dag + tid
   · bestilling_bremse tæller bestillinger pr. telefonnummer i
     døgnet, så én person ikke kan fylde køkkenet

   Prøven er ikke én gæst, der bestiller seks gange — det er seks
   gæster. Derfor et nyt nummer og et nyt kvarter til hver. */
create or replace function pg_temp.bestil(p_dato date, p_navn text, p_antal int)
returns void language plpgsql as $$
declare n int := nextval('pg_temp.proev_nr');
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid, linjer, antal)
  values ('SM-PROEV-' || lpad(n::text, 5, '0'), 'mosede',
          'Prøve Gæst ' || n, '0000' || lpad(n::text, 4, '0'),
          p_dato, ('11:00'::time + (n || ' minutes')::interval)::time,
          jsonb_build_array(jsonb_build_object('navn', p_navn, 'antal', p_antal, 'pris', 89)),
          p_antal);
end $$;

-- ------------------------------------------------------------
--  FUNDAMENTET
-- ------------------------------------------------------------
select pg_temp.svar('1. Tabellen findes med adgangsregler',
  (select count(*) = 4 from pg_policies
    where schemaname = 'public' and tablename = 'dagens_retter'));

select pg_temp.svar('2. Alle må læse — dagens ret står på forsiden',
  (select count(*) = 1 from pg_policies
    where schemaname = 'public' and tablename = 'dagens_retter'
      and cmd = 'SELECT' and qual = 'true'));

/* Kun personalet må skrive. Kunne gæsten det, kunne hun sætte sin
   egen pris på maden. */
select pg_temp.svar('3. Kun admin må skrive',
  (select count(*) = 3 from pg_policies
    where schemaname = 'public' and tablename = 'dagens_retter'
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
      and (coalesce(qual, '') || coalesce(with_check, '')) like '%is_admin%'));

-- ------------------------------------------------------------
--  FLERE RETTER SAMME DAG
-- ------------------------------------------------------------
insert into public.dagens_retter (lokation_id, dato, navn, pris, sortering)
values ('mosede', current_date, 'Stegt flæsk', 109, 1),
       ('mosede', current_date, 'Fiskefilet', 99, 2);

select pg_temp.svar('4. To retter kan stå på den samme dag',
  (select count(*) = 2 from public.dagens_retter where dato = current_date));

do $$
declare gik boolean := false;
begin
  begin
    insert into public.dagens_retter (lokation_id, dato, navn)
    values ('mosede', current_date, 'stegt flæsk  ');
    exception when unique_violation then gik := true;
  end;
  /* Samme navn to gange samme dag er en tastefejl, ikke to
     retter: gæsten ville se den samme ret med hver sin pris. */
  perform pg_temp.svar('5. Den samme ret kan ikke stå to gange samme dag', gik);
end $$;

-- ------------------------------------------------------------
--  TÆLLINGEN — filens egentlige ærinde
-- ------------------------------------------------------------
update public.dagens_retter set antal_tilbage = 10 where navn = 'Stegt flæsk';

select pg_temp.bestil(current_date, 'Stegt flæsk', 3);

select pg_temp.svar('6. En bestilling tæller retten ned',
  (select antal_tilbage = 7 from public.dagens_retter where navn = 'Stegt flæsk'));

/* NAVNET SAMMENLIGNES UDEN HENSYN TIL STORE BOGSTAVER OG
   MELLEMRUM. Formularen sender varens navn, som det står i
   menukortet — og en ret, der hedder "Stegt flæsk " med et
   mellemrum til sidst, ville ellers aldrig blive talt ned. */
select pg_temp.bestil(current_date, '  STEGT FLÆSK ', 2);

select pg_temp.svar('7. Store bogstaver og mellemrum tæller også',
  (select antal_tilbage = 5 from public.dagens_retter where navn = 'Stegt flæsk'));

/* En ret UDEN et antal tælles ikke. Det er den ret, køkkenet
   laver i det uendelige — og et nul dér ville melde den udsolgt,
   første gang nogen bestilte den. */
select pg_temp.bestil(current_date, 'Fiskefilet', 4);

select pg_temp.svar('8. En ret uden et antal bliver ikke talt',
  (select antal_tilbage is null and udsolgt = false
     from public.dagens_retter where navn = 'Fiskefilet'));

-- ------------------------------------------------------------
--  UDSOLGT SÆTTER SIG SELV
-- ------------------------------------------------------------
select pg_temp.bestil(current_date, 'Stegt flæsk', 5);

select pg_temp.svar('9. Ved nul melder retten sig udsolgt af sig selv',
  (select antal_tilbage = 0 and udsolgt
     from public.dagens_retter where navn = 'Stegt flæsk'));

/* ⚠️ ALDRIG UNDER NUL. To gæster, der trykker i samme sekund, må
   ikke kunne trække antallet negativt — et negativt tal ville
   gøre en udsolgt ret bestilbar igen, næste gang nogen kiggede. */
select pg_temp.bestil(current_date, 'Stegt flæsk', 4);

select pg_temp.svar('10. Antallet kan ikke gå under nul',
  (select antal_tilbage = 0 and udsolgt
     from public.dagens_retter where navn = 'Stegt flæsk'));

-- ------------------------------------------------------------
--  DEN RØRER KUN SIN EGEN DAG OG SIN EGEN FORRETNING
-- ------------------------------------------------------------
insert into public.dagens_retter (lokation_id, dato, navn, antal_tilbage)
values ('mosede', current_date + 1, 'Stegt flæsk', 10);

select pg_temp.bestil(current_date, 'Stegt flæsk', 2);

/* Retten hedder det samme i morgen. Talte bremsen den ned i dag,
   ville morgendagens portioner forsvinde, mens ingen kiggede. */
select pg_temp.svar('11. Kun rettens EGEN dag tælles ned',
  (select antal_tilbage = 10 from public.dagens_retter
    where dato = current_date + 1 and navn = 'Stegt flæsk'));

-- ------------------------------------------------------------
--  RAPPORTEN — afbrydelsen ER oprydningen.
-- ------------------------------------------------------------
do $$
declare
  rapport text := rtrim(coalesce(current_setting('proev.rapport', true), ''), E'\n');
  linjer  text[] := case when rapport = '' then '{}'::text[]
                         else string_to_array(rapport, E'\n') end;
  antal   int := coalesce(array_length(linjer, 1), 0);
  fejl    int;
begin
  select count(*) into fejl from unnest(linjer) as l where l like 'FEJLEDE%';
  raise exception E'\n======= RESULTATET AF DAGENS RETTERS PRØVE =======\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alt er som før.\n\n'
    '%\n\n%\n'
    '=================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 11 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
