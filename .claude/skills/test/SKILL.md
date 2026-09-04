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

Suiten starter selv sin server på **port 4173**. Tre fælder omkring den:

- **Hænger en fremmed proces på 4173**, fejler alt med `Process from
  config.webServer was not able to start`. Find den og dræb den — og brug
  selv 4175 til manuelle kig (se `/se-siden`).
- Hele runden tager **~25 minutter**. Kør den i baggrunden til en logfil, og
  kør de berørte filer forfra imens, hvis du har travlt. Før et push er det
  HELE runden, der gælder.
- **⚠️ START IKKE EN BROWSER MED, MENS RUNDEN KØRER** — hverken
  `/se-siden` eller et eget Playwright-script. 4/9 døde serveren på 4173
  midt i en shard, og de resterende ~500 prøver faldt med
  `ERR_CONNECTION_REFUSED`: 70 røde, der ikke havde noget med koden at
  gøre. En rød runde, man ikke kan stole på, er værre end ingen runde.

**⚠️ OG RUNDEN KAN AFBRYDES AF MILJØET** (2/9). Containeren blev
genstartet **fire gange** midt i en fuld runde, og hver gang var
26 minutters arbejde væk — inklusive et resultat, der var på vej.
Svaret er ikke at køre den igen og håbe: det er at gøre den
**genoptagelig**. Én prøvefil ad gangen, ét resultat gemt pr. fil
i scratchpad'en, og et nyt kald springer det over, der allerede
står:

```bash
for f in tests/*.spec.js; do
  n=$(basename "$f" .spec.js)
  [ -s "$S/$n.txt" ] && continue          # allerede kørt
  npx playwright test "$f" --reporter=line > "$S/$n.log" 2>&1
  tail -3 "$S/$n.log" | grep -E "passed|failed" > "$S/$n.txt"
done
```

Samme samlede tid, men en genstart koster højst den ene fil, der
var i gang. **Bidder på otte filer var ikke nok** — den ene bid
tog 8,5 minutter og nåede aldrig i mål.

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

**⚠️ COMMIT FØRST.** `git checkout -- <fil>` er den nemme måde at lægge
ændringen tilbage på — og den sletter alt ucommitteret i filen. Det er sket
**tre gange på én dag** (4/9): rettelsen røg, den tomme udgave blev
committet bagefter, og først den fulde runde opdagede det. Commit din
ændring, FØR du falsificerer; så er `git checkout --` netop det, den skal
være.

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
- [ ] Efter push: vent på deploy og tjek, at den er grøn

**⚠️ VERSIONSSTEMPLET KAN IKKE LÆSES HERFRA MERE (31/8).**
Forretningen har fået sit eget domæne: `gersel1233.github.io`
svarer **301 til `https://mosedehavnecafe.dk/`**, og det domæne
afvises af udgangsproxyen (`connect_rejected`, 403 på CONNECT —
samme spærring som spiis.dk). En `curl` mod stemplet svarer
derfor **tomt**, og tomt ligner "deployet kom aldrig".

Tjek Actions-kørslen i stedet — den siger, hvad der faktisk skete:

```
mcp__github__actions_list  method=list_workflow_runs
  owner=Gersel1233 repo=mosedehavnegrill
  workflow_runs_filter={"branch":"claude/lesreg-customer-setup-5atpuu"}
```

Find din egen commit-sha i listen og se `completed / success`.

Og skriv i commit-beskeden, hvad der blev målt — på dansk, så det kan læses
om et halvt år.
