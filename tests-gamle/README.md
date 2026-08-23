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
