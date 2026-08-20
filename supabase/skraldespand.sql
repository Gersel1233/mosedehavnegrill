-- ============================================================
--  SKRALDESPANDEN: SLET BLIVER TIL FORTRYD I 30 DAGE
--  ------------------------------------------------------------
--  Kør EFTER udlejning.sql. Kan køres igen uden at ødelægge noget.
--
--  HVORFOR
--  ------------------------------------------------------------
--  "Slet" i admin har indtil nu været endeligt. Et fejltryk på en
--  iPad ved lugen — og en gæsts navn, telefonnummer og bestilling
--  var væk for altid. Der er ingen kopi, og gæsten kan ikke sende
--  den igen: bremsen og "ikke dobbelt"-nøglen afviser den, fordi
--  personalet ikke kan se, at rækken er væk.
--
--  Herefter er "Slet" en dato i en kolonne. Rækken bliver i
--  databasen, forsvinder fra listerne, og kan hentes tilbage med
--  ét tryk. Efter 30 dage bliver den slettet for alvor.
--
--  HVORFOR KUN DE FIRE
--  ------------------------------------------------------------
--  Bestillinger, forespørgsler, bordønsker og udlejninger er det
--  eneste i databasen, et MENNESKE har skrevet, og som ikke kan
--  laves om igen. En slettet menuvare skriver man ind på ti
--  sekunder. En slettet bestilling er en kunde, der møder op efter
--  mad, ingen har lavet.
--
--  DEN VIGTIGE DEL ER IKKE KOLONNEN
--  ------------------------------------------------------------
--  Det er nøglerne nedenfor. En række i skraldespanden må ikke
--  blive ved med at spærre: er en bekræftet udlejning smidt ud,
--  SKAL dagen være ledig igen, og er en bestilling smidt ud, skal
--  gæsten kunne sende den samme igen. Ellers har vi byttet et
--  fejltryk, man kan se, ud med en spærring, ingen kan forklare.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) KOLONNEN
--    NULL betyder "ikke slettet". Ikke et flueben: datoen er
--    selve svaret på "hvor længe er der til, den er væk", og et
--    boolean ville kræve en kolonne mere for at kunne det.
-- ------------------------------------------------------------
alter table public.bestillinger     add column if not exists slettet timestamptz;
alter table public.forespoergsler   add column if not exists slettet timestamptz;
alter table public.bordbestillinger add column if not exists slettet timestamptz;
alter table public.udlejninger      add column if not exists slettet timestamptz;

comment on column public.bestillinger.slettet is
  'Sat = ligger i skraldespanden. Slettes for alvor efter 30 dage.';


-- ------------------------------------------------------------
-- 2) LISTERNE SKAL VÆRE HURTIGE BEGGE VEJE
--    Delvise nøgler: den ene dækker de levende rækker (alt det,
--    admin viser hele dagen), den anden kun skraldespanden, som
--    er få rækker og sjældent åbnes.
-- ------------------------------------------------------------
create index if not exists bestillinger_levende_idx
  on public.bestillinger (hent_dato, hent_tid) where slettet is null;
create index if not exists bestillinger_skrald_idx
  on public.bestillinger (slettet desc) where slettet is not null;

create index if not exists forespoergsler_levende_idx
  on public.forespoergsler (oprettet desc) where slettet is null;
create index if not exists forespoergsler_skrald_idx
  on public.forespoergsler (slettet desc) where slettet is not null;

create index if not exists bordbestillinger_levende_idx
  on public.bordbestillinger (dato, tid) where slettet is null;
create index if not exists bordbestillinger_skrald_idx
  on public.bordbestillinger (slettet desc) where slettet is not null;

create index if not exists udlejninger_levende_idx
  on public.udlejninger (dato) where slettet is null;
create index if not exists udlejninger_skrald_idx
  on public.udlejninger (slettet desc) where slettet is not null;


-- ------------------------------------------------------------
-- 3) SPÆRRINGERNE SKAL SLIPPE MED
--    ------------------------------------------------------------
--    HER LIGGER FEJLEN, HVIS DEN HER FIL SPRINGES OVER.
--
--    "Ikke dobbelt"-nøglerne er lavet, så et dobbelttryk på Send
--    ikke bliver til to bestillinger. De kigger på ALLE rækker.
--    Med en skraldespand betyder det, at en bestilling, personalet
--    har smidt ud, bliver ved med at spærre for den samme gæst på
--    den samme dag — og hverken gæsten eller personalet kan se
--    hvorfor. Gæsten får "du har allerede sendt den her".
--
--    Det samme, men værre, gælder baglokalet: en bekræftet
--    udlejning, der er smidt ud, ville holde dagen optaget for
--    evigt. Ingen kan leje lokalet den dag, og der står ingenting
--    nogen steder om hvorfor.
--
--    Derfor bliver de fire til DELVISE nøgler: de gælder kun de
--    rækker, der ikke ligger i skraldespanden.
--
--    En unik constraint kan ikke være delvis i Postgres. Derfor
--    fjernes constrainten, og der laves et unikt INDEX med samme
--    navn i stedet. Fejlteksten fra databasen nævner navnet, og
--    navnet er det, js/store.js oversætter på — så det skal blive
--    stående præcis som det er.
-- ------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('bestillinger',     'bestilling_ikke_dobbelt', '(telefon, hent_dato, hent_tid)'),
      ('bordbestillinger', 'bord_ikke_dobbelt',       '(telefon, dato, tid)'),
      ('udlejninger',      'udlejning_ikke_dobbelt',  '(telefon, dato)')
    ) as v(tabel, navn, kolonner)
  loop
    -- Findes den stadig som constraint, skal den væk først:
    -- constrainten ejer sit index, og indexet kan ikke fjernes
    -- alene.
    if exists (select 1 from pg_constraint
                where conrelid = to_regclass('public.' || r.tabel)
                  and conname = r.navn) then
      execute format('alter table public.%I drop constraint %I', r.tabel, r.navn);
    end if;

    if not exists (select 1 from pg_class c
                     join pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = 'public' and c.relname = r.navn) then
      execute format(
        'create unique index %I on public.%I %s where slettet is null',
        r.navn, r.tabel, r.kolonner);
    end if;
  end loop;
end $$;

/* Dagen-er-taget skal have skraldespanden med i betingelsen.
   drop + create og ikke "if not exists": indexet FINDES i
   forvejen med den gamle betingelse, så en if-not-exists ville
   lade den gamle blive stående og filen se ud til at virke. */
drop index if exists public.udlejning_dagen_er_taget;
create unique index udlejning_dagen_er_taget
  on public.udlejninger (lokation_id, dato)
  where (status = 'bekraeftet' and slettet is null);


-- ------------------------------------------------------------
-- 4) GÆSTEN MÅ IKKE SENDE NOGET, DER ALLEREDE ER SLETTET
--    ------------------------------------------------------------
--    Det lyder som noget, ingen ville finde på. Men en række med
--    slettet sat er usynlig i admin OG optager stadig en plads i
--    bremsens tælling — så en gæst kunne sende noget af sted, som
--    personalet aldrig ser, og som spærrer for den rigtige
--    bestilling bagefter.
--
--    Reglerne laves om ét sted ad gangen og ikke i en løkke: de
--    fire har hver sin ekstra betingelse (status, note), og en
--    løkke ville enten tabe dem eller skulle kende dem alle.
-- ------------------------------------------------------------
drop policy if exists bestillinger_opret_gaest on public.bestillinger;
create policy bestillinger_opret_gaest on public.bestillinger
  for insert to anon, authenticated
  with check (status = 'ny' and intern_note is null and slettet is null);

drop policy if exists forespoergsler_opret_gaest on public.forespoergsler;
create policy forespoergsler_opret_gaest on public.forespoergsler
  for insert to anon, authenticated
  with check (status = 'ny' and intern_note is null and slettet is null);

drop policy if exists bordbestillinger_opret_gaest on public.bordbestillinger;
create policy bordbestillinger_opret_gaest on public.bordbestillinger
  for insert to anon, authenticated
  with check (status = 'ny' and intern_note is null and slettet is null);

drop policy if exists udlejninger_opret_gaest on public.udlejninger;
create policy udlejninger_opret_gaest on public.udlejninger
  for insert to anon, authenticated
  with check (status = 'ny' and intern_note is null and slettet is null);


-- ------------------------------------------------------------
-- 5) BREMSERNE SKAL OGSÅ SE BORT FRA SKRALDESPANDEN
--    ------------------------------------------------------------
--    Ellers står en gæst, hvis bestilling personalet lige har
--    smidt ud, og får "du har sendt for mange i dag" på en dag,
--    hvor der ikke er nogen tilbage at se. Bremsen skal tælle det,
--    der findes.
--
--    HVORFOR FUNKTIONERNE RETTES OG IKKE SKRIVES FORFRA HER
--    ------------------------------------------------------------
--    Fordi tallene ellers ville stå to steder. Grænserne — 5
--    bestillinger pr. nummer i døgnet, 3 bordønsker, 2
--    udlejninger, 40 i timen på stedet — hører hjemme i
--    bremse.sql, borde.sql, udlejning.sql og forespoergsler.sql.
--    En kopi her ville skride fra originalen den dag, én af dem
--    ændres, og så bremser databasen ved ét tal, mens filen, man
--    læser, siger et andet.
--
--    Alle otte tællinger har den samme form:
--
--      from public.TABEL x
--       where x.noget = new.noget
--         and x.oprettet > now() - interval '...'
--
--    Der sættes "og den må ikke ligge i skraldespanden" ind lige
--    før tidsvinduet. Bliver den form lavet om en dag, laves der
--    INGEN stille halv rettelse: så standser filen med en fejl,
--    der siger hvilken bremse det gælder.
--
--    Køres bremse.sql, borde.sql, udlejning.sql eller
--    forespoergsler.sql igen BAGEFTER, er rettelsen væk — de
--    skriver deres egen udgave tilbage. Kør så den her fil igen.
--    supabase/er-vi-klar.sql har en linje, der fanger det.
-- ------------------------------------------------------------
do $$
declare
  navn  text;
  foer  text;
  efter text;
begin
  foreach navn in array array['bestilling_bremse', 'forespoergsel_bremse',
                              'bord_bremse', 'udlejning_bremse']
  loop
    select p.prosrc into foer
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = navn;

    if foer is null then
      raise exception 'Bremsen %() findes ikke. Kør dens egen fil først.', navn;
    end if;

    continue when position('slettet is null' in foer) > 0;   -- allerede rettet

    -- \m er "her begynder et ord", så det kun er aliasset foran
    -- .oprettet der rammes — ikke ordet "oprettet" andre steder.
    efter := regexp_replace(foer,
      '(\m[a-z_]+)\.oprettet > now\(\)',
      '\1.slettet is null and \1.oprettet > now()', 'g');

    if position('slettet is null' in efter) = 0 then
      raise exception
        E'\n\n  BREMSEN %() SER ANDERLEDES UD, END DEN HER FIL VENTER.\n\n'
        '  Der blev ledt efter "ALIAS.oprettet > now()" i funktionen,\n'
        '  og det står der ikke. Ret bremsen i hånden: hver tælling\n'
        '  skal have "and ALIAS.slettet is null" med, ellers tæller\n'
        '  den de rækker, personalet har smidt i skraldespanden.\n', navn;
    end if;

    execute format(
      'create or replace function public.%I() returns trigger language plpgsql '
      'security definer set search_path = %L as %L', navn, '', efter);
  end loop;
end $$;

commit;

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and column_name = 'slettet'
      and table_name in ('bestillinger', 'forespoergsler',
                         'bordbestillinger', 'udlejninger'))
    as "kolonner (skal være 4)",
  (select count(*) from pg_indexes
    where schemaname = 'public'
      and indexname in ('bestilling_ikke_dobbelt', 'bord_ikke_dobbelt',
                        'udlejning_ikke_dobbelt', 'udlejning_dagen_er_taget')
      and indexdef ilike '%slettet is null%')
    as "delvise nøgler (skal være 4)",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosrc like '%slettet is null%'
      and p.proname in ('bestilling_bremse', 'forespoergsel_bremse',
                        'bord_bremse', 'udlejning_bremse'))
    as "bremser der ser bort fra skrald (skal være 4)";

-- ------------------------------------------------------------
--  BAGEFTER
--  Kør supabase/proev-skraldespand.sql. Den prøver alt det, der
--  gør ondt: at sende igen efter en sletning, at leje dagen ud
--  igen, og at en gæst hverken kan læse eller tømme spanden.
-- ------------------------------------------------------------
