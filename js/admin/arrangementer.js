/* Fanen Arrangementer — arrangørens arbejdsbord  (12. okt 2026)
   Se js/admin/kerne.js for de to principper, der gælder i alle
   admin-filerne.

   Chefens ord: *"Er der lavet en gruppe på hjemmesiden, hvor vores
   event-arrangør kan gå ind og lægge alle vores events ind på?"*
   Mikkels svar 12/10: stederne er "de 4 der eller alle sammen, sådan
   hele havnecaféen — men de kan lave navnene om", "arrangøren må godt
   udgive selv", "venteliste ja".

   MÅLT FØR: arrangementerne blev lavet i kalenderens formular, hvor
   typen stod på LUKKEDAG fra start, og listen var én lang liste med
   lukkedage, interne noter og overståede imellem hinanden. Slet tog
   gæstelisten med i stilhed (on delete cascade). Én fredagsbar om ugen
   var ti gange den samme formular.

   NU: ét sted for et arrangement.
     · Listen er delt i Kommende, Kladder og Forbi, med måneder og søg
     · Opret, ret, KOPIÉR og GENTAG (hver uge til en dato — hver række
       sin egen, så én fredag kan aflyses uden de andre)
     · Sted på havnen, valgt af en liste, der kan omdøbes
     · Tre måder at komme med på: kig forbi · tilmelding (pladser, max
       pr. tilmelding, frist, venteliste) · book bord
     · AFLYS i stedet for slet; databasen afviser at slette et
       arrangement med tilmeldte (arrangoer.sql)
     · Forhåndsvisning af kortet, som det står på kalendersiden og
       forsiden — og et tjek af, hvad datoen rammer (lukket, baglokalet
       udlejet, et andet arrangement samme sted og tid)

   ⚠️ ADMIN VIRKER OGSÅ, FØR arrangoer.sql ER KØRT. De nye kolonner
   sendes kun, når databasen har dem (nyeKolonner) — ellers kunne der
   slet ikke oprettes et arrangement, før nogen kørte en fil, ejeren
   ikke ved findes. Samme greb som maaTilmelding i kalender.js. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;
  if (!$('p-arrangementer')) return;

  /* kalender.js' egne dagsnoter ("Note til dagen") er type
     'arrangement' internt — men de er personalets huskesedler, ikke
     noget, der sker på havnen. */
  var NOTE_TITEL = 'Note til dagen';
  var KAT_NAVN = { musik: 'Musik', spisning: 'Spisning', fest: 'Fest', andet: 'Andet' };
  var FRIST_NAVN = { 0: 'når det starter', 1: '1 time før', 3: '3 timer før',
    24: 'dagen før', 48: '2 dage før' };
  var UGEDAGE = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'];
  var UGEDAGE_LANG = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
  var MAANEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august',
    'september', 'oktober', 'november', 'december'];
  /* En gentagelse ud over et år er en fejl i et datofelt, ikke et
     program — og hundrede rækker kan ikke fortrydes med ét tryk. */
  var MAKS_GENTAG = 52;

  var vis = 'kommende';
  var soeg = '';
  var retter = null;            // rækken, der rettes — null = nyt
  var valg = { kategori: '', sted_id: null, maade: 'kig' };
  var nytBillede;               // undefined = ingen har rørt det · '' = fjern
  var optagne = [];             // baglokalets optagne dage (uden navne)

  function d() { return Admin.data || {}; }
  function iDag() { return Butik.nu().dato; }

  /* ⚠️ SPØRG DATABASEN, IKKE KODEN. Har kalenderens rækker kolonnen
     `aflyst`, er arrangoer.sql kørt. En tom kalender er et "måske" —
     samme begrundelse som maaTilmelding: en høj fejl med en løsning
     (PGRST204 → "Kør supabase/arrangoer.sql") slår en tavs. */
  function nyeKolonner() {
    if (!Butik.sky) return true;
    var liste = d().kalender || [];
    if (!liste.length) return true;
    return Object.prototype.hasOwnProperty.call(liste[0], 'aflyst');
  }

  // ----------------------------------------------------------
  //  DATOER OG ORD
  // ----------------------------------------------------------
  function dato(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  }
  function plusDage(iso, n) {
    var t = dato(iso);
    if (!t) return '';
    t.setUTCDate(t.getUTCDate() + n);
    return t.toISOString().slice(0, 10);
  }
  function ugedag(iso) { var t = dato(iso); return t ? UGEDAGE[t.getUTCDay()] : ''; }
  function langDato(iso) {
    var t = dato(iso);
    if (!t) return '';
    return UGEDAGE_LANG[t.getUTCDay()] + ' ' + t.getUTCDate() + '. ' + MAANEDER[t.getUTCMonth()];
  }
  function kortDato(iso) {
    var t = dato(iso);
    return t ? t.getUTCDate() + '/' + (t.getUTCMonth() + 1) : '';
  }
  function maanedNavn(iso) {
    var t = dato(iso);
    if (!t) return '';
    var m = MAANEDER[t.getUTCMonth()];
    return m.charAt(0).toUpperCase() + m.slice(1) + ' ' + t.getUTCFullYear();
  }
  function kl(t) { return t ? String(t).slice(0, 5).replace(':', '.') : ''; }
  function minutter(t) {
    if (!t) return null;
    var s = String(t);
    return parseInt(s.slice(0, 2), 10) * 60 + parseInt(s.slice(3, 5), 10);
  }

  function stedNavn(k) { return Butik.stedNavn(d(), k); }
  function sted(id) {
    return Butik.steder(d()).filter(function (s) { return String(s.id) === String(id); })[0] || null;
  }

  function tid(k) {
    if (!k.start_kl) return '';
    return 'kl. ' + kl(k.start_kl) + (k.slut_kl ? '–' + kl(k.slut_kl) : '');
  }

  // ----------------------------------------------------------
  //  RÆKKERNE
  // ----------------------------------------------------------
  function alle() {
    return (d().kalender || []).filter(function (k) {
      return k.type === 'arrangement' && k.titel !== NOTE_TITEL;
    });
  }
  function erForbi(k) { return (k.slut_dato || k.dato) < iDag(); }
  function gruppe(k) {
    if (erForbi(k)) return 'forbi';
    return k.offentlig ? 'kommende' : 'kladder';
  }

  /* Tilmeldingerne bor i tilmeldinger.js (hentet ved login). Kommer
     tallet ikke derfra, er det 0 — ikke et gæt. */
  function tilmeldte(id) { return Admin.tilmeldteFor ? Admin.tilmeldteFor(id) : []; }
  function taget(id) { return Admin.pladserTaget ? Admin.pladserTaget(id) : 0; }
  function ventende(id) {
    return tilmeldte(id).filter(function (r) { return r.status === 'venteliste'; })
      .reduce(function (s, r) { return s + (Number(r.antal_personer) || 0); }, 0);
  }
  function harTilmeldte(id) {
    return tilmeldte(id).some(function (r) { return !r.slettet && r.status !== 'afvist'; });
  }

  /* ⚠️ ET TAL, DER KAN LÆSES PÅ ÉN MÅDE (LAERT-AF-SPIIS.md nr. 2). "18"
     alene kan være taget eller tilbage; "18 af 40 pladser taget" kan
     ikke. */
  function tilmeldTekst(k) {
    if (k.bord_booking) return 'Gæsterne booker bord';
    var n = taget(k.id);
    var v = ventende(k.id);
    if (!k.tilmelding) {
      return n ? n + ' tilmeldt fra før — tilmeldingen er lukket' : 'Kig bare forbi — ingen tilmelding';
    }
    var t = k.pladser ? n + ' af ' + k.pladser + ' pladser taget' : n + (n === 1 ? ' tilmeldt' : ' tilmeldte');
    if (k.pladser && n >= k.pladser) t += ' · fuldt';
    if (v) t += ' · ' + v + ' på venteliste';
    return t;
  }

  // ----------------------------------------------------------
  //  LISTEN
  // ----------------------------------------------------------
  function tegnListe() {
    var boks = $('arr-liste');
    if (!boks) return;
    var rk = alle();

    var tal = { kommende: 0, kladder: 0, forbi: 0 };
    rk.forEach(function (k) { tal[gruppe(k)]++; });
    Array.prototype.forEach.call(document.querySelectorAll('#arr-filter [data-tal]'), function (e) {
      var n = tal[e.getAttribute('data-tal')];
      e.textContent = n ? String(n) : '';
    });
    Array.prototype.forEach.call(document.querySelectorAll('#arr-filter [data-vis]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-vis') === vis ? 'true' : 'false');
    });
    if ($('arr-mangler-sql')) $('arr-mangler-sql').hidden = nyeKolonner();
    /* Søgefeltet står først, når listen er lang nok til at skulle søges i —
       på en telefon var det et felt nr. to lige under «Find en sag». */
    if ($('arr-soeg')) $('arr-soeg').hidden = rk.length <= 8 && !soeg;
    /* Uden arrangoer.sql findes tabellen med stederne ikke. */
    if ($('arr-ret-steder-liste')) $('arr-ret-steder-liste').hidden = !nyeKolonner();

    var q = soeg.trim().toLowerCase();
    var vist = rk.filter(function (k) {
      if (gruppe(k) !== vis) return false;
      if (!q) return true;
      return (k.titel || '').toLowerCase().indexOf(q) !== -1
        || stedNavn(k).toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) {
      var x = (a.dato || '') + (a.start_kl || '');
      var y = (b.dato || '') + (b.start_kl || '');
      /* Det forbi står med det NYESTE øverst — sidste fredag er den,
         man leder efter, ikke den fra juli. */
      return vis === 'forbi' ? (x < y ? 1 : -1) : (x < y ? -1 : 1);
    });

    Admin.tøm(boks);
    if (!vist.length) {
      var tom = lav('p', 'vare-tekst arr-tom');
      tom.textContent = q ? 'Intet arrangement passer på "' + soeg.trim() + '".'
        : vis === 'kladder' ? 'Ingen kladder. Et arrangement, der gemmes som kladde, står her, til det udgives.'
          : vis === 'forbi' ? 'Ingen overståede arrangementer de sidste fire måneder.'
            : 'Der står intet kommende arrangement. Så står der heller ikke noget i '
              + '«Hvad sker der» på forsiden. Tryk «+ Nyt arrangement».';
      boks.appendChild(tom);
      return;
    }

    var maaned = '';
    vist.forEach(function (k) {
      var m = maanedNavn(k.dato);
      if (m !== maaned) {
        maaned = m;
        boks.appendChild(lav('h3', 'arr-maaned', m));
      }
      boks.appendChild(raekke(k));
    });
  }

  function knap(tekst, klasse, hvad) {
    var b = lav('button', 'knap lille' + (klasse ? ' ' + klasse : ''), tekst);
    b.type = 'button';
    b.addEventListener('click', hvad);
    return b;
  }

  /* ⚠️ ÉN KNAP, DER SES — RESTEN BAG ⋯  (26/10). Rækken havde fem
     knapper (Ret, Kopiér, Tilmeldte, Aflys, Slet) side om side; på en
     telefon brød de over to linjer, og Slet stod lige ved siden af Ret.
     Nu: hele rækken åbner arrangementet, Tilmeldte står med sit tal,
     og det sjældne (kopiér, aflys, slet, se på siden) ligger i en menu. */
  var aabenMenu = null;
  function lukMenu() {
    if (!aabenMenu) return;
    aabenMenu.hidden = true;
    var k = aabenMenu.previousElementSibling;
    if (k) k.setAttribute('aria-expanded', 'false');
    aabenMenu = null;
  }
  /* Et tryk ved siden af lukker menuen — og gør ikke andet (capture):
     ellers åbnede trykket arrangementet under sløret på en telefon. */
  document.addEventListener('click', function (e) {
    if (!aabenMenu || (e.target.closest && e.target.closest('.arr-menu, .arr-mere-knap'))) return;
    lukMenu();
    e.preventDefault();
    e.stopPropagation();
  }, true);

  function raekke(k) {
    var r = lav('article', 'arr-raekke' + (k.aflyst ? ' aflyst' : '') + (k.offentlig ? '' : ' kladde'));
    r.setAttribute('data-arr', String(k.id));
    r.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('button, a, .arr-mere')) return;
      aabn(k);
    });

    var dag = lav('div', 'arr-dag');
    dag.appendChild(lav('span', 'arr-ugedag', ugedag(k.dato)));
    dag.appendChild(lav('b', null, String(Number(String(k.dato).slice(8, 10)))));
    dag.appendChild(lav('span', 'arr-md', (MAANEDER[Number(String(k.dato).slice(5, 7)) - 1] || '').slice(0, 3)));
    r.appendChild(dag);

    var midt = lav('div', 'arr-midt');
    var top = lav('div', 'arr-maerker');
    if (k.aflyst) top.appendChild(lav('span', 'maerke udsolgt', 'Aflyst'));
    if (!k.offentlig && !erForbi(k)) top.appendChild(lav('span', 'maerke m-udeblevet', 'Kladde — står ikke på siden'));
    top.appendChild(lav('span', 'maerke arr-kat', KAT_NAVN[Butik.arrangementSlags(k)] || 'Andet'));
    if (k.serie) top.appendChild(lav('span', 'arr-serie', 'gentages'));
    midt.appendChild(top);
    midt.appendChild(lav('h3', 'arr-titel', k.titel));
    var meta = [tid(k), stedNavn(k)].filter(Boolean).join(' · ');
    if (meta) midt.appendChild(lav('p', 'arr-meta', meta));
    midt.appendChild(lav('p', 'arr-tilmeldt', tilmeldTekst(k)));
    r.appendChild(midt);

    /* Billedet, som det står på siden — så man kan se, hvilke der mangler et. */
    if (String(k.billede || '').trim()) {
      var foto = lav('img', 'arr-raekke-foto');
      foto.src = k.billede;
      foto.alt = '';
      foto.loading = 'lazy';
      r.appendChild(foto);
      r.classList.add('med-foto');
    }

    var knapper = lav('div', 'knap-raekke arr-knapper');
    knapper.appendChild(knap('Ret', 'arr-ret', function () { aabn(k); }));
    if (k.tilmelding || harTilmeldte(k.id)) {
      var n = taget(k.id);
      var tk = knap('Tilmeldte', 'arr-tilmeldte-knap', function () {
        if (Admin.visTilmeldinger) Admin.visTilmeldinger(k.id);
      });
      if (n) tk.appendChild(lav('span', 'arr-tal-chip', String(n)));
      knapper.appendChild(tk);
    }

    var mere = lav('div', 'arr-mere');
    var mk = lav('button', 'knap lille arr-mere-knap');
    mk.type = 'button';
    mk.setAttribute('aria-haspopup', 'true');
    mk.setAttribute('aria-expanded', 'false');
    mk.setAttribute('aria-label', 'Mere til «' + (k.titel || 'arrangementet') + '»');
    mk.textContent = '⋯';
    var menu = lav('div', 'arr-menu');
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    mk.addEventListener('click', function () {
      var var_aaben = !menu.hidden;
      lukMenu();
      if (var_aaben) return;
      menu.hidden = false;
      mk.setAttribute('aria-expanded', 'true');
      aabenMenu = menu;
    });
    function punkt(tekst, klasse, hvad) {
      var b = knap(tekst, klasse, function () { lukMenu(); hvad(); });
      b.setAttribute('role', 'menuitem');
      menu.appendChild(b);
      return b;
    }
    punkt('Kopiér', null, function () { kopier(k); });
    if (k.offentlig && !erForbi(k) && !k.aflyst) {
      var se = lav('a', 'knap lille', 'Se på siden ↗');
      se.href = 'h-kalender.html#arr-' + k.id;
      se.target = '_blank';
      se.rel = 'noopener';
      se.setAttribute('role', 'menuitem');
      menu.appendChild(se);
    }
    if (nyeKolonner() && !erForbi(k)) {
      if (k.aflyst) punkt('Genåbn', null, function () { genaabn(k); });
      else punkt('Aflys', 'fare-tekst', function () { aflys(k); });
    }
    /* ⚠️ SLET KUN UDEN TILMELDTE. Databasen afviser det alligevel
       (kalender_slet_vaern) — knappen siger det, før nogen prøver. */
    var slet = punkt('Slet', 'fare', function () { sletArr(k); });
    if (harTilmeldte(k.id)) {
      slet.disabled = true;
      slet.title = 'Der er tilmeldte. Aflys det i stedet — så står listen der stadig.';
      menu.appendChild(lav('p', 'arr-menu-hjaelp', 'Der er tilmeldte — aflys det i stedet, så står listen der stadig.'));
    }
    mere.appendChild(mk);
    mere.appendChild(menu);
    knapper.appendChild(mere);
    r.appendChild(knapper);
    return r;
  }

  // ----------------------------------------------------------
  //  AFLYS · GENÅBN · SLET
  // ----------------------------------------------------------
  function aflys(k) {
    var n = taget(k.id) + ventende(k.id);
    var hvorfor = window.prompt('Aflys "' + k.titel + '" ' + langDato(k.dato) + '?\n\n'
      + 'Det bliver stående på hjemmesiden med ordet «Aflyst», og ingen kan '
      + 'melde sig til.' + (n ? ' ' + n + ' har meldt sig til — de skal have besked.' : '')
      + '\n\nSkriv evt. hvorfor (står på siden), og tryk OK:', '');
    if (hvorfor === null) return;
    Admin.gem(Butik.skrive.kalender({ id: k.id, type: 'arrangement', titel: k.titel, dato: k.dato,
      slut_dato: k.slut_dato, emoji: k.emoji, offentlig: k.offentlig, beskrivelse: k.beskrivelse,
      aflyst: true, aflyst_tekst: hvorfor }),
    n ? 'Aflyst. Ring til de ' + n + ', der har meldt sig til — listen står på Tilmeldinger.' : 'Aflyst.');
  }

  function genaabn(k) {
    if (!window.confirm('Genåbn "' + k.titel + '"? Det står som før på hjemmesiden igen.')) return;
    Admin.gem(Butik.skrive.kalender({ id: k.id, type: 'arrangement', titel: k.titel, dato: k.dato,
      slut_dato: k.slut_dato, emoji: k.emoji, offentlig: k.offentlig, beskrivelse: k.beskrivelse,
      aflyst: false, aflyst_tekst: '' }), 'Genåbnet.');
  }

  function sletArr(k) {
    if (harTilmeldte(k.id)) return;
    if (!window.confirm('Slet "' + k.titel + '" helt?\n\nDet kan ikke fortrydes. '
      + 'Skal det bare ikke ske, så Aflys det — så kan gæsterne se, at det er aflyst.')) return;
    Admin.gem(Butik.skrive.sletKalender(k.id), 'Slettet.');
  }

  // ----------------------------------------------------------
  //  FORMULAREN
  // ----------------------------------------------------------
  function felt(id) { return $(id) || { value: '', checked: false }; }

  /* ---- ARKET ---------------------------------------------------
     Formularen dækker skærmen, mens den er åben (husets lag-aabent:
     siden bagved står stille, og bundbaren skjules). Ud igen med Luk,
     Escape eller et tryk ved siden af — de to sidste spørger først,
     hvis der er skrevet noget, der ikke er gemt. */
  var bag = null;
  var foer = '';                // formularen, som den stod, da den blev åbnet
  var fane = 'udfyld';

  function aftryk() { return JSON.stringify([udkast(), felt('arr-gentag').value, felt('arr-gentag-til').value,
    felt('arr-max').value, nytBillede === undefined ? null : nytBillede]); }
  function aendret() { return !$('arr-form-kort').hidden && aftryk() !== foer; }

  function visFane(f) {
    fane = f === 'se' ? 'se' : 'udfyld';
    $('arr-form-kort').setAttribute('data-fane', fane);
    trykket($('arr-form-faner'), 'data-fane', fane);
    if (fane === 'se') sendUdkast();
  }

  function visForm(titel) {
    var kort = $('arr-form-kort');
    kort.hidden = false;
    $('arr-form-titel').textContent = titel;
    if (!bag) {
      bag = lav('div', 'arr-ark-bag');
      bag.addEventListener('click', function () { luk(true); });
      kort.parentNode.insertBefore(bag, kort);
    }
    bag.hidden = false;
    document.body.classList.add('lag-aabent', 'arr-ark-aaben');
    kort.scrollTop = 0;
    visFane('udfyld');
    sikrRamme();
  }

  function luk(spoerg) {
    if (spoerg === true && aendret()
      && !window.confirm('Luk uden at gemme? Det, du har skrevet, bliver ikke gemt.')) return;
    $('arr-form-kort').hidden = true;
    if (bag) bag.hidden = true;
    document.body.classList.remove('arr-ark-aaben');
    /* Kalenderens dag-lag bruger også lag-aabent — lad det stå, hvis det er åbent. */
    if (!document.querySelector('.dag-lag:not([hidden])')) document.body.classList.remove('lag-aabent');
    retter = null;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (aabenMenu) return lukMenu();
    if (!$('arr-form-kort').hidden) luk(true);
  });

  function fyld(k) {
    felt('arr-titel').value = k ? k.titel || '' : '';
    felt('arr-beskrivelse').value = k ? k.beskrivelse || '' : '';
    felt('arr-pris').value = k ? k.pris_tekst || '' : '';
    felt('arr-dato').value = k ? k.dato || '' : '';
    felt('arr-start').value = k && k.start_kl ? String(k.start_kl).slice(0, 5) : '';
    felt('arr-slut').value = k && k.slut_kl ? String(k.slut_kl).slice(0, 5) : '';
    felt('arr-pladser').value = k && k.pladser ? k.pladser : '';
    felt('arr-max').value = k && k.max_pr_tilmelding ? k.max_pr_tilmelding : '';
    felt('arr-frist').value = k && k.tilmelding_lukker_timer !== null && k.tilmelding_lukker_timer !== undefined
      ? String(k.tilmelding_lukker_timer) : '';
    felt('arr-venteliste').checked = !!(k && k.venteliste);
    felt('arr-gentag').value = '';
    felt('arr-gentag-til').value = '';
    valg.kategori = k ? (k.kategori || '') : '';
    valg.sted_id = k && k.sted_id !== undefined ? k.sted_id : null;
    valg.maade = !k ? 'kig' : k.bord_booking ? 'bord' : k.tilmelding ? 'tilmelding' : 'kig';
    nytBillede = undefined;
    visBillede(k ? k.billede || '' : '');
    if ($('arr-billede-status')) $('arr-billede-status').textContent = '';
  }

  function ny(forslag) {
    Admin.visFane('p-arrangementer');
    retter = null;
    fyld(null);
    if (forslag && forslag.dato) felt('arr-dato').value = forslag.dato;
    $('arr-gentag-felt').hidden = false;
    visForm('Nyt arrangement');
    tegnForm();
    foer = aftryk();
    try { $('arr-titel').focus({ preventScroll: true }); } catch (e) { $('arr-titel').focus(); }
  }

  function aabn(k) {
    Admin.visFane('p-arrangementer');
    retter = k;
    fyld(k);
    $('arr-gentag-felt').hidden = true;
    visForm('Ret "' + (k.titel || 'arrangementet') + '"');
    tegnForm();
    foer = aftryk();
  }

  /* KOPIÉR: alt det samme — undtagen datoen, som er det, der er nyt. */
  function kopier(k) {
    Admin.visFane('p-arrangementer');
    retter = null;
    fyld(k);
    felt('arr-dato').value = '';
    /* Billedet følger med: det ER det samme arrangement en anden dag. */
    nytBillede = k.billede || undefined;
    $('arr-gentag-felt').hidden = false;
    visForm('Kopi af "' + (k.titel || 'arrangementet') + '"');
    tegnForm();
    foer = '';                  // en kopi er ikke gemt, før den er gemt
    try { $('arr-dato').focus({ preventScroll: true }); } catch (e) { $('arr-dato').focus(); }
  }

  Admin.arrangementer = {
    ny: ny,
    aabn: function (id) {
      var k = alle().filter(function (x) { return String(x.id) === String(id); })[0];
      if (k) aabn(k); else ny();
    },
  };

  /* ---- Valgene som knapper (husets .adm-seg) ---------------- */
  function trykket(boks, attr, vaerdi) {
    Array.prototype.forEach.call(boks.querySelectorAll('[' + attr + ']'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute(attr)) === String(vaerdi) ? 'true' : 'false');
    });
  }

  function tegnSteder() {
    var boks = $('arr-steder');
    var afsnit = $('arr-sted-afsnit');
    if (!boks || !afsnit) return;
    afsnit.hidden = !nyeKolonner();
    Admin.tøm(boks);
    var liste = Butik.steder(d()).filter(function (s) {
      return s.aktiv !== false || String(s.id) === String(valg.sted_id);
    });
    var ingen = lav('button', null, 'Ikke sagt');
    ingen.type = 'button';
    ingen.setAttribute('data-sted', '');
    boks.appendChild(ingen);
    liste.forEach(function (s) {
      var b = lav('button', null, s.navn);
      b.type = 'button';
      b.setAttribute('data-sted', String(s.id));
      boks.appendChild(b);
    });
    trykket(boks, 'data-sted', valg.sted_id === null || valg.sted_id === undefined ? '' : valg.sted_id);
  }

  var MAADE_HJAELP = {
    kig: 'Ingen formular. På siden står «Kig bare forbi, ingen tilmelding».',
    tilmelding: 'Gæsterne skriver sig på med navn, telefon og antal. Listen står på Tilmeldinger.',
    bord: 'Knappen på siden er «Book bord» og sender gæsten til bordbookingen med dagen valgt.',
  };

  function tegnForm() {
    trykket($('arr-kategori'), 'data-kat', valg.kategori);
    trykket($('arr-maade'), 'data-maade', valg.maade);
    var bordMaade = $('arr-maade').querySelector('[data-maade="bord"]');
    if (bordMaade) bordMaade.hidden = !nyeKolonner();
    if (!nyeKolonner() && valg.maade === 'bord') valg.maade = 'kig';
    $('arr-maade-hjaelp').textContent = MAADE_HJAELP[valg.maade] || '';
    $('arr-tilmeld-felter').hidden = valg.maade !== 'tilmelding';
    $('arr-frist-felt').hidden = !nyeKolonner();
    $('arr-venteliste-felt').hidden = !nyeKolonner();
    $('arr-max').closest('.felt').hidden = !nyeKolonner();
    /* Venteliste uden et loft er en liste, ingen kommer på. */
    var loft = felt('arr-pladser').value !== '';
    felt('arr-venteliste').disabled = !loft;
    if (!loft) felt('arr-venteliste').checked = false;
    tegnSteder();
    tegnGentag();
    tegnForhaand();
    tegnAdvarsler();
    tegnKnapper();
  }

  function tegnKnapper() {
    var udgiv = $('arr-udgiv');
    var kladde = $('arr-kladde');
    if (retter && retter.offentlig) {
      udgiv.textContent = 'Gem ændringer';
      kladde.textContent = 'Træk tilbage til kladde';
    } else if (retter) {
      udgiv.textContent = 'Udgiv på hjemmesiden';
      kladde.textContent = 'Gem kladden';
    } else {
      udgiv.textContent = datoerne().length > 1 ? 'Udgiv alle ' + datoerne().length : 'Udgiv på hjemmesiden';
      kladde.textContent = 'Gem som kladde';
    }
  }

  /* ---- GENTAG ------------------------------------------------- */
  function datoerne() {
    var foerste = felt('arr-dato').value;
    if (!foerste) return [];
    if (retter) return [foerste];
    var skridt = Number(felt('arr-gentag').value || 0);
    var til = felt('arr-gentag-til').value;
    if (!skridt || !til || til < foerste) return [foerste];
    var ud = [];
    for (var x = foerste; x <= til && ud.length < MAKS_GENTAG; x = plusDage(x, skridt)) ud.push(x);
    return ud;
  }

  function tegnGentag() {
    var skridt = felt('arr-gentag').value;
    var tilFelt = $('arr-gentag-til-felt');
    if (tilFelt) tilFelt.hidden = !skridt || !!retter;
    var liste = $('arr-gentag-liste');
    if (!liste) return;
    var dd = datoerne();
    if (retter || dd.length < 2) { liste.hidden = true; return; }
    liste.hidden = false;
    liste.textContent = 'Laver ' + dd.length + ' arrangementer: '
      + dd.map(kortDato).join(', ') + (dd.length >= MAKS_GENTAG ? ' (højst ' + MAKS_GENTAG + ')' : '')
      + '. Hver kan rettes og aflyses for sig bagefter.';
  }

  /* ---- FORHÅNDSVISNINGEN --------------------------------------- */
  function udkast() {
    return {
      id: retter ? retter.id : 0,
      type: 'arrangement',
      titel: felt('arr-titel').value.trim(),
      dato: felt('arr-dato').value,
      start_kl: felt('arr-start').value || null,
      slut_kl: felt('arr-slut').value || null,
      beskrivelse: felt('arr-beskrivelse').value.trim(),
      pris_tekst: felt('arr-pris').value.trim(),
      kategori: valg.kategori || null,
      sted_id: valg.sted_id,
      tilmelding: valg.maade === 'tilmelding',
      bord_booking: valg.maade === 'bord',
      pladser: valg.maade === 'tilmelding' && felt('arr-pladser').value !== '' ? Number(felt('arr-pladser').value) : null,
      venteliste: valg.maade === 'tilmelding' && felt('arr-venteliste').checked,
      tilmelding_lukker_timer: valg.maade === 'tilmelding' && felt('arr-frist').value !== '' ? Number(felt('arr-frist').value) : null,
      billede: nytBillede !== undefined ? nytBillede : (retter ? retter.billede : null),
      aflyst: retter ? !!retter.aflyst : false,
      aflyst_tekst: retter ? retter.aflyst_tekst : null,
      offentlig: retter ? retter.offentlig : false,
    };
  }

  /* ---- FORHÅNDSVISNINGEN ---------------------------------------
     ⚠️ KALENDERSIDENS KORT ER SIDENS EGET  (26/10). Før stod der en
     efterligning her — hvide kort med rund skrift — mens siden har
     opslag på kork med en rød billet og Bebas-overskrifter. Arrangøren
     så ikke det, gæsten ser. Nu er det h-kalender.html i en ramme, og
     udkastet sendes derind (js/skal/kalender.js tegner det med sin
     egen kode). Intet gemmes af det. */
  var ramme = null;
  var rammeKlar = false;
  function sikrRamme() {
    var boks = $('arr-forhaand');
    if (!boks || ramme) return;
    ramme = lav('iframe', 'arr-ramme');
    ramme.title = 'Kalendersiden, som gæsten ser den';
    ramme.setAttribute('loading', 'eager');
    ramme.src = 'h-kalender.html?forhaand=1';
    boks.appendChild(ramme);
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !ramme || e.source !== ramme.contentWindow) return;
    if (!e.data || e.data.type !== 'mosede-arr-klar') return;
    rammeKlar = true;
    sendUdkast();
  });
  var sendTimer = 0;
  function sendUdkast() {
    if (!ramme || !rammeKlar || $('arr-form-kort').hidden) return;
    clearTimeout(sendTimer);
    sendTimer = setTimeout(function () {
      var k = udkast();
      try { ramme.contentWindow.postMessage({ type: 'mosede-arr-forhaand', k: k }, location.origin); } catch (e) { /* rammen er væk */ }
    }, 120);
  }

  /* Forsiden viser kun ÉT arrangement: det næste (js/skal/forside.js,
     visMusik). Er det ikke dette, siger vi hvilket — ellers tror
     arrangøren, at det står der. */
  function naesteFoer(k) {
    var iDagIso = iDag();
    return alle().filter(function (x) {
      if (retter && String(x.id) === String(retter.id)) return false;
      return x.offentlig && !x.aflyst && (x.slut_dato || x.dato) >= iDagIso;
    }).concat(k.dato && !k.aflyst ? [k] : []).sort(function (a, b) {
      if (a.dato !== b.dato) return a.dato < b.dato ? -1 : 1;
      return String(a.start_kl || '') < String(b.start_kl || '') ? -1 : 1;
    })[0] || null;
  }

  function tegnForhaand() {
    var forside = $('arr-forhaand-forside');
    var note = $('arr-forhaand-note');
    sendUdkast();
    if (!forside) return;
    var k = udkast();
    Admin.tøm(forside);
    if (note) {
      note.textContent = !k.titel || !k.dato ? 'Skriv en titel og vælg en dato — så hænger det på tavlen.'
        : k.offentlig ? 'Tryk på opslaget for at se det hele, som gæsten ser det.'
          : 'Står ikke på siden, før det er udgivet. Tryk på opslaget for at se det hele.';
    }

    /* Forsidens banner: mørkt glas med rødt lys, tegnet og «Se kalenderen →». */
    var f = lav('div', 'arr-kv-forside');
    var tegn = lav('span', 'arr-kv-forside-tegn');
    tegn.setAttribute('aria-hidden', 'true');
    if (Butik.arrangementSlags(k) === 'musik') {
      var eq = lav('span', 'arr-kv-eq');
      for (var i = 0; i < 4; i++) eq.appendChild(lav('i'));
      tegn.appendChild(eq);
    } else {
      tegn.textContent = { spisning: '🍽', fest: '🎉' }[Butik.arrangementSlags(k)] || '⚓';
    }
    f.appendChild(tegn);
    var tekst = lav('div', 'arr-kv-forside-tekst');
    tekst.appendChild(lav('b', null, (k.titel || 'Titlen') + (k.dato ? ' · ' + langDato(k.dato).replace(' ', ' d. ') : '')));
    if (k.beskrivelse) tekst.appendChild(lav('p', null, Butik.kortFortalt(k.beskrivelse)));
    tekst.appendChild(lav('span', 'arr-kv-forside-cta', 'Se kalenderen →'));
    f.appendChild(tekst);
    forside.appendChild(f);

    var n = naesteFoer(k);
    var hvad;
    if (k.aflyst) hvad = 'Et aflyst arrangement står ikke på forsiden.';
    else if (!k.dato) hvad = 'Forsiden viser det næste arrangement.';
    else if (n === k) hvad = k.offentlig ? 'Det er det næste — så det står på forsiden.'
      : 'Det bliver det næste — så det kommer på forsiden, når det er udgivet.';
    else if (n) hvad = 'Forsiden viser kun det næste arrangement. Lige nu er det «' + n.titel + '» ('
      + kortDato(n.dato) + '); dette kommer frem, når det er overstået.';
    else hvad = 'Forsiden viser det næste arrangement.';
    forside.appendChild(lav('p', 'hjaelp arr-forside-hvad', hvad));
  }

  /* ---- HVAD RAMMER DATOEN? ------------------------------------- */
  function overlapper(a, b) {
    var a0 = minutter(a.start_kl), a1 = minutter(a.slut_kl), b0 = minutter(b.start_kl), b1 = minutter(b.slut_kl);
    /* Uden klokkeslæt er det hele dagen. */
    if (a0 === null || b0 === null) return true;
    if (a1 === null) a1 = 24 * 60;
    if (b1 === null) b1 = 24 * 60;
    return a0 < b1 && b0 < a1;
  }

  function sammeSted(a, b) {
    if (a.sted_id === null || a.sted_id === undefined || b.sted_id === null || b.sted_id === undefined) return false;
    if (String(a.sted_id) === String(b.sted_id)) return true;
    var sa = sted(a.sted_id), sb = sted(b.sted_id);
    return !!((sa && sa.hele_stedet) || (sb && sb.hele_stedet));
  }

  function advarsler() {
    var k = udkast();
    var ud = [];
    var dd = datoerne();
    dd.forEach(function (iso) {
      var paa = Object.assign({}, k, { dato: iso });
      var hvornaar = dd.length > 1 ? langDato(iso) + ': ' : '';
      var luk = Butik.lukketDen(d(), iso);
      /* ⚠️ `aarsag`, IKKE `titel`: d.lukkedage er kalenderens UDGAVE
         (afledLukkedage i store.js), og dér hedder titlen den gamle
         tabels ord. Første udgave læste `titel` og viste aldrig navnet —
         kalender-lukning.spec.js fangede det. */
      var lukNavn = luk && (luk.aarsag || luk.titel);
      if (luk) ud.push(hvornaar + 'Caféen er lukket den dag' + (lukNavn ? ' («' + lukNavn + '»)' : '') + '.');
      var s = sted(k.sted_id);
      if (s && (s.baglokale || s.hele_stedet) && optagne.some(function (o) {
        return o.dato === iso && (o.slags === 'udlejning' || o.slags === 'baglokale');
      })) ud.push(hvornaar + 'Baglokalet er udlejet den dag.');
      alle().forEach(function (x) {
        if (retter && String(x.id) === String(retter.id)) return;
        if (x.aflyst || x.dato !== iso) return;
        if (sammeSted(paa, x) && overlapper(paa, x)) {
          ud.push(hvornaar + 'Rammer «' + x.titel + '» samme sted'
            + (x.start_kl ? ' (' + tid(x) + ')' : '') + '.');
        }
      });
    });
    return ud;
  }

  function tegnAdvarsler() {
    var boks = $('arr-advarsler');
    if (!boks) return;
    Admin.tøm(boks);
    advarsler().slice(0, 8).forEach(function (t) { boks.appendChild(lav('p', 'arr-advarsel', '⚠️ ' + t)); });
  }

  /* ---- GEM ------------------------------------------------------ */
  function fejl() {
    var k = udkast();
    if (!k.titel) return 'Skriv en titel — den står på listen og på forsiden.';
    if (!k.dato) return 'Vælg en dato.';
    if (!retter && k.dato < iDag()) return 'Datoen er overstået. Vælg en dag fra i dag og frem.';
    if (k.tilmelding && !k.start_kl) {
      return 'Skriv et klokkeslæt for, hvornår det starter — gæsterne, der melder sig til, skal vide, hvornår de skal være der.';
    }
    if (k.start_kl && k.slut_kl && minutter(k.slut_kl) <= minutter(k.start_kl)) {
      return 'Sluttiden skal ligge efter starttiden.';
    }
    if (felt('arr-gentag').value && !retter) {
      var til = felt('arr-gentag-til').value;
      if (!til) return 'Vælg, hvornår gentagelsen slutter («Til og med»).';
      if (til < k.dato) return '«Til og med» ligger før den første dato.';
    }
    if (k.tilmelding && felt('arr-max').value !== '') {
      var m = Number(felt('arr-max').value);
      if (!(m >= 1 && m <= 100)) return 'Højst pr. tilmelding skal være mellem 1 og 100.';
    }
    if (k.pladser !== null && !(k.pladser >= 1 && k.pladser <= 2000)) {
      return 'Pladser skal være mellem 1 og 2000 — eller tomt for ingen grænse.';
    }
    return '';
  }

  function nyttSerieId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var h = '';
    for (var i = 0; i < 32; i++) h += Math.floor(Math.random() * 16).toString(16);
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-4' + h.slice(13, 16) + '-a' + h.slice(17, 20) + '-' + h.slice(20, 32);
  }

  function raekkeTil(iso, offentlig, serie) {
    var k = udkast();
    var r = {
      id: retter ? retter.id : undefined,
      type: 'arrangement',
      titel: k.titel,
      dato: iso,
      slut_dato: retter ? retter.slut_dato || null : null,
      emoji: retter ? retter.emoji || '' : '',
      offentlig: offentlig,
      beskrivelse: k.beskrivelse,
      start_kl: k.start_kl,
      slut_kl: k.slut_kl,
      kategori: k.kategori,
      tilmelding: k.tilmelding,
      pladser: k.pladser,
      pris_tekst: k.pris_tekst || null,
      /* ⚠️ undefined = "ingen har rørt billedet": så sendes kolonnen
         slet ikke, og en rettelse af titlen tager ikke fotoet med sig. */
      billede: nytBillede,
    };
    if (nyeKolonner()) {
      r.sted_id = k.sted_id === undefined ? null : k.sted_id;
      r.bord_booking = k.bord_booking;
      r.venteliste = k.venteliste;
      r.max_pr_tilmelding = k.tilmelding && felt('arr-max').value !== '' ? Number(felt('arr-max').value) : null;
      r.tilmelding_lukker_timer = k.tilmelding_lukker_timer;
      if (serie) r.serie = serie;
    }
    return r;
  }

  function gem(offentlig) {
    var f = fejl();
    if (f) return Admin.brøl(f);
    var adv = advarsler();
    if (adv.length && !window.confirm(adv.slice(0, 6).join('\n')
      + '\n\nGem alligevel?')) return;

    var dd = datoerne();
    var loefte;
    if (retter) {
      loefte = Butik.skrive.kalender(raekkeTil(dd[0], offentlig));
    } else if (dd.length > 1) {
      var serie = nyttSerieId();
      loefte = Butik.skrive.kalenderSerie(dd.map(function (iso) { return raekkeTil(iso, offentlig, serie); }));
    } else {
      loefte = Butik.skrive.kalender(raekkeTil(dd[0], offentlig));
    }

    var ok = false;
    var besked = retter
      ? (offentlig ? 'Gemt — det står på hjemmesiden.' : 'Gemt som kladde — det står ikke på siden.')
      : (offentlig ? (dd.length > 1 ? dd.length + ' arrangementer er udgivet.' : 'Udgivet — det står på hjemmesiden nu.')
        : (dd.length > 1 ? dd.length + ' kladder er gemt.' : 'Gemt som kladde.'));
    Admin.gem(loefte.then(function () { ok = true; }), besked).then(function () {
      if (!ok) return;
      vis = offentlig ? 'kommende' : 'kladder';
      luk();
      tegnListe();
    });
  }

  /* ---- BILLEDET — samme spand og komprimering som kalenderen ---- */
  function visBillede(url) {
    var boks = $('arr-billede-vis');
    var foto = $('arr-billede-foto');
    if (!boks || !foto) return;
    boks.hidden = !url;
    foto.src = url || '';
    if ($('arr-billede-flise')) $('arr-billede-flise').hidden = !!url;
  }

  function lægOp(fil) {
    if (!fil) return;
    var status = $('arr-billede-status');
    if (!/^image\//.test(fil.type || '')) {
      if (status) status.textContent = 'Det er ikke et billede. Vælg et foto (jpg, png eller lignende).';
      return;
    }
    var flise = $('arr-billede-flise');
    if (flise) flise.classList.add('arbejder');
    if (status) status.textContent = 'Lægger billedet op…';
    Butik.skrive.nyhedBillede(fil).then(function (url) {
      nytBillede = url;
      visBillede(url);
      if (status) status.textContent = 'Billedet er lagt op. Husk at gemme.';
      tegnForhaand();
    }).catch(function (e) {
      if (status) status.textContent = 'Billedet kunne ikke lægges op: ' + (e.message || e);
    }).then(function () {
      if (flise) flise.classList.remove('arbejder');
    });
  }
  if ($('arr-billede')) {
    $('arr-billede').addEventListener('change', function () {
      lægOp(this.files && this.files[0]);
      this.value = '';
    });
  }
  if ($('arr-billede-flise')) {
    var flise = $('arr-billede-flise');
    ['dragenter', 'dragover'].forEach(function (h) {
      flise.addEventListener(h, function (e) { e.preventDefault(); flise.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (h) {
      flise.addEventListener(h, function () { flise.classList.remove('over'); });
    });
    flise.addEventListener('drop', function (e) {
      e.preventDefault();
      lægOp(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
    });
  }
  if ($('arr-billede-fjern')) {
    $('arr-billede-fjern').addEventListener('click', function () {
      nytBillede = '';
      visBillede('');
      tegnForhaand();
    });
  }

  // ----------------------------------------------------------
  //  STEDERNE — omdøb, skjul, tilføj
  // ----------------------------------------------------------
  function tegnStedListe() {
    var boks = $('arr-steder-liste');
    if (!boks) return;
    Admin.tøm(boks);
    Butik.steder(d()).forEach(function (s) {
      var r = lav('div', 'admin-raekke arr-sted-raekke' + (s.aktiv === false ? ' skjult-sted' : ''));
      var inp = lav('input', 'navn');
      inp.type = 'text';
      inp.maxLength = 60;
      inp.value = s.navn || '';
      inp.setAttribute('aria-label', 'Navnet på ' + (s.navn || 'stedet'));
      inp.setAttribute('data-sted-navn', String(s.id));
      r.appendChild(inp);
      if (s.hele_stedet) r.appendChild(lav('span', 'hjaelp', 'rammer alle de andre'));
      if (s.baglokale) r.appendChild(lav('span', 'hjaelp', 'tjekkes mod udlejningen'));
      r.appendChild(knap('Gem navnet', null, function () {
        var navn = inp.value.trim();
        if (navn === s.navn) return;
        Admin.gem(Butik.skrive.sted({ id: s.id, navn: navn }), 'Stedet hedder nu ' + navn + '.');
      }));
      r.appendChild(knap(s.aktiv === false ? 'Vis igen' : 'Skjul', null, function () {
        Admin.gem(Butik.skrive.sted({ id: s.id, aktiv: s.aktiv === false }),
          s.aktiv === false ? s.navn + ' kan vælges igen.' : s.navn + ' er skjult — gamle arrangementer beholder det.');
      }));
      boks.appendChild(r);
    });
  }

  /* To veje ind: fra formularen ("Hvor på havnen") og under listen.
     Første udgave havde kun den i formularen — prøven, der skulle
     omdøbe et sted, kunne ikke finde knappen, før den lavede et
     arrangement, den ikke ville lave. */
  ['arr-ret-steder', 'arr-ret-steder-liste'].forEach(function (id) {
    if (!$(id)) return;
    $(id).addEventListener('click', function () {
      var kort = $('arr-steder-kort');
      kort.hidden = !kort.hidden;
      tegnStedListe();
      if (!kort.hidden && kort.scrollIntoView) kort.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  if ($('arr-sted-tilfoej')) {
    $('arr-sted-tilfoej').addEventListener('click', function () {
      var navn = felt('arr-sted-navn').value.trim();
      if (!navn) return Admin.brøl('Skriv stedets navn.');
      Admin.gem(Butik.skrive.sted({ navn: navn }), navn + ' er tilføjet.').then(function () {
        felt('arr-sted-navn').value = '';
      });
    });
  }

  // ----------------------------------------------------------
  //  LYTTERNE
  // ----------------------------------------------------------
  $('arr-ny').addEventListener('click', function () { ny(); });
  $('arr-luk').addEventListener('click', function () { luk(); });
  $('arr-form-faner').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-fane]');
    if (b) visFane(b.getAttribute('data-fane'));
  });
  $('arr-udgiv').addEventListener('click', function () {
    gem(true);
  });
  $('arr-kladde').addEventListener('click', function () {
    gem(false);
  });
  $('arr-filter').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-vis]');
    if (!b) return;
    vis = b.getAttribute('data-vis');
    tegnListe();
  });
  $('arr-soeg').addEventListener('input', function () {
    soeg = this.value;
    tegnListe();
  });
  $('arr-kategori').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-kat]');
    if (!b) return;
    var v = b.getAttribute('data-kat');
    valg.kategori = valg.kategori === v ? '' : v;
    tegnForm();
  });
  $('arr-steder').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-sted]');
    if (!b) return;
    var v = b.getAttribute('data-sted');
    valg.sted_id = v === '' ? null : Number(v);
    tegnForm();
  });
  $('arr-maade').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-maade]');
    if (!b) return;
    valg.maade = b.getAttribute('data-maade');
    tegnForm();
  });
  ['arr-titel', 'arr-beskrivelse', 'arr-pris', 'arr-dato', 'arr-start', 'arr-slut', 'arr-pladser',
    'arr-max', 'arr-frist', 'arr-venteliste', 'arr-gentag', 'arr-gentag-til'].forEach(function (id) {
    var e = $(id);
    if (!e) return;
    e.addEventListener('input', tegnForm);
    e.addEventListener('change', tegnForm);
  });

  function hentOptagne() {
    if (!Butik.hentOptagneDage) return;
    Butik.hentOptagneDage().then(function (l) {
      optagne = l || [];
      if (!$('arr-form-kort').hidden) tegnAdvarsler();
    }).catch(function () { optagne = []; });
  }

  /* ---- OVERBLIKKET: DET NÆSTE PÅ HAVNEN  (26/10) ---------------- */
  function tegnOverblik() {
    var kort = $('ob-arr-kort');
    var boks = $('ob-arr');
    if (!kort || !boks) return;
    var til = plusDage(iDag(), 14);
    var kommende = alle().filter(function (k) {
      return k.offentlig && !erForbi(k) && k.dato <= til;
    }).sort(function (a, b) {
      var x = (a.dato || '') + (a.start_kl || ''), y = (b.dato || '') + (b.start_kl || '');
      return x < y ? -1 : 1;
    });
    var kladder = alle().filter(function (k) { return gruppe(k) === 'kladder'; }).length;
    Admin.tøm(boks);
    kort.classList.toggle('skjult', !kommende.length && !kladder);
    kommende.slice(0, 4).forEach(function (k) {
      var r = lav('button', 'ob-arr-raekke' + (k.aflyst ? ' aflyst' : ''));
      r.type = 'button';
      var dag = lav('span', 'arr-dag');
      dag.appendChild(lav('span', 'arr-ugedag', ugedag(k.dato)));
      dag.appendChild(lav('b', null, String(Number(String(k.dato).slice(8, 10)))));
      dag.appendChild(lav('span', 'arr-md', (MAANEDER[Number(String(k.dato).slice(5, 7)) - 1] || '').slice(0, 3)));
      r.appendChild(dag);
      var midt = lav('span', 'ob-arr-midt');
      midt.appendChild(lav('b', 'ob-arr-titel', (k.aflyst ? 'Aflyst: ' : '') + k.titel));
      var meta = [k.dato === iDag() ? 'I dag' : '', tid(k), stedNavn(k)].filter(Boolean).join(' · ');
      if (meta) midt.appendChild(lav('span', 'ob-arr-meta', meta));
      midt.appendChild(lav('span', 'ob-arr-tilmeldt', tilmeldTekst(k)));
      r.appendChild(midt);
      r.addEventListener('click', function () { aabn(k); });
      boks.appendChild(r);
    });
    if (kommende.length > 4) boks.appendChild(lav('p', 'hjaelp', '… og ' + (kommende.length - 4) + ' mere de næste 14 dage.'));
    if (!kommende.length) boks.appendChild(lav('p', 'hjaelp', 'Intet udgivet de næste 14 dage.'));
    if (kladder) {
      var kl = lav('button', 'knap-tekst ob-arr-kladder', kladder === 1
        ? '1 kladde står ikke på siden endnu →' : kladder + ' kladder står ikke på siden endnu →');
      kl.type = 'button';
      kl.addEventListener('click', function () { vis = 'kladder'; Admin.visFane('p-arrangementer'); tegnListe(); });
      boks.appendChild(kl);
    }
  }
  if ($('ob-til-arr')) {
    $('ob-til-arr').addEventListener('click', function () { vis = 'kommende'; Admin.visFane('p-arrangementer'); tegnListe(); });
  }

  function tegnAlt() {
    tegnOverblik();
    tegnListe();
    if (!$('arr-form-kort').hidden) tegnForm();
    if (!$('arr-steder-kort').hidden) tegnStedListe();
  }

  /* Skifter admin fane (klokken, «Find en sag», kalenderens dag), må
     arket ikke blive hængende over den nye fane. */
  if (Admin.efterFane) {
    Admin.efterFane.push(function (id) {
      if (id !== 'p-arrangementer' && !$('arr-form-kort').hidden) luk();
    });
  }

  Admin.tegnere.push(tegnAlt);
  Admin.efterHent.push(tegnAlt);
  Admin.hentVedFane('p-arrangementer', function () {
    hentOptagne();
    tegnAlt();
    return Admin.hentTilmeldinger ? Admin.hentTilmeldinger().then(tegnListe) : null;
  });
}());
