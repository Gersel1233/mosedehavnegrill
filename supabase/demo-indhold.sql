-- ============================================================
--  DEMO-INDHOLD: HELE SIDEN OP AT KØRE PÅ ÉT KALD
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--  (Filen tjekker det selv i punkt 0 og standser, hvis den står
--  det forkerte sted — men kig alligevel.)
--
--  HVAD DEN GØR
--  ------------------------------------------------------------
--  Siden er bygget, så et tomt felt betyder en skjult blok. Det
--  er med vilje: en overskrift over ingenting fortæller gæsten,
--  at der aldrig sker noget her. Men det betyder også, at en tom
--  database ser ud som en halv side — og det er ikke det, der
--  skal vises frem.
--
--  Den her fil fylder alle de blokke ud på én gang:
--
--    GÆSTESIDEN
--      dagens ret          hele bestillingspanelet på forsiden
--      to gange livemusik  banneret under heroen + arrangementer/
--      fem nyheder         tidslinjen på forsiden + nyheder/
--      dagens kugler       pillerne på tavlen i isafsnittet
--      en note på kortet   linjen under menukortet
--
--    PERSONALESIDEN
--      fire bestillinger   Overblik, Bestillinger OG Salg
--      en forespørgsel     Forespørgsler
--      et bordønske        Borde med dagens billede
--      en udlejning        Baglokalet med lokalets kalender
--      en intern note      viser, at kalenderen kan holde på noget
--
--  ⚠️  DET HER ER PLADSHOLDERE, IKKE OPLYSNINGER
--  ------------------------------------------------------------
--  Retten, arrangementerne, nyhederne og kuglerne er SKREVET AF
--  OS for at vise formen. De er ikke bekræftet af forretningen.
--  Så længe de står i databasen, står de på den offentlige side,
--  og en gæst kan møde op efter stegt flæsk, ingen har lavet —
--  eller efter musik, ingen har booket.
--
--  Derfor:
--    · Ret dem i admin, så snart ejeren har sagt, hvad der SKAL
--      stå. Det er ét felt pr. ting og tager to minutter.
--    · Eller kør supabase/ryd-demo.sql, som fjerner præcis de
--      rækker, den her fil lagde ind — hverken mere eller mindre.
--
--  DEMO-RÆKKERNE PÅ PERSONALESIDEN kan kendes på tre ting:
--  referencen indeholder DEMO, telefonnummeret begynder med
--  0000, og der står en intern note på hver af dem. Numrene er
--  med vilje umulige: ingen dansk telefon begynder med 00, så
--  ingen bliver ringet op ved en fejl.
--
--  ⚠️  HAR DU PUSH SLÅET TIL, PLINGER TELEFONEN. Webhooken
--  fyrer på hver ny række, og filen laver syv. Det er ikke en
--  fejl — men det er rart at vide, før den køres midt i en vagt.
--
--  HVAD DEN IKKE RØRER
--  ------------------------------------------------------------
--    · Menukortet og priserne. Det er ejerens egne tal
--    · auto_bekraeft. Om en bestilling er en aftale eller et
--      opkald er ejerens beslutning, ikke en demo-indstilling
--    · Åbningstiderne
--    · Alt hvad personalet selv har skrevet. Filen rører kun
--      sine egne rækker, og den rydder dem op, før den skriver
--
--  Ingen priser på lokalet, ingen antal personer, intet
--  leveringsområde. De ting koster en skuffet kunde i telefonen
--  og står øverst på listen "Ejeren skal bekræfte" i README.
--  Prisen på dagens ret ER med, fordi den hører til retten og
--  forsvinder sammen med den.
--
--  Filen kan køres igen. Den rydder sit eget op først.
-- ============================================================

begin;

-- ------------------------------------------------------------
--  ET STED AT SAMLE DET, FILEN ÆNDREDE
--  ----------------------------------------------------------
--  Filen rydder selv de tre ting af vejen, der før fik den til at
--  standse (se punkt 0b). Men den må ikke gøre det i stilhed: at
--  åbne en lukket forretning på dens egen hjemmeside er en stor
--  ting, og den skal stå i rapporten til sidst med et advarsels-
--  tegn foran, så den kan gøres om med det samme.
-- ------------------------------------------------------------
--  on commit PRESERVE, ikke drop: rapporten til sidst står EFTER
--  commit — den skal kunne læse tabellen der. Og drop først, for
--  kører nogen filen to gange i den samme forbindelse, findes den
--  allerede.
drop table if exists demo_aendringer;
create temporary table demo_aendringer (hvad text) on commit preserve rows;


-- ------------------------------------------------------------
--  0) VÆRN: STÅR VI DET RIGTIGE STED?
--     ----------------------------------------------------------
--     18. august 2026 blev spiis' setup.sql kørt i Mosede-
--     projektet, fordi to faner lignede hinanden. Oprydningen tog
--     en aften. Den fejl skal ikke kunne gentages den anden vej,
--     og et menneske, der læser en advarsel i en kommentar, er
--     ikke et værn — det er et håb.
--
--     Filen skriver syv rækker med gæstedata. Den skal have lov
--     til at gøre det ét sted og kun ét.
-- ------------------------------------------------------------
do $$
declare
  v_navn text;
begin
  select navn into v_navn from public.lokationer where id = 'mosede';

  if v_navn is null then
    raise exception E'\n\n  STOP — der er ingen forretning med id ''mosede'' i den her database.\n'
      '  Enten står du i det forkerte projekt, eller også er\n'
      '  supabase/setup.sql + flerlejer.sql ikke kørt endnu.\n'
      '  Tjek projekt-id''et i adresselinjen: det skal være epwyjzakvvbxtpvnhvbn.\n';
  end if;

  if v_navn not ilike '%mosede%' then
    raise exception E'\n\n  STOP — forretningen ''mosede'' hedder "%" her.\n'
      '  Det ligner ikke Mosede Havnegrill og Ishus, og filen skriver\n'
      '  ikke gæstedata i en database, den ikke kan genkende.\n', v_navn;
  end if;
end $$;


-- ------------------------------------------------------------
--  0b) VÆRN: ER DER OVERHOVEDET ÅBENT?
--     ----------------------------------------------------------
--     To kontakter kan lukke siden ned: sæsonlukningen og
--     "tag imod bestillinger". Er en af dem slået fra, gør
--     databasens udløser (supabase/lukkedag-vaern.sql) det rigtige
--     og afviser hver eneste bestilling — også dem, filen her
--     prøver at lægge ind. Så ville halvdelen af demoen lande og
--     resten fejle, og fejlteksten ville pege på en udløser i
--     stedet for på kontakten.
--
--     FILEN STANDSEDE FØR. Den sagde "åbn sæsonen i admin, og
--     kør filen igen", fordi en fil, der lydløst åbner en lukket
--     forretning på dens egen hjemmeside, ikke må findes.
--
--     Det viste sig at være den forkerte halvdel af reglen.
--     Resultatet var, at filen ikke gjorde NOGET — hele
--     transaktionen rullede tilbage — og den, der kørte den, så
--     en rød fejl og en uændret side. "Den gider ikke loade
--     demo-indholdet" (kunden, 23/8).
--
--     Nu rydder den de tre ting af vejen OG siger det højt i
--     rapporten til sidst, med et ⚠️ foran. Det er den halvdel,
--     der betød noget: ikke at den lader være, men at ingen kan
--     komme til at gøre det uden at opdage det.
--
--     Værnet om FORRETNINGEN ovenfor står urørt. Det er den ene
--     fejl, der ikke må kunne ske.
-- ------------------------------------------------------------
do $$
declare
  v_saeson jsonb;
  v_aaben  jsonb;
  v_tider  int;
begin
  select vaerdi into v_saeson from public.indstillinger
   where lokation_id = 'mosede' and noegle = 'saeson';

  if coalesce((v_saeson->>'lukket')::boolean, false) then
    update public.indstillinger
       set vaerdi  = jsonb_set(coalesce(vaerdi, '{}'::jsonb), '{lukket}', 'false'::jsonb),
           aendret = now()
     where lokation_id = 'mosede' and noegle = 'saeson';
    insert into demo_aendringer values
      ('⚠️  SÆSONEN VAR LUKKET og er åbnet. Skulle den være lukket, '
       || 'så luk den igen i admin under Forside.');
  end if;

  select vaerdi into v_aaben from public.indstillinger
   where lokation_id = 'mosede' and noegle = 'bestilling_aaben';

  if v_aaben is not null and v_aaben::text = 'false' then
    update public.indstillinger
       set vaerdi = 'true'::jsonb, aendret = now()
     where lokation_id = 'mosede' and noegle = 'bestilling_aaben';
    insert into demo_aendringer values
      ('⚠️  "Tag imod bestillinger" var slået FRA og er slået til. '
       || 'Skru tilbage under Bestillinger → Regler for bestilling.');
  end if;

  /* ÅBNINGSTIDER: kun hvis der slet ikke er nogen.
     10-20 alle dage er bekræftet af kunden (se README), så det er
     ikke et gæt. Men står der allerede tider, er de ejerens, og
     dem rører filen ikke — heller ikke hvis alle dage er lukkede.
     Det er en beslutning, ikke en mangel. */
  select count(*) into v_tider
    from public.aabningstider where lokation_id = 'mosede';

  if v_tider = 0 then
    insert into public.aabningstider (lokation_id, ugedag, aabner, lukker, lukket)
    select 'mosede', g, '10:00', '20:00', false from generate_series(0, 6) g;
    insert into demo_aendringer values
      ('⚠️  Der var ingen åbningstider. Sat til 10-20 alle dage '
       || '(kundens egne tal). Ret dem under Åbningstider.');
  end if;
end $$;


-- ============================================================
--  DEL 1 — GÆSTESIDEN
-- ============================================================

-- ------------------------------------------------------------
--  1) DAGENS RET
--     Åbner hele bestillingspanelet på forsiden: datofeltet,
--     retten med tæller, rækkerne videre til de andre afdelinger,
--     tid, navn, telefon og "Send bestilling".
--
--     Bemærk hvad der IKKE er her: et serveringsvindue.
--     Designbundtet skrev "serveres 11.30-14.00", men det tal er
--     ikke bekræftet. Noten på siden viser forretningens rigtige
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
--  1b) FORSIDENS BESTILLING SKAL HAVE NOGET AT SÆLGE
--     ----------------------------------------------------------
--     Formularen flyttede ind på forsiden 23/8, og den sælger alt
--     UNDTAGEN smørrebrødet og isen. Har ejeren ikke sat flueben
--     ved en eneste kategori, er dens liste tom — og så skjuler
--     hele afsnittet sig selv, som det skal.
--
--     For en demo betyder det, at det bedste på siden ville være
--     usynligt. Derfor åbnes de kategorier her, der HAR priser i
--     menukort.sql. Det er ejerens beslutning i virkeligheden;
--     ryd-demo.sql tager fluebenene af igen.
--
--     VARSLET SÆTTES TIL 2 TIMER, og det er det eneste sted i
--     filen, hvor en driftsindstilling ændres. Grunden: står det
--     på 24 timer — "bestil senest dagen før" — kan dagen i dag
--     ikke vælges, og så kan DAGENS ret ikke bestilles i dag.
--     Det er en rigtig modsætning, ejeren skal tage stilling til,
--     men en demo, hvor dagens ret ikke kan lægges i kurven, viser
--     ikke det, den skal. ryd-demo.sql sætter 24 tilbage.
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
select 'mosede', 'bestilbare_kategorier',
       coalesce(jsonb_agg(k.id order by k.sortering), '[]'::jsonb), now()
  from public.menu_kategorier k
 where k.lokation_id = 'mosede'
   and k.aktiv is not false
   and k.afdeling <> 'is'
   and k.navn !~* 'smørrebrød|fyld'
   -- Kun kategorier, hvor mindst én vare HAR en pris. En åbnet
   -- kategori uden priser giver en fold med lutter "??".
   and exists (select 1 from public.menu_varer v
                where v.kategori_id = k.id and v.aktiv is not false
                  and v.pris is not null)
on conflict (lokation_id, noegle) do update
  set vaerdi = excluded.vaerdi, aendret = now();

insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
values ('mosede', 'bestilling_varsel_timer', to_jsonb(2), now())
on conflict (lokation_id, noegle) do update
  set vaerdi = excluded.vaerdi, aendret = now();


-- ------------------------------------------------------------
--  2) KALENDEREN — HERFRA KOMMER LIVEMUSIK-BANNERET
--     ----------------------------------------------------------
--     Banneret under heroen viser det NÆSTE offentlige
--     arrangement. Er der ingen, er banneret der ikke — og det
--     var præcis dét, der manglede: der var ikke noget i vejen
--     med koden, kalenderen var bare tom.
--
--     `offentlig` SKAL være true. Er den false, er det
--     personalets egen note, og så holder både adgangsreglen i
--     databasen og filteret i browseren den tilbage.
--
--     TO DATOER OG IKKE ÉN. Med kun én række står siden
--     arrangementer/ med et enkelt kort, og så ligner kalenderen
--     noget, nogen prøvede én gang. To viser, at det er en serie,
--     og den anden overtager banneret, når den første er forbi.
--
--     Datoerne regnes ud her, så arrangementerne aldrig er
--     overståede, næste gang filen køres. Et overstået
--     arrangement bliver ikke til et banner.
--
--     TITLERNE NÆVNER INGEN NAVNE. Designbundtet skrev "Ronni &
--     de Salte" — at finde på et bandnavn er værre end at finde
--     på en ret, for et bandnavn kan tilhøre nogen.
-- ------------------------------------------------------------
delete from public.kalender
 where lokation_id = 'mosede'
   and titel in ('Live musik på molen',
                 'Livemusik på trædækket',
                 'Leverandør kommer med varer',
                 'Vi lukker tidligt (personalefest)');

insert into public.kalender
  (lokation_id, type, dato, slut_dato, titel, beskrivelse, emoji, offentlig, lukker_kl)
values
  -- Førstkommende lørdag. current_date + (6 - isodow) hvis vi ikke
  -- er nået forbi, ellers ugen efter. Modulo 7 gør, at "i dag er
  -- lørdag" giver i dag og ikke om syv dage.
  ('mosede', 'arrangement',
   current_date + ((6 - extract(isodow from current_date)::int + 7) % 7),
   null,
   'Live musik på molen',
   'Grillen er tændt, og der spilles på molen. Kom ned og få en plads ved langbordene.',
   '🎶', true, null),

  -- Lørdagen efter
  ('mosede', 'arrangement',
   current_date + ((6 - extract(isodow from current_date)::int + 7) % 7) + 7,
   null,
   'Livemusik på trædækket',
   'Vi spiller op igen. Kom i god tid, hvis I vil sidde ud til vandet.',
   '🎸', true, null),

  /* EN INTERN NOTE. Den står i admin og kommer ALDRIG på
     hjemmesiden — hverken i banneret eller på arrangementer/.
     Den er med, fordi den viser den vigtigste regel i
     kalenderen: personalet kan skrive til sig selv i den samme
     liste uden at råbe det ud. Er den synlig for gæsten efter
     en kørsel, er der noget galt med adgangsreglen. */
  ('mosede', 'arrangement',
   current_date + 4, null,
   'Leverandør kommer med varer',
   'Intern note — står kun på personalesiden.',
   null, false, null),

  /* EN TIDLIG LUKNING tre uger ude. Den viser, at kalenderen kan
     mere end lukkedage, og den ligger langt nok væk til ikke at
     klippe dagens bestillingstider. Sidste afhentning bliver en
     halv time før — det regner js/bestilling.js selv ud. */
  ('mosede', 'tidlig_lukning',
   current_date + 21, null,
   'Vi lukker tidligt (personalefest)',
   null, null, true, '15:00');


-- ------------------------------------------------------------
--  3) FEM NYHEDER
--     Forsidens tidslinje viser de tre nyeste; resten står på
--     nyheder/. Fem er valgt, så nyhedssiden har noget at rulle
--     i — med tre er den lige så tom som forsiden.
--
--     Datoerne ligger bagud fra i dag, så rækkefølgen er den
--     rigtige uanset hvornår filen køres. Den øverste får den
--     røde prik, der ånder.
-- ------------------------------------------------------------
delete from public.nyheder
 where lokation_id = 'mosede'
   and titel in (
     'Længere åbent i weekenden',
     'Livemusik på molen igen',
     'Nyt i køledisken',
     'Smørrebrød ud af huset',
     'Trædækket er klar til sæsonen'
   );

insert into public.nyheder (lokation_id, titel, tekst, dato, aktiv)
values
  ('mosede',
   'Længere åbent i weekenden',
   'Vi har åbent hele weekenden. Ishuset lukker en halv time efter køkkenet — kig på åbningstiderne nederst på siden for dagen i dag.',
   current_date - 1, true),

  ('mosede',
   'Livemusik på molen igen',
   'Der bliver spillet på molen igen på lørdag. Grillen er tændt, og der er langborde ud mod vandet. Se datoerne i kalenderen.',
   current_date - 3, true),

  ('mosede',
   'Nyt i køledisken',
   'Udvalget af kager og desserter skifter. Spørg ved lugen, hvad der står i dag — der er som regel noget nyt i weekenden.',
   current_date - 8, true),

  ('mosede',
   'Smørrebrød ud af huset',
   'Vi laver smørrebrød til fødselsdage, møder og frokoster. Bestil på siden, så ringer vi og bekræfter — du betaler, når du henter.',
   current_date - 15, true),

  ('mosede',
   'Trædækket er klar til sæsonen',
   'Bordene er sat op ud mod bådene. Der er ingen reservation nødvendig i hverdagene — kom bare ned.',
   current_date - 26, true);


-- ------------------------------------------------------------
--  4) DAGENS KUGLER PÅ TAVLEN
--     Pillerne nederst i isafsnittet. Farven er en ren hex-værdi
--     og andet tages ikke imod: js/side.js tjekker mønsteret,
--     før den sætter den i en style-attribut, så en tekst fra
--     databasen ikke kan smugle CSS ind.
--
--     ⚠️  Smagene er DE ALMINDELIGE og ikke forretningens egne.
--     Personalet skifter dem i admin under Forside, og det er
--     hele pointen med feltet: tavlen ved lugen og siden skal
--     sige det samme.
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
values ('mosede', 'dagens_kugler', jsonb_build_array(
    jsonb_build_object('navn', 'Vanilje',    'farve', '#f4e6c8'),
    jsonb_build_object('navn', 'Chokolade',  'farve', '#6b4326'),
    jsonb_build_object('navn', 'Jordbær',    'farve', '#e5776f'),
    jsonb_build_object('navn', 'Lakrids',    'farve', '#3a3a3a'),
    jsonb_build_object('navn', 'Hindbær',    'farve', '#c94f6d')
  ), now())
on conflict (lokation_id, noegle) do update
  set vaerdi = excluded.vaerdi, aendret = now();


-- ------------------------------------------------------------
--  5) NOTEN UNDER MENUKORTET
--     Kun hvis feltet er tomt. Har personalet skrevet en note,
--     bliver den stående — det er dem, der ved, hvad køkkenet
--     kan tage hensyn til.
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
values ('mosede', 'menu_note',
  to_jsonb('Smørrebrød kan leveres glutenfrit eller uden smør. Spørg os, vi hjælper gerne.'::text),
  now())
on conflict (lokation_id, noegle) do nothing;


-- ------------------------------------------------------------
--  6) PLADSER PÅ TRÆDÆKKET
--     Bruges KUN på personalesiden, til dagens billede på
--     Borde-fanen: "12 af 40 pladser sagt ja til". Tallet står
--     ikke ét sted på gæstesiden, og gæsten bliver ikke afvist
--     af det — hun spørger, og personalet svarer.
--
--     Kun hvis feltet er tomt: hvor mange stole der er, ved
--     ejeren og ikke vi.
-- ------------------------------------------------------------
insert into public.indstillinger (lokation_id, noegle, vaerdi, aendret)
values ('mosede', 'bord_pladser', to_jsonb(40), now())
on conflict (lokation_id, noegle) do nothing;


-- ============================================================
--  DEL 2 — PERSONALESIDEN
--  ------------------------------------------------------------
--  Halvdelen af produktet er den skærm, personalet står ved, og
--  en tom skærm viser ingenting om, hvad den kan. Rækkerne her
--  fylder alle fire lister ud og rammer flere statusser, så man
--  kan se hele vejen: ny → bekræftet → klar → afhentet.
--
--  De er skrevet, så de rammer hver sin del af skærmen:
--
--    to nye        Overblik siger "lige modtaget", og
--                  Bestillinger viser den røde ny-markering
--    en klar       viser mærket og knappen "Sæt som afhentet"
--    to afhentede  Salg får både omsætning og "mest solgte"
--    en forespørgsel, et bord og en udlejning
--
--  DATOEN REGNES UD. En lukkedag i kalenderen ville få
--  databasens udløser til at afvise indsættelsen — og med rette.
--  Derfor findes den første åbne dag først.
-- ============================================================

-- Ryd egne rækker først, så filen kan køres igen.
delete from public.bestillinger    where reference like 'SM-DEMO-%';
delete from public.forespoergsler  where reference like 'FO-DEMO-%';
delete from public.bordbestillinger where reference like 'BO-DEMO-%';
delete from public.udlejninger     where reference like 'UD-DEMO-%';

do $$
declare
  v_aaben  date;   -- første dag uden lukkedag eller tidlig lukning
  v_aaben2 date;   -- den næste af slagsen
  v_solgt  date;   -- en åben dag, der ALLEREDE er passeret
begin
  /* Første og anden åbne dag i de kommende to uger. "Åben"
     betyder her: ingen lukkedag og ingen tidlig lukning i
     kalenderen. Åbningstiderne tjekkes ikke — udløseren i
     lukkedag-vaern.sql gør det heller ikke, og en bestilling på
     en ugedag med lukket er personalets sag at ringe om. */
  select min(g.d)::date into v_aaben
    from generate_series(current_date, current_date + 13, interval '1 day') g(d)
   where not exists (
     select 1 from public.kalender k
      where k.lokation_id = 'mosede'
        and k.type in ('lukkedag', 'tidlig_lukning')
        and g.d::date between k.dato and coalesce(k.slut_dato, k.dato));

  select min(g.d)::date into v_aaben2
    from generate_series(current_date, current_date + 13, interval '1 day') g(d)
   where g.d::date > v_aaben
     and not exists (
     select 1 from public.kalender k
      where k.lokation_id = 'mosede'
        and k.type in ('lukkedag', 'tidlig_lukning')
        and g.d::date between k.dato and coalesce(k.slut_dato, k.dato));

  /* ER DER LUKKET HVER DAG DE NÆSTE TO UGER, springes
     personalesidens rækker over — men GÆSTESIDEN er allerede
     skrevet ovenfor og bliver stående. Før rullede en exception
     her hele filen tilbage, og så fik man hverken det ene eller
     det andet. En halv demo, der siger hvad der mangler, er mere
     værd end ingen demo og en rød fejl. */
  if v_aaben is null then
    insert into demo_aendringer values
      ('⚠️  Der er lukket hver dag de næste to uger, så der er ikke lagt '
       || 'bestillinger, borde og udlejninger ind. Kig i kalenderen i admin.');
    return;
  end if;

  /* DEN AFHENTEDE SKAL LIGGE BAGUD. Salg tæller kun det, der er
     hentet, og en afhentet bestilling med en hentedato ude i
     fremtiden er noget vrøvl på skærmen.

     Datoen skal stadig være åben: udløseren i lukkedag-vaern.sql
     afviser en indsættelse på en lukkedag, uanset om rækken er
     afhentet. Og den må tidligst være i går —
     bestilling_dato_ok tillader current_date - 1 og frem.

     Første udgave satte den bare til current_date. Var i dag en
     lukkedag, faldt HELE filen på den ene række, og fejlen pegede
     på en udløser i stedet for på kalenderen. */
  select max(g.d)::date into v_solgt
    from generate_series(current_date - 1, current_date, interval '1 day') g(d)
   where not exists (
     select 1 from public.kalender k
      where k.lokation_id = 'mosede'
        and k.type in ('lukkedag', 'tidlig_lukning')
        and g.d::date between k.dato and coalesce(k.slut_dato, k.dato));

  -- Er både i går og i dag lukket, lægges den på den første åbne
  -- dag i stedet. Så mangler salgstallet for "i dag", men filen
  -- kører igennem — og et lukket døgn HAR ingen omsætning.
  v_solgt := coalesce(v_solgt, v_aaben);

  -- ---- FIRE BESTILLINGER ----------------------------------
  -- Telefonnumrene begynder alle med 0000 og er derfor umulige
  -- som danske numre. Ingen bliver ringet op ved en fejl.
  -- Hver sit nummer: bremsen tæller fem pr. nummer i døgnet, og
  -- dobbelt-reglen er (telefon, dato, tid).
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, fyld, antal, besked, status, intern_note, oprettet)
  values
    ('SM-DEMO-01', 'mosede', 'Anna Vind', '00000001',
     v_aaben, '12:00',
     '[{"navn":"Smørrebrød","antal":4,"pris":55},
       {"navn":"Rejemad","antal":2,"pris":75}]'::jsonb,
     '["Leverpostej med bacon","Æg og rejer"]'::jsonb,
     6, 'Må gerne stå klar præcis kl. 12 — vi skal videre.',
     'ny', 'DEMO-række — fjernes med supabase/ryd-demo.sql', now() - interval '8 minutes'),

    ('SM-DEMO-02', 'mosede', 'Jens Overgaard', '00000002',
     v_aaben, '12:30',
     '[{"navn":"Håndmad","antal":8,"pris":24}]'::jsonb,
     '[]'::jsonb,
     8, null,
     'ny', 'DEMO-række — fjernes med supabase/ryd-demo.sql', now() - interval '35 minutes'),

    ('SM-DEMO-03', 'mosede', 'Kirsten Holm', '00000003',
     v_aaben, '13:15',
     '[{"navn":"Tartar","antal":2,"pris":95},
       {"navn":"Æbleflæsk","antal":2,"pris":75}]'::jsonb,
     '[]'::jsonb,
     4, 'Én uden løg, tak.',
     'klar', 'DEMO-række — fjernes med supabase/ryd-demo.sql', now() - interval '3 hours'),

    -- Afhentet: den her er den eneste, der tæller som salg.
    -- Se README — det tæller først, når maden er ud ad døren.
    ('SM-DEMO-04', 'mosede', 'Peter Riis', '00000004',
     v_solgt, '11:30',
     '[{"navn":"Flæskestegssandwich","antal":3,"pris":89},
       {"navn":"Smørrebrød","antal":2,"pris":55}]'::jsonb,
     '[]'::jsonb,
     5, null,
     'afhentet', 'DEMO-række — fjernes med supabase/ryd-demo.sql', now() - interval '5 hours');

  -- ---- EN FORESPØRGSEL ------------------------------------
  -- type skal være en af tre: catering, baglokale, selskab.
  -- Listen står også i js/store.js som FORESPOERGSEL_TYPER.
  insert into public.forespoergsler
    (reference, lokation_id, type, navn, telefon, email, dato, antal_personer,
     besked, status, intern_note, oprettet)
  values
    ('FO-DEMO-01', 'mosede', 'selskab', 'Marianne Bech', '00000005',
     null, current_date + 34, 18,
     'Vi skal holde rund fødselsdag. Kan I lave smørrebrød til os, og er der plads indenfor, hvis det regner?',
     'ny', 'DEMO-række — fjernes med supabase/ryd-demo.sql', now() - interval '2 hours');

  -- ---- ET BORDØNSKE ---------------------------------------
  -- Bekræftet, så dagens billede på Borde-fanen har noget at
  -- lægge sammen mod pladserne.
  insert into public.bordbestillinger
    (reference, lokation_id, navn, telefon, dato, tid, antal_personer,
     besked, status, intern_note, oprettet)
  values
    ('BO-DEMO-01', 'mosede', 'Familien Dahl', '00000006',
     v_aaben, '18:00', 4,
     'Gerne ud mod vandet, hvis det kan lade sig gøre.',
     'bekraeftet', 'DEMO-række — ringet og sagt ja. Fjernes med ryd-demo.sql',
     now() - interval '1 day'),

    ('BO-DEMO-02', 'mosede', 'Søren Krag', '00000007',
     coalesce(v_aaben2, v_aaben), '17:30', 6,
     null,
     'ny', 'DEMO-række — fjernes med supabase/ryd-demo.sql', now() - interval '25 minutes');

  -- ---- EN UDLEJNING AF BAGLOKALET -------------------------
  -- Bekræftet: så er dagen taget, og lokalets kalender i admin
  -- viser den. Databasen har et unikt indeks, der sikrer, at
  -- nummer to ikke kan få ja til den samme dag.
  insert into public.udlejninger
    (reference, lokation_id, navn, telefon, dato, antal_personer,
     besked, status, intern_note, oprettet)
  values
    ('UD-DEMO-01', 'mosede', 'Greve Bådelaug', '00000008',
     current_date + 12, null,
     'Vi vil gerne holde vores generalforsamling hos jer. Cirka to timer om aftenen.',
     'bekraeftet', 'DEMO-række — dagen er taget. Fjernes med ryd-demo.sql',
     now() - interval '4 days');
end $$;


commit;


-- ============================================================
--  RAPPORT
--  ------------------------------------------------------------
--  Supabases SQL Editor viser KUN den sidste sætnings svar, og
--  hverken notices eller warnings. Skal der stå noget, man kan
--  læse, skal det være en select til sidst. Se README-afsnittet
--  "Supabases SQL Editor viser ikke beskeder".
--
--  Der tælles på det, SIDEN kigger efter — ikke på "lagde vi
--  otte rækker ind". En række, der er lagt ind, men filtreret
--  væk af en adgangsregel eller en dato, er ikke det samme som
--  en blok, gæsten kan se.
-- ============================================================
with t as (
  select
    (select count(*) from public.indstillinger
      where lokation_id = 'mosede' and noegle = 'dagens_ret'
        and coalesce(vaerdi->>'navn', '') <> '')                   as dagens_ret,
    /* Forsidens bestilling skjuler sig selv, hvis der ikke er
       åbnet for en eneste kategori. Så skal rapporten sige det —
       ellers leder man efter et afsnit, der med vilje ikke er der. */
    (select coalesce(jsonb_array_length(vaerdi), 0) from public.indstillinger
      where lokation_id = 'mosede'
        and noegle = 'bestilbare_kategorier')                      as aabne_kat,
    (select count(*) from public.kalender
      where lokation_id = 'mosede' and type = 'arrangement'
        and offentlig
        and coalesce(slut_dato, dato) >= current_date)             as musik,
    (select count(*) from public.kalender
      where lokation_id = 'mosede' and not offentlig)              as interne,
    (select count(*) from public.nyheder
      where lokation_id = 'mosede' and aktiv)                      as nyheder,
    (select jsonb_array_length(vaerdi) from public.indstillinger
      where lokation_id = 'mosede' and noegle = 'dagens_kugler')   as kugler,
    (select count(*) from public.bestillinger
      where lokation_id = 'mosede' and slettet is null)            as bestillinger,
    (select count(*) from public.bestillinger
      where lokation_id = 'mosede' and slettet is null
        and status = 'afhentet')                                   as afhentede,
    (select count(*) from public.forespoergsler
      where lokation_id = 'mosede' and slettet is null)            as foresp,
    (select count(*) from public.bordbestillinger
      where lokation_id = 'mosede' and slettet is null)            as borde,
    (select count(*) from public.udlejninger
      where lokation_id = 'mosede' and slettet is null)            as udlejninger
)
select
  case when dagens_ret = 1 and musik >= 1 and nyheder >= 3
            and coalesce(kugler, 0) >= 1 and afhentede >= 1
            and coalesce(aabne_kat, 0) >= 1
       then '✅ HELE SIDEN ER FYLDT UD — hård-genindlæs (Cmd+Shift+R), og kig både på forsiden og i admin'
       else '❌ NOGET MANGLER — se tallene herunder'
  end                                                              as svar,
  case when coalesce(aabne_kat, 0) >= 1
       then '🥪 Forsidens bestilling har ' || aabne_kat || ' kategori(er) at sælge'
       else '❌ Ingen kategorier er åbnet — forsidens bestillingsafsnit findes ikke'
  end                                                              as bestillingen,
  case when musik >= 1
       then '🎶 Livemusik-banneret står under heroen'
       else '❌ Intet kommende arrangement — banneret er der ikke'
  end                                                              as banneret,
  '⚠️  Alt herover er PLADSHOLDERE. Ret dem i admin, eller kør supabase/ryd-demo.sql'
                                                                   as husk,
  /* DET, FILEN ÆNDREDE PÅ FORRETNINGEN. Står der noget her, har
     den slået en kontakt, ejeren selv havde sat — og så skal det
     læses, ikke skimmes. Er der intet, står der en tom streng. */
  coalesce((select string_agg(hvad, '  ·  ') from demo_aendringer),
           'Intet blev lavet om på forretningens egne indstillinger')
                                                                   as aendret_paa_forretningen,
  dagens_ret, aabne_kat as aabne_kategorier,
  musik, interne as interne_noter, nyheder, kugler,
  bestillinger, afhentede, foresp as forespoergsler, borde, udlejninger
from t;

/* Oprydning: den midlertidige tabel har gjort sit. Den forsvinder
   af sig selv, når forbindelsen lukker, men SQL-editoren i
   Supabase holder på forbindelsen. */
drop table if exists demo_aendringer;
