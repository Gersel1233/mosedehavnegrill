# Mosede Havnegrill og Ishus

Hjemmeside og personale-system for **Mosede Havnegrill og Ishus**,
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
| Forsiden | ✅ bygget efter designbundtet, delt op i tre sider |
| Menukort på egen side | ✅ `menu.html` |
| Smørrebrød ud af huset | ✅ salgsside **og bestillingssystem** |
| Bestillinger i admin | ✅ ny/bekræftet/klar/afhentet, med regler ejeren selv sætter |
| SEO-fundament | ✅ titler, canonical, JSON-LD, robots, sitemap |
| Eget domæne | ⏳ mangler – se nedenfor |
| Intro-animation | ✅ færdig – 1,43 s, ved hvert besøg, altid til at klikke væk |
| Admin (personalets side) | ✅ færdig, og delt op i `js/admin/` med én fane pr. fil |
| Playwright-tests | ✅ 738, grønne på mobil + computer |
| `js/config.js` | ✅ anon-nøglen er lagt ind og kontrolleret |
| Åbningstider | ✅ bekræftet af kunden (10–20 alle dage) |
| Adressen | ⏳ kunden siger 20I, menukortet siger 20 – se nedenfor |
| Menukortet | ✅ 14 kategorier, 151 varer fra kundens eget kort |
| Fotografier og film | ✅ fire fotos, turen forbi lugerne i hero, isfilmen i to formater |
| Vandtemperatur og vind | ⏳ ingen kilde endnu – felterne er tomme og skjulte |
| Fire priser med "ca." | ⏳ skal bekræftes – se nedenfor |
| Forretningens navn | ✅ Mosede Havnegrill og Ishus, bekræftet af kunden |
| Prøvet mod den rigtige database | ✅ 18.–19./8-2026: hele SQL-rækkefølgen kørt, admin-login og forside efterprøvet. Fase 0: 23 × BESTOD. Fase 2 (forespørgsler): 23 × BESTOD |

## Filer

| Fil | Formål |
|---|---|
| `index.html` | Forsiden – sælger stedet |
| `menu.html` | Hele menukortet |
| `bestil/` | **Bestil mad** — den ene bestillingsside: smørrebrød og det, ejeren har åbnet for |
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
| `js/bestil.js` | Bestillingssiden omkring formularen: status, note, telefon |
| `js/bestilling.js` | Selve formularen: listen, kurven, dagene og valget af slags |
| `js/forespoergsel.js` | Forespørgselsformularen — catering, baglokale, selskab |
| `robots.txt`, `sitemap.xml` | Til Google Search Console |
| `css/style.css` | Hele designet, ét sted |
| `js/store.js` | Datalag – Supabase eller localStorage |
| `js/side.js` | Forsidens opførsel og data |
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
| `supabase/skraldespand.sql` | **Skraldespanden** — "Slet" bliver til en dato, og nøglerne bliver delvise |
| `supabase/proev-skraldespand.sql` | **19 prøver af at det, der er smidt ud, ikke længere spærrer** |
| `supabase/logbog.sql` | **Logbogen** — hvem ændrede hvad hvornår. Kan ikke rettes af nogen |
| `supabase/proev-logbog.sql` | **19 prøver af at logbogen skriver nok — og ikke for meget** |
| `supabase/er-vi-klar.sql` | **Ét kald, der spørger databasen om det hele.** Skriver ingenting — 31 linjer ✅ eller ❌ |
| `supabase/funktioner/send-push.ts` | Edge Function'en, der sender beskeden ud til telefonerne |
| `supabase/lav-vapid.html` | Laver VAPID-nøgleparret i browseren. Den private halvdel forlader aldrig maskinen |
| `tests/` | Playwright – 834 tests i 25 filer |

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
`udlejning.sql` → `push.sql` → `spis-her.sql` → `realtime.sql`. Rækkefølgen
indbyrdes er ikke tilfældig — `borde.sql` og `udlejning.sql` regner med, at
kalenderen findes, og `realtime.sql` melder tabeller til, der skal være der.
`skraldespand.sql` kommer **til sidst**: den retter nøgler og bremser, som de
andre filer laver, og skal derfor køres efter dem — også hvis en af dem køres
igen senere.

### Er vi klar? Ét kald, der spørger om det hele

`supabase/er-vi-klar.sql` **skriver ingenting**. Den kigger, og den svarer med
31 linjer ✅ eller ❌ og en linje nederst, der siger `ALT ER KLAR` eller hvor
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

### Forsidens ene handling er smørrebrødet

Her lå **"Går hurtigt lige nu"**: fem kort med et udvalg der roterede hver time,
valgt blandt de varer personalet havde markeret som fremhævet. Overskriften sagde
med vilje ikke "mest bestilte" — der er ingen kassedata, ikke ét rigtigt salg —
men det ændrede ikke på at blokken **lignede** en "populært lige nu"-liste, og en
sådan liste uden tal bag er en påstand man ikke kan holde. Kunden kaldte den
kedelig, og siden generisk.

Det der står der nu, er det forretningen faktisk sælger på hjemmesiden, og det
eneste på siden man kan **handle** på: de fem slags smørrebrød med deres priser,
antallet af slags fyld, og én rød knap til bestillingssiden.

Alt i blokken kommer fra menukortet. **Antallet af slags fyld tælles** — der står
ikke et rundt tal nogen har skrevet. Sætter personalet en slags udsolgt, falder
tallet af sig selv, og der kan ikke komme til at stå "29 slags" den dag der er 27.
`tests/forside.spec.js` måler netop det.

**Arrangement-afsnittet er gået op i blokken.** Det stod 800 pixel længere ned med
overskriften "Smørrebrød og platter til store og små selskaber" og en knap der hed
"Bestil smørrebrød" — den samme besked og den samme knap. Ordene er flyttet derop
hvor priserne også står, så man kan beslutte sig på ét sted. Ingen af dem er væk,
og en test holder øje med at de bliver ved med at stå der.

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
på op til 40 px. Skuffen er et ark der glider op: den fylder skærmen, den har ét
kryds på 44 px, og der er luft nok til at man kan ramme med en tomme uden at
sigte.

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
- **Skuffemenuen** (telefonen) har alle ni ærinder.
- **Forsiden** har afsnittet *Hvad kan vi hjælpe med?* — seks kort, ét pr.
  ærinde, to spalter allerede på en telefon.
- **Fire nye sider**: `bord/` (ring, så finder vi ud af det — formularen kommer
  i fase 4), `catering/` og `baglokale/` (SEO-landingssider, der sender videre
  til formularen på `selskaber/` med typen i linket, så formularen kun findes
  ét sted), og `arrangementer/` (viser kalenderens offentlige arrangementer —
  fase 3-databasen havde kunnet det hele tiden, nu er der en side).

Alle fire sider har titel, beskrivelse, canonical og JSON-LD som de gamle, og
`tests/seo.spec.js` måler dem på nøjagtig samme måde — listen SIDER dér og
`sitemap.xml` følges ad. Og de lover det samme som resten af siden: **intet
der ikke er bekræftet.** Ingen priser, ingen antal, ingen leveringsløfter —
`tests/skal.spec.js` slår ned på dem, der prøver.

`js/arrangementer.js` filtrerer selv på `offentlig`, selv om databasens
adgangsregel allerede gør det i produktionen: i øvetilstand uden database er
klientfilteret det eneste værn, og testen "et internt arrangement vises IKKE"
er bevist ved at fjerne filteret og se den fejle.

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

Smørrebrødet altid — det er dét, siden er bygget om. Resten af kortet kun,
hvis personalet sætter fluebenet ved kategorien på Menukort-fanen
(`bestilbare_kategorier` i indstillinger, ingen ny tabel). Den dag køkkenet
kan nå at lave pølser ud af huset, er det ét tryk — ikke en ny side, ikke en
udgivelse. Og lige så vigtigt den anden vej: er fluebenet ikke sat, står der
ikke ét ord om det på gæstesiden. `Butik.udvalg()` samler det hele, og en
åbnet kategori bliver sin egen gruppe på bestillingssiden med **kategoriens
eget navn fra menukortet** — ingen har fundet på et ord til den.
`tests/fyld-model-a.spec.js` måler, at is og øl IKKE kan bestilles, før
nogen har sagt ja — bevist ved at fjerne filteret og se prøven fælde det.

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

Handling → hvad har I → flere ærinder → stemning → praktisk:

1. **Heroen** — hvem er I, er der åbent, og én stor knap: Bestil mad
2. **Bestil mad** — ét kort pr. slags, man kan bestille
3. **Menukortet** — de tre afdelinger, tællet
4. **Ærinderne** — smørrebrød ud af huset, bord, selskaber, catering,
   baglokalet, arrangementer
5. **Stemningen** — kagerne, isfilmen, dagens kugler
6. **Find os** — åbningstider, adresse, rute, telefon

Kagefotoet og isfilmen lå før mellem menukortet og ærinderne. Den, der
stod med telefonen for at bestille mad, rullede altså gennem to skærme
stemning for at finde noget at trykke på. Filmen er ikke fjernet — den
er flyttet hen, hvor den hører til: efter det, man kom for.

### Kortene i Bestil mad er talt, ikke skrevet

Hvert kort er en slags, gæsten kan bestille: navnet fra menukortet, et
**tællt** antal ("1 slags stykker · 2 slags fyld") og den **laveste
pris, der faktisk står i kortet** ("fra 89,-"). Sætter personalet en
vare udsolgt, falder tallet af sig selv. Har en slags ingen priser
endnu — fyld, ejeren ikke har prissat — står der ingen pris; et gæt her
koster en skuffet kunde ved lugen.

Kortet fører til `bestil/?slags=…`, så bestillingssiden åbner på præcis
den slags, der blev trykket på. Uden det landede gæsten på smørrebrødet,
uanset hvad hun valgte — og skulle vælge igen, lige efter at have valgt.

Linjen **"Bestil senest dagen før"** kommer fra
`bestilling_varsel_timer` i admin. Er tallet ikke sat, regnes der med et
døgn — den samme antagelse som formularen bruger til at klippe dagene i
dagvælgeren. Stod de to steder med hver sin antagelse, ville forsiden
love en frist, formularen ikke holder.

### Tre fejl, som skærmbilleder fandt

**Klassen hed `bestil-kort`.** Personalesiden bruger det navn til sine
bestillingskort, så en mørkeblå flade med hvid tekst farvede hvert
eneste kort i admin — og teksten beholdt sin egen mørke farve: **1:1 i
kontrast**. Kontrasttesten fangede det. Den hedder `slags-kort` nu.

**Smørrebrødskortet sagde "fra 35,50".** Prisen blev regnet på alt, der
ikke var fyld, og softicen kom med. Nu filtreres der på kategorien.

**Den klæbende bestil-knap lå oven på afsnittets egen røde knap.** Den
gemmer sig nu for *enhver* rigtig bestil-knap på skærmen — og
tilstanden holdes pr. element: en tæller gik i nul, fordi
IntersectionObserver melder ind om alle elementer med det samme, også
dem, der aldrig havde været synlige.

## Døren hedder Bestil mad, og den fører ét sted hen

`bestil/` + `js/bestil.js`, og formularen selv i `js/bestilling.js`.

Formularen lå på `smoerrebroed-ud-af-huset/`. Det var rigtigt dengang: den
var det ene sted, man kunne bestille noget. Så kom model A, køkkenet kunne
også tage imod grill og café — ejeren sætter selv fluebenene i admin — og
både "spis her" og "tag med". **En adresse, der siger smørrebrød, passede
ikke længere til det, der stod på skærmen.**

| Siden | Job |
|---|---|
| `bestil/` | Handlingen. Vælg maden, spis her eller tag med, dag og tid |
| `smoerrebroed-ud-af-huset/` | Salgs- og søgesiden for "smørrebrød ud af huset i Greve". Viser sortimentet og fører ind i bestillingen |

### Hvad skal det være?

Er der mere end én slags at vælge imellem, står der en række chips over
listen. **Navnene er ejerens egne kategorinavne fra menukortet** — ingen har
fundet på ordene i koden. Står der Burgere i menukortet, står der Burgere på
chippen.

Er der kun smørrebrødet, som der er i dag, vises rækken **slet ikke**. En
vælger med ét valg er ikke en vælger; det er en knap, der ikke gør noget. Det
er den samme regel som foldene længere nede, og den er grunden til, at siden
kan udgives, længe før ejeren har åbnet for noget.

**Valget er et filter og ikke en tragt.** Kurven bliver, når man skifter, og
der står et tal på chippen med det, der ligger i den anden slags. Uden det tal
kunne gæsten vælge en burger, skifte til smørrebrødet og glemme burgeren — den
står stadig i kurven, og hun ser den først på kvitteringen.

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

### Forsiden har én stor knap

Der stod fire lige store piller i heroen: åbningstiden, "Se menukortet",
"Smørrebrød ud af huset" og "Find vej". Fire ens piller er ikke et valg — det
er en liste, og på en telefon fyldte den to linjer uden at pege nogen steder
hen.

Nu er der én stor: **Bestil mad**. Den er den eneste knap på hjemmesiden med
den størrelse; bruges den to steder, er den ikke længere den store. Menukortet
og vejen står ved siden af i småt, og åbningspillen står **først** — den
svarer på det, gæsten spørger om, mens hun står nede ved vandet, og et svar
hører foran handlingen.

Den klæbende bestil-knap i bunden **gemmer sig, mens heroens egen er fremme**.
Målt på et skærmbillede: der stod to røde bestil-knapper i det første
skærmbillede på en telefon, og den klæbende lagde sig oven på "Se menukortet"
og "Find vej". Knappen er synlig som udgangspunkt, og JavaScript skjuler den —
vendte det den anden vej, ville en fejl i et script betyde, at knappen til det,
forretningen sælger, forsvandt helt.

### Topmenu og skuffe bygges ét sted

De var skrevet af ni gange, og "Smørrebrød" stod derfor ni steder, der skulle
rettes hver for sig. De er nu ens på alle sider, og en test går hver eneste
side igennem og slår ned, hvis den gamle tekst er blevet stående ét sted. To
navne til den samme dør er to døre for gæsten.

### Salgssiden henter ikke formularens kode

`bestilling.js` er 26 kB. En formular, der ikke findes på siden, skal ikke
hentes over en mobilforbindelse — og en test tæller efter.

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

## Ejeren skal bekræfte

Alle oplysninger står i `js/oplysninger.js` med `godkendt: false`. Så længe det
flag står, skriver testene en påmindelse ud ved hver kørsel. **Intet herunder er
gættet** — hvor der ikke findes et svar, står feltet tomt, og siden skjuler det.

| Oplysning | Hvad vi bruger nu | Hvorfor det skal bekræftes |
|---|---|---|
| Husnummer | `Havnevej 20I` | Kunden har oplyst 20I. Forretningens eget menukort skriver 20, og tredjeparter skriver både 20 og 20L. |
| Telefon | `28 87 13 43` | Står på forretningens eget menukort. Nogle tredjepartssider viser et andet nummer. |
| Domæne | GitHub Pages-adressen | Har forretningen et domæne? Det skal på skiltet og i canonical. |
| E-mail | tom | Ingen kendt adresse. Kan skrives i admin. |
| Facebook, Instagram, Google-profil | tomme | Kun links vi har set, kommer på. Et link til en profil der ikke findes, er en blindgyde. |
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
3. **Arrangementer med dato.** En tabel med dato, titel, beskrivelse og billede,
   plus en side der viser de kommende. Nu står der kun én fast tekst.
4. **Troværdighed.** Galleri af rigtige billeder, link til Google-profilen og
   smileyrapporten, rigtige anmeldelser. Alt afhænger af listen ovenfor.
5. **Roller og log i admin.** Ejer og medarbejder, mulighed for at deaktivere,
   ændringslog.
6. **Lighthouse på den rigtige adresse.** Vægten er målt lokalt (605 kB før siden
   er brugbar, FCP 124 ms), men tallene skal efterprøves over en rigtig
   forbindelse når domænet er på plads.

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

Navnet er **Mosede Havnegrill og Ishus**. Kunden har bekræftet det, og det
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

834 tests i rigtig Chromium, på både mobil og computer. 777 kører, og 57
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
telefon og fra 569 til 464 kB på en computer.** `tests/forside.spec.js` holder
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

Udvikling sker på en feature-branch. Når den er god, merges den til `main`, og
workflowet i `.github/workflows/deploy.yml` udgiver siden på GitHub Pages.

Testene kører med forbindelsen koblet fra: `js/config.js` udskiftes med en tom
udgave under test. Ellers ville hver test gå på nettet, afhænge af at
databasen er oppe, og skrivetestene ville ændre i kundens virkelige data.
