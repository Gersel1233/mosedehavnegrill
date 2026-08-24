/* ============================================================
   DE TRE FORESPØRGSELSSIDER — KOBLINGEN, IKKE SKALLEN

   Selskaber, catering og baglokalet er den SAMME tabel med tre
   indgange (fase 2). De tre formularer i designet spørger om
   forskellige ting — anledning, tidsrum, kuverter, fade — og alt
   det ekstra lægges i kolonnen detaljer, så personalet kan se
   det som felter og ikke som fritekst midt i en besked.

   ÉT MODUL, TRE FORMULARER. Forskellene står som opsætning i
   SIDER; alt andet er fælles. Tre kopier af den samme afsendelse
   ville langsomt komme til at gøre tre forskellige ting.

   KALENDEREN. Havnen er ét sted: er baglokalet lejet ud den 12.,
   kan der ikke også holdes selskab hos jer den 12. De optagne
   dage hentes fra listen, gæsten må læse (KUN datoer), og
   databasen siger nej igen, hvis nogen omgår formularen.
   Catering optager ingenting — den er pr. definition ud af
   huset — og et selskab UD AF HUSET gør heller ikke.
   ============================================================ */

(function () {
  'use strict';

  if (!window.Butik) return;

  var panel = document.getElementById('forespoerg');
  if (!panel) return;

  function find(v, rod) {
    try { return (rod || panel).querySelector(v); } catch (e) { return null; }
  }
  function alle(v, rod) {
    return Array.prototype.slice.call((rod || panel).querySelectorAll(v));
  }
  function tøm(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }
  function lav(tag, klasse, tekst) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (tekst !== undefined && tekst !== null) el.textContent = tekst;
    return el;
  }
  function tekst(el) { return el ? el.textContent.trim() : ''; }

  /* ---- DE TRE FORMULARER ----
     chips: rækkefølgen af [data-chips] i panelet. Der er ingen
     id'er på dem i designet, og at give dem nogen ville være at
     lave om på skallen — så de tælles, og opsætningen siger,
     hvad nummer nul og nummer ét hedder. */
  var SIDER = {
    pdato: {
      type: 'selskab',
      felter: { dato: 'pdato', antal: 'pantal', navn: 'pnavn',
        tlf: 'ptlf', mail: 'pmail', besked: 'pbesked' },
      chips: ['anledning', 'mad'],
      seg: { vælger: '.seg2', navn: 'hvor', svar: ['hos-jer', 'ud-af-huset'] },
      optagerDagen: function (d) { return d.hvor !== 'ud-af-huset'; },
    },
    bdato: {
      type: 'baglokale',
      felter: { dato: 'bdato', antal: 'bantal', navn: 'bnavn',
        tlf: 'btlf', mail: 'bmail', besked: 'bbesked' },
      chips: ['tidsrum', 'servering'],
      seg: { vælger: '[data-toggles="#madfelt"]', navn: 'mad', svar: ['med-mad', 'kun-lokalet'] },
      optagerDagen: function () { return true; },
    },
    cdato: {
      type: 'catering',
      felter: { dato: 'cdato', antal: 'ckuv', navn: 'cnavn',
        tlf: 'ctlf', mail: 'cmail', besked: 'cbesked' },
      chips: ['anledning', 'levering_indhold'],
      seg: { vælger: '[data-toggles="#cadrfelt"]', navn: 'levering', svar: ['levering', 'afhentning'] },
      ekstra: { adresse: 'cadr', tid: 'ctid', fade: 'cfade' },
      /* Catering optager ingen dage: maden kører ud, og havnen
         står fri. Derfor er der heller ingen datospærre her. */
      optagerDagen: function () { return false; },
    },
  };

  var side = null;
  Object.keys(SIDER).forEach(function (n) {
    if (!side && document.getElementById(n)) side = SIDER[n];
  });
  if (!side) return;

  var data = null;
  var optagne = [];
  var oprindeligFine = '';

  function felt(navn) {
    var id = side.felter[navn] || (side.ekstra || {})[navn];
    return id ? document.getElementById(id) : null;
  }
  function værdi(navn) {
    var f = felt(navn);
    return f ? String(f.value || '').trim() : '';
  }

  // ----------------------------------------------------------
  //  BESKEDER
  //  ----------------------------------------------------------
  //  Designet har ikke tegnet et fejlfelt, og et opfundet ét
  //  ville være en ændring af skallen. Den lille linje under
  //  knappen er der i forvejen — den låner vi, og designets egen
  //  tekst kommer igen, så snart fejlen er rettet.
  // ----------------------------------------------------------
  function fineFelt() { return find('.fine'); }

  function sigFejl(besked, feltNavn) {
    var f = fineFelt();
    if (f) f.textContent = '⚠ ' + besked;
    var el = feltNavn ? felt(feltNavn) : null;
    if (el) el.focus();
    return false;
  }

  function rydFejl() {
    var f = fineFelt();
    if (f && oprindeligFine) f.textContent = oprindeligFine;
  }

  // ----------------------------------------------------------
  //  DETALJERNE
  // ----------------------------------------------------------
  function valgteChips(gruppe) {
    return alle('button.on', gruppe).map(tekst).filter(Boolean);
  }

  /* TO SLAGS SEGMENTER, OG DE HOLDER STYR PÅ SIG SELV HVER SIN
     MÅDE.

     [data-seg] flytter .on, når man trykker — det er den, der ser
     ud som et valg. [data-toggles] gør IKKE: designets egen kode
     skjuler eller viser bare feltet nedenunder, og den fremhævede
     knap bliver stående, hvor den startede.

     MÅLT: første udgave læste .on begge steder, og en catering,
     hvor gæsten havde trykket Afhentning, blev sendt som en
     LEVERING — med adressen på. Køkkenet ville køre ud med mad,
     nogen stod og ventede på ved lugen.

     Derfor spørges der om det, designet FAKTISK holder styr på:
     er feltet nedenunder synligt? */
  function segSvar() {
    var g = find(side.seg.vælger);
    if (!g) return side.seg.svar[0];

    var mål = g.getAttribute('data-toggles');
    if (mål) {
      var boks = document.querySelector(mål);
      return (boks && !boks.hidden) ? side.seg.svar[0] : side.seg.svar[1];
    }

    var knapper = alle('button', g);
    var på = find('button.on', g);
    var i = på ? knapper.indexOf(på) : 0;
    return side.seg.svar[i] || side.seg.svar[0];
  }

  function detaljer() {
    var ud = {};
    var grupper = alle('[data-chips]');
    side.chips.forEach(function (navn, i) {
      if (!grupper[i]) return;
      var valgt = valgteChips(grupper[i]);
      if (!valgt.length) return;
      /* Enkeltvalg gemmes som tekst, flervalg som liste. Så
         slipper admin for at skulle kende forskel på "en liste
         med ét element" og "et valg". */
      ud[navn] = grupper[i].getAttribute('data-chips') === 'single' ? valgt[0] : valgt;
    });
    ud[side.seg.navn] = segSvar();

    Object.keys(side.ekstra || {}).forEach(function (navn) {
      var v = værdi(navn);
      if (v) ud[navn] = v;
    });
    /* Adressen hører kun til en levering. Blev den hængende,
       efter gæsten skiftede til afhentning, ville personalet
       ringe om en levering, ingen har bedt om. */
    if (ud.levering === 'afhentning') delete ud.adresse;
    return ud;
  }

  // ----------------------------------------------------------
  //  DATOEN
  //  ----------------------------------------------------------
  //  Designet har en fast dato i feltet ("2026-09-19"). Den
  //  ryger: en pladsholder, ingen har valgt, ville blive sendt
  //  som gæstens ønskede dato, den dag hun glemmer at røre
  //  feltet. Til gengæld sættes min og max, så feltet ikke kan
  //  give en dato, databasen alligevel afviser.
  // ----------------------------------------------------------
  function iso(dage) {
    var t = new Date(Butik.nu().dato + 'T12:00:00Z');
    t.setUTCDate(t.getUTCDate() + dage);
    return t.toISOString().slice(0, 10);
  }

  function erOptaget(dato) {
    if (!dato || !side.optagerDagen(detaljer())) return false;
    return optagne.some(function (o) { return o.dato === dato; });
  }

  function tjekDato() {
    var d = værdi('dato');
    if (!d) return rydFejl();
    if (erOptaget(d)) {
      sigFejl('Den dato er desværre optaget. Vælg en anden — '
        + 'eller ring til os, så finder vi ud af det.');
      return false;
    }
    rydFejl();
    return true;
  }

  // ----------------------------------------------------------
  //  AFSENDELSEN
  // ----------------------------------------------------------
  function send() {
    var navn = værdi('navn');
    var tlf = værdi('tlf');
    var mail = værdi('mail');

    if (navn.length < 2) return sigFejl('Skriv dit navn.', 'navn');
    if (tlf.replace(/[^0-9]/g, '').length < 8) {
      return sigFejl('Skriv et telefonnummer, vi kan få fat i dig på.', 'tlf');
    }
    if (mail && !/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(mail)) {
      return sigFejl('E-mailen ser ikke rigtig ud.', 'mail');
    }
    if (!tjekDato()) return false;

    var knap = find('button.g.solid.blk');
    if (knap) knap.disabled = true;

    return Butik.forespoerg({
      type: side.type,
      navn: navn,
      telefon: tlf,
      email: mail,
      dato: værdi('dato') || null,
      antal_personer: værdi('antal') || null,
      besked: værdi('besked'),
      detaljer: detaljer(),
    }).then(function (raekke) {
      visTak(raekke);
    }).catch(function (fejl) {
      if (knap) knap.disabled = false;
      sigFejl(fejl && fejl.message ? fejl.message
        : 'Forespørgslen kunne ikke sendes. Ring til os i stedet.');
    });
  }

  function visTak(f) {
    tøm(panel);
    panel.appendChild(lav('h3', null, 'Tak, ' + String(f.navn || '').split(' ')[0] + '.'));
    /* Der loves ikke et tidspunkt. Vi ved ikke, hvornår
       personalet har hænder fri, og et "svar inden for en time"
       er et løfte, siden ikke kan holde. */
    panel.appendChild(lav('p', 'hint', 'Vi har fået jeres forespørgsel og '
      + 'vender tilbage med et svar. Haster det, så ring til os.'));
    panel.appendChild(lav('div', 'note', 'Reference: ' + f.reference));
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ----------------------------------------------------------
  //  START
  // ----------------------------------------------------------
  var datoFelt = felt('dato');
  if (datoFelt) {
    datoFelt.value = '';
    datoFelt.min = iso(0);
    // Samme grænse som databasens forespoergsel_dato_ok: to år.
    datoFelt.max = iso(730);
    datoFelt.addEventListener('change', tjekDato);
  }

  var fine = fineFelt();
  oprindeligFine = fine ? fine.textContent : '';

  var knap = find('button.g.solid.blk');
  if (knap) {
    knap.type = 'button';
    knap.addEventListener('click', send);
  }

  ['navn', 'tlf', 'mail'].forEach(function (n) {
    var el = felt(n);
    if (el) el.addEventListener('input', rydFejl);
  });

  /* Skifter gæsten til "ud af huset", er dagen ikke længere
     optaget for hende — og omvendt. Segmentet skal derfor kunne
     tage fejlen væk igen. */
  var seg = find(side.seg.vælger);
  if (seg) seg.addEventListener('click', function () { setTimeout(tjekDato, 0); });

  Butik.hent().then(function (d) {
    data = d;
    return Butik.hentOptagneDage();
  }).then(function (liste) {
    optagne = liste || [];
    tjekDato();
  }).catch(function (fejl) {
    console.warn('Forespørgselssidens kobling fejlede, skallen står:', fejl);
  });
}());
