-- ============================================================
--  MENUKORTETS RAEKKEFOELGE — DET MEST ATTRAKTIVE OEVERST
--  (9. september 2026)
-- ============================================================
--  Kundens ord: *"paa menukort delen ift telefonen kan vi ik faa
--  raekkefoelgen lidt anderledes saa det er de mest attraktive og
--  velkendte ting i toppen som selvfoelgelig dagens ret hvis den
--  er der, ogsaa derefter retter — og du ved blive mindre
--  attraktiv jo laengere ned man ryger."*
--
--  MAALT PAA HANS EGET KORT (menukort/menukort.json, hentet fra
--  produktionen 3/9) paa en iPhone 13, FOER noget blev rettet:
--
--    · siden er 19.760 px = 29,8 skaerme
--    · Morgenmad staar FOERST, 1.385 px nede — otte varer, og
--      det ene svar, ejeren selv har givet, er SPOERG
--      (Morgenbroed har ingen pris)
--    · de to TILKOEB-lister (Tilkoeb morgenmad + Tillaeg:
--      glutenfri, laktosefri og vegansk) ligger 9.124-9.841 px
--      nede, altsaa 17 linjer paa 10 kr. midt i maden
--    · og maden stod i TO blokke: sortering 1-9 oeverst og 30-34
--      nederst, med isen og de fem drikke-kort imellem
--
--  Den SIDSTE af de fire er rettet i KODEN — gaestesiden laeser
--  kortet i afsnit efter `afdeling` nu (Butik.menuAfsnit), saa
--  hele maden staar samlet. Filen her retter de tre andre, og de
--  er alle tre EJERENS EGET FELT.
--
--  ⚠️ DEN GOER PRAECIS DET SAMME SOM PILENE I ADMIN.
--  admin -> Menukort har pile op/ned pr. kategori, og de bytter
--  sorteringstal. Filen her sparer atten tryk; den tager INGEN
--  beslutning fra ejeren, og han kan flytte det hele tilbage med
--  de samme pile bagefter. Derfor er raekkefoelgen ogsaa skrevet
--  ud i rapporten, saa han kan se, hvad han fik.
--
--  ⚠️ OG DEN SLAAR KATEGORIEN OP PAA NAVN, IKKE PAA id.
--  `kortets-priser-2.sql` skrev `kategori_id = 31` og ramte NUL
--  raekker i en frisk database, fordi id'erne foelger den
--  raekkefoelge, filerne blev koert i (maalt 1/9). En opdatering,
--  der rammer nul raekker, fejler ikke — den er bare tavs.
--
--  ⚠️ DEN RETTER KUN `mad`. Isen (10-11) og drikkevarerne (20-24)
--  har deres egne tal, og med afsnittene i koden kan de ikke
--  laengere blande sig ind i maden. To rettelser af det samme er
--  en for meget.
--
--  ⚠️ OG DEN SLETTER INGENTING og kan koeres igen: hver linje er
--  en `update` paa et navn, og en kategori, ejeren har doebt om,
--  staar i rapporten som ikke fundet i stedet for at forsvinde.
--
--  Den skriver DATA, ikke regler, og har derfor med vilje INTET
--  tjek i er-vi-klar.sql — samme grund som kortets-priser.sql,
--  borde-55.sql, ejerens-oplysninger.sql og tillaeg-hensyn.sql:
--  et tjek paa "Retter = 1" ville sige ❌ den dag, ejeren flytter
--  sin egen kategori med en pil.
-- ============================================================

begin;

create temporary table raekke_rapport (nr int, hvad text, resultat text);
truncate raekke_rapport;

-- ------------------------------------------------------------
--  1) RAEKKEFOELGEN INDEN FOR `mad`
-- ------------------------------------------------------------
--  Gaestens vej ned ad kortet: retterne foerst (kundens eget ord
--  — "derefter retter"), saa det, man baerer ud af huset til et
--  selskab, og til sidst det, der KUN er et tilkoeb til noget
--  andet. Morgenmaden ligger sammen med sit eget tilkoeb: den
--  serveres om formiddagen, og kl. 13 er den ikke det, gaesten
--  leder efter.
-- ------------------------------------------------------------
create temporary table raekke_oensket (navn text, nyt int);
truncate raekke_oensket;
insert into raekke_oensket values
  ('Retter',                                     1),
  ('Sandwich og retter fra pladen',              2),
  ('Burgere og sandwich',                        3),
  ('Pølser',                                     4),
  ('Smørrebrød',                                 5),
  ('Håndmadder',                                 6),
  ('Tapasfad',                                   7),
  ('Platter',                                    8),
  ('Sliders',                                    9),
  ('Reception og pindemad',                     10),
  ('Morgenmad',                                 11),
  ('Tilkøb morgenmad',                          12),
  ('Tillæg: glutenfri, laktosefri og vegansk',  13),
  ('Tilkøb ud af huset',                        14);

with r as (
  update public.menu_kategorier k
     set sortering = o.nyt
    from raekke_oensket o
   where k.lokation_id = 'mosede'
     and k.afdeling = 'mad'
     and k.navn = o.navn
     and k.sortering is distinct from o.nyt
  returning k.navn)
insert into raekke_rapport
select 1, 'Kategorier flyttet', count(*) || ' af 14' from r;

-- ------------------------------------------------------------
--  2) DEN, DER IKKE BLEV FUNDET, SKAL SIGE DET
-- ------------------------------------------------------------
--  ⚠️ EN TAVS NUL ER DEN DYRESTE. Har ejeren doebt "Pølser" om
--  til "Pølsevognen", rammer linjen ingenting — og uden den her
--  linje ville rapporten sige "13 af 14" uden at sige hvilken.
insert into raekke_rapport
select 2, '❓ Ikke fundet paa kortet: ' || o.navn,
       'doebt om? flyt den med pilene i admin -> Menukort'
  from raekke_oensket o
 where not exists (
   select 1 from public.menu_kategorier k
    where k.lokation_id = 'mosede' and k.afdeling = 'mad' and k.navn = o.navn);

-- ------------------------------------------------------------
--  3) RAPPORTEN: SAADAN LAESER GAESTEN KORTET NU
-- ------------------------------------------------------------
insert into raekke_rapport
select 10 + row_number() over (order by
         case k.afdeling when 'mad' then 1 when 'is' then 2
                         when 'drikke' then 3 else 4 end,
         k.sortering, k.navn),
       '   ' || k.afdeling || ' · ' || k.navn,
       k.sortering || ' · ' || (
         select count(*) from public.menu_varer v
          where v.kategori_id = k.id and v.aktiv) || ' varer'
  from public.menu_kategorier k
 where k.lokation_id = 'mosede' and k.aktiv;

insert into raekke_rapport values
  (5, 'GAESTENS RAEKKEFOELGE HERUNDER',
      'afsnit: mad -> is -> drikke (koden), sortering inde i hvert (ejeren)'),
  (900, '⚠️ PILENE I ADMIN GOER DET SAMME',
       'admin -> Menukort: flyt en kategori op eller ned, naar du er uenig');

commit;

select nr, hvad, resultat from raekke_rapport order by nr;
