-- ============================================================
--  PRØVE AF FROKOSTORDNINGEN  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER frokost.sql. Hver prøve skriver BESTOD eller
--  FEJLEDE, og rapporten kommer til sidst som én "fejl" — det er
--  den ene kanal, Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der ruller prøvens data tilbage.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  Én linje SQL kan lukke en dør op, ingen bad om. De to ting,
--  der skal måles, er derfor lige så meget hvad frokosten IKKE
--  må: den må ikke optage havnen, og den må ikke slippe uden om
--  de regler, de tre andre slags er bundet af.
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

-- ------------------------------------------------------------
--  DØREN ER ÅBEN
-- ------------------------------------------------------------
/* INDSÆTTELSEN STÅR FOR SIG. Postgres tillader ikke en
   data-ændrende WITH inde i en underforespørgsel, og en
   indsættelse i den samme sætning som påstanden kan alligevel
   ikke ses af den: sætningen ser databasen, som den var, da den
   begyndte. To sætninger, og så er svaret sandt. */
insert into public.forespoergsler
  (reference, lokation_id, type, navn, telefon, dato, antal_personer, detaljer)
values ('FO-PROEV-FRO1', 'mosede', 'frokost', 'Firma Test', '00001111',
        current_date + 30, 14, '{"firma":"Test ApS","cvr":"12345678"}'::jsonb);

select pg_temp.svar('1. En frokostforespørgsel kan oprettes',
  (select count(*) = 1 from public.forespoergsler
    where reference = 'FO-PROEV-FRO1' and type = 'frokost'));

select pg_temp.svar('2. Firmanavn og CVR står i detaljer',
  (select detaljer ->> 'firma' = 'Test ApS' and detaljer ->> 'cvr' = '12345678'
     from public.forespoergsler where reference = 'FO-PROEV-FRO1'));

-- ------------------------------------------------------------
--  DEN OPTAGER INGEN DAGE
-- ------------------------------------------------------------
/* HAVNEN ER ÉT STED, men en frokostordning er mad, der kører ud
   af huset. Optog den dagen, kunne ét firma med en fast onsdag
   lukke hver eneste onsdag for selskaber og udlejning. */
select pg_temp.svar('3. En AFTALT frokost optager ikke dagen',
  not public.mosede_optager_dagen('frokost', 'aftalt', current_date + 30,
    '{}'::jsonb, null));

select pg_temp.svar('4. Baglokalet optager stadig dagen',
  public.mosede_optager_dagen('baglokale', 'aftalt', current_date + 30,
    '{}'::jsonb, null));

select pg_temp.svar('5. Selskab hos jer optager stadig dagen',
  public.mosede_optager_dagen('selskab', 'aftalt', current_date + 30,
    '{}'::jsonb, null));

/* Og bevist på rigtige rækker, ikke kun på funktionen: en aftalt
   frokost og en aftalt udlejning kan ligge på den SAMME dag. */
insert into public.forespoergsler
  (reference, lokation_id, type, navn, telefon, dato, status)
values ('FO-PROEV-FRO2', 'mosede', 'frokost', 'Firma To', '00002222',
        current_date + 31, 'aftalt'),
       ('FO-PROEV-FRO3', 'mosede', 'baglokale', 'Selskab', '00003333',
        current_date + 31, 'aftalt');

select pg_temp.svar('6. Frokost og baglokale kan dele en dag',
  (select count(*) = 2 from public.forespoergsler
    where reference in ('FO-PROEV-FRO2', 'FO-PROEV-FRO3')));

-- ------------------------------------------------------------
--  DE ANDRE DØRE ER STADIG LUKKEDE
-- ------------------------------------------------------------
/* Listen skal være FIRE navne og ikke "hvad som helst". En
   forespørgsel med en type, ingen fane kender, ville lande i
   databasen og aldrig blive vist for nogen. */
do $$
begin
  begin
    insert into public.forespoergsler
      (reference, lokation_id, type, navn, telefon)
    values ('FO-PROEV-FRO4', 'mosede', 'bryllup', 'Nogen', '00004444');
    perform pg_temp.svar('7. En ukendt type bliver afvist', false);
  exception when check_violation then
    perform pg_temp.svar('7. En ukendt type bliver afvist', true);
  end;
end $$;

select pg_temp.svar('8. Alle fire slags står i reglen',
  (select pg_get_constraintdef(oid) like '%catering%'
      and pg_get_constraintdef(oid) like '%baglokale%'
      and pg_get_constraintdef(oid) like '%selskab%'
      and pg_get_constraintdef(oid) like '%frokost%'
     from pg_constraint where conname = 'forespoergsel_type_ok'));

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

  raise exception E'\n========= RESULTATET AF FROKOSTENS PRØVE =========\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alt er som før.\n\n'
    '%\n\n%\n'
    '==================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 8 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
