/* ============================================================
   SERVERENS ADRESSEOPSLAG HOS ADRESSEVÆLGER  (9. okt 2026)
   ------------------------------------------------------------
   DAWA lukkede 1/10 2026 kl. 10, og leveringen døde tavst: feltet
   fik intet svar, og serveren svarede fail closed. Afløseren er
   Klimadatastyrelsens Adressevælger, og den svarer anderledes:
   status "3" i stedet for 1, og koordinater i UTM 32N i stedet for
   længde/bredde.

   ⚠️ PRØVEN KØRER FUNKTIONENS EGEN KODE, IKKE EN KOPI. Blokken
      mellem `function tekst(` og `⟪ /UTM ⟫` læses ud af
      supabase/funktioner/valider-levering.ts, typerne strippes af
      Node selv, og blokken køres på svar, der er MÅLT mod det levende
      API 9/10 (tests/facit/adressevaelger/).

   ⚠️ ÉT TAL KOMMER UDEFRA: DAWA's koordinater for Havnevej 20,
      2670 Greve (12.28463387, 55.5664776), målt 20/9 og skrevet i
      funktionens gamle hoved. Omregningen skal ramme dem.
   ============================================================ */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const FIL = path.resolve(__dirname, '..', 'supabase', 'funktioner', 'valider-levering.ts');
const FACIT = path.resolve(__dirname, 'facit', 'adressevaelger');

function funktionens(navn) {
  const ts = fs.readFileSync(FIL, 'utf8');
  const fra = ts.indexOf('function tekst(');
  const til = ts.indexOf('/* ⟪ /UTM ⟫ */');
  if (fra < 0 || til < fra) throw new Error('blokken findes ikke i valider-levering.ts');
  const { stripTypeScriptTypes } = require('node:module');
  const js = stripTypeScriptTypes(ts.slice(fra, til));
  // eslint-disable-next-line no-new-func
  return new Function(js + '\nreturn ' + navn + ';')();
}
const facit = (n) => JSON.parse(fs.readFileSync(path.join(FACIT, n + '.json'), 'utf8'));

test.describe('Serverens opslag hos Adressevælger', () => {
  test('Havnevej 20 lander, hvor DAWA sagde — under en meter fra', () => {
    const a = funktionens('normaliser')(facit('havnevej20'));
    expect(a).not.toBeNull();
    expect(a.postnr).toBe('2670');
    expect(Math.abs(a.lng - 12.28463387)).toBeLessThan(0.00001);   // ~0,6 m
    expect(Math.abs(a.lat - 55.5664776)).toBeLessThan(0.00001);
  });

  test('Nylandsvej 43 i Karlslunde — Mikkels eksempel — kommer helt igennem', () => {
    const a = funktionens('normaliser')(facit('nylandsvej43'));
    expect(a).toMatchObject({
      dawaId: '0a3f50ab-1317-32b8-e044-0003ba298018',
      adresse: 'Nylandsvej 43, 2690 Karlslunde',
      vejnavn: 'Nylandsvej', husnr: '43', postnr: '2690', by: 'Karlslunde',
      etage: null, doer: null,
    });
    // Karlslunde ligger mellem Greve og Køge — ikke ude på havet
    expect(a.lng).toBeGreaterThan(12.1);
    expect(a.lng).toBeLessThan(12.3);
    expect(a.lat).toBeGreaterThan(55.5);
    expect(a.lat).toBeLessThan(55.6);
  });

  test('en lejlighed har sin etage med', () => {
    const a = funktionens('normaliser')(facit('lejlighed'));
    expect(a.adresse).toBe('Greve Strandvej 10, 1., 2670 Greve');
    expect(a.etage).toBe('1');
  });

  /* ⚠️ "3" ER GÆLDENDE. DAWA's gamle tjek (status 1) ville afvise
     hver eneste adresse — og en nedlagt adresse må stadig afvises. */
  test('kun gældende adresser — en nedlagt (4) afvises', () => {
    const svar = facit('nylandsvej43');
    svar.adresse.status = '4';
    expect(funktionens('normaliser')(svar)).toBeNull();
  });

  test('et svar uden koordinater eller med fejl giver ingen kvittering', () => {
    const uden = facit('nylandsvej43');
    delete uden.adresse.husnummer.adgangspunkt.koordinater;
    expect(funktionens('normaliser')(uden)).toBeNull();
    expect(funktionens('normaliser')({ status: 'fejl', beskrivelse: 'x' })).toBeNull();
  });

  test('funktionen slår op hos Adressevælger med nøgle — ikke hos DAWA', () => {
    const ts = fs.readFileSync(FIL, 'utf8');
    expect(ts).toContain('https://adressevaelger.dk/adresser/');
    expect(ts).not.toMatch(/const\s+\w+\s*=\s*"https:\/\/api\.dataforsyningen\.dk/);
    expect(ts).toMatch(/\?token="\s*\+\s*encodeURIComponent\(ADV_TOKEN\)/);
  });
});
