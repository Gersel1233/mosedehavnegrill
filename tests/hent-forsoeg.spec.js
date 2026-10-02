/* ÉT BLINK PÅ NETTET MÅ IKKE GIVE EN HALV SIDE  (2. okt 2026)

   Mikkel: *"på siden når man loader, kommer den nogle gange til at
   starte med en offline eller en eller anden mærkelig incomplete
   version af siden."*

   MÅLT, ikke gættet: Butik.hent() er ét Promise.all over NI
   tabeller, og hentTabel prøvede kun igen ved 401 (fornyet token).
   Et blink på nettet, en timeout eller en 5xx på ÉN af de ni
   væltede hele hentningen — og så faldt siden i nød-tilstanden med
   kodens reservedata. Med ni samtidige kald er chancen for at
   mindst ét svigter ni gange så stor som for ét. Det er præcis
   "nogle gange".

   Skrivningen har haft tre forsøg siden 22/8 (spiis' lærepenge,
   tests/robusthed.spec.js). Læsningen havde ingen. Prøverne her
   holder de to ens.

   ⚠️ OG DEN MÅ IKKE PRØVE IGEN PÅ ALT. Et 404 betyder, at tabellen
      ikke findes — dét svar bliver ikke rigtigere af at spørge tre
      gange, og nødmenuen ER det rigtige svar. Kun netfejl og
      5xx giver et nyt forsøg; det er den samme grænse, skrivningen
      bruger.
*/

const { test, expect } = require('@playwright/test');
const { sætUr, grunddata } = require('./hjaelp');

const SKY = 'https://prove.invalid';

/* Et minimalt, men gyldigt svar pr. tabel — nok til at hent()
   kan samle en side. Tallene er fiksturets egne. */
function svarFor(url, d) {
  const t = (url.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
  const bord = {
    lokationer: d.lokationer,
    aabningstider: d.aabningstider,
    kalender: [],
    menu_kategorier: d.menu_kategorier,
    menu_varer: d.menu_varer,
    nyheder: [],
    indstillinger: Object.keys(d.indstillinger).map((k) => ({
      lokation_id: 'mosede', noegle: k, vaerdi: d.indstillinger[k],
    })),
    dagens_retter: [],
    dags_regler: [],
  };
  return bord[t] || [];
}

/* ⚠️ SIDEN HENTER SELV, NÅR DEN ÅBNES — og den første udgave af
   prøven her talte dén hentning med. Så var tællerne brugt op,
   før målingen begyndte: de to forsøgs-prøver "bestod" uden at
   røre reglen, og kun 404-prøven afslørede det. Derfor åbnes
   siden med planen SLUKKET, og planen tændes først bagefter.

   Det er husets egen fælde i ny form: en prøve, der måler sin
   egen kulisse i stedet for koden. */
function opsaetning(page) {
  const d = grunddata();
  const plan = { svigt: {}, maade: 'afbryd', talt: {} };
  return {
    plan,
    async aabn() {
      await page.route('**/js/config.js*', (r) => r.fulfill({
        status: 200, contentType: 'application/javascript',
        body: "window.MOSEDE_CLOUD = { url: '" + SKY + "', anonKey: 'prove', lokation: 'mosede' };",
      }));
      await page.route(SKY + '/**', (route) => {
        const url = route.request().url();
        const t = (url.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
        plan.talt[t] = (plan.talt[t] || 0) + 1;
        if (plan.svigt[t] && plan.talt[t] <= plan.svigt[t]) {
          return plan.maade === 'afbryd'
            ? route.abort('connectionreset')
            : route.fulfill({ status: plan.maade, contentType: 'application/json', body: '{}' });
        }
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify(svarFor(url, d)) });
      });
      await sætUr(page, '2026-08-07T11:00:00Z');
      await page.goto('/m-menukort.html');
      await page.waitForFunction(() => !!window.Butik);
      // Sidens egen hentning er forbi: nu begynder målingen.
      plan.talt = {};
    },
  };
}

test.describe('Hentningen tåler et blink på nettet', () => {
  /* ⚠️ MÅLT PÅ Butik.hent() SELV og ikke på skærmen: det er dér,
     reglen bor, og en prøve på en overskrift ville også bestå,
     hvis siden tilfældigvis tegnede noget andet rigtigt. */
  test('én tabel, der afbrydes én gang, vælter ikke hele siden', async ({ page }) => {
    const o = opsaetning(page);
    await o.aabn();
    o.plan.svigt = { menu_varer: 1 };
    const svar = await page.evaluate(() => window.Butik.hent()
      .then((d) => ({ ok: true, varer: (d.menu_varer || []).length, offline: !!d._offline }))
      .catch((e) => ({ ok: false, fejl: String(e && e.message) })));
    expect(svar.ok, 'hentningen væltede af ét blink: ' + svar.fejl).toBe(true);
    expect(svar.offline, 'siden faldt i nød-tilstanden').toBe(false);
    /* Tallet kommer udefra — fiksturets fem varer. */
    expect(svar.varer).toBe(5);
  });

  test('… og et 503 giver også et nyt forsøg', async ({ page }) => {
    const o = opsaetning(page);
    await o.aabn();
    o.plan.maade = 503;
    o.plan.svigt = { indstillinger: 2 };
    const svar = await page.evaluate(() => window.Butik.hent()
      .then(() => true).catch(() => false));
    expect(svar, 'to 503-svar i træk burde være prøvet igen').toBe(true);
    expect(o.plan.talt.indstillinger, 'der blev ikke prøvet igen').toBeGreaterThan(2);
  });

  /* ⚠️ MODSTYKKET. Et 404 betyder, at tabellen ikke findes, og
     dét svar bliver ikke rigtigere af tre forsøg — nødmenuen ER
     det rigtige svar. Uden den her prøve kunne nogen "løse"
     ovenstående ved at prøve igen på alt, og så ville en rigtig
     fejl tage tre gange så lang tid om at vise sig. */
  test('et 404 prøves IKKE igen — tabellen findes bare ikke', async ({ page }) => {
    const o = opsaetning(page);
    await o.aabn();
    o.plan.maade = 404;
    o.plan.svigt = { menu_varer: 99 };   // svarer 404 hver gang
    await page.evaluate(() => window.Butik.hent().catch(() => null));
    expect(o.plan.talt.menu_varer, 'et 404 blev prøvet igen — det skal det ikke').toBe(1);
  });
});
