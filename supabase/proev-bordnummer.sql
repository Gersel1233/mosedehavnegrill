-- ============================================================
--  PRØVE: BORDNUMMERET  (4. september 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet EFTER dato-vaern-resten.sql og
--  bordnummer.sql. Skriver ingenting, der bliver stående: alt
--  sker i en transaktion, der rulles tilbage til sidst.
--
--  Skal skrive: ALLE 7 AF 7 BESTOD.
--
--  ⚠️ FORUDSÆTNINGEN SIGES MED ORD, IKKE MED 42703. Mikkel sprang
--     et trin over 3/9 og fik
--
--         ERROR: 42703: column "nummer" does not exist
--
--     på en linje i PRØVEN — en `language sql`-funktion slår
--     kolonnerne op allerede når den oprettes, så filen døde FØR
--     prøve 1 kunne sige "kolonnen findes ikke". Nu siger den,
--     hvad man gør ved det.
--
--  ⚠️ OG DEN LÅNER IKKE EJERENS DATA. To EGNE forretninger
--     (tælleren er pr. forretning, og det kan kun ses med to) og
--     egne telefonnumre. Læren fra proev-bord-uden-telefon.sql,
--     som faldt TRE gange hos kunden af netop den grund.
-- ============================================================

begin;

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public'
                    and table_name = 'bordbestillinger'
                    and column_name = 'nummer') then
    raise exception 'KOER supabase/bordnummer.sql FOERST — kolonnen bordbestillinger.nummer findes ikke, saa proeven her kan ikke maale noget.';
  end if;
  if not exists (select 1 from pg_proc p
                  join pg_namespace ns on ns.oid = p.pronamespace
                 where ns.nspname = 'public'
                   and p.proname = 'mosede_bordnummer') then
    raise exception 'KOER supabase/bordnummer.sql FOERST — funktionen mosede_bordnummer findes ikke.';
  end if;
end $$;

create temp table _svar (nr int, navn text, bestod boolean, grund text)
  on commit drop;

-- ⚠️ lokationer har tre not null-felter (setup.sql linje 101) —
-- en stub med kun id og navn faldt 30/8.
insert into public.lokationer (id, navn, adresse, postnr, by)
values ('proev-bn1', 'Prøvehavnen 1', 'Prøvevej 1', '2670', 'Greve'),
       ('proev-bn2', 'Prøvehavnen 2', 'Prøvevej 2', '2670', 'Greve')
on conflict (id) do nothing;

-- ⚠️ HVERT KALD SIT EGET NUMMER OG SIN EGEN TID: bord_bremse
-- holder højst 3 bookinger pr. telefon pr. døgn, og en prøve, der
-- selv render ind i bremsen, måler bremsen og ikke nummereringen.
--
-- ⚠️ OG DEN SVARER MED FEJLGRUNDEN. En rød linje, der kun siger
-- "det gik ikke", er dét, der kostede tre runder 2/9.
create or replace function pg_temp.book(
  ref text, lok text, nr int, num integer default null,
  gammel boolean default false)
returns text language plpgsql as $$
begin
  insert into public.bordbestillinger
    (reference, lokation_id, navn, telefon, dato, tid,
     antal_personer, nummer, oprettet)
  values
    (ref, lok, 'Prøve Person', '000061' || (10 + nr),
     current_date + 2, make_time(18, nr, 0), 2, num,
     case when gammel then now() - interval '2 hours' else now() end);
  return null;
exception when others then
  return sqlerrm;
end $$;

-- Nummeret læses TILBAGE af rækken, ikke af `returning`. Det er
-- udløserens virkning set udefra — husets regel om, at ét af
-- tallene skal komme et andet sted fra end det, der måles.
create or replace function pg_temp.nummeret(ref text) returns integer
language sql as $$
  select nummer from public.bordbestillinger where reference = ref
$$;

-- 1) Kolonne, trigger og funktion findes
insert into _svar
select 1, 'kolonne, taeller-trigger og nummer-funktion findes',
  exists (select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'bordbestillinger'
            and column_name = 'nummer')
  and exists (select 1 from pg_trigger where tgname = 'bordbestilling_nummer')
  and exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
              where ns.nspname = 'public'
                and p.proname = 'mosede_giv_bordnummer' and p.prosecdef)
  and exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
              where ns.nspname = 'public'
                and p.proname = 'mosede_bordnummer' and p.prosecdef),
  null;

-- 2) To bookinger taeller op, et ad gangen
do $$
declare ga text; gb text; a integer; b integer;
begin
  ga := pg_temp.book('PRV-BN-1', 'proev-bn1', 1);
  gb := pg_temp.book('PRV-BN-2', 'proev-bn1', 2);
  a  := pg_temp.nummeret('PRV-BN-1');
  b  := pg_temp.nummeret('PRV-BN-2');
  insert into _svar values (2, 'numrene taeller op, et ad gangen',
    a is not null and b = a + 1, coalesce(ga, gb));
end $$;

-- 3) Gaestens eget bud paa et nummer smides vaek
do $$
declare g text; n integer;
begin
  g := pg_temp.book('PRV-BN-3', 'proev-bn1', 3, 1);
  n := pg_temp.nummeret('PRV-BN-3');
  insert into _svar values (3, 'klientens eget nummer overskrives',
    n is not null and n <> 1, g);
end $$;

-- 4) En anden forretning begynder ved 1 — ikke ved den foerstes
--    tal. ⚠️ MED EN GLOBAL TAELLER ville den her vaere nummer 4,
--    saa proeven maaler forskellen, ogsaa naar den ikke laener sig
--    paa ejerens raekker.
do $$
declare g text; n integer;
begin
  g := pg_temp.book('PRV-BN-4', 'proev-bn2', 4);
  n := pg_temp.nummeret('PRV-BN-4');
  insert into _svar values (4, 'hver forretning har sin egen taeller',
    n = 1, g);
end $$;

-- 5) ⚠️ OG BORDENES TAELLER ER IKKE BESTILLINGERNES. Delte de
--    tal, ville bookingerne springe fra 3 til 58, fordi der kom
--    mad imellem — og personalet ville tro, der manglede fem
--    bookinger.
do $$
declare g text; n integer; f integer;
begin
  n := pg_temp.nummeret('PRV-BN-4');
  select coalesce(max(naeste), 0) into f
    from public.bestillingsnumre where lokation_id = 'proev-bn2';
  insert into _svar values (5,
    'bordenes taeller er ikke bestillingernes',
    n = 1 and coalesce(f, 0) = 0,
    'bordnummer=' || n || ' bestillingstaeller=' || coalesce(f, 0));
end $$;

-- 6) Gaesten kan slaa SIT eget nummer op paa referencen
insert into _svar
select 6, 'kvitteringen kan hente nummeret paa referencen',
  public.mosede_bordnummer('PRV-BN-1') is not null
  and public.mosede_bordnummer('PRV-FINDES-IKKE') is null,
  null;

-- 7) Og en gammel raekke giver ingenting — kvitteringen staar paa
--    skaermen nu, ikke i morgen
do $$
declare g text; n integer;
begin
  g := pg_temp.book('PRV-BN-7', 'proev-bn2', 7, null, true);
  n := pg_temp.nummeret('PRV-BN-7');
  insert into _svar values (7, 'en time efter svarer opslaget ikke laengere',
    n is not null and public.mosede_bordnummer('PRV-BN-7') is null, g);
end $$;

-- ------------------------------------------------------------
--  RAPPORT
--  ⚠️ LINJEN "PROEVENS DATO" AFGOER, HVILKEN UDGAVE DER KOERTE.
--     proev-bestillingsnummer.sql faldt hos kunden med en dato i
--     2099; kunne man ikke se datoen i rapporten, ville en gammel
--     fane i browseren ligne den rettede fil.
-- ------------------------------------------------------------
select nr, navn,
  case when bestod then 'BESTOD' else 'FEJLEDE' end as udfald,
  grund
from _svar order by nr;

select
  'Proevens dato: ' || (current_date + 2)
    || ' · forretninger: proev-bn1/proev-bn2' as udgave,
  case
    when (select count(*) from _svar where bestod) = 7
    then 'ALLE 7 AF 7 BESTOD'
    else (select count(*) from _svar where not bestod)
         || ' AF 7 FEJLEDE — se grund-kolonnen ovenfor'
  end as resultat;

rollback;
