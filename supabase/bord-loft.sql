-- ============================================================
--  UDSOLGT-VÆRNET OG LOFTET PR. KVARTER  (august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER setup.sql, spis-her.sql, bordkort.sql,
--  skraldespand.sql og restaurant.sql.
--  Filen kan køres igen uden at ødelægge noget.
--
--  ------------------------------------------------------------
--  HVOR DEN KOMMER FRA
--  ------------------------------------------------------------
--  Tillægget til bordbestillings-briefen, punkt 2 og 3. Det var
--  skrevet ud fra, at gæsten BETALER i appen. Det gør hun ikke —
--  ejeren har besluttet, at der betales ved kassen som altid, og
--  personalet taster tingene ind dér.
--
--  Det fjerner refusionerne og hele spørgsmålet om
--  salgsregistrering. Det fjerner IKKE de to problemer herunder.
--  Tværtimod: uden en betaling koster en forkert bestilling
--  ingenting for den, der sender den — så den er lettere at lave,
--  ikke sværere.
--
--  ------------------------------------------------------------
--  1) UDSOLGT SKAL AFGØRES I DATABASEN
--  ------------------------------------------------------------
--  Personalet melder Fish'n'chips udsolgt i admin. Varen
--  forsvinder fra bestillingssiderne med det samme — på de
--  telefoner, der henter siden BAGEFTER.
--
--  Gæsten ved bord 7, der åbnede kortet for fem minutter siden,
--  har den stadig på skærmen. Hun bestiller den, køkkenet får en
--  ordre på noget, de ikke har, og hun sidder og venter på mad,
--  ingen kan lave. Uden en betaling er der ingen refusion at
--  rode med — men der er stadig en gæst, der venter forgæves, og
--  et køkken, der skal ud og forklare det.
--
--  Browseren må gerne skjule varen for at være pæn. Den må bare
--  ikke være den eneste, der ved det.
--
--  ⚠️ VÆRNET SIGER KUN NEJ TIL NAVNE, DER FINDES PÅ KORTET.
--  Dagens ret bor i sin egen tabel (dagens-retter.sql) og har sin
--  egen nedtælling; et navn, der slet ikke er en menuvare,
--  rører værnet ikke. Ellers ville en ret, ejeren skrev i hånden,
--  blive afvist, fordi den ikke stod i menu_varer.
--
--  ------------------------------------------------------------
--  2) KØKKENET SKAL KUNNE SIGE "IKKE LIGE NU"
--  ------------------------------------------------------------
--  Der var kun åben eller lukket. Lander der femten ordrer på fem
--  minutter, kan lugen ikke nå dem, den ventetid, personalet har
--  skrevet, er en løgn — og eneste udvej var at lukke HELT, også
--  for de borde, der ikke havde bestilt endnu.
--
--  Loftet er et tal pr. kvarter, ejeren sætter i admin. Er det
--  ikke sat, er der intet loft: en indstilling, ingen har rørt,
--  må ikke kunne lukke for noget, der virkede i går.
--
--  Det gælder KUN bordene. Smørrebrød ud af huset bestilles
--  dagen før og lægger ikke pres på lugen nu; bremsen i
--  bremse.sql dækker den vej.
--
--  ------------------------------------------------------------
--  3) OG GÆSTEN SKAL KUNNE SE, HVOR TRAVLT DER ER
--  ------------------------------------------------------------
--  Visningen bord_travlhed siger, hvor mange ordrer der er i køen
--  — og INTET andet. ⚠️ Tilføj aldrig en kolonne til den: den
--  kører med sin ejers øjne og springer adgangsreglerne over,
--  præcis som optagne_dage. Kommer der et navn, et nummer eller
--  en varelinje med, er køkkenets liste åben for internettet.
--
--  Et TAL er ikke personoplysninger. Det er det samme, gæsten kan
--  se ved at kigge hen mod lugen.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) UDSOLGT-VÆRNET
--    ---------------------------------------------------------
--    security definer, fordi gæsten ikke må slå noget op i
--    menu_varer med sine egne øjne ud over det, adgangsreglen
--    tillader — og fordi værnet skal give det SAMME svar, uanset
--    hvem der sender. Søgestien er låst som alle de andre; uden
--    den kan en tabel i et andet skema kapre opslaget.
--
--    Sammenligningen er lower(btrim(navn)), fordi det er sådan,
--    dagens-retter.sql matcher. To måder at sammenligne det samme
--    navn på ville betyde, at "Fish'n'chips " og "fish'n'chips"
--    kunne slippe forbi det ene værn og ikke det andet.
-- ------------------------------------------------------------
create or replace function public.mosede_udsolgt_vaern()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linje  jsonb;
  navnet text;
  f      text;
begin
  if new.linjer is not null then
    for linje in select * from jsonb_array_elements(new.linjer)
    loop
      navnet := lower(btrim(coalesce(linje ->> 'navn', '')));
      if navnet = '' then continue; end if;

      /* Findes navnet på kortet OG er hver eneste række med det
         navn udsolgt eller skjult, er varen væk. "Hver eneste",
         fordi det samme navn kan stå i to kategorier: er den ene
         udsolgt og den anden ikke, kan den stadig købes. */
      if exists (
        select 1
          from public.menu_varer v
          join public.menu_kategorier k on k.id = v.kategori_id
         where lower(btrim(v.navn)) = navnet
           and (k.lokation_id is null or k.lokation_id = new.lokation_id)
      ) and not exists (
        select 1
          from public.menu_varer v
          join public.menu_kategorier k on k.id = v.kategori_id
         where lower(btrim(v.navn)) = navnet
           and (k.lokation_id is null or k.lokation_id = new.lokation_id)
           and v.aktiv and k.aktiv and not v.udsolgt
      ) then
        raise exception 'bestilling_udsolgt_vare: %', coalesce(linje ->> 'navn', '');
      end if;
    end loop;
  end if;

  /* Fyldet er ØNSKER uden pris, men et udsolgt fyld er lige så
     udsolgt som en vare — det er de samme rækker i menu_varer
     (Model A). Sender siden et fyld, køkkenet ikke har, får
     gæsten smørrebrød med noget andet på, end hun bad om. */
  if new.fyld is not null then
    for f in select jsonb_array_elements_text(new.fyld)
    loop
      navnet := lower(btrim(coalesce(f, '')));
      if navnet = '' then continue; end if;

      if exists (
        select 1 from public.menu_varer v
          join public.menu_kategorier k on k.id = v.kategori_id
         where lower(btrim(v.navn)) = navnet
           and (k.lokation_id is null or k.lokation_id = new.lokation_id)
      ) and not exists (
        select 1 from public.menu_varer v
          join public.menu_kategorier k on k.id = v.kategori_id
         where lower(btrim(v.navn)) = navnet
           and (k.lokation_id is null or k.lokation_id = new.lokation_id)
           and v.aktiv and k.aktiv and not v.udsolgt
      ) then
        raise exception 'bestilling_udsolgt_vare: %', f;
      end if;
    end loop;
  end if;

  return new;
end $$;

comment on function public.mosede_udsolgt_vaern() is
  'Afviser en bestilling, der nævner en vare, som er meldt udsolgt eller skjult i admin. Navne, der ikke står på kortet, røres ikke — dagens ret har sin egen tabel.';

drop trigger if exists bestilling_udsolgt_vaern on public.bestillinger;
create trigger bestilling_udsolgt_vaern
  before insert on public.bestillinger
  for each row execute function public.mosede_udsolgt_vaern();

-- ------------------------------------------------------------
-- 2) LOFTET PR. KVARTER
--    ---------------------------------------------------------
--    Kun bordene, og kun når ejeren har sat et tal.
--
--    Vinduet er RULLENDE femten minutter og ikke "kvarteret
--    12.00-12.15": et fast kvarter betyder, at otte ordrer kl.
--    12.14 og otte kl. 12.16 er seksten ordrer på to minutter,
--    og loftet ville ikke have set noget.
-- ------------------------------------------------------------
create or replace function public.mosede_bord_loft()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loft int;
begin
  if new.bord_nummer is null then return new; end if;

  select nullif(btrim(i.vaerdi #>> '{}'), '')::int into v_loft
    from public.indstillinger i
   where i.lokation_id = new.lokation_id
     and i.noegle = 'bord_loft_pr_kvarter';

  -- Ikke sat, nul eller negativ: intet loft. En indstilling,
  -- ingen har rørt, må ikke kunne lukke for noget.
  if v_loft is null or v_loft <= 0 then return new; end if;

  if (select count(*) from public.bestillinger b
       where b.lokation_id = new.lokation_id
         and b.bord_nummer is not null
         and b.slettet is null
         and b.oprettet > now() - interval '15 minutes') >= v_loft then
    raise exception 'bestilling_bord_loft';
  end if;

  return new;
end $$;

comment on function public.mosede_bord_loft() is
  'Loft pr. rullende kvarter på bestillinger FRA BORDENE. Sættes i admin; ikke sat betyder intet loft.';

drop trigger if exists bestilling_bord_loft on public.bestillinger;
create trigger bestilling_bord_loft
  before insert on public.bestillinger
  for each row execute function public.mosede_bord_loft();

-- Uden det her skal Postgres læse hele tabellen igennem for hver
-- eneste bordbestilling. Med det er tællingen et opslag.
create index if not exists bestillinger_bord_loft_idx
  on public.bestillinger (lokation_id, oprettet desc)
  where bord_nummer is not null and slettet is null;

-- ------------------------------------------------------------
-- 3) HVOR TRAVLT ER DER?
--    ---------------------------------------------------------
--    ⚠️ KUN TAL. Ingen navne, ingen numre, ingen varelinjer.
--    Visningen kører med sin ejers øjne og springer
--    adgangsreglerne over — det er hele meningen, og det er også
--    hele faren. Prøve 8 tæller kolonnerne, præcis som
--    optagne_dage's prøve gør.
--
--    i_koeen        — det, køkkenet har i hånden lige nu
--    seneste_kvarter — det, loftet tæller på
--    aeldste_min    — hvor gammel den ældste i vinduet er, så
--                     siden kan sige "prøv igen om ca. X min"
--                     uden at finde et tal på
-- ------------------------------------------------------------
drop view if exists public.bord_travlhed;

create view public.bord_travlhed as
select
  b.lokation_id,
  count(*) filter (
    where b.status in ('ny', 'bekraeftet', 'tilberedes', 'klar')
  )::int as i_koeen,
  count(*) filter (
    where b.oprettet > now() - interval '15 minutes'
  )::int as seneste_kvarter,
  coalesce(min(
    extract(epoch from (now() - b.oprettet)) / 60
  ) filter (where b.oprettet > now() - interval '15 minutes'), 0)::int
    as aeldste_min
from public.bestillinger b
where b.bord_nummer is not null
  and b.slettet is null
  and b.oprettet > now() - interval '6 hours'
group by b.lokation_id;

comment on view public.bord_travlhed is
  'KUN TAL: hvor mange bordordrer er i køen, hvor mange kom i sidste kvarter, og hvor gammel den ældste af dem er. Tilføj ALDRIG en kolonne — visningen springer adgangsreglerne over.';

grant select on public.bord_travlhed to anon, authenticated;

commit;

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from pg_trigger
    where tgrelid = to_regclass('public.bestillinger')
      and tgname = 'bestilling_udsolgt_vaern')
    as "udsolgt-vaernet (skal være 1)",
  (select count(*) from pg_trigger
    where tgrelid = to_regclass('public.bestillinger')
      and tgname = 'bestilling_bord_loft')
    as "loftet (skal være 1)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'bord_travlhed')
    as "travlheden (skal være 4 — og ALDRIG flere)";
