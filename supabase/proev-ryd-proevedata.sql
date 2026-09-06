-- ============================================================
--  PRØVE: RYDDER OPRYDNINGEN DET RIGTIGE — OG KUN DET?
--  (6. september 2026)
-- ============================================================
--  Kør EFTER supabase/ryd-proevedata.sql er skrevet, men den
--  prøver filens REGLER og ikke filen selv: den gentager
--  opdateringerne med sin egen skæringsdato, så prøven kan lægge
--  sine egne rækker ind og se, hvad der sker med dem.
--
--  ⚠️ DEN RULLER ALT TILBAGE TIL SIDST. Som alle 46 andre
--  proev-filer: `rollback`, så der ikke ligger en eneste række
--  bagefter. Det er derfor, de kan køres i produktionen.
--
--  ⚠️ OG DEN LÅNER IKKE EJERENS DATA. Egen forretning, egne
--  borde, egne varenavne, og dagen og tiden læses af
--  åbningstiderne. Det er læren fra de tre fald 1.-2. september:
--  en prøve, der bruger ejerens dag, hans vare eller hans borde,
--  arver alt hvad der står på dem — fjorten udløsere kan sige nej
--  af en helt anden grund end den, prøven handler om.
-- ============================================================

begin;

-- ------------------------------------------------------------
--  KULISSEN
-- ------------------------------------------------------------
insert into public.lokationer (id, navn, adresse, postnr, by, telefon, aktiv)
values ('proeveryd', 'Prøveforretning', 'Prøvevej 1', '2670', 'Greve', '11223344', true)
on conflict (id) do nothing;

-- ⚠️ ÅBNINGSTIDER PÅ ALLE SYV DAGE. Uden dem afviser
--    mosede_dag_aaben hver eneste indsættelse, og prøven ville
--    falde på noget helt andet end oprydningen.
insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker)
select 'proeveryd', g, false, '08:00', '22:00' from generate_series(0, 6) g
on conflict do nothing;

do $$
begin
  if not exists (select 1 from public.aabningstider where lokation_id = 'proeveryd') then
    raise exception 'Kulissen blev ikke bygget — prøven ville måle ingenting.';
  end if;
end $$;

-- ------------------------------------------------------------
--  RÆKKERNE
--  ------------------------------------------------------------
--  Skæringsdatoen i prøven er i dag. Alt dateret I GÅR er
--  "byggeperioden"; alt dateret I DAG eller senere er "driften".
--
--  ⚠️ VARENAVNET KAN IKKE STÅ PÅ ET MENUKORT. mosede_pris_vaern,
--  mosede_udsolgt_vaern og mosede_kategori_dag_vaern slår alle
--  tre op på navnet og rører kun navne, der FINDES — så et navn,
--  ingen kan have, går fri af alle tre.
-- ------------------------------------------------------------
insert into public.bestillinger
  (lokation_id, reference, navn, telefon, hent_dato, hent_tid, antal, linjer, status)
values
  ('proeveryd', 'PR-GAMMEL-1', 'Prøve fra byggeperioden', '11111111',
   current_date - 1, '12:00', 1,
   '[{"navn":"ZZZ prøvevare","antal":1,"pris":10}]'::jsonb, 'afhentet'),
  ('proeveryd', 'PR-NY-1', 'Rigtig gæst', '22222222',
   current_date, '12:00', 1,
   '[{"navn":"ZZZ prøvevare","antal":1,"pris":10}]'::jsonb, 'ny'),
  ('proeveryd', 'PR-ALLEREDE-SLETTET', 'Slettet i forvejen', '33333333',
   current_date - 1, '13:00', 1,
   '[{"navn":"ZZZ prøvevare","antal":1,"pris":10}]'::jsonb, 'afhentet');

update public.bestillinger set slettet = timestamptz '2020-01-01 00:00+00'
 where lokation_id = 'proeveryd' and reference = 'PR-ALLEREDE-SLETTET';

insert into public.forespoergsler
  (lokation_id, reference, type, navn, telefon, email, besked, oprettet)
values
  ('proeveryd', 'PR-FO-GAMMEL', 'selskab', 'Prøve', '11111111',
   'a@b.dk', 'byggeperioden', now() - interval '3 days'),
  ('proeveryd', 'PR-FO-NY', 'selskab', 'Rigtig', '22222222',
   'c@d.dk', 'driften', now());

-- ------------------------------------------------------------
--  EN ANDEN FORRETNING MED SIN EGEN GAMLE RÆKKE
--  ------------------------------------------------------------
--  ⚠️ UDEN DEN MÅLER PRØVE 8 TOMHED. Falsifikationen afslørede
--  det: fjernes `lokation_id` fra opdateringen, bestod prøven
--  alligevel — for der var ingen andre bestillinger i basen at
--  ramme. Det er 2/9-arret fra roller.sql ("en prøve på en tom
--  tabel måler tomhed") i en ny forklædning.
--
--  Rækken er dateret I GÅR, altså inde i det, oprydningen ellers
--  ville tage. Overlever den, er det fordi lokation_id holder.
-- ------------------------------------------------------------
insert into public.lokationer (id, navn, adresse, postnr, by, telefon, aktiv)
values ('proeveryd2', 'Naboen', 'Naboevej 2', '2670', 'Greve', '99887766', true)
on conflict (id) do nothing;

insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker)
select 'proeveryd2', g, false, '08:00', '22:00' from generate_series(0, 6) g
on conflict do nothing;

insert into public.bestillinger
  (lokation_id, reference, navn, telefon, hent_dato, hent_tid, antal, linjer, status)
values
  ('proeveryd2', 'PR-NABO-GAMMEL', 'Naboens gæst', '44444444',
   current_date - 1, '12:00', 1,
   '[{"navn":"ZZZ prøvevare","antal":1,"pris":10}]'::jsonb, 'afhentet');

-- ------------------------------------------------------------
--  OPSÆTNINGEN TÆLLES FØR
--  ------------------------------------------------------------
--  ⚠️ FØRSTE UDGAVE AF PRØVE 7 VAR VACUØS: den spurgte
--  `count(*) = (select count(*) from menu_varer) from menu_varer`
--  — altså det samme tal mod sig selv. Den kunne ALDRIG fejle,
--  heller ikke hvis oprydningen tømte hele kortet. Nu kommer det
--  ene tal UDEFRA: fra før filen kørte.
--
--  Og det er ikke kun menukortet. Alt det, ejeren har bygget op,
--  tælles: varer, kategorier, åbningstider, borde, indstillinger,
--  kalender, nyheder og dagens retter.
-- ------------------------------------------------------------
create temporary table proeve_opsaetning on commit drop as
select 'menu_varer' as tabel, count(*) as antal from public.menu_varer
union all select 'menu_kategorier', count(*) from public.menu_kategorier
union all select 'aabningstider',   count(*) from public.aabningstider
union all select 'borde',           count(*) from public.borde
union all select 'indstillinger',   count(*) from public.indstillinger
union all select 'kalender',        count(*) from public.kalender
union all select 'nyheder',         count(*) from public.nyheder
union all select 'dagens_retter',   count(*) from public.dagens_retter
union all select 'lokationer',      count(*) from public.lokationer;

-- ------------------------------------------------------------
--  OPRYDNINGENS EGNE SÆTNINGER, med prøvens skæringsdato
-- ------------------------------------------------------------
create temporary table proeve_skaering on commit drop as
select current_date as foer;

update public.bestillinger set slettet = now()
 where lokation_id = 'proeveryd' and slettet is null
   and hent_dato < (select foer from proeve_skaering);

update public.forespoergsler set slettet = now()
 where lokation_id = 'proeveryd' and slettet is null
   and oprettet < (select foer from proeve_skaering);

update public.bestillingsnumre set naeste = 0
 where lokation_id = 'proeveryd'
   and not exists (select 1 from public.bestillinger
                    where lokation_id = 'proeveryd' and slettet is null);

-- ============================================================
--  RAPPORTEN
-- ============================================================
select nr, hvad,
       case when ok then 'BESTOD' else 'FEJLEDE' end as svar
from (
  select 1 as nr, 'Byggeperiodens bestilling ligger i skraldespanden' as hvad,
    (select slettet is not null from public.bestillinger
      where lokation_id = 'proeveryd' and reference = 'PR-GAMMEL-1') as ok

  union all select 2, 'Den rigtige gæsts bestilling står URØRT',
    (select slettet is null from public.bestillinger
      where lokation_id = 'proeveryd' and reference = 'PR-NY-1')

  -- ⚠️ DEN VIGTIGSTE. Kan filen køres igen uden at flytte datoen
  --    på noget, personalet selv har slettet? Uden `slettet is
  --    null` i where-delen ville tidsstemplet blive skrevet om,
  --    og de 30 dage i skraldespanden begyndte forfra.
  union all select 3, 'En allerede slettet række får IKKE ny slettet-dato',
    (select slettet = timestamptz '2020-01-01 00:00+00' from public.bestillinger
      where lokation_id = 'proeveryd' and reference = 'PR-ALLEREDE-SLETTET')

  union all select 4, 'Byggeperiodens forespørgsel ligger i skraldespanden',
    (select slettet is not null from public.forespoergsler
      where lokation_id = 'proeveryd' and reference = 'PR-FO-GAMMEL')

  union all select 5, 'Dagens forespørgsel står URØRT',
    (select slettet is null from public.forespoergsler
      where lokation_id = 'proeveryd' and reference = 'PR-FO-NY')

  -- ⚠️ MODSTYKKET TIL NULSTILLINGEN. Der ER en levende
  --    bestilling tilbage (PR-NY-1), så tælleren må IKKE sættes
  --    til 0 — ellers ville den næste gæst få det nummer, hun
  --    allerede har. Uden den her prøve ville en nulstilling
  --    uden betingelse bestå alt andet.
  union all select 6, 'Tælleren nulstilles IKKE, når der er levende rækker',
    (select coalesce((select naeste from public.bestillingsnumre
                       where lokation_id = 'proeveryd'), 0) > 0)

  -- ⚠️ ÉT AF TALLENE KOMMER UDEFRA: fra før oprydningen kørte.
  --    Se noten ved proeve_opsaetning — den her prøve var vacuøs
  --    i sin første udgave og kunne ikke fejle.
  union all select 7, 'Hele opsætningen er urørt (9 tabeller)',
    (select not exists (
       select 1 from proeve_opsaetning f
        join (
          select 'menu_varer' as tabel, count(*) as antal from public.menu_varer
          union all select 'menu_kategorier', count(*) from public.menu_kategorier
          union all select 'aabningstider',   count(*) from public.aabningstider
          union all select 'borde',           count(*) from public.borde
          union all select 'indstillinger',   count(*) from public.indstillinger
          union all select 'kalender',        count(*) from public.kalender
          union all select 'nyheder',         count(*) from public.nyheder
          union all select 'dagens_retter',   count(*) from public.dagens_retter
          union all select 'lokationer',      count(*) from public.lokationer
        ) n on n.tabel = f.tabel
       where n.antal <> f.antal))

  -- ⚠️ OG ANDRE FORRETNINGER RØRES ALDRIG. Oprydningen har
  --    `lokation_id = 'mosede'` i hver eneste sætning; uden den
  --    ville en flerlejer-database få hver eneste kundes
  --    bestillinger ryddet af én fil.
  union all select 8, 'En ANDEN forretnings gamle række er URØRT',
    (select slettet is null from public.bestillinger
      where lokation_id = 'proeveryd2' and reference = 'PR-NABO-GAMMEL')
) t order by nr;

-- Hvor mange bestod?
select count(*) filter (where ok) || ' AF ' || count(*) || ' BESTOD' as resultat
from (
  select (select slettet is not null from public.bestillinger
           where lokation_id = 'proeveryd' and reference = 'PR-GAMMEL-1') as ok
  union all select (select slettet is null from public.bestillinger
           where lokation_id = 'proeveryd' and reference = 'PR-NY-1')
  union all select (select slettet = timestamptz '2020-01-01 00:00+00'
           from public.bestillinger
           where lokation_id = 'proeveryd' and reference = 'PR-ALLEREDE-SLETTET')
  union all select (select slettet is not null from public.forespoergsler
           where lokation_id = 'proeveryd' and reference = 'PR-FO-GAMMEL')
  union all select (select slettet is null from public.forespoergsler
           where lokation_id = 'proeveryd' and reference = 'PR-FO-NY')
  union all select (select coalesce((select naeste from public.bestillingsnumre
                       where lokation_id = 'proeveryd'), 0) > 0)
  union all select (select not exists (
       select 1 from proeve_opsaetning f
        join (
          select 'menu_varer' as tabel, count(*) as antal from public.menu_varer
          union all select 'menu_kategorier', count(*) from public.menu_kategorier
          union all select 'aabningstider',   count(*) from public.aabningstider
          union all select 'borde',           count(*) from public.borde
          union all select 'indstillinger',   count(*) from public.indstillinger
          union all select 'kalender',        count(*) from public.kalender
          union all select 'nyheder',         count(*) from public.nyheder
          union all select 'dagens_retter',   count(*) from public.dagens_retter
          union all select 'lokationer',      count(*) from public.lokationer
        ) n on n.tabel = f.tabel
       where n.antal <> f.antal))
  union all select (select slettet is null from public.bestillinger
           where lokation_id = 'proeveryd2' and reference = 'PR-NABO-GAMMEL')
) x;

rollback;
