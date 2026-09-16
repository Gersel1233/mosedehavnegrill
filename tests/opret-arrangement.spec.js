/* ============================================================
   ÉN VEJ TIL AT LÆGGE EN BEGIVENHED OP  (16/9)
   ------------------------------------------------------------
   Ejerens spørgsmål: *"i tilmeldinger — hvad er det til udover at se
   hvem der har reserveret? Hvordan opretter jeg de ting med musik, og
   hvad hvis det er noget helt andet unikt? Det skal havne inde i «hvad
   sker der» og gå automatisk ind i «tidligere på havnen» med dato."*

   MÅLT: Tilmeldinger kunne ikke oprette noget som helst — den er
   dørlisten — og Nyheder kunne kun lave en nyhed UDEN dato, som aldrig
   når "Hvad sker der". Vejen fandtes kun på Kalender, og man skulle
   vide det.

   ⚠️ TYPEN ER DET FARLIGE. Kalenderens standard er LUKKEDAG. En knap,
   der bare åbnede fanen, ville lade den, der fulgte den, oprette en
   lukkedag uden at opdage det — og så er der lukket den dag, musikken
   spiller.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const UR = '2026-09-16T11:00:00Z';
const DAG = '2026-10-03';

async function fraFanen(page, fane, knap) {
  await åbnAdmin(page, { ur: UR, data: grunddata() });
  await visFane(page, fane);
  await page.locator(knap).click();
}

for (const [navn, fane, knap] of [
  ['Tilmeldinger', 'p-tilmeldinger', '#tilmeld-opret'],
  ['Nyheder', 'p-nyheder', '#nyhed-opret-arr'],
]) {
  test('fra ' + navn + ' fører knappen hen til formularen', async ({ page }) => {
    await fraFanen(page, fane, knap);
    await expect(page.locator('#p-kalender')).not.toHaveClass(/skjult/);
    /* "Vis for gæsterne" er slået til: et arrangement, ingen kan se,
       er ikke det, knappen lovede. */
    await expect(page.locator('#kal-offentlig')).toBeChecked();
    await expect(page.locator('#kal-titel')).toBeFocused();
  });

  /* ⚠️ BEVISET ER RÆKKEN, IKKE FORMULAREN. Et flueben, der ser rigtigt
     ud, siger intet om, hvad der bliver gemt — og standarden er en
     lukkedag. */
  test('og det, der gemmes fra ' + navn + ', er et offentligt arrangement', async ({ page }) => {
    await fraFanen(page, fane, knap);
    await page.locator('#kal-titel').fill('Livemusik på molen');
    await page.locator('#kal-dato').fill(DAG);
    await page.locator('#tilfoej-kalender').click();

    await expect.poll(async () =>
      ((await gemteData(page)).kalender || []).filter((k) => k.dato === DAG).length)
      .toBe(1);
    const k = ((await gemteData(page)).kalender || []).filter((r) => r.dato === DAG)[0];
    expect(k.type, 'knappen oprettede en lukkedag').toBe('arrangement');
    expect(k.offentlig, 'arrangementet står ikke på siden').toBe(true);
    expect(k.titel).toBe('Livemusik på molen');
  });
}
