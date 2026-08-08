/* ============================================================
   BÅDEN I BUNDEN AF SKÆRMEN
   ------------------------------------------------------------
   En stribe vand nederst med en fiskerbåd der sejler fra venstre
   mod højre efter hvor langt man er rullet ned. Den er sidens
   rullemåler.

   Matematikken er porteret 1:1 fra designprototypen. Rør ikke
   tallene uden at se den.

   To detaljer der ser ud som pedanteri, men ikke er det:

   1) Bredden sættes i CSS med width:100vw. Et fixed canvas med
      left:0;right:0 og ingen bredde falder sammen til canvas'
      iboende 300px. Det skete for prototypen én gang, og det er
      noteret i handoff'et.

   2) Båden hales mod sin målposition med 8% pr. billede i stedet
      for at blive sat direkte. Det er hele forskellen mellem at
      sejle og at hoppe.
   ============================================================ */

(function () {
  'use strict';

  var cv = document.getElementById('sail');
  if (!cv) return;

  var x = cv.getContext('2d');
  var W, H, S = 1, dpr = 1;
  var p = 0;      // bådens position, hales blødt efter
  var maal = 0;   // hvor langt der faktisk er rullet
  var raf = 0;

  var roligt = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function sz() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth;
    H = cv.clientHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.max(.5, Math.min(1, W / 1280));
  }

  // To sinusser lagt oven på hinanden. Sampled hver 8. pixel.
  function surf(u, t, l) {
    return l + Math.sin(u * .012 + t * 1.05) * 5 * S
             + Math.sin(u * .031 - t * 1.7) * 2.4 * S;
  }

  function bane(t, l) {
    x.beginPath();
    x.moveTo(0, surf(0, t, l));
    for (var u = 8; u <= W; u += 8) x.lineTo(u, surf(u, t, l));
    x.lineTo(W, H);
    x.lineTo(0, H);
    x.closePath();
  }

  function baad(bx, by, a, s) {
    x.save();
    x.translate(bx, by);
    x.rotate(a);
    x.scale(s, s);

    x.fillStyle = '#0f2c44';
    // dæk og kahyt
    x.beginPath();
    x.moveTo(-30, -12); x.lineTo(-25, -2); x.lineTo(28, -2); x.lineTo(33, -12);
    x.lineTo(22, -12); x.lineTo(22, -20); x.lineTo(4, -20); x.lineTo(4, -12);
    x.closePath(); x.fill();
    // skrog
    x.beginPath();
    x.moveTo(-25, -2); x.lineTo(28, -2);
    x.quadraticCurveTo(18, 12, -13, 11);
    x.closePath(); x.fill();
    // mast og storsejl
    x.fillRect(-1.5, -54, 2.6, 38);
    x.beginPath();
    x.moveTo(1.8, -51); x.lineTo(1.8, -20); x.lineTo(22, -20);
    x.closePath(); x.fill();
    // forsejl i rødt
    x.fillStyle = '#d1462f';
    x.beginPath();
    x.moveTo(-2.4, -45); x.lineTo(-2.4, -20); x.lineTo(-20, -20);
    x.closePath(); x.fill();

    x.restore();
  }

  function tegn(ms) {
    // Står bevægelse på pause, fryses bølgetiden. Båden følger
    // stadig rulningen – det er information, ikke pynt.
    var t = roligt ? 0 : ms / 1000;

    var max = document.documentElement.scrollHeight - window.innerHeight;
    maal = max > 0 ? window.scrollY / max : 0;
    p += (maal - p) * (roligt ? 1 : .08);

    x.clearRect(0, 0, W, H);
    var l = H * .62;

    // bagerste dønning
    x.globalAlpha = .5;
    bane(t * .8 + 7, l + 7);
    x.fillStyle = '#1a4763';
    x.fill();

    // forreste vand
    x.globalAlpha = .92;
    bane(t, l);
    x.fillStyle = '#0f2c44';
    x.fill();

    // kamlinje
    x.globalAlpha = 1;
    x.strokeStyle = 'rgba(247,240,228,.45)';
    x.lineWidth = 1.2;
    x.beginPath();
    x.moveTo(0, surf(0, t, l));
    for (var u = 8; u <= W; u += 8) x.lineTo(u, surf(u, t, l));
    x.stroke();

    var bx = 40 + p * (W - 80);
    var by = surf(bx, t, l);
    var a = Math.atan2(surf(bx + 16, t, l) - by, 16) * .8;
    baad(bx, by + 1, a, .62 * S);

    raf = requestAnimationFrame(tegn);
  }

  sz();

  // Er striben skjult af CSS (lav eller smal skærm), er
  // clientWidth 0. Så er der intet at tegne, og vi lader være –
  // ellers ville løkken køre i tomgang på hver telefon.
  function igang() {
    if (!W) sz();
    if (!W) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tegn);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  /* Drejer man telefonen på tværs, skjuler CSS'en striben
     (max-height: 620px) – og drejer man tilbage, kommer den frem
     igen. sz() alene er ikke nok dér: var bredden 0 da siden blev
     læst, blev løkken aldrig startet, og en resize der bare måler
     om ville efterlade en tom stribe. Derfor startes eller standses
     der efter måling. */
  window.addEventListener('resize', function () {
    sz();
    if (!W) stop();
    else if (!raf) igang();
  });

  /* Bølgerne tegnes 60 gange i sekundet, også når fanen ligger i
     baggrunden bag en anden. De fleste browsere skruer selv ned
     for requestAnimationFrame i en skjult fane, men ikke alle, og
     ikke altid helt. Vi standser den selv: der er ingen der ser
     den, og en bærbar computer skal ikke bruge strøm på en båd
     ingen kigger på. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else igang();
  });

  requestAnimationFrame(igang);
})();
