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
    await expect(page.locator('.h-citat')).toContainText('Efter sigende');
  });

  test('forsidens mørke afsnit fører derhen', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    await springIntroOver(page);

    const knap = page.locator('.about .hist-teaser-knap');
    await expect(knap).toHaveCount(1);
    expect(await knap.getAttribute('href')).toBe('historien.html');
    /* Teaseren lover ankeret — og siden skal holde det. */
    await expect(page.locator('.about .hist-teaser')).toContainText('1710');
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

  test('de fire pladser bærer et billede, der faktisk kom frem', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });

    await expect(page.locator('image-slot'),
      'pladserne blev stående som <image-slot> — de tegner sig stiplet grå')
      .toHaveCount(0);
    await expect(page.locator('.h-foto img')).toHaveCount(4);

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
    ), { timeout: 8000 }).toBe(4);
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
    expect(linjer.length, 'ingen reserve-billeder — prøven måler ingenting').toBe(8);
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
    await expect(page.locator('.h-foto img[data-reserve]')).toHaveCount(4);
  });

  test('lægger ejeren ALLE fire op, forsvinder stemningslinjen', async ({ page }) => {
    /* Modstykket til prøven ovenfor. Uden den ville en linje, der
       ALTID står, bestå — og så ville siden kalde ejerens egne
       fotos for stemningsbilleder fra kysten. */
    const d = grunddata();
    const px = 'data:image/gif;base64,'
      + 'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
    for (let n = 1; n <= 4; n++) d.indstillinger['foto_historie_' + n] = px;
    await åbnSkal(page, '/historien.html', { data: d });

    await expect(page.locator('.h-foto img')).toHaveCount(4);
    await expect(page.locator('.h-foto img[data-reserve]')).toHaveCount(0);
    await expect(page.locator('#h-stemning')).toBeHidden();
  });

  test('med ÉN af fire lagt op bliver linjen stående', async ({ page }) => {
    /* Den tilstand, ejeren rent faktisk kommer i: han skifter ét
       billede ad gangen. Tre af fire er stadig repoets, og så er
       sætningen stadig sand. */
    const d = grunddata();
    d.indstillinger.foto_historie_2 = 'data:image/gif;base64,'
      + 'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
    await åbnSkal(page, '/historien.html', { data: d });

    await expect(page.locator('.h-foto img[data-reserve]')).toHaveCount(3);
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
    const kilder = await page.evaluate(() => Array.from(
      document.querySelectorAll('.h-foto img')).map((i) => i.getAttribute('src')));
    expect(kilder[1].startsWith('data:image/gif'),
      `plads 2 viser stadig ${kilder[1]} — ejerens foto slog ikke igennem`).toBe(true);
    expect(kilder[0]).toContain('historie-master');
    expect(kilder[2]).toContain('historie-is');

    /* Alt-teksten er FOTOETS, ikke pladsens — samme regel som
       resten af huset. */
    await expect(page.locator('.h-foto img').nth(1))
      .toHaveAttribute('alt', 'Et gammelt jernanker i vandkanten');
  });
});
