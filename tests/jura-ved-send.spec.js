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

      /* ⚠️ OG DEN MÅ IKKE HEDDE `.fine`  (11/9). Den bar klassen
         i en dag, og to motorer bruger den FØRSTE .fine i panelet
         som fejllinje (js/skal/kalender.js, js/skal/forespoergsel.js)
         — så en fejl blev skrevet hen over betingelserne. Og på de
         tre gamle sider er `.fine` footerens stribe: målt hvid
         tekst på hvid bund. Mønstret kræver derfor klassen ALENE. */
      const m = s.match(/<p class="jura-ved-send">[\s\S]*?<\/p>/);
      expect(m, 'linjen kunne ikke læses — eller den bærer en klasse mere').not.toBeNull();
      const linje = m[0];

      /* ⚠️ OG BEGGE LINKS ÅBNER I NY FANE. Linjen står lige ved
         send-knappen, altså under en udfyldt formular — et link i
         samme fane er en vej væk fra den. Ved bordet er det husets
         egen regel (ved-bordet.spec.js); her gælder den alle ti. */
      const links = linje.match(/<a [^>]*>/g) || [];
      expect(links.length, 'linjen har ikke sine to links').toBe(2);
      for (const a of links) expect(a, `${a} åbner i samme fane`).toMatch(/target="_blank"/);

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

/* ⚠️ … OG DEN KAN LÆSES  (11/9). Prøverne ovenfor læser FILEN,
   og de bestod i en dag, mens linjen på bord/ og bestil/ stod som
   hvid tekst på hvid bund — `.fine` er footerens stribe i
   css/style.css. En oplysning, der står i opmærkningen og ikke kan
   ses, er ikke givet.

   ⚠️ DERFOR MÅLES DEN BEREGNEDE FARVE MOD DEN BUND, DEN FAKTISK
   STÅR PÅ — to tal fra to elementer, ikke et spørgsmål til
   klassen. Gennemsigtighed blandes ind; en farve med alfa .62 er
   ikke den farve, øjet ser. Én side fra hvert ark: de to gamle
   sider og to designsider. */
test.describe('Betingelserne ved send-knappen kan læses', () => {
  for (const sti of ['/bord/', '/bestil/', '/h-kalender.html', '/h-baglokale.html']) {
    test(`${sti}: linjen står i læsbar kontrast`, async ({ page }) => {
      await page.goto(sti);
      const linje = page.locator('.jura-ved-send').first();
      /* Vagt FØRST: en skjult linje har ingen kontrast at måle. */
      await expect(linje).toBeVisible();
      const kontrast = await linje.evaluate((el) => {
        const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
        let bund = [255, 255, 255];
        for (let n = el; n; n = n.parentElement) {
          const c = rgb(getComputedStyle(n).backgroundColor);
          if (c.length === 3 || c[3] > 0.95) { bund = c.slice(0, 3); break; }
        }
        const f = rgb(getComputedStyle(el).color);
        const a = f.length > 3 ? f[3] : 1;
        const set = [0, 1, 2].map((i) => a * f[i] + (1 - a) * bund[i]);
        const lys = (c) => {
          const v = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
          return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
        };
        const [hoej, lav] = [lys(set), lys(bund)].sort((x, y) => y - x);
        return (hoej + 0.05) / (lav + 0.05);
      });
      expect(kontrast, 'betingelserne kan ikke læses').toBeGreaterThanOrEqual(4.5);
    });
  }
});
