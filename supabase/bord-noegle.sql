-- ============================================================
--  EN NØGLE PR. BORD — SÅ EN QR-KODE IKKE BARE ER ET TAL
--  (30. august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER bordkort.sql, restaurant.sql og bord-loft.sql.
--  Filen kan køres igen uden at ødelægge noget.
--
--  ------------------------------------------------------------
--  HVOR DEN KOMMER FRA
--  ------------------------------------------------------------
--  Kundens spørgsmål 30/8: "er QR-koderne sikre? De peger på et
--  link — hvad hvis nogen har gemt url'en og pludselig begynder
--  at bestille hjemmefra, eller vil fucke med cafeen og bestille
--  en masse? Hvordan sikrer vi, at folk ikke bare kan taste
--  url'en ind, men faktisk skal scanne?"
--
--  Han har fat i noget rigtigt. Adressen var
--
--      …/ved-bordet/?bord=7
--
--  og "7" er et tal mellem 1 og 55. Enhver, der havde set ÉN
--  kode, kunne gætte de 54 andre — og siden viste endda en liste
--  over alle bordene, hvis nummeret ikke passede. Det var ikke
--  en lås; det var et skilt.
--
--  ------------------------------------------------------------
--  ⚠️ HVAD DET HER LØSER — OG HVAD DET IKKE LØSER
--  ------------------------------------------------------------
--  En QR-kode ER et link. Uanset hvad der står i den, kan den
--  telefon, der scannede, gemme adressen og bruge den igen fra
--  sofaen. INTET, der kan stå i en adresse, beviser, at nogen
--  står ved bordet lige nu. Den, der påstår andet, sælger en
--  følelse af sikkerhed.
--
--  Det her flytter derfor grænsen ét sted hen, hvor den betyder
--  noget: fra "kan gætte et tal" til "har været ved bordet".
--
--    · Gættet dør.       32^6 = 1,07 mia. i stedet for 1-55.
--    · Misbrug bliver    Ejeren giver bordet en ny nøgle med ét
--      lukket.           tryk. Den gamle adresse er død i samme
--                        sekund — ét skilt printes om, ikke 55.
--    · Nøglen kan ikke   anon må ikke læse kolonnen (kolonne-
--      læses ud.         rettigheder nedenfor). Gæsten kan altså
--                        ikke hente listen og selv lave links.
--
--  Og det, der i praksis beskytter cafeen mest, er der i
--  forvejen: DER BETALES IKKE NOGET STED. En falsk bestilling
--  koster ingen penge — den koster den mad, køkkenet når at lave,
--  og køkkenet ser "Bord 7" på kortet, mens bord 7 står tomt to
--  meter væk. Afvis er ét tryk. Dertil kommer loftet pr. kvarter
--  (bord-loft.sql) og at et bord kan slukkes i admin.
--
--  ⚠️ ÆRLIGT OM DET SIDSTE HUL: en nøgle kan gættes ved at prøve
--  sig frem over API'et. 1,07 mia. forsøg er ikke realistisk for
--  en cafe — men det er ikke NUL, og et afvist forsøg efterlader
--  ingen række, så loftet pr. kvarter tæller det ikke. Skal det
--  lukkes helt, skal der logges forsøg, og det er en anden fil.
--
--  ------------------------------------------------------------
--  MIGRERINGEN ER MED VILJE TOM
--  ------------------------------------------------------------
--  Filen giver INGEN borde en nøgle. Gjorde den det, ville alle
--  55 skilte på bordene holde op med at virke i det sekund, den
--  blev kørt — midt i en frokost.
--
--  Uden nøgle opfører bordet sig præcis som i dag. Ejeren giver
--  bordene nøgler med ét tryk i admin → Borde, NÅR han er klar
--  til at printe skiltene om. Han skal alligevel printe dem om,
--  når domænet er sat op.
-- ============================================================

do $$
begin
  if not exists (select 1 from public.lokationer where id = 'mosede') then
    raise exception 'Forkert projekt: lokationen "mosede" findes ikke her. Kører du i spiis-projektet?';
  end if;
end $$;

-- ------------------------------------------------------------
--  1) KOLONNEN
-- ------------------------------------------------------------
alter table public.borde add column if not exists kode text;

comment on column public.borde.kode is
  'Nøglen i bordets QR-kode (?n=…). Tom = bordet er som før: nummeret alene er nok. anon MÅ IKKE kunne læse den.';

-- Nøglen skal kunne skrives af med øjnene fra et skilt, hvis en
-- kode er kradset. Derfor ingen 0/O og ingen 1/I/L, og kun
-- store bogstaver — 32 tegn, 6 lange, 1,07 mia. muligheder.
alter table public.borde drop constraint if exists borde_kode_form_ok;
alter table public.borde add constraint borde_kode_form_ok
  check (kode is null or kode ~ '^[2-9A-HJ-NP-Z]{6,32}$');

-- To borde med samme nøgle ville betyde, at ét skilt åbnede to
-- borde — og køkkenet ville bære maden hen til det forkerte.
create unique index if not exists borde_kode_unik
  on public.borde (lokation_id, kode) where kode is not null;

-- ------------------------------------------------------------
--  2) DEN AFLEDTE SANDHED, GÆSTEN GERNE MÅ SE
-- ------------------------------------------------------------
--  Siden skal kunne sige "scan koden igen" FØR gæsten har fyldt
--  en hel kurv — ellers får hun først nej ved afsendelsen.
--
--  ⚠️ MEN DEN MÅ IKKE VÆRE EN ANDEN UDGAVE AF REGLEN. Derfor er
--  det ikke et flueben, nogen sætter: det er kolonnen selv, set
--  udefra som ja/nej. Ét sted at rette, og de to kan ikke skride
--  fra hinanden.
alter table public.borde drop column if exists har_kode;
alter table public.borde add column har_kode boolean
  generated always as (kode is not null) stored;

comment on column public.borde.har_kode is
  'Afledt af kode. Gæstesiden læser den for at vide, om bordet kræver en nøgle — selve nøglen ser den aldrig.';

-- ------------------------------------------------------------
--  3) ANON MÅ IKKE LÆSE NØGLEN
-- ------------------------------------------------------------
--  Det her er hele værnets fundament. Kunne gæsten hente
--  borde-listen med koderne i, kunne hun selv bygge de 55
--  adresser — og så var nøglen en dekoration.
--
--  ⚠️ EFTER DET HER FEJLER "select=*" FOR EN GÆST med 42501.
--  js/store.js beder derfor om kolonnerne ved navn, når det er
--  gæsten, der spørger. Køres bordkort.sql igen bagefter, giver
--  den anon hele tabellen tilbage — kør så DEN HER fil igen.
--  er-vi-klar.sql tjek 118 fanger det.
revoke select on public.borde from anon;
grant select (id, lokation_id, nummer, pladser, placering, aktiv,
              sortering, zone, har_kode, oprettet, aendret)
  on public.borde to anon;

-- Personalet er logget ind og skal kunne læse og sætte nøglen —
-- ellers kan skiltene ikke printes.
grant select, insert, update, delete on public.borde to authenticated;

-- ------------------------------------------------------------
--  4) NØGLEN SKAL PASSE, FØR BESTILLINGEN TAGES IMOD
-- ------------------------------------------------------------
--  Browseren må gerne sige det pænt. Den må bare ikke være den
--  eneste, der ved det: enhver med anon-nøglen kan sende en
--  bestilling uden om siden.
alter table public.bestillinger add column if not exists bord_kode text;

comment on column public.bestillinger.bord_kode is
  'Nøglen fra QR-koden. Læses af værnet og NULSTILLES samme sted — den må aldrig blive liggende i en tabel, personalet læser, eller i sikkerhedskopien.';

create or replace function public.mosede_bord_noegle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kode text;
  v_fandt boolean;
begin
  -- Mad ud af huset har intet bord og ingen nøgle.
  if new.bord_nummer is null then
    new.bord_kode := null;
    return new;
  end if;

  select b.kode, true into v_kode, v_fandt
    from public.borde b
   where b.lokation_id = new.lokation_id
     and lower(btrim(b.nummer)) = lower(btrim(new.bord_nummer))
   limit 1;

  /* Et bord, der ikke findes, er ikke det her værns sag —
     bordkort.sql afviser det allerede, og to værn, der siger nej
     til det samme med hver sin besked, gør fejlen sværere at
     læse, ikke lettere. */
  if not coalesce(v_fandt, false) then
    new.bord_kode := null;
    return new;
  end if;

  /* ⚠️ INTET KRAV, FØR EJEREN HAR GIVET BORDET EN NØGLE. Ellers
     ville filen lukke alle 55 skilte i det sekund, den blev
     kørt. */
  if v_kode is null then
    new.bord_kode := null;
    return new;
  end if;

  if new.bord_kode is null or btrim(new.bord_kode) = '' then
    raise exception 'bord_kode_mangler';
  end if;

  if upper(btrim(new.bord_kode)) <> upper(btrim(v_kode)) then
    raise exception 'bord_kode_forkert';
  end if;

  /* GEMMES ALDRIG. Stod nøglen i rækken, ville den stå på
     personalets skærm, i sikkerhedskopien fra Historik og i
     enhver eksport — og så var den ikke længere en nøgle. */
  new.bord_kode := null;
  return new;
end $$;

comment on function public.mosede_bord_noegle() is
  'Bordets nøgle skal passe, før en bestilling fra bordet tages imod. Uden nøgle på bordet: som før.';

drop trigger if exists bestilling_bord_noegle on public.bestillinger;
create trigger bestilling_bord_noegle
  before insert on public.bestillinger
  for each row execute function public.mosede_bord_noegle();

-- Opslaget sker på hver eneste bordbestilling.
create index if not exists borde_nummer_opslag_idx
  on public.borde (lokation_id, lower(btrim(nummer)));

-- ------------------------------------------------------------
--  RAPPORT
-- ------------------------------------------------------------
select
  (select count(*) from public.borde where lokation_id = 'mosede')            as borde_i_alt,
  (select count(*) from public.borde where lokation_id = 'mosede'
     and kode is not null)                                                    as har_noegle,
  (select count(*) from public.borde where lokation_id = 'mosede'
     and kode is null)                                                        as mangler_noegle,
  'Ingen nøgler er sat af filen — det ville lukke alle skilte med det samme. '
  'Giv bordene nøgler i admin → Borde → "Lås QR-koderne", og PRINT SKILTENE OM bagefter.' as naeste_skridt;
