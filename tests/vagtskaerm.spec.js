/* OVERBLIKKET ER EN VAGTSKÆRM.

   Kundens ord (23/8): "overblikket er heller ikke så godt — det
   er dér, de bør stå, når de er på arbejde og modtager
   bestillinger."

   Fanen var sorteret efter hvornår bestillingen KOM IND. Det var
   rigtigt, dengang hver bestilling ventede på et opkald — men
   bestilt er bestilt siden 23/8, og så var rækkefølgen tilbage
   uden en grund.

   MÅLT PÅ EN TRAVL DAG, og det er den måling, prøverne herunder
   gentager: klokken 13.00 stod Sara, der henter kl. 18.00, som
   nummer to — fordi hun havde bestilt ni minutter før.

   Fanerne måles her også. På en iPhone 13 fyldte de 344 px
   øverst og sluttede 599 px nede på en 844 px skærm: 71 % af
   skærmen var navigation, før personalet så en bestilling.
*/

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData } = require('./hjaelp');

/* Uret i åbnAdmin står på fredag 7. august 2026 kl. 13.00 dansk
   tid. Tiderne herunder er valgt op omkring det: to før klokken,
   tre efter, og én langt ude i fremtiden. */
function travlDag() {
  const nu = new Date('2026-08-07T11:00:00Z');
  const lavet = (min) => new Date(nu.getTime() - min * 60000).toISOString();
  const b = (id, tid, navn, tlf, vare, antal, status, bestiltForMin) => ({
    id, lokation_id: 'mosede', reference: 'SM-P-' + id, navn, telefon: tlf,
    email: null, hent_dato: '2026-08-07', hent_tid: tid,
    linjer: [{ navn: vare, antal, pris: 45 }], fyld: [], antal,
    besked: null, status, hvordan: 'afhentning', leverings_adresse: null,
    intern_note: null, slettet: null, oprettet: lavet(bestiltForMin),
  });

  /* RÆKKEFØLGEN I DEN HER LISTE ER OMVENDT AF TIDEN — også inde
     i de første tre.

     Første udgave lå tilfældigvis rigtigt: Anna, Jonas, Mette
     stod i arrayet i samme orden som klokkeslættet, så prøven
     bestod, selv når sorteringen blev pillet ud. Den målte
     ingenting. Nu står Mette (14.00) først og Anna (13.15)
     sidst, så kun en rigtig sortering kan give 13.15, 13.30,
     14.00. */
  const d = grunddata();
  d.bestillinger = [
    b(5, '18:00', 'Sara Dam', '20304054', 'Smørrebrød', 12, 'ny', 9),
    b(3, '14:00', 'Mette Holm', '20304052', 'Burger', 3, 'bekraeftet', 48),
    b(4, '17:30', 'Peter Lund', '20304053', 'Fiskefilet', 6, 'bekraeftet', 120),
    b(2, '13:30', 'Jonas Berg', '20304051', 'Stjerneskud', 2, 'ny', 22),
    b(1, '13:15', 'Anna Vind', '20304050', 'Håndmad', 4, 'ny', 6),
  ];
  return d;
}

test.describe('Vagtskærmen', () => {

  test('dagen står i tidsrækkefølge, ikke i bestillingsrækkefølge', async ({ page }) => {
    /* SELVE FEJLEN, målt. Uden sorteringen står Sara (18.00) som
       nummer to, fordi hun bestilte ni minutter før. */
    await åbnAdmin(page, { data: travlDag() });
    const tider = page.locator('#overblik-vagt .vagt-tid');
    await expect(tider).toHaveCount(5);
    await expect(tider.nth(0)).toHaveText('13.15');
    await expect(tider.nth(1)).toHaveText('13.30');
    await expect(tider.nth(2)).toHaveText('14.00');
    await expect(tider.nth(3)).toHaveText('17.30');
    await expect(tider.nth(4)).toHaveText('18.00');
  });

  /* De to grupper lå i hvert sit KORT før. Det var to overskrifter,
     to kanter og to gange luft for én liste — og på en iPad betød
     det, at man skulle rulle for at se, om der var noget senere.
     Skellet består; det er en overskrift i den samme liste nu.

     Prøven læser DOKUMENTETS rækkefølge og ikke to beholdere: det
     er dét, øjet følger, og det er det eneste, der stadig kan
     måles, når kanterne er væk. */
  test('det der ligger langt ude står under Senere i dag', async ({ page }) => {
    await åbnAdmin(page, { data: travlDag() });

    const raekke = await page.evaluate(() => Array.from(
      document.getElementById('overblik-vagt').children).map((el) => (
      el.classList.contains('forloeb-hoved')
        ? 'GRUPPE: ' + el.textContent
        : el.querySelector('.vagt-tid').textContent)));

    expect(raekke[0]).toContain('GRUPPE: Nu og de næste to timer');
    expect(raekke.slice(1, 4)).toEqual(['13.15', '13.30', '14.00']);
    expect(raekke[4]).toBe('GRUPPE: Senere i dag');
    expect(raekke.slice(5)).toEqual(['17.30', '18.00']);
  });

  test('en overskredet afhentning bliver stående øverst og bliver markeret',
    async ({ page }) => {
    /* En gæst, der skulle have hentet kl. 12.30 og ikke har, er
       ikke mindre vigtig kl. 13.00 — hun er mere. Nedtones eller
       skjules den, opdager ingen at maden står og bliver kold. */
    const d = travlDag();
    d.bestillinger[4].hent_tid = '12:30';   // Anna, sidst i listen
    await åbnAdmin(page, { data: d });

    const foerste = page.locator('#overblik-vagt .vagt-raekke').first();
    await expect(foerste).toHaveClass(/overskredet/);
    await expect(foerste).toContainText('Anna Vind');
    await expect(foerste).toContainText('Overskredet');
  });

  test('det færdige er ikke arbejde længere', async ({ page }) => {
    /* Uden det her vokser listen hen over dagen, mens det, der
       skal laves, bliver skubbet ned. */
    const d = travlDag();
    d.bestillinger[4].status = 'afhentet';   // Anna 13.15
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#overblik-vagt')).not.toContainText('Anna Vind');
    await expect(page.locator('#overblik-vagt')).toContainText('Jonas Berg');
  });

  /* ⚠️ MEN DET FÆRDIGE ER IKKE VÆK. Det faldt HELT ud af skærmen
     før, og det var forkert: trykker nogen "Afhentet" på det
     forkerte kort midt i en frokost, var bestillingen væk — og
     gæsten stod ved lugen uden noget at hente. */
  test('det færdige kan findes igen og gøres om', async ({ page }) => {
    const d = travlDag();
    d.bestillinger[4].status = 'afhentet';   // Anna 13.15
    await åbnAdmin(page, { data: d });

    const kort = page.locator('#faerdige-kort');
    await expect(kort).not.toHaveClass(/skjult/);
    await expect(page.locator('#faerdige-titel')).toHaveText('✓ Færdige (1)');
    await expect(page.locator('#overblik-faerdige')).toContainText('Anna Vind');

    // Foldet sammen fra start: det er ikke arbejde, det er en
    // fortrydeknap.
    expect(await kort.evaluate((el) => el.open)).toBe(false);

    await kort.locator('summary').click();
    await page.locator('#overblik-faerdige .nyt-aabn', { hasText: 'Gendan' }).click();

    await expect(page.locator('#overblik-vagt')).toContainText('Anna Vind');
    await expect(page.locator('#faerdige-titel')).toHaveText('✓ Færdige (0)');
  });

  /* ⚠️ GENDAN FØRER TIL "BEKRÆFTET" OG IKKE TIL "NY". Rækken HAR
     været set af personalet — det var derfor, nogen trykkede. Sat
     til ny ville den tælle med i "ikke set på endnu" og sende
     køkkenet ud at lede efter noget, de allerede kender. */
  test('en gendannet bestilling tæller ikke som ny igen', async ({ page }) => {
    const d = travlDag();
    d.bestillinger[4].status = 'afhentet';
    await åbnAdmin(page, { data: d });

    await page.locator('#faerdige-kort summary').click();
    await page.locator('#overblik-faerdige .nyt-aabn', { hasText: 'Gendan' }).click();
    await expect(page.locator('#overblik-vagt')).toContainText('Anna Vind');

    const raekke = page.locator('#overblik-vagt .vagt-raekke', { hasText: 'Anna Vind' });
    await expect(raekke).not.toContainText('Ny');
  });

  test('en bestilling til en anden dag står for sig, ikke i dagens liste',
    async ({ page }) => {
    /* Den gamle rækkefølge var god til ét: en bestilling til på
       fredag, der lige er kommet ind, forsvinder ikke ud af syne.
       Den egenskab skal beholdes — bare ikke øverst. */
    const d = travlDag();
    d.bestillinger[0].hent_dato = '2026-08-14';   // Sara, en uge frem
    await åbnAdmin(page, { data: d });

    await expect(page.locator('#overblik-vagt')).not.toContainText('Sara Dam');
    await expect(page.locator('#vagt-nyt-kort')).not.toHaveClass(/skjult/);
    await expect(page.locator('#overblik-nyt')).toContainText('Sara Dam');
  });

  test('dagens ting står ikke to steder', async ({ page }) => {
    /* Anna bestilte for seks minutter siden OG henter i dag. Hun
       hører til ét sted. To kort om den samme bestilling er ikke
       to oplysninger — det er én, man skal regne ud er den samme. */
    await åbnAdmin(page, { data: travlDag() });
    await expect(page.locator('#overblik-nyt')).not.toContainText('Anna Vind');
    await expect(page.locator('#vagt-nyt-kort')).toHaveClass(/skjult/);
  });

  test('en tom dag siger det, i stedet for at stå tom', async ({ page }) => {
    const d = grunddata();
    d.bestillinger = [];
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#overblik-vagt'))
      .toContainText('Ingen bestillinger eller aftaler endnu i dag');
  });
});

/* ============================================================
   LUGEN OG BORDENE ER TO STRØMME
   ------------------------------------------------------------
   Kundens ord (26/8): "det er rodet at både qr bestillinger er
   der og online bestillinger — du skal huske online bestillinger
   er bare bestillinger til lugen dernede, hvor at selve qr
   bestillinger skal i en separat ting."

   Det er ikke smag. De to har forskelligt arbejde bag sig: en
   bestilling fra hjemmesiden skal ramme et KLOKKESLÆT, en fra en
   QR-kode skal laves NU og bæres ud. Blandet i én liste sorteret
   efter tid ligger bordet — hentetid = nu — altid øverst og
   skubber den frokost, der skal være klar kl. 12.30, ned.
   ============================================================ */
test.describe('Bordene står for sig', () => {

  function medBord() {
    const d = travlDag();
    d.borde = [{ id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4,
      placering: 'ude', aktiv: true, sortering: 10 }];
    d.bestillinger.push({
      id: 90, lokation_id: 'mosede', reference: 'SM-P-90', navn: 'Bord 7',
      telefon: '00000000', email: null,
      hent_dato: '2026-08-07', hent_tid: '13:00',
      linjer: [{ navn: 'Fadøl, lille', antal: 2, pris: 35 }], fyld: [], antal: 2,
      besked: null, status: 'ny', hvordan: 'spis_her', leverings_adresse: null,
      bord_nummer: '7', intern_note: null, slettet: null,
      oprettet: '2026-08-07T10:52:00Z',
    });
    return d;
  }

  test('en QR-bestilling står IKKE i dagens forløb', async ({ page }) => {
    await åbnAdmin(page, { data: medBord() });
    await expect(page.locator('#overblik-vagt')).not.toContainText('Bord 7');
    await expect(page.locator('#overblik-vagt')).not.toContainText('Fadøl');
    // Lugens fem er der stadig — bordet er taget ud, ikke listen
    await expect(page.locator('#overblik-vagt .vagt-tid')).toHaveCount(5);
  });

  test('den står i sin egen boks med en vej til køkken-køen', async ({ page }) => {
    await åbnAdmin(page, { data: medBord() });
    const kort = page.locator('#bord-koe-kort');
    await expect(kort).not.toHaveClass(/skjult/);
    await expect(kort).toContainText('1');
    await expect(kort).toContainText('bord');

    await kort.locator('button', { hasText: 'Åbn køkken-køen' }).click();
    await expect(page.locator('#p-koekken')).not.toHaveClass(/skjult/);
  });

  /* Et afsnit uden noget at vise findes ikke — ellers står der en
     tom overskrift, der ligner en kø, nogen har glemt. */
  test('uden QR-bestillinger findes boksen slet ikke', async ({ page }) => {
    await åbnAdmin(page, { data: travlDag() });
    await expect(page.locator('#bord-koe-kort')).toHaveClass(/skjult/);
  });

  /* ⚠️ ET FÆRDIGT BORD FYLDER IKKE I KØEN. Køen er dét, køkkenet
     stadig skal af sted med. */
  test('et serveret bord er ude af køen igen', async ({ page }) => {
    const d = medBord();
    d.bestillinger[d.bestillinger.length - 1].status = 'serveret';
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#bord-koe-kort')).toHaveClass(/skjult/);
  });

  /* ⚠️ TALLENE SKAL OGSÅ DELE SIG. Ét felt med summen ville
     skjule netop den forskel, hele fanen er bygget om for at
     vise — og et travlt bord ville se ud som en travl luge. */
  test('dagens tal har et felt til hver', async ({ page }) => {
    await åbnAdmin(page, { data: medBord() });
    const felt = (navn) => page.locator('#overblik-tal .tal-felt', { hasText: navn })
      .locator('.tal-tal');
    await expect(felt('Til lugen i dag')).toHaveText('5');
    await expect(felt('Fra bordene i dag')).toHaveText('1');
  });
});

/* ============================================================
   PRODUKTION I ALT
   ------------------------------------------------------------
   Uden den skal køkkenet selv lægge "2 × pasta" og "3 × pasta"
   og "1 × pasta" sammen i hovedet, midt i en frokost, hver gang
   de vil vide, hvor mange der skal på panden.

   ⚠️ HER ER BORDENE MED, og det modsiger ikke adskillelsen.
   Forløbet handler om HVORNÅR noget skal ud; produktionen om
   HVOR MEGET der skal laves — og der skal alt tælle med, ellers
   laver køkkenet for lidt. Derfor står tallet DELT.
   ============================================================ */
test.describe('Produktion i alt', () => {

  function toGangeDetSamme() {
    const d = grunddata();
    const b = (id, navn, vare, antal, ekstra) => Object.assign({
      id, lokation_id: 'mosede', reference: 'SM-P-' + id, navn,
      telefon: '20304050', email: null,
      hent_dato: '2026-08-07', hent_tid: '13:30',
      linjer: [{ navn: vare, antal, pris: 45 }], fyld: [], antal,
      besked: null, status: 'bekraeftet', hvordan: 'afhentning',
      leverings_adresse: null, intern_note: null, slettet: null,
      oprettet: '2026-08-07T10:00:00Z',
    }, ekstra || {});

    d.borde = [{ id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4,
      placering: 'ude', aktiv: true, sortering: 10 }];
    d.bestillinger = [
      b(1, 'Anna Vind', 'Fiskefilet', 2),
      b(2, 'Jonas Berg', 'Fiskefilet', 3),
      b(3, 'Mette Holm', 'Burger', 1),
      b(4, 'Bord 7', 'Fiskefilet', 4, { hvordan: 'spis_her', bord_nummer: '7' }),
    ];
    return d;
  }

  test('den samme ret lægges sammen på tværs af bestillingerne', async ({ page }) => {
    await åbnAdmin(page, { data: toGangeDetSamme() });
    const fisk = page.locator('.prod-pille', { hasText: 'Fiskefilet' });
    await expect(fisk.locator('.prod-antal')).toHaveText('9');
  });

  test('tallet er delt i ud af huset og spist her', async ({ page }) => {
    await åbnAdmin(page, { data: toGangeDetSamme() });
    const fisk = page.locator('.prod-pille', { hasText: 'Fiskefilet' });
    // 2 + 3 ud ad lugen, 4 ved bord 7
    await expect(fisk.locator('.prod-delt')).toHaveText('🥡 5 · 🍽️ 4');
  });

  test('den travleste ret står først', async ({ page }) => {
    await åbnAdmin(page, { data: toGangeDetSamme() });
    const piller = page.locator('.prod-pille .prod-navn');
    await expect(piller.nth(0)).toHaveText('Fiskefilet');
    await expect(piller.nth(1)).toHaveText('Burger');
  });

  /* ⚠️ DET AFVISTE BLIVER ALDRIG LAVET. Talte det med, ville
     køkkenet stå med mad, ingen har bestilt. Det AFHENTEDE tæller
     derimod med: det ER lavet, og "i alt" skal blive ved med at
     være dagens tal, også kl. 21. */
  test('afvist tæller ikke med — afhentet gør', async ({ page }) => {
    const d = toGangeDetSamme();
    d.bestillinger[0].status = 'afvist';      // 2 fiskefileter
    d.bestillinger[1].status = 'afhentet';    // 3 fiskefileter
    await åbnAdmin(page, { data: d });
    const fisk = page.locator('.prod-pille', { hasText: 'Fiskefilet' });
    await expect(fisk.locator('.prod-antal')).toHaveText('7');
  });

  test('uden bestillinger findes afsnittet slet ikke', async ({ page }) => {
    const d = grunddata();
    d.bestillinger = [];
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#produktion-kort')).toHaveClass(/skjult/);
  });
});

test.describe('Fanerne på en telefon', () => {

  test.skip(({ isMobile }) => !isMobile, 'kun i telefonprofilen');

  test('striben ligger i bunden og fylder ikke skærmen', async ({ page }) => {
    /* MÅLINGEN, DER STARTEDE DET HELE: 344 px høj, sluttede 599 px
       nede på en 844 px skærm. Loftet her er sat, så en stribe,
       der en dag ombrydes igen, bliver opdaget. */
    await åbnAdmin(page);
    const m = await page.evaluate(() => {
      const f = document.querySelector('.faner');
      const c = getComputedStyle(f);
      const r = f.getBoundingClientRect();
      return { position: c.position, hoejde: Math.round(r.height),
               bund: Math.round(r.bottom), skaerm: window.innerHeight };
    });
    expect(m.position).toBe('fixed');
    expect(m.hoejde, `striben fylder ${m.hoejde} px — den er ombrudt igen`)
      .toBeLessThan(90);
    // Den skal slutte ved skærmens underkant, ikke svæve
    expect(Math.abs(m.bund - m.skaerm)).toBeLessThanOrEqual(2);
  });

  test('striben dækker ikke det sidste kort', async ({ page }) => {
    /* Uden luft i bunden kan man ikke trykke "Afhentet" på dagens
       sidste bestilling — knappen ligger under striben. */
    await åbnAdmin(page, { data: travlDag() });

    /* Den bløde rulning slås fra. Tre udgaver blev prøvet og
       kasseret først, og alle tre målte det samme forkerte:
       scrollTo(body.scrollHeight) landede 74 px før bunden,
       scrollTo(documentElement.scrollHeight) landede 376 px før
       — springet blev afbrudt af scroll-behavior — og
       scrollIntoViewIfNeeded ruller MINDST muligt og ved ikke,
       at der ligger en fast stribe over bunden.

       Alle tre meldte, at kortet lå under striben. Det gjorde
       det også: man var bare ikke rullet ned til det endnu.
       Her måles LAYOUTET, ikke animationen. */
    await page.addStyleTag({ content: '*{scroll-behavior:auto !important}' });
    await page.evaluate(() => window.scrollTo(0,
      document.documentElement.scrollHeight));
    await page.waitForTimeout(300);

    const m = await page.evaluate(() => {
      const f = document.querySelector('.faner').getBoundingClientRect();
      const kort = document.querySelectorAll('#p-overblik .kort');
      const r = kort[kort.length - 1].getBoundingClientRect();
      const d = document.documentElement;
      return {
        daekket: Math.round(Math.max(0, r.bottom - f.top)),
        tilbage: Math.round(d.scrollHeight - window.innerHeight - window.scrollY),
      };
    });
    expect(m.tilbage, 'siden blev ikke rullet helt ned').toBeLessThanOrEqual(2);
    expect(m.daekket,
      `${m.daekket} px af det sidste kort ligger under striben`).toBe(0);
  });

  test('den valgte fane er markeret, også når der skiftes fra et kort',
    async ({ page }) => {
    await åbnAdmin(page, { data: travlDag() });
    await page.locator('#overblik-vagt .nyt-aabn').first().click();
    const valgt = page.locator('.faner button[aria-selected="true"]');
    await expect(valgt).toHaveCount(1);
    await expect(valgt).toContainText('Bestillinger');
    await expect(page.locator('#p-bestillinger')).not.toHaveClass(/skjult/);
  });
});

/* ============================================================
   NOTEN TIL DAGEN — SKREVET DIREKTE PÅ KØREPLANEN
   ------------------------------------------------------------
   Den stod som en LINJE med en knap til kalenderen før. Kundens
   billeder (26/8) har feltet på selve køreplanen, og det er
   rigtigt: en note til i dag skrives, mens man står med dagen —
   ikke efter et faneskift.

   ⚠️ DEN FARLIGE DEL ER OPRETTELSEN. Rækken kendes kun på sin
   TITEL ("Note til dagen"), og uden en id opretter skrivningen en
   NY række hver gang. Autogem skriver 1,2 sekund efter sidste
   tastetryk, og listen hentes ikke imellem — fem pauser i
   tastningen ville blive til fem noter på dagen, uden en fejl
   nogen steder, og de fire ville ligne arrangementer.
   ============================================================ */
test.describe('Noten til i dag', () => {

  test('feltet står på køreplanen og gemmer, når det forlades', async ({ page }) => {
    await åbnAdmin(page);
    const felt = page.locator('#plan-note-felt');
    await expect(felt).toBeVisible();

    await felt.fill('Henning kommer kl. 18');
    await felt.blur();
    await expect(page.locator('#overblik-koereplan .gemt-maerke')).toHaveText('✓ Gemt');

    const gemt = await gemteData(page);
    const noter = gemt.kalender.filter((k) => k.titel === 'Note til dagen');
    expect(noter).toHaveLength(1);
    expect(noter[0].beskrivelse).toBe('Henning kommer kl. 18');
    expect(noter[0].dato).toBe('2026-08-07');
    // ⚠️ Den må ALDRIG være offentlig: den er personalets.
    expect(noter[0].offentlig).toBe(false);
  });

  /* SELVE FEJLEN, målt. Uden garden bliver hver pause i
     tastningen til en ny række. */
  test('to gem i træk giver ÉN note, ikke to', async ({ page }) => {
    await åbnAdmin(page);
    const felt = page.locator('#plan-note-felt');

    await felt.fill('Første');
    await felt.blur();
    await expect(page.locator('#overblik-koereplan .gemt-maerke')).toHaveText('✓ Gemt');

    await felt.fill('Første og andet');
    await felt.blur();
    await page.waitForTimeout(400);

    const gemt = await gemteData(page);
    const noter = gemt.kalender.filter((k) => k.titel === 'Note til dagen');
    expect(noter, 'der blev oprettet en note pr. gem').toHaveLength(1);
    expect(noter[0].beskrivelse).toBe('Første og andet');
  });

  /* En tom note er ingen note. Blev den gemt som en tom række,
     ville dagen bære et blyantsmærke uden noget bag. */
  test('tømmes feltet, slettes noten', async ({ page }) => {
    await åbnAdmin(page);
    const felt = page.locator('#plan-note-felt');

    await felt.fill('Skal væk igen');
    await felt.blur();
    await expect(page.locator('#overblik-koereplan .gemt-maerke')).toHaveText('✓ Gemt');

    await felt.fill('');
    await felt.blur();
    await page.waitForTimeout(400);

    const gemt = await gemteData(page);
    expect(gemt.kalender.filter((k) => k.titel === 'Note til dagen')).toHaveLength(0);
  });

  /* ⚠️ EN NOTE ER IKKE ET ARRANGEMENT. Rækken kendes på sin
     titel, og skifter den, bliver alle skrevne noter til
     arrangementer på dagen — synlige i kalendernettet som noget,
     der sker. Prøven her holder titlen fast. */
  test('noten er en intern kalenderrække med den faste titel', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('#plan-note-felt').fill('Personalets egen');
    await page.locator('#plan-note-felt').blur();
    await expect(page.locator('#overblik-koereplan .gemt-maerke')).toHaveText('✓ Gemt');

    const gemt = await gemteData(page);
    const note = gemt.kalender.filter((k) => k.titel === 'Note til dagen')[0];
    expect(note.type).toBe('arrangement');
    expect(note.offentlig).toBe(false);
  });

  /* ⚠️ TAKTEN MÅ IKKE SLUGE EN SÆTNING. Fanen tegnes om, hver
     gang en liste melder sig ind — hvert minut. Skrev nogen midt
     i det, ville optegningen sætte feltets værdi tilbage til
     det gemte, og den halve sætning var væk. */
  test('en optegning tager ikke det skrevne ud af hånden', async ({ page }) => {
    await åbnAdmin(page);
    const felt = page.locator('#plan-note-felt');
    await felt.click();
    await felt.fill('En halv sætning, der ikke er gemt endnu');

    // Hele fanen tegnes om, mens markøren står i feltet
    await page.evaluate(() => Admin.efterHent.forEach((f) => f()));

    await expect(felt).toHaveValue('En halv sætning, der ikke er gemt endnu');
  });
});
