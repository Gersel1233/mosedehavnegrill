---
name: test
description: Kør testrunden i en rigtig browser, før noget udgives. Brug den efter hver ændring og ALTID før et push — udgivelsesgrenen går direkte i luften. Forklarer også hvordan man skriver en ny test her (den SKAL ses fejle), og hvordan man afgør om en fejlende test er en fejl i siden eller i testen.
---

# Test, før noget går live

Et push til `claude/lesreg-customer-setup-5atpuu` går direkte i luften hos en
rigtig forretning. Suiten er det, der står mellem en halv rettelse og en gæst,
der ikke kan bestille sin mad.

## Kør det

```bash
npx playwright test                       # hele suiten, mobil + computer
npx playwright test tests/admin.spec.js   # én fil
npx playwright test -g "kurven"           # navne der matcher
npx playwright test --project=computer    # kun den ene profil
```

Suiten starter selv sin server på **port 4173**. To fælder omkring den:

- **Hænger en fremmed proces på 4173**, fejler alt med `Process from
  config.webServer was not able to start`. Find den og dræb den — og brug
  selv 4175 til manuelle kig (se `/se-siden`).
- Hele runden tager **~25 minutter**. Kør den i baggrunden til en logfil, og
  kør de berørte filer forfra imens, hvis du har travlt. Før et push er det
  HELE runden, der gælder.

Prøvenavne skrives **på dansk** og siger, hvad der er sandt, når de består —
`'en levering bekræftes aldrig automatisk'`, ikke `should confirm order`.
Ejeren skal kunne læse resultatet.

## En ny test skal SES fejle

Reglen står i CLAUDE.md, og den er ikke til pynt: **genindfør fejlen
bagefter, og se testen falde.** En regel, der ikke kan fejle, måler
ingenting. Det er ikke teori — testen "siden kan ikke rulles sidelæns" bestod
engang med en stribe på 900 px på en skærm på 390, fordi begge dens tal kom
fra det, den målte på. **Et af tallene skal komme udefra.**

Måden: gør ændringen om med `git stash` eller en målrettet
Python-erstatning, kør testen, se den falde, læg ændringen tilbage. Skriv i
commit-beskeden, at den er set fejle.

Tre lokale vaner, der bærer suiten:

- **Mål den BEREGNEDE stil**, ikke klassen — en klasse, der ikke slår
  igennem, er ingen regel. Og mål på begge sider, når en regel er scopet
  (`body.personale` mod gæstesiden).
- **Læs det, browseren GØR**, ikke det elementet siger om sig selv: tæl
  sendte forespørgsler frem for at spørge om `loading`-attributten; brug
  `naturalWidth`, ikke `complete`, til "billedet kom frem".
- **Lister læses af mappen**, ikke skrevet af i hånden (`siderMedFooter()`,
  favicon-prøven) — en ny side skal ikke kunne slippe forbi.

## Fejler en test — er det siden eller testen?

Rul dine ændringer væk og kør testen igen:

```bash
git stash push -- <de filer du har rettet>
npx playwright test tests/den-der-fejler.spec.js
git stash pop
```

Fejler den også uden dine ændringer, er testen forældet — ikke siden. Det er
sket flere gange her:

- to gamle tests klikkede direkte i notefeltet, efter noten var blevet
  foldet sammen — de skulle åbne `.note-fold > summary` først
- en prøve ventede på `.kat-hoved`, som ikke findes på et stort menukort,
  før nogen åbner en fold — vent på `#menu-status` i stedet
- en prøve krævede, at `.social`-striben forsvandt med de døde links — men
  "Musik på havnen" er et rigtigt link og skal netop blive stående
- prøven "uden slags bliver designets plads stående" beskyttede en stiplet
  grå kasse; reglen blev lavet om 29/8, og prøven blev vendt MED en note om
  hvorfor

**Ret testen, ikke koden — men skriv hvorfor** i prøvens egen kommentar, så
det ikke ligner, at en fejl blev gemt væk. Og er reglen bag testen en aftale
med kunden (rækkefølgen på forsiden, ingen opdigtede tal), så er det IKKE
testen, der er forældet — så er det ændringen, der skal rulles tilbage.

## Parkerede og sprungne prøver

- `tests-gamle/` er prøver bundet til den GAMLE forside — Playwright kører
  dem ikke, grundene står i mappens README. De slettes ikke: flere skal
  genopstå mod de nye sider (bl.a. vagten over opdigtede tal).
- Enkeltprøver i blivende filer er skippet med sætningen
  *"forsiden er skiftet ud (23/8)"* — én grep finder dem alle.
- ~54 springes designet over (telefonmålinger i computerprofilen m.m.).
  **0 fejlede er kravet; antallet af sprungne må ikke vokse uforklaret.**

## Før du pusher til udgivelsesgrenen

- [ ] HELE runden er grøn — ikke kun de filer, du har rørt
- [ ] Nye prøver er set fejle med fejlen genindført
- [ ] Du har **kigget på et billede** af det, du har lavet (`/se-siden`) —
      på en telefon-profil, hvis det er gæstesiden
- [ ] CLAUDE.md/README er opdateret, hvis der kom en regel eller et ar til
- [ ] Efter push: vent på deploy og tjek versionsstemplet på den udgivne
      side (`curl -s https://gersel1233.github.io/mosedehavnegrill/ | grep -oE 'v=[0-9a-f]{7}'`)

Og skriv i commit-beskeden, hvad der blev målt — på dansk, så det kan læses
om et halvt år.
