/* ============================================================
   DE TRE FORESPØRGSELSSIDER — KOBLINGEN, IKKE SKALLEN

   Selskaber, catering og baglokalet er den SAMME tabel med tre
   indgange (fase 2). De tre formularer i designet spørger om
   forskellige ting — anledning, tidsrum, kuverter, fade — og alt
   det ekstra lægges i kolonnen detaljer, så personalet kan se
   det som felter og ikke som fritekst midt i en besked.

   ÉT MODUL, TRE FORMULARER. Forskellene står som opsætning i
   SIDER; alt andet er fælles. Tre kopier af den samme afsendelse
   ville langsomt komme til at gøre tre forskellige ting.

   KALENDEREN. Havnen er ét sted: er baglokalet lejet ud den 12.,
   kan der ikke også holdes selskab hos jer den 12. De optagne
   dage hentes fra listen, gæsten må læse (KUN datoer), og
   databasen siger nej igen, hvis nogen omgår formularen.
   Catering optager ingenting — den er pr. definition ud af
   huset — og et selskab UD AF HUSET gør heller ikke.
   ============================================================ */

(function () {
  'use strict';

  if (!window.Butik) return;

  /* PANELET HEDDER IKKE DET SAMME PÅ ALLE FIRE SIDER.

     De tre første har id'et "forespoerg"; frokostsiden hedder
     "tilbud", fordi designets egen pille og skuffemenu peger på
     #tilbud. At omdøbe det ville brække to links i skallen — og
     skallen er facitlisten. Derfor står panelets id i SIDER
     nedenfor, og siden findes på DATOFELTET, som ligger inde i
     panelet men kan slås op på hele siden. */
  var panel = null;

  function find(v, rod) {
    try { return (rod || panel).querySelector(v); } catch (e) { return null; }
  }
  function alle(v, rod) {
    return Array.prototype.slice.call((rod || panel).querySelectorAll(v));
  }
  function tøm(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }
  function lav(tag, klasse, tekst) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (tekst !== undefined && tekst !== null) el.textContent = tekst;
    return el;
  }
  function tekst(el) { return el ? el.textContent.trim() : ''; }

  /* ---- DE TRE FORMULARER ----
     chips: rækkefølgen af [data-chips] i panelet. Der er ingen
     id'er på dem i designet, og at give dem nogen ville være at
     lave om på skallen — så de tælles, og opsætningen siger,
     hvad nummer nul og nummer ét hedder. */
  var SIDER = {
    pdato: {
      type: 'selskab',
      felter: { dato: 'pdato', antal: 'pantal', navn: 'pnavn',
        tlf: 'ptlf', mail: 'pmail', besked: 'pbesked' },
      chips: ['anledning', 'mad'],
      seg: { vælger: '.seg2', navn: 'hvor', svar: ['hos-jer', 'ud-af-huset'] },
      optagerDagen: function (d) { return d.hvor !== 'ud-af-huset'; },
    },
    bdato: {
      type: 'baglokale',
      felter: { dato: 'bdato', antal: 'bantal', navn: 'bnavn',
        tlf: 'btlf', mail: 'bmail', besked: 'bbesked' },
      chips: ['tidsrum', 'servering'],
      seg: { vælger: '[data-toggles="#madfelt"]', navn: 'mad', svar: ['med-mad', 'kun-lokalet'] },
      optagerDagen: function () { return true; },
    },
    cdato: {
      type: 'catering',
      felter: { dato: 'cdato', antal: 'ckuv', navn: 'cnavn',
        tlf: 'ctlf', mail: 'cmail', besked: 'cbesked' },
      chips: ['anledning', 'levering_indhold'],
      seg: { vælger: '[data-toggles="#cadrfelt"]', navn: 'levering', svar: ['levering', 'afhentning'] },
      ekstra: { adresse: 'cadr', tid: 'ctid', fade: 'cfade' },
      /* Catering optager ingen dage: maden kører ud, og havnen
         står fri. Derfor er der heller ingen datospærre her. */
      optagerDagen: function () { return false; },
    },

    /* ---- FROKOSTORDNINGEN ----

       Den stod som fase 6 med "tilbagevendende levering, pauser,
       helligdage". Det var en misforståelse, og Mikkel rettede
       den 20/8: den mad, man også kan bestille, skal bare kunne
       bestilles senest dagen før — og det gør forsidens
       bestilling allerede.

       Men designet fra 23/8 tegnede siden som et B2B-tilbud:
       firma, CVR, faste ugedage, fakturamail og knappen "Få et
       tilbud". Og dét er ikke en bestilling. Det er præcis en
       forespørgsel: et menneske skriver, personalet ringer, og
       der aftales en pris. Samme skelet som de tre ovenfor.

       DER BYGGES ALTSÅ INGEN ABONNEMENTSMOTOR. Der er ingen
       tabel til tilbagevendende leveringer, ingen pauser og
       ingen helligdage — kun det spørgsmål, firmaet stiller.

       Datoen er ØNSKET START og ikke en enkelt dag, så
       optagerDagen er falsk: en frokostordning er mad, der kører
       ud af huset, og lokalet står frit. Optog den dagen, kunne
       ét firma med en fast onsdag lukke hver eneste onsdag for
       selskaber og udlejning. */
    fstart: {
      type: 'frokost',
      panel: 'tilbud',
      felter: { dato: 'fstart', antal: 'fantal', navn: 'fnavn',
        tlf: 'ftlf', mail: 'fmail', besked: 'fbesked' },
      chips: ['dage', 'indhold'],
      seg: { vælger: '[data-toggles="#fadrfelt"]', navn: 'levering', svar: ['levering', 'afhentning'] },
      ekstra: { adresse: 'fadr', firma: 'ffirma', cvr: 'fcvr' },
      optagerDagen: function () { return false; },
    },
  };

  var side = null;
  Object.keys(SIDER).forEach(function (n) {
    if (!side && document.getElementById(n)) side = SIDER[n];
  });
  if (!side) return;

  panel = document.getElementById(side.panel || 'forespoerg');
  if (!panel) return;

  var data = null;
  var optagne = [];
  var oprindeligFine = '';

  function felt(navn) {
    var id = side.felter[navn] || (side.ekstra || {})[navn];
    return id ? document.getElementById(id) : null;
  }
  function værdi(navn) {
    var f = felt(navn);
    return f ? String(f.value || '').trim() : '';
  }

  // ----------------------------------------------------------
  //  BESKEDER
  //  ----------------------------------------------------------
  //  Designet har ikke tegnet et fejlfelt, og et opfundet ét
  //  ville være en ændring af skallen. Den lille linje under
  //  knappen er der i forvejen — den låner vi, og designets egen
  //  tekst kommer igen, så snart fejlen er rettet.
  // ----------------------------------------------------------
  function fineFelt() { return find('.fine'); }

  function sigFejl(besked, feltNavn) {
    var f = fineFelt();
    if (f) f.textContent = '⚠ ' + besked;
    var el = feltNavn ? felt(feltNavn) : null;
    if (el) el.focus();
    return false;
  }

  function rydFejl() {
    var f = fineFelt();
    if (f && oprindeligFine) f.textContent = oprindeligFine;
  }

  // ----------------------------------------------------------
  //  DETALJERNE
  // ----------------------------------------------------------
  function valgteChips(gruppe) {
    return alle('button.on', gruppe).map(tekst).filter(Boolean);
  }

  /* TO SLAGS SEGMENTER, OG DE HOLDER STYR PÅ SIG SELV HVER SIN
     MÅDE.

     [data-seg] flytter .on, når man trykker — det er den, der ser
     ud som et valg. [data-toggles] gør IKKE: designets egen kode
     skjuler eller viser bare feltet nedenunder, og den fremhævede
     knap bliver stående, hvor den startede.

     MÅLT: første udgave læste .on begge steder, og en catering,
     hvor gæsten havde trykket Afhentning, blev sendt som en
     LEVERING — med adressen på. Køkkenet ville køre ud med mad,
     nogen stod og ventede på ved lugen.

     Derfor spørges der om det, designet FAKTISK holder styr på:
     er feltet nedenunder synligt? */
  function segSvar() {
    var g = find(side.seg.vælger);
    if (!g) return side.seg.svar[0];

    var mål = g.getAttribute('data-toggles');
    if (mål) {
      var boks = document.querySelector(mål);
      return (boks && !boks.hidden) ? side.seg.svar[0] : side.seg.svar[1];
    }

    var knapper = alle('button', g);
    var på = find('button.on', g);
    var i = på ? knapper.indexOf(på) : 0;
    return side.seg.svar[i] || side.seg.svar[0];
  }

  function detaljer() {
    var ud = {};
    var grupper = alle('[data-chips]');
    side.chips.forEach(function (navn, i) {
      if (!grupper[i]) return;
      var valgt = valgteChips(grupper[i]);
      if (!valgt.length) return;
      /* Enkeltvalg gemmes som tekst, flervalg som liste. Så
         slipper admin for at skulle kende forskel på "en liste
         med ét element" og "et valg". */
      ud[navn] = grupper[i].getAttribute('data-chips') === 'single' ? valgt[0] : valgt;
    });
    ud[side.seg.navn] = segSvar();

    Object.keys(side.ekstra || {}).forEach(function (navn) {
      var v = værdi(navn);
      if (v) ud[navn] = v;
    });
    /* Adressen hører kun til en levering. Blev den hængende,
       efter gæsten skiftede til afhentning, ville personalet
       ringe om en levering, ingen har bedt om. */
    if (ud.levering === 'afhentning') delete ud.adresse;
    return ud;
  }

  // ----------------------------------------------------------
  //  DATOEN
  //  ----------------------------------------------------------
  //  Designet har en fast dato i feltet ("2026-09-19"). Den
  //  ryger: en pladsholder, ingen har valgt, ville blive sendt
  //  som gæstens ønskede dato, den dag hun glemmer at røre
  //  feltet. Til gengæld sættes min og max, så feltet ikke kan
  //  give en dato, databasen alligevel afviser.
  // ----------------------------------------------------------
  function iso(dage) {
    var t = new Date(Butik.nu().dato + 'T12:00:00Z');
    t.setUTCDate(t.getUTCDate() + dage);
    return t.toISOString().slice(0, 10);
  }

  function erOptaget(dato) {
    if (!dato || !side.optagerDagen(detaljer())) return false;
    return optagne.some(function (o) { return o.dato === dato; });
  }

  function tjekDato() {
    var d = værdi('dato');
    if (!d) return rydFejl();
    if (erOptaget(d)) {
      sigFejl('Den dato er desværre optaget. Vælg en anden — '
        + 'eller ring til os, så finder vi ud af det.');
      return false;
    }
    rydFejl();
    return true;
  }

  // ----------------------------------------------------------
  //  LEDIGHEDSKALENDEREN  (29/8)
  //  ----------------------------------------------------------
  //  Kundens ord: "en kalender som admin styrer men kunderne kan
  //  se ift hvis der allerede er booket eller reserveret den
  //  dag." Nettet viser optagne_dage — KUN datoer, aldrig navne —
  //  og admin styrer den derved, at en dag først optages, når
  //  personalet har sagt ja OG låst den (eller en udlejning står
  //  bekræftet). En ny forespørgsel spærrer ingenting: ellers
  //  kunne én person med et telefonnummer lukke hele efteråret.
  //
  //  En optaget dag STÅR i nettet, streget — en dag, der mangler,
  //  ligner en fejl i kalenderen. Klik på en ledig dag sætter
  //  datofeltet; klik på en optaget gør ingenting, og databasens
  //  værn dømmer stadig ved afsendelsen.
  //
  //  På selskabssiden skjuler nettet sig, når "ud af huset" er
  //  valgt: dér optages ingen dage, og en kalender, hvor alt er
  //  ledigt, ville bare fylde. Samme regel som datospærren
  //  (side.optagerDagen).
  // ----------------------------------------------------------
  var KAL_MDR = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december'];
  var kalAar = null;
  var kalMd = null;    // 0-11

  function kalStart() {
    var rod = document.getElementById('ledigkal');
    if (!rod) return;

    var iDag = Butik.nu().dato;
    if (kalAar === null) {
      kalAar = Number(iDag.slice(0, 4));
      kalMd = Number(iDag.slice(5, 7)) - 1;
    }

    var forrige = document.getElementById('lk-forrige');
    var naeste = document.getElementById('lk-naeste');
    if (forrige && !forrige.getAttribute('data-klar')) {
      forrige.setAttribute('data-klar', '1');
      forrige.addEventListener('click', function () { kalFlyt(-1); });
      naeste.addEventListener('click', function () { kalFlyt(1); });
      var datoFelt = felt('dato');
      if (datoFelt) datoFelt.addEventListener('change', kalTegn);
      /* Selskabssidens hos-jer/ud-af-huset-knapper: nettet skal
         følge med valget. Designets segmenter flytter ikke .on,
         så der lyttes på klikket og tegnes efter (mikro-pause,
         til designets egen kode har vist/skjult felterne). */
      if (side.seg) {
        Array.prototype.forEach.call(
          document.querySelectorAll(side.seg.vælger + ' button'),
          function (knap) {
            knap.addEventListener('click', function () {
              setTimeout(kalTegn, 60);
            });
          });
      }
    }
    kalTegn();
  }

  function kalFlyt(retning) {
    kalMd += retning;
    if (kalMd < 0) { kalMd = 11; kalAar--; }
    if (kalMd > 11) { kalMd = 0; kalAar++; }
    kalTegn();
  }

  function kalTegn() {
    var rod = document.getElementById('ledigkal');
    var net = document.getElementById('lk-net');
    var titel = document.getElementById('lk-titel');
    if (!rod || !net || !titel) return;

    /* Optager valget ingen dage (catering, frokost, selskab ud af
       huset), er nettet støj. */
    if (!side.optagerDagen(detaljer())) { rod.hidden = true; return; }
    rod.hidden = false;

    var iDag = Butik.nu().dato;
    var iAar = Number(iDag.slice(0, 4));
    var iMd = Number(iDag.slice(5, 7)) - 1;

    /* Ikke bagud for indeværende måned, og højst halvandet år
       frem — længere ude er svaret alligevel et telefonopkald. */
    if (kalAar * 12 + kalMd < iAar * 12 + iMd) { kalAar = iAar; kalMd = iMd; }
    var frem = (kalAar * 12 + kalMd) - (iAar * 12 + iMd);
    var forrige = document.getElementById('lk-forrige');
    var naeste = document.getElementById('lk-naeste');
    if (forrige) forrige.disabled = frem <= 0;
    if (naeste) naeste.disabled = frem >= 18;

    titel.textContent = KAL_MDR[kalMd] + ' ' + kalAar;

    var valgt = værdi('dato');
    var dage = new Date(Date.UTC(kalAar, kalMd + 1, 0)).getUTCDate();
    var foerste = (new Date(Date.UTC(kalAar, kalMd, 1)).getUTCDay() + 6) % 7;

    net.textContent = '';
    for (var b = 0; b < foerste; b++) {
      net.appendChild(document.createElement('span')).className = 'lk-tom';
    }
    for (var d = 1; d <= dage; d++) {
      var dato = kalAar + '-' + String(kalMd + 1).padStart(2, '0')
        + '-' + String(d).padStart(2, '0');
      var celle = document.createElement('button');
      celle.type = 'button';
      celle.className = 'lk-dag';
      celle.setAttribute('data-dato', dato);
      celle.textContent = d;

      var taget = optagne.some(function (o) { return o.dato === dato; });
      if (dato < iDag) {
        celle.className += ' fortid';
        celle.disabled = true;
      } else if (taget) {
        celle.className += ' taget';
        celle.disabled = true;
        celle.setAttribute('aria-label', d + '. ' + KAL_MDR[kalMd] + ' — optaget');
      } else {
        celle.addEventListener('click', kalVaelg);
      }
      if (dato === valgt) celle.className += ' valgt';
      net.appendChild(celle);
    }
  }

  function kalVaelg(h) {
    var dato = h.currentTarget.getAttribute('data-dato');
    var datoFelt = felt('dato');
    if (!datoFelt) return;
    datoFelt.value = dato;
    /* Samme vej som et håndskrevet valg: change-lytterne (tjekDato
       og nettets egen optegning) skal se det. */
    datoFelt.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ----------------------------------------------------------
  //  AFSENDELSEN
  // ----------------------------------------------------------
  function send() {
    var navn = værdi('navn');
    var tlf = værdi('tlf');
    var mail = værdi('mail');

    if (navn.length < 2) return sigFejl('Skriv dit navn.', 'navn');
    if (tlf.replace(/[^0-9]/g, '').length < 8) {
      return sigFejl('Skriv et telefonnummer, vi kan få fat i dig på.', 'tlf');
    }
    if (mail && !/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(mail)) {
      return sigFejl('E-mailen ser ikke rigtig ud.', 'mail');
    }
    if (!tjekDato()) return false;

    var knap = find('button.g.solid.blk');
    if (knap) knap.disabled = true;

    return Butik.forespoerg({
      type: side.type,
      navn: navn,
      telefon: tlf,
      email: mail,
      dato: værdi('dato') || null,
      antal_personer: værdi('antal') || null,
      besked: værdi('besked'),
      detaljer: detaljer(),
    }).then(function (raekke) {
      visTak(raekke);
    }).catch(function (fejl) {
      if (knap) knap.disabled = false;
      sigFejl(fejl && fejl.message ? fejl.message
        : 'Forespørgslen kunne ikke sendes. Ring til os i stedet.');
    });
  }

  /* Adressen til den slags, systemet ikke gør: et tilbud, en
     ændring, et spørgsmål der skal skrives ned.

     ⚠️ DEN LÆSES AF LINKET I BUNDEN AF SIDEN og ikke af
     indstillingerne. Adressen står ÉT sted — i sidens egen HTML —
     og js/skal/kontakt.js har allerede byttet den ud, hvis
     personalet har skrevet en anden i admin. Læste vi
     indstillingen her også, ville der være to steder, der kunne
     komme til at sige hver sit, og reserven skulle stå i koden.

     Er linket taget af siden (adressen er nedlagt), er der ingen
     adresse — og så står linjen der ikke. En mailto til ingenting
     er en blindgyde. */
  function postadresse() {
    var a = document.querySelector('a[data-post="selskab"]');
    var href = a ? String(a.getAttribute('href') || '') : '';
    if (href.indexOf('mailto:') !== 0) return '';
    /* ⚠️ ET EMNE SKAL SKÆRES AF. Knapperne på siderne bærer et
       ?subject= i forvejen ("Selskab hos Mosede Havnecafe"), og
       kvitteringen sætter SIT eget på med referencen. Uden det
       her blev adressen til
         mailto:…?subject=Selskab…?subject=Forespørgsel FO…
       og mailprogrammet fik et emne, der hed hele den anden
       halvdel af adressen. Prøven fældede det. */
    return href.slice(7).split('?')[0];
  }

  function visTak(f) {
    tøm(panel);
    panel.appendChild(lav('h3', null, 'Tak, ' + String(f.navn || '').split(' ')[0] + '.'));
    /* Der loves ikke et tidspunkt. Vi ved ikke, hvornår
       personalet har hænder fri, og et "svar inden for en time"
       er et løfte, siden ikke kan holde. */
    panel.appendChild(lav('p', 'hint', 'Vi har fået jeres forespørgsel og '
      + 'vender tilbage med et svar. Haster det, så ring til os.'));

    /* ⚠️ EN VEJ TILBAGE, DER IKKE ER ET OPKALD.

       Et tilbud på et selskab er tal, datoer og forbehold, og
       halvdelen af dem, der spørger, sidder på et arbejde, hvor de
       ikke kan ringe. Referencen står lige nedenunder, så de kan
       skrive den med — og så ved personalet, hvilken sag mailen
       hører til.

       Adressen kommer fra databasen, hvis nogen har rettet den i
       admin; ellers fra oplysningerne. Er der ingen, står linjen
       der ikke: en mailto til ingenting er en blindgyde. */
    var post = postadresse();
    if (post) {
      var skriv = lav('p', 'hint');
      skriv.appendChild(document.createTextNode('Vil I hellere skrive? '));
      var a2 = lav('a', null, post);
      a2.href = 'mailto:' + post + '?subject='
        + encodeURIComponent('Forespørgsel ' + f.reference);
      skriv.appendChild(a2);
      skriv.appendChild(document.createTextNode(' — tag referencen med.'));
      panel.appendChild(skriv);
    }

    panel.appendChild(lav('div', 'note', 'Reference: ' + f.reference));
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ----------------------------------------------------------
  //  START
  // ----------------------------------------------------------
  var datoFelt = felt('dato');
  if (datoFelt) {
    datoFelt.value = '';
    datoFelt.min = iso(0);
    // Samme grænse som databasens forespoergsel_dato_ok: to år.
    datoFelt.max = iso(730);
    datoFelt.addEventListener('change', tjekDato);
  }

  var fine = fineFelt();
  oprindeligFine = fine ? fine.textContent : '';

  var knap = find('button.g.solid.blk');
  if (knap) {
    knap.type = 'button';
    knap.addEventListener('click', send);
  }

  ['navn', 'tlf', 'mail'].forEach(function (n) {
    var el = felt(n);
    if (el) el.addEventListener('input', rydFejl);
  });

  /* Skifter gæsten til "ud af huset", er dagen ikke længere
     optaget for hende — og omvendt. Segmentet skal derfor kunne
     tage fejlen væk igen. */
  var seg = find(side.seg.vælger);
  if (seg) seg.addEventListener('click', function () { setTimeout(tjekDato, 0); });

  /* ============================================================
     BAGLOKALETS VILKÅR — EJERENS TAL, IKKE DESIGNETS  (28/8)
     ------------------------------------------------------------
     Siden blev leveret med designets pladsholdere: 40 siddende,
     60 stående, 1.200 kr. for en aften, 2.000 for dagen, gratis
     fra 20 kuverter. De har stået i luften siden 23/8, fordi
     Mikkel bad om det — men indtil nu kunne de kun rettes ved at
     redigere HTML, og det kan en cafe ikke.

     Nu er hvert tal pakket i sit eget <span data-vilk>, og
     personalet skriver deres egne i admin → Baglokalet → Vilkår.

     ⚠️ VI OVERSKRIVER KUN, NÅR DATABASEN HAR NOGET AT SIGE. Er
     feltet tomt i admin, bliver designets tal stående. En kobling,
     der skriver "0 siddende" hen over designet, er værre end
     ingen kobling — og et tal, VI fandt på som reserve, ville se
     ud som noget forretningen havde sagt.

     ⚠️ OG TALLET BYTTES DÉR, HVOR DET STÅR. Byggede vi hele
     sætningen om i JavaScript, skulle designets egne tal stå her
     som reserve — og så var der to steder, den samme pladsholder
     skulle rettes. Reserven er den tekst, der allerede står i
     filen.
     ============================================================ */
  function visVilkaar(d) {
    if (side.type !== 'baglokale') return;
    var i = (d && d.indstillinger) || {};

    function tal(n) {
      var x = Number(n);
      if (!isFinite(x) || x <= 0) return null;
      // Tusindtalsskilletegn som i designet: 1.200, ikke 1200.
      return x.toLocaleString('da-DK');
    }

    ['pladser', 'staaende', 'pris_aften', 'pris_dag', 'gratis_fra']
      .forEach(function (navn) {
        var v = tal(i['lokale_' + navn]);
        if (v === null) return;
        alle('[data-vilk="' + navn + '"]', document).forEach(function (el) {
          el.textContent = v;
        });
      });

    /* Depositum og "hvad er med i prisen" har ingen plads i
       designet, så de står i et tomt felt, der er skjult, til
       ejeren skriver noget. At tilføje en linje, der altid er
       der, ville være at lave om på skallen. */
    var ekstra = document.querySelector('[data-vilk-ekstra]');
    if (ekstra) {
      var dele = [];
      var dep = tal(i.lokale_depositum);
      if (dep) dele.push('Depositum ' + dep + ' kr.');
      var tekst = String(i.lokale_vilkaar || '').trim();
      if (tekst) dele.push(tekst);
      if (dele.length) {
        ekstra.textContent = ' ' + dele.join(' · ')
          + (/[.!?]$/.test(dele[dele.length - 1]) ? '' : '.');
        ekstra.hidden = false;
      } else {
        ekstra.textContent = '';
        ekstra.hidden = true;
      }
    }
  }

  /* Baglokalets tomme billedplads. Reglen bor i
     js/skal/billedplads.js — forsiden og tapassiden har den samme
     kasse, og tre kopier ville tegne tre forskellige flader.

     ⚠️ OG DEN SKAL OP, OGSÅ NÅR HENTNINGEN FEJLER. Fladen har
     ingen data bag sig; tegnet står i HTML'en. Lod vi den stå i
     .catch, ville en side, hvor databasen er nede, være den side
     med en stiplet grå kasse øverst. */
  function fyldPladser(d) {
    if (!window.MosedeBilledplads) return;
    try {
      window.MosedeBilledplads.fyld((d && d.indstillinger) || {});
    } catch (e) {
      console.warn('Billedpladsen fejlede:', e);
    }
  }

  Butik.hent().then(function (d) {
    data = d;
    visVilkaar(d);
    fyldPladser(d);
    return Butik.hentOptagneDage();
  }).then(function (liste) {
    optagne = liste || [];
    tjekDato();
    kalStart();
  }).catch(function (fejl) {
    console.warn('Forespørgselssidens kobling fejlede, skallen står:', fejl);
    fyldPladser(null);
  });
}());
