-- ============================================================
--  EN BREMSE PÅ BESTILLINGER
--  ------------------------------------------------------------
--  Kør EFTER setup.sql og flerlejer.sql. Filen kan køres igen
--  uden at der sker noget.
--
--  HVORFOR
--  ------------------------------------------------------------
--  Anon-nøglen ligger offentligt i js/config.js. Det er med
--  vilje og helt i orden — adgangsreglerne bestemmer hvad den
--  må. Men den MÅ afgive en bestilling, for ellers kunne en gæst
--  ikke bestille. Og hvad en browser kan gøre én gang, kan et
--  script gøre ti tusind gange.
--
--  Der er allerede en bremse: bestilling_ikke_dobbelt afviser
--  samme telefonnummer, samme dag, samme tid. Den fanger
--  dobbelttryk. Den fanger IKKE en løkke, der tæller
--  telefonnummeret én op hver gang.
--
--  Det er ikke et databaseproblem. Det er en skærm ved lugen
--  fuld af bestillinger, der ikke findes, en morgen hvor der
--  også skal laves mad.
--
--  HVOR BREMSEN SIDDER
--  ------------------------------------------------------------
--  Her, i databasen. Alternativet var en Edge Function foran
--  tabellen, og den ville kunne tælle på IP-adresse i stedet for
--  telefonnummer. Men den skal udrulles med Supabase' eget
--  værktøj, den er endnu et sted at holde en nøgle, og indtil
--  den ER udrullet, beskytter den ingenting. Denne fil virker,
--  når du har kørt den. Bliver misbrug et rigtigt problem,
--  flytter vi bremsen ud foran — grænserne herunder er de samme
--  tal.
--
--  TALLENE
--  ------------------------------------------------------------
--  De er sat, så en rigtig gæst aldrig møder dem:
--
--    5 bestillinger fra samme nummer på et døgn.
--      En familie, der bestiller til fredag og fortryder tre
--      gange, rammer den ikke. Et script rammer den ved nr. 6.
--
--    40 bestillinger på samme forretning på en time.
--      Smørrebrød ud af huset bestilles dagen før, ikke i en
--      kø. Fyrre på en time er langt over en travl dag, og et
--      script er derovre på et sekund.
--
--  Rammer en rigtig gæst dem alligevel, er beskeden ikke en
--  blindgyde: der står, at man skal ringe. Det er den samme vej,
--  som fandtes før hjemmesiden.
-- ============================================================

begin;

-- Uden den her skal Postgres læse hele tabellen igennem to gange
-- for hver eneste bestilling. Med den er begge tællinger et
-- opslag. Tabellen er lille i dag; den skal ikke være årsagen
-- til at den bliver langsom.
create index if not exists bestillinger_bremse_nummer_idx
  on public.bestillinger (telefon, oprettet desc);

create index if not exists bestillinger_bremse_sted_idx
  on public.bestillinger (lokation_id, oprettet desc);

/* security definer er ikke pynt her, det er hele forudsætningen.
   Gæsten er rollen anon, og anon må IKKE læse bestillinger — det
   er meningen, tabellen er fuld af navne og telefonnumre. Kørte
   funktionen som gæsten, ville begge tællinger give nul hver
   eneste gang, og bremsen ville se ud til at virke uden at gøre
   noget overhovedet.

   search_path = '' og fuldt udskrevne navne hører med: en
   security definer-funktion med løs søgesti er den klassiske vej
   til at køre fremmed kode som ejeren. */
create or replace function public.bestilling_bremse()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fra_nummeret int;
  paa_stedet   int;
begin
  select count(*) into fra_nummeret
    from public.bestillinger b
   where b.telefon = new.telefon
     and b.oprettet > now() - interval '24 hours';

  if fra_nummeret >= 5 then
    -- Navnet står i teksten med vilje. js/store.js kender det og
    -- oversætter det til noget, en gæst kan bruge; alt andet ville
    -- give gæsten en Postgres-fejl at kigge på.
    raise exception 'bestilling_bremse_nummer';
  end if;

  select count(*) into paa_stedet
    from public.bestillinger b
   where b.lokation_id = new.lokation_id
     and b.oprettet > now() - interval '1 hour';

  if paa_stedet >= 40 then
    raise exception 'bestilling_bremse_travlt';
  end if;

  return new;
end $$;

/* Kun ved insert. Personalet skal kunne rette status på en
   bestilling hele dagen uden at støde ind i en bremse, der er
   bygget mod noget helt andet. */
drop trigger if exists bestilling_bremse on public.bestillinger;
create trigger bestilling_bremse
  before insert on public.bestillinger
  for each row execute function public.bestilling_bremse();

commit;

-- ------------------------------------------------------------
--  BAGEFTER
--  ------------------------------------------------------------
--  Kør supabase/proev-flerlejer.sql. Prøve 22 og 23 måler de to
--  grænser — både at de bremser, og at den femte bestilling fra
--  samme nummer stadig går igennem.
--
--  Skal tallene ændres, står de to steder: her og i noten
--  øverst. Ret begge, ellers lyver noten.
-- ------------------------------------------------------------
