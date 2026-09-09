-- ============================================================
--  EJERENS EGNE OPLYSNINGER  (1. september 2026)
-- ============================================================
--  Fra det håndskrevne svarark (punkt G og H) og Mikkels
--  præciseringer 1/9. Alle fem ting har stået tomme eller
--  forkerte på siden, og hver af dem er noget, en gæst kan
--  handle på:
--
--    · adressen: se afsnit 1 — den er 20I igen fra 9/9
--    · hovedmailen fandtes ikke; arket skrev "Bestilling@" uden
--      domæne, og Mikkel oplyste den hele
--    · de tre sociale profiler stod tomme, så linkene blev
--      fjernet fra siden af sig selv (js/skal/kontakt.js)
--    · levering var slået FRA, fordi vi ikke vidste hvad, hvor
--      og hvad det kostede. Nu gør vi
--
--  ⚠️ FILEN SÆTTER KUN DET, EJEREN HAR OPLYST PÅ SKRIFT. Der er
--  ingen gættede tal, og felter, han ikke har svaret på (Google-
--  profilen), står stadig tomme — et link til en profil, vi ikke
--  har set, er en blindgyde for både gæster og Google.
--
--  ⚠️ OG DEN KAN KØRES IGEN. Retter ejeren en adresse i admin
--  bagefter, skriver filen den TILBAGE, hvis den køres en gang
--  til. Kør den én gang; derefter er admin stedet.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================

begin;

create temporary table oplys_rapport (nr int, hvad text, resultat text);
truncate oplys_rapport;

-- ------------------------------------------------------------
--  1) ADRESSEN — 20I, bogstavet I som i Ida
--
--  ⚠️ RETTET 9/9, OG DET ER TREDJE GANG NUMMERET SKIFTER.
--  Filen skrev 20L, fordi ejeren skrev det med hånden på
--  svararket, og Mikkel bekræftede det ordret ("alt skal passe,
--  det er 20l/L"). Så kom ÅRSRAPPORTEN for 2020, indleveret til
--  Erhvervsstyrelsen: den skriver "Havnevej 20I". Mikkel fik
--  konflikten forelagt og afgjorde: "ja ændrer til 20i".
--
--  ⚠️ ET DOKUMENT SLÅR ET HÅNDSKREVET ARK: årsrapportens adresse
--  er den, en gæst finder, hvis hun slår CVR-nummeret op, og to
--  husnumre om den samme dør er én for meget.
--
--  ⚠️ OG DERFOR SKULLE FILEN HER MED. Den ER kørt (2/9), og den
--  kan køres igen — stod der stadig 20L, ville et nyt gennemløb
--  skrive det gamle nummer tilbage over ejerens rettelse. Det er
--  nøjagtig arret fra forespoergsler.sql, som skrev det gamle
--  telefonkrav tilbage.
--  Historikken: 23/8 20I · 1/9 20L · 9/9 20I.
-- ------------------------------------------------------------
with r as (
  update public.lokationer
     set adresse = 'Havnevej 20I', postnr = '2670', by = 'Greve'
   where id = 'mosede'
     and (adresse is distinct from 'Havnevej 20I'
       or postnr is distinct from '2670' or by is distinct from 'Greve')
  returning id)
insert into oplys_rapport select 1, 'Adressen sat til Havnevej 20I',
  case when exists (select 1 from r) then 'rettet' else 'stod rigtigt' end;

-- ------------------------------------------------------------
--  2) OPLYSNINGERNE — ét sted, som nøgle/værdi
--
--     ⚠️ MINDSTEBELØBET STÅR I TEKSTEN OG ER IKKE ET VÆRN.
--     Ejeren skrev "200,- kr. ELLERS AFTALES". Altså er de 200
--     ikke en grænse, der må afvise en bestilling — det er dét,
--     de normalt siger ja til, og under det tager de en snak.
--     Et hårdt værn ville afvise en ordre, forretningen gerne
--     ville have haft.
--
--     ⚠️ OG OMRÅDET ER EJERENS EGNE BYER. Arket rettede vores
--     "Karslunde, Greve, Tune, Solrød og omegn" til "Ishøj —
--     Køge" med "længere efter aftale" ved siden af.
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
values
  ('mosede', 'kontakt_email',
   to_jsonb('kontakt@mosedehavnecafe.dk'::text), now()),
  ('mosede', 'social_facebook',
   to_jsonb('https://www.facebook.com/348833738552801/'::text), now()),
  ('mosede', 'social_instagram',
   to_jsonb('https://www.instagram.com/mosedehavnegrillogishus/'::text), now()),
  ('mosede', 'social_tiktok',
   to_jsonb('https://www.tiktok.com/@mosede.havn.gril'::text), now()),
  ('mosede', 'levering', to_jsonb(true), now()),
  ('mosede', 'leverings_omraade',
   to_jsonb('Ishøj, Greve, Karslunde, Tune, Solrød og Køge — længere ude efter aftale'::text),
   now()),
  ('mosede', 'leverings_pris',
   to_jsonb('79 kr. — er ordren under 200 kr., aftaler vi det over telefonen'::text),
   now()),
  /* ⚠️ CVR ER LOVPLIGTIGT (e-handelsloven § 7) OG KOM 9/9.
     Tallet står på årsrapporten for 2020, som Mikkel sendte —
     det er ikke gættet, og et forkert tastet CVR peger på en
     ANDEN virksomhed. Cifrene alene: js/skal/kontakt.js kræver
     præcis otte og sætter selv mellemrummene, og rækken på
     persondatasiden er skjult, så længe rubrikken er tom. */
  ('mosede', 'cvr', to_jsonb('40266747'::text), now())
on conflict (lokation_id, noegle) do update
  set vaerdi = excluded.vaerdi, aendret = now();

insert into oplys_rapport values
  (2, 'Hovedmailen sat', 'kontakt@mosedehavnecafe.dk'),
  (3, 'Facebook, Instagram og TikTok sat', '3 links (uden sporingshaler)'),
  (4, 'Levering slået TIL', '79 kr. · Ishøj-Køge · under 200 kr. aftales'),
  (5, 'CVR sat (lovpligtigt)', '40 26 67 47 — fra årsrapporten');

-- ------------------------------------------------------------
--  3) RAPPORTEN — og det, ejeren stadig mangler at svare på
-- ------------------------------------------------------------
insert into oplys_rapport
select 10, 'Adressen står nu som', adresse || ' · ' || postnr || ' ' || by
  from public.lokationer where id = 'mosede';

insert into oplys_rapport
select 11, '❓ Google-profilen står stadig tom',
       'linket vises ikke paa siden, foer der staar en adresse i admin'
 where not exists (
   select 1 from public.indstillinger
    where lokation_id = 'mosede' and noegle = 'social_google'
      and btrim(vaerdi #>> '{}') <> '');

commit;

select nr, hvad, resultat from oplys_rapport order by nr;
