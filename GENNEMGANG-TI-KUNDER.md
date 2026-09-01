# Ti kunder gik siden igennem — 1. september 2026

Mikkel bad om ti fiktive kunder, en tur gennem siden **og admin**, og en
skriftlig rapport over de huller, der blev fundet.

## Sådan blev det målt

Hver kunde er en rigtig browser (Chromium via Playwright), der klikker sig
gennem sit ærinde som et menneske: iPhone 13 for gæsterne, iPad og computer
for personalet. For hver tur er der optaget JS-fejl, døde kald,
skærmbilleder og hvad der faktisk landede i databasen.

**⚠️ To ting, du skal vide om metoden, før du læser resten:**

1. **Turen er kørt lokalt i øvetilstand, ikke på mosedehavnecafe.dk.**
   Udgangsproxyen i mit miljø afviser domænet, så jeg kan ikke åbne den
   udgivne side. Koden er den samme (commit `bce3e48`), men jeg har ikke
   set produktionen med egne øjne.
2. **Dataene er formet som DIN database er lige nu** — altså UDEN
   `bord-loft-pr-dag.sql`, `bord-uden-telefon.sql`, `vare-billede.sql` og
   `smoerrebroed-forespoergsel.sql`, som ikke er kørt endnu. Det er dét,
   gæsten møder i dag, og det er dér, det første hul sidder.

**Og to gange målte jeg forkert, før jeg målte rigtigt** — det står med, så
tallene kan efterprøves:

- Jeg konkluderede, at Bo's bestilling "ikke blev sendt". Den blev sendt
  fint: knappen er **to trin** (første tryk viser kigget, andet sender), og
  jeg klikkede én gang.
- Jeg konkluderede, at tapassidens "Bestil tapas" var skjult.
  `offsetParent` er **null for `position: fixed`** — knappen var der hele
  tiden. Et skærmbillede afgjorde det.

---

## De ti kunder

| # | Hvem | Ærinde | Resultat |
|---|---|---|---|
| 1 | **Bo, 34** | Sidder ved bord 7, sulten, vil ikke taste nummer | ⚠️ Hul 1 |
| 2 | **Marianne, 61** | Bord til 6 i aften | ✅ Booket, kvitteringen lover bordet |
| 3 | **Lars, HR** | Frokost hver onsdag til 25 | ✅ Landede som forespørgsel, 0 bestillinger |
| 4 | **Anna** | Sølvbryllup, 70 gæster, dato ukendt | ✅ Kom igennem uden dato |
| 5 | **Pia** | 20 stk. smørrebrød ud af huset | ✅ Sendt |
| 6 | **Kasper** | Tapasfad til 12 på fredag | ⚠️ Hul 3 |
| 7 | **Grundejerforeningen** | Baglokalet til generalforsamling | ✅ Sendt (knappen hedder "Spørg om datoen") |
| 8 | **Sofie** | Står ved vandet, er der åbent? | ⚠️ Hul 4 |
| 9 | **Malou**, ny medarbejder | Første vagt på iPad | ✅ Ét tryk på Færdig virker |
| 10 | **Ejeren**, tirsdag aften | Alle 16 faner igennem | ✅ Ingen tomme faner, ingen JS-fejl |

---

## Hul 1 · 🔴 En bestilling fra bordet uden telefonnummer bliver afvist

**Kunde 1 (Bo).** Han sidder ved bord 7, vælger to sandwich, skriver kun
sit navn og trykker send. Klienten lader ham — det var din egen beslutning
31/8: *"bare navn er ok, fordi de sidder der."*

**Målt:** bestillingen gemmes med `telefon: null`.

**Men `bord-uden-telefon.sql` er ikke kørt**, så kolonnen `telefon` er
stadig `not null` i din database. `null` i en `not null`-kolonne bliver
afvist, og Bo får en fejl, han ikke kan gøre noget ved: han HAR ikke et
felt at rette.

**Det er ikke en fejl i koden — det er koden, der er foran databasen.**
Hullet har været der siden 31/8.

**Sådan lukkes det:** kør
[`bord-uden-telefon.sql`](supabase/bord-uden-telefon.sql), derefter
`proev-bord-uden-telefon.sql` (skal skrive ALLE 8 AF 8 BESTOD).

---

## Hul 2 · 🟠 Fem gæstesider hentede en fil, der ikke findes — RETTET

**Målt på alle udgivne sider:** `index.html`, `h-smorrebrod.html`,
`m-tapas.html`, `h-baglokale.html` og `historien.html` fyrede alle
**`404 /.image-slots.state.json`** ved hver eneste indlæsning.

Filen er designværktøjets eget sidekatalog (`image-slot.js`), og den kan
**aldrig** findes i produktionen — komponenten siger det selv i sin egen
dokumentation. Billedpladserne fyldes i forvejen af
`js/skal/billedplads.js`.

Det er ikke farligt, men det er et spildt kald pr. sidevisning på en
telefon på mobildata, og det er støj i konsollen, der skjuler de fejl, der
betyder noget.

**Rettet:** komponenten henter kun sidekataloget, når designværktøjet
faktisk er der. En prøve i `tests/gennemgang.spec.js` læser **svarkoderne
fra browseren** — ikke koden — og er set fejle på fire sider.

---

## Hul 3 · 🟠 Tapassiden lovede et varsel, den ikke holdt — RETTET

**Kunde 6 (Kasper).** Han vil have et fad til fredag. Siden sagde to
steder — i manchetten øverst og i faktalinjen — **"bestilles senest dagen
før"**. Fadets regel er **48 timer** (`TO_DAGE = 48` i
`js/skal/tapas.js`).

Han læser ét døgn, vælger i morgen, og dagvælgeren tilbyder den ikke.

**Det er tredje gang, samme fejl:** cateringens faktakort (30/8) og
smørrebrødets hero (31/8). Rettelsen er den samme: `[data-varsel]` fyldes
af **reglen**, og designets tekst er reserven. Ejerens eget tal
(`tapas_varsel_timer`) slår husets.

---

## Hul 4 · 🟠 Heroen sagde "åbent" to gange — RETTET

**Kunde 8 (Sofie).** Hun står ved vandet og vil bare vide, om der er
åbent. Pillen i heroen stod med:

> **ÅBENT NU · ÅBENT TIL KL. 21:00**

**Og rettelsen fandtes i forvejen.** `Butik.pilleTekst` har siden 28/8
kortet detaljen ned til *"til 21.00"*, og noten ved den siger ordret:
*"nu står den her, så alle tre sider skriver det samme."* Forsiden fra
designet blev bare aldrig den fjerde — den satte de to stykker sammen
selv.

Husets egen mest gentagne fejl: to kopier af én regel. To prøver holder
den nu — én tæller ordet, én sammenligner med det, reglen giver.

---

## Det, der VIRKER — og som er værd at vide virker

- **Bo's kvittering** siger *"VI HAR DEN · Tak, Bo · Bestilt til bord 7 ·
  Bestillingsnummer #0001"* og at der ikke er betalt noget. Sidste kig før
  send viser mad, bord, "Serveres nu" og navn.
- **Marianne** får en booking med *"vi ses"* — ikke et løfte om et opkald.
- **Lars** (frokost hver uge) landede som **én forespørgsel og nul
  bestillinger**, med ugedage og hyppighed i detaljerne. Der blev ikke
  bygget et abonnement bag ryggen på nogen.
- **Anna** kom igennem **uden en dato** — det er den forespørgsel, der er
  mest værd, og den blev engang tavst afvist.
- **Malou** kunne trykke **Færdig én gang** på en bestilling i Overblik, og
  produktionslisten viste **ingen "Emballage"** (rettelsen fra i går
  holder).
- **Ejeren** gik alle **16 faner** igennem uden en eneste JS-fejl. Tre
  faner har ingen knapper — Tilmeldinger, Forside og Historik — og alle
  tre er ægte tomme tilstande, der siger hvad man gør i stedet.

---

## Det, der stadig står som designets pladsholdere

Ikke fejl — dine egne beslutninger fra 23/8 — men de står stadig i luften
og lover noget på forretningens vegne:

| Side | Påstand |
|---|---|
| `h-baglokale.html` | "60 stående", "1.200", "2.000" |
| `h-frokost.html` | "59 kr. pr. medarbejder" |
| `m-tapas.html` | "199 kr. pr. person", "548 kr. for 2 personer" |

Beder et firma om et tilbud og får 75 kr., har siden lovet noget andet.

---

## Hvad du skal gøre

1. **Kør `bord-uden-telefon.sql`** — det lukker hul 1, som rammer hver
   eneste QR-bestilling uden et nummer
2. Kør resten af rækkefølgen: `smoerrebroed-forespoergsel.sql`,
   `vare-billede.sql`, `bord-loft-pr-dag.sql` (+ dens prøve)
3. Sig til om pladsholder-tallene — de kan skiftes til dine egne på fem
   minutter, eller tages helt af siden

Hul 2, 3 og 4 er rettet og udgivet.
