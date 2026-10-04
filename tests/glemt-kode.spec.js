/* ============================================================
   GLEMT ADGANGSKODE — UDEN AT RINGE TIL LESREG  (4/10)
   ------------------------------------------------------------
   Mikkels ord: *"har glemt deres adganskoder osv til deres login"*.

   MÅLT i databasen 4/10, og det er værre end en glemt kode:

     bogholderi@mosedehavnecafe.dk   (ejer, "Cheferne")
       oprettet 15/9 09:46 · last_sign_in_at NULL · 0 sessioner
     kontakt@mosedehavnecafe.dk      (medarbejder, "Personalet")
       oprettet 15/9 09:45 · logget ind ÉN gang, 15/9 11:58
       · 1 session, som har levet lige siden

   Chefens login er aldrig blevet brugt. Og køkkenets iPad kører
   på én session fra overdragelsesdagen — den dag, den session
   dør (iPad genstarter, nogen rydder browseren, nøglen trækkes
   tilbage), står personalet uden for døren, og ingen kender
   koden.

   Indtil nu var vejen ind igen: ring til Lesreg. Det er hverken
   en drift, kunden skal betale for, eller en, de kan regne med
   klokken 11 på en lørdag.

   ⚠️ DET ER SUPABASES EGEN MEKANISME, IKKE EN, JEG HAR FUNDET PÅ.
   /auth/v1/recover sender mailen, og /auth/v1/user sætter koden
   med den nøgle, mailens link bærer. Vi gemmer ikke koder, vi
   sender ikke mails selv, og der er ingen hemmelig nøgle i
   klientkoden — kun anon-nøglen, som allerede ligger der.

   ⚠️ OG SIDEN MÅ IKKE AFSLØRE, HVEM DER HAR ET LOGIN. Svaret er
   det samme, om e-mailen findes eller ej. Ellers er loginskærmen
   en liste over, hvem der kan komme ind.
   ============================================================ */

const { test, expect } = require('@playwright/test');

const SKY = 'https://db.eksempel.test';

/* Admin med en falsk sky og UDEN login — det er loginskærmen,
   der prøves her. Mønsteret er admin-net-nede.spec.js'. */
async function åbnLogin(page, { svar } = {}) {
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**/js/config.js*', (r) => r.fulfill({
    status: 200, contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD={url:'" + SKY + "',anonKey:'proeve'};",
  }));
  // Alt andet mod den falske sky får et tomt svar, så siden ikke hænger.
  await page.route(SKY + '/**', (r) => r.fulfill({
    status: 200, contentType: 'application/json', body: '[]',
  }));

  const kald = [];
  await page.route(SKY + '/auth/v1/recover*', (r) => {
    kald.push({ url: r.request().url(), krop: r.request().postDataJSON() });
    const s = (svar && svar.status) || 200;
    r.fulfill({ status: s, contentType: 'application/json',
      body: (svar && svar.body) || '{}' });
  });

  await page.goto('/admin.html');
  await page.waitForSelector('#login-form');
  return kald;
}

test.describe('Loginskærmen kan sende en ny kode', () => {
  test('der står en vej videre, når koden er glemt', async ({ page }) => {
    await åbnLogin(page);
    const knap = page.locator('#glemt-kode');
    await expect(knap, 'loginskærmen har ingen "glemt kode"').toHaveCount(1);
    await expect(knap).toBeVisible();
    /* ⚠️ EN RIGTIG KNAP, IKKE EN DØD LINJE. Køkkenets iPad har
       ingen mus, og den, der har glemt sin kode, er i forvejen
       presset — en <span>, man skal gætte sig til, er ingen vej. */
    expect(await knap.evaluate((e) => e.tagName)).toBe('BUTTON');
  });

  test('uden en e-mail bliver der ikke sendt noget', async ({ page }) => {
    const kald = await åbnLogin(page);
    await page.locator('#glemt-kode').click();
    await expect(page.locator('#login-fejl')).toBeVisible();
    await expect(page.locator('#login-fejl')).toContainText(/e-mail/i);
    expect(kald.length, 'der blev sendt en mail uden en adresse').toBe(0);
  });

  test('med en e-mail går kaldet til Supabases egen recover', async ({ page }) => {
    const kald = await åbnLogin(page);
    await page.locator('#email').fill('kontakt@mosedehavnecafe.dk');
    await page.locator('#glemt-kode').click();
    await expect(page.locator('#login-besked')).toBeVisible();

    expect(kald.length, 'der blev ikke sendt noget').toBe(1);
    expect(kald[0].krop.email).toBe('kontakt@mosedehavnecafe.dk');
    /* Linket i mailen skal lande på siden, der sætter koden — og
       på DEN HER vært, ikke på en skrevet ind i hånden. */
    expect(decodeURIComponent(kald[0].url), 'mailen peger ikke på ny-kode.html')
      .toContain('ny-kode.html');
  });

  /* ⚠️ SVARET MÅ IKKE AFSLØRE, OM E-MAILEN FINDES. */
  test('beskeden er den samme for en ukendt e-mail', async ({ page }) => {
    await åbnLogin(page);
    await page.locator('#email').fill('kontakt@mosedehavnecafe.dk');
    await page.locator('#glemt-kode').click();
    await expect(page.locator('#login-besked')).toBeVisible();
    const kendt = await page.locator('#login-besked').innerText();

    await page.reload();
    await page.waitForSelector('#login-form');
    await page.locator('#email').fill('en-der-ikke-findes@eksempel.dk');
    await page.locator('#glemt-kode').click();
    await expect(page.locator('#login-besked')).toBeVisible();
    const ukendt = await page.locator('#login-besked').innerText();

    expect(ukendt, 'skærmen røber, hvem der har et login').toBe(kendt);
    expect(kendt).toMatch(/hvis.*findes|har et login/i);
  });

  test('for mange forsøg siger det ligeud', async ({ page }) => {
    await åbnLogin(page, { svar: { status: 429, body: '{"msg":"email rate limit exceeded"}' } });
    await page.locator('#email').fill('kontakt@mosedehavnecafe.dk');
    await page.locator('#glemt-kode').click();
    const f = page.locator('#login-fejl');
    await expect(f).toBeVisible();
    await expect(f, 'en engelsk rate-limit-besked siger intet til et køkken')
      .toContainText(/for mange|prøv igen om/i);
    await expect(f).not.toContainText('rate limit');
  });
});

/* ============================================================
   SIDEN, MAILENS LINK LANDER PÅ
   ============================================================ */
test.describe('ny-kode.html sætter koden', () => {
  async function åbnNyKode(page, hash, { svar } = {}) {
    await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
    await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
    await page.route('**/js/config.js*', (r) => r.fulfill({
      status: 200, contentType: 'application/javascript',
      body: "window.MOSEDE_CLOUD={url:'" + SKY + "',anonKey:'proeve'};",
    }));
    const kald = [];
    await page.route(SKY + '/auth/v1/user*', (r) => {
      kald.push({ krop: r.request().postDataJSON(),
        bærer: r.request().headers().authorization });
      const s = (svar && svar.status) || 200;
      r.fulfill({ status: s, contentType: 'application/json',
        body: (svar && svar.body) || '{"id":"1"}' });
    });
    await page.goto('/ny-kode.html' + (hash || ''));
    await page.waitForSelector('#ny-kode-side');
    return kald;
  }

  test('uden et link fra mailen vises der ingen kodefelter', async ({ page }) => {
    await åbnNyKode(page, '');
    await expect(page.locator('#ny-kode-form')).toBeHidden();
    await expect(page.locator('#ny-kode-besked'))
      .toContainText(/link|glemt|forfra/i);
  });

  test('siden må ikke stå i Google', async ({ page }) => {
    await åbnNyKode(page, '');
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots, 'nulstillingssiden er ikke holdt ude af søgemaskiner')
      .toMatch(/noindex/);
  });

  test('to koder, der ikke er ens, sender ingenting', async ({ page }) => {
    const kald = await åbnNyKode(page, '#access_token=NOEGLE123&type=recovery');
    await expect(page.locator('#ny-kode-form')).toBeVisible();
    await page.locator('#kode1').fill('Havnen2026!');
    await page.locator('#kode2').fill('Havnen2027!');
    await page.locator('#ny-kode-form button[type=submit]').click();
    await expect(page.locator('#ny-kode-fejl')).toContainText(/ens|samme/i);
    expect(kald.length, 'koden blev sendt, selv om de to felter var forskellige').toBe(0);
  });

  test('en for kort kode bliver afvist her og ikke først af databasen', async ({ page }) => {
    const kald = await åbnNyKode(page, '#access_token=NOEGLE123&type=recovery');
    await page.locator('#kode1').fill('kort');
    await page.locator('#kode2').fill('kort');
    await page.locator('#ny-kode-form button[type=submit]').click();
    await expect(page.locator('#ny-kode-fejl')).toContainText(/tegn/i);
    expect(kald.length).toBe(0);
  });

  test('to ens koder sættes med nøglen fra linket', async ({ page }) => {
    const kald = await åbnNyKode(page, '#access_token=NOEGLE123&type=recovery');
    await page.locator('#kode1').fill('Havnen2026!');
    await page.locator('#kode2').fill('Havnen2026!');
    await page.locator('#ny-kode-form button[type=submit]').click();

    await expect(page.locator('#ny-kode-besked')).toContainText(/kode.*(sat|ændret|klar)/i);
    expect(kald.length, 'koden blev aldrig sendt').toBe(1);
    expect(kald[0].krop.password).toBe('Havnen2026!');
    expect(kald[0].bærer, 'nøglen fra mailens link kom ikke med')
      .toBe('Bearer NOEGLE123');
    /* ⚠️ NØGLEN MÅ IKKE BLIVE LIGGENDE I ADRESSELINJEN. Den er et
       login i tekstform, og adresselinjen deles, skrives ned og
       ligger i historikken. */
    expect(page.url(), 'nøglen står stadig i adressen').not.toContain('NOEGLE123');
  });

  test('et udløbet link siger det på dansk', async ({ page }) => {
    await åbnNyKode(page, '#error=access_denied&error_code=otp_expired'
      + '&error_description=Email+link+is+invalid+or+has+expired');
    await expect(page.locator('#ny-kode-form')).toBeHidden();
    await expect(page.locator('#ny-kode-besked')).toContainText(/udløbet|brugt|nyt link/i);
    await expect(page.locator('#ny-kode-besked')).not.toContainText('invalid');
  });
});
