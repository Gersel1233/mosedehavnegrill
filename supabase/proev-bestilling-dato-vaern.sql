-- ============================================================
--  PRØVE: DATOREGLEN SOM UDLØSER  (3. september 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet EFTER bestilling-dato-vaern.sql.
--  Skriver ingenting, der bliver stående: alt sker i en
--  transaktion, der rulles tilbage til sidst.
--
--  Skal skrive: ALLE 6 AF 6 BESTOD.
--
--  ⚠️ PRØVEN LÅNER IKKE EJERENS DATA. Den har sin egen forretning,
--     sit eget telefonnummer og en vare, der med vilje ikke kan
--     stå på menukortet — de tre navneværn (pris, udsolgt,
--     kategoriens dage) rører aldrig et navn, de ikke kan finde.
--     Det er læren fra proev-bord-uden-telefon.sql, som faldt tre
--     gange hos kunden af netop den grund.
-- ============================================================

begin;

create temp table _svar (nr int, navn text, bestod boolean, grund text)
  on commit drop;

-- Prøvens egen forretning. ⚠️ lokationer har tre not null-felter
-- (setup.sql linje 101) — en stub med kun id og navn faldt 30/8.
insert into public.lokationer (id, navn, adresse, postnr, by)
values ('proev-dato', 'Prøvehavnen', 'Prøvevej 1', '2670', 'Greve')
on conflict (id) do nothing;

-- ⚠️ EN VARE, DER IKKE KAN STÅ PÅ KORTET. mosede_pris_vaern,
-- mosede_udsolgt_vaern og mosede_kategori_dag_vaern slår alle op
-- på NAVNET og rører kun navne, de FINDER. Et navn med et tegn,
-- ejeren aldrig ville skrive, går derfor fri af alle tre.
create or replace function pg_temp.varen() returns jsonb
language sql immutable as $$
  select '[{"navn":"Prøvevare — rulles tilbage","antal":1,"pris":50}]'::jsonb
$$;

-- Indsætter en bestilling og svarer med fejlgrunden, hvis den
-- afvises. ⚠️ GRUNDEN SKAL MED: en rød linje, der kun siger "det
-- gik ikke", er dét, der kostede tre runder 2/9 — man kan ikke se,
-- om prøven bestod af den rigtige årsag.
create or replace function pg_temp.best(p_dato date, p_nr int)
returns text language plpgsql as $$
begin
  /* ⚠️ antal ER not null (setup.sql linje 309) og udfyldes af
     ingen udløser — klienten regner den ud af linjerne. En prøve,
     der glemmer den, falder på noget helt andet end det, den
     måler. Det er præcis fejlen i proev-bestillingsnummer.sql. */
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, antal)
  values
    ('PD' || p_nr || to_char(clock_timestamp(), 'USMS'), 'proev-dato',
     'Prøve Person', '000041' || (10 + p_nr), p_dato,
     make_time(12, p_nr, 0), pg_temp.varen(), 1);
  return null;
exception when others then
  return sqlerrm;
end $$;

-- ------------------------------------------------------------
--  1) CHECK'et er væk, udløseren står
-- ------------------------------------------------------------
insert into _svar
select 1, 'CHECK''et er vaek og udloeseren staar',
  (select count(*) = 0 from pg_constraint where conname = 'bestilling_dato_ok')
  and (select count(*) = 1 from pg_trigger
        where tgname = 'bestilling_dato' and not tgisinternal),
  null;

-- ------------------------------------------------------------
--  2) Udløseren er security definer med låst søgesti — samme
--     hærdning som lukkedag-værnet fik 23/8. Uden den slår den
--     op med den KALDENDES øjne.
-- ------------------------------------------------------------
insert into _svar
select 2, 'udloeseren er security definer med laast soegesti',
  (select p.prosecdef and p.proconfig::text like '%search_path=%'
     from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public'
      and p.proname = 'mosede_bestilling_dato_vaern'),
  null;

-- ------------------------------------------------------------
--  3) En dag, der er gået, afvises STADIG — og af den rigtige
--     grund. Reglen forsvandt ikke, den flyttede.
-- ------------------------------------------------------------
do $$
declare g text;
begin
  g := pg_temp.best(current_date - 30, 3);
  insert into _svar values (3, 'en dato 30 dage tilbage afvises',
    g is not null and g like '%bestilling_dato_ok%', g);
end $$;

-- ------------------------------------------------------------
--  4) Og en dag mere end fire måneder ude
-- ------------------------------------------------------------
do $$
declare g text;
begin
  g := pg_temp.best(current_date + 200, 4);
  insert into _svar values (4, 'en dato 200 dage frem afvises',
    g is not null and g like '%bestilling_dato_ok%', g);
end $$;

-- ------------------------------------------------------------
--  5) I morgen går igennem
-- ------------------------------------------------------------
do $$
declare g text;
begin
  g := pg_temp.best(current_date + 1, 5);
  insert into _svar values (5, 'i morgen gaar igennem', g is null, g);
end $$;

-- ------------------------------------------------------------
--  6) ⚠️ DEN, HELE FILEN FINDES FOR: en GAMMEL række kan rettes.
--     Personalet skal kunne trykke ✓ Færdig på en bestilling fra
--     i forgårs, som ingen fik lukket. Med CHECK'et faldt netop
--     den opdatering — og migreringen bag bestillingsnummeret
--     med den.
--
--     Rækken lægges ind med i morgens dato (som gæsten gjorde
--     dengang) og skubbes derefter tilbage i tiden uden om
--     udløseren, så vi står med præcis den situation, der findes
--     i produktionen.
-- ------------------------------------------------------------
do $$
declare
  v_id  bigint;
  g     text;
begin
  /* ⚠️ ER UDLØSEREN IKKE DER, SIGER PRØVEN DET — den kaster ikke.
     Falsificeret 3/9 ved at droppe udløseren og sætte CHECK'et
     tilbage: uden garden her døde filen på
     "trigger bestilling_dato does not exist", og de to sidste
     rapportlinjer kom aldrig ud. Så vidste man ikke, om prøven
     var faldet eller aldrig havde kørt. Det er læren fra
     proev-bord-uden-telefon.sql 2/9: rapporten skal sige HVORFOR. */
  if not exists (select 1 from pg_trigger
                  where tgname = 'bestilling_dato' and not tgisinternal) then
    insert into _svar values (6,
      'en gammel raekke kan hakkes af (statusskifte)', false,
      'udloeseren bestilling_dato findes ikke - er '
      || 'bestilling-dato-vaern.sql koert?');
  else
    insert into public.bestillinger
      (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
       linjer, antal)
    values
      ('PD6' || to_char(clock_timestamp(), 'USMS'), 'proev-dato',
       'Prøve Person', '00004199', current_date + 1, '12:06',
       pg_temp.varen(), 1)
    returning id into v_id;

    /* Rækken skubbes bagud i tiden uden om udløseren, så vi står
       med præcis den situation, der findes i produktionen: en
       bestilling, gæsten sendte i august til en dag i august. */
    alter table public.bestillinger disable trigger bestilling_dato;
    update public.bestillinger set hent_dato = current_date - 30 where id = v_id;
    alter table public.bestillinger enable trigger bestilling_dato;

    begin
      update public.bestillinger set status = 'afhentet' where id = v_id;
      g := null;
    exception when others then
      g := sqlerrm;
    end;

    insert into _svar values (6,
      'en gammel raekke kan hakkes af (statusskifte)', g is null, g);
  end if;
end $$;

-- ------------------------------------------------------------
--  RAPPORT
-- ------------------------------------------------------------
select
  nr,
  case when bestod then 'BESTOD   ' else 'FEJLEDE  ' end || navn as linje,
  grund
from _svar
order by nr;

select
  case when count(*) filter (where not bestod) = 0
    then 'ALLE ' || count(*) || ' AF ' || count(*) || ' BESTOD.'
    else count(*) filter (where not bestod) || ' AF ' || count(*)
         || ' FEJLEDE — se grund-kolonnen ovenfor.'
  end as resultat
from _svar;

rollback;
