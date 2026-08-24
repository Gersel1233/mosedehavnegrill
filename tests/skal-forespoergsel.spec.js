/* De tre forespørgselssider: selskaber, catering og baglokalet.

   Det er ÉN tabel med tre indgange (fase 2), og formularerne
   spørger om forskellige ting. Alt det ekstra lægges i kolonnen
   detaljer, så personalet ser felter og ikke en sætning, de skal
   læse et tal ud af.

   Og havnen er ét sted: er baglokalet lejet ud den 12., kan der
   ikke også holdes selskab hos jer den 12. Prøverne herunder
   måler browserens halvdel af det værn — databasens halvdel
   måles af supabase/proev-forespoergsel-kalender.sql. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';
const OPTAGET = '2026-09-12';

function data(ændringer) {
  const d = grunddata();
  d.forespoergsler = [];
  d.udlejninger = [];
  Object.assign(d, ændringer || {});
  return d;
}

/* En dag, personalet HAR sagt ja til. Kun aftalte dage er
   optagne — en forespørgsel, der lige er kommet ind, er et
   spørgsmål, ikke en booking. */
function medAftaltSelskab() {
  return data({
    forespoergsler: [{
      id: 1, lokation_id: 'mosede', reference: 'FO-1', type: 'selskab',
      navn: 'Anden gæst', telefon: '20304050', email: null,
      dato: OPTAGET, antal_personer: 30, besked: null,
      detaljer: { hvor: 'hos-jer' }, status: 'aftalt', intern_note: null,
      slettet: null, oprettet: '2026-08-01T10:00:00.000Z',
    }],
  });
}

async function åbn(page, sti, d) {
  await åbnSkal(page, sti, { ur: FREDAG, data: d || data() });
}

test.describe('Forespørgselssiderne', () => {
  test('selskabsforespørgslen lander med sine detaljer', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');

    await page.locator('[data-chips="single"] button', { hasText: 'Konfirmation' }).click();
    await page.locator('#pdato').fill('2026-10-03');
    await page.locator('#pantal').fill('42');
    await page.locator('[data-chips="multi"] button', { hasText: 'Tapasfad' }).click();
    await page.locator('#pnavn').fill('Sara Poulsen');
    await page.locator('#ptlf').fill('28871343');
    await page.locator('#pmail').fill('sara@eksempel.dk');
    await page.locator('#pbesked').fill('Vi kommer 12.30.');
    await page.locator('#forespoerg button.g.solid.blk').click();

    await expect(page.locator('#forespoerg h3')).toContainText('Tak, Sara');

    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.type).toBe('selskab');
    expect(f.dato).toBe('2026-10-03');
    expect(f.antal_personer).toBe(42);
    expect(f.email).toBe('sara@eksempel.dk');
    expect(f.detaljer.anledning).toBe('Konfirmation');
    expect(f.detaljer.hvor).toBe('hos-jer');
    expect(f.detaljer.mad).toContain('Tapasfad');
    expect(f.status).toBe('ny');
  });

  test('baglokalet gemmer tidsrum og med/uden mad', async ({ page }) => {
    await åbn(page, '/h-baglokale.html');

    await page.locator('[data-chips="single"] button', { hasText: 'Aften' }).click();
    await page.locator('#bdato').fill('2026-10-04');
    await page.locator('#bnavn').fill('Jonas Berg');
    await page.locator('#btlf').fill('28871343');
    await page.locator('#forespoerg button.g.solid.blk').click();

    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.type).toBe('baglokale');
    expect(f.detaljer.tidsrum).toContain('Aften');
    expect(f.detaljer.mad).toBe('med-mad');
  });

  test('cateringens adresse følger med ved levering — og ryger ved afhentning', async ({ page }) => {
    await åbn(page, '/h-catering.html');

    await page.locator('#cdato').fill('2026-10-05');
    await page.locator('#ckuv').fill('60');
    await page.locator('#cadr').fill('Havnevej 20I, 2670 Greve');
    await page.locator('#cnavn').fill('Sara Poulsen');
    await page.locator('#ctlf').fill('28871343');
    await page.locator('#forespoerg button.g.solid.blk').click();

    let f = (await gemteData(page)).forespoergsler[0];
    expect(f.type).toBe('catering');
    expect(f.detaljer.levering).toBe('levering');
    expect(f.detaljer.adresse).toBe('Havnevej 20I, 2670 Greve');

    /* Skifter gæsten til afhentning, må adressen IKKE blive
       hængende — så ville personalet ringe om en levering, ingen
       har bedt om. */
    await åbn(page, '/h-catering.html');
    await page.locator('#cdato').fill('2026-10-06');
    await page.locator('#cadr').fill('Havnevej 20I, 2670 Greve');
    await page.locator('[data-toggles="#cadrfelt"] button', { hasText: 'Afhentning' }).click();
    await page.locator('#cnavn').fill('Sara Poulsen');
    await page.locator('#ctlf').fill('28871343');
    await page.locator('#forespoerg button.g.solid.blk').click();

    f = (await gemteData(page)).forespoergsler[0];
    expect(f.detaljer.levering).toBe('afhentning');
    expect(f.detaljer.adresse).toBeUndefined();
  });

  test('designets faste dato er væk, og feltet kan ikke gå bagud', async ({ page }) => {
    /* En pladsholder, ingen har valgt, ville blive sendt som
       gæstens ønskede dato den dag, hun glemmer at røre feltet. */
    await åbn(page, '/h-selskaber.html');

    await expect(page.locator('#pdato')).toHaveValue('');
    await expect(page.locator('#pdato')).toHaveAttribute('min', '2026-08-07');
    await expect(page.locator('#pdato')).toHaveAttribute('max', '2028-08-06');
  });

  test('en optaget dag kan ikke vælges til et selskab hos jer', async ({ page }) => {
    await åbn(page, '/h-selskaber.html', medAftaltSelskab());

    await page.locator('#pdato').fill(OPTAGET);
    await expect(page.locator('#forespoerg .fine')).toContainText('optaget');

    await page.locator('#pnavn').fill('Sara Poulsen');
    await page.locator('#ptlf').fill('28871343');
    await page.locator('#forespoerg button.g.solid.blk').click();

    // Der må ikke være kommet en nummer to på den dag
    const alle = (await gemteData(page)).forespoergsler;
    expect(alle.filter((f) => f.dato === OPTAGET)).toHaveLength(1);
  });

  test('ud af huset optager ingenting — så er dagen fri igen', async ({ page }) => {
    await åbn(page, '/h-selskaber.html', medAftaltSelskab());

    await page.locator('#pdato').fill(OPTAGET);
    await expect(page.locator('#forespoerg .fine')).toContainText('optaget');

    await page.locator('.seg2 button', { hasText: 'Ud af huset' }).click();
    await expect(page.locator('#forespoerg .fine')).not.toContainText('optaget');

    await page.locator('#pnavn').fill('Sara Poulsen');
    await page.locator('#ptlf').fill('28871343');
    await page.locator('#forespoerg button.g.solid.blk').click();

    const alle = (await gemteData(page)).forespoergsler;
    expect(alle.filter((f) => f.dato === OPTAGET)).toHaveLength(2);
  });

  test('catering må gerne ligge på en optaget dag', async ({ page }) => {
    // Maden kører ud; havnen står fri.
    await åbn(page, '/h-catering.html', medAftaltSelskab());

    await page.locator('#cdato').fill(OPTAGET);
    await page.locator('#cnavn').fill('Sara Poulsen');
    await page.locator('#ctlf').fill('28871343');
    await page.locator('#forespoerg button.g.solid.blk').click();

    await expect(page.locator('#forespoerg h3')).toContainText('Tak, Sara');
  });

  test('en bekræftet udlejning lukker dagen for selskaber', async ({ page }) => {
    const d = data({
      udlejninger: [{
        id: 1, lokation_id: 'mosede', reference: 'UD-1', navn: 'Lejer',
        telefon: '20304051', email: null, dato: OPTAGET, antal_personer: 20,
        besked: null, status: 'bekraeftet', intern_note: null, slettet: null,
        oprettet: '2026-08-01T10:00:00.000Z',
      }],
    });
    await åbn(page, '/h-baglokale.html', d);

    await page.locator('#bdato').fill(OPTAGET);
    await expect(page.locator('#forespoerg .fine')).toContainText('optaget');
  });

  test('uden navn, nummer eller med en skæv mail sendes den ikke', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');

    await page.locator('#forespoerg button.g.solid.blk').click();
    await expect(page.locator('#forespoerg .fine')).toContainText('Skriv dit navn');

    await page.locator('#pnavn').fill('Sara');
    await page.locator('#forespoerg button.g.solid.blk').click();
    await expect(page.locator('#forespoerg .fine')).toContainText('telefonnummer');

    await page.locator('#ptlf').fill('28871343');
    await page.locator('#pmail').fill('sara-at-eksempel');
    await page.locator('#forespoerg button.g.solid.blk').click();
    await expect(page.locator('#forespoerg .fine')).toContainText('E-mailen');

    expect((await gemteData(page)).forespoergsler || []).toHaveLength(0);
  });

  test('skallen er urørt: felterne står i designets rækkefølge', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');
    const etiketter = await page.$$eval('#forespoerg .field label',
      (els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' ')));
    expect(etiketter).toEqual(['Anledning', 'Dato', 'Antal gæster', 'Hvor skal det være?',
      'Hvad tænker I mad-mæssigt?', 'Fortæl om dagen', 'Navn', 'Telefonnummer',
      'E-mail (så vi kan sende jer et tilbud)']);
  });
});
