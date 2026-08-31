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
const { åbnSkal, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

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
    await visFane(page, 'p-tilmeldinger');
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

/* ============================================================
   ÉT ARRANGEMENT FOR SIG  (30/8)
   ------------------------------------------------------------
   Kundens ord: "hvis nu der var flere ting derinde og reservér
   knappen, peger den så på 1 random en? Nej — hvis man trykker
   på den, så skal man kunne vælge mellem de arrangementer ... og
   man skal kunne trykke ind på de individuelle og se og læse
   mere omkring det og reservere derinde også."
   ============================================================ */
test.describe('Arrangementet kan åbnes for sig', () => {

  function toArrangementer() {
    const d = grunddata();
    d.kalender = [
      { id: 11, lokation_id: 'mosede', type: 'arrangement', dato: '2026-09-05',
        slut_dato: null, titel: 'Fællesspisning på havnen',
        beskrivelse: 'Langborde, fælles fad og fri snak på trædækket.',
        emoji: null, lukker_kl: null, offentlig: true, tilmelding: true,
        pladser: 40, pris_tekst: '145,- pr. person', start_kl: '18:00' },
      { id: 12, lokation_id: 'mosede', type: 'arrangement', dato: '2026-09-19',
        slut_dato: null, titel: 'Havnejam — åben scene',
        beskrivelse: 'Tag instrumentet med.', emoji: null, lukker_kl: null,
        offentlig: true, tilmelding: true, pladser: 20, pris_tekst: 'Fri entré',
        start_kl: '19:00' },
    ];
    d.reservationer = [];
    return d;
  }

  test('et tryk på kortet åbner arrangementet med hele teksten', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', { data: toArrangementer() });
    await page.locator('.evcard').first().click();

    const lag = page.locator('#ev-lag');
    await expect(lag).toHaveClass(/open/);
    await expect(page.locator('#ev-titel')).toHaveText('Fællesspisning på havnen');
    await expect(page.locator('#ev-hvornaar')).toContainText('18:00');
    /* Listen klipper beskrivelsen til én linje; laget har den hel. */
    await expect(page.locator('#ev-tekst')).toContainText('trædækket');
    await expect(page.locator('#ev-plads')).toContainText('40 pladser');
  });

  /* ⚠️ KNAPPEN VÆLGER NETOP DET ARRANGEMENT — den peger ikke på
     det første i listen. Det var hele kundens spørgsmål. */
  test('reservationsknappen i laget vælger det rigtige', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', { data: toArrangementer() });

    // Det ANDET kort, så en "peger på den første"-fejl ville ses
    await page.locator('.evcard').nth(1).click();
    await page.locator('#ev-cta button').first().click();

    await expect(page.locator('#karr')).toHaveValue('12');
    await expect(page.locator('#ev-lag')).not.toHaveClass(/open/);
  });

  /* ⚠️ ET "KIG FORBI"-ARRANGEMENT HAR INGEN KNAP. Den ville sende
     gæsten ned i en formular, der ikke kan bruges til noget. */
  test('uden tilmelding er der ingen reservationsknap i laget', async ({ page }) => {
    const d = toArrangementer();
    d.kalender[0].tilmelding = false;
    await åbnSkal(page, '/h-kalender.html', { data: d });
    await page.locator('.evcard').first().click();

    await expect(page.locator('#ev-cta button')).toHaveCount(1);   // kun Tilbage
    await expect(page.locator('#ev-plads')).toContainText('Kig bare forbi');
  });

  test('Escape og Luk lukker laget', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', { data: toArrangementer() });
    await page.locator('.evcard').first().click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#ev-lag')).not.toHaveClass(/open/);

    await page.locator('.evcard').first().click();
    await page.locator('#ev-luk').click();
    await expect(page.locator('#ev-lag')).not.toHaveClass(/open/);
  });
});

/* ============================================================
   ARRANGEMENTET KAN RETTES — OG DET VAR RODEN TIL FEJLEN
   ------------------------------------------------------------
   Kundens ord 30/8: "ift reservér en plads til de arrangementer
   de lægger op virker ikke, der er ikke en reservér plads-knap
   ... og knappen dirigerer ingen steder hen."

   Tre fejl i kæde, og de forklarer hinanden:

   1) tilmelding er slået FRA som standard (med vilje — de fleste
      arrangementer på en havn er "kig forbi").
   2) Et arrangement kunne oprettes og slettes, men ALDRIG
      rettes. Var fluebenet ikke sat, fandtes der ingen vej til
      at sætte det bagefter.
   3) Og så pegede den flydende pille "Reservér plads" på
      #reserver, som stod med display:none. Et tryk gjorde
      præcis ingenting.

   Dertil: beskrivelse og klokkeslæt havde INGEN felter i admin
   overhovedet, selv om gæstesiden har vist dem hele tiden.
   ============================================================ */
test.describe('Arrangementet kan rettes bagefter', () => {

  const KIG_FORBI = {
    id: 21, lokation_id: 'mosede', type: 'arrangement', dato: '2026-09-12',
    slut_dato: null, titel: 'Musik på molen', beskrivelse: null, emoji: null,
    lukker_kl: null, offentlig: true, tilmelding: false, pladser: null,
    pris_tekst: null, start_kl: null, billede: null,
  };

  async function kalenderFanen(page, rækker) {
    await åbnAdmin(page, { data: med(rækker || [KIG_FORBI], []) });
    await visFane(page, 'p-kalender');
  }

  /* ⚠️ DEN OPLYSNING, KUNDEN LEDTE EFTER OG IKKE FANDT.

     ⚠️ OG TO PRØVER, IKKE ÉN. hjaelp.js' sætDataEngang skriver kun
     i localStorage, HVIS den er tom — åbner en prøve admin to
     gange med forskellige data, ser den de FØRSTE begge gange og
     måler noget andet, end den tror. Det står som et ar i
     CLAUDE.md, og det kostede en runde her igen. */
  test('listen siger, når et arrangement kun er "kig forbi"', async ({ page }) => {
    await kalenderFanen(page);
    await expect(page.locator('.admin-raekke', { hasText: 'Musik på molen' }))
      .toContainText('Kig forbi');
  });

  test('listen siger, når et arrangement tager imod reservationer', async ({ page }) => {
    await kalenderFanen(page, [{ ...KIG_FORBI, tilmelding: true, pladser: 40 }]);
    const række = page.locator('.admin-raekke', { hasText: 'Musik på molen' });
    await expect(række).toContainText('Tager imod');
    // Og hvor mange pladser — det er dét, man skimmer listen for.
    await expect(række).toContainText('40 pl.');
  });

  /* ⚠️ HELE POINTEN. Uden den her kunne fluebenet ikke sættes
     bagefter, og arrangementet var låst som "kig forbi" for
     altid. */
  test('Ret åbner arrangementet, og tilmeldingen kan slås til', async ({ page }) => {
    await kalenderFanen(page);
    await page.locator('.admin-raekke', { hasText: 'Musik på molen' })
      .locator('button', { hasText: 'Ret' }).click();

    // Formularen står med rækkens egne værdier.
    await expect(page.locator('#kal-titel')).toHaveValue('Musik på molen');
    await expect(page.locator('#kal-dato')).toHaveValue('2026-09-12');
    await expect(page.locator('#tilfoej-kalender')).toHaveText('Gem ændringer');
    /* ⚠️ OG OVERSKRIFTEN. Målt på et skud: kortet sagde "Læg noget
       i kalenderen", mens felterne stod fyldt ud med en række,
       man var ved at rette — og så tror man, man opretter en
       dublet. */
    await expect(page.locator('#kal-form-titel')).toContainText('Ret');

    await page.locator('#kal-tilmelding').check();
    await page.fill('#kal-pladser', '40');
    await page.fill('#kal-pris', '145,-');
    await page.locator('#tilfoej-kalender').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const gemt = await gemteData(page);
    /* ⚠️ ÉN RÆKKE, IKKE TO. Rettede vi ved at oprette en ny,
       ville arrangementet stå to gange på hjemmesiden — og
       reservationerne ville hænge på den forkerte. */
    expect(gemt.kalender.length).toBe(1);
    expect(gemt.kalender[0].tilmelding).toBe(true);
    expect(gemt.kalender[0].pladser).toBe(40);
    expect(gemt.kalender[0].pris_tekst).toBe('145,-');
  });

  /* ⚠️ FELTERNE FANDTES SLET IKKE. Gæstesiden har vist
     beskrivelsen og klokkeslættet, siden arrangementerne blev
     bygget — ejeren kunne bare ikke skrive dem. */
  test('beskrivelse og klokkeslæt kan skrives og når hjemmesiden', async ({ page }) => {
    await kalenderFanen(page);
    await page.locator('.admin-raekke', { hasText: 'Musik på molen' })
      .locator('button', { hasText: 'Ret' }).click();

    await page.fill('#kal-start', '19:00');
    await page.fill('#kal-beskrivelse', 'Ronni spiller på trædækket. Tag naboen med.');
    await page.locator('#tilfoej-kalender').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const gemt = await gemteData(page);
    expect(gemt.kalender[0].start_kl).toBe('19:00');
    expect(gemt.kalender[0].beskrivelse).toContain('trædækket');

    // Og det står på kalendersiden.
    await åbnSkal(page, '/h-kalender.html', { data: med(gemt.kalender, []) });
    await expect(page.locator('.evcard')).toContainText('19:00');
    await expect(page.locator('.evcard')).toContainText('trædækket');
  });

  /* ⚠️ ET GEM AF NOGET ANDET MÅ IKKE TØMME BILLEDET. Samme lov
     som bordets nøgle og nyhedernes vis_fra: en kolonne, der
     sendes ubetinget, tager noget med sig, ingen bad om. */
  test('en rettelse af titlen rører ikke billedet', async ({ page }) => {
    await kalenderFanen(page, [{ ...KIG_FORBI, billede: 'https://x/foto.jpg' }]);
    await page.locator('.admin-raekke', { hasText: 'Musik på molen' })
      .locator('button', { hasText: 'Ret' }).click();
    await page.fill('#kal-titel', 'Musik på molen — anden runde');
    await page.locator('#tilfoej-kalender').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const gemt = await gemteData(page);
    expect(gemt.kalender[0].titel).toContain('anden runde');
    expect(gemt.kalender[0].billede, 'billedet blev tømt af et gem, der ikke handlede om det')
      .toBe('https://x/foto.jpg');
  });

  test('Fortryd lader rækken være, som den var', async ({ page }) => {
    await kalenderFanen(page);
    await page.locator('.admin-raekke', { hasText: 'Musik på molen' })
      .locator('button', { hasText: 'Ret' }).click();
    await page.fill('#kal-titel', 'Noget helt andet');
    await page.locator('#kal-fortryd').click();

    await expect(page.locator('#kal-titel')).toHaveValue('');
    await expect(page.locator('#tilfoej-kalender')).toHaveText('Læg i kalenderen');

    const gemt = await gemteData(page);
    expect(gemt.kalender[0].titel).toBe('Musik på molen');
  });
});

/* ⚠️ KNAPPEN MÅ IKKE PEGE PÅ ET SKJULT PANEL  (30/8)
   "Reservér plads-knappen dirigerer ingen steder hen." Det gjorde
   den heller ikke: den pegede på #reserver, som stod med
   display:none, fordi intet arrangement tog imod. Browseren
   hopper ikke til noget, den ikke kan se — ingen fejl, ingen
   bevægelse, og gæsten tror, siden er i stykker. */
test.describe('Den flydende knap følger virkeligheden', () => {

  const FORBI = {
    id: 31, lokation_id: 'mosede', type: 'arrangement', dato: '2026-09-12',
    slut_dato: null, titel: 'Musik på molen', beskrivelse: null, emoji: null,
    lukker_kl: null, offentlig: true, tilmelding: false, pladser: null,
    pris_tekst: null, start_kl: null,
  };

  test('uden noget at reservere peger den på listen', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', { data: med([FORBI], []) });
    await expect(page.locator('#reserver')).toBeHidden();

    const pille = page.locator('#bestil-pill');
    await expect(pille).toHaveAttribute('href', '#evliste');
    await expect(pille).toContainText('Se arrangementerne');

    /* ⚠️ OG MÅLET SKAL FINDES. En knap, der peger på et anker,
       der ikke er i opmærkningen, er lige så død som den, der
       pegede på et skjult panel. */
    await expect(page.locator('#evliste')).toBeVisible();
  });

  test('med et arrangement, der tager imod, peger den på formularen', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', {
      data: med([{ ...FORBI, tilmelding: true, pladser: 40 }], []),
    });
    await expect(page.locator('#reserver')).toBeVisible();

    const pille = page.locator('#bestil-pill');
    await expect(pille).toHaveAttribute('href', '#reserver');
    await expect(pille).toContainText('Reservér plads');
  });
});

/* Billedet er den ene ting, der gør et arrangement til andet end
   en linje i en liste — kundens "info, billeder, alt muligt". */
test.describe('Arrangementet kan have et billede', () => {

  const MED_FOTO = {
    id: 41, lokation_id: 'mosede', type: 'arrangement', dato: '2026-09-12',
    slut_dato: null, titel: 'Fællesspisning', beskrivelse: 'Langborde og fælles fad.',
    emoji: null, lukker_kl: null, offentlig: true, tilmelding: true, pladser: 40,
    pris_tekst: '145,-', start_kl: '18:00',
    billede: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
  };

  test('fotoet står på kortet med arrangementets eget alt', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', { data: med([MED_FOTO], []) });
    const foto = page.locator('.evcard .evfoto');
    await expect(foto).toHaveCount(1);
    await expect(foto).toHaveAttribute('alt', 'Fællesspisning');
  });

  /* ⚠️ INGEN GRÅ KASSE UDEN ET FOTO. Samme regel som resten af
     huset: en tom plads er værre end ingen plads. */
  test('uden foto står der ingen plads at fylde ud', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', {
      data: med([{ ...MED_FOTO, billede: null }], []),
    });
    await expect(page.locator('.evcard')).toHaveCount(1);
    await expect(page.locator('.evcard .evfoto')).toHaveCount(0);
    await expect(page.locator('#ev-foto')).toBeHidden();
  });
});
