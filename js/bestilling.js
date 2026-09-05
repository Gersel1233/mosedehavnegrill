/* ============================================================
   BESTIL SMØRREBRØD UD AF HUSET

   Det er den eneste formular på hele hjemmesiden, og den er den
   eneste ting en gæst skriver i databasen.

   ------------------------------------------------------------
   DET ER EN BESTILLING, IKKE EN WEBSHOP
   ------------------------------------------------------------
   Der betales ikke her. Det er ikke en mangel, det er det ærlige:
   forretningen har ikke oplyst hvordan man betaler på forhånd,
   hvor lang tid i forvejen der skal bestilles, om der er et
   mindsteantal, eller om der leveres. Fire ting vi ikke ved.

   Så gæsten sender hvad hun gerne vil have og hvornår, og
   forretningen ringer og bekræfter. Det er den samme aftale som
   før, bare uden at nogen skal fange nogen i telefonen midt i en
   frokost. Betaling sker ved afhentning – kontant, kort og
   MobilePay, som står på siden i forvejen.

   Varslet (24 timer) og mindsteantallet (1) står i indstillinger
   og kan rettes i admin. De er UDGANGSPUNKTER formularen skal have
   for at kunne regne en tidligste dag ud – ikke oplysninger vi har
   fået. Retter ejeren dem, følger teksten på siden med af sig selv.

   ------------------------------------------------------------
   TO SLAGS VALG, FORDI KORTET ER SKRUET SÅDAN SAMMEN
   ------------------------------------------------------------
   Kategorien "Smørrebrød" har fem slags MED pris. Kategorien
   "Vælg fyld til smørrebrødet" har 29 slags UDEN pris, for et fyld
   er ikke en vare man køber – det er hvad der skal ligge på
   stykket.

   Derfor: stykker med antal og pris øverst, fyld som ønsker
   nedenunder. Havde de ligget i samme kurv, ville fire stykker med
   tre slags fyld være blevet syv stykker, og personalet ville
   pakke forkert.
   ============================================================ */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function tøm(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function lav(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = String(tekst);
    return e;
  }

  /* Kurven ligger i localStorage. Genindlæser man siden – eller
     trykker på et link og går tilbage – skal man ikke vælge otte
     stykker smørrebrød forfra. Kun valgene, ikke navn og telefon:
     personoplysninger skal ikke ligge i en browser længere end de
     skal. */
  var KURV_NOEGLE = 'mosede_kurv_v1';

  /* hvordan er MED fra fødslen — 'afhentning' er To-go, og spiis'
     form står med To-go forvalgt. Før manglede feltet, og så stod
     begge knapper umarkerede, til gæsten selv trykkede: et valg
     uden forvalg ligner et spørgsmål, man ikke kan springe over. */
  var kurv = { stk: {}, fyld: [], hvordan: 'afhentning' };
  var data = null;
  var valgtDag = null;
  /* Hvor mange bestillinger der allerede skal hentes pr.
     klokkeslæt. Se Butik.hentFyldteTider. Tom liste = vi kunne
     ikke se det, og så bestilles der som før; værnet i databasen
     siger fra. */
  var fyldteTider = [];

  function læsKurv() {
    try {
      var r = localStorage.getItem(KURV_NOEGLE);
      if (!r) return;
      var k = JSON.parse(r);
      if (k && typeof k === 'object') {
        kurv.stk = k.stk || {};
        kurv.fyld = Array.isArray(k.fyld) ? k.fyld : [];
      }
    } catch (e) { /* privat browsing – kurven starter bare tom */ }
  }

  function gemKurv() {
    try { localStorage.setItem(KURV_NOEGLE, JSON.stringify(kurv)); }
    catch (e) { /* se ovenfor */ }
  }

  // ----------------------------------------------------------
  //  VARERNE
  // ----------------------------------------------------------
  /* Udvælgelsen ligger i js/store.js som Butik.smoerrebroed, ikke
     her. Forsiden viser nu også de fem slags og tæller fyldene, og
     stod regexen "smørrebrød|fyld" to steder, ville den ene før eller
     siden blive rettet uden den anden. Stykkerne er dem MED pris,
     fyldene dem uden – se noten i store.js. */
  /* MODEL A: alt med en pris kan bestilles med en tæller — også
     fyldet. Se noten i store.js om hvorfor skellet gik fra pris
     til kategori. fyldene() er dem UDEN pris: dem kan gæsten
     ønske sig, men ikke købe. */
  /* HVILKET UDVALG? Formularen siger det selv med data-udvalg,
     så opmærkningen bestemmer og ikke koden:

       (intet)      alt, som bestillingssiden har gjort hele tiden
       uden-smoer   forsidens bestilling — dagens ret, grillen,
                    drikkevarerne. Smørrebrødet har sit eget afsnit
       kun-smoer    kun smørrebrødet, med fyldet

     Isen er ude af dem alle. Se erIs() i js/store.js. */
  function hvilketUdvalg() {
    var f = document.getElementById('bestil-form');
    return (f && f.getAttribute('data-udvalg')) || 'alt';
  }

  /* ============================================================
     KORTVISNINGEN — listen som åbne afsnit med søgning og chips
     ------------------------------------------------------------
     data-visning="kort" på formularen. Ved bordet sidder gæsten
     med 242 varer og skal finde ÉN, og en foldet liste er så
     mange tryk, at man giver op og går op til lugen. Derfor:
     afsnittene står åbne, der er et søgefelt, og chipsene fører
     hen til afsnittet.

     ⚠️ DET ER KUN TEGNINGEN, DER SKIFTER. Udvalget, kurven,
     summen, det sidste kig og afsendelsen er nøjagtig de samme
     linjer kode som på forsiden og bestil/. Skrev vi listen om i
     en fil for sig, ville de to udgaver langsomt komme til at
     sælge noget forskelligt — og det ville ingen opdage, før en
     gæst fik forkert mad. Se noten om ét bestillingsmodul øverst.

     Søgningen og chipsene VISER og SKJULER; de tegner ikke om.
     En gentegning midt i et tryk ville nulstille tællere og
     flytte fokus — det er den samme grund, som folde-noten har. */
  function kortVisning() {
    var f = document.getElementById('bestil-form');
    return !!(f && f.getAttribute('data-visning') === 'kort');
  }

  /* ---- SØGEFELTET OG CHIPSENE ----------------------------
     De VISER og SKJULER; de tegner ikke om. En gentegning midt i
     et tryk ville nulstille tællerne og flytte fokus.

     Søgningen slår ned i navn OG beskrivelse: "bacon" skal finde
     Havnens all in one, selv om ordet kun står i beskrivelsen.
     Æ, ø og å foldes ned, så "rodgrod" finder rødgrød — gæsten
     står med en telefon i sollys og rammer ikke altid tasterne.

     ⚠️ FAVORITTERNE ER EJERENS EGNE (fremhaevet i admin), og
     chippen hedder derfor "Favoritter" og ikke "Mest bestilt".
     Vi MÅLER ikke, hvad der bestilles mest — salgstallene er
     personalets og må ikke læses af en gæst. Et ord, der lover en
     optælling, vi ikke har lavet, er et opdigtet tal. */
  /* ⚠️ ÉT BOGSTAV, IKKE TO. Den nærliggende foldning er den
     danske — æ→ae, ø→oe, å→aa — og den var her først. MÅLT: den
     virkede ikke. "rødgrød" blev til "roedgroed", og gæsten, der
     tastede "rodgrod", fik NUL træf og en tom skærm. Hun havde
     skullet ramme æ, ø og å præcist alligevel, og så foldede vi
     ingenting.

     Begge sider af sammenligningen løber gennem den her funktion,
     så en foldning kan kun SLÅ ord sammen — aldrig skille dem ad.
     Derfor koster det ekstra træf og aldrig et manglende: både
     "rødgrød", "roedgroed" og "rodgrod" bliver til "rodgrod". */
  function foldNed(t) {
    return String(t || '').toLowerCase()
      .replace(/æ/g, 'a').replace(/ø/g, 'o').replace(/å/g, 'a')
      .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/aa/g, 'a');
  }

  /* SØGETEKSTEN OG CHIPPEN LEVER UDEN FOR TEGNINGEN — som
     aabneGrupper.

     ⚠️ Her stod der først, at de skulle overleve et tryk på +,
     fordi visStykker() tegner om ved hver ændring i kurven. Det
     passede ikke: saet() retter tallet på PLADSEN og tegner
     ingenting om. Prøven, der skulle bevise det, bestod med
     fejlen genindført — og så var det kommentaren, der var
     forkert, ikke koden.

     Den ægte grund er, at en optegning kan komme senere: en
     "Bestil noget mere" i dag, og en dag måske en frisk liste
     over udsolgte varer, mens gæsten står midt i en søgning. Et
     felt, der tømmer sig selv under fingeren, sender hende
     tilbage til 242 varer.

     Til gengæld SKAL de nulstilles ved en ny runde — se
     "Bestil noget mere" nederst. Anden runde er en ny
     bestilling, ikke en fortsættelse af den forrige. */
  var kortSoegetekst = '';
  var kortValgtChip = 'alt';

  function nulstilKortFiltre() {
    kortSoegetekst = '';
    kortValgtChip = 'alt';
  }

  function byggSoegOgChips(boks, rækkefølge) {
    var bar = lav('div', 'kort-vaerktoej');

    var soeg = document.createElement('input');
    soeg.type = 'search';
    soeg.className = 'kort-soeg';
    /* ⚠️ KORT NOK TIL AT VÆRE PÅ SKÆRMEN (31/8). Den stod
       "Søg i menuen — burger, softice, fadøl…" og blev MÅLT klippet
       af i højre kant på en iPhone 13: gæsten så "…softice, fad".
       En pladsholder, der er hugget over midt i et ord, ligner en
       side, der er gået i stykker — og eksemplerne er der netop
       for at vise, at man kan søge på hvad som helst. */
    soeg.placeholder = 'Søg — burger, softice, øl…';
    soeg.setAttribute('aria-label', 'Søg i menuen');
    soeg.value = kortSoegetekst;
    bar.appendChild(soeg);

    var chips = lav('div', 'kort-chips');
    chips.setAttribute('role', 'group');
    chips.setAttribute('aria-label', 'Vælg en del af menuen');
    bar.appendChild(chips);
    boks.appendChild(bar);

    function tegnFiltre() {
      kortSoegetekst = soeg.value;
      var q = foldNed(soeg.value).trim();
      var traf = 0;

      /* Reglen bor ét sted, fordi den skal dømme to slags rækker:
         dem inde i et afsnit og de udsolgte, der står nederst
         uden for dem alle. Skrev vi den to gange, ville den ene
         udgave langsomt komme til at filtrere anderledes end den
         anden — og det ville ingen opdage, for hver af dem ser
         rigtig ud for sig selv. */
      function synlig(r, gNavn) {
        var passerSoeg = !q || foldNed(r.getAttribute('data-soeg')).indexOf(q) !== -1;
        var passerChip = kortValgtChip === 'alt'
          || (kortValgtChip === '__favorit'
               ? r.getAttribute('data-favorit') === 'ja'
               : kortValgtChip === gNavn);
        return passerSoeg && passerChip;
      }

      Array.prototype.forEach.call(boks.querySelectorAll('.kort-gruppe'), function (afsnit) {
        var gNavn = afsnit.getAttribute('data-gruppe');
        var synligeIAfsnit = 0;

        Array.prototype.forEach.call(afsnit.querySelectorAll('.stk-linje'), function (r) {
          var vis = synlig(r, gNavn);
          r.hidden = !vis;
          if (vis) synligeIAfsnit++;
        });

        /* Et afsnit uden synlige varer findes ikke. Stod
           overskriften alene tilbage, ville gæsten tro, at
           kategorien var tom — og lede efter burgeren et andet
           sted. Samme regel som forsidens afsnit. */
        afsnit.hidden = synligeIAfsnit === 0;
        traf += synligeIAfsnit;
      });

      /* ⚠️ OG RÆKKERNE UDEN FOR ET AFSNIT  (2/9). De udsolgte
         står nederst i boksen og ikke inde i en .kort-gruppe, så
         løkken ovenfor nåede dem aldrig. MÅLT ved bordet: gæsten
         søgte på "morgen", alt andet forsvandt — og tilbage stod
         en udsolgt burger som det eneste på skærmen. Gruppen
         læses af rækkens eget data-gruppe, ikke af en forælder,
         den ikke har. */
      Array.prototype.forEach.call(
        boks.querySelectorAll(':scope > .stk-linje'), function (r) {
          var vis = synlig(r, r.getAttribute('data-gruppe'));
          r.hidden = !vis;
          if (vis) traf++;
        });

      /* SØGNING UDEN TRÆF ER ET SVAR, ikke en tom skærm — og ved
         bordet skal svaret pege på lugen, som er tyve meter væk. */
      var tom = boks.querySelector('.kort-intet');
      if (!traf) {
        if (!tom) {
          tom = lav('p', 'kort-intet');
          boks.appendChild(tom);
        }
        tom.textContent = q
          ? 'Vi fandt ikke "' + soeg.value.trim() + '". Prøv et andet ord — '
            + 'eller sig det til os ved lugen.'
          : 'Der er ikke noget i den del af menuen lige nu.';
        tom.hidden = false;
      } else if (tom) {
        tom.hidden = true;
      }
    }

    function chip(navn, vaerdi) {
      var b = lav('button', 'kort-chip' + (vaerdi === kortValgtChip ? ' on' : ''));
      b.type = 'button';
      b.textContent = navn;
      b.setAttribute('aria-pressed', vaerdi === kortValgtChip ? 'true' : 'false');
      b.addEventListener('click', function () {
        kortValgtChip = vaerdi;
        Array.prototype.forEach.call(chips.children, function (x) {
          var på = x === b;
          x.classList.toggle('on', på);
          x.setAttribute('aria-pressed', på ? 'true' : 'false');
        });
        tegnFiltre();
        /* Chippen ruller sig selv frem, så man kan se hvor man
           er — striben er bredere end skærmen. Samme greb som
           admins fanestribe. */
        try { b.scrollIntoView({ inline: 'nearest', block: 'nearest' }); } catch (e) { /* ældre browsere */ }
      });
      chips.appendChild(b);
      return b;
    }

    /* Stod chippen på en kategori, ejeren siden har lukket, ville
       filteret skjule ALT — og gæsten møde en tom menu uden at
       kunne se hvorfor. Så falder den tilbage til Alt. */
    if (kortValgtChip !== 'alt' && kortValgtChip !== '__favorit'
        && rækkefølge.indexOf(kortValgtChip) === -1) {
      kortValgtChip = 'alt';
    }

    chip('Alt', 'alt');
    // Favoritterne kun hvis ejeren HAR markeret noget. En tom
    // chip er et løfte om en liste, der ikke findes.
    if ((data.menu_varer || []).some(function (v) { return v.fremhaevet; })) {
      chip('★ Favoritter', '__favorit');
    }
    /* Chippen bærer det samme tegn som afsnittet — og som
       menukortets hop-bånd. Er striben bredere end skærmen, er
       tegnet dét, øjet finder tilbage til; et navn i 14 px er
       fjorten ens grå pletter. */
    rækkefølge.forEach(function (g) {
      var t = window.MosedeEmoji
        ? window.MosedeEmoji.forKategori(kategoriFor(g) || { navn: g }) + '  '
        : '';
      chip(t + g, g);
    });

    var timer = null;
    soeg.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(tegnFiltre, 120);
    });

    // Kaldes af visStykker, når varerne er tegnet.
    boks._kortFiltre = tegnFiltre;
  }

  /* Kategoriens egen note, som ejeren har skrevet i admin —
     "Serveres 8–11", "På toastbrød eller rugbrød". Den stod kun
     på menukortet før; ved bordet er den lige så meget værd, for
     her bestiller man UDEN at have læst kortet først. */
  function kategoriFor(gruppeNavn) {
    return (data.menu_kategorier || []).filter(function (x) {
      return String(x.navn).trim() === String(gruppeNavn).trim();
    })[0] || null;
  }

  function kategoriNote(gruppeNavn) {
    var k = kategoriFor(gruppeNavn);
    return (k && String(k.note || '').trim()) || '';
  }

  /* ET ANSIGT PR. AFSNIT — de SAMME tegn som på menukortet.

     Listen bor i js/menu-emoji.js, netop for at de to sider ikke
     kan komme til at vise hver sit ansigt på den samme kategori.
     Gæsten kigger på kortet og bestiller så herfra; møder hun en
     anden burger, er det den samme slags forvirring som to
     forskellige priser.

     Farven bag tegnet kommer fra AFDELINGEN, som ejeren sætter i
     admin. Tre sande farver slår enogtyve gættede.

     ⚠️ Ingen fil, intet tegn — og afsnittet står med sin
     overskrift som før. Et manglende script må ikke koste
     menuen. "Dagens ret" er ikke en kategori og har ingen
     afdeling; den falder ned på tallerkenen af sig selv. */
  function kortTegn(gruppeNavn) {
    if (!window.MosedeEmoji) return null;
    var k = kategoriFor(gruppeNavn) || { navn: gruppeNavn };
    var el = lav('span', 'kort-tegn kort-tegn-' + window.MosedeEmoji.afdelingFor(k),
      window.MosedeEmoji.forKategori(k));
    // Tegnet er pynt. En skærmlæser skal høre "Smørrebrød", ikke
    // "brød Smørrebrød".
    el.setAttribute('aria-hidden', 'true');
    return el;
  }

  /* VED BORDET — formularens tredje sted. data-bord="7" siger
     BÅDE "det her er bordets formular" og "det er bord 7": de to
     følges altid ad. Nummeret sættes af js/ved-bordet.js, som
     har slået det op i bordlisten — ikke af adressen. */
  function vedBordet() {
    var f = document.getElementById('bestil-form');
    var v = f && f.getAttribute('data-bord');
    return v && String(v).trim() ? String(v).trim() : null;
  }

  /* NØGLEN FRA QR-KODEN følger nummeret ad samme vej og af samme
     grund: de to hører sammen, og den ene uden den anden er ikke
     en bestilling, databasen tager imod. Den sættes af
     js/ved-bordet.js ud fra ?n= i adressen — aldrig af noget, der
     står i koden. */
  function vedBordKoden() {
    var f = document.getElementById('bestil-form');
    var v = f && f.getAttribute('data-bord-kode');
    return v && String(v).trim() ? String(v).trim() : null;
  }

  /* Klokken nu, i DANSK tid. Browserens eget ur kan stå i en
     anden tidszone, og en bestilling stemplet 04.12 er ikke til
     at arbejde efter i et køkken. */
  function nuTid() {
    var m = Butik.nu().minutter;
    return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2);
  }

  /* ⚠️ DEN VALGTE DAG SENDES MED. Kategorierne kan sættes til kun
     hverdage (menukort-antal-og-dage.sql), og listen skal derfor
     klippes efter DEN dag, gæsten har valgt — ikke efter i dag.
     Uden datoen ville hun kunne lægge en burger i kurven til
     lørdag, og databasen ville afvise hele bestillingen til sidst
     med en fejl, hun ikke kan gøre noget ved. */
  /* ⚠️ TIDEN SKAL MED  (31/8). Kundens ord: "når klokken er over
     lukke, så lad der stå: klokken er over 13, vi sælger ikke
     morgenmad længere."

     MÅLT, ikke læst: den her fil kaldte Butik.udvalg UDEN
     klokkeslæt — og kategoriPaaTid springer hele sit tjek over,
     når tiden er null. På bordsiden kunne gæsten altså bestille
     morgenmad kl. 13.05, selv om ejeren har lukket den kl. 12.30
     — reglen fandtes, den blev bare aldrig spurgt. Beskeden, han
     bad om, var kun halvdelen af hullet.

     Ved bordet er tiden NU (der er ingen vælger); ved lugen er
     den det valgte afhentningstidspunkt. */
  function tidTilUdvalg() {
    if (vedBordet()) return nuTid();
    var t = $('bestil-tid');
    return t && t.value ? t.value : '';
  }
  function udvalgNu(d, iso) {
    return Butik.udvalg(d, hvilketUdvalg(), iso || valgtDag,
      tidTilUdvalg(), kurv.hvordan) || {};
  }

  function stykker(d) { return udvalgNu(d).varer; }
  function fyldene(d) { return udvalgNu(d).oenskefyld; }

  /* DAGENS RET ER EN VARE PÅ LINJE MED DE ANDRE.

     Den står ikke i menukortet — den er ét felt i admin — men
     gæsten bestiller den som enhver anden linje, og så skal
     resten af motoren kunne finde den.

     Første udgave lagde den kun ind i visStykker(), altså i
     TEGNINGEN. Så kendte hverken summen, kurvlinjen eller den
     afsendte bestilling dens pris: køkkenet fik "1 × Stegt flæsk"
     uden kroner, kurven skrev "pris følger" på en ret, der HAR en
     pris, og salgstallet ville tælle den som nul. Fundet af
     ??-prøven, som pludselig sagde "pris følger", hvor der skulle
     stå et tal.

     Retten gælder dagen i dag, som feltet i admin er skruet
     sammen — på alle andre dage findes den ikke. */
  /* ⚠️ KILDEN ER UGEPLANEN, IKKE DEN ENE INDSTILLING  (5/9).
     Her stod `(data.indstillinger || {}).dagens_ret` — feltet fra
     dengang der var ÉN dagens ret. Tabellen `dagens_retter` kom
     24/8 med en ret pr. dag, et antal og et udsolgt-flag, og
     forsiden og menukortet blev lagt om til den. bestil/ og
     ved-bordet/ blev IKKE, og det er to udgaver af den samme
     regel, som skred fra hinanden:

       · skrev ejeren torsdagens ret i ugeplanen, stod den på
         forsiden og på menukortet — men ikke her
       · og `antal_tilbage` fandtes slet ikke på de to sider, så
         "kun 3 tilbage" og udsolgt-ved-nul gjaldt den ene af tre
         bestillingsveje

     `Butik.dagensRetter` falder selv tilbage på den gamle
     indstilling, når tabellen er tom for dagen, så intet af det,
     ejeren allerede har skrevet, forsvinder. */
  function dagensRetterNu() {
    if (!valgtDag) return [];
    return Butik.dagensRetter(data, valgtDag);
  }

  function bestilbare() {
    var liste = stykker(data);
    /* KUN MED PRIS. En dagens ret uden pris kan ses og ringes om
       (spørgelisten nedenfor), men ikke lægges i kurven — samme
       regel som resten af kortet. Før red den med som "pris
       følger", og med auto_bekraeft var der ingen til at sige
       prisen: gæsten hørte den først ved lugen.

       ⚠️ OG EN UDSOLGT RET KAN IKKE LÆGGES I KURVEN. Databasens
       bremse tæller ned og sætter `udsolgt` ved nul; tog vi den
       med her, kunne gæsten fylde kurven med en ret, køkkenet
       ikke har mere af — og først få nej ved afsendelsen. */
    var retter = dagensRetterNu().filter(Butik.retKanBestilles).map(function (r) {
      return {
        navn: r.navn,
        beskrivelse: r.beskrivelse || '',
        pris: r.pris,
        kategori_id: '__dagens',
        antal_tilbage: r.antal_tilbage,
      };
    });
    return retter.concat(liste);
  }

  /* Det, man kan SE men ikke lægge i kurven: varer, ejeren ikke
     har sat pris på endnu. Dagens ret uden pris hører også til
     her — den findes, den kan ringes om, men kurven kan ikke
     lægge en pris sammen, ingen har givet os. */
  function spoergListe() {
    var liste = (udvalgNu(data).spoergPris || []).slice();
    /* Samme kilde som bestilbare() — se noten dér. Uden pris kan
       retten ses og ringes om; er den udsolgt, hører den til i
       den udsolgte liste og ikke her. */
    dagensRetterNu().forEach(function (r) {
      if (r.udsolgt) return;
      if (r.pris !== null && r.pris !== undefined && r.pris !== '') return;
      liste.unshift({
        navn: r.navn,
        beskrivelse: r.beskrivelse || '',
        kategori_id: '__dagens',
      });
    });
    return liste;
  }

  // ----------------------------------------------------------
  //  HVILKE DAGE OG TIDER KAN MAN HENTE?
  //  ----------------------------------------------------------
  //  Reglerne selv bor i js/bestil-regler.js, fordi den nye
  //  forside har sin egen formular og skal have PRÆCIS de samme.
  //  To udgaver af "hvilke dage kan vælges?" er én for meget:
  //  rettes varslet det ene sted og glemmes det andet, kan gæsten
  //  bestille til om to timer på den ene side og ikke på den
  //  anden — og ingen af delene ser forkerte ud.
  //
  //  Navnene bliver her, så resten af filen er uændret.
  // ----------------------------------------------------------
  var R = window.MosedeRegler;

  var isoPlus = R.isoPlus;
  var ugedagFor = R.ugedagFor;
  var planFor = R.planFor;
  var varselTimer = R.varselTimer;
  var tidligst = R.tidligst;
  /* ⚠️ VÆLGEREN SKAL KENDE DE KATEGORIER, SIDEN SÆLGER (30/8).
     Varslet er den mindste af dem: bestil/ sælger kun smørrebrød
     og begynder derfor i morgen som hidtil, mens forsiden med en
     burger i listen kan tilbyde i dag om en halv time. Uden det
     her ville bestil/ pludselig love smørrebrød om 30 minutter.
     udvalgNu selv bor øverst i filen nu (31/8) — den fik
     klokkeslæt og spis her/tag med med, og TO funktioner med
     samme navn i én fil er husets eget ar (hentBorde).

     ⚠️ MEN VÆLGERNE SPØRGER UDEN KLOKKESLÆT ('' — samme greb som
     js/skal/bestil.js). Fik de tiden med, bed filteret sig selv i
     halen: hvilke dage og tider der KAN vælges, ville afhænge af
     det klokkeslæt, der allerede står i feltet — og en kategori,
     der er lukket lige nu, ville forsvinde fra varslet for i
     morgen, hvor den er åben. */
  function tiderFor(d, iso, mindst, hvordan) {
    var u = Butik.udvalg(d, hvilketUdvalg(), iso, '', kurv.hvordan) || {};
    return R.tiderFor(d, iso, mindst, hvordan, u.katIds, u.smoerKategorier);
  }
  function muligeDage(d, mindst, hvordan) {
    var u = Butik.udvalg(d, hvilketUdvalg(), Butik.nu().dato, '', kurv.hvordan) || {};
    return R.muligeDage(d, mindst, hvordan, u.katIds, u.smoerKategorier);
  }
  var dagNavn = R.dagNavn;
  var dagDato = R.dagDato;

  /* Den ENE regel, der ikke er forretningens, men formularens:
     mindsteantallet er smørrebrødets og giver ingen mening for
     én is ved bord 7. Undtagelsen står her, fordi tallet bruges
     både af knappen og af afsendelsen — en undtagelse ét af
     stederne ville give en spærret knap, ingen kan se grunden
     til. */
  function minStk(d) {
    if (vedBordet()) return 1;
    return R.minStk(d);
  }

  // ----------------------------------------------------------
  //  TEGN
  // ----------------------------------------------------------
  /* ---- UDVALGET, GRUPPE FOR GRUPPE ----

     29 fyld plus stykkerne i én lang liste er en mur på en telefon.
     Grupperne foldes derfor sammen som hos spiis: den første står
     åben, resten åbnes med et tryk. Det er den samme håndbevægelse
     som fyldfolden havde i forvejen — nu bare om HELE udvalget.

     Åbnes en gruppe, hvor der allerede er valgt noget, står den
     åben af sig selv: en lukket gruppe med tre stykker i ville
     skjule gæstens egen kurv for hende. */
  var aabneGrupper = {};

  /* SLAGS-FILTERET ER SLETTET.

     Her lå valgtSlags, fraAdressen (?slags= i adressen), visSlags()
     og opdaterSlagsTal(): en række chips over listen med "hvad skal
     det være?", og et filter, der skiftede listen ud.

     Kundens ord (23/8): formularen skal være PRÆCIS som spiis', og
     dér står alle kategorier som folde i én liste. To måder at vise
     det samme udvalg på er én for meget — og filteret gemte kurvens
     indhold bag en chip, man skulle huske at kigge på.

     Koden er slettet og ikke kommenteret ud. Den kunne stadig
     køre, men valgtSlags blev sat til null i visStykker(), så
     chip-rækken skjulte sig selv hver gang: hundrede linjer, der
     så levende ud og aldrig gjorde noget. Det er præcis den
     dobbelte pænDato, opdelingen af admin fandt — se README. */


  function visStykker() {
    var boks = $('bestil-stykker');
    tøm(boks);

    /* DAGENS RET STÅR ØVERST I LISTEN — den gælder dagen i dag,
       som feltet i admin er skruet sammen, og på alle andre dage
       forsvinder den af sig selv. Den bestilles som enhver anden
       linje; køkkenet ser navnet på kortet i admin. Se
       bestilbare() om hvorfor den ikke må lægges ind HER. */
    var liste = bestilbare();
    var spoerg = spoergListe();
    if (!liste.length && !spoerg.length) {
      /* ⚠️ TOM ER IKKE ALTID "KAN IKKE HENTE" (31/8). Er alt på
         siden uden for sit tidsrum — morgenmaden efter 12.30 —
         er listen også tom, men databasen svarede fint. "Ring
         til os, vi tager den over telefonen" ville love mad,
         køkkenet lige har lukket for. Lukkelinjen ovenfor siger
         hvorfor; her siger vi kun, AT der ikke er mere. */
      var u = udvalgNu(data);
      visLukkede(u);
      boks.appendChild(lav('p', 'desc',
        (u.lukkede || []).length
          ? 'Der er ikke mere at bestille lige nu — se hvorfor ovenfor.'
          : 'Vi kan ikke hente udvalget lige nu. Ring til os – vi tager den over telefonen.'));
      return;
    }

    var s = udvalgNu(data);

    /* Gruppen er kategoriens eget navn — undtagen for fyldet, som
       får sine læsegrupper. Så hedder grillens gruppe det, den
       hedder i menukortet, uden at nogen har fundet på et ord. */
    function gruppeNavnFor(v) {
      if (v.kategori_id === '__dagens') return 'Dagens ret';
      return s.erFyld(v) ? gruppeFor(v.navn) : s.kategoriNavn(v);
    }

    var iGruppe = {};
    /* Spørg-pris-varerne er MED i grupperingen, så en kategori,
       hvor intet har fået pris endnu, stadig findes på skærmen —
       med sine varer og et nummer at ringe på. Uden dem ville
       hele kategorien forsvinde, og så opretter nogen varen, der
       allerede findes. De tælles IKKE med i kurv eller sum: de
       står aldrig i `liste`. */
    liste.concat(spoerg).forEach(function (v) {
      var navn = gruppeNavnFor(v);
      if (!iGruppe[navn]) iGruppe[navn] = [];
      iGruppe[navn].push(v);
    });

    /* RÆKKEFØLGEN ER FAST, ikke den varerne tilfældigvis står i.
       Første udkast lod grupperne komme i den rækkefølge, deres
       første vare havde i sorteringen — og så stod "Andet godt"
       midt imellem de navngivne grupper. En rest-gruppe hører
       sidst, og gæsten skal finde de samme grupper det samme sted
       hver gang. Stykkerne først: de har deres egne priser og er
       det, forsiden lover. */
    /* Smørrebrødets egne grupper: stykkerne, fyldets læsegrupper
       og resten. De hører sammen som ÉN slags — det er ét bord,
       man dækker — mens hver af ejerens åbnede kategorier er sin
       egen. */
    /* ⚠️ ALLE smørrebrødets kategorier, ikke kun den første
       (1/9). Med hel skive OG håndmadder er der to, og en
       kategori, der ikke står i rækkefølgen, tegnes aldrig —
       dens varer ligger i `liste` og bliver ikke vist. Listen
       kommer fra Butik.udvalg, så skellet bor ét sted. */
    var smoerGrupper = (s.stykkeGrupper && s.stykkeGrupper.length
      ? s.stykkeGrupper.slice() : [s.stykkeGruppe])
      .concat(GRUPPER.map(function (g) { return g.navn; }))
      .concat(['Andet godt']);

    function harNoget(navne) {
      return navne.some(function (n) { return iGruppe[n] && iGruppe[n].length; });
    }

    /* ⚠️ DAGENS RET ER IKKE EN GRUPPE MERE  (5/9).
       Kundens ord: den *"skal være mere eksklusiv … og ikke ligge
       under retter men over alle de der mad ting … og fjernes fra
       sectionen under retter"*.

       Den stod som den FØRSTE fold i listen — altså som en
       kategori på lige fod med Grillen og Burgere, bare øverst.
       Nu står den i sin egen blok OVER hele listen, og navnet er
       ude af rækkefølgen, så den ikke også får en fold.

       ⚠️ RÆKKERNE ER DE SAMME. Blokken er kun en beholder;
       `liste.forEach` nedenfor fylder den gennem `iGruppe`, som
       den altid har gjort. Byggede vi en ny slags række her,
       ville tælleren, kurven og summen få hver sin udgave — og
       den ene ville langsomt komme til at gøre noget andet. */
    var rækkefølge = smoerGrupper.concat(s.ekstraGrupper)
      .filter(function (navn) { return iGruppe[navn] && iGruppe[navn].length; });

    /* ALTID FOLDE, OGSÅ MED ÉN GRUPPE — det er foldene, der gør
       spiis-formen kort nok til en telefon, og en liste, der
       skifter form efter antallet af grupper, er to formularer
       at teste og huske. Dagens ret-gruppen står ØVERST og ÅBEN:
       det er den, dagen byder på.

       Den ENE undtagelse er bordet. Dér er der ingen luge at gå
       op til og spørge, og en foldet liste er så mange tryk, at
       man giver op. Kortvisningen bytter foldene ud med åbne
       afsnit plus søgefelt og chips — samme udvalg, samme kurv,
       samme afsendelse. Se kortVisning() ovenfor. */
    var brugFolde = !kortVisning();

    /* ---- DAGENS RET: sin egen blok, øverst ----------------
       Den tegnes FØR søgefeltet og chipsene: dagens ret er ikke
       noget, man leder efter i en liste på 242 varer — den er
       dét, dagen byder på, og den skal stå, før man begynder at
       lede. Er der ingen ret på den valgte dag, findes blokken
       ikke; et tomt kort med en overskrift er en side, der ser i
       stykker ud. */
    if (iGruppe['Dagens ret'] && iGruppe['Dagens ret'].length) {
      var dagBlok = lav('section', 'dagens-blok');
      dagBlok.setAttribute('data-gruppe', 'Dagens ret');
      var dagHoved = lav('div', 'dagens-blok-hoved');
      dagHoved.appendChild(lav('span', 'dagens-blok-tegn', '🍲'));
      dagHoved.appendChild(lav('h3', 'dagens-blok-titel', 'Dagens ret'));
      /* Hvilken DAG retten gælder. Med ugeplanen kan gæsten stå
         på torsdag og se torsdagens ret; uden datoen ville hun
         tro, det var i dag. */
      /* ⚠️ IKKE dagNavn(): den forkorter til "Tor.", og "tor."
         med lille er ikke en dag, et menneske læser. Her er der
         plads til hele ordet. */
      var dagNaar = valgtDag === Butik.nu().dato ? 'i dag'
        : (valgtDag === R.isoPlus(Butik.nu().dato, 1) ? 'i morgen'
          : Butik.UGEDAGE[R.ugedagFor(valgtDag)].toLowerCase()
            + ' d. ' + dagDato(valgtDag));
      dagHoved.appendChild(lav('span', 'dagens-blok-dag', dagNaar));
      dagBlok.appendChild(dagHoved);
      var dagKrop = lav('div', 'dagens-blok-krop');
      dagBlok.appendChild(dagKrop);
      boks.appendChild(dagBlok);
      iGruppe['Dagens ret'].boks = dagKrop;
    }

    /* Søgefeltet og chipsene tegnes FØR afsnittene, så de kan nå
       at kende dem. De findes kun i kortvisningen. */
    if (!brugFolde) byggSoegOgChips(boks, rækkefølge);

    rækkefølge.forEach(function (gruppeNavn, nr) {
      /* ---- KORTVISNINGEN: åbne afsnit ---------------------
         Ingen fold, ingen pil. Overskriften i seriffen, ejerens
         egen note under den, og varerne som kort. Afsnittet
         bærer sit navn i data-gruppe, så chipsene og søgningen
         kan finde det uden at kende rækkefølgen. */
      if (!brugFolde) {
        var afsnit = lav('section', 'kort-gruppe');
        afsnit.setAttribute('data-gruppe', gruppeNavn);
        var titel = lav('h3', 'kort-gruppe-titel');
        var tegn = kortTegn(gruppeNavn);
        if (tegn) titel.appendChild(tegn);
        titel.appendChild(lav('span', 'kort-gruppe-navn', gruppeNavn));
        afsnit.appendChild(titel);
        var noten = kategoriNote(gruppeNavn);
        if (noten) afsnit.appendChild(lav('p', 'kort-gruppe-note', noten));
        var krop2 = lav('div', 'kort-gruppe-krop');
        afsnit.appendChild(krop2);
        boks.appendChild(afsnit);
        iGruppe[gruppeNavn].boks = krop2;
        return;
      }
      var valgtIGruppen = iGruppe[gruppeNavn].some(function (v) {
        return (kurv.stk[v.navn] || 0) > 0;
      });
      // Den første gruppe er åben fra start — ellers møder gæsten
      // en side, hvor der ikke er noget at se.
      if (aabneGrupper[gruppeNavn] === undefined) aabneGrupper[gruppeNavn] = nr === 0;
      var åben = aabneGrupper[gruppeNavn] || valgtIGruppen;

      var gruppe = lav('div', 'vare-gruppe');
      var hoved = lav('button', 'fold-hoved');
      hoved.type = 'button';
      hoved.setAttribute('aria-expanded', åben ? 'true' : 'false');
      hoved.appendChild(lav('span', 'fold-navn', gruppeNavn));

      var antalValgt = iGruppe[gruppeNavn].reduce(function (n, v) {
        return n + (kurv.stk[v.navn] || 0);
      }, 0);
      var note = lav('span', antalValgt ? 'fold-note valgt' : 'fold-note',
        antalValgt ? antalValgt + ' valgt' : '+ tilføj');
      hoved.appendChild(note);
      hoved.appendChild(lav('span', 'fold-pil'));

      var krop = lav('div', 'fold-krop');
      if (!åben) krop.hidden = true;

      hoved.addEventListener('click', function () {
        aabneGrupper[gruppeNavn] = krop.hidden;
        krop.hidden = !krop.hidden;
        hoved.setAttribute('aria-expanded', krop.hidden ? 'false' : 'true');
      });

      gruppe.appendChild(hoved);
      gruppe.appendChild(krop);
      boks.appendChild(gruppe);
      iGruppe[gruppeNavn].boks = krop;
      iGruppe[gruppeNavn].note = note;
    });

    /* Tallet i gruppehovedet skal følge tælleren MED DET SAMME.
       Gjorde det ikke det, stod der "+ tilføj" på en gruppe med
       tre stykker i, så snart gæsten lukkede den — og så tæller
       hun forfra. Kun noten opdateres: en hel gentegning ville
       lukke folde og flytte fokus midt i et tryk. */
    function opdaterNote(gruppeNavn) {
      var g = iGruppe[gruppeNavn];
      // Kortvisningen har ingen fold-note at opdatere — tallet
      // står i kurvbjælken i bunden, hvor det altid er synligt.
      if (!g || !g.note) return;
      var n = g.reduce(function (sum, v) { return sum + (kurv.stk[v.navn] || 0); }, 0);
      g.note.textContent = n ? n + ' valgt' : '+ tilføj';
      g.note.className = n ? 'fold-note valgt' : 'fold-note';
    }

    liste.forEach(function (v) {
      var gNavn = gruppeNavnFor(v);
      var boks = iGruppe[gNavn].boks;
      /* Varen hører til en anden slags end den valgte, og dens
         gruppe er derfor ikke tegnet. Uden det her linjestykke
         faldt hele siden fra hinanden med "Cannot read properties
         of undefined": grupperne blev filtreret, varerne blev
         ikke — og gæsten mødte "Vi kan ikke tage imod lige nu" på
         en side, hvor alt virkede. */
      if (!boks) return;
      var r = lav('div', 'stk-linje');

      /* Det, søgningen leder i: navn OG beskrivelse. "bacon" skal
         finde Havnens all in one, selv om ordet kun står i
         beskrivelsen — gæsten søger efter det, hun vil spise,
         ikke efter det, retten hedder. Sat som attribut og ikke
         læst af DOM'en hver gang: søgningen løber 242 rækker
         igennem ved hvert tastetryk. */
      r.setAttribute('data-soeg', v.navn + ' ' + (v.beskrivelse || ''));
      /* ⚠️ SÅ KURVENS LISTE KAN FINDE RÆKKEN IGEN (31/8). Uden
         den måtte et tryk i kurven tegne HELE listen om for at
         rette ét tal — 242 rækker for ét minus, og præcis den
         slags hak, kunden bad om at få væk. */
      r.setAttribute('data-vare', v.navn);
      if (v.fremhaevet) r.setAttribute('data-favorit', 'ja');

      /* ⚠️ BILLEDET, NÅR EJEREN HAR LAGT ET OP  (31/8).

         Kundens ord: *"du skal gøre, så hver en ting har billede,
         som de selv kan lægge ind i admin."* Han taler om siden
         ved bordet, hvor gæsten sidder med en liste over 242
         navne, hun ikke kender.

         ⚠️ INGEN PLADSHOLDER. Har varen intet foto, står rækken
         som før — ikke med en grå kasse. Det er den samme regel
         som js/skal/billedplads.js og arrangementets billede: en
         tom grå flade er værre end ingen plads, og et stockfoto
         ville love en ret, forretningen ikke har vist os. Derfor
         ser et kort UDEN fotos præcis ud som i dag.

         ⚠️ loading="lazy" ER DET ENE ORD, DET HÆNGER PÅ. Med 242
         rækker ville ivrig hentning være 242 billeder på en
         telefon ved et bord — og fartprøven i
         tests/skal-forside.spec.js tæller de forespørgsler,
         BROWSEREN faktisk sender. */
      if (v.billede) {
        var foto = document.createElement('img');
        foto.className = 'stk-foto';
        foto.src = v.billede;
        foto.loading = 'lazy';
        foto.decoding = 'async';
        /* Alt-teksten er varens navn og ikke "billede af mad":
           en skærmlæser skal kunne skelne to rækker fra hinanden. */
        foto.alt = v.navn;
        r.appendChild(foto);
      }

      var tegn1 = vareTegn(v, s.katFor && s.katFor(v));
      if (tegn1) r.appendChild(tegn1);

      var tekst = lav('div', 'stk-tekst');
      var navnLinje = lav('span', 'navn', v.navn);
      tekst.appendChild(navnLinje);
      if (v.beskrivelse) tekst.appendChild(lav('p', 'desc', v.beskrivelse));
      /* ⚠️ "KUN 3 TILBAGE" DÉR, HVOR MAN BESTILLER  (5/9).
         Tallet stod kun på menukortet, som man netop IKKE
         bestiller fra — så gæsten kunne lægge fire i kurven af en
         ret med tre tilbage og først få nej ved afsendelsen.
         Grænsen er Butik.faaTilbage, den samme som menukortets. */
      var faaTilbage = Butik.faaTilbage && Butik.faaTilbage(v);
      if (faaTilbage) {
        tekst.appendChild(lav('span', 'stk-faa', 'Kun ' + faaTilbage + ' tilbage'));
      }
      r.appendChild(tekst);

      /* ?? og ikke et gæt: prisen er ikke sat i admin endnu, og
         et opdigtet tal er en skuffet kunde i telefonen. Noten
         under listen forklarer de to spørgsmålstegn — den tændes
         nedenfor, KUN når mindst én vare mangler pris. */
      r.appendChild(lav('span', 'stk-pris',
        v.pris === null || v.pris === undefined ? '??,-' : window.MosedePris(v.pris)));

      /* Tælleren. To knapper og et tal, ikke et talfelt: på en
         telefon åbner et talfelt tastaturet og dækker halvdelen af
         listen, og man skal alligevel kun én op eller ned. */
      var taeller = lav('div', 'taeller');
      var ned = lav('button', 'glass rund', '−');
      var tal = lav('span', 'taeller-tal', kurv.stk[v.navn] || 0);
      var op = lav('button', 'glass rund', '+');

      ned.type = op.type = 'button';
      ned.setAttribute('aria-label', 'Én færre ' + v.navn);
      op.setAttribute('aria-label', 'Én mere ' + v.navn);
      tal.setAttribute('aria-live', 'polite');
      tal.setAttribute('aria-label', 'Antal ' + v.navn);

      function saet(n) {
        n = Math.max(0, Math.min(200, n));
        if (n) kurv.stk[v.navn] = n; else delete kurv.stk[v.navn];
        tal.textContent = n;
        r.classList.toggle('valgt', n > 0);
        ned.disabled = n === 0;
        opdaterNote(gNavn);
        gemKurv();
        visSum();
      }

      ned.addEventListener('click', function () { saet((kurv.stk[v.navn] || 0) - 1); });
      op.addEventListener('click', function () { saet((kurv.stk[v.navn] || 0) + 1); });

      taeller.appendChild(ned);
      taeller.appendChild(tal);
      taeller.appendChild(op);
      r.appendChild(taeller);

      saet(kurv.stk[v.navn] || 0);
      boks.appendChild(r);
    });

    /* VARER UDEN PRIS: uden plusknap, med en forklaring og et
       trykbart nummer — spiis' egen rettelse (25/8), efter at en
       ret uden pris stod fire dage i deres produktionsdatabase og
       talte som gratis. Hos os var hullet større: over halvdelen
       af kortet står uden pris, til ejeren har skrevet tallene.

       Rækken ligner de bestilbare, så varen kan FINDES — men
       handlingen er telefonen, ikke kurven.

       ⚠️ MEN IKKE VED BORDET. Gæsten SIDDER der, tyve meter fra
       lugen, og et "Ring og hør prisen" beder hende ringe til
       en luge, hun kan se. Målt 27/8 på ved-bordet/?bord=7: hver
       vare uden pris havde en knap med tel:+4528871343 — og lige
       under den stod sidens egen note og sagde "sig det til os
       ved lugen". To modsatte beskeder på den samme skærm.

       Det er den samme regel, der allerede gælder sms-nødudgangen
       på den side: ved bordet er svaret at gå op til lugen, ikke
       at bruge telefonen. Så rækken siger det, og den er IKKE et
       link — en knap, der ikke gør noget, er værre end ingen
       knap. */
    var m = window.MOSEDE;
    var vedBord = vedBordet();
    spoerg.forEach(function (v) {
      var boks2 = iGruppe[gruppeNavnFor(v)] && iGruppe[gruppeNavnFor(v)].boks;
      if (!boks2) return;
      var r = lav('div', 'stk-linje spoerg-pris');
      /* ⚠️ SAMME IDENTITET SOM EN BESTILBAR RÆKKE  (2/9).

         MÅLT ved bordet, ikke læst: uden data-soeg gav
         søgefeltet den her række `null` at lede i, og et
         `''.indexOf('morgen')` er -1. Altså forsvandt
         "Morgenbrød" i det sekund gæsten søgte på "morgen" —
         netop den række, hun ledte efter. data-vare er dens
         navn, som på alle andre rækker; uden den kan hverken
         kurven, filtrene eller en prøve få fat i den. */
      r.setAttribute('data-vare', v.navn);
      r.setAttribute('data-soeg', v.navn + ' ' + (v.beskrivelse || ''));
      var tegn2 = vareTegn(v, s.katFor && s.katFor(v));
      if (tegn2) r.appendChild(tegn2);
      var tekst = lav('div', 'stk-tekst');
      tekst.appendChild(lav('span', 'navn', v.navn));
      if (v.beskrivelse) tekst.appendChild(lav('p', 'desc', v.beskrivelse));
      r.appendChild(tekst);
      if (vedBord) {
        var sig = lav('span', 'spoerg-chip', 'Spørg os om prisen');
        sig.setAttribute('aria-label',
          'Spørg os om prisen på ' + v.navn + ' ved lugen');
        r.appendChild(sig);
      } else {
        var ring = lav('a', 'spoerg-chip', 'Ring og hør prisen');
        ring.href = 'tel:' + (m ? m.telefon : '');
        ring.setAttribute('aria-label',
          'Ring og hør prisen på ' + v.navn + (m ? ' – ' + m.telefonPent : ''));
        r.appendChild(ring);
      }
      boks2.appendChild(r);
    });

    /* Udsolgte vises EFTER de bestilbare, gennemstreget og uden
       tæller. Se noten i store.js: en vare, der forsvinder, ligner
       en vare, der ikke findes.

       Også udsolgt FYLD med pris hører til her: i model A er det en
       vare på lige fod, og den skal savnes det sted, den plejer at
       stå. Udsolgt fyld UDEN pris bliver i ønskefolden nedenfor. */
    /* ⚠️ HER STOD ET GARD, DER SKJULTE DEN UDSOLGTE VARE  (31/8).

       Linjen var `if (rækkefølge.indexOf(gruppeNavnFor(v)) === -1)
       return;` — altså: vis kun det udsolgte, hvis dets LÆSEGRUPPE
       har mindst én vare, man kan bestille. Er "Hjemmelavet
       hønsesalat" udsolgt, og er den den eneste i sin gruppe,
       forsvandt den helt fra skærmen. Præcis dét, hele afsnittet
       her er skrevet for at undgå: en vare, der forsvinder, ligner
       en vare, der ikke findes, og så tror gæsten, at kortet er
       blevet mindre.

       Gardet var overflødigt: s.udsolgt kommer fra Butik.udvalg og
       ER allerede filtreret til DEN HER sides udvalg — smørrebrødets
       egne kategorier plus dem, ejeren har åbnet for i dag på det
       valgte klokkeslæt. Der er ikke noget "fra en anden slags" at
       holde ude.

       Det blev synligt, da ønskefyldet forsvandt (1 mad er 1 mad):
       før stod udsolgt fyld uden pris i ønskefolden, som havde sin
       egen visning og sit eget gard. */
    s.udsolgt.forEach(function (v) {
      var r = lav('div', 'stk-linje udsolgt');
      /* Samme identitet som resten — se noten ved spørg-rækken.
         ⚠️ OG DEN BÆRER SIN GRUPPE MED: rækken står NEDERST og
         ikke inde i et .kort-gruppe-afsnit, så filteret kan ikke
         læse gruppen af sin forælder. MÅLT: uden det stod den
         udsolgte burger som det ENESTE tilbage på skærmen, mens
         gæsten søgte på noget helt andet. */
      r.setAttribute('data-vare', v.navn);
      r.setAttribute('data-soeg', v.navn + ' ' + (v.beskrivelse || ''));
      r.setAttribute('data-gruppe', gruppeNavnFor(v));
      var tegn3 = vareTegn(v, s.katFor && s.katFor(v));
      if (tegn3) r.appendChild(tegn3);
      var tekst = lav('div', 'stk-tekst');
      tekst.appendChild(lav('span', 'navn', v.navn));
      r.appendChild(tekst);
      r.appendChild(lav('span', 'udsolgt-chip', 'Udsolgt i dag'));
      boks.appendChild(r);
    });
    /* Noten om varer uden pris — tændes KUN når mindst én står på
       skærmen. En fodnote om noget, der ikke er på siden, er
       støj. */
    var prisNote = $('bestil-pris-note');
    if (prisNote) prisNote.classList.toggle('skjult', !spoerg.length);

    visLukkede(s);

    /* Filtrene kører til sidst — de skal kende de rækker, der lige
       er tegnet. Kaldet er også dét, der bringer en søgning med
       over en gentegning: skriver gæsten "burger" og lægger en i
       kurven, tegnes listen om, og uden linjen her ville alle 242
       varer komme tilbage under fingeren. */
    if (boks._kortFiltre) boks._kortFiltre();
  }

  /* ⚠️ DET LUKKEDE SIGER HVORFOR (31/8). Kundens ord: "når
     klokken er over lukke, så lad der stå: klokken er over 13,
     vi sælger ikke morgenmad længere." Butik.udvalg har samlet
     lukkede[] med en grund pr. kategori siden 30/8 — men den her
     fil læste den aldrig (den spurgte slet ikke med klokkeslæt,
     se tidTilUdvalg), så en kategori uden for sit tidsrum bare
     FORSVANDT — og en forsvundet kategori ligner en fejl på
     siden, ikke en lukketid. Linjen står over listen, samme form
     som #lukkede i js/skal/bestil.js. */
  function visLukkede(u) {
    var boks = $('bestil-lukkede');
    if (!boks) return;
    tøm(boks);
    var liste = (u && u.lukkede) || [];

    /* ⚠️ VED BORDET ER DER INGEN DAGVÆLGER  (5/9). Dagen ER i
       dag, og måden ER spis her — så en dag, der er lukket for
       spis her, kan ikke siges i en vælger, gæsten ikke har.
       Uden linjen her ville hun scanne mærkatet, læse hele
       kortet, fylde kurven og først få nej ved afsendelsen.

       ⚠️ OG KUN VED BORDET. På bestil/ og forsiden siger
       dagvælgeren det, MENS hun vælger dag — to steder med den
       samme besked ville være to udgaver at holde ved lige. */
    var lukketVedBordet = vedBordet() && Butik.dagLukketFor
      ? Butik.dagLukketFor(data, Butik.nu().dato, 'spis_her') : null;
    if (lukketVedBordet) {
      boks.classList.remove('skjult');
      boks.appendChild(lav('b', null, 'I dag: '));
      boks.appendChild(lav('span', null, lukketVedBordet));
      return;
    }

    boks.classList.toggle('skjult', !liste.length);
    if (!liste.length) return;
    boks.appendChild(lav('b', null, 'Ikke lige nu: '));
    liste.forEach(function (l, i) {
      boks.appendChild(lav('span', null,
        (i ? ' · ' : '') + l.navn + (l.grund ? ' (' + l.grund + ')' : '')));
    });
  }

  /* ---- FYLDET GRUPPERES ----

     29 slags i én bunke er en mur. Grupperne herunder er en
     LÆSEHJÆLP vi lægger ovenpå, ikke data: de findes som ordlister
     her og ikke som en kolonne i databasen, så personalet kan skrive
     et nyt fyld i admin uden først at skulle vælge en gruppe. Et
     fyld der ikke passer nogen steder, havner i "Andet godt" i
     stedet for at forsvinde.

     Rækkefølgen betyder noget. "Æggesalat med bacon" indeholder både
     "æg" og "bacon", og den hører under salater. Derfor prøves
     grupperne i rækkefølge, og den første der passer, vinder. */
  var GRUPPER = [
    { navn: 'Salater',
      ord: ['salat', 'wienersalat', 'skinkesalat', 'hønsesalat', 'makrelsalat'] },
    { navn: 'Fisk og skaldyr',
      /* "reje" og ikke "rejer": rejemad, rejesalat og rejer skal
         alle i fisken. Med det lange ord faldt "Rejemad med
         mayonnaise" i Andet godt — set på et skærmbillede, da
         grupperne blev til synlige folde. */
      ord: ['fisk', 'sild', 'reje', 'makrel', 'laks'] },
    { navn: 'Kød og pålæg',
      ord: ['flæskesteg', 'pølse', 'rullepølse', 'roastbeef', 'skinke', 'kylling',
            'spegepølse', 'leverpostej', 'dyrlægens', 'frikadelle', 'bacon', 'kød'] },
    { navn: 'Æg og kartoffel', ord: ['æg', 'kartoffel', 'spejlæg'] },
    { navn: 'Ost og grønt', ord: ['ost', 'tomat', 'agurk', 'peberfrugt'] }
  ];

  /* ⚠️ TEGNET ER SIT EGET ELEMENT, IKKE EN DEL AF NAVNET (1/9).

     Kundens ord: *"prop emojis derinde, så det ser lidt
     attraktivt ud at vælge nogle retter."*

     Skrevet ind i `.navn` ville varens tekst hedde
     "🥓Flæskesteg med surt" — og det er DEN tekst, `data-vare`,
     kurven, bonen og halvdelen af prøverne læser. Samme ar som
     kategoritegnet fik 29/8. `aria-hidden`, fordi en skærmlæser
     ikke skal sige "bacon flæskesteg med surt".

     ⚠️ IKKE PÅ EN RÆKKE MED FOTO. Har ejeren lagt et billede op,
     er dét varens ansigt; to ansigter på samme række er rod. */
  function vareTegn(v, kat) {
    if (!v || v.billede) return null;
    var E = window.MosedeEmoji;
    if (!E || !E.forVare) return null;
    var tegn = lav('span', 'stk-tegn', E.forVare(v, kat));
    tegn.setAttribute('aria-hidden', 'true');
    return tegn;
  }

  function gruppeFor(navn) {
    var lille = String(navn).toLowerCase();
    for (var i = 0; i < GRUPPER.length; i++) {
      for (var j = 0; j < GRUPPER[i].ord.length; j++) {
        if (lille.indexOf(GRUPPER[i].ord[j]) !== -1) return GRUPPER[i].navn;
      }
    }
    return 'Andet godt';
  }

  function visFyld() {
    var boks = $('bestil-fyld');
    /* Fyldfolden findes ikke ved bordet. Uden den her linje
       kastede tøm(null) EFTER at overskriften var skrevet: den
       rigtige side, ingen formular, ingen fejl på skærmen. */
    if (!boks) return;
    tøm(boks);

    var liste = fyldene(data);
    if (!liste.length) {
      var trin = $('bestil-fyld-trin');
      if (trin) trin.classList.add('skjult');
      return;
    }

    /* Udsolgt fyld står med i sin gruppe — gennemstreget og dødt.
       De bestilbare først i hver gruppe, de udsolgte efter. */
    var udsolgt = Butik.smoerrebroed(data).udsolgt.fyld.filter(function (v) {
      // Kun det udsolgte fyld UDEN pris hører til i ønskefolden;
      // resten står gennemstreget i sin egen gruppe ovenfor.
      return v.pris === null || v.pris === undefined || v.pris === '';
    });

    var efterGruppe = {};
    liste.forEach(function (v) {
      var g = gruppeFor(v.navn);
      (efterGruppe[g] = efterGruppe[g] || []).push(v);
    });
    udsolgt.forEach(function (v) {
      var g = gruppeFor(v.navn);
      (efterGruppe[g] = efterGruppe[g] || []).push(v);
    });

    // Grupperne i den rækkefølge de er defineret, "Andet godt" sidst
    var raekke = GRUPPER.map(function (g) { return g.navn; }).concat(['Andet godt']);
    var kasser = {};
    raekke.forEach(function (navn) {
      if (!efterGruppe[navn] || !efterGruppe[navn].length) return;
      var gr = lav('div', 'fyld-gruppe');
      gr.appendChild(lav('div', 'eyebrow', navn));
      var pilleboks = lav('div', 'fyld-valgene');
      gr.appendChild(pilleboks);
      boks.appendChild(gr);
      kasser[navn] = pilleboks;
    });

    liste.forEach(function (v) {
      /* Et rigtigt afkrydsningsfelt, skjult bag pillen. Så virker
         tastatur, oplæsning og "vælg alle" af sig selv – en div med
         en klik-lytter gør ingen af de tre ting. */
      var id = 'fyld-' + v.id;
      var etiket = lav('label', 'fyld-valg');
      etiket.setAttribute('for', id);

      var boksen = document.createElement('input');
      boksen.type = 'checkbox';
      boksen.id = id;
      boksen.value = v.navn;
      boksen.checked = kurv.fyld.indexOf(v.navn) !== -1;

      boksen.addEventListener('change', function () {
        var i = kurv.fyld.indexOf(v.navn);
        if (boksen.checked && i === -1) kurv.fyld.push(v.navn);
        if (!boksen.checked && i !== -1) kurv.fyld.splice(i, 1);
        etiket.classList.toggle('valgt', boksen.checked);
        gemKurv();
        visSum();
      });

      etiket.classList.toggle('valgt', boksen.checked);
      etiket.appendChild(boksen);
      etiket.appendChild(lav('span', null, v.navn));
      (kasser[gruppeFor(v.navn)] || boks).appendChild(etiket);
    });

    /* De udsolgte til sidst i hver gruppe — efter de bestilbare. */
    udsolgt.forEach(function (v) {
      var pille = lav('span', 'fyld-valg udsolgt');
      pille.appendChild(lav('span', null, v.navn));
      pille.appendChild(lav('span', 'udsolgt-chip', 'udsolgt'));
      var kasse = kasser[gruppeFor(v.navn)];
      if (kasse) kasse.appendChild(pille);
    });
  }

  function visDage() {
    /* DATOEN ER EN VÆLGER, SOM HOS SPIIS — øverst, altid synlig,
       med "· dagens ret" eller "· menukort" i hver linje, så man
       kan se hvad dagen byder på, FØR man vælger den. Noten under
       vælgeren forklarer de tomme tilstande: sæson, en dag der
       mangler, eller en dag uden dagens ret. */
    var boks = $('bestil-dag');
    var note = $('bestil-dag-note');
    if (!boks) return;
    tøm(boks);

    function sigNote(tekst) {
      if (!note) return;
      note.textContent = tekst || '';
      note.classList.toggle('skjult', !tekst);
    }

    /* SÆSONEN LUKKER OGSÅ FORMULAREN. lukketDen dækker kun
       kalenderens lukkedage, og sæsonlukningen bor i
       indstillinger — uden det her stod formularen og tilbød
       afhentningsdage midt i vinterlukningen, mens forsidens
       pille sagde lukket. Fundet ved at læse spiis-briefen (22/8),
       bevist ved at prøve: sæson til, og dagene stod der stadig. */
    var sæson = (data.indstillinger || {}).saeson || {};
    if (sæson.lukket) {
      sigNote('Vi er lukket for sæsonen'
        + (sæson.aabner_igen ? ' og åbner igen ' + sæson.aabner_igen : '')
        + '. Ring til os, hvis det ikke kan vente.');
      return;
    }

    /* ⚠️ MÅDEN SKAL MED  (5/9). Her stod `muligeDage(data)` uden
       tredje argument, og `tiderFor` springer hele sit tjek af
       `luk_takeaway` / `luk_spis_her` over, når `hvordan` er
       undefined (bestil-regler.js linje 481). MÅLT: en dag,
       ejeren havde lukket for mad ud af huset, blev tilbudt i
       vælgeren — gæsten valgte den, fyldte kurven, skrev navn og
       nummer, og fik først databasens `bestilling_takeaway_lukket`
       at se, da hun trykkede send. Det er husets egen regel om,
       at et krav, man møder som et afslag, er skrevet det
       forkerte sted. */
    var dage = muligeDage(data, null, kurv.hvordan);
    if (!dage.length) {
      /* Er ALLE dage lukket for netop den måde, skal der stå
         hvorfor — ikke bare "vi kan ikke se nogen åbne dage". */
      var hvorfor = Butik.dagLukketFor
        ? Butik.dagLukketFor(data, Butik.nu().dato, kurv.hvordan) : null;
      sigNote(hvorfor
        || 'Vi kan ikke se nogen åbne dage lige nu. Ring til os, så finder vi en tid.');
      return;
    }

    /* EN DAG, DER MANGLER, FORKLARER SIG — spiis' dyreste fejl:
       kl. 19 var tidslisten bare tom, og kunden troede siden var i
       stykker. Vores liste viser aldrig en tom dag, men SAVNET af
       "i dag" skal stadig forklares — ELLERS ser gæsten en række,
       der starter i morgen, og tror det samme.

       Kun når varslet faktisk lader dagen i dag være mulig
       (tidligst().dato er i dag): står varslet i vejen, forklarer
       #bestil-varsel det allerede, og to forklaringer om det
       samme fravær peger gæsten i hver sin retning. */
    var iDag = Butik.nu().dato;
    var iDagNote = null;
    if (tidligst(data).dato === iDag && dage.indexOf(iDag) === -1) {
      iDagNote = planFor(data, iDag)
        ? 'Ikke flere afhentningstider i dag — sidste afhentning ligger en '
          + 'halv time før lukketid. Vælg en af de næste dage, eller ring.'
        : 'Vi holder lukket i dag. Vælg en af de næste dage.';
    }

    if (dage.indexOf(valgtDag) === -1) valgtDag = dage[0];

    /* ⚠️ UDVALGET HEJSES UD AF LØKKEN. Slået op pr. dag ville
       Butik.udvalg filtrere ejerens 262 varer fjorten gange for
       hver eneste optegning af vælgeren. */
    var uDag = Butik.udvalg(data, hvilketUdvalg(), Butik.nu().dato, '',
      kurv.hvordan) || {};
    dage.forEach(function (iso) {
      var o = document.createElement('option');
      o.value = iso;
      /* ⚠️ HVER DAG HAR SIN EGEN RET NU. Her stod, at dagens ret
         "gælder DAGEN I DAG — det er sådan, feltet i admin er
         skruet sammen". Det holdt op med at passe 24/8, da
         ugeplanen kom: ejeren skriver torsdagens ret om mandagen,
         og så skal torsdag i vælgeren sige "dagens ret". */
      /* ⚠️ EN FYLDT DAG BLIVER STÅENDE, den fjernes ikke — en dag,
         der MANGLER, ligner en fejl, og gæsten leder efter den i
         stedet for at vælge en anden. Samme regel som den fulde
         lørdag i bordstriben. */
      var fuldDag = R.dagFuld
        ? R.dagFuld(data, fyldteTider, iso, null, kurv.hvordan, uDag.katIds,
          uDag.smoerKategorier)
        : false;
      /* ⚠️ EN LUKKET DAG NÅR ALDRIG HERTIL — MÅLT, IKKE ANTAGET.
         Min første udgave spærrede dagen her med et
         `o.disabled`. Det var uopnåelig kode: `tiderFor` i
         bestil-regler.js svarer med en TOM liste, når dagen er
         lukket for den valgte måde, og `muligeDage` springer den
         derfor helt over. Dagen står altså ikke i vælgeren i
         forvejen.

         Det, der manglede, var ikke en spærring — det var et
         SVAR. Se noten ved sigNote() nedenfor. */
      o.textContent = dagNavn(data, iso) + ' d. ' + dagDato(iso)
        + (fuldDag ? ' · fyldt op'
          : (Butik.dagensRetter(data, iso).length ? ' · dagens ret' : ' · menukort'));
      o.disabled = fuldDag;
      if (iso === valgtDag) o.selected = true;
      boks.appendChild(o);
    });

    /* Én note ad gangen, den vigtigste først: hvorfor i dag
       mangler — og ellers spiis' egen linje om dagen uden ret. */
    /* ⚠️ SPØRG DEN VALGTE DAG, IKKE KUN I DAG. Her stod
       `valgtDag === iDag && ret.navn` fra dengang der kun fandtes
       ÉN ret, og `ret` var hejst ud af løkken ovenfor. Med
       ugeplanen har hver dag sin egen, og noten skal følge den
       dag, gæsten står på. */
    /* ⚠️ HVORFOR I DAG IKKE ER I VÆLGEREN  (5/9).
       Kundens ord: der skal *"eventuelt komme en lille besked
       ting derude at i dag er der lukket for køkkenet eller
       lukket for to-go, spisning"*.

       MÅLT: er dagen lukket for netop den måde, gæsten har valgt,
       forsvinder den HELT fra vælgeren — `tiderFor` svarer med en
       tom liste. Der stod altså ingenting om hvorfor, og en dag,
       der MANGLER, ligner en fejl: gæsten leder efter i dag i
       stedet for at vælge en anden dag.

       Beskeden er gæstens ord, ikke databasens: hun skal vide,
       hvad hun så kan gøre — spise her, hvis kun to-go er lukket,
       og tage med hjem, hvis kun spisningen er. */
    var lukketNu = Butik.dagLukketFor
      ? Butik.dagLukketFor(data, Butik.nu().dato, kurv.hvordan) : null;
    sigNote(lukketNu || iDagNote
      || (Butik.dagensRetter(data, valgtDag).length ? ''
        : 'Ingen dagens ret denne dag – vælg frit fra menukortet.'));

    boks.onchange = function () {
      valgtDag = boks.value;
      visDage();
      /* Tiderne FØR listen — listen klippes efter det valgte
         klokkeslæt, og den nye dags tider kan være andre (31/8). */
      visTider();
      visStykker();
      visFyld();
      visSum();
    };
  }

  /* ---- SPIS HER ELLER TAG MED ----

     Spiis lader gæsten vælge, og forskellen er ikke kosmetisk: den
     ene skal pakkes i en pose, den anden skal stå på et bord med
     bestik. Køkkenet skal kunne se det på kortet — ikke læse sig
     til det i en fritekst midt i en frokost.

     Valget er TIL som standard. Mikkel bad om det 20. august 2026:
     forretningen skal kunne begge dele — smørrebrød ud af huset OG
     mad til trædækket — og begge stod på ejerens egen bestilling
     (takeaway og "book spisning").

     Fluebenet på Bestillinger-fanen er derfor måden at slå det
     FRA på, ikke til: kan køkkenet en dag ikke nå at servere
     forudbestilt mad ved bordene, er det ét klik, og fra det
     sekund er hver bestilling afhentning igen. */
  /* TO SIDER, TO SPØRGSMÅL.

     Ved lugen er spørgsmålet "to-go eller spis her". På
     smørrebrødssiden er maden pr. definition ud af huset, og
     spørgsmålet er et andet: henter I den, eller kører vi med
     den? Kundens ord (23/8): siden skal være egnet til
     smørrebrød ud af huset, "det skal ik bare være det samme".

     Spørgsmålet følger data-udvalg på formularen og ikke
     adressen i browseren. Ellers ville en ny side med det samme
     udvalg få lugens spørgsmål, og det ville først blive
     opdaget af en gæst. */
  function hvordanValg() {
    return hvilketUdvalg() === 'kun-smoer'
      ? [['afhentning', '🥡 Vi henter selv'], ['levering', '🚗 I leverer']]
      : [['afhentning', '🥡 To-go'], ['spis_her', '🍽️ Spis her']];
  }

  /* Må det andet svar overhovedet vælges?

     Spis her kan ejeren lukke i admin, og standarden er TIL —
     de har trædækket, og det har de altid haft.

     LEVERING ER MODSAT: standarden er FRA. Vi ved ikke, om
     forretningen leverer, hvortil eller hvad det koster, og
     ingen af delene er bekræftet — se listen "Ejeren skal
     bekræfte" i README. En side, der tilbyder levering, fordi
     ingen har sagt nej, lover noget, forretningen ikke har
     lovet. Ejeren slår den til i admin, når han ved svaret. */
  function kanAndetSvar() {
    var ind = data.indstillinger || {};
    return hvilketUdvalg() === 'kun-smoer'
      ? ind.levering === true
      : ind.spis_her !== false;
  }

  function visHvordan() {
    var trin = $('bestil-hvordan-trin');
    if (!trin) return;

    var valg = hvordanValg();
    var kan = kanAndetSvar();
    trin.classList.toggle('skjult', !kan);

    /* Et valg med ét svar er ikke et valg — og kurven skal med
       tilbage. Lå der 'levering' fra i går, hvor ejeren havde
       den slået til, ville bestillingen ellers blive afvist af
       databasen med en fejl, gæsten ikke kan gøre noget ved. */
    if (!kan) { kurv.hvordan = 'afhentning'; visAdresse(); return; }

    var boks = $('bestil-hvordan');
    tøm(boks);

    /* Værdierne bagved hedder afhentning, spis_her og levering —
       det er databasens ord, og de skal ikke skifte, fordi
       skiltet gør. */
    valg.forEach(function (v) {
      var valgt = kurv.hvordan === v[0];
      var b = lav('button', 'type-knap' + (valgt ? ' valgt' : ''));
      b.type = 'button';
      b.setAttribute('aria-pressed', valgt ? 'true' : 'false');
      b.appendChild(lav('span', 'type-navn', v[1]));
      b.addEventListener('click', function () {
        kurv.hvordan = v[0];
        gemKurv();
        visHvordan();
        /* ⚠️ DAGENE SKAL TEGNES OM. En dag kan være lukket for
           to-go og åben for spis her; skiftede gæsten måde uden
           det her, stod mærkaterne og de spærrede dage tilbage
           fra det forrige valg — og hun ville få nej på en dag,
           vælgeren sagde var ledig. */
        visDage();
        visStykker();
      });
      boks.appendChild(b);
    });

    visAdresse();
  }

  /* Adressefeltet følger valget. Det står skjult, til levering er
     valgt: et adressefelt på en bestilling, der skal hentes, er
     et felt, gæsten skal regne ud at hun ikke skal udfylde.

     Noten under feltet lover INGEN zone og ingen pris. Vi ved
     ikke, hvor langt de kører, og et gæt her bliver til et løfte
     på en kvittering. */
  function visAdresse() {
    var trin = $('bestil-adresse-trin');
    if (!trin) return;
    var skalLeveres = kurv.hvordan === 'levering';
    trin.classList.toggle('skjult', !skalLeveres);

    var felt = $('bestil-adresse');
    if (felt) felt.required = skalLeveres;

    var note = $('bestil-adresse-note');
    if (note) {
      note.textContent = skalLeveres
        ? 'Vi ringer og bekræfter, at vi kan køre til adressen.'
        : '';
    }
  }

  function visTider() {
    var vaelg = $('bestil-tid');
    // Ved bordet findes tidsvælgeren ikke: gæsten sidder der nu.
    if (!vaelg) return;
    var foer = vaelg.value;
    tøm(vaelg);

    var tider = tiderFor(data, valgtDag);
    var ledige = [];
    tider.forEach(function (t) {
      /* ⚠️ EN FYLDT TID BLIVER STÅENDE OG SIGER HVORFOR. Uden
         det ville gæsten fylde hele formularen ud og først få
         nej ved afsendelsen — dét, tallene her findes for. */
      var fuldTid = R.tidFuld ? R.tidFuld(data, fyldteTider, valgtDag, t) : false;
      var o = document.createElement('option');
      o.value = t;
      o.textContent = 'kl. ' + t.replace(':', '.') + (fuldTid ? ' — fyldt op' : '');
      o.disabled = fuldTid;
      if (!fuldTid) ledige.push(t);
      vaelg.appendChild(o);
    });
    /* ⚠️ KUN EN LEDIG TID GENVÆLGES — se noten i js/skal/bestil.js.
       Browseren tager selv den første, der ikke er slået fra; det,
       vi skal undgå, er at TVINGE en fyldt tid tilbage. */
    if (ledige.indexOf(foer) !== -1) vaelg.value = foer;

    /* ⚠️ KLOKKESLÆTTET FILTRERER LISTEN NU (31/8) — så listen
       skal tegnes om, når det skifter. Uden den her linje valgte
       gæsten kl. 14, mens morgenmaden (kun til 12.30) blev
       stående på skærmen: reglen sagde nej først ved
       afsendelsen, med en fejl hun ikke kunne gøre noget ved. */
    vaelg.onchange = function () {
      visStykker();
      visFyld();
      visSum();
    };
  }

  function antalIKurv() {
    var n = 0;
    for (var k in kurv.stk) n += kurv.stk[k];
    return n;
  }

  /* ⚠️ MINDSTEANTALLET TÆLLER KUN SMØRREBRØDET (30/8). Kundens
     ord: han havde sat det til 5, "men det gælder på alt — det er
     en fejl, det er kun smørrebrød". Skellet kommer fra
     Butik.udvalg og ikke fra en regex her, så de to formularer
     ikke kan komme til at mene noget forskelligt. */
  function smoerIKurv() {
    var ids = (Butik.udvalg(data, hvilketUdvalg(), valgtDag) || {}).smoerKategorier || [];
    var liste = bestilbare();
    var n = 0;
    for (var k in kurv.stk) {
      var v = liste.filter(function (x) { return x.navn === k; })[0];
      if (v && ids.indexOf(v.kategori_id) !== -1) n += kurv.stk[k];
    }
    return n;
  }

  function prisIKurv() {
    var sum = 0;
    var liste = bestilbare();
    for (var k in kurv.stk) {
      var v = liste.filter(function (x) { return x.navn === k; })[0];
      if (v) sum += Number(v.pris) * kurv.stk[k];
    }
    return sum + emballagen().ialt + fragten().ialt;
  }

  /* ============================================================
     EMBALLAGE VED TO-GO — OGSÅ HER  (31/8)
     ------------------------------------------------------------
     Kundens ord: "vi mangler at lave emballagetillæg på
     bestillinger, det er 10 kroner oveni."

     ⚠️ MOTOREN VAR BYGGET, MEN KUN DEN HALVE SIDE BRUGTE DEN.
     js/skal/bestil.js (forsiden, smørrebrødssiden, tapas) har
     regnet emballagen med siden 30/8 — js/bestilling.js, som
     bærer bestil/ OG ved-bordet/, gjorde det ikke. Altså kostede
     det SAMME smørrebrød forskelligt alt efter, hvilken side
     gæsten kom ind ad, og ingen af de to sider så forkerte ud
     for sig selv.

     ⚠️ REGLEN ER DEN SAMME FIL, IKKE EN KOPI. R.emballage i
     js/bestil-regler.js afgør både prisen, hvilke kategorier den
     gælder, og at den ALDRIG lægges på spis her — så bordet
     slipper af sig selv, uden at den her fil skal kende reglen.
     To udgaver ville skride fra hinanden, og gæsten ville opdage
     det ved lugen. */
  /* ⚠️ FRAGTEN SKAL MED I DET TAL, GÆSTEN SER — ikke først på
     bonen. Et tillæg, hun møder efter at have trykket send, er
     præcis det, emballagen blev en synlig linje for (1/9). */
  function fragten() {
    if (!R.levering) return { antal: 0, pris: 0, ialt: 0 };
    return R.levering(data, kurv.hvordan);
  }

  function emballagen() {
    if (!R.emballage) return { antal: 0, pris: 0, ialt: 0 };
    var liste = bestilbare();
    var linjer = [];
    for (var k in kurv.stk) {
      var v = liste.filter(function (x) { return x.navn === k; })[0];
      if (v) linjer.push({ kat: v.kategori_id, antal: kurv.stk[k] });
    }
    return R.emballage(data, linjer, kurv.hvordan);
  }

  /* ⚠️ EMBALLAGEN ER EN LINJE I BESTILLINGEN, IKKE ET SKJULT
     TILLÆG. Køkkenet skal kunne se, at der skal pakkes tre
     portioner, og kassen skal kunne se, hvad totalen består af.
     Navnet er ejerens eget, hvis han har skrevet et. */
  function emballageLinje(linjer) {
    var e = emballagen();
    if (!e.antal) return linjer;
    var navn = String((data.indstillinger || {}).emballage_navn || '').trim()
      || 'Emballage';
    /* ⚠️ FLAGET SKAL MED. Uden det kan personalesiden kun kende
       emballagen på NAVNET, og et tillæg, der bliver læst som mad,
       ender i køkkenets produktionsliste ("lav 4 Emballage") og i
       dagens "N retter". Se Butik.erEmballage. */
    return linjer.concat([
      { navn: navn, antal: e.antal, pris: e.pris, emballage: true }]);
  }

  /* ⚠️ FRAGTEN ER OGSÅ EN LINJE, IKKE ET SKJULT TILLÆG (3/9).

     Kundens ord: *"regner fragten oveni plus maden som står og
     eventuelt emballage ligesom de gør på normal
     bestillingssiden."* Emballagens form, én gang mere: køkkenet
     og kassen skal kunne se, hvad totalen består af, og et tillæg,
     gæsten først møder på totalen, er et tal, hun spørger til ved
     lugen.

     ⚠️ FLAGET emballage: true SÆTTES OGSÅ HER, og det er ikke en
     fejl: Butik.erEmballage er husets ENE regel for "det her er
     penge, ikke arbejde". Uden flaget ville køkkenet få
     "lav 1 Levering" i produktionslisten, og dagens tal ville
     sige én ret for meget. Navnet skiller dem på skærmen. */
  /* ⚠️ ÉN INDGANG TIL BEGGE TILLÆG. Kaldes de hver for sig, er
     der to steder, det næste tillæg kan blive glemt — og det er
     præcis, hvad der skete med emballagen, som kun forsiden
     regnede med i et døgn (31/8). */
  function medTillaeg(linjer) {
    return leveringsLinje(emballageLinje(linjer));
  }

  function leveringsLinje(linjer) {
    if (!R.levering) return linjer;
    var l = R.levering(data, kurv.hvordan);
    if (!l.ialt) return linjer;
    return linjer.concat([
      { navn: 'Levering', antal: 1, pris: l.pris, emballage: true }]);
  }


  /* KURVENS EGEN LISTE  (31/8)

     Kundens ord om QR-siden ved bordet: "bedre overblik, klarhed
     over hvad man har bestilt".

     ⚠️ MÅLT PÅ EN IPHONE 13, ikke gættet: bjælken sagde
     "2 stykker · 178,-" og INTET andet. Med 242 varer på kortet
     og fire mennesker om et bord kunne gæsten ikke se HVAD hun
     havde valgt uden at rulle hele menuen igennem igen — og hun
     sidder ved bordet med maden på vej.

     ⚠️ LINJERNE HAR DERES EGNE PLUS OG MINUS. En liste, man kun
     kan LÆSE, sender gæsten tilbage op i menuen for at rette ét
     tal. Det er den samme kurv (kurv.stk) og den samme sæt-vej,
     så listen og menuens tællere aldrig kan komme til at sige
     hver sit.

     ⚠️ OG DEN TEGNES KUN, NÅR DEN ER ÅBEN. Optegningen kører ved
     hvert eneste tryk på en tæller; at bygge en liste, ingen kan
     se, er arbejde på hver eneste klik. */
  function tegnKurvliste() {
    var boks = $('kurv-liste');
    if (!boks) return;
    var aaben = !boks.hidden;
    if (!aaben) return;

    var alle = bestilbare();
    boks.textContent = '';

    Object.keys(kurv.stk).forEach(function (navn) {
      var n = kurv.stk[navn];
      if (!(n > 0)) return;
      var v = alle.filter(function (x) { return x.navn === navn; })[0];

      var r = lav('div', 'kurv-linje');
      var t = lav('div', 'kurv-tekst');
      t.appendChild(lav('span', 'kurv-navn', navn));
      /* Prisen er linjens EGEN sum. "2 × 89" tvinger gæsten til at
         gange i hovedet, mens hun sidder og skal betale bagefter. */
      if (v && v.pris !== null && v.pris !== undefined) {
        t.appendChild(lav('span', 'kurv-pris', window.MosedePris(v.pris * n)));
      } else {
        t.appendChild(lav('span', 'kurv-pris kurv-uden', 'pris følger'));
      }
      r.appendChild(t);

      var taeller = lav('div', 'taeller');
      var ned = lav('button', 'glass rund', '\u2212');
      var tal = lav('span', 'taeller-tal', n);
      var op = lav('button', 'glass rund', '+');
      ned.type = op.type = 'button';
      ned.setAttribute('aria-label', 'Én færre ' + navn);
      op.setAttribute('aria-label', 'Én mere ' + navn);

      /* ⚠️ SAMME VEJ IND SOM MENUENS EGEN TÆLLER. Skrev den her
         direkte i kurv.stk, ville menuens tal blive stående på det
         gamle, til siden blev tegnet om — to steder, der siger
         hver sit om det samme. saetAntal() tegner begge. */
      ned.addEventListener('click', function () { saetAntal(navn, n - 1); });
      op.addEventListener('click', function () { saetAntal(navn, n + 1); });
      taeller.appendChild(ned); taeller.appendChild(tal); taeller.appendChild(op);
      r.appendChild(taeller);
      boks.appendChild(r);
    });

    /* ⚠️ EMBALLAGEN STÅR SOM SIN EGEN LINJE. Et tillæg, gæsten
       først ser på totalen, er et tal, hun spørger til ved lugen. */
    var emb = emballagen();
    if (emb.antal) {
      var e = lav('div', 'kurv-linje kurv-emballage');
      var et = lav('div', 'kurv-tekst');
      et.appendChild(lav('span', 'kurv-navn',
        String((data.indstillinger || {}).emballage_navn || '').trim() || 'Emballage'));
      et.appendChild(lav('span', 'kurv-pris',
        emb.antal + ' × ' + window.MosedePris(emb.pris)));
      e.appendChild(et);
      e.appendChild(lav('span', 'kurv-pris', window.MosedePris(emb.ialt)));
      boks.appendChild(e);
    }

    /* ⚠️ OG FRAGTEN OGSÅ (4/9). Den har talt med i totalen siden
       3/9, men stod ikke som en linje — altså kunne gæsten ikke
       regne sit eget beløb efter. Samme fejl som emballagen
       havde indtil 1/9, og den blev fundet det samme sted: ved
       at lægge fire stykker i kurven og læse tallene. */
    var lev = fragten();
    if (lev.ialt) {
      var lr = lav('div', 'kurv-linje kurv-emballage');
      var lt = lav('div', 'kurv-tekst');
      lt.appendChild(lav('span', 'kurv-navn', 'Levering'));
      lt.appendChild(lav('span', 'kurv-pris', window.MosedePris(lev.pris)));
      lr.appendChild(lt);
      lr.appendChild(lav('span', 'kurv-pris', window.MosedePris(lev.ialt)));
      boks.appendChild(lr);
    }

    /* Ønskerne til fyld har ingen pris og er ikke en vare — men de
       er en del af bestillingen, og gæsten skal kunne se dem her,
       uden at de tælles med i noget. */
    if (kurv.fyld.length) {
      var f = lav('div', 'kurv-linje kurv-fyld');
      f.appendChild(lav('span', 'kurv-navn', 'Ønsker til fyld'));
      f.appendChild(lav('span', 'kurv-pris kurv-uden', kurv.fyld.join(', ')));
      boks.appendChild(f);
    }
  }

  /* Ét sted at ændre et antal, uanset om trykket kom i menuen
     eller i kurvens liste. */
  function saetAntal(navn, n) {
    n = Math.max(0, Math.min(200, n));
    if (n) kurv.stk[navn] = n; else delete kurv.stk[navn];
    gemKurv();

    /* ⚠️ MENUENS EGEN RÆKKE SKAL FØLGE MED — men ved at RETTE
       sig, ikke ved at blive bygget igen. Første udgave kaldte
       visStykker(), som tegner alle rækker om: 242 elementer
       revet ned og bygget op for at ændre ét tal fra 2 til 1,
       midt i en liste gæsten står og ruller i. */
    /* ⚠️ KUN DEN BESTILBARE RÆKKE  (2/9). De prisløse og de
       udsolgte fik data-vare samme dag, så søgningen kan finde
       dem — men de har ingen tæller, og en dublet af et navn
       ville ellers kunne give `.valgt` til en række, gæsten
       aldrig kan lægge i kurven. */
    var raekke = document.querySelector('.stk-linje[data-vare="'
      + navn.replace(/"/g, '\\"') + '"]:not(.spoerg-pris):not(.udsolgt)');
    if (raekke) {
      var tal = raekke.querySelector('.taeller-tal');
      if (tal) tal.textContent = n;
      raekke.classList.toggle('valgt', n > 0);
      var ned = raekke.querySelector('.taeller button');
      if (ned) ned.disabled = n === 0;
    }
    visSum();
  }

  function visSum() {
    var n = antalIKurv();
    var pris = prisIKurv();

    /* KVITTERINGSLINJEN KOMMER FØRST NÅR DER ER NOGET I KURVEN.

       Den stod før og svævede hen over siden med "Vælg hvor mange
       stykker du vil have" fra det øjeblik man landede – en klæbende
       bjælke der irettesatte gæsten for ikke at have gjort noget
       endnu. Nu er siden ren indtil man vælger, og så glider linjen
       op og kvitterer for valget. */
    var kurvBar = $('bestil-kurv');
    /* ⚠️ OG ALDRIG, MENS DET SIDSTE KIG ER FREMME. Bjælken har
       sin egen "Videre", og to veje videre på den samme
       bestilling er én for meget — den ene fører oven i købet til
       en formular, der er skjult. */
    var kigger = $('bestil-kig') && !$('bestil-kig').classList.contains('skjult');
    if (kurvBar) kurvBar.classList.toggle('skjult', n === 0 || kigger);

    /* KURVEN OG DEN FASTE BESTIL-PILLE MÅ IKKE STÅ OVEN I
       HINANDEN. Begge er position:fixed i bunden, og siden
       formularen flyttede ind på forsiden, findes de på den samme
       side. Pillen er vejen TIL bestillingen; er der noget i
       kurven, er man der allerede, og så er kurven den, der skal
       have pladsen. */
    var pille = document.querySelector('.bestil-fast');
    if (pille) pille.classList.toggle('skjult', n > 0);

    /* Er der en ??-vare i kurven, må summen ikke lyve: "70,-" for
       en kurv med en burger uden pris er et tal, gæsten vil holde
       os op på i telefonen. Så står der "+ det uden pris". */
    var udenPris = Object.keys(kurv.stk).some(function (k) {
      if (!(kurv.stk[k] > 0)) return false;
      var v = bestilbare().filter(function (x) { return x.navn === k; })[0];
      return v && (v.pris === null || v.pris === undefined);
    });

    tegnKurvliste();

    var tekst = $('bestil-sum-tekst');
    if (n) {
      tekst.textContent = n + (n === 1 ? ' stykke' : ' stykker')
        + (pris ? ' · ' + window.MosedePris(pris) : '')
        + (udenPris ? (pris ? ' + det uden pris' : ' · pris følger') : '')
        + (kurv.fyld.length ? ' · ' + kurv.fyld.length + ' slags fyld' : '');
    }

    /* Noten på den foldede fyld-blok. Den er lukket til at begynde
       med, så uden et tal her ville man ikke kunne se om man havde
       valgt noget uden at åbne den igen. */
    var fyldTal = $('fyld-valgt');
    if (fyldTal) {
      fyldTal.textContent = kurv.fyld.length
        ? kurv.fyld.length + (kurv.fyld.length === 1 ? ' slags valgt' : ' slags valgt')
        : 'frivilligt';
      fyldTal.classList.toggle('valgt', kurv.fyld.length > 0);
    }

    /* Hele formularen er synlig fra start — spiis' form er det,
       og det er foldene på kategorierne, der holder siden kort.
       Gaten, der gemte hentetid og kontakt bag den første vare,
       er fjernet med kundens egen forlægsside i hånden (23/8). */

    /* ⚠️ MINDSTEANTALLET GÆLDER KUN SMØRREBRØDET (30/8) — og
       knappen skal sige det SAMME som afsendelsen, ellers står
       gæsten med en spærret knap uden en grund. */
    var mangler = vedBordet() ? 0 : R.minStkMangler(data, smoerIKurv());
    $('bestil-send').disabled = n < 1 || !!mangler;

    var advarsel = $('bestil-min');
    if (n && mangler) {
      advarsel.textContent = 'Der skal mindst være ' + mangler + ' stykker smørrebrød.';
      advarsel.classList.remove('skjult');
    } else {
      advarsel.classList.add('skjult');
    }
  }

  // ----------------------------------------------------------
  //  FEJL I FELTERNE
  // ----------------------------------------------------------
  function visFejl(feltId, besked) {
    var felt = $(feltId);
    var boks = $('fejl-' + feltId.replace('bestil-', ''));
    if (!boks) return;
    if (besked) {
      boks.textContent = besked;
      boks.classList.remove('skjult');
      felt.setAttribute('aria-invalid', 'true');
      felt.setAttribute('aria-describedby', boks.id);
    } else {
      boks.textContent = '';
      boks.classList.add('skjult');
      felt.removeAttribute('aria-invalid');
      felt.removeAttribute('aria-describedby');
    }
  }

  // ----------------------------------------------------------
  //  SEND
  // ----------------------------------------------------------
  function send(ev) {
    ev.preventDefault();

    var navn = $('bestil-navn').value;
    var telefon = $('bestil-telefon').value;
    /* E-mailfeltet er væk — spiis' form har navn, telefon og
       besked, og kunden bad om præcis den (23/8). Vi ringer
       alligevel og bekræfter hver bestilling; en e-mail var et
       felt mere at tvivle på. Databasen tager stadig imod en,
       hvis den en dag kommer tilbage. */
    var email = '';
    /* ALLERGIEN FØRST I BESKEDEN, og med et ord køkkenet ikke kan
       overse. Den sendes i det SAMME felt og ikke i en ny kolonne:
       en kolonne til ville betyde en SQL-fil, ejeren skal køre, og
       fire skærme, der skal lære at vise den — og indtil da ville
       allergien være usynlig netop dér, hvor den betyder mest.

       Ordet "ALLERGI:" er det, js/admin/koekken.js kender den på,
       og det er derfor kortet i køkkenet markerer den rødt. Skift
       det ikke uden at rette begge steder.

       Feltet findes kun ved bordet — de andre sider har det ikke
       endnu, og så er allergi der stadig en linje i beskeden. */
    var allergiFelt = $('bestil-allergi');
    var allergi = allergiFelt ? allergiFelt.value.trim() : '';
    var besked = $('bestil-besked-felt').value;
    if (allergi) {
      besked = 'ALLERGI: ' + allergi + (besked.trim() ? '\n' + besked : '');
    }

    /* Adressen tælles kun med, når der SKAL leveres. Er feltet
       skjult, må det ikke kunne spærre for en afsendelse — det
       er den slags fejl, hvor knappen ikke gør noget, og gæsten
       ikke kan se hvorfor. */
    var adresseFelt = $('bestil-adresse');
    var adresse = adresseFelt ? adresseFelt.value : '';
    var skalLeveres = kurv.hvordan === 'levering';

    /* ⚠️ VED BORDET ER NAVNET NOK  (31/8).

       Kundens ord: *"når jeg vil bestille skal jeg skrive nummer
       og alt muligt shit — bare navn er ok, fordi de sidder der,
       og admin kan jo se hvilket bord."*

       Telefonen har ÉT formål på en bestilling: at personalet kan
       ringe, hvis noget går galt. Ved et bord GÅR man derhen — det
       er tyve meter, og hele køkkenskærmen er bygget om, at man
       går ud og siger det. Et nummer, der aldrig bliver ringet
       til, er en oplysning, vi gemmer uden grund.

       ⚠️ KRAVET FORSVINDER IKKE, DET FLYTTER. Uden et bordnummer
       (hjemmefra, til lugen) er opkaldet den eneste vej tilbage,
       og dér er nummeret stadig påkrævet. Databasen håndhæver
       nøjagtig den samme betingelse — se
       supabase/bord-uden-telefon.sql — og skrev vi kun reglen her,
       ville formularen sige ja og databasen nej.

       ⚠️ ET SKREVET NUMMER SKAL STADIG VÆRE ET NUMMER: "12"
       slipper ikke igennem i ly af undtagelsen, for så ville
       personalet ringe forgæves. */
    /* ⚠️ vedBordet() OG IKKE vedBord: den lokale `var vedBord`
       sættes længere nede i funktionen, og en hoistet variabel er
       `undefined` her — så ville telefonen være påkrævet ved
       bordet alligevel, uden en fejl nogen steder. */
    var vedBordNu = !!vedBordet();
    var fejl = {
      navn: Butik.tjek.navn(navn, 'navn', 80),
      telefon: (vedBordNu && !telefon.trim()) ? '' : Butik.tjek.telefon(telefon),
      adresse: skalLeveres && adresse.trim().length < 5
        ? 'Skriv vej, nummer, postnummer og by.' : '',
    };

    visFejl('bestil-navn', fejl.navn);
    visFejl('bestil-telefon', fejl.telefon);
    if (adresseFelt) visFejl('bestil-adresse', fejl.adresse);

    var foerste = ['navn', 'telefon', 'adresse'].filter(function (k) { return fejl[k]; })[0];
    if (foerste) {
      // Læg markøren dér hvor fejlen er, og rul den frem
      var felt = $('bestil-' + foerste);
      felt.focus();
      return;
    }

    var vedBord = vedBordet();
    var tid = vedBord ? nuTid() : $('bestil-tid').value;
    if (!valgtDag || !tid) {
      sigFejl('Vælg en dag og en tid.');
      return;
    }
    /* Bestiller hun ingenting, siger vi stadig fra. */
    if (antalIKurv() < 1) {
      sigFejl(vedBord ? 'Vælg noget først.' : 'Vælg hvor mange stykker du vil have.');
      return;
    }
    /* ⚠️ OG MINDSTEANTALLET GÆLDER KUN SMØRREBRØDET. minStk()
       svarer 1 ved bordet — se noten der — så undtagelsen står
       stadig. Beskeden SIGER hvad der mangler: "der skal mindst
       bestilles 5 stk." fik en gæst med én burger til at lede
       efter fire mere. */
    var mangler = vedBord ? 0 : R.minStkMangler(data, smoerIKurv());
    if (mangler) {
      sigFejl('Der skal mindst bestilles ' + mangler + ' stk. smørrebrød.');
      return;
    }

    var linjer = [];
    var liste = bestilbare();
    for (var k in kurv.stk) {
      var v = liste.filter(function (x) { return x.navn === k; })[0];
      linjer.push({ navn: k, antal: kurv.stk[k], pris: v ? v.pris : null });
    }

    sigFejl('');

    /* DET SIDSTE KIG — spiis' lærepenge (23/8): "den er for nem
       og hurtig". Formularen sender ikke selv; den viser hele
       bestillingen én gang til, og først kig-vinduets egen knap
       sender. Det er gæstens eget værn mod en forkert bestilling
       — og det bliver det eneste, den dag bestillinger bekræftes
       automatisk. */
    visKig({
      navn: navn, telefon: telefon, email: email, besked: besked,
      hent_dato: valgtDag, hent_tid: tid, hvordan: kurv.hvordan,
      leverings_adresse: skalLeveres ? adresse.trim() : null,
      bord_nummer: vedBord,
      bord_kode: vedBord ? vedBordKoden() : null,
      linjer: medTillaeg(linjer), fyld: kurv.fyld.slice(),
    });
  }

  function visKig(b) {
    var form = $('bestil-form');
    var kig = $('bestil-kig');
    var boks = $('kig-indhold');
    if (!kig || !boks) return sendNu(b);   // uden panelet sendes som før
    tøm(boks);

    function linje(navn, vaerdi) {
      var r = lav('div', 'kvit-linje');
      r.appendChild(lav('span', 'kvit-navn', navn));
      r.appendChild(lav('span', 'kvit-vaerdi', vaerdi));
      boks.appendChild(r);
    }

    b.linjer.forEach(function (l) {
      linje(l.antal + ' × ' + l.navn,
        l.pris === null || l.pris === undefined
          ? 'pris følger' : window.MosedePris(l.pris * l.antal));
    });
    if (b.fyld.length) linje('Fyld', b.fyld.join(', '));

    /* Etiketten skal passe til, hvad der SKER. Stod der "Hentes"
       på en bestilling, der køres ud, læser gæsten det sidste
       kig og bekræfter det modsatte af det, hun har valgt — og
       kigget findes netop for at fange dét. */
    var leveres = b.hvordan === 'levering';
    if (b.bord_nummer) {
      // Ingen hentetid at bekræfte — der er et BORD, og det er
      // den ene oplysning, der afgør, hvor maden havner.
      linje('Bord', b.bord_nummer);
      linje('Serveres', 'Nu — vi kommer med det');
    } else {
      linje(leveres ? 'Leveres' : 'Hentes',
        dagNavn(data, b.hent_dato) + ' d. ' + dagDato(b.hent_dato)
        + ' kl. ' + b.hent_tid.replace(':', '.'));
      linje('Hvordan', leveres ? 'Vi leverer'
        : b.hvordan === 'spis_her' ? 'Spis her' : 'To-go');
    }
    if (leveres && b.leverings_adresse) linje('Adresse', b.leverings_adresse);
    linje('Navn', b.navn);
    /* Telefonen er frivillig ved bordet (31/8) — og en linje, der
       siger "Telefon:" med ingenting efter, ligner et felt, gæsten
       har glemt at udfylde. */
    if (b.telefon && b.telefon.trim()) linje('Telefon', b.telefon);
    if (b.besked && b.besked.trim()) linje('Besked', b.besked.trim());

    /* ⚠️ "I ALT" KUN NÅR DET SIGER NOGET NYT. MÅLT på et skud:
       ét stykke i kurven gav "2 × Flæskestegssandwich 178,-" og
       "I alt 178,-" lige under hinanden — det samme tal to gange,
       og så holder man op med at læse det. Samme regel som
       bestillingskortets total i admin fik 29/8. */
    var sum = prisIKurv();
    var prisLinjer = b.linjer.filter(function (l) {
      return l.pris !== null && l.pris !== undefined;
    }).length;
    if (sum && prisLinjer > 1) linje('I alt', window.MosedePris(sum));

    /* Knappen nulstilles HVER gang kigget vises: efter en sendt
       bestilling og "Bestil noget mere" stod den ellers tilbage
       som "Sender …" og spærret — kigget så rigtigt ud, men
       kunne ikke sende. Fundet af dublet-prøven. */
    var sendKnap = $('kig-send');
    sendKnap.disabled = false;
    /* ⚠️ BELØBET STÅR PÅ KNAPPEN  (31/8). Kundens ord: knappen,
       man bekræfter med, var "helt sådan generic og elendig".
       Det, en bekræftelse skal sige, er HVAD man bekræfter — og
       på en bestilling er det summen. Står den kun i linjen
       ovenover, læser man knappen alene og trykker på et ord.

       Uden en pris (varer, ejeren ikke har prissat endnu) står
       ordet alene: et 0 ville stå som gratis. */
    sendKnap.textContent = sum
      ? 'Send bestilling · ' + window.MosedePris(sum)
      : 'Send bestilling';

    /* ⚠️ KURVBJÆLKEN SKAL VÆK, MENS DER BEKRÆFTES  (31/8).
       MÅLT på et skud: bjælken stod i bunden med "2 stykker ·
       178,- · Videre" OVEN PÅ kigget, altså to steder at trykke
       videre på den samme bestilling — og "Videre" ville rulle
       ned til en formular, der var skjult. Kunden så præcis den
       slags: "det hele sammenpresset og rodet." */
    var kurvBar = $('bestil-kurv');
    if (kurvBar) kurvBar.classList.add('skjult');

    form.classList.add('skjult');
    kig.classList.remove('skjult');
    kig.focus();
    kig.scrollIntoView({ block: 'start' });

    $('kig-ret').onclick = function () {
      kig.classList.add('skjult');
      form.classList.remove('skjult');
      /* Og den kommer tilbage, når man går tilbage — men KUN hvis
         der stadig er noget i kurven. visSum() ejer den regel;
         satte vi den frem her, kunne en tømt kurv få en bjælke,
         der siger "0 stykker". */
      visSum();
      form.scrollIntoView({ block: 'start' });
    };
    $('kig-send').onclick = function () { sendNu(b); };
  }

  function sendNu(b) {
    var knap = $('kig-send') || $('bestil-send');
    knap.disabled = true;
    knap.textContent = 'Sender …';
    var kigFejl = $('kig-fejl');
    if (kigFejl) { kigFejl.textContent = ''; kigFejl.classList.add('skjult'); }

    Butik.bestil(b).then(function (svar) {
      var kig = $('bestil-kig');
      if (kig) kig.classList.add('skjult');
      visTak(svar);
      /* Kurven er sendt. Den skal ikke stå og vente på næste
         besøg.

         ⚠️ MEN VED BORDET SKAL 'spis_her' BLIVE STÅENDE. Den
         sættes kun i start(), og et fast 'afhentning' her kostede
         bordnummeret på anden runde: selskabet ved bord 7 trykker
         "Bestil noget mere", bestiller is — og fordi kurven nu
         stod på afhentning, faldt bord_nummer ud i store.js (et
         bordnummer kræver spis her). Bestillingen landede som en
         helt almindelig afhentning med hentetid NU, og køkkenet
         havde ingen måde at vide, hvilket bord isen skulle hen
         til. Ingen fejl, ingen advarsel — maden ville bare stå
         ved lugen, mens gæsten sad og ventede.

         Fundet af en prøve, ikke ved at læse. */
      kurv = {
        stk: {}, fyld: [],
        hvordan: vedBordet() ? 'spis_her' : 'afhentning',
      };
      gemKurv();
    }).catch(function (e) {
      knap.disabled = false;
      knap.textContent = 'Send bestilling';
      if (e && e.netfejl && e.raekke) return visNoedudgang(e.raekke, kigFejl);
      /* Tiderne kan være fyldt op, mens formularen stod åben —
         hent listen igen, ellers vælger gæsten det samme fyldte
         klokkeslæt en gang til. */
      if (e && e.tidFuld) friskTider(true);
      var boks = kigFejl || $('bestil-fejl');
      boks.textContent = e.message || 'Bestillingen kunne ikke sendes. Ring til os i stedet.';
      boks.classList.remove('skjult');
      boks.scrollIntoView({ block: 'center' });
    });
  }

  function sigFejl(besked) {
    var boks = $('bestil-fejl');
    boks.textContent = besked || '';
    boks.classList.toggle('skjult', !besked);
    if (besked) boks.scrollIntoView({ block: 'center' });
  }

  /* Nettet er dødt efter tre forsøg. Så står valget mellem en
     fejlbesked og en vej videre — og vejen videre er den samme
     som før hjemmesiden fandtes: sms eller telefon. Teksten SIGER
     at bestillingen ikke er sendt; se noten ved noedudgangSms i
     js/store.js om hvorfor det ikke må pyntes. */
  function visNoedudgang(raekke, maalBoks) {
    var boks = maalBoks || $('bestil-fejl');

    /* VED BORDET ER DER INGEN NØDUDGANG AT TILBYDE: en sms for
       at få en is, mens personalet står tyve meter væk, er en
       omvej, ingen tager. (spiis-briefen, punkt 10.) */
    if (raekke && raekke.bord_nummer) {
      boks.textContent = 'Der er ingen forbindelse lige nu, og bestillingen er '
        + 'IKKE sendt. Gå op til lugen og sig det til os – så tager vi den dér.';
      boks.classList.remove('skjult');
      boks.scrollIntoView({ block: 'center' });
      return;
    }

    boks.textContent = 'Der er ingen forbindelse lige nu, og bestillingen er '
      + 'IKKE sendt endnu. Send den som sms med ét tryk — eller ring, så '
      + 'tager vi den over telefonen.';

    var udveje = noedudgang(raekke);
    var raekkeDiv = lav('div', 'noedudgang');
    raekkeDiv.appendChild(udveje.sms);
    raekkeDiv.appendChild(udveje.ring);
    boks.appendChild(raekkeDiv);

    boks.classList.remove('skjult');
    boks.scrollIntoView({ block: 'center' });
  }

  function noedudgang(raekke) {
    var n = Butik.noedudgangSms(raekke);
    var sms = lav('a', 'knap', 'Send som sms');
    sms.href = n.href;
    var ring = lav('a', 'glass sm', 'Ring til os');
    ring.href = n.ring;
    return { sms: sms, ring: ring };
  }

  /* ⚠️ FORNAVNET MED STORT FORBOGSTAV  (4/9). MÅLT på kundens
     eget skud: han skrev "mikkel" i feltet, og kvitteringen sagde
     *"Tak, mikkel."* Gæsten skriver småt på en telefon, og en
     kvittering, der siger navnet forkert tilbage, er det første,
     hun læser. */
  function pæntFornavn(navn) {
    var f = String(navn || '').trim().split(/\s+/)[0] || '';
    return f ? f.charAt(0).toUpperCase() + f.slice(1) : 'for bestillingen';
  }

  function visTak(b) {
    var form = $('bestil-form');
    var tak = $('bestil-tak');

    form.classList.add('skjult');
    tøm(tak);

    /* ⚠️ KVITTERINGEN ER HUSETS FÆLLES NU  (4/9). Kundens ord:
       *"få den slags animation og kvittering alle steder man
       bestiller."* Formen bor i js/skal/kvittering.js; her står
       kun det, DEN HER bestilling ved. Uden filen bygger vi den
       simple udgave: en kvittering, der fejler, er en gæst, der
       ikke ved, om maden er bestilt — og rækken ER gemt. */
    var K = window.MosedeKvittering;
    var besked = '';
    if (!K) {
      tak.appendChild(lav('div', 'eyebrow', 'Vi har den'));
      tak.appendChild(lav('h3', null, 'Tak, ' + pæntFornavn(b.navn) + '.'));
    }

    /* BESTILT ER BESTILT — det er standarden nu.

       Kundens ord (23/8): "fjern det med ring og bekræft. De skal
       nok ringe og afbekræfte, hvis de ikke kan. Alt skal kunne
       administreres — man får deres oplysninger til netop sådan
       noget."

       Det er den samme beslutning, spiis-briefen argumenterede
       for: telefonen er nødudgangen, aldrig vejen. En gæst, der
       bestiller én burger til kl. 18, skal ikke udløse et opkald
       fra en travl luge.

       Kontakten i admin står stadig — ejeren skal kunne skrue den
       tilbage, hvis en sæson bliver for travl — men den er slået
       TIL som standard nu, og derfor === false og ikke === true.
       Betalingslinjen er ens uanset hvad: der er ikke betalt
       noget. */
    /* EN LEVERING BEKRÆFTES ALDRIG AF SIG SELV.

       Vi kan love, at maden bliver lavet — det er køkkenets eget
       arbejde. Vi kan IKKE love, at den kan køres til en adresse,
       vi ikke kender: der er ingen bekræftet leveringszone og
       ingen pris, se listen "Ejeren skal bekræfte" i README.
       Skrev siden "Bestilt. Leveres lørdag kl. 12" til en adresse
       i Roskilde, ville den have lovet noget, ingen har lovet —
       og gæsten ville opdage det, når maden ikke kom.

       Derfor er auto slået fra her, uanset hvad kontakten i admin
       står på. Den dag ejeren melder en zone ind, kan reglen
       løsnes — men ikke før. */
    var leveres = b.hvordan === 'levering';
    var auto = (data.indstillinger || {}).auto_bekraeft !== false && !leveres;

    /* VED BORDET RINGER VI IKKE: et opkald til en telefon, der
       ligger på bordet foran gæsten, er ikke en bekræftelse.
       Står kontakten i admin på opkald, kommer personalet forbi
       bordet i stedet. */
    if (b.bord_nummer) {
      besked = auto
        ? 'Bestilt til bord ' + b.bord_nummer + '. Vi kommer med det. '
          + 'Der er ikke betalt noget – du betaler ved lugen.'
        : 'Vi kommer forbi bord ' + b.bord_nummer + ' og bekræfter. '
          + 'Der er ikke betalt noget – du betaler ved lugen.';
    } else {
      besked = auto
        ? 'Bestilt. Hentes ' + dagNavn(data, b.hent_dato) + ' d. '
          + dagDato(b.hent_dato) + ' kl. ' + b.hent_tid.replace(':', '.') + '. '
          + 'Der er ikke betalt noget – du betaler når du henter. '
          + 'Kan køkkenet mod forventning ikke lave den, ringer vi til dig.'
        : leveres
          ? 'Vi ringer til dig på ' + b.telefon + ' og bekræfter, at vi kan '
            + 'køre til adressen. Der er ikke betalt noget, og der er ikke '
            + 'trukket noget.'
          : 'Vi ringer til dig på ' + b.telefon + ' og bekræfter. '
            + 'Der er ikke betalt noget, og der er ikke trukket noget – '
            + 'du betaler når du henter.';
    }
    if (!K) tak.appendChild(lav('p', null, besked));

    /* Linjerne: hvad blev bestilt, hvad koster det, og hvad er
       aftalt. Rækkefølgen er kvitteringens egen — maden først,
       aftalen bagefter. */
    var linjer = (b.linjer || []).map(function (l) {
      return {
        navn: l.antal + ' × ' + l.navn + (l.variant ? ' (' + l.variant + ')' : ''),
        vaerdi: l.pris ? window.MosedePris(l.pris * l.antal) : '',
      };
    });
    var i_alt = (b.linjer || []).reduce(function (m, l) {
      return m + (Number(l.pris) || 0) * (Number(l.antal) || 0);
    }, 0);
    if (i_alt) linjer.push({ navn: 'I alt', vaerdi: window.MosedePris(i_alt), fed: true });
    if (b.bord_nummer) linjer.push({ navn: 'Bord', vaerdi: b.bord_nummer });
    else {
      linjer.push({ navn: leveres ? 'Leveres' : 'Hentes',
        vaerdi: dagNavn(data, b.hent_dato) + ' ' + dagDato(b.hent_dato)
          + ' kl. ' + b.hent_tid.replace(':', '.') });
    }
    if (leveres && b.leverings_adresse) {
      linjer.push({ navn: 'Adresse', vaerdi: b.leverings_adresse });
    }
    if (b.fyld && b.fyld.length) {
      linjer.push({ navn: 'Fyld', vaerdi: b.fyld.join(', ') });
    }
    if (b.besked) linjer.push({ navn: 'Din besked', vaerdi: b.besked });

    if (K) {
      K.byg(tak, {
        titel: 'Tak, ' + pæntFornavn(b.navn) + '.',
        besked: besked,
        kode: {
          navn: 'Bestillingsnummer',
          reference: b.reference,
          nummer: function () {
            if (!Butik.bestillingsnummer || !Butik.pæntNummer) return null;
            return Butik.bestillingsnummer(b.reference).then(function (n) {
              return n ? Butik.pæntNummer(n) : null;
            });
          },
        },
        linjer: linjer,
        /* ⚠️ VEJEN TIL KVITTERINGEN, DER LEVER  (4/9). Uden det her
           link findes siden ikke for nogen — den er kun en adresse,
           ingen kender. Kvitteringen i fanen er væk, når fanen er
           væk; den her kan bogmærkes, deles og åbnes igen, mens
           hun venter. */
        ekstra: [(function () {
          if (!Butik.foelgAdresse) return null;
          var a = document.createElement('a');
          a.className = 'kvit-foelg';
          a.href = Butik.foelgAdresse(b.reference);
          a.textContent = 'Følg din bestilling →';
          return a;
        }())],
      });
    } else {
      var kvit = lav('div', 'kvit');
      kvit.appendChild(kvitLinje('Reference', b.reference));
      linjer.forEach(function (l) {
        kvit.appendChild(kvitLinje(l.navn, l.vaerdi));
      });
      tak.appendChild(kvit);
    }

    var m = window.MOSEDE;
    var knapper = lav('div', 'tags luft');
    /* ⚠️ OG HELLER IKKE HER. Noten tolv linjer oppe siger "VED
       BORDET RINGER VI IKKE", og så stod nummeret alligevel som
       den store knap under kvitteringen — fundet 27/8, sammen med
       det samme på varer uden pris.

       Ved bordet er lugen tyve meter væk, og siden siger det selv
       ("Gå op til lugen og sig det til os"). Et telefonnummer som
       kvitteringens ENESTE fremhævede handling sender gæsten den
       forkerte vej. "Bestil noget mere" bliver stående — den er
       rigtig begge steder. */
    if (!b.bord_nummer) {
      var ring = lav('a', 'glass solid', m ? m.telefonPent : 'Ring til os');
      ring.href = 'tel:' + (m ? m.telefon : '');
      knapper.appendChild(ring);
    }
    var igen = lav('button', 'glass sm', 'Bestil noget mere');
    igen.type = 'button';
    igen.addEventListener('click', function () {
      tak.classList.add('skjult');
      form.classList.remove('skjult');
      $('bestil-send').disabled = false;
      $('bestil-send').textContent = 'Send bestilling';
      /* ANDEN RUNDE ER EN NY BESTILLING. Kurven er tom, og så
         skal menuen også være hel igen: stod søgningen på
         "fadøl", ville selskabet, der nu vil have is, møde et
         kort med én øl på og et fyldt søgefelt, de ikke havde
         skrevet. */
      nulstilKortFiltre();
      visStykker(); visFyld(); visSum();
      form.scrollIntoView({ block: 'start' });
    });
    knapper.appendChild(igen);
    tak.appendChild(knapper);

    tak.classList.remove('skjult');
    tak.scrollIntoView({ block: 'center' });
    tak.focus();
  }

  function kvitLinje(navn, vaerdi) {
    var r = lav('div', 'kvit-linje');
    r.appendChild(lav('span', 'kvit-navn', navn));
    if (vaerdi) r.appendChild(lav('span', 'kvit-vaerdi', vaerdi));
    return r;
  }

  // ----------------------------------------------------------
  //  START
  //  --------------------------------------------------------
  //  Data kommer FRA js/smoerrebroed.js, som allerede har hentet
  //  dem. To Butik.hent() på samme side ville være to gange samme
  //  syv tabeller over en mobilforbindelse.
  // ----------------------------------------------------------
  /* Tiderne kan være blevet fyldt op, mens formularen stod åben.
     ⚠️ KUN HVOR DER ER EN TIDSVÆLGER: ved bordet er hentetiden
     klokken NU, og loftet pr. tidsrum gælder ikke bordene — en
     hentning dér ville være en forespørgsel for ingenting. */
  function friskTider(tegnOm) {
    if (!Butik.hentFyldteTider || !$('bestil-tid')) return;
    Butik.hentFyldteTider().then(function (liste) {
      fyldteTider = liste || [];
      if (tegnOm) { visDage(); visTider(); }
    }).catch(function () { /* så står listen som den var */ });
  }

  function start(d) {
    data = d;
    if (!$('bestil-form')) return;

    var aaben = (d.indstillinger || {}).bestilling_aaben;
    if (aaben === false) {
      $('bestil-form').classList.add('skjult');
      $('bestil-lukket').classList.remove('skjult');
      return;
    }
    $('bestil-lukket').classList.add('skjult');

    /* ⚠️ HENTES EFTER, IKKE FØR. start() får sine data af siden og
       er synkron, så vælgeren tegnes først uden tallene og igen,
       når de lander. Det er ikke pynt at tegne om: en fane, der
       har stået åben siden i formiddag, kender ellers ikke de
       tider, der er blevet fyldt imens. */
    friskTider(true);

    /* ER DER OVERHOVEDET NOGET AT BESTILLE HER?

       Forsidens formular sælger alt UNDTAGEN smørrebrødet (23/8),
       og på en forretning, hvor kun smørrebrødet er åbnet i admin,
       er dens liste derfor tom. Det er ikke en fejl — men den
       besked, en tom liste gav, ER fejlens: "Vi kan ikke hente
       udvalget lige nu. Ring til os." Den ville stå på forsiden
       hver eneste dag og sende gæster til telefonen uden grund.

       Afsnittet forsvinder i stedet, som resten af forsiden: er
       der ikke noget at gøre, findes afsnittet ikke. Reglen gælder
       kun, hvor formularen er ét afsnit blandt flere — på
       bestil/ ER formularen siden, og dér skal beskeden stå.

       Dagens ret tæller kun med, hvis den kan nås: er varslet et
       døgn, kan man ikke bestille dagen i dags ret, og så holder
       den ikke et tomt afsnit i live. */
    /* ⚠️ EN DAG, DER KAN VÆLGES, MED EN RET PÅ. Her blev kun
       DAGEN I DAG spurgt, fordi der dengang kun fandtes én ret.
       Med ugeplanen kan i dag være tom og i morgen have en ret —
       og så er der noget at bestille. */
    var enRetKanNaas = muligeDage(d, null, kurv.hvordan).some(function (iso) {
      return Butik.dagensRetter(d, iso).length > 0;
    });
    var noget = stykker(d).length || fyldene(d).length || enRetKanNaas;
    if (!noget && $('bestil-form').getAttribute('data-tom') === 'skjul') {
      var afsnit = $('bestil-form').parentNode;
      while (afsnit && afsnit.tagName !== 'SECTION') afsnit = afsnit.parentNode;
      if (afsnit) {
        afsnit.classList.add('skjult');
        /* PILLEN PEGEDE HERNED. Er afsnittet væk, skal den pege
           derhen, hvor der faktisk kan bestilles — smørrebrødets
           egen side. En rød knap, der ruller til ingenting, er
           værre end ingen knap; er der heller ikke smørrebrød,
           er der ikke noget at bestille nogen steder, og så
           forsvinder den. */
        var pille = document.querySelector('.bestil-fast');
        if (pille) {
          /* Spørgsmålet er, om der er noget at lave på DEN side,
             pillen peger over på — ikke om smørrebrødet har
             priser. Et fyld uden pris kan stadig ØNSKES på
             bestil/, og en pille, der forsvinder, mens siden bag
             den har noget at byde på, er en dør, ingen finder.
             Målt af "uden forsidens formular fører pillen til
             smørrebrødet" i tests/bestil-doeren.spec.js. */
          var smoer = Butik.udvalg(d, 'kun-smoer');
          if (smoer.varer.length || smoer.oenskefyld.length) pille.href = 'bestil/';
          else pille.classList.add('skjult');
        }
        return;
      }
    }

    var besked = (d.indstillinger || {}).bestilling_besked || '';
    var bel = $('bestil-besked');
    if (besked) { bel.textContent = besked; bel.classList.remove('skjult'); }
    else bel.classList.add('skjult');

    /* Varslet skrives ud som det ejeren har sat det. Står der 24,
       står der "et døgn i forvejen" – ikke "vi skal have god tid",
       som ikke betyder noget. */
    var timer = varselTimer(d);
    var vt = $('bestil-varsel');
    if (vt) {
      vt.textContent = timer >= 48
        ? 'Vi skal have bestillingen mindst ' + Math.round(timer / 24) + ' dage i forvejen.'
        : timer >= 24
          ? 'Vi skal have bestillingen mindst et døgn i forvejen.'
          : timer > 0
            ? 'Vi skal have bestillingen mindst ' + timer + ' timer i forvejen.'
            : '';
      vt.classList.toggle('skjult', !vt.textContent);
    }

    /* Manchetten følger den samme kontakt som kvitteringen. Har
       ejeren skruet tilbage til opkald, skal linjen sige det —
       ellers lover forsiden noget, kvitteringen tager tilbage. */
    var manchet = $('bestil-manchet');
    if (manchet) {
      /* Linjen sagde "Spis her på trædækket, eller tag den med"
         begge steder. Det passede, da formularen kun lå ét sted;
         nu står den også på siden, der hedder "Smørrebrød UD AF
         HUSET", og dér er den første halvdel en modsigelse.
         Valget stilles inde i formularen, efter maden — linjen
         her handler om aftalen, ikke om bordet. */
      manchet.textContent = (d.indstillinger || {}).auto_bekraeft === false
        ? 'Vi ringer og bekræfter, og du betaler ved lugen, når du henter.'
        : 'Bestilt er bestilt — du betaler ved lugen, når du henter. '
          + 'Skal noget laves om, ringer du bare.';
    }

    læsKurv();
    /* ?hvordan= i adressen forudvælger To go eller Spis her.

       Forsiden havde to kort, der bar valget med hertil. De er
       væk (kundens ord, 22/8: valget hører hjemme her i
       formularen, efter maden). Men reglen bliver stående: et
       link fra Facebook, en QR-kode på et bord eller en genvej
       fra en anden side kan stadig sige "spis her", og så skal
       feltet stå rigtigt fra start.

       Det lægges i kurven EFTER læsKurv og FØR visHvordan:
       adressen vejer tungere end et gammelt gemt valg. Har ejeren
       lukket for spis her i admin, tvinger visHvordan valget
       tilbage til afhentning — adressen kan aldrig love noget,
       admin har lukket for. */
    var hv = /[?&]hvordan=(spis-her|tag-med|levering)/.exec(location.search);
    if (hv) {
      var oensket = hv[1] === 'spis-her' ? 'spis_her'
        : hv[1] === 'levering' ? 'levering' : 'afhentning';
      /* MEN KUN HVIS SIDEN OVERHOVEDET SPØRGER OM DET.

         bestil/?hvordan=spis-her findes ude i verden — i links, i
         bogmærker, i det der er delt. Siden spørger ikke længere
         om spis her (den handler om smørrebrød ud af huset), og
         uden den her prøve ville kurven stå på 'spis_her', mens
         ingen af de to knapper var markeret: gæsten ser et valg,
         hvor intet er valgt, og kan ikke se hvorfor.

         Et ønske, siden ikke kan opfylde, ignoreres i stilhed —
         som da adressen aldrig kunne love noget, admin havde
         lukket for. */
      var muligt = hvordanValg().some(function (v) { return v[0] === oensket; });
      if (muligt) kurv.hvordan = oensket;
    }
    /* VED BORDET ER DER INTET AT VÆLGE: gæsten sidder der nu, og
       maden spises her. Sættes EFTER læsKurv og ?hvordan=, så en
       gammel kurv ikke kan gøre bordets bestilling til en
       afhentning — databasen ville afvise den, men først ved
       tryk på send. valgtDag sættes her, fordi visDage() ikke
       gør det uden sin vælger, og uden en dag falder dagens ret
       ud af listen. */
    if (vedBordet()) {
      kurv.hvordan = 'spis_her';
      valgtDag = Butik.nu().dato;

      /* Kurven er fælles for siderne, og ved bordet må den kun
         indeholde det, bordet kan sælge — se renser() i
         js/ved-bordet.js, som har ryddet den, før vi kom hertil. */
    }

    /* DAGENE FØRST: visStykker skal vide, hvilken dag der er
       valgt, for dagens ret står kun i listen på dagen i dag.
       Før byttet stod retten aldrig der ved første tegning —
       valgtDag var stadig null, da listen blev bygget.

       ⚠️ OG TIDERNE FØR LISTEN (31/8): listen klippes efter det
       valgte klokkeslæt nu, og før visTider har fyldt vælgeren,
       er værdien tom — så ville første tegning vise morgenmaden
       kl. 13, og først et dagskifte fik den væk. */
    visDage();
    visTider();
    visStykker();
    visFyld();
    visHvordan();
    visSum();

    $('bestil-form').addEventListener('submit', send);

    /* ---- KURVEN FØRER VIDERE ----
       Et tryk ruller ned til hentetid og kontaktoplysninger. Det er
       den samme bevægelse som i en takeaway-kurv: se hvad du har,
       tryk videre, udfyld. */
    /* ⚠️ DEN HER SKAL BLIVE — den bruges også af iagttageren
       længere nede, der folder kurven væk, når Send-knappen er i
       syne. Første udgave tog den med, da klik-lytteren blev delt
       i to, og hele bordsiden faldt med "kurvBar is not defined":
       gæsten fik "Vi kan ikke hente kortet lige nu" på en side,
       hvor alt var i orden. */
    var kurvBar = $('bestil-kurv');

    /* ⚠️ TO KNAPPER, IKKE ÉN (31/8). Bjælken VAR selv knappen, der
       førte videre. Skulle den nu også folde kurven ud, ville ét
       tryk gøre to ting — og gæsten, der ville se, hvad hun havde
       bestilt, blev sendt ned i formularen i stedet. */
    var videre = $('kurv-videre');
    if (videre) {
      videre.addEventListener('click', function () {
        /* Uden tidsvælger (bordet) førte kurven ingen steder hen,
           og en klæbende bjælke, der ikke gør noget, ligner en
           side i stykker. */
        var maal = $('bestil-tid') || $('bestil-navn');
        if (maal) maal.scrollIntoView({ block: 'center' });
      });
    }

    var abn = $('kurv-abn');
    var liste = $('kurv-liste');
    if (abn && liste) {
      abn.addEventListener('click', function () {
        var aaben = liste.hidden;
        liste.hidden = !aaben;
        abn.setAttribute('aria-expanded', aaben ? 'true' : 'false');
        /* Listen tegnes først, når den er åben — se noten ved
           tegnKurvliste(). Derfor skal den tegnes HER, efter
           hidden er slået fra, og ikke før. */
        if (aaben) visSum();
      });
    }

    /* Og den forsvinder når Send-knappen er i syne. Er man nået
       derned, har man ikke brug for en genvej dertil – og en
       klæbende bjælke oven på det sidste felt er i vejen. */
    if (kurvBar && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        kurvBar.classList.toggle('naaet-bunden', es[0].isIntersecting);
      }, { rootMargin: '0px 0px -20% 0px' }).observe($('bestil-send'));
    }

    /* ---- DE FOLDEDE BLOKKE ----

       Et rigtigt <button aria-expanded> og et rigtigt hidden på
       kroppen. Ikke max-height og overflow: en skærmlæser skal have
       at vide at der ER noget mere, og hvad tilstanden er – og et
       felt der er skjult med højde 0 kan stadig få fokus med
       tabulator, hvilket sender markøren et sted man ikke kan se. */
    [['fyld-knap', 'bestil-fyld']].forEach(function (par) {
      var knap = $(par[0]);
      var krop = $(par[1]);
      if (!knap || !krop) return;
      knap.addEventListener('click', function () {
        var aaben = knap.getAttribute('aria-expanded') === 'true';
        knap.setAttribute('aria-expanded', aaben ? 'false' : 'true');
        krop.hidden = aaben;
      });
    });

    // Fejlen forsvinder når man retter feltet – ikke først når man
    // trykker Send igen
    ['navn', 'telefon'].forEach(function (k) {
      $('bestil-' + k).addEventListener('input', function () {
        visFejl('bestil-' + k, null);
      });
    });
  }

  window.MosedeBestilling = { start: start };
})();
