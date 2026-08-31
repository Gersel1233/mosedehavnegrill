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
  /* ⚠️ OGSÅ DE SOCIALE. Filen sprang før fra, hvis siden ikke
     havde en mailadresse i bunden — og så ville en side med en
     Facebook-chip, men uden footer, beholde sit døde link. De to
     ting hører til den samme fane i admin, og de skal derfor
     leve eller dø sammen her. */
  var SOCIALE = document.querySelectorAll('a[data-social]');
  if (!LINKS.length && !SOCIALE.length) return;

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
        /* ⚠️ I kontaktblokken på forsiden sidder linket i en
           RÆKKE med sin egen etiket (31/8) — en etiket uden link
           er et spørgsmål uden svar, så rækken går med. Footeren
           er urørt: dér ER linket hele linjen. */
        var raekke = a.closest ? a.closest('[data-post-raekke]') : null;
        var vaek = raekke || a;
        if (vaek.parentNode) vaek.parentNode.removeChild(vaek);
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
    visSociale(i);
  }).catch(function (fejl) {
    // Adresserne står i HTML'en. Går hentningen galt, står de der
    // stadig — det er hele grunden til, at de gør.
    if (window.console) console.warn('Kontaktadresserne kunne ikke hentes:', fejl);
    visSociale({});
  });

  /* ============================================================
     ⚠️ FEM DØDE LINKS PÅ FORSIDEN  (29/8)
     ------------------------------------------------------------
     Facebook, Instagram, Anmeldelser, "Følg os →" og "Læs
     anmeldelserne på Google →" pegede alle på "#". Gæsten
     trykker, siden hopper til toppen, og hun tror, det er hende,
     der gør noget forkert.

     Det er NØJAGTIG den fejl, der blev fjernet i footeren 28/8 —
     den stod bare stadig øverst på forsiden. Reglen har været i
     js/oplysninger.js hele tiden: "tomme felter vises ikke — et
     link til en profil, der ikke findes, er en blindgyde."

     ⚠️ ADRESSERNE ER EJERENS, OG DE FINDES IKKE ENDNU. Vi finder
     ikke på en Facebook-side. Indtil personalet skriver dem i
     admin → Kontakt, ryger linkene AF siden — de kommer igen af
     sig selv den dag, adressen er der.

     ⚠️ OG ET KORT, DER KUN ER EN KNAP, FORSVINDER MED DEN.
     "Følg os på Facebook" er en reklame for en side, vi ikke kan
     linke til; bliver knappen væk og kortet stående, står der en
     opfordring uden en vej. Samme med stjernelinjen. */
  function visSociale(i) {
    var links = document.querySelectorAll('a[data-social]');
    Array.prototype.forEach.call(links, function (a) {
      var navn = a.getAttribute('data-social');
      var url = String((i || {})['social_' + navn] || '').trim();

      if (url) {
        a.href = /^https?:\/\//i.test(url) ? url : 'https://' + url;
        a.target = '_blank';
        a.rel = 'noopener';
        return;
      }

      /* Ingen adresse: linket af siden.

         ⚠️ ET KORT, DER KUN ER EN KNAP, GÅR MED. "Følg os på
         Facebook" er en reklame for en side, vi ikke kan linke
         til; bliver knappen væk og kortet stående, står der en
         opfordring uden en vej.

         ⚠️ MEN KUN .promo. Stjernelinjen bærer også en SÆTNING
         ("Vores gæster giver os 4,8"), og den er designets
         pladsholder, som Mikkel udtrykkeligt har sagt bliver
         stående, til personalet retter tallene. At tage hele
         linjen ville være at træffe hans beslutning om igen —
         det er kun det døde link, der er vores at fjerne. */
      var kort = a.closest('.promo');
      if (kort && kort.querySelectorAll('a').length === 1) {
        if (kort.parentNode) kort.parentNode.removeChild(kort);
        return;
      }
      if (a.parentNode) a.parentNode.removeChild(a);
    });

    /* Er hele striben tom, skal den heller ikke stå og fylde en
       række med ingenting. */
    var stribe = document.querySelector('.social');
    if (stribe && !stribe.querySelector('a')) {
      stribe.parentNode.removeChild(stribe);
    }
  }
}());
