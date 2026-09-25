-- ============================================================
--  ISENS SMAGE OG ISENS FORLØB  (25. september 2026)
-- ============================================================
--  Mikkels ord: *"jeg ved de har jordbær og vanilje og chokolade til
--  at starte med som kugler, tilføj det"* — og: *"hvis jeg vil vælge
--  en isboks, skal det være et andet bestillingsflow"*.
--
--  Filen skriver to indstillinger — og INGEN varer, INGEN priser:
--
--  1) `is_smage` — smagene til hver kugle: Jordbær, Vanilje,
--     Chokolade. Står der smage i forvejen, bliver de stående, og kun
--     de manglende lægges til. Ejerens egne ord overskrives aldrig.
--  2) `is_opsaetning` — hvor i bestillingen hver is-vare står
--     (størrelse, tilbehør, isboks, dessert, løst), hvor mange kugler
--     den har, og om den kan fås med softice. KORT 05, ordret.
--
--  ⚠️ REN SQL — INGEN DO-BLOKKE, INGEN LØKKER (25/9, aften).
--     Første udgave havde to plpgsql-blokke med en `foreach … loop`,
--     og i Supabases SQL Editor døde den med *"syntax error at or near
--     "loop" — LINE 1: end loop"*: `end loop` blev læst som en
--     sætning for sig. Teksten i editoren var 155 linjer mod filens
--     255 — noget var faldet ud under kopieringen, og en halv
--     plpgsql-blok giver en fejl, ingen kan læse. Nu er hver sætning
--     hel for sig, og der står ikke ét semikolon inde i en tekst.
--     Filen skrev INGENTING dengang (målt bagefter): intet er halvt.
--
--  ⚠️ TJEK LINJETALLET. Sidste linje i filen siger, hvilket nummer
--     den har. Står der et andet tal ud for den i editoren, mangler
--     der noget — kopiér hele filen igen (Ctrl+A i "Raw" på GitHub).
--
--  ⚠️ DEN MATCHER PÅ NAVN, ALDRIG PÅ ID. Indstillingen gemmer id'et
--     (det slår siden op på), men id'et FINDES ud fra varens navn
--     blandt varerne i afdelingen "is". Arret er
--     `kortets-priser-2.sql` (1/9). Står samme navn i to is-
--     kategorier ("Sauce, topping eller guf" efter
--     chefens-rettelser-25-9.sql), får begge samme plads.
--
--  ⚠️ EJERENS VALG VINDER. Har ejeren flyttet en vare i admin under
--     "Is & sødt", står hans valg: filen lægger kun de varer ind, der
--     ikke har et valg i forvejen. Den kan køres igen uden at røre
--     noget. Ingen ejer-blok: filen skriver kun i `indstillinger`.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================

begin;

-- ------------------------------------------------------------
--  1) SMAGENE — de tre lægges til, intet fjernes
--     ---------------------------------------------------------
--     Feltet er en tekst med én smag pr. linje (sådan skriver
--     admin det), men siden læser også komma, semikolon og en
--     liste. Skilletegnene står som chr(), så der ikke er et
--     semikolon inde i en tekst, en editor kan klippe over.
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
select 'mosede', 'is_smage', to_jsonb(string_agg(alle.s, chr(10) order by alle.nr)), now()
  from (
    with raa as (
      select i.vaerdi from public.indstillinger i
       where i.lokation_id = 'mosede' and i.noegle = 'is_smage'
    ), har as (
      select btrim(t.x) as s, t.nr
        from raa, regexp_split_to_table(
               case when jsonb_typeof(raa.vaerdi) = 'string' then raa.vaerdi #>> '{}' else '' end,
               '[,' || chr(59) || chr(10) || ']+') with ordinality as t(x, nr)
       where btrim(t.x) <> ''
      union all
      select btrim(t.x), t.nr
        from raa, jsonb_array_elements_text(
               case when jsonb_typeof(raa.vaerdi) = 'array' then raa.vaerdi else '[]'::jsonb end)
               with ordinality as t(x, nr)
       where btrim(t.x) <> ''
    )
    select har.s, har.nr from har
    union all
    select n.s, 1000 + n.nr
      from (values ('Jordbær', 1), ('Vanilje', 2), ('Chokolade', 3)) as n(s, nr)
     where not exists (select 1 from har where lower(har.s) = lower(n.s))
  ) as alle
on conflict (lokation_id, noegle)
  do update set vaerdi = excluded.vaerdi, aendret = now()
  where public.indstillinger.vaerdi is distinct from excluded.vaerdi;

-- ------------------------------------------------------------
--  2) HVOR HVER IS-VARE STÅR — kort 05, ordret
--     ---------------------------------------------------------
--     rolle:  stoerrelse = "Hvor mange kugler?" (trin 2)
--             tilbehoer  = "Noget mere?" (trin 4)
--             boks       = "Isboks" — fordel kuglerne på smagene
--             dessert    = "Desserter" — et kort pr. ret
--             loes       = "Løst" — sælges, som det er
--     kugler / softice: tomt = læses af navnet
--
--     Kortets egne ord bag de tal, der ikke står i navnet:
--       Havnens café-is    "3 kugler, softice-top, guf, …"
--       Isboks             "Tag med på turen — 6 valgfrie kugler"
--       Pandekager med is  "2 hjemmelavede pandekager med 1 kugle is"
--       Affogato           "Espresso med vaniljeis" — smagen er givet
--       Churros med is og sauce — kortet siger IKKE hvor mange
--                          kugler. 0 = der spørges ikke om smag, til
--                          ejeren har sat tallet i admin
--
--     ⚠️ IKKE `on commit drop`: rapporten nederst står EFTER commit
--     og læser listen. Tabellen forsvinder med forbindelsen.
-- ------------------------------------------------------------
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
  -- det gamle navn, før chefens-rettelser-25-9.sql — virker i begge rækkefølger
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

/* `||` lader HØJRE side vinde: ejerens valg lægges oven på kortets.
   Ejerens valg læses kun, når de er et objekt — sådan skriver admin
   dem. Målt i produktionen 25/9: der var ingen i forvejen. */
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
select 'mosede', 'is_opsaetning',
       coalesce((
         select jsonb_object_agg(mv.id::text, jsonb_strip_nulls(jsonb_build_object(
                  'rolle', k.rolle, 'kugler', k.kugler, 'softice', k.softice)))
           from is_kort k
           join public.menu_kategorier mk
             on mk.lokation_id = 'mosede' and mk.afdeling = 'is'
           join public.menu_varer mv
             on mv.kategori_id = mk.id
            and lower(btrim(mv.navn)) = lower(btrim(k.navn))
       ), '{}'::jsonb)
       || coalesce((
         select i.vaerdi from public.indstillinger i
          where i.lokation_id = 'mosede' and i.noegle = 'is_opsaetning'
            and jsonb_typeof(i.vaerdi) = 'object'
       ), '{}'::jsonb),
       now()
on conflict (lokation_id, noegle)
  do update set vaerdi = excluded.vaerdi, aendret = now()
  where public.indstillinger.vaerdi is distinct from excluded.vaerdi;

commit;


-- ------------------------------------------------------------
--  RAPPORT. SQL Editoren viser kun den SIDSTE sætnings svar.
--
--  `varer_fundet` skal være 26 (RÆKKER: efter chefens rettelser
--  rammer "Sauce, topping eller guf" to rækker og "Strøssel …"
--  ingen — 26 i begge rækkefølger). `ikke_fundet` skal være tom.
--  `smagene` skal vise Jordbær, Vanilje og Chokolade.
-- ------------------------------------------------------------
select
  (select count(distinct mv.id) from is_kort k
     join public.menu_kategorier mk
       on mk.lokation_id = 'mosede' and mk.afdeling = 'is'
     join public.menu_varer mv
       on mv.kategori_id = mk.id and lower(btrim(mv.navn)) = lower(btrim(k.navn))
    where (select vaerdi from public.indstillinger
            where lokation_id = 'mosede' and noegle = 'is_opsaetning') ? mv.id::text)
                                                    as varer_fundet_skal_vaere_26,
  (select string_agg(k.navn, ', ') from is_kort k
    where k.navn <> 'Strøssel, topping eller guf'
      and not exists (
      select 1 from public.menu_kategorier mk
        join public.menu_varer mv on mv.kategori_id = mk.id
       where mk.lokation_id = 'mosede' and mk.afdeling = 'is'
         and lower(btrim(mv.navn)) = lower(btrim(k.navn))))
                                                    as ikke_fundet,
  (select replace(vaerdi #>> '{}', chr(10), ', ') from public.indstillinger
    where lokation_id = 'mosede' and noegle = 'is_smage')
                                                    as smagene;

-- ⚠️ SLUT PÅ FILEN — det her er linje 198.
