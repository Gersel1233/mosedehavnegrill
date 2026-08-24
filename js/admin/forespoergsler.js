/* Fanen Forespørgsler: catering, baglokale og selskaber.
   Se js/admin/kerne.js for de to principper, der gælder i alle
   admin-filerne.

   Fanen er bygget som Bestillinger med vilje. Det er den samme
   slags arbejde — der er kommet noget ind, nogen skal ringe, og så
   er sagen afsluttet — og et andet mønster på nabofanen ville kun
   være noget mere at lære for den, der står ved skærmen.

   Forespørgslerne hentes for sig og ikke i Admin.genindlæs(). Kun
   chefen må læse dem, så kaldet svarer 401 for alle andre — og en
   fejl, der væltede hele genindlæsningen, ville tage åbningstider
   og menukort med sig. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  var STATUS_NAVNE = {
    ny: 'Ny', kontaktet: 'Kontaktet', aftalt: 'Aftalt', afvist: 'Afvist',
  };

  // Hvad er det NÆSTE, der skal ske? Én knap, ikke en rulleliste.
  var NAESTE = {
    ny: ['kontaktet', 'Jeg har ringet'],
    kontaktet: ['aftalt', 'Aftalen er i hus'],
  };

  /* De tre indgange. Står der en type i databasen, som ikke er
     herinde — fordi en fjerde er kommet til, og admin ikke er
     fulgt med — vises den rå værdi i stedet for at forsvinde.
     Personalet skal kunne se, at der ER kommet noget ind. */
  var TYPE_NAVNE = {
    catering: 'Catering', baglokale: 'Baglokale', selskab: 'Selskab',
  };

  var forespoergsler = [];

  /* Rækkefølgen er "hvem venter længst på et opkald".

     De nye står øverst med den ÆLDSTE først: den, der skrev i
     mandags, har ventet længst, og en forespørgsel, der ligger
     urørt i tre dage, er et selskab, der bliver holdt et andet
     sted. Resten står nyeste først, for dem er der ikke noget at
     gøre ved — de er til at slå op i. */
  var RANG = { ny: 0, kontaktet: 1, aftalt: 2, afvist: 3 };

  function sorteret(liste) {
    return liste.slice().sort(function (a, b) {
      var ra = RANG[a.status] === undefined ? 9 : RANG[a.status];
      var rb = RANG[b.status] === undefined ? 9 : RANG[b.status];
      if (ra !== rb) return ra - rb;
      if (a.status === 'ny') return a.oprettet < b.oprettet ? -1 : 1;
      return a.oprettet < b.oprettet ? 1 : -1;
    });
  }

  /* Kortene, der ikke har ændret sig, bliver stående — se noten
     ved Admin.tegnRaekker i kerne.js. */
  function tegnForespoergsler() {
    var boks = $('forespoergsler-liste');
    if (!boks) return;

    // Tallet på fanen: hvor mange der endnu ikke er ringet om
    var nye = forespoergsler.filter(function (f) { return f.status === 'ny'; }).length;
    var maerke = $('foresp-antal');
    if (nye) { maerke.textContent = nye; maerke.classList.remove('skjult'); }
    else maerke.classList.add('skjult');

    if (!forespoergsler.length) {
      Admin.tegnRaekker(boks, [{
        noegle: 'tom', aftryk: 'tom',
        byg: function () { return lav('p', 'vare-tekst', 'Der er ingen forespørgsler endnu.'); },
      }]);
      return;
    }

    Admin.tegnRaekker(boks, sorteret(forespoergsler).map(function (f) {
      return {
        noegle: 'foresp-' + f.id,
        aftryk: JSON.stringify(f),
        byg: function () { return forespoergselKort(f); },
      };
    }));
  }

  /* Nøglerne kommer fra formularerne (js/skal/forespoergsel.js).
     Står der en, vi ikke kender, vises den med sit eget navn i
     stedet for at blive væk: en ny chip i designet må ikke kunne
     forsvinde ud af køkkenets syn, fordi ingen huskede at rette
     den her liste. */
  var DETALJE_NAVNE = {
    anledning: 'Anledning',
    hvor: 'Hvor',
    mad: 'Mad',
    tidsrum: 'Tidsrum',
    servering: 'Servering',
    levering: 'Levering',
    levering_indhold: 'Skal leveres',
    adresse: 'Adresse',
    tid: 'Tidspunkt',
    fade: 'Fade og opdækning',
  };

  var DETALJE_VÆRDIER = {
    'hos-jer': 'Hos jer på havnen',
    'ud-af-huset': 'Ud af huset',
    'med-mad': 'Med mad',
    'kun-lokalet': 'Kun lokalet',
    levering: 'Skal leveres',
    afhentning: 'Hentes',
  };

  function detaljeLinjer(detaljer) {
    if (!detaljer || typeof detaljer !== 'object') return [];
    return Object.keys(detaljer).map(function (n) {
      var v = detaljer[n];
      if (Array.isArray(v)) v = v.join(', ');
      v = String(v === null || v === undefined ? '' : v);
      return [DETALJE_NAVNE[n] || n, DETALJE_VÆRDIER[v] || v];
    }).filter(function (par) { return par[1]; });
  }

  function mailEmne(f) {
    return 'Jeres forespørgsel hos Mosede Havnegrill (' + f.reference + ')';
  }

  /* Udkastet, ikke svaret. Personalet skriver selv resten — vi
     kan hverken pris eller ledighed, og et system, der fandt på
     en pris, ville sende den af sted i deres navn. */
  function mailKrop(f) {
    var linjer = ['Hej ' + String(f.navn || '').split(' ')[0] + ',', '',
      'Tak for jeres forespørgsel.', ''];
    if (f.dato) linjer.push('Dato: ' + Admin.pænDato(f.dato));
    if (f.antal_personer) linjer.push('Antal: ' + f.antal_personer + ' personer');
    detaljeLinjer(f.detaljer).forEach(function (par) {
      linjer.push(par[0] + ': ' + par[1]);
    });
    linjer.push('', '', 'Venlig hilsen', 'Mosede Havnegrill og Ishus');
    return linjer.join('\n');
  }

  function forespoergselKort(f) {
    var k = lav('div', 'bestil-kort b-' + f.status);

    var top = lav('div', 'bestil-top');
    top.appendChild(lav('span', 'maerke favorit', TYPE_NAVNE[f.type] || f.type));
    top.appendChild(lav('span', 'maerke m-' + f.status,
      STATUS_NAVNE[f.status] || f.status));
    top.appendChild(lav('span', 'bestil-ref', f.reference));
    k.appendChild(top);

    var hvem = lav('div', 'bestil-hvem');
    hvem.appendChild(lav('span', 'vare-navn', f.navn));
    /* Telefonnummeret som link. Personalet SKAL ringe — gæsten har
       fået at vide, at vi gør det — og en tablet ved lugen kan så
       ringe direkte fra listen. */
    var tlf = lav('a', 'bestil-tlf', f.telefon);
    tlf.href = 'tel:' + String(f.telefon).replace(/[^0-9+]/g, '');
    hvem.appendChild(tlf);
    /* MAIL-KNAPPEN. Et tilbud på et selskab er tal, datoer og
       forbehold — det skal skrives, ikke siges i en telefon ved
       en travl luge. Knappen åbner personalets eget mailprogram
       med adressen, referencen og det, gæsten har oplyst, så de
       ikke skal skrive det af fra skærmen.

       Den findes KUN, når gæsten har oplyst en mail. En knap,
       der åbner et tomt mailvindue, er en knap, man trykker på
       én gang. */
    if (f.email) {
      var mail = lav('a', 'bestil-tlf', '✉ ' + f.email);
      mail.href = 'mailto:' + encodeURIComponent(f.email)
        + '?subject=' + encodeURIComponent(mailEmne(f))
        + '&body=' + encodeURIComponent(mailKrop(f));
      hvem.appendChild(mail);
    }
    k.appendChild(hvem);

    /* Dato og antal er FRIVILLIGE felter. Står der ingenting, siger
       kortet det højt i stedet for at lade linjen være tom: "ingen
       dato" er en oplysning, personalet skal bruge i telefonen, og
       et tomt felt ligner en fejl i systemet. */
    var detaljer = lav('div', 'bestil-linjer');
    var r1 = lav('div', 'bestil-linje');
    r1.appendChild(lav('span', 'bestil-vare',
      f.dato ? Admin.pænDato(f.dato) : 'Dato ikke oplyst'));
    r1.appendChild(lav('span', 'bestil-linjepris',
      f.antal_personer ? f.antal_personer + ' personer' : 'Antal ikke oplyst'));
    detaljer.appendChild(r1);
    k.appendChild(detaljer);

    /* DETALJERNE. Formularerne spørger om mere end navn, dato og
       antal — anledning, tidsrum, hvad der skal serveres, hvor
       mange kuverter. De stod før i beskeden som fri tekst, og
       personalet skulle læse en sætning igennem for at finde
       tallet. Nu er de felter. */
    var d = detaljeLinjer(f.detaljer);
    if (d.length) {
      var ekstra = lav('div', 'bestil-linjer');
      d.forEach(function (par) {
        var r = lav('div', 'bestil-linje');
        r.appendChild(lav('span', 'bestil-vare', par[0]));
        r.appendChild(lav('span', 'bestil-linjepris', par[1]));
        ekstra.appendChild(r);
      });
      k.appendChild(ekstra);
    }

    if (f.besked) {
      var m = lav('p', 'bestil-gaestebesked');
      m.appendChild(lav('strong', null, 'Gæsten skriver: '));
      m.appendChild(document.createTextNode(f.besked));
      k.appendChild(m);
    }

    /* Personalets egen note. Den gemmes, når feltet forlades, og
       ikke ved hvert tastetryk: et kald pr. bogstav ville være
       hundrede kald for én sætning. */
    var note = lav('div', 'felt');
    var etiket = lav('label', null, 'Din note');
    etiket.setAttribute('for', 'foresp-note-' + f.id);
    var felt = document.createElement('input');
    felt.type = 'text';
    felt.id = 'foresp-note-' + f.id;
    felt.maxLength = 1000;
    felt.value = f.intern_note || '';
    felt.placeholder = 'Fx: ringet, vender tilbage med et tilbud';
    felt.addEventListener('change', function () {
      if (felt.value === (f.intern_note || '')) return;
      gemForespoergsel(Butik.skrive.forespoergselStatus(f.id, f.status, felt.value),
        'Noten er gemt.');
    });
    note.appendChild(etiket);
    note.appendChild(felt);
    k.appendChild(note);

    var raekke = lav('div', 'knap-raekke');

    var n = NAESTE[f.status];
    if (n) {
      var frem = lav('button', 'knap', n[1]);
      frem.addEventListener('click', function () {
        gemForespoergsel(Butik.skrive.forespoergselStatus(f.id, n[0], felt.value),
          'Forespørgslen er sat til "' + STATUS_NAVNE[n[0]] + '".');
      });
      raekke.appendChild(frem);
    }

    if (f.status !== 'afvist' && f.status !== 'aftalt') {
      var afvis = lav('button', 'knap fare', 'Afvis');
      afvis.addEventListener('click', function () {
        /* Opringningen står i spørgsmålet. En afvisning uden et
           opkald er et selskab, der venter på et svar, som aldrig
           kommer — og gæsten har fået at vide, at vi ringer. */
        if (!confirm('Afvis forespørgslen fra ' + f.navn + '?\n\n'
          + 'Husk at ringe til ' + f.telefon + ' — gæsten har fået at vide, '
          + 'at vi ringer og aftaler nærmere.')) return;
        gemForespoergsel(Butik.skrive.forespoergselStatus(f.id, 'afvist', felt.value),
          'Forespørgslen er afvist.');
      });
      raekke.appendChild(afvis);
    }

    if (f.status === 'aftalt' || f.status === 'afvist') {
      var slet = lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!confirm('Flyt forespørgslen fra ' + f.navn + ' til skraldespanden?\n\n'
          + 'Den kan hentes tilbage i 30 dage.')) return;
        gemForespoergsel(Butik.skrive.tilSkraldespand('forespoergsel', f.id),
          'Forespørgslen ligger i skraldespanden.');
      });
      raekke.appendChild(slet);
    }

    k.appendChild(raekke);
    return k;
  }

  /* Som Admin.gem(), men henter FORESPØRGSLERNE igen og ikke alt
     det andet. genindlæs() henter syv tabeller; en statusknap skal
     ikke hente hele menukortet forfra. */
  function gemForespoergsel(løfte, besked) {
    return løfte
      .then(hentForespoergsler)
      .then(function () { Admin.kvitter(besked); })
      .catch(function (e) { Admin.brøl(e.message || String(e)); });
  }

  function hentForespoergsler() {
    return Butik.hentForespoergsler().then(function (liste) {
      forespoergsler = liste || [];
      Admin.meld('forespoergsler', forespoergsler);
      tegnForespoergsler();
      Admin.hentet('foresp-hentet');
    }).catch(function (e) {
      /* Fejlen skjules IKKE. Står der ingenting, tror medarbejderen,
         at der ikke er kommet nogen forespørgsler — og så venter et
         selskab på et opkald, ingen ved skal foretages. */
      var boks = $('forespoergsler-liste');
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'fejl',
        'Forespørgslerne kunne ikke hentes: ' + (e.message || e)
        + ' Skærmen prøver igen af sig selv om et øjeblik — bliver den'
        + ' ved, så log ud og ind igen.'));
      if (window.console) console.warn('forespørgsler:', e);
    });
  }


  Admin.vedLogin.push(hentForespoergsler);
  Admin.friske.push(hentForespoergsler);
})();
