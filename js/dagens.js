/* ============================================================
   DAGENS RET PÅ FORSIDEN
   ------------------------------------------------------------
   Bundtets bestillingspanel, og det ligger PÅ FORSIDEN med vilje:
   gæsten lander, ser hvad der er i dag, og trykker send uden at
   skifte side. Et link til en anden side er et sted, halvdelen
   falder fra.

   TRE TING DER IKKE ER PYNT:

   1) DER ER ÉN RET, OG DEN ER I DAG. Admin har ét felt til dagens
      ret (indstillingen dagens_ret), altså dagens. Bundtets
      datovælger har tre dage med hver sin ret — det kan vi ikke
      fylde ud, og vi gætter ikke. Datofeltet står derfor med i
      dag alene, indtil admin får en uge at skrive i. Se listen i
      README under "Hvad der mangler".

      Feltet er IKKE fjernet. Formen er bundtets, og den dag
      ugeplanen findes, er der et sted at lægge den.

   2) LEVERING ER IKKE ET VALG. Bundtet har To-go / Spis her /
      Levering. Vi ved ikke hvad der leveres eller til hvilket
      område — det står øverst på ejerens liste — og en knap, der
      lover levering, giver en skuffet kunde i telefonen.

   3) DE FEM RÆKKER MED "+ tilføj" ER LINKS. Dagens ret bestilles
      her; grillen, smørrebrødet, burgerne, isen og drikkevarerne
      har deres egen side med fyld, varsler og mindsteantal — og
      den skal der ikke findes to af. Rækkerne fører derind, på
      den slags der blev trykket på.

   Hele afsnittet skjuler sig selv, når køkkenet ikke har skrevet
   en ret. En formular med "Dagens ret: —" er værre end ingen.
   ============================================================ */
(function () {
  'use strict';

  var form = document.getElementById('dagens-form');
  if (!form) return;

  var $ = function (id) { return document.getElementById(id); };
  function tøm(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function lav(tag, klasse, tekst) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (tekst) el.textContent = tekst;
    return el;
  }

  var MÅNEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december'];

  function pænDato(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    var ugedag = Butik.UGEDAGE[(d.getUTCDay() + 6) % 7];
    return ugedag.toLowerCase() + ' d. ' + d.getUTCDate() + '. ' + MÅNEDER[d.getUTCMonth()];
  }

  function ugedagFor(iso) {
    return (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7;
  }

  /* Dagens plan, eller null hvis der er lukket. Butik.lukketDen
     dækker også en lukkeperiode over flere dage — uden den kunne
     gæsten bestille midt i vinterlukningen. Samme regel som i
     js/bestilling.js. */
  function planFor(d, iso) {
    if (Butik.lukketDen(d, iso)) return null;
    var p = (d.aabningstider || []).filter(function (a) {
      return a.ugedag === ugedagFor(iso);
    })[0];
    if (!p || p.lukket || !p.aabner || !p.lukker) return null;
    return p;
  }

  function toCifre(n) { return ('0' + n).slice(-2); }
  function somTid(m) { return toCifre(Math.floor(m / 60)) + ':' + toCifre(m % 60); }

  /* Tiderne i dag: hver halve time fra nu (rundet op) til en halv
     time før der lukkes, så der er tid til at række posen ud af
     lugen. En tidlig lukning fra kalenderen skærer aftenen af —
     uden den kunne man bestille kl. 19 på en dag, hvor lugen
     lukker 15. Forsiden vidste det, formularen gjorde ikke. */
  function tiderIDag(d, iso) {
    var p = planFor(d, iso);
    if (!p) return [];

    var fra = Butik.tilMinutter(p.aabner);
    var til = Butik.tilMinutter(p.lukker);

    var tidligt = Butik.tilMinutter(Butik.tidligLukning(d, iso));
    if (tidligt !== null && tidligt < til) til = tidligt;
    til -= 30;

    /* Et kvarters luft fra nu. Uden det kunne man bestille til om
       fem minutter, og køkkenet ville have en ret klar, ingen kan
       nå at hente. */
    var nu = Butik.nu();
    if (iso === nu.dato) fra = Math.max(fra, Math.ceil((nu.minutter + 15) / 30) * 30);

    var ud = [];
    for (var m = fra; m <= til; m += 30) ud.push(somTid(m));
    return ud;
  }

  /* ---------- De fem rækker der fører videre ----------
     Navnene kommer fra menukortet, ikke fra en liste her: står
     der en afdeling, personalet har tømt, skal den ikke stå på
     forsiden som noget man kan tilføje. */
  var AFDELINGER = [
    { id: 'mad', navn: 'Grill og retter fra pladen', emoji: '🍔' },
    { id: 'is', navn: 'Is og desserter', emoji: '🍦' },
    { id: 'drikke', navn: 'Drikkevarer', emoji: '🥤' },
  ];

  function visSlags(d) {
    var boks = $('dagens-slags');
    tøm(boks);

    /* Smørrebrødet har sin egen dør, fordi det har fyld og
       mindsteantal. Det står først, for det er det, forretningen
       sælger mest af på siden. */
    var sm = Butik.smoerrebroed(d);
    if (sm && sm.stykker && sm.stykker.length) {
      /* "N slags stykker · N slags fyld", og begge tal TÆLLES.
         Udsolgte er ude af begge — Butik.smoerrebroed sorterer dem
         fra — for et udsolgt fyld er ikke en slags, man kan få i
         dag, og talte det med, ville tallet lyve præcis den dag,
         noget er udsolgt. */
      var note = [
        sm.stykker.length ? sm.stykker.length + ' slags stykker' : '',
        sm.fyld.length ? sm.fyld.length + ' slags fyld' : '',
      ].filter(Boolean).join(' · ');
      var r = raekke('Smørrebrød ud af huset', note, 'bestil/?slags=smoerrebroed', '🥪');
      // Model A-testen og udsolgt-testen tæller på den her linje.
      r.querySelector('.desc').id = 'smoer-fyld';
      boks.appendChild(r);
    }

    AFDELINGER.forEach(function (a) {
      var grupper = Butik.menu(d).filter(function (g) {
        var afd = g.kategori.afdeling === 'grill' ? 'mad' : g.kategori.afdeling;
        return afd === a.id;
      });
      if (!grupper.length) return;

      var antal = grupper.reduce(function (n, g) { return n + g.varer.length; }, 0);
      boks.appendChild(raekke(a.navn,
        antal + (antal === 1 ? ' vare' : ' varer'),
        'menu.html?afd=' + a.id, a.emoji));
    });
  }

  function raekke(navn, note, href, emoji) {
    var a = lav('a', 'item dagens-item');
    a.href = href;
    /* Emojien er et midlertidigt madbillede — se noten i side.js.
       Eget span med aria-hidden: en skærmlæser skal sige
       "Smørrebrød ud af huset", ikke "sandwich Smørrebrød…". */
    if (emoji) {
      var e = lav('span', 'dagens-emoji', emoji);
      e.setAttribute('aria-hidden', 'true');
      a.appendChild(e);
    }
    var ind = lav('div');
    ind.appendChild(lav('h4', null, navn));
    ind.appendChild(lav('p', 'desc', note || ''));
    a.appendChild(ind);
    a.appendChild(lav('span', 'add', '+ tilføj'));
    return a;
  }

  /* ---------- Tælleren og segmentvælgeren ---------- */
  var antal = 1;

  function saetAntal(n) {
    /* Mindst 1: en bestilling på nul retter er ikke en bestilling,
       og knappen skal ikke kunne sende en. Højst 20 — samme loft
       som databasens check på antal. */
    antal = Math.max(1, Math.min(20, n));
    $('dagens-antal').textContent = String(antal);
    opdaterSum();
  }

  function valgtHvordan() {
    var k = form.querySelector('#dagens-hvordan button.on');
    return k ? k.getAttribute('data-v') : 'afhentning';
  }

  function opdaterSum() {
    var navn = $('dagens-navn').textContent;
    var tid = $('dagens-tid').value;
    var felt = $('dagens-hvordan-felt');
    var maade = felt.classList.contains('skjult')
      ? 'Afhentning'
      : (valgtHvordan() === 'spis_her' ? 'Spis her' : 'Tag med');

    $('dagens-sum').textContent =
      antal + ' × ' + navn + ' · ' + maade + (tid ? ' · kl. ' + tid : '');
  }

  /* ---------- Bygningen ---------- */
  function byg(d) {
    var ret = (d.indstillinger || {}).dagens_ret || {};
    if (!ret.navn) return;                 // ingen ret i dag → intet afsnit

    var nu = Butik.nu();
    var tider = tiderIDag(d, nu.dato);
    if (!tider.length) return;             // lukket, eller lugen lukker om lidt

    // ---- Hovedet
    $('dagens-dato').textContent = pænDato(nu.dato);

    var pris = window.MosedePris ? window.MosedePris(ret.pris) : '';
    $('dagens-sub').textContent = ret.navn
      + (pris ? ', ' + pris : '')
      + (ret.beskrivelse ? '. ' + ret.beskrivelse : '');

    // ---- Datofeltet. Se note 1 øverst: én ret, og den er i dag.
    var dag = $('dagens-dag');
    tøm(dag);
    var o = document.createElement('option');
    o.value = nu.dato;
    o.textContent = 'I dag – ' + pænDato(nu.dato);
    dag.appendChild(o);
    dag.value = nu.dato;

    $('dagens-linje').textContent = 'Dagens ret: ' + ret.navn + (pris ? ' · ' + pris : '');

    // ---- Noten: forretningens rigtige åbningstid, ikke et gæt
    var p = planFor(d, nu.dato);
    $('dagens-note').textContent = 'Vi har åbent til '
      + Butik.pænTid(p.lukker) + ' i dag. Sidste afhentning en halv time før.';

    // ---- Retten
    $('dagens-navn').textContent = ret.navn;
    if (ret.beskrivelse) {
      $('dagens-desc').textContent = ret.beskrivelse;
      $('dagens-desc').classList.remove('skjult');
    }
    $('dagens-tag').textContent = pris ? 'Dagens ret · ' + pris : 'Dagens ret';

    visSlags(d);

    // ---- Tiderne
    var tid = $('dagens-tid');
    tøm(tid);
    tider.forEach(function (t) {
      var e = document.createElement('option');
      e.value = t;
      e.textContent = 'kl. ' + t;
      tid.appendChild(e);
    });

    /* "Spis her" står kun her, når personalet har slået det til.
       Er supabase/spis-her.sql ikke kørt endnu, findes kolonnen
       ikke, og hver bestilling er afhentning — så må knappen ikke
       kunne trykkes. Se noten i store.js. */
    if ((d.indstillinger || {}).spis_her_aaben) {
      $('dagens-hvordan-felt').classList.remove('skjult');
    }

    saetAntal(1);
    $('dagens').classList.remove('skjult');

    /* Den flydende pille peger på panelet, NÅR det findes.

       Den står i HTML'en som "Bestil mad" med bestillingssiden
       bagved og bliver kun skrevet om her. Vendte det den anden
       vej, ville en fejl i det her script efterlade en knap, der
       peger på et afsnit, som ikke er der — og gæsten ville trykke
       og lande samme sted.

       Heroens to store knapper stod her og gjorde det samme.
       De er væk (kundens ord, 22/8), og pillen er nu den ENE
       handling på forsiden. */
    var fast = document.querySelector('.bestil-fast');
    if (fast) {
      fast.href = '#dagens';
      var t = $('bestil-fast-tekst');
      if (t) t.textContent = 'Bestil dagens ret';
      var e2 = fast.querySelector('.bestil-fast-emoji');
      if (e2) e2.textContent = '🍽️';
    }
  }

  /* ---------- Lytterne ---------- */
  form.querySelector('[data-step]').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    saetAntal(antal + (b.getAttribute('data-d') === '+' ? 1 : -1));
  });

  $('dagens-hvordan').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (o) {
      o.classList.remove('on');
    });
    b.classList.add('on');
    opdaterSum();
  });

  $('dagens-tid').addEventListener('change', opdaterSum);

  function fejl(besked) {
    var f = $('dagens-fejl');
    f.textContent = besked;
    f.classList.remove('skjult');
    f.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    $('dagens-fejl').classList.add('skjult');

    var navn = $('dagens-kunde').value.trim();
    var tlf = $('dagens-tlf').value.replace(/\s/g, '');

    if (!navn) return fejl('Skriv dit navn, så vi ved hvem posen er til.');
    /* Otte cifre. Vi ringer og bekræfter hver eneste bestilling —
       et nummer der ikke kan ringes op, er en bestilling ingen kan
       gøre noget ved. Samme regel som på bestillingssiden. */
    if (!/^(\+45)?\d{8}$/.test(tlf)) return fejl('Skriv et dansk telefonnummer på otte cifre.');

    /* DET SIDSTE KIG — samme vindue som på bestillingssiden, af
       samme grund: gæstens eget kig er værnet mod en forkert
       bestilling, og panelet her er en bestilling som enhver
       anden. Formularen byttes ud med kigget; "← Ret noget"
       bytter tilbage med alt udfyldt. */
    var kig = lav('div', 'dagenskort');
    kig.appendChild(lav('h3', null, 'Se den efter, før du sender'));

    function kigLinje(n, v) {
      var r = lav('div', 'kvit-linje');
      r.appendChild(lav('span', 'kvit-navn', n));
      r.appendChild(lav('span', 'kvit-vaerdi', v));
      kig.appendChild(r);
    }
    /* Felterne fanges HER — efter byttet er formularen ude af
       DOM'en, og $('dagens-dag') er null. Prøven fangede det:
       "Cannot read properties of null" midt i afsendelsen. */
    var retNavn = $('dagens-navn').textContent;
    var felter = {
      dag: $('dagens-dag').value,
      tid: $('dagens-tid').value,
      hvordan: $('dagens-hvordan-felt').classList.contains('skjult')
        ? 'afhentning' : valgtHvordan(),
      besked: $('dagens-besked').value,
    };
    kigLinje(antal + ' × ' + retNavn, '');
    kigLinje('Hentes', 'kl. ' + felter.tid.replace(':', '.'));
    if (!$('dagens-hvordan-felt').classList.contains('skjult')) {
      kigLinje('Hvordan', felter.hvordan === 'spis_her' ? 'Spis her' : 'To-go');
    }
    kigLinje('Navn', navn);
    kigLinje('Telefon', tlf);
    if (felter.besked.trim()) kigLinje('Besked', felter.besked.trim());

    var raekkeDiv = lav('div', 'knap-raekke');
    var ret = lav('button', 'knap sekundaer', '← Ret noget');
    ret.type = 'button';
    var sendKnap = lav('button', 'knap', 'Send bestilling');
    sendKnap.type = 'button';
    raekkeDiv.appendChild(ret);
    raekkeDiv.appendChild(sendKnap);
    kig.appendChild(raekkeDiv);
    var kigFejl = lav('p', 'fejl skjult');
    kigFejl.setAttribute('role', 'alert');
    kig.appendChild(kigFejl);

    form.parentNode.replaceChild(kig, form);
    kig.scrollIntoView({ block: 'center' });

    ret.addEventListener('click', function () {
      kig.parentNode.replaceChild(form, kig);
      var knap0 = $('dagens-send');
      knap0.disabled = false;
      knap0.textContent = 'Send bestilling';
    });

    sendKnap.addEventListener('click', function () { sendNu(); });
    return;

    function sendNu() {
    var knap = sendKnap;
    knap.disabled = true;
    knap.textContent = 'Sender…';

    /* auto FANGES HER og ikke nede i kvitteringen. Den stod som
       "(d.indstillinger || {}).auto_bekraeft" i næste led, hvor d
       ikke findes — hvert eneste send endte i "d is not defined",
       og gæsten så kigget stå med "Sender…" for evigt.
       Prøverne fandt det; se tests/forside.spec.js. */
    var auto = false;

    Butik.hent().then(function (d) {
      var ret = (d.indstillinger || {}).dagens_ret || {};
      auto = (d.indstillinger || {}).auto_bekraeft === true;
      return Butik.bestil({
        navn: navn,
        telefon: tlf,
        hent_dato: felter.dag,
        hent_tid: felter.tid,
        hvordan: felter.hvordan,
        linjer: [{ navn: ret.navn, antal: antal, pris: ret.pris }],
        besked: felter.besked,
      });
    }).then(function (svar) {
      /* Kvitteringen ERSTATTER formularen. Bliver felterne stående,
         trykker folk send igen — og så afvises de af bremsen med
         en besked, der ligner en fejl. */
      var kort = lav('div', 'dagenskort');
      kort.appendChild(lav('h3', null, auto ? 'Bestilt' : 'Tak — vi har den'));
      kort.appendChild(lav('p', 'hint', auto
        ? 'Den er bekræftet — du betaler, når du henter. '
          + 'Kan køkkenet ikke lave den, ringer vi.'
        : 'Vi ringer og bekræfter. Du betaler, når du henter.'));

      var kvit = lav('div', 'note');
      // retNavn og felter — formularen er ude af DOM'en her
      kvit.textContent = antal + ' × ' + retNavn
        + ' · kl. ' + felter.tid
        + ((svar && svar.reference) ? ' · ' + svar.reference : '');
      kort.appendChild(kvit);

      kig.parentNode.replaceChild(kort, kig);
      kort.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }).catch(function (e) {
      knap.disabled = false;
      knap.textContent = 'Send bestilling';
      /* Nettet er dødt efter tre forsøg: sms-nødudgangen i stedet
         for en fejlbesked. Teksten SIGER at bestillingen ikke er
         sendt — se noten ved noedudgangSms i js/store.js. */
      if (e && e.netfejl && e.raekke) {
        var f = kigFejl;
        f.textContent = 'Der er ingen forbindelse lige nu, og bestillingen er '
          + 'IKKE sendt endnu. Send den som sms med ét tryk — eller ring.';
        var n = Butik.noedudgangSms(e.raekke);
        var udveje = lav('div', 'noedudgang');
        var sms = lav('a', 'knap', 'Send som sms');
        sms.href = n.href;
        var ring = lav('a', 'glass sm', 'Ring til os');
        ring.href = n.ring;
        udveje.appendChild(sms);
        udveje.appendChild(ring);
        f.appendChild(udveje);
        f.classList.remove('skjult');
        f.scrollIntoView({ block: 'center' });
        return;
      }
      kigFejl.textContent = e && e.message ? e.message
        : 'Bestillingen kunne ikke sendes. Ring til os, så tager vi den.';
      kigFejl.classList.remove('skjult');
    });
    }
  });

  Butik.hent().then(byg).catch(function () {
    /* Kan der ikke hentes, skal afsnittet BLIVE skjult. En
       formular uden dagens ret, uden tider og uden priser er ikke
       en halv formular — det er en, der ikke kan bruges. */
  });
})();
