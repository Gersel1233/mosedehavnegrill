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
| Fotografier og film | ✅ tre fotos, turen forbi lugerne i hero, og isfilmen |
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
| `assets/` | Kilderne til isfilmen: opskrift, havnefoto og udklip. `assets/raa/` er kundens egne udklip, urørte |
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

### Isfilmen: tegnet, ikke filmet

Afsnittet **Isen** har en 12,1 sekunders film: tre kugler hopper op i keglen,
og så trækker billedet sig tilbage og viser solnedgangen over havnen bag den.
Overskriften siger pointen — *Du kommer for isen. Du bliver for udsigten.*

Filmen er bygget af fem udklip fra kundens egne fotos (`assets/`) og et
havnefoto. Opskriften er `assets/scoop-film.html`, og den kommer fra
designprototypen; matematikken er kopieret ord for ord.

**Den er optaget til video, ikke lagt live på siden.** Live ville hver gæst
skulle hente halvanden megabyte udklip og lade telefonen regne slør og
skygger på fire lag i tolv sekunder. Som video er det én fil på 959 kB, den
standser når man ruller væk, og den ser ens ud i alle browsere.

Lav den om med:

```bash
node vaerktoej/lav-isfilm.js
```

Den tegner 363 enkeltbilleder, koder dem til MP4 og WebM og klipper
posterbilledet ud af den færdige MP4. Der optages **ikke** mens filmen kører:
billede nummer *n* er altid *n*/30 sekunder inde, uanset hvor lang tid
maskinen bruger på at tegne det. Ellers ville hoppene blive rykvise hver gang
maskinen fik travlt.

#### Fire afvigelser fra prototypen, alle nødvendige

1. **Havnefotoet dækkede ikke.** `inset: auto` stod efter `left`/`top` i
   prototypens stil. `inset` er en genvej for alle fire sider, så den slettede
   dem igen, og fotoet lå i øverste venstre hjørne i stedet for at dække.
2. **Sløret er vendt om.** Prototypen lagde det mørkeste i venstre side og lod
   højre side være næsten klar — men titlen står i højre side, og på det her
   foto er højre side solnedgangens lyseste hjørne. Hvid skrift målte 1,07:1.
   Nu er sløret mørkest til højre, og navnet ligger på 4,17:1.
3. **Underteksten er flyttet.** Prototypen satte den midt for, nederst. Dér
   står hånden med keglen, så teksten landede oven på en mørkerød ærme: 1,16:1.
   Den står nu i det tomme sand i højre side, på 5,66:1, og i blækblå i stedet
   for cremehvid — for baggrunden er lys netop i de sekunder.
4. **Ærmet er forlænget.** Udklippet af hånden blev klippet af i en snorlige
   linje ved billedets kant. Når kameraet zoomede ud, kom kanten til syne, og
   billedet så ud som det det er: et udklip lagt oven på noget andet.
   `vaerktoej/forlaeng-aerme.py` strækker de nederste ti rækker ned, så ærmet
   fortsætter ud af billedet.

#### Hvorfor målingen sker på opskriften og ikke på videoen

Teksterne er **brændt ind i** filmen. Måler man videoens pixels, måler man
den hvide skrift mod sig selv og får 1,09:1 hver gang — første udgave af
testen gjorde præcis det. `assets/scoop-film.html` kan derimod tegne det
samme øjeblik med teksterne slået fra, og så er det baggrunden alene der
bliver målt. Det er baggrunden der afgør om skriften kan læses.

`tests/isfilm.spec.js` gør det for alle tre tekster, og en fjerde test
sammenligner videoens længde med opskriftens — ellers kunne målingen bestå på
en rettet opskrift, mens gæsterne stadig ser en gammel video.

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
