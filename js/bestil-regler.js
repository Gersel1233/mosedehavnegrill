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
  function tiderFor(d, iso, mindst, hvordan) {
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

    til -= 30;

    var t = tidligst(d, mindst);
    if (iso === t.dato) fra = Math.max(fra, Math.ceil(t.minutter / 30) * 30);

    var ud = [];
    for (var m = fra; m <= til; m += 30) {
      ud.push(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2));
    }
    return ud;
  }

  function muligeDage(d, mindst, hvordan) {
    var t = tidligst(d, mindst);
    var ud = [];
    for (var i = 0; i < DAGE_FREM && ud.length < 14; i++) {
      var iso = isoPlus(t.dato, i);
      if (tiderFor(d, iso, mindst, hvordan).length) ud.push(iso);
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
    tidligst: tidligst,
    tiderFor: tiderFor,
    muligeDage: muligeDage,
    dagNavn: dagNavn,
    dagDato: dagDato,
  };
}());
