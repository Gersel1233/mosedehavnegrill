/* DE TO TING, DER SKAL SÆTTES OP PÅ EN NY TELEFON  (30/8)

   Kundens skærmbilleder viste to kort øverst på Overblik:
   "Installér som app" og "Vigtigt: slå notifikationer til på
   denne telefon". Formen er lånt derfra; farverne er havnens, og
   indholdet er Mosedes egen opsætning.

   ⚠️ DE FINDES KUN, NÅR DER ER NOGET AT GØRE. Er appen
   installeret og beskederne slået til, står kortene der ikke. Et
   fast kort, der som regel siger "alt er fint", bliver til
   udsmykning på en uge — og så ses det heller ikke den dag, det
   siger noget. Det er den samme regel som ⚠️-kortet på
   Baglokalet og "Gå ud og sig noget" i Køkken-kø.

   ⚠️ OG DE BYGGER IKKE DERES EGEN KNAP. Beskederne slås til med
   AdminPush.slaaTil — den samme funktion, Kontakt-fanen bruger.
   To udgaver ville langsomt komme til at gøre noget forskelligt,
   og ingen ville opdage det, før en iPad holdt op med at sige
   til.

   ⚠️ INSTALLATIONEN ER TO FORSKELLIGE VERDENER. Android og
   Chrome giver os en rigtig prompt (beforeinstallprompt), som vi
   kan kalde. iOS gør IKKE — dér findes der kun Del → "Føj til
   hjemmeskærm", og den kan ingen kode åbne. Så på en iPhone er
   kortet en VEJLEDNING, ikke en knap, der lyver om, at den kan
   gøre det for dig. */
(function () {
  'use strict';

  var promptet = null;      // Chromes egen installations-prompt, hvis vi får den

  /* Kører vi allerede som installeret app? Så er der ingen grund
     til at bede om det igen. */
  function erInstalleret() {
    return (window.matchMedia
      && window.matchMedia('(display-mode: standalone)').matches)
      || window.navigator.standalone === true;
  }

  function erIOS() {
    return window.AdminPush ? window.AdminPush.erIOS()
      : /iPad|iPhone/.test(navigator.userAgent || '');
  }

  function lav(tag, klasse, tekst) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (tekst !== undefined && tekst !== null) el.textContent = tekst;
    return el;
  }

  /* Ét kort: tegn, overskrift, forklaring og én handling. */
  function kort(tegn, titel, forklaring, knapTekst, gør, vigtigt) {
    var k = lav('div', 'ops-kort' + (vigtigt ? ' ops-vigtig' : ''));
    k.appendChild(lav('div', 'ops-tegn', tegn));

    var midt = lav('div', 'ops-midt');
    midt.appendChild(lav('b', null, titel));
    midt.appendChild(lav('span', null, forklaring));
    k.appendChild(midt);

    if (knapTekst) {
      var knap = lav('button', 'knap', knapTekst);
      knap.type = 'button';
      knap.addEventListener('click', gør);
      k.appendChild(knap);
    }
    return k;
  }

  function tegn() {
    var boks = document.getElementById('overblik-opsaetning');
    if (!boks) return;
    while (boks.firstChild) boks.removeChild(boks.firstChild);

    /* ---- 1) APPEN PÅ HJEMMESKÆRMEN ---- */
    if (!erInstalleret()) {
      if (promptet) {
        boks.appendChild(kort('📲', 'Læg personalesiden på hjemmeskærmen',
          'Eget ikon på telefonen — åbner uden browserens bjælker.',
          'Installér', function () {
            promptet.prompt();
            promptet = null;
            tegn();
          }));
      } else if (erIOS()) {
        /* ⚠️ INGEN KNAP HER. iOS har ingen vej for kode til at
           installere en side; kun mennesket kan gøre det fra
           delemenuen. En knap, der ikke kan gøre det, den lover,
           er værre end en vejledning. */
        boks.appendChild(kort('📲', 'Læg personalesiden på hjemmeskærmen',
          'Tryk på Del-knappen nederst i Safari og vælg "Føj til hjemmeskærm". '
          + 'Beskeder på telefonen virker KUN fra den installerede app.',
          null, null));
      }
    }

    /* ---- 2) BESKEDER PÅ TELEFONEN ---- */
    var push = window.AdminPush;
    if (push && push.kanPush() && !push.erTil()) {
      boks.appendChild(kort('🔔', 'Slå beskeder til på den her enhed',
        'Så siger telefonen til, når der kommer en bestilling — også når '
        + 'appen er lukket. Skal slås til igen, hvis appen har været slettet.',
        'Slå til', function () {
          push.slaaTil();
          /* Browserens svar kommer først, når mennesket har trykket
             i dialogen — tegn om lidt efter, så kortet forsvinder
             af sig selv, når der er sagt ja. */
          setTimeout(tegn, 1500);
        }, true));
    } else if (push && !push.kanPush() && erIOS() && !erInstalleret()) {
      /* iOS-fælden, som push.js allerede kender: i Safari-fanen
         FINDES PushManager slet ikke. Så er beskeder ikke slået
         fra — de er umulige, til siden er installeret. */
      boks.appendChild(kort('🔔', 'Beskeder kræver, at siden er installeret',
        'På en iPhone kan kun den installerede app sige til. '
        + 'Læg siden på hjemmeskærmen først — så kommer knappen her.',
        null, null, true));
    }
  }

  /* Chrome/Android tilbyder os prompten. Vi gemmer den og bruger
     den, når personalet trykker — browserens egen dialog må ikke
     komme uopfordret midt i en frokost. */
  window.addEventListener('beforeinstallprompt', function (h) {
    h.preventDefault();
    promptet = h;
    tegn();
  });

  window.addEventListener('appinstalled', function () {
    promptet = null;
    tegn();
  });

  window.AdminOpsaetning = { tegn: tegn, erInstalleret: erInstalleret };

  if (window.Admin && Admin.vedLogin) Admin.vedLogin.push(tegn);
  document.addEventListener('DOMContentLoaded', function () { setTimeout(tegn, 300); });
}());
