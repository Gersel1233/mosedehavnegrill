-- ============================================================
--  Mosede Havnecafe – opsætning af databasen
--  ------------------------------------------------------------
--  Kør HELE denne fil én gang i Supabase → SQL Editor → New query.
--  Den kan køres igen uden at ødelægge noget (alt er "if not exists").
--
--  VIGTIGT FØR DU KØRER: ret e-mailen i punkt 1 nedenfor til den
--  e-mail personalet skal logge ind i admin med. is_admin() bliver
--  "create or replace"'et hver gang filen køres — står pladsholderen
--  der, mister den nuværende chef sin adgang, og alt ser ud til at
--  være gået godt imens.
--
--  ------------------------------------------------------------
--  KØR DEN FØR flerlejer.sql, ALDRIG EFTER
--  ------------------------------------------------------------
--  Indsættelsen af indstillinger nederst siger "on conflict
--  (noegle)". Efter flerlejer.sql er primærnøglen
--  (lokation_id, noegle), og den konflikt findes så ikke længere:
--  filen fejler med "no unique or exclusion constraint matching".
--
--  Rækkefølgen er envejs:
--     setup.sql → flerlejer.sql → bremse.sql → menukort.sql
--
--  Mangler der en tabel i en database der ALLEREDE er migreret —
--  fx fordi setup.sql sidst blev kørt før bestillingssystemet
--  fandtes — så kør kun det stykke der mangler, ikke hele filen.
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
    -- ↓ RET LINJEN HERUNDER: slet HELE teksten mellem apostrofferne
    --   og skriv chefens e-mail i stedet. Skal der flere på, så én
    --   pr. linje med komma imellem.
    'UDFYLD-CHEFENS-EMAIL@eksempel.dk'
  ]);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

/* STOP, HVIS PLADSHOLDEREN STÅR DER STADIG — HELT ELLER HALVT.

   Det her er en HÅRD fejl og ikke en advarsel, og det er der en
   grund til: Supabases SQL Editor viser ikke notices og warnings.
   En advarsel her ville altså være usynlig præcis dér, hvor filen
   oftest bliver kørt — og resultatet er en database, hvor alt ser
   ud til at være gået godt, mens ingen kan logge ind i admin.

   Der tjekkes for STUMPER af pladsholderen, ikke for hele
   teksten. Den 18. august 2026 blev kun "EMAIL@eksempel.dk"
   erstattet, så der stod "UDFYLD-CHEFENS-chefens@rigtige.mail" —
   en adresse der ligner en e-mail nok til at slippe forbi en
   vagt, der kun kender den fulde pladsholder. Fejlen kostede en
   aften. */
do $$
declare krop text;
begin
  select p.prosrc into krop
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'is_admin';

  if krop ~* 'UDFYLD' or krop ~* 'eksempel\.dk' then
    raise exception E'\n\n  E-MAILEN I PUNKT 1 ER IKKE RETTET FÆRDIG.\n\n'
      '  Der skal stå KUN chefens e-mail mellem apostrofferne:\n'
      '      ''chef@havnegrillen.dk''\n'
      '  Der står stadig en stump af pladsholderen — se efter\n'
      '  "UDFYLD" eller "eksempel.dk" i punkt 1 og slet HELE\n'
      '  teksten mellem apostrofferne, før du skriver e-mailen.\n\n'
      '  I Supabases SQL Editor køres hele filen som én omgang, så\n'
      '  intet er ændret. Ret linjen og kør filen igen.\n';
  end if;
end $$;


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


-- ------------------------------------------------------------
-- 8) BESTILLINGER AF SMØRREBRØD UD AF HUSET
--    ----------------------------------------------------------
--    Den ENESTE tabel en gæst kan skrive i, og den kan gæsten
--    ikke læse. Se adgangsreglerne længere nede – begrundelsen
--    står der, og den er vigtig.
--
--    Linjerne ligger som jsonb og ikke i en tabel for sig.
--    Grunden er at en bestilling skal blive stående som den var
--    DA DEN BLEV LAGT: hedder fyldet noget andet om et halvt år,
--    eller er det taget af kortet, skal bestillingen fra i går
--    stadig kunne læses af den der pakker den. En fremmednøgle
--    til menu_varer ville give en bestilling der ændrer sig, og
--    det er det modsatte af en bestilling.
-- ------------------------------------------------------------
create table if not exists public.bestillinger (
  /* IDENTITY OG IKKE bigserial, OG DET ER IKKE SMAG.
     bigserial laver en almindelig sekvens, og den der indsætter
     skal have "usage" på den. Gæsten er rollen anon, og prøvet mod
     en tom Postgres 16 fejlede indsættelsen med "permission denied
     for sequence bestillinger_id_seq" – RLS var i orden, det var
     sekvensen der manglede.
     En identity-kolonne har sin sekvens ejet af kolonnen, og
     Postgres bruger den på tabellens vegne. Der er ingen ekstra
     rettighed at glemme, og det er præcis den slags fejl man ikke
     opdager før en gæst prøver at bestille. */
  id           bigint generated by default as identity primary key,

  -- Koden gæsten får at vide. Den laves i browseren, fordi gæsten
  -- ikke må kunne læse tabellen bagefter – se adgangsreglerne.
  reference    text not null unique,

  lokation_id  text not null default 'mosede' references public.lokationer(id),

  navn         text not null,
  telefon      text not null,
  email        text,

  hent_dato    date not null,
  hent_tid     time not null,

  /* LINJER OG FYLD ER TO TING, og det er fordi forretningens eget
     kort er skruet sådan sammen.

     Kategorien "Smørrebrød" har fem slags MED pris: håndmad 24,
     smørrebrød 55, rejemad 75, tartar 95, æbleflæsk 75. Kategorien
     "Vælg fyld til smørrebrødet" har 29 slags UDEN pris, fordi et
     fyld ikke er en vare man køber – det er hvad der skal ligge på
     stykket.

     linjer er derfor de stykker der bestilles, med antal og pris,
     og fyld er de ønsker der skal ligge på dem. Havde vi puttet
     fyldet i linjer med prisen 0, ville en bestilling på fire
     stykker med tre slags fyld være blevet syv stykker – og
     personalet ville pakke forkert. */

  -- [{ "navn": "Smørrebrød", "antal": 4, "pris": 55 }, …]
  linjer       jsonb not null,
  -- ["Æggesalat med bacon", "Roastbeef", …] – må gerne være tom:
  -- "sammensæt selv" er et gyldigt ønske.
  fyld         jsonb not null default '[]'::jsonb,
  -- Summen af antal i linjer. Ligger med, så personalet kan sortere
  -- og se omfanget uden at pakke jsonb ud.
  antal        int  not null,

  besked       text,

  status       text not null default 'ny',
  -- Personalets egen note. En gæst må ikke kunne skrive i den –
  -- det står i insert-reglen.
  intern_note  text,

  oprettet     timestamptz not null default now(),
  aendret      timestamptz not null default now(),

  -- Lag 3 af valideringen. Formularen tjekker det samme, men en
  -- formular kan omgås med to linjer i konsollen, og databasen
  -- kan ikke.
  constraint bestilling_navn_ok
    check (char_length(btrim(navn)) between 2 and 80),
  -- Otte cifre, med eller uden +45, mellemrum og bindestreger
  constraint bestilling_telefon_ok
    check (char_length(regexp_replace(telefon, '[^0-9]', '', 'g')) between 8 and 15),
  constraint bestilling_email_ok
    check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-zA-Z]{2,}$'),
  -- I dag eller senere, og ikke længere ude end fire måneder.
  -- current_date er serverens dato i UTC; det ene døgns slæk
  -- dækker at Danmark er en time foran.
  --
  -- ⚠️ REGLEN HER ER FLYTTET UD I EN UDLØSER (3/9), OG DEN MÅ
  --    IKKE SKRIVES TILBAGE SOM ET CHECK. current_date er ikke en
  --    fast værdi, og Postgres efterprøver HVERT CHECK på hele den
  --    nye række ved enhver opdatering — så en bestilling, gæsten
  --    lovligt sendte i august, holder op med at kunne rettes,
  --    når kalenderen går videre. Målt i produktionen 3/9:
  --    bestillingsnummer.sql's efterudfyldning faldt med 23514 på
  --    en rigtig bestilling fra 19. august, og personalet kunne
  --    ikke trykke ✓ Færdig på en gammel bestilling, ingen fik
  --    lukket. "Intet må gå tabt" holdt altså ikke bagud.
  --
  --    CHECK'et bliver stående her, fordi filen er FØRSTE lag og
  --    skal kunne køres på en tom database: reglen skal gælde fra
  --    det sekund, tabellen findes. supabase/bestilling-dato-vaern.sql
  --    dropper det og sætter den SAMME regel som en udløser, der
  --    kun dømmer ved indsættelse og når datoen FAKTISK ændres.
  --    ⚠️ KØRES FILEN HER IGEN BAGEFTER, KOMMER CHECK'ET TILBAGE —
  --    kør så bestilling-dato-vaern.sql igen. er-vi-klar.sql
  --    linje 129 fanger det.
  constraint bestilling_dato_ok
    check (hent_dato between current_date - 1 and current_date + 120),
  constraint bestilling_antal_ok
    check (antal between 1 and 500),
  constraint bestilling_linjer_ok
    check (jsonb_typeof(linjer) = 'array'
           and jsonb_array_length(linjer) between 1 and 60),
  constraint bestilling_fyld_ok
    check (jsonb_typeof(fyld) = 'array' and jsonb_array_length(fyld) <= 40),
  constraint bestilling_besked_ok
    check (besked is null or char_length(besked) <= 1000),
  constraint bestilling_status_ok
    check (status in ('ny', 'bekraeftet', 'klar', 'afhentet', 'afvist')),

  -- Dobbelttryk. Samme telefon, samme dag, samme tid er én
  -- bestilling – ikke to. Fanger den almindelige fejl, hvor
  -- gæsten trykker "Send" to gange fordi der ikke skete noget
  -- med det samme.
  constraint bestilling_ikke_dobbelt
    unique (telefon, hent_dato, hent_tid)
);

create index if not exists bestillinger_dato_idx
  on public.bestillinger (hent_dato, hent_tid);
create index if not exists bestillinger_status_idx
  on public.bestillinger (status, oprettet desc);


-- ============================================================
--  ADGANGSREGLER (RLS)
--  Alle må læse forretningens egne oplysninger, kun chefen må
--  ændre dem. Bestillinger står for sig – se nedenfor.
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


-- ------------------------------------------------------------
--  BESTILLINGER: GÆSTEN MÅ SKRIVE, MEN IKKE LÆSE
--  ----------------------------------------------------------
--  Det er den eneste tabel med reglerne den vej rundt, og det er
--  med vilje.
--
--  HVORFOR INGEN LÆSNING. anon-nøglen ligger offentligt i
--  js/config.js – den er lavet til det. Måtte den læse
--  bestillinger, kunne enhver hente navn, telefonnummer og
--  adresseoplysninger på hver eneste kunde med én linje i en
--  browserkonsol. Det er ikke en teoretisk risiko; det er en
--  liste over folk der ikke er hjemme på lørdag.
--
--  Prisen for det er at gæsten ikke kan få sin række tilbage
--  efter indsættelsen (PostgREST skal kunne læse for at svare med
--  "return=representation"). Derfor laves referencen i browseren,
--  FØR den sendes: så kender gæsten den allerede, og der er intet
--  at læse tilbage.
--
--  HVAD GÆSTEN IKKE MÅ SÆTTE. En ny bestilling skal have status
--  'ny' og ingen intern note. Uden det kunne man indsætte en
--  bestilling der ser bekræftet ud, eller skrive i personalets
--  eget felt.
--
--  HVAD DER STADIG ER MULIGT. Nogen med nøglen kan indsætte
--  vrøvl-bestillinger. Det kan ikke stoppes i RLS alene – det
--  kræver en serverfunktion med hastighedsbegrænsning. Til gengæld
--  kan intet af det læses, mængden pr. række er bundet af
--  check-reglerne, dobbelttryk afvises, og personalet ser og
--  sletter det i admin. Står det på, er næste skridt en Edge
--  Function foran indsættelsen.
-- ------------------------------------------------------------

alter table public.bestillinger enable row level security;

drop policy if exists bestillinger_opret_gaest on public.bestillinger;
create policy bestillinger_opret_gaest on public.bestillinger
  for insert to anon, authenticated
  with check (status = 'ny' and intern_note is null);

drop policy if exists bestillinger_laes_admin on public.bestillinger;
create policy bestillinger_laes_admin on public.bestillinger
  for select using (public.is_admin());

drop policy if exists bestillinger_ret_admin on public.bestillinger;
create policy bestillinger_ret_admin on public.bestillinger
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists bestillinger_slet_admin on public.bestillinger;
create policy bestillinger_slet_admin on public.bestillinger
  for delete using (public.is_admin());


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
   -- Navnet, bekræftet af kunden.
   -- Det var værd at spørge om: forretningens eget menukort skriver
   -- "Mosede Havn Smørrebrød, Grill & Ishus", skiltet på facaden
   -- "Mosede Havn - Grill & Kiosk", og Facebook "Mosede havn grill
   -- & Ishus". Havde databasen allerede fået en af de gamle
   -- varianter, retter ret-oplysninger.sql den.
   'Mosede Havnecafe',
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

  -- vandtemp, vind og landing er væk. De hørte til havnestriben under
  -- det store billede, og de skulle skrives i hånden i admin. Ingen
  -- ringer til DMI før lugen åbner, så de stod tomme, og striben er
  -- fjernet. Ligger rækkerne stadig i en database der blev sat op før,
  -- gør de ingen skade – de bliver bare ikke læst.

  -- Linjen under menukortet. Teksten står på forretningens eget
  -- menukort, så den er belagt med bevis.
  ('menu_note', '"Smørrebrød kan leveres glutenfri eller uden smør. Vi leverer smørrebrød og platter til alle arrangementer, store som små – ring og hør nærmere."'::jsonb),

  -- ----------------------------------------------------------
  --  BESTILLING AF SMØRREBRØD UD AF HUSET
  --  --------------------------------------------------------
  --  Alle fire kan rettes i admin uden SQL.
  --
  --  varsel_timer og min_stk er ikke oplysninger vi HAR fået fra
  --  forretningen – de står på listen i README under "Ejeren skal
  --  bekræfte". Tallene her er derfor UDGANGSPUNKTER som
  --  formularen skal have for at kunne regne en tidligste dato ud,
  --  ikke påstande om forretningen: 24 timers varsel og intet
  --  mindsteantal. Ejeren retter dem i admin, og teksten på siden
  --  følger med af sig selv.
  -- ----------------------------------------------------------
  ('bestilling_aaben',        'true'::jsonb),
  ('bestilling_varsel_timer', '24'::jsonb),
  -- ⚠️ FIRE ER KUNDENS TAL (3/9): "man skal minimum bestille 4
  --    smørrebrød, så det skal stå som default og ikke må kunne gå
  --    under". Det stod som 1, altså intet mindsteantal. Reglen
  --    gælder KUN smørrebrød (se js/bestil-regler.js minStkMangler)
  --    og aldrig ved bordet.
  ('bestilling_min_stk',      '4'::jsonb),
  -- Personalets egen linje over formularen. Fx "Vi holder ferie
  -- i uge 29-30". Tom = der står ingenting.
  ('bestilling_besked',       '""'::jsonb)
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
