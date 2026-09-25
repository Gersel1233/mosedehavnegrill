-- ============================================================
--  GLUTENFRIT BRØD: TEKSTEN SIGER 5 KR., SOM PRISEN  (25. sep 2026)
-- ============================================================
--  Mikkels ord: *"Ret begge steder i admin, så tillægget for
--  glutenfrit brød konsekvent står til 5 kr. Det gælder både
--  kategoriteksten og produktbeskrivelsen."*
--
--  MÅLT på den udgivne side mod produktionens data: kategorien
--  "Tillæg: glutenfri, laktosefri og vegansk" har noten "Ejerens
--  tillæg: 10 kr. pr. stk.", og varen "Glutenfrit brød (tillæg)" har
--  beskrivelsen "Til smørrebrød og burgere — 10 kr. pr. stk." — mens
--  prisen står til 5,- (kortene fra 25/9: "GLUTENFRIT BRØD +5,-").
--  Gæsten læste to tal for det samme tillæg.
--
--  Filen retter KUN de to tekster: "10 kr. pr. stk." → "5 kr. pr.
--  stk.". Prisen (5) røres ikke — derfor ingen ejer-blok. Laktosefri
--  og vegansk (10 kr.) er slukket af sluk-det-kortene-ikke-viser.sql,
--  så kategoriens eneste tændte tillæg er glutenfrit brød.
--
--  ⚠️ KAN KØRES IGEN: hver opdatering rammer kun en tekst, der
--  stadig siger 10. Står der noget andet, har ejeren selv skrevet
--  det, og så bliver det stående.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================

begin;

update public.menu_kategorier mk
   set note = replace(mk.note, '10 kr. pr. stk.', '5 kr. pr. stk.')
 where mk.lokation_id = 'mosede'
   and lower(btrim(mk.navn)) = lower('Tillæg: glutenfri, laktosefri og vegansk')
   and mk.note like '%10 kr. pr. stk.%';

update public.menu_varer mv
   set beskrivelse = replace(mv.beskrivelse, '10 kr. pr. stk.', '5 kr. pr. stk.')
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id
   and mk.lokation_id = 'mosede'
   and lower(btrim(mk.navn)) = lower('Tillæg: glutenfri, laktosefri og vegansk')
   and lower(btrim(mv.navn)) = lower('Glutenfrit brød (tillæg)')
   and mv.beskrivelse like '%10 kr. pr. stk.%';

commit;


-- ------------------------------------------------------------
--  RAPPORT. SQL Editoren viser kun den sidste sætnings svar.
--  Begge tekster skal sige 5 kr., og prisen skal være 5.
-- ------------------------------------------------------------
select
  (select note from public.menu_kategorier
    where lokation_id = 'mosede'
      and lower(btrim(navn)) = lower('Tillæg: glutenfri, laktosefri og vegansk')
    limit 1)                                                as kategoriteksten,
  (select mv.beskrivelse from public.menu_varer mv
     join public.menu_kategorier mk on mk.id = mv.kategori_id
    where mk.lokation_id = 'mosede'
      and lower(btrim(mv.navn)) = lower('Glutenfrit brød (tillæg)')
    limit 1)                                                as beskrivelsen,
  (select mv.pris from public.menu_varer mv
     join public.menu_kategorier mk on mk.id = mv.kategori_id
    where mk.lokation_id = 'mosede'
      and lower(btrim(mv.navn)) = lower('Glutenfrit brød (tillæg)')
    limit 1)                                                as prisen_skal_vaere_5;
