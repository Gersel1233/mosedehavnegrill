/* ============================================================
   ADMIN TALER CAFÉENS SPROG, IKKE UDVIKLERENS  (28/9)
   ------------------------------------------------------------
   Mikkels ord: *"ret også udviklersproget, knapper osv. ting i
   admin"*. Der stod "Kør supabase/restaurant.sql i Supabase
   først", "Er supabase/roller.sql kørt?", "Se README under push",
   "VAPID_OFFENTLIG" og "Supabase → Authentication → Users" på
   skærmen i en café, hvor ingen ved, hvad Supabase er. Det, de kan
   gøre, er at sige det til Lesreg (Admin.sigTilLesreg).

   ⚠️ VAGTEN LÆSER FILERNE, IKKE EN LISTE: en ny besked i en ny fil
   skal ikke kunne slippe forbi. Kommentarer tæller ikke — de er til
   den næste udvikler og skal gerne nævne filerne.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const FORBUDT = /Kør supabase|Kør setup\.sql|i Supabase\b|Se README|README under|lav-vapid\.html|VAPID_OFFENTLIG|Authentication → Users|\.sql kørt\?/;

function udenKommentarerJs(kode) {
  return kode.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    // console.* er udviklerens egen kanal og må gerne nævne filerne —
    // også når beskeden løber over flere linjer
    .replace(/console\.(warn|error|log)\([\s\S]*?\);/g, '');
}

test('ingen synlig tekst i admin.html beder personalet køre noget', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '');
  const linjer = html.split('\n').filter((l) => FORBUDT.test(l));
  expect(linjer, 'udviklersprog i admin.html').toEqual([]);
});

test('ingen besked fra js/admin beder personalet køre noget', () => {
  const mappe = path.join(__dirname, '..', 'js', 'admin');
  const fund = [];
  for (const fil of fs.readdirSync(mappe).filter((f) => f.endsWith('.js'))) {
    const kode = udenKommentarerJs(fs.readFileSync(path.join(mappe, fil), 'utf8'));
    kode.split('\n').forEach((l, i) => {
      if (FORBUDT.test(l)) fund.push(fil + ':' + (i + 1) + ' ' + l.trim());
    });
  }
  expect(fund, 'udviklersprog i js/admin').toEqual([]);
});
