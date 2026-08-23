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
  halvt. Andre brancher udgives ikke af sig selv

### Forsidens rækkefølge er en aftale, ikke en smag

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
npx playwright test          # 1094 tests, mobil + computer
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
  hele og svarer med 27 linjer ✅/❌ plus `ALT ER KLAR`. Den **skriver
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

Filen standser sig selv tre steder: forkert forretning, lukket sæson og
bestillinger slået fra. Den åbner IKKE sæsonen af sig selv — en fil, der
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
