/* KLOKKEN OEVERST TIL HOEJRE  (30/8)

   Kundens ord: "historik er fint, men skal gøres bedre både
   teknisk og placeringen skal være en klokke oppe i højre
   hjørne ... og virke for mosedehavnecafeen."

   ⚠️ DEN ER IKKE EN NY DATAKILDE. Den læser de lister, fanerne
   allerede har meldt ind. En klokke med sin EGEN hentning kunne
   sige noget andet end fanen ved siden af, og så holder man op
   med at stole på tallet. */

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata } = require('./hjaelp');

const I_DAG = '2026-08-07';

function medNyt(ændringer) {
  const d = grunddata();
  d.bestillinger = [{
    id: 1, lokation_id: 'mosede', reference: 'SM-K-1', navn: 'Bo Jensen',
    telefon: '20304050', email: null, hent_dato: I_DAG, hent_tid: '13:00',
    linjer: [{ navn: 'Softice med guf', antal: 4, pris: 35.5 }], fyld: [], antal: 4,
    besked: null, status: 'ny', hvordan: 'afhentning', leverings_adresse: null,
    bord_nummer: null, intern_note: null, slettet: null,
    oprettet: '2026-08-07T10:00:00Z',
  }];
  d.forespoergsler = [{
    id: 1, lokation_id: 'mosede', reference: 'FO-1', type: 'selskab',
    navn: 'Anna Hansen', telefon: '20304051', email: null, dato: '2026-12-05',
    antal_personer: 30, besked: null, detaljer: {}, status: 'ny',
    intern_note: null, slettet: null, oprettet: '2026-08-06T09:00:00Z',
  }];
  return Object.assign(d, ændringer || {});
}

test.describe('Klokken', () => {

  test('tallet siger, hvor meget der er ulæst', async ({ page }) => {
    await åbnAdmin(page, { data: medNyt() });
    await expect(page.locator('#klokke-tal')).toHaveText('2');
    await expect(page.locator('#klokke-tal')).toBeVisible();
  });

  /* Et tal, der altid står der, holder man op med at se på. */
  test('uden noget nyt er tallet væk', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    const tal = page.locator('#klokke-tal');
    await expect(tal).toHaveCount(1);
    await expect(tal).toBeHidden();
  });

  /* ⚠️ GRUPPERET PÅ DEN DAG, DET GÆLDER — ikke på den dag, det
     kom ind. Personalet planlægger efter hvornår maden skal ud. */
  test('posterne står under den dag, de gælder', async ({ page }) => {
    await åbnAdmin(page, { data: medNyt() });
    await page.locator('#klokke-knap').click();

    const dage = await page.$$eval('.klokke-dag', (e) => e.map((x) => x.textContent));
    expect(dage.join(' ')).toContain('7. august');
    expect(dage.join(' ')).toContain('5. december');
  });

  test('pilen åbner fanen og markerer posten som læst', async ({ page }) => {
    await åbnAdmin(page, { data: medNyt() });
    await page.locator('#klokke-knap').click();
    await page.locator('.klokke-post', { hasText: 'Bo Jensen' })
      .locator('.klokke-aabn').click();

    await expect(page.locator('#p-bestillinger')).not.toHaveClass(/skjult/);
    await expect(page.locator('#klokke-tal')).toHaveText('1');
  });

  /* ⚠️ EN LÆST POST BLIVER STÅENDE, den bliver bare stille.
     Fjernede vi den, kunne personalet ikke finde tilbage til den
     — og så er klokken en liste, man ikke tør røre. */
  test('markeret som læst forsvinder posten ikke', async ({ page }) => {
    await åbnAdmin(page, { data: medNyt() });
    await page.locator('#klokke-knap').click();
    const post = page.locator('.klokke-post', { hasText: 'Bo Jensen' });
    await post.locator('.klokke-vaek').click();

    await expect(post).toHaveCount(1);
    await expect(post).toHaveClass(/laest/);
    await expect(page.locator('#klokke-tal')).toHaveText('1');
  });

  test('markér alle som læst slukker tallet', async ({ page }) => {
    await åbnAdmin(page, { data: medNyt() });
    await page.locator('#klokke-knap').click();
    await page.locator('#klokke-alle').click();
    await expect(page.locator('#klokke-tal')).toBeHidden();
  });

  /* ⚠️ KUN DET, DER IKKE ER SET PÅ. En bestilling, nogen har sat
     til "bekræftet", er set — og skal ikke blive ved med at råbe. */
  test('en bekræftet bestilling tæller ikke med', async ({ page }) => {
    const d = medNyt();
    d.bestillinger[0].status = 'bekraeftet';
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#klokke-tal')).toHaveText('1');
  });

  /* ⚠️ ET KLIK INDE I LAGET MÅ IKKE LUKKE DET. Uden
     stopPropagation lukkede laget sig selv, i det sekund man
     trykkede ✕ på en post. */
  test('laget bliver åbent, når man trykker inde i det', async ({ page }) => {
    await åbnAdmin(page, { data: medNyt() });
    await page.locator('#klokke-knap').click();
    await page.locator('.klokke-post').first().locator('.klokke-vaek').click();
    await expect(page.locator('#klokke-lag')).not.toHaveClass(/skjult/);
  });

  test('et klik ved siden af lukker', async ({ page }) => {
    await åbnAdmin(page, { data: medNyt() });
    await page.locator('#klokke-knap').click();
    await expect(page.locator('#klokke-lag')).not.toHaveClass(/skjult/);
    await page.locator('#fane-titel').click();
    await expect(page.locator('#klokke-lag')).toHaveClass(/skjult/);
  });
});

/* ============================================================
   UGENS PÅMINDELSE — LØRDAG OG SØNDAG FRA KL. 10  (14/9)
   Kundens ord: "hver lørdag og søndag … husk at indstille ugens
   dagens retter, og tjek, at de ikke sælger noget, de ikke har, og
   er klar til ugen — og at den også ryger i meddelelsestingen i
   højre hjørne". Uret sættes udefra; tallet for næste uge regnes af
   Dagens ret-fanens egne rækker, og en slukket ret tæller ikke.
   ============================================================ */
test.describe('Ugens påmindelse i klokken', () => {
  const LØRDAG_10_30 = '2026-08-08T08:30:00Z'; // kl. 10.30 dansk sommertid
  const LØRDAG_9_30 = '2026-08-08T07:30:00Z';
  const SØNDAG_10_30 = '2026-08-09T08:30:00Z';

  function medUgeplan() {
    const d = grunddata();
    d.dagens_retter = [
      { id: 1, lokation_id: 'mosede', dato: '2026-08-10', navn: 'Stegt flæsk', pris: 119, aktiv: true, sortering: 1 },
      { id: 2, lokation_id: 'mosede', dato: '2026-08-12', navn: 'Frikadeller', pris: 99, aktiv: true, sortering: 1 },
      { id: 3, lokation_id: 'mosede', dato: '2026-08-13', navn: 'Slukket ret', pris: 99, aktiv: false, sortering: 1 },
    ];
    return d;
  }

  test('lørdag kl. 10.30 står påmindelsen med næste uges tal — og pilen åbner Dagens ret', async ({ page }) => {
    await åbnAdmin(page, { ur: LØRDAG_10_30, data: medUgeplan() });
    await expect(page.locator('#klokke-tal')).toHaveText('1');
    await page.locator('#klokke-knap').click();
    const post = page.locator('.klokke-post', { hasText: 'Husk ugens dagens retter' });
    await expect(post).toHaveCount(1);
    await expect(post, 'to af næste uges dage har en ret — den slukkede tæller ikke').toContainText('2 af 7 dage');
    await expect(post).toContainText('ikke har');
    await post.locator('.klokke-aabn').click();
    await expect(page.locator('#p-dagensret')).not.toHaveClass(/skjult/);
  });

  test('søndag står den også — men ikke lørdag før kl. 10 eller en fredag', async ({ page, browser }) => {
    await åbnAdmin(page, { ur: SØNDAG_10_30, data: medUgeplan() });
    await expect(page.locator('#klokke-tal')).toHaveText('1');

    for (const ur of [LØRDAG_9_30, '2026-08-07T11:00:00Z']) {
      const side = await browser.newPage();
      await åbnAdmin(side, { ur, data: medUgeplan() });
      await expect(side.locator('#klokke-knap')).toBeVisible();
      await expect(side.locator('#klokke-tal'), 'påmindelsen står uden for lørdag/søndag fra kl. 10 (' + ur + ')').toBeHidden();
      await side.close();
    }
  });
});

/* Klokken og databasen skriver hver sin udgave af "lørdag og søndag
   kl. 10" — den ene kører i browseren, den anden i pg_cron. Prøven
   holder de to ens, så telefonen og klokken aldrig siger hver sit. */
test.describe('Påmindelsens dage står ens to steder', () => {
  test.skip(({ isMobile }) => !!isMobile, 'læser filer, ikke en side');

  test('klokken, funktionen og pg_cron er enige om dagene og klokkeslættet', () => {
    const fs = require('fs');
    const path = require('path');
    const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'admin', 'klokke.js'), 'utf8');
    const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'ugepaamindelse.sql'), 'utf8')
      .replace(/--.*$/gm, '');
    const dage = js.match(/PAAMINDELSE_DAGE\s*=\s*\[([^\]]+)\]/)[1].split(',').map(Number); // 0 = mandag
    const fraMin = js.match(/PAAMINDELSE_FRA_MIN\s*=\s*([\d\s*]+);/)[1].split('*').map(Number).reduce((a, b) => a * b, 1);
    const isodow = sql.match(/isodow from nu\) not in \(([^)]+)\)/)[1].split(',').map(Number);
    const time = Number(sql.match(/extract\(hour from nu\) <> (\d+)/)[1]);
    expect(isodow.slice().sort(), 'funktionens dage mod klokkens').toEqual(dage.map((d) => d + 1).sort());
    expect(time * 60, 'funktionens klokkeslæt mod klokkens').toBe(fraMin);
    const [, timer, , , dow] = sql.match(/'mosede-ugepaamindelse', '([^']+)'/)[1].split(' ');
    expect(dow.split(',').map(Number).map((d) => (d === 0 ? 7 : d)).sort(), 'pg_cron kører på andre dage').toEqual(isodow.slice().sort());
    expect(timer.split(',').map(Number), 'pg_cron (UTC) rammer ikke kl. 10 dansk tid sommer og vinter').toEqual([time - 2, time - 1]);
  });
});
