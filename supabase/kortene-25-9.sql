-- ============================================================
--  DE NYE TRYKTE KORT — 25. SEPTEMBER 2026
-- ============================================================
--  Mikkel afleverede ni filer: fem menukort (01 Morgenmad/fisk/
--  klassikere, 02 À la carte/burgere/pølser, 03 Smørrebrød,
--  04 Håndmadder, 05 Is og sødt), to bestillingslister (08, 09),
--  flyeren (10) og `00_Kontrolrapport.md`. Hans ord: *"ret hele
--  sortimentet så det passer perfekt med de her nye menukort,
--  ændrer priser og fjern/tilføj varer hvis menukortene tyder på
--  du skal."*
--
--  Kortene er skrevet ind i `vaerktoej/kortene.py` og MÅLT mod
--  produktionen med `vaerktoej/sammenlign-kort.py` (anon-nøglen).
--  Filen her retter det, målingen fandt — og KUN det, der er
--  entydigt.
--
--  ⚠️ FILEN MATCHER PÅ NAVN, ALDRIG PÅ ID. `kortets-priser-2.sql`
--  skrev `kategori_id = 31`, og de id'er gjaldt produktionens
--  rækkefølge; i en frisk database ramte de nul rækker uden at
--  fejle. Målt 1/9.
--
--  ⚠️ DEN KAN KØRES IGEN. Hver opdatering har `is distinct from`
--  eller `not exists`, så et nyt gennemløb rører ingenting.
--
--  ⚠️ OG DEN SLETTER INTET. En vare, kortene ikke viser, slukkes
--  (`aktiv = false`) og kan tændes igen i admin.
--
--  ⚠️ SEKS TING ER MED VILJE IKKE I FILEN — de er spørgsmål til
--  ejeren, ikke rettelser vi kan måle os frem til. De står i
--  rapportens punkt 9, så de ikke bliver glemt.
--
--  ⚠️ OG HÅNDMADDERNES PRIS ER IKKE RØRT. Kortene siger 27;
--  databasen siger 24, fordi ejeren sagde det ordret 21/9
--  ("kig altid på ny trykte menukort, håndmadder er 24"), og
--  netop det kort, Mikkel sagde han selv ville rette, bærer
--  stadig 27. 19 gæstepriser er for meget at gætte på. Punkt 9.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================

begin;

/* ⚠️ IKKE "on commit drop" — rapporten skal LÆSES efter commit.
   Arret står i kortets-priser-2.sql. */
create temporary table k259_rapport (nr int, hvad text, resultat text);
truncate k259_rapport;

-- ------------------------------------------------------------
--  0) FINDES KATEGORIERNE? En opdatering, der rammer nul rækker,
--     fejler ikke — den er bare tavs. Derfor spørges der FØRST.
-- ------------------------------------------------------------
create temporary table k259_kat (navn text);
insert into k259_kat values
  ('Retter'), ('Andre retter'), ('Burgere'), ('Sandwich'), ('Pølser'),
  ('Smørrebrød'), ('Kugleis'), ('Softice og vafler'),
  ('Tillæg: glutenfri, laktosefri og vegansk');

insert into k259_rapport
select 0, 'Kategorier, filen regner med',
       case when count(*) = 0 then '✅ alle ni findes'
            else '❌ IKKE FUNDET: ' || string_agg(navn, ', ') end
  from k259_kat kk
 where not exists (select 1 from public.menu_kategorier k
                    where k.navn = kk.navn and k.lokation_id = 'mosede');

-- ------------------------------------------------------------
--  0b) ⚠️ FILEN SKAL SKRIVE SOM EN EJER — ELLERS SIGER
--      DATABASEN NEJ TIL HVER ENESTE PRIS.
--
--      `roller.sql` lagde 2/9 udløseren `menu_vare_pris_ejer` på
--      `menu_varer`: kun en EJER må rette en pris. Værnet spørger
--      `auth.jwt()` og ikke databaserollen — så heller ikke
--      `postgres` i Supabases SQL Editor slipper igennem.
--
--      ⚠️ MÅLT 24/9 på en lokal Postgres 16 bygget af mappens egne
--      filer: uden linjerne her dør filen på den FØRSTE pris med
--      `kun_ejeren_saetter_priser`, hele transaktionen afbrydes, og
--      der kommer **ikke én rapportlinje** ud. Den ligner ikke en
--      fejl — den ligner ingenting. Det er husets ældste ar, og
--      `proev-pris-vaern.sql` faldt i præcis samme hul 9/9.
--
--      ⚠️ E-MAILEN LÆSES AF `admin_adgang`, den skrives ikke af.
--      Et navn i filen ville holde op med at virke den dag, ejeren
--      skifter sin e-mail — og det ville være tavst: prisen ville
--      bare ikke blive sat. Findes der ingen aktiv ejer, standser
--      filen med ord i stedet for at køre halvt igennem.
-- ------------------------------------------------------------
do $$
declare v_ejer text;
begin
  select a.email into v_ejer
    from public.admin_adgang a
   where a.lokation_id = 'mosede' and a.aktiv and a.rolle = 'ejer'
   order by a.email limit 1;

  if v_ejer is null then
    raise exception 'Ingen aktiv ejer i admin_adgang for mosede — filen kan ikke saette priser. Opret ejeren under admin -> Personale foerst.';
  end if;

  perform set_config('request.jwt.claims',
                     json_build_object('email', v_ejer)::text, true);
end $$;

insert into k259_rapport
select 0, 'Skriver som ejer',
       coalesce(nullif(current_setting('request.jwt.claims', true), ''), '(ingen)');

-- ============================================================
--  1) PRISER, KORTENE HAR RETTET
--     ⚠️ Hver linje er et tal, der ALLEREDE står i databasen, og
--     som bliver overskrevet. Derfor står kilden på hver af dem.
-- ============================================================
create temporary table k259_pris (kat text, vare text, pris numeric, kilde text);
insert into k259_pris values
  -- Kort 01 + 03 + bestillingslisten: rejemaden er 95 tre steder.
  ('Smørrebrød', 'Rejemad', 95, 'kort 01, 03 og bestillingsliste 08'),

  -- Kort 03 + 04: "GLUTENFRIT BRØD +5,-". Den har stået på 0.
  ('Tillæg: glutenfri, laktosefri og vegansk', 'Glutenfrit brød (tillæg)', 5, 'kort 03 og 04'),

  -- Kort 05, IS
  ('Kugleis', '4 kugler',                            65, 'kort 05'),
  ('Kugleis', 'Ekstra kugle',                        12, 'kort 05'),
  ('Kugleis', 'Løs vaffel, glutenfri',                7, 'kort 05: samme pris som den almindelige'),
  ('Kugleis', 'Isboks, ca. 6 kugler eller softice',  90, 'kort 05'),

  -- Kort 05, SØDT
  ('Softice og vafler', 'Bubblewaffle mix',                     67, 'kort 05'),
  ('Softice og vafler', '2 hjemmelavede pandekager med sukker', 45, 'kort 05'),

  -- ⚠️ BESTILLINGSLISTEN SÆTTER SANDWICHENE NED.
  --    Kort 02 har kun ÉN "Sandwich 75,-", og bestillingslisten
  --    (08 s.2 / 09 s.2) lister flæskesteg og frikadelle som to
  --    af de fjorten varianter — til 75, ikke 80. Databasen har
  --    dem som egne varer, og de bliver: køkkenet skal stadig
  --    kunne se HVILKEN sandwich der er bestilt.
  ('Sandwich', 'Flæskestegssandwich', 75, 'bestillingsliste 08/09: alle sandwich 75'),
  ('Sandwich', 'Frikadellesandwich',  75, 'bestillingsliste 08/09: alle sandwich 75');

with r as (
  update public.menu_varer v set pris = p.pris
    from k259_pris p
    join public.menu_kategorier k on k.navn = p.kat and k.lokation_id = 'mosede'
   where v.kategori_id = k.id and v.navn = p.vare
     and v.pris is distinct from p.pris
  returning v.navn)
insert into k259_rapport
select 1, '⚠️ Priser RETTET efter de nye kort',
       count(*) || ' af ' || (select count(*) from k259_pris) from r;

-- ============================================================
--  2) VARER, KORTENE HAR OG DATABASEN MANGLER
--     ⚠️ En dublet er værre end en manglende vare, så der
--     oprettes KUN, hvis navnet ikke findes i forvejen.
-- ============================================================
create temporary table k259_ny (kat text, vare text, pris numeric, tekst text, sort int);
insert into k259_ny values
  ('Retter',  'Clubsandwich', 105, '', 60),                       -- kort 01, FISK & KLASSIKERE
  ('Burgere', 'Bacon & Cheeseburger', 95,
              'Saftig bøf med smeltet ost og sprød bacon, salat, tomat og dressing i ristet burgerbolle.', 8),
  -- Kort 05: "Havnens café-is 79,- · 3 kugler, softice-top, guf,
  -- flødeskum og syltetøj". ⚠️ Databasen har "Mosede Isen 65"
  -- uden beskrivelse — om det er den SAMME is under et nyt navn,
  -- kan ikke måles. Derfor oprettes den nye, og den gamle står
  -- som spørgsmål i punkt 9 i stedet for at blive slukket i blinde.
  ('Kugleis', 'Havnens café-is', 79,
              '3 kugler, softice-top, guf, flødeskum og syltetøj', 21),
  ('Softice og vafler', '2 hjemmelavede pandekager med 2 kugler is', 77, '', 26),
  ('Softice og vafler', 'Affogato', 65, 'Espresso med vaniljeis og nødder', 27);

with r as (
  insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, aktiv, sortering)
  select k.id, n.vare, nullif(n.tekst, ''), n.pris, true, n.sort
    from k259_ny n
    join public.menu_kategorier k on k.navn = n.kat and k.lokation_id = 'mosede'
   where not exists (
     select 1 from public.menu_varer v
      join public.menu_kategorier k2 on k2.id = v.kategori_id
     where k2.lokation_id = 'mosede'
       and lower(btrim(v.navn)) = lower(btrim(n.vare)))
  returning navn)
insert into k259_rapport
select 2, 'Nye varer fra kortene',
       count(*) || ' af ' || (select count(*) from k259_ny) || ' (resten fandtes)' from r;

-- ============================================================
--  3) VARER, KORTENE VISER, OG SOM VAR SLUKKET
--     ⚠️ Fransk hotdog stod som "alm." og var slået fra. Kort 02
--     lister den som "Fransk hotdog, lille" — altså sælges den
--     igen, og navnet på kortet er et andet end databasens.
-- ============================================================
with r as (
  update public.menu_varer v set navn = 'Fransk hotdog, lille'
    from public.menu_kategorier k
   where k.id = v.kategori_id and k.lokation_id = 'mosede'
     and k.navn = 'Pølser' and v.navn = 'Fransk hotdog, alm.'
  returning v.navn)
insert into k259_rapport select 3, 'Fransk hotdog, alm. → lille', count(*) || ' omdøbt' from r;

with r as (
  update public.menu_varer v set aktiv = true
    from public.menu_kategorier k
   where k.id = v.kategori_id and k.lokation_id = 'mosede'
     and k.navn = 'Pølser'
     and v.navn in ('Fransk hotdog, lille', 'Fransk hotdog, stor')
     and v.aktiv is not true
  returning v.navn)
insert into k259_rapport select 4, 'Fransk hotdog tændt igen', count(*) || ' tændt' from r;

/* ⚠️ OG SÅ ER VI IKKE EJER LÆNGERE. Resten af filen læser kun,
   og en fil, der bliver ved med at have ejerens rettigheder efter
   den sidste skrivning, er rettigheder, ingen har bedt om.
   `auth.jwt()` tåler den tomme streng (`nullif` i dens egen krop). */
select set_config('request.jwt.claims', '', true);

-- ============================================================
--  5) RAPPORT — HVAD MANGLER STADIG EN PRIS
-- ============================================================
insert into k259_rapport
select 5, 'Aktive varer uden pris (skal være 2: isbaren og morgenbrødet)',
       count(*) || ' stk.'
  from public.menu_varer v
  join public.menu_kategorier k on k.id = v.kategori_id
 where k.lokation_id = 'mosede' and v.aktiv and k.aktiv and v.pris is null;

-- ============================================================
--  6) RAPPORT — HÅNDMADDERNES PRIS, SÅ DEN KAN SES
-- ============================================================
insert into k259_rapport
select 6, '⚠️ Håndmadder i databasen (kortene siger 27)',
       coalesce(string_agg(distinct v.pris::text, ' / '), 'ingen') || ' kr.'
  from public.menu_varer v
  join public.menu_kategorier k on k.id = v.kategori_id
 where k.lokation_id = 'mosede' and k.navn = 'Håndmadder' and v.aktiv;

-- ============================================================
--  9) DET, FILEN MED VILJE IKKE RETTER — SPØRGSMÅL TIL EJEREN
-- ============================================================
insert into k259_rapport values
 (9, 'SPØRGSMÅL 1',
     'Håndmadder: kortene 01, 04, 09 og flyeren siger 27,- · databasen siger 24,- '
     '(ejerens eget ord 21/9). 19 rækker. Hvilken gælder?'),
 (9, 'SPØRGSMÅL 2',
     'Kortene har ÉN linje "Dagens hjemmelavede pålægssalater" · databasen har fire '
     '(hønse-, ægge-, wiener-, skinkesalat) på både smørrebrød og håndmad. '
     'Skal de otte rækker slås sammen til to?'),
 (9, 'SPØRGSMÅL 3',
     'Smørrebrødskortet har "Æggemad med mayo & rejer" · databasen har '
     '"Æggemad med bacon og karry". Omdøbning, eller en vare mere?'),
 (9, 'SPØRGSMÅL 4',
     '"Mosede Isen 65,-" står i databasen og på intet kort. Er den blevet til '
     '"Havnens café-is 79,-", eller sælges de begge?'),
 (9, 'SPØRGSMÅL 5',
     '"Tomatmad 55,-" og "Bøfsandwich 75,-" står i databasen og på intet af de nye kort. '
     'Slukkes de, eller mangler de på kortet?'),
 (9, 'SPØRGSMÅL 6',
     'Håndmadskortet mangler "Fiskefilet med rejer og mayo", som smørrebrødskortet har. '
     'Skal håndmad-rækken slukkes?'),
 (9, 'SPØRGSMÅL 7',
     'Databasens "Baconburger" har beskrivelsen "med smeltet ost OG sprød bacon" — '
     'men kortet har nu både Baconburger 85 og Bacon & Cheeseburger 95. '
     'Skal osten ud af Baconburgerens beskrivelse?'),
 (9, 'SPØRGSMÅL 8',
     'Kort 06 (Kaffe, koldt og knas) og 07 (Øl, vin og bar) var IKKE med. '
     'Kontrolrapporten nævner dem som to af de ti filer. Drikkevarerne er ikke målt.');

commit;

-- ============================================================
--  RAPPORTEN — læs den. Supabases SQL Editor viser kun den
--  SIDSTE sætning, så den står her til sidst med vilje.
-- ============================================================
select nr, hvad, resultat from k259_rapport order by nr, hvad;
