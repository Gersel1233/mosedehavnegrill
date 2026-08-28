/* ============================================================
   DE TO E-MAILADRESSER  (28/8)

   Mikkel oplyste to rigtige adresser: selskab1@ og booking1@.
   De dækker præcis det, systemet IKKE gør — et tilbud på et
   selskab, en ændring i en booking, et spørgsmål der skal
   skrives ned frem for siges i en telefon.

   Det VIGTIGSTE, filen måler, er ikke at de er der. Det er, at
   den OPDIGTEDE adresse er væk: der stod hej@mosedehavnegrill.dk
   i bunden af ni sider — designets pladsholder, på et forkert
   domæne — og en gæst, der skrev til den, nåede ingen.
   ============================================================ */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { åbn, åbnSkal, åbnAdmin, grunddata, gemteData } = require('./hjaelp');

const ROD = path.join(__dirname, '..');

/* De ni sider, designet leverede med en footer. Listen læses af
   MAPPEN og ikke skrevet af i hånden: en tiende side med den
   samme footer ville ellers slippe forbi prøven. */
function siderMedFooter() {
  return fs.readdirSync(ROD)
    .filter((f) => f.endsWith('.html') && f !== 'admin.html')
    .filter((f) => fs.readFileSync(path.join(ROD, f), 'utf8').includes('class="fcols"'));
}

test.describe('Den opdigtede adresse er væk', () => {

  test('ingen side nævner hej@mosedehavnegrill.dk', () => {
    const sider = siderMedFooter();
    expect(sider.length, 'der er ingen sider med footer at måle på')
      .toBeGreaterThan(5);
    for (const f of sider) {
      const tekst = fs.readFileSync(path.join(ROD, f), 'utf8');
      expect(tekst, f + ' har stadig den opdigtede adresse')
        .not.toContain('hej@mosedehavnegrill.dk');
    }
  });

  /* Og de to rigtige står der i stedet — i HTML'en, ikke kun i
     JavaScript. Står de kun i koden, forsvinder de den dag
     hentningen fejler, og så har siden ingen adresse. */
  test('og begge de rigtige står i hver footer', () => {
    for (const f of siderMedFooter()) {
      const tekst = fs.readFileSync(path.join(ROD, f), 'utf8');
      expect(tekst, f).toContain('selskab1@mosedehavnecafe.dk');
      expect(tekst, f).toContain('booking1@mosedehavnecafe.dk');
    }
  });

  /* ⚠️ ET LINK TIL "#" ER EN BLINDGYDE. Footeren havde
     <a href="#">Facebook</a> og det samme til Instagram på alle
     ni sider — gæsten trykker, siden hopper til toppen, og hun
     tror, det er hende, der gør noget forkert. Reglen står i
     js/oplysninger.js: tomme profiler vises ikke. */
  test('og de døde sociale links er væk', () => {
    for (const f of siderMedFooter()) {
      const tekst = fs.readFileSync(path.join(ROD, f), 'utf8');
      expect(tekst, f + ' har stadig et dødt Facebook-link')
        .not.toContain('<a href="#">Facebook</a>');
      expect(tekst, f).not.toContain('<a href="#">Instagram</a>');
    }
  });

  /* Adressen alene siger ingenting om, hvem der læser den.
     Etiketten er det, der får gæsten til at skrive det rigtige
     sted hen — og de to adresser er delt efter ÆRINDE. */
  test('hvert link siger, hvad adressen er til', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    const selskab = page.locator('a[data-post="selskab"]');
    const booking = page.locator('a[data-post="booking"]');
    await expect(selskab).toContainText('Selskaber');
    await expect(booking).toContainText('Bordbestilling');
    await expect(selskab).toHaveAttribute('href', /mailto:selskab1@/);
    await expect(booking).toHaveAttribute('href', /mailto:booking1@/);
  });
});

test.describe('Personalet kan skifte adresserne i admin', () => {

  test('en ny adresse slår den, der står i HTML', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger, {
      kontakt_email_selskab: 'fest@eksempel.dk',
    });
    await åbnSkal(page, '/index.html', { data: d });
    await expect(page.locator('a[data-post="selskab"]'))
      .toHaveAttribute('href', 'mailto:fest@eksempel.dk');
    // Den, ingen har rørt, står som den står.
    await expect(page.locator('a[data-post="booking"]'))
      .toHaveAttribute('href', /mailto:booking1@/);
  });

  /* ⚠️ TOM ER IKKE DET SAMME SOM ALDRIG SAT. Har forretningen
     nedlagt adressen, skal linket VÆK fra siden — ikke blive
     stående som en blindgyde. */
  test('en tømt adresse tager linket helt af siden', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger,
      { kontakt_email_selskab: '' });
    await åbnSkal(page, '/index.html', { data: d });
    await expect(page.locator('a[data-post="selskab"]')).toHaveCount(0);
    await expect(page.locator('a[data-post="booking"]')).toHaveCount(1);
  });

  test('felterne gemmes fra Kontakt-fanen', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    await page.locator('[data-panel="p-kontakt"]').click();
    await page.fill('#post-selskab', 'fest@eksempel.dk');
    await page.fill('#post-booking', 'bord@eksempel.dk');
    await page.locator('#gem-kontakt').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const i = (await gemteData(page)).indstillinger;
    expect(i.kontakt_email_selskab).toBe('fest@eksempel.dk');
    expect(i.kontakt_email_booking).toBe('bord@eksempel.dk');
  });

  /* En adresse med en tastefejl er værre end ingen: gæsten
     skriver, får ingen fejl, og hører aldrig fra nogen. */
  test('en skæv adresse bliver afvist med besked', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    await page.locator('[data-panel="p-kontakt"]').click();
    await page.fill('#post-booking', 'bord-uden-snabela');
    await page.locator('#gem-kontakt').click();
    await expect(page.locator('#fejl')).toContainText('Bordbestilling');
    expect(((await gemteData(page)).indstillinger || {}).kontakt_email_booking)
      .toBeUndefined();
  });
});

/* ============================================================
   VEJEN TILBAGE, DER IKKE ER ET OPKALD

   Halvdelen af dem, der spørger om et selskab eller booker et
   bord, gør det fra et arbejde, hvor de ikke kan ringe. Indtil nu
   sagde begge kvitteringer kun "ring".
   ============================================================ */
test.describe('Kvitteringerne fortæller, hvor man skriver hen', () => {

  test('forespørgslen peger på selskabsadressen med referencen',
    async ({ page }) => {
      await åbnSkal(page, '/h-selskaber.html', { data: grunddata() });
      await page.fill('#pdato', '2026-09-12');
      await page.fill('#pantal', '20');
      await page.fill('#pnavn', 'Anna Vind');
      await page.fill('#ptlf', '20304050');
      await page.locator('#forespoerg button.g.solid.blk').click();

      const panel = page.locator('#forespoerg');
      await expect(panel).toContainText('Vil I hellere skrive?');
      const link = panel.locator('a[href^="mailto:"]');
      await expect(link).toHaveText('selskab1@mosedehavnecafe.dk');
      // Referencen skal med i emnet — ellers ved personalet ikke,
      // hvilken sag mailen hører til.
      await expect(link).toHaveAttribute('href', /subject=Foresp/);
    });

  test('bordbestillingen peger på bookingadressen', async ({ page }) => {
    await åbn(page, '/bord/');
    await page.locator('#bord-antal').fill('4');
    await page.locator('#bord-navn').fill('Anna Vind');
    await page.locator('#bord-telefon').fill('20304050');
    await page.locator('#bord-send').click();

    const tak = page.locator('#bord-tak');
    await expect(tak).toContainText('Skal noget ændres');
    await expect(tak.locator('a[href^="mailto:"]'))
      .toHaveText('booking1@mosedehavnecafe.dk');
  });

  /* ⚠️ TOM ER OGSÅ TOM HER. Har forretningen nedlagt adressen,
     må kvitteringen ikke love en vej, der ikke findes. */
  test('og linjen findes ikke, hvis adressen er nedlagt', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger,
      { kontakt_email_booking: '' });
    await åbn(page, '/bord/', { data: d });
    await page.locator('#bord-antal').fill('4');
    await page.locator('#bord-navn').fill('Anna Vind');
    await page.locator('#bord-telefon').fill('20304050');
    await page.locator('#bord-send').click();

    await expect(page.locator('#bord-tak')).toContainText('Tak, Anna');
    await expect(page.locator('#bord-tak')).not.toContainText('Skal noget ændres');
  });
});
