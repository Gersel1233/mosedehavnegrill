/* ============================================================
   BILLEDERNE TILPASSER SIG SELV  (16/9)
   ------------------------------------------------------------
   Ejerens ord: billeder, der lægges op i admin, skal "automatisk
   passe til siden og se godt ud".

   MÅLT før: hvert foto blev skåret til 16:9 i det sekund, det blev
   valgt — også til felter, der ikke er 16:9. Galleriets store felt er
   på højkant (640:854), så et telefonfoto på højkant mistede først to
   tredjedele til 16:9 og blev så skåret IGEN af feltet: tilbage stod
   en smal stribe af midten, i lav opløsning.

   Nu gemmes forsidens billeder i deres egen form (den lange side
   højst 1600 px), og hvert felt skærer selv sit udsnit ud.
   ⚠️ NYHEDERNE BESKÆRES STADIG TIL 16:9 — dér vælger ejeren selv
   top/midt/bund og ser resultatet i forhåndsvisningen. Det er
   modstykket nedenfor: uden det ville en regel, der bare holdt op
   med at beskære overalt, bestå.

   Målene læses af øvetilstandens filnavn (proeve-…-BxH.jpg), som
   skrives af det lærred, der FAKTISK blev tegnet.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, visFane, gemteData } = require('./hjaelp');

function svg(b, h) {
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + b
    + '" height="' + h + '"><rect width="' + b + '" height="' + h
    + '" fill="#c83"/></svg>');
}

async function lægOp(page, noegle, b, h) {
  await visFane(page, 'p-forside');
  const felt = page.locator('[data-foto="' + noegle + '"] input[type=file]');
  await felt.setInputFiles({ name: 'foto.svg', mimeType: 'image/svg+xml', buffer: svg(b, h) });
  await expect.poll(async () =>
    String(((await gemteData(page)).indstillinger || {})[noegle] || '')).toMatch(/\d+x\d+\.jpg$/);
  const url = String((await gemteData(page)).indstillinger[noegle]);
  const m = url.match(/-(\d+)x(\d+)\.jpg$/);
  return { b: Number(m[1]), h: Number(m[2]) };
}

test('et foto på højkant beholder sin form i en billedplads', async ({ page }) => {
  await åbnAdmin(page);
  const maal = await lægOp(page, 'foto_selskab_1', 600, 1200);
  expect(maal, 'fotoet blev skåret til 16:9').toEqual({ b: 600, h: 1200 });
});

test('et stort foto skaleres ned, så den LANGE side er højst 1600', async ({ page }) => {
  await åbnAdmin(page);
  /* På højkant: bredden alene er under loftet, så en regel, der kun
     så på bredden, ville gemme 1000×4000 — fire gange for tungt. */
  const maal = await lægOp(page, 'foto_tapas', 1000, 4000);
  expect(maal).toEqual({ b: 400, h: 1600 });
});

test('en nyhed beskæres stadig til 16:9', async ({ page }) => {
  await åbnAdmin(page);
  const url = await page.evaluate(async (s) => {
    const fil = new File([s], 'n.svg', { type: 'image/svg+xml' });
    return window.Butik.skrive.nyhedBillede(fil, 'midt');
  }, svg(600, 1200).toString());
  expect(url).toMatch(/-600x338\.jpg$/);
});

test('det lille billede i admin har feltets form', async ({ page }) => {
  await åbnAdmin(page);
  await visFane(page, 'p-forside');
  const form = (n) => page.locator('[data-foto="' + n + '"] .foto-mini')
    .evaluate((el) => getComputedStyle(el).aspectRatio);
  expect(await form('foto_selskab_1')).toBe('640 / 854');
  expect(await form('foto_tapas')).toBe('4 / 3');
});
