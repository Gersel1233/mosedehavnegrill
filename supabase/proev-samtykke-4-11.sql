-- ============================================================
--  PRØVE: COOKIE-SAMTYKKE-LOG  (4/11 2026)
--  Kør EFTER samtykke-4-11.sql. Alt rulles tilbage.
--  Skal skrive: ALLE 4 AF 4 BESTOD.
-- ============================================================
begin;
create temp table _svar (nr int, navn text, bestod boolean);
grant all on _svar to anon, authenticated;

insert into public.admin_adgang (email, lokation_id, rolle, aktiv, navn) values
  ('chef@sam.dk', 'mosede', 'ejer', true, 'Chef'),
  ('lone@sam.dk', 'mosede', 'medarbejder', true, 'Lone')
on conflict do nothing;

-- 1) Gæsten kan logge et valg
set local role anon;
do $$ begin
  insert into public.samtykke_log (lokation_id, samtykke_id, version, statistik, marketing, side)
  values ('mosede', 'a1b2c3d4e5f60718', '1:ga4,meta', true, false, '/index.html');
  insert into _svar values (1, 'gæsten logger et valg', true);
exception when others then insert into _svar values (1, 'gæsten logger et valg (' || sqlerrm || ')', false);
end $$;

-- 2) Gæsten kan ikke læse loggen
do $$ declare n int; begin
  select count(*) into n from public.samtykke_log;
  insert into _svar values (2, 'gæsten kan ikke læse loggen', false);
exception when insufficient_privilege then insert into _svar values (2, 'gæsten kan ikke læse loggen', true);
end $$;

-- 3) Noget, der ligner et navn i id-feltet, afvises
do $$ begin
  insert into public.samtykke_log (lokation_id, samtykke_id, version, statistik, marketing)
  values ('mosede', 'Anna Hansen 22334455', '1:ga4', true, true);
  insert into _svar values (3, 'et navn i id-feltet afvises', false);
exception when check_violation then insert into _svar values (3, 'et navn i id-feltet afvises', true);
end $$;

-- 4) Chefen kan læse, medarbejderen kan ikke
reset role;
set local role authenticated;
set local request.jwt.claims = '{"email":"chef@sam.dk"}';
do $$ declare c int; m int; begin
  select count(*) into c from public.samtykke_log where samtykke_id = 'a1b2c3d4e5f60718';
  perform set_config('request.jwt.claims', '{"email":"lone@sam.dk"}', true);
  select count(*) into m from public.samtykke_log where samtykke_id = 'a1b2c3d4e5f60718';
  insert into _svar values (4, 'chefen kan læse loggen, medarbejderen kan ikke', c = 1 and m = 0);
end $$;

reset role;
select nr, navn, case when bestod then 'BESTOD' else 'FEJLEDE' end as udfald from _svar order by nr;
select case when (select count(*) from _svar where bestod) = 4
  then 'ALLE 4 AF 4 BESTOD' else 'NOGET FEJLEDE — se listen ovenfor' end as resultat;
rollback;
