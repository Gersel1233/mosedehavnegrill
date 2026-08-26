/* Fanen Nyheder. Se js/admin/kerne.js for de to principper
   der gælder i alle admin-filerne.

   ============================================================
   ⚠️ SYSTEMET GØR DESIGNARBEJDET, IKKE PERSONALET
   ============================================================
   Kundens ord (26/8): hver gang de lægger en nyhed op, skal den
   være "så tæt på ... som hvis du gjorde det" — ikke bare
   standardbillede og tekst.

   En nyhed var TO felter: en overskrift og en tekst. Og et blankt
   felt giver "Live musik!!!" og "NY BURGER", fordi der ikke er
   noget, der hjælper. Tre ting er svaret:

   1) SLAGSEN KOMMER FØRST. Musik, ny ret, ændrede tider, en
      begivenhed eller andet. Slagsen bestemmer farve og tegn —
      og vigtigst: HVILKE FELTER DER SPØRGES OM. Spørger vi om
      "hvem spiller" og "hvornår", skriver systemet selv
      overskriften "Live musik: Jonas Band" og en tekst, der
      hænger sammen. Begge kan rettes bagefter.

   2) FORHÅNDSVISNING. Det gæsten ser, mens der skrives. Uden den
      skal personalet gemme, åbne siden, kigge, gå tilbage og
      rette — og så gør de det ikke.

   3) VÆRN MOD DET, DER GØR EN NYHED GRIM. For lang overskrift
      (den klippes over på en telefon), VERSALER, tre udråbstegn.
      Ikke forbud — en linje, der siger det.

   ⚠️ SLAGS OG BILLEDE KRÆVER supabase/nyheder-slags-og-billede.sql.
   Indtil den er kørt, findes kolonnerne ikke, og fanen opfører sig
   som før. Se maaSlags() og maaBillede() — samme greb som
   maaAntal() i js/admin/menukort.js. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  /* ============================================================
     DE FEM SLAGS
     ------------------------------------------------------------
     ⚠️ LISTEN STÅR TRE STEDER: her, i NYHED_SLAGS i
     js/store-skriv.js og som nyhed_slags_ok i SQL-filen. Rettes
     kun det ene, tager øvetilstanden imod, hvad den rigtige
     database afviser.

     titel() og tekst() er FORSLAG, ikke facit. De skriver
     felterne, første gang der vælges en slags, og personalet kan
     rette frit bagefter — se skrivForslag().
     ============================================================ */
  var SLAGS = {
    musik: {
      navn: 'Live musik', tegn: '🎵',
      felter: [
        { n: 'hvem', e: 'Hvem spiller?', p: 'Fx Jonas & Band' },
        { n: 'hvornaar', e: 'Hvornår?', p: 'Fx lørdag kl. 19' },
      ],
      titel: function (d) {
        return d.hvem ? 'Live musik: ' + d.hvem : 'Live musik på havnen';
      },
      tekst: function (d) {
        var s = d.hvem ? d.hvem + ' spiller' : 'Der er live musik';
        if (d.hvornaar) s += ' ' + d.hvornaar;
        return s + ' — kom ned og hør med. Køkkenet har åbent som altid.';
      },
    },
    ret: {
      navn: 'Nyt på kortet', tegn: '🍽️',
      felter: [
        { n: 'ret', e: 'Hvad er nyt?', p: 'Fx Stegt rødspætte med remoulade' },
        { n: 'pris', e: 'Pris', p: 'Fx 129 kr.' },
      ],
      titel: function (d) {
        return d.ret ? d.ret + ' er på kortet' : 'Nyt på kortet';
      },
      tekst: function (d) {
        var s = d.ret ? 'Vi har taget ' + d.ret.toLowerCase() + ' på kortet'
          : 'Der er kommet noget nyt på kortet';
        if (d.pris) s += ' — ' + d.pris;
        return s + '. Kom ned og smag.';
      },
    },
    tider: {
      navn: 'Ændrede tider', tegn: '🕐',
      felter: [
        { n: 'hvornaar', e: 'Hvornår gælder det?', p: 'Fx fra 1. september' },
        { n: 'hvad', e: 'Hvad ændrer sig?', p: 'Fx vi holder åbent til 21 fredag og lørdag' },
      ],
      titel: function (d) {
        return d.hvad ? versal(d.hvad) : 'Vi har ændret åbningstiderne';
      },
      tekst: function (d) {
        var s = d.hvornaar ? versal(d.hvornaar) + ' ' : '';
        s += d.hvad ? d.hvad.charAt(0).toLowerCase() + d.hvad.slice(1)
          : 'ændrer vi åbningstiderne';
        return s + '. De fulde tider står under Åbningstider her på siden.';
      },
    },
    begivenhed: {
      navn: 'Begivenhed', tegn: '🎉',
      felter: [
        { n: 'hvad', e: 'Hvad sker der?', p: 'Fx Havnens sommerfest' },
        { n: 'hvornaar', e: 'Hvornår?', p: 'Fx søndag 14. september' },
      ],
      titel: function (d) { return d.hvad ? versal(d.hvad) : 'Der sker noget på havnen'; },
      tekst: function (d) {
        var s = d.hvad ? 'Vi holder ' + d.hvad.toLowerCase() : 'Der sker noget på havnen';
        if (d.hvornaar) s += ' ' + d.hvornaar;
        return s + '. Alle er velkomne.';
      },
    },
    andet: {
      navn: 'Andet', tegn: '📣',
      felter: [],
      titel: function () { return ''; },
      tekst: function () { return ''; },
    },
  };

  function versal(t) {
    var s = String(t || '').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  /* ---- FINDES KOLONNERNE? ----
     Samme greb som maaAntal() i js/admin/menukort.js: svaret
     læses af DET, DATABASEN HAR SVARET, ikke af en indstilling
     nogen skal huske at sætte.

     ⚠️ SLAGSVÆLGEREN VISES DOG ALTID, når der ikke er nogen
     nyheder endnu — ellers kunne ejeren ikke se, at fanen kan
     mere, den dag han lige har kørt SQL-filen og har et tomt
     arkiv. Uden rækker er der ingen nøgler at læse. */
  function harNoegle(raekker, noegle) {
    return (raekker || []).some(function (r) {
      return Object.prototype.hasOwnProperty.call(r, noegle);
    });
  }

  function maaSlags() {
    var n = Admin.data && Admin.data.nyheder;
    return !n || !n.length || harNoegle(n, 'slags');
  }

  function maaBillede() {
    var n = Admin.data && Admin.data.nyheder;
    return !!n && n.length > 0 && harNoegle(n, 'billede');
  }

  // ----------------------------------------------------------
  //  LISTEN
  // ----------------------------------------------------------
  function tegnNyheder() {
    var boks = $('nyheder-liste');
    Admin.tøm(boks);

    var nyheder = (Admin.data.nyheder || []).slice()
      .sort(function (a, b) { return a.dato < b.dato ? 1 : -1; });

    if (!nyheder.length) {
      boks.appendChild(lav('p', 'vare-tekst', 'Ingen nyheder lagt ind.'));
    }

    nyheder.forEach(function (n) {
      var r = lav('div', 'admin-raekke');
      var v = lav('div');
      v.style.flex = '1 1 14rem';

      var top = lav('div', 'nyhed-dato');
      /* Tegnet står FØR datoen, så listen kan skimmes: hvad slags
         nyheder står der egentlig på siden lige nu? */
      var s = SLAGS[n.slags] || SLAGS.andet;
      if (n.slags) top.appendChild(lav('span', 'nyhed-tegn', s.tegn));
      top.appendChild(document.createTextNode(Admin.pænDato(n.dato)));
      v.appendChild(top);

      v.appendChild(lav('div', 'vare-navn', n.titel));
      v.appendChild(lav('div', 'vare-tekst', n.tekst));

      /* STÅR DEN PÅ SIDEN LIGE NU? Uden det ord skal ejeren åbne
         hjemmesiden for at finde ud af, om nyheden virker — og
         "hvorfor kan jeg ikke se den?" er så et opkald.
         Butik.nyhedStatus er den samme regel, som gæstesiden
         filtrerer efter. */
      v.appendChild(statusMaerke(n));
      r.appendChild(v);

      /* Fotoet i det små. Personalet skal kunne se, HVILKET
         billede der sidder på — et navn på en fil siger
         ingenting, når der er tre nyheder om det samme. */
      if (n.billede) {
        var mini = document.createElement('img');
        mini.className = 'nyhed-mini';
        mini.src = n.billede;
        mini.alt = '';
        mini.loading = 'lazy';
        r.appendChild(mini);
      }

      /* Vinduet kan rettes bagefter. En nyhed, der er sat til at
         slutte i går, skal kunne få en uge mere uden at blive
         skrevet igen. */
      r.appendChild(vinduesFelter(n));

      /* SKJUL ER IKKE SLET. En nyhed om J-dag skal af siden i
         september og PÅ igen i november — slettes den, skal
         nogen skrive den forfra og finde billedet igen. Kolonnen
         aktiv har ligget i databasen siden setup.sql; det var
         KNAPPEN, der manglede, og uden den var "Slet" den eneste
         måde at få en nyhed væk på. */
      var skjul = lav('button', 'knap',
        n.aktiv === false ? 'Vis igen' : 'Skjul');
      skjul.type = 'button';
      skjul.addEventListener('click', function () {
        Admin.gem(Butik.skrive.nyhed(medUaendret(n, { aktiv: n.aktiv === false })),
          n.aktiv === false
            ? 'Nyheden er på siden igen.'
            : 'Nyheden er skjult. Den ligger her, til I viser den igen.');
      });
      r.appendChild(skjul);

      var slet = lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!window.confirm('Slet nyheden "' + n.titel + '"?\n\n'
          + 'Skal den bare af siden for en tid, så brug Skjul i stedet.')) return;
        Admin.gem(Butik.skrive.sletNyhed(n.id), 'Nyheden er slettet.');
      });
      r.appendChild(slet);
      boks.appendChild(r);
    });
  }

  /* Rækken samlet ét sted, så et tryk på Skjul eller Gem datoer
     ikke skal skrive syv felter af i hånden.

     ⚠️ OG DEN BESKYTTER IKKE SLAGS, DETALJER OG BILLEDE — det
     gør skrivelaget. Første udgave af noten her sagde, at et
     tryk på Skjul ellers ville slette fotoet. Det passer ikke:
     Butik.skrive.nyhed sender kun de tre, når kalderen HAR dem,
     og både PATCH og øvetilstandens Object.assign lader
     kolonner, der ikke er med, stå. Prøven blev sat til at måle
     det — og bestod, da linjen herunder blev fjernet. Så nu
     siger den, hvad den er: bekvemmelighed. */
  function medUaendret(n, aendring) {
    var ud = {
      id: n.id, titel: n.titel, tekst: n.tekst, dato: n.dato,
      aktiv: n.aktiv, vis_fra: n.vis_fra, vis_til: n.vis_til,
    };
    ['slags', 'detaljer', 'billede'].forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(n, k)) ud[k] = n[k];
    });
    for (var k2 in (aendring || {})) ud[k2] = aendring[k2];
    return ud;
  }

  var STATUS = {
    vises:    { tekst: 'Vises nu', klasse: 'favorit' },
    venter:   { tekst: 'Venter', klasse: 'udsolgt' },
    udloebet: { tekst: 'Udløbet', klasse: 'udsolgt' },
    /* Ordet følger knappen: den hedder Skjul, så tilstanden
       hedder Skjult — ikke "slukket", som ingen knap siger. */
    slukket:  { tekst: 'Skjult', klasse: 'udsolgt' },
  };

  function statusMaerke(n) {
    var s = Butik.nyhedStatus(n);
    var m = STATUS[s] || STATUS.slukket;
    var boks = lav('div', 'nyhed-status');
    boks.appendChild(lav('span', 'maerke ' + m.klasse, m.tekst));
    if (s === 'venter') {
      boks.appendChild(lav('span', 'hjaelp', 'fra ' + Admin.pænDato(n.vis_fra)));
    } else if (s === 'udloebet') {
      boks.appendChild(lav('span', 'hjaelp', 'sluttede ' + Admin.pænDato(n.vis_til)));
    } else if (n.vis_til) {
      boks.appendChild(lav('span', 'hjaelp', 'til og med ' + Admin.pænDato(n.vis_til)));
    }
    return boks;
  }

  function vinduesFelter(n) {
    var boks = lav('div', 'nyhed-vindue');
    var felter = {};

    [['vis_fra', 'Fra'], ['vis_til', 'Til og med']].forEach(function (p) {
      var f = document.createElement('input');
      f.type = 'date';
      f.className = 'smal-dato';
      f.value = n[p[0]] || '';
      f.setAttribute('aria-label', p[1] + ' — ' + n.titel);
      f.title = p[1];
      felter[p[0]] = f;
      boks.appendChild(f);
    });

    var gem = lav('button', 'knap lille', 'Gem datoer');
    gem.type = 'button';
    gem.addEventListener('click', function () {
      var fra = felter.vis_fra.value;
      var til = felter.vis_til.value;
      // Samme regel som nyhed_vindue_ok i databasen. En nyhed, der
      // slutter før den begynder, er ikke farlig — den er bare
      // usynlig, og så leder nogen efter en fejl i koden.
      if (fra && til && til < fra) {
        return Admin.brøl('Slutdatoen ligger før startdatoen.');
      }
      Admin.gem(Butik.skrive.nyhed(medUaendret(n, { vis_fra: fra, vis_til: til })),
        'Datoerne er gemt.');
    });
    boks.appendChild(gem);
    return boks;
  }

  // ----------------------------------------------------------
  //  DEN NYE NYHED
  // ----------------------------------------------------------
  var valgtSlags = 'andet';
  var detaljer = {};
  var valgtBillede = '';     // adressen, når fotoet er lagt op
  var forhaandBillede = '';  // blob-adresse, så det kan ses med det samme

  function tegnSlagsvalg() {
    var boks = $('ny-slags');
    if (!boks) return;
    Admin.tøm(boks);
    boks.classList.toggle('skjult', !maaSlags());
    if (!maaSlags()) { valgtSlags = 'andet'; return; }

    Object.keys(SLAGS).forEach(function (n) {
      var s = SLAGS[n];
      var k = lav('button', 'slags-knap' + (n === valgtSlags ? ' valgt' : ''));
      k.type = 'button';
      k.dataset.slags = n;
      k.setAttribute('aria-pressed', n === valgtSlags ? 'true' : 'false');
      k.appendChild(lav('span', 'slags-tegn', s.tegn));
      k.appendChild(lav('span', null, s.navn));
      k.addEventListener('click', function () {
        valgtSlags = n;
        detaljer = {};
        tegnSlagsvalg();
        tegnSlagsfelter();
        skrivForslag();
        tegnForhaand();
      });
      boks.appendChild(k);
    });
  }

  function tegnSlagsfelter() {
    var boks = $('ny-felter');
    if (!boks) return;
    Admin.tøm(boks);

    (SLAGS[valgtSlags] || SLAGS.andet).felter.forEach(function (f) {
      var felt = lav('div', 'felt');
      var id = 'ny-d-' + f.n;
      var etiket = lav('label', null, f.e);
      etiket.setAttribute('for', id);
      var i = document.createElement('input');
      i.type = 'text'; i.id = id; i.maxLength = 300; i.placeholder = f.p;
      i.value = detaljer[f.n] || '';
      i.addEventListener('input', function () {
        detaljer[f.n] = i.value;
        /* ⚠️ FORSLAGET SKRIVES KUN, SÅ LÆNGE INGEN HAR RETTET.
           Ellers ville en overskrift, personalet lige havde
           skrevet om, blive overskrevet ved næste tastetryk i et
           detaljefelt — midt i en sætning. */
        skrivForslag();
        tegnForhaand();
      });
      felt.appendChild(etiket);
      felt.appendChild(i);
      boks.appendChild(felt);
    });
  }

  /* Har personalet rørt overskrift eller tekst i hånden? Så er
     forslaget holdt op med at være et forslag. */
  var titelRoert = false;
  var tekstRoert = false;

  function skrivForslag() {
    var s = SLAGS[valgtSlags] || SLAGS.andet;
    if (!titelRoert && $('ny-titel')) $('ny-titel').value = s.titel(detaljer);
    if (!tekstRoert && $('ny-tekst')) $('ny-tekst').value = s.tekst(detaljer);
    maal();
  }

  /* ---- MÅLEREN ----

     ⚠️ DEN FORBYDER INGENTING. En overskrift på 70 tegn er ikke
     forkert — den bliver bare klippet over på en telefon, og det
     skal man kunne se, FØR man trykker. Grænsen er målt på
     designets .nw h3: omkring 48 tegn er to linjer på en iPhone.

     VERSALER og tre udråbstegn er den slags, der får en side til
     at ligne en tombola. Vi siger det; vi retter det ikke. */
  function maal() {
    var t = ($('ny-titel') || {}).value || '';
    var k = ($('ny-tekst') || {}).value || '';
    var m1 = $('ny-titel-maal');
    var m2 = $('ny-tekst-maal');

    if (m1) {
      var raad = [];
      if (t.length > 48) raad.push('Over 48 tegn — den bliver klippet over på en telefon');
      if (t.length > 3 && t === t.toUpperCase() && /[A-ZÆØÅ]/.test(t)) {
        raad.push('Store bogstaver hele vejen læses som råben');
      }
      if (/!{2,}/.test(t)) raad.push('Ét udråbstegn er nok');
      m1.textContent = raad.length ? '⚠ ' + raad.join(' · ') : t.length + ' tegn';
      m1.classList.toggle('maal-advar', raad.length > 0);
    }
    if (m2) {
      m2.textContent = k.length > 320
        ? '⚠ ' + k.length + ' tegn — forsiden viser cirka de første 320'
        : k.length + ' tegn';
      m2.classList.toggle('maal-advar', k.length > 320);
    }
  }

  /* ---- FORHÅNDSVISNINGEN ----
     Bygget som gæstens kort (.nw i havnegrillen.css), men med
     admins egne klasser: to stilark, der skal ligne hinanden, er
     to stilark, der langsomt holder op med det. Formen er den
     samme — billede eller slagsfelt øverst, dato, overskrift,
     tekst. */
  function tegnForhaand() {
    var boks = $('ny-forhaand');
    if (!boks) return;
    Admin.tøm(boks);

    var s = SLAGS[valgtSlags] || SLAGS.andet;
    var kort = lav('div', 'fh-kort');

    var top;
    if (forhaandBillede || valgtBillede) {
      top = document.createElement('img');
      top.className = 'fh-foto';
      top.src = forhaandBillede || valgtBillede;
      top.alt = '';
    } else {
      /* ⚠️ DET DESIGNEDE FELT — filens vigtigste bidrag til
         udseendet. Gæstekortet har en <image-slot>, som uden et
         foto er en 170 px høj TOM beige firkant. Slagsens tegn på
         en farvet flade er ikke et pladsholderbillede; det er en
         forside, der ser lavet ud, også når der ikke er et foto. */
      top = lav('div', 'fh-felt s-' + valgtSlags);
      top.appendChild(lav('span', 'fh-tegn', s.tegn));
    }
    kort.appendChild(top);

    var krop = lav('div', 'fh-krop');
    krop.appendChild(lav('div', 'fh-naar', Admin.pænDato(Butik.nu().dato)));
    krop.appendChild(lav('h4', 'fh-titel',
      ($('ny-titel') || {}).value || 'Overskriften står her'));
    krop.appendChild(lav('p', 'fh-tekst',
      ($('ny-tekst') || {}).value || 'Teksten står her.'));
    kort.appendChild(krop);

    boks.appendChild(kort);
  }

  function bindNyt() {
    ['ny-titel', 'ny-tekst'].forEach(function (id) {
      var f = $(id);
      if (!f) return;
      f.addEventListener('input', function () {
        if (id === 'ny-titel') titelRoert = true; else tekstRoert = true;
        maal();
        tegnForhaand();
      });
    });

    var billede = $('ny-billede');
    if (billede) {
      billede.addEventListener('change', function () {
        var fil = billede.files && billede.files[0];
        if (!fil) return;
        /* Vises MED DET SAMME fra en blob, mens uploaden kører.
           En knap, der ikke gør noget i tre sekunder, trykkes to
           gange. */
        if (forhaandBillede) URL.revokeObjectURL(forhaandBillede);
        forhaandBillede = URL.createObjectURL(fil);
        tegnForhaand();

        Admin.kvitter('Lægger billedet op …');
        Butik.skrive.nyhedBillede(fil).then(function (url) {
          valgtBillede = url;
          Admin.kvitter('Billedet er lagt op.');
        }).catch(function (e) {
          valgtBillede = '';
          if (forhaandBillede) URL.revokeObjectURL(forhaandBillede);
          forhaandBillede = '';
          billede.value = '';
          tegnForhaand();
          Admin.brøl(e.message || String(e));
        });
      });
    }
  }

  function nulstilNyt() {
    valgtSlags = 'andet';
    detaljer = {};
    titelRoert = false;
    tekstRoert = false;
    valgtBillede = '';
    if (forhaandBillede) URL.revokeObjectURL(forhaandBillede);
    forhaandBillede = '';
    ['ny-titel', 'ny-tekst', 'ny-fra', 'ny-til', 'ny-billede'].forEach(function (id) {
      if ($(id)) $(id).value = '';
    });
    tegnSlagsvalg();
    tegnSlagsfelter();
    maal();
    tegnForhaand();
  }

  $('tilfoej-nyhed').addEventListener('click', function () {
    var f = Butik.tjek.navn($('ny-titel').value, 'overskrift', 120)
         || Butik.tjek.navn($('ny-tekst').value, 'tekst', 2000);
    if (f) return Admin.brøl(f);

    var fra = $('ny-fra').value;
    var til = $('ny-til').value;
    if (fra && til && til < fra) {
      return Admin.brøl('Slutdatoen ligger før startdatoen.');
    }

    var ny = {
      titel: $('ny-titel').value,
      tekst: $('ny-tekst').value,
      dato: Butik.nu().dato,
      vis_fra: fra,
      vis_til: til,
    };
    // undefined = rør ikke kolonnen. Se noten i js/store-skriv.js.
    if (maaSlags()) {
      ny.slags = valgtSlags;
      ny.detaljer = detaljer;
    }
    if (valgtBillede) ny.billede = valgtBillede;

    Admin.gem(Butik.skrive.nyhed(ny),
      til ? 'Nyheden er på siden til og med ' + Admin.pænDato(til) + '.'
          : 'Nyheden er på siden.').then(nulstilNyt);
  });

  bindNyt();

  Admin.tegnere.push(function () {
    tegnNyheder();
    /* Uploadfeltet findes kun, når kolonnen gør — og det afgøres
       af det, databasen har svaret, så det skal tegnes om efter
       hver hentning. */
    var bf = $('ny-billede-felt');
    if (bf) bf.classList.toggle('skjult', !maaBillede());
    tegnSlagsvalg();
    tegnSlagsfelter();
    tegnForhaand();
  });
})();
