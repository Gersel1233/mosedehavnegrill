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
const { åbn, grunddata, gemteData } = require('./hjaelp');

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

/* MENUOVERSIGTEN ER VÆK FRA FORSIDEN.

   Der stod tre kort med afdelingernes navne og tal midt på siden.
   De var rigtige nok — tallene blev talt — men forsiden har fire
   koncepter nu, og en indholdsfortegnelse over menukortet er ikke
   et af dem. Der er ét link til menukortet under Bestil mad, og
   testene for selve kortet ligger i menuside.spec.js.

   Kageafsnittet er væk af samme grund. Kagerne står i menukortet,
   hvor de hører til. */

/* FORSIDENS RÆKKEFØLGE ER AFTALT, IKKE TILFÆLDIG.

   Den har været ni afsnit (et katalog, man skulle læse sig
   igennem) og fire (for få: menukortet og nyhederne kunne ikke
   nås). Designbundtet fra 21. august lægger den fast:

     bestil    det ene, man kan HANDLE på. Dagens ret øverst.
     nyheder   det personalet skriver. Mørk flade, så øjet kan se
               forskel på "gør noget" og "her står noget".
     hjaelp    de seks ærinder, man ringer om
     menu      menukortet i tre afdelinger med tal, der tælles
     isen      filmen og dagens kugler
     find      åbningstider og adresse

   Rækkefølgen er ikke smag: den går fra det man kan gøre NU, over
   det man kan gøre i denne uge, til det man skal ringe om. Bytter
   man om på den, står "Find os" før man ved hvad man kommer efter.

   Testene herunder holder øje med rækkefølgen og med, at INTET
   tal på siden er skrevet i hånden. */
test.describe('Forsidens rækkefølge', () => {

  test('afsnittene står i den aftalte orden', async ({ page }) => {
    await åbn(page, '/index.html');
    const orden = await page.evaluate(() => [...document.querySelectorAll('main section')]
      .map((s) => s.id));
    /* Kundens egen remse, 22/8: hero, bannere, nyheder, bestil,
       menukort, hjælp, is, det praktiske.

       "Bestil" var et eget afsnit med to kort — To go og Spis her.
       Kunden bad om at få dem væk igen samme dag: valget hører
       hjemme i bestillingsformularen, efter maden. Rækkefølgen er
       ellers hans. */
    /* #dagens er blevet til #bestil: hele formularen ligger på
       forsiden nu, og dagens ret står som første række i den.
       #smoerrebroed er kommet til — smørrebrødet har sit eget
       afsnit (kundens ord, 23/8). */
    expect(orden).toEqual(['nyheder', 'bestil', 'smoerrebroed',
      'menu', 'hjaelp', 'isen', 'find']);
  });

  /* TO GO OG SPIS HER MÅ IKKE SNIGE SIG TILBAGE PÅ FORSIDEN.

     Kortene stod her i et døgn. Fjernelsen er en beslutning og
     ikke en oprydning: spørgsmålet skal stilles ét sted, dér hvor
     gæsten har set maden og kan svare på det. Kommer der to kort
     på forsiden igen, er der to steder at vælge fra, og det ene
     af dem ved ikke, hvad der er i kurven. */
  test('forsiden spørger ikke om to go eller spis her', async ({ page }) => {
    /* Der skal være noget at bestille, ellers findes afsnittet
       ikke — se "uden noget at bestille forsvinder afsnittet" i
       bestil-doeren.spec.js. Øllen åbnes, og noget lægges i
       kurven: spørgsmålet stilles først, når der ER mad at svare
       for. */
    const d = grunddata();
    d.indstillinger.bestilbare_kategorier = [9];
    await åbn(page, '/index.html', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    /* De to kort er væk. #bestil findes nu igen, men som HELE
       formularen — og spørgsmålet står inde i den, efter maden,
       hvor svaret giver mening. */
    await expect(page.locator('.tovalg')).toHaveCount(0);
    await expect(page.locator('main a[href^="bestil/?hvordan="]')).toHaveCount(0);
    await expect(page.locator('#bestil-form')).toBeVisible();

    await page.locator('#bestil-stykker .stk-linje').first()
      .getByRole('button', { name: /Én mere/ }).click();
    await expect(page.locator('#bestil-hvordan-trin')).toBeVisible();
  });

  /* Ét afsnit må gerne have to knapper — den røde, der gør noget,
     og en dæmpet ved siden af. Men ikke tre, og ikke to røde: så
     er det ikke længere ét valg. */
  test('hvert afsnit har højst én rød knap', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilbare_kategorier = [9];
    await åbn(page, '/index.html', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    /* #dagens stod her og findes ikke længere — og en prøve, der
       tæller knapper i en sektion, som ikke er der, tæller nul og
       består altid. Listen er forsidens afsnit, som de hedder nu.

       Formularens egne knapper tælles IKKE med: "Send bestilling"
       er ikke en genvej til et andet afsnit, den er selve
       handlingen. Reglen handler om, hvor mange steder et afsnit
       peger hen. */
    const tal = await page.evaluate((ider) => ider.map((id) => {
      const sek = document.getElementById(id);
      if (!sek) return [id, -1];
      return [id, [...sek.querySelectorAll('a.knap, button.knap')]
        .filter((e) => !e.closest('#bestil-form') && !e.closest('#bestil-kig')).length];
    }), ['nyheder', 'bestil', 'smoerrebroed', 'menu', 'hjaelp', 'isen']);

    for (const [id, n] of tal) {
      expect(n, `#${id} findes ikke — prøven måler ingenting`).toBeGreaterThanOrEqual(0);
      expect(n, `#${id} har ${n} røde knapper`).toBeLessThanOrEqual(1);
    }
  });

  /* GENVEJSSTRIBEN ER VÆK — kundens rækkefølge (22/8) havde den
     ikke med, og den sagde det samme som "Hvad kan vi hjælpe
     med?".

     Døren ind til bestillingen skal stadig stå i HTML'en og ikke
     bygges af et script: gjorde et script det, ville ét fejlet
     kald fjerne vejen ind til det, forretningen sælger — og siden
     ville stadig se hel ud. Efter at tovalget er væk, er den dør
     den flydende pille og topmenuens punkt.

     Testen slukker for JavaScript for at bevise det. */
  test('vejen til bestillingen står der uden JavaScript', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const p = await ctx.newPage();
    await p.goto('/index.html');
    await expect(p.locator('.strip')).toHaveCount(0);
    /* Pillen peger på #bestil PÅ SIDEN SELV nu — formularen er
       flyttet hertil. Og formularen står i HTML'en, ikke i et
       script: fejler JavaScript, kan gæsten stadig se, hvad man
       kan bestille, og hvor man ringer hen. */
    await expect(p.locator('.bestil-fast[href="#bestil"]')).toHaveCount(1);
    await expect(p.locator('#bestil-form')).toHaveCount(1);
    await expect(p.locator('#hd nav a[href="bestil/"]')).toHaveCount(1);
    await ctx.close();
  });

  /* HEROEN HAR INGEN KNAPPER — kundens ord, 22/8: "knapperne
     behøver ikke være der på heroen."

     Der stod to store, og den flydende Bestil-pille lå oven i den
     nederste af dem i højre hjørne. Pillen bliver; den følger med
     hele vejen ned og er den ENE handling på forsiden. */
  test('heroen har ingen knapper — kun pillen følger med', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('.hero-cta')).toHaveCount(0);
    await expect(page.locator('.hero a, .hero button')).toHaveCount(0);
    // …og handlingen er der stadig
    await expect(page.locator('.bestil-fast')).toBeVisible();
  });
});

/* DAGENS RET-PANELET LIGGER PÅ FORSIDEN.

   Her stod ni tests om "Bestil mad": et kort med dagens ret og et
   net af slags-kort, der alle LINKEDE videre til bestil/.

   Kunden holdt det op mod designbundtet og sagde det rent ud —
   siden skal se ud som filerne, og i filerne ligger HELE
   bestillingsformularen på forsiden. Gæsten lander, ser hvad der
   er i dag, og trykker send uden at skifte side.

   Testene herunder måler den formular, og især de tre steder hvor
   vi bevidst IKKE gjorde som bundtet: én dag i datovælgeren, ingen
   levering, og forretningens rigtige åbningstid i stedet for
   bundtets opfundne serveringstider. */
/* ============ BESTILLINGEN LIGGER PÅ FORSIDEN =================

   Her lå "Dagens ret": et panel med retten, en tæller og fem
   rækker med "+ tilføj", der var LINKS videre til bestil/ og
   menu.html. Kunden stillede det eneste rigtige spørgsmål (23/8):
   *"er det altså meningen, maden skal rulles ned, når man trykker
   på en af de fire, og man kan bestille direkte der uden at skulle
   ind på en side?"*

   Nu ER det. Panelet er væk, og js/dagens.js med det — 465 linjer,
   der byggede en ringere udgave af den formular, bestillingssiden
   allerede havde. Forsiden bruger den samme motor.

   De påstande, der handler om selve formularen — dage, tider,
   varsel, fyld, kurven, kigget, afsendelsen — måles i
   bestilling.spec.js og gentages ikke her. Det, der måles HER, er
   det, der er nyt: at formularen overhovedet er på forsiden, og at
   den viser det rigtige udvalg.
   ============================================================= */
test.describe('Bestillingen på forsiden', () => {

  function medRet(ekstra = {}) {
    const d = grunddata();
    d.indstillinger = {
      ...d.indstillinger,
      dagens_ret: { navn: 'Stegt flæsk', beskrivelse: 'Med persillesovs.', pris: 95 },
      bestilling_varsel_timer: 0,
      ...ekstra,
    };
    return d;
  }

  /* DEN VIGTIGSTE: motoren skal faktisk tegne. Formularen står i
     HTML'en uanset hvad, så en tom liste ville se ud som en
     færdig side — og det var præcis sådan, fejlen viste sig, da
     bestilling.js lå EFTER side.js i script-rækkefølgen:
     ingen dage, ingen varer, ingen fejl i konsollen. */
  test('formularen er tegnet med dage og varer, ikke bare markup', async ({ page }) => {
    const d = medRet();
    d.indstillinger.bestilbare_kategorier = [9];
    await åbn(page, '/index.html', { data: d });

    await expect(page.locator('#bestil-form')).toBeVisible();
    expect(await page.locator('#bestil-dag option').count(),
      'datovælgeren er tom — kørte MosedeBestilling.start() overhovedet?')
      .toBeGreaterThan(0);
    await expect(page.locator('#bestil-stykker .stk-linje').first()).toBeVisible();
  });

  /* Dagens ret er ikke væk — den står ØVERST i listen med sin egen
     tæller, som på bestillingssiden. */
  test('dagens ret står som første række med pris og tæller', async ({ page }) => {
    await åbn(page, '/index.html', { data: medRet() });

    const gruppe = page.locator('#bestil-stykker .vare-gruppe').first();
    await expect(gruppe.locator('.fold-navn')).toHaveText('Dagens ret');
    await expect(gruppe).toContainText('Stegt flæsk');
    await expect(gruppe).toContainText('95,-');
    await expect(gruppe.locator('button', { hasText: '+' }).first()).toBeVisible();
  });

  /* Datoen over overskriften. js/dagens.js skrev den, og den fil
     er slettet; js/side.js gør det nu med én linje. */
  test('datoen står over formularen', async ({ page }) => {
    await åbn(page, '/index.html', { data: medRet() });
    await expect(page.locator('#bestil-dato')).toContainText('7. august');
  });

  /* STYKKERNE ER MED — FYLDET ER IKKE.

     Første udgave tog HELE smørrebrødet ud af forsiden. Det var
     rigtigt tænkt: det er "en anden slags bestilling for sig
     selv". Men forretningen har ikke åbnet for andet endnu, så
     listen blev tom, og afsnittet skjulte sig selv. Kunden så
     det med det samme: "nu er bestillings tingen væk fra
     sectionen nummer 2 — det er der, man primært skal bestille."

     Skellet går et andet sted nu: et stykke smørrebrød er MAD og
     hører i listen. Det, der bliver på bestil/, er BYGGERIET —
     de 29 slags fyld, varslet og mindsteantallet. */
  test('stykkerne er med i forsidens liste, men fyldet er ikke', async ({ page }) => {
    const d = medRet();
    d.indstillinger.bestilbare_kategorier = [9];
    await åbn(page, '/index.html', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const grupper = await page.locator('#bestil-stykker .fold-navn').allInnerTexts();
    expect(grupper.join(' · '), 'stykkerne mangler i forsidens bestilling')
      .toContain('Smørrebrød');

    /* Fyldfolden hører til byggeriet og må ikke være her — den
       ville gøre forsidens formular til bestil/ en gang til. */
    await expect(page.locator('#bestil-fyld-trin')).toBeHidden();

    /* Og fyldene står ikke som varer i listen. Grunddata har to
       fyld uden pris; med priser ville de være bestilbare varer
       på bestil/, men de hører stadig ikke til her. */
    const tekst = await page.locator('#bestil-stykker').textContent();
    expect(tekst, 'fyldet er havnet i forsidens liste')
      .not.toContain('Leverpostej');
  });

  /* ISEN KAN IKKE BESTILLES. Kundens ord (23/8): "det skal man
     ikke kunne bestille, det er altid til rådighed."

     Fluebenet i admin må ikke kunne åbne den igen — derfor er
     reglen i Butik.udvalg og ikke i opmærkningen. Prøven sætter
     fluebenet med vilje. */
  test('isen kan ikke bestilles, heller ikke med fluebenet sat', async ({ page }) => {
    const d = medRet();
    d.indstillinger.bestilbare_kategorier = [6, 9];   // 6 er Softice og vafler
    await åbn(page, '/index.html', { data: d });

    /* Der måles på FOLDENES NAVNE og ikke på listens tekst: en
       lukket fold er skjult, så innerText ville sige "Softice er
       ikke der" om enhver kategori, der bare ikke var åbnet. */
    const grupper = await page.locator('#bestil-stykker .fold-navn').allInnerTexts();
    expect(grupper.join(' · '), 'isen kan bestilles — fluebenet slog igennem')
      .not.toContain('Softice');
    // Øllen er med, så prøven ikke består på en tom liste
    expect(grupper.join(' · ')).toContain('Øl');
  });

  /* Isafsnittet er en fremvisning og ikke en formular. Kommer der
     en tæller eller en bestil-knap i det, er vi tilbage ved dét,
     kunden bad om at få væk. */
  test('isafsnittet har ingen bestilling i sig', async ({ page }) => {
    await åbn(page, '/index.html', { data: medRet() });
    await expect(page.locator('#isen [data-step], #isen .stk-linje')).toHaveCount(0);
    await expect(page.locator('#isen form')).toHaveCount(0);
  });
});

/* ============ SMØRREBRØDET HAR SIT EGET AFSNIT ================
   Kundens ord (23/8): "det er en af deres hovedting og fortjener
   deres eget bestillings ting."
   ============================================================= */
test.describe('Smørrebrødets afsnit', () => {

  test('afsnittet står der med tal, der er talt', async ({ page }) => {
    await åbn(page, '/index.html');
    const sek = page.locator('#smoerrebroed');
    await expect(sek).toBeVisible();

    /* Tallene TÆLLES på det rigtige menukort. grunddata har ét
       stykke med pris og to slags fyld. Skrives de i hånden, kan
       de blive forkerte den dag, personalet lægger en slags ind. */
    await expect(page.locator('#smoer-forside-stykker')).toHaveText('1');
    await expect(page.locator('#smoer-forside-fyld')).toHaveText('2');
    await expect(page.locator('#smoer-forside-chips .chip').first()).toBeVisible();
  });

  test('afsnittet fører til smørrebrødets egen bestilling', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#smoerrebroed a[href="bestil/"]')).toHaveCount(1);
  });

  /* Er der intet smørrebrød på kortet, findes afsnittet ikke. En
     overskrift over ingenting fortæller gæsten, at der aldrig er
     noget. */
  test('uden smørrebrød på kortet findes afsnittet ikke', async ({ page }) => {
    const d = grunddata({ menu_varer: [] });
    await åbn(page, '/index.html', { data: d });
    await expect(page.locator('#smoerrebroed')).toBeHidden();
  });
});

test.describe('Isen', () => {

  test('kuglerne står ved isen, ikke i deres eget afsnit', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.dagens_kugler = [
      { navn: 'Jordbær', farve: '#f0c3bb' }, { navn: 'Vanilje', farve: '' },
    ];
    await åbn(page, '/index.html', { data: d });

    await expect(page.locator('#isen #kugler-blok')).toBeVisible();
    await expect(page.locator('#kugler-liste .chip')).toHaveCount(2);
    await expect(page.locator('#kugler-dag')).toHaveText('2 slags på tavlen i dag');
  });

  /* Skjules helt, når tavlen er tom. Et mærkat uden piller under
     ligner et sted, hvor der plejede at stå noget. */
  test('tom tavle skjuler blokken, men ikke isafsnittet', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#kugler-blok')).toBeHidden();
    await expect(page.locator('#isen')).toBeVisible();
  });
});

test.describe('Hvad kan vi hjælpe med?', () => {

  test('de seks ærinder kan vælges', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#hjaelp .row-card')).toHaveCount(6);
    for (const sti of ['bord/', 'smoerrebroed-ud-af-huset/', 'selskaber/',
      'catering/', 'baglokale/', 'arrangementer/']) {
      await expect(page.locator(`#hjaelp a[href="${sti}"]`),
        `rækken til ${sti} mangler`).toHaveCount(1);
    }
  });

  /* Rækkerne er den samme slags løfte som resten af siden: ingen
     opfundne tal. Priser og antal er ikke bekræftet af ejeren.

     DET HER ER IKKE EN TEORETISK REGEL. Designbundtet, kunden
     sendte 21/8, skrev "40 pers." på baglokalet, "borde 2–12" på
     bordene og "fra 24,-" på smørrebrødet — i selve menuen, hvor
     de ligner oplysninger og ikke reklame. Ingen af de tal er
     bekræftet af forretningen. */
  test('rækkerne nævner hverken pris eller antal', async ({ page }) => {
    await åbn(page, '/index.html');
    const tekst = await page.locator('#hjaelp').innerText();
    expect(tekst).not.toMatch(/\d+\s*kr/i);
    expect(tekst).not.toMatch(/\d+\s*(personer|pers)/i);
    expect(tekst).not.toMatch(/(op til|plads til)\s+\d+/i);
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

  /* DAGENS BESKED STÅR IKKE PÅ FORSIDEN LÆNGERE.

     Den har boet to steder — som stribe midt på siden og som
     banner under heroen — og røg ud med kundens ord (22/8):
     "kun de to der", musikken og Facebook. Feltet FINDES stadig
     i admin; testen her sørger for, at det ikke siver tilbage på
     forsiden, uden at nogen har besluttet det. Kontrakten om de
     to bannere uden kryds bor i designbundt.spec.js. */
  test('dagens besked bliver ikke til noget på forsiden', async ({ page }) => {
    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        dagens_besked: { vis: true, tekst: 'Kontanter virker ikke i dag.' },
      },
    });
    await åbn(page, '/index.html', { data });
    await expect(page.locator('.bn.besked')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('Kontanter virker ikke i dag.');
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
      /* Dagens ret sættes, så listen har en åben gruppe at måle
         på. Varslet sættes til nul, ellers er den tidligste dag i
         morgen, og så står dagens ret ikke i listen. */
      const d = grunddata();
      d.indstillinger.dagens_ret = { navn: 'Stegt flæsk', beskrivelse: '', pris: 89 };
      d.indstillinger.bestilling_varsel_timer = 0;
      await åbn(page, '/index.html', { data: d });
      await page.waitForSelector('#bestil-stykker .stk-linje');

      const svar = await page.evaluate(() => {
        const s = (v) => getComputedStyle(document.querySelector(v));
        const tal = (v) => Number(s(v).opacity);
        // Summen af overgangstiderne. Er den over nul, kører der en
        // bevægelse hos den der har bedt om ingen bevægelse.
        const tid = (v) => s(v).transitionDuration
          .split(',').reduce((n, d) => n + parseFloat(d), 0);
        return {
          dagensKort: tal('#bestil .form-kort'),
          slagsKort: tal('#bestil-stykker .vare-gruppe'),
          filmOpacitet: tal('#isen .film-ramme'),
          filmSloer: s('#isen .film-ramme').filter,
          tider: [
            tid('#bestil .form-kort'),
            tid('#bestil-stykker .vare-gruppe'),
            tid('#isen .film-ramme'),
          ],
        };
      });

      expect(svar.dagensKort, 'bestillingskortet er usynligt').toBeGreaterThan(0.95);
      expect(svar.slagsKort, 'kategorifolderne er usynlige').toBeGreaterThan(0.95);
      expect(svar.filmOpacitet, 'isfilmens ramme er usynlig').toBeGreaterThan(0.95);

      expect(svar.filmSloer, `isfilmen står uskarp: ${svar.filmSloer}`)
        .not.toMatch(/blur\((?!0)/);

      // Og ingen af de tre må have en overgang at køre
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

  /* DET, DER MÅ VENTE, ER AFKODNINGEN — IKKE HENTNINGEN.

     Testen krævede før, at der slet ikke blev sendt et kald efter
     videofilen, mens introen kørte, og begrundelsen var "1,3 MB
     ned ad linjen gør animationen hakkende". Den begrundelse
     holdt ikke: en hentning er NETVÆRK og rører aldrig
     hovedtråden. Målingen i js/side.js siger noget andet og mere
     præcist — det var load() plus afkodningen af de første
     billeder, der tog 21 af de 23 tabte billeder.

     Og den upræcise regel kostede noget. Kunden (22/8): "videoen
     på heroen starter ikke med det samme." Introen varer 1,73 s,
     så gik der 1,7 s mere, og FØRST DER begyndte telefonen at
     hente over mobilnettet.

     Kontrakten er derfor skarpere nu, og den har to halvdele:

       1) Bytesene er på vej, mens introen kører (rel=prefetch).
       2) Video-ELEMENTET har ingen kilder endnu — intet load(),
          ingen afkodning, ingenting der kan hakke.

     Begge skal holde. Den ene alene er en fælde: fjerner man
     prefetchen, består punkt 2 stadig, og videoen er lige så sen
     som før. */
  test('bytesene hentes under introen — men filmen afkodes først bagefter', async ({ page }) => {
    const hentet = [];
    page.on('request', (r) => {
      // hero-hoej er telefonudgaven. Uden den i mønsteret målte testen
      // ingenting i telefonprofilen og bestod af den grund.
      if (/hero(-hoej)?\.(mp4|webm)/.test(r.url())) hentet.push(r.url().split('/').pop());
    });

    // intro: true – introen får lov at køre
    await åbn(page, '/index.html', { intro: true });
    await expect(page.locator('#intro')).toBeVisible();

    // 1) Filen er allerede meldt til hentning
    await expect(page.locator('link[rel="prefetch"][href*="hero"]'),
      'prefetchen mangler — så begynder hentningen først efter introen')
      .toHaveCount(1);

    // 2) …men video-elementet har ikke rørt den endnu
    expect(await page.locator('#hero-film source').count(),
      'video-elementet må ikke afkode noget, mens introen kører').toBe(0);

    // Når introen er væk, kommer kilderne på
    await page.locator('#intro-spring').click();
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator('#hero-film source')).toHaveCount(2, { timeout: 10000 });
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
/* KAGEAFSNITTET ER VÆK FRA FORSIDEN.

   Der stod to tests her: at kagefotoet ikke blev hentet, før man
   havde rullet, og at srcset valgte den rigtige størrelse. Begge
   var rigtige, og begge målte et afsnit, forsiden ikke har mere —
   den har fire koncepter, og et kagefoto er ikke et af dem.

   Fotoet ligger stadig i billeder/, og reglen det håndhævede —
   ingen store billeder før gæsten har rullet — gælder stadig for
   isfilmen. Se "Videoen i hero" og isfilm.spec.js. */


/* Grundprincippet på forsiden: linjen over formularen og dagens-
   panelets kvittering følger ejerens kontakt (auto_bekraeft).
   FRA som standard — og så lover vi et opkald, som hele tiden.

   Linjen stod før under To go/Spis her-kortene. De er væk (22/8),
   og løftet er flyttet ned til formularen — det eneste sted på
   forsiden, hvor man rent faktisk sender en bestilling. Et løfte
   om, hvad der sker med bestillingen, hører hjemme dér hvor man
   trykker send, ikke i en overskrift 800 px længere oppe. */
test.describe('Grundprincippet på forsiden', () => {

  test('linjen over formularen lover opkald, til ejeren slår kontakten til', async ({ page }) => {
    const medRet = (ekstra = {}) => {
      const d = grunddata();
      d.indstillinger = { ...d.indstillinger, ...ekstra,
        /* Varslet i nul, ellers kan dagen i dag ikke vælges, og så
           er der ikke noget at bestille på forsiden — og afsnittet
           med manchetten i skjuler sig selv. */
        bestilling_varsel_timer: 0,
        dagens_ret: { navn: 'Stegt flæsk', beskrivelse: '', pris: 95 } };
      return d;
    };

    /* STANDARDEN ER VENDT (kundens ord, 23/8): "fjern det med ring
       og bekræft — de skal nok ringe og afbekræfte, hvis de ikke
       kan." Bestillingen ER aftalen nu, og kontakten i admin er
       vejen TILBAGE til opkald, ikke frem til det. */
    await åbn(page, '/index.html', { data: medRet() });
    await expect(page.locator('#bestil-manchet')).toContainText('betaler ved lugen');
    await expect(page.locator('#bestil-manchet')).not.toContainText('Vi ringer og bekræfter');

    await åbn(page, '/index.html', { data: medRet({ auto_bekraeft: false }) });
    await expect(page.locator('#bestil-manchet')).toContainText('Vi ringer og bekræfter');
  });

  /* KVITTERINGEN ER "BESTILT" SOM STANDARD. Prøven sender en
     rigtig bestilling fra forsiden — gennem det sidste kig — og
     læser, hvad gæsten får at vide bagefter. Det er den eneste
     måde at måle løftet på: teksten i markup'en siger ingenting
     om, hvad der står, NÅR der er sendt. */
  test('kvitteringen på forsiden siger Bestilt og ikke "vi ringer"', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = { ...d.indstillinger, bestilling_varsel_timer: 0,
      dagens_ret: { navn: 'Stegt flæsk', beskrivelse: '', pris: 95 } };
    await åbn(page, '/index.html', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    await page.locator('#bestil-stykker .stk-linje').first()
      .locator('button', { hasText: '+' }).click();
    await page.fill('#bestil-navn', 'Test Testesen');
    await page.fill('#bestil-telefon', '12345678');
    await page.locator('#bestil-send').click();
    await page.locator('#bestil-kig:not(.skjult)').waitFor();
    await page.locator('#kig-send').click();

    const tak = page.locator('#bestil-tak');
    await expect(tak).toBeVisible();
    await expect(tak).toContainText('Bestilt');
    await expect(tak).toContainText('Kan køkkenet mod forventning ikke lave den');
    await expect(tak).not.toContainText('Vi ringer til dig');

    // …og den ER landet i databasen
    const gemt = await gemteData(page);
    expect(gemt.bestillinger).toHaveLength(1);
  });

  /* DAGENS RETS PRIS SKAL MED HELE VEJEN.

     Retten står ikke i menukortet — den er ét felt i admin — og
     første udgave lagde den kun ind i TEGNINGEN af listen. Så
     kendte hverken kurvlinjen eller den afsendte bestilling dens
     pris: køkkenet fik "1 × Stegt flæsk" uden kroner, og
     salgstallet ville tælle den som nul.

     Fejlen kunne ikke ses på skærmen ét sted; den kunne kun ses
     ved at følge tallet fra kurven til databasen. */
  test('dagens rets pris følger med i kurven og i bestillingen', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = { ...d.indstillinger, bestilling_varsel_timer: 0,
      dagens_ret: { navn: 'Stegt flæsk', beskrivelse: '', pris: 95 } };
    await åbn(page, '/index.html', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const ret = page.locator('#bestil-stykker .stk-linje', { hasText: 'Stegt flæsk' });
    await ret.getByRole('button', { name: /Én mere/ }).click();

    // Kurvlinjen siger prisen og ikke "pris følger"
    await expect(page.locator('#bestil-sum-tekst')).toContainText('95');
    await expect(page.locator('#bestil-sum-tekst')).not.toContainText('pris følger');

    await page.fill('#bestil-navn', 'Test Testesen');
    await page.fill('#bestil-telefon', '12345678');
    await page.locator('#bestil-send').click();
    await page.locator('#bestil-kig:not(.skjult)').waitFor();
    await page.locator('#kig-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const gemt = await gemteData(page);
    const linje = gemt.bestillinger[0].linjer
      .filter((l) => l.navn === 'Stegt flæsk')[0];
    expect(linje, 'dagens ret kom slet ikke med').toBeTruthy();
    expect(linje.pris, 'køkkenet fik retten uden pris').toBe(95);
  });
});

/* ============ SEKTIONERNE KAN SKELNES FRA HINANDEN ============

   Kundens ord (22/8): "lav sektionerne tydeligere, så det ikke
   føles som 1 lang forside."

   Det var ikke afstanden, der manglede — der var op til 132 px
   luft mellem afsnittene. Fejlen var, at ALT stod på den samme
   sandfarve. Luft mellem to ting på samme bund læses ikke som
   "nyt afsnit"; den læses som "her mangler der noget".

   Prøven måler den faktiske bundfarve på hver sektion og kræver,
   at to naboer aldrig har den samme. Den kan ikke snydes med en
   ekstra margen. */
test.describe('Forsidens sektioner har hver sin grund', () => {

  test('to naboer står aldrig på samme farve', async ({ page }) => {
    const d = grunddata({
      nyheder: [{ id: 1, titel: 'Nyt', tekst: 'Noget nyt.', dato: '2026-08-06', aktiv: true }],
    });
    d.indstillinger = { ...d.indstillinger,
      dagens_ret: { navn: 'Stegt flæsk', beskrivelse: '', pris: 95 } };
    await åbn(page, '/index.html', { data: d });

    /* Den MALEDE bund og ikke elementets egen erklæring. Et
       afsnit uden baggrund er gennemsigtigt, og så svarer
       getComputedStyle "rgba(0, 0, 0, 0)" — en streng, der er
       forskellig fra alle farver. Første udgave af prøven
       sammenlignede dem direkte og BESTOD, da .grund-varm blev
       sat til sandets egen farve: to naboer, der så ens ud, men
       hed noget forskelligt. Det er den samme fælde som i
       kontrastmålingen, og svaret er det samme: gå op gennem
       forældrene til den første massive flade. */
    const grunde = await page.evaluate(() => {
      function malet(el) {
        for (var n = el; n; n = n.parentElement) {
          var b = getComputedStyle(n).backgroundColor;
          var m = /rgba?\(([^)]+)\)/.exec(b);
          if (!m) continue;
          var dele = m[1].split(',').map(function (x) { return parseFloat(x); });
          if (dele.length < 4 || dele[3] > 0.95) return b;
        }
        return 'ingen';
      }
      return [...document.querySelectorAll('main section')]
        .filter((s) => !s.classList.contains('skjult'))
        .map((s) => [s.id, malet(s)]);
    });

    expect(grunde.length, 'sektionerne blev ikke fundet').toBeGreaterThan(4);
    for (let i = 1; i < grunde.length; i++) {
      expect(grunde[i][1],
        `#${grunde[i - 1][0]} og #${grunde[i][0]} står på den samme farve`)
        .not.toBe(grunde[i - 1][1]);
    }
  });

  /* Den ene kraftige skæring. Menukortet står på marineblå, og
     kortene på den skal være TÆTTE — .82 hvid på marineblå giver
     cirka #d4d9de, og mod den falder de 13px i .afd-tal under
     kravet på 4,5:1. Kontrastprøven regner det efter; her måles
     bare, at kortet ikke er halvgennemsigtigt. */
  test('menukortets flade er mørk, og kortene på den er tætte', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#menu')).toHaveClass(/grund-dyb/);
    const kort = await page.locator('#afd-net .afd-kort').first()
      .evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(kort, 'kortet er gennemsigtigt på den mørke grund')
      .not.toMatch(/rgba\(.*0?\.\d+\)/);
  });
});

/* ================ NYHEDERNE ER EN TIDSLINJE ===================

   Kundens ord (22/8): "nyhederne — lad det se bedre og mere
   spændende ud."

   Tre ens hvide kort under hinanden er en liste. Det eneste, der
   stod på dem, var rækkefølgen — nyeste øverst — og den kunne man
   ikke se; man skulle læse tre datoer og selv regne den ud. Nu
   siger formen det: en linje ned gennem strømmen med en prik ved
   hvert kort, og den ØVERSTE prik er fyldt og ånder. */
test.describe('Nyhedsstrømmen', () => {

  const medNyheder = () => grunddata({
    nyheder: [
      { id: 1, titel: 'Længere åbent', tekst: 'Til kl. 21.', dato: '2026-08-06', aktiv: true },
      { id: 2, titel: 'Nye kager', tekst: 'Fra i morges.', dato: '2026-08-02', aktiv: true },
    ],
  });

  test('der tegnes en tidslinje med en prik pr. nyhed', async ({ page }) => {
    await åbn(page, '/index.html', { data: medNyheder() });

    // Linjen bag strømmen
    const linje = await page.locator('#nyhedsnet').evaluate((e) => {
      const s = getComputedStyle(e, '::before');
      return { indhold: s.content, bredde: parseFloat(s.width) };
    });
    expect(linje.indhold, 'tidslinjen mangler').not.toBe('none');
    expect(linje.bredde).toBeGreaterThan(0);

    // …og en prik ved hvert kort
    const prikker = await page.locator('#nyhedsnet .nw').evaluateAll((es) =>
      es.map((e) => getComputedStyle(e, '::before').content));
    expect(prikker).toHaveLength(2);
    prikker.forEach((p) => expect(p).not.toBe('none'));
  });

  /* Den nyeste skal kunne SES som den nyeste. Er alle prikker og
     alle overskrifter ens, er strømmen en stak, og så er vi
     tilbage ved den liste, kunden kaldte kedelig. */
  test('den nyeste står frem foran de ældre', async ({ page }) => {
    await åbn(page, '/index.html', { data: medNyheder() });

    const maal = await page.locator('#nyhedsnet .nw').evaluateAll((es) => es.map((e) => ({
      prik: getComputedStyle(e, '::before').backgroundColor,
      titel: parseFloat(getComputedStyle(e.querySelector('h3')).fontSize),
    })));

    expect(maal[0].prik, 'den øverste prik ser ud som de andre')
      .not.toBe(maal[1].prik);
    expect(maal[0].titel, 'den nyeste overskrift står ikke større')
      .toBeGreaterThan(maal[1].titel);
  });

  /* "Der er ikke noget nyt lige nu" er ikke en nyhed. En
     pulserende rød prik ud for den ville sige det stik modsatte
     af, hvad der står. */
  test('tom-beskeden på nyhedssiden får ingen prik', async ({ page }) => {
    await åbn(page, '/nyheder/', { data: grunddata({ nyheder: [] }) });
    await expect(page.locator('#nyhedsliste .nw-tom')).toHaveCount(1);
    const prik = await page.locator('#nyhedsliste .nw-tom')
      .evaluate((e) => getComputedStyle(e, '::before').display);
    expect(prik).toBe('none');
  });
});

/* =========== RINGEN OVER Å SKAL HAVE PLADS ====================

   Kunden sendte et skærmbillede fra bestil/, hvor "SÅ TAGER VI
   DEN I TELEFONEN" lå oven i sin egen eyebrow, "SKAL DET VÆRE
   STØRRE?".

   Det er ikke en margen, der mangler. Overskrifterne står med
   line-height .88, altså en LINJEBOKS, der er mindre end selve
   bogstavet — det er dét, der giver den tætte stak. Prisen er, at
   alt over versalhøjde stikker ud over boksen foroven: ringen på
   Å, stregen på Ø, prikkerne på Ä. Og dansk sætter dem i første
   bogstav hele tiden.

   Prøven måler hullet mellem eyebrow'ens underkant og
   overskriftens linjeboks på hver eneste side. Det skal være
   mindst .15em af overskriftens skriftstørrelse. */
test.describe('Overskrifter ligger ikke oven i deres eyebrow', () => {

  const SIDER = ['/index.html', '/bestil/', '/menu.html', '/bord/',
    '/selskaber/', '/catering/', '/baglokale/', '/arrangementer/',
    '/smoerrebroed-ud-af-huset/', '/nyheder/'];

  for (const sti of SIDER) {
    test(`${sti} har luft nok over hver overskrift`, async ({ page }) => {
      await åbn(page, sti);

      const knappe = await page.evaluate(() => {
        const ud = [];
        document.querySelectorAll('.eyebrow').forEach((e) => {
          const h = e.nextElementSibling;
          if (!h || !/^H[123]$/.test(h.tagName)) return;
          if (!h.offsetParent) return;
          const hul = h.getBoundingClientRect().top - e.getBoundingClientRect().bottom;
          const px = parseFloat(getComputedStyle(h).fontSize);
          ud.push({ tekst: h.textContent.trim().slice(0, 24), hul, kraev: px * 0.15 });
        });
        return ud.filter((x) => x.hul < x.kraev);
      });

      expect(knappe.map((x) => `${x.tekst}: ${Math.round(x.hul)} px, kræver ${Math.round(x.kraev)}`))
        .toEqual([]);
    });
  }
});
