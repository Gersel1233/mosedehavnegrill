/* Log ind og ud. Se js/admin/kerne.js for de to principper der
   gælder i alle admin-filerne.

   Filen indlæses SIDST: det er den der trykker på startknappen,
   og alle faner skal have skrevet sig ind i Admin.tegnere før
   den første genindlæsning. */
(function () {
  'use strict';

  var $ = Admin.$;
  var ØVETILSTAND = !Butik.sky;

  function visAdmin() {
    $('login').classList.add('skjult');
    $('admin').classList.remove('skjult');
    $('log-ud').classList.remove('skjult');
    $('hvem').textContent = 'Logget ind som ' + Butik.auth.email();
    if (ØVETILSTAND) $('oeve-baand').classList.remove('skjult');
    Admin.genindlæs();
    // Fanerne henter selv det, kun de skal bruge. Filen her kender
    // ingen af dem ved navn — se Admin.vedLogin i kerne.js.
    Admin.vedLogin.forEach(function (hent) { hent(); });
  }

  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    $('login-fejl').classList.add('skjult');

    var knap = $('login-knap');
    knap.disabled = true;
    knap.textContent = 'Logger ind…';

    Butik.auth.login($('email').value.trim(), $('kode').value, $('husk').checked)
      .then(visAdmin)
      .catch(function (err) {
        var f = $('login-fejl');
        f.textContent = err.message || 'Kunne ikke logge ind.';
        f.classList.remove('skjult');
      })
      .then(function () {
        knap.disabled = false;
        knap.textContent = 'Log ind';
      });
  });

  $('log-ud').addEventListener('click', function (e) {
    e.preventDefault();
    Butik.auth.logout();
    location.reload();
  });

  if (ØVETILSTAND) $('oeve-besked').classList.remove('skjult');

  /* Var man logget ind i forvejen, springes login over.

     Butik.auth.fri() er sand på localhost UDEN database — altså når
     man selv kører siden på sin egen maskine i øvetilstand. Der er
     ingen at beskytte noget imod: localhost kan ikke nås fra
     internettet, og der er ingen rigtige data. Under byggeriet skal
     man ikke taste en kode for at se en side, man selv kører.

     Den udgivne adresse har låsen. Bestillinger indeholder gæsters
     navne og telefonnumre, og en åben admin lader hvem som helst
     ændre priser, åbningstider eller lukke butikken. */
  if (Butik.auth.loggetInd()) {
    visAdmin();
  } else if (Butik.auth.fri()) {
    Butik.auth.login('bygger@localhost', '').then(visAdmin);
  }
})();
