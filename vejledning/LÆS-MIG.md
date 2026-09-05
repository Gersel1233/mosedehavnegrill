# Vejledningen til personalet

`Mosede-Havnecafe-vejledning.pdf` er den, der printes og hænges op ved
lugen. `vejledning.html` er kilden — **én fil, der bærer sine egne
skrifter** (husets Instrument Serif og Instrument Sans ligger i filen
som base64), så den kan åbnes og printes hvor som helst uden net.

## Sådan laves PDF'en igen

```bash
node vejledning/lav-pdf.js "$PWD/vejledning/vejledning.html" \
     vejledning/Mosede-Havnecafe-vejledning.pdf \
     "Mosede Havnecafe · vejledning til personalet"
python3 vejledning/maal-luft.py vejledning/Mosede-Havnecafe-vejledning.pdf
```

Den anden linje er ikke pynt: den måler, hvor meget tomt papir hver
side ender med. **Skriftstørrelsen er målt frem, ikke valgt** —
tallet er **8,6 pt**, fundet ved at måle flere størrelser med den
tekst, der står der.

**⚠️ OG TALLET HOLDT OP MED AT VÆRE SANDT UDEN AT NOGEN MÅLTE.**
Her stod, at 8,6 pt gav **fem** sider med 0,5 sides spild. Målt
forfra 5. september er den **seks** sider med ~1,0 sides spild — den
sjette kom af tekst, der voksede over flere dage, og ingen kørte
målingen bagefter. Noten var altså blevet en påstand, præcis dét den
selv advarer imod.

Og skriften kan ikke hente siden tilbage: 8,4, 8,3 og 8,2 pt er
stadig seks sider og spilder MERE, fordi intet fanekort og ingen
tabel må deles af et sideskift (se nedenfor) — hele blokke flytter i
stedet for at pakke tættere. 8,6 er derfor stadig den rigtige
størrelse: den største, der ikke spilder mere.

**Ændrer du teksten, så kør målingen igen** — tallet er ikke en evig
sandhed, det er svaret på det indhold, der står der nu.

## Tre ting, der er med vilje

- **Intet fanekort deles af et sideskift.** Halvdelen af "hvad gør
  Overblik" på næste ark er præcis dét, man ikke finder i en fart.
  Det samme gælder tabellerne: en opslagstabel, hvis sidste svar
  står alene på næste side, er ubrugelig. Målt — den sidste tabel
  efterlod før ÉN række med gentaget hoved på en side for sig selv
- **Lyst tema, altid.** Skærmens mørke udgave ville tømme en
  blækpatron på fem sider
- **Emojierne er ADMINS EGNE**, ikke pyntet op. 🍽️ Borde ser bleg ud
  på papir, fordi Noto tegner den som en hvid tallerken — men det er
  det tegn, der står i søjlen, og ordet står lige efter. Bytter vi
  det, lyver vejledningen om skærmen

**Fjerde argument er sidefodens tekst.** Det samme script laver
`overdragelse/` — stod foden fast, kom det ene dokument ud med det andets
sidefod. Det skete.

`VEJLEDNING.md` i roden er det samme indhold som ren tekst.
