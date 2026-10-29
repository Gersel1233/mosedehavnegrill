/* ============================================================
   BESKEDERNE HÆNGER SAMMEN  (29/10)
   ------------------------------------------------------------
   Mikkel: *"notifikationer skal lige være sikker på det virker,
   men også med beskederne — de skal være helt perfekte til hvordan
   det hænger sammen med spis her, levering, to go og dato, og være
   korrekt i admin og nemt for hele personalet"*.

   Databasens halvdel er supabase/proev-beskeder-29-10.sql (13/13).
   Her måles admin: prøveknappen, "🚗 Kør ud" på leveringen (som
   sender sms'en "på vej"), og at Afvis siger, at gæsten får en sms.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const UR = '2026-08-07T09:00:00Z';
const NØGLE = 'B' + 'a'.repeat(86);
const ENDPOINT = 'https://web.push.apple.com/PROEVE-ENHED';

function bestilling(æ) {
  return Object.assign({
    id: 31, reference: 'SM260807-LEV01', nummer: 31, lokation_id: 'mosede',
    navn: 'Lise Levering', telefon: '20304050', hent_dato: '2026-08-07', hent_tid: '13:00:00',
    hvordan: 'levering', kanal: 'forside', leverings_adresse: 'Strandvejen 4, 2670 Greve',
    linjer: [{ navn: 'Flæskestegssandwich', antal: 2, pris: 89 }], fyld: [], antal: 2,
    status: 'ny', oprettet: '2026-08-07T08:00:00Z',
  }, æ || {});
}

test.describe('Push: se det med egne øjne', () => {
  /* Testbrowseren har ingen rigtig push-tjeneste — enhedens
     abonnement lægges ind, som Safari ville have det. */
  async function medAbonnement(page) {
    await page.addInitScript((ep) => {
      const ab = { endpoint: ep, toJSON: () => ({ endpoint: ep, keys: { p256dh: 'p'.repeat(40), auth: 'a'.repeat(16) } }),
        unsubscribe: () => Promise.resolve(true) };
      const reg = { pushManager: { getSubscription: () => Promise.resolve(ab) } };
      Object.defineProperty(navigator, 'serviceWorker', { configurable: true,
        value: { getRegistration: () => Promise.resolve(reg), register: () => Promise.resolve(reg), ready: Promise.resolve(reg) } });
      window.PushManager = window.PushManager || function () {};
      window.Notification = window.Notification || function () {};
      try { Object.defineProperty(window.Notification, 'permission', { configurable: true, get: () => 'granted' }); } catch (e) { /* */ }
    }, ENDPOINT);
  }

  test('en tilmeldt enhed kan sende en prøve til sig selv', async ({ page }) => {
    await medAbonnement(page);
    await åbnAdmin(page, { data: grunddata({ indstillinger: { ...grunddata().indstillinger, vapid_offentlig: NØGLE } }) });
    await visFane(page, 'p-kontakt');
    await expect(page.locator('#push-proeve')).toBeVisible();
    await page.locator('#push-proeve').click();
    await expect(page.locator('#push-status')).toContainText('Prøven er sendt');
    await expect(page.locator('#push-status')).toContainText('Beskederne virker');
  });

  test('enheden skriver sig på listen igen, når admin åbnes', async ({ page }) => {
    await medAbonnement(page);
    await åbnAdmin(page, { data: grunddata({ indstillinger: { ...grunddata().indstillinger, vapid_offentlig: NØGLE }, push_abonnementer: [] }) });
    await visFane(page, 'p-kontakt');
    await expect.poll(async () => ((await gemteData(page)).push_abonnementer || []).map((x) => x.endpoint))
      .toContain(ENDPOINT);
  });

  test('uden abonnement er der ingen prøveknap', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ indstillinger: { ...grunddata().indstillinger, vapid_offentlig: NØGLE } }) });
    await visFane(page, 'p-kontakt');
    await expect(page.locator('#push-proeve')).toBeHidden();
  });
});

test.describe('Leveringen: "🚗 Kør ud" og så "✓ Leveret"', () => {
  test('den grønne knap på en levering er "Kør ud" — og gæsten får sms\'en om, at maden er på vej', async ({ page }) => {
    const d = grunddata(); d.bestillinger = [bestilling()];
    await åbnAdmin(page, { ur: UR, data: d });
    await visFane(page, 'p-bestillinger');
    const kort = page.locator('#p-bestillinger').locator('.bestil-kort, .kort', { hasText: 'Lise Levering' }).first();
    await kort.getByRole('button', { name: /Kør ud/ }).click();
    await expect(page.locator('#gemt, .kvittering, [role="status"]').first()).toContainText(/på vej/i);
    await expect.poll(async () => (await gemteData(page)).bestillinger[0].status).toBe('klar');
    await expect(page.locator('#p-bestillinger').getByRole('button', { name: /Leveret/ }).first()).toBeVisible();
  });

  test('en afhentning har stadig ét tryk: "✓ Færdig"', async ({ page }) => {
    const d = grunddata(); d.bestillinger = [bestilling({ hvordan: 'afhentning', navn: 'Hans Hent', leverings_adresse: null })];
    await åbnAdmin(page, { ur: UR, data: d });
    await visFane(page, 'p-bestillinger');
    await expect(page.locator('#p-bestillinger').getByRole('button', { name: /Færdig/ }).first()).toBeVisible();
    await expect(page.locator('#p-bestillinger').getByRole('button', { name: /Kør ud/ })).toHaveCount(0);
  });

  test('Afvis siger, at gæsten får en sms', async ({ page }) => {
    const d = grunddata(); d.bestillinger = [bestilling({ hvordan: 'afhentning', navn: 'Hans Hent' })];
    await åbnAdmin(page, { ur: UR, data: d });
    await visFane(page, 'p-bestillinger');
    let besked = '';
    page.once('dialog', (dlg) => { besked = dlg.message(); dlg.dismiss(); });
    await page.locator('#p-bestillinger .knap-mere').first().click();
    await page.locator('#p-bestillinger').getByRole('button', { name: 'Afvis' }).first().click();
    await expect.poll(() => besked).toContain('sms');
  });
});

/* Mikkel med et skud af kvitteringen: *"skriv også … alt vedrørende jeres
   bestilling, og du ved måske link til Trustpilot for at skrive"*. */
test.describe('Kvitteringen: alt om jeres bestilling', () => {
  async function bestilPaaForsiden(page, ind) {
    const { åbnSkal } = require('./hjaelp');
    const d = grunddata();
    d.indstillinger.bestilling_varsel_timer = 1;
    d.indstillinger.bestilling_min_stk = 1;
    Object.assign(d.indstillinger, ind || {});
    await åbnSkal(page, '/index.html#bestil', { ur: '2026-08-07T08:00:00Z', data: d });
    const dage = await page.locator('#dato option').evaluateAll((os) => os.map((o) => o.value));
    await page.locator('#dato').selectOption(dage[1] || dage[0]);
    await page.locator('#bestil .item').first().click();
    const plus = page.locator('#bestil button[data-d="+"]').first();
    await plus.click(); await plus.click();
    await page.fill('#navn', 'Mikkel Gersel');
    await page.fill('#tlf', '28871343');
    await page.locator('#tid').selectOption({ index: 1 });
    await page.locator('button.g.solid.blk').click();
    await expect(page.locator('.kvit-titel')).toBeVisible();
  }

  test('telefon, mail og anmeldelseslinks står på kvitteringen', async ({ page }) => {
    await bestilPaaForsiden(page, {
      kontakt_email_booking: 'booking@mosedehavnecafe.dk',
      social_google: 'g.page/r/mosede/review',
      social_trustpilot: 'https://dk.trustpilot.com/review/mosedehavnecafe.dk',
    });
    const k = page.locator('.kvit-kontakt');
    await expect(k).toContainText('Alt vedrørende jeres bestilling');
    await expect(k.locator('a[href^="tel:"]')).toHaveCount(1);
    await expect(k.locator('a[href="mailto:booking@mosedehavnecafe.dk"]')).toHaveCount(1);
    await expect(k.getByRole('link', { name: 'Google' })).toHaveAttribute('href', 'https://g.page/r/mosede/review');
    await expect(k.getByRole('link', { name: 'Trustpilot' })).toHaveAttribute('href', /trustpilot/);
  });

  test('uden et anmeldelseslink står der ingen tom knap', async ({ page }) => {
    await bestilPaaForsiden(page, { social_google: '', social_trustpilot: '' });
    await expect(page.locator('.kvit-kontakt')).toBeVisible();
    await expect(page.locator('.kvit-anmeld')).toHaveCount(0);
  });
});
