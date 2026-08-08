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

  /* Bådens størrelse. Prototypen skrev .62 * S, hvor S følger
     skærmbredden – og det er derfor båden forsvandt på en telefon:
     ved 390 px blev S 0,5, båden blev 0,31 og altså 20 px høj. En
     rullemåler på 20 px i en stribe med tekst bagved er ikke en båd,
     det er en prik. Kunden kunne ikke se den.

     Båden har nu den samme FYSISKE størrelse på alle skærme, cirka
     40 px, uafhængigt af bredden. Den er en genstand på skærmen, og
     en genstand bliver ikke mindre fordi vinduet gør. */
  var BAAD = 0.55;

  function sz() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth;
    H = cv.clientHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.max(.5, Math.min(1, W / 1280));
  }

  /* To sinusser lagt oven på hinanden. Sampled hver 8. pixel.

     Højden regnes af STRIBENS højde og ikke af bredden. Bølger på
     4,6 px i en stribe på 64 er en streg; ved en tiendedel og en
     tyvendedel af højden er de bølger man kan se, i begge formater. */
  function surf(u, t, l) {
    return l + Math.sin(u * .012 + t * 1.05) * H * .10
             + Math.sin(u * .031 - t * 1.7) * H * .05;
  }

  function bane(t, l) {
    x.beginPath();
    x.moveTo(0, surf(0, t, l));
    for (var u = 8; u <= W; u += 8) x.lineTo(u, surf(u, t, l));
    x.lineTo(W, H);
    x.lineTo(0, H);
    x.closePath();
  }

  /* BÅDEN ER SANDFARVET, IKKE MARINEBLÅ.

     Prototypen tegnede skrog, dæk, mast og storsejl i #0f2c44 – og
     vandet er #0f2c44. Båden var altså malet i præcis den farve den
     sejlede på, og det eneste man kunne se af den var det lille røde
     forsejl. Det var derfor kunden ikke kunne finde båden: den var
     der, den var usynlig.

     På prototypens lyse sandbaggrund gav det mening, for dér lå
     båden OVER vandlinjen mod sand. Men båden ligger i vandet, og
     det er den der er motivet.

     Sandfarvet skrog på marineblåt vand, med forsejlet i husets
     røde. Samme tre farver som hele resten af siden. */
  var SKROG = '#f4ead8';

  function baad(bx, by, a, s) {
    x.save();
    x.translate(bx, by);
    x.rotate(a);
    x.scale(s, s);

    /* En tynd mørk kontur under sejlene, så de ikke smelter sammen
       med skroget når de rører hinanden. */
    x.lineJoin = 'round';
    x.strokeStyle = 'rgba(10,26,42,.55)';
    x.lineWidth = 1.4;

    x.fillStyle = SKROG;
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
    x.closePath(); x.fill(); x.stroke();
    // forsejl i rødt
    x.fillStyle = '#d1462f';
    x.beginPath();
    x.moveTo(-2.4, -45); x.lineTo(-2.4, -20); x.lineTo(-20, -20);
    x.closePath(); x.fill(); x.stroke();

    x.restore();
  }

  /* ---- DEN TEGNER 30 GANGE I SEKUNDET, IKKE 60 ----

     Bølgerne er to sinusser og en båd. Der er ingen bevægelse i dem
     der bliver bedre af 60 billeder – men der ER noget andet på
     siden der bliver dårligere: isfilmen skal afkodes samtidig, og
     på en telefon deler de to om den samme kerne. Filmen hakkede,
     og båden var med til at gøre det.

     Halvdelen af billederne springes over. Springer man i stedet
     over hvert andet KALD, bliver taktet afhængig af skærmens
     opdatering – på en 120 Hz-telefon ville båden så køre 60 og ikke
     30. Derfor måles der på tiden. */
  var SPRING = 1000 / 30;
  var sidst = -1;

  function tegn(ms) {
    if (ms - sidst < SPRING) { raf = requestAnimationFrame(tegn); return; }
    sidst = ms;

    // Står bevægelse på pause, fryses bølgetiden. Båden følger
    // stadig rulningen – det er information, ikke pynt.
    var t = roligt ? 0 : ms / 1000;

    var max = document.documentElement.scrollHeight - window.innerHeight;
    maal = max > 0 ? window.scrollY / max : 0;
    /* 0,15 og ikke prototypens 0,08: den hales 30 gange i sekundet
       nu og ikke 60, og 1 − 0,92² = 0,1536. Uden det ville båden
       sejle halvt så hurtigt efter rullehjulet som den er tegnet
       til. */
    p += (maal - p) * (roligt ? 1 : .15);

    x.clearRect(0, 0, W, H);
    var l = H * .62;

    /* VANDET ER UIGENNEMSIGTIGT, og det var det ikke før.

       Prototypen tegnede dønningen på 50% og det forreste vand på
       92%. På en computer, hvor striben ligger over sandfarvet
       baggrund, ser man det ikke. På en telefon ligger den over
       indholdet – og så kunne man læse "KAGER OG DESSERTER" og
       "SPØRG TIL DAGENS UDVALG" TVÆRS IGENNEM vandet. Det var det
       kunden så: ikke en båd på bølger, men en grumset stribe med
       tekst bagved.

       Dønningen er nu 70% af en farve der ER mørk, og det forreste
       vand er helt tæt. Der er stadig dybde i det, og der er intet
       der skinner igennem. */
    x.globalAlpha = .7;
    bane(t * .8 + 7, l + 7);
    x.fillStyle = '#173d57';
    x.fill();

    // forreste vand
    x.globalAlpha = 1;
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
    baad(bx, by + 1, a, BAAD);

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
