-- ============================================================
--  HÅNDMADDERNE: HEL SKIVE, FRISKBAGT — OG DE SLUKKEDE TIL 27  (26/9 2026)
-- ============================================================
--  Mikkels ord, ordret: *"ja 27 tak og det er hel skive og friskbagt
--  rugbrød tak"* — svaret på to spørgsmål efter haandmadder-27-kr.sql:
--
--  1) De 6 SLUKKEDE håndmadder stod stadig til 24. De kan ikke
--     bestilles i dag, men tændes en af dem i admin, skulle den ikke
--     komme frem til den gamle pris. Nu 27 som de andre.
--  2) Kategoriens note sagde "Halv skive hjemmebagt rugbrød … den lille
--     sultne udgave", mens menukortets kapitel siger "Friskbagt
--     rugbrød". Noten står under Varianter på menukortet og ved
--     bestillingen, så gæsten læste to ting. Nu står der det, Mikkel
--     skrev: hel skive, friskbagt rugbrød.
--
--  ⚠️ smoerrebroed-kortet.sql indsætter den gamle note, men KUN hvis
--  kategorien mangler — den skriver ikke den nye over.
--
--  Filen rammer kun kategorien "Håndmadder" hos Mosede, og kun rækker
--  til PRÆCIS 24 kr. — lun delle (25) og flæskesvær (35) står i andre
--  kategorier. Kan køres igen: anden kørsel rører intet.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================

begin;

-- ------------------------------------------------------------
--  0) SKRIV SOM EJEREN — ELLERS DØR FILEN TAVST
--     Samme greb som haandmadder-27-kr.sql: prisudløseren
--     `menu_vare_pris_ejer` spørger auth.jwt(), ikke databaserollen.
-- ------------------------------------------------------------
do $$
declare v_ejer text;
begin
  select a.email into v_ejer
    from public.admin_adgang a
   where a.lokation_id = 'mosede' and a.aktiv and a.rolle = 'ejer'
   order by a.email limit 1;

  if v_ejer is null then
    raise exception 'Ingen aktiv ejer i admin_adgang for mosede — filen kan ikke rette priserne. Opret ejeren under admin -> Personale foerst.';
  end if;

  perform set_config('request.jwt.claims',
                     json_build_object('email', v_ejer)::text, true);
end $$;

-- ------------------------------------------------------------
--  1) DE SLUKKEDE: 24 → 27
-- ------------------------------------------------------------
update public.menu_varer mv
   set pris = 27
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id
   and mk.lokation_id = 'mosede'
   and lower(btrim(mk.navn)) = 'håndmadder'
   and not mv.aktiv
   and mv.pris = 24;

-- ------------------------------------------------------------
--  2) NOTEN: HEL SKIVE, FRISKBAGT
-- ------------------------------------------------------------
update public.menu_kategorier
   set note = 'Hel skive friskbagt rugbrød med smør, smurt når du bestiller. '
           || 'Glutenfrit brød eller uden smør, bare sig til.'
 where lokation_id = 'mosede'
   and lower(btrim(navn)) = 'håndmadder'
   and note is distinct from
       'Hel skive friskbagt rugbrød med smør, smurt når du bestiller. '
       || 'Glutenfrit brød eller uden smør, bare sig til.';

commit;


-- ------------------------------------------------------------
--  RAPPORT (SQL Editor viser kun det sidste svar).
--  `haandmadder_til_24_skal_vaere_0` SKAL være 0.
-- ------------------------------------------------------------
select
  (select count(*) from public.menu_varer mv
     join public.menu_kategorier mk on mk.id = mv.kategori_id
    where mk.lokation_id = 'mosede' and lower(btrim(mk.navn)) = 'håndmadder'
      and mv.pris = 24)                             as haandmadder_til_24_skal_vaere_0,
  (select count(*) from public.menu_varer mv
     join public.menu_kategorier mk on mk.id = mv.kategori_id
    where mk.lokation_id = 'mosede' and lower(btrim(mk.navn)) = 'håndmadder'
      and not mv.aktiv and mv.pris = 27)            as slukkede_til_27,
  (select note from public.menu_kategorier
    where lokation_id = 'mosede' and lower(btrim(navn)) = 'håndmadder')
                                                    as ny_note;
