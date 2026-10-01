-- ============================================================
--  TILVALG PÅ DAGENS RET — OG VARER, DER SLUKKER SIG SELV  (1/10)
--  ------------------------------------------------------------
--  To ting, ejeren bad om samme dag, og de bor i den SAMME
--  funktion — derfor én fil. Genudsender to filer hver sin
--  udgave af mosede_gaestens_regler, vinder den, der kørte
--  sidst, og den anden rettelse forsvinder tavst.
--
--  1) TILVALG PÅ DAGENS RET.  Mikkel: *"på dagensret gør så de kan
--     tilføje tilbehør ting i admin … og at de kan vælge det og i
--     dette tilfælde 10 kroner og selv kan skrive det ind."*
--     Baggrunden er kartoflens egen tekst, som han kaldte *"alt
--     for generisk"*: »Tilføj valgfrit tilbehør og kød – 10,- pr.
--     stk.« Hvilket tilbehør? Det stod ingen steder, og køkkenet
--     fik en bon, hvor der ikke stod andet end retten.
--
--     Formen er ejerens egen liste pr. ret:
--         tilvalg = [{"navn": "Kylling", "pris": 10}, …]
--     Gæstens linje bærer de valgte som sin EGEN nøgle:
--         {"navn": "Bagt …", "pris": 75, "tilvalg": ["Kylling", "Bacon"]}
--
--     ⚠️ OG IKKE I `variant`. Databasen kræver, at variant er ÉT af
--        varens valg (vare-valg.sql) — to tilvalg ville blive
--        afvist med bestilling_mangler_valg. Samme grund som
--        smagene fik deres egen nøgle 25/9.
--
--  2) EN VARE MED ET DATOVINDUE.  Chefen: *"Pølsemix skal fortsat
--     koste 90,- som almindelig vare. De 55,- gælder kun
--     fredagsbaren … lav det som et særskilt tidsbegrænset tilbud
--     til 55,-, der automatisk forsvinder efter fredagsbaren."*
--     Kategoriens `dage` kunne have gjort det — men den gentager
--     sig HVER fredag, og fredagsbaren er én aften (2/10).
--     Derfor et datovindue på varen selv.
--
--     ⚠️ DEN ALMINDELIGE PØLSEMIX RØRES IKKE. Nr. 248 bliver
--        stående på 90,-, og tilbuddet er sin EGEN række med sit
--        eget navn — ellers stod der »Pølsemix med pommes« på
--        bonen til to forskellige priser, og køkkenet kunne ikke se
--        hvilken. Trykfilerne ændres ikke; det her er kun det
--        digitale.
--
--  Kan køres igen. Prøven står nederst i filen.
-- ============================================================
begin;

-- ------------------------------------------------------------
--  1) KOLONNERNE
-- ------------------------------------------------------------
alter table public.dagens_retter add column if not exists tilvalg jsonb;
alter table public.menu_varer    add column if not exists vis_fra date;
alter table public.menu_varer    add column if not exists vis_til date;

comment on column public.dagens_retter.tilvalg is
  'Ejerens egen liste: [{"navn","pris"}] — det gæsten kan vælge til (1/10).';
comment on column public.menu_varer.vis_fra is
  'Første dag varen kan bestilles. Tom = fra altid (1/10).';
comment on column public.menu_varer.vis_til is
  'Sidste dag varen kan bestilles. Tom = indtil videre (1/10).';

/* ⚠️ LISTEN SKAL VÆRE EN LISTE, OG PRISEN ET TAL. Uden værnet kunne
   admin gemme {"Kylling": 10} eller en pris som tekst, og så ville
   mosede_tilvalg_tillaeg svare 0 — gæsten fik kylling gratis, og
   ingen opdagede det, før kassen ikke stemte.
   Loftet på 16 er det samme som varens valg (vare_valg_ok). */
/* ⚠️ UNDERFORESPØRGSLEN SKAL I EN FUNKTION. Postgres svarer "cannot
   use subquery in check constraint", hvis den står i CHECK'en selv —
   MÅLT på den lokale database, før filen rørte skyen. Samme greb som
   mosede_valg_gyldig 20/9. */
create or replace function public.mosede_tilvalg_gyldig(tilvalg jsonb)
returns boolean language sql immutable set search_path = ''
as $$
  select not exists (
    select 1 from jsonb_array_elements(tilvalg) x
     where jsonb_typeof(x) <> 'object'
        or btrim(coalesce(x ->> 'navn', '')) = ''
        or length(x ->> 'navn') > 60
        or jsonb_typeof(x -> 'pris') <> 'number'
        or (x ->> 'pris')::numeric < 0
        or (x ->> 'pris')::numeric > 1000);
$$;

comment on function public.mosede_tilvalg_gyldig(jsonb) is
  'Er dagens rets tilvalg en liste med navn og et tal til pris? (1/10)';

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'dagens_tilvalg_ok') then
    alter table public.dagens_retter drop constraint dagens_tilvalg_ok;
  end if;
  alter table public.dagens_retter add constraint dagens_tilvalg_ok check (
    tilvalg is null
    or (jsonb_typeof(tilvalg) = 'array'
        and jsonb_array_length(tilvalg) <= 16
        and length(tilvalg::text) <= 1200
        and public.mosede_tilvalg_gyldig(tilvalg)));
end $$;

-- ⚠️ Slutter vinduet før det begynder, kan varen aldrig bestilles,
--    og ejeren ville lede efter den på siden uden at finde den.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'vare_vindue_ok') then
    alter table public.menu_varer drop constraint vare_vindue_ok;
  end if;
  alter table public.menu_varer add constraint vare_vindue_ok check (
    vis_fra is null or vis_til is null or vis_til >= vis_fra);
end $$;

-- ------------------------------------------------------------
--  2) DE TO REGNESTYKKER — ÉT STED HVER
--     Siden regner det samme i js/store.js. To udgaver af "hvad
--     koster linjen" er præcis det, prisværnet findes for at fange,
--     så de skal svare ens på de samme tal.
-- ------------------------------------------------------------

/* Hvad tilvalgene lægger oveni rettens pris. Navnene slås op med
   mosede_valg_navn — den samme, valgene bruger — så en liste skrevet
   som ren tekst (["Kylling"]) også virker, selv om admin skriver
   objekter. Et ukendt navn giver 0; at det ikke må STÅ på linjen,
   siger værnet selv (bestilling_ukendt_tilvalg). */
create or replace function public.mosede_tilvalg_tillaeg(tilvalg jsonb, valgte jsonb)
returns numeric language sql immutable set search_path = ''
as $$
  select coalesce((
    select sum(coalesce((
      select case when jsonb_typeof(x -> 'pris') = 'number'
                   and (x ->> 'pris')::numeric > 0
                  then (x ->> 'pris')::numeric else 0 end
        from jsonb_array_elements(
               case when jsonb_typeof(tilvalg) = 'array'
                    then tilvalg else '[]'::jsonb end) x
       where lower(public.mosede_valg_navn(x)) = lower(btrim(t))
       limit 1), 0))
      from jsonb_array_elements_text(
             case when jsonb_typeof(valgte) = 'array'
                  then valgte else '[]'::jsonb end) t
  ), 0);
$$;

comment on function public.mosede_tilvalg_tillaeg(jsonb, jsonb) is
  'Hvad gæstens tilvalg lægger oveni dagens rets pris — 0 uden tilvalg (1/10).';

/* Står varen inden for sit datovindue den dag, gæsten henter?
   ⚠️ to_jsonb(v) og ikke v.vis_fra: funktionen skal kunne køre, FØR
      kolonnerne findes — så svarer begge null, og alt er som før.
      Samme kneb som mosede_valg_tillaeg 20/9. */
create or replace function public.mosede_vare_i_vindue(v jsonb, dag date)
returns boolean language sql immutable set search_path = ''
as $$
  select case
    when dag is null then true
    when (v ->> 'vis_fra') is not null and dag < (v ->> 'vis_fra')::date then false
    when (v ->> 'vis_til') is not null and dag > (v ->> 'vis_til')::date then false
    else true end;
$$;

comment on function public.mosede_vare_i_vindue(jsonb, date) is
  'Er varen inden for sit vis_fra/vis_til-vindue den dag? (1/10)';

-- ------------------------------------------------------------
--  3) GÆSTENS REGLER — nyeste udgave fra gaestens-vaern-26-9.sql,
--     ord for ord, med tre lapper: varens datovindue i
--     prisopslaget, tilvalgenes tillæg på dagens ret, og værnet
--     for, at tilvalget er ejerens.
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


-- ------------------------------------------------------------
--  4) KARTOFLENS TILVALG — og teksten, der sagde for lidt
--     ------------------------------------------------------------
--     Mikkel med et skud af ugen: *"og teksten står alt for
--     generisk fix lige."* Linjen sluttede »Tilføj valgfrit
--     tilbehør og kød – 10,- pr. stk.« — hvilket tilbehør? Nu står
--     navnene som noget, gæsten kan trykke på, og sætningen, der
--     ikke sagde dem, er væk.
--
--     ⚠️ DET HER ER DEN ENESTE RET, FILEN SÆTTER TILVALG PÅ, og
--        kun fordi ejeren selv gav navnene (okse og kylling) og
--        prisen (10). Resten skriver han i admin — en fil, der
--        satte tilvalg på retter, ejeren ikke har set, ville ændre
--        hvad gæsten bliver spurgt om, uden at nogen bad om det.
--        Samme regel som vare-valg.sql, 20/9.
-- ------------------------------------------------------------
update public.dagens_retter
   set tilvalg = '[{"navn": "Oksekød", "pris": 10},
                   {"navn": "Kylling", "pris": 10}]'::jsonb,
       beskrivelse = 'Med blandet salat, tomat, agurk, majs, asparges, løg og dressing.'
 where lokation_id = 'mosede'
   and lower(btrim(navn)) = 'bagt krydderet kartoffel';

-- Den faste vare under Retter siger det samme (chefen 30/9: den
-- bliver stående som fast vare, når ugen er forbi).
update public.menu_varer
   set beskrivelse = 'Med blandet salat, tomat, agurk, majs, asparges, løg og dressing.'
 where lower(btrim(navn)) = 'bagt krydderet kartoffel';


-- ------------------------------------------------------------
--  5) FREDAGSBARENS PØLSEMIX — 55,- KUN DEN 2. OKTOBER
--     ------------------------------------------------------------
--     Chefen: *"Pølsemix skal fortsat koste 90,- som almindelig
--     vare. De 55,- gælder kun fredagsbaren."* Derfor sin EGEN
--     række med sit eget navn og sit eget vindue — nr. 248 på 90,-
--     røres ikke med en finger.
--
--     Den 3. oktober findes rækken stadig i tabellen, men
--     mosede_vare_i_vindue svarer nej: den står ikke på kortet,
--     den kan ikke lægges i kurven, og en gammel fane, der prøver
--     alligevel, får bestilling_ukendt_vare fra databasen. Ingen
--     skal huske at slukke den.
-- ------------------------------------------------------------
update public.menu_varer
   set pris = 55, aktiv = true, udsolgt = false,
       vis_fra = date '2026-10-02', vis_til = date '2026-10-02',
       beskrivelse = 'Tilbud i fredagsbaren den 2. oktober — kun denne aften.'
 where lower(btrim(navn)) = 'pølsemix med pommes, fredagsbar';

insert into public.menu_varer
  (kategori_id, navn, beskrivelse, pris, aktiv, udsolgt, sortering,
   lokation_id, vis_fra, vis_til)
select v.kategori_id,
       'Pølsemix med pommes, fredagsbar',
       'Tilbud i fredagsbaren den 2. oktober — kun denne aften.',
       55, true, false, v.sortering,
       v.lokation_id, date '2026-10-02', date '2026-10-02'
  from public.menu_varer v
 where lower(btrim(v.navn)) = 'pølsemix med pommes'
   and not exists (select 1 from public.menu_varer w
                    where lower(btrim(w.navn)) = 'pølsemix med pommes, fredagsbar')
 limit 1;

commit;


-- ============================================================
--  PRØVEN — kør den bagefter. Alt skal sige t.
-- ============================================================
select '1. dagens_retter har tilvalg, menu_varer har vinduet' as hvad,
       (select count(*) = 3 from information_schema.columns
         where table_schema = 'public'
           and (table_name, column_name) in
               (('dagens_retter','tilvalg'), ('menu_varer','vis_fra'),
                ('menu_varer','vis_til'))) as ok
union all
select '2. Tilvalgenes tillæg lægges sammen (10 + 10 = 20)',
       public.mosede_tilvalg_tillaeg(
         '[{"navn":"Oksekød","pris":10},{"navn":"Kylling","pris":10}]'::jsonb,
         '["Oksekød","Kylling"]'::jsonb) = 20
union all
select '3. … og et ukendt tilvalg koster 0, ikke null',
       public.mosede_tilvalg_tillaeg(
         '[{"navn":"Oksekød","pris":10}]'::jsonb, '["Hummer"]'::jsonb) = 0
union all
select '4. … og en ret uden tilvalg svarer 0',
       public.mosede_tilvalg_tillaeg(null, '["Oksekød"]'::jsonb) = 0
union all
select '5. Vinduet: dagen i vinduet er ja, dagen efter er nej',
       public.mosede_vare_i_vindue(
         '{"vis_fra":"2026-10-02","vis_til":"2026-10-02"}'::jsonb, date '2026-10-02')
       and not public.mosede_vare_i_vindue(
         '{"vis_fra":"2026-10-02","vis_til":"2026-10-02"}'::jsonb, date '2026-10-03')
union all
select '6. … og en vare uden vindue står altid',
       public.mosede_vare_i_vindue('{}'::jsonb, date '2026-12-24')
union all
select '7. Værnet kender tilvalget og vinduet',
       coalesce(pg_get_functiondef(to_regproc('public.mosede_gaestens_regler'))
                like '%bestilling_ukendt_tilvalg%', false)
       and coalesce(pg_get_functiondef(to_regproc('public.mosede_gaestens_regler'))
                like '%mosede_vare_i_vindue%', false)
union all
select '8. Kartoflen har ejerens to tilvalg til 10,-',
       (select count(*) = 7 from public.dagens_retter
         where lower(btrim(navn)) = 'bagt krydderet kartoffel'
           and public.mosede_tilvalg_tillaeg(tilvalg, '["Oksekød","Kylling"]'::jsonb) = 20)
union all
select '9. … og teksten lover ikke længere et tilbehør, den ikke nævner',
       (select bool_and(beskrivelse not ilike '%valgfrit tilbehør%')
          from public.dagens_retter
         where lower(btrim(navn)) = 'bagt krydderet kartoffel')
union all
select '10. Den almindelige Pølsemix er URØRT på 90,-',
       (select pris = 90 and vis_fra is null and vis_til is null
          from public.menu_varer where id = 248)
union all
select '11. Fredagsbarens pølsemix er 55,- og kun den 2. oktober',
       (select pris = 55 and vis_fra = date '2026-10-02' and vis_til = date '2026-10-02'
          from public.menu_varer
         where lower(btrim(navn)) = 'pølsemix med pommes, fredagsbar')
union all
select '12. Listen skal være en liste med tal — værnet afviser andet',
       not exists (select 1 from public.dagens_retter
                    where tilvalg is not null and jsonb_typeof(tilvalg) <> 'array');
