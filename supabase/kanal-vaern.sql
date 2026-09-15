-- ============================================================
--  EN LUKKET KATEGORI KAN IKKE BESTILLES — HELLER IKKE FRA EN
--  GAMMEL FANE  (16. sep 2026)
--  ------------------------------------------------------------
--  Ejerens ord: med en "forældet browser" kan nogen bestille noget,
--  siden ikke tilbyder — "det skal vi have fixet, så det ikke kan
--  ske".
--
--  MÅLT FØR: mosede_gaestens_regler (15/9) afviser en ukendt vare,
--  en pris, der ikke er menukortets, en tid der er gået, varslet,
--  levering slået fra og mindsteantallet. Men INGEN regel i
--  databasen spurgte, om varens kategori overhovedet er ÅBEN for
--  bestilling. Fluebenene i admin (bestilbare_kategorier*) var en
--  ren skærmregel — så en gammel fane, en gemt adresse eller en
--  konsol kunne bestille fra cateringens kategorier, som med vilje
--  er lukkede (Sliders, Pindemad, Platter, Tapasfad, Tilkøb ud af
--  huset: mindst ti personer og ikke på lugens kort). En gæst ved
--  bordet kunne altså købe én slider til 40.
--
--  ⚠️ "ÅBEN ÉT STED" OG IKKE "ÅBEN PÅ DEN SIDE".
--  Butik.salgsKategorier har tre lister — forsiden, bordet og
--  smørrebrødssiden — og falder tilbage på hinanden, når en liste
--  ikke findes. Værnet her spørger kun, om kategorien er åben ET
--  ELLER ANDET sted. Grunden er husets egen lov: DATABASEN MÅ
--  ALDRIG VÆRE STRENGERE END SIDEN. En kanal-for-kanal-kopi ville
--  skride fra klientens fald-tilbage-regler første gang en af dem
--  blev rettet, og så ville en gæst få nej på noget, siden tilbød.
--  Hullet, der bliver tilbage (en forsidekategori bestilt gennem
--  bordets adresse), koster ingen penge: prisen er stadig
--  menukortets, og køkkenet ser bordnummeret.
--
--  ⚠️ SMØRREBRØDET KENDES PÅ NAVNET, som i Butik.smoerrebroed:
--  uden en egen liste ER smørrebrødets kategorier åbne på
--  smørrebrødssiden. Samme regex som mindsteantallet bruger i
--  gaestens-regler.sql.
--
--  ⚠️ DAGENS RET HAR INGEN KATEGORI. Den bor i dagens_retter (og
--  i den gamle enkeltindstilling), og de to steder springes over —
--  ellers ville dagens ret blive afvist af et værn om menukortet.
--
--  ⚠️ EN UKENDT VARE AFVISES IKKE HER. Det gør
--  mosede_gaestens_regler med sin egen besked
--  (bestilling_ukendt_vare); to værn om det samme ville betyde, at
--  gæsten fik den forkerte grund at vide.
--
--  Udløseren hedder bestilling_kanal_vaern og kører derfor EFTER
--  bestilling_gaestens_regler (BEFORE-udløsere kører i navnets
--  rækkefølge) — den ukendte vare og den ændrede pris svares
--  først.
--
--  Prøve: proev-kanal-vaern.sql
-- ============================================================

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
  /* ⚠️ KUN GÆSTEN. Personalet opretter selv bestillinger i admin, og
     en SQL-fil har ingen claims — samme dør som gæstens regler. */
  if coalesce(auth.jwt() ->> 'role', '') <> 'anon' then
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

drop trigger if exists bestilling_kanal_vaern on public.bestillinger;
create trigger bestilling_kanal_vaern
  before insert on public.bestillinger
  for each row execute function public.mosede_kanal_vaern();
