/* ============================================================
   SMØRREBRØD UD AF HUSET – salgs- og søgesiden

   Siden gør to ting: den skal kunne findes på "smørrebrød ud af
   huset i Greve", og den skal gøre det tydeligt nok, at man
   trykker videre til bestil/.

   ------------------------------------------------------------
   SIDEN VAR FORMULAREN INDTIL NU
   ------------------------------------------------------------
   Og det var rigtigt dengang: den var det ene sted, man kunne
   bestille noget. Så kom model A, og køkkenet kunne også tage imod
   grill og café — og en adresse, der siger smørrebrød, passede
   ikke længere til det, der stod på skærmen. Formularen flyttede
   til bestil/, og den her side fik sit gamle job tilbage.

   Derfor står sortimentet igen på siden. Det er ikke en gentagelse
   længere: formularen er et andet sted, og det, man læser her, er
   det, man kommer efter, når man søger.

   ALT KOMMER FRA MENUKORTET I DATABASEN. Sætter personalet en
   slags udsolgt, forsvinder den herfra af sig selv. Der står ikke
   ét tal og ikke ét varenavn skrevet i hånden.
   ============================================================ */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function tøm(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function lav(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = String(tekst);
    return e;
  }

  function visNote(d) {
    var n = (d.indstillinger && d.indstillinger.menu_note) || '';
    var el = $('smoer-note');
    if (!el) return;
    if (n) { el.textContent = n; el.classList.remove('skjult'); }
    else el.classList.add('skjult');
  }

  /* ----------------------------------------------------------
     DE TO TAL I SIDENS HOVED
     ----------------------------------------------------------
     "5 slags stykker · 29 slags fyld". Begge TÆLLES af
     Butik.smoerrebroed ud fra menukortet i databasen, så de ikke kan
     blive forældede. Sætter personalet en slags udsolgt, falder
     tallet af sig selv — og der kan ikke komme til at stå "29 slags"
     den dag der er 27.

     Det er dem der fanger. "Stort udvalg" er en påstand man ikke kan
     efterprøve; 29 er et tal.

     Blokken er hidden indtil der ER tal. Et "0 slags" i det halve
     sekund databasen svarer i, er værre end ingenting — og kan
     kortet slet ikke hentes, bliver den skjult, for så ved vi det
     ikke.
     ---------------------------------------------------------- */
  function visTal(d) {
    var boks = $('smoer-tal');
    if (!boks) return;

    var s = Butik.smoerrebroed(d);
    if (!s.stykker.length && !s.fyld.length) {
      boks.hidden = true;
      return;
    }
    $('smoer-tal-stykker').textContent = String(s.stykker.length);
    $('smoer-tal-fyld').textContent = String(s.fyld.length);
    boks.hidden = false;
  }

  /* ----------------------------------------------------------
     STYKKERNE, MED PRIS
     ----------------------------------------------------------
     Prisen står, fordi den er det, gæsten leder efter, og fordi
     den findes: stykkerne har priser i menukortet. Har en vare
     ingen pris, står den ikke her — en tom prislinje ligner en
     fejl, og et gæt ville være værre.
     ---------------------------------------------------------- */
  function visStykkerne(d) {
    var boks = $('smoer-stykker-liste');
    if (!boks) return;
    tøm(boks);

    var s = Butik.smoerrebroed(d);
    /* De udsolgte kommer MED, og de kommer sidst. En vare, der
       bare forsvinder, ligner en vare, der ikke findes — og så
       spørger ingen efter den i morgen. */
    var alle = s.stykker.concat(s.udsolgt.stykker);
    if (!alle.length) {
      /* Kan kortet ikke hentes, siges det højt. En tom liste
         ligner et sted, hvor der plejede at stå noget. */
      boks.appendChild(lav('li', 'desc',
        'Vi kan ikke vise kortet lige nu — ring, så fortæller vi, hvad vi har.'));
      return;
    }

    /* Samme klasser som forsidens liste, med vilje. To sider i
       samme forretning skal vise den samme vare på den samme
       måde — og prisformatet kommer fra window.MosedePris, så
       "89,-" ikke bliver til "89 kr." på den ene af dem. */
    alle.forEach(function (v) {
      var li = lav('li', 'smoer-raekke');
      var navn = lav('span', 'smoer-navn', v.navn);
      if (v.beskrivelse) navn.appendChild(lav('span', 'smoer-desc', v.beskrivelse));
      li.appendChild(navn);

      /* Udsolgt vises, ikke skjules. En vare, der forsvinder,
         ligner en vare, der ikke findes — og så spørger ingen
         efter den i morgen. */
      if (v.udsolgt) {
        li.appendChild(lav('span', 'maerke udsolgt', 'Udsolgt i dag'));
      } else {
        var pris = window.MosedePris ? window.MosedePris(v.pris) : '';
        if (pris) li.appendChild(lav('span', 'smoer-pris', pris));
      }
      boks.appendChild(li);
    });
  }

  /* ----------------------------------------------------------
     FYLDET
     ----------------------------------------------------------
     Antallet TÆLLES og skrives ikke. "29 slags" er et rigtigt tal
     om et rigtigt udvalg — og det kan ikke blive forældet den dag,
     der kommer en slags til.
     ---------------------------------------------------------- */
  function visFyldet(d) {
    var boks = $('smoer-fyld-liste');
    var under = $('smoer-fyld-under');
    if (!boks) return;
    tøm(boks);

    var s = Butik.smoerrebroed(d);
    var kan = s.fyld.filter(function (v) { return !v.udsolgt; });

    if (under) {
      under.textContent = kan.length
        ? 'Der er ' + kan.length + ' slags at vælge imellem. '
          + 'Vælger du ikke selv, sammensætter vi et blandet udvalg.'
        : '';
    }
    if (!kan.length) return;

    kan.forEach(function (v) {
      boks.appendChild(lav('span', 'chip', v.navn));
    });
  }

  function visStatus(d) {
    var s = Butik.status(d);
    var pille = $('smoer-status');
    var tekst = $('smoer-status-tekst');
    if (!pille || !tekst) return;
    // Én linje, samme forkortelse som forsiden og menukortet
    tekst.textContent = Butik.pilleTekst(s);
    var prik = pille.querySelector('.dot');
    if (prik) prik.classList.toggle('lukket', !s.aaben);
  }

  function visOplysninger() {
    var m = window.MOSEDE;
    if (!m) return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-tel]'), function (a) {
      a.href = 'tel:' + m.telefon;
      if (a.hasAttribute('data-tel-tekst')) a.textContent = m.telefonPent;
    });
    var ad = $('smoer-adresse');
    if (ad) ad.textContent = m.fuldAdresse();
  }

  visOplysninger();

  Butik.hent().then(function (d) {
    visStatus(d);
    visNote(d);
    visTal(d);
    visStykkerne(d);
    visFyldet(d);
  }).catch(function (fejl) {
    /* Kan menukortet ikke hentes, siges det HVOR det mangler —
       ikke som en advarsel i toppen af siden. Listen bliver
       tegnet med sin egen besked af visStykkerne(); her rettes
       kun pillen, som ellers ville blive stående på "Henter
       åbningstider…" for evigt. */
    var liste = $('smoer-stykker-liste');
    if (liste && !liste.firstChild) {
      liste.appendChild(lav('li', 'desc',
        'Vi kan ikke vise kortet lige nu — ring, så fortæller vi, hvad vi har.'));
    }

    var pille = $('smoer-status-tekst');
    if (pille) pille.textContent = 'Ring og hør om vi har åbent';

    if (window.console) console.warn('smørrebrødet kunne ikke hentes:', fejl);
  });
})();
