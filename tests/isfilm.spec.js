/* Isfilmen.

   Filmen er tegnet, ikke filmet: tre kugler hopper op i keglen,
   og så trækker billedet sig tilbage og viser solnedgangen over
   havnen. Navnet står inde i selve videoen.

   Der er tre slags fejl der kan komme her, og en test til hver:

   1) AFSNITTET. Overskriften bærer pointen – "Du kommer for isen.
      Du bliver for udsigten." – og den skal stå i sidens tekst,
      ikke kun være brændt ind i en video. Ellers findes den ikke
      for den der bruger oplæsning, har slået bevægelse fra, eller
      sidder på en forbindelse hvor videoen aldrig kommer.

   2) DATAFORBRUGET. 959 kB må ikke hentes hos nogen der aldrig
      ruller ned til afsnittet, og slet ikke hos nogen der har
      bedt om at spare data.

   3) NAVNET INDE I VIDEOEN. Det står i hvid skrift oven på et
      solnedgangsfoto, og solnedgange er lyse. Sløret bag skriften
      er sat efter en måling, og målingen står her, så en ny
      udgave af filmen ikke kan snige et ulæseligt navn ind.
*/

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

test.describe('Filmen bag nyhederne', () => {

  /* Filmen bor i #nyheder nu — kundens omrokering: den kører som
     baggrund under "Sidste nyt fra lugen", spiller én gang og
     fryser på solnedgangen. Isafsnittet beholder sin overskrift og
     kuglerne; otte af prøverne herunder fulgte med filmen og er
     skrevet om til dens nye hjem.

     TO GAMLE PRØVER ER VÆK, og hvorfor er værd at skrive ned:

     · "posterbilledet kommer først når afsnittet nærmer sig" og
       "videoen hentes ikke før afsnittet nærmer sig" målte
       900px-reglen på et afsnit langt nede på siden. Nyhederne er
       ANDET afsnit — de er altid inden for de 900 px, så reglen
       kan ikke længere ses arbejde med nyheder i databasen. Den ER
       stadig i koden, og dens vigtigste halvdel måles nedenfor:
       uden nyheder hentes ingenting overhovedet.

     · "rammen har samme form som den film der bliver valgt" målte
       .film-ramme, som ikke findes: filmen fylder hele afsnittet
       med object-fit cover, og formen er afsnittets. Valget mellem
       bred og høj film efter skærmbredde måles stadig — nu på
       kilden alene. */

  const nyheder = [
    { id: 1, titel: 'Længere åbent', tekst: 'Vi holder åbent til 21.', dato: '2026-08-06', aktiv: true },
  ];

  test('pointen står i sidens egen tekst, og baggrunden er skjult for oplæsning',
    async ({ page }) => {
      await åbn(page, '/index.html', { data: grunddata({ nyheder }) });

      // Isens overskrift bærer stadig pointen — filmen eller ej
      const isen = page.locator('#isen');
      await expect(isen).toBeVisible();
      await expect(isen.locator('h2')).toContainText('Du kommer for isen');
      await expect(isen.locator('h2')).toContainText('Du bliver for udsigten');

      /* Filmen er BAGGRUND nu, og en baggrund skal ikke læses op:
         indholdet i afsnittet er nyhederne. Før havde videoen et
         aria-label — nu skal hele laget være aria-hidden. */
      await expect(page.locator('.nyheds-baggrund'))
        .toHaveAttribute('aria-hidden', 'true');
    });

  /* Den vigtige halvdel af ikke-hent-reglen: findes afsnittet
     ikke, hentes INGENTING — hverken film eller poster. Filmen er
     800 kB på en telefon. */
  test('uden nyheder hentes hverken film eller poster', async ({ page }) => {
    const hentet = [];
    page.on('request', (r) => { if (/isfilm/.test(r.url())) hentet.push(r.url()); });

    await åbn(page, '/index.html', { data: grunddata({ nyheder: [] }) });
    await page.waitForTimeout(1000);

    await expect(page.locator('#nyheder')).toBeHidden();
    expect(hentet, `der blev hentet til et afsnit, der ikke findes: ${hentet}`)
      .toEqual([]);
  });

  test('telefonen får den høje film, computeren den brede', async ({ page, isMobile }) => {
    await åbn(page, '/index.html', { data: grunddata({ nyheder }) });
    await page.locator('#nyheder').scrollIntoViewIfNeeded();

    await expect.poll(async () => page.locator('#nyhedsfilm source').count(),
      { timeout: 8000 }).toBeGreaterThan(0);

    const kilde = await page.locator('#nyhedsfilm source').first().getAttribute('src');
    expect(/isfilm-hoej\./.test(kilde),
      `telefonprofilen skal have den høje film, fik ${kilde}`).toBe(!!isMobile);
    // MP4 først: H.264 afkodes i hardware på flere apparater
    await expect(page.locator('#nyhedsfilm source').first())
      .toHaveAttribute('type', 'video/mp4');
  });

  test('linket fører til menukortets is-afdeling, ikke til maden', async ({ page }) => {
    await åbn(page, '/index.html');

    await page.locator('#isen-til-menu').click();

    // Menukortet er en selvstændig side nu, og ?afd=is skal åbne
    // is-fanen. Uden det landede gæsten på madkortet efter at have
    // trykket på et link der lovede is.
    await expect(page).toHaveURL(/menu\.html\?afd=is/);
    await expect(page.locator('#afd-is')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#menu-liste')).toContainText('Softice og vafler');
  });

  /* FILMEN SKAL HENTES FØR DEN SPILLER — de to skridt er stadig
     adskilt: hentningen begynder når afsnittet nærmer sig,
     afspilningen først når en tredjedel af det er inde i skærmen
     OG browseren siger den kan køre igennem. */
  test('filmen hentes i god tid, men spiller først når den er i syne', async ({ page }, info) => {
    test.skip(info.project.name === 'mobil',
      'på en telefon er afsnittet delvist i syne allerede ved indlæsning');
    await åbn(page, '/index.html', { data: grunddata({ nyheder }) });
    await page.waitForSelector('#nyhedsfilm');

    // Ved indlæsning: hentningen må gerne være i gang (afsnit 2 er
    // altid inden for 900 px), men der må ikke spilles endnu.
    await expect.poll(async () => page.locator('#nyhedsfilm source').count(),
      { timeout: 8000 }).toBe(2);
    await page.waitForTimeout(500);
    const foer = await page.locator('#nyhedsfilm').evaluate(
      (v) => ({ pauset: v.paused, tid: v.currentTime }));
    expect(foer.pauset, 'filmen gik i gang før den var i syne').toBe(true);
    expect(foer.tid).toBe(0);

    // Og så skal den spille, når man kommer derned
    await page.locator('#nyheder').scrollIntoViewIfNeeded();
    await expect.poll(
      async () => page.locator('#nyhedsfilm').evaluate((v) => v.paused),
      { timeout: 9000 }).toBe(false);
  });

  /* Kontrakten fra dengang kunden skrev, at filmen ikke startede af
     sig selv på telefonen, gælder stadig — nu uden nogen knap
     overhovedet: en baggrund skal ikke trykkes i gang. */
  test('filmen kører af sig selv, og tiden løber', async ({ page }) => {
    await åbn(page, '/index.html', { data: grunddata({ nyheder }) });
    await page.locator('#nyheder').scrollIntoViewIfNeeded();

    await expect.poll(
      async () => page.locator('#nyhedsfilm').evaluate((v) => v.paused),
      { message: 'filmen startede ikke af sig selv', timeout: 9000 }).toBe(false);

    // Tiden skal LØBE, ikke bare stå på ikke-pauset
    const t1 = await page.locator('#nyhedsfilm').evaluate((v) => v.currentTime);
    await page.waitForTimeout(900);
    const t2 = await page.locator('#nyhedsfilm').evaluate((v) => v.currentTime);
    expect(t2, `filmen står stille på ${t1}s`).toBeGreaterThan(t1);

    // Attributterne er iOS' egen vej ind — og tavsheden er loven
    await expect(page.locator('#nyhedsfilm')).toHaveAttribute('autoplay', '');
    await expect(page.locator('#nyhedsfilm')).toHaveAttribute('playsinline', '');
    expect(await page.locator('#nyhedsfilm').evaluate((v) => v.muted),
      'en video med lyd må ikke starte af sig selv nogen steder').toBe(true);
  });

  /* De to lovlige undtagelser — og der er ingen tredje. Uden knap
     er svaret det samme i begge: filmen hentes ikke, posteren står
     som stillbillede, og afsnittet kan stadig læses. */
  test('reduceret bevægelse: ingen film, posteren står som stillbillede', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches
    )).toBe(true);

    const film = [];
    page.on('request', (r) => { if (/isfilm.*\.(mp4|webm)/.test(r.url())) film.push(r.url()); });

    await åbn(page, '/index.html', { data: grunddata({ nyheder }) });
    await page.locator('#nyheder').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    expect(film, 'filmen blev hentet trods reduceret bevægelse').toEqual([]);
    await expect(page.locator('#nyhedsfilm source')).toHaveCount(0);
    await expect(page.locator('#nyhedsfilm'))
      .toHaveAttribute('poster', /isfilm(-hoej)?-poster\.jpg$/);
    // ...og nyhederne kan stadig læses
    await expect(page.locator('#nyheder .nw h3').first()).toBeVisible();
  });

  test('sparetilstand: filmen hentes ikke', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        get: function () { return { saveData: true, effectiveType: '4g' }; },
      });
    });

    const film = [];
    page.on('request', (r) => { if (/isfilm.*\.(mp4|webm)/.test(r.url())) film.push(r.url()); });

    await åbn(page, '/index.html', { data: grunddata({ nyheder }) });
    await page.locator('#nyheder').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);

    expect(film, 'filmen blev hentet trods sparetilstand').toEqual([]);
    await expect(page.locator('#nyhedsfilm source')).toHaveCount(0);
    await expect(page.locator('#nyheder .nw h3').first()).toBeVisible();
  });
});


/* ============================================================
   TEKSTERNE INDE I FILMEN

   Filmen har tre tekster brændt ind: åbningslinjen "Tre kugler.
   Én hånd. Én udsigt." på sand, og til sidst navnet i 96px og
   "Udsigten er inkluderet" i 25px oven på et solnedgangsfoto.
   Solnedgange er lyse. Sløret bag dem er sat efter en måling, og
   målingen står her, så en ny udgave af filmen ikke kan snige en
   ulæselig tekst ind.

   DER MÅLES PÅ OPSKRIFTEN, IKKE PÅ VIDEOEN. Det er et bevidst
   valg. I den færdige video ER teksten en del af billedet, så en
   måling af videoens pixels ville måle den hvide skrift mod sig
   selv og altid give 1:1. Første udgave af denne test gjorde
   præcis det og påstod 1,09:1.

   assets/scoop-film.html kan derimod tegne det samme øjeblik med
   teksten slået fra. Så er det baggrunden alene der bliver målt –
   og baggrunden er hele det der afgør om skriften kan læses.
   Videoen er lavet af netop den fil, så måler vi det rigtige.

   METODEN: der tages et billede af feltet bag teksten, det
   sendes tilbage ind i browseren, tegnes ned i blokke på
   størrelse med en bogstavstreg og måles. En lys plet der er
   smallere end stregen forhindrer ikke at man læser bogstavet –
   en lys FLADE på størrelse med stregen gør.
   ============================================================ */

/* FILMEN FINDES I TO FORMATER, og teksterne står ikke det samme
   sted i dem. Den brede har titlen i højre side og åbningslinjen
   øverst til højre; den høje har titlen NEDERST og åbningslinjen
   øverst til venstre. Sløret er derfor også vendt en kvart omgang.

   Begge måles. En film der kun er målt i det ene format er en film
   hvor halvdelen af gæsterne kan få et navn de ikke kan læse – og
   det er telefonhalvdelen, altså de fleste. */
const FORMATER = [
  {
    form: 'bred', vindue: { width: 1920, height: 1080 },
    felter: [
      {
        navn: 'navnet',
        // Hvid skrift, 96px Bebas. Stor tekst: kravet er 3,0.
        farve: [255, 247, 234], blok: 12, krav: 3.0,
        boks: { x: 1070, y: 340, width: 700, height: 330 },
        // Titlen er fremme fra 8,55s. Fra 11,25s toner hele billedet
        // ud til sand, og der er ikke længere noget at læse.
        fra: 8.55, til: 11.2,
      },
      {
        navn: 'underlinjen',
        farve: [255, 247, 234], blok: 5, krav: 3.0,
        boks: { x: 1070, y: 690, width: 700, height: 60 },
        fra: 9.6, til: 11.2,
      },
      {
        navn: 'åbningslinjen',
        // Blækblå skrift på lyst sand, 34px. Stor tekst: 3,0.
        farve: [15, 44, 68], blok: 5, krav: 3.0,
        boks: { x: 1300, y: 120, width: 470, height: 140 },
        fra: 0.9, til: 2.7,
      },
    ],
  },
  {
    form: 'hoej', vindue: { width: 1080, height: 1350 },
    felter: [
      {
        /* KASSEN SKAL LIGGE PRÆCIS PÅ BOGSTAVERNE.

           Titelblokken står i 96,1020 og er 888 px bred, men selve
           bogstaverne fylder kun de første 470: "HAVNEGRILL" er den
           længste linje. Og lodret begynder de først i 1045 – over
           dem ligger stregen og titelfeltets bløde overkant, hvor
           pladen stadig er halvt gennemsigtig.

           Første udgave målte fra y=958 og fik 3,25:1 ved 10,45s
           mod et krav på 3,0. Det tal var ikke navnets kontrast, det
           var havnefotoet gennem titelfeltets overgang, 100 px over
           det øverste bogstav. En måling af tomt felt kan fælde en
           tekst der er fuldt læselig – eller, værre, give en falsk
           tryghed om hvor meget margin der er.

           Bogstaverne: #ord begynder i 1020 + 3 (streg) + 22 (luft)
           = 1045, tre linjer à 84 × 0,96 = 242. */
        navn: 'navnet',
        farve: [255, 247, 234], blok: 13, krav: 3.0,
        boks: { x: 96, y: 1045, width: 490, height: 242 },
        fra: 8.55, til: 11.2,
      },
      {
        // margin-top 20 efter #ord, derefter 26 px skrift
        navn: 'underlinjen',
        farve: [255, 247, 234], blok: 6, krav: 3.0,
        boks: { x: 96, y: 1305, width: 490, height: 32 },
        fra: 9.6, til: 11.2,
      },
      {
        navn: 'åbningslinjen',
        // Blækblå på lyst sand, 44px
        farve: [15, 44, 68], blok: 6, krav: 3.0,
        boks: { x: 90, y: 88, width: 655, height: 76 },
        fra: 0.9, til: 2.7,
      },
    ],
  },
];

for (const format of FORMATER) {
test.describe(`Teksterne i isfilmen kan læses – ${format.form}`, () => {
  test.setTimeout(180000);

  /* VINDUET SKAL VÆRE MINDST SÅ STORT SOM FILMEN.

     Det var det ikke før, og så løj målingen. Et skærmbillede af
     et udsnit bliver klippet mod VINDUET, ikke mod siden: med et
     vindue på 1280 px blev titelfeltet ved x=1070-1770 stille og
     roligt beskåret til 1070-1280, og der blev målt på en
     fjerdedel af den tekst der skulle måles.

     Det kom for dagen da åbningslinjen blev flyttet til x=1300 –
     helt uden for vinduet – og Playwright svarede "clipped area is
     outside the image" i stedet for at give et forkert tal. Den
     fejl var en gave.

     Vinduet er derfor formatets egen størrelse – 1920×1080 for det
     brede, 1080×1350 for det høje. */
  test.use({ viewport: format.vindue });

  /* Kun i fuld størrelse. Filmen er en fast komposition og har
     intet med sidens layout at gøre – teksten ligger på de samme
     pixels uanset hvilken skærm videoen senere vises på.
     Telefonprofilen tegner desuden i tredobbelt opløsning, og så
     passer blokstørrelserne ikke til en bogstavstreg længere. */
  test.skip(({ isMobile }) => !!isMobile,
    'filmen måles kun én gang, i sin egen størrelse');

  for (const felt of format.felter) {
    test(`${felt.navn} står på en baggrund der bærer den`, async ({ page }) => {
      await page.goto(`/assets/scoop-film.html?form=${format.form}&t=0`);
      await page.waitForFunction('window.KLAR === true');

      let vaerst = 99, hvor = null, plet = null, antal = 0;

      for (let t = felt.fra; t <= felt.til; t += 1 / 10) {
        // Tegn øjeblikket, og slå filmens egne tekster fra
        await page.evaluate((tid) => {
          window.SCOOP.tegn(tid);
          document.getElementById('titel').style.visibility = 'hidden';
          document.getElementById('tekst').style.visibility = 'hidden';
          return new Promise((ok) => requestAnimationFrame(
            () => requestAnimationFrame(ok)
          ));
        }, t);

        const billede = (await page.screenshot({ clip: felt.boks })).toString('base64');

        const svar = await page.evaluate(async ([b64, felt]) => {
          function lin(x) {
            x /= 255;
            return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
          }
          function lum(r, g, b) {
            return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
          }

          const im = new Image();
          im.src = 'data:image/png;base64,' + b64;
          await im.decode();

          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.width / felt.blok));
          c.height = Math.max(1, Math.round(im.height / felt.blok));
          const ctx = c.getContext('2d');
          ctx.drawImage(im, 0, 0, c.width, c.height);

          const lt = lum(felt.farve[0], felt.farve[1], felt.farve[2]);
          const d = ctx.getImageData(0, 0, c.width, c.height).data;

          let v = 99, p = null;
          for (let i = 0; i < d.length; i += 4) {
            const lb = lum(d[i], d[i + 1], d[i + 2]);
            const k = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05);
            if (k < v) { v = k; p = [d[i], d[i + 1], d[i + 2]]; }
          }
          return { vaerst: v, plet: p };
        }, [billede, felt]);

        antal++;
        if (svar.vaerst < vaerst) {
          vaerst = svar.vaerst;
          hvor = Math.round(t * 100) / 100;
          plet = svar.plet;
        }
      }

      console.log(`${felt.navn}: værst ${vaerst.toFixed(2)}:1 ved ${hvor}s `
        + `(baggrund rgb(${plet}), ${antal} øjeblikke målt)`);

      expect(antal, 'der blev ikke målt nogen øjeblikke').toBeGreaterThan(3);
      expect(vaerst,
        `${felt.navn} er ulæselig ved ${hvor}s. Styrk sløret i `
        + `assets/scoop-film.html og lav filmen om med `
        + `node vaerktoej/lav-isfilm.js`).toBeGreaterThanOrEqual(felt.krav);
    });
  }
});
}

/* Den færdige video skal svare til opskriften. Uden dette kunne
   målingen ovenfor bestå på en opskrift der er rettet, mens
   gæsterne stadig ser en gammel video der aldrig blev lavet om.

   BEGGE formater tjekkes, og både længde og form. Formen er den
   nye fælde: en høj video der ved en fejl blev optaget i et bredt
   vindue ville stadig have den rigtige længde, og siden ville
   klippe titlen af nede i bunden uden at nogen kunne se hvad der
   manglede. */
const VIDEOER = [
  { form: 'bred', fil: 'billeder/isfilm.webm', b: 1920, h: 1080 },
  { form: 'hoej', fil: 'billeder/isfilm-hoej.webm', b: 1080, h: 1350 },
];

for (const v of VIDEOER) {
  test(`${v.form}: videoen er lavet af den opskrift der lige blev målt`, async ({ page }) => {
    await page.goto(`/assets/scoop-film.html?form=${v.form}&t=0`);
    await page.waitForFunction('window.KLAR === true');
    const opskrift = await page.evaluate(
      () => ({ ialt: window.SCOOP.ialt, b: window.SCOOP.bredde, h: window.SCOOP.hoejde }));

    expect(opskrift.b, `opskriften siger ${opskrift.b} px bred`).toBe(v.b);
    expect(opskrift.h, `opskriften siger ${opskrift.h} px høj`).toBe(v.h);

    await page.goto('/index.html');
    const maal = await page.evaluate(async (fil) => {
      const el = document.createElement('video');
      el.src = fil;   // testbrowseren er bygget uden H.264
      await new Promise((ok, nej) => {
        el.addEventListener('loadedmetadata', ok, { once: true });
        el.addEventListener('error', () => nej(new Error('kunne ikke indlæse ' + fil)), { once: true });
      });
      return { laengde: el.duration, b: el.videoWidth, h: el.videoHeight };
    }, v.fil);

    // 1/30 sekund: ét billede. Mere end det, og videoen er en anden
    // film end den filen beskriver.
    expect(Math.abs(maal.laengde - opskrift.ialt),
      `opskriften er ${opskrift.ialt}s, men videoen er ${maal.laengde}s. `
      + 'Lav filmen om med: node vaerktoej/lav-isfilm.js').toBeLessThan(1 / 30 + 0.01);

    expect(`${maal.b}×${maal.h}`,
      `${v.fil} er optaget i det forkerte format. Lav den om med: `
      + `node vaerktoej/lav-isfilm.js ${v.form}`).toBe(`${v.b}×${v.h}`);
  });
}
