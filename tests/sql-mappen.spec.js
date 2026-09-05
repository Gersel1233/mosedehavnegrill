/* ============================================================
   SQL-MAPPEN MOD DE TRE LISTER, DER BESKRIVER DEN  (5/9)
   ------------------------------------------------------------
   Der findes tre håndskrevne lister over supabase/-mappens
   filer, og de skal alle tre passe:

     · vaerktoej/byg-lokal-db.sh  — bygger den lokale database,
       som HVER eneste proev-fil måles på
     · CLAUDE.md's rækkefølge     — dét, Mikkel kopierer ind i
       Supabase, i den orden filerne skal køres
     · og filerne selv, på disken

   ⚠️ HVORFOR DEN HER PRØVE FINDES. Byggerens egen kommentar
   siger det ordret: "En fil, der mangler her, er en fil,
   prøverne ikke ved eksisterer." Det er sket: 3/9 manglede
   roller.sql og kategori-dag-vaern-aktiv.sql i byggeren, så den
   lokale database havde den GAMLE logbogsregel — og
   er-vi-klar.sql sagde ✅, mens Mikkel fik ❌ i produktionen.

   Faren er, at en ny migreringsfil bliver skrevet i morgen og
   IKKE kommer på listen. Ingen opdager det: alle prøver består,
   fordi de måler en database, der aldrig fik filen.

   ⚠️ OG LISTEN LÆSES AF DISKEN, ikke skrevet af i hånden. Samme
   greb som favicon-prøven og siderMedFooter(): en ny fil kan
   ikke slippe forbi, fordi prøven ikke kender dens navn.

   ⚠️ UNDTAGELSERNE STÅR MED EN GRUND. En undtagelsesliste uden
   grunde er en liste, der bare vokser — og så måler prøven
   ingenting igen. Skal der en ny på, så skriv hvorfor. */
const { test, expect } = require('@playwright/test');
const fs = require('fs');

/* Filer, byggeren med vilje IKKE kører — hver med sin grund.
   De ændrer ikke skemaet, så en prøve bliver ikke svagere af,
   at de mangler i den lokale database. */
const IKKE_I_BYGGEREN = {
  'setup': 'byggeren kører den selv først, med chefens e-mail rettet i en KOPI',
  'er-vi-klar': 'tjekliste, skriver ingenting',
  'klar-til-lancering': 'tjekliste, skriver ingenting',
  'demo-indhold': 'demo-rækker — en prøve skal måle på SINE egne data, ikke på demoens',
  'ryd-demo': 'rydder demoen op igen',
  'ryd-spiis-op': 'oprydning efter uheldet 18/8, hører til produktionen',
  'aabn-kortet': 'sætter flueben på ejerens kategorier, ikke skema',
  'ret-oplysninger': 'engangsrettelse af navn og adresse, kun for den der kørte den gamle setup.sql',
  'kortets-priser-2': 'skrev priser på kategori_id og ramte nul rækker i en frisk database (målt 1/9) — kortets-priser-3.sql slår kategorien op på NAVN i stedet',
  'udeblivelser': 'restaurant.sql sætter den samme statusliste bredere bagefter (linje 63), så byggeren får den rigtige uden',
};

/* proev-filer uden en migrering af samme navn. */
const PROEV_UDEN_MIGRERING = {
  'adgang': 'måler setup.sql\'s egne adgangsregler på bestillinger — den tabel, gæsten må skrive i og ikke læse',
};

function sqlFiler() {
  return fs.readdirSync('supabase')
    .filter((f) => f.endsWith('.sql'))
    .map((f) => f.slice(0, -4));
}

function byggerensListe() {
  const s = fs.readFileSync('vaerktoej/byg-lokal-db.sh', 'utf8');
  const m = s.match(/FILER="([\s\S]*?)"/);
  expect(m, 'FILER-listen kunne ikke findes i byg-lokal-db.sh').not.toBeNull();
  return m[1].split(/\s+/).filter(Boolean);
}

test('hver migreringsfil køres af byggeren — eller står som undtagelse med en grund', () => {
  const alle = sqlFiler();
  expect(alle.length, 'ingen SQL-filer blev læst — prøven måler ingenting')
    .toBeGreaterThan(30);

  const migreringer = alle.filter((f) => !f.startsWith('proev-'));
  const byg = byggerensListe();

  const glemt = migreringer.filter((f) => byg.indexOf(f) === -1 && !IKKE_I_BYGGEREN[f]);
  expect(glemt, 'de her migreringsfiler køres ikke af vaerktoej/byg-lokal-db.sh. '
    + 'Så måler hver eneste proev-fil på en database UDEN dem — og en prøve, '
    + 'der består lokalt, kan falde hos kunden. Læg dem i FILER, eller skriv '
    + 'dem i IKKE_I_BYGGEREN med en grund').toEqual([]);
});

test('byggeren peger ikke på en fil, der er væk', () => {
  const alle = sqlFiler();
  const væk = byggerensListe().filter((f) => alle.indexOf(f) === -1);
  expect(væk, 'byg-lokal-db.sh kører filer, der ikke findes — den siger MANGLER '
    + 'og bygger videre, så en prøve kan bestå på en halv database').toEqual([]);
});

test('hver undtagelse findes stadig — og bærer en grund', () => {
  const alle = sqlFiler();
  Object.keys(IKKE_I_BYGGEREN).forEach((f) => {
    expect(alle, 'undtagelsen ' + f + '.sql findes ikke længere — ryd listen op')
      .toContain(f);
    expect(IKKE_I_BYGGEREN[f].length,
      'undtagelsen ' + f + ' står uden en rigtig grund').toBeGreaterThan(20);
  });
});

test('hver prøvefil har en migrering at prøve', () => {
  const alle = sqlFiler();
  const forældreløse = alle
    .filter((f) => f.startsWith('proev-'))
    .map((f) => f.slice(6))
    .filter((f) => alle.indexOf(f) === -1 && !PROEV_UDEN_MIGRERING[f]);

  expect(forældreløse, 'de her proev-filer prøver en migrering, der ikke findes')
    .toEqual([]);
});

test('hver fil, byggeren kører, står også i CLAUDE.md', () => {
  /* ⚠️ DET ER PAPIRERNE, DER ER LEVERANCEN HER. Mikkel kører
     filerne i Supabase efter CLAUDE.md; en migrering, der ikke
     står der, bliver aldrig kørt i produktionen — og så virker
     admin lokalt og fejler hos ham. Det er sket flere gange
     (dagens-retter 26/8, nyheder-fra-til 28/8). */
  const md = fs.readFileSync('CLAUDE.md', 'utf8');
  const mangler = byggerensListe().filter((f) => md.indexOf(f + '.sql') === -1);
  expect(mangler, 'de her filer køres lokalt, men CLAUDE.md nævner dem ikke — '
    + 'så bliver de aldrig kørt i Mosede-projektet').toEqual([]);
});

test('rækkefølgen i CLAUDE.md peger kun på filer, der findes', () => {
  const md = fs.readFileSync('CLAUDE.md', 'utf8');
  const blok = md.match(/```\n(… → pris-vaern\.sql[\s\S]*?)\n```/);
  expect(blok, 'rækkefølge-blokken kunne ikke findes i CLAUDE.md').not.toBeNull();

  const nævnt = (blok[1].match(/[a-z0-9-]+\.sql/g) || []).map((s) => s.slice(0, -4));
  expect(nævnt.length, 'rækkefølgen nævner ingen filer — prøven måler ingenting')
    .toBeGreaterThan(10);

  const alle = sqlFiler();
  const findesIkke = nævnt.filter((f) => alle.indexOf(f) === -1);
  expect(findesIkke, 'rækkefølgen i CLAUDE.md beder om filer, der ikke findes — '
    + 'Mikkel leder efter dem i Supabase og kan ikke finde dem').toEqual([]);
});
