-- ============================================================
--  Mosede Havnegrill & Ishus – opsætning af databasen
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
  afdeling    text not null default 'grill',
  navn        text not null,
  sortering   int  not null default 0,
  aktiv       boolean not null default true,

  constraint afdeling_gyldig  check (afdeling in ('grill', 'is')),
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
   'Mosede Havnegrill & Ishus',
   'Havnevej 20I',           -- bekræftet af kunden (I som i Ida, ikke tallet 1)
   '2670', 'Greve',
   '28871343',
   1,
   'Grillbar og ishus midt på Mosede Havn – med udsigt over vandet og bådene.')
on conflict (id) do nothing;

-- Åbningstider: 10–20 alle dage. Bekræftet af kunden.
insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker)
select 'mosede', g, false, '10:00', '20:00'
from generate_series(0, 6) as g
on conflict (lokation_id, ugedag) do nothing;

-- Menukort: kategorier fælles for alle lokationer (lokation_id = null)
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select null, v.afdeling, v.navn, v.sortering
from (values
  ('grill', 'Sandwich',      1),
  ('grill', 'Burgere',       2),
  ('grill', 'Fisk',          3),
  ('grill', 'Klassikere',    4),
  ('grill', 'Tilbehør',      5),
  ('is',    'Softice',       6),
  ('is',    'Kugleis',       7)
) as v(afdeling, navn, sortering)
where not exists (
  select 1 from public.menu_kategorier k
  where k.navn = v.navn and k.lokation_id is null
);

-- Et par varer at starte fra. Priser er IKKE udfyldt – de sættes
-- i admin, så vi ikke skriver forkerte priser på nettet.
insert into public.menu_varer (kategori_id, navn, beskrivelse, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.fremhaevet, v.sortering
from (values
  ('Sandwich', 'Flæskestegssandwich',
   'Husets mest omtalte. Sprød flæskesteg, rødkål og agurkesalat.', true, 1),
  ('Sandwich', 'Bøfsandwich',
   'Klassisk bøfsandwich med det hele.', false, 2)
) as v(kategori, navn, beskrivelse, fremhaevet, sortering)
join public.menu_kategorier k
  on k.navn = v.kategori and k.lokation_id is null
where not exists (
  select 1 from public.menu_varer m
  where m.kategori_id = k.id and m.navn = v.navn
);

-- Indstillinger med fornuftige udgangspunkter
insert into public.indstillinger (noegle, vaerdi) values
  ('dagens_besked',   '{"vis": false, "tekst": ""}'::jsonb),
  ('saeson',          '{"lukket": false, "aabner_igen": "", "besked": ""}'::jsonb),
  ('kontakt_email',   '""'::jsonb),

  -- Tavlen ved luge 2. Skiftes hver morgen i admin.
  -- Tom liste = sektionen skjules helt på forsiden.
  ('dagens_kugler',   '[]'::jsonb),

  -- De fire tal på forsiden: {"tal": "18", "tekst": "slags kugleis"}
  -- Tomme med vilje. Vi skriver ikke "54 somre på havnen" på
  -- nettet før nogen har bekræftet at det passer.
  ('noegletal',       '[]'::jsonb),

  -- Havnestriben. Uden en kilde skal de stå tomme – en opdigtet
  -- vandtemperatur er værre end ingen vandtemperatur.
  ('vandtemp',        '""'::jsonb),
  ('vind',            '""'::jsonb),
  ('landing',         '""'::jsonb)
on conflict (noegle) do nothing;


-- ============================================================
--  FÆRDIG.
--  Næste skridt i Supabase:
--    Authentication → Users → Add user
--    → samme e-mail som i punkt 1, valgfri adgangskode,
--      sæt hak i "Auto Confirm User".
-- ============================================================
