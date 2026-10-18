/* ============================================================
   «VI HOLDER LUKKET» — KORTET  (18/10)
   ------------------------------------------------------------
   Mikkels ord: *"at de har efterårsferie, og så at man ligesom ikke
   har kunne bestille, men man kan skrive, og så linken til mail …
   De skal vide præcis, hvordan man gør"*.

   MÅLT FØR: en pille «Lukket i dag · Efterårsferie» og et mørkt bånd.
   Ingen periode, intet om hvornår der er åbent igen, intet om at man
   kan forudbestille, ingen vej til at skrive.

   Hvad der skal holde (js/lukket.js og js/admin/kalender.js):
   - kortet står på de fem sider, en gæst kan bestille eller booke fra
   - «Vi er tilbage» regnes af ugeplanen og de andre lukninger — ikke
     én dag efter, uanset hvad
   - forudbestillingen nævnes kun, når bestillingen er slået til
   - mailknappen følger admin → Kontakt, og forsvinder med adressen
   - en ferie varsles en uge før; en enkelt lukket dag kun på dagen
   - i admin: én knap, «Hold lukket», og gæstens kort mens man skriver

   Datoerne i forventningerne er regnet i hånden fra en kalender —
   fredag 7. august 2026 — ikke af den kode, der måles.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, åbnAdmin, grunddata, visFane } = require('./hjaelp');

const UR = '2026-08-07T11:00:00Z';   /* fredag 7. august 2026 */
const MAIL = 'kontakt@mosedehavnecafe.dk';

function lukning(x) {
  return Object.assign({
    id: 901, lokation_id: 'mosede', type: 'lukkedag',
    dato: '2026-08-05', slut_dato: '2026-08-09',
    titel: 'Efterårsferie', emoji: '🍂',
    beskrivelse: '', lukker_kl: null, offentlig: false,
  }, x || {});
}

function data(kalender, indstillinger, x) {
  const d = grunddata(Object.assign({ kalender }, x || {}));
  d.indstillinger = Object.assign({}, d.indstillinger,
    { kontakt_email: MAIL, bestilbare_kategorier: [1, 6, 9] }, indstillinger || {});
  return d;
}

const kortet = (page) => page.locator('#lukket-kort');

/* ⚠️ «SKJULT» SKAL VÆRE SKJULT AF DEN RIGTIGE GRUND. Et kort, der
   endnu ikke er tegnet, er også skjult. Dagens besked i båndet
   tegnes i SAMME kald som kortet (visDagsbesked på forsiden) — står
   båndet der, har kortet taget sin beslutning. */
function medBånd(d) {
  d.dags_regler = [{
    id: 1, lokation_id: 'mosede', dato: '2026-08-07',
    luk_takeaway: false, luk_spis_her: false,
    tidligst: null, senest_togo: null, senest_spis_her: null,
    besked_titel: 'Ny is i disken', besked_til_gaester: 'Hindbær og lakrids.',
  }];
  return d;
}
async function intetKort(page) {
  await expect(page.locator('#dagsbesked')).toBeVisible();
  await expect(kortet(page)).toBeHidden();
}

/* ============================================================
   DE FEM SIDER
   ============================================================ */
const SIDER = [
  ['forsiden', '/index.html', '#bestil'],
  ['bestillingssiden', '/bestil/', '#bestil-form'],
  ['bordbookingen', '/bord/', '../index.html#bestil'],
  ['smørrebrødssiden', '/h-smorrebrod.html', '#bestil'],
  ['tapassiden', '/m-tapas.html', '#bestil-tapas'],
];

for (const [navn, sti, bestil] of SIDER) {
  test(`kortet står på ${navn} midt i en ferie`, async ({ page }) => {
    const fejl = [];
    page.on('pageerror', (e) => fejl.push(String(e.message)));
    await åbnSkal(page, sti, { ur: UR, data: data([lukning()]) });
    const k = kortet(page);
    await expect(k).toBeVisible();
    await expect(k.locator('.lukket-kicker')).toHaveText('Vi holder lukket');
    await expect(k.locator('.lukket-titel')).toHaveText('5.–9. august');
    await expect(k.locator('.lukket-hvorfor')).toHaveText('Efterårsferie.');
    /* Søndag den 9. er sidste dag; mandag den 10. er alle dage åbne. */
    await expect(k.locator('.lukket-tilbage')).toHaveText(/Vi er tilbage mandag d\. 10\. august/);
    await expect(k.locator('.lukket-bestil')).toContainText('Forudbestil gerne allerede nu');
    await expect(k.locator('.lukket-bestil a')).toHaveAttribute('href', bestil);
    await expect(k.getByRole('link', { name: 'Skriv til os' }))
      .toHaveAttribute('href', new RegExp('^mailto:' + MAIL.replace(/\./g, '\\.') + '\\?subject='));
    await expect(k.getByRole('link', { name: 'Kontakt os' })).toBeVisible();
    expect(fejl, 'siden kastede en fejl').toEqual([]);
  });
}

/* ⚠️ MODSTYKKET. En åben dag uden en lukning i sigte har intet kort —
   ellers ville et kort, der altid stod der, bestå alt ovenfor. */
test('en almindelig dag har intet kort — og ingen pille i heroen', async ({ page }) => {
  await åbnSkal(page, '/index.html', {
    ur: UR, data: medBånd(data([], { levering: true, leverings_omraade: 'Greve og Tune', leverings_gebyr: 79 })),
  });
  await intetKort(page);
  await expect(page.locator('[data-lukket-pil]')).toBeHidden();
  /* …og leveringsnyheden står, som den plejer — reglen, der lader den
     vige, må ikke tage den, når der ingen lukning er. */
  await expect(page.locator('.hero-nyhed')).toBeVisible();
});

/* ============================================================
   PILLEN I HEROEN  (18/10)
   Heroen fylder hele skærmen, og kortet står under den. Uden pillen
   så gæsten kun «Lukket i dag» — og ugen før en ferie «Åbent nu».
   ============================================================ */
test('heroen siger, hvornår vi er tilbage, og peger ned til kortet', async ({ page }) => {
  await åbnSkal(page, '/index.html', {
    ur: UR, data: data([lukning()], { levering: true, leverings_omraade: 'Greve og Tune', leverings_gebyr: 79 }),
  });
  const pil = page.locator('[data-lukket-pil]');
  await expect(pil).toBeVisible();
  await expect(pil).toHaveAttribute('href', '#lukket-kort');
  await expect(pil.locator('b')).toHaveText('Lukket');
  await expect(pil).toContainText('Tilbage mandag d. 10. august');
  /* Én pille i heroen: leveringsnyheden viger, mens lukningen står. */
  await expect(page.locator('.hero-nyhed')).toBeHidden();
  await pil.click();
  await expect.poll(() => page.evaluate(() => {
    const r = document.getElementById('lukket-kort').getBoundingClientRect();
    return r.top >= 0 && r.top < window.innerHeight / 2;
  })).toBe(true);
});

/* ============================================================
   «VI ER TILBAGE» REGNES
   ============================================================ */
test('«vi er tilbage» springer en lukket ugedag over', async ({ page }) => {
  const d = data([lukning()]);
  /* Mandag (ugedag 0) er lukket i ugeplanen — så er det tirsdag. */
  d.aabningstider = d.aabningstider.map((a) => (a.ugedag === 0 ? Object.assign({}, a, { lukket: true }) : a));
  await åbnSkal(page, '/index.html', { ur: UR, data: d });
  await expect(kortet(page).locator('.lukket-tilbage')).toHaveText(/tirsdag d\. 11\. august/);
  await expect(kortet(page).locator('.lukket-bestil')).toContainText('tirsdag d. 11. august');
});

test('to lukninger dør om dør er én lukning for gæsten', async ({ page }) => {
  await åbnSkal(page, '/index.html', {
    ur: UR,
    data: data([lukning(), lukning({ id: 902, dato: '2026-08-10', slut_dato: '2026-08-12', titel: 'Maling af trædækket' })]),
  });
  await expect(kortet(page).locator('.lukket-titel')).toHaveText('5.–12. august');
  await expect(kortet(page).locator('.lukket-tilbage')).toHaveText(/torsdag d\. 13\. august/);
});

test('en lukning hen over et månedsskifte skriver begge måneder', async ({ page }) => {
  await åbnSkal(page, '/index.html', {
    ur: UR, data: data([lukning({ dato: '2026-07-30', slut_dato: '2026-08-09' })]),
  });
  await expect(kortet(page).locator('.lukket-titel')).toHaveText('30. juli – 9. august');
});

/* ============================================================
   KUN DET, DER ER SANDT
   ============================================================ */
test('er bestillingen slået fra, lover kortet ingen forudbestilling', async ({ page }) => {
  await åbnSkal(page, '/index.html', {
    ur: UR, data: data([lukning()], { bestilling_aaben: false }),
  });
  await expect(kortet(page)).toBeVisible();
  await expect(kortet(page).locator('.lukket-bestil')).toHaveCount(0);
  /* Resten står der stadig — man kan skrive. */
  await expect(kortet(page).getByRole('link', { name: 'Skriv til os' })).toBeVisible();
  await expect(kortet(page)).toContainText('Forespørgsler om selskaber og catering');
});

test('mailknappen følger adressen i admin → Kontakt', async ({ page }) => {
  await åbnSkal(page, '/bestil/', {
    ur: UR, data: data([lukning()], { kontakt_email: 'hej@eksempel.dk' }),
  });
  await expect(kortet(page).getByRole('link', { name: 'Skriv til os' }))
    .toHaveAttribute('href', /^mailto:hej@eksempel\.dk\?/);
});

/* Admin → Kontakt sat til tomt betyder: adressen findes ikke mere
   (samme regel som js/skal/kontakt.js). En knap til en død adresse
   er værre end ingen knap. */
test('uden en mailadresse er der ingen mailknap — men Kontakt os står', async ({ page }) => {
  await åbnSkal(page, '/index.html', { ur: UR, data: data([lukning()], { kontakt_email: '' }) });
  await expect(kortet(page)).toBeVisible();
  await expect(kortet(page).getByRole('link', { name: 'Skriv til os' })).toHaveCount(0);
  await expect(kortet(page).getByRole('link', { name: 'Kontakt os' })).toBeVisible();
});

/* Titlen og beskeden er personalets frie tekst. */
test('personalets tekst skrives som tekst, ikke som opmærkning', async ({ page }) => {
  await åbnSkal(page, '/index.html', {
    ur: UR, data: data([lukning({ titel: 'Ferie <b>nu</b>', beskrivelse: 'Vi ses <i>snart</i>' })]),
  });
  await expect(kortet(page).locator('b, i')).toHaveCount(0);
  await expect(kortet(page).locator('.lukket-besked')).toHaveText('Vi ses <i>snart</i>');
});

/* ============================================================
   HVORNÅR KORTET STÅR
   ============================================================ */
test('en ferie varsles en uge før — og man kan bestille frem til den', async ({ page }) => {
  /* Fredag den 7.; ferien begynder fredag den 14. = præcis 7 dage. */
  await åbnSkal(page, '/index.html', {
    ur: UR, data: data([lukning({ dato: '2026-08-14', slut_dato: '2026-08-16' })]),
  });
  const k = kortet(page);
  await expect(k).toBeVisible();
  await expect(k.locator('.lukket-kicker')).toHaveText('Vi holder snart lukket');
  await expect(k.locator('.lukket-titel')).toHaveText('14.–16. august');
  await expect(k).toContainText('Indtil da har vi åbent som altid.');
  await expect(k.locator('.lukket-bestil')).toContainText('Bestil som altid frem til lukningen');
  await expect(k.locator('.lukket-bestil')).toContainText('mandag d. 17. august');
  /* Heroen siger «Åbent nu» i dag — pillen er det, der viser ferien. */
  const pil = page.locator('[data-lukket-pil]');
  await expect(pil.locator('b')).toHaveText('Snart lukket');
  await expect(pil).toContainText('14.–16. august');
});

test('en ferie mere end en uge ude står ikke endnu', async ({ page }) => {
  await åbnSkal(page, '/index.html', {
    ur: UR, data: medBånd(data([lukning({ dato: '2026-08-15', slut_dato: '2026-08-20' })])),
  });
  await intetKort(page);
});

test('en enkelt lukket dag står kun på dagen', async ({ page }) => {
  /* I morgen: intet kort i dag. */
  await åbnSkal(page, '/index.html', {
    ur: UR, data: medBånd(data([lukning({ dato: '2026-08-08', slut_dato: null, titel: 'Privat selskab' })])),
  });
  await intetKort(page);

  /* I dag: kortet, med dagen skrevet ud. */
  await åbnSkal(page, '/index.html', {
    ur: UR, data: data([lukning({ dato: '2026-08-07', slut_dato: null, titel: 'Privat selskab' })]),
  });
  await expect(kortet(page).locator('.lukket-titel')).toHaveText('Fredag d. 7. august');
  await expect(kortet(page).locator('.lukket-tilbage')).toHaveText(/lørdag d\. 8\. august/);
});

test('efter lukningen er kortet væk af sig selv', async ({ page }) => {
  await åbnSkal(page, '/index.html', {
    ur: UR, data: medBånd(data([lukning({ dato: '2026-08-01', slut_dato: '2026-08-06' })])),
  });
  await intetKort(page);
});

test('lukket for sæsonen: kortet siger det, uden en forudbestilling', async ({ page }) => {
  await åbnSkal(page, '/index.html', {
    ur: UR,
    data: data([], { saeson: { lukket: true, aabner_igen: '1. april', besked: 'Tak for en dejlig sæson.' } }),
  });
  const k = kortet(page);
  await expect(k.locator('.lukket-titel')).toHaveText('For sæsonen');
  await expect(k.locator('.lukket-tilbage')).toHaveText(/Vi åbner igen 1\. april/);
  await expect(k.locator('.lukket-besked')).toHaveText('Tak for en dejlig sæson.');
  await expect(k.locator('.lukket-bestil')).toHaveCount(0);
});

/* ============================================================
   ADMIN: ÉN KNAP, OG GÆSTENS KORT MENS MAN SKRIVER
   ============================================================ */
test.describe('Kalenderen i admin', () => {

  test('«Hold lukket» vælger lukkedagen og stiller markøren i datoen', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: data([]) });
    await visFane(page, 'p-kalender');
    await expect(page.locator('#ferie-liste')).toContainText('Ingen ferie eller lukkedage lagt ind.');
    /* ⚠️ Formularen STARTER på lukkedag. Uden et andet valg først
       bestod prøven også med en knap, der ikke valgte noget (set
       18/10) — så man står på «Lukker tidligt», som man gør efter
       den forrige indtastning. */
    await page.locator('#kalender-typer [data-type="tidlig_lukning"]').click();
    await expect(page.locator('#kalender-typer [data-type="lukkedag"]')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#ferie-ny').click();
    await expect(page.locator('#kalender-typer [data-type="lukkedag"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#kal-dato')).toBeFocused();
    await expect(page.locator('#kal-form-titel')).toHaveText('Hold lukket');
    await expect(page.locator('#kal-titel-etiket')).toContainText('Hvorfor?');
  });

  test('forhåndsvisningen er gæstens kort, mens man skriver', async ({ page }) => {
    const d = data([]);
    /* Mandag lukket i ugeplanen — tallet kommer udefra. */
    d.aabningstider = d.aabningstider.map((a) => (a.ugedag === 0 ? Object.assign({}, a, { lukket: true }) : a));
    await åbnAdmin(page, { ur: UR, data: d });
    await visFane(page, 'p-kalender');
    await page.locator('#ferie-ny').click();
    await page.locator('#kal-dato').fill('2026-10-12');
    await page.locator('#kal-slut').fill('2026-10-18');
    await page.locator('#kal-titel').fill('Efterårsferie');

    const vis = page.locator('#kal-lukket-vis');
    await expect(page.locator('#kal-lukket-forhaand')).toBeVisible();
    await expect(vis.locator('.lukket-titel')).toHaveText('12.–18. oktober');
    await expect(vis.locator('.lukket-hvorfor')).toHaveText('Efterårsferie.');
    /* Søndag den 18. er sidste dag; mandag er lukket i ugeplanen. */
    await expect(vis.locator('.lukket-tilbage')).toHaveText(/tirsdag d\. 20\. oktober/);
    await expect(page.locator('#kal-lukket-hvornaar')).toContainText('mandag d. 5. oktober (en uge før)');
  });

  test('forhåndsvisningen findes kun for en lukning', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: data([]) });
    await visFane(page, 'p-kalender');
    await page.locator('#kalender-typer [data-type="lukkedag"]').click();
    await expect(page.locator('#kal-lukket-forhaand')).toBeVisible();
    await page.locator('#kalender-typer [data-type="tidlig_lukning"]').click();
    await expect(page.locator('#kal-lukket-forhaand')).toBeHidden();
  });

  test('listen viser hver lukning, og hvornår gæsterne ser den', async ({ page }) => {
    await åbnAdmin(page, {
      ur: UR,
      data: data([
        lukning({ id: 901, titel: 'Personaletur' }),
        lukning({ id: 902, dato: '2026-10-12', slut_dato: '2026-10-18', titel: 'Efterårsferie' }),
        lukning({ id: 903, dato: '2026-08-24', slut_dato: null, titel: 'Privat selskab' }),
        lukning({ id: 904, dato: '2026-07-01', slut_dato: '2026-07-03', titel: 'Overstået' }),
      ]),
    });
    await visFane(page, 'p-kalender');
    const r = (id) => page.locator(`#ferie-liste [data-ferie="${id}"]`);
    await expect(r(901).locator('.ferie-status')).toHaveText('Gæsterne ser kortet nu · tilbage mandag d. 10. august');
    await expect(r(901).locator('.ferie-status')).toHaveClass(/\bnu\b/);
    await expect(r(902).locator('.ferie-status')).toHaveText('Gæsterne ser kortet fra mandag d. 5. oktober · tilbage mandag d. 19. oktober');
    await expect(r(903).locator('.ferie-status')).toContainText('fra mandag d. 24. august');
    /* En overstået lukning hører ikke til på listen. */
    await expect(r(904)).toHaveCount(0);
    /* Rækkefølgen er kalenderens. */
    await expect(page.locator('#ferie-liste .ferie-hvad b'))
      .toHaveText(['Personaletur', 'Privat selskab', 'Efterårsferie']);

    /* «Ret» fører til formularen med lukningen i. */
    await r(902).getByRole('button', { name: 'Ret' }).click();
    await expect(page.locator('#kal-dato')).toHaveValue('2026-10-12');
    await expect(page.locator('#kal-slut')).toHaveValue('2026-10-18');
    await expect(page.locator('#kal-lukket-vis .lukket-titel')).toHaveText('12.–18. oktober');
  });
});
