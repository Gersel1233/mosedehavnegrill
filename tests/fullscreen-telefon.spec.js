/* ============================================================
   FULLSCREEN PÅ TELEFONEN (5/9)
   ============================================================
   Kundens ord med to skud fra hans iPhone:

     "det er meningen at det ternede skal gå hele vejen op og
      ikke er sådan en white bar og når man scroller ned eller op
      så du ved der i bunden er meningen skal blive mindre så man
      ligesom får hele hjemmesiden som så meget fullscreen som
      overhovedet muligt"

   To krav, to slags prøver:

   1) TERNET SKAL NÅ DET FYSISKE TOPPUNKT. Målt på en iPhone 13:
      heroen trak sig 116 px op mod en topbjælke på 120, så fire
      px creme stod tilbage. Og uden viewport-fit=cover lægger
      Safari hele siden NEDEN UNDER statuslinjen og fylder
      stribens plads med sidens baggrund — cremen. Det var den
      brede hvide bjælke.

   2) DOKUMENTET SKAL RULLE. Safari folder KUN sin bundbjælke
      sammen på dokumentets rulning; en indlejret beholder rører
      den aldrig. Det er ikke en indstilling, det er browserens
      regel — så rulleroden skal flytte under 820 px.

   ⚠️ HVERT TAL KOMMER UDEFRA. Sidehovedets top måles mod
   rullerodens top, ikke mod sin egen margin; og optrækket prøves
   mod EN ANDEN bjælkehøjde end designets, så en prøve, der bare
   læser designets eget tal, ikke kan bestå.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, springIntroOver } = require('./hjaelp');
const fs = require('fs');
const path = require('path');

const ROD = path.join(__dirname, '..');

/* Designsiderne læses af MAPPEN — en tiende side kan ikke
   udgives uden at komme med i prøven. */
function designsider() {
  return fs.readdirSync(ROD)
    .filter((f) => /^(index|h-.*|m-.*|historien)\.html$/.test(f))
    .sort();
}

test.describe('Ternet går hele vejen op', () => {
  test('hver designside beder om hele skærmen (viewport-fit=cover)', () => {
    const sider = designsider();
    expect(sider.length, 'ingen designsider fundet — prøven måler intet')
      .toBeGreaterThan(8);
    const uden = sider.filter((f) => {
      const s = fs.readFileSync(path.join(ROD, f), 'utf8');
      const m = s.match(/<meta\s+name="viewport"[^>]*>/i);
      return !m || !/viewport-fit\s*=\s*cover/i.test(m[0]);
    });
    expect(uden, 'uden viewport-fit=cover fylder Safari sikkerhedsområdet med sidens creme')
      .toEqual([]);
  });

  test('heroens tern begynder OVER rullerodens top — ingen creme foroven',
    async ({ page }) => {
      await åbnSkal(page, '/index.html', { data: grunddata() });
      await springIntroOver(page);

      const m = await page.evaluate(() => {
        const hero = document.querySelector('.hero');
        const rod = document.getElementById('sc');
        const f = getComputedStyle(hero, '::before');
        return {
          hero: hero.getBoundingClientRect().top - rod.getBoundingClientRect().top,
          bjaelke: document.querySelector('.topbar').getBoundingClientRect().height,
          tern: f.backgroundImage,
        };
      });

      /* Ternet er heroens ::before med inset:0, og .hero har
         overflow:hidden — altsaa kan det ikke naa hoejere op end
         kassen selv. Derfor ER kassens top svaret. */
      expect(m.tern, 'heroens ::before bærer ikke længere ternet')
        .toMatch(/repeating-linear-gradient/);
      expect(m.hero, 'sidehovedet begynder under rullerodens top — der står creme')
        .toBeLessThanOrEqual(0);
    });

  /* ⚠️ KUN TELEFONEN. havnegrillen-desktop.css tager topbjælken
     over fra 821 px (padding:16px) og giver heroen sit eget
     optræk på -90 — en bred skærm har ingen statuslinje at tage
     hensyn til. Kørt i computerprofilen målte prøven det lag og
     ikke reglen. */
  test('optrækket følger bjælken, så en højere statuslinje ikke giver stregen tilbage',
    async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobil', 'sikkerhedsområdet er telefonens');
      await åbnSkal(page, '/index.html', { data: grunddata() });
      await springIntroOver(page);

      /* ⚠️ TALLET KOMMER UDEFRA. env(safe-area-inset-top) kan ikke
         efterlignes i Chromium, men det ENE tal, den fodrer, kan.
         90 px er ingen rigtig telefon — og det er pointen: en
         hero, der er bundet til designets 58, falder her. */
      const målt = [];
      for (const luft of ['58px', '69px', '90px']) {
        await page.evaluate((v) =>
          document.documentElement.style.setProperty('--top-luft', v), luft);
        await page.waitForTimeout(80);
        målt.push(await page.evaluate(() => {
          const hero = document.querySelector('.hero').getBoundingClientRect();
          const rod = document.getElementById('sc').getBoundingClientRect();
          const bar = document.querySelector('.topbar').getBoundingClientRect();
          const mk = document.querySelector('.topbar .brandmark').getBoundingClientRect();
          return {
            over: Math.round(hero.top - rod.top),
            bjaelke: Math.round(bar.height),
            maerke: Math.round(mk.top - rod.top),
          };
        }));
      }

      // Bjælken VOKSER — ellers måler resten ingenting.
      expect(målt[2].bjaelke, 'bjælken voksede ikke med luften')
        .toBeGreaterThan(målt[0].bjaelke + 20);
      // Og mærket flytter sig med, så det ikke ligger under kronen.
      expect(målt[2].maerke, 'mærket følger ikke statuslinjen')
        .toBeGreaterThan(målt[0].maerke + 20);
      // Men ternet bliver ved at dække toppen.
      for (const m of målt) {
        expect(m.over, 'creme kom tilbage foroven ved bjælkehøjde ' + m.bjaelke)
          .toBeLessThanOrEqual(0);
      }
    });
});

test.describe('Så meget fullscreen som muligt', () => {
  test('på en telefon ruller DOKUMENTET — det er det, der folder Safaris bjælke',
    async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobil', 'reglen gælder telefonen');
      await åbnSkal(page, '/index.html', { data: grunddata() });
      await springIntroOver(page);

      const m = await page.evaluate(() => {
        const sc = document.getElementById('sc');
        const de = document.documentElement;
        return {
          scRuller: getComputedStyle(sc).overflowY !== 'visible',
          docRuller: de.scrollHeight > de.clientHeight + 1,
          docHøjde: de.scrollHeight,
          skærm: de.clientHeight,
        };
      });

      expect(m.scRuller, '#sc er stadig en rullebeholder — Safari folder aldrig sin bjælke')
        .toBe(false);
      expect(m.docRuller, 'dokumentet ruller ikke').toBe(true);
      /* ⚠️ OG DET SKAL VÆRE HELE SIDEN, IKKE EN STUMP. Målt 5/9:
         den foldede pilles transform gav dokumentet 63 px
         spøgelses-rulning — nok til at Safari begyndte at folde
         bjælken og ramte enden med det samme. */
      expect(m.docHøjde, 'dokumentet ruller kun en stump — det er spøgelses-rulning')
        .toBeGreaterThan(m.skærm * 3);
    });

  test('pillen og skuffen følger skærmen, ikke dokumentets bund',
    async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobil', 'reglen gælder telefonen');
      await åbnSkal(page, '/index.html', { data: grunddata() });
      await springIntroOver(page);

      const m = await page.evaluate(() => ({
        pille: getComputedStyle(document.getElementById('bestil-pill')).position,
        skuffe: getComputedStyle(document.getElementById('sheet')).position,
      }));
      /* Med dokumentet som ruller bliver .device hele sidens højde;
         en absolut "bottom:24px" ville lande syv skærme nede. */
      expect(m.pille, 'pillen er ikke fixed — den lander i dokumentets bund').toBe('fixed');
      expect(m.skuffe, 'skuffemenuen er ikke fixed').toBe('fixed');
    });

  test('artboardet bliver på en computer — rullelogikken hænger på det',
    async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'computer', 'reglen gælder den brede skærm');
      await åbnSkal(page, '/index.html', { data: grunddata() });
      await springIntroOver(page);

      const scRuller = await page.evaluate(() =>
        getComputedStyle(document.getElementById('sc')).overflowY !== 'visible');
      expect(scRuller, 'artboardets ramme holdt op med at rulle på en bred skærm')
        .toBe(true);
    });

  /* ⚠️ FLERE SIDER, FORDI ÉN SIDE IKKE KUNNE FÆLDE FEJLEN (5/9).
     Forsiden bestod med tre forskellige udregninger af hoppet.
     h-selskaber og h-smorrebrod bærer designets .rev paa deres
     maal — og en transform flytter rektanglet, mens offsetTop
     ikke ved af den. MAALT: den ene udgave landede afsnittet
     11-12 px BAG bjælken netop dér. En regel, der kun proeves paa
     forsiden, maaler ikke den side, den gaar galt paa. */
  for (const [side, anker] of [
    ['/index.html', '#bestil'],
    ['/h-selskaber.html', '#forespoerg'],
    ['/h-smorrebrod.html', '#bestil'],
  ]) {
    test('ankerhoppet lander lige under bjælken paa ' + side, async ({ page }) => {
      await åbnSkal(page, side, { data: grunddata() });
      await springIntroOver(page);

      const fandtes = await page.evaluate((a) => {
        const l = document.querySelector('a[href="' + a + '"]');
        if (!l || !document.querySelector(a)) return false;
        l.click();
        return true;
      }, anker);
      expect(fandtes, 'hverken link eller mål — prøven måler ingenting').toBe(true);
      await page.waitForTimeout(900);

      const m = await page.evaluate((a) => {
        const bar = document.querySelector('.topbar').getBoundingClientRect();
        return Math.round(document.querySelector(a).getBoundingClientRect().top - bar.bottom);
      }, anker);

      /* ⚠️ TO UAFHÆNGIGE ELEMENTER: afsnittets top mod bjælkens
         bund. Et spørgsmål til koden om dens egen konstant ville
         bestå, også hvis bjælken var 200 px. */
      expect(m, 'afsnittet landede bag bjælken').toBeGreaterThanOrEqual(0);
      expect(m, 'afsnittet landede for langt nede').toBeLessThanOrEqual(26);
    });
  }
});
