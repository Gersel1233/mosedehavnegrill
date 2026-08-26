/* Forsidens kobling til databasen.

   Designet fra Claude Design er skallen, og den skal blive
   stående. Prøverne her måler to ting på én gang:

   1) at forretningens rigtige tal kommer PÅ siden
   2) at designets pladsholder bliver stående, når databasen
      ikke har noget at sige

   Nummer to er den, der er let at tabe: en kobling, der skriver
   "—" eller "0,-" hen over designet, når et felt er tomt, er
   værre end ingen kobling. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

// 2026-08-07 er en FREDAG, og uret står 11:00Z = 13:00 dansk tid.
const FREDAG_MIDT_PÅ_DAGEN = '2026-08-07T11:00:00Z';

/* De nye sider åbnes med åbnSkal: ingen intro at springe over,
   og Google Fonts spærres, fordi stylesheetet i <head> ellers
   holder sideindlæsningen tilbage i tolv sekunder i prøvemiljøet.
   Grunden står i tests/hjaelp.js. */
async function åbn(page, sti, valg) {
  await åbnSkal(page, sti, Object.assign({ ur: FREDAG_MIDT_PÅ_DAGEN }, valg || {}));
}

test.describe('Forsidens kobling', () => {
  test('statuspillen viser den rigtige åbningsstatus', async ({ page }) => {
    await åbn(page, '/index.html', { ur: FREDAG_MIDT_PÅ_DAGEN });

    // Designets pladsholder er "Lukket lige nu · åbner 10.00".
    // Ugeplanen i prøvedataene siger 11–21, og klokken er 13.
    await expect(page.locator('.hero .status')).toContainText('Åbent nu');
    await expect(page.locator('.hero .status')).toContainText('21:00');

    // Prikken er designets egen og skal overleve, at teksten skiftes.
    await expect(page.locator('.hero .status .dot')).toHaveCount(1);
  });

  test('lukket forretning står som lukket', async ({ page }) => {
    const data = grunddata();
    data.indstillinger.saeson = { lukket: true, aabner_igen: '', besked: 'Vi ses til april.' };
    await åbn(page, '/index.html', { ur: FREDAG_MIDT_PÅ_DAGEN, data });

    await expect(page.locator('.hero .status')).toContainText('Lukket for sæsonen');
  });

  test('dagens ret kommer fra admin — og afsnittet forsvinder, når der ikke er en', async ({ page }) => {
    const data = grunddata();
    data.indstillinger.dagens_ret = {
      navn: 'Stegt rødspætte med persillesovs',
      beskrivelse: 'Fanget i Køge Bugt.',
      pris: 118,
    };
    await åbn(page, '/index.html', { ur: FREDAG_MIDT_PÅ_DAGEN, data });

    await expect(page.locator('#idag h3')).toHaveText('Stegt rødspætte med persillesovs');
    await expect(page.locator('#idag .today p')).toHaveText('Fanget i Køge Bugt.');
    await expect(page.locator('#idag .price')).toHaveText('118,-');
    // Datolinjen skal følge dagen, ikke designets 23. august
    await expect(page.locator('#idag .eyebrow')).toContainText('7. august');

    // Uden en ret må designets pladsholder ikke stå tilbage som
    // dagens ret — så findes afsnittet ikke.
    await åbn(page, '/index.html', { ur: FREDAG_MIDT_PÅ_DAGEN });
    await expect(page.locator('#idag')).toBeHidden();
  });

  test('en ret uden pris får ingen pris — ikke et nul', async ({ page }) => {
    const data = grunddata();
    data.indstillinger.dagens_ret = { navn: 'Grillet makrel', beskrivelse: '', pris: null };
    await åbn(page, '/index.html', { ur: FREDAG_MIDT_PÅ_DAGEN, data });

    await expect(page.locator('#idag h3')).toHaveText('Grillet makrel');
    await expect(page.locator('#idag .price')).toBeHidden();
  });

  test('nyhederne kommer fra databasen', async ({ page }) => {
    const data = grunddata();
    data.nyheder = [
      { id: 2, titel: 'Ny softice-smag', tekst: 'Hyldeblomst fra i morgen.', dato: '2026-08-05', aktiv: true },
      { id: 1, titel: 'Længere åbent', tekst: 'Vi holder åbent til 21 i august.', dato: '2026-07-28', aktiv: true },
    ];
    await åbn(page, '/index.html', { ur: FREDAG_MIDT_PÅ_DAGEN, data });

    await expect(page.locator('.newslist .nw')).toHaveCount(2);
    await expect(page.locator('.newslist .nw h3').first()).toHaveText('Ny softice-smag');
    await expect(page.locator('.newslist .nw .when').first()).toHaveText('5. august');
    // Designets to opdigtede nyheder må ikke stå tilbage
    await expect(page.locator('#nyheder')).not.toContainText('Havnens tapas er landet');
  });

  test('de nye nyhedskort er synlige, ikke bare til stede', async ({ page }) => {
    /* .rev står med opacity:0 i designet og bliver først synlig,
       når indfaldet sætter .in på. Kort, vi laver EFTER
       indlæsningen, kender designets iagttager ikke — og en prøve
       på teksten består glimrende på et usynligt kort. Derfor
       måles den beregnede gennemsigtighed. */
    const data = grunddata();
    data.nyheder = [{ id: 1, titel: 'Ny softice-smag', tekst: 'Hyldeblomst.', dato: '2026-08-05', aktiv: true }];
    await åbn(page, '/index.html', { data });

    const kort = page.locator('.newslist .nw').first();
    await kort.scrollIntoViewIfNeeded();
    await expect(kort).toHaveCSS('opacity', '1');
  });

  test('ingen nyheder = intet nyhedsafsnit', async ({ page }) => {
    await åbn(page, '/index.html', { ur: FREDAG_MIDT_PÅ_DAGEN });
    await expect(page.locator('#nyheder')).toBeHidden();
  });

  test('åbningstiderne er ugeplanens — og i dag har sin egen linje', async ({ page }) => {
    const data = grunddata();
    data.aabningstider = [
      { lokation_id: 'mosede', ugedag: 0, lukket: false, aabner: '10:00', lukker: '20:00' },
      { lokation_id: 'mosede', ugedag: 1, lukket: false, aabner: '10:00', lukker: '20:00' },
      { lokation_id: 'mosede', ugedag: 2, lukket: false, aabner: '10:00', lukker: '20:00' },
      { lokation_id: 'mosede', ugedag: 3, lukket: false, aabner: '10:00', lukker: '20:00' },
      { lokation_id: 'mosede', ugedag: 4, lukket: false, aabner: '10:00', lukker: '21:00' },
      { lokation_id: 'mosede', ugedag: 5, lukket: false, aabner: '10:00', lukker: '21:00' },
      { lokation_id: 'mosede', ugedag: 6, lukket: true, aabner: null, lukker: null },
    ];
    await åbn(page, '/index.html', { ur: FREDAG_MIDT_PÅ_DAGEN, data });

    // Ens dage slås sammen, som i designet
    const linjer = page.locator('.hours div');
    await expect(linjer).toHaveCount(4);
    await expect(linjer.nth(0)).toContainText('Mandag – torsdag');
    await expect(linjer.nth(0)).toContainText('10–20');
    // Fredag er i dag og står for sig selv, markeret
    await expect(page.locator('.hours div.now')).toHaveCount(1);
    await expect(page.locator('.hours div.now')).toContainText('Fredag (i dag)');
    await expect(linjer.nth(3)).toContainText('Lukket');
  });

  test('musikbanneret viser næste offentlige arrangement — ellers findes det ikke', async ({ page }) => {
    const data = grunddata();
    data.kalender = [
      {
        id: 1, lokation_id: 'mosede', type: 'arrangement', dato: '2026-08-29',
        slut_dato: null, titel: 'Ronni & de Salte på molen',
        beskrivelse: 'Spiller 19–22.', emoji: '', lukker_kl: null, offentlig: true,
      },
      // Personalets egen note må ALDRIG i banneret
      {
        id: 2, lokation_id: 'mosede', type: 'arrangement', dato: '2026-08-08',
        slut_dato: null, titel: 'Bent har ferie', beskrivelse: '',
        emoji: '', lukker_kl: null, offentlig: false,
      },
    ];
    await åbn(page, '/index.html', { ur: FREDAG_MIDT_PÅ_DAGEN, data });

    await expect(page.locator('.music h4')).toHaveText('Ronni & de Salte på molen · lørdag d. 29. august');
    await expect(page.locator('.music')).not.toContainText('Bent har ferie');

    await åbn(page, '/index.html', { ur: FREDAG_MIDT_PÅ_DAGEN });
    await expect(page.locator('.music')).toBeHidden();
  });

  test('tapasprisen skrives kun, når forretningen har sat den', async ({ page }) => {
    // Ejerens liste kom uden ét eneste tal (23/8). Uden en pris
    // skal designets pladsholder blive stående.
    await åbn(page, '/index.html', { ur: FREDAG_MIDT_PÅ_DAGEN });
    await expect(page.locator('.tapasec .pris')).toContainText('199');

    const data = grunddata();
    data.menu_kategorier.push({ id: 20, afdeling: 'mad', navn: 'Til selskabet', sortering: 30, aktiv: true });
    data.menu_varer.push({
      id: 20, kategori_id: 20, navn: 'Tapasfad, pr. person', beskrivelse: null,
      pris: 145, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
    });
    await åbn(page, '/index.html', { ur: FREDAG_MIDT_PÅ_DAGEN, data });
    await expect(page.locator('.tapasec .pris')).toContainText('145 kr.');
    // "pr. person" under prisen er designets og skal overleve
    await expect(page.locator('.tapasec .pris small')).toHaveText('pr. person');
  });

  test('skallen er urørt: afsnittene står i designets rækkefølge', async ({ page }) => {
    /* Koblingen må fylde afsnit ud og skjule dem — den må ikke
       flytte, tilføje eller fjerne dem. Falder den her, er der
       lavet om på designet.

       ⚠️ ÉT AFSNIT ER KOMMET TIL SIDEN HANDOFFET, og det er en
       BESTILLING og ikke en beslutning, koblingen har taget:
       kunden bad 26/8 om, at dagens besked skulle vises "pænt og
       flot nærmest cinematisk med titel og tekst". Den står
       ØVERST, fordi den handler om NU — "i dag er der kun mad ud
       af huset". Længere nede ville gæsten læse den, EFTER hun
       havde valgt sin mad, og så er beskeden kommet for sent.

       Den er skjult, når der ikke er en besked, så designet ser
       ud præcis som før på en almindelig dag. Kommer der flere
       afsnit til, skal de have samme slags grund skrevet her. */
    await åbn(page, '/index.html', { ur: FREDAG_MIDT_PÅ_DAGEN });
    const ider = await page.$$eval('section[id]', (els) => els.map((e) => e.id));
    expect(ider).toEqual(['dagsbesked', 'idag', 'bestil', 'ugen', 'menu',
      'nyheder', 'omos', 'selskab', 'alt', 'find']);

    // Og på en dag uden en besked ser siden ud som designet:
    // afsnittet er der, men det fylder ingenting.
    await expect(page.locator('#dagsbesked')).toBeHidden();

    // Den flydende pille og heroens overskrift er designets egne
    await expect(page.locator('#bestil-pill')).toHaveCount(1);
    await expect(page.locator('.hero h1')).toContainText('Grillmad, smørrebrød og');
  });
});

/* ------------------------------------------------------------
   VEJEN IND TIL PERSONALESIDEN
   ------------------------------------------------------------
   "Personale" stod i bunden af de gamle sider — menu.html,
   bestil/, selskaber/ og resten. Den fulgte IKKE med, da forsiden
   blev skiftet ud 23/8, og kunden fandt det den 24/8: startede man
   på den nye forside, var der ingen vej ind i admin. Adressen
   virkede, men den skal man kende.

   Prøven går på ALLE de nye sider. Én side uden linket er en side,
   personalet lander på og ikke kan komme videre fra — og det var
   præcis sådan, hullet opstod første gang.
   ------------------------------------------------------------ */
const NYE_SIDER = [
  '/index.html', '/m-menukort.html', '/m-tapas.html',
  '/h-smorrebrod.html', '/h-selskaber.html', '/h-baglokale.html',
  '/h-catering.html', '/h-frokost.html', '/h-kalender.html',
];

test.describe('Personalesiden kan findes fra hjemmesiden', () => {
  for (const sti of NYE_SIDER) {
    test(`${sti} har vejen ind i bunden`, async ({ page }) => {
      await åbn(page, sti);
      const link = page.locator('.legal a[href$="admin.html"]');
      await expect(link).toHaveCount(1);
      await expect(link).toHaveText('Personale');
      /* nofollow, fordi admin selv er noindex. Uden den peger ni
         sider på en side, søgemaskinerne får at vide, de ikke må
         indeksere — det er et modsatrettet signal, ikke en fejl,
         men det er gratis at lade være. */
      await expect(link).toHaveAttribute('rel', 'nofollow');
    });
  }

  test('linket er til at læse på den mørke sidefod', async ({ page }) => {
    /* Den globale regel gør ethvert <a> rødt, og #d62a3a på
       sidefodens #1f1310 rammer 3,67:1 — under 4,5:1 på 11,5 px
       skrift. Prøven læser den BEREGNEDE farve, ikke stilarket:
       det var sådan den gule kant på telefonen blev fundet. */
    await åbn(page, '/index.html');
    const farve = await page.locator('.legal .personale-link')
      .evaluate((el) => getComputedStyle(el).color);
    expect(farve, 'linket må ikke arve den røde').not.toContain('214, 42, 58');
  });
});
