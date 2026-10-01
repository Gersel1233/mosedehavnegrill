-- ============================================================
--  ISENS TILBEHØR SKAL OGSÅ SIGE HVILKET  (1. okt 2026)
-- ============================================================
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--
--  Ejerens ord 30/9: *"ret 'Sauce, topping eller guf' i
--  isbyggeren, så kunden skal vælge konkret … og valget fremgår
--  tydeligt på medarbejderens ordre."*
--
--  ⚠️ MASKINEN BLEV BYGGET 30/9, DATAEN BLEV GLEMT. js/isbygger.js
--  spørger nu Butik.vareValg på hvert tilbehør — men begge
--  "Sauce, topping eller guf" stod stadig med valg = null i
--  produktionen, så trin 4 viste én knap med hele det tvetydige
--  navn på. Halvdelen af rettelsen var i luften, og den halvdel,
--  gæsten ser, var den manglende. Fundet 1/10 ved at tælle, hvor
--  mange aktive varer der stadig har "eller" i navnet uden valg.
--
--  Valgene er LÆST AF NAVNET, i navnets egen rækkefølge.
--
--  ⚠️ VAREN FINDES TO GANGE — én under Kugleis og én under
--  Softice og vafler, fordi kort 05 har dem hver for sig (se
--  ekstraFor() i js/isbygger.js: tilbehøret følger isens egen
--  kategori). Begge skal have valgene, ellers spørger byggeren
--  kun ved den ene slags is.
--
--  Filen kan køres igen: den rører kun varer med valg = null.
-- ============================================================

begin;

update public.menu_varer mv
   set valg = '["Sauce","Topping","Guf"]'::jsonb
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id
   and mk.lokation_id = 'mosede'
   and btrim(mv.navn) = 'Sauce, topping eller guf'
   and mv.valg is null;

commit;

-- RAPPORT — begge rækker skal have valgene, og listen over
-- aktive varer, der STADIG spørger "eller" uden at kunne svare,
-- skal kun rumme dem, isbyggeren selv tager sig af.
select mk.navn as kategori, mv.navn, mv.valg::text as valgene
  from public.menu_varer mv join public.menu_kategorier mk on mk.id = mv.kategori_id
 where mk.lokation_id='mosede' and btrim(mv.navn) = 'Sauce, topping eller guf'
 order by mk.navn;
