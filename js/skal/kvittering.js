/* ============================================================
   KVITTERINGEN — ÉN BYGGER TIL ALLE NI STEDER  (4. sep 2026)
   ------------------------------------------------------------
   Kundens ord: *"kan vi få animationen og kvitteringen til at
   være bedre og dermed få den slags animation og kvittering alle
   steder man bestiller."*

   Der var SEKS kvitteringer i koden med hver sin form:

     js/skal/bestil.js        forsiden, h-smorrebrod, (m-tapas)
     js/bestilling.js         bestil/, ved-bordet/
     js/bord.js               bord/
     js/skal/forespoergsel.js selskaber, catering, frokost, baglokale
     js/skal/kalender.js      arrangementsreservationen

   De sagde det samme og så forskellige ud, og hver rettelse
   skulle laves seks gange. Nu bygges de af den her fil, og
   stilen står i css/kvittering.css. Skal kvitteringen laves om,
   er det ét sted.

   ⚠️ FILEN VED INTET OM FORRETNINGEN. Den kender ikke bestillinger,
   borde eller forespørgsler — den får en overskrift, en sætning,
   en kode og nogle linjer. Vidste den, hvad en bestilling var,
   ville den skulle rettes hver gang en tabel fik en kolonne, og
   så var vi tilbage ved seks udgaver.

   ⚠️ OG DEN KASTER IKKE. En kvittering, der fejler, er en gæst,
   der ikke ved, om maden er bestilt — og rækken ER gemt på det
   tidspunkt, den bygges. Hvert opslag er derfor garderet.
   ============================================================ */

(function () {
  'use strict';

  var SVG = 'http://www.w3.org/2000/svg';

  function lav(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = tekst;
    return e;
  }

  /* Hakket, der tegner sig selv. Ren SVG og ren CSS — et
     bibliotek til ét hak ville være 30 kB på en side, der i
     forvejen kun henter 319 kB, og gæsten sidder på havnens net
     med to streger. */
  function hakket() {
    var s = document.createElementNS(SVG, 'svg');
    s.setAttribute('class', 'kvit-hak');
    s.setAttribute('viewBox', '0 0 52 52');
    s.setAttribute('aria-hidden', 'true');
    var ring = document.createElementNS(SVG, 'circle');
    ring.setAttribute('class', 'kvit-ring');
    ring.setAttribute('cx', '26');
    ring.setAttribute('cy', '26');
    ring.setAttribute('r', '24');
    var streg = document.createElementNS(SVG, 'path');
    streg.setAttribute('class', 'kvit-streg');
    streg.setAttribute('d', 'M15 27l8 8 15-16');
    s.appendChild(ring);
    s.appendChild(streg);
    return s;
  }

  function trin(el, nr) {
    el.classList.add('kvit-trin', 'kvit-trin-' + nr);
    return el;
  }

  /* ---- KODEBOKSEN --------------------------------------------

     ⚠️ ÉT TAL, IKKE TO KODER. Kundens spørgsmål til den gamle
     udgave: *"hvad er referance?"* Han har bygget systemet — kunne
     HAN ikke se, hvad den var til, kan gæsten ikke.

     Referencen er rækkens nøgle: lavet i gæstens browser, unik
     uden at spørge nogen, og den står i gamle mails. Nummeret er
     dét, øjne og telefoner bruger. Kommer nummeret, står det
     ALENE — referencen er så en kode mere at læse forkert.

     Kommer det ikke (filen ikke kørt, nettet væk), eller findes
     der slet ikke et nummer (en forespørgsel har kun sin
     reference), træder referencen frem som det store. Så er der
     altid ÉN ting at sige, aldrig to og aldrig nul. */
  function kodeboks(o) {
    var boks = lav('div', 'kvit-nr');
    boks.appendChild(lav('span', 'kvit-nr-navn', o.navn || 'Bestillingsnummer'));
    var tal = lav('b', 'kvit-nr-tal', '');
    boks.appendChild(tal);
    /* ⚠️ ORDET STÅR I DOM'EN, IKKE I ET ::before  (4/9).
       Første udgave satte "Reference " på med CSS. Det så rigtigt
       ud på et skud — og var usynligt for textContent, altså for
       enhver prøve, og upålideligt for en skærmlæser. Husets egen
       regel: læs det, browseren GØR. Et ord, der kun findes i et
       stilark, er ikke et ord på siden. */
    var ref = lav('span', 'kvit-nr-ref');
    var mrk = lav('span', 'kvit-nr-mrk', 'Reference');
    ref.appendChild(mrk);
    ref.appendChild(document.createTextNode(o.reference || ''));
    boks.appendChild(ref);

    function udenNummer() {
      boks.classList.add('kvit-nr-tom');
      boks.querySelector('.kvit-nr-navn').textContent = o.refNavn || 'Reference';
      /* Overskriften siger det allerede — to gange "Reference"
         over hinanden er en kode, der ser ud som to. */
      if (mrk.parentNode) mrk.parentNode.removeChild(mrk);
    }

    if (!o.nummer) { udenNummer(); return boks; }

    /* Nummeret hentes EFTER kvitteringen står der: gæsten skal
       ikke vente på nettet for at få at vide, at maden er
       bestilt. */
    try {
      Promise.resolve(o.nummer()).then(function (n) {
        if (n) tal.textContent = n;
        else udenNummer();
      }).catch(udenNummer);
    } catch (e) { udenNummer(); }
    return boks;
  }

  /* ---- LINJERNE ----------------------------------------------
     [{ navn, vaerdi }] — og { fed: true } på totalen. Filen
     regner ikke: den, der kender bestillingen, kender også dens
     sum. En kvittering, der lagde tal sammen på egen hånd, ville
     være en anden sandhed end kurven. */
  function listen(linjer) {
    var boks = lav('div', 'kvit-liste');
    linjer.forEach(function (l) {
      if (!l || (!l.navn && !l.vaerdi)) return;
      var r = lav('div', 'kvit-linje' + (l.fed ? ' kvit-total' : ''));
      r.appendChild(lav('span', 'kvit-l-navn', l.navn || ''));
      r.appendChild(lav(l.fed ? 'b' : 'span', 'kvit-l-pris',
        l.vaerdi === undefined || l.vaerdi === null ? '' : String(l.vaerdi)));
      boks.appendChild(r);
    });
    return boks;
  }

  /* ---- BYGGEREN ----------------------------------------------
     byg(boks, {
       titel      "Tak, Sara."
       besked     sætningen under
       kode       { navn, reference, nummer:fn, refNavn }
       linjer     [{ navn, vaerdi, fed }]
       fine       den lille tekst nederst
       ekstra     [element] — det, kun én side har (mailknappen)
     })

     ⚠️ BOKSEN TØMMES HER, IKKE UDE. Gjorde hver side det selv,
     ville den, der glemte det, få to kvitteringer oven i
     hinanden — og det ville se ud som en dobbeltbestilling. */
  function byg(boks, o) {
    if (!boks) return;
    while (boks.firstChild) boks.removeChild(boks.firstChild);
    o = o || {};

    var k = lav('div', 'kvit-tak');
    k.appendChild(hakket());
    if (o.titel) k.appendChild(trin(lav('h3', 'kvit-titel', o.titel), 1));
    if (o.besked) k.appendChild(trin(lav('p', 'hint kvit-hint', o.besked), 2));
    if (o.kode) k.appendChild(trin(kodeboks(o.kode), 3));
    if (o.linjer && o.linjer.length) k.appendChild(trin(listen(o.linjer), 4));
    (o.ekstra || []).forEach(function (e) { if (e) k.appendChild(trin(e, 4)); });
    if (o.fine) k.appendChild(trin(lav('p', 'fine kvit-fine', o.fine), 4));

    boks.appendChild(k);

    /* ⚠️ 'start' OG IKKE 'center'. MÅLT 4/9: med center lå hakket
       — det første, gæsten skal se — halvt bag den faste
       topbjælke, fordi kvitteringen er høj. 'start' respekterer
       #sc's scroll-padding-top. */
    try { boks.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (e) { /* en browser uden options er ikke en fejl */ }
    return k;
  }

  window.MosedeKvittering = { byg: byg, lav: lav };
}());
