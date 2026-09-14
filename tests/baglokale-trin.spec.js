// @ts-check
/* BAGLOKALETS FORESPØRGSEL I FIRE TRIN (14/9). Kundens ord med tre skud
   af formularen: "den er forældet og ikke klar og god nok, billederne er
   dog fine".

   MÅLT FØR på skuddene: datoen stod TO gange (nettet og browserens eget
   felt med "18/09/2026"), kalenderens celler var over 80 px høje på en
   computer, og tretten felter stod i én række uden at sige, hvad der
   hørte sammen — og ingen steder stod der, hvad der ville blive sendt.

   ⚠️ DET, DER SENDES, ER URØRT, og det måles af skal-forespoergsel.spec.js
   (baglokalets forespørgsel, tidsrum og priskort). Filen her måler
   udseendet: trinene, datoen ét sted, kalenderens højde og opsummeringen. */
const { test, expect } = require('@playwright/test');
const { åbn } = require('./hjaelp');

/* Prøvernes ur står på fredag 7. august; fire dages varsel gør 11. august
   til den første dag, der kan vælges. 14. august er en fredag. */
const DAG = '2026-08-14';

test('formularen står i fire nummererede trin', async ({ page }) => {
  await åbn(page, '/h-baglokale.html');
  const trin = await page.locator('#forespoerg .bl-trin-navn').allTextContents();
  expect(trin.map((t) => t.replace(/\s+/g, ' ').trim()))
    .toEqual(['1Dagen', '2Tid og gæster', '3Jeres arrangement', '4Jeres kontakt']);
});

test('datoen står ét sted: nettet — og dagen i ord under det', async ({ page }) => {
  await åbn(page, '/h-baglokale.html');
  await expect(page.locator('#ledigkal')).toBeVisible();
  /* Browserens felt er der stadig — motoren læser det — men øjet ser det
     ikke, så længe nettet står der. Målt på kassen, ikke på en klasse. */
  const felt = await page.locator('.bl-dato').boundingBox();
  expect(felt && felt.width, 'datofeltet står stadig ved siden af nettet').toBeLessThanOrEqual(2);
  await expect(page.locator('#bl-valgt')).toHaveText('Tryk på en ledig dag i kalenderen.');

  await page.locator(`.lk-dag[data-dato="${DAG}"]`).click();
  await expect(page.locator('#bdato'), 'nettet skrev ikke i feltet').toHaveValue(DAG);
  await expect(page.locator('#bl-valgt')).toHaveText('Valgt: Fredag den 14. august');
  await expect(page.locator('#bl-valgt')).toHaveClass(/har/);
});

test('kan nettet ikke tegnes, står browserens datofelt frem igen', async ({ page }) => {
  /* Modstykket: en regel, der skjulte feltet for altid, ville bestå
     prøven ovenfor — og så var der ingen vej til en dato den dag,
     kalenderen fejlede. */
  await åbn(page, '/h-baglokale.html');
  await expect(page.locator('#ledigkal')).toBeVisible();
  await page.evaluate(() => { document.getElementById('ledigkal').hidden = true; });
  const felt = await page.locator('.bl-dato').boundingBox();
  expect(felt && felt.width, 'uden nettet er der ingen vej til en dato').toBeGreaterThan(100);
});

test('kalenderen er et værktøj, ikke en plakat — cellerne har en fast højde', async ({ page }) => {
  await åbn(page, '/h-baglokale.html');
  await expect(page.locator('#ledigkal')).toBeVisible();
  const h = await page.locator(`.lk-dag[data-dato="${DAG}"]`).evaluate((e) => e.getBoundingClientRect().height);
  expect(h, 'kalenderens celler vokser med panelet igen').toBeLessThanOrEqual(48);
  expect(h, 'vagt: cellen skal kunne rammes med en finger').toBeGreaterThanOrEqual(36);
});

test('opsummeringen over knappen siger, hvad der bliver sendt', async ({ page }) => {
  await åbn(page, '/h-baglokale.html');
  /* Før en dag er valgt, er der ingen forespørgsel at opsummere — felterne
     har forvalg, og en linje uden dag lignede en færdig forespørgsel. */
  await expect(page.locator('#ledigkal')).toBeVisible();
  await expect(page.locator('#bl-opsum'), 'opsummeringen står, før der er valgt en dag').toBeHidden();
  await expect(page.locator('#bl-opsum'), 'vagt: elementet findes').toHaveCount(1);
  await page.locator(`.lk-dag[data-dato="${DAG}"]`).click();
  await page.locator('#btid-fra').fill('18:00');
  await page.locator('#btid-til').fill('22:00');
  await page.locator('#bantal').fill('12');
  const opsum = page.locator('#bl-opsum');
  await expect(opsum).toBeVisible();
  await expect(opsum).toContainText('Jeres forespørgsel');
  await expect(opsum).toContainText('Fredag den 14. august');
  await expect(opsum).toContainText('kl. 18.00–22.00');
  await expect(opsum).toContainText('12 gæster');
  await expect(opsum).toContainText('med mad');
  /* Og den følger segmentet — ellers lover den mad, gæsten har valgt fra. */
  await page.locator('[data-toggles="#madfelt"] button', { hasText: 'Kun lokalet' }).click();
  await expect(opsum).toContainText('kun lokalet');
  await expect(opsum).not.toContainText('med mad');
});
