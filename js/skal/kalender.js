/* ============================================================
   KALENDERSIDEN: RIGTIGE ARRANGEMENTER OG RIGTIGE RESERVATIONER

   Kundens spørgsmål (30/8): "kalender og arrangementer er fedt og
   godt, men hvor kommer reservationerne hen, hvad kan admin
   styre, hvordan gør vi det bulletproof."

   Svaret var: ingen steder. h-kalender.html kom med designet 23/8
   og har stået med FEM OPFUNDNE arrangementer siden — Ronni & de
   Salte, torskegilde, efterårsbrunch — med datoer, priser og
   "12 pladser tilbage". Knappen "Reservér plads" sendte
   ingenting. Siden indlæste ikke engang js/store.js.

   ------------------------------------------------------------
   ⚠️ DE FEM OPFUNDNE ER IKKE EN RESERVE
   ------------------------------------------------------------
   Andre steder på siden gælder reglen "vi overskriver kun, når
   databasen har noget at sige" — designets pladsholder bliver
   stående, hvis vi ikke har et bedre tal.

   Her er det modsat, og forskellen er værd at kende: en
   pladsholderpris er et tal, der er for højt eller lavt. Et
   opfundet ARRANGEMENT er en aften, folk møder op til. Kører
   gæsten til havnen fredag kl. 19 efter en koncert, der aldrig
   har eksisteret, er det ikke en skæv oplysning — det er en
   spildt aften. Er der ingen arrangementer i databasen, siger
   siden det.

   ------------------------------------------------------------
   ⚠️ SKALLEN ER IKKE RØRT
   ------------------------------------------------------------
   Kortene bygges med designets egne klasser (.evcard, .date,
   .line, .kind, .g.sm.solid), filtreringschipsene virker som før,
   og panelet står, hvor det stod. Det eneste, der er nyt, er, at
   indholdet kommer fra ejeren i stedet for fra en fil.
   ============================================================ */
(function () {
  'use strict';

  if (!window.Butik) return;

  var liste = document.querySelector('.evlist');
  var panel = document.getElementById('reserver');
  if (!liste) return;

  var MDR = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
    'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
  var MDR_LANG = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december'];

  var arrangementer = [];
  var pladser = {};
  var valgt = null;

  function lav(tag, klasse, tekst) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (tekst !== undefined && tekst !== null) el.textContent = tekst;
    return el;
  }
  function tøm(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }
  function id(n) { return document.getElementById(n); }

  /* Designets tre chips hedder Musik, Spisning og Fest, og de
     filtrerer på data-kind. Ejeren skriver ikke en "slags" i
     admin — han skriver en titel og en beskrivelse — så slagsen
     gættes af ordene, præcis som menukortets emoji gør det.

     ⚠️ DET FØRSTE MØNSTER VINDER, og rækkefølgen er derfor ikke
     tilfældig: "fællesspisning med levende musik" er en spisning
     med musik til, ikke en koncert med mad. */
  var SLAGS = [
    [/spis|brunch|middag|gilde|buffet|frokost|menu/i, 'spisning'],
    [/musik|koncert|jam|band|live|dj|sang/i, 'musik'],
    [/fest|gilde|jul|nytår|fastelavn|halloween|bal/i, 'fest'],
  ];
  function slagsFor(k) {
    /* ⚠️ EJERENS VALG SLÅR GÆTTET (31/8). Kundens ord: "når man
       opretter et arrangement, skal man jo også vælge kategorien,
       som så skal opdateres og virke korrekt på siden." Gættet
       nedenfor gjorde alt ukendt til Musik — han så selv et
       arrangement stå som "MUSIK · 145". Kolonnen kommer med
       supabase/arrangement-kategori.sql; null = ikke valgt, og så
       gætter vi som før, så de gamle rækker står som i går. */
    var valgt = String(k.kategori || '');
    if (valgt === 'musik' || valgt === 'spisning' || valgt === 'fest') return valgt;
    var t = (k.titel || '') + ' ' + (k.beskrivelse || '');
    for (var i = 0; i < SLAGS.length; i++) {
      if (SLAGS[i][0].test(t)) return SLAGS[i][1];
    }
    return 'musik';
  }

  function dagsTal(iso) {
    return Number(String(iso).slice(8, 10));
  }
  function mdrKort(iso) {
    return MDR[Number(String(iso).slice(5, 7)) - 1] || '';
  }
  function pænDag(iso) {
    return dagsTal(iso) + '. ' + (MDR_LANG[Number(String(iso).slice(5, 7)) - 1] || '');
  }
  function klokken(k) {
    if (!k.start_kl) return '';
    return String(k.start_kl).slice(0, 5);
  }

  /* Linjen over overskriften: slagsen og prisen, som designet
     skriver den ("Musik · fri entré"). Prisen er ejerens FRITEKST
     — der er ingen betaling i systemet, og en kolonne med kroner
     ville se ud, som om der var. Har han ikke skrevet noget, står
     der bare slagsen. */
  function kindTekst(k, slags) {
    var navn = slags === 'spisning' ? 'Spisning'
      : (slags === 'fest' ? 'Fest' : 'Musik');
    var pris = String(k.pris_tekst || '').trim();
    return pris ? navn + ' · ' + pris : navn;
  }

  /* "3 pladser tilbage" — men KUN når der er et loft, og kun når
     der er tilmelding. Uden loft er tallet en oplysning, ingen har
     givet os, og på et "kig forbi"-arrangement ville det være et
     krav, der ikke findes. */
  function pladsTekst(k) {
    if (!k.tilmelding) return '';
    var p = pladser[k.id];
    if (!p || !p.pladser) return '';
    var tilbage = p.pladser - (p.optaget || 0);
    if (tilbage <= 0) return 'Udsolgt';
    if (tilbage === 1) return '1 plads tilbage';
    return tilbage + ' pladser tilbage';
  }

  function udsolgt(k) { return pladsTekst(k) === 'Udsolgt'; }

  function tegnListe() {
    tøm(liste);

    if (!arrangementer.length) {
      /* ⚠️ INGEN OPFUNDNE ARRANGEMENTER. Se noten øverst: en
         opdigtet aften er en spildt køretur, ikke et skævt tal. */
      var tom = lav('div', 'evtom');
      tom.appendChild(lav('b', null, 'Der er ikke planlagt noget lige nu'));
      tom.appendChild(lav('p', null,
        'Vi sætter arrangementerne op her, så snart de er på plads — '
        + 'kig forbi igen, eller spørg ved lugen.'));
      liste.appendChild(tom);
      if (panel) panel.style.display = 'none';
      return;
    }

    arrangementer.forEach(function (k, i) {
      var slags = slagsFor(k);
      var kort = lav('div', 'evcard rev' + (i ? ' d' + Math.min(i, 2) : ''));
      kort.setAttribute('data-kind', slags);
      kort.setAttribute('data-ev', String(i));
      kort.setAttribute('data-kalender', String(k.id));

      var dato = lav('div', 'date');
      dato.appendChild(lav('b', null, String(dagsTal(k.dato)).padStart(2, '0')));
      dato.appendChild(lav('span', null, mdrKort(k.dato)));
      kort.appendChild(dato);
      kort.appendChild(lav('div', 'line'));

      var krop = lav('div');
      krop.appendChild(lav('span', 'kind', kindTekst(k, slags)));
      krop.appendChild(lav('h3', null, k.titel));

      var brød = [];
      if (klokken(k)) brød.push('Kl. ' + klokken(k));
      if (String(k.beskrivelse || '').trim()) brød.push(String(k.beskrivelse).trim());
      var plads = pladsTekst(k);
      if (plads) brød.push(plads);
      if (brød.length) krop.appendChild(lav('p', null, brød.join(' · ')));

      /* Knappen findes kun, hvor der ER noget at melde sig til.
         Et "kig forbi"-arrangement med en reservationsknap ville
         sende gæsten ned i en formular, der ikke kan bruges. */
      if (k.tilmelding && !udsolgt(k)) {
        var knap = lav('a', 'g sm solid', 'Reservér plads');
        knap.href = '#reserver';
        knap.setAttribute('data-pick', '');
        knap.setAttribute('data-kalender', String(k.id));
        knap.addEventListener('click', function () { vælg(k.id); });
        krop.appendChild(knap);
      } else if (k.tilmelding && udsolgt(k)) {
        krop.appendChild(lav('span', 'evudsolgt', 'Udsolgt — ring, hvis I er i tvivl'));
      } else {
        krop.appendChild(lav('span', 'evfri', 'Kig bare forbi — ingen tilmelding'));
      }

      /* ⚠️ HELE KORTET KAN TRYKKES (30/8). Kundens ord: "man skal
         kunne trykke ind paa de individuelle og se og laese mere
         omkring det og reservere derinde ogsaa." Beskrivelsen er
         klippet til én linje i listen; laget har den hel. */
      kort.classList.add('evklik');
      kort.setAttribute('role', 'button');
      kort.setAttribute('tabindex', '0');
      kort.addEventListener('click', function (e) {
        /* Knappen inde i kortet gør sit eget — ellers ville et
           tryk på "Reservér plads" både åbne laget og vælge. */
        if (e.target.closest && e.target.closest('[data-pick]')) return;
        aabnLag(k);
      });
      kort.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aabnLag(k); }
      });

      /* BILLEDET (30/8, supabase/arrangement-info.sql).

         ⚠️ INGEN PLADSHOLDER. Har arrangementet intet foto, står
         der ingenting — ikke en grå kasse. Det er den samme regel
         som resten af huset (js/skal/billedplads.js): en tom
         plads er værre end ingen plads, og et stockfoto af en
         koncert ville love en koncert, vi ikke har set. */
      if (String(k.billede || '').trim()) {
        var foto = document.createElement('img');
        foto.className = 'evfoto';
        foto.src = k.billede;
        /* ⚠️ ALT-TEKSTEN ER ARRANGEMENTETS, ikke "billede". En
           skærmlæser skal kunne sige, hvad man kigger på. */
        foto.alt = k.titel || '';
        foto.loading = 'lazy';
        krop.appendChild(foto);
      }

      kort.appendChild(krop);
      liste.appendChild(kort);
    });

    /* Designets rul-ind hænger på .rev, og iagttageren er sat op,
       før kortene fandtes. De er i syne nu, så de tændes med det
       samme — ellers står listen usynlig med opacity 0. */
    Array.prototype.forEach.call(liste.querySelectorAll('.rev'), function (el) {
      el.classList.add('in');
    });
  }

  /* ============================================================
     ÉT ARRANGEMENT FOR SIG  (30/8)
     ------------------------------------------------------------
     Kundens ord: "hvis nu der var flere ting derinde og reservér
     knappen, peger den så på 1 random en? Nej."

     Laget viser ét arrangement helt: dag, klokkeslæt, hvad det
     er, prisen og hvor mange pladser der er tilbage — og dets
     EGEN reservationsknap, som vælger netop det i formularen.

     ⚠️ ER DER INGEN TILMELDING, ER DER INGEN KNAP. Et "kig
     forbi"-arrangement med en reservationsknap ville sende
     gæsten ned i en formular, der ikke kan bruges til noget. */
  function aabnLag(k) {
    var lag = id('ev-lag');
    if (!lag) return;
    var slags = slagsFor(k);

    var s = id('ev-slags');
    if (s) s.textContent = kindTekst(k, slags);
    var t = id('ev-titel');
    if (t) t.textContent = k.titel;

    var naar = [pænDag(k.dato)];
    if (klokken(k)) naar.push('kl. ' + klokken(k));
    var h = id('ev-hvornaar');
    if (h) h.textContent = naar.join(' · ');

    /* Billedet i laget. Det står FØR teksten: man kigger på et
       foto og læser bagefter, ikke omvendt. */
    var lagFoto = id('ev-foto');
    if (lagFoto) {
      var url = String(k.billede || '').trim();
      lagFoto.src = url || '';
      lagFoto.alt = url ? (k.titel || '') : '';
      lagFoto.style.display = url ? '' : 'none';
    }

    var tekst = id('ev-tekst');
    if (tekst) {
      var b = String(k.beskrivelse || '').trim();
      tekst.textContent = b;
      tekst.style.display = b ? '' : 'none';
    }

    var plads = id('ev-plads');
    if (plads) {
      var linjer = [];
      var p = pladsTekst(k);
      if (p) linjer.push(p);
      /* ⚠️ PRISEN STÅR ÉN GANG. kindTekst() har den allerede i
         mærkatet øverst — MÅLT på et skud: "Spisning · 145,- pr.
         person" stod over, og "40 pladser tilbage · 145,- pr.
         person" stod under. To gange det samme tal er ikke to
         oplysninger. */
      if (!k.tilmelding) linjer.push('Kig bare forbi — ingen tilmelding');
      plads.textContent = linjer.join(' · ');
      plads.style.display = linjer.length ? '' : 'none';
    }

    var cta = id('ev-cta');
    if (cta) {
      tøm(cta);
      if (k.tilmelding && !udsolgt(k)) {
        var knap = lav('button', 'g solid blk', 'Reservér plads til dette');
        knap.type = 'button';
        knap.addEventListener('click', function () {
          vælg(k.id);
          lukLag();
          var mål = id('reserver');
          if (mål) mål.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        cta.appendChild(knap);
      } else if (k.tilmelding) {
        cta.appendChild(lav('p', 'hint', 'Udsolgt — ring, hvis I er i tvivl.'));
      }
      var luk2 = lav('button', 'g', 'Tilbage');
      luk2.type = 'button';
      luk2.addEventListener('click', lukLag);
      cta.appendChild(luk2);
    }

    lag.classList.add('open');
  }

  function lukLag() {
    var lag = id('ev-lag');
    if (lag) lag.classList.remove('open');
  }

  if (id('ev-luk')) id('ev-luk').addEventListener('click', lukLag);
  if (id('ev-lag')) {
    id('ev-lag').addEventListener('click', function (e) {
      /* Et klik på den mørke flade lukker; et klik inde i kortet
         gør ikke. Laget har ingen felter, man kan miste — men et
         utilsigtet luk midt i en beskrivelse er stadig irriterende. */
      if (e.target === id('ev-lag')) lukLag();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') lukLag();
  });

  function tegnVælger() {
    var vælger = id('karr');
    if (!vælger) return;
    var med = arrangementer.filter(function (k) {
      return k.tilmelding && !udsolgt(k);
    });

    if (!med.length) {
      /* Ingen arrangementer tager imod. Panelet skjuler sig —
         samme regel som resten af huset: et afsnit uden noget at
         vise findes ikke. */
      if (panel) panel.style.display = 'none';
      pegVidere(false);
      return;
    }
    if (panel) panel.style.display = '';
    pegVidere(true);

    tøm(vælger);
    med.forEach(function (k) {
      var o = document.createElement('option');
      o.value = String(k.id);
      o.textContent = pænDag(k.dato) + ' · ' + k.titel;
      vælger.appendChild(o);
    });
    if (valgt && med.some(function (k) { return String(k.id) === String(valgt); })) {
      vælger.value = String(valgt);
    }
    valgt = vælger.value;
  }

  /* ⚠️ EN KNAP, DER PEGER PÅ ET SKJULT PANEL, GØR INGENTING.

     Kundens ord 30/8: "reservér plads-knappen dirigerer ingen
     steder hen". Han havde ret, og det var ikke pillen, der var
     i stykker: INTET arrangement havde tilmelding slået til (der
     var ingen vej til at sætte fluebenet bagefter), så panelet
     #reserver stod med display:none — og den flydende pille, der
     hedder "Reservér plads", pegede på #reserver.

     Et tryk gjorde da præcis ingenting: browseren hopper ikke
     til noget, den ikke kan se. Ingen fejl, ingen bevægelse.

     Nu følger de tre knapper virkeligheden: kan man reservere,
     peger de på formularen; kan man ikke, peger de på LISTEN og
     siger "Se arrangementerne". Ét sted at rette, fordi de tre
     ellers ville skride fra hinanden. */
  function pegVidere(kanReservere) {
    var mål = kanReservere ? '#reserver' : '#evliste';
    var ord = kanReservere ? 'Reservér plads' : 'Se arrangementerne';

    [id('bestil-pill'), document.querySelector('.sheet-cta a[href="#reserver"]'),
      document.querySelector('.sheet-cta a[href="#evliste"]')]
      .forEach(function (a) {
        if (!a) return;
        a.setAttribute('href', mål);
        /* Teksten står i en tekstknude ved siden af ikonet og
           glansen — hele indholdet må ikke skrives over, ellers
           forsvinder designets svg og .sheen. */
        Array.prototype.forEach.call(a.childNodes, function (n) {
          if (n.nodeType === 3 && n.nodeValue.trim()) n.nodeValue = ord;
        });
      });
  }

  function vælg(kalenderId) {
    valgt = String(kalenderId);
    var vælger = id('karr');
    if (vælger) vælger.value = valgt;
  }

  // ----------------------------------------------------------
  //  AFSENDELSEN
  // ----------------------------------------------------------
  function fineFelt() { return panel && panel.querySelector('.fine'); }
  var oprindeligFine = '';

  function sigFejl(tekst) {
    var f = fineFelt();
    if (!f) return false;
    f.textContent = '⚠ ' + tekst;
    f.classList.add('fejl-linje');
    return false;
  }
  function rydFejl() {
    var f = fineFelt();
    if (!f) return;
    f.textContent = oprindeligFine;
    f.classList.remove('fejl-linje');
  }

  function send() {
    var vælger = id('karr');
    var navn = (id('knavn') || {}).value || '';
    var tlf = (id('ktlf') || {}).value || '';
    var antal = (id('kantal') || {}).value || '1';

    if (String(navn).trim().length < 2) return sigFejl('Skriv dit navn.');
    if (String(tlf).replace(/[^0-9]/g, '').length < 8) {
      return sigFejl('Skriv et telefonnummer, så vi kan sige til, hvis noget ændrer sig.');
    }
    if (!vælger || !vælger.value) return sigFejl('Vælg hvilket arrangement du vil med til.');

    var knap = panel.querySelector('button.g.solid.blk');
    if (knap) knap.disabled = true;
    rydFejl();

    /* Hvor gæsten vil sidde, er ikke en kolonne — det er et ønske,
       personalet læser. En kolonne til hver af designets små
       valgmuligheder ville være en SQL-fil pr. felt, og ingen af
       dem ville nogensinde blive brugt til at regne på noget. */
    var hvor = (id('kbord') || {}).value || '';
    var besked = String((id('kbesked') || {}).value || '').trim();
    if (hvor && hvor !== 'Er lige meget') {
      besked = 'Vil gerne sidde: ' + hvor + (besked ? '\n' + besked : '');
    }

    Butik.reserverPlads({
      kalender_id: vælger.value,
      navn: navn,
      telefon: tlf,
      antal_personer: antal,
      besked: besked || null,
    }).then(function (svar) {
      visTak(svar);
    }).catch(function (e) {
      sigFejl(e.message || String(e));
      if (knap) knap.disabled = false;
    });
  }

  function visTak(svar) {
    var k = arrangementer.filter(function (x) {
      return String(x.id) === String(valgt);
    })[0];

    /* ⚠️ TALLET PÅ KORTET SKAL FØLGE MED (30/8).

       Pladserne hentes ved sideindlæsning (visningen
       arrangement_pladser), og uden den her linje stod der stadig
       "40 pladser tilbage", lige efter gæsten havde taget fire.
       Næste gæst så det rigtige tal, men hun, der lige havde
       reserveret, læste det som om det ikke var gået igennem —
       og trykkede igen. Fundet på et skærmbillede, ikke ved at
       læse koden.

       Det er ikke et gæt: vi ved præcis, hvor mange hun tog. Og
       det er stadig DATABASEN, der tæller — næste hentning
       overskriver tallet her. */
    var p = pladser[valgt];
    if (p && p.pladser) {
      p.optaget = (p.optaget || 0) + (Number(svar.antal_personer) || 0);
      tegnListe();
    }

    tøm(panel);
    panel.appendChild(lav('h3', null, 'Vi ses, ' + String(svar.navn).split(' ')[0] + '!'));

    var p = lav('p', 'hint');
    p.textContent = k
      ? 'I står på listen til ' + k.titel + ' ' + pænDag(k.dato)
        + (klokken(k) ? ' kl. ' + klokken(k) : '') + '.'
      : 'I står på listen.';
    panel.appendChild(p);

    /* ⚠️ DEN LOVER IKKE ET OPKALD. Personalet ringer kun, hvis
       noget ændrer sig — og en kvittering, der siger "vi ringer",
       får gæsten til at vente på et opkald, der aldrig kommer.
       Samme lære som bordbookingen: bestilt er bestilt. */
    panel.appendChild(lav('p', 'hint',
      'Vi siger til, hvis noget ændrer sig. Bliver I forhindret, '
      + 'så ring — så kan pladsen gå videre til en anden.'));

    panel.appendChild(lav('div', 'note', 'Reference: ' + svar.reference));
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ----------------------------------------------------------
  //  START
  // ----------------------------------------------------------
  var f = fineFelt();
  oprindeligFine = f ? f.textContent : '';

  if (panel) {
    var knap = panel.querySelector('button.g.solid.blk');
    if (knap) {
      knap.type = 'button';
      knap.addEventListener('click', send);
    }
    var vælger = id('karr');
    if (vælger) vælger.addEventListener('change', function () { valgt = vælger.value; });
    ['knavn', 'ktlf'].forEach(function (n) {
      var el = id(n);
      if (el) el.addEventListener('input', rydFejl);
    });
  }

  /* ⚠️ HVER DEL HAR SIN EGEN FANGST. Fejler pladstællingen, skal
     arrangementerne stadig stå på siden — se noten ved
     hentPladser i js/store.js. Én fejlende del må ikke vælte
     resten; det er husets dyreste lære (26/8, nødmenuen med to
     varer). */
  Butik.hent().then(function (d) {
    arrangementer = Butik.arrangementer(d);
    return Butik.hentPladser().catch(function () { return {}; });
  }).then(function (p) {
    pladser = p || {};
    tegnListe();
    tegnVælger();
  }).catch(function (e) {
    if (window.console) console.warn('kalendersiden:', e);
    arrangementer = [];
    tegnListe();
  });
}());
