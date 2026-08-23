-- ============================================================
--  PRØVE AF LUKKEDAGS-VÆRNET  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER lukkedag-vaern.sql. Hver prøve skriver BESTOD eller
--  FEJLEDE, og rapporten kommer til sidst som én "fejl" — det er
--  den ene kanal Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der ruller prøvens data tilbage.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  Værnet er kun et værn, hvis det faktisk fælder: en bestilling
--  på en lukkedag, en afhentning efter en tidlig lukning, et bord
--  midt i vinterlukningen. Og det må IKKE fælde en åben dag —
--  et værn, der afviser rigtige kunder, er dyrere end hullet.
--
--  KØRER DU DEN PÅ EN BAR POSTGRES? Kør først:
--    grant all on all tables in schema public to anon, authenticated;
--    grant usage, select on all sequences in schema public
--      to anon, authenticated;
-- ============================================================

begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-l', 'Forretning L', 'Vej 1', '2670', 'Greve', '11111111')
on conflict (id) do nothing;

create or replace function pg_temp.svar(navn text, ok boolean) returns text
language plpgsql as $$
declare linje text := case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
begin
  perform set_config('proev.rapport',
    coalesce(current_setting('proev.rapport', true), '') || linje || E'\n', true);
  raise notice '%', linje;
  return linje;
end $$;

-- Kalenderen: en lukkedag i morgen, en lukkeperiode, og en tidlig
-- lukning om tre dage.
insert into public.kalender (lokation_id, type, dato, slut_dato, titel, lukker_kl, offentlig)
values
  ('proev-l', 'lukkedag', current_date + 1, null, 'Lukket', null, false),
  ('proev-l', 'lukkedag', current_date + 10, current_date + 20, 'Ferie', null, false),
  ('proev-l', 'tidlig_lukning', current_date + 3, null, 'Tidlig lukning', '15:00', false);

/* p_tid er TIME og ikke text: i plpgsql kræver text→time en
   udtrykkelig cast, og den manglende cast væltede de POSITIVE
   prøver — så det lignede et værn, der afviste åbne dage. */
create or replace function pg_temp.proev_bestilling(p_dato date, p_tid time, p_ref text)
returns boolean language plpgsql as $$
begin
  insert into public.bestillinger
    (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
  values ('proev-l', p_ref, 'Gæst', '20304050', p_dato, p_tid,
          '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1);
  return true;
exception when others then return false;
end $$;

-- =============== 1) EN ÅBEN DAG GÅR IGENNEM =================
select pg_temp.svar('1. En åben dag tages imod',
  pg_temp.proev_bestilling(current_date + 2, '12:00', 'PROEV-L1'));

-- =============== 2) LUKKEDAGEN AFVISES ======================
select pg_temp.svar('2. En lukkedag afvises',
  not pg_temp.proev_bestilling(current_date + 1, '12:00', 'PROEV-L2'));

-- =============== 3) MIDT I EN LUKKEPERIODE ==================
select pg_temp.svar('3. En dag midt i en lukkeperiode afvises',
  not pg_temp.proev_bestilling(current_date + 15, '12:00', 'PROEV-L3'));

-- =============== 4) EFTER EN TIDLIG LUKNING =================
/* Lukker kl. 15 → sidste afhentning 14.30. Kl. 14.30 er i orden,
   kl. 15.00 er ikke. */
select pg_temp.svar('4. Sidste afhentning før tidlig lukning tages imod',
  pg_temp.proev_bestilling(current_date + 3, '14:30', 'PROEV-L4'));
select pg_temp.svar('5. En afhentning efter tidlig lukning afvises',
  not pg_temp.proev_bestilling(current_date + 3, '15:00', 'PROEV-L5'));

-- =============== 6) BORDET FØLGER SAMME REGEL ===============
do $$
declare gik boolean := true;
begin
  begin
    insert into public.bordbestillinger
      (lokation_id, reference, navn, telefon, dato, tid, antal_personer)
    values ('proev-l', 'PROEV-LB1', 'Gæst', '20304050', current_date + 1, '18:00', 4);
  exception when others then gik := false;
  end;
  perform pg_temp.svar('6. Et bord på en lukkedag afvises', not gik);
end $$;

-- =============== 7) SÆSONEN LUKKER OGSÅ HER =================
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
values ('proev-l', 'saeson', '{"lukket": true}'::jsonb, now())
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

select pg_temp.svar('7. Sæsonlukningen afviser en ellers åben dag',
  not pg_temp.proev_bestilling(current_date + 2, '13:00', 'PROEV-L7'));

-- =============== 8) GÆSTEN SELV, MED RLS SLÅET TIL ==========
/* De syv prøver ovenfor kører som ejeren af databasen, og han ser
   alt. Gæsten gør ikke: hun kommer ind som rollen anon, og
   værnets egne opslag i kalenderen er underlagt læsereglerne. Det
   er DEN vej, en rigtig bestilling går.

   SÆSONEN ÅBNES FØRST IGEN. Prøve 7 lukkede den, og en lukket
   sæson afviser ALT — så ville 8 og 9 bestå, uden at kalenderen
   overhovedet blev slået op. Det stod de to prøver og gjorde,
   første gang de blev skrevet: de sagde BESTOD, også da værnet
   var pillet fra hinanden. En prøve, der ikke kan fejle, måler
   ingenting. */
update public.indstillinger set vaerdi = '{"lukket": false}'::jsonb
 where lokation_id = 'proev-l' and noegle = 'saeson';

do $$
declare gik boolean;
begin
  set local role anon;
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
    values ('proev-l', 'PROEV-L8', 'Gæst', '20304051', current_date + 1, '12:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1);
    gik := true;
  exception when others then gik := false;
  end;
  reset role;
  perform pg_temp.svar('8. Gæsten selv afvises på en lukkedag', not gik);
end $$;

-- =============== 9) VÆRNET STÅR VED EN STRAMMERE KALENDER ====
/* Den stille fejl, punkt 8 ikke kan se: værnet virker i dag, FORDI
   kalender_laes_alle lukker lukkedage ud til alle. Strammes den
   regel en dag — og 'kun det offentlige' ser fornuftigt ud —
   ville værnet se en tom kalender og sige ja til hver eneste
   lukkede dag. Uden fejl, uden spor.

   Målt 23/8: netop dét skete, før funktionen blev security
   definer. Prøven her lægger en strammere regel oven på i
   transaktionen — den rulles tilbage sammen med resten — og
   værnet skal stadig fælde bestillingen. */
create policy proev_stram_kalender on public.kalender
  as restrictive for select to anon, authenticated using (offentlig);

do $$
declare gik boolean;
begin
  set local role anon;
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
    values ('proev-l', 'PROEV-L9', 'Gæst', '20304052', current_date + 1, '12:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1);
    gik := true;
  exception when others then gik := false;
  end;
  reset role;
  perform pg_temp.svar(
    '9. Værnet holder, selv om kalenderen kun viser det offentlige', not gik);
end $$;

drop policy proev_stram_kalender on public.kalender;

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

  raise exception E'\n============ RESULTATET AF LUKKEDAGS-PRØVEN ================\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alle dens prøvedata rulles tilbage.\n'
    'Databasen er som før.\n\n'
    '%\n\n%\n'
    '============================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 9 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
