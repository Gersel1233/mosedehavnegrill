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
  function tegn(beholder, efter, tidligere) {
    if (!beholder) return;
    var gammel = beholder.querySelector('.tidligere');
    if (gammel) gammel.parentNode.removeChild(gammel);
    tidligere = tidligere || [];
    if (!tidligere.length && !PLAKATER.length) return;

    var TEGN = (window.Butik && window.Butik.NYHED_TEGN) || {};

    var fold = lav('details', 'tidligere');
    var titel = lav('summary', null, 'Tidligere på havnen ');
    titel.appendChild(lav('span', 'antal', '(' + (tidligere.length + PLAKATER.length) + ')'));
    fold.appendChild(titel);

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

  window.MosedeTidligere = { PLAKATER: PLAKATER, tegn: tegn, visPlakat: visPlakat };
}());
