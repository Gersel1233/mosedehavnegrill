/* ============================================================
   ALLERGIEN HAR SIT EGET FELT — OG SIT EGET JA
   ------------------------------------------------------------
   Kundens ord (10/9): *"vi skal have de tre, der man SKAL have
   for at måtte modtage mail og telefonnummer og navn."*

   ⚠️ MÅLT FØR: SEKS formularer bad om allergier i en pladsholder
   ("Fx allergier eller særlige ønsker"), og ÉN havde samtykket —
   den ved bordet. Vi inviterede altså til en helbredsoplysning
   fem steder uden at spørge om lov, og køkkenet skulle finde den
   midt i en sætning.

   En allergi er en oplysning efter artikel 9, og dér er "vi har
   en aftale" ikke hjemmel nok: stk. 2, litra a kræver et
   UDTRYKKELIGT samtykke.

   ⚠️ OG NAVN, TELEFON OG MAIL ER IKKE HERINDE. De hviler på
   artikel 6, stk. 1, litra b, og et flueben dér ville love
   gæsten, at hun kan trække nummeret tilbage og stadig få sin
   mad. Se `tests/jura-ved-send.spec.js`.

   ⚠️ REGLEN BOR ÉT STED: `Butik.allergiMangler` +
   `Butik.medAllergi`. Prøven måler den gennem SKÆRMEN og ikke
   ved at kalde den — et spørgsmål til funktionen ville bestå,
   også hvis ingen formular spurgte den.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';
const ROD = path.resolve(__dirname, '..');

function data() {
  const d = grunddata();
  d.indstillinger.bestilling_varsel_timer = 2;
  d.indstillinger.bestilbare_kategorier = [1, 9];
  return d;
}

async function åbnForsiden(page) {
  await åbnSkal(page, '/index.html', { ur: FREDAG, data: data() });
}

async function laegIKurven(page) {
  await page.locator('[data-kategori="Smørrebrød"]').click();
  await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
}

async function udfyld(page) {
  await page.locator('#navn').fill('Sara Poulsen');
  await page.locator('#tlf').fill('28871343');
  await page.locator('#tid').selectOption({ index: 1 });
}

test.describe('Allergien har sit eget felt', () => {

  /* ⚠️ PLADSHOLDEREN MÅ IKKE INVITERE TIL DET LÆNGERE. Så længe
     beskedfeltet siger "Fx allergier …", beder vi om en
     helbredsoplysning uden et sted at sige ja — uanset hvad der
     ellers står på siden. Læses af MAPPEN, så en ny formular
     ikke kan slippe forbi. */
  test('ingen formular inviterer til allergier i et beskedfelt', () => {
    const filer = fs.readdirSync(ROD).filter((f) => f.endsWith('.html'))
      .filter((f) => !/^google[a-z0-9]+\.html$/.test(f));
    const synder = [];
    filer.forEach((f) => {
      const s = fs.readFileSync(path.join(ROD, f), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
      /* Kun PLADSHOLDERE — en overskrift eller en etiket, der
         hedder "Allergi", er netop det rigtige. */
      const m = s.match(/placeholder="[^"]*allergi[^"]*"/gi) || [];
      /* ⚠️ TO UNDTAGELSER, HVER MED SIN GRUND — en liste uden
         grunde vokser, til prøven måler ingenting.

         · `h-catering.html` sender via gæstens EGET mailprogram
           (4/9). Dér kan der ikke sættes et flueben, og vi gemmer
           ingenting, før hun selv trykker send i sin mail.
         · `admin.html` er personalesiden. Feltet er notefeltet på
           den manuelle booking, og den, der taster, er PERSONALET
           — oplysningen er allerede givet i telefonen. Gæsten har
           ikke en skærm at samtykke på dér. Siden er `noindex` og
           bag et login. */
      const undtaget = f === 'h-catering.html' || f === 'admin.html';
      if (m.length && !undtaget) synder.push(f + ': ' + m[0]);
    });
    expect(synder, 'beskedfelter, der beder om allergier').toEqual([]);
  });

  test('fluebenet findes kun, når der ER skrevet en allergi', async ({ page }) => {
    await åbnForsiden(page);
    const linje = page.locator('#allergi-samtykke-linje');
    await expect(linje).toBeHidden();

    await page.locator('#allergi').fill('nødder');
    await expect(linje).toBeVisible();

    /* ⚠️ OG HAKKET RYDDES, NÅR FELTET TØMMES. Ellers står der et
       ja til en allergi, gæsten har slettet. */
    await page.locator('#allergi-samtykke').check();
    await page.locator('#allergi').fill('');
    await expect(linje).toBeHidden();
    expect(await page.locator('#allergi-samtykke').isChecked()).toBe(false);
  });

  test('en allergi uden flueben bliver ikke sendt', async ({ page }) => {
    await åbnForsiden(page);
    await laegIKurven(page);
    await udfyld(page);
    await page.locator('#allergi').fill('nødder');
    await page.locator('button.g.solid.blk').first().click();

    /* Den skal STOPPES — og siden skal sige hvorfor. */
    const gemt = await gemteData(page);
    expect(gemt.bestillinger || []).toHaveLength(0);
    await expect(page.locator('#bestil')).toContainText(/flueben/i);
  });

  test('med fluebenet går den igennem — og allergien står forrest', async ({ page }) => {
    await åbnForsiden(page);
    await laegIKurven(page);
    await udfyld(page);
    await page.locator('#allergi').fill('nødder');
    await page.locator('#allergi-samtykke').check();
    await page.locator('button.g.solid.blk').first().click();

    await expect(page.locator('#bestil .panel h3')).toContainText('Tak, Sara');
    const gemt = await gemteData(page);
    expect(gemt.bestillinger).toHaveLength(1);
    /* Køkkenet skal kunne SKIMME efter ordet, ikke lede. */
    expect(gemt.bestillinger[0].besked).toMatch(/^ALLERGI: nødder/);
  });

  /* ⚠️ MODSTYKKET, OG DET ER DET VIGTIGSTE AF DE FIRE. Uden det
     ville en regel, der spærrede for HVER bestilling, bestå
     prøven ovenfor — og et samtykke, man ikke kan komme udenom,
     er ikke frivilligt og dermed ugyldigt. */
  test('uden en allergi spærrer ingenting', async ({ page }) => {
    await åbnForsiden(page);
    await laegIKurven(page);
    await udfyld(page);
    await page.locator('button.g.solid.blk').first().click();

    await expect(page.locator('#bestil .panel h3')).toContainText('Tak, Sara');
    const gemt = await gemteData(page);
    expect(gemt.bestillinger).toHaveLength(1);
    expect(gemt.bestillinger[0].besked || '').not.toMatch(/ALLERGI/);
  });
});
