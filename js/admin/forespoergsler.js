/* Fanen Forespørgsler: selskaber, catering, baglokale og
   frokostordning. Se js/admin/kerne.js for de to principper, der
   gælder i alle admin-filerne.

   ============================================================
   ⚠️ AFTALEN FOREGÅR PÅ MAIL — FANEN ER IKKE ET SAGSSYSTEM
   ============================================================
   Kundens ord (26/8): forespørgsler på arrangementer og den
   slags "foregår på mail, har ikke noget med systemet at gøre og
   skal skrives manuelt ind". Personalet skal MINDES om selv at
   oprette det i kalenderen — det er dér, overblikket er.

   Fanen skal derfor kun tre ting, og det er de tre trin på
   kortet:

     1. KOMMET IND   hvad gæsten skrev, som felter og ikke prosa
     2. SVAR DEM     mailknappen ER handlingen
     3. I KALENDEREN påmindelsen, der tjekker sig selv

   Pris, indhold, forbehold, hvad der bliver serveret — intet af
   det bor her. Det står i mailen mellem to mennesker.

   ⚠️ OG FANEN KAN IKKE BARE SLETTES, selv om aftalen ligger
   udenfor. To ting hænger i den:

   - FEM sider skriver ind i tabellen (h-selskaber, h-catering,
     h-baglokale, h-frokost og de gamle selskaber/ + baglokale/).
     Uden en fane at læse dem i ville gæsten få en kvittering på
     noget, ingen ser.
   - Visningen optagne_dage — værnet mod at der holdes selskab
     hos jer den dag, baglokalet er lejet ud — læser
     forespørgsler med status 'aftalt'. Den status kan KUN sættes
     her. Forsvandt knappen, ville værnet holde op med at virke
     uden en eneste fejl på skærmen.

   Forespørgslerne hentes for sig og ikke i Admin.genindlæs(). Kun
   chefen må læse dem, så kaldet svarer 401 for alle andre — og en
   fejl, der væltede hele genindlæsningen, ville tage åbningstider
   og menukort med sig. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  var STATUS_NAVNE = {
    ny: 'Ny', kontaktet: 'Svaret', aftalt: 'Aftalt', afvist: 'Afvist',
  };

  /* Hvad er det NÆSTE, der skal ske? Én knap, ikke en rulleliste.

     ⚠️ "JEG HAR SVARET" OG IKKE "JEG HAR RINGET". Ordet var
     telefonens, dengang gæsten fik at vide, at vi ringer. Aftalen
     foregår på mail nu, og en knap, der siger noget andet end
     det, personalet lige har gjort, er en knap, de holder op med
     at stole på. Statussen i databasen hedder stadig 'kontaktet'
     — den er en kolonneværdi med et værn på (forespoergsel_-
     status_ok), og at lave den om ville være en SQL-fil, ejeren
     skal køre, for et ord ingen ser. */
  var NAESTE = {
    ny: ['kontaktet', 'Jeg har svaret dem'],
    kontaktet: ['aftalt', 'Aftalen er i hus'],
  };

  /* De tre indgange. Står der en type i databasen, som ikke er
     herinde — fordi en fjerde er kommet til, og admin ikke er
     fulgt med — vises den rå værdi i stedet for at forsvinde.
     Personalet skal kunne se, at der ER kommet noget ind. */
  var TYPE_NAVNE = {
    catering: 'Catering', baglokale: 'Baglokale', selskab: 'Selskab',
    frokost: 'Frokostordning',
  };

  var forespoergsler = [];

  /* ---- STÅR DEN AFTALTE DAG I KALENDEREN? ----

     Tre svar, som Admin.kalenderHar: rækken, null (nej), eller
     undefined (ved det ikke endnu). Kun 'aftalt' skal i
     kalenderen — en forespørgsel, der er ny eller afvist, er
     ikke en aftale, og en påmindelse om at skrive den ind ville
     være forkert.

     Er der ingen DATO på forespørgslen, er der heller ikke
     noget at skrive ind. Datoen er et frivilligt felt i alle
     fire formularer.

     ⚠️ OG IKKE OM DET, DER ER OVERSTÅET. Butik.hent() kaster de
     kalenderrækker væk, hvis dag er passeret — "en lukkedag i
     marts hører ikke hjemme på forsiden i august". Uden det her
     ville et selskab fra i fjor stå og råbe om en kalenderrække,
     der ER oprettet, men er hentet væk igen. Advarslen kunne
     aldrig gøres tavs, og så holder man op med at læse den.

     ⚠️ ÉT SVAR, ÉT STED. Tre ting spørger om det her — striben,
     påmindelsen og tallet i søjlen — og spurgte de hver for sig,
     ville de tre langsomt komme til at sige noget forskelligt.
     Så ville striben stå på "gjort", mens advarslen råbte. */
  function kalenderStand(f) {
    if (f.status !== 'aftalt' || f.slettet) return 'ikke-relevant';
    if (!f.dato) return 'uden-dato';
    if (f.dato < Butik.nu().dato) return 'overstaaet';
    if (!Admin.kalenderHar) return 'ukendt';
    var svar = Admin.kalenderHar(f.dato);
    if (svar === undefined) return 'ukendt';
    return svar ? 'gjort' : 'mangler';
  }

  function manglerIKalender(f) {
    return kalenderStand(f) === 'mangler';
  }

  /* Rækkefølgen er "hvad mangler der at ske".

     ⚠️ ØVERST STÅR DET AFTALTE, DER IKKE ER I KALENDEREN. Det er
     det farligste på fanen: nogen har sagt ja til et selskab, og
     der står ingenting nogen steder om den lørdag. Næste gang
     nogen kigger på kalenderen, ser dagen fri ud — og så bliver
     den lovet væk to gange.

     Så de nye med den ÆLDSTE først: den, der skrev i mandags, har
     ventet længst, og en forespørgsel, der ligger urørt i tre
     dage, er et selskab, der bliver holdt et andet sted. Resten
     står nyeste først; for dem er der ikke noget at gøre ved. */
  var RANG = { ny: 1, kontaktet: 2, aftalt: 3, afvist: 4 };

  function rang(f) {
    return manglerIKalender(f) ? 0 : (RANG[f.status] === undefined ? 9 : RANG[f.status]);
  }

  function sorteret(liste) {
    return liste.slice().sort(function (a, b) {
      var ra = rang(a);
      var rb = rang(b);
      if (ra !== rb) return ra - rb;
      if (a.status === 'ny') return a.oprettet < b.oprettet ? -1 : 1;
      return a.oprettet < b.oprettet ? 1 : -1;
    });
  }

  /* Kortene, der ikke har ændret sig, bliver stående — se noten
     ved Admin.tegnRaekker i kerne.js. */
  function tegnForespoergsler() {
    var boks = $('forespoergsler-liste');
    if (!boks) return;

    /* Tallet på fanen: hvad der MANGLER. Det er ikke bare de nye
       — en aftale, der ikke er skrevet i kalenderen, er også
       uafsluttet arbejde, og den er den værste af de to. Talte
       mærket kun de nye, ville den forsvinde fra søjlen i samme
       sekund, nogen trykkede "Aftalen er i hus" — og så var der
       ikke noget, der mindede om kalenderen. */
    var mangler = forespoergsler.filter(function (f) {
      return f.status === 'ny' || manglerIKalender(f);
    }).length;
    var maerke = $('foresp-antal');
    if (mangler) { maerke.textContent = mangler; maerke.classList.remove('skjult'); }
    else maerke.classList.add('skjult');

    if (!forespoergsler.length) {
      Admin.tegnRaekker(boks, [{
        noegle: 'tom', aftryk: 'tom',
        byg: function () { return lav('p', 'vare-tekst', 'Der er ingen forespørgsler endnu.'); },
      }]);
      return;
    }

    Admin.tegnRaekker(boks, sorteret(forespoergsler).map(function (f) {
      return {
        noegle: 'foresp-' + f.id,
        /* ⚠️ KALENDEREN SKAL MED I AFTRYKKET. Alt, kortet viser,
           skal stå der, ellers bliver skærmen stående, når noget
           ændrer sig. Trin 3 læser kalenderen, og opretter
           personalet arrangementet på den anden fane, skal
           advarslen her forsvinde af sig selv — uden aftrykket
           blev den stående, til nogen loggede ud og ind. */
        aftryk: JSON.stringify([f, manglerIKalender(f)]),
        byg: function () { return forespoergselKort(f); },
      };
    }));
  }

  /* Nøglerne kommer fra formularerne (js/skal/forespoergsel.js).
     Står der en, vi ikke kender, vises den med sit eget navn i
     stedet for at blive væk: en ny chip i designet må ikke kunne
     forsvinde ud af køkkenets syn, fordi ingen huskede at rette
     den her liste. */
  var DETALJE_NAVNE = {
    anledning: 'Anledning',
    hvor: 'Hvor',
    mad: 'Mad',
    tidsrum: 'Tidsrum',
    servering: 'Servering',
    levering: 'Levering',
    levering_indhold: 'Skal leveres',
    adresse: 'Adresse',
    tid: 'Tidspunkt',
    fade: 'Fade og opdækning',
    /* Frokostordningens egne. De stod som rå nøgler — "dage" og
       "indhold" med lille begyndelsesbogstav midt mellem pæne
       etiketter. Reglen om at vise ukendte nøgler frem for at
       skjule dem er rigtig; den er bare ikke en undskyldning for
       ikke at navngive dem, vi selv sender. Se SIDER i
       js/skal/forespoergsel.js. */
    dage: 'Ugedage',
    indhold: 'Indhold',
    firma: 'Firma',
    cvr: 'CVR',
  };

  var DETALJE_VÆRDIER = {
    'hos-jer': 'Hos jer på havnen',
    'ud-af-huset': 'Ud af huset',
    'med-mad': 'Med mad',
    'kun-lokalet': 'Kun lokalet',
    levering: 'Skal leveres',
    afhentning: 'Hentes',
  };

  function detaljeLinjer(detaljer) {
    if (!detaljer || typeof detaljer !== 'object') return [];
    return Object.keys(detaljer).map(function (n) {
      var v = detaljer[n];
      if (Array.isArray(v)) v = v.join(', ');
      v = String(v === null || v === undefined ? '' : v);
      return [DETALJE_NAVNE[n] || n, DETALJE_VÆRDIER[v] || v];
    }).filter(function (par) { return par[1]; });
  }

  function mailEmne(f) {
    return 'Jeres forespørgsel hos Mosede Havnecafe (' + f.reference + ')';
  }

  /* Udkastet, ikke svaret. Personalet skriver selv resten — vi
     kan hverken pris eller ledighed, og et system, der fandt på
     en pris, ville sende den af sted i deres navn. */
  function mailKrop(f) {
    var linjer = ['Hej ' + String(f.navn || '').split(' ')[0] + ',', '',
      'Tak for jeres forespørgsel.', ''];
    if (f.dato) linjer.push('Dato: ' + Admin.pænDato(f.dato));
    if (f.antal_personer) linjer.push('Antal: ' + f.antal_personer + ' personer');
    detaljeLinjer(f.detaljer).forEach(function (par) {
      linjer.push(par[0] + ': ' + par[1]);
    });
    linjer.push('', '', 'Venlig hilsen', 'Mosede Havnecafe');
    return linjer.join('\n');
  }

  /* ---- DE TRE TRIN ----

     Kundens ord (26/8): "en step by step til forespørgsler".
     Stribens opgave er at svare på ét spørgsmål uden at man skal
     læse kortet: hvor langt er den her nået, og hvad mangler.

     ⚠️ TRIN 3 ER IKKE EN STATUS I DATABASEN. Det er et opslag i
     kalenderen. En kolonne "skrevet_i_kalenderen" ville kunne
     stå på ja, mens rækken var slettet igen — og så mindede
     ingenting om den. Vi spørger dét, der faktisk skal være der.

     Ved vi det ikke endnu (Admin.data ikke hentet), står trinnet
     uafgjort i stedet for at melde fejl. Se noten ved
     Admin.kalenderHar. */
  var TRIN3 = {
    gjort: 'gjort',
    mangler: 'nu',
    // Ingen dato, overstået eller afvist: det sker aldrig for
    // den her række, og så skal trinnet ikke ligne noget, der
    // venter på nogen.
    'uden-dato': 'droppet',
    overstaaet: 'droppet',
    // Ikke aftalt endnu, eller vi har ikke set kalenderen: det
    // er ikke dets tur.
    'ikke-relevant': 'venter',
    ukendt: 'venter',
  };

  function trinFor(f) {
    return [
      { navn: 'Kommet ind', stand: 'gjort' },
      { navn: 'Svaret dem', stand: f.status === 'ny' ? 'nu' : 'gjort' },
      {
        navn: 'I kalenderen',
        stand: f.status === 'afvist' ? 'droppet'
          : (TRIN3[kalenderStand(f)] || 'venter'),
      },
    ];
  }

  function trinStribe(f) {
    var stribe = lav('div', 'trin-stribe');
    trinFor(f).forEach(function (t, i) {
      var e = lav('div', 'trin trin-' + t.stand);
      e.appendChild(lav('span', 'trin-tal',
        t.stand === 'gjort' ? '✓' : String(i + 1)));
      e.appendChild(lav('span', 'trin-navn', t.navn));
      stribe.appendChild(e);
    });
    return stribe;
  }

  function forespoergselKort(f) {
    var k = lav('div', 'bestil-kort b-' + f.status
      + (manglerIKalender(f) ? ' mangler-kalender' : ''));

    var top = lav('div', 'bestil-top');
    top.appendChild(lav('span', 'maerke favorit', TYPE_NAVNE[f.type] || f.type));
    top.appendChild(lav('span', 'maerke m-' + f.status,
      STATUS_NAVNE[f.status] || f.status));
    top.appendChild(lav('span', 'bestil-ref', f.reference));
    k.appendChild(top);

    k.appendChild(trinStribe(f));

    var hvem = lav('div', 'bestil-hvem');
    hvem.appendChild(lav('span', 'vare-navn', f.navn));
    /* Telefonnummeret som link. Personalet SKAL ringe — gæsten har
       fået at vide, at vi gør det — og en tablet ved lugen kan så
       ringe direkte fra listen. */
    var tlf = lav('a', 'bestil-tlf', f.telefon);
    tlf.href = 'tel:' + String(f.telefon).replace(/[^0-9+]/g, '');
    hvem.appendChild(tlf);
    /* MAIL-KNAPPEN. Et tilbud på et selskab er tal, datoer og
       forbehold — det skal skrives, ikke siges i en telefon ved
       en travl luge. Knappen åbner personalets eget mailprogram
       med adressen, referencen og det, gæsten har oplyst, så de
       ikke skal skrive det af fra skærmen.

       Den findes KUN, når gæsten har oplyst en mail. En knap,
       der åbner et tomt mailvindue, er en knap, man trykker på
       én gang. */
    if (f.email) {
      var mail = lav('a', 'bestil-tlf', '✉ ' + f.email);
      mail.href = 'mailto:' + encodeURIComponent(f.email)
        + '?subject=' + encodeURIComponent(mailEmne(f))
        + '&body=' + encodeURIComponent(mailKrop(f));
      hvem.appendChild(mail);
    }
    k.appendChild(hvem);

    /* Dato og antal er FRIVILLIGE felter. Står der ingenting, siger
       kortet det højt i stedet for at lade linjen være tom: "ingen
       dato" er en oplysning, personalet skal bruge i telefonen, og
       et tomt felt ligner en fejl i systemet. */
    var detaljer = lav('div', 'bestil-linjer');
    var r1 = lav('div', 'bestil-linje');
    r1.appendChild(lav('span', 'bestil-vare',
      f.dato ? Admin.pænDato(f.dato) : 'Dato ikke oplyst'));
    r1.appendChild(lav('span', 'bestil-linjepris',
      f.antal_personer ? f.antal_personer + ' personer' : 'Antal ikke oplyst'));
    detaljer.appendChild(r1);
    k.appendChild(detaljer);

    /* DETALJERNE. Formularerne spørger om mere end navn, dato og
       antal — anledning, tidsrum, hvad der skal serveres, hvor
       mange kuverter. De stod før i beskeden som fri tekst, og
       personalet skulle læse en sætning igennem for at finde
       tallet. Nu er de felter. */
    var d = detaljeLinjer(f.detaljer);
    if (d.length) {
      var ekstra = lav('div', 'bestil-linjer');
      d.forEach(function (par) {
        var r = lav('div', 'bestil-linje');
        r.appendChild(lav('span', 'bestil-vare', par[0]));
        r.appendChild(lav('span', 'bestil-linjepris', par[1]));
        ekstra.appendChild(r);
      });
      k.appendChild(ekstra);
    }

    if (f.besked) {
      var m = lav('p', 'bestil-gaestebesked');
      m.appendChild(lav('strong', null, 'Gæsten skriver: '));
      m.appendChild(document.createTextNode(f.besked));
      k.appendChild(m);
    }

    /* Personalets egen note. Den gemmes, når feltet forlades, og
       ikke ved hvert tastetryk: et kald pr. bogstav ville være
       hundrede kald for én sætning. */
    var note = lav('div', 'felt');
    var etiket = lav('label', null, 'Din note');
    etiket.setAttribute('for', 'foresp-note-' + f.id);
    var felt = document.createElement('input');
    felt.type = 'text';
    felt.id = 'foresp-note-' + f.id;
    felt.maxLength = 1000;
    felt.value = f.intern_note || '';
    felt.placeholder = 'Fx: sendt tilbud, venter på svar';
    felt.addEventListener('change', function () {
      if (felt.value === (f.intern_note || '')) return;
      gemForespoergsel(Butik.skrive.forespoergselStatus(f.id, f.status, felt.value),
        'Noten er gemt.');
    });
    note.appendChild(etiket);
    note.appendChild(felt);
    k.appendChild(note);

    /* ============================================================
       TRIN 3: SKRIV DEN I KALENDEREN
       ------------------------------------------------------------
       Kundens ord (26/8): personalet "skal mindes om at selv
       oprette det inde i kalenderen — får mest overblik".

       ⚠️ PÅMINDELSEN TJEKKER SIG SELV. Den står, til rækken
       FINDES i kalenderen, og forsvinder så af sig selv. En
       påmindelse, man skal kvittere for, bliver kvitteret for af
       den, der har travlt — og så står den på gjort, mens dagen
       er tom. Her kan den kun forsvinde ét sted fra: ved at
       arbejdet bliver gjort.

       ⚠️ OG DEN OPRETTER IKKE SELV. Vi ved ikke, hvad
       arrangementet hedder, om det er offentligt, eller om det
       overhovedet skal stå på hjemmesiden — et selskab er ofte
       en privat fest. Knappen fører derhen; mennesket skriver.
       ============================================================ */
    var stand = kalenderStand(f);
    if (stand === 'mangler' || stand === 'gjort') {
      if (stand === 'mangler') {
        var advar = lav('div', 'kalender-mangler');
        advar.appendChild(lav('strong', null, '⚠️ Den står ikke i kalenderen'));
        advar.appendChild(lav('span', 'vare-tekst',
          'I har sagt ja til ' + Admin.pænDato(f.dato)
          + '. Står dagen ikke i kalenderen, ser den fri ud næste gang'
          + ' nogen kigger — og så bliver den lovet væk to gange.'));
        var hen = lav('button', 'knap', '📅 Åbn ' + Admin.pænDato(f.dato));
        hen.type = 'button';
        hen.addEventListener('click', function () { Admin.aabnDag(f.dato); });
        advar.appendChild(hen);
        k.appendChild(advar);
      } else {
        var raekken = Admin.kalenderHar(f.dato);
        var ok = lav('p', 'kalender-staar');
        ok.appendChild(lav('strong', null, '✅ Står i kalenderen: '));
        ok.appendChild(document.createTextNode(
          (raekken && raekken.titel) || Admin.pænDato(f.dato)));
        k.appendChild(ok);
      }
    }

    var raekke = lav('div', 'knap-raekke');

    var n = NAESTE[f.status];
    if (n) {
      var frem = lav('button', 'knap', n[1]);
      frem.addEventListener('click', function () {
        gemForespoergsel(Butik.skrive.forespoergselStatus(f.id, n[0], felt.value),
          'Forespørgslen er sat til "' + STATUS_NAVNE[n[0]] + '".');
      });
      raekke.appendChild(frem);
    }

    if (f.status !== 'afvist' && f.status !== 'aftalt') {
      var afvis = lav('button', 'knap fare', 'Afvis');
      afvis.addEventListener('click', function () {
        /* ⚠️ ET AFSLAG SKAL SIGES. Gæsten har skrevet og venter på
           et svar; en forespørgsel, der bare bliver lukket i
           admin, er et menneske, der aldrig hører fra os og
           holder festen et andet sted uden at vide hvorfor.
           Mailen er vejen, når de har oplyst en — ellers
           telefonen. */
        if (!confirm('Afvis forespørgslen fra ' + f.navn + '?\n\n'
          + 'Husk at skrive til dem først: '
          + (f.email || f.telefon) + '.')) return;
        gemForespoergsel(Butik.skrive.forespoergselStatus(f.id, 'afvist', felt.value),
          'Forespørgslen er afvist.');
      });
      raekke.appendChild(afvis);
    }

    if (f.status === 'aftalt' || f.status === 'afvist') {
      var slet = lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!confirm('Flyt forespørgslen fra ' + f.navn + ' til skraldespanden?\n\n'
          + 'Den kan hentes tilbage i 30 dage.')) return;
        gemForespoergsel(Butik.skrive.tilSkraldespand('forespoergsel', f.id),
          'Forespørgslen ligger i skraldespanden.');
      });
      raekke.appendChild(slet);
    }

    k.appendChild(raekke);
    return k;
  }

  /* Som Admin.gem(), men henter FORESPØRGSLERNE igen og ikke alt
     det andet. genindlæs() henter syv tabeller; en statusknap skal
     ikke hente hele menukortet forfra. */
  function gemForespoergsel(løfte, besked) {
    return løfte
      .then(hentForespoergsler)
      .then(function () { Admin.kvitter(besked); })
      .catch(function (e) { Admin.brøl(e.message || String(e)); });
  }

  function hentForespoergsler() {
    return Butik.hentForespoergsler().then(function (liste) {
      forespoergsler = liste || [];
      Admin.meld('forespoergsler', forespoergsler);
      tegnForespoergsler();
      Admin.hentet('foresp-hentet');
    }).catch(function (e) {
      /* Fejlen skjules IKKE. Står der ingenting, tror medarbejderen,
         at der ikke er kommet nogen forespørgsler — og så venter et
         selskab på et opkald, ingen ved skal foretages. */
      var boks = $('forespoergsler-liste');
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'fejl',
        'Forespørgslerne kunne ikke hentes: ' + (e.message || e)
        + ' Skærmen prøver igen af sig selv om et øjeblik — bliver den'
        + ' ved, så log ud og ind igen.'));
      if (window.console) console.warn('forespørgsler:', e);
    });
  }


  Admin.vedLogin.push(hentForespoergsler);
  Admin.friske.push(hentForespoergsler);

  /* ⚠️ FANEN SKAL OGSÅ TEGNES, NÅR KALENDEREN ÆNDRER SIG.

     Trin 3 læser Admin.data.kalender, og den hentes af
     Admin.genindlæs() — ikke af hentForespoergsler(). Uden den
     her linje ville personalet oprette arrangementet på
     kalenderfanen, komme tilbage, og advarslen ville stadig stå.
     De ville oprette det én gang til.

     Admin.tegnere kaldes efter hvert Admin.gem og hver
     genindlæsning. Tegningen er gratis, når intet har ændret sig:
     Admin.tegnRaekker sammenligner aftryk og rører ikke et kort,
     der står rigtigt. */
  Admin.tegnere.push(tegnForespoergsler);
})();
