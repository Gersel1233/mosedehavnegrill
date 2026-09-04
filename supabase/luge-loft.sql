-- ============================================================
--  HVOR MANGE KAN HENTE KL. 12.00?   (4. september 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet. Kør derefter proev-luge-loft.sql;
--  den skal skrive ALLE 12 AF 12 BESTOD.
--
--  ⚠️ MÅLT, IKKE GÆTTET: DER VAR INTET LOFT VED LUGEN.
--     `bestillinger` har tretten udløsere på sig, og ingen af dem
--     kigger på hentetiden. `bord_loft_pr_kvarter` (bord-loft.sql)
--     gælder KUN bordene og tæller et rullende kvarter i
--     REALTID — den siger intet om, hvor mange der har bedt om at
--     hente kl. 12.00 i morgen.
--
--     Altså kunne fyrre bestillinger lande på det samme
--     klokkeslæt, og systemet ville tage imod dem alle sammen
--     uden en linje nogen steder. Køkkenet opdager det, når
--     dagen begynder — og gæst nummer fyrre står ved lugen til
--     en tid, hun har fået skriftligt.
--
--  ⚠️ LOFTET TÆLLER BESTILLINGER, IKKE RETTER — og det er et
--     valg, ikke en forglemmelse:
--
--     1) Retter er et TAL, ingen kan slå op ét sted. Reglen for
--        hvad der ER en ret (emballagen og fragten tæller ikke
--        med) bor i `Butik.erEmballage` og `Admin.retterI` i
--        browseren; en kopi her ville være husets dyreste mønster
--        — to udgaver af den samme regel, der skrider fra
--        hinanden uden at nogen af dem ser forkerte ud.
--     2) `bestillinger.antal` DUER IKKE som genvej: den er
--        summen af ALLE linjer, altså med emballagen i. Den ville
--        tælle en pose som en ret.
--     3) Og det er det tal, ejeren kan svare på: "hvor mange kan
--        I ekspedere kl. 12.00?" — ikke "hvor mange portioner".
--
--     Den ENE store bestilling er i øvrigt ikke den, der gør
--     ondt: den kommer med et døgns varsel, og køkkenet ser den
--     komme. Det er stimen af små på dagen, der vælter en luge.
--
--  ⚠️ TOM, NUL ELLER NEGATIV = INTET LOFT. Samme lov som resten
--     af huset: en indstilling, ingen har rørt, må aldrig kunne
--     lukke for noget. Ejeren sætter tallet i admin →
--     Bestillinger.
--
--  ⚠️ OG DEN GÆLDER IKKE BORDENE. Et bord vælger ingen hentetid
--     — `hent_tid` er klokken NU — så et loft pr. tidsrum ville
--     lukke hele frokosten for dem, der SIDDER der. Bordene har
--     deres eget loft (bord-loft.sql) og deres eget pr. dag
--     (bord-loft-pr-dag.sql).
--
--  Ingen nye kolonner. `indstillinger` er nøgle/værdi.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) LOFTET
--    ---------------------------------------------------------
--    ⚠️ KUN VED INDSÆTTELSE. Alle husets kapacitetsværn er
--    insert-only (bord_bremse, mosede_dagen_er_optaget,
--    reservation_bremse), og det er ikke tilfældigt: et værn,
--    der også dømmer ved OPDATERING, spærrer for et statusskift
--    på en gammel række — nøjagtig det, `bestilling_dato_ok`
--    gjorde, indtil bestilling-dato-vaern.sql flyttede den
--    (3/9). Personalet skal kunne trykke ✓ Færdig på en
--    bestilling, uanset hvor fuld dens tid er, og de skal kunne
--    flytte en gæst til et fyldt tidsrum, hvis de siger ja i
--    telefonen. Det er en menneskelig beslutning; værnet er
--    gæstens.
--
--    ⚠️ ET AFSLAG FRIGIVER TIDEN IGEN. Samme regel som
--    reservationernes pladser: en afvist bestilling laves aldrig,
--    så den må ikke holde et tidsrum optaget. Det afhentede og
--    det udeblevne tæller derimod MED — den mad ER lavet.
-- ------------------------------------------------------------
create or replace function public.mosede_luge_loft()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loft int;
  v_taget int;
begin
  -- Bordet har ingen hentetid at fylde op; se noten øverst.
  if new.bord_nummer is not null then return new; end if;

  select nullif(btrim(i.vaerdi #>> '{}'), '')::int into v_loft
    from public.indstillinger i
   where i.lokation_id = new.lokation_id
     and i.noegle = 'luge_loft_pr_tid';

  if v_loft is null or v_loft <= 0 then return new; end if;

  select count(*) into v_taget
    from public.bestillinger b
   where b.lokation_id = new.lokation_id
     and b.bord_nummer is null
     and b.slettet is null
     and b.status <> 'afvist'
     and b.hent_dato = new.hent_dato
     and b.hent_tid = new.hent_tid;

  if v_taget >= v_loft then
    /* ⚠️ BESKEDEN SIGER TIDEN. Uden den ville gæsten få "der er
       fuldt" på en formular, hvor hun har valgt både en dag og
       et klokkeslæt — og så ved hun ikke, hvilket af de to hun
       skal lave om. js/store.js oversætter ordet til dansk. */
    raise exception 'bestilling_luge_fuldt: %', to_char(new.hent_tid, 'HH24:MI');
  end if;

  return new;
end $$;

comment on function public.mosede_luge_loft() is
  'Loft pr. hentetid ved lugen. Tæller BESTILLINGER (ikke retter — se filens note), springer bordene over, og et afslag frigiver tiden igen. Ikke sat betyder intet loft.';

drop trigger if exists bestilling_luge_loft on public.bestillinger;
create trigger bestilling_luge_loft
  before insert on public.bestillinger
  for each row execute function public.mosede_luge_loft();

-- Uden det her læser Postgres hele tabellen igennem for hver
-- eneste bestilling. setup.sql har allerede et indeks på
-- (hent_dato, hent_tid), men det kender hverken forretningen
-- eller lugen, så tællingen ville hente bordenes rækker med.
create index if not exists bestillinger_luge_tid_idx
  on public.bestillinger (lokation_id, hent_dato, hent_tid)
  where bord_nummer is null and slettet is null;

-- ------------------------------------------------------------
-- 2) HVAD ER DER TILBAGE?
--    ---------------------------------------------------------
--    ⚠️ ET KRAV, MAN MØDER SOM ET AFSLAG, ER SKREVET DET FORKERTE
--    STED. Værnet ovenfor er sidste ord; men gæsten skal se
--    "kl. 12.00 — fuldt" i vælgeren, FØR hun har fyldt en kurv,
--    skrevet navn og nummer og trykket send. Det er den samme
--    afvejning som mindsteantallet fik 4/9 og den fulde lørdag
--    fik 1/9.
--
--    ⚠️ KUN TAL. Ingen navne, ingen numre, ingen varelinjer.
--    Visningen kører med sin EJERS øjne og springer
--    adgangsreglerne over — det er hele meningen, for gæsten skal
--    kunne se, at kl. 12.00 er optaget, uden at kunne læse HVEM
--    der har taget tiderne. Samme lov som optagne_dage,
--    bord_travlhed, bord_fyldte_dage og arrangement_pladser:
--    TILFØJ ALDRIG EN KOLONNE. Prøve 9 tæller dem.
--
--    ⚠️ OG LOFTET STÅR IKKE I VISNINGEN. Det er ÉN indstilling,
--    som gæstesiden allerede henter (bord_fyldte_dage bærer sit
--    loft, fordi DET er tre lag dybt). To udgaver af det samme
--    tal ville skride fra hinanden, første gang ejeren rettede
--    sit eget.
-- ------------------------------------------------------------
drop view if exists public.luge_fyldte_tider;

create view public.luge_fyldte_tider as
select
  b.lokation_id,
  b.hent_dato as dato,
  to_char(b.hent_tid, 'HH24:MI') as tid,
  count(*)::int as taget
from public.bestillinger b
where b.bord_nummer is null
  and b.slettet is null
  and b.status <> 'afvist'
  and b.hent_dato >= current_date
group by b.lokation_id, b.hent_dato, b.hent_tid;

comment on view public.luge_fyldte_tider is
  'KUN TAL: hvor mange bestillinger der skal hentes ved lugen på hver dato og hvert klokkeslæt fra i dag. Tilføj ALDRIG en kolonne — visningen springer adgangsreglerne over.';

grant select on public.luge_fyldte_tider to anon, authenticated;

commit;

-- ------------------------------------------------------------
--  ⚠️ DER ER MED VILJE IKKE ET LOFT PR. DAG HER
--  ------------------------------------------------------------
--  Bordene har tre lag (dagens eget, ejerens almindelige,
--  antallet af borde). Lugen har ét, og det er en beslutning:
--
--  - Dagen kan ALLEREDE lukkes helt for take-away i
--    `dags_regler` (dagsregler.sql), og tiderne kan snævres ind
--    med `tidligst`/`senest_togo`. Der findes altså allerede en
--    vej til "på lørdag tager vi ikke imod ved lugen".
--  - En ny kolonne på `dags_regler` skal BÆRES MED af hver
--    eneste skrivning til rækken, ellers tørres den af — arret
--    fra bordloftet 1/9, hvor et gem af en tidlig lukning
--    slettede loftet uden en linje om hvorfor.
--
--  Beder ejeren om det, er det den vej: en kolonne, `dagsregel()`
--  bærer med, og et tredje lag i `Butik.lugeLoft`.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from pg_trigger
    where tgrelid = to_regclass('public.bestillinger')
      and tgname = 'bestilling_luge_loft')
    as "vaernet (skal vaere 1)",
  (select count(*) from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public'
     and p.proname = 'mosede_luge_loft'
     and p.prosecdef)
    as "security definer (skal vaere 1)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'luge_fyldte_tider')
    as "visningen (skal vaere 4 — og ALDRIG flere)";
