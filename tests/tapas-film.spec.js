/* ============================================================
   TAPASFILMEN ER GALLERIETS FØRSTE BILLEDE  (26/9)
   Mikkels ord: *"erstat billede 1 derinde med videoen og efter
   slutframen clean som nu skift imellem billederne, og når runden
   når tilbage til video/slutframe 1, så lad det bare være
   billedet"*.

   Sky-containerens Chromium har ingen H.264, så filmen kan ikke
   spille her. Prøverne gør det derfor på to måder:
   · SOM DEN ER: filmen springes over, og galleriet kører — med
     filmens eget slutbillede som billede 1
   · MED EN BROWSER, DER "KAN": canPlayType og play() stubbes, og
     .mp4'en svares med en lille WebM, Chromium KAN læse (ellers
     kommer en 'error', og filmen tages væk af sig selv). Så
     bestemmer prøven selv, hvornår filmen er slut
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';
const WEBM = fs.readFileSync(path.join(__dirname, 'facit', 'lille-film.webm'));

const fremme = (page) => page.evaluate(() => {
  const alle = [...document.querySelectorAll('.tshot .foto-skift img')];
  const vis = alle.filter((f) => f.classList.contains('vis'));
  return vis.length === 1 ? alle.indexOf(vis[0]) : -vis.length - 1;
});
const fmt = (info) => (info.project.name === 'computer' ? '16x9' : '4x3');

/* Stubben opfører sig som en rigtig browser, der spiller: play()
   sender 'playing', og pause() standser den (28/9 — filmen stiller
   sig selv på pause, hvis den ikke kan nå til ende, og det skal
   kunne ses herfra). Selve filen hentes rigtigt, så 'canplaythrough'
   og buffered kommer fra Chromium og ikke fra prøven. `hold` holder
   svaret tilbage, til prøven slipper det — et langsomt mobilnet. */
async function kanSpille(page, { hold } = {}) {
  await page.route('**/film/tapas-*.mp4*', async (r) => {
    if (hold) await hold;
    await r.fulfill({ status: 200, contentType: 'video/webm', body: WEBM });
  });
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.canPlayType = () => 'probably';
    HTMLMediaElement.prototype.play = function () {
      this.__spiller = true;
      this.__spil = (this.__spil || 0) + 1;
      Object.defineProperty(this, 'paused', { configurable: true, get: () => !this.__spiller });
      setTimeout(() => { if (this.__spiller) this.dispatchEvent(new Event('playing')); }, 0);
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () { this.__spiller = false; };
  });
}

test.describe('Tapasfilmen i galleriet', () => {
  test('uden en film, der kan spille: galleriet kører med filmens slutbillede først', async ({ page }, info) => {
    await åbnSkal(page, '/m-tapas.html', { ur: FREDAG, data: grunddata() });
    const fotos = page.locator('.tshot .foto-skift img');
    await expect(fotos).toHaveCount(3);
    await expect(fotos.first()).toHaveAttribute('src', new RegExp(`film/tapas-${fmt(info)}-slut\\.jpg`));
    await expect.poll(() => fotos.first().evaluate((f) => f.naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('.tshot video')).toHaveCount(0);
    await expect.poll(() => fremme(page), { timeout: 9000 }).toBe(1);
  });

  test('filmen spiller først — galleriet venter, til den er slut, og den kommer ikke igen', async ({ page }, info) => {
    await kanSpille(page);
    await åbnSkal(page, '/m-tapas.html', { ur: FREDAG, data: grunddata() });
    const video = page.locator('.tshot .foto-skift video.foto-film');
    await expect(video).toHaveCount(1);
    await expect(video).toHaveAttribute('src', new RegExp(`film/tapas-${fmt(info)}\\.mp4`));
    await expect(video).toHaveAttribute('poster', new RegExp(`film/tapas-${fmt(info)}-start\\.jpg`));
    await expect.poll(() => video.evaluate((v) => !!v.__spiller)).toBe(true);
    /* ⚠️ HER ER ET STOPUR RIGTIGT: reglen er, at der IKKE skiftes,
       mens filmen spiller. Længere end rytmen (4,6 s). */
    await page.waitForTimeout(5500);
    expect(await fremme(page)).toBe(0);
    await expect(video).toHaveCount(1);

    await video.evaluate((v) => v.dispatchEvent(new Event('ended')));
    await expect(page.locator('.tshot video')).toHaveCount(0);
    await expect(page.locator('.tshot .foto-skift img').first())
      .toHaveAttribute('src', new RegExp(`film/tapas-${fmt(info)}-slut\\.jpg`));
    await expect.poll(() => fremme(page), { timeout: 9000 }).toBe(1);
    // Rundt igen til billede 1: kun billedet, ingen film.
    await expect.poll(() => fremme(page), { timeout: 12000 }).toBe(0);
    await expect(page.locator('.tshot video')).toHaveCount(0);
  });

  test('efter filmen skiftes der hurtigt — og det gamle billede står fremme under det nye', async ({ page }) => {
    /* Mikkel 26/9: *"switchene imellem billederne efter tapasvideoen …
       er ikke hurtig nok og smooth nok"*. Før gik der en hel takt
       (4,6 s) fra filmens slut til første skift, og de to billeder
       tonede hver sin vej, så baggrunden skinnede igennem midt i. */
    await kanSpille(page);
    await åbnSkal(page, '/m-tapas.html', { ur: FREDAG, data: grunddata() });
    const video = page.locator('.tshot .foto-skift video.foto-film');
    await expect.poll(() => video.evaluate((v) => !!v.__spiller)).toBe(true);
    // Billede 2 er hentet, mens filmen spiller — ikke først, når det skal vises.
    await expect.poll(() => page.locator('.tshot .foto-skift img').nth(1)
      .evaluate((f) => f.complete && f.naturalWidth > 0)).toBe(true);

    await video.evaluate((v) => v.dispatchEvent(new Event('ended')));
    const t0 = Date.now();
    await expect.poll(() => fremme(page), { timeout: 2500, intervals: [50] }).toBe(1);
    expect(Date.now() - t0, 'første skift efter filmen').toBeLessThan(2500);
    // Midt i overgangen: det gamle billede er stadig helt fremme under det nye.
    const gammel = await page.locator('.tshot .foto-skift img').first()
      .evaluate((f) => Number(getComputedStyle(f).opacity));
    expect(gammel).toBe(1);
  });

  /* ⚠️ MIKKEL 28/9: *"tapas-siden er laggy med videoen"*. Filmen fik
     play(), før den var hentet, og hakkede sig igennem på et mobilnet.
     Nu står den på sin plakat, til den kan spille til ende. */
  test('en film, der ikke er hentet, venter på plakaten — og spiller så forfra', async ({ page }) => {
    let slip;
    await kanSpille(page, { hold: new Promise((r) => { slip = r; }) });
    await åbnSkal(page, '/m-tapas.html', { ur: FREDAG, data: grunddata() });
    const video = page.locator('.tshot .foto-skift video.foto-film');
    await expect.poll(() => video.evaluate((v) => v.__spil || 0)).toBeGreaterThan(0);
    /* Bedt om at spille, men stillet på pause af sig selv: resten mangler.
       To sekunder — længe før vagten (FILM_VENT_MS, 8 s) tager filmen. */
    await expect.poll(() => video.evaluate((v) => v.__spiller), { timeout: 2000 }).toBe(false);
    await expect(video).toHaveCount(1);
    expect(await fremme(page)).toBe(0);

    slip();
    await expect.poll(() => video.evaluate((v) => v.__spiller), { timeout: 5000 }).toBe(true);
    expect(await video.evaluate((v) => v.__spil)).toBeGreaterThan(1);
    await expect(video).toHaveCount(1);
  });

  /* 'playing' og 'canplaythrough' kom i samme millisekund i Chromium, og
     'playing' først: filmen stoppede, spolede og startede igen, selv om
     den var klar. readyState 4 ER "kan spille til ende". Svaret holdes
     tilbage, så canplaythrough og buffered ikke kan redde den — kun
     readyState. */
  test('melder browseren "klar til ende", når den begynder, stopper den ikke og starter forfra', async ({ page }) => {
    let slip;
    await kanSpille(page, { hold: new Promise((r) => { slip = r; }) });
    await page.addInitScript(() => {
      Object.defineProperty(HTMLMediaElement.prototype, 'readyState', { configurable: true, get: () => 4 });
    });
    await åbnSkal(page, '/m-tapas.html', { ur: FREDAG, data: grunddata() });
    const video = page.locator('.tshot .foto-skift video.foto-film');
    await expect.poll(() => video.evaluate((v) => v.__spil || 0)).toBeGreaterThan(0);
    await page.waitForTimeout(800);
    expect(await video.evaluate((v) => v.__spiller), 'filmen blev stillet på pause').toBe(true);
    expect(await video.evaluate((v) => v.__spil), 'filmen blev startet igen').toBe(1);
    slip();
  });

  test('går filmen i stå midt i, står slutbilledet i stedet — et kort hik gør ingenting', async ({ page }, info) => {
    await kanSpille(page);
    await åbnSkal(page, '/m-tapas.html', { ur: FREDAG, data: grunddata() });
    const video = page.locator('.tshot .foto-skift video.foto-film');
    // Filmen er vist, når billede 2 bliver hentet (det venter på filmen).
    await expect.poll(() => page.locator('.tshot .foto-skift img').nth(1)
      .evaluate((f) => f.complete && f.naturalWidth > 0)).toBe(true);

    // Et hik, den kommer over med det samme: filmen bliver.
    await video.evaluate((v) => { v.dispatchEvent(new Event('waiting')); v.dispatchEvent(new Event('playing')); });
    await page.waitForTimeout(900);
    await expect(video).toHaveCount(1);

    // Et stop, den ikke kommer over: væk inden for et sekund.
    await video.evaluate((v) => v.dispatchEvent(new Event('waiting')));
    await expect(page.locator('.tshot video')).toHaveCount(0, { timeout: 1200 });
    await expect(page.locator('.tshot .foto-skift img').first())
      .toHaveAttribute('src', new RegExp(`film/tapas-${fmt(info)}-slut\\.jpg`));
    await expect.poll(() => fremme(page), { timeout: 4000 }).toBe(1);
  });

  test('en film, der aldrig kommer i gang, holder ikke billederne fast', async ({ page }) => {
    await kanSpille(page);
    await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new Error('strømbesparelse')); });
    await åbnSkal(page, '/m-tapas.html', { ur: FREDAG, data: grunddata() });
    await expect(page.locator('.tshot video')).toHaveCount(0);
    await expect.poll(() => fremme(page), { timeout: 9000 }).toBe(1);
  });

  test('ejerens egne fotos fra admin får ingen film foran sig', async ({ page }) => {
    await kanSpille(page);
    const d = grunddata();
    d.indstillinger.foto_tapas = 'https://eksempel.invalid/a.jpg';
    d.indstillinger.foto_tapas_2 = 'https://eksempel.invalid/b.jpg';
    await page.route('https://eksempel.invalid/**', (r) => r.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(path.join(__dirname, '..', 'billeder', 'tapas-2.jpg')) }));
    await åbnSkal(page, '/m-tapas.html', { ur: FREDAG, data: d });
    await expect(page.locator('.tshot .foto-skift img')).toHaveCount(2);
    await expect(page.locator('.tshot video')).toHaveCount(0);
    await expect(page.locator('.tshot img[src*="film/tapas"]')).toHaveCount(0);
  });

  test('reduceret bevægelse: ingen film, slutbilledet står', async ({ browser }, info) => {
    const kon = await browser.newContext({ reducedMotion: 'reduce', ...info.project.use });
    const s = await kon.newPage();
    await kanSpille(s);
    await åbnSkal(s, '/m-tapas.html', { ur: FREDAG, data: grunddata() });
    await expect(s.locator('.tshot .foto-skift img')).toHaveCount(3);
    await expect(s.locator('.tshot video')).toHaveCount(0);
    await expect(s.locator('.tshot .foto-skift img').first()).toHaveAttribute('src', /film\/tapas-(4x3|16x9)-slut\.jpg/);
    await kon.close();
  });

  test('filmens filer findes og er lette nok til en telefon', async () => {
    for (const f of ['4x3', '16x9']) {
      for (const del of ['.mp4', '-start.jpg', '-slut.jpg']) {
        const fil = path.join(__dirname, '..', 'film', `tapas-${f}${del}`);
        expect(fs.existsSync(fil), fil).toBe(true);
      }
    }
    expect(fs.statSync(path.join(__dirname, '..', 'film', 'tapas-4x3.mp4')).size).toBeLessThan(1600000);
    expect(fs.statSync(path.join(__dirname, '..', 'film', 'tapas-16x9.mp4')).size).toBeLessThan(3200000);
  });

  /* ⚠️ MIKKEL 28/9: *"laggy … og i dårlig kvalitet"*. Filmene var 24
     billeder i sekundet — ost og pølse flyver ind og sprang i hak — og
     uden farvemærke, så browseren gættede og slutbilledet (trukket ud
     som BT.601) skiftede farve, når filmen blev taget væk. Tallene her
     læses af mp4-filen selv, ikke af et værktøj: mdhd (tidsskala og
     længde), stts (antal billeder), avc1 (størrelse) og colr (farve).
     Filerne laves med vaerktoej/lav-tapasfilm.sh. */
  test('filmene er 60 billeder i sekundet i fuld størrelse og mærket BT.709', async () => {
    const forventet = { '4x3': [1200, 900], '16x9': [1920, 1080] };
    for (const [f, [b, h]] of Object.entries(forventet)) {
      const info = filmInfo(path.join(__dirname, '..', 'film', `tapas-${f}.mp4`));
      expect(info.fps, `${f}: billeder i sekundet`).toBeGreaterThanOrEqual(59);
      expect([info.bredde, info.hoejde], `${f}: størrelse`).toEqual([b, h]);
      expect(info.farve, `${f}: farvemærke (primærfarver, overføring, matrix)`).toEqual([1, 1, 1]);
    }
  });
});

/* En mp4 er kasser i kasser: 4 bytes længde, 4 bytes navn, indhold. */
function kasser(buf, start, slut) {
  const ud = [];
  for (let i = start; i + 8 <= slut;) {
    let str = buf.readUInt32BE(i);
    let hoved = 8;
    if (str === 1) { str = Number(buf.readBigUInt64BE(i + 8)); hoved = 16; }
    if (str === 0) str = slut - i;
    ud.push({ navn: buf.toString('latin1', i + 4, i + 8), start: i + hoved, slut: i + str });
    i += str;
  }
  return ud;
}
function kasse(buf, sti) {
  let k = { start: 0, slut: buf.length };
  for (const navn of sti) {
    k = kasser(buf, k.start, k.slut).find((x) => x.navn === navn);
    if (!k) return null;
  }
  return k;
}
function filmInfo(fil) {
  const buf = fs.readFileSync(fil);
  const spor = ['moov', 'trak', 'mdia'];
  const mdhd = kasse(buf, [...spor, 'mdhd']);
  const v1 = buf[mdhd.start] === 1;
  const skala = buf.readUInt32BE(mdhd.start + (v1 ? 20 : 12));
  const laengde = v1 ? Number(buf.readBigUInt64BE(mdhd.start + 24)) : buf.readUInt32BE(mdhd.start + 16);
  const stbl = [...spor, 'minf', 'stbl'];
  const stts = kasse(buf, [...stbl, 'stts']);
  let billeder = 0;
  for (let e = 0; e < buf.readUInt32BE(stts.start + 4); e++) billeder += buf.readUInt32BE(stts.start + 8 + 8 * e);
  const stsd = kasse(buf, [...stbl, 'stsd']);
  const avc1 = kasser(buf, stsd.start + 8, stsd.slut)[0];
  // 78 bytes fast hoved i en visuel prøve (ISO 14496-12), så kommer avcC, colr …
  const colr = kasser(buf, avc1.start + 78, avc1.slut).find((x) => x.navn === 'colr');
  const farve = colr && buf.toString('latin1', colr.start, colr.start + 4) === 'nclx'
    ? [0, 2, 4].map((o) => buf.readUInt16BE(colr.start + 4 + o)) : null;
  return {
    fps: billeder / (laengde / skala),
    bredde: buf.readUInt16BE(avc1.start + 24),
    hoejde: buf.readUInt16BE(avc1.start + 26),
    farve,
  };
}
