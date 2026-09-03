/* Fanen Tilmeldinger. Se js/admin/kerne.js for de to principper,
   der gælder i alle admin-filerne.

   ============================================================
   HVOR KOMMER RESERVATIONERNE HEN?  (30/8)
   ============================================================
   Kundens spørgsmål, og svaret var indtil i dag: ingen steder.
   Knappen "Reservér plads" har stået på h-kalender.html siden
   designet kom 23/8 uden en tabel bag sig.

   ARBEJDSDELINGEN MELLEM DE TO FANER:

     Kalender      → HVAD sker der, hvor mange pladser, hvad koster
                     det. Dér oprettes arrangementet.
     Tilmeldinger  → HVEM kommer. Listen, man krydser af i døren.

   ⚠️ ÉN LISTE PR. ARRANGEMENT, IKKE ÉN LANG. Personalet står i
   døren til ÉT arrangement, ikke til efterårets fem. Skærmen
   filtrerer; dataene deler sig ikke — samme beslutning som
   Køkken-kø, hvor bordnummeret er adskillelsen.

   ⚠️ OG DEN VÆLTER IKKE, FØR SQL'EN ER KØRT. Er
   supabase/arrangementer.sql ikke kørt i Supabase, findes
   tabellen ikke; Butik.hentReservationer svarer med en tom liste
   i stedet for en fejl, og fanen siger, hvad der mangler. En fane,
   der tager resten af admin med sig ned, fordi en fil ikke er
   kørt, er præcis den fejl, der kostede en runde 29/8. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  var STATUS_NAVNE = {
    ny: 'Tilmeldt', bekraeftet: 'Kommet',
    afvist: 'Afvist', udeblevet: 'Udeblev',
  };

  var reservationer = [];
  var valgt = null;

  /* De arrangementer, der KAN have tilmeldinger. Kalenderen ligger
     i Admin.data (hentes af genindlæs), reservationerne i fanens
     egen liste — de to kommer ikke nødvendigvis samtidig, og
     ⚠️ Admin.data kan være null, når efterHent kører. */
  function arrangementer() {
    return ((Admin.data && Admin.data.kalender) || []).filter(function (k) {
      return k.type === 'arrangement' && k.tilmelding;
    }).sort(function (a, b) { return a.dato < b.dato ? -1 : 1; });
  }

  function forArrangement(id) {
    return reservationer.filter(function (r) {
      return String(r.kalender_id) === String(id);
    });
  }

  /* ⚠️ AFVISTE TÆLLER IKKE MED. Det er den samme regel som
     databasens: et afslag frigiver pladsen igen. Talte skærmen
     dem med, ville personalet tro, der var fuldt, mens
     hjemmesiden stadig tog imod — og de to ville sige hver sit
     om det samme arrangement. */
  function optaget(id) {
    return forArrangement(id).reduce(function (sum, r) {
      if (r.status === 'afvist') return sum;
      return sum + (Number(r.antal_personer) || 0);
    }, 0);
  }

  /* ⚠️ MÅNEDSNETTET SPØRGER DEN SAMME. Kalenderen viser
     "🎟️ 12/40" på dagen, og tallet SKAL være det, der står på
     Tilmeldinger-fanen — ellers kunne personalet se fuldt det ene
     sted og ledigt det andet, om det SAMME arrangement.

     ⚠️ kalender.js indlæses FØR denne fil, så funktionen findes
     ikke, når den læses — kun når nettet TEGNES. Samme
     rækkefølgeaftale som Admin.bordLoftFor og Admin.statusNavn. */
  Admin.pladserTaget = optaget;

  function pladsTekst(k) {
    var n = optaget(k.id);
    if (!k.pladser) return n + (n === 1 ? ' tilmeldt' : ' tilmeldte');
    return n + ' af ' + k.pladser + ' pladser';
  }

  function tegnArrangementer() {
    var boks = $('tilmeld-arrangementer');
    if (!boks) return;
    var liste = arrangementer();

    if (!liste.length) {
      Admin.tegnRaekker(boks, [{
        noegle: 'tom', aftryk: 'tom',
        byg: function () {
          var p = lav('p', 'vare-tekst');
          p.textContent = 'Ingen arrangementer tager imod tilmeldinger endnu. '
            + 'Opret et på fanen Kalender, sæt hak i "Vis det for gæsterne" '
            + 'og i "Gæsterne skal kunne reservere plads".';
          return p;
        },
      }]);
      return;
    }

    /* Er der kun ét, er det valgt af sig selv — ellers skal
       personalet trykke på en knap for at se den ene liste, der
       findes. */
    if (!valgt || !liste.some(function (k) { return String(k.id) === String(valgt); })) {
      valgt = String(liste[0].id);
    }

    Admin.tegnRaekker(boks, liste.map(function (k) {
      return {
        noegle: 'arr-' + k.id,
        aftryk: JSON.stringify([k.titel, k.dato, k.pladser,
          optaget(k.id), String(k.id) === String(valgt)]),
        byg: function () {
          var knap = lav('button', 'arr-chip' + (String(k.id) === String(valgt) ? ' valgt' : ''));
          knap.type = 'button';
          knap.setAttribute('data-arr', String(k.id));
          knap.appendChild(lav('b', null, k.titel));
          knap.appendChild(lav('span', null,
            Admin.pænDato(k.dato) + ' · ' + pladsTekst(k)));
          knap.addEventListener('click', function () {
            valgt = String(k.id);
            tegnAlt();
          });
          return knap;
        },
      };
    }));
  }

  function tegnListe() {
    var boks = $('tilmeld-liste');
    var titel = $('tilmeld-titel');
    var tael = $('tilmeld-tael');
    if (!boks) return;

    var k = arrangementer().filter(function (x) {
      return String(x.id) === String(valgt);
    })[0];

    if (!k) {
      if (titel) titel.textContent = 'Vælg et arrangement';
      /* ⚠️ NOTEN MÅ IKKE VÆRE TOM. Hvert korthoved i admin siger til
         højre, hvad kortet styrer ude på siden — og prøven i
         admin-design.spec.js tæller tegnene. Er der ikke valgt et
         arrangement endnu, er der ingen dato og ingen pladser at
         skrive, og så skal der stå det, kortet ER. */
      if (tael) tael.textContent = 'Listen, I krydser af i døren';
      Admin.tegnRaekker(boks, []);
      return;
    }

    if (titel) titel.textContent = k.titel;
    if (tael) tael.textContent = Admin.pænDato(k.dato) + ' · ' + pladsTekst(k);

    var mine = forArrangement(k.id).slice().sort(function (a, b) {
      /* Det, der ikke er afgjort, øverst — det er dét, der er
         arbejde. Derefter i den rækkefølge, de meldte sig. */
      var aa = a.status === 'ny' ? 0 : 1;
      var bb = b.status === 'ny' ? 0 : 1;
      if (aa !== bb) return aa - bb;
      return (a.oprettet || '') < (b.oprettet || '') ? -1 : 1;
    });

    if (!mine.length) {
      Admin.tegnRaekker(boks, [{
        noegle: 'tom-' + k.id, aftryk: 'tom',
        byg: function () {
          return lav('p', 'vare-tekst', 'Ingen har meldt sig til endnu.');
        },
      }]);
      return;
    }

    Admin.tegnRaekker(boks, mine.map(function (r) {
      return {
        noegle: 'res-' + r.id,
        aftryk: JSON.stringify(r),
        byg: function () { return kort(r); },
      };
    }));
  }

  function kort(r) {
    var k = lav('div', 'bestil-kort b-' + r.status);

    var top = lav('div', 'bestil-top');
    top.appendChild(lav('span', 'maerke m-' + r.status,
      STATUS_NAVNE[r.status] || r.status));
    top.appendChild(lav('span', 'bestil-ref', r.reference));
    k.appendChild(top);

    var hvem = lav('div', 'foresp-linje');
    hvem.appendChild(lav('span', 'vare-navn', r.navn));
    hvem.appendChild(lav('span', null, '👥 ' + r.antal_personer
      + (r.antal_personer === 1 ? ' person' : ' personer')));
    var tlf = lav('a', 'foresp-link', '📞 ' + r.telefon);
    tlf.href = 'tel:' + String(r.telefon).replace(/[^0-9+]/g, '');
    hvem.appendChild(tlf);
    if (r.email) {
      var mail = lav('a', 'foresp-link', '✉ ' + r.email);
      mail.href = 'mailto:' + r.email;
      hvem.appendChild(mail);
    }
    k.appendChild(hvem);

    if (r.besked) {
      var m = lav('p', 'bestil-gaestebesked');
      m.appendChild(lav('strong', null, 'Gæsten skriver: '));
      m.appendChild(document.createTextNode(r.besked));
      k.appendChild(m);
    }

    var raekke = lav('div', 'knap-raekke');

    /* ⚠️ ÉT TRYK PR. TING, OG DE ER IKKE ET FORLØB. En tilmelding
       går ikke fra ny til bekræftet til udeblevet — den ER
       kommet, eller den udeblev, og det afgøres i døren. Derfor
       tre knapper og ikke en "næste"-knap. */
    if (r.status !== 'bekraeftet') {
      var kom = lav('button', 'knap', '✓ Kommet');
      kom.type = 'button';
      kom.addEventListener('click', function () { saet(r, 'bekraeftet'); });
      raekke.appendChild(kom);
    }
    if (r.status !== 'udeblevet') {
      var ude = lav('button', 'knap sekundaer', 'Udeblev');
      ude.type = 'button';
      ude.addEventListener('click', function () { saet(r, 'udeblevet'); });
      raekke.appendChild(ude);
    }
    if (r.status !== 'afvist') {
      /* ⚠️ AFVIS ER IKKE SLET. Et afslag frigiver pladsen igen —
         det gør databasens tælling — og rækken bliver stående, så
         nogen kan fortryde og se, hvem der fik nej. */
      var af = lav('button', 'knap fare', 'Afvis');
      af.type = 'button';
      af.addEventListener('click', function () {
        if (!confirm('Afvis ' + r.navn + '?\n\n'
          + 'Pladsen bliver fri igen. Husk at ringe til ' + r.telefon
          + ' — de regner med at komme.')) return;
        saet(r, 'afvist');
      });
      raekke.appendChild(af);
    }
    k.appendChild(raekke);
    return k;
  }

  function saet(r, status) {
    Butik.skrive.reservationStatus(r.id, status, r.intern_note)
      .then(hent)
      .then(function () {
        Admin.kvitter(r.navn + ': ' + (STATUS_NAVNE[status] || status) + '.');
      })
      .catch(function (e) { Admin.brøl(Admin.forklarFejl(e)); });
  }

  function tegnAlt() {
    tegnArrangementer();
    tegnListe();

    /* Mærket i søjlen tæller det, INGEN har set på endnu, og på
       tværs af alle arrangementer: et tal, der kun gjaldt det
       valgte, ville skjule, at der er tre nye til fredagens
       koncert, mens man kigger på torsdagens. */
    var nye = reservationer.filter(function (r) { return r.status === 'ny'; }).length;
    var maerke = $('tilmeld-antal');
    if (maerke) {
      if (nye) { maerke.textContent = nye; maerke.classList.remove('skjult'); }
      else maerke.classList.add('skjult');
    }
  }

  function hent() {
    return Butik.hentReservationer().then(function (liste) {
      reservationer = liste || [];
      Admin.meld('reservationer', reservationer);
      tegnAlt();
    }).catch(function (e) {
      if (window.console) console.warn('reservationer:', e);
      reservationer = [];
      tegnAlt();
    });
  }

  Admin.efterHent.push(tegnAlt);
  Admin.tegnere.push(tegnAlt);
  Admin.vedLogin.push(hent);
  Admin.friske.push(hent);
}());
