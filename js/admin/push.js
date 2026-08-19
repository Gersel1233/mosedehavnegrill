/* Besked på telefonen (fase 5c). Se js/admin/kerne.js for de to
   principper, der gælder i alle admin-filerne.

   Kortet bor på Kontakt-fanen: det er en indstilling pr. ENHED —
   den iPad eller telefon, man står med — ikke en liste, der skal
   kigges i hver dag. Selve afsenderen er Edge Function'en
   send-push (supabase/funktioner/send-push.ts); her tilmeldes og
   frameldes enheden kun.

   TO TING OM iOS, som skal stå på skærmen og ikke i en manual:
   push virker KUN, når siden er lagt på hjemmeskærmen, og
   tilladelsen forsvinder, hvis appen slettes og lægges på igen.
   Koden opdager selv begge tilstande og skriver dem. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  /* Den OFFENTLIGE halvdel af nøgleparret. Den er offentlig med
     vilje — browseren skal bruge den for at abonnere — men den er
     IKKE hårdkodet: nøglerne laves af Mikkel selv med
     supabase/lav-vapid.html, i hans egen browser, så den private
     halvdel aldrig har været i nærheden af repoet eller en chat.
     Den offentlige indsættes i feltet hernede én gang og bor i
     indstillinger. Passer de to halvdele ikke sammen, afvises
     hvert eneste send. */
  function nøgle() {
    /* Admin.data er der først, når genindlæs() har hentet — og
       vedLogin kører FØR det. Uden værnet her væltede kortet ved
       login, og enhedslisten blev aldrig tegnet. Tegnerne kører
       igen, når data lander, så kortet retter sig selv. */
    var ind = (Admin.data && Admin.data.indstillinger) || {};
    var v = String(ind.vapid_offentlig || '').trim();
    return /^[A-Za-z0-9_-]{87}$/.test(v) ? v : null;
  }

  function tilBytes(base64url) {
    var base64 = (base64url + '==='.slice((base64url.length + 3) % 4))
      .replace(/-/g, '+').replace(/_/g, '/');
    var raa = atob(base64);
    var ud = new Uint8Array(raa.length);
    for (var i = 0; i < raa.length; i++) ud[i] = raa.charCodeAt(i);
    return ud;
  }

  function enhedsNavn() {
    var ua = navigator.userAgent || '';
    if (/iPad/.test(ua)) return 'iPad';
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/Android/.test(ua)) return 'Android-telefon';
    return 'Computer';
  }

  /* iOS-fælden: i Safari-fanen FINDES PushManager slet ikke — kun
     i den installerede app. Det er sådan, vi kan se forskel. */
  function kanPush() {
    return 'serviceWorker' in navigator && 'PushManager' in window
      && 'Notification' in window;
  }

  function erIOS() {
    return /iPad|iPhone/.test(navigator.userAgent || '');
  }

  // ----------------------------------------------------------
  //  TILSTANDEN PÅ SKÆRMEN
  // ----------------------------------------------------------
  function sigStatus(tekst, erFejl) {
    var boks = $('push-status');
    boks.textContent = tekst;
    boks.className = erFejl ? 'fejl' : 'hjaelp';
  }

  function visKnapper(tilmeldt) {
    $('push-til').classList.toggle('skjult', tilmeldt);
    $('push-fra').classList.toggle('skjult', !tilmeldt);
  }

  function opdater() {
    var opsat = !!nøgle();
    $('push-opsaetning').classList.toggle('skjult', opsat);
    if (!opsat) {
      $('push-til').classList.add('skjult');
      $('push-fra').classList.add('skjult');
      sigStatus('Opsætningen mangler: lav nøglerne med supabase/lav-vapid.html, '
        + 'og sæt den OFFENTLIGE ind herunder. Se README under push.');
      return;
    }
    if (!kanPush()) {
      $('push-til').classList.add('skjult');
      $('push-fra').classList.add('skjult');
      sigStatus(erIOS()
        ? 'På iPhone og iPad virker besked kun fra hjemmeskærmen: '
          + 'del-knappen → "Føj til hjemmeskærm", og åbn siden derfra. '
          + 'Slettes appen, skal der siges ja igen.'
        : 'Denne browser kan ikke tage imod push-beskeder.');
      return;
    }
    if (Notification.permission === 'denied') {
      $('push-til').classList.add('skjult');
      $('push-fra').classList.add('skjult');
      sigStatus('Beskeder er blokeret for siden i enhedens indstillinger. '
        + 'Slå dem til dér, og prøv igen.', true);
      return;
    }
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) { visKnapper(false); sigStatus('Denne enhed får ikke besked endnu.'); return; }
      return reg.pushManager.getSubscription().then(function (ab) {
        visKnapper(!!ab);
        sigStatus(ab ? 'Denne enhed får besked, når der kommer noget ind.'
                     : 'Denne enhed får ikke besked endnu.');
      });
    }).catch(function () { visKnapper(false); });
  }

  // ----------------------------------------------------------
  //  TIL OG FRA
  // ----------------------------------------------------------
  function slaaTil() {
    $('push-til').disabled = true;
    Notification.requestPermission().then(function (svar) {
      if (svar !== 'granted') {
        $('push-til').disabled = false;
        sigStatus('Der blev sagt nej til beskeder. Fortryder du, skal det '
          + 'slås til i enhedens indstillinger.', true);
        return;
      }
      return navigator.serviceWorker.register('sw.js').then(function (reg) {
        return navigator.serviceWorker.ready.then(function () {
          return reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: tilBytes(nøgle()),
          });
        });
      }).then(function (ab) {
        var j = ab.toJSON();
        return Butik.skrive.gemPush({
          endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
          enhed: enhedsNavn(),
        });
      }).then(function () {
        Admin.kvitter('Enheden får nu besked, når der kommer noget ind.');
        $('push-til').disabled = false;
        opdater();
        visEnheder();
      });
    }).catch(function (e) {
      $('push-til').disabled = false;
      Admin.brøl('Kunne ikke slå beskeder til: ' + (e.message || e));
    });
  }

  function slaaFra() {
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) return null;
      return reg.pushManager.getSubscription();
    }).then(function (ab) {
      if (!ab) return null;
      var endpoint = ab.endpoint;
      return ab.unsubscribe().then(function () {
        return Butik.skrive.sletPush(endpoint);
      });
    }).then(function () {
      Admin.kvitter('Enheden får ikke længere besked.');
      opdater();
      visEnheder();
    }).catch(function (e) {
      Admin.brøl('Kunne ikke slå beskeder fra: ' + (e.message || e));
    });
  }

  // ----------------------------------------------------------
  //  LISTEN: HVILKE ENHEDER FÅR BESKED?
  //  Uden den kan ingen svare på "hvorfor bipper min telefon
  //  ikke?" — svaret står her: den er ikke på listen.
  // ----------------------------------------------------------
  function visEnheder() {
    Butik.hentPushEnheder().then(function (liste) {
      var boks = $('push-enheder');
      Admin.tøm(boks);
      if (!liste.length) {
        boks.appendChild(lav('p', 'vare-tekst', 'Ingen enheder får besked endnu.'));
        return;
      }
      liste.forEach(function (e) {
        var linje = lav('div', 'bestil-linje');
        linje.appendChild(lav('span', 'bestil-vare',
          (e.enhed || 'Enhed') + ' · ' + e.email));
        var slet = lav('button', 'knap fare', 'Fjern');
        slet.addEventListener('click', function () {
          if (!confirm('Skal enheden ikke have besked længere?')) return;
          Butik.skrive.sletPush(e.endpoint).then(visEnheder)
            .catch(function (f) { Admin.brøl(f.message || String(f)); });
        });
        linje.appendChild(slet);
        boks.appendChild(linje);
      });
    }).catch(function () {
      /* Kan listen ikke hentes (tabellen findes ikke endnu), er
         det opsætningen, der mangler — det står i README. */
      var boks = $('push-enheder');
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'hjaelp',
        'Listen kunne ikke hentes — er push-opsætningen kørt i Supabase? Se README.'));
    });
  }

  $('push-til').addEventListener('click', slaaTil);
  $('push-fra').addEventListener('click', slaaFra);

  $('gem-vapid').addEventListener('click', function () {
    var v = $('vapid-noegle').value.trim();
    if (!/^[A-Za-z0-9_-]{87}$/.test(v)) {
      return Admin.brøl('Det ligner ikke den offentlige nøgle — den er 87 tegn '
        + 'og starter typisk med B. Kopiér den fra lav-vapid.html.');
    }
    Admin.gem(Butik.skrive.indstilling('vapid_offentlig', v),
      'Nøglen er gemt. Slå beskeder til på enhederne herunder.');
  });

  Admin.tegnere.push(opdater);
  Admin.vedLogin.push(function () { opdater(); visEnheder(); });
})();
