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

    /* ⚠️ OG NAVNET OG DATOEN (16/9). Ejerens ord: det skal være "nemt
       at finde de diverse ting". Ringer nogen og siger "det er Lone,
       jeg har bestilt til lørdag", har de hverken nummeret eller
       referencen ved hånden — de har navnet og dagen. */
    var dato = somDato(ord);
    if (dato) return (sag.hent_dato || sag.dato) === dato;
    if (/[a-zæøå]/i.test(ord) && ord.length >= 2) {
      var navn = String(sag.navn || '').toLowerCase();
      if (navn.indexOf(ord.toLowerCase()) !== -1) return true;
    }
    return false;
  }

  /* "19/9", "19.9", "19-9", "19/9/2026", "2026-09-19" og "19. sep"
     → "2026-09-19". Uden årstal er det i år. Alt andet → null, så
     "44" stadig er et nummer og ikke den 4. april. */
  var MDR = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  function somDato(ord) {
    var s = String(ord || '').trim().toLowerCase();
    var aar = Butik.nu().dato.slice(0, 4);
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return s;
    m = /^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?$/.exec(s);
    var dag, md, y;
    if (m) { dag = +m[1]; md = +m[2]; y = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : aar; }
    else {
      m = /^(\d{1,2})\.?\s+([a-zæøå]{3})/.exec(s);
      if (!m || MDR.indexOf(m[2]) === -1) return null;
      dag = +m[1]; md = MDR.indexOf(m[2]) + 1; y = aar;
    }
    if (md < 1 || md > 12 || dag < 1 || dag > 31) return null;
    return y + '-' + ('0' + md).slice(-2) + '-' + ('0' + dag).slice(-2);
  }

  /* Hvilken nøgle bærer sagens kort på fanen? Det er de nøgler,
     fanerne selv giver Admin.tegnRaekker (data-raekke). */
  var NOEGLER = {
    bestillinger: ['b-'], borde: ['bord-'],
    forespoergsler: ['foresp-', 'forespoergsel-'], udlejninger: ['udlejning-'],
    reservationer: ['res-'],
  };

  /* Et træf fører HEN til sagen — ikke bare til fanen. Kortet
     rulles frem og markeres et øjeblik, så øjet finder det. */
  function visSag(f) {
    var fane = f.sted.fane;
    /* En forespørgsel om baglokalet står på Baglokale-fanen, ikke på
       Forespørgsler (den filtrerer dem fra). */
    if (f.sted.liste === 'forespoergsler' && f.sag.type === 'baglokale') fane = 'p-lokale';
    Admin.visFane(fane);
    if (f.sted.liste === 'bestillinger' && Admin.visBestillingDag && f.sag.hent_dato) {
      Admin.visBestillingDag(f.sag.hent_dato);
    }
    setTimeout(function () {
      var panel = document.getElementById(fane);
      if (!panel) return;
      var kort = null;
      (NOEGLER[f.sted.liste] || []).some(function (p) {
        kort = panel.querySelector('[data-raekke="' + p + f.sag.id + '"]');
        return !!kort;
      });
      if (!kort) return;
      kort.scrollIntoView({ block: 'center' });
      kort.classList.add('find-markeret');
      setTimeout(function () { kort.classList.remove('find-markeret'); }, 2600);
    }, 60);
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
      $('find-sag-felt').value = '';
      tegn('');
      visSag(f);
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
        'Ingen sag med "' + ord + '". Prøv gæstens navn, telefonnummer, '
        + 'en dato (fx 19/9), bestillingsnummeret eller referencen.'));
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
    /* "/" sætter markøren i feltet fra hvor som helst i admin (16/9) —
       men aldrig, mens nogen skriver i et andet felt. */
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      var a = document.activeElement;
      if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
      e.preventDefault();
      felt.focus();
    });
  }

  /* Åbn ikke svaret af sig selv, når listerne kommer ind — men
     hold det, der ALLEREDE står, opdateret. Ellers kan personalet
     stå med et træf, der er sekunder gammelt. */
  Admin.efterHent.push(function () {
    if (felt && felt.value.trim()) tegn(felt.value);
  });
})();
