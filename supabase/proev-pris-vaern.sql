-- ============================================================
--  PRØVE AF PRIS-VÆRNET  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER pris-vaern.sql. Rapporten kommer til sidst som én
--  "fejl" — den ene kanal, Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der rydder op.
--
--  Fejlen, den vogter imod: en vare uden pris bestilles, ingen
--  siger prisen (auto_bekraeft), og i salgstallene tæller den
--  som 0 kr. Fire dage i spiis' produktionsdatabase, før nogen
--  så den.
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

create sequence if not exists pg_temp.pnr;

/* Hver bestilling får sit eget nummer og sit eget tidspunkt, så
   dubletvagten ikke fælder prøven i stedet for det, den måler. */
create or replace function pg_temp.bestil(p_navn text)
returns bigint language plpgsql as $$
declare n int := nextval('pg_temp.pnr'); id bigint;
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, antal, hvordan)
  values ('SM-PRIS-' || lpad(n::text, 5, '0'), 'mosede', 'Prøve ' || n,
          '0000' || lpad(n::text, 4, '0'), current_date,
          ('11:00'::time + (n || ' minutes')::interval)::time,
          jsonb_build_array(jsonb_build_object('navn', p_navn, 'antal', 1, 'pris', 80)),
          1, 'afhentning')
  returning bestillinger.id into id;
  return id;
end $$;

/* En kategori og tre varer: én med pris, én uden, og ét navn der
   står i TO kategorier — prissat det ene sted. Ingen \gset:
   backslash-kommandoer er psql, ikke SQL, og de fælder Supabases
   editor. */
with ny as (
  insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
  values ('mosede', 'mad', 'Prisprøven', 9998), ('mosede', 'mad', 'Prisprøven B', 9999)
  returning id, navn
)
insert into public.menu_varer (kategori_id, navn, pris, aktiv, sortering)
select ny.id, v.navn, v.pris, true, v.sortering
  from ny join (values
    ('Prisprøven',   'Prøveburger',  99,   1),
    ('Prisprøven',   'Prøvetoast',   null, 2),
    ('Prisprøven',   'Prøvewrap',    null, 3),
    ('Prisprøven B', 'Prøvewrap',    65,   1)
  ) as v(kat, navn, pris, sortering) on v.kat = ny.navn;

-- ------------------------------------------------------------
--  VÆRNET
-- ------------------------------------------------------------
do $$
declare gik boolean := false;
begin
  begin
    gik := pg_temp.bestil('Prøveburger') is not null;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('1. En vare MED pris kan bestilles', gik);
end $$;

/* DEN VIGTIGSTE. Browseren viser varen uden plusknap nu — men en
   gammel fane har den liggende i kurven fra før, og browseren må
   ikke være den eneste, der kender reglen. */
do $$
declare gik boolean := false;
begin
  begin
    perform pg_temp.bestil('Prøvetoast');
  exception when others then
    gik := sqlerrm like '%bestilling_vare_uden_pris%'
       and sqlerrm like '%Prøvetoast%';
  end;
  perform pg_temp.svar('2. En vare UDEN pris afvises — og fejlen siger hvilken', gik);
end $$;

/* ⚠️ ET NAVN UDEN FOR KORTET RØRES IKKE. Dagens ret bor i sin
   egen tabel; afviste værnet alt, det ikke kunne prissætte,
   ville en ret, ejeren skrev i hånden i morges, blive umulig at
   bestille. Fanget i en do-blok: kaster den, ruller hele prøven
   tilbage, og rapporten bliver aldrig skrevet. */
do $$
declare gik boolean := false;
begin
  begin
    gik := pg_temp.bestil('Stegt flæsk med persillesovs') is not null;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('3. Et navn uden for menukortet slipper igennem', gik);
end $$;

/* Samme navn i to kategorier, prissat i den ene: varen KAN
   købes — det er den prissatte, der sælges. Afviste værnet den,
   ville en dublet i kortet lukke for en vare, der har en pris. */
do $$
declare gik boolean := false;
begin
  begin
    gik := pg_temp.bestil('Prøvewrap') is not null;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('4. Prissat i ÉN af to kategorier er nok', gik);
end $$;

/* Store bogstaver og mellemrum er det samme navn — samme
   sammenligning som udsolgt-værnet og dagens-retter-bremsen. */
do $$
declare gik boolean := false;
begin
  begin
    perform pg_temp.bestil('  PRØVETOAST ');
  exception when others then
    gik := sqlerrm like '%bestilling_vare_uden_pris%';
  end;
  perform pg_temp.svar('5. Store bogstaver og mellemrum er samme vare', gik);
end $$;

/* ⚠️ FYLDET ER ØNSKER (model A) og har ingen pris med vilje. Et
   værn, der afviste fyldlisten, ville lukke hele smørrebrøds-
   bestillingen den dag, ingen fyld har priser. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.bestillinger
      (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
       linjer, fyld, antal, hvordan)
    values ('SM-PRIS-FYLD', 'mosede', 'Prøve fyld', '00009998',
            current_date, '15:43',
            '[{"navn":"Prøveburger","antal":1,"pris":99}]'::jsonb,
            '["Prøvetoast"]'::jsonb, 1, 'afhentning');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('6. Et prisløst FYLD-ønske kan stadig sendes', gik);
end $$;

/* Skriver ejeren prisen i admin, kan varen købes i samme sekund.
   Det er hele vejen ud af tilstanden — den skal virke. */
update public.menu_varer set pris = 45 where navn = 'Prøvetoast';

do $$
declare gik boolean := false;
begin
  begin
    gik := pg_temp.bestil('Prøvetoast') is not null;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('7. Sættes prisen, kan varen købes med det samme', gik);
end $$;

/* Uden security definer slår værnet op med GÆSTENS øjne, finder
   ingenting og siger ja til alt — uden fejl og uden spor. Samme
   lærepenge som lukkedag-værnet. */
select pg_temp.svar('8. Værnet slår op med sine egne øjne',
  (select coalesce(bool_and(p.prosecdef), false)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'mosede_pris_vaern'));

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
  raise exception E'\n====== RESULTATET AF PRIS-PRØVEN ======\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alt er som før.\n\n'
    '%\n\n%\n'
    '=======================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 8 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
