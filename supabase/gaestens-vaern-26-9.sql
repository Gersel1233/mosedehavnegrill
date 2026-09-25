-- ============================================================
--  GÆSTENS VÆRN — FIRE HULLER, ÉN FIL  (26. sep 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER hele rækkefølgen (sidst, efter glutenfrit-broed-5-kr.sql).
--  Kan køres igen uden skade. Prøven er proev-gaestens-vaern-26-9.sql.
--
--  En gennemgang af koden 25/9 (læst, ikke kørt) fandt fire huller.
--  Alle fire er MÅLT, før rettelsen blev skrevet: prøven kørte mod en
--  lokal Postgres bygget af mappens egne filer UDEN den her fil og
--  faldt på hvert af dem.
--
--  1) `oprettet` VAR KLIENTENS.
--     Alle bremser tæller "oprettet > now() - interval ..." — bremse.sql,
--     borde.sql, udlejning.sql, forespoergsler.sql, reservation_bremse
--     og bordenes kvarter. Men kolonnen havde kun en STANDARDVÆRDI, og
--     en standard er et forslag: sendte en konsol "oprettet":
--     "2020-01-01", blev rækken aldrig talt. Målt: fem bestillinger fra
--     samme nummer, dateret 2020, og den sjette gik igennem.
--     Den anden vej er værre: fyrre rækker dateret 2099 tæller FOR
--     EVIGT, og så får hver eneste gæst "der er travlt" — hjemmesiden
--     lukket med fyrre linjer i en konsol.
--     NU: klientens bud smides ALTID væk, samme greb som
--     bestillingsnummer.sql. Alt, der kommer gennem API'et (rollen
--     anon eller authenticated), får databasens now() — også
--     personalet, som aldrig sender kolonnen (målt i js/store.js og
--     js/store-skriv.js: `oprettet` sættes kun i øvetilstanden).
--     ⚠️ En SQL-fil uden claims beholder sit. demo-indhold.sql og
--     prøverne (proev-bestillingsnummer.sql, proev-bordnummer.sql,
--     proev-ryd-proevedata.sql) dater rækker tilbage MED VILJE.
--
--  2) "KUN GÆSTEN" BETØD "KUN ROLLEN anon".
--     Fire værn sprang over for alt andet end rollen anon
--     (gaestens-regler.sql, kanal-vaern.sql, levering-valideret.sql,
--     bord-plads.sql) — men indsættelsen er åben for anon OG
--     authenticated (skraldespand.sql). Er Supabase Auths
--     selvtilmelding slået til, kan enhver oprette en bruger med
--     anon-nøglen og er så authenticated: pris, varsel, kategori,
--     levering uden kvittering og et bord til sig selv hver lørdag.
--     NU: reglerne gælder ALLE, der kommer gennem API'et, UNDTAGEN
--     personalet for forretningen. Personalet kendes på husets egen
--     is_admin_for(), som kræver `aktiv` (roller.sql) — så en
--     medarbejder, der er slået fra, er gæst igen. Reglen bor ét
--     sted: mosede_er_gaest() herunder.
--
--  3) LINJENS ANTAL BLEV IKKE KONTROLLERET.
--     Værnene springer en linje med antal <= 0 over
--     (menukort-antal-og-dage.sql, gaestens-regler.sql), og kolonnen
--     `antal` blev aldrig holdt op mod linjerne. 2 × Softice +
--     Emballage × -9 = 0 kr., og kolonnen sagde 2.
--     NU: hver linje har et HELT tal fra 1 til 500 (kolonnens eget
--     loft), og `antal` er summen af linjerne — sådan som
--     Butik.bestil (js/store.js) altid har bygget den: linjer med
--     antal 0 falder fra, og summen tælles af det, der er tilbage.
--     Fejlen bærer navnet bestilling_antal_ok, som js/store.js
--     allerede oversætter — en gæst får aldrig en teknisk kode.
--
--  4) EN BORDORDRE KUNNE LYVE OM DAGEN.
--     Lukkedag, åbningstider og dagens regler (mosede_dag_aaben)
--     dømmes på hent_dato — og den er klientens. Ved bordet er dagen
--     I DAG (js/bestilling.js sætter Butik.nu().dato, dansk tid), så
--     en bordordre dateret i morgen var en vej forbi en lukkedag.
--     NU: en gæsts bordordre skal være dateret i dag, dansk tid.
--     Kun gæstens — personalet kan stadig skrive en bordordre ind.
--
--  ⚠️ FUNKTIONERNE ER KOPIER AF DE NYESTE UDGAVER — ordret, bortset
--     fra tjekket (og i mosede_gaestens_regler punkt 3 og 4):
--       mosede_gaestens_regler    fra gaestens-regler.sql
--       mosede_kanal_vaern        fra kanal-vaern.sql
--       mosede_levering_valideret fra levering-valideret.sql
--       mosede_bord_plads_vaern   fra bord-plads.sql
--     Køres en af de fire filer igen BAGEFTER, skriver den den gamle
--     dør tilbage (kun rollen anon) — tavst. Kør så den her igen.
--     Står i docs/SQL-RAEKKEFOELGE.md, og er-vi-klar.sql tjek 150
--     fanger det.
--
--  ⚠️ DATABASEN MÅ ALDRIG VÆRE STRENGERE END SIDEN. Hver ny regel er
--     målt mod det, siden SENDER: Butik.bestil bygger antal som
--     summen af hele tal over nul, og bordets dato er Butik.nu().
--
--  ⚠️ INGEN SEMIKOLON I EN TEKST, og hver funktion står hel (arret
--     fra isens-opsaetning.sql 25/9). TJEK LINJETALLET: sidste linje
--     i filen siger, hvilket nummer den har.
-- ============================================================

begin;

-- ------------------------------------------------------------
--  0) STÅR DET, FILEN RETTER, OVERHOVEDET DER?
--     Fejler den her, er INTET ændret: transaktionen rulles tilbage.
-- ------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.mosede_valg_tillaeg(jsonb, text)') is null
     or to_regprocedure('public.mosede_leveringszone(numeric, numeric, text)') is null
     or to_regclass('public.leverings_valideringer') is null
     or to_regprocedure('public.is_admin_for(text)') is null
     or not exists (select 1 from pg_trigger where tgname = 'bestilling_gaestens_regler')
     or not exists (select 1 from pg_trigger where tgname = 'bestilling_kanal_vaern')
     or not exists (select 1 from pg_trigger where tgname = 'bestilling_levering_valideret')
     or not exists (select 1 from pg_trigger where tgname = 'bordbestilling_plads') then
    raise exception 'Koer hele raekkefoelgen foerst (til og med levering-valideret.sql) - vaernene, filen retter, findes ikke. Intet er aendret.';
  end if;

  /* ⚠️ is_admin_for SKAL KRÆVE `aktiv` (roller.sql). Ellers er en
     medarbejder, ejeren har slået fra, stadig "personale" her — og
     slipper uden om gæstens regler med en gammel login. */
  if pg_get_functiondef('public.is_admin_for(text)'::regprocedure) not like '%aktiv%' then
    raise exception 'Koer roller.sql foerst - is_admin_for kraever ikke aktiv. Intet er aendret.';
  end if;
end $$;


-- ------------------------------------------------------------
--  1) HVEM ER GÆST?  — ÉT STED
--     ---------------------------------------------------------
--     Gæst = kaldet kommer gennem API'et (rollen anon eller
--     authenticated i det signerede JWT) OG er ikke aktivt personale
--     for DEN forretning, rækken hører til.
--
--     ⚠️ INGEN CLAIMS ER IKKE EN GÆST. Supabases SQL Editor, demoen og
--     prøverne kører uden claims, og de må ikke dømmes af et varsel
--     (samme skel som gaestens-regler.sql altid har haft). Det samme
--     gælder service_role: den nøgle bor kun på serveren.
--
--     ⚠️ SPØRGSMÅLET STILLES PR. FORRETNING. Personale i én forretning
--     er gæst i den næste (flerlejer.sql's regel).
-- ------------------------------------------------------------
create or replace function public.mosede_er_gaest(p_lokation text)
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select coalesce(auth.jwt() ->> 'role', '') in ('anon', 'authenticated')
     and not coalesce(public.is_admin_for(p_lokation), false)
$function$;

comment on function public.mosede_er_gaest(text) is
  'Sand, når kaldet kommer gennem API''et (anon eller authenticated) og ikke er aktivt personale for forretningen. Gæstens regler gælder da (26/9).';

/* Kun udløserne kalder den, og de kører som ejeren (security
   definer). Gæsten har ingen grund til at spørge. */
revoke execute on function public.mosede_er_gaest(text) from public, anon, authenticated;


-- ------------------------------------------------------------
--  2) `oprettet` ER SERVERENS
--     ---------------------------------------------------------
--     ⚠️ UDLØSEREN HEDDER aa_... MED VILJE. BEFORE-udløsere kører i
--     navnets rækkefølge, og tidsstemplet skal være på plads, FØR en
--     anden regel når at læse rækken. I dag læser ingen af de andre
--     new.oprettet (målt) — men den dag, én gør, må den ikke kunne
--     læse klientens bud.
--
--     ⚠️ ALLE FEM TABELLER, EN GÆST KAN SKRIVE I. Talt i
--     pg_policies: bestillinger, bordbestillinger, forespoergsler,
--     udlejninger og reservationer har hver en indsættelse for anon
--     og authenticated — og ingen andre har.
-- ------------------------------------------------------------
create or replace function public.mosede_oprettet_er_serverens()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  /* Gennem API'et: klientens bud smides væk, altid. Uden claims (en
     SQL-fil) står værdien, som filen skrev den. */
  if coalesce(auth.jwt() ->> 'role', '') in ('anon', 'authenticated') then
    new.oprettet := now();
  end if;
  return new;
end $function$;

comment on function public.mosede_oprettet_er_serverens() is
  'Sætter oprettet til databasens now() for alt, der kommer gennem API''et. Bremserne tæller på kolonnen, så den må ikke være klientens (26/9).';

revoke execute on function public.mosede_oprettet_er_serverens() from public, anon, authenticated;

drop trigger if exists aa_oprettet_er_serverens on public.bestillinger;
create trigger aa_oprettet_er_serverens
  before insert on public.bestillinger
  for each row execute function public.mosede_oprettet_er_serverens();

drop trigger if exists aa_oprettet_er_serverens on public.bordbestillinger;
create trigger aa_oprettet_er_serverens
  before insert on public.bordbestillinger
  for each row execute function public.mosede_oprettet_er_serverens();

drop trigger if exists aa_oprettet_er_serverens on public.forespoergsler;
create trigger aa_oprettet_er_serverens
  before insert on public.forespoergsler
  for each row execute function public.mosede_oprettet_er_serverens();

drop trigger if exists aa_oprettet_er_serverens on public.udlejninger;
create trigger aa_oprettet_er_serverens
  before insert on public.udlejninger
  for each row execute function public.mosede_oprettet_er_serverens();

drop trigger if exists aa_oprettet_er_serverens on public.reservationer;
create trigger aa_oprettet_er_serverens
  before insert on public.reservationer
  for each row execute function public.mosede_oprettet_er_serverens();


-- ------------------------------------------------------------
--  3) GÆSTENS REGLER — nyeste udgave fra gaestens-regler.sql.
--     Ændret: døren (mosede_er_gaest), og to nye regler lige efter
--     den: linjens antal (hul 3) og bordets dato (hul 4).
--     Udløseren bestilling_gaestens_regler står, som den stod.
-- ------------------------------------------------------------
create or replace function public.mosede_gaestens_regler()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  MARGEN    constant numeric := 15;   -- minutter; se hovedet
  v_i       jsonb;
  v_bord    boolean := new.bord_nummer is not null;
  v_nu      timestamp := (now() at time zone 'Europe/Copenhagen');
  v_tid     time;       -- det klokkeslæt, kategoriens vindue måles på
  v_til     numeric;    -- minutter fra nu til hentetiden
  v_kanal   numeric;
  v_timer   numeric;
  v_fald    numeric;    -- varslet for en linje uden kategori
  v_sidste  time;
  v_x       time;
  v_aab     record;
  v_min     numeric;
  v_smoer   int;
  v_tal     numeric;
  v_emb     text;
  linje     jsonb;
  navnet    text;
  v_pris    numeric;
  v_priser  numeric[];
  v_kendt   boolean;
  v_ok      boolean;
  v_grund   text;
  v_fra     time;
  v_tilkl   time;
  v_var     numeric;
  v_alle_valg boolean;
  v_valg_ok boolean;
  e         jsonb;
  k         record;
  v_forkert int;        -- linjer, hvis antal ikke er et helt tal fra 1 til 500
  v_sum     numeric;    -- summen af linjernes antal
begin
  /* ⚠️ GÆSTEN ER ALLE UDEN FOR PERSONALET (26/9). Her stod "kun
     rollen anon" — men en bruger, der har oprettet sig selv, er
     authenticated og slap uden om alt herunder. Personalet (aktivt,
     for DEN forretning) og en SQL-fil uden claims dømmes stadig ikke
     af et varsel. Se mosede_er_gaest og gaestens-vaern-26-9.sql. */
  if not public.mosede_er_gaest(new.lokation_id) then
    return new;
  end if;

  /* ⚠️ 0a) LINJENS ANTAL ER ET HELT TAL FRA 1 TIL 500 — OG KOLONNEN ER
     SUMMEN (26/9). Værnene herunder og i menukort-antal-og-dage.sql
     springer en linje med antal <= 0 over, og intet holdt `antal` op
     mod linjerne: 2 × Softice + Emballage × -9 blev 0 kr., mens
     kolonnen sagde 2. Butik.bestil (js/store.js) runder hvert antal,
     smider linjer med 0 væk og tæller `antal` som summen af resten —
     så en side, der virker, rammer aldrig reglen.
     ⚠️ case og ikke and: SQL lover ikke rækkefølgen i et and, og en
     tekst i feltet må ikke nå frem til ::numeric.
     ⚠️ Navnet er bestilling_antal_ok MED VILJE — kolonnens eget CHECK,
     som js/store.js allerede oversætter til noget, en gæst kan læse. */
  select count(*) filter (where case
           when jsonb_typeof(l -> 'antal') is distinct from 'number' then true
           else (l ->> 'antal')::numeric <> trunc((l ->> 'antal')::numeric)
                or (l ->> 'antal')::numeric not between 1 and 500 end),
         coalesce(sum(case when jsonb_typeof(l -> 'antal') = 'number'
                           then (l ->> 'antal')::numeric end), 0)
    into v_forkert, v_sum
    from jsonb_array_elements(coalesce(new.linjer, '[]'::jsonb)) l;

  if v_forkert > 0 then
    raise exception 'bestilling_antal_ok: en linje har et antal, der ikke er et helt tal fra 1 til 500';
  end if;
  if v_sum is distinct from new.antal::numeric then
    raise exception 'bestilling_antal_ok: antal er %, men linjerne siger %', new.antal, v_sum;
  end if;

  /* ⚠️ 0b) VED BORDET ER DAGEN I DAG, DANSK TID (26/9). Lukkedagen,
     åbningstiderne og dagens regler dømmes på hent_dato — og den er
     klientens. Siden sætter Butik.nu().dato ved bordet (js/bestilling.js),
     så en bordordre dateret i morgen var en vej forbi en lukkedag. */
  if v_bord and new.hent_dato is distinct from v_nu::date then
    raise exception 'bestilling_bord_ikke_i_dag: %', new.hent_dato;
  end if;

  select coalesce(jsonb_object_agg(i.noegle, i.vaerdi), '{}'::jsonb) into v_i
    from public.indstillinger i
   where i.lokation_id = new.lokation_id;

  -- A) LEVERING, NÅR DEN ER SLÅET FRA. Fluebenet i admin er standard
  --    FRA (23/8); en side med en gammel fane kan stadig sende den.
  if new.hvordan = 'levering' and coalesce(v_i ->> 'levering', 'false') <> 'true' then
    raise exception 'bestilling_levering_lukket';
  end if;

  -- B) TIDEN. Ved bordet er den klokken nu — gæsten sidder der.
  v_tid := case when v_bord then v_nu::time else new.hent_tid end;

  if not v_bord and new.hent_dato is not null and new.hent_tid is not null then
    v_til := extract(epoch from ((new.hent_dato + new.hent_tid) - v_nu)) / 60;

    -- B1) En tid, der er gået. Vælgeren tilbyder den aldrig.
    if v_til < 0 then
      raise exception 'bestilling_tid_gaaet: %', to_char(new.hent_tid, 'HH24:MI');
    end if;

    -- Kanalens varsel (kanalVarsel) og det gamle døgn (varselTimer).
    v_kanal := case when new.hvordan = 'spis_her'
                    then coalesce(public.mosede_tal(v_i -> 'varsel_min_bord'),
                                  public.mosede_tal(v_i -> 'varsel_min_togo'))
                    else public.mosede_tal(v_i -> 'varsel_min_togo') end;
    if v_kanal is not null and v_kanal < 0 then v_kanal := null; end if;
    v_timer := public.mosede_tal(v_i -> 'bestilling_varsel_timer');
    if v_timer is null or v_timer < 0 then
      /* Number('') er 0 i JavaScript; alt andet ukendt er 24. */
      v_timer := case when (v_i ->> 'bestilling_varsel_timer') = '' then 0 else 24 end;
    end if;
    v_fald := coalesce(round(v_kanal), v_timer * 60);

    -- B2) SIDSTE BESTILLING (tiderFor): lugen, en tidlig lukning, dagens
    --     egen senest-tid og køkkenet — den tidligste — minus
    --     sidste_bestilling_min (30, hvis ingen har sat den).
    select a.lukket, a.lukker into v_aab
      from public.aabningstider a
     where a.lokation_id = new.lokation_id
       and a.ugedag = extract(isodow from new.hent_dato)::int - 1;
    if found and not coalesce(v_aab.lukket, false) and v_aab.lukker is not null then
      v_sidste := v_aab.lukker;

      select min(kk.lukker_kl) into v_x
        from public.kalender kk
       where kk.lokation_id = new.lokation_id
         and kk.type = 'tidlig_lukning'
         and new.hent_dato between kk.dato and coalesce(kk.slut_dato, kk.dato)
         and kk.lukker_kl is not null;
      if v_x is not null and v_x < v_sidste then v_sidste := v_x; end if;

      v_x := null;
      select case when new.hvordan = 'spis_her' then r.senest_spis_her else r.senest_togo end
        into v_x
        from public.dags_regler r
       where r.lokation_id = new.lokation_id and r.dato = new.hent_dato;
      if v_x is not null and v_x < v_sidste then v_sidste := v_x; end if;

      v_x := public.mosede_klokken(v_i -> 'koekken_lukker');
      if v_x is not null and v_x < v_sidste then v_sidste := v_x; end if;

      v_tal := public.mosede_tal(v_i -> 'sidste_bestilling_min');
      if v_tal is null or v_tal < 0 then v_tal := 30; end if;
      v_sidste := v_sidste - make_interval(mins => round(v_tal)::int);

      if new.hent_tid > v_sidste then
        raise exception 'bestilling_efter_sidste_bestilling: %', to_char(v_sidste, 'HH24:MI');
      end if;
    end if;

    -- B3) MINDSTEANTALLET ER SMØRREBRØDETS (minStkMangler). Kategorien
    --     kendes på navnet, som Butik.smoerrebroed gør det. Bordet er
    --     undtaget — "én is ved bord 7 er ikke for lidt".
    v_min := public.mosede_tal(v_i -> 'bestilling_min_stk');
    v_min := case when v_min is null or v_min < 1 then 4 else round(v_min) end;
    if v_min > 1 then
      select coalesce(sum(greatest(coalesce((l ->> 'antal')::int, 0), 0)), 0)::int into v_smoer
        from jsonb_array_elements(coalesce(new.linjer, '[]'::jsonb)) l
       where coalesce(l ->> 'emballage', '') <> 'true'
         and exists (
           select 1 from public.menu_varer v
             join public.menu_kategorier kat on kat.id = v.kategori_id
            where lower(btrim(v.navn)) = lower(btrim(coalesce(l ->> 'navn', '')))
              and (kat.lokation_id is null or kat.lokation_id = new.lokation_id)
              and v.aktiv and kat.aktiv
              and lower(kat.navn) ~ '(smørrebrød|håndmad|fyld)');
      if v_smoer > 0 and v_smoer < v_min then
        raise exception 'bestilling_for_faa_smoerrebroed: %', v_min;
      end if;
    end if;
  end if;

  -- B4) KATEGORIENS VINDUE OG VARSEL (kategoriPaaTid), linje for linje.
  for linje in select * from jsonb_array_elements(coalesce(new.linjer, '[]'::jsonb))
  loop
    if coalesce(linje ->> 'emballage', '') = 'true' then continue; end if;
    navnet := lower(btrim(coalesce(linje ->> 'navn', '')));
    if navnet = '' then continue; end if;

    v_ok := null;
    v_grund := null;
    for k in
      select distinct kat.id
        from public.menu_varer v
        join public.menu_kategorier kat on kat.id = v.kategori_id
       where lower(btrim(v.navn)) = navnet
         and (kat.lokation_id is null or kat.lokation_id = new.lokation_id)
         and v.aktiv and kat.aktiv
    loop
      e := coalesce(v_i -> 'kategori_tider' -> (k.id::text), '{}'::jsonb);
      v_fra   := public.mosede_klokken(e -> 'fra');
      v_tilkl := public.mosede_klokken(e -> 'til');
      if v_fra is not null and v_tid is not null and v_tid < v_fra then
        v_grund := coalesce(v_grund, 'bestilling_kategori_tid: ' || (linje ->> 'navn')
                   || ' (fra ' || to_char(v_fra, 'HH24:MI') || ')');
      elsif v_tilkl is not null and v_tid is not null and v_tid > v_tilkl then
        v_grund := coalesce(v_grund, 'bestilling_kategori_tid: ' || (linje ->> 'navn')
                   || ' (til ' || to_char(v_tilkl, 'HH24:MI') || ')');
      elsif v_til is not null then
        v_var := public.mosede_tal(e -> 'varsel_min');
        if v_var is null or v_var < 0 then v_var := v_fald; end if;
        if v_til < round(v_var) - MARGEN then
          v_grund := coalesce(v_grund, 'bestilling_for_kort_varsel: ' || (linje ->> 'navn')
                     || ' (' || round(v_var) || ' min)');
        else
          v_ok := true;
        end if;
      else
        v_ok := true;
      end if;
    end loop;

    /* Ingen kategori: dagens ret — eller et navn, der ikke står på
       kortet (det fanges i C). Kanalens varsel gælder. */
    if v_ok is null and v_grund is null and v_til is not null
       and v_til < v_fald - MARGEN then
      v_grund := 'bestilling_for_kort_varsel: ' || (linje ->> 'navn')
                 || ' (' || round(v_fald) || ' min)';
    end if;

    if v_ok is null and v_grund is not null then
      raise exception '%', v_grund;
    end if;
  end loop;

  -- C) NAVNET OG PRISEN ER MENUKORTETS.
  --    Et tillæg (emballage: true) skal være emballagen eller fragten,
  --    med ejerens tal. Alt andet skal stå på kortet eller være dagens
  --    ret, og prisen skal være den, der står der.
  v_emb := lower(btrim(coalesce(nullif(btrim(v_i ->> 'emballage_navn'), ''), 'Emballage')));

  for linje in select * from jsonb_array_elements(coalesce(new.linjer, '[]'::jsonb))
  loop
    navnet := lower(btrim(coalesce(linje ->> 'navn', '')));
    if navnet = '' then continue; end if;
    v_pris := case when jsonb_typeof(linje -> 'pris') = 'number'
                   then (linje ->> 'pris')::numeric end;

    if coalesce(linje ->> 'emballage', '') = 'true' then
      if navnet = v_emb and coalesce(new.hvordan, '') <> 'spis_her' then
        v_tal := public.mosede_tal(v_i -> 'emballage_pris');
      elsif navnet = 'levering' and new.hvordan = 'levering' then
        v_tal := public.mosede_tal(v_i -> 'leverings_gebyr');
      else
        raise exception 'bestilling_tillaeg_forkert: %', coalesce(linje ->> 'navn', '');
      end if;
      if v_tal is not null and v_tal > 0 and v_pris is distinct from v_tal then
        raise exception 'bestilling_pris_aendret: %', coalesce(linje ->> 'navn', '');
      end if;
      continue;
    end if;

    -- Kortet: kendt = findes (i hvilken som helst tilstand — udsolgt og
    -- slukket siger udsolgt-værnet selv); prisen = de rækker, der KAN
    -- bestilles og har en.
    --
    -- ⚠️ OG VALGETS TILLÆG SKAL MED  (20/9). Opslaget er på navnet
    --    alene, så en "Softice, stor · Glutenfri vaffel" til 48 ville
    --    blive målt mod varens 45 og afvist som prisfusk — netop den
    --    linje, det trykte kort lover. mosede_valg_tillaeg svarer 0
    --    for alle andre valg og for varer uden valg, så resten af
    --    kortet måles nøjagtigt som før.
    select array_agg(v.pris
             + public.mosede_valg_tillaeg(to_jsonb(v) -> 'valg', linje ->> 'variant'))
             filter (where v.aktiv and kat.aktiv and not v.udsolgt
                                       and v.pris is not null),
           count(*) > 0
      into v_priser, v_kendt
      from public.menu_varer v
      join public.menu_kategorier kat on kat.id = v.kategori_id
     where lower(btrim(v.navn)) = navnet
       and (kat.lokation_id is null or kat.lokation_id = new.lokation_id);

    -- Dagens ret: tabellen for hentedagen …
    select coalesce(v_priser, '{}'::numeric[])
             || coalesce(array_agg(r.pris) filter (where r.pris is not null), '{}'::numeric[]),
           v_kendt or count(*) > 0
      into v_priser, v_kendt
      from public.dagens_retter r
     where r.lokation_id = new.lokation_id
       and r.dato = new.hent_dato
       and lower(btrim(r.navn)) = navnet;

    -- … og den gamle enkeltindstilling, som Butik.dagensRetter falder
    -- tilbage på, når tabellen er tom.
    if lower(btrim(coalesce(v_i -> 'dagens_ret' ->> 'navn', ''))) = navnet then
      v_kendt := true;
      v_tal := public.mosede_tal(v_i -> 'dagens_ret' -> 'pris');
      if v_tal is not null then v_priser := v_priser || v_tal; end if;
    end if;

    if not v_kendt then
      raise exception 'bestilling_ukendt_vare: %', coalesce(linje ->> 'navn', '');
    end if;

    if coalesce(array_length(v_priser, 1), 0) > 0
       and (v_pris is null or not (v_pris = any (v_priser))) then
      raise exception 'bestilling_pris_aendret: %', coalesce(linje ->> 'navn', '');
    end if;

    /* VALGET (vare-valg.sql, 15/9). Har varen valg, skal linjen bære
       et af dem — ellers står køkkenet med "Pitabrød" og gætter.
       ⚠️ to_jsonb(v) og ikke v.valg: funktionen skal kunne køres, FØR
       kolonnen findes (så svarer den null, og intet ændrer sig).
       ⚠️ bool_and: står navnet i to kategorier, og har kun den ene
       valg, afvises intet — databasen må ikke være strengere end siden. */
    /* ⚠️ jsonb_array_elements, IKKE _text  (20/9). Et valg kan nu være
       et objekt ({"navn": "Glutenfri vaffel", "tillaeg": 3}), og
       _text ville give hele JSON-teksten som "navn". Så ville intet
       valg nogensinde matche, og HVER eneste isbestilling fra en
       gæst ville blive afvist med bestilling_mangler_valg.
       mosede_valg_navn læser begge former. */
    select coalesce(bool_and(jsonb_typeof(to_jsonb(v) -> 'valg') = 'array'), false),
           coalesce(bool_or(exists (
             select 1 from jsonb_array_elements(
               case when jsonb_typeof(to_jsonb(v) -> 'valg') = 'array'
                    then to_jsonb(v) -> 'valg' else '[]'::jsonb end) x
              where lower(public.mosede_valg_navn(x))
                    = lower(btrim(coalesce(linje ->> 'variant', ''))))), false)
      into v_alle_valg, v_valg_ok
      from public.menu_varer v
      join public.menu_kategorier kat on kat.id = v.kategori_id
     where lower(btrim(v.navn)) = navnet
       and (kat.lokation_id is null or kat.lokation_id = new.lokation_id)
       and v.aktiv and kat.aktiv;
    if v_alle_valg and not v_valg_ok then
      raise exception 'bestilling_mangler_valg: %', coalesce(linje ->> 'navn', '');
    end if;
  end loop;

  return new;
end $function$;


-- ------------------------------------------------------------
--  4) KANAL-VÆRNET — nyeste udgave fra kanal-vaern.sql.
--     Ændret: kun døren. Udløseren bestilling_kanal_vaern står.
-- ------------------------------------------------------------
create or replace function public.mosede_kanal_vaern()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_i      jsonb;
  v_aabne  int[];
  linje    jsonb;
  navnet   text;
  v_ok     boolean;
  v_dagens boolean;
begin
  /* ⚠️ KUN GÆSTEN — og gæsten er alle uden for personalet (26/9).
     Personalet opretter selv bestillinger i admin, og en SQL-fil har
     ingen claims. Samme dør som gæstens regler: mosede_er_gaest. */
  if not public.mosede_er_gaest(new.lokation_id) then
    return new;
  end if;

  select coalesce(jsonb_object_agg(i.noegle, i.vaerdi), '{}'::jsonb) into v_i
    from public.indstillinger i
   where i.lokation_id = new.lokation_id;

  /* Alle fire lister lagt sammen: den gamle (bestilbare_kategorier)
     og de tre fra 14/9. En liste, der ikke findes, er ikke en tom
     liste — den betyder "som i går" — og derfor er navne-reglen
     nedenfor med. */
  select coalesce(array_agg(distinct x.v::int), '{}'::int[]) into v_aabne
    from (
      select jsonb_array_elements_text(
               coalesce(v_i -> 'bestilbare_kategorier', '[]'::jsonb)) as v
      union all
      select jsonb_array_elements_text(
               coalesce(v_i -> 'bestilbare_kategorier_forside', '[]'::jsonb))
      union all
      select jsonb_array_elements_text(
               coalesce(v_i -> 'bestilbare_kategorier_bord', '[]'::jsonb))
      union all
      select jsonb_array_elements_text(
               coalesce(v_i -> 'bestilbare_kategorier_smoer', '[]'::jsonb))
    ) x
   where x.v ~ '^[0-9]+$';

  for linje in select * from jsonb_array_elements(coalesce(new.linjer, '[]'::jsonb))
  loop
    navnet := lower(btrim(coalesce(linje ->> 'navn', '')));
    -- Emballagen og fragten er tillæg, ikke varer på kortet.
    if navnet = '' or coalesce(linje ->> 'emballage', '') = 'true' then
      continue;
    end if;

    select count(*) > 0 into v_dagens
      from public.dagens_retter r
     where r.lokation_id = new.lokation_id
       and r.dato = new.hent_dato
       and lower(btrim(r.navn)) = navnet;
    if v_dagens
       or lower(btrim(coalesce(v_i -> 'dagens_ret' ->> 'navn', ''))) = navnet then
      continue;
    end if;

    /* ⚠️ TAPASFADET HAR SIN EGEN SIDE, OG DEN STÅR PÅ INGEN LISTE.
       MÅLT i produktionen 16/9, FØR værnet blev lagt ud: kategorien
       "Tapasfad" (id 26) er ikke på et eneste flueben — m-tapas.html
       sælger hele fadets kategori direkte (fadet og "Kage" som
       tilkøb, js/skal/tapas.js). Uden linjen her ville værnet afvise
       en ægte bestilling fra en side, der virker. Samme slags
       undtagelse som smørrebrødet: kendt på NAVNET, fordi det er
       sådan, siden selv finder fadet. */
    select bool_or(kat.aktiv and v.aktiv
                   and (kat.id = any (v_aabne)
                        or lower(coalesce(kat.navn, '')) ~ '(smørrebrød|håndmad|fyld|tapas)'))
      into v_ok
      from public.menu_varer v
      join public.menu_kategorier kat on kat.id = v.kategori_id
     where lower(btrim(v.navn)) = navnet
       and (kat.lokation_id is null or kat.lokation_id = new.lokation_id);

    -- null = varen findes ikke; det svarer gæstens regler på.
    if v_ok is not null and not v_ok then
      raise exception 'bestilling_kategori_lukket: %', coalesce(linje ->> 'navn', '');
    end if;
  end loop;

  return new;
end $function$;


-- ------------------------------------------------------------
--  5) LEVERINGEN — nyeste udgave fra levering-valideret.sql.
--     Ændret: kun døren. Udløseren bestilling_levering_valideret
--     står.
-- ------------------------------------------------------------
create or replace function public.mosede_levering_valideret()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v   public.leverings_valideringer%rowtype;
  v_zone text;
begin
  /* Ikke en levering: tokenet må ikke blive hængende. Et token på en
     afhentning ville se ud som en oplysning, der betyder noget. */
  if coalesce(new.hvordan, '') <> 'levering' then
    new.leverings_token := null;
    return new;
  end if;

  -- Personalet og SQL dømmes ikke. Alle andre er gæster (26/9) —
  -- også en bruger, der har oprettet sig selv. Se mosede_er_gaest.
  if not public.mosede_er_gaest(new.lokation_id) then
    return new;
  end if;

  if new.leverings_token is null or btrim(new.leverings_token) = '' then
    raise exception 'levering_ikke_valideret';
  end if;

  /* for update: to bestillinger med samme token i samme sekund skal
     stå i kø, ikke begge slippe igennem. Samme greb som husets fem
     andre lofter. */
  select * into v
    from public.leverings_valideringer
   where token = new.leverings_token
   for update;

  if not found then
    raise exception 'levering_ikke_valideret';
  end if;
  if v.lokation_id is distinct from new.lokation_id then
    raise exception 'levering_ikke_valideret';
  end if;
  if v.brugt_af is not null then
    raise exception 'levering_validering_brugt';
  end if;
  if v.udloeber < now() then
    raise exception 'levering_validering_udloebet';
  end if;

  /* ⚠️ ZONEN REGNES IGEN. Kvitteringens `zone` er fra dengang, den
     blev udstedt; grænsen kan være flyttet siden. */
  v_zone := public.mosede_leveringszone(v.lng, v.lat, new.lokation_id);
  if v_zone <> 'ja' then
    raise exception 'levering_uden_for_omraadet';
  end if;

  /* ⚠️ SERVERENS ADRESSE VINDER. Alt, gæsten skrev i feltet, ryger
     på gulvet her. Det er den linje, der gør manipulation
     ligegyldig. */
  new.leverings_adresse := v.adresse;

  update public.leverings_valideringer
     set brugt_af = new.id
   where token = v.token;

  return new;
end
$function$;


-- ------------------------------------------------------------
--  6) BORDET — nyeste udgave fra bord-plads.sql.
--     Ændret: kun døren, og den vender den anden vej: her er det
--     GÆSTEN, der afvises. Udløseren bordbestilling_plads står.
-- ------------------------------------------------------------
create or replace function public.mosede_bord_plads_vaern()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_ophold  numeric;
  v_bord    record;
  v_optaget record;
begin
  -- Ingen tildeling: intet at dømme. Det er også vejen til at
  -- FJERNE et bord igen.
  if new.bord_id is null then
    return new;
  end if;

  /* ⚠️ GÆSTEN SÆTTER ALDRIG BORDET. Feltet er personalets, og
     bord/ sender det ikke. En gæst, der prøver, får nej — ellers
     kunne enhver med anon-nøglen tage det samme bord hver lørdag.
     ⚠️ Og gæsten er alle uden for personalet (26/9): her stod "kun
     rollen anon", så en bruger, der havde oprettet sig selv, kunne. */
  if public.mosede_er_gaest(new.lokation_id) then
    raise exception 'bord_plads_kun_personale';
  end if;

  /* Bordet skal findes, være aktivt og høre til den samme
     forretning. Et slukket bord er et bord, der ikke står der. */
  select b.id, b.nummer, b.aktiv into v_bord
    from public.borde b
   where b.id = new.bord_id
     and b.lokation_id = new.lokation_id;

  if v_bord.id is null then
    raise exception 'bord_plads_ukendt_bord';
  end if;
  if not v_bord.aktiv then
    raise exception 'bord_plads_bordet_er_slukket: %', v_bord.nummer;
  end if;

  /* ⚠️ I KØ, IKKE SIDE OM SIDE. To medarbejdere, der tildeler det
     samme bord i samme sekund, ser begge det gamle billede
     (READ COMMITTED) — og begge kommer igennem. Låsen er bordets
     egen række, så nummer to tæller efter, at nummer ét er inde.
     Samme greb som de fem lofter fra 15/9. */
  perform pg_advisory_xact_lock(hashtext('bord_plads:' || new.lokation_id
    || ':' || new.dato::text || ':' || new.bord_id::text));

  v_ophold := coalesce((select (i.vaerdi #>> '{}')::numeric
                          from public.indstillinger i
                         where i.lokation_id = new.lokation_id
                           and i.noegle = 'bord_ophold_min'), 120);
  if v_ophold is null or v_ophold <= 0 then v_ophold := 120; end if;

  /* Er bordet lovet væk inden for opholdet? Afviste, udeblevne og
     slettede tæller ikke: de sidder der ikke. */
  select bb.navn, bb.tid into v_optaget
    from public.bordbestillinger bb
   where bb.lokation_id = new.lokation_id
     and bb.dato = new.dato
     and bb.bord_id = new.bord_id
     and bb.id is distinct from new.id
     and bb.slettet is null
     and bb.status not in ('afvist', 'udeblevet')
     and abs(extract(epoch from (bb.tid - new.tid)) / 60) < v_ophold
   limit 1;

  if v_optaget.navn is not null then
    raise exception 'bord_plads_optaget: bord % er lovet til % kl. %',
      v_bord.nummer, v_optaget.navn, to_char(v_optaget.tid, 'HH24:MI');
  end if;

  return new;
end $function$;


commit;

-- ------------------------------------------------------------
--  RAPPORT — LANDEDE DET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar. Hver
--  linje skal sige true. Står der false, er filen ikke kørt helt,
--  eller en ældre fil er kørt bagefter og har skrevet den gamle
--  dør tilbage.
-- ------------------------------------------------------------
select '1. oprettet er serverens på alle fem gæstetabeller' as tjek,
       (select count(*) = 5 from pg_trigger t
         where t.tgname = 'aa_oprettet_er_serverens' and not t.tgisinternal
           and t.tgrelid in ('public.bestillinger'::regclass, 'public.bordbestillinger'::regclass,
                             'public.forespoergsler'::regclass, 'public.udlejninger'::regclass,
                             'public.reservationer'::regclass)) as ok
union all
select '2. Gæstens regler gælder alle uden for personalet (fire værn)',
       (select count(*) = 4 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname in ('mosede_gaestens_regler', 'mosede_kanal_vaern',
                             'mosede_levering_valideret', 'mosede_bord_plads_vaern')
           and p.prosrc like '%public.mosede_er_gaest(new.lokation_id)%'
           and p.prosrc not like '%''role'', '''') <> ''anon''%'
           and p.prosrc not like '%''role'', '''') = ''anon''%')
union all
select '2b. Personalet kendes på is_admin_for, som kræver aktiv',
       pg_get_functiondef('public.is_admin_for(text)'::regprocedure) like '%aktiv%'
union all
select '3. Linjens antal er et helt tal fra 1 til 500, og antal er summen',
       coalesce(pg_get_functiondef(to_regproc('public.mosede_gaestens_regler'))
                like '%bestilling_antal_ok%', false)
union all
select '4. En gæsts bordordre er dateret i dag, dansk tid',
       coalesce(pg_get_functiondef(to_regproc('public.mosede_gaestens_regler'))
                like '%bestilling_bord_ikke_i_dag%', false);

-- ⚠️ SLUT PÅ FILEN — det her er linje 840.
