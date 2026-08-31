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
  var tilmeldRef = 0;

  /* ⚠️ "ÅBEN" ER IKKE DET SAMME SOM "BÆRER"  (31/8).

     Den her fil sagde tidligere "Direkte forbindelse åben" i det
     sekund, websocketen svarede — og gik så i gang med at vente på
     beskeder, der aldrig kom. En tilmelding kan blive AFVIST
     (tabellen er ikke meldt til i supabase/realtime.sql, tokenet
     duer ikke, tjenesten er slået fra), og svaret på den afvisning
     er en phx_reply med status "error", som ingen læste.

     Resultatet var det, kunden mødte: en skærm, der stod stille,
     og en konsol, der sagde, at alt var i orden. Nu er der ét
     sted, der ved, om forbindelsen faktisk bærer — og frisk.js
     spørger den, før den vælger sin takt (8 sekunder alene, 30
     med live). Skærmen er derfor aldrig død; den er bare
     langsommere, når vi kigger på et hul. */
  var oppe = false;

  Admin.liveOppe = function () { return oppe; };

  /* Den grønne prik i live-mærket er en påstand om, at skærmen
     opdaterer sig selv. Bærer forbindelsen ikke, siger mærket
     hvor tit der så hentes — så personalet ved, hvad de kigger
     på, i stedet for at gætte. */
  function visTilstand() {
    Array.prototype.forEach.call(
      document.querySelectorAll('.live-maerke'), function (m) {
        m.classList.toggle('live-alene', !oppe);
      });
  }

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
    /* ⚠️ OG MÆRKET SKAL OGSÅ SIGE DET, NÅR DER SLET IKKE
       FORSØGES. Kan browseren ikke websockets, eller er der ingen
       sky, ville den grønne prik stå og påstå "opdaterer sig
       selv i samme sekund" — mens takten er det eneste, der
       bærer. Øvetilstanden er den ene undtagelse, der ikke
       betyder noget: dér er der ingen database at være live mod. */
    if (!kanLive()) {
      if (Butik.sky) { oppe = false; visTilstand(); }
      return;
    }

    ws = new WebSocket(adresse());

    ws.onopen = function () {
      provIgenMs = 2000;
      løbenr += 1;
      tilmeldRef = String(løbenr);
      ws.send(JSON.stringify({ topic: KANAL, event: 'phx_join', ref: tilmeldRef, payload: {
        config: {
          postgres_changes: TABELLER.map(function (t) {
            return { event: '*', schema: 'public', table: t };
          }),
        },
        /* Personalets egen nøgle: realtime håndhæver de samme
           adgangsregler som resten af databasen med den. */
        access_token: Butik.auth.token(),
      } }));

      /* Hjerteslaget holder forbindelsen i live — og tokenet
         fornyes samtidig, så en vagt på otte timer ikke mister
         lyden, når nøglen udløber efter én. */
      hjerte = setInterval(function () {
        send('phoenix', 'heartbeat', {});
        send(KANAL, 'access_token', { access_token: Butik.auth.token() });
      }, 25 * 1000);

    };

    ws.onmessage = function (h) {
      var besked;
      try { besked = JSON.parse(h.data); } catch (e) { return; }

      /* SVARET PÅ VORES EGEN TILMELDING. Det er dét, der afgør,
         om forbindelsen bærer — ikke at socket'en er åben. */
      if (besked.event === 'phx_reply' && besked.ref === tilmeldRef) {
        var ok = besked.payload && besked.payload.status === 'ok';
        oppe = !!ok;
        visTilstand();
        if (window.console) {
          if (ok) console.info('Direkte forbindelse bærer — nye bestillinger kommer af sig selv.');
          else console.warn('Realtime afviste tilmeldingen. Kør supabase/realtime.sql'
            + ' i Supabase — indtil da henter admin hvert 8. sekund i stedet.',
            besked.payload);
        }
        return;
      }
      if (besked.event === 'postgres_changes') planlægHentning();
    };

    /* Falder den, rejser den sig selv — med voksende afstand, så
       en nede-tjeneste ikke bliver hamret på. frisk.js' takt
       dækker imens. */
    ws.onclose = function () {
      clearInterval(hjerte);
      ws = null;
      oppe = false;
      visTilstand();
      setTimeout(forbind, provIgenMs);
      provIgenMs = Math.min(provIgenMs * 2, 60 * 1000);
    };

    ws.onerror = function () {
      try { ws.close(); } catch (e) { /* allerede lukket */ }
    };
  }

  Admin.vedLogin.push(forbind);
})();
