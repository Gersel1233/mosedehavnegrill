/* Fanen Borde: ønsker om et bord, og dagens billede.
   Se js/admin/kerne.js for de to principper, der gælder i alle
   admin-filerne.

   HER GIVES JA'ET — og kun her. Gæsten har fået at vide, at vi
   ringer og bekræfter, så en række her er et løfte om et opkald.
   Øverst står dagens billede: hvor mange pladser der allerede er
   sagt ja til pr. dag, målt mod antallet af pladser. Det er DET,
   der gør, at to gæster ikke kan få ja til det samme bord: der er
   kun én, der siger ja, og hun kan se, hvad hun har sagt ja til.

   Antallet af pladser er personalets eget tal og sættes hernede.
   Databasen håndhæver det med vilje ikke — se supabase/borde.sql. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  var STATUS_NAVNE = {
    ny: 'Ny', bekraeftet: 'Bekræftet', afvist: 'Afvist', udeblevet: 'Udeblev',
  };

  var borde = [];

  /* Nye øverst med den ÆLDSTE først — den, der har ventet længst
     på sit opkald, står øverst. Resten efter dag og tid: det er
     sådan, de står i restauranten. */
  var RANG = { ny: 0, bekraeftet: 1, afvist: 2, udeblevet: 3 };

  function sorteret(liste) {
    return liste.slice().sort(function (a, b) {
      var ra = RANG[a.status] === undefined ? 9 : RANG[a.status];
      var rb = RANG[b.status] === undefined ? 9 : RANG[b.status];
      if (ra !== rb) return ra - rb;
      if (a.status === 'ny') return a.oprettet < b.oprettet ? -1 : 1;
      if (a.dato !== b.dato) return a.dato < b.dato ? -1 : 1;
      return (a.tid || '') < (b.tid || '') ? -1 : 1;
    });
  }

  function pladser() {
    var v = Number((Admin.data.indstillinger || {}).bord_pladser);
    return isFinite(v) && v >= 1 ? Math.round(v) : null;
  }

  // ----------------------------------------------------------
  //  DAGENS BILLEDE
  //  --------------------------------------------------------
  //  Én linje pr. dag med ønsker, fra i dag og frem: hvor mange
  //  pladser er sagt ja til, og hvor mange venter. Det er tallet,
  //  man kigger på, FØR man trykker Bekræft — uden det siger man
  //  ja med lukkede øjne, og det er præcis sådan, to selskaber
  //  ender ved det samme bord.
  // ----------------------------------------------------------
  function tegnBillede() {
    var boks = $('borde-billede');
    if (!boks) return;
    Admin.tøm(boks);

    var i_dag = Butik.nu().dato;
    var dage = {};
    borde.forEach(function (b) {
      /* Udeblevet tæller heller ikke med: pladserne blev aldrig
         brugt. Den kan kun sættes bagud i tid, men reglen skrives
         ud, så den ikke afhænger af det. */
      if (b.dato < i_dag || b.status === 'afvist' || b.status === 'udeblevet') return;
      var d = dage[b.dato] || (dage[b.dato] = { ja: 0, venter: 0 });
      if (b.status === 'bekraeftet') d.ja += b.antal_personer || 0;
      else d.venter += 1;
    });

    var datoer = Object.keys(dage).sort();
    if (!datoer.length) return;

    var max = pladser();
    datoer.forEach(function (dato) {
      var d = dage[dato];
      var linje = lav('div', 'bestil-linje');
      linje.appendChild(lav('span', 'bestil-vare', Admin.pænDato(dato)));

      var tekst = d.ja + (max ? ' af ' + max : '') + ' pladser sagt ja til'
        + (d.venter ? ' · ' + d.venter + (d.venter === 1 ? ' ønske venter' : ' ønsker venter') : '');
      var felt = lav('span', 'bestil-linjepris', tekst);
      /* Rødt når ja'erne når loftet: det er IKKE et forbud — måske
         kan der klemmes et bord ind — men det skal ses, FØR der
         ringes og siges ja. */
      if (max && d.ja >= max) felt.className += ' fejl-tekst';
      linje.appendChild(felt);
      boks.appendChild(linje);
    });
  }

  // ----------------------------------------------------------
  //  LISTEN
  // ----------------------------------------------------------
  /* Kortene, der ikke har ændret sig, bliver stående — se noten
     ved Admin.tegnRaekker i kerne.js. Bordkortene har samme
     notefelt som bestillingerne, og samme fejl at undgå. */
  /* ⚠️ DET, DER ER OVERSTÅET, ER IKKE ARBEJDE (27/8).

     Listen viste ALT, der nogensinde var kommet ind. Kundens
     skærmbillede fangede det: en bekræftet booking fra I GÅR stod
     midt i arbejdslisten, mens linjen ovenover sagde "0 af 40
     pladser sagt ja til" for i dag. To tal på samme skærm om det
     samme — dagens billede tæller fra i dag og frem, listen
     tællede fra tidernes morgen.

     Om to måneder skulle personalet rulle forbi hundrede afholdte
     middage for at finde det ene ønske, der venter på et opkald.

     ⚠️ EN DAG, DER ER GÅET, ER FÆRDIG — uanset status. En
     bekræftet booking til i går er ikke "kommende", og et ønske
     fra i mandags kan ingen nå at svare på. Det er datoen, ikke
     statussen, der afgør, om der er noget at gøre. */
  function faerdig(b) {
    if (b.status === 'afvist' || b.status === 'udeblevet') return true;
    return !!(b.dato && b.dato < Butik.nu().dato);
  }

  function tegnBorde() {
    if (!$('borde-venter')) return;
    tegnBillede();

    var venter = sorteret(borde.filter(function (b) {
      return b.status === 'ny' && !faerdig(b);
    }));
    var kommende = sorteret(borde.filter(function (b) {
      return b.status === 'bekraeftet' && !faerdig(b);
    }));
    var slut = borde.filter(faerdig).sort(function (a, b) {
      // Nyeste først: det, der lige er sket, er det, man leder efter.
      if (a.dato !== b.dato) return a.dato > b.dato ? -1 : 1;
      return (a.tid || '') > (b.tid || '') ? -1 : 1;
    });

    /* Tallet i søjlen tæller kun det, der KAN gøres noget ved. Et
       ønske til i går er ikke et rødt tal værd — så ville mærket
       stå og lyse på noget, ingen kan lukke. */
    var maerke = $('borde-antal');
    if (venter.length) {
      maerke.textContent = venter.length;
      maerke.classList.remove('skjult');
    } else { maerke.classList.add('skjult'); }

    liste('borde-venter', venter, 'Ingen venter på svar.');
    liste('borde-kommende', kommende, 'Ingen borde er sagt ja til endnu.');
    liste('borde-faerdige', slut, 'Ingenting endnu.');

    var kort = $('borde-faerdige-kort');
    var titel = $('borde-faerdige-titel');
    if (titel) titel.textContent = '✓ Færdige (' + slut.length + ')';
    if (kort) kort.classList.toggle('skjult', !slut.length);
  }

  function liste(id, raekker, tomTekst) {
    var boks = $(id);
    if (!boks) return;
    if (!raekker.length) {
      Admin.tegnRaekker(boks, [{
        noegle: 'tom', aftryk: 'tom',
        byg: function () { return lav('p', 'vare-tekst', tomTekst); },
      }]);
      return;
    }
    Admin.tegnRaekker(boks, raekker.map(function (b) {
      return {
        noegle: 'bord-' + b.id,
        aftryk: JSON.stringify(b),
        byg: function () { return bordKort(b); },
      };
    }));
  }

  function bordKort(b) {
    var k = lav('div', 'bestil-kort b-' + b.status);

    var top = lav('div', 'bestil-top');
    top.appendChild(lav('span', 'maerke m-' + b.status,
      STATUS_NAVNE[b.status] || b.status));
    top.appendChild(lav('span', 'bestil-ref', b.reference));
    k.appendChild(top);

    var hvem = lav('div', 'bestil-hvem');
    hvem.appendChild(lav('span', 'vare-navn', b.navn));
    var tlf = lav('a', 'bestil-tlf', b.telefon);
    tlf.href = 'tel:' + String(b.telefon).replace(/[^0-9+]/g, '');
    hvem.appendChild(tlf);
    if (b.email) hvem.appendChild(lav('span', 'vare-tekst', b.email));
    k.appendChild(hvem);

    var detaljer = lav('div', 'bestil-linjer');
    var r1 = lav('div', 'bestil-linje');
    r1.appendChild(lav('span', 'bestil-vare',
      Admin.pænDato(b.dato) + ' kl. ' + String(b.tid || '').slice(0, 5).replace(':', '.')));
    r1.appendChild(lav('span', 'bestil-linjepris', b.antal_personer + ' personer'));
    detaljer.appendChild(r1);
    k.appendChild(detaljer);

    if (b.besked) {
      var m = lav('p', 'bestil-gaestebesked');
      m.appendChild(lav('strong', null, 'Gæsten skriver: '));
      m.appendChild(document.createTextNode(b.besked));
      k.appendChild(m);
    }

    var note = lav('div', 'felt');
    var etiket = lav('label', null, 'Din note');
    etiket.setAttribute('for', 'bord-note-' + b.id);
    var felt = document.createElement('input');
    felt.type = 'text';
    felt.id = 'bord-note-' + b.id;
    felt.maxLength = 1000;
    felt.value = b.intern_note || '';
    felt.placeholder = 'Fx: bord 4 ved vinduet';
    felt.addEventListener('change', function () {
      if (felt.value === (b.intern_note || '')) return;
      gemBord(Butik.skrive.bordStatus(b.id, b.status, felt.value), 'Noten er gemt.');
    });
    note.appendChild(etiket);
    note.appendChild(felt);
    k.appendChild(note);

    var raekke = lav('div', 'knap-raekke');

    if (b.status === 'ny') {
      var frem = lav('button', 'knap', 'Bekræft bordet');
      frem.addEventListener('click', function () {
        /* BOOKET ER BOOKET (23/8). Gæsten har ALLEREDE fået at
           vide, at bordet står der — kvitteringen siger "vi ses".
           Her sætter personalet bare et hak for, at de har set
           den, og der skal ikke ringes for at sige ja.

           Opkaldet hører til den anden vej: Afvis. Se noten der. */
        if (!confirm('Sæt hak ved bordet til ' + b.navn + ' — '
          + b.antal_personer + ' personer ' + Admin.pænDato(b.dato)
          + ' kl. ' + String(b.tid || '').slice(0, 5).replace(':', '.') + '?\n\n'
          + 'Gæsten har fået bordet i kvitteringen. Det her er jeres '
          + 'eget hak for, at I har set den.')) return;
        gemBord(Butik.skrive.bordStatus(b.id, 'bekraeftet', felt.value),
          'Bordet er sat på.');
      });
      raekke.appendChild(frem);
    }

    /* ⚠️ ET TOMT BORD ER IKKE ET AFSLAG.

       En bekræftet booking havde ét sted at gå hen: Afvis. Men at
       "afvise" et bord, gæsten skulle have siddet ved, er
       forkert — vi sagde jo ja. Uden et andet ord blev enten
       udeblivelsen skrevet som et afslag, eller også blev der
       ikke trykket, og bookingen stod som kommende for evigt.

       Nummeret samles, som ved bestillingerne: en familie, der
       booker seks pladser hver lørdag og aldrig kommer, skal
       kunne ses — før næste lørdag. */
    if (b.status === 'bekraeftet') {
      var udeblev = lav('button', 'knap', 'Udeblev');
      udeblev.addEventListener('click', function () {
        if (!confirm('Kom ' + b.navn + ' ikke?\n\n'
          + 'Bookingen flyttes til Færdige og tælles som en '
          + 'udeblivelse. Der skal ikke ringes.')) return;
        gemBord(Butik.skrive.bordStatus(b.id, 'udeblevet', felt.value),
          b.navn + ' er noteret som udeblevet.');
      });
      raekke.appendChild(udeblev);
    }

    if (b.status !== 'afvist' && b.status !== 'udeblevet') {
      var afvis = lav('button', 'knap fare', 'Afvis');
      afvis.addEventListener('click', function () {
        /* DET ER HER, DER SKAL RINGES. Gæsten fik bordet i sin
           kvittering og regner med det; et afslag, hun ikke har
           hørt, er en familie, der møder op. Nummeret står i
           beskeden, så det ikke skal slås op bagefter. */
        if (!confirm('Afvis bookingen fra ' + b.navn + '?\n\n'
          + 'RING TIL ' + b.telefon + ' — gæsten har fået bordet i sin '
          + 'kvittering og regner med det.')) return;
        gemBord(Butik.skrive.bordStatus(b.id, 'afvist', felt.value),
          'Bookingen er afvist. Ring til ' + b.telefon + '.');
      });
      raekke.appendChild(afvis);
    }

    /* ⚠️ GENDAN FØRST, SLET BAGEFTER — og Gendan fører til
       BEKRÆFTET, ikke til ny. Rækken HAR været set, det var
       derfor, nogen trykkede. Samme rettelse som Overblik (26/8),
       hvor et fejltryk i en frokost ellers sendte bestillingen
       tilbage i køen som ulæst. */
    if (b.status === 'afvist' || b.status === 'udeblevet') {
      var gendan = lav('button', 'knap', 'Gendan');
      gendan.addEventListener('click', function () {
        gemBord(Butik.skrive.bordStatus(b.id, 'bekraeftet', felt.value),
          'Bookingen står som bekræftet igen.');
      });
      raekke.appendChild(gendan);

      var slet = lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!confirm('Flyt bookingen fra ' + b.navn + ' til skraldespanden?\n\n'
          + 'Det kan hentes tilbage i 30 dage.')) return;
        gemBord(Butik.skrive.tilSkraldespand('bord', b.id),
          'Ønsket ligger i skraldespanden.');
      });
      raekke.appendChild(slet);
    }

    k.appendChild(raekke);
    return k;
  }

  // ----------------------------------------------------------
  //  PLADSERNE
  // ----------------------------------------------------------
  $('gem-pladser').addEventListener('click', function () {
    var v = $('bord-pladser').value.trim();
    var tal = Number(v);
    if (v !== '' && (!isFinite(tal) || tal < 1 || tal > 500 || Math.round(tal) !== tal)) {
      return Admin.brøl('Skriv et helt antal pladser — eller lad feltet stå tomt.');
    }
    Admin.gem(Butik.skrive.indstilling('bord_pladser', v === '' ? null : tal),
      v === '' ? 'Pladstallet er fjernet — dagens billede viser kun ja\'erne.'
               : 'Der regnes nu med ' + tal + ' pladser.');
  });

  function tegnPladser() {
    var felt = $('bord-pladser');
    if (!felt) return;
    var max = pladser();
    felt.value = max === null ? '' : max;
    tegnBillede();
  }

  // ----------------------------------------------------------
  //  HENT
  // ----------------------------------------------------------
  function gemBord(løfte, besked) {
    return løfte
      .then(hentBorde)
      .then(function () { Admin.kvitter(besked); })
      .catch(function (e) { Admin.brøl(e.message || String(e)); });
  }

  function hentBorde() {
    return Butik.hentBordbestillinger().then(function (liste) {
      borde = liste || [];
      Admin.meld('borde', borde);
      tegnBorde();
      Admin.hentet('borde-hentet');
    }).catch(function (e) {
      /* Fejlen skjules IKKE — ellers venter en familie på et
         opkald, ingen ved skal foretages. */
      var boks = $('borde-liste');
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'fejl',
        'Bookingerne kunne ikke hentes: ' + (e.message || e)
        + ' Skærmen prøver igen af sig selv om et øjeblik — bliver den'
        + ' ved, så log ud og ind igen.'));
      if (window.console) console.warn('borde:', e);
    });
  }


  /* ============================================================
     TAG EN BOOKING I TELEFONEN
     ------------------------------------------------------------
     Ringer nogen og bestiller et bord, fandtes der ingen vej ind:
     bookingen kunne kun laves på hjemmesiden. Så stod halvdelen
     af dagen i systemet og halvdelen på en seddel ved lugen — og
     dagens billede løj om, hvor mange pladser der var tilbage.

     DEN BRUGER GÆSTENS EGEN MOTOR. Butik.bookBord() er den samme
     funktion, hjemmesiden kalder, og dermed de samme værn: samme
     telefon + dag + tid er ét ønske, bremsen tæller, lukkedagen
     siger nej. At skrive en anden vej ind i den samme tabel ville
     være to regelsæt, der langsomt kommer til at sige noget
     forskelligt — og ingen ville opdage det, før to familier stod
     ved det samme bord.

     DEN OPRETTES SOM BEKRÆFTET. Personalet har sagt ja i røret;
     en booking, der lander som "ny", ville stå på listen som noget,
     der skal ringes om — og så bliver der ringet til en, der lige
     har lagt på. Statussen sættes bagefter, fordi adgangsreglen
     med vilje ikke lader nogen skrive status ved oprettelsen.
     ============================================================ */
  function opretBooking() {
    var navn = $('nyb-navn').value.trim();
    var telefon = $('nyb-telefon').value.trim();
    var dato = $('nyb-dato').value;
    var tid = $('nyb-tid').value;
    var antal = Number($('nyb-antal').value);

    /* Tjekket her er personalets, ikke gæstens: en kort, dansk
       sætning om hvad der mangler. Databasen tjekker det samme
       igen, og DEN kan ikke omgås. */
    var fejl = Butik.tjek.navn(navn, 'navn', 80)
      || Butik.tjek.telefon(telefon)
      || Butik.tjek.dato(dato);
    if (fejl) return Admin.brøl(fejl);
    if (!tid) return Admin.brøl('Skriv hvad klokken er. Et bord er også et tidspunkt.');
    if (!isFinite(antal) || antal < 1 || antal > 100) {
      return Admin.brøl('Antallet skal være mellem 1 og 100. Er I flere, '
        + 'er det et selskab — og det har sin egen indgang.');
    }

    var knap = $('opret-booking');
    knap.disabled = true;

    Butik.bookBord({
      navn: navn, telefon: telefon, dato: dato, tid: tid,
      antal_personer: antal,
      besked: $('nyb-besked').value.trim() || null,
    }).then(function (svar) {
      return hentBorde().then(function () {
        var ny = borde.filter(function (b) {
          return b.reference === svar.reference;
        })[0];
        if (!ny) return;
        /* Noten siger, hvor bookingen kom fra. Uden den ligner
           den en, gæsten selv har lavet — og så leder nogen efter
           en kvittering, der aldrig er sendt. */
        return Butik.skrive.bordStatus(ny.id, 'bekraeftet',
          'Taget i telefonen.').then(hentBorde);
      });
    }).then(function () {
      ['nyb-navn', 'nyb-telefon', 'nyb-dato', 'nyb-tid', 'nyb-antal', 'nyb-besked']
        .forEach(function (id) { $(id).value = ''; });
      Admin.kvitter('Bookingen er oprettet og bekræftet.');
    }).catch(function (e) {
      Admin.brøl(e.message || String(e));
    }).then(function () {
      knap.disabled = false;
    });
  }

  if ($('opret-booking')) {
    $('opret-booking').addEventListener('click', opretBooking);
  }

  Admin.tegnere.push(tegnPladser);
  Admin.vedLogin.push(hentBorde);
  Admin.friske.push(hentBorde);
})();
