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
| Udgivelses-workflow | ✅ klar |
| `js/config.js` | ⏳ mangler anon-nøglen |
| Forside, menukort, admin | ⏳ ikke bygget |
| Playwright-tests | ⏳ ikke bygget |

## Filer

| Fil | Formål |
|---|---|
| `index.html` | Kundesiden |
| `admin.html` | Personalets side |
| `menu.html` | Menukortet |
| `js/store.js` | Fælles datalag — localStorage + Supabase |
| `js/config.js` | Forbindelsen til databasen |
| `supabase/setup.sql` | Hele databasen, kør én gang |

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
