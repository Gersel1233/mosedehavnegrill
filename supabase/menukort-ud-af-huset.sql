-- ============================================================
--  UD AF HUSET — tapas, platter, sliders og pindemad
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  HVOR LISTEN KOMMER FRA
--  ------------------------------------------------------------
--  Ejerens eget menukort, sendt af Mikkel 23. august 2026. Den
--  del af kortet, der IKKE kan hentes ved lugen i eftermiddag:
--  det bestilles med varsel, og som regel til et selskab.
--
--  menukort.sql dækkede allerede lugen — grillen, smørrebrødet,
--  isen, kaffen og baren. Fem kategorier manglede helt, og de er
--  dem, forretningen tjener mest på pr. bestilling.
--
--  DE TO REGLER FRA menukort.sql ER FULGT SLAVISK
--  ------------------------------------------------------------
--    Ingen priser er gættet. Ejerens liste har ikke ét tal i sig,
--    og et gæt på et tapasfad er værre end ingen pris: gæsten
--    tror, hun ved, hvad det koster. Alle varer her står med
--    pris = null og vises som "??" på siden, indtil ejeren
--    skriver tallet i admin → Menukort.
--
--    Stod der "Mere ?" i listen — og det gør der tre steder — er
--    der IKKE fyldt op med gæt. Ejeren tilføjer selv i admin.
--
--  ET FAD ER ÉN VARE, IKKE TRETTEN
--  ------------------------------------------------------------
--  Tapasfadets tretten ting er INDHOLDET af ét fad, ikke tretten
--  varer at vælge imellem. De står i beskrivelsen. Samme med de
--  to platter. Sliders og pindemad er derimod ægte valg — dér
--  vælger gæsten, hvilke slags hun vil have, og de er derfor
--  hver sin vare. Skellet er, om gæsten kan fravælge noget.
--
--  KATEGORIERNE ER IKKE TÆNDT FOR BESTILLING
--  ------------------------------------------------------------
--  Filen lægger kun varerne ind. Hvad der kan BESTILLES, styres
--  af indstillingen bestilbare_kategorier, som ejeren sætter med
--  fluebenene i admin → Menukort. Filen rører den ikke: et
--  tapasfad uden pris, der pludselig kan bestilles på forsiden,
--  er ikke en forbedring.
--
--  Filen kan køres igen uden at duplikere noget.
-- ============================================================

-- ------------------------------------------------------------
--  Tapasfad (mad)
-- ------------------------------------------------------------
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'mad', 'Tapasfad', 30
where not exists (select 1 from public.menu_kategorier where navn = 'Tapasfad' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Tapasfad',
   'Fem forskellige oste, serranoskinke, chorizo, paté, hummus, oliven, cornichoner, frugt, grønt, baguette og smør. Hjemmelavet chilimayo og tzatziki.',
   null::numeric, true, 1)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Tapasfad' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- ------------------------------------------------------------
--  Platter (mad)
--  Den ene er til én person, den anden til to. Antallet står i
--  navnet og ikke kun i beskrivelsen: står der "Platte" alene på
--  en kvittering, ved køkkenet ikke, hvor mange den er til.
-- ------------------------------------------------------------
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'mad', 'Platter', 31
where not exists (select 1 from public.menu_kategorier where navn = 'Platter' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Platte til 1 person',
   'Fisk med remoulade, æg med rejer, flæskesteg, skinke med italiensk salat, roastbeef, sild med karrysalat og ost. Hvidt og mørkt brød, smør og fedt.',
   null::numeric, true, 1),
  ('Brunchplatte til 2 personer',
   'Æg og bacon, skyr med müsli, ost og skinke, marmelade, pandekage, wienerbrød og frugt. Brød og smør.',
   null::numeric, true, 2)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Platter' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- ------------------------------------------------------------
--  Sliders (mad)
--  Ti slags, og gæsten vælger. Derfor ti varer og ikke én med en
--  liste i beskrivelsen: skal der bestilles fire med roastbeef og
--  to med laks, skal de kunne tælles hver for sig.
-- ------------------------------------------------------------
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'mad', 'Sliders', 32
where not exists (select 1 from public.menu_kategorier where navn = 'Sliders' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Slider med roastbeef',   null, null::numeric, false, 1),
  ('Slider med hønsesalat',  null, null::numeric, false, 2),
  ('Slider med æggesalat',   null, null::numeric, false, 3),
  ('Slider med leverpostej', null, null::numeric, false, 4),
  ('Slider med æg',          null, null::numeric, false, 5),
  ('Slider med æg og rejer', null, null::numeric, false, 6),
  ('Slider med flæskesteg',  null, null::numeric, false, 7),
  ('Slider med frikadelle',  null, null::numeric, false, 8),
  ('Slider med spegepølse',  null, null::numeric, false, 9),
  ('Slider med laks',        null, null::numeric, false, 10)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Sliders' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- ------------------------------------------------------------
--  Reception og pindemad (mad)
--  Ejerens linje: "Lavet på toastbrød eller rugbrød." Brødet er
--  et valg, der gælder HELE bestillingen, ikke pr. stykke — det
--  hører i formularens besked-felt og ikke som 24 varer.
-- ------------------------------------------------------------
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'mad', 'Reception og pindemad', 33
where not exists (select 1 from public.menu_kategorier where navn = 'Reception og pindemad' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Pindemad med skinke og ost', 'På toastbrød eller rugbrød', null::numeric, false, 1),
  ('Pindemad med hønsesalat',    'På toastbrød eller rugbrød', null::numeric, false, 2),
  ('Pindemad med æggesalat',     'På toastbrød eller rugbrød', null::numeric, false, 3),
  ('Pindemad med wienersalat',   'På toastbrød eller rugbrød', null::numeric, false, 4),
  ('Pindemad med frikadelle',    'På toastbrød eller rugbrød', null::numeric, false, 5),
  ('Pindemad med flæskesteg',    'På toastbrød eller rugbrød', null::numeric, false, 6),
  ('Pindemad med leverpostej',   'På toastbrød eller rugbrød', null::numeric, false, 7),
  ('Pindemad med æg',            'På toastbrød eller rugbrød', null::numeric, false, 8),
  ('Pindemad med æg og rejer',   'På toastbrød eller rugbrød', null::numeric, false, 9),
  ('Pindemad med roastbeef',     'På toastbrød eller rugbrød', null::numeric, false, 10),
  ('Pindemad med spegepølse',    'På toastbrød eller rugbrød', null::numeric, false, 11),
  ('Pindemad med laks',          'På toastbrød eller rugbrød', null::numeric, false, 12)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Reception og pindemad' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- ------------------------------------------------------------
--  Tilkøb ud af huset (mad)
--  Ejerens egen overskrift. Det er dét, man lægger oveni et fad
--  eller en platte — ikke noget, man bestiller alene.
--
--  "Isbar med eller uden betjening" står med i listen, men den er
--  IKKE en vare, man kan tælle op: den kræver en aftale om tid,
--  sted og personale. Den hører i formularens besked-felt, og
--  derfor står den ikke her.
-- ------------------------------------------------------------
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'mad', 'Tilkøb ud af huset', 34
where not exists (select 1 from public.menu_kategorier where navn = 'Tilkøb ud af huset' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Hjemmelavede mini-frikadeller', null, null::numeric, false, 1),
  ('Hjemmelavet flæskesvær',        null, null::numeric, false, 2),
  ('Mini-burgere',                  null, null::numeric, false, 3),
  ('Mini-kyllingeburgere',          null, null::numeric, false, 4),
  ('Mini-fiskeburgere',             null, null::numeric, false, 5),
  ('Mini-vegetarburgere',           null, null::numeric, false, 6),
  ('Blandede salater',              null, null::numeric, false, 7),
  ('Pastasalat',                    null, null::numeric, false, 8),
  ('Råkost',                        null, null::numeric, false, 9),
  ('Frugtfad',                      null, null::numeric, false, 10),
  ('Frugtsalat',                    null, null::numeric, false, 11),
  ('Vaniljecreme',                  null, null::numeric, false, 12),
  ('Vanilje- og jordbærsoftice',    null, null::numeric, false, 13),
  ('Chips',                         null, null::numeric, false, 14),
  ('Popcorn',                       null, null::numeric, false, 15),
  ('Slushice',                      null, null::numeric, false, 16),
  ('Milkshake',                     null, null::numeric, false, 17),
  ('Smoothie',                      null, null::numeric, false, 18),
  ('Slikposer',                     null, null::numeric, false, 19)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Tilkøb ud af huset' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- ============================================================
--  OPTÆLLING
--  ------------------------------------------------------------
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar, og
--  hverken notices eller warnings. En besked, der skal læses,
--  skal derfor være en select til sidst. Se README-afsnittet
--  "Supabases SQL Editor viser ikke beskeder".
-- ============================================================
select
  k.navn                                        as kategori,
  count(v.id)                                   as varer,
  count(v.pris)                                 as "heraf med pris",
  case when count(v.id) = 0 then '❌ tom' else '✅' end as status
from public.menu_kategorier k
left join public.menu_varer v on v.kategori_id = k.id
where k.lokation_id = 'mosede'
  and k.navn in ('Tapasfad', 'Platter', 'Sliders',
                 'Reception og pindemad', 'Tilkøb ud af huset')
group by k.navn, k.sortering
order by k.sortering;
