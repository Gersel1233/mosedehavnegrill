/* ------------------------------------------------------------
   Bordformularen: spørg om et bord, personalet bekræfter.

   Den tredje formular på hjemmesiden, og den er bygget som de to
   andre med vilje — samme fejlvisning, samme kvittering, samme
   regel om hvad der IKKE gemmes i browseren.

   TO TING SKILLER DEN FRA FORESPØRGSLEN:

   1) Dato, klokkeslæt og antal er PÅKRÆVEDE. "Vi vil gerne have
      et bord engang" er ikke noget, personalet kan svare på — et
      bord ER en dato, et klokkeslæt og et antal stole.

   2) Den henter Butik.hent(). Dagene regnes ud af åbningstiderne
      og kalenderen, så gæsten ikke kan spørge om et bord på en
      lukkedag — og en tidlig lukning skærer aftenens tider af.
      Det er hele grunden til, at kalenderen blev bygget først.

   OG ÉN TING ER DEN SAMME SOM ALTID: kvitteringen lover IKKE et
   bord. Ja'et gives kun i admin, hvor personalet ser hele dagens
   billede. Her står der "vi ringer og bekræfter" — og det gør de.
   ------------------------------------------------------------ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function tøm(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function lav(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = String(tekst);
    return e;
  }

  var data = null;
  var valgtDag = null;

  // ----------------------------------------------------------
  //  HVILKE DAGE OG TIDER KAN MAN SPØRGE OM?
  //  Samme regnestykke som i js/bestilling.js: der findes ikke en
  //  fri dato. En datovælger med alle årets dage ville lade gæsten
  //  spørge om et bord den 1. januar.
  // ----------------------------------------------------------
  var DAGE_FREM = 28;

  function isoPlus(iso, dage) {
    // Middag i UTC: så flytter et døgn ikke datoen ved sommertid
    var t = new Date(iso + 'T12:00:00Z');
    t.setUTCDate(t.getUTCDate() + dage);
    return t.toISOString().slice(0, 10);
  }

  function ugedagFor(iso) {
    var d = new Date(iso + 'T12:00:00Z').getUTCDay();
    return (d + 6) % 7;
  }

  function planFor(d, iso) {
    if (Butik.lukketDen(d, iso)) return null;
    var p = (d.aabningstider || []).filter(function (a) {
      return a.ugedag === ugedagFor(iso);
    })[0];
    if (!p || p.lukket) return null;
    if (!p.aabner || !p.lukker) return null;
    return p;
  }

  /* To timers varsel, med mindre admin siger andet. Ikke 24 som
     smørrebrødet — et bord til i aften er hele pointen — men heller
     ikke nul: personalet skal nå at SE ønsket og ringe tilbage,
     inden gæsten står ved lugen. */
  function varselTimer(d) {
    var v = Number((d.indstillinger || {}).bord_varsel_timer);
    return isFinite(v) && v >= 0 ? v : 2;
  }

  function tidligst(d) {
    var nu = Butik.nu();
    var minutter = nu.minutter + varselTimer(d) * 60;
    var dato = nu.dato;
    while (minutter >= 24 * 60) { minutter -= 24 * 60; dato = isoPlus(dato, 1); }
    return { dato: dato, minutter: minutter };
  }

  /* Tiderne på en dag: hver halve time, sidste tid en halv time før
     der lukkes. En TIDLIG LUKNING fra kalenderen skærer aftenen af:
     lukker lugen 15 i stedet for 21, skal 19.30 ikke kunne vælges —
     det ville være et ønske, personalet kun kan sige nej til. */
  function tiderFor(d, iso) {
    var p = planFor(d, iso);
    if (!p) return [];

    var fra = Butik.tilMinutter(p.aabner);
    var til = Butik.tilMinutter(p.lukker);

    var tidligt = Butik.tilMinutter(Butik.tidligLukning(d, iso));
    if (tidligt !== null && tidligt < til) til = tidligt;
    til -= 30;

    var t = tidligst(d);
    if (iso === t.dato) fra = Math.max(fra, Math.ceil(t.minutter / 30) * 30);

    var ud = [];
    for (var m = fra; m <= til; m += 30) {
      ud.push(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2));
    }
    return ud;
  }

  /* Hvor mange borde er taget pr. dag. Hentes for sig, fordi den
     kommer fra en visning gæsten må læse — se Butik.hentFyldteDage.
     Tom liste = vi kunne ikke se det, og så bookes der som før;
     værnet i databasen siger fra, hvis dagen er fuld. */
  var fyldte = [];

  function erFuld(iso) {
    return Butik.dagenErFuld ? Butik.dagenErFuld(fyldte, iso) : false;
  }

  function muligeDage(d) {
    var t = tidligst(d);
    var ud = [];
    for (var i = 0; i < DAGE_FREM && ud.length < 14; i++) {
      var iso = isoPlus(t.dato, i);
      if (tiderFor(d, iso).length) ud.push(iso);
    }
    return ud;
  }

  var MAANED = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'juni',
    'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];

  function dagNavn(d, iso) {
    var nu = Butik.nu();
    if (iso === nu.dato) return 'I dag';
    if (iso === isoPlus(nu.dato, 1)) return 'I morgen';
    return Butik.UGEDAGE[ugedagFor(iso)];
  }

  function dagDato(iso) {
    var t = new Date(iso + 'T12:00:00Z');
    return t.getUTCDate() + '. ' + MAANED[t.getUTCMonth()];
  }

  // ----------------------------------------------------------
  //  TEGN
  // ----------------------------------------------------------
  function visDage() {
    var boks = $('bord-dage');
    tøm(boks);

    var dage = muligeDage(data);
    if (!dage.length) {
      boks.appendChild(lav('p', 'desc',
        'Vi kan ikke se nogen åbne dage lige nu. Ring til os, så finder vi ud af det.'));
      return;
    }

    if (dage.indexOf(valgtDag) === -1) valgtDag = dage[0];

    /* ⚠️ EN FULD DAG STÅR I STRIBEN, DEN FORSVINDER IKKE.
       Kundens ord 31/8: ejeren skal kunne styre, hvor mange af de
       55 borde der må bookes en bestemt dag. Er loftet nået, er
       dagen fuld — men en dag, der MANGLER i striben, ligner en
       fejl på siden, og gæsten leder efter den i stedet for at
       vælge en anden. Samme regel som ledighedskalenderen (29/8)
       og som udsolgte varer på menukortet.

       ⚠️ OG DEN VALGTE DAG MÅ IKKE VÆRE EN FULD DAG. Blev den
       stående som valgt, kunne gæsten fylde formularen ud og
       først få nej ved afsendelsen. */
    if (erFuld(valgtDag)) {
      var ledig = dage.filter(function (iso) { return !erFuld(iso); })[0];
      if (ledig) valgtDag = ledig;
    }

    dage.forEach(function (iso) {
      var fuld = erFuld(iso);
      var b = lav('button', 'dag' + (iso === valgtDag && !fuld ? ' valgt' : '')
        + (fuld ? ' fuld' : ''));
      b.type = 'button';
      /* Dagen bærer sin ISO-dato, så en prøve kan pege på PRÆCIS
         den dag. Teksten "7. aug." rammer også "17. aug." — samme
         grund som data-vare på menukortets rækker. */
      b.setAttribute('data-dato', iso);
      b.disabled = fuld;
      b.setAttribute('aria-pressed', iso === valgtDag && !fuld ? 'true' : 'false');
      if (fuld) b.title = 'Alle borde er booket den dag';
      b.appendChild(lav('span', 'dag-navn', dagNavn(data, iso)));
      b.appendChild(lav('span', 'dag-dato', dagDato(iso)));
      /* Ordet står PÅ knappen og ikke kun som en farve: en
         gennemstreget dag uden en forklaring læses som en fejl. */
      if (fuld) b.appendChild(lav('span', 'dag-fuld', 'Fuldt'));
      b.addEventListener('click', function () {
        if (fuld) return;
        valgtDag = iso;
        visDage();
        visTider();
      });
      boks.appendChild(b);
    });

    /* Er ALLE de viste dage fulde, skal siden sige det — en stribe
       med fjorten grå knapper og ingen forklaring er en side, der
       ser i stykker ud. */
    if (dage.every(erFuld)) {
      boks.appendChild(lav('p', 'desc',
        'Alle borde er booket de næste par uger. Ring til os — '
        + 'vi kan nogle gange finde plads alligevel.'));
    }
  }

  function visTider() {
    var vaelg = $('bord-tid');
    var foer = vaelg.value;
    tøm(vaelg);

    tiderFor(data, valgtDag).forEach(function (t) {
      var o = document.createElement('option');
      o.value = t;
      o.textContent = 'kl. ' + Butik.klokken(t);
      vaelg.appendChild(o);
    });
    if (foer && vaelg.querySelector('option[value="' + foer + '"]')) vaelg.value = foer;
  }

  // ----------------------------------------------------------
  //  FEJL I FELTERNE — samme mønster som de andre formularer
  // ----------------------------------------------------------
  function visFejl(feltId, besked) {
    var boks = $('fejl-' + feltId.replace('bord-', ''));
    var felt = $(feltId);
    if (!boks) return;

    boks.textContent = besked || '';
    boks.classList.toggle('skjult', !besked);

    if (!felt) return;
    if (besked) {
      felt.setAttribute('aria-invalid', 'true');
      felt.setAttribute('aria-describedby', boks.id);
    } else {
      felt.removeAttribute('aria-invalid');
      felt.removeAttribute('aria-describedby');
    }
  }

  function sigFejl(besked) {
    var boks = $('bord-fejl');
    boks.textContent = besked || '';
    boks.classList.toggle('skjult', !besked);
    if (besked) boks.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // ----------------------------------------------------------
  //  SEND
  // ----------------------------------------------------------
  function send(ev) {
    ev.preventDefault();
    sigFejl(null);

    var navn = $('bord-navn').value;
    var telefon = $('bord-telefon').value;
    var email = $('bord-email').value;
    var antal = $('bord-antal').value.trim();
    var tid = $('bord-tid').value;

    var fejl = {
      navn: Butik.tjek.navn(navn, 'navn', 80),
      telefon: Butik.tjek.telefon(telefon),
      email: Butik.tjek.epost(email),
    };

    var n = Number(antal);
    if (antal === '' || !isFinite(n) || n < 1 || Math.round(n) !== n) {
      fejl.antal = 'Hvor mange kommer I? Skriv et helt tal.';
    } else if (n > 100) {
      /* Ikke bare "for stort": hundrede mennesker ER et selskab,
         og selskaber har deres egen indgang med sin egen samtale. */
      fejl.antal = 'Over 100 er et selskab — skriv til os om det i stedet.';
    }

    visFejl('bord-navn', fejl.navn);
    visFejl('bord-telefon', fejl.telefon);
    visFejl('bord-email', fejl.email);
    visFejl('bord-antal', fejl.antal);

    if (fejl.email) åbnMere(true);

    var første = ['antal', 'navn', 'telefon', 'email'].filter(function (f) {
      return fejl[f];
    })[0];
    if (første) {
      $('bord-' + første).focus();
      return;
    }

    if (!valgtDag || !tid) {
      sigFejl('Vælg en dag og et klokkeslæt.');
      return;
    }

    var knap = $('bord-send');
    knap.disabled = true;
    knap.textContent = 'Sender …';

    Butik.bookBord({
      navn: navn,
      telefon: telefon,
      email: email,
      dato: valgtDag,
      tid: tid,
      antal_personer: n,
      besked: $('bord-besked').value,
    }).then(visTak).catch(function (e) {
      knap.disabled = false;
      knap.textContent = 'Book bordet';
      sigFejl(e.message || 'Bookingen kunne ikke sendes. Ring til os i stedet.');
    });
  }

  // ----------------------------------------------------------
  //  KVITTERINGEN
  //  --------------------------------------------------------
  //  BOOKET ER BOOKET. Her stod det modsatte: "Bordet er IKKE
  //  bekræftet endnu — vent på opkaldet, før I regner med det."
  //
  //  Kunden har sagt det fire gange, senest 23/8: "hvad man skal
  //  kunne BESTILLE bord, ikke SPØRGE." Det er den samme
  //  beslutning som på bestillingerne (se auto_bekraeft i
  //  js/bestilling.js): gæsten booker, og kan forretningen mod
  //  forventning ikke skaffe bordet, er det DEM, der ringer —
  //  derfor står telefonnummeret i bookingen.
  //
  //  Kvitteringen skal stadig sige, hvad der ER aftalt, og
  //  hvordan man kommer af med det igen. Et løfte uden en
  //  udgang er et bord, ingen tør booke.
  // ----------------------------------------------------------
  function visTak(b) {
    var form = $('bord-form');
    var tak = $('bord-tak');

    /* ⚠️ SLÅS OP HER, IKKE VED INDLÆSNINGEN. js/skal/kvittering.js
       er et script-tag mere i bord/index.html, og rækkefølgen af
       tags må ikke afgøre, om kvitteringen findes — det er arret
       fra 23/8, hvor bestilling.js blev læst efter side.js. */
    var K = window.MosedeKvittering;
    form.classList.add('skjult');
    tøm(tak);

    /* ⚠️ SKJULT SKAL AF, FØR KVITTERINGEN BYGGES  (4/9).
       MosedeKvittering.byg ruller selv hen til boksen, og
       scrollIntoView på et element med display:none rammer
       ingenting — så stod gæsten på formularens plads og så
       ikke, at bookingen var gået igennem. */
    tak.classList.remove('skjult');

    /* BOOKET ER BOOKET. Kunden har sagt det fire gange, senest
       23/8: "man skal kunne bestille bord, ikke spørge". Derfor
       lover sætningen bordet — opkaldet er nødudgangen, ikke
       vejen. */
    /* ⚠️ "VI SES" STÅR ÉN GANG. Overskriften siger det allerede
       ("Vi ses, Familien."), og MÅLT på et skud 4/9 stod det to
       gange med tre ord imellem. */
    var besked = 'Bordet er booket til '
      + dagNavn(data, b.dato).toLowerCase()
      + ' ' + dagDato(b.dato) + ' kl. ' + Butik.klokken(b.tid) + '. '
      + 'Kan vi mod forventning ikke skaffe bordet, ringer vi til dig på '
      + b.telefon + '. Bliver I forhindret, så ring — så giver vi bordet videre.';

    /* ⚠️ DEN GAMLE FORM STÅR KUN, NÅR BYGGEREN MANGLER  (4/9).
       Den blev bygget ubetinget en dag, og K.byg tømmer boksen
       som det første — så "Vi ses …" blev revet ned igen, og
       løftet om et opkald var væk uden en fejl nogen steder. */
    if (!K) {
      tak.appendChild(lav('div', 'eyebrow', 'Bordet er booket'));
      tak.appendChild(lav('h2', null, 'Tak, ' + fornavn(b.navn) + '.'));
      tak.appendChild(lav('p', 'vare-tekst', besked));
    }

    /* ⚠️ INGEN MAILADRESSE PÅ KVITTERINGEN, OG DET ER MED VILJE
       (28/8).

       Der stod en her en dag: "Skal noget ændres, kan I også
       skrive til booking1@…". Kundens svar var klart:
       "bordbestilling skal foregå igennem systemet og admin og
       ikke igennem mail."

       Han har ret, og det gælder også ÆNDRINGER. En aflysning i
       en indbakke er et bord, der står reserveret hele aftenen,
       fordi ingen nåede at åbne mailen — og dagens billede i
       admin viser en plads, der reelt er fri. Telefonen er vejen:
       dér kan personalet rette det i admin, mens gæsten er i
       røret, og bordet er frit i samme sekund.

       Skal ændringer kunne klares uden et opkald, er svaret en
       vej ind i SYSTEMET — ikke en postkasse. */

    var linjer = [
      { navn: 'Dag', vaerdi: dagNavn(data, b.dato) + ' ' + dagDato(b.dato) },
      { navn: 'Klokken', vaerdi: Butik.klokken(b.tid) },
      { navn: 'Antal', vaerdi: b.antal_personer + ' personer' },
    ];

    if (K) {
      K.byg(tak, {
        /* ⚠️ "TAK," SOM DE ANDRE KVITTERINGER  (4/9). Den stod
           som "Vi ses, X." i et par timer — min egen ændring, som
           ingen havde bedt om, da de seks kvitteringer blev slået
           sammen. Kunden bad om den samme FORM alle steder, ikke
           om nye ord. Løftet om bordet står i beskeden nedenfor,
           hvor det hører til. Fanget af kontakt-post.spec. */
        titel: 'Tak, ' + fornavn(b.navn) + '.',
        besked: besked,
        kode: {
          navn: 'Bookingnummer',
          reference: b.reference,
          /* ⚠️ GÆSTEN MÅ IKKE LÆSE bordbestillinger (fase 4's
             regel), så tallet kommer fra
             mosede_bordnummer(reference) — security definer,
             svarer kun på en reference, man HAR, og kun en time
             frem. Kommer det ikke, træder referencen frem som
             det store, og intet mangler. */
          nummer: function () {
            if (!Butik.bordnummer || !Butik.pæntNummer) return null;
            return Butik.bordnummer(b.reference).then(function (n) {
              return n ? Butik.pæntNummer(n) : null;
            });
          },
        },
        linjer: linjer,
      });
    } else {
      var kvit = lav('div', 'kvit');
      kvit.appendChild(kvitLinje('Reference', b.reference));
      linjer.forEach(function (l) { kvit.appendChild(kvitLinje(l.navn, l.vaerdi)); });
      tak.appendChild(kvit);
    }

    var raekke = lav('div', 'knap-raekke');
    var ring = lav('a', 'knap sekundaer', 'Ring til os');
    ring.href = 'tel:+4528871343';
    ring.setAttribute('data-tel', '');
    raekke.appendChild(ring);

    var tilbage = lav('a', 'knap sekundaer', 'Til forsiden');
    tilbage.href = '../index.html';
    raekke.appendChild(tilbage);
    tak.appendChild(raekke);

    if (!K) tak.scrollIntoView({ block: 'start', behavior: 'smooth' });
    tak.focus();
  }

  function kvitLinje(navn, vaerdi) {
    var l = lav('div', 'kvit-linje');
    l.appendChild(lav('span', 'kvit-navn', navn));
    l.appendChild(lav('span', 'kvit-vaerdi', vaerdi));
    return l;
  }

  /* ⚠️ MED STORT FORBOGSTAV  (4/9). MÅLT på kundens eget skud
     af smørrebrødskvitteringen: han skrev "mikkel", og siden
     sagde *"Tak, mikkel."* Gæsten skriver småt på en telefon, og
     en kvittering, der siger navnet forkert tilbage, er det
     første, hun læser. */
  function fornavn(n) {
    var f = String(n || '').trim().split(/\s+/)[0] || '';
    return f ? f.charAt(0).toUpperCase() + f.slice(1) : 'igen';
  }

  // ----------------------------------------------------------
  //  FOLDEN
  // ----------------------------------------------------------
  function åbnMere(åben) {
    $('bord-mere').hidden = !åben;
    $('bord-mere-knap').setAttribute('aria-expanded', åben ? 'true' : 'false');
  }

  // ----------------------------------------------------------
  //  START
  // ----------------------------------------------------------
  function start(d) {
    data = d;
    visDage();
    visTider();

    $('bord-form').addEventListener('submit', send);

    $('bord-mere-knap').addEventListener('click', function () {
      åbnMere($('bord-mere').hidden);
    });

    ['navn', 'telefon', 'email', 'antal'].forEach(function (f) {
      var felt = $('bord-' + f);
      if (felt) felt.addEventListener('input', function () {
        visFejl('bord-' + f, null);
        sigFejl(null);
      });
    });
  }

  /* ⚠️ DE FYLDTE DAGE MÅ IKKE KUNNE VÆLTE SIDEN. Er visningen
     ikke oprettet endnu (supabase/bord-loft-pr-dag.sql ikke
     kørt), svarer hentningen med en tom liste, og siden bookes
     som før. Værnet i databasen findes heller ikke da — men så er
     der ikke noget loft at overtræde. */
  Butik.hent().then(function (d) {
    return (Butik.hentFyldteDage ? Butik.hentFyldteDage() : Promise.resolve([]))
      .catch(function () { return []; })
      .then(function (liste) {
        fyldte = liste || [];
        return d;
      });
  }).then(start);
})();
