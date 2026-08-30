/* ============================================================
   HVILKE DAGE OG TIDER KAN DER BESTILLES TIL?

   Reglerne lå inde i js/bestilling.js, som er formularens egen
   fil på bestil/ og ved-bordet/. Den nye forside har en HELT
   anden formular — designet fra Claude Design — og den skal have
   præcis de samme regler.

   To udgaver af "hvilke dage kan man vælge?" er én for meget.
   Retter nogen varslet det ene sted, og glemmer det andet, kan
   gæsten bestille smørrebrød til om to timer på den ene side og
   ikke på den anden — og ingen af delene ser forkerte ud.

   Filen kender ingen HTML. Den tager forretningens data og en
   dato og svarer med dage, tider og navne. Alt, hvad der ligner
   et element eller et id, hører hjemme i den fil, der tegner.
   ============================================================ */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     Der findes ikke en fri dato. Dagene regnes ud af
     åbningstiderne, lukkedagene og vinterlukket, så gæsten ikke
     kan vælge en dag hvor lugen er lukket. En datovælger med
     alle årets dage ville lade hende bestille til 1. januar.
     --------------------------------------------------------- */
  var DAGE_FREM = 28;

  function isoPlus(iso, dage) {
    // Middag i UTC: så flytter et døgn ikke datoen ved sommertid
    var t = new Date(iso + 'T12:00:00Z');
    t.setUTCDate(t.getUTCDate() + dage);
    return t.toISOString().slice(0, 10);
  }

  function ugedagFor(iso) {
    // Butik.nu() giver 0 = mandag. Date giver 0 = søndag.
    var d = new Date(iso + 'T12:00:00Z').getUTCDay();
    return (d + 6) % 7;
  }

  function planFor(d, iso) {
    // Butik.lukketDen dækker også en lukkeperiode over flere dage.
    // Med den gamle sammenligning på ét dato-felt kunne gæsten
    // bestille midt i vinterlukningen.
    if (Butik.lukketDen(d, iso)) return null;
    /* ⚠️ BEGGE VEJE SPÆRRET ER EN LUKKEDAG. Er dagen lukket for
       både take-away og spis her, er der ikke noget at bestille,
       og dagen skal slet ikke stå i vælgeren. Spørgsmålet stilles
       HER, fordi alt går gennem planFor — ét sted at glemme det i
       stedet for fem. */
    if (Butik.dagenHeltLukket && Butik.dagenHeltLukket(d, iso)) return null;
    var p = (d.aabningstider || []).filter(function (a) {
      return a.ugedag === ugedagFor(iso);
    })[0];
    if (!p || p.lukket) return null;
    if (!p.aabner || !p.lukker) return null;
    return p;
  }

  /* Varslet er forretningens ene tal — men en enkelt vare kan
     kræve længere. Tapasfadet skal bestilles to dage i forvejen
     (ejerens ord, 23/8), og det er ikke en anden forretning, det
     er en anden ret. Derfor et frivilligt "mindst": formularen
     siger, hvor lang tid DEN kræver, og forretningens eget varsel
     vinder, hvis det er længere.

     Aldrig omvendt. En formular, der kunne SÆTTE varslet NED,
     ville kunne omgå det, ejeren har sat i admin — og køkkenet
     ville få en bestilling, de ikke kan nå. */
  function varselTimer(d, mindst) {
    var v = Number((d.indstillinger || {}).bestilling_varsel_timer);
    var timer = isFinite(v) && v >= 0 ? v : 24;
    var m = Number(mindst);
    return isFinite(m) && m > timer ? m : timer;
  }

  /* Mindsteantallet er SMØRREBRØDETS regel. Undtagelsen for
     bordet ("én is ved bord 7 er ikke for lidt") hører til
     formularen og bor i js/bestilling.js — den er en egenskab ved
     DEN formular, ikke ved forretningen. */
  function minStk(d) {
    var v = Number((d.indstillinger || {}).bestilling_min_stk);
    return isFinite(v) && v >= 1 ? Math.round(v) : 1;
  }

  /* ⚠️ OG NU ER DET OGSÅ KODENS REGEL, IKKE KUN NOTENS  (30/8).

     Kundens ord: "der er en fejl med at der står når man
     bestiller smørbrød ud af huset skal man minimum bestille 5
     ting — har jeg sat den til, men det gælder på alt. Det er en
     fejl, det er kun smørrebrød."

     Han har ret, og noten ovenfor har sagt det siden 23/8: tallet
     er smørrebrødets. Koden holdt det bare op mod HELE kurven, så
     en enkelt burger og en sodavand blev afvist med "der skal
     mindst bestilles 5 stk." — en gæst, der ikke kan bestille
     mad, og en fejlbesked, der ikke giver mening. Det er præcis
     "en kommentar er ikke et værn".

     Reglen: er der smørrebrød i kurven, skal der være mindst N af
     DEM. Er der ingen, er der intet mindsteantal — man må gerne
     købe én is.

     Svaret er tallet, der mangles, eller 0 når alt er i orden.
     Så kan både knappen og afsendelsen spørge det samme sted. */
  function minStkMangler(d, smoerAntal) {
    var min = minStk(d);
    if (min <= 1) return 0;
    if (!(smoerAntal > 0)) return 0;
    return smoerAntal < min ? min : 0;
  }

  /* Det tidligste øjeblik der kan hentes, som {dato, minutter} i
     dansk tid. Butik.nu() er dansk tid – det er hele grunden til at
     den findes – så varslet lægges oveni derfra. */
  /* ============================================================
     HVORNÅR KAN HVAD BESTILLES  (30/8)
     ------------------------------------------------------------
     Kundens ord: "køkkenet lukker jo 20.00, så sidste spisning og
     to-go slutter 19.30 af bestillinger, og man skal bestille
     tidligst 30 min in advance når det er to-go — udover bord,
     der er det 15 min." Og: "morgenmad kun 10-12.30 og derefter
     alt andet ... man skal ikke kunne bestille en dagensret eller
     en burger klokken 10.00, det er først efter 12.30."

     Det er ÉN model, ikke fire indstillinger:

      · KATEGORIEN har et vindue (fra/til) og sit eget varsel.
        Morgenmaden er 10.00-12.30, grillen er 12.30 og frem, og
        smørrebrødet har et døgn.
      · FORRETNINGEN har et køkken, der lukker, og en sidste
        bestilling et stykke før.
      · KANALEN har et varsel: 30 minutter ud af huset, 15 ved
        bordet — man sidder der jo.

     ⚠️ OG DET RETTER EN FEJL AF SAMME SLAGS SOM MINDSTEANTALLET.
     bestilling_varsel_timer er SMØRREBRØDETS døgn, men den
     gatede hele formularen: med 24 timer sat kunne gæsten ikke
     bestille en burger til i dag overhovedet. Varslet flytter ned
     på kategorien, hvor det hører til, og forretningens
     almindelige varsel er minutter.

     ⚠️ INGEN SQL. indstillinger er nøgle/værdi, som
     bestilbare_kategorier og smoer_stoerrelser. Kommer der en
     kolonne på menu_kategorier en dag, er det den, der skal læses
     — men ejeren skal kunne sætte tiderne i aften. */

  /* Tomt felt = ingen grænse. Et 0 ville betyde "kl. 00.00". */
  function tidTilMin(v) {
    var m = Butik.tilMinutter(v);
    return m === null || m === undefined ? null : m;
  }

  function kategoriTider(d) {
    var v = (d.indstillinger || {}).kategori_tider;
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
  }

  function tiderneFor(d, katId) {
    return kategoriTider(d)[String(katId)] || {};
  }

  /* Køkkenet lukker, og den sidste bestilling ligger et stykke
     før. Er de ikke sat, gælder åbningstiderne som hidtil. */
  function koekkenLukker(d) {
    return tidTilMin((d.indstillinger || {}).koekken_lukker);
  }
  function sidsteBestillingMin(d) {
    var n = Number((d.indstillinger || {}).sidste_bestilling_min);
    return isFinite(n) && n >= 0 ? Math.round(n) : 30;
  }

  /* ⚠️ VARSLET ER KANALENS, IKKE FORRETNINGENS ENE TAL.
     Ved bordet sidder gæsten der allerede; ud af huset skal hun
     nå at komme. Kundens tal: 30 og 15. */
  /* ⚠️ KUN NÅR EJEREN HAR SAT DEM. Er felterne tomme, gælder
     bestilling_varsel_timer som hidtil — ellers ville hver
     forretning, der ikke kender de nye felter, pludselig tage
     imod en bestilling om en halv time. Svaret er null, når der
     ikke er sat noget; kalderen falder tilbage. */
  function kanalVarsel(d, hvordan) {
    var i = d.indstillinger || {};
    var v = hvordan === 'spis_her'
      ? (i.varsel_min_bord !== undefined && i.varsel_min_bord !== null
        && i.varsel_min_bord !== '' ? i.varsel_min_bord : i.varsel_min_togo)
      : i.varsel_min_togo;
    var n = Number(v);
    return (v !== undefined && v !== null && v !== '' && isFinite(n) && n >= 0)
      ? Math.round(n) : null;
  }

  /* Kategoriens eget varsel i MINUTTER. Rækkefølgen er:
     kategoriens eget tal → smørrebrødets døgn (den gamle
     indstilling, så ejerens 24 timer bliver ved med at gælde
     dér, hvor de hører til) → kanalens tal. */
  /* Rækkefølgen: kategoriens eget tal → forretningens nye
     minut-varsel (kun når det ER sat) → det gamle
     bestilling_varsel_timer. Sådan ændrer intet sig, før ejeren
     har udfyldt de nye felter. */
  function katVarselMin(d, katId, hvordan) {
    var e = tiderneFor(d, katId);
    var n = Number(e.varsel_min);
    if (e.varsel_min !== undefined && e.varsel_min !== null && e.varsel_min !== ''
        && isFinite(n) && n >= 0) return Math.round(n);
    var k = kanalVarsel(d, hvordan);
    if (k !== null) return k;
    return varselTimer(d) * 60;
  }

  /* Kan DEN kategori hentes på det tidspunkt? Svaret er et objekt
     og ikke et ja/nej: gæsten skal have GRUNDEN at vide, ellers
     ligner en forsvunden kategori en fejl på siden. */
  function kategoriPaaTid(d, katId, iso, tid, hvordan) {
    var e = tiderneFor(d, katId);
    var m = tidTilMin(tid);

    var fra = tidTilMin(e.fra);
    var til = tidTilMin(e.til);
    var varsel = katVarselMin(d, katId, hvordan);

    if (m !== null) {
      if (fra !== null && m < fra) {
        return { aaben: false, grund: 'fra kl. ' + String(e.fra).slice(0, 5) };
      }
      if (til !== null && m > til) {
        return { aaben: false, grund: 'kun til kl. ' + String(e.til).slice(0, 5) };
      }
      /* ⚠️ VARSLET MÅLES MOD DET VALGTE TIDSPUNKT, ikke mod
         dagen. En burger til om ti minutter er for sent, også
         selv om dagen er i morgen — og en burger i morgen er
         fint, selv om varslet er en time. */
      var nu = Butik.nu();
      if (iso === nu.dato && m < nu.minutter + varsel) {
        return {
          aaben: false,
          grund: varsel >= 120
            ? 'bestilles ' + Math.round(varsel / 60) + ' timer før'
            : 'bestilles ' + varsel + ' min. før',
        };
      }
    }
    return { aaben: true, grund: '' };
  }

  /* ============================================================
     EMBALLAGE VED TO-GO  (30/8)
     ------------------------------------------------------------
     Kundens ord: "emballage tillæg ved to-go skal vi have."

     ⚠️ DEN GÆLDER IKKE ALT. En sodavand og en is skal ikke pakkes;
     en pokebowl og en portion pommes skal. Derfor er det en pris
     PLUS en liste over de kategorier, den gælder — samme form som
     bestilbare_kategorier, og ingen SQL.

     ⚠️ OG ALDRIG VED SPIS HER. Maden bæres ud på en tallerken;
     et emballagegebyr på et bord ville være penge for noget,
     gæsten ikke får.

     ⚠️ TOM PRIS = INGEN EMBALLAGE. Vi finder ikke på et tal på
     forretningens vegne — samme regel som alt andet i huset. */
  function emballagePris(d) {
    var v = (d.indstillinger || {}).emballage_pris;
    if (v === undefined || v === null || String(v).trim() === '') return 0;
    var n = Number(String(v).replace(',', '.'));
    return isFinite(n) && n > 0 ? n : 0;
  }

  function emballageKategorier(d) {
    var v = (d.indstillinger || {}).emballage_kategorier;
    return Array.isArray(v) ? v.map(Number) : [];
  }

  /* Hvor mange portioner skal der emballage på? Linjerne er
     {kat, antal}; kalderen kender sin egen kurv. */
  function emballage(d, linjer, hvordan) {
    var pris = emballagePris(d);
    if (!pris || hvordan === 'spis_her') return { antal: 0, pris: 0, ialt: 0 };
    var kat = emballageKategorier(d);
    var antal = 0;
    (linjer || []).forEach(function (l) {
      /* Tom liste = alt, der bestilles ud af huset. Det er det
         rimelige udgangspunkt, når ejeren har sat en pris men
         ikke peget på kategorier. */
      if (!kat.length || kat.indexOf(Number(l.kat)) !== -1) antal += Number(l.antal) || 0;
    });
    return { antal: antal, pris: pris, ialt: antal * pris };
  }

  /* Sidste tidspunkt, der overhovedet kan vælges den dag. */
  function sidsteTid(d, iso, hvordan) {
    var p = planFor(d, iso);
    if (!p) return null;
    var til = Butik.tilMinutter(p.lukker);
    var k = koekkenLukker(d);
    if (k !== null && k < til) til = k;
    return til - sidsteBestillingMin(d);
  }

  function tidligst(d, mindst) {
    var nu = Butik.nu();
    var minutter = nu.minutter + varselTimer(d, mindst) * 60;
    var dato = nu.dato;
    while (minutter >= 24 * 60) { minutter -= 24 * 60; dato = isoPlus(dato, 1); }
    return { dato: dato, minutter: minutter };
  }

  /* Tiderne på en dag: hver halve time, og sidste tid en halv time
     før der lukkes, så der er tid til at række posen ud af lugen.
     Er dagen den tidligst mulige, ryger tiderne før varslet. */
  /* hvordan: 'spis_her' eller take-away (afhentning/levering).
     Den afgør, HVILKEN af dagens to sidste tider der gælder —
     køkkenet pakker ud af huset til kl. 19, men gæsterne må sidde
     og spise til 20.30. Delte de én tid, kunne man enten ikke
     sidde færdig, eller også blev der pakket mad, mens der blev
     ryddet.

     Uden et hvordan bruges den SENESTE af de to. Det er med
     vilje: dagvælgeren tegnes, før gæsten har valgt, hvordan hun
     vil spise, og en dag må ikke forsvinde, fordi den ene vej er
     kortere. Formularen spørger igen med et hvordan, når valget
     er truffet. */
  /* ⚠️ VARSLET ER DEN MINDSTE AF DE KATEGORIER, SIDEN FAKTISK
     SÆLGER (30/8). Det er hele forskellen på at åbne vælgeren
     for en burger og at åbne den for smørrebrødet:

      · Forsiden sælger grill, drikkevarer OG smørrebrød. Dens
        mindste varsel er grillens 30 minutter, så gæsten kan
        vælge i dag kl. 15 — og smørrebrødets rækker siger så
        selv, at de ikke kan nås (se kategoriPaaTid).
      · bestil/ sælger KUN smørrebrød. Dens mindste varsel er
        døgnet, og vælgeren begynder i morgen som hidtil.

     Uden det ville bestil/ pludselig tilbyde smørrebrød om en
     halv time, og køkkenet ville få en bestilling, de ikke kan
     nå. katIds er valgfri: uden dem gælder kanalens tal. */
  function mindsteVarsel(d, katIds, hvordan) {
    if (!katIds || !katIds.length) {
      var k = kanalVarsel(d, hvordan);
      return k === null ? varselTimer(d) * 60 : k;
    }
    var mindst = null;
    katIds.forEach(function (id) {
      var v = katVarselMin(d, id, hvordan);
      if (mindst === null || v < mindst) mindst = v;
    });
    return mindst === null ? kanalVarsel(d, hvordan) : mindst;
  }

  function tiderFor(d, iso, mindst, hvordan, katIds, smoerIds) {
    var p = planFor(d, iso);
    if (!p) return [];

    var regel = Butik.dagsregel ? Butik.dagsregel(d, iso) : null;

    /* Er dagen lukket for netop DEN måde, er der ingen tider. Det
       er det samme svar som databasens værn giver — og gæsten
       skal møde det i vælgeren, ikke efter at have valgt hele sin
       mad. */
    if (regel && hvordan) {
      if (hvordan === 'spis_her' ? regel.luk_spis_her : regel.luk_takeaway) return [];
    }

    var fra = Butik.tilMinutter(p.aabner);
    var til = Butik.tilMinutter(p.lukker);

    /* En TIDLIG LUKNING fra kalenderen skærer aftenen af. Uden den
       her kunne gæsten bestille afhentning kl. 19 på en dag, hvor
       lugen lukker 15 — forsiden vidste det, formularen gjorde
       ikke. Fundet, da bordformularen fik samme regel. */
    var tidligt = Butik.tilMinutter(Butik.tidligLukning(d, iso));
    if (tidligt !== null && tidligt < til) til = tidligt;

    /* DAGENS EGNE TIDER. De kan kun snævre ind, aldrig udvide:
       en dag, der åbnede TIDLIGERE end åbningstiderne, ville love
       en luge, der ikke er bemandet. Personalet sætter et
       klokkeslæt, ikke en ny åbningstid. */
    if (regel) {
      var dagFra = Butik.tilMinutter(regel.tidligst);
      if (dagFra !== null && dagFra > fra) fra = dagFra;

      var sidste = Butik.tilMinutter(
        hvordan === 'spis_her' ? regel.senest_spis_her
          : hvordan ? regel.senest_togo
            : (regel.senest_spis_her || regel.senest_togo));
      if (sidste !== null && sidste < til) til = sidste;
    }

    /* ⚠️ KØKKENET LUKKER FØR LUGEN (30/8). Kundens ord:
       "køkkenet lukker jo 20.00, så sidste spisning og to-go
       slutter 19.30 af bestillinger." Er tallet ikke sat, gælder
       de gamle 30 minutter før lukketid — så en forretning uden
       indstillingen opfører sig som før. */
    var koekken = koekkenLukker(d);
    if (koekken !== null && koekken < til) til = koekken;
    til -= sidsteBestillingMin(d);

    /* ⚠️ VARSLET ER KANALENS, IKKE SMØRREBRØDETS.
       bestilling_varsel_timer er et DØGN, og den gatede hele
       formularen: med 24 timer sat kunne gæsten ikke vælge et
       tidspunkt i dag overhovedet, heller ikke til en burger.
       Vælgeren tilbyder nu det, NOGET kan bestilles til — og
       hver kategori siger selv, om den kan nås (kategoriPaaTid).

       "mindst" er stadig fadets egen undtagelse: en formular må
       gerne kræve MERE end forretningen, aldrig mindre. */
    var minutter = mindsteVarsel(d, katIds, hvordan);
    var m2 = Number(mindst);
    if (isFinite(m2) && m2 * 60 > minutter) minutter = m2 * 60;

    /* ⚠️ VARSLET SKAL RULLE OVER MIDNAT. Første udgave lagde det
       kun på, når dagen var I DAG — så et varsel på en uge havde
       INGEN virkning på nogen anden dag, og bestil/ tilbød
       smørrebrød i morgen med syv dages varsel sat. Det er
       nøjagtig det, tidligst() gjorde rigtigt, og som blev tabt,
       da varslet skiftede fra timer til minutter. */
    var nu = Butik.nu();
    var tidligstDato = nu.dato;
    var tidligstMin = nu.minutter + minutter;
    while (tidligstMin >= 24 * 60) {
      tidligstMin -= 24 * 60;
      tidligstDato = isoPlus(tidligstDato, 1);
    }
    if (iso < tidligstDato) return [];
    if (iso === tidligstDato) {
      fra = Math.max(fra, Math.ceil(tidligstMin / 30) * 30);
    }

    var ud = [];
    for (var m = fra; m <= til; m += 30) {
      ud.push(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2));
    }
    return ud;
  }

  /* ⚠️ DAGENE BEGYNDER I DAG, IKKE EFTER SMØRREBRØDETS DØGN.
     tidligst() lægger bestilling_varsel_timer oveni, og med
     ejerens 24 timer sat begyndte listen i morgen — også for en
     burger. Nu er det kanalens varsel, der afgør, hvilke dage der
     er tilbage; kategorierne siger hver især, om de kan nås. */
  function muligeDage(d, mindst, hvordan, katIds, smoerIds) {
    var ud = [];
    var start = Butik.nu().dato;
    for (var i = 0; i < DAGE_FREM && ud.length < 14; i++) {
      var iso = isoPlus(start, i);
      if (tiderFor(d, iso, mindst, hvordan, katIds, smoerIds).length) ud.push(iso);
    }
    return ud;
  }

  var MAANED = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'juni',
    'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];

  function dagNavn(d, iso) {
    var i_dag = Butik.nu().dato;
    if (iso === i_dag) return 'I dag';
    if (iso === isoPlus(i_dag, 1)) return 'I morgen';
    return Butik.UGEDAGE[ugedagFor(iso)].slice(0, 3) + '.';
  }

  function dagDato(iso) {
    return Number(iso.slice(8, 10)) + '. ' + MAANED[Number(iso.slice(5, 7)) - 1];
  }

  window.MosedeRegler = {
    DAGE_FREM: DAGE_FREM,
    isoPlus: isoPlus,
    ugedagFor: ugedagFor,
    planFor: planFor,
    varselTimer: varselTimer,
    minStk: minStk,
    minStkMangler: minStkMangler,
    kategoriTider: kategoriTider,
    kategoriPaaTid: kategoriPaaTid,
    katVarselMin: katVarselMin,
    kanalVarsel: kanalVarsel,
    koekkenLukker: koekkenLukker,
    sidsteBestillingMin: sidsteBestillingMin,
    sidsteTid: sidsteTid,
    emballage: emballage,
    emballagePris: emballagePris,
    mindsteVarsel: mindsteVarsel,
    tidligst: tidligst,
    tiderFor: tiderFor,
    muligeDage: muligeDage,
    dagNavn: dagNavn,
    dagDato: dagDato,
  };
}());
