/* ============================================================
   FOTOET STÅR DER, FØR DATABASEN SVARER  (26/9)
   ------------------------------------------------------------
   Mikkels ord: *"animationerne på billederne der loader på siderne
   som f.eks tapas og alle dem nedenunder skal gøres bedre"*.

   MÅLT før: pladsen blev først fyldt, når Butik.hent() havde svaret.
   Imens stod designværktøjets stiplede kasse — og et tryk åbnede
   telefonens filvælger. Med en database på 2 sekunder stod tapas-
   fotoet efter 2,2 s og smørrebrødssidens efter 4,2 s; nu 0,2 s.

   ⚠️ DATABASEN SVARER MED VILJE EFTER 3 SEKUNDER. Prøven spørger
   efter 1,2 — svarede den med det samme, ville prøven bestå med
   den gamle regel og måle ingenting.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { grunddata, sætUr } = require('./hjaelp');

const SKY = 'https://db.eksempel.test';

async function langsomSky(page) {
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**/js/config.js*', (r) => r.fulfill({
    status: 200, contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD={url:'" + SKY + "',anonKey:'proeve'};",
  }));
  const d = grunddata();
  const svar = {
    lokationer: d.lokationer, aabningstider: d.aabningstider, kalender: [],
    menu_kategorier: d.menu_kategorier, menu_varer: d.menu_varer, nyheder: [],
    indstillinger: Object.keys(d.indstillinger).map((k) => ({ lokation_id: 'mosede', noegle: k, vaerdi: d.indstillinger[k] })),
    dagens_retter: [],
  };
  await page.route(SKY + '/**', async (r) => {
    await new Promise((ok) => setTimeout(ok, 3000));
    const t = new URL(r.request().url()).pathname.split('/').pop();
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(svar[t] || []) });
  }).catch(() => {});
  await page.addInitScript(() => { try { localStorage.setItem('mosede_vilkaar_v1', 'ja'); } catch (e) {} });
  await sætUr(page, '2026-08-07T11:00:00Z');
}

for (const [sti, ramme] of [['/m-tapas.html', '.tshot'], ['/h-smorrebrod.html', '.gal'], ['/h-baglokale.html', '.evhero']]) {
  test(sti + ': fotoet står, før databasen har svaret', async ({ page }) => {
    await langsomSky(page);
    await page.goto(sti, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const m = await page.evaluate((r) => {
      const boks = document.querySelector(r);
      const img = boks && boks.querySelector('img');
      return {
        pladser: document.querySelectorAll(r + ' image-slot').length,
        foto: !!img, hentet: !!(img && img.complete && img.naturalWidth > 0),
        venter: !!(img && img.closest('.foto-venter')),
      };
    }, ramme);
    expect(m.pladser, 'designværktøjets pladsholder står stadig — med filvælgeren bag et tryk').toBe(0);
    expect(m.foto, 'intet foto, før databasen har svaret').toBe(true);
    expect(m.hentet).toBe(true);
    expect(m.venter, 'fotoet er hentet, men tonede aldrig ind').toBe(false);
  });
}
