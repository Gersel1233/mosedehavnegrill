-- ============================================================
--  KVITTERINGEN, DER LEVER  (4/9)
--  ----------------------------------------------------------
--  ⚠️ Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--     Mosede er epwyjzakvvbxtpvnhvbn. Kør EFTER
--     bestillingsnummer.sql.
--
--  Kundens ord: systemet skal være "dygtigere, mere intelligent
--  og generelt bedre".
--
--  MÅLT, FØR filen blev skrevet: gæsten hører ikke ét ord, efter
--  hun har trykket send. Kvitteringen lever kun i den fane, hun
--  står i — lukker hun den, er den væk, og der findes ingen
--  adresse, hun kan vende tilbage til. Ved bordet får hun
--  "vi kommer med det" og så stilhed.
--
--  Og det værste: **Afvis er et telefonopkald, nogen skal huske.**
--  Kan køkkenet ikke lave maden, står beskeden på personalets
--  skærm — ikke på gæstens. Med den her fil kan hun SE det.
--
--  ⚠️ GÆSTEN MÅ STADIG IKKE LÆSE TABELLEN. Det her er præcis
--  samme greb som mosede_bestillingsnummer(ref): en security
--  definer-funktion, der kun svarer på en reference, man HAR.
--  Adgangsreglen på `bestillinger` er URØRT — gæsten kan skrive,
--  men ikke læse, som hun har kunnet siden fase 0.
--
--  ⚠️ HVAD DEN SVARER MED, OG HVAD DEN ALDRIG GØR.
--  Med: nummer, status, dag, tid, bord, hvordan, antal og
--  linjerne. Altså dét, gæsten selv har skrevet, plus hvor langt
--  maden er.
--
--  ⚠️ Der er INGEN i_alt-kolonne — MÅLT i produktionen, ikke
--  læst: `bestillinger?select=i_alt` svarer 42703. Summen regnes
--  af linjerne, som den gør alle andre steder i huset, og det er
--  rigtigt: ét sted at regne, ikke to der kan blive uenige.
--  ALDRIG: navn, telefon, e-mail, besked eller
--  **leverings_adresse**. Den sidste er hendes hjemmeadresse, og
--  en adresse, der kan hentes med en reference, er en adresse,
--  der kan hentes af den, der finder en kvittering på gaden.
--  Personalets `intern_note` er heller ikke med — den er
--  personalets.
--
--  ⚠️ TIDSVINDUET FØLGER HENTEDAGEN, IKKE OPRETTELSEN.
--  mosede_bestillingsnummer har en time, fordi den kun skal nå
--  at fylde ét tal i en kvittering, der står på skærmen. Den her
--  skal virke, mens gæsten VENTER — og hun kan have bestilt
--  fredag til søndag. Derfor hentedagen plus dagen efter: en
--  reference, der bliver fundet om en måned, svarer ingenting.
--
--  ⚠️ OG EN SLETTET RÆKKE SVARER INGENTING. Skraldespanden er en
--  dato i `slettet`; en bestilling, personalet har lagt væk, må
--  ikke blive ved med at kunne følges.
--
--  ⚠️ DET ENE HUL STÅR ÅBENT MED VILJE, som ved bordets nøgle:
--  en reference kan gættes ved at prøve sig frem. Suffikset er
--  fem tegn ud af 32 (KODETEGN i js/store.js) = 33,5 mio.
--  kombinationer, OG datoen skal passe. Det, en gætter ville
--  vinde, er at se en fremmeds ordrenummer og hvad der er
--  bestilt — ikke hvem hun er, hvor hun bor eller hvad hun
--  hedder. Skal det lukkes helt, skal der logges opslag, og det
--  er en anden fil.
-- ============================================================

create or replace function public.mosede_bestilling_status(ref text)
returns table (
  nummer integer,
  status text,
  hent_dato date,
  hent_tid time,
  bord_nummer text,
  hvordan text,
  antal integer,
  linjer jsonb
)
language sql
security definer
set search_path = ''
stable
as $$
  select b.nummer, b.status, b.hent_dato, b.hent_tid,
         b.bord_nummer, b.hvordan, b.antal, b.linjer
    from public.bestillinger b
   where b.reference = ref
     and b.slettet is null
     and b.hent_dato >= current_date - 1
   limit 1;
$$;

grant execute on function public.mosede_bestilling_status(text)
  to anon, authenticated;

comment on function public.mosede_bestilling_status(text) is
  'Gæstens eget opslag på sin bestilling. Svarer kun på en reference, man HAR, kun til dagen efter hentedagen, og aldrig med navn, telefon, mail eller leveringsadresse.';

-- ------------------------------------------------------------
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar, så
--  rapporten skal være et select til sidst.
-- ------------------------------------------------------------
select
  'bestilling-status er på plads' as resultat,
  (select count(*) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'mosede_bestilling_status') as funktionen_findes,
  (select p.prosecdef from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'mosede_bestilling_status') as er_security_definer;
