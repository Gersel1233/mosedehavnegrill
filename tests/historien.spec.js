/* HISTORIEN OM MOSEDE HAVN  (31/8)

   Kundens ord: i den mørke info-sektion skal der være historie om
   cafeen med en knap, "og når man har trykket på historien om
   Mosede Havn, skal der komme en helt anden slags stil, end vi
   har kørt med — nærmest cinematisk". Og: "bestil-knappen skal
   væk for telefonen, selvfølgelig, når man læser."

   Tre ting måles her, og de er tre forskellige slags:

   1) DEN LOVER IKKE NOGET, VI IKKE HAR BELÆG FOR. Halvdelen af
      historien er lokalhistorie, ikke noget forretningen har
      målt. Kildelinjen er husets regel gjort synlig — uden den er
      siden en påstand.

   2) BESTILLINGEN STÅR IKKE I VEJEN. Den flydende pille er en rød
      plet, der beder om noget andet, end man er i gang med.

   3) STILEN ER EN ANDEN. Det er hele bestillingen, og det kan
      måles: grunden er mørk, ikke husets creme.

   ⚠️ Resten — favicon, alt-tekster, trykflader, sidelæns rulning,
   døde links — måles af tests/gennemgang.spec.js, som læser
   MAPPEN. Den nye side kom med i den, uden at nogen skrev den på
   en liste. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, springIntroOver, rul, rulleHøjde } = require('./hjaelp');

test.describe('Historien om havnen', () => {

  test('den flydende bestil-pille findes IKKE på siden', async ({ page }) => {
    /* ⚠️ MÅLT PÅ ANTALLET, IKKE PÅ SYNLIGHEDEN. toBeHidden() er
       sandt for et element, der ikke findes — husets eget ar fra
       fyldvælgeren — men her er "findes ikke" netop reglen, og så
       er tællingen det rigtige svar. Til gengæld skal prøven
       bevise, at den ER der på forsiden, ellers måler den kun, at
       et klassenavn er stavet forkert. */
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    await expect(page.locator('.bestil')).toHaveCount(0);
    await expect(page.locator('#bestil-pill')).toHaveCount(0);

    await åbnSkal(page, '/index.html', { data: grunddata() });
    await expect(page.locator('#bestil-pill'),
      'pillen findes ikke på forsiden — så måler prøven ingenting')
      .toHaveCount(1);
  });

  test('stilen er en anden: grunden er mørk, ikke husets creme', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    const forside = await page.locator('#sc').evaluate(
      (e) => getComputedStyle(e).backgroundColor);

    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const historie = await page.locator('#sc').evaluate(
      (e) => getComputedStyle(e).backgroundColor);

    /* To uafhængige tal: den ene sides grund mod den andens. Et
       spørgsmål til historiesiden om dens EGEN farve ville bestå,
       også hvis forsiden en dag blev sort. */
    expect(historie, 'historiesiden har samme grund som forsiden')
      .not.toBe(forside);
    const [r, g, b] = historie.match(/\d+/g).map(Number);
    expect(r + g + b, `grunden er ikke mørk: ${historie}`).toBeLessThan(120);
  });

  test('kildelinjen står der — historien er ikke vores påstand', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    /* ⚠️ data-kilde OG IKKE .h-kilde (6/9): stemningslinjen låner
       den samme klasse for at se ens ud, så prøven faldt på strict
       mode, da den kom. Reglen er urørt — kildelinjen skal stå. */
    const kilde = page.locator('.h-kilde[data-kilde]');
    await expect(kilde).toBeVisible();
    await expect(kilde).toContainText('lokalhistoriske');
    /* Ankerets ophav er overleveret. Siden må ikke sige det som en
       kendsgerning — hverken i kildelinjen eller i kapitlet. */
    await expect(kilde).toContainText('ikke dokumenteret');
    /* ⚠️ VENDT 14/9 efter kundens faktadokument: ankerets ophav er
       LOKAL OVERLEVERING, og Elefanten blev IKKE sænket i 1710.
       Siden må hverken sige, at ankeret ER Elefantens, eller at det
       lå på bunden i 270 år — ingen af delene står i kilderne. */
    const side = await page.locator('main, #sc').first().innerText();
    expect(side).toContain('lokal overlevering');
    expect(side).toContain('ikke sænket');
    expect(side, 'siden siger ankerets ophav som et faktum')
      .not.toMatch(/Elephantens anker|på bunden i næsten 270/i);
  });

  /* ANKERET BLIVER PÅ SIDEN (14/9). Kundens ord, efter at faktadokumentet
     havde flyttet fokus til 1929: "der skal også stadig være noget med
     ankeret derinde". Prøven ovenfor vogter, at det ikke siges som et
     faktum; den her vogter, at det ikke forsvinder. Uden modstykket ville
     en side, der bare slettede ankeret, bestå begge. */
  test('ankeret står i overskriften, som første kapitel og på forsiden', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    await expect(page.locator('h1')).toContainText('ankeret');
    const første = page.locator('.kap').first();
    await expect(første.locator('.kap-navn')).toHaveText('Ankeret');
    await expect(første.locator('.kap-aar')).toHaveText('1710');
    await expect(første).toContainText('lokal overlevering');

    await åbnSkal(page, '/index.html', { data: grunddata() });
    await expect(page.locator('#omos h2')).toContainText('ankeret');
    await expect(page.locator('.about .hist-teaser')).toContainText('Ankeret');
  });

  test('forsidens mørke afsnit fører derhen', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    await springIntroOver(page);

    const knap = page.locator('.about .hist-teaser-knap');
    await expect(knap).toHaveCount(1);
    expect(await knap.getAttribute('href')).toBe('historien.html');
    /* Teaseren lover 1929 — det, der ER dokumenteret (14/9). */
    await expect(page.locator('.about .hist-teaser')).toContainText('1929');
    await expect(page.locator('.about .hist-teaser')).not.toContainText('270 år');
  });

  /* ============================================================
     BILLEDERNE PÅ SIDEN  (6/9)

     ⚠️ PRØVEN "uden et foto står en flade med tegnet" ER VENDT,
     ikke slettet. Den vogtede, at en tom plads blev en MØRK FLADE
     med pladsens tegn og aldrig en stiplet grå kasse (29/8) — og
     den regel er urørt: den måles stadig på tapassiden,
     cateringsiden og baglokalet, som ingen fotos har. Det, der er
     lavet om, er historiesiden: den fik fire stemningsbilleder i
     repoet, og dermed er den flade, prøven ledte efter, den
     forkerte tilstand at måle her.

     ⚠️ OG ARKIVFOTOS ER DET STADIG IKKE. Vi ved ikke, hvordan
     havnen så ud i 1929, og et billede, der læses som
     dokumentation, ville være den samme påstand som et opdigtet
     tal — på netop den side, hvor teksten selv bærer et "efter
     sigende", fordi kilden er usikker. Derfor er der to regler i
     stedet for én flade: billedteksterne siger kun, hvad billedet
     VISER, og siden siger det HØJT, så længe det er repoets fotos,
     der står.
     ============================================================ */

  test('de syv pladser bærer et billede, der faktisk kom frem', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });

    await expect(page.locator('image-slot'),
      'pladserne blev stående som <image-slot> — de tegner sig stiplet grå')
      .toHaveCount(0);
    /* Syv fra 14/9 — kundens ord: "billederne mangler også inde i
       historie siden". Ankeret, 1929 og I dag stod uden. */
    await expect(page.locator('.h-foto img')).toHaveCount(7);

    /* ⚠️ naturalWidth OG IKKE complete. `complete` er sandt for et
       billede, browseren har opgivet — en forkert sti ville altså
       bestå. Vi ruller først, fordi de er loading="lazy": måler
       man uden at rulle, måler man dovenskaben og ikke filen. */
    /* ⚠️ rul() OG IKKE window.scrollTo. Under 820 px ruller
       DOKUMENTET, over ruller #sc — og et scrollTop på det forkerte
       element er ikke en fejl, det bliver bare aldrig sat (5/9).
       Målt: to af fire billeder var stadig dovne, første gang
       prøven blev kørt. Vi ruller HELE vejen ned i trin, for lazy
       henter, når pladsen nærmer sig skærmen — ikke når man
       lander i bunden. */
    const højde = await rulleHøjde(page);
    for (let y = 0; y <= højde; y += 400) {
      await rul(page, y);
      await page.waitForTimeout(60);
    }
    await expect.poll(async () => page.evaluate(
      () => Array.from(document.querySelectorAll('.h-foto img'))
        .filter((i) => i.naturalWidth > 0).length
    ), { timeout: 8000 }).toBe(7);
  });

  test('et STEMNINGSBILLEDE siger, hvad det viser — ikke hvor det er taget', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });

    /* ⚠️ REGLEN HÆNGER PÅ data-reserve, IKKE PÅ PLADSEN. Et
       stemningsbillede fra kysten må ikke bære en stedsangivelse —
       hverken i alt-teksten, som en skærmlæser læser op, eller i
       billedteksten under. Ejerens EGET foto må gerne sige Mosede,
       for så er det sandt; derfor er prøven bundet til det billede,
       der faktisk er repoets, og skal aldrig lempes den dag han
       lægger sine egne op. */
    const linjer = await page.evaluate(() => {
      const t = [];
      document.querySelectorAll('.h-foto img[data-reserve]').forEach((i) => {
        t.push(i.getAttribute('alt') || '');
        const nr = i.closest('.h-foto').nextElementSibling;
        if (nr && nr.classList.contains('h-billedtekst')) t.push(nr.textContent);
      });
      return t;
    });
    expect(linjer.length, 'ingen reserve-billeder — prøven måler ingenting').toBe(14);
    for (const linje of linjer) {
      expect(linje.trim(), 'en billedtekst eller alt-tekst er tom').not.toBe('');
      expect(linje, `"${linje}" påstår, hvor billedet er taget`)
        .not.toMatch(/mosede|molen|havnecafe/i);
    }
  });

  test('siden siger selv, at billederne er stemningsbilleder', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const note = page.locator('#h-stemning');
    await expect(note).toBeVisible();
    await expect(note).toContainText('stemningsbilleder');
    await expect(note).toContainText('ikke arkivfotos');

    /* ⚠️ ET AF TALLENE KOMMER UDEFRA: linjen skal hænge på, om der
       FAKTISK står et reserve-billede, ikke på en fast linje i
       HTML'en. */
    /* Syv fra 14/9: ankeret, 1929 og I dag fik deres egne billeder. */
    await expect(page.locator('.h-foto img[data-reserve]')).toHaveCount(7);
  });

  test('lægger ejeren ALLE syv op, forsvinder stemningslinjen', async ({ page }) => {
    /* Modstykket til prøven ovenfor. Uden den ville en linje, der
       ALTID står, bestå — og så ville siden kalde ejerens egne
       fotos for stemningsbilleder fra kysten. */
    const d = grunddata();
    const px = 'data:image/gif;base64,'
      + 'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
    for (let n = 1; n <= 7; n++) d.indstillinger['foto_historie_' + n] = px;
    await åbnSkal(page, '/historien.html', { data: d });

    await expect(page.locator('.h-foto img')).toHaveCount(7);
    await expect(page.locator('.h-foto img[data-reserve]')).toHaveCount(0);
    await expect(page.locator('#h-stemning')).toBeHidden();
  });

  test('med ÉN af syv lagt op bliver linjen stående', async ({ page }) => {
    /* Den tilstand, ejeren rent faktisk kommer i: han skifter ét
       billede ad gangen. Tre af fire er stadig repoets, og så er
       sætningen stadig sand. */
    const d = grunddata();
    d.indstillinger.foto_historie_2 = 'data:image/gif;base64,'
      + 'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
    await åbnSkal(page, '/historien.html', { data: d });

    await expect(page.locator('.h-foto img[data-reserve]')).toHaveCount(6);
    await expect(page.locator('#h-stemning')).toBeVisible();
  });

  test('kapitlets etiket bliver i sin egen spalte', async ({ page }) => {
    /* Kundens skærmbillede (7/9): "Dengang" lå hen over
       overskriften "Vaffelis, træterrasse og master lige bagved".

       ⚠️ ETIKETTEN ER ET ORD, IKKE KUN ET ÅRSTAL. Et årstal er
       fire tabular-cifre; et ord kan være dobbelt så bredt ved
       samme størrelse. Målt før rettelsen: "Dengang" fyldte
       301 px i en spalte på 210 — 91 px ud over kanten og 37 ind
       over h2'en, mens de tre andre etiketter havde luft til
       overs. Fejlen fandtes altså KUN på ét kapitel.

       ⚠️ DERFOR MÅLER PRØVEN ALLE KAPITLER, ikke det ene. Den
       skal fælde et nyt langt ord den dag, nogen skriver
       "Sommeren 1985" — ellers vogter den en tastefejl og ikke en
       regel.

       ⚠️ OG DEN SAMMENLIGNER TO UAFHÆNGIGE ELEMENTER: etikettens
       egen tekstbredde (et Range, ikke elementets kasse — kassen
       er spaltens fulde bredde og ville altid passe) mod
       overskriftens venstre kant. Et spørgsmål til etiketten om
       dens egen font-size ville bestå, også hvis spalten var
       50 px. */
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(300);

    const kapitler = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.kap')).map((k) => {
        const etiket = k.querySelector('.kap-aar');
        const h2 = k.querySelector('h2');
        const r = document.createRange();
        r.selectNodeContents(etiket);
        const tekst = r.getBoundingClientRect();
        return {
          ord: etiket.textContent.trim(),
          bredde: Math.round(tekst.width),
          spalte: Math.round(k.querySelector('.kap-hoved').getBoundingClientRect().width),
          overlap: Math.round(tekst.right - h2.getBoundingClientRect().left),
        };
      });
    });

    expect(kapitler.length, 'ingen kapitler — prøven måler ingenting')
      .toBeGreaterThanOrEqual(4);
    for (const k of kapitler) {
      expect(k.bredde, `"${k.ord}" fylder ${k.bredde} px i en spalte på ${k.spalte}`)
        .toBeLessThanOrEqual(k.spalte);
      expect(k.overlap, `"${k.ord}" ligger ${k.overlap} px ind over overskriften`)
        .toBeLessThan(0);
    }
  });

  test('et foto fra admin slår repoets', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.foto_historie_2 = 'data:image/gif;base64,'
      + 'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
    await åbnSkal(page, '/historien.html', { data: d });

    /* ⚠️ VENDT MED EN NOTE (6/9): prøven krævede før ÉT billede på
       siden, fordi de tre andre pladser var flader. Reglen er den
       samme og den vigtige — ADMIN SLÅR REPOET — og den måles nu
       på selve pladsen: nr. 2 bærer ejerens data-URI og IKKE
       repoets fil. */
    /* ⚠️ PLADSEN FINDES PÅ SIT KAPITEL, IKKE PÅ SIN PLADS I RÆKKEN (14/9).
       Ankeret står først nu, og nøglerne følger ikke rækkefølgen — et
       indeks ville måle et andet kapitel end det, prøven hedder. */
    const kap = (aar) => page.locator('.kap', { has: page.locator('.kap-aar', { hasText: aar }) })
      .locator('.h-foto img');
    const nr2 = await kap('1943').getAttribute('src');
    expect(nr2.startsWith('data:image/gif'),
      `plads 2 viser stadig ${nr2} — ejerens foto slog ikke igennem`).toBe(true);
    expect(await kap('Før 1929').getAttribute('src')).toContain('historie-kyst');
    expect(await kap('1969').getAttribute('src')).toContain('historie-bundgarn');

    /* Alt-teksten er FOTOETS, ikke pladsens — samme regel som
       resten af huset. */
    await expect(kap('1943'))
      .toHaveAttribute('alt', 'En lille fiskerbåd på mørkt, stille vand om natten');
  });
});

/* FILMEN ER ÅBNINGEN  (14/9)

   Kundens ord: når man klikker ind på historien fra forsiden, "er
   man mødt med skrift og sort" — han ville have en cinematisk intro
   som forsidens. Søslaget i 1710 → luftbilledet af havnen.

   ⚠️ MOTOREN ER FORSIDENS og har sine egne prøver i
   tests/hero-film.spec.js. Det, der måles her, er det, historien
   selv bærer: at det er HISTORIENS filer, at dens tekst venter og
   kommer, at værnene også gælder dens egne elementer (de har deres
   egne regler i historien.css — forsidens er scopet til .hero.film),
   og at siden siger, hvad filmen er. */
test.describe('Historien åbner med en film', () => {
  const opacity = (loc) => loc.evaluate((e) => getComputedStyle(e).opacity);

  test('filmen er historiens egen, og formatet følger skærmen', async ({ page }, info) => {
    await page.route('**/film/historie-*.mp4*', () => {});
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const film = page.locator('.h-hero .hero-film');
    await expect(film).toHaveCount(1);
    await expect(page.locator('.h-hero .hero-spring')).toHaveCount(1);

    const fmt = info.project.name === 'mobil' ? '9x16' : '16x9';
    await expect(film).toHaveAttribute('data-format', fmt);
    await expect(film.locator('video'))
      .toHaveAttribute('src', new RegExp(`film/historie-${fmt}\\.mp4`));
    /* Startbilledet vælges af browseren, FØR scriptet kører — og
       reglen skal være den samme som filmens, ellers kan de to være
       hver sit format. */
    const [regel, media, start] = await page.evaluate(() => [
      document.querySelector('.hero-film').getAttribute('data-hoej-naar'),
      document.querySelector('.hero-film picture source').getAttribute('media'),
      document.querySelector('.hero-start').currentSrc]);
    expect(media, 'startbilledet og filmen vælges af hver sin regel').toBe(regel);
    expect(start).toContain(`film/historie-${fmt}-start.jpg`);
  });

  test('teksten venter på filmen og kommer, når den har spillet færdig', async ({ page }) => {
    await page.route('**/film/historie-*.mp4*', () => {});
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    await expect(page.locator('html')).toHaveClass(/film-aabner/);
    const h1 = page.locator('.h-hero h1');
    const tone = () => page.locator('.h-hero').evaluate(
      (e) => getComputedStyle(e, '::after').opacity);
    expect(await opacity(h1), 'overskriften står oven i filmen').toBe('0');
    expect(await opacity(page.locator('.h-manchet'))).toBe('0');
    expect(await tone(), 'den mørke tone ligger over filmen, mens den spiller').toBe('0');

    /* Filmens eget sidste billede — det øjeblik, teksten og
       slutbilledet skal komme i. */
    await page.locator('.hero-film video').evaluate((v) => v.dispatchEvent(new Event('ended')));
    await expect(page.locator('html')).not.toHaveClass(/film-aabner/);
    await expect.poll(() => opacity(h1)).toBe('1');
    await expect.poll(tone).toBe('1');
    await expect(page.locator('.hero-slut'))
      .toHaveAttribute('src', /film\/historie-(9x16|16x9)-slut\.jpg/);
  });

  test('et direkte link får ingen åbning — teksten står med det samme', async ({ page }) => {
    await åbnSkal(page, '/historien.html#h-stemning', { data: grunddata() });
    await expect(page.locator('html')).not.toHaveClass(/film-aabner/);
    expect(await opacity(page.locator('.h-hero h1'))).toBe('1');
    await expect(page.locator('.hero-slut'))
      .toHaveAttribute('src', /film\/historie-(9x16|16x9)-slut\.jpg/);
  });

  test('reduceret bevægelse: ingen film — slutbilledet og teksten står', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    await expect(page.locator('html')).not.toHaveClass(/film-aabner/);
    expect(await opacity(page.locator('.h-hero h1'))).toBe('1');
    await expect(page.locator('.hero-slut')).toHaveAttribute('src', /-slut\.jpg/);
    expect(await page.locator('.hero-film video').getAttribute('src'),
      'filmen blev hentet for en, der har bedt om mindre bevægelse').toBeNull();
  });

  test('fejler filmens script, kommer teksten alligevel', async ({ page }) => {
    test.setTimeout(30000);
    await page.route('**/js/skal/hero-film.js*', (r) => r.abort());
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    await expect(page.locator('html')).toHaveClass(/film-aabner/);
    const h1 = page.locator('.h-hero h1');
    expect(await opacity(h1)).toBe('0');
    /* Stilarkets 8 s — uden et script er der intet andet værn. */
    await expect.poll(() => opacity(h1), { timeout: 12000 }).toBe('1');
    await expect.poll(() => opacity(page.locator('.h-rul')), { timeout: 12000 }).toBe('1');
    await expect.poll(() => page.locator('.h-hero').evaluate(
      (e) => getComputedStyle(e, '::after').opacity), { timeout: 12000 }).toBe('1');
  });

  test('filmen fylder skærmen fra toppen, og teksten står over bunden', async ({ page }) => {
    await page.route('**/film/historie-*.mp4*', () => {});
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    /* ⚠️ FILMENS kasse, ikke heroens. Heroen har sin højde af sig
       selv; filmen fylder den kun, fordi den ligger absolut — og
       historien.css' `> *` ville ellers gøre den til en stribe på
       nul pixels i flowet. */
    const m = await page.evaluate(() => {
      const r = document.querySelector('.h-hero .hero-film').getBoundingClientRect();
      return { top: r.top, bund: r.bottom, h: innerHeight };
    });
    expect(m.top, `filmen begynder ${m.top} px nede — under en sort stribe`).toBeLessThanOrEqual(0);
    expect(m.bund, 'filmen slutter før skærmens bund').toBeGreaterThanOrEqual(m.h);

    await expect.poll(() => page.evaluate(() => !!window.MosedeFilm)).toBe(true);
    await page.evaluate(() => window.MosedeFilm.spring());
    const rul = page.locator('.h-rul');
    await expect.poll(() => rul.evaluate((e) => getComputedStyle(e).transform)).toBe('none');
    const bund = await rul.evaluate((e) => e.getBoundingClientRect().bottom);
    expect(bund, `"Rul ned" står ${bund} px nede på en skærm på ${m.h}`)
      .toBeLessThanOrEqual(m.h);
  });

  test('siden siger, at filmen er en stemningsfilm', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const linje = page.locator('[data-film]');
    await expect(linje).toHaveCount(1);
    await expect(linje).not.toHaveAttribute('hidden', /.*/);
    await expect(linje).toContainText('stemningsfilm');
    await expect(linje).toContainText('1710');
    await expect(linje).toContainText('arkivfoto');
  });

  /* ⚠️ FILMEN MÅ IKKE PRESSES TIL GRØD IGEN (14/9). Den blev halveret
     til 0,85 Mbit/s med støjfjerner for at stoppe hak, og kunden så det:
     "kvaliteten er dårlig, man kan slet ikke fornemme bådene, der
     skyder". Hakkene klares af motoren (glat eller slet ikke); filen
     skal have bits. MÅLT: SSIM 0,924 → 0,975 mod kilden. */
  test('filmen har bits nok til at kanonerne kan ses', () => {
    const fs = require('fs');
    /* Telefonens film var et udsnit af computerens 720p (405 px bredt,
       strakt 1,8 gange) — derfor kun ét skib. Den er en rigtig 9:16-udgave
       af den samme film nu (Sjinn veo, hele linjen af skibe), 1080x1920. */
    /* Længden læses af filens egen mvhd-boks: telefonens film er kortere
       end computerens (den sorte overgang er klippet ud, 14/9), og et
       fast tal ville måle en bitrate, filen ikke har. */
    function sekunder(fil) {
      const b = fs.readFileSync(fil);
      const t = b.indexOf('mvhd');
      const v1 = b[t + 4] === 1;
      const skala = b.readUInt32BE(t + (v1 ? 24 : 16));
      const varighed = v1 ? Number(b.readBigUInt64BE(t + 28)) : b.readUInt32BE(t + 20);
      return varighed / skala;
    }
    for (const fmt of ['9x16', '16x9']) {
      const fil = `film/historie-${fmt}.mp4`;
      const bit = fs.statSync(fil).size * 8 / sekunder(fil);
      expect(bit, `historie-${fmt} er presset til ${(bit / 1e6).toFixed(2)} Mbit/s`).toBeGreaterThan(1.5e6);
    }
  });

  /* ⚠️ TELEFONENS FILM MÅ IKKE BLIVE ET UDSNIT IGEN. Et udsnit af
     computerens 720p er 405 px bredt; en rigtig 9:16-film er mindst 720.
     Bredden læses af mp4'ens tkhd-boks, ikke af opmærkningen. */
  test('telefonens film er en rigtig 9:16-film, ikke et udsnit', () => {
    const fs = require('fs');
    const b = fs.readFileSync('film/historie-9x16.mp4');
    const t = b.indexOf('tkhd');
    const o = t + (b[t + 4] === 1 ? 92 : 80);
    const [w, h] = [b.readUInt32BE(o) >>> 16, b.readUInt32BE(o + 4) >>> 16];
    expect(h / w, 'telefonens film er ikke 9:16').toBeCloseTo(16 / 9, 1);
    expect(w, `telefonens film er ${w} px bred — et udsnit strakt op`).toBeGreaterThanOrEqual(1080);
  });

  test('filerne findes og holder sig under loftet', () => {
    const fs = require('fs');
    for (const fmt of ['9x16', '16x9']) {
      expect(fs.statSync(`film/historie-${fmt}.mp4`).size).toBeLessThan(2 * 1024 * 1024);
      for (const del of ['start', 'slut']) {
        expect(fs.statSync(`film/historie-${fmt}-${del}.jpg`).size).toBeLessThan(450 * 1024);
      }
    }
  });
});

/* ============================================================
   FILMISK BEVÆGELSE PÅ HISTORIESIDEN  (14/9)
   Kundens ord: "animationerne inde på siden når man scroller og med
   billederne — kan vi ikke gøre dem langt bedre og eventuelt mere
   cinematiske?" Billedet åbner sig som et lærred, teksten kommer linje
   for linje. To prøver, og de hører sammen: uden den anden ville en
   regel, der bare skjulte alt, bestå den første.
   ============================================================ */
test.describe('Historiens bevægelse', () => {
  test('et billede åbner sig som et lærred, når det kommer i syne', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const sidste = page.locator('.kap').last().locator('.h-foto');
    await expect(sidste, 'vagt: sidste kapitel skal have et billede').toHaveCount(1);
    /* Før: en stribe midt i rammen. */
    expect(await sidste.evaluate((e) => getComputedStyle(e).clipPath)).toContain('26%');
    const højde = await rulleHøjde(page);
    for (let y = 0; y <= højde; y += 400) { await rul(page, y); await page.waitForTimeout(40); }
    /* Efter: hele rammen. */
    await expect.poll(() => sidste.evaluate((e) => getComputedStyle(e).clipPath), { timeout: 6000 })
      .toMatch(/inset\(0(px)?\)|inset\(0(px)? 0(px)? 0(px)? 0(px)?\)/);
    /* ⚠️ OG ÅRSTALLENE STÅR PÅ PLADS, NÅR DE ER KOMMET (14/9). Første
       udgave lod dem hænge 34 px ude — en regel, der vejede det samme
       som den, der skulle sætte dem på plads, og stod senere. Målt på et
       skud: "943" med ettallet skåret af i telefonens kant. */
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('.kap-hoved')]
      .filter((e) => getComputedStyle(e).transform !== 'none').length), { timeout: 6000 })
      .toBe(0);
  });

  test('med reduceret bevægelse står alt fremme med det samme', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    /* ⚠️ UDEN AT RULLE: ruller man først, redder .inde det hele, og
       prøven måler ingenting (4/9-arret). */
    const skjult = await page.evaluate(() => {
      const ud = [];
      document.querySelectorAll('.kap .ton, .kap .ton > *').forEach((e) => {
        const s = getComputedStyle(e);
        if (+s.opacity < 1) ud.push('opacity ' + s.opacity + ': ' + e.className);
        if (s.clipPath && s.clipPath !== 'none') ud.push('clip ' + s.clipPath + ': ' + e.className);
      });
      return ud;
    });
    expect(skjult, 'noget står skjult for den, der har slået bevægelse fra').toEqual([]);
  });

  test('billederne kommer ind på hver sin måde — ikke det samme syv gange', async ({ page }) => {
    /* Kundens ord (14/9), da alle syv åbnede sig ens: "lad 1 af dem fade
       ind og de andre slide eller åbne, så det hele bare ikke er det
       samme". Slagsen står ved billedet (data-ind), og to naboer må ikke
       være ens — ellers er det den samme bevægelse to gange i træk. */
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const fotos = page.locator('.kap .h-foto');
    await expect(fotos, 'vagt: syv billeder').toHaveCount(7);
    const slags = await fotos.evaluateAll((l) => l.map((e) => e.dataset.ind || ''));
    expect(new Set(slags.map((s) => s.replace('-h', ''))).size, 'mindst tre slags: ' + slags.join(', '))
      .toBeGreaterThanOrEqual(3);
    for (let i = 1; i < slags.length; i++) {
      expect(slags[i], 'to naboer ens: ' + slags.join(', ')).not.toBe(slags[i - 1]);
    }
    /* FØR: hver slags er skjult på sin EGEN måde. Ellers er attributten
       pynt, og billederne gør stadig det samme. Kun dem, der ikke er
       kommet i syne endnu, kan måles. */
    const før = await fotos.evaluateAll((l) => l.filter((e) => !e.classList.contains('inde')).map((e) => {
      const s = getComputedStyle(e);
      /* ⚠️ De glidende klipper BILLEDET og ikke rammen — en helt lukket
         ramme ser IntersectionObserver aldrig (målt 14/9). */
      const b = e.firstElementChild;
      const clip = (e.dataset.ind || '').startsWith('glid') && b ? getComputedStyle(b).clipPath : s.clipPath;
      return { slags: e.dataset.ind, opacity: s.opacity, clip, ramme: s.clipPath };
    }));
    const set = new Set();
    for (const f of før) {
      set.add(f.slags.replace('-h', ''));
      if (f.slags === 'fade') { expect(f.opacity, 'fade').toBe('0'); expect(f.clip, 'fade klipper ikke').toBe('none'); }
      if (f.slags === 'aabn') expect(f.clip, 'aabn').toContain('26%');
      if (f.slags.startsWith('glid')) expect(f.ramme, 'rammen må ikke være lukket — så ser iagttageren den aldrig').toBe('none');
      if (f.slags === 'glid') expect(f.clip, 'glid fra venstre').toMatch(/inset\(0(px)? 100% 0(px)? 0(px)?\)/);
      if (f.slags === 'glid-h') expect(f.clip, 'glid fra højre').toMatch(/inset\(0(px)? 0(px)? 0(px)? 100%\)/);
    }
    expect(set.size, 'vagt: alle tre slags kunne måles før rul: ' + [...set].join(', ')).toBe(3);
    /* EFTER: alle står helt fremme — en bevægelse, der aldrig slutter, er
       et billede, der mangler. */
    const højde = await rulleHøjde(page);
    for (let y = 0; y <= højde; y += 400) { await rul(page, y); await page.waitForTimeout(40); }
    await expect.poll(() => fotos.evaluateAll((l) => l.filter((e) => {
      const lukket = (c) => !(c === 'none' || /^inset\(0(px)?( 0(px)?){0,3}\)$/.test(c));
      const s = getComputedStyle(e), b = e.firstElementChild;
      return +s.opacity < 1 || lukket(s.clipPath) || (b && lukket(getComputedStyle(b).clipPath));
    }).map((e) => e.dataset.ind)), { timeout: 8000 }).toEqual([]);
  });
});
