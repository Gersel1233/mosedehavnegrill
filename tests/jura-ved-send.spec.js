/* ============================================================
   BETINGELSERNE STÅR, HVOR MAN SENDER
   ------------------------------------------------------------
   Kundens ord (10/9): *"hvor er accepter terms and conditions og
   policysne, når man loader ind på siden?"* og *"vi skal have de
   tre, der man SKAL have for at måtte modtage mail og
   telefonnummer og navn."*

   ⚠️ FØRST DET, DER IKKE SKAL BYGGES: NAVN, TELEFON OG MAIL PÅ
   EN BESTILLING ER IKKE SAMTYKKE. Grundlaget er artikel 6, stk.
   1, litra b — nødvendig for at opfylde aftalen. Et flueben dér
   ville love gæsten, at hun kan trække det tilbage, og det kan
   hun ikke: uden nummeret kan køkkenet ikke ringe, når maden
   ikke kan laves. Det, loven kræver, er OPLYSNING (artikel 13),
   og den skal stå, hvor oplysningerne gives — ikke kun i
   footeren otte skærme længere nede.

   ⚠️ OG DERFOR ER LINJEN OPMÆRKNING OG IKKE JAVASCRIPT. En
   lovpligtig oplysning, der forsvinder, fordi et script fejler,
   er ikke en oplysning. Prisen er, at den står ti steder — og
   det er præcis dét, prøven her er til for.

   ⚠️ SIDERNE LÆSES AF MAPPEN. En elvte formular kan ikke udgives
   uden linjen; samme regel som "Sådan går det videre" (4/9) og
   gæstesidernes gennemgang (31/8).
   ============================================================ */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROD = path.resolve(__dirname, '..');

/* En side, der tager imod personoplysninger, kendes på, at den
   HAR et navnefelt og en knap, der sender. Det er en egenskab
   ved siden — ikke en liste, nogen skal huske at rette. */
function formularsider() {
  const filer = fs.readdirSync(ROD).filter((f) => f.endsWith('.html'))
    .filter((f) => !/^google[a-z0-9]+\.html$/.test(f))
    /* ⚠️ ADMIN ER IKKE EN GÆSTEFORMULAR — og undtagelsen har en
       grund, ellers vokser den, til prøven måler ingenting.
       Personalesiden HAR et navnefelt (telefonbookingen på Borde,
       manuel tilmelding), men den, der taster, er personalet, og
       oplysningspligten skylder vi GÆSTEN. Hun har fået linjen på
       den side, hun selv sendte fra — eller hun har givet
       oplysningerne i telefonen, hvor personalet siger det.
       Siden er desuden `noindex` og bag et login. */
    .filter((f) => f !== 'admin.html');
  const mapper = ['bestil', 'bord', 'ved-bordet']
    .filter((m) => fs.existsSync(path.join(ROD, m, 'index.html')))
    .map((m) => m + '/index.html');
  return filer.concat(mapper).filter((rel) => {
    const s = fs.readFileSync(path.join(ROD, rel), 'utf8');
    // kommentarer klippes af — arret fra favicon-prøven 29/8
    const kode = s.replace(/<!--[\s\S]*?-->/g, '');
    const harNavn = /<input[^>]+(id="[^"]*navn"|name="navn")/i.test(kode);
    const harSend = /<button[^>]*>(?:(?!<\/button>)[\s\S])*?(Send|Book|Reservér|Bestil|tilbud|Spørg)/i.test(kode);
    return harNavn && harSend;
  });
}

test.describe('Betingelserne står, hvor man sender', () => {

  /* ⚠️ EN TOM LØKKE BESTÅR HVER ENESTE REGEL. Uden den her ville
     prøven være grøn den dag, kendingen holdt op med at finde
     nogen sider — arret fra `toBeHidden` 30/8. */
  test('der ER formularsider at måle på', () => {
    expect(formularsider().length).toBeGreaterThanOrEqual(8);
  });

  for (const rel of formularsider()) {
    test(`${rel} siger det ved send-knappen`, () => {
      const s = fs.readFileSync(path.join(ROD, rel), 'utf8')
        .replace(/<!--[\s\S]*?-->/g, '');
      expect(s, 'linjen mangler').toContain('jura-ved-send');

      const m = s.match(/<p class="fine jura-ved-send">[\s\S]*?<\/p>/);
      expect(m, 'linjen kunne ikke læses').not.toBeNull();
      const linje = m[0];

      /* Begge dokumenter skal kunne nås HERFRA — ikke kun fra
         footeren. Det er hele pointen: oplysningen gives dér,
         hvor oplysningerne afgives. */
      expect(linje, 'handelsbetingelserne mangler i linjen')
        .toMatch(/handelsbetingelser\.html/);
      expect(linje, 'persondatapolitikken mangler i linjen')
        .toMatch(/persondatapolitik\.html/);

      /* ⚠️ OG DEN MÅ IKKE KALDE DET ET SAMTYKKE. Grundlaget er
         aftalen, ikke samtykke — se noten øverst. Et "samtykke"
         her ville være en forkert oplysning om gæstens
         rettigheder, og det er værre end ingen linje. */
      expect(linje.toLowerCase(), 'linjen kalder det et samtykke')
        .not.toMatch(/samtykke/);

      /* Vejen skal passe til, hvor siden ligger. `bestil/` og de
         andre mapper skal have ../, roden må ikke have det —
         ellers peger et lovpligtigt link ind i ingenting. */
      const iMappe = rel.includes('/');
      if (iMappe) expect(linje).toMatch(/\.\.\/handelsbetingelser\.html/);
      else expect(linje).not.toMatch(/\.\.\//);
    });
  }
});
