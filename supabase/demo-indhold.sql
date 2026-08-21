-- ============================================================
--  DEMO-INDHOLD TIL MØDET
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  HVAD DEN GØR
--  ------------------------------------------------------------
--  Fylder de fire ting ud, som forsiden ellers skjuler, fordi
--  ingen har skrevet dem endnu:
--
--    dagens ret       → hele bestillingspanelet på forsiden
--    et arrangement   → musikbanneret med "Få en plads"
--    dagens besked    → banneret "Fra lugen"
--    tre nyheder      → det marineblå nyhedsafsnit
--
--  Siden er bygget, så et tomt felt betyder en skjult blok — det
--  er med vilje, for en overskrift over ingenting fortæller
--  gæsten, at der aldrig sker noget her. Men det betyder også, at
--  en tom database ser ud som en halv side, og det er ikke det,
--  der skal vises frem.
--
--  ⚠️  DET HER ER PLADSHOLDERE, IKKE OPLYSNINGER
--  ------------------------------------------------------------
--  Retten, arrangementet, beskeden og nyhederne er SKREVET AF
--  OS for at vise formen. De er ikke bekræftet af forretningen.
--  Så længe de står i databasen, står de på den offentlige side,
--  og en gæst kan møde op efter stegt flæsk, ingen har lavet.
--
--  Derfor:
--    · Ret dem i admin, så snart ejeren har sagt hvad der SKAL
--      stå. Det er ét felt pr. ting og tager to minutter.
--    · Eller kør supabase/ryd-demo.sql, som fjerner præcis de
--      rækker, den her fil lagde ind — hverken mere eller mindre.
--
--  Ingen priser, antal personer eller leveringsløfter er med.
--  De ting koster en skuffet kunde i telefonen, og de står
--  øverst på listen "Ejeren skal bekræfte" i README. Prisen på
--  dagens ret ER med, fordi den hører til retten og forsvinder
--  sammen med den.
--
--  Filen kan køres igen. Den rydder sit eget op først.
-- ============================================================

begin;

-- ------------------------------------------------------------
--  1) DAGENS RET
--     Åbner hele bestillingspanelet på forsiden: datofeltet,
--     retten med tæller, de fem rækker, tid, navn, telefon og
--     "Send bestilling".
--
--     Bemærk hvad der IKKE er her: et serveringsvindue. Filerne
--     skrev "serveres 11.30-14.00", men det tal er ikke
--     bekræftet. Noten på siden viser forretningens rigtige
--     lukketid i stedet, og den kommer fra åbningstiderne.
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
values ('mosede', 'dagens_ret', jsonb_build_object(
    'navn',        'Stegt flæsk med persillesovs',
    'beskrivelse', 'Med nye kartofler og rødbeder.',
    'pris',        95
  ), now())
on conflict (lokation_id, noegle) do update
  set vaerdi = excluded.vaerdi, aendret = now();


-- ------------------------------------------------------------
--  2) DAGENS BESKED
--     Banneret "Fra lugen" under heroen. Gæsten kan lukke det,
--     og lukningen huskes pr. BESKED — skriver personalet en ny,
--     kommer den frem igen hos alle.
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
values ('mosede', 'dagens_besked', jsonb_build_object(
    'vis',   true,
    'tekst', 'Vi holder åbent hele weekenden — kom ned og få en is på trædækket.'
  ), now())
on conflict (lokation_id, noegle) do update
  set vaerdi = excluded.vaerdi, aendret = now();


-- ------------------------------------------------------------
--  3) ET ARRANGEMENT
--     Bliver til musikbanneret øverst OG står på arrangementer/.
--     Én række, to steder — der er ingen anden liste at holde
--     ved lige.
--
--     `offentlig` SKAL være true. Er den false, er det
--     personalets egen note i kalenderen, og så holder både
--     adgangsreglen i databasen og filteret i browseren den
--     tilbage.
--
--     Datoen er den førstkommende lørdag, regnet ud her, så
--     arrangementet ikke er overstået, næste gang filen køres.
--     Et overstået arrangement bliver ikke til et banner.
--
--     TITLEN NÆVNER INGEN NAVNE. Filerne skrev "Ronni & de Salte"
--     — at finde på et bandnavn er værre end at finde på en ret,
--     for et bandnavn kan tilhøre nogen.
-- ------------------------------------------------------------
delete from public.kalender
 where lokation_id = 'mosede'
   and titel = 'Live musik på molen';

insert into public.kalender
  (lokation_id, type, dato, slut_dato, titel, beskrivelse, emoji, offentlig)
values (
  'mosede',
  'arrangement',
  -- Førstkommende lørdag. current_date + (6 - isodow) hvis vi
  -- ikke er nået forbi, ellers ugen efter.
  current_date + ((6 - extract(isodow from current_date)::int + 7) % 7),
  null,
  'Live musik på molen',
  'Grillen er tændt, og der spilles på molen. Kom ned og få en plads ved langbordene.',
  null,
  true
);


-- ------------------------------------------------------------
--  4) TRE NYHEDER
--     Fylder det marineblå nyhedsafsnit på forsiden og siden
--     nyheder/. De tre nyeste står på forsiden; resten står kun
--     på nyhedssiden.
--
--     Datoerne ligger bagud fra i dag, så rækkefølgen er den
--     rigtige uanset hvornår filen køres.
-- ------------------------------------------------------------
delete from public.nyheder
 where lokation_id = 'mosede'
   and titel in (
     'Længere åbent i weekenden',
     'Nyt i køledisken',
     'Smørrebrød ud af huset'
   );

insert into public.nyheder (lokation_id, titel, tekst, dato, aktiv)
values
  ('mosede',
   'Længere åbent i weekenden',
   'Vi har åbent hele weekenden. Ishuset lukker en halv time efter køkkenet — kig på åbningstiderne nederst på siden for dagen i dag.',
   current_date - 1, true),

  ('mosede',
   'Nyt i køledisken',
   'Udvalget af kager og desserter skifter. Spørg ved lugen hvad der står i dag — der er som regel noget nyt i weekenden.',
   current_date - 5, true),

  ('mosede',
   'Smørrebrød ud af huset',
   'Vi laver smørrebrød til fødselsdage, møder og frokoster. Bestil på siden, så ringer vi og bekræfter — du betaler når du henter.',
   current_date - 12, true);


commit;


-- ============================================================
--  RAPPORT
--  ------------------------------------------------------------
--  Supabases SQL Editor viser KUN den sidste sætnings svar, og
--  hverken notices eller warnings. Skal der stå noget, man kan
--  læse, skal det være en select til sidst. Se README-afsnittet
--  "Supabases SQL Editor viser ikke beskeder".
-- ============================================================
select
  case
    when (select count(*) from public.indstillinger
           where lokation_id = 'mosede' and noegle = 'dagens_ret'
             and vaerdi->>'navn' is not null) = 1
     and (select count(*) from public.indstillinger
           where lokation_id = 'mosede' and noegle = 'dagens_besked'
             and (vaerdi->>'vis')::boolean) = 1
     and (select count(*) from public.kalender
           where lokation_id = 'mosede' and type = 'arrangement'
             and offentlig and dato >= current_date) >= 1
     and (select count(*) from public.nyheder
           where lokation_id = 'mosede' and aktiv) >= 3
    then '✅ FORSIDEN ER FYLDT UD — hård-genindlæs siden, og ret det i admin bagefter'
    else '❌ NOGET MANGLER — se de fire tal herunder'
  end                                                          as svar,
  (select count(*) from public.indstillinger
    where lokation_id = 'mosede' and noegle = 'dagens_ret')     as dagens_ret,
  (select count(*) from public.indstillinger
    where lokation_id = 'mosede' and noegle = 'dagens_besked')  as dagens_besked,
  (select count(*) from public.kalender
    where lokation_id = 'mosede' and type = 'arrangement'
      and offentlig and dato >= current_date)                   as arrangementer,
  (select count(*) from public.nyheder
    where lokation_id = 'mosede' and aktiv)                     as nyheder;
