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

const { erGoogleKvittering } = require('./hjaelp');
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

/* ============================================================
   SITEMAPPET SKAL VÆRE ET KORT OVER SIDEN  (1/9)
   ------------------------------------------------------------
   Der har aldrig været en prøve på det, og det kostede: da de
   to udgaver af hjemmesiden blev lagt sammen 30/8, blev seks af
   sitemappets ti adresser til VEJVISERE — og ingen af de ni nye
   designsider kom med. Altså fortalte vi Google, at siden bestod
   af seks omdirigeringer og fire sider.

   Det er præcis arret fra 30/8 ("der stod to udgaver af
   hjemmesiden i luften") et sted, ingen kiggede.

   ⚠️ LISTERNE LÆSES AF MAPPEN. En ny side skal ikke kunne
   udgives uden at komme på kortet, og en side, der bliver til en
   vejviser, skal falde her.
   ============================================================ */
test.describe('Sitemappet', () => {

  function adresser() {
    const s = fs.readFileSync(path.join(ROD, 'sitemap.xml'), 'utf8');
    return (s.match(/<loc>([^<]+)<\/loc>/g) || [])
      .map((m) => m.replace(/<\/?loc>/g, ''));
  }

  /* Alle udgivne sider på roden, minus dem der med vilje ikke
     skal indekseres. */
  function erVejviser(fil) {
    const t = fs.readFileSync(path.join(ROD, fil), 'utf8');
    return t.includes('http-equiv="refresh"') && t.includes('location.replace');
  }
  function harNoindex(fil) {
    const t = fs.readFileSync(path.join(ROD, fil), 'utf8');
    return /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(t);
  }

  test('hver adresse ligger på det domæne, siden faktisk svarer på', () => {
    const alle = adresser();
    expect(alle.length, 'sitemappet er tomt').toBeGreaterThan(5);
    for (const u of alle) {
      expect(u, u + ' peger ikke på forretningens domæne')
        .toMatch(/^https:\/\/mosedehavnecafe\.dk\//);
    }
  });

  /* ⚠️ EN VEJVISER HØRER IKKE TIL PÅ KORTET. Den sender videre;
     et sitemap skal pege på det, der ER siden. */
  test('ingen vejviser står på kortet', () => {
    const alle = adresser().map((u) => u.replace(/^https:\/\/mosedehavnecafe\.dk\//, ''));
    const vejvisere = fs.readdirSync(ROD)
      .filter((f) => f.endsWith('.html'))
      .filter(erVejviser);
    expect(vejvisere.length, 'der er ingen vejvisere at måle mod')
      .toBeGreaterThan(0);
    for (const v of vejvisere) {
      expect(alle, 'vejviseren ' + v + ' står i sitemap.xml').not.toContain(v);
    }
    /* Mapperne, der blev vejvisere 30/8, ligger med skråstreg. */
    for (const m of ['selskaber/', 'catering/', 'baglokale/',
      'arrangementer/', 'nyheder/', 'smoerrebroed-ud-af-huset/']) {
      if (!fs.existsSync(path.join(ROD, m, 'index.html'))) continue;
      if (!erVejviser(path.join(m, 'index.html'))) continue;
      expect(alle, 'vejviseren ' + m + ' står i sitemap.xml').not.toContain(m);
    }
  });

  /* ⚠️ OG EN RIGTIG SIDE SKAL VÆRE DER. Et kort, der bare er
     tomt for vejvisere, ville også bestå prøven ovenfor. */
  test('hver udgivet gæsteside står på kortet', () => {
    const alle = adresser().map((u) => u.replace(/^https:\/\/mosedehavnecafe\.dk\//, ''));
    const sider = fs.readdirSync(ROD)
      .filter((f) => f.endsWith('.html'))
      .filter((f) => f !== 'admin.html')
      /* Googles ejerskabsfil er ikke en side — se prøven nederst
         i filen. Uden den her linje ville prøven kræve, at en
         kvittering på én linje stod i sitemappet. */
      .filter((f) => !erGoogleKvittering(f))
      .filter((f) => !erVejviser(f))
      .filter((f) => !harNoindex(f));
    expect(sider.length, 'der er ingen sider at måle på').toBeGreaterThan(5);
    for (const f of sider) {
      /* ⚠️ FORSIDEN STÅR SOM "/" OG IKKE "/index.html", og det er
         med vilje: dens canonical er roden. To adresser for den
         samme side er dét, canonical findes for. */
      const vent = f === 'index.html' ? '' : f;
      expect(alle, f + ' mangler i sitemap.xml').toContain(vent);
    }
  });

  /* robots.txt peger Google mod kortet. Står den på det gamle
     domæne, finder Google et kort, der 301'er væk. */
  test('robots.txt peger på det samme domæne', () => {
    const t = fs.readFileSync(path.join(ROD, 'robots.txt'), 'utf8');
    expect(t).toContain('Sitemap: https://mosedehavnecafe.dk/sitemap.xml');
    expect(t, 'robots.txt peger stadig på Pages-adressen')
      .not.toContain('gersel1233.github.io');
  });

  /* Kilden bag JSON-LD og canonical er js/oplysninger.js. Siger
     den ét og sitemappet et andet, vælger Google selv. */
  test('oplysningsfilen siger det samme domæne', () => {
    const raa = fs.readFileSync(path.join(ROD, 'js', 'oplysninger.js'), 'utf8');
    expect(raa).toContain("domaene: 'https://mosedehavnecafe.dk'");
  });
});

/* ============================================================
   GOOGLES EJERSKABSFIL  (5. september 2026)
   ------------------------------------------------------------
   Search Console beviser, at domænet er forretningens, ved at
   hente en fil med et navn, KUN vi har fået. Mikkel hentede den
   fra Search Console; den ligger i roden og hedder
   googlea5013725eaf389e0.html.

   ⚠️ DEN SKAL BLIVE LIGGENDE. Fjernes eller omdøbes den, mister
   forretningen adgangen til Search Console igen — og det opdages
   den dag, nogen skal se, hvorfor siden ikke bliver indekseret.
   Derfor er den en prøve og ikke en note.

   ⚠️ OG TEGNSTRENGEN SKAL STÅ TO STEDER. Google henter filen på
   dens navn og sammenligner med linjen indeni; passer de to ikke,
   svarer den "verifikation mislykkedes" uden at sige hvorfor. Det
   er husets egen regel om, at ét af tallene skal komme udefra —
   her kommer det fra filnavnet.
   ============================================================ */
test.describe('Googles ejerskabsfil', () => {
  function googleFiler() {
    return fs.readdirSync(ROD).filter((f) => /^google[0-9a-z]+\.html$/i.test(f));
  }

  test('filen ligger i roden', () => {
    expect(googleFiler(),
      'ingen ejerskabsfil i roden — Search Console kan ikke verificere domænet')
      .toHaveLength(1);
  });

  test('linjen indeni peger på filens EGET navn', () => {
    const f = googleFiler()[0];
    expect(f, 'ingen fil at måle på').toBeTruthy();
    const t = fs.readFileSync(path.join(ROD, f), 'utf8').trim();
    expect(t, 'indholdet svarer ikke til filnavnet — Google afviser den')
      .toBe('google-site-verification: ' + f);
  });

  test('robots.txt spærrer den ikke', () => {
    const f = googleFiler()[0];
    const linjer = fs.readFileSync(path.join(ROD, 'robots.txt'), 'utf8').split('\n');
    const spærret = linjer
      .filter((l) => /^\s*Disallow:/i.test(l))
      .map((l) => l.replace(/^\s*Disallow:\s*/i, '').trim())
      .filter((sti) => sti && ('/' + f).startsWith(sti));
    /* En Disallow-linje er ikke bare pynt her: Google HENTER
       filen for at verificere, og en spærret fil kan den ikke
       hente. */
    expect(spærret, 'robots.txt spærrer Googles egen fil').toEqual([]);
  });

  test('den står IKKE i sitemap.xml — den er en kvittering, ikke en side', () => {
    const f = googleFiler()[0];
    const kort = fs.readFileSync(path.join(ROD, 'sitemap.xml'), 'utf8');
    expect(kort, 'ejerskabsfilen står på kortet over hjemmesiden')
      .not.toContain(f);
  });

  /* ⚠️ OG DEN SKAL FAKTISK UDGIVES. Workflowet pakker hele roden
     (path: .), og versionsstemplingen rører kun filer med __V__ i
     — men står der en dag en liste over filer, der skal med,
     ville kvitteringen blive glemt. */
  test('workflowet pakker hele roden med', () => {
    const w = fs.readFileSync(
      path.join(ROD, '.github', 'workflows', 'deploy.yml'), 'utf8');
    expect(w, 'workflowet pakker ikke længere hele roden')
      .toContain('path: .');
  });
});
