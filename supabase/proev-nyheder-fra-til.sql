-- ============================================================
--  PRØVE AF NYHEDERNES VINDUE  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER nyheder-fra-til.sql. Rapporten kommer til sidst som
--  én "fejl" — det er den ene kanal, Supabases SQL Editor altid
--  viser, og afbrydelsen er samtidig det, der rydder op.
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

select pg_temp.svar('1. Kolonnerne findes',
  (select count(*) = 2 from information_schema.columns
    where table_schema = 'public' and table_name = 'nyheder'
      and column_name in ('vis_fra', 'vis_til')));

/* TOM BETYDER ALTID. Alt det, der allerede står, skal blive
   stående — ellers slukker filen nyhederne den dag, den køres. */
insert into public.nyheder (titel, tekst)
values ('Uden datoer', 'Skal opføre sig som før');

select pg_temp.svar('2. En nyhed uden datoer kan stadig oprettes',
  (select vis_fra is null and vis_til is null
     from public.nyheder where titel = 'Uden datoer'));

insert into public.nyheder (titel, tekst, vis_fra, vis_til)
values ('Med vindue', 'Kun i august', current_date - 2, current_date + 2);

select pg_temp.svar('3. En nyhed kan få et vindue',
  (select vis_til - vis_fra = 4 from public.nyheder where titel = 'Med vindue'));

/* En slutdato før startdatoen er en nyhed, der aldrig kan vises.
   Den er ikke farlig — den er bare usynlig, og så leder nogen
   efter en fejl i koden. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.nyheder (titel, tekst, vis_fra, vis_til)
    values ('Baglæns', 'Slutter før den begynder',
            current_date + 5, current_date + 1);
  exception when check_violation then gik := true;
  end;
  perform pg_temp.svar('4. Et baglæns vindue bliver afvist', gik);
end $$;

/* ÉN DAG ER ET LOVLIGT VINDUE. "Live musik på molen · lørdag
   22. august" skal kunne stå præcis den ene dag — reglen må
   afvise baglæns, ikke lige. Et > i stedet for >= ville lukke
   netop det, feltet er lavet til. */
insert into public.nyheder (titel, tekst, vis_fra, vis_til)
values ('Én dag', 'Kun lørdag', current_date + 3, current_date + 3);

select pg_temp.svar('5. En nyhed kan vises præcis én dag',
  (select vis_fra = vis_til from public.nyheder where titel = 'Én dag'));

insert into public.nyheder (titel, tekst, vis_fra)
values ('Kun fra', 'Starter en dag', current_date + 10);

insert into public.nyheder (titel, tekst, vis_til)
values ('Kun til', 'Slutter en dag', current_date + 10);

select pg_temp.svar('6. En nyhed kan have kun fra ELLER kun til',
  (select count(*) = 2 from public.nyheder
    where titel in ('Kun fra', 'Kun til')));

/* ⚠️ RÆKKERNE FILTRERES IKKE I DATABASEN. Gæsten henter dem alle
   og browseren afgør — ellers kunne personalet ikke SE i admin,
   at en nyhed venter eller er udløbet. */
select pg_temp.svar('7. Der er ikke lagt et filter på læsereglen',
  (select count(*) = 0 from pg_policies
    where schemaname = 'public' and tablename = 'nyheder'
      and coalesce(qual, '') like '%vis_til%'));

do $$
declare
  rapport text := rtrim(coalesce(current_setting('proev.rapport', true), ''), E'\n');
  linjer  text[] := case when rapport = '' then '{}'::text[]
                         else string_to_array(rapport, E'\n') end;
  antal   int := coalesce(array_length(linjer, 1), 0);
  fejl    int;
begin
  select count(*) into fejl from unnest(linjer) as l where l like 'FEJLEDE%';
  raise exception E'\n========= RESULTATET AF NYHEDERNES PRØVE =========\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alt er som før.\n\n'
    '%\n\n%\n'
    '==================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 7 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
