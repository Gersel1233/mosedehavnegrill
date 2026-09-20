/* ============================================================
   ADRESSEFELTET — OFFICIELLE DANSKE ADRESSER  (20. sep 2026)
   ------------------------------------------------------------
   Indtil i dag skrev gæsten sin adresse i fri tekst, og siden
   kiggede efter det første firecifrede tal. "Aalborgvej 5, 2670"
   gik igennem, og køkkenet fik en adresse, ingen havde set på.

   Nu foreslår feltet officielle adresser fra Dataforsyningen, og
   gæsten skal VÆLGE en af dem. Valget sendes til serveren, som
   slår adressen op igen og udsteder en kvittering. Bestillingen
   bærer kvitteringen; databasen kræver den.

   ⚠️ DET HER FELT ER HØFLIGHED, IKKE SIKKERHED. Alt, der står
      herinde, kan pilles fra hinanden i en browser. Den rigtige
      afgørelse ligger i supabase/levering-valideret.sql, som
      OVERSKRIVER adressen med den, serveren bekræftede. Feltet
      findes, for at gæsten kan se svaret, FØR hun binder sig —
      ikke for at holde nogen ude.

   ⚠️ TO TILSTANDE, IKKE ÉN. `tekst` er det, gæsten har skrevet.
      `valgt` er den officielle adresse, hun har peget på. Retter
      hun ét tegn bagefter, nulstilles `valgt` med det samme — og
      så kan der ikke bestilles, før hun vælger igen. Uden det
      kunne man vælge "Greve Strandvej 10" og rette tallet til
      1000 bagefter.

   ⚠️ INGEN AUTOMATISK ACCEPT. Er der kun ét forslag, vælges det
      ikke af sig selv. Gæsten skal pege. Et forkert valg, hun
      aldrig foretog, er en levering til den forkerte dør.

   ⚠️ ET GAMMELT SVAR MÅ IKKE OVERHALE ET NYT. Skriver hun "Mose"
      og så "Mosede", kan det første svar nå frem sidst. Hver
      søgning får et nummer, og kun det nyeste tegnes.

   MÅLT MOD DET LEVENDE API 20/9 2026:
     · CORS: access-control-allow-origin: * — browseren må kalde
     · fuzzy=  retter stavefejl: "Havnvej 20 Greve" → Havnevej
       (uden fuzzy: nul forslag)
     · svaret er [{ tekst, adresse: { id, … } }]
   ============================================================ */
(function () {
  'use strict';

  var DAWA = 'https://api.dataforsyningen.dk/adresser/autocomplete';
  var MINDST_TEGN = 3;      // under det er hver søgning støj
  var VENT_MS = 300;        // debounce
  var HOEJST = 6;           // forslag ad gangen

  /* Husets egne ord. ⚠️ 'spoerg'-sætningen er ORDRET den samme som
     i js/bestilling.js og js/skal/bestil.js — to formuleringer af
     den samme regel ville læses som to regler. */
  var ORD = {
    vaelg: 'Vælg din adresse fra forslagene.',
    leverer: '✓ Vi leverer til denne adresse.',
    udenfor: 'Vi leverer desværre ikke til denne adresse endnu.',
    ring: 'Vi kører ikke fast derud. Ring til os, så aftaler vi det '
      + '— eller vælg "Vi henter".',
    ikkeFundet: 'Vi kunne ikke finde adressen. Vælg en adresse fra forslagene.',
    ikkeBekraeftet: 'Vi kunne ikke bekræfte adressen. Prøv at vælge den igen.',
    nede: 'Vi kunne ikke kontrollere leveringsadressen lige nu. Prøv igen.',
    ingen: 'Ingen adresser fundet. Prøv at skrive vej og husnummer.',
  };

  function lav(navn, klasse, tekst) {
    var e = document.createElement(navn);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = tekst;
    return e;
  }

  var loebenr = 0;

  function tilslut(felt, valg) {
    if (!felt) return null;
    var o = valg || {};
    var statusLinje = o.status || null;
    var lokation = o.lokation || 'mosede';
    var valideringUrl = o.valideringUrl || '';
    var meld = typeof o.naarAendret === 'function' ? o.naarAendret : function () {};

    var listeId = 'adr-liste-' + (++loebenr);
    var liste = lav('ul', 'adr-liste skjult');
    liste.id = listeId;
    liste.setAttribute('role', 'listbox');
    felt.parentNode.insertBefore(liste, felt.nextSibling);

    felt.setAttribute('role', 'combobox');
    felt.setAttribute('aria-autocomplete', 'list');
    felt.setAttribute('aria-expanded', 'false');
    felt.setAttribute('aria-controls', listeId);
    felt.setAttribute('autocomplete', 'off');

    var forslag = [];
    var markeret = -1;
    var valgt = null;      // { id, tekst }
    var token = null;      // kvitteringen fra serveren
    var hentning = null;   // AbortController
    var timer = null;
    var nyeste = 0;

    function tilstand(slags, besked) {
      if (statusLinje) {
        statusLinje.textContent = besked || '';
        statusLinje.className = 'adr-status'
          + (slags ? ' adr-' + slags : '')
          + (besked ? '' : ' skjult');
      }
      meld({
        klar: slags === 'ja',
        token: slags === 'ja' ? token : null,
        adresse: valgt ? valgt.tekst : '',
        slags: slags || 'tom',
        besked: besked || '',
      });
    }

    function lukListen() {
      liste.className = 'adr-liste skjult';
      liste.innerHTML = '';
      felt.setAttribute('aria-expanded', 'false');
      felt.removeAttribute('aria-activedescendant');
      forslag = [];
      markeret = -1;
    }

    /* ⚠️ Nulstilles ved HVERT tastetryk. Se hovedet: en adresse,
       der er rettet efter valget, er ikke længere valgt. */
    function glemValget() {
      if (!valgt && !token) return;
      valgt = null;
      token = null;
      tilstand('vaelg', ORD.vaelg);
    }

    function markér(i) {
      var b = liste.children;
      for (var k = 0; k < b.length; k++) {
        var paa = k === i;
        b[k].className = 'adr-forslag' + (paa ? ' paa' : '');
        b[k].setAttribute('aria-selected', paa ? 'true' : 'false');
      }
      markeret = i;
      if (i >= 0 && b[i]) {
        felt.setAttribute('aria-activedescendant', b[i].id);
        if (b[i].scrollIntoView) b[i].scrollIntoView({ block: 'nearest' });
      } else {
        felt.removeAttribute('aria-activedescendant');
      }
    }

    function tegnForslag(raekker) {
      liste.innerHTML = '';
      if (!raekker.length) {
        lukListen();
        tilstand('tom', ORD.ingen);
        return;
      }
      raekker.forEach(function (r, i) {
        /* ⚠️ textContent og ALDRIG innerHTML: teksten kommer udefra. */
        var li = lav('li', 'adr-forslag', r.tekst);
        li.id = listeId + '-' + i;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        /* mousedown og ikke click: blur på feltet ville ellers nå at
           lukke listen, før klikket landede. */
        li.addEventListener('mousedown', function (h) {
          h.preventDefault();
          vaelg(i);
        });
        liste.appendChild(li);
      });
      forslag = raekker;
      liste.className = 'adr-liste';
      felt.setAttribute('aria-expanded', 'true');
      markér(-1);
    }

    function soeg(q) {
      if (hentning) hentning.abort();
      var mit = ++nyeste;
      hentning = typeof AbortController === 'function' ? new AbortController() : null;

      fetch(DAWA + '?q=' + encodeURIComponent(q) + '&per_side=' + HOEJST + '&fuzzy=', {
        signal: hentning ? hentning.signal : undefined,
        headers: { accept: 'application/json' },
      }).then(function (r) {
        return r.ok ? r.json() : [];
      }).then(function (d) {
        /* Et gammelt svar må ikke overhale et nyt. Se hovedet. */
        if (mit !== nyeste) return;
        tegnForslag((Array.isArray(d) ? d : []).map(function (x) {
          return {
            tekst: String((x && x.tekst) || ''),
            id: String(((x && x.adresse) || {}).id || ''),
          };
        }).filter(function (x) { return x.tekst && x.id; }));
      }).catch(function () {
        /* ⚠️ AUTOCOMPLETE MÅ FEJLE BLØDT. Kan vi ikke foreslå noget,
           er det ærgerligt — men den endelige kontrol ligger på
           serveren og fejler hårdt. Gæsten skal ikke se en teknisk
           fejl, fordi et forslag ikke kom. */
        if (mit !== nyeste) return;
        lukListen();
      });
    }

    function vaelg(i) {
      var r = forslag[i];
      if (!r) return;
      felt.value = r.tekst;
      valgt = { id: r.id, tekst: r.tekst };
      token = null;
      lukListen();
      validér();
    }

    function validér() {
      if (!valgt || !valideringUrl) {
        tilstand('vaelg', ORD.vaelg);
        return;
      }
      tilstand('venter', 'Vi kontrollerer adressen …');
      var mit = ++nyeste;

      fetch(valideringUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dawaId: valgt.id, lokation: lokation }),
      }).then(function (r) {
        return r.json().catch(function () { return null; });
      }).then(function (s) {
        if (mit !== nyeste) return;
        if (!s) return tilstand('nede', ORD.nede);

        if (s.gyldig && s.leveres && s.token) {
          token = String(s.token);
          if (s.adresse) { felt.value = s.adresse; valgt.tekst = s.adresse; }
          return tilstand('ja', ORD.leverer);
        }
        if (s.gyldig && !s.leveres) {
          token = null;
          if (s.adresse) { felt.value = s.adresse; valgt.tekst = s.adresse; }
          return tilstand('nej',
            s.grund === 'RING_TIL_OS' ? ORD.ring : ORD.udenfor);
        }
        token = null;
        if (s.grund === 'ADRESSE_IKKE_FUNDET') return tilstand('nej', ORD.ikkeFundet);
        if (s.grund === 'ADRESSETJENESTE_NEDE') return tilstand('nede', ORD.nede);
        return tilstand('nej', ORD.ikkeBekraeftet);
      }).catch(function () {
        if (mit !== nyeste) return;
        /* ⚠️ FAIL CLOSED: uden kvittering er der ingen levering. */
        token = null;
        tilstand('nede', ORD.nede);
      });
    }

    felt.addEventListener('input', function () {
      glemValget();
      var q = felt.value.trim();
      if (timer) clearTimeout(timer);
      if (q.length < MINDST_TEGN) {
        if (hentning) hentning.abort();
        nyeste++;
        lukListen();
        return;
      }
      timer = setTimeout(function () { soeg(q); }, VENT_MS);
    });

    felt.addEventListener('keydown', function (h) {
      if (h.key === 'Escape') { lukListen(); return; }
      if (!forslag.length) return;
      if (h.key === 'ArrowDown') {
        h.preventDefault();
        markér(markeret + 1 >= forslag.length ? 0 : markeret + 1);
      } else if (h.key === 'ArrowUp') {
        h.preventDefault();
        markér(markeret - 1 < 0 ? forslag.length - 1 : markeret - 1);
      } else if (h.key === 'Enter') {
        /* ⚠️ Kun når noget ER markeret. Enter på et felt uden
           markering skal ikke vælge forslag nummer ét — se
           "ingen automatisk accept" i hovedet. */
        if (markeret >= 0) { h.preventDefault(); vaelg(markeret); }
      }
    });

    document.addEventListener('click', function (h) {
      if (h.target !== felt && !liste.contains(h.target)) lukListen();
    });

    return {
      tilstand: function () {
        return { klar: !!token, token: token, adresse: valgt ? valgt.tekst : '' };
      },
      nulstil: function () {
        felt.value = '';
        valgt = null;
        token = null;
        lukListen();
        tilstand('', '');
      },
    };
  }

  window.MosedeAdresse = { tilslut: tilslut, ORD: ORD };
}());
