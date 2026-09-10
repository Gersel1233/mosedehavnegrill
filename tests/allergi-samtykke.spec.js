/* ============================================================
   ALLERGIEN KRÆVER ET UDTRYKKELIGT JA
   ------------------------------------------------------------
   Kundens spørgsmål 10/9 om samtykke og vilkår.

   En allergi er en HELBREDSOPLYSNING (artikel 9), og dér er "vi
   har en aftale" ikke hjemmel nok — art. 9(2)(a) kræver et
   UDTRYKKELIGT samtykke. Persondatapolitikken har citeret
   paragraffen hele tiden; det var selve handlingen, der
   manglede.

   ⚠️ OG DEN MÅ ALDRIG SPÆRRE FOR EN BESTILLING. Kan man ikke
   bestille uden at sige ja til at få gemt en helbredsoplysning,
   er samtykket ikke frivilligt — og så er det ugyldigt. De to
   prøver hører derfor sammen: fluebenet kræves KUN, når der
   faktisk står noget i feltet.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const H = require('./hjaelp.js');

async function åbnBord(page) {
  const d = H.grunddata();
  d.borde = [{ id: 7, lokation_id: 'mosede', nummer: '7', aktiv: true, har_kode: false }];
  await H.lokalTilstand(page);
  await H.sætData(page, d);
  await page.goto('/ved-bordet/?bord=7');
  await expect(page.locator('#bestil-allergi')).toBeVisible();
}

test('fluebenet findes først, når der ER skrevet en allergi', async ({ page }) => {
  await åbnBord(page);
  const linje = page.locator('#allergi-samtykke-linje');

  /* ⚠️ STOD DET DER ALTID, ville hver eneste gæst blive bedt om at
     tage stilling til en helbredsoplysning, hun ikke har givet —
     og et flueben, folk sætter for at komme videre, er ikke et
     samtykke. Samme argument som cookiebanneret, huset med vilje
     ikke har. */
  await expect(linje).toBeHidden();
  await page.fill('#bestil-allergi', 'Nødder');
  await expect(linje).toBeVisible();
});

test('rydder gæsten feltet, forsvinder både linjen og jaet', async ({ page }) => {
  await åbnBord(page);
  await page.fill('#bestil-allergi', 'Nødder');
  await page.check('#allergi-samtykke');
  await page.fill('#bestil-allergi', '');

  await expect(page.locator('#allergi-samtykke-linje')).toBeHidden();
  /* ⚠️ ET GAMMELT JA MÅ IKKE BLIVE STÅENDE og gælde en allergi,
     gæsten har slettet. */
  await expect(page.locator('#allergi-samtykke')).not.toBeChecked();
});

test('uden fluebenet bliver bestillingen ikke sendt', async ({ page }) => {
  await åbnBord(page);
  await page.locator('.stk-linje button', { hasText: '+' }).first().click();
  await page.fill('#bestil-navn', 'Sara Holm');
  await page.fill('#bestil-allergi', 'Nødder');
  await page.click('#bestil-send');

  /* Beskeden siger, hvad man gør — og at man kan lade være. */
  await expect(page.locator('#bestil-fejl')).toContainText(/flueben/i);

  /* ⚠️ MODSTYKKET: der må ikke være gemt noget. En besked på
     skærmen beviser ikke, at rækken blev stoppet. */
  const d = await H.gemteData(page);
  expect(d.bestillinger || []).toHaveLength(0);
});

test('uden en allergi spærrer ingenting — og det er hele pointen', async ({ page }) => {
  await åbnBord(page);
  await page.locator('.stk-linje button', { hasText: '+' }).first().click();
  await page.fill('#bestil-navn', 'Sara Holm');
  await page.click('#bestil-send');
  await page.click('#kig-send');

  /* ⚠️ UDEN DEN HER PRØVE ville en regel, der krævede fluebenet
     ALTID, bestå den ovenfor — og så kunne man ikke bestille uden
     at afgive en helbredsoplysning. Det er præcis dét, der gør et
     samtykke ufrivilligt og dermed ugyldigt. */
  await expect(page.locator('#bestil-tak')).toBeVisible();
  const d = await H.gemteData(page);
  expect(d.bestillinger).toHaveLength(1);
});
