# Skrifterne i den her mappe

| Fil | Skrift | Licens |
|---|---|---|
| `instrument-sans.woff2` | Instrument Sans (variabel, 400–700) | SIL Open Font License 1.1 |
| `fraunces.woff2` | Fraunces Variable (wght 100–900) | SIL Open Font License 1.1 |
| `fraunces-italic.woff2` | Fraunces Variable Italic (wght 100–900) | SIL Open Font License 1.1 |
| `instrument-serif.woff2` | Instrument Serif Regular | SIL Open Font License 1.1 |
| `instrument-serif-italic.woff2` | Instrument Serif Italic | SIL Open Font License 1.1 |
| `bebas-neue.woff2` | Bebas Neue | SIL Open Font License 1.1 |

Alle må frit indlejres på en hjemmeside; OFL kræver kun, at
de ikke sælges alene, og at et ændret navn ikke bruger det
oprindelige. Ingen af delene sker her.

⚠️ SKRIFTERNE LIGGER HER OG IKKE HOS GOOGLE (5/9). Designsiderne
hentede dem fra fonts.googleapis.com, mens de gamle sider havde dem
lokalt. Første gang en gæst åbnede siden på havnen med dårlig
dækning, viste designsiderne Georgia og systemets sans i et sekund
eller to — og det FØRSTE indtryk var så en side, der lignede alle
andre. Nu er der én kilde til skrifterne, og den er vores egen.

Den kursive serif er ny: `.about .sign` og tre steder i
`historien.css` bruger kursiv, og Google leverede en rigtig. Uden
filen ville browseren syntetisere en — skrå, ikke kursiv — og det
ses på 19 px.

## ⚠️ FRAUNCES AFLØSTE INSTRUMENT SERIF SOM OVERSKRIFT (6/9)

Mikkels valg efter fire skud af heroen. Rapporten 5/9 stillede en
serif med mere karakter op som en DESIGNBESLUTNING og ikke en
rettelse — så den blev vist, ikke udgivet. Samme lære som
ikonsættet, der blev bygget og rullet tilbage samme aften.

**De to Instrument Serif-filer bliver liggende**, og det er ikke en
forglemmelse: `vejledning/vejledning.html` bærer sine skrifter som
base64 i filen selv, og dens sidetal er MÅLT (`maal-luft.py`, seks
sider ved 8,6 pt). En ny skrift ændrer metrikken og dermed
sidetallet, så den skal have sin egen måling. Indtil da står den
trykte vejledning i Instrument Serif — det er papir til personalet,
ikke en flade, gæsten ser.

**Fraunces er variabel.** Vægten står som `100 900` i begge
`@font-face`, ikke som et fast 400: ellers syntetiserer browseren
en fed i stedet for at bruge aksen.
