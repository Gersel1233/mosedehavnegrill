/* ============================================================
   KVITTERINGEN, DER LEVER  (4/9)
   ------------------------------------------------------------
   Kundens ord: systemet skal være "dygtigere, mere intelligent
   og generelt bedre".

   MÅLT, før filen blev skrevet: gæsten hører ikke ét ord, efter
   hun har trykket send. Kvitteringen lever kun i den fane, hun
   står i — lukker hun den, er den væk, og der findes ingen
   adresse, hun kan vende tilbage til. Ved bordet får hun "vi
   kommer med det" og så stilhed.

   Og det værste: **Afvis er et telefonopkald, nogen skal huske.**
   Kan køkkenet ikke lave maden, står beskeden på personalets
   skærm — ikke på gæstens.

   ⚠️ SIDEN HENTER KUN ÉT KALD. Butik.hent() lægger otte tabeller
   på nettet; den her side skal virke på en telefon med to
   bjælker nede ved vandet. Derfor kun opslaget — og
   telefonnummeret står i HTML'en, som det gør på hver anden side
   (js/skal/kontakt.js bytter det de steder, der HAR hentet
   indstillingerne; her ville byttet koste otte tabeller for én
   linje tekst).

   ⚠️ OG DEN SPØRGER IKKE I ÉT VÆK. Takten er 20 sekunder, den
   stopper, når bestillingen er lukket (afhentet, serveret,
   afvist, udeblevet), og den holder pause, mens fanen er skjult.
   En side, der banker på hvert sekund i en time, er en
   telefonbatteri, gæsten bruger på at vente.
   ============================================================ */
(function () {
  'use strict';

  var TAKT_MS = 20000;
  var boks = document.getElementById('mb-indhold');
  if (!boks || !window.Butik) return;

  var timer = null;
  var sidsteStatus = null;

  /* ---- GÆSTENS EGNE ORD, IKKE DATABASENS -------------------
     Databasen siger `bekraeftet`, `tilberedes`, `serveret`.
     Personalets skærm oversætter dem til personalets sprog
     (Admin.statusNavn); gæsten skal have SIT.

     ⚠️ OG `afvist` MÅ ALDRIG BARE STÅ SOM "AFVIST". Det er den
     ene besked, hele siden er bygget for: hun skal vide, at
     maden ikke kommer, OG hvad hun gør ved det. */
  var TRIN = ['ny', 'bekraeftet', 'tilberedes', 'klar'];

  function billede(b) {
    var bord = b.bord_nummer;
    var st = b.status;

    if (st === 'afvist') {
      return {
        slags: 'stop',
        tegn: '✕',
        titel: 'Vi kunne ikke lave den',
        tekst: 'Køkkenet har måttet sige nej til den her bestilling. '
          + 'Ring til os, så finder vi ud af det sammen — vi prøver at '
          + 'fange dig, men det er hurtigere, hvis du ringer.',
      };
    }
    if (st === 'udeblevet') {
      return {
        slags: 'stop',
        tegn: '·',
        titel: 'Den blev ikke hentet',
        tekst: 'Maden står ikke længere klar. Ring til os, hvis der er '
          + 'sket en misforståelse.',
      };
    }
    if (st === 'afhentet' || st === 'serveret') {
      return {
        slags: 'faerdig',
        tegn: '✓',
        titel: bord ? 'Serveret' : 'Afhentet',
        tekst: 'Tak — og velbekomme. Vi ses igen på havnen.',
      };
    }
    if (st === 'klar') {
      return {
        slags: 'klar',
        tegn: '✓',
        titel: bord ? 'Den er på vej ud' : 'Din mad er klar',
        tekst: bord
          ? 'Vi kommer ud til bord ' + bord + ' med det.'
          : 'Kom hen til lugen og sig dit nummer.',
      };
    }
    if (st === 'tilberedes') {
      return {
        slags: 'igang',
        tegn: '🍳',
        titel: 'Maden er i gang',
        tekst: bord
          ? 'Køkkenet er i gang. Vi kommer ud til bord ' + bord + '.'
          : 'Køkkenet er i gang med den.',
      };
    }
    /* ny og bekraeftet ser ens ud for gæsten — hun har sendt den,
       og vi har den. At skelne ville være at fortælle hende, om
       personalet har set kortet endnu, og det kan hun ikke bruge
       til noget. */
    return {
      slags: 'modtaget',
      tegn: '✓',
      titel: 'Vi har din bestilling',
      tekst: bord
        ? 'Vi laver den nu og kommer ud til bord ' + bord + '.'
        : 'Den ligger i køkkenet. Du kan følge med her.',
    };
  }

  function lav(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = tekst;
    return e;
  }

  function kroner(n) {
    var t = Number(n);
    return isFinite(t) ? String(Math.round(t)) + ',-' : '';
  }

  /* Klokkeslæt med PUNKTUM. Huset skriver "kl. 13.00" alle steder
     — to steder skrev kolon 4/9, og gæsten så begge former på den
     samme side. */
  function klokken(t) {
    var m = /^(\d{1,2}):(\d{2})/.exec(String(t || ''));
    return m ? 'kl. ' + m[1] + '.' + m[2] : '';
  }

  function dagTekst(iso) {
    if (!iso) return '';
    var iDag = Butik.nu().dato;
    if (iso === iDag) return 'i dag';
    var g = new Date(iDag + 'T12:00:00');
    g.setDate(g.getDate() + 1);
    if (iso === g.toISOString().slice(0, 10)) return 'i morgen';
    var d = new Date(iso + 'T12:00:00');
    return Butik.UGEDAGE[(d.getDay() + 6) % 7].toLowerCase()
      + ' d. ' + d.getDate() + '.';
  }

  function tegnTrin(status) {
    var stribe = lav('ol', 'mb-trin');
    var naaet = TRIN.indexOf(status);
    if (status === 'afhentet' || status === 'serveret') naaet = TRIN.length;
    /* ⚠️ FIRE KORTE ORD. "Set af køkkenet" brækkede over to
       linjer på en iPhone 13 og gjorde striben skæv — set på et
       skud, ikke læst. Og "Bestilt/Modtaget" sagde næsten det
       samme to gange; "Sendt" er hendes handling, "Modtaget" er
       vores svar. */
    var navne = ['Sendt', 'Modtaget', 'I gang', 'Klar'];
    navne.forEach(function (n, i) {
      var li = lav('li', 'mb-trin-et' + (i <= naaet ? ' naaet' : ''));
      li.appendChild(lav('span', 'mb-trin-prik', i <= naaet ? '✓' : ''));
      li.appendChild(lav('span', 'mb-trin-navn', n));
      stribe.appendChild(li);
    });
    return stribe;
  }

  function tegn(b) {
    var v = billede(b);
    boks.textContent = '';

    var kort = lav('div', 'mb-kort mb-' + v.slags);

    var hak = lav('div', 'mb-hak', v.tegn);
    kort.appendChild(hak);
    kort.appendChild(lav('h1', 'mb-titel', v.titel));
    kort.appendChild(lav('p', 'mb-tekst', v.tekst));

    /* Nummeret er dét, hun siger højt ved lugen — det er det
       store. Findes der ikke et (filen ikke kørt, en gammel
       række), står referencen alene, som kvitteringen gør. */
    var kode = lav('div', 'mb-nr');
    if (b.nummer) {
      kode.appendChild(lav('span', 'mb-nr-navn', 'Bestillingsnummer'));
      kode.appendChild(lav('strong', 'mb-nr-tal',
        '#' + ('000' + b.nummer).slice(-4)));
    } else {
      kode.appendChild(lav('span', 'mb-nr-navn', 'Jeres reference'));
      kode.appendChild(lav('strong', 'mb-nr-tal', ref()));
    }
    kort.appendChild(kode);

    if (v.slags !== 'stop') kort.appendChild(tegnTrin(b.status));

    /* Hvornår og hvor. Et bord har ingen hentetid — maden bæres
       ud, når den er klar — så linjen ville være et klokkeslæt,
       ingen har aftalt. */
    /* ⚠️ EN AFVIST BESTILLING LOVER INGEN HENTETID. Set på et
       skud, ikke læst: kortet sagde "Vi kunne ikke lave den" og
       lige nedenunder "Hentes i dag kl. 13.00" — altså en aftale
       om mad, der ikke kommer. Det er den værst tænkelige
       modsigelse på netop den skærm. */
    var linjer = lav('dl', 'mb-fakta');
    function fakta(navn, vaerdi) {
      if (!vaerdi) return;
      linjer.appendChild(lav('dt', null, navn));
      linjer.appendChild(lav('dd', null, vaerdi));
    }
    if (v.slags !== 'stop') {
      if (b.bord_nummer) {
        fakta('Bord', b.bord_nummer);
      } else {
        fakta(b.hvordan === 'levering' ? 'Leveres' : 'Hentes',
          (dagTekst(b.hent_dato) + ' ' + klokken(b.hent_tid)).trim());
      }
    }
    if (linjer.childNodes.length) kort.appendChild(linjer);

    /* Hvad hun bestilte. ⚠️ Summen regnes af linjerne — der er
       ingen i_alt-kolonne i databasen (målt), og ét sted at regne
       er bedre end to, der kan blive uenige. */
    if (Array.isArray(b.linjer) && b.linjer.length) {
      var liste = lav('ul', 'mb-varer');
      var sum = 0;
      b.linjer.forEach(function (l) {
        var antal = Number(l.antal) || 0;
        var pris = Number(l.pris);
        if (isFinite(pris)) sum += pris * antal;
        var li = lav('li');
        li.appendChild(lav('span', 'mb-antal', antal + '×'));
        li.appendChild(lav('span', 'mb-navn',
          l.navn + (l.variant ? ' · ' + l.variant : '')));
        li.appendChild(lav('span', 'mb-pris',
          isFinite(pris) ? kroner(pris * antal) : ''));
        liste.appendChild(li);
      });
      kort.appendChild(liste);
      if (sum > 0) {
        var i_alt = lav('p', 'mb-ialt');
        i_alt.appendChild(lav('span', null, 'I alt'));
        i_alt.appendChild(lav('strong', null, kroner(sum)));
        kort.appendChild(i_alt);
      }
    }

    /* ⚠️ BETALES VED LUGEN — ALDRIG "BETALT". Der er ingen
       betaling i systemet (Mikkel 25/8: "de gør det via kassen"),
       og en side, der siger betalt, er penge ud ad døren.

       ⚠️ OG DEN STÅR IKKE PÅ EN AFVIST BESTILLING. Hun skal ikke
       betale for mad, hun ikke får — set på det samme skud som
       hentetiden ovenfor. Summen bliver stående: den fortæller
       hende, HVILKEN bestilling det var. */
    if (v.slags !== 'stop') {
      kort.appendChild(lav('p', 'mb-fine', 'Betales ved lugen som altid.'));
    }

    var ring = lav('a', 'mb-ring');
    ring.href = 'tel:+4528871343';
    ring.textContent = 'Ring til os på 28 87 13 43';
    kort.appendChild(ring);

    boks.appendChild(kort);
  }

  function fejl(besked, medFelt) {
    boks.textContent = '';
    var kort = lav('div', 'mb-kort mb-tom');
    kort.appendChild(lav('h1', 'mb-titel', 'Vi kan ikke finde den'));
    kort.appendChild(lav('p', 'mb-tekst', besked));
    if (medFelt) kort.appendChild(felt());
    var ring = lav('a', 'mb-ring');
    ring.href = 'tel:+4528871343';
    ring.textContent = 'Ring til os på 28 87 13 43';
    kort.appendChild(ring);
    boks.appendChild(kort);
  }

  /* ⚠️ ET FELT, HUN KAN SKRIVE I. Kvitteringen er måske lukket,
     men referencen står i den sms eller den mail, hun har — og et
     bogmærke uden ?ref= er ellers en blindgyde. */
  function felt() {
    var form = document.createElement('form');
    form.className = 'mb-soeg';
    var mrk = lav('label', null, 'Skriv din reference');
    mrk.setAttribute('for', 'mb-ref');
    var input = document.createElement('input');
    input.id = 'mb-ref';
    input.className = 'mb-felt';
    input.placeholder = 'fx SM260904-K3F9X';
    input.autocapitalize = 'characters';
    input.spellcheck = false;
    var knap = lav('button', 'mb-knap', 'Find bestillingen');
    knap.type = 'submit';
    form.appendChild(mrk);
    form.appendChild(input);
    form.appendChild(knap);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = String(input.value || '').trim().toUpperCase();
      if (!v) return;
      /* Adressen skiftes, så siden kan bogmærkes og deles — og så
         en genindlæsning viser den samme bestilling. */
      location.search = '?ref=' + encodeURIComponent(v);
    });
    return form;
  }

  function ref() {
    var m = /[?&]ref=([^&]+)/.exec(location.search);
    return m ? decodeURIComponent(m[1]).trim().toUpperCase() : '';
  }

  function faerdig(status) {
    return status === 'afhentet' || status === 'serveret'
      || status === 'afvist' || status === 'udeblevet';
  }

  function hent() {
    var r = ref();
    if (!r) {
      fejl('Vi mangler din reference. Den står på kvitteringen, du fik, '
        + 'da du bestilte.', true);
      return;
    }
    Butik.bestillingStatus(r).then(function (b) {
      if (!b) {
        /* ⚠️ DE TRE UDFALD SER ENS UD UDADTIL: ukendt, slettet og
           for gammel. Siden må ikke kunne bruges til at afgøre,
           OM en reference findes. */
        fejl('Vi kan ikke finde en bestilling med den reference. '
          + 'Er den fra i går eller før, er den lukket her — '
          + 'ring til os, hvis der er noget galt.', true);
        stop();
        return;
      }
      /* Tegn kun om, når der FAKTISK er sket noget. En side, der
         bygger sig selv op hvert 20. sekund, flimrer under
         fingeren — samme regel som admins lister. */
      if (b.status !== sidsteStatus) {
        sidsteStatus = b.status;
        tegn(b);
      }
      if (faerdig(b.status)) stop();
    });
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function start() {
    stop();
    timer = setInterval(function () {
      if (document.hidden) return;
      hent();
    }, TAKT_MS);
  }

  /* Kommer fanen frem igen, spørger vi med det samme — ellers
     står gæsten med et gammelt svar i op til tyve sekunder,
     præcis når hun kigger. */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && timer) hent();
  });

  hent();
  start();
}());
