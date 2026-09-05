/* ============================================================
   ÉN TALSTEMME, EN SKALA, EGNE SKRIFTER  (5/9)
   ============================================================
   Kundens ord: "jeg tror det er text fonten også på tallene der
   gør det ser generisk ud ... føler den er generisk og ikke i den
   high end".

   Scannet med de rigtige skrifter. Tre ting var kode, og han sagde
   ja til dem:

   1) TALLENE. Fem prisformaterere, fire af dem skrev "35,50,-".
      Heroens pille sagde "21:00" med kolon, mens formularen sagde
      "kl. 19.30" — på den samme side. Og det samme "89,-" stod i
      serif 700 ved bordet, serif 400 på bestil/ og sans 600 på
      menukortet.
   2) SKALAEN. 38 forskellige font-size og 45 box-shadow i ét ark.
   3) SKRIFTERNE. Designsiderne hentede dem fra Google; de gamle
      sider havde dem lokalt. Første indtryk på havnen med dårlig
      dækning: Georgia og systemets sans.

   ⚠️ pænTid ER EN VÆRDI, IKKE EN VISNING. admin/tider.js sætter
   den i et <input type="time">, hvor punktum gør feltet blankt.
   Derfor er visningen sin egen funktion, og prøven holder fast i,
   at den gamle IKKE ændrer sig.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, grunddata, erGoogleKvittering } = require('./hjaelp');
const fs = require('fs');
const path = require('path');

const ROD = path.join(__dirname, '..');
const BORDE = [{ id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4,
  placering: 'ude', aktiv: true, sortering: 10 }];

function udenKommentarer(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/* Alle udgivne HTML-filer — roden læst af MAPPEN plus undersiderne. */
function udgivneSider() {
  const rod = fs.readdirSync(ROD)
    .filter((f) => /\.html$/.test(f) && !/^image-slot/.test(f) && !erGoogleKvittering(f));
  const mapper = fs.readdirSync(ROD, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(d.name, 'index.html'))
    .filter((f) => fs.existsSync(path.join(ROD, f)));
  return [...rod, ...mapper];
}

test.describe('Skrifterne er vores egne', () => {
  test('ingen udgivet side henter skrifter hos Google', () => {
    const sider = udgivneSider();
    expect(sider.length, 'ingen sider fundet').toBeGreaterThan(12);
    const hosGoogle = sider.filter((f) =>
      /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(fs.readFileSync(path.join(ROD, f), 'utf8')));
    expect(hosGoogle, 'siderne henter stadig skrifter fra et fremmed domæne').toEqual([]);
  });

  test('designarket erklærer alle fire skrifter fra fonts/', () => {
    const css = udenKommentarer(fs.readFileSync(path.join(ROD, 'havnegrillen.css'), 'utf8'));
    for (const fil of ['instrument-sans.woff2', 'instrument-serif.woff2',
      'instrument-serif-italic.woff2', 'bebas-neue.woff2']) {
      expect(css, `havnegrillen.css peger ikke på fonts/${fil}`).toContain('fonts/' + fil);
      expect(fs.existsSync(path.join(ROD, 'fonts', fil)), `fonts/${fil} findes ikke`).toBe(true);
    }
    /* Introen MÅLER Bebas' bogstaver for at fylde vand i dem — med
       swap måler den en anden skrift. Samme note i css/style.css. */
    expect(css).toMatch(/"Bebas Neue"[^}]*font-display:\s*block/);
  });

  test('skrifterne ER indlæst på forsiden — uden Google', async ({ page }) => {
    /* ⚠️ MÅLT I BROWSEREN, ikke læst af arket. Google spærres helt,
       så det eneste sted, skrifterne kan komme fra, er fonts/. */
    await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
    await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
    await åbnSkal(page, '/index.html', { data: grunddata() });
    await page.evaluate(() => document.fonts.ready);
    const indlaest = await page.evaluate(() =>
      [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')));
    for (const navn of ['Instrument Sans', 'Instrument Serif', 'Bebas Neue']) {
      expect(indlaest, `${navn} blev ikke indlæst lokalt`).toContain(navn);
    }
  });
});

test.describe('Én prisformaterer', () => {
  test('Butik.kroner kender ørerne — og komma-tankestreg er pladsen til dem', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    const r = await page.evaluate(() => ({
      hele: Butik.kroner(35), oere: Butik.kroner(35.5), halv: Butik.kroner(0.5),
      kr: Butik.kroner(199, 'kr'), tusind: Butik.kroner(1200, 'kr'), tom: Butik.kroner(''),
      gammel: Butik.pris(89.5),
    }));
    expect(r.hele).toBe('35,-');
    expect(r.oere, '"35,50,-" er to konventioner i ét tal').toBe('35,50');
    expect(r.halv).toBe('0,50');
    expect(r.kr).toBe('199 kr.');
    expect(r.tusind, 'dansk tusindpunktum').toBe('1.200 kr.');
    expect(r.tom).toBe('');
    expect(r.gammel, 'det gamle navn er et alias, ikke en kopi').toBe('89,50 kr.');
  });

  test('en pris med ører står uden ",-" på menukortet', async ({ page }) => {
    /* ⚠️ TALLET KOMMER UDEFRA: prøven giver én vare en pris, ingen
       anden har, og læser den af SKÆRMEN. */
    const d = grunddata();
    d.menu_varer[0].pris = 47.25;
    await åbnSkal(page, '/m-menukort.html', { data: d });
    await page.waitForTimeout(600);
    const priser = await page.locator('.mk-pris').allTextContents();
    expect(priser, 'ingen priser på kortet — prøven måler ingenting').not.toEqual([]);
    expect(priser).toContain('47,25');
    expect(priser.join(' '), 'ører OG komma-tankestreg i det samme tal').not.toMatch(/,\d\d,-/);
  });

  test('ingen anden fil regner prisen ud selv', () => {
    /* MÅLT 5/9: fem formaterere. toFixed(2) var fingeraftrykket på
       hver eneste kopi — det er dét, der skrev "35,50,-". Og
       toLocaleString + ' kr.' er en pris bygget i hånden.

       ⚠️ toLocaleString ALENE er ikke en prisformaterer.
       skal/forespoergsel.js' tal() skriver 40 pladser og 1.200 med
       tusindpunktum, og "kr." står i HTML'en ved siden af — det er
       et TAL, ikke en pris, og det er det rigtige værktøj til det.
       Første udgave af prøven fældede den; det var prøven, der var
       for bred. */
    const filer = ['js/faelles.js', 'js/skal/forside.js', 'js/skal/menukort.js',
      'js/skal/bestil.js', 'js/skal/forespoergsel.js', 'js/skal/tapas.js', 'js/skal/kvittering.js'];
    const kopier = filer.filter((f) => /toFixed\(2\)|toLocaleString\('da-DK'\)\s*\+\s*' kr\.'/.test(
      udenKommentarer(fs.readFileSync(path.join(ROD, f), 'utf8'))));
    expect(kopier, 'der er en prisformaterer uden for Butik.kroner igen').toEqual([]);
  });
});

test.describe('Ét klokkeslæt til øjnene', () => {
  test('Butik.klokken skriver punktum — og pænTid ændrer sig IKKE', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    const r = await page.evaluate(() => ({
      lang: Butik.klokken('11:30'), hel: Butik.klokken('10:00:00'),
      kort: Butik.klokken('10:00', 'kort'), kortHalv: Butik.klokken('11:30', 'kort'),
      vaerdi: Butik.pænTid('21:00:00'),
    }));
    expect(r.lang).toBe('11.30');
    expect(r.hel).toBe('10.00');
    expect(r.kort).toBe('10');
    expect(r.kortHalv).toBe('11.30');
    /* ⚠️ DEN HER ER VÆRNET FOR ADMIN. Skifter pænTid til punktum,
       står Åbningstider-fanens tidsfelter blanke. */
    expect(r.vaerdi, 'pænTid er en VÆRDI til <input type=time> og skal beholde kolon').toBe('21:00');
  });

  test('heroens pille og formularen skriver klokken ens', async ({ page }) => {
    /* MÅLT 5/9: "ÅBENT NU TIL 21:00" over "kl. 19.30" på den samme
       side. To uafhængige elementer, to steder på skærmen. */
    await åbnSkal(page, '/index.html', { data: grunddata() });
    await page.waitForTimeout(500);
    const pille = await page.locator('.hero .status').textContent();
    expect(pille, 'pillen skriver klokkeslæt med kolon').not.toMatch(/\d:\d\d/);
    expect(pille).toMatch(/\d\.\d\d/);
  });

  test('ingen gæstefil bytter kolon ud selv længere', () => {
    const filer = ['js/skal/bestil.js', 'js/skal/forside.js', 'js/skal/menukort.js',
      'js/skal/forespoergsel.js', 'js/skal/kalender.js', 'js/bestilling.js', 'js/bord.js', 'js/faelles.js'];
    const kopier = filer.filter((f) => /replace\(':',\s*'\.'\)/.test(
      udenKommentarer(fs.readFileSync(path.join(ROD, f), 'utf8'))));
    expect(kopier, 'en inline-kopi af klokkeslætsreglen er kommet tilbage').toEqual([]);
  });
});

test.describe('Én talstemme', () => {
  test('prisen ved bordet og prisen på menukortet har SAMME skrift og vægt', async ({ page }) => {
    /* ⚠️ TO SIDER MOD HINANDEN. Et spørgsmål til den ene om dens
       egen skrift ville bestå, også hvis den anden var serif. */
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    await page.waitForTimeout(500);
    const kort = await page.locator('.mk-pris').first().evaluate((e) => {
      const c = getComputedStyle(e);
      return { f: c.fontFamily.split(',')[0].replace(/"/g, ''), w: c.fontWeight, n: c.fontVariantNumeric };
    });
    await åbn(page, '/ved-bordet/?bord=7', { ur: '2026-08-06T11:00:00Z', data: grunddata({ borde: BORDE }) });
    const bord = await page.locator('.stk-pris').first().evaluate((e) => {
      const c = getComputedStyle(e);
      return { f: c.fontFamily.split(',')[0].replace(/"/g, ''), w: c.fontWeight, n: c.fontVariantNumeric };
    });
    expect(bord.f, 'to skrifter for det samme "89,-"').toBe(kort.f);
    expect(bord.w, 'to vægte for det samme "89,-"').toBe(kort.w);
    /* Og det skal være designets egen talstemme — ikke bare ens.
       To serif'er ville også være ens. */
    expect(kort.f).toBe('Instrument Sans');
    expect(kort.w).toBe('600');
    expect(kort.n).toContain('tabular-nums');
    expect(bord.n).toContain('tabular-nums');
  });

  test('tælleren mellem plus og minus taler samme sprog som prisen', async ({ page }) => {
    await åbn(page, '/ved-bordet/?bord=7', { ur: '2026-08-06T11:00:00Z', data: grunddata({ borde: BORDE }) });
    const t = await page.locator('.taeller-tal').first().evaluate((e) => {
      const c = getComputedStyle(e);
      return { f: c.fontFamily.split(',')[0].replace(/"/g, ''), w: c.fontWeight };
    });
    expect(t.f, 'tælleren står i serif mellem to sans-tal').toBe('Instrument Sans');
    expect(t.w).toBe('600');
  });
});

test.describe('Skalaen kan ikke skride tilbage', () => {
  const css = () => udenKommentarer(fs.readFileSync(path.join(ROD, 'havnegrillen.css'), 'utf8'));

  test('ingen brøkdels-størrelser uden for logoet', () => {
    const regler = [...css().matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    const broek = [];
    for (const [, sel, krop] of regler) {
      if (sel.includes('.crest')) continue;   /* logoet er tegnet, ikke sat */
      for (const [, v] of krop.matchAll(/font-size:\s*([^;}]+)/g)) {
        if (/^\d+\.\d+px$/.test(v.trim())) broek.push(sel.trim().slice(0, 40) + ' → ' + v.trim());
      }
    }
    expect(broek, 'en halv pixel er en beslutning, ingen har taget').toEqual([]);
  });

  test('antallet af skriftstørrelser og skygger vokser ikke', () => {
    /* ⚠️ EN SKRALDE, IKKE ET MÅL. Målt 5/9: 38 → 30 og 45 → 37.
       Tallene her er de målte; kommer der en ny værdi, skal den
       enten være en af de eksisterende, eller loftet skal hæves
       MED en grund. */
    const c = css();
    const sizes = new Set([...c.matchAll(/font-size:\s*([^;}]+)/g)].map((m) => m[1].trim()));
    const shadows = new Set([...c.matchAll(/box-shadow:\s*([^;}]+)/g)].map((m) => m[1].trim()));
    expect(sizes.size, 'flere skriftstørrelser end 30: ' + [...sizes].join(', ')).toBeLessThanOrEqual(30);
    expect(shadows.size, 'flere skygger end 37').toBeLessThanOrEqual(37);
  });

  test('overskriften flyttede sig ikke — h1 står, hvor designet satte den', async ({ page }, info) => {
    /* Hele pointen med at snappe brøkdelene var, at det ikke kan
       ses. Målt før på en iPhone 13: 260. Computerprofilen har
       sit eget lag (havnegrillen-desktop.css) og et andet tal. */
    test.skip(info.project.name !== 'mobil', 'tallet er telefonens');
    await åbnSkal(page, '/index.html', { data: grunddata() });
    await page.evaluate(() => { const i = document.getElementById('intro'); if (i) i.remove(); });
    const top = await page.locator('.hero h1').evaluate((e) => Math.round(e.getBoundingClientRect().top));
    expect(Math.abs(top - 260), 'h1 flyttede sig med skalaen').toBeLessThanOrEqual(2);
  });
});
