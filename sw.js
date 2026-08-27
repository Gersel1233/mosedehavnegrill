/* Service worker — KUN til push. (fase 5c)

   Den har med vilje INGEN fetch-håndtering: en service worker,
   der cacher, er en side, der kan vise gamle priser, efter
   personalet har rettet dem. Filen her gør præcis to ting: viser
   beskeden, og åbner admin, når der trykkes på den.

   Den registreres KUN fra personalesiden (js/admin/push.js) og
   kun, når nogen selv slår push til. Gæstesiden kender den ikke. */
'use strict';

/* En ny udgave af filen her skal tage over MED DET SAMME. Uden de
   to linjer venter browseren, til alle faner er lukket — og
   iPad'en i køkkenet lukker aldrig sin. En push-worker har ingen
   cache og ingen tilstand, så der er intet at vente på. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (h) { h.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (h) {
  var besked = { titel: 'Mosede Havnecafe', tekst: 'Der er kommet noget ind.', url: 'admin.html' };
  try {
    var data = h.data ? h.data.json() : {};
    if (data.titel) besked.titel = data.titel;
    if (data.tekst) besked.tekst = data.tekst;
    if (data.url) besked.url = data.url;
  } catch (e) { /* uforståelig payload: standardbeskeden vises */ }

  h.waitUntil(Promise.all([
    self.registration.showNotification(besked.titel, {
      body: besked.tekst,
      icon: 'ikoner/ikon-192.png',
      badge: 'ikoner/ikon-192.png',
      data: { url: besked.url },
      /* Én besked ad gangen pr. slags — ti bestillinger skal være
         ti linjer i notifikationscentret, ikke én der overskrives,
         så tag er med vilje IKKE sat. */
    }),
    /* Pushen er også det INTERNE startskud: står admin åben på
       iPad'en, skal listen komme i samme sekund som plinget — ikke
       når nogen trykker "Hent på ny". js/admin/frisk.js lytter. */
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (vinduer) {
        vinduer.forEach(function (v) { v.postMessage({ type: 'mosede-nyt' }); });
      }),
  ]));
});

self.addEventListener('notificationclick', function (h) {
  h.notification.close();
  var url = (h.notification.data && h.notification.data.url) || 'admin.html';

  /* Er admin allerede åben (typisk iPad'en i køkkenet), fokuseres
     den i stedet for at åbne endnu en. */
  h.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(function (vinduer) {
      for (var i = 0; i < vinduer.length; i++) {
        if (vinduer[i].url.indexOf('admin.html') !== -1 && 'focus' in vinduer[i]) {
          return vinduer[i].focus();
        }
      }
      return self.clients.openWindow(url);
    }));
});
