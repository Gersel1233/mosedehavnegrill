-- ============================================================
--  PRØVE: EVENTUDVALGET OG NYHEDERNE  (28. okt 2026)
--  ------------------------------------------------------------
--  Kør EFTER eventudvalg-nyheder-28-10.sql. Rapporten kommer til
--  sidst som én "fejl", og afbrydelsen ruller alt tilbage.
--  Et nej skal være RLS' nej (ordlyden måles) — ikke en
--  tastefejl i prøven, der tilfældigvis også siger nej.
--  Parvis: arrangøren KAN skrive en nyhed — og kan stadig IKKE
--  røre indstillingerne, menukortet eller en anden forretnings
--  nyheder. Prøven laver sin egen forretning.
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

create or replace function pg_temp.proev(sql text) returns text
language plpgsql as $$
begin
  execute sql;
  return 'gik igennem';
exception when others then return coalesce(sqlerrm, '?');
end $$;

create or replace function pg_temp.tal(sql text) returns bigint
language plpgsql as $$
declare n bigint;
begin
  execute sql into n;
  return n;
end $$;

insert into public.lokationer (id, navn, adresse, postnr, by, aktiv, sortering)
values ('proev-nyh', 'Prøvehavn', 'Prøvevej 1', '2670', 'Greve', true, 99),
       ('proev-nyh2', 'Anden havn', 'Andenvej 1', '2670', 'Greve', true, 98);

insert into public.admin_adgang (email, lokation_id, rolle, aktiv, navn) values
  ('chef@nyh.dk', 'proev-nyh', 'ejer',        true, 'Chefen'),
  ('lone@nyh.dk', 'proev-nyh', 'medarbejder', true, 'Lone'),
  ('anna@nyh.dk', 'proev-nyh', 'arrangoer',   true, 'Anna'),
  ('gl@nyh.dk',   'proev-nyh', 'arrangoer',   false, 'Holdt op');

insert into public.nyheder (lokation_id, titel, tekst, dato)
values ('proev-nyh2', 'Naboens nyhed', 'Rør ikke', current_date);

set local role authenticated;

-- Arrangøren
set local request.jwt.claims = '{"email":"anna@nyh.dk"}';
select pg_temp.svar('1  arrangøren kan skrive en nyhed',
  pg_temp.proev($s$insert into public.nyheder (lokation_id, titel, tekst, dato)
                 values ('proev-nyh', 'Julefrokost', 'Book nu', current_date)$s$) = 'gik igennem');
select pg_temp.svar('2  … og rette den',
  pg_temp.tal($s$with u as (update public.nyheder set titel = 'Julefrokost 2026'
                 where lokation_id = 'proev-nyh' returning 1) select count(*) from u$s$) = 1);
select pg_temp.svar('3  men ikke en anden forretnings nyhed',
  pg_temp.tal($s$with u as (update public.nyheder set titel = 'Hacket'
                 where lokation_id = 'proev-nyh2' returning 1) select count(*) from u$s$) = 0);
select pg_temp.svar('4  og ikke skrive en nyhed hos naboen',
  pg_temp.proev($s$insert into public.nyheder (lokation_id, titel, tekst, dato)
                 values ('proev-nyh2', 'Hacket', 'x', current_date)$s$) like '%row-level security%');
select pg_temp.svar('5  arrangøren kan stadig IKKE rette indstillingerne',
  pg_temp.proev($s$insert into public.indstillinger (lokation_id, noegle, vaerdi)
                 values ('proev-nyh', 'levering', 'true'::jsonb)$s$) like '%row-level security%');
select pg_temp.svar('6  … og ikke menukortet',
  pg_temp.proev($s$insert into public.menu_kategorier (lokation_id, navn, aktiv, sortering)
                 values ('proev-nyh', 'Hacket', true, 1)$s$) like '%row-level security%');

-- En arrangør, der er holdt op
set local request.jwt.claims = '{"email":"gl@nyh.dk"}';
select pg_temp.svar('7  en arrangør, der er holdt op, kan ikke skrive',
  pg_temp.proev($s$insert into public.nyheder (lokation_id, titel, tekst, dato)
                 values ('proev-nyh', 'Gammel', 'x', current_date)$s$) like '%row-level security%');

-- Chefen og personalet kan det samme som før
set local request.jwt.claims = '{"email":"chef@nyh.dk"}';
select pg_temp.svar('8  chefen kan stadig skrive en nyhed',
  pg_temp.proev($s$insert into public.nyheder (lokation_id, titel, tekst, dato)
                 values ('proev-nyh', 'Fra chefen', 'x', current_date)$s$) = 'gik igennem');
set local request.jwt.claims = '{"email":"lone@nyh.dk"}';
select pg_temp.svar('9  personalet kan stadig skrive en nyhed',
  pg_temp.proev($s$insert into public.nyheder (lokation_id, titel, tekst, dato)
                 values ('proev-nyh', 'Fra Lone', 'x', current_date)$s$) = 'gik igennem');
set local request.jwt.claims = '{"email":"anna@nyh.dk"}';
select pg_temp.svar('10 arrangøren kan slette en nyhed',
  pg_temp.tal($s$with d as (delete from public.nyheder where lokation_id = 'proev-nyh'
                 and titel = 'Fra Lone' returning 1) select count(*) from d$s$) = 1);

-- Gæsten
set local role anon;
set local request.jwt.claims = '{}';
select pg_temp.svar('11 en gæst kan læse nyhederne',
  pg_temp.tal($s$select count(*) from public.nyheder where lokation_id = 'proev-nyh'$s$) >= 2);
select pg_temp.svar('12 men ikke skrive en',
  pg_temp.proev($s$insert into public.nyheder (lokation_id, titel, tekst, dato)
                 values ('proev-nyh', 'Spam', 'x', current_date)$s$) like '%row-level security%');

reset role;
do $$
declare r text := current_setting('proev.rapport', true);
begin
  raise exception E'\n%\n%', r,
    case when r like '%FEJLEDE%' then 'NOGET FEJLEDE' else
      'ALLE ' || (length(r) - length(replace(r, E'\n', ''))) || ' AF '
      || (length(r) - length(replace(r, E'\n', ''))) || ' BESTOD' end;
end $$;
