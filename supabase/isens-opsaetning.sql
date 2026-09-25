-- ============================================================
--  ISENS SMAGE OG ISENS FORLØB  (25. september 2026)
-- ============================================================
--  Mikkels ord: *"jeg ved de har jordbær og vanilje og chokolade til
--  at starte med som kugler, tilføj det"* — og: *"hvis jeg vil vælge
--  en isboks, skal det være et andet bestillingsflow"*.
--
--  Filen skriver to indstillinger — og INGEN varer, INGEN priser:
--
--  1) `is_smage` — smagene, gæsten vælger mellem til hver kugle.
--     Jordbær, vanilje og chokolade. Står der allerede smage (ejeren
--     har skrevet dem i admin), bliver de stående, og de tre lægges
--     til, hvis de mangler. Ejerens egne ord overskrives aldrig.
--
--  2) `is_opsaetning` — hvor i bestillingen hver is-vare står: en
--     størrelse (trin 2 i "Is i vaffel eller bæger"), tilbehør
--     (trin 4), en isboks, en dessert eller løst. Plus hvor mange
--     kugler der er i den, og om den også kan fås med softice.
--     Tallene er KORT 05 IS & SØDT, ordret — se tabellen i punkt 2.
--
--  ⚠️ HVORFOR DET SKAL STÅ I DATABASEN OG IKKE LÆSES AF NAVNET.
--     Målt 25/9 mod produktionens 26 is-varer: navnet alene siger
--     ikke, at "Havnens café-is" er 3 kugler (det står i noten), at
--     "2 hjemmelavede pandekager med is" er 1 kugle (det står på
--     kortet, ikke i navnet), eller at "Bøtte med topping" sælges
--     løst. Uden filen står de tre som retter for sig uden at spørge
--     om smag — ufarligt, men ikke kortet. Med filen er de kortet.
--
--  ⚠️ DEN MATCHER PÅ NAVN, ALDRIG PÅ ID. Indstillingen gemmer id'et
--     (det er det, siden slår op på), men id'et FINDES af filen ud
--     fra varens navn blandt varerne i afdelingen "is". Arret er
--     `kortets-priser-2.sql` (1/9). Står samme navn i to is-
--     kategorier (en database bygget af mappen har "Sauce, topping
--     eller guf" både under kugleis og softice), får begge samme
--     plads — de er det samme tilbehør.
--
--  ⚠️ EJERENS VALG VINDER. Har ejeren flyttet en vare i admin under
--     "Is & sødt", står hans valg tilbage: filen lægger kun de varer
--     ind, der ikke har et valg i forvejen. Den kan køres igen.
--
--  ⚠️ INGEN EJER-BLOK. `menu_vare_pris_ejer` vogter priser på
--     menu_varer; filen her skriver kun i `indstillinger`, som SQL
--     Editoren (rollen postgres) må skrive i.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================

begin;

-- ------------------------------------------------------------
--  0) FINDES IS-AFDELINGEN? Et opslag, der rammer nul rækker,
--     fejler ikke — det er bare tavst. Så spørges der først.
--
--     ⚠️ DER SPØRGES PÅ AFDELINGEN, IKKE PÅ KATEGORIENS NAVN.
--     Produktionen kalder den "Kugleis"; en database bygget af
--     mappens egne filer kalder den "Kugleis og ishorn". Målt 25/9
--     på en lokal Postgres: første udgave spurgte på navnet og døde
--     her. Afdelingen "is" er ejerens eget felt og det, siden læser.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from public.menu_kategorier mk
     where mk.lokation_id = 'mosede' and mk.afdeling = 'is' and mk.aktiv) then
    raise exception 'Ingen taendt kategori staar under afdelingen "is". Saet afdelingen paa isens kategorier i admin -> Menukort foerst.';
  end if;
end $$;

-- ------------------------------------------------------------
--  1) SMAGENE — de tre lægges til, intet fjernes
--     ---------------------------------------------------------
--     Feltet er en tekst med én smag pr. linje (sådan skriver admin
--     det), men siden læser også komma og en liste. Er det en
--     liste, læses den som en liste — en gammel form må ikke blive
--     til én lang smag.
-- ------------------------------------------------------------
do $$
declare
  raa   jsonb;
  har   text[] := array[]::text[];
  ny    text[];
  s     text;
begin
  select i.vaerdi into raa
    from public.indstillinger i
   where i.lokation_id = 'mosede' and i.noegle = 'is_smage';

  if raa is not null and jsonb_typeof(raa) = 'array' then
    select coalesce(array_agg(btrim(x)), array[]::text[]) into har
      from jsonb_array_elements_text(raa) x where btrim(x) <> '';
  elsif raa is not null and jsonb_typeof(raa) = 'string' then
    select coalesce(array_agg(btrim(x)), array[]::text[]) into har
      from regexp_split_to_table(raa #>> '{}', '[,;\n]+') x where btrim(x) <> '';
  end if;

  ny := har;
  foreach s in array array['Jordbær', 'Vanilje', 'Chokolade'] loop
    if not exists (select 1 from unnest(har) h where lower(h) = lower(s)) then
      ny := ny || s;
    end if;
  end loop;

  insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
  values ('mosede', 'is_smage', to_jsonb(array_to_string(ny, E'\n')), now())
  on conflict (lokation_id, noegle)
    do update set vaerdi = excluded.vaerdi, aendret = now()
    where public.indstillinger.vaerdi is distinct from excluded.vaerdi;
end $$;

-- ------------------------------------------------------------
--  2) HVOR HVER IS-VARE STÅR — kort 05, ordret
--     ---------------------------------------------------------
--     rolle:  stoerrelse = "Hvor mange kugler?" (trin 2)
--             tilbehoer  = "Noget mere?" (trin 4)
--             boks       = "Isboks" — sit eget forløb: fordel
--                          kuglerne på smagene
--             dessert    = "Desserter" — et kort pr. ret
--             loes       = "Løst" — sælges, som det er
--     kugler: tomt = læses af navnet ("3 kugler" er tre)
--     softice: tomt = læses af navnet ("eller softice")
--
--     Kortets egne ord bag de tal, der ikke står i navnet:
--       Havnens café-is        "3 kugler, softice-top, guf, …"
--       Isboks                 "Tag med på turen — 6 valgfrie kugler"
--       Pandekager med is      "2 hjemmelavede pandekager med 1 kugle is"
--       Affogato               "Espresso med vaniljeis" — smagen er
--                              givet, så der spørges ikke (0)
--       Churros med is og sauce — kortet siger IKKE hvor mange
--                              kugler. 0 = der spørges ikke om smag,
--                              til ejeren har sagt det (admin, "Is &
--                              sødt"). Et gæt var en gæst, der valgte
--                              to smage til én kugle.
-- ------------------------------------------------------------
/* ⚠️ IKKE `on commit drop`. Rapporten nederst står EFTER commit —
   SQL Editoren viser kun den sidste sætnings svar, og står commit
   sidst, viser den ingenting. Tabellen er midlertidig og forsvinder
   med forbindelsen; `drop … if exists` gør, at filen kan køres igen
   på en forbindelse, der er genbrugt. */
drop table if exists is_kort;
create temporary table is_kort (
  navn text, rolle text, kugler int, softice boolean
);

insert into is_kort values
  ('1 kugle',                                        'stoerrelse', null, null),
  ('2 kugler',                                       'stoerrelse', null, null),
  ('3 kugler',                                       'stoerrelse', null, null),
  ('4 kugler',                                       'stoerrelse', null, null),
  ('Softice, lille',                                 'stoerrelse', null, null),
  ('Softice, stor',                                  'stoerrelse', null, null),
  ('Ekstra kugle',                                   'tilbehoer',  1,    null),
  /* Det gamle navn — chefens-rettelser-25-9.sql omdøber den til
     "Sauce, topping eller guf" (linjen nedenfor rammer så begge).
     Står her, så filen virker i begge rækkefølger. */
  ('Strøssel, topping eller guf',                    'tilbehoer',  0,    null),
  ('Softice-top',                                    'tilbehoer',  0,    null),
  ('Sauce, topping eller guf',                       'tilbehoer',  0,    null),
  ('Isboks, ca. 6 kugler eller softice',             'boks',       6,    true),
  ('Havnens café-is',                                'dessert',    3,    false),
  ('Sundae med sauce og topping',                    'dessert',    0,    false),
  ('Bubblewaffle, 1 kugle',                          'dessert',    1,    false),
  ('Bubblewaffle, 2 kugler eller softice',           'dessert',    2,    true),
  ('Bubblewaffle mix',                               'dessert',    0,    false),
  ('Churros med sukker og kanel',                    'dessert',    0,    false),
  ('Churros med is og sauce',                        'dessert',    0,    false),
  ('2 hjemmelavede pandekager med sukker',           'dessert',    0,    false),
  ('2 hjemmelavede pandekager med is',               'dessert',    1,    false),
  ('2 hjemmelavede pandekager med 2 kugler is',      'dessert',    2,    false),
  ('Bakke med vaffelknas, softice, sauce og topping', 'dessert',   0,    false),
  ('Affogato',                                       'dessert',    0,    false),
  ('Løs vaffel',                                     'loes',       0,    null),
  ('Løs vaffel, glutenfri',                          'loes',       0,    null),
  ('Bøtte med topping',                              'loes',       0,    null);

do $$
declare
  raa     jsonb;
  ejerens jsonb := '{}'::jsonb;
  fra_kort jsonb;
begin
  select i.vaerdi into raa
    from public.indstillinger i
   where i.lokation_id = 'mosede' and i.noegle = 'is_opsaetning';

  /* Siden læser både et objekt og en tekst med JSON i (js/isbygger.js,
     opsaetning()). Filen gør det samme — ellers ville en tekst-form
     blive overskrevet, og ejerens valg forsvandt tavst. */
  if raa is not null and jsonb_typeof(raa) = 'object' then
    ejerens := raa;
  elsif raa is not null and jsonb_typeof(raa) = 'string' then
    begin
      ejerens := (raa #>> '{}')::jsonb;
      if jsonb_typeof(ejerens) <> 'object' then ejerens := '{}'::jsonb; end if;
    exception when others then
      ejerens := '{}'::jsonb;
    end;
  end if;

  select coalesce(jsonb_object_agg(
           mv.id::text,
           jsonb_strip_nulls(jsonb_build_object(
             'rolle',   k.rolle,
             'kugler',  k.kugler,
             'softice', k.softice))), '{}'::jsonb)
    into fra_kort
    from is_kort k
    join public.menu_kategorier mk
      on mk.lokation_id = 'mosede'
     and mk.afdeling = 'is'
    join public.menu_varer mv
      on mv.kategori_id = mk.id
     and lower(btrim(mv.navn)) = lower(btrim(k.navn));

  /* `||` lader HØJRE side vinde: ejerens valg lægges oven på kortets. */
  insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
  values ('mosede', 'is_opsaetning', fra_kort || ejerens, now())
  on conflict (lokation_id, noegle)
    do update set vaerdi = excluded.vaerdi, aendret = now()
    where public.indstillinger.vaerdi is distinct from excluded.vaerdi;
end $$;

commit;


-- ------------------------------------------------------------
--  RAPPORT. Supabases SQL Editor viser kun den SIDSTE sætnings
--  svar — derfor ét select til sidst, efter commit.
--
--  `varer_fundet` skal være 26. Er den mindre, står navnene på det,
--  filen ikke fandt, i `ikke_fundet` — så er en vare omdøbt, og den
--  står med det, navnet siger, til den flyttes i admin.
-- ------------------------------------------------------------
select
  /* ⚠️ RÆKKER, IKKE NAVNE: efter omdøbningen rammer "Sauce, topping
     eller guf" to rækker (kugleis og softice), og "Strøssel …"
     ingen. Tallet er 26 i begge rækkefølger. */
  (select count(distinct mv.id) from is_kort k
     join public.menu_kategorier mk
       on mk.lokation_id = 'mosede' and mk.afdeling = 'is'
     join public.menu_varer mv
       on mv.kategori_id = mk.id and lower(btrim(mv.navn)) = lower(btrim(k.navn))
    where (select vaerdi from public.indstillinger
            where lokation_id = 'mosede' and noegle = 'is_opsaetning') ? mv.id::text)
                                                    as varer_fundet_skal_vaere_26,
  (select string_agg(k.navn, ', ') from is_kort k
    where k.navn <> 'Strøssel, topping eller guf'   -- det gamle navn, se ovenfor
      and not exists (
      select 1 from public.menu_kategorier mk
        join public.menu_varer mv on mv.kategori_id = mk.id
       where mk.lokation_id = 'mosede' and mk.afdeling = 'is'
         and lower(btrim(mv.navn)) = lower(btrim(k.navn))))
                                                    as ikke_fundet,
  (select vaerdi #>> '{}' from public.indstillinger
    where lokation_id = 'mosede' and noegle = 'is_smage')
                                                    as smagene;
