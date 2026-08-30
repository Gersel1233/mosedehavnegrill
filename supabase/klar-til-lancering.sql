-- ============================================================
--  ER SIDEN KLAR TIL AT BLIVE VIST FREM?   (30. august 2026)
-- ============================================================
--  er-vi-klar.sql spørger, om DATABASEN er rigtigt skruet sammen
--  — tabeller, adgangsregler, bremser. Den her spørger om noget
--  andet: er der NOGET AT VISE? En database kan være perfekt og
--  siden alligevel stå tom, fordi ingen har sat et flueben eller
--  skrevet en pris.
--
--  Baggrunden er Mikkels eget spørgsmål 30/8: "ellers kan du
--  heller ikke se alt hvad der mangler at blive fixet." Han har
--  ret — jeg kan læse det, en gæst kan læse, men ikke gætte, hvad
--  ejeren mangler at udfylde. Så filen her siger det højt.
--
--  ⚠️ DEN SKRIVER INGENTING. Den kan køres når som helst, også
--  midt i en frokost.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================

with tjek(nr, hvad, svar, hjaelp) as (

  -- ---------- MENUKORTET ----------
  select 1, 'Varer med pris',
    (select count(*)::text || ' af ' || (select count(*) from public.menu_varer where aktiv)
       from public.menu_varer where aktiv and pris is not null),
    'En vare uden pris kan ses, men ikke bestilles. Kør kortets-priser-2.sql.'

  union all select 2, 'Kategorier, gæsten kan bestille fra',
    coalesce((select jsonb_array_length(vaerdi) from public.indstillinger
               where noegle = 'bestilbare_kategorier')::text, 'INGEN'),
    'admin → Menukort → "Kan bestilles ud af huset". Står der INGEN, '
    || 'kan gæsten kun bestille smørrebrød — resten af kortet er lukket.'

  union all select 3, 'Udsolgte varer lige nu',
    (select count(*)::text from public.menu_varer where aktiv and udsolgt),
    'Er tallet højt uden grund, står halvdelen af kortet skjult for gæsten.'

  -- ---------- FORRETNINGEN ----------
  union all select 4, 'Tager vi imod bestillinger?',
    coalesce((select vaerdi #>> '{}' from public.indstillinger
               where noegle = 'bestilling_aaben'), 'ikke sat'),
    'false = hele bestillingsafsnittet skjuler sig på forsiden.'

  union all select 5, 'Åbningstider udfyldt',
    (select count(*)::text || ' af 7 dage' from public.aabningstider),
    'Uden dem ved siden ikke, hvornår der kan hentes.'

  union all select 6, 'Dagens ret sat i dag',
    coalesce((select navn from public.dagens_retter
               where dato = current_date limit 1), 'ingen'),
    'Ikke en fejl — men afsnittet skjuler sig, når der ikke er en.'

  -- ---------- DET, GÆSTEN SKAL KUNNE FINDE ----------
  union all select 7, 'Facebook-adresse',
    coalesce(nullif((select vaerdi #>> '{}' from public.indstillinger
               where noegle = 'social_facebook'), ''), 'MANGLER'),
    'admin → Kontakt. Uden den ryger knappen AF siden — vi linker '
    || 'aldrig til "#", for så tror gæsten, det er hende, der gør noget forkert.'

  union all select 8, 'Instagram',
    coalesce(nullif((select vaerdi #>> '{}' from public.indstillinger
               where noegle = 'social_instagram'), ''), 'mangler'),
    'Samme sted. Tom = linket vises ikke.'

  union all select 9, 'Billeder lagt op',
    (select count(*)::text from public.indstillinger
      where noegle like 'foto_%' and vaerdi #>> '{}' <> ''),
    'admin → Forside. Uden fotos står farvede flader — ikke tomme kasser, '
    || 'men heller ikke mad.'

  -- ---------- DET, DER SKAL VIRKE PÅ DAGEN ----------
  union all select 10, 'Borde oprettet',
    (select count(*)::text from public.borde),
    'Uden mindst ét bord virker ingen QR-kode.'

  union all select 11, 'Telefoner tilmeldt beskeder',
    (select count(*)::text from public.push_abonnementer),
    '0 = ingen får besked, når der kommer en bestilling. '
    || 'admin → Kontakt → "Besked på telefonen", fra den INSTALLEREDE app.'

  union all select 12, 'Kommende offentlige arrangementer',
    (select count(*)::text from public.kalender
      where type = 'arrangement' and offentlig and dato >= current_date),
    'Er der ingen, siger kalendersiden det — den finder ikke på nogen.'

  union all select 13, 'Arrangementer, man kan reservere til',
    (select count(*)::text from public.kalender
      where type = 'arrangement' and offentlig and dato >= current_date
        and coalesce(tilmelding, false)),
    'Tilmelding er slået FRA som standard — de fleste arrangementer på en '
    || 'havn er "kig forbi".'
)
select
  nr,
  hvad,
  svar,
  case
    when nr = 2  and svar = 'INGEN'   then '❌'
    when nr = 7  and svar = 'MANGLER' then '❌'
    when nr = 4  and svar <> 'true'   then '❌'
    when nr = 10 and svar = '0'       then '❌'
    when nr = 11 and svar = '0'       then '⚠️'
    when nr = 1  and svar like '%af%' and split_part(svar, ' ', 1) <> split_part(svar, ' ', 3)
                                      then '⚠️'
    else '✅'
  end as status,
  hjaelp
from tjek order by nr;
