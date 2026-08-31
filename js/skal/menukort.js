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
  function kroner(p) {
    if (p === null || p === undefined || p === '') return '';
    var n = Number(p);
    if (!isFinite(n)) return '';
    return (n % 1 === 0 ? String(n) : n.toFixed(2).replace('.', ',')) + ',-';
  }

  function prisMærke(p) {
    var t = kroner(p);
    return t ? lav('span', 'mk-pris', t) : lav('span', 'mk-pris mk-spoerg', 'spørg');
  }

  function isoPlus(iso, dage) {
    // Middag i UTC: så flytter et døgn ikke datoen ved sommertid
    var t = new Date(iso + 'T12:00:00Z');
    t.setUTCDate(t.getUTCDate() + dage);
    return t.toISOString().slice(0, 10);
  }

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

    var kort = function (t) {
      var v = Butik.pænTid(t);
      return v.slice(3) === '00' ? v.slice(0, 2).replace(/^0/, '') : v.replace(':', '.');
    };
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
         bestilling, ikke af et menneske. Se dagens-retter.sql. */
      if (!ret.udsolgt && ret.antal_tilbage !== null
          && ret.antal_tilbage !== undefined && ret.antal_tilbage <= 5) {
        txt.appendChild(lav('span', 'mk-faa',
          'Kun ' + ret.antal_tilbage + ' tilbage'));
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

    for (var i = 0; i < 7; i++) {
      var iso = isoPlus(i_dag, i);
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
        højre.appendChild(lav('span', 'mk-tom',
          'Ingen dagens ret i dag — menukortet gælder'));
      } else {
        højre.appendChild(lav('span', 'mk-tom', 'Følger snart…'));
      }
      række.appendChild(højre);
      boks.appendChild(række);
    }
  }

  // ----------------------------------------------------------
  //  3) SORTIMENTET
  // ----------------------------------------------------------
  function visSortiment(d) {
    var boks = $('mk-kat');
    var afsnit = $('mk-kat-afsnit');
    var tom = $('mk-tom');
    if (!boks) return;

    var grupper = Butik.menu(d);
    tøm(boks);

    if (!grupper.length) {
      /* Ikke en tom side: en linje, der siger hvorfor, og et
         nummer, der virker. */
      if (tom) tom.style.display = '';
      return;
    }
    if (tom) skjul(tom);
    if (afsnit) afsnit.style.display = '';

    grupper.forEach(function (g) {
      /* Udsolgte varer står ikke på kortet. Et kort, der tilbyder
         noget, køkkenet ikke har, er værre end et kort med én ret
         mindre — og der er ingen udsolgt-tilstand i designet. */
      var varer = g.varer.filter(function (v) { return !v.udsolgt; });
      if (!varer.length) return;

      var kort = lav('div', 'panel');
      kort.setAttribute('data-kategori', g.kategori.navn);

      kort.id = 'kat-' + g.kategori.id;

      var hoved = lav('div', 'mk-hoved');
      var tegn = lav('div', 'mk-tegn mk-' + (g.kategori.afdeling || 'mad'),
        emojiFor(g.kategori));
      tegn.setAttribute('aria-hidden', 'true');
      hoved.appendChild(tegn);
      hoved.appendChild(lav('h3', null, g.kategori.navn));
      /* Antallet ude til højre: en lang side bliver til en liste,
         man kan overskue, når man kan se hvor meget der er i hver
         kasse, før man ruller ned i den. */
      hoved.appendChild(lav('span', 'mk-antal',
        varer.length + (varer.length === 1 ? ' vare' : ' varer')));
      kort.appendChild(hoved);

      /* Noten hører til HELE kategorien — "På toastbrød eller
         rugbrød" gælder alle tolv slags pindemad. Skrevet på hver
         linje ville den fylde tolv gange og sige det samme. */
      if (g.kategori.note) kort.appendChild(lav('p', 'mk-note', g.kategori.note));

      var liste = lav('div', 'mk-liste');
      varer.forEach(function (v) {
        var linje = lav('div', 'mk-linje');
        linje.setAttribute('data-vare', v.navn);
        var txt = lav('div', 'mk-txt');
        txt.appendChild(lav('h4', null, v.navn));
        if (v.beskrivelse) txt.appendChild(lav('p', null, v.beskrivelse));
        linje.appendChild(txt);
        linje.appendChild(prisMærke(v.pris));
        liste.appendChild(linje);
      });
      kort.appendChild(liste);
      boks.appendChild(kort);
    });

    visHop(grupper);
  }

  /* ---- HOP TIL ----
     Båndet bygges af de kategorier, der FAKTISK står på siden —
     ikke af listen fra databasen. En chip, der peger på et kort,
     der blev sorteret fra (alt udsolgt), er en genvej til
     ingenting. */
  function visHop(grupper) {
    var bånd = $('mk-hop');
    if (!bånd) return;
    tøm(bånd);

    var kort = Array.prototype.slice.call(document.querySelectorAll('#mk-kat .panel'));
    if (kort.length < 2) return skjul(bånd);

    var chips = {};
    kort.forEach(function (k) {
      var g = grupper.filter(function (x) { return 'kat-' + x.kategori.id === k.id; })[0];
      if (!g) return;
      var chip = lav('button', null, emojiFor(g.kategori) + '  ' + g.kategori.navn);
      chip.type = 'button';
      chip.setAttribute('data-hop', g.kategori.navn);
      chip.addEventListener('click', function () {
        k.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      chips[k.id] = chip;
      bånd.appendChild(chip);
    });

    /* Den kategori, man kigger på, markerer sig selv — og ruller
       sig selv frem i båndet. Ellers kan man stå i "Øl" og se en
       stribe, hvor "Morgenmad" er markeret ude til venstre. */
    if (!window.IntersectionObserver) return;
    var spejder = new IntersectionObserver(function (poster) {
      poster.forEach(function (p) {
        if (!p.isIntersecting) return;
        Object.keys(chips).forEach(function (id) {
          var på = id === p.target.id;
          chips[id].classList.toggle('on', på);
          if (på && chips[id].scrollIntoView) {
            bånd.scrollTo({ left: Math.max(0, chips[id].offsetLeft - 70), behavior: 'smooth' });
          }
        });
      });
    }, { root: $('sc'), rootMargin: '-124px 0px -70% 0px' });
    kort.forEach(function (k) { spejder.observe(k); });
  }

  Butik.hent().then(function (d) {
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
    var tom = $('mk-tom');
    if (tom) tom.style.display = '';
  });
}());
