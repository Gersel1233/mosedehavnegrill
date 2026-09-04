-- ============================================================
--  FRAGTEN SOM TAL, OG MINDST FIRE SMØRREBRØD  (3. sep 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  ⚠️ INGEN NYE KOLONNER OG INGEN NYE TABELLER. `indstillinger`
--  er nøgle/værdi, så det her er tre rækker med data. Filen kan
--  køres igen.
--
--  ------------------------------------------------------------
--  HVOR DEN KOMMER FRA
--  ------------------------------------------------------------
--  Kundens ord 3/9: *"regner fragten oveni plus maden som står og
--  eventuelt emballage ligesom de gør på normal
--  bestillingssiden"*, og *"man skal minimum bestille 4 smørrebrød,
--  så det skal stå som default og ikke må kunne gå under"*.
--
--  ⚠️ TALLET HIVES UD AF SÆTNINGEN — OG DET ER MED VILJE ÉT FELT.
--  `leverings_pris` har siden 1/9 været prosa til gæsten:
--
--      "79 kr. — er ordren under 200 kr., aftaler vi det over
--       telefonen"
--
--  Læste koden tallet ud af den sætning, ville en rettelse af
--  teksten ændre fragten tavst, eller få den til at forsvinde. To
--  udgaver af den samme regel er husets dyreste mønster (varsel,
--  tegn, adresser). Derfor `leverings_gebyr`, som er et tal og kun
--  et tal — og sætningen bliver ved med at være en sætning.
--
--  ⚠️ OG 200-KRONERS-REGLEN GÆLDER IKKE LÆNGERE. Kundens ord:
--  *"det passer ikke længere, det er ligegyldigt hvad størrelse
--  ordren er ift 200 kroner"*. Sætningen er rettet med.
-- ============================================================

-- ------------------------------------------------------------
--  1) FRAGTEN SOM TAL
--     ⚠️ 79 kr. er ejerens eget, oplyst 1/9 og bekræftet 3/9.
--     Vi finder ikke på et tal på forretningens vegne.
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
values ('mosede', 'leverings_gebyr', to_jsonb(79), now())
on conflict (lokation_id, noegle)
  do update set vaerdi = excluded.vaerdi, aendret = now();

-- ------------------------------------------------------------
--  2) OMRÅDET SOM POSTNUMRE
--     Ishøj 2635 · Greve 2670 · Solrød Strand 2680 ·
--     Karlslunde 2690 · Tune 4030 · Ll. Skensved 4623 · Køge 4600
--
--     ⚠️ ET POSTNUMMER UDENFOR ER IKKE ET NEJ. Ejeren skriver selv
--     "længere ude efter aftale", så siden siger, at det aftales
--     over telefonen. Et blankt afslag ville sende en kunde væk,
--     forretningen gerne ville have haft.
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
values ('mosede', 'leverings_postnr',
        to_jsonb(array[2635, 2670, 2680, 2690, 4030, 4600, 4623]), now())
on conflict (lokation_id, noegle)
  do update set vaerdi = excluded.vaerdi, aendret = now();

-- ------------------------------------------------------------
--  3) SÆTNINGEN UDEN 200-KRONERS-REGLEN
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
values ('mosede', 'leverings_pris',
        to_jsonb('79 kr. uanset ordrens størrelse'::text), now())
on conflict (lokation_id, noegle)
  do update set vaerdi = excluded.vaerdi, aendret = now();

-- ------------------------------------------------------------
--  4) MINDST FIRE SMØRREBRØD
--     ⚠️ REGLEN GÆLDER KUN SMØRREBRØD (30/8: "det er en fejl, det
--     er kun smørrebrød") og ALDRIG ved bordet — én is ved bord 7
--     er ikke for lidt. Begge dele står i
--     js/bestil-regler.js minStkMangler og js/bestilling.js.
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
values ('mosede', 'bestilling_min_stk', to_jsonb(4), now())
on conflict (lokation_id, noegle)
  do update set vaerdi = excluded.vaerdi, aendret = now();

-- ------------------------------------------------------------
--  Editoren viser kun den sidste sætnings svar.
-- ------------------------------------------------------------
select
  noegle,
  vaerdi
from public.indstillinger
where lokation_id = 'mosede'
  and noegle in ('leverings_gebyr', 'leverings_postnr',
                 'leverings_pris', 'bestilling_min_stk')
order by noegle;
