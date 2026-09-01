-- ============================================================
--  EJERENS SYV KORT + SVARARKET — HELE MENUEN ÅBNES
--  (1. september 2026)
-- ============================================================
--  30/8 kom fem af kortene, og `kortets-priser-2.sql` satte de
--  priser, de nævnte. 1/9 kom de sidste to kort (KAFFE, KOLDT &
--  KNAS og ØL, VIN & BAR) OG ejerens håndskrevne svar på de seks
--  sider, vi sendte ham 27/8.
--
--  Dermed er hele menuen dækket, og filen her lukker hullet:
--  110 varer stod uden pris, og en vare uden pris kan ses, men
--  ikke bestilles (pris-værnet fra 26/8).
--
--  ⚠️ FILEN MATCHER PÅ NAVN, ALDRIG PÅ ID.
--  `kortets-priser-2.sql` skrev `kategori_id = 31`. De id'er
--  gjaldt produktionens rækkefølge; bygges de samme filer op i
--  en tom database, får "Tilkøb morgenmad" id 20 i stedet — og
--  så rammer linjen en HELT anden kategori uden at fejle. Det
--  blev målt 1/9 på en lokal Postgres 16. Her slås kategorien op
--  på sit navn, så filen siger det samme i begge databaser.
--
--  ⚠️ TRE SLAGS ÆNDRINGER, HVER MED SIN RAPPORTLINJE:
--    · sætter en pris, hvor der INGEN er (langt de fleste)
--    · OVERSKRIVER en pris — kun de otte, ejeren har rettet
--    · opretter en vare, kortet har og databasen mangler
--  Og en fjerde: dubletter deaktiveres (aldrig slettet, så de
--  kan tændes igen i admin).
--
--  ⚠️ SMØRREBRØDET ER IKKE MED HER. De 24 slags × hel/halv skive
--  er sin egen fil (`smoerrebroed-kortet.sql`), fordi den skal
--  deaktivere den gamle fyldliste, og to store ændringer i én
--  transaktion er to ting, man ikke kan skille ad, når noget
--  går galt.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
--  Den kan køres igen: den rører kun de rækker, den nævner.
-- ============================================================

begin;

/* ⚠️ IKKE "on commit drop" — rapporten skal LÆSES efter commit.
   Arret står i kortets-priser-2.sql. */
create temporary table kort3_rapport (
  nr       int,
  hvad     text,
  resultat text
);
truncate kort3_rapport;

-- ------------------------------------------------------------
--  ET STED AT SLÅ (kategori, vare) OP PÅ NAVN
-- ------------------------------------------------------------
create temporary view k3_varer as
select v.id, v.navn as vare, v.pris, v.aktiv, k.navn as kat, k.lokation_id
  from public.menu_varer v
  join public.menu_kategorier k on k.id = v.kategori_id;

-- ============================================================
--  1) PRISER, HVOR DER INGEN VAR
-- ============================================================
create temporary table k3_pris (kat text, vare text, pris numeric);
insert into k3_pris (kat, vare, pris) values
  -- ---- Kort 1, MENUKORT FRA GRILLEN -------------------------
  ('Morgenmad', 'Franskbrød med pålæg', 35),      -- svararket, B
  ('Morgenmad', 'Brunchtallerken',        349),     -- = brunchplatten, bekræftet 1/9

  -- ---- Kort 2, BURGERE, PØLSER & PLADE ----------------------
  ('Burgere og sandwich', 'Bearnaiseburger',    90),   -- svararket, B
  ('Burgere og sandwich', 'Chilinaiseburger',   90),
  ('Burgere og sandwich', 'Flæskestegsburger',  80),
  ('Burgere og sandwich', 'Frikadelleburger',   80),

  -- ---- Kort 5, IS & DRIKKEVARER -----------------------------
  ('Kugleis og ishorn', '4 kugler', 65),               -- bekræftet "Ja" på arket
  ('Softice og vafler', 'Bæger med vaffelknas, softice og topping', 40),

  -- ---- Kort 6, KAFFE, KOLDT & KNAS --------------------------
  ('Kaffe og varme drikke', 'Iskugle i kaffen',      35),
  ('Kaffe og varme drikke', 'Gammeldags æblekage',   35),

  -- ---- Svararket, catering ----------------------------------
  --  Tapasfadet ER platten til 1 person: 179 kr. pr. person,
  --  mindst 1 person (ejeren 1/9). Prisen pr. person står i
  --  admin; her er varens egen pris.
  ('Tapasfad', 'Tapasfad',                             179),
  ('Platter',  'Brunchplatte til 2 personer',          349),

  --  Tilkøb ud af huset — ejerens egne tal, "pr. portion"
  ('Tilkøb ud af huset', 'Hjemmelavede mini-frikadeller', 25),
  ('Tilkøb ud af huset', 'Hjemmelavet flæskesvær',        35),
  ('Tilkøb ud af huset', 'Mini-burgere',                   40),
  ('Tilkøb ud af huset', 'Mini-kyllingeburgere',           40),
  ('Tilkøb ud af huset', 'Mini-fiskeburgere',              40),
  ('Tilkøb ud af huset', 'Mini-vegetarburgere',            40),
  ('Tilkøb ud af huset', 'Blandede salater',               40),
  ('Tilkøb ud af huset', 'Pastasalat',                     50),
  ('Tilkøb ud af huset', 'Råkost',                         40),
  ('Tilkøb ud af huset', 'Frugtfad',                       40),
  ('Tilkøb ud af huset', 'Frugtsalat',                     40),
  ('Tilkøb ud af huset', 'Vaniljecreme',                   10),
  ('Tilkøb ud af huset', 'Vanilje- og jordbærsoftice',     35),
  ('Tilkøb ud af huset', 'Chips',                          20),
  ('Tilkøb ud af huset', 'Popcorn',                        20),
  ('Tilkøb ud af huset', 'Milkshake',                      59),
  ('Tilkøb ud af huset', 'Smoothie',                       59),
  ('Tilkøb ud af huset', 'Slikposer',                      20),

  -- ---- SIKKERHEDSNET UNDER kortets-priser-2.sql -------------
  --  ⚠️ De tre her SATTE den fil allerede — men på `kategori_id`
  --  (10 og 12). Ramte de id'er en anden kategori i
  --  produktionen, end de gjorde, da filen blev skrevet, er
  --  prisen aldrig blevet sat, og INGEN ville have opdaget det:
  --  varen står bare stadig uden pris. Her sættes de på navn.
  --  Er de sat i forvejen, rører linjerne dem ikke (`pris is
  --  null`), så det koster ingenting at have dem med.
  ('Sandwich og retter fra pladen', 'Hjemmelavet lun frikadelle', 25),
  ('Pølser', 'Ristet pølse med bacon',  35),
  ('Pølser', 'Frankfurter med bacon',   45);

with r as (
  update public.menu_varer v set pris = p.pris
    from k3_pris p
    join public.menu_kategorier k on k.navn = p.kat
   where v.kategori_id = k.id and v.navn = p.vare and v.pris is null
  returning v.navn)
insert into kort3_rapport
select 1, 'Priser sat (var tomme)',
       count(*) || ' af ' || (select count(*) from k3_pris) from r;

-- ============================================================
--  2) HELE KATEGORIER TIL ÉN PRIS
--     Ejerens ark giver ÉN pris for hele listen, og så er en
--     linje pr. vare tolv chancer for en tastefejl.
-- ============================================================
create temporary table k3_katpris (kat text, pris numeric);
insert into k3_katpris values
  ('Sliders',               40),   -- arket: "Samme pris pr. stk.? 40 kr. Ja"
  ('Reception og pindemad', 50),   -- arket: "50 kr., 4-6 stk pr. person"
  ('Tilkøb morgenmad',      10);   -- kort 1: "Æg, bacon, pålæg … m.m. 10,-"

with r as (
  update public.menu_varer v set pris = kp.pris
    from k3_katpris kp
    join public.menu_kategorier k on k.navn = kp.kat
   where v.kategori_id = k.id and v.pris is null
  returning v.navn)
insert into kort3_rapport
select 2, 'Hele kategorier sat (Sliders 40 · Pindemad 50 · Tilkøb morgenmad 10)',
       count(*) || ' varer' from r;

-- ============================================================
--  3) OTTE PRISER, DER BLIVER OVERSKREVET
--     ⚠️ DE ENESTE LINJER I FILEN, DER RØRER ET TAL, DER ALLEREDE
--     STÅR DER. Hver af dem er bekræftet på skrift af ejeren.
-- ============================================================
create temporary table k3_ret (kat text, vare text, pris numeric, hvorfor text);
insert into k3_ret values
  -- Arket, punkt F: kortene sagde 95 og 99. Ejeren ringede 99 ind.
  ('Retter',      'Tatarmad', 99, 'arket F: tartaren er 99, ikke 95'),
  ('Smørrebrød', 'Tartar',   99, 'arket F: tartaren er 99, ikke 95'),
  -- Ejeren 1/9: "det er forældet, den er 179 kr. og minimum
  -- 1 person". Grillkortets 189 gælder ikke længere.
  ('Platter', 'Platte til 1 person', 179, 'ejeren 1/9: 189 paa kortet er foraeldet'),
  -- Kort 7, ØL VIN & BAR — tre tal, databasen havde ældre
  ('Vin, cava og champagne', 'Vin, flaske',            249, 'kort 7'),
  ('Vin, cava og champagne', 'Alkoholfri vin, flaske', 249, 'kort 7'),
  ('Vin, cava og champagne', 'Cava, glas',              69, 'kort 7'),
  -- Kort 6, KOLDE DRIKKE
  ('Sodavand, juice og kakao', 'RTD',                   40, 'kort 6: 40, ikke 46'),
  ('Sodavand, juice og kakao', 'Juice eller Capri-Sun', 15, 'kort 6: Capri-Sun 15'),

  -- ⚠️ DE TO HER SKULLE HAVE VÆRET RETTET 30/8 — OG BLEV DET
  --    MÅSKE ALDRIG.
  --    `kortets-priser-2.sql` punkt 4 rettede dem, men pegede på
  --    `kategori_id` 13 og 17. Bygges de samme filer op i en tom
  --    database, er 13 "Sodavand, juice og kakao" og 17
  --    "Sliders" — altså to HELT andre kategorier, og
  --    opdateringen rammer nul rækker uden at fejle. Målt 1/9 på
  --    en lokal Postgres 16: begge stod stadig på det gamle tal.
  --    Om produktionens id'er passede, kan ikke ses herfra, så
  --    de rettes her på navn. Er de rigtige i forvejen, rører
  --    linjerne dem ikke (`is distinct from`).
  ('Smørrebrød', 'Rejemad med mayo og citron', 85, 'begge kort: rejemaden er 85'),
  ('Kaffe og varme drikke', 'Kaffe og pandekage', 65, 'kort 5: 65, ikke 85');

with r as (
  update public.menu_varer v set pris = x.pris
    from k3_ret x
    join public.menu_kategorier k on k.navn = x.kat
   where v.kategori_id = k.id and v.navn = x.vare
     and (v.pris is distinct from x.pris)
  returning v.navn)
insert into kort3_rapport
select 3, '⚠️ Priser RETTET (overskrev et tal)', count(*) || ' rettet' from r;

-- ============================================================
--  4) VARER, KORTENE HAR OG DATABASEN MANGLER
-- ============================================================
create temporary table k3_ny (kat text, vare text, pris numeric, tekst text, sort int);
insert into k3_ny values
  -- Kort 1: "Morgenbrød …… SPØRG (Kan bestilles)". Uden pris
  -- med vilje — SPØRG er ejerens eget ord, og siden svarer
  -- "Ring og hør prisen".
  ('Morgenmad', 'Morgenbrød', null, 'Rundstykker og morgenbrød kan bestilles — sig til dagen før', 90),
  -- Kort 1: kortet lister Nutella blandt tilkøbene
  ('Tilkøb morgenmad', 'Nutella', 10, null, 90),
  -- Kort 2, ANDRE RETTER: to tilkøbslinjer med egen pris
  ('Sandwich og retter fra pladen', 'Ekstra æg, tun, kebab, kylling eller pasta', 10, null, 91),
  ('Sandwich og retter fra pladen', 'Ekstra kylling, kebab eller oksekød',        10, null, 92),
  -- Kort 2, BURGERE & SANDWICHES: to tilkøb
  ('Burgere og sandwich', 'Ekstra tilbehør', 10, null, 91),
  ('Burgere og sandwich', 'Bearnaise',        10, null, 92),
  -- Kort 7, ØL: den store specialøl manglede
  ('Øl', 'Specialøl, stor', 70, null, 91),
  -- Kort 6, KOLDE DRIKKE
  ('Sodavand, juice og kakao', 'Brik juice eller cacao', 15, null, 91),
  ('Sodavand, juice og kakao', 'Slush Ice, lille',       25, null, 92),
  ('Sodavand, juice og kakao', 'Slush Ice, stor',        35, null, 93),
  -- Svararket: cateringens slushice er ejerens EGNE tal og
  -- noget andet end lugens (25/35). To rækker, fordi "20-25"
  -- ikke er en pris.
  ('Tilkøb ud af huset', 'Slushice, lille', 20, null, 91),
  ('Tilkøb ud af huset', 'Slushice, stor',  25, null, 92);

with r as (
  insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, sortering)
  select k.id, n.vare, n.tekst, n.pris, n.sort
    from k3_ny n
    join public.menu_kategorier k on k.navn = n.kat
   where not exists (
     select 1 from public.menu_varer v
      where v.kategori_id = k.id and lower(btrim(v.navn)) = lower(btrim(n.vare)))
  returning navn)
insert into kort3_rapport
select 4, 'Nye varer oprettet',
       count(*) || ' af ' || (select count(*) from k3_ny) from r;

-- ============================================================
--  5) DUBLETTER — SLUKKET, ALDRIG SLETTET
--     ⚠️ EN DUBLET ER VÆRRE END EN MANGLENDE VARE: to rækker for
--     den samme ret kan få hver sin pris, og gæsten kan bestille
--     begge. Alle fire er bekræftet af ejeren på arket (punkt D
--     og E). De slukkes, så de kan tændes igen i admin.
-- ============================================================
create temporary table k3_sluk (kat text, vare text, hvorfor text);
insert into k3_sluk values
  ('Sandwich og retter fra pladen', 'Pølsemix',
   'arket D: = "Mix med pommes og salat" 90 kr.'),
  ('Kugleis og ishorn', 'Thermobox',
   'arket D: = "Ishorn med ca. 6 kugler softice" 80 kr.'),
  ('Sodavand, juice og kakao', 'Bitter',
   'arket D: = "Snaps, sambuca og shots" 30 kr.'),
  ('Softice og vafler', 'Belgisk vaffel',
   'arket E: "har aldrig haft det — vi har bubblewaffle"'),
  -- ⚠️ "Planke" i Retter og "Platte til 1 person" i Platter er
  -- den samme ret til 179. Planken slukkes, fordi platten er
  -- den, ejeren selv skrev prisen på, og den ligger i den
  -- kategori, catering læser.
  ('Retter', 'Planke',
   'samme ret som "Platte til 1 person" 179 kr.'),
  -- ⚠️ Retter duplikerer smørrebrødskortet. De to generiske
  -- rækker forsvinder med smoerrebroed-kortet.sql; her ryger
  -- kun de to, der har en tvilling MED samme pris.
  ('Retter', 'Rejemad',
   'samme ret som "Rejemad med mayo og citron" 85 kr. under Smørrebrød'),
  ('Retter', 'Tatarmad',
   'samme ret som "Tartar" 99 kr. under Smørrebrød'),
  -- ⚠️ "20-25 kr." er ikke en pris. Ejeren sagde 1/9: 20 for
  -- lille, 25 for stor. De to størrelser oprettes ovenfor, og
  -- den nøgne række slukkes — ellers står der tre slushice-
  -- rækker, og den ene af dem kan ikke bestilles.
  ('Tilkøb ud af huset', 'Slushice',
   'erstattet af "Slushice, lille" 20 og "Slushice, stor" 25');

with r as (
  update public.menu_varer v set aktiv = false
    from k3_sluk s
    join public.menu_kategorier k on k.navn = s.kat
   where v.kategori_id = k.id and v.navn = s.vare and v.aktiv
  returning v.navn)
insert into kort3_rapport
select 5, 'Dubletter slukket (kan tændes igen i admin)',
       count(*) || ' af ' || (select count(*) from k3_sluk) from r;

-- ============================================================
--  6) TOMATMADEN — ejeren bad selv om den (arket E)
--     Den hører til smørrebrødet og oprettes derfor med den
--     fil; her står kun linjen, så ingen leder efter den.
-- ============================================================

-- ============================================================
--  7) RAPPORTEN — filens vigtigste del
-- ============================================================
insert into kort3_rapport
select 10, 'Varer i alt (aktive)', count(*) || ' stk.'
  from public.menu_varer where aktiv;

insert into kort3_rapport
select 11, 'Varer UDEN pris tilbage', count(*) || ' stk.'
  from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
 where v.pris is null and v.aktiv and k.aktiv;

insert into kort3_rapport
select 12, '   heraf fyld (venter paa smoerrebroed-kortet.sql)', count(*) || ' stk.'
  from k3_varer where pris is null and aktiv and kat = 'Vælg fyld til smørrebrødet';

insert into kort3_rapport
select 13, '   heraf glutenfri/laktosefri/vegansk (er et TILLAEG paa 10, ikke en pris)',
       count(*) || ' stk.'
  from k3_varer where pris is null and aktiv and kat = 'Glutenfri, laktosefri og vegansk';

insert into kort3_rapport
select 15, '   heraf Morgenbroed (ejerens eget "SPOERG" — med vilje uden pris)',
       count(*) || ' stk.'
  from k3_varer where pris is null and aktiv and vare = 'Morgenbrød';

/* ⚠️ ET SPØRGSMÅL, IKKE ET GÆT. To rækker LIGNER hinanden, og
   et gæt ville enten lave en dublet eller en forkert vare. De
   står i rapporten, så ejeren afgør dem i admin. */
insert into kort3_rapport values
  (30, '❓ "Lun delle eller steg" 25 (Retter)',
       'er den det samme som "Hjemmelavet lun frikadelle" 25? Sluk den ene i admin'),
  (31, '❓ "Cheesebaconburger" 85 (Burgere)',
       'kortet skriver "Baconburger" 85 — samme pris, saa intet gaar galt; omdoeb i admin'),
  (32, '❓ "Juice eller Capri-Sun" 15',
       'kortet har "Capri-Sun 15" og "Brik juice eller cacao 15" — omdoeb i admin');

insert into kort3_rapport
select 14, '   heraf isbaren (aftales — "alt efter type og stoerrelse af event")',
       count(*) || ' stk.'
  from k3_varer where pris is null and aktiv and vare like 'Isbar%';

/* ⚠️ DUBLETVAGTEN. Den fandt "Kage" på vej ind under to
   overskrifter 24/8, og den står her igen, fordi filen opretter
   tolv nye varer. To rækker med samme navn får hver sin pris —
   og pris- og udsolgt-værnet i databasen dømmer på NAVNET. */
insert into kort3_rapport
select 20, '⚠️ DUBLET: "' || vare || '"',
       string_agg(kat || ' ' || coalesce(pris::text, 'uden pris'), ' + ' order by kat)
  from (select lower(btrim(vare)) as vare, kat, pris
          from k3_varer where aktiv) d
 group by vare having count(*) > 1;

commit;

-- ------------------------------------------------------------
--  SUPABASES SQL EDITOR VISER KUN DEN SIDSTE SÆTNINGS SVAR.
--  Derfor står rapporten her til sidst — ikke som notices.
-- ------------------------------------------------------------
select nr, hvad, resultat from kort3_rapport order by nr, hvad;
