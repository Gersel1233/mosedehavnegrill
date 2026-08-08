/* Hvor meget skal der hentes før siden er brugbar?

   Siden ligger nede ved en havn. Gæsten står med telefonen i
   solen og vil vide om der er åbent. Hvert kilobyte før det
   spørgsmål er besvaret, er et kilobyte for meget.

   Testen findes fordi vægt sniger sig ind. Der var to
   posterbilleder på 209 kB som blev hentet ved hvert besøg og
   aldrig set af nogen: hero-videoens poster lå under et foto, og
   isfilmens lå 4000 px nede på siden. Ingen ville have opdaget
   det ved at se på siden.

   Der måles kun det der hentes FØR introen er væk. Det er der
   gæsten venter. Alt det tunge – videoerne, de store fotos
   længere nede – skal komme bagefter, og at det gør det, står i
   forside.spec.js og isfilm.spec.js.
*/

const { test, expect } = require('@playwright/test');
const { åbn } = require('./hjaelp');

/* Loftet. Sat efter en måling med luft til at siden må vokse lidt,
   men ikke til at nogen kan lægge en video eller et ukomprimeret
   foto ind uden at det bliver bemærket.

   Videoen tælles ikke med: testbrowseren er bygget uden H.264 og
   henter derfor VP9-udgaven på 1,8 MB, hvor en rigtig telefon
   henter 1,3 MB. Den skal alligevel først komme EFTER introen, og
   det måles for sig. */
const LOFT_KB = 700;

test('der hentes ikke mere end nødvendigt før siden er brugbar', async ({ page, isMobile }) => {
  test.setTimeout(60000);

  const hentet = [];
  page.on('response', async (r) => {
    // Kun det der faktisk kom over linjen
    try {
      const krop = await r.body();
      hentet.push({ navn: r.url().split('/').pop().split('?')[0], kb: krop.length / 1024 });
    } catch (e) { /* fx en afbrudt forespørgsel */ }
  });

  // intro: true – vi vil måle helt frem til introen slipper siden
  await åbn(page, '/index.html', { intro: true });
  await page.waitForSelector('#intro', { state: 'detached', timeout: 15000 });

  const video = hentet.filter((f) => /\.(mp4|webm)$/.test(f.navn));
  const resten = hentet.filter((f) => !/\.(mp4|webm)$/.test(f.navn));
  const sum = resten.reduce((a, f) => a + f.kb, 0);

  resten.sort((a, b) => b.kb - a.kb);
  console.log(`${isMobile ? 'telefon' : 'computer'}: ${Math.round(sum)} kB `
    + `før introen slap siden (loft ${LOFT_KB} kB)`);
  for (const f of resten.slice(0, 6)) console.log(`   ${f.navn}  ${Math.round(f.kb)} kB`);
  if (video.length) {
    console.log(`   (video undtaget: ${video.map((v) => v.navn + ' ' + Math.round(v.kb) + ' kB').join(', ')})`);
  }

  expect(resten.length, 'der blev ikke målt nogen filer').toBeGreaterThan(4);
  expect(Math.round(sum),
    `siden henter ${Math.round(sum)} kB før den er brugbar. Største: `
    + resten.slice(0, 3).map((f) => `${f.navn} ${Math.round(f.kb)} kB`).join(', '))
    .toBeLessThanOrEqual(LOFT_KB);
});

test('ingen fil på siden er større end den behøver', async ({ page }) => {
  /* Et enkelt foto på to megabyte kan gemme sig i en samlet vægt
     der ser rimelig ud, hvis resten er små. Derfor et loft pr.
     fil også. Videoerne er undtaget – de har deres egne grænser
     og hentes ikke ved sideindlæsning. */
  const LOFT_PR_FIL_KB = 420;

  const store = [];
  page.on('response', async (r) => {
    const navn = r.url().split('/').pop().split('?')[0];
    if (/\.(mp4|webm)$/.test(navn)) return;
    try {
      const krop = await r.body();
      if (krop.length / 1024 > LOFT_PR_FIL_KB) store.push(`${navn} ${Math.round(krop.length / 1024)} kB`);
    } catch (e) { /* ignoreres */ }
  });

  await åbn(page, '/index.html');
  // Hele vejen ned, så også de dovne billeder kommer med
  await page.locator('#find').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);

  expect(store, `filer over ${LOFT_PR_FIL_KB} kB: ${store.join(', ')}`).toEqual([]);
});
