-- ============================================================
--  PRØVE: DATOREGLEN PÅ DE TRE ANDRE  (4. september 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet EFTER dato-vaern-resten.sql.
--  Skriver ingenting, der bliver stående: alt sker i en
--  transaktion, der rulles tilbage til sidst.
--
--  Skal skrive: ALLE 12 AF 12 BESTOD.
--
--  ⚠️ PRØVEN LÅNER IKKE EJERENS DATA. Egen forretning, egne
--     telefonnumre. Det er læren fra proev-bord-uden-telefon.sql,
--     som faldt TRE gange hos kunden, fordi den lånte ejerens
--     dag, hans vare og hans borde.
--
--  ⚠️ OG DEN OPRETTER SIT EGET BORD. mosede_bord_findes
--     (bordkort.sql) afviser enhver bestilling til et bord, der
--     ikke står som aktivt — og bordbestillinger har INTET
--     bordnummer, så det gælder ikke her. Men bord_bremse gør:
--     højst 3 bookinger pr. telefon pr. døgn. Derfor sit eget
--     nummer pr. prøve.
-- ============================================================

begin;

create temp table _svar (nr int, navn text, bestod boolean, grund text)
  on commit drop;

insert into public.lokationer (id, navn, adresse, postnr, by)
values ('proev-dato2', 'Prøvehavnen 2', 'Prøvevej 2', '2670', 'Greve')
on conflict (id) do nothing;

-- ------------------------------------------------------------
--  Tre indsættere, én pr. tabel. ⚠️ HVER SVARER MED GRUNDEN:
--  en rød linje, der kun siger "det gik ikke", er dét, der
--  kostede tre runder 2/9.
-- ------------------------------------------------------------
create or replace function pg_temp.bord(p_dato date, p_nr int)
returns text language plpgsql as $$
begin
  insert into public.bordbestillinger
    (reference, lokation_id, navn, telefon, dato, tid, antal_personer)
  values
    ('BD' || p_nr || to_char(clock_timestamp(), 'USMS'), 'proev-dato2',
     'Prøve Person', '000051' || (10 + p_nr), p_dato,
     make_time(18, p_nr, 0), 2);
  return null;
exception when others then
  return sqlerrm;
end $$;

create or replace function pg_temp.foresp(p_dato date, p_nr int)
returns text language plpgsql as $$
begin
  insert into public.forespoergsler
    (reference, lokation_id, type, navn, telefon, dato, antal_personer)
  values
    ('FD' || p_nr || to_char(clock_timestamp(), 'USMS'), 'proev-dato2',
     'selskab', 'Prøve Person', '000052' || (10 + p_nr), p_dato, 20);
  return null;
exception when others then
  return sqlerrm;
end $$;

create or replace function pg_temp.lokale(p_dato date, p_nr int)
returns text language plpgsql as $$
begin
  insert into public.udlejninger
    (reference, lokation_id, navn, telefon, dato, antal_personer)
  values
    ('UD' || p_nr || to_char(clock_timestamp(), 'USMS'), 'proev-dato2',
     'Prøve Person', '000053' || (10 + p_nr), p_dato, 20);
  return null;
exception when others then
  return sqlerrm;
end $$;

-- ------------------------------------------------------------
--  1) CHECK'ene er væk, og de tre udløsere står
-- ------------------------------------------------------------
insert into _svar
select 1, 'de tre CHECK er vaek og de tre udloesere staar',
  (select count(*) = 0 from pg_constraint
    where conname in ('bord_dato_ok', 'forespoergsel_dato_ok',
                      'udlejning_dato_ok'))
  and (select count(*) = 3 from pg_trigger
        where tgname in ('bord_dato', 'forespoergsel_dato', 'udlejning_dato')
          and not tgisinternal),
  null;

-- ------------------------------------------------------------
--  2) Alle tre er security definer med låst søgesti — samme
--     hærdning som lukkedag-værnet fik 23/8. Uden den slår de op
--     med den KALDENDES øjne.
-- ------------------------------------------------------------
insert into _svar
select 2, 'alle tre udloesere er security definer med laast soegesti',
  (select count(*) = 3 from pg_proc p
     join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public'
      and p.proname in ('mosede_bord_dato_vaern',
                        'mosede_foresp_dato_vaern',
                        'mosede_udlejning_dato_vaern')
      and p.prosecdef
      and p.proconfig::text like '%search_path=%'),
  null;

-- ------------------------------------------------------------
--  3-5) REGLEN FORSVANDT IKKE — en dag, der er gået, afvises
--       stadig, og af den RIGTIGE grund. Ordet er det, js/store.js
--       oversætter til dansk; skiftede det, fik gæsten den rå
--       SQL-fejl at se.
-- ------------------------------------------------------------
do $$
declare g text;
begin
  g := pg_temp.bord(current_date - 30, 3);
  insert into _svar values (3, 'bord: 30 dage tilbage afvises',
    g is not null and g like '%bord_dato_ok%', g);
  g := pg_temp.foresp(current_date - 30, 4);
  insert into _svar values (4, 'forespoergsel: 30 dage tilbage afvises',
    g is not null and g like '%forespoergsel_dato_ok%', g);
  g := pg_temp.lokale(current_date - 30, 5);
  insert into _svar values (5, 'udlejning: 30 dage tilbage afvises',
    g is not null and g like '%udlejning_dato_ok%', g);
end $$;

-- ------------------------------------------------------------
--  6-8) Og loftet holder hver sit tal: bordene 120 dage,
--       de to andre 730.
-- ------------------------------------------------------------
do $$
declare g text;
begin
  g := pg_temp.bord(current_date + 200, 6);
  insert into _svar values (6, 'bord: 200 dage frem afvises (loft 120)',
    g is not null and g like '%bord_dato_ok%', g);
  /* ⚠️ OG 200 DAGE FREM SKAL GÅ IGENNEM PÅ DE TO ANDRE. Uden
     den halvdel ville prøve 6 bestå på en regel, der bare sagde
     nej til alt — de to lofter er forskellige med vilje: et
     selskab planlægges halvandet år ude, et bord gør ikke. */
  g := pg_temp.foresp(current_date + 200, 7);
  insert into _svar values (7, 'forespoergsel: 200 dage frem gaar igennem',
    g is null, g);
  g := pg_temp.lokale(current_date + 200, 8);
  insert into _svar values (8, 'udlejning: 200 dage frem gaar igennem',
    g is null, g);
end $$;

-- ------------------------------------------------------------
--  9) ⚠️ FORESPØRGSLENS DATO ER FRIVILLIG. "Sølvbryllup engang
--     til foråret" er den forespørgsel, der er mest værd (fase
--     2's egen begrundelse), og null skal stadig slippe igennem.
-- ------------------------------------------------------------
do $$
declare g text;
begin
  g := pg_temp.foresp(null, 9);
  insert into _svar values (9, 'forespoergsel uden dato gaar igennem',
    g is null, g);
end $$;

-- ------------------------------------------------------------
--  10-12) ⚠️ DEM, HELE FILEN FINDES FOR: en GAMMEL række kan
--         lukkes. Personalet skal kunne sætte en booking fra i
--         forgårs til Udeblev, afvise en forespørgsel, hvis dag
--         er passeret, og bekræfte en overstået udlejning.
--
--         Rækken lægges ind med en gyldig dato (som gæsten gjorde
--         dengang) og skubbes derefter tilbage i tiden UDEN OM
--         udløseren, så vi står med præcis den situation, der
--         findes i produktionen.
--
--         ⚠️ ER UDLØSEREN IKKE DER, SIGER PRØVEN DET — den kaster
--         ikke. Uden garden dør filen på "trigger does not
--         exist", og de sidste rapportlinjer kommer aldrig ud;
--         så kan man ikke se, om prøven faldt eller aldrig kørte.
-- ------------------------------------------------------------
do $$
declare
  v_id bigint;
  g    text;
begin
  if not exists (select 1 from pg_trigger
                  where tgname = 'bord_dato' and not tgisinternal) then
    insert into _svar values (10, 'gammel booking kan lukkes', false,
      'udloeseren bord_dato findes ikke - er dato-vaern-resten.sql koert?');
  else
    insert into public.bordbestillinger
      (reference, lokation_id, navn, telefon, dato, tid, antal_personer)
    values ('BD10' || to_char(clock_timestamp(), 'USMS'), 'proev-dato2',
            'Prøve Person', '00005190', current_date + 1, '18:30', 2)
    returning id into v_id;

    /* ⚠️ OPSTILLINGEN SKAL KUNNE FEJLE UDEN AT VAELTE ARKET.
       Falsificeret 4/9 ved at saette CHECK'et tilbage MED
       udloeseren: saa afviste CHECK'et den her opdatering,
       hele transaktionen blev afbrudt, og der kom IKKE EN
       ENESTE rapportlinje ud — man kunne ikke se, om proeven
       faldt eller aldrig havde koert. Praecis arret fra
       proev-bestillingsnummer.sql's dato i 2099 (3/9). */
    alter table public.bordbestillinger disable trigger bord_dato;
    begin
      update public.bordbestillinger set dato = current_date - 30 where id = v_id;
      g := null;
    exception when others then
      g := 'CHECK''et staar stadig: ' || sqlerrm;
    end;
    alter table public.bordbestillinger enable trigger bord_dato;
    if g is not null then
      insert into _svar values (10, 'gammel booking kan lukkes', false, g);
      return;
    end if;

    begin
      update public.bordbestillinger set status = 'afvist' where id = v_id;
      g := null;
    exception when others then g := sqlerrm;
    end;
    insert into _svar values (10, 'gammel booking kan lukkes', g is null, g);
  end if;
end $$;

do $$
declare
  v_id bigint;
  g    text;
begin
  if not exists (select 1 from pg_trigger
                  where tgname = 'forespoergsel_dato' and not tgisinternal) then
    insert into _svar values (11, 'gammel forespoergsel kan lukkes', false,
      'udloeseren forespoergsel_dato findes ikke');
  else
    insert into public.forespoergsler
      (reference, lokation_id, type, navn, telefon, dato, antal_personer)
    values ('FD11' || to_char(clock_timestamp(), 'USMS'), 'proev-dato2',
            'selskab', 'Prøve Person', '00005290', current_date + 1, 20)
    returning id into v_id;

    /* ⚠️ OPSTILLINGEN SKAL KUNNE FEJLE UDEN AT VAELTE ARKET.
       Falsificeret 4/9 ved at saette CHECK'et tilbage MED
       udloeseren: saa afviste CHECK'et den her opdatering,
       hele transaktionen blev afbrudt, og der kom IKKE EN
       ENESTE rapportlinje ud — man kunne ikke se, om proeven
       faldt eller aldrig havde koert. Praecis arret fra
       proev-bestillingsnummer.sql's dato i 2099 (3/9). */
    alter table public.forespoergsler disable trigger forespoergsel_dato;
    begin
      update public.forespoergsler set dato = current_date - 30 where id = v_id;
      g := null;
    exception when others then
      g := 'CHECK''et staar stadig: ' || sqlerrm;
    end;
    alter table public.forespoergsler enable trigger forespoergsel_dato;
    if g is not null then
      insert into _svar values (11, 'gammel forespoergsel kan lukkes', false, g);
      return;
    end if;

    begin
      update public.forespoergsler set status = 'afvist' where id = v_id;
      g := null;
    exception when others then g := sqlerrm;
    end;
    insert into _svar values (11, 'gammel forespoergsel kan lukkes', g is null, g);
  end if;
end $$;

do $$
declare
  v_id bigint;
  g    text;
begin
  if not exists (select 1 from pg_trigger
                  where tgname = 'udlejning_dato' and not tgisinternal) then
    insert into _svar values (12, 'gammel udlejning kan lukkes', false,
      'udloeseren udlejning_dato findes ikke');
  else
    insert into public.udlejninger
      (reference, lokation_id, navn, telefon, dato, antal_personer)
    values ('UD12' || to_char(clock_timestamp(), 'USMS'), 'proev-dato2',
            'Prøve Person', '00005390', current_date + 1, 20)
    returning id into v_id;

    /* ⚠️ OPSTILLINGEN SKAL KUNNE FEJLE UDEN AT VAELTE ARKET.
       Falsificeret 4/9 ved at saette CHECK'et tilbage MED
       udloeseren: saa afviste CHECK'et den her opdatering,
       hele transaktionen blev afbrudt, og der kom IKKE EN
       ENESTE rapportlinje ud — man kunne ikke se, om proeven
       faldt eller aldrig havde koert. Praecis arret fra
       proev-bestillingsnummer.sql's dato i 2099 (3/9). */
    alter table public.udlejninger disable trigger udlejning_dato;
    begin
      update public.udlejninger set dato = current_date - 30 where id = v_id;
      g := null;
    exception when others then
      g := 'CHECK''et staar stadig: ' || sqlerrm;
    end;
    alter table public.udlejninger enable trigger udlejning_dato;
    if g is not null then
      insert into _svar values (12, 'gammel udlejning kan lukkes', false, g);
      return;
    end if;

    begin
      update public.udlejninger set status = 'afvist' where id = v_id;
      g := null;
    exception when others then g := sqlerrm;
    end;
    insert into _svar values (12, 'gammel udlejning kan lukkes', g is null, g);
  end if;
end $$;

-- ------------------------------------------------------------
--  RAPPORT
-- ------------------------------------------------------------
select nr, navn,
  case when bestod then 'BESTOD' else 'FEJLEDE' end as udfald,
  grund
from _svar order by nr;

select
  'Proevens dato: ' || current_date
    || ' · forretning: proev-dato2' as udgave,
  case
    when (select count(*) from _svar where bestod) = 12
    then 'ALLE 12 AF 12 BESTOD'
    else (select count(*) from _svar where not bestod)
         || ' AF 12 FEJLEDE — se grund-kolonnen ovenfor'
  end as resultat;

rollback;
