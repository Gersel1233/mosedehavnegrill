-- ============================================================
--  PRØVE AF UDEBLEVET PÅ BORDENE  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER bord-udeblev.sql. Rapporten kommer til sidst som én
--  "fejl" — den ene kanal, Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der rydder op.
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

/* Opretter en bordbestilling og returnerer dens id — eller NULL,
   hvis databasen sagde nej. At den ikke KASTER er hele pointen:
   prøverne herunder spørger "gik det?", ikke "væltede arket?". */
create or replace function pg_temp.booking(p_status text)
returns bigint language plpgsql as $$
declare n int := nextval('pg_temp.bnr'); id bigint;
begin
  insert into public.bordbestillinger
    (reference, lokation_id, navn, telefon, dato, tid, antal_personer, status)
  values ('BO-PROEV-' || lpad(n::text, 5, '0'), 'mosede', 'Prøve ' || n,
          '0000' || lpad(n::text, 4, '0'), current_date + 3,
          ('17:00'::time + (n || ' minutes')::interval)::time, 4, p_status)
  returning bordbestillinger.id into id;
  return id;
exception when others then return null;
end $$;


-- ------------------------------------------------------------
--  DE FIRE ORD
-- ------------------------------------------------------------
select pg_temp.svar('1. En ny booking kan oprettes',
  pg_temp.booking('ny') is not null);

select pg_temp.svar('2. Bekræftet er stadig lovligt',
  pg_temp.booking('bekraeftet') is not null);

select pg_temp.svar('3. Afvist er stadig lovligt',
  pg_temp.booking('afvist') is not null);

/* FILENS EGEN. Uden bord-udeblev.sql afviser bord_status_ok den
   her, og knappen Udeblev i admin gør ingenting — en fejl, der
   ser ud som en knap, der ikke virker. */
select pg_temp.svar('4. Udeblevet er lovligt nu',
  pg_temp.booking('udeblevet') is not null);


-- ------------------------------------------------------------
--  OG VÆRNET SKAL STADIG VÆRE ET VÆRN
-- ------------------------------------------------------------
/* ⚠️ DEN VIGTIGSTE. En udvidelse, der ved et uheld fjernede
   check-reglen i stedet for at udvide den, ville bestå prøve 1-4
   uden at nogen opdagede noget — og så kunne en hvilken som helst
   tekst stå i status. Køkkenets lister filtrerer på de fire ord,
   så en femte ville betyde en booking, INGEN skærm viser. */
select pg_temp.svar('5. Et opfundet ord bliver stadig afvist',
  pg_temp.booking('måske') is null);

select pg_temp.svar('6. Og en tom status bliver afvist',
  pg_temp.booking('') is null);

/* Reglen skal findes som en CHECK og ikke bare virke ved et
   tilfælde — er den væk, er det NOT NULL, der fanger den tomme
   ovenfor, og prøve 6 ville bestå uden et værn. */
select pg_temp.svar('7. Værnet findes som bord_status_ok',
  (select count(*) = 1 from pg_constraint
    where conname = 'bord_status_ok'
      and conrelid = 'public.bordbestillinger'::regclass));

select pg_temp.svar('8. Og det nævner alle fire ord',
  (select pg_get_constraintdef(oid) from pg_constraint
    where conname = 'bord_status_ok'
      and conrelid = 'public.bordbestillinger'::regclass)
  like '%ny%' and
  (select pg_get_constraintdef(oid) from pg_constraint
    where conname = 'bord_status_ok'
      and conrelid = 'public.bordbestillinger'::regclass)
  like '%bekraeftet%' and
  (select pg_get_constraintdef(oid) from pg_constraint
    where conname = 'bord_status_ok'
      and conrelid = 'public.bordbestillinger'::regclass)
  like '%afvist%' and
  (select pg_get_constraintdef(oid) from pg_constraint
    where conname = 'bord_status_ok'
      and conrelid = 'public.bordbestillinger'::regclass)
  like '%udeblevet%');


-- ------------------------------------------------------------
--  OG GÆSTEN MÅ IKKE KUNNE SÆTTE DEN SELV
-- ------------------------------------------------------------
/* ⚠️ ET NYT ORD ER EN NY MÅDE AT LYVE PÅ. Kunne gæsten sende
   status: 'udeblevet', ville hun kunne markere sin egen booking
   som en udeblivelse — og personalet ville se en tom aften, der
   aldrig blev meldt fri. Reglen er den samme som for de tre
   andre: gæsten skriver rækken, personalet ejer statussen. */
do $$
declare gik boolean;
begin
  set local role anon;
  begin
    insert into public.bordbestillinger
      (reference, lokation_id, navn, telefon, dato, tid, antal_personer, status)
    values ('BO-PROEV-ANON', 'mosede', 'Gæst', '00009999',
            current_date + 3, '18:00', 4, 'udeblevet');
    gik := true;
  exception when others then gik := false;
  end;
  reset role;
  perform pg_temp.svar('9. Gæsten kan ikke sætte udeblevet selv', not gik);
end $$;


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
  raise exception E'\n====== RESULTATET AF UDEBLEV-PRØVEN ======\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alt er som før.\n\n'
    '%\n\n%\n'
    '==========================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 9 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
