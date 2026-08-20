-- ============================================================
--  PRØVE AF SPIS HER / TAG MED  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER spis-her.sql. Hver prøve skriver BESTOD eller
--  FEJLEDE, og rapporten kommer til sidst som én "fejl" — det er
--  den ene kanal Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der ruller prøvens data tilbage.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  Forskellen mellem de to svar er en pose eller et bord med
--  bestik. Kan en tredje værdi glide igennem, står køkkenet med
--  en bestilling, ingen ved hvordan skal serveres — og en
--  formular kan omgås med to linjer i en browserkonsol.
--
--  KØRER DU DEN PÅ EN BAR POSTGRES? Kør først:
--    grant all on all tables in schema public to anon, authenticated;
--    grant usage, select on all sequences in schema public
--      to anon, authenticated;
-- ============================================================

begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-a', 'Forretning A', 'Vej 1', '2670', 'Greve', '11111111')
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

set local role anon;
set local request.jwt.claims = '{}';

-- =============== 1) DE TO SVAR TAGES IMOD ===================
do $$
declare gik boolean := false;
begin
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal, hvordan)
    values ('proev-a', 'PROEV-SH1', 'Gæst', '20304050', current_date + 1, '12:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1, 'afhentning');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('1. En bestilling til AFHENTNING tages imod', gik);
end $$;

do $$
declare gik boolean := false;
begin
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal, hvordan)
    values ('proev-a', 'PROEV-SH2', 'Gæst', '30405060', current_date + 1, '13:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1, 'spis_her');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('2. En bestilling til SPIS HER tages imod', gik);
end $$;

-- =============== 2) INTET TREDJE SVAR =======================
do $$
declare gik boolean := false;
begin
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal, hvordan)
    values ('proev-a', 'PROEV-SH3', 'Gæst', '40506070', current_date + 1, '14:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1, 'levering');
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('3. Et tredje svar bliver afvist', not gik);
end $$;

-- =============== 3) STANDARDEN ER AFHENTNING ================
/* De bestillinger, der allerede lå i tabellen, da kolonnen kom,
   er afhentning — det er den eneste form, siden har kunnet. En
   bestilling uden svar skal derfor blive afhentning, ikke tom. */
insert into public.bestillinger
  (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
values ('proev-a', 'PROEV-SH4', 'Gæst', '50607080', current_date + 1, '15:00',
        '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1);

/* Der SKAL skiftes rolle for at læse rækken igen.

   Første udgave af prøven læste den som anon — og gæsten må ikke
   læse bestillinger, så svaret var NULL, og prøven meldte FEJLEDE
   om en standardværdi, der virkede fint. Prøven her handler om
   skemaets standard, ikke om adgangen; den har prøve 8 i
   proev-flerlejer.sql. */
reset role;

select pg_temp.svar('4. Uden svar bliver bestillingen afhentning',
  (select hvordan = 'afhentning' from public.bestillinger
    where reference = 'PROEV-SH4'));

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

  raise exception E'\n============ RESULTATET AF SPIS HER-PRØVEN =================\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alle dens prøvedata rulles tilbage.\n'
    'Databasen er som før.\n\n'
    '%\n\n%\n'
    '============================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 4 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
