-- ============================================================
--  RESTEN AF LUGENS KORT — det menukort.sql ikke nåede
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Ejerens fulde menukort kom 23. august 2026. menukort.sql var
--  skrevet af efter det trykte kort og ramte det meste — men
--  omkring tredive varer stod kun på den nye liste. Det er dem,
--  filen her lægger ind.
--
--  EN DUBLET ER VÆRRE END EN MANGLENDE VARE
--  ------------------------------------------------------------
--  Det er reglen, filen er skrevet efter. En vare, der mangler,
--  opdager ejeren i admin og tilføjer på ti sekunder. To varer,
--  der er den samme ret under to navne, får to forskellige
--  priser, og køkkenet får bestillinger på begge — uden at nogen
--  opdager hvorfor.
--
--  Derfor er seks linjer fra ejerens liste IKKE med her. De
--  ligner noget, vi allerede har, men ikke nok til at være
--  sikker. De står nederst i filen som en select, ejeren kan
--  læse og svare på:
--
--    "All in one sandwich"     vs. vores "Havnens all in one"
--    "Fransk hot dog alm/stor" vs. vores "Hansen fransk vaffel"
--    "Kebabmix"                vs. vores "Mix med pommes og salat"
--    "Bæger med vaffelknas"    vs. vores "Bøtte med topping"
--
--  Ingen priser er gættet — alle nye varer står som "??", til
--  ejeren skriver tallet i admin → Menukort.
--
--  Filen kan køres igen uden at duplikere noget.
-- ============================================================

-- ------------------------------------------------------------
--  Morgenmad — to retter manglede
-- ------------------------------------------------------------
insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Franskbrød med pålæg', null, null::numeric, false, 6),
  ('Brunchtallerken',
   'Spejl- eller røræg, bacon, pølse, skyr med knas, pålæg, marmelade, frugt, grønt, pandekage og bønner i tomat. Brød og smør.',
   null::numeric, true, 7)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Morgenmad' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- ------------------------------------------------------------
--  Tilkøb morgenmad (mad) — ejerens egen overskrift
--  Egen kategori og ikke tolv varer inde i Morgenmad: det er
--  noget, man lægger til en tallerken, ikke noget man bestiller
--  alene. Står de blandet sammen, kan gæsten bestille to skiver
--  bacon til morgenmad og ingenting at lægge dem på.
-- ------------------------------------------------------------
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'mad', 'Tilkøb morgenmad', 8
where not exists (select 1 from public.menu_kategorier where navn = 'Tilkøb morgenmad' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Blødkogt æg',        null, null::numeric, false, 1),
  ('Bacon, 2 skiver',    null, null::numeric, false, 2),
  ('Pålæg',              null, null::numeric, false, 3),
  ('Grønt',              null, null::numeric, false, 4),
  ('Marmelade',          null, null::numeric, false, 5),
  ('Smør',               null, null::numeric, false, 6),
  ('Pølser',             null, null::numeric, false, 7),
  ('Bønner i tomat',     null, null::numeric, false, 8),
  ('Frugt',              null, null::numeric, false, 9),
  ('Pandekage',          null, null::numeric, false, 10),
  ('Wienerbrød, en halv', null, null::numeric, false, 11)
  -- "Kage" stod på ejerens tilkøbsliste, men findes allerede under
  -- Kaffe og varme drikke. To rækker med samme navn får hver sin
  -- pris, og køkkenet får bestillinger på begge uden at nogen kan
  -- se hvorfor. Fundet af dublet-optællingen nederst i filen —
  -- ikke ved at læse. Skal et stykke kage til en brunchtallerken
  -- koste noget andet, opretter ejeren den selv i admin.
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Tilkøb morgenmad' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- ------------------------------------------------------------
--  Burgere — seks manglede
--  Flæskestegsburger og frikadelleburger er IKKE de samme som
--  vores flæskestegssandwich og frikadellesandwich: ejeren har
--  begge sæt på sit kort, og en burger og en sandwich er to
--  forskellige ting i en luge.
-- ------------------------------------------------------------
insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Dobbeltburger',      null, null::numeric, false, 7),
  ('Bearnaiseburger',    null, null::numeric, false, 8),
  ('Chilinaiseburger',   null, null::numeric, false, 9),
  ('Cheeseburger',       null, null::numeric, false, 10),
  ('Flæskestegsburger',  null, null::numeric, false, 11),
  ('Frikadelleburger',   null, null::numeric, false, 12)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Burgere og sandwich' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- ------------------------------------------------------------
--  Pølser — syv manglede
-- ------------------------------------------------------------
insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Ristet pølse',            null, null::numeric, false, 7),
  ('Ristet pølse med bacon',  null, null::numeric, false, 8),
  ('Frankfurter med bacon',   null, null::numeric, false, 9),
  ('Pølsebrød',               null, null::numeric, false, 10),
  ('Kradser med det hele',    null, null::numeric, false, 11),
  ('Ristet hotdog, lille',    null, null::numeric, false, 12),
  ('Ristet hotdog, stor',     null, null::numeric, false, 13)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Pølser' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- ------------------------------------------------------------
--  Fyld til smørrebrødet — to manglede
--  De lægges i FYLD-kategorien og ikke i Smørrebrød, fordi
--  skellet mellem et stykke og et fyld går på kategorien og ikke
--  på prisen. Se noten i js/store.js og README-afsnittet
--  "Model A: fyldet er varen".
-- ------------------------------------------------------------
insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Hakkebøf',   null, null::numeric, false, 30),
  ('Avokadomad', null, null::numeric, false, 31)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Vælg fyld til smørrebrødet' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- ------------------------------------------------------------
--  Is — to manglede
--  Thermoboxen er IKKE vores "ishorn med ca. 6 kugler": et horn
--  spises nu, en box tages med hjem i fryseren. Ejeren har begge
--  på sit kort.
-- ------------------------------------------------------------
insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('4 kugler', null, null::numeric, false, 4),
  ('Thermobox', 'Ca. 6 kugler is — eller fyldt med softice', null::numeric, false, 10)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Kugleis og ishorn' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- ------------------------------------------------------------
--  Kaffe og varme drikke — tre manglede
-- ------------------------------------------------------------
insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Iskugle i kaffen', null, null::numeric, false, 18),
  ('Sirup',            null, null::numeric, false, 19),
  ('Lumumba',          'Kold eller varm', null::numeric, false, 20)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Kaffe og varme drikke' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- ------------------------------------------------------------
--  Baren — bitter manglede
-- ------------------------------------------------------------
insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Bitter', null, null::numeric, false, 15)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Sodavand, juice og kakao' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- ------------------------------------------------------------
--  Æblekage — den hører til kagen og ikke til isen
-- ------------------------------------------------------------
insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Gammeldags æblekage', null, null::numeric, false, 21)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Kaffe og varme drikke' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- ============================================================
--  OPTÆLLING OG DE FIRE, EJEREN SKAL SVARE PÅ
--  ------------------------------------------------------------
--  SQL-editoren viser kun den sidste sætnings svar. Derfor står
--  både tallene og spørgsmålene i én select.
-- ============================================================
select * from (
  select 1 as raekke, 'HELE KORTET' as hvad,
         count(*)::text || ' varer i '
           || (select count(*) from public.menu_kategorier where lokation_id = 'mosede')::text
           || ' kategorier' as svar
    from public.menu_varer v
    join public.menu_kategorier k on k.id = v.kategori_id
   where k.lokation_id = 'mosede'
  union all
  select 2, 'UDEN PRIS',
         count(*)::text || ' varer viser "??" indtil prisen sættes i admin'
    from public.menu_varer v
    join public.menu_kategorier k on k.id = v.kategori_id
   where k.lokation_id = 'mosede' and v.pris is null
  union all
  /* DUBLETVAGTEN. Den her linje fandt en fejl, da filen blev
     skrevet: "Kage" var på vej ind i Tilkøb morgenmad, mens den
     allerede stod under Kaffe og varme drikke. Det kunne ikke
     ses ved at læse — kun ved at tælle.
     De to, der står tilbage, er der i forvejen og kan være
     med vilje ("Sauce, topping eller guf" hører til begge slags
     is). Linjen dømmer derfor ikke, den VISER. */
  select 3, 'DUBLETTER',
         coalesce((select string_agg(navn || ' (' || antal || ')', ', ')
                     from (select v.navn, count(*) as antal
                             from public.menu_varer v
                             join public.menu_kategorier k on k.id = v.kategori_id
                            where k.lokation_id = 'mosede'
                            group by v.navn having count(*) > 1) d),
                  'ingen — hver vare findes ét sted')
  union all
  select 4, 'SPØRG EJEREN', 'Er "All in one sandwich" det samme som vores "Havnens all in one"?'
  union all
  select 5, 'SPØRG EJEREN', 'Er "Fransk hotdog alm./stor" det samme som "Hansen fransk vaffel, lille/stor"?'
  union all
  select 6, 'SPØRG EJEREN', 'Er "Kebabmix" det samme som "Mix med pommes og salat"?'
  union all
  select 7, 'SPØRG EJEREN', 'Er "Bæger med vaffelknas og softice" det samme som "Bøtte med topping"?'
) t order by raekke;
