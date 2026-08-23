/* Vagthund over .github/workflows/deploy.yml.

   Filen her måler noget, ingen af de andre prøver kan se: hvad der
   sker MELLEM et push og den side, gæsten står med i hånden. Resten
   af suiten kører mod filerne på disken og ville sige BESTÅET, selv
   om udgivelsen sendte en halvfærdig arbejdsgren i luften.

   Tre ting holdes fast:

   1) Udgivelsen kan kun sættes i gang af et push. Der stod
      `workflow_dispatch` i filen, og det er en bagdør: knappen "Run
      workflow" i Actions-fanen har en gren-vælger, så enhver gren
      kunne udgives med to klik – uden et commit på en
      udgivelsesgren, og uden at nogen bagefter kunne se på
      grenlisten, hvad der faktisk står på kundens hjemmeside.

   2) Kun de to aftalte grene udgiver. Den fejl, der gør ondt, er
      ikke en fremmed gren – det er ens EGEN arbejdsgren, føjet til
      listen en aften for at "se den lige", og glemt bagefter.

   3) Toppen af filen fortæller, hvor siden lander, og adressen er
      den samme som i sitemap.xml. Kommentaren var arvet fra et
      andet kundeprojekt, og en kommentar, der peger et forkert sted
      hen, er værre end ingen kommentar: den bliver læst under
      tidspres, af en der ikke har tid til at tjekke efter.
*/

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROD = path.join(__dirname, '..');
const STI = path.join(ROD, '.github', 'workflows', 'deploy.yml');

const UDGIVER = ['main', 'claude/lesreg-customer-setup-5atpuu'];

function læsWorkflow() {
  return fs.readFileSync(STI, 'utf8');
}

/* Kommentarerne i filen NÆVNER `workflow_dispatch` – det er dér, det
   står, hvorfor den blev fjernet. Derfor må prøven ikke lede i
   råteksten; så ville forklaringen selv fælde den. Vi klipper
   kommentarlinjerne væk og måler på det, GitHub faktisk kører. */
function udenKommentarer(kilde) {
  return kilde
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
}

test('udgivelsen kan kun sættes i gang af et push', () => {
  const kode = udenKommentarer(læsWorkflow());

  expect(
    kode,
    'workflow_dispatch er tilbage – så kan enhver gren udgives manuelt fra Actions-fanen'
  ).not.toMatch(/workflow_dispatch/);

  /* Samme dør, andre navne. De findes ikke i filen i dag, og de
     skal ikke snige sig ind som "det er jo ikke workflow_dispatch". */
  expect(kode, 'repository_dispatch udgiver på et API-kald').not.toMatch(/repository_dispatch/);
  expect(kode, 'en tidsplan udgiver uden at nogen har trykket på noget').not.toMatch(/schedule:/);

  /* Udløserne står under `on:` og før `permissions:`. Er der andet
     end push dernede, vil vi vide det. */
  const blok = kode.split(/^permissions:/m)[0];
  const udløsere = blok
    .split('\n')
    .filter((l) => /^\s{2}\S+:/.test(l))
    .map((l) => l.trim().replace(':', ''));
  expect(udløsere).toEqual(['push']);
});

/* Punkt 3 på listen: udgivelsen må ikke ændre en indstilling på
   repoet som en bivirkning af at køre. */
test('udgivelsen slår ikke Pages til af sig selv', () => {
  const kode = udenKommentarer(læsWorkflow());
  expect(
    kode,
    'enablement er tilbage – så tænder en udgivelse for Pages, som nogen kan have slukket med vilje'
  ).not.toMatch(/enablement/);
});

test('kun de to aftalte grene udgiver', () => {
  const kode = udenKommentarer(læsWorkflow());
  const blok = kode.split(/^permissions:/m)[0];

  const grene = blok
    .split('\n')
    .filter((l) => /^\s+-\s/.test(l))
    .map((l) => l.replace(/^\s+-\s*/, '').split('#')[0].trim());

  expect(grene).toEqual(UDGIVER);

  /* Arbejdsgrenene hedder alle claude/… . Præcis én af dem må
     udgive; kommer der en mere, er det en, nogen har tilføjet for
     at se sit eget arbejde og glemt at tage ud igen. */
  const arbejdsgrene = grene.filter((g) => g.startsWith('claude/') && !UDGIVER.includes(g));
  expect(arbejdsgrene, 'en arbejdsgren er føjet til udgivelseslisten').toEqual([]);
});

test('toppen peger på den adresse, siden faktisk ligger på', () => {
  const kilde = læsWorkflow();
  const hoved = kilde.split(/^on:/m)[0];

  const sitemap = fs.readFileSync(path.join(ROD, 'sitemap.xml'), 'utf8');
  const forsiden = (sitemap.match(/<loc>([^<]+)<\/loc>/) || [])[1];
  expect(forsiden, 'sitemap.xml har ingen adresse at sammenligne med').toBeTruthy();

  /* Uden protokol og uden skråstreg til sidst: kommentaren må gerne
     skrives, som et menneske ville skrive den. */
  const adresse = forsiden.replace(/^https?:\/\//, '').replace(/\/$/, '');
  expect(
    hoved,
    `toppen af deploy.yml nævner ikke ${adresse} – står der en anden adresse, læses den som sandheden`
  ).toContain(adresse);
});
