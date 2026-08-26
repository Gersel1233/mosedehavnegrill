/* ============================================================
   VED BORDET – siden bag QR-koden på mærkatet

   Gæsten sidder ved bord 7 og scanner. Hun skal se lugens kort,
   vælge, og trykke send — og bestillingen skal lande i køkkenets
   overblik med BORDET på.

   Filen her er søsteren til js/bestil.js: den gør det, der
   omgiver formularen, og lader js/bestilling.js om selve
   bestillingen. Der er ét bestillingsmodul i huset, og det her
   er dets tredje sted.

   ------------------------------------------------------------
   FIRE TILSTANDE, OG DE ER IKKE DEN SAMME FEJL
   ------------------------------------------------------------
   1) Adressen siger et bord, der findes  → formularen, med
      bordet skrevet ind i den.
   2) Adressen siger ingenting, eller et bord vi ikke kender →
      vi spørger hvilket bord. Et mærkat kan være flyttet, et
      bord nedlagt, og en gæst kan have skrevet adressen af.
      En blindgyde med en fejlbesked ville sende hende op til
      lugen for noget, siden selv kan klare.
   3) Der er lukket lige nu → ingen formular. En bestilling til
      et lukket køkken er et løfte, ingen kan holde, og gæsten
      opdager det først, når der ikke kommer noget.
   4) Vi kan ikke hente noget → sig det, og send hende til lugen.
      Den er tyve meter væk; det er hele forskellen på det her og
      en bestilling hjemmefra.

   ------------------------------------------------------------
   BORDET KOMMER FRA LISTEN, IKKE FRA ADRESSEN
   ------------------------------------------------------------
   ?bord=7 er et ØNSKE fra en QR-kode, ikke en sandhed. Nummeret
   slås op i bordlisten, og det er RÆKKENS navn, der skrives i
   formularen — ikke gæstens tekst. Ellers ville "?bord=Bord 7 "
   og "?bord=bord 7" blive til to forskellige borde i køkkenets
   liste, mens det er ét bord på trædækket.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* De hentede data bliver liggende her, fordi formularen først
     startes, NÅR bordet er kendt — og bordet kan blive kendt to
     gange: med det samme fra ?bord=, eller først når gæsten har
     trykket på et bord i vælgeren. To Butik.hent() ville være de
     samme syv tabeller hentet to gange over havnens net. */
  var data = null;
  function tøm(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function lav(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = String(tekst);
    return e;
  }

  function oensketBord() {
    var m = /[?&]bord=([^&]*)/.exec(location.search);
    if (!m) return '';
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim(); }
    catch (e) { return m[1].trim(); }
  }

  function samme(a, b) {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  function visStatus(d) {
    var s = Butik.status(d);
    var tekst = $('bestil-status-tekst');
    if (tekst) tekst.textContent = Butik.pilleTekst(s);
    var prik = document.querySelector('#bestil-status .dot');
    if (prik) prik.classList.toggle('lukket', !s.aaben);
    return s;
  }

  function sigLukket(overskrift, forklaring) {
    var boks = $('bestil-lukket');
    var form = $('bestil-form');
    if (form) form.classList.add('skjult');
    if (!boks) return;
    tøm(boks);
    boks.appendChild(lav('h3', null, overskrift));
    boks.appendChild(lav('p', null, forklaring));
    boks.classList.remove('skjult');
  }

  /* Bordvælgeren. Den bruger de samme knapper som "To-go / Spis
     her" i formularen — det er den samme slags valg, og en gæst,
     der lige har set den ene, skal ikke lære en ny. */
  function visBordvalg(borde, oensket) {
    var boks = $('bord-vaelg');
    var liste = $('bord-liste');
    if (!boks || !liste) return;
    tøm(liste);

    borde.forEach(function (b) {
      var knap = lav('button', 'type-knap');
      knap.type = 'button';
      knap.appendChild(lav('span', 'type-navn', b.nummer));
      if (b.placering === 'ude') knap.appendChild(lav('span', 'type-note', 'ude'));
      knap.addEventListener('click', function () {
        /* Adressen skrives om, så et genbesøg — eller et tryk på
           "opdater" midt i en bestilling — lander det samme sted.
           replaceState og ikke pushState: tilbage-knappen skal
           ikke føre til den side, hvor bordet manglede. */
        if (window.history && history.replaceState) {
          history.replaceState(null, '', '?bord=' + encodeURIComponent(b.nummer));
        }
        boks.classList.add('skjult');
        saetBord(b);
      });
      liste.appendChild(knap);
    });

    var note = $('bord-vaelg-note');
    if (note) {
      note.textContent = oensket
        ? 'Vi kender ikke et bord, der hedder "' + oensket + '". '
          + 'Vælg det, I sidder ved — eller sig det til os ved lugen.'
        : '';
    }
    boks.classList.remove('skjult');
  }

  /* KURVEN ER FÆLLES FOR SIDERNE — samme nøgle i localStorage, så
     gæsten kan skifte side uden at miste sit valg. Ved bordet er
     det farligt: lå der to stykker smørrebrød og tre slags fyld
     fra bestil/ tidligere på dagen, ville de IKKE stå i listen
     her (bordets udvalg er et andet), men de ville tælle med i
     kurvbjælken og køre med i bestillingen. Køkkenet ville lave
     mad, gæsten hverken har set eller bedt om — ved et bord, hvor
     der ikke er en hentetid til at fange det.

     Renses her og ikke i js/bestilling.js: det er bordets regel,
     og motoren er fælles for tre sider. */
  function rensKurv() {
    var NOEGLE = 'mosede_kurv_v1';
    try {
      var raa = localStorage.getItem(NOEGLE);
      if (!raa) return;
      var kurv = JSON.parse(raa);
      if (!kurv || typeof kurv !== 'object' || !kurv.stk) return;

      var kan = {};
      /* Ved bordet er dagen ALTID i dag — der er ingen dagvælger
         (se noten øverst). Så en kategori, der kun laves på
         hverdage, skal også være væk fra bordet om lørdagen. */
      Butik.udvalg(data, 'uden-fyld', Butik.nu().dato)
        .varer.forEach(function (v) { kan[v.navn] = true; });
      var ret = (data.indstillinger || {}).dagens_ret || {};
      if (ret.navn) kan[ret.navn] = true;

      Object.keys(kurv.stk).forEach(function (n) { if (!kan[n]) delete kurv.stk[n]; });
      kurv.fyld = [];          // smørrebrødets byggeri hører til bestil/
      localStorage.setItem(NOEGLE, JSON.stringify(kurv));
    } catch (e) { /* privat browsing: kurven starter bare tom */ }
  }

  /* VENTETIDEN, OG HVORFOR DEN KAN VOKSE
     ------------------------------------------------------------
     Personalet sætter GRUNDTIDEN i admin. Systemet kan lægge til,
     når der er kø — men KUN med et tal, ejeren selv har skrevet
     (bord_ventetid_pr_ordre_min). Fandt vi selv på "tre minutter
     pr. ordre", ville siden love noget på køkkenets vegne, som
     ingen havde sagt. Er tallet ikke sat, står grundtiden alene,
     og det er stadig sandt: det er dét, personalet har skrevet.

     Er der ingen grundtid, står der ingenting. En ventetid på nul
     er et løfte, ikke en tom besked. */
  function visTravlhed(d) {
    var boks = $('bord-travlhed');
    if (!boks) return;

    var i = d.indstillinger || {};
    var grund = Number(i.bord_ventetid_min);
    if (!isFinite(grund)) { boks.classList.add('skjult'); return; }

    Butik.hentTravlhed().then(function (t) {
      var pr = Number(i.bord_ventetid_pr_ordre_min);
      var minutter = grund;
      if (isFinite(pr) && pr > 0 && t.i_koeen > 0) minutter += pr * t.i_koeen;
      if (minutter <= 0) { boks.classList.add('skjult'); return; }

      /* Rundet til nærmeste fem: "ca. 23 minutter" lyder som et
         løfte, der er regnet ud. "Ca. 25" lyder som et skøn, og
         det er dét, det er. */
      minutter = Math.round(minutter / 5) * 5;
      tøm(boks);
      boks.appendChild(lav('span', null, '⏱ Ca. ' + minutter + ' min. ventetid lige nu'));
      boks.classList.remove('skjult');
    }).catch(function () { boks.classList.add('skjult'); });
  }

  function saetBord(bord) {
    var form = $('bestil-form');
    if (!form) return;
    /* RÆKKENS navn, ikke gæstens tekst. Se noten øverst. */
    form.setAttribute('data-bord', bord.nummer);
    form.classList.remove('skjult');

    var eyebrow = $('bord-eyebrow');
    if (eyebrow) eyebrow.textContent = 'Bord ' + bord.nummer;
    var titel = $('bord-titel');
    if (titel) titel.textContent = 'Bestil til bord ' + bord.nummer;
    document.title = 'Bord ' + bord.nummer + ' – Mosede Havnegrill og Ishus';

    rensKurv();
    if (window.MosedeBestilling && data) window.MosedeBestilling.start(data);
  }

  Promise.all([Butik.hent(), Butik.hentBorde()]).then(function (svar) {
    var d = svar[0];
    var borde = (svar[1] || []).filter(function (b) { return b.aktiv !== false; });

    var besked = (d.indstillinger || {}).bestilling_besked || '';
    var bel = $('bestil-besked');
    if (besked && bel) { bel.textContent = besked; bel.classList.remove('skjult'); }

    var s = visStatus(d);

    /* DER SKAL VÆRE BORDE, FØR DER KAN BESTILLES FRA ET.
       Har ejeren ikke oprettet nogen endnu, er hver eneste kode
       en kode til et bord, databasen ikke kender — og så er en
       formular et løfte, afsendelsen ikke kan holde. */
    if (!borde.length) {
      sigLukket('Bordbestilling er ikke sat op endnu',
        'Sig det til os ved lugen, så tager vi bestillingen dér.');
      return;
    }

    /* LUKKET ER LUKKET. Køkkenet laver ikke mad, og en bestilling
       til bord 7 om en time er ikke bedre end ingen bestilling:
       gæsten sidder og venter på noget, der ikke kommer. */
    if (!s.aaben) {
      sigLukket(s.overskrift || 'Vi har lukket nu',
        (s.detalje ? s.detalje + '. ' : '')
        + 'Sig til ved lugen, hvis der er noget, vi kan hjælpe med.');
      return;
    }

    if ((d.indstillinger || {}).bestilling_aaben === false) {
      sigLukket('Vi tager ikke imod bestillinger lige nu',
        'Sig det til os ved lugen, så skriver vi den ned med det samme.');
      return;
    }

    /* KONTAKTEN, DER KUN LUKKER BORDENE.

       Den er en anden end bestilling_aaben ovenfor, og det er
       hele meningen: der kan være åbent for smørrebrød ud af
       huset, mens køkkenet ikke kan nå at servere ved bordene —
       en travl lørdag, eller den dag der er én mand på arbejde.
       Én kontakt til begge dele ville tvinge forretningen til at
       lukke for mad, de sagtens kan lave.

       Standarden er ÅBEN: en kontakt, ingen har rørt, må ikke
       kunne slukke for noget, der virkede i går. */
    /* ⚠️ SPØRGSMÅLET STILLES GENNEM Butik.qrAaben, ikke ved at
       læse nøglen her. Databasens værn læser den samme
       indstilling (supabase/dagsbesked-og-qr.sql), og to steder,
       der staver navnet hver for sig, er to steder at skrive det
       forkert. */
    if (Butik.qrAaben && !Butik.qrAaben(d)) {
      sigLukket('Vi tager ikke bordbestillinger lige nu',
        'Kom op til lugen, så tager vi den der — vi står lige derovre.');
      return;
    }

    data = d;

    /* HVOR TRAVLT ER DER? — tillæggets punkt 3.
       Ventetiden, personalet har skrevet, er et grundtal. Er der
       kø, er den for lav, og et tal, der er for lavt, er værre
       end intet tal: gæsten regner med det.

       ⚠️ TILLÆGGET ER SKREVET UD FRA, AT DER BETALES I APPEN.
       Det gør der ikke — ejeren har besluttet, at der betales ved
       kassen som altid. Loftet og ventetiden gælder alligevel:
       uden en betaling koster en bestilling ingenting for den,
       der sender den, så presset på lugen er det samme eller
       større.

       Den fejler i stilhed. Er supabase/bord-loft.sql ikke kørt
       endnu, står der bare ingen ventetid — som før. */
    visTravlhed(d);

    var oensket = oensketBord();
    var fundet = oensket && borde.filter(function (b) {
      return samme(b.nummer, oensket);
    })[0];

    if (fundet) saetBord(fundet);
    else visBordvalg(borde, oensket);
  }).catch(function (fejl) {
    var pille = $('bestil-status-tekst');
    if (pille) pille.textContent = 'Sig det til os ved lugen';
    sigLukket('Vi kan ikke hente kortet lige nu',
      'Der er noget, der driller. Sig det til os ved lugen — '
      + 'vi står lige derovre.');
    if (window.console) console.warn('bordsiden kunne ikke hentes:', fejl);
  });

  var aar = $('aar');
  if (aar) aar.textContent = String(new Date().getFullYear());
})();
