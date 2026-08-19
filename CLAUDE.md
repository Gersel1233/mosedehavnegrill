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

### Hvem sidder med hvad

To modsatte prioriteringer, og de skal ikke blandes sammen:

- **Gæstesiden er telefon-først.** Gæsten står nede ved vandet med
  mobilen i hånden og vil vide, om der er åbent. Alt på `index.html`,
  `menu.html`, `smoerrebroed-ud-af-huset/` og `selskaber/` måles på en
  telefon først
- **Personalesiden er computer- og iPad-først.** Den bruges ved en skærm
  eller på en iPad i køkkenet. Den skal virke på en telefon, men den er
  ikke bygget til den. Derfor sidemenu fra 900 px og op

### Mål det, i stedet for at tro det

Det her projekt har fundet flere fejl ved at måle end ved at læse. En regel,
der ikke kan fejle, måler ingenting: **når du skriver en test, så genindfør
fejlen bagefter og se testen fejle.** Gør du ikke det, ved du ikke, om den
virker.

Kør altid hele suiten før et push:

```bash
npx playwright test          # 564 tests, mobil + computer
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

**Fase 2 er færdig — i koden OG i databasen.**
`supabase/forespoergsler.sql` er kørt i Mosede-projektet den 19. august
2026 (4 adgangsregler, 1 bremse), og `proev-forespoergsler.sql` skrev
**ALLE 23 AF 23 BESTOD**. Tabellen `forespoergsler`, adgangen pr.
forretning, bremsen, admin-fanen og siden `selskaber/` er dermed på
plads. Se README-afsnittet "Forespørgsler: catering, baglokale og
selskab".

**Men siden er ikke i luften endnu.** Fase 1 og 2 ligger på
`claude/lesreg-fase-1-admin-refactor-p7xqn9`, som workflowet ikke
udgiver. Databasen er klar; koden skal merges til `main` eller
`claude/lesreg-customer-setup-5atpuu`, før gæsterne kan bruge
`selskaber/`. Det er ufarligt at vente: en tom tabel, ingen skriver i,
gør ingen skade.

**Fase 3 er færdig i koden**: tabellen `kalender` med arrangementer,
lukkedage og tidlige lukninger, admin-fanen Kalender (som erstatter
Lukkedage), og lukkeperioder, der virker over flere dage. Kør
`supabase/kalender.sql` og derefter `supabase/proev-kalender.sql`, som
skal skrive **21 × BESTOD**. Se README-afsnittet "Kalenderen: ét sted
der ved, hvad der sker hvornår".

**Arrangementer vises ikke for gæsterne endnu.** Databasen kan det —
kolonnen `offentlig` og adgangsreglen er på plads og prøvet — men der er
ingen side, der viser dem. Det er en ren frontend-opgave, når den skal
laves, uden databaseændring.

**⚠️ Siden `selskaber/` lover med vilje INGENTING** om lokale, antal,
levering eller pris. Ingen af de ting er bekræftet af forretningen, og en
test slår ned på dem. Skal siden sige mere, skal ejeren først bekræfte
det — se listen nederst i README.

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

## Hvad ejeren har bestilt

Mikkel har aftalt hele opgaven med ejerne direkte. Det er ét system i
samme form som spiis.dk, og det er større end en hjemmeside:

- **administrerende app** — personalesiden, ét sted til det hele
- **smørrebrød takeaway**
- **book spisning** — det er **BORDE**, ikke selskaber
- **udleje af baglokale** — lokalet **findes**, det er ejerens eget ønske
- **levering af frokostordning** — de **leverer** (i hvert fald frokosten)
- **catering**
- **eventkalender** og **generel kalender**
- MobilePay: **ikke nu.** Besluttet 19/8 — brug ikke tid på at regne på det

**Spiis er forbillede, ikke kilde.** Vi må hverken læse eller kopiere fra
det repo (se advarslen øverst). Mikkel kan fortælle, hvad der virker dér;
koden skrives her.

### Det hele har den samme form

Det er værd at se, før man bygger noget nyt: smørrebrød, forespørgsler,
borde og lokaleudlejning er **det samme skelet**. En gæst skriver noget →
personalet ser det i admin → status går én vej → sagen er lukket. Gæsten
må skrive, men ikke læse. Bremsen er den samme. Prøven er den samme.

Derfor er en ny funktion ikke et nyt system. Det er en tabel, et sæt
adgangsregler, en prøve, en fil i `js/admin/` og en side. Afvig fra det
mønster, når der er en grund — ikke fordi det er nyt.

**Det ene, der er anderledes, er kalenderen.** Borde og baglokale kan
være **optaget**, og to gæster må ikke få ja til det samme. Derfor skal
kalenderen bygges før dem — ellers får vi to steder at holde styr på,
hvad der er ledigt, og det er præcis dér, dobbeltbookinger opstår.

---

## Planen herfra

| Fase | Hvad | Status |
|---|---|---|
| 0 | Flere forretninger i databasen, adgang pr. lokation, bremse på bestillinger | ✅ i koden **og i databasen** — 23 × BESTOD i Mosede-projektet 18/8 |
| 1 | Del `admin.html` op — 804 linjer JavaScript lå inline i ét `<script>` | ✅ i koden, på fase 1-branchen |
| 2 | Forespørgselsmotor: **én** tabel `forespoergsler`, tre indgange (catering, baglokale, selskab), status ny → kontaktet → aftalt → afvist | ✅ i koden **og i databasen** — 23 × BESTOD 19/8 |
| 3 | **Én** tabel `kalender` (arrangement / lukkedag / tidlig lukning), erstatter `lukkedage`. Er samtidig event- og driftskalenderen, og fundamentet under fase 4 og 5 | ✅ i koden; SQL'en mangler at blive kørt |
| 4 | **Bordbestilling** ("book spisning") — oven på kalenderen. Gæsten spørger, personalet bekræfter; antal pladser sættes i admin | **næste** |
| 5 | **Udlejning af baglokalet** — som fase 4, men **eksklusivt**: én udlejning optager lokalet den dag | |
| 5b | **Salg** — omsætning af AFHENTEDE bestillinger, mest solgte varer. Samme idé som spiis: det tæller først, når maden er ud ad døren | ✅ i koden |
| 5c | **Push** — Database Webhook → Edge Function. Opskriften står i README under "Push: sådan siger telefonen til" | |
| 6 | **Frokostordning som abonnement** — det, der reelt er anderledes: tilbagevendende levering, pauser, helligdage. Egen fase, egen pris | |

**Udskudt:** MobilePay. Betaling online trækker refusioner, kvitteringer
og bogføring med sig, og ejeren har ikke bedt om det endnu.

Fase 1 er lavet, så alt det herover bygger oven på `js/admin/` — en ny
fane er én ny fil, ikke en længere blok i admin.html.

**Hold øje med antallet af faner.** Der er fire nu, og der kommer tre
mere. Bliver personalesiden en række af lister, man skal huske at kigge i,
er det tid til én indbakke med filtre — ikke syv faner med hver sit tal.

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
