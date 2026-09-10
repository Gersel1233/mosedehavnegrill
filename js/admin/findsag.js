/* ============================================================
   FIND EN SAG — ÉN INDGANG TIL ALLE FEM  (10/9)
   ------------------------------------------------------------
   Kundens ord: *"det hele skal hænge sammen og eventuelt have det
   i et ordre register eller noget den stil"*.

   MÅLT: hver sag har allerede en unik reference — SM (mad), BO
   (bord), FO (forespørgsel), UD (baglokalet), RE (tilmelding) —
   og admin har alle fem lister i hukommelsen (Admin.lister).
   Det, der manglede, var ÉN indgang. Ringer nogen med en kode
   eller et nummer, skulle personalet gætte, hvilken fane sagen
   lå på, og lede i den.

   ⚠️ DEN LAVER INGEN NYE DATA OG INGEN NYE KALD. Den kigger i
   det, fanerne allerede har meldt ind. Derfor virker den også,
   når forbindelsen driller — og derfor kan den ikke komme til at
   sige noget andet end den fane, sagen står på.

   ⚠️ OG DEN RETTER INGENTING. Den finder sagen og fører derhen.
   To steder at ændre den samme sag er to steder, der kan skride
   fra hinanden — samme regel som kalenderens dagspanel fik 24/8.
   ============================================================ */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  /* Hvor sagerne bor, og hvad de hedder for et menneske. Rækken
     her er samtidig prioriteringen i svaret: mad og borde er det,
     der oftest ringes om. */
  var STEDER = [
    { liste: 'bestillinger', fane: 'p-bestillinger', navn: 'Bestilling', tegn: '🥪', slags: 'mad' },
    { liste: 'borde', fane: 'p-borde', navn: 'Bordbooking', tegn: '🍽️', slags: 'bord' },
    { liste: 'forespoergsler', fane: 'p-forespoergsler', navn: 'Forespørgsel', tegn: '💬', slags: 'forespoergsel' },
    { liste: 'udlejninger', fane: 'p-lokale', navn: 'Baglokalet', tegn: '🔑', slags: 'udlejning' },
    { liste: 'reservationer', fane: 'p-tilmeldinger', navn: 'Tilmelding', tegn: '🎟️', slags: 'reservation' },
  ];

  /* ⚠️ TALLET SAMMENLIGNES SOM ET TAL, IKKE SOM TEKST. Skriver
     personalet "44", skal #0044 findes — og "0044" skal finde det
     samme. En sammenligning på strengen ville kræve, at gæsten
     læste nullerne med op. */
  function taller(v) {
    var n = String(v == null ? '' : v).replace(/[^0-9]/g, '');
    return n === '' ? null : Number(n);
  }

  function passer(sag, ord) {
    var ref = String(sag.reference || '').toUpperCase();
    if (ref && ref.indexOf(ord.toUpperCase()) !== -1) return true;

    /* Kun HELE tal må matche nummeret. Ellers ville "4" hente
       hver eneste bestilling fra 4 til 400 frem. */
    var sogt = taller(ord);
    if (sogt !== null && /^[0-9#\s]+$/.test(ord)) {
      if (taller(sag.nummer) === sogt) return true;
    }

    /* Telefonnummeret er den tredje ting, gæsten kan sige. Otte
       cifre, sammenlignet som cifre — "+45 20 30 40 50" og
       "20304050" er det samme menneske (samme regel som
       Admin.sammeGaest 29/8). */
    if (sogt !== null && String(sogt).length >= 6) {
      var tlf = taller(sag.telefon);
      if (tlf !== null && String(tlf).slice(-8) === String(sogt).slice(-8)) return true;
    }
    return false;
  }

  function soeg(ord) {
    var fund = [];
    STEDER.forEach(function (s) {
      (Admin.lister[s.liste] || []).forEach(function (sag) {
        if (passer(sag, ord)) fund.push({ sted: s, sag: sag });
      });
    });
    return fund;
  }

  function raekke(f) {
    var r = lav('button', 'find-traef');
    r.type = 'button';

    r.appendChild(lav('span', 'find-tegn', f.sted.tegn));

    var midt = lav('span', 'find-midt');
    /* ⚠️ NAVNET GÅR GENNEM Admin.pæntNavn, som alle andre kort.
       Gæsten skriver "lone hansen" i sin telefon; personalet
       råber det ud over en kø. Syvende sted, samme regel. */
    midt.appendChild(lav('span', 'find-navn',
      (Admin.pæntNavn ? Admin.pæntNavn(f.sag.navn) : f.sag.navn) || '—'));

    var under = [f.sted.navn];
    /* ⚠️ REGISTRET KENDER SLAGSEN — det er hele dets job — så
       nummeret skal vises med sit bogstav. Ellers ville netop
       den skærm, der findes for at skelne sagerne, vise fem
       slags som '#0001'. */
    if (f.sag.nummer) under.push(Butik.pæntNummer(f.sag.nummer, f.sted.slags));
    if (f.sag.reference) under.push(f.sag.reference);
    /* ⚠️ STATUSSEN GÅR GENNEM Admin.statusNavn. Logbogen havde sin
       egen kopi og sagde "Afhentet", mens resten af huset sagde
       "Færdig" — det ar er ni dage gammelt. */
    if (f.sag.status && Admin.statusNavn) under.push(Admin.statusNavn(f.sag.status));
    midt.appendChild(lav('span', 'find-under', under.join(' · ')));
    r.appendChild(midt);

    r.appendChild(lav('span', 'find-pil', '→'));
    r.addEventListener('click', function () {
      Admin.visFane(f.sted.fane);
      $('find-sag-felt').value = '';
      tegn('');
    });
    return r;
  }

  function tegn(ord) {
    var boks = $('find-sag-svar');
    if (!boks) return;
    Admin.tøm(boks);

    ord = String(ord || '').trim();
    /* ⚠️ ÉT TEGN SØGER IKKE. "2" ville hente halvdelen af huset
       frem og gøre feltet ubrugeligt, mens man taster. */
    if (ord.length < 2) { boks.classList.add('skjult'); return; }

    var fund = soeg(ord);
    boks.classList.remove('skjult');

    if (!fund.length) {
      /* ⚠️ ET TOMT SVAR ER ET SVAR. Står der ingenting, tror man,
         feltet ikke virker — og så leder nogen videre i fanerne
         efter en sag, systemet allerede har sagt nej til. */
      boks.appendChild(lav('p', 'find-intet',
        'Ingen sag med "' + ord + '". Prøv referencen (fx FO260909-JJJ11), '
        + 'bestillingsnummeret eller gæstens telefonnummer.'));
      return;
    }

    /* Højst ti. Er der flere, er søgningen for bred, og en liste
       på tredive er ikke et svar. */
    fund.slice(0, 10).forEach(function (f) { boks.appendChild(raekke(f)); });
    if (fund.length > 10) {
      boks.appendChild(lav('p', 'find-intet',
        'Der er ' + fund.length + ' sager, der passer. Skriv mere af '
        + 'referencen, så bliver listen kortere.'));
    }
  }

  var felt = $('find-sag-felt');
  if (felt) {
    felt.addEventListener('input', function () { tegn(felt.value); });
    /* Escape rydder feltet — den vej ud, et tastatur forventer. */
    felt.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { felt.value = ''; tegn(''); }
    });
  }

  /* Åbn ikke svaret af sig selv, når listerne kommer ind — men
     hold det, der ALLEREDE står, opdateret. Ellers kan personalet
     stå med et træf, der er sekunder gammelt. */
  Admin.efterHent.push(function () {
    if (felt && felt.value.trim()) tegn(felt.value);
  });
})();
