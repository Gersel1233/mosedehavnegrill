-- ============================================================
--  SLUK DET, KORTENE IKKE VISER — 26. SEPTEMBER 2026
-- ============================================================
--  Mikkels ord: *"følg menukortene, det er alt — de skal slukkes,
--  hvis ikke de er på menukortene."*
--
--  Listen er IKKE skrevet af i hånden. Den er afsnit B i
--  `vaerktoej/sammenlign-kort.py` — "varer i databasen, som intet
--  kort viser" — kørt mod produktionen 25/9 med anon-nøglen, efter
--  at kortenes-huller-25-9.sql og glutenfri-vaffel-samme-pris.sql
--  var kørt. 30 varer. En liste, der skrives af, er en liste, der
--  glemmer én.
--
--  ⚠️ DEN SLUKKER, DEN SLETTER IKKE. `aktiv = false` er det samme
--  som at fjerne fluebenet "Vis" i admin: varen forsvinder fra
--  siden, men står i admin → Menukort under "Skjult" og kan tændes
--  igen med ét tryk. Gamle bestillinger røres ikke — de bærer
--  varens navn på linjen, ikke en henvisning til rækken.
--
--  ⚠️ CATERINGEN ER MED VILJE IKKE MED. Tapasfad, platter, sliders,
--  reception og pindemad og tilkøb ud af huset står ikke på lugens
--  kort, fordi de sælges som selskab (mindst 10 personer). De er
--  sprunget over i rapporten (CATERING i sammenlign-kort.py), og
--  derfor også her. Det samme gælder "Tilkøb morgenmad", som
--  kortet viser som ÉN samlelinje ("Æg, bacon, pålæg … 10,-").
--
--  ⚠️ ISPINDENE BLIVER EN TOM KATEGORI — og det er i orden. Alle
--  11 står på listen, fordi ingen af de ti kort viser dem.
--  Kategorien slukkes ikke; siden springer en kategori uden aktive
--  varer over (js/skal/menukort.js: `if (!varer.length) return;`),
--  og i admin står den klar, hvis fryseren skal på kortet igen.
--
--  ⚠️ MATCHER PÅ NAVN, ALDRIG PÅ ID, og kan køres igen: den rører
--  kun rækker, der stadig er tændt.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================

begin;

/* ⚠️ IKKE "on commit drop" — rapporten nederst skal LÆSE listen
   efter commit. Arret står i kortets-priser-2.sql. */
create temporary table sluk_liste (kategori text, navn text);
truncate sluk_liste;
insert into sluk_liste values
  ('Sandwich', 'Bøfsandwich'),
  ('Smørrebrød', 'Hjemmelavet Hønsesalat'),
  ('Smørrebrød', 'Hjemmelavet Æggesalat'),
  ('Smørrebrød', 'Hjemmelavet Wienersalat'),
  ('Smørrebrød', 'Hjemmelavet Skinkesalat'),
  ('Smørrebrød', 'Æggemad med bacon og karry'),
  ('Smørrebrød', 'Tomatmad'),
  ('Håndmadder', 'Fiskefilet med rejer og mayo, håndmad'),
  ('Håndmadder', 'Hjemmelavet hønsesalat, håndmad'),
  ('Håndmadder', 'Hjemmelavet Æggesalat, håndmad'),
  ('Håndmadder', 'Hjemmelavet Wienersalat med tomat og løg, håndmad'),
  ('Håndmadder', 'Hjemmelavet skinkesalat med tomat og løg, håndmad'),
  ('Håndmadder', 'Æggemad med bacon og karry, håndmad'),
  ('Kugleis', 'Mosede Isen'),
  ('Ispinde', 'Excellence, chokolade og brombær'),
  ('Ispinde', 'Excellence, chokolade og mandel'),
  ('Ispinde', 'Maxibon'),
  ('Ispinde', 'Ternet Ninja'),
  ('Ispinde', 'Raketis med drys'),
  ('Ispinde', '50''eren'),
  ('Ispinde', 'Vandmelon'),
  ('Ispinde', 'Isbjørn, gul'),
  ('Ispinde', 'Isbjørn, pink'),
  ('Ispinde', 'Star-is'),
  ('Ispinde', 'Sort/hvid is'),
  ('Morgenmad', 'Brunchtallerken'),
  ('Tillæg: glutenfri, laktosefri og vegansk', 'Laktosefri (tillæg)'),
  ('Tillæg: glutenfri, laktosefri og vegansk', 'Vegansk (tillæg)'),
  ('Kaffe og varme drikke', 'Kaffe og pandekage'),
  ('Sodavand, juice og kakao', 'Dåse eller flaske sodavand');

update public.menu_varer mv
   set aktiv = false
  from sluk_liste s, public.menu_kategorier mk
 where mk.id = mv.kategori_id
   and mk.lokation_id = 'mosede'
   and lower(btrim(mk.navn)) = lower(btrim(s.kategori))
   and lower(btrim(mv.navn)) = lower(btrim(s.navn))
   and mv.aktiv is distinct from false;

commit;


-- ------------------------------------------------------------
--  RAPPORT. Supabases SQL Editor viser kun den SIDSTE sætnings
--  svar — derfor ét select til sidst.
--
--  `fundet` skal være 30: hver linje på listen skal ramme en
--  vare. Er tallet lavere, har nogen omdøbt en vare siden målingen,
--  og så står den stadig tændt — navnene i `ikke_fundet` siger
--  hvilke. `stadig_taendt` SKAL være 0.
--
--  ⚠️ `raekker_slukket` TÆLLER RÆKKER, IKKE NAVNE. Målt 25/9 på en
--  lokal Postgres: én linje på listen ramte TO rækker ("Hjemmelavet
--  hønsesalat" og "Hjemmelavet Hønsesalat" i samme kategori), og
--  psql sagde `UPDATE 31` — men SQL Editoren viser kun den sidste
--  sætnings svar, så det tal ville ingen nogensinde se. Er
--  `raekker_slukket` højere end `fundet`, står den samme vare to
--  gange, og begge er slukket. Det er rigtigt; det skal bare kunne
--  ses. I produktionen var der ingen dubletter blandt de 30.
-- ------------------------------------------------------------
select
  (select count(*) from sluk_liste)                        as paa_listen,
  (select count(*) from public.menu_varer mv
     join public.menu_kategorier mk on mk.id = mv.kategori_id
     join sluk_liste s on lower(btrim(mk.navn)) = lower(btrim(s.kategori))
                      and lower(btrim(mv.navn)) = lower(btrim(s.navn))
    where mk.lokation_id = 'mosede' and mv.aktiv = false)  as raekker_slukket,
  (select count(*) from sluk_liste s
     where exists (select 1 from public.menu_varer mv
                     join public.menu_kategorier mk on mk.id = mv.kategori_id
                    where mk.lokation_id = 'mosede'
                      and lower(btrim(mk.navn)) = lower(btrim(s.kategori))
                      and lower(btrim(mv.navn)) = lower(btrim(s.navn))))
                                                           as fundet,
  (select count(*) from sluk_liste s
     where exists (select 1 from public.menu_varer mv
                     join public.menu_kategorier mk on mk.id = mv.kategori_id
                    where mk.lokation_id = 'mosede'
                      and lower(btrim(mk.navn)) = lower(btrim(s.kategori))
                      and lower(btrim(mv.navn)) = lower(btrim(s.navn))
                      and mv.aktiv))                       as stadig_taendt_skal_vaere_0,
  (select coalesce(string_agg(s.navn, ', '), '—') from sluk_liste s
     where not exists (select 1 from public.menu_varer mv
                         join public.menu_kategorier mk on mk.id = mv.kategori_id
                        where mk.lokation_id = 'mosede'
                          and lower(btrim(mk.navn)) = lower(btrim(s.kategori))
                          and lower(btrim(mv.navn)) = lower(btrim(s.navn))))
                                                           as ikke_fundet;
