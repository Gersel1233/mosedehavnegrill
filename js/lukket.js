/* ============================================================
   «VI HOLDER LUKKET» — ÉT KORT, ALLE SIDER  (18/10)
   ------------------------------------------------------------
   Mikkels ord, med et skud af et lukkekort fra en anden side:
   *"at de har efterårsferie, og så at man ligesom ikke har kunne
   bestille, men man kan skrive, og så linken til mail … Det skal
   være nemt tilgængeligt. De skal vide præcis, hvordan man gør …
   og se rigtig, rigtig godt"*.

   MÅLT FØR (skud 18/10, efterårsferie lagt ind, telefon og
   computer): en lille pille «Lukket i dag · Efterårsferie» i heroen
   og et mørkt bånd med beskeden. Ingen periode, intet om hvornår
   der er åbent igen, intet om at man kan forudbestille, ingen vej
   til at skrive — og bestillingsafsnittet længere nede så ud, som
   om alt var normalt.

   Kortet siger det hele ét sted: hvornår der er lukket, hvorfor,
   hvornår vi er tilbage, at man kan forudbestille fra den dag, at
   forespørgsler kan sendes — og to knapper: Skriv til os (mail) og
   Kontakt os.

   ⚠️ KILDEN ER KALENDEREN, IKKE ET NYT FELT. Personalet lægger en
   «Lukkedag» i Kalenderen med fra/til (afledLukkedage i store.js)
   — eller slår «Lukket for sæsonen» til. Kortet finder selv frem
   til det og forsvinder selv bagefter. Ingen skal huske at slukke
   noget.
   ⚠️ «VI ER TILBAGE» REGNES, DEN SKRIVES IKKE. Første dag efter
   lukningen, hvor ugeplanen har åbent og ingen anden lukning
   dækker. En dato, personalet selv skulle skrive, ville stå forkert
   den dag, ugeplanen blev ændret.
   ⚠️ KUN DET, DER ER SANDT. «Forudbestil gerne» står kun, når
   bestillingen er slået til; vi lover ikke svar inden for en tid
   — forespørgslerne KAN sendes, det er alt, kortet siger.
   ⚠️ textContent, aldrig innerHTML: titlen og beskeden er
   personalets frie tekst (samme regel som js/dagsbesked.js).
   ⚠️ Kortet bygges her og ikke i fem HTML-filer — og admin bruger
   den samme byg() til sin forhåndsvisning, så det, personalet ser,
   er det, gæsten får.
   ============================================================ */
(function () {
  'use strict';

  var UGE = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
  var MDR = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli',
    'august', 'september', 'oktober', 'november', 'december'];
  /* Hvor tidligt en ferie varsles på siden. En flerdages lukning står
     en uge i forvejen, så en gæst, der planlægger lørdag, ser den. En
     enkelt lukket dag står kun på dagen — en uge med et kort om én dag
     ville fylde mere end dagen selv. */
  var VARSEL_DAGE = 7;

  function dato(iso) { return new Date(String(iso).slice(0, 10) + 'T12:00:00Z'); }
  function plus(iso, n) {
    var t = dato(iso);
    t.setUTCDate(t.getUTCDate() + n);
    return t.toISOString().slice(0, 10);
  }
  /* "mandag d. 19. oktober" */
  function dagOgDato(iso) {
    var t = dato(iso);
    return UGE[t.getUTCDay()] + ' d. ' + t.getUTCDate() + '. ' + MDR[t.getUTCMonth()];
  }
  /* "12.–18. oktober" / "30. september – 4. oktober" / "lørdag d. 12. oktober" */
  function periode(fra, til) {
    if (!til || til === fra) return dagOgDato(fra).replace(/^./, function (c) { return c.toUpperCase(); });
    var a = dato(fra), b = dato(til);
    if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
      return a.getUTCDate() + '.–' + b.getUTCDate() + '. ' + MDR[b.getUTCMonth()];
    }
    return a.getUTCDate() + '. ' + MDR[a.getUTCMonth()] + ' – ' + b.getUTCDate() + '. ' + MDR[b.getUTCMonth()];
  }
  function lukketDen(d, iso) {
    var liste = (d && d.lukkedage) || [];
    for (var i = 0; i < liste.length; i++) {
      var l = liste[i];
      if (l && l.dato && iso >= l.dato && iso <= (l.slut_dato || l.dato)) return l;
    }
    return null;
  }
  /* Første dag efter `til`, hvor ugeplanen har åbent og ingen lukning
     dækker. 60 dage frem — findes ingen, siger kortet det ikke. */
  function tilbage(d, til) {
    for (var n = 1; n <= 60; n++) {
      var iso = plus(til, n);
      if (lukketDen(d, iso)) continue;
      var ugedag = (dato(iso).getUTCDay() + 6) % 7;   // 0 = mandag, som aabningstider
      var plan = ((d && d.aabningstider) || []).filter(function (a) { return a.ugedag === ugedag; })[0];
      if (!plan || plan.lukket) continue;
      return iso;
    }
    return null;
  }

  /* Hvilken lukning skal kortet sige — eller ingen. */
  function find(d, iDag) {
    if (!d) return null;
    var i = d.indstillinger || {};
    var saeson = i.saeson || {};
    if (saeson.lukket) {
      return { slags: 'saeson', titel: 'Lukket for sæsonen', besked: String(saeson.besked || '').trim(),
        aabnerIgen: String(saeson.aabner_igen || '').trim(), emoji: '' };
    }
    var nu = lukketDen(d, iDag);
    var l = nu, slags = 'nu';
    if (!l) {
      slags = 'snart';
      var graense = plus(iDag, VARSEL_DAGE);
      ((d && d.lukkedage) || []).forEach(function (k) {
        if (!k || !k.dato || k.dato <= iDag || k.dato > graense) return;
        if (!k.slut_dato || k.slut_dato === k.dato) return;   // én dag: kun på dagen
        if (!l || k.dato < l.dato) l = k;
      });
    }
    if (!l) return null;
    /* To lukninger dør om dør er én lukning for gæsten: "18. oktober",
       og så en ny række fra den 19., ville sige "tilbage 19." forkert. */
    var til = l.slut_dato || l.dato;
    for (var g = 0; g < 10; g++) {
      var naeste = lukketDen(d, plus(til, 1));
      if (!naeste) break;
      til = naeste.slut_dato || naeste.dato;
    }
    return { slags: slags, fra: l.dato, til: til, titel: String(l.aarsag || '').trim(),
      besked: String(l.besked || '').trim(), emoji: String(l.emoji || '').trim(),
      tilbage: tilbage(d, til) };
  }

  function lav(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = tekst;
    return e;
  }
  function ikon(ikoner, navn) {
    var NS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'lukket-ikon');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('viewBox', '0 0 24 24');
    var u = document.createElementNS(NS, 'use');
    u.setAttribute('href', (ikoner || 'ikoner.svg') + '#' + navn);
    s.appendChild(u);
    return s;
  }

  /* Kortet som element. `valg`: ikoner (stien til ikoner.svg),
     kontakt (hvor «Kontakt os» peger hen), bestil (hvor
     forudbestillingen peger hen; tom = linjen er tekst), email,
     bestilling (false = bestillingen er slået fra). */
  function byg(info, valg) {
    valg = valg || {};
    var kort = lav('div', 'lukket-ind');
    kort.setAttribute('data-slags', info.slags);

    var hoved = lav('div', 'lukket-hoved');
    var maerke = lav('span', 'lukket-maerke');
    maerke.setAttribute('aria-hidden', 'true');
    if (info.emoji) maerke.textContent = info.emoji;
    else maerke.appendChild(ikon(valg.ikoner, 'anker'));
    hoved.appendChild(maerke);
    var hv = lav('div', 'lukket-hv');
    hv.appendChild(lav('p', 'lukket-kicker',
      info.slags === 'snart' ? 'Vi holder snart lukket' : 'Vi holder lukket'));
    hv.appendChild(lav('h2', 'lukket-titel',
      info.slags === 'saeson' ? 'For sæsonen' : periode(info.fra, info.til)));
    hoved.appendChild(hv);
    kort.appendChild(hoved);

    if (info.slags !== 'saeson' && info.titel) {
      kort.appendChild(lav('p', 'lukket-hvorfor', info.titel.replace(/[.!]?$/, '.')));
    }
    if (info.besked) kort.appendChild(lav('p', 'lukket-besked', info.besked));

    var igen = info.slags === 'saeson'
      ? (info.aabnerIgen ? 'Vi åbner igen ' + info.aabnerIgen : '')
      : (info.tilbage ? 'Vi er tilbage ' + dagOgDato(info.tilbage) : '');
    if (igen) {
      var p = lav('p', 'lukket-tilbage');
      /* ⚠️ HJERTET FØLGER SIDSTE ORD. Et hårdt mellemrum holdt det ikke
         fast — målt på et skud 18/10: på en telefon (390 px) fyldte
         "Vi er tilbage mandag d. 10. august" linjen præcis, og hjertet
         stod alene på næste. Sidste ord og hjertet står i ét spænd,
         der ikke må knække (.lukket-hale). */
      /* Og datoen knækker ikke midt i: "mandag d. 10." / "august" (næste
         skud). Hele datoen står i spændet; sæsonens frie tekst kan være
         lang, så dér er det kun det sidste ord. */
      var hel = info.slags !== 'saeson' && info.tilbage ? dagOgDato(info.tilbage) : '';
      var sidst = hel ? igen.length - hel.length - 1 : igen.lastIndexOf(' ');
      p.appendChild(document.createTextNode(igen.slice(0, sidst + 1)));
      var hale = lav('span', 'lukket-hale', igen.slice(sidst + 1) + '\u00a0');
      hale.appendChild(ikon(valg.ikoner, 'hjerte'));
      p.appendChild(hale);
      kort.appendChild(p);
    }
    if (info.slags === 'snart') {
      kort.appendChild(lav('p', 'lukket-besked', 'Indtil da har vi åbent som altid.'));
    }

    var punkter = lav('ul', 'lukket-punkter');
    if (valg.bestilling !== false && info.slags !== 'saeson' && info.tilbage) {
      var li = lav('li', 'lukket-punkt lukket-bestil');
      li.appendChild(ikon(valg.ikoner, 'kurv'));
      var tekst = info.slags === 'snart'
        ? 'Bestil som altid frem til lukningen — og igen fra ' + dagOgDato(info.tilbage) + '.'
        : 'Forudbestil gerne allerede nu — vælg en dag fra ' + dagOgDato(info.tilbage) + '.';
      if (valg.bestil) {
        var a = lav('a', null, tekst);
        a.href = valg.bestil;
        li.appendChild(a);
      } else li.appendChild(lav('span', null, tekst));
      punkter.appendChild(li);
    }
    var li2 = lav('li', 'lukket-punkt');
    li2.appendChild(ikon(valg.ikoner, 'besked'));
    li2.appendChild(lav('span', null, 'Forespørgsler om selskaber og catering kan sendes som altid.'));
    punkter.appendChild(li2);
    kort.appendChild(punkter);

    var knapper = lav('div', 'lukket-knapper');
    var email = valg.email === undefined ? 'kontakt@mosedehavnecafe.dk' : String(valg.email || '').trim();
    if (email) {
      var skriv = lav('a', 'lukket-knap lukket-knap-hoved', 'Skriv til os');
      skriv.href = 'mailto:' + email + '?subject=' + encodeURIComponent('Spørgsmål til Mosede Havnecafe');
      skriv.setAttribute('data-lukket-mail', email);
      knapper.appendChild(skriv);
    }
    var kontakt = lav('a', 'lukket-knap', 'Kontakt os');
    kontakt.href = valg.kontakt || 'index.html#find';
    knapper.appendChild(kontakt);
    kort.appendChild(knapper);
    return kort;
  }

  /* Pillen i forsidens hero (18/10), der peger ned til kortet. Heroen
     fylder hele skærmen — uden pillen var kortet ude af syne, og ugen
     før en ferie sagde heroen bare «Åbent nu». Det vigtigste står på
     den: hvornår vi er tilbage (eller hvornår ferien er). */
  function pil(info) {
    var a = document.querySelector('[data-lukket-pil]');
    if (!a) return;
    while (a.firstChild) a.removeChild(a.firstChild);
    if (!info) { a.hidden = true; return; }
    var maerke, tekst;
    if (info.slags === 'saeson') {
      maerke = 'Lukket';
      tekst = info.aabnerIgen ? 'Vi åbner igen ' + info.aabnerIgen : 'for sæsonen';
    } else if (info.slags === 'snart') {
      maerke = 'Snart lukket';
      tekst = periode(info.fra, info.til);
    } else {
      maerke = 'Lukket';
      tekst = info.tilbage ? 'Tilbage ' + dagOgDato(info.tilbage) : periode(info.fra, info.til);
    }
    a.appendChild(lav('b', null, maerke));
    a.appendChild(document.createTextNode(tekst));
    var i = lav('i', null, '↓');
    i.setAttribute('aria-hidden', 'true');
    a.appendChild(i);
    a.hidden = false;
  }

  /* Siden: et tomt <section id="lukket-kort" hidden> med data-
     attributterne, og et kald, når data er hjemme. Kaldes det to
     gange (forsiden har to scripts, der henter), tegnes det om. */
  function vis(d) {
    var rod = document.getElementById('lukket-kort');
    if (!rod) return;
    try {
      var iDag = (window.Butik && Butik.nu) ? Butik.nu().dato : new Date().toISOString().slice(0, 10);
      var info = find(d, iDag);
      while (rod.firstChild) rod.removeChild(rod.firstChild);
      pil(info);
      if (!info) { rod.hidden = true; return; }
      var i = (d && d.indstillinger) || {};
      var fast = (window.MOSEDE && window.MOSEDE.email) || 'kontakt@mosedehavnecafe.dk';
      rod.appendChild(byg(info, {
        ikoner: rod.getAttribute('data-ikoner') || 'ikoner.svg',
        kontakt: rod.getAttribute('data-kontakt') || 'index.html#find',
        bestil: rod.getAttribute('data-bestil') || '',
        /* Admin → Kontakt: sat til tomt = adressen findes ikke mere,
           og så er der ingen mailknap (samme regel som js/skal/kontakt.js). */
        email: i.kontakt_email === undefined || i.kontakt_email === null ? fast : i.kontakt_email,
        bestilling: i.bestilling_aaben !== false,
      }));
      rod.hidden = false;
    } catch (e) {
      /* Et kort, der ikke kan tegnes, må ikke tage siden med sig —
         og pillen må ikke pege ned til ingenting. */
      rod.hidden = true;
      var p = document.querySelector('[data-lukket-pil]');
      if (p) p.hidden = true;
      if (window.console) console.warn('Lukkekortet kunne ikke tegnes:', e);
    }
  }

  window.MosedeLukket = { find: find, byg: byg, vis: vis, tilbage: tilbage, periode: periode, dagOgDato: dagOgDato };
})();
