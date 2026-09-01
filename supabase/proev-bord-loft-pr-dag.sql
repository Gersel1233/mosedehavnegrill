-- ============================================================
--  PRØVE AF LOFTET PR. DAG  (1. sep 2026)
--  ------------------------------------------------------------
--  Kør EFTER bord-loft-pr-dag.sql. Rapporten kommer til sidst
--  som én "fejl" — den ene kanal, Supabases SQL Editor altid
--  viser, og afbrydelsen er samtidig det, der rydder op.
--
--  Filen skriver ingenting, der bliver stående: den ruller
--  tilbage til sidst.
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

create sequence if not exists pg_temp.bnr;

/* Booker et bord og svarer med id — eller NULL, hvis databasen
   sagde nej. At den ikke KASTER er hele pointen: prøverne
   spørger "gik det?", ikke "væltede arket?". */
create or replace function pg_temp.book(p_dato date, p_status text default 'ny')
returns bigint language plpgsql as $$
declare n int := nextval('pg_temp.bnr'); id bigint;
begin
  insert into public.bordbestillinger
    (reference, lokation_id, navn, telefon, dato, tid, antal_personer, status)
  values ('BO-PROEV-' || lpad(n::text, 5, '0'), 'mosede', 'Prøve ' || n,
          '0000' || lpad(n::text, 4, '0'), p_dato,
          ('17:00'::time + (n || ' minutes')::interval)::time, 4, p_status)
  returning bordbestillinger.id into id;
  return id;
exception when others then return null;
end $$;

create or replace function pg_temp.ryd() returns void language sql as $$
  delete from public.bordbestillinger where reference like 'BO-PROEV-%';
$$;


-- ------------------------------------------------------------
--  GRUNDTALLET ER BORDENE SELV
--  ⚠️ Ejeren har 55 borde i stubben. Uden et loft skal det være
--  dét tal, der gælder — ikke et, vi har fundet på.
-- ------------------------------------------------------------
select pg_temp.svar('1. Uden et loft er svaret antallet af aktive borde',
  public.mosede_bord_loft('mosede', current_date + 3) = 55);

/* ⚠️ OPDATERINGEN STÅR FOR SIG. En CTE med et UPDATE kan ikke
   ligge inde i et select-udtryk ("WITH clause containing a
   data-modifying statement must be at the top level"), og hele
   arket faldt på det. */
update public.borde set aktiv = false where nummer = '55';

select pg_temp.svar('2. Slukkes et bord, falder loftet med',
  public.mosede_bord_loft('mosede', current_date + 3) = 54);

-- og tilbage igen, så resten af filen regner med 55
update public.borde set aktiv = true where nummer = '55';


-- ------------------------------------------------------------
--  DET ALMINDELIGE LOFT
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi)
values ('mosede', 'bord_loft_pr_dag', to_jsonb(2)) 
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

select pg_temp.svar('3. Ejerens almindelige loft slår bordene',
  public.mosede_bord_loft('mosede', current_date + 3) = 2);

select pg_temp.svar('4. To borde kan bookes',
  pg_temp.book(current_date + 3) is not null
  and pg_temp.book(current_date + 3) is not null);

select pg_temp.svar('5. Det tredje bliver afvist',
  pg_temp.book(current_date + 3) is null);

/* ⚠️ AFVISTE TÆLLER IKKE MED. Et afslag frigiver bordet igen —
   ellers ville en aflyst booking spærre for en, der gerne vil.
   Samme regel som pladserne på et arrangement. */
update public.bordbestillinger set status = 'afvist'
 where id = (select min(id) from public.bordbestillinger
              where reference like 'BO-PROEV-%' and dato = current_date + 3);

select pg_temp.svar('6. Et afslag frigiver pladsen igen',
  pg_temp.book(current_date + 3) is not null);

select pg_temp.svar('7. En anden dag er upåvirket',
  pg_temp.book(current_date + 4) is not null);

select pg_temp.ryd();


-- ------------------------------------------------------------
--  DAGENS EGET LOFT SLÅR DET ALMINDELIGE
-- ------------------------------------------------------------
insert into public.dags_regler (lokation_id, dato, bord_loft)
values ('mosede', current_date + 5, 1)
on conflict (lokation_id, dato) do update set bord_loft = excluded.bord_loft;

select pg_temp.svar('8. Dagens eget loft vinder over det almindelige',
  public.mosede_bord_loft('mosede', current_date + 5) = 1);

select pg_temp.svar('9. Ét bord går igennem, nummer to gør ikke',
  pg_temp.book(current_date + 5) is not null
  and pg_temp.book(current_date + 5) is null);

select pg_temp.ryd();


-- ------------------------------------------------------------
--  ⚠️ NUL ER IKKE DET SAMME SOM TOMT
--  Et nul betyder LUKKET for bookinger den dag. Var de to ens,
--  kunne ejeren ikke lukke en enkelt lørdag uden at slette
--  hele sit loft.
-- ------------------------------------------------------------
insert into public.dags_regler (lokation_id, dato, bord_loft)
values ('mosede', current_date + 6, 0)
on conflict (lokation_id, dato) do update set bord_loft = excluded.bord_loft;

select pg_temp.svar('10. Nul lukker dagen helt',
  pg_temp.book(current_date + 6) is null);

update public.dags_regler set bord_loft = null where dato = current_date + 6;

select pg_temp.svar('11. Tomt falder tilbage på det almindelige loft',
  public.mosede_bord_loft('mosede', current_date + 6) = 2);

select pg_temp.ryd();


-- ------------------------------------------------------------
--  ⚠️ EN TASTEFEJL MÅ IKKE LUKKE BOOKINGSIDEN
--  Skriver ejeren "otte borde" i feltet, fejler ::int. Svaret
--  skal være bordene selv — ikke nul, som ville lukke alting.
-- ------------------------------------------------------------
update public.indstillinger set vaerdi = to_jsonb('otte borde'::text)
 where noegle = 'bord_loft_pr_dag';

select pg_temp.svar('12. En tastefejl i loftet falder tilbage på bordene',
  public.mosede_bord_loft('mosede', current_date + 7) = 55);

select pg_temp.svar('13. Og der kan stadig bookes',
  pg_temp.book(current_date + 7) is not null);

delete from public.indstillinger where noegle = 'bord_loft_pr_dag';
select pg_temp.ryd();


-- ------------------------------------------------------------
--  ⚠️ VISNINGEN MÅ ALDRIG FÅ EN KOLONNE MERE
--  Den kører med sin ejers øjne og springer adgangsreglerne
--  over. Kommer der et navn eller et telefonnummer med, er
--  gæstelisten åben for internettet. Samme regel som
--  optagne_dage og arrangement_pladser.
-- ------------------------------------------------------------
select pg_temp.svar('14. Visningen har KUN lokation, dato, taget og loft',
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'bord_fyldte_dage') = 4
  and not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bord_fyldte_dage'
      and column_name in ('navn', 'telefon', 'email', 'besked', 'intern_note')));

select pg_temp.svar('15. Gæsten må læse den',
  has_table_privilege('anon', 'public.bord_fyldte_dage', 'select'));

select pg_temp.book(current_date + 8);

select pg_temp.svar('16. Visningen tæller det, der er taget',
  (select taget from public.bord_fyldte_dage where dato = current_date + 8) = 1
  and (select loft from public.bord_fyldte_dage where dato = current_date + 8) = 55);

select pg_temp.ryd();


-- ------------------------------------------------------------
--  ⚠️ EN LUKKET DAG SKAL KUNNE SES, OGSÅ NÅR INGEN HAR BOOKET
--  ------------------------------------------------------------
--  Grupperede visningen bookingerne, fandtes en dag kun, hvis
--  nogen allerede havde taget et bord. Så kunne ejerens nul
--  aldrig ses på hjemmesiden: dagen manglede i svaret, striben
--  tilbød den, og gæsten fik først nej ved afsendelsen. Og det
--  er netop den lukkede lørdag, han bad om at kunne lave.
-- ------------------------------------------------------------
/* Ingen "on conflict": (lokation_id, dato) er et almindeligt
   indeks i dagsregler.sql, ikke et unikt. */
delete from public.dags_regler where lokation_id = 'mosede' and dato = current_date + 9;
insert into public.dags_regler (lokation_id, dato, bord_loft)
values ('mosede', current_date + 9, 0);

select pg_temp.svar('17. En lukket dag står i visningen uden en eneste booking',
  (select loft from public.bord_fyldte_dage where dato = current_date + 9) = 0
  and (select taget from public.bord_fyldte_dage where dato = current_date + 9) = 0);

select pg_temp.svar('18. Og databasen siger nej til den dag',
  pg_temp.book(current_date + 9) is null);

delete from public.dags_regler where dato = current_date + 9;
select pg_temp.ryd();


-- ------------------------------------------------------------
--  ⚠️ INGEN BORDE OPRETTET MÅ IKKE LUKKE BOOKINGEN
--  ------------------------------------------------------------
--  bord/ har taget imod bookinger siden fase 4 — længe før
--  tabellen `borde` overhovedet fandtes. Talte grundtallet nul
--  som et loft, ville hver eneste booking blive afvist i det
--  sekund, filen blev kørt, hos en forretning, der ikke har
--  tastet sine borde ind. Ejerens EGNE nul lukker stadig dagen;
--  dét er en beslutning, han har truffet.
-- ------------------------------------------------------------
update public.borde set aktiv = false;

select pg_temp.svar('19. Uden aktive borde er der INTET loft (ikke nul)',
  public.mosede_bord_loft('mosede', current_date + 10) is null);

select pg_temp.svar('20. Og der kan stadig bookes',
  pg_temp.book(current_date + 10) is not null);

/* Men ejerens eget nul lukker dagen alligevel. */
delete from public.dags_regler where lokation_id = 'mosede' and dato = current_date + 11;
insert into public.dags_regler (lokation_id, dato, bord_loft)
values ('mosede', current_date + 11, 0);

select pg_temp.svar('21. Ejerens eget nul lukker dagen, også uden borde',
  pg_temp.book(current_date + 11) is null);

delete from public.dags_regler where lokation_id = 'mosede' and dato = current_date + 11;
update public.borde set aktiv = true;
select pg_temp.ryd();


-- ------------------------------------------------------------
--  RAPPORTEN
-- ------------------------------------------------------------
do $$
declare r text := coalesce(current_setting('proev.rapport', true), '(ingen)');
begin
  raise exception E'\n\n===== PRØVE: LOFTET PR. DAG =====\n\n%\n%\n',
    r,
    case when position('FEJLEDE' in r) = 0
      then 'ALLE 21 AF 21 BESTOD.'
      else '⚠️ NOGET FEJLEDE — se linjerne ovenfor.' end;
end $$;

rollback;
