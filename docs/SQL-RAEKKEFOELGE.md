# SQL-filerne: rækkefølgen, og hvad der skal køres igen efter hvad

Flyttet ud af `CLAUDE.md` 15/9 2026. Mikkel kører filerne i Supabases SQL Editor
efter den her fil, og `vaerktoej/byg-lokal-db.sh` bygger den lokale database i
samme rækkefølge. **`tests/sql-mappen.spec.js` holder filen op mod mappen og mod
byggeren**: en migrering, der ikke står her, bliver aldrig kørt i produktionen —
og så virker admin lokalt og fejler hos ejeren (sket 26/8 og 28/8).

Kør altid mod **`epwyjzakvvbxtpvnhvbn`** — tjek projekt-id'et (eller
`get_project_url` i MCP'en), før der køres noget. Aldrig spiis' `jhdlxexgrwvuoqetcgbt`.

## Rækkefølgen

Rækkefølgen er envejs — `setup.sql` kan ikke køres efter `flerlejer.sql`:

```
setup.sql → flerlejer.sql → bremse.sql → menukort.sql → proev-flerlejer.sql
  → forespoergsler.sql → kalender.sql → borde.sql → udlejning.sql
  → realtime.sql → spis-her.sql → levering.sql → skraldespand.sql
  → logbog.sql → bordkort.sql → restaurant.sql → bord-loft.sql
  → menukort-ud-af-huset.sql → menukort-resten.sql
  → menukort-ejerens-liste.sql → dagens-retter.sql → nyheder-fra-til.sql
```

og derfra:

```
… → pris-vaern.sql → dagsregler.sql → dagsbesked-og-qr.sql
  → menukort-antal-og-dage.sql → nyheder-slags-og-billede.sql
  → kortets-priser.sql → nyheder-fra-til.sql → bord-udeblev.sql
  → foresp-kontakt.sql → borde-55.sql → arrangementer.sql
  → bord-noegle.sql → arrangement-info.sql
  → arrangement-kategori.sql → arrangement-sluttid.sql → bestilling-dato-vaern.sql
  → bestillingsnummer.sql
  → smoerrebroed-forespoergsel.sql → bord-uden-telefon.sql
  → vare-billede.sql → bord-loft-pr-dag.sql
  → kortets-priser-3.sql → smoerrebroed-kortet.sql
  → ejerens-oplysninger.sql → tillaeg-hensyn.sql
  → kategori-dag-vaern-aktiv.sql → vare-valg.sql → roller.sql
  → levering-og-mindsteantal.sql
  → dato-vaern-resten.sql → bordnummer.sql
  → bestilling-status.sql → luge-loft.sql
  → kategori-ugedage.sql → bestilling-kanal.sql
  → menukort-raekkefoelge.sql → sagsnummer.sql
  → aabent-og-antal-vaern.sql → ugepaamindelse.sql
  → gaestens-regler.sql → kanal-vaern.sql
  → bord-plads.sql → gaester-ved-bordet.sql
  → levering-zone.sql → levering-valideret.sql
  → kortene-25-9.sql → kortenes-huller-25-9.sql
  → glutenfri-vaffel-samme-pris.sql → sluk-det-kortene-ikke-viser.sql
  → chefens-rettelser-25-9.sql → isens-opsaetning.sql
  → glutenfrit-broed-5-kr.sql → haandmadder-27-kr.sql
  → haandmadder-hel-skive.sql
  → gaestens-vaern-26-9.sql
```

**⚠️ `gaestens-vaern-26-9.sql` SKAL STÅ SIDST (26/9) — kørt i produktion 26/9 af Mikkel. (Før stod: er IKKE kørt i
produktionen endnu.)** Den skriver de nyeste udgaver af
`mosede_gaestens_regler`, `mosede_kanal_vaern`, `mosede_levering_valideret`
og `mosede_bord_plads_vaern` om, så gæstens regler gælder alle uden for
personalet (ikke kun rollen `anon`), og den gør `oprettet` til databasens
på de fem gæstetabeller. Se tabellen herunder: køres en af de fire filer
igen, skal den her med bagefter. `er-vi-klar.sql` tjek 150 fanger det.

**⚠️ `vare-valg.sql` er flyttet frem (20/9)** — den stod efter
`gaestens-regler.sql`. Da et valg fik lov at koste ekstra, blev
`mosede_valg_navn`, `mosede_valg_tillaeg` og `mosede_valg_tillaeg_aftryk`
fælles ordforråd: `gaestens-regler.sql` læser valget med dem, og
`roller.sql` bruger aftrykket til at se, om nogen har rettet pengene i
et valg. Begge filer ville derfor kalde noget, der ikke fandtes endnu.
`vare-valg.sql` laver kun kolonnen og de tre funktioner og afhænger
ikke af nogen af dem, så den kan stå tidligt. `gaestens-regler.sql`
siger selv fra med en klar besked, hvis den alligevel køres først.

Fire filer står ikke i blokkene, men køres af byggeren på deres plads:
`lukkedag-vaern.sql` (efter `dagsregler.sql`), `forespoergsel-kalender.sql` og
`frokost.sql` (efter `bestillingsnummer.sql`) og `push.sql` (efter
`menukort-raekkefoelge.sql`). Til hver migrering hører en `proev-`fil, der skal
skrive BESTOD.

**Alt til og med `bord-plads.sql` er kørt i produktionen** (målt 13.–16/9 —
`kanal-vaern.sql` og `bord-plads.sql` blev lagt på 16/9 og målt bagefter i den
rigtige database, begge gange med en måling, der rullede sig selv tilbage).
Status for den enkelte fil står i `docs/HISTORIK.md`.

⚠️ **`arrangement-kategori.sql` blev KØRT IGEN 16/9** — CHECK-reglen tager nu imod
en fjerde slags (`andet`) ud over musik, spisning og fest. Filen kan køres igen
uden skade (den smider værnet væk og sætter det på ny), og ingen eksisterende
række rammes. Målt i produktionen bagefter med en måling, der rullede sig selv
tilbage: `andet` tages imod, og en opfunden værdi (`banko`) afvises stadig.

## Det, der skal køres igen bagefter

En fil, der køres igen, kan skrive en ældre regel tilbage over en nyere. Det sker
tavst — derfor listen:

| Køres den her igen … | … så skal den her køres igen | Fordi |
|---|---|---|
| `setup.sql` | `bestilling-dato-vaern.sql` | CHECK'et med `current_date` kommer tilbage (tjek 129) |
| `setup.sql` eller `udeblivelser.sql` | `restaurant.sql` | statuslisten snævres ind — køkkenet kan ikke trykke "Tilberedes" (tjek 91) |
| `skraldespand.sql` | `restaurant.sql` | dubletvagten gælder bordene igen (tjek 93) |
| `bremse.sql`, `borde.sql`, `udlejning.sql` eller `forespoergsler.sql` | `skraldespand.sql` | nøglerne og bremserne tæller slettede rækker med |
| `forespoergsler.sql` | `frokost.sql` og `foresp-kontakt.sql` | typelisten bliver tre igen, og telefonkravet kommer tilbage (tjek 70, 114) |
| `borde.sql` | `bord-udeblev.sql` | "Udeblev" gør ingenting ved bordene (tjek 111) |
| `dagsregler.sql` eller `lukkedag-vaern.sql` | `dagsbesked-og-qr.sql` | QR-spærren skrives væk (tjek 107, 140) |
| `dagsregler.sql`, `lukkedag-vaern.sql` eller `dagsbesked-og-qr.sql` | `aabent-og-antal-vaern.sql` | åbningstiderne skrives ud af værnet (tjek 136) |
| `gaestens-regler.sql`, `kanal-vaern.sql`, `levering-valideret.sql` eller `bord-plads.sql` | `gaestens-vaern-26-9.sql` | den gamle dør ("kun rollen anon") kommer tilbage, så en bruger, der har oprettet sig selv, slipper uden om gæstens regler — og linjens antal og bordets dato holder op med at blive tjekket (tjek 150) |

Og to rækkefølger inden i rækkefølgen: `bestilling-dato-vaern.sql` FØR
`bestillingsnummer.sql`, og `dato-vaern-resten.sql` FØR `bordnummer.sql` — ellers
falder efterudfyldningen med `23514` på en gammel række.

## Tre ting om SQL Editoren, der har kostet tid

- **Den viser hverken notices eller warnings** — kun den sidste sætnings svar. En
  besked, der skal læses, skal være en `select` til sidst eller en `raise exception`
- **`\set`, `\pset` og andre `\`-kommandoer er psql, ikke SQL.** Står de i filen,
  fælder editoren hele arket, før noget er kørt
- **`setup.sql` overskriver `is_admin()`**, så e-mailen i punkt 1 skal rettes HVER
  gang — hele teksten mellem apostrofferne

## Tjeklisten

`supabase/er-vi-klar.sql` skriver ingenting og svarer ✅/❌ pr. linje. Kør den, når
noget virker sært. **Står der en ny tabel i `Butik.hent()` eller en ny kolonne,
koden sender, SKAL den have en linje dér** — en tjekliste, der ikke kender en
tabel, siger god for dens fravær (sket 26/8 og 28/8).

Datafilerne (`kortets-priser*.sql`, `borde-55.sql`, `ejerens-oplysninger.sql`,
`tillaeg-hensyn.sql`, `levering-og-mindsteantal.sql`, `menukort-raekkefoelge.sql`,
`kortene-25-9.sql`, `kortenes-huller-25-9.sql`,
`glutenfri-vaffel-samme-pris.sql`, `sluk-det-kortene-ikke-viser.sql`,
`chefens-rettelser-25-9.sql`, `isens-opsaetning.sql`,
`glutenfrit-broed-5-kr.sql`, `haandmadder-27-kr.sql`, `haandmadder-hel-skive.sql`)
har med vilje INTET tjek: de skriver ejerens tal, og et tjek ville sige ❌ den dag,
han retter sit eget tal i admin.

## Lokalt

```bash
vaerktoej/byg-lokal-db.sh     # bygger en Postgres af mappens egne filer
vaerktoej/sql-runde.sh        # kører alle proev-filer og siger selv fra
```
