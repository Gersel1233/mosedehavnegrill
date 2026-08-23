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
const { åbnAdmin, grunddata } = require('./hjaelp');

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
    await expect(tider).toHaveCount(3);
    await expect(tider.nth(0)).toHaveText('13.15');
    await expect(tider.nth(1)).toHaveText('13.30');
    await expect(tider.nth(2)).toHaveText('14.00');
  });

  test('det der ligger langt ude står under Senere i dag', async ({ page }) => {
    await åbnAdmin(page, { data: travlDag() });
    const senere = page.locator('#overblik-senere .vagt-tid');
    await expect(senere).toHaveCount(2);
    await expect(senere.nth(0)).toHaveText('17.30');
    await expect(senere.nth(1)).toHaveText('18.00');
    await expect(page.locator('#vagt-senere-kort')).not.toHaveClass(/skjult/);
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

  test('en bestilling til en anden dag står for sig, ikke i dagens liste',
    async ({ page }) => {
    /* Den gamle rækkefølge var god til ét: en bestilling til på
       fredag, der lige er kommet ind, forsvinder ikke ud af syne.
       Den egenskab skal beholdes — bare ikke øverst. */
    const d = travlDag();
    d.bestillinger[0].hent_dato = '2026-08-14';   // Sara, en uge frem
    await åbnAdmin(page, { data: d });

    await expect(page.locator('#overblik-vagt')).not.toContainText('Sara Dam');
    await expect(page.locator('#overblik-senere')).not.toContainText('Sara Dam');
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
    await expect(page.locator('#overblik-vagt')).toContainText('Der er ikke mere i dag');
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
