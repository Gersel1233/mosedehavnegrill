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

### Mål det, i stedet for at tro det

Det her projekt har fundet flere fejl ved at måle end ved at læse. En regel,
der ikke kan fejle, måler ingenting: **når du skriver en test, så genindfør
fejlen bagefter og se testen fejle.** Gør du ikke det, ved du ikke, om den
virker.

Kør altid hele suiten før et push:

```bash
npx playwright test          # 466 tests, mobil + computer
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

**Fase 1 er færdig i koden** på branchen
`claude/lesreg-fase-1-admin-refactor-p7xqn9`: admin.html's 804 linjer
inline-JavaScript ligger nu i `js/admin/` med én fane pr. fil. Se
README-afsnittet "Personalesiden er delt op i js/admin/". En ny fane i
fase 2 er én ny fil plus ét script-tag **før** `login.js` — ikke mere
kode i admin.html.

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

## Planen herfra

| Fase | Hvad | Status |
|---|---|---|
| 0 | Flere forretninger i databasen, adgang pr. lokation, bremse på bestillinger | ✅ i koden **og i databasen** — 23 × BESTOD i Mosede-projektet 18/8 |
| 1 | Del `admin.html` op — 804 linjer JavaScript lå inline i ét `<script>` | ✅ i koden, på fase 1-branchen |
| 2 | Forespørgselsmotor: **én** tabel `forespoergsler`, tre indgange (catering, baglokale, selskab), status ny → kontaktet → aftalt → afvist | næste |
| 3 | **Én** tabel `kalender` (arrangement / lukkedag / tidlig lukning), erstatter `lukkedage`. Migreres med de nuværende "er der åbent"-tests som sikkerhedsnet | |
| 4 | Frokostordning som abonnement — egen fase, egen pris | |

**Ikke nu:** MobilePay og bordbestilling. De er besluttet udskudt — og
**"book spisning" er borde**, har ejeren svaret, så den hører til dér og
falder altså IKKE sammen med fase 2. Fase 2 er selskaber, catering og
baglokale.

Fase 1 er lavet, så fase 2 bygger oven på `js/admin/` — en ny fane er én ny
fil, ikke en længere blok i admin.html.

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
