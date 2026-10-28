-- ============================================================
--  SMS TIL ALLE HUSETS VEJE  (28/10 2026)
--  ------------------------------------------------------------
--  ⚠️ Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--     Mosede er epwyjzakvvbxtpvnhvbn. Kør EFTER sms.sql (den her
--     bygger på dens mosede_sms_kald og sms_sendt).
--
--  Mikkels ord 28/10: *"sms ligesom med spiis, bare med alle deres
--  ting med levering og frokostordning — du ved, de alle er lidt
--  forskellige"*. sms.sql (24/10) dækkede kun afhentning og spis
--  her. Nu får hver vej sin egen besked (teksterne bor i
--  supabase/funktioner/send-sms.ts):
--
--    LEVERING         bekræftelse med adresse og tid + "din mad er
--                     på vej", når køkkenet trykker Sæt som klar
--    BORDBOOKING      bekræftelse + påmindelse ca. 2 timer før
--    TILMELDING       billet (nummer, pris, afbud senest 24 t før)
--                     + påmindelse dagen før; venteliste får sit eget
--    FORESPØRGSEL     catering, baglokale, selskab og FROKOSTORDNING:
--                     "vi ringer eller skriver inden for et døgn"
--
--  ⚠️ BYGGET SLUKKET, SOM sms.sql. Edge Function'en sender intet, før
--     SMS_AKTIV = ja står under Edge Functions → Secrets.
--  ⚠️ EJERENS NEJ 15/9 STÅR: ved bordene (QR) kommer der ALDRIG en sms.
--  ⚠️ EN SMS MÅ ALDRIG STÅ I VEJEN FOR EN BESTILLING, EN BOOKING ELLER
--     EN TILMELDING. Alle udløsere er AFTER, kalder kun pg_net (som
--     sender uden for transaktionen) og fanger enhver fejl.
--
--  Kan køres igen. Prøven er proev-sms-alle-28-10.sql.
-- ============================================================
begin;

-- ------------------------------------------------------------
--  1) HVEM HAR FÅET HVAD — for alt det, der ikke er en bestilling
--     Samme værn som sms_sendt: rækken lægges FØR sms'en sendes, og
--     den unikke nøgle sørger for, at ingen får den samme to gange.
-- ------------------------------------------------------------
create table if not exists public.sms_sendt_sag (
  kilde   text   not null,
  sag_id  bigint not null,
  slags   text   not null,
  sendt   timestamptz not null default now(),
  primary key (kilde, sag_id, slags),
  constraint sms_sag_kilde_ok check (kilde in ('tilmelding', 'bord', 'foresp')),
  constraint sms_sag_slags_ok check (slags in ('bekraeft', 'paamind'))
);
alter table public.sms_sendt_sag enable row level security;
revoke all on public.sms_sendt_sag from anon, authenticated;
comment on table public.sms_sendt_sag is
  'Hvilke sms''er gæsten har fået pr. tilmelding, bordbooking og forespørgsel. Kun send-sms (service_role) skriver. Se supabase/sms-alle-28-10.sql.';

/* Levering får en tredje slags på bestillingen: "på vej". */
alter table public.sms_sendt drop constraint if exists sms_slags_ok;
alter table public.sms_sendt add constraint sms_slags_ok
  check (slags in ('bekraeft', 'paamind', 'paa_vej'));

-- ------------------------------------------------------------
--  2) NY BESTILLING → BEKRÆFTELSE — nu også levering
--     Stadig aldrig ved bordet: bord_nummer ELLER kanal 'bord'.
-- ------------------------------------------------------------
create or replace function public.mosede_sms_ny_bestilling()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if new.hvordan in ('afhentning', 'spis_her', 'levering')
     and new.bord_nummer is null
     and coalesce(new.kanal, '') <> 'bord'
     and nullif(btrim(coalesce(new.telefon, '')), '') is not null then
    perform public.mosede_sms_kald(jsonb_build_object('slags', 'bekraeft', 'id', new.id));
  end if;
  return new;
exception when others then
  raise warning 'sms: kunne ikke kalde send-sms (%)', sqlerrm;
  return new;
end $function$;

-- ------------------------------------------------------------
--  3) LEVERINGEN ER PÅ VEJ — når køkkenet trykker Sæt som klar
-- ------------------------------------------------------------
create or replace function public.mosede_sms_paa_vej()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if new.hvordan = 'levering'
     and new.status = 'klar' and old.status is distinct from 'klar'
     and new.slettet is null
     and nullif(btrim(coalesce(new.telefon, '')), '') is not null then
    perform public.mosede_sms_kald(jsonb_build_object('slags', 'paa_vej', 'id', new.id));
  end if;
  return new;
exception when others then
  raise warning 'sms: kunne ikke kalde send-sms (%)', sqlerrm;
  return new;
end $function$;

revoke all on function public.mosede_sms_paa_vej() from public, anon, authenticated;

drop trigger if exists sms_paa_vej on public.bestillinger;
create trigger sms_paa_vej
  after update of status on public.bestillinger
  for each row execute function public.mosede_sms_paa_vej();

-- ------------------------------------------------------------
--  4) NY TILMELDING, BORDBOOKING ELLER FORESPØRGSEL → BEKRÆFTELSE
--     Én funktion; kilden står som udløserens argument. Kun med et
--     telefonnummer. Forretningen tjekker send-sms selv (LOKATION),
--     præcis som for bestillingerne.
-- ------------------------------------------------------------
create or replace function public.mosede_sms_ny_sag()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if nullif(btrim(coalesce(new.telefon, '')), '') is not null then
    perform public.mosede_sms_kald(jsonb_build_object('slags', 'bekraeft', 'kilde', tg_argv[0], 'id', new.id));
  end if;
  return new;
exception when others then
  raise warning 'sms: kunne ikke kalde send-sms (%)', sqlerrm;
  return new;
end $function$;

revoke all on function public.mosede_sms_ny_sag() from public, anon, authenticated;

drop trigger if exists sms_ny_tilmelding on public.reservationer;
create trigger sms_ny_tilmelding
  after insert on public.reservationer
  for each row execute function public.mosede_sms_ny_sag('tilmelding');

drop trigger if exists sms_ny_bordbooking on public.bordbestillinger;
create trigger sms_ny_bordbooking
  after insert on public.bordbestillinger
  for each row execute function public.mosede_sms_ny_sag('bord');

drop trigger if exists sms_ny_forespoergsel on public.forespoergsler;
create trigger sms_ny_forespoergsel
  after insert on public.forespoergsler
  for each row execute function public.mosede_sms_ny_sag('foresp');

commit;

/* Påmindelserne (bordbooking 2 timer før, tilmelding dagen før) kører
   på sms.sql's job hvert 5. minut — send-sms finder dem selv. */

-- ------------------------------------------------------------
--  ER DEN LANDET?  (SQL Editor viser kun den sidste sætnings svar)
-- ------------------------------------------------------------
select
  to_regclass('public.sms_sendt_sag') is not null                       as "tabellen sms_sendt_sag",
  exists (select 1 from pg_trigger where tgname = 'sms_paa_vej')         as "levering: på vej",
  exists (select 1 from pg_trigger where tgname = 'sms_ny_tilmelding')   as "tilmeldinger",
  exists (select 1 from pg_trigger where tgname = 'sms_ny_bordbooking')  as "bordbookinger",
  exists (select 1 from pg_trigger where tgname = 'sms_ny_forespoergsel') as "forespørgsler (også frokost)";

-- ── SLUK IGEN ─────────────────────────────────────────────────
-- Hurtigst: SMS_AKTIV = nej under Edge Functions → Secrets.
-- Helt væk:
--   drop trigger if exists sms_paa_vej on public.bestillinger;
--   drop trigger if exists sms_ny_tilmelding on public.reservationer;
--   drop trigger if exists sms_ny_bordbooking on public.bordbestillinger;
--   drop trigger if exists sms_ny_forespoergsel on public.forespoergsler;
