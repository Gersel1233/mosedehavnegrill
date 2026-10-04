/* ============================================================
   NY ADGANGSKODE FRA MAILENS LINK  (4/10)
   ------------------------------------------------------------
   Mikkels ord: *"har glemt deres adganskoder osv til deres
   login"*. MÅLT i databasen samme dag: chefens login var aldrig
   blevet brugt, og køkkenets iPad kørte på én session fra
   overdragelsesdagen. Vejen ind igen var at ringe til Lesreg.

   Supabase sender mailen (Butik.auth.glemtKode), og linket i den
   lander her med en midlertidig nøgle i adressens hash.

   ⚠️ NØGLEN TØRRES AF ADRESSELINJEN MED DET SAMME. Den er et
   login i tekstform, og adresselinjen deles, skrives ned, ligger
   i historikken og står på en skærm i et køkken, hvor andre går
   forbi. Den gemmes heller ikke i localStorage eller
   sessionStorage — den lever i variablen nedenfor, til koden er
   sat, og så er den væk.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var form = $('ny-kode-form');
  var fejl = $('ny-kode-fejl');
  var besked = $('ny-kode-besked');

  function vis(felt, tekst) {
    felt.textContent = tekst;
    felt.classList.remove('skjult');
  }
  function skjul(felt) { felt.classList.add('skjult'); }

  /* Supabase lægger svaret i hash'en — både nøglen og en afvisning.
     Et udløbet link kommer som #error=...&error_code=otp_expired. */
  function læsHash() {
    var h = String(location.hash || '').replace(/^#/, '');
    var ud = {};
    h.split('&').forEach(function (par) {
      if (!par) return;
      var i = par.indexOf('=');
      var n = i < 0 ? par : par.slice(0, i);
      var v = i < 0 ? '' : par.slice(i + 1);
      ud[decodeURIComponent(n)] = decodeURIComponent(v.replace(/\+/g, ' '));
    });
    return ud;
  }

  var h = læsHash();
  /* ⚠️ VÆK FRA ADRESSELINJEN, FØR NOGET ANDET SKER. replaceState
     lægger ingen post i historikken — knappen Tilbage fører
     stadig derhen, folk kom fra. */
  if (location.hash) {
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch (e) {
      /* Et browserværn mod replaceState må ikke koste siden. Så
         står nøglen i adressen, og det er stadig bedre end en
         skærm, der ikke virker. */
    }
  }

  var nøgle = h.access_token || '';

  if (h.error || h.error_code || h.error_description) {
    /* ⚠️ PÅ DANSK. "Email link is invalid or has expired" er
       browserens og Supabases sprog, ikke køkkenets. Det her er
       den almindelige fejl: linket er en time gammelt eller
       allerede brugt. */
    vis(besked, 'Linket er udløbet eller allerede brugt. '
      + 'Gå tilbage til log ind og tryk "Glemt koden?" igen — '
      + 'så kommer der et nyt link.');
  } else if (!nøgle) {
    vis(besked, 'Den her side åbnes fra linket i mailen. '
      + 'Har du ikke fået en mail, så gå tilbage til log ind og '
      + 'tryk "Glemt koden?".');
  } else {
    form.classList.remove('skjult');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    skjul(fejl);
    skjul(besked);

    var k1 = $('kode1').value;
    var k2 = $('kode2').value;

    /* ⚠️ DE TO FELTER TJEKKES HER OG IKKE FØRST AF DATABASEN. En
       tastefejl i en skjult kode opdages ellers først, næste gang
       nogen prøver at logge ind — og så er linket brugt. */
    if (k1 !== k2) {
      vis(fejl, 'De to koder er ikke ens. Skriv den samme kode i begge felter.');
      return;
    }
    /* Supabases egen grænse er 6 tegn. Vi beder om 8: koden deles
       af et helt køkken og skiftes sjældent. */
    if (k1.length < 8) {
      vis(fejl, 'Koden skal være på mindst 8 tegn.');
      return;
    }

    var knap = $('saet-kode');
    knap.disabled = true;
    knap.textContent = 'Gemmer…';

    Butik.auth.saetNyKode(nøgle, k1)
      .then(function () {
        form.classList.add('skjult');
        vis(besked, 'Koden er sat. Nu kan I logge ind med den nye kode.');
        /* Nøglen har gjort sit. */
        nøgle = '';
      })
      .catch(function (err) {
        vis(fejl, err.message || 'Koden kunne ikke sættes.');
      })
      .then(function () {
        knap.disabled = false;
        knap.textContent = 'Gem den nye kode';
      });
  });
}());
