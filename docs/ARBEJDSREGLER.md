# Arbejdsreglerne — den lange udgave

Flyttet ORDRET ud af `CLAUDE.md` 15/9 2026. Den korte udgave står i `CLAUDE.md`;
her er eksemplerne og målingerne bag. Teksten er fra før 15/9 — hvor den siger
noget andet end `CLAUDE.md` eller `docs/HISTORIK.md`, gælder de (fx kan isen
bestilles nu, og afsnittene på forsiden er dem i `tests/skal-forside.spec.js`).

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
> Mikkel sit eget design fra Claude Design som 1:1-facitliste.
> Læren i afsnittet består — få koncepter, én handling pr. afsnit
> — men rækkefølgen bestemmes af handoffet og af kunden.
> Se "GÆSTESIDEN ER SKIFTET UD" under status.
>
> **Rækkefølgen i dag (flyttet 7/9 på Mikkels ord):**
> hero → socials → musik → Facebook-kortet → **nyheder** →
> **dagens ret** → **ugens retter** → **bestil** → menukort/tapas
> → om os → selskab → alt-vi-kan → find.
>
> Hans ord: *"lige under facebook tingen skal nyheder sectionen
> komme, derefter den section skal dagens ret og dagens retter
> komme, også komme bestillingen og den opstilling vi har
> naturligt derefter."* Før stod nyhederne EFTER menukortet, og
> bestillingen lå **klemt inde mellem** dagens ret og ugens
> retter — to afsnit om det samme med en handling imellem.
> Siden læses forfra nu: her sker der noget → her er maden i dag
> og resten af ugen → og her bestiller I.
>
> **⚠️ DE 6 PX ER EN BESLUTNING, IKKE PYNT.** `#idag` har
> `padding-bottom:6px` og `#ugen` `padding-top:6px`. De klæbede
> hidtil til BESTILLINGEN på hver sin side; nu hugger de
> hinanden. **Målt:** sømmen mellem dagens ret og ugens retter er
> **12 px**, mellem ugens retter og bestillingen **64**. Prøven
> sammenligner de to sømme — to uafhængige afstande — og er set
> fejle begge veje: uden de 6 px bliver begge 64, og sættes
> bestillingen tilbage imellem dem, vender fortegnet.
>
> **⚠️ OG PRØVEN MÅLTE INGENTING TO GANGE FØRST.** Den målte
> `#idag` med `grunddata()`, som ikke har en dagens ret — altså
> et **skjult** afsnits nulrektangel mod et synligt, 722 px. Og
> derefter afsnittenes egne kasser, som altid står 0 px fra
> hinanden, fordi luften ligger som padding INDE i dem. Sømmen
> er afstanden mellem INDHOLDET, og siden skal rulles igennem
> først: designets `.rev` flytter elementer med en transform,
> til de er afsløret.

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

**⚠️ TO TING OM RUNDEN, DER HAR KOSTET TID (4/9):**

- **`git checkout -- <fil>` SLETTER UCOMMITTET ARBEJDE.** Det er
  den normale måde at rulle en falsifikation tilbage på — og
  **tre gange på én dag** rullede den en RETTELSE tilbage, fordi
  filen ikke var committet endnu. Sidste gang overlevede
  admin-halvdelen og kvitteringen ikke, og den tomme udgave blev
  committet bagefter. **Commit FØR du falsificerer.** Den fulde
  runde fangede det; øjnene gjorde ikke.
  **⚠️ FJERDE GANG 7/9:** hele forsidens omrokering blev rullet
  tilbage af et `git checkout -- index.html` efter en
  falsifikation — og det blev først opdaget, fordi `git status`
  bagefter viste index.html som URØRT, mens flytningen var lavet
  ti minutter før. **Læs `git status` efter hver falsifikation:
  står den fil, du netop rettede, som umodificeret, har du lige
  slettet dit eget arbejde.** Advarslen her har stået siden 4/9
  og forhindrede det ikke; det gjorde reglen om at committe
  først heller ikke, fordi den blev sprunget over
- **⚠️ OG KØR IKKE TO PLAYWRIGHT-KØRSLER PÅ ÉN GANG (7/9).** En
  kørsel, der bliver flyttet i baggrunden, LEVER stadig. Start
  nummer to, og den ene rives ned under den anden: **målt** stod
  de første otte prøver grønne på 2,5-9,8 sekunder, og alle de
  følgende faldt på 400-600 ms. Det ser ud som en fejl i koden
  og er en fejl i maskinen. Kendingen er den samme som flakens:
  **tiden.** Og en dræbt kørsel efterlader sin
  `python3 -m http.server 4173` som forældreløs, så næste kørsel
  dør med *"webServer was not able to start"* — den findes ved
  at scanne `/proc/*/cmdline`, ikke med `ss`
- **KØR IKKE EN BROWSER MED, MENS RUNDEN KØRER.** Playwrights
  egen server på 4173 døde midt i shard 2, og de resterende ~500
  prøver fejlede med `ERR_CONNECTION_REFUSED` — 70 røde, der
  ikke havde noget med koden at gøre. En rød runde, man ikke kan
  stole på, er værre end ingen runde: man begynder at lede i den
  forkerte ende. Kør `/se-siden` FØR eller EFTER, aldrig
  imens

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

**⚠️ OG UDSEENDE GÅR DIREKTE I LUFTEN (11/9) — MIKKELS BESLUTNING.**
Hans ord, efter en runde på en time for en ændring af filmens takt:
*"fra nu af, så længe vi ikke piller ved hjernen, med udseendet bare
gør ændringerne live."*

- **UDSEENDE** er det, gæsten SER: CSS, layout, billeder, tekster,
  animationer, og JavaScript, der kun styrer visningen (filmens takt,
  hvornår noget toner ind). Det udgives direkte — **ingen fuld
  runde**. Kig på et skud (eller simulatoren), før du siger, det er
  færdigt: det er dér, udseende-fejl findes
- **HJERNEN** er det, der skriver, regner eller beslutter:
  bestillinger, bookinger, forespørgsler, admin-fanernes handlinger,
  priser, varsler, regler i `bestil-regler.js`/`store.js`, SQL. Dér
  gælder rækkefølgen ovenfor stadig — prøv filen, udgiv, og kør den
  fulde runde efter en samling ændringer
- **Er du i tvivl om, hvilken af de to en ændring er, så er den
  hjernen.** En visning, der ændrer, hvad der SENDES, er ikke længere
  udseende

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

## gstack

Repoet henter [gstack](https://github.com/garrytan/gstack) automatisk, når en
session starter (`.claude/hooks/install-gstack.sh`, ca. 15 sekunder). Går
hentningen galt, kører sessionen videre uden — den må aldrig blokere arbejdet.

Det giver slash-kommandoer som `/review` (gennemgang før noget lægges op),
`/investigate` (systematisk fejlfinding), `/retro` (hvad skete der i ugen) og
`/health` (overblik over kodebasen).

**Brug ikke `/ship`, `/land-and-deploy` eller `/canary` her.** Aftalen i det
her repo er, at små ændringer godt må gå direkte live, mens større skal have
et ja først. Det kræver, at nogen vurderer hvilken slags en ændring er — og
netop den vurdering springer de tre skills over. De committer, pusher og
udgiver på egen hånd, og standardgrenen går direkte i luften på
mosedehavnecafe.dk.

Browser-delen (`/qa`, `/browse`, `/design-review`, `/scrape`) virker ikke i
sky-sessioner: proxyen bryder krypteringen, og Chromium stoler ikke på den.
Slå aldrig krypteringstjek fra for at komme udenom. Brug `.mcp.json`-opsætningen
og skillen `se-siden` i stedet — de kører mod den Chromium, der allerede ligger
i maskinen.

## Erfaringer fra et søsterprojekt

`LAERT-AF-SPIIS.md` samler det, der faktisk er gået galt i produktion på et
tilsvarende restaurant-site: hvilke fejl kunderne og køkkenet mærkede, hvad
årsagen viste sig at være, og hvilken regel der kom ud af det. Det er ikke
regler for det her repo — det er fælder, en anden allerede er trådt i.
