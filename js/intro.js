/* ============================================================
   MOSEDE HAVNEGRILL OG ISHUS – intro-animationen

   Havet stiger og fylder ordmærket op mens siden loader. En
   fiskerbåd rider på bølgekammen, en is står som sol på
   horisonten, måger driver i luften. Ved 100% flyder vandet ud
   over hele skærmen, sprøjter, og introen forsvinder.

   Alt tegnes i et enkelt canvas. Ingen billeder, ingen SVG.
   Matematikken – bølger, båd, tidslinje, easings – er porteret
   1:1 fra designprototypen. Rør ikke tallene uden at se den.

   ------------------------------------------------------------
   FIRE TING ER ANDERLEDES END I PROTOTYPEN
   ------------------------------------------------------------
   1) Prototypen havde en "efter"-skærm som introen tonede over
      til. Her ligger den RIGTIGE side bagved, og introen toner
      bare væk.

      Prototypen tonede også siden ind bagefter. Det gør vi IKKE.
      For at tone siden ind skulle den først skjules – og var der
      så en fejl i dette script, ville gæsten stå med en tom
      side. Overlejringen dækker alligevel fuldstændigt, så der
      er intet at vinde ved at gamble med det.

   2) "Spil igen"-knappen er væk. Den hørte til prototypen.
      I stedet er der en "Spring over", fordi ingen skal holdes
      fast i fem sekunder mod sin vilje.

   3) Introen kører ÉN GANG PR. FANE og varer under to sekunder.

      Den har været begge steder undervejs. Først 4,8 sekunder én
      gang pr. fane. Så ved hvert besøg, fordi kunden bad om det –
      og skåret til godt 3 sekunder for at kunne bære det. Nu er
      kravet en gang pr. session OG højst 1-2 sekunder, og begge
      dele er på plads: 1,7 sekunder, husket i sessionStorage.

      "Spring over" og Escape virker fra første billede.

   4) DEN SPRINGES HELT OVER VED ET DIREKTE LINK. Kommer gæsten
      ind på .../#menu fra Google eller fra et link, skal
      menukortet være der med det samme. En animation der dækker
      det sted man netop bad om at komme til, er en fejl uanset
      hvor kort den er.

   5) Sætter gæsten "reduceret bevægelse" i sit styresystem,
      springes hele animationen over.
   ============================================================ */

(function () {
  'use strict';

  var lag = document.getElementById('intro');
  if (!lag) return;

  var HUSKE_NOEGLE = 'mosede_intro_set';

  // ----------------------------------------------------------
  //  Skal den overhovedet køre?
  // ----------------------------------------------------------

  /* Overlejringen bliver FJERNET fra siden, ikke bare gjort
     gennemsigtig. Et usynligt lag oven på siden ville stadig
     fange klik, og så kunne gæsten ikke trykke på noget.

     Beskeden bagefter er signalet til resten af siden: nu er
     linjen fri. side.js venter på den før den henter
     hero-videoen. */
  function fjernStraks() {
    lag.parentNode && lag.parentNode.removeChild(lag);
    try {
      window.dispatchEvent(new Event('mosede-intro-slut'));
    } catch (e) {
      // Ældre browsere uden Event-konstruktøren. Videoen kommer
      // alligevel, for side.js har en tidsgrænse.
    }
  }

  var villeReducere = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var harSetDen = false;
  try {
    harSetDen = sessionStorage.getItem(HUSKE_NOEGLE) === '1';
  } catch (e) { /* privat browsing – så kører den bare */ }

  // Et direkte link til et afsnit: gæsten har allerede sagt hvor
  // hun vil hen, og introen skal ikke stå i vejen for det.
  var direkteLink = !!location.hash && location.hash.length > 1;

  if (villeReducere || harSetDen || direkteLink) {
    // Et kort creme-fald i stedet for ingenting, så skiftet ikke
    // rykker i øjnene
    lag.classList.add('intro-kort');
    setTimeout(fjernStraks, 300);
    return;
  }

  // Husk den med det samme, ikke når den er færdig. Trykker gæsten
  // opdater midt i animationen, skal den ikke starte forfra.
  try { sessionStorage.setItem(HUSKE_NOEGLE, '1'); } catch (e) { /* ignoreres */ }

  // ----------------------------------------------------------
  //  Opsætning
  // ----------------------------------------------------------
  var c = document.getElementById('intro-laerred');
  var ctx = c.getContext('2d');
  var msgEl = document.getElementById('intro-besked');
  var pctEl = document.getElementById('intro-pct');
  var springEl = document.getElementById('intro-spring');

  var C = {
    sand: '#f7f0e4', sky: '#fdf7ec', haze: '#f6e3d4',
    sea: '#0f2c44', mid: '#1a4763', far: '#2c6180',
    foam: '#f7f0e4',
    scoop: '#f0c3bb', scoop2: '#f8dcd6', cone: '#dcbf94',
    red: '#d1462f',
  };

  var MSGS = [
    'Fyrer op for grillen',
    'Rører isen',
    'Vender pølserne',
    'Bådene sejler ind',
    'Skruer parasollen op',
  ];

  var L1 = 'MOSEDE';
  var L2 = 'HAVNEGRILL OG ISHUS';
  /* Tidslinjen. Den har været 4800 ms og 3000 ms undervejs. Kravet
     er nu højst 1-2 sekunder, og det er 1430: 900 ms indlæsning,
     100 ms ophold og 430 ms oversvømmelse. Dertil 300 ms til at
     tone væk, altså 1,7 sekunder fra første til sidste billede.

     Koreografien er den samme – alle faser er der, bogstaverne
     falder, vandet stiger, båden rider, mågerne driver. Det er kun
     tempoet der er skruet op.

     900 ms indlæsning er bunden. Under det bliver den falske
     procentkurve utroværdig: tallene løber så hurtigt at man kan se
     at de ikke betyder noget, og så er der ingen grund til at have
     dem. */
  var T = { drop: 80, dropDur: 340, load: 900, hold: 100, flood: 430 };

  /* Tidslinjens længde, læselig udefra. tests/intro.spec.js måler
     PÅ DEN og ikke på væguret: to testarbejdere der deler en CPU
     kan gøre en vægur-måling et halvt sekund langsommere, og så
     ville testen fælde byggeriet for maskinens skyld i stedet for
     for koreografiens. */
  window.MOSEDE_INTRO_MS = T.load + T.hold + T.flood;

  var W, H, dpr, S = 1, lay = null;
  var glints = [], gulls = [], wake = [], drops = [];
  var t0 = 0, prog = 0, mi = -1, raf = 0;
  var fase = 'ind', floodAt = 0, slut = false;

  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var eOut = function (p) { return 1 - Math.pow(1 - clamp(p, 0, 1), 3); };
  var eInOut = function (p) {
    p = clamp(p, 0, 1);
    return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  };
  // Bagud-easing: bogstaverne falder ned og skyder en smule forbi
  function eBack(p) {
    p = clamp(p, 0, 1);
    var c1 = 1.28;
    return 1 + (c1 + 1) * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  }
  // Falsk indlæsningskurve: hurtig start, blødt ophold på midten,
  // sikker afslutning. Føles mere ægte end en lineær bjælke.
  function progAt(ms) {
    var p = clamp(ms / T.load, 0, 1);
    return clamp(eOut(p) * .82 + eInOut(clamp((p - .5) / .5, 0, 1)) * .18, 0, 1);
  }

  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.max(.62, Math.min(1.35, W / 1280));
    layout();
  }

  // ----------------------------------------------------------
  //  Ordmærket
  //  ----------------------------------------------------------
  //  Skriftstørrelsen REGNES ud fra den ønskede bredde, ikke
  //  omvendt. Derfor skal Bebas Neue være indlæst før første
  //  billede – ellers måles den forkerte skrift, og vandet ender
  //  med at stå skævt i bogstaverne.
  // ----------------------------------------------------------
  function layoutLine(text, targetW, baseY, idx0) {
    var s = 200, tr = .03, i;
    ctx.font = s + 'px "Bebas Neue"';

    var w = 0;
    for (i = 0; i < text.length; i++) w += ctx.measureText(text[i]).width;
    w += s * tr * (text.length - 1);

    s = s * targetW / w;
    ctx.font = s + 'px "Bebas Neue"';

    var adv = [], tot = 0;
    for (i = 0; i < text.length; i++) {
      var a = ctx.measureText(text[i]).width;
      adv.push(a);
      tot += a;
    }
    tot += s * tr * (text.length - 1);

    var x = (W - tot) / 2, ud = [];
    for (i = 0; i < text.length; i++) {
      ud.push({ ch: text[i], x: x, y: baseY, size: s, k: idx0 + i });
      x += adv[i] + s * tr;
    }
    return { letters: ud, size: s, top: baseY - s * .72 };
  }

  function layout() {
    var maxW = Math.min(W * .74, 900), cy = H * .5;
    var a = layoutLine(L1, maxW * .62, cy, 0);
    var b = layoutLine(L2, maxW, cy + a.size * .92, L1.length);

    lay = {
      letters: a.letters.concat(b.letters),
      top: a.top,
      bottom: cy + a.size * .92,
    };

    glints = [];
    for (var i = 0; i < 26; i++) {
      glints.push({
        x: Math.random() * W, p: Math.random() * 7,
        l: 5 + Math.random() * 20, d: .3 + Math.random() * .9,
      });
    }
    gulls = [
      { x: W * .18, y: H * .20, s: .90, v: 14 },
      { x: W * .34, y: H * .14, s: .62, v: 11 },
      { x: W * .72, y: H * .24, s: .50, v: 9 },
    ];
  }

  // ----------------------------------------------------------
  //  Bølger. Tre sinusser lagt oven på hinanden pr. lag.
  // ----------------------------------------------------------
  var K = [[.0082, 1.05, 10, 0], [.0205, -1.7, 4.6, 1.7], [.043, 2.5, 1.7, .6]];

  function surf(x, t, level, L) {
    var y = level;
    for (var i = 0; i < K.length; i++) {
      var f = K[i][0], sp = K[i][1], a = K[i][2], ph = K[i][3];
      y += Math.sin(x * f * (1 + L * .18) + t * sp * (1 + L * .12) + ph + L * 1.4)
           * a * (1 - L * .18) * S;
    }
    return y;
  }

  function wavePath(t, level, L) {
    ctx.beginPath();
    ctx.moveTo(0, surf(0, t, level, L));
    for (var x = 8; x <= W + 8; x += 8) ctx.lineTo(x, surf(x, t, level, L));
    ctx.lineTo(W + 8, H + 60);
    ctx.lineTo(0, H + 60);
    ctx.closePath();
  }

  function drawLetters(fill, t, el, al) {
    al = al === undefined ? 1 : al;
    ctx.fillStyle = fill;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    for (var i = 0; i < lay.letters.length; i++) {
      var L = lay.letters[i];
      var d = el - (T.drop + L.k * 34);
      var p = eBack(d / T.dropDur);
      if (p <= 0) continue;

      var dy = (1 - p) * -H * .09;
      var bob = Math.sin(t * 1.15 + L.k * .55) * 1.6 * S;

      ctx.font = L.size + 'px "Bebas Neue"';
      ctx.globalAlpha = clamp(d / 180, 0, 1) * al;
      ctx.fillText(L.ch, L.x, L.y + dy + bob);
    }
    ctx.globalAlpha = 1;
  }

  // ----------------------------------------------------------
  //  Is-solen, mågerne og båden
  // ----------------------------------------------------------
  function isSol(t) {
    var r = Math.min(W, H) * .062;
    var cx = W * .775;
    var cy = lay.top - r * 1.15 - Math.sin(t * .35) * 2;

    ctx.save();
    ctx.fillStyle = C.cone;
    ctx.beginPath();
    ctx.moveTo(cx - r * .62, cy + r * .42);
    ctx.lineTo(cx + r * .62, cy + r * .42);
    ctx.lineTo(cx, cy + r * 2.05);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = C.scoop;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();

    ctx.fillStyle = C.scoop2;
    ctx.beginPath(); ctx.arc(cx - r * .3, cy - r * .32, r * .42, 0, 7); ctx.fill();

    ctx.fillStyle = C.red;
    ctx.beginPath(); ctx.arc(cx + r * .02, cy - r * 1.02, r * .11, 0, 7); ctx.fill();
    ctx.restore();

    return { cx: cx, cy: cy, r: r };
  }

  function maage(g, t) {
    ctx.save();
    ctx.translate(g.x, g.y + Math.sin(t * 1.1 + g.x) * 3);
    ctx.scale(g.s * S, g.s * S);

    var f = Math.sin(t * 3.4 + g.x * .05) * 7;
    ctx.strokeStyle = 'rgba(15,44,68,.42)';
    ctx.lineWidth = 2.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-13, f * .5);
    ctx.quadraticCurveTo(-6, -5 - f, 0, 0);
    ctx.quadraticCurveTo(6, -5 - f, 13, f * .5);
    ctx.stroke();
    ctx.restore();
  }

  function baad(x, y, ang, sc) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(sc, sc);

    ctx.fillStyle = C.sea;
    // kahyt og dæk
    ctx.beginPath();
    ctx.moveTo(-40, -16); ctx.lineTo(-34, -3); ctx.lineTo(38, -3);
    ctx.lineTo(44, -16); ctx.lineTo(30, -16); ctx.lineTo(30, -26);
    ctx.lineTo(6, -26); ctx.lineTo(6, -16);
    ctx.closePath(); ctx.fill();
    // skrog
    ctx.beginPath();
    ctx.moveTo(-34, -3); ctx.lineTo(38, -3);
    ctx.quadraticCurveTo(24, 16, -18, 15);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = C.foam;
    ctx.fillRect(12, -23.5, 6, 5);          // koøje

    ctx.fillStyle = C.sea;
    ctx.fillRect(-2, -74, 3.4, 50);          // mast
    ctx.beginPath();                          // storsejl
    ctx.moveTo(2.4, -70); ctx.lineTo(2.4, -26); ctx.lineTo(30, -26);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = C.red;
    ctx.beginPath();                          // forsejl
    ctx.moveTo(-3, -62); ctx.lineTo(-3, -26); ctx.lineTo(-27, -26);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();                          // vimpel
    ctx.moveTo(1.4, -74); ctx.lineTo(14, -70.5); ctx.lineTo(1.4, -67);
    ctx.closePath(); ctx.fill();

    ctx.restore();
  }

  // ----------------------------------------------------------
  //  Selve løkken
  // ----------------------------------------------------------
  function frame(ms) {
    if (!t0) t0 = ms;
    var el = ms - t0, t = el / 1000, i;

    prog = progAt(el);

    if (fase === 'ind' && el >= T.load + T.hold) {
      fase = 'flod';
      floodAt = ms;
      for (i = 0; i < 70; i++) {
        drops.push({
          x: W * (.1 + Math.random() * .8),
          y: H * (.55 + Math.random() * .35),
          vx: (Math.random() - .5) * 3.4,
          vy: -4 - Math.random() * 7,
          r: 1.4 + Math.random() * 3.4,
          a: 1,
        });
      }
    }

    // Vandstanden følger procenten lineært, så det man ser er det
    // der står i tallet
    var target = lay.top - lay.letters[0].size * .05;
    var level = H + 34 - prog * (H + 34 - target);
    if (fase === 'flod') {
      var pf = eInOut((ms - floodAt) / T.flood);
      level = target - pf * (target + H * .35);
    }
    // Et løft til sidst, så båden er på en stigende kam når det
    // hele flyder over
    var swell = Math.sin(clamp((el - T.load * .72) / 700, 0, 1) * Math.PI)
                * (fase === 'flod' ? 0 : 6) * S;
    level -= swell;

    // himmel
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.sky);
    g.addColorStop(.62, C.sand);
    g.addColorStop(1, C.haze);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    var sc = isSol(t);

    for (i = 0; i < gulls.length; i++) {
      var gg = gulls[i];
      gg.x += gg.v / 60;
      if (gg.x > W + 30) gg.x = -30;
      maage(gg, t);
    }

    // Ordmærket som skygge – det der stikker op over vandet
    drawLetters('rgba(15,44,68,.12)', t, el);

    // to dønninger bagved
    ctx.save(); ctx.globalAlpha = .5;
    wavePath(t * .72 + 9, level + 22 * S, 2);
    ctx.fillStyle = C.far; ctx.fill(); ctx.restore();

    ctx.save(); ctx.globalAlpha = .75;
    wavePath(t * .86 + 4, level + 10 * S, 1);
    ctx.fillStyle = C.mid; ctx.fill(); ctx.restore();

    // Forreste vand. Alt herinde klippes til vandet – det er
    // trickét: bogstaverne tegnes igen i creme INDE i vandet, og
    // det er det der ser ud som om de fyldes op.
    ctx.save();
    wavePath(t, level, 0);
    ctx.fillStyle = C.sea;
    ctx.fill();
    ctx.clip();

    // solglimt under isen
    ctx.globalAlpha = .16;
    ctx.fillStyle = C.scoop;
    for (i = 0; i < 9; i++) {
      var gy = level + 8 + i * 11 * S;
      var gw = sc.r * (1.5 - i * .1) * (.5 + .5 * Math.abs(Math.sin(t * 1.6 + i)));
      ctx.fillRect(sc.cx - gw / 2, gy, gw, 2.4 * S);
    }
    ctx.globalAlpha = 1;

    // spejlbillede
    ctx.save();
    ctx.translate(0, level + 6);
    ctx.scale(1, -.46);
    ctx.translate(0, -level);
    drawLetters(C.foam, t, el, .075);
    ctx.restore();

    // bogstaverne fyldt op
    ctx.globalAlpha = 1;
    drawLetters(C.foam, t, el);

    // små glimt der driver nedad fra kammen
    for (i = 0; i < glints.length; i++) {
      var g2 = glints[i];
      var s0 = surf(g2.x, t, level, 0);
      var y2 = s0 + 7 * S + ((g2.p * 11 + t * 7) % (H * .16));
      var a2 = clamp(1 - ((y2 - s0) / (H * .16)), 0, 1) * .28;
      ctx.globalAlpha = a2;
      ctx.fillStyle = C.foam;
      ctx.fillRect(g2.x - g2.l / 2, y2, g2.l * S, 1.5 * S);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // kamlinjen
    ctx.beginPath();
    ctx.moveTo(0, surf(0, t, level, 0));
    for (var x = 8; x <= W; x += 8) ctx.lineTo(x, surf(x, t, level, 0));
    ctx.strokeStyle = 'rgba(247,240,228,.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // båden, med kølvand
    var bx = W * .5 + Math.sin(t * .38) * W * .2;
    var by = surf(bx, t, level, 0);
    var ang = Math.atan2(surf(bx + 18, t, level, 0) - by, 18) * .85;

    if (fase === 'ind' && Math.random() < .55) {
      wake.push({
        x: bx - Math.cos(ang) * 44 * S, y: by,
        r: 1 + Math.random() * 2.6, a: .55,
        vx: (Math.random() - .5) * .6 - Math.sign(Math.cos(t * .38)) * .2,
      });
    }

    ctx.fillStyle = C.foam;
    for (i = wake.length - 1; i >= 0; i--) {
      var p = wake[i];
      p.a -= .012; p.x += p.vx; p.r += .06;
      if (p.a <= 0) { wake.splice(i, 1); continue; }
      ctx.globalAlpha = p.a;
      ctx.beginPath();
      ctx.arc(p.x, surf(p.x, t, level, 0) + 1, p.r * S, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    baad(bx, by + 2 * S, ang, 1.02 * S);

    // sprøjt
    if (drops.length) {
      ctx.fillStyle = C.foam;
      for (i = drops.length - 1; i >= 0; i--) {
        var d2 = drops[i];
        d2.x += d2.vx; d2.y += d2.vy; d2.vy += .16; d2.a -= .011;
        if (d2.a <= 0) { drops.splice(i, 1); continue; }
        ctx.globalAlpha = d2.a * .85;
        ctx.beginPath(); ctx.arc(d2.x, d2.y, d2.r * S, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // tælleren og beskeden
    pctEl.textContent = Math.round(prog * 100) + '%';
    var k = clamp(Math.floor(prog * MSGS.length), 0, MSGS.length - 1);
    if (k !== mi) {
      mi = k;
      msgEl.style.opacity = 0;
      setTimeout(function () {
        msgEl.textContent = MSGS[k];
        msgEl.style.opacity = 1;
      }, 150);
    }

    if (fase === 'flod' && ms - floodAt > T.flood * .92) afslut();

    if (!slut) raf = requestAnimationFrame(frame);
  }

  // ----------------------------------------------------------
  //  Slut – ryd op efter dig
  //  ----------------------------------------------------------
  //  Overlejringen bliver FJERNET fra siden, ikke bare gjort
  //  gennemsigtig. Et usynligt lag oven på siden ville stadig
  //  fange klik, og så kunne gæsten ikke trykke på noget.
  // ----------------------------------------------------------
  function afslut() {
    if (slut) return;
    slut = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', size);
    lag.classList.add('gone');
    setTimeout(fjernStraks, 300);
  }

  if (springEl) springEl.addEventListener('click', afslut);

  // Esc springer også over – hurtigere end at finde knappen
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !slut) afslut();
  });

  window.addEventListener('resize', size);

  function start() {
    msgEl.textContent = MSGS[0];
    msgEl.style.opacity = 1;
    size();
    raf = requestAnimationFrame(frame);
  }

  // Er fanen skjult ved indlæsning, venter vi. requestAnimationFrame
  // bliver bremset i en baggrundsfane, og introen ville stå
  // frosset og se ødelagt ud når man kom tilbage.
  function gaa() {
    size();
    if (document.hidden) {
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) start();
      }, { once: true });
      return;
    }
    start();
  }

  // Bebas Neue SKAL være indlæst først – ordmærket måles i den.
  if (document.fonts && document.fonts.load) {
    document.fonts.load('400 120px "Bebas Neue"')
      .then(function () { return document.fonts.ready; })
      .then(gaa)
      .catch(gaa);
  } else {
    gaa();
  }
})();
