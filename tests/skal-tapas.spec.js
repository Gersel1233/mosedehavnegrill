/* Tapasfadets kobling.

   Fadet er en anden slags bestilling: man vælger antal personer,
   ikke rækker. To ting er ejerens ord (23/8) — det skal kunne
   bestilles to dage i forvejen, og gæsten skal ringe om fadets
   indhold — og begge dele skal kunne ses i koden. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';

function data(medFad, medBobler) {
  const d = grunddata();
  // Forretningens eget varsel er KORT — fadets skal alligevel gælde
  d.indstillinger.bestilling_varsel_timer = 2;
  d.menu_kategorier.push({ id: 20, afdeling: 'mad', navn: 'Til selskabet', sortering: 30, aktiv: true });
  if (medFad !== false) {
    d.menu_varer.push({
      id: 20, kategori_id: 20, navn: 'Tapasfad, pr. person', beskrivelse: null,
      pris: medFad === 'uden-pris' ? null : 145,
      fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
    });
  }
  if (medBobler) {
    d.menu_varer.push({
      id: 21, kategori_id: 20, navn: 'Cava, flaske', beskrivelse: 'Tør og frisk.',
      pris: 295, fremhaevet: false, udsolgt: false, sortering: 2, aktiv: true,
    });
  }
  return d;
}

async function åbn(page, d) {
  await åbnSkal(page, '/m-tapas.html', { ur: FREDAG, data: d || data() });
}

test.describe('Tapasfadets kobling', () => {
  test('fadet kan først bestilles om to dage', async ({ page }) => {
    await åbn(page);
    const dage = await page.$$eval('#tdato option', (o) => o.map((e) => e.value));

    // Forretningens varsel er 2 timer, men fadet kræver to dage
    expect(dage[0]).toBe('2026-08-09');
    /* ⚠️ VARSELLINJEN FLYTTEDE 8/9, DEN FORSVANDT IKKE. Datofeltet
       står i fuld bredde nu (kundens ord: formularen var
       "asymetrisk"), og varslet er en `.hint` UNDER feltet med
       `data-tapas-varsel` — ikke et <span> inde i etiketten.
       Reglen er den samme og den vigtige: teksten skrives af
       REGLEN, så siden ikke kan love ét varsel og formularen
       holde et andet. Det er sket tre gange (catering 30/8,
       smørrebrød 31/8, tapas 1/9). */
    await expect(page.locator('[data-tapas-varsel]')).toContainText('mindst 2 dage');
  });

  test('forretningens længere varsel vinder', async ({ page }) => {
    /* Fadets "mindst" må aldrig kunne sætte varslet NED — så
       kunne en enkelt formular omgå det, ejeren har sat i admin,
       og køkkenet fik en bestilling, de ikke kan nå. */
    const d = data();
    d.indstillinger.bestilling_varsel_timer = 24 * 5;
    await åbn(page, d);

    const dage = await page.$$eval('#tdato option', (o) => o.map((e) => e.value));
    expect(dage[0]).toBe('2026-08-12');
  });

  test('prisen kommer fra menukortet, ikke fra designet', async ({ page }) => {
    await åbn(page);
    await page.locator('#tpers').fill('4');

    // Designet regnede med 199; menukortet siger 145
    await expect(page.locator('#tsum b')).toHaveText('580 kr.');
    await expect(page.locator('#tsum')).toContainText('4 × tapas à 145,-');
  });

  test('uden pris står der "Pris følger" — ikke et tal, vi har fundet på', async ({ page }) => {
    /* Ejerens liste kom uden ét eneste tal (23/8). Et beløb, vi
       selv finder på, er værre end ingen pris: gæsten regner
       med det. */
    await åbn(page, data('uden-pris'));
    await page.locator('#tpers').fill('4');

    await expect(page.locator('#tsum b')).toHaveText('Pris følger');
    await expect(page.locator('#tsum')).not.toContainText('199');
  });

  test('tilkøbet står kun, når varen findes i menukortet', async ({ page }) => {
    await åbn(page);
    await expect(page.locator('.addon')).toBeHidden();

    await åbn(page, data(true, true));
    await expect(page.locator('.addon')).toBeVisible();
    await expect(page.locator('.addon h4')).toHaveText('Cava, flaske');
  });

  test('bestillingen lander med fadet pr. person', async ({ page }) => {
    await åbn(page, data(true, true));

    await page.locator('#tpers').fill('6');
    await page.locator('.addon button[data-d="+"]').click();
    await page.locator('#tnavn').fill('Sara Poulsen');
    await page.locator('#ttlf').fill('28871343');
    await page.locator('#tdato').selectOption('2026-08-09');
    await page.locator('#bestil-tapas button.g.solid.blk').click();

    await expect(page.locator('#bestil-tapas h3')).toContainText('Tak, Sara');

    const b = (await gemteData(page)).bestillinger[0];
    expect(b.hent_dato).toBe('2026-08-09');
    expect(b.linjer).toEqual([
      { navn: 'Tapasfad, pr. person', antal: 6, pris: 145 },
      { navn: 'Cava, flaske', antal: 1, pris: 295 },
    ]);
    expect(b.antal).toBe(7);
  });

  test('uden fadet i menukortet kan der ikke bestilles', async ({ page }) => {
    /* Siden bliver — den sælger stadig fadet. Kun formularen
       ryger, og ring-kortet ligger inde i den, så nummeret skal
       findes i foden i stedet. Det er en yderlighed: så snart
       fadet står i menukortet, er formularen der. */
    await åbn(page, data(false));

    await expect(page.locator('#bestil-tapas')).toBeHidden();
    await expect(page.locator('footer a[href^="tel:"]').first()).toBeVisible();
  });

  test('spis her tilbydes kun, når forretningen har slået det til', async ({ page }) => {
    await åbn(page);
    let valg = await page.$$eval('#thow option', (o) => o.map((e) => e.textContent));
    expect(valg).toEqual(['To-go']);

    const d = data();
    d.indstillinger.spis_her = true;
    await åbn(page, d);
    valg = await page.$$eval('#thow option', (o) => o.map((e) => e.textContent));
    expect(valg).toEqual(['To-go', 'Spis her']);
  });

  test('ring-kortet om fadets indhold bliver stående', async ({ page }) => {
    // Ejerens ord: man skal kunne ringe om ændringer af fadet
    await åbn(page);
    await expect(page.locator('.callbox')).toContainText('Ring til os');
    await expect(page.locator('.callbox .tel')).toHaveAttribute('href', 'tel:+4528871343');
  });
});

/* ------------------------------------------------------------
   "DET FÅR I" ER EJERENS LISTE  (29/8)

   Punkterne var designets faste pladsholder, mens fadets
   beskrivelse allerede stod i menukortet — så det, ejeren skrev
   i admin, kom aldrig ud på tapassiden. Nu er listen fadets
   beskrivelse, "·"-adskilt, og designets liste er reserven.

   ⚠️ Fælden, der blev fundet ved at måle: tapas-filens find()
   søger i BESTILLINGSPANELET som standard, og listen står OVER
   panelet — med standard-roden fandtes den aldrig, og alt så
   rigtigt ud imens.
   ------------------------------------------------------------ */
test.describe('Det får I-listen', () => {

  test('fadets beskrivelse bliver til listens punkter', async ({ page }) => {
    const d = data();
    d.menu_varer.find((v) => /tapas/i.test(v.navn)).beskrivelse =
      '5 slags ost · Serranoskinke · Hjemmelavet havnebrød';
    await åbn(page, d);

    const punkter = page.locator('.getlist span');
    await expect(punkter).toHaveCount(3);
    await expect(punkter.nth(1)).toContainText('Serranoskinke');
    /* Hjertet er designets eget, klonet med — ikke en kopi i
       koden. Uden det ville listen skifte form med koblingen. */
    await expect(punkter.first().locator('svg')).toHaveCount(1);
  });

  test('uden en beskrivelse står designets egen liste', async ({ page }) => {
    await åbn(page);   // fadet i prøvedataene har ingen beskrivelse
    await expect(page.locator('.getlist span').first()).toContainText('5 forskellige oste');
  });
});

/* ============================================================
   ET HOP MÅ IKKE LANDE BAG TOPBJÆLKEN  (31/8)

   Kundens ord: *"tapas bestillings delen på telefon er elendigt
   ift layoutet — det skævt."*

   ⚠️ MÅLT PÅ EN IPHONE 13, og det var ikke layoutet: designets
   egen rullefunktion i havnegrillen.js trak en fast konstant på
   40 px fra, når man hopper til et afsnit. .topbar er FAST og
   115 px høj. Altså landede afsnittets øverste 75 px BAG
   bjælken — på tapassiden betød det, at panelets overskrift og
   hele den første række (Dag og Tidspunkt) var skjult, i det
   sekund man trykkede på knappen, der førte derhen.

   Det rammer ALLE ni designsider: "Reservér plads" på
   kalenderen, den flydende pille på forsiden, hvert punkt i
   skuffemenuen. Ét tal, ni sider.

   ⚠️ OG HØJDEN LÆSES AF BJÆLKEN, ikke skrevet som et nyt tal —
   ellers skrider de to fra hinanden, den dag bjælken bliver
   højere. Prøven her sammenligner to UAFHÆNGIGE elementer:
   panelets top mod bjælkens bund. Et spørgsmål til koden om dens
   egen konstant ville bestå, også hvis bjælken var 200 px.
   ============================================================ */
test.describe('Hoppet lander under bjælken, ikke bag den', () => {

  test.skip(({ isMobile }) => !isMobile, 'bjælken er telefonens');

  test('panelets overskrift er synlig, når man trykker Bestil tapas', async ({ page }) => {
    await åbn(page, data(true));

    /* ⚠️ MED ET FAD I MENUEN. Uden det skjuler panelet sig med
       vilje — og et skjult element har hverken offsetTop eller en
       kasse, så målingen ville sige 0 og se ud som en fejl. Den
       fælde kostede en runde her. */
    await expect(page.locator('#bestil-tapas')).toBeVisible();

    await page.locator('a[href="#bestil-tapas"]').first().click();
    await page.waitForTimeout(900);

    const m = await page.evaluate(() => {
      const p = document.getElementById('bestil-tapas').getBoundingClientRect();
      const b = document.querySelector('.topbar').getBoundingClientRect();
      const h = document.querySelector('#bestil-tapas h2, #bestil-tapas h3');
      return { panelTop: Math.round(p.top), bjaelkeBund: Math.round(b.bottom),
        titelTop: h ? Math.round(h.getBoundingClientRect().top) : null };
    });

    expect(m.panelTop, 'panelets top ligger bag bjælken')
      .toBeGreaterThanOrEqual(m.bjaelkeBund);
    /* Og overskriften — den er dét, man kigger efter, når man er
       landet et sted. */
    expect(m.titelTop, 'overskriften er skjult bag bjælken')
      .toBeGreaterThanOrEqual(m.bjaelkeBund);
    // Men den skal heller ikke stå langt nede på skærmen.
    expect(m.panelTop - m.bjaelkeBund).toBeLessThan(80);
  });
});

/* ============================================================
   ⚠️ SIDEN LOVEDE ET VARSEL, DEN IKKE HOLDT  (1/9)
   ------------------------------------------------------------
   Fundet under en gennemgang med ti fiktive kunder: Kasper vil
   bestille et fad til fredag. Manchetten øverst sagde "Nyhed ·
   bestilles senest dagen før", og faktalinjen sagde "Skal
   bestilles senest dagen før" — mens fadets regel er 48 TIMER.
   Han læser ét døgn, vælger i morgen, og dagvælgeren tilbyder
   den ikke.

   Tredje gang samme fejl: cateringens faktakort 30/8 og
   smørrebrødets hero 31/8. Rettelsen er den samme —
   [data-varsel] fyldes af reglen, designets tekst er reserven.
   ============================================================ */
test.describe('Varslet på siden er reglens', () => {
  test('begge steder siger to dage, ikke "dagen før"', async ({ page }) => {
    await åbn(page);
    const el = page.locator('[data-varsel]');
    await expect(el).toHaveCount(2);
    for (const t of await el.allInnerTexts()) {
      expect(t.toLowerCase(), 'siden lover et varsel, formularen ikke holder')
        .toContain('2 dage');
    }
  });

  /* Og ejerens eget tal slår husets — han sætter det i admin. */
  test('ejerens eget varsel skrives ud', async ({ page }) => {
    const d = data();
    d.indstillinger.tapas_varsel_timer = 96;
    await åbn(page, d);
    for (const t of await page.locator('[data-varsel]').allInnerTexts()) {
      expect(t.toLowerCase()).toContain('4 dage');
    }
  });
});

/* ============================================================
   FORMULAREN ER SYMMETRISK  (8/9)
   ------------------------------------------------------------
   Kundens ord med et skud af sin telefon: *"bestillingssiden på
   tapas [er] dårlig og asymmetrisk — fix."*

   MÅLT på hans skud, og der var TO årsager i den samme række:
   etiketten "Dato (mindst 2 dage før)" brækkede til to linjer,
   mens naboen "Tidspunkt" fyldte én — så de to felter stod i
   hver sin højde. Og datoen blev klippet: "Torsdag d. 10. s".
   ============================================================ */
test.describe('Formularen står lige', () => {

  /* ⚠️ PRØVEN SAMMENLIGNER DE TO FELTER I EN RÆKKE MED HINANDEN,
     ikke med et tal, jeg har skrevet af. Det er PARRET, der er
     forkert, når det ene felt står lavere end det andet — og et
     spørgsmål til ét felt om dens egen højde ville bestå. */
  test('to felter i samme række starter i samme højde', async ({ page }) => {
    await åbn(page);
    const raekker = await page.$$eval('#bestil-tapas .field.two-col', (rk) =>
      rk.map((r) => [...r.children].map((c) => {
        const felt = c.querySelector('.inp');
        const et = c.querySelector('label');
        return {
          navn: et ? et.textContent.trim() : '?',
          top: felt ? Math.round(felt.getBoundingClientRect().top) : null,
        };
      })));
    expect(raekker.length, 'der er ingen rækker af to at måle')
      .toBeGreaterThan(0);
    for (const r of raekker) {
      const toppe = r.map((x) => x.top).filter((t) => t !== null);
      expect(new Set(toppe).size,
        'felterne i rækken står i hver sin højde: '
        + r.map((x) => x.navn + ' @' + x.top).join(' | ')).toBe(1);
    }
  });

  /* ⚠️ OG DATOEN MÅ IKKE BLIVE KLIPPET. Tallet kommer udefra:
     tekstens egen bredde, målt med et Range, mod feltets kasse.
     Et spørgsmål om antallet af tegn ville skride, den dag en
     måned har et længere navn. */
  test('datoen kan stå helt i sit felt', async ({ page }) => {
    await åbn(page);
    const m = await page.evaluate(() => {
      const sel = document.getElementById('tdato');
      const t = sel.options[sel.selectedIndex].textContent;
      const maal = document.createElement('span');
      const s = getComputedStyle(sel);
      maal.style.cssText = 'position:fixed;visibility:hidden;white-space:nowrap;'
        + 'font:' + s.fontStyle + ' ' + s.fontWeight + ' ' + s.fontSize
        + '/' + s.lineHeight + ' ' + s.fontFamily
        + ';letter-spacing:' + s.letterSpacing;
      maal.textContent = t;
      document.body.appendChild(maal);
      const tekst = maal.getBoundingClientRect().width;
      maal.remove();
      /* Feltets INDVENDIGE bredde: kassen minus polstring og
         plads til pilen. */
      const inde = sel.getBoundingClientRect().width
        - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
      return { t, tekst: Math.round(tekst), inde: Math.round(inde) };
    });
    expect(m.tekst, 'datoen «' + m.t + '» er ' + m.tekst
      + ' px bred i et felt med ' + m.inde + ' px indvendigt')
      .toBeLessThanOrEqual(m.inde);
  });

  /* ⚠️ ET NUL I ET TOMT FELT LÆSES SOM ET SVAR. Hans skud viste
     "Antal personer 0" — og nul personer er ikke en bestilling. */
  test('antal personer står tomt med en pladsholder', async ({ page }) => {
    await åbn(page);
    await expect(page.locator('#tpers')).toHaveValue('');
    expect(await page.locator('#tpers').getAttribute('placeholder'),
      'feltet har ingen pladsholder, så det står helt blankt').toBeTruthy();
  });

  /* Varslet skrives stadig af REGLEN — den flyttede bare ud af
     etiketten og ned under feltet. */
  test('varslet står under datofeltet og kommer fra reglen',
    async ({ page }) => {
    const d = data();
    d.indstillinger.tapas_varsel_timer = 96;      // fire dage
    await åbn(page, d);
    const linje = page.locator('[data-tapas-varsel]');
    await expect(linje).toHaveCount(1);
    await expect(linje).toContainText('4 dage');
    /* Og den står UNDER feltet, ikke inde i etiketten — det var
       det, der brækkede rækken. */
    const y = (sel) => page.locator(sel).evaluate(
      (el) => el.getBoundingClientRect().top);
    expect(await y('[data-tapas-varsel]')).toBeGreaterThan(await y('#tdato'));
  });
});

/* ============================================================
   HEROENS PRIS ER MENUKORTETS  (9/9)
   ------------------------------------------------------------
   ⚠️ DEN STOD MED DESIGNETS TAL, OG DET VAR I LUFTEN.
   Målt i produktionen: fadet koster 179, og heroen sagde 199 kr.
   pr. person, mens sumboksen tyve linjer nede regnede med 179.
   Forsiden fylder sin egen, så gæsten læste 179, trykkede "Se og
   bestil tapas" og mødte 199 på den side, hun landede på.

   ⚠️ TALLET KOMMER UDEFRA: fikstruret siger 145 og 295, altså
   noget HELT andet end designets 199/548/150. Et fikstur med
   designets egne tal ville bestå, også hvis koden aldrig rørte
   kassen — det er præcis den fælde, tapassiden faldt i 29/8.
   ============================================================ */
test.describe('Heroens pris er menukortets', () => {
  test('prisen pr. person er ejerens, ikke designets', async ({ page }) => {
    await åbn(page, data(true, true));
    await expect(page.locator('[data-tapas-pris]')).toHaveText('145,-');
  });

  test('pakkeprisen regnes af kortet — to fade og en flaske', async ({ page }) => {
    await åbn(page, data(true, true));
    /* 2 x 145 + 295 = 585. Designet skrev 548, og det tal svarer
       til 2 x 199 + 150 — altså designets egne priser. */
    await expect(page.locator('[data-tapas-par]')).toHaveText('585,-');
    await expect(page.locator('[data-tapas-par]').locator('..'))
      .toContainText('Cava, flaske');
  });

  /* ⚠️ EN PAKKE, VI IKKE KAN REGNE, ER ET LØFTE, INGEN HAR GIVET.
     Uden en flaske på kortet findes kassen ikke — vi finder ikke
     på et beløb på forretningens vegne. Modstykket er prøven
     ovenfor: uden den ville en regel, der ALTID skjulte kassen,
     bestå den her. */
  test('uden en flaske på kortet findes pakkeprisen ikke', async ({ page }) => {
    await åbn(page, data(true, false));
    await expect(page.locator('[data-tapas-par]')).toBeHidden();
    await expect(page.locator('[data-tapas-pris]')).toBeVisible();
  });

  /* ⚠️ FLASKEN SLÅR GLASSET. Ejerens kort har begge, og listen
     kommer sorteret — så glasset vandt, mens designets egen tekst
     hele vejen siger "en flaske Cava". Målt i produktionen solgte
     tilkøbet ET GLAS til et fad, to mennesker deles om. */
  test('tilkøbet er flasken, ikke glasset', async ({ page }) => {
    /* ⚠️ GLASSET SKAL LIGGE FOERST I LISTEN — ellers maaler proeven
       ingenting. Foerste udgave brugte push(), saa flasken laa
       forrest alligevel, og falsifikationen BESTOD: uden reglen
       vandt flasken af sig selv. I produktionen kommer varerne
       sorteret paa `sortering`, og ejerens glas (5) staar FOER hans
       flaske (6) — det er dén raekkefoelge, listen skal have her. */
    const d = data(true, true);
    d.menu_varer.unshift({
      id: 22, kategori_id: 20, navn: 'Cava, glas', beskrivelse: null,
      pris: 65, fremhaevet: false, udsolgt: false, sortering: 0, aktiv: true,
    });
    await åbn(page, d);
    await expect(page.locator('.addon h4')).toHaveText('Cava, flaske');
  });
});


/* ============================================================
   BILLEDERNE AF FADET SKIFTER  (11/9)
   ------------------------------------------------------------
   Kundens ord med et skud af forlæggets tapasside: billederne skal
   *"skifte mellem hinanden"*. Puljen er ejerens EGNE fotos fra
   admin (Tapasfadet + billede 2-5) — kundens beslutning samme dag,
   efter at to af tre genererede billeder viste ting, fadet ikke er.

   Fotoene her er data-URI'er i hver sin farve, så prøven kan se,
   HVILKET der står fremme, uden et netværk.
   ============================================================ */
const FARVER = ['#c8102e', '#1f7a3a', '#1f4fa8', '#d9a400', '#0f8c8c'];
const PULJE = ['foto_tapas', 'foto_tapas_2', 'foto_tapas_3', 'foto_tapas_4', 'foto_tapas_5'];
function foto(farve) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="${farve}"/></svg>`);
}
function medFotos(antal, noegler = PULJE) {
  const d = data();
  noegler.slice(0, antal).forEach((n, i) => { d.indstillinger[n] = foto(FARVER[i]); });
  return d;
}
/* Hvilket billede står fremme? Indekset for det med .vis — og der
   må kun være ét: to fremme på én gang er et blink. */
const fremme = (page) => page.evaluate(() => {
  const alle = [...document.querySelectorAll('.tshot .foto-skift img')];
  const vis = alle.filter((f) => f.classList.contains('vis'));
  return vis.length === 1 ? alle.indexOf(vis[0]) : -vis.length - 1;
});

test.describe('Billederne af fadet skifter', () => {

  /* ⚠️ SIDENS EGNE TRE ER GENEREREDE — kundens udtrykkelige
     beslutning 11/9 (se CLAUDE.md). Uden et foto i admin kører
     galleriet på dem; fladen er kun tilbage, hvis filerne forsvinder
     fra opmærkningen. */
  test('uden admin-fotos kører galleriet på sidens egne tre', async ({ page }) => {
    await åbn(page, data());
    const fotos = page.locator('.tshot .foto-skift img');
    await expect(fotos).toHaveCount(3);
    await expect(fotos.first()).toHaveAttribute('src', /billeder\/tapas-1\.jpg/);
    await expect(page.locator('.tshot .foto-skift')).toHaveAttribute('data-reserve', '1');
    /* Og de er FILER, der findes: et billede, der aldrig kom, har
       bredden nul — `complete` alene er sandt for et opgivet. */
    await expect.poll(() => fotos.first().evaluate((f) => f.naturalWidth)).toBeGreaterThan(0);
  });

  /* ⚠️ ADMIN SLÅR REPOET — og de blandes ikke. Lægger ejeren rigtige
     fotos op, må de genererede ikke skifte med dem. */
  test('ejerens egne fotos slår sidens — de blandes ikke', async ({ page }) => {
    await åbn(page, medFotos(2));
    await expect(page.locator('.tshot .foto-skift img')).toHaveCount(2);
    await expect(page.locator('.tshot img[src*="billeder/tapas-"]')).toHaveCount(0);
    await expect(page.locator('.tshot .foto-skift')).not.toHaveAttribute('data-reserve', '1');
  });

  test('ét foto står stille — uden prikker', async ({ page }) => {
    await åbn(page, medFotos(1));
    await expect(page.locator('.tshot img.foto-fyldt')).toHaveCount(1);
    await expect(page.locator('.tshot .foto-skift')).toHaveCount(0);
    await expect(page.locator('.skift-prikker button')).toHaveCount(0);
  });

  test('flere fotos blænder over i hinanden — ét ad gangen', async ({ page }) => {
    await åbn(page, medFotos(3));
    await expect(page.locator('.tshot .foto-skift img')).toHaveCount(3);
    expect(await fremme(page)).toBe(0);
    /* Vent på TILSTANDEN, ikke på et stopur: det andet billede er
       fremme — og kun det. */
    await expect.poll(() => fremme(page), { timeout: 9000 }).toBe(1);
  });

  /* ⚠️ INGEN PRIKKER (11/9) — kundens ord: *"der er prikker hvor man
     kan se den skifter, fjern dem"*. Billederne skifter af sig selv. */
  test('der er ingen prikker — billederne skifter af sig selv', async ({ page }) => {
    await åbn(page, medFotos(3));
    await expect(page.locator('.tshot .foto-skift img')).toHaveCount(3);
    await expect(page.locator('.tshot button, .skift-prikker')).toHaveCount(0);
  });

  /* ⚠️ HER ER ET STOPUR RIGTIGT. Reglen er, at der IKKE sker noget,
     og et fravær kan ikke ventes frem. Ventetiden er længere end
     rytmen (4,6 s), så en regel, der skiftede alligevel, ville
     være nået at skifte. */
  test('reduceret bevægelse: intet skifter af sig selv', async ({ browser }) => {
    const kon = await browser.newContext({ reducedMotion: 'reduce' });
    const s = await kon.newPage();
    await åbnSkal(s, '/m-tapas.html', { ur: FREDAG, data: medFotos(2) });
    await expect(s.locator('.tshot .foto-skift img')).toHaveCount(2);
    await s.waitForTimeout(6000);
    expect(await fremme(s)).toBe(0);
    await kon.close();
  });

  /* ⚠️ RAMMEN HAR ET FORHOLD, IKKE EN HØJDE. Den var 250 px på alle
     skærme — målt 1400×250 på en computer, en stribe. Og den må
     ikke skifte højde, når billedet skifter: så hopper alt under
     den. To uafhængige tal: rammens mål før og efter et skift. */
  test('rammen holder sit forhold — også når billedet skifter', async ({ page }, info) => {
    await åbn(page, medFotos(2));
    const ramme = page.locator('.tshot');
    await expect(page.locator('.tshot .foto-skift img')).toHaveCount(2);
    const før = await ramme.boundingBox();
    /* ⚠️ UDEN FORHOLD FALDER RAMMEN SAMMEN TIL NUL. Galleriets
       billeder ligger absolut og giver ingen højde; det er
       aspect-ratio, der holder rammen oppe. MÅLT med forholdet
       fjernet: 0 px, og prøven døde på klikket med en timeout,
       før den nåede sin egen måling. Vagten siger det med ord. */
    expect(før.height, 'rammen er faldet sammen — galleriet har ingen højde')
      .toBeGreaterThan(100);
    /* Uden prikker venter vi på det automatiske skift. */
    await expect.poll(() => fremme(page), { timeout: 9000 }).toBe(1);
    const efter = await ramme.boundingBox();
    expect(Math.abs(efter.height - før.height)).toBeLessThan(1);

    const forhold = før.width / før.height;
    if (info.project.name === 'computer') {
      expect(forhold).toBeCloseTo(16 / 9, 1);
      expect(før.width).toBeLessThanOrEqual(1100);
    } else {
      expect(forhold).toBeCloseTo(4 / 3, 1);
    }
  });

  /* ⚠️ BILLEDE 2-5 ER KUN TAPASSIDENS. Forsiden viser det FØRSTE,
     så gæsten ser det samme fad på vejen fra forsiden til
     bestillingen. Et foto i billede 2 alene må altså IKKE komme på
     forsiden — men det SKAL stå på tapassiden. */
  test('billede 2-5 kommer ikke på forsiden — men på tapassiden', async ({ page }) => {
    const d = medFotos(1, ['foto_tapas_2']);
    const url = d.indstillinger.foto_tapas_2;

    await åbnSkal(page, '/', { ur: FREDAG, data: d });
    /* Vagt: forsidens tapasplads ER fyldt — med sidens FØRSTE
       billede, fordi foto_tapas er tom. Ellers måler vi ingenting. */
    await expect(page.locator('img[src*="billeder/tapas-1.jpg"]')).toHaveCount(1);
    await expect(page.locator(`img[src="${url}"]`)).toHaveCount(0);

    await åbn(page, d);
    await expect(page.locator(`.tshot img[src="${url}"]`)).toHaveCount(1);
  });
});

