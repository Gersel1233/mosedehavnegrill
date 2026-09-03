-- ============================================================
--  DATOREGLEN FLYTTER FRA ET CHECK TIL EN UDLØSER  (3. sep 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet FØR bestillingsnummer.sql.
--
--  ⚠️ HVORFOR FILEN FINDES — EN RIGTIG BESTILLING SPÆRREDE EN
--     MIGRERING, OG DEN SAMME SPÆRRE RAMMER PERSONALET.
--
--  setup.sql linje 334 har haft datoreglen som et CHECK:
--
--      constraint bestilling_dato_ok
--        check (hent_dato between current_date - 1 and current_date + 120)
--
--  Og `current_date` er IKKE en fast værdi. Et CHECK, der ser på
--  dagens dato, betyder, at den SAMME række holder op med at være
--  gyldig, når kalenderen går videre — og Postgres efterprøver
--  HVERT CHECK på hele den nye række ved enhver opdatering, også
--  når man kun rører én kolonne.
--
--  MÅLT 3/9 i produktionen: bestillingsnummer.sql's efterudfyldning
--  faldt med
--
--      ERROR 23514: new row for relation "bestillinger" violates
--      check constraint "bestilling_dato_ok"
--      DETAIL: ... 2026-08-21 ...
--
--  Rækken er en RIGTIG bestilling fra 19. august til den 21. Den
--  var gyldig, da gæsten sendte den. Den er det ikke i dag.
--
--  ⚠️ OG DET ER VÆRRE END EN MIGRERING. Bestillinger-fanen lister
--     alt uafsluttet på ANDRE dage, netop så intet går tabt. Står
--     der en bestilling fra i forgårs, som ingen fik lukket, kan
--     personalet IKKE trykke ✓ Færdig på den: statusskiftet er en
--     opdatering, og opdateringen efterprøver datoreglen igen.
--     "Intet må gå tabt" holdt altså ikke bagud.
--
--  ⚠️ REGLEN FORSVINDER IKKE, DEN FLYTTER. En gæst kan stadig ikke
--     bestille til en dag, der er gået, eller mere end fire
--     måneder ude — det er nu en udløser, og den dømmer ved
--     INDSÆTTELSE og når datoen FAKTISK ændres. En gammel række,
--     hvis dato ingen rører, går fri.
--
--  ⚠️ OG BESKEDEN HEDDER STADIG bestilling_dato_ok. js/store.js
--     linje 1759 oversætter netop det ord til "Vælg en dag der
--     ikke er gået endnu", og proev-adgang.sql prøve 8 leder efter
--     det. Skiftede navnet, ville gæsten få den rå SQL-fejl at se.
--
--  Skriver ingen data. Kan køres igen.
-- ============================================================

-- ------------------------------------------------------------
--  1) CHECK'et væk
-- ------------------------------------------------------------
alter table public.bestillinger
  drop constraint if exists bestilling_dato_ok;

-- ------------------------------------------------------------
--  2) Den samme regel som en udløser
-- ------------------------------------------------------------
create or replace function public.mosede_bestilling_dato_vaern()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  /* ⚠️ RØRER INGEN DEN GAMLE DATO, DØMMER VI IKKE. Det er hele
     pointen: personalet skal kunne hakke en gammel bestilling af,
     skrive en note på den og gendanne den — uden at datoen, gæsten
     valgte i august, spærrer for det. */
  if tg_op = 'UPDATE' and new.hent_dato is not distinct from old.hent_dato then
    return new;
  end if;

  /* Samme tal som CHECK'et havde: i dag eller senere, og ikke
     længere ude end fire måneder. Det ene døgns slæk dækker, at
     current_date er serverens UTC-dato, og Danmark er en time
     foran. */
  if new.hent_dato < current_date - 1
     or new.hent_dato > current_date + 120 then
    raise exception 'bestilling_dato_ok: %', new.hent_dato;
  end if;

  return new;
end $$;

drop trigger if exists bestilling_dato on public.bestillinger;
create trigger bestilling_dato
  before insert or update on public.bestillinger
  for each row
  execute function public.mosede_bestilling_dato_vaern();

-- ------------------------------------------------------------
--  Editoren viser kun den sidste sætnings svar.
-- ------------------------------------------------------------
select
  'datoreglen er en udloeser nu' as resultat,
  (select count(*) = 0 from pg_constraint
    where conname = 'bestilling_dato_ok') as check_er_vaek,
  (select count(*) = 1 from pg_trigger
    where tgname = 'bestilling_dato' and not tgisinternal) as udloeser_staar,
  (select count(*) from public.bestillinger
    where hent_dato < current_date - 1) as gamle_raekker_der_nu_kan_rettes;
