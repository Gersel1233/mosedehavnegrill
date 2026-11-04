-- ============================================================
--  PRØVE: ARBEJDSOPGAVER MED INITIALER  (3/11 2026)
--  Kør EFTER opgaver-3-11.sql. Alt rulles tilbage.
--  Skal skrive: ALLE 9 AF 9 BESTOD.
-- ============================================================
begin;

create temp table _svar (nr int, navn text, bestod boolean);
grant all on _svar to authenticated;

insert into public.admin_adgang (email, lokation_id, rolle, aktiv, navn) values
  ('chef@opg.dk', 'mosede', 'ejer', true, 'Chef'),
  ('lone@opg.dk', 'mosede', 'medarbejder', true, 'Lone'),
  ('event@opg.dk', 'mosede', 'arrangoer', true, 'Event')
on conflict do nothing;

set local role authenticated;

-- 1) Chefen kan lægge en liste med opgaver ind
set local request.jwt.claims = '{"email":"chef@opg.dk"}';
do $$
declare v_l bigint;
begin
  insert into public.opgavelister (lokation_id, navn) values ('mosede', 'PRØVE Lukning') returning id into v_l;
  insert into public.opgaver (lokation_id, liste_id, tekst, afsnit, vaerdi_navn, raekkefoelge)
  values ('mosede', v_l, 'Tøm opvaskemaskinen', 'Lukning', null, 1), ('mosede', v_l, 'Sluk grillen', 'Lukning', 'Temp. °C', 2);
  insert into _svar values (1, 'chefen lægger en liste med opgaver ind', true);
exception when others then
  insert into _svar values (1, 'chefen lægger en liste med opgaver ind (' || sqlerrm || ')', false);
end $$;

-- 2) Personalet kan ikke rette listerne
set local request.jwt.claims = '{"email":"lone@opg.dk"}';
do $$
begin
  insert into public.opgavelister (lokation_id, navn) values ('mosede', 'PRØVE Lones');
  insert into _svar values (2, 'personalet kan ikke oprette lister', false);
exception when others then
  insert into _svar values (2, 'personalet kan ikke oprette lister', true);
end $$;

-- 3) Personalet ser opgaverne og sætter initialer
do $$
declare v_o bigint; v_l bigint;
begin
  select o.id, o.liste_id into v_o, v_l from public.opgaver o where o.tekst = 'Sluk grillen';
  insert into public.opgave_udfoert (lokation_id, opgave_id, liste_id, dato, tekst, liste_navn, initialer, vaerdi)
  values ('mosede', v_o, v_l, '2099-01-01', 'Sluk grillen', 'PRØVE Lukning', 'LK', '3,5');
  insert into _svar values (3, 'personalet ser opgaven og sætter initialer',
    exists (select 1 from public.opgave_udfoert where opgave_id = v_o and initialer = 'LK'
              and udfoert_af = 'lone@opg.dk'));
exception when others then
  insert into _svar values (3, 'personalet ser opgaven og sætter initialer (' || sqlerrm || ')', false);
end $$;

-- 4) Samme opgave kan ikke sættes to gange samme dag
do $$
declare v_o bigint;
begin
  select id into v_o from public.opgaver where tekst = 'Sluk grillen';
  insert into public.opgave_udfoert (lokation_id, opgave_id, dato, tekst, initialer)
  values ('mosede', v_o, '2099-01-01', 'Sluk grillen', 'MK');
  insert into _svar values (4, 'samme opgave to gange samme dag afvises', false);
exception when unique_violation then
  insert into _svar values (4, 'samme opgave to gange samme dag afvises', true);
end $$;

-- 5) Initialerne skal være bogstaver (1-4)
do $$
declare v_o bigint;
begin
  select id into v_o from public.opgaver where tekst = 'Tøm opvaskemaskinen';
  insert into public.opgave_udfoert (lokation_id, opgave_id, dato, tekst, initialer)
  values ('mosede', v_o, '2099-01-01', 'x', '');
  insert into _svar values (5, 'tomme initialer afvises', false);
exception when check_violation then
  insert into _svar values (5, 'tomme initialer afvises', true);
end $$;

-- 8) Chefen opretter en medarbejder; to aktive med samme initialer afvises
set local request.jwt.claims = '{"email":"chef@opg.dk"}';
do $$
begin
  insert into public.medarbejdere (lokation_id, navn, initialer) values ('mosede', 'Mikkel Kruse', 'MK');
  begin
    insert into public.medarbejdere (lokation_id, navn, initialer) values ('mosede', 'Maria Kjær', 'mk');
    insert into _svar values (8, 'chefen opretter medarbejdere; dobbelte initialer afvises', false);
  exception when unique_violation then
    insert into _svar values (8, 'chefen opretter medarbejdere; dobbelte initialer afvises', true);
  end;
exception when others then
  insert into _svar values (8, 'chefen opretter medarbejdere (' || sqlerrm || ')', false);
end $$;

-- 9) Personalet ser holdet, men kan ikke oprette nogen
set local request.jwt.claims = '{"email":"lone@opg.dk"}';
do $$
begin
  insert into public.medarbejdere (lokation_id, navn, initialer) values ('mosede', 'Snyder', 'SN');
  insert into _svar values (9, 'personalet ser holdet, men opretter ingen', false);
exception when others then
  insert into _svar values (9, 'personalet ser holdet, men opretter ingen',
    (select count(*) from public.medarbejdere where initialer = 'MK') = 1);
end $$;

-- 6) Arrangøren ser ingenting
set local request.jwt.claims = '{"email":"event@opg.dk"}';
insert into _svar select 6, 'arrangøren ser ingen opgaver og intet hold',
  not exists (select 1 from public.opgaver where tekst like 'Sluk%')
  and not exists (select 1 from public.medarbejdere);

-- 7) Dagens dokument står, selv om chefen sletter listen bagefter
set local request.jwt.claims = '{"email":"chef@opg.dk"}';
delete from public.opgavelister where navn = 'PRØVE Lukning';
insert into _svar select 7, 'dagens dokument står, selv om listen slettes',
  exists (select 1 from public.opgave_udfoert where tekst = 'Sluk grillen' and initialer = 'LK'
            and liste_navn = 'PRØVE Lukning');

reset role;
select nr, navn, case when bestod then 'BESTOD' else 'FEJLEDE' end as udfald from _svar order by nr;
select case when (select count(*) from _svar where bestod) = 9
  then 'ALLE 9 AF 9 BESTOD' else 'NOGET FEJLEDE — se listen ovenfor' end as resultat;

rollback;
