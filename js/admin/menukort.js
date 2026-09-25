/* Fanen Menukort. Se js/admin/kerne.js for de to principper
   der gælder i alle admin-filerne. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  /* ---- PRISERNE ER DET, DER MANGLER ----

     Ejerens fulde sortiment kom ind i august 2026: 242 varer, og
     hans liste havde ikke ét tal i sig. Ingen af dem er gættet, så
     over halvdelen af kortet står uden pris — og en vare uden pris
     kan ikke bestilles.

     Det er ejerens arbejde at skrive dem, og det skal kunne gøres
     på en eftermiddag. To ting stod i vejen:

     1) Man kunne ikke SE, hvilke der manglede, uden at rulle hele
        kortet igennem. Derfor tælleren og filteret øverst.
     2) Hver pris kostede et tryk på Gem, og et gem tegner hele
        fanen om (se Admin.gem → genindlæs). Havde man skrevet ti
        priser og gemt den ene, var de ni væk uden en fejl. Derfor
        HUSKES det skrevne på tværs af optegninger, og derfor er
        der én knap, der gemmer dem alle. */

  // Prisen personalet HAR skrevet, men ikke gemt endnu: varens id →
  // teksten i feltet. Overlever optegningen; ryddes når databasen
  // svarer med det samme tal.
  var skrevet = {};

  /* ---- HVAD ER DER FILTRERET PÅ, OG HVAD ER DER SØGT EFTER? ----

     Fanen havde ÉT filter: "vis kun dem uden pris". Det var det
     rigtige den dag, 118 priser skulle skrives — men det er ikke
     det, fanen bruges til bagefter. Til daglig er spørgsmålet
     "hvad er udsolgt", "hvad er ved at slippe op" og "hvor er den
     pølse henne".

     ⚠️ 'uden-pris' HEDDER STADIG DET SAMME, og knappen har stadig
     id'et pris-filter. Den var vejen igennem 242 varer på en
     eftermiddag, og den skal ikke laves om, fordi der er kommet
     fire søskende. */
  var filter = 'alle';
  var soeg = '';

  /* Hvornår er kortet så langt, at kategorierne skal foldes?

     ⚠️ MÅLT, IKKE GÆTTET. Ejerens kort er 242 varer i 21
     kategorier. Med alt slået ud er det omkring 280 rækker felter
     — en skærm, man ruller igennem i tyve sekunder for at nå
     "Øl". Under 30 varer fylder hele kortet under to skærme, og
     dér er en fold bare et tryk mere mellem personalet og
     arbejdet. Derfor tælles der, og der foldes ikke på en tom
     forretning. */
  var FOLD_FRA = 30;

  // Hvilke kategorier står åbne? Overlever en optegning — ellers
  // ville folden smække i, hver gang et felt gemte sig selv.
  var aabne = {};

  /* Hvornår er "få tilbage" få? Tallet er gæstesidens: js/skal/
     menukort.js skriver "Kun N tilbage" fra og med fem. To
     udgaver af "hvornår er det ved at slippe op" ville betyde, at
     hjemmesiden advarede gæsten, mens admin sagde, alt var fint. */
  var FAA_TILBAGE = 5;

  /* ---- FINDES KOLONNEN OVERHOVEDET? ----

     antal_tilbage og dage kom til med
     supabase/menukort-antal-og-dage.sql, og den fil er EJERENS at
     køre. Indtil da findes felterne ikke i databasen.

     ⚠️ ET FELT UDEN EN KOLONNE BAG SIG ER VÆRRE END INTET FELT.
     Det ser rigtigt ud, personalet skriver "10 tilbage" i det, og
     gemmet fejler — eller, hvis vi tav om fejlen, gemte det
     ingenting, og køkkenet regnede med et tal, der aldrig blev
     talt ned.

     Svaret læses af DET, DATABASEN HAR SVARET, og ikke af en
     indstilling nogen skal huske at sætte: har rækkerne nøglen,
     er kolonnen der. Er der ingen rækker endnu, er der heller
     ikke noget at vise feltet på. */
  /* harNoegle bor i js/admin/kerne.js (Admin.harNoegle) — én regel
     ét sted. Den lå ordret ens her, i borde.js og i nyheder.js;
     hvorfor det er farligt, står i kommentaren i kerne.js. (17/9) */

  function maaAntal() {
    return Admin.harNoegle(Admin.data && Admin.data.menu_varer, 'antal_tilbage');
  }

  /* ⚠️ FELTET FINDES IKKE, FØR KOLONNEN GØR. Samme greb som
     maaAntal() og nyhedernes maaVindue(): vi læser, hvad
     DATABASEN har svaret, i stedet for at antage. Uden
     supabase/vare-billede.sql ville hvert gem fejle med PGRST204,
     og ejeren ville sidde med et menukort, der ikke kan gemmes,
     på grund af en fil, han ikke ved eksisterer. */
  function maaBillede() {
    return Admin.harNoegle(Admin.data && Admin.data.menu_varer, 'billede');
  }

  /* VALGENE (supabase/vare-valg.sql, 15/9). Samme greb som maaAntal():
     feltet findes kun, når databasen HAR svaret med kolonnen — ellers
     ville hvert valg-gem fejle med PGRST204. */
  function maaValg() {
    return Admin.harNoegle(Admin.data && Admin.data.menu_varer, 'valg');
  }

  /* ⚠️ TILLÆGGET SKRIVES, SOM KORTET SIGER DET  (20/9)
     Det trykte is-kort siger "glutenfri vaffel +3,-", så feltet skriver
     "Glutenfri vaffel +3". Ejeren skal selv kunne rette de 3 kroner —
     det var hele pointen med at lægge priserne i admin, og et tillæg,
     kun en udvikler kan ændre, er et tillæg, der bliver forkert.

     De to funktioner er hinandens modsatte og bor ved siden af
     hinanden: skrider den ene form fra den anden, kan ejeren ikke få
     sin egen tekst tilbage ind i feltet.

     ⚠️ Ører skrives med PUNKTUM. Kommaet er allerede brugt som
     skilletegn mellem valgene, så "3,50" ville blive til to valg. */
  function valgSomTekst(v) {
    var navne = Butik.vareValg ? Butik.vareValg(v) : null;
    if (!navne) return '';
    return navne.map(function (n) {
      var t = Butik.valgTillaeg ? Butik.valgTillaeg(v, n) : 0;
      return t ? n + ' +' + t : n;
    }).join(', ');
  }

  function valgFraTekst(s) {
    return String(s == null ? '' : s).split(',').map(function (del) {
      var t = del.trim();
      if (!t) return null;
      var m = t.match(/^(.*?)\s*\+\s*(\d+(?:\.\d{1,2})?)\s*(?:kr\.?)?$/i);
      if (m && m[1].trim()) return { navn: m[1].trim(), tillaeg: Number(m[2]) };
      return t;
    }).filter(Boolean);
  }

  function maaDage() {
    return Admin.harNoegle(Admin.data && Admin.data.menu_kategorier, 'dage');
  }

  var DAGE_NAVNE = {
    alle: 'Alle dage', hverdage: 'Kun hverdage', weekend: 'Kun weekend',
  };

  /* ⚠️ EJERENS EGNE UGEDAGE  (5/9). Kundens ord: *"weekenderne er
     det kun friture eller det 'nemme' … eller mandag til torsdag
     have alt sortiment"*. Man-tors er hverken 'hverdage'
     (man-fre) eller 'weekend', så de tre ord kunne ikke skrive
     det, han bad om.

     Formatet er cifre i stigende rækkefølge, isodow: '1234' =
     man-tors. Databasen læser præcis det samme
     (mosede_kategori_paa_dagen), og de to SKAL svare ens.

     ⚠️ DE TRE ORD BLIVER LÆSELIGE. Der står rækker i
     produktionen med 'hverdage' og 'weekend', og de skal blive
     ved med at betyde det samme — men når ejeren RØRER
     knapperne, gemmes cifre. Ét format at læse, ét at skrive. */
  var UGE_KORT = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
  var UGE_FULDE = ['mandag', 'tirsdag', 'onsdag', 'torsdag',
    'fredag', 'lørdag', 'søndag'];

  /* Fra hvad der står i databasen til syv ja/nej. */
  function dageSat(vaerdi) {
    var v = String(vaerdi === null || vaerdi === undefined ? '' : vaerdi).trim();
    if (!v || v === 'alle') return [1, 2, 3, 4, 5, 6, 7];
    if (v === 'hverdage') return [1, 2, 3, 4, 5];
    if (v === 'weekend') return [6, 7];
    if (/^[1-7]+$/.test(v)) {
      return v.split('').map(Number).sort();
    }
    /* Et ord, vi ikke kender, lukker ingenting — samme regel som
       i js/store.js. */
    return [1, 2, 3, 4, 5, 6, 7];
  }

  /* ⚠️ OG TILBAGE TIL DET KORTESTE, DER ER SANDT. Alle syv er
     'alle' og ikke '1234567': så bliver rækken ved med at ligne
     de andre, og en fremtidig læser skal ikke oversætte et tal
     for at se, at kategorien er åben hver dag. */
  function dageTekst(sat) {
    var s = sat.slice().sort(function (a, b) { return a - b; }).join('');
    if (s === '1234567') return 'alle';
    if (s === '12345') return 'hverdage';
    if (s === '67') return 'weekend';
    return s;
  }

  /* ============================================================
     HVORNÅR OG HVOR SÆLGES KATEGORIEN?  (13/9)
     ------------------------------------------------------------
     Kundens ord: "det med en kategori skal gælde hele ugen eller
     nogen dage, eller kun hverdagen — og hvad tid er meget uklart",
     og "det er meget utydeligt, hvor henne i menukortet man er".
     Svaret er ÉN linje på folden og øverst i den åbne kategori:
     "Alle dage · hele åbningstiden · forsiden + QR ved bordene".

     ⚠️ LINJEN LÆSER DE SAMME TAL, GÆSTESIDEN LÆSER — dage-kolonnen,
     kategori_tider og de to lister — og regner ingenting ud selv. */
  var UGE_TRE = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];

  function smoerIds() {
    try {
      return ((Butik.smoerrebroed(Admin.data) || {}).kategoriIds || []).map(Number);
    } catch (e) { return []; }
  }
  /* ⚠️ STEDETS LISTE SLÅS OP I Butik.salgsKategorier  (14/9) — den
     samme regel, de tre bestillingsveje spørger. Her stod admins egen
     udgave af "uden en liste er bordet det samme som online", og med
     et tredje sted ville den have været kopi nummer to. */
  function stedListe(sted) {
    try { return Butik.salgsKategorier(Admin.data, sted).map(Number); } catch (e) { return []; }
  }
  function saelgesHer(k, sted) { return stedListe(sted).indexOf(Number(k.id)) !== -1; }
  var STED_NAVN = { smoer: 'smørrebrødssiden', forside: 'forsiden', bord: 'QR ved bordene' };
  function salgsResume(k) {
    var d = maaDage() ? dageTekst(dageSat(k.dage)) : 'alle';
    var dTekst = d === 'alle' ? 'Alle dage'
      : d === 'hverdage' ? 'Hverdage (man–fre)'
        : d === 'weekend' ? 'Weekend (lør–søn)'
          : d.split('').map(function (n) { return UGE_TRE[Number(n) - 1]; }).join(', ');
    var t = ((Admin.data.indstillinger || {}).kategori_tider || {})[String(k.id)] || {};
    function kl(x) { return Butik.klokken(String(x).slice(0, 5)); }
    var tTekst = t.fra && t.til ? 'kl. ' + kl(t.fra) + '–' + kl(t.til)
      : t.fra ? 'fra kl. ' + kl(t.fra)
        : t.til ? 'til kl. ' + kl(t.til) : 'hele åbningstiden';
    var hvor;
    if (k.aktiv === false) hvor = 'ikke på kortet';
    else {
      var her = ['smoer', 'forside', 'bord']
        .filter(function (s) { return saelgesHer(k, s); })
        .map(function (s) { return STED_NAVN[s]; });
      hvor = her.length ? her.join(' + ') : 'kun på menukortet';
    }
    /* Og hvornår den står øverst (16/9) — kun når ejeren har sat det. */
    var NAVN_DEL = { morgen: 'morgen', frokost: 'frokost', aften: 'aften' };
    var dele = Butik.dagsdelFor ? Butik.dagsdelFor(Admin.data, k.id) : [];
    var oeverst = dele.length ? ' · øverst: ' + dele.map(function (x) { return NAVN_DEL[x]; }).join(', ') : '';
    return dTekst + ' · ' + tTekst + ' · ' + hvor + oeverst;
  }

  function udenPris(v) {
    return v.pris === null || v.pris === undefined || v.pris === '';
  }

  function antalAf(v) {
    return v.antal_tilbage === null || v.antal_tilbage === undefined
      ? null : Number(v.antal_tilbage);
  }

  /* ⚠️ FÅ TILBAGE ER IKKE NUL TILBAGE. En vare, der er talt ned
     til nul, ER udsolgt — databasen sætter selv fluebenet — og
     den hører til under Udsolgt. Stod den begge steder, ville de
     to tal tilsammen være større end antallet af varer, og så
     holder man op med at stole på dem. */
  function faaTilbage(v) {
    var n = antalAf(v);
    return n !== null && n > 0 && n <= FAA_TILBAGE;
  }

  /* ⚠️ EN VARE I EN SLUKKET KATEGORI ER OGSÅ SKJULT  (7/9).

     Kundens spørgsmål: "hvorfor er der stadig manglende priser?"

     MÅLT i produktionen: 308 varer, og 34 aktive varer uden pris.
     32 af dem ligger i kategorien "Vælg fyld til smørrebrødet",
     som blev SLUKKET 1/9, da de 24 navngivne smørrebrød og de 24
     håndmadder afløste den. De står altså ikke på kortet, ingen
     gæst kan se dem, og de skal ikke have en pris — men de talte
     med i "Mangler pris", og de talte IKKE med i "Skjult".

     Altså sagde fanen 34, hvor det rigtige svar er 2: isbaren
     ("alt efter type og størrelse af event") og morgenbrødet,
     hvor ejerens eget ord er SPØRG. Det er ikke en skæv
     oplysning — det er en opgave, ejeren tror han har, og som
     ikke findes.

     Skellet er GÆSTENS: både Butik.smoerrebroed og udvalgets
     ekstraKat kræver `k.aktiv !== false`, så en slukket kategori
     findes ikke på hjemmesiden. Derfor er dens varer skjulte
     her. */
  function katFor(v) {
    var id = String(v.kategori_id);
    var fundet = (Admin.data.menu_kategorier || []).filter(function (k) {
      return String(k.id) === id;
    })[0];
    return fundet || null;
  }

  function skjult(v) {
    if (v.aktiv === false) return true;
    var k = katFor(v);
    return !!k && k.aktiv === false;
  }

  /* ⚠️ OG DERFOR ER "MANGLER PRIS" IKKE DET SAMME SOM "UDEN
     PRIS". udenPris() er et FAKTUM om rækken, og visPris() bruger
     den til at tegne feltet tomt — ændrede vi den, ville en
     slukket vare få teksten "null" i sit prisfelt.

     manglerPris() er OPGAVEN: en vare, gæsten kan se, og som ikke
     kan bestilles, fordi der ikke står en pris. Det er den, der
     tælles og filtreres på. */
  function manglerPris(v) { return udenPris(v) && !skjult(v); }

  // Prisen som den står i FELTET: dansk komma, tom hvis der ingen er.
  /* ⚠️ ALLE FORSLAG MED ÉT TRYK  (13/9). Kundens ord: "burgerne skal der
     også beskrivelser på, du ved alle de gode og populære varer". Forslagene
     stod under hver vare og skulle trykkes igennem én ad gangen. Knappen her
     lægger dem alle ud — efter et ja, for det er ejerens menukort.
     ⚠️ DEN RØRER KUN VARER UDEN BESKRIVELSE. Ejerens egne ord slår vores, og
     prøven holder fast i, at en eksisterende tekst og prisen står urørt.
     ⚠️ ÉN VARE AD GANGEN, med DATABASENS pris — et gem af en beskrivelse må
     ikke flytte et tal (samme regel som byg(false) på rækken). */
  function alleForslag(alleVarer) {
    if (!Admin.beskrivelsesForslag) return null;
    var liste = alleVarer.filter(function (v) {
      return !String(v.beskrivelse || '').trim() && Admin.beskrivelsesForslag(v.navn);
    });
    if (!liste.length) return null;
    var boks = lav('div', 'forslag-alle');
    boks.appendChild(lav('span', 'forslag-alle-tekst', liste.length
      + (liste.length === 1 ? ' vare har' : ' varer har')
      + ' et forslag til beskrivelse. Gæsterne kan trykke på en vare med beskrivelse og læse den.'));
    var knap = lav('button', 'knap lille', 'Brug alle forslag');
    knap.type = 'button';
    knap.addEventListener('click', function () {
      if (!window.confirm('Læg ' + liste.length + ' forslag ud på menukortet?\n\n'
        + 'De rører kun varer uden beskrivelse, og de kan rettes bagefter.')) return;
      var kæde = Promise.resolve();
      liste.forEach(function (v) {
        kæde = kæde.then(function () {
          // Kun beskrivelsen — se Butik.skrive.vareFelter (15/9).
          return Butik.skrive.vareFelter(v.id, {
            beskrivelse: Admin.beskrivelsesForslag(v.navn),
          });
        });
      });
      Admin.gem(kæde, liste.length + ' beskrivelser er lagt ud.');
    });
    boks.appendChild(knap);
    return boks;
  }

  function visPris(v) {
    return udenPris(v) ? '' : String(v.pris).replace('.', ',');
  }

  /* "45" og "45,00" og "45.0" er den samme pris. Sammenligningen
     går på tallet, når begge kan læses som et — ellers ville en
     gemt pris blive hængende i skrevet{} for evigt, fordi teksten
     ikke lignede sig selv. */
  function sammePris(a, b) {
    var x = String(a === null || a === undefined ? '' : a).trim();
    var y = String(b === null || b === undefined ? '' : b).trim();
    if (x === y) return true;
    if (x === '' || y === '') return false;
    var nx = Number(x.replace(',', '.'));
    var ny = Number(y.replace(',', '.'));
    return isFinite(nx) && isFinite(ny) && nx === ny;
  }

  /* ============================================================
     HVOR MØDER GÆSTEN DEN HER KATEGORI?  (7/9)

     Kundens ord: "kan vi opdele menukort i admin så man kan se
     hvorhenne fx smørbrød ud af huset med hvad man kan bestille
     der, så det er opdelt i kategorier som på siden og mere
     overskueligt — det er alt for kompliceret."

     MÅLT i produktionen: 22 kategorier og 308 varer i ÉN lang
     liste. Fanen kunne sige, hvor mange der manglede en pris og
     hvor mange der var udsolgt — men ikke det, ejeren spørger om,
     når han skal rette noget: hvor står den her kategori
     henne ude på hjemmesiden?

     ⚠️ OG REGLEN SKRIVES IKKE AF. Betingelserne — aktiv, ikke is,
     rigtig ugedag, fluebenet sat, ikke smørrebrødets egen — står
     i Butik.udvalg, som ALLE tre bestillingsveje bruger. En kopi
     her ville skride fra hinanden den dag en af dem ændrer sig,
     og hverken admin eller hjemmesiden ville se forkerte ud for
     sig selv. Derfor SPØRGER vi udvalget og læser to lister ud
     af svaret.

     De fire steder, i den rækkefølge gæsten møder dem. */
  var STEDER = [
    { id: 'smoer', navn: 'Smørrebrød ud af huset',
      note: 'står på smørrebrødssiden — linjen på hver kategori siger, hvor ellers' },
    { id: 'bestil', navn: 'Kan bestilles',
      note: 'på forsiden og/eller med QR-koden ved bordene — linjen på hver kategori siger hvor' },
    { id: 'kort', navn: 'Kun på menukortet',
      note: 'gæsten kan læse dem, men ikke bestille dem' },
    { id: 'lukket', navn: 'Ikke på kortet',
      note: 'slukket — hverken læses eller bestilles' },
  ];

  /* Svaret regnes ÉN gang pr. optegning. Butik.udvalg går hele
     menukortet igennem, og 22 kald ville være 22 gennemløb. */
  function stederNu() {
    var u = {};
    var uB = {};
    try { u = Butik.udvalg(Admin.data, 'alt') || {}; } catch (e) { u = {}; }
    /* ⚠️ OG BORDENE (13/9): en kategori, der KUN sælges ved bordene,
       kan bestilles — den hører ikke under "Kun på menukortet". */
    try { uB = Butik.udvalg(Admin.data, 'bord') || {}; } catch (e) { uB = {}; }
    /* ⚠️ SMØRREBRØDSSIDENS AFSNIT ER DENS LISTE NU (14/9), ikke
       smørrebrødets navn. Tager ejeren håndmadderne af siden, men
       beholder dem på forsiden, står de under "Kan bestilles" — og
       ikke under et afsnit, der lover noget, siden ikke gør. */
    var andre = stedListe('forside').concat(stedListe('bord')).map(String);
    return {
      smoer: stedListe('smoer').map(String),
      bestil: (u.bestilKategorier || []).concat(uB.bestilKategorier || []).map(String)
        .concat((u.smoerKategorier || []).map(String)
          .filter(function (id) { return andre.indexOf(id) !== -1; })),
    };
  }

  function stedFor(k, s) {
    if (k.aktiv === false) return 'lukket';
    var id = String(k.id);
    if (s.smoer.indexOf(id) !== -1) return 'smoer';
    if (s.bestil.indexOf(id) !== -1) return 'bestil';
    return 'kort';
  }

  /* Kun varer, der hører til en kategori, der faktisk står på
     fanen. En forældreløs række ville tælle med i "mangler en
     pris" og aldrig kunne rettes — tælleren ville lyve for evigt. */
  function varerPåKortet() {
    var kendte = (Admin.data.menu_kategorier || [])
      .map(function (k) { return String(k.id); });
    return (Admin.data.menu_varer || []).filter(function (v) {
      return kendte.indexOf(String(v.kategori_id)) !== -1;
    });
  }

  // Panelet alene, uden at røre felterne under det.
  function friskPrisPanel() {
    var gammel = $('pris-panel');
    if (!gammel || !gammel.parentNode) return;
    gammel.parentNode.replaceChild(prisPanel(varerPåKortet()), gammel);
  }

  function tegnMenu() {
    var boks = $('menu-redigering');
    Admin.tøm(boks);

    var kategorier = (Admin.data.menu_kategorier || [])
      .slice()
      .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); });

    if (!kategorier.length) {
      boks.appendChild(lav('p', 'vare-tekst',
        'Der er ingen kategorier endnu. Opret den første herunder.'));
    }

    var alleVarer = varerPåKortet();

    // Er prisen kommet i databasen, er den ikke "skrevet, ikke gemt".
    alleVarer.forEach(function (v) {
      if (Object.prototype.hasOwnProperty.call(skrevet, v.id)
        && sammePris(skrevet[v.id], visPris(v))) delete skrevet[v.id];
    });

    var status = lav('div', 'menu-status');
    status.id = 'menu-status';
    status.appendChild(statusFelter(alleVarer));
    if (alleVarer.length) status.appendChild(soegefelt());
    /* ⚠️ EN SØGNING GIVER KORT, MAN KAN HANDLE PÅ  (13/9). Kundens ord:
       "så vi kan søge efter ting og det kommer op, så man kan melde
       udsolgt, x antal tilbage eller fjerne dem". Søgningen fandt
       varen før — men den stod inde i hele kategoriens redigering,
       under navnefelt, afdeling, dage, pile og tider. Kortene her
       har kun de tre ting, der skifter i løbet af en dag. */
    if (soeg) status.appendChild(hurtigListe(alleVarer));
    if (filter === 'udsolgt') {
      var masse = aabnAlleIgen(alleVarer);
      if (masse) status.appendChild(masse);
    }
    status.appendChild(prisPanel(alleVarer));
    var alleFl = alleForslag(alleVarer);
    if (alleFl) status.appendChild(alleFl);
    boks.appendChild(status);
    boks.appendChild(bestilAntal());

    /* ⚠️ FOLDET, NÅR KORTET ER LANGT — OG ÅBENT, NÅR DER SØGES.
       Se noten ved FOLD_FRA. Et filter eller en søgning har
       allerede skåret ned til det, man leder efter; at skulle
       åbne en fold oveni ville være et tryk for at se det, man
       lige har bedt om. */
    var folder = alleVarer.length > FOLD_FRA && !filtrerer();
    /* ⚠️ PÅ ET STORT KORT LIGGER KATEGORIENS INDSTILLINGER I EN FOLD
       (13/9). Kundens skud fra telefonen: en åben kategori viste sit
       navn to gange — på folden og i navnefeltet — og derefter
       afdeling, syv dage, pile, Gem, note og tider, før den første
       vare. Det, man åbner en kategori FOR, er varerne. Et lille kort
       (under FOLD_FRA) har ingen folde og beholder hovedet øverst. */
    var stortKort = alleVarer.length > FOLD_FRA;

    /* ⚠️ AFSNITTENE ER GRUPPER, IKKE EN NY SORTERING. Inden for
       hvert afsnit står kategorierne i deres egen sortering —
       gæstens rækkefølge — og pilene bytter med naboen I
       AFSNITTET. Det er dét, øjet ser: en pil, der byttede med en
       kategori i et andet afsnit, ville se ud som om den ikke
       gjorde noget. */
    var steder = stederNu();
    var iAfsnit = {};
    kategorier.forEach(function (k) {
      var sted = stedFor(k, steder);
      (iAfsnit[sted] = iAfsnit[sted] || []).push(k);
    });

    STEDER.forEach(function (afsnit) {
    var listen = iAfsnit[afsnit.id] || [];
    if (!listen.length) return;
    var overskrift = null;
    /* ⚠️ HVERT AFSNIT ER SIN EGEN BEHOLDER  (13/9). Overskrifterne
       klæber under bjælken, og stod de alle direkte i #menu-redigering,
       klæbede de ALLE i den samme beholder: rullede man ned, lagde de
       sig i en stak oven i hinanden (kundens skud). Inde i sin egen
       <section> klæber overskriften kun, mens dens afsnit er på
       skærmen, og går med ud, når afsnittet slutter. */
    var afsnitBoks = null;

    listen.forEach(function (k) {
      var varer = (Admin.data.menu_varer || [])
        .filter(function (v) { return v.kategori_id === k.id; })
        .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); });

      /* Filteret skjuler KATEGORIEN, ikke bare dens varer. En
         overskrift med ingenting under er en kategori, man tror er
         tom — og så opretter nogen varen, der allerede findes.

         ⚠️ MEN EN TOM KATEGORI SKAL BLIVE STÅENDE, når der ikke
         filtreres: den er stedet, hvor den første vare oprettes. */
      var vises = filtrerer() ? varer.filter(passer) : varer;
      if (filtrerer() && !vises.length) return;

      /* ⚠️ OVERSKRIFTEN TEGNES FØRST, NÅR AFSNITTET HAR NOGET AT
         VISE. Filteret kan skære alle kategorier i et afsnit væk,
         og en overskrift med ingenting under er præcis den
         "kategori, man tror er tom", som filteret selv blev lavet
         for at undgå. */
      if (!overskrift) {
        overskrift = lav('div', 'menu-afsnit');
        overskrift.setAttribute('data-afsnit', afsnit.id);
        overskrift.appendChild(lav('span', 'menu-afsnit-navn', afsnit.navn));
        overskrift.appendChild(lav('span', 'menu-afsnit-note', afsnit.note));
        afsnitBoks = lav('section', 'menu-afsnit-boks');
        afsnitBoks.setAttribute('data-afsnit-boks', afsnit.id);
        afsnitBoks.appendChild(overskrift);
        boks.appendChild(afsnitBoks);
      }

      var gruppe = lav('div', 'menu-gruppe');
      /* Id'et i opmærkningen, så en gruppe kan findes uden at lede
         efter et navn. Navnet står i et <input>, og et felts værdi
         er ikke tekst på siden — hverken for en prøve eller for
         den, der skal fejlsøge fanen i en browserkonsol. */
      gruppe.setAttribute('data-kategori', k.id);

      /* ⚠️ EN LUKKET KATEGORI ER ÉN LINJE — HELE VEJEN.
         Første udgave foldede kun VARERNE væk og lod
         kategorihovedet stå: navnefelt, afdeling, dage, pile, Gem
         og et tomt notefelt. **Målt: 21 lukkede kategorier fyldte
         stadig fire skærme**, og notefeltet lignede noget, der
         skulle udfyldes. Er den lukket, står der navnet og
         tallene, og intet andet. */
      var aaben = !folder || aabne[k.id];
      gruppe.classList.toggle('foldet', !aaben);
      if (folder) gruppe.appendChild(foldeknap(k, varer));
      if (!aaben) { afsnitBoks.appendChild(gruppe); return; }

      var hoved = kategoriHoved(k, listen);
      var bestilbar = kanBestilles(k);
      if (!stortKort) gruppe.appendChild(hoved);

      var krop = lav('div', 'menu-krop');
      if (!stortKort) krop.appendChild(bestilbar);

      // Pilene flytter i den HELE liste, også når filteret viser
      // et udsnit: rækkefølgen på gæstesiden er hele listens.
      vises.forEach(function (v) { krop.appendChild(varerække(v, varer)); });

      /* Genvejen findes, hvor den kan bruges: én pris tastet ét
         sted i stedet for 29 felter. På en kategori med én vare er
         den bare et felt mere at kigge på. Se samlePris(). */
      if (varer.length >= 2) krop.appendChild(samlePris(k, varer));
      if (!filtrerer()) krop.appendChild(nyVareFelt(k));

      /* ⚠️ ØVERST OG MED SVARET PÅ LINJEN  (13/9). Folden lå nederst og
         hed "Kategoriens indstillinger" — man skulle åbne den for at se,
         HVORNÅR og HVOR kategorien sælges. Nu står svaret som folden
         selv, over varerne, og et tryk viser, hvor det rettes. */
      if (stortKort) {
        var ind = lav('details', 'kat-indstillinger');
        var sum = lav('summary', null);
        sum.appendChild(lav('span', 'kat-resume', salgsResume(k)));
        sum.appendChild(lav('span', 'kat-ret', 'Ret ▸'));
        ind.appendChild(sum);
        ind.appendChild(bestilbar);
        ind.appendChild(hoved);
        gruppe.appendChild(ind);
      }
      gruppe.appendChild(krop);
      afsnitBoks.appendChild(gruppe);
    });
    });

    if (!filtrerer()) boks.appendChild(nyKategoriFelt(kategorier));

    /* Søgte man efter noget, der ikke findes, skal det siges. En
       tom skærm ligner en fane, der er gået i stå — og så
       genindlæser nogen midt i en frokost. */
    if (filtrerer() && !boks.querySelector('.menu-gruppe')) {
      boks.appendChild(lav('p', 'vare-tekst', soeg
        ? 'Ingen varer hedder noget med "' + soeg + '".'
        : 'Ingen varer i den gruppe.'));
    }
  }

  /* ---- FOLDEN, OG HVAD DER STÅR PÅ DEN ----

     Overskriften alene er ikke nok til at vælge en kategori fra:
     "Burgere" siger ikke, om der er noget at se på i den i dag.
     Tallene gør — og de er de SAMME tal som de fem felter øverst,
     så en lukket fold ikke kan skjule et rødt tal. */
  function foldeknap(k, varer) {
    var aaben = !!aabne[k.id];
    var knap = lav('button', 'menu-fold' + (aaben ? ' aaben' : ''));
    knap.type = 'button';
    knap.setAttribute('data-fold', k.id);
    knap.setAttribute('aria-expanded', aaben ? 'true' : 'false');

    knap.appendChild(lav('span', 'menu-fold-pil', aaben ? '▾' : '▸'));
    /* NAVNET STÅR PÅ FOLDEN, ikke kun i feltet indeni. Et felt,
       man ikke kan se, er ikke en overskrift — og en lukket
       kategori uden navn er en linje, ingen kan vælge fra. */
    knap.appendChild(lav('span', 'menu-fold-navn', k.navn));
    knap.appendChild(lav('span', 'menu-fold-antal',
      varer.length + (varer.length === 1 ? ' vare' : ' varer')));
    knap.appendChild(lav('span', 'menu-fold-salg', salgsResume(k)));

    var udsolgte = varer.filter(function (v) { return !!v.udsolgt; }).length;
    var faa = maaAntal() ? varer.filter(faaTilbage).length : 0;
    var uden = varer.filter(manglerPris).length;

    /* ⚠️ TALLENE ER GENVEJE, IKKE PYNT (30/8).

       Kundens ord: "gør så jeg kan trykke dem uden priser." Han
       har ret — tallet stod som en oplysning, og så skal man
       bagefter finde filteret øverst på fanen og sætte det selv.
       Nu er det tallet, der ER vejen derhen: ét tryk filtrerer
       fanen til netop de varer.

       ⚠️ DE KAN IKKE VÆRE <button> INDE I FOLDEN. Folden er selv
       en knap, og en knap i en knap er ugyldig opmærkning — nogle
       browsere flytter den ud, og så ligger tallet et helt andet
       sted. De er spans med en rolle og en tastaturvej, og
       klikket standses, så folden ikke også åbner sig. */
    function genvej(tekst, klasse, filter) {
      var el = lav('span', klasse + ' menu-fold-genvej', tekst);
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.title = 'Vis kun ' + tekst + ' — på hele menukortet';
      function gaa(h) {
        /* Uden den her åbner folden OGSÅ, og så hopper siden,
           mens filteret tegner om. */
        h.stopPropagation();
        h.preventDefault();
        saetFilter(filter);
      }
      el.addEventListener('click', gaa);
      el.addEventListener('keydown', function (h) {
        if (h.key === 'Enter' || h.key === ' ') gaa(h);
      });
      knap.appendChild(el);
    }

    if (udsolgte) genvej(udsolgte + ' udsolgt', 'menu-fold-varsel', 'udsolgt');
    if (faa) genvej(faa + ' få tilbage', 'menu-fold-varsel', 'faa');
    if (uden) genvej(uden + ' uden pris', 'menu-fold-note', 'uden-pris');

    knap.addEventListener('click', function () {
      aabne[k.id] = !aabne[k.id];
      /* Hele fanen tegnes om — som ved filteret og søgningen. Det
         er kun sikkert, fordi PRISERNE huskes i skrevet{} på tværs
         af optegninger: uden det ville en fold, der blev rørt,
         tørre de tal af, som nogen stod og skrev i en anden
         kategori. Se noten øverst i filen.

         ⚠️ OG MARKØREN SKAL TILBAGE PÅ KNAPPEN. Uden det lander
         fokus på <body>, og den, der folder sig igennem kortet med
         tastaturet, begynder forfra ved hver fold. */
      tegnMenu();
      var nyt = document.querySelector('[data-fold="' + k.id + '"]');
      if (nyt) nyt.focus();
    });
    return knap;
  }

  /* ============================================================
     SÅDAN STÅR KORTET
     ------------------------------------------------------------
     Fem tal, og de svarer på de fem spørgsmål, man ellers skal
     rulle 242 rækker igennem for at besvare. Hvert tal er en
     KNAP: et tryk filtrerer listen, så tallet også er vejen hen
     til arbejdet og ikke bare noget at kigge på.

     ⚠️ FELTER, DER IKKE KAN LADE SIG GØRE, FINDES IKKE.
     "Få tilbage" kræver kolonnen antal_tilbage, og den kommer
     med supabase/menukort-antal-og-dage.sql, som er EJERENS at
     køre. Indtil da ville feltet stå og sige 0 om noget, der
     ikke kan tælles. Se maaAntal().
     ============================================================ */
  var FILTRE = [
    { id: 'alle', navn: 'Alle', note: 'hele kortet',
      passer: function () { return true; } },
    { id: 'udsolgt', navn: 'Udsolgt', note: 'kan ikke bestilles nu',
      passer: function (v) { return !!v.udsolgt; } },
    { id: 'faa', navn: 'Få tilbage', note: FAA_TILBAGE + ' eller færre',
      kraeverAntal: true, passer: faaTilbage },
    { id: 'uden-pris', navn: 'Mangler pris', note: 'kan ses, ikke bestilles',
      passer: manglerPris },
    { id: 'skjult', navn: 'Skjult', note: 'ikke på kortet', passer: skjult },
  ];

  function filterNu() {
    return FILTRE.filter(function (f) { return f.id === filter; })[0] || FILTRE[0];
  }

  /* Søgningen er den vigtigste af dem alle på et kort med 242
     varer: "hvor er pølsen henne" er tyve sekunders rulning uden
     den. Der søges i BÅDE navn og beskrivelse — ejeren husker
     ikke altid, hvad varen hedder, men han husker, hvad der er i
     den.

     ⚠️ OG DEN SKAL TÅLE, HVORDAN MAN FAKTISK SKRIVER  (20/9).
     Ejerens ord: *"gør søgefeltet langt langt bedre så de kan
     finde det"*. Den var ren delstreng, og den fejlede på tre
     ting, der sker hver dag:

       · "polser" fandt ikke "Pølser". Man skriver ikke ø, når man
         har travlt — og slet ikke på en iPad i et køkken.
       · "Ispinde" fandt ingenting, fordi det er en KATEGORI. Man
         husker, HVOR varen står, ikke hvad den hedder.
       · "pølser rødløg" fandt ingenting, fordi de to ord står i
         hvert sit felt.

     ⚠️ "UDEN PRIS" BLEV IKKE EN SØGETERM. Det filter findes
     allerede som knap ("Mangler pris" i FILTRE). To veje til det
     samme er dét, huset er brændt på før. */

  /* ø/æ/å og oe/ae/aa foldes til det samme, så stavemåden ikke
     afgør, om man finder sin vare. Rækkefølgen er med vilje:
     ø→o FØR oe→o, ellers ville "Pølse" blive til "plse". */
  function fold(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/ø/g, 'o').replace(/æ/g, 'a').replace(/å/g, 'a')
      .replace(/oe/g, 'o').replace(/ae/g, 'a').replace(/aa/g, 'a');
  }

  function katNavnFor(id) {
    var fundet = ((Admin.data && Admin.data.menu_kategorier) || [])
      .filter(function (k) { return String(k.id) === String(id); })[0];
    return fundet ? fundet.navn : '';
  }

  /* ⚠️ ET KORT ORD SKAL STÅ FØRST I ET ORD — MÅLT, IKKE GÆTTET.

     Første udgave lod hvert søgeord matche hvor som helst. Så gav
     "Øl nr. 3" alle tolv PØLSER, fordi "øl" foldes til "ol", og
     "ol" står inde i "polser". To prøver faldt på det.

     Men kravet må ikke gælde alle ord: "løg" skal stadig finde
     "rødløg", og "vand" skal finde "sodavand". Grænsen går ved to
     tegn — det er dér, et ord er så kort, at det rammer tilfældigt
     inde i et andet. */
  function harOrdet(hoestak, o) {
    if (o.length > 2) return hoestak.indexOf(o) !== -1;
    var i = hoestak.indexOf(o);
    while (i !== -1) {
      if (i === 0 || /[^a-z0-9]/.test(hoestak.charAt(i - 1))) return true;
      i = hoestak.indexOf(o, i + 1);
    }
    return false;
  }

  function passerSoeg(v) {
    if (!soeg) return true;
    var hoestak = fold(v.navn) + ' ' + fold(v.beskrivelse)
      + ' ' + fold(katNavnFor(v.kategori_id));
    /* ⚠️ ALLE ord skal findes, ikke bare ét. Ellers ville "pølser
       flødeskumsbolle" give alle tolv pølser — en søgning, der
       svarer på noget andet end det, der blev spurgt om. */
    var ord = fold(soeg).split(/\s+/).filter(Boolean);
    if (!ord.length) return true;
    return ord.every(function (o) { return harOrdet(hoestak, o); });
  }

  function passer(v) {
    return filterNu().passer(v) && passerSoeg(v);
  }

  // Er der overhovedet skruet på noget? Så skal folderne åbne sig.
  function filtrerer() { return filter !== 'alle' || !!soeg; }

  function saetFilter(f) {
    filter = (filter === f && f !== 'alle') ? 'alle' : f;
    tegnMenu();
    var nyt = $('menu-status');
    if (nyt) nyt.scrollIntoView({ block: 'start' });
  }

  function statusFelter(alleVarer) {
    var boks = lav('div', 'menu-tal');

    FILTRE.forEach(function (f) {
      if (f.kraeverAntal && !maaAntal()) return;
      var n = f.id === 'alle' ? alleVarer.length : alleVarer.filter(f.passer).length;
      var k = lav('button', 'menu-tal-felt'
        + (filter === f.id ? ' valgt' : '')
        + (n && (f.id === 'udsolgt' || f.id === 'faa') ? ' varsel' : ''));
      k.type = 'button';
      k.setAttribute('data-menutal', f.id);
      k.setAttribute('aria-pressed', filter === f.id ? 'true' : 'false');
      k.appendChild(lav('span', 'menu-tal-tal', String(n)));
      k.appendChild(lav('span', 'menu-tal-navn', f.navn));
      k.appendChild(lav('span', 'menu-tal-note', f.note));
      k.addEventListener('click', function () { saetFilter(f.id); });
      boks.appendChild(k);
    });

    return boks;
  }

  /* ---- SØG OG RET MED DET SAMME  (13/9) ----

     Ét kort pr. fundet vare: navnet, kategorien og prisen, og de tre
     ting, der skifter i løbet af en dag — udsolgt, antal tilbage og
     om den står på kortet. "Ret pris og navn" åbner varens fulde
     række; kortet her er ikke stedet for en pris, der tastes i tre
     anslag (se noten ved byg() i varerække).

     ⚠️ DET GEMTE ER DET SAMME SOM MASSEKNAPPENS (aabnAlleIgen):
     databasens pris og ALDRIG et antal, ingen har rørt. Sendte vi
     varens antal_tilbage med ved et tryk på Udsolgt, ville morgenens
     tal blive skrevet tilbage, mens databasen har talt ned. */
  var HURTIG_MAX = 25;

  function gemHurtig(v, aendring, besked) {
    var ud = {
      id: v.id, kategori_id: v.kategori_id, navn: v.navn,
      beskrivelse: v.beskrivelse, pris: visPris(v),
      fremhaevet: v.fremhaevet, udsolgt: !!v.udsolgt, aktiv: v.aktiv,
      sortering: v.sortering,
    };
    Object.keys(aendring).forEach(function (n) { ud[n] = aendring[n]; });
    Admin.gem(Butik.skrive.vare(ud), besked);
  }

  function hurtigKort(v) {
    var kort = lav('div', 'hurtig-kort' + (v.udsolgt ? ' er-udsolgt' : '')
      + (v.aktiv === false ? ' er-skjult' : ''));
    kort.setAttribute('data-hurtig', v.id);
    var kat = (Admin.data.menu_kategorier || []).filter(function (k) {
      return k.id === v.kategori_id;
    })[0];

    var top = lav('div', 'hurtig-top');
    top.appendChild(lav('strong', 'hurtig-navn', v.navn));
    var p = visPris(v);
    top.appendChild(lav('span', 'hurtig-kat', (kat ? kat.navn : '')
      + (p ? ' · ' + p + ' kr.' : ' · ingen pris')
      + (v.aktiv === false ? ' · skjult' : '')));
    kort.appendChild(top);

    var knapper = lav('div', 'hurtig-knapper');

    var udsolgt = lav('button', 'udsolgt-knap' + (v.udsolgt ? ' er-udsolgt' : ''),
      v.udsolgt ? 'UDSOLGT ✕' : 'Udsolgt?');
    udsolgt.type = 'button';
    udsolgt.setAttribute('data-hurtig-udsolgt', v.id);
    udsolgt.setAttribute('aria-pressed', v.udsolgt ? 'true' : 'false');
    /* ⚠️ TALT NED TIL NUL: den kan ikke bare sættes til salg — se
       noten ved aabnAlleIgen. Knappen siger, hvad der skal til. */
    if (v.udsolgt && antalAf(v) === 0) {
      udsolgt.disabled = true;
      udsolgt.title = 'Talt ned til nul — skriv et nyt antal ved siden af';
    }
    udsolgt.addEventListener('click', function () {
      gemHurtig(v, { udsolgt: !v.udsolgt },
        v.navn + (v.udsolgt ? ' er til salg igen.' : ' er meldt udsolgt.'));
    });
    knapper.appendChild(udsolgt);

    if (maaAntal()) {
      var antal = document.createElement('input');
      antal.type = 'text';
      antal.inputMode = 'numeric';
      antal.placeholder = 'Antal tilbage';
      antal.setAttribute('aria-label', 'Hvor mange er der tilbage af ' + v.navn);
      antal.setAttribute('data-hurtig-antal', v.id);
      antal.value = v.antal_tilbage === null || v.antal_tilbage === undefined
        ? '' : String(v.antal_tilbage);
      antal.addEventListener('keydown', function (h) { if (h.key === 'Enter') antal.blur(); });
      antal.addEventListener('change', function () {
        gemHurtig(v, { antal_tilbage: antal.value },
          antal.value.trim() ? 'Der er ' + antal.value.trim() + ' tilbage af ' + v.navn + '.'
            : v.navn + ' tælles ikke længere.');
      });
      knapper.appendChild(antal);
    }

    var skjul = lav('button', 'knap lille', v.aktiv === false ? 'Vis igen' : 'Skjul');
    skjul.type = 'button';
    skjul.setAttribute('data-hurtig-skjul', v.id);
    skjul.title = v.aktiv === false
      ? 'Sæt ' + v.navn + ' på kortet igen'
      : 'Tag ' + v.navn + ' af kortet. Den slettes ikke og kan vises igen.';
    skjul.addEventListener('click', function () {
      var vis = v.aktiv === false;
      gemHurtig(v, { aktiv: vis },
        v.navn + (vis ? ' står på kortet igen.' : ' er taget af kortet.'));
    });
    knapper.appendChild(skjul);

    var ret = lav('button', 'knap lille hurtig-ret', 'Ret pris og navn ▸');
    ret.type = 'button';
    ret.addEventListener('click', function () {
      aabne[v.kategori_id] = true;
      soeg = '';
      tegnMenu();
      var r = document.querySelector('.vare-raekke[data-vare="' + v.id + '"]');
      if (r) r.scrollIntoView({ block: 'center' });
    });
    knapper.appendChild(ret);

    kort.appendChild(knapper);
    return kort;
  }

  function hurtigListe(alleVarer) {
    var fundne = alleVarer.filter(passer);
    var boks = lav('div', 'hurtig-liste');
    boks.id = 'menu-hurtig';
    if (!fundne.length) return boks;
    boks.appendChild(lav('p', 'hurtig-note', (fundne.length === 1 ? '1 vare'
      : fundne.length + ' varer') + (fundne.length > HURTIG_MAX
      ? ' — de første ' + HURTIG_MAX + ' står her. Skriv mere for at snævre ind.' : '')));
    fundne.slice(0, HURTIG_MAX).forEach(function (v) { boks.appendChild(hurtigKort(v)); });
    return boks;
  }

  function soegefelt() {
    var r = lav('div', 'menu-soeg');
    var f = document.createElement('input');
    f.type = 'search';
    f.id = 'menu-soeg';
    f.placeholder = 'Søg efter en vare — fx pølse';
    f.setAttribute('aria-label', 'Søg på menukortet');
    f.value = soeg;
    /* ⚠️ DER TEGNES OM VED HVERT TASTETRYK, og markøren skal
       tilbage i feltet bagefter. Uden det mistede man feltet efter
       første bogstav, og resten af ordet landede ingen steder. */
    f.addEventListener('input', function () {
      soeg = f.value.trim();
      tegnMenu();
      var nyt = $('menu-soeg');
      if (nyt) { nyt.focus(); nyt.setSelectionRange(nyt.value.length, nyt.value.length); }
    });
    r.appendChild(f);
    return r;
  }

  /* ---- ÉT TRYK OM MORGENEN ----

     Det, der er meldt udsolgt i går, skal på kortet igen i dag, og
     med tolv udsolgte varer er det tolv tryk plus tolv gange at
     finde rækken. Knappen står KUN, når man kigger på de udsolgte
     — den er et redskab til den opgave, ikke en knap på hele fanen.

     ⚠️ DEN RØRER IKKE DEM, DER ER TALT NED TIL NUL. En vare med
     antal_tilbage = 0 er udsolgt, fordi databasen talte den ned,
     og satte vi bare fluebenet fra, ville gæsten kunne lægge den i
     kurven — og bremsen ville afvise hele bestillingen ved
     afsendelsen. Hun ville ikke ane hvorfor. De skal have et nyt
     antal, og linjen siger det. */
  function aabnAlleIgen(alleVarer) {
    var udsolgte = alleVarer.filter(function (v) { return !!v.udsolgt; });
    if (!udsolgte.length) return null;

    var kanAabnes = udsolgte.filter(function (v) { return antalAf(v) !== 0; });
    var talt = udsolgte.length - kanAabnes.length;

    var boks = lav('div', 'menu-massehandling');
    if (kanAabnes.length) {
      var knap = lav('button', 'knap', kanAabnes.length === 1
        ? 'Sæt den ene til salg igen'
        : 'Sæt alle ' + kanAabnes.length + ' til salg igen');
      knap.type = 'button';
      knap.id = 'aabn-alle-udsolgte';
      knap.addEventListener('click', function () {
        if (!window.confirm('Sæt ' + kanAabnes.length + ' udsolgte varer til salg igen?\n\n'
          + 'De står på kortet med det samme.')) return;
        knap.disabled = true;
        var kaede = kanAabnes.reduce(function (p, v) {
          return p.then(function () {
            // Kun udsolgt — se Butik.skrive.vareFelter (15/9).
            return Butik.skrive.vareFelter(v.id, { udsolgt: false });
          });
        }, Promise.resolve());
        Admin.gem(kaede, kanAabnes.length + ' varer er til salg igen.');
      });
      boks.appendChild(knap);
    }
    if (talt) {
      boks.appendChild(lav('p', 'hjaelp', talt === 1
        ? 'Én er udsolgt, fordi der er talt ned til nul. Skriv et nyt '
          + 'antal på den — ellers afviser databasen bestillingen.'
        : talt + ' er udsolgte, fordi der er talt ned til nul. Skriv et nyt '
          + 'antal på dem — ellers afviser databasen bestillingen.'));
    }
    return boks;
  }

  /* ---- TÆLLEREN, FILTERET OG DEN ENE GEM-KNAP ----

     Panelet står ØVERST på fanen, fordi det er svaret på "hvor
     langt er vi?". Uden det er 118 manglende priser spredt ud over
     21 kategorier, og den eneste måde at finde dem på er at rulle. */
  function prisPanel(alleVarer) {
    /* ⚠️ manglerPris OG IKKE udenPris. Tallet her er en OPGAVE —
       "hvor langt er vi?" — og en vare i en slukket kategori er
       ikke en opgave. Se noten ved manglerPris(). */
    var uden = alleVarer.filter(manglerPris);
    var venter = Object.keys(skrevet).length;

    var boks = lav('div', 'pris-panel');
    boks.id = 'pris-panel';
    boks.appendChild(lav('div', 'eyebrow', 'Priser'));

    if (!alleVarer.length) {
      boks.appendChild(lav('p', 'hjaelp', 'Der er ingen varer endnu.'));
      return boks;
    }

    boks.appendChild(lav('p', 'hjaelp', uden.length
      ? uden.length + ' af ' + alleVarer.length + ' varer mangler en pris. '
        + 'En vare uden pris kan ikke bestilles — den står med en tankestreg '
        + 'på menukortet, og gæsten kan kun ønske sig den.'
      : 'Alle ' + alleVarer.length + ' varer har en pris.'));

    /* Det skrevne overlever en optegning, men ikke en lukket fane.
       Linjen siger det højt, så ingen går fra skærmen med tallene
       stående i felterne og tror, de er gemt. */
    if (venter) {
      boks.appendChild(lav('p', 'pris-venter', venter === 1
        ? 'Én pris er skrevet, men ikke gemt endnu.'
        : venter + ' priser er skrevet, men ikke gemt endnu.'));
    }

    var række = lav('div', 'pris-knapper');

    /* ⚠️ KNAPPEN BLIVER, OG DEN BEHOLDER SIT ID.

       Den var vejen igennem 242 varer på en eftermiddag, og selv
       om "Mangler pris" nu også er et af de fem tal øverst, er
       den her stadig dér, hvor sætningen om hullerne står. De to
       gør det samme — saetFilter er den ene vej ind, så de ikke
       kan komme til at være uenige om, hvad der er slået til. */
    if (uden.length || filter === 'uden-pris') {
      var filterKnap = lav('button', 'knap sekundaer', filter === 'uden-pris'
        ? 'Vis hele menukortet'
        : (uden.length === 1
          ? 'Vis kun den ene, der mangler en pris'
          : 'Vis kun de ' + uden.length + ', der mangler en pris'));
      filterKnap.type = 'button';
      filterKnap.id = 'pris-filter';
      filterKnap.addEventListener('click', function () { saetFilter('uden-pris'); });
      række.appendChild(filterKnap);
    }

    var gem = lav('button', 'knap', venter
      ? 'Gem ' + (venter === 1 ? 'prisen' : 'de ' + venter + ' priser')
      : 'Gem priserne');
    gem.type = 'button';
    gem.id = 'gem-alle-priser';
    gem.disabled = !venter;
    gem.addEventListener('click', gemSkrevnePriser);
    række.appendChild(gem);

    boks.appendChild(række);
    return boks;
  }

  /* Alle de skrevne priser i ÉN omgang. Det er ikke en optimering
     — det er den eneste måde, hvorpå et gem ikke kaster resten af
     det skrevne væk, når fanen tegnes om bagefter. */
  function gemSkrevnePriser() {
    var varer = Admin.data.menu_varer || [];
    var ændret = [];
    var fejl = null;

    Object.keys(skrevet).forEach(function (id) {
      var v = varer.filter(function (x) { return String(x.id) === String(id); })[0];
      if (!v) return;                       // varen er slettet imens
      var værdi = String(skrevet[id]).trim();
      var f = Butik.tjek.pris(værdi);
      if (f) { if (!fejl) fejl = v.navn + ': ' + f; return; }
      ændret.push(Object.assign({}, v, { pris: værdi }));
    });

    // Én forkert pris standser HELE gemningen. Halvdelen gemt og
    // halvdelen ikke er værre end ingenting: så ved ingen, hvad der
    // står i databasen.
    if (fejl) return Admin.brøl(fejl);
    if (!ændret.length) {
      return Admin.brøl('Der er ingen nye priser at gemme. Skriv tallene i felterne først.');
    }

    /* ⚠️ KUN PRISEN SENDES (15/9). Rækken er skærmens egen kopi, og
       en anden skærm kan have meldt varen udsolgt imens — se
       Butik.skrive.vareFelter. */
    Admin.gem(Promise.all(ændret.map(function (v) {
      return Butik.skrive.vareFelter(v.id, { pris: v.pris });
    })), ændret.length === 1
      ? ændret[0].navn + ' har fået en pris.'
      : ændret.length + ' priser er gemt.');
  }

  /* ---- HVOR FÅ, OG HVOR TIDLIGT? ----

     De to tal står også på fanen Bestillinger, og det er med
     vilje: det er HER, ejeren sidder, når han åbner en kategori
     for bestilling og skriver priser på den. At skulle skifte fane
     for at sige "mindst 4 stykker" er den slags, der ender med, at
     ingen sætter tallet.

     Det er de SAMME indstillinger — ikke en kopi. Begge faner
     tegnes af Admin.tegnere efter hvert gem, så de kan ikke skride
     fra hinanden. */
  function bestilAntal() {
    var i = Admin.data.indstillinger || {};

    var boks = lav('div', 'pris-panel');
    boks.id = 'menu-antal';
    boks.appendChild(lav('div', 'eyebrow', 'Antal og varsel'));
    boks.appendChild(lav('p', 'hjaelp',
      'Gælder al bestilling af mad ud af huset. De samme to tal står '
      + 'på fanen Bestillinger.'));

    var række = lav('div', 'felt-par');

    var f1 = lav('div', 'felt');
    var m1 = lav('label', null, 'Mindste antal smørrebrød');
    var min = document.createElement('input');
    min.type = 'number'; min.id = 'menu-min-stk'; min.min = '1'; min.max = '500';
    min.value = i.bestilling_min_stk === undefined ? 1 : i.bestilling_min_stk;
    m1.setAttribute('for', min.id);
    f1.appendChild(m1); f1.appendChild(min);

    var f2 = lav('div', 'felt');
    var m2 = lav('label', null, 'Varsel i timer');
    var varsel = document.createElement('input');
    varsel.type = 'number'; varsel.id = 'menu-varsel-timer';
    varsel.min = '0'; varsel.max = '720';
    varsel.value = i.bestilling_varsel_timer === undefined ? 24 : i.bestilling_varsel_timer;
    m2.setAttribute('for', varsel.id);
    f2.appendChild(m2); f2.appendChild(varsel);

    var knap = lav('button', 'knap', 'Gem antal og varsel');
    knap.type = 'button';
    knap.id = 'gem-menu-antal';
    knap.addEventListener('click', function () {
      var stk = Number(min.value);
      var timer = Number(varsel.value);
      if (!isFinite(stk) || stk < 1 || stk > 500) {
        return Admin.brøl('Mindste antal skal være mellem 1 og 500.');
      }
      if (!isFinite(timer) || timer < 0 || timer > 720) {
        return Admin.brøl('Varslet skal være mellem 0 og 720 timer.');
      }
      Admin.gem(Butik.skrive.indstilling('bestilling_min_stk', Math.round(stk))
        .then(function () {
          return Butik.skrive.indstilling('bestilling_varsel_timer', Math.round(timer));
        }), 'Gæsten skal bestille mindst ' + Math.round(stk) + ' og senest '
          + Math.round(timer) + ' timer før.');
    });

    var f3 = lav('div', 'felt');
    f3.appendChild(knap);

    række.appendChild(f1);
    række.appendChild(f2);
    række.appendChild(f3);
    boks.appendChild(række);
    return boks;
  }

  /* ---- KATEGORIENS EGET HOVED ----

     Kundens spørgsmål (23/8): "på admin kan man administrere
     menukortet ordentligt?" Svaret var nej på tre punkter, og det
     her er de to af dem: navnet var en overskrift, man ikke kunne
     rette, og rækkefølgen kunne kun ændres i databasen.

     Navnet er et felt nu, afdelingen en vælger, og pilene flytter
     kategorien op og ned. Ingen af delene er nye i databasen —
     adgangsreglerne har tilladt det hele tiden (se flerlejer.sql).

     SLET STÅR KUN PÅ EN TOM KATEGORI. Databasen sletter varerne
     med (on delete cascade), og et tryk må ikke kunne tage 29
     varer med sig. Er der varer i, siger linjen det i stedet. */
  function kategoriHoved(k, alle) {
    var h = lav('div', 'kat-hoved');

    var navn = document.createElement('input');
    navn.type = 'text';
    navn.className = 'navn';
    navn.id = 'kat-navn-' + k.id;
    navn.setAttribute('aria-label', 'Navn på kategorien ' + k.navn);
    navn.value = k.navn;
    navn.maxLength = 80;

    // 'grill' er det gamle navn for 'mad'. Står der stadig gamle
    // rækker i databasen, skal de ikke vises som ukendte.
    var afd = k.afdeling === 'grill' ? 'mad' : k.afdeling;
    var vælger = document.createElement('select');
    vælger.className = 'smal-vaelger';
    vælger.id = 'kat-afd-' + k.id;
    vælger.setAttribute('aria-label', 'Afdeling for ' + k.navn);
    [['mad', 'Mad'], ['is', 'Is'], ['drikke', 'Drikkevarer']].forEach(function (p) {
      var o = document.createElement('option');
      o.value = p[0]; o.textContent = p[1];
      if (p[0] === afd) o.selected = true;
      vælger.appendChild(o);
    });

    /* NOTEN GÆLDER HELE KATEGORIEN. "På toastbrød eller rugbrød"
       hører til alle tolv slags pindemad, ikke til hver linje —
       skrevet på hver vare ville den fylde tolv gange og sige det
       samme. Feltet er frivilligt; er det tomt, står der ingen
       linje på kortet. */
    var note = document.createElement('input');
    note.type = 'text';
    /* IKKE klassen 'navn'. Prøverne — og flytte-knapperne —
       finder kategoriens navnefelt med '.kat-hoved .navn', og et
       felt mere med samme klasse gør den vælger til to felter.
       Fire prøver faldt på det. */
    note.className = 'kat-note';
    note.setAttribute('aria-label', 'Note under overskriften ' + k.navn);
    note.id = 'kat-note-' + k.id;
    note.value = k.note || '';
    note.maxLength = 200;
    note.placeholder = 'Note over varerne (valgfri) — fx "På toastbrød eller rugbrød"';

    /* ---- HVILKE DAGE LAVES DET? ----

       Kundens billeder (26/8): en rulleliste ude til højre for
       kategorinavnet. Burgerne laves ikke i weekenden, og stod de
       på kortet alligevel, ville en gæst bestille en burger til
       lørdag, og køkkenet ville opdage det lørdag morgen.

       ⚠️ VÆLGEREN FINDES KUN, NÅR KOLONNEN GØR. Se maaAntal() og
       maaDage() øverst. */
    /* ⚠️ SYV KNAPPER, IKKE EN RULLELISTE MED TRE VALG  (5/9).
       Her stod en <select> med Alle / Hverdage / Weekend, og
       noten sagde, at tre valg kan besvares uden at tænke. Det
       holdt, til ejeren bad om **mandag til torsdag** — som er
       hverken det ene eller det andet, fordi 'hverdage' tager
       fredagen med, og fredag er netop den dag, en grillbar har
       travlt.

       Syv knapper er stadig ét blik, og de kan sige alt. Værdien
       gemmes som cifre; de tre gamle ord læses stadig, og alle
       syv slået til gemmes som 'alle' — se dageTekst(). */
    var dage = null;
    var dageValg = null;
    if (maaDage()) {
      dage = lav('div', 'kat-dage');
      dage.setAttribute('role', 'group');
      dage.setAttribute('aria-label', 'Hvilke dage laves ' + k.navn);
      var valgte = dageSat(k.dage);
      /* ⚠️ VÆRDIEN LÆSES AF KNAPPERNE, ikke af en variabel ved
         siden af. Ét sted at være uenig er ét for meget — og
         `saml()` nedenfor spørger DOM'en, som personalet ser
         den. */
      UGE_KORT.forEach(function (bogstav, i) {
        var nr = i + 1;
        var b = lav('button', 'kat-dag' + (valgte.indexOf(nr) !== -1 ? ' paa' : ''),
          bogstav);
        b.type = 'button';
        b.setAttribute('data-dag', String(nr));
        b.setAttribute('aria-pressed', valgte.indexOf(nr) !== -1 ? 'true' : 'false');
        /* Bogstavet alene siger ikke, hvilken dag det er — T er
           både tirsdag og torsdag. Navnet er knappens. */
        b.setAttribute('aria-label', UGE_FULDE[i]);
        b.title = UGE_FULDE[i];
        b.addEventListener('click', function () {
          var på = b.getAttribute('aria-pressed') === 'true';
          /* ⚠️ DEN SIDSTE DAG KAN IKKE SLÅS FRA. En kategori uden
             en eneste dag kan aldrig bestilles, og så ville
             ejeren have slukket den uden at kunne se hvorfor —
             fluebenet "Vis på kortet" er stedet at gøre det.
             Databasens CHECK afviser en tom liste, så uden det
             her ville han møde en rå SQL-fejl. */
          if (på && dage.querySelectorAll('.kat-dag.paa').length <= 1) return;
          b.classList.toggle('paa', !på);
          b.setAttribute('aria-pressed', på ? 'false' : 'true');
          visDageValg();
          /* Et tryk på en dag GEMMER (13/9). Autogem lytter efter
             change, og en knap fyrer ikke ét — så dagene var det ene
             på kategorien, der ventede på Gem. */
          /* Fra rullelisten, ikke fra hovedet: autogem lytter efter
             FELTERNES change — en hændelse fra en <div> gemte ingenting
             (fundet af prøven "dagene vælges med ét ord"). */
          (dageValg || h).dispatchEvent(new Event('change', { bubbles: true }));
        });
        dage.appendChild(b);
      });

      /* ⚠️ ÉT ORD FØRST, KNAPPERNE BAGEFTER  (13/9). Kundens ord: "det
         med en kategori skal gælde hele ugen eller nogen dage, eller
         kun hverdagen". Syv bogstaver (M T O T F L S) sagde ingenting.
         Rullelisten siger det med ord, og knapperne står stadig til
         "mandag til torsdag", som ingen af de tre ord kan sige. */
      dageValg = document.createElement('select');
      /* ⚠️ IKKE .smal-vaelger: den klasse ER afdelingsvælgeren for
         prøverne og for den, der fejlsøger — to vælgere med samme klasse
         i ét hoved er ét opslag, der rammer den forkerte. */
      dageValg.className = 'kat-valg kat-dage-valg';
      dageValg.id = 'kat-dage-valg-' + k.id;
      [['alle', 'Alle dage'], ['hverdage', 'Kun hverdage (man–fre)'],
        ['weekend', 'Kun weekend (lør–søn)'], ['egne', 'Egne dage']].forEach(function (p) {
        var o = document.createElement('option');
        o.value = p[0]; o.textContent = p[1];
        dageValg.appendChild(o);
      });
      dageValg.addEventListener('change', function () {
        if (dageValg.value === 'egne') return;
        var sat = dageSat(dageValg.value);
        dage.querySelectorAll('.kat-dag').forEach(function (b) {
          var på = sat.indexOf(Number(b.getAttribute('data-dag'))) !== -1;
          b.classList.toggle('paa', på);
          b.setAttribute('aria-pressed', på ? 'true' : 'false');
        });
      });
      visDageValg();
    }

    function visDageValg() {
      if (!dageValg) return;
      var t = dageVaerdi();
      dageValg.value = (t === 'alle' || t === 'hverdage' || t === 'weekend') ? t : 'egne';
    }

    /* Læser knapperne som personalet ser dem. */
    function dageVaerdi() {
      if (!dage) return null;
      var sat = [];
      dage.querySelectorAll('.kat-dag.paa').forEach(function (b) {
        sat.push(Number(b.getAttribute('data-dag')));
      });
      return sat.length ? dageTekst(sat) : 'alle';
    }

    /* ---- HVORNÅR PÅ DAGEN? ----

       Kundens ord (30/8): "morgenmad kun 10-12.30 og derefter alt
       andet ... man skal ikke kunne bestille en dagensret eller
       en burger klokken 10.00, det er først efter 12.30."

       ⚠️ INGEN SQL. Tiderne bor i indstillinger som
       kategori_tider — nøgle/værdi, præcis som
       bestilbare_kategorier. Kommer der en kolonne på
       menu_kategorier en dag, er det den, der skal læses; men
       ejeren skal kunne sætte tiderne i aften.

       ⚠️ TOMME FELTER = HELE DAGEN. Et 0 ville betyde midnat. */
    var tider = (Admin.data.indstillinger || {}).kategori_tider || {};
    var mine = tider[String(k.id)] || {};

    function tidFelt(id, etiket, vaerdi, type) {
      var boks = lav('div', 'kat-tid');
      var l = lav('label', null, etiket);
      l.setAttribute('for', id);
      var f = document.createElement('input');
      f.type = type || 'time';
      f.id = id;
      f.className = 'smal';
      if (type === 'number') { f.min = '0'; f.max = '1440'; f.step = '5'; f.placeholder = 'min.'; }
      f.value = vaerdi === undefined || vaerdi === null ? '' : String(vaerdi).slice(0, 5);
      boks.appendChild(l);
      boks.appendChild(f);
      return { boks: boks, felt: f };
    }

    var fra = tidFelt('kat-fra-' + k.id, 'Fra kl.', mine.fra);
    var til = tidFelt('kat-til-' + k.id, 'Til kl.', mine.til);
    var varsel = tidFelt('kat-varsel-' + k.id, 'Bestilles mindst (min. før)',
      mine.varsel_min, 'number');
    varsel.felt.placeholder = 'som resten';

    /* ⚠️ "HELE ÅBNINGSTIDEN" ER ET SVAR, IKKE TO TOMME FELTER  (13/9).
       Kundens ord: "hvad tid er meget uklart". To tomme klokkefelter
       lignede noget, der manglede at blive udfyldt. */
    var tidValg = document.createElement('select');
    tidValg.className = 'kat-valg kat-tid-valg';
    tidValg.id = 'kat-tid-valg-' + k.id;
    [['hele', 'Hele åbningstiden'], ['tidsrum', 'Kun et tidsrum']].forEach(function (p) {
      var o = document.createElement('option');
      o.value = p[0]; o.textContent = p[1];
      tidValg.appendChild(o);
    });
    tidValg.value = (mine.fra || mine.til) ? 'tidsrum' : 'hele';
    /* ⚠️ style.display OG IKKE hidden: .kat-tid har sin egen display,
       og en klasse med display slår browserens [hidden]. */
    function visTidsrum() {
      var t = tidValg.value === 'tidsrum';
      fra.boks.style.display = t ? '' : 'none';
      til.boks.style.display = t ? '' : 'none';
    }
    tidValg.addEventListener('change', function () {
      if (tidValg.value === 'hele') { fra.felt.value = ''; til.felt.value = ''; }
      visTidsrum();
    });
    visTidsrum();
    var tidBoks = lav('div', 'kat-tid');
    var tidEtiket = lav('label', null, 'Hvornår på dagen');
    tidEtiket.setAttribute('for', tidValg.id);
    tidBoks.appendChild(tidEtiket);
    tidBoks.appendChild(tidValg);

    var tidRaekke = lav('div', 'kat-tider');
    tidRaekke.appendChild(tidBoks);
    tidRaekke.appendChild(fra.boks);
    tidRaekke.appendChild(til.boks);
    tidRaekke.appendChild(varsel.boks);

    function saml() {
      var f = Butik.tjek.navn(navn.value, 'kategorinavn', 80);
      if (f) return f;
      var ud = {
        id: k.id, navn: navn.value, afdeling: vælger.value, note: note.value,
        sortering: k.sortering, aktiv: k.aktiv,
      };
      // undefined = rør ikke kolonnen. Se noten i js/store-skriv.js.
      if (dage) ud.dage = dageVaerdi();

      /* ⚠️ HELE KORTET SKRIVES, IKKE KUN MIN RÆKKE. kategori_tider
         er ÉN indstilling med alle kategorier i; skrev vi kun
         min, ville de andres tider blive tørret af. */
      var alleTider = {};
      Object.keys(tider).forEach(function (id) { alleTider[id] = tider[id]; });
      var min = {};
      if (fra.felt.value) min.fra = fra.felt.value;
      if (til.felt.value) min.til = til.felt.value;
      if (varsel.felt.value.trim() !== '') min.varsel_min = Number(varsel.felt.value);
      if (Object.keys(min).length) alleTider[String(k.id)] = min;
      else delete alleTider[String(k.id)];

      return Butik.skrive.kategori(ud).then(function () {
        return Butik.skrive.indstilling('kategori_tider', alleTider);
      });
    }

    var gem = lav('button', 'knap', 'Gem');
    gem.addEventListener('click', function () {
      var svar = saml();
      if (typeof svar === 'string') return Admin.brøl(svar);
      Admin.gem(svar, navn.value + ' er gemt.');
    });

    h.appendChild(navn);
    h.appendChild(vælger);
    if (dage) {
      var dageLinje = lav('div', 'kat-dage-linje');
      var dl = lav('label', null, 'Hvilke dage');
      dl.setAttribute('for', dageValg.id);
      dageLinje.appendChild(dl);
      dageLinje.appendChild(dageValg);
      dageLinje.appendChild(dage);
      h.appendChild(dageLinje);
    }
    h.appendChild(flytKnapper(k, alle, 'kategori'));
    h.appendChild(gem);
    h.appendChild(note);
    h.appendChild(tidRaekke);

    /* ⚠️ AUTOGEM PÅ HOVEDET, IKKE PÅ HELE FANEN. "Alt gemmes
       automatisk, mens du skriver" står i kundens billeder, og en
       medarbejder, der retter en kategori kl. 11.55 og går, har
       ellers rettet ingenting.

       Roden er KORTET (h) og ikke en boks, der tegnes om — se
       noten ved Admin.autogem: hænger mærket på noget, der
       genopbygges, rives det ned under fingeren. */
    Admin.autogem(h, saml);

    var varer = (Admin.data.menu_varer || [])
      .filter(function (v) { return v.kategori_id === k.id; });
    if (!varer.length) {
      var slet = lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!window.confirm('Slet kategorien "' + k.navn + '"?')) return;
        Admin.gem(Butik.skrive.sletKategori(k.id), k.navn + ' er slettet.');
      });
      h.appendChild(slet);
    }

    return h;
  }

  /* ---- OP OG NED ----

     Rækkefølgen på gæstesiden er kolonnen sortering, og den kunne
     kun sættes ved at oprette varen i den rigtige orden. Fik
     ejeren en ny ret, lå den nederst for evigt.

     De to rækker BYTTER tal. Det er med vilje ikke "sæt alle
     sorteringer om": to skrivninger i stedet for fjorten, og
     ingen anden række rykker sig, mens man kigger. Har to rækker
     samme tal — og det har de, hvis de er oprettet i SQL med
     sortering 0 — får de to nye, der ligger et tal fra hinanden,
     så byttet faktisk kan ses. */
  function flytKnapper(r, alle, slags) {
    var boks = lav('span', 'flyt');
    var plads = alle.map(function (x) { return String(x.id); }).indexOf(String(r.id));

    [['↑', -1, 'Flyt op'], ['↓', 1, 'Flyt ned']].forEach(function (p) {
      var knap = lav('button', 'knap lille', p[0]);
      knap.type = 'button';
      knap.title = p[1] === -1 ? 'Flyt op' : 'Flyt ned';
      knap.setAttribute('aria-label', p[2] + ': ' + r.navn);
      var nabo = alle[plads + p[1]];
      var retning = p[1];
      if (!nabo) knap.disabled = true;
      knap.addEventListener('click', function () { byt(r, nabo, slags, retning); });
      boks.appendChild(knap);
    });
    return boks;
  }

  function byt(a, b, slags, retning) {
    var sa = Number(a.sortering) || 0;
    var sb = Number(b.sortering) || 0;
    /* a får b's tal og b får a's. Det virker kun, hvis de to tal
       er forskellige — og to rækker oprettet i SQL har begge
       sortering 0. Så laves der plads, og RETNINGEN afgør hvilken
       vej: skal a op, skal a ende med det MINDSTE tal, altså skal
       b's tal være det mindste af de to nu.

       Første udgave regnede det ud af tallene selv (sa <= sb) og
       ramte derfor altid "ned", uanset hvilken pil man trykkede
       på. Fanget af prøven "to varer med samme sortering kan
       stadig bytte plads" — den var skrevet netop til det. */
    if (sa === sb) { sa = sb + (retning < 0 ? 1 : -1); }
    var skriv = slags === 'kategori' ? Butik.skrive.kategori : Butik.skrive.vare;
    Admin.gem(Promise.all([
      skriv(Object.assign({}, a, { sortering: sb })),
      skriv(Object.assign({}, b, { sortering: sa })),
    ]), a.navn + ' er flyttet.');
  }

  function nyKategoriFelt(alle) {
    var boks = lav('div', 'menu-gruppe ny-kategori');
    boks.appendChild(lav('div', 'eyebrow', 'Ny kategori'));
    boks.appendChild(lav('p', 'hjaelp',
      'En kategori er en overskrift på menukortet — "Burgere", '
      + '"Vinterretter". Afdelingen bestemmer, hvor på menukortet den står.'));
    /* ⚠️ HVOR HAVNER DEN SÅ? (16/9) Ejerens ord: når han tilføjer
       noget, skal han vide, "hvor skal den stå henne på forsiden i
       rækkefølgen". MÅLT: en ny kategori får højeste sortering + 1 og
       står på INGEN af de tre salgslister — altså nederst på
       menukortet og slet ikke i bestillingen. Det er den rigtige
       standard (en tom kategori må ikke stå til salg), men det stod
       ingen steder, og så leder man efter den på forsiden. */
    boks.appendChild(lav('p', 'hjaelp',
      'Den lægger sig NEDERST på menukortet under sin afdeling, og den kan '
      + 'ikke bestilles endnu: den står under "Kun på menukortet", til I '
      + 'sætter fluebenene "Kan bestilles". Rækkefølgen flytter I med pilene '
      + '— på forsiden står kategorierne i den samme rækkefølge som her.'));

    var r = lav('div', 'admin-raekke');
    var navn = document.createElement('input');
    navn.type = 'text'; navn.className = 'navn'; navn.id = 'ny-kategori-navn';
    navn.setAttribute('aria-label', 'Navn på ny kategori');
    navn.placeholder = 'Fx Vinterretter'; navn.maxLength = 80;

    var vælger = document.createElement('select');
    vælger.className = 'smal-vaelger'; vælger.id = 'ny-kategori-afd';
    vælger.setAttribute('aria-label', 'Afdeling for den nye kategori');
    [['mad', 'Mad'], ['is', 'Is'], ['drikke', 'Drikkevarer']].forEach(function (p) {
      var o = document.createElement('option');
      o.value = p[0]; o.textContent = p[1];
      vælger.appendChild(o);
    });

    /* Dagevælgeren står her OGSÅ, når kolonnen findes. En kategori,
       der først skal oprettes og så åbnes igen for at sættes til
       hverdage, er to arbejdsgange, hvor der er brug for én. */
    var dage = null;
    if (maaDage()) {
      dage = document.createElement('select');
      dage.className = 'smal-vaelger'; dage.id = 'ny-kategori-dage';
      dage.setAttribute('aria-label', 'Hvilke dage laves den nye kategori');
      Object.keys(DAGE_NAVNE).forEach(function (n) {
        var o = document.createElement('option');
        o.value = n; o.textContent = DAGE_NAVNE[n];
        dage.appendChild(o);
      });
    }

    var knap = lav('button', 'knap tilfoej', '+ Tilføj kategori');
    knap.type = 'button';
    knap.addEventListener('click', function () {
      var f = Butik.tjek.navn(navn.value, 'kategorinavn', 80);
      if (f) return Admin.brøl(f);
      var højeste = alle.reduce(function (m, k) {
        return Math.max(m, Number(k.sortering) || 0);
      }, 0);
      var ud = {
        navn: navn.value, afdeling: vælger.value, sortering: højeste + 1,
      };
      if (dage) ud.dage = dageVaerdi();
      Admin.gem(Butik.skrive.kategori(ud), navn.value + ' er oprettet.');
    });

    navn.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      knap.click();
    });

    r.appendChild(navn);
    r.appendChild(vælger);
    if (dage) r.appendChild(dage);
    r.appendChild(knap);
    boks.appendChild(r);
    return boks;
  }

  /* ---- HVAD KAN BESTILLES UD AF HUSET? ----

     Smørrebrødet kan altid — det er dét, bestillingssiden er
     bygget om. Resten af kortet kun hvis personalet siger ja her.

     Fluebenet er ejerens beslutning, ikke en indstilling i koden:
     den dag køkkenet kan nå at lave pølser ud af huset, er det ét
     tryk. Og lige så vigtigt den anden vej — er fluebenet ikke
     sat, står der ikke ét ord om det på gæstesiden.

     Kun varer MED pris kommer med på siden, så en kategori uden
     priser gør ingen skade: linjen siger det højt i stedet. */
  function kanBestilles(k) {
    /* ⚠️ ISEN HAR SINE TRE FLUEBEN NU (15/9). Her stod "Isen bestilles
       ikke" i stedet for fluebenene — ejeren vendte den: *"på
       bestillingen skal der være is"*. Gæstesiden har ingen særregel
       for is længere (se Butik.udvalg), så et flueben her gør præcis,
       hvad det siger. */

    /* ⚠️ SMØRREBRØDET KENDES PÅ BUTIK.SMOERREBROED, IKKE PÅ EN REGEX
       HER (13/9). Her stod /smørrebrød|fyld/ — og "Håndmadder" står
       ikke i den, så den stod med et tomt flueben, mens den ALTID er
       på smørrebrødssiden. Reglen bor ét sted. */
    var boks = lav('div', 'kan-bestilles-boks');
    boks.appendChild(lav('span', 'kan-bestilles-titel', 'Sælges:'));

    /* ⚠️ TRE STEDER, ÉT FLUEBEN HVER  (14/9). Kundens ord: "det hele
       skal bare kunne administreres — og også, hvis kun noget af det
       gælder det ene eller det andet sted". Smørrebrødet stod med et
       LÅST flueben på forsiden og havde intet til smørrebrødssiden;
       nu sættes hver kategori til og fra hvert sted for sig.

       ⚠️ FØRSTE TRYK SKRIVER HELE LISTEN, som bordets har gjort siden
       13/9. Uden en egen liste er stedets svar det, det var i går
       (Butik.salgsKategorier), og kun den rørte kategori skifter. */
    function sted(id, feltId, tekst, noegle, ekstra) {
      var r = lav('label', 'afkryds kan-bestilles');
      var f = document.createElement('input');
      f.type = 'checkbox';
      f.id = feltId;
      f.checked = saelgesHer(k, id);
      f.addEventListener('change', function () {
        var nu = stedListe(id).filter(function (x, n, alle) {
          return x !== Number(k.id) && alle.indexOf(x) === n;
        });
        if (f.checked) nu.push(Number(k.id));
        var skriv = [Butik.skrive.indstilling(noegle, nu)];
        if (ekstra) skriv.push(ekstra(nu));
        Admin.gem(Promise.all(skriv), f.checked
          ? k.navn + ' kan nu bestilles på ' + STED_NAVN[id] + '.'
          : k.navn + ' kan ikke længere bestilles på ' + STED_NAVN[id] + '.');
      });
      r.appendChild(f);
      r.appendChild(lav('span', null, tekst));
      boks.appendChild(r);
    }
    sted('smoer', 'bestilbar-smoer-' + k.id, 'Smørrebrødssiden (ud af huset)',
      'bestilbare_kategorier_smoer');
    /* ⚠️ FORSIDEN SKRIVER OGSÅ DEN GAMLE LISTE (bestilbare_kategorier,
       uden smørrebrødet), så de filer, der stadig læser den —
       aabn-kortet.sql, klar-til-lancering.sql — ikke står med et
       forældet svar. Gæstesiden læser den nye. */
    sted('forside', 'bestilbar-' + k.id, 'Forsidens bestilling',
      'bestilbare_kategorier_forside', function (nu) {
        var sm = smoerIds();
        return Butik.skrive.indstilling('bestilbare_kategorier',
          nu.filter(function (x) { return sm.indexOf(x) === -1; }));
      });
    sted('bord', 'bestilbar-bord-' + k.id, 'QR-koden ved bordene',
      'bestilbare_kategorier_bord');

    /* ⚠️ ØVERST PÅ BESTILLINGEN — NÅR PÅ DAGEN  (16/9). Ejerens ord:
       "om morgenen er morgenmaden øverst … om eftermiddagen smørrebrød
       … aften er det aftensmad". Hvert flueben lægger kategorien i
       kategori_dagsdel; reglen, der bruger listen, er Butik.dagsdelRang
       (forsiden og QR-siden). Et flueben skriver HELE listen, som
       stederne ovenfor gør. */
    var g = Butik.dagsdelGraenser ? Butik.dagsdelGraenser(Admin.data) : { frokost: '11:00', aften: '16:00' };
    function kl(x) { return Butik.klokken(x, 'kort'); }
    var dele = lav('div', 'kan-bestilles-boks dagsdel-boks');
    dele.appendChild(lav('span', 'kan-bestilles-titel', 'Øverst på bestillingen:'));
    [['morgen', 'om morgenen (til kl. ' + kl(g.frokost) + ')'],
     ['frokost', 'til frokost (kl. ' + kl(g.frokost) + '–' + kl(g.aften) + ')'],
     ['aften', 'om aftenen (fra kl. ' + kl(g.aften) + ')']].forEach(function (par) {
      var r = lav('label', 'afkryds kan-bestilles');
      var f = document.createElement('input');
      f.type = 'checkbox';
      f.id = 'dagsdel-' + k.id + '-' + par[0];
      f.checked = Butik.dagsdelFor(Admin.data, k.id).indexOf(par[0]) !== -1;
      f.addEventListener('change', function (e) {
        if (e) e.stopPropagation();
        var alle = Object.assign({}, (Admin.data.indstillinger || {}).kategori_dagsdel || {});
        var nu = Butik.dagsdelFor(Admin.data, k.id).filter(function (x) { return x !== par[0]; });
        if (f.checked) nu.push(par[0]);
        if (nu.length) alle[String(k.id)] = nu; else delete alle[String(k.id)];
        Admin.gem(Butik.skrive.indstilling('kategori_dagsdel', alle), f.checked
          ? k.navn + ' står øverst ' + par[1].split(' (')[0] + '.'
          : k.navn + ' står ikke længere øverst ' + par[1].split(' (')[0] + '.');
      });
      r.appendChild(f);
      r.appendChild(lav('span', null, par[1]));
      dele.appendChild(r);
    });
    var hele = lav('div', null);
    hele.appendChild(boks);
    hele.appendChild(dele);
    return hele;
  }

  /* ---- SAMME PRIS PÅ HELE KATEGORIEN ----

     Model A: hvert fyld er en vare med sin egen pris, og gæsten
     bestiller "2 × rejemad". Men de 29 priser skal ind i systemet
     FØRSTE gang, og starter man med samme pris på alle og retter de
     få, der skiller sig ud, er det ét tal og et par rettelser i
     stedet for 29 felter.

     Genvejen stod kun på fyldet. Med ejerens fulde sortiment inde
     er den lige så meget værd på syv pølser og seks burgere, og
     kategorien er kategorien: der er ikke noget særligt ved fyld,
     ud over at det var det første, vi mødte.

     Tallet kommer fra ejeren — feltet står tomt, og der er ingen
     foreslået pris: en pris, siden ikke har fået af forretningen,
     må ikke stå på den. Derfor står der heller ikke noget i
     pladsholderen ud over formatet.

     STANDARDEN ER AT UDFYLDE, IKKE AT OVERSKRIVE. Har ejeren
     allerede skrevet 45 på tre af dem, må et tryk her ikke tage de
     tre med sig — de var det eneste, nogen havde bekræftet. De
     andre skal krydses af med vilje. */
  function samlePris(k, varer) {
    var uden = varer.filter(udenPris);

    /* ⚠️ ER DER INGEN HULLER, ER KASSEN I VEJEN (27/8).

       Genvejen stod åben på HVER kategori — også dem, hvor alle
       varer havde en pris. MÅLT på Menukort-fanen: en grå kasse
       på fire linjer pr. kategori, hvoraf de fleste sagde "Alle 3
       har en pris og kan bestilles" og tilbød at overskrive dem.

       Det modsiger genvejens egen regel to linjer nede — at den
       UDFYLDER og ikke overskriver — og med 21 kategorier er det
       21 kasser, man ruller forbi for at nå varerne.

       Den forsvinder ikke: en generel prisstigning på syv pølser
       er et rigtigt ærinde. Den er bare foldet, når der ikke er
       noget hul at fylde. */
    var lukket = !uden.length;
    var boks = lav(lukket ? 'details' : 'div', 'samle-pris');
    var hoved = lukket ? lav('summary', 'eyebrow', 'Sæt samme pris på alle ' + varer.length)
      : lav('div', 'eyebrow', 'Sæt samme pris på alle');
    boks.appendChild(hoved);
    boks.appendChild(lav('p', 'hjaelp', uden.length
      ? uden.length + ' af ' + varer.length + ' mangler en pris og kan ikke bestilles endnu — '
        + 'de kan kun ønskes. Sæt en pris, så bliver de rigtige varer.'
      : 'Alle ' + varer.length + ' har en pris. Herinde kan de sættes til det samme tal '
        + 'på én gang — fx ved en prisstigning.'));

    var række = lav('div', 'felt-par');
    var felt = document.createElement('input');
    felt.type = 'number';
    /* Id pr. kategori. Det hed 'fyld-samlepris' dengang værktøjet
       kun stod ét sted; med det navn på 21 kategorier ville
       document.getElementById ramme den første, og et felt uden et
       entydigt id kan hverken prøves eller fejlsøges. */
    felt.id = 'samlepris-' + k.id;
    felt.setAttribute('aria-label', 'Samme pris på alle varer i ' + k.navn);
    felt.min = '0';
    felt.step = '0.5';
    felt.placeholder = 'fx 45';

    var retAlle = null;
    if (uden.length && uden.length < varer.length) {
      var mærkat = lav('label', 'afkryds');
      retAlle = document.createElement('input');
      retAlle.type = 'checkbox';
      retAlle.id = 'samlepris-alle-' + k.id;
      mærkat.appendChild(retAlle);
      mærkat.appendChild(document.createTextNode('Ret også de '
        + (varer.length - uden.length) + ', der har en pris'));
      boks.appendChild(mærkat);
    }

    function mål() {
      if (!uden.length) return varer;                  // der er ikke andet at gøre
      return (retAlle && retAlle.checked) ? varer : uden;
    }

    var knap = lav('button', 'knap sekundaer', '');
    knap.type = 'button';
    function skrivKnap() {
      var n = mål().length;
      knap.textContent = n === varer.length ? 'Sæt på alle ' + n
        : (n === 1 ? 'Sæt på den ene uden pris' : 'Sæt på de ' + n + ' uden pris');
    }
    skrivKnap();
    if (retAlle) retAlle.addEventListener('change', skrivKnap);

    knap.addEventListener('click', function () {
      var v = felt.value.trim();
      var tal = Number(v);
      if (v === '' || !isFinite(tal) || tal < 0 || tal >= 10000) {
        return Admin.brøl('Skriv en pris mellem 0 og 10.000.');
      }
      var liste = mål();
      var overskriver = liste.filter(function (x) { return !udenPris(x); }).length;
      if (!confirm('Sæt prisen ' + tal + ' kr. på ' + liste.length + ' varer i "'
        + k.navn + '"?'
        + (overskriver ? '\n\n' + overskriver + ' af dem har en pris i forvejen, '
          + 'og den bliver overskrevet.' : '')
        + '\n\nDe, der skiller sig ud, kan rettes enkeltvis bagefter.')) return;

      /* Én ad gangen mod databasen — der findes ikke et kald, der
         retter mange rækker med hver sin id, og 29 kald er få nok
         til at det ikke er værd at bygge et. Der ventes på dem
         alle, så genindlæsningen viser det færdige resultat. */
      Admin.gem(Promise.all(liste.map(function (vare) {
        delete skrevet[vare.id];        // genvejen vinder over det skrevne
        return Butik.skrive.vareFelter(vare.id, { pris: tal });   // se vareFelter (15/9)
      })), 'Prisen ' + tal + ' kr. står nu på ' + liste.length + ' varer i ' + k.navn + '.');
    });

    var f1 = lav('div', 'felt');
    f1.appendChild(felt);
    var f2 = lav('div', 'felt');
    f2.appendChild(knap);
    række.appendChild(f1);
    række.appendChild(f2);
    boks.appendChild(række);
    return boks;
  }

  /* ⚠️ TO VARER MED SAMME NAVN KAN IKKE SKELNES  (13/9). Målt i
     produktionen: "Kage" til 30 kr. under Kaffe OG "Kage" til 10 kr.
     under Tapasfad. Bonen siger "2 × Kage" uden at sige hvilken, og
     databasens udsolgt-værn slår op på NAVNET: melder køkkenet den
     ene udsolgt, kan den stadig bestilles, fordi den anden holder
     navnet i live. Samme grund som ", håndmad" fik 1/9. */
  function kategoriNavnFor(id) {
    var k = (Admin.data.menu_kategorier || []).filter(function (x) {
      return String(x.id) === String(id);
    })[0];
    return k ? k.navn : '';
  }
  function navnetFindes(navn, ikkeId) {
    var n = String(navn || '').trim().toLowerCase();
    if (!n) return null;
    return (Admin.data.menu_varer || []).filter(function (v) {
      return v.id !== ikkeId && String(v.navn || '').trim().toLowerCase() === n;
    })[0] || null;
  }
  function dobbeltNavn(navn, anden, katId) {
    var der = kategoriNavnFor(anden.kategori_id);
    var her = kategoriNavnFor(katId);
    return 'Der findes allerede en vare, der hedder "' + anden.navn + '"'
      + (der ? ' (under ' + der + ')' : '') + '. Giv den et navn, der kan '
      + 'kendes fra den' + (her ? ' — fx "' + String(navn).trim() + ' til '
      + her.toLowerCase() + '"' : '') + '. Ellers kan køkkenet ikke se '
      + 'forskel på bonen.';
  }

  function varerække(v, alle) {
    /* Klassen på RÆKKEN og ikke en :has()-vælger i stilarket: den
       udsolgte tilstand skal kunne ses i opmærkningen, både af en
       prøve og af den, der fejlsøger i en konsol. */
    var r = lav('div', 'admin-raekke vare-raekke'
      + (v.udsolgt ? ' udsolgt-vare' : ''));
    r.setAttribute('data-vare', v.id);

    var navn = document.createElement('input');
    navn.type = 'text'; navn.className = 'navn'; navn.value = v.navn; navn.maxLength = 120;
    navn.setAttribute('aria-label', 'Navn på varen ' + v.navn);

    var pris = document.createElement('input');
    pris.type = 'text'; pris.className = 'smal'; pris.inputMode = 'decimal';
    pris.placeholder = 'kr.';
    pris.setAttribute('data-pris', v.id);
    pris.setAttribute('aria-label', 'Pris på ' + v.navn);
    /* Har personalet skrevet et tal, der endnu ikke er gemt, står
       DET i feltet — ikke databasens tomme felt. Ellers ville et
       gem på en anden række tørre de øvrige felter af, og de tal
       er tastet af et menneske, der kigger i en mappe. */
    pris.value = Object.prototype.hasOwnProperty.call(skrevet, v.id)
      ? skrevet[v.id] : visPris(v);
    if (!pris.value) pris.classList.add('mangler');

    pris.addEventListener('input', function () {
      if (sammePris(pris.value, visPris(v))) delete skrevet[v.id];
      else skrevet[v.id] = pris.value;
      pris.classList.toggle('mangler', !pris.value.trim());
      /* Panelet øverst tæller det skrevne og styrer Gem-knappen.
         Det tegnes for sig, så markøren bliver stående i feltet —
         hele fanen tegnet om ved hvert tastetryk ville tage feltet
         væk under fingeren. */
      friskPrisPanel();
    });

    /* BESKRIVELSEN KUNNE IKKE RETTES.

       Den blev sendt uændret med hver gang varen blev gemt —
       beskrivelse: v.beskrivelse — så teksten under varenavnet på
       gæstesiden kunne kun skrives i SQL. Det er den ene sætning,
       der sælger retten, og den var låst for den, der laver maden.

       Den står på sin egen linje under navnet og ikke som en
       kolonne mere: en fjerde kolonne ville presse felterne
       sammen til ingenting på en iPad. */
    var tekst = document.createElement('input');
    tekst.type = 'text'; tekst.className = 'vare-tekst-felt';
    tekst.setAttribute('aria-label', 'Beskrivelse af ' + v.navn);
    tekst.value = v.beskrivelse || '';
    tekst.maxLength = 400;
    tekst.placeholder = 'Beskrivelse';

    /* ---- FÅ TILBAGE ----

       Kundens billeder (26/8). Tallet er FRIVILLIGT: tomt betyder
       ingen tælling, og det er stadig det rigtige for en pølse,
       køkkenet laver i det uendelige.

       ⚠️ TALLET TÆLLES NED AF DATABASEN, ikke af et menneske. Det
       var hele indvendingen mod feltet, dengang det ikke var
       bygget: et tal, personalet tæller ned i hånden, bliver
       forkert i løbet af en frokost. Bremsen ligger i
       supabase/menukort-antal-og-dage.sql, og feltet her er kun
       til at SÆTTE tallet. */
    var antal = null;
    var antalRørt = false;
    if (maaAntal()) {
      antal = document.createElement('input');
      antal.type = 'text'; antal.className = 'smal';
      antal.setAttribute('aria-label', 'Antal tilbage af ' + v.navn);
      antal.inputMode = 'numeric';
      antal.placeholder = 'Få tilbage';
      antal.setAttribute('aria-label', 'Hvor mange er der tilbage af ' + v.navn);
      antal.setAttribute('data-antal', v.id);
      antal.value = v.antal_tilbage === null || v.antal_tilbage === undefined
        ? '' : String(v.antal_tilbage);
      /* ⚠️ ET TAL I ET FELT ER IKKE EN ADVARSEL. "3" ser ud som
         enhver anden værdi, og med 242 rækker ruller man forbi
         den. Feltet farves, når der er få tilbage — samme grænse
         som gæstesidens "Kun N tilbage", så de to ikke kan komme
         til at sige noget forskelligt. */
      if (faaTilbage(v)) antal.className += ' antal-faa';
      else if (antalAf(v) === 0) antal.className += ' antal-tom';
      /* ⚠️ ET FLAG, IKKE defaultValue. Første udgave sammenlignede
         antal.value med antal.defaultValue — og defaultValue er
         HTML-attributten, som ikke sættes af at skrive til .value
         i JavaScript. Den var altså tom, "10" !== "" var altid
         sandt, og tallet blev sendt med hver eneste gang.

         Målt: databasen talte ned til 2, mens fanen stod åben, et
         gem på NAVNET skrev 10 tilbage — og køkkenet lovede otte
         portioner, der ikke fandtes. js/admin/forside.js har gjort
         det med et flag hele tiden; det er den samme regel. */
      antal.addEventListener('input', function () { antalRørt = true; });
      antal.addEventListener('change', function () { antalRørt = true; });
    }

    /* ---- FAVORIT OG VIS ER TEGN, IKKE AFKRYDSNINGSFELTER ----

       MÅLT: med "☐ Favorit ☑ Vis" som tekst blev rækken 1106 px
       bred i et felt på 1012, og hver eneste af de 242 rækker brød
       om til to linjer. Et kort, man skal rulle dobbelt så langt
       igennem, er ikke det overblik, kunden bad om (26/8).

       De to er heller ikke dagligt arbejde — de ændres et par
       gange om året, hvor udsolgt ændres flere gange om dagen.
       Et tegn med en forklaring i title er nok til det.

       ⚠️ DE ER STADIG <input type=checkbox>. Kun etiketten er
       skjult for øjet: skærmlæseren læser den som før, og
       tastaturet rammer feltet som før. Et <div> med en klasse
       ville have taget begge dele væk. */
    function hakMed(mærke, sat, tegn, forklaring) {
      var i = document.createElement('input');
      i.type = 'checkbox'; i.checked = !!sat;
      var l = lav('label', 'afkryds hak-tegn');
      l.title = forklaring;
      l.appendChild(i);
      l.appendChild(lav('span', 'hak-ikon', tegn));
      l.appendChild(lav('span', 'kun-skaerm', mærke));
      return { felt: i, mærkat: l };
    }

    /* ---- ET BILLEDE PR. VARE  (31/8) ----

       Kundens ord: *"du skal gøre, så hver en ting har billede,
       som de selv kan lægge ind i admin — og priser og udsolgt
       eller andet."* Prisen og udsolgt har han kunnet styre siden
       24/8; billedet var det, der manglede, og det er dét, der
       afgør, om en gæst ved bordet tør bestille noget, hun ikke
       kender navnet på.

       ⚠️ DET ER EN 44 PX FLISE, IKKE ET FELT. Med 242 varer ville
       en uploadrække pr. vare gøre kortet dobbelt så langt at
       rulle igennem — og billedet sættes én gang, hvor prisen og
       udsolgt ændres hele tiden. Flisen ER knappen: har varen et
       foto, står det i den; har den ikke, står en stiplet ＋.

       ⚠️ OG DEN GEMMER MED DET SAMME, som udsolgt-knappen. Et
       foto er ikke noget, man skriver gradvist — det er valgt
       eller ikke valgt, og et gem, der venter, er et foto,
       ejeren tror er lagt op.

       ⚠️ SAMME KOMPRIMERING OG SAMME SPAND SOM NYHEDERNE
       (Butik.skrive.nyhedBillede). En ny spand er fire
       adgangsregler, ejeren skal oprette i dashboardet i hånden —
       og indtil han gjorde det, kunne der ikke lægges ét billede
       op, uden at nogen kunne se hvorfor. */
    var nytBillede;                      // undefined = rør det ikke
    var billedFlise = null;
    if (maaBillede()) {
      billedFlise = lav('label', 'vare-foto');
      /* Fotoet vises KUN ved QR-bestillingen ved bordene (13/9) —
         det skal stå på flisen, ellers leder ejeren efter det på
         forsiden. */
      /* ⚠️ OG "TAG DET PÅ TVÆRS" STÅR PÅ FLISEN (16/9). Ejerens ord:
         billederne skal tages med telefonen "sidelæns", og så skal
         beskæringen bare være i orden. Den ER i orden — hvert foto
         skæres til 16:9 om midten — men et billede på højkant mister
         to tredjedele, og det opdager man først, når det står på
         rækken ved bordet. Et ord her koster ingenting. */
      billedFlise.title = 'Billede af ' + v.navn
        + ' — tag det på tværs (16:9). Vises kun, når gæsten bestiller '
        + 'med QR-koden ved bordet; et foto på højkant bliver beskåret '
        + 'om midten.';
      var fotoUrl = String(v.billede || '').trim();

      var visFoto = lav('span', 'vare-foto-flade');
      function tegnFoto(url) {
        visFoto.textContent = '';
        visFoto.style.backgroundImage = url ? 'url("' + url + '")' : '';
        billedFlise.classList.toggle('har-foto', !!url);
        if (!url) visFoto.textContent = '＋';
      }
      tegnFoto(fotoUrl);

      var fil = document.createElement('input');
      fil.type = 'file';
      fil.accept = 'image/*';
      fil.className = 'kun-skaerm';
      fil.setAttribute('aria-label', 'Vælg billede af ' + v.navn);
      fil.addEventListener('change', function () {
        var f = fil.files && fil.files[0];
        if (!f) return;
        visFoto.textContent = '…';
        /* ⚠️ 640 PX, IKKE NYHEDERNES 1600 (12/9). Kundens ord: "så de
           kan uploade 16:9 billeder i småt format, så det passer på
           telefon". Varefotoet står som et lille 16:9-billede på
           rækken ved bordet — under 100 px bredt — og der er op til
           242 rækker. 640 × 360 er tre gange skarpere end skærmen
           kræver og en brøkdel af vægten; 1600 px pr. vare ville være
           megabytes over mobildata for billeder på størrelse med et
           frimærke. Beskæringen til 16:9 er den samme som nyhedernes. */
        Butik.skrive.nyhedBillede(f, 'midt', 640).then(function (url) {
          nytBillede = url;
          tegnFoto(url);
          return Admin.gem(byg(false), 'Billedet af ' + navn.value + ' er lagt op.');
        }).catch(function (e) {
          tegnFoto(fotoUrl);
          Admin.brøl(Admin.forklarFejl ? Admin.forklarFejl(e) : (e.message || String(e)));
        });
        fil.value = '';
      });

      billedFlise.appendChild(visFoto);
      billedFlise.appendChild(fil);
    }

    var favorit = hakMed('Favorit', v.fremhaevet, '★',
      'Favorit — fremhæves på menukortet');
    var vis = hakMed('Vis', v.aktiv !== false, '👁',
      'Vis på kortet. Tages hakket af, forsvinder varen helt — '
      + 'brug det, når den er væk i en periode.');

    /* ---- UDSOLGT ER EN KNAP, IKKE ET FLUEBEN ----

       Kundens billeder: "Udsolgt?" står som en åben knap, og en
       udsolgt vare bliver til en fyldt rød "UDSOLGT ✕".

       Det er mere end pynt. Udsolgt skifter flere gange om dagen —
       det er den hyppigste handling på hele fanen — og et flueben
       på 12 px ved siden af to andre flueben er et lille mål med
       fedtede fingre. Knappen er hele rækkens højde.

       ⚠️ DEN GEMMER MED DET SAMME. Et tryk på "udsolgt" er en
       besked til gæsterne om, at maden er væk NU; ventede den på
       et gem, ville en gæst nå at bestille imens. */
    var erUdsolgt = !!v.udsolgt;
    var udsolgtKnap = lav('button', 'udsolgt-knap' + (erUdsolgt ? ' er-udsolgt' : ''));
    udsolgtKnap.type = 'button';
    udsolgtKnap.textContent = erUdsolgt ? 'UDSOLGT ✕' : 'Udsolgt?';
    udsolgtKnap.setAttribute('aria-pressed', erUdsolgt ? 'true' : 'false');
    udsolgtKnap.setAttribute('data-udsolgt', v.id);
    /* ⚠️ TEKSTEN HER ER FLYTTET FRA ET AFSNIT ØVERST PÅ FANEN.
       Den stod som prosa nr. 3 ud af tre og blev læst af ingen.
       Den hører til på knappen: udsolgt afvises også i DATABASEN,
       så en gæst, der åbnede kortet for fem minutter siden, ikke
       kan nå at bestille alligevel. */
    udsolgtKnap.title = erUdsolgt
      ? 'Tryk for at sætte ' + v.navn + ' til salg igen'
      : 'Meld ' + v.navn + ' udsolgt. Den forsvinder fra kortet med det '
        + 'samme, og bestillinger fra en telefon, der havde kortet åbent '
        + 'i forvejen, bliver også afvist.';
    udsolgtKnap.addEventListener('click', function () {
      erUdsolgt = !erUdsolgt;
      Admin.gem(byg(false), navn.value + (erUdsolgt ? ' er meldt udsolgt.' : ' er til salg igen.'));
    });

    /* ⚠️ PRISFELTET GEMMES KUN AF PRISMOTOREN — aldrig af autogem
       og aldrig som en sidegevinst ved en anden handling.

       Autogem skriver 1,2 sekund efter sidste tastetryk. Skriver
       ejeren "150" i tre anslag med en prisliste i hånden, ville
       den nå at gemme "1" undervejs — og en burger til 1 krone
       står LIVE på hjemmesiden, til næste ciffer er tastet. En
       gæst kan nå at bestille den.

       Prisen har derfor sin egen vej ind: det skrevne huskes i
       skrevet{} på tværs af optegninger, og ÉN knap (eller Enter)
       gemmer dem alle. Den vej er uændret. Alt andet herinde
       sender DATABASENS pris med, så et gem på beskrivelsen ikke
       kan komme til at flytte et tal, ingen var færdig med.

       Det holder også to løfter, prøverne stiller: det skrevne
       overlever, at en anden række gemmes, og én forkert pris
       standser hele gemningen. */
    function byg(brugFeltetsPris) {
      var ud = {
        id: v.id,
        kategori_id: v.kategori_id,
        navn: navn.value,
        beskrivelse: tekst.value,
        pris: brugFeltetsPris ? pris.value : visPris(v),
        fremhaevet: favorit.felt.checked,
        udsolgt: erUdsolgt,
        aktiv: vis.felt.checked,
        sortering: v.sortering,
      };
      /* ⚠️ KUN NÅR NOGEN HAR RØRT FELTET. Ellers ville et gem midt
         i en frokost skrive morgenens tal tilbage — databasen har
         talt ned imens. Samme regel som dagens rets antal. */
      if (antal && antalRørt) ud.antal_tilbage = antal.value;
      /* ⚠️ KUN NÅR NOGEN HAR RØRT DET. `undefined` betyder "lad
         det være" — var linjen ubetinget, ville et gem på en PRIS
         tømme billedet på den vare, uden en linje om det nogen
         steder. Samme lov som antallet lige ovenfor, som bordets
         nøgle og som arrangementets foto. */
      if (nytBillede !== undefined) ud.billede = nytBillede;

      /* ⚠️ KUN DET, DER ER ÆNDRET PÅ DENNE SKÆRM  (15/9).
         `v` er rækken, som skærmen tegnede den. Sendte vi hele `ud`,
         skrev autogemmet — der fyrer, når et prisfelt forlades — et
         udsolgt TILBAGE, som køkkenets iPad havde meldt imens: målt af
         prøven "et prisgem skriver ikke en anden skærms udsolgt
         tilbage". Nu sendes kun forskellen, og alt, denne skærm ikke
         har rørt, bliver, som det står i databasen. */
      function somTal(x) {
        var s = String(x === null || x === undefined ? '' : x).trim().replace(',', '.');
        return s === '' ? null : Number(s);
      }
      function somTekst(x) { return String(x === null || x === undefined ? '' : x).trim(); }
      /* ⚠️ IKKE `tekst` OG `tal`: byg() har feltet `tekst` (beskrivelsen),
         og en funktion med samme navn ville blive løftet op over det. */
      var felter = {};
      if (somTekst(ud.navn) !== somTekst(v.navn)) felter.navn = ud.navn;
      if (somTekst(ud.beskrivelse) !== somTekst(v.beskrivelse)) felter.beskrivelse = ud.beskrivelse;
      if (somTal(ud.pris) !== somTal(v.pris)) felter.pris = ud.pris;
      if (!!ud.fremhaevet !== !!v.fremhaevet) felter.fremhaevet = ud.fremhaevet;
      if (!!ud.udsolgt !== !!v.udsolgt) felter.udsolgt = ud.udsolgt;
      if ((ud.aktiv !== false) !== (v.aktiv !== false)) felter.aktiv = ud.aktiv;
      if (ud.antal_tilbage !== undefined) felter.antal_tilbage = ud.antal_tilbage;
      if (ud.billede !== undefined) felter.billede = ud.billede;
      if (!Object.keys(felter).length) return Promise.resolve();
      return Butik.skrive.vareFelter(v.id, felter);
    }

    // Autogem: alt undtagen prisen.
    function saml() {
      var f = Butik.tjek.navn(navn.value, 'varenavn', 120);
      if (f) return v.navn + ': ' + f;
      var nyt = nytNavnFindes();
      if (nyt) return nyt;
      return byg(false);
    }

    /* Kun når NAVNET er ændret: en vare, der allerede har en tvilling,
       skal stadig kunne gemme sin pris og sit udsolgt — ellers låste
       reglen den, den skulle hjælpe. Tvillingen står som en linje. */
    function nytNavnFindes() {
      if (navn.value.trim().toLowerCase() === String(v.navn || '').trim().toLowerCase()) return null;
      var anden = navnetFindes(navn.value, v.id);
      return anden ? dobbeltNavn(navn.value, anden, v.kategori_id) : null;
    }

    /* Den gamle Gem-knap. Den er et UDTRYKKELIGT tryk på netop
       den her række, så den må gerne tage feltets pris med — i
       modsætning til autogem, der fyrer af sig selv. */
    var gemKnap = lav('button', 'knap', 'Gem');
    gemKnap.addEventListener('click', function () {
      var f = Butik.tjek.navn(navn.value, 'varenavn', 120) || Butik.tjek.pris(pris.value);
      if (f) return Admin.brøl(v.navn + ': ' + f);
      var dob = nytNavnFindes();
      if (dob) return Admin.brøl(dob);
      Admin.gem(byg(true), navn.value + ' er gemt.');
    });

    /* ENTER GEMMER. 118 priser tastet med musen mellem hvert felt
       er en eftermiddag; med Enter er det en halv time.

       I PRISFELTET gemmer Enter ALLE de skrevne priser, ikke kun
       denne række. Gemte den kun rækken, ville optegningen bagefter
       tørre de andre felter af — og personalet ville opdage det
       ved at kigge på kortet bagefter. */
    pris.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      gemSkrevnePriser();
    });
    [navn, tekst].forEach(function (felt) {
      felt.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        gemKnap.click();
      });
    });

    /* ✕ og ikke "Slet". Kundens billeder — og den vigtige del er
       IKKE tegnet: bekræftelsen bliver stående, fordi en slettet
       vare ikke kan hentes tilbage fra admin. Et lille kryds er
       nemmere at ramme ved et uheld end en knap, der hedder Slet,
       så spørgsmålet er MERE nødvendigt her, ikke mindre. */
    var sletKnap = lav('button', 'kryds-knap', '✕');
    sletKnap.type = 'button';
    sletKnap.title = 'Slet ' + v.navn;
    sletKnap.setAttribute('aria-label', 'Slet ' + v.navn);
    sletKnap.addEventListener('click', function () {
      if (!window.confirm('Slet "' + v.navn + '" helt?\n\n'
        + 'Den kan ikke hentes tilbage. Vil du bare tage den af kortet '
        + 'i en periode, så fjern hakket i Vis.')) return;
      Admin.gem(Butik.skrive.sletVare(v.id), v.navn + ' er slettet.');
    });

    /* RÆKKEFØLGEN ER KUNDENS BILLEDER: navn · beskrivelse · pris ·
       få tilbage · Udsolgt? · ✕

       Beskrivelsen lå før på sin EGEN linje under navnet, og noten
       dér sagde, at en fjerde kolonne ville presse felterne sammen
       på en iPad. Det var sandt, dengang rækken også havde tre
       flueben, ↑↓, Gem og Slet. Udsolgt er en knap nu, Slet er et
       kryds, og de to øvrige flueben er flyttet bagest — så er der
       plads. */
    if (billedFlise) r.appendChild(billedFlise);
    r.appendChild(navn);
    r.appendChild(tekst);
    r.appendChild(pris);
    if (antal) r.appendChild(antal);
    r.appendChild(udsolgtKnap);
    r.appendChild(sletKnap);

    /* ⚠️ FORSLAG TIL BESKRIVELSEN  (13/9). Gæsten kan trykke på en vare
       på menukortet og læse, hvad den er — men kun hvis der ER en
       beskrivelse. Forslaget er vores udkast (beskrivelsesforslag.js),
       og det er EJERENS tryk på "Brug forslaget", der gemmer det: det
       går samme vej som Enter i feltet (gemKnap). Står der allerede en
       beskrivelse, vises intet — hans egne ord slår vores. */
    var forslag = (Admin.beskrivelsesForslag && !String(v.beskrivelse || '').trim())
      ? Admin.beskrivelsesForslag(v.navn) : null;
    if (forslag) {
      var fl = lav('div', 'vare-forslag');
      fl.appendChild(lav('span', 'vare-forslag-tekst', 'Forslag: ' + forslag));
      var brug = lav('button', 'knap lille', 'Brug forslaget');
      brug.type = 'button';
      brug.addEventListener('click', function () {
        tekst.value = forslag;
        gemKnap.click();
      });
      fl.appendChild(brug);
      r.appendChild(fl);
    }

    /* ⚠️ VALG PÅ VAREN  (15/9). Gæsten vælger ét af dem, og hvert valg
       er sin egen linje på bonen. Rækken SIGER det — et valg, der kun
       stod bag ⋯, ville være usynligt, og så leder ejeren efter en fejl,
       når gæsten spørges om fyld. Forslaget er vores (valgforslag.js);
       det er ejerens tryk, der gemmer det. */
    var valgNu = Butik.vareValg ? Butik.vareValg(v) : null;
    if (maaValg()) {
      if (valgNu) {
        /* Rækken viser tillægget med (20/9) — står der "+3" på kortet,
           skal ejeren kunne se det her uden at åbne ⋯. */
        r.appendChild(lav('p', 'vare-valg-note',
          'Gæsten vælger: ' + valgSomTekst(v).split(', ').join(' · ')
          + ' — ret under ⋯'));
      }
      var valgForslag = !valgNu && Admin.valgForslag ? Admin.valgForslag(v.navn) : null;
      if (valgForslag) {
        var vf = lav('div', 'vare-forslag vare-valg-forslag');
        vf.appendChild(lav('span', 'vare-forslag-tekst', 'Valg: ' + valgForslag.join(' · ')));
        var brugValg = lav('button', 'knap lille', 'Brug valgene');
        brugValg.type = 'button';
        brugValg.addEventListener('click', function () {
          Admin.gem(Butik.skrive.vareFelter(v.id, { valg: valgForslag }),
            v.navn + ' har fået valg: ' + valgForslag.join(', ') + '.');
        });
        vf.appendChild(brugValg);
        r.appendChild(vf);
      }
    }

    /* ---- DET, DER IKKE ER DAGLIGT ARBEJDE, LIGGER BAG ⋯ ----

       Kundens billeder har SEKS ting på rækken: navn,
       beskrivelse, pris, få tilbage, Udsolgt? og ✕. Favorit, vis,
       op/ned og Gem er vores egne, og de ændres et par gange om
       året, hvor udsolgt ændres flere gange om dagen.

       ⚠️ MÅLT, IKKE GÆTTET. Med alle ti på rækken passede den kun
       på en skærm bredere end 1400 px: ved 1400 brød den om til to
       linjer, og med 242 varer er det dobbelt så langt at rulle.
       En bærbar på 1280 er almindelig, og en iPad er 1024.

       De er ikke VÆK — ét tryk, og de står der. En knap, der
       skjuler noget for evigt, ville bare være en mangel. */
    var bag = lav('div', 'vare-bag skjult');
    /* At FJERNE et billede er sjældnere end at sætte et, og det
       kan ikke fortrydes med et tryk mere. Det ligger derfor bag
       ⋯ og ikke på flisen, hvor et fejlklik ville koste fotoet. */
    if (billedFlise && String(v.billede || '').trim()) {
      var fjern = lav('button', 'knap lille', 'Fjern billedet');
      fjern.type = 'button';
      fjern.addEventListener('click', function () {
        if (!window.confirm('Fjern billedet af "' + v.navn + '"?\n\n'
          + 'Rækken står uden foto bagefter. Du kan lægge et nyt op.')) return;
        nytBillede = '';
        Admin.gem(byg(false), 'Billedet af ' + navn.value + ' er fjernet.');
      });
      bag.appendChild(fjern);
    }
    /* ---- HVOR SÆLGES VAREN?  (14/9) ----
       Kundens ord: "også, hvis kun noget af det gælder det ene eller
       det andet sted". Ét flueben pr. sted, dens KATEGORI sælges — og
       kun dér: det er et fravalg (ikke_saelges), aldrig et tilvalg.
       Se HVOR SÆLGES DET? i js/store.js.

       ⚠️ stopPropagation: rækken har autogem på 'change', og uden den
       ville hvert flueben også gemme hele varen igen for ingenting. */
    var stedHer = ['smoer', 'forside', 'bord']
      .filter(function (s) { return saelgesHer({ id: v.kategori_id }, s); });
    var ikkeHer = (((Admin.data.indstillinger || {}).ikke_saelges || {})[String(v.id)]) || [];
    if (stedHer.length) {
      var stedBoks = lav('div', 'vare-steder');
      stedBoks.appendChild(lav('span', 'vare-steder-titel', 'Sælges:'));
      stedHer.forEach(function (s) {
        var l = lav('label', 'afkryds vare-sted');
        var f = document.createElement('input');
        f.type = 'checkbox';
        f.checked = ikkeHer.indexOf(s) === -1;
        f.setAttribute('data-vare-sted', v.id + '|' + s);
        f.addEventListener('change', function (h) {
          h.stopPropagation();
          var alle = Object.assign({}, (Admin.data.indstillinger || {}).ikke_saelges || {});
          var mine = (alle[String(v.id)] || []).filter(function (x) { return x !== s; });
          if (!f.checked) mine.push(s);
          if (mine.length) alle[String(v.id)] = mine; else delete alle[String(v.id)];
          Admin.gem(Butik.skrive.indstilling('ikke_saelges', alle), f.checked
            ? v.navn + ' kan nu bestilles på ' + STED_NAVN[s] + ' igen.'
            : v.navn + ' kan ikke længere bestilles på ' + STED_NAVN[s] + '.');
        });
        l.appendChild(f);
        l.appendChild(lav('span', null,
          STED_NAVN[s].charAt(0).toUpperCase() + STED_NAVN[s].slice(1)));
        stedBoks.appendChild(l);
      });
      bag.appendChild(stedBoks);
    }
    /* Valgene skrives her, med kommaer imellem. ⚠️ stopPropagation på
       begge hændelser: rækken har autogem på 'input' og 'change', og
       uden den ville hvert tastetryk også gemme hele rækken. */
    if (maaValg()) {
      var valgBoks = lav('label', 'felt vare-valg-felt');
      valgBoks.appendChild(lav('span', null, 'Valg (kommaer imellem)'));
      var valgFelt = document.createElement('input');
      valgFelt.type = 'text';
      valgFelt.maxLength = 600;
      valgFelt.placeholder = 'fx Kebab, Kylling, Tun — eller Glutenfri vaffel +3';
      valgFelt.value = valgSomTekst(v);
      valgFelt.setAttribute('data-vare-valg', v.id);
      valgFelt.setAttribute('aria-label', 'Valg på ' + v.navn);
      valgFelt.addEventListener('input', function (h) { h.stopPropagation(); });
      valgFelt.addEventListener('change', function (h) {
        h.stopPropagation();
        var liste = valgFraTekst(valgFelt.value);
        if (liste.length === 1) {
          return Admin.brøl('Et valg skal have mindst to muligheder — eller ingen.');
        }
        /* Kvitteringen skriver den form, ejeren selv tastede, så hun
           kan se, at "+3" blev forstået som penge og ikke som en del
           af navnet. */
        var somTekst = liste.map(function (x) {
          return typeof x === 'object' ? x.navn + ' +' + x.tillaeg : x;
        }).join(', ');
        Admin.gem(Butik.skrive.vareFelter(v.id, { valg: liste }), liste.length
          ? v.navn + ' har fået valg: ' + somTekst + '.'
          : v.navn + ' har ikke valg længere.');
      });
      valgBoks.appendChild(valgFelt);
      bag.appendChild(valgBoks);
    }
    bag.appendChild(favorit.mærkat);
    bag.appendChild(vis.mærkat);
    bag.appendChild(flytKnapper(v, alle, 'vare'));
    bag.appendChild(gemKnap);

    var mere = lav('button', 'kryds-knap mere-knap', '⋯');
    mere.type = 'button';
    mere.title = 'Hvor den sælges, favorit, vis på kortet, flyt op og ned';
    mere.setAttribute('aria-label', 'Flere indstillinger for ' + v.navn);
    mere.setAttribute('aria-expanded', 'false');
    mere.addEventListener('click', function () {
      var åben = bag.classList.toggle('skjult');
      mere.setAttribute('aria-expanded', åben ? 'false' : 'true');
      r.classList.toggle('raekke-aaben', !åben);
    });
    r.insertBefore(mere, sletKnap);
    r.appendChild(bag);

    /* ⚠️ AUTOGEM PÅ RÆKKEN. "Alt gemmes automatisk, mens du
       skriver" står i kundens billeder.

       Gem-knappen bliver stående — den skal bare ikke være det
       eneste, der virker. Se noten ved Admin.autogem: den skriver
       STILLE, fordi Admin.gem tegner alle faner om, og en
       optegning midt i en sætning river feltet ud af siden under
       fingeren.

       ⚠️ OG PRISEN ER MED — det er netop dét, der gør den sikker.
       Grunden til, at priserne fik deres EGEN samle-knap, var, at
       Admin.gem tegner fanen om: havde ejeren skrevet ti priser og
       gemt den ene, var de ni væk. Autogem tegner ingenting om, så
       den fælde findes ikke her. Panelet øverst og den ene knap
       bliver stående til den, der taster hele kortet igennem uden
       at forlade et felt. */
    var tvilling = navnetFindes(v.navn, v.id);
    if (tvilling) {
      var adv = lav('p', 'vare-advarsel',
        '⚠️ Samme navn som en vare under «' + kategoriNavnFor(tvilling.kategori_id)
        + '» — ret navnet, så de kan skelnes på bonen.');
      r.appendChild(adv);
    }

    /* Et fravalg, der kun stod bag ⋯, ville være usynligt — og så
       leder ejeren efter en fejl, når varen ikke står ved bordet. */
    var fravalgt = stedHer.filter(function (s) { return ikkeHer.indexOf(s) !== -1; });
    if (fravalgt.length) {
      r.appendChild(lav('p', 'vare-sted-note', '📍 Ikke på '
        + fravalgt.map(function (s) { return STED_NAVN[s]; }).join(' og ')
        + ' — ret det under ⋯'));
    }

    Admin.autogem(r, saml);
    return r;
  }

  function nyVareFelt(k) {
    var r = lav('div', 'admin-raekke ny-vare');

    var navn = document.createElement('input');
    navn.type = 'text'; navn.className = 'navn'; navn.placeholder = 'Ny vare i ' + k.navn;
    navn.setAttribute('aria-label', 'Navn på ny vare i ' + k.navn);
    navn.maxLength = 120;

    var pris = document.createElement('input');
    pris.type = 'text'; pris.className = 'smal'; pris.inputMode = 'decimal'; pris.placeholder = 'kr.';
    pris.setAttribute('aria-label', 'Pris på ny vare i ' + k.navn);

    var knap = lav('button', 'knap tilfoej', '+ Tilføj ret');
    knap.type = 'button';
    knap.addEventListener('click', function () {
      var f = Butik.tjek.navn(navn.value, 'varenavn', 120) || Butik.tjek.pris(pris.value);
      if (f) return Admin.brøl(f);
      var anden = navnetFindes(navn.value, null);
      if (anden) return Admin.brøl(dobbeltNavn(navn.value, anden, k.id));

      var højeste = (Admin.data.menu_varer || [])
        .filter(function (v) { return v.kategori_id === k.id; })
        .reduce(function (m, v) { return Math.max(m, v.sortering || 0); }, 0);

      Admin.gem(Butik.skrive.vare({
        kategori_id: k.id,
        navn: navn.value,
        pris: pris.value,
        sortering: højeste + 1,
      }), navn.value + ' er lagt på menukortet.').then(function () {
        /* Felterne tømmes ikke af sig selv: Admin.gem tegner fanen
           om, og rækken bygges på ny med tomme felter. Men markøren
           skal tilbage — ellers skal ejeren finde feltet igen for
           hver eneste vare, og der er 242 af dem. */
        var nyt = document.querySelector('[data-kategori="' + k.id + '"] .ny-vare .navn');
        if (nyt) nyt.focus();
      });
    });

    // Enter i navnet gør det samme som knappen. Se noten om de 118
    // priser: en hånd på musen mellem hver vare er en eftermiddag.
    [navn, pris].forEach(function (felt) {
      felt.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        knap.click();
      });
    });

    r.appendChild(navn);
    r.appendChild(pris);
    r.appendChild(knap);
    return r;
  }

  /* ============================================================
     HAVNENS TAPAS — kortet øverst på fanen  (29/8)
     ------------------------------------------------------------
     Spiis' menukort-fane har tapassen som sit eget kort, og
     kundens ord var "a la sådan her, også med tapas". Kortet er
     en RUDE ind til menukortets egne rækker: fadet og cavaen ER
     varer i menu_varer (kendingen er NAVNET, samme regexer som
     js/skal/tapas.js), og "Det får I"-listen er fadets
     beskrivelse med ét punkt pr. linje — gemt som "·"-adskilt,
     som ejerens liste skrev den. Intet nyt lager: to steder at
     rette den samme pris ville skride fra hinanden.

     ⚠️ OPTEGNINGEN RØRER IKKE KORTET, MENS DER SKRIVES I DET.
     tegnere kører efter hvert gem, og autogem gemmer 1,2 sekund
     efter sidste tastetryk — en optegning dér river feltet ud af
     siden under fingeren. Samme fælde som køreplanens notefelt.

     ⚠️ VARSLET KAN KUN TRÆKKES OP. Feltet skriver
     tapas_varsel_timer; tomt = fadets egne 48 timer, og
     formularen på tapassiden lægger altid forretningens varsel
     nedenunder som bund. Se varselTimer() i bestil-regler.js. */
  function tapasFad() {
    return (Admin.data.menu_varer || []).filter(function (v) {
      return /tapas/i.test(String(v.navn || ''));
    })[0] || null;
  }
  function tapasBobler() {
    /* ⚠️ FLASKEN FØRST — samme regel som tapassiden (9/9). Målt 13/9:
       kortet her tog det første hit, "Cava, glas", og kaldte det
       "pr. flaske". En pris skrevet i feltet ville have ramt glasset. */
    var bobs = (Admin.data.menu_varer || []).filter(function (v) {
      return /cava|champagne|bobler/i.test(String(v.navn || ''));
    });
    return bobs.filter(function (v) { return /flaske/i.test(v.navn); })[0]
      || bobs[0] || null;
  }

  /* Fadets tilkøb: resten af fadets kategori. Samme regel som
     findVarer() i js/skal/tapas.js — boblerne har deres eget felt. */
  function tapasTilkoeb(fad) {
    if (!fad) return [];
    return (Admin.data.menu_varer || []).filter(function (v) {
      return v.kategori_id === fad.kategori_id && v.id !== fad.id
        && !/cava|champagne|bobler/i.test(String(v.navn || ''));
    }).sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); });
  }

  function tapasFelt(id, etiket, vaerdi, pladsholder) {
    var felt = Admin.lav('div', 'felt felt-smal');
    var m = Admin.lav('label', null, etiket);
    m.setAttribute('for', id);
    var input = document.createElement('input');
    input.type = 'text'; input.id = id; input.inputMode = 'decimal';
    input.maxLength = 8; input.placeholder = pladsholder || '';
    input.value = vaerdi;
    felt.appendChild(m); felt.appendChild(input);
    return felt;
  }

  function tegnTapas() {
    var rod = $('tapas-felter');
    if (!rod) return;
    /* Skrives der i kortet, tegnes der ikke om — se noten ovenfor. */
    if (rod.contains(document.activeElement)) return;

    var fad = tapasFad();
    var bobler = tapasBobler();
    var ind = Admin.data.indstillinger || {};

    var aftryk = [fad && fad.id, fad && fad.pris, fad && fad.beskrivelse,
      bobler && bobler.id, bobler && bobler.pris,
      ind.tapas_varsel_timer,
      JSON.stringify(tapasTilkoeb(fad).map(function (v) {
        return [v.id, v.navn, v.pris, v.aktiv, v.udsolgt];
      }))].join('|');
    if (rod.getAttribute('data-aftryk') === aftryk) return;
    rod.setAttribute('data-aftryk', aftryk);

    Admin.tøm(rod);

    if (!fad) {
      /* Samme besked som tapassiden selv: uden fadet på kortet er
         der ingenting at styre — og et opdigtet filnavn sender
         nogen ud at lede, så det RIGTIGE står her. */
      rod.appendChild(Admin.lav('p', 'hjaelp',
        'Tapasfadet står ikke på menukortet endnu. Kør '
        + 'supabase/menukort-ud-af-huset.sql i Supabase, så kommer '
        + 'felterne her af sig selv.'));
      return;
    }

    rod.appendChild(tapasFelt('tapas-pris', 'Pris pr. person',
      (fad.pris === null || fad.pris === undefined) ? '' : String(fad.pris).replace('.', ','),
      'fx 199'));

    /* Cava-feltet findes kun, når varen gør — samme regel som på
       tapassiden: at prissætte en vare, ingen har oprettet, er at
       finde på et produkt. */
    if (bobler) {
      rod.appendChild(tapasFelt('tapas-cava', bobler.navn + ' pr. flaske',
        (bobler.pris === null || bobler.pris === undefined) ? '' : String(bobler.pris).replace('.', ','),
        'fx 150'));
    }

    var indhold = Admin.lav('div', 'felt');
    var im = Admin.lav('label', null, 'Det får I — én linje pr. punkt');
    im.setAttribute('for', 'tapas-indhold');
    var tekst = document.createElement('textarea');
    tekst.id = 'tapas-indhold'; tekst.rows = 8; tekst.maxLength = 1200;
    tekst.placeholder = '5 slags ost\nSerranoskinke\nChorizo';
    tekst.value = String(fad.beskrivelse || '').split('·')
      .map(function (l) { return l.trim(); })
      .filter(Boolean).join('\n');
    indhold.appendChild(im); indhold.appendChild(tekst);
    rod.appendChild(indhold);
    rod.appendChild(Admin.lav('p', 'hjaelp',
      'Listen står på tapassiden under "Det får I" og som fadets '
      + 'linje på menukortet. Tom liste = designets egen bliver stående.'));

    /* ---- TILKØB TIL FADET  (13/9) ----
       Kundens ord: "prøvede at adde kage til tapas — det virkede
       ikke, og hvordan skal det hænge sammen". Svaret står HER, hvor
       han kigger: alt i fadets kategori er tilkøb på tapassiden, og
       en vare, der ikke kommer med, siger hvorfor. */
    var tk = tapasTilkoeb(fad);
    var katNavn = kategoriNavnFor(fad.kategori_id) || 'fadets kategori';
    var tilkoeb = Admin.lav('div', 'felt tapas-tilkoeb');
    tilkoeb.id = 'tapas-tilkoeb';
    tilkoeb.appendChild(Admin.lav('b', null, 'Tilkøb til fadet'));
    if (tk.length) {
      var ul = Admin.lav('ul', 'tapas-tilkoeb-liste');
      tk.forEach(function (v) {
        var tom = v.pris === null || v.pris === undefined || v.pris === '';
        var hvad = v.aktiv === false ? 'skjult — står ikke på tapassiden'
          : v.udsolgt ? 'udsolgt — står ikke på tapassiden'
            : tom ? 'ingen pris — står ikke på tapassiden'
              : Butik.kroner(v.pris);
        var li = Admin.lav('li', null, v.navn + ' · ' + hvad);
        li.setAttribute('data-tilkoeb', v.id);
        ul.appendChild(li);
      });
      tilkoeb.appendChild(ul);
    }
    tilkoeb.appendChild(Admin.lav('p', 'hjaelp',
      (tk.length ? '' : 'Ingen endnu. ')
      + 'Alt, I lægger i kategorien «' + katNavn + '», står som tilkøb på '
      + 'tapassiden med sin pris' + (bobler ? ', under ' + bobler.navn : '')
      + '. Tilføj og ret dem i kategorien.'));
    var aabn = Admin.lav('button', 'knap lille', 'Åbn «' + katNavn + '»');
    aabn.type = 'button';
    aabn.id = 'tapas-aabn-kategori';
    aabn.addEventListener('click', function () {
      aabne[fad.kategori_id] = true;
      tegnMenu();
      var g = document.querySelector('.menu-gruppe[data-kategori="' + fad.kategori_id + '"]');
      if (g && g.scrollIntoView) g.scrollIntoView({ block: 'start' });
    });
    tilkoeb.appendChild(aabn);
    rod.appendChild(tilkoeb);

    rod.appendChild(tapasFelt('tapas-varsel', 'Varsel i timer',
      (typeof ind.tapas_varsel_timer === 'number' && isFinite(ind.tapas_varsel_timer))
        ? String(ind.tapas_varsel_timer) : '',
      'tomt = 48'));
  }

  /* Autogem registreres ÉN gang — roden er KORTET, ikke felterne,
     for felterne tegnes om (samme lære som tider-fanen). */
  Admin.autogem($('tapas-kort'), function () {
    var fad = tapasFad();
    if (!fad || !$('tapas-pris')) return false;

    var f = Butik.tjek.pris($('tapas-pris').value)
      || ($('tapas-cava') && Butik.tjek.pris($('tapas-cava').value));
    if (f) return f;

    var varselTekst = ($('tapas-varsel') ? $('tapas-varsel').value : '').trim();
    var varsel = null;
    if (varselTekst) {
      varsel = Number(varselTekst.replace(',', '.'));
      if (!isFinite(varsel) || varsel < 0 || varsel > 720) {
        return 'Varslet skal være timer mellem 0 og 720 — eller tomt.';
      }
    }

    var punkter = $('tapas-indhold').value.split('\n')
      .map(function (l) { return l.trim(); }).filter(Boolean);

    var kald = Butik.skrive.vare(Object.assign({}, fad, {
      pris: $('tapas-pris').value,
      beskrivelse: punkter.join(' · '),
    }));

    var bobler = tapasBobler();
    if (bobler && $('tapas-cava')) {
      kald = kald.then(function () {
        return Butik.skrive.vare(Object.assign({}, bobler, {
          pris: $('tapas-cava').value,
        }));
      });
    }

    return kald.then(function () {
      return Butik.skrive.indstilling('tapas_varsel_timer', varsel);
    });
  });

  /* ============================================================
     ISENS SMAGE  (25/9)
     ------------------------------------------------------------
     Kundens ord: *"når man bestiller en is skal man med kugler
     smage osv kunne gøre det rigtigt."*

     ⚠️ VI FINDER IKKE PÅ SMAGE. Hvilke is forretningen har, ved
     kun ejeren. Feltet er `is_smage` i indstillinger (nøgle/værdi,
     altså ingen SQL), og er det tomt, spørger bestillingen slet
     ikke om smag — siden opfører sig præcis som i går.

     ⚠️ ÉN PR. LINJE, fordi det er sådan, man skriver en liste i et
     tekstfelt. Komma tages også imod (Butik.isSmage læser begge),
     så en ejer, der taster "vanilje, jordbær", ikke får én lang
     smag ud af det.

     ⚠️ OG OPTEGNINGEN RØRER IKKE KORTET, MENS DER SKRIVES I DET —
     samme regel som tapaskortet lige ovenfor. */
  function tegnIsSmage() {
    var rod = $('is-smage-felter');
    if (!rod) return;
    if (rod.contains(document.activeElement)) return;

    var smage = Butik.isSmage ? Butik.isSmage(Admin.data) : [];
    var aftryk = smage.join('|');
    if (rod.getAttribute('data-aftryk') === aftryk) return;
    rod.setAttribute('data-aftryk', aftryk);

    Admin.tøm(rod);

    var felt = Admin.lav('div', 'felt');
    var m = Admin.lav('label', null, 'Smagene, én pr. linje');
    m.setAttribute('for', 'is-smage');
    var ind = document.createElement('textarea');
    ind.id = 'is-smage';
    ind.rows = 5;
    ind.placeholder = 'Vanilje\nJordbær\nChokolade';
    ind.value = smage.join('\n');
    felt.appendChild(m);
    felt.appendChild(ind);
    rod.appendChild(felt);

    /* ⚠️ LINJEN SIGER, HVAD DER SKER UDE PÅ SIDEN — ikke hvad
       feltet hedder. Husets regel for .hjaelp siden 26/8. */
    rod.appendChild(Admin.lav('p', 'hjaelp', smage.length
      ? 'Gæsten vælger én smag pr. kugle, når hun bestiller "2 kugler" '
        + 'eller "3 kugler". Køkkenet får dem at se på hver enkelt vaffel.'
      : 'Står feltet tomt, spørger bestillingen ikke om smag — '
        + 'køkkenet får "2 kugler · Vaffel" og må selv spørge.'));
  }

  /* Autogem registreres ÉN gang — roden er KORTET, ikke feltet. */
  Admin.autogem($('is-smage-kort'), function () {
    var f = $('is-smage');
    if (!f) return false;
    /* ⚠️ GEMT SOM ÉN TEKST, ikke som en liste: `indstillinger` er
       nøgle/værdi, og en jsonb-kolonne til fem ord ville være en
       SQL-fil, ejeren skal køre. Butik.isSmage deler den op — ét
       sted, så siden og admin ikke kan blive uenige. */
    var linjer = String(f.value || '').split(/[,\n;]+/)
      .map(function (x) { return x.trim(); }).filter(Boolean);
    if (linjer.length > 40) return 'Der er plads til 40 smage — ikke flere.';
    var forLang = linjer.filter(function (x) { return x.length > 60; })[0];
    if (forLang) return 'En smag må fylde 60 tegn: “' + forLang.slice(0, 20) + '…”';
    return Butik.skrive.indstilling('is_smage', linjer.join('\n'));
  });

  Admin.tegnere.push(tegnMenu);
  Admin.tegnere.push(tegnTapas);
  Admin.tegnere.push(tegnIsSmage);

  /* ============================================================
     HENT KORTET SOM REGNEARK  (3/9)
     ------------------------------------------------------------
     Kundens ord: "giv mig det hele som filer, da jeg skal lave
     menukort." Der ligger et script i vaerktoej/, men det kræver
     en terminal — og det blev prøvet kørt i Supabases SQL Editor,
     hvor det fejlede på linje 1 med "syntax error at or near
     '#!/'". Et værktøj, der kun kan bruges én bestemt vej, bliver
     brugt den forkerte.

     ⚠️ INGEN NYE KALD. Filen bygges af Admin.data, altså præcis
     det, skærmen viser — samme greb som sikkerhedskopien på
     Historik. Den virker derfor også den dag, forbindelsen
     driller: tallene ER i browseren.

     ⚠️ OG DEN GÆTTER INGEN PRIS. En vare uden pris skrives som en
     TOM celle, aldrig som 0. Et beløb, vi finder på, er værre end
     ingen pris — gæsten regner med det. Samme regel som
     vaerktoej/skriv-menukort.py, og de to skal blive ved med at
     skrive de samme kolonner. */
  var AFD_NAVN = { mad: 'Mad', is: 'Is', drikke: 'Drikke' };

  function csvFelt(v) {
    var t = v === null || v === undefined ? '' : String(v);
    /* Semikolon som skilletegn, fordi et dansk Excel deler på
       det — og fordi halvdelen af beskrivelserne indeholder
       komma ("ost, skinke, spejlæg"). */
    return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }

  function menukortCsv() {
    var d = Admin.data || {};
    var kat = {};
    (d.menu_kategorier || []).forEach(function (k) { kat[k.id] = k; });

    /* ⚠️ SAMME SVAR SOM GÆSTESIDEN (15/9): Butik.salgsKategorier for
       de tre steder. Her stod en egen kopi — isen altid nej,
       smørrebrødet kendt på navnet og kun den gamle liste — og den
       sagde nej til en kategori, der kun sælges ved bordene, og til
       isen, efter at ejeren havde åbnet for den. "Kan bestilles" er
       ja, hvis ÉT af de tre steder sælger kategorien. */
    var steder = ['smoer', 'forside', 'bord'].map(function (s) {
      return Butik.salgsKategorier(d, s).map(Number);
    });
    function kanBestilles(k) {
      return steder.some(function (l) { return l.indexOf(Number(k.id)) !== -1; });
    }

    var linjer = [[
      'Kategori', 'Afdeling', 'Vare', 'Pris (kr.)', 'Beskrivelse',
      'Kategori vises', 'Vare vises', 'Udsolgt',
      'Kan bestilles online', 'Kategoriens dage', 'Kategorinote',
    ]];

    (d.menu_kategorier || []).slice().sort(function (a, b) {
      return (a.sortering || 0) - (b.sortering || 0) || a.id - b.id;
    }).forEach(function (k) {
      (d.menu_varer || []).filter(function (v) {
        return v.kategori_id === k.id;
      }).sort(function (a, b) {
        return (a.sortering || 0) - (b.sortering || 0) || a.id - b.id;
      }).forEach(function (v) {
        linjer.push([
          k.navn, AFD_NAVN[k.afdeling] || k.afdeling, v.navn,
          v.pris === null || v.pris === undefined ? '' : String(v.pris),
          v.beskrivelse || '',
          k.aktiv === false ? 'nej' : 'ja',
          v.aktiv === false ? 'nej' : 'ja',
          v.udsolgt ? 'ja' : 'nej',
          kanBestilles(k) ? 'ja' : 'nej',
          k.dage || 'alle', k.note || '',
        ]);
      });
    });

    return linjer.map(function (r) {
      return r.map(csvFelt).join(';');
    }).join('\r\n');
  }

  var hentKnap = $('hent-menukort');
  if (hentKnap) {
    hentKnap.addEventListener('click', function () {
      var varer = ((Admin.data || {}).menu_varer || []).length;
      if (!varer) return Admin.brøl('Menukortet er ikke hentet endnu. Prøv igen om et øjeblik.');

      /* ⚠️ BOM FORAN. Uden den læser et dansk Excel filen som
         Latin-1, og hver eneste æ, ø og å bliver til krims-krams
         i et menukort, nogen skal trykke. */
      var blob = new Blob(['\ufeff' + menukortCsv()],
        { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'mosede-menukort-' + Butik.nu().dato + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Én blob pr. tryk ville ellers blive liggende i
      // hukommelsen på en iPad, der ikke genindlæses i ugevis.
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      Admin.kvitter(varer + ' varer er hentet som regneark.');
    });
  }
})();
