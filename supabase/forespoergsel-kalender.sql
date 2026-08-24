-- ============================================================
--  FORESPØRGSLERNE FÅR DETALJER OG EN KALENDER  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER forespoergsler.sql, udlejning.sql og
--  skraldespand.sql. Filen kan køres igen; den ændrer kun det,
--  der ikke er der.
--
--  DEN GØR TRE TING
--  ------------------------------------------------------------
--  1) detaljer: én jsonb-kolonne til det, formularerne spørger om
--     ud over navn, dato og antal — anledning, tidsrum, med eller
--     uden mad, hvad der skal serveres, antal kuverter, fade.
--
--     Uden den ville alle de valg ende som fri tekst i beskeden,
--     og så kan personalet hverken sortere eller søge på dem. Én
--     kolonne, der bruges af ALLE typer, i stedet for tolv
--     kolonner, hvor hver type kun bruger sine egne.
--
--  2) optagne_dage: en liste over de dage, havnen er optaget.
--     KUN datoer — ingen navne, ingen numre, ingen beskeder.
--     Gæsten må se, at den 12. er væk; hun må ikke se, hvem der
--     har den.
--
--  3) Et værn, der er DATABASENS og ikke browserens: to gæster
--     kan ikke få den samme dag. Formularen tjekker det samme,
--     men en formular kan omgås med to linjer i konsollen.
--
--  HVAD "OPTAGET" BETYDER
--  ------------------------------------------------------------
--  Havnen er ét sted. Er baglokalet lejet ud den 12., kan der
--  ikke også holdes selskab hos jer den 12. — det er de samme
--  lokaler, det samme køkken og de samme hænder.
--
--  Et selskab UD AF HUSET optager derimod ingenting: så laver
--  køkkenet mad, som kører ud, og havnen står fri. Derfor er
--  "hvor" en del af regnestykket, og derfor er catering slet
--  ikke med — den er pr. definition ud af huset.
--
--  KUN AFTALTE DAGE ER OPTAGET. En forespørgsel, der er kommet
--  ind, er et spørgsmål — ikke en booking. Blokerede en ny
--  forespørgsel dagen, kunne én person med et telefonnummer
--  lukke hele efteråret på ti minutter.
-- ============================================================


-- ------------------------------------------------------------
-- 1) DETALJER
-- ------------------------------------------------------------
alter table public.forespoergsler
  add column if not exists detaljer jsonb;

comment on column public.forespoergsler.detaljer is
  'Formularens egne valg: anledning, tidsrum, hvad der skal serveres, kuverter, fade. Ét objekt, aldrig en liste.';

/* Der står ikke NOGET om, hvilke nøgler der må være i — de
   følger formularerne, og en ny chip i designet må ikke kræve en
   ændring i databasen. Men to ting håndhæves:

   Det skal være et OBJEKT. En liste eller et løst tal ville
   betyde, at admin skulle kunne tegne hvad som helst.

   Og det skal være småt. Uden en grænse er kolonnen et sted,
   hvor nogen kan lægge en megabyte ind pr. forespørgsel — og
   gæsten må skrive i tabellen. */
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'forespoergsel_detaljer_ok'
       and conrelid = 'public.forespoergsler'::regclass
  ) then
    alter table public.forespoergsler
      add constraint forespoergsel_detaljer_ok
      check (detaljer is null
             or (jsonb_typeof(detaljer) = 'object'
                 and length(detaljer::text) <= 4000));
  end if;
end $$;


-- ------------------------------------------------------------
-- 2) HVORNÅR OPTAGER EN FORESPØRGSEL DAGEN?
--    ---------------------------------------------------------
--    Reglen står ÉT sted, fordi den bruges tre steder: i
--    listen over optagne dage, i værnet mod dobbeltbooking og i
--    det unikke indeks. Tre kopier af den samme regel er tre
--    steder, den kan komme til at betyde noget forskelligt.
--
--    IMMUTABLE er ikke pynt: et delvist unikt indeks må kun
--    bruge funktioner, Postgres ved altid svarer det samme.
--    Funktionen kigger derfor kun på sine egne argumenter — den
--    slår ingenting op.
-- ------------------------------------------------------------
create or replace function public.mosede_optager_dagen(
  p_type text, p_status text, p_dato date, p_detaljer jsonb, p_slettet timestamptz)
returns boolean
language sql
immutable
as $$
  select p_dato is not null
     and p_slettet is null
     and p_status = 'aftalt'
     and (
       p_type = 'baglokale'
       or (p_type = 'selskab'
           and coalesce(p_detaljer ->> 'hvor', 'hos-jer') <> 'ud-af-huset')
     );
$$;

comment on function public.mosede_optager_dagen(text, text, date, jsonb, timestamptz) is
  'Sand, når en forespørgsel lægger beslag på havnen den dag. Catering og selskaber ud af huset gør ikke.';

/* TO MEDARBEJDERE PÅ HVER SIN IPAD KAN TRYKKE "AFTALT" SAMTIDIG.
   Et delvist unikt indeks og ikke en regel i admin-koden: den
   sidste af de to får en fejl fra databasen i stedet for et ja,
   som ingen kan se er det andet ja for samme dag.

   Samme greb som udlejning_dagen_er_taget — og de to må gerne
   støde sammen: er baglokalet lejet ud, siger værnet nedenfor
   nej til selskabet, og omvendt. */
create unique index if not exists forespoergsel_dagen_er_taget
  on public.forespoergsler (lokation_id, dato)
  where (public.mosede_optager_dagen(type, status, dato, detaljer, slettet));


-- ------------------------------------------------------------
-- 3) LISTEN OVER OPTAGNE DAGE
--    ---------------------------------------------------------
--    En VISNING og ikke en tabel: den skal kunne læses af
--    gæsten, og gæsten må ikke læse hverken udlejninger eller
--    forespørgsler. Visningen har præcis tre kolonner —
--    forretning, dato og hvad slags — og der er ikke ét navn,
--    ét telefonnummer eller én besked i den.
--
--    HVORFOR DET ER SIKKERT: en visning kører med sin EJERS
--    øjne, ikke læserens, så adgangsreglerne på tabellerne
--    nedenunder springes over. Det er hele meningen her — men
--    det er også derfor, listen af kolonner skal blive ved med
--    at være tre. Tilføjer nogen "navn" til visningen, har de
--    lige åbnet gæstelisten for hele internettet.
-- ------------------------------------------------------------
create or replace view public.optagne_dage as
  select u.lokation_id,
         u.dato,
         'udlejning'::text as slags
    from public.udlejninger u
   where u.status = 'bekraeftet'
     and u.slettet is null
  union
  select f.lokation_id,
         f.dato,
         f.type
    from public.forespoergsler f
   where public.mosede_optager_dagen(f.type, f.status, f.dato, f.detaljer, f.slettet);

comment on view public.optagne_dage is
  'De dage havnen er optaget. KUN datoer — tilføj aldrig navn, telefon eller besked her.';

revoke all on public.optagne_dage from public;
grant select on public.optagne_dage to anon, authenticated;


-- ------------------------------------------------------------
-- 4) VÆRNET: TO GÆSTER KAN IKKE FÅ DEN SAMME DAG
--    ---------------------------------------------------------
--    security definer, fordi funktionen skal kunne SE de
--    udlejninger og forespørgsler, gæsten ikke må læse. Uden
--    den slog værnet op med gæstens øjne, fandt ingenting og
--    sagde ja til hver eneste dato — uden fejl og uden spor.
--    Det er præcis den fejl, lukkedagsværnet havde.
--
--    Søgestien er låst med set search_path = '': en
--    security definer-funktion med løs søgesti er den klassiske
--    vej ind i en database.
-- ------------------------------------------------------------
create or replace function public.mosede_dagen_er_optaget()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dato        date;
  v_lokation    text;
  v_optager     boolean;
begin
  v_dato     := new.dato;
  v_lokation := new.lokation_id;

  if v_dato is null then
    return new;
  end if;

  /* Optager DEN HER række overhovedet dagen? En catering eller
     et selskab ud af huset rører ikke havnen, og så er der
     ingen grund til at spærre den for dem. Udlejninger optager
     altid — der er kun ét baglokale. */
  if tg_table_name = 'udlejninger' then
    v_optager := true;
  else
    v_optager := new.type = 'baglokale'
      or (new.type = 'selskab'
          and coalesce(new.detaljer ->> 'hvor', 'hos-jer') <> 'ud-af-huset');
  end if;

  if not v_optager then
    return new;
  end if;

  if exists (
    select 1 from public.optagne_dage o
     where o.lokation_id = v_lokation
       and o.dato = v_dato
  ) then
    /* Navnet står i fejlen, og js/store.js oversætter det til en
       sætning, gæsten kan bruge. En rå databasefejl på en
       hjemmeside er en gæst, der går et andet sted hen. */
    raise exception 'mosede_dagen_er_optaget: %', v_dato
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

comment on function public.mosede_dagen_er_optaget() is
  'Afviser en forespørgsel eller udlejning på en dag, havnen allerede er lovet væk.';

drop trigger if exists forespoergsel_dagen_optaget on public.forespoergsler;
create trigger forespoergsel_dagen_optaget
  before insert on public.forespoergsler
  for each row execute function public.mosede_dagen_er_optaget();

drop trigger if exists udlejning_dagen_optaget on public.udlejninger;
create trigger udlejning_dagen_optaget
  before insert on public.udlejninger
  for each row execute function public.mosede_dagen_er_optaget();


-- ------------------------------------------------------------
-- 5) SVARET TIL SIDST
--    Supabases SQL Editor viser kun den sidste sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'forespoergsler'
      and column_name = 'detaljer')                                    as detaljer_kolonne,
  (select count(*) from pg_views
    where schemaname = 'public' and viewname = 'optagne_dage')         as visning,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'optagne_dage')     as kolonner_i_visningen,
  (select count(*) from pg_trigger
    where tgname in ('forespoergsel_dagen_optaget', 'udlejning_dagen_optaget')
      and not tgisinternal)                                            as vaern,
  (select count(*) from pg_indexes
    where schemaname = 'public'
      and indexname = 'forespoergsel_dagen_er_taget')                  as indeks,
  'Skal stå 1, 1, 3, 2, 1'                                             as forventet;
