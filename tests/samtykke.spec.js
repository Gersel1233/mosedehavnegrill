/* COOKIE-SAMTYKKE (4/11). Mikkel: "vi skal jo så lige have styr på det med
   cookies og persondatapolitik, så vi overholder alle regler".
   js/samtykke.js: uden målekoder i admin sker INTET. Med en kode spørger et
   banner først, og intet hentes fra Google eller Meta før et ja. */
const { test, expect } = require('@playwright/test');
const { lokalTilstand, sætUr, sætData, grunddata, åbnAdmin, gemteData, visFane } = require('./hjaelp');

const MED = { maaling_ga4: 'G-TEST12345', maaling_meta: '1234567890123456' };

async function aabn(page, sti, koder) {
  const fremmede = [];
  await lokalTilstand(page);
  // Google og Meta svares med en tom fil — og hvert kald tælles.
  await page.route(/googletagmanager\.com|connect\.facebook\.net/, (r) => {
    fremmede.push(r.request().url());
    r.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
  await sætUr(page, '2026-11-04T11:00:00Z');
  const d = grunddata();
  Object.assign(d.indstillinger, koder || {});
  await sætData(page, d);
  await page.goto(sti, { waitUntil: 'domcontentloaded' });
  return fremmede;
}
const valg = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('mosede_samtykke_v1') || 'null'));

test('uden målekoder: intet banner, intet link, intet hentet', async ({ page }) => {
  const fremmede = await aabn(page, '/index.html');
  await page.waitForTimeout(800);
  await expect(page.locator('#samtykke')).toHaveCount(0);
  await expect(page.locator('[data-cookie-valg]')).toHaveCount(0);
  expect(fremmede).toEqual([]);
});

test('med koder: banneret spørger først — "Nej tak" henter intet og huskes', async ({ page, context }) => {
  const fremmede = await aabn(page, '/index.html', MED);
  const b = page.locator('#samtykke');
  await expect(b).toBeVisible();
  await expect(b).toContainText('Google Analytics');
  await expect(b).toContainText('Meta Pixel');
  expect(fremmede, 'noget blev hentet, før gæsten svarede').toEqual([]);

  // Ja og nej er lige store.
  const ja = await b.locator('button', { hasText: 'Ja tak' }).boundingBox();
  const nej = await b.locator('button', { hasText: 'Nej tak' }).boundingBox();
  expect(Math.abs(ja.height - nej.height)).toBeLessThan(2);
  expect(Math.abs(ja.width - nej.width)).toBeLessThan(4);

  await b.locator('button', { hasText: 'Nej tak' }).click();
  await expect(b).toHaveCount(0);
  expect(await valg(page)).toMatchObject({ statistik: false, marketing: false });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await expect(page.locator('#samtykke')).toHaveCount(0);
  expect(fremmede).toEqual([]);
  expect((await context.cookies()).map((c) => c.name)).toEqual([]);
});

test('"Ja tak" henter Google Analytics og Meta Pixel — og husker det', async ({ page }) => {
  const fremmede = await aabn(page, '/index.html', MED);
  await page.locator('#samtykke button', { hasText: 'Ja tak' }).click();
  await expect.poll(() => fremmede.length).toBe(2);
  expect(fremmede.some((u) => u.includes('gtag/js?id=G-TEST12345'))).toBe(true);
  expect(fremmede.some((u) => u.includes('fbevents.js'))).toBe(true);
  expect(await valg(page)).toMatchObject({ statistik: true, marketing: true });
  // Googles samtykke er sat FØR værktøjet hentes.
  const consent = await page.evaluate(() => Array.from(window.dataLayer || []).map((a) => Array.from(a))
    .find((a) => a[0] === 'consent'));
  expect(consent[2]).toMatchObject({ analytics_storage: 'granted', ad_storage: 'granted' });
});

test('"Vælg selv": intet er sat på forhånd, og kun statistik giver kun Google', async ({ page }) => {
  const fremmede = await aabn(page, '/index.html', MED);
  await page.locator('#samtykke .samtykke-vaelg').click();
  const kasser = page.locator('#samtykke input[type="checkbox"]');
  await expect(kasser).toHaveCount(2);
  await expect(kasser.nth(0)).not.toBeChecked();
  await expect(kasser.nth(1)).not.toBeChecked();
  await page.locator('#samtykke label', { hasText: 'Statistik' }).click();
  await page.locator('#samtykke button', { hasText: 'Gem mit valg' }).click();
  await expect.poll(() => fremmede.length).toBe(1);
  expect(fremmede[0]).toContain('googletagmanager.com/gtag/js');
  expect(await valg(page)).toMatchObject({ statistik: true, marketing: false });
});

test('"Cookies" nederst på siden: valget kan trækkes tilbage, og siden genindlæses uden målinger', async ({ page }) => {
  const fremmede = await aabn(page, '/index.html', MED);
  await page.locator('#samtykke button', { hasText: 'Ja tak' }).click();
  await expect.poll(() => fremmede.length).toBe(2);
  const link = page.locator('.legal [data-cookie-valg]').first();
  await expect(link).toHaveText('Cookies');
  await link.click();
  await expect(page.locator('#samtykke input[type="checkbox"]').first()).toBeChecked();
  const genindlaest = page.waitForEvent('load');
  await page.locator('#samtykke button', { hasText: 'Nej tak' }).click();
  await genindlaest;
  const foer = fremmede.length;
  await page.waitForTimeout(800);
  expect(fremmede.length).toBe(foer);
  expect(await valg(page)).toMatchObject({ statistik: false, marketing: false });
});

test('et nyt måleværktøj spørger igen', async ({ page }) => {
  await aabn(page, '/index.html', { maaling_ga4: 'G-TEST12345' });
  await page.locator('#samtykke button', { hasText: 'Ja tak' }).click();
  await expect.poll(() => valg(page)).toMatchObject({ statistik: true });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await expect(page.locator('#samtykke')).toHaveCount(0);
  // Bureauet tilføjer Meta Pixel → gæsten skal spørges om det nye.
  const d = grunddata();
  Object.assign(d.indstillinger, MED);
  await sætData(page, d);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#samtykke')).toContainText('Meta Pixel');
});

test('persondatapolitikken følger med: uden koder "vi måler ingenting", med koder listen og knappen', async ({ page }) => {
  await aabn(page, '/persondatapolitik.html');
  await page.waitForTimeout(600);
  await expect(page.locator('.jura-kort')).toContainText('Vi måler ingenting');
  await expect(page.locator('#maaling-liste')).toBeHidden();

  await aabn(page, '/persondatapolitik.html', MED);
  await expect(page.locator('#maaling-liste .jura-blok')).toHaveCount(2);
  await expect(page.locator('#maaling-liste')).toContainText('Google Ireland Ltd.');
  await expect(page.locator('#maaling-liste')).toContainText('Meta Platforms Ireland Ltd.');
  await expect(page.locator('.jura-kort li', { hasText: 'Vi måler ingenting' })).toBeHidden();
  await expect(page.locator('.jura-kort li', { hasText: 'Cookies kun med dit ja' })).toBeVisible();
  await page.locator('#samtykke button', { hasText: 'Nej tak' }).click();
  await expect(page.locator('#samtykke-status')).toContainText('statistik nej, markedsføring nej');
  await page.locator('button[data-cookie-valg]').click();
  await expect(page.locator('#samtykke')).toBeVisible();
});

test('admin: koderne skrives under Indstillinger — en forkert kode afvises', async ({ page }) => {
  await åbnAdmin(page);
  await visFane(page, 'p-kontakt');
  await expect(page.locator('#maal-status')).toContainText('Ingen målinger');
  await page.locator('#maal-ga4').fill('UA-12345-1');
  await page.locator('#gem-maaling').click();
  await expect(page.locator('#fejl')).toContainText('Google Analytics: koden ser ikke rigtig ud');
  await page.locator('#maal-ga4').fill('g-abc123xyz9');
  await page.locator('#maal-meta').fill('1234 5678 9012 3456');
  await page.locator('#gem-maaling').click();
  await expect(page.locator('#kvittering')).toContainText('Målingerne er gemt');
  const i = (await gemteData(page)).indstillinger;
  expect(i).toMatchObject({ maaling_ga4: 'G-ABC123XYZ9', maaling_meta: '1234567890123456', maaling_gtm: '' });
  await expect(page.locator('#maal-status')).toContainText('Slået til: Google Analytics, Meta Pixel');
});

/* HÆNDELSERNE: bureauet skal kunne følge bestillinger, bookinger og opkald —
   men kun med et ja, og aldrig med navn eller nummer. */
const haendelser = (page) => page.evaluate(() => Array.from(window.dataLayer || [])
  .map((a) => Array.from(a)).filter((a) => a[0] === 'event'));

test('med et ja: en bestilling og et klik på telefonnummeret bliver til hændelser — uden navn', async ({ page }) => {
  await aabn(page, '/index.html', MED);
  await page.locator('#samtykke button', { hasText: 'Ja tak' }).click();
  await page.evaluate(() => {
    window.__fbq = [];
    const f = window.fbq; window.fbq = function () { window.__fbq.push(Array.from(arguments)); return f && f.apply(this, arguments); };
    window.dispatchEvent(new CustomEvent('mosede:maal', { detail: { type: 'bestilling', vaerdi: 245 } }));
    window.dispatchEvent(new CustomEvent('mosede:maal', { detail: { type: 'bordbooking', antal: 4 } }));
    const a = document.createElement('a'); a.href = 'tel:+4528871343'; a.textContent = 'Ring';
    a.addEventListener('click', (e) => e.preventDefault()); document.body.appendChild(a); a.click();
  });
  const h = await haendelser(page);
  expect(h).toEqual(expect.arrayContaining([
    ['event', 'purchase', { value: 245, currency: 'DKK' }],
    ['event', 'bordbooking', { antal_personer: 4 }],
    ['event', 'ring_op', {}],
  ]));
  const fb = await page.evaluate(() => window.__fbq);
  expect(fb).toEqual(expect.arrayContaining([['track', 'Purchase', { value: 245, currency: 'DKK' }], ['track', 'Schedule', {}]]));
  expect(JSON.stringify(h)).not.toMatch(/navn|telefon|\d{8}/);
});

test('med et nej: ingen hændelser', async ({ page }) => {
  await aabn(page, '/index.html', MED);
  await page.locator('#samtykke button', { hasText: 'Nej tak' }).click();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('mosede:maal', { detail: { type: 'bestilling', vaerdi: 245 } })));
  expect(await haendelser(page)).toEqual([]);
});

test('Butik siger "mosede:maal", når en bordbooking er sendt — uden navn og nummer', async ({ page }) => {
  await aabn(page, '/index.html');
  const d = await page.evaluate(async () => {
    let fanget = null;
    window.addEventListener('mosede:maal', (e) => { fanget = e.detail; });
    await Butik.bookBord({ navn: 'Anna', telefon: '22334455', dato: '2026-11-20', tid: '18:00', antal_personer: 4 }).catch(() => {});
    return fanget;
  });
  expect(d).toEqual({ type: 'bordbooking', antal: 4 });
});
