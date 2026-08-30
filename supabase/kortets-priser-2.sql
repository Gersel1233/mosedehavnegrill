-- ============================================================
--  EJERENS FEM TRYKTE KORT — PRISERNE  (30. august 2026)
-- ============================================================
--  Mikkel sendte de fem færdige kort: MENUKORT FRA GRILLEN,
--  BURGERE/PØLSER & PLADE, SMØRREBRØD, HÅNDMADDER og IS &
--  DRIKKEVARER. Det er FØRSTE gang, vi har ejerens egne tal på
--  skrift — hele menukortet er skrevet af efter en liste UDEN
--  priser, og 110 af 247 varer står derfor uden.
--
--  En vare uden pris kan ses, men ikke bestilles (pris-værnet
--  fra 26/8). Så hver pris her er en vare, gæsten kan købe fra i
--  morgen.
--
--  ⚠️ FILEN SÆTTER KUN PRISER. Den omdøber ingenting og sletter
--  ingenting. Ti navne er ejerens kort og databasen uenige om
--  ("Leverpostej med surt" mod "Leverpostej med baconsvøb",
--  "Ostemad, mild" mod "Ostemad stærk med peberfrugt" …), og de
--  hører til smørrebrødsombygningen, hvor de skal ses enkeltvis.
--  Et forkert navn er en anden mad end den, gæsten bad om.
--
--  ⚠️ OG FYLDET FÅR IKKE PRIS HER. De 32 rækker i "Vælg fyld til
--  smørrebrødet" står uden pris med vilje, til bestillingen er
--  bygget om til hel/halv skive. Får de en pris i dag, flipper de
--  fra ØNSKER til varer, og så kan gæsten komme til at betale 55
--  for smørrebrødet OG 55 for fyldet. Se README.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
--  Den kan køres igen: den rører kun de rækker, den nævner.
-- ============================================================

begin;

/* ⚠️ IKKE "on commit drop". Rapporten skal LÆSES efter commit,
   og en temp-tabel med on commit drop er væk i samme sekund,
   transaktionen lukker — så ville den sidste select fejle med
   "relation does not exist", efter at priserne var skrevet. Den
   her lever sessionen ud og forsvinder, når fanen lukkes. */
create temporary table kort_rapport (
  nr       int,
  hvad     text,
  resultat text
);
truncate kort_rapport;

-- ------------------------------------------------------------
--  1) TILKØB TIL MORGENMADEN — 10,- pr. stk.
--     Kortet: "Æg, bacon, pålæg, marmelade, Nutella, baked beans
--     m.m. …… 10,-". Ejerens eget "m.m." dækker hele kategorien;
--     der er ikke to priser på tilkøb nogen steder på kortene.
-- ------------------------------------------------------------
with r as (
  update public.menu_varer set pris = 10
   where kategori_id = 31 and pris is null
  returning 1)
insert into kort_rapport
select 1, 'Tilkøb morgenmad sat til 10,-', count(*) || ' varer' from r;

-- ------------------------------------------------------------
--  2) ENKELTE VARER, KORTENE NÆVNER VED NAVN
-- ------------------------------------------------------------
with nye(kat, navn, pris, hvorfra) as (values
  -- Kort 2, ANDRE RETTER: "Lun frikadelle med brød …… 25,-"
  (10, 'Hjemmelavet lun frikadelle', 25, 'kort 2'),
  -- Kort 1, FISK & KLASSIKERE: "Platte …… 189,- (Skal bestilles)"
  (27, 'Platte til 1 person',       189, 'kort 1')
), r as (
  update public.menu_varer v set pris = n.pris
    from nye n
   where v.kategori_id = n.kat and v.navn = n.navn and v.pris is null
  returning v.navn)
insert into kort_rapport
select 2, 'Varer sat efter navn', count(*) || ' af 2' from r;

-- ------------------------------------------------------------
--  3) UDLEDT AF EJERENS EGEN "+5,-"-LINJE — TJEK DEM
--     Kortet skriver "Bacon-svøb …… +5,-" og "Ristet pølse 30",
--     "Frankfurter eller stor specialpølse 40". De to rækker med
--     bacon står uden pris i databasen.
--
--     ⚠️ DET ER DEN ENESTE STEDS ARITMETIK I FILEN, og den står
--     her, så den kan ses. Er 35 og 45 forkert, så ret dem i
--     admin — det tager to felter.
-- ------------------------------------------------------------
with nye(kat, navn, pris) as (values
  (12, 'Ristet pølse med bacon',  35),
  (12, 'Frankfurter med bacon',   45)
), r as (
  update public.menu_varer v set pris = n.pris
    from nye n
   where v.kategori_id = n.kat and v.navn = n.navn and v.pris is null
  returning v.navn)
insert into kort_rapport
select 3, '⚠️ UDLEDT af "+5,-" — tjek dem i admin', count(*) || ' af 2' from r;

-- ------------------------------------------------------------
--  4) TO PRISER, DER VAR FORKERTE — KORTET VINDER
--
--     ⚠️ DE HER OVERSKRIVER ET TAL, DER ALLEREDE STOD DER. Det
--     gør ingen andre linjer i filen. Begge er bekræftet:
--
--     · Rejemad stod 75 under Smørrebrød og 85 under Retter.
--       Begge ejerens kort siger 85. Mikkel bekræftede 30/8.
--     · Kaffe og pandekage stod 85; IS & DRIKKEVARER siger 65.
-- ------------------------------------------------------------
with nye(kat, navn, pris) as (values
  (13, 'Rejemad med mayo og citron', 85),
  (17, 'Kaffe og pandekage',         65)
), r as (
  update public.menu_varer v set pris = n.pris
    from nye n
   where v.kategori_id = n.kat and v.navn = n.navn
  returning v.navn)
insert into kort_rapport
select 4, 'Rettede priser (overskrev et tal)', count(*) || ' af 2' from r;

-- ------------------------------------------------------------
--  5) HVAD MANGLER STADIG? Rapporten er filens vigtigste del:
--     den siger, hvad ejeren stadig skal svare på, i stedet for
--     at et gæt lister sig ind som en pris.
-- ------------------------------------------------------------
insert into kort_rapport
select 5, 'Varer UDEN pris tilbage', count(*) || ' stk.'
  from public.menu_varer where pris is null and aktiv;

insert into kort_rapport
select 6, '   heraf fyld (venter på ombygningen)', count(*) || ' stk.'
  from public.menu_varer where pris is null and aktiv and kategori_id = 14;

insert into kort_rapport
select 7, '   heraf ud af huset (intet kort endnu)', count(*) || ' stk.'
  from public.menu_varer
 where pris is null and aktiv and kategori_id in (26, 27, 28, 29, 30, 32);

insert into kort_rapport
select 8, '   heraf andre — SPØRG EJEREN: ' || string_agg(navn, ', ' order by navn), ''
  from public.menu_varer
 where pris is null and aktiv and kategori_id not in (14, 26, 27, 28, 29, 30, 32);

commit;

-- Supabases SQL Editor viser kun den SIDSTE sætnings svar.
select nr, hvad, resultat from kort_rapport order by nr;
