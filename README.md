# Mosede Havn Smørrebrød, Grill & Ishus

Hjemmeside og personale-system for **Mosede Havn Smørrebrød, Grill & Ishus**,
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
| Intro-animation | ✅ færdig |
| Admin (personalets side) | ✅ færdig |
| Playwright-tests | ✅ 232 grønne (mobil + computer) |
| `js/config.js` | ✅ anon-nøglen er lagt ind og kontrolleret |
| Åbningstider og adresse | ✅ bekræftet af kunden (10–20, Havnevej 20I) |
| Menukortet | ✅ 14 kategorier, 151 varer fra kundens eget kort |
| Fotografier og film | ✅ tre fotos, hero-loop og en montage |
| Vandtemperatur og vind | ⏳ ingen kilde endnu – felterne er tomme og skjulte |
| Fire priser med "ca." | ⏳ skal bekræftes – se nedenfor |
| Forretningens navn | ⏳ tre varianter i omløb – se nedenfor |
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
| `fonts/` | Bebas Neue og Instrument Sans (44 KB) |
| `billeder/` | Fotos og video, klar til web (3,4 MB i alt) |
| `supabase/setup.sql` | Hele databasen, kør én gang |
| `supabase/menukort.sql` | Menukortet: 14 kategorier, 151 varer |
| `supabase/ret-oplysninger.sql` | Engangs-rettelse, se filens hoved |
| `tests/` | Playwright – 232 tests |

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
| `facade-*.jpg` | hero, tre størrelser | 5504×3072, 8,4 MB |
| `kager-*.jpg` | kage-afsnittet | 3072×5504, 8,2 MB |
| `molen-*.jpg` | billedet i fuld bredde | 3072×5504, 8,4 MB |
| `havnen.mp4` / `.webm` | hero-loopet: facaden alene | udklip 0–2,85 s |
| `montage.mp4` / `.webm` | filmen i eget afsnit | hele klippet, 9,5 s |
| `havnen-poster.jpg` | posterbillede til hero | første billede |
| `montage-poster.jpg` | posterbillede til filmen | kagerne, 6 s inde |

### Videoen er delt i to, og det er ikke en smagssag

Den rå video er en montage: facaden, en kugleis, kagerne, churros, en
boblevaffel. Lagde man den hele bag overskriften, ville teksten stå på en **lys
vaniljekugle**. Målt: 2,0:1, hvor kravet til stor tekst er 3,0:1.

Derfor:

- **Heroen** bruger kun facade-panoreringen, 0–2,85 s. Den er mørk og rolig.
  Klippet er lagt spejlvendt bagefter sig selv, så kameraet vender om i stedet
  for at hoppe når loopet starter forfra.
- **Montagen** har fået sit eget afsnit uden tekst hen over. Der er maden det
  man skal se.

Sløret over heroen er samtidig styrket fra prototypens `.25` til `.40` på
midten. Med `.25` lå overskriften på 2,1:1 selv over facaden — den lyse himmel
og den hvide bygning kommer ind bag teksten når kameraet panorerer. Med `.40`
er værste tilfælde 4,0:1.

`tests/kontrast.spec.js` måler det på **hvert billede i den rigtige video**
mens den spiller. Skiftes videoen til noget lysere, fælder testen byggeriet.
Målingen sker på et 64×36 lærred, altså sløret ned til bredden af en
bogstavstreg: en lys plet der er smallere end stregen forhindrer ikke at man
læser bogstavet, men en lys flade på stregens størrelse gør.

Montagen **hentes ikke** før man nærmer sig afsnittet — 1,1 MB skal ikke koste
data hos nogen der aldrig ruller derned. Den standser når den ruller ud af
syne, og med reduceret bevægelse eller sparetilstand hentes den slet ikke; så
kommer der en knap i stedet.

De ubearbejdede kamerafiler er **ikke** i repoet. De ligger i historikken på
commit `c05b208` hvis de skal frem igen — 25 MB skal ikke hentes ned hver gang
nogen kloner. `original/` er i `.gitignore`.

**EXIF er strippet.** Kamerafilerne indeholdt GPS-position, enhedsoplysninger
og C2PA-signaturer. Det skal ikke ligge offentligt på en hjemmeside.

**Videoen har ingen lyd.** Browsere må kun starte tavse videoer af sig selv,
og uden lydspor blev filen mindre. 4,1 MB → 813 kB.

**MP4 står før WebM** i kildelisten. Browseren tager den første den kan
spille, og H.264-udgaven er både mindre (813 kB mod 864 kB) og understøttet
overalt. WebM'en er til de få browsere der er bygget uden H.264 — blandt andet
den Chromium testene kører i, hvilket er grunden til at videoen overhovedet kan
afprøves her.

Videoen hentes **ikke** hvis gæsten har slået reduceret bevægelse til, eller
har bedt sin telefon om at spare data. Stillbilledet ligger altid nederst, så
en video der ikke vil starte efterlader aldrig et sort hul.

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

### Forretningens navn: tre varianter

| Kilde | Navn |
|---|---|
| Forretningens eget menukort | Mosede Havn Smørrebrød, Grill & Ishus |
| Skiltet på facaden (se `billeder/facade-*.jpg`) | MOSEDE HAVN – Grill & Kiosk |
| Facebook | Mosede havn grill & Ishus |

Siden bruger menukortets navn, fordi det er forretningens eget dokument.
**Ordmærket i intro-animationen siger stadig "MOSEDE / HAVNEGRILL & ISHUS"** —
det skal rettes i `js/intro.js` når kunden har valgt én variant.

Samme sag med adressen: menukortet skriver `Havnevej 20`, kunden har oplyst
`Havnevej 20I`. Siden bruger 20I.

## Intro-animationen

Havet stiger og fylder ordmærket op mens siden loader. Båd, is-sol, måger,
sprøjt. Alt tegnes i ét canvas — ingen billeder, ingen SVG. Matematikken er
porteret 1:1 fra designprototypen; rør ikke tallene uden at se den.

Den kører **kun ved første besøg i en fane** (`sessionStorage`), og slet ikke
hvis gæsten har slået reduceret bevægelse til. Man kan altid springe over med
knappen eller Escape.

Tre spærrer mod at den kan låse siden: den fjerner sig selv fra DOM'en når den
er færdig, `<noscript>` slår den fra hvis JavaScript er slået fra, og en
CSS-nødudgang lader den forsvinde efter 9 sekunder uanset hvad JavaScript gør.

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

214 tests i rigtig Chromium, på både mobil og computer.

`tests/kontrast.spec.js` er værd at kende: den **regner WCAG-kontrast efter i
browseren** i stedet for at stole på øjet. Den lægger halvgennemsigtige lag
oven på hinanden, både baggrundene og tekstens egen farve — ellers kan man
ikke måle et design bygget på glas. Tekst der ligger oven på et foto måles mod
det værst tænkelige billede: sløret lagt over noget helt hvidt.

Filen har sin egen kontroltest, så de øvrige ikke kan "bestå" fordi måleren er
i stykker.

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
