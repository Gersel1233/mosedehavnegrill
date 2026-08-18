/* Fanen Bestillinger: smørrebrød ud af huset, og reglerne for
   bestilling. Se js/admin/kerne.js for de to principper der
   gælder i alle admin-filerne.

   Bestillingerne hentes for sig og ikke i Admin.genindlæs(). Kun
   chefen må læse dem, så kaldet svarer 401 for alle andre – og en
   fejl der væltede hele genindlæsningen ville tage åbningstider
   og menukort med sig.

   Rækkefølgen på skærmen er HENTETIDEN, ikke hvornår de kom ind.
   Personalet pakker i den rækkefølge poserne skal ud ad lugen. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  var STATUS_NAVNE = {
    ny: 'Ny', bekraeftet: 'Bekræftet', klar: 'Klar',
    afhentet: 'Afhentet', afvist: 'Afvist',
  };

  // Hvad er det NÆSTE der skal ske? Én knap, ikke en rulleliste.
  var NAESTE = {
    ny: ['bekraeftet', 'Bekræft'],
    bekraeftet: ['klar', 'Sæt som klar'],
    klar: ['afhentet', 'Afhentet'],
  };

  var bestillinger = [];

  function tegnBestillinger() {
    var boks = $('bestillinger-liste');
    if (!boks) return;
    Admin.tøm(boks);

    // Tallet på fanen: hvor mange der endnu ikke er ringet om
    var nye = bestillinger.filter(function (b) { return b.status === 'ny'; }).length;
    var maerke = $('bestil-antal');
    if (nye) { maerke.textContent = nye; maerke.classList.remove('skjult'); }
    else maerke.classList.add('skjult');

    if (!bestillinger.length) {
      boks.appendChild(lav('p', 'vare-tekst',
        'Der er ingen bestillinger fra i går og frem.'));
      return;
    }

    var sidsteDato = null;
    bestillinger.forEach(function (b) {
      if (b.hent_dato !== sidsteDato) {
        sidsteDato = b.hent_dato;
        boks.appendChild(lav('h3', 'luft-top', Admin.pænDato(b.hent_dato)));
      }
      boks.appendChild(bestillingKort(b));
    });
  }

  function bestillingKort(b) {
    var k = lav('div', 'bestil-kort b-' + b.status);

    var top = lav('div', 'bestil-top');
    top.appendChild(lav('span', 'bestil-tid',
      String(b.hent_tid || '').slice(0, 5).replace(':', '.')));
    top.appendChild(lav('span', 'maerke m-' + b.status,
      STATUS_NAVNE[b.status] || b.status));
    top.appendChild(lav('span', 'bestil-ref', b.reference));
    k.appendChild(top);

    var hvem = lav('div', 'bestil-hvem');
    hvem.appendChild(lav('span', 'vare-navn', b.navn));
    /* Telefonnummeret som link. Personalet SKAL ringe – gæsten har
       fået at vide at vi gør det – og en tablet ved lugen kan ringe
       direkte fra listen. */
    var tlf = lav('a', 'bestil-tlf', b.telefon);
    tlf.href = 'tel:' + String(b.telefon).replace(/[^0-9+]/g, '');
    hvem.appendChild(tlf);
    if (b.email) hvem.appendChild(lav('span', 'vare-tekst', b.email));
    k.appendChild(hvem);

    var linjer = lav('div', 'bestil-linjer');
    (b.linjer || []).forEach(function (l) {
      var r = lav('div', 'bestil-linje');
      r.appendChild(lav('span', 'bestil-antal-tal', l.antal + ' ×'));
      r.appendChild(lav('span', 'bestil-vare', l.navn));
      if (l.pris) {
        r.appendChild(lav('span', 'bestil-linjepris', Butik.pris(l.pris * l.antal)));
      }
      linjer.appendChild(r);
    });
    k.appendChild(linjer);

    var f = lav('p', 'vare-tekst');
    f.appendChild(lav('strong', null, 'Fyld: '));
    f.appendChild(document.createTextNode((b.fyld || []).length
      ? b.fyld.join(', ')
      : 'gæsten har ikke valgt – blandet udvalg'));
    k.appendChild(f);

    if (b.besked) {
      var m = lav('p', 'bestil-gaestebesked');
      m.appendChild(lav('strong', null, 'Gæsten skriver: '));
      m.appendChild(document.createTextNode(b.besked));
      k.appendChild(m);
    }

    /* Personalets egen note. Den gemmes når feltet forlades og
       ikke ved hvert tastetryk: et kald pr. bogstav ville være
       hundrede kald for én sætning. */
    var note = lav('div', 'felt');
    var etiket = lav('label', null, 'Din note');
    etiket.setAttribute('for', 'note-' + b.id);
    var felt = document.createElement('input');
    felt.type = 'text';
    felt.id = 'note-' + b.id;
    felt.maxLength = 1000;
    felt.value = b.intern_note || '';
    felt.placeholder = 'Fx: ringet, hun kommer 12.30';
    felt.addEventListener('change', function () {
      if (felt.value === (b.intern_note || '')) return;
      gemBestilling(Butik.skrive.bestillingStatus(b.id, b.status, felt.value),
        'Noten er gemt.');
    });
    note.appendChild(etiket);
    note.appendChild(felt);
    k.appendChild(note);

    var raekke = lav('div', 'knap-raekke');

    var n = NAESTE[b.status];
    if (n) {
      var frem = lav('button', 'knap', n[1]);
      frem.addEventListener('click', function () {
        gemBestilling(Butik.skrive.bestillingStatus(b.id, n[0], felt.value),
          'Bestillingen er sat til "' + STATUS_NAVNE[n[0]] + '".');
      });
      raekke.appendChild(frem);
    }

    if (b.status !== 'afvist' && b.status !== 'afhentet') {
      var afvis = lav('button', 'knap fare', 'Afvis');
      afvis.addEventListener('click', function () {
        /* Opringningen står i spørgsmålet. En afvisning uden en
           opringning er en kunde der møder op til en pose der ikke
           findes – og gæsten har fået at vide at vi ringer. */
        if (!confirm('Afvis bestillingen fra ' + b.navn + '?\n\n'
          + 'Husk at ringe til ' + b.telefon + ' – gæsten har fået at vide '
          + 'at vi ringer og bekræfter.')) return;
        gemBestilling(Butik.skrive.bestillingStatus(b.id, 'afvist', felt.value),
          'Bestillingen er afvist.');
      });
      raekke.appendChild(afvis);
    }

    if (b.status === 'afhentet' || b.status === 'afvist') {
      var slet = lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!confirm('Slet bestillingen fra ' + b.navn + ' for altid?')) return;
        gemBestilling(Butik.skrive.sletBestilling(b.id), 'Bestillingen er slettet.');
      });
      raekke.appendChild(slet);
    }

    k.appendChild(raekke);
    return k;
  }

  /* Som Admin.gem(), men henter BESTILLINGERNE igen og ikke alt
     det andet. genindlæs() henter syv tabeller; en statusknap skal
     ikke hente hele menukortet forfra. */
  function gemBestilling(løfte, besked) {
    return løfte
      .then(hentBestillinger)
      .then(function () { Admin.kvitter(besked); })
      .catch(function (e) { Admin.brøl(e.message || String(e)); });
  }

  function hentBestillinger() {
    return Butik.hentBestillinger().then(function (liste) {
      bestillinger = liste || [];
      tegnBestillinger();
      var t = Butik.nu();
      $('bestil-hentet').textContent = 'Hentet kl. '
        + ('0' + Math.floor(t.minutter / 60)).slice(-2) + '.'
        + ('0' + (t.minutter % 60)).slice(-2);
    }).catch(function (e) {
      /* Fejlen skjules IKKE. Står der ingenting, tror medarbejderen
         at der ikke er nogen bestillinger – og så møder en kunde op
         til en pose der ikke findes. */
      var boks = $('bestillinger-liste');
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'fejl',
        'Bestillingerne kunne ikke hentes: ' + (e.message || e)
        + ' Prøv "Hent på ny", eller log ud og ind igen.'));
      if (window.console) console.warn('bestillinger:', e);
    });
  }

  $('bestil-genindlaes').addEventListener('click', hentBestillinger);

  // ---- Reglerne for bestilling ----
  function tegnBestilRegler() {
    var i = Admin.data.indstillinger || {};
    // Standard er ÅBEN. Er nøglen slet ikke i databasen – fordi
    // setup.sql ikke er kørt igen – skal formularen virke.
    $('bestil-aaben').checked = i.bestilling_aaben !== false;
    $('bestil-varsel-timer').value =
      i.bestilling_varsel_timer === undefined ? 24 : i.bestilling_varsel_timer;
    $('bestil-min-stk').value =
      i.bestilling_min_stk === undefined ? 1 : i.bestilling_min_stk;
    $('bestil-besked-tekst').value = i.bestilling_besked || '';
  }

  $('gem-bestil-regler').addEventListener('click', function () {
    var timer = Number($('bestil-varsel-timer').value);
    var min = Number($('bestil-min-stk').value);

    if (!isFinite(timer) || timer < 0 || timer > 720) {
      return Admin.brøl('Varslet skal være mellem 0 og 720 timer.');
    }
    if (!isFinite(min) || min < 1 || min > 500) {
      return Admin.brøl('Mindste antal skal være mellem 1 og 500.');
    }

    Admin.gem(Butik.skrive.indstilling('bestilling_aaben', $('bestil-aaben').checked)
      .then(function () {
        return Butik.skrive.indstilling('bestilling_varsel_timer', Math.round(timer));
      })
      .then(function () {
        return Butik.skrive.indstilling('bestilling_min_stk', Math.round(min));
      })
      .then(function () {
        return Butik.skrive.indstilling('bestilling_besked',
          $('bestil-besked-tekst').value.trim());
      }), 'Reglerne for bestilling er gemt.');
  });

  Admin.tegnere.push(tegnBestilRegler);
  Admin.hentBestillinger = hentBestillinger;
})();
