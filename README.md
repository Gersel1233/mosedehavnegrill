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
| Udgivelses-workflow | ✅ kører – siden er live |
| Forsiden | ✅ bygget efter designbundtet, delt op i tre sider |
| Menukort på egen side | ✅ `menu.html` |
| Smørrebrød ud af huset | ✅ salgsside **og bestillingssystem** |
| Bestillinger i admin | ✅ ny/bekræftet/klar/afhentet, med regler ejeren selv sætter |
| SEO-fundament | ✅ titler, canonical, JSON-LD, robots, sitemap |
| Eget domæne | ⏳ mangler – se nedenfor |
| Intro-animation | ✅ færdig – 1,43 s, én gang pr. fane |
| Admin (personalets side) | ✅ færdig |
| Playwright-tests | ✅ 386, grønne på mobil + computer |
| `js/config.js` | ✅ anon-nøglen er lagt ind og kontrolleret |
| Åbningstider | ✅ bekræftet af kunden (10–20 alle dage) |
| Adressen | ⏳ kunden siger 20I, menukortet siger 20 – se nedenfor |
| Menukortet | ✅ 14 kategorier, 151 varer fra kundens eget kort |
| Fotografier og film | ✅ fire fotos, turen forbi lugerne i hero, isfilmen i to formater |
| Vandtemperatur og vind | ⏳ ingen kilde endnu – felterne er tomme og skjulte |
| Fire priser med "ca." | ⏳ skal bekræftes – se nedenfor |
| Forretningens navn | ✅ Mosede Havnegrill og Ishus, bekræftet af kunden |
| Prøvet mod den rigtige database | ⏳ ikke gjort |

## Filer

| Fil | Formål |
|---|---|
| `index.html` | Forsiden – sælger stedet |
| `menu.html` | Hele menukortet |
| `smoerrebroed-ud-af-huset/` | Smørrebrød ud af huset: salgs- og SEO-side |
| `admin.html` | Personalets side |
| `js/oplysninger.js` | **Navn, adresse, telefon, domæne – én kilde** |
| `js/faelles.js` | Burgermenu, årstal, rutelinks, prisformat: alle sider |
| `js/menuside.js` | Menukortet |
| `js/smoerrebroed.js` | Smørrebrødssiden |
| `js/bestilling.js` | Bestillingsformularen — den eneste gæsten skriver i |
| `robots.txt`, `sitemap.xml` | Til Google Search Console |
| `css/style.css` | Hele designet, ét sted |
| `js/store.js` | Datalag – Supabase eller localStorage |
| `js/side.js` | Forsidens opførsel og data |
| `js/intro.js` | Intro-animationen |
| `js/baad.js` | Båden i bunden (rullemåler) |
| `js/config.js` | Forbindelsen til databasen |
| `fonts/` | Bebas Neue og Instrument Sans (52 KB) |
| `billeder/` | Fotos og video, klar til web (8,0 MB i alt) |
| `assets/` | Kilderne til isfilmen: opskrift, udklip og havnefoto. `assets/raa/` er kundens egne udklip, urørte |
| `vaerktoej/` | Småprogrammer der laver filerne i `billeder/` — bruges ikke af siden. `proev-isfilm.js` tegner prøvebilleder af isfilmen |
| `supabase/setup.sql` | Hele databasen, kør én gang |
| `supabase/menukort.sql` | Menukortet: 14 kategorier, 151 varer |
| `supabase/ret-oplysninger.sql` | Engangs-rettelse, se filens hoved |
| `supabase/proev-adgang.sql` | **Prøve af adgangsreglerne for bestillinger** — kør efter setup.sql |
| `tests/` | Playwright – 386 tests |

## Sådan sætter du databasen op

1. Åbn Supabase-projektet → **SQL Editor** → **New query**
2. Ret e-mailen i punkt 1 af `supabase/setup.sql` til personalets e-mail
3. Indsæt hele filen og kør den. Den kan køres igen uden at ødelægge data
4. Kør derefter `supabase/menukort.sql` — hele menukortet
5. **Authentication → Users → Add user** — samme e-mail, valgfri adgangskode,
   sæt hak i *Auto Confirm User*

Havde du kørt `setup.sql` før åbningstiderne blev bekræftet, så kør
`supabase/ret-oplysninger.sql` én gang. Den retter vores gæt, men rører ikke
noget personalet selv har ændret i admin.

## Nøglen

`js/config.js` indeholder anon-nøglen. Den er lavet til at ligge offentligt —
adgangsreglerne i databasen bestemmer at den kun må læse.

`tests/config.spec.js` holder vagt over filen: den afkoder nøglen og fælder
byggeriet hvis rollen ikke er `anon`, hvis nøglen hører til et andet projekt
end url'en, hvis den er tæt på at udløbe, eller hvis der ligger mere end én
nøgle i filen. Forveksler man anon og `service_role`, ser siden helt normal ud
mens enhver besøgende kan slette menukortet — den fejl opdages ikke på
skærmen, så den fanges her.

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
| `kager-*.jpg` | kage-afsnittet, to størrelser | 3072×5504, 8,2 MB |
| `molen-*.jpg` | billedet i fuld bredde, to størrelser | 3072×5504, 8,4 MB |
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
* kameraet ender **oppe og til højre** i stedet for nede til venstre
* titlen står **under** keglen, ikke ved siden af
* sløret er vendt en kvart omgang: mørkest i bunden, hvor skriften står
* den vejer mindre — 818 mod 1085 kB

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

#### Ærmet der skal ud af billedet

Til sidst forlænges ærmet på hånden, som ellers bliver klippet af i en snorlig
linje der kommer til syne når kameraet zoomer ud. De nederste **faste** rækker
strækkes — ikke de nederste rækker med noget i: de sytten sidste er en lodret
udtoning fra alfa 250 til 134, og strækkes de, bliver ærmet en halvgennemsigtig
stribe med en synlig streg hvor den begynder.

**Hvor langt** det skal nå, er regnet ud af det format der kræver mest, og det
er højformatet: hånden står med overkanten i 633,3, skalerer med 1,05, og til
sidst zoomer kameraet ud til 0,60 om et drejepunkt i 34% af højden.

```
459 + (633,3 + 1,05·A − 40 − 459) · 0,60  ≥  1350 + 40   →   A ≥ 1350
```

De gamle 800 rakte til 1080-rammen men ikke til 1350: ærmet endte i y≈1031 af
1350, en snorlig kant hen over bordet. **1400** giver plads plus luft, og det
brede format får samtidig 329 px margin i stedet for 20.

**En rå strækning duer ikke.** Ti rækker af et stribet ærme strakt over 800 px
bliver en knivskarp søjle med præcis parallelle lodrette striber. I det brede
format lå den uden for billedet; i det høje står den midt ned gennem rammen og
ser ud som det den er. Tre ting gør den til en arm i stedet:

* **den smalner** til 86% nedefter — et ærme der går væk fra kameraet bliver
  smallere, og siderne må ikke være parallelle
* **den bliver mørkere**, ned til 68% — lyset falder på vej ned i ærmet, og en
  stribe man ikke kan se er ikke en stribe
* **den bliver blødere** — armen er nærmere kameraet end isen, og det der er
  nærmere end fokus er uskarpt

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
| navnet | 4,39:1 | 6,29:1 |
| underlinjen | 4,43:1 | 11,50:1 |
| åbningslinjen | 12,57:1 | 12,57:1 |

Kravet er 3,0 (stor tekst). At måle kun det ene format ville være at lade
halvdelen af gæsterne stå med et navn de måske ikke kan læse — og det er
telefonhalvdelen, altså de fleste.

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

### Går hurtigt lige nu

Afsnittet hed **"Mest bestilte"** og viste fire faste varer. Det er nu fem varer
der **roterer hver time** — `time = Math.floor(nu / 3600000)`, og udvalget hentes
med `varer[(time + i·3) % varer.length]`, så det fortsætter videre i morgen i
stedet for at gentage dagens rækkefølge. Det første kort er stort og har havnens
mørkeblå bund, og kortene flyver ind ét ad gangen. Under overskriften står der
hvornår det skifter næste gang, så det er tydeligt at listen **er** levende og
ikke bare tilfældig.

Der står **ingen navne og ingen antal**: "42 solgt i dag" eller "Mette købte en
flæskestegssandwich" ville være opdigtet. Vi har ingen kassedata. Overskriften er
det der faktisk er sandt om alt på tavlen midt i en travl sommeraften.

Menukortet viser **én afdeling ad gangen** med genveje til hver kategori. Genvejene
ruller sidelæns på en telefon — syv kategorier kan ikke stå på 390 pixel, og en
ombrudt klump på fire linjer skubber selve kortet ned under skærmkanten.
Afdelingsfanerne klæber til toppen, så man kan skifte fra maden til isen uden at
rulle 3000 pixel op.

### Mobilbjælken

Fire genveje fast i bunden på skærme under 900 px: **Menu, Ring, Find vej,
Smørrebrød**. Det er dét folk står med telefonen i hånden for at gøre.

Der står bevidst **ikke** "Bestil takeaway". Hele grillens kort kan ikke
forudbestilles — det er smørrebrødet der kan — og en knap der lover mere end
forretningen kan holde, giver skuffede kunder i telefonen.

## Bestilling af smørrebrød

Nederst på `smoerrebroed-ud-af-huset/` ligger den eneste formular på hele
hjemmesiden, og den eneste ting en gæst skriver i databasen. Koden er
`js/bestilling.js`, tabellen er `bestillinger` i `supabase/setup.sql`, og
personalets side er fanen **Bestillinger** i admin.

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
selv tilbage. Den blev skrevet **før** koden virkede, og den fangede med det
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

Den kører **én gang pr. fane** og varer **1,43 sekunder** plus 0,3 til at tone
væk.

Kravet har været begge veje undervejs, og tallene er fulgt med: først 4,8
sekunder én gang pr. fane, så ved hvert besøg og skåret til 3 sekunder, og nu én
gang pr. session med et loft på 1-2 sekunder. Koreografien er den samme hele
vejen — bogstaverne falder, vandet stiger, båden rider, mågerne driver — det er
kun tempoet der er skruet op. 900 ms indlæsning er bunden: under det kan man se
at procentkurven ikke betyder noget.

`tests/intro.spec.js` måler **på tidslinjen** (`window.MOSEDE_INTRO_MS`) og ikke
på væguret. To testarbejdere der deler en CPU kan gøre en vægur-måling et halvt
sekund langsommere, og så fælder testen byggeriet for maskinens skyld i stedet
for for koreografiens.

Den springes **helt over** i tre tilfælde: reduceret bevægelse, anden gang i
samme fane, og når adressen har et anker. Kommer gæsten ind på `.../#menu` fra
Google, skal menuen være der med det samme — en animation der dækker netop det
sted man bad om at komme til, er en fejl uanset hvor kort den er.

Nøglen sættes når introen **begynder**, ikke når den er færdig. Trykker gæsten
opdater midt i animationen, skal den ikke starte forfra.

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
- `indstillinger` — dagens besked, sæson, dagens kugler, nøgletal, havnestriben

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

274 tests i rigtig Chromium, på både mobil og computer. 264 kører, og 10
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
- **Båden i bunden sejler også her** — den var slået fra under 640 px, fordi
  striben på 76 px ville ligge oven på indholdet. Men båden **er** rullemåleren,
  og det er den der giver siden liv mens man ruller: at fjerne den på det apparat
  de fleste bruger, er at fjerne bevægelsen dér hvor den tæller. Den er nu 48 px
  og ligger **over** mobilbjælken, `bottom: calc(56px + env(safe-area-inset-bottom))`.
  Slået fra er den kun under 620 px højde — en telefon på tværs, hvor den ville
  dække det halve af indholdet.
- **Isfilmen er i højformat** under 700 px. Se afsnittet om isfilmen.

`tests/telefon.spec.js` holder det på plads, og for båden gør den det ved at
**læse pixels ud af canvas'et**: `js/baad.js` springer selv fra når `clientWidth`
er 0, så en usynlig fejl dér ville give en tom stribe uden at nogen test mærkede
det. Den måler også at striben slutter dér hvor bjælken begynder.

## Hvor hurtig er den?

Målt på en iPhone 13-profil over localhost: **FCP 124 ms**, og **605 kB** hentet
før introen slipper siden. Loftet i `tests/vaegt.spec.js` er 700 kB.

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
4. **Båden standser** når fanen ligger i baggrunden. Ingen ser den, og en
   bærbar skal ikke bruge strøm på den.

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
