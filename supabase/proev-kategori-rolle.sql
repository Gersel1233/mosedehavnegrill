-- ============================================================
--  PRØVE: KATEGORIENS FASTE MÆRKE  (12. okt 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet EFTER kategori-rolle.sql. Skriver
--  ingenting, der bliver stående: alt sker i en transaktion, der
--  rulles tilbage til sidst.
--
--  ⚠️ PRØVE 4-7 MÅLER PÅ EJERENS EGNE NAVNE (menukort-ejerens-
--  liste.sql og de senere kort) — ikke på navne, prøven selv har
--  lagt ind. Et tal skal komme udefra.
--
--  Skal skrive: ALLE 8 AF 8 BESTOD.
-- ============================================================

begin;

create temp table _svar (nr int, navn text, bestod boolean) on commit drop;

-- 1) Kolonnen findes
insert into _svar
select 1, 'kolonnen menu_kategorier.rolle findes',
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'menu_kategorier'
             and column_name = 'rolle');

-- 2) De seks mærker og tom tages imod
do $$
begin
  insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering, rolle)
  values ('mosede', 'mad', 'PRØVE a', 901, 'smoerrebroed'), ('mosede', 'mad', 'PRØVE b', 902, 'haandmadder'),
         ('mosede', 'mad', 'PRØVE c', 903, 'fyld'),         ('mosede', 'mad', 'PRØVE d', 904, 'tapas'),
         ('mosede', 'mad', 'PRØVE e', 905, 'pindemad'),     ('mosede', 'mad', 'PRØVE f', 906, 'sliders'),
         ('mosede', 'mad', 'PRØVE g', 907, null);
  insert into _svar values (2, 'de seks mærker og tom tages imod', true);
exception when others then
  insert into _svar values (2, 'de seks mærker og tom tages imod', false);
end $$;

-- 3) Et opfundet mærke afvises — af VÆRNET, ikke af noget andet.
--    Et mærke, ingen side kender, ville være en kategori, der tror,
--    den står et sted, den ikke står.
do $$
begin
  insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering, rolle)
  values ('mosede', 'mad', 'PRØVE forkert', 908, 'burgere');
  insert into _svar values (3, 'et opfundet mærke afvises', false);
exception when check_violation then
  insert into _svar values (3, 'et opfundet mærke afvises', true);
when others then
  insert into _svar values (3, 'et opfundet mærke afvises', false);
end $$;

-- 4-7) Mærkerne blev sat ud fra ejerens navne
insert into _svar
select 4, 'Smørrebrød og Håndmadder fik hver sit smørrebrødsmærke',
  coalesce((select rolle from public.menu_kategorier where lokation_id = 'mosede' and navn = 'Smørrebrød'), '') = 'smoerrebroed'
  and coalesce((select rolle from public.menu_kategorier where lokation_id = 'mosede' and navn = 'Håndmadder'), '') = 'haandmadder';

insert into _svar
select 5, '«Vælg fyld til smørrebrødet» er fyld — ikke smørrebrød',
  coalesce((select rolle from public.menu_kategorier
             where lokation_id = 'mosede' and navn ilike 'vælg fyld%' limit 1), '') = 'fyld';

insert into _svar
select 6, 'tapasfadet, pindemaden og sliderne fik deres mærke',
  exists (select 1 from public.menu_kategorier where lokation_id = 'mosede' and rolle = 'tapas' and navn ilike '%tapas%')
  and exists (select 1 from public.menu_kategorier where lokation_id = 'mosede' and rolle = 'pindemad' and navn ilike '%pindemad%')
  and exists (select 1 from public.menu_kategorier where lokation_id = 'mosede' and rolle = 'sliders' and navn ilike '%slider%');

insert into _svar
select 7, 'de almindelige kategorier fik intet mærke (Øl, Burgere, Kugleis)',
  not exists (select 1 from public.menu_kategorier
               where lokation_id = 'mosede' and navn in ('Øl', 'Burgere', 'Kugleis') and rolle is not null);

-- 8) HELE POINTEN: en omdøbning tager ikke mærket med sig.
do $$
declare r text;
begin
  update public.menu_kategorier set navn = 'Burgere og små boller fra pladen'
   where lokation_id = 'mosede' and rolle = 'sliders';
  select rolle into r from public.menu_kategorier
   where lokation_id = 'mosede' and navn = 'Burgere og små boller fra pladen' limit 1;
  insert into _svar values (8, 'en omdøbt kategori beholder sit mærke', r = 'sliders');
exception when others then
  insert into _svar values (8, 'en omdøbt kategori beholder sit mærke', false);
end $$;

select nr, navn, case when bestod then 'BESTOD' else 'FEJLEDE' end as udfald
from _svar order by nr;

select case
  when (select count(*) from _svar where bestod) = 8
  then 'ALLE 8 AF 8 BESTOD'
  else 'NOGET FEJLEDE — se listen ovenfor'
end as resultat
from _svar limit 1;

rollback;
