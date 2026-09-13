/* ============================================================
   TIDLIGERE PÅ HAVNEN — ÉT ARKIV, TO STEDER  (12/9 · 13/9)
   ------------------------------------------------------------
   Kundens ord 12/9: "de gad godt, at man kunne gå ind og se
   tidligere sådan ting, der har været nede på havnen." Og 13/9:
   "den der med tidligere ting skal hænge sammen med hvad sker
   der."

   Folden stod kun under forsidens nyheder. Kalendersiden — den,
   der hedder "Hvad sker der" — havde ingen vej til det, der HAR
   været. Nu tegner begge sider den samme fold ud fra denne fil,
   og HVILKE nyheder der er "tidligere", afgør én regel:
   Butik.tidligereNyheder (js/store.js). To kopier ville
   langsomt vise to forskellige arkiver.

   ⚠️ ALTID LUKKET. En lukket <details> tegner ikke sit indhold,
   så loading="lazy" venter, til nogen trykker — forsidens
   fartprøve forbyder fotos, før gæsten har rullet.
   ============================================================ */
(function () {
  'use strict';

  var MÅNEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december'];

  /* "20. juli" — den samme form som nyhedskortenes dato. */
  function dato(iso) {
    if (!iso) return '';
    var d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z');
    if (isNaN(d.getTime())) return '';
    return d.getUTCDate() + '. ' + MÅNEDER[d.getUTCMonth()];
  }

  /* ⚠️ HAVNENS EGNE PLAKATER FRA DET, DER HAR VÆRET (12/9). Kunden
     lagde dem i Desktop/arrengement. De står i repoet
     (billeder/tidligere/), ikke i databasen — det er historie, og
     et nyt arrangement kommer herind af sig selv, når dets nyhed
     udløber i admin.

     ⚠️ DATOEN ER PLAKATENS EGEN, ORDRET. Kun Jens Rasmussen har en
     hel dato; Søren Borres siger "lørdag d. 29." uden måned, og de
     tre andre har ingen. "Opfind ikke svaret."

     ⚠️ TILBUDSPRISERNE STÅR KUN PÅ PLAKATEN. Skrevet ud her ville
     de læses som priser nu. */
  var PLAKATER = [
    { fil: 'jens-rasmussen', titel: 'Live musik med Jens Rasmussen',
      naar: 'Lørdag 5. september · kl. 13',
      tekst: 'Live musik på havnen — og happy hour på fadøl og drinks.' },
    { fil: 'soeren-borre', titel: 'Søren Borre',
      naar: 'Lørdag d. 29. · kl. 13–16',
      tekst: 'Søren Spillemands kærlighedsshow med de store hits og de største klassikere.' },
    { fil: 'shony', titel: 'Live musik med Shony',
      naar: 'Lørdag · kl. 13–16',
      tekst: 'God og hyggelig musik på havnen.' },
    { fil: 'fredagsbar', titel: 'Fredagsbar med DJ Sten Ibka',
      naar: 'Fredag · fra kl. 17',
      tekst: 'Live DJ og happy hour på fadøl — så længe der var gang i festen.' },
    { fil: 'afterbeat', titel: 'Hyggelig dag på havnen med AfterBeat',
      naar: 'Jazz på havnen',
      tekst: 'Jazz, smørrebrød og kolde øl.' },
  ];

  function lav(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined) e.textContent = tekst;
    return e;
  }

  /* Folden sættes ind lige EFTER `efter` i `beholder` — under
     nyhedslisten på forsiden, under arrangementerne på kalendersiden.
     Udløbne nyheder først (de har en rigtig dato), plakaterne under. */
  function tegn(beholder, efter, tidligere, arrangementer) {
    if (!beholder) return;
    var gammel = beholder.querySelector('.tidligere');
    if (gammel) gammel.parentNode.removeChild(gammel);
    tidligere = tidligere || [];
    arrangementer = arrangementer || [];
    if (!tidligere.length && !arrangementer.length && !PLAKATER.length) return;

    var TEGN = (window.Butik && window.Butik.NYHED_TEGN) || {};

    var fold = lav('details', 'tidligere');
    var titel = lav('summary', null, 'Tidligere på havnen ');
    titel.appendChild(lav('span', 'antal', '(' + (arrangementer.length + tidligere.length + PLAKATER.length) + ')'));
    fold.appendChild(titel);

    /* ⚠️ ARRANGEMENTERNE FØRST  (13/9). Det er dem, gæsten har
       reserveret til og mødt op til — og de har en rigtig dato og et
       klokkeslæt. Se Butik.tidligereArrangementer: et arrangement
       glider herned af sig selv, dagen efter det har været. */
    arrangementer.forEach(function (k) {
      var r = lav('div', 'tidl');
      r.setAttribute('data-kilde', 'arrangement');
      r.setAttribute('data-kalender', String(k.id));
      var url = String(k.billede || '').trim();
      if (url) {
        var foto = lav('img', 'tidl-foto');
        foto.src = url;
        foto.alt = '';
        foto.loading = 'lazy';
        foto.decoding = 'async';
        r.appendChild(foto);
      } else {
        var felt = lav('div', 'tidl-felt s-begivenhed',
          k.emoji || TEGN.begivenhed || TEGN.andet || '');
        felt.setAttribute('aria-hidden', 'true');
        r.appendChild(felt);
      }
      var tekst = lav('div');
      tekst.appendChild(lav('div', 'when', naarTekst(k)));
      tekst.appendChild(lav('h4', null, k.titel || ''));
      var b = String(k.beskrivelse || '').trim();
      if (b) tekst.appendChild(lav('p', null, b));
      r.appendChild(tekst);
      aabnbar(r, tekst, function () {
        return { billede: url, naar: naarTekst(k), titel: k.titel, tekst: b, kalender: k };
      });
      fold.appendChild(r);
    });

    tidligere.forEach(function (n) {
      var r = lav('div', 'tidl');
      r.setAttribute('data-kilde', 'nyhed');
      if (n.billede) {
        var foto = lav('img', 'tidl-foto');
        foto.src = n.billede;
        foto.alt = '';
        foto.loading = 'lazy';
        foto.decoding = 'async';
        r.appendChild(foto);
      } else {
        var slags = n.slags || 'andet';
        var felt = lav('div', 'tidl-felt s-' + slags, TEGN[slags] || TEGN.andet || '');
        felt.setAttribute('aria-hidden', 'true');
        r.appendChild(felt);
      }
      var tekst = lav('div');
      tekst.appendChild(lav('div', 'when', dato(n.dato || n.vis_til)));
      tekst.appendChild(lav('h4', null, n.titel || ''));
      if (n.tekst) tekst.appendChild(lav('p', null, n.tekst));
      r.appendChild(tekst);
      aabnbar(r, tekst, function () {
        return { billede: n.billede, naar: dato(n.dato || n.vis_til), titel: n.titel, tekst: n.tekst };
      });
      fold.appendChild(r);
    });

    PLAKATER.forEach(function (p) {
      var r = lav('div', 'tidl');
      r.setAttribute('data-kilde', 'plakat');
      /* Knappen bærer navnet, så billedet indeni kan være dekorativt.
         I 64 px kan ingen læse en plakat — et tryk viser den stor. */
      var knap = lav('button', 'tidl-plakat');
      knap.type = 'button';
      knap.setAttribute('aria-label', 'Se plakaten: ' + p.titel);
      var lille = lav('img');
      lille.src = 'billeder/tidligere/' + p.fil + '-lille.jpg';
      lille.alt = '';
      lille.loading = 'lazy';
      lille.decoding = 'async';
      knap.appendChild(lille);
      knap.addEventListener('click', function () { visPlakat(p); });
      r.appendChild(knap);

      var tekst = lav('div');
      tekst.appendChild(lav('div', 'when', p.naar));
      tekst.appendChild(lav('h4', null, p.titel));
      tekst.appendChild(lav('p', null, p.tekst));
      r.appendChild(tekst);
      fold.appendChild(r);
    });

    if (efter && efter.parentNode === beholder && efter.nextSibling) {
      beholder.insertBefore(fold, efter.nextSibling);
    } else {
      beholder.appendChild(fold);
    }
  }

  /* "Lørdag 1. august · kl. 13.00" — dagen og, hvis ejeren har skrevet
     det, klokkeslættet. Butik.klokken er husets ENE form (punktum). */
  function naarTekst(k) {
    var kl = k.start_kl
      ? ' · kl. ' + (window.Butik && window.Butik.klokken
        ? window.Butik.klokken(String(k.start_kl).slice(0, 5))
        : String(k.start_kl).slice(0, 5))
      : '';
    return dato(k.dato) + kl;
  }

  /* ⚠️ ARKIVET KAN ÅBNES  (13/9). Kundens ord: "man kan ikke klikke
     ind på dem for eventuelt at læse mere". Hele rækken er knappen —
     som arrangementkortene på kalendersiden (30/8) — og den bærer
     "Læs mere", så det kan ses, at der er mere at læse. */
  function aabnbar(r, tekst, info) {
    r.classList.add('tidl-klik');
    r.setAttribute('role', 'button');
    r.setAttribute('tabindex', '0');
    tekst.appendChild(lav('span', 'tidl-mere', 'Læs mere ›'));
    function aabn() { visDetalje(info()); }
    r.addEventListener('click', aabn);
    r.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aabn(); }
    });
  }

  /* Ét <dialog> til det hele, genbrugt — som plakatens. Escape og et
     tryk ved siden af lukker. */
  function visDetalje(info) {
    var v = document.getElementById('tidl-vindue');
    if (!v) {
      v = lav('dialog', 'tidl-vindue');
      v.id = 'tidl-vindue';
      v.setAttribute('aria-labelledby', 'tidl-vindue-titel');
      var luk = lav('button', 'plakat-luk', '✕');
      luk.type = 'button';
      luk.setAttribute('aria-label', 'Luk');
      luk.addEventListener('click', function () { v.close(); });
      v.addEventListener('click', function (e) { if (e.target === v) v.close(); });
      v.appendChild(luk);
      var img = lav('img', 'tidl-vindue-foto');
      img.alt = '';
      v.appendChild(img);
      var ind = lav('div', 'ind');
      ind.appendChild(lav('div', 'when'));
      var h = lav('h3');
      h.id = 'tidl-vindue-titel';
      ind.appendChild(h);
      ind.appendChild(lav('p', 'tekst'));
      ind.appendChild(lav('p', 'stat'));
      v.appendChild(ind);
      document.body.appendChild(v);
    }
    var foto = v.querySelector('.tidl-vindue-foto');
    var url = String(info.billede || '').trim();
    foto.style.display = url ? '' : 'none';
    if (url) { foto.src = url; foto.alt = info.titel || ''; } else { foto.removeAttribute('src'); }
    v.querySelector('.when').textContent = info.naar || '';
    v.querySelector('h3').textContent = info.titel || '';
    var t = v.querySelector('.tekst');
    t.textContent = info.tekst || '';
    t.style.display = info.tekst ? '' : 'none';
    var s = v.querySelector('.stat');
    s.textContent = '';
    s.style.display = 'none';

    /* ⚠️ TALLET ER DATABASENS OG HENTES FØRST, NÅR NOGEN ÅBNER (13/9).
       arrangement_pladser tæller de reserverede pladser uden at vise,
       HVEM der har taget dem, og den har ingen datogrænse — et
       overstået arrangement har stadig sit tal. Hentet ved hver
       sidevisning ville det være et kald, ingen havde bedt om.
       ⚠️ INGEN OPFUNDNE TAL: uden tilmelding, eller uden én
       reservation, står der ingenting. */
    var k = info.kalender;
    if (k && k.tilmelding && window.Butik && window.Butik.hentPladser) {
      window.Butik.hentPladser().then(function (p) {
        var x = (p || {})[k.id];
        var n = x ? Number(x.optaget) || 0 : 0;
        if (!n || v.querySelector('h3').textContent !== (info.titel || '')) return;
        s.textContent = n + (n === 1 ? ' reserveret plads' : ' reserverede pladser');
        s.style.display = '';
      }).catch(function () { /* så står der bare ikke et tal */ });
    }
    if (typeof v.showModal !== 'function') return;
    if (!v.open) v.showModal();
  }

  /* Plakaten i fuld størrelse. Ét <dialog>, der genbruges: Escape og
     et tryk ved siden af lukker den. Uden showModal (meget gamle
     browsere) åbnes billedet i sig selv i stedet for ingenting. */
  function visPlakat(p) {
    var stor = 'billeder/tidligere/' + p.fil + '.jpg';
    var v = document.getElementById('plakat-vindue');
    if (!v) {
      v = lav('dialog', 'plakat-vindue');
      v.id = 'plakat-vindue';
      var luk = lav('button', 'plakat-luk', '✕');
      luk.type = 'button';
      luk.setAttribute('aria-label', 'Luk plakaten');
      luk.addEventListener('click', function () { v.close(); });
      v.addEventListener('click', function (e) { if (e.target === v) v.close(); });
      v.appendChild(luk);
      v.appendChild(lav('img', 'plakat-stor'));
      document.body.appendChild(v);
    }
    if (typeof v.showModal !== 'function') { window.open(stor, '_blank'); return; }
    var billede = v.querySelector('.plakat-stor');
    billede.src = stor;
    billede.alt = 'Plakaten: ' + p.titel;
    v.showModal();
  }

  window.MosedeTidligere = { PLAKATER: PLAKATER, tegn: tegn, visPlakat: visPlakat, visDetalje: visDetalje };
}());
