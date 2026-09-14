/* FEJLKORTET — NÅR EN BESTILLING IKKE KAN TAGES IMOD  (14/9)

   Kundens ord: "hvis nu en bestilling ikke kunne blive taget imod
   eller en error, lad det være bedre og ikke forældet eller ringe
   — ingen steder må være dårlige."

   Målt før (gennemgang af de fire motorer): fejlen stod som "⚠ " +
   en sætning — rød tekst på bestil/, grå tekst i summens lyserøde
   boks på forsiden; tapassiden SMED databasens grund væk og sagde
   "kunne ikke sendes" om et udsolgt fad; og mistede forsiden
   nettet, stod der "IKKE sendt endnu" uden noget at trykke på.

   Prøverne her går gennem sidernes RIGTIGE afsendelse. Kun
   `Butik.bestil` byttes ud, så afslaget kan komme, når prøven vil
   — det, der måles, er det, gæsten ser bagefter. */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { åbn, åbnSkal, grunddata } = require('./hjaelp');

function smoerData() {
  const d = grunddata();
  d.indstillinger.bestilling_varsel_timer = 2;
  d.menu_kategorier = [{ id: 13, afdeling: 'mad', navn: 'Smørrebrød', sortering: 1, aktiv: true }];
  d.menu_varer = [{ id: 100, kategori_id: 13, navn: 'Rejemad', beskrivelse: null, pris: 55,
    fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true }];
  d.indstillinger.bestilbare_kategorier = [13];
  return d;
}

async function smoerKurv(page) {
  await åbnSkal(page, '/h-smorrebrod.html', { ur: '2026-08-07T09:00:00Z', data: smoerData() });
  const fold = page.locator('#bestil .item', { hasText: 'Smørrebrød' }).first();
  const tilfoej = fold.locator('[data-add]');
  await tilfoej.waitFor({ state: 'attached' });
  if ((await tilfoej.textContent()).indexOf('luk') === -1) await fold.click();
  const plus = page.locator('[data-vare="Rejemad"] button[data-d="+"]');
  await plus.waitFor({ state: 'visible' });
  for (let i = 0; i < 4; i++) await plus.click();
}

/* Et afslag, der kommer, når prøven vil. `raekke` er bestillingen,
   som store.js lægger på en netfejl, så sms'en kan bære den. */
function afvis(page, besked, net) {
  return page.evaluate(([b, n]) => {
    window.Butik.bestil = (raekke) => Promise.reject(Object.assign(new Error(b),
      n ? { netfejl: true, raekke: Object.assign({ reference: 'SM-PROEVE' }, raekke) } : {}));
  }, [besked, !!net]);
}

test.describe('Fejlkortet', () => {

  test('forsidens motor: fejlen er et kort — og summen kommer tilbage', async ({ page }) => {
    await smoerKurv(page);
    await page.locator('#ssend').click();
    const sum = page.locator('#sumline');
    await expect(sum).toContainText('Skriv dit navn');
    await expect(sum).toHaveClass(/fejlkort/);
    await expect(sum).toHaveAttribute('role', 'alert');
    expect(await sum.innerText(), 'glyffen står stadig i teksten').not.toContain('⚠');

    /* Og den mørke sum kommer tilbage, så snart der skrives. */
    await page.locator('#snavn').fill('Sara Poulsen');
    await expect(sum).not.toHaveClass(/fejlkort/);
    await expect(sum).not.toHaveAttribute('role', 'alert');
  });

  test('mister forsidens motor nettet, er der to veje videre', async ({ page }) => {
    await smoerKurv(page);
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await afvis(page, 'Der er ingen forbindelse lige nu, og bestillingen er IKKE sendt endnu.', true);
    await page.locator('#ssend').click();

    const sum = page.locator('#sumline');
    await expect(sum).toContainText('IKKE sendt');
    const sms = sum.locator('a[href^="sms:"]');
    await expect(sms).toBeVisible();
    await expect(sum.locator('a[href^="tel:"]')).toBeVisible();
    const krop = decodeURIComponent((await sms.getAttribute('href')).split('body=')[1] || '');
    expect(krop).toContain('Rejemad');
    expect(krop).toContain('Sara Poulsen');
    /* Og knappen er sig selv igen — ikke "Sender …". */
    await expect(page.locator('#ssend')).toBeEnabled();
    expect(await page.locator('#ssend').innerText()).not.toContain('Sender');
  });

  test('tapassiden siger grunden — den smider den ikke væk', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilling_varsel_timer = 2;
    d.menu_kategorier.push({ id: 20, afdeling: 'mad', navn: 'Til selskabet', sortering: 30, aktiv: true });
    d.menu_varer.push({ id: 20, kategori_id: 20, navn: 'Tapasfad, pr. person', beskrivelse: null,
      pris: 145, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true });
    await åbnSkal(page, '/m-tapas.html', { ur: '2026-08-07T11:00:00Z', data: d });
    await page.locator('#tpers').fill('6');
    await page.locator('#tnavn').fill('Sara Poulsen');
    await page.locator('#ttlf').fill('28871343');
    await page.locator('#tdato').selectOption('2026-08-09');
    await afvis(page, '"Tapasfad, pr. person" er lige blevet udsolgt. Tag den af, så sender vi resten.');
    await page.locator('#bestil-tapas button.g.solid.blk').click();

    const sum = page.locator('#tsum');
    await expect(sum).toContainText('er lige blevet udsolgt');
    await expect(sum).toHaveClass(/fejlkort/);
    expect(await sum.innerText()).not.toContain('Prøv igen');
  });

  test('bestil/: fejlen er et kort, og knappen beholder sit beløb', async ({ page }) => {
    await åbn(page, '/bestil/', { ur: '2026-08-06T11:00:00Z' });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    const op = page.locator('#bestil-stykker .stk-linje').first().locator('button', { hasText: '+' });
    for (let i = 0; i < 5; i++) await op.click();
    await page.fill('#bestil-navn', 'Mikkel Gersel');
    await page.fill('#bestil-telefon', '20304050');
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-kig')).toBeVisible();
    const foer = (await page.locator('#kig-send').innerText()).trim();
    expect(foer, 'vagt: knappen bærer beløbet').toMatch(/·/);

    await afvis(page, 'Vi holder lukket den dag. Vælg en anden dag, eller ring til os.');
    await page.locator('#kig-send').click();
    const fejl = page.locator('#kig-fejl');
    await expect(fejl).toContainText('Vi holder lukket');
    /* Grid: mærket i kolonne ét, sætningen i to — med flex faldt en
       lang sætning ned under mærket (set på et skud 14/9). */
    expect(await fejl.evaluate((e) => getComputedStyle(e).display), 'fejlen er ikke et kort').toBe('grid');
    await expect(page.locator('#kig-send')).toHaveText(foer);
  });

  test('ingen statuskode når skærmen — "(400)" er et tal til os', () => {
    const kilde = fs.readFileSync('js/store.js', 'utf8');
    expect(kilde).not.toMatch(/kunne ikke sendes \(' \+/);
  });
});
