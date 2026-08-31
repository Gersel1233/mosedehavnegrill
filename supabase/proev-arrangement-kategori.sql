-- ============================================================
--  PRØVE: ARRANGEMENTETS KATEGORI  (31. august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet EFTER arrangement-kategori.sql.
--  Skriver ingenting, der bliver stående: alt sker i en
--  transaktion, der rulles tilbage til sidst.
--
--  Skal skrive: ALLE 4 AF 4 BESTOD.
-- ============================================================

begin;

create temp table _svar (nr int, navn text, bestod boolean) on commit drop;

-- 1) Kolonnen findes
insert into _svar
select 1, 'kolonnen kalender.kategori findes',
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'kalender'
      and column_name = 'kategori'
  );

-- 2) De tre lovlige værdier og null tages imod
do $$
begin
  insert into public.kalender (lokation_id, type, dato, titel, kategori)
  values
    ('mosede', 'arrangement', '2099-01-01', 'PRØVE musik',    'musik'),
    ('mosede', 'arrangement', '2099-01-02', 'PRØVE spisning', 'spisning'),
    ('mosede', 'arrangement', '2099-01-03', 'PRØVE fest',     'fest'),
    ('mosede', 'arrangement', '2099-01-04', 'PRØVE uden',     null);
  insert into _svar values (2, 'musik/spisning/fest og null tages imod', true);
exception when others then
  insert into _svar values (2, 'musik/spisning/fest og null tages imod', false);
end $$;

-- 3) En opfunden kategori afvises. Fri tekst her ville være en
--    fjerde knap på siden, ingen har tegnet.
do $$
begin
  insert into public.kalender (lokation_id, type, dato, titel, kategori)
  values ('mosede', 'arrangement', '2099-01-05', 'PRØVE forkert', 'banko');
  insert into _svar values (3, 'en opfunden kategori afvises', false);
exception when check_violation then
  insert into _svar values (3, 'en opfunden kategori afvises', true);
when others then
  -- Afvist af noget ANDET end værnet er ikke et bevis for værnet.
  insert into _svar values (3, 'en opfunden kategori afvises', false);
end $$;

-- 4) En rettelse til en lovlig værdi går igennem — det er vejen,
--    ejeren giver de GAMLE arrangementer en kategori.
do $$
begin
  update public.kalender set kategori = 'spisning'
  where titel = 'PRØVE uden' and dato = '2099-01-04';
  insert into _svar values (4, 'en rettelse kan sætte kategorien bagefter', true);
exception when others then
  insert into _svar values (4, 'en rettelse kan sætte kategorien bagefter', false);
end $$;

select nr, navn, case when bestod then 'BESTOD' else 'FEJLEDE' end as udfald
from _svar order by nr;

select case
  when (select count(*) from _svar where bestod) = 4
  then 'ALLE 4 AF 4 BESTOD'
  else 'NOGET FEJLEDE — se listen ovenfor'
end as resultat
from _svar limit 1;

rollback;
