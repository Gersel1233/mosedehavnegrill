-- ============================================================
--  OPRYDNING EFTER EN FORVEKSLING — engangs-rettelse
--  ------------------------------------------------------------
--  Den 18. august 2026 blev spiis' setup.sql ved en fejl kørt i
--  MOSEDES Supabase-projekt (epwyjzakvvbxtpvnhvbn). Det lagde
--  spiis' tabeller og funktioner ind i Mosedes database og
--  overskrev is_admin() med spiis' udgave, så spiis' e-mail
--  stod som admin i Mosedes projekt.
--
--  Filen her fjerner KUN det, spiis-filen lagde ind. Ingen af
--  navnene findes i Mosedes eget skema (kontrolleret mod
--  setup.sql), så Mosedes data bliver ikke rørt.
--
--  KØR DEN I MOSEDE-PROJEKTET epwyjzakvvbxtpvnhvbn.
--  ALDRIG i spiis' projekt (jhdlxexgrwvuoqetcgbt) — dér er de
--  her tabeller en kørende forretning.
--
--  Kør derefter Mosedes egen rækkefølge forfra:
--     setup.sql (ret e-mailen i punkt 1 FØRST)
--     → flerlejer.sql → bremse.sql → menukort.sql
--     → proev-flerlejer.sql (23 × BESTOD)
--
--  is_admin() ryddes ikke op her: Mosedes setup.sql skriver den
--  rigtige udgave hen over som sit punkt 1.
-- ============================================================

-- ------------------------------------------------------------
--  1) SE FØRST, AT DER IKKE LIGGER NOGET I TABELLERNE.
--     De blev oprettet i dag og har aldrig haft en modtager i
--     Mosedes kode, så alt skal stå på 0 — undtagen config, der
--     har sin ene startrække. Står der andet: STOP, og spørg
--     før du sletter noget.
-- ------------------------------------------------------------
select
  (select count(*) from public.orders)             as orders,
  (select count(*) from public.bookings)           as bookings,
  (select count(*) from public.notes)              as notes,
  (select count(*) from public.push_subscriptions) as push_subscriptions,
  (select count(*) from public.config)             as config;

-- ------------------------------------------------------------
--  2) SPIIS' TABELLER. Tabellerne tager deres egne adgangsregler
--     og tapas-triggeren med sig, derfor står de før
--     funktionerne — omvendt rækkefølge ville fejle på at
--     triggeren stadig bruger sin funktion.
-- ------------------------------------------------------------
drop table if exists public.orders;
drop table if exists public.bookings;
drop table if exists public.notes;
drop table if exists public.push_subscriptions;
drop table if exists public.config;

-- ------------------------------------------------------------
--  3) SPIIS' FUNKTIONER. Signaturerne skal med, for drop
--     function finder ellers ikke den rigtige.
-- ------------------------------------------------------------
drop function if exists public.enforce_tapas_dayahead();
drop function if exists public.place_order(date, text, int, text, text, text, text, text, numeric, jsonb, int);
drop function if exists public.place_news_order(text, date, int, text, text, text);
drop function if exists public.get_sold();
drop function if exists public.get_sold_dishes();

-- ------------------------------------------------------------
--  4) BILLEDARKIVET. spiis-filen oprettede en offentlig
--     storage-spand "nyheder" med fire adgangsregler. Mosede
--     bruger ingen storage — tabellen nyheder i public har
--     intet med den at gøre og bliver ikke rørt.
-- ------------------------------------------------------------
drop policy if exists "nyheder kan ses af alle" on storage.objects;
drop policy if exists "nyheder upload kun chef" on storage.objects;
drop policy if exists "nyheder opdater kun chef" on storage.objects;
drop policy if exists "nyheder slet kun chef" on storage.objects;
delete from storage.objects where bucket_id = 'nyheder';
delete from storage.buckets where id = 'nyheder';

-- pgcrypto-udvidelsen lader vi stå. Den er harmløs, indbygget i
-- Supabase, og at fjerne en udvidelse kan ramme mere end det,
-- spiis-filen brugte den til.
