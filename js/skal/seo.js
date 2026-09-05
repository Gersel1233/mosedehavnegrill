/* ============================================================
   STRUKTURERET DATA TIL GOOGLE  (5. september 2026)
   ------------------------------------------------------------
   Kundens spørgsmål: "hvorfor er hjemmesiden ikke højt op på
   google ift hvis jeg søger mosedehavecafe eller mosedehavn grill
   og ishus?"

   ⚠️ MÅLT, IKKE GÆTTET: de ti designsider havde NUL struktureret
   data. Kun bestil/ og bord/ havde den — to dybe sider — og deres
   blokke var skrevet i HÅNDEN i HTML'en. Da designet afløste de
   gamle sider 23/8, fulgte JSON-LD'en ikke med. For en lokal
   forretning er det den største enkelte mangel: navn, adresse,
   telefon, åbningstider og koordinater er præcis det, Google
   bruger til "grillbar i nærheden".

   ⚠️ OG DE HÅNDSKREVNE BLOKKE VAR ALLEREDE SKREDET.
   js/oplysninger.js skriver i sit eget hoved, at "JSON-LD til
   Google" bygges af den fil. Det passede ikke — de to blokke var
   kopier, og bestil/ pegede stadig hasMenu på menu.html, som har
   været en VEJVISER siden 30/8. Altså sendte vi Google ind i en
   omdirigering. Nu er der ÉN kilde, og det er filen her, der
   bygger blokken.

   ⚠️ ÅBNINGSTIDERNE KOMMER FRA DATABASEN, ALDRIG FRA KODEN.
   Ejeren retter dem i admin. Stod de også her, ville Google vise
   ét sæt tider og hjemmesiden et andet den dag, han ændrede dem —
   og begge ville se rigtige ud hver for sig. Det er husets ældste
   ar, og det er dyrere her end de fleste steder: en gæst, der
   kører til havnen på Googles åbningstid, har spildt turen.

   ⚠️ INTET OPFINDES. Er et felt tomt i oplysningsfilen, kommer
   det ikke med — samme regel som footeren følger. Vi skriver
   hverken en anmeldelsesscore, et antal anmeldelser eller et
   åbningsår, og der er MED VILJE ingen aggregateRating: huset har
   en ordret regel om aldrig at bruge opdigtede anmeldelser, og en
   score i JSON-LD er en påstand til Google om noget, ingen har
   målt.

   ⚠️ alternateName ER IKKE ET GÆT. Forretningens smiley-rapport
   hedder ordret "Mosede havn grill og ishus" (findsmiley.dk,
   oplyst af Mikkel 31/8), og Instagram-profilen hedder
   mosedehavngrillogishus. Det er altså forretningens eget andet
   navn — og MÅLT stod de ord ingen steder på siden undtagen
   historien.html. Søger nogen på dét navn, havde Google intet at
   matche det til.
   ============================================================ */
(function () {
  'use strict';

  var M = window.MOSEDE;
  if (!M) return;   /* js/oplysninger.js er ikke med — så skriver vi ingenting */

  var ID = 'mosede-jsonld';

  /* Tomme felter falder fra. Et link til en profil, der ikke
     findes, er en blindgyde for både gæster og Google. */
  function fyldte(liste) {
    return liste.filter(function (v) { return !!v; });
  }

  /* ⚠️ NUL ER MANDAG — MÅLT, IKKE ANTAGET. Første udgave af
     filen her skrev 1 = mandag, fordi det er isodow, og det er
     dét, databasens kategori-ugedage bruger. Åbningstiderne gør
     IKKE: js/store.js regner dem som (getUTCDay() + 6) % 7, og
     dens egen UGEDAGE-liste begynder med 'Mandag' på plads nul.

     Fejlen ville have været tavs og dyr: hver eneste åbningstid
     ét døgn forskudt hos Google, mens hjemmesiden viste de
     rigtige. En gæst, der kører til havnen på Googles tid, har
     spildt turen — og ingen af de to skærme ville se forkerte ud
     for sig selv.

     Rækkefølgen er den ENE oversættelse til schema.org's
     engelske navne. */
  var UGEDAG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday',
                'Friday', 'Saturday', 'Sunday'];

  function tider(d) {
    var raekker = (d && d.aabningstider) || [];
    var ud = [];
    raekker.forEach(function (r) {
      var dag = UGEDAG[Number(r.ugedag)];
      /* En lukket dag er ikke en åbningstid — den udelades, og
         Google læser fraværet som lukket. En række med 00:00-00:00
         ville love, at der er åbent ved midnat. */
      if (!dag || r.lukket || !r.aabner || !r.lukker) return;
      ud.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'https://schema.org/' + dag,
        opens: String(r.aabner).slice(0, 5),
        closes: String(r.lukker).slice(0, 5)
      });
    });
    return ud;
  }

  function byg(d) {
    var a = M.adresse || {};
    var s = M.social || {};
    var domaene = String(M.domaene || '').replace(/\/+$/, '');

    var blok = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: M.navn,
      /* Se noten øverst: forretningens eget andet navn, ikke et gæt. */
      alternateName: 'Mosede Havn Grill og Ishus',
      url: domaene + '/',
      telephone: M.telefon,
      email: M.email,
      servesCuisine: M.koekken,
      priceRange: M.prisklasse,
      address: {
        '@type': 'PostalAddress',
        streetAddress: a.vej,
        postalCode: a.postnr,
        addressLocality: a.by,
        addressCountry: a.land
      },
      /* ⚠️ hasMenu SKAL PEGE PÅ EN SIDE, IKKE PÅ EN VEJVISER.
         Den stod på menu.html, som har omdirigeret siden 30/8 —
         altså sendte vi Google ind i en 301. */
      hasMenu: domaene + '/m-menukort.html',
      image: domaene + '/billeder/facade-1400.jpg'
    };

    if (M.position && M.position.lat && M.position.lng) {
      blok.geo = {
        '@type': 'GeoCoordinates',
        latitude: M.position.lat,
        longitude: M.position.lng
      };
    }

    /* Profilerne binder domænet sammen med de steder, forretningen
       allerede findes — det er dét, sameAs er til. */
    var sameAs = fyldte([s.facebook, s.instagram, s.tiktok, s.google, s.smiley]);
    if (sameAs.length) blok.sameAs = sameAs;

    var aabent = tider(d);
    if (aabent.length) blok.openingHoursSpecification = aabent;

    /* Tomme felter falder fra til sidst, så en nedlagt mail eller
       en manglende prisklasse ikke bliver til "" hos Google. */
    Object.keys(blok).forEach(function (k) {
      var v = blok[k];
      if (v === '' || v === null || v === undefined
          || (Array.isArray(v) && !v.length)) delete blok[k];
    });
    return blok;
  }

  function skriv(d) {
    var gammel = document.getElementById(ID);
    if (gammel) gammel.parentNode.removeChild(gammel);
    var el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = ID;
    el.textContent = JSON.stringify(byg(d));
    document.head.appendChild(el);
  }

  /* ⚠️ BLOKKEN SKRIVES MED DET SAMME OG IGEN MED TIDERNE.
     Googles crawler kører JavaScript, men den venter ikke
     nødvendigvis på et netværkskald. Skrives blokken først, når
     databasen har svaret, risikerer vi at stå uden navn og adresse
     i det øjeblik, den kigger. Så: de faste oplysninger straks —
     og åbningstiderne oveni, så snart de er der. */
  skriv(null);
  if (window.Butik && typeof Butik.hent === 'function') {
    Butik.hent().then(skriv).catch(function () {
      /* Databasen svarede ikke. Blokken UDEN tider står stadig —
         navn og adresse er sande, uanset om kaldet gik igennem. */
    });
  }
})();
