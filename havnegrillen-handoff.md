# Mosede Havnegrill og Ishus — mobilsite (1:1 handoff)

Alt i denne mappe er de færdige designs, præcis som de ser ud i previewet. Ingen admin-kobling, ingen backend — formularerne er markup + små interaktioner.

## Filer
| Fil | Hvad det er |
|---|---|
| index.html | Forsiden (hero, socials, musik/Facebook-kort, dagens ret, bestilling, ugens retter, menukort + tapas, nyheder, om os, selskab & catering, ydelses-rækker, åbningstider) |
| m-tapas.html | Tapasfad: "Det får I", priser, bestillingsformular med live prisberegning |
| h-smorrebrod.html | Smørrebrød ud af huset: antal pr. type, 2 dages varsel, levering/afhentning |
| h-selskaber.html | Selskaber: forespørgsel + direkte ring-knap |
| h-baglokale.html | Udleje af baglokalet: "er datoen ledig?", tidsrum, med/uden mad |
| h-catering.html | Catering: forespørgsel (type, kuverter, menu, levering, fade) |
| h-frokost.html | Frokostordning B2B: firma, CVR, ugedage, startdato, fakturamail |
| h-kalender.html | Kalender: filtrerbare arrangementer + reservationsformular |
| m-menukort.html | Eksisterende menukort (bruger mosede-m.css/menu.*) |
| havnegrillen.css | Hele designsystemet: farver, typografi, liquid glass, komponenter |
| havnegrillen.js | Scroll/sticky, reveal, menu-sheet, segmenter, steppere, chips, CTA-logik |
| image-slot.js | Billed-pladsholdere (drag & drop i preview) |

## Designsystem (havnegrillen.css)
- Farver: `--red #d62a3a`, `--ink #241a17`, `--ink2 #5c4a45`, `--muted #8b7871`, `--cream #fdf7ef`, `--cream2 #f7ede1`, `--paper #fff`
- Ternet mønster: to `repeating-linear-gradient` (21px felter, rgba(214,42,58,.55–.62)) på hvid
- Typografi: Instrument Serif (overskrifter) + Instrument Sans (brødtekst/UI); Bebas Neue bruges kun i logo-ovalen
- Knapper: `.g` (liquid glass) + varianter `.solid` (rød), `.ghost` (hero), `.ink`, `.sm`, `.blk`, `.icn`
- Fast CTA i bunden: `.bestil` — skjuler sig automatisk når den tilhørende formular er i syne
- Logoet er inline SVG (oval badge med is og pommes-bægre) — udskift med rigtig logofil når den findes

## Interaktioner (havnegrillen.js)
- `[data-seg]` To-go/Spis her m.fl. · `[data-step]` antalsvælgere · `[data-chips="single|multi"]` filter/valg
- `[data-toggles="#id"]` viser/skjuler felt (fx leveringsadresse)
- `.rev` = scroll-reveal · topbar bliver frostet ved scroll · menu-sheet via #burger/#lukmenu

## Når admin skal kobles på
Alt indhold der skal styres fra personalesiden: dagens ret + ugens retter, nyheder/promo-kort, kalenderens arrangementer, tapasfadets indhold og priser, åbningstider. Formularerne skal POSTe til køkken-overblikket.
