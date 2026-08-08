# Mosede Havnegrill og Ishus

Hjemmeside og personale-system for **Mosede Havnegrill og Ishus**,
Havnevej 20I, 2670 Greve — smørrebrød, grill og is på Mosede Havn.

Bygget af [Lesreg](https://lesreg.dk). Statisk side i ren HTML, CSS og
JavaScript. Ingen framework, intet build-step, ingen npm for at se siden.

## Status

| Del | Status |
|---|---|
| Databaseskema (`supabase/setup.sql`) | ✅ færdig, testet mod Postgres 16 |
| Adgangsregler (RLS) | ✅ testet: gæster kan læse, ikke skrive |
| Udgivelses-workflow | ✅ kører – siden er live |
| Forsiden | ✅ bygget efter designbundtet |
| Intro-animation | ✅ færdig – kører ved hvert besøg, godt 3 sekunder |
| Admin (personalets side) | ✅ færdig |
| Playwright-tests | ✅ 264 grønne (mobil + computer), 10 sprunget med vilje |
| `js/config.js` | ✅ anon-nøglen er lagt ind og kontrolleret |
| Åbningstider | ✅ bekræftet af kunden (10–20 alle dage) |
| Adressen | ⏳ kunden siger 20I, menukortet siger 20 – se nedenfor |
| Menukortet | ✅ 14 kategorier, 151 varer fra kundens eget kort |
| Fotografier og film | ✅ fire fotos, turen forbi lugerne i hero, og isfilmen |
| Vandtemperatur og vind | ⏳ ingen kilde endnu – felterne er tomme og skjulte |
| Fire priser med "ca." | ⏳ skal bekræftes – se nedenfor |
| Forretningens navn | ✅ Mosede Havnegrill og Ishus, bekræftet af kunden |
| Prøvet mod den rigtige database | ⏳ ikke gjort |

## Filer

| Fil | Formål |
|---|---|
| `index.html` | Hele kundesiden – én lang side |
| `admin.html` | Personalets side |
| `css/style.css` | Hele designet, ét sted |
| `js/store.js` | Datalag – Supabase eller localStorage |
| `js/side.js` | Forsidens opførsel og data |
| `js/intro.js` | Intro-animationen |
| `js/baad.js` | Båden i bunden (rullemåler) |
| `js/config.js` | Forbindelsen til databasen |
| `fonts/` | Bebas Neue og Instrument Sans (52 KB) |
| `billeder/` | Fotos og video, klar til web (5,9 MB i alt) |
| `assets/` | Kilderne til isfilmen: opskrift, udklip og havnefoto. `assets/raa/` er kundens egne udklip, urørte |
| `vaerktoej/` | Småprogrammer der laver filerne i `billeder/` — bruges ikke af siden |
| `supabase/setup.sql` | Hele databasen, kør én gang |
| `supabase/menukort.sql` | Menukortet: 14 kategorier, 151 varer |
| `supabase/ret-oplysninger.sql` | Engangs-rettelse, se filens hoved |
| `tests/` | Playwright – 250 tests |

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
| `isfilm.mp4` / `.webm` | den tegnede isfilm | `assets/scoop-film.html` |
| `isfilm-poster.jpg` | stillbillede til isfilmen | slutbilledet, 9,9 s inde |

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

**Den er optaget til video, ikke lagt live på siden.** Live ville hver gæst
skulle hente halvanden megabyte udklip og lade telefonen regne slør og skygger
på fire lag i tolv sekunder. Som video er det én fil, den standser når man
ruller væk, og den ser ens ud i alle browsere.

Lav den om med:

```bash
python3 vaerktoej/lav-udklip.py     # udklippene, hvis du har ændret dem
node vaerktoej/lav-isfilm.js        # selve filmen
```

Posterbilledets tidspunkt bliver **tjekket** mod filmens længde. Det skal det,
fordi fejlen er lydløs: blev filmen kortere end tallet, søgte ffmpeg ud over
slutningen, skrev ingen billeder og sluttede pænt med kode 0 — og lod det gamle
posterbillede ligge. Resultatet var en ny film med et stillbillede fra den
gamle, og intet der sagde det.

#### Udklippene: hvordan de bliver skåret ordentligt

`vaerktoej/lav-udklip.py` læser kundens egne udklip fra `assets/raa/` og skriver
de færdige til `assets/`. Råfilerne bliver aldrig rørt, så resultatet er det
samme hver gang. Tre ting bliver gjort, og rækkefølgen betyder noget:

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

Til sidst forlænges ærmet på hånden, som ellers bliver klippet af i en snorlig
linje der kommer til syne når kameraet zoomer ud. De nederste **faste** rækker
strækkes — ikke de nederste rækker med noget i: de sytten sidste er en lodret
udtoning fra alfa 250 til 134, og strækkes de, bliver ærmet en halvgennemsigtig
stribe med en synlig streg hvor den begynder.

#### Udsigten

Havnefotoet er kundens billede af terrassen: borde, parasoller og bådene i
solnedgang. Det ligger 5504×3072, altså præcis 16:9, og filmen viser det i
1920×1072 — ingen beskæring.

Sløret bag navnet er **lettet** fra `.08/.24/.52/.72` til `.06/.19/.42/.60` da
fotoet blev skiftet. Højre side af det nye billede er mørkere af sig selv, både
parasollen og bådene, så navnet lå på 5,6:1 mod et krav på 3,0. Det er margin
man kan give tilbage til billedet i stedet for at lade den stå ubrugt. Der blev
lettet i to skridt: `.05/.15/.34/.50` gav 3,68:1, og 23% margin er for lidt til
at holde til at nogen skifter fotoet igen. Nu ligger navnet på 4,4:1.

#### Hvorfor målingen sker på opskriften og ikke på videoen

Teksterne er **brændt ind i** filmen. Måler man videoens pixels, måler man den
hvide skrift mod sig selv og får 1,09:1 hver gang — første udgave af testen
gjorde præcis det. `assets/scoop-film.html` kan derimod tegne det samme øjeblik
med teksterne slået fra, og så er det baggrunden alene der bliver målt. Det er
baggrunden der afgør om skriften kan læses.

`tests/isfilm.spec.js` gør det for alle tre tekster — navnet 4,39:1, underlinjen
4,51:1, åbningslinjen 12,57:1 — og en fjerde test sammenligner videoens længde
med opskriftens, så målingen ikke kan bestå på en rettet opskrift mens gæsterne
stadig ser en gammel video.

Målingen var i øvrigt selv forkert i en periode: et skærmbillede klippes mod
**vinduet**, ikke mod siden, så titelfeltet ved x=1070-1770 blev stille og
roligt beskåret til 1070-1280 i et vindue på 1280 px. Det kom for dagen da en
tekst blev flyttet helt uden for vinduet og Playwright svarede "clipped area is
outside the image" i stedet for at give et forkert tal.

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

Den kører **ved hvert besøg og hver genindlæsning**. Kunden har bedt om det.

Det er en ændring med en pris, og prisen er betalt: da introen kun kom én gang
pr. fane, varede den 4,8 sekunder. Skal den komme hver gang, må den ikke koste
så meget, så tidslinjen er skåret til **godt 3 sekunder** — samme koreografi,
alle faser er der, de går bare hurtigere. "Spring over" og Escape virker fra
første billede, og CSS-nødudgangen er rykket fra 9 til 6 sekunder, så den
stadig ligger et stykke efter den normale slutning i stedet for en evighed
efter.

Den kører **slet ikke** hvis gæsten har slået reduceret bevægelse til.

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
- **Båden i bunden er slået fra** under 640 px. Den er 76 px høj og fast i
  bunden, så den ville ligge oven på indholdet hele tiden.

`tests/telefon.spec.js` holder det på plads.

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
