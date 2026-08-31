# Parkerede prøver — de fulgte den gamle gæsteside

Forsiden og skallen blev skiftet ud 23/8 med designet fra Claude
Design (`havnegrillen-handoff.md`): ni nye sider på roden, eget
designsystem (`havnegrillen.css`), egen interaktion. Prøverne i den
her mappe måler på den GAMLE opmærkning — sektionerne, introen,
isfilmen, topmenuen — og ville fejle på alt det, der med vilje er
lavet om. Playwright kører dem ikke (testDir er `tests/`), men de er
IKKE slettet: reglerne i dem er stadig de rigtige regler, og de skal
genopstå mod den nye opmærkning i systemfasen.

To af dem kræver et ord med på vejen:

- **designbundt.spec.js var vagten over opdigtede tal** — "4,8 på
  Google", "plads til 40", telefonnummeret og adressen fra
  prototypen. Det nye design INDEHOLDER de tal, og Mikkel har
  besluttet (23/8, regel 8 i implementeringsordren), at de er
  pladsholdere, personalet selv retter. Derfor er vagten parkeret —
  men aftalen med ejeren består: FØR det her merges til
  udgivelsesgrenen, skal tallene være ejerens egne, og vagten skal
  op at stå igen mod de nye sider.
- **vaegt.spec.js** bar også prøven af store.js-delingen. Admin-
  halvdelen gælder stadig og bor nu i `tests/store-skriv.spec.js`;
  gæstehalvdelen er tom, fordi den nye forside slet ikke indlæser
  store.js endnu — den kommer igen, når motoren kobles på.

Det, der stadig KØRER i `tests/`: hele admin-suiten, QR-bordbestillingen
(`ved-bordet/` er ikke en del af designet og står urørt), de gamle
formular-sider (`bestil/`, `bord/`, `selskaber/`, `baglokale/`,
`menu.html`), som stadig findes på deres adresser, motoren i
js/store.js, QR-motoren og udgivelsesprøven.

## menuside.spec.js — parkeret 30/8

Filen målte `menu.html`, den gamle menuside. Den adresse er en
**vejviser** nu: da de to udgaver af hjemmesiden blev lagt sammen
30/8, viste en måling, at ni gamle gæstesider stod i luften ved
siden af de nye, og at kun `bord/` kunne nås fra den nye side. En
gæst fra Google kunne lande i den gamle verden og aldrig se den
nye.

Menukortet bor i `m-menukort.html` nu, og det måles af
`tests/skal-menukort.spec.js` — 19 prøver, der dækker det samme:
kategorier som kort, tegnet fra afdelingen, en vare uden pris,
udsolgt, det tomme kort, priserne i den røde.

**⚠️ TRE AF FILENS PRØVER ER FLYTTET MED, IKKE SLETTET.** De målte
noget, ingen anden prøve dækkede:

- at et varenavn med HTML i sig vises som TEKST (et sikkerhedsværn
  — ejeren skriver navnene, og bygges listen med innerHTML en dag,
  kører det som kode i gæstens browser)
- at siden ikke går ned, hvis databasen svarer tomt
- at en kategori med en gammel afdeling ("grill") stadig står på
  kortet

De står nu i `tests/skal-menukort.spec.js` under overskriften
"Værn, der fulgte med fra den gamle menuside". Sådan forsvinder
dækning ellers, uden at nogen opdager det: ikke ved at en prøve
fejler, men ved at filen holder op med at blive kørt.

---

## skal-smoerrebroed.spec.js — siden holdt op med at være en bestilling (31/8)

Kundens ord: *"fixet smørrebrød ud af huset — fuck af med
kalenderen, det er ligegyldigt ... bare hav en knap, der hedder
kontakt og få et tilbud."* Adspurgt direkte valgte han, at
**bestillingsformularen skal HELT væk** fra `h-smorrebrod.html`.

Alle 24 prøver i filen målte den formular: kurven, dagvælgeren,
tidsvælgeren, størrelserne, fyldet og afsendelsen til
`bestillinger`. Der er ikke en formular at måle på siden mere;
den er en forespørgsel som selskaber og catering
(`tests/skal-smoerrebroed-tilbud.spec.js` måler den nye).

**⚠️ TRE TING ER TJEKKET, FØR FILEN BLEV PARKERET** — dækning
forsvinder ikke ved, at en prøve fejler, den forsvinder ved, at
filen holder op med at blive kørt (læren fra 30/8):

- *"en levering bekræftes ALDRIG af sig selv"* er dækket i
  `tests/levering.spec.js` linje 143. Ikke tabt.
- *"varslet står ét sted"* (`[data-varsel]`) er dækket i
  `tests/skal-forespoergsel.spec.js` for catering og frokost.
  Ikke tabt.
- **⚠️ MEN "FØRST BRØDET, SÅ FYLDET" (`skiver`-modellen) HAR
  INGEN SIDE MERE.** Ni af prøverne her målte den, og
  `h-smorrebrod.html` var dens ENESTE side: `bestil/` kører model
  A (`kun-smoer`), og forsiden kører `uden-fyld`. Koden lever
  videre i `Butik.udvalg` og `js/skal/bestil.js` — den er ikke
  slettet, af samme grund som de otte ubrugte JS-filer — men
  **ingen gæst kan nå den.** Ejerens trykte kort har stadig
  SMØRREBRØD og HÅNDMADDER til hver sin pris; skal modellen
  bruges igen, hører den til i forsidens formular, og så skal de
  ni prøver herfra med.
