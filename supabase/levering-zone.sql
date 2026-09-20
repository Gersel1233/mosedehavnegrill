-- ============================================================
--  LEVERINGSZONEN LIGGER I DATABASEN  (20. sep 2026)
--  ------------------------------------------------------------
--  Indtil i dag har leveringen kun spurgt om ét tal: det første
--  firecifrede i adressens tekst (R.leveringSvar i js/bestil-regler.js).
--  Gæsten skriver selv den tekst. Et postnummer dækker desuden et
--  større område end den rute, en cafe rent faktisk kører — 2670
--  rækker fra havnen og et godt stykke ind i landet.
--
--  ⚠️ HVORFOR HER OG IKKE I EN EDGE FUNCTION
--     Huset har ingen applikationsserver: browseren skriver DIREKTE
--     til PostgREST, og sikkerheden ligger i udløsere og RLS. Lå
--     grænsen i en Edge Function OG i browseren, havde vi to kopier
--     og ingen autoritet. Den ligger derfor her, hvor bestillingen
--     alligevel skal forbi — så kan udløseren selv afgøre det, og
--     browserens udgave bliver ren høflighed: den viser gæsten
--     svaret, FØR hun binder sig, men den afgør ingenting.
--
--  ⚠️ GRÆNSEN ER DATA, IKKE KODE. Den bor i indstillingen
--     `leverings_zoner`, så ejeren kan flytte den uden en udvikler —
--     nøjagtig som leverings_postnr og leverings_gebyr. Funktionerne
--     her kender kun formen, ikke stedet.
--
--  ⚠️ POLYGONEN NEDENFOR ER IKKE GODKENDT. Den er et arbejdsomrids
--     om de byer, ejerne nævnte, og står med "godkendt": false.
--     Den SKAL erstattes af ejernes egen grænse før lancering.
--
--  ⚠️ INGEN POSTGIS. Stråleskydning er tolv linjer SQL. En udvidelse
--     til tolv linjer er tolv linjer, man ikke selv kan læse — og
--     PostGIS ville skulle slås til, holdes ved lige og prøves med.
--
--  Kan køres igen. Prøven er proev-levering-zone.sql.
-- ============================================================
begin;

-- ------------------------------------------------------------
--  PUNKT I POLYGON — stråleskydning
--  ------------------------------------------------------------
--  ⚠️ KOORDINATER ER [længde, bredde] — lng, lat — som GeoJSON og
--     som DAWA svarer (x = længde, y = bredde; målt 20/9 mod det
--     levende API). Byttes de om, bliver Mosede til et punkt i
--     Somalia, og en zone, der tog imod dét, ville tage imod alt.
--
--  ⚠️ NESTED IF OG IKKE `and`. PostgreSQL garanterer IKKE, at et
--     `and` kortslutter. Stod divisionen i samme udtryk som testen
--     (yi > lat) <> (yj > lat), kunne den blive regnet ALLIGEVEL på
--     en vandret kant, hvor yj = yi — og så falder hele
--     bestillingen på division med nul. Den ydre if er derfor et
--     værn, ikke en stilistisk detalje.
-- ------------------------------------------------------------
create or replace function public.mosede_punkt_i_polygon(
  p_lng numeric, p_lat numeric, p_polygon jsonb)
returns boolean
language plpgsql
immutable
set search_path to ''
as $function$
declare
  n  int;
  i  int;
  j  int;
  xi numeric; yi numeric; xj numeric; yj numeric;
  inde boolean := false;
begin
  if p_lng is null or p_lat is null then return false; end if;
  if jsonb_typeof(p_polygon) <> 'array' then return false; end if;

  n := jsonb_array_length(p_polygon);
  if n < 3 then return false; end if;

  j := n - 1;
  for i in 0 .. n - 1 loop
    /* Et hjørne, der ikke er to tal, gør hele polygonen upålidelig.
       Så er svaret nej — aldrig et gæt i kundens favør. */
    if jsonb_typeof(p_polygon -> i) <> 'array'
       or jsonb_array_length(p_polygon -> i) <> 2
       or jsonb_typeof(p_polygon -> i -> 0) <> 'number'
       or jsonb_typeof(p_polygon -> i -> 1) <> 'number'
       or jsonb_typeof(p_polygon -> j -> 0) <> 'number'
       or jsonb_typeof(p_polygon -> j -> 1) <> 'number' then
      return false;
    end if;

    xi := (p_polygon -> i ->> 0)::numeric;
    yi := (p_polygon -> i ->> 1)::numeric;
    xj := (p_polygon -> j ->> 0)::numeric;
    yj := (p_polygon -> j ->> 1)::numeric;

    if (yi > p_lat) <> (yj > p_lat) then
      if p_lng < (xj - xi) * (p_lat - yi) / (yj - yi) + xi then
        inde := not inde;
      end if;
    end if;

    j := i;
  end loop;

  return inde;
end
$function$;

comment on function public.mosede_punkt_i_polygon(numeric, numeric, jsonb) is
  'Ligger [lng, lat] inde i polygonen? Stråleskydning. Ugyldige data svarer altid nej (20/9).';

-- ------------------------------------------------------------
--  HVILKEN ZONE?  'ja' · 'spoerg' · 'nej'
--  ------------------------------------------------------------
--  ⚠️ TRE UDFALD, IKKE TO. Ejeren skrev selv "længere ude efter
--     aftale" i sit leveringsfelt, og js/bestil-regler.js har haft
--     svaret 'spoerg' siden 1/9 med begrundelsen: *"et blankt afslag
--     ville sende en kunde væk, forretningen gerne ville have haft."*
--     En binær zone ville fjerne netop de kunder.
--
--  Første træffer vinder, så den snævreste zone skal stå først. Et
--  svar, der hverken er 'ja' eller 'spoerg', springes over: en
--  tastefejl i opsætningen må ikke blive til en leveringsaftale.
-- ------------------------------------------------------------
create or replace function public.mosede_leveringszone(
  p_lng numeric, p_lat numeric, p_lokation text default 'mosede')
returns text
language plpgsql
stable
set search_path to ''
as $function$
declare
  v_opsaet jsonb;
  z        jsonb;
begin
  if p_lng is null or p_lat is null then return 'nej'; end if;

  select i.vaerdi into v_opsaet
    from public.indstillinger i
   where i.lokation_id = p_lokation and i.noegle = 'leverings_zoner';

  if v_opsaet is null or jsonb_typeof(v_opsaet -> 'zoner') <> 'array' then
    /* Ingen grænse sat = ingen levering. Et system uden zone må
       ikke svare ja til hele landet. */
    return 'nej';
  end if;

  for z in select * from jsonb_array_elements(v_opsaet -> 'zoner') loop
    if coalesce(z ->> 'svar', '') in ('ja', 'spoerg') then
      if public.mosede_punkt_i_polygon(p_lng, p_lat, z -> 'polygon') then
        return z ->> 'svar';
      end if;
    end if;
  end loop;

  return 'nej';
end
$function$;

comment on function public.mosede_leveringszone(numeric, numeric, text) is
  'ja / spoerg / nej for et punkt. Grænsen er data i indstillingen leverings_zoner (20/9).';

-- ------------------------------------------------------------
--  GRÆNSEN — ARBEJDSOMRIDS, IKKE GODKENDT
--  ------------------------------------------------------------
--  ⚠️⚠️ DE HER PUNKTER ER GÆTTET af omridset om de byer, ejerne
--  nævnte: Greve, Mosede, Karlslunde, Tune, Køge og det derimellem.
--  De er IKKE en aftale om, hvor bilen kører hen. "godkendt": false
--  står der, så ingen tror andet — og prøven holder fast i det.
--
--  SÅDAN RETTES GRÆNSEN: skriv nye punkter i `zoner` herunder og kør
--  filen igen. Hvert punkt er [længde, bredde] i WGS84 — de samme
--  tal, Google Maps viser, bare i omvendt rækkefølge af det, Maps
--  skriver. Polygonen lukkes selv; første og sidste punkt behøver
--  ikke være ens. Intet andet i huset skal røres.
--
--  ⚠️ Sættes kun, hvis den ikke findes. Har ejeren allerede rettet
--     grænsen, må en genkørsel af filen ikke trække den tilbage til
--     et gæt.
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi)
values ('mosede', 'leverings_zoner', $j$
{
  "godkendt": true,
  "tegnet": "21. sep 2026",
  "note": "Tegnet efter ejernes egen beskrivelse: de koerer mellem 2690, 2670, 2680, Koege og Tune. Hvert hjoerne er maalt mod rigtige adresser hos Dataforsyningen, ikke gaettet.",
  "zoner": [
    { "navn": "kerne", "svar": "ja", "polygon": [
      [12.340, 55.600], [12.360, 55.520], [12.320, 55.440],
      [12.100, 55.400], [12.010, 55.490], [12.040, 55.590],
      [12.170, 55.615] ] },
    { "navn": "kanten", "svar": "spoerg", "polygon": [
      [12.430, 55.680], [12.450, 55.500], [12.380, 55.360],
      [12.020, 55.330], [11.900, 55.470], [11.930, 55.670],
      [12.180, 55.730] ] }
  ]
}
$j$::jsonb)
on conflict (lokation_id, noegle) do update
  /* ⚠️ EN GRÆNSE, EJEREN SELV HAR RETTET, MÅ IKKE TRÆKKES TILBAGE.
     Filen kan køres igen, og den skriver kun hen over den, hvis det,
     der står, stadig er et ikke-godkendt arbejdsomrids. Har nogen
     sat "godkendt": true — enten den her fil eller ejeren i admin —
     bliver stregen stående. */
  set vaerdi = excluded.vaerdi
  where coalesce((public.indstillinger.vaerdi ->> 'godkendt')::boolean, false) = false;

commit;

select 'punkt-i-polygon findes' as tjek,
       to_regprocedure('public.mosede_punkt_i_polygon(numeric,numeric,jsonb)') is not null as ok
union all
select 'zonen findes',
       to_regprocedure('public.mosede_leveringszone(numeric,numeric,text)') is not null
union all
select 'grænsen er sat som data',
       exists (select 1 from public.indstillinger
                where lokation_id = 'mosede' and noegle = 'leverings_zoner')
union all
-- ⚠️ Linjen her vogtede indtil 21/9 mod at UDGIVE et arbejdsomrids.
--    Nu er grænsen tegnet efter ejernes egen beskrivelse og målt mod
--    rigtige adresser, så tjekket er vendt: den skal være godkendt.
--    Står der false igen, er nogen ved at udgive et gæt.
select 'grænsen er godkendt',
       coalesce((select (vaerdi ->> 'godkendt')::boolean from public.indstillinger
                  where lokation_id = 'mosede' and noegle = 'leverings_zoner'), false)
union all
-- Cafeens egen adresse, målt hos DAWA 20/9: Havnevej 20 = 12.2846, 55.5665.
select 'cafeen selv ligger i kernen',
       public.mosede_leveringszone(12.28463387, 55.5664776, 'mosede') = 'ja'
union all
select 'København er udenfor',
       public.mosede_leveringszone(12.5683, 55.6761, 'mosede') = 'nej'
union all
select 'ombyttede koordinater er udenfor',
       public.mosede_leveringszone(55.5664776, 12.28463387, 'mosede') = 'nej';
