/* ------------------------------------------------------------
   Udlejningsformularen: spørg om baglokalet, personalet ringer.

   Den fjerde formular på hjemmesiden, bygget som de tre andre —
   samme fejlvisning, samme kvittering, samme regel om hvad der
   IKKE gemmes i browseren.

   Datoen er PÅKRÆVET: lokalet lejes pr. dag, og "engang" er en
   forespørgsel — det link står øverst i formularen. En rå
   datovælger og ikke dagknapper som ved bordene: lokalet er ikke
   lugen, så åbningstiderne bestemmer ikke, og to år frem kan
   ikke stå som knapper.

   Siden henter IKKE Butik.hent(). Formularen skal hverken bruge
   menukortet eller åbningstiderne, og gæsten må alligevel ikke
   kunne se, hvilke dage der er taget — det ville fortælle hele
   havnen, hvornår naboen holder fest. Personalet svarer i
   telefonen, som ved alt andet.
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

  // ----------------------------------------------------------
  //  FEJL I FELTERNE — samme mønster som de andre formularer
  // ----------------------------------------------------------
  function visFejl(feltId, besked) {
    var boks = $('fejl-' + feltId.replace('lokale-', ''));
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
    var boks = $('lokale-fejl');
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

    var navn = $('lokale-navn').value;
    var telefon = $('lokale-telefon').value;
    var email = $('lokale-email').value;
    var dato = $('lokale-dato').value;
    var antal = $('lokale-antal').value.trim();

    var fejl = {
      navn: Butik.tjek.navn(navn, 'navn', 80),
      telefon: Butik.tjek.telefon(telefon),
      email: Butik.tjek.epost(email),
    };

    /* Samme vindue som udlejning_dato_ok i databasen — ellers får
       gæsten en rå constraint-fejl i stedet for en sætning. */
    if (!dato) {
      fejl.dato = 'Hvilken dag vil I leje lokalet? Ved I det ikke, så brug forespørgslen ovenfor.';
    } else if (dato < Butik.nu().dato) {
      fejl.dato = 'Den dag er gået. Vælg en dag, der kommer.';
    }

    if (antal !== '') {
      var n = Number(antal);
      if (!isFinite(n) || n < 1 || n > 500 || Math.round(n) !== n) {
        fejl.antal = 'Skriv et helt tal mellem 1 og 500 – eller lad feltet stå tomt.';
      }
    }

    visFejl('lokale-dato', fejl.dato);
    visFejl('lokale-antal', fejl.antal);
    visFejl('lokale-navn', fejl.navn);
    visFejl('lokale-telefon', fejl.telefon);
    visFejl('lokale-email', fejl.email);

    if (fejl.email) åbnMere(true);

    var første = ['dato', 'antal', 'navn', 'telefon', 'email'].filter(function (f) {
      return fejl[f];
    })[0];
    if (første) {
      $('lokale-' + første).focus();
      return;
    }

    var knap = $('lokale-send');
    knap.disabled = true;
    knap.textContent = 'Sender …';

    Butik.lejLokale({
      navn: navn,
      telefon: telefon,
      email: email,
      dato: dato,
      antal_personer: antal === '' ? null : Number(antal),
      besked: $('lokale-besked').value,
    }).then(visTak).catch(function (e) {
      knap.disabled = false;
      knap.textContent = 'Spørg om lokalet';
      sigFejl(e.message || 'Ønsket kunne ikke sendes. Ring til os i stedet.');
    });
  }

  // ----------------------------------------------------------
  //  KVITTERINGEN
  //  Lokalet er IKKE lejet, før personalet har ringet — der kan
  //  kun være ét ja pr. dag, og det gives ikke af en formular.
  // ----------------------------------------------------------
  function visTak(u) {
    var form = $('lokale-form');
    var tak = $('lokale-tak');
    form.classList.add('skjult');
    tøm(tak);

    tak.appendChild(lav('div', 'eyebrow', 'Vi har dit ønske'));
    tak.appendChild(lav('h2', null, 'Tak, ' + fornavn(u.navn) + '.'));

    var p = lav('p', 'vare-tekst');
    p.appendChild(document.createTextNode('Vi ringer til dig på '));
    p.appendChild(lav('strong', null, u.telefon));
    p.appendChild(document.createTextNode(
      ' og aftaler nærmere. Lokalet er IKKE lejet endnu — vent på '
      + 'opkaldet, før I regner med det.'));
    tak.appendChild(p);

    var kvit = lav('div', 'kvit');
    kvit.appendChild(kvitLinje('Reference', u.reference));
    kvit.appendChild(kvitLinje('Dag', pænDato(u.dato)));
    if (u.antal_personer) kvit.appendChild(kvitLinje('Antal', u.antal_personer + ' personer'));
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

  var MÅNEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december'];

  function pænDato(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    return Butik.UGEDAGE[(d.getUTCDay() + 6) % 7] + ' '
      + d.getUTCDate() + '. ' + MÅNEDER[d.getUTCMonth()];
  }

  function fornavn(n) {
    return String(n || '').trim().split(/\s+/)[0] || 'igen';
  }

  // ----------------------------------------------------------
  //  FOLDEN
  // ----------------------------------------------------------
  function åbnMere(åben) {
    $('lokale-mere').hidden = !åben;
    $('lokale-mere-knap').setAttribute('aria-expanded', åben ? 'true' : 'false');
  }

  // ----------------------------------------------------------
  //  START
  // ----------------------------------------------------------
  function start() {
    /* Datofeltet får browserens egen bund og loft, så pilene i
       vælgeren ikke kan lande på i går. Valideringen ovenfor
       gælder stadig — attributterne er en hjælp, ikke et værn. */
    var dag = Butik.nu().dato;
    $('lokale-dato').min = dag;

    $('lokale-form').addEventListener('submit', send);

    $('lokale-mere-knap').addEventListener('click', function () {
      åbnMere($('lokale-mere').hidden);
    });

    ['dato', 'antal', 'navn', 'telefon', 'email'].forEach(function (f) {
      var felt = $('lokale-' + f);
      if (felt) felt.addEventListener('input', function () {
        visFejl('lokale-' + f, null);
        sigFejl(null);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
