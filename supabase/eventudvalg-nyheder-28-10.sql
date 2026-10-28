-- ============================================================
--  EVENTUDVALGET MÅ OGSÅ SKRIVE NYHEDERNE  (28. okt 2026)
--  ------------------------------------------------------------
--  Mikkel før lanceringen: *"cheferne som har adgang til alt, event
--  udvalget, primært event og nyheder og alle de tilmeldinger"*.
--
--  Rollen 'arrangoer' (arrangoer.sql) kunne arrangementerne og
--  tilmeldingerne. Nyhederne var ejerens og personalets alene:
--  flerlejer.sql binder skrivning til is_admin_for(), som siger NEJ
--  til arrangøren. Her får nyhederne kan_arrangere_for() i stedet —
--  den siger ja til alle tre aktive roller, så chefen og personalet
--  kan præcis det samme som i går.
--
--  ⚠️ KUN NYHEDERNE. Indstillinger, menukort, åbningstider og
--  lukkedage står urørt: en arrangør kan stadig ikke se en
--  bestilling, et telefonnummer, salget eller lukke caféen.
--  Billederne (spanden 'nyheder') kunne hun lægge op i forvejen
--  (arrangoer.sql, punkt 5).
--
--  OG "HVOR VIL I SIDDE?" STYRES PR. ARRANGEMENT (samme aften).
--  Mikkel: *"alt det der med hvor vil I sidde, når man skriver sig
--  op, skal væk eller administreres, når de opretter den — og
--  hvilke slags pladser, og selv kunne personalisere dem"*.
--  kalender.siddevalg er arrangørens egne valg (fx "Langbord ude",
--  "Indenfor"). Tom = gæsten bliver ikke spurgt. Højst 8 valg.
--  Svaret lander i tilmeldingens besked som før — ingen ny kolonne
--  på reservationerne.
--
--  ⚠️ KØRES EFTER flerlejer.sql. Kører nogen flerlejer.sql igen,
--  skal den her køres igen bagefter (docs/SQL-RAEKKEFOELGE.md).
--
--  Kan køres igen. Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
--  Prøven er supabase/proev-eventudvalg-nyheder-28-10.sql.
-- ============================================================
begin;

drop policy if exists nyheder_opret_admin on public.nyheder;
create policy nyheder_opret_admin on public.nyheder
  for insert with check (public.kan_arrangere_for(lokation_id));

drop policy if exists nyheder_ret_admin on public.nyheder;
create policy nyheder_ret_admin on public.nyheder
  for update using (public.kan_arrangere_for(lokation_id))
  with check (public.kan_arrangere_for(lokation_id));

drop policy if exists nyheder_slet_admin on public.nyheder;
create policy nyheder_slet_admin on public.nyheder
  for delete using (public.kan_arrangere_for(lokation_id));

alter table public.kalender add column if not exists siddevalg text[];
alter table public.kalender drop constraint if exists kalender_siddevalg_ok;
alter table public.kalender add constraint kalender_siddevalg_ok check (
  siddevalg is null
  or (cardinality(siddevalg) between 1 and 8
      and length(array_to_string(siddevalg, '|')) <= 400));
comment on column public.kalender.siddevalg is
  'Arrangørens valg til "Hvor vil I sidde?" på tilmeldingen. Tom = spørgsmålet stilles ikke.';

comment on column public.admin_adgang.rolle is
  'ejer = hele forretningen. medarbejder = dagen. arrangoer = arrangementerne, deres tilmeldinger og nyhederne. Standard er ejer, så en migrering aldrig tager rettigheder fra nogen.';

commit;

notify pgrst, 'reload schema';

/* Supabases SQL Editor viser kun den SIDSTE sætnings svar. */
select case when (select count(*) from pg_policies
                   where schemaname = 'public' and tablename = 'nyheder'
                     and policyname in ('nyheder_opret_admin', 'nyheder_ret_admin', 'nyheder_slet_admin')
                     and coalesce(qual, with_check) like '%kan_arrangere_for%') = 3
             and exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'kalender'
                            and column_name = 'siddevalg')
            then '✅ Eventudvalget kan skrive nyheder, og pladserne styres pr. arrangement'
            else '❌ Noget gik galt — sig til Lesreg' end as svar;
