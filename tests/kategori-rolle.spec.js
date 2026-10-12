/* ============================================================
   KATEGORIENS FASTE MÆRKE  (12. okt 2026)
   ------------------------------------------------------------
   Mikkels spørgsmål: *"de blir proppet under de rigtige sektioner og
   nemt at finde rundt i?"* — og så: *"fix til perfektion"*.

   MÅLT FØR: bestillingens smørrebrød, tapassiden og cateringens
   priser fandt kategorien på NAVNET. Omdøbte ejeren «Smørrebrød»,
   forsvandt varerne fra smørrebrødssiden uden en fejl nogen steder.

   NU: kategorien har et mærke (`rolle`, kategori-rolle.sql), som
   vælges i admin («Bruges på siden som»), og navnet er bare et navn.
   Databasens halvdel står i supabase/proev-kategori-rolle.sql.

   ⚠️ TO TILSTANDE, OG BEGGE MÅLES. Uden kolonnen (før filen er kørt —
   og i alle de gamle prøvers data) gætter siden på navnet som før.
   Med kolonnen gælder mærket. En prøve, der kun målte den ene, ville
   bestå på en regel, der ignorerede den anden.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

/* Grunddata med mærkerne sat, som efter kategori-rolle.sql: kolonnen
   findes på hver række, også de tomme. */
function medMaerker(ret) {
  const d = grunddata();
  const r = { 1: 'smoerrebroed', 12: 'fyld' };
  d.menu_kategorier = d.menu_kategorier.map((k) => Object.assign({}, k, { rolle: r[k.id] || null }));
  if (ret) ret(d);
  return d;
}
const kat = (d, id) => d.menu_kategorier.filter((k) => k.id === id)[0];

test.describe('Gæsten finder varerne, selv om kategorien skifter navn', () => {

  /* ⚠️ HELE POINTEN. Med navnet som nøgle var «Smørrebrød» → «Højt-
     belagt fra lugen» 32 varer væk fra bestillingen. */
  test('en omdøbt smørrebrødskategori bliver på smørrebrødssiden', async ({ page }) => {
    const d = medMaerker((d) => { kat(d, 1).navn = 'Højtbelagt fra lugen'; });
    await åbnSkal(page, '/h-smorrebrod.html', { data: d });
    await expect(page.locator('[data-kategori="Højtbelagt fra lugen"]').first()).toBeAttached();
  });

  /* Modstykket: før filen er kørt, er navnet stadig nøglen — siden må
     ikke ændre sig, før databasen er klar. */
  test('uden mærkerne gætter siden på navnet som før', async ({ page }) => {
    await åbnSkal(page, '/h-smorrebrod.html', { data: grunddata() });
    await expect(page.locator('[data-kategori="Smørrebrød"]').first()).toBeAttached();
  });

  /* ⚠️ OG MED MÆRKERNE STJÆLER ET NAVN IKKE EN PLADS. En ny kategori,
     der tilfældigvis hedder noget med smørrebrød, er ikke smørrebrød,
     før nogen har valgt det. */
  test('med mærkerne kommer en umærket kategori ikke med af sit navn', async ({ page }) => {
    const d = medMaerker((d) => {
      d.menu_kategorier.push({ id: 40, afdeling: 'mad', navn: 'Smørrebrødssnacks', sortering: 8, aktiv: true, rolle: null });
      d.menu_varer.push({ id: 400, kategori_id: 40, navn: 'Rugbrødschips', beskrivelse: null, pris: 25,
        fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true });
    });
    await åbnSkal(page, '/h-smorrebrod.html', { data: d });
    await expect(page.locator('[data-kategori="Smørrebrød"]').first()).toBeAttached();
    await expect(page.locator('[data-kategori="Smørrebrødssnacks"]')).toHaveCount(0);
  });

  /* Tapasfadet: prøvernes fad står i «Til selskabet» (skal-tapas.spec.js).
     Med mærket på kategorien og et nyt navn på varen er prisen der stadig. */
  test('et omdøbt tapasfad har stadig sin pris på tapassiden', async ({ page }) => {
    const d = medMaerker((d) => {
      d.menu_kategorier.push({ id: 20, afdeling: 'mad', navn: 'Havnens fade', sortering: 30, aktiv: true, rolle: 'tapas' });
      d.menu_varer.push({ id: 20, kategori_id: 20, navn: 'Havnens fad, pr. person', beskrivelse: null, pris: 145,
        fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true });
    });
    await åbnSkal(page, '/m-tapas.html', { ur: '2026-08-07T08:00:00Z', data: d });
    await expect(page.locator('[data-tapas-pris]')).toHaveText('145,-');
  });

  test('cateringens pris følger en omdøbt kategori', async ({ page }) => {
    const d = medMaerker((d) => {
      d.menu_kategorier.push({ id: 28, afdeling: 'mad', navn: 'Burgere fra pladen', sortering: 28, aktiv: true, rolle: 'sliders' });
      d.menu_varer.push({ id: 902, kategori_id: 28, navn: 'Lille burger med roastbeef', beskrivelse: null, pris: 45,
        fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true });
      d.menu_varer.push({ id: 903, kategori_id: 28, navn: 'Lille burger med æg', beskrivelse: null, pris: 40,
        fremhaevet: false, udsolgt: false, sortering: 2, aktiv: true });
    });
    await åbnSkal(page, '/h-catering.html', { data: d });
    await expect(page.locator('.getlist .gl-pris[data-rolle="sliders"]')).toHaveText('sliders fra 40,- stk.');
  });
});

test.describe('Mærket vælges i admin', () => {

  async function menufanen(page, d) {
    await åbnAdmin(page, { data: d });
    await visFane(page, 'p-menu');
    await page.locator('#kat-navn-1').waitFor({ state: 'attached' });
  }

  test('vælgeren står ved kategorien og gemmer mærket', async ({ page }) => {
    await menufanen(page, medMaerker());
    await expect(page.locator('#kat-rolle-1')).toHaveValue('smoerrebroed');
    await page.locator('#kat-rolle-6').selectOption('tapas');
    await expect.poll(async () => kat(await gemteData(page), 6).rolle).toBe('tapas');
    // Og navnet rører ikke mærket: kategorien kan omdøbes bagefter.
    await page.locator('#kat-navn-1').fill('Højtbelagt fra lugen');
    await page.locator('#kat-navn-1').blur();
    await expect.poll(async () => kat(await gemteData(page), 1).navn).toBe('Højtbelagt fra lugen');
    expect(kat(await gemteData(page), 1).rolle, 'omdøbningen tog mærket').toBe('smoerrebroed');
  });

  /* ⚠️ FØR FILEN ER KØRT, FINDES KOLONNEN IKKE — en vælger ville få hvert
     kategorigem til at fejle med PGRST204. */
  test('uden kolonnen er der ingen vælger', async ({ page }) => {
    await menufanen(page, grunddata());
    await expect(page.locator('#kat-rolle-1')).toHaveCount(0);
  });

  /* En ny kategori får mærket gættet af navnet ÉN gang — «Smørrebrød til
     jul» skal på bestillingen fra første dag. */
  test('en ny kategori med smørrebrød i navnet får mærket fra start', async ({ page }) => {
    await menufanen(page, medMaerker());
    await page.locator('#ny-kategori-navn').fill('Smørrebrød til jul');
    await page.locator('button', { hasText: '+ Tilføj kategori' }).click();
    await expect.poll(async () => ((await gemteData(page)).menu_kategorier
      .filter((k) => k.navn === 'Smørrebrød til jul')[0] || {}).rolle).toBe('smoerrebroed');
  });
});
