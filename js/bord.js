/* ------------------------------------------------------------
   Bordformularen: spørg om et bord, personalet bekræfter.

   Den tredje formular på hjemmesiden, og den er bygget som de to
   andre med vilje — samme fejlvisning, samme kvittering, samme
   regel om hvad der IKKE gemmes i browseren.

   TO TING SKILLER DEN FRA FORESPØRGSLEN:

   1) Dato, klokkeslæt og antal er PÅKRÆVEDE. "Vi vil gerne have
      et bord engang" er ikke noget, personalet kan svare på — et
      bord ER en dato, et klokkeslæt og et antal stole.

   2) Den henter Butik.hent(). Dagene regnes ud af åbningstiderne
      og kalenderen, så gæsten ikke kan spørge om et bord på en
      lukkedag — og en tidlig lukning skærer aftenens tider af.
      Det er hele grunden til, at kalenderen blev bygget først.

   OG ÉN TING ER DEN SAMME SOM ALTID: kvitteringen lover IKKE et
   bord. Ja'et gives kun i admin, hvor personalet ser hele dagens
   billede. Her står der "vi ringer og bekræfter" — og det gør de.
   ------------------------------------------------------------ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function tøm(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function lav(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = String(tekst);
    return e;
  }

  var data = null;
  var valgtDag = null;

  // ----------------------------------------------------------
  //  HVILKE DAGE OG TIDER KAN MAN SPØRGE OM?
  //  Samme regnestykke som i js/bestilling.js: der findes ikke en
  //  fri dato. En datovælger med alle årets dage ville lade gæsten
  //  spørge om et bord den 1. januar.
  // ----------------------------------------------------------
  var DAGE_FREM = 28;

  function isoPlus(iso, dage) {
    // Middag i UTC: så flytter et døgn ikke datoen ved sommertid
    var t = new Date(iso + 'T12:00:00Z');
    t.setUTCDate(t.getUTCDate() + dage);
    return t.toISOString().slice(0, 10);
  }

  function ugedagFor(iso) {
    var d = new Date(iso + 'T12:00:00Z').getUTCDay();
    return (d + 6) % 7;
  }

  function planFor(d, iso) {
    if (Butik.lukketDen(d, iso)) return null;
    var p = (d.aabningstider || []).filter(function (a) {
      return a.ugedag === ugedagFor(iso);
    })[0];
    if (!p || p.lukket) return null;
    if (!p.aabner || !p.lukker) return null;
    return p;
  }

  /* To timers varsel, med mindre admin siger andet. Ikke 24 som
     smørrebrødet — et bord til i aften er hele pointen — men heller
     ikke nul: personalet skal nå at SE ønsket og ringe tilbage,
     inden gæsten står ved lugen. */
  function varselTimer(d) {
    var v = Number((d.indstillinger || {}).bord_varsel_timer);
    return isFinite(v) && v >= 0 ? v : 2;
  }

  function tidligst(d) {
    var nu = Butik.nu();
    var minutter = nu.minutter + varselTimer(d) * 60;
    var dato = nu.dato;
    while (minutter >= 24 * 60) { minutter -= 24 * 60; dato = isoPlus(dato, 1); }
    return { dato: dato, minutter: minutter };
  }

  /* Tiderne på en dag: hver halve time, sidste tid en halv time før
     der lukkes. En TIDLIG LUKNING fra kalenderen skærer aftenen af:
     lukker lugen 15 i stedet for 21, skal 19.30 ikke kunne vælges —
     det ville være et ønske, personalet kun kan sige nej til. */
  function tiderFor(d, iso) {
    var p = planFor(d, iso);
    if (!p) return [];

    var fra = Butik.tilMinutter(p.aabner);
    var til = Butik.tilMinutter(p.lukker);

    var tidligt = Butik.tilMinutter(Butik.tidligLukning(d, iso));
    if (tidligt !== null && tidligt < til) til = tidligt;
    til -= 30;

    var t = tidligst(d);
    if (iso === t.dato) fra = Math.max(fra, Math.ceil(t.minutter / 30) * 30);

    var ud = [];
    for (var m = fra; m <= til; m += 30) {
      ud.push(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2));
    }
    return ud;
  }

  function muligeDage(d) {
    var t = tidligst(d);
    var ud = [];
    for (var i = 0; i < DAGE_FREM && ud.length < 14; i++) {
      var iso = isoPlus(t.dato, i);
      if (tiderFor(d, iso).length) ud.push(iso);
    }
    return ud;
  }

  var MAANED = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'juni',
    'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];

  function dagNavn(d, iso) {
    var nu = Butik.nu();
    if (iso === nu.dato) return 'I dag';
    if (iso === isoPlus(nu.dato, 1)) return 'I morgen';
    return Butik.UGEDAGE[ugedagFor(iso)];
  }

  function dagDato(iso) {
    var t = new Date(iso + 'T12:00:00Z');
    return t.getUTCDate() + '. ' + MAANED[t.getUTCMonth()];
  }

  // ----------------------------------------------------------
  //  TEGN
  // ----------------------------------------------------------
  function visDage() {
    var boks = $('bord-dage');
    tøm(boks);

    var dage = muligeDage(data);
    if (!dage.length) {
      boks.appendChild(lav('p', 'desc',
        'Vi kan ikke se nogen åbne dage lige nu. Ring til os, så finder vi ud af det.'));
      return;
    }

    if (dage.indexOf(valgtDag) === -1) valgtDag = dage[0];

    dage.forEach(function (iso) {
      var b = lav('button', 'dag' + (iso === valgtDag ? ' valgt' : ''));
      b.type = 'button';
      b.setAttribute('aria-pressed', iso === valgtDag ? 'true' : 'false');
      b.appendChild(lav('span', 'dag-navn', dagNavn(data, iso)));
      b.appendChild(lav('span', 'dag-dato', dagDato(iso)));
      b.addEventListener('click', function () {
        valgtDag = iso;
        visDage();
        visTider();
      });
      boks.appendChild(b);
    });
  }

  function visTider() {
    var vaelg = $('bord-tid');
    var foer = vaelg.value;
    tøm(vaelg);

    tiderFor(data, valgtDag).forEach(function (t) {
      var o = document.createElement('option');
      o.value = t;
      o.textContent = 'kl. ' + t.replace(':', '.');
      vaelg.appendChild(o);
    });
    if (foer && vaelg.querySelector('option[value="' + foer + '"]')) vaelg.value = foer;
  }

  // ----------------------------------------------------------
  //  FEJL I FELTERNE — samme mønster som de andre formularer
  // ----------------------------------------------------------
  function visFejl(feltId, besked) {
    var boks = $('fejl-' + feltId.replace('bord-', ''));
    var felt = $(feltId);
    if (!boks) return;

    boks.textContent = besked || '';
    boks.classList.toggle('skjult', !besked);

    if (!felt) return;
    if (besked) {
      felt.setAttribute('aria-invalid', 'true');
      felt.setAttribute('aria-describedby', boks.id);
    } else {
      felt.removeAttribute('aria-invalid');
      felt.removeAttribute('aria-describedby');
    }
  }

  function sigFejl(besked) {
    var boks = $('bord-fejl');
    boks.textContent = besked || '';
    boks.classList.toggle('skjult', !besked);
    if (besked) boks.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // ----------------------------------------------------------
  //  SEND
  // ----------------------------------------------------------
  function send(ev) {
    ev.preventDefault();
    sigFejl(null);

    var navn = $('bord-navn').value;
    var telefon = $('bord-telefon').value;
    var email = $('bord-email').value;
    var antal = $('bord-antal').value.trim();
    var tid = $('bord-tid').value;

    var fejl = {
      navn: Butik.tjek.navn(navn, 'navn', 80),
      telefon: Butik.tjek.telefon(telefon),
      email: Butik.tjek.epost(email),
    };

    var n = Number(antal);
    if (antal === '' || !isFinite(n) || n < 1 || Math.round(n) !== n) {
      fejl.antal = 'Hvor mange kommer I? Skriv et helt tal.';
    } else if (n > 100) {
      /* Ikke bare "for stort": hundrede mennesker ER et selskab,
         og selskaber har deres egen indgang med sin egen samtale. */
      fejl.antal = 'Over 100 er et selskab — skriv til os om det i stedet.';
    }

    visFejl('bord-navn', fejl.navn);
    visFejl('bord-telefon', fejl.telefon);
    visFejl('bord-email', fejl.email);
    visFejl('bord-antal', fejl.antal);

    if (fejl.email) åbnMere(true);

    var første = ['antal', 'navn', 'telefon', 'email'].filter(function (f) {
      return fejl[f];
    })[0];
    if (første) {
      $('bord-' + første).focus();
      return;
    }

    if (!valgtDag || !tid) {
      sigFejl('Vælg en dag og et klokkeslæt.');
      return;
    }

    var knap = $('bord-send');
    knap.disabled = true;
    knap.textContent = 'Sender …';

    Butik.bookBord({
      navn: navn,
      telefon: telefon,
      email: email,
      dato: valgtDag,
      tid: tid,
      antal_personer: n,
      besked: $('bord-besked').value,
    }).then(visTak).catch(function (e) {
      knap.disabled = false;
      knap.textContent = 'Book bordet';
      sigFejl(e.message || 'Bookingen kunne ikke sendes. Ring til os i stedet.');
    });
  }

  // ----------------------------------------------------------
  //  KVITTERINGEN
  //  --------------------------------------------------------
  //  BOOKET ER BOOKET. Her stod det modsatte: "Bordet er IKKE
  //  bekræftet endnu — vent på opkaldet, før I regner med det."
  //
  //  Kunden har sagt det fire gange, senest 23/8: "hvad man skal
  //  kunne BESTILLE bord, ikke SPØRGE." Det er den samme
  //  beslutning som på bestillingerne (se auto_bekraeft i
  //  js/bestilling.js): gæsten booker, og kan forretningen mod
  //  forventning ikke skaffe bordet, er det DEM, der ringer —
  //  derfor står telefonnummeret i bookingen.
  //
  //  Kvitteringen skal stadig sige, hvad der ER aftalt, og
  //  hvordan man kommer af med det igen. Et løfte uden en
  //  udgang er et bord, ingen tør booke.
  // ----------------------------------------------------------
  function visTak(b) {
    var form = $('bord-form');
    var tak = $('bord-tak');
    form.classList.add('skjult');
    tøm(tak);

    tak.appendChild(lav('div', 'eyebrow', 'Bordet er booket'));
    tak.appendChild(lav('h2', null, 'Tak, ' + fornavn(b.navn) + '.'));

    var p = lav('p', 'vare-tekst');
    p.appendChild(document.createTextNode('Vi ses ' + dagNavn(data, b.dato).toLowerCase()
      + ' ' + dagDato(b.dato) + ' kl. ' + b.tid.replace(':', '.') + '. '));
    p.appendChild(document.createTextNode(
      'Kan vi mod forventning ikke skaffe bordet, ringer vi til dig på '));
    p.appendChild(lav('strong', null, b.telefon));
    p.appendChild(document.createTextNode(
      '. Bliver I forhindret, så ring — så giver vi bordet videre.'));
    tak.appendChild(p);

    var kvit = lav('div', 'kvit');
    kvit.appendChild(kvitLinje('Reference', b.reference));
    kvit.appendChild(kvitLinje('Dag', dagNavn(data, b.dato) + ' ' + dagDato(b.dato)));
    kvit.appendChild(kvitLinje('Klokken', b.tid.replace(':', '.')));
    kvit.appendChild(kvitLinje('Antal', b.antal_personer + ' personer'));
    tak.appendChild(kvit);

    var raekke = lav('div', 'knap-raekke');
    var ring = lav('a', 'knap sekundaer', 'Ring til os');
    ring.href = 'tel:+4528871343';
    ring.setAttribute('data-tel', '');
    raekke.appendChild(ring);

    var tilbage = lav('a', 'knap sekundaer', 'Til forsiden');
    tilbage.href = '../index.html';
    raekke.appendChild(tilbage);
    tak.appendChild(raekke);

    tak.classList.remove('skjult');
    tak.scrollIntoView({ block: 'start', behavior: 'smooth' });
    tak.focus();
  }

  function kvitLinje(navn, vaerdi) {
    var l = lav('div', 'kvit-linje');
    l.appendChild(lav('span', 'kvit-navn', navn));
    l.appendChild(lav('span', 'kvit-vaerdi', vaerdi));
    return l;
  }

  function fornavn(n) {
    return String(n || '').trim().split(/\s+/)[0] || 'igen';
  }

  // ----------------------------------------------------------
  //  FOLDEN
  // ----------------------------------------------------------
  function åbnMere(åben) {
    $('bord-mere').hidden = !åben;
    $('bord-mere-knap').setAttribute('aria-expanded', åben ? 'true' : 'false');
  }

  // ----------------------------------------------------------
  //  START
  // ----------------------------------------------------------
  function start(d) {
    data = d;
    visDage();
    visTider();

    $('bord-form').addEventListener('submit', send);

    $('bord-mere-knap').addEventListener('click', function () {
      åbnMere($('bord-mere').hidden);
    });

    ['navn', 'telefon', 'email', 'antal'].forEach(function (f) {
      var felt = $('bord-' + f);
      if (felt) felt.addEventListener('input', function () {
        visFejl('bord-' + f, null);
        sigFejl(null);
      });
    });
  }

  Butik.hent().then(start);
})();
