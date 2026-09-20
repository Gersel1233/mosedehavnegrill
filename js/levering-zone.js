/* ============================================================
   LEVERINGSZONEN — GEOGRAFIEN, IKKE POSTNUMMERET  (20. sep 2026)
   ------------------------------------------------------------
   Indtil i dag har leveringen kun spurgt om ét tal: det første
   firecifrede i adressens tekst (R.leveringSvar i bestil-regler.js).
   Det er en grov sigte og intet andet — gæsten skriver selv teksten,
   og et postnummer dækker et større område end den rute, en cafe
   rent faktisk kører. 2670 rækker fra havnen og et godt stykke ind i
   landet.

   Den her fil er den geografiske afgørelse, og kun den. Ingen DAWA,
   intet netværk, ingen UI — ren regnekraft, så den kan prøves på et
   sekund og aldrig bliver ustabil. Den, der henter adressen, ligger
   et andet sted; den, der tegner feltet, et tredje.

   ⚠️ KOORDINATER ER [længde, bredde] HELE VEJEN — lng, lat, som
      GeoJSON og DAWA gør det. Den klassiske fejl er at bytte om, og
      den viser sig som "vi leverer ikke til Greve, men gerne til
      Somalia". tests/levering-zone.spec.js måler netop den
      ombytning, så den ikke kan snige sig ind igen.

   ⚠️ TRE UDFALD, IKKE TO. Ejeren skrev selv i sit eget leveringsfelt
      "længere ude efter aftale", og huset har haft svaret 'spoerg'
      siden 1/9 med begrundelsen: *"et blankt afslag ville sende en
      kunde væk, forretningen gerne ville have haft."* En binær zone
      ville fjerne netop de kunder. Zonerne er derfor en ORDNET liste
      med hvert sit svar — første træffer vinder, ingen træffer er et
      nej. Det giver også plads til forskellige leveringspriser
      senere uden at røre noget her.

   ⚠️ POSTNUMMERET ER EN GROV SIGTE, IKKE DOMMEN. Et tilladt
      postnummer uden for polygonen skal stadig afvises. Rækkefølgen
      står i maaLeveres og må ikke byttes om.

   ⚠️ INTET SVAR ER ET JA VED TVIVL. Manglende punkt, ugyldigt tal,
      tom polygon — alt sammen nej. Et leveringssystem, der gætter i
      kundens favør, kører mad til Aalborg.
   ============================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------
     OPSÆTNINGEN — DET ENESTE STED, GRÆNSEN RETTES
     ------------------------------------------------------------
     ⚠️⚠️ POLYGONEN HERUNDER ER IKKE GODKENDT. Den er et arbejdsomrids
     lagt omkring de byer, ejerne nævnte — Greve, Mosede, Karlslunde,
     Tune, Køge og det derimellem — og den er IKKE en aftale om, hvor
     bilen kører hen. `godkendt: false` står der, så ingen kommer til
     at tro andet, og prøven holder fast i det.

     SÅDAN RETTES GRÆNSEN: skriv nye punkter i `zoner` nedenfor.
     Hvert punkt er [længde, bredde] i WGS84 — samme tal som Google
     Maps viser, bare i omvendt rækkefølge af det, Maps skriver.
     Første og sidste punkt behøver ikke være ens; polygonen lukkes
     selv. Intet andet i huset skal røres.

     SÅDAN TILFØJES EN ZONE: læg et objekt mere i listen. Rækkefølgen
     afgør: den første, punktet ligger i, vinder. Læg derfor den
     snævreste først.
     ------------------------------------------------------------ */
  var OPSAETNING = {
    godkendt: false,

    /* Kun til afstandsvisning og fejlsøgning — afgør ingenting. */
    oprindelse: { navn: 'Mosede Havn', punkt: [12.2712, 55.5823] },

    /* Den grove sigte. Ejerens egen liste i indstillingerne
       (leverings_postnr) vinder over den her, når den findes —
       se maaLeveres. */
    postnumre: [2635, 2670, 2680, 2690, 4000, 4030, 4600, 4623],

    zoner: [
      {
        navn: 'kerne',
        svar: 'ja',
        /* Greve, Mosede, Karlslunde, Solrød og Tune. ARBEJDSOMRIDS. */
        polygon: [
          [12.365, 55.640], [12.330, 55.590], [12.320, 55.520],
          [12.255, 55.470], [12.150, 55.480], [12.105, 55.560],
          [12.130, 55.630], [12.250, 55.660],
        ],
      },
      {
        navn: 'kanten',
        svar: 'spoerg',
        /* Køge og det yderste — "længere ude efter aftale".
           ARBEJDSOMRIDS. */
        polygon: [
          [12.430, 55.690], [12.400, 55.560], [12.360, 55.420],
          [12.220, 55.380], [12.020, 55.440], [11.990, 55.600],
          [12.060, 55.700], [12.260, 55.730],
        ],
      },
    ],
  };

  /* ------------------------------------------------------------
     ET GYLDIGT PUNKT
     ⚠️ typeof 'number' og ikke bare isFinite: strengen "12.25" ville
     ellers slippe igennem og regne rigtigt ved et tilfælde — og så
     havde vi et system, der godkender ting, ingen har valideret.
     ------------------------------------------------------------ */
  function gyldigtPunkt(p) {
    return Array.isArray(p) && p.length === 2
      && typeof p[0] === 'number' && isFinite(p[0])
      && typeof p[1] === 'number' && isFinite(p[1]);
  }

  /* ------------------------------------------------------------
     PUNKT I POLYGON — stråleskydning
     ------------------------------------------------------------
     Klassikeren: skyd en stråle mod øst og tæl, hvor mange kanter
     den krydser. Ulige tal = inde. Den er valgt frem for et
     bibliotek, fordi hele regnestykket er ti linjer, og et
     dependency til ti linjer er ti linjer, man ikke selv kan se.

     ⚠️ KANTEN SVARER ALTID DET SAMME. Formlen er deterministisk —
     et punkt præcis på en kant giver det samme svar hver gang. Det
     er vigtigere end hvilket af de to svar det er: en gæst, der får
     "ja" og "nej" på skift for den samme adresse, mister tilliden
     til hele bestillingen.
     ------------------------------------------------------------ */
  function iPolygon(punkt, polygon) {
    if (!gyldigtPunkt(punkt)) return false;
    if (!Array.isArray(polygon) || polygon.length < 3) return false;

    var x = punkt[0];
    var y = punkt[1];
    var inde = false;

    for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      var a = polygon[i];
      var b = polygon[j];
      /* Et hjørne, der ikke er et punkt, gør hele polygonen
         upålidelig. Så er svaret nej — ikke et gæt. */
      if (!gyldigtPunkt(a) || !gyldigtPunkt(b)) return false;

      var xi = a[0], yi = a[1];
      var xj = b[0], yj = b[1];

      var krydser = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (krydser) inde = !inde;
    }
    return inde;
  }

  /* ------------------------------------------------------------
     HVILKEN ZONE LIGGER PUNKTET I?
     Første træffer vinder, så den snævreste zone skal stå først.
     Et svar, der hverken er 'ja' eller 'spoerg', springes over —
     en tastefejl i opsætningen må ikke blive til en leveringsaftale.
     ------------------------------------------------------------ */
  function zoneSvar(punkt, zoner) {
    if (!Array.isArray(zoner) || !zoner.length) {
      return { svar: 'nej', zone: null };
    }
    for (var i = 0; i < zoner.length; i++) {
      var z = zoner[i] || {};
      if (z.svar !== 'ja' && z.svar !== 'spoerg') continue;
      if (iPolygon(punkt, z.polygon)) {
        return { svar: z.svar, zone: z.navn || null };
      }
    }
    return { svar: 'nej', zone: null };
  }

  /* ------------------------------------------------------------
     MÅ DER LEVERES TIL DEN HER ADRESSE?
     ------------------------------------------------------------
     adresse:    { postnr, lng, lat }  — fra den validerede adresse,
                 ALDRIG fra gæstens rå tekst.
     opsaetning: { postnumre, zoner } — udelades den, bruges husets.

     ⚠️ RÆKKEFØLGEN ER REGLEN:
        1) postnummeret — grov sigte, hurtigt nej
        2) punktet — findes det overhovedet?
        3) polygonen — den endelige afgørelse
     Byttes 1 og 3 om, ville et tilladt postnummer kunne slippe
     igennem uden geografi. Det er præcis den fejl, hele filen findes
     for at undgå.
     ------------------------------------------------------------ */
  function maaLeveres(adresse, opsaetning) {
    var o = opsaetning || OPSAETNING;
    if (!adresse || typeof adresse !== 'object') {
      return { svar: 'nej', grund: 'INGEN_ADRESSE', zone: null };
    }

    var numre = Array.isArray(o.postnumre) ? o.postnumre.map(Number) : [];
    if (numre.length) {
      var nr = Number(String(adresse.postnr || '').replace(/\D/g, ''));
      if (!isFinite(nr) || numre.indexOf(nr) === -1) {
        return { svar: 'nej', grund: 'POSTNUMMER_UDEN_FOR', zone: null };
      }
    }

    var punkt = [adresse.lng, adresse.lat];
    if (!gyldigtPunkt(punkt)) {
      return { svar: 'nej', grund: 'UGYLDIGT_PUNKT', zone: null };
    }

    var z = zoneSvar(punkt, o.zoner);
    if (z.svar === 'nej') {
      return { svar: 'nej', grund: 'UDEN_FOR_ZONEN', zone: null };
    }
    return { svar: z.svar, grund: null, zone: z.zone };
  }

  window.MosedeZone = {
    opsaetning: OPSAETNING,
    gyldigtPunkt: gyldigtPunkt,
    iPolygon: iPolygon,
    zoneSvar: zoneSvar,
    maaLeveres: maaLeveres,
  };
}());
