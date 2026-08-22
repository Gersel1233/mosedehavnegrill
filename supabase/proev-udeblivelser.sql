-- ============================================================
--  PRØVE AF UDEBLIVELSERNE  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER udeblivelser.sql. Hver prøve skriver BESTOD eller
--  FEJLEDE, og rapporten kommer til sidst som én "fejl" — det er
--  den ene kanal Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der ruller prøvens data tilbage.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  'udeblevet' skal kunne skrives — men KUN af chefen, og uden
--  at åbne for et syvende, opdigtet svar. Glider et frit ord
--  igennem, kan salgsfanen ikke længere stole på sine egne
--  tællinger, og et mærke som "gænger" ville bygge på sand.
--
--  KØRER DU DEN PÅ EN BAR POSTGRES? Kør først:
--    grant all on all tables in schema public to anon, authenticated;
--    grant usage, select on all sequences in schema public
--      to anon, authenticated;
-- ============================================================

begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-u', 'Forretning U', 'Vej 1', '2670', 'Greve', '11111111')
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

-- En bestilling at flytte rundt på — lagt ind som ejeren af
-- tabellen, for det er statusREGLEN der prøves her, ikke
-- indgangen (den har sine egne prøver i proev-flerlejer.sql).
insert into public.bestillinger
  (lokation_id, reference, navn, telefon, hent_dato, hent_tid, linjer, antal)
values ('proev-u', 'PROEV-U1', 'Gæst', '20304050', current_date, '12:00',
        '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1);

-- =============== 1) UDEBLEVET TAGES IMOD ====================
do $$
declare gik boolean := false;
begin
  begin
    update public.bestillinger set status = 'udeblevet'
     where reference = 'PROEV-U1';
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('1. Chefen kan sætte en bestilling til udeblevet', gik);
end $$;

-- =============== 2) DE GAMLE SVAR VIRKER STADIG =============
do $$
declare gik boolean := false;
begin
  begin
    update public.bestillinger set status = 'afhentet'
     where reference = 'PROEV-U1';
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('2. De fem gamle statusser virker stadig', gik);
end $$;

-- =============== 3) INTET SYVENDE SVAR ======================
do $$
declare gik boolean := false;
begin
  begin
    update public.bestillinger set status = 'forsvundet'
     where reference = 'PROEV-U1';
    gik := true;
  exception when others then gik := false;
  end;
  perform pg_temp.svar('3. Et opdigtet svar bliver afvist', not gik);
end $$;

-- =============== 4) GÆSTEN KAN IKKE FLYTTE STATUS ===========
/* Gæsten må skrive en NY bestilling, men aldrig røre en
   eksisterende — heller ikke for at "melde sig selv udeblevet".
   Uden den her prøve kunne hele gænger-mærket manipuleres fra
   en browserkonsol. */
set local role anon;
set local request.jwt.claims = '{}';

do $$
declare ramte int := 0;
begin
  begin
    update public.bestillinger set status = 'udeblevet'
     where reference = 'PROEV-U1';
    get diagnostics ramte = row_count;
  exception when others then ramte := 0;
  end;
  perform pg_temp.svar('4. Gæsten kan ikke sætte nogen til udeblevet', ramte = 0);
end $$;

reset role;

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

  raise exception E'\n============ RESULTATET AF UDEBLIVELSESPRØVEN ==============\n'
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
