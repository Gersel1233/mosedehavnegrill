-- ============================================================
--  PRØVE AF UDSOLGT-VÆRNET OG LOFTET  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER bord-loft.sql. Rapporten kommer til sidst som én
--  "fejl" — den ene kanal, Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der rydder op.
--
--  DET, DEN MÅLER
--  ------------------------------------------------------------
--  Tillæggets punkt 2 og 3, og accepttestens nr. 9: "to borde
--  bestiller den sidste portion samtidig — kun én af dem får
--  den". Den kan kun bestås, hvis beslutningen ligger i
--  databasen, og det er præcis dét, prøve 1-4 spørger om.
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

/* Hver bestilling får sit eget nummer og sit eget tidspunkt.
   bestilling_ikke_dobbelt fanger samme telefon + dag + tid, og
   uden det ville prøven falde over sit eget værn i stedet for
   over det, den måler. */
create or replace function pg_temp.bestil(p_navn text, p_bord text)
returns bigint language plpgsql as $$
declare n int := nextval('pg_temp.pnr'); id bigint;
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, antal, hvordan, bord_nummer)
  values ('SM-LOFT-' || lpad(n::text, 5, '0'), 'mosede', 'Prøve ' || n,
          '0000' || lpad(n::text, 4, '0'), current_date,
          ('11:00'::time + (n || ' minutes')::interval)::time,
          jsonb_build_array(jsonb_build_object('navn', p_navn, 'antal', 1, 'pris', 80)),
          1,
          case when p_bord is null then 'afhentning' else 'spis_her' end,
          p_bord)
  returning bestillinger.id into id;
  return id;
end $$;

-- Bordet skal findes: bordkort.sql afviser en bestilling til et
-- bord, ingen har oprettet.
insert into public.borde (lokation_id, nummer, pladser)
values ('mosede', 'LOFT-7', 4);

/* En kategori og to varer at melde udsolgt på.

   ⚠️ INGEN \gset. Backslash-kommandoer er psql, ikke SQL —
   står de i filen, fælder Supabases SQL Editor hele arket med en
   syntaksfejl, før noget er kørt. Se README om editoren. */
with ny as (
  insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
  values ('mosede', 'mad', 'Prøvekategori', 9999)
  returning id
)
insert into public.menu_varer (kategori_id, navn, pris, udsolgt, aktiv, sortering)
select ny.id, v.navn, v.pris, false, true, v.sortering
  from ny, (values ('Prøvefisk', 95, 1), ('Prøvepølse', 45, 2))
            as v(navn, pris, sortering);

-- ------------------------------------------------------------
--  UDSOLGT-VÆRNET
-- ------------------------------------------------------------
do $$
declare gik boolean := false;
begin
  begin
    gik := pg_temp.bestil('Prøvefisk', 'LOFT-7') is not null;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('1. En vare, der IKKE er udsolgt, kan bestilles', gik);
end $$;

update public.menu_varer set udsolgt = true where navn = 'Prøvefisk';

/* DEN VIGTIGSTE. Gæsten, der åbnede kortet for fem minutter
   siden, har varen på skærmen endnu. Ligger beslutningen kun i
   browseren, lander bestillingen — og køkkenet får en ordre på
   noget, de ikke har. */
do $$
declare gik boolean := false;
begin
  begin
    perform pg_temp.bestil('Prøvefisk', 'LOFT-7');
  exception when others then
    gik := sqlerrm like '%bestilling_udsolgt_vare%';
  end;
  perform pg_temp.svar('2. En udsolgt vare afvises af DATABASEN', gik);
end $$;

/* Det gælder begge veje ind. En webbestilling på en udsolgt vare
   er den samme fejl — gæsten møder bare op ved lugen i stedet
   for at sidde og vente. */
do $$
declare gik boolean := false;
begin
  begin
    perform pg_temp.bestil('Prøvefisk', null);
  exception when others then
    gik := sqlerrm like '%bestilling_udsolgt_vare%';
  end;
  perform pg_temp.svar('3. Også ud af huset, ikke kun fra bordet', gik);
end $$;

/* SKJULT ER OGSÅ VÆK. "Vis" fjerner varen helt fra kortet, og en
   bestilling på noget, der ikke står på kortet, er lige så
   umulig at lave som en udsolgt. */
update public.menu_varer set udsolgt = false, aktiv = false where navn = 'Prøvefisk';

do $$
declare gik boolean := false;
begin
  begin
    perform pg_temp.bestil('Prøvefisk', 'LOFT-7');
  exception when others then
    gik := sqlerrm like '%bestilling_udsolgt_vare%';
  end;
  perform pg_temp.svar('4. En skjult vare afvises også', gik);
end $$;

update public.menu_varer set aktiv = true where navn = 'Prøvefisk';

/* ⚠️ ET NAVN, DER IKKE STÅR PÅ KORTET, RØRES IKKE. Dagens ret
   bor i sin egen tabel og har sin egen nedtælling. Afviste
   værnet alt, det ikke kunne finde, ville en ret, ejeren skrev i
   hånden i morges, blive umulig at bestille. */
/* ⚠️ FANGET I EN DO-BLOK, IKKE SOM ET BART SELECT. Bliver værnet
   for stramt, KASTER indsættelsen — og en exception ruller hele
   prøven tilbage, så rapporten aldrig bliver skrevet. Læseren
   ville få en rå fejl i stedet for linjen "FEJLEDE 5". Det er den
   samme fælde, demo-indhold.sql faldt i (se CLAUDE.md). */
do $$
declare gik boolean := false;
begin
  begin
    gik := pg_temp.bestil('Stegt flæsk med persillesovs', 'LOFT-7') is not null;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('5. Et navn uden for menukortet slipper igennem', gik);
end $$;

/* Store bogstaver og mellemrum er det samme navn — den samme
   sammenligning som dagens-retter.sql bruger. To måder at
   sammenligne på ville betyde, at "Prøvefisk " slap forbi det
   ene værn og ikke det andet. */
update public.menu_varer set udsolgt = true where navn = 'Prøvefisk';

do $$
declare gik boolean := false;
begin
  begin
    perform pg_temp.bestil('  PRØVEFISK ', 'LOFT-7');
  exception when others then
    gik := sqlerrm like '%bestilling_udsolgt_vare%';
  end;
  perform pg_temp.svar('6. Store bogstaver og mellemrum er samme vare', gik);
end $$;

/* FYLDET ER OGSÅ VARER (Model A). Et udsolgt fyld, der slipper
   igennem, giver gæsten smørrebrød med noget andet på, end hun
   bad om. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.bestillinger
      (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
       linjer, fyld, antal, hvordan)
    values ('SM-LOFT-FYLD', 'mosede', 'Prøve fyld', '00009999',
            current_date, '15:42',
            '[{"navn":"Stegt flæsk med persillesovs","antal":1,"pris":89}]'::jsonb,
            '["Prøvefisk"]'::jsonb, 1, 'afhentning');
  exception when others then
    gik := sqlerrm like '%bestilling_udsolgt_vare%';
  end;
  perform pg_temp.svar('7. Et udsolgt FYLD afvises også', gik);
end $$;

update public.menu_varer set udsolgt = false where navn = 'Prøvefisk';

-- ------------------------------------------------------------
--  LOFTET PR. KVARTER
-- ------------------------------------------------------------
/* Ikke sat betyder INTET loft. En indstilling, ingen har rørt,
   må ikke kunne lukke for noget, der virkede i går. */
delete from public.indstillinger
 where lokation_id = 'mosede' and noegle = 'bord_loft_pr_kvarter';

do $$
declare gik boolean := false;
begin
  begin
    gik := pg_temp.bestil('Prøvepølse', 'LOFT-7') is not null
       and pg_temp.bestil('Prøvepølse', 'LOFT-7') is not null
       and pg_temp.bestil('Prøvepølse', 'LOFT-7') is not null;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('8. Uden et loft er der ingen grænse', gik);
end $$;

/* Nu er der allerede en håndfuld bordordrer i vinduet. Et loft
   på 2 skal derfor sige nej med det samme. */
insert into public.indstillinger (lokation_id, noegle, vaerdi)
values ('mosede', 'bord_loft_pr_kvarter', '2'::jsonb)
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

do $$
declare gik boolean := false;
begin
  begin
    perform pg_temp.bestil('Prøvepølse', 'LOFT-7');
  exception when others then
    gik := sqlerrm like '%bestilling_bord_loft%';
  end;
  perform pg_temp.svar('9. Et fyldt kvarter siger nej', gik);
end $$;

/* ⚠️ OG DET GÆLDER KUN BORDENE. Smørrebrød ud af huset bestilles
   dagen før og lægger ikke pres på lugen nu. Lukkede loftet for
   dem også, ville en travl frokost ved bordene lukke for
   morgendagens smørrebrød — og det ville ingen forstå. */
do $$
declare gik boolean := false;
begin
  begin
    gik := pg_temp.bestil('Prøvepølse', null) is not null;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('10. Loftet rører ikke mad ud af huset', gik);
end $$;

/* Nul og negativ betyder også "intet loft". Skrev nogen 0 i
   feltet for at slå det fra, må det ikke betyde "ingen ordrer
   overhovedet" — det ville lukke bordene i stilhed. */
update public.indstillinger set vaerdi = '0'::jsonb
 where lokation_id = 'mosede' and noegle = 'bord_loft_pr_kvarter';

do $$
declare gik boolean := false;
begin
  begin
    gik := pg_temp.bestil('Prøvepølse', 'LOFT-7') is not null;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('11. Et loft på nul er intet loft, ikke total lukning', gik);
end $$;

-- ------------------------------------------------------------
--  TRAVLHEDEN — KUN TAL
-- ------------------------------------------------------------
/* ⚠️ SAMME PRØVE SOM PÅ optagne_dage. Visningen kører med sin
   ejers øjne og springer adgangsreglerne over. Kommer der et
   navn, et telefonnummer eller en varelinje med, er køkkenets
   liste åben for internettet — og det ville ingen opdage, for
   siden ville se helt rigtig ud. */
select pg_temp.svar('12. Travlheden har KUN tal — ingen navne, ingen numre',
  (select count(*) = 4 from information_schema.columns
    where table_schema = 'public' and table_name = 'bord_travlhed')
  and not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'bord_travlhed'
       and column_name in ('navn', 'telefon', 'email', 'besked', 'linjer',
                           'reference', 'intern_note', 'bord_nummer')));

select pg_temp.svar('13. Den tæller dem, der er i køen',
  (select i_koeen > 0 and seneste_kvarter > 0
     from public.bord_travlhed where lokation_id = 'mosede'));

/* Gæsten skal kunne læse den uden at være logget ind — ellers
   kan siden ikke sige, hvor travlt der er. */
select pg_temp.svar('14. Gæsten må læse travlheden',
  has_table_privilege('anon', 'public.bord_travlhed', 'select'));

/* ⚠️ MEN IKKE SELVE BESTILLINGERNE. Falder den her, er hele
   køkkenets liste — navne, numre og beskeder — åben for enhver
   med anon-nøglen, som ligger offentligt i js/config.js. */
select pg_temp.svar('15. Gæsten må stadig IKKE læse bestillingerne',
  not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'bestillinger'
       and cmd = 'SELECT' and qual not ilike '%is_admin%'));

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
  raise exception E'\n====== RESULTATET AF LOFT-PRØVEN ======\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alt er som før.\n\n'
    '%\n\n%\n'
    '=======================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 15 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
