-- ============================================================
--  BORDENE TÆLLER IKKE MED I BREMSEN  (26. sep 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER bremse.sql — og sidst, efter gaestens-vaern-26-9.sql
--  (se docs/SQL-RAEKKEFOELGE.md). Filen kan køres igen.
--  Prøve: proev-bremse-uden-borde-26-9.sql
--
--  ------------------------------------------------------------
--  HVORFOR
--  ------------------------------------------------------------
--  Mikkels ord 26/9: *"lad bordene ikke tælle med i bremsen"*.
--
--  bremse.sql er fra august, da en bestilling var smørrebrød ud af
--  huset, bestilt dagen før: "Fyrre på en time er langt over en
--  travl dag". Siden er de andre veje kommet til, og de lander ALLE i
--  bestillinger: forsiden (med isen), tapas, bestil/ og bordene (QR).
--  Bremsen talte dem sammen. En lørdag, hvor bordene bestiller mad,
--  drikke og is, kunne ramme 40 på en time — og så afviste databasen
--  ALLE online-bestillinger, også smørrebrødet til i morgen, i op til
--  en time. Og en familie, der sad hele eftermiddagen og bestilte mad,
--  øl, is og kaffe med sit nummer i feltet, ramte "5 fra samme nummer
--  på et døgn" ved sjette runde.
--
--  ------------------------------------------------------------
--  NU
--  ------------------------------------------------------------
--  · En bestilling fra et bord tæller ikke med i de 40 i timen og
--    ikke i de 5 pr. nummer — og bremses ikke af dem
--  · Til gengæld har hvert bord sit eget loft: 20 bestillinger i
--    timen. Otte ved et bord, der hver bestiller to gange, er 16
--  · Mad ud af huset har præcis de samme to grænser som før
--
--  ⚠️ BORDNUMMERET, IKKE KANALEN. `kanal` er et ord, gæstens egen
--  side sender for at sige, hvor den kom fra — enhver kan sende det.
--  `bord_nummer` er prøvet, FØR bremsen kører: udløserne kører i
--  alfabetisk orden, og bestilling_bord_findes (bordet findes og er
--  aktivt) og bestilling_bord_noegle (bordets nøgle passer) står
--  begge før bestilling_bremse. Et bordnummer kan kun stå på "spis
--  her" (bestilling_bord_hvordan_ok).
--
--  ⚠️ HVORFOR ET LOFT PR. BORD. Uden det var et bordnummer en dør
--  uden om bremsen: et script, der skrev "bord 7" på hver
--  bestilling, blev aldrig bremset. Med det kan ét bord højst sende
--  20 i timen. Loftet er ikke køkkenets loft pr. kvarter
--  (bord-loft.sql, sat i admin) — det er stadig ejerens eget tal.
--
--  ⚠️ SKRALDESPANDEN ER MED. skraldespand.sql skriver "and
--  ALIAS.slettet is null" ind foran hver tælling, så det, personalet
--  har slettet, ikke tæller. Funktionen her skrives forfra og har den
--  derfor med i alle tre tællinger — i den form, skraldespand.sql
--  leder efter (så den ser den som rettet og lader den være).
--
--  ⚠️ KØRES bremse.sql IGEN, TÆLLER BORDENE MED IGEN. Kør så denne
--  fil bagefter — er-vi-klar.sql tjek 151 siger ❌, indtil du gør.
-- ============================================================

begin;

/* security definer og search_path = '' af samme grund som i
   bremse.sql: gæsten må ikke læse bestillinger, så en tælling, der
   kørte som gæsten, ville give nul hver gang. */
create or replace function public.bestilling_bremse()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fra_nummeret int;
  paa_stedet   int;
  ved_bordet   int;
begin
  /* BORDET: sit eget loft, og intet andet. */
  if new.bord_nummer is not null then
    select count(*) into ved_bordet
      from public.bestillinger b
     where b.lokation_id = new.lokation_id
       and b.bord_nummer is not null
       and lower(btrim(b.bord_nummer)) = lower(btrim(new.bord_nummer))
       and b.slettet is null and b.oprettet > now() - interval '1 hour';

    if ved_bordet >= 20 then
      -- js/store.js kender navnet og siger det til gæsten.
      raise exception 'bestilling_bremse_bord';
    end if;

    return new;
  end if;

  /* MAD UD AF HUSET: de to grænser fra bremse.sql, men kun talt
     blandt bestillinger, der ikke kom fra et bord. */
  select count(*) into fra_nummeret
    from public.bestillinger b
   where b.telefon = new.telefon
     and b.bord_nummer is null
     and b.slettet is null and b.oprettet > now() - interval '24 hours';

  if fra_nummeret >= 5 then
    raise exception 'bestilling_bremse_nummer';
  end if;

  select count(*) into paa_stedet
    from public.bestillinger b
   where b.lokation_id = new.lokation_id
     and b.bord_nummer is null
     and b.slettet is null and b.oprettet > now() - interval '1 hour';

  if paa_stedet >= 40 then
    raise exception 'bestilling_bremse_travlt';
  end if;

  return new;
end $$;

comment on function public.bestilling_bremse() is
  'Mad ud af huset: 5 pr. nummer på et døgn, 40 pr. forretning i timen. Bordene tæller ikke med; hvert bord har sit eget loft på 20 i timen (bremse-uden-borde-26-9.sql).';

/* Udløseren står, som bremse.sql lavede den — kun ved insert.
   Den oprettes igen her, så filen også virker, hvis nogen har
   fjernet den. */
drop trigger if exists bestilling_bremse on public.bestillinger;
create trigger bestilling_bremse
  before insert on public.bestillinger
  for each row execute function public.bestilling_bremse();

commit;

-- Editoren viser kun den sidste sætnings svar.
select
  'bremsen tæller ikke bordene' as resultat,
  (select p.prosrc like '%bestilling_bremse_bord%'
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'bestilling_bremse') as ny_udgave,
  (select count(*) = 1 from pg_trigger
    where tgname = 'bestilling_bremse' and not tgisinternal) as udloeseren_staar;
