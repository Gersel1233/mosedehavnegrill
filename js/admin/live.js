/* Den direkte forbindelse: bestillingen står på skærmen i samme
   sekund, gæsten trykker send. (fase 5c)
   Se js/admin/kerne.js for de to principper, der gælder i alle
   admin-filerne.

   Kunden målte det selv: push-plinget kom, men listen kom først
   ved næste hentning. Nu holder admin en åben websocket til
   Supabases realtime-tjeneste, og hver ændring i de fire
   gæstetabeller udløser en hentning med det samme — som i spiis.

   HÅNDSKREVET MED VILJE, IKKE SUPABASES SDK. Resten af siden
   taler til databasen med rå fetch, og SDK'et ville være hundrede
   kilobyte bygge-løst værktøj for de her ~100 linjer: Supabase
   Realtime taler Phoenix-protokollen, som er JSON-beskeder med
   {topic, event, payload, ref} og et hjerteslag hvert halve
   minut. Går protokollen i stykker en dag, står den her i sin
   helhed og kan læses — og frisk.js' tre signaler (push,
   tilbagekomst, takt) står bagved som sikkerhedsnet, så en død
   forbindelse aldrig er en død skærm.

   Adgangen er databasens egen: der lyttes med personalets token,
   og realtime håndhæver de samme adgangsregler som resten
   (gæster kan ikke lytte med — de har ingen læseregler). Kræver,
   at tabellerne er meldt til i supabase/realtime.sql. */
(function () {
  'use strict';

  var cfg = window.MOSEDE_CLOUD || {};
  var TABELLER = ['bestillinger', 'forespoergsler', 'bordbestillinger', 'udlejninger'];
  var KANAL = 'realtime:mosede-admin';

  var ws = null;
  var løbenr = 0;
  var hjerte = 0;
  var venter = 0;
  var provIgenMs = 2000;

  function kanLive() {
    return !!(Butik.sky && window.WebSocket && Butik.auth.loggetInd());
  }

  function adresse() {
    return String(cfg.url).replace(/^http/, 'ws')
      + '/realtime/v1/websocket?apikey=' + encodeURIComponent(cfg.anonKey)
      + '&vsn=1.0.0';
  }

  function send(topic, event, payload) {
    if (!ws || ws.readyState !== 1) return;
    løbenr += 1;
    ws.send(JSON.stringify({
      topic: topic, event: event, payload: payload || {}, ref: String(løbenr),
    }));
  }

  /* Flere ændringer i samme åndedrag (personalet bekræfter tre
     borde i træk) skal være ÉN hentning, ikke tre. */
  function planlægHentning() {
    clearTimeout(venter);
    venter = setTimeout(function () { Admin.friskOp(); }, 250);
  }

  function forbind() {
    if (!kanLive()) return;

    ws = new WebSocket(adresse());

    ws.onopen = function () {
      provIgenMs = 2000;
      send(KANAL, 'phx_join', {
        config: {
          postgres_changes: TABELLER.map(function (t) {
            return { event: '*', schema: 'public', table: t };
          }),
        },
        /* Personalets egen nøgle: realtime håndhæver de samme
           adgangsregler som resten af databasen med den. */
        access_token: Butik.auth.token(),
      });

      /* Hjerteslaget holder forbindelsen i live — og tokenet
         fornyes samtidig, så en vagt på otte timer ikke mister
         lyden, når nøglen udløber efter én. */
      hjerte = setInterval(function () {
        send('phoenix', 'heartbeat', {});
        send(KANAL, 'access_token', { access_token: Butik.auth.token() });
      }, 25 * 1000);

      if (window.console) console.info('Direkte forbindelse åben — nye bestillinger kommer af sig selv.');
    };

    ws.onmessage = function (h) {
      var besked;
      try { besked = JSON.parse(h.data); } catch (e) { return; }
      if (besked.event === 'postgres_changes') planlægHentning();
    };

    /* Falder den, rejser den sig selv — med voksende afstand, så
       en nede-tjeneste ikke bliver hamret på. frisk.js' takt
       dækker imens. */
    ws.onclose = function () {
      clearInterval(hjerte);
      ws = null;
      setTimeout(forbind, provIgenMs);
      provIgenMs = Math.min(provIgenMs * 2, 60 * 1000);
    };

    ws.onerror = function () {
      try { ws.close(); } catch (e) { /* allerede lukket */ }
    };
  }

  Admin.vedLogin.push(forbind);
})();
