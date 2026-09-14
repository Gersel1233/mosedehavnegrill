-- ============================================================
--  ÅBENT ER ÅBENT — OG ET ANTAL ER ET LOFT  (13. september 2026)
--  ------------------------------------------------------------
--  Kundens ord: "det er netop sådan nogle slags fejl alle steder,
--  der ikke må ske … alt var lukket lørdag til søndag, men alligevel
--  var der en dame, der bestilte 2 nachos to go — det må ikke ske,
--  alt sådan noget", og "selvom jeg har sat dagens ret til 20
--  portioner, kan jeg vælge 20+ (27)".
--
--  MÅLT i produktionen 13/9, før filen blev skrevet:
--   · mosede_dag_aaben dækkede lukkedage, tidlig lukning, sæson,
--     dags_regler og QR-spærren — men IKKE åbningstiderne. En ugedag
--     med lukket = true og et klokkeslæt uden for dagens tid blev
--     taget imod, hvis en formular sendte dem. Kun dagvælgeren i
--     browseren holdt dem ude.
--   · menuens varer har et loft (mosede_vare_antal_vaern), men DAGENS
--     RET havde intet: bremsen tæller ned BAGEFTER med
--     greatest(antal - stk, 0), så 27 af 20 blev taget imod.
--
--  Filen lægger begge værn i DATABASEN, hvor de gælder for hver vej
--  ind — forsiden, bestil/, bordet, bordbookingen og en konsol.
--
--  ⚠️ mosede_dag_aaben ER SKREVET EFTER DEN, DER KØRER (den fra
--     dagsbesked-og-qr.sql / lukkedag-vaern.sql), og den gamle krop er
--     urørt; kun trin 1b er nyt. KØRES dagsregler.sql, lukkedag-vaern.sql
--     ELLER dagsbesked-og-qr.sql IGEN BAGEFTER, skrives åbningstiderne ud
--     af værnet igen, og så skal DENNE fil køres igen. er-vi-klar.sql
--     tjek 136 fanger det.
--
--  ⚠️ UGEDAG 0 ER MANDAG — som aabningstider altid har været (js/store.js:
--     (getUTCDay() + 6) % 7). isodow er mandag = 1, derfor − 1.
--
--  ⚠️ INGEN RÆKKE I aabningstider = INGEN REGEL. En forretning uden
--     åbningstider i databasen må ikke få hver bestilling afvist.
--
--  ⚠️ LOFTET PÅ DAGENS RET LÅSER RÆKKEN (for update), så to gæster, der
--     trykker på den sidste portion i samme sekund, ikke begge kommer
--     igennem. Bremsen bagefter tæller ned som før.
--
--  Kan køres igen. Prøven er proev-aabent-og-antal-vaern.sql.
-- ============================================================
begin;

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
    /* ⚠️ NØGLEN HEDDER bordbestilling_aaben (rettet 15/9). Her stod
       'qr_aaben' — et navn, ingen fane skriver — og i to dage stod
       "Tag ikke imod fra bordene" slået fra, mens databasen tog imod.
       Køres filen igen, må den ikke skrive fejlen tilbage. Se
       gaestens-regler.sql. */
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
  --     for dagens tid. Ingen række = ingen regel (se hovedet).
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

drop trigger if exists bestilling_dagens_ret_vaern on public.bestillinger;
create trigger bestilling_dagens_ret_vaern
  before insert on public.bestillinger
  for each row execute function public.mosede_dagens_ret_vaern();

commit;

select 'mosede_dag_aaben læser åbningstiderne' as tjek,
       (pg_get_functiondef('public.mosede_dag_aaben'::regproc) like '%aabningstider%') as ok
union all
select 'Dagens ret har et loft ved indsættelse',
       exists (select 1 from pg_trigger
                where tgname = 'bestilling_dagens_ret_vaern'
                  and tgrelid = 'public.bestillinger'::regclass);
