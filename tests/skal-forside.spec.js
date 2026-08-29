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

/* ------------------------------------------------------------
   DE FIRE TOMME FIRKANTER  (29/8)

   Designet leverede fire <image-slot> — tapasfadet og
   selskabernes tre — og uden et foto tegnede de sig som stiplede
   grå kasser med "Foto: anretning" i midten. MÅLT på en iPhone
   13: galleriet alene var 740 px stiplet ingenting midt i
   afsnittet om selskaber. Kundens ord: "kedeligt hele vejen ned".

   Det er den SAMME fejl, nyhedskortene fik lukket 26/8 — den stod
   bare stadig fire steder til.
   ------------------------------------------------------------ */
test.describe('Forsidens tomme billedpladser', () => {

  const PLADSER = ['tapas-forside', 'selskab-1', 'selskab-2', 'selskab-3'];

  /* ⚠️ MÅLT PÅ DET, GÆSTEN KAN SE. Nyhedsafsnittet skjuler sig
     selv, når der ingen nyheder er, og designets to kort bliver
     liggende i HTML'en bag et display:none. De er ikke en tom
     kasse på forsiden — de er ingenting. Talte prøven ALLE
     <image-slot>, ville den kræve, at vi ryddede op i noget,
     ingen kan se, og den ville sige god for en synlig kasse i et
     afsnit, vi havde glemt. */
  test('ingen tom billedplads er synlig for gæsten', async ({ page }) => {
    await åbn(page, '/index.html');
    // Vent til koblingen har kørt.
    await expect(page.locator('.foto-felt').first()).toBeVisible();

    const synlige = await page.locator('image-slot').evaluateAll(
      (el) => el.filter((s) => s.getClientRects().length > 0).map((s) => s.id),
    );
    expect(synlige, 'en stiplet grå kasse står stadig på forsiden').toEqual([]);
  });

  /* Og med nyheder i databasen skiftes NYHEDSKORTENES pladser
     også ud — også når slags-kolonnen mangler, fordi
     nyheder-slags-og-billede.sql ikke er kørt. Det var netop DA,
     kassen stod der. */
  test('heller ikke på et nyhedskort uden slags', async ({ page }) => {
    const d = grunddata();
    d.nyheder = [{
      id: 'n1', lokation_id: 'mosede', titel: 'Længere åbent',
      tekst: 'Vi holder åbent til 21 fredag og lørdag.',
      dato: '2026-08-06', aktiv: true,
    }];
    await åbn(page, '/index.html', { data: d });

    await expect(page.locator('.nw h3')).toHaveText('Længere åbent');
    await expect(page.locator('.nw image-slot')).toHaveCount(0);
    await expect(page.locator('.nw .nw-felt')).toHaveCount(1);
  });

  test('hver plads får en flade med sit eget tegn', async ({ page }) => {
    await åbn(page, '/index.html');
    /* De fire, gæsten faktisk ser. Nyhedsafsnittet er skjult uden
       nyheder, og dets to pladser får også en flade — de tæller
       ikke med her, for de er ingenting på skærmen. */
    const felter = page.locator('.tapasec .foto-felt, .gal .foto-felt');
    await expect(felter).toHaveCount(PLADSER.length);

    /* ⚠️ TEGNET SKAL VÆRE PLADSENS EGET. Fik alle fire den samme
       tallerken, ville galleriet være tre ens felter — og så er
       det stadig en flade, gæsten ruller forbi. */
    const tegn = await felter.allTextContents();
    expect(new Set(tegn).size, 'fladerne må ikke have samme tegn på stribe')
      .toBeGreaterThan(1);
    for (const t of tegn) expect(t.trim().length, 'en flade uden tegn').toBeGreaterThan(0);
  });

  /* Fladen er en RESERVE, ikke et mål: har ejeren lagt et foto op
     i admin → Forside, er det fotoet, gæsten skal se. */
  test('men et rigtigt foto vinder over fladen', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger, {
      foto_tapas: 'https://eksempel.dk/fad.jpg',
    });
    await åbn(page, '/index.html', { data: d });

    const foto = page.locator('.tapasec img.foto-fyldt');
    await expect(foto).toHaveCount(1);
    await expect(foto).toHaveAttribute('src', 'https://eksempel.dk/fad.jpg');
    // Og fladen står ikke bagved.
    await expect(page.locator('.tapasec .foto-felt')).toHaveCount(0);
    // De tre andre står stadig som flader.
    await expect(page.locator('.gal .foto-felt')).toHaveCount(3);
  });

  /* ⚠️ FLADERNE SKAL OP, OGSÅ NÅR HENTNINGEN FEJLER. De har ingen
     data bag sig — tegnet står i HTML'en. Blev de stående dér,
     ville en side, hvor hentningen fejlede, være den side med
     FLEST stiplede grå kasser, og det er lige præcis den dag, den
     skal se hel ud. */
  test('og de kommer op, selv når hentningen fejler', async ({ page }) => {
    /* Butik.hent gøres til et afvist løfte, I DET SEKUND store.js
       sætter Butik på window — altså før js/skal/forside.js
       overhovedet er læst. Det er den eneste måde at ramme
       .catch()-grenen udefra. */
    await page.addInitScript(() => {
      var ægte;
      Object.defineProperty(window, 'Butik', {
        configurable: true,
        get: function () { return ægte; },
        set: function (v) {
          ægte = v;
          if (v && typeof v.hent === 'function') {
            v.hent = function () { return Promise.reject(new Error('prøve: nede')); };
          }
        },
      });
    });
    await åbn(page, '/index.html');

    // Fire pladser med et felt i admin + nyhedskortenes to.
    await expect(page.locator('.foto-felt')).toHaveCount(6);
    const synlige = await page.locator('image-slot').evaluateAll(
      (el) => el.filter((s) => s.getClientRects().length > 0).map((s) => s.id),
    );
    expect(synlige, 'en nede database må ikke koste fire grå kasser').toEqual([]);
  });

  /* Fladen må ikke se ud som en fejl. Er den lige så høj som
     designets plads, læses den som et billede, der venter — er
     den nul px, er afsnittet faldet sammen. */
  test('fladen fylder pladsens egen højde', async ({ page }) => {
    await åbn(page, '/index.html');
    const h = await page.locator('.tapasec .foto-felt')
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(h, 'tapasfadets flade er faldet sammen').toBeGreaterThan(120);

    const stor = await page.locator('.gal .foto-felt.tall')
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(stor, 'galleriets store felt er faldet sammen').toBeGreaterThan(200);
  });
});

/* ------------------------------------------------------------
   ET ANSIGT PR. KATEGORI I BESTILLINGEN  (29/8)

   Kundens ord: "mangler også emojis på front siden … får kunderne
   det kedeligt hele vejen ned". MÅLT: fem rækker ren tekst — Grill
   fra pladen, Smørrebrød, Is og desserter, Drikkevarer, Tilbehør —
   hvor menukortet og bordsiden for længst havde tegn på de SAMME
   kategorier. Den, der læser kortet og derefter bestiller, mødte
   to forskellige lister over det samme sortiment.
   ------------------------------------------------------------ */
test.describe('Kategorierne har et ansigt i bestillingen', () => {

  test('hver kategorirække har sit tegn', async ({ page }) => {
    await åbn(page, '/index.html');
    const rækker = page.locator('#bestil .item[data-kategori]');
    const antal = await rækker.count();
    expect(antal, 'der er ingen kategorirækker at måle på').toBeGreaterThan(0);

    for (let i = 0; i < antal; i++) {
      const tegn = rækker.nth(i).locator('.kat-tegn');
      await expect(tegn, 'en kategori uden tegn').toHaveCount(1);
      expect((await tegn.textContent()).trim().length).toBeGreaterThan(0);
    }
  });

  /* ⚠️ TEGNET MÅ IKKE STÅ INDE I <h4>. Gjorde det det, ville
     overskriftens tekst hedde "🍞Smørrebrød" — og både prøverne
     og en skærmlæser læser netop den tekst. */
  test('men navnet står rent i overskriften', async ({ page }) => {
    await åbn(page, '/index.html');
    const række = page.locator('#bestil .item[data-kategori]').first();
    const navn = await række.getAttribute('data-kategori');
    await expect(række.locator('h4')).toHaveText(navn);
    await expect(række.locator('h4 .kat-tegn')).toHaveCount(0);
  });

  /* Tegnet er pynt. En skærmlæser skal høre "Smørrebrød", ikke
     "brød Smørrebrød". */
  test('og tegnet er skjult for skærmlæsere', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#bestil .item[data-kategori] .kat-tegn').first())
      .toHaveAttribute('aria-hidden', 'true');
  });

  /* ⚠️ DEN ENE LISTE. Bestillingen, menukortet og bordsiden skal
     vise det SAMME tegn på den samme kategori — ellers møder
     gæsten, der kigger på kortet og derefter bestiller, to
     forskellige lister over det samme sortiment. */
  test('og det er det SAMME tegn som på menukortet', async ({ page }) => {
    await åbn(page, '/index.html');
    const fra = await page.locator('#bestil .item[data-kategori]')
      .evaluateAll((el) => el.map((r) => [
        r.getAttribute('data-kategori'),
        r.querySelector('.kat-tegn').textContent.trim(),
      ]));
    expect(fra.length).toBeGreaterThan(0);

    await åbn(page, '/m-menukort.html');
    for (const [navn, tegn] of fra) {
      const påKortet = await page.evaluate(
        (n) => window.MosedeEmoji.forKategori(n),
        navn,
      );
      expect(påKortet, navn + ' har to ansigter').toBe(tegn);
    }
  });
});

/* ------------------------------------------------------------
   BILLEDER PÅ FORSIDEN — ADMIN  (29/8)

   Fladerne ovenfor er en RESERVE, ikke et mål. Her lægger ejeren
   de rigtige billeder op, og fanen skal kunne det uden en linje
   SQL: adresserne bor i indstillinger, som er nøgle/værdi.
   ------------------------------------------------------------ */
const { åbnAdmin, gemteData } = require('./hjaelp');

test.describe('Billeder på forsiden i admin', () => {

  async function åbnForsidefanen(page) {
    await åbnAdmin(page, { data: grunddata() });
    await page.locator('[data-panel="p-forside"]').click();
    await expect(page.locator('#forside-fotos')).toBeVisible();
  }

  test('der er en række pr. plads på forsiden', async ({ page }) => {
    await åbnForsidefanen(page);
    const rækker = page.locator('#foto-felter .foto-raekke');
    await expect(rækker).toHaveCount(5);

    /* ⚠️ TEKSTEN VED HVER PLADS SKAL SIGE HVOR PÅ SIDEN. Står der
       bare "Billede 1", ved ingen, hvor det havner — og et foto af
       en sandwich i tapasfadets plads er en forkert oplysning om
       maden, ikke bare et skævt billede. */
    for (let i = 0; i < 5; i++) {
      await expect(rækker.nth(i).locator('.hjaelp')).not.toBeEmpty();
    }
  });

  /* ⚠️ KORTET STÅR ALTID. Der er ingen kolonne at tjekke for —
     findes storage-spanden ikke, siger uploaden det selv med den
     linje, der fortæller ejeren, hvad han skal gøre i
     dashboardet. Et skjult kort ville skjule netop den besked. */
  test('kortet står, også uden ét eneste billede lagt op', async ({ page }) => {
    await åbnForsidefanen(page);
    await expect(page.locator('#forside-fotos')).toBeVisible();
    await expect(page.locator('#foto-felter .foto-mini.tom')).toHaveCount(5);
  });

  test('et lagt billede får en Fjern-knap — en tom plads har ingen', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger, {
      foto_tapas: 'https://eksempel.dk/fad.jpg',
    });
    await åbnAdmin(page, { data: d });
    await page.locator('[data-panel="p-forside"]').click();

    const fad = page.locator('.foto-raekke[data-foto="foto_tapas"]');
    await expect(fad.locator('img.foto-mini')).toHaveCount(1);
    await expect(fad.getByRole('button', { name: 'Fjern' })).toHaveCount(1);

    const tom = page.locator('.foto-raekke[data-foto="foto_selskab_1"]');
    await expect(tom.getByRole('button', { name: 'Fjern' })).toHaveCount(0);
  });

  /* TOMT, IKKE SLETTET. Adressen sættes til "", og forsiden tegner
     fladen igen af sig selv. Filen i spanden rører vi ikke — den
     kan være lagt op et andet sted. */
  test('Fjern tømmer indstillingen, så fladen kommer igen', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger, {
      foto_tapas: 'https://eksempel.dk/fad.jpg',
    });
    await åbnAdmin(page, { data: d });
    await page.locator('[data-panel="p-forside"]').click();

    await page.locator('.foto-raekke[data-foto="foto_tapas"]')
      .getByRole('button', { name: 'Fjern' }).click();
    await expect(page.locator('#kvittering')).toContainText('fjernet');

    expect((await gemteData(page)).indstillinger.foto_tapas).toBe('');
  });
});

/* ------------------------------------------------------------
   OG DEN SAMME KASSE STOD PÅ TO SIDER TIL  (29/8)

   Reglen bor i js/skal/billedplads.js. Prøven her er den, der
   holder den ÉNE regel i live: går tapassiden eller baglokalets
   side sin egen vej, kan de to sider tegne hver sin flade, og
   ingen ville opdage det — hver side ser jo rigtig ud for sig.
   ------------------------------------------------------------ */
test.describe('De tomme billedpladser på de andre sider', () => {

  for (const [sti, hvad] of [
    ['/m-tapas.html', 'tapasfadet'],
    ['/h-baglokale.html', 'baglokalet'],
  ]) {
    test(`${sti} har ingen stiplet grå kasse`, async ({ page }) => {
      await åbn(page, sti);
      await expect(page.locator('.foto-felt')).toHaveCount(1);

      const synlige = await page.locator('image-slot').evaluateAll(
        (el) => el.filter((s) => s.getClientRects().length > 0).map((s) => s.id),
      );
      expect(synlige, `en tom plads står stadig ved ${hvad}`).toEqual([]);

      /* ⚠️ OG FLADEN SKAL HAVE PLADSENS EGEN HØJDE. Uden en
         højderegel falder feltet sammen til skriftens 52 px, og
         afsnittet ser ud, som om billedet er halvt indlæst —
         værre end den grå kasse, det afløste. Et antal på 1 ville
         bestå glimrende imens. */
      const h = await page.locator('.foto-felt')
        .evaluate((el) => el.getBoundingClientRect().height);
      expect(h, `fladen ved ${hvad} er faldet sammen`).toBeGreaterThan(150);
    });
  }

  /* ⚠️ TAPASFADET ER ÉT FOTO PÅ TO SIDER. To felter til det samme
     fad ville betyde, at ejeren skiftede det ene og glemte det
     andet — og så så gæsten to forskellige fade på vejen fra
     forsiden til bestillingen. */
  test('og forsidens tapasfoto er tapassidens', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger, {
      foto_tapas: 'https://eksempel.dk/fad.jpg',
    });

    for (const sti of ['/index.html', '/m-tapas.html']) {
      await åbn(page, sti, { data: d });
      await expect(page.locator('img.foto-fyldt').first())
        .toHaveAttribute('src', 'https://eksempel.dk/fad.jpg');
    }
  });
});
