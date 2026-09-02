-- ============================================================
--  GLUTENFRI, LAKTOSEFRI OG VEGANSK ER ET TILLÆG
--  (1. september 2026)
-- ============================================================
--  Svararket, punkt 7. Vi spurgte om en pris på fem ting; ejeren
--  stregede "Glutenfri mad" ud og satte i stedet et flueben ved
--  linjen nedenunder: **"Tillæg: 10 kr. pr. stk."** Mikkel
--  bekræftede det 1/9 med ét ord: *"10 yes."*
--
--  De fem rækker har stået UDEN pris siden 24/8 og har derfor
--  kunnet ses, men ikke bestilles. De er de sidste fem af de syv
--  prisløse på hele kortet.
--
--  ⚠️ ET TILLÆG ER EN VARE, IKKE EN NY MASKINE. Huset har ét
--  tillæg i forvejen — emballagen — og den er bygget som en
--  regel, fordi den kommer af sig selv: gæsten vælger den ikke.
--  Det her gør hun. Så det er en almindelig række med en pris,
--  som "Ekstra tilbehør 10 kr." har været hele tiden, og den
--  følger med i kurven, i summen, på bonen og i salgstallene
--  uden en eneste linje ny kode.
--
--  ⚠️ MEN NAVNET SKAL SIGE, AT DET ER ET TILLÆG. "Vegansk mad
--  10 kr." på et menukort læses som vegansk mad TIL ti kroner.
--  Derfor "(tillæg)" i navnet og ejerens eget "pr. stk." i
--  beskrivelsen.
--
--  ⚠️ OG ÉT SPØRGSMÅL STÅR I RAPPORTEN I STEDET FOR ET GÆT:
--  håndmadskortet skriver "GLUTENFRIT BRØD — SAMME PRIS", mens
--  svararket siger 10 kr. Arket er nyere og svarer direkte på
--  vores spørgsmål, så det vinder — men ejeren skal se, at de to
--  siger hver sit, præcis som tartaren (95/99) og platten
--  (189/179) gjorde.
--
--  Kør den EFTER smoerrebroed-kortet.sql i Mosede-projektet.
--  Den kan køres igen.
-- ============================================================

begin;

create temporary table tillaeg_rapport (nr int, hvad text, resultat text);
truncate tillaeg_rapport;

-- ------------------------------------------------------------
--  1) KATEGORIEN SIGER, HVAD DEN ER
-- ------------------------------------------------------------
with r as (
  update public.menu_kategorier
     set navn = 'Tillæg: glutenfri, laktosefri og vegansk',
         note = 'Ejerens tillæg: 10 kr. pr. stk. Sig til, når I bestiller.'
   where lokation_id = 'mosede'
     and navn = 'Glutenfri, laktosefri og vegansk'
  returning id)
insert into tillaeg_rapport
select 1, 'Kategorien omdøbt', case when exists (select 1 from r)
  then 'ja' else 'stod allerede rigtigt' end;

-- ------------------------------------------------------------
--  2) DE TRE, DER ER ET TILLÆG
-- ------------------------------------------------------------
create temporary table tillaeg_nyt (gammelt text, nyt text, tekst text, sort int);
insert into tillaeg_nyt values
  ('Glutenfrit brød', 'Glutenfrit brød (tillæg)',
   'Til smørrebrød og burgere — 10 kr. pr. stk.', 1),
  ('Laktosefri mad',  'Laktosefri (tillæg)',
   '10 kr. pr. stk.', 2),
  ('Vegansk mad',     'Vegansk (tillæg)',
   '10 kr. pr. stk.', 3);

with r as (
  update public.menu_varer v
     set navn = n.nyt, beskrivelse = n.tekst, pris = 10,
         sortering = n.sort, aktiv = true
    from tillaeg_nyt n, public.menu_kategorier k
   where k.lokation_id = 'mosede'
     and k.navn in ('Tillæg: glutenfri, laktosefri og vegansk',
                    'Glutenfri, laktosefri og vegansk')
     and v.kategori_id = k.id
     and v.navn in (n.gammelt, n.nyt)
  returning v.navn)
insert into tillaeg_rapport
select 2, 'Tillæggene sat til 10 kr.',
       count(*) || ' af ' || (select count(*) from tillaeg_nyt) from r;

-- ------------------------------------------------------------
--  3) DE TO, DER IKKE ER ET TILLÆG
--     ⚠️ SLUKKET, ALDRIG SLETTET.
--
--     · "Glutenfri mad" stregede ejeren selv ud på arket, og
--       "Glutenfrit brød (tillæg)" dækker det, gæsten spørger om.
--     · "Vegansk smørrebrød" var en VEJVISER — beskrivelsen
--       listede tomatmad, kartoffelmad og avokadomad. De tre er
--       rigtige varer på smørrebrødskortet nu, hver med sin pris,
--       så rækken ville være en fjerde måde at bestille de samme
--       tre på.
-- ------------------------------------------------------------
with r as (
  update public.menu_varer v set aktiv = false
    from public.menu_kategorier k
   where k.lokation_id = 'mosede'
     and k.navn in ('Tillæg: glutenfri, laktosefri og vegansk',
                    'Glutenfri, laktosefri og vegansk')
     and v.kategori_id = k.id
     and v.navn in ('Glutenfri mad', 'Vegansk smørrebrød')
     and v.aktiv
  returning v.navn)
insert into tillaeg_rapport
select 3, 'De to, der ikke er et tillæg, er slukket',
       count(*) || ' af 2' from r;

-- ------------------------------------------------------------
--  4) RAPPORTEN
-- ------------------------------------------------------------
insert into tillaeg_rapport
select 10, 'Varer UDEN pris tilbage i hele menuen', count(*) || ' stk.'
  from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
 where k.lokation_id = 'mosede' and v.pris is null and v.aktiv and k.aktiv;

insert into tillaeg_rapport
select 11, '   heraf isbaren og morgenbrødet (aftales / SPØRG)', count(*) || ' stk.'
  from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
 where k.lokation_id = 'mosede' and v.pris is null and v.aktiv and k.aktiv
   and (v.navn like 'Isbar%' or v.navn = 'Morgenbrød');

insert into tillaeg_rapport values
  (20, '❓ Håndmadskortet skriver "GLUTENFRIT BRØD — SAMME PRIS"',
       'svararket siger 10 kr. og er nyere — ret i admin, hvis kortet gaelder'),
  (21, '⚠️ HUSK AT AABNE KATEGORIEN',
       'admin -> Bestillinger: uden et flueben kan tillaegget ses, men ikke vaelges');

commit;

select nr, hvad, resultat from tillaeg_rapport order by nr;
