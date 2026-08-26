-- ============================================================
--  DAGENS BESKED FÅR EN TITEL — OG QR KAN SPÆRRES  (august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER: dagsregler.sql
--
--  ------------------------------------------------------------
--  TO TING, OG DE HAR INTET MED HINANDEN AT GØRE
--  ------------------------------------------------------------
--  De ligger i den samme fil, fordi det er én kørsel færre for
--  ejeren. Begge er små, og begge kan køres igen.
--
--  1) besked_til_gaester FÅR EN TITEL.
--     Kundens ord (26/8): beskeden skal vises "pænt og flot
--     nærmest cinematisk med titel og tekst".
--
--     Titlen kunne have været den første linje af teksten, og
--     det ville have været en fejl: en besked på én linje ville
--     blive til en overskrift uden noget under, og personalet
--     ville ikke kunne se hvorfor. To felter er to felter.
--
--  2) QR-BESTILLING KAN SLÅS FRA.
--     Kundens ord: "lad dem også få en blokér bestillinger på qr
--     koden bare hvis de har lyst."
--
--     ⚠️ OG DEN SKAL VÆRE DATABASENS, IKKE BROWSERENS. En gæst,
--     der sidder ved bord 7 med siden åben fra før personalet
--     slog fra, ville ellers kunne blive ved med at sende. Hun
--     sidder tyve meter væk og opdager det aldrig; køkkenet får
--     en bestilling, de troede var slået fra.
--
--  Fejlteksten oversættes i js/store.js — navnet her og dér skal
--  følges ad.
-- ============================================================

alter table public.dags_regler
  add column if not exists besked_titel text;

/* ⚠️ TITLEN LÆSES AF GÆSTEN, som resten af tabellen. Samme regel
   som besked_til_gaester: ingen navne, ingen numre, ingen interne
   bemærkninger. Personalets note bor i kalenderen. */
comment on column public.dags_regler.besked_titel is
  'Overskrift til gæstens dagsbesked. OFFENTLIG — ingen persondata.';


/* ============================================================
   VÆRNET: QR KAN SPÆRRES
   ------------------------------------------------------------
   Udvider mosede_dag_aaben fra dagsregler.sql. Køres dagsregler.sql
   eller lukkedag-vaern.sql IGEN bagefter, skrives det her væk, og
   så kan der bestilles fra bordene igen, selv om fluebenet står
   slået fra. er-vi-klar.sql fanger det.

   ⚠️ INDSTILLINGEN HEDDER bordbestilling_aaben, OG DET ER IKKE
   ET FRIT VALG. Kontakten FINDES i forvejen: den står på
   Køkken-kø-fanen og har gjort det siden 25/8 — den var bare kun
   browserens. Første udgave af den her fil opfandt et nyt navn
   (qr_aaben), og så ville fluebenet i admin og værnet i databasen
   have hver sin sandhed: personalet slår fra, skærmen siger fra,
   og databasen tager glad imod. To navne for det samme er den
   fejl, der koster mest og ses mindst.

   MANGLER indstillingen, er QR ÅBEN — en forretning, der ikke har
   rørt fluebenet, skal ikke opdage, at bordene holdt op med at
   virke.
   ============================================================ */
create or replace function public.mosede_dag_aaben()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dato    date;
  v_tid     time;
  v_lukker  time;
  v_saeson  jsonb;
  v_qr      jsonb;
  v_spis_her boolean;
  v_regel   public.dags_regler%rowtype;
begin
  if tg_table_name = 'bestillinger' then
    v_dato := new.hent_dato;
    v_tid  := new.hent_tid;
    /* ⚠️ BORDENE ER DÆKKET AF hvordan, fordi skemaet binder de to
       sammen (bestilling_bord_hvordan_ok). Se den lange note i
       dagsregler.sql om det døde led, der blev fjernet igen. */
    v_spis_her := (new.hvordan = 'spis_her');

    -- QR-spærren: KUN rækker med et bordnummer.
    if new.bord_nummer is not null then
      select i.vaerdi into v_qr
        from public.indstillinger i
       where i.lokation_id = new.lokation_id
         and i.noegle = 'bordbestilling_aaben';
      -- Mangler indstillingen, er QR åben.
      if v_qr is not null and v_qr::text = 'false' then
        raise exception 'bestilling_qr_lukket';
      end if;
    end if;
  else
    v_dato := new.dato;
    v_tid  := new.tid;
    v_spis_her := true;
  end if;

  -- 1) Lukkedag, også som periode (slut_dato tom = én dag)
  if exists (
    select 1 from public.kalender k
     where k.lokation_id = new.lokation_id
       and k.type = 'lukkedag'
       and v_dato between k.dato and coalesce(k.slut_dato, k.dato)
  ) then
    raise exception 'bestilling_lukket_dag';
  end if;

  -- 2) Tidlig lukning: sidste afhentning en halv time før
  select min(k.lukker_kl) into v_lukker
    from public.kalender k
   where k.lokation_id = new.lokation_id
     and k.type = 'tidlig_lukning'
     and v_dato between k.dato and coalesce(k.slut_dato, k.dato)
     and k.lukker_kl is not null;
  if v_lukker is not null and v_tid is not null
     and v_tid > v_lukker - interval '30 minutes' then
    raise exception 'bestilling_efter_lukketid';
  end if;

  -- 3) Sæsonlukning
  select i.vaerdi into v_saeson
    from public.indstillinger i
   where i.lokation_id = new.lokation_id
     and i.noegle = 'saeson';
  if coalesce((v_saeson->>'lukket')::boolean, false) then
    raise exception 'bestilling_saeson_lukket';
  end if;

  -- 4) DAGENS EGNE REGLER. Ingen række = almindelig dag.
  select * into v_regel
    from public.dags_regler r
   where r.lokation_id = new.lokation_id
     and r.dato = v_dato;

  if found then
    if v_spis_her and v_regel.luk_spis_her then
      raise exception 'bestilling_spis_her_lukket';
    end if;
    if (not v_spis_her) and v_regel.luk_takeaway then
      raise exception 'bestilling_takeaway_lukket';
    end if;

    if v_tid is not null then
      if v_regel.tidligst is not null and v_tid < v_regel.tidligst then
        raise exception 'bestilling_for_tidligt';
      end if;
      if v_spis_her then
        if v_regel.senest_spis_her is not null and v_tid > v_regel.senest_spis_her then
          raise exception 'bestilling_efter_lukketid';
        end if;
      else
        if v_regel.senest_togo is not null and v_tid > v_regel.senest_togo then
          raise exception 'bestilling_efter_lukketid';
        end if;
      end if;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists bestilling_dag_aaben on public.bestillinger;
create trigger bestilling_dag_aaben
  before insert on public.bestillinger
  for each row execute function public.mosede_dag_aaben();

drop trigger if exists bord_dag_aaben on public.bordbestillinger;
create trigger bord_dag_aaben
  before insert on public.bordbestillinger
  for each row execute function public.mosede_dag_aaben();


-- Rapport. Supabases SQL Editor viser kun den sidste sætnings
-- svar — se README-afsnittet "Supabases SQL Editor viser ikke
-- beskeder".
select
  case
    when not exists (select 1 from information_schema.columns
                      where table_schema = 'public' and table_name = 'dags_regler'
                        and column_name = 'besked_titel')
      then '❌ TITLEN BLEV IKKE TILFØJET — læs fejlbeskeden ovenfor'
    when not exists (
      select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'mosede_dag_aaben'
         and pg_get_functiondef(p.oid) like '%bordbestilling_aaben%')
      then '❌ VÆRNET KENDER IKKE QR-SPÆRREN — kør filen igen'
    when not exists (
      select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'mosede_dag_aaben'
         and pg_get_functiondef(p.oid) like '%luk_spis_her%')
      then '❌ DAGSREGLERNE ER SKREVET VÆK — kør supabase/dagsregler.sql først'
    else '✅ TITLEN OG QR-SPÆRREN ER PÅ PLADS — kør supabase/proev-dagsbesked-og-qr.sql'
  end as svar;
