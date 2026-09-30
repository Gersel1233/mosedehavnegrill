-- ============================================================
--  VALG PÅ DE VARER, DER SPØRGER I DERES EGET NAVN  (30. sep 2026)
-- ============================================================
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--
--  Ejerens ord 30/9: *"ordresedlen må aldrig bare sige fx
--  'Sodavand, juice, iste eller cacao', men skal vise det konkrete
--  valg kunden har foretaget."*
--
--  MÅLT samme dag ved bord 1 mod det levende kort: 14 aktive varer
--  har ordet "eller" i navnet og INGEN valg. Kollegaen i køkkenet
--  fik altså sedler, hvor der bogstaveligt stod "eller".
--
--  ------------------------------------------------------------
--  KUN DE OTTE, DER STÅR SOM EN ALMINDELIG RÆKKE MED TÆLLER
--  ------------------------------------------------------------
--  ⚠️ FIRE AF DE FJORTEN RØRES IKKE, FORDI ISBYGGEREN HAR DEM.
--  Isboksen, bubblewafflen og de to "Sauce, topping eller guf"
--  står slet ikke i den almindelige liste — js/isbygger.js tegner
--  dem, og den læser IKKE menu_varer.valg. Målt: isboksen spørger
--  allerede selv "1 Kugler eller softice?" og derefter "2 Hvilke
--  smage?". Et valg oveni ville spørge om det samme to gange.
--
--  ⚠️ "Tomat- eller agurkemad med mayo og løg" røres heller ikke:
--  den ligger i kategorien "Vælg fyld til smørrebrødet", som er
--  SLUKKET. Den kan ikke bestilles, og et valg på den ville være
--  en rettelse, ingen gæst ser.
--
--  ⚠️ OG "Ekstra kød eller tilbehør" ER MED VILJE UDELADT.
--  Ejerens ord: *"den må du ikke gætte på endnu."* Hvad man kan
--  vælge imellem, står ikke i navnet, og et gæt ville stå på en
--  ordreseddel som om det var aftalt.
--
--  ------------------------------------------------------------
--  VALGENE ER LÆST AF VARENS EGET NAVN
--  ------------------------------------------------------------
--  Ingen af dem er fundet på: står der "varm eller kold", er
--  valgene Varm og Kold, i den rækkefølge navnet siger dem. De
--  samme lister står som forslag i js/admin/valgforslag.js, så
--  admin og databasen siger det samme — tests/menukort-admin.spec.js
--  læser den her fil og fælder det, hvis de skrider fra hinanden.
--
--  Filen kan køres igen: den rører kun varer, der stadig har
--  valg = null.
-- ============================================================

begin;

create or replace function pg_temp.valg(vare text, liste jsonb)
returns void language sql as $$
  update public.menu_varer mv
     set valg = liste
    from public.menu_kategorier mk
   where mk.id = mv.kategori_id
     and mk.lokation_id = 'mosede'
     and btrim(mv.navn) = vare
     and mv.valg is null;
$$;

select pg_temp.valg('Dip eller dressing',                                  '["Dip","Dressing"]');
select pg_temp.valg('Lumumba, varm eller kold',                            '["Varm","Kold"]');
select pg_temp.valg('Flaske eller dåse',                                   '["Flaske","Dåse"]');
select pg_temp.valg('Lun delle eller steg',                                '["Frikadelle","Steg"]');
select pg_temp.valg('Lun delle, steg eller leverpostej med brød og surt',  '["Frikadelle","Steg","Leverpostej"]');
select pg_temp.valg('Brik juice eller cacao',                              '["Juice","Cacao"]');
select pg_temp.valg('Sodavand, juice, iste eller cacao – lille',           '["Sodavand","Juice","Iste","Cacao"]');
select pg_temp.valg('Sodavand, juice, iste eller cacao – stor',            '["Sodavand","Juice","Iste","Cacao"]');

commit;

-- RAPPORT — hver linje skal have fået sine valg.
select mv.navn, mv.valg::text as valgene
  from public.menu_varer mv
  join public.menu_kategorier mk on mk.id = mv.kategori_id
 where mk.lokation_id = 'mosede'
   and btrim(mv.navn) in ('Dip eller dressing', 'Lumumba, varm eller kold',
     'Flaske eller dåse', 'Lun delle eller steg',
     'Lun delle, steg eller leverpostej med brød og surt', 'Brik juice eller cacao',
     'Sodavand, juice, iste eller cacao – lille', 'Sodavand, juice, iste eller cacao – stor')
 order by mv.navn;
