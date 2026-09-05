/* ============================================================
   DAGENS RET: ÉN KILDE, FIRE SKÆRME  (5/9)
   ------------------------------------------------------------
   Kundens ord: dagens ret *"skal være mere eksklusiv på
   bestillings tingen … og fjernes fra sectionen under retter"*,
   og han skal kunne *"administrere hvor mange de har på
   hjemmeside og hvor mange der er tilbage på qr code
   bestillingerne"*.

   ⚠️ BAG ØNSKET LÅ EN RIGTIG FEJL. Tabellen `dagens_retter` kom
   24/8 med en ret PR. DAG, et antal og et udsolgt-flag, og
   forsiden og menukortet blev lagt om til den. `bestil/` og
   `ved-bordet/` blev IKKE — de læste stadig den ENE gamle
   indstilling `indstillinger.dagens_ret`. Altså:

     · skrev ejeren torsdagens ret i ugeplanen, stod den på
       forsiden og menukortet, men ikke på de to andre
       bestillingsveje
     · og "kun 3 tilbage" fandtes kun på menukortet — som man
       netop IKKE bestiller fra (24/8)

   ⚠️ OG DER ER ÉN PULJE, IKKE EN PR. SKÆRM. Køkkenet har ét
   antal portioner. To tal ville betyde, at hjemmesiden sagde
   udsolgt, mens bordet sagde "3 tilbage" om det SAMME køkken.

   Prøven læser DOM'en på hver skærm — ikke Butik.faaTilbage.
   Reglen bor ét sted, men OPTEGNINGEN er skrevet fire, og det er
   dér, to lister over det samme skrider fra hinanden. */
const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, grunddata } = require('./hjaelp');

const UR = '2026-08-07T11:00:00Z';   // fredag

function medRet(ekstra = {}) {
  const d = grunddata();
  d.indstillinger = { ...d.indstillinger, bestilling_varsel_timer: 0 };
  d.dagens_retter = [{
    id: 1, lokation_id: 'mosede', dato: '2026-08-07',
    navn: 'Stegt flæsk', beskrivelse: 'Med persillesovs.', pris: 95,
    antal_tilbage: 3, udsolgt: false, aktiv: true, sortering: 1,
    ...ekstra,
  }];
  d.borde = [{ id: 1, lokation_id: 'mosede', nummer: '7', aktiv: true, har_kode: false }];
  return d;
}

/* De fire skærme, der siger noget om dagens ret. To af dem
   bestiller man IKKE fra (menukortet), men de skal sige det
   samme — gæsten går imellem dem i ét klik. */
const SKÆRME = [
  { navn: 'bestil/', sti: '/bestil/', skal: false },
  { navn: 'ved-bordet/', sti: '/ved-bordet/?bord=7', skal: false },
  { navn: 'forsiden', sti: '/index.html', skal: true },
  { navn: 'menukortet', sti: '/m-menukort.html', skal: true },
];

async function åbnSkærm(page, s, data) {
  if (s.skal) await åbnSkal(page, s.sti, { ur: UR, data });
  else await åbn(page, s.sti, { ur: UR, data });
  await page.waitForTimeout(900);
}

SKÆRME.forEach((s) => {
  test('ugeplanens ret når frem til ' + s.navn, async ({ page }) => {
    await åbnSkærm(page, s, medRet());
    await expect(page.locator('body')).toContainText('Stegt flæsk');
  });

  test('"kun 3 tilbage" står på ' + s.navn, async ({ page }) => {
    await åbnSkærm(page, s, medRet());
    await expect(page.locator('body'),
      'gæsten skal kunne se, at der kun er tre — ikke først få nej ved afsendelsen')
      .toContainText('Kun 3 tilbage');
  });

  test('rigeligt tilbage siger ingenting på ' + s.navn, async ({ page }) => {
    /* ⚠️ MODSTYKKET, OG UDEN DET MÅLTE PRØVEN OVENFOR INGENTING.
       En regel, der skriver tallet ved ethvert antal, ville bestå
       den — og "kun 40 tilbage" på en almindelig dag er støj, som
       gør, at ingen læser linjen den dag, der er tre. */
    await åbnSkærm(page, s, medRet({ antal_tilbage: 40 }));
    await expect(page.locator('body')).toContainText('Stegt flæsk');
    /* ⚠️ IKKE bare ordet "tilbage": forsiden har en nedtælling,
       der siger "45 min. tilbage", og prøven faldt på den. Det er
       MÆRKATET, reglen handler om — målt på elementet OG på
       sætningen, så en ny klasse ikke slipper forbi. */
    await expect(page.locator('.mk-faa, .stk-faa, .vare-faa')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('Kun 40 tilbage');
  });
});

test('dagens ret står i sin EGEN blok på bestil/, ikke som en fold', async ({ page }) => {
  await åbn(page, '/bestil/', { ur: UR, data: medRet() });
  const blok = page.locator('.dagens-blok');
  await expect(blok).toBeVisible();
  await expect(blok).toContainText('Stegt flæsk');
  /* Ikke også en fold: uden det her ville prøven bestå på en
     side, der viser retten to steder. */
  await expect(page.locator('#bestil-stykker .fold-navn', { hasText: 'Dagens ret' }))
    .toHaveCount(0);
});

test('blokken siger hvilken DAG retten gælder', async ({ page }) => {
  /* Med ugeplanen kan gæsten stå på i morgen og se i morgens ret.
     Uden datoen tror hun, det er i dag — og henter forgæves. */
  const d = medRet();
  d.dagens_retter = [{ ...d.dagens_retter[0], dato: '2026-08-08', navn: 'Fiskefrikadeller' }];
  await åbn(page, '/bestil/', { ur: UR, data: d });
  const iMorgen = await page.locator('#bestil-dag option').nth(1).getAttribute('value');
  await page.locator('#bestil-dag').selectOption(iMorgen);
  await expect(page.locator('.dagens-blok')).toContainText('Fiskefrikadeller');
  await expect(page.locator('.dagens-blok'),
    'blokken skal sige, at retten er i morgen — ikke i dag').toContainText('i morgen');
});

test('en udsolgt dagens ret kan ikke lægges i kurven', async ({ page }) => {
  /* Databasens bremse tæller ned og sætter udsolgt ved nul. Tog
     bestillingssiden den med, kunne gæsten fylde kurven med mad,
     køkkenet ikke har — og først få nej ved afsendelsen. */
  await åbn(page, '/bestil/', { ur: UR, data: medRet({ udsolgt: true }) });
  await page.waitForTimeout(900);
  await expect(page.locator('.dagens-blok')).toHaveCount(0);
});
