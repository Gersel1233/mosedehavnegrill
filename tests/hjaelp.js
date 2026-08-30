/* Fælles hjælpere til testene.

   To ting gør testene pålidelige:

   1) Uret sættes fast. "Er der åbent nu?" afhænger af klokken,
      og en test der virker kl. 13 og fejler kl. 22 er ubrugelig.
   2) Dataene lægges i localStorage før siden kører. Så er der
      ingen database involveret, og hver test styrer præcis hvad
      der står i den.
*/

const NØGLE = 'mosede_data_v1';

// Uret sættes til et bestemt øjeblik i UTC. Husk at Danmark er
// UTC+2 om sommeren og UTC+1 om vinteren – står der 11:00Z i
// august, er det 13:00 dansk tid.
async function sætUr(page, isoUtc) {
  await page.addInitScript((iso) => {
    const fast = new Date(iso).getTime();
    const Ægte = Date;
    class FastDato extends Ægte {
      constructor(...a) {
        if (a.length === 0) super(fast);
        else super(...a);
      }
      static now() { return fast; }
    }
    window.Date = FastDato;
  }, isoUtc);
}

async function sætData(page, data) {
  await page.addInitScript(([n, d]) => {
    try { localStorage.setItem(n, JSON.stringify(d)); } catch (e) { /* ignoreres */ }
  }, [NØGLE, data]);
}

/* Som sætData, men kun hvis der ikke allerede står noget.

   Bruges når testen skal gemme noget og derefter genindlæse eller
   gå videre til en anden side. Med sætData ville dataene blive
   overskrevet ved hver sidevisning, og så kunne man aldrig se om
   det gemte faktisk blev gemt. */
async function sætDataEngang(page, data) {
  await page.addInitScript(([n, d]) => {
    try {
      if (!localStorage.getItem(n)) localStorage.setItem(n, JSON.stringify(d));
    } catch (e) { /* ignoreres */ }
  }, [NØGLE, data]);
}

/* Springer login over. Uden database svarer det til at have
   trykket "Log ind" i øvetilstand. */
async function logInd(page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('mosede_token', 'lokal');
      sessionStorage.setItem('mosede_email', 'test@lesreg.dk');
    } catch (e) { /* ignoreres */ }
  });
}

async function åbnAdmin(page, { ur = '2026-08-07T11:00:00Z', data = grunddata() } = {}) {
  await lokalTilstand(page);
  await sætUr(page, ur);
  await sætDataEngang(page, data);
  await logInd(page);
  // admin.html har ingen intro – der er intet at springe over
  await page.goto('/admin.html');
}

/* Læser hvad der faktisk står gemt i browseren. Så kan testen
   se om en ændring nåede hele vejen ned, ikke bare om skærmen
   ser rigtig ud. */
async function gemteData(page) {
  return JSON.parse(await page.evaluate((n) => localStorage.getItem(n), NØGLE));
}

/* Standarddata som testene kan ændre på. Alle dage 11–21, så
   ugedagen ikke i sig selv afgør om der er åbent. */
function grunddata(ændringer = {}) {
  const tider = [];
  for (let u = 0; u < 7; u++) {
    tider.push({ lokation_id: 'mosede', ugedag: u, lukket: false, aabner: '11:00', lukker: '21:00' });
  }

  return {
    lokationer: [{
      id: 'mosede',
      navn: 'Mosede Havnecafe',
      adresse: 'Havnevej 20',
      postnr: '2670',
      by: 'Greve',
      telefon: '28871343',
      beskrivelse: 'Spis på trædækket med udsigt over bådene.',
      aktiv: true,
      sortering: 1,
    }],
    aabningstider: tider,
    lukkedage: [],
    menu_kategorier: [
      { id: 1, afdeling: 'mad', navn: 'Smørrebrød', sortering: 6, aktiv: true },
      { id: 6, afdeling: 'is', navn: 'Softice og vafler', sortering: 11, aktiv: true },
      { id: 9, afdeling: 'drikke', navn: 'Øl', sortering: 21, aktiv: true },
      // Ingen priser i denne: skal vises som pastiller, ikke som
      // en søjle af tankestreger
      { id: 12, afdeling: 'mad', navn: 'Vælg fyld til smørrebrødet', sortering: 7, aktiv: true },
    ],
    menu_varer: [
      {
        id: 1, kategori_id: 1, navn: 'Flæskestegssandwich',
        beskrivelse: 'Sprød flæskesteg, rødkål og agurkesalat.',
        pris: 89, fremhaevet: true, udsolgt: false, sortering: 1, aktiv: true,
      },
      {
        id: 2, kategori_id: 6, navn: 'Softice med guf',
        beskrivelse: null,
        pris: 35.5, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
      },
      {
        id: 3, kategori_id: 9, navn: 'Fadøl, lille', beskrivelse: null,
        pris: 35, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
      },
      {
        id: 4, kategori_id: 12, navn: 'Leverpostej med baconsvøb', beskrivelse: null,
        pris: null, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
      },
      {
        id: 5, kategori_id: 12, navn: 'Dyrlægens natmad', beskrivelse: null,
        pris: null, fremhaevet: false, udsolgt: false, sortering: 2, aktiv: true,
      },
    ],
    nyheder: [],
    indstillinger: {
      dagens_besked: { vis: false, tekst: '' },
      saeson: { lukket: false, aabner_igen: '', besked: '' },
      kontakt_email: '',
      dagens_kugler: [],
      vandtemp: '', vind: '', landing: '',
      menu_note: 'Smørrebrød kan leveres glutenfri eller uden smør.',
    },
    ...ændringer,
  };
}

/* Tvinger testene til at køre i lokal tilstand.

   js/config.js indeholder nu en RIGTIG anon-nøgle. Uden dette
   ville hver test forsøge at nå Supabase over nettet: langsomt,
   afhængigt af at databasen er oppe, og skrivetestene ville
   ændre i kundens virkelige data.

   Vi udskifter derfor filen med en tom udgave, mens testene
   kører. Det er samme kode der bliver prøvet – kun forbindelsen
   er koblet fra. At nøglen i den rigtige fil er gyldig og har
   den rigtige rolle, tjekkes for sig i config.spec.js. */
async function lokalTilstand(page) {
  await page.route('**/js/config.js*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD = { url: '', anonKey: '' };",
  }));

  /* ⚠️ SKRIFTERNE FRA GOOGLE AFVISES HER — FOR ALLE PRØVER (30/8).

     Det stod kun i åbnSkal(), så åbn() og åbnAdmin() lod siderne
     vente på fonts.googleapis.com, som miljøets udgangsproxy
     afviser. Det gik som regel godt, fordi afvisningen kommer
     hurtigt — men under en fuld runde med flere arbejdere faldt
     dobbeltafsendelses-prøven på 32 sekunders VENTETID, mens den
     bestod, når filen kørte alene. En prøve, der fejler på, hvor
     travlt maskinen har, måler ikke reglen.

     Det koster ingen dækning: Instrument Serif ligger lokalt i
     fonts/ og hentes af siden selv. Det, der afvises, er kun det
     fremmede CDN. */
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
}

/* Springer intro-animationen over.

   Introen dækker hele siden i under to sekunder. Kørte den i
   testene, ville hvert klik ramme et gennemsigtigt lag i stedet
   for knappen, og alt ville fejle af den forkerte grund.

   Den trykker på "Spring over" – gæstens egen knap. Det var før
   nok at sætte en nøgle i sessionStorage, fordi introen kun kom
   én gang pr. fane; nu kommer den hver gang, og så findes den
   genvej ikke længere. Det er en forbedring: testene går den
   samme vej som et menneske.

   Kaldes EFTER page.goto – knappen findes først når siden er
   indlæst. */
async function springIntroOver(page) {
  const knap = page.locator('#intro-spring');
  if (await knap.count()) {
    await knap.click({ timeout: 5000 }).catch(() => { /* introen kan være væk selv */ });
  }
  // Laget bliver fjernet fra DOM'en 650 ms efter. Vent på at det
  // er væk, ellers fanger det de næste klik.
  await page.waitForSelector('#intro', { state: 'detached', timeout: 8000 })
    .catch(() => { /* fandtes ikke, fx admin.html */ });
}

/* Åbner en side med fast ur og bestemte data på plads.

   intro: true lader animationen køre – kun de tests der handler
   om introen selv har brug for det. */
async function åbn(page, sti, {
  ur = '2026-08-07T11:00:00Z',
  data = grunddata(),
  intro = false,
} = {}) {
  await lokalTilstand(page);
  await sætUr(page, ur);
  await sætData(page, data);
  await page.goto(sti);
  // Introen kører nu ved hvert besøg, så den skal væk EFTER
  // indlæsningen. intro: true lader den køre – kun de tests der
  // handler om introen selv har brug for det.
  if (!intro) await springIntroOver(page);
}

/* Åbner en af de NYE sider (designet fra Claude Design).

   To ting adskiller den fra åbn():

   1) Ingen intro. De nye sider har ingen intro-animation, og
      åbn() ventede 8 sekunder på et #intro, der aldrig kom.

   2) Google Fonts spærres. Siderne henter Instrument Serif og
      Instrument Sans fra fonts.googleapis.com, og stylesheetet i
      <head> holder DOMContentLoaded tilbage, til det er hentet.
      MÅLT i prøvemiljøet: 12,7 sekunder pr. sideindlæsning, fordi
      forespørgslen ikke kan komme ud og først giver op til sidst.
      Skrifterne bliver på siden — det er kun prøverne, der
      springer dem over, og ingen prøve måler bogstavernes bredde.
*/
async function åbnSkal(page, sti, { ur = '2026-08-07T11:00:00Z', data = grunddata() } = {}) {
  await lokalTilstand(page);
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await sætUr(page, ur);
  await sætData(page, data);
  await page.goto(sti, { waitUntil: 'domcontentloaded' });
}

/* Åbner et foldet kort i admin, som et menneske gør det.

   ⚠️ "Regler for bestilling" blev foldet sammen 30/8 efter kundens
   ønske ("kan du ikke gøre så den her folder ned?"), og så kunne
   prøverne ikke længere klikke på felterne indeni — Playwright
   nægter at klikke på noget usynligt, præcis som en finger ikke
   kan ramme det. Det er ikke en fejl i folden; det er prisen for
   den, og den betales her ét sted i stedet for tretten. */
async function aabnFold(page, id) {
  const fold = page.locator('#' + id);
  if (await fold.count() && !(await fold.evaluate((e) => e.open))) {
    await fold.locator('> summary').click();
  }
}

/* Skifter fane i admin, som et menneske gør det.

   ⚠️ DEN VEJ ER FORSKELLIG PÅ DE TO PROFILER (30/8).

   På computer står fanerne i søjlen, og man trykker på dem. På
   telefonen ligger de i et ark bag "Mere" — kundens ord: "jeg kan
   ikke vælge imellem fanerne, fordi de forsvinder ned i telefonens
   bar", og svaret var fem faste pladser plus en dør til resten.

   Prøverne pegede før direkte på [data-panel] og ramte dermed et
   element, en finger ikke kan nå på en telefon. Det så ud som en
   fejl i prøven, men det VAR det rigtige svar: elementet er uden
   for skærmen, præcis som Playwright siger. Derfor går de nu den
   vej, personalet går — og det er samtidig en prøve på, at vejen
   overhovedet findes. */
async function visFane(page, panelId) {
  const knap = page.locator(`.faner button[data-panel="${panelId}"]`);
  const bar = page.locator('#bb-mere');
  // Baren findes kun under 900 px; på computer er søjlen der.
  if (await bar.isVisible().catch(() => false)) {
    const ark = page.locator('#fane-ark');
    if (!(await ark.evaluate((e) => e.classList.contains('aabent')))) {
      await bar.click();
      await ark.evaluate((e) => new Promise((ok) => {
        if (e.classList.contains('aabent')) return ok();
        e.addEventListener('transitionend', ok, { once: true });
        setTimeout(ok, 600);
      }));
    }
  }
  await knap.click();
}

module.exports = {
  sætUr, sætData, sætDataEngang, logInd, springIntroOver, lokalTilstand,
  grunddata, åbn, åbnSkal, åbnAdmin, gemteData, NØGLE, aabnFold, visFane,
};
