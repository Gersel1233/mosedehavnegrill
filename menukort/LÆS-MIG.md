# Menukortet som filer

Kundens ord (3/9): *"giv mig det hele som filer, da jeg skal lave
menukort."* Her er hele sortimentet, hentet direkte ud af
databasen.

| Fil | Til hvad |
|---|---|
| `menukort.csv` | Åbnes i Excel, Numbers eller Sheets. Semikolon som skilletegn, UTF-8 med BOM — så æ, ø og å står rigtigt |
| `menukort.md` | Den læsbare. Én overskrift pr. kategori, pris og beskrivelse pr. vare — den, man designer efter |
| `menukort.json` | Den rå. Alle kolonner, også id og sortering |
| `SPØRGSMÅL-TIL-EJEREN.md` | Det, der stadig står uafklaret — og hvorfor |

## Den letteste vej: knappen i admin

Skal du bare bruge kortet som regneark, så behøver du hverken
terminal, script eller nøgle:

> **admin → Menukort → "Hent regneark (CSV)"**

Den henter den samme fil med de samme kolonner, og den bygger den
af det, skærmen allerede viser — så den virker også den dag,
forbindelsen driller.

## ⚠️ `hent-menukort.sh` er IKKE SQL

Den er et shell-script og skal køres i en **terminal**. Sættes den
ind i Supabases SQL Editor, svarer den:

```
ERROR: 42601: syntax error at or near "#!/"
LINE 1: #!/usr/bin/env bash
```

**Det er ikke en fejl i filen — det er editoren, der har ret.**
Der bliver ikke skrevet noget: den fejler på linje 1, før noget
kan køre.

## ⚠️ Filerne er et FOTO, ikke en kilde

Databasen er sandheden. Retter ejeren en pris i admin, er filerne
her forældede samme sekund — og en pris, der står to steder, er
den fejl, hele det her projekt har flest ar efter.

**Ret aldrig i filerne. Hent dem igen:**

```bash
vaerktoej/hent-menukort.sh
```

Datoen står øverst i `menukort.md`, så man kan se, hvor gammelt
fotoet er.

## Hvad scriptet gør — og ikke gør

- Det **læser**, og kun det. Nøglen er anon-nøglen fra
  `js/config.js`; den er offentlig med vilje og må kun læse.
  `service_role` må **aldrig** bruges her
- Adressen og forretningen tages fra `js/config.js` og ikke fra et
  argument — der findes ikke en vej til at pege den et andet sted
  hen
- Der er **ingen vej tilbage**: filerne kan ikke importeres i
  databasen igen. To steder at rette den samme pris ville skride
  fra hinanden, og ingen af dem ville se forkerte ud for sig selv
- **En vare uden pris skrives tom**, aldrig som 0. Et beløb, vi
  finder på, er værre end ingen pris: gæsten regner med det

## Kolonnerne i CSV'en

| Kolonne | Betyder |
|---|---|
| Kategori vises / Vare vises | `nej` = ejeren har slået den fra i admin. Den er ikke slettet |
| Udsolgt | Personalet har meldt den udsolgt i dag |
| **Kan bestilles online** | `ja` = den kan lægges i kurven på hjemmesiden, ved lugen og fra bordet. `nej` = den står KUN på menukortet |
| Kategoriens dage | `alle`, `hverdage` eller `weekend` |
