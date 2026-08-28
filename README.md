# Mosede Havnecafe

Hjemmeside og personale-system for **Mosede Havnecafe**,
Havnevej 20I, 2670 Greve — smørrebrød, grill og is på Mosede Havn.

Bygget af [Lesreg](https://lesreg.dk). Statisk side i ren HTML, CSS og
JavaScript. Ingen framework, intet build-step, ingen npm for at se siden.

## Status

| Del | Status |
|---|---|
| Databaseskema (`supabase/setup.sql`) | ✅ færdig, testet mod Postgres 16 |
| Adgangsregler (RLS) | ✅ testet mod Postgres 16: gæster kan læse alt, kun skrive bestillinger, og ikke læse dem igen |
| Flere forretninger i samme database | ✅ `supabase/flerlejer.sql` — 23 prøver mod Postgres 16, alle BESTOD |
| Bremse på bestillinger | ✅ `supabase/bremse.sql` — 5 pr. nummer pr. døgn, 40 pr. forretning pr. time |
| Udgivelses-workflow | ✅ kører – siden er live |
| Forsiden | ✅ bygget efter designbundtet — og bestillingsformularen ligger PÅ den (23/8) |
| Menukort på egen side | ✅ `menu.html` — spiis' kortstil, og administrerbart helt (navn, beskrivelse, pris, rækkefølge, kategorier) |
| Smørrebrød ud af huset | ✅ salgsside, eget afsnit på forsiden **og sin egen bestillingsside** (`bestil/`) |
| Bestillinger i admin | ✅ ny/bekræftet/klar/afhentet, med regler ejeren selv sætter |
| SEO-fundament | ✅ titler, canonical, JSON-LD, robots, sitemap |
| Eget domæne | ⏳ mangler – se nedenfor |
| Intro-animation | ✅ færdig – 1,43 s, ved hvert besøg, altid til at klikke væk |
| Admin (personalets side) | ✅ færdig, og delt op i `js/admin/` med én fane pr. fil |
| Playwright-tests | ✅ grønne på mobil + computer, 28 filer |
| `js/config.js` | ✅ anon-nøglen er lagt ind og kontrolleret |
| Åbningstider | ✅ bekræftet af kunden (10–20 alle dage) |
| Adressen | ⏳ kunden siger 20I, menukortet siger 20 – se nedenfor |
| Menukortet | ✅ 14 kategorier, 151 varer fra kundens eget kort |
| Fotografier og film | ✅ fire fotos, turen forbi lugerne i hero, isfilmen i to formater |
| Vandtemperatur og vind | ⏳ ingen kilde endnu – felterne er tomme og skjulte |
| Fire priser med "ca." | ⏳ skal bekræftes – se nedenfor |
| Forretningens navn | ✅ Mosede Havnecafe, bekræftet af kunden |
| Prøvet mod den rigtige database | ✅ 18.–19./8-2026: hele SQL-rækkefølgen kørt, admin-login og forside efterprøvet. Fase 0: 23 × BESTOD. Fase 2 (forespørgsler): 23 × BESTOD |

## Gæstesiden er skiftet ud: designet fra Claude Design (23/8)

Mikkel designede hele mobilsitet selv i Claude Design og afleverede
det som et 1:1-handoff. Ordren står i `havnegrillen-handoff.md`:
pixel for pixel, tekst for tekst, ingen forbedringer — systemerne
kobles på bagefter. De ni sider ligger på roden (`index.html`,
`m-menukort.html`, `m-tapas.html`, seks `h-*.html`), designsystemet i
`havnegrillen.css`/`havnegrillen.js`, og billedpladserne er
`<image-slot>`-elementer, til de rigtige fotos kommer.

Tre ting afveg fra handoffet, alle dokumenteret i CLAUDE.md:
telefon-attrappens krom (falsk statuslinje, ø, hjemmestreg) er ikke
med på de rigtige sider; alle lokale css/js-adresser fik `?v=__V__`;
og menukortsidens lånte v3-links er lagt om til sider, der findes.

**Formularerne er attrapper endnu**, og **tallene er pladsholdere**
— og designet ER i luften (23/8, Mikkels beslutning, spurgt
direkte). De to bekræftede tal blev rettet før udgivelsen: telefon
28 87 13 43 og Havnevej 20I overalt. Resten (4,8, mailen, priser,
arrangementer) redigerer personalet. Vagten over opdigtede tal
(parkeret i `tests-gamle/`) skal genopstå mod de nye sider. De gamle gæstesider (`bestil/`, `bord/`,
`selskaber/`, `baglokale/`, `menu.html`, ...) står stadig på deres
adresser med motoren i behold, til systemfasen har flyttet den ind i
de nye sider. `ved-bordet/` og admin er ikke en del af designet og
er urørte.

## Systemfasen, trin 1: læsesiden hænger på databasen

Skallen er designet, og den skal blive stående. Trin 1 kobler de
ting, gæsten **læser**, til forretningens egne tal — uden at flytte
et eneste element. To nye filer gør det, og de rører kun det, der
allerede står i opmærkningen:

| Fil | Hvad den fylder ud |
|---|---|
| `js/skal/forside.js` | Heroens statuspille, musikbanneret, dagens ret, nyhederne, åbningstiderne og tapasfadets pris |
| `js/skal/menukort.js` | Hele `m-menukort.html` — forretningens 230 varer i stedet for `menu-data.js` |

`index.html` og `m-menukort.html` har fået tre script-tags hver
(`js/config.js`, `js/store.js` og koblingen). Der er ikke ændret ét
tegn i designets opmærkning, og der skal **ingen SQL** køres:
tabellerne, adgangsreglerne og admin-fanerne fandtes i forvejen.

### De to regler, koblingen er skrevet efter

**1) Vi overskriver kun, når databasen har noget at sige.** Har
ejeren ikke sat en pris på tapasfadet, bliver designets pladsholder
stående — en kobling, der skriver "0,-" eller "—" hen over designet,
er værre end ingen kobling. Det gælder også menukortet: svarer
databasen ingenting, står `menu-data.js` som nødmenu, præcis som
forsiden altid har haft en.

**2) Et afsnit uden noget at vise findes ikke.** Er der ingen dagens
ret, ingen nyheder eller intet kommende arrangement, skjuler
afsnittet sig. Designets "Stegt flæsk med persillesovs" er en
pladsholder, og den må ikke stå som dagens ret en tirsdag i januar.
Afsnittene skjules med `style.display`, ikke med `hidden`:
`.music` har `display:flex` i stylesheetet, og en klasse med display
slår browserens egen regel for `[hidden]`.

### Tre steder, hvor designet og databasen ikke passer 1:1

Det er ikke fejl, det er huller — og de skal besluttes, ikke kodes
udenom:

- **"Ishuset i højsæson · til 22"** forsvinder fra åbningstiderne.
  Der er én ugeplan i databasen, ikke to. Skal ishuset have sine
  egne tider, er det en tabel mere
- **Kategorinoterne på menukortet** ("Serveres 8–11") forsvinder.
  `menu_kategorier` har ingen notekolonne — det er ét felt i admin,
  hvis ejeren vil kunne skrive dem
- **Tegnene på menukortet** kommer fra afdelingen (mad/is/drikke),
  ikke fra kategorinavnet. Tre sande tegn slår fjorten gættede —
  samme regel som på den gamle side

**Udsolgte varer står ikke på kortet.** Designet har ingen
udsolgt-tilstand, og at finde på en ville være at lave om på
skallen. Et kort, der tilbyder noget, køkkenet ikke har, er værre
end et kort med én ret mindre.

**Åbningstiderne brydes altid ved i dag.** Designet viser ens dage
slået sammen ("Mandag – torsdag 10–20") og dagen i dag på sin egen
røde linje. Begge dele overlever: grupperingen stopper ved i dag,
uanset hvordan ugen er sat op.

**Statuspillens prik bliver, som den er tegnet.** Designet har kun
én prikfarve, og en grøn "åben"-prik ville være en tilføjelse til
designet — ikke en kobling.

### Prøverne

`tests/skal-forside.spec.js` og `tests/skal-menukort.spec.js`, 16
prøver på hver profil. De er set fejle: med koblingens to
script-tags pillet ud faldt **13 af 16** igennem. De tre, der
består uden koblingen, er vagterne — "skallen er urørt" og
"nødmenuen står" — og de skal bestå begge veje.

Prøven `skallen er urørt` sammenligner hele rækkefølgen af
forsidens afsnit. Falder den, er der lavet om på designet.

Og tvillingen til `store-skriv`-prøven er tilbage: **gæstesiden må
ikke have skrivelaget.** Den var parkeret, så længe den nye forside
slet ikke indlæste `store.js`. Det gør den nu, og så er der noget
at måle igen — en gæsteside, der pludselig kan skrive, er en
gæsteside, der har fået fat i noget, den ikke skal.

### De nye sider åbnes med `åbnSkal`, ikke `åbn`

To ting kostede tid, og begge er målt:

- **Ingen intro.** `åbn()` springer intro-animationen over og
  venter på, at `#intro` forsvinder. De nye sider har ingen intro,
  så den ventede 8 sekunder pr. prøve på noget, der aldrig kom
- **Google Fonts holder sideindlæsningen tilbage.** Stylesheetet i
  `<head>` er render-blokerende, og i prøvemiljøet kan
  forespørgslen ikke komme ud. **Målt: 12,7 sekunder pr.
  sideindlæsning**, før den gav op

`åbnSkal` i `tests/hjaelp.js` gør begge dele af: den springer
introen over og spærrer `fonts.googleapis.com` og
`fonts.gstatic.com`. Skrifterne bliver på siden — det er kun
prøverne, der springer dem over, og ingen prøve måler bogstavernes
bredde. De to filer gik fra 2,4 minutter til 32 sekunder.

## Trin 2a: forsidens bestilling skriver i køkkenet

Formularen på forsiden var en attrap. Nu er den ægte, og den bruger
den motor, `bestil/` har brugt hele tiden.

| Hvad | Hvorfra |
|---|---|
| Datovælgeren | åbningstiderne + kalenderen + `bestilling_varsel_timer` |
| Tidspunkterne | den valgte dags åbningstid, halve timer, sidste en halv time før lukketid |
| Varelisten | `Butik.udvalg(d, 'uden-fyld')` — det ejeren har åbnet for i admin |
| Dagens ret | indstillingen `dagens_ret`, øverst med `.item.hi`, kun i dag |
| Send-knappen | `Butik.bestil()` → tabellen `bestillinger` |

Filen er `js/skal/bestil.js`, og `index.html` har fået to
script-tags mere. **Ingen SQL** — motoren og tabellen stod klar.

### Reglerne bor ét sted nu: js/bestil-regler.js

Hvilke dage der kan vælges, hvilke tider, varslet og
mindsteantallet lå inde i `js/bestilling.js` — formularens egen fil
på `bestil/` og `ved-bordet/`. Den nye forside har en helt anden
formular og skal have præcis de samme regler.

**To udgaver af "hvornår kan man hente?" er én for meget.** Rettes
varslet det ene sted og glemmes det andet, kan gæsten bestille til
om to timer på den ene side og ikke på den anden — og ingen af
delene ser forkerte ud.

`js/bestil-regler.js` er 5 kB, kender ingen HTML, og tager
forretningens data og en dato. `bestilling.js` beholder sine egne
navne (`muligeDage`, `tiderFor` …) som henvisninger, så resten af
den fil er uændret.

**Én regel flyttede IKKE med:** bordets undtagelse fra
mindsteantallet ("én is ved bord 7 er ikke for lidt"). Den er en
egenskab ved DEN formular, ikke ved forretningen, og den bliver i
`bestilling.js`.

### "+ tilføj" folder kategorien ud

Designets vareliste har to slags rækker: én med tæller (dagens ret)
og fem med et rødt "+ tilføj", som ikke gjorde noget. De fem er
kategorierne fra admin nu, og et tryk folder deres varer ud
nedenunder — som de **samme** `.item`-rækker med tæller. Der kommer
ingen ny form på skærmen, kun flere af den, der er. Teksten skifter
til "– luk", så folden kan lukkes igen.

Alternativet var at fjerne de fem rækker og liste varerne direkte.
Det ville se anderledes ud, og skallen skal blive stående.

### Fejl står i sumlinjen

Designet har ikke tegnet et fejlfelt. Et opfundet ét ville være en
ændring af skallen, så beskeden står i `.note` over knappen — der,
hvor summen står — med et ⚠ foran. Summen kommer igen, så snart
gæsten retter feltet.

### To felter forsvinder, når forretningen ikke har dem

- **"Hvordan vil I spise?"** findes kun, hvis `spis_her` er slået
  til i admin. Er den ikke, er spørgsmålet ikke et spørgsmål, og
  bestillingen er afhentning
- **Hele afsnittet** findes ikke, hvis sæsonen er lukket, hvis
  `bestilling_aaben` er slået fra, eller hvis der ikke er noget at
  sælge. Så peger den flydende pille på `h-smorrebrod.html` i
  stedet for ned i ingenting

### En fælde, prøven fangede

Første udgave tømte hele `.field`'en, før rækkerne blev tegnet — og
tog designets `<label>`"Vælg jeres retter" med sig. Overskriften
var væk, og formularen så stadig rigtig ud. Prøven, der
sammenligner alle syv etiketter i panelet, fandt det med det samme.
Nu ryddes kun `.item`-rækkerne.

**Prøverne er set fejle:** med `js/skal/bestil.js` pillet ud faldt
**10 af 11** igennem. Den ene, der bestod, er vagten "skallen er
urørt" — den skal bestå begge veje.

## Trin 2b: smørrebrødssiden, samme motor

`h-smorrebrod.html` sender rigtige bestillinger nu — gennem
**samme fil** som forsiden, `js/skal/bestil.js`. Forskellene står
som opsætning i `SIDER` øverst i filen:

| | Forsiden | Smørrebrødssiden |
|---|---|---|
| Udvalg | `uden-fyld` — stykkerne, ikke de 29 slags fyld | `kun-smoer` |
| Spørgsmålet | Spis her / tag med, som lugen spørger | Hentes / leveres |
| Varelisten | kategorier med "+ tilføj", der folder ud | stykkerne direkte med tæller |
| Skjules ved lukket | hele afsnittet, pillen peger videre | kun panelet — resten af siden sælger stadig |

Siden kendes på et af dens **egne felter** (`#sdato`) og ikke på
filnavnet: adresser kan flytte, felter flytter ikke.

Skrev vi afsendelsen to gange, ville den anden langsomt komme til
at gøre noget andet end den første — og det ville ingen opdage,
før en gæst fik forkert mad.

### Levering: slået fra, og feltet forsvinder med den

`levering` er et flueben i admin, og det er slået **fra** som
standard. Er det fra, findes hverken spørgsmålet "Levering eller
afhentning?" eller adressefeltet, og bestillingen er afhentning.

Designets linje **"150 kr. inden for 10 km af havnen. Min. 20 stk.
ved levering"** står stadig i filen. Den er ude af syne, så længe
fluebenet er slået fra — men **den skal bekræftes af ejeren, før
han slår det til.** Ingen af de tal er verificeret.

**En levering bekræftes ALDRIG automatisk**, heller ikke når
`auto_bekraeft` står til. Kvitteringen siger "vi ringer og
bekræfter leveringen — vi skal lige se på adressen først".

### Hvad der forsvandt, og hvorfor

- **"Tilbehør: øl, snaps og vand"** — rækken kunne ikke bestilles:
  siden sælger kun smørrebrød. En række med "+ tilføj", der ikke
  har noget bag sig, er en knap, der ikke gør noget
- **"Datoer inden for 2 dage kan ikke vælges"** — et fast tal,
  hvor varslet sættes i admin. Teksten regnes nu ud af
  `bestilling_varsel_timer`
- **"Bestillingen er først bekræftet når I har fået sms fra os"** —
  der bliver ikke sendt sms. Feltet er sumlinjen nu, som på
  forsiden

### Der er ingen fyldvælger, og det er designets valg

De 29 slags fyld vælges med flueben på `bestil/`. Designets
smørrebrødsside har ingen fyldvælger — pladsholderen i
beskedfeltet siger "ønsker til fyld", så ønskerne skrives i fri
tekst. At bygge en vælger ville være at tegne noget nyt.

### En fælde, prøven fangede

Panelet har flere `.hint`, og første udgave skrev varslet hen over
manchetten under overskriften. Den så rigtig ud — og datolinjen
stod stadig med designets faste "2 dage". Hinten findes nu ud fra
**datofeltet**: inde i det (forsiden) eller lige efter det
(smørrebrødssiden).

**Prøverne er set fejle:** uden koblingen faldt **6 af 7** igennem.

## Trin 2c: tapasfadet

Ejerens tre krav (23/8): fadet skal kunne bestilles **to dage i
forvejen**, gæsten skal kunne **ringe om indholdet**, og
bestillingen skal **markeres anderledes i admin**. Alle tre er
bygget, og der er **ingen SQL**.

### Varslet er fadets eget

`varselTimer(d, mindst)` i `js/bestil-regler.js` tager nu et
frivilligt "mindst". Tapassiden beder om 48 timer, og ejeren kan
sætte sit eget tal med indstillingen `tapas_varsel_timer`.

**Det kan kun trække varslet OP, aldrig ned.** Kunne en enkelt
formular sætte varslet ned, ville den kunne omgå det, ejeren har
sat i admin — og køkkenet fik en bestilling, de ikke kan nå.
Står forretningens varsel på fem dage, gælder fem dage også for
fadet.

Etiketten på datofeltet skriver tallet selv: designets
"(tidligst i morgen)" er blevet "(mindst 2 dage før)".

### Mærket i admin

`Admin.erTapas(b)` er sand, når en af bestillingens linjer hedder
noget med tapas. Kendingen er varens **navn** og ikke en ny
kolonne: fadet er en vare på menukortet som alt andet, og en
kolonne mere ville skulle vedligeholdes af nogen.

Mærket **🧀 Tapasfad** står to steder:

- **Bestillinger** — først i rækken af mærker, før status og spis her
- **Overblik** — og det slår bord-, leverings- og spis her-mærket

Farven er hav-blågrøn (`.maerke.m-tapas`), ikke rød: rød betyder
"gør noget NU", og et fad med to dages varsel er planlagt arbejde.

### Prisen er menukortets

Designet regnede med 199 kr. pr. person og 150 kr. for cavaen.
Begge tal er pladsholdere — ejerens liste kom uden ét eneste tal.
Prisen hentes fra `menu_varer`, og er den ikke sat, står der
**"Pris følger"** i sumboksen i stedet for et beløb.

Cava-rækken (`.addon`) findes kun, hvis der ligger en tilsvarende
vare i menukortet. At sende en vare, ingen har oprettet, er at
finde på et produkt på forretningens vegne.

**⚠️ Uden fadet i menukortet kan der ikke bestilles**, og
formularen skjuler sig. Resten af siden bliver — den sælger
stadig fadet — og telefonnummeret står i foden. Kør
`supabase/menukort-ud-af-huset.sql` og sæt priserne i admin.

### Ring-kortet bliver stående

Designets `.callbox` ("Ønsker I noget til eller fra fadet? Ring
til os") er ejerens egen beslutning og røres ikke. Fadets indhold
aftales i telefonen — der er ingen tilvalgsliste, og at bygge en
ville være at tegne noget nyt.

### En tavs fejl, prøven fangede

`n * fad.pris + b * bobler.pris` kaster, når der ikke er noget
tilkøb: `bobler` er null, og `b` er nul — men udtrykket bliver
alligevel regnet ud. Fejlen kunne ikke ses på skærmen: sumboksen
beholdt designets pladsholder, og formularen så helt rigtig ud.

**Prøverne er set fejle:** uden koblingen faldt **10 af 11**
igennem (9 på siden, 2 i admin).

## Trin 3: forespørgslerne, kalenderen og mail-knappen

Selskaber, catering og baglokalet sender rigtige forespørgsler nu.
Det er **én tabel med tre indgange**, som fase 2 byggede den —
`js/skal/forespoergsel.js` er ét modul med tre opsætninger, ikke
tre moduler.

**Det er den første SQL siden trin 1.** Kør i Mosede-projektet:

```
supabase/forespoergsel-kalender.sql
supabase/proev-forespoergsel-kalender.sql     → skal skrive ALLE 20 AF 20 BESTOD
```

Rækkefølgen er … → `udlejning.sql` → `skraldespand.sql` →
**`forespoergsel-kalender.sql`**.

### Detaljerne er felter, ikke fritekst

Kolonnen `detaljer` (jsonb) tager formularernes egne valg:

| Side | Hvad der lander i detaljer |
|---|---|
| Selskaber | anledning, hvor (hos-jer / ud-af-huset), mad |
| Baglokalet | tidsrum, mad (med-mad / kun-lokalet), servering |
| Catering | anledning, levering/afhentning, adresse, tid, fade, hvad der skal leveres |

Databasen kræver et **objekt** og højst 4000 tegn. Uden kolonnen
ville alle valgene ende som fri tekst i beskeden, hvor personalet
skulle læse en sætning igennem for at finde tallet — og hvor
ingen kan sortere eller søge på dem.

### Havnen er ét sted

Er baglokalet lejet ud den 12., kan der ikke også holdes selskab
hos jer den 12. Det er de samme lokaler, det samme køkken og de
samme hænder.

**Hvad der optager en dag:**

- en **bekræftet** udlejning af baglokalet
- en **aftalt** forespørgsel om baglokalet
- en **aftalt** forespørgsel om selskab, medmindre den er **ud af huset**

**Hvad der IKKE gør:** catering (den er pr. definition ud af
huset), selskaber ud af huset, og alt, der ikke er aftalt endnu.

**Kun aftalte dage er optagne**, og det er vigtigt: en
forespørgsel, der lige er kommet ind, er et spørgsmål. Spærrede en
ny forespørgsel dagen, kunne én person med et telefonnummer lukke
hele efteråret på ti minutter.

Reglen står to steder, og de skal sige det samme:
`public.mosede_optager_dagen` i databasen og `optagerDagen` i
`js/store.js`. Databasens halvdel måles af prøvefilen, browserens
af `tests/skal-forespoergsel.spec.js`.

### ⚠️ Visningen optagne_dage må ALDRIG få en kolonne mere

`optagne_dage` har præcis tre: forretning, dato og hvad slags. Der
er ikke ét navn, ét telefonnummer eller én besked i den.

Visningen kører med sin **ejers** øjne og springer
adgangsreglerne på tabellerne nedenunder over — det er hele
meningen, for gæsten må ikke læse hverken udlejninger eller
forespørgsler. Men det betyder også, at den dag nogen tilføjer
`navn` til visningen, er hele gæstelisten åben for internettet.
Prøve 4 tæller kolonnerne og falder, hvis der kommer en fjerde.

### Værnet er databasens, ikke browserens

`mosede_dagen_er_optaget()` er `security definer` med låst
søgesti, og den sidder på både `forespoergsler` og `udlejninger`.
Uden `security definer` slog den op med gæstens øjne, fandt
ingenting og sagde ja til hver eneste dato — uden fejl og uden
spor. Nøjagtig den fejl havde lukkedagsværnet.

Oveni ligger et delvist unikt indeks: **to medarbejdere på hver
sin iPad kan ikke begge trykke "aftalt" på samme dag.**

### Mail-knappen

Et tilbud på et selskab er tal, datoer og forbehold — det skal
skrives, ikke siges i en telefon ved en travl luge. Knappen på
forespørgselskortet åbner personalets eget mailprogram med
adressen, referencen, datoen, antallet og detaljerne skrevet ind.
Kun **udkastet** — prisen skriver personalet selv, for et system,
der fandt på en pris, ville sende den af sted i deres navn.

**De tre formularer har fået et e-mail-felt.** Det er en
tilføjelse til designet, og den er nødvendig: uden en adresse har
knappen ingen at skrive til. Feltet er frivilligt.

### En fejl, prøven fangede — og den kunne have kørt mad ud

Designets segmenter findes i to slags, og de holder styr på sig
selv hver sin måde:

- `[data-seg]` flytter `.on`, når man trykker
- `[data-toggles]` gør **ikke** — designets egen kode skjuler
  eller viser bare feltet nedenunder, og den fremhævede knap
  bliver stående, hvor den startede

Første udgave læste `.on` begge steder. **Målt: en catering, hvor
gæsten havde trykket Afhentning, blev sendt som en LEVERING — med
adressen på.** Køkkenet ville køre ud med mad, nogen stod og
ventede på ved lugen. Svaret læses nu af det, designet faktisk
holder styr på: om feltet nedenunder er synligt.

**Bemærk:** at den fremhævede knap ikke flytter sig, er designets
egen opførsel. Den er ikke rettet — skallen skal blive stående.

### Datoen

Designet har en fast dato i feltet (`value="2026-09-19"`). Den
ryger: en pladsholder, ingen har valgt, ville blive sendt som
gæstens ønskede dato, den dag hun glemmer at røre feltet. I
stedet sættes `min` (i dag) og `max` (to år frem), så feltet ikke
kan give en dato, databasen alligevel afviser.

**Prøverne er set fejle:** uden koblingen faldt **12 af 13**
igennem (10 på siderne, 3 i admin).

## Menukortet er bygget om: en side, man læser (24/8)

`m-menukort.html` kom med handoffet i sit eget v3-tema —
sandfarvet grund, marineblåt sidehoved, Bebas Neue — og med en
**kurv**: plusknapper på hver vare, en kurvbjælke i bunden og en
"Gå til bestilling", der førte til forsidens formular. Kurven
fulgte ikke med. Gæsten lagde tre ting i den og begyndte forfra.

Kundens ord (24/8): man skal ikke kunne bestille derinde, og det
skal se ud som resten af siden.

### Man bestiller ét sted

Der er ingen plusknapper, ingen kurv, ingen sum og ingen søgning.
Kortet er til at **læse**, og én knap i bunden fører hen til
bestillingen. Prøven `man kan ikke bestille herinde` tæller
`.plus`, `#cartbar`, `#cart` og `[data-step]` til nul — kommer
kurven igen, kommer også vejen, hvor gæsten mister sit valg
undervejs.

### Siden er bygget af havnens egne dele

Ingen nyt tema. `havnegrillen.css` giver `.thead`, `.panel`,
`.tag`, `.eyebrow`, `.dots`, `.sub`, `.hint`, `.fine` og `.g`.
`menukort.css` er lille og har kun de tre former, siden har og de
andre ikke har:

1. kortet **I dag** med overskrift og åbningstid i samme linje
2. **ugelisten**, hvor hver dag er en række
3. **kategorierne** som kort ved siden af hinanden

**Fem filer er slettet:** `mosede-m.css`, `mosede-m.js`,
`menu.css`, `menu.js` og `menu-data.js`. De var menukortets eget
tema og egen motor, og ingen side indlæser dem længere. De ligger
i historikken. En prøve tjekker, at de ikke kommer med igen —
to temaer på én side er sådan, den slags sniger sig tilbage.

### Hvad der kommer fra databasen

| Afsnit | Kilde |
|---|---|
| I dag | indstillingen `dagens_ret` + `aabningstider` + `kalender` |
| Ugen der kommer | dagens ret i dag; resten "Følger snart…" |
| Fast sortiment | `menu_kategorier` + `menu_varer` |

**Ugen er halvt tom med vilje.** Der er kun ét felt til dagens ret
i admin, så kun i dag kan fyldes ud. De øvrige seks dage siger
"Følger snart…", og en lukkedag fra kalenderen siger "Lukket". En
opdigtet ret på torsdag ville være et løfte, køkkenet ikke har
givet — hele ugen kræver en tabel, `dagens_retter`, som ikke er
bygget endnu.

### Emojier, farver og et hop-bånd (24/8)

Kunden bad om det: *"add emojier og gør den lige så flot og
spændende ... med farver osv og bedre overskuelighed."*

- **Et emoji pr. kategori.** Tegnet gættes ud fra kategoriens
  navn — det FØRSTE mønster, der passer, vinder, så de præcise
  står øverst i listen: `fyld` før `smørrebrød` (ellers får "Vælg
  fyld til smørrebrødet" et rugbrød), `softice` før `vafler`.
  **Kolonnen `emoji` på kategorien vinder**, hvis den nogensinde
  kommer i databasen — koden er skrevet, så ejeren kan overtage
  tegnet med ét felt i admin. Indtil da er listen et forslag, og
  et skævt emoji er en skæv tegning, ikke en forkert oplysning
  om maden
- **Farven kommer fra afdelingen** (mad/is/drikke), som ejeren
  sætter i admin: husets røde til maden, den varme koral fra
  "om os" til isen, og den gule fra statusprikken til
  drikkevarerne. Alle tre står i `havnegrillen.css` i forvejen —
  der er ikke fundet en ny farve på
- **Antallet ude til højre** ("12 varer"): en lang side bliver
  til en liste, man kan overskue, når man kan se hvor meget der
  er i en kasse, før man ruller ned i den
- **Hop-båndet** klæber under topbjælken, mens man er i
  sortimentet, og forsvinder af sig selv, når afsnittet er
  forbi. Den kategori, man kigger på, markerer sig selv og ruller
  sig selv frem i båndet — ellers kan man stå i "Øl" og se en
  stribe, hvor "Morgenmad" er markeret ude til venstre

**Målt:** topbjælken er 115 px før første rul og 109 efter, når
den fryser til. Båndet klæber på 109 — et gæt på 64 lagde det bag
kronen.

**Båndet bygges af de kort, der FAKTISK står på siden**, ikke af
listen fra databasen. En chip, der peger på et kort, der blev
sorteret fra (alt udsolgt), er en genvej til ingenting.


**Udsolgte varer står ikke på kortet**, og en vare uden pris siger
**"spørg"** — aldrig et nul. 79 af forretningens varer har ikke
fået en pris endnu, og et 0 ville stå som gratis.

**Et tomt menukort er ikke en tom side:** står der ingen
kategorier i databasen, kommer der en linje med telefonnummeret i
stedet.

### Hvad der IKKE er med

Skærmbillederne, forlægget kom fra, har to ting, vi ikke har data
til, og de er ikke opfundet: **"kun hverdage"** pr. kategori
(der er ingen ugedagsstyring på `menu_kategorier`) og **"kun 6
tilbage"** (`menu_varer` har `udsolgt` som ja/nej, ikke et antal).

**Søgefeltet er væk.** Det stod i den gamle udgave og ikke i
forlægget. Med 230 varer er det et savn — sig til, hvis det skal
tilbage.

## Ejerens egen liste, kørt igennem mod kortet (24/8)

Ejeren sendte hele sortimentet igen, og listen er sammenlignet
**post for post** med de 230 varer, der stod i databasen.
`supabase/menukort-ejerens-liste.sql` lukker de huller, der var
**éntydige** — og stiller resten som spørgsmål i stedet for at
gætte.

Kør i Mosede-projektet:

```
supabase/menukort-ejerens-liste.sql
supabase/proev-menukort-ejerens-liste.sql   → skal skrive ALLE 18 AF 18 BESTOD
```

Efter kørslen: **21 kategorier og 242 varer**.

### Hvad filen gør

**En ny kategori:** *Glutenfri, laktosefri og vegansk* med fem
varer. Den stod som sin egen blok på ejerens liste og fandtes
slet ikke i databasen.

**Syv varer, der manglede:** fransk hotdog i to størrelser,
pølsemix, hjemmelavet lun frikadelle, frikadelle med surt, bæger
med vaffelknas og softice, og isbaren.

**Otte beskrivelser**, ejeren har skrevet indholdet på — og som
stod tomme i databasen. Vigtigst er **tapasfadet**: gæsten kunne
ikke se, hvad der var på et fad til tolv, før hun bestilte det.
Nu står alle tretten ting der. Det samme gælder brunchtallerkenen,
den engelske morgenmad, all in one-sandwichen og sandwichens fyld.

Teksterne er ejerens egne. Der er ikke lagt et ord til.

### Kategorien kan bære en note

`menu_kategorier` har fået kolonnen `note`. Den er der, fordi en
kategorinote nu manglede **to gange**: "På toastbrød eller
rugbrød" hører til alle tolv slags pindemad, og designet havde
"Serveres 8–11" over morgenmaden. Skrevet på hver vare ville den
fylde tolv gange og sige det samme.

Feltet står i admin under kategoriens navn og er frivilligt. En
tom note gemmes som **ingenting** og ikke som en tom streng — en
tom streng ville tegne en tom linje på kortet.

**⚠️ Feltet må ikke have klassen `navn`.** Første udgave gav det
`class="navn kat-note"`, og så fandt `.kat-hoved .navn` **to**
felter i stedet for ét. Fire prøver faldt på det med det samme.

### Ingen priser er gættet

Ejerens liste har **ikke ét tal i sig**. Hver eneste ny vare står
derfor uden pris og viser "spørg" på kortet, til prisen sættes i
admin. Prøve 16 tæller efter: får en af de tolv nye varer en pris,
er den fundet på.

### Der slettes ingenting

Er der en vare i databasen, som ikke står på ejerens liste, kan
den være lagt ind med vilje siden sidst. Prøve 17 tjekker, at de
tre, der ligner en konflikt, **stadig står der** — de er
spørgsmål, ikke skrald.

### De ti spørgsmål, filen stiller i stedet for at gætte

Rapporten til sidst i SQL-filen skriver dem ud. Det er de steder,
hvor ejerens liste og databasen siger noget, der **ligner**
hinanden uden at være det samme, og hvor et gæt ville lave enten
en dublet eller en forkert vare:

1. **Fiskedelle med surt** står i basen; ejeren skriver
   **Frikadelle** med surt. Begge står der nu — er den ene en
   tastefejl?
2. **Indbagte rejer**: basen siger "med pommes", ejeren "med salat"
3. **Kebabmix**: basen har "Mix med pommes og salat" med samme fyld
4. **Lun leverpostej / delle / steg**: ejeren har tre linjer, basen to
5. **Hansen fransk vaffel**: står i basen, ikke på ejerens liste
6. **Kage** under morgenmads-tilkøb — den står allerede under kaffen
7. **Popcorn og chips**: skal de også stå under Snacks og slik?
8. **Vin**: hvid/rød/rosé hver for sig, eller én samlet pris?
9. **Boblevaffel med softice** vs. "med 2 kugler eller softice"
10. Ejeren skrev **"Mere ?"** to steder — der mangler måske noget

## Priserne skal kunne skrives af ejeren selv (24/8)

Efter ejerens liste står **242 varer på kortet, og over halvdelen
uden pris** — hans liste havde ikke ét tal i sig, og intet er
gættet. En vare uden pris kan ikke bestilles; den står med en
tankestreg og kan kun ønskes.

Det er ejerens arbejde at skrive dem, og det skal kunne gøres på
en eftermiddag ved et køkkenbord. **Ingen SQL — intet nyt i
databasen.** Fanen Menukort er værktøjet nu.

### Man kunne ikke se, hvor hullerne var

118 tomme prisfelter spredt ud over 21 kategorier, og den eneste
måde at finde dem på var at rulle hele kortet igennem. Derfor står
der et **prispanel øverst på fanen**:

- **Tælleren**: "118 af 242 varer mangler en pris"
- **Filteret**: ét tryk viser KUN de varer, der mangler en pris —
  og **kategorier uden huller forsvinder helt**. En overskrift med
  ingenting under er en kategori, man tror er tom, og så opretter
  nogen varen, der allerede findes
- **Et tomt prisfelt er stiplet.** Dæmpet og ikke rødt: det er
  arbejde, der ikke er gjort endnu, ikke en fejl. Tredive røde
  felter ville få fanen til at ligne en formular med tredive fejl i

### ⚠️ Et gem tørrede de andre felter af

Den fejl, hele øvelsen står og falder med. `Admin.gem` henter data
igen og **tegner hele fanen om** (se `js/admin/kerne.js`). Havde
ejeren skrevet ti priser og trykket Gem på den ene række, var de
ni væk — uden en fejl, uden en advarsel, og uden at det kunne ses
andre steder end i den mappe, tallene var skrevet af fra.

Derfor **huskes det skrevne på tværs af optegninger**: `skrevet{}`
i `js/admin/menukort.js` holder varens id → teksten i feltet, og
posten ryddes først, når databasen svarer med det samme tal.
Sammenligningen går på TALLET, ikke på teksten — "45", "45,00" og
"45.0" er den samme pris, og ellers ville en gemt pris blive
hængende som "ikke gemt" for evigt.

Og derfor er der **én knap, der gemmer dem alle**: skriv hele
kategorien igennem, tryk én gang. **Enter i et prisfelt gør det
samme.** Enter i navne- og beskrivelsesfeltet gemmer kun rækken —
de er enkeltrettelser, og rækkens eget Gem tager prisen med.

**Én forkert pris standser hele gemningen.** Halvdelen gemt og
halvdelen ikke er værre end ingenting: så ved ingen, hvad der står
i databasen, og hele kortet skal læses igennem igen.

Prøven *"det skrevne overlever, at en ANDEN række bliver gemt"* er
set fejle med den gamle udgave — feltet stod tomt.

### Fanen er et overblik nu, ikke en liste (28/8)

Kundens ord: fanen skal være "mere overskuelig" og kunne *"passe med antal,
melde udsolgt, få antal tilbage."* **Ingen SQL** — kolonnerne kom med
`menukort-antal-og-dage.sql`.

Fanen kunne det hele i forvejen, men den kunne kun SIGE én ting: hvor mange
priser der manglede. Det var det rigtige den dag, 118 priser skulle skrives.
Til daglig er spørgsmålet et andet — hvad er udsolgt, hvad er ved at slippe
op, og hvor er den pølse henne.

**Fem tal øverst, og hvert af dem er en knap.** Alle · Udsolgt · Få tilbage ·
Mangler pris · Skjult. Et tryk filtrerer listen, så tallet også er vejen hen
til arbejdet og ikke bare noget at kigge på. Rødt kun på de to, der skifter
flere gange om dagen — en manglende pris er et stykke arbejde, der ligger og
venter, ikke en alarm.

**Et søgefelt**, og det er det vigtigste redskab på et kort med 242 varer:
"hvor er pølsen henne" er tyve sekunders rulning uden det. Der søges i både
navn og beskrivelse — ejeren husker ikke altid, hvad varen hedder, men han
husker, hvad der er i den.

**Kategorierne folder sig, når kortet er langt.** ⚠️ Målt, ikke gættet:
ejerens kort er 242 varer i 21 kategorier, altså omkring 280 rækker felter med
alt slået ud. Grænsen er **30 varer** — under den fylder hele kortet to
skærme, og dér er en fold bare et tryk mere mellem personalet og arbejdet. Et
filter eller en søgning åbner folderne selv: de har allerede skåret ned til
det, man leder efter.

**Folden er ÉN linje**, og den bærer navnet plus tallene: *"Smørrebrød · 14
varer · 2 udsolgt · 4 uden pris"*. Overskriften alene er ikke nok til at
vælge en kategori fra — "Burgere" siger ikke, om der er noget at se på i den i
dag. Tallene er de samme som de fem felter øverst, så en lukket fold ikke kan
skjule et rødt tal.

**⚠️ Første udgave foldede kun VARERNE væk** og lod kategorihovedet stå:
navnefelt, afdeling, dage, pile, Gem og et tomt notefelt. Målt på et skud:
21 lukkede kategorier fyldte stadig fire skærme, og notefeltet lignede noget,
der skulle udfyldes. Er den lukket, står der navnet og tallene, og intet
andet.

### Antal tilbage kan ses uden at læse

Feltet fandtes, men et tal i et felt ligner enhver anden værdi, og med 242
rækker ruller man forbi det. Nu farves det ved **få tilbage** og fyldes rødt
ved **nul**.

**⚠️ Grænsen for "få" er gæstesidens.** `js/skal/menukort.js` skriver "Kun N
tilbage" fra og med fem. To udgaver af "hvornår er det ved at slippe op" ville
betyde, at hjemmesiden advarede gæsten, mens admin sagde, alt var fint.

**⚠️ Få tilbage er ikke nul tilbage.** En vare, der er talt ned til nul, ER
udsolgt — bremsen i `menukort-antal-og-dage.sql` sætter selv fluebenet — og
den hører under Udsolgt. Stod den begge steder, ville de to tal tilsammen være
større end antallet af varer, og så holder man op med at stole på dem.

**⚠️ Og feltet findes ikke, før kolonnen gør.** `maaAntal()` læser det,
DATABASEN har svaret; et felt uden en kolonne bag sig ser rigtigt ud,
personalet skriver "10 tilbage" i det, og gemmet fejler.

### Ét tryk om morgenen

Det, der er meldt udsolgt i går, skal på kortet igen i dag, og med tolv
udsolgte varer er det tolv tryk plus tolv gange at finde rækken. Knappen **"Sæt
alle N til salg igen"** står KUN, når man kigger på de udsolgte — den er et
redskab til den opgave, ikke en knap på hele fanen.

**⚠️ Den rører aldrig dem, der er talt ned til nul.** Satte vi bare fluebenet
fra, kunne gæsten lægge varen i kurven — og bremsen ville afvise hele
bestillingen ved afsendelsen. Hun ville ikke ane hvorfor. De skal have et nyt
antal, og linjen under knappen siger det med et tal.

**⚠️ `#pris-filter` beholder sit id og sin plads** ved sætningen om hullerne.
Den var vejen igennem 242 varer på en eftermiddag, og selv om "Mangler pris"
nu også er et af de fem tal, går begge gennem `saetFilter` — så de ikke kan
komme til at være uenige om, hvad der er slået til.

**⚠️ Prøvernes `åbnMenufanen` venter på `#menu-status`**, ikke på
`.kat-hoved`: et stort kort har ingen kategorihoveder, før nogen åbner en
fold.

### Genvejen står på hver kategori nu

"Sæt samme pris på alle" stod kun på fyldet. Med ejerens fulde
sortiment inde er den lige så meget værd på syv pølser og seks
burgere; der er ikke noget særligt ved fyld ud over, at det var
det første, vi mødte. Den vises på **hver kategori med mere end én
vare** — på en kategori med én er den bare et felt mere at kigge på.

**Standarden er at UDFYLDE, ikke at overskrive.** Har ejeren
allerede skrevet 45 på tre af dem, er de tre det eneste, nogen har
bekræftet, og et tryk må ikke tage dem med. Knappen siger, hvad
den rammer ("Sæt på de 12 uden pris"), og et flueben ved siden af
udvider den til alle — med vilje og med et tal i bekræftelsen.

Feltets id er **`samlepris-<kategori-id>`**. Det hed
`fyld-samlepris`, dengang værktøjet kun stod ét sted; med det navn
på 21 kategorier ville `getElementById` ramme den første, og et
felt uden et entydigt id kan hverken prøves eller fejlsøges.

### Antal og varsel står, hvor priserne skrives

`bestilling_min_stk` og `bestilling_varsel_timer` står også på
fanen Bestillinger, og det er **de samme indstillinger, ikke en
kopi**: begge faner tegnes af `Admin.tegnere` efter hvert gem, så
de kan ikke skride fra hinanden. En prøve sætter tallet det ene
sted og læser det det andet.

Grunden til dubletten er, hvor ejeren SIDDER: han er på Menukort,
når han åbner en kategori for bestilling og sætter priser på den.
At skulle skifte fane for at sige "mindst 4 stykker" er den slags,
der ender med, at ingen sætter tallet.

### ⚠️ Antal på lager er IKKE bygget

Forlægget har "kun 6 tilbage" pr. vare. Det er ikke bygget, og det
er ikke en forglemmelse: et tal, personalet skal tælle ned i
hånden, er et løfte, der bliver forkert i løbet af en frokost — og
en gæst, der bestiller nummer syv, får mad, der ikke findes.

Skal det bygges, skal det være databasens: en kolonne på
`menu_varer`, en bremse, der tæller ned, når en bestilling
oprettes, og et `udsolgt`, der sætter sig selv ved nul. Indtil da
er **fluebenet Udsolgt** svaret — det virker, og det lyver ikke.

## Personalesiden fik skabelonen fra forlægget (24/8)

Kunden sendte tre skærmbilleder af en færdig personaleside og bad
om den form: *"gør admin samme tema og lign det her, bare så det
passer til havnegrillens ... desktop-wise skabelonsmæssigt."*

**Formen er lånt, farverne er havnens.** Søjlen er marineblå
(`--sea`), det valgte punkt er rødt (`--red`), fladen er sand.
Havde vi taget forlæggets orange med, ville personalet arbejde i
et andet hus end det, de sælger fra.

**Der er hverken læst i eller kopieret fra spiis' kode.** Der er
bygget efter skærmbillederne — se advarslen øverst i `CLAUDE.md`.

### Hvad der er nyt

- **Mørk søjle i venstre kant, fast og i fuld højde.** Mærket
  øverst, ét punkt pr. ærinde, tallet ude til højre, vejen ud
  nederst. Menulisten er den ene del, der ruller: fjorten punkter
  à 46 px er 644 px, og på en bærbar på 720 px er der ikke plads
  til både mærket, punkterne og "Log ud"
- **Topbjælken er væk, når man arbejder.** Den kostede 92 px af
  skærmhøjden på hver eneste fane og sagde det samme hele vejen
- **Sidens navn er den valgte fanes navn.** `Admin.visFane`
  skriver det, så en ny fane ikke skal huskes to steder — og
  teksten tages af knappen selv, ikke af en liste over panelnavne,
  der ville skride den dag en fane blev omdøbt. Ikonet og tallet
  er ikke med: "🥪 Bestillinger 4" er ikke en overskrift
- **Panelets første overskrift skjules, når den siger det samme.**
  "MENUKORT" i hovedet og "MENUKORT" i kortet lige nedenunder var
  to gange det samme ord ved hvert faneskift. Den **skjules** og
  fjernes ikke: på en telefon er der ikke noget hoved, og dér er
  h2'en panelets eneste titel
- **Dagens tal står ØVERST på Overblik**, ikke nederst. De lå i et
  kort under alle listerne — altså efter det, man skulle rulle
  igennem for at få dem at se. Det første felt er fyldt: seks
  hvide felter læses som en tabel, ét fyldt giver øjet et sted at
  lande

### To fejl, prøverne fangede

**Søjlen tog telefonens faner med sig.** `.adm-side` fik
`display:none` under 900 px, og da `.faner` ligger INDE i den,
forsvandt alle fjorten faner på telefonen. Otte prøver løb tør for
tid på et klik, der aldrig kunne ske — på en iPhone havde
personalet stået med en side uden navigation. Søjlen er
`display:contents` dernede: striben bliver liggende, hvor den lå,
og mærket og vejen ud skjules hver for sig.

**Telefonen mistede sin sidetitel.** Første udgave skjulte hele
hovedet under 900 px, og så landede man på seks tal uden en
overskrift over sig. Hovedet står på alle skærme nu — bare mindre
dernede (36 px mod computerens 42).

`.tal-tal` stod desuden i `var(--overskrift)`, som **ikke findes i
`:root`**. En `font`-shorthand med en uløst variabel er ugyldig
hele vejen, så tallet arvede brødteksten og stod i 17 px. Det så
ud som en indstilling, ikke som dagens tal.

### Temaet: samme hus, andet rum (24/8)

Kundens ord: temaerne skal være *"cirka de samme, men alligevel
lidt anderledes og bedre, fordi det er admin"*.

Gæstesiden blev skiftet ud 23/8 og kører på `havnegrillen.css` —
varm blæk, cremehvid, den røde `#d62a3a` og Instrument Serif til
overskrifter. Admin lå tilbage i det gamle marineblå. Det var to
huse.

**Variablerne sættes på `body.personale` og IKKE i `:root`.**
`css/style.css` bærer stadig ni gæstesider — `bestil/`,
`menu.html`, `selskaber/`, `bord/` og resten — og de skal se ud,
som de gør. Ændres `:root`, skifter de tema uden at nogen har bedt
om det. En prøve måler begge sider: admin er varm, `bestil/` er
stadig marineblå.

**Det, der er ENS med gæstesiden:**

- farverne: varm blæk `#241a17`, creme `#fdf7ef`, den røde `#d62a3a`
- overskrifterne: **Instrument Serif**
- ternet som signatur — én stribe ned ad søjlens yderkant

**Det, der er ANDERLEDES, og hvorfor:**

- **Fladere.** 18 px runding mod gæstens 26, og en lettere skygge.
  En fane med fjorten kort skal kunne skimmes, ikke beundres
- **Ingen glasknapper.** Gæstens `.g` er sløret og har glans; en
  arbejdsknap skal se ud til at kunne trykkes på i en oplyst luge,
  og sløring uden et foto bagved koster billeder i sekundet på en
  iPad. Reglen fandtes i forvejen (`body:not(.personale)`) —
  farverne var bare skrevet som faste tal og fulgte ikke med
- **Mørkere dæmpet tekst.** Gæstens `--muted` (`#8b7871`) rammer
  **3,9:1** mod cremehvid og falder under 4,5:1. Admin læses i et
  køkken med sollys i skærmen; `#6f5b55` rammer **5,97:1**
- **Ingen tern som flade.** Gæstens hero er ternet fra kant til
  kant. Bag en liste bestillinger ville det være støj

**Skriften ligger LOKALT.** `fonts/instrument-serif.woff2` (21 kB)
i stedet for et link til Google Fonts: admin åbnes på en iPad i et
køkken, og en render-blokerende stylesheet fra et fremmed domæne er
et sted mere, tingen kan hænge. Gæstesidens nye sider henter den
selv — filen her hentes kun, hvis den bliver brugt, og
style.css-gæstesiderne rører den ikke.

**⚠️ Linjehøjden var Bebas'.** Den globale regel for `h1, h2, h3`
har `line-height: .88`, skruet til Bebas Neues høje versaler. En
serif har både over- og underlængder og bliver klippet på .88 —
to linjer lægger sig oven i hinanden. `body.personale` sætter
1.06. Det samme gælder sperringen på `.top-navn`: `.15em` er
Bebas', og en serif med den luft ligner en overskrift, der er
faldet fra hinanden.

**⚠️ Ternet skal kunne SES som tern.** Første stribe var 5 px med
2,5 px tern og lignede en stiplet ramme — altså en fejl. 8 px med
4 px tern læses som det, det er.

### Hvad der IKKE er bygget efter forlægget

- **Klokken med et tal øverst til højre.** Vi har ingen
  beskedliste; et tal, der ikke kan trykkes på, er pynt
- **"Installér som app" og "Slå notifikationer til" som bannere på
  Overblik.** Begge dele findes — kortet "Besked på telefonen" står
  på fanen Kontakt. Skal de op som bannere, er det et selvstændigt
  stykke arbejde
- **"0 / 30 solgt" på dagens ret.** Det er et loft pr. dag, og
  Mosede har ikke et. Se advarslen om antal på lager ovenfor

## Kalenderen er en kalender (24/8)

Kundens ord: *"kalenderen skal være en kalender ... alt skal kunne
administreres ift at have styr på alle ting derinde ... køreplanen
får præcis den, skrive notater til den dag osv som selvfølgelig
kommer ind i overblik"*.

Fanen var en **liste** over arrangementer og lukkedage. Den vidste
ikke, at der lå bestillinger, borde, forespørgsler eller en
udlejning samme dag. Spørgsmålet *"hvad sker der den 12.?"* havde
fire svar på fire faner, og det femte — *"er lokalet lejet ud?"* —
kunne man kun finde ved at gætte.

**Ingen SQL.** Alle fem kilder er hentet i forvejen af hver sin
fane; nettet læser dem fra `Admin.lister` og `Admin.data`.

### Hvordan de seks veje hænger sammen

| Gæsten gør | På siden | Lander i tabellen | Ses på fanen |
|---|---|---|---|
| Bestiller mad (spis her / to-go) | forsidens `#bestil` | `bestillinger` | Overblik + Bestillinger |
| Smørrebrød ud af huset | `h-smorrebrod.html`, `bestil/` | `bestillinger` | samme |
| Tapasfad | `m-tapas.html` | `bestillinger` (🧀-mærket) | samme |
| Bestiller fra bordet (QR) | `ved-bordet/` | `bestillinger` + `bord_nummer` | samme |
| Selskab | `h-selskaber.html`, `selskaber/` | `forespoergsler` (slags `selskab`) | Forespørgsler |
| Catering | `h-catering.html`, `catering/` | `forespoergsler` (slags `catering`) | Forespørgsler |
| Spørger om baglokalet | `h-baglokale.html` | `forespoergsler` (slags `baglokale`) | Forespørgsler |
| Lejer baglokalet | `baglokale/` | `udlejninger` | Baglokalet |
| Booker et bord | `bord/` | `bordbestillinger` | Borde |
| **Frokostordning** | `h-frokost.html` | **ingen — ikke koblet endnu** | — |

Kalenderen lægger alle seks oven på hinanden dag for dag.

### Sådan kan de ikke overlappe

Værnene ligger i **databasen**, ikke i browseren — en formular kan
omgås, en regel i Postgres kan ikke:

- **Havnen er ét sted.** Visningen `optagne_dage` og bremsen
  `mosede_dagen_er_optaget()` siger nej, hvis dagen allerede er
  taget af en **aftalt** udlejning eller et **aftalt** selskab.
  Catering og ud-af-huset optager ingenting — der laves mad, der
  kører ud, og havnen står fri
- **Kun AFTALTE dage er optagne.** En forespørgsel, der lige er
  kommet ind, er et spørgsmål, ikke en booking. Spærrede den
  dagen, kunne én person med et telefonnummer lukke hele efteråret
  på ti minutter
- **Baglokalet er eksklusivt** — `udlejning_dagen_er_taget` er et
  delvist unikt indeks: én udlejning pr. dag, og et nej frigiver
  dagen igen
- **Lukkedagsværnet** afviser bestillinger på en lukket dag, og det
  er `security definer` — ellers slog det kalenderen op med
  gæstens øjne
- **Bremserne** tæller pr. telefonnummer pr. dag og fanger
  dobbelttryk inden for ti minutter
- **Skraldespanden** gør en slettet række usynlig for bremserne og
  de unikke nøgler, så den holder op med at spærre

### Månedsnettet

Hver dag bærer et tegn og et tal pr. slags: 🥪 bestillinger,
🍽️ borde, 💬 forespørgsler, 🔑 baglokalet, 📅 kalenderens egne
rækker, 📝 noten. Tallene og ikke navnene — et felt i et net er
90 px bredt, og "3 bestillinger, 1 bord" fylder fire linjer.

**En periode farver alle sine dage.** En vinterlukning er ÉN række
med en slutdato, men den skal farve halvfems felter — ikke kun det
første, hvor personalet så ville tro, der var åbent den 19.

**Mandag er første søjle.** `getUTCDay()` giver søndag = 0, og uden
`(+6)%7` står hele måneden en dag forskudt. Det er den slags, ingen
opdager, før nogen møder ind på den forkerte dag.

**I dag er markeret, den valgte er fyldt.** To forskellige ting: den
ene er en oplysning, den anden er, hvad man kigger på lige nu.

### Dagens panel retter ingenting

Hele dagen skrevet ud, og en knap pr. gruppe, der fører hen til den
fane, tingen kan rettes på. **To steder at ændre en bestilling er
to steder, der kan skride fra hinanden.**

### Noten til dagen

**⚠️ Kendingen er TITLEN.** Noten bor i kalenderen som en intern
arrangement-række med titlen `Note til dagen` (`NOTE_TITEL` i
`js/admin/kalender.js`), teksten i `beskrivelse` og `offentlig`
slået fra. Databasen har tre typer og ingen fjerde, og en kolonne
mere er en SQL-fil, ejeren skal køre. Det er den samme slags aftale
som `Admin.erTapas`: en kending frem for en kolonne.

**Skift aldrig teksten i `NOTE_TITEL`.** De noter, der allerede er
skrevet, ville blive til arrangementer på dagen — synlige i nettet
som noget, der sker, og væk fra køreplanen.

En **tom** note er ingen note: gemmes den tom, slettes rækken.
Ellers ville dagen bære et blyantsmærke uden noget bag.

### Køreplanen på Overblik

Tre ting, der ellers ligger på tre faner:

1. **Er der åbent?** Lukkedag, tidlig lukning eller bestillinger
   slået fra. Lukket er ikke en advarsel — det er dagens vigtigste
   oplysning, og den kan gøre resten af skærmen ligegyldig
2. **Er baglokalet lejet ud i dag?** Kun **aftalte** udlejninger;
   en forespørgsel er et spørgsmål
3. **Noten** — og "Ret noten" fører hen til dagen i kalenderen.
   Den skrives ét sted

### Tre fejl, prøverne fangede

**`Admin.data` kan være `null`, når `efterHent` kører.** Fanerne
melder deres lister ind, så snart de har hentet, og det kan ske før
den første `Butik.hent()` er kommet hjem. Uden gardet kastede
`tegnMaaned` — og da **alle tegnere ligger i den samme liste**,
blev de faner, der stod efter kalenderen, aldrig tegnet: Overblik
og Bestillinger stod tomme uden en fejl på skærmen. **Elleve prøver
faldt.**

**Køreplanen er den første del af Overblik, der læser
`Admin.data`.** Resten lever af `Admin.lister` og tegnes gennem
`efterHent`. Uden `Admin.tegnere.push(tegnKoereplan)` blev en gemt
note først synlig, næste gang en fane meldte noget ind — målt:
personalet skrev noten, gik til Overblik, og der stod "Ingen note
skrevet".

**`body.personale .knap` vejer tungere end `.knap.lille`.** Da
admin fik gæstesidens tema, blev pilene op/ned på Menukort og
månedsskiftet i kalenderen **røde** — præcis det, noten ved
`.knap.lille` advarer imod: de er et værktøj, man bruger sjældent,
og i rødt råber de lige så højt som Gem. Set på et skærmbillede,
usynligt i koden.

## Personalet kan tage en booking i telefonen (24/8)

Ringer nogen og bestiller et bord, fandtes der ingen vej ind:
bookingen kunne kun laves på hjemmesiden. Så stod halvdelen af
dagen i systemet og halvdelen på en seddel ved lugen — og dagens
billede løj om, hvor mange pladser der var tilbage.

Formularen står **foldet sammen** på Borde-fanen: fanen handler om
de bookinger, der ER kommet ind, og syv åbne felter oven over
dagens liste ville skubbe arbejdet ned hver gang, nogen åbnede
fanen. **Ingen SQL.**

**Den bruger gæstens egen motor.** `Butik.bookBord()` er den samme
funktion, hjemmesiden kalder, og dermed de samme værn: samme
telefon + dag + tid er ét ønske, bremsen tæller, lukkedagen siger
nej. At skrive en anden vej ind i den samme tabel ville være to
regelsæt, der langsomt kommer til at sige noget forskelligt — og
ingen ville opdage det, før to familier stod ved det samme bord.

**Den oprettes som BEKRÆFTET.** Personalet har sagt ja i røret; en
booking, der lander som "ny", står på listen som noget, der skal
ringes om — og så bliver der ringet til en, der lige har lagt på.
Statussen sættes bagefter, fordi adgangsreglen med vilje ikke
lader nogen skrive `status` ved oprettelsen. Noten
**"Taget i telefonen"** siger, hvor den kom fra: uden den ligner
den en, gæsten selv har lavet, og så leder nogen efter en
kvittering, der aldrig er sendt.

## Frokostordningen er den fjerde forespørgsel (24/8)

Den stod som fase 6 med *"tilbagevendende levering, pauser,
helligdage"*. Det var en misforståelse, og Mikkel rettede den 20/8:
den mad, man også kan bestille, skal bare kunne bestilles senest
dagen før — og det gør forsidens bestilling allerede.

Men designet fra 23/8 tegnede siden som et **B2B-tilbud**: firma,
CVR, faste ugedage, fakturamail og knappen "Få et tilbud". Og dét
er ikke en bestilling — det er præcis en forespørgsel: et menneske
skriver, personalet ringer, og der aftales en pris. Samme skelet
som catering, selskab og baglokale.

**Der bygges altså ingen abonnementsmotor.** Ingen tabel til
tilbagevendende leveringer, ingen pauser, ingen helligdage.

**⚠️ Kør `supabase/frokost.sql` + `proev-frokost.sql`** i
Mosede-projektet (**8 × BESTOD** på en lokal Postgres 16). Filen
gør ÉN ting: udvider den tilladte liste over slags forespørgsler
med `frokost`. Ingen tabel, ingen regel, ingen bremse — alt det
findes i forvejen.

**Køres `forespoergsler.sql` igen bagefter, skriver den listen
tilbage til tre.** Det opdager ingen: siden ser ud som før, men et
firma, der trykker "Få et tilbud", får en fejl, personalet aldrig
hører om. `er-vi-klar.sql` linje 70 fanger det.

**Den optager ingen dage.** Datoen er ønsket START og ikke en
enkelt dag, og maden kører ud af huset — lokalet står frit. Optog
den dagen, kunne ét firma med en fast onsdag lukke hver eneste
onsdag for selskaber og udlejning. Prøve 3 og 6 måler netop det.

**⚠️ Listen over slags står TO steder:** `forespoergsel_type_ok` i
databasen og `FORESPOERGSEL_TYPER` i `js/store.js`. Rettes kun det
ene, tager øvetilstanden imod, hvad den rigtige database afviser —
og så er det ikke en øvelse. Det var netop dét, der fangede fejlen
her: formularen sendte, og øvetilstanden sagde nej med databasens
egen besked.

**Panelets id er en del af opsætningen nu.** De tre andre sider har
`#forespoerg`; frokostsiden hedder `#tilbud`, fordi designets egen
pille og skuffemenu peger derhen. At omdøbe det ville brække to
links i skallen.

## Felterne gemmer sig selv (24/8)

Der var **otte Gem-knapper** i admin — åbningstider, tavlen,
sæsonen, reglerne, pladserne, nøglen, kontakten, dagens ret. En
travl medarbejder, der retter tavlen kl. 11.55 og går uden at
trykke, har rettet **ingenting**. Det opdages om onsdagen.

`Admin.autogem(rod, saml)` i `js/admin/kerne.js` er to linjer pr.
fane. **Ingen SQL.**

**To lyttere, og den anden er den vigtige:**

- **`change`** gemmer straks — når feltet forlades eller der vælges
  i en liste. Det er dét, der fanger den, der taster og går
- **`input`** gemmer 1,2 sekund efter sidste tastetryk. Det er
  ekstraen, for den, der skriver og bliver stående

**⚠️ Den gemmer STILLE.** `Admin.gem` henter data igen og tegner
ALLE faner om — og en optegning midt i en sætning river feltet ud
af siden under fingeren. Præcis den fejl kostede en halv sætning og
en uønsket kvittering, dengang noten på et bestillingskort gemte
ved `change` (se `tegnRaekker`). Autogem skriver derfor kun til
databasen: skærmen viser allerede det skrevne, og næste rigtige gem
eller genindlæsning henter det hjem.

**Knapperne bliver stående.** De skal bare ikke være det eneste,
der virker. `saml()` returnerer enten et løfte eller en **tekst**,
hvis noget mangler — knappen brøler den, autogem viser den i sit
lille mærke ved siden af. Sådan kan de to ikke komme til at gøre
noget forskelligt.

**⚠️ Roden skal være KORTET**, ikke en boks, der tegnes om. Første
udgave hang på `#tider-felter`, som `tegnTider` bygger om ved hver
hentning — og så blev mærket revet ned med den. Lytterne fanger
felterne indeni alligevel; begivenheder bobler.

Kvitteringen har en spærre på to sekunder: uden den blinker "Gemt"
ved hvert tastetryk, og så holder man op med at se den — også den
dag, den ikke kommer.

## Nyheder, der tænder og slukker sig selv (24/8)

*"Live musik på molen · lørdag 22. august"* skal væk om søndagen.
Uden datoer skal NOGEN huske det — og det er den slags, ingen
husker, når der er travlt. En nyhed om en fredag, der stadig står i
november, får gæsten til at holde op med at læse nyhederne
overhovedet.

**⚠️ Kør `supabase/nyheder-fra-til.sql` + `proev-nyheder-fra-til.sql`**
i Mosede-projektet (**7 × BESTOD** på en lokal Postgres 16). To
valgfrie datokolonner og én regel: en slutdato må ikke ligge før
startdatoen.

**Tom betyder ALTID.** En nyhed uden datoer opfører sig præcis som
før, så alt det, der allerede står, bliver stående. Prøve 2 måler
netop det — ellers ville filen slukke nyhederne den dag, den køres.

**Reglen står ÉT sted: `Butik.nyhedSynlig`.** Den nye forside, den
gamle forside, nyhedssiden og admin spørger den samme funktion. Tre
kopier af filteret ville langsomt komme til at vise tre forskellige
ting, og ingen ville opdage hvilken der var rigtig.

**⚠️ Der filtreres IKKE i databasen.** Rækkerne hentes alle sammen,
og browseren afgør — ellers kunne personalet ikke SE i admin, at en
nyhed *venter* eller er *udløbet*. `Butik.nyhedStatus` giver ordet,
og listen viser det som et mærke med datoen ved siden af. Uden det
skal ejeren åbne hjemmesiden for at finde ud af, om nyheden virker,
og *"hvorfor kan jeg ikke se den?"* er så et opkald.

**Grænserne er med.** En nyhed med `vis_til` = i dag står der
stadig i dag. Et `>` i stedet for `>=` ville slukke "Live musik i
dag" præcis den dag, den handler om — og et vindue på præcis én dag
er dét, feltet er lavet til. To prøver måler det, én i SQL og én i
browseren.

## Dagens ret fik en tabel (24/8)

Den var **én indstilling**: ét navn, én dag, én pris. Det gav tre
begrænsninger, som alle tre kostede noget:

1. **Kun i dag.** Menukortets ugeplan stod halvt tom — "Følger
   snart…" fra tirsdag og frem — fordi der ikke fandtes et sted at
   skrive torsdagens ret. Køkkenet planlægger ugen om mandagen;
   siden kunne kun vise dagen
2. **Kun én ret.** To at vælge imellem blev til ét langt navn i det
   samme felt med **én** pris — og så var det gæsten, der skulle
   gætte, hvad de to kostede hver især
3. **Ingen udsolgt.** Retten kunne bestilles, til nogen huskede at
   tømme feltet

**⚠️ Kør `supabase/dagens-retter.sql` + `proev-dagens-retter.sql`**
i Mosede-projektet (**11 × BESTOD** på en lokal Postgres 16).

### Antal tilbage tælles af databasen, ikke af et menneske

Det stod indtil nu som *"IKKE bygget, og det er ikke en
forglemmelse"*: et tal, personalet tæller ned i hånden, bliver
forkert i løbet af en frokost, og gæst nummer syv får mad, der ikke
findes.

**Den indvending gælder stadig — og det er præcis derfor, tællingen
ligger i databasen.** En bremse på `bestillinger` løber bestillingens
linjer igennem, trækker fra på den dags retter og sætter `udsolgt`
ved nul. Ingen skal huske noget, og to gæster, der trykker samtidig,
kan ikke begge få den sidste portion: rækken låses af opdateringen.

**Feltet er frivilligt.** Er `antal_tilbage` tomt, tælles der ikke,
og retten kan bestilles, til nogen siger stop. Det er stadig det
rigtige for en ret, køkkenet laver i det uendelige.

**⚠️ Aldrig under nul.** `greatest(antal - stk, 0)` og ikke bare
minus: et negativt tal ville gøre en udsolgt ret bestilbar igen,
næste gang nogen kiggede. Prøve 10 måler det.

**⚠️ Bremsen siger ikke nej**, og det er et valg. Køkkenet må gerne
kunne sige ja til nummer elleve, når de kan se, at der er dej
tilbage — men **siden** skal holde op med at love den. Formularen
viser ikke en udsolgt ret, så en bestilling, der når hertil på en
udsolgt ret, er personalets egen, taget i telefonen.

### En fejl, prøven fandt

Den unikke nøgle var `unique (lokation_id, dato, navn)` — men
bremsen matcher på `lower(btrim(navn))`. Så kunne *"Stegt flæsk"*
og *"stegt flæsk "* ligge side om side, og **begge** blive talt ned
af den samme bestilling. Nøglen er et udtryksindeks nu, så de to
sammenligner ens. Prøve 5 fandt det.

### Den gamle indstilling lever videre

**Er der ikke lagt noget i tabellen, men står der en ret i
indstillingen `dagens_ret`, vises DEN.** Ellers ville dagens ret
forsvinde fra forsiden i det sekund, filen blev kørt, og det,
ejeren har skrevet, ville se ud til at være væk. Reglen bor i
`Butik.dagensRetter` — ét sted, som forsiden, menukortet og
bestillingsformularen alle spørger.

Faldet gælder **kun i dag**: den gamle indstilling har ingen dato i
sig, og at vise den på torsdag ville være at love den samme ret
hele ugen.

### Ugeplanen i admin

Syv dage frem, en ret pr. linje, med pris, antal, udsolgt og
beskrivelse. **⚠️ Antallet sendes kun med, når nogen har rørt
feltet** — gemte admin det hver gang, ville et gem midt i en
frokost (fordi nogen rettede en stavefejl i navnet) skrive
morgenens tal tilbage og gøre en udsolgt ret bestilbar igen.

Vagthunden mod *"Lukket i dag"* som en ret gælder også her.

### En fejl, der havde ligget der hele tiden

`lokalt()` i `js/store.js` kaldte sit tilbagekald **uden** at fange
en fejl. Skrivelaget efterligner databasens regler i øvetilstand
ved at KASTE — *"Der er allerede et bord, der hedder 7"* — og den
fejl røg synkront ud af `Butik.skrive.…()` **før** `Admin.gem` nåede
at få et løfte at hænge sin `catch` på. Skærmen stod uændret uden
en linje om hvorfor. Den fanges nu og bliver et afvist løfte — og
`gemLokalt` springes over, så den halve ændring ikke bliver gemt.

### Det, der stadig mangler

- **"Kun 6 tilbage" pr. vare på menukortet** — dagens retter tæller
  nu, men de 242 varer i sortimentet gør ikke. Det er den samme
  mekanik og kan bygges, når ejeren har brug for den

## Filer

| Fil | Formål |
|---|---|
| `index.html` | Forsiden – sælger stedet |
| `menu.html` | Hele menukortet |
| `bestil/` | **Smørrebrød ud af huset** — formularen med stykkerne og de 29 slags fyld. Resten bestilles på forsiden |
| `smoerrebroed-ud-af-huset/` | Smørrebrød ud af huset: salgs- og SEO-side, fører ind i `bestil/` |
| `selskaber/` | Forespørgsler: catering, baglokale og selskab |
| `admin.html` | Personalets side – kun HTML, koden ligger i `js/admin/`. Sidemenu på computer og iPad |
| `js/admin/` | Personalesidens kode: én fane pr. fil, `kerne.js` først og `login.js` sidst |
| `js/admin/skraldespand.js` | Fanen Historik, øverst: det slettede, og hvordan det kommer tilbage |
| `js/admin/logbog.js` | Fanen Historik, nederst: hvem ændrede hvad hvornår |
| `js/oplysninger.js` | **Navn, adresse, telefon, domæne – én kilde** |
| `js/faelles.js` | Burgermenu, årstal, rutelinks, prisformat: alle sider |
| `js/menuside.js` | Menukortet |
| `js/smoerrebroed.js` | Smørrebrødssiden |
| `js/bestil.js` | Smørrebrødsbestillingen omkring formularen: status, note, telefon |
| `js/bestilling.js` | **Selve formularen** — listen, kurven, dagene, kigget og afsendelsen. Kører BÅDE på forsiden og på `bestil/`; `data-udvalg` på formularen bestemmer, hvad der er i den |
| `js/forespoergsel.js` | Forespørgselsformularen — catering, baglokale, selskab |
| `robots.txt`, `sitemap.xml` | Til Google Search Console |
| `css/style.css` | Hele designet, ét sted |
| `js/store.js` | Datalag – Supabase eller localStorage |
| `js/side.js` | Forsidens opførsel og data. **Indlæses EFTER `js/bestilling.js`** — se noten i `index.html` |
| `js/intro.js` | Intro-animationen |
| `js/baad.js` | Båden i bunden (rullemåler, kun på computer) |
| `js/config.js` | Forbindelsen til databasen |
| `fonts/` | Bebas Neue og Instrument Sans (52 KB) |
| `billeder/` | Fotos og video, klar til web (8,0 MB i alt) |
| `assets/` | Kilderne til isfilmen: opskrift, udklip og havnefoto. `assets/raa/` er kundens egne udklip, urørte |
| `vaerktoej/` | Småprogrammer der laver filerne i `billeder/` — bruges ikke af siden. `proev-isfilm.js` tegner prøvebilleder af isfilmen |
| `supabase/setup.sql` | Hele databasen, kør én gang |
| `supabase/menukort.sql` | Menukortet: 14 kategorier, 151 varer |
| `supabase/ret-oplysninger.sql` | Engangs-rettelse, se filens hoved |
| `supabase/ryd-spiis-op.sql` | Engangs-oprydning: spiis' setup.sql blev kørt i Mosede-projektet 18/8-2026 — se filens hoved |
| `vaerktoej/lav-hero-telefon.sh` | Lodret udgave af hero-videoen til telefoner |
| `supabase/proev-adgang.sql` | Prøve af reglerne for bestillinger set fra gæsten — kør efter flerlejer.sql |
| `supabase/flerlejer.sql` | **Flere forretninger i samme database** — migration, kør efter setup.sql |
| `supabase/bremse.sql` | Grænse på hvor mange bestillinger der kan sendes — kør efter flerlejer.sql |
| `supabase/proev-flerlejer.sql` | **23 prøver af adgangen pr. forretning** — kør til sidst |
| `supabase/forespoergsler.sql` | **Forespørgsler** (fase 2) — tabel, adgang og bremse. Kør efter flerlejer.sql |
| `supabase/proev-forespoergsler.sql` | **23 prøver af forespørgslernes adgang** |
| `supabase/kalender.sql` | **Kalenderen** (fase 3) — arrangementer, lukkedage, tidlige lukninger. Erstatter `lukkedage` |
| `supabase/proev-kalender.sql` | **21 prøver af kalenderens adgang og migrationen** |
| `supabase/borde.sql` | **Bordbestilling** (fase 4) — tabel, adgang og bremse. Kør efter kalender.sql |
| `supabase/proev-borde.sql` | **26 prøver af bordbestillingens adgang** |
| `supabase/udlejning.sql` | **Baglokalet** (fase 5) — som bordene, men ét ja optager hele dagen |
| `supabase/proev-udlejning.sql` | **27 prøver, heriblandt at dagen kun kan gives væk én gang** |
| `supabase/push.sql` | **Push** (fase 5c) — hvilke telefoner der får besked. Ingen gæsteregel overhovedet |
| `supabase/proev-push.sql` | **11 prøver af push-tabellens adgang** |
| `supabase/realtime.sql` | Melder de fire gæstetabeller til `supabase_realtime`, så admin hører ændringer i samme sekund |
| `supabase/spis-her.sql` | Kolonnen `hvordan`: spis her eller tag med |
| `supabase/proev-spis-her.sql` | 4 prøver af kolonnen og dens begrænsning |
| `supabase/levering.sql` | Det tredje svar `levering` + `leverings_adresse`. **Kør efter `spis-her.sql`** — den udvider dens regel |
| `supabase/proev-levering.sql` | **8 prøver — heriblandt at en adresse ikke kan blive hængende på en afhentning** |
| `supabase/lukkedag-vaern.sql` | **Lukkede dage afvises af databasen** — udløsere på bestillinger OG bordbestillinger. Kør efter `borde.sql` |
| `supabase/proev-lukkedag-vaern.sql` | **9 prøver — heriblandt at værnet holder, når gæsten selv skriver** |
| `supabase/bordkort.sql` | **Bordene og QR-bestilling** — tabellen `borde`, kolonnen `bord_nummer` og værnet om den. Kør efter `spis-her.sql` |
| `supabase/proev-bordkort.sql` | **14 prøver — heriblandt at gæsten må læse bordlisten, men ikke røre den** |
| `supabase/menukort-ud-af-huset.sql` | Tapasfad, platter, sliders, pindemad og tilkøb — 44 varer i 5 nye kategorier |
| `supabase/menukort-resten.sql` | De 35 varer, der kun stod på ejerens fulde liste. Har en **dubletvagt** i optællingen |
| `supabase/skraldespand.sql` | **Skraldespanden** — "Slet" bliver til en dato, og nøglerne bliver delvise |
| `supabase/proev-skraldespand.sql` | **19 prøver af at det, der er smidt ud, ikke længere spærrer** |
| `supabase/logbog.sql` | **Logbogen** — hvem ændrede hvad hvornår. Kan ikke rettes af nogen |
| `supabase/proev-logbog.sql` | **19 prøver af at logbogen skriver nok — og ikke for meget** |
| `supabase/restaurant.sql` | **Køkkenets trin** (`tilberedes`, `serveret`), zonen på bordet og dubletvagten, der ikke gælder borde. Kør **efter** `skraldespand.sql` |
| `supabase/proev-restaurant.sql` | **13 prøver — heriblandt at samme bord kan bestille to gange i samme minut** |
| `supabase/bord-loft.sql` | **Udsolgt afgøres i databasen**, loftet pr. kvarter og visningen `bord_travlhed` (kun tal) |
| `supabase/proev-bord-loft.sql` | **15 prøver — heriblandt at travlheden ALDRIG får en kolonne med navne i** |
| `supabase/pris-vaern.sql` | **En vare uden pris kan ikke bestilles** — ingen ringer og siger prisen, og den talte som 0 kr. i salget |
| `supabase/proev-pris-vaern.sql` | **8 prøver — heriblandt at fyld-ønsker og håndskrevne retter slipper igennem** |
| `supabase/er-vi-klar.sql` | **Ét kald, der spørger databasen om det hele.** Skriver ingenting — 67 linjer ✅ eller ❌ |
| `supabase/funktioner/send-push.ts` | Edge Function'en, der sender beskeden ud til telefonerne |
| `supabase/lav-vapid.html` | Laver VAPID-nøgleparret i browseren. Den private halvdel forlader aldrig maskinen |
| `ved-bordet/` | Siden bag QR-koden på bordet. `noindex` — den skal findes af et kamera, ikke af Google |
| `print/bordkort.html` | Ét skilt pr. bord, klar til print. Koderne tegnes af listen i admin |
| `js/qr.js` | QR-koder tegnet i browseren. Målt tern for tern mod npm-pakken `qrcode` |
| `js/store-skriv.js` | **Personalets skrivelag.** Lå i `store.js`; 22 kB, ingen gæsteside rører. Indlæses kun af `admin.html` |
| `css/ved-bordet.css` | Bordsidens egne regler. Lå i `style.css` — 2 kB på hver sidevisning for en side, kun bordets gæst ser |
| `tests/facit/qr-facit.json` | Facitlisten til QR-motoren, skrevet af npm-pakken |
| `tests/` | Playwright – mobil og computer, 31 filer |

## Sådan sætter du databasen op

Rækkefølgen er ikke valgfri, og den er **envejs**. `setup.sql` kan ikke køres
efter `flerlejer.sql`: den indsætter indstillinger med `on conflict (noegle)`,
og efter migrationen er primærnøglen `(lokation_id, noegle)`. Mangler der en
tabel i en database, der allerede er migreret, så kør kun det stykke, der
mangler.

1. Åbn Supabase-projektet → **SQL Editor** → **New query**
2. Ret e-mailen i punkt 1 af `supabase/setup.sql` til personalets e-mail.
   **Slet HELE teksten mellem apostrofferne**, før du skriver adressen: den
   18. august 2026 blev kun `EMAIL@eksempel.dk` erstattet, så der stod
   `UDFYLD-CHEFENS-chefens@rigtige.mail` i databasen — en adresse ingen kan
   logge ind med. Filen standser nu selv, hvis en stump af pladsholderen
   står tilbage
3. `supabase/setup.sql` — hele skemaet. Kan køres igen uden at ødelægge data
4. `supabase/flerlejer.sql` — lokation på hver tabel, og adgangsregler pr.
   forretning. Kan også køres igen. Den løfter de e-mails, der står i
   `is_admin()`, over i tabellen `admin_adgang`, og **slutter med at vise,
   hvem der har adgang**. Læs den liste: står der en adresse, du ikke kan
   logge ind med, kan ingen styre forretningen bagefter. Er der ingen
   brugbar adresse, standser filen med en fejl i stedet for at efterlade en
   låst admin
5. `supabase/bremse.sql` — grænsen på antal bestillinger
6. `supabase/menukort.sql` — hele menukortet, 14 kategorier og 151 varer
7. `supabase/proev-flerlejer.sql` — 23 prøver. **Alle skal skrive BESTOD.**
   Resultatet kommer som en **rød fejlboks, og det er med vilje**: Supabases
   editor viser kun den sidste sætnings svar, så rapporten sendes ad den ene
   kanal der altid vises — og afbrydelsen er samtidig det, der ruller prøvens
   data tilbage. Kig efter linjen `ALLE 23 AF 23 BESTOD`. Filen efterlader
   ingenting
8. **Authentication → Users → Add user** — samme e-mail, valgfri adgangskode,
   sæt hak i *Auto Confirm User*
9. `supabase/skraldespand.sql` + `proev-skraldespand.sql` — 19 prøver, alle
   skal skrive BESTOD. Kør den **efter** alle de andre: den retter deres
   nøgler og bremser
10. `supabase/logbog.sql` + `proev-logbog.sql` — 19 prøver
11. `supabase/er-vi-klar.sql` — til sidst, og hver gang du er i tvivl
    bagefter. Se afsnittet lige nedenfor

Fase 2 og frem har hver sin fil, og de køres i samme mønster: tabellen først,
prøven bagefter. `forespoergsler.sql` → `kalender.sql` → `borde.sql` →
`udlejning.sql` → `push.sql` → `spis-her.sql` → `levering.sql` →
`lukkedag-vaern.sql` → `bordkort.sql` → `realtime.sql`. Rækkefølgen
indbyrdes er ikke tilfældig — `borde.sql` og `udlejning.sql` regner med, at
kalenderen findes, og `realtime.sql` melder tabeller til, der skal være der.
`skraldespand.sql` kommer **til sidst**: den retter nøgler og bremser, som de
andre filer laver, og skal derfor køres efter dem — også hvis en af dem køres
igen senere.

`restaurant.sql` er den ene undtagelse: den skal køres **efter**
`skraldespand.sql`, fordi den retter dubletnøglen `bestilling_ikke_dobbelt`
én gang til (se "Køkken-køen" nedenfor). Køres `skraldespand.sql` igen
bagefter, skal `restaurant.sql` også køres igen — `er-vi-klar.sql` linje 93
fanger det.

### Er vi klar? Ét kald, der spørger om det hele

`supabase/er-vi-klar.sql` **skriver ingenting**. Den kigger, og den svarer med
67 linjer ✅ eller ❌ og en linje nederst, der siger `ALT ER KLAR` eller hvor
mange ting der mangler. Står der ❌, står der i sidste kolonne, hvad der skal
gøres ved det.

Den findes, fordi opsætningen efterhånden er elleve filer, der skal køres i
rækkefølge, og prøverne kun siger noget om hver sin del. Efter en flytning, en
ny forretning eller en fil, der blev kørt halvt, er spørgsmålet ikke "består
bordprøven" — det er "mangler der noget". Det spørgsmål havde vi ikke ét sted
at stille.

**Manglerne er stille, og det er hele pointen.** En tabel uden row level
security fejler ikke; den svarer bare ja til alle. En bremse uden
`security definer` kaster ingen fejl; den tæller bare nul hver gang, fordi
gæsten ikke må læse tabellen, og lukker alt igennem. Begge dele ser ud som om
alt virker, lige indtil det ikke gør. Filen tjekker begge dele direkte.

Alle 31 tjek er efterprøvet ved at **genindføre fejlen** i en kopi af
databasen — slette en tabel, slukke RLS, tage `security definer` af en bremse,
lægge en `using (true)`-læseregel på bestillingerne — og se, at præcis den
linje bliver rød. Et tjek, der ikke kan fejle, måler ingenting.

To ting om, hvordan den er skrevet:

- Alle tjek, der læser **data**, går gennem en midlertidig funktion
  `pg_temp.tal()`. Postgres slår tabelnavne op, når sætningen *læses* — ikke
  når den køres — så et `select count(*) from public.menu_varer` direkte i
  rapporten ville vælte hele filen, hvis tabellen manglede. Det er præcis den
  situation, filen er lavet til at beskrive
- Rapporten er den **sidste** sætning. Se afsnittet nedenfor om, hvorfor det er
  den eneste kanal, der virker

**Den kan ikke se alt.** Databasen ved ikke, om Edge Function'en `send-push` er
udgivet, om de seks Database Webhooks er sat op, om HTTPS er tvunget på GitHub
Pages, eller om anon-nøglen i `js/config.js` hører til det rigtige projekt. De
fire står i "Hvad der mangler". Og den siger ikke, om reglerne *virker* — kun
at de er der. Det er prøvernes arbejde.

### Supabases SQL Editor viser ikke beskeder

Det er værd at vide, før man skriver en migration til den. `raise notice` og
`raise warning` går tabt: editoren viser **kun den sidste sætnings svar**, og
ellers "Success. No rows returned".

Det kostede en aften den 18. august 2026. `flerlejer.sql` skrev pænt
`Adgang flyttet med: …` og advarede om pladsholderen — begge dele usynlige for
den, der kørte filen. Derfor er de tre vigtigste beskeder nu lavet om til noget,
editoren **skal** vise: en afsluttende `select` (hvem har adgang), eller en
`raise exception` (pladsholderen står der stadig; ingen kan logge ind bagefter).
En advarsel, ingen kan se, er ikke en advarsel.

`\set`, `\pset` og andre `\`-kommandoer er heller ikke SQL, men psql. Står de i
filen, fælder editoren hele arket med en syntaksfejl, før noget som helst er
kørt.

Havde du kørt `setup.sql` før åbningstiderne blev bekræftet, så kør
`supabase/ret-oplysninger.sql` én gang. Den retter vores gæt, men rører ikke
noget personalet selv har ændret i admin.

**Hvorfor er `setup.sql` ikke bare skrevet om?** Fordi den database, der
allerede kører, ikke må røres af noget, der påstår at være en ren opsætning.
`flerlejer.sql` er en migration: den tilføjer kolonner, fylder dem ud og
bytter reglerne. Den ved hvad der stod før. Skrev vi i stedet skemaet om to
steder, ville de to filer skride fra hinanden — og det opdager man den dag, en
ny kunde får en database, der ikke ligner den kørende. Prisen er én fil mere
at køre, og den står her, så ingen tror det er en forglemmelse.

## Flere forretninger i den samme database

Fundamentet er det samme, som `spiis.dk` kører på: GitHub Pages, Supabase og
et domæne. Skal der komme en kunde nummer to, skal de to forretninger dele
database uden at kunne se hinandens ting.

**Hver tabel har et `lokation_id`.** Menukort, åbningstider, lukkedage,
nyheder, indstillinger og bestillinger. `indstillinger` har primærnøglen
`(lokation_id, noegle)`, så to forretninger godt kan have hver sin
`dagens_besked`. En vare arver sin lokation fra sin kategori gennem en
udløser — den kan ikke komme til at stå ét sted og høre til et andet.

**Adgangsreglerne spørger `is_admin_for(lokation)`, ikke `is_admin()`.** Det
er hele forskellen. Før var spørgsmålet "må du læse bestillinger". Nu er det
"må du læse **den her** forretnings bestillinger", og forskellen kan ikke ses
på en skærm. En bestilling er navn og telefonnummer på et menneske; kan
forretning A læse forretning B's, er det ikke en fejl i en funktion — det er
en lækage mellem to kunder, der ikke kender hinanden.

`supabase/proev-flerlejer.sql` er kørt mod en rigtig Postgres 16 med to
forretninger og to chefer. **23 prøver, alle BESTOD.** Prøven er også kørt med
den gamle regel sat tilbage på plads, netop for at se den fejle: prøve 2 og 4
(*"Chef A ser IKKE forretning B's bestillinger"*) og prøve 12 fejlede, som de
skulle. En prøve, der ikke kan fejle, måler ingenting — to af de gamle prøver
viste sig at være netop det, fordi de rettede i rækker, der ikke fandtes. De
har nu et menukort at rette i.

**Siden ved selv hvem den er.** `js/config.js` har et felt `lokation`, og
`js/store.js` filtrerer hver eneste hentning på det. Det er ikke sikkerhed —
menukort og åbningstider er offentlige alligevel — det sørger for at siden
viser det *rigtige*. Glemmer én af syv hentninger sit filter, står der
pludselig en anden forretnings åbningstider på forsiden, og siden ser helt
normal ud imens. `tests/lokation.spec.js` fanger både den ene glemte tabel og
en ottende tabel, der måtte komme til senere.

### Bremsen på bestillinger

Anon-nøglen ligger offentligt i `js/config.js`. Den *skal* kunne afgive en
bestilling — ellers kunne gæsten ikke bestille — og hvad en browser kan gøre
én gang, kan et script gøre ti tusind gange. `bestilling_ikke_dobbelt` fanger
dobbelttryk, men ikke en løkke, der tæller telefonnummeret én op hver gang.

`supabase/bremse.sql` sætter to grænser: **5 bestillinger fra samme nummer
på et døgn** og **40 på samme forretning på en time**. Begge er langt over,
hvad et menneske gør, og rammer en gæst dem alligevel, står der i beskeden at
man skal ringe — samme vej som fandtes før hjemmesiden.

Bremsen sidder i databasen og ikke i en Edge Function foran den. En Edge
Function kunne tælle på IP-adresse i stedet for telefonnummer, men den skal
udrulles med Supabase' eget værktøj, den er endnu et sted at holde en nøgle,
og indtil den *er* udrullet, beskytter den ingenting. `bremse.sql` virker, når
du har kørt den. Bliver misbrug et rigtigt problem, flytter vi bremsen ud
foran med de samme tal.

## Nøglen

`js/config.js` indeholder anon-nøglen. Den er lavet til at ligge offentligt —
adgangsreglerne i databasen bestemmer at den kun må læse.

`tests/config.spec.js` holder vagt over filen: den afkoder nøglen og fælder
byggeriet hvis rollen ikke er `anon`, hvis nøglen hører til et andet projekt
end url'en, hvis den er tæt på at udløbe, eller hvis der ligger mere end én
nøgle i filen. Forveksler man anon og `service_role`, ser siden helt normal ud
mens enhver besøgende kan slette menukortet — den fejl opdages ikke på
skærmen, så den fanges her.

## Adgang til personalesiden

Nøglen ligger normalt i `sessionStorage`: man er **logget ud, når fanen lukkes**.
Det er rigtigt for den iPad, der står i køkkenet og bruges af skiftende personale.

**"Husk mig på denne enhed"** flytter den til `localStorage`. Fluebenet er slået fra
som udgangspunkt, fordi valget skal træffes af den, der står ved skærmen — vi kan
ikke se, om det er et køkken eller en kontorstol.

**Nøglen fornyes nu.** Supabase' `access_token` holder omkring en time, og før gemte
vi kun den. Det betød, at personalet fik *"du har ikke adgang"* midt i en
arbejdsdag uden at have gjort noget forkert, og den eneste udvej var at logge ud og
ind. `refresh_token` gemmes med, og både læsning og skrivning prøver **én** gang
mere efter en fornyelse ved 401. Én gang og ikke i en løkke: er nøglen død og
fornyelsen fejler, skal man se loginskærmen.

### Genvejen under byggeriet

`admin.html?fri=1` springer loginskærmen over. **Tre betingelser skal alle holde:**

1. localhost — adressen kan ikke nås fra internettet
2. ingen database — der er ingen rigtige data at åbne
3. `?fri=1` står i adressen — man har selv bedt om det

Den tredje er ikke pynt. Første udgave sprang bare over på localhost, og så slog
den de tests ihjel, der beviser at låsen virker — **testene kører netop på
127.0.0.1 i øvetilstand**, altså præcis det miljø genvejen åbnede. At omgåelsen og
testmiljøet ikke kunne skelnes fra hinanden, var tegnet på at den var for grov.

Den kan aldrig åbne den udgivne side: dér er både betingelse 1 og 2 falske.
`bestillinger` indeholder gæsters navne og telefonnumre, og en åben admin lader
hvem som helst ændre priser eller lukke butikken. `tests/admin.spec.js` måler hver
af de tre — en genvej uden om en lås skal kunne bevises, ikke antages.

## Forespørgsler: catering, baglokale og selskab

`selskaber/` er den anden formular på hjemmesiden. Den samler de
spørgsmål, der før krævede, at nogen fangede nogen i telefonen midt i en
frokost: *"vi er 30 til en rund fødselsdag i marts — kan I det?"*

### Siden lover ingenting, og det er hele designet

Forretningen har **ikke** oplyst, om der er et lokale, hvor mange man kan
være, om der leveres, eller hvad noget koster. Derfor står intet af det på
siden. Der står, at vi ringer.

Det gælder helt ned i ordlyden på knapperne. Baglokalet hedder *"Kan vi
holde det hos jer?"* — gæstens **spørgsmål** — og ikke "Lej vores
baglokale", som ville påstå, at der er et lokale at leje.
`tests/forespoergsel.spec.js` slår ned på priser, kapacitet og
leveringsløfter, så de ikke kan snige sig ind i et anfald af
hjælpsomhed. Kommer der bekræftede oplysninger fra ejeren, kan siden sige
mere — men så er det bekræftede oplysninger.

### Én tabel, tre indgange

`forespoergsler` har en `type`-kolonne med `catering`, `baglokale` eller
`selskab`. Tre tabeller ville være tre sæt adgangsregler at holde ens, tre
faner at rette og tre steder at huske, den dag der skal et felt mere på.
Forskellen er ét ord i en kolonne, ikke tre systemer.

Adgangen er den vigtige del, og den er den samme som ved bestillingerne:
**gæsten må skrive, men ikke læse.** En forespørgsel er navn og
telefonnummer på nogen, der har fortalt, hvornår de holder fest — altså
også hvornår de ikke er hjemme.

Listen over typer står to steder: check-reglen i databasen og
`FORESPOERGSEL_TYPER` i `js/store.js`. Prøve 14 og 15 i
`supabase/proev-forespoergsler.sql` fanger den dag, kun det ene bliver
rettet — en fjerde type i formularen, som databasen afviser, giver en gæst,
der trykker send og får en fejl, ingen forstår.

### Dato og antal er frivillige

*"Vi skal holde sølvbryllup engang til foråret, hvad koster det?"* er den
forespørgsel, der er mest værd, og et krav om en dato ville sende netop den
gæst væk igen. Står felterne tomme, siger admin-kortet **"Dato ikke
oplyst"** i stedet for at lade linjen være tom: et tomt felt ligner en fejl
i systemet, og personalet skal vide, at datoen er noget, de skal spørge om.

Datoen må gå to år frem, hvor bestillinger kun har 120 dage. Et bryllup
planlægges halvandet år ude, og en grænse, der passer til smørrebrød i
overmorgen, ville afvise præcis den forespørgsel, der er mest værd.

### Bremsen: tre om dagen, og dobbelttryk i ti minutter

Lavere tal end bestillingernes, fordi man spørger om ét selskab og ikke om
frokost hver torsdag. Dobbelttrykket fanges i et **tidsvindue** og ikke med
en unik nøgle, sådan som bestillingerne gør det: datoen er frivillig, og to
NULL'er støder ikke sammen i en unik nøgle — en gæst uden dato kunne trykke
ti gange, og databasen ville tage imod alle ti.

### To fejl, som kun målingen fandt

Begge var i **prøverne**, ikke i koden, og begge er skrevet ind i filerne:

- **Bremsen tæller rækker, ikke forsøg.** Prøven sagde "den fjerde bliver
  bremset" og målte det fjerde *forsøg* — men det andet var afvist som
  dobbelttryk og blev derfor aldrig en række. Grænsen måles nu fra begge
  sider: tre går igennem, den fjerde bliver bremset.
- **En `begin/exception` i PL/pgSQL er en undertransaktion.** Da det andet
  indstik blev afvist, rullede det første med tilbage, og tællingen var én
  for lav hele vejen ned. Den første står nu uden for blokken.

Og én i testene: prøven "en ukendt type i adressen vælger ingenting" målte,
at ingen knap lyste op — men `vælgType('noget-ukendt')` sætter alligevel
ingen knap i `.valgt`, fordi der ikke findes en knap med det navn. Den
bestod lige så pænt med vagten fjernet. Den måler nu, at der bliver
**spurgt** om typen, og at intet bliver sendt.

## Personalesiden er delt op i js/admin/

`admin.html` havde 804 linjer JavaScript i ét `<script>`-tag, og hver ny fane
gjorde blokken længere. Fase 2 lægger en forespørgselsmotor oven på admin, så
opdelingen kom først.

Koden ligger nu i `js/admin/` med **én fane pr. fil**: `tider.js`,
`lukkedage.js`, `bestillinger.js`, `menukort.js`, `nyheder.js`, `beskeder.js`,
`forside.js` og `kontakt.js`. To filer er ikke faner: `kerne.js` lægger
navnerummet `Admin` — hjælperne, kvittering og fejl, gem-og-genindlæs,
faneskift — og skal stå **først**; `login.js` trykker på startknappen og skal
stå **sidst**. Fanefilerne skriver deres tegnefunktion ind i `Admin.tegnere`,
så `genindlæs()` ikke kender nogen fane ved navn: en ny fane er én ny fil og
ét script-tag i `admin.html`, ikke en rettelse tre steder.

Det er stadig ren JavaScript uden build-step. Filerne deler et navnerum i
stedet for at importere hinanden, præcis som `Butik` i `js/store.js` deles
med gæstens sider.

Opdelingen fandt en fejl, der havde stået der længe: der var **to** funktioner
ved navn `pænDato` i samme scope — én til lukkedage med årstal, én til
bestillinger uden. Funktionserklæringer hoistes, så den sidste vandt, og
lukkedage og nyheder har hele tiden vist bestillingernes format. Den døde
udgave er ikke flyttet med, og det der står på skærmen, er uændret — det var
alligevel den anden, der kørte. Havde opdelingen flyttet begge med i hver sin
fil, var den døde kode vågnet op igen, og datoformatet havde ændret sig uden
at nogen havde bedt om det.

`tests/admin.spec.js` holder døren lukket: et `<script>` uden `src` i
`admin.html` fælder byggeriet. Fejlen er genindført og testen set fejle, som
reglen er her.

### Der er ingen "Hent på ny" mere

Kunden, 22. august: *"alle Hent på ny inde i admin væk, alt skal være
instant, responsivt, snakke med hinanden og live opdatere."*

Der stod seks af dem — Bestillinger, Forespørgsler, Borde, Baglokalet,
Skraldespand og Logbog — og de gjorde det, skærmen allerede havde gjort.
**En knap, der gentager noget, systemet gør i forvejen, lærer personalet at
mistro systemet**, og så trykker de på den hver gang.

De fire lister, gæsterne skriver i, hentes af sig selv ad fire kanaler:

| Kanal | Fil | Hvornår |
|---|---|---|
| Direkte forbindelse | `js/admin/live.js` | I samme sekund, gæsten trykker send |
| Pushen | `js/admin/frisk.js` | Når service workeren får beskeden |
| Tilbagekomsten | `js/admin/frisk.js` | Når man vender tilbage til fanen |
| Takten | `js/admin/frisk.js` | Hvert minut, kun når fanen er synlig |

**Skraldespanden, logbogen og salget står ikke i `Admin.friske`**, og det er
med vilje: de ændrer sig kun, når personalet selv gør noget, og et kald i
minuttet for en fane, ingen kigger på, er et kald for meget. De melder sig
i stedet ind med `Admin.hentVedFane(panelId, hent)`, og `visFane()` trykker
på den. Det er også dét, der gør knappen overflødig — man skiftede jo
alligevel til fanen for at trykke på den.

`vedFane` holder en **liste** pr. fane og ikke ét felt. Skraldespanden og
logbogen deler panelet `p-historik`, og med ét felt ville den fil, der blev
indlæst sidst, vinde — den anden ville aldrig hente. Det er den slags, der
kun opdages, når nogen undrer sig over en logbog, der står stille. Prøven
måler derfor **begge** lister.

Det, der står i stedet for knappen, er `.live-maerke`: en grøn prik, der
ånder, teksten "Listen opdaterer sig selv" og klokkeslættet for sidste
hentning (`Admin.hentet(id)`). Uden den ser en liste, der opdaterer sig
selv, præcis ud som en liste, der er gået i stå — og så leder personalet
efter knappen, vi lige har fjernet.

Fejlteksterne fulgte med. De sagde `Prøv "Hent på ny", eller log ud og ind
igen` og pegede altså på en knap, der ikke findes. Nu står der, at skærmen
prøver igen af sig selv.

### Et klokkeslæt skal kunne stå i sit felt

Kunden skrev, at der er "masser af" ting, der ligger oven i hinanden, i
admin. Det her var ét af dem, og det var usynligt i koden.

Felterne i Åbningstider var 6,5 rem. Det rakte til "21:00" plus browserens
lille urikon — men `<input type="time">` følger **browserens** sprog, ikke
sidens. Står maskinen på engelsk, skriver den "09:00 PM", og så blev
klokkeslættet klippet midt over af urikonet: `09:0` med et ur ovenpå.
Personalet kunne altså ikke læse den lukketid, de selv havde skrevet.
9 rem rummer den lange form.

## Admin blinker ikke, og en note overlever en travl vagt

Kommer fra spiis-gennemgangen af den udgivne kode (punkt 1 på
rettelseslisten): `js/admin/frisk.js` henter hvert minut hele vagten, og hver
hentning tegnede **alle** faner om, uanset om noget havde ændret sig. Skærmen
hoppede 59 gange i timen med ingenting.

Det er lukket i to lag, og det andet er det, der koster penge:

**Fingeraftrykket** i `genindlæs()` (`js/admin/kerne.js`) er en streng af de
hentede data. Er den den samme som sidst, tegnes der ingenting, og skærmen står
bomstille, til noget faktisk sker. `Admin.gem` går gennem den samme
genindlæsning, så efter et gem HAR dataene ændret sig, og der tegnes altid.

**`Admin.tegnRaekker`** tegner de fire lister — bestillinger, borde,
forespørgsler og udlejninger — række for række. Hver række har en nøgle og et
aftryk; er aftrykket uændret, bliver knuden **stående**. Kun det, der faktisk
har ændret sig, bygges om.

Uden det andet lag rev én ny bestilling hele listen ned. Det er ikke kun et hop
på skærmen:

> Noten på hvert kort gemmes ved `change`, altså når feltet **forlades**. Rives
> feltet ud af siden, mens nogen skriver i det, mister markøren sit felt, og de
> næste bogstaver lander ingen steder.

**Målt i Chromium:** browseren fyrer et `change` på vejen ud, så den halve
sætning blev gemt af sig selv — med en kvittering, ingen bad om, og en linje i
logbogen. Andre browsere fyrer det ikke, og så er sætningen bare væk.
Personalet står med en iPad i køkkenet; vi ved ikke, hvilken af de to fejl de
får. `tests/admin.spec.js` måler begge ender: markøren skal blive stående midt
i en sætning, når der lander en bestilling, og noten må **ikke** være gemt
endnu. Prøven er set fejle med den gamle optegning.

Rækkefølgen holdes med en markør ned gennem de knuder, der allerede står der:
en ny række skydes ind foran markøren, og de gamle bagved bliver liggende. En
knude flyttes derfor kun, hvis rækkefølgen selv har ændret sig.

Det tredje lag er **markeringen**: kortet, der lige er landet, lyser op i to
sekunder (`.linje-ny`). Det kunne først lade sig gøre efter det første —
tegnes alt om hvert minut, er alting nyt.

## Designet

Bygget efter designbundtet: sand, marineblå, en rød accent og is-lyserød.
Bebas Neue til alt stort, Instrument Sans til brødtekst. Signaturen er
glasknapperne.

**Skrifterne ligger i `fonts/`**, ikke hos Google. En telefon med dårligt
signal nede ved vandet skal ikke vente på et fremmed domæne, og siden må ikke
gå i stykker hvis Google er nede.

### To farver er flyttet fra prototypen

Begge fordi de ikke kunne læses, og begge regnes efter ved hver testkørsel:

| Token | Prototypen | Nu | Hvorfor |
|---|---|---|---|
| `--muted` | `#6d8298` | `#526e8b` | 3,5:1 mod sand. Kravet er 4,5:1 |
| `--red-tekst` | fandtes ikke | `#c33d27` | `--red` giver kun 4,0:1 mod sand |

Fladerne — knapper, numre, store tal — bruger stadig den rigtige `--red`.
Kun små tekster bruger den mørkere.

### To slør er tilføjet

Prototypen havde hvid tekst direkte oven på fotoerne. Målt mod et **lyst**
billede holder det ikke:

- **Bag topmenuen.** De hvide menupunkter lå på 3,4:1. Der er nu en mørkning
  øverst i hero, som forsvinder når menuen bliver til glas. Over et mørkt foto
  kan man knap se den.
- **Bag teksten på fuldbredde-billedet.** Prototypen holdt den læsbar med en
  `text-shadow` alene, og en skygge tæller ikke som kontrast.

### Fotografierne og videoen

Tre rigtige fotos fra havnen, bearbejdet til web i `billeder/`:

| Fil | Bruges til | Fra |
|---|---|---|
| `facade-*.jpg` | hero-stillbilledet, tre størrelser | 5504×3072, 8,4 MB |
| `assets/harbour.jpg` | udsigten til sidst i isfilmen | 5504×3072, 8,9 MB |
| `kager-*.jpg` | kage-afsnittet, tre størrelser | 3072×5504, 8,2 MB |
| `molen-*.jpg` | *ubrugt* — se "Hvad der er fjernet" | 3072×5504, 8,4 MB |
| `hero.mp4` / `.webm` | hero-videoen: hele turen forbi | hele klippet, 9,5 s |
| `isfilm.mp4` / `.webm` | isfilmen, bredt 1920×1080 | `assets/scoop-film.html` |
| `isfilm-poster.jpg` | stillbillede, bredt | slutbilledet, 9,9 s inde |
| `isfilm-hoej.mp4` / `.webm` | isfilmen, højt 1080×1350 | `…scoop-film.html?form=hoej` |
| `isfilm-hoej-poster.jpg` | stillbillede, højt | slutbilledet, 9,9 s inde |

De webklare udgaver laves med `python3 vaerktoej/lav-fotos.py`. Videoerne har
**ingen** posterbilleder ud over isfilmens — se afsnittet om hero-videoen.

### Videoen i hero: hele turen forbi

Hero-videoen er hele turen forbi lugerne: langs facaden, ind over kagerne,
churros og softicen. Den lå før i sit eget afsnit længere nede — nu er det
den man møder først, og det gamle afsnit er væk.

Det havde en pris der skulle måles. Den gamle hero-video var facaden alene,
netop fordi den er mørk og rolig. Turen forbi har lyse steder: den overskyede
himmel over facaden, kagerne på det rødternede voksdug, den hvide softice.
Med prototypens slør på `.40` lå overskriften på **3,08:1** mod kravet på 3,0
for stor tekst. Den klarede det, men med 3% margin — og så er det held.

Sløret er derfor styrket netop dér hvor overskriften står, i 22-74% af heroens
højde. Værste billede i hele videoen ligger nu på **3,97:1**. Længere kunne den
godt gå: ved `.62` på midten rammer man 4,7:1. Men så er turen forbi lugerne
blevet en mørk tekstur i stedet for et billede af en havnegrill, og det er
prisen ikke værd når kravet er 3,0.

`tests/kontrast.spec.js` **læser sløret ud af CSS'en** og måler hvert billede i
den rigtige video imod det. Før stod alfa-værdien som et tal i testen, hentet i
hovedet fra et gradient med tre stop — ændrede nogen gradienten, målte testen
videre på det gamle tal. Nu følger målingen med af sig selv, og båndet der
måles er overskriftens eget sted på skærmen, ikke et gæt.

**Videoen venter på introen.** Introen kører ved hvert besøg nu, og 1,3 MB
video ned ad linjen samtidig gør animationen hakkende. `js/intro.js` sender
`mosede-intro-slut` når laget er væk, og `js/side.js` henter først videoen der
— med en tidsgrænse på 10 sekunder, så en fejl i introen ikke kan holde videoen
væk for evigt.

**Videoen har ingen poster.** Et poster-billede hentes med det samme, også med
`preload="none"`, og dette ville aldrig blive set: facadefotoet ligger oven på
det indtil videoen spiller. Det var 119 kB spildt ved hvert besøg. Fotoet ER
posteren.

**MP4 står før WebM.** H.264-udgaven er både mindre (1,3 mod 1,8 MB) og
understøttet overalt. WebM'en er til de få browsere der er bygget uden H.264 —
blandt andet den Chromium testene kører i, hvilket er grunden til at videoen
overhovedet kan afprøves her.

De ubearbejdede kamerafiler er **ikke** i repoet. De ligger i historikken på
commit `c05b208` og `92ec1cb`. `original/` er i `.gitignore`, og
`vaerktoej/lav-fotos.py` laver de webklare udgaver ud af dem.

**EXIF er strippet.** Kamerafilerne indeholdt GPS-position, enhedsoplysninger
og C2PA-signaturer. Det skal ikke ligge offentligt på en hjemmeside.

### Isfilmen

Afsnittet **Isen** har en 12,1 sekunders film: tre kugler hopper op i keglen, og
så letter sandet og viser solnedgangen over terrassen på havnen bag den.
Overskriften siger pointen — *Du kommer for isen. Du bliver for udsigten.*

Filmen er bygget af fem udklip fra kundens egne fotos plus et havnefoto.
Opskriften er `assets/scoop-film.html`, og matematikken kommer ord for ord fra
designprototypen.

#### Den skal starte af sig selv, og en afspil-knap er ikke svaret

Kunden skrev at filmen ikke gik i gang på telefonen, og at der stod en
afspil-knap i stedet: *"den må du ikke gå på kompromi med."* Den kører fint i
Chromium, også i telefonprofilen — så fejlen er på **rigtig iOS Safari**, hvor jeg
ikke kan måle den. Tre ting er ændret, hver med sin egen begrundelse:

**`autoplay`-attributten står nu på `<video>`** ved siden af JavaScriptets
`play()`. På iOS er de to ikke det samme: en `play()` fra JavaScript, der ikke
kommer i nærheden af en berøring, kan blive afvist, mens attributten bruger Safaris
egen maskine, som må starte en tavs `playsinline`-video. Den koster ingenting, fordi
der ikke er nogen `<source>` på elementet før `js/side.js` lægger dem på 900 pixel
før rammen kommer i syne.

**Der ventes på `readyState` 3 og ikke 4.** 4 er `HAVE_ENOUGH_DATA` — "jeg kan køre
den igennem uden at standse" — og det er også et svar iOS Safari ofte aldrig giver
for en video der kører i ring. Derfor var loftet **6 sekunder**, og seks sekunder er
en evighed: man ruller til afsnittet, ser et stillbillede, og er videre længe før
filmen begynder. 3 er `HAVE_FUTURE_DATA`, altså nok til at begynde; resten når at
komme mens de første sekunder spiller. Loftet er nu 1,8 sekunder.

**Et afvist `play()` er ikke et endeligt svar.** Før stod der `.catch(visKnap)`:
blev kaldet afvist én gang, kom knappen frem og blev der. iOS afviser i flere
tilfælde der ikke er varige — strømsparetilstand, for lidt data endnu, for langt fra
en berøring — og alle tre kan være forbi et sekund senere. Knappen kommer stadig
frem som nødudgang, men der prøves **igen ved gæstens første berøring**, og lykkes
det, gemmer knappen sig selv. Berøringen er nøglen: på iOS åbner den første
brugerhandling en dør for medieafspilning på hele siden, og introen lukkes nu ved et
tryk hvor som helst, så de fleste besøg har en berøring inden man er rullet ned.

Knappen har stadig to **lovlige** grunde til at være der: reduceret bevægelse og
sparetilstand. Der er ingen tredje, og `tests/isfilm.spec.js` skriver kontrakten:
når afsnittet er i syne under almindelige forhold, skal filmen køre, tiden skal
**løbe**, og knappen skal være skjult.

Én ting til hørte med: rammen om filmen kom ind uskarp med `filter: blur()`. Se
afsnittet om sektionsanimationerne — et filter over en spillende video er dyrt, og
det var med til at filmen ikke "floatede".

#### Den svæver

Stakken kom op fra neden i de første 1,35 sekund og stod så **stille** indtil
`Hold` ved 5,1 s, hvor den begyndte at vippe. De fire sekunder imellem — hele
opbygningen med de tre kugler — var den bomstille mellem hoppene. Den lå ikke i
luften, den var **parkeret**, og det var derfor den ikke svævede.

Nu er der en vedvarende bevægelse hele filmen igennem: to sinusser med perioder
der ikke går op i hinanden (5,5 og 10,3 s), så mønsteret ikke gentager sig inden
for filmens 12 sekunder og aldrig lyder som en metronom. 9 og 5 px — nok til at
man kan se det, for lidt til at man lægger mærke til det. Vippen begynder også
fra første billede, men **tones ind** over det første sekund, ellers kæmper den
med opstigningen og keglen kommer skævt op af sandet.

**Skyggen er det der gør arbejdet.** En `drop-shadow` sidder på sit element og
flytter sig med det, så en skygge der svæver sammen med keglen fortæller
ingenting. Svævet lægges derfor til skyggens afstand **ét til ét**: går stakken
9 px op, går skyggen 9 px længere ned, og den bliver dermed stående på sandet
mens keglen letter fra den. Sløringen vokser med afstanden og skyggen bliver
lysere — en skygge tæt på er hård og mørk, en langt væk er blød og bleg. Det er
hele forskellen mellem noget der flytter sig og noget der svæver.

Alle afstande i filmen ganges nu med `K`, også kuglernes hop. Prototypens 760,
−105 og 160 er skrevet som `975·K`, `−134,6·K` og `205·K`: præcis de samme tal i
det brede format, men de følger med når højformatet gør keglen 35% større. Ellers
ville kuglerne hoppe kortere i forhold til isen, og hoppet er det filmen handler
om.

**Den er optaget til video, ikke lagt live på siden.** Live ville hver gæst
skulle hente halvanden megabyte udklip og lade telefonen regne slør og skygger
på fire lag i tolv sekunder. Som video er det én fil, den standser når man
ruller væk, og den ser ens ud i alle browsere.

#### Den findes i to formater, og det er ikke pynt

1920×1080 er fin på en computer. På en telefon får afsnittet 350 px bredde, og
en 16:9-ramme er så 197 px høj: navnet i 96 px ender som 17 px på skærmen,
underlinjen i 25 px som 4,5, og åbningslinjen kan slet ikke læses. Filmen var
ikke for lille — den var i **det forkerte format**.

Højformatet er 1080×1350 (4:5). Det er ikke det brede billede beskåret:

* keglen er 35% større i forhold til rammen (`K` 1,05 mod 0,78)
* kameraet zoomer kun ud til 0,88 og bliver i midten, hvor det brede ender på
  0,66 nede til venstre
* titlen står **under** keglen på en uigennemsigtig plade, ikke ved siden af
* sløret er svagt og jævnt: pladen klarer læsbarheden
* den vejer mindre — 953 mod 1259 kB

Forskellene står samlet i `FORMATER` i `assets/scoop-film.html`. Selve
bevægelsen — hop, dask, kameraryk, overgangen til havnen — er den **samme kode**,
så en timing rettes kun ét sted.

`js/side.js` vælger ud fra `matchMedia('(max-width: 700px)')`, og `.film-ramme`
i CSS'en skifter form ved **samme grænse**. Passer de to ikke, får man en høj
film i en bred ramme, og `object-fit: cover` klipper titlen af nede i bunden
uden at nogen kan se hvad der mangler. `tests/isfilm.spec.js` måler rammens
form og sammenholder den med den fil der bliver valgt.

Grænsen er en bredde og ikke en apparattest: en smal browser på en computer har
det samme problem som en telefon, og en telefon på tværs har det ikke.

#### Sådan laves den om

```bash
python3 vaerktoej/lav-udklip.py     # udklippene, hvis du har ændret dem
node vaerktoej/lav-isfilm.js        # begge formater
node vaerktoej/lav-isfilm.js hoej   # kun det høje
```

Skal et format sættes op på ny, så SE på det i stedet for at regne kameravinkler
i hovedet. `node vaerktoej/proev-isfilm.js hoej 0.9 4.7 9.9` tegner de nævnte
sekunder som PNG i `test-results/isfilm-proeve/` og skriver hvor kugler, hånd og
tekster ligger **efter** kameraets transform. Det var sådan højformatet blev
sat op, og det var sådan to fejl blev fundet: et ærme der stoppede i en snorlig
kant midt over bordet, og en blå himmelrand langs den øverste kugle.

Posterbilledets tidspunkt bliver **tjekket** mod filmens længde. Det skal det,
fordi fejlen er lydløs: blev filmen kortere end tallet, søgte ffmpeg ud over
slutningen, skrev ingen billeder og sluttede pænt med kode 0 — og lod det gamle
posterbillede ligge. Resultatet var en ny film med et stillbillede fra den
gamle, og intet der sagde det.

#### Udklippene: hvordan de bliver skåret ordentligt

`vaerktoej/lav-udklip.py` læser kundens egne udklip fra `assets/raa/` og skriver
de færdige til `assets/`. Råfilerne bliver aldrig rørt, så resultatet er det
samme hver gang. Fire ting bliver gjort, og **rækkefølgen betyder noget** — se
punkt 4, som er en fejl der stod i den færdige film i flere uger:

1. **Farven trækkes udefra ind.** Udklippene har en blød kant på 10-20 px, og i
   den kant står der lyse pixels fra det foto de er klippet ud af — målt til
   rgb(124,112,99) mod en kerne på rgb(103,75,54). På sandbaggrunden bliver det
   en tåget rand: klistermærker med et skær omkring. Hver halvgennemsigtig pixel
   får farve fra de mere dækkende naboer, så der ikke er en lys ring at få frem.
2. **Himlen fjernes efter farve.** Der er klippet en smule uden om kuglerne, så
   de yderste par pixel er baggrund i fuld dækning — punkt 1 rører dem ikke.
   Baggrunden er kold (bleg blå himmel), isen er varm. I de tolv yderste pixel
   af en kugle er 7,0% kolde; i kernen er 0,0% kolde. Der er altså et rent skel,
   og kun de kolde pixels i kantbåndet ryger.
3. **Konturen glattes med en sløring, ikke med morfologi.**

Punkt 3 er det der gjorde forskellen, og det tog to forsøg:

- **Første forsøg krympede formen fire pixel** for at komme af med randen. Det
  virkede ikke: randen er 3-6 px de bredeste steder og under 1 px andre, så fire
  pixel var både for lidt og for meget.
- **Andet forsøg ryddede op med en åbning og en lukning** — `MinFilter` og
  `MaxFilter`. Det var en decideret fejl, og det var DEN kunden så: de filtre er
  **firkantede**. Gentaget krymp og voks med en 3×3 firkant afhugger runde
  hjørner til lige facetter, så en kugle kommer ud som en ottekant.

En gaussisk sløring efterfulgt af en tærskel gør det samme arbejde og er
**rund**. Og radius skal være stor: kuglerne er klippet ud med et polygon-lasso,
så under den bløde kant ligger der lige linjer på 10-20 px. Så længe kanten var
tåget, kunne man ikke se dem — gør man kanten skarp, kommer ottekanten frem.
**12 px** jævner dem helt ud på en kugle der er 358 px bred, og isens egen
struktur inde i kuglen bliver ikke rørt: det er kun konturen der behandles.

Hånden får kun 8. Den har rigtige detaljer i kanten — fingre, et serviet-hjørne,
keglens kant — og en finger er 80 px bred, så 8 rører den ikke, mens 12 ville
begynde at slikke om hjørnerne på servietten.

4. **Himlen fjernes IGEN, efter at konturen er formet.** Det er ikke en
   dobbeltsikring, det er en rettelse af rækkefølgen. Punkt 3 slører alfakanalen
   med radius 12 og sætter tærsklen bagefter — og de kolde pixels punkt 2 lige
   havde skåret væk, sad 1-5 px inde fra kanten, altså langt inden for de 12. Så
   vaskede sløringen dem lige tilbage igen, og den øverste kugle havde en tydelig
   **blå kant** i den færdige film. Det så man først i højformatet, hvor kuglerne
   er 35% større.

   Rækkefølgen er nu: form konturen **hårdt**, bid så de kolde pixels ud af den
   færdige silhuet, og læg til sidst den ene pixel blødhed på. Den er for lille
   til at kunne trække en skal på 5 px tilbage. Målt bagefter: 0 kolde pixels
   tilbage i de tre kugler og i hånden.

   Chokoladekuglen har stadig 1027, men de sidder 15-48 px **inde** i kuglen: det
   er mørk chokolade i skygge, hvor den blå kanal tilfældigvis er højere end den
   røde. Det er is, ikke himmel, og kantbåndet på 12 px holder med vilje
   fingrene fra den.

#### Ærmet: hvorfor det IKKE er strakt

Til sidst forlænges ærmet på hånden, som ellers bliver klippet af i en snorlig
linje der kommer til syne når kameraet zoomer ud. De nederste **faste** rækker
strækkes — ikke de nederste rækker med noget i: de sytten sidste er en lodret
udtoning fra alfa 250 til 134, og strækkes de, bliver ærmet en halvgennemsigtig
stribe med en synlig streg hvor den begynder.

`AERME_HOEJDE` er **800**, hvor råfilen er 710. Altså er 90 rækker strakt, og det
kan man ikke se.

**Det tal var én gang 1400, og det var forkert.** Højformatet zoomede dengang ud
til 0,60 til sidst, og så kom kanten ved 800 ind i billedet. Regnestykket sagde
1350, så ærmet blev forlænget. Men 1400 betyder at **690 af 1400 rækker** — næsten
halvdelen af billedet — er ti rækker trukket ud, og resultatet var en arm der var
synligt for lang. Kunden så det med det samme, to gange.

Løsningen lå i filmen og ikke i udklippet, og den er todelt:

* **Kameraet zoomer kun til 0,88** i stedet for 0,60. Ved 0,60 var ærmet 365 px
  bredt og 500 px højt i rammen — smalt og langt, altså en pind. Ved 0,88 er det
  536 px bredt, og det virkelige foto rækker til y=1321 af 1350: 29 px strakt
  tilbage.
* **Et uigennemsigtigt titelfelt** dækker fra y=990 og ned, med en blød overkant
  på 70 px så pladen ikke skærer armen over med en snorlig linje. Ærmets kant
  ligger under den, og navnet står på husets egen farve i stedet for på lyst
  trædæk i solnedgang.

Det brede format har intet titelfelt. Dér går ærmet ud af billedet af sig selv.

#### Udsigten

Havnefotoet er kundens billede af terrassen: borde, parasoller og bådene i
solnedgang. Det ligger 5504×3072, altså præcis 16:9, og filmen viser det i
1920×1072 — ingen beskæring.

I det brede format er sløret bag navnet **lettet** fra `.08/.24/.52/.72` til
`.06/.19/.42/.60` da fotoet blev skiftet. Højre side af det nye billede er
mørkere af sig selv, både parasollen og bådene, så navnet lå på 5,6:1 mod et
krav på 3,0. Det er margin man kan give tilbage til billedet i stedet for at
lade den stå ubrugt. Der blev lettet i to skridt: `.05/.15/.34/.50` gav 3,68:1,
og 23% margin er for lidt til at holde til at nogen skifter fotoet igen. Nu
ligger navnet på 4,4:1.

I højformatet er fotoet **beskåret**: 4:5 ud af et 16:9-billede viser 45% af
bredden. Det tåler netop dette foto, fordi det er symmetrisk — bordet står midt
i, med en parasol i hver side — så en midterbeskæring holder både bordet, vandet,
havnemundingen og solnedgangen. Sløret er vendt en kvart omgang og går til
`.04/.14/.52/.80` **nedad**, for der står titlen, og den nederste tredjedel af
fotoet er lyst trædæk i solnedgang. Navnet ligger på 6,29:1.

#### Hvorfor målingen sker på opskriften og ikke på videoen

Teksterne er **brændt ind i** filmen. Måler man videoens pixels, måler man den
hvide skrift mod sig selv og får 1,09:1 hver gang — første udgave af testen
gjorde præcis det. `assets/scoop-film.html` kan derimod tegne det samme øjeblik
med teksterne slået fra, og så er det baggrunden alene der bliver målt. Det er
baggrunden der afgør om skriften kan læses.

`tests/isfilm.spec.js` gør det for alle tre tekster i **begge** formater:

| | bredt | højt |
|---|---|---|
| navnet | 4,39:1 | 10,27:1 |
| underlinjen | 4,43:1 | 13,11:1 |
| åbningslinjen | 12,57:1 | 12,57:1 |

Kravet er 3,0 (stor tekst). Højformatet ligger så højt fordi navnet står på
titelfeltets tætte marineblå og ikke på et foto. At måle kun det ene format ville
være at lade halvdelen af gæsterne stå med et navn de måske ikke kan læse — og det
er telefonhalvdelen, altså de fleste.

**Kassen skal ligge præcis på bogstaverne.** Første udgave af den høje måling
begyndte 100 px over det øverste bogstav og fik 3,25:1 mod et krav på 3,0. Det tal
var ikke navnets kontrast — det var havnefotoet gennem titelfeltets bløde
overkant, et sted hvor der ikke står et bogstav. En måling af tomt felt kan fælde
en tekst der er fuldt læselig, eller give en falsk tryghed om hvor meget margin
der er. Begge er værre end ingen måling.

To videre tests sammenligner hver videos længde **og formatets pixelmål** med
opskriftens, så målingen ikke kan bestå på en rettet opskrift mens gæsterne
stadig ser en gammel video — og så en høj film ikke ved et uheld kan blive
optaget i et bredt vindue. Den fejl ville give den rigtige længde og en side der
klipper titlen af, uden at nogen kunne se hvad der manglede.

Målingen var i øvrigt selv forkert i en periode: et skærmbillede klippes mod
**vinduet**, ikke mod siden, så titelfeltet ved x=1070-1770 blev stille og
roligt beskåret til 1070-1280 i et vindue på 1280 px. Det kom for dagen da en
tekst blev flyttet helt uden for vinduet og Playwright svarede "clipped area is
outside the image" i stedet for at give et forkert tal.

## Tre sider i stedet for én

Forsiden var 5600 pixel lang på en telefon. Hele menukortet lå midt på den — 14
kategorier, 151 varer og 29 slags smørrebrødsfyld — og alt det der **sælger**
stedet lå nedenunder, hvor ingen kom hen.

| Side | Opgave |
|---|---|
| `index.html` | Sælge stedet: er der åbent, hvordan ser det ud, hvad kan man få |
| `menu.html` | Vise sortimentet |
| `smoerrebroed-ud-af-huset/` | Skabe bestillinger ud af huset |

Forsiden viser nu kun **kategorierne**, hentet fra databasen, så der ikke står en
kategori på forsiden som personalet har omdøbt eller tømt. En kategori uden varer
vises ikke: gæsten skal ikke trykke på "Pølser" og lande på en tom afdeling.

### Menukortets kategorier er folder

Kunden, 22. august: menukortet skal være *"mere overskueligt og opdelt og
telefon-egnet"* — og han sendte to skærmbilleder fra `bestil/` som svar på,
hvordan det skulle rulle ned: lukkede rækker med kategorinavnet, og én
foldet ud med varerne under.

Det er den rigtige form her, og af den samme grund som dér. Kortet har
fjorten kategorier og 151 varer. Fladt ud er det 5-6.000 pixel på en
telefon, og man skal **rulle** for at finde ud af, hvad der overhovedet
findes. Med folder er hele afdelingen ét skærmbillede: man kan se udvalget,
før man vælger, hvad man vil læse.

Fire ting, der ikke er valgfri:

- **Den første fold er åben.** En side, hvor alt er lukket, ligner et
  menukort, nogen har gemt væk — man skal trykke én gang for at se, at der
  overhovedet er mad. Den første fold viser, hvad det *er*, man folder ud
- **Tallet på folden tælles.** "6 varer" er svaret på "er der noget at komme
  efter herinde?", som man ellers kun kan få ved at åbne
- **`<h2>` bliver stående om knappen.** Overskriften er sidens struktur — en
  skærmlæser skal kunne springe fra kategori til kategori — og et `<button>`
  alene er ingen overskrift. Omvendt kan en overskrift ikke trykkes på.
  Begge dele skal med
- **Genvejen og ankeret ÅBNER folden.** Uden det førte "Drikkevarer" i
  genvejsrækken til en overskrift uden noget under: man havde trykket
  rigtigt og stod stadig og manglede menukortet. Det samme for et delt link
  til `menu.html#kat-oel` i en sms

Klasserne er de samme som folden i `bestil/` (`.fold-hoved`, `.fold-krop`,
`.fold-pil`). Én håndbevægelse på hele siden, ét sæt regler at holde ved
lige. Afstanden mellem kategorierne er skruet ned fra 30-52 px til 10, og
det er hele pointen: lukkede folder skal ligge tæt. Den åbne får sin luft
tilbage forneden.

### Menukortet og sortimentet i spiis' kortstil (23/8)

Kunden sendte to skærmbilleder fra spiis:

> "menukortet og de steder, hvor man skal kunne se deres sortiment — lad det
> være præcis den her flotte og dejlige stil med overskuelighed, bare deres
> farvepaletter."

Formen dér er **ét hvidt kort pr. kategori**: et lille tegn i en rund
firkant, navnet, antallet ude i højre kant, en **stiplet** streg ned til
varerne, og priserne i mærkefarven yderst til højre. Farverne er havnens —
sand udenom, papir i kortet, det marineblå til teksten og det røde til
prisen.

Tre valg er værd at kende:

- **Tegnet kommer fra AFDELINGEN**, som ejeren selv sætter i admin, og ikke
  fra kategorinavnet. Det er tre tegn i stedet for fjorten — men de tre er
  sande. Gættede vi på navnet, ville "Pariserbøf" få en burger, og den dag
  ejeren opretter "Vinterretter", ville den få en tilfældighed. Tegnet er
  `aria-hidden`: en skærmlæser skal høre "Smørrebrød", ikke "spisebestik
  Smørrebrød"
- **Stregen er stiplet og ikke fuld.** En fuld streg deler kortet i to kort;
  en stiplet siger "det her hører sammen, og nu kommer indholdet"
- **Prisen bruger `--red-tekst` og ikke `--red`.** Den lille skriftstørrelse
  på en telefon falder under 4,5:1 med mærkefarven selv. Kontrastprøven
  regner det efter

Overskriften stod før som en 38 px display-linje med en tyk blå streg under.
Den var flot og fyldte en tredjedel af telefonens skærm pr. kategori — og
med fjorten kategorier er det fjorten skærme, før man har set udvalget.

`smoerrebroed-ud-af-huset/` har fået den samme form: to lister over det
samme sortiment, der ser forskellige ud, er to sider at holde ved lige.

### Menukortet kan administreres ordentligt nu (23/8)

Kundens spørgsmål var kort: *"på admin kan man administrere menukortet
ordentligt?"* Svaret var nej på tre punkter, og de var alle tre usynlige i
koden, fordi fanen **så** færdig ud:

| Kunne ikke | Hvorfor det er dyrt | Nu |
|---|---|---|
| Rette **beskrivelsen** | Den blev sendt uændret med hver gang varen blev gemt (`beskrivelse: v.beskrivelse`). Den ene sætning, der sælger retten, kunne kun skrives i SQL | Eget felt på sin egen linje under varen |
| Ændre **rækkefølgen** | Kolonnen `sortering` sættes ved oprettelsen. Fik ejeren en ny ret, lå den nederst for evigt | Pile op/ned på både varer og kategorier |
| Oprette en **kategori** | Fanen skrev det endda højt: *"De oprettes i setup.sql."* Det er et svar til en udvikler, ikke til en ejer, der gerne vil have en afdeling, der hedder "Vinterretter" | Navn + afdeling + Opret, nederst på fanen |

**Der skulle ikke noget nyt i databasen til.** Adgangsreglerne i
`flerlejer.sql` har givet admin lov til at oprette, rette og slette i
`menu_kategorier` og `menu_varer` hele tiden — der manglede en vej derhen
fra skærmen. `Butik.skrive.kategori()` og `.sletKategori()` er de to nye
funktioner i `js/store.js`.

To detaljer, der er tænkt igennem:

- **Pilene BYTTER tal** i stedet for at sætte alle sorteringer om: to
  skrivninger i stedet for fjorten, og ingen anden række rykker sig, mens
  man kigger. Har to rækker samme tal — og det har de, hvis de er oprettet i
  SQL med `sortering 0` — får de to nye, der ligger et tal fra hinanden, så
  byttet faktisk kan ses
- **Slet står kun på en TOM kategori.** Databasen sletter varerne med
  (`on delete cascade`), og ét tryk må ikke kunne tage 29 varer med sig —
  heller ikke med en bekræftelse, for den læser ingen

### Menuoversigten: fra indholdsfortegnelse til kort

Afsnittet hed **"Det får du hos os"** og var tre kort med stakke af
kategorinavne i Bebas. Det var en indholdsfortegnelse: den fylder en skærm, siger
ingenting man ikke kunne gætte, og linjerne stod for tæt til at rammes med en
tomme.

Hver afdeling er nu ét kort med navnet stort, **hvor mange kategorier og varer**
den har, og kategorierne som runde piller der er store nok at trykke på. Tallene
tælles på menukortet, aldrig skrevet i hånden, så de ikke kan blive forkerte den
dag personalet lægger en kategori ind. `tests/forside.spec.js` tæller pillerne og
sammenholder dem med tallet.

**Der står med vilje ikke "fra 25,-".** Det var første forsøg, regnet som den
laveste pris i afdelingen, og det ville have været sandt og alligevel
vildledende: den billigste vare under Is og desserter er en **løs vaffel til
4 kr.**, så kortet ville love "fra 4,-" om en afdeling hvor en is koster 30. Et
tal der er rigtigt og giver et forkert indtryk, er værre end intet tal. En test
holder det ude fremover.

### Smørrebrødet har sit eget afsnit på forsiden

Her lå **"Går hurtigt lige nu"**: fem kort med et udvalg der roterede hver time,
valgt blandt de varer personalet havde markeret som fremhævet. Overskriften sagde
med vilje ikke "mest bestilte" — der er ingen kassedata, ikke ét rigtigt salg —
men det ændrede ikke på at blokken **lignede** en "populært lige nu"-liste, og en
sådan liste uden tal bag er en påstand man ikke kan holde. Kunden kaldte den
kedelig, og siden generisk.

Det blev til smørrebrødets blok, og 23/8 blev den til smørrebrødets **eget
afsnit** mellem bestillingen og menukortet. Kundens ord:

> "smørrebrød ud af huset skal flyttes væk til en section for sig, for det er
> en af deres hoved ting og fortjener deres eget bestillings ting"

Afsnittet er en fremvisning med en vej videre: to talte tal (*slags stykker*,
*slags fyld*), otte slags fyld som smagsprøve, og to knapper — "Bestil
smørrebrød" til `bestil/` og "Se alle slags" til salgssiden.

**Alt kommer fra menukortet, og tallene TÆLLES** — der står ikke et rundt tal
nogen har skrevet. Sætter personalet en slags udsolgt, falder tallet af sig
selv, og der kan ikke komme til at stå "29 slags" den dag der er 27.
Er der hverken stykker eller fyld på kortet, findes afsnittet ikke: en
overskrift over ingenting fortæller gæsten, at der aldrig er noget.

Otte slags fyld og ikke alle 29: en mur af piller på forsiden er præcis den
indholdsfortegnelse, hele forsiden blev ryddet for. Resten står på deres egen
side.

**Farverne måtte laves om.** Tallene og pillerne var tegnet til den mørke
flade på `smoerrebroed-ud-af-huset/` — `--scoop`-rosa og hvid tekst på glas —
og på sandet var de usynlige. De er scopet til `#smoerrebroed` nu.

### Menuoversigten: tre ens kort, ikke tre klumper

Hver afdeling er ét kort: navnet stort, to tal der **regnes** af menukortet, og
kategorinavnene som én linje tekst. Hele kortet er linket.

Kategorierne stod som runde piller med et dybt link hver. Det lød rigtigt, og det
så forkert ud: en pille har den bredde dens navn har, så "Øl" blev 44 pixel og
"Vælg fyld til smørrebrødet" 190. På det rigtige kort har Mad syv kategorier mod
Drikkevarers tre, og det gav tre kort i vidt forskellig højde med ragged klumper
i. Kunden kaldte knapperne sjuskede.

Første rettelse var at fjerne navnene helt. Det var for meget: "Mad · 2 kategorier
· 3 varer" siger ikke om der er smørrebrød eller burgere, og det er netop det man
vil vide. Navnene står derfor stadig, som almindelig tekst med prikker imellem —
en tekstlinje ombrydes jævnt og kan ikke få ujævne bredder.

Og der er **én knap under oversigten, ikke to**. Der stod "Se hele menukortet"
ved siden af "Smørrebrød ud af huset": to knapper i forskellig højde (46 mod 40
pixel) og forskellig form, hvoraf den ene nu er en dublet af den røde knap i
smørrebrødsblokken.

Menukortet viser **én afdeling ad gangen** med genveje til hver kategori. Genvejene
ruller sidelæns på en telefon — syv kategorier kan ikke stå på 390 pixel, og en
ombrudt klump på fire linjer skubber selve kortet ned under skærmkanten.
Afdelingsfanerne klæber til toppen, så man kan skifte fra maden til isen uden at
rulle 3000 pixel op.

### Bunden af skærmen på en telefon

Der har været tre ting dernede, én ad gangen.

| Hvad | Højde | Hvorfor den gik |
| --- | --- | --- |
| Bjælke med fire genveje | 56 px | Grim, dækkede båden, to af de fire stod i menuen i forvejen |
| Bådstriben alene | 66 px | Samme plads som bestil-knappen skal have |
| **Bestil smørrebrød** | 56 px | Står der nu |

Der er kun rum til **én** ting i den nederste kant, og af båden og knappen er det
knappen der er til noget: båden er en rullemåler, knappen er forretningens
forretning. Den fylder linjen ud, så den kan rammes med en tomme uden at sigte,
og den findes på hver side undtagen bestillingssiden selv — dér er man fremme, og
formularen har sin egen klæbende kurvelinje i bunden.

**Båden bliver på en computer.** Dér ligger den i en kant hvor der ikke er andet,
og skærmen har pladsen. Knappen står i højre hjørne over striben; lagene er
båden 15, knappen 16, topmenuen 20, skuffen 25, introen 100, og
`tests/baad.spec.js` måler at knappen ligger over striben og ikke nede i vandet.

Knappen står i **HTML'en og ikke i JavaScript**. En knap til det forretningen
sælger, skal ikke afhænge af at alt andet gik godt.

De to ting bjælken var til for, **Ring** og **Find vej**, står øverst i
skuffemenuen som to knapper i fuld bredde, og under dem menupunkterne i Bebas
på op til 40 px. Der er ét kryds på 44 px, og luft nok til at man kan ramme
med en tomme uden at sigte.

### Skuffen er et bundark (21/8)

Den kom ned oppefra og dækkede hele skærmen. Designbundtet lægger den i
**bunden** som et ark, der glider op, og det er ikke smag:

1. **Tommelfingeren når den.** En telefon holdes i den nederste tredjedel. En
   menu, der starter i toppen, kræver at man flytter grebet om telefonen for
   at ramme det øverste punkt — og det punkt bliver trykket mindst på.
2. **Man kan se, hvor man var.** Arket dækker 88 % af højden, ikke det hele.
   Det er forskellen på "jeg åbnede en menu" og "jeg er landet et andet sted".
3. **Den lukker, hvor man trykker.** Et klik i det dæmpede område over arket
   lukker det — den gestus, alle kender fra telefonens egne ark. Krydset
   behøver man ikke ramme.

HTML'en er ikke rørt: de ti sider skulle ikke rettes hver især.

**Dæmperen lå først på `.ark::before` med `z-index: -1`.** Det så rigtigt ud i
koden og var forkert på skærmen: `.ark` har `position: fixed` og `z-index`,
altså sin egen stakkontekst, og inden i den males elementets **egen** baggrund
allerbagerst — før børn med negativ z-index. Dæmperen lagde sig oven på arkets
sandfarve og gjorde den grå. Man så det med det samme på et skærmbillede og
aldrig i koden.

Den kunne heller ikke flyttes bagom: `.ark` har `overflow-y: auto` og en
transform, og begge dele klipper et fixed pseudoelement, der stikker uden for
kassen. Den ligger nu på `body::after` under arkets `z-index: 25`.

**To vagter i `js/faelles.js` blev fjernet igen**, fordi de ikke kunne udløses
— fundet ved fejlindsprøjtning, ikke ved at læse:

- En undtagelse for burgeren i lukkelytteren. Dæmperen ligger på z-index 24 og
  topbjælken på 20, så burgeren er dækket, mens arket er åbent. Man kan ikke
  trykke på den.
- Testen af, at arket ikke lukker sig selv på det åbnende klik, bestod også
  **uden** vagten i koden: `lukArk` sætter først `hidden` efter 450 ms og
  tjekker klassen igen dér, og på det tidspunkt har `requestAnimationFrame`'et
  for længst sat den. To lag mod det samme.

Der står bevidst **ikke** "Bestil takeaway" nogen steder. Hele grillens kort kan
ikke forudbestilles — det er smørrebrødet der kan — og en knap der lover mere
end forretningen kan holde, giver skuffede kunder i telefonen.

To fælder i det ark, som begge kostede tid:

**Menupunkterne stod 75 px inde til højre.** `.ark-liste` er et `<nav>`, og der
lå en global regel `nav { margin-left: auto; display: flex }` skrevet til
topmenuen. Den fangede skuffen med. Reglen heder nu `#hd nav`.

**Det rettede så "Find os"-pillen i stykker.** `#hd nav a` vejer (1,0,2) og slog
`.glass` (0,1,0), så pillen fik hvid tekst på en lys glasflade: 2,03:1.
Selektoren er nu `#hd nav a:not(.glass)`.

**Og så slog den hele topmenuen ihjel.** Det var den værste af de tre, og den
levede længst. Topmenuen har to tilstande: hvid tekst oven på hero-fotoet, og
mørkeblå tekst når bjælken er blevet sandfarvet glas. Skiftet hed

```css
header.stuck nav a:not(.glass) { color: var(--sea); }   /* (0,2,3) */
```

og reglen der satte den hvide farve, havde lige fået et id:

```css
#hd nav a:not(.glass) { color: rgba(255,255,255,.88); } /* (1,1,3) */
```

Id'et vinder. Menupunkterne blev derfor hvide på en næsten hvid flade — **1,12:1
målt** — på hver side, hele vejen ned, og fra første sekund på undersiderne, hvor
bjælken er glas med det samme. Rettelsen er `#hd.stuck nav a:not(.glass)`, så de
to regler kan sammenlignes på samme grundlag.

Ingen så det i to runder, og grunden er værd at skrive ned: **menupunkterne er
skjulte på en telefon**, og telefonen er det man kigger på. Alle fem skærmbilleder
kunden har sendt, viser en burgermenu. `tests/kontrast.spec.js` måler nu
topmenuen i **begge** tilstande og på alle tre sider — det er den samme lære som
med båden, at en tilstand ingen kigger på, er den der går i stykker.

## Hvad der er fjernet, og hvorfor

Siden voksede, og noget af det den voksede med, sagde ingenting. Det står her,
så det ikke bliver fundet på igen.

Det meste af det er **den samme oplysning to gange**. Det er den slags der
opstår af sig selv: hver enkelt gentagelse blev skrevet af en god grund, og
ingen af dem ser forkert ud, når man kigger på den alene.

**Billedet i fuld bredde.** Et foto af trædækket med teksten "Trædækket på
Mosede Havn" hen over. Billedet fortalte hvad man kunne se på billedet, og det
kostede 108 kB. Hero-videoen viser stedet, og isfilmen ender i udsigten — der var
ikke et tredje sted at sige det. Fotoet ligger stadig i `billeder/`.

**Hele havnestriben.** Den mørkeblå bjælke lige under heroen. Først røg cellen
"Lige nu · Åbent til 21:00", som stod 200 pixel under åbent-pillen i hero og sagde
præcis det samme med præcis de samme ord. Tilbage var solnedgangen, som blev regnet
ud af havnens position, og vandtemperatur, vind og "dagens ret", som personalet
skulle skrive i hånden i admin.

De tre havde ingen kilde. Ingen ringer til DMI før lugen åbner, så de stod tomme og
skjulte sig selv — og en stribe hvor tre af fire felter er usynlige, er ikke en
stribe. Det er et sted hvor der plejede at stå noget. Solnedgangen var ægte, men en
hel bjælke tværs over siden for at oplyse ét klokkeslæt er ikke en byttehandel der
går op.

**De fyrre linjer solnedgangsalgoritme i `js/side.js` er slettet med den**, og de
tre felter i admin er væk. Kode uden en modtager er kode den næste skal læse og
finde ud af ikke bliver brugt, og en kontakt der ikke fører nogen steder, er værre
end ingen kontakt. Rækkerne kan stadig ligge i en database der er sat op før — de
bliver bare ikke læst.

**Halvdelen af smørrebrødssiden.** Der stod "Sådan gør du" med tre kort, så
"Smørrebrød fra kortet" med de fem priser, så "Vælg fyld" med alle 29 slags — og
nedenunder stod bestillingsformularen med præcis de samme fem priser og præcis de
samme 29 slags fyld, bare til at trykke på. Man skulle rulle gennem hele
sortimentet **to gange** for at nå det sted hvor man kunne bestille. Siden er nu
formularen, og de tre skridt er blevet én linje. `js/smoerrebroed.js` blev en
tredjedel så lang.

**"Der er ingen bestilling online endnu."** Stod i arrangement-afsnittet på
forsiden og holdt op med at være sandt den dag formularen kom. En sætning der er
forkert, er værre end ingen sætning.

**Bjælken i bunden på telefonen.** Fire faste genveje i 56 px, oven i bådstribens
66. Tilsammen 122 px af en iPhone-skærm på 844 — **14% af skærmen der aldrig
viste indhold**, hele vejen ned gennem siden. Kunden pegede på den tre gange, og
hver gang med ordet "grim". To af de fire genveje, Menu og Smørrebrød, stod
allerede i topmenuen og i skuffen; de to andre, Ring og Find vej, ligger nu
øverst i skuffen som knapper. `tests/telefon.spec.js` tjekker at `.mobilbar`
findes nul steder, at båden slutter i skærmens nederste kant, **og** at ring og
rute virkelig er at finde i skuffen — fjerner man en bjælke uden at flytte det
den kunne, har man taget noget fra gæsten.

**Trinnumrene i bestillingsformularen.** Tre store cirkler med 1, 2, 3. En
formular med fire felter behøver ikke et kort. Se afsnittet om bestillingen.

**Adressen det ene af de to steder den stod i "Find os".** Der stod
"Havnevej 20, 2670 Greve" i linjen under overskriften, og 80 pixel derfra stod
ADRESSE / Havnevej 20 / 2670 Greve i et kort. Telefonnummeret stod på samme måde
to gange i det samme kort: på knappen "Ring 28 87 13 43" og under et
TELEFON-mærkat lige ved siden af. Nu står adressen i kortet, som en adresse i tre
linjer, og nummeret på den knap man trykker på.

**De tre skridt over bestillingsformularen.** "Vælg og send · Vi ringer og
bekræfter · Du henter og betaler ved lugen". Alle tre stod allerede i sætningen
30 pixel længere op, og aftalen stod en tredje gang i et afsnitshoved 250 pixel
længere ned. Se afsnittet om bestillingen.

**"Åbent" det ene af de to gange det stod i pillen.** Menukortet og
bestillingssiden byggede etiketten som `overskrift + ' · ' + detalje`, altså
"Åbent nu · Åbent til kl. 21:00". Forsiden havde en forkortelse liggende i
`js/side.js` som de to andre sider ikke kunne se. Den står nu i `js/store.js`
som `Butik.pilleTekst`, og alle tre sider skriver "Åbent nu til 21:00" — én
linje, som også er det der skal til for at pillen og telefonnummeret kan stå på
samme række på en telefon.

**3200 pixel tomt sand på menukortet.** Det stod ikke i noget indhold, og det
kunne kun findes ved at måle. Se afsnittet nedenfor.

### De 3200 pixel: en regel der ramte noget den ikke var skrevet til

`js/menuside.js` tegner hver kategori på menukortet som `<section class="kat">`.
Arket har en regel:

```css
section { padding-block: clamp(64px, 9vw, 132px); }
```

Den er skrevet til **sidens** afsnit — hero, favoritter, isen, find os — hvor 132
pixel imellem er rigtigt. Men den ramte også hver kategori: 115 pixel over og
115 pixel under "Smørrebrød", over og under "Burgere", og så videre gennem alle
fjorten. Godt 3200 pixel tomt sand på ét menukort.

`.kat { margin-bottom: clamp(30px, 3.6vw, 52px) }` blev skrevet ovenpå det uden
at nogen så hvorfor der var så langt imellem — for der er jo ingenting at se.
Det blev fundet ved at måle afstandene i browseren: der stod 150 pixel mellem
genvejene og den første kategoris navn, og der var ikke noget dér.
`tests/menuside.spec.js` måler nu både polstringen og afstanden mellem to
kategorier.

**Den samme fejl to andre steder:** sidens hoved på undersiderne stod over sit
eget indhold med 132 pixel imellem, som om de var to afsnit. `.side-top +
section { padding-top: 0 }` binder dem sammen. Målt før og efter: den første vare
på menukortet stod 882 pixel nede i et vindue på 720 og står nu 749, og det
første stykke smørrebrød stod 1017 pixel nede og står nu 603 — altså med i det
første skærmbillede. `tests/bestilling.spec.js` måler det tal.

## Flere animationer, og hvorfor de var svære at se

Kunden skrev at der ikke var animationer på siden. Der var — de var bare så små
at ingen lagde mærke til dem. Det er blevet rettet på fem steder, og alle fem er
`transform` og `opacity`, som ikke koster et nyt layout:

| Hvor | Hvad |
|---|---|
| Heroen | Lander når introen slipper siden: kant, overskrift, tekst, knapper forskudt — og "Rul ned" sidst |
| Overskrifterne | Bogstaverne trækker sig sammen fra `.045em` til 0, og en streg tegner sig under dem. Samme detalje som over navnet i isfilmen |
| Kagefotoet | Skaleres fra 1,0 til 1,06 over otte sekunder mens det er i syne. Så langsomt at man ikke ser bevægelsen — man ser at billedet er levende |
| Dagens kugler | Pastillerne kommer ind én ad gangen. Tavlen skiftes hver morgen, og rækken skal se ud som noget der lige er skrevet op |
| Åbningstiderne | Ruller ned linje for linje. Det er den ene tabel man læser fra top til bund |

`tests/forside.spec.js` måler at bevægelsen **finder sted** — at værdien er
anderledes før og efter — og ikke at der står en transition i CSS'en. En
transition med varigheden 0, en delay der aldrig udløber eller en klasse der ikke
bliver sat, ville alle bestå en test der kun læste CSS.

Og der er en test på det modsatte: med `prefers-reduced-motion` skal alt fem stå
**stille og synligt**. Glemmer man én af dem i reduced-motion-blokken, står der et
tomt afsnit hos den gæst der har slået bevægelse fra — og det er den fejl man
aldrig selv støder på.

## Skallen: én indgang pr. ærinde

Ejerens bestilling er større end en hjemmeside — smørrebrød, borde, selskaber,
catering, baglokale, arrangementer — og fra august 2026 har hvert ærinde sin
egen indgang, som på spiis.dk, hvor man vælger sit ærinde i toppen:

- **Topmenuen** på alle sider: Menukort · Smørrebrød · Selskaber · Book bord ·
  Is og kager · Find os. "Smørrebrød ud af huset" blev til "Smørrebrød" —
  med Book bord i rækken nåede menuen ellers ud over kanten på 1280 px.
  `tests/skal.spec.js` måler nu, at menuen står på én linje.
- **Skuffemenuen** (telefonen) har alle ærinderne, nu også `nyheder/`.
- **Forsiden** har afsnittet *Hvad kan vi hjælpe med?* — seks **rækker**, ét
  pr. ærinde, med ikon til venstre og pil til højre. De var firkanter i et
  net indtil designbundtet: på en telefon kan seks rækker scannes med
  tommelfingeren nedad, mens seks kvadrater tvinger øjet frem og tilbage to
  ad gangen.
- **Fem nye sider**: `bord/` (ring, så finder vi ud af det — formularen kommer
  i fase 4), `catering/` og `baglokale/` (SEO-landingssider, der sender videre
  til formularen på `selskaber/` med typen i linket, så formularen kun findes
  ét sted), `arrangementer/` (viser kalenderens offentlige arrangementer —
  fase 3-databasen havde kunnet det hele tiden, nu er der en side), og
  `nyheder/` (samme historie: tabellen og admin-fanen har eksisteret siden
  fase 1, men gæsten kunne ikke se dem nogen steder).

Alle fire sider har titel, beskrivelse, canonical og JSON-LD som de gamle, og
`tests/seo.spec.js` måler dem på nøjagtig samme måde — listen SIDER dér og
`sitemap.xml` følges ad. Og de lover det samme som resten af siden: **intet
der ikke er bekræftet.** Ingen priser, ingen antal, ingen leveringsløfter —
`tests/skal.spec.js` slår ned på dem, der prøver.

`js/arrangementer.js` filtrerer selv på `offentlig`, selv om databasens
adgangsregel allerede gør det i produktionen: i øvetilstand uden database er
klientfilteret det eneste værn, og testen "et internt arrangement vises IKKE"
er bevist ved at fjerne filteret og se den fejle.

### Isen bestilles ikke — den fremvises

Kundens ord (23/8):

> "isen skal stå som en du ved flot fremvisning ting, de kan blære sig med,
> med udsigt og det hele nederst — men det skal man ikke kunne bestille,
> det er altid til rådighed"

Isafsnittet er derfor det eneste på forsiden **uden** en handling ud over et
link til isafdelingen på menukortet: overskriften *"Du kommer for isen. Du
bliver for udsigten."*, filmen der smelter ind i sandet til solnedgangen
toner frem, og dagens kugler fra tavlen.

Fraværet af en bestil-knap er ikke en mangel, der skal lukkes senere. Isen
laves i lugen, mens gæsten står der, og en formular til den ville love en
ventetid, der ikke findes. Det er håndhævet tre steder, så det ikke kan
snige sig ind igen:

1. `erIs()` i `js/store.js` filtrerer is-afdelingen ud af **alle** udvalg
2. Admins Menukort-fane har ingen "kan bestilles ud af huset"-flueben ved en
   is-kategori — der står en linje, der forklarer hvorfor
3. `tests/forside.spec.js` og `tests/fyld-model-a.spec.js` måler, at isen
   ikke kommer i listen, **heller ikke** når `bestilbare_kategorier`
   indeholder den

### Isen står på sandet, ikke i en kasse

Isfilmens første seks sekunder er hånden med isen på en lys sandbund — næsten
sidens egen farve, men kun næsten: bunden af billedet er `#e5d8c4` mod sidens
`#f7f0e4`, og forskellen tegnede en tydelig firkant om isen. Kundens ord:
*indtil baggrunden fader ind, skal der ikke være en baggrund dér, hvor isen
er.*

Løsningen er et lag over filmens kanter med sidens egen sandfarve, mest i
bunden hvor forskellen er målt størst, mindst i toppen hvor filmens egen tekst
står (`.film-ramme::after` + klassen `.smelter`). Ved 5,6 sekunder — målt på
filmens billeder, dér hvor havnen toner frem — tager `js/side.js` klassen af,
og rammen står frem sammen med sin solnedgang: afrundede hjørner og skygge
toner ind over det samme sekund som filmens egen overtoning. Plakat, pause og
afspil-knap får altid den fulde ramme — en feathret solnedgang ser forkert ud.

Samtidig blev en rigtig fejl fundet: `preload="none"` blev stående på
videoelementet efter `load()`, så browseren kun hentede metadata, til der blev
kaldt `play()`. Forspringet på 900 px hentede altså INGENTING, og filmen
begyndte med tom buffer — det er den hakken, der blev set på en telefon.
`js/side.js` sætter nu `preload = 'auto'` i samme øjeblik, kilderne lægges på:
når vi selv har besluttet at hente, skal der hentes.

## Bordbestillingen: gæsten spørger, personalet bekræfter

Fase 4, og den første af faserne oven på kalenderen. Formen er den samme som
smørrebrødet og forespørgslerne — gæsten skriver, personalet ser det, status
går én vej — men tre beslutninger er værd at kende:

**Ja'et gives ét sted, og det er sådan dobbeltbookinger undgås.** En sendt
formular er et ØNSKE (tabellen `bordbestillinger`, reference BO), ikke et
bord. Kun personalet bekræfter, og på Borde-fanen står dagens billede øverst:
hvor mange pladser er der allerede sagt ja til pr. dag, målt mod pladstallet,
som personalet selv sætter på fanen. Linjen bliver rød, når ja'erne når
loftet. Databasen håndhæver med vilje IKKE kapaciteten — et ønske koster
ingenting at tage imod, og den, der siger ja, kan se, hvad hun har sagt ja
til. Gæstens kvittering siger det med store bogstaver: bordet er IKKE
bekræftet, før vi har ringet.

**Kalenderen bestemmer, hvad der kan vælges.** Lukkedage kan ikke vælges, og
en tidlig lukning skærer aftenens tider af. Varslet er to timer (mod
smørrebrødets 24 — et bord til i aften er hele pointen), og kan flyttes med
indstillingen `bord_varsel_timer`. Dato, klokkeslæt og antal er PÅKRÆVEDE,
hvor forespørgslerne har dem frivillige: et bord ER en dato, et klokkeslæt og
et antal stole. Over 100 personer sendes til selskabssiden — det er ikke et
bord, det er et selskab.

**Og en rigtig fejl blev fundet undervejs:** smørrebrødsformularen kendte
IKKE til tidlige lukninger — forsiden vidste, at lugen lukkede 15, mens
formularen solgte afhentning kl. 19. Reglen er nu i begge formularer og målt
i `tests/bord.spec.js`, bevist ved at fjerne den og se testene fejle.

Databasens regler er de samme som altid — gæsten må skrive men ikke læse,
status 'ny' og tom intern note ved oprettelse, dobbelttryk stoppes af en unik
nøgle på (telefon, dato, tid), og bremsen siger 3 pr. nummer i døgnet og 20
pr. time. `supabase/proev-borde.sql` beviser det hele med **26 prøver** —
kørt i Mosede-projektet den 19. august 2026 med **ALLE 26 AF 26 BESTOD**, og
prøven er selv prøvet: et læsehul og en fjernet bremse blev begge fanget.

## Bordet BOOKES, det spørges der ikke om

Kunden har sagt det fire gange. Fjerde gang, 23/8, var utålmodig og
tydelig:

> "og spørgs om bordet — altså hvad man skal kunne BESTILLE bord,
> ikke SPØRGE. Det er det, jeg har prøvet at sige 100 gange. Fix u"

Maskineriet var der hele tiden: tabellen `bordbestillinger`,
adgangsreglerne, bremsen og fanen i admin (fase 4,
`supabase/borde.sql`). **Det, der var forkert, var hver eneste
sætning omkring det.** Siden hed "Vil I være sikre på en plads?",
knappen hed "Spørg om bordet", og kvitteringen sagde med store
bogstaver, at bordet **IKKE** var bekræftet.

Det er den samme beslutning som på bestillingerne, og den er
kundens: gæsten booker, og kan forretningen mod forventning ikke
skaffe bordet, er det **dem**, der ringer. Personalet har navn og
nummer til netop det.

| | Før | Nu |
|---|---|---|
| Overskrift | "Vil I være sikre på en plads?" | "Book et bord ved vandet" |
| Knap | "Spørg om bordet" | "Book bordet" |
| Kvittering | "Bordet er IKKE bekræftet — vent på opkaldet" | "Vi ses lørdag 8. august kl. 18.00" |
| Admins Bekræft | "Husk at ringe — gæsten venter på opkaldet" | "Jeres eget hak for, at I har set den" |
| Admins Afvis | "Husk at ringe" | "**RING TIL** 20 30 40 50 — gæsten regner med bordet" |

**Opkaldet flyttede fra ja'et til nej'et.** Det er hele pointen: før
skulle personalet ringe for at bekræfte noget, gæsten ikke turde
regne med. Nu regner hun med det — og så er det afslaget, der ikke
må blive siddende i en skærm, ingen kigger på. Derfor står nummeret
i afvis-dialogen, og derfor siger kvitteringen også, hvordan gæsten
selv kommer af med bordet igen: *"Bliver I forhindret, så ring — så
giver vi bordet videre."* Et løfte uden en udgang er et bord, ingen
tør booke.

**Baglokalet er stadig en forespørgsel, og det er med vilje.** Pris,
timer og hvor mange der kan være, er ikke bekræftet af ejeren — dér
ER der noget at snakke om. Se listen "Ejeren skal bekræfte".

**Ordet "bordønske" er væk i hele systemet** — i skraldespanden, i
logbogen, i Overblik og i push-teksten. Et system, hvor gæstesiden
siger "booket" og personalesiden siger "ønske", er to systemer.

## Baglokalet: som bordene, men ét ja optager hele dagen

Fase 5, og den er med vilje en lille variation af fase 4 — samme skelet,
samme kvittering, samme bremse-tankegang. Én ting er anderledes, og den er
hele fasens grund: **lokalet er ET lokale.**

**Ja'et håndhæves af databasen selv.** Et delvist unikt indeks
(`udlejning_dagen_er_taget`) tillader kun én BEKRÆFTET udlejning pr. dag pr.
forretning. Ti må gerne spørge om den samme lørdag; kun én kan få ja, og et
nej frigiver dagen igen. Det er et indeks og ikke en regel i admin-koden,
fordi to medarbejdere på hver sin iPad kan trykke ja samtidig — og så er
JavaScript for sent på den. Ved bordene er kapaciteten med vilje blød
(pladstallet er personalets redskab og ændrer sig); lokalet er hårdt, for
"ét lokale" ændrer sig ikke. Øvetilstanden spejler reglen, ellers var
øvelsen ikke en øvelse — og admin-fanen viser advarslen PÅ kortet, før der
trykkes: en advarsel efter et opkald til gæsten er en pinlig samtale for
sent.

**Datoen er påkrævet, og "engang" sendes til forespørgslen.** Lokalet lejes
pr. dag. Ved gæsten ikke datoen endnu, står linket til selskabssidens
forespørgsel øverst i formularen — den må gerne være uden dato. De to
indgange mødes i admin: lokalets kalender på Baglokale-fanen viser både
udlejningerne OG de baglokale-forespørgsler, der har en dato, så ja'et
altid gives med hele billedet foran sig.

**Resten er som de andre**: gæsten må skrive men ikke læse, reference BL,
dobbelttryk stoppes af unik nøgle på (telefon, dato), bremse 2 pr. nummer i
døgnet og 10 pr. time — man lejer ét lokale til én fest.
`supabase/proev-udlejning.sql` beviser det med **27 prøver**, hvor 22-25 er
fasens egne: flere må spørge om en taget dag, nummer to kan ikke få ja, et
nej frigiver dagen. Kørt i Mosede-projektet den 19. august 2026 med **ALLE
27 AF 27 BESTOD** — og prøven er selv prøvet: uden indekset fælder prøve 23
kørslen.

### Fanen er et forløb, ikke tre lister (28/8)

Kunden sendte fire skærmbilleder af en færdig udlejningsside: *"det er godt
begrundet af det holder styr på det hele … hele fanen skal være dygtig og
intelligent og gerne bedre end hvad du ser på de billeder."* Formen er lånt,
farverne er havnens, og der er **ikke en linje SQL** i den.

Fanen havde tre kasser — Venter på svar, I hus, Færdige — og det er tre
steder at kigge for et lokale, der lejes ud nogle gange om måneden. Den, der
har travlt, kigger i den øverste. Nu er den fem kort med hvert sit spørgsmål:

| Kort | Svarer på |
|---|---|
| **Se på det her først** | Hvad går galt af sig selv, hvis ingen gør noget? |
| **Baglokalet** | Hvor langt er sagerne? (tre tal + forløbets fire trin) |
| **Ledige dage** | Har vi lokalet den 12.? |
| **Sager** | Hvad skal jeg lave nu? ÉN liste, det hastende øverst |
| **Vilkår** | Hvad koster det — og hvad står der på hjemmesiden? |

**⚠️ Et "aftalt" ja er ikke et låst ja.** Det er fanens vigtigste nye
oplysning, og den var usynlig før. Indekset `udlejning_dagen_er_taget`
tæller kun UDLEJNINGER. En forespørgsel sat til `aftalt` ser ud som et ja på
skærmen — men så længe der ikke står en udlejning bag den, kan en gæst på
hjemmesiden stadig tage dagen, og ingen ville opdage det, før nummer to
ringede. Derfor har hver sag et felt `laast`, derfor har **trin 3** sit eget
røde tal, derfor står dagen **stiplet** i nettet i stedet for som lejet ud,
og derfor hedder knappen **Lås dagen** — den opretter den manglende
udlejning. Prøven er set fejle: sættes `laast` til `f.status === 'aftalt'`,
falder tre prøver.

**"Ældst først" var ikke godt nok.** Køen var sorteret efter, hvornår folk
skrev, og det lyder retfærdigt. Men en fest på LØRDAG er noget andet end en
til maj, også selv om maj-manden skrev først: den ene skal have svar i dag,
den anden kan vente til på tirsdag. `haster()` giver trin og ikke point:

| Trin | Betyder |
|---|---|
| 0 | Venter svar, og festen er inden for en uge |
| 5 | Sagt ja, men dagen er ikke låst |
| 10 | Venter svar og har ventet over fristen |
| 20 | Venter svar |
| 50 | I hus, og dagen er låst |
| 90 | Færdigt |

**5 er med vilje højt oppe:** det tager to klik at lukke hullet, og hullet er
en dobbeltbooking på vej.

**Kortet øverst findes KUN, når der er noget.** En fast boks, der som regel
siger "alt er fint", bliver til udsmykning på en uge — og så ses den heller
ikke den dag, den siger noget. Seks ting kan stå i den, og alle seks regnes
ud af data, vi har: nogen har ventet over fristen, en aftale er ikke låst, to
vil have den samme dag, flere personer end lokalet kan rumme, en udlejning på
en dag hvor cafeen er lukket, og det der sker i den kommende uge. **Ingen af
dem kan kvitteres for** — en påmindelse, der kan slås fra, bliver slået fra
af den, der har travlt, og så står den på gjort, mens hullet er der endnu.

**Det er et TAL, ikke en dom.** Forlægget havde en dagstilstand, der hed
*"travl i cafeen"*, og der findes ikke noget mål for travlhed i systemet — vi
ved ikke, hvor mange gæster der skal til, før en lørdag er hård. Antallet af
**bordbestilte pladser** samme dag ved vi derimod, og det er den oplysning,
der faktisk skal bruges: mad til 40 i baglokalet OG servering for 12 i cafeen
er et bemandingsspørgsmål. Afviste og udeblevne borde tæller ikke med.

**Lukkedagen skal spørges to steder.** `Butik.lukketDen` (kalenderens rækker,
som også dækker en hel vinterlukning) og `Butik.dagenHeltLukket`
(dagsreglerne). Spurgte vi kun det ene, ville en almindelig lukkedag stå som
åben, og advarslen "cafeen er lukket, og nogen har lokalet" ville aldrig
komme.

**⚠️ Skriv aldrig ⚠️ foran en `.fejl`.** Klassen har sit eget
`::before { content: "⚠ " }` i `css/style.css`, og linjen kom på skærmen som
"⚠ ⚠️ Dagen er ikke låst". Det lignede en fejl i systemet, ikke en advarsel
om noget. **Fundet med øjnene på et skud** — ingen prøve læser et tegn foran
en sætning.

### Vilkårene er ejerens tal, ikke designets (28/8)

`h-baglokale.html` blev leveret med designets pladsholdere: 40 siddende, 60
stående, 1.200 kr. for en aften, 2.000 for hele dagen, gratis fra 20
kuverter. De har stået i luften siden 23/8, fordi Mikkel bad om det — men
**indtil nu kunne de kun rettes ved at redigere HTML**, og det kan en cafe
ikke.

Vilkår-kortet på Baglokale-fanen er de otte felter, og der er **ingen SQL** i
dem: `indstillinger` er nøgle/værdi.

| Nøgle | Hvad den styrer |
|---|---|
| `lokale_pladser` | "N siddende gæster" på siden — OG advarslen om for mange |
| `lokale_staaende` | "N stående" |
| `lokale_pris_aften` | "N kr. for en aften" |
| `lokale_pris_dag` | "N kr. for hele dagen" |
| `lokale_gratis_fra` | "Gratis fra N kuverter mad" |
| `lokale_depositum` | Tilføjer "Depositum N kr." til linjen |
| `lokale_vilkaar` | Fritekst: hvad er med i prisen |
| `lokale_svarfrist_dage` | Kun i admin: hvornår fanen råber op (2 som standard) |

**Felterne er tomme, til ejeren skriver i dem, og der står ingen foreslåede
tal** — heller ikke designets. Et tal, vi selv fandt på, ser ud som noget,
forretningen har sagt.

**⚠️ Tallet byttes DÉR, hvor det står.** Hvert tal er pakket i sit eget
`<span data-vilk="…">`, og `js/skal/forespoergsel.js` skifter kun indholdet
ud. Byggede vi hele sætningen om i JavaScript, skulle designets egne tal stå
i koden som reserve — og så var der to steder, den samme pladsholder skulle
rettes. Reserven er den tekst, der allerede står i filen, og **et tomt felt
lader linjen stå**: har ejeren kun rettet siddepladserne, bliver "60 stående"
stående, så en halv udfyldning aldrig sletter noget.

Depositum og "hvad er med i prisen" har ingen plads i designet og står derfor
i et skjult felt, der først tændes, når ejeren skriver noget — at tilføje en
linje, der altid er der, ville være at lave om på skallen.

## Model A: fyldet er varen

Kunden så fejlen med det samme: gæsten valgte et ANTAL stykker ét sted og
krydsede fyld af i en løsrevet liste. "8 stykker + 12 slags fyld" fortæller
ikke køkkenet, hvad der skal smøres. Aftalt august 2026: **hvert fyld er en
vare med sin egen pris**, og gæsten tæller op — 2 × rejemad, 3 ×
leverpostej.

**Den fælde, ombygningen stod og faldt med:** skellet mellem stykker og fyld
gik på PRISEN — har varen en pris, er det et stykke. Det holdt, så længe
fyldet var gratis tilbehør, men i det øjeblik de 29 fyld får priser, ville
alle 29 blive til stykker, og forsiden ville love 34 slags smørrebrød i
stedet for 5. Skellet går nu på **kategorien**, som er det stabile signal:
"Vælg fyld til smørrebrødet" er fyld, uanset hvad der står i priskolonnen.
`tests/fyld-model-a.spec.js` giver fyldet priser og måler, at tallene står
stille — bevist ved at sætte det gamle pris-skel tilbage og se prøven vise 3
i stedet for 1.

**Reglen går begge veje, og det er derfor siden kunne udgives før mødet med
ejeren:** kan vi prissætte det, kan det bestilles — kan vi ikke, kan det
ønskes. Fyld uden pris bliver i ønskefolden præcis som før; er der kun
stykkerne tilbage, står listen flad, for én gruppe er ingen gruppe. Intet
ændrer sig for gæsterne, før tallene er skrevet ind.

**Udvalget foldes gruppe for gruppe** som hos spiis: den første gruppe åben,
resten med "+ tilføj". En lukket gruppe viser, hvor meget der ligger i den
("3 valgt") — ellers ville gæstens egen kurv være skjult bag en fold, og så
tæller hun forfra. Rækkefølgen er fast (stykkerne først, "Andet godt"
sidst), ikke den rækkefølge varerne tilfældigvis står i.

**Ejerens tal skrives ét sted.** Menukort-fanen har fået "Sæt samme pris på
alle" ved fyldkategorien: ét felt, ét tryk, 29 priser — og så rettes de få,
der skiller sig ud, enkeltvis. Feltet står tomt uden foreslået pris: en
pris, forretningen ikke har givet os, må ikke stå på siden. Linjen ovenover
siger, hvor mange der mangler, så ingen tror, at siden er i stykker.

To fejl blev fundet undervejs, begge af prøverne og skærmbillederne:
gruppehovedets tal fulgte ikke tælleren (så en lukket gruppe sagde "+
tilføj" med tre stykker i), og "Rejemad" faldt i "Andet godt", fordi
ordlisten kun kendte "rejer".

### Hvad kan bestilles ud af huset?

Smørrebrødet altid — det er dét, `bestil/` er bygget om. Resten af kortet
kun, hvis personalet sætter fluebenet ved kategorien på Menukort-fanen
(`bestilbare_kategorier` i indstillinger, ingen ny tabel), og de vises på
**forsiden**. Den dag køkkenet kan nå at lave pølser ud af huset, er det ét
tryk — ikke en ny side, ikke en udgivelse. Og lige så vigtigt den anden vej:
er fluebenet ikke sat, står der ikke ét ord om det på gæstesiden.
`Butik.udvalg(d, hvad)` samler det hele, og en åbnet kategori bliver sin
egen fold med **kategoriens eget navn fra menukortet** — ingen har fundet på
et ord til den.

**Isen er undtagelsen, og den har ikke engang et flueben.** Kundens ord
(23/8): *"det skal man ikke kunne bestille, det er altid til rådighed."* Den
laves i lugen, mens gæsten står der. Filteret ligger i `erIs()` i
`js/store.js`, altså på gæstesiden — så en gammel indstilling eller en hånd
i databasen heller ikke kan åbne den. Og fluebenet i admin er erstattet af
en linje, der forklarer hvorfor: et flueben, der ikke gør noget, er værre
end ingen, for så sætter personalet det og leder bagefter efter fejlen på en
side, der gør præcis det, den skal.

`tests/fyld-model-a.spec.js` måler, at øllen IKKE kan bestilles, før nogen
har sagt ja — og at isen ikke kan, heller ikke når nogen HAR sagt ja.

### Spis her eller tag med

Spiis lader gæsten vælge, og forskellen er ikke kosmetisk: den ene skal
pakkes i en pose, den anden skal stå på et bord med bestik. Derfor er det en
**kolonne** (`hvordan` på bestillinger, `supabase/spis-her.sql`) og ikke et
ord i fritekstfeltet — en besked, køkkenet skal læse sig til midt i en
frokost, er en bestilling, der bliver pakket forkert. Admin viser det som et
mærke på kortet; afhentning får intet mærke, for et mærke på hver eneste
bestilling betyder ingenting.

Standarden er `afhentning`: det er den eneste form, siden har kunnet indtil
nu, så standarden er ikke et gæt. **Om det overhovedet kan vælges, er
ejerens beslutning** og står som flueben på Bestillinger-fanen. Er den ikke
sat, spørger formularen ikke.

`supabase/proev-spis-her.sql` beviser det med 4 prøver — ALLE 4 BESTOD
lokalt. Prøve 4 fejlede først, og det var prøvens egen fejl: den læste
rækken tilbage som gæst, og gæsten må jo netop ikke læse bestillinger. Den
skifter nu rolle først, og noten står i filen.

## Læren fra spiis: frister, udsolgt og køkkenskærms-løftet

Kunden sendte elleve skærmbilleder af spiis.dk (august 2026) og bad om en
analyse — samme skelet, havnens eget udtryk. Fire ting derfra er bygget ind
med det samme; resten (fyld-ombygningen) venter på ejerens svar:

- **Fristerne under åbningstiderne.** Spiis skriver "Bestil til i dag: frem
  til kl. 18.40" — den ene linje, en gæst med aftensmadplaner leder efter.
  Vores står nu under tiderne på forsiden og er AFLEDT, aldrig skrevet i
  hånden: bordets frist er sidste bordtid (en halv time før luk, også en
  TIDLIG lukning fra kalenderen) minus varslet — samme regnestykke som
  formularen på bord/. En frist, der er overskredet, forsvinder: et løfte,
  siden ikke kan holde, skal ikke stå der. `tests/spiis-laere.spec.js`
  regner efter fra den anden side.
- **Udsolgt vises, ikke skjules.** En vare, der forsvinder, ligner en vare,
  der ikke findes. Udsolgte stykker og fyld står nu gennemstreget med
  "udsolgt i dag" — og forsidens fyld-tal tæller stadig kun det bestilbare,
  for tallet lover, hvad man kan FÅ.
- **Køkkenskærms-løftet.** Under alle fire formularer står der nu, at ønsket
  lander på køkkenets skærm i samme sekund, man sender — og det er sandt:
  den direkte forbindelse gør det. Spiis skriver det samme under deres
  tapas-knap, og det er den sætning, der gør en formular tryg.
- **Allergi-invitationen.** "Allergi? Ring, så hjælper vi gerne" — lover en
  samtale, ikke en varedeklaration, og en samtale kan forretningen altid
  holde.

Én af de nye linjer gentog "ringer og bekræfter", og den eksisterende test,
der tæller, at aftalen kun står ét sted, fældede den med det samme. Testene
passer på hinanden.

## Glowuppet: knapper der svarer, og en sidemenu der er et panel

August 2026 fik siden en gennemgang, der KUN handler om udseendet — Lesregs
eget mærke er iOS-inspireret glas og øjeblikkelig respons. Reglerne er de
samme som altid, så det er hurtigt fortalt:

- **Al ny bevægelse er bundet til `body:not(.personale)`.** Gæsten skal
  mærkes velkommen; personalet skal nå at ekspedere en kø. Admin fik i
  stedet det stille løft: hvide paneler, blødere hjørner, ikoner i
  sidemenuen — ingen animation.
- **Glasset i knapperne er en gradient, ikke `backdrop-filter`.** Sløring
  uden et foto bagved har før kostet 25 billeder i sekundet (se afsnittet om
  isfilmen). `background-color` er urørt, for kontrasten på knapteksten
  måles mod den i `tests/kontrast.spec.js`.
- **Trykket trækker sig sammen på 60 ms og slipper på 180.** Fingeren skal
  have svar i samme øjeblik den rammer — det er dét, der føles "instant".
  Af samme grund: `-webkit-tap-highlight-color: transparent` (WebKits grå
  blink kommer FØR vores egen reaktion og ligner en fejl) og
  `touch-action: manipulation` (fjerner ventetiden på et dobbelttryk).
- **Valg nikker.** `.dag`, `.type-knap` og `.fyld-valg` hopper 4,5 % når de
  vælges — farveskiftet alene kan overses i solskin på havnen. Kvitteringen
  lander blidt (`tak-ind`) i det ene øjeblik, gæsten er mest i tvivl om,
  hvad der lige er sket.
- **Alt nyt står i reduced-motion-blokkene.** Samme regel som resten af
  arket: bevægelse er en tilføjelse, aldrig en betingelse.

To fejl blev fundet på skærmbilleder undervejs, ikke i koden: den tredje
typeknap på `selskaber/` lå halvt uden for en telefonskærm (typevælgeren
ombryder nu i stedet for at rulle), og fold-pilen viste både et plus OG en
pil, fordi CSS tegnede en vinkel mens JavaScript satte tekst i samme span.
Sidemenuens kaskadefælde — basisreglen der stod EFTER media-blokken og
gjorde rækkerne grå — har fået sin egen test i `tests/admin.spec.js`.

### Anden runde: knapperne var stadig generiske

Kunden, 22. august: *"knapperne er ikke gode nok, de er generiske, generelt
alle steder."* Tre ting var galt, og alle tre kunne rettes ét sted:

- **Vægten.** Knapperne stod med brødtekstens egen vægt. En knap med samme
  vægt som teksten omkring den ER brødtekst med en flade om — det er dét,
  der får den til at ligne en standardknap fra et hvilket som helst
  framework. En handling skal veje mere end det, der står omkring den. 600
  nu, på både `.glass` og `.knap`
- **Linsekanten sad kun på `.on-dark`.** Det var en halv beslutning: en hvid
  pille på sand har præcis det samme problem som en mørk pille på et foto —
  kanten forsvinder, og så er der ingen genstand, kun en lysere plet.
  Ringen (`inset 0 0 0 1px`) er dét, der siger "her er en flade", og den
  koster ingenting
- **To knapfamilier så forskellige ud.** `.knap` og `.glass` stod side om
  side på forsiden ("Se hele menukortet" er den ene, "Find os" den anden),
  og den ene var tung mens den anden var let. To familier på samme side
  ligner to systemer. `.knap` har nu samme vægt, samme lyskant, samme løft
  ved hover og samme sammentrækning ved tryk

`.glass.stor` er **væk**. Den fandtes til heroens to knapper, og dem bad
kunden om at få fjernet. En størrelse, der ikke bruges, dukker før eller
siden op et tilfældigt sted, og så er den ikke længere "den store" — så er
den bare en knap, der er større end de andre. `tests/bestil-doeren.spec.js`
slår ned, hvis den kommer igen.

## Bestilling af smørrebrød

På `smoerrebroed-ud-af-huset/` ligger den eneste formular på hele hjemmesiden,
og den eneste ting en gæst skriver i databasen. Koden er `js/bestilling.js`,
tabellen er `bestillinger` i `supabase/setup.sql`, og personalets side er fanen
**Bestillinger** i admin.

### Sidens hoved: det ene sted med en mørk flade

Siden lignede de andre undersider — sandfarvet, et mærkat, en overskrift, en linje
tekst. Menukortet ser sådan ud, fordi menukortet er en liste man slår op i. Den her
side er den ene ting man kan **handle** på, og så må den se ud som om den ved det.

Hovedet er derfor havnens mørkeblå i fuld bredde, og det er den eneste side på
hjemmesiden med det. Det er hele pointen: kommer man hertil fra forsiden, kan man
se at man er landet et andet sted.

**De to tal er talt, ikke skrevet.** "5 slags stykker · 29 slags fyld" kommer fra
menukortet gennem `Butik.smoerrebroed`. Sætter personalet en slags udsolgt, falder
tallet af sig selv, og der kan ikke komme til at stå "29 slags" den dag der er 27.
Det er også dem der fanger: "stort udvalg" er en påstand man ikke kan efterprøve,
29 er et tal. Blokken er `hidden` indtil der **er** tal — et "0 slags" i det halve
sekund databasen svarer i, er værre end ingenting.

Tre ting kostede tid:

**`--muted` kan ikke bruges på mørkeblå.** Den farve er valgt til at kunne læses mod
sand (4,68:1 der) og vender forkert mod `#0f2c44`. Hver tekst i hovedet har fået sin
egen lyse værdi, og de måles alle i `tests/kontrast.spec.js`.

**`header { position: fixed }` er en bar elementregel.** Det nye sidehoved er også et
`<header>`, så det blev fastgjort oven på siden. Personalesidens topbjælke slap kun
fordi `.top` sætter `position: sticky` og vejer mere (0,1,0 mod 0,0,1) — det er ikke
en løsning, det er et held med rækkefølgen. Alle syv regler er nu bundet til `#hd`.
Præcis samme fælde som den globale `nav`-regel der højrestillede skuffemenuens
liste 75 px inde: **en bar elementvælger til noget der findes ét sted, rammer også
det der bliver bygget næste gang.**

**Første udgave fyldte hele det første skærmbillede** — målt stod det første stykke
smørrebrød 772 px nede i et vindue på 720. Det er præcis den fejl siden lige var
kommet ud af, og et flot hoved er ikke værd at bytte den for. Begge krav holdes:
hovedet blev ikke svagere, det blev tættere (tallene 64 px i stedet for 82, mindre
luft), og der står 684 px nu. Der lå også en sandfarvet strimmel mellem topbjælken
og den mørke flade — 12 px på en telefon, 32 på en computer — som er væk ved at
trække feltet op i body'ens polstring med `--topbjaelke`, ét tal to steder læser.

### Én liste, og resten kommer efter behov

Formularen var bygget som tre nummererede trin, alle udfoldet på én gang: fem
stykker, 29 slags fyld i seks grupper, en dagvælger, en tidsvælger, navn,
telefon, e-mail, besked. Alt stod fremme fra første sekund. Kunden skrev
"alt for overkompliceret og uoverskueligt", og det var rigtigt: man landede på
en side og skulle overskue **44 valg** for at bestille to stykker smørrebrød.

Den er nu skruet sammen som spiis: **listen ER siden.** Man lander på fem stykker
med et navn, en beskrivelse, en pris og en tæller. Ikke andet.

Resten kommer først når den betyder noget:

| Hvad | Kommer frem når |
| --- | --- |
| Fyld (29 slags, seks grupper) | man selv trykker "Vælg fyld" — feltet er frivilligt |
| Hentetid og kontaktoplysninger | der er noget i kurven |
| E-mail og "andet vi skal vide" | man selv trykker "Allergier, e-mail eller andet" |

De to sammenfoldede blokke er `<button aria-expanded>` plus `hidden` på kroppen,
ikke `max-height: 0`. Det er ikke pedanteri: et felt med højde nul kan stadig
tage tabfokus, så en tastaturbruger skriver i noget der ikke er på skærmen.
`hidden` findes ikke for en skærmlæser overhovedet. Den lukkede fyld-blok siger
til gengæld **hvor mange man har valgt** ("3 valgt"), for ellers skulle man åbne
den for at se om man havde husket det.

Kurvelinjen i bunden er en **knap**, ikke en plade med tekst: den siger hvad man
har valgt og fører videre ned til resten. Og den forsvinder når "Send
bestillingen" kommer i syne — `IntersectionObserver` med
`rootMargin: '0px 0px -20% 0px'` — for en klæbende bjælke oven på den knap man
skal trykke på, er ikke en hjælp.

**Send-knappen sad først i den klæbende bjælke.** Det var forkert af to grunde.
Den dækkede telefonfeltet mens man skrev i det, og på en telefon lægger
tastaturet sig oven på bundens 76 px, så knappen ville stå bag tastaturet i det
sekund man var færdig med at udfylde. Første forsøg var at skjule bjælken ved
`focusin` — så kunne Playwright ikke finde knappen at trykke på, hvilket er
præcis den fejl en gæst også ville ramme. Send står nu **sidst i formularen**,
hvor den hører til, i fuld bredde og 54 px høj.

En valgt linje **løftes til hvid** i stedet for at få en blå tone. Tonen var
`rgba(127, 174, 214, .10)`, og den sænkede luminansen nok til at beskrivelsen
faldt fra 4,68:1 til 4,38 — under kravet. Det var altså de linjer man havde
valgt, der blev de sværeste at læse. Hvid måler 5,30:1 og løfter samtidig linjen
ud af listen.

**Formularen er 720 pixel bred, ikke hele skærmen.** På 1280 stod
"Flæskestegssandwich" i venstre kant, prisen 1030 pixel derude og tælleren yderst
til højre: en halv meter tomt sand mellem varen og hvad den kostede. En
takeaway-kurv er en liste man løber ned igennem, ikke et regneark.

### Man skal kunne se smørrebrødet når man lander

Det kunne man ikke. Det første stykke stod **1017 pixel nede i et vindue på 720**
og 891 nede på en telefon på 664 — halvanden skærm forbi. Man landede altså på en
bestillingsside uden at se noget der kunne bestilles, og det var hele grunden til
at siden føltes uoverskuelig, selv efter foldene var kommet.

Fire ting lå i vejen, og ingen af dem var indhold:

| Hvad | Hvor meget |
| --- | --- |
| Aftalen skrevet tre gange (linjen, tre nummererede skridt, et afsnitshoved) | ~120 px |
| En `h2` "Vælg dit smørrebrød" over sidens egen `h1` om det samme | ~150 px |
| `h1` i hero-størrelse, 104 px over to linjer | ~48 px |
| 132 px sektionsluft mellem sidens hoved og dens eneste indhold | 132 px |

Nu står det første stykke 603 pixel nede på en computer og 541 på en telefon —
med i det første skærmbillede på begge. Tallet er en test, ikke et skøn:
`tests/bestilling.spec.js` måler afstanden mod vindueshøjden ved hver kørsel, og
`.side-top .side-under` skal indeholde både opringningen og betalingen, **og kun
indeholde dem én gang**.

### Det er en bestilling, ikke en webshop

Der betales ikke på siden. Det er ikke en mangel — det er det ærlige.
Forretningen har ikke oplyst hvordan man betaler på forhånd, om der leveres,
hvor lang tid i forvejen der skal bestilles, eller om der er et mindsteantal.

Gæsten sender derfor hvad hun gerne vil have og hvornår, og forretningen ringer
og bekræfter. Det er den samme aftale som før, bare uden at nogen skal fange
nogen i telefonen midt i en frokost. Betaling ved afhentning — kontant, kort og
MobilePay, som står på siden i forvejen.

Det står i overskriftens brødtekst, ikke i småt nederst, og
`tests/bestilling.spec.js` holder øje med at det bliver ved med at gøre det —
inklusive at ordene "betal nu", "kortbetaling" og "betal online" **ikke**
optræder nogen steder i afsnittet.

### To slags valg, fordi kortet er skruet sådan sammen

Kategorien **Smørrebrød** har fem slags med pris: håndmad 24, smørrebrød 55,
rejemad 75, tartar 95, æbleflæsk 75. Kategorien **Vælg fyld til smørrebrødet**
har 29 slags uden pris — for et fyld er ikke en vare man køber, det er hvad der
skal ligge på stykket.

Derfor er der to kolonner i databasen: `linjer` er stykkerne med antal og pris,
`fyld` er ønskerne. Havde de ligget i samme kurv, ville fire stykker med tre
slags fyld være blevet **syv stykker**, og personalet ville pakke forkert. Der
er en test på netop det.

### Man kan ikke vælge en dag der ikke findes

Der er ingen fri datovælger. Dagene regnes ud af åbningstiderne, lukkedagene og
varslet, så en gæst ikke kan bestille til juleaften kl. 7. Tiderne går i halve
timer og slutter en halv time før der lukkes, så der er tid til at række posen
ud af lugen. På den første mulige dag klipper varslet tiderne: er uret 13.00 og
varslet 24 timer, kan man tidligst hente i morgen kl. 13 — ikke kl. 11, selv om
der åbner kl. 11.

**Varslet og mindsteantallet er ikke oplysninger vi har fået.** De står i
`indstillinger` som 24 timer og 1 stk., fordi formularen skal have et tal for at
kunne regne en tidligste dag ud. Ejeren retter dem i admin, og teksten på siden
følger med af sig selv. Der er også en kontakt der lukker for bestillinger helt,
til de uger hvor køkkenet ikke kan følge med.

### Gæsten må skrive, men ikke læse

`bestillinger` er den eneste tabel med reglerne den vej rundt, og det er den
vigtigste beslutning i hele systemet.

anon-nøglen ligger offentligt i `js/config.js` — den er lavet til det. Måtte den
læse bestillinger, kunne enhver hente navn og telefonnummer på hver eneste kunde
med én linje i en browserkonsol. Det er ikke en teoretisk risiko; det er en
liste over folk der ikke er hjemme på lørdag.

Prisen for det er at gæsten ikke kan få sin række tilbage efter indsættelsen —
PostgREST skal kunne læse for at svare med `return=representation`. Derfor laves
referencen **i browseren, før den sendes**: så kender gæsten den allerede, og
der er intet at læse tilbage. Koden er `SM` + datoen + fem tegn fra et alfabet
uden I, O, 0 og 1, som bliver hørt og skrevet forkert i en telefon.

Insert-reglen kræver desuden `status = 'ny'` og en tom intern note. Uden det
kunne man indsætte en bestilling der ser bekræftet ud, eller skrive i
personalets eget felt.

`supabase/proev-adgang.sql` prøver alle fjorten regler igennem og ruller sig
selv tilbage. Den skal køres **efter** `flerlejer.sql`: adgangen ligger nu i
tabellen `admin_adgang` og ikke i en e-mail skrevet ind i en funktion, og
prøven skriver derfor sin chef ind dér. Kørte man den gamle udgave efter
migrationen, sagde prøve 12 og 13 at personalet ikke kunne se sine egne
bestillinger — en falsk alarm, og den slags får folk til at holde op med at
køre prøver.

Den blev skrevet **før** koden virkede, og den fangede med det
samme at `bigserial` gav gæsten `permission denied for sequence` selv om RLS var
i orden — kolonnen er derfor en identity-kolonne, hvor sekvensen ejes af
kolonnen og der ikke er en rettighed at glemme. Den slags fejl opdager man ikke
før en gæst prøver at bestille.

**Hvad der stadig er muligt:** nogen med nøglen kan indsætte vrøvl-bestillinger.
Det kan ikke stoppes i RLS alene — det kræver en serverfunktion med
hastighedsbegrænsning, og den står øverst på listen under "Hvad der mangler".
Til gengæld kan intet af det læses, mængden pr. række er bundet af
check-reglerne, dobbelttryk afvises af en unik nøgle på (telefon, dag, tid), og
personalet ser og sletter det i admin.

### Personalet kan ikke rette gæstens bestilling

Kun status og den interne note kan røres. Navn, telefon, dato og linjer bliver
stående som de blev sendt: **en bestilling personalet kan skrive om, er ikke
længere et bevis på hvad gæsten bad om.** Skal noget ændres, ringer man og laver
en ny. Der er en test der tæller felterne på kortet og fælder byggeriet hvis der
kommer flere end det ene notefelt.

Statussen går én vej ad gangen — ny → bekræftet → klar → afhentet — med én knap
der siger hvad det næste er. Kanten til venstre på kortet er farvet efter
status, men der står **altid også et ord**: farve alene er ikke information.
Telefonnummeret er et `tel:`-link, for personalet skal ringe, og en tablet ved
lugen kan så ringe direkte fra listen.

Gæstens egen besked står i sit eget felt med baggrundsfarve. Den kan indeholde
en allergi, og en allergi må ikke se ud som en fodnote.

Kan bestillingerne ikke hentes, står fejlen på skærmen. Den bliver ikke skjult:
står der ingenting, tror medarbejderen at der ikke er nogen bestillinger — og så
møder en kunde op til en pose der ikke findes.

### Kurven, men ikke personoplysningerne

Valgene ligger i localStorage, så et tryk på et link og tilbage igen ikke koster
otte stykker smørrebrød forfra. Navn og telefon gemmes **ikke**: det er en
fælles telefon i en familie, og den næste der åbner siden skal ikke se hvem der
bestilte i går. Der er en test der læser hele localStorage igennem og fælder
byggeriet hvis et telefonnummer er sluppet ind.

## Kalenderen: ét sted der ved, hvad der sker hvornår

`kalender` erstatter `lukkedage` og holder tre ting i én tabel:
**arrangement**, **lukkedag** og **tidlig lukning**. Tre forskellige
beskeder til gæsten, men det samme spørgsmål: *hvad sker der den dag?*

Og det er dét spørgsmål, alt det, der kommer bagefter, skal stille.
Bordbestilling skal vide, om der er lukket. Udlejning af baglokalet skal
vide, om lokalet er optaget. **To steder at holde styr på, hvad der sker
hvornår, er præcis dér, dobbeltbookinger opstår** — derfor kom
kalenderen før dem begge.

### Adgangen vender den anden vej end resten af systemet

Bestillinger og forespørgsler må gæsten **skrive** i og aldrig læse.
Kalenderen er omvendt: gæsten må **læse** dele af den og skrive
ingenting. Forsiden skal kunne sige "Lukket i dag · Juleaften" uden at
nogen er logget ind.

"Dele af" er hele pointen:

| Type | Hvem kan se den |
|---|---|
| Lukkedag | alle — den afgør, om der er åbent |
| Tidlig lukning | alle — samme grund |
| Arrangement | kun personalet, **medmindre** `offentlig` er sat |

Personalet skriver også ting til sig selv i kalenderen — *"Bent har
ferie"* — og de må ikke havne på hjemmesiden, fordi nogen glemte at
tænke over det. Derfor er fluebenet slået **fra** som udgangspunkt, og
`tests/admin.spec.js` slår ned, hvis det nogensinde bliver sat på
forhånd.

### Kalenderen siger, hvorfor banneret på forsiden mangler

Kunden savnede livemusik-banneret 22. august: *"det var flot og gav
lidt."* Banneret var der ikke, fordi kalenderen var tom. `js/side.js`
viser det **næste offentlige arrangement**, og der var ingen. Der var
ikke noget i vejen med koden.

Vi opfinder ikke et arrangement for at fylde en plads ud — det ville være
præcis den slags påstand, kunden selv har forbudt. Men admin skal sige,
*hvorfor* pladsen er tom, i stedet for at lade ejeren lede efter en fejl,
der ikke findes. Er der intet kommende offentligt arrangement, står der
øverst på kalenderfanen: **"Der står intet kommende arrangement. Så er
arrangement-banneret på forsiden heller ikke der."** — med opskriften på
at få det tilbage.

To ting tæller ikke med, og prøven måler begge: en **lukkedag** er også en
kalenderrække (uden filteret på type ville en vinterlukning slukke
beskeden), og et **internt** arrangement når aldrig ud på forsiden.

`supabase/demo-indhold.sql` lægger et "Live musik på molen" ind på
førstkommende lørdag. Er den kørt, er banneret der.

### En periode er én række

En vinterlukning er **én** række med en slutdato, ikke halvfems
lukkedage, personalet skal klikke ind og slette igen.

Det havde en pris, der skulle betales ét sted: koden sammenlignede før
`l.dato === iso` **tre** steder — forsiden, næste åbning og
bestillingsformularen. Med den regel ville kun periodens første dag
tælle som lukket, og resten af vinteren ville stå som åben. Der er nu én
funktion, `Butik.lukketDen(d, iso)`, og de tre steder spørger den.
`tests/forside.spec.js` rammer med vilje en dag **inde i** perioden: en
test på den første dag ville bestå med den gamle regel.

### En tidlig lukning kan kun lukke tidligere

Står der i kalenderen, at der lukkes kl. 23.30 på en dag, hvor ugeplanen
siger 21, er det en tastefejl eller en aftale, ingen har bekræftet — og
forsiden ville love en åben luge to en halv time efter, personalet er
gået hjem. Der tages derfor altid det **tidligste** af de to. Også den
har sin egen test.

### Migrationen fra lukkedage

`kalender.sql` flytter de gamle rækker med. Den gamle tabel bliver
stående og bliver bare ikke læst mere, så man kan se, hvad der stod, hvis
noget ser forkert ud bagefter.

Flytningen ligger i en **funktion**, `public.kalender_flyt_lukkedage()`,
og det er ikke pedanteri. Første udgave havde den som en løs sætning i
filen, og prøven tjekkede bagefter *"har hver gammel lukkedag fået en
række?"*. Den bestod — men databasen havde nul gamle lukkedage, så den
spurgte til en tom mængde og **kunne ikke fejle**. Nu lægger prøven selv
to gamle lukkedage ind og kalder den rigtige funktion: én med årsag, én
uden. Den uden skal have en erstatningstitel i stedet for at forsvinde,
for titlen er `not null`.

`supabase/proev-kalender.sql` er 21 prøver. Efterprøvet ved at
genindføre fejlene: slækkes læsereglen, fejler prøve 5 og 20 — dem, der
måler, at køkkenets interne noter ikke kan ses udefra.

**Resten af koden spørger stadig til `d.lukkedage`.** `js/store.js`
afleder dem af kalenderen, og det er med vilje: de "er der åbent"-tests,
der har kørt hele vejen igennem, er dermed sikkerhedsnettet under
migrationen. Havde vi bygget både kilden og alle læserne om i samme
skridt, kunne vi ikke se, hvilken af delene der gik galt.

## Lukkede dage afvises af databasen, ikke kun af browseren

Datovælgeren har altid sprunget lukkedage over — men det er **browseren**, der
holder øje. Med to linjer i en konsol kunne man gå uden om siden og bestille
mad til juleaftensdag eller et bord midt i vinterlukningen, og køkkenet ville
først opdage det, når gæsten stod der.

`supabase/lukkedag-vaern.sql` lægger reglen, hvor den ikke kan omgås: to
`before insert`-udløsere på de to tabeller, gæsten kan skrive en dato i —
`bestillinger` og `bordbestillinger`. Tre spørgsmål pr. række:

1. Er dagen en **lukkedag** i kalenderen (også som periode)?
2. Er der en **tidlig lukning**, og ligger tiden efter den? Sidste afhentning
   er en halv time før lukketid — samme regel som tidsvælgeren på siden.
3. Er der lukket for **sæsonen** (indstillingen `saeson`)?

Fejlteksterne (`bestilling_lukket_dag`, `bestilling_efter_lukketid`,
`bestilling_saeson_lukket`) oversættes til dansk i `js/store.js` — navnene de
to steder skal følges ad.

### Værnet ser kalenderen med ejerens øjne, ikke gæstens

Funktionen er `security definer` med låst `search_path`, som de fire bremser,
og det er ikke pynt. Værnet kører, mens **gæsten** indsætter — altså som
rollen `anon` — og uden `security definer` er dets egne opslag i kalenderen
underlagt hendes læseregler.

I dag må hun se lukkedage: `kalender_laes_alle` lukker med vilje `lukkedag` og
`tidlig_lukning` ud til alle, fordi de afgør, om der er åbent. Så værnet
virkede også uden — indtil nogen strammer den regel.

**Målt på en rigtig Postgres 23/8:** sættes læsereglen til `using (offentlig)`,
hvad der ser fornuftigt ud, kunne gæsten bestille på en lukket dag igen. Ingen
fejl, intet spor — værnet så bare en tom kalender og sagde ja. Præcis den
stille fejl, `er-vi-klar.sql` findes for at fange, og den har nu tre linjer
dér (34–36).

`supabase/proev-lukkedag-vaern.sql` skriver **ALLE 9 AF 9 BESTOD**. De to
sidste er de vigtige: nr. 8 lader **gæsten selv** bestille med adgangsreglerne
slået til, og nr. 9 lægger en strammere læseregel på kalenderen inde i
prøvens egen transaktion og kræver, at værnet stadig fælder bestillingen.
Uden `security definer` skriver nr. 9 `FEJLEDE` — det er efterprøvet.

Prøve 8 og 9 åbner sæsonen igen først. Prøve 7 lukkede den, og en lukket sæson
afviser alt: de to nye prøver bestod, også da værnet var pillet fra hinanden,
indtil den linje kom ind. En prøve, der ikke kan fejle, måler ingenting.

## Bestilling fra bordet: én QR-kode pr. bord

Gæsten sidder på trædækket, scanner mærkatet på bordet og får lugens kort på
sin egen telefon. Bestillingen lander i køkkenets overblik med **Bord 7** på —
ikke med et afhentningstidspunkt, personalet skal gætte sig til.

Det er `ved-bordet/`, og det er den samme motor som forsiden og `bestil/`.
`js/bestilling.js` har nu tre steder at bo, ikke tre udgaver.

### Bordnummeret er leveringsadressen

Det er hele forskellen på den her side og en almindelig bestilling. Der er
ingen hentetid, hvor køkkenet kan opdage en fejl: maden skal ud på et bord, og
det eneste, der siger hvilket, er nummeret i koden.

Derfor er nummeret **rækkens** navn og ikke gæstens tekst. `?bord=BORD%207` og
`?bord=7` slås begge op i bordlisten og bliver til det samme `7` — ellers ville
ét bord på trædækket blive til to i køkkenets liste.

### Bordene er data, ikke kode

En QR-kode kan ikke laves om, når den først ligger på et bord. Men listen over
borde ændrer sig: der kommer et til, et andet nedlægges, og "Terrassen 2"
bliver til "Ved gavlen". Stod numrene i koden, var hver ommøblering på
trædækket en ændring, ejeren skulle bede om — og det er præcis dét, en
QR-kode ikke må være.

Bordene oprettes derfor i admin under **Borde → Bordene og deres QR-koder**,
og `print/bordkort.html` tegner ét skilt pr. tændt bord. **Slukker** man et
bord, holder mærkatet på det op med at virke med det samme; nummeret er det
samme, når det tændes igen, så der skal ikke printes nyt.

Adressen i koderne tages fra siden selv (`location.origin`), så et eget domæne
ikke kræver en kodeændring. Printsiden **advarer**, hvis den er åbnet fra en
egen maskine: koder, der peger på localhost, kan ikke ses med øjnene.

### Tre ting, databasen håndhæver

`supabase/bordkort.sql`, prøvet med `proev-bordkort.sql` (**14 af 14 BESTOD**):

1. **Bordet skal findes.** Ellers kunne enhver adresse med `?bord=hvadsomhelst`
   sende en bestilling ind, og køkkenet stod med mad til et bord, der ikke er
   der. Værnet er `security definer` — se nedenfor.
2. **Et bord er spis her.** `bestilling_bord_hvordan_ok` binder de to sammen:
   en bestilling, der både er til bord 7 og skal hentes ved lugen, er to ting
   på én gang, og køkkenet kan ikke gøre begge.
3. **To borde kan ikke hedde det samme** (`borde_nummer_unikt`, på
   `lower(btrim(nummer))`): to mærkater, der peger samme sted hen, er en
   bestilling til det forkerte selskab.

**Værnet fejler modsat lukkedagsværnets, og det er værd at have set.** Det
spørger "findes bordet IKKE?". Slår det op med gæstens øjne, og bliver
læsereglen på `borde` en dag strammet, finder det ingen borde — og afviser hver
eneste bestilling fra hvert eneste bord. Ikke et hul: en luge, der siger "vi
kender ikke bord 7" til alle, mens bordet står der med et trykt skilt.
Lukkedagsværnet fejler den anden vej og lukker alt ind. Begge dele er lige
stille. Prøve 14 står vagt om det her.

`borde` er i øvrigt den eneste tabel, en gæst må **læse** — telefonen skal
kunne slå bordet op, før den viser en formular. Der står ikke noget om nogen i
den: et bordnummer og et antal pladser er ikke personoplysninger. Rettighederne
er skrevet ud i filen, netop fordi det er den første tabel, hvor en manglende
læseadgang ikke fejler højt, men bare giver en tom liste.

### Hvad siden IKKE gør

- **Ingen betaling.** Der er ingen løbende regning og intet kasseapparat. Man
  betaler ved lugen, som man altid har gjort. En løbende regning nærmer sig
  noget, der er reguleret i Danmark, og det skal afklares med ejerens revisor,
  før det bygges.
- **Ingen indtjekning.** Siden ved ikke, om nogen SIDDER ved bord 7. Værnet kan
  kræve, at bordet findes; det kan ikke se, om koden blev scannet fra
  parkeringspladsen. Skal personalet åbne et bord, før det tager imod, er det
  ejerens beslutning — den står på listen "Ejeren skal bekræfte".
- **Ingen sms-nødudgang.** Den findes på de andre formularer, fordi havnens net
  har to streger. Ved bordet er der tyve meter til lugen, og teksten siger det:
  *"Gå op til lugen og sig det til os."*

### QR-koderne tegnes i browseren

`js/qr.js` er en QR-koder på ~450 linjer: byte-tilstand, fejlkorrektion L til
H, version 1-12. Der lå i forvejen `vaerktoej/lav-qr.js`, som kører npm-pakken
`qrcode` på en maskine og skriver to faste SVG-filer — det duer til `bestil/`
og `menu.html`, som aldrig ændrer sig. Bordene er ikke faste.

**En QR-kode, der er en smule forkert, ser rigtig ud.** Der er ingen skæv kant
og ingen manglende firkant — den er bare ikke til at læse, og det opdages
først, når en gæst står ved bord 7 med en telefon, der ikke vil.

Derfor måles motoren mod en kilde udefra: `tests/qr.spec.js` sammenligner tern
for tern med `tests/facit/qr-facit.json`, skrevet af npm-pakken. Under
byggeriet fangede facitlisten to fejl, hvor **alle 208 datatern var rigtige**
begge gange:

1. De 15 formatbit stod **spejlvendt**. Koden så helt normal ud, men en telefon
   fik aldrig at vide, hvilken maske der var brugt.
2. Det ene tern, der **altid** er mørkt, blev sat til 0, fordi det var
   reserveret som formatplads og aldrig skrevet tilbage.

Ud over facitlisten er motoren kørt mod pakken på 1.691 tilfældige tekster i
alle fire fejlkorrektionsniveauer og versionerne 1-12: alle ens.

## Da en nyhed ikke kunne lægges op (28/8)

Ejeren fik den her på skærmen, da han prøvede at skrive en nyhed:

```
Kunne ikke gemme (400). {"code":"PGRST204","details":null,"hint":null,
"message":"Could not find the 'vis_fra' column of 'nyheder' in the schema cache"}
```

**Tre ting gik galt på én gang, og hver af dem er rettet.**

**1) `supabase/nyheder-fra-til.sql` var ikke kørt.** Det er ejerens fil, og
den er stadig ejerens at køre — men det må ikke være dét, der afgør, om der
kan lægges en nyhed op.

**2) Koden sendte kolonnen med alligevel.** `vis_fra` og `vis_til` stod som
FASTE linjer i `Butik.skrive.nyhed` — lige over de tre felter (`slags`,
`detaljer`, `billede`), der gør det rigtigt med `!== undefined`, og lige under
en note, der advarede ordret mod præcis den fejl: *"Sendte vi felterne altid,
ville HVERT gem på en nyhed fejle."* **En note ved siden af er ikke et værn.**

`maaVindue()` i `js/admin/nyheder.js` læser nu — som `maaAntal()` på Menukort
— hvad databasen har svaret, og datofelterne findes kun, når kolonnen gør.

**⚠️ Uden rækker skjules felterne, modsat `maaSlags()`.** De to valg fejler
hver sin vej, og den ene er dyrere:

| Valg | Hvis kolonnen mangler | Hvis kolonnen er der |
|---|---|---|
| Vis felterne | **Der kan slet ikke oprettes en nyhed.** Kræver en SQL-fil at komme videre | Alt virker |
| Skjul felterne | Nyheden oprettes uden datoer — "altid", som er den rigtige standard | Den første nyhed får ingen datoer, og felterne dukker op af sig selv bagefter |

Den anden fejl retter sig selv. Den første gør ikke.

**3) Fejlen sagde ikke, hvad man skulle gøre.** En rå JSON-blok til en
udvikler, mens ejeren står med en iPad. `Admin.forklarFejl` oversætter nu
PostgREST' *"Could not find the 'X' column of 'Y'"* til **"Kør
supabase/…​.sql i Supabase — så virker det"** ud fra en tabel over, hvilken fil
der lægger hvilken kolonne ind.

**⚠️ Den gætter ikke et filnavn.** Kender vi ikke kolonnen, siger vi tabellen
og lader den rå besked stå — et opfundet filnavn sender nogen ud at lede efter
en fil, der ikke findes. Samme greb som `bestilling_status_ok` i `koekken.js`,
nu ét sted, så alle faner svarer det samme.

**⚠️ Og `er-vi-klar.sql` sagde ALT ER KLAR imens — igen.**
`nyheder-fra-til.sql` har stået i papirerne siden 24/8, men ikke i
tjeklisten. **En tjekliste, der ikke kender en kolonne, siger god for dens
fravær** — nøjagtig samme fejl som `dagens_retter` 26/8, beskrevet i filens
egen note ved linje 83. Den gentog sig alligevel.

Tjek **112** (kolonnerne) og **113** (værnet `nyhed_vindue_ok`) er tilføjet,
kørt på en lokal Postgres 16, og **set fejle**: droppes de to kolonner i en
transaktion, skriver begge ❌ med filnavnet i retningen.

## De to e-mailadresser, og hvad systemet IKKE gør (28/8)

Mikkel oplyste to rigtige adresser: **`selskab1@mosedehavnecafe.dk`** og
**`booking1@mosedehavnecafe.dk`**. De dækker det, der ikke går gennem systemet.

### Det, der GÅR gennem systemet

| Gæsten gør | Side | Lander i | Fane |
|---|---|---|---|
| Bestiller mad ud af huset / spis her | forsiden, `bestil/` | `bestillinger` | Bestillinger + Overblik |
| Bestiller smørrebrød | `h-smorrebrod.html`, `bestil/` | `bestillinger` | Bestillinger |
| Bestiller et tapasfad | `m-tapas.html` | `bestillinger` | Bestillinger (🧀-mærke) |
| Booker et bord | `bord/` | `bordbestillinger` | Borde |
| Bestiller fra bordet med QR | `ved-bordet/` | `bestillinger` m. `bord_nummer` | Køkken-kø |
| Spørger om selskab, catering, baglokale, frokost | de fire `h-*`-sider | `forespoergsler` | Forespørgsler / Baglokalet |

Alt det er der en skærm til, en status, en bremse og en prøve for.

### Det, der IKKE gør — og derfor er adresserne til

| Findes ikke | Hvorfor |
|---|---|
| **Svar til gæsten** | Systemet sender hverken mail eller SMS. Personalet ringer eller skriver selv. Mail-knappen i admin åbner personalets EGET program — den sender ikke noget |
| **Kvittering på mail** | Gæsten får kun kvitteringen på skærmen. Lukker hun fanen, har hun kun referencen |
| **Tilbud og priser på selskab, catering og baglokale** | Der er ingen prismotor. Tallet aftales af mennesker |
| **Kontrakt, depositum, faktura** | Intet af det findes |
| **Betaling** | Ingen MobilePay, intet kort. Der betales ved lugen (Mikkel 25/8). **En attrap, der ligner en betaling, må aldrig bygges** |
| **Ændring og afbud fra gæsten** | Hun kan hverken flytte, udvide eller aflyse en booking selv |
| **Levering** | Slået fra som standard: vi ved ikke hvad, hvorhen eller til hvilken pris |
| **Frokostordning som abonnement** | Afvist 20/8. Kun en forespørgsel |
| **"Reservér plads" til arrangementer** | Designets knap har ingen motor og ingen pladstælling i databasen |
| **Gavekort, bordplan, menuvalg til selskab** | Findes ikke |

### Sådan er de bygget ind

**⚠️ De erstattede en opdigtet adresse.** Der stod
`hej@mosedehavnegrill.dk` i bunden af **ni sider** — designets pladsholder, på
et forkert domæne (`-grill`, ikke `-cafe`). En gæst, der skrev til den, nåede
ingen. En prøve læser mappen og falder på hver side, der får den tilbage.

**⚠️ Og de to sociale links pegede på `#`.** Gæsten trykker, siden hopper til
toppen, og hun tror, det er hende, der gør noget forkert. Reglen stod i
`js/oplysninger.js` hele tiden — *"tomme felter vises ikke"* — men footeren fra
designet fulgte den ikke. De er væk, til ejeren giver rigtige adresser.

**Delt efter ærinde, ikke efter afdeling.** En gæst, der skriver om sin
bordbestilling til selskabsadressen, får svar af den, der sidder med tilbud — og
omvendt. Derfor står de med hver sin etiket ("Selskaber & catering" /
"Bordbestilling") og ikke som to rå adresser.

**Adressen står i HTML'en, ikke i JavaScript.** `js/skal/kontakt.js` bytter den
kun ud, hvis personalet har skrevet noget andet i admin → Kontakt
(`kontakt_email_selskab`, `kontakt_email_booking`). Samme regel som baglokalets
vilkår: skrev vi hele linjen i kode, skulle de rigtige adresser stå to steder,
og den ene ville blive glemt. `h-kalender.html` henter slet ikke data — dér står
HTML'ens adresse alene, og det er netop derfor, den skal stå der.

**⚠️ Tom er ikke det samme som aldrig sat.** Er nøglen ikke i databasen, står
HTML'ens adresse. Er den sat til **tomt**, har nogen nedlagt adressen, og linket
ryger helt af siden — et mailto til en nedlagt adresse er præcis den blindgyde,
`#`-linkene var. Prøven er set fejle: skrives gardet om til `if (!vaerdi)
return`, falder den.

**Kvitteringerne har en vej tilbage, der ikke er et opkald.** Forespørgslen
peger på selskabsadressen med **referencen i emnet**, så personalet ved, hvilken
sag mailen hører til; bordbestillingen peger på bookingadressen. Halvdelen af
dem, der spørger, sidder på et arbejde, hvor de ikke kan ringe.

**⚠️ Forespørgselssiden læser adressen af LINKET i footeren**, ikke af
indstillingen. Adressen står ét sted, og `kontakt.js` har allerede byttet den ud.
To opslag ville være to steder, der kunne komme til at sige hver sit.

## Køkken-køen: skærmen, der står tændt ved lugen

Briefen (25/8) bad om en **Restaurant-mode**, hvor personalet KUN ser
bestillingerne fra bordene, med ét tryk pr. trin og en ventetid, der bliver
rød. Den ligger på fanen **Køkken-kø**, under gruppen *Restaurant* i søjlen.

**⚠️ Kør `supabase/restaurant.sql` + `proev-restaurant.sql`** i
Mosede-projektet (**13 × BESTOD** på en lokal Postgres 16). Filen skal køres
**efter `skraldespand.sql`**.

### Det er en egen SKÆRM, ikke en egen tabel

Briefen bad om, at bordbestillinger ikke måtte blandes ind i den eksisterende
admin. Det er løst med en skærm, og forskellen er hele beslutningen:

- **Køkkenet har ÉN kø.** To tabeller ville være to lister, nogen skal huske
  at kigge i — og den dag begge har travlt, er det den ene, der bliver glemt
- **Dagens omsætning, salgstallene og udeblivelserne regner allerede på
  `bestillinger`.** En anden tabel skulle regnes med i hver eneste af dem,
  hver gang der kom en ny
- **Bordnummeret ER adskillelsen.** En bestilling med `bord_nummer` er fra et
  bord, en uden er fra hjemmesiden. Skærmen filtrerer; dataene deler sig ikke

`restaurant.sql` tilføjer derfor kun to statusser til den tabel, der var:
`ny → tilberedes → klar → serveret` for bordene, `ny → bekraeftet → klar →
afhentet` ud af huset. `klar` er den samme for begge — de to veje mødes dér
og skilles igen.

**⚠️ Køres `setup.sql` eller `udeblivelser.sql` igen bagefter, snævres
statuslisten ind igen**, og så kan køkkenet ikke trykke "Tilberedes" mere.
Fejlen ser ud som en knap, der ikke virker, og ingen ville gætte på en
SQL-fil. `er-vi-klar.sql` linje 91 fanger det.

### Kortet er bygget til fedtede fingre

- **Bordnummeret er det største på kortet** — 34 px. Personalet leder efter
  ét tal, når de skal ud med maden, ikke efter et navn
- **Ét tryk pr. trin.** Knappen viser kun det NÆSTE trin: fire knapper pr.
  kort er fire steder at ramme forkert
- **Noten står fremhævet.** "Uden remoulade" og "allergi" er ikke en detalje
  — det er forskellen på en middag og en ambulance
- **Ventetiden bliver rød**, og det er skærmens eneste alarm — derfor er
  intet andet på kortet rødt
- **Beløbet står med "betales ved lugen"** og aldrig som et betalt-mærke. Der
  er ingen betaling i systemet; et mærke ville være en påstand, ingen har
  dækning for
- **"Kan ikke laves" spørger først** og siger, at man skal ud til bordet.
  Gæsten sidder der og får ingen besked af systemet

### Skruet efter kundens forlæg (28/8)

Kunden sendte to skærmbilleder af en færdig køkkenskærm: bordbestillinger
*"er jo en hel anden ting end online bestillinger og skal være bl.a. den
køkkenet står og kigger på og skal være dygtig og intelligent."* Formen er
lånt; **ingen SQL**.

| Nyt | Hvorfor |
|---|---|
| **Hovedet tikker** — "QR-bestillinger fra bordene · 12.40 · 4 bestillinger skal ud" | Skærmens puls. Står tallene stille, mens køkkenet har travlt, tror ingen på dem. Uret tegner fanen om hvert minut i forvejen |
| **⚠️-kortet "Gå ud og sig noget"** | Det, der ikke kan vente: lukket for bordene, et bord der har ventet for længe, en allergi |
| **Zonestriben** (Alle zoner · Molen · Terrassen) | Gør en tur ud med bakken til én tur i stedet for to |
| **"Runde 2"** på kortet | Dessert til nogen, der allerede sidder og spiser — ikke et nyt bord, der venter på sin frokost |
| **Uret er en pille**, rød med hvid skrift | Tallet, køkkenet handler på, skal kunne læses fra en gryde to meter væk |
| **Én stor knap i fuld bredde** | Skærmen bruges med en fedtet finger, mens den anden hånd holder en tallerken |

**⚠️ Linjerne i ⚠️-kortet har INGEN knapper, og det er med vilje.** Systemet
kan ikke tale med bordet: der er ingen skærm hos gæsten, ingen besked og ingen
betaling. Hun sidder og venter, og det eneste, der virker, er et menneske, der
går derud. En knap ville lade som om, der var en genvej.

**⚠️ Ejerens ventetid slår briefens kvarter.** "Forventet ventetid" er dét,
gæsten får at se, når hun scanner. Er den sat til 10, HAR vi lovet 10 — og så
er 12 minutter for længe, uanset hvad briefen sagde. Er den ikke sat, er der
ikke lovet noget, og så skriver skærmen heller ikke "den burde tage N", som om
nogen havde sagt det. `FOR_LAENGE_MIN = 15` er kun reserven. Uden det ville
skærmen have to sandheder om den samme bestilling: én på gæstens telefon og én
i køkkenet.

**⚠️ Der må aldrig komme til at stå "betalt".** Forlægget skrev *"bestilt
12.12 · betalt 280,-"* under hvert kort. Der er ingen betaling i systemet
(Mikkel 25/8: *"de gør det via kassen ved at tage tingene ind manuelt"*), og
en tallerken, der bæres ud til et bord, som personalet TROR har betalt, er
penge ud ad døren. En prøve slår ned på ordet.

**Allergien er gæstens egne ord.** `Admin.erAllergi` kender den på ordet
`ALLERGI:`, som gæstens eget felt sætter foran — vi gætter ikke ud fra en
ordliste. Teksten citeres i ⚠️-kortet, som hun skrev den: et referat kan tabe
det ene ord, der betød noget. En almindelig note ("uden agurk") bliver på
kortet — stod hver eneste af dem øverst, ville allergien drukne i dem.

**Alarmen siger det én gang.** Målt på en travl frokost med ventetiden sat til
ti minutter: tre borde over grænsen gav tre næsten ens linjer, der fyldte hele
kortet. Det værste bord står med sit tal; resten er et antal.

**Runden tæller de serverede med, men ikke de afviste.** Havde vi kun talt de
åbne, ville runde 2 hedde runde 1, i det sekund den første var båret ud. Og en
ordre, køkkenet ikke kunne lave, er aldrig blevet til mad — at kalde den en
runde ville sige, at bordet havde fået noget.

**Zonestriben findes kun ved to eller flere zoner.** De fleste steder har ét
hjørne, og "Alle zoner" ved siden af én knap, der hedder "Terrassen", er to
knapper, der gør det samme. Filteret slipper også af sig selv, når den sidste
ordre i en zone er serveret — ellers står skærmen tom med en usynlig
begrænsning, og køkkenet tror, køen er tom.

**⚠️ Men fanens tal tæller HELE køen.** Et zonefilter, der også skruede ned
for tallet i søjlen, ville skjule tre borde på molen for den, der kigger på
terrassen — og så holder man op med at stole på tallet.

**Bordstriben er en genvej nu, ikke en gentagelse.** Den sagde det samme som
kortet lige nedenunder: "Bord 1 · 1 ordre · 28 min" over et kort, der hedder
Bord 1 og siger 28 min. Felterne er knapper — et tryk ruller ned til bordets
ældste åbne kort og markerer det halvandet sekund. Med fire ordrer var det
larm; med femten er en fast indholdsfortegnelse netop dét, man mangler.

**⚠️ Et urtegn, ikke et emoji.** Pillen bliver rød med hvid skrift, og et
farvet emoji på rød bund er en klat. Første udgave affarvede det med et
CSS-filter, og **målt på et skud** blev 🕐 til en hvid cirkel uden visere.
Tegningen arver `currentColor` nu og skifter farve med pillen af sig selv.

**Og et ødelagt `</details>` blev rettet på vejen:** taggen stod inde i
`<div class="lyd-raekke">`, så browseren lukkede begge dele og lod
lyd-knappen falde ud af folden. Det så tilfældigvis rigtigt ud.

Skærmen henter ikke selv — bestillingsfanen gør det og melder listen ind. Der
er ingen "Hent på ny": en knap, nogen skal huske at trykke på, er en kø, der
står stille.

### Tre fejl, prøverne fangede

1. **Knappen kaldte `Butik.skrive.status`, som ikke findes.** Den hedder
   `bestillingStatus`
2. **`Admin.gem` henter INDSTILLINGERNE igen — ikke bestillingerne.** Kortet
   blev derfor stående med det gamle trin, til `frisk.js`' takt indhentede det
   et minut senere. Et minut er en evighed i et køkken: personalet trykker
   igen, og bestillingen springer et trin over. `Admin.friskOp` giver nu et
   løfte tilbage, så køen er hentet, før der kvitteres
3. **`'a' + x || 'b'` er altid `'a' + x`.** Kvitteringen på sidste trin sagde
   "undefined"

### Zonen på bordet, og bunken der printes efter den

`borde.zone` er **fri tekst** — Terrassen, Molen, Inde. Ikke en liste med tre
navne: havnen hedder det, den hedder, og en check-regel ville betyde en
SQL-fil den dag, der kom et fjerde hjørne. Den er noget ANDET end
`placering` (ude/inde), som siger, om bordet står i vejret.

`print/bordkort.html` sorterer skiltene efter zone og begynder et **nyt ark**,
hver gang zonen skifter. Ejeren printer én gang og går ud med papiret i
hånden; lå Terrassens skilte spredt mellem Molens, skulle han sortere en stak
varme sider ved printeren — og det er dér, bord 7's skilt ender på bord 9.
Zonen står på skiltet, så bunken kan bæres ud uden at man skal huske listen.

### "Bestil noget mere" kostede to fejl, og ingen af dem kunne ses

Briefen: *"Bestil mere må lægge en ny ordre på samme bord, så personalet kan
se at det er samme regning/bord."* Knappen fandtes i forvejen. Den virkede
ikke.

**1) Dubletvagten spærrede for anden runde.** `bestilling_ikke_dobbelt` siger:
samme telefon, samme dag, samme **tid** er én bestilling, ikke to. Den fanger
det almindelige dobbelttryk ved lugen. Men en bordbestilling vælger ingen
hentetid — `hent_tid` er klokken NU. Selskabet ved bord 7 bestiller is efter
maden og rammer det samme minut, og de fik *"Du har allerede sendt en
bestilling til det tidspunkt"*, som om de havde dobbeltklikket. Isen blev
aldrig bestilt.

Nøglen gælder derfor kun rækker **uden** bordnummer nu. Dobbelttrykket ved
bordet fanges af skærmen i stedet: knappen slås fra, mens der sendes, og
kvitteringen dækker formularen bagefter — man skal aktivt trykke "Bestil
noget mere" for at komme videre. Prøve 11 og 12 holder begge halvdele fast,
og prøve 13 holder skraldespandens: `where slettet is null and bord_nummer
is null`.

**2) Anden runde mistede bordnummeret.** Efter et gennemført køb nulstilles
kurven, og den nulstillede kurv stod på `hvordan: 'afhentning'`. `spis_her`
sættes kun i `start()`. Et bordnummer kræver spis her, så `store.js` tog det
af — og bestillingen landede som en helt almindelig afhentning med hentetid
**nu**. Køkkenet havde ingen måde at vide, hvilket bord isen skulle hen til;
maden ville stå ved lugen, mens gæsten sad og ventede. Ingen fejl, ingen
advarsel.

**Begge blev fundet af en prøve, ingen af dem ved at læse koden.**

### Omsætningen tæller også det, der er serveret

En bordbestilling ender på `serveret` og aldrig på `afhentet`. Salg-fanen
talte kun det sidste, så hver eneste krone fra bordene ville være væk fra
regnskabet — uden en fejl, uden et hul i listen, bare et tal, der var for
lavt. De to ord er den **samme begivenhed set fra hver sin side af lugen**:
maden er lavet og afleveret.

Fanen har fået et felt til, **Fra bordene**, så ejeren kan se, om QR-koderne
betyder noget. Det er ikke et andet regnskab — det er det samme tal delt op,
og feltet findes kun, hvis der er bestilt fra et bord: et "0,-" på en
forretning uden QR-koder ude ligner en fejl i noget, der virker.

### Tillægget til briefen: hvad der gælder uden betaling

Tillægget (25/8, fra den Claude, der bygger spiis.dk) er skrevet
ud fra, at gæsten **betaler i appen**. Det gør hun ikke. Ejeren har
besluttet: **der betales ved kassen som altid, og personalet taster
tingene ind dér.**

Det fjerner tre af tillæggets punkter helt:

- **Punkt 1, "betalingen kan lykkes, uden at ordren bliver til"** —
  der er ingen betaling at lykkes. Ordren oprettes af gæstens
  telefon, og idempotensen er der i forvejen: `reference` er
  `not null unique`, og `js/bestilling.js` har en sms-nødudgang,
  hvis nettet dør undervejs
- **Refusioner** — der er ikke trukket noget
- **Kasseapparat og revisor** — kassen ved lugen ER
  salgsregistreringen, som den altid har været. Salg-fanen er en
  rapport over, hvad der er bestilt gennem systemet, og siger det
  selv: *"der er ingen kasse i systemet"*

**Fem punkter står tilbage, og to af dem bliver VÆRRE uden
betaling:** en bestilling, der ikke koster noget at sende, er
lettere at lave — ikke sværere.

#### Punkt 2 · Udsolgt skal afgøres i databasen

Personalet melder Fish'n'chips udsolgt. Varen forsvinder fra
siderne med det samme — **på de telefoner, der henter siden
bagefter.** Gæsten ved bord 7, der åbnede kortet for fem minutter
siden, har den stadig på skærmen.

Med betaling op front ville hver kollision blive en refusion. Uden
betaling bliver den til noget andet, der er lige så slemt: en gæst,
der sidder og venter på mad, ingen kan lave, og et køkken, der skal
ud og forklare det.

`mosede_udsolgt_vaern` i **`supabase/bord-loft.sql`** afviser en
bestilling, der nævner en vare, som er meldt udsolgt eller skjult.
Beskeden siger **hvilken** vare — ellers skal gæsten gætte, hvad af
otte ting hun skal tage af.

**⚠️ Værnet siger kun nej til navne, der FINDES på kortet.** Dagens
ret bor i sin egen tabel og har sin egen nedtælling. Afviste værnet
alt, det ikke kunne finde, ville en ret, ejeren skrev i hånden i
morges, blive umulig at bestille. Prøve 5 måler præcis det, og den
er set fejle.

**Fyldet er også varer** (Model A). Et udsolgt fyld, der slipper
igennem, giver gæsten smørrebrød med noget andet på, end hun bad om.

#### Punkt 3 · Køkkenet kan sige "ikke lige nu"

Der var kun **åben** eller **lukket**, og der er langt imellem dem.
Lander der femten ordrer på fem minutter, kan lugen ikke nå dem, den
ventetid, personalet har skrevet, er en løgn — og eneste udvej var
at lukke HELT, også for de borde, der ikke havde bestilt endnu.

Loftet er et tal pr. **rullende** kvarter, ejeren sætter på
Køkken-kø-fanen. Rullende og ikke "kvarteret 12.00-12.15": et fast
kvarter betyder, at otte ordrer kl. 12.14 og otte kl. 12.16 er
seksten ordrer på to minutter, og loftet ville ikke have set noget.

Er kvarteret fyldt, får gæsten en **grund og en vej videre**:

> *"Der er run på lige nu, og køkkenet kan ikke tage flere
> bestillinger fra bordene i øjeblikket. Prøv igen om lidt — eller
> kom op til lugen, hvis det haster."*

**Tomt felt = intet loft**, og **et nul er også intet loft**: skrev
nogen 0 for at slå det fra, må det ikke blive til "ingen ordrer
overhovedet" og lukke bordene i stilhed.

**⚠️ Loftet gælder KUN bordene.** Smørrebrød ud af huset bestilles
dagen før og lægger ikke pres på lugen nu. Lukkede loftet for dem
også, ville en travl frokost ved bordene lukke for morgendagens
smørrebrød — og det ville ingen forstå.

**Ventetiden kan vokse med køen — men kun med ejerens tal.**
Personalet sætter grundtiden; `bord_ventetid_pr_ordre_min` lægger
til pr. ordre i køen. Er tallet ikke sat, står grundtiden alene.
Fandt siden selv på "tre minutter pr. ordre", ville den love noget
på køkkenets vegne, som ingen havde sagt.

Tallet rundes til nærmeste fem: *"ca. 23 minutter"* lyder som noget,
der er regnet ud. *"Ca. 25"* lyder som et skøn, og det er dét, det er.

#### Punkt 3b · Visningen `bord_travlhed`

Gæstens side kan ikke læse `bestillinger` — det må hun ikke, og det
skal hun ikke. Men den skal kunne se, hvor travlt der er.

Visningen svarer med **fire tal og intet andet**: hvor mange
bordordrer er i køen, hvor mange kom i sidste kvarter, hvor gammel
den ældste af dem er, og hvilken forretning.

**⚠️ TILFØJ ALDRIG EN KOLONNE TIL DEN.** Visningen kører med sin
ejers øjne og springer adgangsreglerne over — præcis som
`optagne_dage`. Kommer der et navn, et telefonnummer eller en
varelinje med, er køkkenets liste åben for internettet, og siden
ville se helt rigtig ud imens. Prøve 12 tæller kolonnerne, og prøve
15 spørger, om gæsten stadig er lukket ude af selve tabellen.

Et **tal** er ikke personoplysninger. Det er det samme, gæsten kan
se ved at kigge hen mod lugen.

#### Punkt 4 · De seks dubletter i `bord-menu.js`

Gælder ikke: vi bruger ikke filen. Menuen har ÉN kilde, `menu_varer`.
**Men læren gælder**, den dag nogen vil have en "Mest bestilt"-liste
på kortet: den skal være en liste af **id'er**, ikke en kopi af
varerne. Ellers melder personalet Fish'n'chips udsolgt, den
forsvinder ét sted og ikke det andet — og prisen kan nå at blive to
forskellige tal på det samme kort.

#### Punkt 5 · Lyden på en tablet, der har stået stille

Browsere blokerer lyd, indtil nogen har rørt skærmen. En iPad i
køkkenet, der har stået urørt siden morgenmaden, **siger
ingenting**, når dagens første ordre kommer — og det opdages først
den dag, en ordre har stået i tyve minutter.

Derfor knappen **"🔔 Slå lyd til"** på Køkken-kø. Trykket ER
tilladelsen, så tonen spilles med det samme: hører man ingenting nu,
virker den heller ikke kl. 19. Tonen laves i browseren (WebAudio) og
ikke som en fil — en hentning mere kan fejle på havnens net.

**Og lyden er aldrig alene.** Der er larm i et køkken. Et nyt kort
markerer sig synligt, og markeringen **bliver stående**, til
personalet trykker det videre. Et blink på to sekunder, ingen så, er
ingen markering.

**To fejl, prøverne fangede i den markering, og de var hinandens
modsætning:**

1. Køen stod tom hele formiddagen, og listen over kendte id'er blev
   aldrig skrevet ned. Dagens **første** ordre blev derfor behandlet
   som en førstegangsindlæsning: ingen markering, intet pling.
2. Rettelsen på den skrev listen ned med det samme — også **før**
   bestillingerne var hentet. Så blev hele køen ved login til
   "nyt": tredive kort lyste op og plingede.

Forskellen er, om listen overhovedet er **meldt ind**.
`Admin.lister.bestillinger` er `undefined`, til den er.

#### Søjlen er delt i fem — og en overskrift lukker ikke sig selv

Briefen bad om **"egen sektion i venstre rail, fx label
Restaurant"**. Første udgave gav den ÉN overskrift, og det var
forkert på en måde, der kun kunne ses på skærmen: en overskrift
lukker ikke sig selv, så de otte faner bagefter — Baglokalet, Salg,
Menukort, Nyheder, Beskeder, Forside, Kontakt og Historik — læste
alle sammen som en del af **Restaurant**.

Søjlen har fem grupper nu, og hver fane hører til én af dem:

| Gruppe | Faner | Hvad de har til fælles |
|---|---|---|
| **Dagen** | Overblik, Kalender, Bestillinger, Forespørgsler, Baglokalet | Der venter et menneske. De tre sidste er de eneste med et tal på |
| **Restaurant** | Køkken-kø, Borde | Bordene i marken |
| **Forretningen** | Åbningstider, Menukort, Salg | Hele huset, og det ændrer sig sjældent |
| **Hjemmesiden** | Nyheder, Beskeder, Forside, Kontakt | Det, gæsten LÆSER |
| **Log** | Historik | Skraldespand og logbog. Ingen tal — man går derhen, når noget er gået galt |

**⚠️ Der må ikke ligge faner efter den sidste gruppe.** Skal der en
fane til, hører den til i en af de fem — eller også skal der en
sjette overskrift til. En prøve læser søjlen i rækkefølge og falder,
hvis en fane havner uden for en gruppe, eller hvis Restaurant får
noget, der ikke hører til den. Den er set fejle med den gamle
udgave.

**Briefen ville også have Menukort og "Dagens omsætning" under
Restaurant. Det er de ikke**, og det er med vilje: de dækker HELE
forretningen, og en kopi ville være to steder at rette den samme
pris. Bordenes andel af omsætningen står i stedet som sit eget felt
på Salg-fanen.

Fem grupper til femten faner er samtidig svaret på advarslen i
CLAUDE.md om antallet af faner: en søjle med femten punkter i én
bunke er en liste, man skal læse; fem korte lister er noget, man kan
pege i.

#### Punkt 6 · Bordnummeret i URL'en

`?bord=7` er ikke en hemmelighed, og der er ikke noget token. Det er
med vilje: mærkatet på bordet er offentligt, enhver kan fotografere
det, og et token ville kun beskytte mod at gætte andre bordnumre.

**⚠️ Her gør fravalget af betaling det VÆRRE, og det skal siges
højt.** Tillægget skriver: *"Med betaling op front er det ikke
gratis for dem, så det er ikke en stor risiko."* Uden betaling ER
det gratis at bestille til bord 4 fra parkeringspladsen.

Tre ting står imod det, og de er alle sammen personalets:

- **"Kan ikke laves"** på hvert kort i køkken-køen — én knap, ét
  spørgsmål, og gæsten får ingen besked af systemet: personalet går
  ud og siger det
- **Loftet pr. kvarter** gør, at en enkelt spøgefugl ikke kan fylde
  hele skærmen
- **Slukke bordet** i admin: mærkatet holder op med at virke med det
  samme, og skiltet kan blive liggende, til bordet tændes igen

Skal der mere til, er næste skridt et loft pr. **bord** pr. kvarter
— men det rammer også det rigtige selskab, der bestiller tre gange
på en aften, så det bygges ikke, før nogen har set problemet.

#### Punkt 7 · De trykte kort driver fra priserne

Kortene ved lugen er trykt. Ændrer nogen en pris i admin, er kortet
ved lugen forkert, til det bliver trykt om — og den, der opdager
det, er en gæst, der har regnet med det gamle tal.

Der står nu en linje på Menukort-fanen om det. Ét sekunds læsning,
og den sparer en diskussion ved lugen.

#### Punkt 8 · Accepttestens dage, hvor det går galt

Test 6, 7 og 8 handler om betaling og er væk med den. **Test 9 står
tilbage, og det er den, tillægget selv kalder afgørende:** *"to
borde bestiller den sidste portion samtidig → kun én af dem får den,
og den anden får det at vide med det samme."*

Den kan kun bestås, hvis beslutningen ligger i databasen — og det
gør den nu, to steder: `dagens_retter` tæller ned i en bremse med
`greatest(antal - stk, 0)`, og `mosede_udsolgt_vaern` afviser den
vare, der er meldt udsolgt. `supabase/proev-bord-loft.sql` skriver
**ALLE 15 AF 15 BESTOD**.

### Det, der IKKE er bygget, og hvorfor

- **Betaling i gæstens app (MobilePay/kort).** **Afklaret 25/8: den bygges
  ikke.** Ejeren har besluttet, at der betales ved kassen som altid, og at
  personalet taster tingene ind dér. Det holder beslutningen fra 19/8
  (*"MobilePay: ikke nu"*) og designet bag `ved-bordet/` (*"Ingen betaling,
  ingen løbende regning — man betaler ved lugen som altid"*). Det fjerner
  samtidig refusionerne og hele spørgsmålet om salgsregistrering: kassen ved
  lugen ER registreringen. Skulle det en dag laves om, kræver det ejerens
  egen aftale med en indløser (CVR) — og **en attrap, der ligner en rigtig
  betaling, må aldrig bygges**: en gæst, der tror, hun har betalt, har ikke
  betalt
- **Live status på gæstens telefon.** Gæsten må skrive i `bestillinger`, men
  ikke læse. Skal hendes telefon vise "På vej til bordet", kræver det en ny
  visning i databasen, som kan slås op på referencen — og dermed en
  beslutning om, hvad en gættet reference kan afsløre. Det er ikke en
  kodeændring, det er et adgangsvalg
- **Én menukilde fra `bord-menu.js`.** Vi HAR én kilde: `menu_varer`, 242
  varer, som ejeren selv administrerer. At starte fra en fil ville lave en
  **anden** kilde, og to lister over det samme sortiment skrider fra
  hinanden. Filens priser kan bruges som et **spørgeark** til ejeren — de
  124 varer uden pris — men aldrig som en tavs import: ingen priser er gættet
- **Lyd ved ny ordre.** Pushen findes (`sw.js` + `send-push.ts`) og siger til
  på telefonen. En lyd i browseren kræver, at nogen har rørt siden først, og
  en iPad, der har stået tændt siden morgen, har ikke fået det tryk

## Gæstens halvdel kommer alene

`js/store.js` var 112 kB og blev hentet på hver eneste sidevisning. Godt 22 kB
af dem var `Butik.skrive` — personalets rettelser i databasen, som **ingen
gæsteside rører**: en gæst skriver kun sin egen bestilling, og den vej
(`Butik.bestil()` og søskende) ligger stadig i `store.js`.

Vægtprøven i `tests/vaegt.spec.js` fældede forsiden, da bordbestillingen kom
til: 727 kB mod et loft på 720. Prøvens egen note sagde, hvad svaret skulle
være — *"næste gang den her test fejler, skal svaret ikke være et større tal:
så skal nogen se på, om hele store.js hører til på forsiden, eller om den kan
deles, så gæstens halvdel kommer alene."*

Skrivelaget ligger nu i `js/store-skriv.js`, som **kun `admin.html` indlæser**.
Forsiden er på **701 kB** — nitten kilobyte luft, hvor der før var syv over.
`css/ved-bordet.css` er flyttet ud af samme grund: 2 kB regler for en side, kun
den gæst ser, der sidder ved et bord.

To prøver holder delingen på plads: `Butik.skrive` skal være **undefined** på
forsiden og en funktion i admin. Uden dem kunne den næste skrive-funktion med
god samvittighed lande i `store.js` igen, og vægten ville snige sig tilbage —
nøjagtig som den gjorde første gang.

De private hjælpere, skrivelaget bruger, deles gennem `window.ButikIndre`.
Navnet er en advarsel: en gæsteside, der begynder at bruge noget derfra, er en
gæsteside, der er ved at skrive i databasen.

## Push: sådan siger telefonen til

**Bygget (fase 5c).** Fremgangsmåden er den, `spiis.dk` kører på, fortalt af
Mikkel; koden er skrevet her. Delene:

| Del | Fil | Hvad den gør |
|---|---|---|
| Tabellen | `supabase/push.sql` (+ `proev-push.sql`, 11 prøver) | Én række pr. telefon, der har sagt ja. Kun personale må læse og skrive — et abonnement ER retten til at sende til enheden |
| Afsenderen | `supabase/funktioner/send-push.ts` | Edge Function. Tjekker `x-mosede-secret` som det ALLERFØRSTE, bygger beskeden ud fra tabellen (fire tabeller giver push), sender Web Push og rydder døde abonnementer op. Gæstens telefonnummer kommer ALDRIG med i teksten — en push kan ligge på en låst skærm |
| Modtageren | `sw.js` | Service worker, KUN push og klik. Ingen fetch-håndtering: en service worker, der cacher, er en side, der kan vise gamle priser |
| Appen | `manifest.webmanifest` + `ikoner/` | Linkes KUN fra admin.html: push på iPhone/iPad kræver, at siden ligger på hjemmeskærmen, og det er personalet — ikke gæsterne — der skal derhen |
| Kontakten | `js/admin/push.js` (kortet "Besked på telefonen" på Kontakt-fanen) | Til/fra pr. enhed, liste over tilmeldte enheder, og iOS-fælderne forklaret PÅ skærmen |

Nøglerne laver chefen SELV med `supabase/lav-vapid.html` — dobbeltklik på
filen, så bliver de til i hans egen browser og har aldrig været andre
steder: ikke i repoet, ikke i en chat, ikke hos Claude. Den OFFENTLIGE
indsættes i feltet på kortet (og som secret); den PRIVATE og `PUSH_SECRET`
ligger KUN som secrets hos Supabase. `tests/push.spec.js` måler
grænserne: manifest og service worker rører ikke gæstesiden, døren tjekkes
før json-parsningen (målt på koden, ikke på kommentaren — første udgave af
den test kunne ikke fejle), og telefonnummeret er ude af beskederne.

### Admin holder sig selv frisk — og har en direkte forbindelse

Kunden så det med det samme: telefonen bippede, men skærmen stod stille, til
nogen trykkede "Hent på ny". Første rettelse var tre signaler (push,
tilbagekomst, takt) — og kunden målte igen: stadig ikke "i samme sekund" som
spiis på en skærm uden push. Så nu er der FIRE signaler, og det første er en
rigtig realtime-forbindelse:

1. **Den direkte forbindelse** (`js/admin/live.js`). En åben websocket til
   Supabases realtime-tjeneste; hver ændring i de fire gæstetabeller udløser
   en hentning med det samme. HÅNDSKREVET, ikke SDK'et: Supabase Realtime
   taler Phoenix-protokollen — JSON med {topic, event, payload, ref} og et
   hjerteslag — og de ~100 linjer kan læses i deres helhed, hvor SDK'et er
   hundrede kilobyte bygge-løst værktøj. Der lyttes med personalets eget
   token, så realtime håndhæver de samme adgangsregler som resten; en gæst
   har ingen læseregler og hører ingenting. Falder forbindelsen, rejser den
   sig selv med voksende afstand. Kræver `supabase/realtime.sql` (melder
   tabellerne til publication'en supabase_realtime).
2. **Pushen.** `sw.js` sender `mosede-nyt` til de åbne admin-vinduer i samme
   sekund, beskeden lander.
3. **Tilbagekomsten.** Vender man tilbage til fanen, hentes der.
4. **Takten.** Hvert minut som fald-tilbage — kun når fanen er synlig.

Kun LISTERNE genhentes (`Admin.friske`) — åbningstider og menukort ændrer
sig ikke af sig selv. `tests/live.spec.js` spiller selv realtime-serveren
(Playwrights routeWebSocket) og måler hele kæden: forbindelsen åbnes med de
fire tabeller OG personalets token, en meldt ændring sætter bestillingen på
skærmen uden tryk, og i øvetilstand åbnes ingen forbindelse. Og
`tests/frisk.spec.js` måler sikkerhedsnettet — logget-ud-værnet på
NETVÆRKET, ikke på fejlbeskeden: første udgave af den prøve løb om kap med
et langsomt kald og kunne ikke fejle.

### Baggrunden

Det er samtidig det første i Mosede, der **ikke** er ren statisk kode. En
browser kan tage imod en push, men noget skal *sende* den, og det skal ske
i det øjeblik rækken bliver oprettet — altså på en server.

### Kæden

```
gæst sender bestilling
  → rækken lander i databasen
  → Database Webhook (kun ved INSERT)
  → POST til Edge Function
  → Web Push ud til de telefoner, der har sagt ja
```

### Edge Function'en

```
POST  https://<projekt-id>.supabase.co/functions/v1/send-push
```

For Mosede er `<projekt-id>` = `epwyjzakvvbxtpvnhvbn`.

**Døren er én header:**

```
x-mosede-secret: <PUSH_SECRET>
```

Funktionen har **"Verify JWT" slået fra** — ellers kunne webhooken ikke nå
den — og tjekker i stedet headeren som **allerførste** ting og svarer 401,
hvis den ikke passer. Uden det kunne hvem som helst på internettet kalde
adressen og få køkkenets telefoner til at bippe.

### Hvad Supabase sender med

```json
{ "type": "INSERT", "table": "bestillinger", "record": { … hele den nye række … } }
```

- `type` — er det ikke `INSERT`, svarer funktionen `ignored` og gør ingenting
- `table` — afgør overskriften: `bestillinger` → "Ny bestilling",
  `forespoergsler` → "Ny forespørgsel"
- `record` — navn, klokkeslæt og antal til selve beskedteksten

### Opsætningen i dashboardet

**Database → Webhooks → Create a new hook**, FIRE gange:

| Felt | Værdi |
|---|---|
| Table | `bestillinger`, `forespoergsler`, `bordbestillinger`, `udlejninger` — én hook pr. tabel |
| Events | **kun** Insert |
| Type | HTTP Request |
| Method | POST |
| URL | `https://epwyjzakvvbxtpvnhvbn.supabase.co/functions/v1/send-push` |
| HTTP Headers | `x-mosede-secret` = samme værdi som `PUSH_SECRET` |

Fire webhooks i alt, alle til samme funktion — den finder selv ud af, hvad
der er hvad, ud fra `table`.

### To ting, der bider på iOS

Køkkenet står med en iPad, så de er ikke teoretiske:

- **Push virker kun i en installeret app.** Siden skal lægges på
  hjemmeskærmen først; en fane i Safari får ingenting
- **Tilladelsen forsvinder med appen.** Slettes den og lægges på igen, skal
  notifikationer slås til på ny. Det skal stå på skærmen, ikke i en
  vejledning, ingen finder

## Skraldespanden: "Slet" er blevet til "fortryd"

`supabase/skraldespand.sql` + `proev-skraldespand.sql` (19 prøver),
`js/admin/skraldespand.js`, fanen **Skraldespand**.

"Slet" i admin var endeligt. Et fejltryk på en iPad ved lugen — og en gæsts
navn, telefonnummer og bestilling var væk. Der er ingen kopi, og gæsten kan
ikke bare sende den igen: personalet kunne ikke se rækken, men nøglerne og
bremserne kunne.

Nu er "Slet" en dato i kolonnen `slettet`. Rækken bliver i databasen,
forsvinder fra listerne, og kan hentes tilbage med ét tryk. Efter 30 dage
bliver den slettet for alvor.

### Det er ikke kolonnen, der er det svære

Det er, at rækken skal holde op med at **spærre**. En skraldespand, der kun
skjuler, er værre end ingen skraldespand:

| Uden | Hvad gæsten oplever |
|---|---|
| `bestilling_ikke_dobbelt` kigger på alle rækker | "Du har allerede sendt en bestilling til det tidspunkt" — på grund af en række, ingen kan se |
| `udlejning_dagen_er_taget` kigger på alle rækker | Baglokalet er optaget den dag **for evigt**, og der står ingen steder hvorfor |
| Bremsen tæller spanden med | "Der er allerede sendt flere bestillinger fra det nummer i dag" på en dag uden en eneste synlig bestilling |

Derfor er de fire nøgler gjort **delvise** — de gælder kun rækker, hvor
`slettet is null`. En unik *constraint* kan ikke være delvis i Postgres, så
constrainten fjernes, og der laves et unikt **index** med samme navn.
Navnet skal blive stående: databasens fejltekst nævner det, og `js/store.js`
oversætter på det.

Bremserne rettes i stedet for at blive skrevet forfra. Grænserne — 5
bestillinger pr. nummer i døgnet, 3 bordønsker, 2 udlejninger, 40 i timen —
hører hjemme i `bremse.sql`, `borde.sql`, `udlejning.sql` og
`forespoergsler.sql`, og en kopi i `skraldespand.sql` ville skride fra
originalen den dag, én af dem ændres. Filen finder derfor formen
`ALIAS.oprettet > now()` i hver tælling og hænger `ALIAS.slettet is null` på.
**Ændres den form en dag, laves der ingen stille halv rettelse** — så
standser filen med en fejl, der siger hvilken bremse det gælder.

Og: køres `bremse.sql`, `borde.sql`, `udlejning.sql` eller
`forespoergsler.sql` igen bagefter, skriver de deres egen udgave tilbage, og
rettelsen er væk. Kør så `skraldespand.sql` igen. `er-vi-klar.sql` har en
linje, der fanger det.

### Fortryd kan afvises, og det er ikke en fejl

Har gæsten sendt præcis den samme igen, mens den lå i spanden, ville to ens
stå på listen — og køkkenet ville lave maden to gange. Nøglen siger nej, og
beskeden siger hvorfor: *"gæsten har sendt præcis den samme igen, mens den lå
i skraldespanden. Den nye står på listen."* Det samme gælder baglokalet, hvis
dagen er lejet ud til en anden imens.

### Fanen har med vilje ikke et tal på

Et mærke med et tal betyder "her venter noget, du skal handle på", og det gør
der ikke: spanden er et sted, man går hen, når man har lavet en fejl. Et tal
ville gøre den til endnu en liste, personalet skal huske at kigge i — se
advarslen om antallet af faner i `CLAUDE.md`.

### Oprydningen sker ved login

Der er ingen cron i det her projekt, så det, der er ældre end 30 dage,
slettes for alvor, når personalet logger ind. En knap, nogen skal huske at
trykke på, er ikke en oprydning — og en spand, der aldrig tømmes, er et
arkiv over kunders telefonnumre.

### Prøven fandt en prøve, der ikke målte noget

`proev-skraldespand.sql` nr. 7 spørger, om bremsen tæller spanden med. Første
udgave sendte **fire** bestillinger, fik dem smidt ud og sendte igen — og den
bestod, uanset hvad bremsen gjorde: fire er under grænsen på fem begge veje.
Den sender fem nu. Alle 19 prøver er efterprøvet ved at genindføre fejlen i
en kopi af databasen og se præcis den linje blive rød.

Det samme gælder de 15 Playwright-tests: hver eneste er set fejle med
fejlen sat tilbage i koden — en ikke-delvis nøgle, et `fortryd` der ikke
rydder datoen, en tømning der tager det levende med.

## Logbogen: hvem ændrede hvad, og hvornår

`supabase/logbog.sql` + `proev-logbog.sql` (19 prøver), `js/admin/logbog.js`,
nederst på fanen **Historik**.

Der er flere om skærmen. Én står ved lugen, én sidder med iPaden, chefen
kigger hjemmefra. Når en bestilling pludselig står som afvist, er
spørgsmålet ikke "hvad står der" — det er "hvem gjorde det, og hvornår".

### Oprettelser står ikke i logbogen

En ny bestilling er sit eget bevis: rækken ligger der, med navn, telefon og
tidspunkt. En logbogslinje oveni ville være den samme oplysning gemt to
gange — altså **dobbelt så mange steder, hvor en gæsts telefonnummer står**.
Af samme grund gemmes hverken bestillingens linjer eller gæstens egen besked.

Logbogen svarer på "hvem rørte den". Den er ikke en skyggekopi af tabellen
ved siden af, og prøven slår ned på det, hvis den bliver det.

Og `aendret` springes over. Den kolonne ændrer sig ved hver eneste
skrivning og fortæller ingenting; stod den i logbogen, ville hver linje se
ud som en ændring, uanset hvad der skete.

### Den kan ikke rettes — heller ikke af chefen

Der er **ingen** insert-regel og **ingen** update-regel på `logbog`. Linjerne
kommer fra en trigger, der kører `security definer` og derfor er ligeglad med
reglerne. Personalet kan læse og slette, og det sidste kun fordi linjer skal
kunne blive for gamle: de ryddes efter 180 dage ved login.

En logbog, man kan skrive i, svarer ikke længere på det spørgsmål, den findes
for.

### Historik er én fane og ikke to

Skraldespanden og logbogen svarer på det samme: hvad er der sket, og kan jeg
få det tilbage. To faner mere ville gøre personalesiden til en række af
lister, man skal huske at kigge i — se advarslen om antallet af faner i
`CLAUDE.md`. Fanen har ingen badge: et tal betyder "her venter noget, du skal
handle på", og det gør der ikke.

### Øvetilstanden spejler trigger'en

Der er ingen database i øvetilstand, og en logbog, der altid er tom, er ikke
en øvelse — så ville fanen se ud til at virke, indtil den mødte rigtige data.
`js/store.js` skriver derfor de samme linjer lokalt, med den samme
spring-over-liste og den samme afgørelse af, om noget er "rettet", "i
skraldespanden" eller "hentet tilbage".

### En prøve, der bestod uden at måle noget

`proev-logbog.sql` nr. 5 og 6 spørger, om kun det ændrede felt bliver gemt, og
om `aendret` bliver sprunget over. Første udgave rettede rækken med
`aendret = now()` — og `now()` er **transaktionens starttidspunkt**, den samme
værdi hele filen igennem. `aendret` var altså slet ikke ændret, og de to
prøver bestod, uanset hvad trigger'en gjorde. De bruger `clock_timestamp()`
nu. Det tog en fejlindsprøjtning at opdage.

Alle 19 prøver og alle 10 Playwright-tests er set fejle med fejlen sat
tilbage i koden.

## Forsidens rækkefølge

Kunden sendte 21. august 2026 et mobil-først designbundt — **Mosede Mobil
v3**, otte HTML-sider med CSS, JS og et handoff-dokument. Farverne og
skrifterne var allerede vores (sand, marineblå, den røde accent, Bebas Neue
+ Instrument Sans), så det var ikke et nyt tema. Det var de dele, bundtet
havde, som vi ikke havde — og en rækkefølge.

| # | Afsnit | Grund | Den ene ting man kan gøre |
|---|---|---|---|
| — | Hero | foto | Videoen og åbningsstatus. **Ingen knapper** |
| — | Bannere | sand | Næste arrangement og Facebook |
| 1 | **Nyheder** | sand | Tidslinje med de tre nyeste → Alle nyheder |
| 2 | **Dagens ret** | sand2 | Hele bestillingsformularen — ikke et link til den |
| 3 | **Menukortet** | marineblå | Tre afdelinger med tal, der tælles |
| 4 | **Hvad kan vi hjælpe med?** | sand | Seks ærinder, der aftales i telefonen |
| 5 | **Isen** | sand2 | Filmen og kuglerne på tavlen |
| 6 | **Find os** | sand | Åbningstider, adresse, rute, telefon |

Rækkefølgen er ikke smag. Den går fra det, man kan gøre **nu**, over det,
man kan gøre **i denne uge**, til det, man skal **ringe om**. Bytter man om
på den, står "Find os" før man ved, hvad man kommer efter.

### Grunden skifter, og det er derfor siden ikke er én lang side

Kunden skrev det 22. august: *"lav sektionerne tydeligere, så det ikke
føltes som 1 lang forside."*

Det var **ikke afstanden**, der manglede. Der var allerede op til 132 px
luft mellem afsnittene. Fejlen var, at alt stod på den samme sandfarve — og
luft mellem to ting på samme bund læses ikke som "nyt afsnit". Den læses som
"her mangler der noget". Det var dét, der gjorde siden lang.

Tre grunde, og de skifter hele vejen ned:

| Klasse | Farve | Hvorfor |
|---|---|---|
| (ingen) | `--sand` | Sidens egen bund |
| `.grund-varm` | `--sand2` | Fire procent mørkere, med hårstreg foroven og forneden |
| `.grund-dyb` | `--sea` | Sidens ene kraftige skæring, midt på siden |

**Den varme grund er sand2 og ikke papirhvid**, og det er ikke smag:
kortene på siden er selv papirhvide (`.dagenskort`, `.nw`, `.afd-kort`)
eller næsten hvide (`.row-card` på .82). En papirhvid *bund* ville få dem
til at forsvinde i deres egen flade. Sand2 går den anden vej.

**Hårstregerne er ikke pynt.** Sand2 er kun fire procent mørkere end sandet;
uden en streg i kanten kan man ikke se, hvor fladen begynder, på en telefon
i sollys.

To ting kostede det, og begge var målte:

- **`--muted` og `--red-tekst` blev mørkere.** #526e8b gav 4,68:1 mod sandet
  og kun 4,21 mod sand2, hvor kravet er 4,5. #4e6985 rammer 4,53 mod sand2
  og 5,04 mod sandet. Det samme for #c33d27 → #bb3a25. Det var ikke en fejl
  i den nye grund; det var, at 4,68 aldrig var margin nok at bygge på
- **Kortene på den mørke grund skal være tætte.** `.afd-kort` står normalt
  på `rgba(255,255,255,.82)`. Oven på marineblå bliver det cirka #d4d9de, og
  mod den falder de 13 px i `.afd-tal` til 3,4:1. På `.grund-dyb` er kortet
  derfor `--paper`

`tests/forside.spec.js` måler den **malede** bund på hver sektion og kræver,
at to naboer aldrig har den samme. Første udgave sammenlignede
`getComputedStyle(...).backgroundColor` direkte og **bestod**, da grunden
blev sat tilbage til sandets farve: et afsnit uden baggrund svarer
`rgba(0, 0, 0, 0)`, som er forskellig fra alle farver. Prøven går nu op
gennem forældrene til den første massive flade — samme greb som
kontrastmålingen.

### Nyhederne er en tidslinje

Kundens ord, samme dag: *"nyhederne — lad det se bedre og mere spændende
ud."*

Tre ens hvide kort under hinanden er en liste. Det eneste, der stod på dem,
var rækkefølgen — nyeste øverst — og den kunne man ikke se; man skulle læse
tre datoer og selv regne den ud.

Nu tegner en linje ned gennem strømmen med en prik ved hvert kort, og den
**øverste prik er fyldt, rød og ånder**, fordi den er den nyeste. Det er det
eneste, gæsten leder efter i en nyhedsstrøm — "er der sket noget for
nylig?" — og det står nu i formen i stedet for i teksten. Datoen er en
pille, så den kan scannes ned gennem strømmen uden at læse noget.

Linjen tegnes med `::before` på beholderen og prikkerne med `::before` på
kortene. **Ingen ekstra elementer**, altså intet at holde ved lige i
`js/side.js` OG `js/nyheder.js`, som begge bygger de her kort.

`js/nyheder.js` giver tom-beskeden klassen `.nw-tom`. En "der er ikke noget
nyt"-boks er ikke en nyhed, og en pulserende rød prik ud for den ville sige
det stik modsatte af, hvad der står.

### Heroen har ingen knapper

Kunden, 22. august: *"knapperne behøver ikke være der på heroen."*

Der stod to store — "Bestil mad" og "Book et bord" — og på hans telefon lå
den flydende Bestil-pille **oven i den nederste af dem** i højre hjørne. To
knapper til den samme handling, hvor den ene dækkede den anden.

Pillen bliver. Den er den ene handling, den følger med hele vejen ned, og
`js/dagens.js` skriver den om til "Bestil dagens ret", når køkkenet har
skrevet en ret. Book et bord står i topmenuen og i "Hvad kan vi hjælpe
med?". `.glass.stor` er **slettet** og ikke kommenteret ud — en halv stil,
der venter på at nogen genbruger klassenavnet, giver en knap, der ser
forkert ud på en måde, ingen kan finde.

### To go / Spis her ligger i bestillingen nu

Kortene stod på forsiden i et døgn. Kunden bad om at få dem væk igen samme
dag: valget skal ske dér, hvor man alligevel står og vælger mad — *"hvor alt
ruller ned med priser og maden, og man bestemmer, om det er to-go eller spis
her, ligesom med spiis. Meget simplere og enklere."*

Og han har ret i mere end smagen: kortene tvang gæsten til at vælge **før**
hun havde set et eneste stykke smørrebrød, og hun kunne ikke skifte mening
uden at gå tilbage. Nu står spørgsmålet i formularen mellem tidspunktet og
navnet — efter maden, hvor svaret giver mening.

`?hvordan=spis-her` i adressen virker stadig. Et link fra Facebook, en
QR-kode på et bord eller en genvej fra en anden side kan bære valget med, og
har ejeren lukket for spis her i admin, tvinger `visHvordan` det tilbage til
afhentning — adressen kan aldrig love noget, admin har lukket for.

### Ringen over Å skal have plads

Kunden sendte et skærmbillede fra `bestil/`, hvor "SÅ TAGER VI DEN I
TELEFONEN" lå **oven i sin egen eyebrow**, "SKAL DET VÆRE STØRRE?".

Det er ikke en margen, der mangler. Overskrifterne står med
`line-height: .88`, altså en linjeboks, der er **mindre end selve
bogstavet** — det er dét, der giver den tætte stak, når en overskrift er på
to-tre linjer. Prisen er, at alt over versalhøjde stikker ud over boksen
foroven: ringen på Å, stregen på Ø, prikkerne på Ä. Og dansk sætter dem i
første bogstav hele tiden.

`.eyebrow + h1, .eyebrow + h2, .eyebrow + h3 { margin-top: .18em }` — halvdelen
af det, linjehøjden mangler (.06em), plus ringen (~.12em). Det skalerer med
skriftstørrelsen, hvor et fast pixeltal ville være rigtigt på én
skærmbredde og forkert på alle andre. `.side-top h1` havde sine egne 8 px og
vinder over den globale regel (samme vægt, står senere i arket); den har nu
samme em-mål.

Prøven måler hullet på **ti sider** og kræver mindst .15em. Den fanger også
den næste sektion, nogen skriver.

### Bestillingsformularen ligger PÅ forsiden

Første udgave lavede sin egen struktur: et kort med dagens ret, der
**linkede videre** til `bestil/`. Kunden holdt det op mod filerne og sagde
det rent ud — siden skal se ud som bundtet, og i bundtet ligger hele
formularen på forsiden.

Forskellen er ikke pynt. I bundtets udgave lander gæsten, ser hvad der er i
dag, og trykker send **uden at skifte side**. Et link til en anden side er et
sted, halvdelen falder fra.

**Og 23/8 blev det taget helt ud.** Panelet var stadig vores egen, mindre
formular ved siden af den rigtige — 465 linjer i `js/dagens.js`, der byggede
en ringere udgave af det, `js/bestilling.js` allerede kunne. Kunden sagde
det for anden gang, og denne gang om selve maden:

> "er det altså meningen maden skal rulles ned, når man trykker på 1 af de 4
> der, og man kan bestille direkte der uden at skulle ind på 1 side"

`js/dagens.js` er slettet. **Det er nu HELE formularen fra `bestil/`, der
står på forsiden** — de samme folde, de samme tællere, det samme sidste kig,
den samme `Butik.bestil()`. Der er ikke længere to formularer at rette den
samme fejl i.

#### Tre ting er ude af forsidens udvalg

| Ude | Hvorfor | Hvor står det så? |
|---|---|---|
| **Smørrebrødet** | Kundens ord: *"smørrebrød ud af huset skal flyttes væk til en section for sig, for det er en af deres hoved ting og fortjener deres eget bestillings ting"*. Det er også en anden slags bestilling — varsel, mindsteantal og 29 slags fyld | Eget afsnit på forsiden, og hele formularen på **`bestil/`** |
| **Isen** | *"det skal man ikke kunne bestille, det er altid til rådighed"*. Den laves i lugen, mens gæsten står der | Fremvisningen nederst på forsiden, og på menukortet |
| **Levering** | Vi ved ikke, hvad der leveres eller til hvilket område | Ingen steder. En knap, der lover levering, giver en skuffet kunde i telefonen |

Begge de to første er filtre i `Butik.udvalg(d, hvad)` og **ikke** i
opmærkningen: forsidens formular bærer `data-udvalg="uden-smoer"`,
smørrebrødssidens `data-udvalg="kun-smoer"`, og isen er ude af dem begge
(`erIs()` i `js/store.js`). Lå filtrene i HTML'en, ville de skride fra
hinanden den dag, admin får et flueben mere.

Isen har derfor **heller ikke et flueben i admin** længere. Et flueben, der
ikke gør noget, er værre end ingen: personalet sætter det og leder bagefter
efter fejlen på en side, der gør præcis det, den skal.

#### Er der ikke noget at bestille, findes afsnittet ikke

Forsiden sælger alt undtagen smørrebrødet, og på forretningen, som den ser
ud i dag, er der ikke åbnet for andet end smørrebrødet i admin. Så er
listen tom — og det er **ikke** en fejl.

Beskeden, en tom liste gav, var derimod fejlens: *"Vi kan ikke hente
udvalget lige nu. Ring til os."* Den ville stå på forsiden hver eneste dag
og sende gæster til telefonen uden grund. Nu forsvinder hele afsnittet i
stedet, som resten af forsiden: er der ikke noget at gøre, findes afsnittet
ikke. Og den flydende pille følger med — den peger på `bestil/`, hvor der
faktisk kan bestilles, og forsvinder helt, hvis der heller ikke er
smørrebrød.

Reglen gælder kun, hvor formularen er ét afsnit blandt flere
(`data-tom="skjul"`). På `bestil/` **er** formularen siden, og dér skal
beskeden stå.

#### Grundene veksler efter det, der FAKTISK står der

Sektionsfarverne stod skrevet i HTML'en, og de vekslede rigtigt — dengang
alle afsnit altid var der. Nyhederne, bestillingen og smørrebrødet skjuler
sig hver især, når der ikke er noget i dem, og så stod to sandfarvede
naboer op ad hinanden. Præcis den fejl, skiftet skulle rette
(se "Grunden skifter").

`vekslGrunde()` i `js/side.js` sætter derfor `.grund-varm` på hver anden
**synlige** sektion, til allersidst når alle afsnit har besluttet, om de
findes. Menukortets `.grund-dyb` røres ikke — den er sidens ene kraftige
skæring — men den tæller med i vekslingen, så afsnittet efter den starter
forfra på sand.

#### bestilling.js skal indlæses FØR side.js

Den værste fejl i hele runden, og den kostede en halv time, fordi den ikke
lignede en fejl: formularen på forsiden var **tom** — nul dage, nul varer —
og der stod **ikke ét ord** i konsollen.

`js/side.js` giver dataene videre med `MosedeBestilling.start(d)` inde i
`Butik.hent().then(...)`. I øvetilstand er der ingen database, så `hent()`
svarer med det samme, og `.then`-tilbagekaldet er en **microtask**: den
køres, når den nuværende opgave er slut — altså i slutningen af `side.js`'
eget script, **før browseren når at læse det næste `<script>`-tag**. Så var
`window.MosedeBestilling` ikke defineret endnu, og `if (window.…)` sprang
bare over.

Med skyen slået til gik det tilfældigvis godt: dér er `hent()` et rigtigt
netkald, og alle scripts er læst, længe før svaret kommer. **Det er den
værste slags fejl: den virker på udviklerens maskine.**

#### Bestilt er bestilt

Kunden fjernede løftet om en opringning:

> "jeg ved godt hvad der står i readme med ring og bekræft, men fjern det.
> De skal nok ringe og afbekræfte, hvis de ikke kan få bord osv. Alt skal
> kunne administreres — ikke noget med ring; man får deres oplysninger til
> netop sådan noget."

Kontakten `auto_bekraeft` i admin findes stadig og virker begge veje, men
**standarden er vendt**: den er TIL. Kvitteringen siger "Bestilt. Hentes
…", og manchetten over formularen siger, hvad der gælder. Slår ejeren den
fra, siger begge tekster igen, at der bliver ringet — teksterne følger
kontakten, for begge løfter på samme tid ville være det værste af begge
verdener.

### Heroen som på spiis (justeret 21/8 efter kundens skærmbilleder)

- **Åbningsstatussen er en lille pille i heroens hjørne**, med en prik der
  ånder. Den fyldte en hel knapbredde mellem knapperne, men den er et *svar*,
  ikke en handling — og et svar hører hjemme dér, hvor øjet lander først.
  Ved lukket står prikken stille: der er ingenting at pulsere om.
- **To stablede knapper i fuld bredde**: Bestil dagens ret (rød) og Book et
  bord (glas). To halve knapper side om side lignede et valg mellem
  ligeværdige; stakken siger rækkefølgen.
- **Den flydende pille er der hele tiden**, som spiis' — rød liquid glass med
  slør bagved, og den fører ned til bestillingen. Den gemte sig før, mens
  heroens egen knap var på skærmen; kunden bad om forbilledets faste selskab,
  og to røde knapper i første skærmbillede er prisen, taget med åbne øjne.

Både heroens store knap og pillen peger **to steder hen**, med vilje. De står
i HTML'en som "Bestil mad" med bestillingssiden bagved, og `js/dagens.js`
skriver dem om til `#dagens`, når panelet er der. En knap, der peger på et
afsnit, som ikke findes, er værre end en, der peger et andet sted hen — og
rækkefølgen betyder, at en fejl i scriptet efterlader den *virkende* udgave.

### Emojier som midlertidige madbilleder

Der findes ingen fotos endnu, og rene ord ligner knapper til et regneark.
Genvejsstriben, dagens ret-panelets rækker og menukortets tre afdelingskort
har fået emojier (🥪 🍔 🍦 🥤), og afdelingskortenes overskrifter er røde som i
bundtets skærmbillede. Emojierne står i deres **eget span med aria-hidden** —
en skærmlæser skal sige "Smørrebrød ud af huset", ikke "sandwich Smørrebrød…",
og prøverne læser overskrifternes tekst, hvor "🍔 Mad" ikke er "Mad". Når
billederne kommer søndag, er det emojierne, der afløses først.

### En tredje rød: `--red-dyb`

Mærkepillen *"DAGENS RET · 95,-"* står ikke på sand. Den står på en lys rød
flade oven på en anden lys rød flade — `rgba(209,70,47,.12)` oven på `.06`
oven på panelhvid — og summen er cirka `#f7ddd5`. Mod den giver `--red-tekst`
kun **4,06:1**, og teksten er 10,5px, hvor kravet er 4,5.

`#a8321f` rammer **4,82**. Den bruges kun dér: en dybere rød mod sand ville se
sort ud ved siden af de andre.

Forsiden har været **ni** afsnit (et katalog, man skulle læse sig igennem)
og **fire** (for få: menukortet og nyhederne kunne slet ikke nås).
`tests/forside.spec.js` holder rækkefølgen fast, og at hvert afsnit har
**højst én rød knap** — to røde er ikke ét valg.

### Bannerne

To slags, fra hver sin kilde:

| Banner | Kilde | Skjuler sig når |
|---|---|---|
| `.bn.musik` | Næste offentlige arrangement i `kalender` | Der ikke er et på vej |
| `.bn.besked` | Indstillingen `dagens_besked` | Den er slået fra |
| Facebook | `MOSEDE.social.facebook` | Adressen er tom — altså **altid** i dag |

Filteret på `type === 'arrangement'` og `offentlig !== false` er ikke pynt:
kalenderen er **én** tabel med tre typer, så en lukkedag er også en
kalenderrække, og personalets interne noter må ikke ende under heroen.
Adgangsreglen i databasen holder det tilbage mod skyen, men i øvetilstand
er der ingen regel — så filteret i klienten skal også være der.

**Lukningen huskes pr. besked**, ikke pr. banner. Nøglen i `localStorage`
indeholder selve teksten. Gemte vi bare "beskedbanneret er lukket", kunne
personalet aldrig råbe gæsten op igen: hun lukkede beskeden om
kortterminalen i maj og så aldrig beskeden om ændrede åbningstider i juli.
Listen er skåret til de tyve nyeste — uden loftet vokser den med hver
besked, forretningen nogensinde har skrevet, og den ligger i gæstens
browser for evigt.

Højden **måles**, lige før banneret lukkes. `max-height` kan animeres,
`height: auto` kan ikke — og starter animationen fra CSS-loftet på 320 px i
stedet for bannerets egen højde, sker de første 200 pixel uden at man ser
noget.

### Nyhederne ligger som andet afsnit (21/8)

Kundens omrokering: "Sidste nyt fra lugen" ligger lige efter bannerne, og
dagens ret en tak nede. **Isfilmen var en overgang baggrund under
nyhederne** — gennemsigtige glaskort oven på filmen, engangsafspilning, frys
på solnedgangen — men kunden så den og bad om animationen, som den var før.
Filmen er hjemme i isafsnittet igen med ramme, smelter, loop og
afspil-knap; kun **placeringen af nyhederne** blev.

Læren står i git-historikken (`6038b31` byggede det, tilbagerulningen
fulgte): flyt én ting ad gangen, når kunden peger på et sted — placering og
opførsel er to beslutninger, ikke én.

### Nyhederne — skuffen er åbnet

Tabellen `nyheder` og fanen i admin har eksisteret siden fase 1. Men der var
**ingen side, der viste dem**. Personalet skrev ind i en skuffe, ingen
åbnede — og en funktion, ingen kan se virke, holder folk op med at bruge.

Nu: de tre nyeste på forsiden i et marineblåt afsnit, resten på `nyheder/`
med fuld SEO. Afsnittet findes ikke, når der ingen nyheder er; en
overskrift, der siger "Sidste nyt" over ingenting, fortæller gæsten, at der
aldrig sker noget her.

**Der er ingen anmeldelser.** Designbundtet havde et kort med "4,8 · 312
anmeldelser på Google" og citatet *"Bedste fiskefilet på hele Sydkysten"*.
Ingen af delene findes: der er ingen Google-profil i `js/oplysninger.js`, og
der er aldrig hentet en eneste rigtig anmeldelse.

### Afdelingskortene — tallene tælles

Menuoversigten var her, blev fjernet som "en indholdsfortegnelse midt på
siden", og er tilbage i bundtets form. Forskellen er, hvad der står på
kortene: dengang en stak kategorinavne, nu afdelingens navn stort og **to
tal**, der tælles på det rigtige menukort. Skriver personalet en vare ind,
går tallet op af sig selv.

En kategori **uden varer** tælles ikke med. Det er ikke en afdeling af
menukortet; det er en overskrift, nogen har oprettet og ikke fyldt endnu.

Bundtet skrev "7 kategorier · 78 varer". Ingen ved, hvor de tal kom fra.

### Rækkekortene i stedet for firkanter

De seks ærinder var et net af firkanter. Bundtet gør dem til brede rækker
med et ikon til venstre og en pil til højre, og det er bedre: på en telefon
kan man scanne seks rækker med tommelfingeren nedad, mens seks kvadrater
tvinger øjet frem og tilbage to ad gangen.

De lover stadig ingenting. Bundtet skrev "40 pers." på baglokalet, "borde
2–12" på bordene og "fra 24,-" på smørrebrødet — i selve menuen, hvor de
ligner oplysninger og ikke reklame. Ingen af tallene er bekræftet.

### Hero-parallaksen

Baggrunden glider med **0,16 gange** rullehastigheden, med loft ved 640 px.
Kun `transform`, rAF-strubet, slået fra ved reduceret bevægelse.

`.hero .bg` har **20 % ekstra i toppen** at trække ned fra. Uden det ville
fotoets øverste kant komme ind på skærmen efter en halv skærms rulning, og
så stod der en marineblå bjælke over billedet. Strimlen klippes af `.hero`s
egen `overflow: hidden` og ses aldrig — den er der kun for at have noget at
trække ned fra.

### Det bundtet allerede havde hos os

`.phead` er **ikke** bygget. Det mørke sidehoved fandtes: `.smoer-hoved` +
`.side-top` + `.mork-top`, bygget til smørrebrødssiden først og siden
overtaget af de andre seks. Navnet er skævt, men det er ikke to systemer —
og to klasser, der gør det samme, er præcis sådan, to sider langsomt kommer
til at se forskellige ud.

Det, bundtet manglede hos os, var at **menukortet** ikke havde hovedet. Man
landede et sted, der lignede forsiden uden at være det. Det har det nu, og
alle otte undersider har fået **tilbage-pilen**: skuffemenuen er tre tryk
væk fra "tilbage", og telefonens egen tilbage-knap findes ikke på iOS uden
en kant-svirp, mange ikke kender.

Bølgen med sejlbåden i bundtets footer havde vi også — `js/baad.js`, samme
matematik, men som sidens rullemåler i bunden af skærmen.

### Kortene er talt, prislisten er menukortet

Hvert kort under Bestil mad er en slags, gæsten kan bestille: navnet fra
menukortet, et **tællt** antal ("1 slags stykker · 2 slags fyld") og den
**laveste pris, der faktisk står i kortet** ("fra 89,-"). Ikke en prisliste
— prislisten er menukortet, og der er ét link til den.

Kortet fører til `bestil/?slags=…`, så bestillingssiden åbner på præcis den
slags, der blev trykket på.

**Dagens ret** står øverst i blokken, når køkkenet har skrevet en i admin
under Forside. Navn er det eneste påkrævede; beskrivelse og pris er
frivillige, og en pris, ingen har skrevet, bliver ikke gættet. Er der ingen
ret, er kortet væk — afsnittet bliver.

Er der **ingenting** at bestille, findes hele afsnittet ikke.

### Billederne mangler stadig

Blokkene er tekst på farvede flader, fordi der ikke findes fotos af maden.
Kommer de, hører de på slags-kortene og i isafsnittet. Det er dét, der gør
spiis' forside god, og den eneste del, vi ikke kan bygge selv.

### Isfilmen hentes tidligere nu, og det er en byttehandel

Filmen hentes, når isafsnittet er inden for 900 px af skærmen. Lead-tiden
er dét, der gør, at den kan køre igennem uden at hakke.

Da forsiden gik fra ni afsnit til fire, blev isen det **andet**, man møder —
og på en telefon er den derfor inden for de 900 px allerede ved
indlæsning. Filmen bliver altså hentet på hvert mobilbesøg.

Det er bevidst. Før nåede de færreste ned til den; nu ser alle den, og så
er det bedre, at den er klar, end at den hakker. Vægten **før siden er
brugbar** måles stadig i `tests/vaegt.spec.js`, og der tæller filmen ikke
med: den ligger efter introen.

De to tests, der målte "ikke hentet endnu", kører kun på computer nu —
der er afsnittet stadig langt nok væk til, at reglen kan ses arbejde.

## Formularkortet — én form på alle fire formularer

`bestil/`, `selskaber/`, `bord/` og `baglokale/` er det samme for gæsten:
hun skriver noget, og forretningen ringer. Så skal de også **se** ens ud.
Før havde de hver deres — samme felter, men formularen lå direkte på sandet
og flød ud i siden.

Formen er spiis.dk's, som kunden bad om, i havnens farver:

- **Ét hvidt kort** på sandet, stor runding, luft omkring
- **Fede, mørke etiketter over feltet.** En etiket, der svæver inde i
  feltet, forsvinder i det øjeblik man begynder at skrive
- **Bløde felter** i stedet for en hård 1 px ramme. Rammen gjorde
  formularen til et regneark; fladen gør den til noget, man skriver i.
  52 px høje, 16 px skrift — er skriften mindre, zoomer iPhone ind af sig
  selv, når feltet får fokus
- **Grupperne som fuldbredde-bjælker** med luft imellem, ikke rækker i en
  tabel
- **Tælleren som én pille** — de to knapper hørte ikke sammen før
- **Den valgte linje med rød ramme**, ikke en skygge. Rammen kan ses i
  sollys; det kan en skygge ikke
- **Én stor knap i bunden**, fuld bredde, og den eneste i kortet med den
  farve

Alt er scopet til `.form-kort`. Personalesiden bruger de samme klasser —
`.felt`, `.fold-hoved`, `input`, `select` — og en regel uden scope ville
lave hele admin om. **Det er sket:** en klasse, der hed det samme to steder,
farvede hvert bestillingskort i admin mørkeblåt med usynlig tekst. Se noten
ved `.slags-kort`.

## Dørene: forsiden bestiller maden, bestil/ bestiller smørrebrødet

`js/bestilling.js` er formularen — én fil, to steder. `js/bestil.js` er
rammen omkring den på `bestil/`: status, note, telefon.

Formularen lå på `smoerrebroed-ud-af-huset/`. Det var rigtigt dengang: den
var det ene sted, man kunne bestille noget. Så kom model A, køkkenet kunne
også tage imod grill og café — ejeren sætter selv fluebenene i admin — og
både "spis her" og "tag med". En adresse, der siger smørrebrød, passede
ikke længere til det, der stod på skærmen, og formularen flyttede til
`bestil/`.

**23/8 blev den delt i to.** Kunden ville kunne bestille dér, hvor maden
står — altså på forsiden — og han ville have smørrebrødet for sig selv:

> "smørrebrød ud af huset skal flyttes væk til en section for sig, for det
> er en af deres hoved ting og fortjener deres eget bestillings ting"

| Siden | Job |
|---|---|
| `index.html` (afsnittet `#bestil`) | Dagens ret, stykkerne, grillen, caféen — alt det, der kan bestilles. **Uden** fyldet og isen |
| `bestil/` | Smørrebrødets byggeri: stykkerne MED de 29 slags fyld, varslet og mindsteantallet |
| `smoerrebroed-ud-af-huset/` | Salgs- og søgesiden for "smørrebrød ud af huset i Greve". Viser sortimentet og fører ind i `bestil/` |

Det er **den samme formular** begge steder — samme motor, samme folde,
samme sidste kig, samme `Butik.bestil()`. Forskellen er ét attribut:

```html
<form id="bestil-form" data-udvalg="uden-fyld" data-tom="skjul">   <!-- forsiden -->
<form id="bestil-form" data-udvalg="kun-smoer">                    <!-- bestil/ -->
```

**Skellet lå ét sted forkert i en dag.** Første udgave brugte
`uden-smoer` på forsiden og tog HELE smørrebrødet ud. Det var rigtigt
tænkt — smørrebrød ud af huset ER en anden slags bestilling — men
forretningen har ikke åbnet for andet i admin endnu, så forsidens
liste blev tom, og afsnittet skjulte sig selv. Kunden så det med det
samme:

> "nu er bestillings tingen væk fra sectionen nummer 2 — det der,
> det skal rulle ned, og man primært skal bestille"

Skellet går et andet sted nu: **et stykke smørrebrød er mad** og
hører i listen sammen med grillen. Det, der bliver på `bestil/`, er
**byggeriet** — de 29 slags fyld, varslet og mindsteantallet. Det er
den anden slags bestilling, kunden talte om, og den fylder en hel
side. `uden-smoer` bliver stående i `Butik.udvalg`: reglen kan blive
rigtig igen den dag, køkkenet har åbnet for nok andet.

Læren er værd at holde fast i: **et filter, der er rigtigt tænkt, kan
være tomt i praksis.** Spørg altid, om afsnittet stadig har noget at
sælge på forretningen, som den ser ud i dag.

`Butik.udvalg(d, hvad)` i `js/store.js` er stedet, hvor de to udvalg deles,
og isen filtreres fra i dem begge. Lå delingen i opmærkningen, ville de to
sider skride fra hinanden den dag, admin får et flueben mere.

### Hvad skal det være?

Kategorierne står som **folde i selve listen**, med ejerens egne
kategorinavne fra menukortet — ingen har fundet på ordene i koden. Står der
Burgere i menukortet, hedder folden Burgere.

Her stod der engang en række chips over listen med de samme navne. Kunden
holdt spiis' form op (23/8), og dér er der ingen chips: alle kategorier er
folde i én liste. To måder at vise det samme udvalg på er én for meget — og
chippen var farlig oveni: den kunne gemme to bestilte burgere bag et tal,
gæsten skulle huske at kigge på. Folden viser antallet på sit hoved, også
når den er lukket.

Den første fold står åben. En liste, hvor alt er lukket, ligner et
menukort, nogen har gemt væk.

### En tom liste er ikke en fejl

På forsiden kan listen være tom — har ejeren ikke åbnet for andet end
smørrebrødet, er der ikke noget dér at bestille. Beskeden, en tom liste
gav, var fejlens: *"Vi kan ikke hente udvalget lige nu. Ring til os."*

Nu forsvinder hele afsnittet i stedet (`data-tom="skjul"`), og den flydende
pille peger på `bestil/`. På `bestil/` **er** formularen siden, og dér skal
beskeden stå — derfor er reglen et attribut og ikke en regel i koden.

### Fejlen, flytningen kostede

Da listen blev delt op i slags, blev **grupperne** filtreret på den valgte
slags — men ikke **varerne**. Den første vare fra en anden slags havde ingen
gruppe at lande i, og hele tegningen væltede med `Cannot read properties of
undefined`. Fejlen blev fanget af `.catch`, og gæsten mødte "Vi kan ikke tage
imod lige nu" på en side, hvor hverken databasen eller åbningstiderne fejlede
noget.

Den slags er værre end en fejl, der siger, hvad den hedder. Der er en test for
den nu: `tests/bestil-doeren.spec.js` sætter en kategori åben og måler, at
fejlboksen **ikke** kommer.

### Den flydende pille — hvor den er, og hvad den peger på

Heroen havde fire lige store piller, så to store knapper, og til sidst
ingen: kunden bad om at få dem væk (22/8), fordi den flydende pille lagde
sig oven på den nederste af dem. **Pillen er forsidens ene handling.**

Tre regler gælder den:

- **Kun på forsiden** (kundens ord 23/8). Den er genvejen NED til
  formularen. På `bord/` eller `catering/` ville den samme pille være en rød
  knap, der fører VÆK fra den formular, gæsten står midt i
- **Den peger på det, der findes.** `#bestil` når afsnittet er der,
  `bestil/` når det ikke er, og den forsvinder helt, hvis der heller ikke er
  smørrebrød. En rød knap, der ruller ned til ingenting, er værre end ingen
  knap
- **Den viger for kurven.** Begge er `position: fixed` i bunden. Er der
  noget i kurven, er gæsten der allerede, og kurven skal have pladsen

Den er synlig som udgangspunkt i HTML'en, og JavaScript skjuler eller
flytter den. Vendte det den anden vej, ville en fejl i et script betyde, at
knappen til det, forretningen sælger, forsvandt helt.

**Og den må ikke ligge oven i heroens tekst.** Det gjorde den: manchetten og
"Rul ned" lå begge bag den på en iPhone 13. Heroen havde 67 px luft i
bunden, pillen fyldte 70 — hver regel så rigtig ud for sig, og det er
summen, der er forkert. Begge tal regnes ud af den samme `--pille-plads` nu,
og en prøve måler kasserne mod hinanden.

### Topmenu og skuffe bygges ét sted

De var skrevet af ni gange, og "Smørrebrød" stod derfor ni steder, der skulle
rettes hver for sig. De er nu ens på alle sider, og en test går hver eneste
side igennem og slår ned, hvis den gamle tekst er blevet stående ét sted. To
navne til den samme dør er to døre for gæsten.

### Salgssiden henter ikke formularens kode

`bestilling.js` er 26 kB. En formular, der ikke findes på siden, skal ikke
hentes over en mobilforbindelse — og en test tæller efter.

## Overblikket er en vagtskærm

Kundens ord (23/8): *"overblikket er heller ikke så godt — det er
dér, de bør stå, når de er på arbejde og modtager bestillinger."*

Fanen var bygget om spørgsmålet **"hvad er tikket ind, mens jeg
ikke kiggede"**, sorteret efter hvornår bestillingen kom ind.
Begrundelsen stod i filen, og den var god: en bestilling til på
fredag, der kom for en time siden, skal ses NU — for det er nu,
der skal ringes og bekræftes.

**Den begrundelse faldt bort samme dag.** Bestilt er bestilt;
`auto_bekraeft` er slået til som standard, og der ringes ikke
længere for at bekræfte. Tilbage stod en rækkefølge uden en grund.

### Målingen

Fem bestillinger, klokken 13.00:

| | Henter | Bestilte | Stod som nr. |
|---|---|---|---|
| Anna Vind | 13.15 | for 6 min. siden | 1 |
| **Sara Dam** | **18.00** | for 9 min. siden | **2** |
| Jonas Berg | 13.30 | for 22 min. siden | 3 |
| Mette Holm | 14.00 | for 48 min. siden | 4 |
| Peter Lund | 17.30 | for 2 timer siden | 5 |

Sara henter fem timer senere end alle andre og stod som nummer to.
Køkkenet skulle læse fem kort igennem for at finde ud af, hvad der
skulle laves først.

### Sådan er den nu

```
NU OG DE NÆSTE TIMER      to timer frem, i tidsrækkefølge
  12.45  Anna Vind    OVERSKREDET
  13.15  Jonas Berg   NY
  13.45  Mette Holm   NY

SENERE I DAG              resten af dagen
  17.30  Peter Lund
  18.00  Sara Dam     🚗 Leveres

NYT TIL ANDRE DAGE        tikket ind, men skal hentes en anden dag

I DAG                     tallene, som før
```

Klokkeslættet står **først og i sin egen kolonne**, ikke inde i en
sætning. Personalet skal kunne løbe kolonnen ned med øjet og finde
"18.00" uden at læse fem navne først — det er hele forskellen på en
liste og en arbejdsseddel.

**Det færdige er ikke med.** En afhentet bestilling er ikke arbejde
længere, og en afvist skal ikke laves. Stod de der, ville listen
vokse hen over dagen, mens det, der skulle laves, blev skubbet ned.

**Overskredne bliver stående øverst** og får rød tid. En gæst, der
skulle have hentet kl. 13.15 og ikke har, er ikke mindre vigtig kl.
13.20 — hun er mere.

**Bordene er med på samme skærm.** Køkkenet skal vide, at der
kommer seks personer kl. 18, samtidig med at de ser maden.

**"Nyt til andre dage" beholder det, den gamle rækkefølge var god
til:** en bestilling til på fredag, der lige er kommet ind,
forsvinder ikke ud af syne, til fredag kommer. Den står bare ikke
øverst længere. Og dagens ting står **ét sted** — to kort om den
samme bestilling er ikke to oplysninger.

---

## Fanerne ligger i bunden på en telefon

De stod som en ombrudt række piller øverst. Målt på en iPhone 13:

> Fjorten faner i syv rækker fyldte **344 px** og sluttede først
> **599 px** nede på en **844 px** skærm.

**71 % af skærmen var navigation**, før personalet så en eneste
bestilling — og de skulle rulle forbi den hver gang de skiftede
fane.

Nu ligger de i en fast stribe i bunden, som i en app:
tommelfingeren er der i forvejen, og hele skærmen ovenover er
indhold. Striben ruller sidelæns, fordi fjorten punkter ikke kan
stå på 390 px.

**Den valgte fane ruller sig selv frem.** Skiftes fane fra et kort
i overblikket, kan den, der bliver valgt, ligge uden for kanten:
skærmen skifter, men striben viser stadig Overblik som markeret, og
personalet kan ikke se hvor de er. `scrollIntoView` med
`inline: 'nearest'` flytter kun, hvis den faktisk ligger udenfor —
ellers ville striben hoppe ved hvert eneste faneskift.

`position: fixed` og ikke `sticky`: en sticky bundbjælke i en lang
liste hopper op og ned, når siden gummibåndsruller på iOS.

Der er **76 px luft i bunden** af `.admin-lag`, så det sidste kort
ikke ligger under striben. Uden den kan man ikke trykke "Afhentet"
på dagens sidste bestilling.

**Fra 900 px og op er det stadig sidemenuen.** Personalesiden er
computer- og iPad-først — se afsnittet om hvem der sidder med hvad.

### Tre prøver, der blev skrevet og kasseret

Prøven "striben dækker ikke det sidste kort" tog fire forsøg, og de
tre første målte alle det samme forkerte:

1. `scrollTo(document.body.scrollHeight)` landede **74 px** før
   bunden.
2. `scrollTo(documentElement.scrollHeight)` landede **376 px** før
   — springet blev afbrudt af `scroll-behavior: smooth`.
3. `scrollIntoViewIfNeeded()` ruller **mindst muligt** og ved ikke,
   at der ligger en fast stribe over bunden.

Alle tre meldte, at kortet lå under striben. Det gjorde det også:
man var bare ikke rullet ned til det endnu. Den fjerde slår den
bløde rulning fra og måler **layoutet, ikke animationen**.

Og prøven "dagen står i tidsrækkefølge" bestod først, selv da
sorteringen blev pillet ud — testdataene lå tilfældigvis i samme
orden som klokkeslættet. Den målte ingenting. Nu står de omvendt.

---

## Hentes eller leveres: to sider, to spørgsmål

`bestil/` stillede lugens spørgsmål. Under **Hvordan vil I spise?**
stod *To-go* og *Spis her* — på mad, der pr. definition er ud af
huset. Kundens ord (23/8): siden skal være egnet til smørrebrød ud
af huset, *"om det afhentes eller skal leveres — det skal ik bare
være det samme"*.

Spørgsmålet følger nu `data-udvalg` på formularen:

| Udvalg | Side | Spørgsmål | Svar |
|---|---|---|---|
| `uden-smoer` | forsiden | Hvordan vil I spise? | 🥡 To-go · 🍽️ Spis her |
| `kun-smoer` | `bestil/` | Hentes eller leveres? | 🥡 Vi henter selv · 🚗 I leverer |

Det er stadig **ét modul**. `hvordanValg()` og `kanAndetSvar()` i
`js/bestilling.js` slår op i udvalget — ikke i adressen i browseren.
En ny side med det samme udvalg får dermed det rigtige spørgsmål af
sig selv, i stedet for at nogen skal huske at rette en liste over
stier.

### Levering er slået FRA som standard

Og det er med vilje modsat `spis_her`, som er slået **til**.
Forretningen har trædækket, og det har de altid haft — men vi ved
ikke, om de leverer, hvor langt de kører, eller hvad det koster.
Ingen af delene er bekræftet; se listen **Ejeren skal bekræfte**.

En side, der tilbyder levering, fordi ingen har sagt nej, lover
noget på forretningens vegne. Derfor `=== true` og ikke
`!== false`: en database uden nøglen viser fluebenet **tomt**.

### En levering bekræftes aldrig automatisk

Heller ikke når `auto_bekraeft` står til — og den er slået til som
standard.

Vi kan love, at maden bliver lavet: det er køkkenets eget arbejde.
Vi kan **ikke** love, at den kan køres til en adresse, vi ikke
kender. Skrev siden *"Bestilt. Leveres lørdag kl. 12"* til en
adresse i Roskilde, ville den have lovet noget, ingen har lovet —
og gæsten ville opdage det, når maden ikke kom.

Kvitteringen siger i stedet: *"Vi ringer til dig og bekræfter, at
vi kan køre til adressen."* Reglen bor i `visTak()` og har sin egen
prøve, som er set fejle.

### Databasen håndhæver sammenhængen begge veje

`supabase/levering.sql` giver `hvordan` det tredje svar og lægger
`leverings_adresse` til. Reglen
`bestilling_levering_adresse_ok` siger:

```
hvordan = 'levering'  →  adressen SKAL være der (5–300 tegn)
hvordan ≠ 'levering'  →  adressen SKAL være tom
```

**Den anden halvdel er den vigtige.** Uden den kunne en adresse
blive stående, efter gæsten skiftede fra levering til afhentning —
og så kører køkkenet ud med mad, som nogen står og venter på ved
lugen. Ingen af de to ting ser forkerte ud hver for sig, og begge
er gået galt, før nogen opdager det.

`btrim` i reglen er ikke pedanteri: `'   '` er ikke et sted, nogen
kan køre hen, og gæsten kan trykke sig igennem med mellemrumstasten.

`supabase/proev-levering.sql` skriver **ALLE 8 AF 8 BESTOD**.
Droppes reglen, fejler præcis prøve 4, 5, 6 og 7 — det er prøvet.

**Hver prøve har sit eget telefonnummer**, og det er heller ikke
pedanteri. Første udgave brugte det samme hele vejen, og så slog
**bremsen** til fra prøve 2: to bestillinger fra samme nummer inden
for en time afvises. Prøve 2 og 3 meldte FEJLEDE om regler, der
virkede fint — og værre: prøve 4 til 8 meldte BESTOD, fordi
indsættelsen blev afvist af bremsen i stedet for af den regel,
prøven handler om. Otte svar, hvoraf seks var løgn.

### I admin

Bestillinger, der skal køres ud, får mærket **🚗 Leveres** i rødt
(`m-ny`) og ikke i sandfarve. Det er det eneste på kortet, der
ændrer, hvad der skal **ske**: ser personalet en levering som en
almindelig afhentning, står maden klar ved lugen, mens gæsten
venter derhjemme.

Sms-nødudgangen skriver adressen med — den er nødudgangen, når
databasen ikke svarer, og en levering uden adresse er ubrugelig.

---

## SEO

GitHub Pages-adressen er ikke indekseret. Fundamentet er lagt:

- Unikke titler og beskrivelser pr. side, med længder der ikke bliver klippet af.
- `canonical` på hver side, så to adresser til samme side ikke deler Googles
  vurdering i to.
- **JSON-LD** af typen `Restaurant` med navn, adresse, koordinater, telefon,
  prisklasse, køkken og link til menuen. Skrevet ind i siden som statisk markup,
  så en søgemaskine der ikke kører JavaScript også kan læse den.
- Absolutte adresser i `og:image` og JSON-LD. Facebook henter billedet fra sin
  egen server og kan ikke slå en relativ sti op.
- `robots.txt` og `sitemap.xml`. Personalesiden er holdt ude af begge, og har
  desuden `noindex` i sit eget hoved — to spærrer, fordi `robots.txt` kun er en
  anmodning.

**Åbningstiderne står med vilje IKKE i JSON-LD.** De ligger i databasen og kan
ændres af personalet, og et forkert skema i Google er værre end ingen: så står der
"åbent" når der er lukket. Det skal bygges af admin når skemaet er stabilt.

`tests/seo.spec.js` læser `js/oplysninger.js` som data og sammenholder hvert felt
med JSON-LD på hver side. Uden den test er "én kilde til oplysningerne" bare en
påstand i en kommentar: markup og konfiguration ville skride fra hinanden, og så
fortæller vi Google én adresse og gæsten en anden.

## Demo-indhold: hele siden op at køre på ét kald

**Demoen opretter også tre borde** — `DEMO 7`, `DEMO 8` og `DEMO Terrassen` —
og én bestilling, der er scannet fra bord DEMO 7. Uden mindst ét bord kan
ingen QR-kode bestille noget, og `ved-bordet/` ville sige "bordbestilling er
ikke sat op endnu", hvilket ligner en fejl, når man lige har kørt demoen.
Bordene hedder `DEMO …` med vilje: `ryd-demo.sql` kender dem på navnet, og et
rigtigt bord 7, ejeren selv har oprettet, må ikke kunne blive ryddet væk
sammen med demoen.

Forsiden **skjuler** de blokke, der ikke har noget at vise — dagens ret,
bannerne, nyhederne og kuglerne på tavlen. Det er med vilje: en overskrift
over ingenting fortæller gæsten, at der aldrig sker noget her.

Men det betyder også, at en **tom database ser ud som en halv side**, og det
er ikke det, man vil vise frem. `supabase/demo-indhold.sql` fylder det hele
ud i ét kald — både gæstesiden og personalesiden.

| Den skriver | Så kommer |
|---|---|
| Dagens ret | Hele bestillingspanelet på forsiden |
| **To** offentlige arrangementer | Livemusik-banneret under heroen + `arrangementer/` |
| En **intern** kalendernote | Står i admin og aldrig på hjemmesiden |
| En tidlig lukning tre uger ude | Viser, at kalenderen kan mere end lukkedage |
| Fem nyheder | Tidslinjen på forsiden + `nyheder/` |
| Fem kugler på tavlen | Pillerne i isafsnittet |
| Fire bestillinger i tre statusser | Overblik, Bestillinger **og** Salg |
| En forespørgsel, to bordønsker, en udlejning | De tre andre lister i admin |

**Livemusik-banneret kommer herfra.** Det viser det næste offentlige
arrangement, og var det væk, var det fordi kalenderen var tom — ikke fordi
der var noget i vejen med koden. Admin siger det nu selv på kalenderfanen,
når der ikke er et kommende arrangement.

### Fem ting er tænkt igennem, og alle fem er kørt på en rigtig Postgres

- **Den standser, hvis den står det forkerte sted.** Findes forretningen
  `mosede` ikke, eller hedder den ikke noget med Mosede, afbrydes hele
  filen, før den skriver en eneste række. 18. august blev spiis' setup.sql
  kørt i Mosede-projektet, fordi to faner lignede hinanden; en advarsel i en
  kommentar er ikke et værn, det er et håb.
- **Den standser, hvis der er lukket.** Sæsonlukning eller "tag imod
  bestillinger" slået fra betyder, at databasens udløser afviser hver eneste
  bestilling — så ville halvdelen af demoen lande og resten fejle, og
  fejlteksten ville pege på en udløser i stedet for på kontakten. Filen
  åbner dem **ikke** selv: en lukket sæson er ejerens beslutning, og en fil,
  der lydløst åbner en lukket forretning på dens egen hjemmeside, må ikke
  findes.
- **Datoerne regnes ud.** Arrangementerne lægges på de to førstkommende
  lørdage, og bestillingerne på den første dag, der hverken er lukkedag
  eller tidlig lukning. Første udgave satte den afhentede bestilling til
  `current_date` — var i dag en lukkedag, faldt **hele filen** på den ene
  række med `bestilling_lukket_dag`. Fejlen er genindført og set fejle.
- **Den kan køres igen.** Den rydder sit eget op først, så to kørsler ikke
  giver ti nyheder.
- **Oprydningen rammer kun demo-indholdet.** `supabase/ryd-demo.sql`
  sammenligner på det nøjagtige indhold og på referencerne `SM-DEMO-*`,
  `FO-DEMO-*`, `BO-DEMO-*`, `UD-DEMO-*`. Har personalet skrevet en rigtig
  nyhed, skiftet en kugle eller taget imod en rigtig bestilling, bliver den
  stående. En oprydning, der også tager personalets eget arbejde, bliver
  kørt én gang og aldrig igen — og så bliver demo-indholdet stående for
  evigt i stedet.

### Demoen standser ikke længere — den rydder af vejen og siger det

Filen havde tre bløde værn, der kastede en exception: lukket
sæson, "tag imod bestillinger" slået fra, og lukket hver dag de
næste to uger. Tanken var rigtig — *"en fil, der lydløst åbner en
lukket forretning på dens egen hjemmeside, må ikke findes."*

Men den forkerte halvdel af reglen blev håndhævet. En exception
ruller **hele** transaktionen tilbage, så filen gjorde ingenting,
og den, der kørte den, så en rød fejl og en uændret side. Kundens
ord (23/8): *"den gider ik loade demo indholdet."*

Det, der betød noget, var ikke at filen lod være — det var at
ingen kunne komme til at åbne forretningen **uden at opdage det**.
Så nu:

- **Sæson og bestillinger slås til**, og hver ændring skrives i en
  midlertidig tabel `demo_aendringer`
- **Åbningstider sættes til 10-20 alle dage** — men kun hvis der
  slet ikke er nogen. Står der allerede tider, er de ejerens, også
  når alle dage er lukkede: det er en beslutning, ikke en mangel
- **Er der lukket hver dag i to uger**, springes personalesidens
  rækker over, mens gæstesiden bliver stående. En halv demo, der
  siger hvad der mangler, er mere værd end ingen demo og en rød fejl
- **Rapporten til sidst har en kolonne `aendret_paa_forretningen`**
  med et ⚠️ foran hver ting. Står der noget der, har filen slået en
  kontakt, ejeren selv havde sat

**Værnet om FORRETNINGEN står urørt.** At køre filen i det forkerte
Supabase-projekt er den ene fejl, der ikke må kunne ske — den
kostede en aftens oprydning 18. august — og den standser stadig
alt. Bevist ved at omdøbe lokationen og se filen stoppe.

`ryd-demo.sql` sætter **ikke** sæsonen tilbage. Om forretningen er
åben, er ejerens beslutning, og at gætte den to gange er værre end
at spørge én gang; rapporten dér siger det i stedet.

### Demoen åbner kategorierne — og sætter varslet ned

Forsidens bestilling sælger alt undtagen smørrebrødet og isen. Har ejeren
ikke sat flueben ved en eneste kategori, er dens liste tom, og hele
afsnittet skjuler sig selv — som det skal. For en demo betyder det, at det
bedste på siden ville være usynligt.

`demo-indhold.sql` åbner derfor de kategorier, der **har priser** i
`menukort.sql` (en åbnet kategori uden priser giver en fold med lutter
"??"), og springer is og smørrebrød over. `ryd-demo.sql` sletter nøglen
igen.

**Varslet er det eneste sted i filen, hvor en driftsindstilling ændres**, og
det er værd at forstå hvorfor: står `bestilling_varsel_timer` på 24 —
"bestil senest dagen før" — kan dagen i dag ikke vælges, og så kan **dagens
ret ikke bestilles i dag**. Det er en rigtig modsætning, ejeren skal tage
stilling til; en demo, hvor dagens ret ikke kan lægges i kurven, viser bare
ikke det, den skal. Demoen sætter 2 timer, `ryd-demo.sql` sætter 24 tilbage
— og kun hvis tallet stadig er demoens 2, for har ejeren skrevet sit eget,
er det hans.

Slutrapporten tæller de åbne kategorier med og siger det højt, hvis der ikke
er nogen: *"❌ Ingen kategorier er åbnet — forsidens bestillingsafsnit findes
ikke."* Uden den linje ville man lede efter et afsnit, der med vilje ikke er
der. Begge dele er kørt mod en rigtig Postgres 16, og rapportlinjen er
bevist ved at fjerne fluebenene og se den slå om til ❌.

### Demo-rækkerne kan kendes på tre ting

Referencen indeholder `DEMO`, telefonnummeret begynder med `0000`, og der
står en intern note på hver af dem. **Numrene er med vilje umulige** — ingen
dansk telefon begynder med 00 — så ingen bliver ringet op ved en fejl.

Har du push slået til, plinger telefonen: webhooken fyrer på hver ny række,
og filen laver syv. Det er ikke en fejl, men det er rart at vide, før den
køres midt i en vagt.

### Det er pladsholdere, ikke oplysninger

Retten, arrangementerne, nyhederne og kuglerne er skrevet af os for at vise
formen, og så længe de står i databasen, står de på den offentlige side. En
gæst kan møde op efter stegt flæsk, ingen har lavet — eller efter musik,
ingen har booket. Ret dem i admin, så snart ejeren har sagt, hvad der skal
stå, eller kør `supabase/ryd-demo.sql`.

**Filen rører ikke menukortet, priserne eller `auto_bekraeft`.** Det er
ejerens egne tal og ejerens egen beslutning. `menu_note` og `bord_pladser`
sættes kun, hvis felterne er tomme.

Ingen priser på lokalet, ingen antal personer, intet leveringsområde.
Prisen på dagens ret er med, fordi den hører til retten og forsvinder sammen
med den. Bandnavnet fra designbundtet — *"Ronni & de Salte"* — er **ikke**
med: at finde på et bandnavn er værre end at finde på en ret, for et
bandnavn kan tilhøre nogen.

## Ejeren skal bekræfte

Alle oplysninger står i `js/oplysninger.js` med `godkendt: false`. Så længe det
flag står, skriver testene en påmindelse ud ved hver kørsel. **Intet herunder er
gættet** — hvor der ikke findes et svar, står feltet tomt, og siden skjuler det.

| Oplysning | Hvad vi bruger nu | Hvorfor det skal bekræftes |
|---|---|---|
| Husnummer | `Havnevej 20I` | Kunden har oplyst 20I. Forretningens eget menukort skriver 20, og tredjeparter skriver både 20 og 20L. |
| Telefon | `28 87 13 43` | Står på forretningens eget menukort. Nogle tredjepartssider viser et andet nummer. |
| Domæne | GitHub Pages-adressen | Har forretningen et domæne? Det skal på skiltet og i canonical. |
| E-mail | **`selskab1@mosedehavnecafe.dk`** og **`booking1@mosedehavnecafe.dk`** | Oplyst af Mikkel 28/8 og i luften. De erstattede `hej@mosedehavnegrill.dk`, som var designets pladsholder på et forkert domæne. Den generelle `kontakt_email` er stadig tom. |
| Facebook, Instagram, Google-profil | tomme | Kun links vi har set, kommer på. Et link til en profil der ikke findes, er en blindgyde. **Designets footer havde `href="#"` på begge — de er fjernet 28/8, til der kommer rigtige adresser.** |
| Smileyrapport | tom | Skal linkes når adressen på Fødevarestyrelsens side er fundet. |
| Fire priser med "ca." | ingen pris vist | Morgenkomplet, fiskefilet med pommes, frankfurter/specialpølse, belgisk vaffel. |
| Smørrebrød: varsel og mindsteantal | 24 timer / 1 stk. — **sat i admin, ikke oplyst** | Formularen skal have et tal for at kunne regne en tidligste dag ud. Ejeren retter dem i admin, og teksten på siden følger med. |
| Smørrebrød: levering og betaling på forhånd | står ikke på siden | Findes ikke i forretningens materiale. Der betales ved afhentning, og der loves ingen levering. |
| Faciliteter: parkering, hunde, legeplads, handicapadgang | står ikke på siden | Ikke bekræftet. Skal ikke skrives før de er. |
| Baglokalet: **hvad må der stå om det?** | `selskaber/` spørger, men lover intet | Lokalet FINDES — ejeren har selv bedt om et udlejningssystem. Men hvor mange der kan være, hvad det koster, og hvornår det kan lejes, er ikke oplyst. Indtil da spørger siden i stedet for at love. |
| **Hvor mange kan der være?** | står ikke på siden | Uden et tal kan siden ikke sige "plads til X", og så lader den være. |
| **Hvad leveres, og hvad hentes?** | siden lover ingen levering | Ejeren har bedt om **levering af frokostordning**, så der leveres noget. Gælder det også catering? Og hvilket område? Smørrebrødssiden siger i dag, at der hentes — den skal rettes, hvis det ikke passer. |
| **Priser på selskaber og catering** | står ikke på siden | Der er ingen prisliste. Et gæt her koster en skuffet kunde i telefonen. |
| **Tages der imod bordreservationer i telefonen?** | `bord/` inviterer til at ringe, men lover ikke et bord | "Ring, så finder vi ud af det" kan forretningen altid holde. Om man reelt kan reservere, skal ejeren svare på — og fase 4 bygger den rigtige bordbestilling. |
| **Hvad skal kunne bestilles på forsiden?** | kun det, der er sat flueben ved i admin | Forsiden sælger alt undtagen smørrebrødet og isen. I dag er der kun sat flueben ved smørrebrødet, og så findes afsnittet slet ikke. Ejeren skal sige, hvilke kategorier køkkenet kan nå at lave ud af huset — og skrive priserne på dem. |
| **Hvilke borde findes der, og hvad hedder de?** | ingen — bordene oprettes i admin | QR-bestilling virker først, når ejeren har oprettet mindst ét bord. Numrene skal være dem, personalet faktisk bruger: står der 7 på mærkatet og "det runde ude ved gavlen" i køkkenet, går maden det forkerte sted hen. |
| **Skal personalet ÅBNE et bord, før det tager imod?** | nej — enhver kan scanne | Værnet kræver, at bordet findes. Det kan ikke se, om koden blev scannet fra parkeringspladsen. Alternativet er at markere regningen "ikke åbnet af personalet" og lade jer kigge. Ejerens valg. |
| **Skal der kunne bestilles alkohol fra bordet?** | ja, hvis kategorien er åbnet i admin | Der er ingen aldersvurdering på en telefon. Vurderingen skal ske, når det bæres ud — som en aftale i køkkenet, ikke som noget, siden kan love. |
| Anmeldelser | ingen | Der kommer aldrig opdigtede anmeldelser på. Skal hentes fra den rigtige Google-profil. |

Når de er bekræftet, skal de være **identiske** på hjemmesiden, Google
Virksomhedsprofil, Facebook, VisitDenmark og alle andre platforme — og
`godkendt` sættes til `true`.

## Hvad der mangler

Denne omgang lagde strukturen og SEO-fundamentet. Det næste, i den rækkefølge:

1. **Hastighedsbegrænsning foran bestillinger.** Bestillingssystemet er bygget
   (se afsnittet ovenfor), og RLS lader gæsten skrive uden at kunne læse. Men
   nogen med anon-nøglen kan indsætte vrøvl-bestillinger, og det kan **ikke**
   stoppes i RLS alene. Næste skridt er en Edge Function foran indsættelsen. Til
   gengæld kan intet af det læses, mængden pr. række er bundet af
   check-reglerne, dobbelttryk afvises, og personalet ser og sletter det i admin.
2. **De felter menukortet mangler:** billede, allergener,
   kun-ved-forudbestilling, sæsonvare. Og en "Lukket resten af dagen"-knap i
   admin.
3. **Troværdighed.** Galleri af rigtige billeder, link til Google-profilen og
   smileyrapporten, rigtige anmeldelser. Alt afhænger af listen ovenfor.
4. **Roller i admin.** Ejer og medarbejder, mulighed for at deaktivere.
   Ændringsloggen ER bygget — se "Logbogen" — men alle logger stadig ind som
   den samme.
5. **Lighthouse på den rigtige adresse.** Vægten er målt lokalt, men tallene
   skal efterprøves over en rigtig forbindelse når domænet er på plads.

(Arrangementer med dato blev til **kalenderen** i fase 3 og siden
`arrangementer/` — se de afsnit.)

## Hvad der IKKE står på siden

Designprototypen havde tekst der ser ud som fakta, men som ingen har bekræftet:
18,4 °C i vandet, 4 m/s NØ, "siden 1972", "54 somre på Mosede Havn", "kutterne
lander om morgenen", "isen røres i baglokalet", "fisken kommer ind 40 meter
herfra", "Man kommer for pølsen. Man bliver for udsigten."

**Alt det er væk.** En hjemmeside der lyver om en forretning er værre end en
der siger mindre. `tests/forside.spec.js` slår ned på hver enkelt af de
formuleringer, så de ikke kan snige sig ind igen.

Vandtemperatur, vind og dagens ret udfyldes i admin under fanen **Forside** og
**skjuler sig selv når de er tomme**. Vandtemperatur og vind bør på sigt komme
fra DMI's åbne data i stedet for at blive tastet ind.

Solnedgangen er den ene undtagelse — den **regnes ud** for havnens position
(55,585° N, 12,283° Ø), så den er altid rigtig uden at nogen skriver noget.
Kontrolleret: 7. august 2026 giver 21:05, hvilket stemmer med soltider.dk.

### Menukortet: fire priser mangler med vilje

Menukortet er skrevet af efter forretningens eget kort. To regler er fulgt
slavisk:

- Stod der **"ca."** ved en pris, er varen med, men prisen er tom. En tom pris
  viser ingen pris. Et gæt viser et forkert tal, og det er værre.
- Var linjen **ulæselig**, er varen udeladt helt.

Priserne mangler derfor på **Morgenkomplet**, **Fiskefilet med pommes**,
**Frankfurter eller specialpølse** og **Belgisk vaffel**. Udfyld dem i admin.

Udeladt som ulæseligt: croissant-linjen, "rist", "knækker med blød pølse",
børnemenuen, lemonaden og én ostemad hvor fyldet ikke kunne læses.

### Forretningens navn: afgjort

Navnet er **Mosede Havnecafe**. Kunden har bekræftet det, og det
står nu ens overalt: sidens titel, logoet, ordmærket i introen, titlen i
isfilmen, personalesiden og startdataen i `setup.sql`.

Det var værd at spørge om, for forretningen skriver det selv på tre måder:

| Kilde | Navn |
|---|---|
| Forretningens eget menukort | Mosede Havn Smørrebrød, Grill & Ishus |
| Skiltet på facaden (se `billeder/facade-*.jpg`) | MOSEDE HAVN – Grill & Kiosk |
| Facebook | Mosede havn grill & Ishus |

Havde en database allerede fået et af de gamle navne, retter
`supabase/ret-oplysninger.sql` det — men kun hvis der stadig står en af de
gamle varianter. Har personalet selv skrevet noget i admin, er deres udgave
nyere, og den bliver ikke rørt.

**Adressen er stadig ikke afgjort:** menukortet skriver `Havnevej 20`, kunden
har oplyst `Havnevej 20I`. Siden bruger 20I. Det bør bekræftes.

## Intro-animationen

Havet stiger og fylder ordmærket op mens siden loader. Båd, is-sol, måger,
sprøjt. Alt tegnes i ét canvas — ingen billeder, ingen SVG. Matematikken er
porteret 1:1 fra designprototypen; rør ikke tallene uden at se den.

Den kører **ved hvert besøg**, også et opdater, og varer **1,43 sekunder** plus
0,3 til at tone væk. **Et klik eller en berøring hvor som helst lukker den.**

De to hører sammen. Kravet har flyttet sig fire gange — 4,8 sekunder én gang pr.
fane, så hvert besøg og skåret til 3 sekunder, så én gang pr. session med et loft
på 1-2 sekunder, og nu hvert besøg igen med tilføjelsen "man kan altid klikke så
den væk". Det sidste er det der gør det første bærbart: **en intro man ikke kan
komme forbi, må ikke komme hver gang; en man kan trykke væk med tommelfingeren
uden at sigte, må godt.**

Før kunne man kun ramme knappen "Spring over" nede i hjørnet eller trykke Escape
— og Escape findes ikke på en telefon. På 1,7 sekunder skal man se en lille knap,
sigte og ramme, mens det man ville hen til, allerede er væk. Nu er hele laget
trykfladen, og der lyttes på både `click` og `touchstart`, fordi iOS lægger 300 ms
mellem de to. Koreografien er den samme hele
vejen — bogstaverne falder, vandet stiger, båden rider, mågerne driver — det er
kun tempoet der er skruet op. 900 ms indlæsning er bunden: under det kan man se
at procentkurven ikke betyder noget.

`tests/intro.spec.js` måler **på tidslinjen** (`window.MOSEDE_INTRO_MS`) og ikke
på væguret. To testarbejdere der deler en CPU kan gøre en vægur-måling et halvt
sekund langsommere, og så fælder testen byggeriet for maskinens skyld i stedet
for for koreografiens.

Den springes **helt over** i to tilfælde: reduceret bevægelse, og når adressen har
et anker. Kommer gæsten ind på `.../#menu` fra
Google, skal menuen være der med det samme — en animation der dækker netop det
sted man bad om at komme til, er en fejl uanset hvor kort den er.

`sessionStorage`-nøglen `mosede_intro_set` er væk sammen med
én-gang-pr.-session-kravet, og med den de to tests der målte at anden gang i samme
fane ikke kørte.

Tre spærrer mod at den kan låse siden: den fjerner sig selv fra DOM'en når den
er færdig, `<noscript>` slår den fra hvis JavaScript er slået fra, og
CSS-nødudgangen lader laget forsvinde uanset hvad JavaScript gør.

Når laget er væk, sender den `mosede-intro-slut`. Det er signalet til
`js/side.js` om at hero-videoen må hentes — de to skal ikke slås om linjen.

Fire bevidste afvigelser fra prototypen står forklaret i toppen af
`js/intro.js`.

## Sådan er databasen skruet sammen

Alt hvad personalet ændrer i hverdagen ligger i databasen, aldrig i koden:

- `lokationer` — adresse, telefon, beskrivelse. Der er én i dag, men tabellen
  er bygget til flere. Lokation nummer to er bare en ny række
- `aabningstider` — én række pr. ugedag pr. lokation
- `lukkedage` — ferie, personaledage, vinterlukning
- `menu_kategorier` / `menu_varer` — kategorier uden lokation er fælles
- `nyheder` — nyt fra køkkenet
- `indstillinger` — dagens besked, sæson, dagens kugler, menunote, bestillingsvarsel

**Kunderne skriver intet.** Der er ingen online bestilling i version 1, så
reglen er enkel: alle må læse, kun personalet må ændre.

## Tre lag validering

Alt der kan gå galt bliver tjekket tre gange — i formularen, i JavaScript og i
databasen. Det sidste lag er det der ikke kan omgås. Databasen afviser
negative priser, priser over 10.000 kr., tomme varenavne, åbningstider hvor
der lukkes før der åbnes, ugedage uden for 0–6, ugyldige postnumre og samme
lukkedag to gange. Reglerne i `js/store.js` er holdt identiske med dem i
`setup.sql` — er de mildere, får personalet en uforståelig SQL-fejl i stedet
for et svar på dansk.

## Testene

1246 tests i rigtig Chromium, på både mobil og computer. 1196 kører, og 50
springes med vilje: telefontestene måler ingenting i computerprofilen, og
målingerne af teksterne inde i isfilmen hører til en fast komposition på
1920×1080 der intet har med sidens layout at gøre.

Fire filer er værd at kende:

`tests/kontrast.spec.js` er værd at kende: den **regner WCAG-kontrast efter i
browseren** i stedet for at stole på øjet. Den lægger halvgennemsigtige lag
oven på hinanden, både baggrundene og tekstens egen farve — ellers kan man
ikke måle et design bygget på glas. Tekst der ligger oven på et foto måles mod
det værst tænkelige billede: sløret lagt over noget helt hvidt.

Filen har sin egen kontroltest, så de øvrige ikke kan "bestå" fordi måleren er
i stykker.

`tests/vaegt.spec.js` sætter et loft over hvor meget der må hentes før siden er
brugbar (700 kB) og hvor stor en enkelt fil må være (420 kB). Den findes fordi
vægt sniger sig ind: der var to posterbilleder på 209 kB som blev hentet ved
hvert besøg og aldrig set af nogen. Ingen ville have opdaget det ved at se på
siden.

Den fangede det igen. Kagefotoet på forsiden står 2043 px nede — tre skærme
under folden på en telefon — og havde `loading="lazy"` på. Målt gjorde
attributten ingen forskel: Chromium hentede alle 241 kB af det *mens introen
kørte*, altså før gæsten havde set noget. Browseren bestemmer selv, hvor tidligt
"lazy" slår til, og på en hurtig forbindelse er den rundhåndet.

Adressen ligger nu i `data-src`, og `js/side.js` lægger den på plads, når
billedet er 400 px fra skærmen. **Forsiden faldt fra 703 til 464 kB på en
telefon og fra 569 til 464 kB på en computer.**

> **Målt igen 21. august 2026: 593 kB på en computer.** Loftet er 700, så der
> er 107 kB tilbage — men det er værd at holde øje med. `style.css` alene er
> 157 kB og `store.js` 93, begge ukomprimerede og fulde af kommentarer, fordi
> der bevidst ikke er noget build-step. Det er en byttehandel, ikke en fejl:
> filen skal kunne overtages af et andet menneske om tre år. Bliver loftet
> nået, er det første skridt at slå gzip til på serveren og ikke at fjerne
> forklaringerne. `tests/forside.spec.js` holder
begge ender: at det ikke hentes under landingen, og at det *er* der, når man
ruller ned — hver påstand alene er nem at få til at passe ved at ødelægge den
anden.

Fotoet blev først forsøgt komprimeret i stedet. Det viste sig at være
omsonst: en ny kodning ved kvalitet 72 gav nøjagtig samme filstørrelse med
PSNR 53 dB, altså er filen allerede kodet så tæt, som den kan. Det var ikke
billedet der var for stort — det blev hentet på det forkerte tidspunkt.

`tests/telefon.spec.js` måler det en tomme kræver: trykflader på mindst 44 px,
ingen vandret rulning nogen steder på siden, og at skuffemenuen faktisk slipper
siden igen når den lukkes.

`tests/designbundt.spec.js` er ny med kundens designbundt (21/8). Halvdelen
måler formerne — bannerne, nyhederne, afdelingskortene, parallaksen. Den
anden halvdel måler, at **bundtets påstande ikke sneg sig med**: 312
anmeldelser, Sydkysten, Mosede Havnevej 15, 43 90 15 00, 1.200,-, projektor
— på alle ni gæstesider. Og et mønster, der fælder ethvert *"plads til N
personer"*, ikke kun de 40, bundtet skrev.

### En test, der ikke kunne fejle — og hvordan den blev opdaget

Testen "siden kan ikke rulles sidelæns" havde stået grøn siden den blev
skrevet. Ved fejlindsprøjtningen fik genvejsstriben med vilje `width: 900px`
på en skærm på 390 — og testen sagde **stadig bestået**.

Grunden er telefonens layoutviewport. Siden har `width=device-width`, og når
indholdet stikker ud, zoomer browseren **ud**, så det kan være der.
`window.innerWidth` vokser med: den blev 900 i forsøget. Så sammenlignede
testen 900 mod 900 og var tilfreds, mens gæsten sad med en side, hun kunne
skubbe til side.

Der måles mod `page.viewportSize()` nu — den skærm, vi *har bedt om*, og som
står fast, uanset hvad siden gør. Med fejlen indsat skriver den nu "siden er
510 px bredere end skærmen ved #bestil".

**Mønsteret er værd at huske:** en måling, der henter *begge* sine tal fra
det, den måler på, kan ikke fælde noget. Det ene tal skal komme udefra.

Det er præcis det, husreglen står for: *når du skriver en test, så genindfør
fejlen bagefter og se testen fejle*. Uden den øvelse havde den her stået
grøn og målt ingenting i månedsvis.

`tests/isfilm.spec.js` måler isfilmens indbrændte tekster — men på
**opskriften**, ikke på videoen. I videoen ER skriften en del af billedet, så en
måling af pixels måler hvid mod hvid og giver 1,09:1 hver gang.

## Telefonen

Det meste af arket er skrevet med `clamp()` og flyder med skærmen af sig selv.
Blokken `@media (max-width: 640px)` i `css/style.css` er de steder hvor en
telefon kræver noget **andet**, ikke bare noget mindre:

- **Trykflader på 44 px.** De små glaspiller var 40. Det er under det mindstemål
  både Apple og Google sætter, og de står tæt: menuens tre faner, "Ring", "Vis
  rute". Rammer man ved siden af, skifter man afdeling i stedet for at ringe.
- **Menuens faner fylder linjen ud** i stedet for at klumpe til venstre.
- **Sektionsrytmen er 48 px** i stedet for 64+64. På en skærm der er 844 px høj
  bliver 128 px tomt sand mellem afsnittene en ørkenvandring — man ruller og
  tror siden er færdig.
- **Bestil-knappen ligger i skærmens nederste kant.** Bjælken og båden har begge
  ligget der før. Se afsnittet om bunden af skærmen.
- **Isfilmen er i højformat** under 700 px, og **hero-videoen er det nu også**. Se
  afsnittet om hero-videoen.

`tests/telefon.spec.js` holder det på plads. Bådens egne tests ligger i
`tests/baad.spec.js`, som kører i **computerprofilen** — båden er slået fra under
900 px. En af dem **læser pixels ud af canvas'et**: `js/baad.js` springer selv fra
når `clientWidth` er 0, så en usynlig fejl dér ville give en tom stribe uden at
nogen test mærkede det. Den tæller også sandfarvede pixels, for båden har været
malet i vandets farve før, og en tom-eller-ej-test fanger ikke det.

### Båden: fire fejl, og ingen af dem stod i koden

Kunden skrev tre gange at båden manglede på telefonen. Den var der hver gang.
Fejlene kunne kun ses på et skærmbillede:

1. **Den var malet i vandets farve.** Prototypen tegnede skrog, dæk, mast og
   storsejl i `#0f2c44`. Vandet er `#0f2c44`. Det eneste man kunne se af båden,
   var det lille røde forsejl. Skroget er nu sandfarvet — samme tre farver som
   resten af siden, og båden er motivet, ikke camouflage.

2. **Den skalerede med skærmbredden.** `.62 * S`, hvor `S = W / 1280`. Ved 390 px
   blev båden 20 px høj. En rullemåler på 20 px med tekst bagved er ikke en båd,
   det er en prik. Båden har nu den samme **fysiske** størrelse på alle skærme,
   omkring 36 px: den er en genstand på skærmen, og en genstand bliver ikke
   mindre fordi vinduet gør.

3. **Vandet var gennemsigtigt.** Dønningen på 50%, det forreste vand på 92%. På
   en computer ligger striben over sandfarvet baggrund og man ser det ikke; på en
   telefon ligger den over indholdet, og man kunne læse "KAGER OG DESSERTER"
   tværs igennem vandet. Bjælken var også kun 88% — så man læste igennem begge.
   Vandet er nu tæt, og bjælken er tæt.

4. **Der var en søm.** Striben sluttede præcis hvor bjælken begyndte, og de to
   havde forskellig gennemsigtighed. Bjælken er siden helt væk, og striben ligger
   nu i skærmens nederste kant med `env(safe-area-inset-bottom)` under sig.

Dertil to ting mere: bølgerne regnes nu af stribens **højde** og ikke af bredden
(4,6 px i en stribe på 64 er en streg), og striben har en gradient fra
gennemsigtig til tæt over sin øverste halvdel, så indholdet bagved forsvinder i
en dis i stedet for at blive skåret midt over af bølgelinjen.

### Den femte fejl: båden hakkede, og grunden stod i én linje

Da båden endelig kunne ses, skrev kunden at den var "laggy og dårlig". Den var
det. Årsagen var denne linje, læst inde i tegneløkken:

```js
var max = document.documentElement.scrollHeight - innerHeight;
```

`scrollHeight` kan ikke besvares uden at browseren har målt hele siden. Læses
den 30 gange i sekundet, tvinger man altså **30 komplette layouts i sekundet** —
oven i det browseren allerede laver mens man ruller. Det er en klassisk *layout
thrash*, og den er værst på en telefon, hvor siden er lang og CPU'en lille.

Fire ting rettede det:

1. **Sidehøjden måles én gang** og gemmes i `maxRul`. Den måles igen ved `resize`
   og gennem en `ResizeObserver` på `body` — altså når den faktisk kan have
   ændret sig, ikke hver gang der skal tegnes et billede.
2. **Rullepositionen kommer fra en `{ passive: true }`-lytter**, ikke fra en
   måling. `passive` er ikke pynt: uden den venter browseren på at se om koden
   kalder `preventDefault()`, før den ruller.
3. **Bølgeuret står stille når intet sker.** Løkken kører videre, men tegner ikke:
   er der ikke rullet i 1,2 sekunder og er båden på plads, springer den fra ved
   toppen af funktionen. En rullemåler skal bevæge sig når man ruller.
4. **Bølgerne beregnes hver 14. pixel** i stedet for hver 8. På 390 px er det 28
   punkter i stedet for 49, og forskellen kan ikke ses — det er en blød kurve.

Læst nedefra er der nu én ting: vandet med båden. Ikke andet.

## Hvor hurtig er den?

To ting afgør det, og de har intet med hinanden at gøre: hvor meget der **hentes**,
og hvor jævnt siden **ruller**. Den første var i orden længe før den anden.

### Rulningen: glasset kostede halvdelen

Kunden skrev at siden var laggy. Den var. Målt ved at rulle hver side igennem og
tælle billeder undervejs:

| Side | Før | Efter |
| --- | --- | --- |
| Menukortet, computer | **25 fps** | 61 |
| Bestillingssiden, computer | 39 | 61 |
| Forsiden, computer | 33 | 35 |
| Forsiden, telefonprofil | 57 | 59 |

Årsagen var **`backdrop-filter`**. Der var **18 slørede lag** på forsiden alene —
hver glaspille havde sit eget — og slår man kun den ene egenskab fra, gik forsiden
fra 26 til 47 fps i den første måling. Næsten en fordobling af det man mærker, fra
én CSS-egenskab.

Og på **femten af de atten lå sløret oven på fladt sand.** Der er ikke noget at
sløre i en ensfarvet flade: man betaler en fuld blur-beregning per billede for en
effekt der ikke kan ses. Værst var de tre **klæbende** lag — topmenuen,
afdelingsfanerne på menukortet og kurvelinjen på bestillingssiden. Et sløret lag
der klæber, skal beregnes om ved hvert billede mens man ruller; det er hele
pointen med effekten. Menukortets klæbebjælke alene stod for de 25 fps.

Sløret ligger nu kun de tre steder hvor der **er** et billede bagved: heroens
piller, "Afspil filmen" på isfilmens plakat, og kuglepillerne på det mørke
isafsnit. Resten er flade og ser stort set ens ud — den halvgennemsigtige hvide
flade gik fra 50 % til 82 %, fordi den nu selv skal bære teksten i stedet for at
læne sig på et slør.

Det er samtidig det der bringer siden tættest på spiis.dk, som ikke har et eneste
sløret lag. "Gør den som spiis" og "den er laggy" viste sig at være det samme
indgreb.

**Forsiden er stadig den tungeste**, og resten ligger i de to videoer og
parallaksen. Isoleret på en computer: uden hero-videoen 43 fps, uden isfilmen 42,
uden båden 45, uden parallaksen 50. Alle fire er ting kunden har bedt om, så de
bliver — men hero-videoen **standser nu når heroen er ude af syne**. Den kørte i
ring hele tiden, så browseren afkodede 1280×720 tredive gange i sekundet for et
billede ingen kunne se, 3000 pixel nede på siden. Isfilmen havde allerede den
opførsel; heroen havde den ikke, fordi den ligger øverst og "altid er der".

### Overgangen fra intro til landing

Kunden skrev at den var "hakkende og laggy". Målt over de 2,6 sekunder overgangen
varer — tabte billeder, altså afstande over 33 ms mellem to billeder:

| | Computer | Telefonprofil |
| --- | --- | --- |
| Før | **23 tabte**, værste billede 68 ms | 0–2 |
| Efter | **3 tabte**, værste 52-65 ms | 0 |

Tre ting, i den rækkefølge de betød noget:

**Videoen blev hentet i samme øjeblik heroen landede** — 21 af de 23 tabte
billeder. Ikke fordi filen er stor (download er netværk, ikke hovedtråd), men
fordi `load()` plus afkodningen af de første billeder faldt præcis hvor heroens
indflyvning skulle bruge hovedtråden. Målt ved at fjerne videoen helt: 23 → 2.

Hentningen venter nu til **efter** koreografien. Den er 1,6 sekunder lang —
linjerne stiger over 0,85 s med op til 0,30 s forsinkelse, og "Rul ned" toner ind
med 0,8 s forsinkelse og 0,8 s varighed — så tallet er 1700 ms og ikke gættet. Det
koster ingenting at se på: videoen ligger på `opacity: 0` indtil den kan spille, og
under den ligger facadefotoet, som er **samme motiv som videoens første sekund**.

`requestIdleCallback` blev prøvet først og kastet ud igen. Den kan starves: er der
en rAF-løkke i gang — og heroens parallakse er sådan en — finder den aldrig ledig
tid og udløser først på sin timeout. Så falder hentningen på et tilfældigt
tidspunkt i stedet for et valgt, og det er dårligere end et tal man selv har sat.

**Heroens `h1` animerede `letter-spacing`** — 6 af de resterende billeder. Det er
en **layout**-egenskab: browseren skal ombryde teksten på ny ved hvert billede, og
heroens overskrift er `clamp(56px, min(11.5vw, 20vh), 210px)` over tre linjer,
altså sidens største tekst, ombrudt 60 gange i sekundet i 1,4 sekunder. Effekten er
væk fra heroen og bliver på afsnitsoverskrifterne, hvor teksten er mindre og hvor
den ikke falder sammen med noget andet. En test måler nu at heroens overskrift ikke
animerer `letter-spacing`, `width`, `height`, `margin`, `top` eller `left`.

**Laget blev revet væk midt i sit eget fade.** CSS'en tonede ud på `.6s`,
`js/intro.js` fjernede elementet efter 300 ms — altså ved omkring 50 %
gennemsigtighed, som et spring til nul. Fadet er nu `.3s` og fjernelsen 320 ms.

Og **heroen ventede på at laget var væk** i stedet for på at fadet begyndte.
Forløbet var: intro toner væk → intro fjernes → heroen begynder, med et hul hvor
heroen stod fremme med alt sit indhold usynligt. Beskeden `mosede-intro-slut`
sendes nu når fadet begynder, så heroen rejser sig **bag** det lag der er på vej
væk.

Alle tre er efterprøvet ved at sætte fejlen tilbage én ad gangen og se testen
fejle. En test der aldrig har set sin egen fejl, er et gæt.

### Hero-videoen hakkede på telefonen, og det var geometri

Kunden skrev det, og årsagen stod ikke i koden. Videoen er **1280×720 i
landskab**. Heroen er `100svh`, så rammen på en iPhone er omkring 390×844 — altså
**lodret** — og `object-fit: cover` gør så dette:

> Browseren skalerer hele 1280×720 op til højde 844 (faktor 1,17), får 1500×844,
> og klipper 390 ud af de 1500.

Den afkoder **921.600 pixels for at vise en strimmel der svarer til cirka 333
pixels kilde**, tredive gange i sekundet, på det apparat der har mindst at give.

`hero-hoej.mp4` er midten klippet ud i 9:16: **406×720, altså 292.000 pixels.**
Det ser ens ud — browseren viste allerede kun midten — og det er en tredjedel af
arbejdet og under halvdelen af vægten (606 mod 1352 kB). Grænsen er 700 px og
ikke en apparattest, samme grænse som isfilmen bruger: en smal browser på en
computer har præcis det samme problem, og en telefon på tværs har det ikke.

**Der er ingen lodret råfil.** Begge filer i `original/` er 1280×720 i landskab, så
billedet kan ikke blive skarpere end det er. Det kan blive billigere, og det er
hvad der sker. Se `vaerktoej/lav-hero-telefon.sh`.

Tre tests holder det: at telefonen får `hero-hoej` og computeren `hero` (den kører
i **begge** profiler, for det er nemt at skrive en switch der altid rammer samme
gren), at alle fire filer findes — en switch der peger på en fil ingen har lavet,
giver en tom hero og ingen fejl nogen steder — og at den lodrette faktisk er
mindre end den brede.

### Hver sektion har sin egen indflyvning

Alle afsnit brugte den samme: op og ind med 70 ms mellem delene. Seks afsnit i
træk med præcis samme bevægelse holder op med at være en animation og bliver en
maner — man ser den én gang, og derefter er den bare den forsinkelse der ligger
mellem én selv og indholdet.

| Afsnit | Bevægelse |
| --- | --- |
| Smørrebrød | linjerne skrives ind fra venstre, én ad gangen |
| Menuoversigt | de tre kort løftes op og på plads, `transform-origin` i foden |
| Kagerne | fotorammen sætter sig **nedad** fra 106 %, teksten rejser sig |
| Isen | filmrammen vokser **op** på plads fra 96 % |

Alle fire bruger kun `transform` og `opacity`, som ikke koster et nyt layout.

**To andre blev prøvet og kastet ud igen**, og begge var mine egne fejl:

`clip-path` på kagefotoet — en wipe der tørrede billedet frem fra venstre. To ting
gjorde den forkert. En hård kant der glider hen over et foto ser billig ud, og
`clip-path` er ikke GPU-accelereret alle steder. Men den værste var
specificiteten: reglen hed `#kager .split > img` og vejede (1,1,2), altså mere end
`.split img` (0,1,1), som ejer fotoets langsomme **ånding på 8 sekunder**. En
`transition`-erklæring erstatter den forrige helt, så åndingens overgang forsvandt
— billedet **snappede** til `scale(1.06)` samtidig med at wipen kørte. Det var
præcis hvad kunden så: "ikke rigtig smooth eller clean". Fotoet har nu en ramme om
sig, så rammen ejer indflyvningen og billedet ejer åndingen. Efterprøvet: billedet
står midt i sin ånde ved `scale(1.0118)` i stedet for at snappe.

`filter: blur()` på isfilmens ramme — rammen kom ind uskarp og fandt fokus, som et
objektiv. Rammen indeholder en **video**, og et filter på en forælder til en video
tvinger browseren til at køre sløringen hen over hvert enkelt videobillede så længe
overgangen varer. På iOS er det en kendt kilde til hakken, og i værste fald står
videoen stille imens. En test måler nu at der ikke ligger et filter på rammen — i
**begge** tilstande, for det er forkert uanset hvad gæsten har bedt om, og den
måler startværdien, for det er den der gør skade.

**Og de skal alle nulstilles ved reduceret bevægelse.** Her tog jeg fejl én gang og
skrev at testen fangede en glemt regel i den blok. Det gjorde den ikke: alle fire
er `.in`-styrede, og `js/side.js` sætter `.in` på hver `.rev` med det samme i den
tilstand, så slutværdien er synlig af sig selv. Hvad testen så er værd, er at
`transition-duration` er **nul** — for det er hele formålet med indstillingen, og
det fanger den. Prøvet efter ved at fjerne reglen: testen fejler nu.

Et forbehold: alle tal er målt i Chromium på en Linux-VM med software-compositing,
ikke på en rigtig telefon eller en maskine med hardware-afkodning af video. Den
**relative** rækkefølge — hvad der koster mest — er til at stole på. De absolutte
tal er ikke.

Målingen har også selv narret mig undervejs, to gange. Den første udgave kaldte
`getComputedStyle` på alle 220 elementer tre gange for at tælle slørede lag; det
tog en halv sekund, og den halve sekund dukkede op som en "lang opgave" jeg nær
havde tilskrevet siden. Og den regnede billeder pr. sekund over hele sidens højde,
så hver gang noget blev fjernet, blev siden kortere, løkken kørte færre skridt, og
tallet blev volapyk — "uden hero-videoen: 7 fps" var ikke en måling af
hero-videoen. Den ruller nu i præcis tre sekunder uanset sidens længde.

### Vægten

Målt på en iPhone 13-profil over localhost: **650 kB** hentet før introen slipper
siden, mod 408 kB på en computer. Loftet i `tests/vaegt.spec.js` er 700 kB.

Den største post på telefonen er **kagefotoet i 1200 px, 241 kB**, og det tal er
der med vilje. Billedet står i fuld bredde, så en skærm med tre gange opløsning
beder korrekt om 1170 px. Man kan snyde browseren til at tage 900 px ved at skrive
en `sizes` der er mindre end det billedet faktisk fylder — det ville spare 83 kB
og plante en løgn i koden som den næste skal tro på. Der ER en 900 px-udgave i
`srcset`, og den bruges på skærme mellem 700 og 1000 px, hvor den er den rigtige.

Fire ting gør forskellen:

1. **Hero-videoen venter på introen** og hentes slet ikke ved reduceret
   bevægelse eller sparetilstand.
2. **Ingen posterbilleder hentes i forvejen.** Hero-videoens poster lå under et
   foto, isfilmens lå 4000 px nede på siden. 209 kB ved hvert besøg.
   Isfilmens lægges på af `js/side.js` 600 px før rammen kommer i syne.
3. **Fotoerne er beskåret til det de faktisk viser.** To af dem var portrætter
   på 1200×2150 som blev vist i felter på 620 px højde: browseren hentede 2150
   rækker og smed de fleste væk. Nu er de 1200×1612, og facaden ligger på
   kvalitet 68 fordi den alligevel ses gennem et slør på 56-68%.
4. **Båden standser** når fanen ligger i baggrunden, og den findes slet ikke under
   900 px. Ingen ser den i baggrunden, og en bærbar skal ikke bruge strøm på den.
5. **Telefonen får en lodret hero-video på 606 kB** i stedet for den brede på
   1352. Se afsnittet om hero-videoen: det er også en tredjedel af pixels at
   afkode.

## Udvikling og udgivelse

```
npm install
npx playwright test
```

Udvikling sker på en feature-branch. Workflowet i
`.github/workflows/deploy.yml` udgiver siden på GitHub Pages —
`https://gersel1233.github.io/mosedehavnegrill/`.

### Der er én vej i luften, og den går gennem et push

Udgivelsen udløses af et push til **`main`** eller
**`claude/lesreg-customer-setup-5atpuu`**. Sidstnævnte er repoets
standardgren og er den, der ligger i luften i dag; `main` findes ikke endnu,
men står i workflowet, fordi det er den aftalte udgivelsesgren, den dag vi
samler op. Alle andre grene er arbejdsgrene, og et push dertil udgiver
ingenting.

Der stod også `workflow_dispatch` i filen. Den gav en "Run workflow"-knap i
Actions-fanen, og knappen har en gren-vælger: **enhver** gren i repoet kunne
sendes ud på kundens hjemmeside med to klik — uden et commit på en
udgivelsesgren, og uden at nogen bagefter kunne se på grenlisten, hvad der
faktisk stod på siden. Den er væk. Skal den samme kode udgives igen uden et
nyt commit, gentages den sidste kørsel med "Re-run all jobs" inde på selve
kørslen; den kan kun køre nøjagtig samme commit og kan ikke pege på en anden
gren.

Toppen af `deploy.yml` fortæller nu, hvor siden lander. Kommentaren var arvet
fra det andet kundeprojekt, opskriften stammer fra, og en kommentar, der peger
et forkert sted hen, er værre end ingen: den bliver læst under tidspres, af en
der ikke har tid til at tjekke efter. Møder du et sted i repoet en tekst, der
siger, at en gren her går live på spiis.dk — den er arvet, og den er forkert.

`tests/udgivelse.spec.js` holder alle tre ting fast: kun push som udløser, kun
de to grene på listen, og den adresse i toppen, som `sitemap.xml` også bruger.
Prøven er set fejle på hver af dem — bagdøren sat ind igen, en arbejdsgren
føjet til listen, adressen byttet ud med spiis.dk.

### Versionsstemplet, og hvorfor listen blev til en find

Hvert script- og stylesheet-tag hedder `?v=__V__`, og udgivelsen bytter
pladsholderen ud med commit'ets sha. Uden den bliver adressen den samme ved
hver udgivelse, og en gæst, der har været på siden før, kører videre på den
**gamle** `js/store.js`, indtil hun selv tømmer cachen.

Stemplingen havde en **håndskrevet liste** med fire filnavne. Det var rigtigt,
da siden havde fire sider. Siden er der kommet ti til — `bestil/`, `bord/`,
`selskaber/`, `catering/`, `baglokale/`, `arrangementer/`, `nyheder/` — og
**ingen af dem blev stemplet.** De blev udgivet med et literalt `?v=__V__`.

Det virker: browseren henter filen. Men adressen er den samme hver gang, og
fejlen ville først have vist sig på den **næste** rettelse — hvor ingen ville
koble de to ting sammen.

Listen er nu en `find` over alle HTML-filer med pladsholderen, så en ny side
ikke kan glemmes. Den anden ende måles i `tests/seo.spec.js`: hver gæsteside
skal have `?v=` på sine js- og css-tags.

Testene kører med forbindelsen koblet fra: `js/config.js` udskiftes med en tom
udgave under test. Ellers ville hver test gå på nettet, afhænge af at
databasen er oppe, og skrivetestene ville ændre i kundens virkelige data.
