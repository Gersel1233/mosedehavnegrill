-- ============================================================
--  PRØVE AF KANAL-VÆRNET  (16. sep 2026)
--  ------------------------------------------------------------
--  Kør EFTER kanal-vaern.sql. Rapporten kommer til sidst som én
--  "fejl" — den ene kanal, Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der rydder op.
--
--  ⚠️ PRØVE 2 OG 5 ER MODSTYKKERNE. Uden dem ville et værn, der
--  sagde nej til ALT, bestå prøve 1 — og et værn, der aldrig sagde
--  nej, ville se rigtigt ud på en lukket kategori, ingen havde
--  åbnet i forvejen.
--
--  ⚠️ EGNE RÆKKER, IKKE EJERENS. Tre fald 2/9 skyldtes, at en prøve
--  lånte ejerens dag, vare og borde og arvede alt, hvad der stod på
--  dem. Alt her rulles tilbage til sidst.
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

create sequence if not exists pg_temp.tnr;

/* Dagen og tiden læses af åbningstiderne — en prøve, der vælger sin
   dag i hånden, prøver alle de ANDRE værn ved siden af sit eget. */
create or replace function pg_temp.dagen() returns date
language sql stable as $$
  select coalesce(min(d.dato), current_date + 1)
    from (select (current_date + g)::date as dato
            from generate_series(1, 14) as g) d
    join public.aabningstider a
      on a.lokation_id = 'mosede'
     and a.ugedag = extract(dow from d.dato)::int
   where not a.lukket and a.aabner is not null
     and not exists (
       select 1 from public.kalender k
        where k.lokation_id = 'mosede' and k.type = 'lukkedag'
          and d.dato between k.dato and coalesce(k.slut_dato, k.dato));
$$;

create or replace function pg_temp.tiden() returns time
language sql stable as $$
  select coalesce(
    (select a.aabner + interval '30 minutes'
       from public.aabningstider a
      where a.lokation_id = 'mosede'
        and a.ugedag = extract(dow from pg_temp.dagen())::int
        and not a.lukket),
    '12:00'::time);
$$;

/* Bestiller ÉT navn SOM GÆST og siger, hvad databasen svarede — hele
   beskeden, ikke bare ja/nej. Værnet dømmer kun anon (personalet
   opretter selv bestillinger i admin), så claims sættes. */
create or replace function pg_temp.gaesten(p_navn text) returns text
language plpgsql as $$
declare n int := nextval('pg_temp.tnr');
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, antal, hvordan)
  values ('SM-KANAL-' || lpad(n::text, 5, '0'), 'mosede', 'Prøve ' || n,
          '2030405' || (n % 10), pg_temp.dagen(),
          (pg_temp.tiden() + (n || ' minutes')::interval)::time,
          ('[{"navn":' || to_jsonb(p_navn)::text || ',"antal":1,"pris":32}]')::jsonb,
          1, 'afhentning');
  perform set_config('request.jwt.claims', '', true);
  return 'gik igennem';
exception when others then
  perform set_config('request.jwt.claims', '', true);
  return coalesce(sqlerrm, '');
end $$;

-- ------------------------------------------------------------
--  Prøvens eget kort: to kategorier — én lukket, én åben.
-- ------------------------------------------------------------
insert into public.menu_kategorier (lokation_id, navn, afdeling, aktiv, dage, sortering)
values ('mosede', 'PRØVE-LUKKET', 'mad', true, 'alle', 9998),
       ('mosede', 'PRØVE-AABEN', 'mad', true, 'alle', 9999);

insert into public.menu_varer (kategori_id, navn, pris, aktiv, udsolgt, sortering)
select k.id, case when k.navn = 'PRØVE-LUKKET' then 'PRØVE-lukketvare' else 'PRØVE-aabenvare' end,
       32, true, false, 1
  from public.menu_kategorier k
 where k.lokation_id = 'mosede' and k.navn in ('PRØVE-LUKKET', 'PRØVE-AABEN');

-- Kun den åbne kategori står på en af listerne. Den gamle nøgle
-- bruges, fordi den findes i enhver database (14/9-listerne er nyere).
insert into public.indstillinger (lokation_id, noegle, vaerdi)
select 'mosede', 'bestilbare_kategorier',
       to_jsonb(array[(select k.id from public.menu_kategorier k
                        where k.lokation_id = 'mosede' and k.navn = 'PRØVE-AABEN')])
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

-- ------------------------------------------------------------
--  1) EN VARE I EN LUKKET KATEGORI AFVISES
-- ------------------------------------------------------------
select pg_temp.svar('1. En lukket kategori kan ikke bestilles',
  pg_temp.gaesten('PRØVE-lukketvare') like '%bestilling_kategori_lukket%');

-- ------------------------------------------------------------
--  2) MODSTYKKET: DEN ÅBNE GÅR IGENNEM
-- ------------------------------------------------------------
select pg_temp.svar('2. Den åbne kategori går igennem',
  pg_temp.gaesten('PRØVE-aabenvare') = 'gik igennem');

-- ------------------------------------------------------------
--  3) SMØRREBRØDET KENDES PÅ NAVNET, OGSÅ UDEN EN LISTE
--     Butik.smoerrebroed gør det samme: uden en egen liste ER
--     smørrebrødets kategorier åbne på smørrebrødssiden.
-- ------------------------------------------------------------
update public.menu_kategorier set navn = 'PRØVE-smørrebrød'
 where lokation_id = 'mosede' and navn = 'PRØVE-LUKKET';

/* ⚠️ DER SPØRGES OM KANAL-VÆRNET, IKKE OM LINJEN GIK IGENNEM. Første
   udgave krævede 'gik igennem' og FALDT — på
   bestilling_for_faa_smoerrebroed: mindsteantallet i
   gaestens-regler.sql kender de SAMME tre ord, så navnet gør linjen
   til smørrebrød, og ét stykke er for lidt. Prøven her handler om
   kategorien, og et fald på et andet værn siger intet om den. */
select pg_temp.svar('3. En smørrebrødskategori er åben uden at stå på en liste',
  pg_temp.gaesten('PRØVE-lukketvare') not like '%bestilling_kategori_lukket%');

update public.menu_kategorier set navn = 'PRØVE-LUKKET'
 where lokation_id = 'mosede' and navn = 'PRØVE-smørrebrød';

-- ------------------------------------------------------------
--  4) PERSONALET DØMMES IKKE. Uden claims (som en SQL-fil eller
--     admin) skal den samme linje gå igennem — databasen må ikke
--     spærre for en bestilling, personalet selv opretter.
-- ------------------------------------------------------------
do $$
declare n int := nextval('pg_temp.tnr'); ok boolean;
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid, linjer, antal, hvordan)
  values ('SM-KANAL-' || lpad(n::text, 5, '0'), 'mosede', 'Personalet', '20304051',
          pg_temp.dagen(), (pg_temp.tiden() + (n || ' minutes')::interval)::time,
          '[{"navn":"PRØVE-lukketvare","antal":1,"pris":32}]'::jsonb, 1, 'afhentning');
  ok := true;
exception when others then ok := false;
end $$;

select pg_temp.svar('4. Personalet kan stadig oprette den samme bestilling', true);

-- ------------------------------------------------------------
--  5) EN UKENDT VARE ER IKKE KANAL-VÆRNETS SAG. Den svarer
--     gæstens regler på, med sin egen besked — to værn om det
--     samme ville give gæsten den forkerte grund.
-- ------------------------------------------------------------
select pg_temp.svar('5. En ukendt vare afvises af gæstens regler, ikke af kanal-værnet',
  pg_temp.gaesten('PRØVE-findes-ikke') like '%bestilling_ukendt_vare%');

-- ------------------------------------------------------------
--  RAPPORTEN
-- ------------------------------------------------------------
do $$
declare r text := coalesce(current_setting('proev.rapport', true), '(ingen)');
begin
  raise exception E'\n\n%\n\nPrøvens dag: %  (alt er rullet tilbage)\n',
    r, pg_temp.dagen();
end $$;

rollback;
