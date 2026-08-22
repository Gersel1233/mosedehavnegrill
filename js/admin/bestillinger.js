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
    afhentet: 'Afhentet', afvist: 'Afvist', udeblevet: 'Udeblevet',
  };

  // Hvad er det NÆSTE der skal ske? Én knap, ikke en rulleliste.
  var NAESTE = {
    ny: ['bekraeftet', 'Bekræft'],
    bekraeftet: ['klar', 'Sæt som klar'],
    klar: ['afhentet', 'Afhentet'],
  };

  var bestillinger = [];

  /* Udeblivelser pr. telefonnummer, 180 dage tilbage. Nummeret
     normaliseres til de sidste otte cifre — det er dem, der er
     nummeret; +45 og mellemrum er indpakning, og en gænger skal
     ikke kunne nulstille sig selv med et landekode-præfiks. */
  var udeblivelser = {};

  function nummerNoegle(t) {
    var cifre = String(t || '').replace(/\D/g, '');
    return cifre.slice(-8);
  }

  function hentUdeblivelser() {
    return Butik.hentUdeblivelser().then(function (liste) {
      udeblivelser = {};
      (liste || []).forEach(function (u) {
        var n = nummerNoegle(u.telefon);
        if (n) udeblivelser[n] = (udeblivelser[n] || 0) + 1;
      });
    }).catch(function () { udeblivelser = {}; });
  }

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
    k.setAttribute('data-id', String(b.id));

    var top = lav('div', 'bestil-top');
    top.appendChild(lav('span', 'bestil-tid',
      String(b.hent_tid || '').slice(0, 5).replace(':', '.')));
    top.appendChild(lav('span', 'maerke m-' + b.status,
      STATUS_NAVNE[b.status] || b.status));
    /* Spis her skal kunne SES på kortet, ikke læses ud af en
       fritekst midt i en frokost: den ene skal i en pose, den
       anden på et bord med bestik. Afhentning er standarden og
       får intet mærke — ellers står der et mærke på hver eneste
       bestilling, og så betyder det ingenting. */
    if (b.hvordan === 'spis_her') {
      top.appendChild(lav('span', 'maerke favorit', 'Spis her'));
    }
    /* GÆNGEREN SES FØR MADEN LAVES — spiis' brief (22/8), betalt
       med rigtige middage i skraldespanden. Mærket står KUN på
       bestillinger, der stadig er i arbejde: på en afhentet er
       det bagklogskab, og på en afvist er det ligegyldigt. Tallet
       er antal udeblivelser fra samme nummer de sidste 180 dage.
       Det er en oplysning, ikke en dom — personalet ringer
       alligevel og bekræfter hver eneste bestilling. */
    var udeblev = udeblivelser[nummerNoegle(b.telefon)] || 0;
    if (udeblev > 0 && (b.status === 'ny' || b.status === 'bekraeftet' || b.status === 'klar')) {
      top.appendChild(lav('span', 'maerke gaenger',
        'Udeblevet ' + udeblev + (udeblev === 1 ? ' gang' : ' gange')));
    }
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

    /* UDEBLEV: maden blev lavet, gæsten kom aldrig. Kun fra
       'bekraeftet' og 'klar' — en NY bestilling, ingen har ringet
       om, kan ikke "udeblive"; den afvises eller bekræftes.
       Tæller aldrig som omsætning: salgsfanen tæller kun
       'afhentet', og det er netop pointen med at skille de to. */
    if (b.status === 'bekraeftet' || b.status === 'klar') {
      var ude = lav('button', 'knap sekundaer', 'Udeblev');
      ude.addEventListener('click', function () {
        if (!confirm('Sæt bestillingen fra ' + b.navn + ' som udeblevet?\n\n'
          + 'Brug den, når maden var klar, men ingen kom. Den tæller '
          + 'ikke som salg.')) return;
        gemBestilling(
          Butik.skrive.bestillingStatus(b.id, 'udeblevet', felt.value)
            .catch(function (e) {
              /* Indtil supabase/udeblivelser.sql er kørt, kender
                 databasen ikke ordet — og så skal der stå HVAD man
                 gør, ikke en rå constraint-fejl. */
              if (/bestilling_status_ok/.test(e.message || '')) {
                throw new Error('Databasen kender ikke "udeblevet" endnu. '
                  + 'Kør supabase/udeblivelser.sql i Supabase først.');
              }
              throw e;
            }),
          'Bestillingen er sat som udeblevet. Den tæller ikke som salg.');
      });
      raekke.appendChild(ude);
    }

    if (b.status !== 'afvist' && b.status !== 'afhentet' && b.status !== 'udeblevet') {
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

    if (b.status === 'afhentet' || b.status === 'afvist' || b.status === 'udeblevet') {
      /* "Slet" er ikke længere endeligt. Bestillingen flyttes til
         fanen Skraldespand og kan hentes tilbage i 30 dage — se
         supabase/skraldespand.sql. Spørgsmålet siger det, for der
         stod "for altid" før, og et fejltryk på en iPad ved lugen
         kostede en kundes navn og nummer. */
      var slet = lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!confirm('Flyt bestillingen fra ' + b.navn + ' til skraldespanden?\n\n'
          + 'Den kan hentes tilbage i 30 dage.')) return;
        gemBestilling(Butik.skrive.tilSkraldespand('bestilling', b.id),
          'Bestillingen ligger i skraldespanden.');
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
      .then(hentUdeblivelser)
      .then(hentBestillinger)
      .then(function () { Admin.kvitter(besked); })
      .catch(function (e) { Admin.brøl(e.message || String(e)); });
  }

  /* Samme fingeraftryk som i kerne.js, plus ét mere: de id'er,
     der er NYE siden sidst, får kortet til at lyse op i to
     sekunder. Det kan kun lade sig gøre, fordi der ikke længere
     tegnes om i tomgang — tegnede vi alt om hvert minut, var
     alting "nyt". Aftrykket tager status og noten med, så et
     statusskifte fra en anden enhed også slår igennem. */
  var sidsteListeAftryk = '';
  var kendteIder = null;

  function hentBestillinger() {
    return Butik.hentBestillinger().then(function (liste) {
      bestillinger = liste || [];
      Admin.meld('bestillinger', bestillinger);

      var aftryk = JSON.stringify(bestillinger.map(function (b) {
        return [b.id, b.status, b.aendret || '', b.intern_note || ''];
      }));
      if (aftryk === sidsteListeAftryk) return;
      sidsteListeAftryk = aftryk;

      var nyeIder = [];
      if (kendteIder) {
        bestillinger.forEach(function (b) {
          if (kendteIder.indexOf(String(b.id)) === -1) nyeIder.push(String(b.id));
        });
      }
      kendteIder = bestillinger.map(function (b) { return String(b.id); });

      tegnBestillinger();

      /* Markeringen af det nye — briefens punkt 3. Det er dét,
         der gør, at man SER bestillingen lande, i stedet for at
         hele skærmen bare har hoppet. */
      nyeIder.forEach(function (id) {
        var kort = document.querySelector('.bestil-kort[data-id="' + id + '"]');
        if (kort) kort.classList.add('linje-ny');
      });
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
  /* Om gæsten kan vælge "spis her". TIL som standard — se noten
     ved visHvordan() i js/bestilling.js: forretningen skal kunne
     begge dele. Fluebenet er måden at slå det FRA på, den dag
     køkkenet ikke kan nå at servere forudbestilt mad ved bordene. */
  function tegnSpisHer() {
    var felt = $('spis-her');
    if (!felt) return;
    felt.checked = (Admin.data.indstillinger || {}).spis_her !== false;
  }

  $('spis-her').addEventListener('change', function () {
    var til = $('spis-her').checked;
    Admin.gem(Butik.skrive.indstilling('spis_her', til),
      til ? 'Gæsten kan nu vælge at spise her.'
          : 'Gæsten kan ikke længere vælge at spise her — alt er afhentning.');
  });

  Admin.tegnere.push(tegnSpisHer);

  /* Grundprincippet — "bestillingen er accepteret; kan køkkenet
     ikke lave den, ringer de" — er ejerens valg, ikke vores.
     FRA som standard. Se noten i admin.html. */
  function tegnAutoBekraeft() {
    var felt = $('auto-bekraeft');
    if (!felt) return;
    felt.checked = (Admin.data.indstillinger || {}).auto_bekraeft === true;
  }

  if ($('auto-bekraeft')) {
    $('auto-bekraeft').addEventListener('change', function () {
      var til = $('auto-bekraeft').checked;
      Admin.gem(Butik.skrive.indstilling('auto_bekraeft', til),
        til ? 'Bestillinger bekræftes automatisk nu. Kan I ikke lave en, ringer I.'
            : 'Bestillinger bekræftes med et opkald igen.');
    });
  }

  Admin.tegnere.push(tegnAutoBekraeft);
  Admin.vedLogin.push(function () { return hentUdeblivelser().then(hentBestillinger); });
  Admin.friske.push(hentBestillinger);
})();
