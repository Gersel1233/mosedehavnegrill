-- ============================================================
--  MENUKORTET: ANTAL TILBAGE OG DAGE PR. KATEGORI  (august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER: menukort.sql, dagens-retter.sql, bord-loft.sql
--             og pris-vaern.sql.
--  Filen kan køres igen uden at ødelægge noget.
--
--  ------------------------------------------------------------
--  HVORFOR NU
--  ------------------------------------------------------------
--  Begge dele har indtil nu stået som "IKKE bygget, og det er
--  ikke en forglemmelse". Kunden bad om dem 26/8, og
--  indvendingen mod dem gælder stadig — det er derfor, de bygges
--  HER og ikke i browseren.
--
--  1) ANTAL TILBAGE ("Få tilbage" i admin)
--
--     Noten sagde: et tal, personalet tæller ned i hånden, bliver
--     forkert i løbet af en frokost, og gæst nummer syv får mad,
--     der ikke findes.
--
--     Så tallet tælles af DATABASEN. En bremse trækker fra, når
--     bestillingen oprettes, og sætter udsolgt ved nul. Ingen skal
--     huske noget, og to gæster, der trykker i samme sekund, kan
--     ikke begge få den sidste portion: rækken låses af UPDATE'et.
--
--     ⚠️ OG DER AFVISES, når der bestilles flere, end der er.
--     Det er forskellen på den her og dagens ret. Se den lange
--     note ved bremsen nedenfor.
--
--     Feltet er FRIVILLIGT. Er antal_tilbage tomt, tælles der
--     ikke, og varen kan bestilles i det uendelige. Det er stadig
--     det rigtige for en pølse.
--
--  2) DAGE PR. KATEGORI ("Kun hverdage" i admin)
--
--     Burgerne laves ikke i weekenden. Stod de på kortet alligevel,
--     ville en gæst bestille en burger til lørdag, og køkkenet
--     ville opdage det lørdag morgen.
--
--     ⚠️ DER FILTRERES PÅ BESTILLINGENS DATO, IKKE PÅ I DAG. En
--     gæst, der på en onsdag bestiller til lørdag, skal se
--     lørdagens kort. Filtrerede vi på "i dag", kunne hun bestille
--     burgere til lørdag, hver eneste hverdag.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) KOLONNERNE
-- ------------------------------------------------------------
alter table public.menu_varer
  add column if not exists antal_tilbage int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vare_antal_ok') then
    alter table public.menu_varer
      add constraint vare_antal_ok
      check (antal_tilbage is null or antal_tilbage between 0 and 999);
  end if;
end $$;

comment on column public.menu_varer.antal_tilbage is
  'Hvor mange der er tilbage i dag. TOM = ingen tælling. Tælles ned af mosede_vare_antal_bremse og sættes udsolgt ved nul.';


/* ⚠️ TRE VÆRDIER, IKKE SYV FLUEBEN. Admin har én rulleliste, og
   en rulleliste med tre valg kan personalet svare på uden at
   tænke. Skal der en dag vælges enkeltdage, er det en kolonne
   mere — ikke en omskrivning af den her: 'alle' bliver ved med
   at betyde alle.

   ⚠️ DEFAULT ER 'alle'. En kategori, ingen har rørt, skal blive
   ved med at stå på kortet hver dag. Var default 'hverdage',
   ville hele menukortet tømme sig selv om lørdagen i det sekund,
   filen blev kørt. */
alter table public.menu_kategorier
  add column if not exists dage text not null default 'alle';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'kategori_dage_ok') then
    alter table public.menu_kategorier
      add constraint kategori_dage_ok
      check (dage in ('alle', 'hverdage', 'weekend'));
  end if;
end $$;

comment on column public.menu_kategorier.dage is
  'Hvilke dage kategorien kan bestilles: alle | hverdage (man-fre) | weekend (lør-søn).';


-- ------------------------------------------------------------
-- 2) HJÆLPEREN: DÆKKER KATEGORIEN DEN HER DATO?
--    ---------------------------------------------------------
--    ⚠️ ÉN FUNKTION, FORDI TO STEDER SPØRGER. Bremsen nedenfor
--    og js/store.js gør det samme opslag, og et "hverdag" der
--    betyder noget forskelligt i databasen og i browseren er den
--    slags fejl, der ser helt rigtig ud på skærmen.
--
--    isodow: 1 = mandag … 7 = søndag. Bruges frem for dow, som
--    har søndag = 0 og gør weekend til et opdelt interval.
-- ------------------------------------------------------------
create or replace function public.mosede_kategori_paa_dagen(p_dage text, p_dato date)
returns boolean
language sql
immutable
as $$
  select case coalesce(p_dage, 'alle')
    when 'hverdage' then extract(isodow from p_dato) between 1 and 5
    when 'weekend'  then extract(isodow from p_dato) between 6 and 7
    else true
  end;
$$;

comment on function public.mosede_kategori_paa_dagen(text, date) is
  'Er kategorien åben den dato? alle=altid, hverdage=man-fre, weekend=lør-søn.';


-- ------------------------------------------------------------
-- 3) VÆRNET: DEN DAG LAVES DEN IKKE
--    ---------------------------------------------------------
--    Samme form som mosede_udsolgt_vaern (bord-loft.sql), og med
--    vilje den samme sammenligning: lower(btrim(navn)).
--
--    ⚠️ DER SIGES KUN NEJ TIL NAVNE, DER FINDES PÅ KORTET.
--    Dagens ret bor i sin egen tabel, og afviste værnet alt, det
--    ikke kunne finde, ville en ret, ejeren skrev i hånden, blive
--    umulig at bestille. Samme regel som pris- og udsolgt-værnet.
--
--    ⚠️ OG "HVER ENESTE", fordi det samme navn kan stå i to
--    kategorier. Er burgeren både i "Burgere" (kun hverdage) og
--    i "Grill" (alle dage), kan den købes om lørdagen.
-- ------------------------------------------------------------
create or replace function public.mosede_kategori_dag_vaern()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linje  jsonb;
  navnet text;
begin
  if new.linjer is null then return new; end if;

  for linje in select * from jsonb_array_elements(new.linjer)
  loop
    navnet := lower(btrim(coalesce(linje ->> 'navn', '')));
    if navnet = '' then continue; end if;

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
         and v.aktiv and k.aktiv
         and public.mosede_kategori_paa_dagen(k.dage, new.hent_dato)
    ) then
      raise exception 'bestilling_ikke_den_dag: %', coalesce(linje ->> 'navn', '');
    end if;
  end loop;

  return new;
end $$;

comment on function public.mosede_kategori_dag_vaern() is
  'Afviser en bestilling på en vare, hvis kategori ikke laves den ugedag. Navne, der ikke står på kortet, røres ikke.';

drop trigger if exists bestilling_kategori_dag on public.bestillinger;
create trigger bestilling_kategori_dag
  before insert on public.bestillinger
  for each row execute function public.mosede_kategori_dag_vaern();


-- ------------------------------------------------------------
-- 4) VÆRNET: DER ER IKKE SÅ MANGE TILBAGE
--    ---------------------------------------------------------
--    ⚠️ HER AFVISES DER, hvor dagens ret klemmer ned til nul med
--    greatest(). Forskellen er med vilje, og den koster en
--    forklaring:
--
--    Dagens ret er ÉN ret om dagen, og dens værn er udsolgt-
--    flaget: når den rammer nul, er den væk for den næste. At den
--    sidste bestilling kunne tage tre, hvor der var to, er en
--    portion for meget én gang om dagen.
--
--    Menukortet er 242 varer, og "Få tilbage" er dét, personalet
--    skriver, når der er ti stykker kage tilbage. Bestiller nogen
--    tolv, skal de have et nej NU — ikke en kage, der ikke
--    findes, og en telefonsamtale i morgen. Beskeden siger, hvor
--    mange der er, ellers skal gæsten gætte sig frem.
--
--    Værnet er BEFORE, tællingen er AFTER: afvises rækken, er der
--    ikke noget at trække fra.
-- ------------------------------------------------------------
create or replace function public.mosede_vare_antal_vaern()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linje  jsonb;
  navnet text;
  stk    int;
  rest   int;
begin
  if new.linjer is null then return new; end if;

  for linje in select * from jsonb_array_elements(new.linjer)
  loop
    navnet := lower(btrim(coalesce(linje ->> 'navn', '')));
    stk    := coalesce((linje ->> 'antal')::int, 0);
    if navnet = '' or stk <= 0 then continue; end if;

    /* Det STØRSTE tal blandt rækkerne med det navn. Står varen i
       to kategorier med hvert sit antal, er det den, der har
       flest, gæsten kan få. Har bare én af dem intet tal, tælles
       der ikke på den vare overhovedet — max() over en mængde med
       en tom værdi må ikke blive til et loft, ingen har sat. */
    if exists (
      select 1 from public.menu_varer v
        join public.menu_kategorier k on k.id = v.kategori_id
       where lower(btrim(v.navn)) = navnet
         and (k.lokation_id is null or k.lokation_id = new.lokation_id)
         and v.aktiv and k.aktiv
         and v.antal_tilbage is null
    ) then continue; end if;

    select max(v.antal_tilbage) into rest
      from public.menu_varer v
      join public.menu_kategorier k on k.id = v.kategori_id
     where lower(btrim(v.navn)) = navnet
       and (k.lokation_id is null or k.lokation_id = new.lokation_id)
       and v.aktiv and k.aktiv;

    if rest is not null and stk > rest then
      raise exception 'bestilling_for_faa_tilbage: % (% tilbage)',
        coalesce(linje ->> 'navn', ''), rest;
    end if;
  end loop;

  return new;
end $$;

comment on function public.mosede_vare_antal_vaern() is
  'Afviser en bestilling på flere, end der er tilbage. Varer uden et tal røres ikke.';

drop trigger if exists bestilling_vare_antal_vaern on public.bestillinger;
create trigger bestilling_vare_antal_vaern
  before insert on public.bestillinger
  for each row execute function public.mosede_vare_antal_vaern();


-- ------------------------------------------------------------
-- 5) TÆLLINGEN
--    ---------------------------------------------------------
--    Samme greb som dagens ret: greatest(...) og ikke bare minus,
--    så to gæster i samme sekund ikke kan trække under nul og
--    gøre en udsolgt vare bestilbar igen med et negativt tal.
--    Rækken låses af UPDATE'et, så den anden venter.
--
--    ⚠️ TÆLLER PÅ ALLE RÆKKER MED NAVNET, ikke kun den ene.
--    Står kagen i to kategorier, er der ÉN bagerform i køkkenet.
-- ------------------------------------------------------------
create or replace function public.mosede_vare_antal_bremse()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linje jsonb;
  stk   int;
begin
  if new.linjer is null then return new; end if;

  for linje in select * from jsonb_array_elements(new.linjer)
  loop
    stk := coalesce((linje ->> 'antal')::int, 0);
    if stk <= 0 then continue; end if;

    update public.menu_varer v
       set antal_tilbage = greatest(v.antal_tilbage - stk, 0),
           udsolgt = (greatest(v.antal_tilbage - stk, 0) = 0)
      from public.menu_kategorier k
     where k.id = v.kategori_id
       and v.antal_tilbage is not null
       and (k.lokation_id is null or k.lokation_id = new.lokation_id)
       and lower(btrim(v.navn)) = lower(btrim(coalesce(linje ->> 'navn', '')));
  end loop;

  return new;
end $$;

comment on function public.mosede_vare_antal_bremse() is
  'Tæller menukortets varer ned efter bestillingens linjer og sætter udsolgt ved nul.';

drop trigger if exists bestilling_taeller_vare on public.bestillinger;
create trigger bestilling_taeller_vare
  after insert on public.bestillinger
  for each row execute function public.mosede_vare_antal_bremse();

commit;


-- Rapport. Supabases SQL Editor viser kun den sidste sætnings
-- svar — se README-afsnittet "Supabases SQL Editor viser ikke
-- beskeder".
select
  case
    when not exists (select 1 from information_schema.columns
                      where table_schema = 'public' and table_name = 'menu_varer'
                        and column_name = 'antal_tilbage')
      then '❌ antal_tilbage BLEV IKKE TILFØJET — læs fejlbeskeden ovenfor'
    when not exists (select 1 from information_schema.columns
                      where table_schema = 'public' and table_name = 'menu_kategorier'
                        and column_name = 'dage')
      then '❌ dage BLEV IKKE TILFØJET — læs fejlbeskeden ovenfor'
    when not exists (select 1 from pg_trigger
                      where tgname = 'bestilling_taeller_vare' and not tgisinternal)
      then '❌ TÆLLINGEN MANGLER — kør filen igen'
    when not exists (select 1 from pg_trigger
                      where tgname = 'bestilling_vare_antal_vaern' and not tgisinternal)
      then '❌ VÆRNET MOD FOR MANGE MANGLER — kør filen igen'
    when not exists (select 1 from pg_trigger
                      where tgname = 'bestilling_kategori_dag' and not tgisinternal)
      then '❌ DAGSVÆRNET MANGLER — kør filen igen'
    else '✅ ANTAL OG DAGE ER PÅ PLADS — kør supabase/proev-menukort-antal-og-dage.sql'
  end as svar;
