/* RESERVATIONER TIL ARRANGEMENTER  (30/8)

   Kundens spørgsmål: "hvor kommer reservationerne hen, hvad kan
   admin styre, hvordan gør vi det bulletproof ift kunder og
   admin?"

   Svaret var indtil 30/8: ingen steder. Knappen "Reservér plads"
   har stået på h-kalender.html siden designet kom 23/8 uden en
   tabel bag sig, og siden viste FEM OPFUNDNE arrangementer med
   datoer, priser og "12 pladser tilbage".

   To ting måles her:

   1) Gæstesiden viser ejerens egne arrangementer — og INGEN andre.
      En opdigtet pris er et skævt tal; en opdigtet AFTEN er en
      gæst, der kører til havnen forgæves.

   2) Pladserne holder. Databasens halvdel er bevist for sig i
      supabase/proev-arrangementer.sql (11 × BESTOD); her måles
      øvetilstandens spejl af samme regel, for opfører øvelsen sig
      anderledes end det rigtige, er den ikke en øvelse. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, åbnAdmin, grunddata, gemteData } = require('./hjaelp');

const arr = (æ) => Object.assign({
  id: 11, lokation_id: 'mosede', type: 'arrangement',
  dato: '2026-09-05', slut_dato: null, titel: 'Fællesspisning på havnen',
  beskrivelse: 'Langborde, én ret og fælles snak.', emoji: null,
  lukker_kl: null, offentlig: true, tilmelding: true, pladser: 40,
  pris_tekst: '145,-', start_kl: '18:00',
}, æ);

const res = (æ) => Object.assign({
  id: 1, lokation_id: 'mosede', kalender_id: 11, reference: 'RE260807-AAAAA',
  navn: 'Anna Vind', telefon: '20304050', email: null, antal_personer: 4,
  besked: null, status: 'ny', intern_note: null, slettet: null,
  oprettet: '2026-08-06T10:00:00Z',
}, æ);

const med = (kalender, reservationer) => {
  const d = grunddata();
  d.kalender = kalender || [];
  d.reservationer = reservationer || [];
  return d;
};

test.describe('Kalendersiden viser ejerens arrangementer', () => {

  /* ⚠️ DE FEM OPFUNDNE MÅ ALDRIG KOMME TILBAGE. Ronni & de Salte,
     torskegildet og efterårsbrunchen har aldrig eksisteret. */
  test('uden arrangementer opfinder siden ingen', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', { data: med([]) });
    await expect(page.locator('.evcard')).toHaveCount(0);
    await expect(page.locator('.evtom')).toContainText('ikke planlagt noget');

    const tekst = await page.locator('body').innerText();
    expect(tekst, 'et opdigtet arrangement er tilbage').not.toContain('Ronni');
    expect(tekst).not.toContain('Torskegilde');
    expect(tekst).not.toContain('Efterårsbrunch');

    // Og der er ikke noget at reservere, så panelet findes ikke.
    await expect(page.locator('#reserver')).toBeHidden();
  });

  test('ejerens arrangement står med tid, pris og pladser', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', { data: med([arr()], [res()]) });
    const kort = page.locator('.evcard');
    await expect(kort).toHaveCount(1);
    await expect(kort).toContainText('Fællesspisning på havnen');
    await expect(kort).toContainText('145,-');
    await expect(kort).toContainText('Kl. 18:00');
    // 40 pladser, fire er taget.
    await expect(kort).toContainText('36 pladser tilbage');
  });

  /* ⚠️ PERSONALETS EGEN NOTE MÅ ALDRIG PÅ HJEMMESIDEN. I
     produktionen sorterer adgangsreglen den fra; i øvetilstand
     ligger alt i den samme localStorage, og uden filteret i
     Butik.arrangementer ville "Bent har ferie" stå på siden. */
  test('en intern kalenderrække står ikke på siden', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', {
      data: med([arr(), arr({ id: 12, titel: 'Bent har ferie', offentlig: false })]),
    });
    await expect(page.locator('.evcard')).toHaveCount(1);
    await expect(page.locator('body')).not.toContainText('Bent har ferie');
  });

  /* Et "kig forbi"-arrangement har ingen knap. En reservationsknap
     dér ville sende gæsten ned i en formular, der ikke kan bruges
     — og databasen afviser den alligevel. */
  test('uden tilmelding står der kig forbi, og der er ingen knap', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', {
      data: med([arr({ tilmelding: false, pladser: null })]),
    });
    await expect(page.locator('.evfri')).toContainText('Kig bare forbi');
    await expect(page.locator('.evcard a[data-pick]')).toHaveCount(0);
    await expect(page.locator('#reserver')).toBeHidden();
  });

  test('er der fuldt, står der udsolgt i stedet for en knap', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', {
      data: med([arr({ pladser: 4 })], [res()]),
    });
    await expect(page.locator('.evudsolgt')).toContainText('Udsolgt');
    await expect(page.locator('.evcard a[data-pick]')).toHaveCount(0);
  });

  /* ⚠️ TALLET PÅ KORTET SKAL FØLGE MED (30/8).

     Pladserne hentes ved sideindlæsning, og kortet stod stille
     bagefter: "40 pladser tilbage", lige efter gæsten havde taget
     fire. Næste gæst så det rigtige tal — men hun, der lige havde
     reserveret, læste det som om det ikke var gået igennem, og
     trykkede igen. Fundet på et skærmbillede, ikke ved at læse
     koden.

     ⚠️ TALLENE KOMMER FRA HVER SIN SIDE. Loftet (40) står i
     dataene, det reserverede (4) skriver prøven selv i
     formularen — så en optegning, der bare gentager det, den fik
     serveret, kan ikke bestå. */
  test('kortets pladstal følger med, når gæsten lige har reserveret', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', { data: med([arr({ pladser: 40 })]) });
    await expect(page.locator('.evcard')).toContainText('40 pladser tilbage');

    await page.fill('#kantal', '4');
    await page.fill('#knavn', 'Anna Vind');
    await page.fill('#ktlf', '20304050');
    await page.locator('#reserver button.g.solid.blk').click();
    await expect(page.locator('#reserver h3')).toContainText('Vi ses');

    await expect(page.locator('.evcard'),
      'kortet står stille — gæsten tror, reservationen ikke gik igennem')
      .toContainText('36 pladser tilbage');
  });

  test('en gæst kan reservere, og kvitteringen lover ikke et opkald', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', { data: med([arr()]) });
    await page.fill('#kantal', '3');
    await page.fill('#knavn', 'Sara Poulsen');
    await page.fill('#ktlf', '28871343');
    await page.locator('#reserver button.g.solid.blk').click();

    await expect(page.locator('#reserver h3')).toContainText('Vi ses, Sara');
    /* ⚠️ DEN LOVER IKKE ET OPKALD. Samme lære som bordbookingen:
       en kvittering, der siger "vi ringer", får gæsten til at
       vente på et opkald, der aldrig kommer. */
    await expect(page.locator('#reserver')).not.toContainText('Vi ringer');

    const r = (await gemteData(page)).reservationer[0];
    expect(r.kalender_id).toBe(11);
    expect(r.antal_personer).toBe(3);
    expect(r.status, 'gæsten må ikke kunne sætte status').toBe('ny');
    expect(r.reference).toMatch(/^RE/);
  });

  /* ⚠️ ØVETILSTANDEN SKAL FEJLE SOM DATABASEN. En øvelse, der er
     mildere end det rigtige, tager imod det, produktionen
     afviser — og så opdages fejlen først hos en rigtig gæst.
     Databasens halvdel er prøve 2 i proev-arrangementer.sql. */
  test('der kan ikke reserveres flere end pladserne', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', {
      data: med([arr({ pladser: 6 })], [res()]),
    });
    await page.fill('#kantal', '3');
    await page.fill('#knavn', 'For Mange');
    await page.fill('#ktlf', '28871343');
    await page.locator('#reserver button.g.solid.blk').click();

    await expect(page.locator('#reserver .fine')).toContainText('ikke flere pladser');
    expect((await gemteData(page)).reservationer).toHaveLength(1);
  });

  test('samme nummer kan ikke melde sig til to gange', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', {
      data: med([arr()], [res({ telefon: '28871343' })]),
    });
    await page.fill('#knavn', 'Anna Igen');
    await page.fill('#ktlf', '28871343');
    await page.locator('#reserver button.g.solid.blk').click();

    await expect(page.locator('#reserver .fine')).toContainText('allerede tilmeldt');
    expect((await gemteData(page)).reservationer).toHaveLength(1);
  });
});

test.describe('Tilmeldingerne lander i admin', () => {

  async function åbnFanen(page, data) {
    await åbnAdmin(page, { data: data });
    await page.locator('[data-panel="p-tilmeldinger"]').click();
  }

  test('fanen viser hvem der kommer, og hvor mange pladser der er brugt', async ({ page }) => {
    await åbnFanen(page, med([arr()], [res(), res({ id: 2, reference: 'RE-B',
      navn: 'Peter Lund', telefon: '30405060', antal_personer: 2, status: 'bekraeftet' })]));

    await expect(page.locator('#tilmeld-titel')).toContainText('Fællesspisning');
    await expect(page.locator('#tilmeld-tael')).toContainText('6 af 40 pladser');
    await expect(page.locator('#tilmeld-liste .bestil-kort')).toHaveCount(2);
    await expect(page.locator('#tilmeld-liste')).toContainText('Anna Vind');
    // Nummeret skal kunne trykkes på — personalet står i døren.
    await expect(page.locator('#tilmeld-liste a[href="tel:20304050"]')).toHaveCount(1);
  });

  /* ⚠️ AFVISTE TÆLLER IKKE MED. Samme regel som databasens: et
     afslag frigiver pladsen. Talte skærmen dem med, ville
     personalet tro, der var fuldt, mens hjemmesiden stadig tog
     imod — og de to ville sige hver sit om det samme arrangement. */
  test('en afvist tilmelding tæller ikke som en optaget plads', async ({ page }) => {
    await åbnFanen(page, med([arr()], [res({ status: 'afvist' })]));
    await expect(page.locator('#tilmeld-tael')).toContainText('0 af 40 pladser');
  });

  test('personalet kan krydse af i døren', async ({ page }) => {
    await åbnFanen(page, med([arr()], [res()]));
    await page.locator('#tilmeld-liste').getByRole('button', { name: 'Kommet' }).click();
    await expect(page.locator('#kvittering')).toContainText('Anna Vind');

    const r = (await gemteData(page)).reservationer[0];
    expect(r.status).toBe('bekraeftet');
  });

  /* Mærket tæller på TVÆRS af arrangementer: et tal, der kun
     gjaldt det valgte, ville skjule tre nye til fredagens koncert,
     mens man kigger på torsdagens. */
  test('mærket tæller de nye på tværs af arrangementer', async ({ page }) => {
    await åbnFanen(page, med(
      [arr(), arr({ id: 12, titel: 'Torskegilde', dato: '2026-09-27' })],
      [res(), res({ id: 2, reference: 'RE-B', kalender_id: 12, telefon: '30405060' })]));
    await expect(page.locator('#tilmeld-antal')).toHaveText('2');
    await expect(page.locator('.arr-chip')).toHaveCount(2);
  });

  /* ⚠️ ET ARRANGEMENT UDEN TILMELDING HØRER IKKE TIL HER. Så ville
     personalet lede efter en liste, der aldrig kan blive fyldt. */
  test('kig-forbi-arrangementer står ikke på fanen', async ({ page }) => {
    await åbnFanen(page, med([arr({ tilmelding: false })]));
    await expect(page.locator('.arr-chip')).toHaveCount(0);
    await expect(page.locator('#tilmeld-arrangementer'))
      .toContainText('Ingen arrangementer tager imod');
  });
});
