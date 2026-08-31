# Overdragelsen

`Mosede-Havnecafe-overdragelse.pdf` er dokumentet, ejerne får: hvad der er
bygget, hvad det gør for forretningen, hvilke faner der gør hvad, hvor
tingene bor, og hvad der stadig venter på deres svar.

`overdragelse.html` er kilden — **én fil, der bærer sine egne skrifter**, så
den kan åbnes og printes hvor som helst uden net.

## ⚠️ Koderne står IKKE i dokumentet

Adgangstabellen i punkt 6 har **stiplede felter**, ikke værdier. Det er med
vilje: dokumentet bliver printet og ligger ved lugen, og en adgangskode på
et ark ved en luge er ingen adgangskode. De skrives i hånden eller udleveres
i en adgangskodemanager.

**Skriv dem aldrig ind i filen her.** Den ligger i et git-repo — en kode,
der har været committet én gang, er i historikken for altid, også hvis den
slettes bagefter.

## Sådan laves PDF'en igen

```bash
node vejledning/lav-pdf.js "$PWD/overdragelse/overdragelse.html" \
     overdragelse/Mosede-Havnecafe-overdragelse.pdf \
     "Mosede Havnecafe · overdragelse"
python3 vejledning/maal-luft.py overdragelse/Mosede-Havnecafe-overdragelse.pdf
```

**Fjerde argument er sidefodens tekst**, og det er ikke pynt: scriptet havde
den som en fast streng, og da det samme script lavede det her dokument, kom
det ud med *vejledningens* sidefod på alle syv sider. Et dokument, hvis fod
siger noget andet end dets forside, får læseren til at tro, der mangler en
side.

## To ting, der blev målt, ikke skønnet

- **Adresserne må ikke brække midt i et ord.** Første udgave skrev
  `mosedehavnecafe.dk/admin.` + `html` og `epwyjzakvvbxtpvnhv` + `bn` —
  en adresse, der er brækket forkert på papir, bliver tastet forkert.
  Fundet ved at læse teksten UD af PDF'en igen, ikke ved at kigge på den.
  Adgangstabellen har faste spaltebredder nu
- **`maal-luft.py`** siger, hvor meget tomt papir hver side ender med.
  Kort, advarsler og tabeller deles aldrig af et sideskift; prisen er lidt
  luft i bunden af nogle sider, og det er den rigtige handel i et dokument,
  man slår op i
