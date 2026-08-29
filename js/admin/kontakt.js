/* Fanen Kontakt: adresse, telefon og e-mail. Se js/admin/kerne.js
   for de to principper der gælder i alle admin-filerne. */
(function () {
  'use strict';

  var $ = Admin.$;

  function tegnKontakt() {
    var l = (Admin.data.lokationer || [])[0];
    if (!l) return;
    $('lok-navn').value = l.navn || '';
    $('lok-adresse').value = l.adresse || '';
    $('lok-postnr').value = l.postnr || '';
    $('lok-by').value = l.by || '';
    $('lok-telefon').value = l.telefon || '';
    $('lok-beskrivelse').value = l.beskrivelse || '';
    $('lok-email').value = (Admin.data.indstillinger || {}).kontakt_email || l.email || '';

    /* ⚠️ TOM ER IKKE DET SAMME SOM ALDRIG SAT.
       Er nøglen slet ikke i databasen, står HTML'ens adresse på
       hjemmesiden — og feltet her skal så også være tomt, så
       ingen tror, den er nedlagt. Er den sat til tomt, HAR nogen
       taget adressen af siden, og det er en anden tilstand. Se
       js/skal/kontakt.js. */
    var i = Admin.data.indstillinger || {};
    [['post-selskab', 'kontakt_email_selskab'],
      ['post-booking', 'kontakt_email_booking'],
      ['soc-facebook', 'social_facebook'],
      ['soc-instagram', 'social_instagram'],
      ['soc-google', 'social_google']].forEach(function (par) {
      var f = $(par[0]);
      if (!f || document.activeElement === f) return;
      var v = i[par[1]];
      f.value = (v === undefined || v === null) ? '' : v;
    });
  }

  /* Tjekket og skrivningen står ét sted, så knappen og autogem
     ikke kan komme til at gøre to forskellige ting. Den returnerer
     en TEKST, hvis noget mangler — autogem viser den i sit lille
     mærke, og knappen brøler den. */
  function samlKontakt() {
    var l = (Admin.data.lokationer || [])[0];
    if (!l) return 'Der er ingen lokation at rette. Kør setup.sql først.';

    var f = Butik.tjek.navn($('lok-navn').value, 'navn', 120)
         || Butik.tjek.navn($('lok-adresse').value, 'adresse', 120)
         || Butik.tjek.navn($('lok-by').value, 'by', 80);
    if (f) return f;
    if (!/^\d{4}$/.test($('lok-postnr').value.trim())) return 'Postnummeret skal være fire cifre.';

    var email = $('lok-email').value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'E-mailen ser ikke rigtig ud.';

    /* De to adresser, gæsten skriver til. Samme tjek som ovenfor:
       en adresse med en tastefejl er værre end ingen — gæsten
       skriver, får ingen fejl, og hører aldrig fra nogen. */
    var post = [];
    var navne = { 'post-selskab': 'Selskaber, catering og baglokale',
      'post-booking': 'Bordbestilling' };
    var noegler = { 'post-selskab': 'kontakt_email_selskab',
      'post-booking': 'kontakt_email_booking' };
    for (var n = 0; n < 2; n++) {
      var id = n === 0 ? 'post-selskab' : 'post-booking';
      var felt = $(id);
      if (!felt) continue;
      var v = felt.value.trim();
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        return navne[id] + ': e-mailen ser ikke rigtig ud.';
      }
      post.push([noegler[id], v]);
    }

    /* ⚠️ EN ADRESSE, DER IKKE ER EN ADRESSE, ER ET DØDT LINK IGEN.
       Vi tjekker ikke, at profilen findes — det kan ingen — men en
       tekst uden et punktum i er ikke en hjemmeside, og så ville
       chippen komme tilbage på forsiden og pege ingen steder hen. */
    ['soc-facebook', 'soc-instagram', 'soc-google'].forEach(function (id) {
      var f = $(id);
      if (!f) return;
      var v = f.value.trim();
      if (v && !/\./.test(v)) v = '';
      post.push([id.replace('soc-', 'social_'), v]);
    });

    return Butik.skrive.lokation({
      id: l.id,
      navn: $('lok-navn').value,
      adresse: $('lok-adresse').value,
      postnr: $('lok-postnr').value,
      by: $('lok-by').value,
      telefon: $('lok-telefon').value,
      beskrivelse: $('lok-beskrivelse').value,
    }).then(function () {
      return Butik.skrive.indstilling('kontakt_email', email);
    }).then(function () {
      /* Én ad gangen og i rækkefølge: to skrivninger til den samme
         tabel på én gang, og den sidste vinder uden en fejl. */
      return post.reduce(function (kaede, par) {
        return kaede.then(function () {
          return Butik.skrive.indstilling(par[0], par[1]);
        });
      }, Promise.resolve());
    });
  }

  $('gem-kontakt').addEventListener('click', function () {
    var svar = samlKontakt();
    if (typeof svar === 'string') return Admin.brøl(svar);
    Admin.gem(svar, 'Kontaktoplysningerne er gemt.');
  });

  /* Adressen rettes én gang om året — og netop derfor er den
     farlig: den, der endelig gør det, husker ikke, at der er en
     knap. */
  Admin.autogem($('gem-kontakt').closest('.kort'), samlKontakt);

  Admin.tegnere.push(tegnKontakt);
})();
