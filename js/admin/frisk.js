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

  /* ⚠️ TAKTEN VAR ET MINUT, OG DET VAR FOR LANGSOMT  (31/8).

     Kundens ord: *"på almindelige bestillinger skal jeg også
     refreshe for at hente nye — det er dårligt, det skal være
     straks og uden at refreshe."*

     Et minut betyder, at den gennemsnitlige ventetid på en ny
     bestilling er tredive sekunder, hvis den direkte forbindelse
     ikke bærer — og tredive sekunder foran en skærm, der står
     stille, er dét, der får et menneske til at trykke F5. Så
     opdager man aldrig, at forbindelsen er død; man lærer bare at
     refreshe.

     ⚠️ DER ER TO TAKTER NU, og forskellen er, om websocketen
     BÆRER. Er den oppe (Admin.liveOppe), er hentningen kun et
     sikkerhedsnet, og 30 sekunder er rigeligt. Er den nede — eller
     har den aldrig svaret på sin tilmelding — er takten det ENESTE
     signal, og så er den 8 sekunder. Det er nogle få kald i
     minuttet på fem små lister, og det er prisen for, at ingen
     står og trykker opdater.

     ⚠️ OG FANESKIFTET HENTER. Man skifter til Overblik for at se,
     hvad der er sket; står listen fra for et halvt minut siden, er
     det den forkerte liste at træffe beslutninger på. */
  var TAKT_LIVE_MS = 30 * 1000;
  var TAKT_ALENE_MS = 8 * 1000;
  var senest = 0;

  function takt() {
    return Admin.liveOppe && Admin.liveOppe() ? TAKT_LIVE_MS : TAKT_ALENE_MS;
  }

  /* Den returnerer et LØFTE, og det er der en grund til:
     køkken-køen skifter status på en bestilling og skal vide,
     hvornår listen er hentet igen, før den kvitterer. Uden det
     stod kvitteringen på skærmen, før kortet var flyttet, og
     personalet trykkede igen på et kort, der endnu ikke havde
     rykket sig. Alle de andre kaldere ser bort fra svaret. */
  function friskOp() {
    /* Kun logget ind: på login-skærmen ville hver hentning give
       401 og male fejl ud i lister, ingen kan se. */
    if ($('admin').classList.contains('skjult')) return Promise.resolve();
    senest = Date.now();
    var løfter = Admin.friske.map(function (hent) { return hent(); });
    /* ⚠️ OG INDSTILLINGERNE, NÅR DE KOM FRA RESERVEN  (15/9).
       Takten henter fanernes LISTER; Admin.data — indstillingerne,
       menukortet, åbningstiderne — hentes kun af genindlæs(), og den
       kørte kun ved login og efter et gem. Faldt forbindelsen ved
       login, stod admin låst på reservedata ("der gemmes ikke"), til
       nogen genindlæste siden — også længe efter nettet var tilbage.
       Nu prøver takten igen, så længe flaget står. */
    if (Admin.data && Admin.data._offline && Admin.genindlæs) løfter.push(Admin.genindlæs());
    return Promise.all(løfter);
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
    if (document.visibilityState === 'visible' && Date.now() - senest > 5 * 1000) {
      friskOp();
    }
  });

  /* 3) FANESKIFTET. Den, der trykker på Overblik, gør det for at
     se, hvad der er sket — ikke for at se, hvad der var sket sidst
     der blev hentet. Grænsen på fem sekunder findes, så en runde
     frem og tilbage mellem to faner ikke bliver til fire
     hentninger. */
  Admin.efterFane.push(function () {
    if (Date.now() - senest > 5 * 1000) friskOp();
  });

  /* ============================================================
     NETTET ER VÆK — OG SKÆRMEN SIGER DET  (26/9)
     ------------------------------------------------------------
     Fundet i en gennemgang af koden: faldt nettet ud på køkkenets
     iPad, blev køen stående med de gamle kort, og klokken i hovedet
     tikkede videre — skærmen så levende ud. Det eneste tegn var en
     gul prik og en tekst på 12 px. Et køkken, der tror, der ingen
     bestillinger er, fordi skærmen står stille, er det dyreste, der
     kan ske på en lørdag.

     Nu står der et rødt bånd fast øverst på skærmen, når databasen
     ikke har svaret i 45 sekunder (takten henter hvert 8.-30. sek.,
     så 45 er aldrig en almindelig pause), eller når browseren selv
     siger, at den er offline. Det går væk af sig selv, når svaret
     kommer. Tidspunktet er Butik.sidstSvar — det eneste sted, en
     fejlet og en lykket hentning kan skelnes. I øvetilstand er der
     intet net at miste, og så siger den ingenting.
     ============================================================ */
  var NET_GRAENSE_MS = 45 * 1000;
  function kl(ms) {
    var d = new Date(ms);
    return ('0' + d.getHours()).slice(-2) + '.' + ('0' + d.getMinutes()).slice(-2);
  }
  function tjekNettet() {
    var baand = document.getElementById('net-nede');
    var sidst = Butik.sidstSvar ? Butik.sidstSvar() : null;
    var nede = !$('admin').classList.contains('skjult') && sidst !== null
      && (navigator.onLine === false || Date.now() - sidst > NET_GRAENSE_MS);
    if (!nede) { if (baand) baand.parentNode.removeChild(baand); return; }
    if (!baand) {
      baand = document.createElement('div');
      baand.id = 'net-nede';
      baand.className = 'net-nede';
      baand.setAttribute('role', 'alert');
      document.body.appendChild(baand);
    }
    baand.textContent = '';
    var b = document.createElement('b');
    b.textContent = '\u26a0\ufe0f Ingen forbindelse' + (sidst ? ' siden kl. ' + kl(sidst) : '');
    var s = document.createElement('span');
    s.textContent = 'Det, du ser, kan være gammelt — nye bestillinger kommer ikke frem. '
      + 'Tjek wifi. Skærmen prøver selv igen.';
    baand.appendChild(b);
    baand.appendChild(s);
  }
  Admin.tjekNettet = tjekNettet;
  setInterval(tjekNettet, 5000);
  window.addEventListener('offline', tjekNettet);
  window.addEventListener('online', function () { friskOp(); tjekNettet(); });

  // 4) Takten
  setInterval(function () {
    if (document.visibilityState === 'visible' && Date.now() - senest >= takt()) {
      friskOp();
    }
  }, 2000);
})();
