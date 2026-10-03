// @ts-check
/* ============================================================
   SIDEN STÅR STILLE, NÅR INGEN RØRER DEN  (28/9)
   ------------------------------------------------------------
   Mikkels ord, efter at tapasfilmen var rettet: *"tapas-siden med
   video og hele sådan tingen er ret laggy … og hakkende"*.

   MÅLT på tapassiden (telefon, CPU bremset 4×, ingen berøring):
   · glansen på de røde knapper (.sheen) flyttede sig med `left`.
     Det gav 240 omberegninger på to sekunder — to striber × 60 —
     og hele siden (390×1710) tegnet om 10-15 gange i sekundet, så
     længe siden var åben. Det kæmper med både rul og film
   · bjælken sætter sig fast lige dér, hvor filmen glider ind under
     den, og havde glas (backdrop-filter) bag en helt dækkende creme
     flade: usynligt, men regnet ud ved hvert filmbillede
   · alle røde og mørke knapper havde det samme usynlige glas

   To regler, der gælder alle gæstesider (læst af mappen):
   1) en animation, der kører i ring, må kun flytte det, skærmkortet
      klarer alene: transform og opacity
   2) glas (backdrop-filter) kun, hvor det kan ses — ikke bag en
      flade, der dækker helt. Husets grænse fra 31/8 og menuknappens
      prøve siger det samme: "glas bag en fast flade er spild"
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, springIntroOver } = require('./hjaelp');

const ROD = path.join(__dirname, '..');
const SIDER = fs.readdirSync(ROD)
  .filter((f) => f.endsWith('.html') && !/^(admin|google)/.test(f))
  .filter((f) => /havnegrillen\.css/.test(fs.readFileSync(path.join(ROD, f), 'utf8')))
  .map((f) => '/' + f);

test('vagt: der ER gæstesider at måle på', () => {
  expect(SIDER.length, SIDER.join(', ')).toBeGreaterThanOrEqual(10);
  expect(SIDER).toContain('/m-tapas.html');
});

async function åbnSide(page, side) {
  await page.route('**/*.mp4*', (r) => r.abort());
  await åbnSkal(page, side, { data: grunddata() });
  if (side === '/index.html') await springIntroOver(page);
}

/* Er fladen helt dækkende? Farven med alfa 1, eller en gradient
   uden et eneste gennemsigtigt stop. */
function dækker(cs) {
  const alfa = (f) => {
    const m = String(f).match(/rgba?\(([^)]+)\)/);
    if (!m) return 0;
    const d = m[1].split(/[,/]/).map((x) => x.trim());
    return d.length > 3 ? +d[3] : 1;
  };
  if (alfa(cs.backgroundColor) >= 0.999) return true;
  const img = cs.backgroundImage || 'none';
  if (!/gradient/.test(img) || /url\(|transparent/.test(img)) return false;
  return (img.match(/rgba?\([^)]+\)/g) || []).every((f) => alfa(f) >= 0.999);
}

for (const side of SIDER) {
  test(`${side}: intet, der kører i ring, tvinger siden til at tegne om`, async ({ page }) => {
    await åbnSide(page, side);
    // Glansen venter 1,6 s, før den begynder — mål, når alt er i gang.
    await page.waitForTimeout(2200);
    const syndere = await page.evaluate(() => {
      const TILLADT = new Set(['transform', 'opacity', 'offset', 'easing', 'composite', 'computedOffset']);
      return document.getAnimations()
        .filter((a) => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity)
        .map((a) => {
          const kf = a.effect.getKeyframes();
          const props = [...new Set(kf.flatMap((k) => Object.keys(k)))].filter((p) => !TILLADT.has(p));
          const t = a.effect.target;
          return props.length ? `${a.animationName} på ${t.tagName.toLowerCase()}.${[...t.classList].join('.')}: ${props.join(', ')}` : '';
        })
        .filter(Boolean);
    });
    expect(syndere, 'animationer i ring, der flytter andet end transform/opacity').toEqual([]);
  });

  test(`${side}: glas kun, hvor det kan ses — også når bjælken har sat sig fast`, async ({ page }) => {
    await åbnSide(page, side);
    // Ned forbi FAST_FRA (300 px i havnegrillen.js), så bjælken sætter sig fast.
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(600);
    const spild = await page.evaluate((dækkerKilde) => {
      const dækker = new Function('return ' + dækkerKilde)();
      const ud = [];
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        const f = cs.backdropFilter || cs.webkitBackdropFilter;
        if (!f || f === 'none') continue;
        if (dækker(cs)) ud.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')}`);
      }
      return ud;
    }, dækker.toString());
    expect(spild, 'glas bag en helt dækkende flade').toEqual([]);
  });
}

/* Den ene side, hvor det blev set: bjælken sætter sig fast over den
   spillende film. Målt direkte, så en ændring af reglen ovenfor ikke
   kan lade netop den glide. */
test('tapassiden: den faste bjælke over filmen er fast creme uden glas', async ({ page }) => {
  await åbnSide(page, '/m-tapas.html');
  await page.mouse.wheel(0, 400);
  await expect(page.locator('#tb')).toHaveClass(/stuck/);
  // Fladen toner ind (.45 s) — læs den, når den er færdig.
  const flade = () => page.locator('#tb').evaluate((e) => getComputedStyle(e).backgroundColor);
  await expect.poll(flade).toBe('rgb(253, 247, 239)');
  const bf = await page.locator('#tb').evaluate((e) => {
    const cs = getComputedStyle(e);
    return cs.backdropFilter || cs.webkitBackdropFilter || 'none';
  });
  expect(bf).toBe('none');
});

/* ⚠️ EN FILM-SIDE MÅ IKKE GLEMME SIT MÆRKE  (3. okt 2026)
   ------------------------------------------------------------
   Reglen om, at bjælken er fast creme uden glas, hænger på
   klassen `har-film` på <body>. Den er valgt, fordi alt andet
   skred — se den lange note i havnegrillen.css.

   Men en klasse, nogen skal huske at sætte, ruster. Den her
   prøve læser SIDERNES EGEN opmærkning: har en side en film,
   skal den have mærket. Så kan den næste film-side ikke glide
   igennem og tage lagget med sig, sådan som tapassiden gjorde
   den 28/9. */
test('hver side med en film bærer mærket har-film', () => {
  const fs = require('fs');
  const path = require('path');
  const rod = path.join(__dirname, '..');
  const mangler = fs.readdirSync(rod)
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({ f, s: fs.readFileSync(path.join(rod, f), 'utf8') }))
    /* En film er enten et <video> i opmærkningen eller en
       data-film, som billedplads.js laver om til ét. */
    .filter((x) => /<video|data-film=/.test(x.s))
    .filter((x) => !/<body[^>]*\bhar-film\b/.test(x.s))
    .map((x) => x.f);
  expect(mangler, 'de her sider har en film, men ikke klassen har-film '
    + '— så får deres bjælke glas, og sløringen koster billeder over filmen')
    .toEqual([]);
});

/* Modstykket: mærket må ikke stå på en side UDEN film, for så
   mister den glasset uden grund. */
test('og ingen side bærer mærket uden at have en film', () => {
  const fs = require('fs');
  const path = require('path');
  const rod = path.join(__dirname, '..');
  const forkert = fs.readdirSync(rod)
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({ f, s: fs.readFileSync(path.join(rod, f), 'utf8') }))
    .filter((x) => /<body[^>]*\bhar-film\b/.test(x.s))
    .filter((x) => !/<video|data-film=/.test(x.s))
    .map((x) => x.f);
  expect(forkert, 'de her sider har mærket, men ingen film').toEqual([]);
});
