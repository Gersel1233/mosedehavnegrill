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
  /* ⚠️ TO TRIN, TO ORD (29/8, kundens forlæg): først KONTAKTER
     personalet gæsten på nummeret eller mailen i linjen ovenfor,
     og først når aftalen er afstemt, sættes den i kalenderen.
     Derfor hedder trin 2 "Aftal & sæt tid" — den samme knap
     sætter status til aftalt OG åbner felterne, der skriver
     rækken. Statussen i databasen hedder stadig 'kontaktet' og
     'aftalt'; ordene her er personalets. */
  var NAESTE = {
    ny: ['kontaktet', '📞 Jeg har kontaktet dem'],
    kontaktet: ['aftalt', '✓ Aftal & sæt tid'],
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

  /* ⚠️ BAGLOKALET HØRER IKKE TIL HER (27/8).

     Kundens ord: "baglokale skal ikke, da det har sin egen fane."
     Han har ret, og skellet var formularens og ikke personalets:
     baglokale/ skriver en UDLEJNING, h-baglokale skriver en
     FORESPØRGSEL, og de handler om det SAMME lokale på den
     samme dag.

     Stod de to på hver sin fane, skulle nogen huske at kigge
     begge steder, før de sagde ja til en lørdag — og det er
     præcis sådan, en dag bliver lovet væk to gange.

     ⚠️ DE FILTRERES KUN FRA VISNINGEN, IKKE FRA LISTEN.
     Admin.meld('forespoergsler', ...) sender HELE listen videre:
     Baglokale-fanen tegner dem, kalenderen viser dem på dagen, og
     Overblik tæller dem med. Filtrerede vi ved hentningen, ville
     de tre miste dem uden en eneste fejl. */
  function paaFanen(liste) {
    return (liste || []).filter(function (f) { return f.type !== 'baglokale'; });
  }

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
  /* ============================================================
     TO BUNKER, IKKE ÉN LANG LISTE  (29/8)
     ------------------------------------------------------------
     Kundens forlæg (spiis' Bookinger-fane) og hans ord: layoutet
     var "grimt og uoverskueligt". Fanen var én liste, hvor det
     ventende og det afsluttede stod i samme stak, og hvert kort
     fyldte en halv skærm.

     Nu er der to bunker og et spørgsmål til hver:
     · VENTER PÅ JER — dem, der skal kontaktes. Ældste øverst:
       den, der skrev i mandags, har ventet længst, og en
       forespørgsel, der ligger urørt i tre dage, er et selskab,
       der bliver holdt et andet sted.
     · PÅ PLADS — det aftalte. Nyeste øverst; der er ikke noget
       at gøre ved dem.

     Det AFVISTE står i den anden bunke og markerer sig ikke:
     sagen er lukket, men den skal kunne findes igen.
     ============================================================ */
  function venter(f) {
    return f.status === 'ny' || f.status === 'kontaktet' || manglerIKalender(f);
  }

  function tegnTal(mine) {
    var boks = $('foresp-tal');
    if (!boks) return;
    var iDag = Butik.nu().dato;
    var tal = [
      ['⏳', mine.filter(venter).length, 'venter på jer', 'haster'],
      ['✅', mine.filter(function (f) { return !venter(f) && f.status === 'aftalt'; }).length,
        'på plads', ''],
      ['🎉', mine.filter(function (f) { return f.status === 'aftalt' && f.dato === iDag; }).length,
        'i dag', ''],
    ];
    Admin.tøm(boks);
    tal.forEach(function (r) {
      var e = lav('span', 'foresp-tal-pille' + (r[3] && r[1] ? ' ' + r[3] : ''));
      e.appendChild(lav('span', 'foresp-tal-tegn', r[0]));
      e.appendChild(lav('strong', null, String(r[1])));
      e.appendChild(document.createTextNode(' ' + r[2]));
      boks.appendChild(e);
    });
  }

  function tegnForespoergsler() {
    var boks = $('forespoergsler-liste');
    if (!boks) return;

    /* Tallet på fanen: hvad der MANGLER. Det er ikke bare de nye
       — en aftale, der ikke er skrevet i kalenderen, er også
       uafsluttet arbejde, og den er den værste af de to. Talte
       mærket kun de nye, ville den forsvinde fra søjlen i samme
       sekund, nogen trykkede "Aftalen er i hus" — og så var der
       ikke noget, der mindede om kalenderen. */
    var mine = paaFanen(forespoergsler);

    var mangler = mine.filter(function (f) {
      return f.status === 'ny' || manglerIKalender(f);
    }).length;
    var maerke = $('foresp-antal');
    if (mangler) { maerke.textContent = mangler; maerke.classList.remove('skjult'); }
    else maerke.classList.add('skjult');

    tegnTal(mine);

    if (!mine.length) {
      Admin.tegnRaekker(boks, [{
        noegle: 'tom', aftryk: 'tom',
        byg: function () { return lav('p', 'vare-tekst', 'Der er ingen forespørgsler endnu.'); },
      }]);
      return;
    }

    var venterPaa = sorteret(mine.filter(venter));
    var paaPlads = sorteret(mine.filter(function (f) { return !venter(f); }));

    var raekker = [];

    /* ⚠️ OVERSKRIFTEN ER SIN EGEN RÆKKE med sin egen nøgle, så
       Admin.tegnRaekker kan lade kortene stå (se noten i
       kerne.js): bygges den som en beholder om kortene, tegnes
       hele bunken om, hver gang ét kort ændrer sig — og en note,
       nogen er ved at skrive, ryger under fingeren. */
    function hoved(noegle, tegn, titel, note, antal) {
      return {
        noegle: noegle,
        aftryk: titel + '|' + note + '|' + antal,
        byg: function () {
          var h = lav('div', 'foresp-hoved');
          var v = lav('h3', null, tegn + ' ' + titel);
          h.appendChild(v);
          h.appendChild(lav('span', 'kort-note', note));
          return h;
        },
      };
    }

    if (venterPaa.length) {
      raekker.push(hoved('h-venter', '📞', 'Venter på jer',
        'ældste øverst — kontakt dem og få dem på plads', venterPaa.length));
    }
    venterPaa.forEach(function (f) { raekker.push(kortRaekke(f)); });

    if (paaPlads.length) {
      raekker.push(hoved('h-plads', '✅', 'På plads',
        'aftalte selskaber og arrangementer', paaPlads.length));
    }
    paaPlads.forEach(function (f) { raekker.push(kortRaekke(f)); });

    Admin.tegnRaekker(boks, raekker);
  }

  function kortRaekke(f) {
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
    /* Frokostens "hvor tit" (30/8). ⚠️ Det er et ØNSKE, ikke et
       abonnement: der er ingen motor, der gentager noget. Feltet
       findes, for at den, der laver tilbuddet, kan se, om firmaet
       spørger om én levering eller om hver uge — og det er to
       vidt forskellige priser. */
    hvor_ofte: 'Hvor tit',
    /* Selskabssidens stedvalg (29/8). ⚠️ De stod som rå "sted" og
       "daekket" på kortet i det øjeblik, de blev sendt — MÅLT på
       et skærmbillede, ikke læst. Præcis den fejl, noten ovenfor
       advarer om: reglen om at vise ukendte nøgler er ikke en
       undskyldning for ikke at navngive dem, vi selv sender. */
    sted: 'Hvor på havnen',
    daekket: 'Dækket med',
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

  /* ---- HER LÅ TRIN-STRIBEN, OG DEN ER VÆK  (29/8) ----

     Kundens ord: "de to grønne og ene røde ting inde i kortet er
     ass ... det er stadig ikke nemt at se det hele."

     Striben kom 26/8 ("en step by step til forespørgsler") og
     havde en rigtig opgave: hvor langt er sagen nået. Men den
     svarede på det med TRE piller, der sagde det samme som
     statusmærket og knappen nedenunder — tre gange den samme
     oplysning i tre former, og øjet skulle læse dem alle for at
     finde ud af, hvad der manglede.

     Det, striben kunne, som de andre ikke kan, var trin 3:
     minde om kalenderen. DEN del er ikke fjernet — den står som
     den røde advarsel med felterne, der gør arbejdet færdigt.
     Se kalenderStand() ovenfor; den er stadig i brug. */

  /* ============================================================
     SKRIV DEN I KALENDEREN — HER, IKKE ET ANDET STED  (29/8)
     ------------------------------------------------------------
     Kundens ord: "efter trykket af det, komme i deres kalender og
     vælge hvilken dag og skrive note og alt det som til
     kalenderen, så det ligesom hænger sammen."

     Før førte påmindelsen kun HEN til Kalender-fanen, og så
     skulle personalet skrive dagen, titlen og noten af fra
     skærmen bag sig. Nu står felterne på kortet: dagen er
     forespørgslens (men kan rettes — aftalen kan være landet på
     en anden dato), titlen er foreslået ud fra type og navn, og
     noten er valgfri.

     ⚠️ DEN OPRETTES ALDRIG AF SIG SELV, og den er ALDRIG
     offentlig. Et selskab er som regel en privat fest, og en
     kalenderrække, der lander på hjemmesiden, fordi nogen
     trykkede "aftalt", ville sætte fru Hansens 80-års fødselsdag
     på internettet. Rækken bliver INTERN (offentlig = falsk), og
     mennesket skriver titlen.

     ⚠️ TYPEN ER 'arrangement'. Databasen har tre (arrangement /
     lukkedag / tidlig_lukning), og et selskab er ingen af de to
     sidste: forretningen har jo åbent. */
  function kalenderFelter(f) {
    var boks = lav('div', 'kal-opret');

    var dag = document.createElement('input');
    dag.type = 'date';
    dag.className = 'smal';
    dag.value = f.dato;
    dag.setAttribute('aria-label', 'Dag i kalenderen');

    var titel = document.createElement('input');
    titel.type = 'text';
    titel.className = 'navn';
    titel.maxLength = 120;
    titel.value = (TYPE_NAVNE[f.type] || 'Selskab') + ': ' + f.navn
      + (f.antal_personer ? ' (' + f.antal_personer + ' pers.)' : '');
    titel.setAttribute('aria-label', 'Titel i kalenderen');

    var note = document.createElement('input');
    note.type = 'text';
    note.className = 'vare-tekst-felt';
    note.maxLength = 2000;
    note.placeholder = 'Note til dagen (valgfri) — fx tidsrum, lokale, hvad der serveres';
    /* Det, gæsten selv har oplyst, foreslås som note: personalet
       skal ikke skrive af fra kortet lige ovenover. */
    note.value = kalenderNote(f);

    var gem = lav('button', 'knap', '📅 Skriv i kalenderen');
    gem.type = 'button';
    gem.addEventListener('click', function () {
      if (!dag.value) return Admin.brøl('Vælg hvilken dag den skal stå på.');
      if (!titel.value.trim()) return Admin.brøl('Skriv hvad der skal stå i kalenderen.');
      gem.disabled = true;
      Admin.gem(Butik.skrive.kalender({
        type: 'arrangement',
        dato: dag.value,
        titel: titel.value,
        beskrivelse: note.value,
        offentlig: false,
      }), 'Skrevet i kalenderen ' + Admin.pænDato(dag.value) + '.')
        /* ⚠️ Admin.gem genindlæser OG fanger fejlen selv — et
           .catch her ville aldrig køre, og knappen ville blive
           låst for evigt, den dag skrivningen fejler. Lykkes
           den, tegnes kortet om, og knappen forsvinder med
           advarslen; fejler den, skal den kunne trykkes igen. */
        .then(function () { gem.disabled = false; });
    });

    /* ⚠️ INGEN "ÅBN KALENDEREN"-KNAP (29/8, kundens ord: "nej, i
       admin ikke noget med åben kalenderen ... derefter aftalen
       er afstemt, sæt i kalenderen"). En knap, der fører VÆK til
       en anden fane, er et arbejde, der skal huskes; felterne her
       gør arbejdet færdigt, hvor det står. Kalender-fanen er der
       stadig for den, der vil se hele måneden. */
    boks.appendChild(dag);
    boks.appendChild(titel);
    boks.appendChild(note);
    var knapper = lav('div', 'knap-raekke');
    knapper.appendChild(gem);
    boks.appendChild(knapper);
    return boks;
  }

  /* Forslaget til noten: det, gæsten HAR oplyst, og intet andet.
     En note med "Antal: ikke oplyst" er støj. */
  function kalenderNote(f) {
    var dele = [];
    if (f.antal_personer) dele.push(f.antal_personer + ' personer');
    detaljeLinjer(f.detaljer).forEach(function (par) {
      dele.push(par[0] + ': ' + par[1]);
    });
    if (f.telefon) dele.push('Tlf. ' + f.telefon);
    return dele.join(' · ');
  }

  /* Overskriften: det, personalet skimmer listen efter. Gæstens
     egen anledning, hvis hun har skrevet en (feltet er fritekst
     siden 29/8), ellers typen — og antallet med, for det er dét,
     der afgør, om sagen er stor. */
  function overskrift(f, typeNavn) {
    var d = f.detaljer || {};
    var navn = String(d.anledning || '').trim()
      || typeNavn || TYPE_NAVNE[f.type] || f.type;
    return navn + (f.antal_personer ? ' · ' + f.antal_personer + ' pers.' : '');
  }

  function dageSiden(iso) {
    if (!iso) return 0;
    var da = new Date(String(iso).slice(0, 10) + 'T12:00:00Z');
    var nu = new Date(Butik.nu().dato + 'T12:00:00Z');
    if (isNaN(da.getTime())) return 0;
    return Math.max(0, Math.round((nu - da) / 86400000));
  }

  /* typeNavn er valgfrit og bruges af Baglokale-fanen. Dér siger
     "Baglokale" ingenting — hele fanen handler om lokalet — mens
     "Forespørgsel" er den oplysning, personalet mangler: kom den
     ind ad h-baglokale eller ad baglokale/? De to har hver sit
     sæt knapper, og et kort uden mærket ligner et, der mangler
     en. */
  function forespoergselKort(f, typeNavn) {
    var k = lav('div', 'bestil-kort b-' + f.status
      + (manglerIKalender(f) ? ' mangler-kalender' : ''));

    /* ⚠️ KORTET HAR EN TITEL NU (29/8, kundens forlæg og hans ord
       om trin-pillerne: "de to grønne og ene røde ting inde i
       kortet er ass ... stadig ikke nemt at se det hele").

       Trin-striben er væk. Den var tre piller, der sagde det
       samme som statusmærket og knappen nedenunder — tre gange
       den samme oplysning i tre former, og ØJET skulle læse dem
       alle for at finde ud af, hvad der manglede.

       I stedet har kortet en OVERSKRIFT, som man kan skimme en
       liste på: anledningen og antallet, eller typen, hvis
       gæsten ikke har skrevet en anledning. Det er sådan,
       forlægget gør det ("🎉 Barnedåb 60-70 mennesker"), og det
       er den ene linje, personalet leder efter, når de scroller. */
    var top = lav('div', 'foresp-top');
    top.appendChild(lav('h4', 'foresp-titel', overskrift(f, typeNavn)));
    top.appendChild(lav('span', 'maerke m-' + f.status,
      STATUS_NAVNE[f.status] || f.status));
    var ventet = dageSiden(f.oprettet);
    /* ⚠️ VENTETIDEN STÅR KUN, NÅR DEN ER ET PROBLEM. Et kort, der
       altid siger "har ventet 0 dage", er støj — og så ses tallet
       heller ikke den dag, det er 25. */
    if (f.status === 'ny' && ventet >= 1) {
      top.appendChild(lav('span', 'foresp-ventet' + (ventet >= 3 ? ' laenge' : ''),
        '⏳ har ventet ' + ventet + (ventet === 1 ? ' dag' : ' dage')));
    }
    top.appendChild(lav('span', 'bestil-ref', f.reference));
    k.appendChild(top);

    /* ⚠️ KONTAKTEN ER ÉN LINJE MED IKONER (29/8, kundens forlæg).
       Dato, navn, nummer og mail står sammen, som man læser dem
       højt i en telefon — og de to links er fanens vigtigste
       handling: personalet skal RINGE eller SKRIVE, før sagen kan
       gå videre. Første udgave gav dem etiketten "Kontakt" på sin
       egen linje; det var rigtigt tænkt og gjorde kortet højere,
       hvilket var netop det, kunden klagede over. */
    var hvem = lav('div', 'foresp-linje');
    hvem.appendChild(lav('span', 'foresp-dato',
      '📅 ' + (f.dato ? Admin.pænDato(f.dato) : 'Dato ikke fastlagt endnu')));
    hvem.appendChild(lav('span', 'foresp-navn', f.navn));
    /* ⚠️ DATO OG ANTAL ER FRIVILLIGE FELTER. Står der ingenting,
       siger linjen det HØJT i stedet for at være tom: "dato ikke
       fastlagt endnu" er en oplysning, personalet skal bruge i
       røret, og et tomt felt ligner en fejl i systemet. */
    hvem.appendChild(lav('span', 'foresp-antal-tekst',
      f.antal_personer ? '👥 ' + f.antal_personer + ' pers.' : '👥 antal ikke oplyst'));
    /* Telefonnummeret som link. Personalet SKAL ringe — gæsten har
       fået at vide, at vi gør det — og en tablet ved lugen kan så
       ringe direkte fra listen. */
    var tlf = lav('a', 'foresp-link', '📞 ' + f.telefon);
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
      var mail = lav('a', 'foresp-link', '✉ ' + f.email);
      mail.href = 'mailto:' + encodeURIComponent(f.email)
        + '?subject=' + encodeURIComponent(mailEmne(f))
        + '&body=' + encodeURIComponent(mailKrop(f));
      hvem.appendChild(mail);
    }
    k.appendChild(hvem);



    /* DETALJERNE. Formularerne spørger om mere end navn, dato og
       antal — anledning, tidsrum, hvad der skal serveres, hvor
       mange kuverter. De stod før i beskeden som fri tekst, og
       personalet skulle læse en sætning igennem for at finde
       tallet. Nu er de felter. */
    /* ⚠️ DETALJERNE ER ÉN LINJE, IKKE EN TABEL (29/8). De stod
       som en række pr. felt — fem rækker på et kort med
       stedvalg — og skubbede beskeden og knapperne under folden.
       Anledningen står allerede i overskriften; resten er det,
       personalet skimmer, mens de har røret i hånden.

       Rækkefølgen er formularens egen (Object.keys), så det, der
       blev spurgt om først, står først. */
    var d = detaljeLinjer(f.detaljer).filter(function (par) {
      /* Anledningen er overskriften nu — den skal ikke stå to
         gange på det samme kort. */
      return par[0] !== 'Anledning';
    });
    if (d.length) {
      var ekstra = lav('p', 'foresp-detaljer');
      ekstra.textContent = d.map(function (par) {
        return par[0] + ': ' + par[1];
      }).join(' · ');
      k.appendChild(ekstra);
    }

    if (f.besked) {
      var m = lav('p', 'bestil-gaestebesked');
      m.appendChild(lav('strong', null, '💬 '));
      m.appendChild(document.createTextNode(f.besked));
      k.appendChild(m);
    }

    /* Personalets egen note. Den gemmes, når feltet forlades, og
       ikke ved hvert tastetryk: et kald pr. bogstav ville være
       hundrede kald for én sætning. */
    /* ⚠️ DEN TOMME NOTE ER FOLDET VÆK (29/8) — samme greb som
       bestillingskortene fik det 29/8: på en fane med ti sager
       er ti åbne notefelter med den samme grå pladsholder lige så
       meget plads som ti gange navn, dato og mad tilsammen. Har
       nogen SKREVET en note, står den fremme: den er en
       oplysning, ikke et felt. */
    var note = lav('details', 'note-fold felt');
    if (f.intern_note) note.open = true;
    var etiket = lav('summary', null, f.intern_note ? '📝 Din note' : '📝 Skriv en note');
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
        advar.appendChild(kalenderFelter(f));
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
      var frem = lav('button', 'knap' + (n[0] === 'aftalt' ? ' foresp-aftal' : ''), n[1]);
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


  /* ⚠️ BAGLOKALE-FANEN TEGNER DE SAMME KORT — den skal ikke bygge
     sine egne. To kortbyggere for den samme række ville komme til
     at vise to forskellige ting: den ene ville få den nye chip fra
     designet, den anden ville ikke, og ingen ville opdage det, før
     et tal manglede i køkkenet.

     Knapperne i kortet er lukninger inde i den her fil, så de
     virker uændret, uanset hvilken fane kortet står på — og
     gemningen kalder hentForespoergsler(), som melder listen ind
     igen og dermed tegner begge faner. */
  Admin.forespoergselKort = forespoergselKort;
  Admin.forespoergselManglerIKalender = manglerIKalender;

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
