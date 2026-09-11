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
    /* Cateringsiden (4/9). Tre pladser, ejeren fylder selv —
       fotoerne var ikke kommet, da siden blev skrevet om, og en
       plads uden en nøgle her kan kun få en flade: så er der
       ingen i admin, der kan lægge et billede op. */
    'catering-1': 'foto_catering_1',
    'catering-2': 'foto_catering_2',
    'catering-3': 'foto_catering_3',
    /* Historiesiden (31/8). Fire pladser, ejeren fylder selv i
       admin → Forside → Historien om havnen. De gamle
       ARKIVBILLEDER kan vi stadig ikke lægge ind for ham:
       rettighederne til et arkivfoto er ikke vores at give, og en
       forretnings forside er et kommercielt sted.

       ⚠️ DET, DER STÅR I DAG (6/9), ER STEMNINGSBILLEDER fra
       repoet — vand, master, en is, tovværk — og siden siger det
       selv, så længe de står der. Se data-reserve nedenfor. */
    'historie-1': 'foto_historie_1',
    'historie-2': 'foto_historie_2',
    'historie-3': 'foto_historie_3',
    'historie-4': 'foto_historie_4',
  };

  /* ⚠️ EN PLADS KAN BÆRE EN PULJE  (11/9). Kundens ord med et
     skud af forlæggets tapasside: billederne skal *"skifte mellem
     hinanden"*. Nøglerne står i HTML'en (`data-pulje`), af samme
     grund som tegnet: den, der flytter pladsen, tager puljen med.

     ⚠️ KUN EJERENS EGNE FOTOS — kundens beslutning 11/9. Han
     havde genereret tre tapasbilleder, og to af dem viste ting,
     fadet ikke er (rejer, padrón, kødboller). Et galleri, der
     viser en ret, fadet ikke er, er et løfte, køkkenet ikke
     holder. Derfor er der ingen reservefiler i puljen: uden et
     foto fra admin står fladen. */
  function pulje(plads, i) {
    var ud = [];
    String(plads.getAttribute('data-pulje') || '').split(/\s+/).forEach(function (n) {
      var u = n ? String(i[n] || '').trim() : '';
      if (u && ud.indexOf(u) < 0) ud.push(u);
    });
    return ud;
  }

  function fyld(indstillinger) {
    var i = indstillinger || {};
    var pladser = document.querySelectorAll('image-slot[data-tegn]');

    Array.prototype.forEach.call(pladser, function (plads) {
      var noegle = NOEGLER[plads.id];
      var fraAdmin = plads.hasAttribute('data-pulje') ? pulje(plads, i)
        : (noegle && String(i[noegle] || '').trim() ? [String(i[noegle]).trim()] : []);
      if (fraAdmin.length > 1) {
        plads.parentNode.replaceChild(galleri(fraAdmin, plads), plads);
        return;
      }
      var url = fraAdmin[0] || '';
      var reserve = !url;
      /* Ejerens egne fotos ligger i repoet, til han skifter dem i
         admin. Adressen står i HTML'en ved pladsen — samme grund
         som tegnet: den, der flytter pladsen, tager billedet med. */
      if (!url) url = String(plads.getAttribute('data-fil') || '').trim();

      if (url) {
        var foto = document.createElement('img');
        /* ⚠️ HVOR KOM BILLEDET FRA? Historiesiden skal kunne sige,
           at dens billeder er STEMNINGSBILLEDER og ikke arkivfotos
           fra Mosede — men kun så længe det er repoets, der står
           der. I det sekund ejeren lægger sit eget op i admin, er
           sætningen forkert. Flaget er derfor et faktum om DEN
           viste fil, ikke en fast tekst i HTML'en. */
        if (reserve) foto.setAttribute('data-reserve', '1');
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

  /* ⚠️ GALLERIET BLÆNDER — DET SKUBBER OG ZOOMER IKKE. Kun opacity
     skifter. En glidende karrusel flytter layoutet under fingeren,
     og en langsom zoom er præcis det, kunden kaldte *"hakkende og
     ik clean"* (30/8): en skalering tvinger browseren til at
     rastere hele billedet om ved hvert billede. Rytmen er
     stemningsgalleriets på forsiden (4,6 s).

     ⚠️ DET GAMLE BILLEDE BLIVER STÅENDE, TIL DET NYE ER HENTET.
     Ellers er der et hul at se ned i, mens nettet arbejder.

     ⚠️ PRIKKERNE ER KNAPPER MED ET NAVN — 30 px trykflade, og en
     skærmlæser hører "Billede 2 af 3". Ved reduceret bevægelse
     skifter intet af sig selv, men prikkerne virker stadig: det
     er gæsten, der har bedt om ro, ikke om færre billeder. */
  var SKIFT_MS = 4600;

  function galleri(liste, plads) {
    var rod = document.createElement('div');
    rod.className = 'foto-skift ' + (plads.className || '');
    rod.setAttribute('role', 'group');
    rod.setAttribute('aria-roledescription', 'billedskifter');
    rod.setAttribute('aria-label', plads.getAttribute('data-galleri-navn') || 'Billeder');

    var fotos = liste.map(function (url, nr) {
      var f = document.createElement('img');
      f.decoding = 'async';
      /* Ejerens egne fotos har ingen tekst med; rammens aria-label
         bærer det. Et gættet alt oplyser forkert om maden. */
      f.alt = '';
      if (nr) f.loading = 'lazy';
      f.className = 'foto-fyldt' + (nr ? '' : ' vis');
      f.src = url;
      rod.appendChild(f);
      return f;
    });

    var prikker = document.createElement('div');
    prikker.className = 'skift-prikker';
    var knapper = liste.map(function (url, nr) {
      var k = document.createElement('button');
      k.type = 'button';
      k.setAttribute('aria-label', 'Billede ' + (nr + 1) + ' af ' + liste.length);
      if (!nr) k.setAttribute('aria-current', 'true');
      k.addEventListener('click', function () { vis(nr); start(); });
      prikker.appendChild(k);
      return k;
    });
    rod.appendChild(prikker);

    var nu = 0, venter = -1, ur = null;
    function vis(nr) {
      if (nr === nu) return;
      var ny = fotos[nr];
      venter = nr;
      function skift() {
        if (venter !== nr) return;
        fotos[nu].classList.remove('vis');
        knapper[nu].removeAttribute('aria-current');
        ny.classList.add('vis');
        knapper[nr].setAttribute('aria-current', 'true');
        nu = nr;
      }
      if (ny.complete && ny.naturalWidth > 0) { skift(); return; }
      ny.loading = 'eager';
      ny.addEventListener('load', skift, { once: true });
    }

    var ro = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function start() {
      if (ur) clearInterval(ur);
      if (ro) return;
      ur = setInterval(function () {
        /* En skjult fane skifter ikke — gæsten kommer tilbage til
           det billede, hun forlod, ikke til det femte. */
        if (document.hidden) return;
        vis((nu + 1) % fotos.length);
      }, SKIFT_MS);
    }
    start();
    return rod;
  }

  window.MosedeBilledplads = { fyld: fyld, NOEGLER: NOEGLER };
}());
