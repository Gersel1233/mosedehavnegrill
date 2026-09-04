/* Fanen Borde: ønsker om et bord, og dagens billede.
   Se js/admin/kerne.js for de to principper, der gælder i alle
   admin-filerne.

   HER GIVES JA'ET — og kun her. Gæsten har fået at vide, at vi
   ringer og bekræfter, så en række her er et løfte om et opkald.
   Øverst står dagens billede: hvor mange pladser der allerede er
   sagt ja til pr. dag, målt mod antallet af pladser. Det er DET,
   der gør, at to gæster ikke kan få ja til det samme bord: der er
   kun én, der siger ja, og hun kan se, hvad hun har sagt ja til.

   Antallet af pladser er personalets eget tal og sættes hernede.
   Databasen håndhæver det med vilje ikke — se supabase/borde.sql. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  var STATUS_NAVNE = {
    /* ⚠️ KUN ORDET PÅ SKÆRMEN. Databasens status hedder stadig
       bekraeftet (bord_status_ok holder fire ord) — salgstal og
       dagens billede tæller på netop de ord, og en ændring dér
       ville stoppe tællingen uden en eneste fejl. Samme greb som
       "Afhentet" → "Færdig" fik 31/8. */
    ny: 'Ny', bekraeftet: 'Ankommet', afvist: 'Afvist', udeblevet: 'Udeblev',
  };

  var borde = [];

  /* Nye øverst med den ÆLDSTE først — den, der har ventet længst
     på sit opkald, står øverst. Resten efter dag og tid: det er
     sådan, de står i restauranten. */
  var RANG = { ny: 0, bekraeftet: 1, afvist: 2, udeblevet: 3 };

  function sorteret(liste) {
    return liste.slice().sort(function (a, b) {
      var ra = RANG[a.status] === undefined ? 9 : RANG[a.status];
      var rb = RANG[b.status] === undefined ? 9 : RANG[b.status];
      if (ra !== rb) return ra - rb;
      if (a.status === 'ny') return a.oprettet < b.oprettet ? -1 : 1;
      if (a.dato !== b.dato) return a.dato < b.dato ? -1 : 1;
      return (a.tid || '') < (b.tid || '') ? -1 : 1;
    });
  }

  function pladser() {
    var v = Number((Admin.data.indstillinger || {}).bord_pladser);
    return isFinite(v) && v >= 1 ? Math.round(v) : null;
  }

  // ----------------------------------------------------------
  //  DAGENS BILLEDE
  //  --------------------------------------------------------
  //  Én linje pr. dag med ønsker, fra i dag og frem: hvor mange
  //  pladser er sagt ja til, og hvor mange venter. Det er tallet,
  //  man kigger på, FØR man trykker Bekræft — uden det siger man
  //  ja med lukkede øjne, og det er præcis sådan, to selskaber
  //  ender ved det samme bord.
  // ----------------------------------------------------------
  function tegnBillede() {
    var boks = $('borde-billede');
    if (!boks) return;
    Admin.tøm(boks);

    var i_dag = Butik.nu().dato;
    var dage = {};
    borde.forEach(function (b) {
      /* Udeblevet tæller heller ikke med: pladserne blev aldrig
         brugt. Den kan kun sættes bagud i tid, men reglen skrives
         ud, så den ikke afhænger af det. */
      if (b.dato < i_dag || b.status === 'afvist' || b.status === 'udeblevet') return;
      var d = dage[b.dato] || (dage[b.dato] = { ja: 0, venter: 0, borde: 0 });
      if (b.status === 'bekraeftet') d.ja += b.antal_personer || 0;
      else d.venter += 1;
      /* ⚠️ TO TAL, DER LIGNER HINANDEN, ER IKKE DET SAMME TAL.
         "Pladser" er MENNESKER (antal_personer mod bord_pladser);
         det her er BORDE — én booking, ét bord — mod dagens
         loft. Kundens ord 31/8: han vil kunne styre, hvor mange
         af de 55 der må bookes den dag, og så skal han kunne SE
         det på den skærm, hvor han siger ja. Afviste og udeblevne
         er allerede sorteret fra ovenfor: de optager ingenting. */
      d.borde += 1;
    });

    var datoer = Object.keys(dage).sort();
    if (!datoer.length) return;

    var max = pladser();
    datoer.forEach(function (dato) {
      var d = dage[dato];
      var linje = lav('div', 'bestil-linje');
      linje.appendChild(lav('span', 'bestil-vare', Admin.pænDato(dato)));

      var loft = loftFor(dato);
      var borde = d.borde + (loft === null ? '' : ' af ' + loft)
        + (d.borde === 1 && loft !== 1 ? ' bord' : ' borde') + ' booket';
      var tekst = borde + ' · ' + d.ja + (max ? ' af ' + max : '') + ' pladser sagt ja til'
        + (d.venter ? ' · ' + d.venter + (d.venter === 1 ? ' ønske venter' : ' ønsker venter') : '');
      var felt = lav('span', 'bestil-linjepris', tekst);
      /* Rødt når ja'erne når loftet: det er IKKE et forbud — måske
         kan der klemmes et bord ind — men det skal ses, FØR der
         ringes og siges ja. ⚠️ Bordloftet er det MODSATTE: dér
         siger databasen nej, og hjemmesiden har allerede lukket
         dagen. Begge dele skal kunne farve linjen. */
      if ((max && d.ja >= max) || (loft !== null && d.borde >= loft)) {
        felt.className += ' fejl-tekst';
      }
      linje.appendChild(felt);
      boks.appendChild(linje);
    });
  }

  // ----------------------------------------------------------
  //  LISTEN
  // ----------------------------------------------------------
  /* Kortene, der ikke har ændret sig, bliver stående — se noten
     ved Admin.tegnRaekker i kerne.js. Bordkortene har samme
     notefelt som bestillingerne, og samme fejl at undgå. */
  /* ⚠️ DET, DER ER OVERSTÅET, ER IKKE ARBEJDE (27/8).

     Listen viste ALT, der nogensinde var kommet ind. Kundens
     skærmbillede fangede det: en bekræftet booking fra I GÅR stod
     midt i arbejdslisten, mens linjen ovenover sagde "0 af 40
     pladser sagt ja til" for i dag. To tal på samme skærm om det
     samme — dagens billede tæller fra i dag og frem, listen
     tællede fra tidernes morgen.

     Om to måneder skulle personalet rulle forbi hundrede afholdte
     middage for at finde den ene nye booking.

     ⚠️ EN DAG, DER ER GÅET, ER FÆRDIG — uanset status. En
     bekræftet booking til i går er ikke "kommende", og et ønske
     fra i mandags kan ingen nå at svare på. Det er datoen, ikke
     statussen, der afgør, om der er noget at gøre. */
  /* ⚠️ EN ANKOMMET BOOKING ER FÆRDIG (3/9, kundens ord: "den her
     knap skal bare sige ankommet, og så ryge i en ankommet/færdige
     historik ligesom bestillingerne").

     Før var `bekraeftet` et MELLEMTRIN — "vi har set den" — og
     bookingen stod i Kommende borde, til dagen var gået. Det er
     samme beslutning, kunden traf om bestillingerne 31/8: ét tryk
     frem, og så er sagen lukket. Familien er kommet; der er ikke
     mere at gøre ved den.

     Datolinjen bliver: en booking til i går, ingen fik hakket af,
     hører stadig i Færdige og ikke i Nye — ellers ville den ligge
     og lyse i søjlen på noget, ingen kan lukke. */
  function faerdig(b) {
    if (b.status === 'afvist' || b.status === 'udeblevet') return true;
    if (b.status === 'bekraeftet') return true;
    return !!(b.dato && b.dato < Butik.nu().dato);
  }

  function tegnBorde() {
    if (!$('borde-venter')) return;
    tegnBillede();
    tegnLoft();

    var venter = sorteret(borde.filter(function (b) {
      return b.status === 'ny' && !faerdig(b);
    }));
    var slut = borde.filter(faerdig).sort(function (a, b) {
      // Nyeste først: det, der lige er sket, er det, man leder efter.
      if (a.dato !== b.dato) return a.dato > b.dato ? -1 : 1;
      return (a.tid || '') > (b.tid || '') ? -1 : 1;
    });

    /* Tallet i søjlen tæller kun det, der KAN gøres noget ved. Et
       ønske til i går er ikke et rødt tal værd — så ville mærket
       stå og lyse på noget, ingen kan lukke. */
    var maerke = $('borde-antal');
    if (venter.length) {
      maerke.textContent = venter.length;
      maerke.classList.remove('skjult');
    } else { maerke.classList.add('skjult'); }

    /* ⚠️ ORDENE FØLGER FLOWET, IKKE OMVENDT (31/8). Her stod
       "Ingen venter på svar" — men bord/ BOOKER et bord; gæsten
       har fået "vi ses" og venter ikke på et opkald. Se den lange
       note ved overskrifterne i admin.html. */
    liste('borde-venter', venter, 'Ingen nye bookinger.');
    liste('borde-faerdige', slut, 'Ingenting endnu.');

    var kort = $('borde-faerdige-kort');
    var titel = $('borde-faerdige-titel');
    if (titel) titel.textContent = '✓ Færdige (' + slut.length + ')';
    if (kort) kort.classList.toggle('skjult', !slut.length);
  }

  function liste(id, raekker, tomTekst) {
    var boks = $(id);
    if (!boks) return;
    if (!raekker.length) {
      Admin.tegnRaekker(boks, [{
        noegle: 'tom', aftryk: 'tom',
        byg: function () { return lav('p', 'vare-tekst', tomTekst); },
      }]);
      return;
    }
    Admin.tegnRaekker(boks, raekker.map(function (b) {
      return {
        noegle: 'bord-' + b.id,
        aftryk: JSON.stringify(b),
        byg: function () { return bordKort(b); },
      };
    }));
  }

  function bordKort(b) {
    var k = lav('div', 'bestil-kort b-' + b.status);

    var top = lav('div', 'bestil-top');
    top.appendChild(lav('span', 'maerke m-' + b.status,
      STATUS_NAVNE[b.status] || b.status));
    top.appendChild(lav('span', 'bestil-ref', b.reference));
    k.appendChild(top);

    var hvem = lav('div', 'bestil-hvem');
    hvem.appendChild(lav('span', 'vare-navn', b.navn));
    /* ⚠️ SAMME KONTAKTLINJE SOM PÅ DE ANDRE FANER. Kortet skrev
       nummeret NØGENT (uden 📞) og mailen som DÆMPET BRØDTEKST
       i stedet for som et link (kundens regel fra 31/8) — den samme
       booking så altså forskellig ud, alt efter hvilken fane
       personalet stod på. Reglen bor i Admin.kontakt. */
    Admin.kontakt(b).forEach(function (e) { hvem.appendChild(e); });
    k.appendChild(hvem);

    var detaljer = lav('div', 'bestil-linjer');
    var r1 = lav('div', 'bestil-linje');
    r1.appendChild(lav('span', 'bestil-vare',
      Admin.pænDato(b.dato) + ' kl. ' + String(b.tid || '').slice(0, 5).replace(':', '.')));
    r1.appendChild(lav('span', 'bestil-linjepris', b.antal_personer + ' personer'));
    detaljer.appendChild(r1);
    k.appendChild(detaljer);

    if (b.besked) {
      var m = lav('p', 'bestil-gaestebesked');
      m.appendChild(lav('strong', null, 'Gæsten skriver: '));
      m.appendChild(document.createTextNode(b.besked));
      k.appendChild(m);
    }

    var note = lav('div', 'felt');
    var etiket = lav('label', null, 'Din note');
    etiket.setAttribute('for', 'bord-note-' + b.id);
    var felt = document.createElement('input');
    felt.type = 'text';
    felt.id = 'bord-note-' + b.id;
    felt.maxLength = 1000;
    felt.value = b.intern_note || '';
    felt.placeholder = 'Fx: bord 4 ved vinduet';
    felt.addEventListener('change', function () {
      if (felt.value === (b.intern_note || '')) return;
      gemBord(Butik.skrive.bordStatus(b.id, b.status, felt.value), 'Noten er gemt.');
    });
    note.appendChild(etiket);
    note.appendChild(felt);
    k.appendChild(note);

    var raekke = lav('div', 'knap-raekke');

    if (b.status === 'ny') {
      /* ⚠️ GRØN MED ET HAK, som bestillingernes sidste trin. De to
         trin før er husets røde: de flytter sagen videre, men
         lukker den ikke. Her er der kun ét trin. */
      var frem = lav('button', 'knap primaer gron', '\u2713 Ankommet');
      frem.addEventListener('click', function () {
        /* BOOKET ER BOOKET (23/8). Gæsten har ALLEREDE fået at
           vide, at bordet står der — kvitteringen siger "vi ses".
           Der skal ikke ringes for at sige ja.

           ⚠️ OG KNAPPEN HED "BEKRÆFT BORDET" INDTIL 3/9. Kunden
           vendte den: hakket skal sættes, når familien KOMMER, og
           så er sagen lukket — ligesom bestillingernes ✓ Færdig.
           Opkaldet hører stadig til den anden vej: Afvis. */
        if (!confirm('Er ' + b.navn + ' kommet? — '
          + b.antal_personer + ' personer ' + Admin.pænDato(b.dato)
          + ' kl. ' + String(b.tid || '').slice(0, 5).replace(':', '.') + '\n\n'
          + 'Bookingen flyttes til Færdige. Kom de ikke, så tryk '
          + 'Udeblev i stedet.')) return;
        gemBord(Butik.skrive.bordStatus(b.id, 'bekraeftet', felt.value),
          b.navn + ' er ankommet.');
      });
      raekke.appendChild(frem);
    }

    /* ⚠️ ET TOMT BORD ER IKKE ET AFSLAG.

       En bekræftet booking havde ét sted at gå hen: Afvis. Men at
       "afvise" et bord, gæsten skulle have siddet ved, er
       forkert — vi sagde jo ja. Uden et andet ord blev enten
       udeblivelsen skrevet som et afslag, eller også blev der
       ikke trykket, og bookingen stod som kommende for evigt.

       Nummeret samles, som ved bestillingerne: en familie, der
       booker seks pladser hver lørdag og aldrig kommer, skal
       kunne ses — før næste lørdag. */
    /* ⚠️ UDEBLEV HØRER PÅ EN *NY* BOOKING NU (3/9). Den lå på en
       bekræftet, dengang "bekræftet" betød "vi har set den". Nu
       betyder det ANKOMMET — og en familie, der er kommet, kan
       ikke udeblive. Bordet, der stod tomt, er en booking, ingen
       nåede at hakke af. */
    if (b.status === 'ny') {
      var udeblev = lav('button', 'knap', 'Udeblev');
      udeblev.addEventListener('click', function () {
        if (!confirm('Kom ' + b.navn + ' ikke?\n\n'
          + 'Bookingen flyttes til Færdige og tælles som en '
          + 'udeblivelse. Der skal ikke ringes.')) return;
        gemBord(Butik.skrive.bordStatus(b.id, 'udeblevet', felt.value),
          b.navn + ' er noteret som udeblevet.');
      });
      raekke.appendChild(udeblev);
    }

    /* ⚠️ AFVIS KUN PÅ EN *NY* BOOKING (3/9). Betingelsen var "alt,
       der ikke er afvist eller udeblevet" — og da bekraeftet blev
       ANKOMMET, stod Afvis på en familie, der lige var kommet ind
       ad døren. Set på et skud, ikke læst.

       Er de kommet, og var det en fejl, er vejen Gendan: bookingen
       tilbage i Nye, og derfra kan den afvises. */
    if (b.status === 'ny') {
      var afvis = lav('button', 'knap fare', 'Afvis');
      afvis.addEventListener('click', function () {
        /* DET ER HER, DER SKAL RINGES. Gæsten fik bordet i sin
           kvittering og regner med det; et afslag, hun ikke har
           hørt, er en familie, der møder op. Nummeret står i
           beskeden, så det ikke skal slås op bagefter. */
        if (!confirm('Afvis bookingen fra ' + b.navn + '?\n\n'
          + 'RING TIL ' + b.telefon + ' — gæsten har fået bordet i sin '
          + 'kvittering og regner med det.')) return;
        gemBord(Butik.skrive.bordStatus(b.id, 'afvist', felt.value),
          'Bookingen er afvist. Ring til ' + b.telefon + '.');
      });
      raekke.appendChild(afvis);
    }

    /* ⚠️ GENDAN FØRER TIL *NY*, IKKE TIL BEKRÆFTET (rettet 3/9).

       Den førte til bekraeftet, dengang det ord betød "vi har set
       den" — rækken HAVDE været set, det var derfor, nogen
       trykkede. Efter kundens ændring betyder bekraeftet
       ANKOMMET, og så ville et fortrudt fejltryk sige, at
       familien kom. Det gjorde de ikke; bookingen er åben igen og
       venter på dem.

       ⚠️ OG ANKOMMET KAN OGSÅ FORTRYDES. Rammer fingeren forkert
       i en frokost, skal bookingen kunne komme tilbage i Nye —
       "fortryd kan altid lade sig gøre" (31/8). */
    if (b.status === 'afvist' || b.status === 'udeblevet'
        || b.status === 'bekraeftet') {
      var gendan = lav('button', 'knap', 'Gendan');
      gendan.addEventListener('click', function () {
        gemBord(Butik.skrive.bordStatus(b.id, 'ny', felt.value),
          'Bookingen står som ny igen.');
      });
      raekke.appendChild(gendan);

      var slet = lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!confirm('Flyt bookingen fra ' + b.navn + ' til skraldespanden?\n\n'
          + 'Det kan hentes tilbage i 30 dage.')) return;
        gemBord(Butik.skrive.tilSkraldespand('bord', b.id),
          'Ønsket ligger i skraldespanden.');
      });
      raekke.appendChild(slet);
    }

    k.appendChild(raekke);
    return k;
  }

  // ----------------------------------------------------------
  //  PLADSERNE
  // ----------------------------------------------------------
  $('gem-pladser').addEventListener('click', function () {
    var v = $('bord-pladser').value.trim();
    var tal = Number(v);
    if (v !== '' && (!isFinite(tal) || tal < 1 || tal > 500 || Math.round(tal) !== tal)) {
      return Admin.brøl('Skriv et helt antal pladser — eller lad feltet stå tomt.');
    }
    Admin.gem(Butik.skrive.indstilling('bord_pladser', v === '' ? null : tal),
      v === '' ? 'Pladstallet er fjernet — dagens billede viser kun ja\'erne.'
               : 'Der regnes nu med ' + tal + ' pladser.');
  });

  function tegnPladser() {
    var felt = $('bord-pladser');
    if (!felt) return;
    var max = pladser();
    felt.value = max === null ? '' : max;
    tegnBillede();
  }

  /* ============================================================
     HVOR MANGE BORDE MÅ BOOKES PR. DAG?  (1/9)
     ------------------------------------------------------------
     Kundens ord: *"man skal bare kunne booke bord til den og den
     dag, og måske som det eneste administrere, hvor mange borde
     man kan bestille ud af de 55 på i dag eller dit og dat dag."*

     Tre lag, det snævreste vinder — og det ER databasens
     rækkefølge (mosede_bord_loft). Skrev vi vores egen her, ville
     skærmen sige ét og værnet gøre noget andet:
       1) dagens eget loft (dags_regler.bord_loft)
       2) ejerens almindelige (indstillinger.bord_loft_pr_dag)
       3) antallet af AKTIVE borde — grundtallet, som er data

     ⚠️ FELTET FINDES IKKE, FØR KOLONNEN GØR. Samme greb som
     maaAntal() på Menukort: uden supabase/bord-loft-pr-dag.sql
     ville hvert gem af en dagsregel fejle med PGRST204.
     ============================================================ */
  function maaLoft() {
    var r = (Admin.data && Admin.data.dags_regler) || [];
    /* ⚠️ UDEN RÆKKER VISER VI FELTET. Modsat maaVindue() på
       nyhederne: her er det almindelige loft en INDSTILLING
       (nøgle/værdi, ingen ny kolonne), og kun dagens eget rører
       dags_regler. Skjulte vi hele kortet, fordi der ikke er
       nogen dagsregler endnu, kunne ejeren aldrig sætte sit
       almindelige loft — og det er dét, han bad om. */
    if (!r.length) return true;
    return Object.prototype.hasOwnProperty.call(r[0], 'bord_loft');
  }

  function aktiveBorde() {
    return (Admin.lister.bordliste || []).filter(function (b) {
      return b.aktiv !== false;
    }).length;
  }

  /* ⚠️ BORDENE LIGGER IKKE I Admin.data. De hentes for sig
     (bordkort.js melder dem ind som `bordliste`), og loftets
     grundtal ER dem — så uden linjen her ville personalets skærm
     regne med nul borde og sige "lukket", mens gæsten kunne
     booke. Reglen bor i Butik.bordLoft; vi må bare give den det,
     den skal bruge. */
  function medBorde() {
    return Object.assign({}, Admin.data || {},
      { borde: Admin.lister.bordliste || [] });
  }

  function loftFor(iso) {
    return Butik.bordLoft(medBorde(), iso);
  }

  /* ⚠️ KALENDEREN SPØRGER DEN SAMME. Månedsnettet siger "3 af 3
     borde booket" på en lørdag, og gæsten får FULDT at se på
     bord/ — de to tal SKAL komme fra den samme regel. Skrev
     kalenderen sin egen medBorde(), ville den dag, ejeren
     nedlægger et bord, give to skærme, der siger hver sit, og
     begge ville se rigtige ud for sig selv.

     ⚠️ kalender.js indlæses FØR borde.js, så funktionen findes
     ikke, når filen læses — kun når nettet TEGNES, og det sker
     efter login. Samme rækkefølgeaftale som Admin.statusNavn,
     der slås op ved optegningen og ikke ved indlæsningen. */
  Admin.bordLoftFor = loftFor;

  function loftAlle() {
    var v = (Admin.data.indstillinger || {}).bord_loft_pr_dag;
    if (v === null || v === undefined || String(v).trim() === '') return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  /* Dagsregler MED et loft, i datorækkefølge og kun fremad: en
     lørdag i marts er ikke noget, nogen skal rulle forbi. */
  function loftDage() {
    var iDag = Butik.nu().dato;
    return ((Admin.data && Admin.data.dags_regler) || []).filter(function (r) {
      return r.bord_loft !== null && r.bord_loft !== undefined
        && String(r.bord_loft) !== '' && r.dato >= iDag;
    }).sort(function (a, b) { return a.dato < b.dato ? -1 : 1; });
  }

  function tegnLoft() {
    var kort = $('bord-loft-kort');
    if (!kort) return;
    kort.classList.toggle('skjult', !maaLoft());

    var felt = $('bord-loft-alle');
    var alle = loftAlle();
    if (felt && document.activeElement !== felt) {
      felt.value = alle === null ? '' : alle;
    }

    var nu = $('bord-loft-nu');
    if (nu) {
      var borde = aktiveBorde();
      nu.textContent = alle === null
        ? (borde
          ? 'Lige nu: alle ' + borde + ' aktive borde kan bookes hver dag.'
          : 'Der er ingen borde oprettet endnu — så er der intet loft, '
            + 'og der kan bookes som før. Opret dem nedenfor.')
        : 'Lige nu: højst ' + alle + (borde ? ' af ' + borde : '')
          + (alle === 1 ? ' bord' : ' borde') + ' pr. dag.';
    }

    var boks = $('bord-loft-dage');
    if (!boks) return;
    Admin.tøm(boks);
    var dage = loftDage();
    if (!dage.length) return;

    boks.appendChild(lav('p', 'hjaelp', 'Dage med deres eget loft:'));
    dage.forEach(function (r) {
      var raekke = lav('div', 'admin-raekke');
      raekke.setAttribute('data-loftdag', r.dato);
      raekke.appendChild(lav('span', 'vare-navn', Admin.pænDato(r.dato)));
      raekke.appendChild(lav('span', 'vare-tekst',
        Number(r.bord_loft) === 0 ? 'lukket for bookinger'
          : 'højst ' + r.bord_loft + (Number(r.bord_loft) === 1 ? ' bord' : ' borde')));
      var fjern = lav('button', 'kryds-knap', '✕');
      fjern.type = 'button';
      fjern.title = 'Fjern loftet for ' + r.dato;
      fjern.setAttribute('aria-label', 'Fjern loftet for ' + r.dato);
      fjern.addEventListener('click', function () {
        /* ⚠️ TOMT, IKKE NUL. Nul lukker dagen; tomt betyder "brug
           det almindelige loft". De to er ikke det samme, og det
           er hele grunden til, at feltet kan ryddes. */
        Admin.gem(Butik.skrive.dagsregel(Object.assign({}, r, { bord_loft: '' })),
          'Loftet for ' + r.dato + ' er fjernet.');
      });
      raekke.appendChild(fjern);
      boks.appendChild(raekke);
    });
  }

  // ----------------------------------------------------------
  //  HENT
  // ----------------------------------------------------------
  function gemBord(løfte, besked) {
    return løfte
      .then(hentBorde)
      .then(function () { Admin.kvitter(besked); })
      .catch(function (e) { Admin.brøl(e.message || String(e)); });
  }

  function hentBorde() {
    return Butik.hentBordbestillinger().then(function (liste) {
      borde = liste || [];
      Admin.meld('borde', borde);
      tegnBorde();
      Admin.hentet('borde-hentet');
    }).catch(function (e) {
      /* Fejlen skjules IKKE — ellers venter en familie på et
         opkald, ingen ved skal foretages.

         ⚠️ BOKSEN HED 'borde-liste', OG DET ELEMENT FINDES IKKE.
         Fanen har borde-venter og borde-faerdige; "borde-liste"
         har aldrig stået i admin.html. Fejlbehandleren kastede
         altså SELV ("Cannot read properties of null"), præcis når
         den skulle vise en fejl — så personalet så en tom fane
         uden en linje om hvorfor, og den ægte fejl forsvandt i
         konsollen. Fundet 29/8 på en JS-fejl i en helt anden
         måling, ikke ved at læse. */
      var boks = $('borde-venter');
      if (!boks) return;
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'fejl',
        'Bookingerne kunne ikke hentes: ' + (e.message || e)
        + ' Skærmen prøver igen af sig selv om et øjeblik — bliver den'
        + ' ved, så log ud og ind igen.'));
      if (window.console) console.warn('borde:', e);
    });
  }


  /* ============================================================
     TAG EN BOOKING I TELEFONEN
     ------------------------------------------------------------
     Ringer nogen og bestiller et bord, fandtes der ingen vej ind:
     bookingen kunne kun laves på hjemmesiden. Så stod halvdelen
     af dagen i systemet og halvdelen på en seddel ved lugen — og
     dagens billede løj om, hvor mange pladser der var tilbage.

     DEN BRUGER GÆSTENS EGEN MOTOR. Butik.bookBord() er den samme
     funktion, hjemmesiden kalder, og dermed de samme værn: samme
     telefon + dag + tid er ét ønske, bremsen tæller, lukkedagen
     siger nej. At skrive en anden vej ind i den samme tabel ville
     være to regelsæt, der langsomt kommer til at sige noget
     forskelligt — og ingen ville opdage det, før to familier stod
     ved det samme bord.

     DEN OPRETTES SOM BEKRÆFTET. Personalet har sagt ja i røret;
     en booking, der lander som "ny", ville stå på listen som noget,
     der skal ringes om — og så bliver der ringet til en, der lige
     har lagt på. Statussen sættes bagefter, fordi adgangsreglen
     med vilje ikke lader nogen skrive status ved oprettelsen.
     ============================================================ */
  function opretBooking() {
    var navn = $('nyb-navn').value.trim();
    var telefon = $('nyb-telefon').value.trim();
    var dato = $('nyb-dato').value;
    var tid = $('nyb-tid').value;
    var antal = Number($('nyb-antal').value);

    /* Tjekket her er personalets, ikke gæstens: en kort, dansk
       sætning om hvad der mangler. Databasen tjekker det samme
       igen, og DEN kan ikke omgås. */
    var fejl = Butik.tjek.navn(navn, 'navn', 80)
      || Butik.tjek.telefon(telefon)
      || Butik.tjek.dato(dato);
    if (fejl) return Admin.brøl(fejl);
    if (!tid) return Admin.brøl('Skriv hvad klokken er. Et bord er også et tidspunkt.');
    if (!isFinite(antal) || antal < 1 || antal > 100) {
      return Admin.brøl('Antallet skal være mellem 1 og 100. Er I flere, '
        + 'er det et selskab — og det har sin egen indgang.');
    }

    var knap = $('opret-booking');
    knap.disabled = true;

    Butik.bookBord({
      navn: navn, telefon: telefon, dato: dato, tid: tid,
      antal_personer: antal,
      besked: $('nyb-besked').value.trim() || null,
    }).then(function (svar) {
      return hentBorde().then(function () {
        var ny = borde.filter(function (b) {
          return b.reference === svar.reference;
        })[0];
        if (!ny) return;
        /* Noten siger, hvor bookingen kom fra. Uden den ligner
           den en, gæsten selv har lavet — og så leder nogen efter
           en kvittering, der aldrig er sendt. */
        return Butik.skrive.bordStatus(ny.id, 'bekraeftet',
          'Taget i telefonen.').then(hentBorde);
      });
    }).then(function () {
      ['nyb-navn', 'nyb-telefon', 'nyb-dato', 'nyb-tid', 'nyb-antal', 'nyb-besked']
        .forEach(function (id) { $(id).value = ''; });
      Admin.kvitter('Bookingen er oprettet og bekræftet.');
    }).catch(function (e) {
      Admin.brøl(e.message || String(e));
    }).then(function () {
      knap.disabled = false;
    });
  }

  if ($('opret-booking')) {
    $('opret-booking').addEventListener('click', opretBooking);
  }

  /* ⚠️ LOFTET TEGNES AF BÅDE tegnere OG tegnBorde. tegnere fyrer
     efter hvert gem (så feltet står rigtigt, når det er gemt);
     tegnBorde fyrer, når bordlisten er hentet (så grundtallet
     "alle 55" kan stå i linjen). Uden begge stod den ene af de
     to oplysninger og var et sekund bagud. */
  Admin.tegnere.push(tegnPladser);
  Admin.tegnere.push(tegnLoft);

  /* ---- LOFTET FOR ALLE DAGE ---- */
  $('gem-bord-loft').addEventListener('click', function () {
    var v = $('bord-loft-alle').value.trim();
    var tal = Number(v);
    if (v !== '' && (!isFinite(tal) || tal < 0 || tal > 500 || Math.round(tal) !== tal)) {
      return Admin.brøl('Skriv et helt tal fra 0 og op — eller lad feltet stå tomt.');
    }
    Admin.gem(Butik.skrive.indstilling('bord_loft_pr_dag', v === '' ? null : tal),
      v === '' ? 'Loftet er fjernet — alle aktive borde kan bookes hver dag.'
        : tal === 0 ? 'Der kan ikke bookes borde på hjemmesiden nu.'
          : 'Højst ' + tal + (tal === 1 ? ' bord' : ' borde') + ' pr. dag.');
  });

  /* ---- LOFTET FOR ÉN DAG ---- */
  $('gem-bord-loft-dag').addEventListener('click', function () {
    var dato = $('bord-loft-dato').value;
    var v = $('bord-loft-dag').value.trim();
    if (!dato) return Admin.brøl('Vælg en dato først.');
    var tal = Number(v);
    if (v === '' || !isFinite(tal) || tal < 0 || tal > 500 || Math.round(tal) !== tal) {
      return Admin.brøl('Skriv et helt tal fra 0 og op for den dag. '
        + 'Vil du fjerne loftet igen, så tryk ✕ på dagen i listen.');
    }
    /* ⚠️ DEN EKSISTERENDE RÆKKE SKAL MED. dagsregel() skriver
       HELE rækken (upsert), så et loft sat alene ville slette
       dagens lukketider og besked. Fandtes rækken ikke, er et
       tomt objekt det rigtige udgangspunkt. */
    var gammel = ((Admin.data && Admin.data.dags_regler) || [])
      .filter(function (r) { return r.dato === dato; })[0] || { dato: dato };
    Admin.gem(Butik.skrive.dagsregel(Object.assign({}, gammel,
      { dato: dato, bord_loft: tal })),
      tal === 0 ? Admin.pænDato(dato) + ' er lukket for bookinger.'
        : Admin.pænDato(dato) + ': højst ' + tal
          + (tal === 1 ? ' bord' : ' borde') + '.');
  });
  Admin.vedLogin.push(hentBorde);
  Admin.friske.push(hentBorde);
})();
