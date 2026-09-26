-- ============================================================
--  HÅNDMADDERNE KOSTER 27 KR.  (26. september 2026)
-- ============================================================
--  Mikkels ord, ordret: *"I den oprindelige oversigt over chefens
--  rettelser står der, at almindelige håndmadder skal koste 27 kr.
--  – ikke 24 kr. Undtagelserne er lun delle til 25 kr. og
--  flæskesvær til 35 kr."* Og: *"Ret priserne i databasen, så både
--  onlinebestillingen og det nye menukort viser de korrekte beløb."*
--
--  Kort 04 HÅNDMADDER siger det samme: "Alle varianter 27,-".
--
--  ⚠️ DET HER TAGER EN AFGØRELSE TILBAGE. 25/9 stod der i
--  vaerktoej/kortene.py (AFGJORT) og i docs/HISTORIK.md: *"24
--  gælder — kortbilledet er forkert."* Den er afløst af beskeden
--  ovenfor, og AFGJORT er tømt, så rapporten igen siger det højt,
--  hvis databasen og kortet er uenige.
--
--  ⚠️ FILEN RAMMER KUN:
--    · kategorien "Håndmadder" hos Mosede
--    · AKTIVE rækker, der koster PRÆCIS 24 kr.
--  ⚠️ DE 6 SLUKKEDE HÅNDMADDER TIL 24 RØRES IKKE. Mikkels ord: *"Foretag
--  ingen yderligere prisændringer uden at gøre mig opmærksom på dem."*
--  De står ikke på kortet og kan ikke bestilles; tændes en af dem en
--  dag i admin, har den stadig 24 — og så siger rapporten det.
--  Lun delle (25) og flæskesvær (35) står i andre kategorier og
--  har andre priser — de røres ikke. Har ejeren selv sat en anden
--  pris på en håndmad i admin, står den også.
--
--  Målt 26/9 med anon-nøglen (vaerktoej/hent-menukort.sh): 19
--  aktive håndmadder til 24 kr. — de samme 19, som kortet sætter til
--  27 — og 6 slukkede, også til 24.
--
--  Kan køres igen: anden kørsel finder ingen til 24 og rører intet.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================

begin;

-- ------------------------------------------------------------
--  0) SKRIV SOM EJEREN — ELLERS DØR FILEN TAVST
--     En pris må kun rettes af en ejer (udløseren
--     `menu_vare_pris_ejer` fra roller.sql spørger auth.jwt(), ikke
--     databaserollen — så heller ikke `postgres` i SQL Editoren
--     slipper igennem). E-mailen LÆSES af admin_adgang.
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
--  1) 24 → 27
-- ------------------------------------------------------------
update public.menu_varer mv
   set pris = 27
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id
   and mk.lokation_id = 'mosede'
   and lower(btrim(mk.navn)) = 'håndmadder'
   and mv.aktiv
   and mv.pris = 24;

commit;


-- ------------------------------------------------------------
--  RAPPORT. Supabases SQL Editor viser kun den SIDSTE sætnings
--  svar — derfor ét select til sidst.
--
--  `aktive_til_24_skal_vaere_0` SKAL være 0 og
--  `aktive_til_27_skal_vaere_19` 19. Lun delle og flæskesvær skal
--  stadig være 25 og 35.
-- ------------------------------------------------------------
select
  (select count(*) from public.menu_varer mv
     join public.menu_kategorier mk on mk.id = mv.kategori_id
    where mk.lokation_id = 'mosede' and lower(btrim(mk.navn)) = 'håndmadder'
      and mv.aktiv and mv.pris = 24)                as aktive_til_24_skal_vaere_0,
  (select count(*) from public.menu_varer mv
     join public.menu_kategorier mk on mk.id = mv.kategori_id
    where mk.lokation_id = 'mosede' and lower(btrim(mk.navn)) = 'håndmadder'
      and mv.aktiv and mv.pris = 27)                as aktive_til_27_skal_vaere_19,
  (select string_agg(distinct mv.navn || ' ' || mv.pris::text, ' · ')
     from public.menu_varer mv
     join public.menu_kategorier mk on mk.id = mv.kategori_id
    where mk.lokation_id = 'mosede'
      and lower(btrim(mv.navn)) in ('lun delle eller steg', 'hjemmelavet flæskesvær'))
                                                    as lun_delle_og_svaer_uroert,
  'Kør derefter: vaerktoej/hent-menukort.sh og vaerktoej/sammenlign-kort.py'
                                                    as naeste_skridt;
