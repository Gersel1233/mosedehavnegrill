-- ============================================================
--  HVAD LIGGER DER EGENTLIG?   (6. september 2026)
-- ============================================================
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kundens ord: "kan vi lave en sql der rydder shittet og gør de
--  helt klar til brug."
--
--  ⚠️ DEN HER FIL RYDDER INGENTING. Den er den halvdel, der skal
--  komme FØRST: en liste over, hvad der faktisk står i de fem
--  gæstetabeller, så du kan SE, hvad der er dine egne prøver fra
--  byggeperioden, og hvad der er en rigtig gæst.
--
--  Grunden er ligefrem: jeg kan ikke læse dine bestillinger
--  herfra. Adgangsreglerne lukker anon-nøglen ude af dem — det er
--  hele meningen — så en oprydningsfil, der selv besluttede hvad
--  der var "prøvedata", ville gætte på en database i drift. Der
--  ligger en rigtig bestilling fra den 19. august i den, sendt af
--  en gæst.
--
--  Så: kør den her, kig på listen, og sæt datoen i
--  supabase/ryd-proevedata.sql bagefter.
--
--  ⚠️ SUPABASES SQL EDITOR VISER KUN DEN SIDSTE SÆTNINGS SVAR.
--  Derfor er hele filen ÉN forespørgsel med afsnit i, og ikke syv
--  små — ellers ser du kun den nederste.
-- ============================================================

with

-- ------------------------------------------------------------
--  1) MÅNED FOR MÅNED, TABEL FOR TABEL
--     Det er her, skellet plejer at være til at se: byggeperioden
--     er en klump i august, og driften begynder, da domænet kom op.
-- ------------------------------------------------------------
maaneder as (
  select 'bestillinger'   as tabel, to_char(hent_dato, 'YYYY-MM') as maaned,
         count(*) as raekker, count(*) filter (where slettet is not null) as i_skraldespanden,
         min(hent_dato)::text as foerste, max(hent_dato)::text as sidste
    from public.bestillinger where lokation_id = 'mosede' group by 1, 2
  union all
  select 'bordbestillinger', to_char(dato, 'YYYY-MM'),
         count(*), count(*) filter (where slettet is not null),
         min(dato)::text, max(dato)::text
    from public.bordbestillinger where lokation_id = 'mosede' group by 1, 2
  union all
  select 'forespoergsler', to_char(oprettet, 'YYYY-MM'),
         count(*), count(*) filter (where slettet is not null),
         min(oprettet)::date::text, max(oprettet)::date::text
    from public.forespoergsler where lokation_id = 'mosede' group by 1, 2
  union all
  select 'udlejninger', to_char(dato, 'YYYY-MM'),
         count(*), count(*) filter (where slettet is not null),
         min(dato)::text, max(dato)::text
    from public.udlejninger where lokation_id = 'mosede' group by 1, 2
  union all
  select 'reservationer', to_char(oprettet, 'YYYY-MM'),
         count(*), count(*) filter (where slettet is not null),
         min(oprettet)::date::text, max(oprettet)::date::text
    from public.reservationer where lokation_id = 'mosede' group by 1, 2
),

-- ------------------------------------------------------------
--  2) DE ENKELTE RÆKKER I BESTILLINGER
--     Navn og reference, så du kan genkende dine egne. Højst 60 —
--     står der flere, er det ikke en liste, man læser, og så er
--     månedstabellen ovenfor svaret i stedet.
--
--  ⚠️ TELEFONNUMRE OG MAILADRESSER STÅR IKKE HER. Rapporten er
--  til at afgøre "prøve eller rigtig" på, og det kan afgøres på
--  navn, dato og reference. Et nummer mere på skærmen er et
--  nummer, der kan blive skærmbillede.
-- ------------------------------------------------------------
raekker as (
  select row_number() over (order by hent_dato, id) as nr,
         hent_dato::text as dato, coalesce(nummer::text, '—') as nr_paa_kortet,
         reference, navn, status,
         case when slettet is not null then 'i skraldespanden' else '' end as note
    from public.bestillinger
   where lokation_id = 'mosede'
   order by hent_dato, id
   limit 60
),

-- ------------------------------------------------------------
--  3) DET, DER ER LET AT GENKENDE SOM PRØVE
--     Demo-filens egne referencer og de telefonnumre, den bruger.
--     Står der noget her, er ryd-demo.sql svaret — ikke datoen.
-- ------------------------------------------------------------
demo as (
  select count(*) as bestillinger
    from public.bestillinger
   where lokation_id = 'mosede' and reference like 'SM-DEMO-%'
),
demo2 as (
  select (select count(*) from public.forespoergsler
           where lokation_id = 'mosede' and reference like 'FO-DEMO-%') as forespoergsler,
         (select count(*) from public.bordbestillinger
           where lokation_id = 'mosede' and reference like 'BO-DEMO-%') as borde,
         (select count(*) from public.udlejninger
           where lokation_id = 'mosede' and reference like 'UD-DEMO-%') as udlejninger
),

-- ------------------------------------------------------------
--  4) DET, DER IKKE ER GÆSTEDATA, MEN SOM OGSÅ BÆRER
--     BYGGEPERIODEN MED SIG
-- ------------------------------------------------------------
--
--  ⚠️ COALESCE UDEN OM HELE UNDERFORESPØRGSLEN, ikke inde i den.
--  Findes der ingen række i `bestillingsnumre` — og det gør der
--  ikke, før den første bestilling er sendt — svarer
--  `(select coalesce(naeste,0) ...)` med NULL og ikke med 0, fordi
--  der ikke er nogen række at regne på. Og `'tekst' || NULL` er
--  NULL, så HELE linjen forsvandt ud af rapporten. Målt: afsnittet
--  "RESTEN" stod tomt, første gang filen blev kørt.
resten as (
  select (select count(*) from public.logbog where lokation_id = 'mosede') as logbog,
         coalesce((select naeste from public.bestillingsnumre
                    where lokation_id = 'mosede'), 0) as naeste_bestillingsnummer,
         coalesce((select naeste from public.bordnumre
                    where lokation_id = 'mosede'), 0) as naeste_bordnummer,
         (select count(*) from public.borde where lokation_id = 'mosede') as borde_oprettet,
         (select count(*) from public.borde
           where lokation_id = 'mosede' and har_kode) as borde_med_qr_noegle
)

-- ------------------------------------------------------------
--  RAPPORTEN
-- ------------------------------------------------------------
select afsnit, linje from (
  select 0 as sorter, 0 as nr, '── MÅNED FOR MÅNED ──' as afsnit,
         'tabel · måned · rækker (heraf i skraldespanden) · fra → til' as linje
  union all
  select 1, row_number() over (order by tabel, maaned), tabel,
         maaned || ' · ' || raekker || ' rækker'
         || case when i_skraldespanden > 0
                 then ' (' || i_skraldespanden || ' i skraldespanden)' else '' end
         || ' · ' || foerste || ' → ' || sidste
    from maaneder

  union all select 2, 0, '── BESTILLINGERNE ──',
    'de første 60, ældst først — kig efter dine egne prøvenavne'
  union all
  select 3, nr, 'nr. ' || nr,
         dato || ' · #' || nr_paa_kortet || ' · ' || reference
         || ' · ' || navn || ' · ' || status
         || case when note <> '' then ' · ' || note else '' end
    from raekker

  union all select 4, 0, '── DEMO-INDHOLD ──',
    case when (select bestillinger from demo)
              + (select forespoergsler + borde + udlejninger from demo2) > 0
         then 'JA, der ligger demo-rækker — kør supabase/ryd-demo.sql'
         else 'ingen demo-rækker (SM-DEMO-/FO-DEMO-/BO-DEMO-/UD-DEMO-)' end

  union all select 5, 0, '── RESTEN ──',
    'logbog: ' || (select logbog from resten) || ' linjer'
    || ' · næste bestillingsnummer: #' || lpad((select (naeste_bestillingsnummer + 1)::text from resten), 4, '0')
    || ' · næste booking: #' || lpad((select (naeste_bordnummer + 1)::text from resten), 4, '0')
    || ' · borde: ' || (select borde_oprettet from resten)
    || ' (' || (select borde_med_qr_noegle from resten) || ' med QR-nøgle)'

  union all select 6, 0, '── SÅDAN GØR DU ──',
    '1) Er der demo-rækker: kør supabase/ryd-demo.sql. '
    || '2) Find den dato, hvor DIN prøvning holdt op og driften begyndte. '
    || '3) Sæt den i supabase/ryd-proevedata.sql og kør den. '
    || 'Den sletter til SKRALDESPANDEN, så alt kan hentes tilbage i 30 dage under Historik.'
) r
order by sorter, nr;
