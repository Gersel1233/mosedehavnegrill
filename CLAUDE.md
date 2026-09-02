# Sådan arbejder vi på det her projekt

Hjemmeside og personalesystem for **Mosede Havnecafe** — smørrebrød,
grill og is på Mosede Havn i Greve. Bygget af **Lesreg** (Mikkel Gersel).

`README.md` er den lange dokumentation: hvorfor tingene er skruet sammen som de
er, hvad der er målt, og hvad der er prøvet. **Læs den, før du ændrer noget.**
Filen her er kun det, der ændrer hvordan du handler.

---

## ⚠️ RØR ALDRIG spiis

Repoet **`Gersel1233/oddsakademiet` ER spiis.dk** — en anden, færdig og betalt
kunde. Navnet er gammelt og misvisende, og det har allerede kostet forvirring.

- Du må **ikke** læse fra, skrive i, klone eller pushe til det repo
- Du må **ikke** røre Supabase-projektet `jhdlxexgrwvuoqetcgbt` (spiis' database)
- spiis bygges i sin egen session. Blander vi dem, kan vi ødelægge et system,
  der er i drift hos en betalende kunde
- **Det er sket én gang:** 18. august 2026 blev spiis' setup.sql kørt i
  Mosede-projektet. Oprydningen er `supabase/ryd-spiis-op.sql`. Tjek altid
  projekt-id'et i adresselinjen, før der køres SQL

Mosede er repoet **`Gersel1233/mosedehavnegrill`** og Supabase-projektet
**`epwyjzakvvbxtpvnhvbn`**. Intet andet.

Spiis er kun forbillede for *fundamentet*: GitHub Pages + Supabase + domæne.
Det er en opskrift, ikke en forbindelse.

---

## Sådan skriver vi kode her

- **Ren HTML, CSS og JavaScript.** Ingen framework, intet build-step, ingen npm
  for at se siden. Det er et valg, ikke en mangel — det skal kunne overtages af
  et andet menneske om tre år
- **Kommentarer forklarer HVORFOR, ikke hvad.** De gode kommentarer i den her
  kodebase fortæller, hvilken fejl reglen forhindrer. Skriv i samme tone
- **Dansk** i kode, kommentarer, commits og til brugeren
- Udvikl på den branch, opgaven angiver. Fase 0 ligger på
  `claude/lesreg-customer-setup-5atpuu`, fase 1 på
  `claude/lesreg-fase-1-admin-refactor-p7xqn9`. Push aldrig andre steder hen.
  Lav ikke en pull request, medmindre der bliver bedt om det
- Workflowet udgiver fra **`main` og `claude/lesreg-customer-setup-5atpuu`**
  — et push dertil går direkte i luften. Tænk over det, før du pusher noget
  halvt. Andre brancher udgives ikke, hverken af sig selv eller ved et tryk:
  `workflow_dispatch` er fjernet (23/8), fordi knappen i Actions-fanen kunne
  udgive en hvilken som helst gren. Udgivelse følger et push, intet andet

### Forsidens rækkefølge er en aftale, ikke en smag

> **⚠️ Afsnittet her beskriver den GAMLE forside.** 23/8 afleverede
> Mikkel sit eget design fra Claude Design som 1:1-facitliste, og
> den nye forsides rækkefølge er designets: hero → socials → musik →
> dagens ret → bestil → ugens retter → menukort/tapas → nyheder →
> om os → selskab → alt-vi-kan → find. Læren i afsnittet består —
> få koncepter, én handling pr. afsnit — men rækkefølgen bestemmes
> af handoffet nu. Se "GÆSTESIDEN ER SKIFTET UD" under status.

```
nyheder → bestil → smoerrebroed → menu → hjaelp → isen → find
```

Der stod ni afsnit før, hvert med sin egen overskrift, sine egne tal
og sine egne to knapper. Kunden pegede på spiis.dk: **få koncepter,
og så er man nede.** En indholdsfortegnelse er ikke et koncept.

**Én ting man kan gøre pr. afsnit.** Skal der noget nyt ind, så spørg
hvilket afsnit det hører til — ikke hvor der er plads. En test
sammenligner hele rækkefølgen og tæller røde knapper pr. afsnit
(formularens egne knapper tæller ikke med — de er handlingen, ikke en
genvej et andet sted hen).

**Hele bestillingsformularen ligger på forsiden** (23/8). Ikke et
kort, der linker videre — den samme formular som `bestil/`, samme
motor, samme folde, samme sidste kig. Tre ting er ude af dens udvalg:

- **Fyldet** til smørrebrødet. ⚠️ **Gælder ikke længere (31/8):**
  "1 mad er som 1 mad", og hvert fyld er en vare på lige fod med
  resten — også på forsiden. Varslet og mindsteantallet er stadig
  smørrebrødets egne regler
- **Isen** kan slet ikke bestilles — "det er altid til rådighed". Den
  er en fremvisning nederst, og admin har ikke engang et flueben til
  den
- **Levering** loves ingen steder; vi ved ikke hvad eller hvortil

De to første er filtre i `Butik.udvalg(d, hvad)` og styres af
`data-udvalg` på formularen (`uden-fyld` på forsiden, `kun-smoer` på
`bestil/`) — ikke af opmærkningen, ellers skrider de fra hinanden.

**Første udgave tog HELE smørrebrødet ud af forsiden** (`uden-smoer`,
som stadig findes). Det var rigtigt tænkt og forkert i praksis:
forretningen har ikke åbnet for andet i admin endnu, så listen blev
tom, og afsnittet skjulte sig selv. Kunden så det med det samme —
"nu er bestillings tingen væk fra sectionen nummer 2." **Er du i
tvivl om et filter, så spørg først, om afsnittet stadig har noget at
sælge på forretningen, som den ser ud i dag.**

**Afsnit, der ikke har noget at vise, findes ikke.** Nyhederne,
bestillingen og smørrebrødet skjuler sig hver især. Derfor sættes
sektionernes grunde af `vekslGrunde()` i `js/side.js` efter det, der
FAKTISK står på skærmen — står de skrevet i HTML'en, ender to
sandfarvede naboer op ad hinanden, den dag et afsnit falder ud.

**Den flydende pille er kun på forsiden.** Den er genvejen NED til
formularen; på en anden side ville den være et link VÆK fra den
formular, gæsten står midt i. Er der ikke noget at bestille på
forsiden, peger den på `bestil/` i stedet — og forsvinder helt, hvis
der heller ikke er smørrebrød.

**Bestilt er bestilt — og booket er booket.** Kunden fjernede løftet
om en opringning: "de skal nok ringe og afbekræfte, hvis de ikke
kan". Kontakten `auto_bekraeft` i admin virker begge veje, men
standarden er **TIL**.

**Det gælder også bordene.** `bord/` BOOKER et bord; den spørger
ikke om det. Kunden har sagt det fire gange, senest 23/8: "hvad man
skal kunne bestille bord, ikke spørge — det er det, jeg har prøvet
at sige 100 gange." Kvitteringen siger "vi ses", personalets hak i
admin er deres eget, og **opkaldet hører til Afvis** — gæsten regner
med bordet, så et afslag, hun ikke har hørt, er en familie, der
møder op.

Baglokalet er stadig en forespørgsel med vilje: pris, timer og
antal er ikke bekræftet af ejeren.

### Menukortet er hvide kort, ikke overskrifter

Kunden sendte to skærmbilleder fra spiis (23/8): ét hvidt kort pr.
kategori, et tegn i en rund firkant, antallet ude til højre, en
**stiplet** streg ned til varerne, priserne i mærkefarven yderst.
Farverne er havnens — "bare deres farvepaletter".

Tegnet kommer fra **afdelingen** (mad/is/drikke), som ejeren sætter i
admin — ikke fra kategorinavnet. Tre sande tegn slår fjorten gættede.
`smoerrebroed-ud-af-huset/` har den samme form; to lister over det
samme sortiment må ikke se forskellige ud.

Prisen bruger `--red-tekst` og ikke `--red`: den lille skrift på en
telefon falder under 4,5:1 med mærkefarven selv.

### Menukortet kan administreres — helt

Beskrivelsen kan rettes, rækkefølgen flyttes med pile, og kategorier
kan oprettes, omdøbes, flyttes og (kun når de er tomme) slettes.
Ingen af delene krævede noget nyt i databasen — adgangsreglerne har
tilladt det hele tiden.

**Pilene BYTTER sorteringstal** i stedet for at sætte hele listen om:
to skrivninger, og ingen anden række rykker sig, mens man kigger.
Er de to tal ens — og det er de, hvis rækkerne er oprettet i SQL —
får de to nye, så byttet kan ses.

**Navne i admin står i `<input>`-felter.** Playwrights `hasText` kan
ikke se en feltværdi. Derfor bærer rækkerne `data-vare` og grupperne
`data-kategori`; vælg på dem i prøver.

### Alle fire formularer bruger .form-kort

`bestil/`, `selskaber/`, `bord/` og `baglokale/` ser ens ud: ét hvidt
kort, fede etiketter over bløde felter, grupper som bjælker, én stor
knap i bunden. Formen er spiis', farverne er havnens.

**Alt er scopet til `.form-kort`**, fordi personalesiden bruger de
samme klasser. En regel uden scope laver hele admin om — det er sket
med `.bestil-kort`, som farvede hvert bestillingskort i admin
mørkeblåt med usynlig tekst.

### Hvem sidder med hvad

To modsatte prioriteringer, og de skal ikke blandes sammen:

- **Gæstesiden er telefon-først.** Gæsten står nede ved vandet med
  mobilen i hånden og vil vide, om der er åbent. Alt på `index.html`,
  `menu.html`, `smoerrebroed-ud-af-huset/` og `selskaber/` måles på en
  telefon først
- **Personalesiden er computer- og iPad-først.** Den bruges ved en skærm
  eller på en iPad i køkkenet. Den skal virke på en telefon, men den er
  ikke bygget til den. Derfor sidemenu fra 900 px og op

### Mål det, i stedet for at tro det

Det her projekt har fundet flere fejl ved at måle end ved at læse. En regel,
der ikke kan fejle, måler ingenting: **når du skriver en test, så genindfør
fejlen bagefter og se testen fejle.** Gør du ikke det, ved du ikke, om den
virker.

**Det er ikke teori.** 21. august faldt testen "siden kan ikke rulles
sidelæns" igennem den øvelse: striben fik med vilje `width: 900px` på en
skærm på 390, og testen sagde stadig bestået. Den sammenlignede
`scrollWidth` med `window.innerWidth` — og på en telefon vokser
`innerWidth` med indholdet, fordi browseren zoomer ud. Begge tal kom fra
det, den målte på. **Et af tallene skal komme udefra.**

**⚠️ RÆKKEFØLGEN ER VENDT OM (30/8) — MIKKELS BESLUTNING.**
Her stod "kør altid hele suiten før et push". Det holdt ikke i
praksis: runden tager en halv time, og hver lille rettelse kom
til at koste den. Hans ord: *"fuck alt det med runden — lad os
springe det over, og så efter en masse ændringer teste, om det
hele fungerer."*

Sådan gør vi nu:

```bash
npx playwright test tests/den-fil-jeg-roerte.spec.js   # først: 10 sek-2 min
git push origin HEAD:claude/lesreg-customer-setup-5atpuu   # UDGIV
npx playwright test > runde.log 2>&1 &                 # og saa hele runden
```

**Går den røde bagefter, rettes den og udgives igen.** Prisen er,
at en fejl kan stå i luften i et kvarter; gevinsten er, at
ejeren ser sine rettelser med det samme. Det er hans afvejning,
ikke vores — men **den fulde runde skal stadig køres**, bare
efter. Springer den over helt, er vi tilbage ved 30/8, hvor ti
prøver havde målt en side, der ikke fandtes, i en uge.

**Og maskinen kørte på det halve:** Playwright bruger som standard
kerner ÷ 2. `workers: 4` i konfigurationen tog runden fra ~25 til
~13 minutter. Sæt aldrig flere end der er kerner — så begynder de
tidsfølsomme prøver (uret, autogem efter 1,2 sekund) at falde på
ventetid i stedet for på reglen.

### Se siden, før du foreslår noget

Prøverne fanger det, der kan formuleres som en regel. Resten fanges kun
med øjnene — og det er ikke resten af fejlene, det er nogle af de
dyreste: den gule kant på telefonen (browserens egen farve, står ingen
steder i stilarket), "⚠ ⚠️" foran en fejllinje, 21 foldede kategorier
der stadig fyldte fire skærme, 740 px stiplede grå kasser, hullet på
212 px i galleriet på en bred skærm. Ingen af dem kunne læses frem.

Derfor ligger der to færdigheder i `.claude/skills/`:

```
/se-siden    starter siden lokalt i øvetilstand og tager billeder
/test        kører suiten og forklarer, hvordan en ny prøve skrives
```

**Kør `/se-siden`, før du foreslår en ændring, og efter du har lavet
en.** Kig på billedet med Read — det er hele pointen. Og send billedet
med, når du fortæller Mikkel om noget: han afgør tingene på
skærmbilleder. `.mcp.json` i roden giver desuden en rigtig browser som
værktøj, hvis du hellere vil klikke rundt end skrive et script.

### Fejl, der allerede er lavet én gang

Mønstrene bag de dyre fejl, samlet ét sted. Detaljerne står i afsnittene
længere nede og i README — det her er det, du skal genkende, FØR du
gentager dem:

- **Én fejlende del må ikke vælte resten.** `Promise.all` over otte
  tabeller gav nødmenu med to varer, fordi ÉN tabel manglede — og siden
  så helt normal ud imens. Samme mønster i forsidens sektioner: hver
  del har sin egen fangst nu
- **En kommentar er ikke et værn, og en note er ikke et tjek.** "Fejler
  tabellen, degraderer den pænt" — det gjorde den ikke.
  "er-vi-klar.sql fanger det" — linjen fandtes ikke. Skriver du, at
  noget fanges, så åbn filen og se linjen stå der
- **To funktioner med samme navn i ét objekt: den sidste vinder tavst.**
  `hentBorde`/`sletBord` ramte det, ingen fejl i konsollen. Tjek
  navnene, når noget "bare ikke sker"
- **Kolonner må aldrig sendes ubetinget.** `vis_fra` stod som fast
  linje og væltede nyheder i produktionen med PGRST204 — mens noten
  lige over advarede mod præcis det. `!== undefined`-mønstret er loven
- **En regel uden scope laver hele admin om** (`.bestil-kort`), og
  `:root` rammer ni gæstesider. Gæstetema og personaletema deles om
  `css/style.css` — scope alt til `body.personale`, og mål begge sider
- **To udgaver af samme regel skrider fra hinanden** — varsel, tegn,
  adresser, "hvornår er der åbent". Reglen bor ét sted
  (`bestil-regler.js`, `menu-emoji.js`, `billedplads.js`), og en kopi
  er en kommende fejl
- **Summen kan være forkert, selv om hver regel er rigtig.** Pillen lå
  oven i heroens manchet; galleriets mål gik kun op på en telefon.
  Den slags findes KUN ved at måle på flere skærmbredder
- **"Alle steder" betyder alle flader.** Kransen kom på siderne, men
  favicon og PWA-ikon var stadig det gamle mærke — glemt to gange, og
  kunden så det før os
- **Øvetilstanden skal fejle som skyen.** `lokalt()` kastede synkront
  forbi sin catch; en mock, der er mildere end databasen, tager imod
  det, produktionen afviser
- **⚠️ OG `setup.sql` ER IKKE SKEMAET — den er FØRSTE lag.** Tre
  filer faldt hos kunden på én dag, fordi den lokale efterligning
  var bygget efter `setup.sql` alene: `lokationer.adresse` er
  `not null` (linje 101), `indstillinger` har kolonnen `aendret`
  (242), og `indstillinger`s primærnøgle er **ikke** `noegle` —
  `flerlejer.sql` linje 231 gjorde den til `(lokation_id, noegle)`.
  Alle tre bestod lokalt og fejlede i produktionen. **Slår du en
  tabel op i `setup.sql`, så grep tabelnavnet i de øvrige filer
  bagefter** — og se hvordan en fil, der VIRKER, gør det
  (`demo-indhold.sql` skrev `(lokation_id, noegle, vaerdi)` hele
  tiden)
- **Hvad tror en travl person, det betyder?** Gendan-knappen der
  "ikke virkede" (forkert genindlæsning), noten der blev til fem
  arrangementer, antal-felter der skriver morgenens tal tilbage —
  systemet gjorde det, koden sagde; det var meningen, der var forkert

---

## Det kunden har sagt, og som stadig gælder

Det her er ikke smag. Det er aftaler med kunden:

- **Alt det, vi ikke har beviser på, skal ikke stå på siden.** Ingen opfundne
  tal, ingen gættede faciliteter
- **Brug aldrig opdigtede anmeldelser**
- **Oplys ikke om parkering, hunde, legeplads eller handicapadgang**, medmindre
  det er bekræftet
- **Opfind ikke svaret.** Er adressen uklar, så skriv det — gæt ikke
- **Ingen hemmelige nøgler i klientkoden.** Anon-nøglen er offentlig med vilje;
  `service_role` må aldrig komme i nærheden af `js/config.js`
- **Admin skal blive ved med at være `noindex, nofollow`**
- **Skriv ikke "Bestil takeaway" uden præcisering** — det er smørrebrød ud af
  huset, ikke al mad

---

## Hvor vi er nu

**Fase 0 er færdig — i koden OG i databasen.** Hele rækkefølgen er kørt i
Mosede-projektet den 18. august 2026, og `proev-flerlejer.sql` skrev
**ALLE 23 AF 23 BESTOD**: adgang pr. forretning, gæsten der må skrive men
ikke læse, og bremsen på bestillinger er bevist dér, hvor det gælder.

Undervejs blev spiis' setup.sql ved en fejl kørt i Mosede-projektet.
Det er ryddet op med `supabase/ryd-spiis-op.sql`, efterprøvet med en
tabelliste. Sker det igen: filen ligger der, og storage-spanden skal
slettes i dashboardet (SQL må ikke, fejl 42501).

**Fase 0 er lukket helt** (bekræftet af Mikkel 18/8): han er logget ind i
admin med den rigtige e-mail, og forsiden viser hele menukortet uden
advarslen om manglende forbindelse. Kode, database og side hænger sammen.

Går forsiden en dag i nødmenu igen, står svaret i browserens konsol:
`js/store.js` skriver `Kunne ikke hente fra databasen …` med tabelnavn og
statuskode.

**Fase 2 er færdig — i koden OG i databasen.**
`supabase/forespoergsler.sql` er kørt i Mosede-projektet den 19. august
2026 (4 adgangsregler, 1 bremse), og `proev-forespoergsler.sql` skrev
**ALLE 23 AF 23 BESTOD**. Tabellen `forespoergsler`, adgangen pr.
forretning, bremsen, admin-fanen og siden `selskaber/` er dermed på
plads. Se README-afsnittet "Forespørgsler: catering, baglokale og
selskab".

**Og den ER i luften.** Det stod her et stykke tid, at fase 1 og 2 lå
på en branch, workflowet ikke udgiver. Det gælder ikke længere:
arbejdet pushes til `claude/lesreg-customer-setup-5atpuu`, som
udgiver, og `claude/lesreg-fase-1-admin-refactor-p7xqn9` sættes
bagefter til samme commit (`git branch -f` + `push -f`), så de to ikke
skrider fra hinanden. **Et push går direkte i luften — tænk over det,
før du pusher noget halvt.**

**Fase 3 er færdig — i koden OG i databasen.** `supabase/kalender.sql`
er kørt i Mosede-projektet den 19. august 2026, og den udgivne forside
kører på kalenderen. Er `proev-kalender.sql` ikke kørt endnu, så kør den:
den skal skrive **21 × BESTOD**. Se README-afsnittet "Kalenderen: ét
sted der ved, hvad der sker hvornår".

**Arrangementer HAR en gæsteside nu**: `arrangementer/` viser
kalenderens offentlige arrangementer. Klienten filtrerer selv på
`offentlig` som værn i øvetilstand; i produktionen gør adgangsreglen
det. Se README-afsnittet "Skallen: én indgang pr. ærinde".

**⚠️ Siden `selskaber/` lover med vilje INGENTING** om lokale, antal,
levering eller pris. Ingen af de ting er bekræftet af forretningen, og en
test slår ned på dem. Skal siden sige mere, skal ejeren først bekræfte
det — se listen nederst i README.

**Skallen til hele produktet er bygget** (19/8): topmenu og skuffemenu
med ét punkt pr. ærinde, forsidens "Hvad kan vi hjælpe med?", og fire
nye sider — `bord/`, `catering/`, `baglokale/`, `arrangementer/` — alle
med fuld SEO og uden ét uverificeret løfte. Isfilmen smelter ind i
siden, til solnedgangen toner frem (`.smelter`), og en preload-fejl,
der gav hakkende film på telefonen, er rettet. Se README-afsnittet
"Skallen: én indgang pr. ærinde".

**Fase 4 er færdig — i koden OG i databasen.** `supabase/borde.sql` er
kørt i Mosede-projektet den 19. august 2026 (4 adgangsregler, 1 bremse),
og `proev-borde.sql` skrev **ALLE 26 AF 26 BESTOD**. Bordformularen på
`bord/` (dage og tider fra kalenderen, to timers varsel) og admin-fanen
Borde med dagens billede er i luften. Rækkefølgen er nu
… → forespoergsler.sql → kalender.sql → borde.sql.

**Fase 5 er færdig — i koden OG i databasen.** `supabase/udlejning.sql`
er kørt i Mosede-projektet den 19. august 2026 (4 adgangsregler,
1 bremse, dagen-er-taget-indekset), og `proev-udlejning.sql` skrev
**ALLE 27 AF 27 BESTOD** — heriblandt fasens egne: nummer to kan ikke få
ja til en taget dag, og et nej frigiver dagen. Udlejningsformularen på
`baglokale/` og admin-fanen Baglokalet med lokalets kalender er i
luften. Rækkefølgen er nu … → kalender.sql → borde.sql → udlejning.sql.

**Den direkte forbindelse er bygget** (19/8): admin holder en åben
websocket til Supabase Realtime (js/admin/live.js, håndskrevet Phoenix-
protokol — ikke SDK'et), så nye bestillinger står på skærmen i samme
sekund. **Kør `supabase/realtime.sql`** (skal svare 4) — uden den er
forbindelsen åben, men tavs, og frisk.js' takt dækker.

**Fase 5c er færdig i koden** (19/8): tabellen `push_abonnementer`
(11 × BESTOD lokalt), Edge Function'en `supabase/funktioner/send-push.ts`
(fire tabeller giver push, døren tjekkes først, intet telefonnummer i
beskederne), `sw.js` (kun push — ingen cache), manifest + ikoner KUN på
admin, og kortet "Besked på telefonen" på Kontakt-fanen. **Virker først
efter opsætningen i Supabase-dashboardet** — trinene står i README.
Nøglerne laver Mikkel selv med `supabase/lav-vapid.html` i sin egen
browser; den offentlige indsættes i admin-feltet, og den private og
PUSH_SECRET må ALDRIG i repoet eller i en chat.

**Spis her eller tag med er bygget** (20/8): kolonnen `hvordan` på
bestillinger, valget i formularen og mærket i admin. **Kør
`supabase/spis-her.sql` + `proev-spis-her.sql`** i Mosede-projektet
(4 × BESTOD lokalt) — indtil da er hver bestilling afhentning som før,
og fluebenet på Bestillinger-fanen skal ikke sættes.

**Gæstens halvdel af `store.js` kommer alene nu** (23/8).
Skrivelaget — `Butik.skrive`, 22 kB, som INGEN gæsteside rører —
ligger i `js/store-skriv.js` og indlæses kun af `admin.html`.
Bordbestillingen væltede vægtprøven (727 kB mod et loft på 720),
og prøvens egen note sagde, at svaret ikke måtte være et større
tal. **Forsiden er på 701 kB nu.** To prøver holder delingen:
`Butik.skrive` skal være `undefined` på forsiden og en funktion i
admin. Bygger du noget nyt, personalet skriver med, hører det til
i `js/store-skriv.js` — ikke i `store.js`.

**QR-koderne har fået en nøgle** (30/8). Kundens spørgsmål:
*"er QR-koderne sikre? De peger på et link — hvad hvis nogen har
gemt url'en og pludselig begynder at bestille hjemmefra, eller
vil fucke med cafeen? Hvordan sikrer vi, at folk ikke bare kan
taste url'en ind, men faktisk skal scanne?"*

**⚠️ Kør `supabase/bord-noegle.sql` + `proev-bord-noegle.sql`**
(16 × BESTOD på en lokal Postgres 16, set fejle tre gange:
værnet fjernet → 4 faldt, anon givet kolonnen igen → prøve 8
faldt, nøglen gemt i rækken → prøve 7 faldt).

**⚠️ FØRST DET ÆRLIGE, FOR DET SKAL VIDES, FØR NOGEN BYGGER
VIDERE:** en QR-kode ER et link. Uanset hvad der står i den, kan
den telefon, der scannede, gemme adressen og bruge den fra
sofaen. **Intet, der kan stå i en adresse, beviser, at nogen står
ved bordet lige nu.** Det, nøglen flytter, er grænsen fra *"kan
gætte et tal mellem 1 og 55"* til *"har været ved bordet"* — og
den kan skiftes med ét tryk.

- **`borde.kode`** er seks tegn ud af 32 (ingen 0/O/1/I/L — det
  er dem, folk taster forkert af et kradset skilt), og skiltet
  bærer den som `?bord=7&n=K3F9X2`
- **⚠️ ANON MÅ IKKE LÆSE KOLONNEN**, og det er hele værnets
  fundament: kunne gæsten hente listen med koderne i, kunne
  enhver med anon-nøglen — som ligger offentligt i
  `js/config.js` — selv bygge alle 55 adresser. Det er
  **kolonnerettigheder** og ikke en adgangsregel, så `select=*`
  svarer 42501 for en gæst. Derfor beder `Butik.hentBorde()` om
  kolonnerne ved NAVN, og `hentBorde(true)` er personalets udgave
- **⚠️ OG ØVETILSTANDEN SKJULER DEN LIGE SÅ HÅRDT.** En
  efterligning, der er mildere end databasen, lader fejlen bestå
  lokalt og fælde i produktionen
- **`har_kode` er afledt** (`generated always as (kode is not
  null)`), så siden kan sige *"scan koden igen"*, FØR gæsten har
  fyldt en kurv for 240 kr. Det er ikke en anden udgave af reglen
  — det er den samme kolonne set udefra som ja/nej
- **⚠️ NØGLEN GEMMES ALDRIG.** Triggeren læser den og sætter
  `new.bord_kode := null`. Stod den i rækken, ville den stå på
  personalets skærm, i sikkerhedskopien fra Historik og i enhver
  eksport — og så var den ikke længere en nøgle
- **⚠️ MIGRERINGEN ER MED VILJE TOM.** Filen giver INGEN borde en
  nøgle; gjorde den det, holdt alle 55 skilte op med at virke i
  det sekund, den blev kørt — midt i en frokost. Ejeren trykker
  **"Lås QR-koderne"** i admin → Borde, når han er klar til at
  printe om. Han skal alligevel printe om, når domænet er sat op
- **En ny nøgle dræber den gamle adresse** — det er svaret på
  "nogen har gemt url'en". Ét skilt printes om, ikke 55
- **⚠️ MÆRKET I ADMIN SIGER *OM*, ALDRIG *HVAD*.** Stod koden i
  listen, ville ét skærmbillede af Borde-fanen være 55 gyldige
  adresser
- **⚠️ OG NØGLEN SENDES KUN, NÅR NOGEN HAR RØRT DEN.** Samme lov
  som `vis_fra` på nyhederne: en ubetinget kolonne ville tømme
  nøglen på et låst bord, hver gang ejeren rettede zonen — og
  skiltet ville stadig virke, uden en linje om det nogen steder
- **Printsiden skal være åbnet, mens man er logget ind i admin** i
  den samme browser; ellers kan koderne ikke læses, og siden
  siger det

**⚠️ OG DET VÆLTEDE ET TJEK, DER SÅ BAD OM AT FÅ VÆRNET FJERNET.**
`er-vi-klar.sql` linje 40 spurgte om `grant select on borde` til
anon, altså om TABELLEN. Kolonnerettigheden gør det svar falsk,
og retningen sagde *"kør bordkort.sql igen"* — som giver anon
hele tabellen tilbage. **En tjeklinje, der beder om det modsatte
af det, den skal beskytte, er værre end ingen tjeklinje.** Den
spørger om kolonnen `nummer` nu. Tjek **118 og 119** er nye og
set fejle begge veje.

**⚠️ DET SIDSTE HUL STÅR ÅBENT MED VILJE:** en nøgle kan gættes
ved at prøve sig frem over API'et. 1,07 mia. forsøg er ikke
realistisk for en cafe, men det er ikke nul — og et afvist forsøg
efterlader ingen række, så loftet pr. kvarter tæller det ikke.
Skal det lukkes, skal der logges forsøg, og det er en anden fil.
**Det, der i praksis beskytter mest, er der i forvejen: der
betales ikke noget sted.** En falsk bestilling koster den mad,
køkkenet når at lave — og køkkenet ser "Bord 7" på kortet, mens
bord 7 står tomt to meter væk.

**Bundbjælken på telefonen** (30/8). Kundens ord: *"admin-appen
skal også fixes på telefonen — jeg kan ikke vælge imellem
fanerne, fordi de forsvinder ned i telefonens bar."* Forlægget er
spiis' egen bjælke. **Ingen SQL.**

To fejl på én gang, og den værste var ikke den, han så:

- **Striben rullede SIDELÆNS.** **Målt på en iPhone 13:** fjorten
  piller fylder over 1800 px på en skærm på 390, så tretten stod
  uden for kanten — og der var ikke noget, der sagde, at der VAR
  mere. Nu er det **fem faste pladser**: fire faner og en dør til
  resten
- **Og den lå, hvor browserens egen bjælke lægger sig.**
  `env(safe-area-inset-bottom)` dækker telefonens hjemmestreg,
  ikke Safaris værktøjslinje — der er ti px mere nu
- **⚠️ ARKET ER FANERNE SELV**, ikke en kopi. En ny fane er
  stadig ét sted at rette. To kolonner, så alle fjorten er på
  skærmen uden at rulle i et ark, man lige har åbnet
- **⚠️ "MERE" HAR SIT EGET TAL**, og det er den ene ting,
  forlægget ikke gør: ligger der en forespørgsel og venter, står
  den bag "…", og uden et tal på døren er den usynlig, til nogen
  tilfældigvis kigger ind
- **⚠️ TALLENE ER SPEJLE, IKKE KOPIER.** De læses af fanens eget
  mærke gennem en `MutationObserver` — baren regner ikke efter,
  den kigger. Første udgave hang kun på `Admin.tegnere`, og
  **målt:** baren stod uden tal, mens fanen sagde 2, fordi mærket
  sættes inde i `tegnBestillinger`, når LISTEN kommer
- **⚠️ KNAPPERNE BÆRER `data-gaa`, IKKE `data-panel`** — to
  elementer med samme attribut ville betyde, at en prøve ramte to
  knapper for én fane
- **⚠️ OG 127 PRØVER PEGEDE DIREKTE PÅ `[data-panel]`.** De ramte
  dermed et element, en finger ikke kan nå på en telefon, og
  hvert klik brugte tredive sekunder på at give op:
  `admin.spec.js` gik fra 1,3 minut til **8,4**. Det så ud som en
  fejl i prøverne, men det VAR det rigtige svar. De går gennem
  `visFane(page, id)` i `tests/hjaelp.js` nu — den vej, personalet
  går — og det er samtidig en prøve på, at vejen findes
- **⚠️ `[aria-expanded]` UDEN SCOPE RAMTE "MERE".** En prøve i
  `admin-design.spec.js` foldede fanelisten ud og ledte efter
  varerækker i den. Scopet til `#p-menu` nu

**Bordbestilling med QR er bygget** (23/8). Gæsten scanner mærkatet
på bord 7, får lugens kort på sin egen telefon, og bestillingen
lander i Overblik med **Bord 7** på. Ingen betaling, ingen løbende
regning — man betaler ved lugen som altid. Se README-afsnittet
"Bestilling fra bordet".

**⚠️ Kør `supabase/bordkort.sql` + `proev-bordkort.sql`** i
Mosede-projektet (14 × BESTOD lokalt), efter `spis-her.sql`.
Bordene oprettes derefter i admin → Borde; **indtil ejeren har
oprettet mindst ét bord, virker ingen QR-kode**, og siden siger
det selv.

Fire ting er værd at kende:

- **Bordene er DATA.** En QR-kode kan ikke laves om, når den ligger
  på et bord — men bordene ændrer sig. Numrene bor i tabellen
  `borde` og aldrig i koden, og `print/bordkort.html` tegner
  skiltene ud fra listen. Adressen tages fra `location.origin`, så
  et eget domæne ikke kræver en kodeændring; printsiden advarer,
  hvis den er åbnet fra en egen maskine
- **Bordnummeret er leveringsadressen.** Der er ingen hentetid,
  hvor køkkenet kan opdage en fejl. Derfor er det RÆKKENS navn,
  der skrives på bestillingen — ikke gæstens tekst i adressen
- **`ved-bordet/` er `noindex`**, som admin. Står den i Google, kan
  en, der aldrig har været på havnen, bestille til bord 7, mens et
  rigtigt selskab sidder ved det. Siden har heller ingen menu og
  ingen tilbage-pil: hvert link væk er en vej ud af bestillingen
- **Et bord er spis her**, og databasen binder de to sammen

**⚠️ To navnesammenstød kostede tid samme dag, og begge var
tavse.** `Butik.hentBorde` hentede bordBESTILLINGER, og
`skrive.sletBord` slettede en bordbestilling. Da bordene selv blev
en tabel, fik de nye funktioner samme navn, og **den sidste i
objektet vandt uden en eneste fejl i konsollen**: bordsiden bad om
borde og fik bookinger, og "Slet bord" i admin gjorde ingenting.
De hedder `hentBordbestillinger` og `sletBordbestilling` nu.
Begge blev fundet af prøver, ingen af dem ved at læse koden.

**QR-koderne tegnes i browseren** (`js/qr.js`) og ikke af npm.
`vaerktoej/lav-qr.js` bliver: den laver de to FASTE koder til
`bestil/` og `menu.html`. **En QR-kode, der er en smule forkert,
ser rigtig ud** — derfor måles motoren tern for tern mod
npm-pakkens facitliste i `tests/facit/qr-facit.json`. Den fandt to
fejl, hvor alle 208 datatern var rigtige: formatbittene stod
spejlvendt, og det tern, der altid er mørkt, var slukket.

**Rettelseslisten fra spiis-gennemgangen: punkt 1 og 2** (23/8).
Listen er en gennemlæsning af den UDGIVNE kode, ikke af SQL-mappen —
derfor stod punkt 2 som "tjek først".

**Punkt 1, admin blinker ikke, er hel nu.** Fingeraftrykket i
`genindlæs()` var der (22/8): en hentning uden ændringer tegner
ingenting. Men når ét kort ændrede sig, blev HELE listen revet ned —
og noten på kortet gemmes ved `change`, altså når feltet forlades.
**Målt i Chromium:** skriver personalet en note, og der lander en
bestilling, mister markøren sit felt, og browseren fyrer et `change`
på vejen ud, så den halve sætning gemmes af sig selv. Andre browsere
fyrer det ikke, og så er den bare væk — og køkkenet står med en
iPad. `Admin.tegnRaekker` tegner nu de fire lister række for række:
uændrede kort bliver **stående**. Prøven i `tests/admin.spec.js` er
set fejle med den gamle optegning.

**Punkt 2 var lukket i koden, men ikke i papirerne.**
`supabase/lukkedag-vaern.sql` + `proev-lukkedag-vaern.sql` har ligget
der siden 22/8 — de stod bare hverken i README, i CLAUDE.md eller i
`er-vi-klar.sql`, og derfor lignede hullet et hul. Nu står de tre
steder. **Værnet er samtidig hærdet:** funktionen var ikke
`security definer`, så den slog kalenderen op med GÆSTENS øjne.
Målt på en rigtig Postgres: strammes `kalender_laes_alle` til
`using (offentlig)`, kunne gæsten bestille på en lukket dag igen —
uden fejl og uden spor. Prøven er nu **9 AF 9 BESTOD**, og nr. 9
skriver `FEJLEDE`, hvis hærdningen fjernes.

**⚠️ Kør `supabase/lukkedag-vaern.sql` + `proev-lukkedag-vaern.sql` i
Mosede-projektet.** Filen skal køres igen, også hvis den er kørt før
— hærdningen er ny. Kør derefter `er-vi-klar.sql`: linje 34-36 siger,
om værnet står, om det er `security definer`, og om søgestien er
låst. Alt er kørt og bevist på en lokal Postgres 16, ikke i Supabase;
det sidste kan kun Mikkel gøre.

**Tre layoutfejl fra kundens egen telefon** (23/8): *"fix det der
grimme layout og linjerne går ud over hinanden."*

- **Den valgte vares røde ramme blev klippet.** `.stk-linje` har
  `margin: 0 -14px`, så en valgt linje kan række ud i afsnittets
  luft — men inde i en `.vare-gruppe` er der `overflow: hidden`.
  **Målt: linjen stak 13 px ud til HVER side**, så venstre og
  højre kant forsvandt, og tilbage stod to vandrette streger fra
  kant til kant, der lignede en fejl. `margin-inline: 0` inde i
  gruppen
- **Prisen havde 2 px til kortkanten** og så klippet ud. Samme
  rettelse gav den 16
- **Den klæbende kurv flød sammen med listen** — samme sandfarve
  som afsnittet, ingen kant. Den fik en
- **Topbjælken stod på 96 %**, og de fire procent var nok til, at
  teksten under kunne anes. Helt ugennemsigtig nu

En måling gennemgik bagefter otte sider for elementer, der stikker
ud over en forælder, som klipper: **ingen flere.**

**⚠️ TO PRØVEFILER MÅLTE PÅ SIDER, DER BLEV VEJVISERE** (30/8), og
den ene af dem bar et sikkerhedsværn, ingen anden dækkede.

- **`tests/menuside.spec.js` er parkeret** i `tests-gamle/`. Den
  målte `menu.html`; menukortet bor i `m-menukort.html` nu, og
  `tests/skal-menukort.spec.js` dækker de samme 19 regler
- **⚠️ MEN TRE AF DENS PRØVER ER FLYTTET MED, IKKE SLETTET.** De
  målte noget, INGEN anden prøve dækkede: at et varenavn med HTML
  i sig vises som TEKST (ejeren skriver navnene — bygges listen
  med `innerHTML` en dag, kører det som kode i gæstens browser),
  at siden ikke går ned ved en tom database, og at en kategori med
  en gammel afdeling stadig står på kortet. De står nu under
  "Værn, der fulgte med fra den gamle menuside"
- **`udlejning.spec.js`s fire gæsteprøver er sprunget over**, ikke
  slettet, med en grund der kan grepes frem. Personalets halvdel
  af filen kører videre

**Læren:** dækning forsvinder ikke ved, at en prøve fejler — den
forsvinder ved, at filen holder op med at blive kørt. Parkerer du
en prøvefil, så læs den igennem for det, ingen anden måler.

**⚠️ DER STOD TO UDGAVER AF HJEMMESIDEN I LUFTEN** (30/8), og
det var den dyreste opdagelse i gennemgangen. **Målt:** nitten
gæstesider — ti på designet fra 23/8 og ni på det gamle stilark.
Af de ni kunne **kun `bord/`** nås fra den nye side. De otte andre
var forældreløse, havde **ingen `noindex`** og pegede canonical på
sig selv.

En gæst, der googlede "smørrebrød Mosede Havn", kunne altså lande
på `smoerrebroed-ud-af-huset/` i det GAMLE design — og derfra førte
hvert eneste link dybere ind i den gamle verden. Hun så aldrig den
nye side.

**Syv adresser er vejvisere nu**, ikke sider: `menu.html`,
`selskaber/`, `catering/`, `baglokale/`, `arrangementer/`,
`nyheder/` og `smoerrebroed-ud-af-huset/`.

- **De er ikke slettet.** Adressen står i Googles resultater og i
  folks bogmærker; en 404 er et blindt spor
- **Tre lag, fordi GitHub Pages ikke har en server:** `canonical`
  fortæller Google, hvad der er den rigtige side, `refresh`
  flytter browsere uden JavaScript, og `location.replace` flytter
  med det samme UDEN at lægge sig i historikken — ellers sender
  tilbage-knappen gæsten frem og tilbage i en løkke
- **De beholder favicon**, for de vises i et brøkdel af et sekund,
  og et blankt ark i fanen er dét, gæsten når at se

**⚠️ `bestil/` OG `bord/` BLIVER.** De kan noget, de nye ikke kan:
`bord/` er den eneste vej til en bordbooking, og `bestil/` bar
fyldvælgeren. En prøve holder fast i, at de to IKKE bliver til
vejvisere — det ville fjerne en funktion, ingen ville opdage, før
en gæst prøvede.

**⚠️ OG `baglokale/` VAR IKKE DET SAMME SOM `h-baglokale.html`.**
Den skrev en **udlejning** (`Butik.lejLokale`), mens den nye
skriver en **forespørgsel**. Det så jeg efter, før jeg omdirigerede
— og det er stadig rigtigt at gøre: flowet er "gæsten spørger,
personalet booker" siden 29/8, og udlejningen oprettes af knappen
"Book lokalet til dem" i admin. Men noten øverst i
`js/admin/udlejning.js` om TO gæsteindgange til lokalet beskriver
ikke længere virkeligheden: der er én.

**Fyldvælgeren kunne ikke nås af nogen** (30/8). Model A — hvert
fyld er en vare med sin egen pris — har levet på `bestil/` siden
20/8. **Målt:** `bestil/` var kun linket fra `menu.html`, som selv
var forældreløs. Altså kunne INGEN gæst vælge fyld til sit
smørrebrød, selv om ejeren har 29 slags i admin. Kundens
beslutning: byg den ind i den nye side.

- **Formen er designets egen.** Designet har ikke tegnet en
  fyldvælger, men `.chipset` ER en pillevælger — den samme som
  tidsrummet på baglokalet. Vi opfinder ikke en ny form
- **Fyldet lægges ikke til summen og er ikke en linje.** Det er
  ØNSKER uden pris; talte de med, fik gæsten et beløb, hun ikke
  skal betale, og køkkenet et stykke, ingen har bestilt. Det
  sendes i kolonnen `fyld`, som `bestil/` har brugt siden 20/8
- **Afsnittet skjuler sig**, når der ikke er noget at vælge

**⚠️ OG DESIGNET EJER MARKERINGEN — VI LÆSER DEN.**
`havnegrillen.js` binder sin egen lytter på hver `[data-chips]` og
slår `.on` til. Første udgave togglede OGSÅ, og de to ophævede
hinanden: **målt på en iPhone 13** stod tælleren på "2 slags
valgt", mens begge piller så uvalgte ud. Nøjagtig samme fælde som
segmentknapperne samme dag. Aflæs det, designet faktisk styrer.

**⚠️ OG `toBeHidden()` ER SANDT FOR ET ELEMENT, DER IKKE FINDES.**
Prøven "uden ønskefyld findes afsnittet ikke" bestod, også da hele
vælgeren var rullet væk — den målte ingenting. Den kræver nu
FØRST, at afsnittet er der, og DEREFTER at det er skjult.

**Arrangementet kunne ikke RETTES — og det var roden til, at
reservationen "ikke virkede"** (31/8). Kundens ord: *"ift
reservér en plads til de arrangementer de lægger op virker ikke,
der er ikke en reservér plads-knap ... og knappen dirigerer ingen
steder hen."*

**⚠️ Kør `supabase/arrangement-info.sql`** (kun én kolonne:
`kalender.billede`).

Tre fejl i kæde, og de forklarer hinanden:

1. **`tilmelding` er slået FRA som standard** — med vilje, se
   afsnittet nedenfor
2. **Et arrangement kunne oprettes og slettes, men ALDRIG
   rettes.** Var fluebenet ikke sat, fandtes der ingen vej til at
   sætte det bagefter. Rækken var låst som "kig forbi" for altid
3. **Og så pegede den flydende pille "Reservér plads" på
   `#reserver`, som stod med `display:none`.** Et tryk gjorde
   præcis ingenting — browseren hopper ikke til noget, den ikke
   kan se. Ingen fejl, ingen bevægelse, og gæsten tror, siden er
   i stykker

**⚠️ OG TO FELTER FANDTES SLET IKKE I ADMIN.** Gæstesiden har
vist `beskrivelse` og `start_kl`, siden arrangementerne blev
bygget — men der var ingen felter at skrive dem i. Ejeren lagde
et arrangement op, og på hjemmesiden stod en dato og en titel og
ikke andet.

- **`Butik.skrive.kalender` har kunnet rette hele tiden** — den
  tager et `id`. Admin brugte det bare aldrig. Rettelsen er
  derfor ÉN formular med to ord på knappen, ikke en ny
- **Listen siger nu, om der kan reserveres** (`🎟️ Tager imod ·
  40 pl.` mod `Kig forbi`). Det var præcis den oplysning, kunden
  ledte efter og ikke fandt
- **`pegVidere()` holder de tre knapper på virkeligheden:** kan
  man reservere, peger de på formularen; kan man ikke, peger de
  på LISTEN og siger "Se arrangementerne". Ét sted at rette
- **⚠️ Teksten skiftes i tekstknuden**, ikke med `textContent` —
  designets `<svg>` og `.sheen` ligger i den samme knap
- **Billedet er valgfrit og har INGEN pladsholder.** Samme regel
  som `billedplads.js`: en tom grå kasse er værre end ingen
  plads, og et stockfoto af en koncert ville love en koncert, vi
  ikke har set. Samme storage-spand som nyhederne — en ny spand
  er fire adgangsregler, ejeren skal oprette i dashboardet
- **⚠️ Billedet sendes KUN, når nogen har rørt det.** Samme lov
  som bordets nøgle og nyhedernes `vis_fra`: `undefined` betyder
  "lad det være". Ubetinget ville en rettelse af titlen tage
  fotoet med sig, uden en linje om det nogen steder
- **⚠️ Overskriften følger tilstanden.** Målt på et skud: kortet
  sagde "Læg noget i kalenderen", mens felterne stod fyldt ud med
  en række, man var ved at rette — og så tror man, man opretter
  en dublet

Fem falsifikationer, fem fald: Ret-knappen fjernet, `id` ikke
sendt (rettelsen oprettede en ny række), billedet tømt ved et gem
af noget andet, pillen låst til `#reserver`, og beskrivelsen ikke
sendt. **Og én falsifikation BESTOD først** — `billede: nytBillede`
er ikke en fejl, fordi `undefined` springes over alligevel; den
rigtige fejl er `nytBillede || ''`.

**⚠️ OG PRØVEN FALDT I EN FÆLDE, FILEN HER ALLEREDE ADVARER MOD.**
`sætDataEngang` skriver kun i localStorage, HVIS den er tom — en
prøve, der åbnede admin to gange med forskellige data, målte de
FØRSTE begge gange. Delt i to prøver.

**Arrangementer kan reserveres nu** (30/8). Kundens spørgsmål:
*"kalender og arrangementer er fedt og godt, men hvor kommer
reservationerne hen, hvad kan admin styre, hvordan gør vi det
bulletproof ift kunder og admin?"*

Svaret var: **ingen steder.** Knappen "Reservér plads" har stået
på `h-kalender.html`, siden designet kom 23/8, og siden indlæste
ikke engang `js/store.js`. Den viste **fem opfundne
arrangementer** — Ronni & de Salte, torskegilde, efterårsbrunch —
med datoer, priser og "12 pladser tilbage". Det stod som et kendt
hul i papirerne. Det er lukket nu.

**⚠️ Kør `supabase/arrangementer.sql` + `proev-arrangementer.sql`**
(11 × BESTOD på en lokal Postgres 16, set fejle begge veje).

- **`kalender` fik fire kolonner:** `tilmelding`, `pladser`,
  `pris_tekst` og `start_kl`. Tilmelding er **slået fra som
  standard** — de fleste arrangementer på en havn er "kig forbi",
  og stod den til, ville hvert eneste arrangement pludselig bede
  gæsterne om navn og nummer
- **Tabellen `reservationer`** med det samme skelet som resten:
  gæsten skriver, personalet ser, status går én vej, gæsten må
  ikke læse

**⚠️ PLADSERNE TÆLLES I DATABASEN, IKKE I BROWSEREN.** To gæster,
der trykker samtidig på den sidste plads, er ikke et sjældent
tilfælde til en koncert — det er dét, der sker, når linket lige er
delt. `reservation_bremse` tæller inde i transaktionen og siger
nej til nummer to. **Og et afslag frigiver pladsen igen:**
tællingen springer de afviste over, så en aflyst reservation ikke
spærrer for en, der gerne vil. Derfor er Afvis heller ikke en
sletning.

**⚠️ VISNINGEN `arrangement_pladser` MÅ ALDRIG FÅ EN KOLONNE
MERE.** Samme regel som `optagne_dage` og `bord_travlhed`: den
kører med sin EJERS øjne og springer adgangsreglerne over — det er
hele meningen, for gæsten skal kunne se "3 pladser tilbage" uden
at kunne læse, HVEM der har taget de andre. Prøve 8 tæller
kolonnerne.

**⚠️ DE FEM OPFUNDNE ER IKKE EN RESERVE — og det er modsat resten
af huset.** Andre steder gælder "vi overskriver kun, når databasen
har noget at sige", og designets pladsholder bliver stående. Her
er det omvendt: en pladsholderPRIS er et tal, der er for højt
eller lavt. Et opfundet ARRANGEMENT er en aften, folk møder op
til. Kører gæsten til havnen fredag kl. 19 efter en koncert, der
aldrig har eksisteret, er det ikke en skæv oplysning — det er en
spildt aften. Er der ingen arrangementer, siger siden det.

**Arbejdsdelingen mellem de to faner:** Kalender er HVAD der sker,
hvor mange pladser og hvad det koster; **Tilmeldinger** (ny fane i
Dagen-gruppen) er HVEM der kommer — listen, man krydser af i
døren. **Én liste pr. arrangement, ikke én lang:** personalet står
i døren til ét arrangement, ikke til efterårets fem. Samme
beslutning som Køkken-kø, hvor bordnummeret er adskillelsen.

**⚠️ MEN MÆRKET I SØJLEN TÆLLER PÅ TVÆRS.** Et tal, der kun gjaldt
det valgte arrangement, ville skjule, at der er tre nye til
fredagens koncert, mens man kigger på torsdagens.

**⚠️ FANEN VÆLTER IKKE, FØR SQL'EN ER KØRT.**
`Butik.hentReservationer` svarer med en TOM liste i stedet for en
fejl, og admins kalenderfelter spørger databasen, om kolonnerne
findes (`maaTilmelding()`, samme greb som `maaAntal()` og
`maaVindue()`). Uden det kunne ejeren ikke oprette et arrangement
overhovedet — på grund af en fil, han ikke ved eksisterer.
**Og uden rækker skjules felterne:** de to valg fejler hver sin
vej, og den ene retter sig selv.

**⚠️ SEKS PRØVEFILER HOLDT OP MED AT MÅLE NOGET — OG TRE
RIGTIGE FEJL LÅ BAGVED** (30/8). Da otte gamle adresser blev
vejvisere, fulgte prøverne ikke med. De fejlede ikke: de
navigerede til en side, der sender videre, og målte enten
ingenting eller en HELT anden side end den, de hed. Alle
prøvefiler er søgt igennem for navigationer til de syv
vejviser-adresser, i stedet for at vente på at runden fandt dem
én ad gangen. **Ingen SQL.**

- **`forespoergsel.spec.js`s gæstehalvdel (19 prøver) er sprunget
  over**, admin-halvdelen kører videre — den er den eneste prøve
  på Forespørgsler-fanens kort. **SEKS prøver er FLYTTET** til
  `skal-forespoergsel.spec.js` mod `h-selskaber.html`, fordi de
  målte noget, ingen anden dækkede: referencen, kvitteringen der
  ikke må love en booking, personoplysninger der ikke må blive
  liggende i browseren, dobbeltafsendelsen, det umulige antal og
  at dato og antal er **frivillige**
- **`fyld-model-a.spec.js`, `menukort-admin.spec.js` (tre),
  `dagens-retter.spec.js` (to), `admin.spec.js` og
  `admin-nyheder.spec.js`** målte `menu.html`,
  `smoerrebroed-ud-af-huset/` og `nyheder/`. De måler
  `m-menukort.html`, `bestil/` og forsiden nu

**⚠️ EN GÆST UDEN DATO KUNNE IKKE SENDE — OG FIK INTET AT VIDE.**
`tjekDato()` sluttede med `return rydFejl()`, og `rydFejl()`
returnerer ingenting. Afsendelsen gør `if (!tjekDato()) return
false`, så et tryk på Send gjorde **absolut ingenting**: ingen
kvittering, ingen fejl, ikke en linje i konsollen. Knappen så
bare ud, som om den ikke virkede — på **alle fire**
forespørgselssider. Og den ramte netop den gæst, fase 2 er bygget
for: *"sølvbryllup engang til foråret, hvad koster det?"* er den
forespørgsel, der er mest værd. Fundet af den SIDSTE af de seks
flyttede prøver, i samme åndedrag som flytningen.

**⚠️ ET UMULIGT ANTAL BLEV FØRST AFVIST AF DATABASEN.**
`forespoergsel_antal_ok` holder 1-500. Den gamle selskabsside
tjekkede det selv (`#fejl-antal`); det fulgte ikke med, da
siderne blev designets. Formularen siger det nu, og
øvetilstanden i `store.js` siger det under den — **tallet står
to steder med vilje**, og fjernes kun det ene, består prøven
stadig.

**⚠️ EN KLASSE MED `display` SLÅR BROWSERENS EGEN
`[hidden]`-REGEL.** `.lk-tegn` (forklaringen "Ledig / Optaget")
havde `hidden=""` og var synlig alligevel — så på et selskab **ud
af huset**, hvor ingen dag kan være optaget, lovede nettet en
ledighedsoplysning, det slet ikke giver. Nøjagtig samme fælde som
`.music` på forsiden. Fundet ved at måle **synligheden** og ikke
attributten. Alle klasser med `display`, der skjules med
`el.hidden`, er gennemgået: der er ikke flere.

**⚠️ OG TO PRØVER VAR FORÆLDEDE MOD EN ÆNDRING, VI SELV TRAF.**
Ledighedsnettet skulle forsvinde ved "ud af huset". Så bad kunden
om en rigtig datovælger, og **nettet ER datofeltet nu** på alle
fire sider. Prøverne måler det, der stadig følger `optagerDagen`:
markeringen af optagne dage og forklaringen — ikke nettet selv.

**⚠️ OTTE JAVASCRIPT-FILER INDLÆSES IKKE AF ÉN ENESTE SIDE**
efter sammenlægningen: `arrangementer.js`, `baad.js`,
`baglokale.js`, `forespoergsel.js`, `intro.js`, `menuside.js`,
`nyheder.js` og `smoerrebroed.js`. De er ikke slettet — af samme
grund som siderne ikke er det — men de er en fælde for den, der
læser koden om et halvt år og tror, de kører. Slettes de en dag,
skal `tests-gamle/` og de sprungne prøver læses igennem først.

**Pladstallet stod stille, lige efter gæsten havde reserveret**
(30/8). **Målt på et skærmbillede**, ikke ved at læse koden:
kortet sagde stadig "40 pladser tilbage", i det sekund Anna havde
taget fire. Næste gæst så det rigtige tal — men hun, der lige
havde reserveret, læste det som om det ikke var gået igennem, og
så trykker man igen. Det er ikke et gæt at rette det: vi ved
præcis, hvor mange hun tog, og næste hentning overskriver tallet
med databasens eget.

**⚠️ EN PRØVEFIL OPRETTEDE EN FORRETNING UDEN ADRESSE — OG DEN
LOKALE POSTGRES VAR MILDERE END SKYEN** (30/8). Mikkel kørte
`proev-arrangementer.sql` og fik `23502: null value in column
"adresse"`. `lokationer` har haft `adresse`, `postnr` og `by` som
**not null** siden `setup.sql` linje 101, så filen faldt på linje
19 — før ét eneste tjek var nået. Den bestod lokalt, fordi
tabellen dér var en håndlavet stub med tre kolonner. Det er
"øvetilstanden skal fejle som skyen", nu på SQL-siden: **en
efterligning, der tager imod mere end produktionen, beviser
ingenting.** Den lokale tabel matcher `setup.sql` nu, og den
gamle udgave er set fejle på den med nøjagtig Mikkels fejlbesked.
`proev-foresp-kontakt.sql` havde samme fejl; seksten andre
`proev-`filer skrev kolonnerne i forvejen.

**✅ `arrangementer.sql` ER KØRT i Mosede-projektet** (30/8,
bekræftet af Mikkel: *"sådan det virkede"*). Tabellen
`reservationer`, de fire kolonner på `kalender`, bremsen og
visningen `arrangement_pladser` er dermed på plads i databasen —
koden bagved venter stadig på at blive udgivet.

**Catering og frokost fik selskabernes runde** (30/8). Kundens
liste, punkt for punkt. **Ingen SQL.**

**⚠️ OG FØRST DEN FEJL, HAN SÅ: SEGMENTKNAPPERNE VIRKEDE IKKE.**
Kundens ord: *"catering knapperne virker ikke ift levering eller
afhentning."* **Målt på en iPhone 13:** et tryk på "Afhentning"
skjulte adressefeltet, men `.on` blev stående på "Levering" —
designets `[data-toggles]` i `havnegrillen.js` flyttede aldrig
markeringen. Begge knapper så uændrede ud, så gæsten trykkede
igen, og bagefter kunne hun ikke se, hvad hun havde valgt.
Rettelsen er den linje, `[data-chips]`-enkeltvalget bruger lige
ovenfor. **Det ramte tre sider:** catering, frokost og
baglokalets med-mad/kun-lokalet.

**⚠️ MEN AFLÆSNINGEN ER STADIG FELTETS SYNLIGHED**, ikke `.on`.
Se `segSvar()`: en catering, hvor gæsten havde trykket Afhentning,
blev engang sendt som en LEVERING med adresse på, fordi koden
læste `.on`. De to ting passer sammen nu — det, der afgør, hvad
der SENDES, skal blive ved med at være det, designet faktisk
styrer.

**Forslag OG fritekst — og de to opfører sig modsat:**

- **Anledningen ERSTATTER.** Gæstens egne ord vinder over chippen,
  fordi hun ikke har trykket på "Privatfest" — den var valgt på
  forhånd. Rækkefølgen i `detaljer()` afgør det: chips først,
  `ekstra` bagefter
- **Maden LÆGGES TIL** (`chipsTillæg`). Man vælger smørrebrød OG
  skriver "og noget vegetarisk"; erstattede teksten listen, ville
  køkkenet lave det halve af det, gæsten havde valgt

**⚠️ Tillægget slår id'et op DIREKTE.** `værdi()` slår op i
`side.felter` og `side.ekstra` på NAVN — et id, der ikke står i
nogen af dem, giver null, og tillægget ville tavst være tomt hver
gang.

**Datonettet er datovælger nu, ikke kun ledighed.** Kundens ord:
*"valg af datoen er forældet udseende og navigations ting."*
Tilbage stod browserens egen `<input type=date>` — på en telefon
et hjul, hvor man hverken kan se ugedagene eller hvilke dage der
er for tidlige. Nettet står på alle fire sider nu. **Det, der
stadig følger `optagerDagen`, er markeringen af optagne dage,
forklaringen "Ledig / Optaget" og stedvalget** — en side, hvor
ingen dag kan være optaget, må ikke strege noget eller love en
oplysning, den ikke giver.

**⚠️ VARSLET SKRIVES AF REGLEN.** Cateringens faktakort sagde
*"mindst en uge før ved mere end 30 kuverter"*, mens formularen
holdt to dage — to udgaver af den samme regel, og gæsten møder
ugen først. `[data-varsel]` fyldes nu af `varselDage()`, og
designets tekst er reserven. **Catering: 2 dage. Frokost: 3.**

**⚠️ "HVOR TIT" ER ET FELT, IKKE EN MOTOR.** Kundens ord: *"måske
en lille ting med skal det være en ugentlig, månedlig ting."*
Frokostsiden spørger nu hver uge / hver 14. dag / hver måned / én
gang / ved I ikke endnu — og det lander i `detaljer.hvor_ofte`.
**Der bygges stadig ingen abonnementsmotor:** ingen tabel til
gentagne leveringer, ingen pauser, ingen automatiske ordrer. Det
blev afvist 20/8. Det, der manglede, var, at personalet kunne SE,
om firmaet spørger om én levering eller om hver uge — det er to
vidt forskellige priser. En prøve holder fast i, at én
forespørgsel giver ÉN række og NUL bestillinger.

**⚠️ Chipgrupperne læses efter RÆKKEFØLGE i opmærkningen.** "Hvor
tit" kom ind som den FØRSTE gruppe på frokostsiden; bytter nogen
om på to grupper i HTML'en uden at rette `SIDER`, lander
ugedagene under "hvor ofte" — tavst, og admin viser det pænt
formateret.

**Ring og mail er second options.** Kundens ord: *"fjern ring og
email fra toppen det skal være second options."* Øverst
konkurrerede de to knapper med formularen: den, der lige er
landet, blev bedt om at vælge mellem tre veje, før hun vidste,
hvad hun ville spørge om. De står under send-knappen nu
(`.anden-vej`), som de hvide og ikke den røde.

**⚠️ FROKOSTSIDENS "59 KR. PR. MEDARBEJDER" ER STADIG DESIGNETS
PLADSHOLDER.** Den står live på Mikkels beslutning fra 23/8, og
den er den farligste af dem: beder et firma om et tilbud og får
75 kr., har siden lovet noget andet. Prisen skal komme fra
ejeren — vi finder ikke på et tal, og der er derfor heller ingen
prisberegner på siden.

**Baglokalet er blevet baglokalets** (29/8). Kundens ord: siden
skal sige, *"hvad der sker når de booker"*, lade *"email eller
nummer være som en option"*, lade dem *"fortælle hvad de skal med
baglokalet"*, og aftalen skal være afstemt *"inden for et døgn"*.

`h-baglokale.html` bruger samme motor som selskaber, catering og
frokost (`js/skal/forespoergsel.js`) — forskellene står som
opsætning i `SIDER`:

- **Anledning og mad er FRITEKST.** Chips kunne ikke rumme
  "generalforsamling med kaffe bagefter", og maden aftales
  alligevel i samtalen. Kun tidsrummet er chips: det ER fire
  kasser, og lokalet lejes ud i dem
- **Fire dages varsel**, som selskaber. Et lokale skal gøres klar,
  og køkkenet skal nå maden
- **Kortet "Sådan går det videre"** står under formularen: vi
  kigger i kalenderen → inden for et døgn ringer eller skriver vi
  → er I enige, låser vi dagen. Uden det tror gæsten, lokalet er
  hendes, i det sekund hun trykker send
- **Ledighedskalenderen** viser `optagne_dage` — kun datoer

**⚠️ MAIL ELLER NUMMER — IKKE BEGGE.** Kør
**`supabase/foresp-kontakt.sql` + `proev-foresp-kontakt.sql`**
(5 × BESTOD på en lokal Postgres 16). Kolonnen `telefon` var
`not null` MED et krav om 8-15 cifre, så en gæst, der kun ville
skrive sin mail, blev afvist af databasen med en fejl, hun ikke
kunne gøre noget ved. Kravet **forsvinder ikke, det flytter**:
`forespoergsel_kontakt_ok` siger "et gyldigt nummer ELLER en
gyldig mail", og `forespoergsel_telefon_form_ok` holder fast i, at
et nummer, der ER skrevet, stadig skal være et nummer — ellers
kunne "12" slippe igennem i ly af mailen, og personalet ville
ringe forgæves. Selskabssiden kræver stadig BEGGE: et tilbud dér
er tal og forbehold, der skal skrives ned.
**⚠️ Køres `forespoergsler.sql` igen bagefter, skrives det gamle
krav tilbage.**

**⚠️ DEN AUTOMATISKE KALENDERRÆKKE BLEV BYGGET OG RULLET
TILBAGE** — og grunden er værd at kende, før nogen bygger den
igen. Ønsket var, at et ja på baglokalet "automatisk ryger ind i
kalenderen". Den blev skrevet (intern arrangement-række, aldrig
offentlig, kendt på referencen i beskrivelsen) og virkede — og så
viste **et skud af dagens panel den samme booking TO gange**:
"📅 Baglokalet: Anna Vind" fra rækken og "🔑 Baglokalet: Anna
Vind · 30 pers." fra udlejningen selv. **Udlejningen ER allerede i
kalenderen**: månedsnettet tegner 🔑 på dagen, og dagens panel
lister den med en pil hen til fanen. En kalenderrække oveni er
ikke "at hænge sammen" — det er to rækker for én begivenhed,
præcis dét, resten af filen advarer imod. Fundet med øjnene, ikke
ved at læse.

**⚠️ MEN KØREPLANEN HAVDE ET RIGTIGT HUL, OG DET VAR HELT TAVST.**
Linjen "🔑 Baglokalet er lejet ud i dag" i `tegnKoereplan`
(`js/admin/overblik.js`) spurgte efter status **`aftalt`**. Det er
FORESPØRGSLERNES ord — en udlejning hedder `ny` / `bekraeftet` /
`afvist`, og de to tabeller har med vilje hvert sit sæt (de
oversættes ét sted, i `alleSager()`). Betingelsen kunne aldrig gå
i opfyldelse. **Målt:** baglokalet var lejet ud til 30 personer i
dag, og køreplanen sagde *"Ingen bestillinger eller aftaler endnu
i dag"*.

**Og prøven bestod imens** — den skrev selv `status: 'aftalt'` på
en udlejning, altså en række, databasen aldrig kan indeholde.
Prøve og kode delte den samme forkerte antagelse; det er
CLAUDE.md's egen regel om, at **ét af tallene skal komme udefra**.
Køreplanen viser nu begge slags: en **bekræftet udlejning**
("lejet ud") og en **aftalt forespørgsel** ("aftalt i dag") — en
dag, personalet har lovet væk, er en dag, køkkenet møder ind til,
uanset hvilken formular gæsten brugte.

**⚠️ SUITEN HAVDE VÆRET RØD I EN UGE, OG PAPIRERNE SAGDE GRØN**
(30/8). Den fulde runde efter baglokale-arbejdet skrev **20
fejlede**. Ingen af dem kom fra runden — det blev **målt** ved at
køre de samme filer i en worktree på den UDGIVNE commit: fem af
dem fejlede allerede dér, og de sidste fem kom med de to runder
imellem. Alle ti var forældede prøver mod ændringer, vi selv havde
truffet med vilje:

- **Paletten** (29/8): to prøver krævede stadig marineblå
  `#0f2c44`. Farven kan ikke længere måle, om admin er sluppet ud
  af sit scope — hele huset er varmt nu. Prøverne læser i stedet
  det, der ER forskelligt med vilje: `--r-lille` 12 px mod 14, og
  admins solide sandflade mod gæstens gennemsigtige fyld
- **Forespørgselskortet** (29/8): "30 personer" hedder "30 pers.",
  den tomme dato hedder "Dato ikke fastlagt endnu", og
  telefonlinket hedder `.foresp-link` og ikke `.bestil-tlf`
- **Mailen på selskabssiden** (29/8): to prøver udfyldte navn og
  nummer, men ikke mail — og siden kræver den nu, fordi kunden
  bad om det. Formularen sendte altså ikke, og prøven målte en
  kvittering, der aldrig kom
- **Fotopladserne** (29/8): 5 blev til 11 med stemningsgalleriet.
  Prøven tæller ikke rækker længere; den kræver, at hver NØGLE,
  siden slår op, HAR en række — en plads, der falder ud af admin,
  mens gæstesiden stadig leder efter nøglen, giver en grå flade,
  ingen kan fylde ud

**Og den dyreste var fartprøven, fordi papirerne løj om den.**
Der stod her i filen, at den var *"skrevet om MED reglen i
behold ... set fejle med `eager`"*. Det passede for
par-udgaven — og samme aften blev galleriet lavet om til ÉN
pulje, hvor hver flise viser ét foto ad gangen. Prøven krævede
stadig præcis seks og fik tre. **Et fast tal på noget, der
skifter hvert 4,6 sekund, er en prøve på et stopur.** Den kræver
nu mindst de tre, der er på skærmen, højst puljens syv, og
ingenting andet.

**Læren er ikke "ret prøverne".** Det er, at en runde ikke er
færdig, før HELE suiten er kørt — ikke kun de filer, man selv
rørte. Fire runder blev udgivet oven i hinanden, hver med sine
egne filer grønne, og ingen så, at de tilsammen havde efterladt
ti prøver, der målte en side, der ikke fandtes mere.

> **⚠️ AFSNITTET HER ER OVERHALET (31/8).** Kunden lukkede
> modellen: *"alle smørbrødene sælges som de er, ikke noget med
> valg af brød og derefter pålæg — nej, 1 mad er som 1 mad."*
> Størrelsesvælgeren og ønskefyldet er væk af `Butik.udvalg`, og
> `h-smorrebrod.html` er en forespørgsel. **Læren består** —
> prisen sad på størrelsen, og to sider måtte gerne køre hver sin
> model — men modellen gør ikke. Se "1 mad er 1 mad" under status.

**Smørrebrødet: først brødet, så fyldet** (30/8). Kundens
spørgsmål, da hans fem trykte kort kom: *"forstår ik smørbrød
bestillingen — skal de først vælge basen altså brødet og derefter
fyld eller hvordan?"* Ja. **Ingen SQL.**

Ejerens kort har ét, der hedder **SMØRREBRØD**, og ét, der hedder
**HÅNDMADDER**, og de lister det **samme fyld**. Prisen sidder
altså på STØRRELSEN — 55 for en hel skive rugbrød, 27 for en
håndmad — ikke på fyldet. Det er en anden model end `bestil/`s
model A, hvor hvert fyld er sin egen vare med sin egen pris, og
**de to sider kører hver sin med vilje**: to sider må gerne have
hver sin model; det, der ville skride, er to kopier af den samme.

- **`h-smorrebrod.html` kører udvalget `skiver`.** Størrelserne
  står som en `.chipset` (designets egen enkeltvælger) ØVERST,
  fyldet kommer først frem bagefter. **Intet er valgt fra start:**
  vælger siden den ene, bestiller den, der ikke læser etiketten,
  en hel skive til 55, når hun troede, hun bad om en håndmad til
  27 — og det opdages ved lugen
- **⚠️ STØRRELSEN MÅ ALDRIG OGSÅ LIGGE I VARELISTEN.** Gjorde den
  det, kunne gæsten lægge både "Smørrebrød 55" og varianten
  "Leverpostej 55" i kurven og betale **110 for ét stykke mad**.
  De færdige retter — rejemad 85, tartar 95, æbleflæsk 75 — har
  deres eget fyld og bliver stående som varer
- **⚠️ LINJENS NAVN ER STØRRELSEN, FYLDET ER EN `variant`.**
  Databasens pris-værn og udsolgt-værn slår begge op på NAVNET i
  menukortet; "Leverpostej med baconsvøb" står der uden pris, så
  et sammensat navn ville få pris-værnet til at afvise hele
  bestillingen — eller tie på den. Køkkenet får varianten at se
  (bestillingskort, køkken-kø, forløb **og produktionen**, hvor
  to fyld tæller hver for sig — "3 × Smørrebrød" lader køkkenet
  gætte, hvad de tre skal have på). `linjer` er jsonb, så det
  koster ingen SQL
- **⚠️ ET OPTALT STYKKE MÅ IKKE FORSVINDE VED SKIFT.** Første
  udgave viste kun den valgte størrelses fyld: to smørrebrød med
  leverpostej blev stående i kurven og i summen, mens rækken var
  væk — gæsten ville betale for mad, hun ikke kunne finde på sin
  egen skærm. Listen er nu den valgte størrelse PLUS enhver, der
  allerede er talt op i
- **⚠️ 32 FYLD ER 1900 PX.** Varianterne står i designets egen
  fold ("+ tilføj"), og valget af størrelse åbner den — ellers
  ville "så kommer fyldet frem" kræve to tryk
- **⚠️ SKELLET ER EJERENS, IKKE KODENS.** `indstillinger` er
  nøgle/værdi, så `smoer_stoerrelser` koster ingenting. Reserven
  er ejerens egne data: varen, der hedder det samme som
  kategorien, plus den, der hedder håndmad. **Findes ingen af
  dem, falder siden HELT tilbage** til den gamle model — ejeren
  skal ikke kunne lukke sin egen bestillingsside ved at omdøbe en
  vare i admin. Alle de gamle prøver består uændret på den vej

**⚠️ OG SIDEN LOVEDE ET VARSEL, DEN IKKE HOLDT.** **Målt på den
udgivne side:** heroens manchet og faktakortet sagde begge
*"Bestil senest 2 dage før"*, mens formularen holdt ejerens eget
tal fra admin (24 timer som standard) — gæsten læste to dage,
valgte i morgen, og fik lov. Nøjagtig samme fejl som cateringens
faktakort 30/8, og rettelsen er den samme: `[data-varsel]` fyldes
af reglen, designets tekst er reserven. Skuffemenuens
"2 dage før" på syv sider er blevet til "bestil hjem" — en
etiket i en menu er også et løfte, og ingen holder styr på den.

**⚠️ EN KENDT FLAKE — OG ÉN AF DEM ER FORKLARET NU (31/8).**
Fire prøver på tværs af `skal-bestil`, `skal-smoerrebroed` og
`arrangementer` fejler sjældent under en FULD runde med fire
arbejdere (`locator.click` løber tør for tid) og består hver gang
alene. Årsagen er ikke fundet for dem alle, og der er ikke lavet
en rettelse, der lader som om den er. Fejler en af dem, så kør
filen alene, før du leder i koden.

**⚠️ OG ÉN MERE AF SAMME SLAGS ER FORKLARET (1/9).**
*"en tidlig lukning skærer aftenens tider af"* i `bord.spec.js`
faldt i en fuld runde med **"kl. 20.30" mod "kl. 14.30"** — og
bestod hver gang alene, 46 af 46 i filen. Fejlen lignede en
tidlig lukning, der ikke virkede; den var, at prøven læste
tiderne i det sekund, klikket på dagen var sendt, og dagstriben
ikke altid nåede at tegne sig om først. Altså målte den I DAG og
ikke den 8. Den venter nu på, at dagen HAR klassen `valgt` — den
tilstand, reglen hviler på. **Set fejle med `tidligLukning`
slået fra bagefter**, så ventetiden ikke har svækket den.

**Men segment-prøverne var ikke en flake — de ventede det
forkerte sted.** *"leveringsadressen ryger, når firmaet henter
selv"* faldt i en fuld runde med `levering` i stedet for
`afhentning`. Grunden er, hvad koden LÆSER: `segSvar()` aflæser
adressefeltets **synlighed**, ikke `.on`. Går klikket igennem,
før designets `[data-toggles]`-lytter har foldet feltet væk, ser
afsendelsen et synligt felt og sender "levering". Prøven venter
nu på, at feltet ER væk — den tilstand, reglen hviler på, og den
et menneske ville se, før hun trykkede send. **Det svækker ikke
prøven:** folder toggle'en aldrig feltet væk, fejler ventetiden.

**Overblik fik forlæggets runde** (30/8). Kundens ord: *"fixer
hele overbliks siden til at se sådan her ud men med alle
havncafeens principper og ting og sager ... den er mere
overskuelig, knapperne er gode, det pænt og nemt."*
**Ingen SQL.**

- **Handlingerne står til HØJRE fra 900 px** (`.vagt-handling`).
  **Målt på 1280 px:** hver række i forløbet var **166 px høj**,
  fordi begge knapper faldt under teksten, hver på sin linje —
  mens højre halvdel af kortet stod tom. Tre bestillinger fyldte
  en halv skærm. Samme rettelse som forespørgselskortet fik 29/8;
  under 900 px falder de under igen. Prøven sammenligner **to
  uafhængige elementer** (knappens venstre kant mod tekstens
  højre) — et spørgsmål til knappen om dens egen `grid-column`
  ville bestå, også hvis reglen ikke slog igennem
- **En alarmstribe øverst på køreplanen** (`#plan-alarm`).
  **Målt:** dagens forløb begynder 750 px nede, og "Fra bordene"
  stod 1500 px nede — under HELE køreplanen. Et bord, der havde
  ventet to timer, lå altså under folden på den skærm, personalet
  har åben hele dagen. Striben følger Køkken-køens to regler: den
  **findes kun, når der er noget**, og den **siger det én gang**
  (den ældste med sit tal, resten som et antal)
- **⚠️ GRÆNSEN FOR "FOR LÆNGE" ER KØKKENETS EGEN.** `maalTid()` i
  `js/admin/koekken.js` hedder `Admin.bordForLaenge` nu, og
  Overblik spørger den. Skrev striben sit eget kvarter af, ville
  de to skærme sige hver sit den dag, ejeren satte ventetiden ned
  — og begge ville se rigtige ud hver for sig. Prøven læser
  TALLET i sætningen og er set fejle med et hårdkodet 15
- **⚠️ ALLERGIEN STÅR IKKE I STRIBEN.** Den har sit mærke på
  rækken og sit kort på Køkken-kø; en tredje udgave ville være
  præcis den "tre gange den samme oplysning", trin-striben på
  forespørgselskortet blev fjernet for
- **Notefeltet har tre rækker.** **Målt på en iPhone 13:**
  pladsholderen brækkede til tre linjer, og den tredje blev
  klippet midt over af feltets kant. Fundet med øjnene på et skud

**⚠️ OG PRØVEN OM GÆSTENS MANIFEST ER VENDT.** Den krævede, at
KUN admin måtte linke et manifest — og så bad Mikkel om det
modsatte (forretningen skal kunne lægges på hjemmeskærmen). Det
er en aftale med kunden, ikke en forældet prøve, og så er det
reglen, der flytter. **Den halvdel, der bar værdien, blev
skarpere:** gæsten må aldrig få ADMINS manifest (ét forkert
`href`, og en gæst, der trykker "Føj til hjemmeskærm", får en
app, der åbner personalets login), vejviserne må slet ikke have
et (en genvej til en omdirigering er en blindgyde), og ingen
gæsteside må registrere en service worker. Set fejle med
`h-selskaber.html` pegende på `manifest.webmanifest`.

**Overblikket er en vagtskærm nu** (23/8). Kundens ord:
"overblikket er heller ikke så godt — det er dér, de bør stå, når
de er på arbejde og modtager bestillinger."

Fanen var sorteret efter hvornår bestillingen **kom ind**. Det var
rigtigt, dengang hver bestilling ventede på et opkald — men
`auto_bekraeft` blev slået til samme dag, og så stod rækkefølgen
tilbage uden en grund. **Målt på en travl dag:** klokken 13.00
stod Sara, der henter kl. 18.00, som nummer to, fordi hun havde
bestilt ni minutter før.

Nu står dagen i **tidsrækkefølge**: "Nu og de næste timer" (to
timer frem), "Senere i dag", og "Nyt til andre dage" for det, der
lige er tikket ind til en anden dato. Det færdige (afhentet,
afvist, udeblevet) er ikke arbejde længere og står der ikke.
**Overskredne bliver stående øverst** og bliver markeret — en
gæst, der skulle have hentet kl. 13.15 og ikke har, er ikke mindre
vigtig kl. 13.20.

**⚠️ Bordene bruger `antal_personer`, ikke `antal`.** Det kostede
en runde.

**Lugen og bordene er to strømme** (26/8). Kundens ord: *"det er
rodet at både qr bestillinger er der og online bestillinger — du
skal huske online bestillinger er bare bestillinger til lugen
dernede, hvor at selve qr bestillinger skal i en separat ting."*

Det er ikke smag. De to har forskelligt **arbejde** bag sig: en
bestilling fra hjemmesiden har en **hentetid** og skal ramme et
klokkeslæt; en fra en QR-kode har ingen og skal laves **nu** og
bæres ud. Blandet i én tidssorteret liste ligger bordet —
hentetid = nu — altid øverst og skubber den frokost, der skal
være klar kl. 12.30, ned.

Bordene har deres egen skærm (Køkken-kø). **Overblik lister dem
ikke**; der står, at de findes, hvor mange, og hvor længe den
ældste har ventet — og en knap derhen. Kendingen er `erBord()`,
ét sted: skrives `b.bord_nummer` ud ti steder, er der ti steder
at glemme den.

- **Produktion i alt** lægger samme ret sammen på tværs af
  bestillingerne, delt `🥡 ud af huset · 🍽️ spist her`. **Her er
  bordene MED**, og det modsiger ikke adskillelsen: forløbet
  handler om *hvornår*, produktionen om *hvor meget* — og der
  skal alt tælle med, ellers laver køkkenet for lidt. Det
  **afviste** tæller ikke (det bliver aldrig lavet); det
  afhentede gør (det ER lavet)
- **Færdige (N)** står foldet sammen med **Gendan**. De faldt
  helt ud af skærmen før: trykker nogen forkert i en frokost, var
  bestillingen væk, og gæsten stod ved lugen uden noget at hente.
  **Gendan fører til `bekraeftet`, ikke `ny`** — rækken HAR været
  set, det var derfor, nogen trykkede
- **Dagens tal** har et felt til lugen og et til bordene. Ét
  samlet tal ville skjule netop den forskel
- **Noten skrives på køreplanen** og gemmer sig selv.
  `Admin.skrivNote` er den ENE vej ind; kalenderen bruger den
  samme

**⚠️ To fejl, prøverne fangede, og begge var tavse:**

**Gendan-knappen gjorde ingenting.** Første udgave brugte
`Admin.gem`, som henter indstillinger og menukort — **ikke**
bestillingerne. Kortet blev stående på "Afhentet", og personalet
ville trykke igen på en knap, der allerede havde virket. Præcis
den fejl faldt køkken-køen i 25/8; svaret er `Admin.friskOp()`.

**Noten oprettede en ny række pr. gem.** Rækken kendes kun på sin
**titel**, og uden en id opretter skrivningen. Autogem skriver
1,2 sekund efter sidste tastetryk, og første udgave hentede med
`Admin.friskOp` — som henter *fanernes lister*, ikke kalenderen.
**Målt: to gem gav TO noter på dagen**, uden en eneste fejl; fem
pauser i tastningen ville være blevet til fem "arrangementer".
**`Admin.genindlæs` henter kalenderen** — det er den, der skal
bruges efter en oprettelse.

**⚠️ Køreplanens opmærkning står FAST i `admin.html`** og fyldes
ud af JavaScript. Blev notefeltet bygget af optegningen, ville en
medarbejder, der skriver, miste markøren midt i en sætning — og
takten tegner om hvert minut. Optegningen rører heller ikke
feltet, mens det har fokus.

**Fanerne ligger i bunden på en telefon** (23/8). De stod som en
ombrudt række piller øverst: **målt på en iPhone 13 fyldte de
344 px og sluttede 599 px nede på en 844 px skærm** — 71 % af
skærmen var navigation, før personalet så en eneste bestilling.
Nu er det en fast stribe i bunden, som i en app, og den ruller
sidelæns. Den valgte fane ruller sig selv frem (`Admin.visFane`),
ellers kan man skifte til en fane, man ikke kan se. **Fra 900 px
og op er det stadig sidemenuen** — personalesiden er computer- og
iPad-først.

**Smørrebrødssiden er blevet smørrebrødets** (23/8). `bestil/`
stillede lugens spørgsmål — "To-go eller spis her?" — på mad, der
pr. definition er ud af huset. Kundens ord: siden skal være egnet
til smørrebrød ud af huset, "om det afhentes eller skal leveres —
det skal ik bare være det samme".

Spørgsmålet følger nu `data-udvalg` på formularen: `kun-smoer`
spørger **Hentes eller leveres?**, alle andre spørger som før. Ét
modul, to spørgsmål — ikke to moduler.

**⚠️ Levering er slået FRA som standard, og det er med vilje
modsat `spis_her`.** Vi ved ikke, om forretningen leverer, hvor
langt de kører, eller hvad det koster. En side, der tilbyder
levering, fordi ingen har sagt nej, lover noget på deres vegne.
Ejeren slår fluebenet til i admin, når han ved svaret.

**Og en levering bekræftes ALDRIG automatisk** — heller ikke når
`auto_bekraeft` står til. Vi kan love, at maden bliver lavet; vi
kan ikke love, at den kan køres til en adresse, vi ikke kender.
Reglen bor i `visTak()` i `js/bestilling.js` og har sin egen prøve.

**Kør `supabase/levering.sql` + `proev-levering.sql`** (8 × BESTOD
lokalt) — efter `spis-her.sql`, hvis regel den udvider. Databasen
håndhæver sammenhængen **begge veje**: adressen skal være der ved
levering, og den skal være **tom** ellers. Den anden halvdel er
den vigtige — uden den kunne en adresse blive hængende, efter
gæsten skiftede til afhentning, og køkkenet ville køre ud med mad,
nogen stod og ventede på ved lugen.

**Hele ejerens menukort er inde** (23/8). `menukort.sql` var
skrevet af efter det TRYKTE kort; ejerens fulde liste kom 23/8 og
havde fem kategorier mere. **Kør `supabase/menukort-ud-af-huset.sql`
(44 varer: tapasfad, platter, sliders, pindemad, tilkøb) og
`supabase/menukort-resten.sql`** (35 varer: seks burgere, syv
pølser, brunchtallerken, morgenmads-tilkøb, thermobox, 4 kugler,
lumumba, bitter, æblekage, hakkebøf, avokadomad). I alt **230
varer i 20 kategorier**.

**En dublet er værre end en manglende vare.** Det er reglen, de to
filer er skrevet efter, og den fandt en fejl under skrivningen:
"Kage" var på vej ind under morgenmads-tilkøb, mens den allerede
stod under kaffen. To rækker med samme navn får hver sin pris.
Dubletvagten er nu en linje i optællingen. Fire linjer fra ejerens
liste er IKKE lagt ind, fordi de ligner noget, vi har, men ikke
nok til at være sikker — de står som spørgsmål i optællingen.

**Ingen priser er gættet:** ejerens liste har ikke ét tal i sig, så
alle 79 nye varer står som `??`. De 25 priser på tapas, platter,
sliders og pindemad er det eneste, der står mellem os og en rigtig
tapasbestilling.

**Den gule kant på telefonen er væk** (23/8). Kunden så et fremmed
farvet felt lægge sig over feltet, i det sekund han rørte det.
Farven er **browserens**, ikke vores: målt i Chromium er den
lyseblå, og andre telefoner tegner den gul. Derfor kunne fejlen
ikke findes ved at lede efter "gul" i stilarket — den står ingen
steder i det. `-webkit-tap-highlight-color: transparent` stod på
`a, button, .fyld-valg` og havde glemt `select`, `input` og
`textarea` — og `<select>` er præcis dét, gæsten vælger i.
Prøven i `tests/telefon.spec.js` læser den BEREGNEDE værdi og
fandt syv felter.

**Model A er bygget** (20/8): hvert fyld er en vare med sin egen pris,
og gæsten tæller op i foldede grupper. Skellet mellem stykker og fyld
gik før på PRISEN — det er flyttet til KATEGORIEN, ellers ville de 29
fyld blive til stykker den dag, de fik priser. Siden virker både før og
efter: fyld uden pris kan ønskes, ikke købes. **Ejerens priser skrives
i admin → Menukort → "Sæt samme pris på alle"** (ét felt, 29 priser);
der står med vilje ingen foreslået pris. Se README-afsnittet "Model A:
fyldet er varen".

**Døren hedder Bestil mad nu** (20/8). Formularen er flyttet fra
`smoerrebroed-ud-af-huset/` til **`bestil/`** — den kunne allerede tage
imod grill og café og både spis her og tag med, så adressen passede
ikke til skærmen længere. Smørrebrødssiden er blevet salgs- og
søgeside og fører derind. Forsiden har én stor knap i stedet for tre
ens, og topmenuen er ens på alle sider.

**Er der mere end én slags at bestille, står der chips over listen**
med ejerens egne kategorinavne. Er der kun smørrebrødet, som i dag,
vises rækken slet ikke — se README-afsnittet "Døren hedder Bestil mad".

**Spiis-opskriften følges nu** (20/8). To huller er lukket:

- **`supabase/er-vi-klar.sql`** — ét kald, der spørger databasen om det
  hele og svarer med 67 linjer ✅/❌ plus `ALT ER KLAR`. Den **skriver
  ingenting**, så den kan køres når som helst. Kør den, hvis noget
  virker sært: den fanger det, der fejler stille — en tabel uden RLS,
  en bremse uden `security definer`, en læseregel på gæstetabellerne
  uden `is_admin`
- **`supabase/skraldespand.sql` + `proev-skraldespand.sql`** — "Slet" i
  admin er blevet til en dato i kolonnen `slettet`, og rækken kan
  hentes tilbage i 30 dage. **Kør begge filer i Mosede-projektet**
  (19 × BESTOD lokalt). Den skal køres **efter** bremse-, borde-,
  udlejnings- og forespørgselsfilerne — den retter deres nøgler og
  bremser, så en spand-række holder op med at spærre. Køres en af dem
  igen bagefter, skal `skraldespand.sql` køres igen; `er-vi-klar.sql`
  har en linje, der fanger det

- **`supabase/logbog.sql` + `proev-logbog.sql`** — hvem ændrede hvad
  hvornår. Ligger nederst på den nye fane **Historik** sammen med
  skraldespanden. **Kør begge filer** (19 × BESTOD lokalt).
  Oprettelser logges IKKE: rækken er sit eget bevis, og en linje
  oveni ville være gæstens telefonnummer gemt ét sted mere

**⚠️ DOMÆNET ER SAT OP, OG HTTPS ER SLÅET TIL** (målt 31/8).
`gersel1233.github.io/mosedehavnegrill/` svarer **301 til
`https://mosedehavnecafe.dk/`** — også fra `http://`, og også på
`/ved-bordet/`. Tidligere samme dag pegede det samme svar på
**http://**; fluebenet "Enforce HTTPS" er altså sat i mellemtiden.
Det var forudsætningen for at printe de 55 bordskilte om:
`print/bordkort.html` tager adressen fra `location.origin`, og et
skilt, der sender gæsten til en http-adresse, kan ikke laves om,
når det først sidder på bordet.

**⚠️ OG DERFOR KAN VERSIONSSTEMPLET IKKE LÆSES HERFRA MERE.**
`mosedehavnecafe.dk` afvises af udgangsproxyen
(`connect_rejected`, 403 på CONNECT — samme spærring som
spiis.dk), så `curl … | grep -oE 'v=[0-9a-f]{7}'` svarer **tomt**.
Og tomt ligner "deployet kom aldrig". Tjek **Actions-kørslen** i
stedet (`mcp__github__actions_list`, gren
`claude/lesreg-customer-setup-5atpuu`) og find din egen commit-sha
med `completed / success`. `/test`-færdighedens tjekliste er
rettet.

**HTTPS-punktet fra opskriften er ikke et punkt på den her adresse**
(målt 27/8: `http://gersel1233.github.io/mosedehavnegrill/` svarer
301 til `https://`). Hele `*.github.io` ligger på browsernes
HSTS-preload-liste, og GitHub tvinger selv HTTPS på sit eget domæne
— fluebenet "Enforce HTTPS" er låst til. **Det bliver først en
opgave den dag, forretningen får sit eget domæne**; dér er
fluebenet et rigtigt valg, og det kan først sættes, når certifikatet
er udstedt. Sæt det, samme dag domænet peger rigtigt.

Dermed er hele opskriften kørt igennem.

**Fase 1 er færdig i koden** på branchen
`claude/lesreg-fase-1-admin-refactor-p7xqn9`: admin.html's 804 linjer
inline-JavaScript ligger nu i `js/admin/` med én fane pr. fil. Se
README-afsnittet "Personalesiden er delt op i js/admin/". En ny fane i
fase 2 er én ny fil plus ét script-tag **før** `login.js` — ikke mere
kode i admin.html.

**⚠️ Bundtet er en FACITLISTE, ikke inspiration.** Første udgave lavede
sin egen struktur oven på bundtets idéer — et kort, der linkede videre
til bestil/, hvor bundtet har hele formularen på forsiden. Kunden så
det og sagde: *"det er overhovedet ikke sådan siden skal se ud, den
skal se præcis ud som jeg viste dig med filerne."* Byg formen som den
står i filerne; det eneste, der må afvige, er tal og påstande, vi ikke
har belæg for — og hvert af dem skal have en note om hvorfor.

**Designbundtet er bygget ind (21/8).** Kunden sendte otte HTML-sider
med CSS, JS og et handoff — *Mosede Mobil v3*. Farverne og skrifterne
var allerede vores, så det var ikke et nyt tema; det var de dele,
bundtet havde, som vi ikke havde. Forsiden har nu bannere,
genvejsstribe, nyhedsafsnit, rækkekort og afdelingskort i bundtets
rækkefølge, heroen har parallakse, alle undersider har tilbage-pil, og
`nyheder/` er en ny side. Se README-afsnittet "Forsidens rækkefølge".

**⚠️ Bundtet var fuldt af tal, der ikke er sande**, og flere modsagde
det, vi HAR fået: "4,8 · 312 anmeldelser på Google", "Bedste fiskefilet
på hele Sydkysten", baglokalet til 40 personer med projektor og egen
indgang, leje 1.200,-, adressen *Mosede Havnevej 15*, telefon
*43 90 15 00*, e-mailen *hej@mosedehavnegrill.dk*. Ingen af dem er på
siden. `tests/designbundt.spec.js` holder vagt på alle ni gæstesider —
også med et mønster, der fælder ethvert "plads til N personer", ikke
kun de 40. **Kommer der mere materiale, så byg formerne og lad tallene
ligge.**

**Runden 22/8 — kundens egen liste.** Alle otte punkter er bygget, og
hvert af dem har en prøve, der er set fejle:

- **Alle seks "Hent på ny" i admin er væk.** Listerne hentede allerede
  sig selv; skraldespand, logbog og salg hentes nu, når fanen åbnes
  (`Admin.hentVedFane`). Der står et live-mærke i stedet
- **To go/Spis her er væk fra forsiden.** Valget hører hjemme i
  formularen, efter maden
- **Heroen har ingen knapper.** Den flydende pille er forsidens ene
  handling. `.glass.stor` er slettet
- **Sektionerne står på skiftende grunde** (sand / sand2 / marineblå).
  Luft alene læses ikke som "nyt afsnit" — den læses som "her mangler
  der noget"
- **Nyhederne er en tidslinje** med en prik pr. kort; den nyeste er rød
  og ånder
- **Menukortets kategorier er folder**, som på bestillingssiden
- **Knapperne har fået vægt 600 og linsekant hele vejen rundt**, og
  `.knap` og `.glass` ser ens ud nu
- **Hero-filmen hentes med `rel=prefetch` under introen**, så kun
  afkodningen venter

To fejl faldt ud undervejs, begge fundet af prøverne: `js/dagens.js`
kastede `d is not defined` ved hver afsendelse med automatisk
bekræftelse, og et klokkeslæt kunne ikke stå i sit felt i Åbningstider
på en engelsk browser. **`--muted` og `--red-tekst` er mørkere nu** —
de faldt under 4,5:1 på den nye, dybere sandgrund.

**GÆSTESIDEN ER SKIFTET UD (23/8) — designet fra Claude Design er
facitlisten nu.** Mikkel designede hele mobilsitet selv i Claude
Design og afleverede det som et 1:1-handoff (`havnegrillen-handoff.md`
+ 17 filer). Ordren var udtrykkelig: pixel for pixel, tekst for tekst,
ingen forbedringer, ingen ekstra sektioner, ingen fjernede —
systemerne kobles på BAGEFTER. Det er gjort:

- **Ni nye sider på roden:** `index.html` (ny), `m-menukort.html`,
  `m-tapas.html` og seks `h-*.html` (smørrebrød, selskaber,
  baglokale, catering, frokost, kalender). Designsystemet er
  `havnegrillen.css` + `havnegrillen.js` — rød/hvid-ternet tema,
  Instrument Serif til overskrifter, liquid glass-knapper (`.g`).
  Menukortsiden kører med vilje sit eget v3-tema
  (`mosede-m.css` + `menu.*`) — det er sådan, den blev leveret
- **Klassenavne og data-attributter er urørte** (`.g`, `.panel`,
  `.seg2`, `.chipset`, `.evcard`, `.bestil`, `.rev`, `data-seg`,
  `data-step`, `data-chips`, `data-toggles`, `data-pick`) —
  logikken hænger på dem, og admin-koblingen kommer til at gøre
  det samme
- **KUN tre slags afvigelser fra handoffet**, hver med sin grund:
  (1) telefon-attrappens krom er taget ud af siderne — statuslinjen
  med det falske 9:41, den dynamiske ø, hjemmestregen og
  side-etiketten er artboardets ramme, ikke sidens; `.device` og
  `.screen` STÅR, for al rullelogik hænger på `#sc` som rullerod.
  (2) `?v=__V__` er sat på alle lokale css/js-adresser —
  versionsstemplet er repoets egen lærepenge og usynligt for
  designet. (3) menukortsidens lånte v3-links (`m-dagens-ret.html`,
  `Mosede Mobil v3.html`, ...) er lagt om til de sider, der
  faktisk findes — bl.a. pegede "Book spisning" på `bord/`, den
  eneste side, der kan booke et bord. **⚠️ DEN KNAP FORSVANDT,
  da menukortsiden blev skrevet om 24/8, og linjen her stod og
  lovede den i fem dage.** Se "Bordbooking kunne ikke findes"
  nedenfor
- **`<image-slot>` står som leveret** — pladsholdere til fotos.
  Når de rigtige billeder kommer, skiftes de til `<img>` i samme
  mål (id'erne siger hvad: `tapas-fad`, `tapas-forside`,
  `nyhed-1/2`, `selskab-1/2/3`, `baglokale-foto`)

**⚠️ FORMULARERNE ER ATTRAPPER ENDNU.** De ser rigtige ud og
opfører sig rigtigt (segmenter, steppere, chips, betingede felter,
tapas-prisberegning, kalenderfilter), men de sender INGENTING.
Systemfasen kobler dem på motoren og forespørgselstabellerne.

**⚠️ TALLENE PÅ SIDERNE ER PLADSHOLDERE — og de ER i luften nu,
på Mikkels udtrykkelige beslutning (23/8, spurgt direkte).** De to
tal, vi HAR bekræftet, blev rettet før udgivelsen: telefonen er
28 87 13 43 og adressen Havnevej 20I overalt på de nye sider.
Resten — 4,8 på Google, hej@-mailen, 40 pers., 15 år, alle priser,
datoer og arrangementer — står som designets pladsholdere, som
personalet selv skal redigere. **Designbundt-vagten over opdigtede
tal er parkeret imens** (tests-gamle/); den skal genopstå mod de
nye sider, når tallene er ejerens egne. Ret ALDRIG telefonen eller
adressen tilbage til prototypens (43 90 15 00 / Mosede Havnevej 15).

**Prøverne i overgangen:** 11 specs bundet til den gamle forside
er parkeret i `tests-gamle/` (Playwright kører dem ikke; grundene
står i mappens README). 16 enkeltprøver i blivende filer er
skippet med sætningen *"forsiden er skiftet ud (23/8)"* — én grep
finder dem alle, når de skal genopstå. Flerlejer-værnet i
`lokation.spec.js` blev IKKE skippet: det er motorens værn, ikke
forsidens, og måler nu på `bestil/`, hvor motoren stadig kører.
`ved-bordet/`, admin og de gamle formular-sider står urørte og
prøves som før.

**Systemfasen (det, der kommer nu):** dagens ret + ugens retter,
nyheder, kalenderens arrangementer, tapasfadets indhold og priser
samt åbningstider skal styres fra personalesiden; formularerne
skal POste til køkkenoverblikket — smørrebrød/selskab/catering/
baglokale ind i de EKSISTERENDE tabeller (bestillinger,
forespoergsler, udlejninger). To ting i designet HAR ingen motor
og skal besluttes, ikke bare kobles: frokostordningen er tegnet
som B2B-abonnement (CVR, faste ugedage, fakturamail) — det blev
afvist 20/8 som misforstået, så enten bygges den motor nu, eller
siden kobles til forespørgsler; og kalenderens "Reservér plads"
med pladstælling findes ikke i databasen endnu.

**Systemfasen er begyndt — trin 1 er læsesiden** (23/8). De ting,
gæsten LÆSER, kommer fra databasen nu: heroens statuspille,
musikbanneret (næste offentlige arrangement), dagens ret,
nyhederne, åbningstiderne, tapasfadets pris og hele menukortet.
To nye filer, `js/skal/forside.js` og `js/skal/menukort.js`, og
tre script-tags pr. side. **Ingen SQL — intet nyt i databasen.**

**Skallen er ikke rørt.** Koblingen fylder de elementer ud, der
allerede står i designet; den flytter, tilføjer og fjerner
ingenting. En prøve sammenligner hele rækkefølgen af forsidens
afsnit og falder, hvis nogen laver om på den.

To regler bærer filerne, og de skal begge overleve næste trin:

- **Vi overskriver kun, når databasen har noget at sige.** Uden en
  pris på tapasfadet bliver designets pladsholder stående, og
  svarer databasen ingenting på menukortet, står `menu-data.js`
  som nødmenu. En kobling, der skriver "0,-" hen over designet, er
  værre end ingen kobling
- **Et afsnit uden noget at vise findes ikke.** Ingen dagens ret,
  ingen nyheder, intet kommende arrangement → afsnittet skjuler
  sig. Med `style.display` og ikke `hidden`: `.music` har
  `display:flex`, og en klasse med display slår browserens egen
  regel for `[hidden]`

**Tre steder passer designet og databasen ikke 1:1**, og det er
huller, ikke fejl: linjen "Ishuset i højsæson" forsvinder (der er
én ugeplan, ikke to), kategorinoterne på menukortet forsvinder
(`menu_kategorier` har ingen notekolonne), og **udsolgte varer
står ikke på kortet** — designet har ingen udsolgt-tilstand, og at
finde på en ville være at lave om på skallen.

**Trin 2a: forsidens bestilling er ægte** (23/8). Formularen på
forsiden var en attrap med faste datoer, faste klokkeslæt og seks
rækker mad skrevet i hånden. Nu kommer dagene fra åbningstiderne,
kalenderen og varslet, tiderne fra den valgte dag, varerne fra det,
ejeren har åbnet for i admin — og "Send bestilling" skriver i
`bestillinger`, så den står i køkkenets overblik. **Ingen SQL.**

**Reglerne bor ét sted nu.** `js/bestil-regler.js` (5 kB) er
klippet ud af `js/bestilling.js`: hvilke dage og tider der kan
vælges, varslet og mindsteantallet. `bestil/` og `ved-bordet/`
bruger den samme fil. To udgaver af "hvornår kan man hente?" er én
for meget — rettes varslet det ene sted og glemmes det andet, kan
gæsten bestille til om to timer på den ene side og ikke på den
anden, og ingen af delene ser forkerte ud. Den ENE regel, der IKKE
flyttede med, er bordets undtagelse fra mindsteantallet: den er en
egenskab ved den formular, ikke ved forretningen.

**"+ tilføj" folder kategorien ud.** Designets vareliste har én
række med tæller (dagens ret) og fem med "+ tilføj", som ikke
gjorde noget. Nu er de kategorierne fra admin, og et tryk folder
deres varer ud som de SAMME `.item`-rækker med tæller. Der kommer
ingen ny form på skærmen, kun flere af den, der er.

**Fejl står i sumlinjen.** Designet har ikke tegnet et fejlfelt, og
et opfundet ét ville være en ændring af skallen. Beskeden står
derfor i `.note` over knappen, hvor summen står, og summen kommer
igen, så snart feltet rettes.

**To felter forsvinder, når forretningen ikke har dem:** er
`spis_her` ikke slået til i admin, findes spørgsmålet "Hvordan vil
I spise?" ikke, og er der lukket for bestillinger, findes hele
afsnittet ikke — så peger den flydende pille på
smørrebrødssiden i stedet for ned i ingenting.

**Trin 2b: smørrebrødssiden bruger den SAMME motor** (23/8).
`h-smorrebrod.html` sender nu rigtige bestillinger, og den gør det
gennem `js/skal/bestil.js` — ikke gennem en kopi. Forskellene står
som opsætning i `SIDER` øverst i filen:

| | Forsiden | Smørrebrødssiden |
|---|---|---|
| Udvalg | `uden-fyld` | `kun-smoer` |
| Spørgsmål | Spis her / tag med | Hentes / leveres |
| Vareliste | kategorier med "+ tilføj" | stykkerne direkte |

**Skrev vi afsendelsen to gange, ville den anden langsomt komme
til at gøre noget andet end den første** — og det ville ingen
opdage, før en gæst fik forkert mad.

**Levering er slået FRA som standard, og feltet forsvinder med
den.** Vi ved hverken hvad de kører ud med, hvor langt eller hvad
det koster. Designets linje "150 kr. inden for 10 km af havnen"
står stadig i filen, men den er ude af syne, til ejeren slår
fluebenet til — **og den skal bekræftes, før han gør det.**

**Og en levering bekræftes ALDRIG automatisk**, heller ikke når
`auto_bekraeft` står til. Vi kan love, at maden bliver lavet; vi
kan ikke love, at den kan køres til en adresse, vi ikke kender.

**To døde rækker og et forkert varsel røg ud**, fordi de ikke har
noget bag sig: "Tilbehør: øl, snaps og vand" kan ikke bestilles på
en side, der kun sælger smørrebrød, og "inden for 2 dage" er et
fast tal, hvor varslet sættes i admin.

**⚠ Der er ingen fyldvælger på siden.** Designet har ingen, og
pladsholderteksten i beskedfeltet siger "ønsker til fyld". De 29
slags fyld vælges derfor i fri tekst her — modellen med et flueben
pr. fyld findes kun på `bestil/`. Det er designets valg, ikke en
mangel i motoren.

**En fælde, prøven fangede:** panelet har flere `.hint`, og første
udgave skrev varslet hen over manchetten under overskriften. Den
så rigtig ud, og datolinjen stod stadig med designets faste tal.
Hinten findes nu ud fra DATOFELTET.

**Trin 2c: tapasfadet kan bestilles — og ses i køkkenet** (23/8).
Ejerens tre krav er bygget: to dages varsel, ring-kortet om
fadets indhold bliver stående, og bestillingen **markeres
anderledes i admin**.

**Varslet er fadets eget, ikke forretningens.** `varselTimer(d,
mindst)` i `js/bestil-regler.js` tager nu et frivilligt "mindst",
og tapassiden beder om 48 timer. **Det kan kun trække varslet OP.**
Kunne en formular sætte det ned, ville den kunne omgå det, ejeren
har sat i admin, og køkkenet fik en bestilling, de ikke kan nå.
Ejeren kan sætte sit eget tal med `tapas_varsel_timer`.

**🧀 Tapasfad står som mærke på både Bestillinger og Overblik**,
og det slår de andre mærker. Et fad til tolv er dagens største
stykke arbejde; står det som en almindelig bestilling mellem
tredive andre, opdager køkkenet det, når der er to timer til — og
så er de to dages varsel spildt. Kendingen (`Admin.erTapas`) er
varens NAVN og ikke en ny kolonne: fadet er en vare på menukortet
som alt andet.

**Prisen er menukortets, ikke designets.** Designet regnede med
199 kr. pr. person og 150 kr. for cavaen; begge er pladsholdere.
Er prisen ikke sat i admin, står der **"Pris følger"** i
sumboksen. Et beløb, vi selv finder på, er værre end ingen pris —
gæsten regner med det.

**Cava-rækken findes kun, hvis varen findes i menukortet.** At
sende en vare, ingen har oprettet, er at finde på et produkt på
forretningens vegne.

**⚠️ Uden fadet i menukortet kan der ikke bestilles**, og
formularen skjuler sig. Kør `supabase/menukort-ud-af-huset.sql`
og sæt priserne i admin, så er den der.

**En tavs fejl, prøven fangede:** `n * fad.pris + b * bobler.pris`
kaster, når der ikke er noget tilkøb — `bobler` er null. Fejlen
kunne ikke ses: sumboksen beholdt bare designets pladsholder, og
formularen så helt rigtig ud.

**Trin 3: de tre forespørgselssider skriver i admin** (23/8).
Selskaber, catering og baglokalet sender rigtige forespørgsler nu
— én tabel, tre indgange, som fase 2 byggede den. **Og det er den
første SQL siden trin 1:** kør `supabase/forespoergsel-kalender.sql`
+ `proev-forespoergsel-kalender.sql` (20 × BESTOD på en lokal
Postgres 16).

**Detaljerne er felter, ikke fritekst.** Kolonnen `detaljer`
(jsonb) tager formularernes egne valg — anledning, tidsrum,
kuverter, hvad der skal serveres, fade. Ét objekt, aldrig en
liste, og højst 4000 tegn. Uden den ville alle valgene ende i
beskeden, hvor personalet skulle læse en sætning igennem for at
finde tallet.

**Havnen er ÉT sted.** Er baglokalet lejet ud den 12., kan der
ikke også holdes selskab hos jer den 12. Visningen
`optagne_dage` siger, hvilke dage der er væk — **KUN datoer**,
ingen navne, ingen numre — og gæsten må læse den. Et værn i
databasen siger nej igen, hvis nogen omgår formularen.

**Kun AFTALTE dage er optagne.** En forespørgsel, der lige er
kommet ind, er et spørgsmål, ikke en booking. Spærrede en ny
forespørgsel dagen, kunne én person med et telefonnummer lukke
hele efteråret på ti minutter.

**Catering og "ud af huset" optager ingenting** — så laver
køkkenet mad, der kører ud, og havnen står fri.

**⚠️ Tilføj ALDRIG en kolonne til `optagne_dage`.** Visningen
kører med sin ejers øjne og springer adgangsreglerne over — det
er hele meningen. Kommer der et `navn` med, er gæstelisten åben
for internettet. Prøve 4 tæller kolonnerne.

**Mail-knappen står på kortet i admin**, når gæsten har oplyst en
adresse. Den åbner personalets eget mailprogram med reference,
dato, antal og detaljer skrevet ind. **De tre formularer har fået
et e-mail-felt** — uden en adresse har knappen ingen at skrive
til.

**En fejl, prøven fangede, og den kunne have kørt mad ud til den
forkerte:** designets `[data-toggles]`-segmenter flytter IKKE
`.on`, når man trykker — de skjuler bare feltet nedenunder. Første
udgave læste `.on`, og en catering, hvor gæsten havde valgt
**Afhentning**, blev sendt som en **levering med adresse**. Svaret
læses nu af det, designet faktisk holder styr på: om feltet
nedenunder er synligt.

**Menukortet er bygget om — man bestiller ikke derinde** (24/8).
Kundens ord: *"hvorfor ser den her stadig sådan ud?"* og
*"man skal ikke kunne bestille derinde"*. Siden kom med
handoffet i sit eget v3-tema OG med en kurv, hvis indhold ikke
fulgte med over på bestillingsformularen — gæsten begyndte
forfra.

`m-menukort.html` er skrevet om og kører på `havnegrillen.css`
som alle andre sider. `menukort.css` er lille og har kun de tre
former, siden har og de andre ikke har: kortet **I dag**,
**ugelisten** og **kategorikortene**.

**Fem filer er slettet:** `mosede-m.css`, `mosede-m.js`,
`menu.css`, `menu.js` og `menu-data.js`. Ingen side indlæser dem
længere, og en prøve tjekker, at de ikke kommer med igen.

**Ingen plusknapper, ingen kurv, ingen søgning.** Kortet er til
at LÆSE; én knap i bunden fører til bestillingen. Prøven tæller
`.plus`, `#cartbar`, `#cart` og `[data-step]` til nul.

**⚠️ Ugen er halvt tom med vilje.** Der er kun ét felt til dagens
ret i admin, så kun i dag kan fyldes ud — resten siger "Følger
snart…", og en lukkedag siger "Lukket". Hele ugen kræver en
tabel, `dagens_retter`, som ikke er bygget endnu. En opdigtet ret
på torsdag ville være et løfte, køkkenet ikke har givet.

**To ting fra forlægget er IKKE bygget**, fordi der ikke er data
til dem: "kun hverdage" pr. kategori og "kun 6 tilbage" pr. vare.

**Emojier, farver og et hop-bånd** (24/8, kundens ord). Hver
kategori har sit eget emoji, gættet ud fra navnet — det FØRSTE
mønster vinder, så `fyld` står før `smørrebrød` og `softice` før
`vafler`. **Kolonnen `emoji` på kategorien vinder, hvis den
kommer**: koden er skrevet, så ejeren kan overtage tegnet med ét
felt i admin. Farven på tegnet kommer fra AFDELINGEN, og alle tre
farver stod i `havnegrillen.css` i forvejen. Antallet står ude
til højre, og hop-båndet klæber under topbjælken (målt: 109 px,
ikke 64) og markerer den kategori, man kigger på.

**Ejerens liste er kørt igennem mod kortet** (24/8). Hele
sortimentet blev sendt igen og sammenlignet post for post med de
230 varer i databasen. **Kør `supabase/menukort-ejerens-liste.sql`
+ `proev-menukort-ejerens-liste.sql`** (18 × BESTOD lokalt) —
derefter 21 kategorier og 242 varer.

Filen lukker de **éntydige** huller: en ny kategori (glutenfri,
laktosefri og vegansk), syv manglende varer og otte beskrivelser,
ejeren har skrevet indholdet på — vigtigst **tapasfadet**, hvor
gæsten før ikke kunne se, hvad der var på et fad til tolv.

**Kategorien kan bære en note nu** (`menu_kategorier.note`). Den
manglede to gange: "På toastbrød eller rugbrød" gælder alle tolv
slags pindemad, og designet havde "Serveres 8–11" over
morgenmaden. **⚠️ Notefeltet i admin må ikke have klassen `navn`**
— første udgave gav det `navn kat-note`, og så fandt
`.kat-hoved .navn` to felter. Fire prøver faldt med det samme.

**Ingen priser er gættet, og der slettes ingenting.** Ejerens
liste har ikke ét tal i sig, så alle tolv nye varer står som
"spørg". De ti steder, hvor listen og databasen LIGNER hinanden
uden at være det samme, står som spørgsmål i filens rapport — et
gæt ville lave enten en dublet eller en forkert vare.

**Priserne skrives i admin nu — af ejeren selv** (24/8). Efter
listen står 242 varer på kortet og over halvdelen uden pris.
Fanen Menukort er værktøjet: **tæller, filter og én gem-knap.**
**Ingen SQL.**

**⚠️ Et gem tørrede de andre felter af.** `Admin.gem` henter data
og tegner HELE fanen om. Havde ejeren skrevet ti priser og gemt
den ene række, var de ni væk — uden en fejl, uden en advarsel.
Derfor huskes det skrevne i `skrevet{}` på tværs af optegninger,
og derfor gemmer én knap dem alle. Enter i et prisfelt gør det
samme. **Prøven er set fejle med den gamle udgave.**

**Filteret skjuler KATEGORIEN, ikke bare dens varer** — en
overskrift med ingenting under er en kategori, man tror er tom, og
så opretter nogen varen, der allerede findes.

**Genvejen "Sæt samme pris på alle" står på hver kategori med mere
end én vare**, og den **udfylder, den overskriver ikke**: har
ejeren allerede skrevet 45 på tre af dem, er de tre det eneste,
nogen har bekræftet. Et flueben udvider den til alle med vilje.
Feltet hedder `samlepris-<kategori-id>` og ikke længere
`fyld-samlepris` — det navn på 21 kategorier ville ramme den
første.

**Antal og varsel står nu også på Menukort-fanen.** Det er de
SAMME indstillinger som på Bestillinger, ikke en kopi: begge faner
tegnes af `Admin.tegnere` efter hvert gem.

**⚠️ Antal på lager ("kun 6 tilbage") er IKKE bygget**, og det er
ikke en forglemmelse: et tal, personalet tæller ned i hånden,
bliver forkert i løbet af en frokost, og gæst nummer syv får mad,
der ikke findes. Skal det bygges, skal det være databasens — en
kolonne, en bremse der tæller ned ved bestilling, og et `udsolgt`,
der sætter sig selv ved nul. Indtil da er fluebenet **Udsolgt**
svaret; det virker, og det lyver ikke.

**Personalesiden har fået forlæggets skabelon** (24/8). Kunden
sendte tre skærmbilleder af en færdig personaleside: *"gør admin
samme tema og lign det her, bare så det passer til havnegrillens
... desktop-wise skabelonsmæssigt."*

**Formen er lånt, farverne er havnens.** Søjlen er marineblå, det
valgte punkt rødt, fladen sand. Der er **hverken læst i eller
kopieret fra spiis' kode** — bygget efter skærmbillederne.

- **Mørk søjle i venstre kant**, fast og i fuld højde. Menulisten
  er den ene del, der ruller: fjorten punkter à 46 px er 644 px,
  og en bærbar på 720 px har ikke plads til mærket og "Log ud"
  oveni
- **Topbjælken er væk, når man arbejder** — 92 px af skærmhøjden
  på hver eneste fane, med det samme indhold hele vejen. Klassen
  `arbejder` på `<body>` sættes af login.js: uden den ville
  login-skærmen stå uden hoved og uden gutter
- **Sidens navn er den valgte fanes navn**, skrevet af
  `Admin.visFane` fra knappen selv. Panelets første overskrift
  **skjules**, når den siger det samme — den fjernes ikke, for på
  en telefon er der ikke noget hoved
- **Dagens tal står ØVERST på Overblik.** Første felt er fyldt:
  seks hvide felter læses som en tabel

**⚠️ To fejl, prøverne fangede, og begge var usynlige i koden:**
`.adm-side` fik `display:none` under 900 px, og da `.faner` ligger
INDE i den, forsvandt **alle fjorten faner på telefonen** — otte
prøver løb tør for tid på et klik, der aldrig kunne ske. Søjlen er
`display:contents` dernede. Og første udgave skjulte hele hovedet
på telefonen, så man landede på seks tal uden en overskrift.

**Admin har gæstesidens tema nu — i sin egen udgave** (24/8).
Kundens ord: temaerne skal være "cirka de samme, men alligevel
lidt anderledes og bedre, fordi det er admin". Varm blæk
`#241a17`, creme `#fdf7ef`, den røde `#d62a3a`, Instrument Serif
til overskrifter, og ternet som ÉN stribe ned ad søjlens kant.

**⚠️ Variablerne sættes på `body.personale`, ALDRIG i `:root`.**
`css/style.css` bærer stadig ni gæstesider — `bestil/`,
`menu.html`, `selskaber/`, `bord/` og resten. Ændres `:root`,
skifter de tema uden at nogen har bedt om det. En prøve måler
begge sider.

Anderledes med vilje: fladere (18 px mod gæstens 26), **ingen
glasknapper** (sløring uden foto bagved koster billeder i sekundet
på en iPad), **mørkere dæmpet tekst** (gæstens `--muted` rammer
3,9:1 mod creme og falder under 4,5:1 — admins `#6f5b55` rammer
5,97:1), og **intet tern som flade**.

**Skriften ligger lokalt** i `fonts/instrument-serif.woff2` (21 kB)
og ikke som et link til Google Fonts: admin åbnes på en iPad i et
køkken. Den hentes kun, hvis den bruges.

**⚠️ `line-height: .88` på `h1, h2, h3` er Bebas'.** En serif har
over- og underlængder og bliver klippet; to linjer lægger sig oven
i hinanden. `body.personale` sætter 1.06. Samme historie med
`.top-navn`s sperring på `.15em`.

**`--overskrift` findes ikke i `:root`.** `.tal-tal` brugte den i
en `font`-shorthand, og en shorthand med en uløst variabel er
ugyldig HELE vejen — tallet arvede brødteksten og stod i 17 px.
Bruger du `var(--...)` i en shorthand, så tjek at den findes.

**Kalenderen er en kalender nu** (24/8). Kundens ord: *"kalenderen
skal være en kalender ... alt skal kunne administreres ift at have
styr på alle ting derinde ... køreplanen får præcis den, skrive
notater til den dag osv som selvfølgelig kommer ind i overblik"*.

Fanen var en LISTE over arrangementer og lukkedage, og den vidste
ikke, at der lå bestillinger, borde, forespørgsler eller en
udlejning samme dag. **Ingen SQL** — dataene var hentet i forvejen.

- **Månedsnet** med alt, der rører en dag: 🥪 bestillinger,
  🍽️ borde, 💬 forespørgsler, 🔑 baglokalet, 📅 kalenderen,
  📝 noten. Tryk på en dag → hele dagen skrevet ud
- **Dagens panel retter INTET.** Hver ting hører til sin egen fane,
  og en knap fører derhen. To steder at ændre en bestilling er to
  steder, der kan skride fra hinanden
- **Køreplanen står øverst på Overblik**: er der åbent, er
  baglokalet lejet ud i dag, og hvad har personalet skrevet

**⚠️ Noten til dagen kendes på TITLEN.** Den bor i kalenderen som
en intern arrangement-række med titlen `Note til dagen`
(`NOTE_TITEL` i `js/admin/kalender.js`). Databasen har tre typer og
ingen fjerde, og en kolonne mere er en SQL-fil, ejeren skal køre.
**Skift aldrig teksten** — de skrevne noter ville blive til
arrangementer på dagen.

**⚠️ `Admin.data` kan være `null`, når `efterHent` kører.** Fanerne
melder deres lister ind, så snart de har hentet, og det kan ske før
første `Butik.hent()`. Uden gardet kastede `tegnMaaned` — og da
**alle tegnere ligger i den samme liste**, blev de faner, der stod
efter kalenderen, aldrig tegnet: Overblik og Bestillinger stod
tomme uden en fejl på skærmen. Elleve prøver faldt.

**⚠️ Køreplanen er den første del af Overblik, der læser
`Admin.data`.** Resten lever af `Admin.lister`. Derfor står
`tegnKoereplan` også i `Admin.tegnere` — uden den blev en gemt note
først synlig, næste gang en fane meldte noget ind.

**⚠️ `body.personale .knap` vejer tungere end `.knap.lille`.** Da
admin fik gæstesidens tema, blev pilene op/ned og månedsskiftet
røde — præcis det, noten ved `.knap.lille` advarer imod. Prøven
læser den beregnede farve.

**Personalet kan tage en booking i telefonen** (24/8). Ringer nogen
og bestiller et bord, fandtes der ingen vej ind — så stod halvdelen
af dagen i systemet og halvdelen på en seddel ved lugen, og dagens
billede løj om, hvor mange pladser der var tilbage. Formularen står
foldet sammen på Borde-fanen. **Ingen SQL.**

**Den bruger gæstens egen motor.** `Butik.bookBord()` er den samme
funktion, hjemmesiden kalder, og dermed de samme værn. En anden vej
ind i den samme tabel ville være to regelsæt, der langsomt kommer
til at sige noget forskelligt — og ingen ville opdage det, før to
familier stod ved det samme bord. Den oprettes som **bekræftet**
(personalet har sagt ja i røret) med noten "Taget i telefonen".

**Frokostordningen er den fjerde forespørgsel** (24/8). Designet
tegnede den som et B2B-tilbud — firma, CVR, faste ugedage,
fakturamail, "Få et tilbud" — og dét er et spørgsmål, ikke en
bestilling. **Der bygges ingen abonnementsmotor**; det blev afvist
20/8, og forsidens bestilling dækker den mad, man bestiller dagen
før. `h-frokost.html` bruger nu det samme modul som selskaber,
catering og baglokalet.

**⚠️ Kør `supabase/frokost.sql` + `proev-frokost.sql`** (8 × BESTOD
på en lokal Postgres 16). Den udvider kun den tilladte liste over
slags forespørgsler. **Køres `forespoergsler.sql` igen bagefter,
skriver den listen tilbage til tre** — og så får et firma, der
trykker "Få et tilbud", en fejl, personalet aldrig hører om.
`er-vi-klar.sql` linje 70 fanger det.

**Frokosten optager INGEN dage.** Datoen er ønsket start, ikke en
enkelt dag, og maden kører ud af huset. Optog den dagen, kunne ét
firma med en fast onsdag lukke hver eneste onsdag for selskaber og
udlejning.

**⚠️ Listen over slags står TO steder:** `forespoergsel_type_ok` i
databasen og `FORESPOERGSEL_TYPER` i `js/store.js`. Rettes kun det
ene, tager øvetilstanden imod, hvad den rigtige database afviser.

**Felterne gemmer sig selv** (24/8). Der var otte Gem-knapper. En
travl medarbejder, der retter tavlen kl. 11.55 og går uden at
trykke, havde rettet **ingenting** — og det opdages om onsdagen.
`Admin.autogem(rod, saml)` er to linjer pr. fane. **Ingen SQL.**

- **`change` gemmer straks**, når feltet forlades. Det er dét, der
  fanger den, der taster og går. `input` gemmer 1,2 sekund efter
  sidste tastetryk
- **⚠️ Den gemmer STILLE.** `Admin.gem` tegner alle faner om, og en
  optegning midt i en sætning river feltet ud af siden under
  fingeren. Autogem skriver kun til databasen; skærmen viser
  allerede det skrevne
- **Knapperne bliver stående** — de skal bare ikke være det eneste,
  der virker. `saml()` returnerer et løfte, eller en TEKST hvis
  noget mangler: knappen brøler den, autogem viser den i sit mærke
- **⚠️ Roden skal være KORTET, ikke en boks, der tegnes om.**
  Første udgave hang på `#tider-felter`, som `tegnTider` bygger om
  ved hver hentning — og så blev mærket revet ned med

**Nyheder tænder og slukker sig selv** (24/8). "Live musik på molen
· lørdag 22. august" skulle væk om søndagen, og det er den slags,
ingen husker, når der er travlt. To valgfrie datoer: **tom betyder
altid**, så alt det, der allerede står, bliver stående.

**⚠️ Kør `supabase/nyheder-fra-til.sql` + `proev-nyheder-fra-til.sql`**
(7 × BESTOD lokalt).

**Reglen står ét sted: `Butik.nyhedSynlig`.** Forsiden, den gamle
forside, nyhedssiden og admin spørger den samme funktion — tre
kopier ville langsomt vise tre forskellige ting. Og der er
**ingen filtrering i databasen**: rækkerne hentes alle sammen, så
personalet kan SE i admin, at en nyhed *venter* eller er *udløbet*.
`Butik.nyhedStatus` giver ordet.

**Dagens ret fik en tabel** (24/8). Den var ÉN indstilling: ét
navn, én dag, én pris — derfor stod menukortets ugeplan halvt tom,
derfor blev to retter til ét langt navn med én pris, og derfor
kunne en udsolgt ret bestilles videre.

**⚠️ Kør `supabase/dagens-retter.sql` + `proev-dagens-retter.sql`**
(11 × BESTOD lokalt).

**Antal tilbage tælles nu — af DATABASEN.** Advarslen ovenfor mod
et håndtalt lager gælder stadig; det er præcis derfor, tællingen
ligger i en bremse på `bestillinger` og ikke i browseren. Ved nul
sætter retten sig selv udsolgt. `greatest(antal - stk, 0)`: et
negativt tal ville gøre en udsolgt ret bestilbar igen.

**⚠️ Nøglen skal sammenligne som bremsen gør.** Første udgave var
`unique (lokation_id, dato, navn)`, mens bremsen matcher på
`lower(btrim(navn))` — så kunne "Stegt flæsk" og "stegt flæsk "
ligge side om side og BEGGE blive talt ned. Prøve 5 fandt det.

**Den gamle indstilling lever videre.** Er tabellen tom for i dag,
vises `dagens_ret` som før — ellers ville dagens ret forsvinde i
det sekund, filen blev kørt. Reglen bor i `Butik.dagensRetter`.

**⚠️ Antallet sendes kun med fra admin, når nogen har rørt feltet.**
Ellers ville et gem midt i en frokost skrive morgenens tal tilbage.

**⚠️ `lokalt()` fangede ikke sit eget tilbagekald.** Skrivelaget
efterligner databasens regler i øvetilstand ved at KASTE, og fejlen
røg synkront ud FØR `Admin.gem` fik et løfte at hænge sin catch på
— skærmen stod uændret uden en linje om hvorfor. Den fanges nu.

**Køkken-køen er bygget** (25/8). Briefen bad om en
"Restaurant-mode", hvor personalet KUN ser bestillingerne fra
bordene, med ét tryk pr. trin og en ventetid, der bliver rød. Den
ligger på fanen **Køkken-kø** under gruppen *Restaurant* i søjlen.

**⚠️ Kør `supabase/restaurant.sql` + `proev-restaurant.sql`**
(13 × BESTOD lokalt) — **efter `skraldespand.sql`**.

**Det er en egen SKÆRM, ikke en egen tabel.** Køkkenet har ÉN kø;
to tabeller ville være to lister, nogen skal huske at kigge i — og
den dag begge har travlt, er det den ene, der bliver glemt. Salget,
udeblivelserne og dagens omsætning regner allerede på
`bestillinger`. **Bordnummeret ER adskillelsen**: skærmen
filtrerer, dataene deler sig ikke.

**⚠️ Køres `setup.sql` eller `udeblivelser.sql` igen bagefter,**
snævres statuslisten ind, og køkkenet kan ikke trykke "Tilberedes"
mere. Fejlen ser ud som en knap, der ikke virker. `er-vi-klar.sql`
linje 91 fanger det.

**⚠️ Dubletvagten gælder ikke bordene længere.** En
bordbestilling vælger ingen hentetid — `hent_tid` er klokken NU.
Selskabet ved bord 7 bestiller is efter maden og rammer det samme
minut, og de fik *"Du har allerede sendt en bestilling til det
tidspunkt"*, som om de havde dobbeltklikket. Nøglen er nu
`where slettet is null and bord_nummer is null`. **Køres
`skraldespand.sql` igen, skal `restaurant.sql` også køres igen** —
linje 93 fanger det.

**⚠️ Og anden runde mistede bordnummeret.** Efter et gennemført
køb nulstilles kurven, og den stod på `hvordan: 'afhentning'` —
`spis_her` sættes kun i `start()`. Et bordnummer kræver spis her,
så `store.js` tog det af, og isen landede som en almindelig
afhentning med hentetid **nu**: køkkenet vidste ikke, hvilket bord
den skulle hen til. **Begge fejl blev fundet af prøver, ingen af
dem ved at læse.**

**Omsætningen tæller `serveret` med nu.** En bordbestilling ender
dér og aldrig på `afhentet`; talte vi kun det sidste, ville hver
krone fra bordene være væk fra regnskabet uden en fejl. De to ord
er den samme begivenhed set fra hver sin side af lugen.

**Zonen på bordet er FRI TEKST** (`borde.zone`) og noget andet end
`placering` (ude/inde). `print/bordkort.html` sorterer skiltene
efter den og begynder et nyt ark, hver gang zonen skifter.

**⚠️ BETALING BYGGES IKKE. Afklaret af Mikkel 25/8:** *"det skal
ikke være med mobilpay — de gør det via kassen ved at tage
tingene ind manuelt."* Det holder 19/8-beslutningen og designet
bag `ved-bordet/` ("Ingen betaling, ingen løbende regning"), og
det fjerner refusionerne og hele spørgsmålet om
salgsregistrering: **kassen ved lugen ER registreringen.**
Skulle det laves om, kræver det ejerens egen aftale med en
indløser (CVR) — og **en attrap, der ligner en rigtig betaling,
må aldrig bygges**: en gæst, der tror, hun har betalt, har ikke
betalt.

**Smiley-rapporten er på siden — linket er ejerens eget** (31/8).
Mikkel oplyste `findsmiley.dk/app/1480560` ("Mosede havn grill og
ishus", glad smiley, seneste kontrol 26-02-2026). Den stod på
"Ejeren skal bekræfte"-listen som tom siden foråret. Chippen står
i footeren på alle sider med en footer — **listen læses af
MAPPEN** — og kilden står i `js/oplysninger.js`. **Ingen SQL.**

**Emoji-fliserne og nødden** (31/8, kundens skærmbillede): de fire
streg-ikoner på forsidens menukort-kort er emoji nu (🍲 🍔 🥗 🥤),
knappen bærer 📖, og allergilinjen 🥜. Fliserne er `aria-hidden` —
en skærmlæser skal ikke sige "gryde burger salat sodavand" før
knappen.

**⚠️ FACEBOOK-KORTET FANDTES ALLEREDE** (31/8). Kunden bad om et
Facebook-banner "samme sted som arrangementerne i toppen" — og
første udgave BYGGEDE et, hvorefter der stod TO blå kort med hver
sin tekst om den samme side. Designets eget kort (`.promo.fb`) har
ligget der siden 23/8 og venter kun på, at linket sættes i admin →
Indstillinger → Facebook; `js/skal/kontakt.js` fjerner det, så
længe linket mangler. Dubletten er fjernet igen, og en prøve
vogter, at kortet findes, når linket er sat — **og at der kun er
ét af dem.**

**Ét tryk på Færdig — kæden er lagt bag døren** (31/8). Kundens
ord: *"man skal bare trykke færdig, ikke det der dobbeltknap-noget,
når man afstemmer bestillingerne."* **Ingen SQL.**

Kæden var ny → bekræftet → klar → færdig: tre tryk på en
bestilling, der bare var hentet. Nu er knappen **altid ✓ Færdig**,
uanset hvor i kæden bestillingen står — på Bestillinger OG på
Overblik, for begge spørger `Admin.naesteTrin`, og det er hele
pointen med, at kæden bor ét sted.

- **⚠️ MELLEMTRINNENE ER IKKE FJERNET.** "Bekræft" og "Sæt som
  klar" ligger bag "···" (`Admin.mellemTrin`) — den, der vil
  markere "maden er lavet, den venter", kan stadig
- **⚠️ DE ÅBNE STATUSSER ER SKREVET UD** (`AABNE`), ikke udledt
  af "alt, der ikke er færdigt": et nyt ord i databasen ville
  ellers tavst få en Færdig-knap
- **⚠️ FEM PRØVER VOGTEDE DEN GAMLE KÆDE** og blev vendt MED
  noter: vagtskærmens "en NY skal bekræftes først" var en regel,
  kunden nu har truffet om — prøven vogter i stedet, at de to
  skærme giver det SAMME ene tryk. Logbogens tre og
  bestilling.spec's kædeprøve går gennem `aabnMere()` nu — kæden
  er stadig bevist, bare ad den vej, personalet går

**Fiskefileten er ude af stemningsgalleriet** (31/8, kundens
ønske). Filen ligger stadig i `billeder/`, og alt-teksten står
tilbage i `forside.js` med en note — sættes fotoet ind i
`data-filer` igen, følger teksten med af sig selv. **Og
fartprøvens loft læses af PULJEN nu:** der stod 7, og prøven
bestod stadig med 6 i puljen — et tal, der er skrevet af én gang,
holder op med at måle, når virkeligheden ændrer sig.

**Bestillingskortet fik ÉN handling frem** (31/8). Kunden sendte
et **skærmbillede** af, hvordan kortet skal se ud — *"det skal se
sådan her ud … agtig"* — og bad tidligere om, at man skulle kunne
se *"når de er kørt"*. **Ingen SQL.**

**⚠️ FORLÆGGET ER ET SKÆRMBILLEDE, IKKE KODE.** Der er hverken
læst i eller kopieret fra spiis' repo — det må ikke røres. Formen
er skærmbilledets, farverne er havnens. Samme fremgangsmåde som
personalesidens skabelon 24/8.

Kortet havde **tre knapper i fuld bredde under maden** — Bekræft,
Udeblev, Afvis — så hvert kort blev en halv skærm, og den ene
knap, personalet trykker på ni gange ud af ti, stod side om side
med to, de næsten aldrig bruger. Nu:

- **Én knap fremad**, til højre fra 900 px (samme greb som
  forespørgselskortet og Overblik fik). Under 900 px falder den
  under maden igen
- **Den sidste er grøn med et hak** — *✓ Færdig*. De to trin før
  er husets røde: de flytter sagen videre, men lukker den ikke
- **⚠️ INGENTING ER FJERNET.** Udeblev, Afvis, Slet og Gendan
  ligger bag **"···"**. En knap, der er væk, er en sag,
  personalet ikke kan lukke
- **Panelet ligger OVEN PÅ kortet** og skubber ingenting — ellers
  ville listen hoppe, hver gang nogen kigger efter en knap
- **Døren findes kun, når der er noget bag den.** En "···", der
  åbner ingenting, trykker man på én gang og aldrig igen

**⚠️ OG FIRE PRØVER PEGEDE DIREKTE PÅ DE SKJULTE KNAPPER.**
`admin.spec`, `skraldespand.spec` og `logbog.spec` klikkede på
Udeblev og Slet, som en finger ikke længere kan nå. De går gennem
`aabnMere(kort)` i `tests/hjaelp.js` nu — den vej, personalet går,
og samtidig en prøve på, at vejen findes. Samme greb som
`visFane()` fik 30/8. Og `vagtskaerm.spec` ledte efter knappen
"Afhentet" på Overblik: **kæden bor ét sted**, så ordet skiftede
begge steder på én gang — det er hele pointen med den.

**Bevægelsen: to ting, der kostede billeder** (31/8). Kundens
ord: *"optimering af sidens smoothness, satisfying og sådan — lad
den føles 120 fps, også i start animationen."* **Ingen SQL.**

**⚠️ TRE IKKE-PASSIVE `wheel`-LYTTERE PÅ FORSIDEN.** Sådan en
lytter tvinger browseren til at VENTE på JavaScript, før den
overhovedet må rulle. De sad på hver `<image-slot>` — tapasfadet
og de to nyhedsbilleder — fordi `image-slot.js` registrerer en
zoom med `{ passive: false }` ved opstart. Zoomen virker kun inde
i **reframe**, som en gæst aldrig går ind i, så de ventede på
ingenting. Den hægtes på i `_enterReframe()` og af igen i
`_exitReframe()` nu — præcis som Escape- og
klik-udenfor-lytterne ved siden af. **Funktionen er urørt.**

**⚠️ OG `.topbar` ANIMEREDE `padding`.** 58 → 52 px over 450 ms
med en fjeder — **seks pixels**, betalt med en ombrydning af hele
bjælken i et halvt sekund, netop mens fingeren ruller (bjælken
skifter til `.stuck` ved y > 300). Sluttilstanden er den samme;
de 6 px skifter bare med det samme, mens baggrund, slør og skygge
stadig toner ind på kompositoren. Samme rettelse på `#hd` for de
gamle sider, og den dekorative streg under overskrifterne vokser
med `transform: scaleX()` i stedet for med `width`.

**Målt på forsiden, iPhone 13, under et fuldt rul:**

| | før | efter |
|---|---|---|
| værste billede | 62,2 ms | **26,8 ms** |
| p95 | 24,9 ms | 24,0 ms |
| billeder over 33 ms | 2 | **0** |

`bestil/` ligger på 17,1 ms i værste fald. **Introen var i
forvejen jævn** — median og p95 begge 16,7 ms over 243 billeder,
kun 2 over 33.

**⚠️ OG ÉN MISTANKE VAR FORKERT.** Jeg troede, `revealFallback()`
kostede: den slår hele DOM'en op og læser geometri ved hvert
rullebillede. **Målt: 0,035 ms pr. kald.** Den blev ikke rørt.
Det er hele grunden til at måle først — en "optimering" af den
ville have været arbejde uden gevinst og en risiko for at bryde
noget, der virker.

**⚠️ DE TO REGLER ER PRØVER NU**, begge i
`tests/gennemgang.spec.js`: ingen gæsteside må registrere en
ikke-passiv `wheel`/`touchmove`-lytter (prøven instrumenterer
`addEventListener` FØR sidens egne scripts kører — et spørgsmål
til koden ville bestå, hvis en ny lytter kom til et andet sted),
og **intet stilark** må animere en egenskab, der udløser layout.
Den sidste læser arkene, ikke en enkelt side, så reglen også
gælder den næste fil, der bliver skrevet. Set fejle begge veje.

**En færdig bestilling så ud som en afvist** (31/8). Kundens ord
med to skærmbilleder af Bestillinger-fanen: *"der skal stå
færdig, og når de er kørt skal det tydeligt ses."* **Ingen SQL.**

To ting var galt, og de forstærkede hinanden:

- **ORDET.** Det sidste trin hed *Afhentet*, bunken hedder
  *✅ Færdige*, og tælleren øverst siger *0 færdige*. Tre ord for
  den samme tilstand er ét for meget midt i en frokost. Knappen og
  mærket hedder **Færdig** nu
- **FARVEN.** `.b-afhentet` var grå og halvgennemsigtig — den
  **samme** stil som `.b-afvist` og `.b-udeblevet`. "Maden kom ud
  ad døren" og "det blev aldrig til noget" lignede altså hinanden
  på en skærm, personalet skimmer. Den gennemførte er grøn og
  fuldt synlig nu; det afviste og udeblevne bliver gråt

**⚠️ KUN ORDET PÅ SKÆRMEN SKIFTER.** Databasens status hedder
stadig `afhentet` (og `serveret` ved bordene) — salgstallene
tæller på netop de ord, og en ændring dér ville stoppe
omsætningen uden en eneste fejl.

**⚠️ OG `erFaerdig()` VAR DEN FORKERTE PRØVE AT HÆNGE STILEN PÅ.**
Den er sand for en **afvist** bestilling — den betyder "ikke mere
arbejde", ikke "det gik godt". Hængt på den ville et afslag blive
farvet grønt. Derfor er der en `erGennemfoert()` ved siden af, og
en prøve holder fast i, at de to ikke må smelte sammen.

**⚠️ OG OVERBLIK HAVDE SIN EGEN ORDLISTE.** `js/admin/overblik.js`
havde en kopi med *Afhentet*/*Serveret*, så i det sekund ordet
skiftede, ville de to skærme sige hver sit om den SAMME
bestilling — og personalet skifter mellem dem hele dagen. Ordene
bor i `Admin.statusNavn` nu. **Rækkefølgen er ikke ligegyldig:**
`overblik.js` indlæses FØR `bestillinger.js`; det går, fordi ordet
først slås op ved optegningen, og en prøve siger til, hvis nogen
flytter opslaget op i indlæsningen.

**Siden ved bordet kunne ikke overskues** (31/8). Kundens ord:
*"hele siden på qr code bestil er rodet og dårlig og skal
fungere langt bedre, bedre overblik, klarhed over hvad man har
bestilt."* **Ingen SQL.**

Jeg scannede en kode selv og målte, i stedet for at læse:

- **⚠️ RODEN VAR ÉN GENERISK REGEL.** `section { padding-block:
  clamp(56px, 7vw, 104px) }` i `css/style.css` — og
  `.kort-gruppe` **ER** et `<section>`. Hver eneste kategori fik
  56 px foroven OG forneden, som ingen havde bedt om; med ejerens
  21 kategorier er det over **2.000 px tomt sand** ned gennem
  menuen. Tallet står slet ikke i `css/ved-bordet.css` — det blev
  fundet ved at spørge browseren, hvilken regel der gav de 56 px
- **Målt på en iPhone 13 (390×664): den første vare, gæsten kunne
  trykke på, lå 626 px nede** — 94 % af det første skærmbillede
  var overskrifter, og hun har lige scannet et mærkat: hun SIDDER
  ved bordet. Den ligger **507 px** nede nu, og plusknappen er
  inden for skærmen
- **⚠️ MEN BORDNUMMERET BLIVER.** Det er kvitteringen for, at hun
  scannede det rigtige mærkat — maden bæres ud efter dét nummer.
  Det, der røg, er GENTAGELSEN: nummeret stod i mærket, i
  overskriften og i manchetten
- **Søgefeltets pladsholder var klippet af** — gæsten så
  *"…softice, fad"*. Prøven måler TEKSTENS bredde mod feltets, ikke
  antallet af tegn

**⚠️ OG KURVEN SAGDE IKKE HVAD.** Den sagde *"2 stykker · 178,-"*
og intet andet. Med 242 varer på kortet og fire mennesker om et
bord kunne gæsten ikke se, HVAD hun havde valgt, uden at rulle
hele menuen igennem igen. Bjælken folder nu en liste ud med hver
vare, dens **egen** sum (2 sodavand = 50,-, ikke "2 × 25") og et
plus og minus pr. linje.

- **⚠️ TO KNAPPER, IKKE ÉN.** Bjælken VAR selv knappen, der førte
  videre. Skulle den også folde kurven ud, ville ét tryk gøre to
  ting — og gæsten, der ville se sin bestilling, blev sendt ned i
  formularen. Summen åbner listen; **Videre** fører videre
- **⚠️ ET TRYK I KURVEN TEGNER IKKE HELE LISTEN OM.** Første
  udgave kaldte `visStykker()`: 242 rækker revet ned og bygget op
  for at ændre ét tal fra 2 til 1, midt i en liste gæsten ruller
  i. Rækkerne bærer `data-vare` nu, og `saetAntal()` retter den
  ene
- **⚠️ OG `var kurvBar` MÅ IKKE FJERNES.** Den bruges også af
  iagttageren, der folder kurven væk ved Send-knappen. Første
  udgave tog den med, da klik-lytteren blev delt i to, og **hele
  bordsiden faldt** med `kurvBar is not defined`: gæsten fik *"Vi
  kan ikke hente kortet lige nu"* på en side, hvor alt var i
  orden. Fejlen var tavs i konsollen — den blev fanget af sidens
  egen `.catch` og skrevet som en `console.warn`

**⚠️ OG DEN FØRSTE PRØVE MÅLTE INGENTING.** *"Den første vare er
på det første skærmbillede"* spurgte, om varens TOP lå over
skærmens bund — og den bestod med fejlen genindført: varen lå 626
px nede på en skærm på 664, altså med 38 px synlige og
plusknappen under folden. Den måler **plusknappens nederste kant**
nu — det, gæsten skal kunne trykke på.

**Emballagen gjaldt kun den halve side** (31/8). Kundens ord:
*"vi mangler at lave emballagetillæg på bestillinger, det er 10
kroner oveni."* **Ingen SQL** — `indstillinger` er nøgle/værdi.

Motoren HAR været bygget siden 30/8, men **kun `js/skal/bestil.js`
brugte den.** `js/bestilling.js`, som bærer `bestil/` OG
`ved-bordet/`, regnede den ikke med — så det **samme smørrebrød
kostede forskelligt alt efter, hvilken side gæsten kom ind ad**,
og ingen af siderne så forkerte ud for sig selv. Det var
forskellen MELLEM dem, der var fejlen.

- **Reglen er den samme fil, ikke en kopi.** `R.emballage` i
  `js/bestil-regler.js` afgør prisen, hvilke kategorier den
  gælder, og at den **aldrig** lægges på spis her — så bordet
  slipper af sig selv
- **Den står som sin egen linje** i kurven og i bestillingen, med
  ejerens eget navn, hvis han har skrevet et. Et tillæg, gæsten
  først møder på totalen, er et tal, hun spørger til ved lugen
- **⚠️ DE TO PRØVER HØRER SAMMEN.** *"Et bord betaler aldrig
  emballage"* ville også bestå på en side, hvor emballagen slet
  ikke fandtes. Modstykket — *"to portioner ud af huset koster to
  gange emballage"* — står i `tests/bestilling.spec.js`
- **Prisen sættes i admin → Åbningstider → Emballage ved to-go.**
  Tom pris = ingen emballage; vi finder ikke på et tal på
  forretningens vegne

**En lukket kategori siger HVORFOR — og reglen blev overhovedet
ikke spurgt før** (31/8). Kundens ord: *"når klokken er over
lukke, så lad der stå: klokken er over 13, vi sælger ikke
morgenmad længere."* **Ingen SQL.**

- **⚠️ MÅLT, IKKE LÆST: `bestil/` og `ved-bordet/` spurgte ALDRIG
  med klokkeslæt.** `js/bestilling.js` kaldte `Butik.udvalg` uden
  tid og hvordan, og `kategoriPaaTid` springer hele sit tjek
  over, når tiden er null. Gæsten ved bordet kunne bestille
  morgenmad kl. 13.05, selv om ejeren lukkede den 12.30 — reglen
  fandtes (30/8), den blev bare aldrig spurgt. Beskeden, han bad
  om, var kun halvdelen af hullet
- **To grunde, ikke én.** Er dagen i dag OG uret selv forbi
  lukketiden: *"klokken er over 12.30 — sælges ikke mere i dag"*.
  Har gæsten bare valgt et sent klokkeslæt på en dag, hvor
  kategorien kan nås: *"kun til kl. 12.30"* som før
- **⚠️ VED BORDET GÆLDER VARSLET IKKE.** Første udgave lukkede
  HELE kortet ved bordet: tiden dér ER klokken nu, og
  smørrebrødets 24 timer satte "bestilles 24 timer før" på hver
  eneste række. Et varsel er et krav til en AFTALT tid; en tid,
  der ikke ligger ude i fremtiden, er ikke aftalt. Garden er
  `m > nu.minutter` i `kategoriPaaTid` — lugens vælgere tilbyder
  aldrig et passeret klokkeslæt, så den rammer kun bordet
- **⚠️ VÆLGERNE SPØRGER UDEN KLOKKESLÆT** (`''`, samme greb som
  `js/skal/bestil.js`): fik dag- og tidsvælgeren tiden med, bed
  filteret sig selv i halen — hvilke dage der KAN vælges, ville
  afhænge af det klokkeslæt, der allerede stod i feltet
- **Linjen `#bestil-lukkede` står over listen** på begge sider
  ("Ikke lige nu: Morgenmad (…)"), og en liste, der er tom, fordi
  ALT er uden for sit tidsrum, siger det — ikke "vi kan ikke
  hente udvalget", som lover mad over telefonen, køkkenet lige
  har lukket for
- **Tiderne tegnes FØR listen** (start() og dagskiftet), og et
  tidsskifte tegner listen om — ellers stod morgenmaden på
  skærmen, mens reglen først sagde nej ved afsendelsen
- **⚠️ OG NAVNEFÆLDEN RAMTE IGEN:** den nye `udvalgNu(d, iso)`
  kolliderede med en gammel no-arg `udvalgNu()` længere nede i
  filen — to funktioner med samme navn, den sidste vinder tavst
  (hentBorde-arret). Den gamle er slettet; fanget med grep, før
  den nåede browseren

**"Ingen dagens ret i dag" kan trykkes** (31/8). Kundens ord:
*"gør så man kan trykke ingen dagensret idag inde på dagensret
sectionen og ik bar at der står får kunderne dagensret følger
snart."* **Ingen SQL** — `dagens_ret_ingen` i `indstillinger`
gemmer DAGENS dato, så trykket nulstiller sig selv i morgen, og
ingen skal huske at trykke det fra.

- **Reglen bor ét sted:** `Butik.ingenDagensRet(d, iso)`.
  Menukortets uge og forsidens uge siger *"Ingen dagens ret i
  dag"* i stedet for *"Følger snart…"* — det sidste er kun sandt,
  så længe ingen har besluttet noget
- **En SKREVET ret vinder altid** over trykket: står der en ret
  på dagen, er den det nyeste, nogen har sagt. Knappen i admin
  siger det i stedet for at lade som om ("slet dem først") —
  og **hurtigfeltet ryddes MED**, for det gælder også kun i dag
- **Kortet står på Dagens ret-fanen** mellem ugeplanen og
  hurtigfeltet; når trykket er aktivt, hedder knappen Fortryd,
  og mærket siger, hvad siden viser
- **⚠️ PRØVEN "EN SKREVEN RET VINDER" BESTOD FØRST MED GARDEN
  FJERNET** — på menukortet skærmer grenrækkefølgen (retten
  tegnes, FØR der spørges), så prøven målte ingenting om garden.
  Admin-knappen spørger reglen ALENE, og garden har sin egen
  prøve dér: uden den stod knappen som "Fortryd", mens siden
  viste retten. Set fejle begge veje

**Admin: kvitteringen svæver, og knappen svarer straks** (31/8).
Kundens ord: *"alting, når man gemmer, ændrer inde på siden.
Knapperne og udseendet er simpelthen forældet ... boksen med alt
det der, det er grimt. Det skal være liquid glass, instant
responsivt admin-system og fungere."* **Ingen SQL.**

To ting var galt på én gang, og den værste var ikke den, der så
grimt ud:

- **KVITTERINGEN STOD I FLOWET** og skubbede kortet, felterne og
  den knap, man lige havde trykket på, ~60 px ned. Nu svæver den
  (`position: fixed`, over bundbaren på telefonen, nederst til
  højre fra 900 px) — **målt: kortet flytter sig 0 px**
- **OG SIDEN RULLEDE SELV TIL TOPPEN** (`window.scrollTo` i
  `kvitter()` og `brøl()`). Gemmer man en pris nederst på et
  menukort med 242 varer, skal man finde tilbage til rækken
  bagefter. Linjen er væk; prøven måler `scrollY` før og efter
- **Knappen kvitterer på stedet:** "Gemmer…" straks, "✓ Gemt"
  bagefter, slået fra imens (et dobbelttryk er en skrivning
  mere). `svarStraks()` i kerne.js finder knappen på
  `document.activeElement` — den behøver ikke sendes med gennem
  tyve kald. **⚠️ Teksten lægges tilbage, også når det går galt:**
  en knap, der bliver stående på "Gemmer…", ser ud som et system,
  der hænger
- **⚠️ ID'ERNE ER DE SAMME.** Tyve prøvefiler læser `#kvittering`
  og `#fejl`; en omdøbning ville være tyve prøver, der målte noget
  andet end det, personalet ser

**⚠️ OG GLASSET VENDER EN BESLUTNING FRA 24/8 — DET ER HANS.**
Dengang stod her, at admin med vilje IKKE har glasknapper:
"sløring uden et foto bagved koster billeder i sekundet på en
iPad". Grunden var rigtig, så den er ikke kastet væk — den er
blevet en **grænse**:

- `backdrop-filter` KUN på de flader, der ligger oven på noget,
  der ruller forbi: bundbaren og kvitteringen. To elementer, ikke
  to hundrede
- Kort og knapper får glassets UDSEENDE — lag, linsekant,
  indvendigt lys — men ingen sløring. Det koster ingenting at
  tegne
- **MÅLT på et menukort med 252 varer under et fuldt rul: værste
  billede 17,4 ms, p95 16,9, 0 billeder over 33 ms.** Glasset er
  gratis dér, hvor det er sat
- **⚠️ OG `.knap[disabled]` DÆMPEDE "✓ GEMT" TIL 50 %.** Målt på
  et skud: knappen stod blegt grønt og lignede en, der ikke
  virkede — mens den lige HAVDE virket. De to nye tilstande har
  deres eget svar tilbage
- **⚠️ OG PRØVEN MÅLTE FØRST RULNINGEN, IKKE REGLEN.**
  `boundingBox().y` er skærm-relativ, og et klik på en knap langt
  nede ruller den selv frem: tallet flyttede sig 1073 px, uden at
  noget var skubbet. Den måler `getBoundingClientRect().top +
  scrollY` nu

**Historien om havnen har sin egen side — og sin egen stil**
(31/8). Kundens ord: i den mørke info-sektion skal der være
historie om cafeen med en knap, og bag den *"en helt anden slags
stil, end vi har kørt med — nærmest cinematisk"*. Plus:
*"bestil-knappen skal væk for telefonen, når man læser."*
**Ingen SQL.**

- **`historien.html` + `historien.css` er sidens eget sprog:**
  sort grund, filmkorn, Instrument Serif i clamp op til 104 px,
  fuldbredde-billeder og **messing** i stedet for husets røde.
  Farverne bor i `historien.css` og IKKE i `havnegrillen.css` —
  lagt i det fælles ark ville de kunne sive ud på de ni andre
  sider, og så var "en anden slags" væk
- **⚠️ MESSING, FORDI RØD BETYDER "TRYK HER" I HELE HUSET.** Et
  rødt 1710 ville se ud som et link, og et rødt telefonnummer i
  kildelinjen målte dårligt på sort. Årstallene skal læses som
  noget, der er ridset i metal
- **⚠️ INGEN FLYDENDE PILLE.** Prøven tæller den til nul på
  historiesiden — og til ÉN på forsiden, ellers målte den kun, om
  klassenavnet var stavet rigtigt
- **⚠️ KILDELINJEN ER HUSETS EGEN REGEL GJORT SYNLIG.** Halvdelen
  af historien er lokalhistorie, ikke noget forretningen har
  målt. Ankerets ophav står som *"efter sigende"*, fordi kilden
  selv skriver "sandsynligvis", og bunden siger, hvor det kommer
  fra, og hvordan man retter os. En prøve holder fast i begge
- **⚠️ ARKIVFOTOENE LÆGGER VI IKKE IND.** Rettighederne til et
  arkivbillede er ikke vores at give videre, og siden er en
  forretnings. Fire pladser i admin → Forside (`foto_historie_1-4`),
  som ejeren fylder med det, han har lov til. Uden et foto står en
  MØRK flade med pladsens tegn — samme regel som `billedplads.js`
- **⚠️ OG SCROLL-MARGIN VAR IKKE PROBLEMET.** Et skud viste et
  kapitel bag topbjælken, og jeg var ved at skrive reglen igen —
  `#sc { scroll-padding-top: 128px }` har stået der siden 31/8.
  Det var Playwrights `scrollIntoViewIfNeeded`, som ikke
  respekterer scroll-padding. **Mål den vej, gæsten går**, ikke
  prøvens genvej

**"Intet må gå tabt"-eftersynet er kørt** (31/8). Kundens ord:
*"absolut intet må gå tabt af bestillinger ift. databasen eller
forespørgsler — alt skal virke og kunne ses uanset hvad."*
Hele kæden formular → database → skærm er gået efter for alle
fem gæstetabeller. **Ingen SQL.**

- **Hver tabel har synlige bunker for ALLE statusser** (også
  afvist/udeblevet), **en fortryd-vej** (Gendan på bestillinger
  og forespørgsler kom i samme runde; borde, udlejninger og
  reservationer havde deres), og **Slet er skraldespanden** —
  30 dages gendannelse, aldrig en sletning
- **Sendekæden holder:** tre forsøg med ventetid, netfejl siger
  "IKKE sendt endnu", reference-sammenstød får ét nyt nummer, og
  hver DB-afvisning oversættes til dansk med en handling i
- **Hver hentning i admin har en synlig fejl** — ingen tom liste,
  der LIGNER "ingen bestillinger", mens kaldet fejlede
- **⚠️ DET ENE HUL, EFTERSYNET FANDT, VAR BAGUD:** andre-dage-
  linjen på Bestillinger tæller alt uafsluttet på alle andre dage
  — men ingen prøve målte en bestilling fra I GÅR, ingen nåede at
  lukke. Den findes nu og er set fejle med fortidsdage filtreret
  fra. Koden var rigtig; det var dækningen, der manglede

**Arrangementet har en kategori nu — og filterknapperne virker**
(31/8). Kundens ord: *"når man opretter et arrangement skal man
jo også vælge kategorien, som så skal opdateres og virke korrekt
på siden."* Siden GÆTTEDE ud fra titlen, og alt ukendt blev
Musik — han så selv "MUSIK · 145" på et arrangement, der ikke
var musik.

**⚠️ Kør `supabase/arrangement-kategori.sql` +
`proev-arrangement-kategori.sql`** (4 × BESTOD på en lokal
Postgres 16, set fejle med værnet fjernet). Tjek 122 i
`er-vi-klar.sql`.

- **Null = ikke valgt, og så gætter siden som før** — de gamle
  rækker står som i går, og ejeren kan give dem en kategori med
  Ret → Gem ændringer. Ejerens valg SLÅR gættet
  (`slagsFor` i `js/skal/kalender.js`)
- **De tre lovlige er FILTRETS egne knapper** (Musik · Spisning ·
  Fest) — en fjerde slags er en ny knap på siden, ikke bare en
  værdi. Derfor et check og ikke fri tekst, og `store-skriv`
  laver alt ukendt om til null
- **⚠️ FILTERKNAPPERNE VIRKEDE ALDRIG PÅ EJERENS EGNE KORT.**
  Designets script fangede `.evcard`-listen ved indlæsning — og
  dér er den tom, for `js/skal/kalender.js` fylder den bagefter.
  Knapperne så ud til at virke og filtrerede ingenting. Kortene
  slås op ved hvert tryk nu
- **⚠️ OG TO PRØVER MÅLTE INGENTING I FØRSTE HUG.** "Ejerens valg
  slår gættet" hed *"Koncertaften med fællesspisning"* — så
  gættede regexen OGSÅ spisning, og prøven bestod med rangordenen
  fjernet (gæt og valg skal være UENIGE). Og filterprøven kunne
  ikke falde, fordi øvetilstanden når at fylde listen, FØR
  designets script kigger — den lægger nu et kort til EFTER
  indlæsningen, som produktionen gør. Begge set fejle bagefter

**Bestillingen har et nummer, man kan sige højt** (31/8).
Kundens ord med et skærmbillede af kortet: *"kan
bestillings-ordrenummeret ikke være fra #0000 af, lidt pænere
end det der"* (SM260831-UBJ7E) — og *"intet må gå tabt af
bestillingerne"* og *"oplys også bestillingsnumre til når folk
bestiller … det er professionelt"*.

**⚠️ Kør `supabase/bestillingsnummer.sql` +
`proev-bestillingsnummer.sql`** (7 × BESTOD på en lokal Postgres
16 med bremsen og dubletvagten slået til i stubben; set fejle med
triggeren fjernet og med tidsvinduet fjernet). Tjek 120-121.

- **⚠️ NUMMERET LÆGGES VED SIDEN AF REFERENCEN — den røres
  ikke.** Referencen er rækkens nøgle: lavet i gæstens browser,
  står i gamle kvitteringer og mails. Nummeret er det, øjne og
  telefoner bruger. På kortet i admin står `#0047` med referencen
  som title; gamle rækker uden nummer viser referencen som før,
  og migreringen giver dem numre i den rækkefølge, de kom ind
- **⚠️ TÆLLES I DATABASEN** (`bestillingsnumre`, én række pr.
  forretning, låst af opdateringen) — to gæster samtidig får
  aldrig samme tal. **Og gæstens eget bud smides ALTID væk** i
  triggeren, samme lov som bordets nøgle
- **⚠️ MED VILJE INGEN unique på kolonnen:** et sammenstød skal
  give to kort med samme tal — ikke en AFVIST bestilling
- **⚠️ GÆSTEN MÅ STADIG IKKE LÆSE TABELLEN.** Kvitteringen slår
  sit eget nummer op med `mosede_bestillingsnummer(ref)` —
  security definer, svarer kun på en reference, man HAR, og kun
  en time frem. Svarer den ingenting, står referencen alene, og
  intet mangler. Øvetilstanden tæller selv (`gemt.nummer`), så
  flowet kan øves uden nøgle
- Kvitteringen på `bestil/`, `ved-bordet/` og forsiden viser
  "Bestillingsnummer #0001"; bord- og forespørgselskvitteringerne
  viser deres reference (BO-/FO-), som de har gjort siden 23/8

**Åbningstider & kontakt står samlet nederst på forsiden** (31/8).
Kundens ord med spiis' bund som forlæg: *"add det her nederst på
siden, bare med havnegrillens oplysninger, men samme design."*
**Ingen SQL.**

- Find-afsnittet har en KONTAKT-blok i tidernes eget panelsprog:
  Ring til os · Selskaber & catering · Om din booking · Adresse.
  Mail-linkene går gennem den SAMME `data-post`-kanal som
  footeren — en rettet adresse i admin slår igennem begge steder
- **⚠️ EN NEDLAGT ADRESSE TAGER SIN RÆKKE MED SIG**
  (`data-post-raekke`): en etiket uden link er et spørgsmål uden
  svar. Footeren er urørt — dér ER linket hele linjen. Set fejle
- **⚠️ OG GENNEMGANGEN FANGEDE MINE EGNE LINKS PÅ 16 PX** —
  nøjagtig footer-fejlen fra tidligere samme dag. Trykfladen er
  lodret padding med negativ margin (rækkens højde vokser ikke),
  IKKE display-skift: inline-block var det, der limede footerens
  links sammen til "Bestil madMenukort"
- To prøver i kontakt-post og én i skal-forside er SCOPET til
  footeren med en note — `a[data-post]` findes to steder nu, og
  `.hours` er to paneler

**Push-beskederne siger hvad og hvornår — og lyver ikke** (31/8).
Kundens ord: notifikationerne skal være *"bedre og pænere, og
forklar hvad det er og hvad tid"*. **Ingen SQL — men
`supabase/funktioner/send-push.ts` skal genudgives** (samme
udrulning som i README under push).

Tre ting var direkte forkerte, og de er prøver nu (kommentarerne
klippes af før målingen — favicon-prøvens egen lære):

- **"har bestilt smørrebrød" stod på HVER bestilling** — også en
  burger og en levering. Nu: bordets kort siger "skal laves nu og
  bæres ud", leveringen råber "skal LEVERES" og lover ingen
  automatik, resten siger "N retter i dag/i morgen kl. X"
- **"Ring og bekræft" på bordønsket** stred mod kundens egen
  regel (booket er booket, sagt fire gange): opkaldet hører til
  Afvis. Teksten siger det nu
- **Frokostordningen fandtes ikke i typelisten** og blev til
  "noget"
- Datoen skrives "i dag"/"i morgen"/"lørdag 5/9" i DANSK tid —
  funktionen kører på UTC i skyen, og "i dag" må ikke skifte ved
  22-tiden. Og der står aldrig "betalt" (køkkenskærmens regel)

**Fortryd kan altid lade sig gøre — og mailen kan ses** (31/8).
Kundens ord: *"gendannelse af bestillinger det skal man kunne,
hvis man klikker forkert; nummer og email skal stå tydelig —
gælder også forespørgselsdelen."* **Ingen SQL** — statusserne er
kun CHECK-værdier, adgangsreglen har ingen retning.

- **↩ Gendan bag "···" på Bestillinger-fanen** for alt færdigt
  (Færdig, Afvist, Udeblevet — også bordenes serveret). Den
  fandtes kun i Overbliks Færdige-fold før; et fejltryk på selve
  fanen kunne ikke fortrydes uden at skifte fane og lede. Gendan
  fører til `bekraeftet`, ikke `ny` — rækken HAR været set
- **↩ Gendan på forespørgselskortet:** et afslag føres til `ny`
  (vi VED ikke, hvor langt sagen var, og "Venter på jer" er
  bunken, hvor intet bliver glemt); et fejltryk på Aftal føres
  til `kontaktet` — dér kom den fra, kæden har kun den ene vej
- **Mailen på bestillingskortet er et LINK** i samme vægt som
  nummeret (📞/✉, klassen `.bestil-tlf`) — den stod som dæmpet
  brødtekst, og en kontaktvej, man ikke kan se, er en, ingen
  bruger. Forespørgselskortet havde begge som links siden 29/8
- Tre falsifikationer, fem fald (Gendan slået fra begge steder,
  maillinket rullet tilbage) — og prøven "en ny har ingen Gendan"
  holder fast i, at knappen ikke breder sig til åbne kort

**Gennemgangen af alle gæstesider er en PRØVE nu** (31/8).
Kundens ord: *"UI's og animation optimizing ... fix hjemmesiden
telefon og kunde mæssigt."* **Ingen SQL.**

`tests/gennemgang.spec.js` åbner HVER udgivet gæsteside på en
telefon og leder efter det, der er svært at se med øjnene, fordi
det kun rammer én side ad gangen: sidelæns rulning, noget der
stikker ud over en forælder der klipper, døde links, manglende
favicon, billeder uden alt, trykflader under 30 px, og **ankre
uden et mål på siden**. **Siderne læses af MAPPEN**, så en ny side
ikke kan slippe forbi.

**Den fandt fem ting, første gang den blev kørt:**

- **⚠️ `m-menukort.html`s "Bestil smørrebrød" pegede på
  `#bestil`, som ikke findes på siden.** Menukortsidens ENESTE
  handling gjorde præcis ingenting — nøjagtig samme fejl som den
  flydende pille på kalenderen. Den peger på
  `h-smorrebrod.html` nu
- **Footerens links var 15-22 px høje** på ti sider
- **Forsidens "…eller ring til os på 28 87 13 43" var 17 px** —
  det mindste trykmål på siden, og det er et telefonnummer
- `bestil/` og `bord/` havde det samme i deres egne footere
- De to sætninger under bordformularen var 16 px

**⚠️ `.sheen` ER IKKE EN FEJL.** Designets glans er bredere end
sin knap med vilje og klippes af den — det er effekten. Uden den
undtagelse råber prøven på ti sider hver gang.

**⚠️ OG SELEKTOREN SKAL RAMME FOOTEREN, IKKE `.foot`.** `.foot`
er noget HELT andet i designet: prisrækken med "199 kr. pr.
person" og knappen "Se og bestil tapas". En regel på `.foot a`
ville have lagt luft i en designknap.

Tre falsifikationer, tre fald (og én skærpet: `display:inline`
ændrer ikke en trykflade, når der er lodret padding — den rigtige
fejl er at fjerne luften).

**⚠️ OG SÅ FANDT ØJNENE TO TING, PRØVEN IKKE KUNNE** (31/8) —
begge på et skud, ingen af dem ved at læse.

**⚠️ DEN FLYDENDE PILLE DÆKKEDE HEROENS ANDEN KNAP HELT.**
**Målt på en iPhone 13 (390×664):** pillen står 24 px over
bunden og er 58 px høj, altså 582-640. Heroens "Selskab &
catering" ligger 579,5-633,5. Et `elementFromPoint` midt i
pillen, med pillen selv slået fra, svarede
*"A.g ghost Selskab & catering"* — altså kunne gæsten **slet
ikke trykke på den knap på det første skærmbillede, hun ser**.
Trykkede hun, hvor den står, blev hun sendt ned i
bestillingsformularen. **Målt på 320 px er det værre:** dér
dækker pillen "Bestil mad", heroens primære knap.

Hver regel er rigtig for sig — pillen skal stå i bunden, og
heroen skal fylde sin skærm. **Det er summen, der er forkert, og
den findes kun ved at måle på flere skærmhøjder.** Nøjagtig
samme slags fejl som pillen oven i heroens manchet 23/8.

- **⚠️ RETTELSEN ER PILLENS EGEN REGEL, IKKE EN NY.** Den folder
  sig allerede væk, når det, den er en genvej TIL, er i syne —
  og heroens "Bestil mad" ER den handling. Vi giver derfor ikke
  heroen 70 px luft i bunden; det ville lave om på designets
  afstande på hver eneste skærmhøjde
- **⚠️ TO IAGTTAGERE MÅ IKKE OVERSKRIVE HINANDEN.** Skrev de
  begge `toggle('tuck', e.isIntersecting)`, ville den, der
  udløste sidst, vinde: heroen ruller ud af syne og folder
  pillen FREM — oven i formularen. De synlige mål holdes i et
  sæt, og pillen er væk, så længe sættet ikke er tomt
- **Målt hele vejen ned:** tucket ved y=0 (heroen), tucket
  y=400-1200 (formularen), og **fremme fra y=1800**. Genvejen er
  ikke fjernet, den er flyttet derhen, hvor den mangler
- **⚠️ KUN `index.html` HAR `.hero-cta`** (målt) — de syv andre
  sider med en pille opfører sig præcis som før

**⚠️ OG FODLINKENE VAR MIN EGEN FEJL, LAVET SAMME AFTEN.**
Trykfladerne blev rettet med `display:inline-block` på
`.fcols a` — men de var **block i forvejen**, én pr. linje. Med
inline-block flød de sammen, og footerens "Havnen"-søjle kom til
at stå **"Bestil madMenukort"** og **"SelskaberCatering"**: to
links læst som ét ord, på **syv sider**. Kontakt-søjlen slap,
fordi dens links er lange nok til at brække alligevel — og
derfor så halvdelen af footeren helt rigtig ud.

**Højdemålingen bestod hele vejen igennem.** Den spurgte om
trykfladen, ikke om linjen. Gennemgangen har reglen nu, og den
er set fejle på syv sider. **En rettelse, der måles på ét tal,
kan gå galt på et andet.**

**⚠️ OG `åbnSkal` PÅSTOD, AT DE NYE SIDER IKKE HAR EN INTRO.**
`index.html` har en — den eneste af de ni (målt). Hjælperen
fjerner den ikke, så introens `<canvas>` ligger hen over hele
forsiden, når en prøve begynder at måle. Det ses ikke i de
fleste prøver, fordi `textContent` og attributter kan læses
gennem et overliggende lag — men alt, der måler det ØJET ser
(`elementFromPoint`, klik, synlighed), rammer lærredet i stedet.
Prøven her sagde *"noget ligger oven på knappen: CANVAS"*, hvilket
var sandt og ikke det, den handlede om. **Måler du visuelt på
forsiden, så kald `springIntroOver(page)` først.**

**Vejledningen ligger i `VEJLEDNING.md`** (31/8, kundens
bestilling): hvem der står i hvilken fane, hvad hver fane gør,
hvordan QR-skiltene printes, og en tabel over "det ser sådan ud →
det er som regel". Skrevet til personalet, ikke til en udvikler.

**Og den kan printes** (`vejledning/`): én selvbærende HTML-fil med
husets egne skrifter lagt ind som base64 — Google Fonts er spærret
af udgangsproxyen, og en PDF skal bære sine skrifter med. Chromium
tegner PDF'en; `lav-pdf.js` og `maal-luft.py` står i mappen.

- **⚠️ SKRIFTSTØRRELSEN ER MÅLT FREM, IKKE VALGT.** `maal-luft.py`
  finder nederste række med blæk på hver side og siger, hvor meget
  tomt papir der bliver. **Tallet er 8,6 pt nu** (målt tredje
  gang 1/9, da Borde-kortet fik bordloftet med): 8,7-8,9 pt løber
  over på en sjette side med 1,4 sides spild, 8,6 holder fem sider
  med 0,5, og mindre sparer ikke mere papir — kun læsbarhed.
  **Hver gang teksten vokser, skal målingen køres igen**; det er
  netop dét, der er sket to gange nu, og begge gange var det
  målingen og ikke øjnene, der fandt den sjette side
- **⚠️ INTET FANEKORT OG INGEN TABEL DELES AF ET SIDESKIFT.**
  Målt: den sidste tabel efterlod ÉN række med gentaget hoved på
  en side for sig selv — en opslagstabel, hvis sidste svar står
  alene på næste ark, er dét, man leder efter og ikke finder
- **⚠️ EMOJIERNE ER ADMINS EGNE.** 🍽️ Borde ser bleg ud på papir,
  fordi Noto tegner den som en hvid tallerken. Det er ikke en
  manglende glyf — det blev efterprøvet mod fontens cmap OG mod et
  browserskud, før noget blev "rettet". Byttede vi tegnet, ville
  vejledningen lyve om skærmen; ordet står lige efter det
- **`noindex`**, som admin: den beskriver personalesiden

**⚠️ ÉN FEJLENDE FANE VÆLTEDE ALLE DE ANDRE — for tredje gang**
(31/8). `Admin.tegnere` er ÉN liste, og alle faner tegner fra
den. Kastede én af dem, blev resten aldrig kørt — og fejlen pegede
et helt tredje sted hen.

- 24/8: kalenderens `tegnMaaned` lod Overblik og Bestillinger stå
  tomme
- 29/8: `udlejning.js`' `insertBefore` tog Forespørgsler og Borde
  med sig ned
- 31/8: en nyhed uden `dato` kastede på `.slice`, og
  **uploadfeltet på Nyheder blev ved med at være skjult**, selv om
  kolonnen var der. Jeg ledte efter en fejl i CSS'en i en halv
  time

Løkken fanger nu hver tegner for sig. **Fejlen skjules ikke** —
den skrives i konsollen — men den fane, der fejler, er den
eneste, der fejler.

**⚠️ OG PRØVEN MÅLTE FØRST INGENTING.** Den åbnede Åbningstider
efter en fejl i nyhederne og bestod med værnet fjernet: `tider.js`
indlæses FØR `nyheder.js`, så den fane var allerede tegnet.
Rækkefølgen i `Admin.tegnere` er script-rækkefølgen i admin.html.
Den måler Indstillinger nu, som står efter.

**Beskæringen kan styres** (31/8). Kundens spørgsmål: *"hvad hvis
billederne de lægger op ikke ser godt ud — hvordan retter den det,
eller skal der stå brug kun 9:16 billeder eller beskær?"*
**Ingen SQL.**

Svaret er, at systemet **altid** beskærer til 16:9, og at det er
den eneste ærlige måde: et kort med en fast form kan ikke tage
imod hvad som helst. Det, der manglede, var at SIGE det — og at
lade ejeren bestemme, hvilken tredjedel af et højt billede der
overlever. Et foto af en tallerken taget oppefra har motivet lavt;
et af en scene har det højt.

- **Toppen · Midten · Bunden** står som en segmenteret gruppe FØR
  filfeltet — beskæringen sker i det sekund, filen vælges
- **Kun høje billeder.** Er billedet for bredt, tages midten; dér
  er motivet næsten altid
- **⚠️ PRØVEN MÅLER PIXELS, IKKE INDSTILLINGEN.** Et billede med
  et rødt, et grønt og et blåt bånd lægges op tre gange, og der
  måles hvilken farve der kom med. Et spørgsmål til knappen om
  dens eget `aria-pressed` ville bestå, også hvis beskæringen
  aldrig flyttede sig

**Et hop landede bag topbjælken — på alle ni designsider**
(31/8). Kundens ord: *"tapas bestillings delen på telefon er
elendigt ift layoutet — det skævt."* **Ingen SQL.**

**Målt på en iPhone 13:** det var ikke layoutet. Designets egen
rullefunktion i `havnegrillen.js` trak en fast konstant på **40
px** fra, når man hopper til et afsnit — og `.topbar` er FAST og
**115 px** høj. Altså lå afsnittets øverste **75 px bag
bjælken**. På tapassiden betød det, at panelets overskrift og
hele den første række (Dag og Tidspunkt) var skjult, i det sekund
man trykkede på knappen, der førte derhen.

Det rammer **hvert eneste anker på de ni nye sider**: "Reservér
plads" på kalenderen, den flydende pille på forsiden, alle
punkter i skuffemenuen. Ét tal, ni sider.

- **⚠️ HØJDEN LÆSES AF BJÆLKEN**, ikke skrevet som et nyt tal —
  ellers skrider de to fra hinanden, den dag bjælken bliver
  højere. `css/style.css` har haft `scroll-margin-top: 96px` for
  de gamle sider siden foråret; designets stilark fik den aldrig
- **⚠️ OG PRØVEN SAMMENLIGNER TO UAFHÆNGIGE ELEMENTER:** panelets
  top mod bjælkens bund. Et spørgsmål til koden om dens egen
  konstant ville bestå, også hvis bjælken var 200 px

**⚠️ OG MÅLINGEN VAR FORKERT DE FØRSTE FEM FORSØG.** Uden et
tapasfad i menuen **skjuler panelet sig med vilje** — og et
`display:none`-element har hverken `offsetTop` eller en kasse, så
alt målte 0, og det så ud som om intet ryllede. Det er
"øvetilstanden er ikke virkeligheden" i en ny forklædning: jeg
målte en tilstand, gæsten ikke er i. Prøven kræver derfor FØRST,
at panelet er synligt.

**Tapassidens sum regner fint** — målt: fire personer × 199 =
**796 kr.** Ser ejeren "Vælg antal personer", er det, fordi
tapasfadet ikke har en pris i admin endnu.

**`bord/` og `bestil/` fik havnens tema** (31/8). Kundens ord:
*"book et bord ved vandet — den side er elendig, den er sort og
hvid, får dårligt layout msæssigt og bare ik god nok."*
**Ingen SQL.**

Han har ret, og grunden er historisk: de to sider er **ældre end
designet fra 23/8**. De kørte videre på `css/style.css`, hvor
heroen er en mørk blækflade uden ét rødt element — mens hver
eneste anden side har det rød/hvide tern. Gæsten går imellem dem
med ét klik.

- **Heroen bærer ternet nu**, tegnet af `::before` så teksten kan
  ligge oven på det. Mønsteret er dæmpet til 30 %: designets egne
  55 % ville trække kontrasten på den hvide overskrift under
  kravet
- **Den valgte dag er RØD, ikke sort.** Det var den eneste flade
  på hjemmesiden, hvor et valg markeres med sort — gæsten, der
  lige har valgt "Spis her" i rødt, skal ikke lære en ny farve
  for at vælge en dag
- **Dagstriben toner ud i højre kant.** Målt: den fjerde dag stod
  halvt uden for som "Man…", og intet sagde, at man kunne swipe.
  ⚠️ Her er sidelæns rulning det RIGTIGE svar (modsat admins
  fanestribe): dagene er en tidslinje, og enhver forstår, at i
  overmorgen ligger til højre for i morgen. Kanten fjernes fra
  700 px, hvor alt er synligt — ellers ser den sidste dag slukket
  ud
- **⚠️ OG DET ER KUN DE TO SIDER.** Selektorerne hænger på
  `.smoer-hoved`/`.mork-top`, som **kun** `bestil/` og `bord/`
  bruger (målt). En ændring af `.hero` ville have ramt ni sider,
  der allerede ser rigtige ud

Tre falsifikationer, tre fald: ternet fjernet, dagen sat sort
igen, og indholdets `z-index` taget væk, så overskriften faldt
bag gitteret.

**Admin på telefonen — knapperne fra 1850'erne** (31/8).
Kundens ord: *"knapperne i admin ligner noget for 1850'erne, det
skal vi også have fixet ... gennemgå det lige på telefonskærm for
at se hvad jeg mener."* **Ingen SQL.**

**Målt på en iPhone 13**, og det var værre end det så ud: det
FØRSTE felt, personalet kunne røre på Åbningstider, lå **391 px
nede på en skærm på 664** — 59 % var hoved og gentagelser.

- **Sidens navn stod to gange.** `.dobbelt-titel` skjulte
  kortets overskrift, men kun fra 900 px og op, fordi reglen blev
  skrevet dengang telefonen ikke havde et hoved. Hovedet kom på
  alle skærme samme aften, og siden da har telefonen sagt
  "Åbningstider" to gange med 200 px imellem
- **⚠️ MEN KUN OVERSKRIFTEN — NOTEN BLIVER, OG DET AFGJORDE
  PRØVERNE.** Første udgave skjulte hele `.kort-hoved`, fordi
  noten står med lille begyndelsesbogstav og fortsætter titlen.
  Så faldt prøven "siden siger, at det ikke er butikkens
  omsætning": Salg-kortets note bærer forbeholdet om, at tallet
  KUN er bestilt gennem hjemmesiden, og at der ikke er nogen
  kasse i systemet. **At rydde op i udseendet ved at skjule en
  advarsel om penge er en dyrere fejl end den, det retter**
- **Fem løse piller i tre rækker blev to segmenterede grupper.**
  "I dag / Alle dage" og "Alle / Lugen / Bordene" er TO
  forskellige filtre, men de så ens ud — man kunne ikke se, at de
  hørte til hvert sit spørgsmål. Grupperne har hver sin etiket
  (Dag · Hvor fra)
- **⚠️ DEN VALGTE ER HVID, IKKE RØD.** Rød betyder "det her er
  handlingen" i hele admin — Gem, Afvis, Slet. Et filter er ikke
  en handling; det er et sted, man står
- **⚠️ `aria-pressed` OG IKKE EN KLASSE.** Stilen hænger på
  attributten, så øjet og en skærmlæser får det samme at vide —
  og en prøve kan måle dét, der styrer udseendet
- **Emojierne røg ud af filtrene** (📅 📚 🥡 🍽️). De brød linjen
  og sagde ikke noget, ordet ikke allerede sagde
- **Fluebenene er husets egne nu**, ikke browserens firkant med
  `accent-color`. Formen er stadig en checkbox og ikke en
  kontakt: en kontakt betyder "det sker NU", et flueben betyder
  "det her er sandt, når du gemmer" — og menukortets Udsolgt
  gemmes ikke automatisk. **Selve `input`'et bliver:** en `<div>`,
  der ligner en checkbox, er ubrugelig for den, der bruger
  tastatur
- **En ugedag fylder to linjer, ikke tre.** De to klokkeslæt stod
  under hinanden, så syv dage var over tre skærme

**⚠️ OG ÉN REGEL SLOG ALDRIG IGENNEM — FUNDET VED AT MÅLE.**
`.kort-hoved:has(> .dobbelt-titel)` vejer 0,2,0; kortets egen
`body.personale .kort-hoved` vejer 0,2,1 og vandt. Klassen sad
korrekt på overskriften hele tiden. Det er husets egen regel:
**mål den BEREGNEDE stil, ikke klassen.**

**⚠️ OG EN AF PRØVERNE MÅLTE OPMÆRKNINGEN, IKKE UDSEENDET.**
"Filtrene er segmenterede grupper" bestod, da `.adm-seg` blev
sat til `display:contents` — altså da gruppen holdt op med at
have en flade, og knapperne igen lå løst. Den måler gruppens EGEN
kasse nu: har den ingen højde, er der ingen gruppe.

Fem falsifikationer, fem fald (og to prøver skærpet undervejs).

**Admin fik et komponentsystem** (26/8). Kundens ord: udseendet
i fanerne "er elendigt, hvor spiis ... er langt kønnere". Målt:
58 blokke forklarende prosa stod som brødtekst i kortene, og
overskrifterne var op til 34 px serif. Nu:

- **`.kort-hoved`**: navnet til venstre (22 px), konsekvensen
  dæmpet til højre (`.kort-note`) — hvad kortet styrer UDE på
  siden, ikke hvad felterne hedder. Alle 24 kort har den
- **Højst ÉN blok løs prosa pr. kort.** Resten er hjaelp-linjer
  ved felterne eller slettet. En prøve tæller
- **Felterne er 44 px høje** med blød runding og sandfarvet fyld
  — til fedtede fingre, scopet til `body.personale`. Gæstens
  formular (spiis-formen, 52 px/14 px) er URØRT, og en prøve
  læser begge sider
- **Rækkens knapper er STILLE, panelets hovedhandling er rød.**
  Menukortets 21+242 røde Gem-knapper var en væg — nu er
  `.admin-raekke`/`.kat-hoved`-knapper hvide med blækkant, og
  rød betyder noget igen. Selektoren er KONTEKSTEN, ikke en ny
  klasse: en ny liste arver reglen af sig selv
- **Footeren er væk, når man arbejder** — den sagde kun "Se
  hjemmesiden", som søjlen og topbjælken allerede gør
- **Menukort står ØVERST i Forretningen-gruppen**: udsolgt
  skifter flere gange om dagen, åbningstiderne to gange om året
- **⚠️ To prosalinjer var direkte FORÆLDEDE og er rettet:**
  "Ring og bekræft — gæsten har fået at vide at vi gør det" på
  Bestillinger (auto_bekraeft har været TIL siden 23/8), og
  menukortets "tom pris = tankestreg" (en vare uden pris kan
  ikke bestilles længere)

Prøverne bor i `tests/admin-design.spec.js` og læser den
BEREGNEDE stil — en klasse, der ikke slår igennem, er ingen
regel.

**En vare uden pris kan ses, men ikke bestilles** (26/8). Den
kunne bestilles før — "??" på listen, og gæsten fik prisen, "når
vi ringer og bekræfter" (23/8). Men opkaldet forsvandt SAMME dag:
`auto_bekraeft` blev slået til, og så var der ingen til at sige
prisen. Bestillingen gik igennem, gæsten anede ikke, hvad den
kostede, og i salgstallene talte varen som **0 kr.** Præcis den
fejl stod fire dage i spiis' produktionsdatabase, før nogen så
den — og hos os står over halvdelen af kortet uden pris.

Reglen er nu fyldets (model A) for hele kortet: kan vi prissætte
det, kan det bestilles — kan vi ikke, kan der ringes. Rækken
VISES uden plusknap med "Ring og hør prisen" som telefonlink
(`.spoerg-chip`), listen hedder `spoergPris` i `Butik.udvalg`, og
dagens ret uden pris følger samme regel. Salg-fanen advarer, når
en periode har linjer uden pris, i stedet for at lægge nul til.

**⚠️ Kør `supabase/pris-vaern.sql` + `proev-pris-vaern.sql`**
(8 × BESTOD lokalt) — efter menukort-filerne. Værnet siger kun
nej til navne, der FINDES på kortet (dagens ret har sin egen
tabel), og rører ALDRIG fyldlisten: fyld uden pris er ønsker.
`er-vi-klar.sql` linje 98 fanger det.

**Tillægget til briefen er gennemgået** (25/8). Det var skrevet
ud fra betaling i appen, så punkt 1, refusionerne og
revisor-spørgsmålet faldt væk med den. **Fem punkter stod
tilbage, og to bliver VÆRRE uden betaling** — en bestilling, der
ikke koster noget at sende, er lettere at lave, ikke sværere.

**⚠️ Kør `supabase/bord-loft.sql` + `proev-bord-loft.sql`**
(15 × BESTOD lokalt) — efter `restaurant.sql`.

**Udsolgt afgøres i DATABASEN nu.** Personalet melder en vare
udsolgt; gæsten, der åbnede kortet fem minutter før, har den
stadig på skærmen og kunne bestille den. `mosede_udsolgt_vaern`
afviser den, og beskeden siger HVILKEN vare — ellers skal hun
gætte, hvad af otte ting hun skal tage af. **⚠️ Værnet siger kun
nej til navne, der FINDES på kortet:** dagens ret bor i sin egen
tabel, og afviste værnet alt, det ikke kunne finde, ville en ret,
ejeren skrev i hånden, blive umulig at bestille. Prøve 5.

**Loftet pr. kvarter** (`bord_loft_pr_kvarter`, sættes på
Køkken-kø): der var kun åben eller lukket, og ved run på var
eneste udvej at lukke HELT. Vinduet er RULLENDE — et fast kvarter
betyder, at otte kl. 12.14 og otte kl. 12.16 er seksten ordrer på
to minutter. **Tomt og nul betyder begge intet loft**, og det
gælder **kun bordene**: mad ud af huset bestilles dagen før.

**Ventetiden kan vokse med køen — men kun med EJERENS tal**
(`bord_ventetid_pr_ordre_min`). Fandt siden selv på "tre minutter
pr. ordre", ville den love noget på køkkenets vegne, som ingen
havde sagt.

**⚠️ Visningen `bord_travlhed` må ALDRIG få en kolonne mere.**
Samme regel som `optagne_dage`: den kører med sin ejers øjne og
springer adgangsreglerne over. Kommer der et navn eller et
telefonnummer med, er køkkenets liste åben for internettet — og
siden ville se helt rigtig ud imens. Prøve 12 tæller kolonnerne.

**Lyden skal slås til med en finger.** Browsere blokerer lyd,
til nogen har rørt skærmen; en iPad, der har stået urørt siden
morgenmaden, siger INGENTING ved dagens første ordre. Knappen ER
tilladelsen, så tonen spilles med det samme. **Og lyden er aldrig
alene** — der er larm i et køkken, så nye kort markerer sig
synligt, og markeringen bliver STÅENDE til kortet trykkes videre.

**⚠️ To fejl i den markering, og de var hinandens modsætning:**
uden en nulstilling ved tom kø blev dagens første ordre
behandlet som en førstegangsindlæsning (ingen markering, intet
pling); MED nulstillingen uden et gard blev hele køen ved login
til "nyt" (tredive kort lyste op). Forskellen er, om listen er
MELDT ind: `Admin.lister.bestillinger` er `undefined`, til den er.

**⚠️ Søjlen er delt i FEM grupper, og en overskrift lukker ikke
sig selv.** Første udgave havde én — "Restaurant" — og så læste
øjet de otte faner bagefter som en del af den: Baglokalet, Salg,
Menukort, Nyheder, Beskeder, Forside, Kontakt og Historik stod
alle sammen under Restaurant. Det kunne ikke ses i koden, kun på
skærmen. Grupperne er **Dagen · Restaurant · Forretningen ·
Hjemmesiden · Log**. **Der må ikke ligge faner efter den sidste
gruppe** — skal der en fane til, hører den til i en af de fem,
ellers skal der en sjette overskrift til. En prøve læser søjlen i
rækkefølge og falder på begge dele.

**Menukort og Salg ligger IKKE under Restaurant**, selv om briefen
bad om det: de dækker hele forretningen, og en kopi ville være to
steder at rette den samme pris. Bordenes andel af omsætningen står
som sit eget felt på Salg-fanen i stedet.

**⚠️ Uden betaling er `?bord=7` en større risiko, ikke en
mindre.** Tillægget skrev, at det ikke er gratis at bestille til
bord 4 fra parkeringspladsen. Nu ER det gratis. Værnene er
personalets: "Kan ikke laves" på hvert kort, loftet pr. kvarter,
og at et bord kan slukkes i admin.

**⚠️ Menuen har ÉN kilde, og det er `menu_varer`.** Briefen
foreslår at starte fra `bord-menu.js`. Det ville lave en ANDEN
kilde ved siden af de 242 varer, ejeren selv administrerer, og to
lister over det samme sortiment skrider fra hinanden. Filens
priser kan bruges som et **spørgeark** til ejeren — aldrig som en
tavs import.

**Fire små fra spiis-gennemgangen — uden én linje SQL** (26/8).
Skærmbillederne af spiis' admin viste fire ting, vores manglede:

- **Skjul er ikke Slet.** Kolonnen `aktiv` har ligget på nyheder
  siden setup.sql — det var KNAPPEN, der manglede, og uden den
  var Slet den eneste vej af siden. "Skjul"/"Vis igen" pr. række;
  mærket siger Skjult (ikke "slukket" — ordet følger knappen)
- **Månedens noter som liste** under kalendernettet
  (`tegnNoter`). Kun rækker, `erNote()` kender — et offentligt
  arrangement må ALDRIG stå i notelisten. Tryk åbner dagen
- **Salg taler i kroner.** Udeblivelser gøres op i det, gæsten
  SKULLE have betalt, og snittet pr. bestilling står som felt —
  kun når der ER solgt noget: et snit af ingenting er en
  division med nul klædt ud som et tal
- **Sikkerhedskopien** på Historik: én JSON-fil af `Admin.data` +
  `Admin.lister` — ingen nye kald, filen er præcis det, skærmen
  viser. Datoen i filnavnet, så to kopier ikke overskriver
  hinanden

**Ugeplanen kunne allerede flere retter samme dag** — spiis-
dokumentets punkt var dækket af `dagens_retter` + `nyRetFelt`.

**Tre ting fra gennemgangen er bevidst IKKE bygget:** billede på
nyheder (kræver en storage-spand og policies, ejeren skal sætte
op — samme slags beslutning som push), tider som undtagelse pr.
dag ud over tidlig lukning (kræver ny kalendertype + omskrivning
af lukkedag-værnet), og offentlig dagsbesked (gæsten må ikke
læse ikke-offentlige kalenderrækker, så en "offentlig note"
kræver et adgangsvalg først — samme slags som live status til
bordet).

**⚠️ ÉN MANGLENDE TABEL VÆLTEDE HELE MENUEN** (26/8) — den
dyreste fejl i projektet indtil nu, og den var helt tavs.

`supabase/dagens-retter.sql` var aldrig kørt i Mosede-projektet.
Tabellen svarede 404. `Butik.hent()` henter otte tabeller med
`Promise.all`, og den ene, der kastede, væltede dem alle — så
gæsten fik **nødmenuen med to varer**, mens der stod 242 i
databasen. Siden så helt normal ud imens: intet tomt felt, ingen
fejl på skærmen, bare et menukort med "Smørrebrød 55,-".

**Der stod endda i koden, at det degraderede pænt** — *"fejler
tabellen, giver hentTabel en tom liste"*. Det gjorde den ikke;
`hentTabel` kaster på alt andet end 200. **En kommentar er ikke
en prøve.**

`dagens_retter` er den ENESTE tabel med en `.catch`: den kom til,
efter siden var i luften, og er valgfri af design. De syv andre
er sidens fundament — svarer `menu_varer` 404, ER nødmenuen det
rigtige svar, og en prøve holder det fast, så ingen "løser" det
ved at pakke alle otte ind i en catch.

**⚠️ Og `er-vi-klar.sql` sagde ALT ER KLAR imens.** Dens
tabelliste kendte hverken `dagens_retter` eller `borde` — en
tjekliste, der ikke kender en tabel, siger god for dens fravær.
Den tæller 17 nu. **Står der en tabel i `hent()`, SKAL den stå i
listen.**

**Og præcis den fejl gentog sig i papirerne** (27/8). Fem SQL-filer
fra 26.–27. august stod hverken i README eller her, og to af dem
stod heller ikke i `er-vi-klar.sql`. Rækkefølgen slutter sådan her
— alle fem SKAL køres i Mosede-projektet:

```
… → pris-vaern.sql → dagsregler.sql → dagsbesked-og-qr.sql
  → menukort-antal-og-dage.sql → nyheder-slags-og-billede.sql
  → kortets-priser.sql → nyheder-fra-til.sql → bord-udeblev.sql
  → foresp-kontakt.sql → borde-55.sql → arrangementer.sql
  → bord-noegle.sql → arrangement-info.sql
  → arrangement-kategori.sql → bestillingsnummer.sql
  → smoerrebroed-forespoergsel.sql → bord-uden-telefon.sql
  → vare-billede.sql → bord-loft-pr-dag.sql
  → kortets-priser-3.sql → smoerrebroed-kortet.sql
  → ejerens-oplysninger.sql
```

- **`dagsregler.sql`** — tabellen `dags_regler`. En dag kan lukkes
  for KUN take-away eller KUN spis her; før var valget hele dagen
  eller ingenting, og på en dag med selskab er begge dele forkerte.
  Tjek 99-101
- **`dagsbesked-og-qr.sql`** — `dags_regler.besked_titel` og
  QR-spærren i `mosede_dag_aaben`. Tjek 106-107
- **`menukort-antal-og-dage.sql`** — `menu_varer.antal_tilbage` og
  `menu_kategorier.dage`. Tjek 102-105
- **`nyheder-slags-og-billede.sql`** — `nyheder.slags`, `detaljer`
  og `billede` plus fire adgangsregler på storage-spanden.
  Tjek 108-110
- **`kortets-priser.sql`** — navnet Mosede Havnecafe og priserne
  fra de fire trykte kort. Den har med vilje INTET tjek: priserne
  rettes i admin bagefter, og et tjek på et tal ville sige ❌ på
  ejerens egen rettelse
- **`bord-udeblev.sql`** + **`proev-bord-udeblev.sql`** —
  `udeblevet` bliver et lovligt ord på bordene. Tjek 111.
  ⚠️ Køres `borde.sql` igen bagefter, snævres listen ind, og
  knappen Udeblev gør ingenting
- **`nyheder-fra-til.sql`** + **`proev-nyheder-fra-til.sql`** —
  `vis_fra`/`vis_til`. Tjek 112-113
- **`foresp-kontakt.sql`** + **`proev-foresp-kontakt.sql`** —
  mail ELLER nummer på en forespørgsel. Tjek 114 (set fejle på en
  lokal Postgres 16 begge veje: uden den nye regel OG med den
  gamle skrevet tilbage). ⚠️ Køres `forespoergsler.sql` igen
  bagefter, kommer det gamle telefonkrav tilbage
- **`arrangementer.sql`** + **`proev-arrangementer.sql`** —
  tilmelding og pladser på kalenderens arrangementer, tabellen
  `reservationer` og visningen `arrangement_pladser`
  (11 × BESTOD lokalt, set fejle med bremsen slået fra og med en
  navnekolonne lagt i visningen). Tjek 115-117
- **`borde-55.sql`** + **`proev-borde-55.sql`** — ejerens 55
  borde, så skiltene kan printes (7 × BESTOD lokalt, set fejle
  med seks borde slettet). Den har med vilje **intet tjek i
  `er-vi-klar.sql`**, af samme grund som `kortets-priser.sql`:
  ejeren må gerne have 56 borde eller kalde dem `T1`, og et tjek
  på tallet 55 ville sige ❌ på hans egen rettelse

**⚠️ DE 55 BORDE SÆTTER KUN NUMMERET.** `pladser` og `zone` er
`null`, og det er ikke en forglemmelse: vi ved ikke, hvor mange
der kan sidde ved hvert bord, og et tal her ville stå på skiltet
OG blive regnet med i dagens billede på Borde-fanen, som om
ejeren havde sagt det. Skiltet skriver hverken pladser eller
ude/inde, når feltet er tomt. Filen kan køres igen: ejerens egne
rettelser overlever (prøve 6), og den **sletter ingenting** —
demo-bordene ryddes af `ryd-demo.sql`, som tager demo-indholdet
under ét. Rapporten siger til, hvis der stadig står nogen.

**⚠️ `dagsbesked-og-qr.sql` PÅSTOD SELV, AT DEN VAR DÆKKET.** Der
stod "er-vi-klar.sql fanger det" i filen ved QR-spærren, og det
gjorde den ikke — i et døgn. Køres `dagsregler.sql` eller
`lukkedag-vaern.sql` igen bagefter, skrives spærren væk, og så
står fluebenet "Tag ikke imod fra bordene" slået fra, mens
databasen tager imod alligevel. **En kommentar er ikke et tjek** —
den er en påstand om, at et tjek findes. Skriver du, at noget
fanges, så åbn `er-vi-klar.sql` og se linjen stå der.

**⚠️ Og `nyheder-slags-og-billede.sql` springer sine fire
adgangsregler over i stilhed**, hvis storage-spanden ikke findes
endnu — med vilje, så filen kan køres på en tom database. Køres
den før spanden er oprettet i dashboardet, står kolonnerne der,
mens ingen kan lægge et foto op. Tjek 110 tæller reglerne; står
der ❌, skal spanden oprettes, og **filen køres igen**.

**Ti fiktive kunder gik siden igennem** (1/9). Kundens ord: *"lav 10
forskellige fiktive kunder og test siden blandt det og opdager og
finder huller — du skal teste og derefter dokumentere, også med
admin."* Rapporten står i **`GENNEMGANG-TI-KUNDER.md`**.

Otte gæster og to på personalesiden, hver som en rigtig browser
med sit eget ærinde. Fire huller, tre rettet:

- **⚠️ HUL 1 ER DATABASENS, IKKE KODENS — og det er live.** Gæsten
  ved bordet må undlade sit telefonnummer (din beslutning 31/8), og
  klienten sender `telefon: null`. Men `bord-uden-telefon.sql` er
  ikke kørt, så kolonnen er stadig `not null`: **hver eneste
  QR-bestilling uden et nummer afvises**, og gæsten har ikke et
  felt at rette. Koden er foran databasen
- **404 PÅ FEM GÆSTESIDER.** `image-slot.js` hentede
  designværktøjets eget sidekatalog ved hver indlæsning — en fil,
  der aldrig kan findes. Prøven læser BROWSERENS svarkoder, ikke
  koden, og er set fejle på fire sider
- **TAPASSIDEN LOVEDE "SENEST DAGEN FØR"**, mens reglen er 48
  timer — tredje gang samme fejl (catering 30/8, smørrebrød 31/8).
  `[data-varsel]` fyldes af reglen nu
- **HEROEN SAGDE "ÅBENT" TO GANGE** ("Åbent nu · Åbent til kl.
  21:00"). ⚠️ **Rettelsen fandtes i forvejen:** `Butik.pilleTekst`
  har kortet detaljen ned siden 28/8, og noten ved den siger
  ordret "nu står den her, så alle tre sider skriver det samme".
  Forsiden fra designet blev bare aldrig den fjerde

**⚠️ OG JEG MÅLTE FORKERT TO GANGE, FØR JEG MÅLTE RIGTIGT.** Begge
står i rapporten, så tallene kan efterprøves: send-knappen ved
bordet er **to trin** (jeg klikkede én gang og skrev "blev ikke
sendt"), og **`offsetParent` er null for `position: fixed`** — så
"Bestil tapas" så skjult ud i en måling og stod tydeligt på
skærmbilledet. **Kig på billedet, før du skriver et hul ned.**

**⚠️ EN PRØVEFIL BESTOD LOKALT OG FALDT HOS KUNDEN — FOR TREDJE
GANG** (1/9). Mikkel kørte `proev-bord-uden-telefon.sql` i
Mosede-projektet og fik **4 af 8 FEJLEDE**. Alle fire havde et
bordnummer i sig.

**Årsagen var stubben, ikke migreringen.** `mosede_bord_findes`
(`bordkort.sql`) afviser enhver bestilling til et bord, der ikke
står som AKTIVT i tabellen `borde` — og prøvefilen oprettede
aldrig bord 7. Den lokale stub havde hverken tabellen eller
værnet, så filen bestod 8 af 8. **De seks andre proev-filer, der
bestiller til et bord, opretter alle deres eget; kun den her
gjorde ikke.**

- **⚠️ OG PRØVE 6 BESTOD AF DEN FORKERTE GRUND.** *"Ved bordet
  afvises '12' stadig"* spurgte kun "blev den afvist?" — og det
  blev den, fordi bordet ikke fandtes. Den spørger nu, om
  afslaget nævner `bestilling_telefon_ok`. Uden bordene falder
  **fem** prøver nu i stedet for fire
- **⚠️ OG DEN SAMME FEJL LÅ I BORDLOFT-PRØVEN**, som Mikkel var
  på vej til at køre: den regnede med, at ejeren har præcis 55
  borde, og med at `(lokation_id, dato)` på `dags_regler` er et
  UNIKT indeks (det er et almindeligt — `on conflict` på det
  svarer *"there is no unique or exclusion constraint matching
  the ON CONFLICT specification"* og vælter hele arket). Tre fejl
  i den fil, alle tre fundet af en strengere stub, ingen af dem
  ved at læse. Den **måler forskellen** nu — opretter sine egne
  tre borde og ser loftet stige med tre — og er kørt igennem med
  **0, 7 og 55 borde**: 21 af 21 alle tre gange
- **⚠️ STUBBEN LIGGER I REPOET NU:
  `vaerktoej/lokal-stub.sql`.** Den bærer produktionens værn
  (`mosede_bord_findes`, `bord_bremse`, det delvise
  dubletindeks, `lokationer`s tre `not null`, `indstillinger`s
  rigtige primærnøgle). En stub, der bygges forfra i hånden hver
  gang, driver fra skyen — og det er nu sket tre gange:
  `dagens_retter` 26/8, `lokationer.adresse` 30/8, og den her
- **⚠️ DEN LIGGER I `vaerktoej/` OG IKKE I `supabase/`, OG DEN
  HAR EN SPÆRRE.** Filen kaster med det samme, hvis den ser
  `auth.users` — altså hvis nogen har åbnet det forkerte vindue
  og kørt den i Supabase. En efterligning i mappen med de
  filer, ejeren kopierer ind i SQL Editor, er et uheld, der
  venter
- **⚠️ SKRIVER DIN PRØVE I EN TABEL, SÅ SLÅ UDLØSERNE OP FØRST:**
  `grep -rn "on public.DIN_TABEL" supabase/*.sql | grep trigger`.
  Står der en, stubben ikke har, beviser prøven ingenting om
  lige den regel

**Emballagen talte som mad** (1/9). Kunden sendte et skærmbillede
af forlæggets Bestillinger-fane: *"bestillings tabben skal se
præcis sådan her ud, når man har kørt en ordre."* **Ingen SQL** —
`linjer` er jsonb.

**⚠️ OG SKÆRMBILLEDET FANDT EN ÆGTE FEJL, IKKE EN SMAGSSAG.**
**Målt på fanen, ikke læst:** en bestilling på fem portioner med
emballagetillæg sagde **"9 retter"**, og køkkenets produktionsliste
bad om at lave **"4 Emballage"**. Fire poser talte som mad. I
forlægget står emballagen som sin EGEN linje uden for maden — og
dét er grunden: **et tillæg er penge, ikke arbejde.**

- **Reglen bor ét sted: `Butik.erEmballage(d, linje)`.** Fire
  skærme spørger den — dagens linje og produktionen på
  Bestillinger, produktionen på Overblik, og "mest solgte" på
  Salg. **Kronerne tæller den stadig med alle steder**; det ER
  omsætning, og `kronerAf` på Salg er urørt
- **⚠️ TO KENDETEGN, OG RÆKKEFØLGEN ER MED VILJE.** Nye
  bestillinger bærer `emballage: true` på linjen; **gamle rækker
  kendes på NAVNET**, for de ligger i databasen uden flaget og
  skal opføre sig rigtigt uden en migrering. Navnet er ejerens
  eget (`emballage_navn`), ellers husets standard — samme greb som
  `Admin.erTapas`, der kender fadet på navnet
- **⚠️ OG DER MATCHES PÅ HELE NAVNET.** Et delvist match ville
  fjerne en ret, der hed "Emballage til fest", fra køkkenets
  liste. Set fejle
- **Chippen står under maden** (`.bestil-emballage`): *"📦
  Emballage: 4 stk. (40 kr.)"* — den forklarer totalen uden at
  lade som om der skal laves fire af noget

**⚠️ OG ↩ GENDAN VAR IKKE TIL AT SE.** Bunken sagde *"tryk … hvis
noget var en fejl"* — de tre prikker var ment som "···"-knappen,
men de læses som en afbrudt sætning, og knappen lå bag en dør.
Reglen fra 31/8 er den samme (ét skridt frem, resten bag "···") —
men **et færdigt kort HAR ikke et skridt frem**, og så stod der
ingen knap. Gendan er den ene handling frem på et færdigt kort nu,
**hvid og ikke grøn** (grøn betyder "det gik godt" i hele admin),
og overskriften siger knappens navn. Døren har stadig Slet bag
sig.

**⚠️ OG EN GRID-CELLE STRÆKKER SIG, HVAD DER END STÅR I
`display`.** Chippen fik `display: inline-flex` og blev **748 px
bred i et kort på 974** — kortet er et grid fra 900 px, og en
grid-celle blokificerer inline-flex. `getComputedStyle` svarede
`flex` og ikke `inline-flex`. Det er `justify-self: start`, der
skal sige det. Husets egen regel igen: **mål den BEREGNEDE stil.**

**Loftet pr. dag: hvor mange af de 55 må bookes** (1/9). Kundens
ord: *"altså er vi ik enige om, det bare er den fane, folk booker
bord? hvis ja, så skal man altså bare kunne booke bord til den og
den dag — og måske som det eneste administrere, hvor mange borde
man kan bestille ud af de 55 på i dag eller dit og dat dag."*

**⚠️ Kør `supabase/bord-loft-pr-dag.sql` +
`proev-bord-loft-pr-dag.sql`** (21 × BESTOD på en lokal
Postgres 16). Tjek 126-128.

Indtil nu kunne ALT bookes. `bord_pladser` var et tal, personalet
skrev selv, og det blev kun VIST — en lørdag kunne tage tres
bookinger til femoghalvtreds borde, og ingen ville opdage det,
før folk stod på molen.

- **Tre lag, det snævreste vinder:** dagens eget loft
  (`dags_regler.bord_loft`) → ejerens almindelige
  (`bord_loft_pr_dag`) → **antallet af AKTIVE borde**. Grundtallet
  er data, ejeren selv styrer; et hårdkodet 55 skulle rettes to
  steder den dag, han nedlægger et bord
- **⚠️ INGEN BORDE OPRETTET = INTET LOFT, IKKE NUL.** `bord/` har
  taget imod bookinger siden fase 4 — længe før tabellen `borde`
  fandtes. Talte grundtallet nul som et loft, ville hver eneste
  booking blive afvist i det sekund, filen blev kørt, og ejeren
  kunne ikke se hvorfor. Ejerens EGNE nul lukker stadig dagen:
  dét er en beslutning. Fundet af syv prøver i `bord.spec.js`,
  ikke ved at læse
- **⚠️ OG `isFinite(null)` ER SANDT** (Number(null) er 0). Uden et
  eksplicit null-tjek ville "intet loft" blive læst som "nul
  borde" — den samme lukning ad bagvejen, denne gang i browseren
- **⚠️ VISNINGEN SKAL HAVE ÉN RÆKKE PR. DAG, OGSÅ DE TOMME.**
  Første udgave grupperede BOOKINGERNE, så en dag fandtes kun,
  hvis nogen allerede havde booket den — og et loft på nul kunne
  aldrig ses på hjemmesiden: dagen manglede i svaret, striben
  tilbød den, og gæsten fik først nej ved afsendelsen. Præcis den
  lukkede lørdag, ejeren bad om. Prøve 17 er set fejle med den
  gamle visning
- **⚠️ `bord_fyldte_dage` MÅ ALDRIG FÅ EN KOLONNE MERE.** Samme
  regel som `optagne_dage` og `arrangement_pladser`: den kører med
  sin EJERS øjne og springer adgangsreglerne over, så gæsten kan
  se *"den dag er fuld"* uden at kunne læse HVEM der har taget
  bordene. Prøve 14 tæller kolonnerne
- **En fuld dag STÅR i striben**, streget over med **FULDT** på
  knappen — en dag, der mangler, ligner en fejl, og gæsten leder
  efter den i stedet for at vælge en anden. Og den valgte dag
  flyttes væk fra en fuld dag, så ingen fylder formularen ud og
  først får nej ved afsendelsen
- **⚠️ LOFTET STÅR I DAGS_REGLER SAMMEN MED LUKKETIDERNE**, og
  `dagsregel()` skriver HELE rækken. Bar Kalender-fanen det ikke
  med, ville et bordloft blive tørret af, i det sekund nogen
  lukkede for take-away på den lørdag — og forsvinde HELT, når
  lukningen blev åbnet igen (så er der "ikke noget særligt"
  tilbage, og rækken slettes). Reglen bor i
  `Butik.skrive.medBordloft`, og nøglen sendes KUN, når rækken
  HAR den: `vis_fra`-arret fra 28/8
- **⚠️ TO REGLER DÆKKEDE HINANDEN, OG PRØVEN MÅLTE INGENTING.**
  Øvetilstandens fletning holdt loftet i live uden linjen i
  `kalender.js`, og omvendt — begge falsifikationer bestod.
  Prøven måler SLETNINGEN nu, som kun den ene kan redde
- **⚠️ OG PRØVERNE PEGEDE PÅ TEKSTEN "7. aug"** — som også rammer
  "17. aug.". Dagene bærer `data-dato` nu, som menukortets rækker
  bærer `data-vare`
- **Dagens billede siger begge tal:** *"2 af 3 borde booket · 24
  af 40 pladser sagt ja til"*. **⚠️ De to LIGNER hinanden og er
  ikke det samme:** pladser er MENNESKER, borde er bookinger mod
  dagens loft. Personalet siger ja på den skærm; sagde den kun
  "pladser", kunne den se rolig ud på en dag, hjemmesiden for
  længst havde lukket
- **⚠️ OG BORDENE LIGGER IKKE I `Admin.data`.** De hentes for sig
  (`Admin.lister.bordliste`), og loftets grundtal ER dem — uden
  dem regner personalets skærm med nul borde. Reglen spørges ét
  sted: `Butik.bordLoft(d, iso)`, den samme som gæsten bruger

**⚠️ SITEMAPPET VAR ET KORT OVER DEN GAMLE HJEMMESIDE** (1/9).
Mikkel sagde ja til at flytte canonical og sitemap til
`mosedehavnecafe.dk`, og dét var den lille del af arbejdet.

**Målt:** seks af sitemappets ti adresser blev VEJVISERE 30/8,
da de to udgaver af siden blev lagt sammen — og **ingen af de ni
nye designsider stod på kortet.** Altså fortalte vi Google, at
hjemmesiden bestod af seks omdirigeringer og fire sider, mens
`h-smorrebrod`, `h-selskaber`, `m-menukort` og resten ikke
fandtes. Det er arret fra 30/8 ("der stod to udgaver af
hjemmesiden i luften") et sted, ingen kiggede — og der har
**aldrig** været en prøve på sitemappet.

- **Siderne har haft den rigtige canonical hele tiden.** Det var
  KUN `sitemap.xml`, `robots.txt` og `domaene` i
  `js/oplysninger.js`, der stod på Pages-adressen
- **En vejviser hører ikke på kortet.** Den sender videre; et
  sitemap skal pege på det, der ER siden. De bliver stående som
  adresser — folk har dem i bogmærker — men ikke i kortet
- **⚠️ FORSIDEN STÅR SOM `/` OG IKKE `/index.html`**, fordi det
  er dens canonical. To adresser for den samme side er dét,
  canonical findes for
- **Fem prøver nu**, og listerne læses af MAPPEN: en ny side kan
  ikke udgives uden at komme på kortet, og en side, der bliver
  til en vejviser, falder

**⚠️ OG DEPLOY.YML SKULLE FØLGE MED.** `udgivelse.spec.js`
sammenligner workflowets tophjørne med sitemappets første
adresse — så den fangede med det samme, at de to nu sagde hver
sit. Toppen siger `mosedehavnecafe.dk` med en note om, at
Pages-adressen er vejen og ikke huset.

**Ejerens egne oplysninger er på siden nu** (1/9). Fra det
håndskrevne svarark (punkt G og H) og Mikkels præciseringer.
**⚠️ Kør `supabase/ejerens-oplysninger.sql`** — den sætter
adressen på forretningen og fem nøgler i `indstillinger`.

- **⚠️ ADRESSEN ER HAVNEVEJ 20L — bogstavet L.** Den har stået
  som **20I** (bogstavet I) siden 23/8 på **tretten** sider, i
  JSON-LD og i `js/oplysninger.js`. Ejeren skrev 20L med hånden,
  og Mikkel bekræftede det ordret: *"alt skal passe, det er
  20l/L."* Dermed er punktet "husnummeret er ikke afgjort", som
  har stået på listen siden foråret, lukket
- **Hovedmailen er `kontakt@mosedehavnecafe.dk`.** Svararket
  skrev *"Bestilling@"* uden domæne, og et gæt på halvdelen af
  en adresse er en mail, ingen får. `selskab1@` og `booking1@`
  er urørte — de er delt efter ÆRINDE, ikke afdeling
- **Tre sociale profiler**, og **⚠️ uden sporingshaler**:
  linkene kom med `?utm_source=chatgpt.com` og
  `?is_from_webapp=1&sender_device=pc` bagpå. Sådan en hale
  hører til i den browser, den blev kopieret fra
- **⚠️ TIKTOK ER EN NY KANAL.** Der var kun felter til Facebook
  og Instagram; uden et felt kan ejeren hverken sætte den eller
  rette den. Feltet står på Kontakt-fanen, og linket følger
  samme lov som de andre: tom adresse → linket ryger AF siden
- **Levering er slået TIL** med ejerens egne tal: 79 kr., Ishøj
  til Køge (og længere efter aftale), alt kan leveres. Den har
  været slået FRA siden 23/8, netop fordi vi ikke vidste hvad,
  hvortil og hvad det kostede

**⚠️ MINDSTEBELØBET ER IKKE ET VÆRN, OG DET ER MED VILJE.**
Ejeren skrev *"200,- kr. ELLERS AFTALES"*. Altså er de 200 ikke
en grænse, der må afvise en bestilling — det er dét, de normalt
siger ja til, og under det tager de en snak. Et hårdt værn ville
afvise en ordre, forretningen gerne ville have haft. Beløbet
står derfor i den tekst, gæsten LÆSER, og ikke i en regel, der
siger nej.

**⚠️ OG PRØVEN FÆLDEDE SIN EGEN DOKUMENTATION.** *"Oplysningsfilen
siger det samme"* faldt på noten ved feltet, som fortæller, at
der STOD 20I indtil 1/9. Kommentarerne klippes af før målingen —
nøjagtig samme fælde som favicon-prøven 29/8. Og
*"de sider, der har en adresse, skriver 20L"* tog først alt efter
ordet "Havnevej" og faldt på `historien.html`, som skriver *"…ude
ad Havnevej. Der er både…"* i brødteksten: reglen er
husnummeret, ikke ordet.

**❓ DOMÆNET ER IKKE FLYTTET MED.** `js/oplysninger.js` peger
stadig canonical og sitemap på `gersel1233.github.io`, mens
siden har svaret 301 til `mosedehavnecafe.dk` siden 31/8. Det er
ikke rettet her, fordi det er en SEO-handling ud af huset på
hver eneste side — den skal Mikkel sige ja til.

**Et ansigt pr. ret** (1/9). Kundens ord: *"prop emojis derinde,
så det ser lidt attraktivt ud at vælge nogle retter i stedet for
det der."* **Ingen SQL.**

Kategorierne har haft et tegn siden 24/8; nu har varerne det
også — på `bestil/`, `ved-bordet/`, forsiden og menukortet.

- **⚠️ REGLEN BOR ÉT STED.** `MosedeEmoji.forVare(v, kategori)`
  ligger ved siden af `forKategori` i `js/menu-emoji.js`. Fire
  skærme spørger den; en kopi ville betyde, at den samme burger
  fik to ansigter på vejen fra kortet til bestillingen
- **⚠️ TEGNET MÅ ALDRIG BLIVE EN DEL AF NAVNET.** Det er sit
  eget element ved siden af `.navn`/`<h4>` — skrevet ind i
  navnet ville varen hedde "🐟Hvide sild", og det er DEN tekst,
  `data-vare`, kurven, bonen og databasens to værn slår op på.
  Samme ar som kategoritegnet fik 29/8. `aria-hidden`, så en
  skærmlæser ikke siger "fisk hvide sild"
- **⚠️ ALDRIG BÅDE FOTO OG TEGN.** Har ejeren lagt et billede
  op, er dét varens ansigt
- **En ret uden et kendt ord arver kategoriens tegn** — 84 af
  ejerens 264 gør det. En liste, hvor hver anden række mangler
  et tegn, ser mere i stykker ud end en, hvor nogle deler
- **⚠️ OG TEGNET MÅ IKKE SIGE NOGET, NAVNET IKKE SIGER.** Samme
  lov som kategorierne: 🌱 fyrer kun på ordene "vegansk" og
  "vegetar". "Hvide sild" er fisk, fordi der står sild

**⚠️ FEM FEJL FALDT UD AF AT KØRE EJERENS 264 VARER GENNEM
GÆTTET — ingen af dem ved at læse regexerne:**

- **"Platte til 1 person" fik ☕**, fordi PLATTE INDEHOLDER
  "LATTE". Begge platter fik en kop kaffe
- **"Rundstykke med pålæg" fik 🥚**, fordi PÅLÆG INDEHOLDER "ÆG"
- **"Hansen fransk vaffel" er en PØLSE** og fik 🧇
- **"Isvand" fik 🍨**, fordi jeg selv havde skrevet ordet ind
  blandt isen
- **"Råkost" ville få 🧀** af et bart `/ost/`

Alle fem har deres egen prøve nu. **Det er hele grunden til at
måle mod rigtige data i stedet for at læse en liste igennem.**

**⚠️ OG SÅ FANDT MÅLINGEN EN FEJL, DER HAR LIGGET DER SIDEN
31/8.** Tegnet stod yderst til HØJRE på telefonen, efter prisen,
selv om det var første barn i DOM'en. Grunden: under 640 px er
`.stk-linje` sat med **navngivne områder**
(`"tekst pris" / "taeller taeller"`), ikke kolonner — og et barn
uden et område bliver auto-placeret i den første ledige celle,
altså efter alt andet. **Kolonnereglen ovenfor gælder slet ikke
dernede.** `.stk-foto` har præcis samme fejl og har haft den,
siden billederne kom; den har bare aldrig kunnet ses, fordi
ingen har lagt et foto op endnu. Begge har deres eget område nu.

**⚠️ OG PRØVEN BESTOD FØRST MED FEJLEN GENINDFØRT.** Jeg
falsificerede ved at fjerne `.stk-tegn { grid-area: tegn }` — og
den bestod, fordi auto-placeringen fylder første celle, og
tegnet er første barn. Det er `grid-template-areas`, der gør
arbejdet. Falsificeret rigtigt (kolonnen fjernet) faldt den med
**336 px mod ≤ 55**.

**HELE MENUEN ER EJERENS NU — syv kort og et svarark** (1/9).
Mikkel afleverede de sidste to menukort (KAFFE, KOLDT & KNAS og
ØL, VIN & BAR) og ejerens håndskrevne svar på de seks sider, vi
sendte 27/8. Dermed er der pris på alt, og kundens ord er
ordren: *"bestillingen online takeaway eller spis her skal passe
med det her, og QR-kode-bestillingen skal også samme priser,
samme menukort præcis."*

**⚠️ Kør `supabase/kortets-priser-3.sql` +
`proev-kortets-priser-3.sql` (21 × BESTOD) og derefter
`supabase/smoerrebroed-kortet.sql` +
`proev-smoerrebroed-kortet.sql` (13 × BESTOD).** Begge er kørt
og falsificeret på en lokal Postgres 16.

**⚠️ DEN DYRESTE OPDAGELSE: `kortets-priser-2.sql` MATCHEDE PÅ
`kategori_id`.** Filen skrev `kategori_id = 31` og
`(13, 'Rejemad …', 85)`. De tal gjaldt produktionens
rækkefølge — bygges de samme filer op i en tom database, er 13
"Sodavand, juice og kakao" og 17 "Sliders", altså to HELT andre
kategorier. **Målt 1/9: to af de tre priser, filen påstod at
rette 30/8, stod stadig på det gamle tal** (rejemaden 75 i
stedet for 85, kaffe med pandekage 85 i stedet for 65). En
opdatering, der rammer nul rækker, fejler ikke — den er bare
tavs. Om produktionens id'er passede, kan ikke ses herfra.
**Loven er derfor: en menufil slår kategorien op på NAVN.**
De to priser rettes nu på navn, og prøve 5b er sat til at fange
det, hvis det sker igen.

- **33 priser sat, 33 varer i tre hele kategorier** (sliders 40,
  pindemad 50, tilkøb morgenmad 10), **10 priser rettet**,
  **12 nye varer** og **8 dubletter slukket** — aldrig slettet,
  så de kan tændes igen i admin
- **⚠️ HVER ENESTE VARE UDEN PRIS HAR EN KENDT GRUND.** Efter de
  to filer står **7** tilbage, og prøve 12 falder, hvis der
  kommer én mere: fem er glutenfri/laktosefri/vegansk (det er et
  **tillæg på 10 kr.**, ikke en pris — trin 3), isbaren
  ("alt efter type og størrelse af event") og morgenbrødet, hvor
  ejerens eget ord er **SPØRG**
- **Ejerens rettelser slår kortene:** tartaren er 99 (ikke 95),
  platten 179 (de 189 på grillkortet er forældede, ejeren 1/9),
  vinflasken 249, cava i glas 69, RTD 40. Belgisk vaffel er ude
  ("har aldrig haft det — vi har bubblewaffle"), tomatmaden ind
  til 55, og brunchtallerkenen ER brunchplatten til 349
- **⚠️ TRE SPØRGSMÅL STÅR I RAPPORTEN I STEDET FOR ET GÆT:**
  "Lun delle eller steg" mod "Hjemmelavet lun frikadelle",
  "Cheesebaconburger" mod kortets "Baconburger", og
  "Juice eller Capri-Sun". Ingen af dem koster penge (samme
  pris), og et gæt ville lave enten en dublet eller en forkert
  vare

**Smørrebrødet er 48 varer nu — 24 slags × to størrelser.**
Kortene SMØRREBRØD og HÅNDMADDER lister det SAMME fyld; prisen
sidder på størrelsen (55 for hel skive, 27 for håndmad). Det er
"1 mad er 1 mad" gjort to gange: ingen størrelsesvælger, ingen
fyldliste. Den gamle `Vælg fyld til smørrebrødet` er slukket, og
rapporten skriver de **fjorten** fyldnavne, der ikke står på et
trykt kort, så ejeren kan tænde dem igen.

**⚠️ DE 24 NAVNE MÅ IKKE VÆRE ENS I DE TO KATEGORIER, og det er
ikke smag.** Både `mosede_pris_vaern` og `mosede_udsolgt_vaern`
slår op på `lower(btrim(navn))` PÅ TVÆRS af kategorier, og begge
afviser kun, når HVER ENESTE række med det navn er væk. To
rækker "Flæskesteg med surt" ville betyde:

- melder køkkenet den HELE skive udsolgt, kan gæsten bestille
  den alligevel — håndmad-rækken holder navnet i live, og der
  kommer ingen fejl nogen steder
- og bonen ville sige *"3 × Flæskesteg med surt"* uden at sige
  hel eller halv. Det er arret fra 31/8 i ny forklædning

Derfor bærer håndmadden suffikset **", håndmad"**. Redundant
under overskriften HÅNDMADDER — og det er netop dét, der gør den
utvetydig på en bon. **Prøve 6 spørger værnets EGEN betingelse**
og læser ikke navnene: den melder den hele skive udsolgt og ser
efter, om værnet så ville afvise navnet.

**⚠️ OG KODEN SKULLE FØLGE MED TO STEDER — begge tavse:**

- `Butik.smoerrebroed` finder sine kategorier med en regex på
  NAVNET, og "Håndmadder" indeholder hverken "smørrebrød" eller
  "fyld". Uden ordet i regexen falder de 24 ud af smørrebrødets
  lister og **helt væk fra `bestil/`**, som kun viser
  smørrebrødets kategorier
- bestillingssidens faste rækkefølge blev bygget af ÉT
  gruppenavn (`stykkeGruppe`). Med to kategorier stod den ene
  ikke i rækkefølgen, og dens varer blev aldrig tegnet — de
  ligger i `liste`, men ingen gruppe henter dem. Den hedder
  `stykkeGrupper` og er en liste nu

**⚠️ OG SORTERINGEN BEGYNDER PÅ 100 FOR HÅNDMADDERNE, MÅLT PÅ ET
SKUD.** Forsidens bestilling grupperer efter VARENS sorteringstal
og ikke efter kategoriens — med 1..24 begge steder afgjorde
tilfældet rækkefølgen, og en iPhone 13 viste HÅNDMADDER øverst
med den hele skive under. På `bestil/` betød det ingenting; dér
kommer rækkefølgen fra kategoriens eget tal. **En regel kan være
rigtig ét sted og forkert et andet, og det findes kun ved at
kigge.**

**Målt bagefter med ejerens rigtige menu i øvetilstand:**
`bestil/` viser to grupper og 52 linjer, `ved-bordet/` hele
kortet med 243 linjer i 19 grupper, forsiden Smørrebrød før
Håndmadder — ingen JS-fejl nogen af stederne.

**⚠️ EN TING TIL EJEREN:** cateringens kategorier (Sliders,
Pindemad, Platter, Tapasfad, Tilkøb ud af huset) har priser nu og
kan derfor åbnes for bestilling — men de har mindsteantal på
10 personer. De skal **ikke** sættes til bestilling ved lugen
eller ved bordet; dér ville en gæst kunne købe én slider til 40.

**Overblik er bygget om efter kundens egen skærm** (1/9).
Kundens ord med to skærmbilleder: *"det her er stadig ik godt
nok og det gælder de fleste tabs, telefon nummer besitlling
emojis skrift alt er ik som spiis og det skal det være"*, og
derefter *"præcis sådan her på telefonen okay ik stor før det
nærmest er identisk men med anderledes farver"* og *"og sådan
her neden under"*. **Ingen SQL.**

**⚠️ FORLÆGGET ER TO SKÆRMBILLEDER, IKKE KODE.** Der er hverken
læst i eller kopieret fra spiis' repo. Formen er billedets,
farverne er havnens — samme fremgangsmåde som personalesidens
skabelon 24/8 og bestillingskortet 31/8.

- **Rækken er et KORT med kant**, og tiden står uden for det som
  aksen: **"kl." over "16.00"**, så en travl dag kan skimmes ned
  ad venstre kant uden at læse kortene. Kanten er rød for lugen,
  blå for en bordbooking og grøn, når maden er ud ad døren
- **⚠️ ÉN VARE PR. LINJE MED ET PUNKT FORAN.** Før stod maden
  som én sætning: *"1 × Flæskestegssandwich · 1 × Bøfsandwich ·
  1 × Cheeseburger"*. Den skal LÆSES for at tælles, og køkkenet
  skimmer. Antallet er sit eget element (`.vagt-antal`) i
  mærkefarven
- **Emballagen har sin egen kasse**, ikke en varelinje — samme
  regel og samme klasse som bestillingskortet fik samme dag. Et
  tillæg er penge, ikke arbejde
- **Telefonen er et LINK på rækken.** Kunden nævnte den først af
  alt: en kontaktvej, man skal læse op af én skærm og taste ind
  i en anden, er en, ingen bruger
- **⚠️ NAVNET FÅR STORE FORBOGSTAVER** (`Admin.pæntNavn`).
  Gæsten skriver "lone hansen" i sin telefon, og personalet råber
  det ud over en kø. Det er ikke pynt — det er dét, der gør
  linjen til et navn
- **⚠️ TIDSAKSEN BYGGES ÉT STED** (`tidsAkse()`). Den færdige
  række skrev sin egen — ren tekst uden "kl." — og **målt på et
  skud** stod "12.00" under et "kl. 17.30" i den samme liste. To
  udgaver af den samme akse, og den ene så ud som en eftertanke

**⚠️ OG `grid-row: 1 / -1` GJORDE RÆKKEN HØJERE END DEN FEJL,
DEN SKULLE RETTE.** Knapkolonnen skal spænde over hele kortet.
Men grid'et har ingen EKSPLICITTE rækker — de skabes af
indholdet — og så peger `-1` på den samme linje som `1`.
Knappen lå altså i **række ét alene** og gjorde den 82 px høj.
**Målt på 1280 px: hele rækken blev 179 px** mod arret fra 30/8
på 166. `1 / span 50` dækker de rækker, der FINDES; de tomme
fylder nul. Prøvens loft er hævet fra 130 til 150 (kortet har
kant og luft nu — 30 px, den flade række ikke havde) og er set
fejle med `1 / -1`: **178,6 px**.

**⚠️ OG SAMME VÆGT I OG UDEN FOR EN @media AFGØRES AF
RÆKKEFØLGEN.** `body.personale .vagt-handling` stod BÅDE inde i
`@media (min-width: 900px)` og under den — begge 0,2,1 — så
telefonens `margin-top: 10px` og `gap: 10px` vandt også på en
iPad. Telefonens blok står før bruddet nu, med en note om
hvorfor. Husets egen regel: **mål den beregnede stil.**

**To ruder under forløbet** (kundens andet billede):

- **🍲 Dagens ret i dag** med rettens navn, prisen og *"2/30
  solgt"*. **⚠️ Loftet REGNES af `antal_tilbage + solgt`** og
  skrives ikke af fra ejerens `antal`: det felt er dagens
  oprindelige tal og følger ikke med, når nogen retter. Og
  **ingen pris er ikke 0 kr.** — der står "Pris følger", husets
  regel siden 26/8
- **📅 Bookinger** med en rød stribe, *"⏳ 1 venter på svar –
  ring og få dem på plads →"*. **⚠️ Striben findes KUN, når der
  er noget.** En fast boks, der som regel siger "alt er fint",
  bliver til udsmykning på en uge — og så ses den heller ikke den
  dag, den siger noget. Samme regel som baglokalets ⚠️-kort 28/8
- **⚠️ BEGGE KORT RETTER INGENTING.** De er ruder ind i en anden
  fane, og knappen fører derhen. Samme regel som kalenderens
  dagspanel fik 24/8: to steder at ændre den samme ting er to
  steder, der kan skride fra hinanden

**⚠️ OG EN KNAP I `.kort-hoved` ER IKKE EN `.kort-note`.**
Forlægget har "Redigér ugeplan →" oppe ved overskriften, og de to
nye kort fik den — men husets regel fra 26/8 siger, at hvert
korthoved bærer sin KONSEKVENS: hvad kortet styrer ude på siden.
`admin-design.spec.js` fældede det. Begge kort har noten nu, og
knappen er `.lille`.

**⚠️ OTTE PRØVER VAR FORÆLDEDE MOD ÆNDRINGER, VI SELV TRAF**, og
de er repointet MED noter, ikke gemt væk: `.vagt-tid` rummer
"kl." nu (de læser `.vagt-tid-tal`), Gendan og "Bestillinger →"
er husets `.knap` bag "···" (de går gennem `aabnMere()`, som
`admin.spec` og `logbog.spec` fik 31/8), og 900 px-prøven måler
mod VARELINJERNE, fordi handlingen ligger inde i kortet nu — to
uafhængige elementer stadig. Fjorten nye prøver, alle fjorten set
fejle.

**1 mad er 1 mad — og admin opdaterer sig selv** (31/8).
Kundens to beskeder samme aften. **Kør
`supabase/smoerrebroed-forespoergsel.sql`,
`supabase/bord-uden-telefon.sql` + `proev-bord-uden-telefon.sql`
(8 × BESTOD lokalt) og `supabase/vare-billede.sql`.**

- **Størrelsesmodellen og ønskefyldet er VÆK.** Kundens ord:
  *"alle smørbrødene sælges som de er, ikke noget med valg af
  brød og derefter pålæg — nej, 1 mad er som 1 mad, og de skal
  allesammen kunne vælges i smørbrød ud af huset, normale
  bestillinger og QR-kode-bestillinger."* `Butik.udvalg` har ÉN
  liste nu; `'skiver'` og `'uden-fyld'` er blevet det samme som
  `'kun-smoer'`. Et stykke uden pris er ikke et ønske — det er en
  vare med "Ring og hør prisen", husets regel for alle andre
  siden 26/8. **Fordi reglen bor ét sted, var ændringen tre
  linjer og ikke tre formularer.** Tre prøver er VENDT med noter
  (ønskefolden, kæden i køkkenet)
- **⚠️ DEN DYRESTE MÅLING: KURVBJÆLKEN LÅ MIDT PÅ SKÆRMEN.**
  Kundens ord: *"den flyder bare lidt midt i det hele og er i
  vejen."* **Målt på en iPhone 13 (390×664) med to varer i
  kurven: 522-588 px nede**, altså hen over den række, gæsten
  lige havde trykket på. Årsagen var
  `bottom: calc(76px + safe-area)` med noten *"over bådstriben
  på 66 px"* — **og bådstriben findes ikke i nogen fil mere.**
  En regel, der er plads til et element, ingen har slettet
  reglen for. Den er i bunden nu, i liquid glass, og
  sikkerhedsafstanden er telefonens egen `env()` og ikke et tal,
  vi har skrevet af
- **⚠️ OG SPECIFICITETEN VANDT OVER MIG.** "Videre" fik en rød
  gradient, som ikke slog igennem: `body:not(.personale)
  button.kurv-videre` (0,2,2) står længere oppe i arket og slog
  min `.kurv-videre` (0,2,1). **Målt på `background-image:
  none`**, mens `color` gik igennem — knappen var hvid tekst på
  ingenting. Husets egen regel: mål den BEREGNEDE stil
- **⚠️ "ÅBEN" ER IKKE "BÆRER".** `js/admin/live.js` sagde
  *"forbindelse åben"*, i det sekund websocketen svarede, og
  læste ALDRIG svaret på sin egen tilmelding. Blev den afvist
  (realtime.sql ikke kørt, token, tjenesten slået fra), stod
  skærmen stille, mens konsollen sagde, alt var godt — og det er
  præcis det, kunden mødte: *"det registreres ikke inde i admin,
  jeg skal refreshe."* `phx_reply` læses nu, `Admin.liveOppe()`
  ved besked, live-mærket bliver gult og siger det, og takten er
  **8 sekunder uden live, 30 med** i stedet for ét minut. Et
  faneskift henter altid
- **Køkken-kø har ÉN knap: ✓ Færdig.** *"ik noget med start
  tilberedning, bare en done eller færdig knap og ik mere end
  det."* Mellemtrinnene ligger bag "···" — køkkenet vil gerne
  kunne markere "den er i gang", så to kokke ikke laver den
  samme ret. **Samme knapper og klasser som bestillingskortet**
  (`.knap.gron`, `.knap-mere`, `.bestil-mere`): to skærme, ét
  sprog. Databasens ord er urørte — salgstallene tæller på dem
- **Overblik siger, hvor rækken kommer fra** (🥡 Online
  bestilling / 📅 Bordbooking) med en farvet stribe i kanten.
  **Mærkatet bærer ordet; farven er kun hjælpen** — en farvet
  kant alene er ubrugelig for den, der ikke ser forskel på dem
- **Telefonen er FRIVILLIG ved bordet.** *"bare navn er ok, fordi
  de sidder der, og admin kan jo se hvilket bord."* Kravet
  forsvinder ikke, det **flytter**: uden et bordnummer er
  opkaldet den eneste vej tilbage, og dér er nummeret stadig
  påkrævet. Databasen håndhæver netop den forskel
  (`bestilling_telefon_ok` hænger på `bord_nummer`), og prøven er
  set fejle begge veje
- **Bekræft-knappen bærer beløbet** ("Send bestilling · 178,-")
  og husets glans. **"I alt" står kun ved mere end én priset
  linje** — ét stykke gav det samme tal to gange under hinanden.
  Og kurvbjælken forsvinder, mens kigget er fremme: to veje
  videre på den samme bestilling er én for meget
- **Hver vare kan få et billede** (`menu_varer.billede`, samme
  storage-spand som nyhederne — en ny spand er fire
  adgangsregler, ejeren skal oprette i hånden). **Flisen på
  rækken ER knappen**, 44 px, og den gemmer med det samme som
  udsolgt-knappen. **⚠️ INGEN PLADSHOLDER:** en vare uden foto
  ser ud som i dag. **⚠️ OG BILLEDET SENDES KUN, NÅR NOGEN HAR
  RØRT DET** — samme lov som `vis_fra` og bordets nøgle
- **⚠️ OG DEN PRØVE MÅLTE FØRST INGENTING.** "Et gem af PRISEN
  rører ikke billedet" bestod med fejlen genindført, fordi
  prisknappen gemmer med `Object.assign({}, v, {pris})` — altså
  MED databasens eget billede. Faren er `byg()` på rækken, og
  prøven går den vej nu
- **⚠️ FIRE PRØVER HOLDT OP MED AT MÅLE, DA SMØRREBRØDSSIDEN
  BLEV EN FORESPØRGSEL.** Leveringsområdet (ejerens egne felter,
  aldrig designets opdigtede "150 kr. inden for 10 km") blev
  skrevet af `js/skal/bestil.js`, som siden ikke længere
  indlæser. Reglen bor i `Butik.leveringsTekst` nu, og begge
  sider spørger den

**Skærmen står stille, til noget ændrer sig** (31/8, samme
runde). Da takten blev sat ned fra ét minut til 8-30 sekunder,
blev en gammel svaghed pludselig dyr: `tegnForloeb` på Overblik
kaldte `Admin.tøm()` og byggede HELE listen op igen ved hver
hentning. Med den nye takt ville skærmen blinke hele dagen, og
det kort, fingeren var på vej ned mod, ville forsvinde under
den. Den bruger `Admin.tegnRaekker` nu — samme rettelse som
Bestillinger-fanen fik 31/8 — og **nye sager lyser op**
(`.linje-ny`), som i køkken-køen. **Prøven sætter et mærke
UDEFRA på DOM-knuden** og ser efter, om den overlever en
hentning; et spørgsmål til koden om dens egen `tegnRaekker`
ville bestå, også hvis listen blev revet ned.

**⚠️ OG "✓ GEMT" SKREV DEN GAMLE TEKST TILBAGE.** `svarStraks`
gemte knappens ord ved klikket og satte dem tilbage 1,4 sekund
senere — men `faerdig()` kører EFTER `genindlæs()`, altså efter
at fanens tegnere har skiftet ordene. **Målt af en prøve:**
ejeren trykker "Ingen dagens ret i dag", knappen skal hedde
"Fortryd" bagefter — og den sagde "Ingen dagens ret i dag" igen.
Den tekst, der skal tilbage, er den, optegningen har skrevet;
står der stadig "Gemmer…", er den gamle den rigtige.

**⚠️ SEKS PRØVER FALDT PÅ `.fine`** (31/8). Designet har ikke
tegnet et fejlfelt, så forespørgselsmotoren låner den lille linje
under knappen. Da tilbud-kortet kom ind i panelet, var der TO
`.fine`, og prøverne røg på *"strict mode violation: resolved to
2 elements"*. Koden mærker nu sit eget element med
`data-fejllinje`, og prøverne peger på DET — i stedet for at både
kode og prøve gætter på en klasse, designet bruger til flere
ting.

**Hele personalesiden er gået igennem — som en PRØVE** (31/8).
Kundens ord: *"alle tabs alle faner gå dem personligt igennem,
ikke stop før."* Det gjorde jeg — men et menneskes øjne ser én
fane ad gangen, og der er seksten.
`tests/admin-gennemgang.spec.js` åbner HVER fane på en telefon
og leder efter en JS-fejl, sidelæns rulning, noget der stikker ud
over en klippende forælder, og trykflader under 30 px.
**Fanelisten læses af opmærkningen**, så en ny fane ikke kan
slippe forbi — samme regel som gæstesidens gennemgang.

**⚠️ OG DEN MÅLER MED ARBEJDE PÅ FANERNE.** Første udgave kørte
på grunddata: en tom fane har ingen kort, ingen knapper og intet
at stikke ud over noget — den ville bestå på ingenting. Med
bestillinger, et bord, en booking og en forespørgsel fandt den
**to ting med det samme:** et link på 16 px midt i en
hjælpelinje på Baglokalet, og notefoldens `📝 Skriv en note` på
**28 px** — dét, personalet trykker på hver gang de skriver på en
bestilling.

**⚠️ TRE PRØVER SAGDE HVER SIT OM UDSOLGT** (31/8). *"Udsolgt
vises, ikke skjules"* (`spiis-laere`) mod *"en udsolgt vare står
IKKE på listen ved bordet"* (`bord-loft`) og *"en udsolgt vare
kan ikke bestilles fra bordet"* (`ved-bordet`), som begge krævede,
at rækken forsvandt helt.

De to sidste bestod på et **hul** i `js/bestilling.js`: et gard
skjulte den udsolgte, hvis dens læsegruppe ikke havde noget
bestilbart. Gardet var overflødigt — `s.udsolgt` kommer fra
`Butik.udvalg` og er allerede filtreret til sidens eget udvalg —
og det blev synligt, da ønskefyldet forsvandt. Nu måler alle tre
det samme: rækken **står** i listen, gennemstreget, **uden
plusknap**. *"Kan ikke bestilles" er ikke det samme som "er
væk".*

**Fanens ikon er kransen nu — det blev glemt TO gange** (29/8).
Kundens ord: *"hvorfor er logoet ikke opdateret på siden som jeg
bad dig om 2 gange."* Kransen kom på alle sider (nedenfor), men
`favicon.svg` blev stående som det GAMLE mærke — båden i
marineblå — og **de ni nye sider havde slet ingen favicon**:
forsiden viste browserens blanke ark, mens de gamle sider viste
båden. **Ingen SQL.**

- `favicon.svg` er kransens eget mærke nu (isen og de to bægre) i
  logoets røde `#d62a3a` — tykkere streger end kransens, for 4,6
  px i et 300-net er en kvart pixel på en browserfane
- **Alle sider har linket** — også admin (søjlen har ankeret, men
  browserfanen er forretningens), `ved-bordet/` og printsiden
- **PWA-ikonerne** (`ikoner/ikon-192/512.png`) er tegnet om fra
  den nye favicon — de var også båden, og de er det, der står på
  telefonens hjemmeskærm, når admin lægges som app
- ⚠️ To prøver: hver udgivet side har linket (listen læses af
  MAPPEN), og filen indeholder logoets røde og INGEN af bådens
  farver. Prøven fældede først sin egen dokumentation: kommentaren
  i SVG'en nævnte de gamle hex-koder

**Mærket står på alle sider nu** (29/8). Kundens ord: *"vi
aldrig fik logo tingen live med det nye logo der alle steder."*
**Ingen SQL.**

**Målt:** den ovale krans lå på de NI sider fra designbundtet,
mens de otte ældre — `bestil/`, `menu.html`, `bord/`,
`selskaber/`, `nyheder/`, `arrangementer/`, `baglokale/`,
`catering/`, `smoerrebroed-ud-af-huset/` — stod med "MOSEDE
HAVNECAFE" som ren tekst. To mærker på det samme hus, og gæsten
går mellem dem i ét klik. Skiltet på bordet bærer det også nu.

**⚠️ FARVEN ER LOGOETS, IKKE SIDENS.** Kransen bruger
`var(--red)` på de nye sider, men i `css/style.css` er `--red`
**#d1462f** og ikke designets **#d62a3a** — så ringteksten ville
få én rød og stregerne en anden i det SAMME mærke. Et logo
skifter ikke farve med et tema; tallet står fast i
`.crest .ct`.

**Admin beholder ankeret.** Kransen er hvid indeni og tegnet til
et foto eller en lys bjælke; på personalesidens mørke søjle ville
den være en hvid klat. Mærket dér er navnet plus ⚓ og siger
"personale", hvilket er hele pointen.

**Mærket er den RUNDE krans fra intro-animationen nu — overalt**
(29/8). Kundens ord: logoet *"skal skiftes til dette som afspiles
i before landing animations videoen"*. Ovalen med undertitlen
"OG ISHUS · MOSEDE HAVN" er væk fra alle 19 steder — topbjælker,
hero-badge, de otte ældre sider og printsidens skilte. Den runde
(300-net, blå inderring `#2a5f8f` og bølge) er en 1:1-kopi af
introens egen SVG i `index.html`; kun textPath-id'et er sidens
eget, så to skilte aldrig deler defs. **Ingen SQL.**

- **⚠️ Bredderne er sat efter HØJDEN, ikke bredden.** Den runde er
  kvadratisk, hvor ovalen var 200×140. Beholdes bredden, vokser
  mærket 43 % i højden — og topbjælken med, og menukortets
  hop-bånd klæber på topbjælkens MÅLTE højde. Alle bredder er
  derfor gammel bredde × 0,7. **Målt efter: topbjælken på
  `m-menukort.html` er stadig 109 px, når den fryser til**
- `.crest .ct` er 18,5 px/.19em i alle tre stilark (introens egne
  tal), og `.crest .cs` findes ikke længere — den runde har ingen
  undertitel
- Favicon og PWA-ikonerne var allerede tegnet fra den runde
  (afsnittet ovenfor) og er ikke rørt. Admin beholder ankeret
- En prøve i `tests/kontakt-post.spec.js` læser MAPPEN: hver
  krans skal være den runde, ovalen og undertitlen må aldrig
  komme igen, og der skal være mindst 19. Set fejle

**ÉT HUS, ÉN SKRIFT, ÉN RØD** (29/8). Kundens bøn: gå hele
hjemmesiden igennem, hold den op mod spiis.dk's overskuelighed og
ret layout, skrift og tegn — uden at røre indholdet eller
mulighederne. Målt på skærmbilleder af alle 19 gæstesider: kløften
var ikke i de enkelte sider, men MELLEM dem. De ni gamle sider +
`ved-bordet/` stod i Bebas-versaler og den GAMLE orange-røde
`#d1462f`, mens designsiderne står i Instrument Serif og logoets
`#d62a3a` — og gæsten går mellem de to verdener i ét klik.
**Ingen SQL.**

- **`--display` i `css/style.css` er Instrument Serif nu.** HTML'en
  stod hele tiden i blandede bogstaver — Bebas TEGNEDE dem bare
  som versaler, så intet indhold er rørt. Linjehøjden fulgte med
  (.88 → 1.04): Bebas' .88 klipper en serifs over- og
  underlængder — det er admin-afsnittets egen lære. Skriftfilen
  lå allerede lokalt i `fonts/`. `.logo`-sperringen faldt fra
  .15em (Bebas' tal) til .04em
- **Hele den røde familie skiftede til logoets:** `--red #d62a3a`,
  `--red-tekst #b6202f`, `--red-dyb #9e1b28` — begge tekst-røde
  MØRKERE end før, så hvert kontrasttal steg (målt: 4,94 hvid på
  knap; 5,16/5,73 lille tekst; 5,98 på den lyserøde flade).
  Knappernes gradienter står i samme familie med designets mørke
  stop `#c11f2f` i bunden
- **Bebas' @font-face BLIVER:** admins vagtskærm (`.vagt-tid`)
  bruger den stadig
- **De fire kort på `bestil/` ("Så tager vi den i telefonen") har
  tegnfliser nu** — forsidens egen 44 px-flise (`.row-card .ic`),
  samme streg-ikoner, så gæsten genkender ærindet fra side til
  side. Det var det eneste sted i bestillingsflowet uden et tegn
  at scanne efter
- **OG DET BLÅ RØG HELT UD, samme dag.** Kundens ord, da han så
  skærmbillederne: *"ved ikke lige hvor du har de blå ting fra —
  hele hjemmesiden har det ternede og rød/hvide tema."* Målt på
  den UDGIVNE side: `--sea` var stadig marineblå `#0f2c44` i
  `css/style.css`, og ti undersider stod med blå heroer, footere
  og theme-color. Hele den blå familie er byttet til designets
  varme: `--sea #241a17` (admins egen blæk), `--sea2/--sea3` i
  samme familie, sand/sand2 er designets creme `#fdf7ef/#f7ede1`,
  `--muted` er admins varme `#6f5b55`, og alle `rgba(15,44,68,…)`
  (skygger, hårstreger) blev `rgba(36,26,23,…)`. Kontrasten er
  regnet efter på de nye grunde: 5,50–17,0, alt over kravet.
  Printsidens skilte og QR-kodernes mørke fulgte med
  (`js/qr.js`-standarden er `#241a17` nu), og ti siders
  `theme-color` skiftede fra marineblå til creme. **Kransens blå
  ring (`#2a5f8f`) er logoets og bliver** — et logo skifter ikke
  farve med et tema. Admins SEMANTISKE statusfarver (grøn/blå på
  mærkerne) er heller ikke rørt
- **En prøve vogter BEGGE familier:** den gamle orange-røde
  (`#d1462f`, `#bb3a25`, `#a8321f`, `rgba(209,70,47,…)`) OG
  marineblå (`#0f2c44`, `#1a4763`, `#2c6180`, `#4e6985`,
  `#526e8b`, `rgba(15,44,68,…)`) må aldrig komme tilbage i den
  VIRKSOMME CSS — kommentarer klippes af før målingen, for
  favicon-prøven har allerede én gang fældet sin egen
  dokumentation. Set fejle
- **⚠️ spiis.dk kan ikke nås fra det her miljø** — udgangsproxyen
  afviser domænet (både browser og WebFetch). Gennemgangen er
  målt mod spiis-principperne, som allerede står i README/CLAUDE
  fra kundens egne skærmbilleder. Skal der kigges live, skal
  domænet åbnes i miljøets netværkspolitik på claude.ai/code
- **Efterset på skærmbilleder bagefter:** alle ti gamle sider på
  telefonbredde og fire på 1440 — serif-clampene (op til 104 px)
  holder, admin er urørt (egne overrides), og topbjælkens højde
  skred ikke

**Stemningsgalleriet i selskabsafsnittet** (29/8). Kundens egen
bestilling med seks fotos fra havnen og spiis som forlæg: *"prop
dem her hvor de sådan flasher stille og roligt imellem hinanden
nede ved lad os holde jeres næste selskab."* Tre fliser i
`.gal`-skelettet (det store billedes format sætter højden — læren
fra hullet på 212 px), og hver flise blænder ROLIGT mellem sine to
fotos, forskudt i tid, så de skifter hver for sig. **Ingen SQL.**

- **⚠️ ADMIN FØRST, SÅ EJERENS EGNE FRA REPOET.** Kundens fotos
  kunne ikke følge med chatten som filer, så han lagde SYV op via
  GitHub ("de er lagt ind nu", commit `506e191` direkte på
  udgivelsesgrenen) — komprimeret fra 2-3 MB PNG til ~100-200 kB
  JPEG ad admins egen kanal (canvas), omdøbt til
  `billeder/stemning-*.jpg`. Ansigterne på jule- og musikfotoene
  var sløret af kunden selv før upload
- **⚠️ ÉN PULJE, IKKE PAR** (kundens andet ønske samme aften:
  *"smoothly skifter billed ... forskellige"*). Alle syv ligger i
  én pulje (`data-filer` på galleriet), og fliserne skiftes til
  at blænde over til puljens næste — én ad gangen hvert ~4,6
  sekund, aldrig det samme foto to steder på skærmen, og det
  gamle foto står, til det nye er HENTET og oppe (ingen huller).
  Skiftet er en CSS-overgang styret af `.vis`, ikke keyframes;
  reduced motion slår både overgang og rotation fra.
  **Admin-fotos (`foto_stemning_1`–`6`) lægger sig FORREST i
  puljen** og ruller med — ét nyt foto tømmer ikke galleriet.
  Uden noget som helst findes galleriet ikke (`style.display`,
  som `.music`). **⚠️ Alt-teksterne bor i `forside.js` SAMMEN med
  rotationen:** teksten skal følge FOTOET, ikke flisen, når
  fotoene vandrer
- **⚠️ Fartprøven er skrevet om MED reglen i behold:** intet
  foto hentes FØR gæsten ruller, og efter fuldt rul må der komme
  præcis galleriets seks — `loading="lazy"` er stadig det ene
  ord, alt hænger på. Set fejle med `eager`
- **⚠️ KUN DET FORRESTE BILLEDE ANIMERER** (`.stem-a`). To
  modsatrettede animationer kunne lande med begge på nul og vise
  fladen bagved som et glimt. En flise med kun ét foto får slet
  ingen animation (klassen `.to` sættes af koblingen): et billede,
  der blænder over i sig selv, ser ud som et blink.
  `prefers-reduced-motion` slukker det hele — forreste står
- **Fartprøven består uændret:** admin-fotos er lagerets adresser,
  ikke `/billeder/`, og prøvernes egne fotos er data-URI'er.
  Grunddata har ingen nøgler → galleriet findes ikke i de andre
  prøver
- Tre prøver i `tests/skal-forside.spec.js` (blænder/står
  stille/findes ikke), set fejle med `.to`-tildelingen fjernet

**Dagens ret har sin egen fane i admin** (29/8). Kundens ord med
spiis' admin som forlæg: dagens ret skal være *"en sektion helt
for sig selv, som hænger sammen med retterne"*. Ugeplanen og
hurtigfeltet boede nederst på Forside-fanen, hvor ingen ledte
efter dem — retten skrives hver morgen og hører til i
**Dagen-gruppen** (🍲, efter Kalender). **Ingen SQL** — motoren
(`dagens_retter`, nedtælling, udsolgt-ved-nul) fandtes; det var
DØREN, der manglede.

- Koden er flyttet 1:1 til `js/admin/dagensret.js` (én fane, én
  fil); Forside-fanen beholder kuglerne og billederne, og
  `forside.js`' filhoved siger, hvor resten blev af
- **⚠️ INTET "I dag"-mærke ved siden af datoen:** `Admin.pænDato`
  sætter selv "I DAG ·" på dagens dato for hele admin. Første
  udgave lagde et mærke til, og der stod "I DAG · Lørdag … I dag"
  — målt på et skud, ikke læst
- **Gæstesiden var allerede koblet** — menukortets uge og
  forsidens afsnit læser `dagens_retter` dag for dag, så fanen
  behøvede ingen ny kobling. Skriv torsdagens ret, og den står på
  torsdag hos gæsten
- Prøverne fulgte med (`p-forside` → `p-dagensret` i admin.spec og
  dagens-retter.spec), og en ny prøve holder fanen og "I DAG" på
  ugens første dag — set fejle med mærket taget ud

**Havnens tapas er et kort øverst på Menukort-fanen** (29/8).
Spiis' menukort-fane var forlægget: *"a la sådan her, også med
tapas ... mere opdelt i fast sortiment."* Sortimentskortet hedder
**Fast sortiment** nu, og tapaskortet står over det med pris pr.
person, cavaens pris, "Det får I — én linje pr. punkt" og fadets
varsel (som slet ikke kunne sættes i admin før). **Ingen SQL.**

- **⚠️ KORTET ER EN RUDE, IKKE ET LAGER.** Fadet og cavaen ER
  varer i `menu_varer` (kendingen er NAVNET, samme regexer som
  `js/skal/tapas.js`), og listen er fadets beskrivelse gemt
  "·"-adskilt, som ejerens liste skrev den. Prøven beviser det
  ved at læse VAREN i det gemte — ikke en ny nøgle. To steder at
  rette den samme pris ville skride fra hinanden
- **Cava-feltet findes kun, når varen findes**, og uden fadet på
  kortet står vejen til `menukort-ud-af-huset.sql` — samme regler
  som tapassiden selv
- **Optegningen rører ikke kortet, mens der skrives i det**
  (activeElement-gardet) — tegnere kører efter hvert gem, og
  autogem gemmer 1,2 sekund efter sidste tastetryk. Samme fælde
  som køreplanens notefelt
- **Gæstens "Det får I"-liste er ejerens nu:** tapassiden læser
  fadets beskrivelse og kloner designets eget hjerte-span pr.
  punkt; uden beskrivelse står designets liste. **⚠️ Fælden,
  fundet ved at MÅLE:** tapas-filens `find()` søger i
  BESTILLINGSPANELET som standard, og listen står OVER panelet —
  med standard-roden fandtes den aldrig, og siden så helt rigtig
  ud imens (jeg havde endda givet prøvedataene designets egne
  tal, 199/150, så sumboksen "bekræftede" en kobling, der aldrig
  kørte). `find('.getlist', document)` er rettelsen
- Fem nye prøver (menukort-admin + skal-tapas), alle set fejle

**Ledighedskalenderen på selskabs- og baglokalesiden** (29/8).
Kundens ord: *"en kalender som admin styrer men kunderne kan se
ift hvis der allerede er booket eller reserveret den dag."*
Motoren fandtes (visningen `optagne_dage` + databasens værn) —
gæsten opdagede det bare først, når hun valgte en optaget dato og
fik nej ved afsendelsen. Nu står et månedsnet over datofeltet på
`h-baglokale` og `h-selskaber`. **Ingen SQL.**

- **En optaget dag STÅR i nettet, streget** — en dag, der
  mangler, ligner en fejl i kalenderen, ikke et lokale, der er
  lejet ud. Klik på en ledig sætter datofeltet (via et rigtigt
  change-event, så datospærrens lyttere ser det); klik på en
  optaget gør ingenting, og databasens værn dømmer stadig ved
  afsendelsen
- **Admin styrer den derved, at kun AFTALT + LÅST optager** (eller
  en bekræftet udlejning) — reglen fra fase 2/trin 3 er urørt: en
  ny forespørgsel spærrer ingenting, ellers kunne én person med
  et telefonnummer lukke hele efteråret
- **På selskabssiden skjuler nettet sig ved "ud af huset"** —
  dér optages ingen dage (`side.optagerDagen`), og en kalender,
  hvor alt er ledigt, ville bare fylde. Designets segmenter
  flytter ikke `.on`, så der lyttes på klikket og tegnes efter
- Højst 18 måneder frem, aldrig bagud — længere ude er svaret
  alligevel et telefonopkald. To prøver, set fejle med
  `kalStart()`-kaldet fjernet

**Selskabsforespørgslen blev klogere — og hænger sammen med
kalenderen** (29/8). Kundens liste, punkt for punkt. **Ingen SQL.**

**På gæstesiden (`h-selskaber`):**

- **Anledning og mad er FRITEKST**, ikke chips: *"man skal kunne
  skrive i stedet for at have valgmuligheder"* og *"det aftaler I
  i fremtiden"*. Seks knapper kunne ikke rumme "min mors 80-års,
  men som frokost", og en gæst, der ikke så sin anledning,
  trykkede "Andet" — som ikke fortæller personalet noget
- **⚠️ FIRE DAGES VARSEL** (`varselDage` på siden): *"de kan ikke
  nå det på 1-3 dage"*. Både datofeltets `min` OG
  ledighedskalenderen respekterer det, og beskeden siger, hvad
  man gør i stedet (ring). De andre forespørgsler har intet
  varsel — et spørgsmål om catering til november er ikke for
  tidligt
- **Stedvalget er klogere:** hos jer → *hvor på havnen* (ved I
  ikke endnu / baglokalet / cafeen / dækket) og *skal dækket
  med*. Havnen er ikke ét rum. **Felterne findes KUN ved "hos
  jer"** — spørger vi om lokalevalg til en fest ud af huset,
  giver vi et løfte om at holde den for dem
- **Navn, telefon OG mail er påkrævede** og tjekkes. Mailen er
  et løfte, ikke et felt: siden siger, vi vender tilbage **inden
  for et døgn**, og en gæst, der ikke tager telefonen, skal kunne
  nås på skrift

**På personalesiden (Forespørgsler-fanen):**

- **⚠️ FANEN ER SKRUET EFTER SPIIS' BOOKINGER** (kundens andet
  bud samme aften: *"layoutet og udseendet er grimt og
  uoverskueligt — lad det ligne resten"*). Tællere øverst
  (⏳ venter på jer · ✅ på plads · 🎉 i dag; **kun den med et tal
  råber**), to bunker med hver sit spørgsmål — **Venter på jer**
  (ældste øverst) og **På plads** — og kort på tre linjer i
  stedet for en halv skærm. Kontakten er ÉN linje med ikoner:
  📅 dato · navn · 👥 antal · 📞 nummer · ✉ mail, som man læser
  den højt i en telefon. **Etiketten "Kontakt" var med i en
  time og røg ud igen:** rigtigt tænkt, men den gjorde kortet en
  linje højere, hvilket var netop klagen
- **⚠️ Overskrifterne er egne RÆKKER** i `Admin.tegnRaekker` med
  egne nøgler — bygges de som en beholder om kortene, tegnes hele
  bunken om, hver gang ét kort ændrer sig, og en note, nogen er i
  gang med at skrive, ryger under fingeren
- **Trin 2 hedder "📞 Jeg har kontaktet dem", trin 3
  "✓ Aftal & sæt tid"** (grøn, som i forlægget). Ordet
  "kontaktet" dækker begge veje — prøven fra 26/8 ("svaret og
  ikke ringet") er opdateret, for kunden har nu sagt begge dele
- **⚠️ TRIN-STRIBEN ER VÆK** (kundens tredje bud: *"de to grønne
  og ene røde ting inde i kortet er ass ... det er stadig ikke
  nemt at se det hele"*). De tre piller sagde det samme som
  statusmærket og knappen nedenunder — **tre gange den samme
  oplysning i tre former**, og øjet skulle læse dem alle for at
  finde ud af, hvad der manglede. Det, striben KUNNE, som intet
  andet kan — minde om kalenderen — er ikke fjernet: det er den
  røde advarsel med felterne. `trinStribe`/`trinFor`/`TRIN3` er
  slettet som død kode
- **Kortet har en OVERSKRIFT i stedet**: gæstens egen anledning
  plus antallet ("Barnedåb · 65 pers."), som forlægget gør det —
  den ene linje, man skimmer en liste på. Anledningen står derfor
  ikke i detaljerne igen
- **⚠️ Ventetiden står KUN, når den er et problem** (fra 1 dag,
  rød fra 3). Et kort, der altid siger "har ventet 0 dage", er
  støj — og så ses tallet heller ikke den dag, det er 25
- **Detaljerne er ÉN linje**, ikke en tabelrække pr. felt: fem
  rækker skubbede besked og knapper under folden. Reglen fra 23/8
  står ved magt — hver detalje har stadig sit NAVN foran, så de
  ikke ligger begravet i gæstens beskedtekst — men formen fulgte
  ordren. Den tomme note er foldet væk som på bestillingskortene
- **Knapperne står til HØJRE fra 900 px** (grid), som i
  forlægget: sagen læses fra venstre, og handlingen ligger, hvor
  øjet ender. På en telefon falder de under igen — to kolonner
  ville give en 90 px knapsøjle med ordene brækket over fire
  linjer
- **⚠️ ÉN ÅBNING PR. PRØVE.** `hjaelp.js`' `sætDataEngang` skriver
  kun i localStorage, HVIS den er tom. Åbner en prøve fanen to
  gange med forskellige data, ser den de FØRSTE data begge gange
  — og måler noget andet, end den tror. Kostede en runde her
- **⚠️ AFTALEN SKRIVES I KALENDEREN FRA KORTET.** Kundens ord:
  *"efter trykket af det komme i deres kalender og vælge hvilken
  dag og skrive note ... så det ligesom hænger sammen."* Før
  førte påmindelsen kun HEN til Kalender-fanen, og personalet
  skulle skrive dag, titel og note af fra skærmen bag sig. Nu
  står felterne i selve advarslen: dagen er forespørgslens (men
  kan rettes — aftalen kan lande på en anden dato), titlen er
  foreslået, og noten er det, gæsten HAR oplyst
- **⚠️ RÆKKEN ER ALDRIG OFFENTLIG.** Et selskab er som regel en
  privat fest; en kalenderrække, der lander på hjemmesiden, fordi
  nogen trykkede "aftalt", ville sætte fru Hansens 80-års
  fødselsdag på internettet. Prøven vogter netop den linje
- **⚠️ `Admin.gem` genindlæser OG fanger fejl selv** — et `.catch`
  efter den kører aldrig, og knappen ville blive låst for evigt
  den dag skrivningen fejler
- **⚠️ "sted" og "daekket" stod som RÅ NØGLER på kortet**, i det
  øjeblik de blev sendt — fundet på et skærmbillede, ikke ved at
  læse. Samme fejl som frokostens "dage"/"indhold" 24/8:
  `DETALJE_NAVNE` skal have de nøgler, vi selv sender
- **⚠️ INGEN "ÅBN KALENDEREN"-KNAP** (*"nej, i admin ikke noget
  med åben kalenderen"*). En knap, der fører VÆK til en anden
  fane, er et arbejde, der skal huskes. Prøven fra 26/8 er
  **vendt**: den vogter nu, at genvejen ikke kommer tilbage, og
  at felterne står i stedet
- **⚠️ TO FEJL, DER VÆLTEDE ANDRE FANER — begge fundet ved at
  MÅLE, ingen af dem ved at læse:**
  1. `udlejning.js` byggede sin "næste skridt"-linje med
     `kort.querySelector('.knap-raekke')`, som leder i HELE
     undertræet. Da kalenderfelterne fik deres egen `.knap-raekke`
     inde i advarslen, fandt den DEN først, og `insertBefore`
     kastede. Og fordi alle tegnere kører i den SAMME løkke, tog
     fejlen **Forespørgsler og Borde med sig ned** — to faner stod
     tomme med en fejl, der pegede et helt tredje sted hen.
     `:scope > .knap-raekke` er rettelsen
  2. `borde.js`' fejlbehandler ryddede `$('borde-liste')` — **det
     element har aldrig eksisteret** (fanen har `borde-venter`).
     Fejlbehandleren kastede altså SELV, præcis når den skulle
     vise en fejl, så personalet så en tom fane uden en linje om
     hvorfor
- Ti nye prøver på tværs af de to sider, to af dem set fejle
  (varslet sat til 0, og rækken gjort offentlig); tre gamle
  prøver er opdateret eller vendt, hver med en note om hvorfor

**⚠️ BORDBOOKING KUNNE IKKE FINDES** (29/8). Kundens spørgsmål:
*"hvorhenne booker jeg bord?"* — og han havde ret i at spørge:
**målt på alle ni designsider var der ikke ét eneste link til
`bord/`.** Siden har været i luften siden fase 4 og virker; men
menukortsidens "Book spisning"-knap forsvandt, da siden blev
skrevet om 24/8, og ingen af de nye sider havde en indgang.
Kun de GAMLE siders topmenu førte derhen. **Ingen SQL.**

- **Rækken står ØVERST i "Hvad skal vi hjælpe med?"** — at sikre
  sig en plads er det mest hverdagsagtige af de syv ærinder;
  resten planlægger man. Samme form og tegnflise som de andre
- **"Book et bord" i skuffemenuen på alle ni sider**, lige før
  smørrebrødet, så madbestilling og bordbooking står side om side
- **⚠️ CLAUDE.md PÅSTOD, AT KNAPPEN VAR DER** i fem dage. Det er
  den samme slags fejl som "er-vi-klar.sql fanger det": en note
  om noget, ingen efterprøvede. Linjen er rettet, og en prøve
  tæller nu indgangene på hver udgivet side — så en side uden en
  vej til bordbooking falder, og listen læses af MAPPEN
- **⚠️ De to ting er IKKE det samme, og det er med vilje:**
  bordbooking er en PLADS (`bord/`, to timers varsel, sidste tid
  en halv time før luk), "spis her" i madbestillingen er MADEN
  (hentes ved lugen, anrettet til at spise på stedet). Koblede vi
  dem, ville hver is-med-guf spærre et bord, der står frit to
  minutter efter — og dagens billede på Borde-fanen ville lyve.
  QR-koden er den tredje vej: den er for dem, der ALLEREDE
  sidder ved bordet

**⚠️ DEN SAMME GÆST TO STEDER** (29/8). Kundens spørgsmål: Lone
bestiller to burgere til kl. 14 på hjemmesiden — den står i
Bestillinger, personalet ser den. Så kommer hun ned, får et bord,
scanner QR-koden og bestiller dér. Nu ligger hun BÅDE i
Bestillinger og i Køkken-køen. *"Hvad gør man der, og er det
personalet eller systemet?"* **Ingen SQL.**

**Svaret er begge dele, og systemet har den lette halvdel.**
Systemet kan ikke VIDE, om de to er den samme mad bestilt to
gange (hun var i tvivl, om den første gik igennem) eller to
runder (frokost nu, is bagefter). At slå dem sammen ville slette
en rigtig bestilling; at afvise den anden ville spærre for et
bord, der bare vil have mere. **Så systemet peger, og mennesket
dømmer** — samme beslutning som "2 vil have lørdag den 12." på
Baglokalet.

`Admin.sammeGaest` finder andre ÅBNE bestillinger fra det samme
nummer den samme dag, og begge skærme siger det: lugekortet
skriver *"Samme nummer har også bestilt fra bord 7"*, og
køkkenkortet *"Samme nummer har også en bestilling ved lugen kl.
14.00"*.

**⚠️ NUMMERET SAMMENLIGNES PÅ CIFRENE.** "+45 20 30 40 50" og
"20304050" er den samme telefon, og en sammenligning på teksten
ville aldrig finde noget. De sidste otte cifre er nøglen.

**⚠️ OG KUN DET ÅBNE TÆLLER.** En serveret eller afhentet
bestilling er ikke en dublet — den er mad, gæsten har fået. Stod
advarslen der, ville hvert eneste gengangerbord få den, og så
læses den ikke den dag, den betyder noget.

**Bestillingskortet er blevet tydeligere** (29/8). Kundens ord:
*"det er utydeligt hvad for noget mad der er bestilt hvor mange
hvornår."* **Ingen SQL.**

- **Antallet er tallet, man ser først** (19 px, egen kolonne).
  Det stod i samme størrelse som varenavnet, og prisen i den
  modsatte kant — på en bred skærm er der 500 px imellem, så øjet
  skal rejse for hver linje
- **Prisen er dæmpet.** Køkkenet skal lave maden, ikke regne
- **"I ALT" står til sidst**, fordi det er DEN, der siges ved
  lugen — men kun når der er mere end én linje med pris, ellers
  ville totalen være den samme tekst to gange under hinanden
- **Den tomme note er foldet væk.** På en travl fredag er det ti
  kort, og ti åbne notefelter med den samme grå pladsholder
  fylder lige så meget som ti gange navn, tid og mad tilsammen

**⚠️ EN BORDBESTILLING GÅR ALDRIG GENNEM EN MAIL** (28/8).
Kundens ord: *"bordbestilling skal foregå igennem systemet og
admin og ikke igennem mail."*

Han har ret, og det er den SAMME fejl, telefonbookingen på
Borde-fanen blev bygget for at lukke (24/8): en booking, der
kommer i en indbakke, står ikke i tabellen. Den tæller ikke med i
dagens billede, den optager ingen pladser, og den findes ikke på
skærmen, når familien møder op. Så står halvdelen af dagen i
systemet og halvdelen i en mail, ingen har åbnet.

- **`bord/` har ingen mailadresse** — hverken ved formularen
  eller på kvitteringen. Telefonen er vejen: dér kan personalet
  rette det i admin, mens gæsten er i røret, og bordet er frit i
  samme sekund
- **Det gælder også ÆNDRINGER.** En aflysning i en indbakke er et
  bord, der står reserveret hele aftenen, fordi ingen nåede at
  åbne mailen. Skal ændringer kunne klares uden et opkald, er
  svaret en vej ind i SYSTEMET — ikke en postkasse
- **Etiketten i footeren hedder "Om din booking"**, ikke
  "Bordbestilling". En etiket, der lover det modsatte, giver
  bookinger, ingen ser. Adressen er til spørgsmål om en booking,
  gæsten allerede HAR

**En mail-knap ved siden af telefonen** (28/8). Kundens ord:
*"sådan knap, også rammer man mailen instantly og den
korrekte."* **Ingen SQL.**

Adressen i footeren virkede, men den er en linje i en bund. Den,
der står og skal spørge om et selskab, skal have en KNAP ved
siden af "Ring til os". Alle fire forespørgselssider har nu den
samme række — `h-catering` og `h-frokost` fik den, `h-selskaber`
og `h-baglokale` havde den i forvejen — og `bord/` har en linje
til bookingadressen.

**⚠️ KNAPPEN VED BORDET SKRIVER TIL BOOKINGEN, IKKE TIL
SELSKABERNE.** En gæst, der spørger om sit bord hos den, der
sidder med tilbud, får svar af den forkerte. Det er `data-post`,
der afgør det — den samme attribut, footeren bruger, så en rettet
adresse i admin slår igennem på begge steder uden en linje mere
kode.

**Emnet står på knappen** (`data-emne`): fire sider skriver til
den SAMME postkasse, og personalet skal kunne se, hvad mailen
handler om, uden at åbne den.

**⚠️ OG EMNET MÅ IKKE LÆGGES OVEN I ET ANDET.** `postadresse()`
på forespørgselssiderne læser adressen af knappen — som nu HAR et
`?subject=` — og satte sit eget på med referencen. Resultatet var
`mailto:…?subject=Selskab…?subject=Forespørgsel FO…`, og
mailprogrammet fik den anden halvdel af adressen som emne.
Adressen skæres nu ved `?`. Prøven fældede det.

**⚠️ SKILTENES ADRESSE KAN SÆTTES** (28/8). Kundens spørgsmål:
*"men url'en skal jo så fungere korrekt og QR-koderne til den
tid."* **Ingen SQL.**

Koderne har hele tiden peget på `location.origin` — den adresse,
printsiden er åbnet fra — så et domæneskifte ikke kræver en
kodeændring. Men **et mærkat kan ikke laves om, når det sidder på
bordet**, og den dag forretningen får sit eget domæne, skal 55
skilte kunne printes med DET uden at nogen redigerer en fil.

Feltet står øverst på `print/bordkort.html`, og hele arket tegnes
om, når adressen ændres. `https://` og skråstregen sættes selv —
uden dem bliver adressen til `…dkved-bordet/`, og koden peger
ingen steder hen.

**⚠️ Der advares, når de to ikke er den samme.** Et skilt, der
peger et sted hen, siden ikke selv ligger, virker først den dag
domænet er sat op — og opdager man det, når 55 mærkater sidder på
bordene, skal de printes og klistres om alle sammen. Beskeden
siger: *"Print dem ikke, før du har prøvet en af koderne med en
telefon."*

**Feltet printes IKKE med.** Det er styringen, ikke skiltet — en
halv side af det første ark ville gå til en indstilling.

**55 borde oprettes på én gang** (28/8). Ejeren oplyste, at der
er **55 borde**, hver med sin QR-kode. Ét ad gangen var 55 gange
navn + pladser + ude/inde + zone + Tilføj — og den, der taster
nummer 40, taster forkert. **En tastefejl her er en QR-kode, der
peger på et bord, der ikke findes**, og gæsten møder "bordet
kendes ikke", mens hun sidder ved det. **Ingen SQL.**

Folden på Borde-fanen tager fra-nummer, til-nummer og en frivillig
forstavelse (`T` → T1, T2, T3 — hedder de sådan ude på molen, skal
systemet også sige det, ellers går maden det forkerte sted hen).

- **De, der findes i forvejen, springes over**, og linjen siger
  det, FØR man trykker. En serie, der stoppede på det første
  sammenstød, ville efterlade halvdelen oprettet uden at sige
  hvilke — og så skal nogen tælle sig frem gennem 55 rækker.
  Serien kan derfor køres igen efter en udvidelse
- **Ét bord ad gangen, i rækkefølge.** 55 skrivninger på én gang
  ville ramme databasens bremse, og halvdelen ville blive afvist,
  uden at nogen kunne se hvilke
- **Højst 200 ad gangen.** 900 borde er ikke en cafe — det er en
  tastefejl, og den tager fanen ned, mens nogen kigger

**⚠️ RESTEN AF ØNSKET VAR ALLEREDE BYGGET.** `ved-bordet/?bord=42`
viser BORD 42 øverst, kører telefon-først med søgefelt og chips
(`data-visning="kort"` — åbne afsnit i stedet for folde, fordi
gæsten skal finde ÉN vare blandt 242), har allergifeltet med sin
egen røde boks, "Andet"-feltet til *"uden remoulade"*, og siger
selv, at der ikke er betalt noget. Køkken-kø viser hvad, hvornår,
hvilket bord og allergien. **Det eneste, der mangler, er billeder
af maden — se listen over det, ejeren skal bekræfte.**

**⚠️ NYHEDER KUNNE IKKE LÆGGES OP I PRODUKTIONEN** (28/8), og
det var to fejl i én. Skærmen sagde:

```
Kunne ikke gemme (400). {"code":"PGRST204", … "message":
"Could not find the 'vis_fra' column of 'nyheder' in the
schema cache"}
```

1. **`supabase/nyheder-fra-til.sql` var ikke kørt.**
2. **Og koden sendte kolonnen med alligevel.** `vis_fra` og
   `vis_til` stod som FASTE linjer i `Butik.skrive.nyhed` — lige
   over de tre felter (`slags`, `detaljer`, `billede`), der gør
   det rigtigt med `!== undefined`, og lige under en note, der
   advarede ordret mod præcis den fejl. **En note ved siden af er
   ikke et værn.**

Begge dele er rettet. `maaVindue()` i `js/admin/nyheder.js` læser
— som `maaAntal()` på Menukort — hvad DATABASEN har svaret, og
datofelterne findes kun, når kolonnen gør.

**⚠️ UDEN RÆKKER SKJULES FELTERNE, modsat `maaSlags()`.** De to
valg fejler hver sin vej, og den ene er dyrere: viser vi
felterne, og kolonnen mangler, kan der slet ikke oprettes en
nyhed, og det kræver en SQL-fil at komme videre. Skjuler vi dem,
og kolonnen ER der, bliver den første nyhed oprettet uden datoer
— altså "altid", som er den rigtige standard — og felterne dukker
op af sig selv, så snart der er én række at læse nøglen af.
**Den anden fejl retter sig selv. Den første gør ikke.**

**Fejlen siger nu, hvad man gør ved den.** `Admin.forklarFejl`
oversætter PostgREST' "Could not find the 'X' column of 'Y'" til
**"Kør supabase/…​.sql i Supabase"** ud fra en tabel over,
hvilken fil der lægger hvilken kolonne ind. Den **gætter ikke et
filnavn**: kender vi ikke kolonnen, siger vi tabellen og lader
den rå besked stå — et opfundet filnavn sender nogen ud at lede
efter en fil, der ikke findes. Samme greb som
`bestilling_status_ok` i `koekken.js`, nu ét sted for alle faner.

**⚠️ Og `er-vi-klar.sql` sagde ALT ER KLAR imens — igen.**
`nyheder-fra-til.sql` har stået i papirerne siden 24/8, men ikke
i tjeklisten. **En tjekliste, der ikke kender en kolonne, siger
god for dens fravær** — nøjagtig samme fejl som `dagens_retter`
26/8, og den gentog sig. Tjek **112 og 113** er tilføjet, prøvet
på en lokal Postgres 16, og set fejle: droppes de to kolonner,
skriver begge ❌ med filnavnet.

**To rigtige e-mailadresser — og en opdigtet er væk** (28/8).
Mikkel oplyste `selskab1@mosedehavnecafe.dk` og
`booking1@mosedehavnecafe.dk`. **Ingen SQL.**

**⚠️ Der stod `hej@mosedehavnegrill.dk` i bunden af NI sider.**
Den var designets pladsholder, den er på et forkert domæne
(-grill, ikke -cafe), og en gæst, der skrev til den, nåede ingen.
**Ret den aldrig tilbage.** Samme regel som telefonen og
adressen. En prøve læser mappen og falder på hver side, der har
den.

**⚠️ Og de to sociale links pegede på `#`.** Gæsten trykker,
siden hopper til toppen, og hun tror, det er hende, der gør noget
forkert. Reglen stod i `js/oplysninger.js` hele tiden — "tomme
felter vises ikke" — men footeren fra designet fulgte den ikke.
De er væk, til ejeren giver rigtige adresser.

**Adresserne er delt efter ÆRINDE, ikke efter afdeling.** En
gæst, der skriver om sin bordbestilling til selskabsadressen, får
svar af den, der sidder med tilbud — og omvendt. Derfor står de
med hver sin etiket ("Selskaber & catering" / "Bordbestilling")
og ikke som to rå adresser.

**⚠️ Adressen står i HTML'en, ikke i JavaScript.**
`js/skal/kontakt.js` bytter den kun ud, hvis personalet har
skrevet noget andet i admin → Kontakt
(`kontakt_email_selskab`, `kontakt_email_booking`). Samme regel
som baglokalets vilkår: skrev vi hele linjen i kode, skulle de
rigtige adresser stå to steder, og den ene ville blive glemt.
`h-kalender.html` henter slet ikke data — dér står HTML'ens
adresse alene, og det er netop derfor den skal stå der.

**⚠️ TOM ER IKKE DET SAMME SOM ALDRIG SAT.** Er nøglen ikke i
databasen, står HTML'ens adresse. Er den sat til **tomt**, HAR
nogen nedlagt adressen, og linket ryger helt af siden — et mailto
til en nedlagt adresse er præcis den blindgyde, `#`-linkene var.
Prøven er set fejle: skrives gardet om til `if (!vaerdi) return`,
falder den.

**Kvitteringerne har en vej tilbage, der ikke er et opkald.**
Forespørgslen peger på selskabsadressen med referencen i emnet
(så personalet ved, hvilken sag mailen hører til), og
bordbestillingen på bookingadressen. Halvdelen af dem, der
spørger, sidder på et arbejde, hvor de ikke kan ringe.

**⚠️ Forespørgselssiden læser adressen af LINKET i footeren**,
ikke af indstillingen. Adressen står ét sted, og `kontakt.js` har
allerede byttet den. To opslag ville være to steder, der kunne
komme til at sige hver sit.

**Menukortet er blevet til et overblik** (28/8). Kundens ord:
fanen skal være "mere overskuelig" og kunne *"passe med antal,
melde udsolgt, få antal tilbage."* **Ingen SQL** — kolonnerne kom
med `menukort-antal-og-dage.sql`.

Fanen kunne det hele i forvejen, men den kunne kun SIGE én ting:
hvor mange priser der manglede. Til daglig er spørgsmålet et
andet — hvad er udsolgt, hvad er ved at slippe op, og hvor er den
pølse henne.

- **Fem tal øverst**, og hvert af dem er en KNAP: Alle · Udsolgt ·
  Få tilbage · Mangler pris · Skjult. Et tryk filtrerer, så tallet
  også er vejen hen til arbejdet
- **Et søgefelt.** Det vigtigste redskab på et kort med 242 varer;
  der søges i både navn og beskrivelse, for ejeren husker ikke
  altid, hvad varen hedder, men han husker, hvad der er i den
- **Kategorierne folder sig**, når kortet er langt. **Målt:** 242
  varer i 21 kategorier er ~280 rækker felter. Grænsen er 30
  varer — under den fylder hele kortet to skærme, og en fold er
  bare et tryk mere. Et filter eller en søgning åbner dem selv
- **Folden er ÉN linje:** navn + "14 varer · 2 udsolgt · 4 uden
  pris". **⚠️ Første udgave foldede kun VARERNE væk** og lod
  navnefelt, afdeling, dage, pile, Gem og et tomt notefelt stå —
  målt: 21 lukkede kategorier fyldte stadig fire skærme
- **Antalsfeltet farves** ved få tilbage og fyldes rødt ved nul.
  Et tal i et felt ligner enhver anden værdi, og med 242 rækker
  ruller man forbi det
- **"Sæt alle til salg igen"** står KUN, når man kigger på de
  udsolgte. Tolv udsolgte varer om morgenen er ellers tolv tryk
  plus tolv gange at finde rækken

**⚠️ FÅ TILBAGE ER IKKE NUL TILBAGE.** En vare, der er talt ned
til nul, ER udsolgt — databasen sætter selv fluebenet — og hører
under Udsolgt. Stod den begge steder, ville de to tal tilsammen
være større end antallet af varer, og så holder man op med at
stole på dem.

**⚠️ Og masseknappen rører ALDRIG dem, der er talt ned til nul.**
Satte vi bare fluebenet fra, kunne gæsten lægge varen i kurven —
og bremsen ville afvise hele bestillingen ved afsendelsen. Hun
ville ikke ane hvorfor. De skal have et nyt antal, og linjen
siger det.

**⚠️ Grænsen for "få" er GÆSTESIDENS.** `js/skal/menukort.js`
skriver "Kun N tilbage" fra og med fem. To udgaver af "hvornår er
det ved at slippe op" ville betyde, at hjemmesiden advarede
gæsten, mens admin sagde, alt var fint.

**⚠️ "Få tilbage"-feltet findes ikke, før kolonnen gør.** Samme
regel som før: `maaAntal()` læser det, DATABASEN har svaret, og
et felt uden en kolonne bag sig er værre end intet felt.

**⚠️ `#pris-filter` beholder sit id og sin plads.** Den var vejen
igennem 242 varer på en eftermiddag, og selv om "Mangler pris" nu
også er et af de fem tal, går begge gennem `saetFilter` — så de
ikke kan komme til at være uenige om, hvad der er slået til.

**⚠️ Prøvernes `åbnMenufanen` venter på `#menu-status`**, ikke på
`.kat-hoved`: et stort kort har ingen kategorihoveder, før nogen
åbner en fold.

**Køkkenskærmen er skruet efter forlægget** (28/8). Kundens ord:
bordbestillinger *"er jo en hel anden ting end online
bestillinger og skal være bl.a. den køkkenet står og kigger på og
skal være dygtig og intelligent."* **Ingen SQL.**

- **Hovedet tikker**: "QR-bestillinger fra bordene · 12.40 · 4
  bestillinger skal ud", og "LUKKET for bordene", når kontakten
  er slået fra. Uret tegner fanen om hvert minut i forvejen
- **⚠️-kortet "Gå ud og sig noget"** findes kun, når der er
  noget, og linjerne har **ingen knapper med vilje**: systemet
  kan ikke tale med bordet. Der er ingen skærm hos gæsten, ingen
  besked og ingen betaling — det eneste, der virker, er et
  menneske, der går derud
- **Zonestriben** (Alle zoner · Molen · Terrassen) vises kun ved
  **to eller flere** zoner i køen. "Alle zoner" ved siden af én
  knap, der hedder "Terrassen", er to knapper, der gør det samme
- **Runde 2** står på kortet, når bordet har bestilt før i dag.
  Den tæller de **serverede** med — ellers ville runde 2 hedde
  runde 1, i det sekund den første var båret ud — men **ikke de
  afviste**: den mad er aldrig lavet
- **Uret er en pille**, og den bliver rød med hvid skrift. Ét
  tryk, én stor knap i fuld bredde: skærmen bruges med en fedtet
  finger, mens den anden hånd holder en tallerken

**⚠️ EJERENS VENTETID SLÅR BRIEFENS KVARTER.** "Forventet
ventetid" er dét, gæsten får at se, når hun scanner. Er den sat
til 10, HAR vi lovet 10, og så er 12 minutter for længe. Er den
ikke sat, er der ikke lovet noget — og så skriver skærmen heller
ikke "den burde tage N", som om nogen havde sagt det.
`FOR_LAENGE_MIN = 15` er kun reserven.

**⚠️ DER MÅ ALDRIG KOMME TIL AT STÅ "BETALT".** Forlægget skrev
*"bestilt 12.12 · betalt 280,-"* under hvert kort. Der er ingen
betaling i systemet (Mikkel 25/8: *"de gør det via kassen ved at
tage tingene ind manuelt"*), og en tallerken, der bæres ud til et
bord, som personalet TROR har betalt, er penge ud ad døren. Der
står **"280 kr. · betales ved lugen"**, og en prøve slår ned på
ordet *betalt*.

**⚠️ Alarmen siger det ÉN gang.** Målt på en travl frokost med
ventetiden sat til ti minutter: tre borde over grænsen gav tre
næsten ens linjer, der fyldte hele kortet. Det værste bord står
med sit tal; resten er et antal — hvilke borde det er, står på
kortene nedenunder, som i forvejen er sorteret ældste først.

**Bordstriben er en genvej nu, ikke en gentagelse.** Den sagde
det samme som kortet lige nedenunder ("Bord 1 · 1 ordre · 28 min"
over et kort, der hedder Bord 1 og siger 28 min). Felterne er
knapper: et tryk ruller ned til bordets ældste åbne kort og
markerer det halvandet sekund.

**⚠️ Fanens tal tæller HELE køen, ikke det filtrerede.** Et
zonefilter, der også skruede ned for tallet i søjlen, ville
skjule tre borde på molen for den, der kigger på terrassen — og
så holder man op med at stole på tallet.

**⚠️ Et urtegn, ikke et emoji.** Pillen bliver rød med hvid
skrift, og et farvet emoji på rød bund er en klat. Første udgave
affarvede det med et CSS-filter, og **målt på et skud** blev 🕐
til en hvid cirkel uden visere. Tegningen arver `currentColor` nu.

**Og et ødelagt `</details>` er rettet** på den samme fane: taggen
stod inde i `<div class="lyd-raekke">`, så browseren lukkede
begge dele og lod knappen falde ud af folden. Det så tilfældigvis
rigtigt ud.

**Baglokalet er et forløb nu, ikke tre lister** (28/8). Kunden
sendte fire skærmbilleder af en færdig udlejningsside: *"det er
godt begrundet af det holder styr på det hele … hele fanen skal
være dygtig og intelligent og gerne bedre end hvad du ser på de
billeder."* **Ingen SQL.**

Fanen havde tre kasser — Venter på svar, I hus, Færdige — og det
er tre steder at kigge for et lokale, der lejes ud nogle gange om
måneden. Den, der har travlt, kigger i den øverste. Nu er den fem
kort med hvert sit spørgsmål: **hvad går galt af sig selv**
(⚠️-kortet), **hvor langt er sagerne** (forløbet), **har vi
lokalet den 12.** (nettet), **hvad skal jeg lave nu** (ÉN liste,
hastet først) og **hvad koster det** (vilkårene).

**⚠️ ET "AFTALT" JA ER IKKE ET LÅST JA — fanens vigtigste nye
oplysning, og den var usynlig før.** Databasens indeks
`udlejning_dagen_er_taget` tæller kun UDLEJNINGER. En
forespørgsel sat til `aftalt` ser ud som et ja på skærmen, men så
længe der ikke står en udlejning bag den, kan en gæst på
hjemmesiden stadig tage dagen — og ingen ville opdage det, før
nummer to ringede. Derfor har hver sag et felt `laast`, derfor
har trin 3 sit eget røde tal, derfor står dagen **stiplet** i
nettet i stedet for som lejet ud, og derfor hedder knappen
**Lås dagen**. Prøven er set fejle: sættes `laast` til
`f.status === 'aftalt'`, falder tre prøver.

**"Ældst først" var ikke godt nok.** En fest på LØRDAG er noget
andet end en til maj, også selv om maj-manden skrev først.
`haster()` er trin og ikke point: 0 = festen er inden for en uge,
5 = sagt ja uden at låse dagen, 10 = har ventet over fristen,
20 = resten, 50 = i hus, 90 = færdigt. **5 er med vilje højt
oppe:** det tager to klik at lukke hullet, og hullet er en
dobbeltbooking på vej.

**⚠️ Kortet øverst findes KUN, når der er noget.** En fast boks,
der som regel siger "alt er fint", bliver til udsmykning på en
uge — og så ses den heller ikke den dag, den siger noget. Ingen
af linjerne kan kvitteres for; de forsvinder kun ved, at arbejdet
bliver gjort.

**Det er et TAL, ikke en dom.** Forlægget havde en dagstilstand,
der hed *"travl i cafeen"*, og der findes ikke noget mål for
travlhed i systemet. Antallet af **bordbestilte pladser** samme
dag ved vi derimod, og det er den oplysning, der faktisk skal
bruges: mad til 40 i baglokalet OG servering for 12 i cafeen er
et bemandingsspørgsmål. Afviste og udeblevne borde tæller ikke.

**⚠️ Lukkedagen skal spørges to steder.** `Butik.lukketDen`
(kalenderens rækker, som også dækker en hel vinterlukning) og
`Butik.dagenHeltLukket` (dagsreglerne). Spurgte vi kun det ene,
ville en almindelig lukkedag stå som åben, og advarslen "cafeen
er lukket, og nogen har lokalet" ville aldrig komme.

**Vilkårene er ejerens tal — ikke designets** (28/8). Ingen SQL:
`indstillinger` er nøgle/værdi. Syv felter, og de er **tomme,
til ejeren skriver i dem**: `lokale_pladser`, `lokale_staaende`,
`lokale_pris_aften`, `lokale_pris_dag`, `lokale_gratis_fra`,
`lokale_depositum`, `lokale_svarfrist_dage` plus fritekst
`lokale_vilkaar`.

`h-baglokale.html` blev leveret med designets pladsholdere — 40
siddende, 60 stående, 1.200 kr. for en aften, 2.000 for dagen,
gratis fra 20 kuverter — og de har stået i luften siden 23/8,
fordi Mikkel bad om det. **Indtil nu kunne de kun rettes ved at
redigere HTML.** Nu er hvert tal pakket i sit eget
`<span data-vilk>`, og `js/skal/forespoergsel.js` bytter det ud.

**⚠️ TALLET BYTTES DÉR, HVOR DET STÅR.** Byggede vi hele
sætningen om i JavaScript, skulle designets egne tal stå i koden
som reserve — og så var der to steder, den samme pladsholder
skulle rettes. Reserven er den tekst, der allerede står i filen,
og et tomt felt lader linjen stå. Depositum og "hvad er med i
prisen" har ingen plads i designet og står i et skjult felt, der
kun tændes, når ejeren skriver noget.

**⚠️ Skriv aldrig ⚠️ foran en `.fejl`.** Klassen har sit eget
`::before { content: "⚠ " }`, og linjen kom på skærmen som
"⚠ ⚠️ Dagen er ikke låst". Det lignede en fejl i systemet, ikke
en advarsel om noget. **Fundet med øjnene på et skud** — ingen
prøve læser et tegn foran en sætning.

**Forsiden var kedelig, og det kunne ses** (29/8). Kundens ord:
*"kig på layoutet hvor det nogensteder bar mangler også emojis på
front siden hjemmesiden altså får kunderne det kedeligt hele
vejen ned man."* **Ingen SQL.**

Tre ting, alle sammen fundet ved at **kigge på siden** i stedet
for i koden.

**Seks stiplede grå kasser.** Designet leverede `<image-slot>` som
pladsholdere til fotos. **Målt på en iPhone 13:** en tom plads
tegner sig som en stiplet grå kasse med "Foto: anretning" i
midten, og galleriet på forsiden alene var **740 px stiplet
ingenting**. Nyhedskortene fik lukket den fejl 26/8 — den stod
bare stadig **seks** steder til: fire på forsiden, ét på
`m-tapas.html` og ét på `h-baglokale.html`.

- **Reglen bor ét sted: `js/skal/billedplads.js`.** Foto → flade
  → uberørt, i den rækkefølge. Tre kopier ville langsomt tegne
  tre forskellige flader, og det ville ingen opdage: hver side
  ser jo rigtig ud for sig selv
- **⚠️ Tegnet står i HTML'en (`data-tegn`)**, ikke i en tabel i
  koden. Flytter nogen galleriet, følger tegnet med — en liste i
  JavaScript ville efterlade den nye plads grå
- **⚠️ Det er IKKE et pladsholderbillede.** En farvet flade med
  et tegn lover ingenting; et stockfoto af en anretning ville
  love en anretning
- **⚠️ Fladerne skal op, også når hentningen fejler.** De har
  ingen data bag sig. Blev de stående, ville en side med en nede
  database være den side med FLEST grå kasser — og det er lige
  præcis den dag, den skal se hel ud. Alle tre sider fylder
  pladserne i deres `.catch`
- **Kortet *Billeder på forsiden*** på Forside-fanen tager de fem
  rigtige billeder. Ingen SQL: adresserne bor i `indstillinger`,
  og uploaden bruger `Butik.skrive.nyhedBillede` — nyhedernes
  egen spand, egen komprimering
- **⚠️ Tapasfadet er ÉT foto på to sider.** To felter til det
  samme fad ville betyde, at ejeren skiftede det ene og glemte
  det andet, og gæsten så to forskellige fade på vejen fra
  forsiden til bestillingen
- **⚠️ Kortet i admin står ALTID.** Findes spanden ikke, siger
  uploaden det selv med den linje, der fortæller, hvad ejeren
  skal gøre i dashboardet. Et skjult kort ville skjule netop den
  besked

**En fejl fra 26/8 faldt ud undervejs:** en nyhed **uden slags**
lod pladsen stå — og slagsen mangler, indtil
`nyheder-slags-og-billede.sql` er kørt. Altså stod der en grå
kasse netop i den situation, hvor kolonnen ikke er der. Den får
📣 nu.

**Og så kom de rigtige billeder** (29/8). Mikkel sendte **tre
fotos af forretningens eget smørrebrød** samme dag. De ligger i
`billeder/` og fylder galleriet på **`h-smorrebrod.html` — og kun
dér.** **Ingen SQL.**

**⚠️ FØRSTE UDGAVE LAGDE DEM PÅ FORSIDEN**, i designets galleri
under "Lad os holde jeres næste arrangement". Kunden flyttede
dem: *"det skal være inde på smørbrød ud af huset fanen kun …
så fjern det ude på lad os holde jeres næste arrangement."*

Han har ret i mere end placeringen: de tre fotos **er**
smørrebrød. Stod de under overskriften om selskaber, lovede de,
at et selskab ser sådan ud — og det eneste, vi VED, er, at
forretningen laver det smørrebrød. Designets tre `<image-slot>`
gik med dem; havde vi kun taget billederne, ville afsnittet have
fået tre stiplede grå kasser i stedet. En prøve tæller dem til
nul.

**⚠️ NØGLERNE HEDDER STADIG `foto_selskab_*`.** Et navneskifte
ville betyde, at et foto, ejeren allerede HAVDE lagt op,
forsvandt fra siden uden en fejl — nøglen ville ikke længere
blive slået op.

- **Beskåret med den SAMME midterbeskæring, admin bruger**
  (`komprimer()` i `js/store-skriv.js`). Et portrætfoto af en
  tallerken har motivet i midten; klippede vi fra toppen,
  forsvandt halvdelen af maden
- **⚠️ ADMIN SLÅR REPOET.** Rækkefølgen er admin-indstilling →
  filen i repoet → fladen. Filerne er ejerens egne, lagt ind af
  os første gang — men den dag han tager et bedre billede, skal
  han kunne skifte det i admin uden at nogen rører koden. Var
  rækkefølgen omvendt, ville hans upload se ud, som om den ikke
  virkede
- **⚠️ ALT-TEKSTEN ER FOTOETS, IKKE PLADSENS.** Designets
  `placeholder` siger, hvad pladsen var TÆNKT til — "Foto:
  tapasfad" — og der ligger nu **tartar** i den. En skærmlæser,
  der siger "tapasfad" over tartar, oplyser forkert om maden.
  Teksten står i `data-alt`; uden den er alt tomt, for et forkert
  alt er værre end intet alt
- **⚠️ SMØRREBRØDSSIDEN HAVDE INTET BILLEDE OVERHOVEDET.**
  Designet gav den ingen. Galleriet står EFTER overskriften; et
  foto før ville skubbe "Smørrebrød ud af huset" under folden
- **⚠️ RÆKKERNE PASSEDE KUN PÅ EN TELEFON.** Designet gav det
  store billede `height:100%` + `min-height:250px` og de to små
  en FAST `height:120px`. På en telefon gik det tilfældigvis op:
  120 + 9 + 120 = 249, og det store landede på sin min-height,
  250. **Målt på 1440 px**, hvor spalten er 346 px bred: det
  store blev **461 px** højt af sin egen billedhøjde, mens de to
  små blev stående på 120 — et **hul på 212 px**. Hver regel så
  rigtig ud for sig; det er summen, der er forkert, og den
  findes kun ved at måle. Nu bestemmer det store billedes format
  højden (`aspect-ratio`), rækkerne deler den (`1fr 1fr`), og de
  to små fylder deres række ud. Prøven sammenligner **to
  uafhængige elementer** og fejler kun på computerprofilen —
  præcis som fejlen selv gjorde
- **Tapasfadet og baglokalet har stadig en flade.** Vi har ikke
  fået fotos af dem, og vi finder ikke på et billede af mad,
  forretningen ikke har vist os

**⚠️ OG FORSIDEN ER LETTERE END FØR.** **Målt på en iPhone 13:**
den henter **319 kB** og vokser ikke, når man ruller — den
henter ikke ét foto, fordi den ikke viser ét. Smørrebrødssiden
henter 544 kB, og de tre billeder er hele grunden til at gå
derind. Den gamle forside lå på 650 kB FØR introen slap siden.
En prøve tæller de forespørgsler, BROWSEREN har sendt, og falder,
hvis forsiden en dag begynder at hente et billede, den ikke
viser — et spørgsmål til elementet om dets eget
`loading`-attribut ville bestå, selv hvis browseren hentede det
alligevel.

**Et ansigt pr. kategori i bestillingen.** **Målt:** fem rækker
ren tekst på forsiden — Grill fra pladen, Smørrebrød, Is og
desserter … — hvor menukortet og bordsiden for længst havde tegn
på de SAMME kategorier. Tegnet kommer fra `js/menu-emoji.js`, den
ENE liste. **⚠️ Det er sit eget element ved siden af `<h4>`, ikke
inde i den** — ellers ville overskriftens tekst hedde
"🍔Grill fra pladen", og både prøverne og en skærmlæser læser
netop den tekst.

**Fem døde links på forsiden.** Facebook, Instagram, Anmeldelser,
"Følg os →" og "Læs anmeldelserne på Google →" pegede alle på
`#` — nøjagtig den fejl, der blev fjernet i footeren 28/8.
Adresserne sættes i admin → Kontakt; indtil da ryger linkene AF
siden. **⚠️ Et kort, der kun er en knap, går med** (`.promo.fb`),
**men stjernelinjen bliver** — den bærer også Mikkels
pladsholdertal, og at tage hele linjen ville være at træffe hans
beslutning om igen. **Og striben bliver:** "Musik på havnen" er
et rigtigt link til kalendersiden, ikke en profil.

**Hele siden kan fyldes ud på ét kald** (23/8). `supabase/demo-indhold.sql`
lægger dagens ret, TO livemusik-arrangementer, en intern kalendernote, en
tidlig lukning, fem nyheder, fem kugler på tavlen — og syv rækker på
personalesiden, så Overblik, Bestillinger, Salg, Forespørgsler, Borde og
Baglokalet alle har noget at vise. `supabase/ryd-demo.sql` tager det hele
igen. **Livemusik-banneret kommer herfra**: det viser næste offentlige
arrangement, og var det væk, var kalenderen bare tom.

**Demoen åbner også kategorierne** og sætter varslet ned til 2 timer
(23/8) — ellers er forsidens bestillingsafsnit tomt og skjuler sig selv,
og med 24 timers varsel kan dagens ret ikke bestilles i dag.
`ryd-demo.sql` tager begge dele igen.

**Filen standser kun ét sted: forkert forretning.** De to andre værn —
lukket sæson og bestillinger slået fra — RYDDEDE den ikke af vejen før,
den kastede en exception. Og en exception ruller hele transaktionen
tilbage, så filen gjorde ingenting: rød fejl, uændret side, "den gider
ik loade demo indholdet" (kunden 23/8). Nu slår den dem til og skriver
det med ⚠️ i rapportens kolonne `aendret_paa_forretningen`. Reglen var
aldrig "lad være" — den var **"ingen må kunne gøre det uden at opdage
det"**. Den åbner IKKE sæsonen af sig selv — en fil, der
lydløst åbner en lukket forretning på dens egen hjemmeside, må ikke findes.
Demo-rækkerne kendes på referencen (`SM-DEMO-*`) og på telefonnumre, der
begynder med `0000` og derfor ikke kan ringes op. Se README-afsnittet
"Demo-indhold: hele siden op at køre på ét kald".

**Runden 23/8 — bestillingen flyttede ind på forsiden.** Kunden så
skærmbilledet af det gamle dagens ret-panel og spurgte, om det ikke var
meningen, at maden skulle rulle ned dér, hvor den står. Det var det.

- **`js/dagens.js` er slettet** (465 linjer). Den byggede en ringere
  udgave af den formular, `js/bestilling.js` allerede havde
- **Smørrebrødet har sit eget afsnit og sin egen side.** `bestil/`
  hedder stadig `bestil/`, men den er smørrebrødets nu
- **Isen kan ikke bestilles noget sted.** Heller ikke med et gammelt
  flueben i databasen — filteret ligger i `Butik.udvalg`
- **"Vi ringer og bekræfter" er væk som standard**
- **Menukortet og sortimentet har fået spiis' kortstil**
- **Menukortet kan administreres helt** — beskrivelse, rækkefølge og
  kategorier

Tre fejl faldt ud undervejs, og ingen af dem kunne ses ved at læse:

1. **Formularen på forsiden var tom uden en eneste fejl i konsollen.**
   `js/side.js` kalder `MosedeBestilling.start(d)` inde i
   `Butik.hent().then()`, og i øvetilstand svarer `hent()` med det
   samme — så kørte `.then` FØR browseren nåede at læse det næste
   `<script>`-tag. Med skyen slået til gik det tilfældigvis godt.
   **`bestilling.js` skal indlæses FØR `side.js`**
2. **Dagens rets pris fulgte ikke med.** Retten blev kun lagt ind i
   TEGNINGEN af listen, så kurven skrev "pris følger" på en ret med en
   pris, og køkkenet fik den uden kroner. Nu ligger den i
   `bestilbare()`, som både summen, kurven og afsendelsen bruger
3. **Den flydende pille lå oven i heroens manchet på en telefon.**
   Heroen havde 67 px luft i bunden, pillen fyldte 70. Hver regel så
   rigtig ud for sig; det er summen, der er forkert — og den findes
   kun ved at måle

### To ting om SQL, der har kostet tid

**Supabases SQL Editor viser hverken notices eller warnings** — kun den
sidste sætnings svar. En besked, der skal læses, skal være en `select`
til sidst eller en `raise exception`. Og `\set`, `\pset` og andre
`\`-kommandoer er psql, ikke SQL: står de i filen, fælder editoren hele
arket med en syntaksfejl, før noget er kørt. Se README-afsnittet
"Supabases SQL Editor viser ikke beskeder".

**Rækkefølgen er envejs** — `setup.sql` kan ikke køres efter
`flerlejer.sql`:

```
setup.sql → flerlejer.sql → bremse.sql → menukort.sql → proev-flerlejer.sql
```

`setup.sql` overskriver `is_admin()` hver gang, så e-mailen i punkt 1
skal rettes **hver** gang filen køres — og HELE teksten mellem
apostrofferne. En halv erstatning gav 18/8 adressen
`UDFYLD-CHEFENS-…@gmail.com`, som ingen kan logge ind med. Begge filer
standser nu selv, hvis en stump af pladsholderen står tilbage.

---

## Hvad ejeren har bestilt

Mikkel har aftalt hele opgaven med ejerne direkte. Det er ét system i
samme form som spiis.dk, og det er større end en hjemmeside:

- **administrerende app** — personalesiden, ét sted til det hele
- **smørrebrød takeaway**
- **book spisning** — det er **BORDE**, ikke selskaber
- **udleje af baglokale** — lokalet **findes**, det er ejerens eget ønske
- **levering af frokostordning** — de **leverer** (i hvert fald frokosten)
- **catering**
- **eventkalender** og **generel kalender**
- MobilePay: **ikke nu.** Besluttet 19/8 — brug ikke tid på at regne på det

**Spiis er forbillede, ikke kilde.** Vi må hverken læse eller kopiere fra
det repo (se advarslen øverst). Mikkel kan fortælle, hvad der virker dér;
koden skrives her.

### Det hele har den samme form

Det er værd at se, før man bygger noget nyt: smørrebrød, forespørgsler,
borde og lokaleudlejning er **det samme skelet**. En gæst skriver noget →
personalet ser det i admin → status går én vej → sagen er lukket. Gæsten
må skrive, men ikke læse. Bremsen er den samme. Prøven er den samme.

Derfor er en ny funktion ikke et nyt system. Det er en tabel, et sæt
adgangsregler, en prøve, en fil i `js/admin/` og en side. Afvig fra det
mønster, når der er en grund — ikke fordi det er nyt.

**Det ene, der er anderledes, er kalenderen.** Borde og baglokale kan
være **optaget**, og to gæster må ikke få ja til det samme. Derfor skal
kalenderen bygges før dem — ellers får vi to steder at holde styr på,
hvad der er ledigt, og det er præcis dér, dobbeltbookinger opstår.

---

## Planen herfra

| Fase | Hvad | Status |
|---|---|---|
| 0 | Flere forretninger i databasen, adgang pr. lokation, bremse på bestillinger | ✅ i koden **og i databasen** — 23 × BESTOD i Mosede-projektet 18/8 |
| 1 | Del `admin.html` op — 804 linjer JavaScript lå inline i ét `<script>` | ✅ i koden, på fase 1-branchen |
| 2 | Forespørgselsmotor: **én** tabel `forespoergsler`, tre indgange (catering, baglokale, selskab), status ny → kontaktet → aftalt → afvist | ✅ i koden **og i databasen** — 23 × BESTOD 19/8 |
| 3 | **Én** tabel `kalender` (arrangement / lukkedag / tidlig lukning), erstatter `lukkedage`. Er samtidig event- og driftskalenderen, og fundamentet under fase 4 og 5 | ✅ i koden **og i databasen** — kørt 19/8, forsiden kører på den |
| 4 | **Bordbestilling** ("book spisning") — oven på kalenderen. Gæsten BOOKER; personalet ringer kun, hvis de ikke kan skaffe bordet. Antal pladser sættes i admin | ✅ i koden **og i databasen** — 26 × BESTOD i Mosede-projektet 19/8 |
| 5 | **Udlejning af baglokalet** — som fase 4, men **eksklusivt**: én udlejning optager lokalet den dag | ✅ i koden **og i databasen** — 27 × BESTOD i Mosede-projektet 19/8 |
| 5b | **Salg** — omsætning af AFHENTEDE bestillinger, mest solgte varer. Samme idé som spiis: det tæller først, når maden er ud ad døren | ✅ i koden |
| 5c | **Push** — Database Webhook → Edge Function. Se README under "Push: sådan siger telefonen til" | ✅ i koden — kræver opsætning i Supabase-dashboardet (push.sql, send-push, secrets, 4 webhooks) |
| 6 | ~~Frokostordning som abonnement~~ — **misforstået, se nedenfor.** Det er almindelig mad ud af huset med et døgns varsel | ✅ dækket af forsidens bestilling |
| 7 | **Bordbestilling med QR** — mærkat på bordet, `ved-bordet/`, bordet med i admin. **Ingen betaling og ingen løbende regning** | ✅ i koden — kræver `bordkort.sql` kørt og mindst ét bord oprettet i admin |

### Frokostordningen er IKKE et abonnement

Den stod som fase 6 med "tilbagevendende levering, pauser, helligdage".
**Det var en misforståelse**, og Mikkel rettede den 20/8: det er
almindelig **mad ud af huset**, som man også kan bestille — og som skal
kunne bestilles **senest dagen før**.

Det er præcis det, forsidens bestilling gør. Varslet står i admin som
`bestilling_varsel_timer` (24 timer som standard), formularen klipper
dagvælgeren efter det, og forsiden skriver "Bestil senest dagen før" ud
fra det samme tal. Der skal altså **ikke** bygges en abonnementsmotor,
og der skal ikke laves en tabel til tilbagevendende leveringer.

Det, der stadig mangler, er ejerens svar: **hvad leveres, og til hvilket
område?** Se listen "Ejeren skal bekræfte" i README. Indtil da siger
siden, at man henter — for det er det eneste, vi ved.

**Udskudt:** MobilePay. Betaling online trækker refusioner, kvitteringer
og bogføring med sig, og ejeren har ikke bedt om det endnu.

Fase 1 er lavet, så alt det herover bygger oven på `js/admin/` — en ny
fane er én ny fil, ikke en længere blok i admin.html.

**Hold øje med antallet af faner.** Der er fire nu, og der kommer tre
mere. Bliver personalesiden en række af lister, man skal huske at kigge i,
er det tid til én indbakke med filtre — ikke syv faner med hver sit tal.

---

## Det, ejeren stadig skal svare på

- Resten af listen "Ejeren skal bekræfte" nederst i README

---

## Om økonomien, hvis det kommer op

Lesreg er ikke timelønnet på det her. Prisen skal dække driften og give mening
— 700–1000 kr./md. er aftalt som rimeligt. Brug ikke tid på at regne
forretningsmodeller ud, med mindre der bliver spurgt direkte.
