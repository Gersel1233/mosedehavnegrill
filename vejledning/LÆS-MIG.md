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
side ender med. **Skriftstørrelsen er målt frem, ikke valgt** — ved
10,6 pt blev det 7 sider med 1,6 sides tomt papir, ved 9,3 pt blev
det 5 sider med *mere* spild end ved 9,6. Ændrer du teksten, så kør
målingen igen; 9,6 er ikke en evig sandhed, det er svaret på det
indhold, der står der nu.

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
