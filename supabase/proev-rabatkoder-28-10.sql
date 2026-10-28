-- ============================================================
--  PRØVE: RABATKODER TIL AFTALE-KUNDER  (28/10) — prøver rabatkoder-28-10.sql
--  ------------------------------------------------------------
--  Kør EFTER rabatkoder-28-10.sql. Ruller sig selv tilbage (fejlen
--  til sidst er med vilje). Prøven laver sin egen forretning.
--
--  Den halvdel, der betyder noget, er "kan ikke": gæsten kan hverken
--  læse koderne eller skrive sin egen rabat.
-- ============================================================
begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-rk', 'Rabatprøven', 'Vej 1', '2670', 'Greve', '11111111')
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
create or replace function pg_temp.proev(sql text) returns text
language plpgsql as $$
begin
  execute sql;
  return 'gik igennem';
exception when others then return coalesce(sqlerrm, '?');
end $$;

insert into public.admin_adgang (email, lokation_id, rolle, aktiv, navn) values
  ('chef@rk.dk', 'proev-rk', 'ejer', true, 'Chef'),
  ('lone@rk.dk', 'proev-rk', 'medarbejder', true, 'Lone'),
  ('anna@rk.dk', 'proev-rk', 'arrangoer', true, 'Anna');
insert into public.rabatkoder (lokation_id, kode, navn, procent, aktiv) values
  ('proev-rk', 'GREVE10', 'Greve Kommune', 10, true),
  ('proev-rk', 'GAMMEL', 'Gammel aftale', 20, false);

/* Gæstens bestilling — samme form som proev-sms.sql's laeg. */
create or replace function pg_temp.laeg(i int, kode text, sendt_kr numeric default null)
returns text language plpgsql as $$
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, fyld, antal, hvordan, kanal, rabat_kode, rabat_kr, rabat_navn)
  values ('RK-' || i, 'proev-rk', 'Aftalegæst', '2050' || lpad(i::text, 4, '0'),
          current_date + 2, '12:00'::time + (i || ' minutes')::interval,
          '[{"navn":"PRØVEVARE-RK","antal":2,"pris":50},{"navn":"PRØVEVARE-RK2","antal":1,"pris":30}]'::jsonb,
          '[]'::jsonb, 3, 'afhentning', 'smoerrebroed', kode, sendt_kr, case when sendt_kr is not null then 'Snyd' end);
  return 'RK-' || i;
end $$;

-- =============== GÆSTEN ======================================
set local role anon;
set local request.jwt.claims = '{}';
do $$
declare saa boolean := false; n text; p int; ingen int;
begin
  begin perform 1 from public.rabatkoder limit 1; saa := true; exception when others then null; end;
  perform pg_temp.svar('1) gæsten kan ikke læse koderne', not saa);

  select t.navn, t.procent into n, p from public.mosede_tjek_rabatkode(' greve10 ', 'proev-rk') t;
  perform pg_temp.svar('2) gæsten kan spørge om sin egen kode (små bogstaver og mellemrum er lige meget)', n = 'Greve Kommune' and p = 10);
  select count(*) into ingen from public.mosede_tjek_rabatkode('GAETTET', 'proev-rk');
  perform pg_temp.svar('3) en forkert kode svarer ingenting', ingen = 0);
  select count(*) into ingen from public.mosede_tjek_rabatkode('GAMMEL', 'proev-rk');
  perform pg_temp.svar('4) en slukket kode svarer ingenting', ingen = 0);

  perform pg_temp.svar('5) en bestilling med koden lander',
    pg_temp.proev($s$select pg_temp.laeg(1, 'greve10')$s$) = 'gik igennem');
  perform pg_temp.svar('6) en bestilling, der selv skriver 999 kr. rabat, lander — men med databasens tal',
    pg_temp.proev($s$select pg_temp.laeg(2, 'GREVE10', 999)$s$) = 'gik igennem');
  perform pg_temp.svar('7) en forkert kode afvises med rabatkode_ugyldig',
    pg_temp.proev($s$select pg_temp.laeg(3, 'GAETTET')$s$) like '%rabatkode_ugyldig%');
  perform pg_temp.svar('8) en slukket kode afvises',
    pg_temp.proev($s$select pg_temp.laeg(4, 'GAMMEL')$s$) like '%rabatkode_ugyldig%');
  perform pg_temp.svar('9) uden kode, men med en selvskrevet rabat, lander den — uden rabat',
    pg_temp.proev($s$select pg_temp.laeg(5, null, 50)$s$) = 'gik igennem');
end $$;
reset role;

do $$
declare b1 record; b2 record; b5 record;
begin
  select * into b1 from public.bestillinger where reference = 'RK-1';
  select * into b2 from public.bestillinger where reference = 'RK-2';
  select * into b5 from public.bestillinger where reference = 'RK-5';
  perform pg_temp.svar('10) rabatten er 10 % af 2 × 50 + 30 = 13 kr., med aftalens navn',
    b1.rabat_kr = 13 and b1.rabat_procent = 10 and b1.rabat_navn = 'Greve Kommune' and b1.rabat_kode = 'GREVE10');
  perform pg_temp.svar('11) gæstens egne 999 kr. og navn er skrevet over', b2.rabat_kr = 13 and b2.rabat_navn = 'Greve Kommune');
  perform pg_temp.svar('12) uden kode: ingen rabat, heller ikke den selvskrevne', b5.rabat_kr is null and b5.rabat_navn is null);
  perform pg_temp.svar('13) linjernes priser er urørte', (b1.linjer -> 0 ->> 'pris')::numeric = 50);
end $$;

-- =============== PERSONALET ==================================
set local role authenticated;
set local request.jwt.claims = '{"email":"lone@rk.dk"}';
select pg_temp.svar('14) personalet kan lave en kode',
  pg_temp.proev($s$insert into public.rabatkoder (lokation_id, kode, navn, procent) values ('proev-rk', 'FIRMA5', 'Firma', 5)$s$) = 'gik igennem');
set local request.jwt.claims = '{"email":"anna@rk.dk"}';
select pg_temp.svar('15) eventudvalget (arrangør) kan ikke',
  pg_temp.proev($s$insert into public.rabatkoder (lokation_id, kode, navn, procent) values ('proev-rk', 'ANNA50', 'Anna', 50)$s$) like '%row-level security%');
set local request.jwt.claims = '{"email":"chef@rk.dk"}';
select pg_temp.svar('16) mere end 50 % afvises',
  pg_temp.proev($s$insert into public.rabatkoder (lokation_id, kode, navn, procent) values ('proev-rk', 'HALVT', 'X', 60)$s$) like '%rabatkode_procent_ok%');
select pg_temp.svar('17) en kode med små bogstaver afvises (siden gemmer dem store)',
  pg_temp.proev($s$insert into public.rabatkoder (lokation_id, kode, navn, procent) values ('proev-rk', 'lille', 'X', 5)$s$) like '%rabatkode_kode_ok%');
reset role;

do $$
declare r text := current_setting('proev.rapport', true);
begin
  raise exception E'\n%\n%', r,
    case when r like '%FEJLEDE%' then 'NOGET FEJLEDE' else
      'ALLE ' || (length(r) - length(replace(r, E'\n', ''))) || ' AF '
      || (length(r) - length(replace(r, E'\n', ''))) || ' BESTOD' end;
end $$;
