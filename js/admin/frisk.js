/* Admin holder sig selv frisk. (fase 5c)
   Se js/admin/kerne.js for de to principper, der gælder i alle
   admin-filerne.

   Kunden så det med det samme: telefonen bippede, men skærmen
   stod stille, til nogen trykkede "Hent på ny". I spiis kommer
   bestillingen ind i samme sekund — og det gør den nu også her.

   TRE SIGNALER, I DEN RÆKKEFØLGE DE RAMMER:

   1) PUSHEN. Service workeren får beskeden i samme sekund, rækken
      lander, og siger det videre til de åbne admin-vinduer
      (sw.js sender 'mosede-nyt'). Det er dét, der giver "instant"
      på iPad'en i køkkenet — pushen er ikke kun et pling, den er
      også det interne startskud.
   2) TILBAGEKOMSTEN. Vender man tilbage til fanen, hentes der, så
      man aldrig kigger på en gammel liste uden at vide det.
   3) TAKTEN. Hvert minut, som fald-tilbage for enheder uden push.
      Kun når fanen faktisk er synlig — en skjult fane, der henter
      hele natten, er batteriforbrug uden et eneste øje på skærmen.

   HVORFOR IKKE RIGTIG REALTIME (websockets)? Det ville kræve
   Supabases SDK eller et par hundrede linjer håndskrevet
   Phoenix-protokol at vedligeholde — mod tre signaler, der
   genbruger det, vi allerede har bygget. Pushen ER realtidskanalen;
   resten er sikkerhedsnet. Måles der en dag et hul, står det her,
   så beslutningen kan tages om. */
(function () {
  'use strict';

  var $ = Admin.$;
  var TAKT_MS = 60 * 1000;
  var senest = 0;

  function friskOp() {
    /* Kun logget ind: på login-skærmen ville hver hentning give
       401 og male fejl ud i lister, ingen kan se. */
    if ($('admin').classList.contains('skjult')) return;
    senest = Date.now();
    Admin.friske.forEach(function (hent) { hent(); });
  }

  // Læselig udefra, så tests/frisk.spec.js kan måle på den — og så
  // en fejlsøgning i konsollen kan trykke på den med hånden.
  Admin.friskOp = friskOp;

  // 1) Pushen siger til
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function (h) {
      if (h.data && h.data.type === 'mosede-nyt') friskOp();
    });
  }

  // 2) Tilbagekomsten — med lidt ro på, så et hurtigt faneskift
  // frem og tilbage ikke bliver til to hentninger på to sekunder
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && Date.now() - senest > 30 * 1000) {
      friskOp();
    }
  });

  // 3) Takten
  setInterval(function () {
    if (document.visibilityState === 'visible' && Date.now() - senest >= TAKT_MS) {
      friskOp();
    }
  }, TAKT_MS);
})();
