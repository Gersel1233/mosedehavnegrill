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

  /* Zonen på bordet — "Terrassen", "Molen". Den er en RETNING at
     gå i, når maden er klar, og den står kun, hvis ejeren har sat
     den: de fleste steder har ét hjørne, og en tom prik efter
     bordnummeret ser ud som noget, der mangler. */
  function zonen(nummer) {
    var b = (Admin.lister.bordliste || []).filter(function (x) {
      return String(x.nummer).trim().toLowerCase()
        === String(nummer).trim().toLowerCase();
    })[0];
    return (b && String(b.zone || '').trim()) || '';
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
  /* ============================================================
     PLINGET, OG HVORFOR DET SKAL SLÅS TIL MED EN FINGER
     ------------------------------------------------------------
     Browsere blokerer lyd, indtil nogen har rørt skærmen. En
     iPad i et køkken, der har stået urørt siden morgenmaden,
     siger derfor INGENTING, når dagens første ordre kommer — og
     det opdager man først den dag, en ordre har stået i tyve
     minutter. Derfor knappen: den er både tilladelsen og
     kvitteringen for, at lyden virker.

     Tonen laves i browseren (WebAudio) og ikke som en fil: en
     lydfil er en hentning mere, der kan fejle på havnens net,
     og køkkenet skal kunne høre den uden at have været online
     et sekund før.

     ⚠️ OG LYDEN ER ALDRIG ALENE. Der er larm i et køkken. Et nyt
     kort markerer sig også synligt (.linje-ny), som på
     Bestillinger — se noten der. */
  var lydTil = false;
  var lyd = null;

  function pling() {
    if (!lydTil) return;
    try {
      if (!lyd) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        lyd = new AC();
      }
      if (lyd.state === 'suspended') lyd.resume();
      var t = lyd.currentTime;
      [880, 1320].forEach(function (hz, nr) {
        var o = lyd.createOscillator();
        var g = lyd.createGain();
        o.type = 'sine';
        o.frequency.value = hz;
        /* Blødt ind og ud: en firkantet tone knækker i en lille
           iPad-højttaler og lyder som en fejl, ikke som et pling. */
        g.gain.setValueAtTime(0.0001, t + nr * 0.14);
        g.gain.exponentialRampToValueAtTime(0.22, t + nr * 0.14 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + nr * 0.14 + 0.13);
        o.connect(g); g.connect(lyd.destination);
        o.start(t + nr * 0.14);
        o.stop(t + nr * 0.14 + 0.15);
      });
    } catch (e) { /* ingen lyd: markeringen på skærmen står stadig */ }
  }

  function sigLyd() {
    var knap = $('koekken-lyd');
    var note = $('koekken-lyd-note');
    if (knap) knap.textContent = lydTil ? '🔔 Lyden er slået til' : '🔔 Slå lyd til';
    if (knap) knap.classList.toggle('valgt', lydTil);
    if (note) {
      note.textContent = lydTil
        ? 'Lyden virker. Nye ordrer plinger og markeres på skærmen.'
        : 'Lyden er slået fra. Nye ordrer markeres stadig på skærmen.';
    }
  }

  if ($('koekken-lyd')) {
    $('koekken-lyd').addEventListener('click', function () {
      lydTil = !lydTil;
      sigLyd();
      // Trykket ER tilladelsen. Derfor prøver vi tonen med det
      // samme: hører man ingenting nu, virker den heller ikke kl. 19.
      if (lydTil) pling();
    });
    sigLyd();
  }

  /* De id'er, der er NYE siden sidst. Samme mønster som
     bestillinger.js: det kan kun lade sig gøre, fordi der ikke
     tegnes om i tomgang — tegnede vi alt om hvert minut, var
     alting "nyt". null første gang, så hele køen ved login ikke
     bliver til tredive plings på én gang. */
  var kendte = null;

  /* Er bestillingerne overhovedet hentet? Admin.lister.bestillinger
     er undefined, til bestillinger.js har meldt sin liste ind —
     og en tom kø, fordi vi ikke har hentet endnu, er noget helt
     andet end en tom kø, fordi der ikke er noget. */
  function hentet() { return Admin.lister.bestillinger !== undefined; }

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
      /* ⚠️ OG KØEN ER TOM — det skal skrives ned, MEN kun hvis vi
         faktisk har hentet.

         Første udgave satte kendte = [] her uden videre. Den
         rettede én fejl og lavede en anden, og prøverne fangede
         dem begge:

         · Uden linjen blev kendte stående på null hele
           formiddagen, mens skærmen viste "ingen bestillinger" —
           og dagens FØRSTE ordre blev behandlet som en
           førstegangsindlæsning: ingen markering, intet pling.
         · MED linjen uden gardet blev hele køen ved login til
           "nyt": tegnKoekken kører fra vedLogin, FØR
           bestillinger.js har meldt sin liste ind, så den så en
           tom kø, skrev [] ned — og et sekund senere lyste
           tredive kort op og plingede.

         Forskellen er, om listen overhovedet er meldt ind.
         Admin.lister.bestillinger er undefined, til den er. */
      if (hentet()) kendte = [];
      return;
    }

    /* Række for række, så et kort, der ikke har ændret sig, bliver
       STÅENDE. Rives listen ned og bygges op, mister køkkenet det
       kort, fingeren var på vej ned mod. Se Admin.tegnRaekker. */
    Admin.tegnRaekker(boks, liste.map(function (b) {
      return {
        noegle: String(b.id),
        /* Zonen er med i aftrykket, fordi bordlisten kan lande
           EFTER kortet er tegnet: uden den ville zonen først dukke
           op, næste gang bestillingen ændrede sig. */
        aftryk: [b.status, b.intern_note || '', b.aendret || '',
          zonen(b.bord_nummer)].join('|'),
        byg: function () { return kort(b); },
      };
    }));

    /* DET NYE SKAL KUNNE SES, ikke kun høres. Markeringen sættes
       EFTER optegningen: kortet skal findes i siden, før det kan
       få klassen på. */
    var nu = liste.map(function (b) { return String(b.id); });
    if (kendte) {
      var nye = nu.filter(function (id) { return kendte.indexOf(id) === -1; });
      nye.forEach(function (id) {
        var k = boks.querySelector('[data-raekke="' + id + '"]');
        if (k) k.classList.add('linje-ny');
      });
      if (nye.length) pling();
    }
    kendte = nu;
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
    var hvem = lav('div', 'koek-hvem');
    hvem.appendChild(lav('div', 'koek-bord', 'Bord ' + b.bord_nummer));
    var z = zonen(b.bord_nummer);
    if (z) hvem.appendChild(lav('div', 'koek-zone', z));
    top.appendChild(hvem);
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
    /* Og TOMT som standard for loftet, af samme grund: et tal, der
       kom af sig selv, ville lukke for bestillinger, ingen har
       bedt om at lukke for. */
    if ($('bord-loft')) {
      $('bord-loft').value = i.bord_loft_pr_kvarter === undefined
        || i.bord_loft_pr_kvarter === null ? '' : i.bord_loft_pr_kvarter;
    }
    if ($('bord-pr-ordre')) {
      $('bord-pr-ordre').value = i.bord_ventetid_pr_ordre_min === undefined
        || i.bord_ventetid_pr_ordre_min === null
        ? '' : i.bord_ventetid_pr_ordre_min;
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

  /* ÉT autogem PÅ HELE KORTET, og det samler BEGGE felter.
     Admin.autogem lytter på roden, så to kald på det samme kort
     ville betyde, at et tryk i ventetidsfeltet også skrev loftet
     — og omvendt. Rækkefølgen er ligegyldig; det er ét gem. */
  if ($('bord-ventetid') || $('bord-loft')) {
    var kortet = ($('bord-ventetid') || $('bord-loft')).closest('.kort');
    Admin.autogem(kortet, function () {
      var v = $('bord-ventetid') ? $('bord-ventetid').value.trim() : '';
      var l = $('bord-loft') ? $('bord-loft').value.trim() : '';

      var vent = null;
      if (v !== '') {
        var n = Number(v);
        if (!isFinite(n) || n < 0 || n > 180) return 'Ventetiden skal være 0–180 minutter.';
        vent = Math.round(n);
      }

      /* Tomt OG nul betyder begge "intet loft". Skrev nogen 0 for
         at slå det fra, må det ikke blive til "ingen ordrer
         overhovedet" — det ville lukke bordene i stilhed.
         Databasen læser det samme sted (mosede_bord_loft). */
      var loft = null;
      if (l !== '') {
        var m = Number(l);
        if (!isFinite(m) || m < 0 || m > 99) return 'Loftet skal være 0–99 ordrer.';
        loft = m > 0 ? Math.round(m) : null;
      }

      var p = $('bord-pr-ordre') ? $('bord-pr-ordre').value.trim() : '';
      var prOrdre = null;
      if (p !== '') {
        var q = Number(p);
        if (!isFinite(q) || q < 0 || q > 30) return 'Tillægget skal være 0–30 minutter.';
        prOrdre = q > 0 ? Math.round(q) : null;
      }

      return Butik.skrive.indstilling('bord_ventetid_min', vent)
        .then(function () {
          return Butik.skrive.indstilling('bord_loft_pr_kvarter', loft);
        })
        .then(function () {
          return Butik.skrive.indstilling('bord_ventetid_pr_ordre_min', prOrdre);
        });
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
