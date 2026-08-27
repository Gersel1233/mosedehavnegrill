-- ============================================================
--  PRISERNE FRA DE TRYKTE KORT  (august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER alle menukort-filerne. Filen kan køres igen.
--
--  ------------------------------------------------------------
--  HVORFOR
--  ------------------------------------------------------------
--  Mikkel sendte de fire trykte kort 27/8. De blev sammenlignet
--  post for post med de 242 varer i databasen, og der kom tre
--  slags fund ud af det:
--
--  1) 19 PRISER PÅ SIDEN VAR FOR LAVE. Alle nitten gik samme vej
--     — kortet var højere. Det ligner en prisstigning, siden
--     aldrig har fået.
--
--     ⚠️ DET ER VÆRRE END EN MANGLENDE PRIS. En manglende pris
--     siger "ring og hør"; en forkert pris er et løfte, gæsten
--     regner med, og som bliver brudt ved lugen. Værst stod
--     Tatarmad til 50 kr., hvor kortet siger 99 — 49 kroner tabt
--     hver gang.
--
--  2) 13 VARER HAVDE INGEN PRIS, og kortet har den.
--
--  3) 5 VARER STÅR PÅ KORTET, MEN FANDTES IKKE PÅ SIDEN.
--
--  ------------------------------------------------------------
--  ⚠️ FILEN OVERSKRIVER. Kører I den IGEN efter at have rettet en
--  pris i admin, sættes den tilbage til kortets tal. Det er med
--  vilje — filen er kortet skrevet ind — men det betyder, at den
--  kun skal køres, når kortet er nyere end skærmen. Er I i tvivl,
--  så ret i admin i stedet; det er dét, fanen er til.
--
--  ⚠️ OG DEN SIGER FRA, HVIS ET NAVN IKKE FINDES. Uden det ville
--  en stavefejl her opdatere nul rækker i stilhed, og prisen ville
--  blive stående forkert, mens rapporten sagde god for den.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) FORRETNINGEN HEDDER MOSEDE HAVNECAFE
--    ---------------------------------------------------------
--    Bekræftet af Mikkel 27/8. Kortene siger Havnecafe; siden
--    sagde "Mosede Havnegrill og Ishus". Navnet står ét sted i
--    databasen og resten i koden.
-- ------------------------------------------------------------
update public.lokationer
   set navn = 'Mosede Havnecafe'
 where id = 'mosede' and navn <> 'Mosede Havnecafe';


-- ------------------------------------------------------------
-- 2) PRISERNE
--    ---------------------------------------------------------
--    Kategori + navn, fordi det samme navn kan stå i to
--    kategorier: "Håndmadder" ligger både under Retter og som
--    "Håndmad" under Smørrebrød, og begge skal til 27.
--
--    Sammenligningen er lower(btrim(...)) — den samme, som alle
--    værnene bruger. ⚠️ Fish'n'chips har en KRØLLET apostrof i
--    databasen; skrives den lige, rammer linjen ingenting.
-- ------------------------------------------------------------
create temporary table kortet (kategori text, vare text, pris numeric) on commit drop;

insert into kortet (kategori, vare, pris) values
  -- ---- For lave priser: kortet er højere ----
  ('Retter',                        'Stjerneskud',                      105),
  ('Retter',                        'Fish’n’chips',                     110),
  ('Retter',                        'Rejemad',                           85),
  ('Retter',                        'Håndmadder',                        27),
  ('Retter',                        'Pariserbøf',                       110),
  ('Retter',                        'Tatarmad',                          99),
  ('Smørrebrød',                    'Håndmad',                           27),
  ('Sandwich og retter fra pladen', 'Indbagte rejer med pommes',          95),
  ('Sandwich og retter fra pladen', 'Snackkurv',                          85),
  ('Sandwich og retter fra pladen', 'Gammeldags rejecocktail',            90),
  ('Kugleis og ishorn',             '1 kugle',                            35),
  ('Kugleis og ishorn',             '2 kugler',                           45),
  ('Kugleis og ishorn',             '3 kugler',                           55),
  ('Kugleis og ishorn',             'Softice-top',                        18),
  ('Softice og vafler',             'Softice, lille',                     37),
  ('Softice og vafler',             'Softice, stor',                      47),
  ('Softice og vafler',             'Churros med sukker og kanel',        45),
  ('Softice og vafler',             'Churros med is og sauce',            67),
  ('Softice og vafler',             'Hjemmelavede pandekager med is',     65),
  ('Sodavand, juice og kakao',      'Smoothie eller milkshake',           59),

  -- ---- Havde ingen pris ----
  ('Morgenmad',                     'Morgenkomplet',                      99),
  ('Retter',                        'Fiskefilet med pommes',              95),
  ('Burgere og sandwich',           'Cheeseburger',                       85),
  ('Burgere og sandwich',           'Dobbeltburger',                     125),
  ('Pølser',                        'Ristet pølse',                       30),
  ('Pølser',                        'Frankfurter eller specialpølse',     40),
  ('Pølser',                        'Kradser med det hele',               15),
  ('Pølser',                        'Pølsebrød',                          10),
  /* ⚠️ KORTET SKELNER IKKE. Der står "Hotdog, lille — Fransk
     eller ristet 40,-", altså SAMME pris for de to. Databasen har
     dem som fire rækker, og alle fire får kortets tal. */
  ('Pølser',                        'Ristet hotdog, lille',               40),
  ('Pølser',                        'Fransk hotdog, alm.',                40),
  ('Pølser',                        'Ristet hotdog, stor',                50),
  ('Pølser',                        'Fransk hotdog, stor',                50),
  ('Kaffe og varme drikke',         'Sirup',                               5),
  ('Kaffe og varme drikke',         'Lumumba',                            75);


/* ⚠️ FANG STAVEFEJLENE FØR DE BLIVER TIL PRISER. En linje, der
   ikke rammer en række, opdaterer nul rækker i stilhed — og så
   ville prisen blive stående forkert, mens rapporten sagde god
   for den. Her standser filen i stedet, og siger hvilken. */
do $$
declare v text;
begin
  select string_agg(k.kategori || ' / ' || k.vare, E'\n  ') into v
    from kortet k
   where not exists (
     select 1 from public.menu_varer mv
       join public.menu_kategorier mk on mk.id = mv.kategori_id
      where lower(btrim(mv.navn)) = lower(btrim(k.vare))
        and lower(btrim(mk.navn)) = lower(btrim(k.kategori)));
  if v is not null then
    raise exception E'Disse navne findes ikke på menukortet:\n  %\n\n'
      'Ret dem i filen, eller opret varerne først. Der er ikke '
      'ændret noget.', v;
  end if;
end $$;

update public.menu_varer mv
   set pris = k.pris
  from kortet k, public.menu_kategorier mk
 where mk.id = mv.kategori_id
   and lower(btrim(mv.navn)) = lower(btrim(k.vare))
   and lower(btrim(mk.navn)) = lower(btrim(k.kategori));


-- ------------------------------------------------------------
-- 3) DE FEM, DER STOD PÅ KORTET MEN IKKE PÅ SIDEN
--    ---------------------------------------------------------
--    on conflict do nothing findes ikke her — der er ingen unik
--    nøgle på (kategori, navn). I stedet oprettes de KUN, hvis de
--    ikke findes: filen skal kunne køres igen uden at lave
--    dubletter, og "en dublet er værre end en manglende vare"
--    (se supabase/menukort-ud-af-huset.sql).
-- ------------------------------------------------------------
insert into public.menu_varer (kategori_id, navn, pris, sortering, aktiv)
select mk.id, n.navn, n.pris,
       coalesce((select max(sortering) from public.menu_varer x
                  where x.kategori_id = mk.id), 0) + n.nr,
       true
  from (values
    ('Sandwich og retter fra pladen', 'Dip eller dressing',  10, 1),
    ('Sandwich og retter fra pladen', 'Ekstra kød m.m.',     10, 2),
    ('Sandwich og retter fra pladen', 'Ekstra spejlæg',      10, 3),
    ('Kaffe og varme drikke',         'Flødekager',          40, 4),
    ('Øl',                            'Specialøl',           50, 5)
  ) as n(kategori, navn, pris, nr)
  join public.menu_kategorier mk
    on lower(btrim(mk.navn)) = lower(btrim(n.kategori))
 where not exists (
   select 1 from public.menu_varer mv
    where mv.kategori_id = mk.id
      and lower(btrim(mv.navn)) = lower(btrim(n.navn)));

commit;


-- Rapport. Supabases SQL Editor viser kun den sidste sætnings
-- svar — se README-afsnittet "Supabases SQL Editor viser ikke
-- beskeder".
select
  (select navn from public.lokationer where id = 'mosede')         as forretningen,
  (select count(*) from public.menu_varer where aktiv)             as varer_i_alt,
  (select count(*) from public.menu_varer where aktiv and pris is null)
                                                                    as mangler_stadig_pris,
  case when (select count(*) from public.menu_varer mv
               join public.menu_kategorier mk on mk.id = mv.kategori_id
              where lower(btrim(mv.navn)) = 'tatarmad' and mv.pris = 99) = 1
       then '✅ PRISERNE FRA KORTET ER SAT'
       else '❌ NOGET GIK GALT — Tatarmad står ikke til 99. Læs fejlen ovenfor'
  end                                                               as svar;
