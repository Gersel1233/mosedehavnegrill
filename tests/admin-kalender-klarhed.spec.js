/* ============================================================
   KALENDEREN SKAL KUNNE LÆSES UDEN AT ÅBNE HVER DAG
   ------------------------------------------------------------
   Kundens forlæg 9/9 (fem skærmbilleder af en færdig
   personaleside, sendt som billeder — der er hverken læst i
   eller kopieret fra deres kode). Hans ord: *"sådan der skal det
   cirka se ud, men bare med alle de ting mosedehavnecafe har
   med — du ved individualisering osv."*

   MÅLT mod vores egen: de fire per-dags-kontroller, forlægget
   har, HAVDE vi allerede — hvad kan man bestille, hvornår kan
   man hente, besked til gæsterne, opret booking. To ting
   manglede, og begge er klarhed og ikke funktion:

   1) NETTET MARKERER FIRE TILSTANDE MED HVER SIN FARVEDE KANT,
      og der stod ingen steder hvad en farve betyder.
   2) DER VAR INGEN SUM FOR MÅNEDEN — man skulle lægge tredive
      felter sammen i hovedet for at vide, hvor travlt det er.

   Og én ting stod det forkerte sted: dagens styring lå UNDER
   både programmet og notefeltet.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const H = require('./hjaelp.js');

const ISO = '2026-08-07';

function medDag() {
  const d = H.grunddata();
  d.bestillinger = [{
    id: 1, nummer: 1, reference: 'SM260807-AAA11', lokation_id: 'mosede',
    navn: 'lone hansen', telefon: '20304050', hent_dato: ISO, hent_tid: '12:30',
    linjer: [{ navn: 'Rejemad', antal: 3, pris: 85 }], fyld: [], antal: 3,
    status: 'ny', hvordan: 'afhentning',
  }];
  return d;
}

test('månedens farver har en tegnforklaring', async ({ page }) => {
  await H.åbnAdmin(page, { data: medDag() });
  await H.visFane(page, 'p-kalender');

  const boks = page.locator('#maaned-forklaring');
  await expect(boks).toBeVisible();

  /* ⚠️ TALLET KOMMER UDEFRA: forklaringen skal have én linje pr.
     tilstand, nettet FAKTISK kan tegne. Et fast tal skrevet af
     ville holde op med at måle den dag, en femte kant kom til. */
  const tilstande = await page.evaluate(() => {
    const kendte = ['er-tider', 'har-fest', 'er-halv', 'er-lukket'];
    return kendte.filter((k) => document.querySelector('#maaned-forklaring .' + k));
  });
  expect(tilstande, 'en tilstand mangler i forklaringen')
    .toEqual(['er-tider', 'har-fest', 'er-halv', 'er-lukket']);

  /* ⚠️ OG PRØVEN MÅLER KASSEN. En forklaring uden farveprøver er
     en ordliste, ikke en forklaring — og et element uden kasse
     kan ikke tegnes. */
  const proeve = page.locator('#maaned-forklaring .kal-proeve').first();
  const kasse = await proeve.boundingBox();
  expect(kasse && kasse.width, 'farveprøven har ingen kasse').toBeGreaterThan(5);
});

test('måneden siger, hvor travl den er', async ({ page }) => {
  await H.åbnAdmin(page, { data: medDag() });
  await H.visFane(page, 'p-kalender');

  const sum = page.locator('#maaned-sum');
  await expect(sum).toBeVisible();
  /* Fiksturet har ÉN bestilling på tre retter i august. */
  await expect(sum).toContainText('1 bestilling');
  await expect(sum).toContainText('3 retter');
});

test('en tom måned siger det med ord', async ({ page }) => {
  await H.åbnAdmin(page);                     // grunddata: ingen bestillinger
  await H.visFane(page, 'p-kalender');
  const sum = page.locator('#maaned-sum');
  await expect(sum).toBeVisible();
  /* ⚠️ MODSTYKKET. "Hele måneden: " efterfulgt af ingenting læses
     som en linje, der ikke virker — og uden den her prøve ville
     en regel, der ALTID skrev overskriften, bestå den ovenfor. */
  await expect(sum).not.toContainText('Hele måneden:');
  await expect(sum).toContainText(/ikke noget i kalenderen/i);
});

test('dagens styring står FØR programmet', async ({ page }) => {
  await H.åbnAdmin(page, { data: medDag() });
  await H.visFane(page, 'p-kalender');
  await page.locator('#p-kalender [data-dag="' + ISO + '"]').first().click();

  const lag = page.locator('#dag-lag');
  await expect(lag).toBeVisible();

  /* ⚠️ FØRST: BEGGE DELE SKAL VÆRE DER. Uden den vagt ville en
     rettelse, der bare FJERNEDE programmet, bestå prøven — og
     personalet ville miste dagens liste (toBeHidden-arret 30/8). */
  const orden = await lag.evaluate((l) => {
    const tekst = l.innerText;
    return {
      styring: tekst.indexOf('Hvad kan man bestille denne dag?'),
      program: tekst.indexOf('Dagens program'),
    };
  });
  expect(orden.styring, 'styringen mangler').toBeGreaterThan(-1);
  expect(orden.program, 'programmet mangler').toBeGreaterThan(-1);

  /* ⚠️ OG SÅ RÆKKEFØLGEN — to uafhængige positioner, ikke ét
     spørgsmål til ét element om dets egen plads. */
  expect(orden.styring,
    'dagens styring ligger under programmet — på en travl dag er den under folden')
    .toBeLessThan(orden.program);
});
