/* Forsiden.

   Vægten ligger tre steder:

   1) "Er der åbent?" – sidens vigtigste påstand. Står der åbent
      når der er lukket, cykler folk forgæves ned til havnen.

   2) At INTET OPDIGTET slipper ud. Prototypens eksempelværdier —
      "18,4 °C", "siden 1972", "54 somre" — må ikke stå nogen steder,
      og en tom oplysning skal vise ingenting frem for et gæt.

   3) At en tom pris aldrig bliver et tal. Fire varer på
      menukortet står med "ca." i forretningens eget kort, og de
      skal vise ingenting frem for et gæt.

   2026-08-07 er en fredag. Dansk sommertid = UTC+2, så 11:00Z er
   kl. 13 i Greve.
*/

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

test.describe('Åbent eller lukket', () => {

  test('midt på dagen står der åbent, med lukketid', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z' }); // kl. 13
    await expect(page.locator('#hero-status-tekst')).toHaveText('Åbent nu til 21:00');
    await expect(page.locator('#hero-status .dot')).not.toHaveClass(/lukket/);

    /* Havnestriben sagde det samme ("Lige nu · fredag / Åbent til
       21:00") 200 px længere ned og er fjernet. Der måles derfor kun
       på pillen – én kilde, ét sted at rette. */
  });

  test('før åbningstid står der hvornår vi åbner', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T07:30:00Z' }); // kl. 9.30
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket lige nu');
    await expect(page.locator('#hero-status-tekst')).toContainText('11:00');
    await expect(page.locator('#hero-status .dot')).toHaveClass(/lukket/);
  });

  test('efter lukketid peger den på næste dag', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T20:30:00Z' }); // kl. 22.30
    // Detaljen står i pillen selv: "Lukket for i dag · åbner i morgen 11:00"
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket for i dag');
    await expect(page.locator('#hero-status-tekst')).toContainText('Vi åbner i morgen kl. 11:00');
  });

  test('sidste halve time bliver sagt tydeligt', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T18:45:00Z' }); // kl. 20.45
    await expect(page.locator('#hero-status-tekst')).toContainText('15 min');
    await expect(page.locator('#hero-status .dot')).not.toHaveClass(/lukket/);
  });

  test('lige på klokkeslaget for lukning er der lukket', async ({ page }) => {
    // Grænsetilfælde: 21:00 præcis må ikke give "lukker om 0 min."
    await åbn(page, '/index.html', { ur: '2026-08-07T19:00:00Z' });
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket for i dag');
  });

  test('lige på klokkeslaget for åbning er der åbent', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T09:00:00Z' }); // kl. 11.00
    await expect(page.locator('#hero-status-tekst')).toContainText('Åbent nu');
  });

  test('en lukkedag slår ugeplanen', async ({ page }) => {
    const data = grunddata({
      lukkedage: [{ id: 1, lokation_id: 'mosede', dato: '2026-08-07', aarsag: 'Personaledag', emoji: '🔧' }],
    });
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z', data });
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket i dag');
    await expect(page.locator('#hero-status-tekst')).toContainText('Personaledag');
  });

  /* KALENDEREN, FASE 3. En lukkeperiode er ÉN række med en
     slutdato — ikke halvfems rækker. Før kalenderen sammenlignede
     koden bare på ét dato-felt tre steder, og med den regel ville
     kun periodens FØRSTE dag tælle som lukket: resten af vinteren
     ville stå som åben på forsiden, midt i lukningen.

     Testen rammer med vilje en dag INDE i perioden. Rammer den
     første dag, består den lige så pænt med den gamle regel. */
  test('en lukkeperiode lukker også dagene inde i den', async ({ page }) => {
    const data = grunddata({
      kalender: [{
        id: 1, lokation_id: 'mosede', type: 'lukkedag',
        dato: '2026-08-01', slut_dato: '2026-08-20',
        titel: 'Sommerferie', emoji: '🏖️', offentlig: true,
      }],
    });
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z', data });
    await expect(page.locator('#hero-status-tekst'),
      'dag 7 af en lukning fra den 1. til den 20. stod som åben')
      .toContainText('Lukket i dag');
    await expect(page.locator('#hero-status-tekst')).toContainText('Sommerferie');
  });

  test('dagen efter en lukkeperiode er der åbent igen', async ({ page }) => {
    /* Den modsatte side af samme grænse. Uden den kunne reglen
       være "altid lukket", og den første test ville stadig bestå. */
    const data = grunddata({
      kalender: [{
        id: 1, lokation_id: 'mosede', type: 'lukkedag',
        dato: '2026-08-01', slut_dato: '2026-08-06',
        titel: 'Sommerferie', offentlig: true,
      }],
    });
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z', data });
    await expect(page.locator('#hero-status-tekst')).toContainText('Åbent nu');
  });

  /* En tidlig lukning er ikke en lukkedag: der ER åbent, bare
     kortere. En gæst, der cykler ned kl. 19 til en luge, der
     lukkede 15, er lige så skuffet som en, der kom på en lukkedag. */
  test('en tidlig lukning flytter lukketiden', async ({ page }) => {
    const data = grunddata({
      kalender: [{
        id: 1, lokation_id: 'mosede', type: 'tidlig_lukning',
        dato: '2026-08-07', slut_dato: null, titel: 'Personalemøde',
        lukker_kl: '15:00', offentlig: false,
      }],
    });
    // Kl. 16 dansk tid: ugeplanen siger åbent til 21, kalenderen 15
    await åbn(page, '/index.html', { ur: '2026-08-07T14:00:00Z', data });
    await expect(page.locator('#hero-status-tekst'),
      'forsiden lovede åbent efter den tidlige lukketid')
      .toContainText('Lukket for i dag');
  });

  test('en tidlig lukning kan ikke forlænge dagen', async ({ page }) => {
    /* Står der i kalenderen, at der lukkes SENERE end ugeplanen,
       er det en tastefejl eller en aftale, ingen har bekræftet — og
       forsiden ville love en åben luge, efter personalet er gået
       hjem. Vi tager det tidligste af de to. */
    const data = grunddata({
      kalender: [{
        id: 1, lokation_id: 'mosede', type: 'tidlig_lukning',
        dato: '2026-08-07', slut_dato: null, titel: 'Tastefejl',
        lukker_kl: '23:30', offentlig: false,
      }],
    });
    // Kl. 22 dansk tid, ugeplanen lukker 21
    await åbn(page, '/index.html', { ur: '2026-08-07T20:00:00Z', data });
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket for i dag');
  });

  test('vinterlukning slår alt andet', async ({ page }) => {
    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        saeson: { lukket: true, aabner_igen: '1. april', besked: 'Tak for en god sæson!' },
      },
    });
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z', data });
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket for sæsonen');
    await expect(page.locator('#hero-status .dot')).toHaveClass(/lukket/);
  });
});

test.describe('Åbningstider', () => {

  test('ens dage lægges sammen, og i dag får sin egen linje', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z' }); // fredag
    const rk = page.locator('#hours div');

    await expect(rk).toHaveCount(3);
    await expect(rk.nth(0)).toContainText('Mandag – torsdag');
    await expect(rk.nth(1)).toContainText('Fredag (i dag)');
    await expect(rk.nth(2)).toContainText('Lørdag – søndag');

    // Farven er ikke det eneste signal – der står også "(i dag)"
    await expect(page.locator('#hours div.now')).toHaveCount(1);
    await expect(page.locator('#hours div.now')).toContainText('i dag');
  });

  test('forskellige dage lægges ikke sammen', async ({ page }) => {
    const tider = grunddata().aabningstider.map(t =>
      t.ugedag >= 5 ? { ...t, lukker: '22:00' } : t);
    await åbn(page, '/index.html', { data: grunddata({ aabningstider: tider }) });
    await expect(page.locator('#hours div')).toContainText(['11:00–21:00', '11:00–21:00', '11:00–22:00']);
  });

  test('en lukket dag står som Lukket, ikke som 00:00', async ({ page }) => {
    const tider = grunddata().aabningstider.map(t =>
      t.ugedag === 0 ? { ...t, lukket: true, aabner: null, lukker: null } : t);
    await åbn(page, '/index.html', { data: grunddata({ aabningstider: tider }) });
    await expect(page.locator('#hours div').first()).toContainText('Mandag');
    await expect(page.locator('#hours div').first()).toContainText('Lukket');
  });

  test('lukkedage vises kun når der er nogen', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#lukkedage')).toBeHidden();

    const data = grunddata({
      lukkedage: [{ id: 1, lokation_id: 'mosede', dato: '2026-12-24', aarsag: 'Juleaften', emoji: '🎄' }],
    });
    await åbn(page, '/index.html', { data });
    await expect(page.locator('#lukkedage')).toBeVisible();
    await expect(page.locator('#lukkedage')).toContainText('24. december');
  });
});

/* SOLNEDGANGEN ER VÆK, og testene med den.

   Der stod to her: at 7. august 2026 i Greve giver 21:05 (kontrolleret
   mod soltider.dk), og at vinteren ligger klart før sommeren. Begge
   målte den beregning der lå i js/side.js, og den fandtes fordi
   havnestriben viste tallet.

   Striben er fjernet — tre af dens fire celler skulle udfyldes i
   hånden og stod tomme — og fyrre linjer astronomi uden en modtager
   er kode den næste skal læse og finde ud af ikke bliver brugt. */

test.describe('Intet opdigtet slipper ud', () => {

  test('prototypens opdigtede påstande findes ikke på siden', async ({ page }) => {
    await åbn(page, '/index.html');
    const krop = page.locator('body');
    for (const p of ['18,4', 'm/s NØ', 'siden 1972', '54 somre',
                     'Sydkysten', 'pistacie', 'Man kommer for pølsen']) {
      await expect(krop, `"${p}" skal være væk`).not.toContainText(p);
    }
  });

  test('der er ingen stribede pladsholdere tilbage', async ({ page }) => {
    await åbn(page, '/index.html');
    expect(await page.locator('.ph').count()).toBe(0);
  });

  /* HAVNESTRIBENS FELTER ER VÆK.

     Der stod to tests her: at vandtemperatur, vind og "dagens ret"
     skjulte sig når de var tomme, og at de kom frem når personalet
     havde skrevet dem ind. Begge var rigtige, og begge målte en
     stribe der nu er fjernet — sammen med de tre felter i admin, for
     en kontakt der ikke fører nogen steder, er værre end ingen
     kontakt.

     Reglen de håndhævede, gælder stadig andre steder: intet tal på
     siden må være opdigtet. Se testen lige ovenfor. */
});

test.describe('Menuoversigten på forsiden', () => {

  /* Hele menukortet lå her før: 14 kategorier, 151 varer og 29
     slags smørrebrødsfyld. Det gjorde forsiden 5600 px lang på en
     telefon, og alt det der sælger stedet lå nedenunder hvor ingen
     kom hen. Testene for selve kortet er flyttet til
     menuside.spec.js sammen med kortet. */

  test('forsiden viser kategorier, ikke varer', async ({ page }) => {
    await åbn(page, '/index.html');

    const oversigt = page.locator('#menu-oversigt');
    await expect(oversigt).toContainText('Smørrebrød');
    await expect(oversigt).toContainText('Softice og vafler');

    // Ingen priser og ingen varenavne på forsiden
    await expect(oversigt).not.toContainText('Flæskestegssandwich');
    await expect(oversigt).not.toContainText(',-');
    // Og slet ikke det gamle menukort
    await expect(page.locator('#menu-liste')).toHaveCount(0);
    await expect(page.locator('#afd-mad')).toHaveCount(0);
  });

  test('hvert kort tæller sine kategorier og varer', async ({ page }) => {
    /* Tallene på kortene er det der gør afsnittet værd at læse, og
       de skal TÆLLES – ikke skrives i hånden, for så bliver de
       forkerte den dag personalet lægger en kategori ind.

       Testen tæller selv navnene i kategorilinjen og sammenholder. */
    await åbn(page, '/index.html');
    await page.waitForSelector('#menu-oversigt .oversigt-navn');

    const kort = await page.evaluate(() =>
      [...document.querySelectorAll('#menu-oversigt .oversigt-kort')].map((k) => ({
        navn: k.querySelector('.oversigt-navn').textContent,
        tal: k.querySelector('.oversigt-tal').textContent,
        navne: k.querySelector('.oversigt-kat').textContent.split(' · ').filter(Boolean).length,
      })));

    expect(kort.length, 'der skal være et kort pr. afdeling').toBeGreaterThan(1);

    for (const k of kort) {
      const tal = k.tal.match(/^(\d+) kategori(?:er)? · (\d+) vare[r]?$/);
      expect(tal, `linjen på "${k.navn}" har ikke formen "7 kategorier · 84 varer": ${k.tal}`)
        .not.toBeNull();
      expect(Number(tal[1]),
        `"${k.navn}" siger ${tal[1]} kategorier men nævner ${k.navne} navne`)
        .toBe(k.navne);
      expect(Number(tal[2]), `"${k.navn}" har 0 varer og skulle slet ikke stå der`)
        .toBeGreaterThan(0);
    }
  });

  test('der loves ingen "fra"-pris på forsiden', async ({ page }) => {
    /* Første udgave skrev "fra 25,-" på hvert kort, regnet som den
       laveste pris i afdelingen. Det var sandt og alligevel
       vildledende: den billigste vare under Is og desserter er en
       løs vaffel til 4 kr., så kortet ville love "fra 4,-" om en
       afdeling hvor en is koster 30.

       Et tal der er rigtigt og giver et forkert indtryk, er værre
       end intet tal. Testen står her, så det ikke bliver fundet på
       igen. */
    await åbn(page, '/index.html');
    await page.waitForSelector('#menu-oversigt .oversigt-navn');
    const tekst = await page.locator('#menu-oversigt').innerText();
    expect(tekst, 'der er kommet en pris tilbage på menuoversigten').not.toMatch(/\bfra \d/);
  });

  /* Hvert kort er ét link til sin afdeling. Kategorierne stod som
     piller med et dybt link hver (#kat-softice-og-vafler); pillerne er
     væk, fordi de gjorde kortene ujævne, og de dybe links ligger nu
     på menukortets egne genveje. Kortet skal stadig ramme den rigtige
     afdeling — lander man på "Mad" når man trykker på "Is og
     desserter", er linket til grin. */
  test('hvert kort peger på sin egen afdeling på menusiden', async ({ page }) => {
    await åbn(page, '/index.html');

    const is = page.locator('#menu-oversigt a', { hasText: 'Is og desserter' });
    await expect(is).toHaveAttribute('href', 'menu.html?afd=is');

    // Og linket skal virke: menusiden skal åbne på is-afdelingen
    await is.click();
    await expect(page.locator('#afd-is')).toHaveAttribute('aria-selected', 'true');
  });

  test('en tom kategori loves ikke på forsiden', async ({ page }) => {
    /* En kategori uden varer må ikke stå der: gæsten trykker på
       "Pølser" og lander på en tom afdeling. */
    const data = grunddata();
    data.menu_kategorier.push({
      id: 99, afdeling: 'mad', navn: 'Pølser', sortering: 5, aktiv: true,
    });
    await åbn(page, '/index.html', { data });

    await expect(page.locator('#menu-oversigt')).not.toContainText('Pølser');
  });

  test('knappen fører til hele menukortet', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.locator('#menu a[href="menu.html"]').first().click();
    await expect(page).toHaveURL(/menu\.html/);
    await expect(page.locator('h1')).toContainText('Menukortet');
  });
});

/* FORSIDENS FØRSTE AFSNIT ER DET, MAN KAN HANDLE PÅ.

   Her stod "går hurtigt lige nu": fremhævede varer som kort med en
   stor pris, valgt af en liste der roterede hver time. Den lignede
   en "populært lige nu"-liste, og der er ingen kassedata bag —
   kunden kaldte den kedelig og generisk.

   Så blev den til smørrebrødet, og det passede, dengang smørrebrød
   var det eneste, der kunne bestilles. Nu er den ét kort pr. slags,
   gæsten kan bestille — smørrebrødet og det, ejeren har åbnet for i
   admin.

   Testene herunder holder øje med, at INTET tal i blokken er
   skrevet i hånden. */
test.describe('Bestil mad på forsiden', () => {

  test('afsnittet står FØRST, over menukortet og ærinderne', async ({ page }) => {
    await åbn(page, '/index.html');
    const orden = await page.evaluate(() => [...document.querySelectorAll('main section')]
      .map((s) => s.id));
    /* Rækkefølgen er ikke tilfældig: handling → hvad har I → flere
       ærinder → stemning → praktisk. Den, der står med telefonen,
       skal møde det, hun kan gøre, før hun møder et kagefoto. */
    expect(orden.indexOf('bestil')).toBe(0);
    expect(orden.indexOf('menu')).toBe(1);
    expect(orden.indexOf('muligheder')).toBe(2);
    expect(orden.indexOf('muligheder')).toBeLessThan(orden.indexOf('kager'));
    expect(orden.indexOf('muligheder')).toBeLessThan(orden.indexOf('isen'));
    expect(orden[orden.length - 1]).toBe('find');
  });

  test('der er ét kort pr. slags, og prisen er regnet ud af kortet',
    async ({ page }) => {
      await åbn(page, '/index.html');
      const kort = page.locator('#bestil-net .slags-kort');
      // Kun smørrebrødet er åbnet fra start
      await expect(kort).toHaveCount(1);
      await expect(kort.first().locator('.slags-kort-navn')).toHaveText('Smørrebrød');
      // Flæskestegssandwich koster 89 og er den eneste med pris
      await expect(kort.first().locator('.slags-kort-pris')).toHaveText('fra 89,-');
      await expect(kort.first()).toHaveAttribute('href', /^bestil\/\?slags=/);
    });

  test('en åbnet kategori får sit eget kort', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilbare_kategorier = [6];
    await åbn(page, '/index.html', { data: d });
    const kort = page.locator('#bestil-net .slags-kort');
    await expect(kort).toHaveCount(2);
    await expect(kort.nth(1).locator('.slags-kort-navn')).toHaveText('Softice og vafler');
  });

  /* ANTALLET AF SLAGS TÆLLES, DET STÅR IKKE SKREVET.

     Grunddataene har ét stykke og to slags fyld — leverpostej og
     dyrlægens natmad. Der skal altså stå 2 og ikke 29. Sætter
     personalet en slags udsolgt, falder tallet af sig selv, og der
     kan aldrig komme til at stå "29 slags" den dag, der er 27. */
  test('antallet af slags er talt og ikke skrevet', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#smoer-fyld'))
      .toHaveText('1 slags stykker · 2 slags fyld');

    // Én sat udsolgt → tallet skal falde
    const varer = grunddata().menu_varer.map(v => v.id === 4 ? { ...v, udsolgt: true } : v);
    await åbn(page, '/index.html', { data: grunddata({ menu_varer: varer }) });
    await expect(page.locator('#smoer-fyld'))
      .toHaveText('1 slags stykker · 1 slags fyld');
  });

  /* Varslet står i admin, og linjen følger det. Et tal, der er
     skrevet i hånden på siden, bliver forkert den dag, ejeren
     ændrer det i admin. */
  test('varslet står på siden og kommer fra admin', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#bestil-varsel')).toHaveText('Bestil senest dagen før.');

    const d = grunddata();
    d.indstillinger.bestilling_varsel_timer = 2;
    await åbn(page, '/index.html', { data: d });
    await expect(page.locator('#bestil-varsel')).toHaveText('Bestil senest 2 timer før.');

    // Nul timer er ingen regel — og så står der ingenting.
    const d0 = grunddata();
    d0.indstillinger.bestilling_varsel_timer = 0;
    await åbn(page, '/index.html', { data: d0 });
    await expect(page.locator('#bestil-varsel')).toBeHidden();
  });

  /* En tom ramme med en bestil-knap er værre end ingen blok: man
     trykker, og så er der ikke noget at vælge. */
  test('blokken skjuler sig hvis der ikke er noget at bestille', async ({ page }) => {
    const kat = grunddata().menu_kategorier.filter(k => !/smørrebrød|fyld/i.test(k.navn));
    await åbn(page, '/index.html', { data: grunddata({ menu_kategorier: kat }) });
    await expect(page.locator('#bestil')).toBeHidden();
  });

  test('knappen fører til bestillingen', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.locator('#bestil a.knap').click();
    await expect(page).toHaveURL(/\/bestil\//);
  });

  /* Kortet fører til PRÆCIS den slags, der blev trykket på. Uden
     det landede gæsten på smørrebrødet, uanset hvad hun valgte. */
  test('kortet åbner bestillingen på den slags, der blev trykket på',
    async ({ page }) => {
      const d = grunddata();
      d.indstillinger.bestilbare_kategorier = [6];
      await åbn(page, '/index.html', { data: d });
      await page.locator('#bestil-net .slags-kort', { hasText: 'Softice' }).click();

      await page.waitForSelector('#bestil-stykker .stk-linje');
      await expect(page.locator('#bestil-slags .slags-knap', { hasText: 'Softice' }))
        .toHaveAttribute('aria-pressed', 'true');
    });

  /* ARRANGEMENT-AFSNITTET ER GÅET OP I BLOKKEN, ikke slettet. Det
     stod 800 px længere ned og sagde det samme med de samme to
     knapper. Ordene skal stadig kunne findes. */
  test('beskeden om selskaber står stadig på siden', async ({ page }) => {
    await åbn(page, '/index.html');
    const blok = page.locator('#bestil');
    await expect(blok).toContainText('selskab');
    await expect(blok).toContainText('vi ringer og bekræfter', { ignoreCase: true });
    await expect(page.locator('#arrangement')).toHaveCount(0);
  });
});

test.describe('Kager og dagens kugler', () => {

  test('kagepriserne hentes fra menukortet', async ({ page }) => {
    const varer = grunddata().menu_varer.concat([
      { id: 20, kategori_id: 9, navn: 'Kage', beskrivelse: 'Spørg til dagens udvalg',
        pris: 30, fremhaevet: false, udsolgt: false, sortering: 20, aktiv: true },
      { id: 21, kategori_id: 9, navn: 'Kaffe og kage', beskrivelse: null,
        pris: 65, fremhaevet: false, udsolgt: false, sortering: 21, aktiv: true },
    ]);
    await åbn(page, '/index.html', { data: grunddata({ menu_varer: varer }) });

    await expect(page.locator('#kage-priser .glass')).toHaveCount(2);
    await expect(page.locator('#kage-priser')).toContainText('Kaffe og kage 65,-');
  });

  test('dagens kugler er skjult når tavlen er tom', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#is')).toBeHidden();
  });

  test('kugler vises med farveprik', async ({ page }) => {
    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        dagens_kugler: [{ navn: 'Jordbær', farve: '#f0c3bb' }, { navn: 'Pistacie', farve: '#c9d6b4' }],
      },
    });
    await åbn(page, '/index.html', { data });
    await expect(page.locator('#is')).toBeVisible();
    await expect(page.locator('#kugler-liste .chip')).toHaveCount(2);
    await expect(page.locator('#kugler-liste .chip i').first())
      .toHaveCSS('background-color', 'rgb(240, 195, 187)');
  });

  test('en farve der ikke er en farve kan ikke smugle CSS ind', async ({ page }) => {
    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        dagens_kugler: [{ navn: 'Snyd', farve: 'red; position:fixed; inset:0; z-index:999' }],
      },
    });
    await åbn(page, '/index.html', { data });
    const prik = page.locator('#kugler-liste .chip i').first();
    await expect(prik).toHaveCSS('position', 'static');
    await expect(prik).toHaveCSS('background-color', 'rgb(239, 228, 210)');
  });
});

test.describe('Hero: billede og video', () => {

  test('stillbilledet indlæses altid, i en størrelse der passer til skærmen', async ({ page }) => {
    await åbn(page, '/index.html');

    // naturalWidth måler IKKE filens bredde når der er brugt
    // srcset med w-beskrivelser – browseren korrigerer for
    // billedets tæthed i den plads det står i. Derfor tjekkes
    // complete og hvilken fil der blev valgt i stedet.
    const i = await page.locator('#hero-still').evaluate(el => ({
      klar: el.complete,
      fil: (el.currentSrc || '').split('/').pop(),
    }));
    expect(i.klar).toBe(true);
    expect(i.fil).toMatch(/^facade-(800|1400|2400)\.jpg$/);
  });

  test('MP4 står FØR WebM – ellers henter Chrome den største fil', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.waitForFunction(() => document.querySelectorAll('#hero-film source').length > 0);

    const typer = await page.locator('#hero-film source').evaluateAll(
      els => els.map(e => e.type));
    expect(typer).toEqual(['video/mp4', 'video/webm']);
  });

  test('videoen kommer i gang og tones frem', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#hero-film')).toHaveClass(/vis/, { timeout: 15000 });
    expect(await page.locator('#hero-film').evaluate(v => v.paused)).toBe(false);
  });

  /* OG DEN SKAL STANDSE NÅR HEROEN ER UDE AF SYNE.

     Den kørte i ring hele tiden. Er man 3000 px nede på siden,
     afkoder browseren stadig 1280×720 tredive gange i sekundet for et
     billede ingen kan se — det er batteri på en telefon og
     hovedtrådstid mens man ruller.

     Isfilmen længere nede havde allerede den her opførsel. Heroen
     havde den ikke, fordi den ligger øverst og "altid er der". Målt
     på en computer: rulningen kørte 33 billeder i sekundet, og
     fjernede man hero-videoen helt, sprang den til 44.

     Den skal komme i gang IGEN når man ruller op. En hero med et
     frosset billede er værre end en hero uden video. */
  test('videoen standser når man ruller væk, og kører igen bagefter', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#hero-film')).toHaveClass(/vis/, { timeout: 15000 });

    await page.evaluate(() => window.scrollTo(0, 3000));
    await expect.poll(() => page.locator('#hero-film').evaluate(v => v.paused),
      { message: 'videoen kører videre 3000 px nede på siden' }).toBe(true);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.locator('#hero-film').evaluate(v => v.paused),
      { message: 'videoen kom ikke i gang igen – heroen står med et frosset billede' })
      .toBe(false);
  });

  test('reduceret bevægelse: ingen video hentes overhovedet', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const videoer = [];
    page.on('request', r => { if (/\.(mp4|webm)$/.test(r.url())) videoer.push(r.url()); });

    await åbn(page, '/index.html');
    await page.waitForTimeout(1200);

    expect(videoer).toEqual([]);
    // Stillbilledet står der stadig
    expect(await page.locator('#hero-still').evaluate(el => el.complete)).toBe(true);
  });
});

test.describe('Kontakt og adresse', () => {

  test('adressen kommer fra databasen', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#adresse')).toContainText('Havnevej 20');
    await expect(page.locator('#adresse')).toContainText('2670 Greve');
    await expect(page.locator('#footer-adresse')).toContainText('2670 Greve');
  });

  /* Nummeret stod fire steder på forsiden. Ét af dem, #tel2, stod
     under et TELEFON-mærkat lige ved siden af knappen "Ring 28 87 13
     43" i samme kort — den samme oplysning to gange inden for 80 px.
     Det er væk. De tre der er tilbage, står hver sit sted: ved
     adressen, i footeren og i arrangement-afsnittet.

     Testen tjekker at nummeret står SKREVET på ring-knappen og ikke
     kun i href'en. "Ring til os" med nummeret skjult i linket gør at
     man skal trykke for at se hvad man ringer til. */
  test('telefonnummeret kan trykkes på tre steder', async ({ page }) => {
    await åbn(page, '/index.html');
    for (const id of ['#ring', '#footer-tel', '#arr-ring']) {
      await expect(page.locator(id), id).toHaveAttribute('href', 'tel:+4528871343');
    }
    await expect(page.locator('#ring')).toHaveText('Ring 28 87 13 43');
    await expect(page.locator('#footer-tel')).toHaveText('28 87 13 43');
    await expect(page.locator('#tel2'), 'det dobbelte nummer er tilbage').toHaveCount(0);
  });

  /* Adressen stod også to steder: i linjen under "Find os" og i
     kortet nedenunder. Nu står den i kortet, og linjen siger hvor man
     skal kigge hen. */
  test('adressen står ét sted i Find os', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#adresse')).toContainText('Havnevej 20');
    await expect(page.locator('#find-under')).not.toContainText('Havnevej');
    await expect(page.locator('#find-under')).not.toContainText('2670');
  });

  test('rute-linket peger på adressen', async ({ page }) => {
    await åbn(page, '/index.html');
    const href = await page.locator('#rute').getAttribute('href');
    expect(href).toContain('Havnevej%2020');
    expect(href).toContain('2670');
  });

  test('dagens besked vises kun når den er slået til', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#dagens-besked')).toBeHidden();

    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        dagens_besked: { vis: true, tekst: 'Kontanter virker ikke i dag.' },
      },
    });
    await åbn(page, '/index.html', { data });
    await expect(page.locator('#dagens-besked')).toHaveText('Kontanter virker ikke i dag.');
  });
});

test.describe('Opførsel', () => {

  test('topmenuen bliver til glas når man ruller ned', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#hd')).not.toHaveClass(/stuck/);
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await expect(page.locator('#hd')).toHaveClass(/stuck/);
  });

  test('afsnittene toner ind når de kommer i syne', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.locator('#find').scrollIntoViewIfNeeded();
    await expect(page.locator('#find')).toHaveClass(/in/);
  });

  /* "DER ER INGEN ANIMATIONER" var kundens klage, og den var svær at
     modbevise: koden HAVDE animationer, de var bare så små at ingen
     lagde mærke til dem.

     Disse tests måler at bevægelsen faktisk finder sted – ikke at der
     står en transition i CSS'en, men at værdien ER anderledes før og
     efter. En transition med varigheden 0, en delay der aldrig
     udløber, eller en klasse der ikke bliver sat, ville alle bestå en
     test der kun læste CSS. */
  test('afsnittene rykker sig og bogstaverne trækker sig sammen', async ({ page }) => {
    await åbn(page, '/index.html');

    function maal() {
      return page.evaluate(() => {
        const h = document.querySelector('#find .head h2');
        return {
          luft: parseFloat(getComputedStyle(h).letterSpacing) || 0,
          synlig: Number(getComputedStyle(document.querySelector('#find .head')).opacity),
          streg: parseFloat(getComputedStyle(h, '::after').width) || 0,
        };
      });
    }

    // FØR afsnittet er i syne
    const foer = await maal();
    expect(foer.synlig, 'afsnittet er synligt før man ruller derned').toBeLessThan(0.5);
    expect(foer.luft, 'overskriften har ingen ekstra bogstavluft at trække sammen')
      .toBeGreaterThan(0.5);
    expect(foer.streg, 'stregen under overskriften er tegnet på forhånd').toBeLessThan(2);

    await page.locator('#find').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1700);       // længere end den længste overgang

    const efter = await maal();
    expect(efter.synlig, 'afsnittet blev ikke synligt').toBeGreaterThan(0.95);
    expect(efter.luft, 'bogstaverne trak sig ikke sammen').toBeLessThan(foer.luft);
    expect(efter.streg, 'stregen under overskriften blev ikke tegnet').toBeGreaterThan(40);
  });

  test('heroen lander når introen slipper siden', async ({ page }) => {
    /* Alt andet toner ind når man ruller til det. Heroen kunne ikke:
       den ER der når introen letter, og stod derfor helt færdig i
       netop det øjeblik hvor gæsten kigger mest. */
    await åbn(page, '/index.html');
    await expect(page.locator('body')).toHaveClass(/klar/);
    await page.waitForTimeout(1600);

    const svar = await page.evaluate(() => {
      const h = document.querySelector('.hero h1');
      const s = getComputedStyle(h);
      return {
        synlig: Number(getComputedStyle(h.parentElement).opacity),
        overgang: s.transitionProperty,
        hint: Number(getComputedStyle(document.querySelector('.scrollhint')).opacity),
      };
    });
    expect(svar.synlig, 'heroens overskrift blev aldrig synlig').toBeGreaterThan(0.95);
    expect(svar.hint, '"Rul ned" kom aldrig frem').toBeGreaterThan(0.95);

    /* HEROENS h1 MÅ IKKE ANIMERE EN LAYOUT-EGENSKAB.

       Der stod en letter-spacing-animation her: bogstaverne trak sig
       sammen over 1,4 sekunder. letter-spacing kan ikke ændres uden at
       teksten ombrydes på ny, altså 60 ombrydninger i sekundet af
       sidens største tekst — clamp(56px, min(11.5vw, 20vh), 210px)
       over tre linjer — i præcis det øjeblik introen tonede væk og
       videoen blev hentet.

       Målt over de 2,6 sekunder overgangen varer: 23 tabte billeder
       med den, 17 uden. Kunden skrev at overgangen hakkede.

       Testen måler hvad der står i transition-property, for det er
       reglen: heroen må gerne bevæge sig, men kun med transform og
       opacity. width, height, letter-spacing, top og margin ombryder
       siden. */
    for (const forbudt of ['letter-spacing', 'width', 'height', 'margin', 'top', 'left']) {
      expect(svar.overgang,
        `heroens overskrift animerer "${forbudt}", som koster et nyt layout ved hvert billede`)
        .not.toContain(forbudt);
    }
  });

  test('med reduceret bevægelse står alt stille OG synligt', async ({ page }) => {
    /* Den farligste fejl ved en indtoning: glemmer man én af dem i
       reduced-motion-blokken, står der et TOMT afsnit hos den gæst
       der har slået bevægelse fra. Der måles på hver af de nye. */
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await åbn(page, '/index.html');

    const svar = await page.evaluate(() => {
      const g = (v) => Number(getComputedStyle(document.querySelector(v)).opacity);
      const h = document.querySelector('#find .head h2');
      return {
        hero: g('.hero-in > *'),
        find: g('#find .head'),
        streg: parseFloat(getComputedStyle(h, '::after').width) || 0,
        hint: g('.scrollhint'),
      };
    });

    expect(svar.hero, 'heroens indhold er usynligt').toBeGreaterThan(0.95);
    expect(svar.find, 'afsnittet er usynligt, og man kan ikke rulle det frem')
      .toBeGreaterThan(0.95);
    expect(svar.streg, 'stregen under overskriften mangler').toBeGreaterThan(40);
    expect(svar.hint, '"Rul ned" er usynlig').toBeGreaterThan(0.95);
  });

  /* HVER SEKTION HAR SIN EGEN INDFLYVNING NU: fire nye bevægelser med
     hver sin startværdi. Testen måler at ALLE fire ender synlige og
     UDEN en overgang, når gæsten har slået bevægelse fra.

     Vær præcis om hvad den fanger. Jeg skrev først at den fangede en
     glemt regel i reduced-motion-blokken, og prøvede det efter ved at
     fjerne clip-path-nulstillingen — testen bestod stadig. Grunden er
     at alle fire indflyvninger er .in-styrede, og js/side.js sætter
     .in på hver .rev med det SAMME i den tilstand; den venter ikke på
     at man ruller. Slutværdien er altså synlig af sig selv.

     Det testen så er værd, er de to andre halvdele: at slutværdien
     faktisk ER synlig (en indflyvning kan ende forkert), og at
     transition-duration er nul — for det er hele formålet med
     indstillingen, og DET fanger den. Uden reglerne i blokken kører
     der en bevægelse på 1,1 sekund hos den der har bedt om ingen. */
  test('reduceret bevægelse: sektionernes indflyvninger står stille og synlige',
    async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await åbn(page, '/index.html');
      await page.waitForSelector('#bestil-net .slags-kort');
      await page.waitForSelector('#menu-oversigt .oversigt-kort');

      const svar = await page.evaluate(() => {
        const s = (v) => getComputedStyle(document.querySelector(v));
        const tal = (v) => Number(s(v).opacity);
        // Summen af overgangstiderne. Er den over nul, kører der en
        // bevægelse hos den der har bedt om ingen bevægelse.
        const tid = (v) => s(v).transitionDuration
          .split(',').reduce((n, d) => n + parseFloat(d), 0);
        return {
          bestilKort: tal('#bestil .slags-kort'),
          menuKort: tal('#menu .oversigt-kort'),
          kagerTekst: tal('#kager .split-tekst'),
          kagerRamme: tal('#kager .split-foto'),
          filmOpacitet: tal('#isen .film-ramme'),
          filmSloer: s('#isen .film-ramme').filter,
          tider: [
            tid('#bestil .slags-kort'),
            tid('#menu .oversigt-kort'),
            tid('#kager .split-tekst'),
            tid('#kager .split-foto'),
            tid('#isen .film-ramme'),
          ],
        };
      });

      expect(svar.bestilKort, 'slags-kortene er usynlige').toBeGreaterThan(0.95);
      expect(svar.menuKort, 'menuoversigtens kort er usynlige').toBeGreaterThan(0.95);
      expect(svar.kagerTekst, 'kageteksten er usynlig').toBeGreaterThan(0.95);
      expect(svar.filmOpacitet, 'isfilmens ramme er usynlig').toBeGreaterThan(0.95);

      expect(svar.kagerRamme, 'kagefotoets ramme er usynlig').toBeGreaterThan(0.95);
      expect(svar.filmSloer, `isfilmen står uskarp: ${svar.filmSloer}`)
        .not.toMatch(/blur\((?!0)/);

      // Og ingen af de fem må have en overgang at køre
      svar.tider.forEach((t, i) => {
        expect(t, `indflyvning nr. ${i + 1} har stadig en overgang på ${t}s`).toBe(0);
      });
    });

  /* ET FILTER MÅ IKKE LIGGE PÅ EN RAMME OM EN VIDEO — I NOGEN TILSTAND.

     Isfilmens ramme kom ind uskarp og fandt fokus, som et objektiv. Køn
     idé, dårligt valg: et filter på en forælder til en <video> tvinger
     browseren til at køre sløringen hen over hvert enkelt videobillede
     så længe overgangen varer. På iOS er det en kendt kilde til hakken,
     og i værste fald står videoen stille imens.

     Kunden skrev at filmen ikke "floatede" på telefonen. Det her var en
     af grundene.

     Testen kigger i den NORMALE tilstand, ikke kun under reduceret
     bevægelse — en blur over en video er forkert uanset hvad gæsten har
     bedt om. Og den måler både start- og sluttilstand, for det er
     STARTVÆRDIEN der gør skade: den er der mens overgangen kører. */
  test('isfilmens ramme har intet filter, hverken før eller efter indflyvningen',
    async ({ page }) => {
      await åbn(page, '/index.html');

      // Før: afsnittet er ikke rullet frem endnu
      const foer = await page.evaluate(() =>
        getComputedStyle(document.querySelector('#isen .film-ramme')).filter);
      expect(foer, `der ligger et filter på rammen før indflyvningen: ${foer}`)
        .toBe('none');

      await page.locator('#isen').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1400);

      const efter = await page.evaluate(() =>
        getComputedStyle(document.querySelector('#isen .film-ramme')).filter);
      expect(efter, `der ligger et filter på rammen efter indflyvningen: ${efter}`)
        .toBe('none');
    });

  test('mobilmenuen åbner, lukker og fanger Escape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await åbn(page, '/index.html');

    await expect(page.locator('#ark')).toBeHidden();
    await page.locator('#burger').click();
    await expect(page.locator('#ark')).toBeVisible();
    await expect(page.locator('#burger')).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(page.locator('#ark')).toBeHidden();
  });

  test('et klik i mobilmenuen lukker den', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await åbn(page, '/index.html');
    await page.locator('#burger').click();
    await page.locator('#ark a[href="#find"]').click();
    await expect(page.locator('#ark')).toBeHidden();
  });

  test('bådstriben får en bredde – ellers falder den til 300px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await åbn(page, '/index.html');
    expect(await page.locator('#sail').evaluate(el => el.clientWidth)).toBeGreaterThan(1000);
  });
});

test.describe('Sikkerhed og robusthed', () => {

  test('ingen fejl i konsollen ved almindelig indlæsning', async ({ page }) => {
    const fejl = [];
    page.on('pageerror', e => fejl.push(e.message));
    page.on('console', m => { if (m.type() === 'error') fejl.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) fejl.push('HTTP ' + r.status() + ' ' + r.url()); });

    await åbn(page, '/index.html');
    await page.locator('#find').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    expect(fejl).toEqual([]);
  });
});

test.describe('Videoen i hero', () => {

  /* Turen forbi lugerne lå før i sit eget afsnit længere nede.
     Nu er det den man møder først, og det gamle afsnit er væk.
     Det stiller to nye krav:

     1) Den må ikke hentes mens introen kører. Introen kommer ved
        hvert besøg, og 1,3 MB video ned ad linjen samtidig gør
        animationen hakkende.
     2) Overskriften står oven på den. Videoen har lyse steder –
        kagerne og softicen – så sløret skal bære hele vejen.
        Det måles for sig i kontrast.spec.js. */

  test('den hentes ikke mens introen kører', async ({ page }) => {
    const hentet = [];
    page.on('request', (r) => {
      // hero-hoej er telefonudgaven. Uden den i mønsteret målte testen
      // ingenting i telefonprofilen og bestod af den grund.
      if (/hero(-hoej)?\.(mp4|webm)/.test(r.url())) hentet.push(r.url().split('/').pop());
    });

    // intro: true – introen får lov at køre
    await åbn(page, '/index.html', { intro: true });
    await expect(page.locator('#intro')).toBeVisible();
    expect(hentet, 'videoen blev hentet mens introen kørte').toEqual([]);

    // Når introen er væk, skal den komme
    await page.locator('#intro-spring').click();
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 3000 });
    await expect.poll(() => hentet.length, { timeout: 10000 }).toBeGreaterThan(0);
  });

  /* TO FORMATER, OG TELEFONEN SKAL HAVE DET LODRETTE.

     Kunden skrev at videoen hakkede på telefonen. Årsagen er
     geometri: videoen er 1280×720 i landskab, heroen er lodret på en
     telefon, og object-fit: cover får browseren til at skalere hele
     billedet op til højde 844 og klippe 390 ud af de 1500 —
     921.600 pixels afkodet for at vise en strimmel svarende til 333.

     hero-hoej er midten klippet ud i 9:16, 406×720. Samme billede,
     en tredjedel af arbejdet. Testen kører i BEGGE profiler og
     kræver hvert sit format, for det er nemt at skrive en switch der
     altid rammer den samme gren. */
  test('telefonen får den lodrette video, computeren den brede',
    async ({ page, isMobile }) => {
      await åbn(page, '/index.html');
      await expect(page.locator('#hero-film source')).toHaveCount(2, { timeout: 12000 });

      const kilder = await page.evaluate(() =>
        [...document.querySelectorAll('#hero-film source')].map((s) => s.getAttribute('src')));

      const ventet = isMobile ? 'hero-hoej' : 'hero';
      expect(kilder[0], 'MP4 skal komme først').toBe('billeder/' + ventet + '.mp4');
      expect(kilder[1]).toBe('billeder/' + ventet + '.webm');

      // Og den brede må ikke snige sig ind på en telefon
      if (isMobile) {
        expect(kilder.join(' ')).not.toMatch(/billeder\/hero\.(mp4|webm)/);
      }

      // De gamle filer skal være helt væk
      expect(kilder.join(' ')).not.toContain('havnen');
      expect(kilder.join(' ')).not.toContain('montage');
    });

  /* Filen må ikke bare findes i koden – den skal ligge der. En
     switch der peger på en fil ingen har lavet, giver en tom hero og
     ingen fejl nogen steder. */
  test('begge videoformater findes som filer', async ({ page }) => {
    for (const fil of ['hero.mp4', 'hero.webm', 'hero-hoej.mp4', 'hero-hoej.webm']) {
      const svar = await page.request.get('/billeder/' + fil);
      expect(svar.status(), fil + ' mangler i billeder/').toBe(200);
    }
  });

  /* Den lodrette skal være MINDRE end den brede. Er den ikke det, er
     der noget galt med indstillingerne, og så koster telefonudgaven
     mere end den sparer. */
  test('den lodrette video er lettere end den brede', async ({ page }) => {
    const vej = async (f) => {
      const r = await page.request.get('/billeder/' + f);
      return (await r.body()).length;
    };
    const bred = await vej('hero.mp4');
    const hoej = await vej('hero-hoej.mp4');
    expect(hoej, `hero-hoej.mp4 er ${hoej} B, hero.mp4 er ${bred} B`).toBeLessThan(bred);
  });

  test('den er tavs og kører i ring', async ({ page }) => {
    await åbn(page, '/index.html');
    const ok = await page.locator('#hero-film').evaluate((v) => v.muted && v.loop);
    expect(ok).toBe(true);
  });

  test('stillbilledet ligger under, så der aldrig er et sort hul', async ({ page }) => {
    await åbn(page, '/index.html');
    // Facaden er videoens første sekund, så skiftet ikke kan ses
    await expect(page.locator('#hero-still')).toHaveAttribute('src', /facade-/);

    /* Og videoen har INGEN poster. Et poster-billede hentes med
       det samme, også med preload="none", og dette ville aldrig
       blive set: fotoet ligger oven på det indtil videoen kører.
       Det kostede 119 kB ved hvert besøg. */
    expect(await page.locator('#hero-film').getAttribute('poster')).toBeNull();
  });

  test('med reduceret bevægelse hentes den slet ikke', async ({ page }) => {
    const hentet = [];
    page.on('request', (r) => { if (/hero\.(mp4|webm)/.test(r.url())) hentet.push(r.url()); });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await åbn(page, '/index.html');
    await page.waitForTimeout(1500);

    expect(hentet, 'videoen blev hentet trods reduceret bevægelse').toEqual([]);
    // Men fotoet skal stå der
    await expect(page.locator('#hero-still')).toBeVisible();
  });

  test('det gamle filmafsnit er væk', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#film')).toHaveCount(0);
    await expect(page.locator('#montage-film')).toHaveCount(0);
  });
});

test.describe('Ankerlinks i topmenuen', () => {

  /* Topmenuen ligger fast øverst. Uden scroll-margin-top ruller et
     ankerlink sektionen helt op til kanten, og overskriften ender
     BAG menuen. Det så jeg først på et skærmbillede – testen her
     er billigere end at opdage det igen. */
  for (const [navn, link, overskrift] of [
    ['Is og kager', 'a[href="#isen"]', '#isen h2'],
    // "Arrangementer" er væk fra menuen: afsnittet er gået op i
    // smørrebrødsblokken, som nås gennem siden og ikke et anker.
    ['Find os', 'a[href="#find"]', '#find h2'],
  ]) {
    test(`"${navn}" skjuler ikke overskriften bag menuen`, async ({ page }) => {
      await åbn(page, '/index.html');

      /* På en telefon er menupunkterne bag burgeren. Testen skal
         bruge den vej gæsten faktisk har, ikke en der kun findes
         på en stor skærm. */
      if (await page.locator('#burger').isVisible()) {
        await page.locator('#burger').click();
        await page.locator('#ark ' + link).click();
      } else {
        await page.locator('#hd ' + link).click();
      }

      // Rulningen er blød; vent på at den falder til ro
      await page.waitForTimeout(1200);

      const m = await page.evaluate((sel) => {
        const h = document.querySelector(sel).getBoundingClientRect();
        const hd = document.getElementById('hd').getBoundingClientRect();
        return { overskriftTop: h.top, menuBund: hd.bottom };
      }, overskrift);

      expect(m.overskriftTop,
        `overskriften ligger ${Math.round(m.menuBund - m.overskriftTop)}px bag topmenuen`)
        .toBeGreaterThanOrEqual(m.menuBund - 2);
    });
  }
});

/* ------------------------------------------------------------
   KAGEFOTOET KOMMER FØRST NÅR DET SKAL

   Det står tre skærme nede og vejer 241 kB på en telefon.
   loading="lazy" stod på og gjorde ingen forskel: Chromium hentede
   det mens introen kørte. Nu lægger js/side.js adressen på, når
   det er 400 px fra skærmen.

   To påstande, og begge skal holde. Den ene alene er en fælde:
   "hentes ikke ved landing" er nemt at få til at passe ved at
   ødelægge billedet, og "vises når man ruller" er nemt ved at
   hente det med det samme.
   ------------------------------------------------------------ */
test.describe('kagefotoet', () => {
  test('hentes ikke mens gæsten venter på forsiden', async ({ page }) => {
    const hentet = [];
    page.on('request', (r) => {
      const n = r.url().split('/').pop().split('?')[0];
      if (/^kager-/.test(n)) hentet.push(n);
    });

    await åbn(page, '/index.html');
    await page.waitForTimeout(500);

    expect(hentet, `${hentet.join(', ')} blev hentet før nogen havde rullet`)
      .toEqual([]);
  });

  test('er der når man ruller ned til det', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.locator('#kager').scrollIntoViewIfNeeded();

    const img = page.locator('#kager .split-foto img').first();
    await expect.poll(async () => img.evaluate((e) => e.naturalWidth),
      { timeout: 8000, message: 'kagefotoet blev aldrig hentet' })
      .toBeGreaterThan(0);

    // Og det er stadig srcset der vælger – ikke bare den store til alle
    const valgt = await img.evaluate((e) => e.currentSrc.split('/').pop());
    expect(valgt).toMatch(/^kager-(700|900|1200)\.jpg$/);
  });
});
