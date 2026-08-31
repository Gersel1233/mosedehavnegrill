-- ============================================================
--  BESTILLINGEN FÅR ET NUMMER, MAN KAN SIGE HØJT  (31. aug 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER setup.sql + flerlejer.sql. Filen kan køres igen
--  uden at ødelægge noget — nummereringen fortsætter, hvor den
--  slap.
--
--  ------------------------------------------------------------
--  HVOR DEN KOMMER FRA
--  ------------------------------------------------------------
--  Kundens ord 31/8, med et skærmbillede af kortet i admin:
--  "kan bestillings-ordrenummeret ikke være fra #0000 af, lidt
--  pænere end det der" — det der var SM260831-UBJ7E. Og i samme
--  åndedrag: "intet må gå tabt af bestillingerne".
--
--  ------------------------------------------------------------
--  ⚠️ NUMMERET LÆGGES VED SIDEN AF REFERENCEN — DEN RØRES IKKE
--  ------------------------------------------------------------
--  Referencen (SM260831-UBJ7E) er rækkens nøgle: den laves i
--  gæstens browser FØR afsendelsen, den er unik uden at spørge
--  nogen, og den står i gamle kvitteringer, mails og noter.
--  Skiftede vi den ud, ville hver eneste gammel kvittering pege
--  på ingenting — det er præcis "intet må gå tabt". Nummeret er
--  det, ØJNE og TELEFONER bruger ("bestilling syvogfyrre"), og
--  det tælles op af databasen her.
--
--  ⚠️ TÆLLES I DATABASEN, IKKE I BROWSEREN. To gæster, der
--  sender samtidig, må ikke få det samme nummer — samme grund
--  som reservation_bremse: rækken i taellertabellen låses af
--  opdateringen, så nummer 47 kun uddeles én gang.
--
--  ⚠️ GÆSTEN KAN IKKE VÆLGE SIT NUMMER. Triggeren OVERSKRIVER
--  alt, hvad der måtte stå i kolonnen ved insert — ellers kunne
--  enhver med anon-nøglen sende nummer 1 ind og forvirre
--  køkkenets skærm. Samme lov som bordets nøgle: klientens bud
--  smides væk.
--
--  ⚠️ ÉN TÆLLER PR. FORRETNING (flerlejer.sql's regel): får
--  huset en lokation mere, begynder den på 1 i stedet for at
--  arve Mosedes hul i rækken.
-- ============================================================

/* ⚠️ MED VILJE INGEN unique på nummer. Nummeret er noget, øjne
   læser — ikke rækkens nøgle (det er referencen). Satte vi
   unique på, ville et sammenstød AFVISE en bestilling, og en
   tabt bestilling er dyrere end to kort med samme tal en aften,
   hvor filen her blev kørt midt i en ordre. */
alter table public.bestillinger
  add column if not exists nummer integer;

create table if not exists public.bestillingsnumre (
  lokation_id text primary key
    references public.lokationer(id) on delete cascade,
  naeste      integer not null default 0
);

-- Kun funktionen herunder skriver i tælleren. Ingen adgangsregler
-- til anon: RLS slås til uden policies, så alt andet end
-- security definer-funktionen prelles af.
alter table public.bestillingsnumre enable row level security;

create or replace function public.mosede_giv_bestillingsnummer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  /* Klientens bud smides ALTID væk — se noten øverst. */
  insert into public.bestillingsnumre as t (lokation_id, naeste)
    values (new.lokation_id, 1)
  on conflict (lokation_id)
    do update set naeste = t.naeste + 1
  returning naeste into n;

  new.nummer := n;
  return new;
end;
$$;

drop trigger if exists bestilling_nummer on public.bestillinger;
create trigger bestilling_nummer
  before insert on public.bestillinger
  for each row execute function public.mosede_giv_bestillingsnummer();

-- ------------------------------------------------------------
--  DE GAMLE BESTILLINGER FÅR OGSÅ ET NUMMER — ÉN GANG
-- ------------------------------------------------------------
--  I den rækkefølge de kom ind. Uden det stod dagens liste med
--  numre på de nye kort og huller på resten, og "intet må gå
--  tabt" gælder også bagud: hver række, gammel som ny, kan
--  siges højt. Køres filen igen, er where-linjen tom, og
--  tælleren står urørt.
with nummererede as (
  select id,
         row_number() over (partition by lokation_id order by oprettet, id) as rn
  from public.bestillinger
  where nummer is null
)
update public.bestillinger b
   set nummer = n.rn + coalesce(
     (select naeste from public.bestillingsnumre t
       where t.lokation_id = b.lokation_id), 0)
  from nummererede n
 where b.id = n.id;

-- Og tælleren skal stå EFTER det højeste uddelte nummer —
-- ellers ville den næste rigtige bestilling få et brugt nummer.
insert into public.bestillingsnumre (lokation_id, naeste)
select lokation_id, max(nummer)
  from public.bestillinger
 where nummer is not null
 group by lokation_id
on conflict (lokation_id)
  do update set naeste = greatest(
    public.bestillingsnumre.naeste, excluded.naeste);

-- ------------------------------------------------------------
--  GÆSTEN SKAL KUNNE SE SIT EGET NUMMER — OG KUN DET
-- ------------------------------------------------------------
--  Gæsten må ikke læse bestillinger (fase 0's regel), så
--  kvitteringen kan ikke hente rækken. Funktionen her svarer
--  med ÉT tal for én reference — og kun mens kvitteringen
--  faktisk står på skærmen (en time). Referencen er gæstens
--  egen hemmelighed (hendes browser lavede den); at gætte en
--  fremmed er samme regnestykke som bordets nøgle, og svaret
--  indeholder hverken navn, nummer eller mad.
create or replace function public.mosede_bestillingsnummer(ref text)
returns integer
language sql
security definer
set search_path = ''
stable
as $$
  select nummer from public.bestillinger
   where reference = ref
     and oprettet > now() - interval '1 hour'
   limit 1;
$$;

grant execute on function public.mosede_bestillingsnummer(text) to anon, authenticated;

-- Editoren viser kun den sidste sætnings svar.
select
  'bestillingsnummer er på plads' as resultat,
  (select count(*) from public.bestillinger where nummer is not null)
    as raekker_med_nummer,
  (select coalesce(max(naeste), 0) from public.bestillingsnumre)
    as taeller_staar_paa;
