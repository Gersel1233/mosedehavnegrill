/* Den direkte forbindelse (fase 5c): bestillingen skal stå på
   skærmen i samme sekund, gæsten trykker send.

   Playwright kan spille realtime-serveren: routeWebSocket fanger
   forbindelsen, før den når nettet, og testen svarer med samme
   slags beskeder som Supabase. Så måles HELE kæden i klienten:
   admin åbner forbindelsen med de rigtige fire tabeller og sit
   eget token — og når serveren melder en ændring, står den nye
   bestilling på skærmen, uden at nogen har trykket på noget. */

const { test, expect } = require('@playwright/test');
const { sætUr, logInd, springIntroOver } = require('./hjaelp');

/* Egen opsætning i stedet for åbnAdmin(): live-forbindelsen er
   slukket i øvetilstand (med vilje — der er ingen server at tale
   med), så her får config.js en KUNSTIG sky, og både REST og
   websocket fanges, før de når nettet. */
async function åbnLiveAdmin(page, { rest }) {
  await page.route('**/js/config.js*', (r) => r.fulfill({
    contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD = { url: 'https://live.prove', anonKey: 'anon-testnoegle' };",
  }));
  await page.route('https://live.prove/rest/v1/**', rest);
  await sætUr(page, '2026-08-07T11:00:00Z');
  await logInd(page);
  await page.goto('/admin.html');
  await springIntroOver(page).catch(() => {});
  await expect(page.locator('#admin')).toBeVisible();
}

const bestilling = {
  id: 991, lokation_id: 'mosede', reference: 'SM260807-LIVE1',
  navn: 'Live Gæst', telefon: '20304050', hent_dato: '2026-08-07',
  hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 1, pris: 55 }],
  fyld: [], antal: 1, status: 'ny', intern_note: null,
  oprettet: '2026-08-07T10:59:00Z',
};

test('en ny bestilling står på skærmen uden tryk — og med reglerne overholdt', async ({ page }) => {
  /* REST: tom verden indtil "gæsten sender" — så én bestilling. */
  let gæstenHarSendt = false;
  const rest = (r) => {
    const url = r.request().url();
    let krop = [];
    if (url.includes('/bestillinger') && gæstenHarSendt) krop = [bestilling];
    if (url.includes('/indstillinger')) krop = [];
    r.fulfill({ contentType: 'application/json', body: JSON.stringify(krop) });
  };

  /* Realtime-serveren: gem forbindelsen, så prøven selv kan sende
     en ændring senere — og mål, at klienten opfører sig. */
  let tilslutning = null;
  let tilmelding = null;
  await page.routeWebSocket((url) => url.pathname.includes('/realtime/v1/websocket'), (ws) => {
    tilslutning = ws;
    ws.onMessage((rå) => {
      const b = JSON.parse(rå);
      if (b.event === 'phx_join') {
        tilmelding = b;
        ws.send(JSON.stringify({
          topic: b.topic, event: 'phx_reply', ref: b.ref,
          payload: { status: 'ok', response: {} },
        }));
      }
    });
  });

  await åbnLiveAdmin(page, { rest });

  // Forbindelsen skal være åbnet med de fire tabeller og tokenet
  await expect.poll(() => tilmelding !== null, { timeout: 5000 }).toBe(true);
  const tabeller = tilmelding.payload.config.postgres_changes.map((c) => c.table);
  expect(tabeller.sort()).toEqual(
    ['bestillinger', 'bordbestillinger', 'forespoergsler', 'udlejninger']);
  expect(tilmelding.payload.access_token, 'der lyttes UDEN personalets token — så '
    + 'håndhæver realtime ikke adgangsreglerne').toBe('lokal');

  await expect(page.locator('#overblik-nyt')).toContainText('ikke kommet noget');

  // "Gæsten sender": databasen får rækken, og realtime melder den
  gæstenHarSendt = true;
  tilslutning.send(JSON.stringify({
    topic: 'realtime:mosede-admin', event: 'postgres_changes', ref: null,
    payload: { data: { type: 'INSERT', table: 'bestillinger' } },
  }));

  // …og bestillingen står på skærmen, uden at nogen har rørt noget
  await expect(page.locator('#overblik-nyt')).toContainText('Live Gæst');
  await expect(page.locator('#bestil-antal')).toHaveText('1');
});

test('i øvetilstand åbnes ingen forbindelse', async ({ page }) => {
  /* Uden database er der ingen at lytte til — en websocket mod
     ingenting ville stå og banke på i konsollen. */
  let forsøgt = false;
  await page.routeWebSocket(() => true, () => { forsøgt = true; });

  const { åbnAdmin } = require('./hjaelp');
  await åbnAdmin(page);
  await page.waitForTimeout(600);
  expect(forsøgt, 'live.js åbnede en websocket i øvetilstand').toBe(false);
});
