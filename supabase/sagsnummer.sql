/* ============================================================
   ET HUSKBART NUMMER TIL FORESPØRGSLER, BAGLOKALET OG
   TILMELDINGER                                     (10. sep 2026)
   ------------------------------------------------------------
   Kundens ord: *"reference nummer er korrekt til forespørgsler,
   men nummeret skal være ordentligt og huskbart."*

   Han har ret. En reference som FO260909-JJJ11 er fjorten tegn
   og kan ikke siges i en telefon uden at blive stavet. Mad har
   haft #0047 siden 31/8 (bestillingsnummer.sql) og bordene et
   bookingnummer siden 4/9 (bordnummer.sql) — de tre sidste
   gæstetabeller havde kun referencen.

   Filen her er de to eksisterende kopieret POST FOR POST til
   forespoergsler, udlejninger og reservationer. Der er ikke
   fundet et nyt mønster på; det ville være en tredje udgave af
   den samme regel.

   ⚠️ KØR `dato-vaern-resten.sql` FØRST, hvis den ikke er kørt.
   `bestillingsnummer.sql` FEJLEDE hos kunden 3/9, fordi
   efterudfyldningen er en OPDATERING, og Postgres efterprøver
   HVERT CHECK på hele rækken — et `current_date`-CHECK gjorde
   gamle rækker ugyldige. Målt 10/9: de tre tabeller her har
   ingen sådanne CHECK længere (de blev til udløsere), men køres
   filen på en base, hvor de stadig står, falder den med 23514.

   ⚠️ MED VILJE INGEN unique PÅ nummer — samme grund som ved
   bestillingerne: nummeret er noget, ØJNE læser, ikke rækkens
   nøgle (det er referencen). Et sammenstød skal give to kort med
   samme tal, ikke en AFVIST forespørgsel. En tabt forespørgsel
   er dyrere end et gentaget tal.

   ⚠️ OG HVER TABEL HAR SIN EGEN TÆLLER. Delte de tal, ville
   forespørgsel 3 blive til 58, fordi der kom et selskab og en
   tilmelding imellem — og personalet ville tro, der manglede
   femoghalvtreds sager. Samme beslutning som mad og borde fik
   4/9 (prøve 5 i proev-bordnummer.sql måler netop det).
   ============================================================ */

begin;

-- ---------- 1) KOLONNEN OG TÆLLEREN, ÉN PR. TABEL ----------
alter table public.forespoergsler add column if not exists nummer integer;
alter table public.udlejninger    add column if not exists nummer integer;
alter table public.reservationer  add column if not exists nummer integer;

create table if not exists public.sagsnumre (
  lokation_id text not null references public.lokationer(id) on delete cascade,
  slags       text not null,
  naeste      integer not null default 0,
  primary key (lokation_id, slags),
  constraint sagsnummer_slags_ok
    check (slags in ('forespoergsel', 'udlejning', 'reservation'))
);
alter table public.sagsnumre enable row level security;

comment on table public.sagsnumre is
  'Én tæller pr. forretning PR. SLAGS. Fælles tal ville få den ene '
  'række til at springe, fordi den anden slags kom imellem.';

-- ---------- 2) UDLØSEREN ----------
/* Klientens bud smides ALTID væk. Kunne browseren sætte
   nummeret, kunne to gæster sende det samme — og et tal, der er
   sat udefra, er ikke et løbenummer. Samme lov som bordets
   nøgle og bestillingsnummeret. */
create or replace function public.mosede_giv_sagsnummer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
  s text;
begin
  s := case tg_table_name
         when 'forespoergsler' then 'forespoergsel'
         when 'udlejninger'    then 'udlejning'
         else                       'reservation'
       end;

  insert into public.sagsnumre as t (lokation_id, slags, naeste)
    values (new.lokation_id, s, 1)
  on conflict (lokation_id, slags)
    do update set naeste = t.naeste + 1
  returning naeste into n;

  new.nummer := n;
  return new;
end;
$$;

drop trigger if exists forespoergsel_nummer on public.forespoergsler;
create trigger forespoergsel_nummer
  before insert on public.forespoergsler
  for each row execute function public.mosede_giv_sagsnummer();

drop trigger if exists udlejning_nummer on public.udlejninger;
create trigger udlejning_nummer
  before insert on public.udlejninger
  for each row execute function public.mosede_giv_sagsnummer();

drop trigger if exists reservation_nummer on public.reservationer;
create trigger reservation_nummer
  before insert on public.reservationer
  for each row execute function public.mosede_giv_sagsnummer();

-- ---------- 3) DE GAMLE RÆKKER FÅR ET NUMMER ----------
/* I den rækkefølge, de kom ind. Et nummer, der ikke følger
   tiden, er ikke et løbenummer — og personalet læser listen
   ovenfra. */
with n as (
  select id, row_number() over (partition by lokation_id order by oprettet, id) as rn
  from public.forespoergsler where nummer is null)
update public.forespoergsler f set nummer = n.rn
  from n where f.id = n.id;

with n as (
  select id, row_number() over (partition by lokation_id order by oprettet, id) as rn
  from public.udlejninger where nummer is null)
update public.udlejninger u set nummer = n.rn
  from n where u.id = n.id;

with n as (
  select id, row_number() over (partition by lokation_id order by oprettet, id) as rn
  from public.reservationer where nummer is null)
update public.reservationer r set nummer = n.rn
  from n where r.id = n.id;

-- ---------- 4) TÆLLEREN SÆTTES FORBI DET HØJESTE ----------
/* Ellers ville næste sag genbruge et tal, der allerede står på
   et kort. greatest() gør filen kørbar igen: en tæller, der
   allerede er højere, sættes ikke ned. */
insert into public.sagsnumre (lokation_id, slags, naeste)
select lokation_id, 'forespoergsel', max(nummer)
  from public.forespoergsler where nummer is not null group by lokation_id
on conflict (lokation_id, slags) do update
  set naeste = greatest(public.sagsnumre.naeste, excluded.naeste);

insert into public.sagsnumre (lokation_id, slags, naeste)
select lokation_id, 'udlejning', max(nummer)
  from public.udlejninger where nummer is not null group by lokation_id
on conflict (lokation_id, slags) do update
  set naeste = greatest(public.sagsnumre.naeste, excluded.naeste);

insert into public.sagsnumre (lokation_id, slags, naeste)
select lokation_id, 'reservation', max(nummer)
  from public.reservationer where nummer is not null group by lokation_id
on conflict (lokation_id, slags) do update
  set naeste = greatest(public.sagsnumre.naeste, excluded.naeste);

commit;

-- ---------- 5) GÆSTEN SKAL KUNNE SE SIT EGET NUMMER ----------
/* ⚠️ HUN MÅ IKKE LÆSE TABELLERNE (RLS), og det skal hun heller
   ikke. Samme greb som mosede_bestillingsnummer (31/8): en
   security definer-funktion, der kun svarer på en reference, man
   HAR, og kun en time frem. Referencen laves i gæstens egen
   browser, så hun har den; en fremmed har ikke.

   ⚠️ DEN SVARER KUN MED ET TAL. Ikke navn, ikke telefon, ikke
   besked — præcis som optagne_dage og arrangement_pladser kun
   svarer med det ene, de skal. Et opslag, der kunne give mere,
   ville være en ny vej ind i gæsternes oplysninger.

   ⚠️ ÉN FUNKTION TIL ALLE TRE, fordi referencen bærer slagsen i
   sit præfiks (FO/UD/RE) og er unik på tværs. To opslag ville
   betyde, at klienten skulle vide, hvilken tabel sagen lå i — og
   det er præcis den viden, et sagsregister findes for at slippe
   for. */
create or replace function public.mosede_sagsnummer(ref text)
returns integer
language sql
security definer
set search_path = ''
stable
as $$
  select nummer from public.forespoergsler
   where reference = ref and oprettet > now() - interval '1 hour'
  union all
  select nummer from public.udlejninger
   where reference = ref and oprettet > now() - interval '1 hour'
  union all
  select nummer from public.reservationer
   where reference = ref and oprettet > now() - interval '1 hour'
  limit 1;
$$;

grant execute on function public.mosede_sagsnummer(text) to anon, authenticated;

-- ---------- RAPPORT ----------
select 'forespørgsler' as slags, count(*) filter (where nummer is not null) as med_nummer,
       count(*) as i_alt, max(nummer) as hoejeste from public.forespoergsler
union all
select 'baglokalet', count(*) filter (where nummer is not null), count(*), max(nummer)
  from public.udlejninger
union all
select 'tilmeldinger', count(*) filter (where nummer is not null), count(*), max(nummer)
  from public.reservationer;
