-- ============================================================
--  LEVERINGENS TID 8/10 — KØKKENET + KØRETUREN
--  ------------------------------------------------------------
--  Mikkels ord 8/10: *"når levering er der, der skal være noget in
--  advance så de kan bestille til xx:xx så caféen kan nå det … nok
--  sådan 30 min … hvis de bor i Karlslunde er det typisk 10-15
--  minutter til kunden får maden, hvis det er Køge kan det godt være
--  30 min, det samme med Tune og 20 min til Greve … det skal give
--  mening"*.
--
--  Gæsten vælger, hvornår maden skal stå ved døren. Den tidligste tid
--  er køkkenets tid + køreturen til adressens postnummer. Siden
--  regner det i js/bestil-regler.js (medKoeretur); den her fil lærer
--  databasen det samme, så en gammel fane ikke kan bestille en
--  levering til Køge om et kvarter.
--
--  1) To indstillinger, sat KUN hvis de ikke findes (ejeren retter dem
--     i admin → Åbningstider → Levering, og en ny kørsel må ikke
--     skrive ejerens tal over):
--       varsel_min_levering  30           — køkkenets tid
--       leverings_koeretid   2690 15      — Karlslunde (det høje tal i
--                                           "10-15", så maden når frem)
--                            2670 20      — Greve
--                            4030 30      — Tune
--                            4600 30      — Køge
--     Ishøj (2635), Solrød Strand (2680) og Lille Skensved (4623) har
--     ikke fået et tal endnu — de får den længste (30), til ejeren
--     skriver deres.
--  2) mosede_gaestens_regler — nyeste udgave fra
--     tilvalg-og-tidsbegraensede-varer-1-10.sql, ord for ord, med én
--     lap: køkkenet + køreturen for en levering (B og B4). Udløseren
--     bestilling_gaestens_regler står, som den stod.
--
--  ⚠️ SKAL STÅ EFTER tilvalg-og-tidsbegraensede-varer-1-10.sql. Køres
--     den gamle fil igen bagefter, er lappen væk — kør så den her igen.
--
--  Kan køres igen. Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
--  Prøven er proev-levering-tid-8-10.sql.
-- ============================================================
begin;

-- ------------------------------------------------------------
--  1) KØKKENETS TID OG KØRETIDERNE — kun hvis de ikke findes
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi)
values ('mosede', 'varsel_min_levering', '30'::jsonb),
       ('mosede', 'leverings_koeretid',
        '{"2690": 15, "2670": 20, "4030": 30, "4600": 30}'::jsonb)
on conflict (lokation_id, noegle) do nothing;


-- ------------------------------------------------------------
--  2) GÆSTENS REGLER — nyeste udgave fra
--     tilvalg-og-tidsbegraensede-varer-1-10.sql med leveringens tid.
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
  v_levk    numeric;    -- køkkenets tid før en levering (8/10)
  v_koer    numeric;    -- køreturen til adressens postnummer (8/10)
  v_faldlev numeric;    -- v_fald for en levering: køkken + køretur
  v_postnr  text;
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

    /* ⚠️ LEVERINGENS TID: KØKKENET + KØRETUREN  (8/10). Samme regel
       som medKoeretur i js/bestil-regler.js: køkkenets tid
       (varsel_min_levering, ellers kanalens) eller kategoriens, hvis
       den er længere — og så køreturen til adressens postnummer oven
       i. Postnummeret er SERVERENS (kvitteringen fra
       valider-levering), ikke det, gæsten skrev. Et postnummer uden
       tal — og en levering uden kvittering, som
       bestilling_levering_valideret afviser lige efter — får den
       længste køretid; uden en eneste køretid er den 0.
       ⚠️ Kun når hvordan = 'levering': afhentning og bordet måles,
       som de altid er blevet. */
    if new.hvordan = 'levering' then
      v_levk := public.mosede_tal(v_i -> 'varsel_min_levering');
      if v_levk is null or v_levk < 0 then v_levk := v_fald; end if;
      v_levk := round(v_levk);

      select lv.postnr into v_postnr
        from public.leverings_valideringer lv
       where lv.token = new.leverings_token
         and lv.lokation_id = new.lokation_id;

      select coalesce(
               max(round(public.mosede_tal(x.value)))
                 filter (where x.key = v_postnr and public.mosede_tal(x.value) >= 0),
               max(round(public.mosede_tal(x.value)))
                 filter (where public.mosede_tal(x.value) >= 0),
               0)
        into v_koer
        from jsonb_each(case when jsonb_typeof(v_i -> 'leverings_koeretid') = 'object'
                             then v_i -> 'leverings_koeretid' else '{}'::jsonb end) x;
      v_koer := coalesce(v_koer, 0);
      v_faldlev := greatest(v_fald, v_levk) + v_koer;
    end if;

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
        if new.hvordan = 'levering' then
          v_var := greatest(round(v_var), v_levk) + v_koer;   -- se B (8/10)
        end if;
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
       and v_til < coalesce(v_faldlev, v_fald) - MARGEN then
      v_grund := 'bestilling_for_kort_varsel: ' || (linje ->> 'navn')
                 || ' (' || round(coalesce(v_faldlev, v_fald)) || ' min)';
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
       and (kat.lokation_id is null or kat.lokation_id = new.lokation_id)
       /* ⚠️ OG VINDUET TÆLLER MED I `where`, IKKE I `filter`  (1/10).
          Lå det i filteret, ville en udløbet vare stadig være KENDT,
          men uden pris — og så er v_priser tom, prischecket springes
          over, og en gammel fane kunne sende fredagsbarens 55,- i
          november. I `where` findes rækken slet ikke, og linjen
          falder på bestilling_ukendt_vare, som den skal. */
       and public.mosede_vare_i_vindue(to_jsonb(v), new.hent_dato);

    -- Dagens ret: tabellen for hentedagen …
    /* ⚠️ OG TILVALGENES PRIS SKAL MED  (1/10) — samme sag som valgets
       tillæg lige ovenfor. Vælger gæsten kylling og bacon til den
       bagte kartoffel, er linjen 75, ikke 55, og uden det her blev
       præcis dét afvist som prisfusk. mosede_tilvalg_tillaeg svarer 0
       for en ret uden tilvalg, så alle andre dage måles som før. */
    select coalesce(v_priser, '{}'::numeric[])
             || coalesce(array_agg(r.pris
                  + public.mosede_tilvalg_tillaeg(to_jsonb(r) -> 'tilvalg',
                                                  linje -> 'tilvalg'))
                  filter (where r.pris is not null), '{}'::numeric[]),
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

    /* TILVALGET ER EJERENS  (1/10). Prisen ovenfor regnes af de
       tilvalg, der STÅR på retten; et navn, ejeren ikke har skrevet,
       giver 0 i tillæg og ville derfor slippe igennem prischecket og
       stå på bonen alligevel. Så køkkenet læste "Bagt kartoffel ·
       Hummer" til 55 kr. Samme opslag som mosede_valg_navn, så
       siden og databasen peger på den samme liste.

       ⚠️ bool_or(not exists(...)): sandt, så snart ÉN række på dagen
       kender dem alle. To retter med samme navn må ikke gøre
       databasen strengere end siden — samme grund som bool_and ved
       valgene ovenfor. */
    if jsonb_typeof(linje -> 'tilvalg') = 'array'
       and jsonb_array_length(linje -> 'tilvalg') > 0 then
      select coalesce(bool_or(not exists (
               select 1 from jsonb_array_elements_text(linje -> 'tilvalg') t
                where not exists (
                  select 1 from jsonb_array_elements(
                    case when jsonb_typeof(to_jsonb(r) -> 'tilvalg') = 'array'
                         then to_jsonb(r) -> 'tilvalg' else '[]'::jsonb end) x
                   where lower(public.mosede_valg_navn(x)) = lower(btrim(t))))), false)
        into v_valg_ok
        from public.dagens_retter r
       where r.lokation_id = new.lokation_id
         and r.dato = new.hent_dato
         and lower(btrim(r.navn)) = navnet;
      if not v_valg_ok then
        raise exception 'bestilling_ukendt_tilvalg: %', coalesce(linje ->> 'navn', '');
      end if;
    end if;
  end loop;

  return new;
end $function$;

commit;

-- ------------------------------------------------------------
--  RAPPORT — alle tre skal sige JA
-- ------------------------------------------------------------
select
  case when pg_get_functiondef(to_regproc('public.mosede_gaestens_regler'))
            like '%leverings_koeretid%' then 'JA' else 'NEJ' end
    as gaestens_regler_kender_koeretiden,
  case when pg_get_functiondef(to_regproc('public.mosede_gaestens_regler'))
            like '%bestilling_ukendt_tilvalg%' then 'JA' else 'NEJ' end
    as tilvalgene_er_der_stadig,
  case when exists (select 1 from public.indstillinger
                     where lokation_id = 'mosede' and noegle = 'varsel_min_levering')
        and exists (select 1 from public.indstillinger
                     where lokation_id = 'mosede' and noegle = 'leverings_koeretid'
                       and jsonb_typeof(vaerdi) = 'object')
       then 'JA' else 'NEJ' end
    as tallene_staar_der,
  (select vaerdi from public.indstillinger
    where lokation_id = 'mosede' and noegle = 'varsel_min_levering') as koekkenets_tid,
  (select vaerdi from public.indstillinger
    where lokation_id = 'mosede' and noegle = 'leverings_koeretid') as koeretiderne;
