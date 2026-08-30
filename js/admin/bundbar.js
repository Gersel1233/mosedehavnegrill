/* BUNDBJÆLKEN PÅ TELEFONEN  (30/8)

   Kundens ord: "admin-appen skal også fixes på telefonen — jeg
   kan ikke vælge imellem fanerne, fordi de forsvinder ned i
   telefonens bar."

   Fanerne lå som en stribe, der rullede sidelæns. Målt på en
   iPhone 13: fjorten piller fylder over 1800 px på en skærm på
   390, altså stod tretten uden for kanten — og der var ikke
   noget, der sagde, at der var mere. Nu er det fem faste
   pladser: fire faner og en dør til resten.

   ⚠️ FILEN HER LAVER INGEN NY NAVIGATION. Knapperne er
   genveje, der trykker på fanerne — arket ER fanelisten selv.
   Byggede vi en anden liste til telefonen, skulle en ny fane
   tilføjes to steder, og den ene ville blive glemt.

   ⚠️ OG TALLENE ER SPEJLE, IKKE KOPIER. De læses af fanens
   eget mærke ved hver optegning. Regnede bjælken selv efter,
   ville de to tal langsomt komme til at sige hver sit — og
   ingen ville opdage hvilket der var rigtigt. */
(function () {
  var $ = Admin.$;
  var bar = $('bundbar');
  var ark = $('fane-ark');
  if (!bar || !ark) return;

  // ----------------------------------------------------------
  //  ARKET
  // ----------------------------------------------------------
  var skygge = Admin.lav('div', 'fane-skygge');
  document.body.appendChild(skygge);

  function åbentArk() { return ark.classList.contains('aabent'); }

  function sætArk(åbent) {
    ark.classList.toggle('aabent', !!åbent);
    skygge.classList.toggle('aabent', !!åbent);
    var mere = $('bb-mere');
    if (mere) mere.setAttribute('aria-expanded', åbent ? 'true' : 'false');
    /* ⚠️ SIDEN MÅ IKKE RULLE BAGVED. Ruller man i et ark, der
       ligger over en liste, ruller listen med — og når arket
       lukker, står man et helt andet sted end før. */
    document.body.classList.toggle('ark-aabent', !!åbent);
  }

  if ($('bb-mere')) {
    $('bb-mere').addEventListener('click', function () { sætArk(!åbentArk()); });
  }
  if ($('fane-ark-luk')) {
    $('fane-ark-luk').addEventListener('click', function () { sætArk(false); });
  }
  skygge.addEventListener('click', function () { sætArk(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && åbentArk()) sætArk(false);
  });

  /* Et tryk på en fane i arket lukker det. Uden det står listen
     hen over den fane, man lige valgte. */
  ark.addEventListener('click', function (e) {
    var knap = e.target.closest && e.target.closest('.faner button[data-panel]');
    if (knap) sætArk(false);
  });

  // ----------------------------------------------------------
  //  GENVEJENE
  // ----------------------------------------------------------
  Array.prototype.forEach.call(bar.querySelectorAll('button[data-gaa]'), function (k) {
    k.addEventListener('click', function () {
      sætArk(false);
      Admin.visFane(k.getAttribute('data-gaa'));
    });
  });

  // ----------------------------------------------------------
  //  TALLENE
  // ----------------------------------------------------------
  function tal(el) {
    if (!el || el.classList.contains('skjult')) return 0;
    var n = parseInt(String(el.textContent || '').replace(/\D+/g, ''), 10);
    return isFinite(n) ? n : 0;
  }

  function fanensTal(panelId) {
    var fane = document.querySelector('.faner button[data-panel="' + panelId + '"]');
    return fane ? tal(fane.querySelector('.badge')) : 0;
  }

  function sætTal(knap, antal) {
    var m = knap.querySelector('.bb-tal');
    if (!antal) { if (m) m.parentNode.removeChild(m); return; }
    if (!m) {
      m = Admin.lav('span', 'bb-tal');
      knap.insertBefore(m, knap.firstChild);
    }
    m.textContent = antal > 99 ? '99+' : String(antal);
    m.setAttribute('aria-label', antal + ' venter');
  }

  function tegnBundbar() {
    var iBaren = [];
    Array.prototype.forEach.call(bar.querySelectorAll('button[data-gaa]'), function (k) {
      var id = k.getAttribute('data-gaa');
      iBaren.push(id);
      k.setAttribute('aria-current', nuværendeFane() === id ? 'page' : 'false');
      sætTal(k, fanensTal(id));
    });

    /* ⚠️ "MERE" HAR SIT EGET TAL, og det er den ene ting,
       forlægget ikke gør. Ligger der en forespørgsel og venter,
       står den bag "…" — uden et tal på døren ville den være
       usynlig, til nogen tilfældigvis kiggede ind. */
    var mere = $('bb-mere');
    if (mere) {
      var resten = 0;
      Array.prototype.forEach.call(
        document.querySelectorAll('.faner button[data-panel]'), function (f) {
          if (iBaren.indexOf(f.dataset.panel) === -1) resten += tal(f.querySelector('.badge'));
        });
      sætTal(mere, resten);
      mere.setAttribute('aria-current',
        iBaren.indexOf(nuværendeFane()) === -1 ? 'page' : 'false');
    }
  }

  /* ⚠️ TO KILDER, OG DEN ANDEN ER IKKE EN KOPI.

     body.fane-… skrives af Admin.visFane — men den er først der,
     når nogen HAR skiftet fane. Ved indlæsningen står Overblik
     som valgt i opmærkningen, og uden reserven markerede baren
     "Mere" på en side, hvor Overblik var fremme. Målt på et skud,
     ikke læst.

     Reserven er fanens eget aria-selected, altså den SAMME
     sandhed som klassen kommer af — ikke en liste, vi selv
     holder. */
  function nuværendeFane() {
    var m = /(^|\s)fane-(p-[a-z]+)/.exec(document.body.className || '');
    if (m) return m[2];
    var valgt = document.querySelector('.faner button[aria-selected="true"]');
    return valgt ? valgt.dataset.panel : '';
  }

  /* ---- HVORNÅR TEGNES DEN OM? -----------------------------

     Ved faneskift, for markeringen. Ved hver optegning, som alt
     andet. Og — det vigtige — når et TAL på en fane ændrer sig.

     ⚠️ DET SIDSTE KAN IKKE KLARES MED EN LISTE OVER TEGNERE.
     Mærket på Bestillinger sættes inde i tegnBestillinger, som
     kører, når LISTEN kommer — ikke gennem Admin.tegnere. Første
     udgave hang kun på tegnerne, og målt: baren stod uden tal,
     mens fanen sagde 2. Tre prøver fandt det.

     En observatør er svaret, og den er samtidig grunden til, at
     de to tal ALDRIG kan komme til at sige hver sit: baren
     regner ikke efter, den kigger. */
  Admin.tegnere.push(tegnBundbar);
  Admin.efterFane.push(tegnBundbar);

  if (window.MutationObserver) {
    var faner = document.querySelector('.faner');
    if (faner) {
      new MutationObserver(tegnBundbar).observe(faner, {
        subtree: true, childList: true, characterData: true,
        attributes: true, attributeFilter: ['class'],
      });
    }
  }
  tegnBundbar();
})();
