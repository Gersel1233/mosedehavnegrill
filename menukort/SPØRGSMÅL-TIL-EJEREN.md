# Det sidste, der står uafklaret på menukortet

Målt direkte i databasen **3. september 2026** — ikke skrevet af
efter hukommelsen. Kør `vaerktoej/hent-menukort.sh` og se selv.

**Priserne er der.** 262 varer står på kortet, og **260 af dem har
en pris**. De to sidste skal ikke have en, og det er ejerens egne
ord:

| Vare | Hvorfor uden pris |
|---|---|
| Morgenbrød (Morgenmad) | Ejeren skrev **SPØRG** på svararket |
| Isbar med eller uden betjening (Tilkøb ud af huset) | "Alt efter type og størrelse af event" |

Det, der stadig kan gå galt, er ikke tal, der mangler. Det er de
steder, hvor **to rækker siger noget om det samme** — og hvor kun
ejeren ved, om det er med vilje.

---

## 1 · Slushicen har to priser

| Hvor | Vare | Pris |
|---|---|---|
| Sodavand, juice og kakao | Slush Ice, **stor** | 35 kr. |
| Tilkøb ud af huset | Slushice, **stor** | 25 kr. |
| Sodavand, juice og kakao | Slush Ice, **lille** | 25 kr. |
| Tilkøb ud af huset | Slushice, **lille** | 20 kr. |

**Spørgsmålet:** er den billigere, når den er tilkøb til en
catering (mindst 10 personer), end den er over lugen? Eller er
det ene tal en fejl?

*Det haster ikke for systemet — navnene er skrevet forskelligt
("Slush Ice" mod "Slushice"), så værnene i databasen forveksler
dem ikke. Men gæsten kan se begge priser på menukortet.*

---

## 2 · "Sauce, topping eller guf" står to steder

Den står i **Kugleis og ishorn** og i **Softice og vafler**, begge
til 7 kr. Samme navn, to rækker.

**Det betyder noget i praksis:** melder personalet den udsolgt
under softicen, kan den **stadig bestilles** — den anden række
holder navnet i live. Værnet i databasen slår op på navnet og
siger kun nej, når hver eneste række med det navn er væk.

**Spørgsmålet:** er det én vare (så skal den ene række slettes),
eller er det to (så skal de hedde noget forskelligt — fx
"Sauce, topping eller guf til softice")?

---

## 3 · Tre par, der ligner hinanden

Ingen af dem koster penge — begge halvdele har samme pris. Men de
står som **to varer**, gæsten kan vælge imellem, og køkkenet kan
få begge navne på en bon.

| A | B | Pris |
|---|---|---|
| Retter: **Lun delle eller steg** | Sandwich og retter fra pladen: **Hjemmelavet lun frikadelle** | begge 25 kr. |
| Sodavand: **Juice eller Capri-Sun** | Sodavand: **Brik juice eller cacao** | begge 15 kr. |
| Burgere: **Cheesebaconburger** | Det trykte kort skriver **Baconburger** | 85 kr. |

**Spørgsmålene:**
1. Er "Lun delle eller steg" og "Hjemmelavet lun frikadelle" det
   samme? Så skal den ene slukkes.
2. Er "Juice eller Capri-Sun" og "Brik juice eller cacao" det
   samme?
3. Er "Cheesebaconburger" den, kortet kalder "Baconburger" — eller
   findes der **både** en baconburger og en cheesebaconburger, så
   der mangler en?

---

## 4 · Glutenfrit brød: 10 kr. eller samme pris?

- **Svararket** (ejerens hånd): tillæg **10 kr. pr. stk.** — og
  det er det, der står i databasen i dag
- **Håndmadskortet** (trykt): *"GLUTENFRIT BRØD — SAMME PRIS"*

De to siger hver sit. Arket er nyere og svarer direkte på vores
spørgsmål, så det vandt — men ejeren skal se, at kortet siger
noget andet, før vi lader det stå.

---

## 5 · To kategorier kan SES, men ikke bestilles

Det her er ikke et spørgsmål om et tal. Det er et flueben i
admin → **Menukort**, og det er sat forkert i dag:

| Kategori | Varer | Kan bestilles? |
|---|---|---|
| **Tillæg: glutenfri, laktosefri og vegansk** | 3 (à 10 kr.) | **NEJ** |
| **Tilkøb morgenmad** | 12 (à 10 kr.) | **NEJ** |

**Tillægget er det, ejeren selv bad om**, og en gæst kan ikke
vælge det i dag. Det samme gælder de tolv tilkøb til morgenmaden
(bacon, æg, pålæg, pandekage …) — de står på kortet, men kan ikke
lægges i kurven.

**Sæt de to flueben**, og de virker med det samme. Ingen kode,
ingen SQL.

---

## 6 · Og tre ting, der er slået fra MED VILJE — bekræft gerne

| Kategori | Kan ikke bestilles | Hvorfor |
|---|---|---|
| Kaffe og varme drikke (22 varer) | nej | Kaffe køber man ved lugen; man bestiller den ikke dagen før |
| Kugleis og ishorn · Softice og vafler (21 varer) | nej | *"Isen er altid til rådighed"* — den kan slet ikke bestilles nogen steder, heller ikke med et flueben |
| Tapasfad · Platter · Sliders · Reception og pindemad · Tilkøb ud af huset (46 varer) | nej | Catering, **mindst 10 personer**. Åbnes de, kan en gæst ved bordet købe **én slider til 40 kr.** |

**⚠️ Åbn ikke cateringens fem kategorier.** Der er kun ÉN liste
over, hvad der kan bestilles, og den gælder både hjemmesiden,
lugen og QR-koden ved bordet.
