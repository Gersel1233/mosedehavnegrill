-- ============================================================
--  PRØVE AF NYHEDERNES SLAGS, DETALJER OG BILLEDE  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER nyheder-slags-og-billede.sql. Rapporten kommer til
--  sidst som én "fejl" — den ene kanal, Supabases SQL Editor
--  altid viser, og afbrydelsen er samtidig det, der rydder op.
--
--  DET, DER SKAL MÅLES, ER VÆRNENE. Kolonner kan man se ved at
--  kigge; en check-regel, der ikke virker, ser rigtig ud, lige
--  til nogen lægger noget forkert ind.
--
--  ⚠️ PRØVE 0 ER EN POSITIV KONTROL. Uden den ville en prøve, der
--  bare siger "det blev afvist", bestå af den forkerte grund den
--  dag et helt andet værn afviser ALT — og så måler resten
--  ingenting.
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

/* Sandt hvis rækken blev AFVIST. Bruges til hvert værn — og
   prøve 0 viser, at en almindelig nyhed ikke bliver det. */
create or replace function pg_temp.afvist(p_slags text, p_detaljer jsonb, p_billede text)
returns boolean language plpgsql as $$
begin
  insert into public.nyheder (titel, tekst, slags, detaljer, billede)
  values ('PRØVE nyhed', 'PRØVE tekst', p_slags, p_detaljer, p_billede);
  return false;
exception when others then
  return true;
end $$;

-- ------------------------------------------------------------
--  0) POSITIV KONTROL
-- ------------------------------------------------------------
select pg_temp.svar('0. En almindelig nyhed går IGENNEM (positiv kontrol)',
  not pg_temp.afvist('musik', '{"hvem":"Jonas Band"}'::jsonb,
    'https://epwyjzakvvbxtpvnhvbn.supabase.co/storage/v1/object/public/nyheder/a.jpg'));

-- ------------------------------------------------------------
--  KOLONNERNE
-- ------------------------------------------------------------
select pg_temp.svar('1. slags findes på nyheder',
  (select count(*) = 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'nyheder' and column_name = 'slags'));

select pg_temp.svar('2. detaljer findes på nyheder',
  (select count(*) = 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'nyheder' and column_name = 'detaljer'));

select pg_temp.svar('3. billede findes på nyheder',
  (select count(*) = 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'nyheder' and column_name = 'billede'));

/* ⚠️ DEFAULT SKAL VÆRE 'andet'. De nyheder, der allerede står, er
   skrevet uden en slags. Var default 'musik', ville hver eneste
   gammel nyhed pludselig have en node på sig — og ingen ville
   opdage det, før en gæst så forsiden.

   RÆKKEN OPRETTES UDEN slags. Skrev prøven 'andet' selv, ville
   den læse sit eget svar tilbage og bestå, uanset hvad
   standardværdien var. Præcis den fejl slap igennem i
   proev-menukort-antal-og-dage.sql, indtil den blev skrevet om. */
insert into public.nyheder (titel, tekst) values ('PRØVE urørt', 'PRØVE tekst');

select pg_temp.svar('4. En nyhed uden en valgt slags bliver "andet"',
  (select slags = 'andet' from public.nyheder where titel = 'PRØVE urørt'));

-- ------------------------------------------------------------
--  VÆRNET PÅ SLAGS
-- ------------------------------------------------------------
select pg_temp.svar('5. En slags, der ikke findes, afvises',
  pg_temp.afvist('julefrokost', null, null));

select pg_temp.svar('6. Alle fem lovlige slags går igennem',
  not pg_temp.afvist('musik', null, null)
  and not pg_temp.afvist('ret', null, null)
  and not pg_temp.afvist('tider', null, null)
  and not pg_temp.afvist('begivenhed', null, null)
  and not pg_temp.afvist('andet', null, null));

-- ------------------------------------------------------------
--  VÆRNET PÅ DETALJER
-- ------------------------------------------------------------
/* En LISTE er ikke et objekt. Tog kolonnen imod en liste, skulle
   gæstesiden kunne tegne hvad som helst — og den slags opdages
   først, når forsiden går i sort hos en gæst. */
select pg_temp.svar('7. En liste i detaljer afvises',
  pg_temp.afvist('musik', '["Jonas Band"]'::jsonb, null));

select pg_temp.svar('8. Et løst tal i detaljer afvises',
  pg_temp.afvist('musik', '42'::jsonb, null));

/* Nyhederne hentes på HVER eneste sidevisning. Uden en grænse er
   kolonnen et sted, hvor nogen kan lægge en megabyte ind pr.
   nyhed, og forsiden bliver langsom for en gæst på mobildata. */
select pg_temp.svar('9. En detalje på over 4000 tegn afvises',
  pg_temp.afvist('musik',
    jsonb_build_object('hvem', repeat('x', 4100)), null));

select pg_temp.svar('10. Tom detaljer er i orden',
  not pg_temp.afvist('andet', null, null));

-- ------------------------------------------------------------
--  VÆRNET PÅ BILLEDE — det vigtigste i filen
-- ------------------------------------------------------------
/* ⚠️ KUN VORES EGEN SPAND. Uden det kunne personalet — eller
   nogen, der havde fået fat i en session — pege på et hvilket som
   helst sted på internettet, og forsiden ville hente et billede
   fra en server, vi ikke kender. */
select pg_temp.svar('11. En adresse uden for vores storage afvises',
  pg_temp.afvist('andet', null, 'https://eksempel.dk/et-billede.jpg'));

select pg_temp.svar('12. En anden spand i vores eget projekt afvises',
  pg_temp.afvist('andet', null,
    'https://epwyjzakvvbxtpvnhvbn.supabase.co/storage/v1/object/public/andet/a.jpg'));

/* http og ikke https ville sende gæsten ud på en ukrypteret
   forbindelse — og en browser blokerer det på en https-side, så
   billedet ville bare mangle uden en fejl. */
select pg_temp.svar('13. http afvises, kun https',
  pg_temp.afvist('andet', null,
    'http://epwyjzakvvbxtpvnhvbn.supabase.co/storage/v1/object/public/nyheder/a.jpg'));

/* En javascript:-adresse i et src-felt er den klassiske vej ind.
   Den fanges af det samme mønster, men prøven siger det højt: det
   er dét, reglen er til for. */
select pg_temp.svar('14. En javascript-adresse afvises',
  pg_temp.afvist('andet', null, 'javascript:alert(1)'));

select pg_temp.svar('15. Vores egen spand går igennem',
  not pg_temp.afvist('andet', null,
    'https://epwyjzakvvbxtpvnhvbn.supabase.co/storage/v1/object/public/nyheder/2026/foto.webp'));

select pg_temp.svar('16. Tomt billede er i orden — kortet tegner slagsens felt',
  not pg_temp.afvist('andet', null, null));

/* 500 tegn er rigeligt til en storage-adresse. Grænsen findes,
   fordi kolonnen ellers er et sted at lægge en hel fil ind som
   en data:-adresse. */
select pg_temp.svar('17. En adresse på over 500 tegn afvises',
  pg_temp.afvist('andet', null,
    'https://epwyjzakvvbxtpvnhvbn.supabase.co/storage/v1/object/public/nyheder/'
    || repeat('x', 500) || '.jpg'));

-- ------------------------------------------------------------
--  DE GAMLE NYHEDER SKAL OVERLEVE
-- ------------------------------------------------------------
/* ⚠️ FILEN MÅ IKKE KUNNE ØDELÆGGE DET, DER ALLEREDE STÅR. En
   nyhed skrevet før kolonnerne fandtes har hverken slags,
   detaljer eller billede — og den skal stadig kunne læses og
   rettes. */
/* ⚠️ EN UPDATE KAN IKKE STÅ SOM EN UNDERFORESPØRGSEL. Første
   udgave skrev den som en almindelig subselect og fældede hele
   arket med "syntax error at or near ."; anden udgave pakkede den
   i en WITH og fik "WITH clause containing a data-modifying
   statement must be at the top level".

   Og begge gange var det værste ikke fejlen — det var, at alt
   EFTER den heller ikke blev målt. En do-blok med
   GET DIAGNOSTICS er vejen. */
do $$
declare n int;
begin
  update public.nyheder set tekst = 'PRØVE rettet'
   where titel = 'PRØVE urørt' and slags = 'andet'
     and detaljer is null and billede is null;
  get diagnostics n = row_count;
  perform pg_temp.svar(
    '18. En nyhed uden slags, detaljer og billede kan stadig rettes', n = 1);
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
  raise exception E'\n===== RESULTATET AF NYHEDERNES PRØVE =====\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alt er som før.\n\n'
    '%\n\n%\n'
    '==========================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 19 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
