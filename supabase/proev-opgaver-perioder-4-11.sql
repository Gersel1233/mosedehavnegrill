-- ============================================================
--  PRØVE: OPGAVER MED PERIODE OG UGEDAG  (4/11 2026)
--  Kør EFTER opgaver-perioder-4-11.sql. Alt rulles tilbage.
--  Skal skrive: ALLE 4 AF 4 BESTOD.
-- ============================================================
begin;

create temp table _svar (nr int, navn text, bestod boolean);
grant all on _svar to authenticated;

insert into public.admin_adgang (email, lokation_id, rolle, aktiv, navn) values
  ('chef@per.dk', 'mosede', 'ejer', true, 'Chef'),
  ('lone@per.dk', 'mosede', 'medarbejder', true, 'Lone')
on conflict do nothing;

set local role authenticated;

-- 1) Chefen lægger "uge 46-47" ind med en mandagsopgave og en datoopgave
set local request.jwt.claims = '{"email":"chef@per.dk"}';
do $$
declare v_l bigint;
begin
  insert into public.opgavelister (lokation_id, navn, gyldig_fra, gyldig_til)
  values ('mosede', 'PRØVE Jims uge', '2099-11-09', '2099-11-22') returning id into v_l;
  insert into public.opgaver (lokation_id, liste_id, tekst, ugedag, dato, raekkefoelge)
  values ('mosede', v_l, 'Skift fritureolie', 1, null, 1),
         ('mosede', v_l, 'Rens kaffemaskinen', 5, '2099-11-13', 2);
  insert into _svar values (1, 'chefen lægger en liste med periode og ugedage ind',
    (select count(*) from public.opgaver where liste_id = v_l and ugedag is not null) = 2);
exception when others then
  insert into _svar values (1, 'chefen lægger en liste med periode og ugedage ind (' || sqlerrm || ')', false);
end $$;

-- 2) En periode, der slutter før den begynder, afvises
do $$
begin
  insert into public.opgavelister (lokation_id, navn, gyldig_fra, gyldig_til)
  values ('mosede', 'PRØVE baglæns', '2099-11-22', '2099-11-09');
  insert into _svar values (2, 'en baglæns periode afvises', false);
exception when check_violation then
  insert into _svar values (2, 'en baglæns periode afvises', true);
end $$;

-- 3) Ugedag 8 findes ikke
do $$
declare v_l bigint;
begin
  select id into v_l from public.opgavelister where navn = 'PRØVE Jims uge';
  insert into public.opgaver (lokation_id, liste_id, tekst, ugedag) values ('mosede', v_l, 'PRØVE', 8);
  insert into _svar values (3, 'ugedag 8 afvises', false);
exception when check_violation then
  insert into _svar values (3, 'ugedag 8 afvises', true);
end $$;

-- 4) Personalet kan ikke flytte perioden
set local request.jwt.claims = '{"email":"lone@per.dk"}';
do $$
declare n int;
begin
  update public.opgavelister set gyldig_til = '2100-01-01' where navn = 'PRØVE Jims uge';
  get diagnostics n = row_count;
  insert into _svar values (4, 'personalet kan ikke flytte perioden', n = 0);
exception when others then
  insert into _svar values (4, 'personalet kan ikke flytte perioden', true);
end $$;

reset role;
select nr, navn, case when bestod then 'BESTOD' else 'FEJLEDE' end as udfald from _svar order by nr;
select case when (select count(*) from _svar where bestod) = 4
  then 'ALLE 4 AF 4 BESTOD' else 'NOGET FEJLEDE — se listen ovenfor' end as resultat;

rollback;
