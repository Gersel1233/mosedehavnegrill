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

  /* ⚠️ FORMULAREN ER FOLDET SAMMEN BAG PILLEN  (13/9). Kundens ord:
     "reservér plads inde på hvad sker der skal bare være en knap i
     bunden ligesom bestilling tingen på forsiden, og ved klik kommer
     den, der er der nu". Hver vej ind folder den ud: pillen,
     skuffemenuen, kortenes knap, lagets knap og et direkte #reserver.

     ⚠️ CAPTURE, IKKE EN ALMINDELIG LYTTER. havnegrillen.js binder sit
     ankerhop direkte på hvert #-link ved indlæsning — FØR den her fil —
     og hoppet slår målets position op i samme øjeblik. Et panel med
     display:none har ingen position, og så landede gæsten i toppen af
     siden med formularen stadig foldet. Capture på document kører før
     lytteren på selve linket. */
  function åbnReservation() {
    if (panel) panel.classList.remove('foldet');
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href="#reserver"]') : null;
    if (a) åbnReservation();
  }, true);
  if (location.hash === '#reserver' && panel) {
    åbnReservation();
    requestAnimationFrame(function () { panel.scrollIntoView({ block: 'start' }); });
  }

  var MDR = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
    'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
  var MDR_LANG = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december'];

  var arrangementer = [];
  var hoppet = false;

  /* Et link til ÉT arrangement: h-kalender.html#arr-33.
     Samme form som menukortets hopTilHash — ét greb, der kendes
     igen, i stedet for to måder at gøre det samme. */
  function hopTilArrangement() {
    if (hoppet) return;
    var id = String(location.hash || '').replace(/^#/, '');
    if (!/^arr-\d+$/.test(id)) return;
    var maal = document.getElementById(id);
    if (!maal) return;
    hoppet = true;
    try { maal.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    catch (e) { maal.scrollIntoView(); }
  }
  var pladser = {};
  var valgt = null;
  /* Hele datasættet — stederne og forretningens adresse bor i det. */
  var dataNu = {};

  /* ÉT SVAR PÅ "KAN MAN MELDE SIG TIL?" (12/10) — Butik.tilmeldingStatus,
     det samme, admin og databasens bremse siger: aflyst · frist · fuld ·
     venteliste · aaben · '' (ingen tilmelding). Kortet, laget og
     formularen spørger her, så de ikke kan blive uenige. */
  function status(k) { return Butik.tilmeldingStatus(k, pladser[k.id]); }
  function kanMelde(k) { var s = status(k); return s === 'aaben' || s === 'venteliste'; }
  function stedFor(k) { return Butik.stedNavn(dataNu, k); }
  /* "18.00–22.00" — sluttiden med, når den findes (16/9: "vi skal have en
     sluttidskolonne"; den stod i admin, men aldrig på siden). */
  function tidTekst(k) {
    if (!k.start_kl) return '';
    return klokken(k) + (k.slut_kl ? '–' + Butik.klokken(k.slut_kl) : '');
  }
  /* "Tilmelding senest fredag 16. oktober kl. 16.00" — fristen i dansk tid. */
  function fristTekst(k) {
    var ms = Butik.fristUdloeber(k);
    if (ms === null || !window.Intl) return '';
    try {
      var dele = {};
      new Intl.DateTimeFormat('da-DK', { timeZone: 'Europe/Copenhagen', weekday: 'long',
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false })
        .formatToParts(new Date(ms)).forEach(function (d) { dele[d.type] = d.value; });
      return 'Tilmelding senest ' + dele.weekday + ' ' + dele.day + '. ' + dele.month
        + ' kl. ' + dele.hour + '.' + dele.minute;
    } catch (e) { return ''; }
  }

  function lav(tag, klasse, tekst) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (tekst !== undefined && tekst !== null) el.textContent = tekst;
    return el;
  }
  function tøm(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }
  function id(n) { return document.getElementById(n); }

  /* Chipsene hedder Musik, Spisning, Fest og Andet, og de
     filtrerer på data-kind. Vælger ejeren ikke en slags, gættes
     den af ordene, præcis som menukortets emoji gør det.

     ⚠️ DET FØRSTE MØNSTER VINDER, og rækkefølgen er derfor ikke
     tilfældig: "fællesspisning med levende musik" er en spisning
     med musik til, ikke en koncert med mad. */
  /* ⚠️ REGLEN FLYTTEDE TIL Butik.arrangementSlags (16/9) — den
     stod her, og index.html loader ikke denne fil, så forsidens
     musikbanner kunne ikke spørge og lod equalizeren pulse for et
     loppemarked. Begrundelserne (ejerens valg slår gættet, og
     bagstopperen er 'andet' og ikke 'musik') står nu ved
     funktionen i js/store.js. Indpakningen her holder de to
     kaldsteder nedenfor uændrede. */
  function slagsFor(k) {
    return Butik.arrangementSlags(k);
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
  /* ⚠️ PUNKTUM, IKKE KOLON. Hele huset skriver "kl. 18.00"
     (js/bord.js, js/bestilling.js, bestil-regler.js); kalenderen
     skrev 18:00 — MÅLT på et skud af kvitteringen 4/9. Én
     skrivemåde pr. klokkeslæt, ellers standser gæsten ved den. */
  function klokken(k) {
    if (!k.start_kl) return '';
    return Butik.klokken(k.start_kl);   /* én kilde (5/9) */
  }

  /* Linjen over overskriften: slagsen og prisen, som designet
     skriver den ("Musik · fri entré"). Prisen er ejerens FRITEKST
     — der er ingen betaling i systemet, og en kolonne med kroner
     ville se ud, som om der var. Har han ikke skrevet noget, står
     der bare slagsen. */
  function kindTekst(k, slags) {
    var NAVNE = { musik: 'Musik', spisning: 'Spisning', fest: 'Fest', andet: 'Andet' };
    var navn = NAVNE[slags] || 'Andet';
    var pris = String(k.pris_tekst || '').trim();
    return pris ? navn + ' · ' + pris : navn;
  }

  /* "3 pladser tilbage" — men KUN når der er et loft, og kun når
     der er tilmelding. Uden loft er tallet en oplysning, ingen har
     givet os, og på et "kig forbi"-arrangement ville det være et
     krav, der ikke findes. */
  function pladsTekst(k) {
    var s = status(k);
    if (s === 'frist') return 'Tilmeldingen er lukket';
    if (s === 'fuld') return 'Udsolgt';
    if (s === 'venteliste') return 'Udsolgt — der er venteliste';
    if (s !== 'aaben') return '';
    var p = pladser[k.id];
    if (!p || !p.pladser) return '';
    var tilbage = p.pladser - (p.optaget || 0);
    if (tilbage === 1) return '1 plads tilbage';
    return tilbage + ' pladser tilbage';
  }
  function udsolgt(k) { return status(k) === 'fuld'; }

  /* Knappen på kortet og i laget — ÉN regel for, hvad den siger (12/10). */
  function knapFor(k, iLaget) {
    var s = status(k);
    if (k.aflyst) {
      return lav('span', 'evudsolgt', 'Aflyst' + (k.aflyst_tekst ? ': ' + k.aflyst_tekst : '')
        + '. Ring, hvis I har spørgsmål');
    }
    if (k.bord_booking) {
      /* Fredagsbaren: "Husk at bestille bord" (1/10) er en knap nu, der
         lander på bordbookingen med dagen valgt (js/bord.js, ?dato=). */
      var bk = lav('a', iLaget ? 'g solid blk' : 'g sm solid', 'Book bord');
      bk.href = 'bord/?dato=' + encodeURIComponent(k.dato);
      bk.setAttribute('data-pick', '');
      return bk;
    }
    if (s === 'aaben' || s === 'venteliste') {
      var ord = s === 'venteliste' ? 'Skriv jer på ventelisten'
        : (iLaget ? 'Reservér plads til dette' : 'Reservér plads');
      var knap = lav(iLaget ? 'button' : 'a', iLaget ? 'g solid blk' : 'g sm solid', ord);
      if (iLaget) knap.type = 'button';
      else knap.href = '#reserver';
      knap.setAttribute('data-pick', '');
      knap.setAttribute('data-kalender', String(k.id));
      return knap;
    }
    if (s === 'frist') return lav('span', 'evudsolgt', 'Tilmeldingen er lukket. Ring, hvis I er i tvivl');
    if (s === 'fuld') return lav('span', 'evudsolgt', 'Udsolgt. Ring, hvis I er i tvivl');
    return lav('span', 'evfri', 'Kig bare forbi, ingen tilmelding');
  }

  function tegnListe() {
    tøm(liste);

    if (!arrangementer.length) {
      /* ⚠️ INGEN OPFUNDNE ARRANGEMENTER. Se noten øverst: en
         opdigtet aften er en spildt køretur, ikke et skævt tal. */
      var tom = lav('div', 'evtom');
      tom.appendChild(lav('b', null, 'Der er ikke planlagt noget lige nu'));
      tom.appendChild(lav('p', null,
        'Vi sætter arrangementerne op her, så snart de er på plads. '
        + 'Kig forbi igen, eller spørg ved lugen.'));
      liste.appendChild(tom);
      if (panel) panel.style.display = 'none';
      return;
    }

    arrangementer.forEach(function (k, i) {
      var slags = slagsFor(k);
      var kort = lav('div', 'evcard rev' + (i ? ' d' + Math.min(i, 2) : '') + (k.aflyst ? ' aflyst' : ''));
      kort.setAttribute('data-kind', slags);
      kort.setAttribute('data-ev', String(i));
      kort.setAttribute('data-kalender', String(k.id));
      /* ⚠️ ET ARRANGEMENT KAN LINKES TIL  (2/10). Chefen: *"Lad
         forsidens event/nyhed linke videre til kalenderarrangementet,
         hvis hjemmesidens systemet understøtter det."* Det gjorde
         det ikke — kortene havde ingen id, så et link kunne kun
         pege på siden og ikke på arrangementet.
         Rækken bærer sit eget id, så henvisningen aldrig peger på
         et NABO-arrangement, hvis rækkefølgen skifter. Findes
         ankeret ikke (arrangementet er slettet eller udløbet),
         lander gæsten øverst på kalenderen — ikke på en fejl. */
      kort.id = 'arr-' + k.id;

      var dato = lav('div', 'date');
      dato.appendChild(lav('b', null, String(dagsTal(k.dato)).padStart(2, '0')));
      dato.appendChild(lav('span', null, mdrKort(k.dato)));
      kort.appendChild(dato);
      kort.appendChild(lav('div', 'line'));

      var krop = lav('div');
      krop.appendChild(lav('span', 'kind', kindTekst(k, slags)));
      krop.appendChild(lav('h3', null, k.titel));

      var brød = [];
      if (tidTekst(k)) brød.push('Kl. ' + tidTekst(k));
      if (stedFor(k)) brød.push(stedFor(k));
      if (String(k.beskrivelse || '').trim()) brød.push(String(k.beskrivelse).trim());
      var plads = pladsTekst(k);
      if (plads) brød.push(plads);
      if (brød.length) krop.appendChild(lav('p', null, brød.join(' · ')));

      /* Knappen findes kun, hvor der ER noget at melde sig til.
         Et "kig forbi"-arrangement med en reservationsknap ville
         sende gæsten ned i en formular, der ikke kan bruges. */
      var knap = knapFor(k, false);
      if (knap.tagName === 'A' && knap.getAttribute('href') === '#reserver') {
        knap.addEventListener('click', function () { vælg(k.id); });
      }
      krop.appendChild(knap);

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

    /* ⚠️ OG SÅ HOP DERHEN, hvis nogen er kommet med et link til ét
       arrangement (2/10). EFTER .in er sat: et element med
       opacity 0 har stadig en plads, men et smooth scroll til noget
       usynligt ser ud som om linket ikke virkede.
       Findes ankeret ikke, sker der ingenting — gæsten står øverst
       på kalenderen, hvilket er det rigtige svar for et
       arrangement, der er væk. */
    hopTilArrangement();
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
    if (tidTekst(k)) naar.push('kl. ' + tidTekst(k));
    if (stedFor(k)) naar.push(stedFor(k));
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
      if (!k.tilmelding && !k.bord_booking && !k.aflyst) linjer.push('Kig bare forbi, ingen tilmelding');
      if (kanMelde(k)) {
        var frist = fristTekst(k);
        if (frist) linjer.push(frist);
      }
      plads.textContent = linjer.join(' · ');
      plads.style.display = linjer.length ? '' : 'none';
    }

    var cta = id('ev-cta');
    if (cta) {
      tøm(cta);
      var knap = knapFor(k, true);
      if (knap.tagName === 'BUTTON') {
        knap.addEventListener('click', function () {
          vælg(k.id);
          lukLag();
          åbnReservation();
          var mål = id('reserver');
          if (mål) mål.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      cta.appendChild(knap);
      /* "Gem i min kalender" (12/10) — gæstens egen telefon minder om
         det. Ingen sms og ingen udgift: "Din mad er klar" blev fjernet
         15/9, fordi det var for dyrt i længden. */
      if (!k.aflyst) cta.appendChild(kalenderLink(k, 'g'));
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
      return k.tilmelding && kanMelde(k);
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
    /* ⚠️ INTET VALGT PÅ FORHÅND, NÅR DER ER FLERE  (13/9). Kundens ord:
       "ikke bare tag den nyeste, men man kan vælge imellem dem".
       Listen valgte det første af sig selv, og en gæst, der kom for
       fredagens koncert, kunne sende en reservation til torsdagens
       fællesspisning uden at se det. Er der kun ét, er det det. */
    var tom = document.createElement('option');
    tom.value = '';
    tom.textContent = 'Vælg arrangement';
    vælger.appendChild(tom);
    med.forEach(function (k) {
      var o = document.createElement('option');
      o.value = String(k.id);
      o.textContent = pænDag(k.dato) + ' · ' + k.titel;
      vælger.appendChild(o);
    });
    if (valgt && med.some(function (k) { return String(k.id) === String(valgt); })) {
      vælger.value = String(valgt);
    } else {
      vælger.value = med.length === 1 ? String(med[0].id) : '';
    }
    valgt = vælger.value || null;
    tegnValg(med);
  }

  /* ⚠️ KORT, IKKE EN RULLELISTE  (13/9). Rullelisten klippede titlen
     og sagde ikke, hvor mange pladser der var tilbage. Hvert kort er
     en radioknap med dag, titel, klokkeslæt, pladser og pris — det
     samme, gæsten lige har læst i listen ovenfor, så hun kan se, at
     det er DET arrangement, hun trykker på. */
  function tegnValg(med) {
    var boks = id('kvalg');
    if (!boks) return;
    tøm(boks);
    med.forEach(function (k) {
      var b = lav('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('data-kalender', String(k.id));
      var d = lav('span', 'd');
      d.appendChild(lav('b', null, String(dagsTal(k.dato)).padStart(2, '0')));
      d.appendChild(lav('span', null, mdrKort(k.dato)));
      b.appendChild(d);
      var t = lav('span', 't');
      t.appendChild(lav('b', null, k.titel));
      var info = [];
      if (tidTekst(k)) info.push('kl. ' + tidTekst(k));
      var p = pladsTekst(k);
      if (p) info.push(p);
      var pris = String(k.pris_tekst || '').trim();
      if (pris) info.push(pris);
      if (info.length) t.appendChild(lav('span', null, info.join(' · ')));
      b.appendChild(t);
      b.appendChild(lav('span', 'fl'));
      b.addEventListener('click', function () { vælg(k.id); rydFejl(); });
      boks.appendChild(b);
    });
    markerValg();
  }

  function markerValg() {
    var boks = id('kvalg');
    if (!boks) return;
    Array.prototype.forEach.call(boks.querySelectorAll('button'), function (b) {
      var på = valgt !== null && String(b.getAttribute('data-kalender')) === String(valgt);
      b.classList.toggle('on', på);
      b.setAttribute('aria-checked', på ? 'true' : 'false');
    });
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

  var knapOrd = null;
  function vælg(kalenderId) {
    valgt = String(kalenderId);
    var vælger = id('karr');
    if (vælger) vælger.value = valgt;
    markerValg();
    var k = arrangementer.filter(function (x) { return String(x.id) === valgt; })[0];
    if (!k) return;
    /* Loftet pr. tilmelding er arrangementets eget (12/10; tomt = 20). */
    var antal = id('kantal');
    if (antal) antal.max = String(k.max_pr_tilmelding || 20);
    /* Og knappen siger, hvad der sker: en plads eller en venteliste. */
    var knap = panel && panel.querySelector('button.g.solid.blk');
    if (knap) {
      if (knapOrd === null) knapOrd = knap.textContent;
      knap.textContent = status(k) === 'venteliste' ? 'Skriv os på ventelisten' : knapOrd;
    }
  }

  // ----------------------------------------------------------
  //  AFSENDELSEN
  // ----------------------------------------------------------
  function fineFelt() { return panel && panel.querySelector('.fine'); }
  var oprindeligFine = '';

  /* ⚠️ ET FEJLKORT OG FELTET RØDT (28/9). Her stod "⚠ " + sætningen i
     den grå 12 px-linje under knappen med klassen fejl-linje — som INGEN
     regel i stilarket kendte. Feltet fik hverken fokus eller farve.
     Formen er den samme som forespørgslernes (js/skal/feltfejl.js). */
  function sigFejl(tekst, feltEl) {
    var f = fineFelt();
    if (f) {
      f.classList.add('fejlkort');
      f.setAttribute('role', 'alert');
      f.textContent = '';
      var ikon = document.createElement('span');
      ikon.className = 'fejl-ikon';
      ikon.setAttribute('aria-hidden', 'true');
      ikon.textContent = '!';
      var t = document.createElement('span');
      t.className = 'fejl-tekst';
      t.textContent = tekst;
      f.appendChild(ikon);
      f.appendChild(t);
    }
    if (feltEl && window.MosedeFeltfejl) {
      window.MosedeFeltfejl.vis(feltEl, tekst);
      window.MosedeFeltfejl.frem(feltEl);
    }
    if (feltEl && feltEl.focus) {
      try { feltEl.focus({ preventScroll: true }); } catch (e) { feltEl.focus(); }
    }
    return false;
  }
  function rydFejl() {
    var f = fineFelt();
    if (!f) return;
    f.textContent = oprindeligFine;
    f.classList.remove('fejlkort');
    f.removeAttribute('role');
  }

  function send() {
    var vælger = id('karr');
    var navn = (id('knavn') || {}).value || '';
    var tlf = (id('ktlf') || {}).value || '';
    var antal = (id('kantal') || {}).value || '1';

    /* Arrangementet først: det er det øverste felt, og uden det er
       resten ligegyldigt. Kortene rulles frem, så gæsten kan se dem. */
    if (!vælger || !vælger.value) {
      var boks = id('kvalg');
      if (boks && boks.scrollIntoView) boks.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return sigFejl('Vælg hvilket arrangement du vil med til. Tryk på et af dem øverst.');
    }
    if (String(navn).trim().length < 2) return sigFejl('Skriv dit navn.', id('knavn'));
    /* Reglen er Butik.tjek.telefon (28/9). Kopien her så kun "under 8
       cifre" — et nummer med seksten gik igennem i øvetilstanden og
       blev afvist af databasen med "Otte cifre." */
    var tlfFejl = Butik.tjek.telefon(tlf);
    if (tlfFejl) {
      return sigFejl(String(tlf).trim() ? tlfFejl
        : 'Skriv dit telefonnummer, så vi kan sige til, hvis noget ændrer sig.', id('ktlf'));
    }

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

    /* ⚠️ ALLERGIEN BLEV ALDRIG LÆST HER  (21/9, MÅLT).

       h-kalender.html har haft #kallergi og en samtykkelinje
       siden 10/9 — og ordet "allergi" optrådte NUL gange i den
       her fil. En gæst, der tilmeldte sig en fællesspisning og
       skrev "skaldyr", fik hverken en linje at sige ja på eller
       en oplysning frem til køkkenet. Det er NØJAGTIG den fejl,
       frokostsiden fik rettet 16/9 — den blev bare rettet ét
       sted og ikke som en klasse. tests/allergi-paa-alle.spec.js
       læser nu alle sider og slår hvert felt op i den kode,
       siden faktisk indlæser, så en syvende side ikke kan slippe
       forbi.

       Og fællesspisningen er netop den aften, hvor køkkenet laver
       ÉN ret til alle — der er ingen menu at vælge sig uden om.

       ⚠️ SAMTYKKET SPÆRRER KUN, NÅR DER FAKTISK STÅR NOGET.
       Reglen er Butik.allergiMangler: kan man ikke tilmelde sig
       uden at sige ja til at få gemt en helbredsoplysning, er
       samtykket ikke frivilligt — og så er det ugyldigt. */
    var allergi = String((id('kallergi') || {}).value || '').trim();
    var aFlueben = id('kallergi-samtykke');
    var savn = Butik.allergiMangler(allergi, aFlueben && aFlueben.checked);
    if (savn) {
      if (aFlueben && aFlueben.focus) aFlueben.focus();
      if (knap) knap.disabled = false;
      return sigFejl(savn);
    }
    /* Forrest, med ordet ALLERGI:. Den samme ene regel, de fire
       andre veje bruger — og grunden til, at admin og køkkenet
       kan kende en allergi fra en almindelig besked. */
    besked = Butik.medAllergi(besked, allergi);

    var valgtArr = arrangementer.filter(function (x) { return String(x.id) === String(vælger.value); })[0] || {};
    var maks = valgtArr.max_pr_tilmelding || 20;
    if (Number(antal) > maks) {
      if (knap) knap.disabled = false;
      return sigFejl('Er I flere end ' + maks + ', så ring, så finder vi ud af det sammen.', id('kantal'));
    }
    /* Hvad regner siden med? Databasen bestemmer, og kvitteringen spørger
       bagefter (mosede_paa_venteliste) — det her er kun reserven. */
    var pl = pladser[valgtArr.id] || {};
    var forvent = status(valgtArr) === 'venteliste'
      || (!!valgtArr.venteliste && !!pl.pladser && (pl.optaget || 0) + Number(antal) > pl.pladser);
    Butik.reserverPlads({
      kalender_id: vælger.value,
      navn: navn,
      telefon: tlf,
      antal_personer: antal,
      besked: besked || null,
      max_pr_tilmelding: maks,
      forventVenteliste: forvent,
    }).then(function (svar) {
      visTak(svar);
    }).catch(function (e) {
      var grund = e.message || String(e);
      sigFejl(grund, /telefonnummer/i.test(grund) ? id('ktlf') : null);
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
    if (p && p.pladser && !svar.venteliste) {
      p.optaget = (p.optaget || 0) + (Number(svar.antal_personer) || 0);
      tegnListe();
    }

    /* ⚠️ KVITTERINGEN ER HUSETS FÆLLES NU  (4/9). Kundens ord:
       *"få den slags animation og kvittering alle steder man
       bestiller."* Formen bor i js/skal/kvittering.js. */
    var K = window.MosedeKvittering;
    var hvad = k
      ? 'I står på listen til ' + k.titel + ' ' + pænDag(k.dato)
        + (klokken(k) ? ' kl. ' + klokken(k) : '') + '.'
      : 'I står på listen.';
    /* ⚠️ DEN LOVER IKKE ET OPKALD. Personalet ringer kun, hvis
       noget ændrer sig — og en kvittering, der siger "vi ringer",
       får gæsten til at vente på et opkald, der aldrig kommer.
       Samme lære som bordbookingen: bestilt er bestilt. */
    var besked = hvad + ' Vi siger til, hvis noget ændrer sig. '
      + 'Bliver I forhindret, så ring, så kan pladsen gå videre til en anden.';
    /* ⚠️ VENTELISTE ER IKKE EN PLADS (12/10). Svaret kommer fra
       databasen (mosede_paa_venteliste) — kvitteringen må aldrig love en
       plads, der blev til en venteliste i samme sekund. Her ER der et
       opkald: Mikkel 12/10, "venteliste ja", og ventelisten er netop, at
       personalet ringer, når en plads bliver ledig. */
    if (svar.venteliste) {
      besked = (k ? 'Der er udsolgt til ' + k.titel + ' ' + pænDag(k.dato) + '. ' : '')
        + 'I står på ventelisten — bliver der en plads, ringer vi til jer. '
        + 'Kan I alligevel ikke, så ring, så vi kan give pladsen videre.';
    }
    var fornavn = String(svar.navn || '').trim().split(/\s+/)[0] || '';
    /* ⚠️ MED STORT FORBOGSTAV — se noten i js/bord.js. */
    fornavn = fornavn
      ? fornavn.charAt(0).toUpperCase() + fornavn.slice(1) : 'alle sammen';

    if (!K) {
      tøm(panel);
      panel.appendChild(lav('h3', null, 'Vi ses, ' + fornavn + '!'));
      panel.appendChild(lav('p', 'hint', besked));
      panel.appendChild(lav('div', 'note', 'Reference: ' + svar.reference));
      return;
    }

    /* ⚠️ EN RESERVATION HAR INTET NUMMER — der er ikke bestilt
       noget, der skal laves. Så er referencen dét, gæsten skal
       sige i døren, og kodeboksen viser den som det store af sig
       selv. Der er altid ÉN ting at sige. */
    K.byg(panel, {
      titel: svar.venteliste ? 'I står på ventelisten, ' + fornavn : 'Vi ses, ' + fornavn + '!',
      besked: besked,
      /* ⚠️ KUN HER, IKKE PÅ EN BESTILLING. En bestilling kan slås
         op igen på min-bestilling/ med referencen; den her sag
         kan ikke — den lever, til personalet ringer. Lukker
         gæsten fanen, har hun kun det, hun selv gemte. */
      skaermbillede: true,
      kode: {
        /* På ventelisten er nummeret ikke en plads — det er sagen. */
        navn: svar.venteliste ? 'Jeres nummer' : 'Pladsnummer',
        reference: svar.reference, refNavn: 'Jeres reference',
        /* ⚠️ NUMMERET ER DET STORE, NÅR DET FINDES  (10/9).
           Kundens ord: referencen er rigtig, men nummeret skal
           være "ordentligt og huskbart". Kvitteringsbyggeren
           viser nummeret som det store og referencen under —
           svarer opslaget ingenting (filen ikke kørt, nettet
           væk), står referencen alene som hidtil. */
        nummer: function () {
          if (!Butik.sagsnummer || !Butik.pæntNummer) return null;
          return Butik.sagsnummer(svar.reference).then(function (n) {
            return n ? Butik.pæntNummer(n, 'tilmelding') : null;
          });
        },
      },
      linjer: [
        { navn: 'Antal', vaerdi: (svar.antal_personer || 1) + (svar.venteliste ? ' personer' : ' pladser') },
      ],
      fine: svar.venteliste ? 'Sig referencen, når vi ringer.' : 'Sig referencen i døren, hvis vi spørger.',
    });
    /* "Gem i min kalender" — kun med en plads. En venteliste i kalenderen
       ville ligne en aftale, der ikke er der. */
    if (k && !svar.venteliste) {
      var gem = kalenderLink(k, 'g');
      gem.classList.add('kv-kalender');
      panel.appendChild(gem);
    }
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
    if (vælger) vælger.addEventListener('change', function () { valgt = vælger.value || null; markerValg(); });
    ['knavn', 'ktlf'].forEach(function (n) {
      var el = id(n);
      if (el) el.addEventListener('input', rydFejl);
    });

    /* ⚠️ FLUEBENET FINDES KUN, NÅR DER ER SKREVET NOGET (21/9).
       Linjen ligger med klassen `skjult` i opmærkningen, og INTET
       fjernede den før nu — så gæsten kunne skrive en allergi og
       aldrig få mulighed for at sige ja til, at vi gemmer den.
       Samme mønster som js/bestilling.js, js/skal/bestil.js og
       js/skal/forespoergsel.js; se den lange note i send().

       ⚠️ OG DET NULSTILLES, NÅR TEKSTEN RYDDES. Ellers stod et
       gammelt ja og gjaldt en allergi, gæsten havde slettet. */
    var aFelt = id('kallergi');
    var aLinje = id('kallergi-samtykke-linje');
    if (aFelt && aLinje) {
      aFelt.addEventListener('input', function () {
        var harTekst = !!aFelt.value.trim();
        aLinje.classList.toggle('skjult', !harTekst);
        if (!harTekst) {
          var boks = id('kallergi-samtykke');
          if (boks) boks.checked = false;
        }
      });
    }
  }

  /* ⚠️ "HVAD SKER DER" OG "HVAD HAR DER VÆRET" ER ÉT STED  (13/9).
     Kundens ord: "den der med tidligere ting skal hænge sammen med
     hvad sker der." Arkivet stod kun under forsidens nyheder; her,
     hvor gæsten leder efter arrangementerne, fandtes det ikke.
     Folden er den SAMME som forsidens (js/skal/tidligere.js), og den
     står lige under listen over det, der kommer. Egen fangst:
     fejler arkivet, skal arrangementerne stadig stå. */
  function visTidligere(d) {
    try {
      var T = window.MosedeTidligere;
      var liste = document.getElementById('evliste');
      if (!T || !liste) return;
      T.tegn(liste.parentNode, liste, Butik.tidligereNyheder(d),
        Butik.tidligereArrangementer ? Butik.tidligereArrangementer(d) : []);
    } catch (e) {
      if (window.console) console.warn('arkivet på kalendersiden:', e);
    }
  }

  /* ============================================================
     GEM I MIN KALENDER  (12/10)
     ------------------------------------------------------------
     En .ics-fil, telefonen selv lægger i kalenderen — og så minder den
     gæsten om det. Ingen sms, ingen udgift (15/9). Tidspunktet er
     regnet om til UTC (Butik.dkTilMs), så en telefon i en anden
     tidszone viser det rigtige klokkeslæt. Uden et klokkeslæt er det
     en heldagsbegivenhed — vi opfinder ikke en sluttid.
     ============================================================ */
  function adresse() {
    var l = (dataNu.lokationer || [])[0] || {};
    return [l.adresse, [l.postnr, l.by].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  }
  function utc(ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function icsTekst(t) {
    return String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }
  function kalenderfil(k) {
    var linjer = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mosede Havnecafe//Arrangementer//DA',
      'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', 'UID:arr-' + k.id + '@mosedehavnecafe.dk',
      'DTSTAMP:' + utc(Date.now())];
    if (k.start_kl) {
      linjer.push('DTSTART:' + utc(Butik.dkTilMs(k.dato + 'T' + String(k.start_kl).slice(0, 5))));
      if (k.slut_kl) {
        linjer.push('DTEND:' + utc(Butik.dkTilMs((k.slut_dato || k.dato) + 'T' + String(k.slut_kl).slice(0, 5))));
      }
    } else {
      var naeste = new Date(Date.UTC(+k.dato.slice(0, 4), +k.dato.slice(5, 7) - 1, +k.dato.slice(8, 10) + 1));
      linjer.push('DTSTART;VALUE=DATE:' + k.dato.replace(/-/g, ''));
      linjer.push('DTEND;VALUE=DATE:' + naeste.toISOString().slice(0, 10).replace(/-/g, ''));
    }
    linjer.push('SUMMARY:' + icsTekst(k.titel));
    linjer.push('LOCATION:' + icsTekst(['Mosede Havnecafe', stedFor(k), adresse()].filter(Boolean).join(', ')));
    if (k.beskrivelse) linjer.push('DESCRIPTION:' + icsTekst(k.beskrivelse));
    linjer.push('URL:https://mosedehavnecafe.dk/h-kalender.html#arr-' + k.id);
    linjer.push('END:VEVENT', 'END:VCALENDAR');
    return linjer.join('\r\n');
  }
  function kalenderLink(k, klasse) {
    var a = lav('a', klasse || 'evkal', 'Gem i kalender');
    a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(kalenderfil(k));
    a.setAttribute('download', (String(k.titel || 'arrangement').replace(/[^\wæøåÆØÅ -]+/g, '').trim()
      || 'arrangement') + '.ics');
    a.setAttribute('data-pick', '');
    return a;
  }

  /* ============================================================
     GOOGLE SKAL KUNNE SE ARRANGEMENTERNE  (12/10)
     ------------------------------------------------------------
     schema.org Event for hvert offentligt, kommende arrangement — så
     kan de stå i Googles søgning. Kun det, der står på siden: ingen
     opfundne priser (prisen er fritekst og står ikke her), og et
     aflyst arrangement siger EventCancelled i stedet for at forsvinde.
     ============================================================ */
  function dkIso(iso, kl) {
    var ms = Butik.dkTilMs(iso + 'T' + kl);
    var forskel = Math.round((Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10),
      +kl.slice(0, 2), +kl.slice(3, 5)) - ms) / 60000);
    var t = Math.abs(forskel);
    return iso + 'T' + kl + (forskel >= 0 ? '+' : '-') + String(Math.floor(t / 60)).padStart(2, '0')
      + ':' + String(t % 60).padStart(2, '0');
  }
  function skrivGoogle() {
    var gammel = document.getElementById('arrangementer-ld');
    if (gammel) gammel.parentNode.removeChild(gammel);
    if (!arrangementer.length) return;
    var l = (dataNu.lokationer || [])[0] || {};
    var data = arrangementer.map(function (k) {
      var e = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: k.titel,
        startDate: k.start_kl ? dkIso(k.dato, String(k.start_kl).slice(0, 5)) : k.dato,
        eventStatus: 'https://schema.org/' + (k.aflyst ? 'EventCancelled' : 'EventScheduled'),
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: ['Mosede Havnecafe', stedFor(k)].filter(Boolean).join(' — '),
          address: { '@type': 'PostalAddress', streetAddress: l.adresse || '', postalCode: l.postnr || '',
            addressLocality: l.by || '', addressCountry: 'DK' },
        },
        organizer: { '@type': 'Organization', name: 'Mosede Havnecafe', url: 'https://mosedehavnecafe.dk/' },
        url: 'https://mosedehavnecafe.dk/h-kalender.html#arr-' + k.id,
      };
      if (k.start_kl && k.slut_kl) e.endDate = dkIso(k.slut_dato || k.dato, String(k.slut_kl).slice(0, 5));
      else if (k.slut_dato && k.slut_dato !== k.dato) e.endDate = k.slut_dato;
      if (k.beskrivelse) e.description = String(k.beskrivelse).slice(0, 500);
      if (k.billede) e.image = [k.billede];
      return e;
    });
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'arrangementer-ld';
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  /* ⚠️ HVER DEL HAR SIN EGEN FANGST. Fejler pladstællingen, skal
     arrangementerne stadig stå på siden — se noten ved
     hentPladser i js/store.js. Én fejlende del må ikke vælte
     resten; det er husets dyreste lære (26/8, nødmenuen med to
     varer). */
  Butik.hent().then(function (d) {
    dataNu = d || {};
    arrangementer = Butik.arrangementer(d);
    visTidligere(d);
    return Butik.hentPladser().catch(function () { return {}; });
  }).then(function (p) {
    pladser = p || {};
    tegnListe();
    tegnVælger();
    /* Egen fangst: Googles data må ikke vælte listen. */
    try { skrivGoogle(); } catch (e) { if (window.console) console.warn('arrangementsdata:', e); }
  }).catch(function (e) {
    if (window.console) console.warn('kalendersiden:', e);
    arrangementer = [];
    tegnListe();
  });
}());
