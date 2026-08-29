/* ============================================================
   DE TO E-MAILADRESSER I BUNDEN AF SIDEN  (28/8)

   Mikkel oplyste to rigtige adresser: selskab1@ og booking1@.
   De dækker det, systemet IKKE gør — et tilbud på et selskab, et
   spørgsmål der skal skrives ned frem for siges i en telefon.

   ⚠️ EN BORDBESTILLING ER IKKE ÉN AF DEM (28/8). Kundens ord:
   "bordbestilling skal foregå igennem systemet og admin og ikke
   igennem mail." En booking i en indbakke står ikke i tabellen,
   tæller ikke med i dagens billede og optager ingen pladser.
   Derfor hedder linket "Om din booking" og ikke "Bordbestilling":
   adressen er til spørgsmål om en booking, gæsten allerede HAR.

   ⚠️ DE ERSTATTER EN OPDIGTET ADRESSE. Der stod
   hej@mosedehavnegrill.dk i bunden af ni sider: designets
   pladsholder, på et forkert domæne, og en gæst, der skrev til
   den, nåede ingen. Ret den ALDRIG tilbage.

   ⚠️ ADRESSERNE STÅR I HTML'EN, og filen her bytter dem kun ud,
   hvis personalet har skrevet noget andet i admin → Kontakt.
   Samme regel som baglokalets vilkår: vi overskriver kun, når
   databasen har noget at sige. Skrev vi hele linjen i
   JavaScript, skulle de rigtige adresser stå to steder — i
   HTML'en som reserve OG her — og så ville den ene blive glemt.

   ⚠️ OG ET TOMT FELT I ADMIN SKJULER LINKET. Det er ikke det
   samme som "lad stå": har forretningen nedlagt adressen, skal
   den VÆK fra siden, ikke blive stående som et link, ingen
   læser. Derfor er der forskel på "feltet er aldrig sat" (så
   står HTML'ens adresse) og "feltet er sat til tomt" — se
   nedenfor.
   ============================================================ */
(function () {
  'use strict';

  if (!window.Butik) return;

  var LINKS = document.querySelectorAll('a[data-post]');
  if (!LINKS.length) return;

  var NOEGLER = {
    selskab: 'kontakt_email_selskab',
    booking: 'kontakt_email_booking',
  };

  Butik.hent().then(function (d) {
    var i = (d && d.indstillinger) || {};

    Array.prototype.forEach.call(LINKS, function (a) {
      var noegle = NOEGLER[a.getAttribute('data-post')];
      if (!noegle) return;

      var vaerdi = i[noegle];
      // Aldrig sat: HTML'ens adresse er sandheden og bliver stående.
      if (vaerdi === undefined || vaerdi === null) return;

      var email = String(vaerdi).trim();
      if (!email) {
        /* Sat til tomt: adressen findes ikke længere. Linket ryger
           helt af siden — et mailto til en nedlagt adresse er en
           blindgyde, præcis som de tomme Facebook-links, der stod
           her før. */
        if (a.parentNode) a.parentNode.removeChild(a);
        return;
      }

      /* ⚠️ EMNET SKAL MED OVER. Knapperne på siderne bærer et
         data-emne ("Selskab hos Mosede Havnecafe"), så personalet
         kan se, hvad mailen handler om, uden at åbne den. Uden
         linjen her tørrede en rettet adresse i admin emnet af, og
         forespørgslerne ville lande som "(intet emne)". */
      var emne = a.getAttribute('data-emne');
      a.href = 'mailto:' + email
        + (emne ? '?subject=' + encodeURIComponent(emne) : '');
      /* Etiketten bliver stående. Den siger, hvad adressen er TIL
         — "Selskaber & catering", "Send en mail" — og det er den
         oplysning, der får gæsten til at skrive det rigtige sted
         hen. En rå adresse i bunden af en side siger ingenting om,
         hvem der læser den. */
    });
  }).catch(function (fejl) {
    // Adresserne står i HTML'en. Går hentningen galt, står de der
    // stadig — det er hele grunden til, at de gør.
    if (window.console) console.warn('Kontaktadresserne kunne ikke hentes:', fejl);
  });
}());
