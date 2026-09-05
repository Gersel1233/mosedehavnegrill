/* ============================================================
   HAVNENS EGNE IKONER  (5/9)
   ============================================================
   Kundens ord: "det skal ikke være billige lorte generic ikoner,
   de skal være gode, unikke og evt. animationer på." Det vender
   hans egen ordre fra 31/8 om emojier på retterne.

   Reglen om HVILKET ansigt en ret får bor stadig i
   js/menu-emoji.js — den svarer bare med en nøgle nu, og
   js/ikoner.js tegner den. Emojiet er reserven, hvis ikonfilen
   ikke er med.

   Prøverne her måler det, der kan skride:
   · en nøgle i reglen, der ikke findes i ikonfilen (tom plads)
   · en side, der bygger sin egen liste i stedet for at spørge
     reglen (to ansigter på den samme burger)
   · bevægelse, der rører andet end transform/opacity, eller som
     kører, mens ikonet ikke er på skærmen, eller for den, der har
     bedt om ro
   · og at reserven virker: uden js/ikoner.js står emojiet
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, grunddata } = require('./hjaelp');
const fs = require('fs');
const path = require('path');

const ROD = path.join(__dirname, '..');
const BORDE = [{ id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4,
  placering: 'ude', aktiv: true, sortering: 10 }];

/* Alt, der er et emoji — ★ (U+2605) er det ikke, og det er med
   vilje: "★ Favoritter" er en tekstglyf, ikke et billede. */
const EMOJI = /\p{Extended_Pictographic}/u;

function medKaffe() {
  const d = grunddata();
  d.menu_kategorier.push({ id: 20, afdeling: 'drikke', navn: 'Kaffe og varme drikke', sortering: 20, aktiv: true });
  d.menu_varer.push({ id: 20, kategori_id: 20, navn: 'Latte', beskrivelse: null, pris: 40, aktiv: true, udsolgt: false, sortering: 1 });
  return d;
}

test.describe('Reglen og ikonerne hænger sammen', () => {
  test('hver nøgle, reglen kan svare med, har et ikon', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    const mangler = await page.evaluate(() =>
      window.MosedeEmoji.ALLE_NOEGLER.filter((n) => !window.MosedeIkoner.findes(n)));
    expect(mangler, 'en nøgle uden ikon er en tom plads i listen').toEqual([]);
  });

  test('ejerens eget emoji slår ikonet', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    const r = await page.evaluate(() => {
      const k = window.MosedeEmoji.tegnKategori({ navn: 'Øl', emoji: '🌊' });
      const i = window.MosedeEmoji.tegnKategori({ navn: 'Øl' });
      return { eget: k.nodeType === 3 ? k.textContent : 'svg', ikon: i.nodeName + '.' + i.getAttribute('class') };
    });
    expect(r.eget).toBe('🌊');
    expect(r.ikon).toContain('svg.ik ik-oel');
  });

  test('ikonet følger reglen — kortet har ikke sin egen liste', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: medKaffe() });
    await page.waitForTimeout(500);
    const skaeve = await page.evaluate(() => {
      const ud = [];
      document.querySelectorAll('.mk-kat .panel[data-kategori]').forEach((panel) => {
        const kat = { navn: panel.getAttribute('data-kategori') };
        const hoved = panel.querySelector('.mk-tegn svg.ik');
        const ventet = 'ik-' + window.MosedeEmoji.noegleForKategori(kat);
        if (!hoved || !hoved.classList.contains(ventet)) ud.push(kat.navn + ' (kategori)');
        panel.querySelectorAll('.mk-linje[data-vare]').forEach((l) => {
          const svg = l.querySelector('.mk-vare-tegn svg.ik');
          const n = 'ik-' + window.MosedeEmoji.noegleForVare({ navn: l.getAttribute('data-vare') }, kat);
          if (!svg || !svg.classList.contains(n)) ud.push(l.getAttribute('data-vare'));
        });
      });
      return ud;
    });
    expect(skaeve).toEqual([]);
  });

  test('samme vare, samme ansigt — menukortet mod bordet', async ({ page }) => {
    /* ⚠️ TO SIDER MOD HINANDEN. De bygges af to forskellige filer
       (js/skal/menukort.js og js/bestilling.js); reglen er den
       samme, men OPTEGNINGEN er skrevet to gange. */
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    await page.waitForTimeout(400);
    const kort = await page.locator('.mk-linje[data-vare="Flæskestegssandwich"] .mk-vare-tegn svg')
      .getAttribute('class');
    await åbn(page, '/ved-bordet/?bord=7', { ur: '2026-08-06T11:00:00Z', data: grunddata({ borde: BORDE }) });
    const bord = await page.locator('.stk-linje[data-vare="Flæskestegssandwich"] .stk-tegn svg')
      .getAttribute('class');
    expect(kort, 'kortet har intet ikon').toMatch(/ik-[a-z]+/);
    expect(bord.match(/ik-[a-z]+/)[0], 'to ansigter på den samme vare').toBe(kort.match(/ik-[a-z]+/)[0]);
  });
});

test.describe('Emojierne er væk fra fladerne', () => {
  test('menukortet skriver ikke ét emoji, hvor ikonet står', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: medKaffe() });
    await page.waitForTimeout(500);
    const tekst = await page.locator('.mk-kat').innerText();
    expect(tekst, 'et emoji står stadig på kortet').not.toMatch(EMOJI);
    const hop = await page.locator('.mk-hop').innerText();
    expect(hop).not.toMatch(EMOJI);
    await expect(page.locator('.mk-hop button svg.ik').first()).toBeAttached();
    await expect(page.locator('.mk-allergi svg.ik-peanut')).toHaveCount(1);
  });

  test('forsidens fire fliser er havnens egne — i blæk, ikke i rødt', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    const fliser = page.locator('.menucard .tiles .tile-ikon svg.ik');
    await expect(fliser).toHaveCount(4);
    const navne = await fliser.evaluateAll((els) => els.map((e) => e.getAttribute('class').match(/ik-([a-z]+)/)[1]));
    expect(navne).toEqual(['gryde', 'burger', 'salat', 'sodavand']);
    await expect(page.locator('.menucard .tiles')).toHaveAttribute('aria-hidden', 'true');
    /* Flisen var rød til designets egne streg-ikoner. Med en rød
       streg ville den røde plet — ikonernes signatur — forsvinde. */
    const farve = await fliser.first().evaluate((e) => getComputedStyle(e).color);
    expect(farve, 'stregen er rød, og pletten drukner').not.toBe('rgb(214, 42, 58)');
    await expect(page.locator('.menucard .g svg.ik-bog')).toHaveCount(1);
    await expect(page.locator('.menucard .fine svg.ik-peanut')).toHaveCount(1);
    expect(await page.locator('.menucard').innerText()).not.toMatch(EMOJI);
  });

  test('bordet: kategori, chip, række, dagens ret og to-go/spis her', async ({ page }) => {
    const d = grunddata({ borde: BORDE });
    d.indstillinger.dagens_ret = { navn: 'Stegt rødspætte', beskrivelse: '', pris: 118 };
    await åbn(page, '/ved-bordet/?bord=7', { ur: '2026-08-06T11:00:00Z', data: d });
    await expect(page.locator('.kort-gruppe[data-gruppe="Smørrebrød"] .kort-tegn svg.ik-broed')).toHaveCount(1);
    await expect(page.locator('.kort-chip:has-text("Smørrebrød") svg.ik-broed')).toHaveCount(1);
    await expect(page.locator('.stk-linje[data-vare="Flæskestegssandwich"] .stk-tegn svg.ik')).toHaveCount(1);
    await expect(page.locator('.dagens-blok-tegn svg.ik-gryde')).toHaveCount(1);
    /* Rødspætten er Køge Bugts egen — målt på et skud 5/9: den
       stod med en tallerken. */
    await expect(page.locator('.stk-linje[data-vare="Stegt rødspætte"] .stk-tegn svg.ik-fisk')).toHaveCount(1);
    expect(await page.locator('#bestil-stykker').innerText()).not.toMatch(EMOJI);
  });

  test('hentes eller leveres: ordet er tekst, ikonet står foran', async ({ page }) => {
    /* Ved bordet er der intet valg — et bord ER spis her. Valget
       findes på bestil/, og dér skal posen stå foran ordet. */
    /* bestil/ er smørrebrødets side og spørger "Hentes eller
       leveres?" — kun når ejeren HAR slået levering til. */
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger, { levering: true });
    await åbn(page, '/bestil/', { data: d });
    const typer = page.locator('#bestil-hvordan .type-navn');
    expect(await typer.count()).toBeGreaterThan(0);
    await expect(typer.locator('svg.ik-pose')).toHaveCount(1);
    await expect(typer.locator('svg.ik-bil')).toHaveCount(1);
    expect(await typer.first().innerText()).toMatch(/\S/);
    expect(await page.locator('#bestil-hvordan').innerText()).not.toMatch(EMOJI);
  });

  test('nyhedens slags og pladsholderen uden foto er ikoner', async ({ page }) => {
    const d = grunddata();
    d.nyheder = [{ id: 'n1', lokation_id: 'mosede', titel: 'Live musik', tekst: 'Lørdag.', dato: '2026-08-06', slags: 'musik', aktiv: true }];
    await åbnSkal(page, '/index.html', { data: d });
    await page.waitForTimeout(400);
    await expect(page.locator('#nyheder .nw-felt svg.ik-musik')).toHaveCount(1);
    await expect(page.locator('.hist-teaser-tegn svg.ik-anker')).toHaveCount(1);
    await åbnSkal(page, '/h-catering.html', { data: grunddata() });
    await page.waitForTimeout(400);
    await expect(page.locator('.foto-felt svg.ik').first()).toBeAttached();
    expect(await page.locator('.foto-felt').allInnerTexts().then((t) => t.join(''))).not.toMatch(EMOJI);
  });

  test('ingen pladsholder i HTML uden både ikon og reserve', () => {
    /* data-tegn (emojiet) bliver som reserve; data-ikon er det,
       der tegnes. Mangler det ene, står enten et emoji eller en
       tom flade, den dag den anden fil ikke er med. */
    const filer = fs.readdirSync(ROD).filter((f) => /\.html$/.test(f));
    const halve = [];
    for (const f of filer) {
      const s = fs.readFileSync(path.join(ROD, f), 'utf8');
      for (const m of s.matchAll(/<image-slot[^>]*>/g)) {
        const harTegn = /data-tegn=/.test(m[0]);
        const harIkon = /data-ikon=/.test(m[0]);
        if (harTegn !== harIkon) halve.push(f + ': ' + m[0].slice(0, 60));
      }
    }
    expect(halve).toEqual([]);
  });
});

test.describe('Reserven', () => {
  test('uden js/ikoner.js står emojiet — reglen lever videre', async ({ page }) => {
    await page.route('**/js/ikoner.js*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    await page.waitForTimeout(500);
    await expect(page.locator('.mk-tegn svg')).toHaveCount(0);
    const tegn = await page.locator('[data-kategori="Smørrebrød"] .mk-tegn').textContent();
    expect(tegn.trim(), 'uden ikonfilen skal emojiet stå som reserve').toBe('🍞');
    await expect(page.locator('.mk-linje[data-vare="Flæskestegssandwich"] .mk-vare-tegn')).toHaveText(/\S/);
  });

  test('uden js/menu-emoji.js står bordet uden ansigter, som før', async ({ page }) => {
    await page.route('**/js/menu-emoji.js*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await åbn(page, '/ved-bordet/?bord=7', { ur: '2026-08-06T11:00:00Z', data: grunddata({ borde: BORDE }) });
    await expect(page.locator('.kort-tegn')).toHaveCount(0);
    await expect(page.locator('.stk-tegn')).toHaveCount(0);
    await expect(page.locator('.kort-gruppe').first()).toBeVisible();
  });
});

test.describe('Bevægelsen', () => {
  test('kategoriens ikon rører på sig på skærmen — og ligger stille uden for den', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobil', 'rulleroden er dokumentet på telefonen');
    await åbnSkal(page, '/m-menukort.html', { data: medKaffe() });
    await page.waitForTimeout(500);
    const kaffe = page.locator('[data-kategori="Kaffe og varme drikke"] .mk-tegn svg.ik-kaffe');
    await expect(kaffe).toHaveCount(1);
    await kaffe.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await expect(kaffe).toHaveClass(/lever/);
    const navn = await kaffe.locator('.ik-damp').first().evaluate((e) => getComputedStyle(e).animationName);
    expect(navn, 'dampen står stille på skærmen').toBe('ik-damp');
    /* Og den, der er rullet ud af syne, holder op igen. */
    const smoer = page.locator('[data-kategori="Smørrebrød"] .mk-tegn svg');
    const udenFor = await smoer.evaluate((e) => {
      const r = e.getBoundingClientRect(); return r.bottom < -40 || r.top > innerHeight + 40;
    });
    if (udenFor) await expect(smoer).not.toHaveClass(/lever/);
  });

  test('den, der har bedt om ro, får ro', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await åbnSkal(page, '/m-menukort.html', { data: medKaffe() });
    await page.waitForTimeout(500);
    const kaffe = page.locator('[data-kategori="Kaffe og varme drikke"] .mk-tegn svg.ik-kaffe');
    await kaffe.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const navn = await kaffe.locator('.ik-damp').first().evaluate((e) => getComputedStyle(e).animationName);
    expect(navn).toBe('none');
  });

  test('bevægelsen rører kun transform og opacity', () => {
    /* Samme lov som gennemgangens overgangs-prøve: alt andet
       udløser layout, og 21 kategorihoveder, der ombryder hvert
       billede, er præcis dét, der koster på en iPad. */
    const css = fs.readFileSync(path.join(ROD, 'css', 'ikoner.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const blokke = [...css.matchAll(/@keyframes[^{]*\{([\s\S]*?\})\s*\}/g)];
    expect(blokke.length).toBeGreaterThan(2);
    const egenskaber = new Set();
    for (const [, krop] of blokke) {
      for (const m of krop.matchAll(/([a-z-]+)\s*:/g)) egenskaber.add(m[1]);
    }
    for (const e of egenskaber) expect(['transform', 'opacity'], e + ' udløser layout eller maling').toContain(e);
  });

  test('ikonfilen bruger hverken filter, gradient eller maske', () => {
    const js = fs.readFileSync(path.join(ROD, 'js', 'ikoner.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(js).not.toMatch(/<filter|Gradient|<mask|<clipPath|<image/);
    /* Og stregen er sidens egen farve — så den følger temaet og
       den mørke historieside af sig selv. */
    const css = fs.readFileSync(path.join(ROD, 'css', 'ikoner.css'), 'utf8');
    expect(css).toMatch(/\.ik\{[^}]*stroke:currentColor/);
  });
});

test.describe('Størrelse og skærmlæser', () => {
  test('ikonet fylder sin plads og er skjult for skærmlæseren', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    await page.waitForTimeout(400);
    const svg = page.locator('[data-kategori="Smørrebrød"] .mk-tegn svg');
    const kasse = await svg.boundingBox();
    expect(kasse.width, 'ikonet er ikke skaleret til flisen').toBeGreaterThanOrEqual(22);
    expect(kasse.width).toBeLessThanOrEqual(28);
    await expect(svg).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('[data-kategori="Smørrebrød"] h3')).toHaveText('Smørrebrød');
  });
});
