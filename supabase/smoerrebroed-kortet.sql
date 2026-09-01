-- ============================================================
--  SMØRREBRØDET EFTER EJERENS TO KORT  (1. september 2026)
-- ============================================================
--  Kortene SMØRREBRØD (hel skive rugbrød) og HÅNDMADDER (halv
--  skive) lister det SAMME 24 slags fyld. Prisen sidder på
--  størrelsen: 55 for en hel skive, 27 for en håndmad.
--
--  Kundens beslutning 31/8 gælder stadig og bliver ENDELIG her:
--  *"alle smørbrødene sælges som de er, ikke noget med valg af
--  brød og derefter pålæg — nej, 1 mad er som 1 mad."*
--  Altså ingen størrelsesvælger og ingen fyldliste: 48 færdige
--  varer, hver med sit navn og sin pris, som resten af de 250.
--
--  ⚠️ DE 24 NAVNE MÅ IKKE VÆRE ENS I DE TO KATEGORIER, og det er
--  ikke smag. Både pris-værnet (`mosede_pris_vaern`) og
--  udsolgt-værnet (`mosede_udsolgt_vaern`) slår op på
--  `lower(btrim(navn))` PÅ TVÆRS af kategorier, og begge afviser
--  kun, når HVER ENESTE række med det navn er væk. To rækker
--  "Flæskesteg med surt" ville betyde:
--
--    · melder køkkenet den HELE skive udsolgt, kan gæsten
--      bestille den alligevel — håndmad-rækken holder navnet i
--      live, og der kommer ingen fejl nogen steder
--    · og køkkenets kort ville sige "3 × Flæskesteg med surt"
--      uden at sige hel eller halv. Det er arret fra 31/8
--      ("3 × Smørrebrød lader køkkenet gætte") i ny forklædning
--
--  Derfor bærer håndmadden suffikset ", håndmad". Redundant under
--  overskriften HÅNDMADDER — og det er netop dét, der gør den
--  utvetydig på en bon.
--
--  ⚠️ KODEN SKAL FØLGE MED. `Butik.smoerrebroed` finder sine
--  kategorier med en regex på NAVNET, og "Håndmadder" indeholder
--  hverken "smørrebrød" eller "fyld". Udvidelsen ligger i
--  js/store.js og har sin egen prøve. Køres SQL'en uden koden,
--  bliver håndmadderne en almindelig kategori, ejeren selv skal
--  åbne for bestilling.
--
--  Kør den EFTER kortets-priser-3.sql i Mosede-projektet.
--  Den kan køres igen: den rører kun de rækker, den nævner.
-- ============================================================

begin;

create temporary table smoer_rapport (nr int, hvad text, resultat text);
truncate smoer_rapport;

-- ------------------------------------------------------------
--  DE 24 SLAGS — kortenes egen rækkefølge, venstre kolonne før
--  højre. Navnene er skrevet med "og" og ikke "&": kortene
--  bruger et typografisk tegn, og de 250 andre varer i basen
--  hedder "med tomat og løg". To skrivemåder for det samme ord
--  er to varer, den dag nogen søger.
-- ------------------------------------------------------------
create temporary table smoer_slags (nr int, navn text);
insert into smoer_slags values
  ( 1, 'Flæskesteg med surt'),
  ( 2, 'Fiskefilet med remoulade'),
  ( 3, 'Fiskefilet med rejer og mayo'),
  ( 4, 'Frikadelle med surt'),
  ( 5, 'Hjemmelavet hønsesalat'),
  ( 6, 'Æggesalat'),
  ( 7, 'Wienersalat med tomat og løg'),
  ( 8, 'Hjemmelavet skinkesalat med tomat og løg'),
  ( 9, 'Leverpostej med surt'),
  (10, 'Dyrlægens natmad'),
  (11, 'Kartoffelmad med mayo, løg og bacon'),
  (12, 'Rullepølse med sky og løg'),
  (13, 'Roastbeef med remoulade og løg'),
  (14, 'Skinke med italiensk salat'),
  (15, 'Skinke med spejlæg'),
  (16, 'Kylling med bacon og karry'),
  (17, 'Spegepølse med sky og løg'),
  (18, 'Spegepølse med remoulade og ristet løg'),
  (19, 'Hvide sild'),
  (20, 'Hvide sild med karry'),
  (21, 'Æggemad med mayo og løg'),
  (22, 'Æggemad med bacon og karry'),
  (23, 'Hakkebøf med bløde løg og spejlæg'),
  (24, 'Ostemad, mild'),
  -- Arket, punkt E: "Tomatmad står på jeres liste, men findes
  -- ikke på siden. Skal den oprettes? Ja — 55 kr."
  -- ⚠️ KUN som hel skive: de 55 er det tal, ejeren skrev, og
  -- kortene har den ikke blandt håndmadderne.
  (25, 'Tomatmad');

-- ------------------------------------------------------------
--  1) HÅNDMADDERNE FÅR DERES EGEN KATEGORI
-- ------------------------------------------------------------
insert into public.menu_kategorier (lokation_id, afdeling, navn, note, sortering)
select 'mosede', 'mad', 'Håndmadder',
       'Halv skive hjemmebagt rugbrød med smør — den lille sultne udgave, '
       || 'smurt når du bestiller. Glutenfrit brød eller uden smør, bare sig til.', 7
where not exists (
  select 1 from public.menu_kategorier
   where lokation_id = 'mosede' and navn = 'Håndmadder');

/* Kortets egen manchet på den hele skive — ejeren har skrevet
   den, så den skal ikke findes på af os. */
update public.menu_kategorier
   set note = 'Hel skive hjemmebagt rugbrød med smør, smurt når du bestiller. '
              || 'Glutenfrit brød eller uden smør — bare sig til. '
              || 'Tartar bestilles dagen før.'
 where lokation_id = 'mosede' and navn = 'Smørrebrød' and note is null;

-- ------------------------------------------------------------
--  2) DE 48 VARER
-- ------------------------------------------------------------
create temporary table smoer_nye (kat text, navn text, pris numeric, sort int);

--  Hel skive: alle 25 (de 24 + tomatmaden) til 55.
insert into smoer_nye
select 'Smørrebrød', navn, 55, nr from smoer_slags;

--  Håndmad: de 24 fra kortet til 27. Tomatmaden er IKKE med —
--  ejeren gav kun den ene pris, og et gæt på de 27 ville være et
--  tal, vi selv havde fundet på.
--
--  ⚠️ SORTERINGEN BEGYNDER PÅ 100, OG DET ER MÅLT. Forsidens
--  bestilling grupperer efter VARENS sorteringstal og ikke efter
--  kategoriens — så med 1..24 begge steder afgjorde tilfældet
--  rækkefølgen, og et skud på en iPhone 13 viste HÅNDMADDER
--  øverst med den hele skive under. Gæsten skal møde de 55 først;
--  det er dem, kortet hedder efter. På bestil/ har det ingen
--  betydning: dér kommer rækkefølgen fra kategoriens eget tal.
insert into smoer_nye
select 'Håndmadder', navn || ', håndmad', 27, 100 + nr from smoer_slags where nr <= 24;

with r as (
  insert into public.menu_varer (kategori_id, navn, pris, sortering)
  select k.id, n.navn, n.pris, n.sort
    from smoer_nye n
    join public.menu_kategorier k
      on k.navn = n.kat and k.lokation_id = 'mosede'
   where not exists (
     select 1 from public.menu_varer v
      where v.kategori_id = k.id
        and lower(btrim(v.navn)) = lower(btrim(n.navn)))
  returning navn)
insert into smoer_rapport
select 1, 'Smørrebrød og håndmadder oprettet',
       count(*) || ' af ' || (select count(*) from smoer_nye) from r;

-- ------------------------------------------------------------
--  3) DE TRE MED EGEN PRIS — kortenes nederste kasse
--     Rejemad 85 og tartar 99 laves KUN på hel skive; det står
--     ordret på håndmadskortet ("REJEMAD & TARTAR — se kort").
--     De findes i forvejen og skal bare stå til sidst.
-- ------------------------------------------------------------
with r as (
  update public.menu_varer v set sortering = x.sort
    from (values ('Rejemad med mayo og citron', 30),
                 ('Tartar', 31),
                 ('Æbleflæsk', 32)) as x(navn, sort),
         public.menu_kategorier k
   where k.navn = 'Smørrebrød' and k.lokation_id = 'mosede'
     and v.kategori_id = k.id and v.navn = x.navn
     and v.sortering is distinct from x.sort
  returning v.navn)
insert into smoer_rapport
select 2, 'De tre med egen pris flyttet nederst', count(*) || ' af 3' from r;

-- ------------------------------------------------------------
--  4) DEN GAMLE MODEL SLUKKES
--     ⚠️ SLUKKET, ALDRIG SLETTET. Rækkerne kan tændes igen i
--     admin, og de bærer ejerens egne beskrivelser.
-- ------------------------------------------------------------
with r as (
  update public.menu_kategorier set aktiv = false
   where lokation_id = 'mosede' and navn = 'Vælg fyld til smørrebrødet' and aktiv
  returning navn)
insert into smoer_rapport
select 3, 'Fyldlisten slukket (modellen faldt 31/8)', count(*) || ' kategori' from r;

/* De to GENERISKE rækker. De var hele modellen: ét "Smørrebrød"
   til 55 og én "Håndmad" til 27, og så valgte gæsten fyld
   ovenpå. Nu er der 24 navngivne af hver, og bliver de to
   stående, kan gæsten bestille "Smørrebrød" uden at sige hvad —
   og køkkenet har ingen at spørge. */
create temporary table smoer_sluk (kat text, navn text, hvorfor text);
insert into smoer_sluk values
  ('Smørrebrød', 'Smørrebrød',  'erstattet af de 24 navngivne à 55'),
  ('Smørrebrød', 'Håndmad',     'erstattet af de 24 navngivne à 27'),
  -- Retter duplikerede smørrebrødskortet. Resten røg med
  -- kortets-priser-3.sql; de to sidste hører til her.
  ('Retter', 'Smørrebrød',  'dublet af kategorien Smørrebrød'),
  ('Retter', 'Håndmadder',  'dublet af kategorien Håndmadder');

with r as (
  update public.menu_varer v set aktiv = false
    from smoer_sluk s
    join public.menu_kategorier k
      on k.navn = s.kat and k.lokation_id = 'mosede'
   where v.kategori_id = k.id and v.navn = s.navn and v.aktiv
  returning v.navn)
insert into smoer_rapport
select 4, 'De generiske rækker slukket',
       count(*) || ' af ' || (select count(*) from smoer_sluk) from r;

-- ------------------------------------------------------------
--  5) RAPPORTEN
-- ------------------------------------------------------------
insert into smoer_rapport
select 10, 'Smørrebrød (hel skive) på kortet', count(*) || ' stk.'
  from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
 where k.navn = 'Smørrebrød' and k.lokation_id = 'mosede' and v.aktiv;

insert into smoer_rapport
select 11, 'Håndmadder (halv skive) på kortet', count(*) || ' stk.'
  from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
 where k.navn = 'Håndmadder' and k.lokation_id = 'mosede' and v.aktiv;

insert into smoer_rapport
select 12, 'Varer UDEN pris tilbage i hele menuen', count(*) || ' stk.'
  from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
 where k.lokation_id = 'mosede' and v.pris is null and v.aktiv and k.aktiv;

/* ⚠️ HVAD FORSVANDT FRA FYLDLISTEN? Fjorten af de 32 gamle
   fyldnavne står ikke på ejerens trykte kort. De er ikke
   slettet, men de er ude af syne — og det skal han kunne SE, i
   stedet for at opdage det, når en gæst spørger efter
   makrelsalat. */
insert into smoer_rapport
select 20, '❓ Stod i fyldlisten, men ikke på kortet: ' || v.navn,
       'tændes igen i admin, hvis den stadig laves'
  from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
 where k.navn = 'Vælg fyld til smørrebrødet' and k.lokation_id = 'mosede'
   and lower(btrim(v.navn)) not in (select lower(btrim(navn)) from smoer_slags);

/* Dubletvagten igen — filen opretter 49 rækker, og pris- og
   udsolgt-værnet dømmer på NAVNET. */
insert into smoer_rapport
select 30, '⚠️ DUBLET: "' || navn || '"',
       string_agg(kat || ' ' || coalesce(pris::text, 'uden pris'), ' + ' order by kat)
  from (select lower(btrim(v.navn)) as navn, k.navn as kat, v.pris
          from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
         where k.lokation_id = 'mosede' and v.aktiv and k.aktiv) d
 group by navn having count(*) > 1;

commit;

select nr, hvad, resultat from smoer_rapport order by nr, hvad;
