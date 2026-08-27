-- ============================================================
--  EJERENS EGEN LISTE, KØRT IGENNEM MOD KORTET  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER menukort.sql, menukort-ud-af-huset.sql og
--  menukort-resten.sql. Filen kan køres igen: den tilføjer kun
--  det, der ikke er der, og retter kun de beskrivelser, der står
--  navngivet herunder.
--
--  HVAD DEN GØR
--  ------------------------------------------------------------
--  Ejeren sendte hele sortimentet igen (24/8), og listen er
--  sammenlignet post for post med de 230 varer, der allerede står
--  i databasen. Filen lukker de huller, der var ÉNTYDIGE:
--
--    1) en ny kategori: glutenfri, laktosefri og vegansk
--    2) syv varer, der manglede
--    3) otte beskrivelser, ejeren har skrevet indholdet på
--    4) en notekolonne på kategorien — "På toastbrød eller
--       rugbrød" hører til HELE pindemaden, ikke til hver linje
--
--  INGEN PRISER. Ejerens liste har ikke ét tal i sig, så hver ny
--  vare står som "spørg" på kortet, til prisen sættes i admin.
--  En pris, vi selv finder på, er værre end ingen pris: gæsten
--  regner med den.
--
--  EN DUBLET ER VÆRRE END EN MANGLENDE VARE. Hver indsættelse
--  står med "where not exists" på kategori + navn. To rækker med
--  samme navn får hver sin pris, og så er det tilfældigt, hvad
--  gæsten betaler.
--
--  DER SLETTES INGENTING. Er der en vare i databasen, som ikke
--  står på ejerens liste, kan den være lagt ind med vilje siden
--  sidst. De står i rapporten til sidst som spørgsmål — ikke som
--  noget, filen rydder af vejen.
-- ============================================================


-- ------------------------------------------------------------
-- 0) STOP, HVIS DET ER DEN FORKERTE DATABASE
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.lokationer where id = 'mosede') then
    raise exception E'\n\n  DER ER INGEN FORRETNING "mosede" I DEN HER DATABASE.\n\n'
      '  Filen hører til Mosede Havnecafe (epwyjzakvvbxtpvnhvbn).\n'
      '  Tjek projekt-id''et i adresselinjen, før du kører SQL.\n';
  end if;
end $$;


-- ------------------------------------------------------------
-- 1) EN NOTE PR. KATEGORI
--    ---------------------------------------------------------
--    "På toastbrød eller rugbrød" gælder ALLE tolv slags
--    pindemad. Skrevet på hver linje ville den fylde tolv gange
--    og sige det samme; skrevet på kategorien står den ét sted,
--    hvor gæsten læser den én gang.
--
--    Det er anden gang, en note mangler: designet havde også
--    "Serveres 8–11" over morgenmaden. Derfor en kolonne og ikke
--    en tekst i koden.
-- ------------------------------------------------------------
alter table public.menu_kategorier
  add column if not exists note text;

comment on column public.menu_kategorier.note is
  'Kort linje over kategoriens varer, fx "På toastbrød eller rugbrød". Sættes i admin.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'kategori_note_ok'
       and conrelid = 'public.menu_kategorier'::regclass
  ) then
    alter table public.menu_kategorier
      add constraint kategori_note_ok
      check (note is null or char_length(note) <= 200);
  end if;
end $$;

update public.menu_kategorier
   set note = 'På toastbrød eller rugbrød'
 where lokation_id = 'mosede'
   and navn = 'Reception og pindemad'
   and note is null;


-- ------------------------------------------------------------
-- 2) DEN NYE KATEGORI: HENSYN
--    ---------------------------------------------------------
--    Ejeren skriver den som sin egen blok: glutenfri mad,
--    laktosefri mad, vegansk mad, glutenfrit brød og vegansk
--    smørrebrød. Den fandtes ikke i databasen.
-- ------------------------------------------------------------
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'mad', 'Glutenfri, laktosefri og vegansk', 9
where not exists (
  select 1 from public.menu_kategorier
   where lokation_id = 'mosede' and navn = 'Glutenfri, laktosefri og vegansk');

update public.menu_kategorier
   set note = 'Sig til ved bestilling, så tilpasser vi. Vi laver også retter uden for kortet — spørg os.'
 where lokation_id = 'mosede'
   and navn = 'Glutenfri, laktosefri og vegansk'
   and note is null;

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, sortering)
select k.id, v.navn, v.beskrivelse, null::numeric, v.sortering
  from (values
    ('Glutenfri mad', null, 1),
    ('Laktosefri mad', null, 2),
    ('Vegansk mad', null, 3),
    ('Glutenfrit brød', 'Til smørrebrød og burgere', 4),
    ('Vegansk smørrebrød', 'Tomatmad · kartoffelmad · avokadomad', 5)
  ) as v(navn, beskrivelse, sortering)
  join public.menu_kategorier k
    on k.lokation_id = 'mosede' and k.navn = 'Glutenfri, laktosefri og vegansk'
 where not exists (
   select 1 from public.menu_varer m
    where m.kategori_id = k.id
      and lower(btrim(m.navn)) = lower(btrim(v.navn)));


-- ------------------------------------------------------------
-- 3) DE SYV VARER, DER MANGLEDE
--    ---------------------------------------------------------
--    Hver af dem stod på ejerens liste og ikke i databasen.
--    Alle uden pris: listen har ingen tal.
-- ------------------------------------------------------------
insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, sortering)
select k.id, v.navn, v.beskrivelse, null::numeric,
       coalesce((select max(m.sortering) from public.menu_varer m where m.kategori_id = k.id), 0)
         + v.plads
  from (values
    -- Pølser: ejeren har både fransk og ristet hotdog i to størrelser.
    -- Databasen havde kun de ristede.
    ('Pølser', 'Fransk hotdog, alm.', null, 1),
    ('Pølser', 'Fransk hotdog, stor', null, 2),

    -- Retter fra pladen
    ('Sandwich og retter fra pladen', 'Pølsemix', null, 1),
    ('Sandwich og retter fra pladen', 'Hjemmelavet lun frikadelle', null, 2),

    -- Fyldet: ejeren skriver "Frikadelle med surt". Databasen har
    -- "Fiskedelle med surt", som er noget andet — den bliver
    -- stående, og spørgsmålet står i rapporten.
    ('Vælg fyld til smørrebrødet', 'Frikadelle med surt', null, 1),

    -- Isen
    ('Softice og vafler', 'Bæger med vaffelknas, softice og topping', null, 1),

    -- Til selskabet
    ('Tilkøb ud af huset', 'Isbar med eller uden betjening', null, 1)
  ) as v(kategori, navn, beskrivelse, plads)
  join public.menu_kategorier k
    on k.lokation_id = 'mosede' and k.navn = v.kategori
 where not exists (
   select 1 from public.menu_varer m
    where m.kategori_id = k.id
      and lower(btrim(m.navn)) = lower(btrim(v.navn)));


-- ------------------------------------------------------------
-- 4) INDHOLDET, EJEREN HAR SKREVET
--    ---------------------------------------------------------
--    De her varer HAR stået i databasen hele tiden — men uden at
--    sige, hvad der er i dem. Ejerens liste skriver indholdet ud,
--    og det er dét, gæsten skal kunne læse, før hun bestiller et
--    fad til tolv.
--
--    Teksterne er ejerens egne. Der er ikke lagt et ord til.
-- ------------------------------------------------------------
update public.menu_varer m
   set beskrivelse = t.tekst
  from (values
    ('Tapasfad',
     '5 slags ost · serranoskinke · chorizo · paté · hummus · oliven · cornichoner · frugt · grønt · baguette · smør · hjemmelavet chilimayo · hjemmelavet tzatziki'),
    ('Brunchtallerken',
     'Spejl- eller røræg · bacon · pølse · skyr med knas · pålæg · marmelade · frugt · grønt · pandekage · bønner i tomat · brød · smør'),
    ('English breakfast',
     'Spejlæg · 2 skiver bacon · bønner i tomat · pølse · stegte champignon · pandestegt tomat · ristet toastbrød · smør'),
    ('Havnens all in one',
     'Toastbrød eller rugbrød · ost · skinke · spejlæg'),
    ('Sandwich, lille',
     'Æg, pålæg, hønsesalat, æggesalat, wienersalat, skinkesalat, kebab, kylling eller tun'),
    ('Sandwich, stor',
     'Æg, pålæg, hønsesalat, æggesalat, wienersalat, skinkesalat, kebab, kylling eller tun'),
    ('Hjemmelavet hvidløgsbrød',
     'Med ost og tomat'),
    ('Snackkurv',
     'Med en dip')
  ) as t(navn, tekst)
 where lower(btrim(m.navn)) = lower(btrim(t.navn))
   /* Kun forretningens egne rækker. Filteret står som en
      underforespørgsel og ikke som et join: målet for en UPDATE
      må ikke også stå i FROM — Postgres afviser det, og fejlen
      er nem at læse forkert som "kategorien findes ikke". */
   and m.kategori_id in (
     select id from public.menu_kategorier where lokation_id = 'mosede')
   and coalesce(m.beskrivelse, '') is distinct from t.tekst;


-- ------------------------------------------------------------
-- 5) RAPPORTEN
--    ---------------------------------------------------------
--    Supabases SQL Editor viser kun den sidste sætnings svar, så
--    alt, der skal læses, står her.
--
--    Spørgsmålene er IKKE fejl. Det er de steder, hvor ejerens
--    liste og databasen siger noget, der ligner hinanden uden at
--    være det samme — og hvor et gæt ville lave enten en dublet
--    eller en forkert vare.
-- ------------------------------------------------------------
with tal as (
  select
    (select count(*) from public.menu_kategorier where lokation_id = 'mosede') as kategorier,
    (select count(*) from public.menu_varer m
       join public.menu_kategorier k on k.id = m.kategori_id
      where k.lokation_id = 'mosede')                                          as varer,
    (select count(*) from public.menu_varer m
       join public.menu_kategorier k on k.id = m.kategori_id
      where k.lokation_id = 'mosede' and m.pris is null)                       as uden_pris
),
spoergsmaal(nr, hvad) as (values
  (1, 'Fiskedelle med surt: staar i basen, men ejeren skriver Frikadelle med surt. Begge staar nu — er den ene en tastefejl?'),
  (2, 'Indbagte rejer: basen siger "med pommes", ejeren siger "med salat". Er det to retter eller en?'),
  (3, 'Kebabmix: ejeren har den; basen har "Mix med pommes og salat" med samme fyld. Samme ret?'),
  (4, 'Lun leverpostej / lun delle / lun steg: ejeren har tre linjer, basen har to samlede. Skal de deles op?'),
  (5, 'Hansen fransk vaffel, stor/lille: staar i basen under Poelser, men ikke paa ejerens liste. Hvad er det?'),
  (6, 'Kage: ejeren har den under tilkoeb til morgenmad, men den staar allerede under Kaffe. To rakker faar hver sin pris.'),
  (7, 'Popcorn og chips: staar under Tilkoeb ud af huset. Skal de OGSAA staa under Snacks og slik?'),
  (8, 'Vin: ejeren skriver hvidvin, roedvin og rose hver for sig; basen har en samlet "Vin, glas/flaske". Tre priser eller en?'),
  (9, 'Boblevaffel med softice: basen har "med 2 kugler eller softice". Er det den samme?'),
  (10, 'Ejeren skrev "Mere ?" ved smoerrebroed og vegansk — der mangler maaske noget, vi ikke kender.')
)
select
  '📋 ' || t.kategorier || ' kategorier · ' || t.varer || ' varer · '
        || t.uden_pris || ' uden pris'                          as "Kortet nu",
  s.nr                                                          as "#",
  s.hvad                                                        as "Spoergsmaal til ejeren"
from tal t, spoergsmaal s
order by s.nr;
