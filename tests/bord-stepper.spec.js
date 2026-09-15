/* ============================================================
   BORDBOOKINGEN, 16/9 — ANTAL MED TO TRYK, OG NYE EFTER HVORNÅR
   ------------------------------------------------------------
   Ejerens ord: bordbestilling "er ikke godt nok" — på alle tre
   flader. To af rettelserne her:

   1) bord/: "Hvor mange er I?" var et tomt talfelt. På en telefon er
      det et tastatur, der skal op for at skrive "4". Nu − og +.
   2) Admin → Borde: Nye stod sorteret efter, hvornår gæsten
      TRYKKEDE — en rest fra dengang der skulle ringes. Nu efter dag
      og tid: den, der kommer næst, står øverst.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, visFane } = require('./hjaelp');

test('+ i et tomt felt giver 2, og − stopper ved 1', async ({ page }) => {
  await åbn(page, '/bord/');
  const felt = page.locator('#bord-antal');
  const plus = page.locator('.stepper-knap[data-trin="1"]');
  const minus = page.locator('.stepper-knap[data-trin="-1"]');
  await plus.click();
  await expect(felt).toHaveValue('2');
  await plus.click();
  await expect(felt).toHaveValue('3');
  for (let i = 0; i < 5; i++) await minus.click();
  await expect(felt).toHaveValue('1');
});

test('knapperne sender ikke formularen', async ({ page }) => {
  await åbn(page, '/bord/');
  await page.locator('.stepper-knap[data-trin="1"]').click();
  /* Var knappen type="submit", ville et tryk på + prøve at sende og
     vise fejlene for navn og telefon. */
  await expect(page.locator('#fejl-navn')).toBeHidden();
  await expect(page.locator('#bord-tak')).toBeHidden();
});

function booking(id, dato, tid, oprettet, navn) {
  return { id, lokation_id: 'mosede', reference: 'BO2608' + id + '-AAAAA', navn,
    telefon: '2030405' + id, dato, tid, antal_personer: 2, besked: null,
    status: 'ny', intern_note: null, oprettet };
}

test('Nye står efter, hvornår gæsterne kommer — ikke hvornår de bookede', async ({ page }) => {
  const d = grunddata();
  d.bordbestillinger = [
    booking(1, '2026-08-14', '18:00', '2026-08-01T10:00:00Z', 'Kommer om en uge'),
    booking(2, '2026-08-07', '19:00', '2026-08-06T09:00:00Z', 'Kommer i aften sent'),
    booking(3, '2026-08-07', '12:00', '2026-08-06T10:00:00Z', 'Kommer til frokost'),
  ];
  await åbnAdmin(page, { ur: '2026-08-07T08:00:00Z', data: d });
  await visFane(page, 'p-borde');
  await expect(page.locator('#borde-venter .bestil-kort')).toHaveCount(3);
  /* Navnene går gennem Admin.pæntNavn ("Kommer Til Frokost"), så der
     sammenlignes uden store og små bogstaver. */
  const tekst = (await page.locator('#borde-venter').textContent()).toLowerCase();
  const plads = ['kommer til frokost', 'kommer i aften sent', 'kommer om en uge']
    .map((n) => tekst.indexOf(n));
  expect(plads.every((p) => p >= 0), 'et navn mangler: ' + plads).toBe(true);
  expect(plads, 'rækkefølgen er ikke dag og tid').toEqual([...plads].sort((a, b) => a - b));
});
