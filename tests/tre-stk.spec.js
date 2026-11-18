// @ts-check
/* ============================================================
   3 STK.-PRISEN  (18/11)
   ------------------------------------------------------------
   Jim: *"Alm. Smørrebrød til 39,- 3 Stk. 110,-  Stort Smørrebrød
   55,- 3 Stk. 140,-"*. Prisen står på kategorien (pakke_antal,
   pakke_pris, pakke_stykpris), og siden lægger en fradragslinje i
   bestillingen, som databasen regner efter
   (supabase/proev-smoerrebroed-3-stk-18-11.sql prøver den halvdel).

   Her: summen, linjen, at slags må blandes, og at rejemaden til 99
   ikke tæller med.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';

function data() {
  const d = grunddata();
  d.indstillinger.bestilling_varsel_timer = 2;
  d.indstillinger.bestilling_min_stk = 1;
  d.menu_kategorier = [
    { id: 39, afdeling: 'mad', navn: 'Alm. smørrebrød', sortering: 1, aktiv: true,
      rolle: 'haandmadder', pakke_antal: 3, pakke_pris: 110, pakke_stykpris: 39 },
    { id: 13, afdeling: 'mad', navn: 'Stort smørrebrød', sortering: 2, aktiv: true,
      rolle: 'smoerrebroed', pakke_antal: 3, pakke_pris: 140, pakke_stykpris: 55 },
  ];
  const v = (id, kat, navn, pris, s) => ({ id, kategori_id: kat, navn, beskrivelse: null, pris,
    fremhaevet: false, udsolgt: false, sortering: s, aktiv: true });
  d.menu_varer = [
    v(1, 39, 'Leverpostej med surt, alm.', 39, 1),
    v(2, 39, 'Rullepølse med sky og løg, alm.', 39, 2),
    v(3, 13, 'Leverpostej med surt', 55, 1),
    v(4, 13, 'Rejemad', 99, 2),
  ];
  d.indstillinger.bestilbare_kategorier = [39, 13];
  return d;
}

async function åbn(page, d) {
  await åbnSkal(page, '/h-smorrebrod.html', { ur: FREDAG, data: d || data() });
}

async function foldUd(page, kategori) {
  const fold = page.locator('#bestil .item', { hasText: kategori }).first();
  const knap = fold.locator('[data-add]');
  await knap.waitFor({ state: 'attached' });
  if ((await knap.textContent()).indexOf('luk') === -1) await fold.click();
}

async function tælOp(page, kategori, vare, n) {
  await foldUd(page, kategori);
  const plus = page.locator('[data-vare="' + vare + '"] button[data-d="+"]');
  await plus.waitFor({ state: 'visible' });
  for (let i = 0; i < n; i += 1) await plus.click();
  await expect(page.locator('[data-vare="' + vare + '"] [data-step] b')).toHaveText(String(n));
}

test.describe('3 stk.-prisen på smørrebrødet', () => {
  test('3 alm. blandet koster 110 — og fradraget står som sin egen linje', async ({ page }) => {
    await åbn(page);
    await tælOp(page, 'Alm. smørrebrød', 'Leverpostej med surt, alm.', 2);
    await tælOp(page, 'Alm. smørrebrød', 'Rullepølse med sky og løg, alm.', 1);
    const sum = page.locator('#sumline');
    await expect(sum).toContainText('3 stk. Alm. smørrebrød 110,-: −7,-');
    await expect(sum).toContainText('i alt 110,-');
  });

  test('2 alm. har ingen 3 stk.-pris', async ({ page }) => {
    await åbn(page);
    await tælOp(page, 'Alm. smørrebrød', 'Leverpostej med surt, alm.', 2);
    const sum = page.locator('#sumline');
    await expect(sum).not.toContainText('Alm. smørrebrød 110,-');
    await expect(sum).toContainText('i alt 78,-');
  });

  test('7 alm. = 2 sæt + 1 til fuld pris (259)', async ({ page }) => {
    await åbn(page);
    await tælOp(page, 'Alm. smørrebrød', 'Leverpostej med surt, alm.', 7);
    const sum = page.locator('#sumline');
    await expect(sum).toContainText('2 × 3 stk. Alm. smørrebrød 110,-: −14,-');
    await expect(sum).toContainText('i alt 259,-');
  });

  test('rejemaden til 99 tæller ikke med i 3 stk. stort', async ({ page }) => {
    await åbn(page);
    await tælOp(page, 'Stort smørrebrød', 'Leverpostej med surt', 2);
    await tælOp(page, 'Stort smørrebrød', 'Rejemad', 1);
    const sum = page.locator('#sumline');
    // ("3 stk." står der — det er antallet i alt; fradraget må ikke)
    await expect(sum).not.toContainText('Stort smørrebrød 140,-');
    await expect(sum).toContainText('i alt 209,-');
  });

  test('fradraget følger med bestillingen som en pengelinje med kategorien', async ({ page }) => {
    await åbn(page);
    await tælOp(page, 'Stort smørrebrød', 'Leverpostej med surt', 3);
    await expect(page.locator('#sumline')).toContainText('i alt 140,-');
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#ssend').click();
    await expect.poll(async () => ((await gemteData(page)).bestillinger || []).length).toBe(1);
    const b = (await gemteData(page)).bestillinger[0];
    const pk = (b.linjer || []).filter((l) => l.pakke)[0];
    expect(pk, 'fradragslinjen mangler').toBeTruthy();
    expect(pk).toMatchObject({ antal: 1, pris: -25, emballage: true, pakke: 13 });
    const ialt = b.linjer.reduce((s, l) => s + l.pris * l.antal, 0);
    expect(ialt).toBe(140);
  });
});
