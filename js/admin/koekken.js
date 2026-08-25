/* ============================================================
   KØKKEN-KØEN — skærmen, der står tændt i køkkenet

   Se js/admin/kerne.js for de to principper, der gælder i alle
   admin-filerne.

   ------------------------------------------------------------
   DEN VISER KUN BORDENE, OG DET ER EN SKÆRM — IKKE EN TABEL
   ------------------------------------------------------------
   Briefen bad om, at bordbestillinger ikke måtte blandes ind i
   den eksisterende admin. Det er løst med en egen skærm og ikke
   med en egen tabel, og forskellen er værd at kende:

   · Køkkenet har ÉN kø. To tabeller ville være to lister, nogen
     skal huske at kigge i — og den dag begge har travlt, er det
     den ene, der bliver glemt.
   · Salgstallene, udeblivelserne og dagens omsætning regner
     allerede på bestillinger. En anden tabel skulle regnes med i
     hver eneste af dem, hver gang der kom en ny.
   · Bordnummeret ER adskillelsen: en bestilling MED bord_nummer
     er fra et bord, en uden er fra hjemmesiden. Skærmen
     filtrerer; dataene deler sig ikke.

   ------------------------------------------------------------
   FIRE TRIN, ÉT TRYK
   ------------------------------------------------------------
   ny → tilberedes → klar → serveret. Knappen viser kun det
   NÆSTE trin: en skærm med fire knapper pr. kort er fire steder
   at ramme forkert med en fedtet finger.

   Kræver supabase/restaurant.sql — uden den afviser databasen
   'tilberedes' og 'serveret', og køkkenet kan ikke komme videre
   fra "ny".
   ============================================================ */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  /* Femten minutter. Kortere, og hvert eneste kort er rødt i en
     frokost, hvor alting tager tid; længere, og et bord, der er
     glemt, ser ud som et bord, der er i gang. Tallet er briefens. */
  var FOR_LAENGE_MIN = 15;

  /* Trinene i den rækkefølge, køkkenet arbejder i. 'klar' fandtes
     i forvejen og bruges også af mad ud af huset — de to veje
     mødes dér og skilles igen. */
  var TRIN = [
    { id: 'ny', navn: 'Modtaget', naeste: 'tilberedes', knap: 'Start tilberedning' },
    { id: 'tilberedes', navn: 'Tilberedes', naeste: 'klar', knap: 'Meld klar' },
    { id: 'klar', navn: 'Klar', naeste: 'serveret', knap: 'Serveret' },
  ];

  var FAERDIG = { serveret: true, afvist: true, udeblevet: true, afhentet: true };

  /* 'bekraeftet' er ikke køkkenets ord, men et bord kan lande dér:
     kortet står OGSÅ på Bestillinger, og trykker nogen "Bekræft"
     der, skal køkkenet stadig kunne komme videre. Uden linjen her
     faldt kortet tilbage på TRIN[0] og kaldte sig "Modtaget" —
     rigtigt næste trin, forkert navn på skærmen. */
  var SOM_NY = { ny: 'Modtaget', bekraeftet: 'Bekræftet' };

  function trinFor(status) {
    var t = TRIN.filter(function (x) { return x.id === status; })[0];
    if (t) return t;
    if (SOM_NY[status]) {
      return { id: status, navn: SOM_NY[status], naeste: 'tilberedes',
        knap: 'Start tilberedning' };
    }
    return null;
  }

  /* Navnet på et trin, der ikke er et trin. 'serveret' er enden på
     vejen og står derfor ikke i TRIN — men kvitteringen skal kunne
     sige, hvad der lige skete. */
  var NAVNE = { serveret: 'Serveret', afvist: 'Afvist' };

  function navnFor(status) {
    var t = trinFor(status);
    return (t && t.navn) || NAVNE[status] || status;
  }

  /* Bordbestillingerne, ældste først. Et køkken arbejder i den
     rækkefølge, tingene kom ind — ikke i den, de skal hentes.
     Derfor er den her sortering en ANDEN end vagtskærmens på
     Overblik, og det er med vilje. */
  function koeen() {
    return (Admin.lister.bestillinger || [])
      .filter(function (b) {
        return b.bord_nummer && !b.slettet && !FAERDIG[b.status];
      })
      .sort(function (a, b) { return (a.oprettet || '') < (b.oprettet || '') ? -1 : 1; });
  }

  function minutterSiden(iso) {
    var t = Date.parse(iso || '');
    if (!isFinite(t)) return null;
    return Math.floor((Date.now() - t) / 60000);
  }

  function klokken(iso) {
    var d = new Date(Date.parse(iso || ''));
    if (isNaN(d.getTime())) return '';
    return ('0' + d.getHours()).slice(-2) + '.' + ('0' + d.getMinutes()).slice(-2);
  }

  function beloeb(b) {
    var sum = (b.linjer || []).reduce(function (s, l) {
      return s + (Number(l.pris) || 0) * (Number(l.antal) || 0);
    }, 0);
    return sum ? Butik.pris(sum) : '';
  }

  // ----------------------------------------------------------
  //  ALLE BORDE: hvem venter, og hvor længe
  // ----------------------------------------------------------
  function tegnBorde() {
    var boks = $('koekken-borde');
    if (!boks) return;
    Admin.tøm(boks);

    var liste = koeen();
    if (!liste.length) return;

    /* Ét bord kan have flere bestillinger — "Bestil mere" lægger
       en NY ordre på det samme bord, så personalet kan se, at det
       er den samme regning. Stribens tal er derfor bestillinger,
       ikke borde. */
    var pr = {};
    liste.forEach(function (b) {
      var n = b.bord_nummer;
      if (!pr[n]) pr[n] = { antal: 0, aeldst: null };
      pr[n].antal++;
      var m = minutterSiden(b.oprettet);
      if (m !== null && (pr[n].aeldst === null || m > pr[n].aeldst)) pr[n].aeldst = m;
    });

    var stribe = lav('div', 'koek-borde');
    Object.keys(pr).sort().forEach(function (n) {
      var b = pr[n];
      var chip = lav('span', 'koek-bordchip'
        + (b.aeldst !== null && b.aeldst >= FOR_LAENGE_MIN ? ' sent' : ''));
      chip.appendChild(lav('b', null, 'Bord ' + n));
      chip.appendChild(lav('span', null,
        b.antal + (b.antal === 1 ? ' ordre' : ' ordrer')
        + (b.aeldst !== null ? ' · ' + b.aeldst + ' min' : '')));
      stribe.appendChild(chip);
    });
    boks.appendChild(stribe);
  }

  // ----------------------------------------------------------
  //  KØEN
  // ----------------------------------------------------------
  function tegnKoekken() {
    var boks = $('koekken-liste');
    if (!boks) return;

    var liste = koeen();
    var maerke = $('koekken-antal');
    if (maerke) {
      maerke.textContent = liste.length || '';
      maerke.classList.toggle('skjult', !liste.length);
    }

    tegnBorde();

    if (!liste.length) {
      Admin.tøm(boks);
      /* Tomt er et SVAR, ikke en tom skærm. Står der ingenting,
         tror man, at skærmen er gået i stå — og så begynder nogen
         at genindlæse midt i en frokost. */
      boks.appendChild(lav('p', 'vare-tekst',
        'Ingen bestillinger fra bordene lige nu. Skærmen siger selv til.'));
      return;
    }

    /* Række for række, så et kort, der ikke har ændret sig, bliver
       STÅENDE. Rives listen ned og bygges op, mister køkkenet det
       kort, fingeren var på vej ned mod. Se Admin.tegnRaekker. */
    Admin.tegnRaekker(boks, liste.map(function (b) {
      return {
        noegle: String(b.id),
        aftryk: [b.status, b.intern_note || '', b.aendret || ''].join('|'),
        byg: function () { return kort(b); },
      };
    }));
  }

  /* ÉT TRYK SKAL FLYTTE KORTET, IKKE BARE GEMME.

     Admin.gem henter INDSTILLINGERNE igen — ikke bestillingerne.
     Køen lever af Admin.lister.bestillinger, som bestillinger.js
     melder ind, så et gem uden en ny hentning ville lade kortet
     stå med det gamle trin, til frisk.js' takt indhentede det et
     minut senere. Et minut er en evighed i et køkken: personalet
     trykker igen, og bestillingen springer et trin over.

     Admin.friskOp henter alle listerne og giver et løfte tilbage;
     når det er indfriet, HAR meld() tegnet køen om. Først dér
     kvitteres der. Går det galt, kommer knappen tilbage — ellers
     står køkkenet med et dødt kort. */
  function videre(b, status, knap, besked) {
    return Butik.skrive.bestillingStatus(b.id, status)
      .then(function () { return Admin.friskOp(); })
      .then(function () { Admin.kvitter(besked); })
      .catch(function (e) {
        knap.disabled = false;
        var m = e && e.message || String(e);
        /* Indtil supabase/restaurant.sql er kørt, kender databasen
           hverken 'tilberedes' eller 'serveret' — og så skal der stå
           HVAD man gør, ikke en rå constraint-fejl. */
        if (/bestilling_status_ok/.test(m)) {
          m = 'Databasen kender ikke "' + navnFor(status) + '" endnu. '
            + 'Kør supabase/restaurant.sql i Supabase først.';
        }
        Admin.brøl(m);
      });
  }

  function kort(b) {
    var t = trinFor(b.status) || TRIN[0];
    var min = minutterSiden(b.oprettet);
    var sent = min !== null && min >= FOR_LAENGE_MIN;

    var k = lav('div', 'koek-kort' + (sent ? ' sent' : ''));
    k.setAttribute('data-bord', b.bord_nummer);

    var top = lav('div', 'koek-top');
    top.appendChild(lav('div', 'koek-bord', 'Bord ' + b.bord_nummer));
    var ur = lav('div', 'koek-ur');
    ur.appendChild(lav('span', 'koek-min', min === null ? '—' : min + ' min'));
    ur.appendChild(lav('span', 'koek-kl', 'kl. ' + klokken(b.oprettet)));
    top.appendChild(ur);
    k.appendChild(top);

    var linjer = lav('div', 'koek-linjer');
    (b.linjer || []).forEach(function (l) {
      var r = lav('div', 'koek-linje');
      r.appendChild(lav('b', null, (l.antal || 1) + ' ×'));
      r.appendChild(lav('span', null, l.navn));
      linjer.appendChild(r);
    });
    k.appendChild(linjer);

    /* NOTEN ER DET VIGTIGSTE PÅ KORTET. "Uden remoulade" og
       "allergi" er ikke en detalje — det er forskellen på en
       middag og en ambulance. Derfor står den fremhævet og ikke
       som en linje mere. */
    if (b.besked) {
      var note = lav('div', 'koek-note');
      note.appendChild(lav('b', null, '📝 '));
      note.appendChild(lav('span', null, b.besked));
      k.appendChild(note);
    }

    var bund = lav('div', 'koek-bund');
    var status = lav('span', 'koek-status', t.navn);
    bund.appendChild(status);
    var kr = beloeb(b);
    /* Der er ingen betaling i systemet — gæsten betaler ved lugen.
       Beløbet står som en huskeseddel til den, der tager imod, og
       IKKE som et "betalt"-mærke: et sådant mærke ville være en
       påstand, ingen har dækning for. */
    if (kr) bund.appendChild(lav('span', 'koek-kr', kr + ' · betales ved lugen'));

    var knap = lav('button', 'knap koek-knap', t.knap);
    knap.type = 'button';
    knap.addEventListener('click', function () {
      knap.disabled = true;
      videre(b, t.naeste, knap,
        'Bord ' + b.bord_nummer + ': ' + navnFor(t.naeste) + '.');
    });
    bund.appendChild(knap);

    /* AFVIS ER IKKE ET TRIN, DET ER EN UNDTAGELSE — derfor står
       den til sidst og i den dæmpede stil. Er retten udsolgt, skal
       gæsten vide det, mens hun sidder der; personalet går ud og
       siger det. Systemet kan ikke sige det for dem, og det lover
       det heller ikke. */
    var afvis = lav('button', 'knap fare lille', 'Kan ikke laves');
    afvis.type = 'button';
    afvis.addEventListener('click', function () {
      if (!window.confirm('Afvis bestillingen til bord ' + b.bord_nummer + '?\n\n'
        + 'Gæsten sidder ved bordet og får ingen besked af systemet — '
        + 'gå ud og sig det.')) return;
      afvis.disabled = true;
      videre(b, 'afvist', afvis,
        'Bord ' + b.bord_nummer + ' er afvist. Husk at sige det ved bordet.');
    });
    bund.appendChild(afvis);

    k.appendChild(bund);
    return k;
  }

  // ----------------------------------------------------------
  //  KONTAKTEN OG VENTETIDEN
  // ----------------------------------------------------------
  function tegnRestaurant() {
    var i = Admin.data.indstillinger || {};
    /* ÅBEN SOM STANDARD. En kontakt, ingen har rørt, må ikke kunne
       slukke for noget, der virkede i går. */
    if ($('bord-aaben')) $('bord-aaben').checked = i.bordbestilling_aaben !== false;
    if ($('bord-ventetid')) {
      $('bord-ventetid').value = i.bord_ventetid_min === undefined
        ? '' : i.bord_ventetid_min;
    }
  }

  if ($('bord-aaben')) {
    $('bord-aaben').addEventListener('change', function () {
      var til = $('bord-aaben').checked;
      Admin.gem(Butik.skrive.indstilling('bordbestilling_aaben', til),
        til ? 'Bordene kan bestille igen.'
            : 'Bordbestilling er lukket. Det, der er i køen, kører færdigt.');
    });
  }

  if ($('bord-ventetid')) {
    Admin.autogem($('bord-ventetid').closest('.kort'), function () {
      var v = $('bord-ventetid').value.trim();
      if (v === '') return Butik.skrive.indstilling('bord_ventetid_min', null);
      var n = Number(v);
      if (!isFinite(n) || n < 0 || n > 180) return 'Ventetiden skal være 0–180 minutter.';
      return Butik.skrive.indstilling('bord_ventetid_min', Math.round(n));
    });
  }

  /* URET SKAL TIKKE. Ventetiden er tallet, køkkenet handler på, og
     et tal, der står stille, indtil nogen henter data, er et tal,
     der lyver. Ét minut er nok: kortene skifter kun, når minuttet
     gør. */
  setInterval(function () {
    if ($('admin') && !$('admin').classList.contains('skjult')) tegnKoekken();
  }, 60000);

  Admin.tegnere.push(tegnRestaurant);

  /* "Opdateret kl. 14.32" skrives kun, når der FAKTISK er hentet.
     Uret ovenfor tegner også om hvert minut, og skrev den linjen,
     ville den love en hentning, der ikke havde fundet sted — og
     så kunne skærmen stå med en død forbindelse og se sprællevende
     ud. Køkkenet henter ikke selv: bestillinger.js gør det og
     melder listen ind. */
  var sidsteListe = null;
  Admin.efterHent.push(function () {
    tegnKoekken();
    /* efterHent fyrer, hver gang EN fane melder — også borde og
       forespørgsler. Kun bestillingernes egen hentning må stemple
       linjen, og den kendes på, at listen er et nyt objekt. */
    if (Admin.lister.bestillinger === sidsteListe) return;
    sidsteListe = Admin.lister.bestillinger;
    Admin.hentet('koekken-hentet');
  });
  Admin.vedLogin.push(tegnKoekken);
})();
