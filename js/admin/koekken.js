/* ============================================================
   KØKKEN-KØEN — skærmen, der står tændt i køkkenet

   Se js/admin/kerne.js for de to principper, der gælder i alle
   admin-filerne.

   ------------------------------------------------------------
   DEN VISER KUN BORDENE, OG DET ER EN SKÆRM — IKKE EN TABEL
   ------------------------------------------------------------
   Briefen bad om, at bordbestillinger ikke måtte blandes ind i
   den eksisterende admin. Det er løst med en egen skærm og ikke
   med en egen tabel, og forskellen er værd at kende:

   · Køkkenet har ÉN kø. To tabeller ville være to lister, nogen
     skal huske at kigge i — og den dag begge har travlt, er det
     den ene, der bliver glemt.
   · Salgstallene, udeblivelserne og dagens omsætning regner
     allerede på bestillinger. En anden tabel skulle regnes med i
     hver eneste af dem, hver gang der kom en ny.
   · Bordnummeret ER adskillelsen: en bestilling MED bord_nummer
     er fra et bord, en uden er fra hjemmesiden. Skærmen
     filtrerer; dataene deler sig ikke.

   ------------------------------------------------------------
   ÉN KNAP: FÆRDIG  (31/8)
   ------------------------------------------------------------
   ny → tilberedes → klar → serveret står stadig i databasen, men
   knappen på kortet er ALTID "✓ Færdig" og fører hele vejen.
   Kundens ord: "ik noget med start tilberedning, bare en done
   eller færdig knap og ik mere end det." Mellemtrinnene ligger
   bag "···" for den, der vil markere, at maden er i gang.

   Kræver supabase/restaurant.sql — uden den afviser databasen
   'tilberedes' og 'serveret', og køkkenet kan ikke komme videre
   fra "ny".
   ============================================================ */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  /* Femten minutter. Kortere, og hvert eneste kort er rødt i en
     frokost, hvor alting tager tid; længere, og et bord, der er
     glemt, ser ud som et bord, der er i gang. Tallet er briefens,
     og det bruges KUN, når ejeren ikke har sagt noget andet. */
  var FOR_LAENGE_MIN = 15;

  /* ⚠️ EJERENS EGET TAL SLÅR VORES.

     "Forventet ventetid" er dét, gæsten får at se, når hun
     scanner. Er den sat til 10, har vi lovet 10 — og så er 12
     minutter for længe, uanset hvad vi selv synes. Er den ikke
     sat, er der ikke lovet noget, og så falder vi tilbage på
     briefens kvarter.

     Uden det her ville skærmen have to sandheder om den samme
     bestilling: én på gæstens telefon og én i køkkenet. */
  function maalTid() {
    var i = (Admin.data && Admin.data.indstillinger) || {};
    var n = Number(i.bord_ventetid_min);
    return isFinite(n) && n > 0 ? n : FOR_LAENGE_MIN;
  }

  /* ⚠️ OVERBLIK SPØRGER DEN HER, DEN SKRIVER IKKE SIT EGET TAL
     (30/8).

     Køreplanens alarmstribe skal vide det samme som køkkenet:
     hvornår har et bord ventet for længe. Skrev Overblik sit
     eget kvarter af, ville de to skærme sige noget forskelligt
     den dag, ejeren satte ventetiden til ti — og det ville ingen
     opdage, for begge ville se rigtige ud hver for sig. */
  Admin.bordForLaenge = maalTid;

  /* Hvilken zone vises? Striben tegnes af de borde, der FAKTISK
     står i køen — se tegnZoner. */
  var zoneFilter = 'alle';

  /* Trinene i den rækkefølge, køkkenet arbejder i. 'klar' fandtes
     i forvejen og bruges også af mad ud af huset — de to veje
     mødes dér og skilles igen. */
  /* ⚠️ ÉT TRYK — OG KUN ÉT  (31/8).

     Kundens ord: *"i køkken kø ... ik noget med start
     tilberedning, bare en done eller færdig knap og ik mere end
     det."*

     Her stod tre trin med hver sin knap: Start tilberedning →
     Meld klar → Serveret. Det er tre tryk på en tallerken, der
     blev lavet og båret ud på fire minutter, og den, der står med
     en fedtet finger og en tallerken i den anden hånd, trykker
     ikke tre gange — hun trykker på det sidste og lader
     mellemtrinnene stå. Så er skærmen forkert, og det er værre
     end ingen skærm.

     Det er den SAMME beslutning, Bestillinger-fanen fik samme dag
     ("man skal bare trykke færdig, ikke det der dobbeltknap-noget")
     — og derfor står den nu to steder ens.

     ⚠️ MELLEMTRINNENE ER IKKE FJERNET, de er lagt bag "···".
     Køkkenet på en travl fredag VIL gerne kunne markere "den er i
     gang", så to kokke ikke laver den samme ret. Det er bare ikke
     den handling, knappen skal bruges på.

     ⚠️ OG ORDENE I DATABASEN ER URØRTE. Status hedder stadig
     'tilberedes' / 'klar' / 'serveret'; salgstallene tæller på
     netop de ord (se Salg-fanen), og en ændring dér ville stoppe
     omsætningen uden en eneste fejl. Det er ORDET PÅ KNAPPEN, der
     skifter. */
  var TRIN = [
    { id: 'ny', navn: 'Modtaget' },
    { id: 'tilberedes', navn: 'Tilberedes' },
    { id: 'klar', navn: 'Klar' },
  ];

  /* Den ene knap. Den fører HELE vejen til enden, uanset hvor
     kortet står — præcis som Færdig gør på Bestillinger. */
  var FAERDIG_TRIN = { naeste: 'serveret', knap: '✓ Færdig' };

  /* Mellemtrinnene, i den rækkefølge køkkenet arbejder i. De er
     kun tilgængelige FREMAD: står kortet på 'klar', giver "Start
     tilberedning" ingen mening, og en knap, der fører baglæns,
     er et fejltryk, der ligner en handling. */
  var MELLEM = [
    { fra: ['ny', 'bekraeftet'], naeste: 'tilberedes', knap: 'Start tilberedning' },
    { fra: ['ny', 'bekraeftet', 'tilberedes'], naeste: 'klar', knap: 'Meld klar' },
  ];

  var FAERDIG = { serveret: true, afvist: true, udeblevet: true, afhentet: true };

  /* 'bekraeftet' er ikke køkkenets ord, men et bord kan lande dér:
     kortet står OGSÅ på Bestillinger, og trykker nogen "Bekræft"
     der, skal køkkenet stadig kunne komme videre. Uden linjen her
     faldt kortet tilbage på TRIN[0] og kaldte sig "Modtaget" —
     rigtigt næste trin, forkert navn på skærmen. */
  var SOM_NY = { ny: 'Modtaget', bekraeftet: 'Bekræftet' };

  function trinFor(status) {
    var t = TRIN.filter(function (x) { return x.id === status; })[0];
    if (t) return { id: t.id, navn: t.navn, naeste: FAERDIG_TRIN.naeste, knap: FAERDIG_TRIN.knap };
    if (SOM_NY[status]) {
      return { id: status, navn: SOM_NY[status],
        naeste: FAERDIG_TRIN.naeste, knap: FAERDIG_TRIN.knap };
    }
    return null;
  }

  /* Hvad kan kortet ellers? Tom liste = ingen dør, og så tegnes
     "···" ikke: en knap, der åbner ingenting, trykker man på én
     gang og aldrig igen. Samme regel som bestillingskortets. */
  function mellemFor(status) {
    return MELLEM.filter(function (m) { return m.fra.indexOf(status) !== -1; });
  }

  /* Navnet på et trin, der ikke er et trin. 'serveret' er enden på
     vejen og står derfor ikke i TRIN — men kvitteringen skal kunne
     sige, hvad der lige skete. */
  var NAVNE = { serveret: 'Færdig', afvist: 'Afvist',
    tilberedes: 'Tilberedes', klar: 'Klar' };

  function navnFor(status) {
    var t = trinFor(status);
    return (t && t.navn) || NAVNE[status] || status;
  }

  /* Bordbestillingerne, ældste først. Et køkken arbejder i den
     rækkefølge, tingene kom ind — ikke i den, de skal hentes.
     Derfor er den her sortering en ANDEN end vagtskærmens på
     Overblik, og det er med vilje. */
  function koeen() {
    return (Admin.lister.bestillinger || [])
      .filter(function (b) {
        return b.bord_nummer && !b.slettet && !FAERDIG[b.status];
      })
      .sort(function (a, b) { return (a.oprettet || '') < (b.oprettet || '') ? -1 : 1; });
  }

  function minutterSiden(iso) {
    var t = Date.parse(iso || '');
    if (!isFinite(t)) return null;
    return Math.floor((Date.now() - t) / 60000);
  }

  function klokken(iso) {
    var d = new Date(Date.parse(iso || ''));
    if (isNaN(d.getTime())) return '';
    return ('0' + d.getHours()).slice(-2) + '.' + ('0' + d.getMinutes()).slice(-2);
  }

  /* Zonen på bordet — "Terrassen", "Molen". Den er en RETNING at
     gå i, når maden er klar, og den står kun, hvis ejeren har sat
     den: de fleste steder har ét hjørne, og en tom prik efter
     bordnummeret ser ud som noget, der mangler. */
  function zonen(nummer) {
    var b = (Admin.lister.bordliste || []).filter(function (x) {
      return String(x.nummer).trim().toLowerCase()
        === String(nummer).trim().toLowerCase();
    })[0];
    return (b && String(b.zone || '').trim()) || '';
  }

  /* Hvilken RUNDE er bordet på?

     "Bestil mere" lægger en NY ordre på det samme bord — samme
     selskab, samme regning. For køkkenet er det en oplysning, der
     ændrer arbejdet: runde 2 er dessert til nogen, der allerede
     sidder og spiser, ikke et nyt bord, der venter på sin frokost.

     ⚠️ DEN TÆLLER OGSÅ DE SERVEREDE. Det er hele pointen — havde
     vi kun talt de åbne, ville runde 2 hedde runde 1, i det
     sekund den første var båret ud.

     ⚠️ MEN IKKE DE AFVISTE. En ordre, køkkenet ikke kunne lave,
     er aldrig blevet til mad, og at kalde den en runde ville
     sige, at bordet havde fået noget.

     ⚠️ OG KUN SAMME DAG. hent_dato holder gårsdagens borde ude —
     bestillingerne hentes fra i går og frem. */
  function runde(b) {
    var mine = (Admin.lister.bestillinger || []).filter(function (x) {
      return x.bord_nummer && !x.slettet && x.status !== 'afvist'
        && String(x.bord_nummer) === String(b.bord_nummer)
        && x.hent_dato === b.hent_dato;
    }).sort(function (x, y) { return (x.oprettet || '') < (y.oprettet || '') ? -1 : 1; });

    for (var n = 0; n < mine.length; n++) {
      if (String(mine[n].id) === String(b.id)) return n + 1;
    }
    return 1;
  }

  /* Zonerne, som de står i køen lige nu. Tomme zoner tælles ikke
     med: et bord uden zone er ikke en zone, der hedder ingenting. */
  function zonerIKoe() {
    var set = [];
    koeen().forEach(function (b) {
      var z = zonen(b.bord_nummer);
      if (z && set.indexOf(z) === -1) set.push(z);
    });
    return set.sort();
  }

  /* Køen, som skærmen viser den. Tabbens tal og linjen i hovedet
     tæller ALTID hele køen — et filter må ikke kunne få tallet til
     at lyve om, hvor meget der skal ud. */
  function vistKoe() {
    var liste = koeen();
    if (zoneFilter === 'alle') return liste;
    return liste.filter(function (b) { return zonen(b.bord_nummer) === zoneFilter; });
  }

  function beloeb(b) {
    var sum = (b.linjer || []).reduce(function (s, l) {
      return s + (Number(l.pris) || 0) * (Number(l.antal) || 0);
    }, 0);
    return sum ? Butik.pris(sum) : '';
  }

  // ----------------------------------------------------------
  //  HOVEDETS LEVENDE LINJE
  // ----------------------------------------------------------
  /* ⚠️ LINJEN SKAL TIKKE. Klokken og antallet står lige under
     navnet, og de er skærmens puls: står de stille, mens køkkenet
     har travlt, tror ingen på dem. Uret nederst i filen tegner
     hele fanen om hvert minut, så linjen følger med af sig selv. */
  function tegnLinje() {
    var el = $('koekken-linje');
    if (!el) return;
    var n = koeen().length;
    var lukket = Admin.data && Admin.data.indstillinger
      && Admin.data.indstillinger.bordbestilling_aaben === false;
    el.textContent = 'QR-bestillinger fra bordene · '
      + Butik.nu().tid.replace(':', '.') + ' · '
      + (n ? n + (n === 1 ? ' bestilling skal ud' : ' bestillinger skal ud')
        : 'ingenting i køen')
      + (lukket ? ' · LUKKET for bordene' : '');
  }

  // ----------------------------------------------------------
  //  GÅ UD OG SIG NOGET
  // ----------------------------------------------------------
  /* ⚠️ DE HER LINJER HAR INGEN KNAPPER, OG DET ER MED VILJE.

     Systemet kan ikke tale med bordet. Der er ingen skærm hos
     gæsten, ingen besked og ingen betaling — hun sidder og venter,
     og det eneste, der virker, er et menneske, der går derud.
     En knap ville lade som om, der var en genvej.

     Alle tre slags regnes ud af data, vi HAR: kontakten ovenfor,
     uret, og gæstens eget ALLERGI-felt. Ingen af dem kan kvitteres
     for — en advarsel, man kan trykke væk, bliver trykket væk af
     den, der har travlt. */
  function obsLinjer() {
    var ud = [];
    var maal = maalTid();

    if (Admin.data && Admin.data.indstillinger
      && Admin.data.indstillinger.bordbestilling_aaben === false) {
      ud.push({
        titel: 'Bordene kan ikke bestille lige nu',
        tekst: 'Nye scanninger møder "kom op til lugen". Det, der står i '
          + 'køen, kører færdigt. Fluebenet står øverst på fanen.',
      });
    }

    /* Ét bord kan have flere åbne ordrer. Den ÆLDSTE bestemmer —
       ellers ser et bord, der har ventet i 28 minutter, ud som et
       nyt bord, fordi de lige har bestilt en is oveni. */
    var pr = {};
    koeen().forEach(function (b) {
      var m = minutterSiden(b.oprettet);
      if (m === null || m < maal) return;
      var n = b.bord_nummer;
      if (!pr[n] || m > pr[n]) pr[n] = m;
    });
    /* ⚠️ ÉN LINJE, IKKE ÉN PR. BORD.

       MÅLT på en travl frokost med ejerens ventetid sat til ti
       minutter: tre borde over grænsen gav tre næsten ens linjer,
       der fyldte hele kortet — og et alarmkort, der siger det
       samme tre gange, er et kort, man holder op med at læse.
       Det VÆRSTE bord står med sit tal; resten er et antal.
       Hvilke borde det er, står på kortene nedenunder, som i
       forvejen er sorteret ældste først. */
    var sene = Object.keys(pr).sort(function (a, b) { return pr[b] - pr[a]; });
    if (sene.length) {
      var vaerst = sene[0];
      ud.push({
        haster: true,
        titel: 'Bord ' + vaerst + ' har ventet for længe',
        /* ⚠️ "DEN BURDE TAGE 10" ER EJERENS TAL, IKKE VORES.
           Står der ingen forventet ventetid i indstillingerne, er
           der ikke lovet noget — og så skriver vi ikke et tal, som
           om nogen havde sagt det. */
        tekst: pr[vaerst] + ' min siden de bestilte'
          + (harMaal() ? ' — den burde tage ' + maal : '')
          + '. Gå ud og sig noget, hvis den ikke kan komme nu.'
          + (sene.length > 1
            ? ' ' + (sene.length - 1)
              + (sene.length === 2 ? ' andet bord venter også for længe.'
                : ' andre borde venter også for længe.')
            : ''),
      });
    }

    /* ⚠️ ALLERGIEN ER GÆSTENS EGNE ORD. Admin.erAllergi kender
       den på ordet ALLERGI:, som gæstens eget felt sætter foran —
       vi gætter ikke ud fra en ordliste. Teksten citeres, som hun
       skrev den: et referat kan tabe det ene ord, der betød
       noget. */
    koeen().filter(Admin.erAllergi).forEach(function (b) {
      ud.push({
        allergi: true,
        titel: 'Allergi ved bord ' + b.bord_nummer,
        tekst: String(b.besked || '').replace(/^\s*ALLERGI:\s*/i, '')
          + ' — sig det til den, der laver den.',
      });
    });

    return ud;
  }

  function harMaal() {
    var i = (Admin.data && Admin.data.indstillinger) || {};
    var n = Number(i.bord_ventetid_min);
    return isFinite(n) && n > 0;
  }

  function tegnObs() {
    var boks = $('koekken-obs');
    var kort = $('koekken-obs-kort');
    if (!boks || !kort) return;

    var linjer = obsLinjer();
    kort.classList.toggle('skjult', !linjer.length);
    if (!linjer.length) { Admin.tøm(boks); return; }

    Admin.tegnRaekker(boks, linjer.map(function (l, i) {
      return {
        noegle: 'obs-' + i,
        aftryk: l.titel + '|' + l.tekst,
        byg: function () {
          var r = lav('div', 'obs-linje'
            + (l.haster ? ' obs-haster' : '')
            + (l.allergi ? ' obs-allergi' : ''));
          var t = lav('div', 'obs-tekst');
          t.appendChild(lav('strong', null,
            (l.allergi ? '⚠️ ' : (l.haster ? '⚠️ ' : '💡 ')) + l.titel));
          t.appendChild(lav('span', 'vare-tekst', l.tekst));
          r.appendChild(t);
          return r;
        },
      };
    }));
  }

  // ----------------------------------------------------------
  //  ZONERNE
  // ----------------------------------------------------------
  /* ⚠️ STRIBEN FINDES KUN, NÅR DER ER MERE END ÉN ZONE.

     Zonen er en RETNING at gå i, når maden er klar. De fleste
     steder har ét hjørne, og en knap, der hedder "Alle zoner" ved
     siden af én knap, der hedder "Terrassen", er to knapper, der
     gør det samme. Er der to zoner i køen, er striben til gengæld
     dét, der gør en tur ud med bakken til én tur i stedet for to. */
  function tegnZoner() {
    var boks = $('koekken-zoner');
    if (!boks) return;
    var zoner = zonerIKoe();

    if (zoner.length < 2) {
      /* Filteret skal også SLIPPE, når den sidste ordre i en zone
         er serveret. Ellers står skærmen tom med en usynlig
         begrænsning, og køkkenet tror, køen er tom. */
      zoneFilter = 'alle';
      Admin.tøm(boks);
      boks.classList.add('skjult');
      return;
    }
    boks.classList.remove('skjult');
    Admin.tøm(boks);

    [{ id: 'alle', navn: 'Alle zoner' }].concat(zoner.map(function (z) {
      return { id: z, navn: z };
    })).forEach(function (z) {
      var n = z.id === 'alle' ? koeen().length
        : koeen().filter(function (b) { return zonen(b.bord_nummer) === z.id; }).length;
      var k = lav('button', 'sag-chip' + (zoneFilter === z.id ? ' valgt' : ''));
      k.type = 'button';
      k.setAttribute('data-zone', z.id);
      k.setAttribute('aria-pressed', zoneFilter === z.id ? 'true' : 'false');
      k.appendChild(document.createTextNode(z.navn + ' '));
      k.appendChild(lav('span', 'sag-chip-tal', String(n)));
      k.addEventListener('click', function () {
        zoneFilter = z.id;
        tegnKoekken();
      });
      boks.appendChild(k);
    });
  }

  // ----------------------------------------------------------
  //  ALLE BORDE: hvem venter, og hvor længe
  // ----------------------------------------------------------
  function tegnBorde() {
    var boks = $('koekken-borde');
    if (!boks) return;
    Admin.tøm(boks);

    var liste = vistKoe();
    if (!liste.length) return;

    /* Ét bord kan have flere bestillinger — "Bestil mere" lægger
       en NY ordre på det samme bord, så personalet kan se, at det
       er den samme regning. Stribens tal er derfor bestillinger,
       ikke borde. */
    var pr = {};
    liste.forEach(function (b) {
      var n = b.bord_nummer;
      if (!pr[n]) pr[n] = { antal: 0, aeldst: null };
      pr[n].antal++;
      var m = minutterSiden(b.oprettet);
      if (m !== null && (pr[n].aeldst === null || m > pr[n].aeldst)) pr[n].aeldst = m;
    });

    /* ⚠️ STRIBEN ER EN GENVEJ, IKKE EN GENTAGELSE (28/8).

       Den sagde det samme som kortet lige nedenunder — "Bord 1 ·
       1 ordre · 28 min" over et kort, der hedder Bord 1 og siger
       28 min. Med fire ordrer er det larm; med femten er en fast
       oversigt over, hvem der venter, netop dét, man mangler.

       Derfor er felterne KNAPPER nu: et tryk ruller ned til
       bordets ældste åbne kort og markerer det et øjeblik. Så er
       striben en indholdsfortegnelse i stedet for en kopi. */
    var stribe = lav('div', 'koek-borde');
    Object.keys(pr).sort().forEach(function (n) {
      var b = pr[n];
      var chip = lav('button', 'koek-bordchip'
        + (b.aeldst !== null && b.aeldst >= maalTid() ? ' sent' : ''));
      chip.type = 'button';
      chip.setAttribute('data-bordchip', n);
      chip.appendChild(lav('b', null, 'Bord ' + n));
      chip.appendChild(lav('span', null,
        b.antal + (b.antal === 1 ? ' ordre' : ' ordrer')
        + (b.aeldst !== null ? ' · ' + b.aeldst + ' min' : '')));
      chip.addEventListener('click', function () {
        var maal = document.querySelector('.koek-kort[data-bord="'
          + String(n).replace(/"/g, '\\"') + '"]');
        if (!maal) return;
        maal.scrollIntoView({ behavior: 'smooth', block: 'center' });
        maal.classList.add('peget-paa');
        setTimeout(function () { maal.classList.remove('peget-paa'); }, 1600);
      });
      stribe.appendChild(chip);
    });
    boks.appendChild(stribe);
  }

  // ----------------------------------------------------------
  //  KØEN
  // ----------------------------------------------------------
  /* ============================================================
     PLINGET, OG HVORFOR DET SKAL SLÅS TIL MED EN FINGER
     ------------------------------------------------------------
     Browsere blokerer lyd, indtil nogen har rørt skærmen. En
     iPad i et køkken, der har stået urørt siden morgenmaden,
     siger derfor INGENTING, når dagens første ordre kommer — og
     det opdager man først den dag, en ordre har stået i tyve
     minutter. Derfor knappen: den er både tilladelsen og
     kvitteringen for, at lyden virker.

     Tonen laves i browseren (WebAudio) og ikke som en fil: en
     lydfil er en hentning mere, der kan fejle på havnens net,
     og køkkenet skal kunne høre den uden at have været online
     et sekund før.

     ⚠️ OG LYDEN ER ALDRIG ALENE. Der er larm i et køkken. Et nyt
     kort markerer sig også synligt (.linje-ny), som på
     Bestillinger — se noten der. */
  var lydTil = false;
  var lyd = null;

  function pling() {
    if (!lydTil) return;
    try {
      if (!lyd) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        lyd = new AC();
      }
      if (lyd.state === 'suspended') lyd.resume();
      var t = lyd.currentTime;
      [880, 1320].forEach(function (hz, nr) {
        var o = lyd.createOscillator();
        var g = lyd.createGain();
        o.type = 'sine';
        o.frequency.value = hz;
        /* Blødt ind og ud: en firkantet tone knækker i en lille
           iPad-højttaler og lyder som en fejl, ikke som et pling. */
        g.gain.setValueAtTime(0.0001, t + nr * 0.14);
        g.gain.exponentialRampToValueAtTime(0.22, t + nr * 0.14 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + nr * 0.14 + 0.13);
        o.connect(g); g.connect(lyd.destination);
        o.start(t + nr * 0.14);
        o.stop(t + nr * 0.14 + 0.15);
      });
    } catch (e) { /* ingen lyd: markeringen på skærmen står stadig */ }
  }

  function sigLyd() {
    var knap = $('koekken-lyd');
    var note = $('koekken-lyd-note');
    if (knap) knap.textContent = lydTil ? '🔔 Lyden er slået til' : '🔔 Slå lyd til';
    if (knap) knap.classList.toggle('valgt', lydTil);
    if (note) {
      note.textContent = lydTil
        ? 'Lyden virker. Nye ordrer plinger og markeres på skærmen.'
        : 'Lyden er slået fra. Nye ordrer markeres stadig på skærmen.';
    }
  }

  if ($('koekken-lyd')) {
    $('koekken-lyd').addEventListener('click', function () {
      lydTil = !lydTil;
      sigLyd();
      // Trykket ER tilladelsen. Derfor prøver vi tonen med det
      // samme: hører man ingenting nu, virker den heller ikke kl. 19.
      if (lydTil) pling();
    });
    sigLyd();
  }

  /* De id'er, der er NYE siden sidst. Samme mønster som
     bestillinger.js: det kan kun lade sig gøre, fordi der ikke
     tegnes om i tomgang — tegnede vi alt om hvert minut, var
     alting "nyt". null første gang, så hele køen ved login ikke
     bliver til tredive plings på én gang. */
  var kendte = null;

  /* Er bestillingerne overhovedet hentet? Admin.lister.bestillinger
     er undefined, til bestillinger.js har meldt sin liste ind —
     og en tom kø, fordi vi ikke har hentet endnu, er noget helt
     andet end en tom kø, fordi der ikke er noget. */
  function hentet() { return Admin.lister.bestillinger !== undefined; }

  /* ============================================================
     FÆRDIGE I DAG — OG ↩ GENDAN  (31/8)
     ------------------------------------------------------------
     Kundens ord: *"det skal ramme historikken, og alt blive gemt
     og kunne gendannes hvis fejltrykkelse."*

     Et fejltryk på Færdig tog kortet ud af køen, og vejen tilbage
     var Bestillinger-fanen — altså et faneskift midt i en
     frokost, hvor køkkenet står med DEN HER skærm foran sig. Det
     er nøjagtig det hul, Bestillinger-fanen fik lukket tidligere
     i dag.

     ⚠️ GENDAN FØRER TIL 'tilberedes', IKKE 'ny'. Kortet HAR været
     set — det var derfor, nogen trykkede — og en bestilling, der
     lander som ny, ville plinge og lyse op som en, der lige er
     kommet ind. Samme begrundelse som Bestillingers Gendan, der
     fører til 'bekraeftet' og ikke til 'ny'.

     ⚠️ OG DEN ER FOLDET. En åben liste over dagens serverede
     ville skubbe køen ned, og køen er det, skærmen er til.
     ⚠️ KUN I DAG. Hele historikken hører på Historik-fanen; her
     er det fortrydelse, ikke opslag.
     ============================================================ */
  function faerdigeIDag() {
    var iDag = Butik.nu().dato;
    return (Admin.lister.bestillinger || []).filter(function (b) {
      return b.bord_nummer && !b.slettet && FAERDIG[b.status]
        && String(b.oprettet || '').slice(0, 10) === iDag;
    }).sort(function (a, b) {
      return (a.aendret || a.oprettet || '') < (b.aendret || b.oprettet || '') ? 1 : -1;
    });
  }

  function tegnFaerdige() {
    var fold = $('koekken-faerdige-fold');
    var boks = $('koekken-faerdige');
    var titel = $('koekken-faerdige-titel');
    if (!fold || !boks) return;

    var liste = faerdigeIDag();
    /* ⚠️ FOLDEN FINDES KUN, NÅR DER ER NOGET I DEN. En fold, der
       som regel er tom, bliver til udsmykning på en uge — og så
       ses den heller ikke den dag, nogen har trykket forkert. */
    fold.classList.toggle('skjult', !liste.length);
    if (!liste.length) { Admin.tøm(boks); return; }
    if (titel) titel.textContent = '✅ Færdige i dag (' + liste.length + ')';

    Admin.tegnRaekker(boks, liste.map(function (b) {
      return {
        noegle: 'f' + b.id,
        aftryk: [b.status, b.aendret || ''].join('|'),
        byg: function () {
          var r = lav('div', 'koek-faerdig');
          r.appendChild(lav('span', 'koek-faerdig-bord', 'Bord ' + b.bord_nummer));
          r.appendChild(lav('span', 'koek-faerdig-hvad',
            (b.linjer || []).map(function (l) {
              return l.antal + ' × ' + l.navn;
            }).join(' · ')));
          r.appendChild(lav('span', 'koek-faerdig-status',
            navnFor(b.status) || b.status));

          var gendan = lav('button', 'knap sekundaer lille', '↩ Gendan');
          gendan.type = 'button';
          gendan.title = 'Sæt bestillingen tilbage i køen';
          gendan.addEventListener('click', function () {
            gendan.disabled = true;
            videre(b, 'tilberedes', gendan,
              'Bord ' + b.bord_nummer + ' er tilbage i køen.');
          });
          r.appendChild(gendan);
          return r;
        },
      };
    }));
  }

  function tegnKoekken() {
    var boks = $('koekken-liste');
    if (!boks) return;

    /* ⚠️ TALLET PÅ FANEN TÆLLER HELE KØEN, IKKE DET FILTREREDE.
       Et zonefilter, der også skruede ned for tallet i søjlen,
       ville skjule tre borde på molen for den, der kigger på
       terrassen — og så holder man op med at stole på tallet. */
    var alt = koeen();
    var maerke = $('koekken-antal');
    if (maerke) {
      maerke.textContent = alt.length || '';
      maerke.classList.toggle('skjult', !alt.length);
    }

    tegnLinje();
    tegnObs();
    tegnZoner();
    tegnBorde();
    tegnFaerdige();

    var liste = vistKoe();

    if (!liste.length) {
      Admin.tøm(boks);
      /* Tomt er et SVAR, ikke en tom skærm. Står der ingenting,
         tror man, at skærmen er gået i stå — og så begynder nogen
         at genindlæse midt i en frokost. */
      boks.appendChild(lav('p', 'vare-tekst', zoneFilter !== 'alle'
        ? 'Ingenting fra ' + zoneFilter + ' lige nu. Tryk "Alle zoner" for '
          + 'at se resten.'
        : 'Ingen bestillinger fra bordene lige nu. Skærmen siger selv til.'));
      /* ⚠️ OG KØEN ER TOM — det skal skrives ned, MEN kun hvis vi
         faktisk har hentet.

         Første udgave satte kendte = [] her uden videre. Den
         rettede én fejl og lavede en anden, og prøverne fangede
         dem begge:

         · Uden linjen blev kendte stående på null hele
           formiddagen, mens skærmen viste "ingen bestillinger" —
           og dagens FØRSTE ordre blev behandlet som en
           førstegangsindlæsning: ingen markering, intet pling.
         · MED linjen uden gardet blev hele køen ved login til
           "nyt": tegnKoekken kører fra vedLogin, FØR
           bestillinger.js har meldt sin liste ind, så den så en
           tom kø, skrev [] ned — og et sekund senere lyste
           tredive kort op og plingede.

         Forskellen er, om listen overhovedet er meldt ind.
         Admin.lister.bestillinger er undefined, til den er. */
      if (hentet()) kendte = [];
      return;
    }

    /* Række for række, så et kort, der ikke har ændret sig, bliver
       STÅENDE. Rives listen ned og bygges op, mister køkkenet det
       kort, fingeren var på vej ned mod. Se Admin.tegnRaekker. */
    Admin.tegnRaekker(boks, liste.map(function (b) {
      return {
        noegle: String(b.id),
        /* Zonen er med i aftrykket, fordi bordlisten kan lande
           EFTER kortet er tegnet: uden den ville zonen først dukke
           op, næste gang bestillingen ændrede sig. */
        /* Naboen skal med i aftrykket: bliver bestillingen ved
           lugen afhentet, skal advarslen her forsvinde med den. */
        aftryk: [b.status, b.intern_note || '', b.aendret || '',
          zonen(b.bord_nummer), runde(b), maalTid(),
          (Admin.sammeGaest ? Admin.sammeGaest(b) : [])
            .map(function (x) { return x.id + ':' + x.status; }).join(',')].join('|'),
        byg: function () { return kort(b); },
      };
    }));

    /* DET NYE SKAL KUNNE SES, ikke kun høres. Markeringen sættes
       EFTER optegningen: kortet skal findes i siden, før det kan
       få klassen på. */
    var nu = liste.map(function (b) { return String(b.id); });
    if (kendte) {
      var nye = nu.filter(function (id) { return kendte.indexOf(id) === -1; });
      nye.forEach(function (id) {
        var k = boks.querySelector('[data-raekke="' + id + '"]');
        if (k) k.classList.add('linje-ny');
      });
      if (nye.length) pling();
    }
    kendte = nu;
  }

  /* ÉT TRYK SKAL FLYTTE KORTET, IKKE BARE GEMME.

     Admin.gem henter INDSTILLINGERNE igen — ikke bestillingerne.
     Køen lever af Admin.lister.bestillinger, som bestillinger.js
     melder ind, så et gem uden en ny hentning ville lade kortet
     stå med det gamle trin, til frisk.js' takt indhentede det et
     minut senere. Et minut er en evighed i et køkken: personalet
     trykker igen, og bestillingen springer et trin over.

     Admin.friskOp henter alle listerne og giver et løfte tilbage;
     når det er indfriet, HAR meld() tegnet køen om. Først dér
     kvitteres der. Går det galt, kommer knappen tilbage — ellers
     står køkkenet med et dødt kort. */
  function videre(b, status, knap, besked) {
    return Butik.skrive.bestillingStatus(b.id, status)
      .then(function () { return Admin.friskOp(); })
      .then(function () { Admin.kvitter(besked); })
      .catch(function (e) {
        knap.disabled = false;
        var m = e && e.message || String(e);
        /* Indtil supabase/restaurant.sql er kørt, kender databasen
           hverken 'tilberedes' eller 'serveret' — og så skal der stå
           HVAD man gør, ikke en rå constraint-fejl. */
        if (/bestilling_status_ok/.test(m)) {
          m = 'Databasen kender ikke "' + navnFor(status) + '" endnu. '
            + 'Kør supabase/restaurant.sql i Supabase først.';
        }
        Admin.brøl(m);
      });
  }

  function kort(b) {
    var t = trinFor(b.status) || TRIN[0];
    var min = minutterSiden(b.oprettet);
    var sent = min !== null && min >= maalTid();

    var k = lav('div', 'koek-kort' + (sent ? ' sent' : ''));
    k.setAttribute('data-bord', b.bord_nummer);

    var top = lav('div', 'koek-top');
    var hvem = lav('div', 'koek-hvem');
    hvem.appendChild(lav('div', 'koek-bord', 'Bord ' + b.bord_nummer));
    var z = zonen(b.bord_nummer);
    if (z) hvem.appendChild(lav('div', 'koek-zone', z));

    /* Runde 2 er dessert til nogen, der allerede sidder og spiser
       — ikke et nyt bord, der venter på sin frokost. Mærket står
       kun fra runde 2: "RUNDE 1" på hvert eneste kort ville være
       et ord, ingen læser. */
    var r = runde(b);
    if (r > 1) hvem.appendChild(lav('span', 'koek-runde', 'Runde ' + r));
    top.appendChild(hvem);

    /* ⚠️ URET ER DET, KØKKENET HANDLER PÅ, og det skal kunne
       læses på to meters afstand fra en gryde. Klokkeslættet er
       flyttet ned i foden: det er en oplysning til den, der
       undersøger noget bagefter, ikke til den, der laver mad nu. */
    var ur = lav('div', 'koek-ur');
    /* ⚠️ ET URTEGN OG IKKE ET EMOJI. Pillen bliver rød med hvid
       skrift, når bordet har ventet for længe, og et farvet emoji
       på rød bund er en klat. Første udgave prøvede at affarve
       det med et CSS-filter, og MÅLT på et skud blev 🕐 til en hvid
       cirkel uden visere. En tegning, der arver currentColor,
       skifter farve med pillen af sig selv. */
    var tegn = lav('span', 'koek-urtegn');
    tegn.setAttribute('aria-hidden', 'true');
    tegn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/>'
      + '<path d="M12 7v5.2l3.2 1.9"/></svg>';
    ur.appendChild(tegn);
    ur.appendChild(lav('span', 'koek-min', min === null ? '—' : min + ' min'));
    top.appendChild(ur);
    k.appendChild(top);

    var linjer = lav('div', 'koek-linjer');
    (b.linjer || []).forEach(function (l) {
      var r = lav('div', 'koek-linje');
      r.appendChild(lav('b', null, (l.antal || 1) + ' ×'));
      r.appendChild(lav('span', null,
        l.navn + (l.variant ? ' · ' + l.variant : '')));
      linjer.appendChild(r);
    });
    k.appendChild(linjer);

    /* NOTEN ER DET VIGTIGSTE PÅ KORTET. "Uden remoulade" og
       "allergi" er ikke en detalje — det er forskellen på en
       middag og en ambulance. Derfor står den fremhævet og ikke
       som en linje mere.

       ⚠️ OG EN ALLERGI ER IKKE EN NOTE. Gæsten skriver den i sit
       eget felt ved bordet, og js/bestilling.js sætter "ALLERGI:"
       foran. Kendingen bor i Admin.erAllergi, fordi Bestillinger
       og Overblik spørger om det samme — se noten dér. Kortet får
       en rød kant og et mærke, så det ikke kan skimmes forbi i en
       travl frokost. */
    /* ⚠️ HAR DE ALLEREDE BESTILT VED LUGEN I DAG?

       Den anden halvdel af den samme fælde: gæsten har bestilt på
       hjemmesiden til kl. 14, er kommet ned, har fået et bord og
       bestiller nu fra QR-koden. Køkkenet laver maden her — og
       den samme mad står stadig ved lugen og venter.

       Linjen siger det og dømmer ikke: systemet kan ikke vide, om
       det er den samme mad eller en runde mere, og et gæt ville
       enten spilde mad eller afvise en rigtig bestilling. */
    var ogsaa = (Admin.sammeGaest ? Admin.sammeGaest(b) : [])
      .filter(function (x) { return !x.bord_nummer; });
    if (ogsaa.length) {
      var dobbelt = lav('div', 'koek-note allergi');
      dobbelt.appendChild(lav('b', null, '⚠️ '));
      dobbelt.appendChild(lav('span', null,
        'Samme nummer har også en bestilling ved lugen kl. '
        + ogsaa.map(function (x) {
          return String(x.hent_tid || '').replace(':', '.');
        }).join(' og ')
        + '. Spørg bordet, om det er den samme mad.'));
      k.appendChild(dobbelt);
    }

    if (b.besked) {
      var erAllergi = Admin.erAllergi(b);
      var note = lav('div', 'koek-note' + (erAllergi ? ' allergi' : ''));
      note.appendChild(lav('b', null, erAllergi ? '⚠️ ' : '📝 '));
      note.appendChild(lav('span', null, b.besked));
      k.appendChild(note);
      if (erAllergi) k.classList.add('har-allergi');
    }

    /* ⚠️ ÉN STOR KNAP, OG DEN FYLDER HELE BREDDEN.

       MÅLT på skærmen som den var: den næste handling stod som en
       knap blandt tre ting på den samme linje — status, beløb,
       videre, afvis. Det er en skærm, der bruges med en fedtet
       finger, mens man holder en tallerken i den anden hånd, og
       den mest almindelige handling i huset skal være det
       nemmeste sted at ramme. */
    /* ⚠️ SAMME KNAPPER SOM BESTILLINGSKORTET, IKKE EGNE.

       Klasserne (.bestil-handling, .knap.gron, .knap-mere,
       .bestil-mere) er dem, Bestillinger-fanen bruger. Personalet
       skifter mellem de to skærme hele dagen, og to sæt knapper,
       der gør det samme, er to sæt at lære. Egne klasser ville
       desuden skride fra hinanden i det sekund, den ene får en
       rettelse. */
    var handling = lav('div', 'koek-handling bestil-handling');
    var knap = lav('button', 'knap primaer gron koek-knap', t.knap);
    knap.type = 'button';
    knap.addEventListener('click', function () {
      knap.disabled = true;
      videre(b, t.naeste, knap,
        'Bord ' + b.bord_nummer + ': ' + navnFor(t.naeste) + '.');
    });
    handling.appendChild(knap);

    /* ⚠️ DØREN FINDES KUN, NÅR DER ER NOGET BAG DEN. En "···",
       der åbner ingenting, trykker man på én gang og aldrig igen. */
    var mellem = mellemFor(b.status);
    if (mellem.length) {
      var skuffe = lav('div', 'bestil-mere');
      var mere = lav('button', 'knap-mere', '\u00B7\u00B7\u00B7');
      mere.type = 'button';
      mere.setAttribute('aria-expanded', 'false');
      mere.setAttribute('aria-label', 'Flere handlinger for bord ' + b.bord_nummer);
      mellem.forEach(function (m) {
        var b2 = lav('button', 'knap sekundaer', m.knap);
        b2.type = 'button';
        b2.addEventListener('click', function () {
          b2.disabled = true;
          videre(b, m.naeste, b2,
            'Bord ' + b.bord_nummer + ': ' + navnFor(m.naeste) + '.');
        });
        skuffe.appendChild(b2);
      });
      mere.addEventListener('click', function () {
        var åben = skuffe.classList.toggle('aaben');
        mere.setAttribute('aria-expanded', åben ? 'true' : 'false');
      });
      handling.appendChild(mere);
      handling.appendChild(skuffe);
    }
    k.appendChild(handling);

    var bund = lav('div', 'koek-bund');
    bund.appendChild(lav('span', 'koek-status', t.navn));
    bund.appendChild(lav('span', 'koek-kl', 'bestilt ' + klokken(b.oprettet)));

    var kr = beloeb(b);
    /* ⚠️ DER STÅR IKKE "BETALT", OG DET MÅ DER ALDRIG KOMME TIL.

       Der er ingen betaling i systemet — afklaret af Mikkel 25/8:
       "de gør det via kassen ved at tage tingene ind manuelt."
       Forlægget til den her skærm skrev "betalt 280,-" under hvert
       kort, og det er en påstand, ingen har dækning for: en
       tallerken, der bæres ud til et bord, som personalet TROR har
       betalt, er penge ud ad døren. Beløbet er en huskeseddel til
       den, der tager imod ved lugen. */
    if (kr) bund.appendChild(lav('span', 'koek-kr', kr + ' · betales ved lugen'));

    /* AFVIS ER IKKE ET TRIN, DET ER EN UNDTAGELSE — derfor står
       den til sidst og i den dæmpede stil. Er retten udsolgt, skal
       gæsten vide det, mens hun sidder der; personalet går ud og
       siger det. Systemet kan ikke sige det for dem, og det lover
       det heller ikke. */
    var afvis = lav('button', 'knap fare lille koek-afvis', 'Kan ikke laves');
    afvis.type = 'button';
    afvis.addEventListener('click', function () {
      if (!window.confirm('Afvis bestillingen til bord ' + b.bord_nummer + '?\n\n'
        + 'Gæsten sidder ved bordet og får ingen besked af systemet — '
        + 'gå ud og sig det.')) return;
      afvis.disabled = true;
      videre(b, 'afvist', afvis,
        'Bord ' + b.bord_nummer + ' er afvist. Husk at sige det ved bordet.');
    });
    bund.appendChild(afvis);

    k.appendChild(bund);
    return k;
  }

  // ----------------------------------------------------------
  //  KONTAKTEN OG VENTETIDEN
  // ----------------------------------------------------------
  function tegnRestaurant() {
    var i = Admin.data.indstillinger || {};
    /* ÅBEN SOM STANDARD. En kontakt, ingen har rørt, må ikke kunne
       slukke for noget, der virkede i går. */
    if ($('bord-aaben')) $('bord-aaben').checked = i.bordbestilling_aaben !== false;
    if ($('bord-ventetid')) {
      $('bord-ventetid').value = i.bord_ventetid_min === undefined
        ? '' : i.bord_ventetid_min;
    }
    /* Og TOMT som standard for loftet, af samme grund: et tal, der
       kom af sig selv, ville lukke for bestillinger, ingen har
       bedt om at lukke for. */
    if ($('bord-loft')) {
      $('bord-loft').value = i.bord_loft_pr_kvarter === undefined
        || i.bord_loft_pr_kvarter === null ? '' : i.bord_loft_pr_kvarter;
    }
    if ($('bord-pr-ordre')) {
      $('bord-pr-ordre').value = i.bord_ventetid_pr_ordre_min === undefined
        || i.bord_ventetid_pr_ordre_min === null
        ? '' : i.bord_ventetid_pr_ordre_min;
    }
  }

  if ($('bord-aaben')) {
    $('bord-aaben').addEventListener('change', function () {
      var til = $('bord-aaben').checked;
      Admin.gem(Butik.skrive.indstilling('bordbestilling_aaben', til),
        til ? 'Bordene kan bestille igen.'
            : 'Bordbestilling er lukket. Det, der er i køen, kører færdigt.');
    });
  }

  /* ÉT autogem PÅ HELE KORTET, og det samler BEGGE felter.
     Admin.autogem lytter på roden, så to kald på det samme kort
     ville betyde, at et tryk i ventetidsfeltet også skrev loftet
     — og omvendt. Rækkefølgen er ligegyldig; det er ét gem. */
  if ($('bord-ventetid') || $('bord-loft')) {
    var kortet = ($('bord-ventetid') || $('bord-loft')).closest('.kort');
    Admin.autogem(kortet, function () {
      var v = $('bord-ventetid') ? $('bord-ventetid').value.trim() : '';
      var l = $('bord-loft') ? $('bord-loft').value.trim() : '';

      var vent = null;
      if (v !== '') {
        var n = Number(v);
        if (!isFinite(n) || n < 0 || n > 180) return 'Ventetiden skal være 0–180 minutter.';
        vent = Math.round(n);
      }

      /* Tomt OG nul betyder begge "intet loft". Skrev nogen 0 for
         at slå det fra, må det ikke blive til "ingen ordrer
         overhovedet" — det ville lukke bordene i stilhed.
         Databasen læser det samme sted (mosede_bord_loft). */
      var loft = null;
      if (l !== '') {
        var m = Number(l);
        if (!isFinite(m) || m < 0 || m > 99) return 'Loftet skal være 0–99 ordrer.';
        loft = m > 0 ? Math.round(m) : null;
      }

      var p = $('bord-pr-ordre') ? $('bord-pr-ordre').value.trim() : '';
      var prOrdre = null;
      if (p !== '') {
        var q = Number(p);
        if (!isFinite(q) || q < 0 || q > 30) return 'Tillægget skal være 0–30 minutter.';
        prOrdre = q > 0 ? Math.round(q) : null;
      }

      return Butik.skrive.indstilling('bord_ventetid_min', vent)
        .then(function () {
          return Butik.skrive.indstilling('bord_loft_pr_kvarter', loft);
        })
        .then(function () {
          return Butik.skrive.indstilling('bord_ventetid_pr_ordre_min', prOrdre);
        });
    });
  }

  /* URET SKAL TIKKE. Ventetiden er tallet, køkkenet handler på, og
     et tal, der står stille, indtil nogen henter data, er et tal,
     der lyver. Ét minut er nok: kortene skifter kun, når minuttet
     gør. */
  setInterval(function () {
    if ($('admin') && !$('admin').classList.contains('skjult')) tegnKoekken();
  }, 60000);

  /* Vejen til bordene og QR-koderne. Skærmen her VISER
     bestillingerne; bordene selv oprettes, slukkes og printes på
     Borde-fanen, og køkkenet skal kunne komme derhen uden at lede
     i søjlen. Den opretter ikke selv noget — ét sted at oprette et
     bord er nok. */
  if ($('koekken-til-borde')) {
    $('koekken-til-borde').addEventListener('click', function () {
      Admin.visFane('p-borde');
    });
  }

  Admin.tegnere.push(function () { tegnRestaurant(); tegnKoekken(); });

  /* "Opdateret kl. 14.32" skrives kun, når der FAKTISK er hentet.
     Uret ovenfor tegner også om hvert minut, og skrev den linjen,
     ville den love en hentning, der ikke havde fundet sted — og
     så kunne skærmen stå med en død forbindelse og se sprællevende
     ud. Køkkenet henter ikke selv: bestillinger.js gør det og
     melder listen ind. */
  var sidsteListe = null;
  Admin.efterHent.push(function () {
    tegnKoekken();
    /* efterHent fyrer, hver gang EN fane melder — også borde og
       forespørgsler. Kun bestillingernes egen hentning må stemple
       linjen, og den kendes på, at listen er et nyt objekt. */
    if (Admin.lister.bestillinger === sidsteListe) return;
    sidsteListe = Admin.lister.bestillinger;
    Admin.hentet('koekken-hentet');
  });
  Admin.vedLogin.push(tegnKoekken);
})();
