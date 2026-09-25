/* KORTBOGEN — DE TRYKTE MENUKORT, MAN BLADRER I  (25/9 2026)

   Kundens ord: *"selve menukortene ligger inde på se menukort,
   hvor man kan bladre igennem menukortene og stadig klikke ind på
   nogle af tingene."*

   ⚠️ KORTET SÆLGER, LISTEN ER SANDHEDEN. Billedet er et foto af
   det trykte kort; under det står databasens egen liste. Prøverne
   her måler netop den kobling — at listen FØLGER kortet, og at
   ingen kategori havner to steder.

   Fiksturets kategorier er grunddatas fire: Smørrebrød (kort 03),
   Softice og vafler (kort 05), Øl (kort 07) og "Vælg fyld til
   smørrebrødet", som intet trykt kort viser. Tallene i prøverne
   kommer derfra og ikke fra siden selv. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

const UR = '2026-08-07T11:00:00Z';

async function åbnKortet(page, data) {
  await åbnSkal(page, '/m-menukort.html', { ur: UR, data: data || grunddata() });
  await page.waitForSelector('#kortbog .kortblad');
}

const kortNavn = (page) => page.locator('.kortbog-navn').textContent();

test.describe('Kortbogen', () => {

  test('man bladrer i kortene — og listen under følger med', async ({ page }) => {
    await åbnKortet(page);

    /* Syv kort: 01-07. 08 og 09 er personalets bestillingslister
       og 10 er en flyer — de må ikke stå i gæstens menukort. */
    await expect(page.locator('#kortbog .kortblad')).toHaveCount(7);

    await page.locator('.kortprik').nth(2).click();
    expect(await kortNavn(page)).toBe('Smørrebrød');
    await expect(page.locator('#kortbog-liste .panel[data-kategori="Smørrebrød"]'))
      .toHaveCount(1);

    await page.locator('.kortprik').nth(4).click();
    expect(await kortNavn(page)).toBe('Is & sødt');
    /* Modstykket: smørrebrødet må IKKE blive stående under
       is-kortet. En liste, der ikke skiftede med, ville bestå
       prøven ovenfor og vise det forkerte kort hele vejen. */
    await expect(page.locator('#kortbog-liste .panel[data-kategori="Smørrebrød"]'))
      .toHaveCount(0);
    await expect(page.locator('#kortbog-liste .panel[data-kategori="Softice og vafler"]'))
      .toHaveCount(1);
  });

  /* ⚠️ TO LISTER OVER DET SAMME SORTIMENT ER HUSETS ÆLDSTE FEJL
     (fyldvælgeren 30/8, de 24 håndmadder 1/9). Da kategorierne
     flyttede op under kortene, kunne de let være blevet tegnet
     BÅDE der og i listen nedenfor. Prøven tæller på hele siden. */
  test('en kategori står ét sted — ikke både under kortet og i listen', async ({ page }) => {
    await åbnKortet(page);
    /* ⚠️ KUN DET AKTUELLE KORT TEGNER SIN LISTE — syv lister på én
       gang ville være hele menuen to gange på den samme side. Så
       prøven bladrer hen til hvert kort og tæller DÉR. */
    for (const [nr, kat] of [[2, 'Smørrebrød'], [4, 'Softice og vafler'], [6, 'Øl']]) {
      await page.locator('.kortprik').nth(nr).click();
      await expect(page.locator(`.panel[data-kategori="${kat}"]`),
        kat + ' står to steder på siden').toHaveCount(1);
      await expect(page.locator(`#mk-kat .panel[data-kategori="${kat}"]`),
        kat + ' blev tegnet i listen nedenfor OGSÅ').toHaveCount(0);
    }
    /* Og den kategori, INTET kort viser, skal stadig stå i listen
       nedenfor — ellers forsvandt den bare. */
    await expect(page.locator('#mk-kat .panel[data-kategori="Vælg fyld til smørrebrødet"]'))
      .toHaveCount(1);
  });

  /* ⚠️ BÅNDET SKAL BLIVE VED AT DÆKKE HELE KORTET. Da halvdelen af
     kategorierne flyttede op i bogen, læste "Hop til kategori"
     stadig kun #mk-kat — og en gæst, der leder efter smørrebrødet,
     ville ikke finde chippen. */
  test('hop-båndet kender også de kategorier, der ligger under et kort', async ({ page }) => {
    await åbnKortet(page);
    const chips = await page.locator('#mk-hop button').evaluateAll(
      (e) => e.map((x) => x.getAttribute('data-hop')));
    /* Fiksturets fire kategorier — tallet kommer udefra. */
    expect(chips.sort(), 'en kategori mangler i båndet').toEqual(
      ['Smørrebrød', 'Softice og vafler', 'Vælg fyld til smørrebrødet', 'Øl'].sort());

    // Og chippen for et kort-kategori bladrer bogen derhen
    await page.locator('#mk-hop button[data-hop="Øl"]').click();
    expect(await kortNavn(page)).toBe('Øl, vin & bar');
  });

  /* ⚠️ HÅNDMADKORTET ER TRYKT MED 27, DATABASEN SIGER 24. Mikkels
     afgørelse 25/9: 24 gælder, kortet skal rettes. Indtil da står
     de to tal over hinanden på skærmen, og noten er det eneste,
     der fortæller en travl gæst hvilket der gælder. */
  test('håndmadskortet siger, at prisen i listen gælder', async ({ page }) => {
    await åbnKortet(page);
    await page.locator('.kortprik').nth(3).click();
    expect(await kortNavn(page)).toBe('Håndmadder');
    await expect(page.locator('.kortbog-note')).toContainText('27');
    await expect(page.locator('.kortbog-note')).toContainText('listen herunder');

    /* Modstykket: de andre kort er enige med databasen og må IKKE
       bære en note. En note på hvert kort er ingen advarsel. */
    await page.locator('.kortprik').nth(2).click();
    await expect(page.locator('.kortbog-note')).toHaveCount(0);
  });

  /* ⚠️ MÅLT: et A4 i en telefonbredde på 390 px gør prislinjen
     under 6 px høj. Kortet kan ses og ikke læses — derfor luppen.
     Tallet kommer udefra: skærmens egen bredde. */
  test('et tryk åbner kortet i en bredde, man kan læse', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobil', 'målet er telefonens');
    await åbnKortet(page);
    await expect(page.locator('#kortlup')).toHaveCount(0);

    await page.locator('.kortblad.er-fremme').click();
    await expect(page.locator('#kortlup')).toBeVisible();

    const bredde = await page.locator('#kortlup img').evaluate(
      (e) => e.getBoundingClientRect().width);
    const skaerm = await page.evaluate(() => window.innerWidth);
    expect(skaerm, 'fiksturet er ikke en telefon').toBeLessThan(500);
    expect(bredde, 'luppen viser kortet i skærmens bredde — så er det ikke en lup')
      .toBeGreaterThan(skaerm * 1.5);

    await page.locator('.kortlup-luk').click();
    await expect(page.locator('#kortlup')).toBeHidden();
  });

  /* ⚠️ ET TRÆK SLUTTER MED ET CLICK. Uden et flag, der overlever
     klikket, ville hver eneste bladring ende i luppen — `laast`
     nulstilles på pointerup, ALTSÅ før click. */
  test('et træk bladrer og åbner ikke kortet', async ({ page }) => {
    await åbnKortet(page);
    const foer = await kortNavn(page);

    /* ⚠️ RUL DEN IND FØRST. boundingBox() giver koordinater i
       SKÆRMBILLEDET, og bogen ligger langt nede på siden: uden
       det her lander musen uden for vinduet, og ikke én eneste
       pointer-hændelse når bladet. Målt — prøven "bestod" ved at
       måle ingenting. */
    await page.locator('#kortbog').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const kasse = await page.locator('.kortbog-blade').boundingBox();
    const y = kasse.y + kasse.height / 2;
    await page.mouse.move(kasse.x + kasse.width * 0.8, y);
    await page.mouse.down();
    await page.mouse.move(kasse.x + kasse.width * 0.5, y, { steps: 8 });
    await page.mouse.move(kasse.x + kasse.width * 0.2, y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(250);

    expect(await kortNavn(page), 'trækket bladrede ikke').not.toBe(foer);
    await expect(page.locator('#kortlup'),
      'trækket åbnede luppen — klikket blev ikke spist').toHaveCount(0);
  });

  /* ⚠️ EN REGEL MED HALVT SCOPE. Den mørke flade på et fotokort
     stod som `.mk-kat .panel.mk-foto-kort`, mens de tolv regler,
     der gør teksten HVID, stod uden scope. Under kortbogen gav det
     hvid tekst på creme — MÅLT til rgb(255,255,255) på en flade,
     der aldrig blev mørk. Prøven læser den BEREGNEDE stil. */
  test('et fotokort er lige så mørkt under kortbogen som i listen', async ({ page }) => {
    const d = grunddata();
    /* Fotokortet tændes af kategorien "Smørrebrød", som har et
       billede i fotolisten. Sammenligningen er med det samme
       panel-look i listen nedenfor — tallet kommer udefra. */
    await åbnKortet(page, d);
    await page.locator('.kortprik').nth(2).click();
    await page.waitForTimeout(200);

    const foto = page.locator('#kortbog-liste .panel.mk-foto-kort').first();
    if (!(await foto.count())) test.skip(true, 'fiksturet har intet fotokort');

    const maal = await foto.evaluate((e) => {
      const c = getComputedStyle(e);
      const h = getComputedStyle(e.querySelector('h3'));
      function lys(s) {
        const m = String(s).match(/\d+(\.\d+)?/g).map(Number);
        return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
      }
      return { flade: lys(c.backgroundColor), tekst: lys(h.color) };
    });
    /* Hvid tekst kræver en mørk flade. 128 er midten af skalaen og
       kommer fra farverummet, ikke fra elementet. */
    expect(maal.tekst, 'teksten er ikke den hvide, reglen sætter').toBeGreaterThan(200);
    expect(maal.flade, 'hvid tekst på en lys flade — kortet er ulæseligt')
      .toBeLessThan(128);
  });
});
