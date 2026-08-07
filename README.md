# Mosede Havnegrill & Ishus

Hjemmeside og personale-system for **Mosede Havnegrill & Ishus**,
Havnevej 20I, 2670 Greve — grillbar og ishus på Mosede Havn.

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
| Playwright-tests | ✅ 194 grønne (mobil + computer) |
| `js/config.js` | ✅ anon-nøglen er lagt ind og kontrolleret |
| Åbningstider og adresse | ✅ bekræftet af kunden (10–20, Havnevej 20I) |
| **Fotografier** | ⏳ mangler – alle billeder er stribede pladsholdere |
| Vandtemperatur og vind | ⏳ ingen kilde endnu – felterne er tomme og skjulte |
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
| `supabase/setup.sql` | Hele databasen, kør én gang |
| `supabase/ret-oplysninger.sql` | Engangs-rettelse, se filens hoved |
| `tests/` | Playwright – 194 tests |

## Sådan sætter du databasen op

1. Åbn Supabase-projektet → **SQL Editor** → **New query**
2. Ret e-mailen i punkt 1 af `supabase/setup.sql` til personalets e-mail
3. Indsæt hele filen og kør den. Den kan køres igen uden at ødelægge data
4. **Authentication → Users → Add user** — samme e-mail, valgfri adgangskode,
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
- **Bag citatet** i fuldbredde-billedet. Prototypen holdt det læsbart med en
  `text-shadow` alene, og en skygge tæller ikke som kontrast.

### Fotografierne

Alle billeder er stribede pladsholdere med en etiket der siger hvad der skal
ind. **Striberne må ikke udgives** — de skal erstattes.

Hero-fotoet sættes ind ved at lægge filen i `billeder/` og fjerne kommentaren
i toppen af `css/style.css`:

```css
--hero-foto: url('../billeder/havnen.jpg');
```

⚠️ **Hero-fotoet og luge-fotoerne skal være mørke i den nederste tredjedel**,
hvor teksten står. Sløret ovenpå er regnet til at holde hvid tekst læsbar, men
et helt lyst billede med tekst hen over vil stadig være svært at læse.
Handoff'et siger det samme: *"dark-ish, room for type at the bottom-left"*.

## Hvad der IKKE står på siden

Prototypen havde eksempelværdier som ser ud som fakta: 18,4 °C i vandet,
4 m/s NØ, "siden 1972", "54 somre på Mosede Havn". Ingen af dem er bekræftet,
og en hjemmeside der lyver om vandtemperaturen er værre end en der ikke nævner
den.

Derfor: **vandtemperatur, vind, dagens landing og de fire nøgletal er tomme,
og felterne skjuler sig selv når de er tomme.** De udfyldes i admin under
fanen **Forside**.

Solnedgangen er den ene undtagelse — den **regnes ud** for havnens position
(55,585° N, 12,283° Ø), så den er altid rigtig uden at nogen skal skrive noget.
Kontrolleret: 7. august 2026 giver 21:05, hvilket stemmer med soltider.dk.

Vandtemperatur og vind bør på sigt komme fra DMI's åbne data i stedet for at
blive tastet ind.

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

194 tests i rigtig Chromium, på både mobil og computer.

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
