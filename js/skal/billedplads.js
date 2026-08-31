/* ============================================================
   DE TOMME BILLEDPLADSER  (29/8)

   Kundens ord om forsiden: "kedeligt hele vejen ned".

   Designet fra Claude Design leverede <image-slot> som
   pladsholdere til fotos, forretningen skulle sende bagefter.
   Fotoerne er ikke kommet, og MÅLT på en iPhone 13 tegner en tom
   plads sig som en STIPLET GRÅ KASSE med teksten "Foto:
   anretning" i midten. Galleriet på forsiden alene var 740 px
   stiplet ingenting midt i afsnittet om selskaber — det ligner
   en side, der er gået i stykker, ikke en side, der venter.

   Nyhedskortene fik lukket den fejl 26/8. Den stod bare stadig
   seks steder til: fire på forsiden, ét på tapassiden og ét på
   baglokalets. Reglen er den samme, og derfor bor den ÉT sted:
   tre kopier ville langsomt komme til at tegne tre forskellige
   flader, og det ville ingen opdage — hver side ser jo rigtig ud
   for sig selv.

   Fire udfald, i den rækkefølge:
   · har ejeren lagt et FOTO op i admin, står det
   · ellers det foto, der ligger i repoet (data-fil)
   · ellers en flade i havnens farver med pladsens eget tegn
   · og har pladsen ikke fået et tegn, bliver den stående som
     designet leverede den

   ⚠️ ADMIN SLÅR REPOET, og det er hele pointen med de to
   nederste trin. Filerne i billeder/ er ejerens EGNE fotos, lagt
   ind af os første gang — men den dag han tager et bedre billede,
   skal han kunne skifte det i admin uden at nogen rører koden.
   Var rækkefølgen omvendt, ville hans upload se ud, som om den
   ikke virkede.

   ⚠️ TEGNET STÅR I HTML'EN (data-tegn), ikke i en tabel her.
   Flytter nogen galleriet eller føjer en plads til, følger tegnet
   med af sig selv — en liste i JavaScript ville efterlade den nye
   plads grå, uden at nogen kunne se hvorfor.

   ⚠️ OG DET ER IKKE ET PLADSHOLDERBILLEDE. Vi finder ikke på et
   foto af mad, forretningen ikke har vist os. En farvet flade med
   et tegn lover ingenting; et stockfoto af en anretning ville
   love en anretning.

   ⚠️ FILEN HENTER IKKE SELV. Butik.hent() lægger otte tabeller på
   nettet ved hvert kald og gemmer ikke svaret — et kald herfra
   ville fordoble hentningen på hver eneste side. Kalderen har
   dataene i forvejen og sender dem ind.
   ============================================================ */
(function () {
  'use strict';

  /* Hvilken indstilling der bærer fotoet til hvilken plads.
     Nøglerne er admin → Forside's egne. En plads, der ikke står
     her, kan kun få en flade — og det er rigtigt: uden et felt i
     admin er der ingen, der kan lægge et foto op. */
  var NOEGLER = {
    'tapas-forside': 'foto_tapas',
    'tapas-fad': 'foto_tapas',
    'selskab-1': 'foto_selskab_1',
    'selskab-2': 'foto_selskab_2',
    'selskab-3': 'foto_selskab_3',
    'baglokale-foto': 'foto_baglokale',
    /* Historiesiden (31/8). Fire pladser, ejeren fylder selv i
       admin → Forside → Historien om havnen. De gamle
       arkivbilleder kan vi ikke lægge ind for ham: rettighederne
       til et arkivfoto er ikke vores at give, og en forretnings
       forside er et kommercielt sted. Han lægger dem op, han har
       lov til at bruge. */
    'historie-1': 'foto_historie_1',
    'historie-2': 'foto_historie_2',
    'historie-3': 'foto_historie_3',
    'historie-4': 'foto_historie_4',
  };

  function fyld(indstillinger) {
    var i = indstillinger || {};
    var pladser = document.querySelectorAll('image-slot[data-tegn]');

    Array.prototype.forEach.call(pladser, function (plads) {
      var noegle = NOEGLER[plads.id];
      var url = noegle ? String(i[noegle] || '').trim() : '';
      /* Ejerens egne fotos ligger i repoet, til han skifter dem i
         admin. Adressen står i HTML'en ved pladsen — samme grund
         som tegnet: den, der flytter pladsen, tager billedet med. */
      if (!url) url = String(plads.getAttribute('data-fil') || '').trim();

      if (url) {
        var foto = document.createElement('img');
        foto.decoding = 'async';
        /* ⚠️ KLASSERNE FØLGER MED. .tall og .short er galleriets to
           højder, og uden dem falder rækkerne sammen til nul. */
        foto.className = 'foto-fyldt ' + (plads.className || '');
        foto.src = url;
        /* ⚠️ ALT-TEKSTEN ER FOTOETS, IKKE PLADSENS. Designets
           placeholder siger, hvad pladsen var TÆNKT til ("Foto:
           tapasfad") — og der ligger nu et billede af tartar i
           den. En skærmlæser, der siger "tapasfad" over et foto af
           tartar, oplyser forkert om maden. Er der ingen data-alt,
           falder vi tilbage på tom: et forkert alt er værre end
           intet alt. */
        foto.alt = plads.getAttribute('data-alt') || '';
        foto.loading = 'lazy';
        plads.parentNode.replaceChild(foto, plads);
        return;
      }

      /* ⚠️ ELEMENTET SKIFTES UD, ikke fyldes. <image-slot> er en
         rigtig komponent med sin egen indmad — sætter man tekst i
         den, står tegnet oven i dens "Foto … / or browse files /
         Replace / Remove". Præcis den fejl blev målt på
         nyhedskortene 26/8. */
      var felt = document.createElement('div');
      felt.className = 'foto-felt f-' + (plads.getAttribute('data-flade') || 'mad')
        + ' ' + (plads.className || '');
      felt.setAttribute('aria-hidden', 'true');
      felt.textContent = plads.getAttribute('data-tegn');
      plads.parentNode.replaceChild(felt, plads);
    });
  }

  window.MosedeBilledplads = { fyld: fyld, NOEGLER: NOEGLER };
}());
