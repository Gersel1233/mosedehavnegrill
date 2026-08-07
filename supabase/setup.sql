-- ============================================================
--  Mosede Havnegrill og Ishus – opsætning af databasen
--  ------------------------------------------------------------
--  Kør HELE denne fil én gang i Supabase → SQL Editor → New query.
--  Den kan køres igen uden at ødelægge noget (alt er "if not exists").
--
--  VIGTIGT FØR DU KØRER: ret e-mailen i punkt 1 nedenfor til den
--  e-mail personalet skal logge ind i admin med.
-- ============================================================


-- ------------------------------------------------------------
-- 1) HVEM MÅ ÆNDRE NOGET?
--    Kun de e-mails der står her, kan rette priser, tider osv.
--    Skal en medarbejder mere have adgang: tilføj e-mailen i
--    listen, kør denne blok igen, og opret brugeren under
--    Authentication → Users → Add user.
-- ------------------------------------------------------------
-- "security definer" betyder at funktionen kører med ejerens
-- rettigheder. Det gør den uafhængig af hvad en tilfældig gæst
-- ellers må – og dermed kan den ikke fejle på grund af manglende
-- adgang og tage hele hjemmesiden med sig.
create or replace function public.is_admin() returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'email', '') = any (array[
    'UDFYLD-CHEFENS-EMAIL@eksempel.dk'   -- ← RET DENNE
  ]);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;


-- ------------------------------------------------------------
-- 2) LOKATIONER
--    Der er én i dag (Mosede Havn), men tabellen er bygget til
--    flere. Lokation nummer to er bare en ny række – ingen
--    kodeændringer.
-- ------------------------------------------------------------
create table if not exists public.lokationer (
  id          text primary key,
  navn        text not null,
  adresse     text not null,
  postnr      text not null,
  by          text not null,
  telefon     text,
  email       text,
  -- Bruges til kort og til Googles visning. Må gerne være tomme.
  lat         double precision,
  lng         double precision,
  beskrivelse text,
  sortering   int  not null default 0,
  aktiv       boolean not null default true,
  oprettet    timestamptz not null default now(),

  -- Lag 3 af valideringen: databasen afviser tomme navne og
  -- forkerte postnumre, også hvis formularen og JS'en svigter.
  constraint lokation_navn_ikke_tom  check (length(btrim(navn)) between 1 and 120),
  constraint lokation_postnr_gyldigt check (postnr ~ '^[0-9]{4}$')
);


-- ------------------------------------------------------------
-- 3) ÅBNINGSTIDER – én række pr. ugedag pr. lokation
--    ugedag: 0 = mandag ... 6 = søndag
-- ------------------------------------------------------------
create table if not exists public.aabningstider (
  lokation_id text not null references public.lokationer(id) on delete cascade,
  ugedag      int  not null,
  lukket      boolean not null default false,
  aabner      time,
  lukker      time,

  primary key (lokation_id, ugedag),

  constraint ugedag_gyldig check (ugedag between 0 and 6),
  -- Er der åbent, SKAL begge tider være sat, og der skal lukkes
  -- efter der er åbnet. Det kan ikke omgås fra browseren.
  constraint tider_haenger_sammen check (
    lukket = true
    or (aabner is not null and lukker is not null and lukker > aabner)
  )
);


-- ------------------------------------------------------------
-- 4) LUKKEDAGE – ferie, personaledag, vinterlukning
-- ------------------------------------------------------------
create table if not exists public.lukkedage (
  id          bigserial primary key,
  lokation_id text not null references public.lokationer(id) on delete cascade,
  dato        date not null,
  aarsag      text,
  emoji       text,

  unique (lokation_id, dato),
  constraint aarsag_laengde check (aarsag is null or length(aarsag) <= 80),
  constraint emoji_laengde  check (emoji  is null or length(emoji)  <= 8)
);


-- ------------------------------------------------------------
-- 5) MENUKORT
--    Kategorier med lokation_id = null er FÆLLES for alle
--    lokationer. Sættes lokation_id, findes kategorien kun der.
--    Det er sådan "fælles menu + lokale ekstra" virker.
--
--    afdeling: 'grill' eller 'is' – de to halvdele af forretningen
--    vises hver for sig på menukortet.
-- ------------------------------------------------------------
create table if not exists public.menu_kategorier (
  id          bigserial primary key,
  lokation_id text references public.lokationer(id) on delete cascade,
  afdeling    text not null default 'mad',
  navn        text not null,
  sortering   int  not null default 0,
  aktiv       boolean not null default true,

  constraint afdeling_gyldig  check (afdeling in ('mad', 'is', 'drikke')),
  constraint kategori_navn_ok check (length(btrim(navn)) between 1 and 80)
);

create table if not exists public.menu_varer (
  id          bigserial primary key,
  kategori_id bigint not null references public.menu_kategorier(id) on delete cascade,
  navn        text not null,
  beskrivelse text,
  -- Prisen er i kroner. Databasen afviser negative priser og
  -- tastefejl på 100.000 kr. for en pølse.
  pris        numeric(8,2),
  fremhaevet  boolean not null default false,
  udsolgt     boolean not null default false,
  sortering   int  not null default 0,
  aktiv       boolean not null default true,

  constraint vare_navn_ok    check (length(btrim(navn)) between 1 and 120),
  constraint vare_tekst_ok   check (beskrivelse is null or length(beskrivelse) <= 400),
  constraint pris_realistisk check (pris is null or (pris >= 0 and pris < 10000))
);

create index if not exists menu_varer_kategori_idx on public.menu_varer(kategori_id);


-- ------------------------------------------------------------
--  OPGRADERING af en database der allerede findes
--  ------------------------------------------------------------
--  "create table if not exists" rører ikke en tabel der er der i
--  forvejen, så en ændret begrænsning skal skiftes med hånden.
--  Rækkefølgen betyder noget: begrænsningen skal væk FØR de gamle
--  rækker rettes, ellers afviser den sin egen opdatering.
--
--  Kører du på en tom database, gør blokken ingenting.
-- ------------------------------------------------------------
alter table public.menu_kategorier drop constraint if exists afdeling_gyldig;
update public.menu_kategorier set afdeling = 'mad' where afdeling = 'grill';
alter table public.menu_kategorier
  add constraint afdeling_gyldig check (afdeling in ('mad', 'is', 'drikke'));


-- ------------------------------------------------------------
-- 6) NYHEDER FRA KØKKENET
-- ------------------------------------------------------------
create table if not exists public.nyheder (
  id       bigserial primary key,
  titel    text not null,
  tekst    text not null,
  dato     date not null default current_date,
  aktiv    boolean not null default true,
  oprettet timestamptz not null default now(),

  constraint nyhed_titel_ok check (length(btrim(titel)) between 1 and 120),
  constraint nyhed_tekst_ok check (length(btrim(tekst)) between 1 and 2000)
);


-- ------------------------------------------------------------
-- 7) INDSTILLINGER – alt det løse, som tekster på forsiden,
--    "dagens besked" og sæson-tilstand. Nøgle/værdi, så vi kan
--    tilføje nye felter uden at lave nye tabeller.
-- ------------------------------------------------------------
create table if not exists public.indstillinger (
  noegle   text primary key,
  vaerdi   jsonb not null,
  aendret  timestamptz not null default now()
);


-- ============================================================
--  ADGANGSREGLER (RLS)
--  Kunderne skriver INTET i version 1 – der er ingen bestilling.
--  Derfor er reglen enkel: alle må læse, kun chefen må ændre.
-- ============================================================

alter table public.lokationer      enable row level security;
alter table public.aabningstider   enable row level security;
alter table public.lukkedage       enable row level security;
alter table public.menu_kategorier enable row level security;
alter table public.menu_varer      enable row level security;
alter table public.nyheder         enable row level security;
alter table public.indstillinger   enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'lokationer', 'aabningstider', 'lukkedage',
    'menu_kategorier', 'menu_varer', 'nyheder', 'indstillinger'
  ]
  loop
    -- Alle (også ikke-indloggede gæster) må læse
    execute format(
      'drop policy if exists %I on public.%I', t || '_laes_alle', t);
    execute format(
      'create policy %I on public.%I for select using (true)',
      t || '_laes_alle', t);

    -- Kun chefen må oprette, rette og slette.
    -- Bemærk: tre separate regler i stedet for én "for all".
    -- "for all" ville også gælde læsning, og så skulle hver
    -- eneste gæst køre is_admin() bare for at se menukortet.
    execute format(
      'drop policy if exists %I on public.%I', t || '_skriv_admin', t);
    execute format(
      'drop policy if exists %I on public.%I', t || '_opret_admin', t);
    execute format(
      'drop policy if exists %I on public.%I', t || '_ret_admin', t);
    execute format(
      'drop policy if exists %I on public.%I', t || '_slet_admin', t);

    execute format(
      'create policy %I on public.%I for insert with check (public.is_admin())',
      t || '_opret_admin', t);
    execute format(
      'create policy %I on public.%I for update
         using (public.is_admin()) with check (public.is_admin())',
      t || '_ret_admin', t);
    execute format(
      'create policy %I on public.%I for delete using (public.is_admin())',
      t || '_slet_admin', t);
  end loop;
end $$;


-- ============================================================
--  STARTDATA
--  ------------------------------------------------------------
--  Åbningstider og adresse er bekræftet af kunden.
--  Alt kan rettes i admin bagefter, uden SQL.
-- ============================================================

insert into public.lokationer
  (id, navn, adresse, postnr, by, telefon, sortering, beskrivelse)
values
  ('mosede',
   -- Navnet som det står på forretningens eget menukort.
   -- BEMÆRK: skiltet på facaden siger "Mosede Havn - Grill & Kiosk",
   -- og Facebook siger "Mosede havn grill & Ishus". Tre varianter.
   -- Ret her når kunden har valgt én.
   'Mosede Havnegrill og Ishus',
   'Havnevej 20I',           -- bekræftet af kunden (I som i Ida, ikke tallet 1)
   '2670', 'Greve',
   '28871343',
   1,
   'Spis på trædækket med udsigt over bådene.')
on conflict (id) do nothing;

-- Åbningstider: 10–20 alle dage. Bekræftet af kunden.
insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker)
select 'mosede', g, false, '10:00', '20:00'
from generate_series(0, 6) as g
on conflict (lokation_id, ugedag) do nothing;

-- ------------------------------------------------------------
--  MENUKORTET LIGGER I SIN EGEN FIL
--  ------------------------------------------------------------
--  Kør supabase/menukort.sql bagefter. Der ligger alle 14
--  kategorier og 151 varer, skrevet af efter forretningens eget
--  menukort.
--
--  Herunder ryddes de syv pladsholder-kategorier væk som de
--  tidligere udgaver af denne fil lagde ind ("Sandwich",
--  "Burgere", "Fisk" osv.).
--
--  TO SPÆRRER, OG DEN ANDEN ER DEN VIGTIGE:
--
--    1) Kun præcis de syv navne. Har nogen omdøbt en kategori i
--       admin, får den fred.
--
--    2) Kun hvis INGEN vare i kategorien har en pris. Sletningen
--       tager varerne med sig (fremmednøglen er on delete
--       cascade), og har personalet skrevet en pris ind, er det
--       en beslutning et menneske har taget. Den må et
--       oprydnings-script ikke kassere i tavshed.
--
--  Bliver en kategori derfor stående, står den nederst i
--  oversigten til sidst i filen. Slet den selv i admin når du
--  har set hvad der stod i den.
-- ------------------------------------------------------------
delete from public.menu_kategorier k
 where k.lokation_id is null
   and k.navn in ('Sandwich', 'Burgere', 'Fisk', 'Klassikere', 'Tilbehør',
                  'Softice', 'Kugleis')
   and not exists (
     select 1 from public.menu_varer v
      where v.kategori_id = k.id and v.pris is not null);


-- Indstillinger med fornuftige udgangspunkter
insert into public.indstillinger (noegle, vaerdi) values
  ('dagens_besked',   '{"vis": false, "tekst": ""}'::jsonb),
  ('saeson',          '{"lukket": false, "aabner_igen": "", "besked": ""}'::jsonb),
  ('kontakt_email',   '""'::jsonb),

  -- Tavlen ved luge 2. Skiftes hver morgen i admin.
  -- Tom liste = sektionen skjules helt på forsiden.
  ('dagens_kugler',   '[]'::jsonb),

  -- Havnestriben. Uden en kilde skal de stå tomme – en opdigtet
  -- vandtemperatur er værre end ingen vandtemperatur.
  ('vandtemp',        '""'::jsonb),
  ('vind',            '""'::jsonb),
  ('landing',         '""'::jsonb),

  -- Linjen under menukortet. Teksten står på forretningens eget
  -- menukort, så den er belagt med bevis.
  ('menu_note', '"Smørrebrød kan leveres glutenfri eller uden smør. Vi leverer smørrebrød og platter til alle arrangementer, store som små – ring og hør nærmere."'::jsonb)
on conflict (noegle) do nothing;


-- ------------------------------------------------------------
--  Blev der noget stående? Så står det her.
--  Tom liste = alt er ryddet.
-- ------------------------------------------------------------
select k.navn as "pladsholder der blev stående",
       count(v.id) as varer,
       count(v.pris) as "med pris"
  from public.menu_kategorier k
  left join public.menu_varer v on v.kategori_id = k.id
 where k.lokation_id is null
   and k.navn in ('Sandwich', 'Burgere', 'Fisk', 'Klassikere', 'Tilbehør',
                  'Softice', 'Kugleis')
 group by k.navn;


-- ============================================================
--  FÆRDIG.
--  Næste skridt i Supabase:
--    Authentication → Users → Add user
--    → samme e-mail som i punkt 1, valgfri adgangskode,
--      sæt hak i "Auto Confirm User".
-- ============================================================
