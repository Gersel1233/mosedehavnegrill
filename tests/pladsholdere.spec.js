/* ============================================================
   PLADSHOLDERNE I HTML'EN SIGER INGEN DATO  (25. sep 2026)
   ------------------------------------------------------------
   En ekstern kontrol læste forsiden uden JavaScript og rapporterede
   "søndag d. 23. august" som dags dato, "Musik på molen den 29.
   august" og en uge fra 23. til 29. august — en måned efter. Det var
   designets pladsholdere, som JavaScript skriver over. Men en læser
   uden JavaScript (en link-forhåndsvisning, en søgemaskine, en
   langsom telefon ved vandet) ser dem.

   Mikkels ord: *"Erstat samtlige gamle august-datoer og
   arrangementsoplysninger i HTML-pladsholderne med neutral
   indlæsningstekst."*

   ⚠️ LISTEN LÆSES AF MAPPEN: hver gæsteside i roden og i
   undermapperne. Kun historiesiden er undtaget, og den står med sin
   grund — dens datoer er historie (1710), ikke en dag i kalenderen.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROD = path.join(__dirname, '..');
const UNDTAGET = {
  'historien.html': 'havnens historie — datoerne er fra 1710, ikke fra kalenderen',
};
/* To RIGTIGE datoer, som ikke er pladsholdere — de står med deres grund.
   Kommer der en tredje, skal den stå her, før prøven består. */
const RIGTIGE_DATOER = {
  'index.html': ['8. oktober'],              // Greve Business Awards 2026 — ejerens egen nominering
  'persondatapolitik.html': ['15. september'], // "Senest opdateret" — politikkens egen dato
};
const IKKE_GÆST = /^(admin|googlea|menu)\b/;   // admin, Googles fil, menu.html er en viderestilling

function gæstesider() {
  const ud = [];
  for (const f of fs.readdirSync(ROD)) {
    const p = path.join(ROD, f);
    if (f.endsWith('.html') && !IKKE_GÆST.test(f)) ud.push(f);
    else if (fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'index.html'))
      && !/^(node_modules|tests|tests-gamle|overdragelse|vejledning|docs|test-results|playwright-report)$/.test(f)) {
      ud.push(f + '/index.html');
    }
  }
  return ud;
}

/* Teksten, som en læser UDEN JavaScript ser: kommentarer, scripts og
   stilark væk, tags væk. */
function renTekst(fil) {
  let s = fs.readFileSync(path.join(ROD, fil), 'utf8');
  s = s.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
  return s.replace(/\s+/g, ' ');
}

const MÅNED = /\b\d{1,2}\.\s*(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december)\b/i;

test.describe('Pladsholderne siger ingen dato', () => {
  test('mappen har gæstesider at måle på', () => {
    /* Et ét-tal udefra: siden har mindst forsiden, menukortet og
       tapassiden. En tom liste ville bestå alt nedenfor. */
    const s = gæstesider();
    expect(s).toEqual(expect.arrayContaining(['index.html', 'm-menukort.html', 'm-tapas.html']));
  });

  test('ingen gæsteside står med en dato i sin HTML', () => {
    const fund = [];
    for (const f of gæstesider()) {
      if (UNDTAGET[f]) continue;
      const tilladt = RIGTIGE_DATOER[f] || [];
      const m = (renTekst(f).match(new RegExp(MÅNED.source, 'gi')) || [])
        .filter((d) => tilladt.indexOf(d) === -1);
      if (m.length) fund.push(f + ': ' + m.slice(0, 4).join(', '));
    }
    expect(fund, 'en pladsholder står med en dato, en læser uden JavaScript tror på').toEqual([]);
  });

  /* ⚠️ OG DESIGNETS PRISER STÅR DER HELLER IKKE (25/9, aften). Tapasfadet
     koster 179; designets "199 kr." og "548 kr." stod i HTML'en og var
     det, en læser uden JavaScript — og en side uden database — så.
     Prøven i ingen-reservepriser.spec.js måler siden MED JavaScript; den
     her måler, hvad der står, før det har kørt. */
  test('og designets tapaspriser står der ikke', () => {
    for (const f of ['index.html', 'm-tapas.html']) {
      expect(renTekst(f), f + ' står med designets tapaspris').not.toMatch(/\b(199|548)\s*kr/);
    }
  });

  test('og designets arrangement står der ikke', () => {
    const t = renTekst('index.html');
    expect(t).not.toMatch(/Musik på molen/);
    expect(t).not.toMatch(/Ronni/);
    /* Pladsholderen siger, hvad den er: noget, der hentes. */
    expect(t).toMatch(/Henter næste arrangement/);
    expect(t).toMatch(/Henter dagens ret/);
  });
});
