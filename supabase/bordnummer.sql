-- ============================================================
--  BORDBOOKINGEN FÅR OGSÅ ET NUMMER  (4. sep 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER borde.sql. Filen kan køres igen uden at ødelægge
--  noget — nummereringen fortsætter, hvor den slap.
--
--  ------------------------------------------------------------
--  HVOR DEN KOMMER FRA
--  ------------------------------------------------------------
--  Kundens ord 4/9, med et skærmbillede af Borde-fanen:
--  *"og det her reffereance nummer ka vi ik fix det"* — det der
--  var BO260904-658KG.
--
--  Det er nøjagtig samme klage som 31/8 om SM260831-UBJ7E, og
--  svaret er nøjagtig samme fil: bestillingsnummer.sql, kopieret
--  post for post til bordene. Hvorfor så en KOPI og ikke én
--  fælles tæller?
--
--  ⚠️ FORDI DE TO TAL SIGES HØJT I HVER SIN SAMMENHÆNG.
--  "Bestilling 47" er mad ved lugen; "booking 12" er et bord
--  lørdag aften. Delte de tæller, ville bordene springe fra 3
--  til 58, fordi der kom mad imellem — og personalet ville tro,
--  der manglede fem bookinger. Én tæller pr. TING, og pr.
--  forretning, som flerlejer.sql kræver.
--
--  ⚠️ NUMMERET LÆGGES VED SIDEN AF REFERENCEN — DEN RØRES IKKE.
--  BO260904-658KG er rækkens nøgle: den laves i gæstens browser
--  FØR afsendelsen, den er unik uden at spørge nogen, og den
--  står i kvitteringer og mails, gæster allerede har fået.
--  Skiftede vi den ud, ville hver eneste gammel kvittering pege
--  på ingenting.
--
--  ⚠️ GÆSTEN KAN IKKE VÆLGE SIT NUMMER. Triggeren OVERSKRIVER
--  alt, hvad der måtte stå i kolonnen ved insert — ellers kunne
--  enhver med anon-nøglen sende nummer 1 ind og forvirre
--  personalets skærm. Samme lov som bordets nøgle og som
--  bestillingsnummeret: klientens bud smides væk.
-- ============================================================

/* ⚠️ MED VILJE INGEN unique på nummer. Nummeret er noget, øjne
   læser — ikke rækkens nøgle (det er referencen). Satte vi
   unique på, ville et sammenstød AFVISE en booking, og en tabt
   booking er en familie, der møder op til et bord, ingen har. */
alter table public.bordbestillinger
  add column if not exists nummer integer;

create table if not exists public.bordnumre (
  lokation_id text primary key
    references public.lokationer(id) on delete cascade,
  naeste      integer not null default 0
);

-- Kun funktionen herunder skriver i tælleren. Ingen adgangsregler
-- til anon: RLS slås til uden policies, så alt andet end
-- security definer-funktionen prelles af.
alter table public.bordnumre enable row level security;

create or replace function public.mosede_giv_bordnummer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  /* Klientens bud smides ALTID væk — se noten øverst. */
  insert into public.bordnumre as t (lokation_id, naeste)
    values (new.lokation_id, 1)
  on conflict (lokation_id)
    do update set naeste = t.naeste + 1
  returning naeste into n;

  new.nummer := n;
  return new;
end;
$$;

drop trigger if exists bordbestilling_nummer on public.bordbestillinger;
create trigger bordbestilling_nummer
  before insert on public.bordbestillinger
  for each row execute function public.mosede_giv_bordnummer();

-- ------------------------------------------------------------
--  DE GAMLE BOOKINGER FÅR OGSÅ ET NUMMER — ÉN GANG
-- ------------------------------------------------------------
--  I den rækkefølge de kom ind. Uden det stod dagens liste med
--  numre på de nye kort og BO-koder på resten, og så er der to
--  slags at læse på den samme skærm. Køres filen igen, er
--  where-linjen tom, og tælleren står urørt.
with nummererede as (
  select id,
         row_number() over (partition by lokation_id order by oprettet, id) as rn
  from public.bordbestillinger
  where nummer is null
)
update public.bordbestillinger b
   set nummer = n.rn + coalesce(
     (select naeste from public.bordnumre t
       where t.lokation_id = b.lokation_id), 0)
  from nummererede n
 where b.id = n.id;

-- Og tælleren skal stå EFTER det højeste uddelte nummer —
-- ellers ville den næste rigtige booking få et brugt nummer.
insert into public.bordnumre (lokation_id, naeste)
select lokation_id, max(nummer)
  from public.bordbestillinger
 where nummer is not null
 group by lokation_id
on conflict (lokation_id)
  do update set naeste = greatest(
    public.bordnumre.naeste, excluded.naeste);

-- ------------------------------------------------------------
--  GÆSTEN SKAL KUNNE SE SIT EGET NUMMER — OG KUN DET
-- ------------------------------------------------------------
--  Gæsten må ikke læse bordbestillinger (fase 4's regel), så
--  kvitteringen kan ikke hente rækken. Funktionen her svarer
--  med ÉT tal for én reference — og kun mens kvitteringen
--  faktisk står på skærmen (en time). Referencen er gæstens
--  egen (hendes browser lavede den); at gætte en fremmed er
--  samme regnestykke som bordets nøgle, og svaret indeholder
--  hverken navn, nummer, dato eller antal.
create or replace function public.mosede_bordnummer(ref text)
returns integer
language sql
security definer
set search_path = ''
stable
as $$
  select nummer from public.bordbestillinger
   where reference = ref
     and oprettet > now() - interval '1 hour'
   limit 1;
$$;

grant execute on function public.mosede_bordnummer(text) to anon, authenticated;

-- Editoren viser kun den sidste sætnings svar.
select
  'bordnummer er på plads' as resultat,
  (select count(*) from public.bordbestillinger where nummer is not null)
    as raekker_med_nummer,
  (select coalesce(max(naeste), 0) from public.bordnumre)
    as taeller_staar_paa;
