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

  /* Tegnet kommer fra AFDELINGEN, ikke fra kategorinavnet. Ejeren
     sætter mad/is/drikke i admin, og de tre er sande. Fjorten
     gættede tegn ud fra ordene i et navn ville være pænere og
     forkerte — "Til selskabet" ville få et gæt. */
  var TEGN = {
    mad: '<path d="M4 16h16M6 16c0-3.6 2.7-6.4 6-6.4s6 2.8 6 6.4M12 9.6V7M3 19.5h18"/>',
    is: '<path d="M8.5 11h7l-3.5 9zM9 5.5a3 3 0 016 0 3 3 0 01-1 2.2H10a3 3 0 01-1-2.2z"/><path d="M10 15h4"/>',
    drikke: '<path d="M6 4h12l-1 5a5 5 0 01-10 0zM12 14v6M8.5 20h7"/>',
  };

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

    var ret = (d.indstillinger || {}).dagens_ret || {};
    if (!ret.navn) return skjul(afsnit);

    var i_dag = Butik.nu().dato;
    tøm(kort);

    var top = lav('div', 'mk-top');
    top.appendChild(lav('h3', null, 'I dag'));
    top.appendChild(lav('span', 'mk-naar',
      datoTekst(i_dag) + ' · ' + åbentTekst(d, i_dag)));
    kort.appendChild(top);

    var række = lav('div', 'mk-ret');
    var txt = lav('div', 'mk-txt');
    txt.appendChild(lav('h4', null, ret.navn));
    txt.appendChild(lav('span', 'tag', 'Dagens ret'));
    if (ret.beskrivelse) txt.appendChild(lav('p', null, ret.beskrivelse));
    række.appendChild(txt);
    række.appendChild(prisMærke(ret.pris));
    kort.appendChild(række);
  }

  // ----------------------------------------------------------
  //  2) UGEN DER KOMMER
  //  ----------------------------------------------------------
  //  I dag er den eneste dag, forretningen har et felt til i
  //  admin. Resten står som "Følger snart…" — og det er sandt:
  //  ugeplanen har ingen tabel endnu. En opdigtet ret på torsdag
  //  ville være et løfte, køkkenet ikke har givet.
  // ----------------------------------------------------------
  function visUgen(d) {
    var boks = $('mk-uge');
    if (!boks) return;

    var i_dag = Butik.nu().dato;
    var ret = (d.indstillinger || {}).dagens_ret || {};
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
      if (i === 0 && ret.navn) {
        højre.appendChild(lav('h4', null, ret.navn));
        if (ret.beskrivelse) højre.appendChild(lav('p', null, ret.beskrivelse));
        var p = kroner(ret.pris);
        if (p) højre.appendChild(lav('span', 'mk-pris', p));
      } else if (Butik.lukketDen(d, iso)) {
        højre.appendChild(lav('span', 'mk-tom', 'Lukket'));
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

      var hoved = lav('div', 'mk-hoved');
      var tegn = lav('div', 'mk-tegn');
      tegn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
        + (TEGN[g.kategori.afdeling] || TEGN.mad) + '</svg>';
      hoved.appendChild(tegn);
      hoved.appendChild(lav('h3', null, g.kategori.navn));
      kort.appendChild(hoved);

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
