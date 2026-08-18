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
- Udvikl på branchen `claude/lesreg-customer-setup-5atpuu`. Push aldrig andre
  steder hen. Lav ikke en pull request, medmindre der bliver bedt om det
- Workflowet udgiver fra **både `main` og feature-branchen** — et push går
  altså direkte i luften. Tænk over det, før du pusher noget halvt

### Mål det, i stedet for at tro det

Det her projekt har fundet flere fejl ved at måle end ved at læse. En regel,
der ikke kan fejle, måler ingenting: **når du skriver en test, så genindfør
fejlen bagefter og se testen fejle.** Gør du ikke det, ved du ikke, om den
virker.

Kør altid hele suiten før et push:

```bash
npx playwright test          # 464 tests, mobil + computer
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

**Fase 0 (flere forretninger i databasen) er færdig i koden** og pushet.
Se afsnittet "Flere forretninger i den samme database" i README.

**Men den er ikke kørt færdig i Supabase endnu.** Indtil den er:

- Siden filtrerer på `lokation_id`, men kolonnerne findes ikke i den kørende
  database → forsiden falder tilbage på nødmenuen (2 kategorier i stedet for
  151). Det retter sig, når SQL'en er kørt
- `bestillinger`-tabellen mangler helt: `setup.sql` er sidst kørt, **før**
  bestillingssystemet blev bygget. Smørrebrødsbestillingen har derfor aldrig
  virket i produktion

**Rækkefølgen er envejs** — `setup.sql` kan ikke køres efter `flerlejer.sql`:

```
setup.sql → flerlejer.sql → bremse.sql → menukort.sql → proev-flerlejer.sql
```

`setup.sql` overskriver `is_admin()` hver gang. Står pladsholderen i filen,
mister chefen sin adgang, og intet fejler undervejs.

---

## Planen herfra

| Fase | Hvad | Status |
|---|---|---|
| 0 | Flere forretninger i databasen, adgang pr. lokation, bremse på bestillinger | ✅ i koden, afventer at SQL'en køres |
| 1 | Del `admin.html` op — 804 linjer JavaScript ligger inline i ét `<script>` | næste |
| 2 | Forespørgselsmotor: **én** tabel `forespoergsler`, tre indgange (catering, baglokale, selskab), status ny → kontaktet → aftalt → afvist | |
| 3 | **Én** tabel `kalender` (arrangement / lukkedag / tidlig lukning), erstatter `lukkedage`. Migreres med de nuværende "er der åbent"-tests som sikkerhedsnet | |
| 4 | Frokostordning som abonnement — egen fase, egen pris | |

**Ikke nu:** MobilePay og bordbestilling. De er besluttet udskudt.

Fase 1 skal laves, før fase 2 lægger mere oven på admin.

---

## Det, ejeren stadig skal svare på

- **Er "book spisning" borde eller selskaber?** Er det selskaber, falder det
  sammen med fase 2, og vi sparer en hel fase. Spørg, før du bygger
- **Eget domæne.** Siden kører stadig på `gersel1233.github.io`
- **Husnummeret:** kunden siger 20I, menukortet siger 20
- Resten af listen "Ejeren skal bekræfte" nederst i README

---

## Om økonomien, hvis det kommer op

Lesreg er ikke timelønnet på det her. Prisen skal dække driften og give mening
— 700–1000 kr./md. er aftalt som rimeligt. Brug ikke tid på at regne
forretningsmodeller ud, med mindre der bliver spurgt direkte.
