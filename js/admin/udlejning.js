/* Fanen Baglokalet. Se js/admin/kerne.js for de to principper,
   der gælder i alle admin-filerne.

   ============================================================
   ⚠️ ÉN FANE TIL LOKALET, IKKE TO  (27/8)
   ============================================================
   Kundens ord: "baglokale skal ikke [i forespørgsler], da det har
   sin egen fane."

   Han har ret, og skellet var formularens og ikke personalets:

     baglokale/     →  en UDLEJNING    (tabellen udlejninger)
     h-baglokale    →  en FORESPØRGSEL (tabellen forespoergsler)

   To veje ind, ét lokale, den samme lørdag. Stod de to slags på
   hver sin fane, skulle nogen huske at kigge begge steder, før de
   sagde ja — og det er præcis sådan, en dag bliver lovet væk to
   gange. Begge står her nu, i den samme kø.

   ------------------------------------------------------------
   HER GIVES JA'ET, OG LOKALET ER ET LOKALE
   ------------------------------------------------------------
   Der kan kun være ét ja pr. dag. Det er ikke en regel i den her
   fil: databasen selv afviser ja nummer to (indekset
   udlejning_dagen_er_taget i supabase/udlejning.sql), så to
   medarbejdere på hver sin iPad ikke kan sige ja samtidig.

   Fanen viser sandheden FØR man trykker — det er hele grunden
   til månedsnettet øverst. En advarsel efter et opkald til gæsten
   er en pinlig samtale for sent.

   ------------------------------------------------------------
   FANEN ER TRE SPØRGSMÅL, ÉT PR. KORT
   ------------------------------------------------------------
     1. Hvilke dage er væk?        månedsnettet
     2. Hvem venter på et svar?    køen, ældste først
     3. Hvad er der sagt ja til?   "I hus"

   Det færdige (afvist, overstået) er ikke arbejde og står foldet
   sammen nederst. Det forsvinder ikke: trykker nogen forkert,
   skal rækken kunne findes igen. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  var STATUS_NAVNE = { ny: 'Ny', bekraeftet: 'Lejet ud', afvist: 'Afvist' };

  var MDR = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli',
    'august', 'september', 'oktober', 'november', 'december'];
  var UGEDAGE = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];

  var udlejninger = [];
  var visAar = null;
  var visMdr = null;
  var valgtDag = null;

  // ----------------------------------------------------------
  //  DE TO SLAGS, SET SOM ÉN
  // ----------------------------------------------------------
  /* ⚠️ ÉT SKELET, TO KILDER. Resten af filen spørger aldrig
     "hvilken tabel kom den fra" — den spørger sag.slags. Uden det
     ville hver eneste optælling, sortering og advarsel skulle
     skrives to gange, og den dag de to kom til at sige noget
     forskelligt, ville ingen opdage det.

     Statusordene er de to tabellers egne og skal IKKE laves om:
     udlejninger har ny/bekraeftet/afvist, forespørgsler har
     ny/kontaktet/aftalt/afvist. Begge har værn i databasen, og et
     nyt ord ville være en SQL-fil, ejeren skal køre, for noget
     ingen ser. Derfor oversættes de kun HER. */
  function alleSager() {
    var ud = udlejninger.map(function (u) {
      return {
        slags: 'udlejning',
        id: u.id,
        raa: u,
        dato: u.dato,
        navn: u.navn,
        oprettet: u.oprettet,
        // Tre tilstande, som fanen tænker i.
        stand: u.status === 'bekraeftet' ? 'i-hus'
          : (u.status === 'afvist' ? 'faerdig' : 'venter'),
        // Lukker den dagen for alle andre?
        lukker: u.status === 'bekraeftet',
      };
    });

    /* ⚠️ EN FORESPØRGSEL, DER ER BLEVET TIL EN BOOKING, ER ÉN
       SAG — IKKE TO.

       "Book lokalet til dem" opretter en udlejning ud fra
       forespørgslen og sætter forespørgslen til aftalt. Uden det
       her filter stod BEGGE på skærmen bagefter: "Mette Lund" som
       udlejning og "Mette Lund" som forespørgsel, side om side i
       I hus. To kort, ét selskab — og den, der så dem, ville tro,
       der var booket to gange.

       Kendingen er dato + telefon, de samme to felter som
       udlejningernes egen dubletnøgle. */
    var lukkede = udlejninger.filter(function (u) { return u.status !== 'afvist'; });

    (Admin.lister.forespoergsler || []).forEach(function (f) {
      if (f.type !== 'baglokale') return;
      var blevBooket = f.dato && lukkede.some(function (u) {
        return u.dato === f.dato && String(u.telefon) === String(f.telefon);
      });
      if (blevBooket) return;
      ud.push({
        slags: 'forespoergsel',
        id: f.id,
        raa: f,
        dato: f.dato || null,
        navn: f.navn,
        oprettet: f.oprettet,
        stand: f.status === 'aftalt' ? 'i-hus'
          : (f.status === 'afvist' ? 'faerdig' : 'venter'),
        lukker: f.status === 'aftalt',
      });
    });

    return ud;
  }

  /* Det, der er overstået, er heller ikke arbejde — uanset hvad
     der står i status. En lørdag i marts kan ingen nå at svare
     på i august. */
  function faerdig(s) {
    if (s.stand === 'faerdig') return true;
    return !!(s.dato && s.dato < Butik.nu().dato);
  }

  // ----------------------------------------------------------
  //  TALLENE
  // ----------------------------------------------------------
  /* Tre tal, og de svarer på tre spørgsmål, man ellers skal
     tælle sig frem til ved at rulle. "Næste udlejning" er den
     eneste, der ikke er et antal: den er svaret på "hvornår skal
     vi huske noget?" */
  var MDR_KORT = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun',
    'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

  function kortDato(iso) {
    var d = String(iso).split('-');
    if (d.length !== 3) return String(iso);
    return Number(d[2]) + '. ' + MDR_KORT[Number(d[1]) - 1];
  }

  function tegnTal() {
    var boks = $('lokale-tal');
    if (!boks) return;
    Admin.tøm(boks);

    var sager = alleSager();
    var venter = sager.filter(function (s) {
      return s.stand === 'venter' && !faerdig(s);
    });
    var iHus = sager.filter(function (s) {
      return s.stand === 'i-hus' && !faerdig(s);
    }).sort(function (a, b) { return (a.dato || '') < (b.dato || '') ? -1 : 1; });

    var naeste = iHus[0];

    [
      ['Venter på svar', venter.length,
        venter.length ? 'nogen sidder og venter' : 'ingenting i kø'],
      ['Lejet ud fremover', iHus.length, 'dage der er væk'],
      /* ⚠️ KORT DATO I FELTET, HELE DATOEN UNDER.
         Admin.pænDato giver "Lørdag 5. september" — 22 tegn i den
         store serif, som brækker over to linjer og skubber de to
         nabofelter skævt. Tallet er "hvornår", navnet er "hvem",
         og ugedagen hører til på kortet længere nede. */
      ['Næste udlejning', naeste ? kortDato(naeste.dato) : '—',
        naeste ? naeste.navn : 'ingen aftaler'],
    ].forEach(function (t) {
      var f = lav('div', 'tal-felt');
      f.appendChild(lav('div', 'tal-navn', t[0]));
      f.appendChild(lav('div', 'tal-tal', String(t[1])));
      f.appendChild(lav('div', 'tal-note', t[2]));
      boks.appendChild(f);
    });
  }

  // ----------------------------------------------------------
  //  MÅNEDSNETTET
  // ----------------------------------------------------------
  /* ⚠️ EN LISTE OVER DATOER ER IKKE EN KALENDER.

     Fanen havde tre løse linjer — "Lørdag 22. august · 2 ønsker
     venter" — og de kunne kun svare på de dage, nogen HAVDE
     spurgt om. Spørgsmålet ved telefonen er det modsatte: "har I
     lokalet den 12.?" Det svar krævede, at man læste tre linjer
     og selv regnede ud, at den 12. ikke stod der.

     Nettet svarer på et blik, og de tomme felter er halvdelen af
     svaret. */
  function iso(aar, mdr, dag) {
    return aar + '-' + String(mdr + 1).padStart(2, '0')
      + '-' + String(dag).padStart(2, '0');
  }

  function saetMaaned() {
    if (visAar !== null) return;
    var nu = Butik.nu().dato.split('-');
    visAar = Number(nu[0]);
    visMdr = Number(nu[1]) - 1;
  }

  function tegnNet() {
    var net = $('lokale-net');
    if (!net) return;
    saetMaaned();
    Admin.tøm(net);

    var navn = $('lokale-maaned');
    if (navn) {
      navn.textContent = MDR[visMdr].charAt(0).toUpperCase()
        + MDR[visMdr].slice(1) + ' ' + visAar;
    }

    UGEDAGE.forEach(function (d) {
      net.appendChild(lav('div', 'maaned-ugedag', d));
    });

    var foerste = new Date(Date.UTC(visAar, visMdr, 1));
    /* Mandag først. getUTCDay() giver 0 for søndag, og en uge,
       der begynder om søndagen, er ikke den, personalet kigger
       på i en dansk kalender. */
    var spring = (foerste.getUTCDay() + 6) % 7;
    for (var t = 0; t < spring; t++) net.appendChild(lav('div', 'maaned-tom'));

    var dage = new Date(Date.UTC(visAar, visMdr + 1, 0)).getUTCDate();
    var iDag = Butik.nu().dato;
    var sager = alleSager();

    for (var n = 1; n <= dage; n++) {
      var dato = iso(visAar, visMdr, n);
      var paaDagen = sager.filter(function (s) { return s.dato === dato; });
      var lejet = paaDagen.filter(function (s) { return s.lukker; })[0];
      var venter = paaDagen.filter(function (s) {
        return s.stand === 'venter' && !faerdig(s);
      }).length;

      var felt = lav('button', 'maaned-dag');
      felt.type = 'button';
      /* ⚠️ IKKE data-dag. Kalenderfanen har sit eget månedsnet med
         den samme klasse OG det navn, og js/admin/kalender.js slår
         op i HELE dokumentet:
           querySelector('.maaned-dag[data-dag="…"]')
         Med to net matcher den, hvad der nu kommer først i siden —
         og den dag panelernes rækkefølge blev lavet om, ville
         "tryk på en note for at åbne dagen" rulle ned til
         baglokalet i stedet. Ingen fejl, bare en forkert dag.

         Målt: 31 prøver på kalenderfanen faldt på "strict mode
         violation", da nettet her fik data-dag. Fejlen var
         prøvernes at fange, men den var kodens. */
      felt.setAttribute('data-lokale-dag', dato);
      if (dato === iDag) felt.className += ' er-idag';
      if (dato === valgtDag) felt.className += ' valgt';
      if (lejet) felt.className += ' er-lukket';

      felt.appendChild(lav('span', 'maaned-nr', String(n)));

      if (lejet) {
        felt.appendChild(lav('span', 'maaned-stand lukket',
          '🔑 ' + lejet.navn));
      } else if (venter) {
        felt.appendChild(lav('span', 'maaned-stand halv',
          '⏳ ' + venter + (venter === 1 ? ' venter' : ' venter')));
      }

      /* Skærmlæseren får hele sætningen. Et tal og et nøgletegn
         er et billede, ikke en oplysning. */
      felt.setAttribute('aria-label', Admin.pænDato(dato) + ': '
        + (lejet ? 'lejet ud til ' + lejet.navn
          : (venter ? venter + ' venter på svar' : 'ledigt')));

      felt.addEventListener('click', (function (d) {
        return function () {
          valgtDag = (valgtDag === d) ? null : d;
          tegnAlt();
        };
      })(dato));

      net.appendChild(felt);
    }
  }

  function skift(n) {
    saetMaaned();
    visMdr += n;
    while (visMdr < 0) { visMdr += 12; visAar -= 1; }
    while (visMdr > 11) { visMdr -= 12; visAar += 1; }
    tegnNet();
  }

  // ----------------------------------------------------------
  //  LISTERNE
  // ----------------------------------------------------------
  /* Ældste først i køen: den, der skrev i mandags, har ventet
     længst, og et ønske, der ligger urørt i tre dage, er et
     selskab, der bliver holdt et andet sted.

     ⚠️ MEN DEM UDEN DATO SIDST. En forespørgsel uden dato kan
     ingen sige ja til endnu — den skal besvares, ikke bookes. */
  function iKoe(sager) {
    return sager.filter(function (s) {
      return s.stand === 'venter' && !faerdig(s);
    }).sort(function (a, b) {
      if (!a.dato !== !b.dato) return a.dato ? -1 : 1;
      return a.oprettet < b.oprettet ? -1 : 1;
    });
  }

  function iHus(sager) {
    return sager.filter(function (s) {
      return s.stand === 'i-hus' && !faerdig(s);
    }).sort(function (a, b) { return (a.dato || '') < (b.dato || '') ? -1 : 1; });
  }

  function faerdige(sager) {
    return sager.filter(faerdig)
      .sort(function (a, b) { return (a.dato || '') > (b.dato || '') ? -1 : 1; });
  }

  /* ⚠️ HVEM ELLERS VIL HAVE DEN DAG?

     Advarslen fandtes før, men kun når dagen ALLEREDE var lejet
     ud. To ønsker om den samme lørdag, begge nye, stod som to
     kort uden et ord om hinanden — og den, der svarede på det
     øverste, anede ikke, at det andet fandtes.

     Det er den dyre af de to: et ja til den ene er et nej til den
     anden, og det nej skal gives af et menneske, ikke opdages af
     en fejl fra databasen bagefter. */
  function ogsaaPaaDagen(s, sager) {
    if (!s.dato) return [];
    return sager.filter(function (x) {
      return (x.slags !== s.slags || String(x.id) !== String(s.id))
        && x.dato === s.dato && !faerdig(x);
    });
  }

  function tegnListe(id, sager, tomTekst, alle) {
    var boks = $(id);
    if (!boks) return;

    var vist = valgtDag
      ? sager.filter(function (s) { return s.dato === valgtDag; })
      : sager;

    if (!vist.length) {
      Admin.tegnRaekker(boks, [{
        noegle: 'tom', aftryk: 'tom-' + (valgtDag || ''),
        byg: function () {
          return lav('p', 'vare-tekst', valgtDag
            ? 'Ingen ' + Admin.pænDato(valgtDag).toLowerCase() + '.'
            : tomTekst);
        },
      }]);
      return;
    }

    Admin.tegnRaekker(boks, vist.map(function (s) {
      var andre = ogsaaPaaDagen(s, alle);
      return {
        noegle: s.slags + '-' + s.id,
        /* Naboerne skal med i aftrykket: ændrer et NABOKORT sig,
           skal advarslen her følge med. Uden det blev "dagen er
           også ønsket af Mads" stående, efter Mads var afvist. */
        aftryk: JSON.stringify([s.raa, andre.map(function (x) {
          return [x.slags, x.id, x.stand, x.navn];
        })]),
        byg: function () { return sagKort(s, andre); },
      };
    }));
  }

  function tegnAlt() {
    var sager = alleSager();

    tegnTal();
    tegnNet();
    tegnListe('lokale-venter', iKoe(sager),
      'Ingen venter på svar.', sager);
    tegnListe('lokale-lejet', iHus(sager),
      'Lokalet er ikke lejet ud til nogen endnu.', sager);

    var slut = faerdige(sager);
    tegnListe('lokale-faerdige', slut, 'Ingenting endnu.', sager);
    var kort = $('lokale-faerdige-kort');
    var titel = $('lokale-faerdige-titel');
    if (titel) titel.textContent = '✓ Færdige (' + slut.length + ')';
    if (kort) kort.classList.toggle('skjult', !slut.length);

    var nye = iKoe(sager).length;
    var maerke = $('lokale-antal-maerke');
    if (maerke) {
      if (nye) { maerke.textContent = nye; maerke.classList.remove('skjult'); }
      else maerke.classList.add('skjult');
    }
  }

  // ----------------------------------------------------------
  //  KORTENE
  // ----------------------------------------------------------
  /* En forespørgsel tegnes af Forespørgsler-fanens egen
     kortbygger. To byggere for den samme række ville komme til at
     vise to forskellige ting — se noten ved Admin.forespoergselKort. */
  function sagKort(s, andre) {
    if (s.slags === 'forespoergsel') {
      var k = Admin.forespoergselKort
        ? Admin.forespoergselKort(s.raa, 'Forespørgsel')
        : lav('p', 'fejl', 'Forespørgslen kan ikke vises.');
      if (andre.length) k.insertBefore(nabovarsel(s, andre), k.firstChild.nextSibling);
      bookKnap(k, s);
      return k;
    }
    return udlejningKort(s.raa, andre);
  }

  /* ---- FRA SPØRGSMÅL TIL BOOKING ----

     Kundens ord (27/8): folk lægger forespørgsler på hjemmesiden,
     personalet ringer, og så skal de "acceptere datoen eller
     manuelt skrive den ind".

     Knappen her er det første. Uden den var vejen: læs
     forespørgslen, åbn telefonbooking-folden, tast navn, nummer,
     dato og antal af igen, og husk så at lukke forespørgslen
     bagefter. Fire felter tastet af fra en skærm, hvor de allerede
     står, er fire steder at ramme forkert — og den, der bliver
     glemt, er den sidste: forespørgslen bliver stående som "ny",
     og næste medarbejder ringer til den samme gæst.

     ⚠️ DEN OPRETTER EN RIGTIG UDLEJNING og lukker forespørgslen
     bagefter. Begge dele skal ske: udlejningen er den, databasens
     eget indeks tæller, når nummer to vil have dagen. En
     forespørgsel sat til "aftalt" spærrer dagen i visningen
     optagne_dage, men den giver ikke det hårde værn.

     ⚠️ OG DEN KRÆVER EN DATO. En forespørgsel må gerne være uden
     ("engang til foråret"), og der er ikke noget at booke endnu.
     Så står knappen der ikke — en knap, der siger nej, når man
     trykker, er værre end ingen knap. */
  function bookKnap(kort, s) {
    if (s.stand !== 'venter' || !s.dato) return;
    var raekke = kort.querySelector('.knap-raekke');
    if (!raekke) return;

    var f = s.raa;
    var knap = lav('button', 'knap', 'Book lokalet til dem');
    knap.type = 'button';
    knap.addEventListener('click', function () {
      if (!confirm('Book baglokalet til ' + f.navn + ' '
        + Admin.pænDato(f.dato) + '?\n\n'
        + 'Der oprettes en udlejning, dagen lukkes for alle andre, '
        + 'og forespørgslen sættes til aftalt.')) return;
      knap.disabled = true;
      Butik.lejLokale({
        navn: f.navn, telefon: f.telefon, email: f.email || null,
        dato: f.dato, antal_personer: f.antal_personer,
        besked: f.besked || null,
      }).then(function (svar) {
        return hentUdlejninger().then(function () {
          var ny = udlejninger.filter(function (u) {
            return u.reference === svar.reference;
          })[0];
          if (!ny) return null;
          /* Noten siger, hvor bookingen kom fra. Uden den ligner
             den en, gæsten selv har lavet — og så leder nogen
             efter en kvittering, der aldrig er sendt. */
          return Butik.skrive.udlejningStatus(ny.id, 'bekraeftet',
            'Aftalt i telefonen ud fra ' + f.reference + '.');
        });
      }).then(function () {
        /* Og forespørgslen lukkes. Rækkefølgen er med vilje:
           bliver udlejningen afvist af databasen (dagen er taget),
           står forespørgslen stadig åben, og personalet kan ringe
           tilbage. Lukkede vi den først, ville et nej efterlade en
           "aftalt" forespørgsel uden en booking bag sig. */
        return Butik.skrive.forespoergselStatus(f.id, 'aftalt', f.intern_note || null);
      }).then(function () {
        return Admin.friskOp ? Admin.friskOp() : null;
      }).then(function () {
        Admin.kvitter('Lokalet er lejet ud til ' + f.navn + ' '
          + Admin.pænDato(f.dato) + '.');
      }).catch(function (e) {
        Admin.brøl(e.message || String(e));
      }).then(function () {
        knap.disabled = false;
      });
    });
    raekke.insertBefore(knap, raekke.firstChild);
  }

  function nabovarsel(s, andre) {
    var lejet = andre.filter(function (x) { return x.lukker; })[0];
    var p = lav('p', lejet ? 'fejl' : 'hjaelp');
    if (lejet) {
      p.textContent = '⚠️ Dagen er allerede lejet ud til ' + lejet.navn
        + '. Der kan kun være ét ja pr. dag.';
    } else {
      p.textContent = '⚠️ ' + andre.map(function (x) { return x.navn; }).join(' og ')
        + (andre.length === 1 ? ' vil også have' : ' vil også have')
        + ' den dag. Et ja her er et nej til '
        + (andre.length === 1 ? 'dem' : 'de andre') + '.';
    }
    return p;
  }

  function udlejningKort(u, andre) {
    var k = lav('div', 'bestil-kort b-' + u.status);

    var top = lav('div', 'bestil-top');
    top.appendChild(lav('span', 'maerke favorit', 'Ønske'));
    top.appendChild(lav('span', 'maerke m-' + u.status,
      STATUS_NAVNE[u.status] || u.status));
    top.appendChild(lav('span', 'bestil-ref', u.reference));
    k.appendChild(top);

    if (andre && andre.length) k.appendChild(nabovarsel({ dato: u.dato }, andre));

    var hvem = lav('div', 'bestil-hvem');
    hvem.appendChild(lav('span', 'vare-navn', u.navn));
    var tlf = lav('a', 'bestil-tlf', u.telefon);
    tlf.href = 'tel:' + String(u.telefon).replace(/[^0-9+]/g, '');
    hvem.appendChild(tlf);
    if (u.email) {
      var mail = lav('a', 'bestil-tlf', u.email);
      mail.href = 'mailto:' + u.email;
      hvem.appendChild(mail);
    }
    k.appendChild(hvem);

    var detaljer = lav('div', 'bestil-linjer');
    var r1 = lav('div', 'bestil-linje');
    r1.appendChild(lav('span', 'bestil-vare', Admin.pænDato(u.dato)));
    r1.appendChild(lav('span', 'bestil-linjepris',
      u.antal_personer ? u.antal_personer + ' personer' : 'Antal ikke oplyst'));
    detaljer.appendChild(r1);
    k.appendChild(detaljer);

    if (u.besked) {
      var m = lav('p', 'bestil-gaestebesked');
      m.appendChild(lav('strong', null, 'Gæsten skriver: '));
      m.appendChild(document.createTextNode(u.besked));
      k.appendChild(m);
    }

    /* ⚠️ NOTEN FOLDES VÆK, NÅR DEN ER TOM.

       MÅLT på fanen som den var: fire kort på skærmen gav fire
       åbne notefelter, tre af dem tomme og med den samme grå
       pladsholdertekst. Feltet fyldte lige så meget som gæstens
       navn, dato og antal tilsammen — og det er ikke arbejde, det
       er et sted at skrive noget, hvis man vil.

       Har noten indhold, står den åben: så ER den en oplysning
       om sagen, og den skal kunne læses uden et tryk. */
    var felt = document.createElement('input');
    felt.type = 'text';
    felt.id = 'lokale-note-' + u.id;
    felt.maxLength = 1000;
    felt.value = u.intern_note || '';
    felt.placeholder = 'Fx: depositum aftalt, de kommer kl. 12';
    felt.addEventListener('change', function () {
      if (felt.value === (u.intern_note || '')) return;
      gemUdlejning(Butik.skrive.udlejningStatus(u.id, u.status, felt.value),
        'Noten er gemt.');
    });

    if (u.intern_note) {
      var note = lav('div', 'felt');
      var etiket = lav('label', null, 'Din note');
      etiket.setAttribute('for', felt.id);
      note.appendChild(etiket);
      note.appendChild(felt);
      k.appendChild(note);
    } else {
      var fold = lav('details', 'note-fold');
      fold.appendChild(lav('summary', null, '📝 Skriv en note'));
      var boks2 = lav('div', 'felt');
      boks2.appendChild(felt);
      fold.appendChild(boks2);
      /* Feltet skal have fokus, når folden åbnes — ellers er der
         to tryk til at skrive ét ord. */
      fold.addEventListener('toggle', function () {
        if (fold.open) felt.focus();
      });
      k.appendChild(fold);
    }

    var raekke = lav('div', 'knap-raekke');

    if (u.status === 'ny') {
      var frem = lav('button', 'knap', 'Lej lokalet ud');
      frem.addEventListener('click', function () {
        if (!confirm('Lej lokalet ud til ' + u.navn + ' '
          + Admin.pænDato(u.dato) + '?\n\n'
          + 'Der kan kun være ét ja pr. dag. Husk at ringe til '
          + u.telefon + ' — gæsten venter på opkaldet.')) return;
        gemUdlejning(Butik.skrive.udlejningStatus(u.id, 'bekraeftet', felt.value),
          'Lokalet er lejet ud ' + Admin.pænDato(u.dato) + '. Ring til ' + u.telefon + '.');
      });
      raekke.appendChild(frem);
    }

    if (u.status !== 'afvist') {
      var afvis = lav('button', 'knap fare', 'Afvis');
      afvis.addEventListener('click', function () {
        if (!confirm('Afvis ønsket fra ' + u.navn + '?\n\n'
          + 'Husk at ringe til ' + u.telefon + ' — gæsten har fået at vide, '
          + 'at vi ringer.')) return;
        gemUdlejning(Butik.skrive.udlejningStatus(u.id, 'afvist', felt.value),
          'Ønsket er afvist.');
      });
      raekke.appendChild(afvis);
    }

    /* ⚠️ ET AFVIST ØNSKE KAN FORTRYDES.

       Før kunne et afvist kun slettes. Trykkede nogen forkert
       midt i en frokost, var ønsket væk, og gæsten stod uden et
       svar, ingen kunne finde igen. Samme rettelse som Gendan på
       Overblik — og af samme grund: rækken HAR været set, det var
       derfor, nogen trykkede. */
    if (u.status === 'afvist') {
      var gendan = lav('button', 'knap', 'Gendan');
      gendan.addEventListener('click', function () {
        gemUdlejning(Butik.skrive.udlejningStatus(u.id, 'ny', felt.value),
          'Ønsket er tilbage i køen.');
      });
      raekke.appendChild(gendan);

      var slet = lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!confirm('Flyt ønsket fra ' + u.navn + ' til skraldespanden?\n\n'
          + 'Det kan hentes tilbage i 30 dage.')) return;
        gemUdlejning(Butik.skrive.tilSkraldespand('udlejning', u.id),
          'Ønsket ligger i skraldespanden.');
      });
      raekke.appendChild(slet);
    }

    k.appendChild(raekke);
    return k;
  }

  // ----------------------------------------------------------
  //  HENT
  // ----------------------------------------------------------
  function gemUdlejning(løfte, besked) {
    return løfte
      .then(hentUdlejninger)
      .then(function () { Admin.kvitter(besked); })
      .catch(function (e) { Admin.brøl(e.message || String(e)); });
  }

  function hentUdlejninger() {
    return Butik.hentUdlejninger().then(function (liste) {
      udlejninger = liste || [];
      Admin.meld('udlejninger', udlejninger);
      tegnAlt();
      Admin.hentet('lokale-hentet');
    }).catch(function (e) {
      var boks = $('lokale-venter');
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'fejl',
        'Udlejningerne kunne ikke hentes: ' + (e.message || e)
        + ' Skærmen prøver igen af sig selv om et øjeblik — bliver den'
        + ' ved, så log ud og ind igen.'));
      if (window.console) console.warn('udlejninger:', e);
    });
  }

  // ----------------------------------------------------------
  //  TAG EN UDLEJNING I TELEFONEN
  // ----------------------------------------------------------
  /* ⚠️ HALVDELEN AF BOOKINGERNE KOMMER I RØRET.

     Ringer nogen og lejer lokalet, fandtes der ingen vej ind: så
     stod halvdelen af efteråret i systemet og halvdelen på en
     seddel ved lugen, og månedsnettet løj om, hvilke dage der var
     ledige. Det er det værste, et overblik kan gøre.

     ⚠️ DEN BRUGER GÆSTENS EGEN MOTOR. Butik.lejLokale er den
     samme funktion, baglokale/ kalder, og dermed de samme værn —
     heriblandt det, der siger nej, hvis dagen er taget. En anden
     vej ind i den samme tabel ville være to regelsæt, der
     langsomt kommer til at sige noget forskelligt, og ingen ville
     opdage det, før to selskaber stod i det samme lokale. Samme
     beslutning som telefonbookingen på Borde-fanen (24/8). */
  function opretUdlejning() {
    var navn = $('nyl-navn').value.trim();
    var telefon = $('nyl-telefon').value.trim();
    var dato = $('nyl-dato').value;
    var antal = $('nyl-antal').value;

    if (!navn || !telefon || !dato) {
      Admin.brøl('Navn, telefon og dato skal udfyldes.');
      return;
    }

    var knap = $('opret-udlejning');
    knap.disabled = true;

    Butik.lejLokale({
      navn: navn, telefon: telefon, dato: dato,
      antal_personer: antal === '' ? null : antal,
      besked: $('nyl-besked').value.trim() || null,
    }).then(function (svar) {
      return hentUdlejninger().then(function () {
        var ny = udlejninger.filter(function (u) {
          return u.reference === svar.reference;
        })[0];
        if (!ny) return null;
        return Butik.skrive.udlejningStatus(ny.id, 'bekraeftet',
          'Taget i telefonen.').then(hentUdlejninger);
      });
    }).then(function () {
      ['nyl-navn', 'nyl-telefon', 'nyl-dato', 'nyl-antal', 'nyl-besked']
        .forEach(function (id) { $(id).value = ''; });
      Admin.kvitter('Lokalet er lejet ud ' + Admin.pænDato(dato) + '.');
    }).catch(function (e) {
      Admin.brøl(e.message || String(e));
    }).then(function () {
      knap.disabled = false;
    });
  }

  if ($('opret-udlejning')) {
    $('opret-udlejning').addEventListener('click', opretUdlejning);
  }

  if ($('lokale-forrige')) {
    $('lokale-forrige').addEventListener('click', function () { skift(-1); });
    $('lokale-naeste').addEventListener('click', function () { skift(1); });
    $('lokale-idag').addEventListener('click', function () {
      visAar = null;
      valgtDag = null;
      saetMaaned();
      tegnAlt();
    });
  }

  /* Forespørgslerne hentes af deres egen fane og kan komme EFTER
     udlejningerne — så der tegnes igen, når en anden fane melder
     nye data ind. Uden den her linje stod baglokale-forespørgslen
     ikke på fanen, før nogen loggede ud og ind. */
  Admin.efterHent.push(tegnAlt);
  Admin.vedLogin.push(hentUdlejninger);
  Admin.friske.push(hentUdlejninger);
})();
