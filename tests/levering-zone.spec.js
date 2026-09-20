/* LEVERINGSZONEN — GEOMETRIEN, IKKE POSTNUMMERET  (20. sep 2026)

   Indtil nu har leveringen kun spurgt om ét tal: det første
   firecifrede i adressens tekst (R.leveringSvar). Det er en grov
   sigte og intet andet — et postnummer dækker et større område end
   den rute, en cafe rent faktisk kører, og gæsten skriver selv
   teksten.

   Den her fil prøver den GEOGRAFISKE afgørelse: et punkt mod en
   polygon. Ingen DAWA, ingen netværk, ingen browser — ren regnekraft,
   så den kan prøves på et sekund og aldrig bliver ustabil.

   ⚠️ KOORDINATER ER [længde, bredde] — lng, lat — hele vejen, som
   GeoJSON og DAWA gør det. Den klassiske fejl er at bytte om, og den
   fejl viser sig som "vi leverer ikke til Greve, men gerne til
   Somalia". Prøven nedenfor måler netop den ombytning.

   ⚠️ Filen er browserkode uden moduler, som resten af huset. Den
   køres derfor i en sandkasse med et falsk window. */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function hentZone() {
  const sti = path.join(__dirname, '..', 'js', 'levering-zone.js');
  const kode = fs.readFileSync(sti, 'utf8');
  const sandkasse = { window: {}, console };
  vm.createContext(sandkasse);
  vm.runInContext(kode, sandkasse);
  return sandkasse.window.MosedeZone;
}

/* Et kvadrat om Mosede Havn, så prøven ikke afhænger af den rigtige
   polygon — den er ejernes og må ikke gættes. Tallene kommer udefra:
   hjørnerne er valgt i hånden, og punkterne nedenfor er regnet i
   forhold til dem. */
const KVADRAT = [
  [12.20, 55.55], [12.30, 55.55], [12.30, 55.62], [12.20, 55.62], [12.20, 55.55],
];

test.describe('Leveringszonen', () => {

  test('et punkt inde i zonen er inde', () => {
    const Z = hentZone();
    expect(Z.iPolygon([12.25, 55.58], KVADRAT), 'midt i kvadratet').toBe(true);
  });

  test('et punkt klart udenfor er udenfor', () => {
    const Z = hentZone();
    expect(Z.iPolygon([12.60, 55.68], KVADRAT), 'København').toBe(false);
    expect(Z.iPolygon([10.20, 56.15], KVADRAT), 'Aarhus').toBe(false);
  });

  /* ⚠️ DEN KLASSISKE FEJL. Byttes lng og lat om, bliver Mosede til et
     punkt i Somalia — og et system, der tog imod dét, ville tage imod
     hvad som helst. Prøven fastholder rækkefølgen. */
  test('ombyttede koordinater falder udenfor', () => {
    const Z = hentZone();
    expect(Z.iPolygon([55.58, 12.25], KVADRAT),
      'lat og lng byttet om blev godkendt').toBe(false);
  });

  test('kanten svarer altid det samme', () => {
    const Z = hentZone();
    const paaKanten = Z.iPolygon([12.20, 55.58], KVADRAT);
    expect(typeof paaKanten, 'kanten skal give et ja eller nej, ikke undefined')
      .toBe('boolean');
    expect(Z.iPolygon([12.20, 55.58], KVADRAT), 'to opslag gav to svar')
      .toBe(paaKanten);
  });

  test('ugyldige koordinater afvises — de må ALDRIG blive et ja', () => {
    const Z = hentZone();
    [null, undefined, [], ['12.25', '55.58'], [NaN, 55.58], [12.25, NaN],
      [12.25], [12.25, 55.58, 3], 'Greve', {}].forEach(function (d) {
      expect(Z.iPolygon(d, KVADRAT), 'ugyldigt punkt blev godkendt: ' + JSON.stringify(d))
        .toBe(false);
    });
  });

  test('en ugyldig polygon afviser alt', () => {
    const Z = hentZone();
    expect(Z.iPolygon([12.25, 55.58], null)).toBe(false);
    expect(Z.iPolygon([12.25, 55.58], [])).toBe(false);
    expect(Z.iPolygon([12.25, 55.58], [[12.2, 55.5], [12.3, 55.5]]),
      'to punkter er ikke en polygon').toBe(false);
  });

  /* ---- ZONERNE: tre udfald, ikke to ----------------------------
     Ejeren skrev selv "længere ude efter aftale", og koden har haft
     svaret 'spoerg' siden 1/9. En binær zone ville sende netop de
     kunder væk, forretningen gerne vil have fat i. */
  test('zonerne giver ja, spørg eller nej — og den første træffer vinder', () => {
    const Z = hentZone();
    const zoner = [
      { navn: 'kerne', svar: 'ja',
        polygon: [[12.22, 55.56], [12.26, 55.56], [12.26, 55.60], [12.22, 55.60], [12.22, 55.56]] },
      { navn: 'kant', svar: 'spoerg', polygon: KVADRAT },
    ];
    expect(Z.zoneSvar([12.24, 55.58], zoner).svar, 'midt i kernen').toBe('ja');
    expect(Z.zoneSvar([12.29, 55.61], zoner).svar, 'uden for kernen, inde i kanten').toBe('spoerg');
    expect(Z.zoneSvar([12.60, 55.68], zoner).svar, 'København').toBe('nej');
  });

  test('uden zoner svarer den nej — aldrig ja', () => {
    const Z = hentZone();
    expect(Z.zoneSvar([12.25, 55.58], []).svar).toBe('nej');
    expect(Z.zoneSvar([12.25, 55.58], null).svar).toBe('nej');
  });

  /* ⚠️ POSTNUMMERET ER EN GROV SIGTE, IKKE DOMMEN. Specifikationen er
     udtrykkelig: et tilladt postnummer, der ligger uden for polygonen,
     skal stadig afvises. */
  test('et tilladt postnummer uden for polygonen bliver stadig afvist', () => {
    const Z = hentZone();
    const zoner = [{ navn: 'kerne', svar: 'ja', polygon: KVADRAT }];
    const svar = Z.maaLeveres(
      { postnr: '2670', lng: 12.60, lat: 55.68 },
      { postnumre: [2670], zoner: zoner });
    expect(svar.svar, 'postnummeret alene fik lov at afgøre det').toBe('nej');
    expect(svar.grund).toBe('UDEN_FOR_ZONEN');
  });

  test('et postnummer uden for listen afvises med det samme', () => {
    const Z = hentZone();
    const zoner = [{ navn: 'kerne', svar: 'ja', polygon: KVADRAT }];
    const svar = Z.maaLeveres(
      { postnr: '9000', lng: 12.25, lat: 55.58 },
      { postnumre: [2670], zoner: zoner });
    expect(svar.svar).toBe('nej');
    expect(svar.grund).toBe('POSTNUMMER_UDEN_FOR');
  });

  test('inde i både postnummer og polygon er et ja', () => {
    const Z = hentZone();
    const zoner = [{ navn: 'kerne', svar: 'ja', polygon: KVADRAT }];
    const svar = Z.maaLeveres(
      { postnr: '2670', lng: 12.25, lat: 55.58 },
      { postnumre: [2670], zoner: zoner });
    expect(svar.svar).toBe('ja');
    expect(svar.zone).toBe('kerne');
  });

  /* ⚠️ MANGLENDE KOORDINATER MÅ ALDRIG BLIVE ET JA. Uden punkt er
     der ingen geografi, og så er postnummeret alene tilbage — netop
     det, hele øvelsen handler om ikke at stole på. */
  test('uden koordinater er svaret nej, ikke ja', () => {
    const Z = hentZone();
    const zoner = [{ navn: 'kerne', svar: 'ja', polygon: KVADRAT }];
    [{ postnr: '2670' },
     { postnr: '2670', lng: null, lat: 55.58 },
     { postnr: '2670', lng: 12.25, lat: 'noget' }].forEach(function (a) {
      const svar = Z.maaLeveres(a, { postnumre: [2670], zoner: zoner });
      expect(svar.svar, 'en adresse uden gyldigt punkt blev godkendt').toBe('nej');
      expect(svar.grund).toBe('UGYLDIGT_PUNKT');
    });
  });

  test('uden adresse overhovedet er svaret nej', () => {
    const Z = hentZone();
    expect(Z.maaLeveres(null, { postnumre: [2670], zoner: [] }).svar).toBe('nej');
    expect(Z.maaLeveres(undefined, null).svar).toBe('nej');
  });

  /* Konfigurationen skal kunne ændres ét sted. Prøven holder fast i,
     at polygonen IKKE er godkendt endnu — så ingen kommer til at tro,
     den er ejernes rigtige grænse. */
  test('den medfølgende zone er tydeligt mærket som ikke-godkendt', () => {
    const Z = hentZone();
    expect(Z.opsaetning, 'der er ingen opsætning at rette ét sted').toBeTruthy();
    expect(Z.opsaetning.godkendt, 'polygonen står som godkendt, men er gættet').toBe(false);
    expect(Array.isArray(Z.opsaetning.zoner)).toBe(true);
    expect(Z.opsaetning.zoner.length).toBeGreaterThan(0);
  });
});
