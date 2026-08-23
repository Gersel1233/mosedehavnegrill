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
const { åbn, åbnAdmin } = require('./hjaelp');

/* Loftet. Sat efter en måling med luft til at siden må vokse lidt,
   men ikke til at nogen kan lægge en video eller et ukomprimeret
   foto ind uden at det bliver bemærket.

   Videoen tælles ikke med: testbrowseren er bygget uden H.264 og
   henter derfor VP9-udgaven på 1,8 MB, hvor en rigtig telefon
   henter 1,3 MB. Den skal alligevel først komme EFTER introen, og
   det måles for sig.

   HÆVET FRA 700 TIL 720 DEN 23/8, OG DET ER VÆRD AT VIDE HVORFOR.

   Leveringen af smørrebrød ud af huset lagde 6,7 kB til
   bestilling.js, store.js og style.css. Siden lå på 700 kB præcis
   — loftet var sat UDEN luft — så den nye funktion væltede
   testen med syv kilobyte.

   Undervejs blev to ting målt, som er værd at have skrevet ned,
   fordi begge lignede fejl og ingen af dem var det:

   1) Telefonen henter facade-1400.jpg (165 kB), ikke 800-udgaven.
      Det er RIGTIGT: iPhone 13 har tre gange pixeltæthed, så
      390 px skærm beder om 1170 px billede, og srcset vælger
      1400. En skærm med to gange tæthed henter 800-udgaven, som
      den skal.
   2) Derfor kan telefonen ikke få et strammere loft end
      computeren. De henter det samme.

   DE 13 KB LUFT ER IKKE MEGET. Næste gang den her test fejler,
   skal svaret ikke være et større tal: så skal nogen se på, om
   hele store.js (106 kB) hører til på forsiden, eller om den kan
   deles, så gæstens halvdel kommer alene. Det er det største
   enkeltbeløb, der kan skæres uden at fjerne noget, gæsten ser. */
const LOFT_KB = 720;

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

/* ============================================================
   SKRIVELAGET HØRER IKKE TIL PÅ GÆSTESIDEN
   ------------------------------------------------------------
   js/store.js indeholdt både gæstens halvdel og personalets. De
   22 kB rettelser i admin blev hentet på hver eneste sidevisning
   af en gæst, der aldrig kommer til at bruge dem — og det var
   dét, der væltede loftet ovenfor, da bordbestillingen kom til.

   Prøven her er den anden ende af den beslutning. Uden den
   ville nogen med god samvittighed kunne lægge en ny skrive-
   funktion tilbage i store.js, og vægten ville snige sig ind
   igen — nøjagtig som den gjorde første gang.
   ============================================================ */
test('gæstesiden henter ikke personalets skrivelag', async ({ page }) => {
  await åbn(page, '/index.html');
  const har = await page.evaluate(() => ({
    butik: typeof window.Butik,
    skrive: typeof (window.Butik && window.Butik.skrive),
    bestil: typeof (window.Butik && window.Butik.bestil),
  }));
  expect(har.butik, 'datalaget mangler helt').toBe('object');
  expect(har.skrive, 'forsiden henter admins skrivelag').toBe('undefined');
  /* Gæsten skriver stadig sin EGEN bestilling. Ryger den med ud,
     kan der ikke bestilles noget nogen steder. */
  expect(har.bestil, 'gæsten kan ikke sende sin egen bestilling').toBe('function');
});

test('personalesiden henter det', async ({ page }) => {
  await åbnAdmin(page);
  const typer = await page.evaluate(() => [
    typeof (window.Butik.skrive || {}).indstilling,
    typeof (window.Butik.skrive || {}).bord,
    typeof (window.Butik.skrive || {}).vare,
  ]);
  expect(typer, 'admin kan ikke gemme noget — er js/store-skriv.js glemt?')
    .toEqual(['function', 'function', 'function']);
});
