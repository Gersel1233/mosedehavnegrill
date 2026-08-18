/* Vagthund over js/config.js.

   Resten af testene kører med forbindelsen koblet fra, så de
   ville aldrig opdage at der stod noget forkert i den rigtige
   config-fil. Denne fil læser den fra disken og regner efter.

   Den vigtigste påstand er den fjerde: at nøglen IKKE er
   service_role. De to nøgler ligger lige ved siden af hinanden i
   Supabase, ser næsten ens ud, og begge starter med "eyJ".
   Forveksler man dem, kan enhver besøgende slette hele
   menukortet – og siden vil se helt normal ud imens. Det er ikke
   en fejl man opdager ved at kigge på skærmen, så den skal
   fanges her.
*/

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STI = path.join(__dirname, '..', 'js', 'config.js');

function læsConfig() {
  const kilde = fs.readFileSync(STI, 'utf8');
  const url = (kilde.match(/url:\s*'([^']*)'/) || [])[1];
  const noegle = (kilde.match(/anonKey:\s*'([^']*)'/) || [])[1];
  const lokation = (kilde.match(/^\s*lokation:\s*'([^']*)'/m) || [])[1];
  return { kilde, url, noegle, lokation };
}

function afkodJwt(t) {
  const dele = String(t).split('.');
  if (dele.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(dele[1], 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
}

test('nøglen er sat', () => {
  const { noegle } = læsConfig();
  expect(noegle, 'anonKey er tom – siden kører i øvetilstand').toBeTruthy();
});

test('nøglen er et gyldigt JWT', () => {
  const { noegle } = læsConfig();
  expect(afkodJwt(noegle), 'anonKey kunne ikke afkodes som JWT').not.toBeNull();
});

test('nøglen hører til det rigtige Supabase-projekt', () => {
  const { url, noegle } = læsConfig();
  const krop = afkodJwt(noegle);

  // url'en er https://<ref>.supabase.co
  const refFraUrl = (url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
  expect(refFraUrl, 'url ser ikke ud som et Supabase-projekt').toBeTruthy();
  expect(krop.ref,
    `nøglen hører til projekt "${krop.ref}", men url peger på "${refFraUrl}"`)
    .toBe(refFraUrl);
});

test('nøglen er anon – ALDRIG service_role', () => {
  const { noegle } = læsConfig();
  const krop = afkodJwt(noegle);

  expect(krop.role,
    'FARE: der ligger en service_role-nøgle i config.js. Den springer alle ' +
    'adgangsregler over, og filen ligger offentligt på hjemmesiden. ' +
    'Udskift den med "anon"-nøglen og skift den gamle ud i Supabase.')
    .toBe('anon');
});

test('nøglen er ikke udløbet', () => {
  const { noegle } = læsConfig();
  const krop = afkodJwt(noegle);

  expect(krop.exp, 'nøglen har ingen udløbsdato').toBeTruthy();
  const dageTilbage = (krop.exp * 1000 - Date.now()) / 86400000;
  expect(dageTilbage, `nøglen udløber om ${Math.round(dageTilbage)} dage`)
    .toBeGreaterThan(30);
});

/* LOKATIONEN

   Databasen deles nu af flere forretninger. Står der ikke et
   lokation_id i config.js, falder js/store.js tilbage på
   'mosede' – og det er rigtigt for DEN HER side, men helt
   forkert for den næste kunde, der kopierer filen. Så ville
   kunde nr. 2 få en hjemmeside, der viser Mosedes menukort, og
   det ville se helt normalt ud indtil nogen bestilte noget. */
test('der står en lokation i filen', () => {
  const { lokation } = læsConfig();
  expect(lokation,
    'lokation mangler i config.js – siden falder tilbage på "mosede", '
    + 'og en kopi til næste kunde ville hente Mosedes data')
    .toBeTruthy();
});

test('lokationen ser ud som et id, ikke som et navn', () => {
  const { lokation } = læsConfig();
  // Værdien står i adressen på hver eneste forespørgsel og er
  // primærnøgle i seks tabeller. Mellemrum, æøå og store
  // bogstaver hører ikke hjemme i den slags.
  expect(lokation, `"${lokation}" er ikke et gyldigt id – brug små `
    + 'bogstaver, tal og bindestreg')
    .toMatch(/^[a-z0-9][a-z0-9-]{1,38}$/);
});

/* Kommentarerne skal væk før vi leder efter mistænkelige ord.

   Filen ADVARER med vilje mod service_role-nøglen, og den
   advarsel er det mest værdifulde i filen – den skal blive
   stående. Uden dette trin ville testen fælde sin egen advarsel. */
function udenKommentarer(kilde) {
  return kilde
    .replace(/\/\*[\s\S]*?\*\//g, ' ')   // /* ... */
    .replace(/(^|[^:])\/\/.*$/gm, '$1'); // // ...  (rører ikke https://)
}

test('der ligger ikke en hemmelighed i selve koden', () => {
  const { kilde } = læsConfig();
  const kode = udenKommentarer(kilde).toLowerCase();

  for (const ord of ['service_role', 'password', 'secret', 'supabase_service']) {
    expect(kode, `"${ord}" står i koden i config.js – den fil er offentlig`)
      .not.toContain(ord);
  }
});

test('der ligger kun ÉN nøgle i filen', () => {
  // To JWT'er i samme fil betyder næsten altid at nogen har
  // klistret service_role-nøglen ind ved siden af anon-nøglen.
  const { kilde, noegle } = læsConfig();
  const jwtMoenster = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
  const fundne = udenKommentarer(kilde).match(jwtMoenster) || [];

  expect(fundne.length, `fandt ${fundne.length} nøgler i config.js`).toBe(1);
  expect(fundne[0]).toBe(noegle);
});
