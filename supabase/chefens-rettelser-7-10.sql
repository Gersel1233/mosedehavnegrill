-- ============================================================
--  CHEFENS RETTELSER 7/10 — MENUKORTET, SOM HAN VIL HAVE DET
--  ------------------------------------------------------------
--  Chefens besked til Mikkel: *"Vi kan ikke Lancere noget der ikke
--  er helt korrekt, gælder både Menukort og Hjemmesiden …"* —
--  efterfulgt af en liste pr. afsnit. Mikkels afgørelse 7/10:
--  *"Vi går videre med de ting, der kan rettes nu."* Det, der
--  stadig er uklart, venter, og står nederst i den her note.
--
--  ⚠️ KUN DET, CHEFEN SKREV. Priserne og navnene herunder er
--     læst af hans besked, ikke af databasen. Hvor han ikke gav en
--     pris, bruges den, der står (sandwichene 75, isvand 25) — og
--     kun hvis der er ÉN række med det navn i hele tabellen. Er der
--     to, rører filen den ikke, og rapporten siger NEJ.
--
--  ⚠️ ET NAVN ER IKKE UNIKT. "Flæskesteg med surt", "Frikadelle med
--     surt" og "Roastbeef med remoulade og løg" står OGSÅ i den
--     slukkede "Vælg fyld til smørrebrødet" — uden pris, med vilje.
--     Derfor omdøber filen altid INDEN FOR EN KATEGORI. Uden det
--     ville fyldet få "Hjemmelavet" foran, og prøve 12 i
--     kortene-endelige-1-10.sql faldt netop på den fælde 1/10.
--
--  ⚠️ OMDØBNINGERNE SKAL FØLGES AF TO FILER. js/admin/valgforslag.js
--     (admins "Brug valgene") og js/skal/menukort-kort.js (det
--     trykte kort på skærmen) slår op på det eksakte navn. Prøven
--     "Kortenes omdøbninger" i tests/menukort-admin.spec.js læser
--     ret(...)-linjerne UD AF DEN HER FIL og fælder den næste, der
--     glemmes. Derfor står hver omdøbning som en ret(...)-linje.
--
--  VENTER (rettes IKKE her):
--    · "Tilføjes 1 foran Spejlæg" under Fisk & klassikere — der er
--      ingen spejlæg-linje dér; hvilken han mener, er ikke afklaret
--    · Børnekoppens tekst ("uden is") — varen oprettes til 59 uden tekst
--    · "Æg & bacon" som selvstændig vare — der er ingen pris. Og
--      Morgenkomplet siger "æg ELLER bacon": at skrive "æg & bacon"
--      lover gæsten begge dele til samme pris, og det er ikke sagt
--    · Afsnittet "Frokost" — det nye kort 1 er ikke set; varerne er
--      rettet, men de flyttes ikke til et afsnit, siden ikke kender
--    · Juleplattens periode og indhold — admin styrer det
--      (vis_fra/vis_til på varen), når det er besluttet
--
--  Kan køres igen. Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
--  Prøvet 7/10 på en lokal Postgres med produktionens egne rækker
--  sået ind (læst med anon-nøglen), to gange i træk.
-- ============================================================
begin;

-- ------------------------------------------------------------
--  0) SKRIV SOM EJEREN
--     `menu_vare_pris_ejer` (roller.sql) afviser en pris- eller
--     tillægsændring fra en fil uden claims. Samme greb som
--     kortene-endelige-1-10.sql og chefens-rettelser-29-9.sql.
-- ------------------------------------------------------------
do $$
declare v_ejer text;
begin
  select a.email into v_ejer
    from public.admin_adgang a
   where a.lokation_id = 'mosede' and a.aktiv and a.rolle = 'ejer'
   order by a.email limit 1;
  if v_ejer is null then
    raise exception 'Ingen aktiv ejer i admin_adgang for mosede. Intet er aendret.';
  end if;
  perform set_config('request.jwt.claims', json_build_object('email', v_ejer)::text, true);
end $$;

-- ------------------------------------------------------------
--  HJÆLPERNE
-- ------------------------------------------------------------
/* Omdøb (og evt. ny tekst) — kun det GAMLE navn, kun i kategorien,
   når den er givet. Samme form som kortenes-tekster-30-9.sql, så
   prøven kan læse begge filer med det samme mønster. */
create or replace function pg_temp.ret(gammel text, nyt_navn text,
  ny_beskrivelse text default null, slet_beskrivelse boolean default false,
  kategori text default null)
returns void language sql as $$
  update public.menu_varer mv
     set navn = coalesce(nyt_navn, mv.navn),
         beskrivelse = case when slet_beskrivelse then null
                            else coalesce(ny_beskrivelse, mv.beskrivelse) end
    from public.menu_kategorier mk
   where mk.id = mv.kategori_id
     and mk.lokation_id = 'mosede'
     and btrim(mv.navn) = gammel
     and (kategori is null or btrim(mk.navn) = kategori);
$$;

/* Den engelske udgave af en vare. ⚠️ NØGLEN ER DET NYE DANSKE NAVN:
   kaldes den efter ret(...), og en engelsk side må ikke stå med to
   ens linjer ("RTD" og "RTD"), når den danske siger 1 og 3 stk. */
create or replace function pg_temp.en(p_kat text, p_navn text, p_en_navn text,
  p_en_beskrivelse text default null)
returns void language sql as $$
  update public.menu_varer mv
     set oversaettelser = jsonb_set(coalesce(mv.oversaettelser, '{}'::jsonb), '{en}',
           jsonb_strip_nulls(jsonb_build_object('navn', p_en_navn, 'beskrivelse', p_en_beskrivelse)))
    from public.menu_kategorier mk
   where mk.id = mv.kategori_id
     and mk.lokation_id = 'mosede'
     and btrim(mk.navn) = p_kat
     and btrim(mv.navn) = p_navn;
$$;

/* En ny vare — men kun hvis navnet IKKE findes i forvejen, i HELE
   tabellen. Kortene-endelige-1-10.sql nåede at lave to Platter, fordi
   den kun kiggede i én kategori. */
/* ⚠️ PARAMETRENE HEDDER p_… MED VILJE. I en SQL-funktion vinder et
   KOLONNENAVN over en parameter med samme navn — med en parameter
   "navn" ville opslaget "findes navnet i forvejen?" sammenligne
   kolonnen med sig selv og aldrig oprette noget. */
create or replace function pg_temp.ny(p_kat text, p_navn text, p_pris numeric,
  p_beskrivelse text, p_sortering int, p_en_navn text, p_en_beskrivelse text default null,
  p_valg jsonb default null)
returns void language sql as $$
  insert into public.menu_varer
    (kategori_id, lokation_id, navn, beskrivelse, pris, sortering, aktiv, valg, oversaettelser)
  select mk.id, 'mosede', p_navn, p_beskrivelse, p_pris, p_sortering, true, p_valg,
         jsonb_build_object('en', jsonb_strip_nulls(
           jsonb_build_object('navn', p_en_navn, 'beskrivelse', p_en_beskrivelse)))
    from public.menu_kategorier mk
   where mk.lokation_id = 'mosede' and btrim(mk.navn) = p_kat
     and not exists (select 1 from public.menu_varer x
                      where x.lokation_id = 'mosede'
                        and lower(btrim(x.navn)) = lower(btrim(p_navn)))
   limit 1;
$$;

/* Tillægget på et valg (fx "Stor"). Prisen på Stor ER grundpris +
   tillæg (Butik.valgTillaeg) — der er ingen anden kolonne. */
create or replace function pg_temp.tillaeg(p_kat text, p_navn text, p_valg_navn text, p_nyt int)
returns void language sql as $$
  update public.menu_varer mv
     set valg = (select jsonb_agg(case
                   when jsonb_typeof(e) = 'object' and e->>'navn' = p_valg_navn
                     then jsonb_set(e, '{tillaeg}', to_jsonb(p_nyt))
                   else e end order by n)
                   from jsonb_array_elements(mv.valg) with ordinality as t(e, n))
    from public.menu_kategorier mk
   where mk.id = mv.kategori_id
     and mk.lokation_id = 'mosede'
     and btrim(mk.navn) = p_kat
     and btrim(mv.navn) = p_navn
     and mv.valg is not null;
$$;

/* En pris — inden for kategorien. */
create or replace function pg_temp.pris(p_kat text, p_navn text, p_ny numeric)
returns void language sql as $$
  update public.menu_varer mv
     set pris = p_ny
    from public.menu_kategorier mk
   where mk.id = mv.kategori_id
     and mk.lokation_id = 'mosede'
     and btrim(mk.navn) = p_kat
     and btrim(mv.navn) = p_navn
     and mv.pris is distinct from p_ny;
$$;

-- ------------------------------------------------------------
--  1) BURGERE & SANDWICHES — DE TRE SANDWICH ER TILBAGE
--     Chefen: *"Under burgere mangler der: Frikadelle Sandwich,
--     Flæskestegs Sandwich, Bøfsandwich."* De blev slukket 25/9
--     (sluk-det-kortene-ikke-viser.sql) og er TÆNDT igen her — med
--     den pris, de har. Mikkel: *"behold den eksisterende
--     databasepris, hvis der ligger én entydig pris."* Det gør der
--     (75, én række hver); er det ikke længere sandt, tændes de ikke.
--     Rækkefølgen er chefens: frikadelle, flæskesteg, bøf, så den
--     almindelige.
-- ------------------------------------------------------------
update public.menu_varer mv
   set aktiv = true,
       sortering = case lower(btrim(mv.navn))
                     when 'frikadellesandwich' then 1
                     when 'flæskestegssandwich' then 2
                     when 'bøfsandwich' then 3 end
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id
   and mk.lokation_id = 'mosede'
   and btrim(mk.navn) = 'Sandwich'
   and lower(btrim(mv.navn)) in ('frikadellesandwich', 'flæskestegssandwich', 'bøfsandwich')
   and mv.pris is not null
   and (select count(*) from public.menu_varer x
         where x.lokation_id = 'mosede'
           and lower(btrim(x.navn)) = lower(btrim(mv.navn))) = 1;

/* ⚠️ INGEN DUBLETTER. Er frikadelle og flæskesteg egne varer, må de
   ikke OGSÅ være fyld i den almindelige sandwich — så står de to
   gange i kurven, til samme pris, og køkkenet får to slags bon for
   den samme mad. Mikkel: *"fjern dem som varianter fra den generelle
   Sandwich 75,-."* Kun de to valg tages ud; resten står. Og teksten
   følger med — ellers lover beskrivelsen et fyld, valget ikke har. */
update public.menu_varer mv
   set valg = (select jsonb_agg(e order by n)
                 from jsonb_array_elements(mv.valg) with ordinality as t(e, n)
                where lower(coalesce(e->>'navn', e #>> '{}')) not in ('frikadelle', 'flæskesteg')),
       beskrivelse = replace(replace(mv.beskrivelse, 'frikadelle, ', ''), 'flæskesteg, ', ''),
       oversaettelser = case when mv.oversaettelser #>> '{en,beskrivelse}' is null then mv.oversaettelser
         else jsonb_set(mv.oversaettelser, '{en,beskrivelse}', to_jsonb(
           replace(replace(mv.oversaettelser #>> '{en,beskrivelse}', 'frikadelle, ', ''), 'roast pork, ', '')))
         end
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id
   and mk.lokation_id = 'mosede'
   and btrim(mk.navn) = 'Sandwich'
   and btrim(mv.navn) = 'Sandwich'
   and mv.valg is not null
   and exists (select 1 from jsonb_array_elements(mv.valg) e
                where lower(coalesce(e->>'navn', e #>> '{}')) in ('frikadelle', 'flæskesteg'));

select pg_temp.en('Sandwich', 'Frikadellesandwich', 'Frikadelle sandwich – Danish meatball');
select pg_temp.en('Sandwich', 'Flæskestegssandwich', 'Roast pork sandwich');
select pg_temp.en('Sandwich', 'Bøfsandwich', 'Bøfsandwich – Danish beef patty sandwich');

-- ------------------------------------------------------------
--  2) ANDRE RETTER
-- ------------------------------------------------------------
select pg_temp.ret('Blandet salat', 'Husets blandede salat', kategori => 'Andre retter');
select pg_temp.en('Andre retter', 'Husets blandede salat', 'House mixed salad');

/* Chefen: *"Snack Kurv, 2 Indbagte Rejer, 2 Cheesetops, 2 Minirulller,
   & 2 Løgringe."* Teksten erstatter "Med en dip". */
select pg_temp.ret('Snackkurv', null, '2 indbagte rejer, 2 cheesetops, 2 miniruller & 2 løgringe',
                   kategori => 'Andre retter');
select pg_temp.en('Andre retter', 'Snackkurv', 'Snack basket',
                  '2 battered prawns, 2 cheese tops, 2 mini spring rolls & 2 onion rings');

-- ------------------------------------------------------------
--  3) KAFFE — LILLE OG STOR
--     Latte Ice stor 70: grundprisen 50 står, tillægget 15 → 20.
--     Kakao lille 45: grundprisen 40 → 45. ⚠️ STOR BLIVER 65 — chefen
--     nævnte den ikke, så tillægget går 25 → 20. Uden det ville stor
--     kakao stige til 70, uden at nogen havde bedt om det.
-- ------------------------------------------------------------
select pg_temp.tillaeg('Kaffe og varme drikke', 'Latte Ice', 'Stor', 20);
select pg_temp.pris('Kaffe og varme drikke', 'Kakao', 45);
select pg_temp.tillaeg('Kaffe og varme drikke', 'Kakao', 'Stor', 20);

-- ------------------------------------------------------------
--  4) VARMT & EKSTRA — LUMUMBA OG IRISH COFFEE I TO STØRRELSER
--     Chefen: *"Lumumba varm el. Kold Lille 3 Cl. 75,-, Stor 6 Cl.
--     145,- · Irish Coffee Lille 3 Cl. 75,-, Stor 6 Cl. 145,-"*.
--     To varer hver, som Irish coffee allerede var — IKKE et valg
--     "Lille/Stor": så ville kaffetabellen på menukortet tage dem
--     (den samler alt med et "Stor"-valg) og flytte dem ud af
--     Varmt & ekstra. "Varm eller kold" er stadig valget på bonen.
-- ------------------------------------------------------------
select pg_temp.ret('Lumumba, varm eller kold', 'Lumumba, lille 3 cl', 'Varm eller kold',
                   kategori => 'Kaffe og varme drikke');
select pg_temp.en('Kaffe og varme drikke', 'Lumumba, lille 3 cl',
                  'Lumumba – cocoa with rum, small 3 cl', 'Hot or cold');
select pg_temp.ny('Kaffe og varme drikke', 'Lumumba, stor 6 cl', 145, 'Varm eller kold', 161,
                  'Lumumba – cocoa with rum, large 6 cl', 'Hot or cold', '["Varm", "Kold"]'::jsonb);

select pg_temp.ret('Irish coffee', 'Irish coffee, lille 3 cl', kategori => 'Kaffe og varme drikke');
select pg_temp.en('Kaffe og varme drikke', 'Irish coffee, lille 3 cl', 'Irish Coffee, small 3 cl');
select pg_temp.ret('Irish coffee, stor', 'Irish coffee, stor 6 cl', kategori => 'Kaffe og varme drikke');
select pg_temp.en('Kaffe og varme drikke', 'Irish coffee, stor 6 cl', 'Irish Coffee, large 6 cl');
/* Den store stod på 15 — lige efter espressoen og langt fra den
   lille (170). I bestillingslisten står de nu side om side. */
update public.menu_varer mv set sortering = 171
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id and mk.lokation_id = 'mosede'
   and btrim(mk.navn) = 'Kaffe og varme drikke'
   and btrim(mv.navn) = 'Irish coffee, stor 6 cl' and mv.sortering <> 171;

-- ------------------------------------------------------------
--  5) KAGE
-- ------------------------------------------------------------
select pg_temp.pris('Kaffe og varme drikke', 'Flødekager', 45);
select pg_temp.ny('Kaffe og varme drikke', 'Småkagefad til 2 personer', 25, null, 221,
                  'Cookie platter for 2');
select pg_temp.ny('Kaffe og varme drikke', 'Hjemmelavede cookies', 20, null, 222,
                  'Homemade cookies');

-- ------------------------------------------------------------
--  6) KOLDE DRIKKE (og BAR — RTD står begge steder, som chefen
--     skrev; det er menukort-kort.js, der viser den i baren)
--     ⚠️ ISVAND BEHOLDER SIN PRIS (25). Chefen skrev "Isvand Kande"
--     uden pris; Mikkel: *"lad pris afvente hvis der ikke allerede
--     findes en entydig pris."* Der er én række, og den koster 25.
-- ------------------------------------------------------------
update public.menu_varer mv set navn = 'Isvand, kande'
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id and mk.lokation_id = 'mosede'
   and btrim(mk.navn) = 'Sodavand, juice og kakao'
   and btrim(mv.navn) = 'Isvand'
   and (select count(*) from public.menu_varer x
         where x.lokation_id = 'mosede' and lower(btrim(x.navn)) = 'isvand') = 1;
select pg_temp.en('Sodavand, juice og kakao', 'Isvand, kande', 'Iced water, jug');

select pg_temp.ret('RTD', 'RTD, 1 stk. Breezer eller Smirnoff', kategori => 'Sodavand, juice og kakao');
select pg_temp.en('Sodavand, juice og kakao', 'RTD, 1 stk. Breezer eller Smirnoff',
                  'RTD, 1 Breezer or Smirnoff');
select pg_temp.ny('Sodavand, juice og kakao', 'RTD, 3 stk. Breezer eller Smirnoff', 100, null, 11,
                  'RTD, 3 Breezer or Smirnoff');

-- ------------------------------------------------------------
--  7) IS OG SOFTICE
--     Børnekop 59 oprettes UDEN tekst: "uden is" er ikke afklaret.
-- ------------------------------------------------------------
select pg_temp.ny('Kugleis', 'Børnekop', 59, null, 11, 'Kids'' cup');
select pg_temp.pris('Softice og vafler', 'Bakke med vaffelknas, softice, sauce og topping', 67);

-- ------------------------------------------------------------
--  8) SØDT
--     ⚠️ PANDEKAGERNE ER DEN SAMME VARE MED NYT NAVN OG NY PRIS, ikke en
--     ny ved siden af. To linjer med "2 hjemmelavede pandekager" til 45
--     og 50 er præcis den dublet, Mikkel bad os undgå.
-- ------------------------------------------------------------
select pg_temp.ny('Softice og vafler', 'Hjemmelavet koldskål', 35, null, 28,
                  'Homemade koldskål – cold buttermilk dessert');
select pg_temp.ny('Softice og vafler', 'Dagens frugtfad', 45, null, 29, 'Fruit platter of the day');
select pg_temp.ret('2 hjemmelavede pandekager', '2 stk. hjemmelavede pandekager med sukker eller syltetøj',
                   kategori => 'Softice og vafler');
select pg_temp.pris('Softice og vafler', '2 stk. hjemmelavede pandekager med sukker eller syltetøj', 50);
select pg_temp.en('Softice og vafler', '2 stk. hjemmelavede pandekager med sukker eller syltetøj',
                  '2 homemade pancakes with sugar or jam');

-- ------------------------------------------------------------
--  9) SLIK & SNACKS (Dagens frugtfad står også her — menukort-kort.js)
-- ------------------------------------------------------------
select pg_temp.ny('Snacks og slik', 'Slikpind', 8, null, 8, 'Lollipop');
select pg_temp.ny('Snacks og slik', '1 stk. frugt', 8, null, 9, '1 piece of fruit');

-- ------------------------------------------------------------
--  10) MORGENMAD — "Morgenkomplet" i ét ord, som chefen skriver
-- ------------------------------------------------------------
select pg_temp.ret('Morgen komplet', 'Morgenkomplet', kategori => 'Morgenmad');

-- ------------------------------------------------------------
--  11) FROKOST — HVIDLØGSBRØDET, PLATTEN OG JULEPLATTEN
--     ⚠️ JULEPLATTEN HAR INGEN PERIODE ENDNU. Mikkel: *"indhold/periode
--     kan administreres senere via admin."* vis_fra/vis_til står tomme;
--     admin sætter dem på varen. Den ligger i Platter, så kategoriens
--     24 timers varsel gælder den også.
--     "Kun på hjemmesiden" er kortet og ikke systemet:
--     vaerktoej/sammenlign-kort.py springer Platter over (CATERING), så
--     en senere sammenligning med de trykte kort slukker den ikke.
-- ------------------------------------------------------------
select pg_temp.ret('Hjemmelavet hvidløgsbrød med tomat & ost',
                   '1 stk. hjemmelavet hvidløgsbrød med tomat & ost', kategori => 'Andre retter');
select pg_temp.en('Andre retter', '1 stk. hjemmelavet hvidløgsbrød med tomat & ost',
                  '1 homemade garlic bread with tomato & cheese');

select pg_temp.pris('Platter', 'Platte', 199);
select pg_temp.ret('Platte', null, 'Inkl. friskbagt brød og smør', kategori => 'Platter');
select pg_temp.en('Platter', 'Platte', 'Platter', 'Incl. freshly baked bread and butter');
select pg_temp.ny('Platter', 'Juleplatte', 199, 'Inkl. friskbagt brød og smør', 1,
                  'Christmas platter', 'Incl. freshly baked bread and butter');

-- ------------------------------------------------------------
--  12) SMØRREBRØD OG HÅNDMADDER
--     "Hjemmelavet" foran — kun i de to kategorier (se noten øverst).
--     ⚠️ Chefen nævner frikadellen under smørrebrød, men IKKE under
--     håndmadder. Den håndmad står urørt, til han har svaret.
-- ------------------------------------------------------------
select pg_temp.ret('Flæskesteg med surt', 'Hjemmelavet flæskesteg med surt', kategori => 'Smørrebrød');
select pg_temp.ret('Frikadelle med surt', 'Hjemmelavet frikadelle med surt', kategori => 'Smørrebrød');
select pg_temp.ret('Roastbeef med remoulade og løg', 'Hjemmelavet roastbeef med remoulade og løg', kategori => 'Smørrebrød');
select pg_temp.ret('Flæskesteg med surt, håndmad', 'Hjemmelavet flæskesteg med surt, håndmad', kategori => 'Håndmadder');
select pg_temp.ret('Roastbeef med remoulade og løg, håndmad', 'Hjemmelavet roastbeef med remoulade og løg, håndmad', kategori => 'Håndmadder');

select pg_temp.en('Smørrebrød', 'Hjemmelavet flæskesteg med surt', 'Homemade flæskesteg – roast pork with pickles');
select pg_temp.en('Smørrebrød', 'Hjemmelavet frikadelle med surt', 'Homemade frikadelle – Danish meatball with pickles');
select pg_temp.en('Smørrebrød', 'Hjemmelavet roastbeef med remoulade og løg', 'Homemade roast beef with remoulade & onion');
select pg_temp.en('Håndmadder', 'Hjemmelavet flæskesteg med surt, håndmad', 'Homemade flæskesteg – roast pork with pickles');
select pg_temp.en('Håndmadder', 'Hjemmelavet roastbeef med remoulade og løg, håndmad', 'Homemade roast beef with remoulade & onion');

/* Chefen: *"Fiskefilet med Rejer og Mayo +10,-kr."* — grundprisen er
   55, altså 65. Kun smørrebrødet; fyldet uden pris røres ikke. */
select pg_temp.pris('Smørrebrød', 'Fiskefilet med rejer og mayo', 65);

/* Chefen: *"Tartar skal IKKE bestilles dagen før."* Teksten står tre
   steder i databasen: på varen og i smørrebrødets note. (Boksene på
   kortet er menukort-kort.js.) Kun hvis teksten er præcis den — har
   ejeren skrevet noget andet siden, står det. */
update public.menu_varer mv set beskrivelse = null
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id and mk.lokation_id = 'mosede'
   and lower(btrim(mv.navn)) = 'tartarmad'
   and lower(btrim(coalesce(mv.beskrivelse, ''))) = 'bestilles dagen før';

update public.menu_kategorier
   set note = btrim(replace(note, 'Tartar bestilles dagen før.', ''))
 where lokation_id = 'mosede' and btrim(navn) = 'Smørrebrød'
   and note like '%Tartar bestilles dagen før.%';

commit;


-- ============================================================
--  RAPPORTEN — alt skal sige JA. SQL Editoren viser kun den
--  SIDSTE sætnings svar, så det er én tabel.
--  ⚠️ TALLENE ER CHEFENS, fra hans besked 7/10 — ikke læst af
--     databasen. Det er dem, der gør rapporten til en måling.
-- ============================================================
with v as (
  select mv.*, mk.navn as kat from public.menu_varer mv
    join public.menu_kategorier mk on mk.id = mv.kategori_id
   where mk.lokation_id = 'mosede'),
forventet(kat, navn, pris) as (values
  ('Sandwich', 'Frikadellesandwich', 75), ('Sandwich', 'Flæskestegssandwich', 75),
  ('Sandwich', 'Bøfsandwich', 75),
  ('Kaffe og varme drikke', 'Kakao', 45), ('Kaffe og varme drikke', 'Flødekager', 45),
  ('Kaffe og varme drikke', 'Lumumba, lille 3 cl', 75), ('Kaffe og varme drikke', 'Lumumba, stor 6 cl', 145),
  ('Kaffe og varme drikke', 'Irish coffee, lille 3 cl', 75), ('Kaffe og varme drikke', 'Irish coffee, stor 6 cl', 145),
  ('Kaffe og varme drikke', 'Småkagefad til 2 personer', 25), ('Kaffe og varme drikke', 'Hjemmelavede cookies', 20),
  ('Sodavand, juice og kakao', 'RTD, 1 stk. Breezer eller Smirnoff', 40),
  ('Sodavand, juice og kakao', 'RTD, 3 stk. Breezer eller Smirnoff', 100),
  ('Kugleis', 'Børnekop', 59),
  ('Softice og vafler', 'Bakke med vaffelknas, softice, sauce og topping', 67),
  ('Softice og vafler', 'Hjemmelavet koldskål', 35), ('Softice og vafler', 'Dagens frugtfad', 45),
  ('Softice og vafler', '2 stk. hjemmelavede pandekager med sukker eller syltetøj', 50),
  ('Snacks og slik', 'Slikpind', 8), ('Snacks og slik', '1 stk. frugt', 8),
  ('Platter', 'Platte', 199), ('Platter', 'Juleplatte', 199),
  ('Smørrebrød', 'Fiskefilet med rejer og mayo', 65),
  ('Smørrebrød', 'Hjemmelavet flæskesteg med surt', 55),
  ('Smørrebrød', 'Hjemmelavet frikadelle med surt', 55),
  ('Smørrebrød', 'Hjemmelavet roastbeef med remoulade og løg', 55),
  ('Håndmadder', 'Hjemmelavet flæskesteg med surt, håndmad', 27),
  ('Håndmadder', 'Hjemmelavet roastbeef med remoulade og løg, håndmad', 27),
  ('Andre retter', 'Husets blandede salat', 55),
  ('Andre retter', '1 stk. hjemmelavet hvidløgsbrød med tomat & ost', 45),
  ('Morgenmad', 'Morgenkomplet', 99),
  ('Sodavand, juice og kakao', 'Isvand, kande', 25))
select
  /* Hver af chefens linjer: præcis ÉN tændt række, i sin kategori,
     til hans pris. Tom liste = JA. */
  coalesce((select string_agg(f.navn || ' (' || coalesce(
              (select string_agg(coalesce(v.pris::text, 'ingen pris') || case when v.aktiv then '' else ' slukket' end, ', ')
                 from v where v.kat = f.kat and v.navn = f.navn), 'mangler') || ')', ' · ')
              from forventet f
             where (select count(*) from v where v.kat = f.kat and v.navn = f.navn
                      and v.aktiv and v.pris = f.pris) <> 1
                /* Fyldet bærer de samme navne uden pris med vilje (se øverst). */
                or (select count(*) from v where v.navn = f.navn
                      and v.kat <> 'Vælg fyld til smørrebrødet') <> 1), 'JA')
                                                             as chefens_linjer_skal_vaere_JA,
  /* Stor = grundpris + tillæg. Chefens tal: Latte Ice stor 70; kakao
     stor står, som den stod (65). */
  case when (select pris + (select (e->>'tillaeg')::numeric from jsonb_array_elements(valg) e where e->>'navn' = 'Stor')
               from v where kat = 'Kaffe og varme drikke' and navn = 'Latte Ice') = 70
        and (select pris + (select (e->>'tillaeg')::numeric from jsonb_array_elements(valg) e where e->>'navn' = 'Stor')
               from v where kat = 'Kaffe og varme drikke' and navn = 'Kakao') = 65
       then 'JA' else '** NEJ **' end                        as stor_latte_70_kakao_65,
  case when (select bool_and(not (valg @> '["Frikadelle"]' or valg @> '["Flæskesteg"]'))
               from v where kat = 'Sandwich' and navn = 'Sandwich')
        and (select beskrivelse not ilike '%frikadelle%' and beskrivelse not ilike '%flæskesteg%'
               from v where kat = 'Sandwich' and navn = 'Sandwich')
       then 'JA' else '** NEJ **' end                        as sandwich_uden_dubletter,
  case when (select valg = '["Varm", "Kold"]'::jsonb from v where navn = 'Lumumba, stor 6 cl')
       then 'JA' else '** NEJ **' end                        as stor_lumumba_spoerger_varm_kold,
  case when not exists (select 1 from v where beskrivelse ilike '%dagen før%' and navn ilike '%tartar%')
        and not exists (select 1 from public.menu_kategorier where lokation_id = 'mosede' and note ilike '%tartar bestilles%')
       then 'JA' else '** NEJ **' end                        as tartar_uden_dagen_foer,
  /* ⚠️ FYLDET MÅ IKKE VÆRE RØRT — det er hele grunden til kategorien
     i ret(...). Tallet 4 er de fire navne, fyldet bar 7/10. */
  case when (select count(*) from v where kat = 'Vælg fyld til smørrebrødet'
               and navn in ('Flæskesteg med surt', 'Frikadelle med surt',
                            'Roastbeef med remoulade og løg', 'Fiskefilet med rejer og mayo')
               and pris is null) = 4
       then 'JA' else '** NEJ **' end                        as fyldet_uroert,
  (select count(*) from v where navn in ('Blandet salat', 'Morgen komplet', 'RTD', 'Isvand',
     'Irish coffee', 'Irish coffee, stor', 'Lumumba, varm eller kold', '2 hjemmelavede pandekager')
     and kat <> 'Vælg fyld til smørrebrødet')               as gamle_navn_skal_vaere_0;
