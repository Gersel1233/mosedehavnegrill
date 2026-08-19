/* ------------------------------------------------------------
   Forespørgselsformularen: catering, baglokale og selskab.

   Den anden formular på hjemmesiden, og den er bygget som
   bestillingsformularen med vilje — samme fejlvisning, samme
   kvittering, samme regel om hvad der IKKE gemmes i browseren.

   TO TING SKILLER DEN FRA BESTILLINGEN:

   1) Den lover ingenting. En bestilling er en aftale om noget
      bestemt til et bestemt tidspunkt; det her er et spørgsmål.
      Derfor står der ingen priser, ingen kapacitet og intet om
      levering nogen steder — kun at vi ringer.

   2) Dato og antal er FRIVILLIGE. "Vi skal holde sølvbryllup
      engang til foråret, hvad koster det?" er den forespørgsel,
      der er mest værd, og et krav om en dato ville sende netop
      den gæst væk igen.

   Siden henter IKKE Butik.hent(). Formularen har ikke brug for
   menukortet eller åbningstiderne, og syv tabeller over en
   mobilforbindelse for at vise fire felter er syv for mange.
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

  /* Teksten på de tre knapper. Selve LISTEN kommer fra
     Butik.FORESPOERGSEL_TYPER, så den står ét sted — her står kun,
     hvad de hedder på dansk.

     Bemærk noten under Baglokale: "Kan vi holde det hos jer?" er
     gæstens SPØRGSMÅL. Ingen har bekræftet, at der findes et
     lokale at leje, og en knap, der siger "Lej vores baglokale",
     ville påstå det. Se listen "Ejeren skal bekræfte" i README. */
  var TEKST = {
    catering:  { navn: 'Catering',  note: 'Mad til et arrangement' },
    baglokale: { navn: 'Baglokale', note: 'Kan vi holde det hos jer?' },
    selskab:   { navn: 'Selskab',   note: 'Fødselsdag, frokost, fest' },
  };

  var valgtType = null;

  // ----------------------------------------------------------
  //  TEGN: de tre indgange
  // ----------------------------------------------------------
  function visTyper() {
    var boks = $('foresp-typer');
    tøm(boks);

    (Butik.FORESPOERGSEL_TYPER || []).forEach(function (type) {
      var t = TEKST[type] || { navn: type, note: '' };

      var knap = lav('button', 'type-knap');
      knap.type = 'button';
      knap.dataset.type = type;
      knap.setAttribute('aria-pressed', 'false');
      knap.appendChild(lav('span', 'type-navn', t.navn));
      if (t.note) knap.appendChild(lav('span', 'type-note', t.note));

      knap.addEventListener('click', function () { vælgType(type); });
      boks.appendChild(knap);
    });
  }

  function vælgType(type) {
    valgtType = type;
    Array.prototype.forEach.call(
      $('foresp-typer').querySelectorAll('.type-knap'), function (k) {
        var valgt = k.dataset.type === type;
        k.classList.toggle('valgt', valgt);
        k.setAttribute('aria-pressed', valgt ? 'true' : 'false');
      });
    visFejl('foresp-type', null);
  }

  // ----------------------------------------------------------
  //  FEJL I FELTERNE
  //  Samme mønster som i js/bestilling.js: beskeden står ved det
  //  felt den handler om, og feltet får aria-invalid, så en
  //  skærmlæser siger det samme som skærmen.
  // ----------------------------------------------------------
  function visFejl(feltId, besked) {
    var boks = $('fejl-' + feltId.replace('foresp-', ''));
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
    var boks = $('foresp-fejl');
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

    var navn = $('foresp-navn').value;
    var telefon = $('foresp-telefon').value;
    var email = $('foresp-email').value;
    var antal = $('foresp-antal').value.trim();

    var fejl = {
      navn: Butik.tjek.navn(navn, 'navn', 80),
      telefon: Butik.tjek.telefon(telefon),
      email: Butik.tjek.epost(email),
    };

    /* Antallet er frivilligt, men står der noget, skal det være et
       tal, databasen tager imod. Ellers får gæsten en rå
       constraint-fejl at kigge på. */
    if (antal !== '') {
      var n = Number(antal);
      if (!isFinite(n) || n < 1 || n > 500 || Math.round(n) !== n) {
        fejl.antal = 'Skriv et helt tal mellem 1 og 500 – eller lad feltet stå tomt.';
      }
    }

    visFejl('foresp-navn', fejl.navn);
    visFejl('foresp-telefon', fejl.telefon);
    visFejl('foresp-email', fejl.email);
    visFejl('foresp-antal', fejl.antal);

    /* Er fejlen i den foldede blok, åbnes folden. Ellers står
       beskeden i noget, der er hidden, og gæsten får en formular,
       der nægter at sende uden at sige hvorfor. */
    if (fejl.email) åbnMere(true);

    var første = ['navn', 'telefon', 'antal', 'email'].filter(function (f) {
      return fejl[f];
    })[0];
    if (første) {
      $('foresp-' + første).focus();
      return;
    }

    // Typen er det ene, der ikke er et felt, så den får sin egen
    // besked oppe ved knapperne.
    if (!valgtType) {
      visFejl('foresp-type', 'Vælg hvad det handler om.');
      $('foresp-typer').scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    var knap = $('foresp-send');
    knap.disabled = true;
    knap.textContent = 'Sender …';

    Butik.forespoerg({
      type: valgtType,
      navn: navn,
      telefon: telefon,
      email: email,
      dato: $('foresp-dato').value || null,
      antal_personer: antal === '' ? null : Number(antal),
      besked: $('foresp-besked').value,
    }).then(visTak).catch(function (e) {
      knap.disabled = false;
      knap.textContent = 'Send og få et opkald';
      sigFejl(e.message || 'Forespørgslen kunne ikke sendes. Ring til os i stedet.');
    });
  }

  // ----------------------------------------------------------
  //  KVITTERINGEN
  //  Den siger både hvad der SKER, og hvad der IKKE er sket. Uden
  //  det sidste går gæsten fra siden og tror, der er booket noget.
  // ----------------------------------------------------------
  function visTak(f) {
    var form = $('foresp-form');
    var tak = $('foresp-tak');
    form.classList.add('skjult');
    tøm(tak);

    tak.appendChild(lav('div', 'eyebrow', 'Vi har den'));
    tak.appendChild(lav('h2', null, 'Tak, ' + fornavn(f.navn) + '.'));

    var p = lav('p', 'vare-tekst');
    p.appendChild(document.createTextNode('Vi ringer til dig på '));
    p.appendChild(lav('strong', null, f.telefon));
    p.appendChild(document.createTextNode(
      ' og aftaler nærmere. Der er ikke booket noget, og der er ikke '
      + 'betalt noget – vi snakker om det først.'));
    tak.appendChild(p);

    var kvit = lav('div', 'kvit');
    kvit.appendChild(kvitLinje('Reference', f.reference));
    kvit.appendChild(kvitLinje('Det handler om', (TEKST[f.type] || {}).navn || f.type));
    if (f.dato) kvit.appendChild(kvitLinje('Dato', f.dato));
    if (f.antal_personer) kvit.appendChild(kvitLinje('Antal', f.antal_personer + ' personer'));
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
    $('foresp-mere').hidden = !åben;
    $('foresp-mere-knap').setAttribute('aria-expanded', åben ? 'true' : 'false');
    $('foresp-mere-knap').querySelector('.fold-pil').textContent = åben ? '−' : '+';
  }

  // ----------------------------------------------------------
  //  START
  // ----------------------------------------------------------
  function start() {
    visTyper();

    /* Kommer gæsten fra en knap på forsiden, står typen i adressen:
       .../selskaber/?type=catering. Så er der ét valg mindre at
       træffe, og knappen på forsiden holder det, den lover. En
       ukendt værdi i adressen vælger ingenting — den skal ikke
       kunne sende noget af sted, databasen afviser. */
    var fra = (location.search.match(/[?&]type=([a-z]+)/) || [])[1];
    if (fra && (Butik.FORESPOERGSEL_TYPER || []).indexOf(fra) !== -1) vælgType(fra);

    $('foresp-form').addEventListener('submit', send);

    $('foresp-mere-knap').addEventListener('click', function () {
      åbnMere($('foresp-mere').hidden);
    });

    // Fejlen ryddes når man retter, ikke først ved næste tryk på
    // Send. Ellers står der en rød besked ved et felt, der er
    // rigtigt nu.
    ['navn', 'telefon', 'email', 'antal', 'dato'].forEach(function (f) {
      var felt = $('foresp-' + f);
      if (felt) felt.addEventListener('input', function () {
        visFejl('foresp-' + f, null);
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
