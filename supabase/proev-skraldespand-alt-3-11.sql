-- ============================================================
--  PRØVE: SKRALDESPANDEN TAGER ALT  (3/11 2026)
--  ------------------------------------------------------------
--  Kør EFTER skraldespand-alt-3-11.sql. Alt rulles tilbage.
--  Skal skrive: ALLE 6 AF 6 BESTOD.
-- ============================================================
begin;

create temp table _svar (nr int, navn text, bestod boolean) on commit drop;

-- 1) Et slettet arrangement ligger i arkivet og er væk fra kalenderen
do $$
declare v_id bigint;
begin
  insert into public.kalender (lokation_id, type, dato, titel)
  values ('mosede', 'arrangement', '2099-03-01', 'PRØVE skrald') returning id into v_id;
  delete from public.kalender where id = v_id;
  insert into _svar values (1, 'arrangementet ligger i arkivet og er væk fra kalenderen',
    not exists (select 1 from public.kalender where id = v_id)
    and exists (select 1 from public.skraldespand_arkiv
                 where tabel = 'kalender' and raekke_id = v_id::text and hoved));
end $$;

-- 2) Hent tilbage: samme id og titel, og arkivrækken er væk
do $$
declare v_a bigint; v_id text;
begin
  select id, raekke_id into v_a, v_id from public.skraldespand_arkiv
   where tabel = 'kalender' and raekke ->> 'titel' = 'PRØVE skrald';
  perform public.mosede_gendan_arkiv(v_a);
  insert into _svar values (2, 'arrangementet kommer tilbage med samme id',
    exists (select 1 from public.kalender where id::text = v_id and titel = 'PRØVE skrald')
    and not exists (select 1 from public.skraldespand_arkiv where id = v_a));
end $$;

-- 3) En kategori tager sine varer med — og de står ikke selv i spanden
do $$
declare v_kat text; v_varer int;
begin
  select k.id::text into v_kat from public.menu_kategorier k
   where exists (select 1 from public.menu_varer v where v.kategori_id = k.id)
   order by k.id limit 1;
  select count(*) into v_varer from public.menu_varer where kategori_id::text = v_kat;
  delete from public.menu_kategorier where id::text = v_kat;
  insert into _svar values (3, 'kategoriens varer følger med, men ikke som egne rækker i spanden',
    (select count(*) from public.skraldespand_arkiv where tabel = 'menu_varer'
       and raekke ->> 'kategori_id' = v_kat and not hoved) = v_varer
    and v_varer > 0
    and exists (select 1 from public.skraldespand_arkiv where tabel = 'menu_kategorier'
                  and raekke_id = v_kat and hoved));
  create temp table _kat on commit drop as select v_kat as id, v_varer as varer;
end $$;

-- 4) Kategorien hentes tilbage — med alle sine varer
do $$
declare v_kat text; v_varer int; v_a bigint;
begin
  select id, varer into v_kat, v_varer from _kat;
  select id into v_a from public.skraldespand_arkiv where tabel = 'menu_kategorier' and raekke_id = v_kat;
  perform public.mosede_gendan_arkiv(v_a);
  insert into _svar values (4, 'kategorien kommer tilbage med alle sine varer',
    exists (select 1 from public.menu_kategorier where id::text = v_kat)
    and (select count(*) from public.menu_varer where kategori_id::text = v_kat) = v_varer
    and not exists (select 1 from public.skraldespand_arkiv where raekke ->> 'kategori_id' = v_kat));
end $$;

-- 5) Findes rækken allerede, siger den det pænt
do $$
declare v_id bigint; v_a bigint;
begin
  insert into public.nyheder (lokation_id, titel, tekst)
  values ('mosede', 'PRØVE nyhed', 'PRØVE') returning id into v_id;
  delete from public.nyheder where titel = 'PRØVE nyhed';
  select id into v_a from public.skraldespand_arkiv where tabel = 'nyheder' and raekke ->> 'titel' = 'PRØVE nyhed';
  execute format('insert into public.nyheder select * from jsonb_populate_record(null::public.nyheder, %L)',
    (select raekke from public.skraldespand_arkiv where id = v_a));
  begin
    perform public.mosede_gendan_arkiv(v_a);
    insert into _svar values (5, 'en række, der findes igen, giver en pæn fejl', false);
  exception when others then
    insert into _svar values (5, 'en række, der findes igen, giver en pæn fejl',
      sqlerrm like '%skraldespand_findes_allerede%');
  end;
exception when others then
  insert into _svar values (5, 'en række, der findes igen, giver en pæn fejl (' || sqlerrm || ')', false);
end $$;

-- 6) Udløseren sidder på alle syv tabeller
insert into _svar
select 6, 'udløseren sidder på alle syv tabeller',
  (select count(*) from pg_trigger where tgname = 'til_skraldespand' and not tgisinternal) = 7;

select nr, navn, case when bestod then 'BESTOD' else 'FEJLEDE' end as udfald from _svar order by nr;
select case when (select count(*) from _svar where bestod) = 6
  then 'ALLE 6 AF 6 BESTOD' else 'NOGET FEJLEDE — se listen ovenfor' end as resultat;

rollback;
