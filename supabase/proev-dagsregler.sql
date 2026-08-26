-- ============================================================
--  PRØVE AF DAGSREGLERNE  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER dagsregler.sql. Hver prøve skriver BESTOD eller
--  FEJLEDE, og rapporten kommer til sidst som én "fejl" — det er
--  den ene kanal Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der ruller prøvens data tilbage.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  Dagsreglerne er kun et værn, hvis de fælder det rigtige OG
--  lader det rigtige igennem. En halvt lukket dag har fire
--  udgange, og tre af dem er dyre:
--
--   · Lukker vi spis her og afviser take-away med, mister
--     forretningen en dags salg, den sagtens kunne have haft.
--   · Lukker vi spis her og lader det igennem alligevel, kommer
--     en familie ind midt i et selskab.
--   · Glemmer vi bordene (QR), kan gæsten scanne sig ind på
--     præcis den dag, trædækket er optaget.
--
--  KØRER DU DEN PÅ EN BAR POSTGRES? Kør først:
--    grant all on all tables in schema public to anon, authenticated;
--    grant usage, select on all sequences in schema public
--      to anon, authenticated;
-- ============================================================

begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-d', 'Forretning D', 'Vej 1', '2670', 'Greve', '11111111')
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

/* Dagene: +1 kun take-away (spis her lukket — selskabsdagen),
   +2 kun spis her, +3 egne tider, +4 helt almindelig. */
insert into public.dags_regler
  (lokation_id, dato, luk_takeaway, luk_spis_her, tidligst, senest_togo, senest_spis_her)
values
  ('proev-d', current_date + 1, false, true,  null,    null,    null),
  ('proev-d', current_date + 2, true,  false, null,    null,    null),
  ('proev-d', current_date + 3, false, false, '16:00', '19:00', '20:30')
on conflict (lokation_id, dato) do update set
  luk_takeaway = excluded.luk_takeaway,
  luk_spis_her = excluded.luk_spis_her,
  tidligst = excluded.tidligst,
  senest_togo = excluded.senest_togo,
  senest_spis_her = excluded.senest_spis_her;

/* p_tid er TIME og ikke text: i plpgsql kræver text→time en
   udtrykkelig cast, og den manglende cast væltede de POSITIVE
   prøver i lukkedags-prøven — så det lignede et værn, der afviste
   åbne dage. */
/* ⚠️ TELEFONNUMMERET ER ET ARGUMENT, OG DET KOSTEDE PRØVE 1.

   Dubletvagten (restaurant.sql) er et unikt indeks på
   (telefon, hent_dato, hent_tid) for rækker uden bordnummer.
   Første udgave gav alle prøver det SAMME nummer, og prøve 1 —
   den, der sender både take-away og spis her på den samme dag og
   det samme klokkeslæt — blev fældet af dubletvagten i stedet for
   at måle dagsreglerne. Den sagde FEJLEDE om noget, der virkede.

   To gæster er to numre. */
create or replace function pg_temp.bestil(
  p_dato date, p_tid time, p_ref text, p_hvordan text,
  p_bord text default null, p_tlf text default '20304050')
returns boolean language plpgsql as $$
begin
  insert into public.bestillinger
    (lokation_id, reference, navn, telefon, hent_dato, hent_tid,
     linjer, antal, hvordan, bord_nummer)
  values ('proev-d', p_ref, 'Gæst', p_tlf, p_dato, p_tid,
          '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1, p_hvordan, p_bord);
  return true;
exception when others then return false;
end $$;

-- =============== 0) ⚠️ KAN GÆSTEN OVERHOVEDET SKRIVE? =======
/* DEN HER PRØVE ER FØDT AF EN FEJL, OG DEN ER DEN VIGTIGSTE I
   FILEN.

   Prøve 15, 16 og 17 måler, at gæsten bliver AFVIST. Men på en
   database, hvor rollen anon slet ikke har skriveret, bliver hun
   afvist uanset hvad — og så består alle tre, også med værnet
   revet ud. MÅLT: præcis det skete her. Tre prøver, der ikke
   kunne fejle, sagde god for et værn, der var pillet fra
   hinanden.

   Den her prøve skriver som gæst på en helt almindelig dag langt
   ude i fremtiden. Fejler DEN, er 15-17 værdiløse, og rapporten
   siger det med det samme.

   Mangler rettighederne på en bar Postgres:
     grant all on all tables in schema public to anon, authenticated;
     grant usage, select on all sequences in schema public
       to anon, authenticated; */
do $$
declare gik boolean;
begin
  set local role anon;
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid,
       linjer, antal, hvordan)
    values ('proev-d', 'PD-0', 'Gæst', '20304077', current_date + 40, '12:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1, 'afhentning');
    gik := true;
  exception when others then gik := false;
  end;
  reset role;
  perform pg_temp.svar(
    '0. Gæsten KAN skrive på en åben dag (uden den måler 15-17 intet)', gik);
end $$;

-- =============== 1) EN DAG UDEN REGLER ER URØRT =============
/* Den vigtigste af dem alle. Tabellen må ikke gøre almindelige
   dage til noget, personalet skal huske at åbne. Ingen række =
   som den plejer. */
select pg_temp.svar('1. En dag uden en regelrække tager imod begge dele',
  pg_temp.bestil(current_date + 4, '12:00', 'PD-1A', 'afhentning', null, '20304060')
  and pg_temp.bestil(current_date + 4, '12:00', 'PD-1B', 'spis_her', null, '20304061'));

-- =============== 2) SELSKABSDAGEN ===========================
/* Spis her lukket, take-away åben. Det er kundens egen dag:
   trædækket er optaget, men køkkenet laver stadig mad. */
select pg_temp.svar('2. Spis her afvises på en dag, der er lukket for det',
  not pg_temp.bestil(current_date + 1, '12:00', 'PD-2', 'spis_her'));

select pg_temp.svar('3. Take-away går STADIG igennem den dag',
  pg_temp.bestil(current_date + 1, '12:00', 'PD-3', 'afhentning'));

-- =============== 4) ⚠️ BORDET FØLGER MED ====================
/* Den fejl, der ville koste mest: gæsten scanner QR-koden på
   bord 7 præcis den dag, trædækket er optaget af et selskab.

   ⚠️ BORDET SKAL FINDES, ellers afvises rækken af
   bestilling_ukendt_bord, og prøven ville sige BESTOD om noget,
   den slet ikke havde målt. Det skete i første udgave. */
/* Nøglen på borde er et UDTRYKS-indeks
   (lokation_id, lower(btrim(nummer))), og on conflict kan ikke
   pege på det med kolonnenavne alene. where not exists er både
   kortere og til at læse. */
insert into public.borde (lokation_id, nummer, pladser, placering, aktiv, sortering)
select 'proev-d', '7', 4, 'ude', true, 10
 where not exists (
   select 1 from public.borde
    where lokation_id = 'proev-d' and lower(btrim(nummer)) = '7');

select pg_temp.svar('4. En QR-bestilling fra et bord afvises, når spis her er lukket',
  not pg_temp.bestil(current_date + 1, '12:00', 'PD-4', 'spis_her', '7'));

select pg_temp.svar('5. Og den går igennem på en dag, hvor spis her er åben',
  pg_temp.bestil(current_date + 2, '12:05', 'PD-5', 'spis_her', '7'));

/* ⚠️ VÆRNET SPØRGER KUN OM hvordan — og det er nok, FORDI skemaet
   binder de to sammen. Holder den binding op, skal værnet spørge
   om bordnummeret igen. Derfor prøves bindingen her. */
do $$
declare gik boolean := true;
begin
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid,
       linjer, antal, hvordan, bord_nummer)
    values ('proev-d', 'PD-5B', 'Gæst', '20304070', current_date + 4, '12:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1, 'afhentning', '7');
  exception when others then gik := false;
  end;
  perform pg_temp.svar(
    '5b. Databasen binder bord og spis her sammen (værnet hviler på den)', not gik);
end $$;

-- =============== 6) EN BOOKET BORDPLADS ====================
/* bordbestillinger er ALTID spis her. Er dagen lukket for det,
   må der ikke kunne bookes bord. */
do $$
declare gik boolean := true;
begin
  begin
    insert into public.bordbestillinger
      (lokation_id, reference, navn, telefon, dato, tid, antal_personer)
    values ('proev-d', 'PD-B1', 'Gæst', '20304050', current_date + 1, '18:00', 4);
  exception when others then gik := false;
  end;
  perform pg_temp.svar('6. Et bord kan ikke bookes, når spis her er lukket', not gik);
end $$;

-- =============== 7) DEN ANDEN VEJ ===========================
select pg_temp.svar('7. Take-away afvises på en dag, der kun er spis her',
  not pg_temp.bestil(current_date + 2, '12:00', 'PD-7', 'afhentning'));

select pg_temp.svar('8. Levering tæller som ud af huset og afvises med',
  not pg_temp.bestil(current_date + 2, '12:00', 'PD-8', 'levering'));

select pg_temp.svar('9. Spis her går igennem den dag',
  pg_temp.bestil(current_date + 2, '12:00', 'PD-9', 'spis_her'));

-- =============== 10) DAGENS EGNE TIDER ======================
/* +3: tidligst 16.00, senest to-go 19.00, senest spis her 20.30. */
select pg_temp.svar('10. Før dagens tidligste afvises',
  not pg_temp.bestil(current_date + 3, '15:30', 'PD-10', 'afhentning'));

select pg_temp.svar('11. Præcis på det tidligste tages imod',
  pg_temp.bestil(current_date + 3, '16:00', 'PD-11', 'afhentning'));

select pg_temp.svar('12. Efter dagens sidste to-go afvises',
  not pg_temp.bestil(current_date + 3, '19:30', 'PD-12', 'afhentning'));

/* ⚠️ DE TO SIDSTE TIDER ER FORSKELLIGE, og det er hele pointen:
   køkkenet pakker take-away til kl. 19, men gæsterne må sidde og
   spise til 20.30. Delte de én tid, kunne man enten ikke sidde
   færdig, eller også blev der pakket mad, mens der blev ryddet. */
select pg_temp.svar('13. Spis her må STADIG kl. 19.30 den dag',
  pg_temp.bestil(current_date + 3, '19:30', 'PD-13', 'spis_her'));

select pg_temp.svar('14. Efter dagens sidste spis her afvises',
  not pg_temp.bestil(current_date + 3, '21:00', 'PD-14', 'spis_her'));

-- =============== 15) GÆSTEN SELV, MED RLS SLÅET TIL =========
/* Prøverne ovenfor kører som ejeren, og han ser alt. Gæsten gør
   ikke: hun kommer ind som rollen anon, og værnets opslag i
   dags_regler er underlagt læsereglerne. Det er DEN vej, en
   rigtig bestilling går.

   ⚠️ Den her prøve er grunden til, at funktionen er security
   definer. Målt på lukkedags-værnet 23/8: uden den så værnet en
   tom tabel og sagde ja til alt. */
do $$
declare gik boolean;
begin
  set local role anon;
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid,
       linjer, antal, hvordan)
    values ('proev-d', 'PD-15', 'Gæst', '20304051', current_date + 1, '12:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1, 'spis_her');
    gik := true;
  exception when others then gik := false;
  end;
  reset role;
  perform pg_temp.svar('15. Gæsten selv afvises på en lukket spis her-dag', not gik);
end $$;

-- =============== 16) VÆRNET STÅR VED EN STRAMMERE REGEL =====
/* Den stille fejl, prøve 15 ikke kan se: værnet virker i dag,
   FORDI dags_regler_laes_alle lukker rækkerne ud til alle.
   Strammes den regel en dag, ville værnet se en tom tabel og sige
   ja til hver eneste lukket dag — uden fejl og uden spor.

   Prøven lægger en strammere regel oven på og prøver igen. Er
   funktionen ikke security definer, FEJLER den her. */
drop policy if exists dags_regler_laes_alle on public.dags_regler;
create policy dags_regler_laes_alle
  on public.dags_regler for select using (false);

do $$
declare gik boolean;
begin
  set local role anon;
  begin
    insert into public.bestillinger
      (lokation_id, reference, navn, telefon, hent_dato, hent_tid,
       linjer, antal, hvordan)
    values ('proev-d', 'PD-16', 'Gæst', '20304052', current_date + 1, '12:00',
            '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1, 'spis_her');
    gik := true;
  exception when others then gik := false;
  end;
  reset role;
  perform pg_temp.svar(
    '16. Værnet holder, også hvis gæsten ikke må læse dagsreglerne', not gik);
end $$;

-- Læsereglen sættes tilbage, så filen kan køres igen.
drop policy if exists dags_regler_laes_alle on public.dags_regler;
create policy dags_regler_laes_alle
  on public.dags_regler for select using (true);

-- =============== 17) GÆSTEN MÅ IKKE SKRIVE I DEM ============
/* Kunne hun det, kunne hun åbne en lukket dag og bestille på den
   bagefter. */
do $$
declare gik boolean;
begin
  set local role anon;
  begin
    insert into public.dags_regler (lokation_id, dato, luk_spis_her)
    values ('proev-d', current_date + 30, false);
    gik := true;
  exception when others then gik := false;
  end;
  reset role;
  perform pg_temp.svar('17. Gæsten kan ikke skrive i dagsreglerne', not gik);
end $$;

-- =============== 18) ÉN DAG, ÉN RÆKKE =======================
/* To rækker om den samme dag ville sige hver sit, og hvilken der
   vandt, ville afhænge af id. */
do $$
declare gik boolean := true;
begin
  begin
    insert into public.dags_regler (lokation_id, dato, luk_spis_her)
    values ('proev-d', current_date + 1, false);
  exception when others then gik := false;
  end;
  perform pg_temp.svar('18. Den samme dag kan ikke få to regelrækker', not gik);
end $$;

-- =============== 19) ⚠️ INGEN PERSONOPLYSNINGER ============
/* Tabellen er offentlig med vilje — gæsten SKAL kunne læse
   dagens regler. Derfor må der aldrig komme en kolonne med et
   navn, et telefonnummer eller en intern bemærkning i den. Samme
   regel som optagne_dage og bord_travlhed.
   Prøven tæller kolonnerne: kommer der en ny, skal nogen se den
   her linje og tage stilling. */
select pg_temp.svar('19. Dagsreglerne har ingen kolonner med persondata', (
  select count(*) = 0 from information_schema.columns
   where table_schema = 'public' and table_name = 'dags_regler'
     and column_name in ('navn', 'telefon', 'email', 'note', 'intern_note')
));

-- =============== RAPPORTEN ==================================
do $$
declare
  r text := coalesce(current_setting('proev.rapport', true), '(ingen prøver kørte)');
  antal int := (length(r) - length(replace(r, E'\n', ''))) ;
  fejl  int := (length(r) - length(replace(r, 'FEJLEDE', ''))) / 7;
begin
  raise exception E'\n\n===== PRØVE AF DAGSREGLERNE =====\n%\n%\n\n(Afbrydelsen her er med vilje: den ruller prøvens data tilbage.)',
    r,
    case when fejl = 0
      then '✅ ALLE ' || antal || ' AF ' || antal || ' BESTOD'
      else '❌ ' || fejl || ' AF ' || antal || ' FEJLEDE' end;
end $$;

rollback;
