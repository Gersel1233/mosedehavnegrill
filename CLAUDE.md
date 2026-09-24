# Sådan arbejder vi på det her projekt

Hjemmeside og personalesystem for **Mosede Havnecafe** — is, smørrebrød og mad
på Mosede Havn i Greve. Bygget af **Lesreg** (Mikkel Gersel). Solgt og
overleveret 15/9 2026: 1.150 kr./md., 12 måneders binding.

Filen her er kun det, der ændrer, **hvordan du arbejder**. Alt andet står i:

| Fil | Hvad |
|---|---|
| `docs/HISTORIK.md` | Hvad der er bygget, målt og besluttet — dag for dag, nyeste øverst. Slå op her, før du ændrer noget, der har en historie |
| `docs/ARBEJDSREGLER.md` | De lange udgaver af reglerne nedenfor, med eksemplerne bag dem |
| `docs/SQL-RAEKKEFOELGE.md` | Rækkefølgen, SQL-filerne køres i, og hvad der skal køres igen efter hvad |
| `README.md` | Hvorfor tingene er skruet sammen, som de er |
| `LAERT-AF-SPIIS.md` | Fælder fra et søsterprojekt i drift — læs de fem første, før du bygger videre |
| `VEJLEDNING.md` | Til personalet, ikke til en udvikler |

Står der "se CLAUDE.md" i en kommentar fra før 15/9, står det nu i `docs/HISTORIK.md`
eller `docs/ARBEJDSREGLER.md` (ordret flyttet). **Ny status skrives øverst i
`docs/HISTORIK.md`, ikke her** — filen her læses ind ved hver session, og den må ikke
vokse til 12.000 linjer igen.

---

## ⚠️ RØR ALDRIG spiis

Repoet **`Gersel1233/oddsakademiet` ER spiis.dk** — en anden, betalende kunde.
Læs ikke i det, klon det ikke, push ikke dertil, og rør ikke Supabase-projektet
**`jhdlxexgrwvuoqetcgbt`**. Det er sket én gang (18/8: spiis' setup.sql kørt her;
oprydningen er `supabase/ryd-spiis-op.sql`).

Mosede er repoet **`Gersel1233/mosedehavnegrill`** og Supabase-projektet
**`epwyjzakvvbxtpvnhvbn`**. Intet andet. Brug Supabase-MCP'en og kør
`get_project_url` før SQL — den lokale Supabase-CLI er logget ind på en konto
med spiis og **ikke** Mosede (svarer 403).

---

## Kode

- **Ren HTML, CSS og JavaScript.** Intet framework, intet build-step
- **Kommentarer forklarer HVORFOR** — hvilken fejl reglen forhindrer. Skriv i samme tone
- **Dansk** i kode, kommentarer, commits og til brugeren
- **En regel bor ét sted** (`bestil-regler.js`, `Butik.*`, `Admin.*`). En kopi er en kommende fejl
- **Ingen hemmelige nøgler i klientkoden.** `service_role` aldrig i nærheden af `js/config.js`
- **Admin forbliver `noindex, nofollow`**
- Nye skrivefunktioner, som kun personalet bruger, hører i `js/store-skriv.js`, ikke `store.js`

## Udgivelse

- **⚠️ EN SKY-SESSION KLONER ÉN GANG OG FØLGER IKKE MED.** Kør
  `git rev-list --left-right --count origin/claude/lesreg-customer-setup-5atpuu...HEAD`
  **før du læser en linje kode** — står der et tal til venstre, måler du på et hus,
  der ikke findes mere (sket 24/9: 311 commits og elleve dage bagud, en hel dags
  arbejde kasseret)
- **Et push til `claude/lesreg-customer-setup-5atpuu` går direkte i luften** på
  mosedehavnecafe.dk. Push ikke andre steder hen, og lav ikke en PR uden at blive bedt om det
- **Små ændringer må gå direkte live. Større skal have et ja fra Mikkel først.**
  Er du i tvivl, er den stor
- **Brug ikke `/ship`, `/land-and-deploy` eller `/canary`** — de committer, pusher og
  udgiver selv og springer netop den vurdering over
- **Tjek bagefter, at det er landet:**
  `curl -s https://mosedehavnecafe.dk/?t=$(date +%s) | grep -oE 'v=[0-9a-f]{7}'` skal
  svare det samme som `git rev-parse --short=7 HEAD`
- **Deployet lægger hele mappen op.** Trinnet "Fjern udviklingsfiler" i
  `.github/workflows/deploy.yml` tager udviklingsfilerne af. **Kommer der en ny
  udviklingsfil eller -mappe i roden, skal den på den linje** — og linjen bruger
  `rm -rf`: simulér den først på en kopi (`git archive HEAD | tar -x -C kopi`), og
  se at `index.html` og `CNAME` står der bagefter. Værnet lige efter stopper deployet,
  hvis sidefilerne er væk — fjern det ikke

## Prøverne

- **Test kun det, du rører; kør den fulde runde én gang efter en samling ændringer**
  (`npx playwright test > runde.log 2>&1`, ~40 min). Udseende (CSS, tekst, billeder)
  må gå live efter et skud; hjernen (bestillinger, priser, regler, SQL) efter sine
  egne prøvefiler — og så den fulde runde
- **En ny prøve skal ses fejle.** Genindfør fejlen, se prøven falde, rul tilbage.
  Én af tallene i en prøve skal komme udefra, ellers måler den sig selv
- **Commit FØR du falsificerer**, og læs `git status` efter hver
  `git checkout -- <fil>` — den sletter ucommittet arbejde (sket fem gange)
- **⚠️ KØR DEN FULDE RUNDE I HALVDELE MED TO ARBEJDERE** (16/9): systemet dræber
  den ellers, når hukommelsen slipper op — tre gange på én aften, og en dræbt
  runde ligner ikke en fejl, den ligner ingenting.
  `npx playwright test --project=computer --workers=2`, og telefonen i tre
  bidder (`--project=mobil --shard=1/3 --workers=2` osv.). Fire arbejdere er
  det, der vælter den her maskine — og en runde, der kører på en udsultet
  maskine, melder fejl, der ikke findes: 5 af 8 "fejl" bestod med to arbejdere
- **Én Playwright-kørsel ad gangen**, og ingen browser eller filrettelser, mens en
  runde kører: `pgrep -fl "playwright test" && { echo STOP; exit 1; }` først.
  Kendingen på en maskinfejl er **tiden**: en prøve på 3 sek., der tager 11, ventede
  på maskinen. Kør den alene, før du leder i koden
- **zsh deler ikke en variabel op i ord**, og `-g` er et regulært udtryk (`+` matcher
  ikke et plus). "No tests found" står ikke som en fejl — tjek antallet
- **Se siden, før du siger, det er færdigt.** `/se-siden` eller et skud med Read.
  Send skuddet med til Mikkel — han afgør tingene på skærmbilleder
- **SQL prøves på en lokal Postgres:** `vaerktoej/byg-lokal-db.sh` og så
  `vaerktoej/sql-runde.sh` (den tæller også filer, der dør på deres egen kulisse)

## Fejl, der allerede er lavet — genkend dem

- **Én fejlende del må ikke vælte resten** (`Promise.all` gav nødmenu; én tegner, der
  kastede, tog alle admin-faner med sig)
- **En kommentar er ikke et værn, og en note er ikke et tjek.** Skriver du "X fanges af Y",
  så åbn Y og se linjen
- **To funktioner med samme navn i ét objekt: den sidste vinder tavst**
- **Kolonner sendes aldrig ubetinget** — `!== undefined`, ellers PGRST204 eller en tavs
  overskrivning
- **En regel uden scope laver hele admin om.** Scope til `body.personale` / `.form-kort`
- **En klasse med `display` slår `[hidden]`.** Skjul med `style.display` eller en egen regel
- **Summen kan være forkert, selv om hver regel er rigtig** — mål på flere skærmbredder
- **"Alle steder" betyder alle flader** (favicon, PWA-ikon, skuffemenu, sitemap)
- **Øvetilstanden skal fejle som skyen**, og `setup.sql` er kun første lag af skemaet
- **Databasen skal afvise alt det, siden afviser** — browseren kan være dage gammel
- **Hvad tror en travl person, det betyder?** Et felt, der kan læses på to måder, er en fejl

## Det kunden har sagt, og som stadig gælder

- **Intet uden belæg på siden** — ingen opfundne tal, faciliteter eller anmeldelser
- **Oplys ikke om parkering, hunde, legeplads eller handicapadgang**, før det er bekræftet
- **Opfind ikke svaret.** Er noget uklart, så skriv det — gæt ikke
- **Bestilt er bestilt, booket er booket.** Opkaldet hører til Afvis
- **Ingen betaling online.** Kassen ved lugen er registreringen
- **Skriv ikke "Bestil takeaway"** uden at sige, hvad det dækker

## gstack

`.claude/hooks/install-gstack.sh` henter gstack, når en session starter, og må aldrig
blokere en session. Det giver `/review`, `/investigate`, `/retro`, `/health` m.fl.
Browser-delen (`/qa`, `/browse`) virker ikke i sky-sessioner — brug `.mcp.json` og
`/se-siden`. Og igen: **ikke** `/ship`, `/land-and-deploy` eller `/canary`.

## Hvor vi er nu

Solgt og overleveret 15/9. Kontrakterne ligger på Mikkels skrivebord, ikke i repoet
(repoets rod er offentlig). Sidst bygget: isen kan bestilles på forsiden og ved
bordene, og forsiden har et isafsnit. **"Din mad er klar" ved bordene er fjernet
igen** (15/9, ejerens ord: *"for dyrt i længden — de må selv gå ned"*): ingen
besked, ingen sms, ingen push. Detaljerne — og alt før — står i
`docs/HISTORIK.md`. Det, ejeren stadig skal svare på, står nederst i `README.md`.
