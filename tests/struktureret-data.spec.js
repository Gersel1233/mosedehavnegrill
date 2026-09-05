/* ============================================================
   STRUKTURERET DATA TIL GOOGLE  (5/9)
   ============================================================
   Kundens spørgsmål: "hvorfor er hjemmesiden ikke højt op på
   google ift hvis jeg søger mosedehavecafe eller mosedehavn grill
   og ishus?"

   MÅLT den dag: de ti designsider havde NUL struktureret data.
   Kun bestil/ og bord/ havde den, skrevet i HÅNDEN i HTML'en — og
   kopien var allerede skredet: hasMenu pegede på menu.html, som
   har omdirigeret siden 30/8.

   ⚠️ PRØVERNE HER MÅLER DET, BROWSEREN HAR SKREVET, ikke koden.
   Blokken bygges af js/skal/seo.js i browseren; et blik i HTML'en
   ville ikke kunne se den. Og siderne læses af MAPPEN, så en
   trettende side ikke kan udgives uden mærket.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, grunddata } = require('./hjaelp');
const fs = require('fs');
const path = require('path');

const ROD = path.join(__dirname, '..');

/* En VEJVISER er ikke en side — den sender videre. Og Googles
   ejerskabsfil er ikke en side, den er en kvittering. */
function erVejviser(sti) {
  const t = fs.readFileSync(sti, 'utf8');
  return t.includes('http-equiv="refresh"') && t.includes('location.replace');
}
function harNoindex(sti) {
  return /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(fs.readFileSync(sti, 'utf8'));
}

/* De INDEKSERBARE gæstesider. ved-bordet/ og min-bestilling/ er
   noindex og skal IKKE have mærket: struktureret data på en side,
   Google ikke må vise, er en påstand uden en modtager. */
function indekserbare() {
  const rod = fs.readdirSync(ROD)
    .filter((f) => /\.html$/.test(f))
    .filter((f) => !/^(admin|image-slot)/.test(f))
    .filter((f) => !/^google[0-9a-z]+\.html$/i.test(f))
    .filter((f) => !erVejviser(path.join(ROD, f)))
    .filter((f) => !harNoindex(path.join(ROD, f)))
    .map((f) => '/' + f);
  const mapper = fs.readdirSync(ROD, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((m) => fs.existsSync(path.join(ROD, m, 'index.html')))
    .filter((m) => !erVejviser(path.join(ROD, m, 'index.html')))
    .filter((m) => !harNoindex(path.join(ROD, m, 'index.html')))
    .map((m) => '/' + m + '/');
  return [...rod, ...mapper];
}

async function maerket(page) {
  return page.evaluate(() => {
    const alle = [...document.querySelectorAll('script[type="application/ld+json"]')];
    if (!alle.length) return { antal: 0, data: null };
    let data = null;
    try { data = JSON.parse(alle[0].textContent); } catch (e) { data = 'UGYLDIG JSON'; }
    return { antal: alle.length, data };
  });
}

test('der ER indekserbare sider at måle på', () => {
  /* ⚠️ UDEN DEN HER MÅLER LØKKEN NEDENFOR INGENTING. En tom liste
     består hver eneste regel — arret fra 30/8. */
  const s = indekserbare();
  expect(s.length, 'ingen indekserbare sider: ' + s.join(', ')).toBeGreaterThanOrEqual(12);
});

for (const sti of indekserbare()) {
  test(`${sti} bærer ét Restaurant-mærke med forretningens egne oplysninger`,
    async ({ page }) => {
      await åbn(page, sti, { ur: '2026-08-07T11:00:00Z', data: grunddata() });
      await page.waitForTimeout(700);
      const m = await maerket(page);

      expect(m.antal, `${sti} har ingen struktureret data — Google får hverken navn eller adresse`)
        .toBe(1);
      expect(m.data, `${sti} har ugyldig JSON i mærket`).not.toBe('UGYLDIG JSON');
      expect(m.data['@type']).toBe('Restaurant');
      expect(m.data.name).toBe('Mosede Havnecafe');
      expect(m.data.address.streetAddress).toBe('Havnevej 20L');
      expect(m.data.telephone).toBe('+4528871343');
    });
}

test.describe('Det, målingen fandt manglede', () => {
  test('forretningens ANDET navn står i mærket', async ({ page }) => {
    /* MÅLT 5/9: "grill og ishus" stod ingen steder på siden
       undtagen historien.html — mens smiley-rapporten hedder
       ordret det, og Instagram-profilen hedder
       mosedehavngrillogishus. Søger nogen på det navn, har Google
       intet at matche det til. */
    await åbnSkal(page, '/index.html', { data: grunddata() });
    await page.waitForTimeout(700);
    const m = await maerket(page);
    expect(m.data.alternateName, 'forretningens andet navn mangler')
      .toMatch(/grill og ishus/i);
  });

  test('hasMenu peger på en SIDE, ikke på en vejviser', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    await page.waitForTimeout(700);
    const m = await maerket(page);
    expect(m.data.hasMenu, 'hasMenu mangler').toBeTruthy();

    /* ⚠️ TALLET KOMMER UDEFRA: adressen slås op i MAPPEN og
       måles på, om filen dér FAKTISK omdirigerer. Et spørgsmål
       til koden om dens egen streng ville bestå, også hvis
       m-menukort.html blev en vejviser i morgen. */
    const fil = m.data.hasMenu.replace(/^https?:\/\/[^/]+\//, '');
    const sti = path.join(ROD, fil);
    expect(fs.existsSync(sti), `hasMenu peger på ${fil}, som ikke findes`).toBe(true);
    expect(erVejviser(sti), `hasMenu peger på ${fil}, som er en vejviser — Google sendes ind i en 301`)
      .toBe(false);
  });

  test('åbningstiderne kommer fra DATABASEN, ikke fra koden', async ({ page }) => {
    /* ⚠️ TO UAFHÆNGIGE TAL. Prøven sætter en åbningstid, ingen
       anden kender — 09:15-14:45 — og læser den ud af mærket.
       Et spørgsmål til koden om dens egen liste ville bestå, også
       hvis tiderne var skrevet i JavaScript. */
      const d = grunddata();
      d.aabningstider = d.aabningstider.map((r) => Object.assign({}, r, {
        aabner: '09:15', lukker: '14:45',
      }));
      await åbnSkal(page, '/index.html', { data: d });
      await page.waitForTimeout(900);
      const m = await maerket(page);
      const t = m.data.openingHoursSpecification || [];
      expect(t.length, 'ingen åbningstider i mærket').toBeGreaterThan(0);
      expect(t[0].opens).toBe('09:15');
      expect(t[0].closes).toBe('14:45');
  });

  test('en LUKKET dag står ikke som en åbningstid', async ({ page }) => {
    /* Google læser fraværet som lukket. En række med tider på en
       lukket dag ville love, at der er åbent. */
    const d = grunddata();
    d.aabningstider = d.aabningstider.map((r, i) => Object.assign({}, r, {
      lukket: i === 0,
    }));
    await åbnSkal(page, '/index.html', { data: d });
    await page.waitForTimeout(900);
    const m = await maerket(page);
    const dage = (m.data.openingHoursSpecification || []).map((t) => t.dayOfWeek);
    expect(dage.length, 'ingen åbningstider at måle').toBeGreaterThan(0);
    expect(dage, 'en lukket dag står som åben')
      .not.toContain('https://schema.org/Monday');
  });

  test('ugedag NUL er mandag — ikke tirsdag', async ({ page }) => {
    /* ⚠️ DEN FEJL VILLE HAVE VÆRET TAVS OG DYR. Første udgave af
       js/skal/seo.js skrev 1 = mandag (isodow, som databasens
       kategori-ugedage bruger). Åbningstiderne gør IKKE:
       js/store.js regner (getUTCDay() + 6) % 7. Hver eneste tid
       ville have stået ét døgn forskudt hos Google, mens
       hjemmesiden viste de rigtige.

       ⚠️ TALLET KOMMER UDEFRA: kun ÉN dag får en tid, ingen anden
       har, og det er ugedag 0. */
    const d = grunddata();
    d.aabningstider = d.aabningstider.map((r) => Object.assign({}, r, {
      lukket: Number(r.ugedag) !== 0, aabner: '08:05', lukker: '09:05',
    }));
    await åbnSkal(page, '/index.html', { data: d });
    await page.waitForTimeout(900);
    const m = await maerket(page);
    const t = m.data.openingHoursSpecification || [];
    expect(t.length, 'ugedag 0 kom ikke med').toBe(1);
    expect(t[0].dayOfWeek, 'ugedag 0 blev ikke til mandag')
      .toBe('https://schema.org/Monday');
    expect(t[0].opens).toBe('08:05');
  });

  test('mærket lover ingen anmeldelser', async ({ page }) => {
    /* Husets ordrette regel: brug aldrig opdigtede anmeldelser.
       En score i JSON-LD er en påstand til Google om noget, ingen
       har målt — og designbundtet fra 21/8 leverede netop
       "4,8 · 312 anmeldelser". */
    await åbnSkal(page, '/index.html', { data: grunddata() });
    await page.waitForTimeout(700);
    const m = await maerket(page);
    expect(m.data.aggregateRating, 'mærket påstår en anmeldelsesscore').toBeUndefined();
    expect(m.data.review, 'mærket bærer anmeldelser').toBeUndefined();
  });

  test('de noindex-sider har INGEN struktureret data', async ({ page }) => {
    /* Et mærke på en side, Google ikke må vise, er en påstand
       uden en modtager — og ved-bordet/ er noindex netop for at
       en fremmed ikke kan bestille til bord 7. */
    await åbn(page, '/ved-bordet/?bord=7', {
      ur: '2026-08-06T11:00:00Z',
      data: grunddata({ borde: [{ id: 1, lokation_id: 'mosede', nummer: '7',
        pladser: 4, placering: 'ude', aktiv: true, sortering: 10 }] }),
    });
    await page.waitForTimeout(700);
    const m = await maerket(page);
    expect(m.antal, 'ved-bordet/ har struktureret data').toBe(0);
  });
});

test.describe('Forsidens titel', () => {
  test('den begynder med forretningens navn, ikke med "Forside"', () => {
    /* MÅLT 5/9: titlen var "Forside · Mosede Havnecafe". Det
       første, Google viser, var altså en navigationsetiket. */
    const t = fs.readFileSync(path.join(ROD, 'index.html'), 'utf8');
    const m = t.match(/<title>([^<]*)<\/title>/);
    expect(m, 'forsiden har ingen titel').not.toBeNull();
    expect(m[1], 'titlen begynder med en navigationsetiket')
      .not.toMatch(/^\s*Forside/i);
    expect(m[1], 'forretningens navn står ikke først')
      .toMatch(/^Mosede Havnecafe/);
    /* Google klipper ved ~60 tegn. En titel, der er skåret midt
       over, ser ud som en fejl i søgeresultatet. */
    expect(m[1].length, 'titlen er for lang til et søgeresultat')
      .toBeLessThanOrEqual(62);
  });
});
