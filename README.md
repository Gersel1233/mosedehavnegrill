# Mosede Havnegrill & Ishus

Hjemmeside og personale-system for **Mosede Havnegrill & Ishus**,
Havnevej 20, 2670 Greve — grillbar og ishus på Mosede Havn.

Bygget af [Lesreg](https://lesreg.dk). Statisk side i ren HTML, CSS og
JavaScript. Ingen framework, intet build-step, ingen npm for at se siden.

## Status

Fundamentet er lagt. Selve siden er ikke bygget endnu.

| Del | Status |
|---|---|
| Databaseskema (`supabase/setup.sql`) | ✅ færdig og testet mod Postgres 16 |
| Adgangsregler (RLS) | ✅ testet: gæster kan læse, ikke skrive |
| Udgivelses-workflow | ✅ kører – siden er live |
| Forside og menukort | ✅ færdige |
| Admin (personalets side) | ✅ færdig |
| Intro-animation | ✅ færdig |
| Playwright-tests | ✅ 152 grønne (mobil + computer) |
| `js/config.js` | ⏳ mangler anon-nøglen |
| Åbningstider og adresse | ⏳ skal bekræftes af kunden |
| Foto af havnen | ⏳ mangler – se nedenfor |

Uden anon-nøglen kører alt i **øvetilstand**: siden virker, men henter og
gemmer i browserens eget lager i stedet for databasen.

## Sådan ser det ud

Fed og grafisk. Store versaler i Bebas Neue, skarpe kanter, massive forskudte
skygger, priser i store tal. Marineblå, creme og rød deles med
intro-animationen, så det hele er én forretning; gul er handlingsfarven.

**Åbent-båndet er sidens første indhold** – før navnet og før billedet. De
fleste der googler en grillbar vil vide én ting: er der åbent nu. Gult =
åbent, rødt = lukket, mørkt med gult = lukker inden en halv time. Aldrig
farve alene: der står også altid ord.

### Skrifterne ligger i repoet

`fonts/bebas-neue.woff2` og `fonts/instrument-sans.woff2`, 44 KB tilsammen.
De hentes ikke fra Google. En telefon med dårligt signal nede ved vandet skal
ikke vente på et fremmed domæne, og siden må ikke gå i stykker hvis Google er
nede.

### Foto af havnen

Læg billedet i `billeder/` og skriv filnavnet i toppen af `css/style.css`:

```css
--hero-foto: url('../billeder/havnen.jpg');
```

Findes filen ikke, viser siden et diagonalt stribemønster i marineblå i
stedet. Der er altid et mørkt slør oven på, så den store overskrift kan
læses uanset hvor lyst billedet er.

## Intro-animationen

Havet stiger og fylder ordmærket op mens siden loader. Båd, is-sol, måger,
sprøjt. Alt tegnes i ét canvas – ingen billeder, ingen SVG. Matematikken er
porteret 1:1 fra designprototypen; rør ikke tallene uden at se den.

Den kører **kun ved første besøg i en fane** (`sessionStorage`), og slet ikke
hvis gæsten har slået reduceret bevægelse til i sit styresystem. Man kan altid
springe over med knappen eller Escape.

Fire ting er anderledes end i prototypen, og de står forklaret i toppen af
`js/intro.js`. Den vigtigste: prototypen tonede siden ind bagefter, hvilket
kræver at siden først skjules. Det gør vi ikke – fejlede scriptet, ville
gæsten stå med en tom side. Overlejringen dækker alligevel fuldstændigt.

Der er tre spærrer mod at animationen kan låse siden: den fjerner sig selv
fra DOM'en når den er færdig, `<noscript>` slår den fra hvis JavaScript er
slået fra, og en CSS-nødudgang lader den forsvinde efter 9 sekunder uanset
hvad JavaScript gør.

## Filer

| Fil | Formål |
|---|---|
| `index.html` | Kundesiden |
| `menu.html` | Menukortet |
| `admin.html` | Personalets side |
| `js/store.js` | Fælles datalag – localStorage eller Supabase |
| `js/intro.js` | Intro-animationen |
| `js/config.js` | Forbindelsen til databasen |
| `css/style.css` | Hele designet, ét sted |
| `fonts/` | Bebas Neue og Instrument Sans |
| `supabase/setup.sql` | Hele databasen, kør én gang |
| `tests/` | Playwright – 152 tests |

## Sådan sætter du databasen op

1. Åbn Supabase-projektet → **SQL Editor** → **New query**
2. Ret e-mailen i punkt 1 af `supabase/setup.sql` til personalets e-mail
3. Indsæt hele filen og kør den. Den kan køres igen uden at ødelægge data
4. **Authentication → Users → Add user** — samme e-mail, valgfri adgangskode,
   sæt hak i *Auto Confirm User*
5. **Project Settings → API** → kopiér nøglen under **anon / public**
   ind i `js/config.js`

⚠️ Kopiér kun **anon**-nøglen. `service_role`-nøglen ligger lige ved siden af
og springer alle adgangsregler over — den må aldrig i et repo.

## Sådan er databasen skruet sammen

Alt hvad personalet ændrer i hverdagen ligger i databasen, aldrig i koden:

- `lokationer` — adresse, telefon, beskrivelse. Der er én i dag, men tabellen
  er bygget til flere. Lokation nummer to er bare en ny række
- `aabningstider` — én række pr. ugedag pr. lokation
- `lukkedage` — ferie, personaledage, vinterlukning
- `menu_kategorier` / `menu_varer` — kategorier uden lokation er fælles for
  alle lokationer; sættes en lokation, findes kategorien kun der
- `nyheder` — nyt fra køkkenet
- `indstillinger` — dagens besked, sæson-tilstand, tekster på forsiden

**Kunderne skriver intet.** Der er ingen online bestilling i version 1, så
reglen er enkel: alle må læse, kun personalet må ændre.

## Tre lag validering

Alt der kan gå galt bliver tjekket tre gange — i formularen, i JavaScript-laget
og i databasen. Det sidste lag er det der ikke kan omgås. Databasen afviser
blandt andet negative priser, priser over 10.000 kr., tomme varenavne,
åbningstider hvor der lukkes før der åbnes, ugedage uden for 0–6, ugyldige
postnumre og samme lukkedag to gange.

Det er afprøvet, ikke bare påstået — se `supabase/setup.sql`.

## Udvikling og udgivelse

Udvikling sker på en feature-branch. Når den er god, merges den til `main`,
og workflowet i `.github/workflows/deploy.yml` udgiver siden på GitHub Pages.

Siden kan ses lokalt uden database — er `anonKey` tom i `js/config.js`,
kører alt videre i browserens eget lager.
