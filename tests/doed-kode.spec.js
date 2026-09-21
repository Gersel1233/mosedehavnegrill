/* ============================================================
   FILER, INGEN SIDE INDLÆSER  (5/9)
   ------------------------------------------------------------
   Seks filer i js/ kører ikke. De blev efterladt, da gæstesiden
   blev skiftet ud 23/8 og da de gamle adresser blev vejvisere
   30/8, og de er ikke slettet: prøverne i tests-gamle/ peger på
   dem, og de skal læses igennem for dækning, ingen anden måler,
   før noget fjernes.

   ⚠️ MEN LISTEN MÅ IKKE VOKSE I STILHED. Det er selve faren:
   en fil, ingen indlæser, ser ud præcis som en, der kører — og
   den næste, der læser koden, bruger en time på at rette noget,
   der ikke findes på skærmen. Det er sket: js/dagens.js blev
   slettet 23/8, netop fordi den byggede en ringere udgave af en
   formular, der allerede fandtes.

   ⚠️ OG DEN FÆLDER OGSÅ EN FORSVUNDEN FIL. Bliver en af de seks
   ryddet op, skal papirerne følge med — derfor sammenlignes hele
   sættet og ikke bare antallet.

   ⚠️ LISTEN LÆSES AF DISKEN, ikke skrevet af i hånden: hver
   .js-fil i js/ holdes op mod hver udgivet .html-fil. Samme greb
   som favicon-prøven og siderMedFooter(). */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/* De seks, vi VED er forældreløse — og som papirerne beskriver.
   Står der noget nyt her, er der efterladt kode; mangler der
   noget, er der ryddet op, og så skal CLAUDE.md følge med. */
const KENDTE = [
  'arrangementer.js',
  'baad.js',
  'baglokale.js',
  'intro.js',
  'menuside.js',
  'smoerrebroed.js',
];

function sider() {
  const ud = [];
  fs.readdirSync('.').forEach((f) => {
    if (f.endsWith('.html')) ud.push(f);
  });
  fs.readdirSync('.', { withFileTypes: true }).forEach((d) => {
    if (!d.isDirectory() || d.name.startsWith('.') || d.name === 'node_modules') return;
    try {
      fs.readdirSync(d.name).forEach((f) => {
        if (f.endsWith('.html')) ud.push(path.join(d.name, f));
      });
    } catch (e) { /* ikke en mappe, vi kan læse */ }
  });
  return ud;
}

test('ingen NY fil i js/ er holdt op med at blive indlæst', () => {
  const html = sider().map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  expect(html.length, 'ingen sider blev læst — prøven måler ingenting')
    .toBeGreaterThan(1000);

  const forældreløse = fs.readdirSync('js')
    .filter((f) => f.endsWith('.js'))
    .filter((f) => html.indexOf(f) === -1)
    .sort();

  expect(forældreløse, 'listen over filer, ingen side indlæser, har '
    + 'ændret sig — ryd op eller ret KENDTE og CLAUDE.md')
    .toEqual([...KENDTE].sort());
});

/* ⚠️ OG HVER AF DEM SIGER DET SELV. En note i toppen er det
   eneste, der når den, som åbner filen uden at slå op i
   papirerne — og det er præcis den situation, fælden virker i. */
for (const f of KENDTE) {
  test(`js/${f} siger selv, at ingen side indlæser den`, () => {
    const t = fs.readFileSync(path.join('js', f), 'utf8');
    expect(t.slice(0, 900),
      `js/${f} mangler noten om, at den ikke kører`)
      .toContain('INGEN SIDE INDLÆSER DEN HER FIL');
  });
}

/* ============================================================
   SAMME FUNKTION SKREVET TO STEDER  (17/9)
   ------------------------------------------------------------
   "En regel bor ét sted" står i CLAUDE.md, men intet målte det.
   Og det kostede: minutterSiden lå ordret ens i koekken.js og
   overblik.js, begge uden bund i nul, så et tidsstempel fra
   fremtiden gav "-100 min" — og den røde "for længe"-markering
   holdt op med at virke, fordi et negativt tal aldrig er større
   end grænsen. En tavs alarm. Den blev fundet ved et tilfælde.

   ⚠️ NAVNET ER IKKE MÅLET — KROPPEN ER. Hver admin-fil er sin
   egen lukkede IIFE, så tre filer med hver sin lokale tegnAlt er
   forventet og helt i orden. Det farlige er to IDENTISKE kroppe:
   de udtrykker den samme regel, og den dag den ene rettes,
   skrider de fra hinanden uden at nogen opdager det.

   ⚠️ OG PRØVEN BEVISER FØRST, AT DEN MÅLER NOGET. Et regex, der
   ikke matcher, ville rapportere "ingen dubletter" og ligne en
   sejr — samme fælde som "No tests found", der ikke er en fejl.
   Derfor tælles funktionerne, og tallet kommer fra disken.

   Står der noget nyt i listen: saml reglen ét sted (Admin.* i
   kerne.js, som minutterSiden blev det) — ryk den ikke ind i
   KENDTE for at få prøven grøn. */
const KENDTE_DUBLETTER = [];

function adminFunktioner() {
  const fund = [];
  for (const f of fs.readdirSync(path.join('js', 'admin')).filter((x) => x.endsWith('.js'))) {
    const src = fs.readFileSync(path.join('js', 'admin', f), 'utf8');
    const re = /^  function ([A-Za-zÆØÅæøå_$][\wÆØÅæøå$]*)\s*\(([^)]*)\)\s*\{\n([\s\S]*?)\n  \}/gm;
    let m;
    while ((m = re.exec(src)) !== null) {
      fund.push({
        fil: f,
        navn: m[1],
        /* Parametrene tæller med: to kroppe, der læser hver sit
           argumentnavn, er ikke den samme regel. */
        noegle: m[2].replace(/\s/g, '') + '|' + m[3].replace(/\s+/g, ' ').trim(),
        krop: m[3].replace(/\s+/g, ' ').trim(),
      });
    }
  }
  return fund;
}

test('ingen regel i admin er skrevet to steder', () => {
  const alle = adminFunktioner();

  /* Tallet udefra: findes der ikke et pænt antal funktioner, har
     regexet mistet grebet, og listen nedenfor betyder intet. */
  expect(alle.length, 'der blev ikke læst nogen funktioner — prøven måler ingenting')
    .toBeGreaterThan(100);

  const efterKrop = {};
  alle.forEach((x) => {
    /* Korte kroppe (en enkelt retur-linje) ligner hinanden ved
       et tilfælde og er ikke en delt regel. */
    if (x.krop.length < 40) return;
    (efterKrop[x.noegle] = efterKrop[x.noegle] || []).push(x);
  });

  const dubletter = Object.keys(efterKrop)
    .map((k) => efterKrop[k])
    .filter((g) => new Set(g.map((x) => x.fil)).size > 1)
    .map((g) => g.map((x) => x.fil + ':' + x.navn).join(' == '))
    .sort();

  expect(dubletter, 'den samme funktionskrop står i flere admin-filer — '
    + 'saml reglen ét sted (Admin.* i kerne.js)')
    .toEqual([...KENDTE_DUBLETTER].sort());
});

/* ============================================================
   isoPlus BOR ÉT STED  (17/9)
   ------------------------------------------------------------
   "Læg N dage til en dato" lå i FEM udgaver: js/bord.js,
   js/bestil-regler.js, js/skal/menukort.js, js/skal/forside.js og
   js/admin/kerne.js. Fire af dem ordret ens, og den femte
   (forside) skrevet med Date.UTC i stedet — så den så anderledes
   ud uden at opføre sig anderledes.

   ⚠️ MÅLT FØRST, IKKE ANTAGET: 204 datoer hen over begge
   sommertidsskifter 2026, årsskiftet og skudåret 2028 gav NUL
   uenige. Der var altså ingen fejl at rette — men en kopi er en
   kommende fejl, og samme dag svigtede minutterSiden af præcis
   den grund: to ordret ens kroppe, hvor kun den ene fik en bund.

   ⚠️ HJEMMET ER Butik (js/store.js) OG IKKE R (bestil-regler).
   Målt: bestil-regler.js mangler på bord/index.html og
   m-menukort.html, så R.isoPlus ville dø dér. store.js er
   derimod indlæst på ALLE fire sider, der bruger funktionen.

   ⚠️ OG DEN GENERELLE DUBLETGUARD DÆKKER DET IKKE. Udvides den
   til hele js/, melder den 13 — heraf `lav` i sytten filer, som
   er husets arkitektur (hver fil er sin egen lukkede IIFE) og
   ikke en fejl. Derfor denne målrettede prøve i stedet. */
test('isoPlus er defineret ét sted', () => {
  const filer = [];
  (function gaa(d) {
    fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) gaa(p);
      else if (e.name.endsWith('.js')) filer.push(p);
    });
  })('js');

  /* Tallet udefra: blev der overhovedet læst filer? */
  expect(filer.length, 'ingen js-filer blev læst — prøven måler ingenting')
    .toBeGreaterThan(20);

  const steder = filer
    .filter((f) => /^\s*function isoPlus\s*\(/m.test(fs.readFileSync(f, 'utf8')))
    .sort();

  expect(steder, 'isoPlus er skrevet flere steder — reglen skal bo i '
    + 'Butik.isoPlus (js/store.js), som er indlæst på alle sider, '
    + 'der bruger den')
    .toEqual([path.join('js', 'store.js')]);
});

/* ============================================================
   OG EN DØD NØGLE INDE I EN FIL, DER KØRER  (21/9)
   ------------------------------------------------------------
   Prøverne ovenfor fælder en FIL, ingen indlæser. De ser ikke en
   opsætning, der ligger i en fil, som kører fint — og det er
   præcis den fælde, js/skal/forespoergsel.js selv advarer imod,
   da cateringens opsætning blev slettet 4/9: *"otte
   JavaScript-filer i repoet indlæses ikke af én eneste side, og
   de er en fælde for den, der læser koden om et halvt år og tror,
   de kører. En død SIDER-nøgle er den samme fælde i lille."*

   MÅLT 21/9: `sdato` stod stadig i SIDER med hele
   smørrebrødssidens opsætning — chips, krav, segmenter. Siden
   blev en BESTILLINGSSIDE igen 4/9 og indlæser js/skal/bestil.js,
   ikke forespoergsel.js. Nøglen kunne altså aldrig rammes, og den
   fortalte en læser, at smørrebrødsforespørgsler stadig kommer
   ind ad den vej. (Typen 'smoerrebroed' lever videre i databasen
   og på Forespørgsler-fanen — gamle sager skal stadig kunne
   åbnes. Det er OPSÆTNINGEN, der er død.)

   ⚠️ NØGLERNE ER SIDENS EGNE ID'er. SIDER genkendes med
   document.getElementById(nøglen) i netop de sider, der indlæser
   filen — så prøven slår hver nøgle op dér og ikke i hele repoet.
   ============================================================ */
test('hver SIDER-nøgle i forespoergsel.js kan faktisk rammes', () => {
  const kilde = fs.readFileSync('js/skal/forespoergsel.js', 'utf8');

  /* Nøglerne står som `  xdato: {` i toppen af SIDER — læses ud,
     så listen ikke skal vedligeholdes i hånden. */
  const blok = kilde.slice(kilde.indexOf('var SIDER = {'));
  const noegler = (blok.match(/^ {4}([a-z]+): \{$/gm) || [])
    .map((l) => l.trim().replace(':', '').replace(' {', ''));
  expect(noegler.length, 'ingen SIDER-nøgler fundet — mønsteret er skredet')
    .toBeGreaterThanOrEqual(2);

  /* De sider, der faktisk indlæser filen. Tallet kommer udefra. */
  const brugere = sider().filter((f) => {
    try {
      return fs.readFileSync(f, 'utf8').indexOf('js/skal/forespoergsel.js') !== -1;
    } catch (e) { return false; }
  });
  expect(brugere.length, 'ingen side indlæser forespoergsel.js').toBeGreaterThan(0);

  const doede = noegler.filter((n) => !brugere.some((f) =>
    fs.readFileSync(f, 'utf8').indexOf('id="' + n + '"') !== -1));
  expect(doede, 'SIDER-nøgler, ingen af filens sider kan ramme').toEqual([]);
});
