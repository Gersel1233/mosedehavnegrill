-- ============================================================
--  PRØVE AF BORDTILDELINGEN  (16. sep 2026)
--  ------------------------------------------------------------
--  Kør EFTER bord-plads.sql. Rapporten kommer til sidst som én
--  "fejl" — den ene kanal, Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der rydder op.
--
--  ⚠️ DAGEN OG TIDEN LÆSES AF ÅBNINGSTIDERNE. Første udgave valgte
--  selv "om tre dage kl. 21.00" og døde på sin egen kulisse med
--  `bestilling_uden_for_aabningstid` — altså på et helt andet værn
--  end det, filen handler om. Husets ældste ar: en prøve, der låner
--  virkeligheden, arver alt, hvad der står på den.
--
--  ⚠️ OG OPHOLDET SÆTTES NED TIL 30 MINUTTER. Standarden er to
--  timer, og så ville "langt nok væk" ligge uden for åbningstiden på
--  en almindelig dag. Samtidig prøver filen dermed EJERENS EGEN
--  indstilling (bord_ophold_min) og ikke bare tallet i koden.
--
--  ⚠️ MODSTYKKERNE ER DE VIGTIGE. Et værn, der sagde nej til ALT,
--  ville bestå prøve 2 — og så kunne personalet ikke tildele et
--  eneste bord. Derfor står 1, 3, 4 og 7 ved siden af.
--
--  ⚠️ EGNE RÆKKER, IKKE EJERENS (arret fra 2/9): prøven opretter
--  sine egne borde og bookinger. Alt rulles tilbage.
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

/* Den første åbne dag frem i tiden — uden lukkedag. */
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

/* En halv time efter åbningstid — så der er plads til +15 og +45
   minutter inden for den åbne dag. */
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

-- Ejerens eget ophold: 30 minutter, mens prøven kører.
insert into public.indstillinger (lokation_id, noegle, vaerdi)
values ('mosede', 'bord_ophold_min', to_jsonb(30))
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

/* Bordene: to egne og ét slukket. Ejerens numre er cifre, så
   navnene her kan ikke kollidere med dem. */
insert into public.borde (lokation_id, nummer, pladser, placering, aktiv, sortering)
values ('mosede', 'PRØVE-A', 4, 'ude', true, 9001),
       ('mosede', 'PRØVE-B', 6, 'inde', true, 9002),
       ('mosede', 'PRØVE-SLUK', 4, 'ude', false, 9003);

create or replace function pg_temp.bord(p_navn text) returns bigint
language sql stable as $$
  select b.id from public.borde b
   where b.lokation_id = 'mosede' and b.nummer = p_navn;
$$;

/* En booking uden bord, p_minutter efter åbningstid + en halv time. */
create or replace function pg_temp.booking(p_minutter int) returns bigint
language plpgsql as $$
declare n int := nextval('pg_temp.tnr'); v_id bigint;
begin
  insert into public.bordbestillinger
    (reference, lokation_id, navn, telefon, dato, tid, antal_personer, status)
  values ('BO-PLADS-' || lpad(n::text, 4, '0'), 'mosede', 'Prøve ' || n,
          '2030' || lpad(n::text, 4, '0'), pg_temp.dagen(),
          (pg_temp.tiden() + (p_minutter || ' minutes')::interval)::time, 4, 'ny')
  returning id into v_id;
  return v_id;
end $$;

/* Tildeler et bord og siger, HVAD databasen svarede — ikke bare
   ja/nej: prøven her handler om, hvem der siger nej. */
create or replace function pg_temp.tildel(p_booking bigint, p_bord bigint) returns text
language plpgsql as $$
begin
  update public.bordbestillinger set bord_id = p_bord where id = p_booking;
  return 'gik igennem';
exception when others then return coalesce(sqlerrm, '');
end $$;

-- ------------------------------------------------------------
--  1) PERSONALET KAN TILDELE ET BORD
-- ------------------------------------------------------------
do $$
declare b1 bigint := pg_temp.booking(0);
begin
  perform set_config('proev.b1', b1::text, true);
  perform pg_temp.svar('1. Personalet kan give en booking et bord',
    pg_temp.tildel(b1, pg_temp.bord('PRØVE-A')) = 'gik igennem');
end $$;

-- ------------------------------------------------------------
--  ⚠️ 2) DET SAMME BORD KAN IKKE LOVES VÆK TO GANGE
-- ------------------------------------------------------------
do $$
declare b2 bigint := pg_temp.booking(15);
begin
  perform pg_temp.svar('2. Det samme bord inden for opholdet afvises',
    pg_temp.tildel(b2, pg_temp.bord('PRØVE-A')) like '%bord_plads_optaget%');
end $$;

-- ------------------------------------------------------------
--  3) MODSTYKKET: EFTER OPHOLDET ER BORDET FRIT IGEN
--     Uden den ville et værn, der sagde nej til alt, bestå prøve 2.
-- ------------------------------------------------------------
do $$
declare b3 bigint := pg_temp.booking(45);
begin
  perform pg_temp.svar('3. Det samme bord efter opholdet går igennem',
    pg_temp.tildel(b3, pg_temp.bord('PRØVE-A')) = 'gik igennem');
end $$;

-- ------------------------------------------------------------
--  4) ET AFSLAG FRIGIVER BORDET IGEN
--     Samme regel som pladserne til et arrangement: en afvist
--     booking sidder der ikke.
-- ------------------------------------------------------------
do $$
declare b4 bigint := pg_temp.booking(90);
        b5 bigint;
begin
  perform pg_temp.tildel(b4, pg_temp.bord('PRØVE-B'));
  update public.bordbestillinger set status = 'afvist' where id = b4;
  b5 := pg_temp.booking(90);
  perform pg_temp.svar('4. En afvist booking spærrer ikke bordet',
    pg_temp.tildel(b5, pg_temp.bord('PRØVE-B')) = 'gik igennem');
end $$;

-- ------------------------------------------------------------
--  5) ET SLUKKET BORD FINDES IKKE
-- ------------------------------------------------------------
do $$
declare b6 bigint := pg_temp.booking(120);
begin
  perform pg_temp.svar('5. Et slukket bord kan ikke tildeles',
    pg_temp.tildel(b6, pg_temp.bord('PRØVE-SLUK')) like '%bordet_er_slukket%');
end $$;

-- ------------------------------------------------------------
--  ⚠️ 6) GÆSTEN SÆTTER ALDRIG BORDET
--     Kunne anon det, ville enhver med anon-nøglen kunne tage bord
--     7 hver lørdag hele efteråret.
-- ------------------------------------------------------------
do $$
declare b7 bigint := pg_temp.booking(150); svar text;
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  svar := pg_temp.tildel(b7, pg_temp.bord('PRØVE-B'));
  perform set_config('request.jwt.claims', '', true);
  perform pg_temp.svar('6. Gæsten kan ikke give sig selv et bord',
    svar like '%kun_personale%');
end $$;

-- ------------------------------------------------------------
--  7) OG BORDET KAN TAGES AF IGEN
--     Et fejltryk skal kunne fortrydes; null er den normale
--     tilstand.
-- ------------------------------------------------------------
do $$
declare b8 bigint := current_setting('proev.b1')::bigint;
begin
  perform pg_temp.svar('7. Bordet kan tages af igen',
    pg_temp.tildel(b8, null) = 'gik igennem');
end $$;

-- ------------------------------------------------------------
--  RAPPORTEN
-- ------------------------------------------------------------
do $$
declare r text := coalesce(current_setting('proev.rapport', true), '(ingen)');
begin
  raise exception E'\n\n%\n\nPrøvens dag: % kl. %  (alt er rullet tilbage)\n',
    r, pg_temp.dagen(), to_char(pg_temp.tiden(), 'HH24:MI');
end $$;

rollback;
