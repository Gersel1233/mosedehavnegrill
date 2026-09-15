-- ============================================================
--  GÆSTENS REGLER I DATABASEN — OG INGEN KAPLØB  (15. sep 2026)
--  ------------------------------------------------------------
--  Kundens ord: "vi skal lave det mest dygtige og fejlfri system,
--  ikke nok med at det ser godt ud." Gennemgangen blev MÅLT i
--  produktionen (definitionerne læst ud af databasen), ikke læst i
--  repoet — og den fandt fem huller, der alle har samme form:
--  reglen står i browseren, men databasen tager imod det modsatte.
--
--  1) QR-SPÆRREN LÆSTE DEN FORKERTE NØGLE — SIDEN 13/9.
--     aabent-og-antal-vaern.sql skrev mosede_dag_aaben om og tog
--     'qr_aaben' med. Admin skriver 'bordbestilling_aaben'
--     (js/admin/koekken.js), og dagsbesked-og-qr.sql advarede ORDRET
--     mod netop det. Altså: "Tag ikke imod fra bordene" slået fra i
--     admin, og databasen tog imod alligevel. proev-dagsbesked-og-qr
--     har kunnet se det hele tiden (3 af 11 fejlede lokalt) — den
--     blev bare ikke kørt, fordi 13/9-filen kun blev prøvet i
--     produktionen.
--
--  2) VARSLET, EN TID DER ER GÅET, KATEGORIENS VINDUE, SIDSTE
--     BESTILLING, MINDSTEANTALLET, LEVERING SLÅET FRA — og at en pris
--     er MENUKORTETS. Ingen af dem stod i databasen. En gæst med en
--     gammel fane — eller en konsol — kunne bestille smørrebrød til om
--     ti minutter, en burger til i går, levering, når levering er
--     slukket, og en burger til 1 kr.
--
--  3) FEM LOFTER TALTE SIDE OM SIDE. Pladserne til et arrangement,
--     bordene pr. dag, lugens loft pr. tid, bordenes kvarter og
--     forespørgslens dobbelttryk tæller rækker og siger nej ved
--     loftet — men to gæster, der trykker i samme sekund, ser begge
--     det gamle tal (READ COMMITTED), og begge kommer igennem. Det er
--     ikke et sjældent tilfælde: det er dét, der sker, når et link
--     lige er delt. Nu står de i kø (pg_advisory_xact_lock / for
--     update), og nummer to tæller efter, at nummer ét er inde.
--
--  4) BAGLOKALET KUNNE LOVES VÆK TO GANGE, NÅR STATUS SKIFTEDE.
--     mosede_dagen_er_optaget kørte KUN ved indsættelse. En bekræftet
--     udlejning den 12. og en forespørgsel fra en ANDEN gæst sat til
--     aftalt den 12. gik begge igennem — de to tabeller har hver sit
--     unikke indeks og ser ikke hinanden.
--     ⚠️ OG "🔒 LÅS DAGEN" VIRKEDE IKKE: bookKnap opretter
--     udlejningen, MENS forespørgslen allerede står som aftalt — og
--     den aftalte forespørgsel optager selv dagen, så indsættelsen
--     blev afvist med "dagen er optaget". Nu kendes parret: samme
--     gæst (nummer eller mail) ved indsættelsen, og forespørgslens
--     reference i udlejningens intern_note ved bekræftelsen — den
--     samme lænke, admin allerede kender dem på (harUdlejning i
--     js/admin/kalender.js).
--
--  5) EN DAGENS RET, DER ER MELDT UDSOLGT I HÅNDEN — uden et antal —
--     kunne stadig bestilles. Værnet sprang rækker uden antal over.
--
--  ⚠️ GÆSTENS REGLER GÆLDER GÆSTEN — IKKE PERSONALET OG IKKE SQL.
--     De nye regler i punkt 2 slår kun til, når kaldet kommer med
--     anon-nøglen (auth.jwt() ->> 'role' = 'anon'): det er den, hver
--     gæsteside og hver konsol bruger. Personalet må gerne tage en
--     bestilling i telefonen til om ti minutter, og en SQL-fil (demo,
--     prøverne) skal ikke dømmes af et varsel. Rolle-claimet er
--     signeret af Supabase og kan ikke skrives af gæsten.
--
--  ⚠️ DATABASEN MÅ ALDRIG VÆRE STRENGERE END SIDEN. Hver regel er
--     skrevet efter js/bestil-regler.js og er, hvor der er tvivl, den
--     MILDESTE af de to: en rigtig bestilling, der bliver afvist ved
--     send, er værre end en, der slipper igennem. Derfor:
--       · 15 minutters margen på varslet — gæsten valgte tiden, da
--         siden blev tegnet, og hun kan bruge et kvarter på at skrive
--       · en vare, der står i TO kategorier, er i orden, hvis bare én
--         af dem tillader tiden
--       · en pris er i orden, hvis den er prisen på bare én af de
--         rækker, der bærer navnet
--       · bordet har intet varsel og ingen sidste bestilling — dér er
--         tiden klokken nu (samme undtagelse som kategoriPaaTid)
--
--  ⚠️ TO UDGAVER AF DEN SAMME REGEL SKRIDER FRA HINANDEN — og det er
--     prisen for, at databasen kan sige nej. Ændres en regel i
--     js/bestil-regler.js (varsel, sidste bestilling, mindsteantal),
--     SKAL mosede_gaestens_regler følge med. proev-gaestens-regler.sql
--     prøver hver regel med et modstykke, der SKAL gå igennem.
--
--  Kan køres igen. Prøven er proev-gaestens-regler.sql.
-- ============================================================
begin;

-- ------------------------------------------------------------
--  0) TO SMÅ OVERSÆTTERE: et tal og et klokkeslæt i indstillingerne,
--     læst som JavaScript læser dem. Værdierne er jsonb og kan være
--     et tal (30), en tekst ("30") eller tom (""), alt efter hvilken
--     fane der skrev dem.
-- ------------------------------------------------------------
create or replace function public.mosede_tal(v jsonb)
 returns numeric
 language sql
 immutable
 set search_path to ''
as $function$
  select case jsonb_typeof(v)
    when 'number' then (v #>> '{}')::numeric
    when 'string' then
      case when btrim(v #>> '{}') ~ '^-?[0-9]+([.,][0-9]+)?$'
           then replace(btrim(v #>> '{}'), ',', '.')::numeric end
  end
$function$;

create or replace function public.mosede_klokken(v jsonb)
 returns time
 language sql
 immutable
 set search_path to ''
as $function$
  select case when jsonb_typeof(v) = 'string'
               and btrim(v #>> '{}') ~ '^[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?$'
              then btrim(v #>> '{}')::time end
$function$;

revoke execute on function public.mosede_tal(jsonb)     from public, anon, authenticated;
revoke execute on function public.mosede_klokken(jsonb) from public, anon, authenticated;

/* ⚠️ EN STANDARDVÆRDI, DER BRYDER SIT EGET CHECK (fundet 15/9).
   Produktionens menu_kategorier.afdeling havde standarden 'grill' —
   fra før afdelingerne blev mad/is/drikke — mens afdeling_gyldig kun
   tager de tre. setup.sql siger 'mad'. Admin sender altid afdelingen
   (store-skriv.js oversætter 'grill'), så ingen fane er ramt; men en
   kategori oprettet uden den blev afvist, og det var præcis dér, den
   første prøvekørsel i produktionen døde. */
alter table public.menu_kategorier alter column afdeling set default 'mad';

-- ------------------------------------------------------------
--  1) QR-SPÆRREN: ét ord. Resten af kroppen er den, der kører
--     (aabent-og-antal-vaern.sql), urørt.
-- ------------------------------------------------------------
create or replace function public.mosede_dag_aaben()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_dato    date;
  v_tid     time;
  v_lukker  time;
  v_saeson  jsonb;
  v_qr      jsonb;
  v_spis_her boolean;
  v_regel   public.dags_regler%rowtype;
  v_aab     record;
begin
  if tg_table_name = 'bestillinger' then
    v_dato := new.hent_dato;
    v_tid  := new.hent_tid;
    /* ⚠️ BORDENE ER DÆKKET AF hvordan, fordi skemaet binder de to
       sammen (bestilling_bord_hvordan_ok). Se den lange note i
       dagsregler.sql om det døde led, der blev fjernet igen. */
    v_spis_her := (new.hvordan = 'spis_her');

    -- QR-spærren: KUN rækker med et bordnummer.
    /* ⚠️ NØGLEN HEDDER bordbestilling_aaben (15/9). Den hed
       'qr_aaben' her fra 13/9 — et navn, ingen fane skriver — og så
       stod kontakten på Køkken-kø slået fra, mens databasen tog imod.
       Samme advarsel står i dagsbesked-og-qr.sql. */
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

  -- 1b) ÅBNINGSTIDERNE (13/9). En lukket ugedag, og et klokkeslæt uden
  --     for dagens tid. Ingen række = ingen regel (se aabent-og-antal-vaern.sql).
  select a.lukket, a.aabner, a.lukker into v_aab
    from public.aabningstider a
   where a.lokation_id = new.lokation_id
     and a.ugedag = extract(isodow from v_dato)::int - 1;
  if found then
    if v_aab.lukket then
      raise exception 'bestilling_lukket_dag';
    end if;
    if v_tid is not null and v_aab.aabner is not null and v_aab.lukker is not null
       and (v_tid < v_aab.aabner or v_tid > v_aab.lukker) then
      raise exception 'bestilling_uden_for_aabningstid';
    end if;
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
end $function$;

-- ------------------------------------------------------------
--  2) GÆSTENS REGLER — spejlet af js/bestil-regler.js.
--     Udløseren hedder bestilling_gaestens_regler og kører EFTER
--     bestilling_dag_aaben (BEFORE-udløsere kører i navnets
--     rækkefølge), så en lukket dag stadig siger "lukket" og ikke
--     "for kort varsel".
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
  e         jsonb;
  k         record;
begin
  /* ⚠️ KUN GÆSTEN. Personalet (authenticated) og en SQL-fil (ingen
     claims) dømmes ikke af et varsel — se hovedet. */
  if coalesce(auth.jwt() ->> 'role', '') <> 'anon' then
    return new;
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
    select array_agg(v.pris) filter (where v.aktiv and kat.aktiv and not v.udsolgt
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
  end loop;

  return new;
end $function$;

drop trigger if exists bestilling_gaestens_regler on public.bestillinger;
create trigger bestilling_gaestens_regler
  before insert on public.bestillinger
  for each row execute function public.mosede_gaestens_regler();

-- ------------------------------------------------------------
--  5) DAGENS RET, MELDT UDSOLGT I HÅNDEN. Rækken låses stadig, så
--     loftet ikke kan overtrædes af to på én gang (13/9).
-- ------------------------------------------------------------
create or replace function public.mosede_dagens_ret_vaern()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
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

    /* ⚠️ UDSOLGT ER UDSOLGT, OGSÅ UDEN ET ANTAL (15/9). Personalet
       melder dagens ret udsolgt med et flueben; rækken har intet
       antal, og løkken nedenfor sprang den over. */
    if exists (select 1 from public.dagens_retter r
                where r.lokation_id = new.lokation_id
                  and r.dato = new.hent_dato
                  and lower(btrim(r.navn)) = navnet
                  and r.udsolgt) then
      raise exception 'bestilling_udsolgt_vare: %', coalesce(linje ->> 'navn', '');
    end if;

    select r.antal_tilbage into rest
      from public.dagens_retter r
     where r.lokation_id = new.lokation_id
       and r.dato = new.hent_dato
       and r.antal_tilbage is not null
       and lower(btrim(r.navn)) = navnet
     for update;

    if found and stk > rest then
      raise exception 'bestilling_for_faa_tilbage: % (% tilbage)',
        coalesce(linje ->> 'navn', ''), rest;
    end if;
  end loop;

  return new;
end $function$;

-- ------------------------------------------------------------
--  3) LOFTERNE STÅR I KØ.
--     ⚠️ LÅSEN TAGES FØR TÆLLINGEN. I READ COMMITTED får hver sætning
--     i en funktion sit eget øjebliksbillede, så tællingen efter låsen
--     ser den række, den første gæst lige har committet. Låsen slippes
--     ved commit. Nøglen er loftets egen (dag, tid, forretning) — to
--     forskellige dage venter ikke på hinanden.
-- ------------------------------------------------------------

-- 3a) Pladserne til et arrangement: selve arrangementets række låses.
create or replace function public.reservation_bremse()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  arr        public.kalender%rowtype;
  optaget    int;
  fra_nummer int;
  paa_stedet int;
begin
  /* ⚠️ FOR UPDATE (15/9): to gæster på den sidste plads i samme
     sekund talte begge "38 af 40" og kom begge ind. Nu venter nummer
     to på, at nummer ét er committet, og tæller så 42. */
  select * into arr from public.kalender k where k.id = new.kalender_id for update;

  /* Findes arrangementet ikke, eller er det ikke offentligt, er
     der ikke noget at melde sig til. Et internt arrangement er
     personalets egen note — "Bent har ferie" — og en tilmelding
     til DEN ville være en fremmed, der har gættet et id. */
  if arr.id is null or not arr.offentlig then
    raise exception 'reservation_findes_ikke';
  end if;

  if not arr.tilmelding then
    raise exception 'reservation_lukket';
  end if;

  /* Overstået. Datoen er arrangementets, ikke dagens: en koncert
     i går kan ingen melde sig til, og en formular, der er åben i
     en gammel fane, må ikke kunne. */
  if coalesce(arr.slut_dato, arr.dato) < current_date then
    raise exception 'reservation_overstaaet';
  end if;

  /* ⚠️ PLADSERNE TÆLLES HER, IKKE I BROWSEREN. Kun det, der ikke er
     afvist eller slettet, tæller: et afslag skal frigive pladsen
     igen. Udeblevne tæller MED. */
  if arr.pladser is not null then
    select coalesce(sum(r.antal_personer), 0) into optaget
      from public.reservationer r
     where r.kalender_id = new.kalender_id
       and r.slettet is null
       and r.status <> 'afvist';

    if optaget + new.antal_personer > arr.pladser then
      raise exception 'reservation_udsolgt';
    end if;
  end if;

  /* Hvad en browser kan gøre én gang, kan et script gøre ti
     tusind gange. */
  select count(*) into fra_nummer
    from public.reservationer r
   where r.telefon = new.telefon
     and r.oprettet > now() - interval '24 hours';
  if fra_nummer >= 5 then
    raise exception 'reservation_bremse_nummer';
  end if;

  select count(*) into paa_stedet
    from public.reservationer r
   where r.lokation_id = new.lokation_id
     and r.oprettet > now() - interval '1 hour';
  if paa_stedet >= 60 then
    raise exception 'reservation_bremse_travlt';
  end if;

  return new;
end $function$;

-- 3b) Bordene pr. dag.
create or replace function public.bord_loft_vaern()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_loft  int;
  v_taget int;
begin
  v_loft := public.mosede_bord_loft(new.lokation_id, new.dato);

  /* Ingen borde oprettet endnu, og intet loft sat: så er der
     ikke noget at spærre med, og bookingen går igennem som før
     filen blev kørt. Se noten i mosede_bord_loft. */
  if v_loft is null then return new; end if;

  -- ⚠️ I KØ (15/9) — se afsnittets hoved.
  perform pg_advisory_xact_lock(hashtext('mosede-bordloft:' || new.lokation_id || ':' || new.dato));

  select count(*) into v_taget
    from public.bordbestillinger b
   where b.lokation_id = new.lokation_id
     and b.dato = new.dato
     and b.slettet is null
     and b.status <> 'afvist';

  if v_taget >= v_loft then
    raise exception 'Der er ikke flere borde den dag. Prøv en anden dag, '
      'eller ring til os — vi kan nogle gange finde plads alligevel.'
      using errcode = 'check_violation';
  end if;

  return new;
end $function$;

-- 3c) Lugens loft pr. hentetid.
create or replace function public.mosede_luge_loft()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_loft int;
  v_taget int;
begin
  -- Bordet har ingen hentetid at fylde op; se noten i luge-loft.sql.
  if new.bord_nummer is not null then return new; end if;

  select nullif(btrim(i.vaerdi #>> '{}'), '')::int into v_loft
    from public.indstillinger i
   where i.lokation_id = new.lokation_id
     and i.noegle = 'luge_loft_pr_tid';

  if v_loft is null or v_loft <= 0 then return new; end if;

  -- ⚠️ I KØ (15/9) — se afsnittets hoved.
  perform pg_advisory_xact_lock(hashtext('mosede-luge:' || new.lokation_id || ':'
                                         || new.hent_dato || ':' || new.hent_tid));

  select count(*) into v_taget
    from public.bestillinger b
   where b.lokation_id = new.lokation_id
     and b.bord_nummer is null
     and b.slettet is null
     and b.status <> 'afvist'
     and b.hent_dato = new.hent_dato
     and b.hent_tid = new.hent_tid;

  if v_taget >= v_loft then
    /* ⚠️ BESKEDEN SIGER TIDEN. js/store.js oversætter ordet. */
    raise exception 'bestilling_luge_fuldt: %', to_char(new.hent_tid, 'HH24:MI');
  end if;

  return new;
end $function$;

-- 3d) Bordenes loft pr. kvarter (QR).
create or replace function public.mosede_bord_loft()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_loft int;
begin
  if new.bord_nummer is null then return new; end if;

  select nullif(btrim(i.vaerdi #>> '{}'), '')::int into v_loft
    from public.indstillinger i
   where i.lokation_id = new.lokation_id
     and i.noegle = 'bord_loft_pr_kvarter';

  -- Ikke sat, nul eller negativ: intet loft. En indstilling,
  -- ingen har rørt, må ikke kunne lukke for noget.
  if v_loft is null or v_loft <= 0 then return new; end if;

  -- ⚠️ I KØ (15/9) — se afsnittets hoved.
  perform pg_advisory_xact_lock(hashtext('mosede-bordkvarter:' || new.lokation_id));

  if (select count(*) from public.bestillinger b
       where b.lokation_id = new.lokation_id
         and b.bord_nummer is not null
         and b.slettet is null
         and b.oprettet > now() - interval '15 minutes') >= v_loft then
    raise exception 'bestilling_bord_loft';
  end if;

  return new;
end $function$;

-- 3e) Forespørgslens dobbelttryk. Et dobbelttryk ER to samtidige kald.
create or replace function public.forespoergsel_bremse()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  lige_nu      int;
  fra_nummeret int;
  paa_stedet   int;
begin
  /* ⚠️ I KØ (15/9). Et dobbelttryk er ikke to kald efter hinanden —
     det er to kald i SAMME sekund, og uden låsen så begge nul
     forespørgsler og kom begge ind. Nøglen er gæsten: nummeret, ellers
     mailen (15/9: en gæst med kun mail kunne dobbelttrykke frit). */
  perform pg_advisory_xact_lock(hashtext('mosede-foresp:'
    || coalesce(nullif(btrim(new.telefon), ''), lower(btrim(new.email)), '')));

  /* Dobbelttryk først. Et tidsvindue, og "is not distinct from",
     fordi datoen kan være NULL. Ti minutter rammer dobbelttrykket
     og den utålmodige, men spærrer ikke for at spørge igen næste år. */
  select count(*) into lige_nu
    from public.forespoergsler f
   where (f.telefon = new.telefon
          or (coalesce(btrim(new.telefon), '') = ''
              and lower(btrim(f.email)) = lower(btrim(new.email))))
     and f.type = new.type
     and f.dato is not distinct from new.dato
     and f.slettet is null and f.oprettet > now() - interval '10 minutes';

  if lige_nu >= 1 then
    raise exception 'forespoergsel_dobbelt';
  end if;

  select count(*) into fra_nummeret
    from public.forespoergsler f
   where f.telefon = new.telefon
     and f.slettet is null and f.oprettet > now() - interval '24 hours';

  if fra_nummeret >= 3 then
    raise exception 'forespoergsel_bremse_nummer';
  end if;

  select count(*) into paa_stedet
    from public.forespoergsler f
   where f.lokation_id = new.lokation_id
     and f.slettet is null and f.oprettet > now() - interval '1 hour';

  if paa_stedet >= 20 then
    raise exception 'forespoergsel_bremse_travlt';
  end if;

  return new;
end $function$;

-- ------------------------------------------------------------
--  4) BAGLOKALET: ÉN DAG, ÉT JA — OGSÅ NÅR STATUS SKIFTER.
-- ------------------------------------------------------------

-- 4a) Ved indsættelse, som før — men en udlejning til den SAMME gæst
--     som den aftalte forespørgsel er "Lås dagen", ikke en dobbeltbooking.
create or replace function public.mosede_dagen_er_optaget()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_dato        date;
  v_lokation    text;
  v_optager     boolean;
  v_taget       boolean;
begin
  v_dato     := new.dato;
  v_lokation := new.lokation_id;

  if v_dato is null then
    return new;
  end if;

  /* Optager DEN HER række overhovedet dagen? En catering eller
     et selskab ud af huset rører ikke havnen. Udlejninger optager
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

  -- ⚠️ I KØ (15/9): to kolleger, der siger ja i samme sekund.
  perform pg_advisory_xact_lock(hashtext('mosede-dag:' || v_lokation || ':' || v_dato));

  if tg_table_name = 'udlejninger' then
    /* ⚠️ "🔒 LÅS DAGEN" (15/9). bookKnap opretter udlejningen, mens
       forespørgslen allerede er aftalt — og den aftalte forespørgsel
       optager selv dagen. Samme gæst (de sidste otte cifre, ellers
       mailen) er det samme forløb. Adgangsreglen lader ikke nogen
       sende intern_note med ved oprettelsen, så referencen kan ikke
       bruges her; den bruges ved bekræftelsen (4b). */
    v_taget := exists (
        select 1 from public.udlejninger u
         where u.lokation_id = v_lokation and u.dato = v_dato
           and u.status = 'bekraeftet' and u.slettet is null)
      or exists (
        select 1 from public.forespoergsler f
         where f.lokation_id = v_lokation and f.dato = v_dato
           and public.mosede_optager_dagen(f.type, f.status, f.dato, f.detaljer, f.slettet)
           and not (
             (length(regexp_replace(coalesce(f.telefon, ''), '[^0-9]', '', 'g')) >= 8
              and right(regexp_replace(coalesce(f.telefon, ''), '[^0-9]', '', 'g'), 8)
                = right(regexp_replace(coalesce(new.telefon, ''), '[^0-9]', '', 'g'), 8))
             or (coalesce(btrim(f.email), '') <> ''
                 and lower(btrim(f.email)) = lower(btrim(coalesce(new.email, ''))))));
  else
    v_taget := exists (
      select 1 from public.optagne_dage o
       where o.lokation_id = v_lokation and o.dato = v_dato);
  end if;

  if v_taget then
    /* Navnet står i fejlen, og js/store.js oversætter det. */
    raise exception 'mosede_dagen_er_optaget: %', v_dato
      using errcode = 'check_violation';
  end if;

  return new;
end $function$;

-- 4b) Når status, dato eller skraldespanden gør en række til et ja.
create or replace function public.mosede_dagen_er_optaget_ved_skift()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_nu   boolean;
  v_foer boolean;
begin
  if tg_table_name = 'udlejninger' then
    v_nu   := new.status = 'bekraeftet' and new.slettet is null and new.dato is not null;
    v_foer := old.status = 'bekraeftet' and old.slettet is null;
  else
    v_nu   := coalesce(public.mosede_optager_dagen(new.type, new.status, new.dato,
                                                   new.detaljer, new.slettet), false);
    v_foer := coalesce(public.mosede_optager_dagen(old.type, old.status, old.dato,
                                                   old.detaljer, old.slettet), false);
  end if;

  /* Ikke et ja nu — eller det VAR et ja på den samme dag i forvejen:
     så er der intet nyt at spærre for. */
  if not v_nu or (v_foer and old.dato is not distinct from new.dato) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('mosede-dag:' || new.lokation_id || ':' || new.dato));

  /* Den ANDEN tabel. Inden for samme tabel siger det unikke indeks
     nej. ⚠️ PARRET UNDTAGES: bookKnap skriver forespørgslens reference
     i udlejningens intern_note ("Aftalt i telefonen ud fra FO…"). */
  if tg_table_name = 'udlejninger' then
    if exists (
      select 1 from public.forespoergsler f
       where f.lokation_id = new.lokation_id and f.dato = new.dato
         and public.mosede_optager_dagen(f.type, f.status, f.dato, f.detaljer, f.slettet)
         and position(f.reference in coalesce(new.intern_note, '')) = 0
    ) then
      raise exception 'mosede_dagen_er_optaget: %', new.dato using errcode = 'check_violation';
    end if;
  else
    if exists (
      select 1 from public.udlejninger u
       where u.lokation_id = new.lokation_id and u.dato = new.dato
         and u.status = 'bekraeftet' and u.slettet is null
         and position(new.reference in coalesce(u.intern_note, '')) = 0
    ) then
      raise exception 'mosede_dagen_er_optaget: %', new.dato using errcode = 'check_violation';
    end if;
  end if;

  return new;
end $function$;

drop trigger if exists forespoergsel_dagen_optaget_skift on public.forespoergsler;
create trigger forespoergsel_dagen_optaget_skift
  before update on public.forespoergsler
  for each row execute function public.mosede_dagen_er_optaget_ved_skift();

drop trigger if exists udlejning_dagen_optaget_skift on public.udlejninger;
create trigger udlejning_dagen_optaget_skift
  before update on public.udlejninger
  for each row execute function public.mosede_dagen_er_optaget_ved_skift();

commit;

select 'QR-spærren læser admins kontakt' as tjek,
       (pg_get_functiondef('public.mosede_dag_aaben'::regproc) like '%bordbestilling_aaben%'
        and pg_get_functiondef('public.mosede_dag_aaben'::regproc) not like '%''qr_aaben''%') as ok
union all
select 'Gæstens regler står i databasen',
       exists (select 1 from pg_trigger where tgname = 'bestilling_gaestens_regler'
                 and tgrelid = 'public.bestillinger'::regclass)
union all
select 'Lofterne står i kø',
       (select bool_and(pg_get_functiondef(p.oid) like '%pg_advisory_xact_lock%')
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.prokind = 'f'
           and (p.proname in ('bord_loft_vaern', 'mosede_luge_loft', 'forespoergsel_bremse')
                or (p.proname = 'mosede_bord_loft' and p.pronargs = 0)))
       and pg_get_functiondef('public.reservation_bremse'::regproc) like '%for update%'
union all
select 'Baglokalet: ét ja pr. dag, også ved statusskift',
       (select count(*) = 2 from pg_trigger
         where tgname in ('forespoergsel_dagen_optaget_skift', 'udlejning_dagen_optaget_skift'));
