/* Push (fase 5c): telefonen skal sige til, når der kommer noget
   ind.

   Selve afsendelsen sker i en Edge Function hos Supabase og kan
   ikke måles herfra — men alt det, der KAN gå galt i klienten,
   måles: at manifest og service worker kun hører til
   personalesiden (gæsten skal ikke hente en byte mere), at
   kortet i admin fortæller sandheden om enhedens tilstand, og at
   abonnementet gemmes med personalets e-mail på. */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { åbn, åbnAdmin, grunddata, gemteData } = require('./hjaelp');

const ROD = path.join(__dirname, '..');

test.describe('Filerne hører KUN til personalesiden', () => {

  test.skip(({ isMobile }) => !!isMobile, 'statiske filer måles kun én gang');

  test('manifestet er gyldigt og peger på admin', async () => {
    const m = JSON.parse(fs.readFileSync(path.join(ROD, 'manifest.webmanifest'), 'utf8'));
    expect(m.start_url).toBe('admin.html');
    expect(m.display).toBe('standalone');
    expect(m.icons.length).toBeGreaterThanOrEqual(2);
    for (const ikon of m.icons) {
      expect(fs.existsSync(path.join(ROD, ikon.src)), `${ikon.src} findes ikke`).toBe(true);
    }
  });

  test('kun admin linker manifestet — gæsten skal ikke installere noget', async () => {
    const admin = fs.readFileSync(path.join(ROD, 'admin.html'), 'utf8');
    expect(admin).toContain('rel="manifest"');

    /* Gæstesiderne er telefon-først og vejes ved hvert push — et
       manifest på forsiden er bytes og en "installér"-prompt,
       ingen gæst har bedt om. */
    for (const side of ['index.html', 'menu.html', 'smoerrebroed-ud-af-huset/index.html',
      'selskaber/index.html', 'bord/index.html', 'catering/index.html',
      'baglokale/index.html', 'arrangementer/index.html']) {
      const html = fs.readFileSync(path.join(ROD, side), 'utf8');
      expect(html, `${side} linker manifestet`).not.toContain('rel="manifest"');
      expect(html, `${side} registrerer service worker`).not.toContain('serviceWorker');
    }
  });

  test('service workeren cacher IKKE', async () => {
    /* En service worker med fetch-håndtering er en side, der kan
       vise gamle priser, efter personalet har rettet dem. Filen
       må kun kende push og klik. */
    const sw = fs.readFileSync(path.join(ROD, 'sw.js'), 'utf8');
    expect(sw).toContain("addEventListener('push'");
    expect(sw).toContain("addEventListener('notificationclick'");
    expect(sw, 'sw.js har en fetch-håndtering').not.toContain("addEventListener('fetch'");
    expect(sw, 'sw.js rører cachen').not.toMatch(/caches\.open|cache\.put/);
  });

  test('admin er stadig noindex, også med manifest på', async ({ page }) => {
    await page.goto('/admin.html');
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');
  });
});

test.describe('Kortet i admin', () => {

  /* Nøglerne laves af chefen selv med supabase/lav-vapid.html —
     de er ALDRIG i repoet. Før den offentlige er sat, skal kortet
     vise opsætningen og intet love. */
  test('uden nøgle vises opsætningen, og til-knappen findes ikke', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-kontakt"]').click();

    await expect(page.locator('#push-opsaetning')).toBeVisible();
    await expect(page.locator('#push-status')).toContainText('Opsætningen mangler');
    await expect(page.locator('#push-til')).toBeHidden();
    await expect(page.locator('#push-enheder')).toContainText('Ingen enheder');
  });

  test('en nøgle, der ikke ligner en nøgle, bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-kontakt"]').click();
    await page.locator('#vapid-noegle').fill('ikke-en-noegle');
    await page.locator('#gem-vapid').click();
    await expect(page.locator('#fejl')).toContainText('87 tegn');
  });

  test('med nøglen på plads forsvinder opsætningen', async ({ page }) => {
    const nøgle = 'B' + 'a'.repeat(86);
    await åbnAdmin(page, {
      data: grunddata({
        indstillinger: { ...grunddata().indstillinger, vapid_offentlig: nøgle },
      }),
    });
    await page.locator('[data-panel="p-kontakt"]').click();

    await expect(page.locator('#push-opsaetning')).toBeHidden();
    /* I testbrowseren uden abonnement skal der stå, at enheden
       ikke får besked — ikke et tomt felt, der ligner en fejl. */
    await expect(page.locator('#push-status')).not.toHaveText('');
    await expect(page.locator('#push-status')).not.toContainText('Opsætningen mangler');
  });

  test('tilmeldte enheder står på listen med navn og e-mail', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        push_abonnementer: [{
          id: 1, lokation_id: 'mosede', email: 'chef@mosede.dk', enhed: 'iPad',
          endpoint: 'https://push.eksempel/enhed-1', p256dh: 'x', auth: 'y',
          oprettet: '2026-08-07T08:00:00Z',
        }],
      }),
    });
    await page.locator('[data-panel="p-kontakt"]').click();
    await expect(page.locator('#push-enheder')).toContainText('iPad · chef@mosede.dk');
  });

  test('en enhed kan fjernes fra listen', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        push_abonnementer: [{
          id: 1, lokation_id: 'mosede', email: 'chef@mosede.dk', enhed: 'iPad',
          endpoint: 'https://push.eksempel/enhed-1', p256dh: 'x', auth: 'y',
          oprettet: '2026-08-07T08:00:00Z',
        }],
      }),
    });
    await page.locator('[data-panel="p-kontakt"]').click();
    page.once('dialog', (d) => d.accept());
    await page.locator('#push-enheder').getByRole('button', { name: 'Fjern' }).click();
    await expect(page.locator('#push-enheder')).toContainText('Ingen enheder');

    const gemt = await gemteData(page);
    expect((gemt.push_abonnementer || []).length).toBe(0);
  });
});

test.describe('Edge Function-koden holder sine egne regler', () => {

  test.skip(({ isMobile }) => !!isMobile, 'læser en fil, ikke en side');

  test('døren tjekkes før alt andet, og hemmeligheden står ikke i filen', async () => {
    const fn = fs.readFileSync(
      path.join(ROD, 'supabase', 'funktioner', 'send-push.ts'), 'utf8');

    /* Headeren skal tjekkes FØR json-parsning — ellers kan enhver
       på internettet få funktionen til at arbejde. Der måles på
       KODEN og ikke på ordet: 'x-mosede-secret' står også i
       kommentaren øverst, og første udgave af testen målte på den
       — og kunne dermed ikke fejle. Genindført fejl afslørede det. */
    const doer = fn.indexOf('req.headers.get("x-mosede-secret")');
    expect(doer).toBeGreaterThan(-1);
    expect(doer, 'json parses før døren er tjekket')
      .toBeLessThan(fn.indexOf('req.json'));

    /* Ingen hemmeligheder i koden: alt skal komme fra env. Selv
       den OFFENTLIGE VAPID-nøgle er ikke i repoet — den laves af
       chefen med lav-vapid.html og bor i indstillinger. */
    expect(fn).not.toMatch(/VAPID_PRIVAT\s*=\s*["']/);
    expect(fn).toContain("Deno.env.get(\"VAPID_PRIVAT\")");
    expect(fn).toContain("Deno.env.get(\"PUSH_SECRET\")");
    expect(fn).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  test('alle fire tabeller giver en besked', async () => {
    const fn = fs.readFileSync(
      path.join(ROD, 'supabase', 'funktioner', 'send-push.ts'), 'utf8');
    for (const tabel of ['bestillinger', 'forespoergsler', 'bordbestillinger', 'udlejninger']) {
      expect(fn, `${tabel} giver ingen push`).toContain(`"${tabel}"`);
    }
  });

  test('gæstens telefonnummer står ikke i push-teksten', async () => {
    /* En push kan ligge på en låst skærm i et køkken, hvor gæster
       går forbi. Navnets fornavn er nok til at vide, at der skal
       kigges — nummeret hører til inde i admin. */
    const fn = fs.readFileSync(
      path.join(ROD, 'supabase', 'funktioner', 'send-push.ts'), 'utf8');
    expect(fn).not.toMatch(/r\??\.telefon/);
  });
});
