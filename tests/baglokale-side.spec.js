/* BAGLOKALETS SIDE  (14/9)

   Kundens ord: billederne af lokalet skal skifte mellem hinanden
   ("self brug filer, hvis ik så med den inspiration af filer du har
   i forvejen"), og "det der med det får i er elendigt — gør det
   bedre eller slet det".

   Tre ting måles, og de er tre forskellige slags:

   1) RUMMET KAN SES. Rammen var en stribe på 180 px (målt 350×180 på
      en telefon). Den har et fotoformat nu, og den skifter mellem
      rummets billeder — med ejerens eget foto i puljen.
   2) JULEFESTEN STÅR IKKE FØRST. Det første billede er det, gæsten
      ser, og "Glædelig jul" i september siger, at det er et
      julelokale.
   3) "DET FÅR I" GENTAGER IKKE FAKTA. Kortet sagde 40 siddende,
      fadøl, drinks og isbar en gang til; det, der kun stod dér, står
      i faktalinjen nu, og kortet er væk. */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { åbnSkal, grunddata } = require('./hjaelp');

const puljen = () => {
  const m = /id="baglokale-foto"[^>]*data-filer="([^"]+)"/.exec(fs.readFileSync('h-baglokale.html', 'utf8'));
  return m ? m[1].trim().split(/\s+/) : [];
};

test.describe('Baglokalets side', () => {

  test('rummet står i et fotoformat og skifter mellem rummets billeder', async ({ page }) => {
    const filer = puljen();
    expect(filer.length, 'pladsen har ingen pulje — den skifter ikke').toBeGreaterThan(1);
    expect(filer.join(' '), 'ejerens eget foto af rummet er ude af puljen')
      .toContain('stemning-baglokale');

    await åbnSkal(page, '/h-baglokale.html', { data: grunddata() });
    const ramme = page.locator('.evhero > .foto-skift');
    await expect(ramme).toHaveCount(1);
    await expect(ramme.locator('img')).toHaveCount(filer.length);

    /* ⚠️ FORHOLDET, IKKE ET TAL I PIXELS: rammen skal være et foto,
       ikke en brevsprække, på hver bredde. 4:3 er .75, 16:10 er
       .625 — stribens 350×180 var .51. */
    const r = await ramme.evaluate((e) => { const b = e.getBoundingClientRect(); return { b: b.width, h: b.height }; });
    expect(r.h / r.b, `rammen er ${Math.round(r.b)}×${Math.round(r.h)} — en stribe`).toBeGreaterThan(0.6);
  });

  test('julefesten står ikke først', async ({ page }) => {
    await åbnSkal(page, '/h-baglokale.html', { data: grunddata() });
    const forrest = await page.locator('.evhero .foto-skift img.vis').getAttribute('src');
    expect(forrest, 'det første billede, gæsten ser, er julefesten').not.toContain('stemning-baglokale');
    expect(puljen()[0]).toBe(forrest);
  });

  test('ejerens foto fra admin afløser hele puljen', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger, { foto_baglokale: 'https://eksempel.dk/lokale.jpg' });
    await åbnSkal(page, '/h-baglokale.html', { data: d });
    await expect(page.locator('.evhero img.foto-fyldt')).toHaveAttribute('src', 'https://eksempel.dk/lokale.jpg');
    await expect(page.locator('.evhero .foto-skift')).toHaveCount(0);
  });

  test('"Det får I" gentager ikke fakta — og det, kun det sagde, står der stadig', async ({ page }) => {
    await åbnSkal(page, '/h-baglokale.html', { data: grunddata() });
    await expect(page.locator('.getlist')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Det får I' })).toHaveCount(0);

    const fakta = page.locator('.facts');
    await expect(fakta).toHaveCount(1);
    /* Det, der kun stod i kortet, må ikke ryge med det. */
    await expect(fakta).toContainText('jeres alene');
    await expect(fakta).toContainText('rydder op');
    await expect(fakta).toContainText('smørrebrød');
    /* Og pladstallet står ÉN gang i faktalinjen, ikke to. */
    const tekst = await fakta.innerText();
    expect(tekst.match(/siddende/g) || [], 'pladstallet står to gange i fakta').toHaveLength(1);
  });
});
