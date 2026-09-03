/* Fanen Overblik: vagtskærmen. Se js/admin/kerne.js for de to
   principper, der gælder i alle admin-filerne.

   ============================================================
   ⚠️ LUGEN OG BORDENE ER TO FORSKELLIGE STRØMME
   ============================================================
   Kundens ord (26/8): "det er rodet at både qr bestillinger er
   der og online bestillinger — du skal huske online bestillinger
   er bare bestillinger til lugen dernede, hvor at selve
   qr bestillinger skal i en separat ting."

   Han har ret, og det er ikke smag. De to har forskelligt
   ARBEJDE bag sig:

   - En bestilling fra hjemmesiden har en HENTETID. Den skal være
     klar, når gæsten står ved lugen, og den kan ligge timer ude i
     fremtiden. Arbejdet er at ramme et klokkeslæt.
   - En bestilling fra en QR-kode på bord 7 har ingen hentetid.
     Den skal laves NU og bæres ud til et bord. Arbejdet er at
     komme af sted.

   Stod de i den samme liste sorteret efter tid, ville bord 7 —
   hentetid = nu — altid ligge øverst og skubbe den frokost, der
   skal være klar kl. 12.30, ned. Og omvendt ville et bord, der
   har ventet, forsvinde blandt ti afhentninger.

   Bordene har derfor deres egen skærm (fanen Køkken-kø), og
   Overblik LISTER dem ikke. Den siger, at de findes, og hvor
   mange — og fører derhen. En kø, man skal kigge to steder efter,
   er en kø, der bliver glemt det ene sted.

   ============================================================
   HVORFOR TIDSRÆKKEFØLGE
   ============================================================
   Fanen var engang bygget om "hvad er tikket ind, mens jeg ikke
   kiggede", sorteret efter hvornår bestillingen KOM IND — fordi
   der skulle ringes og bekræftes. Den begrundelse faldt bort
   23/8: auto_bekraeft er slået til, bestilt er bestilt.

   MÅLT PÅ EN TRAVL DAG: klokken 13.00, fem bestillinger. Sara,
   der henter kl. 18.00, stod som nummer to — fordi hun havde
   bestilt ni minutter før. Køkkenet skulle læse fem kort igennem
   for at finde ud af, hvad der skulle laves først.

   Spørgsmålet under en vagt er: HVAD SKAL UD AF DØREN, OG HVORNÅR.

   Fanen henter ingenting selv. Bestillinger og forespørgsler er
   allerede hentet af deres egne faner, og de melder deres lister
   ind i Admin.lister. Et kald mere for de samme rækker ville være
   et kald for meget — og to kilder, der kan nå at være uenige. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  /* Tre timer. Kortere, og en medarbejder, der har haft travlt ved
     lugen i en frokost, går glip af det, der kom imens. Længere, og
     listen bliver til endnu en liste over alt — og så er der ikke
     noget "lige" tilbage i "lige modtaget". */
  var VINDUE_MS = 3 * 60 * 60 * 1000;

  /* To timer frem. Kortere, og listen tømmer sig midt i en
     frokost. Længere, og "nu" holder op med at betyde noget:
     hele dagen står i den ene boks igen. */
  var SNART_MIN = 120;

  var FAERDIG = { afhentet: true, serveret: true, afvist: true, udeblevet: true };

  function minutterSiden(iso) {
    var t = Date.parse(iso || '');
    if (!isFinite(t)) return null;
    return Math.floor((Date.now() - t) / 60000);
  }

  function hvornårTekst(min) {
    if (min < 1) return 'LIGE NU';
    if (min < 60) return 'FOR ' + min + ' MINUTTER SIDEN';
    var timer = Math.floor(min / 60);
    return 'FOR ' + timer + (timer === 1 ? ' TIME SIDEN' : ' TIMER SIDEN');
  }

  function tilMinutter(tid) {
    var m = /^(\d{1,2}):(\d{2})/.exec(String(tid || ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }

  function klokken(min) {
    return Math.floor(min / 60) + '.' + String(min % 60).padStart(2, '0');
  }

  /* ⚠️ ÉN KENDING PÅ "DEN HER HØRER TIL BORDENE", og alle bruger
     den. Skrives testen b.bord_nummer ud ti steder, er der ti
     steder at glemme den den dag, en bordbestilling får en ny
     form — og en glemt ét sted betyder, at bord 7 dukker op i
     lugens liste igen. */
  function erBord(b) { return !!b.bord_nummer; }

  function iDagsBestillinger() {
    var dato = Butik.nu().dato;
    return (Admin.lister.bestillinger || []).filter(function (b) {
      return !b.slettet && b.hent_dato === dato;
    });
  }

  /* ============================================================
     VARELINJERNE SOM PUNKTER — FORLÆGGETS EGEN FORM  (1/9)
     ------------------------------------------------------------
     Kundens skærmbillede af forlægget på en telefon: hver vare
     står på SIN egen linje med et punkt foran og antallet
     fremhævet — "• 2 × Paprikagryde med kartoffelmos."

     Vores stod som én løbende sætning med prikker imellem: "1 ×
     Flæskestegssandwich · 1 × Bøfsandwich · 1 × Cheesebaconburger
     · 1 × Dobbeltburger · 1 × Cheeseburger". Den skal LÆSES for
     at tælles, og køkkenet skimmer.

     ⚠️ EMBALLAGEN ER IKKE EN VARE. Den har sin egen kasse
     nedenfor, som på bestillingskortet — se Butik.erEmballage. */
  function varelinjer(b) {
    var ul = lav('ul', 'vagt-varer');
    var nogen = false;
    (b.linjer || []).forEach(function (l) {
      if (Butik.erEmballage && Butik.erEmballage(Admin.data, l)) return;
      nogen = true;
      var li = lav('li');
      li.appendChild(lav('b', 'vagt-antal', (l.antal || 1) + ' \u00D7'));
      li.appendChild(document.createTextNode(' ' + l.navn
        + (l.variant ? ' (' + l.variant + ')' : '')));
      /* Dagens ret får sit eget mærke, som i forlægget — den er
         dét, køkkenet har lovet netop den dag. */
      var ret = (Butik.dagensRetter(Admin.data || {}, b.hent_dato) || [])[0];
      if (ret && ret.navn && String(ret.navn).trim().toLowerCase()
          === String(l.navn || '').trim().toLowerCase()) {
        li.appendChild(lav('span', 'maerke favorit', 'Dagens ret'));
      }
      ul.appendChild(li);
    });
    if (!nogen) {
      var li2 = lav('li');
      li2.appendChild(lav('b', 'vagt-antal', (b.antal || 0) + ' stk.'));
      ul.appendChild(li2);
    }
    return ul;
  }

  /* Emballagen som forlæggets egen kasse — den forklarer totalen
     uden at lade som om der skal laves noget. Samme regel og
     samme klasse som bestillingskortet. */
  function emballageKasse(b) {
    var e = (b.linjer || []).filter(function (l) {
      return Butik.erEmballage && Butik.erEmballage(Admin.data, l);
    })[0];
    if (!e) return null;
    var antal = Number(e.antal) || 0;
    return lav('p', 'bestil-emballage',
      '\uD83D\uDCE6 ' + (String(e.navn || '').trim() || 'Emballage')
      + ': ' + antal + ' stk. (' + Butik.pris((Number(e.pris) || 0) * antal) + ')');
  }

  function linjeTekst(b) {
    return (b.linjer || []).map(function (l) {
      /* ⚠️ VARIANTEN SKAL MED. Linjens navn er STØRRELSEN
         ("Smørrebrød"), fordi databasens pris- og udsolgt-værn
         slår op på menukortets navne — men et køkken, der får
         "3 × Smørrebrød" uden at vide hvad der skal på, kan ikke
         smøre dem. Se noten i Butik.bestil. */
      return l.antal + ' × ' + l.navn + (l.variant ? ' (' + l.variant + ')' : '');
    }).join(' · ') || (b.antal || 0) + ' stk.';
  }

  // ----------------------------------------------------------
  //  DAGENS FORLØB — kun det, der skal ud ad LUGEN
  //  --------------------------------------------------------
  //  Bordene er ikke med (se noten øverst). Bordbookinger ER:
  //  køkkenet skal vide, at der kommer seks personer kl. 18, på
  //  samme skærm som maden — det er en aftale med en tid, præcis
  //  som en afhentning.
  //
  //  DET FÆRDIGE ER IKKE MED I FORLØBET. En afhentet bestilling
  //  er ikke arbejde længere. Den er ikke VÆK — den ligger i
  //  "Færdige" nedenfor, så en fejl kan gøres om.
  // ----------------------------------------------------------
  function dagensArbejde() {
    var ud = [];

    iDagsBestillinger().forEach(function (b) {
      if (FAERDIG[b.status] || erBord(b)) return;
      ud.push({
        min: tilMinutter(b.hent_tid),
        tid: String(b.hent_tid || '').slice(0, 5).replace(':', '.'),
        navn: b.navn,
        hvad: linjeTekst(b),
        /* Leveringen skal ses her OGSÅ. En bestilling, der skal
           køres ud, har en afgang og ikke et afhentningstidspunkt
           — ser køkkenet den som en almindelig afhentning, står
           maden klar ved lugen, mens gæsten venter derhjemme.

           TAPASFADET SLÅR RESTEN. Et fad til tolv er dagens
           største stykke arbejde, og det skal ses på vagtskærmen,
           før nogen begynder på en pølse. */
        maerke: Admin.erTapas(b) ? '🧀 Tapasfad'
          : b.hvordan === 'levering' ? '🚗 Leveres'
            : b.hvordan === 'spis_her' ? '🍽️ Spis her' : '',
        /* ⚠️ ALLERGIEN ER SIT EGET MÆRKE OG ERSTATTER IKKE DE
           ANDRE. Et tapasfad til tolv med en nøddeallergi er
           begge dele, og vælger man ét af dem, taber man det
           andet. Den står FØRST af samme grund som den røde
           ramme i køkken-køen: forskellen på en middag og en
           ambulance må ikke ligge i, hvor godt nogen nåede at
           læse. */
        allergi: Admin.erAllergi(b),
        ny: b.status === 'ny',
        // Selve bestillingen med, så knappen på rækken kan flytte
        // den videre uden et faneskift.
        b: b,
        /* ⚠️ HVOR KOMMER DEN FRA? (31/8)

           Kundens ord: *"der skal i Overblik tydeligt være
           forskel på online bestillinger og bestillinger fra
           bordet."*

           Bordenes egne bestillinger står ikke i forløbet (de har
           Køkken-kø), men rækken skal alligevel SIGE, hvad den
           er: en online bestilling til lugen og en booket bord
           er to vidt forskellige stykker arbejde, og de stod med
           det samme ansigt. Kilden er et felt og ikke et gæt på
           mærkatteksten — så en ny slags række ikke tavst arver
           en andens farve. */
        kilde: 'lugen',
        fane: 'p-bestillinger', faneNavn: 'Bestillinger',
      });
    });

    var dato = Butik.nu().dato;
    (Admin.lister.borde || []).forEach(function (b) {
      if (b.slettet || b.status === 'afvist' || b.status === 'udeblevet') return;
      if (b.dato !== dato) return;
      ud.push({
        min: tilMinutter(b.tid),
        tid: String(b.tid || '').slice(0, 5).replace(':', '.'),
        navn: b.navn,
        hvad: (b.antal_personer || '?') + ' personer',
        maerke: '',
        ny: b.status === 'ny',
        kilde: 'booking',
        fane: 'p-borde', faneNavn: 'Borde',
      });
    });

    /* Uden et klokkeslæt kan rækken ikke placeres i en tidslinje.
       Den skal ikke forsvinde — den skal stå ØVERST, så nogen
       kigger på den. */
    return ud.sort(function (a, b) {
      if (a.min === null) return -1;
      if (b.min === null) return 1;
      return a.min - b.min;
    });
  }

  /* ⚠️ TIDEN BYGGES ÉT STED. Den færdige række skrev sin egen
     (ren tekst uden "kl."), og MÅLT på et skud stod "12.00"
     under et "kl. 17.30" i den samme liste — to udgaver af den
     samme akse, og den ene så ud som en eftertanke. */
  function tidsAkse(tekst) {
    var tid = lav('div', 'vagt-tid');
    if (tekst) {
      tid.appendChild(lav('span', 'vagt-tid-kl', 'kl.'));
      tid.appendChild(lav('b', 'vagt-tid-tal', tekst));
    } else {
      tid.appendChild(lav('b', 'vagt-tid-tal', '\u2014'));
    }
    return tid;
  }

  function vagtRaekke(r, nu) {
    var overskredet = r.min !== null && r.min < nu.minutter;
    var k = lav('div', 'vagt-raekke kilde-' + (r.kilde || 'lugen')
      + (overskredet ? ' overskredet' : ''));

    /* ⚠️ TIDEN STÅR UDEN FOR KORTET, PÅ TO LINJER — forlæggets
       egen form: "kl." over "16:00". Den er tidslinjens akse, og
       den skal kunne skimmes ned ad venstre kant uden at læse
       kortene. */
    k.appendChild(tidsAkse(r.tid));

    var midt = lav('div', 'vagt-midt');
    var linje = lav('div', 'bestil-hvem');
    /* ⚠️ KILDEN STÅR FØRST, FØR NAVNET. Den, der skimmer listen,
       skal kunne se på ÉN kolonne, om rækken er mad, der skal ud
       ad lugen, eller et bord, der er booket — uden at læse
       teksten. Mærkatet bærer selv sit ord; farven alene ville
       være ubrugelig for den, der ikke kan se forskel på dem. */
    /* ⚠️ NAVNET FØRST, MÆRKATET EFTER — forlæggets rækkefølge.
       Kilden stod først (30/8), fordi den skulle kunne skimmes i
       én kolonne; det gør kortets KANT nu, i sin egen farve. Og
       navnet er dét, personalet siger højt ved lugen. */
    linje.appendChild(lav('span', 'vare-navn',
      Admin.pæntNavn ? Admin.pæntNavn(r.navn) : r.navn));
    linje.appendChild(lav('span', 'maerke kilde-maerke',
      r.kilde === 'booking' ? '📅 Bordbooking' : '🥡 To-go'));
    if (r.allergi) linje.appendChild(lav('span', 'maerke m-allergi', '⚠️ Allergi'));
    if (r.ny) linje.appendChild(lav('span', 'maerke m-ny', 'Ny'));
    if (r.maerke) linje.appendChild(lav('span', 'maerke favorit', r.maerke));
    if (overskredet) linje.appendChild(lav('span', 'maerke m-ny', 'Overskredet'));
    midt.appendChild(linje);
    /* ⚠️ ÉN VARE PR. LINJE, IKKE ÉN LANG SÆTNING. Se varelinjer(). */
    if (r.b) {
      midt.appendChild(varelinjer(r.b));
      var emb = emballageKasse(r.b);
      if (emb) midt.appendChild(emb);
    } else {
      midt.appendChild(lav('div', 'vare-tekst', r.hvad));
    }
    /* ⚠️ NUMMERET OG KONTAKTEN STOD KUN PÅ BESTILLINGER-FANEN.
       Personalet står ved lugen med Overblik åben; for at ringe
       til den, der ikke er kommet, skulle de skifte fane og finde
       kortet igen. Kundens ord 1/9: "telefon nummer". Reglen bor
       i Admin.kontakt, så de to faner ikke kan komme til at vise
       nummeret på hver sin måde. */
    if (r.b) {
      var kontakt = lav('div', 'vagt-kontakt');
      /* Rækkefølgen er forlæggets: "kl. 16.00 · 📞 61799448".
         Nummeret står sidst — det bruges til opslag, ikke til at
         handle på. */
      if (r.tid) kontakt.appendChild(lav('span', 'vagt-kl', 'kl. ' + r.tid));
      (Admin.kontakt ? Admin.kontakt(r.b) : []).forEach(function (e) {
        kontakt.appendChild(e);
      });
      /* ⚠️ BESTILLINGSNUMMERET STÅR IKKE HER. Forlægget har det
         ikke på rækken, og det er rigtigt: linjen er "kl. 16.00 ·
         📞 61799448", og et tredje led brækkede den i to. Nummeret
         bruges til opslag, ikke til at handle på — det hører til
         på bestillingskortet, hvor det står i forvejen. */
      if (kontakt.childNodes.length) midt.appendChild(kontakt);
    }
    k.appendChild(midt);

    /* ---- HANDLINGEN PÅ RÆKKEN ----
       Kundens ord (26/8): "på overblik skal man trykke færdig på
       online bestillinger?" Man skulle skifte fane for at flytte
       en bestilling videre — og midt i en frokost, med gæsten
       stående ved lugen, er et faneskift ét skridt for meget.

       ⚠️ TRINNET KOMMER FRA BESTILLINGER-FANEN (Admin.naesteTrin)
       og er ikke skrevet af. To udgaver af "hvad sker der efter
       klar?" ville langsomt sige noget forskelligt, og så havde
       den samme bestilling to forskellige næste trin, alt efter
       hvilken fane man stod på.

       Bookinger har ingen knap: et bord flyttes videre på sin
       egen fane, hvor pladserne og dagens billede står. */
    /* ⚠️ HANDLINGERNE LIGGER I DERES EGEN KOLONNE (30/8).

       De to knapper var direkte børn af grid'et og faldt derfor
       under teksten, hver på sin linje. MÅLT på en 1280 px skærm
       med tre bestillinger: hver række blev 166 px høj, mens
       højre halvdel af kortet stod tom — tre bestillinger fyldte
       en halv skærm, og en travl fredag med ti ville kræve, at
       man rullede for at se, hvad der skal ud kl. 13.

       Samme rettelse som forespørgselskortet fik 29/8: sagen
       læses fra venstre, og handlingen ligger, hvor øjet ender.
       Under 900 px falder de under igen — på en telefon ville en
       tredje kolonne give en knapsøjle med ordene brækket over
       fire linjer. */
    var handling = lav('div', 'vagt-handling');

    var trin = r.b && Admin.naesteTrin && Admin.naesteTrin(r.b.status);
    if (trin) {
      var frem = lav('button', 'knap primaer gron vagt-frem', '✓ ' + trin.navn);
      frem.type = 'button';
      frem.addEventListener('click', function () {
        /* ⚠️ SAMME SPØRGSMÅL SOM PÅ BESTILLINGER-FANEN, og det er
           derfor det bor i Admin.spoergFoerst: en levering er
           lovet et opkald i kvitteringen, og de to skærme må ikke
           kunne komme til at sige hver sit om den samme
           bestilling. Personalet skifter mellem dem hele dagen. */
        var spg = Admin.spoergFoerst && Admin.spoergFoerst(r.b);
        if (spg && !window.confirm(spg)) return;
        frem.disabled = true;
        /* friskOp og ikke Admin.gem: Admin.gem henter
           indstillinger og menukort — ikke bestillingerne. Se
           noten ved Gendan nedenfor. */
        Butik.skrive.bestillingStatus(r.b.id, trin.status)
          .then(function () { return Admin.friskOp(); })
          .then(function () {
            Admin.kvitter(r.navn + ' er sat til "' + trin.efter + '".');
          })
          .catch(function (e) {
            frem.disabled = false;
            Admin.brøl(e && e.message || String(e));
          });
      });
      handling.appendChild(frem);
    }

    /* ⚠️ DØREN ER "···", SOM PÅ BESTILLINGSKORTET  (1/9).
       Forlægget har præcis to knapper på rækken: den grønne
       fremad og en "···". Vores havde et bredt "Bestillinger →"
       ved siden af den grønne — to lige store knapper, hvor den
       ene er dagens arbejde og den anden en genvej man bruger
       sjældent.

       En knap og ikke et link: der skiftes fane på siden, der
       hoppes ikke til en adresse. Et <a href="#"> ville se ens ud
       og opføre sig forkert med tastaturet. */
    var mere = lav('div', 'bestil-mere');
    var merKnap = lav('button', 'knap-mere', '\u00B7\u00B7\u00B7');
    merKnap.type = 'button';
    merKnap.setAttribute('aria-expanded', 'false');
    merKnap.setAttribute('aria-label', 'Flere handlinger for ' + r.navn);
    merKnap.addEventListener('click', function () {
      var aaben = mere.classList.toggle('aaben');
      merKnap.setAttribute('aria-expanded', aaben ? 'true' : 'false');
    });
    mere.appendChild(faneKnap(r.fane, r.faneNavn + ' →'));
    handling.appendChild(merKnap);
    handling.appendChild(mere);
    /* ⚠️ KNAPPERNE HØRER TIL INDE I KORTET. Lagt uden for stod de
       som en fritsvævende række under en kant, og på en telefon
       kunne man ikke se, hvilken bestilling de hørte til. */
    midt.appendChild(handling);
    return k;
  }

  function faneKnap(fane, tekst) {
    var knap = lav('button', 'knap sekundaer', tekst);
    knap.type = 'button';
    knap.addEventListener('click', function () {
      Admin.visFane(fane);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return knap;
  }

  /* Hvilke sager stod der sidst? null = vi har ikke hentet endnu.
     Se noten ved markeringen nedenfor. */
  var kendteSager = null;

  function tegnForloeb() {
    var boks = $('overblik-vagt');
    if (!boks) return;
    /* ⚠️ INGEN Admin.tøm() HER. Den stod her, og så var
       tegnRaekker nedenfor uden virkning: der var aldrig noget at
       genbruge, og listen blev revet ned ved hver hentning
       alligevel. Den tomme tilstand rydder selv. */

    var nu = Butik.nu();
    var alle = dagensArbejde();

    /* "Snart" er alt, der ikke er overstået, indtil to timer frem.
       DET OVERSKREDNE BLIVER I DEN ØVERSTE GRUPPE: en gæst, der
       skulle have hentet kl. 13.15, og som ikke har, er ikke
       mindre vigtig kl. 13.20 — hun er mere. */
    var snart = [], senere = [];
    alle.forEach(function (r) {
      if (r.min === null || r.min <= nu.minutter + SNART_MIN) snart.push(r);
      else senere.push(r);
    });

    if (!alle.length) {
      /* Tomt er et SVAR, ikke en tom skærm. Står der ingenting,
         tror man, siden ikke virker — og så begynder nogen at
         genindlæse i stedet for at passe forretningen. */
      /* ⚠️ EN STIPLET KASSE, IKKE EN LINJE (30/8). Kundens
         skærmbilleder viser den tomme tilstand som en ramme med
         én sætning i midten — det ses som "her kommer der noget"
         i stedet for "her mangler der noget". Sætningen er
         Mosedes egen. */
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'plan-tom tom-plads',
        'Ingen bestillinger eller aftaler endnu i dag — '
        + 'listen fyldes op, efterhånden som gæsterne bestiller.'));
      if (Admin.lister.bestillinger !== undefined) kendteSager = [];
      return;
    }

    /* ⚠️ RÆKKE FOR RÆKKE, IKKE HELE LISTEN NED OG OP IGEN (31/8).

       Her stod Admin.tøm() efterfulgt af appendChild pr. række, og
       hele forløbet blev revet ned ved HVER hentning. Det gik an,
       da takten var ét minut. Kunden bad om, at nye ting lander
       "straks og uden at refreshe" — og med 8-30 sekunder mellem
       hentningerne ville skærmen blinke hele dagen, og det kort,
       fingeren var på vej ned mod, ville forsvinde under den.

       Det er nøjagtig den fejl, Bestillinger-fanen fik rettet
       31/8. Admin.tegnRaekker sammenligner et aftryk pr. række og
       lader det uændrede stå.

       ⚠️ OVERSKRIFTERNE ER EGNE RÆKKER med egne nøgler. Bygges de
       som en beholder om rækkerne, tegnes hele bunken om, hver
       gang ÉN række ændrer sig — og så er vi tilbage ved
       blinket. Samme greb som Forespørgsler-fanen 29/8. */
    var raekker = [];
    if (snart.length) {
      raekker.push({
        noegle: 'h-snart',
        aftryk: klokken(nu.minutter),
        byg: function () {
          return lav('div', 'forloeb-hoved',
            'Nu og de næste to timer · kl. ' + klokken(nu.minutter));
        },
      });
      snart.forEach(function (r) { raekker.push(forloebRaekke(r, nu)); });
    }
    if (senere.length) {
      raekker.push({
        noegle: 'h-senere',
        aftryk: 'fast',
        byg: function () { return lav('div', 'forloeb-hoved', 'Senere i dag'); },
      });
      senere.forEach(function (r) { raekker.push(forloebRaekke(r, nu)); });
    }
    Admin.tegnRaekker(boks, raekker);

    /* ⚠️ DET NYE SKAL KUNNE SES — "den skal lysne og være levende"
       (kundens ord 31/8). Markeringen sættes EFTER optegningen:
       rækken skal findes i siden, før den kan få klassen på.

       Og som i køkken-køen: kendte er null, til listerne ER meldt
       ind. Uden det gard ville HELE dagens forløb lyse op ved
       login. */
    var nuIds = raekker.filter(function (r) { return r.erSag; })
      .map(function (r) { return r.noegle; });
    if (kendteSager) {
      nuIds.forEach(function (id) {
        if (kendteSager.indexOf(id) !== -1) return;
        var el = boks.querySelector('[data-raekke="' + id + '"]');
        if (el) el.classList.add('linje-ny');
      });
    }
    if (Admin.lister.bestillinger !== undefined) kendteSager = nuIds;
  }

  /* Nøglen er sagens egen, ikke dens plads i listen: flytter en
     bestilling sig fra "senere" til "snart", er det den SAMME
     række, og den skal ikke lyse op som ny. */
  function forloebRaekke(r, nu) {
    var id = (r.b ? 'b' + r.b.id : 'k' + (r.fane || '') + (r.tid || '') + r.navn);
    return {
      erSag: true,
      noegle: id,
      aftryk: [r.tid, r.navn, r.hvad, r.maerke, r.ny, r.allergi,
        r.b ? r.b.status : '', r.min !== null && r.min < nu.minutter].join('|'),
      byg: function () { return vagtRaekke(r, nu); },
    };
  }

  // ----------------------------------------------------------
  //  PRODUKTION I ALT
  //  --------------------------------------------------------
  //  Hvor meget af hver ret skal der laves i dag — lagt sammen på
  //  tværs af bestillingerne. Uden den skal køkkenet selv lægge
  //  "2 × pasta" og "3 × pasta" og "1 × pasta" sammen i hovedet,
  //  midt i en frokost, hver gang de vil vide, hvor mange der
  //  skal på panden.
  //
  //  ⚠️ HER ER BORDENE MED, og det modsiger ikke adskillelsen
  //  ovenfor. Forløbet handler om HVORNÅR noget skal ud, og der
  //  hører bordene ikke til. Produktionen handler om HVOR MEGET
  //  der skal laves, og der skal ALT tælle med — ellers laver
  //  køkkenet for lidt. Derfor står tallet delt: 🥡 ud af huset
  //  og 🍽️ spist her, så adskillelsen kan ses i tallet.
  //
  //  Det AFVISTE tæller ikke med: det bliver aldrig lavet. Det
  //  afhentede og det udeblevne gør — de ER lavet, og "i alt"
  //  skal blive ved med at være dagens tal, også kl. 21.
  // ----------------------------------------------------------
  function produktion() {
    var kurv = {};
    iDagsBestillinger().forEach(function (b) {
      if (b.status === 'afvist') return;
      var udAfHuset = !erBord(b) && b.hvordan !== 'spis_her';
      (b.linjer || []).forEach(function (l) {
        /* ⚠️ EMBALLAGEN ER IKKE MAD. Produktionen er dét, køkkenet
           arbejder efter; et tillæg dér ville bede dem lave fire
           poser. Pengene tælles med som før. Reglen bor i
           Butik.erEmballage — Bestillinger-fanen spørger den
           samme, ellers ville de to skærme sige hver sit om den
           samme dag. */
        if (Butik.erEmballage(Admin.data, l)) return;
        /* ⚠️ VARIANTEN ER EN DEL AF NØGLEN HER. Produktionen
           siger, hvor meget der skal LAVES, og to skiver med hver
           sit fyld er to forskellige stykker arbejde — lagt sammen
           til "5 × Smørrebrød" ville køkkenet ikke vide, hvad de
           fem skulle have på. */
        var navn = String(l.navn || '').trim()
          + (l.variant ? ' · ' + String(l.variant).trim() : '');
        if (!navn) return;
        var r = kurv[navn] || (kurv[navn] = { navn: navn, ialt: 0, ud: 0, her: 0 });
        var n = Number(l.antal) || 0;
        r.ialt += n;
        if (udAfHuset) r.ud += n; else r.her += n;
      });
    });

    return Object.keys(kurv).map(function (k) { return kurv[k]; })
      .sort(function (a, b) { return b.ialt - a.ialt || a.navn.localeCompare(b.navn, 'da'); });
  }

  function tegnProduktion() {
    var boks = $('overblik-produktion');
    var kort = $('produktion-kort');
    if (!boks || !kort) return;
    Admin.tøm(boks);

    var liste = produktion();
    /* ⚠️ HER BLIVER AFSNITTET STÅENDE MED EN TOM TILSTAND (30/8),
       modsat husets almindelige regel om at et afsnit uden noget
       at vise ikke findes.

       Grunden er, at det her afsnit er en DEL af køreplanen —
       det ene sted, personalet tjekker, når de møder ind. Et
       hul i den liste læses som "den er ikke tegnet færdig",
       ikke som "der er ingen bestillinger endnu". De to er ikke
       det samme, og kun den ene er beroligende. */
    kort.classList.remove('skjult');
    if (!liste.length) {
      boks.appendChild(lav('p', 'tom-plads',
        'Ingen bestillinger endnu — listen fyldes op, '
        + 'efterhånden som gæsterne bestiller.'));
      return;
    }

    liste.forEach(function (r) {
      var p = lav('div', 'prod-pille');
      p.appendChild(lav('b', 'prod-antal', r.ialt));
      p.appendChild(lav('span', 'prod-navn', r.navn));
      var delt = lav('span', 'prod-delt');
      delt.textContent = '🥡 ' + r.ud + ' · 🍽️ ' + r.her;
      delt.title = r.ud + ' ud af huset, ' + r.her + ' spist her';
      p.appendChild(delt);
      boks.appendChild(p);
    });
  }

  // ----------------------------------------------------------
  //  FRA BORDENE — den separate ting
  //  --------------------------------------------------------
  //  Overblik LISTER dem ikke; køkken-køen gør. Her står kun, at
  //  de findes, hvor mange der venter, og hvor længe den ældste
  //  har ventet — for det er dét tal, der afgør, om nogen skal gå
  //  fra lugen og ud i køkkenet nu.
  // ----------------------------------------------------------
  function tegnBorde() {
    var kort = $('bord-koe-kort');
    var boks = $('overblik-bordkoe');
    if (!kort || !boks) return;
    Admin.tøm(boks);

    var koe = (Admin.lister.bestillinger || []).filter(function (b) {
      return !b.slettet && erBord(b) && !FAERDIG[b.status];
    });

    kort.classList.toggle('skjult', !koe.length);
    if (!koe.length) return;

    var aeldst = 0;
    var borde = {};
    koe.forEach(function (b) {
      var m = minutterSiden(b.oprettet);
      if (m !== null && m > aeldst) aeldst = m;
      borde[b.bord_nummer] = true;
    });
    var antalBorde = Object.keys(borde).length;

    var linje = lav('div', 'bordkoe-linje');
    linje.appendChild(lav('b', 'bordkoe-tal', koe.length));
    linje.appendChild(lav('span', 'bordkoe-tekst',
      (koe.length === 1 ? 'bestilling' : 'bestillinger') + ' fra '
      + antalBorde + (antalBorde === 1 ? ' bord' : ' borde')
      + ' venter i køkkenet · ældste ' + aeldst + ' min.'));
    boks.appendChild(linje);
    boks.appendChild(faneKnap('p-koekken', 'Åbn køkken-køen →'));
  }

  // ----------------------------------------------------------
  //  FÆRDIGE
  //  --------------------------------------------------------
  //  De faldt HELT ud af skærmen før. Det var rigtigt for
  //  arbejdslisten og forkert for dagen: trykker nogen "Afhentet"
  //  på det forkerte kort i en frokost, var bestillingen væk, og
  //  gæsten stod ved lugen uden noget at hente.
  //
  //  Foldet sammen, så de ikke fylder — og med en vej tilbage.
  // ----------------------------------------------------------
  function tegnFaerdige() {
    var kort = $('faerdige-kort');
    var boks = $('overblik-faerdige');
    var titel = $('faerdige-titel');
    if (!kort || !boks || !titel) return;
    Admin.tøm(boks);

    var liste = iDagsBestillinger().filter(function (b) {
      return FAERDIG[b.status] && !erBord(b);
    }).sort(function (a, b) {
      return String(b.hent_tid || '').localeCompare(String(a.hent_tid || ''));
    });

    kort.classList.toggle('skjult', !liste.length);
    titel.textContent = '✓ Færdige (' + liste.length + ')';
    if (!liste.length) return;

    /* ⚠️ ORDENE ER BESTILLINGSFANENS, IKKE EN KOPI (31/8). Her
       stod en egen liste med "Afhentet"/"Serveret", og da det
       sidste trin blev døbt om til "Færdig" efter kundens ønske,
       ville Overblik og Bestillinger have sagt hver sit om den
       samme bestilling. Admin.statusNavn er det ene sted. */
    var ORD = function (s) {
      return Admin.statusNavn ? Admin.statusNavn(s) : s;
    };

    /* ⚠️ DEN FÆRDIGE RÆKKE ER DEN SAMME RÆKKE  (1/9).

       Kundens skærmbillede: den åbne række havde tiden stort til
       venstre, en kilde-chip og en farvet kant; den færdige havde
       tiden som lille grå tekst NEDERST, intet mærkat og ingen
       kant. To behandlinger af det samme i den samme liste — og
       den ene så ud som en eftertanke.

       Nu er formen den samme (.vagt-raekke), og det ENESTE, der
       skiller dem, er farven: grøn kant og grønt mærke, fordi
       maden ER ud ad døren. Det er husets egen regel fra 31/8 —
       "det gik godt" må ikke ligne "det blev aldrig til noget". */
    liste.forEach(function (b) {
      var k = lav('div', 'vagt-raekke faerdig-raekke b-faerdig');
      k.appendChild(tidsAkse(
        String(b.hent_tid || '').slice(0, 5).replace(':', '.')));

      var midt = lav('div', 'vagt-midt');
      var hvem = lav('div', 'bestil-hvem');
      hvem.appendChild(lav('span', 'vare-navn',
        Admin.pæntNavn ? Admin.pæntNavn(b.navn) : b.navn));
      hvem.appendChild(lav('span', 'maerke kilde-maerke',
        b.bord_nummer ? '🍽️ Bord ' + b.bord_nummer : '🥡 To-go'));
      hvem.appendChild(lav('span', 'maerke m-faerdig', '✓ ' + ORD(b.status)));
      midt.appendChild(hvem);
      midt.appendChild(varelinjer(b));
      var emb2 = emballageKasse(b);
      if (emb2) midt.appendChild(emb2);
      /* Nummeret og kontakten — samme linje og samme regel som
         den åbne række ovenfor. Skal nogen ringe om en
         bestilling, der ER udleveret, er det HER, den står. */
      var kontakt = lav('div', 'vagt-kontakt');
      /* Nummeret hører til på bestillingskortet — se noten på den
         åbne række ovenfor. */
      (Admin.kontakt ? Admin.kontakt(b) : []).forEach(function (e) {
        kontakt.appendChild(e);
      });
      if (b.hent_tid) kontakt.insertBefore(lav('span', 'vagt-kl',
        'kl. ' + String(b.hent_tid).slice(0, 5).replace(':', '.')),
        kontakt.firstChild);
      if (kontakt.childNodes.length) midt.appendChild(kontakt);
      k.appendChild(midt);

      /* GENDAN FØRER TIL "BEKRÆFTET" og ikke til "ny". Rækken HAR
         været set af personalet — det var derfor, nogen trykkede.
         Sat til ny ville den tælle med i "ikke set på endnu" og
         sende køkkenet ud at lede efter noget, de allerede
         kender. */
      /* ⚠️ friskOp OG IKKE Admin.gem. Admin.gem henter
         indstillinger og menukort — ikke bestillingerne. Kortet
         ville blive stående på "Afhentet", og personalet ville
         trykke igen på en knap, der allerede havde virket. Det er
         nøjagtig den fejl, køkken-køen faldt i 25/8; svaret står i
         noten ved videre() i js/admin/koekken.js. */
      var handling = lav('div', 'vagt-handling');
      var knap = lav('button', 'knap lille', '↩ Gendan');
      knap.type = 'button';
      knap.addEventListener('click', function () {
        knap.disabled = true;
        Butik.skrive.bestillingStatus(b.id, 'bekraeftet')
          .then(function () { return Admin.friskOp(); })
          .then(function () {
            Admin.kvitter(b.navn + ' er tilbage i dagens forløb.');
          })
          .catch(function (e) {
            knap.disabled = false;
            Admin.brøl(e && e.message || String(e));
          });
      });
      handling.appendChild(knap);
      midt.appendChild(handling);

      boks.appendChild(k);
    });
  }

  // ----------------------------------------------------------
  //  LIGE MODTAGET — til ANDRE dage
  // ----------------------------------------------------------
  function nyligt() {
    var ud = [];

    (Admin.lister.bestillinger || []).forEach(function (b) {
      var min = minutterSiden(b.oprettet);
      if (b.slettet || min === null || min * 60000 > VINDUE_MS) return;
      ud.push({
        min: min, navn: b.navn, ny: b.status === 'ny',
        hvad: linjeTekst(b),
        dato: b.hent_dato,
        naar: Admin.pænDato(b.hent_dato) + ' kl. '
          + String(b.hent_tid || '').slice(0, 5).replace(':', '.'),
        fane: 'p-bestillinger', faneNavn: 'Åbn bestillingerne',
      });
    });

    (Admin.lister.borde || []).forEach(function (b) {
      var min = minutterSiden(b.oprettet);
      if (b.slettet || min === null || min * 60000 > VINDUE_MS) return;
      ud.push({
        min: min, navn: b.navn, ny: b.status === 'ny',
        hvad: 'Bord · ' + b.antal_personer + ' personer',
        dato: b.dato,
        naar: Admin.pænDato(b.dato) + ' kl. '
          + String(b.tid || '').slice(0, 5).replace(':', '.'),
        fane: 'p-borde', faneNavn: 'Åbn bordene',
      });
    });

    (Admin.lister.udlejninger || []).forEach(function (u) {
      var min = minutterSiden(u.oprettet);
      if (u.slettet || min === null || min * 60000 > VINDUE_MS) return;
      ud.push({
        min: min, navn: u.navn, ny: u.status === 'ny',
        hvad: 'Baglokalet'
          + (u.antal_personer ? ' · ' + u.antal_personer + ' personer' : ''),
        dato: u.dato, naar: Admin.pænDato(u.dato),
        fane: 'p-lokale', faneNavn: 'Åbn baglokalet',
      });
    });

    (Admin.lister.forespoergsler || []).forEach(function (f) {
      var min = minutterSiden(f.oprettet);
      if (f.slettet || min === null || min * 60000 > VINDUE_MS) return;
      var navne = {
        catering: 'Catering', baglokale: 'Baglokale',
        selskab: 'Selskab', frokost: 'Frokostordning',
      };
      ud.push({
        min: min, navn: f.navn, ny: f.status === 'ny',
        hvad: (navne[f.type] || f.type)
          + (f.antal_personer ? ' · ' + f.antal_personer + ' personer' : ''),
        dato: f.dato || null,
        naar: f.dato ? Admin.pænDato(f.dato) : 'Dato ikke oplyst',
        fane: 'p-forespoergsler', faneNavn: 'Åbn forespørgslerne',
      });
    });

    return ud.sort(function (a, b) { return a.min - b.min; });
  }

  function tegnNyligt() {
    var boks = $('overblik-nyt');
    if (!boks) return;
    Admin.tøm(boks);

    /* Kun det, der gælder en ANDEN dag. Dagens ting står allerede
       i forløbet, og to kort om den samme bestilling er ikke to
       oplysninger — det er én oplysning, man skal regne ud er den
       samme. */
    var iDag = Butik.nu().dato;
    var liste = nyligt().filter(function (n) { return n.dato !== iDag; });

    var kort = $('vagt-nyt-kort');
    if (kort) kort.classList.toggle('skjult', !liste.length);
    if (!liste.length) return;

    liste.forEach(function (n) {
      var k = lav('div', 'nyt-kort');
      k.appendChild(lav('div', 'nyt-hvornaar', hvornårTekst(n.min)));

      var linje = lav('div', 'bestil-hvem');
      linje.appendChild(lav('span', 'vare-navn', n.navn));
      if (n.ny) linje.appendChild(lav('span', 'maerke m-ny', 'Ny'));
      k.appendChild(linje);

      k.appendChild(lav('div', 'vare-tekst', n.hvad));
      k.appendChild(lav('div', 'nyt-naar', n.naar));
      k.appendChild(faneKnap(n.fane, n.faneNavn + ' →'));

      boks.appendChild(k);
    });
  }

  // ----------------------------------------------------------
  //  DAGENS TAL
  //  --------------------------------------------------------
  //  Kun tal, vi FAKTISK har. Der er ingen kasse og ingen
  //  omsætning i det her system — der er det, gæsterne har sendt
  //  gennem hjemmesiden. Et tal, der ligner en omsætning uden at
  //  være det, er værre end intet tal.
  //
  //  ⚠️ LUGEN OG BORDENE HAR HVER SIT FELT. Ét felt med summen
  //  ville skjule netop den forskel, hele fanen er bygget om for
  //  at vise — og et travlt bord ville se ud som en travl luge.
  // ----------------------------------------------------------
  function tegnTal() {
    var boks = $('overblik-tal');
    if (!boks) return;
    Admin.tøm(boks);

    var iDag = iDagsBestillinger();
    var lugen = iDag.filter(function (b) { return !erBord(b); });
    var bordene = iDag.filter(erBord);
    var retter = produktion().reduce(function (s, r) { return s + r.ialt; }, 0);

    var borde = Admin.lister.borde || [];
    var fore = Admin.lister.forespoergsler || [];
    var lokale = Admin.lister.udlejninger || [];

    var venter = fore.filter(function (f) { return f.status === 'ny'; }).length
      + lokale.filter(function (u) { return u.status === 'ny'; }).length;

    var felter = [
      ['Til lugen i dag', lugen.length, 'bestilt på hjemmesiden'],
      ['Fra bordene i dag', bordene.length, 'scannet ved bordet'],
      ['Retter i alt', retter, 'lagt sammen'],
    ];

    /* Dagens ret: solgt tælles af BESTILLINGERNE, og "tilbage"
       kommer fra tabellen. Der findes intet "solgt af N" i
       databasen — kun antal_tilbage — og et samlet antal, vi
       selv fandt på, ville være et opdigtet tal. */
    /* ⚠️ FELTET STÅR ALTID, også når der ikke er en dagens ret.
       Et felt, der kommer og går, får hele rækken til at hoppe en
       plads, når ejeren sætter dagens ret om morgenen — og
       personalet leder efter et tal, der har flyttet sig. */
    var ret = (Butik.dagensRetter(Admin.data || {}, Butik.nu().dato) || [])[0];
    var solgt = 0;
    if (ret) {
      iDag.forEach(function (b) {
        if (b.status === 'afvist') return;
        (b.linjer || []).forEach(function (l) {
          if (String(l.navn || '').trim().toLowerCase()
              === String(ret.navn || '').trim().toLowerCase()) {
            solgt += Number(l.antal) || 0;
          }
        });
      });
    }
    felter.push(['Dagens ret solgt', solgt,
      !ret ? 'ingen ret sat i dag'
        : ret.antal_tilbage === null || ret.antal_tilbage === undefined
          ? ret.navn
          : ret.antal_tilbage + ' tilbage']);

    felter.push(['Nye bookinger',
      borde.filter(function (b) { return b.status === 'ny'; }).length,
      'ikke set på endnu']);
    felter.push(['Venter på svar', venter, 'forespørgsler og baglokale']);

    felter.forEach(function (t) {
      var f = lav('div', 'tal-felt');
      f.appendChild(lav('div', 'tal-navn', t[0]));
      f.appendChild(lav('div', 'tal-tal', t[1]));
      f.appendChild(lav('div', 'tal-note', t[2]));
      boks.appendChild(f);
    });
  }

  /* ---- DET, DER BRÆNDER ----

     Kundens ord om Overblik (23/8): "det er dér, de bør stå, når
     de er på arbejde og modtager bestillinger." Kortet er langt,
     og MÅLT på en 1280 px skærm med en almindelig dag: dagens
     forløb begynder 750 px nede, og "Fra bordene" står 1500 px
     nede — under HELE køreplanen. Et bord, der har ventet i to
     timer, stod altså under folden på den skærm, personalet har
     åben hele dagen.

     Striben her er det, der ikke kan ses fra toppen. Den følger
     de samme to regler som ⚠️-kortet på Køkken-kø:

     · DEN FINDES KUN, NÅR DER ER NOGET. En fast boks, der som
       regel siger "alt er fint", bliver til udsmykning på en uge.
     · DEN SIGER DET ÉN GANG. Det værste står med sit tal, resten
       er et antal — hvilke det er, står i listerne nedenunder,
       som allerede er sorteret. Tre næsten ens linjer er et
       kort, man holder op med at læse.

     ⚠️ ALLERGIEN STÅR IKKE HER. Den har sit eget mærke på rækken
     og sit eget kort på Køkken-kø; en tredje udgave ville være
     præcis den "tre gange den samme oplysning", trin-striben på
     forespørgselskortet blev fjernet for. */
  function tegnAlarm(iDag) {
    var boks = $('plan-alarm');
    if (!boks) return;
    Admin.tøm(boks);

    var nu = Butik.nu();
    var linjer = [];

    /* 1) DET, DER SKULLE HAVE VÆRET HENTET. Bordene tæller ikke
       med — de har ingen hentetid, og deres egen linje står
       nedenfor. */
    var sene = dagensArbejde().filter(function (r) {
      return r.min !== null && r.min < nu.minutter;
    });
    if (sene.length) {
      linjer.push('⏰ ' + (sene.length === 1
        ? sene[0].navn + ' skulle have hentet kl. ' + sene[0].tid
          + '. Står øverst i forløbet.'
        : sene.length + ' bestillinger skulle have været hentet — den ældste kl. '
          + sene[0].tid + '. De står øverst i forløbet.'));
    }

    /* 2) BORDENE. ⚠️ GRÆNSEN ER KØKKENETS EGEN (Admin.bordForLaenge
       i js/admin/koekken.js) og ikke et tal, der er skrevet af.
       To udgaver af "hvornår er det for længe" ville betyde, at
       de to skærme sagde hver sit den dag, ejeren satte
       ventetiden ned — og begge ville se rigtige ud. */
    if (Admin.bordForLaenge) {
      var maal = Admin.bordForLaenge();
      var pr = {};
      (Admin.lister.bestillinger || []).forEach(function (b) {
        if (b.slettet || !erBord(b) || FAERDIG[b.status]) return;
        var m = minutterSiden(b.oprettet);
        if (m === null || m < maal) return;
        if (!pr[b.bord_nummer] || m > pr[b.bord_nummer]) pr[b.bord_nummer] = m;
      });
      var borde = Object.keys(pr).sort(function (a, b) { return pr[b] - pr[a]; });
      if (borde.length) {
        linjer.push('🍽️ Bord ' + borde[0] + ' har ventet ' + pr[borde[0]]
          + ' min — køkkenet regner med ' + maal + '.'
          + (borde.length > 1
            ? ' ' + (borde.length - 1) + (borde.length === 2 ? ' andet bord' : ' andre borde')
              + ' venter også for længe.'
            : ''));
      }
    }

    boks.classList.toggle('skjult', !linjer.length);
    if (!linjer.length) return;

    linjer.forEach(function (t) { boks.appendChild(lav('div', 'alarm-linje', t)); });
  }

  /* ---- KØREPLANEN: DAGEN, SOM DEN ER ----

     Kundens ord (24/8): "køreplanen får præcis den, skrive
     notater til den dag osv som selvfølgelig kommer ind i
     overblik".

     Linjen står ØVERST og siger tre ting, der ellers ligger på
     tre faner: om der er åbent, om lokalet er lejet ud, og hvad
     personalet har skrevet til sig selv. */
  function tegnKoereplan() {
    var boks = $('overblik-koereplan');
    if (!boks) return;

    var iDag = Butik.nu().dato;
    var kal = (Admin.data && Admin.data.kalender) || [];

    var lukket = null, tidligt = null;
    kal.forEach(function (k) {
      var til = k.slut_dato || k.dato;
      if (iDag < k.dato || iDag > til) return;
      if (k.type === 'lukkedag') lukket = k;
      if (k.type === 'tidlig_lukning') tidligt = k;
    });

    /* Åbent eller lukket er det første, man skal vide, når man
       møder ind — og det er det eneste her, der kan gøre resten
       af skærmen ligegyldig. */
    var ind = (Admin.data && Admin.data.indstillinger) || {};
    var aaben = ind.bestilling_aaben !== false;
    var stribe = $('plan-stribe');
    stribe.className = 'plan-stribe' + (lukket || !aaben ? ' plan-lukket' : '');
    if (lukket) {
      stribe.textContent = '⛔ Lukket i dag — ' + lukket.titel
        + '. Gæsterne kan ikke bestille.';
    } else if (!aaben) {
      stribe.textContent = '⛔ Bestillinger er slået fra. Der er åbent, men '
        + 'gæsterne kan ikke bestille på siden.';
    } else if (tidligt) {
      stribe.textContent = '🕐 Åbent for bestillinger — vi lukker kl. '
        + String(tidligt.lukker_kl || '').slice(0, 5) + '.';
    } else {
      stribe.textContent = '✅ Åbent for bestillinger.';
    }

    tegnAlarm(iDag);

    /* Er lokalet lejet ud i dag, står der et selskab i baglokalet,
       og det er ikke til at se nogen andre steder på Overblik.

       ⚠️ LINJEN HAR ALDRIG VIRKET, OG DET VAR HELT TAVST (fundet
       29/8 på et skud af køreplanen: baglokalet var lejet ud til
       30 personer i dag, og der stod "Ingen bestillinger eller
       aftaler endnu i dag").

       Den spurgte efter status 'aftalt'. Det er FORESPØRGSLERNES
       ord; en udlejning hedder ny / bekraeftet / afvist, og de to
       tabeller har med vilje hvert sit sæt (se noten ved
       alleSager() i js/admin/udlejning.js — de oversættes ét
       sted). Betingelsen kunne derfor aldrig gå i opfyldelse, og
       en linje, der aldrig tegnes, ser præcis ud som en dag uden
       udlejning.

       Begge slags står her nu: en bekræftet UDLEJNING er lokalet
       lejet ud, og en aftalt FORESPØRGSEL er en dag, personalet
       har lovet væk uden at låse den. Køkkenet skal møde ind til
       begge dele — forskellen mellem dem hører til på
       Baglokalet-fanen, ikke i køreplanen. */
    var lejet = $('plan-lejet');
    Admin.tøm(lejet);
    (Admin.lister.udlejninger || []).forEach(function (u) {
      if (u.dato !== iDag || u.status !== 'bekraeftet') return;
      lejet.appendChild(lav('div', 'plan-linje',
        '🔑 Baglokalet er lejet ud i dag — ' + u.navn
        + (u.antal_personer ? ' · ' + u.antal_personer + ' pers.' : '')));
    });
    (Admin.lister.forespoergsler || []).forEach(function (f) {
      if (f.type !== 'baglokale' || f.dato !== iDag || f.status !== 'aftalt') return;
      lejet.appendChild(lav('div', 'plan-linje',
        '🔑 Baglokalet er aftalt i dag — ' + f.navn
        + (f.antal_personer ? ' · ' + f.antal_personer + ' pers.' : '')));
    });

    /* ⚠️ FELTET OVERSKRIVES KUN, NÅR DET IKKE ER I BRUG. Skriver
       en medarbejder på noten, mens takten henter, ville en
       optegning kaste det skrevne væk — og det ville ligne, at
       systemet slugte sætningen. */
    var felt = $('plan-note-felt');
    if (felt && document.activeElement !== felt) {
      var note = Admin.noteFor ? Admin.noteFor(iDag) : null;
      felt.value = (note && note.beskrivelse) || '';
    }

    var dato = $('plan-dato');
    if (dato) {
      dato.textContent = Admin.pænDato(iDag)
        + ' · det ene sted, der skal tjekkes, når I møder ind';
    }
  }

  /* ⚠️ HVORFOR TO REGLER OG IKKE BARE AUTOGEM.

     Uden en id OPRETTER skrivningen en ny række. Autogem skriver
     1,2 sekund efter sidste tastetryk, og listen hentes IKKE
     imellem — så en note, der ikke fandtes i forvejen, ville
     blive oprettet én gang pr. pause i tastningen. Fem pauser =
     fem noter på dagen, og ingen fejl nogen steder. Rækken kendes
     kun på sin titel, så de fem ville ligne fem arrangementer.

     Derfor: FINDES rækken, er skrivningen en opdatering og må
     køre stille, så tit den vil. Findes den IKKE, gemmes der
     først, når feltet forlades (change), og kalenderen hentes
     igen bagefter — så den næste skrivning er en opdatering.
     Feltet er ikke i fokus på det tidspunkt, så optegningen river
     ingenting ud af hånden.

     ⚠️ Admin.genindlæs OG IKKE Admin.friskOp. friskOp henter
     FANERNES lister (bestillinger, borde, forespørgsler); noten
     bor i kalenderen, som ligger i Admin.data. MÅLT med friskOp:
     Admin.noteFor svarede stadig null ved anden skrivning, og der
     stod TO noter på dagen bagefter — helt uden en fejl.

     ⚠️ Roden er KORTET og ikke notefeltets boks: se noten i
     CLAUDE.md om autogem, hvor mærket blev revet ned sammen med
     en boks, der blev tegnet om. */
  function bindNote() {
    var kort = $('overblik-koereplan');
    var felt = $('plan-note-felt');
    if (!kort || !felt) return;

    Admin.autogem(kort, function () {
      var dag = Butik.nu().dato;
      var tekst = felt.value.trim();
      var findes = Admin.noteFor ? Admin.noteFor(dag) : null;

      if (!tekst) {
        if (!findes) return null;          // Ingen note, intet at slette
        return Butik.skrive.sletKalender(findes.id).then(Admin.genindlæs);
      }
      if (findes) return Admin.skrivNote(dag, tekst);
      if (document.activeElement === felt) return null;   // vent på change
      return Admin.skrivNote(dag, tekst).then(Admin.genindlæs);
    });
  }

  function tegnOverblik() {
    tegnKoereplan();
    tegnTal();
    tegnProduktion();
    tegnForloeb();
    tegnBorde();
    tegnFaerdige();
    tegnNyligt();
    tegnDagensRetKort();
    tegnBookingKort();
  }

  /* Overblik tegnes, hver gang en fane melder nye data ind — og
     én gang ved login, hvis der slet ikke kom noget (fx fordi
     begge kald fejlede). Ellers stod siden tom uden at sige
     hvorfor. */
  Admin.efterHent.push(tegnOverblik);
  /* ============================================================
     DAGENS RET OG BOOKINGER SOM EGNE KORT  (1/9)
     ------------------------------------------------------------
     Kundens forlæg: under forløbet står to små kort — hvad
     dagens ret er og hvad den koster, og hvad der venter på
     bookingsiden. Hver med ÉN vej hen til fanen, hvor man retter
     det.

     ⚠️ DE ER RUDER, IKKE STEDER AT RETTE. Retten skrives på
     Dagens ret-fanen og bookingerne besvares på Borde. To steder
     at ændre den samme ting ville skride fra hinanden — det er
     den samme beslutning som dagens panel i kalenderen (24/8).

     ⚠️ OG DE FINDES KUN, NÅR DER ER NOGET. Et fast kort, der som
     regel siger "ingen ret i dag", bliver til udsmykning på en
     uge, og så ses det heller ikke den dag, det siger noget. */
  function tegnDagensRetKort() {
    var kort = $('dagensret-kort');
    var boks = $('ob-dagensret');
    if (!kort || !boks) return;
    Admin.tøm(boks);

    var iDag = Butik.nu().dato;
    var ret = (Butik.dagensRetter(Admin.data || {}, iDag) || [])[0];
    kort.classList.toggle('skjult', !ret || !ret.navn);
    if (!ret || !ret.navn) return;

    var kasse = lav('div', 'ob-rude');
    kasse.appendChild(lav('div', 'vare-navn', ret.navn));
    var chips = lav('div', 'ob-chips');
    /* ⚠️ INGEN PRIS ER IKKE 0 KR. Står der ingen pris på retten,
       siger kortet "pris følger" — samme regel som hele
       menukortet siden 26/8. Et nul ville være et tal, vi selv
       har fundet på. */
    chips.appendChild(lav('span', 'ob-chip pris',
      ret.pris ? Butik.pris(ret.pris) : 'Pris følger'));

    /* Solgt af hvor mange: kun når ejeren HAR sat et antal.
       Uden et tal er "5 solgt" en oplysning uden en ramme. */
    var solgt = 0;
    iDagsBestillinger().forEach(function (b) {
      if (b.status === 'afvist') return;
      (b.linjer || []).forEach(function (l) {
        if (String(l.navn || '').trim().toLowerCase()
            === String(ret.navn).trim().toLowerCase()) {
          solgt += Number(l.antal) || 0;
        }
      });
    });
    var loft = ret.antal_tilbage === null || ret.antal_tilbage === undefined
      ? null : Number(ret.antal_tilbage) + solgt;
    chips.appendChild(lav('span', 'ob-chip solgt',
      loft === null ? solgt + ' solgt' : solgt + '/' + loft + ' solgt'));
    kasse.appendChild(chips);
    boks.appendChild(kasse);
  }

  function tegnBookingKort() {
    var kort = $('ob-booking-kort');
    var boks = $('ob-booking');
    if (!kort || !boks) return;
    Admin.tøm(boks);

    var iDag = Butik.nu().dato;
    var alle = (Admin.lister.borde || []).filter(function (b) {
      return !b.slettet && b.dato >= iDag;
    });
    var venter = alle.filter(function (b) { return b.status === 'ny'; }).length;
    kort.classList.toggle('skjult', !alle.length);
    if (!alle.length) return;

    if (venter) {
      /* ⚠️ EN BOOKING, DER VENTER, ER ARBEJDE — og gæsten har
         fået "vi ses". Striben er rød, fordi den skal ses, og den
         siger HVAD man gør: ring. Samme ord som Borde-fanen. */
      var stribe = lav('button', 'ob-stribe', '');
      stribe.type = 'button';
      stribe.appendChild(lav('b', null, '⏳ ' + venter
        + (venter === 1 ? ' venter på svar' : ' venter på svar')));
      stribe.appendChild(document.createTextNode(
        ' – ring og få dem på plads →'));
      stribe.addEventListener('click', function () {
        Admin.visFane('p-borde');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      boks.appendChild(stribe);
    } else {
      boks.appendChild(lav('p', 'hjaelp',
        alle.length + (alle.length === 1 ? ' booking' : ' bookinger')
        + ' i dag og frem — alle er hakket af.'));
    }
  }

  Admin.vedLogin.push(tegnOverblik);

  // Notefeltet står fast i opmærkningen og bindes én gang.
  bindNote();

  /* KØREPLANEN SKAL OGSÅ TEGNES, NÅR DATA HENTES.

     Resten af Overblik lever af Admin.lister — fanernes egne
     lister — og de melder sig ind gennem efterHent. Køreplanen er
     den FØRSTE del af fanen, der læser Admin.data: lukkedagen og
     noten kommer fra kalenderen, ikke fra en liste.

     Uden den her linje blev noten først synlig, næste gang en
     fane meldte noget ind. MÅLT: personalet skrev en note på
     dagen, gik til Overblik, og der stod "Ingen note skrevet" —
     med noten gemt og det hele. */
  Admin.tegnere.push(tegnKoereplan);
  Admin.tegnere.push(tegnDagensRetKort);

  var tilRet = $('ob-til-dagensret');
  if (tilRet) tilRet.addEventListener('click', function () {
    Admin.visFane('p-dagensret');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  var tilBorde = $('ob-til-borde');
  if (tilBorde) tilBorde.addEventListener('click', function () {
    Admin.visFane('p-borde');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
