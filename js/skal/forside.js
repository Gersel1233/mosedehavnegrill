/* ============================================================
   FORSIDEN — KOBLINGEN, IKKE SKALLEN

   Designet fra Claude Design er facitlisten (23/8). Denne fil
   laver INGEN opmærkning om: den finder de elementer, der
   allerede står i index.html, og skriver forretningens rigtige
   tal ind i dem. Skal du bruge et nyt element, hører det til i
   designet — ikke her.

   TO REGLER, OG DE ER BEGGE BETALT MED FEJL ANDRE STEDER:

   1) Vi overskriver kun, når databasen har noget at sige.
      Står der ingen dagens ret, skjuler afsnittet sig — det
      skriver ikke "ingen ret i dag" hen over designet. Og en
      pris, forretningen ikke har sat, får lov at stå som
      designets pladsholder, indtil ejeren retter den i admin.

   2) Er elementet der ikke, sker der ingenting.
      Sidens opmærkning kan blive rettet af Mikkel i morgen, og
      en kobling, der kaster en fejl, fordi en <p> er flyttet,
      tager resten af forsiden med sig ned. Hver funktion tjekker
      selv efter — derfor står der ikke ét udråbstegn i filen.

   Afsnittene "Ugen der kommer" og bestillingsformularen røres
   IKKE her. Ugeplanen har ingen tabel endnu, og formularen er
   sit eget trin.
   ============================================================ */

(function () {
  'use strict';

  // Ingen motor på siden = ingen kobling. Skallen står som den er.
  if (!window.Butik) return;

  var MÅNEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december'];

  function find(vælger, rod) {
    try { return (rod || document).querySelector(vælger); } catch (e) { return null; }
  }

  function skriv(el, tekst) {
    if (el && tekst) el.textContent = tekst;
  }

  /* Nye elementer er USYNLIGE, til nogen ser på dem.
     .rev står med opacity:0 i designet, og havnegrillen.js
     sætter .in på ved indfald. Den kigger kun på de elementer,
     der var der ved indlæsningen — nyhedskort, vi laver bagefter,
     kender den ikke. Uden det her ville kortene stå usynlige, til
     gæsten tilfældigvis rullede, og en prøve på teksten ville
     stadig bestå. */
  function indfald(el) {
    if (typeof io !== 'undefined' && io && el) {
      try { io.observe(el); } catch (e) { /* ingen iagttager, ingen skade */ }
    }
  }

  function skjul(el) {
    /* style og ikke hidden-attributten: .music har display:flex i
       stylesheetet, og en klasse med display slår browserens egen
       regel for [hidden]. Så ville afsnittet blive stående. */
    if (el) el.style.display = 'none';
  }

  /* "2026-08-23" → "23. august". Designet skriver datoer sådan
     tre steder (nyhedskort, dagens ret, musikbanner), så det er
     én funktion og ikke tre. */
  function pænDato(iso, medUgedag) {
    if (!iso) return '';
    var d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z');
    if (isNaN(d.getTime())) return '';
    var ud = d.getUTCDate() + '. ' + MÅNEDER[d.getUTCMonth()];
    if (!medUgedag) return ud;
    var uge = Butik.UGEDAGE[(d.getUTCDay() + 6) % 7];
    return uge.toLowerCase() + ' d. ' + ud;
  }

  /* Designet skriver prisen som "95,-" ved dagens ret og som
     "199 kr." ved tapasfadet. Det er to formater i det samme
     design, og de skal blive ved med at være det — derfor to
     kald, ikke ét fælles "pænt tal". */
  function kroner(p, form) {
    if (p === null || p === undefined || p === '') return '';
    var n = Number(p);
    if (!isFinite(n)) return '';
    var tal = (n % 1 === 0) ? String(n) : n.toFixed(2).replace('.', ',');
    return form === 'kr' ? tal + ' kr.' : tal + ',-';
  }

  // ----------------------------------------------------------
  //  HEROENS STATUSPILLE
  //  ----------------------------------------------------------
  //  Prikken bliver stående, som den er tegnet. Designet har KUN
  //  én prikfarve (#f0a03c), og en grøn "åben"-prik ville være
  //  en tilføjelse til designet, ikke en kobling.
  // ----------------------------------------------------------
  function visStatus(d) {
    var pille = find('.hero .status');
    if (!pille) return;
    var s = Butik.status(d);
    var tekst = s.overskrift + (s.detalje ? ' · ' + s.detalje : '');
    // Prikken er et element inde i pillen og skal overleve.
    var prik = find('.dot', pille);
    pille.textContent = tekst;
    if (prik) pille.insertBefore(prik, pille.firstChild);
  }

  // ----------------------------------------------------------
  //  STRIBEN ØVERST — den besked, der ikke hører til én dag
  //  ----------------------------------------------------------
  //  Personalet skriver den på Beskeder-fanen: "vi holder ferie i
  //  uge 34". Den har ingen dato og bliver stående, til nogen
  //  slår den fra.
  //
  //  ⚠️ INDTIL 28/8 STOD DEN INGEN STEDER. Feltet fandtes, hakket
  //  fandtes, og det hele gemte pænt — men teksten kom aldrig ud
  //  på siden. Det værste ved den slags er ikke, at den ikke
  //  virker: det er, at personalet TROR den virker, og så står
  //  gæsten ved en lukket luge.
  //
  //  ⚠️ TO TING SKAL VÆRE SANDE. Hakket skal være sat, OG der
  //  skal stå noget. Et slået-til-flueben over et tomt felt er
  //  ikke en besked, og en stribe uden tekst er en rød streg,
  //  ingen kan forklare.
  //
  //  ⚠️ textContent og ikke innerHTML — samme grund som nedenfor:
  //  det er personalets frie tekst.
  // ----------------------------------------------------------
  function visTopstribe(d) {
    var boks = document.getElementById('topstribe');
    if (!boks) return;

    var b = (d && d.indstillinger && d.indstillinger.dagens_besked) || {};
    var tekst = String(b.tekst || '').trim();
    if (!b.vis || !tekst) { boks.hidden = true; return; }

    var p = document.getElementById('topstribe-tekst');
    if (p) p.textContent = tekst;
    boks.hidden = false;
  }

  // ----------------------------------------------------------
  //  DAGENS BESKED
  //  ----------------------------------------------------------
  //  Personalet skriver den på Kalender-fanen ved den enkelte
  //  dag, og den handler om NU: "i dag er der kun mad ud af
  //  huset", "vi lukker 15 på grund af et selskab".
  //
  //  ⚠️ EN TOM BESKED FINDES IKKE. Er der ingen række på dagen,
  //  eller er teksten tom, skjuler afsnittet sig — et banner uden
  //  indhold er en side, der ser i stykker ud. Samme regel som
  //  musikbanneret nedenfor.
  //
  //  ⚠️ Og der skrives med textContent, ikke innerHTML. Feltet er
  //  personalets frie tekst, og den skal kunne indeholde hvad som
  //  helst uden at kunne lave om på siden.
  // ----------------------------------------------------------
  function visDagsbesked(d) {
    var boks = document.getElementById('dagsbesked');
    if (!boks) return;

    var r = Butik.dagsregel ? Butik.dagsregel(d, Butik.nu().dato) : null;
    var tekst = r && String(r.besked_til_gaester || '').trim();
    if (!tekst) { boks.hidden = true; return; }

    var titel = document.getElementById('dagsbesked-titel');
    var krop = document.getElementById('dagsbesked-tekst');
    var dag = document.getElementById('dagsbesked-dag');

    /* Titlen er personalets egen. Har de ikke skrevet en, står
       der "I dag" — og ikke en tom overskrift, som ville efterlade
       et hul over teksten. */
    if (titel) titel.textContent = String(r.besked_titel || '').trim() || 'I dag';
    if (krop) krop.textContent = tekst;
    if (dag) dag.textContent = pænDag(Butik.nu().dato);

    boks.hidden = false;
  }

  /* "Torsdag d. 27. august". Skrevet her og ikke hentet fra
     Admin.pænDato: den bor i personalesiden, og gæstesiden må
     ikke afhænge af en fil, den ikke indlæser. */
  function pænDag(iso) {
    var UGE = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag',
      'Fredag', 'Lørdag'];
    var MDR = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli',
      'august', 'september', 'oktober', 'november', 'december'];
    var t = iso.split('-');
    var dato = new Date(Date.UTC(+t[0], +t[1] - 1, +t[2]));
    return UGE[dato.getUTCDay()] + ' d. ' + (+t[2]) + '. ' + MDR[+t[1] - 1];
  }

  // ----------------------------------------------------------
  //  MUSIKBANNERET
  //  ----------------------------------------------------------
  //  Det viser det NÆSTE offentlige arrangement fra kalenderen.
  //  Er der ingen, findes banneret ikke: et banner om musik på
  //  havnen, hvor der ikke er nogen musik, sender folk forgæves.
  // ----------------------------------------------------------
  function visMusik(d) {
    var boks = find('.music');
    if (!boks) return;

    var i_dag = Butik.nu().dato;
    var næste = (d.kalender || [])
      .filter(function (k) {
        return k.type === 'arrangement' && k.offentlig
          && (k.slut_dato || k.dato) >= i_dag;
      })
      .sort(function (a, b) { return a.dato < b.dato ? -1 : 1; })[0];

    if (!næste) return skjul(boks);

    skriv(find('h4', boks), næste.titel + ' · ' + pænDato(næste.dato, true));
    var p = find('p', boks);
    if (p) {
      if (næste.beskrivelse) p.textContent = næste.beskrivelse;
      else skjul(p);
    }
  }

  // ----------------------------------------------------------
  //  DAGENS RET
  //  ----------------------------------------------------------
  //  Retten sættes i admin → Forside. Er feltet tomt, er der
  //  ingen dagens ret i dag, og så skjuler afsnittet sig —
  //  designets "Stegt flæsk med persillesovs" er en pladsholder,
  //  og den må ikke stå der som dagens ret en tirsdag i januar.
  //
  //  Linjen "Fra grillen · 11.30–14.00" står urørt: der er ikke
  //  noget felt i admin, den kan komme fra. Skal den kunne
  //  rettes, er det et felt mere på Forside-fanen.
  // ----------------------------------------------------------
  function visDagensRet(d) {
    var afsnit = document.getElementById('idag');
    if (!afsnit) return;

    /* Designet har tegnet ÉT kort. Er der to retter i dag, sættes
       den første i kortet og resten som en linje under — det er
       et valg og ikke to kort, for skallen er facitlisten, og et
       kort mere ville være en ændring af den. */
    var retter = Butik.dagensRetter(d);
    var ret = retter[0];
    if (!ret) return skjul(afsnit);

    skriv(find('.eyebrow', afsnit), pænDato(Butik.nu().dato, true)
      .replace(/^./, function (c) { return c.toUpperCase(); }));
    skriv(find('.today h3', afsnit), ret.navn + (ret.udsolgt ? ' · udsolgt' : ''));

    var p = find('.today p', afsnit);
    if (p) {
      var linjer = [];
      if (ret.beskrivelse) linjer.push(ret.beskrivelse);
      /* "Kun 3 tilbage" — og tallet tælles ned af DATABASEN ved
         hver bestilling, ikke af et menneske med en blyant. Se
         supabase/dagens-retter.sql. */
      if (!ret.udsolgt && ret.antal_tilbage !== null
          && ret.antal_tilbage !== undefined && ret.antal_tilbage <= 5) {
        linjer.push('Kun ' + ret.antal_tilbage + ' tilbage.');
      }
      retter.slice(1).forEach(function (r) {
        linjer.push('Eller: ' + r.navn
          + (r.udsolgt ? ' (udsolgt)' : (r.pris ? ' — ' + kroner(r.pris) : '')));
      });
      if (linjer.length) p.textContent = linjer.join(' ');
      else skjul(p);
    }

    var pris = find('.today .price', afsnit);
    if (pris) {
      /* Ingen pris = ingen prisplads. Designets "95,-" er en
         pladsholder, og et forkert tal ved siden af en
         bestil-knap er værre end intet tal. */
      if (ret.pris === null || ret.pris === undefined) skjul(pris);
      else pris.textContent = kroner(ret.pris);
    }
  }

  // ----------------------------------------------------------
  //  NYHEDERNE
  //  ----------------------------------------------------------
  //  Kortet i designet er skabelonen: vi kopierer det første og
  //  fylder det ud. Så følger nye nyheder designet af sig selv,
  //  også den dag kortet får en skygge mere.
  // ----------------------------------------------------------

  /* ⚠️ TEGNENE STÅR TO STEDER: her og i SLAGS i
     js/admin/nyheder.js. Kun de fem, databasen kender (se
     nyhed_slags_ok). En slags uden et tegn falder tilbage på 📣 —
     en tom firkant er dét, hele øvelsen handler om at komme af
     med. */
  var NYHED_TEGN = {
    musik: '🎵', ret: '🍽️', tider: '🕐', begivenhed: '🎉', andet: '📣',
  };

  function visNyheder(d) {
    var afsnit = document.getElementById('nyheder');
    var liste = find('.newslist', afsnit || document);
    if (!afsnit || !liste) return;

    /* Vinduet afgøres af Butik.nyhedSynlig — ét sted, så
       forsiden, nyhedssiden og admin ikke kan blive uenige om,
       hvad gæsten ser. Tom fra/til betyder altid. */
    var nyheder = (d.nyheder || []).filter(function (n) {
      return Butik.nyhedSynlig(n);
    });
    if (!nyheder.length) return skjul(afsnit);

    var skabelon = find('.nw', liste);
    if (!skabelon) return;

    /* Fire er nok på en forside. Tavlen ved lugen viser det
       nyeste, ikke arkivet — og et forsideafsnit med fjorten
       opslag er en blog, ikke en nyhed. */
    nyheder = nyheder.slice(0, 4);

    liste.textContent = '';
    nyheder.forEach(function (n, i) {
      var kort = skabelon.cloneNode(true);
      // Forsinkelsen på indfaldet står i designets klasser d1/d2.
      kort.className = 'nw rev' + (i ? ' d' + Math.min(i, 3) : '');
      /* ⚠️ DEN TOMME BEIGE FIRKANT.

         Designet har en <image-slot> øverst på hvert kort — 170 px
         høj, flad --cream2. Uden et foto var det bogstavelig talt
         en tom kasse på forsiden, og det var dét, kunden kaldte
         "bare standard billede og tekst" (26/8).

         Nu to udfald:
         · er der et FOTO, står det
         · ellers slagsens eget felt — tegnet på en flade i
           havnens farver. Ikke et pladsholderbillede: en forside,
           der ser lavet ud, også uden et foto

         ⚠️ OG EN NYHED UDEN SLAGS FÅR OGSÅ ET FELT (29/8).
         Første udgave lod pladsen stå, når slagsen manglede — og
         slagsen mangler, indtil ejeren har kørt
         supabase/nyheder-slags-og-billede.sql. Altså: præcis i
         den situation, hvor kolonnen ikke er der, stod der en
         stiplet grå kasse på forsiden. Det var det, kunden
         kaldte "kedeligt hele vejen ned" (29/8).

         📣 lover ingenting om nyhedens indhold — det er derfor,
         det er det rigtige tegn at falde ned på. */
      var plads = find('image-slot', kort);
      if (plads) {
        plads.id = 'nyhed-' + (i + 1);
        if (n.billede) {
          var foto = document.createElement('img');
          foto.className = 'nw-foto';
          foto.src = n.billede;
          foto.alt = '';
          foto.loading = 'lazy';
          plads.parentNode.replaceChild(foto, plads);
        } else {
          /* ⚠️ ELEMENTET SKIFTES UD, ikke fyldes. <image-slot> er
             en rigtig komponent med sin egen indmad — sætter man
             tekst i den, står tegnet oven i dens "Foto eller
             opslag / or browse files / Replace / Remove". Målt af
             prøven: kortet viste 🎵 efterfulgt af hele
             pladsholderens brugerflade. */
          var slags = n.slags || 'andet';
          var felt = document.createElement('div');
          felt.className = 'nw-felt s-' + slags;
          felt.setAttribute('aria-hidden', 'true');
          felt.textContent = NYHED_TEGN[slags] || NYHED_TEGN.andet;
          plads.parentNode.replaceChild(felt, plads);
        }
      }
      skriv(find('.when', kort), pænDato(n.dato));
      skriv(find('h3', kort), n.titel);
      skriv(find('p', kort), n.tekst);
      liste.appendChild(kort);
      indfald(kort);
    });

    /* Er afsnittet allerede på skærmen — på en bred skærm er det
       tit — skal kortene ind med det samme og ikke først ved
       første rul. */
    if (typeof revealFallback === 'function') {
      revealFallback(document.getElementById('sc'));
    }
  }

  // ----------------------------------------------------------
  //  ÅBNINGSTIDERNE
  //  ----------------------------------------------------------
  //  Designet grupperer ens dage ("Mandag – torsdag  10–20") og
  //  giver dagen i dag sin egen røde linje. Begge dele er
  //  bevaret: vi bryder altid gruppen ved i dag, så linjen
  //  "Søndag (i dag)" findes, uanset hvordan ugen er sat op.
  //
  //  Linjen "Ishuset i højsæson · til 22" forsvinder, når
  //  tabellen styrer listen: der er én ugeplan i databasen, ikke
  //  to. Skal ishuset have sine egne tider, er det en tabel mere
  //  — ikke en linje, koden finder på.
  // ----------------------------------------------------------
  function visTider(d) {
    var boks = find('.hours');
    if (!boks) return;

    var tider = d.aabningstider || [];
    if (!tider.length) return;

    var i_dag = Butik.nu().ugedag;

    function tid(a) {
      if (!a || a.lukket) return 'Lukket';
      // "10:00" → "10", "11:30" → "11.30". Sådan står det i designet.
      var kort = function (t) {
        var v = Butik.pænTid(t);
        return v.slice(3) === '00' ? v.slice(0, 2).replace(/^0/, '') : v.replace(':', '.');
      };
      return kort(a.aabner) + '–' + kort(a.lukker);
    }

    var rækker = [];
    for (var u = 0; u < 7; u++) {
      var dag = tider.filter(function (a) { return a.ugedag === u; })[0];
      var værdi = tid(dag);
      var sidste = rækker[rækker.length - 1];
      /* Slås sammen med den forrige, hvis tiden er den samme —
         men aldrig hen over i dag, og aldrig ind i i dag. */
      if (sidste && sidste.værdi === værdi && !sidste.idag && u !== i_dag) {
        sidste.til = u;
      } else {
        rækker.push({ fra: u, til: u, værdi: værdi, idag: u === i_dag });
      }
    }

    boks.textContent = '';
    rækker.forEach(function (r) {
      var navn = Butik.UGEDAGE[r.fra]
        + (r.til > r.fra ? ' – ' + Butik.UGEDAGE[r.til].toLowerCase() : '')
        + (r.idag ? ' (i dag)' : '');
      var linje = document.createElement('div');
      if (r.idag) linje.className = 'now';
      var a = document.createElement('span');
      a.textContent = navn;
      var b = document.createElement('span');
      b.textContent = r.værdi;
      linje.appendChild(a);
      linje.appendChild(b);
      boks.appendChild(linje);
    });
  }

  // ----------------------------------------------------------
  //  TAPASFADETS PRIS
  //  ----------------------------------------------------------
  //  Kun hvis forretningen HAR sat en pris. Ejerens liste kom
  //  uden ét eneste tal (23/8), så tapasvarerne står med tom
  //  pris i databasen — og indtil de er sat i admin, bliver
  //  designets pladsholder stående. Et opfundet tal ved siden af
  //  en bestil-knap er en pris, gæsten regner med.
  // ----------------------------------------------------------
  function visTapasPris(d) {
    var felt = find('.tapasec .pris');
    if (!felt) return;

    var fad = null;
    (d.menu_varer || []).forEach(function (v) {
      if (fad) return;
      if (v.aktiv === false || v.udsolgt) return;
      if (/tapas/i.test(v.navn) && v.pris !== null && v.pris !== undefined) fad = v;
    });
    if (!fad) return;

    var lille = find('small', felt);
    felt.textContent = kroner(fad.pris, 'kr');
    if (lille) felt.appendChild(lille);
  }

  /* De tomme billedpladser. Reglen bor i js/skal/billedplads.js —
     tapassiden og baglokalets side har den samme kasse, og tre
     kopier ville langsomt tegne tre forskellige flader. */
  function visFotos(d) {
    if (!window.MosedeBilledplads) return;
    window.MosedeBilledplads.fyld((d && d.indstillinger) || {});
  }

  /* Stemningsgalleriet i selskabsafsnittet (29/8): tre fliser,
     der hver blænder roligt mellem to fotos. Admin først
     (foto_stemning_1-6 på Forside-fanen), ellers EJERENS EGNE fra
     repoet (data-fil på flisen, op til to adresser) — hans syv
     fotos kom via GitHub-upload samme dag. Har en flise et
     admin-foto, vinder admin HELE flisen: ejeren har valgt noget
     nyt, og en blanding af nyt og gammelt ville ingen kunne
     forudsige. Uden noget som helst findes galleriet ikke.

     ⚠️ PARRET STÅR PÅ FLISEN (data-par/data-fil), ikke her i
     koden — den, der flytter en flise, tager sine adresser med.
     Med kun ét foto står flisen stille: klassen .to er det, der
     tænder overblændingen i havnegrillen.css. */
  function visStemning(d) {
    var rod = document.getElementById('stemning');
    if (!rod) return;
    var ind = (d && d.indstillinger) || {};
    var fliser = rod.querySelectorAll('.stem-flis');
    var vist = 0;

    Array.prototype.forEach.call(fliser, function (flis) {
      var urls = String(flis.getAttribute('data-par') || '').split(/\s+/)
        .map(function (n) { return String(ind[n] || '').trim(); })
        .filter(Boolean);
      if (!urls.length) {
        urls = String(flis.getAttribute('data-fil') || '').split(/\s+/)
          .map(function (u) { return u.trim(); })
          .filter(Boolean);
      }

      /* Optegningen skal kunne køre igen uden at stable billeder
         oven på hinanden. */
      flis.textContent = '';
      flis.classList.remove('to');

      if (!urls.length) { flis.style.display = 'none'; return; }
      flis.style.display = '';
      vist++;

      urls.slice(0, 2).forEach(function (url, nr) {
        var foto = document.createElement('img');
        foto.className = nr === 0 ? 'stem-a' : 'stem-b';
        foto.src = url;
        /* Alt-teksten er FLISENS (data-alt) og sidder på det
           forreste foto; det bageste er samme motivkreds og får
           tom — to næsten ens oplæsninger er støj. Admin-fotos
           har ingen tekst med, og et gættet alt ville oplyse
           forkert — dér bærer galleriets aria-label det. */
        foto.alt = nr === 0 ? (flis.getAttribute('data-alt') || '') : '';
        foto.loading = 'lazy';
        flis.appendChild(foto);
      });
      if (urls.length > 1) flis.classList.add('to');
    });

    /* style.display og ikke hidden — samme grund som .music:
       .stemning har display:grid i stilarket, og en klasse med
       display slår browserens egen [hidden]-regel. */
    rod.style.display = vist ? '' : 'none';
  }

  /* ⚠️ ÉN SEKTION MÅ IKKE TAGE DE ANDRE MED SIG.

     De syv kald stod som syv linjer i den samme then(), med én
     .catch om det hele. MÅLT 26/8: kaster den ANDEN, køres de fem
     sidste aldrig — dagens ret, nyhederne, åbningstiderne og
     tapasprisen blev stående som designets pladsholdere, og det
     eneste spor var en console.warn, ingen ser.

     Det er nøjagtig den samme fejl som Promise.all i
     Butik.hent(), hvor en manglende tabel væltede hele menuen.
     Her koster den mindre og ser lige så normal ud.

     Hver sektion får sin egen fangst, med sit navn i beskeden. */
  function sikkert(navn, fn, d) {
    try {
      fn(d);
    } catch (fejl) {
      console.warn('Forsidens "' + navn + '" fejlede — resten af siden '
        + 'står som den skal:', fejl);
    }
  }

  Butik.hent().then(function (d) {
    sikkert('status', visStatus, d);
    sikkert('topstribe', visTopstribe, d);
    sikkert('dagens besked', visDagsbesked, d);
    sikkert('musik', visMusik, d);
    sikkert('dagens ret', visDagensRet, d);
    sikkert('nyheder', visNyheder, d);
    sikkert('åbningstider', visTider, d);
    sikkert('tapaspris', visTapasPris, d);
    sikkert('fotos', visFotos, d);
    sikkert('stemning', visStemning, d);
  }).catch(function (fejl) {
    /* Skallen skal stå, også når HENTNINGEN fejler. Fejlen
       skrives i konsollen med navn, så den kan findes — den må
       ikke blive til en tom forside. */
    console.warn('Forsidens kobling fejlede, skallen står som designet:', fejl);
    /* ⚠️ MEN FLADERNE SKAL OP ALLIGEVEL. De fire tomme firkanter
       har ingen data bag sig — tegnet står i HTML'en. Lod vi dem
       stå her, ville en side, hvor hentningen fejlede, være den
       side med FLEST stiplede grå kasser, og det er lige præcis
       den dag, den skal se hel ud.

       Stemningsgalleriet kaldes med vilje IKKE: det starter skjult
       i HTML'en og har hverken flader eller reservefiler — uden
       data findes det ikke, og det er det rigtige også her. */
    sikkert('fotos', visFotos, {});
  });
}());
