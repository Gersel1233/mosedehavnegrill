/* ============================================================
   BESKÆR BILLEDET SELV  (28/10)
   ------------------------------------------------------------
   Mikkel: *"billedet man poster derinde skal tilpasses og croppes
   til siden, og man skal kunne gøre det selv"*.

   Arrangementets foto står i 16:9 på kalendersiden og i laget
   (havnegrillen.css, .evfoto og #ev-foto). Før skar browseren det
   ud af midten hos gæsten — og ingen havde set resultatet. Nu
   vælger arrangøren selv udsnittet i en ramme med SAMME form:
   træk billedet på plads, zoom med skyderen, og tryk «Brug
   billedet». Det, der står i rammen, er det, gæsten ser.

   Admin.beskaer(kilde, { forhold, bredde }) → Promise<File|null>
     kilde    en File fra filvælgeren — eller en adresse på et
              billede, der allerede er lagt op («Tilpas billedet»)
     svar     en færdig JPEG i præcis den form (null = annulleret)

   ⚠️ ARBEJDET SKER PÅ ENHEDEN. Lærredet skærer og komprimerer, før
   noget lægges op: en iPhone-fil på 6 MB bliver ~250 kB, og
   forsiden bliver ikke tungere af et nyt arrangement.

   ⚠️ KUN TRANSFORM. Billedet flyttes med translate/scale, så det
   følger fingeren uden at siden tegnes om.
   ============================================================ */
(function () {
  'use strict';

  function lav(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined) e.textContent = tekst;
    return e;
  }

  function hentBillede(kilde) {
    return new Promise(function (klar, fejl) {
      var img = new Image();
      var url = typeof kilde === 'string' ? kilde : URL.createObjectURL(kilde);
      /* Et billede fra spanden er et andet domæne. Uden crossOrigin
         bliver lærredet "tainted", og toBlob nægter. Supabase Storage
         svarer med Access-Control-Allow-Origin på offentlige spande. */
      if (typeof kilde === 'string') img.crossOrigin = 'anonymous';
      img.onload = function () { klar({ img: img, url: url, egen: typeof kilde !== 'string' }); };
      img.onerror = function () {
        if (typeof kilde !== 'string') URL.revokeObjectURL(url);
        fejl(new Error('Billedet kunne ikke åbnes. Prøv et andet.'));
      };
      img.src = url;
    });
  }

  function beskaer(kilde, valg) {
    valg = valg || {};
    var forhold = valg.forhold || 16 / 9;
    var bredde = valg.bredde || 1600;
    if (!kilde) return Promise.resolve(null);
    if (typeof kilde !== 'string' && kilde.size > 20 * 1024 * 1024) {
      return Promise.reject(new Error('Billedet er over 20 MB. Tag et mindre, eller send det gennem Fotos først.'));
    }

    return hentBillede(kilde).then(function (h) {
      return new Promise(function (svar) {
        var img = h.img;
        var nw = img.naturalWidth, nh = img.naturalHeight;

        var lag = lav('div', 'besk-lag');
        lag.setAttribute('role', 'dialog');
        lag.setAttribute('aria-modal', 'true');
        lag.setAttribute('aria-label', 'Tilpas billedet');
        var ark = lav('div', 'besk-ark');
        ark.appendChild(lav('h3', 'besk-titel', 'Tilpas billedet'));
        ark.appendChild(lav('p', 'besk-hjaelp',
          'Træk billedet på plads, og zoom med skyderen. Det, der står i rammen, er det, gæsterne ser.'));
        var ramme = lav('div', 'besk-ramme');
        ramme.style.aspectRatio = String(forhold);
        var vis = lav('img', 'besk-billede');
        vis.src = h.url;
        vis.alt = '';
        vis.draggable = false;
        ramme.appendChild(vis);
        ark.appendChild(ramme);

        var zoomFelt = lav('label', 'besk-zoom');
        zoomFelt.appendChild(lav('span', null, 'Zoom'));
        var zoom = lav('input');
        zoom.type = 'range';
        zoom.min = '1'; zoom.max = '3'; zoom.step = '0.01'; zoom.value = '1';
        zoom.setAttribute('aria-label', 'Zoom');
        zoomFelt.appendChild(zoom);
        ark.appendChild(zoomFelt);

        var knapper = lav('div', 'knap-raekke besk-knapper');
        var brug = lav('button', 'knap', 'Brug billedet');
        brug.type = 'button';
        brug.setAttribute('data-uden-gemt', '');
        var fortryd = lav('button', 'knap sekundaer', 'Annullér');
        fortryd.type = 'button';
        fortryd.setAttribute('data-uden-gemt', '');
        knapper.appendChild(brug);
        knapper.appendChild(fortryd);
        ark.appendChild(knapper);
        lag.appendChild(ark);
        document.body.appendChild(lag);

        /* Udsnittet regnes i billedets egne pixels:
           grund = den skala, hvor billedet lige akkurat dækker rammen
           (zoom 1), og x/y er udsnittets midte. Midten er udgangspunktet. */
        var tilstand = { z: 1, cx: nw / 2, cy: nh / 2 };
        function rammeB() { return ramme.clientWidth || 1; }
        function grund() { return Math.max(rammeB() / nw, (rammeB() / forhold) / nh); }
        function hold() {
          var s = grund() * tilstand.z;
          var halvB = rammeB() / s / 2, halvH = rammeB() / forhold / s / 2;
          tilstand.cx = Math.min(nw - halvB, Math.max(halvB, tilstand.cx));
          tilstand.cy = Math.min(nh - halvH, Math.max(halvH, tilstand.cy));
        }
        function tegn() {
          hold();
          var s = grund() * tilstand.z;
          var x = rammeB() / 2 - tilstand.cx * s;
          var y = rammeB() / forhold / 2 - tilstand.cy * s;
          vis.style.width = nw + 'px';
          vis.style.height = nh + 'px';
          vis.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + s + ')';
        }

        var træk = null;
        ramme.addEventListener('pointerdown', function (e) {
          træk = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: tilstand.cx, cy: tilstand.cy };
          try { ramme.setPointerCapture(e.pointerId); } catch (x) { /* intet */ }
          ramme.classList.add('trækkes');
          e.preventDefault();
        });
        ramme.addEventListener('pointermove', function (e) {
          if (!træk || e.pointerId !== træk.id) return;
          var s = grund() * tilstand.z;
          tilstand.cx = træk.cx - (e.clientX - træk.x) / s;
          tilstand.cy = træk.cy - (e.clientY - træk.y) / s;
          tegn();
        });
        function slip() { træk = null; ramme.classList.remove('trækkes'); }
        ramme.addEventListener('pointerup', slip);
        ramme.addEventListener('pointercancel', slip);
        /* Et rul med musen eller to fingre på en trackpad zoomer. */
        ramme.addEventListener('wheel', function (e) {
          e.preventDefault();
          tilstand.z = Math.min(3, Math.max(1, tilstand.z * (e.deltaY < 0 ? 1.06 : 1 / 1.06)));
          zoom.value = String(tilstand.z);
          tegn();
        }, { passive: false });
        zoom.addEventListener('input', function () { tilstand.z = Number(zoom.value) || 1; tegn(); });

        function luk(fil) {
          window.removeEventListener('resize', tegn);
          document.removeEventListener('keydown', tast, true);
          if (lag.parentNode) lag.parentNode.removeChild(lag);
          if (h.egen) URL.revokeObjectURL(h.url);
          svar(fil);
        }
        function tast(e) {
          if (e.key === 'Escape') { e.stopPropagation(); luk(null); }
        }
        document.addEventListener('keydown', tast, true);
        window.addEventListener('resize', tegn);
        fortryd.addEventListener('click', function () { luk(null); });
        lag.addEventListener('click', function (e) { if (e.target === lag) luk(null); });

        brug.addEventListener('click', function () {
          hold();
          var s = grund() * tilstand.z;
          var kb = rammeB() / s, kh = rammeB() / forhold / s;
          var ub = Math.min(bredde, Math.round(kb));
          var uh = Math.round(ub / forhold);
          var c = document.createElement('canvas');
          c.width = ub; c.height = uh;
          var k = c.getContext('2d');
          k.imageSmoothingQuality = 'high';
          try {
            k.drawImage(img, tilstand.cx - kb / 2, tilstand.cy - kh / 2, kb, kh, 0, 0, ub, uh);
            brug.disabled = true;
            brug.textContent = 'Gør klar…';
            c.toBlob(function (blob) {
              if (!blob) { brug.disabled = false; brug.textContent = 'Brug billedet'; return; }
              var navn = 'arrangement-' + ub + 'x' + uh + '.jpg';
              var fil;
              try { fil = new File([blob], navn, { type: 'image/jpeg' }); }
              catch (x) { fil = blob; fil.name = navn; }
              luk(fil);
            }, 'image/jpeg', 0.84);
          } catch (x) {
            /* Et billede fra et andet domæne uden CORS: lærredet nægter.
               Så må det vælges som fil igen. */
            ark.appendChild(lav('p', 'fejl', 'Det billede kan ikke tilpasses her. Vælg det som fil igen med «Skift billede».'));
          }
        });

        /* Første tegning, når rammen har fået sin bredde. */
        requestAnimationFrame(function () { tegn(); brug.focus(); });
      });
    });
  }

  window.Admin = window.Admin || {};
  window.Admin.beskaer = beskaer;
}());
