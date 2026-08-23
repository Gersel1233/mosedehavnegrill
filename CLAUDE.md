# Sådan arbejder vi på det her projekt

Hjemmeside og personalesystem for **Mosede Havnegrill og Ishus** — smørrebrød,
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

- **Fyldet** til smørrebrødet. Stykkerne er MED — de er mad som alt
  andet — men de 29 slags fyld, varslet og mindsteantallet er
  byggeriet, og det har sin egen side (`bestil/`)
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

Kør altid hele suiten før et push:

```bash
npx playwright test          # 1148 tests, mobil + computer
```

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
  hele og svarer med 38 linjer ✅/❌ plus `ALT ER KLAR`. Den **skriver
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

Tilbage fra opskriften: kun **HTTPS tvunget på GitHub Pages**, som
skal slås til i repoets indstillinger.

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
  faktisk findes — bl.a. peger "Book spisning" på `bord/`, den
  eneste side, der kan booke et bord i dag
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

- **Eget domæne.** Siden kører stadig på `gersel1233.github.io`
- **Husnummeret:** kunden siger 20I, menukortet siger 20
- Resten af listen "Ejeren skal bekræfte" nederst i README

---

## Om økonomien, hvis det kommer op

Lesreg er ikke timelønnet på det her. Prisen skal dække driften og give mening
— 700–1000 kr./md. er aftalt som rimeligt. Brug ikke tid på at regne
forretningsmodeller ud, med mindre der bliver spurgt direkte.
