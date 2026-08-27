-- ============================================================
--  NYHEDER: SLAGS, DETALJER OG BILLEDE  (august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER: setup.sql, flerlejer.sql og nyheder-fra-til.sql.
--  Filen kan køres igen uden at ødelægge noget.
--
--  ------------------------------------------------------------
--  HVORFOR
--  ------------------------------------------------------------
--  En nyhed var TO felter: en titel og en tekst. Og gæstekortet
--  har en <image-slot> — en 170 px høj, tom, beigefarvet firkant
--  øverst på hvert eneste kort.
--
--  Kundens ord (26/8): hver gang de lægger en nyhed op, skal den
--  være "så tæt på ... som hvis du gjorde det" — ikke bare
--  standardbillede og tekst.
--
--  Svaret er, at SYSTEMET gør designarbejdet, ikke personalet:
--
--  1) SLAGS. En nyhed er live musik, en ny ret, ændrede tider,
--     en begivenhed eller andet. Slagsen bestemmer farve, tegn og
--     — vigtigst — HVILKE FELTER DER SPØRGES OM. Musik spørger
--     hvem og hvornår; en ny ret spørger navn og pris. Så bliver
--     overskriften skrevet rigtigt, fordi der blev spurgt rigtigt.
--
--  2) DETALJER. Én jsonb-kolonne til slagsens egne svar. Samme
--     greb som forespoergsler.detaljer, og af samme grund: tolv
--     kolonner, hvor hver slags kun bruger sine egne, ville være
--     tolv kolonner, der næsten altid står tomme.
--
--  3) BILLEDE. Adressen på et foto i storage-spanden 'nyheder'.
--
--  ⚠️ SPANDEN SKAL OPRETTES I DASHBOARDET. Den kan ikke laves
--  herfra — SQL har ikke lov (fejl 42501), præcis som da spiis'
--  spand skulle slettes. Trinene står nederst i filen. Indtil da
--  findes uploadfeltet slet ikke i admin, og kortene bruger det
--  designede felt. Se harNoegle() i js/admin/nyheder.js.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) SLAGS
--    ---------------------------------------------------------
--    ⚠️ DEFAULT ER 'andet'. De nyheder, der allerede står, er
--    skrevet uden en slags, og de skal blive ved med at se ud som
--    noget. Var default 'musik', ville hver gammel nyhed pludselig
--    have en node på sig.
--
--    Listen står TO steder — her og i SLAGS i js/admin/nyheder.js.
--    Rettes kun det ene, tager øvetilstanden imod, hvad den
--    rigtige database afviser. Samme fælde som
--    FORESPOERGSEL_TYPER; se noten i CLAUDE.md.
-- ------------------------------------------------------------
alter table public.nyheder
  add column if not exists slags text not null default 'andet';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'nyhed_slags_ok') then
    alter table public.nyheder
      add constraint nyhed_slags_ok
      check (slags in ('musik', 'ret', 'tider', 'begivenhed', 'andet'));
  end if;
end $$;

comment on column public.nyheder.slags is
  'musik | ret | tider | begivenhed | andet. Bestemmer farve, tegn og hvilke felter admin spørger om.';


-- ------------------------------------------------------------
-- 2) DETALJER
--    ---------------------------------------------------------
--    Slagsens egne svar. Der står ikke noget om, hvilke nøgler
--    der må være i — de følger admin, og et nyt felt må ikke
--    kræve en ændring i databasen.
--
--    Men to ting håndhæves, som på forespoergsler.detaljer:
--
--    Det skal være et OBJEKT. En liste eller et løst tal ville
--    betyde, at gæstesiden skulle kunne tegne hvad som helst.
--
--    Og det skal være SMÅT. Uden en grænse er kolonnen et sted,
--    hvor nogen kan lægge en megabyte ind pr. nyhed — og
--    nyhederne hentes på hver eneste sidevisning.
-- ------------------------------------------------------------
alter table public.nyheder
  add column if not exists detaljer jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'nyhed_detaljer_ok') then
    alter table public.nyheder
      add constraint nyhed_detaljer_ok
      check (detaljer is null
             or (jsonb_typeof(detaljer) = 'object'
                 and length(detaljer::text) <= 4000));
  end if;
end $$;

comment on column public.nyheder.detaljer is
  'Slagsens egne felter: hvem, hvornår, pris, fra/til. Ét objekt, aldrig en liste. Højst 4000 tegn.';


-- ------------------------------------------------------------
-- 3) BILLEDE
--    ---------------------------------------------------------
--    Adressen på et foto i storage-spanden 'nyheder'.
--
--    ⚠️ KUN EN ADRESSE I VORES EGEN SPAND. Uden det kunne
--    personalet — eller nogen, der havde fået fat i en session —
--    pege på et hvilket som helst sted på internettet, og
--    forsiden ville hente et billede fra en server, vi ikke
--    kender. Værnet er i browseren (js/store-skriv.js) OG her:
--    to lag, fordi en formular kan omgås med to linjer i
--    konsollen.
--
--    Tom = intet foto. Så tegner kortet slagsens eget felt, og
--    det er med vilje ikke en mangel: en nyhed uden foto skal se
--    lavet ud.
-- ------------------------------------------------------------
alter table public.nyheder
  add column if not exists billede text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'nyhed_billede_ok') then
    alter table public.nyheder
      add constraint nyhed_billede_ok
      check (billede is null
             or (billede ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/nyheder/'
                 and length(billede) <= 500));
  end if;
end $$;

comment on column public.nyheder.billede is
  'Adressen på et foto i storage-spanden nyheder. Tom = kortet tegner slagsens eget felt.';

commit;


-- ============================================================
--  STORAGE: ADGANGEN TIL SPANDEN
--  ------------------------------------------------------------
--  ⚠️ SPANDEN SELV SKAL OPRETTES I DASHBOARDET FØRST:
--
--    Storage → New bucket
--      Name:   nyheder
--      Public: JA  (gæsten skal kunne se billedet på forsiden)
--      File size limit: 2 MB
--      Allowed MIME types: image/jpeg, image/png, image/webp
--
--  SQL må ikke lave spande i Supabase (fejl 42501) — det er den
--  samme mur, vi løb ind i, da spiis' spand skulle slettes. Se
--  CLAUDE.md.
--
--  Reglerne herunder er derimod almindelige adgangsregler på
--  storage.objects, og dem KAN vi sætte. De køres kun, hvis
--  tabellen findes: på en almindelig Postgres uden Supabase
--  springes hele blokken over, så prøven kan køre.
-- ============================================================
/* ⚠️ OVERSPRINGET ER TAVST, OG SUPABASE VISER IKKE NOTICES.
   Køres filen FØR spanden er oprettet i dashboardet, står de tre
   kolonner der bagefter, mens ingen kan lægge et foto op — admin
   siger bare "kunne ikke gemme billedet", og der er intet i
   rapporten, der peger på hvorfor.

   Tjek 110 i er-vi-klar.sql tæller de fire regler. Står der ❌:
   opret spanden (Storage → New bucket → navn "nyheder", Public)
   og kør DEN HER FIL IGEN. */
do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'storage.objects findes ikke — springer adgangsreglerne over.';
    return;
  end if;

  /* ALLE MÅ SE. Spanden er offentlig, og billedet står på
     forsiden — der er ikke noget at skjule. Men KUN i spanden
     'nyheder': en regel uden det ville åbne hver eneste spand,
     projektet nogensinde får. */
  execute $r$drop policy if exists "nyheder_billeder_laes" on storage.objects$r$;
  execute $r$
    create policy "nyheder_billeder_laes" on storage.objects
      for select using (bucket_id = 'nyheder')
  $r$;

  /* KUN PERSONALET MÅ LÆGGE OP, RETTE OG SLETTE. is_admin() er
     den samme dør som resten af systemet — se flerlejer.sql.
     Uden den kunne en hvilken som helst gæst fylde spanden. */
  execute $r$drop policy if exists "nyheder_billeder_skriv" on storage.objects$r$;
  execute $r$
    create policy "nyheder_billeder_skriv" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'nyheder' and public.is_admin())
  $r$;

  execute $r$drop policy if exists "nyheder_billeder_ret" on storage.objects$r$;
  execute $r$
    create policy "nyheder_billeder_ret" on storage.objects
      for update to authenticated
      using (bucket_id = 'nyheder' and public.is_admin())
  $r$;

  execute $r$drop policy if exists "nyheder_billeder_slet" on storage.objects$r$;
  execute $r$
    create policy "nyheder_billeder_slet" on storage.objects
      for delete to authenticated
      using (bucket_id = 'nyheder' and public.is_admin())
  $r$;
end $$;


-- Rapport. Supabases SQL Editor viser kun den sidste sætnings
-- svar — se README-afsnittet "Supabases SQL Editor viser ikke
-- beskeder".
select
  case
    when not exists (select 1 from information_schema.columns
                      where table_schema = 'public' and table_name = 'nyheder'
                        and column_name = 'slags')
      then '❌ slags BLEV IKKE TILFØJET — læs fejlbeskeden ovenfor'
    when not exists (select 1 from information_schema.columns
                      where table_schema = 'public' and table_name = 'nyheder'
                        and column_name = 'detaljer')
      then '❌ detaljer BLEV IKKE TILFØJET — læs fejlbeskeden ovenfor'
    when not exists (select 1 from information_schema.columns
                      where table_schema = 'public' and table_name = 'nyheder'
                        and column_name = 'billede')
      then '❌ billede BLEV IKKE TILFØJET — læs fejlbeskeden ovenfor'
    when to_regclass('storage.objects') is not null
     and not exists (select 1 from pg_policies
                      where schemaname = 'storage' and tablename = 'objects'
                        and policyname = 'nyheder_billeder_skriv')
      then '❌ ADGANGEN TIL SPANDEN BLEV IKKE SAT — kør filen igen'
    else '✅ SLAGS, DETALJER OG BILLEDE ER PÅ PLADS'
      || case when to_regclass('storage.objects') is null
              then ' (uden storage — det er normalt uden for Supabase)'
              else '. Husk at oprette spanden "nyheder" i Storage → New bucket, '
                || 'Public = ja, 2 MB, image/jpeg + image/png + image/webp.' end
      || ' Kør derefter supabase/proev-nyheder-slags-og-billede.sql'
  end as svar;
