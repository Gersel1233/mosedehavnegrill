-- ============================================================
--  PRØVE: MUSIK & SPISNING + ARRANGEMENT TIL KL. 02.00  (2/11 2026)
--  ------------------------------------------------------------
--  Kør EFTER arrangement-musik-og-spisning-2-11.sql.
--  Skriver intet, der bliver stående: alt rulles tilbage.
--
--  Skal skrive: ALLE 3 AF 3 BESTOD.
-- ============================================================

begin;

create temp table _svar (nr int, navn text, bestod boolean) on commit drop;

-- 1) 'musik_spisning' tages imod
do $$
begin
  insert into public.kalender (lokation_id, type, dato, titel, kategori)
  values ('mosede', 'arrangement', '2099-02-01', 'PRØVE blandet', 'musik_spisning');
  insert into _svar values (1, 'Musik & spisning tages imod', true);
exception when others then
  insert into _svar values (1, 'Musik & spisning tages imod', false);
end $$;

-- 2) En opfunden kategori afvises stadig
do $$
begin
  insert into public.kalender (lokation_id, type, dato, titel, kategori)
  values ('mosede', 'arrangement', '2099-02-02', 'PRØVE forkert', 'banko');
  insert into _svar values (2, 'en opfunden kategori afvises stadig', false);
exception when check_violation then
  insert into _svar values (2, 'en opfunden kategori afvises stadig', true);
when others then
  insert into _svar values (2, 'en opfunden kategori afvises stadig', false);
end $$;

-- 3) Et arrangement 20.00–02.00 (slutter dagen efter) kan gemmes —
--    sådan gemmer admin det, når sluttiden er før starttiden.
do $$
begin
  insert into public.kalender (lokation_id, type, dato, slut_dato, start_kl, slut_kl, titel)
  values ('mosede', 'arrangement', '2099-02-06', '2099-02-07', '20:00', '02:00', 'PRØVE nat');
  insert into _svar values (3, 'arrangement til kl. 02.00 kan gemmes', true);
exception when others then
  insert into _svar values (3, 'arrangement til kl. 02.00 kan gemmes', false);
end $$;

select nr, navn, case when bestod then 'BESTOD' else 'FEJLEDE' end as udfald
from _svar order by nr;

select case
  when (select count(*) from _svar where bestod) = 3
  then 'ALLE 3 AF 3 BESTOD'
  else 'NOGET FEJLEDE — se listen ovenfor'
end as resultat
from _svar limit 1;

rollback;
