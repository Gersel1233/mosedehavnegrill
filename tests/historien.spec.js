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

  /* ⚠️ HELE FILMENS BREDDE PÅ EN TELEFON (15/9). Kunden sagde "zoomet for
     meget ind" om hver eneste telefonfilm — og MÅLT på den udgivne side
     skar `cover` 13 % af i hver side, fordi heroen er højere end 9:16.
     Kun 74 % af bredden stod på skærmen, uanset filmen. Startbilledet
     følger den samme regel som filmen og kan måles uden afspilning; og
     det vises i skærmens fulde bredde (ét tal udefra: innerWidth), så
     et frimærke midt på skærmen ikke består. */
  test('på en telefon står hele filmens bredde på skærmen', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobil', 'computeren viser 16:9-filmen i sin egen bredde');
    await page.route('**/film/historie-*.mp4*', () => {});
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const start = page.locator('.h-hero .hero-start');
    await expect.poll(() => start.evaluate((e) => e.naturalWidth),
      'vagt: startbilledet er ikke hentet').toBeGreaterThan(0);
    const m = await start.evaluate((e) => {
      const r = e.getBoundingClientRect();
      const fit = getComputedStyle(e).objectFit;
      const s = fit === 'cover'
        ? Math.max(r.width / e.naturalWidth, r.height / e.naturalHeight)
        : Math.min(r.width / e.naturalWidth, r.height / e.naturalHeight);
      return { synlig: Math.min(1, r.width / (e.naturalWidth * s)),
               vist: e.naturalWidth * s, skaerm: innerWidth };
    });
    expect(m.synlig, `kun ${Math.round(m.synlig * 100)} % af filmens bredde står på skærmen`)
      .toBeGreaterThan(0.99);
    expect(m.vist, 'filmen er skrumpet ind midt på skærmen').toBeGreaterThan(m.skaerm * 0.99);
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
   FILMISK BEVÆGELSE PÅ HISTORIESIDEN  (14/9 — LAVET OM 11/10)
   Kundens ord 14/9: "animationerne inde på siden når man scroller og med
   billederne — kan vi ikke gøre dem langt bedre og eventuelt mere
   cinematiske?" og "lad 1 af dem fade ind og de andre slide eller åbne".
   Mikkels ord 11/10: "animationerne inde i historie siden er generiske og
   elendige" — teksten steg op afsnit for afsnit (skabelonens tegn, 27/9),
   og billederne blev tørret ind med clip-path.
   ⚠️ PRØVERNE ER VENDT MED GRUNDEN: de målte clip-path-tal (26 %,
   inset(0 100% 0 0)) og et mørke i ::after. Kundens krav bag dem står
   stadig — et lærred, tre slags, naboer forskellige, straks og færdigt
   inden 1,4 s, intet skjult med reduceret bevægelse — men målt på
   letterboxens bjælker, billedets opacitet og panoreringen.
   ============================================================ */

/* Billedets tilstand: opaciteten og forskydningen på BILLEDET inde i
   rammen, og letterboxens to bjælker (::before og ::after). */
function tilstand(e) {
  const b = e.firstElementChild;
  const s = getComputedStyle(b);
  const bjaelke = (pseudo) => {
    const p = getComputedStyle(e, pseudo);
    if (p.display === 'none' || p.content === 'none') return 0;
    const m = p.transform === 'none' ? [1, 0, 0, 1] : p.transform.match(/-?[\d.e-]+/g).map(Number);
    return m[3] * parseFloat(p.height);          // synlig højde i px
  };
  const m = s.transform === 'none' ? null : s.transform.match(/-?[\d.e-]+/g).map(Number);
  return { slags: e.dataset.ind, inde: e.classList.contains('inde'),
    opacity: +s.opacity, dx: m ? m[4] : 0, filter: s.filter,
    top: bjaelke('::before'), bund: bjaelke('::after'),
    hoejde: e.getBoundingClientRect().height };
}
const fremme = (t) => t.opacity > 0.99 && Math.abs(t.dx) < 0.5 && t.top < 0.5 && t.bund < 0.5;

test.describe('Historiens bevægelse', () => {
  test('et billede åbner sig som et lærred, når det kommer i syne', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const sidste = page.locator('.kap').last().locator('.h-foto');
    await expect(sidste, 'vagt: sidste kapitel skal have et billede').toHaveCount(1);
    await expect(sidste, 'vagt: sidste billede er et lærred').toHaveAttribute('data-ind', 'aabn');
    /* Før: to sorte bjælker på hver omkring en fjerdedel af rammen — og
       billedet næsten mørkt imellem dem. */
    const før = await sidste.evaluate(tilstand);
    expect(før.top / før.hoejde, 'ingen bjælke foroven').toBeGreaterThan(0.2);
    expect(før.bund / før.hoejde, 'ingen bjælke forneden').toBeGreaterThan(0.2);
    expect(før.opacity, 'billedet er fremme, før det er i syne').toBeLessThan(0.2);
    expect(await sidste.evaluate((e) => getComputedStyle(e).clipPath), 'rammen er klippet').toBe('none');
    const højde = await rulleHøjde(page);
    for (let y = 0; y <= højde; y += 400) { await rul(page, y); await page.waitForTimeout(40); }
    /* Efter: hele rammen. */
    await expect.poll(() => sidste.evaluate((e) => {
      const b = e.firstElementChild, p = getComputedStyle(e, '::before');
      return +getComputedStyle(b).opacity > 0.99 && p.transform !== 'none' && /^matrix\(1, 0, 0, 0,/.test(p.transform);
    }), { timeout: 6000 }).toBe(true);
    /* ⚠️ OG ÅRSTALLENE STÅR PÅ PLADS (14/9: "943" med ettallet skåret af). */
    expect(await page.evaluate(() => [...document.querySelectorAll('.kap-hoved')]
      .filter((e) => getComputedStyle(e).transform !== 'none').length)).toBe(0);
  });

  test('med reduceret bevægelse står alt fremme med det samme', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    /* ⚠️ UDEN AT RULLE: ruller man først, redder .inde det hele, og
       prøven måler ingenting (4/9-arret). */
    const skjult = await page.evaluate(() => {
      const ud = [];
      document.querySelectorAll('.kap .ton, .kap .ton > *, .kap .h-foto > *').forEach((e) => {
        const s = getComputedStyle(e);
        if (+s.opacity < 1) ud.push('opacity ' + s.opacity + ': ' + e.className);
        if (s.transform !== 'none') ud.push('transform ' + s.transform + ': ' + e.className);
        if (s.filter !== 'none') ud.push('filter ' + s.filter + ': ' + e.className);
      });
      document.querySelectorAll('.kap .h-foto').forEach((e) => {
        for (const p of ['::before', '::after']) {
          if (getComputedStyle(e, p).display !== 'none' && getComputedStyle(e, p).content !== 'none') ud.push('bjælke ' + p + ': ' + e.dataset.ind);
        }
      });
      return ud;
    });
    expect(skjult, 'noget står skjult for den, der har slået bevægelse fra').toEqual([]);
  });

  test('billederne kommer ind på hver sin måde — ikke det samme syv gange', async ({ page }) => {
    /* Kundens ord (14/9), da alle syv åbnede sig ens: "lad 1 af dem fade
       ind og de andre slide eller åbne, så det hele bare ikke er det
       samme". Slagsen står ved billedet (data-ind), og to naboer må ikke
       være ens. */
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const fotos = page.locator('.kap .h-foto');
    await expect(fotos, 'vagt: syv billeder').toHaveCount(7);
    const slags = await fotos.evaluateAll((l) => l.map((e) => e.dataset.ind || ''));
    expect(new Set(slags.map((s) => s.replace('-h', ''))).size, 'mindst tre slags: ' + slags.join(', '))
      .toBeGreaterThanOrEqual(3);
    for (let i = 1; i < slags.length; i++) {
      expect(slags[i], 'to naboer ens: ' + slags.join(', ')).not.toBe(slags[i - 1]);
    }
    /* FØR: hver slags er skjult på sin EGEN måde — ellers er attributten
       pynt. Kun dem, der ikke er i syne endnu, kan måles. */
    const før = await fotos.evaluateAll((l, fn) => {
      const tilstand = new Function('return ' + fn)();
      return l.filter((e) => !e.classList.contains('inde')).map(tilstand);
    }, tilstand.toString());
    const set = new Set();
    for (const f of før) {
      set.add(f.slags.replace('-h', ''));
      if (f.slags === 'fade') { expect(f.opacity, 'fade: op fra sort').toBe(0); expect(f.top + f.bund + Math.abs(f.dx), 'fade har kun opaciteten').toBe(0); }
      if (f.slags === 'aabn') { expect(f.top, 'aabn: letterbox').toBeGreaterThan(0); expect(f.bund, 'aabn: letterbox').toBeGreaterThan(0); }
      if (f.slags === 'glid') { expect(f.dx, 'glid: panorerer fra venstre').toBeLessThan(-5); expect(f.top + f.bund, 'en panorering har ingen bjælker').toBe(0); }
      if (f.slags === 'glid-h') { expect(f.dx, 'glid-h: panorerer fra højre').toBeGreaterThan(5); expect(f.top + f.bund, 'en panorering har ingen bjælker').toBe(0); }
    }
    expect(set.size, 'vagt: alle tre slags kunne måles før rul: ' + [...set].join(', ')).toBe(3);
    /* EFTER: alle står helt fremme — en bevægelse, der aldrig slutter, er
       et billede, der mangler. */
    const højde = await rulleHøjde(page);
    for (let y = 0; y <= højde; y += 400) { await rul(page, y); await page.waitForTimeout(40); }
    await expect.poll(() => fotos.evaluateAll((l, fn) => {
      const tilstand = new Function('return ' + fn)();
      return l.map(tilstand).filter((t) => !(t.opacity > 0.99 && Math.abs(t.dx) < 0.5 && t.top < 0.5 && t.bund < 0.5)).map((t) => t.slags);
    }, tilstand.toString()), { timeout: 8000 }).toEqual([]);
  });

  /* ⚠️ BILLEDET KOMMER, NÅR MAN RULLER TIL DET — IKKE BAGEFTER (14/9).
     Kundens ord: "når man scroller med de andre billeder, er delayet ift.
     når man scroller". Prøven lægger billedets top 6 % inde over skærmens
     bund og kræver, at det begynder straks og står HELT fremme inden 1,4 s. */
  test('et billede, man ruller til, åbner med det samme og er fremme inden 1,4 s', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const foto = page.locator('.kap .h-foto').nth(3);
    await expect(foto, 'vagt: det fjerde billede er et lærred').toHaveAttribute('data-ind', 'aabn');
    await expect(foto, 'vagt: billedet var fremme, før der blev rullet').not.toHaveClass(/inde/);
    /* ⚠️ ØJEBLIKKELIGT, IKKE rul() — scroll-behavior: smooth (14/9). */
    const pos = await foto.evaluate((e) => {
      const sc = document.getElementById('sc');
      const rod = (sc && getComputedStyle(sc).overflowY !== 'visible') ? sc : document.scrollingElement;
      const skaerm = rod === document.scrollingElement ? innerHeight : rod.clientHeight;
      const top0 = rod === document.scrollingElement ? 0 : rod.getBoundingClientRect().top;
      rod.scrollTo({ top: rod.scrollTop + e.getBoundingClientRect().top - top0 - skaerm * 0.94, behavior: 'instant' });
      return { top: Math.round(e.getBoundingClientRect().top - top0), skaerm };
    });
    await expect(foto, `billedet begyndte ikke, da det kom ind på skærmen (top ${pos.top} af ${pos.skaerm})`)
      .toHaveClass(/inde/, { timeout: 500 });
    const start = Date.now();
    await expect.poll(() => foto.evaluate((e, fn) => {
      const t = new Function('return ' + fn)()(e);
      return t.opacity > 0.99 && t.top < 0.5 && t.bund < 0.5;
    }, tilstand.toString()), { timeout: 1400, intervals: [50] }).toBe(true);
    expect(Date.now() - start, 'billedet var over 1,4 s om at komme frem').toBeLessThan(1500);
  });

  /* ⚠️ TEKST GLIDER IKKE IND (27/9 på forsiden — og 11/10 her). Mikkels
     ord om det generiske: "alt glider op, når man ruller". Målt FØR rul, på
     det, der endnu IKKE er i syne — ellers redder .inde det, og prøven
     måler ingenting. Billederne er de eneste, der må bevæge sig. */
  test('teksten og årstallene står stille — kun billederne bevæger sig', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const m = await page.evaluate(() => {
      const tekst = [...document.querySelectorAll('.kap h2, .kap p, .kap-aar, .kap-navn, .kap-hoved, .h-slut h2, .h-slut p, .h-tilbage')]
        .filter((e) => !e.closest('.inde') && !e.classList.contains('inde'));
      return { n: tekst.length,
        glider: tekst.filter((e) => getComputedStyle(e).opacity !== '1' || getComputedStyle(e).transform !== 'none')
          .map((e) => e.tagName + '.' + e.className) };
    });
    expect(m.n, 'der ER tekst under folden at måle').toBeGreaterThan(10);
    expect(m.glider, 'tekst, der venter på at glide ind').toEqual([]);
  });

  /* ⚠️ INGEN clip-path (11/10). En overgang på clip-path kan ikke lægges på
     skærmkortet — billedet tegnes om i hvert billede, og i Safari klipper
     den ikke det, der ligger ovenpå. Det var forsidens #alt, der hakkede
     10/10; her var det to billeder, der blev tørret ind. */
  test('billederne bevæger sig kun med transform og opacitet — ingen clip-path', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const klip = await page.evaluate(() => [...document.querySelectorAll('.kap .h-foto, .kap .h-foto *')]
      .filter((e) => {
        const s = getComputedStyle(e);
        /* "all" er standarden, også uden en overgang — kun en med varighed tæller. */
        const varer = s.transitionDuration.split(',').some((d) => parseFloat(d) > 0);
        return (s.clipPath && s.clipPath !== 'none') || (varer && /clip-path|\ball\b/.test(s.transitionProperty));
      })
      .map((e) => e.tagName + '.' + e.className + ' ' + getComputedStyle(e).clipPath));
    expect(klip, 'et billede bruger clip-path').toEqual([]);
  });

  /* "Rul ned" vippede op og ned i en uendelig løkke — skabelonens pil, og
     den eneste ting på siden, der aldrig holdt op (11/10). */
  test('"Rul ned" står stille', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const a = await page.locator('.h-rul i').evaluate((e) => getComputedStyle(e).animationName);
    expect(a, 'rul ned-stregen har en animation').toBe('none');
  });

  /* ⚠️ DEN FASTE BJÆLKE ER SIDENS SORTE (11/10). `body.har-film
     .topbar.stuck` (havnegrillen.css, 3/10) vejer 0,3,1 og slog historiens
     egen regel: en creme stribe med blæk-ordmærke hen over biografen, set
     på en optagelse. To tal udefra: sidens --nat og --salt. */
  test('den faste bjælke er sidens sorte, ikke husets creme', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    await rul(page, 1600);
    const bar = page.locator('.topbar');
    await expect(bar).toHaveClass(/stuck/);
    /* Bjælken toner sin flade ind, når den klæber — vent, til den står. */
    await expect.poll(() => bar.evaluate((e) => getComputedStyle(e).backgroundColor), { timeout: 3000 })
      .toMatch(/^rgb\(/);
    const m = await bar.evaluate((e) => ({ flade: getComputedStyle(e).backgroundColor,
      glas: getComputedStyle(e).backdropFilter || 'none',
      navn: getComputedStyle(e.querySelector('.ordmaerke')).color }));
    expect(m.flade, 'bjælken er ikke sidens sorte').toBe('rgb(11, 9, 8)');
    expect(m.glas, 'en fast flade skal ikke have glas bag sig (3/10)').toBe('none');
    expect(m.navn, 'navnet står i blæk på sort').toBe('rgb(239, 231, 221)');
  });

  /* Fortidens billeder er sort-hvide; "I dag" kommer i farver, når man
     når den (Figma 95:389, "monochrome → colour"). */
  test('"I dag" går fra sort-hvid til farver, når man når den', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const idag = page.locator('.kap').last().locator('.h-foto');
    await expect(idag, 'vagt: sidste kapitel er I dag').toHaveAttribute('data-farve', '');
    expect(await idag.evaluate((e) => getComputedStyle(e.firstElementChild).filter)).toBe('grayscale(1)');
    const højde = await rulleHøjde(page);
    for (let y = 0; y <= højde; y += 400) { await rul(page, y); await page.waitForTimeout(40); }
    await expect.poll(() => idag.evaluate((e) => getComputedStyle(e.firstElementChild).filter), { timeout: 5000 }).toBe('none');
  });

  /* Årstallet dæmpes, når kapitlet er forbi (Figma 71:247: "dimming past
     years") — rullebundet; Chromium kan det, så prøven kan måle det. */
  test('et årstal, man er rullet forbi, er dæmpet — det næste er ikke', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const kap = page.locator('.kap');
    await kap.nth(2).evaluate((e) => {
      const sc = document.getElementById('sc');
      const rod = (sc && getComputedStyle(sc).overflowY !== 'visible') ? sc : document.scrollingElement;
      const top0 = rod === document.scrollingElement ? 0 : rod.getBoundingClientRect().top;
      rod.scrollTo({ top: rod.scrollTop + e.getBoundingClientRect().top - top0, behavior: 'instant' });
    });
    await page.waitForTimeout(300);
    const forbi = +(await kap.nth(0).locator('.kap-aar').evaluate((e) => getComputedStyle(e).opacity));
    const nu = +(await kap.nth(2).locator('.kap-aar').evaluate((e) => getComputedStyle(e).opacity));
    expect(forbi, '1710 er ikke dæmpet, selv om man er forbi').toBeLessThan(0.6);
    expect(nu, 'det kapitel, man står i, er dæmpet').toBe(1);
  });
});
