/* ============================================================
   MENUKORTET — HELE SIDEN KOMMER FRA DATABASEN

   Siden er til at LÆSE. Der er ingen plusknapper, ingen kurv og
   ingen sum: bestillingen sker ét sted, og knappen i bunden fører
   derhen. Den gamle udgave havde en kurv, men den kunne ikke
   følge med over på bestillingsformularen — gæsten lagde tre ting
   i den og begyndte forfra på forsiden.

   Tre afsnit fyldes ud:

     1) I dag        — dagens ret og dagens åbningstid
     2) Ugen         — én række pr. dag, syv dage frem
     3) Sortimentet  — ét kort pr. kategori fra admin

   REGLEN ER DEN SAMME SOM PÅ FORSIDEN: et afsnit uden noget at
   vise findes ikke. Ingen dagens ret → kortet "I dag" er væk.
   Intet menukort i databasen → sortimentet er væk, og der står en
   linje med telefonnummeret i stedet for en tom side.
   ============================================================ */

(function () {
  'use strict';

  if (!window.Butik) return;

  var MÅNEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december'];

  /* ---- ET ANSIGT PR. KATEGORI ----
     Listen bor i js/menu-emoji.js, fordi bordsiden skal have de
     SAMME tegn. To lister over det samme sortiment skrider fra
     hinanden: ejeren opretter "Vegansk", nogen føjer et tegn til
     den ene fil, og så har de to sider hver sit ansigt på den
     samme kategori. Se noten i filen.

     Mangler filen, får kategorien den neutrale tallerken i
     stedet for at siden går i stå — et manglende emoji er en
     skæv tegning, ikke en forkert oplysning om maden. */
  function emojiFor(k) {
    return window.MosedeEmoji ? window.MosedeEmoji.forKategori(k) : '🍽️';
  }

  function $(id) { return document.getElementById(id); }
  function tøm(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }
  function skjul(el) { if (el) el.style.display = 'none'; }

  function lav(tag, klasse, tekst) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (tekst !== undefined && tekst !== null) el.textContent = tekst;
    return el;
  }

  /* "89" → "89,-". Tom pris giver tom streng — og så skriver
     kaldstedet "spørg" i stedet. Aldrig et nul: 79 af
     forretningens varer har ikke fået en pris endnu, og et 0 ville
     stå som gratis. */
  /* ⚠️ ALIAS, IKKE KOPI (5/9). Reglen bor i Butik.kroner. */
  function kroner(p) { return Butik.kroner(p); }

  function prisMærke(p) {
    /* ⚠️ ET NUL ER GRATIS (10/9), og det er en anden regel end
       `kroner` — se noten ved `Butik.varePris` i store.js. */
    var t = Butik.varePris(p);
    return t ? lav('span', 'mk-pris', t) : lav('span', 'mk-pris mk-spoerg', 'spørg');
  }

  /* isoPlus bor i js/store.js (Butik.isoPlus) — én regel ét sted.
     ⚠️ OG IKKE i R (bestil-regler): den fil indlæses slet ikke på
     m-menukort.html, så R ville være undefined her. store.js er.
     Hvorfor middag og ikke midnat står i kommentaren dér. (17/9) */

  function datoTekst(iso) {
    var t = new Date(iso + 'T12:00:00Z');
    return t.getUTCDate() + '. ' + MÅNEDER[t.getUTCMonth()];
  }

  function ugedagFor(iso) {
    return (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7;
  }

  /* Dagens åbningstid, som den STÅR: ugeplanen, med kalenderens
     tidlige lukning skåret af og lukkedagen slået igennem. Uden
     det sidste kunne kortet sige "11–20" på en dag, lugen er
     lukket. */
  function åbentTekst(d, iso) {
    if (Butik.lukketDen(d, iso)) return 'Lukket';
    var plan = (d.aabningstider || []).filter(function (a) {
      return a.ugedag === ugedagFor(iso);
    })[0];
    if (!plan || plan.lukket || !plan.aabner || !plan.lukker) return 'Lukket';

    var lukker = plan.lukker;
    var tidligt = Butik.tidligLukning(d, iso);
    if (tidligt && Butik.tilMinutter(tidligt) < Butik.tilMinutter(lukker)) lukker = tidligt;

    var kort = function (t) { return Butik.klokken(t, 'kort'); };
    return kort(plan.aabner) + '–' + kort(lukker);
  }

  // ----------------------------------------------------------
  //  1) I DAG
  // ----------------------------------------------------------
  function visIDag(d) {
    var kort = $('mk-idag');
    var afsnit = $('mk-idag-afsnit');
    if (!kort) return;

    var i_dag = Butik.nu().dato;
    var retter = Butik.dagensRetter(d, i_dag);
    if (!retter.length) return skjul(afsnit);

    tøm(kort);

    var top = lav('div', 'mk-top');
    top.appendChild(lav('h3', null, 'I dag'));
    top.appendChild(lav('span', 'mk-naar',
      datoTekst(i_dag) + ' · ' + åbentTekst(d, i_dag)));
    kort.appendChild(top);

    /* FLERE RETTER SAMME DAG er en liste og ikke ét langt navn.
       Før stod "Stegt flæsk eller fiskefilet" i det samme felt med
       ÉN pris — og så var det gæsten, der skulle gætte, hvad de to
       kostede hver især. */
    retter.forEach(function (ret) {
      var række = lav('div', 'mk-ret');
      var txt = lav('div', 'mk-txt');
      txt.appendChild(lav('h4', null, ret.navn));
      txt.appendChild(lav('span', 'tag', ret.udsolgt ? 'Udsolgt' : 'Dagens ret'));
      if (ret.beskrivelse) txt.appendChild(lav('p', null, ret.beskrivelse));
      /* "Kun 3 tilbage" står KUN, når køkkenet har sat et antal —
         og tallet tælles ned af databasen selv ved hver
         bestilling, ikke af et menneske. Se dagens-retter.sql.

         ⚠️ GRÆNSEN BOR I Butik.faaTilbage (5/9). Den stod som et
         hårdkodet `<= 5` her, og de tre bestillingsveje viste
         slet ikke tallet. Fire skærme skal sige det SAMME om,
         hvornår en ret er ved at slippe op. */
      var faa = Butik.faaTilbage(ret);
      if (faa !== null) {
        txt.appendChild(lav('span', 'mk-faa', 'Kun ' + faa + ' tilbage'));
      }
      række.appendChild(txt);
      række.appendChild(prisMærke(ret.pris));
      if (ret.udsolgt) række.classList.add('mk-udsolgt');
      kort.appendChild(række);
    });
  }

  // ----------------------------------------------------------
  //  2) UGEN DER KOMMER
  //  ----------------------------------------------------------
  //  HELE UGEN ER RIGTIG NU. Den stod halvt tom — "Følger snart…"
  //  fra tirsdag og frem — fordi der kun fandtes ét felt til
  //  dagens ret. Tabellen dagens_retter gav resten af ugen et
  //  sted at stå, og køkkenet planlægger ugen om mandagen.
  //
  //  "Følger snart…" står stadig på de dage, der ikke er skrevet
  //  endnu. En opdigtet ret på torsdag ville være et løfte,
  //  køkkenet ikke har givet.
  // ----------------------------------------------------------
  function visUgen(d) {
    var boks = $('mk-uge');
    if (!boks) return;

    var i_dag = Butik.nu().dato;
    tøm(boks);

    /* ⚠️ DE TOMME DAGE EFTER I DAG SAMLES I ÉN LINJE (26/9) — samme
       regel som forsidens ugestribe fra 13/9 (kundens ord: "noget er
       forældet … kedelige"). Her stod "Følger snart…" syv gange i
       træk, når ugen ikke var lagt op — en side under opbygning. En
       lukket dag og "ingen dagens ret" står stadig: de er
       beslutninger, ikke huller. */
    var skjulte = 0;
    for (var i = 0; i < 7; i++) {
      var iso = Butik.isoPlus(i_dag, i);
      var række = lav('div', 'mk-dag' + (i === 0 ? ' mk-nu' : ''));
      række.setAttribute('data-dag', iso);

      var venstre = lav('div', 'mk-navn',
        Butik.UGEDAGE[ugedagFor(iso)] + (i === 0 ? ' · i dag' : ''));
      venstre.appendChild(lav('span', 'mk-dato', datoTekst(iso)));
      række.appendChild(venstre);

      var højre = lav('div');
      var dagens = Butik.dagensRetter(d, iso);
      if (dagens.length) {
        dagens.forEach(function (ret) {
          højre.appendChild(lav('h4', null,
            ret.navn + (ret.udsolgt ? ' · udsolgt' : '')));
          if (ret.beskrivelse) højre.appendChild(lav('p', null, ret.beskrivelse));
          var p = kroner(ret.pris);
          if (p) højre.appendChild(lav('span', 'mk-pris', p));
        });
      } else if (Butik.lukketDen(d, iso)) {
        højre.appendChild(lav('span', 'mk-tom', 'Lukket'));
      } else if (Butik.ingenDagensRet && Butik.ingenDagensRet(d, iso)) {
        /* Ejeren har TRYKKET, at der ingen er (31/8) — "Følger
           snart…" ville love en ret, køkkenet har sagt nej til. */
        /* ⚠️ "I DAG" KUN PÅ I DAG (26/9). Der stod "Ingen dagens ret i
           dag" ud for en torsdag, når det var mandag. */
        højre.appendChild(lav('span', 'mk-tom',
          'Ingen dagens ret' + (i === 0 ? ' i dag' : '') + ' — menukortet gælder'));
      } else {
        if (i > 0) { skjulte++; continue; }
        højre.appendChild(lav('span', 'mk-tom', 'Følger snart…'));
      }
      række.appendChild(højre);
      boks.appendChild(række);
    }
    if (skjulte) {
      boks.appendChild(lav('p', 'mk-uge-mere', 'Resten af ugen lægges op løbende.'));
    }
  }

  // ----------------------------------------------------------
  //  3) SORTIMENTET
  // ----------------------------------------------------------
  /* ============================================================
     ET FOTO BAG KATEGORIEN  (13/9)
     ------------------------------------------------------------
     Kundens ord: "inde på menukort siden laver vi f.eks ved retter
     en stegt flæsk med persillesovs som baggrundsbillede ... også
     sortimentet uden på, som vi har på forsiden". Smørrebrød og
     håndmadder er EJERENS egne fotos; resten er GENERERET (Sjinn),
     på kundens beslutning — samme kategori som tapasbillederne
     11/9. Skiftes de til rigtige fotos, er det én linje her.
     Andre retter, Sandwich, Snacks og Reception (25/9) er ligeledes
     GENEREREDE (fal.ai) — se nederst i listen.
     ⚠️ 26/9: de tolv Sjinn-billeder (solnedgang og sejlbåde) er
     skiftet ud med havn-*.jpg — OGSÅ GENEREREDE (fal.ai), i samme
     stil som de fire: dagslys, molen, dugen, kun varer fra kortet.
     "Retter" viser nu fish'n'chips (kortets vare) — stegt flæsk er
     ikke længere på kortet. De gamle menu-*.jpg ligger stadig i
     billeder/. Forsidens isafsnit bruger havn-softice.jpg og den
     GAMLE menu-kugleis.jpg (bubblewafflen) — Mikkels valg 26/9:
     "den var real nok". Slet den ikke.
     Tapas, smørrebrød og håndmadder er med vilje ikke rørt.

     ⚠️ KENDINGEN ER NAVNET, og rækkefølgen betyder noget:
     "Sandwich og retter fra pladen" indeholder "retter", og
     "Burgere og sandwich" indeholder "sandwich" — derfor kun
     præcis "Retter" for stegt flæsket. En kategori uden et
     match får intet foto (tilkøb, tillæg, drikkevarer). "Vælg
     fyld" er slukket hos ejeren og står her kun, så den aldrig
     arver smørrebrødets foto.
     ============================================================ */
  var FOTOS = [
    [/håndmad/, 'billeder/selskab-anretning.webp'],
    [/fyld/, null],
    [/smørrebrød/, 'billeder/selskab-fade.webp'],
    [/fra pladen/, 'billeder/menu-pladen.jpg'],
    [/burger/, 'billeder/havn-burgere.jpg'],
    [/pølse/, 'billeder/havn-poelser.jpg'],
    [/^retter$/, 'billeder/havn-retter.jpg'],
    [/tapas/, 'billeder/tapas-1.jpg'],
    [/platte/, 'billeder/havn-platter.jpg'],
    [/slider/, 'billeder/havn-sliders.jpg'],
    [/kugle|ishorn/, 'billeder/havn-kugleis.jpg'],
    [/softice/, 'billeder/havn-softice.jpg'],
    /* Morgenmad, kaffe og drikkevarerne (13/9, samme beslutning).
       ⚠️ PRÆCIS "Morgenmad": "Tilkøb morgenmad" skal ikke have et
       foto, og det indeholder ordet. */
    [/^morgenmad$/, 'billeder/havn-morgenmad.jpg'],
    [/kaffe/, 'billeder/havn-kaffe.jpg'],
    [/^øl$/, 'billeder/havn-oel.jpg'],
    [/^vin\b|cava|champagne/, 'billeder/havn-vin.jpg'],
    [/sodavand/, 'billeder/havn-sodavand.jpg'],
    /* De fire, der stod uden foto (25/9). Også GENEREREDE — fal.ai,
       nano-banana/edit — men med stedets egne fotos som reference:
       kagebordet på molen for dugen og udsigten, og deres egen
       sandwich for brødet og fyldet. Retterne er kortets egne.
       ⚠️ PRÆCISE NAVNE: "Retter" (stegt flæsk) står ovenfor med sit
       eget foto, og "andre retter" må ikke tage det. */
    [/^andre retter$/, 'billeder/menu-andre-retter.jpg'],
    [/^sandwich$/, 'billeder/menu-sandwich.jpg'],
    [/snacks/, 'billeder/menu-snacks.jpg'],
    [/pindemad/, 'billeder/menu-pindemad.jpg'],
  ];
  function fotoFor(k) {
    var n = String((k && k.navn) || '').toLowerCase().trim();
    for (var i = 0; i < FOTOS.length; i++) {
      if (FOTOS[i][0].test(n)) return FOTOS[i][1];
    }
    return null;
  }

  /* ============================================================
     VARENS LAG  (13/9)
     ------------------------------------------------------------
     Kundens idé: "trykke ind på sådan en ting inde i menukortet og
     læse hvad det er og sådan en lille beskrivelse".

     ⚠️ KUN VARER MED EN BESKRIVELSE KAN TRYKKES. De fleste af de 307
     har ingen ("Fadøl, lille", "Espresso") — et lag, der gentager
     navn og pris, er et tryk uden svar, og det føles som en fejl.
     Beskrivelserne skrives af ejeren i admin; forslagene dér er
     hans at godkende (js/admin/beskrivelsesforslag.js).

     ⚠️ TEKST, ALDRIG innerHTML — navnene og beskrivelserne skrives
     af ejeren, og et varenavn med HTML i skal stå som tekst.

     ⚠️ MAN BESTILLER STADIG IKKE HERINDE. Laget peger VIDERE: til
     smørrebrødssiden for smørrebrødet, til forsidens bestilling for
     det, udvalget sælger — og ingen steder hen for det, der ikke
     kan bestilles. Reglen er udvalgets egen, ikke en kopi.
     ============================================================ */
  var dataNu = null;
  var forrigeFokus = null;

  /* ⚠️ TAPASFADET HAR SIN EGEN BESTILLINGSSIDE (14/9). Kundens ord: "man
     skal også kunne bestille tapas her fra menukortet med knappen og en
     bedre beskrivelse … eller hav et link der siger læs mere og bestil
     tapas". Fadet er med vilje IKKE i forsidens udvalg (cateringens
     kategorier er lukkede), men det har m-tapas.html — dér står varslet,
     antal personer og tilkøbet. Uden en pris eller udsolgt: ingen knap,
     som alt andet. Kendingen er KATEGORIENS navn, samme mønster som
     fotoet i FOTOS ovenfor. */
  function erTapas(k) { return /tapas/i.test(String((k && k.navn) || '')); }

  function bestilVej(k, v) {
    if (!dataNu || !window.Butik || !Butik.udvalg) return null;
    if (v.udsolgt || !Butik.varePris(v.pris)) return null;
    if (erTapas(k)) return { href: 'm-tapas.html', ord: 'Læs mere og bestil tapas' };
    var u = Butik.udvalg(dataNu, 'uden-fyld') || {};
    if ((u.smoerKategorier || []).indexOf(k.id) !== -1) {
      return { href: 'h-smorrebrod.html', ord: 'Bestil smørrebrød' };
    }
    if ((u.bestilKategorier || []).indexOf(k.id) !== -1) {
      return { href: 'index.html#bestil', ord: 'Bestil på forsiden' };
    }
    return null;
  }

  function visVare(v, k, foto) {
    var lag = $('vare-lag');
    if (!lag) return;
    $('vare-kat').textContent = emojiFor(k) + ' ' + k.navn;
    var img = $('vare-foto');
    if (img) {
      if (foto) img.src = foto;
      else img.removeAttribute('src');
    }
    var tapas = erTapas(k);
    /* Fadets foto ER fadet — skarpt her og ikke sløret (menukort.css). */
    var hoved = $('vare-hoved');
    if (hoved) hoved.classList.toggle('skarp', tapas && !!foto);
    var tegn = $('vare-tegn');
    if (tegn) tegn.textContent = (window.MosedeEmoji && window.MosedeEmoji.forVare)
      ? window.MosedeEmoji.forVare(v, k) : emojiFor(k);
    $('vare-titel').textContent = v.navn;
    /* ⚠️ FADET KOSTER PR. PERSON (tapassiden regner antal × pris). Uden
       ordet læses 179,- som prisen for hele fadet. */
    var pris = Butik.varePris(v.pris);
    if (pris && tapas && !/pr\.\s*person/i.test(v.navn)) pris += ' pr. person';
    $('vare-pris').textContent = v.udsolgt ? 'Udsolgt i dag' : (pris || 'Spørg ved lugen');
    var beskr = String(v.beskrivelse || '').trim();
    var tekst = $('vare-tekst');
    var bits = $('vare-bits');
    if (!bits && tekst) {
      bits = lav('div', 'vare-lag-bits');
      bits.id = 'vare-bits';
      tekst.parentNode.insertBefore(bits, tekst.nextSibling);
    }
    if (bits) tøm(bits);
    /* ⚠️ FADETS INDHOLD SOM BRIKKER (14/9). Ejeren skriver det "·"-delt i
       admin → Menukort → Havnens tapas, og det stod som én lang linje med
       prikker. Som forsidens tapasafsnit: én linje, der siger hvad fadet
       er, og ét punkt pr. brik. Andre varer skriver deres beskrivelse som
       før. */
    var punkter = tapas ? beskr.split('·').map(function (s) { return s.trim(); })
      .filter(Boolean) : [];
    if (punkter.length > 1 && bits) {
      tekst.textContent = 'Havnens tapasfad — et fad til at dele. Det ligger der på det:';
      punkter.forEach(function (p) { bits.appendChild(lav('span', null, p)); });
    } else {
      tekst.textContent = beskr;
    }
    var cta = $('vare-cta');
    tøm(cta);
    var vej = bestilVej(k, v);
    if (vej) {
      var a = lav('a', 'g solid blk', vej.ord);
      a.href = vej.href;
      a.appendChild(lav('span', 'sheen'));
      cta.appendChild(a);
    }
    forrigeFokus = document.activeElement;
    lag.classList.add('open');
    var luk = $('vare-luk');
    if (luk) luk.focus();
  }

  function lukVare() {
    var lag = $('vare-lag');
    if (!lag || !lag.classList.contains('open')) return;
    lag.classList.remove('open');
    if (forrigeFokus && forrigeFokus.focus) forrigeFokus.focus();
  }

  (function () {
    var lag = $('vare-lag');
    if (!lag) return;
    if ($('vare-luk')) $('vare-luk').addEventListener('click', lukVare);
    lag.addEventListener('click', function (e) { if (e.target === lag) lukVare(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lukVare(); });
  })();

  /* ============================================================
     SORTIMENTET SOM DE TRYKTE KORT  (26/9)
     ------------------------------------------------------------
     Mikkels ord: *"det hele ser meget kedeligt ud … de skal
     naturligvis matche 1:1 med de her"* (billederne af kortene).
     Opbygningen står i js/skal/menukort-kort.js; her fordeles
     databasens varer på den og tegnes.

     ⚠️ KLASSERNE FRA FØR ER BEVARET, hvor de stadig betyder det
     samme: hvert afsnit er en .panel med data-kategori (ejerens
     kategori), hver vare en .mk-linje med data-vare, <h4> og
     .mk-pris. Resten af huset og prøverne slår op i dem.
     ============================================================ */
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, ' ').trim();
  }

  /* Fordelingen: først de varer, kortene flytter ved navn, så boksenes
     egne varer, så hver kategoris rest — og til sidst det, ingen har
     taget, i "Mere fra lugen". En vare står ét sted. */
  function fordel(grupper) {
    var kap = (window.MosedeMenukort && window.MosedeMenukort.KAPITLER) || [];
    var taget = [];
    var alle = [];
    grupper.forEach(function (g) {
      g.varer.forEach(function (v) {
        if (Butik.erDagensRetVare && Butik.erDagensRetVare(v)) return;
        alle.push({ v: v, k: g.kategori });
      });
    });
    function fri(pred) {
      for (var i = 0; i < alle.length; i++) {
        if (taget.indexOf(alle[i]) === -1 && pred(alle[i])) return alle[i];
      }
      return null;
    }
    function tag(x) { taget.push(x); return x; }

    var ud = kap.map(function (c) {
      var kopi = { def: c, spalter: {} };
      ['venstre', 'hoejre', 'hel'].forEach(function (s) {
        if (!c[s]) return;
        kopi.spalter[s] = c[s].map(function (a) { return { def: a, varer: [] }; });
      });
      return kopi;
    });
    function hvert(fn) {
      ud.forEach(function (c) {
        Object.keys(c.spalter).forEach(function (s) { c.spalter[s].forEach(function (a) { fn(a, c); }); });
      });
    }
    // 1) Ved navn
    hvert(function (a) {
      (a.def.kilder || []).forEach(function (kl) {
        (kl.navne || []).forEach(function (n) {
          var x = fri(function (y) {
            return norm(y.v.navn) === norm(n) && (kl.kat === '*' || norm(y.k.navn) === norm(kl.kat));
          });
          if (x) a.varer.push(tag(x));
        });
      });
    });
    // 2) Boksenes egne varer (fx "Kaffe og kage" er Pausen-boksen)
    hvert(function (a) {
      [a.def].concat(a.def.felter || []).forEach(function (f) {
        /* ⚠️ KUN EN BOKS, DER SIGER DET (tag: true), TAGER SIN VARE UD AF
           LISTEN. Ellers forsvandt fx "Glutenfrit brød" helt fra kortet,
           fordi smørrebrødets boks nævner prisen (set i prøven 26/9). */
        if (f.pris && f.pris.vare && f.tag) {
          var x = fri(function (y) { return norm(y.v.navn) === norm(f.pris.vare); });
          if (x) tag(x);
        }
      });
    });
    // 3) Kategoriernes rest
    hvert(function (a) {
      (a.def.kilder || []).forEach(function (kl) {
        if (kl.navne || kl.kat === '*') return;
        alle.forEach(function (y) {
          if (taget.indexOf(y) !== -1 || norm(y.k.navn) !== norm(kl.kat)) return;
          if (kl.medValg && !harValg(y.v, kl.medValg)) return;
          a.varer.push(tag(y));
        });
      });
    });
    // 4) Det, ingen har taget
    var rest = alle.filter(function (y) { return taget.indexOf(y) === -1; });
    if (rest.length) {
      var afsnit = [];
      rest.forEach(function (y) {
        var a = afsnit.filter(function (x) { return x.def.titel === y.k.navn; })[0];
        if (!a) { a = { def: { titel: y.k.navn }, varer: [] }; afsnit.push(a); }
        a.varer.push(y);
      });
      ud.push({ def: { id: 'mere', over: 'Mosede Havnecafe', titel: ['Mere fra lugen'], hop: 'Mere' },
        spalter: { hel: afsnit } });
    }
    return ud;
  }

  function harValg(v, navn) {
    return Array.isArray(v.valg) && v.valg.some(function (x) {
      return norm(x && typeof x === 'object' ? x.navn : x) === norm(navn);
    });
  }
  function varePrisTal(v) { var n = Number(v && v.pris); return isFinite(n) && n > 0 ? n : null; }

  /* Samme pris på alle varerne → den pris, ellers null. */
  function ensPris(varer) {
    var p = null;
    for (var i = 0; i < varer.length; i++) {
      var n = varePrisTal(varer[i].v || varer[i]);
      if (n === null) return null;
      if (p === null) p = n; else if (p !== n) return null;
    }
    return p;
  }

  function findVare(grupper, navn) {
    for (var i = 0; i < grupper.length; i++) {
      for (var j = 0; j < grupper[i].varer.length; j++) {
        if (norm(grupper[i].varer[j].navn) === norm(navn)) return grupper[i].varer[j];
      }
    }
    return null;
  }
  /* ⚠️ "ALLE VARIANTER 55,-" ER VARIANTERNES PRIS, IKKE KATEGORIENS.
     Rejemad og tartar ligger i ejerens smørrebrødskategori til 95 —
     regnet over hele kategorien var der ingen fælles pris, og boksen
     stod uden. Tallet regnes derfor over det, der FAKTISK står i
     kategoriens afsnit (placeret af fordel()). */
  var placeret = {};
  function katVarer(grupper, kat) {
    var her = placeret[norm(kat)];
    if (her) return her.filter(function (v) { return !v.udsolgt; });
    var g = grupper.filter(function (x) { return norm(x.kategori.navn) === norm(kat); })[0];
    return g ? g.varer.filter(function (v) { return !v.udsolgt; }) : [];
  }

  /* Logoet (roundellen) står ÉN gang i HTML'en som <template>; hvert
     kapitel får en kopi med egne id'er — to ens id'er på én side får
     <use href="#…"> til at pege på den forkerte. */
  var logoNr = 0;
  function logo() {
    var t = document.getElementById('mk-logo');
    if (!t) return null;
    var nr = ++logoNr;
    var html = t.innerHTML.replace(/id="([a-z0-9-]+)"/gi, 'id="$1-' + nr + '"')
      .replace(/href="#([a-z0-9-]+)"/gi, 'href="#$1-' + nr + '"');
    var el = lav('div', 'mk-kh-logo');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = html; // ⚠️ vores egen skabelon, ikke ejerens tekst
    return el;
  }

  function linjeFor(y, a) {
    var v = y.v;
    var linje = lav('div', 'mk-linje');
    linje.setAttribute('data-vare', v.navn);
    var txt = lav('div', 'mk-txt');
    txt.appendChild(lav('h4', null, v.navn));
    if (v.beskrivelse) txt.appendChild(lav('p', null, v.beskrivelse));
    linje.appendChild(txt);
    if (v.udsolgt) {
      linje.classList.add('mk-udsolgt');
      linje.appendChild(lav('span', 'mk-pris mk-udsolgt-maerke', 'Udsolgt i dag'));
    } else if (a.tabel === 'stor') {
      var grund = varePrisTal(v);
      linje.appendChild(prisMærke(v.pris));
      var stor = harValg(v, 'Stor') && grund !== null ? grund + Butik.valgTillaeg(v, 'Stor') : null;
      linje.appendChild(stor !== null ? prisMærke(stor) : lav('span', 'mk-pris mk-streg', '–'));
    } else if (!a.skjulPris) {
      linje.appendChild(prisMærke(v.pris));
    }
    if (String(v.beskrivelse || '').trim()) {
      linje.classList.add('mk-kan-aabnes');
      linje.setAttribute('role', 'button');
      linje.tabIndex = 0;
      linje.setAttribute('aria-haspopup', 'dialog');
      var mere = lav('span', 'mk-mere', '›');
      mere.setAttribute('aria-hidden', 'true');
      linje.appendChild(mere);
      var foto = fotoFor(y.k);
      linje.addEventListener('click', function () { visVare(v, y.k, foto); });
      linje.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); visVare(v, y.k, foto); }
      });
    }
    return linje;
  }

  var brugteKatId = {};
  function tegnAfsnit(a, grupper) {
    var d = a.def;
    var henvis = (d.henvis || []);
    /* ⚠️ HENVISNINGER ALENE ER INTET AFSNIT. Et kapitel med kun "Se
       smørrebrødskortet" og en boks er et tomt kapitel med pynt (set i
       prøven 26/9: "Grillen" uden en eneste vare). */
    if (!a.varer.length) return null;
    var sek = lav('section', 'panel mk-sek');
    var førsteKat = a.varer[0] ? a.varer[0].k : null;
    sek.setAttribute('data-kategori', førsteKat ? førsteKat.navn : d.titel);
    if (førsteKat && !brugteKatId[førsteKat.id]) {
      brugteKatId[førsteKat.id] = true;
      sek.id = 'kat-' + førsteKat.id;
    }
    var h = lav('h3', 'mk-sek-titel');
    h.appendChild(lav('span', 'mk-ruder'));
    h.appendChild(lav('span', 'mk-sek-navn', d.titel));
    h.appendChild(lav('span', 'mk-streger'));
    sek.appendChild(h);
    if (førsteKat && førsteKat.note && a.varer.every(function (y) { return y.k === førsteKat; })) {
      sek.appendChild(lav('p', 'mk-note', førsteKat.note));
    }

    var liste = lav('div', 'mk-liste' + (d.kolonner === 2 ? ' mk-to' : ''));
    if (d.tabel === 'stor') {
      var hoved = lav('div', 'mk-tabel-hoved');
      hoved.setAttribute('aria-hidden', 'true');
      hoved.appendChild(lav('span', null, 'Lille'));
      hoved.appendChild(lav('span', null, 'Stor'));
      sek.appendChild(hoved);
      sek.classList.add('mk-tabel');
    }
    var skjulPris = d.udenPris && ensPris(a.varer) !== null;
    var visning = { tabel: d.tabel, skjulPris: skjulPris };

    if (d.samle && a.varer.length > 1) {
      /* Kortets ÉN linje: "Æg · bacon · pålæg … 10,-".
         ⚠️ SKILT MED " · ", IKKE KOMMA: "Bacon, 2 skiver" er ÉT navn, og
         med komma mellem varerne læses det som to (set i kontrollen 26/9). */
      var linje = lav('div', 'mk-linje mk-samlet');
      var navne = a.varer.map(function (y) { return y.v.navn; });
      linje.setAttribute('data-vare', navne.join(' · '));
      var txt = lav('div', 'mk-txt');
      txt.appendChild(lav('h4', null, navne.join(' · ')));
      linje.appendChild(txt);
      var ens = ensPris(a.varer);
      var laveste = a.varer.map(function (y) { return varePrisTal(y.v); })
        .filter(function (n) { return n !== null; }).sort(function (x, z) { return x - z; })[0];
      linje.appendChild(ens !== null ? prisMærke(ens)
        : (laveste ? lav('span', 'mk-pris', 'fra ' + Butik.varePris(laveste)) : prisMærke(null)));
      liste.appendChild(linje);
    } else {
      a.varer.forEach(function (y) { liste.appendChild(linjeFor(y, visning)); });
    }
    henvis.forEach(function (hv) {
      var p = ensPris(katVarer(grupper, hv.navn));
      var l = lav('a', 'mk-linje mk-henvis');
      l.href = '#kapitel-' + hv.til;
      var t = lav('div', 'mk-txt');
      t.appendChild(lav('h4', null, hv.navn));
      t.appendChild(lav('p', null, hv.note));
      l.appendChild(t);
      if (p !== null) l.appendChild(prisMærke(p));
      l.addEventListener('click', function (e) {
        var mål = $('kapitel-' + hv.til);
        if (!mål) return;
        e.preventDefault();
        mål.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      liste.appendChild(l);
    });
    sek.appendChild(liste);
    return sek;
  }

  /* Boksene med den ternede kant. Prisen er ALTID regnet ud af
     databasen — findes varen ikke, står boksen uden pris. */
  function boksPris(p, grupper) {
    if (!p) return null;
    if (p.ens) return ensPris(katVarer(grupper, p.ens));
    var v = findVare(grupper, p.vare);
    return v && !v.udsolgt ? varePrisTal(v) : null;
  }
  function boksFelt(f, grupper) {
    var felt = lav('div', 'mk-boks-felt');
    if (f.over) felt.appendChild(lav('span', 'mk-boks-over', f.over));
    felt.appendChild(lav('h4', 'mk-boks-titel', f.titel));
    var p = boksPris(f.pris, grupper);
    if (p !== null) felt.appendChild(lav('span', 'mk-boks-pris', (f.pris.plus ? '+' : '') + Butik.varePris(p)));
    if (f.tekst) felt.appendChild(lav('p', 'mk-boks-tekst', f.tekst));
    if (f.bund) felt.appendChild(lav('span', 'mk-boks-bund', f.bund));
    return felt;
  }
  function tegnBoks(d, grupper) {
    if (d.vaffel) {
      /* "Alle kugler og al softice kan fås i glutenfri vaffel — samme
         pris som almindelig vaffel." Kun hvis valget findes, og
         prisen er valgets eget tillæg. */
      var med = [];
      grupper.forEach(function (g) { g.varer.forEach(function (v) { if (harValg(v, 'Glutenfri vaffel')) med.push(v); }); });
      if (!med.length) return null;
      var t = med.map(function (v) { return Butik.valgTillaeg(v, 'Glutenfri vaffel'); })
        .sort(function (x, z) { return z - x; })[0];
      d = { over: d.over, titel: d.titel, tekst: 'Alle kugler og al softice kan fås i glutenfri vaffel — '
        + (t > 0 ? '+' + Butik.varePris(t) + ' pr. vaffel.' : 'samme pris som almindelig vaffel.') };
    }
    var boks = lav('div', 'mk-boks' + (d.boks === 'raekke' ? ' mk-boks-raekke' : ''));
    (d.felter || [d]).forEach(function (f) { boks.appendChild(boksFelt(f, grupper)); });
    return boks;
  }

  function tegnKapitel(c, grupper) {
    var d = c.def;
    var krop = lav('div', 'mk-kb' + (c.spalter.hel ? ' mk-kb-hel' : ''));
    var noget = false;
    ['venstre', 'hoejre', 'hel'].forEach(function (s) {
      if (!c.spalter[s]) return;
      var spalte = lav('div', 'mk-spalte mk-' + s);
      c.spalter[s].forEach(function (a) {
        var el = a.def.boks || a.def.vaffel ? tegnBoks(a.def, grupper) : tegnAfsnit(a, grupper);
        if (el) { spalte.appendChild(el); if (!a.def.boks) noget = true; }
      });
      if (spalte.firstChild) krop.appendChild(spalte);
    });
    if (!noget) return null;

    var art = lav('article', 'mk-kapitel');
    art.id = d.anker || ('kapitel-' + d.id);
    art.setAttribute('data-kapitel', d.id);
    art.setAttribute('data-hop-navn', d.hop || d.titel.join(' '));
    if (d.anker) {
      /* Kapitlet har både sit eget navn og forsidens (#afsnit-is). */
      var mærke = lav('span', 'mk-anker');
      mærke.id = 'kapitel-' + d.id;
      art.appendChild(mærke);
    }

    var kh = lav('header', 'mk-kh' + (d.slogan ? ' mk-kh-kort' : ''));
    if (d.over) {
      var o = lav('div', 'mk-kh-over');
      o.appendChild(lav('span', null, d.over));
      o.appendChild(lav('i'));
      kh.appendChild(o);
    }
    var h2 = lav('h2', 'mk-kh-titel');
    /* Den længste linjes tegn: overskriften skaleres, så ordet står
       på én linje ved siden af logoet — "SMØRREBRØD" må aldrig
       knække midt i ordet (menukort-kort.css). */
    h2.style.setProperty('--tegn', Math.max.apply(null, d.titel.map(function (t) { return t.length; })));
    d.titel.forEach(function (t, i) {
      if (i) h2.appendChild(document.createElement('br'));
      h2.appendChild(document.createTextNode(t));
    });
    if (d.slogan) h2.appendChild(lav('em', 'mk-kh-slogan', d.slogan));
    kh.appendChild(h2);
    if (d.under) kh.appendChild(lav('p', 'mk-kh-under', d.under));
    if (d.tekst) kh.appendChild(lav('p', 'mk-kh-tekst', d.tekst));
    var lg = logo();
    if (lg) kh.appendChild(lg);
    art.appendChild(kh);
    var kant = lav('div', 'mk-kant');
    kant.setAttribute('aria-hidden', 'true');
    art.appendChild(kant);

    /* Fotoerne står SKARPT og for sig selv — ikke sløret bag teksten.
       De er kategoriernes egne (FOTOS ovenfor), så et kapitel med
       burgere viser burgeren. Pynt: alt="" og aria-hidden. */
    var fotos = [];
    Object.keys(c.spalter).forEach(function (s) {
      c.spalter[s].forEach(function (a) {
        a.varer.forEach(function (y) {
          var f = fotoFor(y.k);
          if (f && fotos.indexOf(f) === -1) fotos.push(f);
        });
      });
    });
    if (fotos.length) {
      var rk = lav('div', 'mk-fotos mk-fotos-' + Math.min(fotos.length, 3));
      rk.setAttribute('aria-hidden', 'true');
      fotos.slice(0, 3).forEach(function (f) {
        var fig = lav('div', 'mk-foto');
        var img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = f;
        img.addEventListener('load', function () { fig.classList.add('klar'); }, { once: true });
        fig.appendChild(img);
        rk.appendChild(fig);
      });
      art.appendChild(rk);
    }
    art.appendChild(krop);
    var bund = lav('div', 'mk-bund');
    bund.setAttribute('aria-hidden', 'true');
    art.appendChild(bund);
    return art;
  }

  function visSortiment(d) {
    dataNu = d;
    var boks = $('mk-kat');
    var afsnit = $('mk-kat-afsnit');
    var tom = $('mk-tom');
    if (!boks) return;

    var grupper = Butik.menu(d);
    tøm(boks);
    brugteKatId = {};
    logoNr = 0;

    if (!grupper.length) {
      if (tom) tom.style.display = '';
      return;
    }
    if (tom) skjul(tom);
    if (afsnit) afsnit.style.display = '';

    var kapitler = fordel(grupper);
    placeret = {};
    kapitler.forEach(function (c) {
      Object.keys(c.spalter).forEach(function (sp) {
        c.spalter[sp].forEach(function (a) {
          a.varer.forEach(function (y) {
            if (norm(y.k.navn) !== norm(a.def.titel) && !(a.def.kilder || []).some(function (kl) {
              return !kl.navne && norm(kl.kat) === norm(y.k.navn);
            })) return;
            (placeret[norm(y.k.navn)] = placeret[norm(y.k.navn)] || []).push(y.v);
          });
        });
      });
    });
    kapitler.forEach(function (c) {
      var el = tegnKapitel(c, grupper);
      if (el) boks.appendChild(el);
    });

    /* En henvisning ("Se smørrebrødskortet") til et kapitel, der ikke
       blev tegnet, er et link til ingenting — den tages væk. */
    Array.prototype.forEach.call(boks.querySelectorAll('a.mk-henvis'), function (l) {
      if (!document.getElementById(String(l.getAttribute('href')).replace('#', ''))) {
        l.parentNode.removeChild(l);
      }
    });

    visHop();
    hopTilHash();
  }

  /* ============================================================
     ET LINK MED #afsnit-is SKAL FAKTISK LANDE DER  (21/9)
     ------------------------------------------------------------
     Forsiden har fået "Se hele is-menukortet →", der peger på
     m-menukort.html#afsnit-is.

     ⚠️ OG CHROMIUM KLARER DET FAKTISK SELV — MÅLT 21/9.
     Her stod først "browseren når det ikke selv". Det er FORKERT.
     Falsificeringen afslørede det: prøven bestod uændret, da jeg
     fjernede kaldet. Målt med og uden, samme tal begge gange —
     scrollTop 1277, overskriften 272 px fra toppen. Chromium
     prøver hoppet igen, når elementet dukker op.

     ⚠️ SÅ HVORFOR STÅR DEN HER? Fordi jeg IKKE kunne måle Safari:
     WebKit er ikke installeret på maskinen, og gæsterne er på
     iPhone. Deferred fragment-navigation til et element, der
     tilføjes sent — og inde i en scroll-beholder med
     scroll-behavior: smooth — er historisk det mest ustabile
     hjørne i netop WebKit.

     Det er altså en sele, ikke en motor. Koster fire linjer, som
     ikke gør noget i Chromium, og redder linket, hvis Safari
     opfører sig som før. Kan nogen måle Safari og vise, at den
     også klarer det, må den gerne ryge.

     ⚠️ OG DEN RULLER IKKE, HVIS GÆSTEN ALLEREDE ER I GANG.
     Optegningen kaldes igen, hver gang data kommer ind på ny. Et
     hop midt i, at nogen læser, ville rykke siden væk under
     fingeren — derfor kun én gang pr. sidevisning.
     ============================================================ */
  var hoppet = false;

  function hopTilHash() {
    if (hoppet) return;
    var id = String(location.hash || '').replace(/^#/, '');
    if (!id) return;
    var maal = document.getElementById(id);
    if (!maal) return;
    hoppet = true;
    /* Lidt luft over overskriften, så den ikke klistrer til
       toppen af skærmen under den faste bjælke. */
    try {
      maal.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      maal.scrollIntoView();
    }
  }

  /* ---- HOP TIL (26/9: ét punkt pr. KORT) ----
     Glasbjælken med de trykte korts navne — "Grillen", "Is & sødt"
     … Den bygges af de kapitler, der FAKTISK står på siden; en knap
     til et kapitel, der ikke blev tegnet, er en genvej til ingenting.

     ⚠️ LINSEN GLIDER. Markeringen er ét element (.mk-linse), der
     flytter sig hen under den knap, man er ved — ikke en farve, der
     blinker fra knap til knap. Kun transform og bredde animeres. */
  function visHop() {
    var bånd = $('mk-hop');
    if (!bånd) return;
    tøm(bånd);

    var kap = Array.prototype.slice.call(document.querySelectorAll('#mk-kat .mk-kapitel'));
    if (kap.length < 2) return skjul(bånd);
    bånd.style.display = '';

    var linse = lav('span', 'mk-linse');
    linse.setAttribute('aria-hidden', 'true');
    bånd.appendChild(linse);

    var knapper = {};
    kap.forEach(function (k) {
      var knap = lav('button', null, k.getAttribute('data-hop-navn'));
      knap.type = 'button';
      knap.setAttribute('data-hop', k.getAttribute('data-hop-navn'));
      knap.addEventListener('click', function () {
        k.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      knapper[k.id] = knap;
      bånd.appendChild(knap);
    });

    function marker(id) {
      Object.keys(knapper).forEach(function (kid) {
        var på = kid === id;
        knapper[kid].classList.toggle('on', på);
        if (!på) return;
        var b = knapper[kid];
        linse.style.width = b.offsetWidth + 'px';
        linse.style.height = b.offsetHeight + 'px';
        linse.style.transform = 'translate(' + b.offsetLeft + 'px,' + b.offsetTop + 'px)';
        linse.classList.add('vis');
        if (bånd.scrollWidth > bånd.clientWidth) {
          bånd.scrollTo({ left: Math.max(0, b.offsetLeft - 60), behavior: 'smooth' });
        } else if (bånd.scrollHeight > bånd.clientHeight) {
          bånd.scrollTo({ top: Math.max(0, b.offsetTop - bånd.clientHeight / 2), behavior: 'smooth' });
        }
      });
    }
    marker(kap[0].id);

    if (!window.IntersectionObserver) return;
    var spejder = new IntersectionObserver(function (poster) {
      poster.forEach(function (p) { if (p.isIntersecting) marker(p.target.id); });
      /* ⚠️ RULLEROD'EN SKIFTER PAA EN TELEFON (5/9). Under 820 px
         er #sc ikke en rullebeholder — dokumentet ruller. Svaret
         står i havnegrillen.js (ioRod); det slås op, ikke gættes. */
    }, { root: (typeof ioRod !== 'undefined' ? ioRod : $('sc')), rootMargin: '-124px 0px -65% 0px' });
    kap.forEach(function (k) { spejder.observe(k); });
  }

  /* ⚠️ SVARER DATABASEN IKKE, VISES INGEN PRISER  (25/9, aften).
     MÅLT i en browser: uden forbindelse stod kortet på kodens
     reservedata — "Smørrebrød 55,-", "Håndmad 24,-", "Softice, stor
     45,-" (den rigtige pris er 47) — og beskeden nedenunder kom aldrig
     frem, fordi listen jo ikke var tom. Mikkels ord: "Hvis databasen
     ikke svarer, må hjemmesiden aldrig vise forældede reservepriser.
     Vis i stedet en tydelig fejlbesked med caféens telefonnummer."
     Dagens ret og ugen skjules også: reservedataene ved intet om dem,
     og "Følger snart" ville være en påstand. Reglen for, HVORNÅR tallene
     er kodens egne, bor i Butik.reservedata — ét sted for hele huset. */
  function visNede() {
    ['mk-idag-afsnit', 'mk-uge-afsnit'].forEach(function (id) { skjul($(id)); });
    var sortiment = document.querySelector('#mk-kat-afsnit .mk-sortiment');
    skjul(sortiment);
    tøm($('mk-kat'));
    var tom = $('mk-tom');
    if (tom) {
      tom.className = 'nede-note';
      tom.setAttribute('role', 'status');
      tom.style.display = '';
    }
  }

  Butik.hent().then(function (d) {
    if (Butik.reservedata && Butik.reservedata(d)) { visNede(); return; }
    visIDag(d);
    visUgen(d);
    visSortiment(d);

    /* De nye kort er lavet EFTER, at designets indfald har kigget
       på siden — de står med opacity 0, til nogen ser dem. Uden
       det her ville hele menukortet være usynligt, til gæsten
       tilfældigvis rullede. */
    if (typeof io !== 'undefined' && io) {
      document.querySelectorAll('.rev:not(.in)').forEach(function (el) { io.observe(el); });
    }
    if (typeof revealFallback === 'function') revealFallback($('sc'));
  }).catch(function (fejl) {
    console.warn('Menukortets kobling fejlede:', fejl);
    visNede();
  });
}());
