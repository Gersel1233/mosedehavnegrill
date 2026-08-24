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
  function tiderFor(d, iso, mindst) {
    var p = planFor(d, iso);
    if (!p) return [];

    var fra = Butik.tilMinutter(p.aabner);
    var til = Butik.tilMinutter(p.lukker);

    /* En TIDLIG LUKNING fra kalenderen skærer aftenen af. Uden den
       her kunne gæsten bestille afhentning kl. 19 på en dag, hvor
       lugen lukker 15 — forsiden vidste det, formularen gjorde
       ikke. Fundet, da bordformularen fik samme regel. */
    var tidligt = Butik.tilMinutter(Butik.tidligLukning(d, iso));
    if (tidligt !== null && tidligt < til) til = tidligt;
    til -= 30;

    var t = tidligst(d, mindst);
    if (iso === t.dato) fra = Math.max(fra, Math.ceil(t.minutter / 30) * 30);

    var ud = [];
    for (var m = fra; m <= til; m += 30) {
      ud.push(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2));
    }
    return ud;
  }

  function muligeDage(d, mindst) {
    var t = tidligst(d, mindst);
    var ud = [];
    for (var i = 0; i < DAGE_FREM && ud.length < 14; i++) {
      var iso = isoPlus(t.dato, i);
      if (tiderFor(d, iso, mindst).length) ud.push(iso);
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
    tidligst: tidligst,
    tiderFor: tiderFor,
    muligeDage: muligeDage,
    dagNavn: dagNavn,
    dagDato: dagDato,
  };
}());
