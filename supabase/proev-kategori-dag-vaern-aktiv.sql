-- ============================================================
--  PRØVE AF "DAGSVÆRNET SVARER IKKE FOR EN SLUKKET VARE"
--  (2. sep 2026)
--  ------------------------------------------------------------
--  Kør EFTER kategori-dag-vaern-aktiv.sql. Rapporten kommer til
--  sidst som én "fejl" — den ene kanal, Supabases SQL Editor
--  altid viser, og afbrydelsen er samtidig det, der rydder op.
--
--  ⚠️ PRØVE 2 ER DEN VIGTIGE. Uden den ville filen bevise, at
--  værnet er blevet mildere — og IKKE at varen stadig afvises,
--  bare af det værn, hvis besked passer.
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

/* Bestiller ÉT navn og siger, hvad databasen svarede — hele
   beskeden, ikke bare ja/nej. Prøven her handler netop om, HVEM
   der siger nej: en prøve, der kun spurgte "blev den afvist?",
   ville bestå både før og efter ændringen. */
create or replace function pg_temp.svarer(p_navn text) returns text
language plpgsql as $$
declare n int := nextval('pg_temp.tnr');
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, antal, hvordan)
  values ('SM-DAGV-' || lpad(n::text, 5, '0'), 'mosede', 'Prøve ' || n,
          '20304050', pg_temp.dagen(),
          (pg_temp.tiden() + (n || ' minutes')::interval)::time,
          ('[{"navn":' || to_jsonb(p_navn)::text || ',"antal":1,"pris":32}]')::jsonb,
          1, 'afhentning');
  return 'gik igennem';
exception when others then return coalesce(sqlerrm, '');
end $$;

/* Dagen og tiden læses af åbningstiderne — se den lange note i
   proev-bord-uden-telefon.sql: en prøve, der vælger sin dag i
   hånden, prøver alle de andre værn ved siden af sit eget. */
create or replace function pg_temp.dagen() returns date
language sql stable as $$
  select coalesce(min(d.dato), current_date + 1)
    from (select (current_date + g)::date as dato
            from generate_series(0, 14) as g) d
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

-- ------------------------------------------------------------
--  Prøvens eget kort: én kategori, tre varer.
--  ⚠️ EGNE RÆKKER, IKKE EJERENS. Tre fald 2/9 skyldtes, at en
--  prøve lånte ejerens dag, vare og borde — og arvede alt, hvad
--  der stod på dem. Alt her rulles tilbage til sidst.
-- ------------------------------------------------------------
insert into public.menu_kategorier (lokation_id, navn, afdeling, aktiv, dage, sortering)
values ('mosede', 'PRØVE-KAT', 'mad', true, 'alle', 9999);

insert into public.menu_varer (kategori_id, navn, pris, aktiv, udsolgt, sortering)
select k.id, v.navn, 32, v.aktiv, false, 1
  from public.menu_kategorier k,
       (values ('PRØVE-slukket', false), ('PRØVE-taendt', true)) as v(navn, aktiv)
 where k.lokation_id = 'mosede' and k.navn = 'PRØVE-KAT';


-- ------------------------------------------------------------
--  1) DEN SLUKKEDE RÆKKE ER IKKE DAGSVÆRNETS SAG
-- ------------------------------------------------------------
select pg_temp.svar('1. En slukket vare afvises IKKE med "ikke den dag"',
  pg_temp.svarer('PRØVE-slukket') not like '%bestilling_ikke_den_dag%');


-- ------------------------------------------------------------
--  ⚠️ 2) MEN DEN SLIPPER IKKE IGENNEM
--  Værnet er ikke blevet mildere: mosede_udsolgt_vaern tæller en
--  slukket række som "udsolgt eller skjult" — med vilje, og med
--  en besked, der passer. Uden den her prøve kunne ændringen
--  have åbnet for en vare, ejeren har slået fra.
-- ------------------------------------------------------------
select pg_temp.svar('2. Den afvises stadig — af udsolgt-værnet, hvis besked passer',
  pg_temp.svarer('PRØVE-slukket') like '%bestilling_udsolgt_vare%');


-- ------------------------------------------------------------
--  3) OG DEN ANDEN HALVDEL ER URØRT
--  En TÆNDT vare, hvis kategori ikke laves i dag, afvises som før.
-- ------------------------------------------------------------
/* ⚠️ KUN 'alle', 'hverdage' OG 'weekend' — `kategori_dage_ok`
   holder listen, og et gæt på "1,2,3" fælder hele arket. Vi
   sætter DEN MODSATTE af prøvens egen dag, så reglen bider,
   uanset hvornår filen køres. */
update public.menu_kategorier
   set dage = case when extract(isodow from pg_temp.dagen()) between 1 and 5
                then 'weekend' else 'hverdage' end
 where lokation_id = 'mosede' and navn = 'PRØVE-KAT';

select pg_temp.svar('3. En tændt vare på en forkert ugedag afvises som før',
  pg_temp.svarer('PRØVE-taendt') like '%bestilling_ikke_den_dag%');

-- Og på sin egen dag går den igennem — ellers målte prøve 3
-- ingenting: en vare, der aldrig kan bestilles, afvises altid.
update public.menu_kategorier set dage = 'alle'
 where lokation_id = 'mosede' and navn = 'PRØVE-KAT';

select pg_temp.svar('4. Den samme vare går igennem på sin egen dag',
  pg_temp.svarer('PRØVE-taendt') = 'gik igennem');


-- ------------------------------------------------------------
--  RAPPORTEN
-- ------------------------------------------------------------
do $$
declare r text := coalesce(current_setting('proev.rapport', true), '(ingen)');
begin
  raise exception E'\n\n===== PRØVE: DAGSVÆRNET OG DEN SLUKKEDE VARE =====\n\n%\n%\n',
    r,
    case when position('FEJLEDE' in r) = 0
      then 'ALLE 4 AF 4 BESTOD.'
      else '⚠️ NOGET FEJLEDE — se linjerne ovenfor.' end;
end $$;

rollback;
