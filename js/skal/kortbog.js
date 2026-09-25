/* ============================================================
   KORTBOGEN — DE TRYKTE MENUKORT, MAN KAN BLADRE I  (25/9 2026)
   ------------------------------------------------------------
   Kundens ord: *"selve menukortene ligger inde på se menukort,
   hvor man kan bladre igennem menukortene og stadig klikke ind på
   nogle af tingene ... stadig lige så klogt og veludført en side
   som nu, bare med noget bladringseffekt og andet fedt."*

   ⚠️ KORTET SÆLGER, LISTEN ER SANDHEDEN. Mikkels valg, da han fik
   de to konstruktioner stillet op: billedet er et FOTO af det
   trykte kort, og under det står databasens egen liste, som man
   klikker ind i. Alternativet — klikfelter lagt i hånden oven på
   billedet — blev valgt fra, og grunden skal stå her: teksten på
   kortet er pixels. Retter ejeren en pris i admin, ville felterne
   pege på et tal, der ikke gælder, og ingen ville opdage det.

   ⚠️ DEN HER FIL KENDER KUN BILLEDERNE. Hvilke varer der hører
   til, og hvordan en række tegnes, bor i js/skal/menukort.js, som
   ejer siden. Filen her siger bare, HVILKET kort der er fremme —
   og så tegner den anden sin liste. To filer, ét job hver.

   ⚠️ OG KORTENE ER IKKE EN LISTE OVER SORTIMENTET. Et kort kan
   godt vise noget, siden ikke sælger (kaffe i STOR står på kort
   06 og findes ikke i databasen, målt 25/9). Derfor må listen
   under ALDRIG bygges af kortet — kun af databasen.
   ============================================================ */
window.MosedeKortbog = (function () {
  'use strict';

  /* ------------------------------------------------------------
     DE SYV KORT, GÆSTEN MÅ SE
     ------------------------------------------------------------
     08 og 09 er personalets bestillingslister og 10 er en flyer.
     De hører ikke i et menukort, man bladrer i, og de er derfor
     ikke lagt op.

     `kategorier` er kategoriens navn i admin, som ejeren skriver
     det. Navnet og ikke id'et: en ny database ville have andre
     id'er, og en prøve, der gætter på 13, måler sit eget fikstur.
     Sammenligningen er tolerant for store/små bogstaver og for de
     mellemrum, et navn samler op gennem et år i et tekstfelt.

     `note` står PÅ kortet i gæstens synsfelt og er kun sat, hvor
     billedet og databasen er uenige. Lige nu ét sted:
     håndmadskortet er trykt med 27, databasen siger 24, og
     Mikkels afgørelse 25/9 er, at 24 gælder og kortet skal rettes.
     Uden linjen læser en travl gæst 27 på billedet og 24 lige
     under og tror, det ene er et tilbud.
     ------------------------------------------------------------ */
  var KORTENE = [
    { fil: '01-grillen', titel: 'Fra grillen',
      under: 'Morgenmad, fisk og klassikerne fra pladen',
      kategorier: ['Morgenmad', 'Retter', 'Andre retter'] },
    { fil: '02-alacarte', titel: 'À la carte',
      under: 'Burgere, sandwich og pølser',
      kategorier: ['Burgere', 'Sandwich', 'Pølser'] },
    { fil: '03-smoerrebroed', titel: 'Smørrebrød',
      under: 'Alle varianter, håndmadret og smurt på bestilling',
      kategorier: ['Smørrebrød'] },
    { fil: '04-haandmadder', titel: 'Håndmadder',
      under: 'Den lille udgave — til én hånd',
      note: 'Kortet er trykt med 27,-. Prisen i listen herunder er den, '
          + 'der gælder — det trykte kort bliver rettet.',
      kategorier: ['Håndmadder'] },
    { fil: '05-is', titel: 'Is & sødt',
      under: 'Kugleis, softice, bubblewaffles og pandekager',
      kategorier: ['Kugleis', 'Softice og vafler', 'Ispinde'] },
    { fil: '06-kaffe', titel: 'Kaffe, koldt & knas',
      under: 'Stemplet, rystet og hældt op',
      kategorier: ['Kaffe og varme drikke', 'Sodavand, juice og kakao'] },
    { fil: '07-oel', titel: 'Øl, vin & bar',
      under: 'Fadøl fra hanen og bobler til fest',
      kategorier: ['Øl', 'Vin, cava og champagne', 'Snacks og slik'] },
  ];

  /* Mappen ligger i billeder/ og ikke i menukort/ — MÅLT i
     .github/workflows/deploy.yml: trinnet "Fjern udviklingsfiler"
     sletter `menukort` fra udgivelsen, så kortene ville forsvinde
     i luften uden at fejle nogen steder. */
  var STI = 'billeder/kort/';

  function nøgle(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /* Hvilket kort dækker den her kategori? null, når ingen gør —
     tapasfadet, platterne og tilkøbene står ikke på et trykt kort
     og bliver i listen nedenfor, præcis som i dag. */
  function kortFor(kategoriNavn) {
    var n = nøgle(kategoriNavn);
    for (var i = 0; i < KORTENE.length; i++) {
      for (var j = 0; j < KORTENE[i].kategorier.length; j++) {
        if (nøgle(KORTENE[i].kategorier[j]) === n) return KORTENE[i];
      }
    }
    return null;
  }

  function lav(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = tekst;
    return e;
  }

  /* ============================================================
     BYG BOGEN
     ------------------------------------------------------------
     `rod`      er beholderen i m-menukort.html
     `naarSkift(kort, nr)` kaldes, hver gang et nyt kort er fremme

     ⚠️ KUN NABOERNE HENTES. Syv A4-billeder er 1,2 MB; hentede
     siden dem alle ved indlæsning, ville en telefon på havnen
     bruge sin forbindelse på seks kort, gæsten ikke har bladret
     hen til. Derfor `loading=lazy` PLUS en egen vagt, der sætter
     src på det aktuelle og dets to naboer.
     ============================================================ */
  /* ============================================================
     LUPPEN — KORTET I FULD STØRRELSE  (25/9)
     ------------------------------------------------------------
     ⚠️ MÅLT, OG DET ER GRUNDEN TIL AT DEN FINDES: et A4 i en
     telefonbredde på 390 px gør "Morgen komplet 99,-" til under
     6 px høj skrift. Kortet kan ses, men ikke læses — og et
     menukort, man ikke kan læse, er et billede af et menukort.

     Luppen viser det i en bredde, der KAN læses, og lader
     browseren rulle og knibe selv. Ingen egen zoom-kode: iOS'
     egen er bedre end noget, der kan skrives her, og den virker
     også for den, der har sat tekststørrelsen op i telefonen.
     ============================================================ */
  function byggLup() {
    var lup = document.getElementById('kortlup');
    if (lup) return lup;

    lup = lav('div', 'kortlup');
    lup.id = 'kortlup';
    lup.setAttribute('role', 'dialog');
    lup.setAttribute('aria-modal', 'true');
    lup.hidden = true;

    var rul = lav('div', 'kortlup-rul');
    var img = document.createElement('img');
    img.alt = '';
    rul.appendChild(img);

    var luk = lav('button', 'kortlup-luk', 'Luk');
    luk.type = 'button';

    lup.appendChild(rul);
    lup.appendChild(luk);
    document.body.appendChild(lup);

    function lukLup() {
      lup.hidden = true;
      document.documentElement.classList.remove('kortlup-aaben');
      if (lup.__tilbage && lup.__tilbage.focus) lup.__tilbage.focus();
    }
    luk.addEventListener('click', lukLup);
    /* Et tryk ved siden af lukker — men ikke et tryk PÅ kortet,
       som er dét, man er kommet for. */
    lup.addEventListener('click', function (e) {
      if (e.target === lup || e.target === rul) lukLup();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lup.hidden) lukLup();
    });

    lup.__img = img;
    lup.__luk = luk;
    return lup;
  }

  function aabnLup(kort, tilbage) {
    var lup = byggLup();
    lup.__img.src = STI + kort.fil + '.webp';
    lup.__img.alt = 'Menukortet ' + kort.titel + ' i fuld størrelse';
    lup.__tilbage = tilbage || null;
    lup.hidden = false;
    /* Baggrunden må ikke rulle med: står siden og glider bag
       luppen, mister man sin plads i listen. */
    document.documentElement.classList.add('kortlup-aaben');
    if (lup.__luk.focus) lup.__luk.focus();
  }

  function byg(rod, naarSkift) {
    if (!rod) return null;

    var blade = rod.querySelector('[data-blade]');
    var titelBoks = rod.querySelector('[data-titel]');
    var prikker = rod.querySelector('[data-prikker]');
    var bagKnap = rod.querySelector('[data-bag]');
    var fremKnap = rod.querySelector('[data-frem]');
    if (!blade) return null;

    var nu = 0;
    var laast = false;        /* sand mens fingeren TRÆKKER */
    /* ⚠️ OG ET FLAG, DER OVERLEVER KLIKKET. `laast` nulstilles i
       slip(), som kører på pointerup — ALTSÅ FØR click. Prøvede
       bladet at spørge `laast`, ville hver eneste bladring ende
       med at åbne luppen. Målt: ja, rækkefølgen er den.
       Flaget her sættes ved slip og ryddes først ved næste
       pointerdown, så netop det ene klik bliver spist. */
    var netopTrukket = false;
    var elementer = [];
    var prikElementer = [];

    KORTENE.forEach(function (k, i) {
      var blad = lav('div', 'kortblad');
      blad.setAttribute('data-kort', k.fil);
      var img = document.createElement('img');
      img.alt = 'Menukortet ' + k.titel + ', som det ser ud i caféen';
      img.loading = 'lazy';
      img.decoding = 'async';
      /* Målene står i HTML'en, så pladsen er reserveret, før
         billedet er hentet — ellers hopper hele siden, når det
         lander. A4 stående: 1400 × 1980. */
      img.width = 1400;
      img.height = 1980;
      blad.appendChild(img);
      /* ⚠️ ET TRYK ÅBNER, ET TRÆK GØR IKKE. Uden `laast`-prøven
         ville hver eneste bladring ende med at åbne luppen, fordi
         et træk slutter med et click. */
      blad.addEventListener('click', function () {
        if (laast || netopTrukket) return;
        aabnLup(k, blad);
      });
      blad.setAttribute('role', 'button');
      blad.tabIndex = 0;
      blad.setAttribute('aria-label', 'Se menukortet ' + k.titel + ' i fuld størrelse');
      blad.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aabnLup(k, blad); }
      });
      blade.appendChild(blad);
      elementer.push({ blad: blad, img: img, kort: k });

      if (prikker) {
        var p = lav('button', 'kortprik');
        p.type = 'button';
        p.setAttribute('role', 'tab');
        p.setAttribute('aria-label', k.titel);
        p.addEventListener('click', function () { til(i); });
        prikker.appendChild(p);
        prikElementer.push(p);
      }
    });

    function hent(i) {
      for (var d = -1; d <= 1; d++) {
        var e = elementer[i + d];
        if (e && !e.img.getAttribute('src')) {
          e.img.src = STI + e.kort.fil + '.webp';
        }
      }
    }

    /* ⚠️ STILLINGEN SÆTTES I JS OG IKKE I EN KLASSE PR. PLADS.
       Syv kort ville være syv klasser, og den dag der kommer et
       ottende, ville det stå oven i det syvende uden at fejle.
       Her er det ét regnestykke: afstanden til det aktuelle. */
    function stil(skub) {
      elementer.forEach(function (e, i) {
        var d = i - nu + (skub || 0);
        var abs = Math.abs(d);
        e.blad.classList.toggle('er-fremme', d === 0);
        /* Kun de tre nærmeste tegnes. Resten tages helt ud af
           laget, så browseren ikke holder syv A4-flader i luften. */
        e.blad.style.display = abs > 1.6 ? 'none' : '';
        e.blad.style.zIndex = String(10 - Math.round(abs * 10) / 10);
        e.blad.style.opacity = abs > 1 ? '0' : String(1 - abs * 0.45);
        e.blad.style.transform =
          'translateX(' + (d * 52) + '%) '
          + 'scale(' + (1 - abs * 0.14) + ') '
          + 'rotateY(' + (d * -22) + 'deg)';
      });
    }

    function til(i, stille) {
      i = Math.max(0, Math.min(KORTENE.length - 1, i));
      nu = i;
      hent(i);
      stil(0);
      prikElementer.forEach(function (p, n) {
        p.classList.toggle('valgt', n === i);
        p.setAttribute('aria-selected', n === i ? 'true' : 'false');
      });
      if (bagKnap) bagKnap.disabled = i === 0;
      if (fremKnap) fremKnap.disabled = i === KORTENE.length - 1;

      var k = KORTENE[i];
      if (titelBoks) {
        titelBoks.textContent = '';
        titelBoks.appendChild(lav('h3', 'kortbog-navn', k.titel));
        titelBoks.appendChild(lav('p', 'kortbog-under', k.under));
        /* ⚠️ NOTEN ER IKKE PYNT. Den står kun, hvor billedet og
           databasen er uenige, og den siger hvilken der gælder. */
        if (k.note) titelBoks.appendChild(lav('p', 'kortbog-note', k.note));
      }
      if (naarSkift) naarSkift(k, i, !!stille);
    }

    if (bagKnap) bagKnap.addEventListener('click', function () { til(nu - 1); });
    if (fremKnap) fremKnap.addEventListener('click', function () { til(nu + 1); });

    /* ------------------------------------------------------------
       FINGEREN
       ⚠️ pointer-hændelser og ikke touch: den samme kode bærer
       mus, finger og pen, og en mus på en computer skal kunne
       trække i kortet præcis som en finger.

       ⚠️ OG DEN LODRETTE RULNING MÅ IKKE TAGES FRA GÆSTEN. Først
       når trækket er tydeligt vandret (dobbelt så langt som det
       lodrette), overtager bogen. Ellers ruller siden som altid —
       ar fra bordsiden 18/9, hvor en vandret stribe åd rulningen.
       ------------------------------------------------------------ */
    var x0 = null, y0 = null, bredde = 1;
    blade.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      x0 = e.clientX; y0 = e.clientY; laast = false; netopTrukket = false;
      bredde = blade.getBoundingClientRect().width || 1;
      blade.classList.add('traekker');
    });
    blade.addEventListener('pointermove', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0, dy = e.clientY - y0;
      if (!laast) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dx) < Math.abs(dy) * 2) { x0 = null; blade.classList.remove('traekker'); return; }
        laast = true;
        if (blade.setPointerCapture) { try { blade.setPointerCapture(e.pointerId); } catch (f) { /* ok */ } }
      }
      e.preventDefault();
      stil(-dx / bredde);
    });
    function slip(e) {
      if (x0 === null) { blade.classList.remove('traekker'); return; }
      var dx = (e && e.clientX !== undefined) ? e.clientX - x0 : 0;
      x0 = null;
      blade.classList.remove('traekker');
      /* En femtedel af bredden er nok til at bladre. Mindre, og
         et skub under en rulning ville skifte kort; mere, og man
         skal kaste med tommelen. */
      if (laast && Math.abs(dx) > bredde * 0.2) til(nu + (dx < 0 ? 1 : -1));
      else stil(0);
      netopTrukket = laast;
      laast = false;
    }
    /* ⚠️ PÅ WINDOW OG IKKE PÅ BLADET, og INGEN pointerleave.
       Med setPointerCapture bliver hændelserne rettet mod bladet,
       men `pointerleave` fyrer alligevel, når markøren fysisk
       forlader elementet — og så slap trækket midt i bevægelsen:
       MÅLT, bogen bladrede ikke. Uden capture er det modsatte
       problem: slipper man fingeren uden for bladet, kommer
       pointerup aldrig. Window rammer begge tilfælde. */
    /* ⚠️ pointerleave ER MED MED VILJE. Slipper fingeren uden for
       bladet, FØR trækket har låst sig (de første 8 px), kommer
       pointerup aldrig hertil, og bogen ville hænge i "traekker".

       ⚠️ OG DEN ER IKKE SKYLD I NOGET. En udgave med `window` i
       stedet — fordi setPointerCapture i teorien kan fyre
       pointerleave midt i et træk — blev skrevet og MÅLT 25/9:
       prøven "et træk bladrer" består med begge. Den udgave er
       rullet tilbage igen, for en rettelse, der ikke kan måles,
       er en påstand. Kan nogen fremvise et træk, der slipper her,
       må den gerne komme igen — med målingen. */
    blade.addEventListener('pointerup', slip);
    blade.addEventListener('pointercancel', slip);
    blade.addEventListener('pointerleave', slip);

    /* Tastaturet: pilene bladrer, når bogen har fokus. */
    rod.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); til(nu + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); til(nu - 1); }
    });

    til(0, true);
    return { til: til, nu: function () { return nu; }, antal: KORTENE.length };
  }

  return { KORTENE: KORTENE, kortFor: kortFor, byg: byg, aabnLup: aabnLup, STI: STI };
}());
