/* ============================================================
   MORGENMADEN ØVERST OM MORGENEN  (16/9)
   ------------------------------------------------------------
   Ejerens ord: "om morgenen er morgenmaden øverst på forsiden, og
   ved bestillinger om eftermiddagen er det smørrebrød og de ting —
   aften er det aftensmad, så det hænger sammen."

   Ejeren sætter selv, hvilke kategorier hører til morgen, frokost og
   aften (kategori_dagsdel). Reglen er Butik.dagsdelRang, og to sider
   spørger den: forsiden efter det VALGTE afhentningstidspunkt, QR-
   siden ved bordet efter klokken nu. Uden ejerens liste står alt
   efter hans egen sortering, som før — det er modstykket.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData, visFane, springIntroOver } = require('./hjaelp');

function v(id, kategori_id, navn, pris) {
  return { id, kategori_id, navn, pris, sortering: 1, aktiv: true, udsolgt: false, beskrivelse: null };
}

/* Ejerens rækkefølge er Retter → Smørrebrød → Morgenmad. Dagens del
   skal kunne vende den; uden ejerens liste må den ikke. */
function menu(indstillinger) {
  const d = grunddata({
    borde: [{ id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude', aktiv: true, sortering: 1 }],
  });
  d.menu_kategorier = [
    { id: 9, afdeling: 'mad', navn: 'Retter', sortering: 1, aktiv: true },
    { id: 1, afdeling: 'mad', navn: 'Smørrebrød', sortering: 5, aktiv: true },
    { id: 8, afdeling: 'mad', navn: 'Morgenmad', sortering: 11, aktiv: true },
  ];
  d.menu_varer = [v(1, 9, 'Stegt fisk', 125), v(2, 1, 'Rejemad', 85), v(3, 8, 'Morgentallerken', 95)];
  d.indstillinger = Object.assign({}, d.indstillinger, {
    bestilbare_kategorier: [9, 8],
    bestilling_varsel_timer: 0,
    kategori_dagsdel: { 8: ['morgen'], 1: ['frokost'], 9: ['aften'] },
  }, indstillinger || {});
  return d;
}

async function forsidensRaekke(page) {
  return page.$$eval('#bestil [data-kat-valgt]',
    (m) => m.map((x) => x.parentNode.querySelector('h4').textContent.trim()));
}

async function forsiden(page, data, kl) {
  await åbn(page, '/index.html', { ur: '2026-08-06T08:00:00Z', data });   // 10.00 dansk tid
  await springIntroOver(page);
  await page.locator('#tid').selectOption(kl);
  await expect(page.locator('#bestil [data-kat-valgt]').first()).toBeAttached();
}

test.describe('Forsidens bestilling følger det tidspunkt, gæsten henter', () => {

  test('henter hun til frokost, står smørrebrødet øverst', async ({ page }) => {
    await forsiden(page, menu(), '12:30');
    expect((await forsidensRaekke(page))[0]).toBe('Smørrebrød');
  });

  test('henter hun om aftenen, står retterne øverst', async ({ page }) => {
    await forsiden(page, menu(), '18:00');
    expect((await forsidensRaekke(page))[0]).toBe('Retter');
  });

  /* Grænsen er ejerens: med frokost fra kl. 12 er 11.30 morgen. */
  test('henter hun om morgenen, står morgenmaden øverst — efter ejerens grænse', async ({ page }) => {
    await forsiden(page, menu({ dagsdele: { frokost: '12:00', aften: '16:00' } }), '11:30');
    expect((await forsidensRaekke(page))[0]).toBe('Morgenmad');
  });

  /* ⚠️ MODSTYKKET. Uden det ville en regel, der flyttede alt efter
     klokken — også når ejeren intet har sat — bestå prøverne ovenfor. */
  test('uden ejerens liste står alt i hans egen rækkefølge', async ({ page }) => {
    await forsiden(page, menu({ kategori_dagsdel: null }), '18:00');
    expect(await forsidensRaekke(page)).toEqual(['Retter', 'Smørrebrød', 'Morgenmad']);
  });
});

test.describe('Ved bordet følger den klokken nu', () => {
  async function bordet(page, ur) {
    await åbn(page, '/ved-bordet/?bord=7', { ur, data: menu() });
    await expect(page.locator('.kort-gruppe').first()).toBeVisible();
    return page.$$eval('.kort-gruppe[data-gruppe]', (g) => g.map((x) => x.getAttribute('data-gruppe')));
  }

  test('kl. 12.30 står smørrebrødet øverst', async ({ page }) => {
    expect((await bordet(page, '2026-08-06T10:30:00Z'))[0]).toBe('Smørrebrød');
  });

  test('kl. 18.30 står retterne øverst', async ({ page }) => {
    expect((await bordet(page, '2026-08-06T16:30:00Z'))[0]).toBe('Retter');
  });
});

test.describe('Ejeren sætter det i admin', () => {
  test('fluebenet "om morgenen" lægger kategorien i listen — og tager den ud igen', async ({ page }) => {
    await åbnAdmin(page, { ur: '2026-08-06T08:00:00Z', data: menu({ kategori_dagsdel: {} }) });
    await visFane(page, 'p-menu');
    const f = page.locator('#dagsdel-8-morgen');
    await expect(f).not.toBeChecked();
    await f.check();
    await expect.poll(async () => (await gemteData(page)).indstillinger.kategori_dagsdel['8'])
      .toEqual(['morgen']);
    await page.locator('#dagsdel-8-morgen').uncheck();
    await expect.poll(async () => (await gemteData(page)).indstillinger.kategori_dagsdel['8'])
      .toBeUndefined();
  });
});
