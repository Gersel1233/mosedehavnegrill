/* Log ind og ud. Se js/admin/kerne.js for de to principper der
   gælder i alle admin-filerne.

   Filen indlæses SIDST: det er den der trykker på startknappen,
   og alle faner skal have skrevet sig ind i Admin.tegnere før
   den første genindlæsning. */
(function () {
  'use strict';

  var $ = Admin.$;
  var ØVETILSTAND = !Butik.sky;

  /* To veje ud, og de skal opføre sig ens. Topbjælken bærer den på
     en telefon; sidemenuen bærer den fra 900 px og op, hvor
     bjælken er skjult. Én af dem alene ville betyde, at personalet
     ikke kan logge ud på den ene af de to skærme. */
  var udgange = ['log-ud', 'log-ud-side'];

  function visAdmin() {
    $('login').classList.add('skjult');
    $('admin').classList.remove('skjult');
    /* Skallen på computer — mørk sidemenu, ingen topbjælke — hører
       til ARBEJDET og ikke til login-skærmen. Uden klassen ville
       login stå uden hoved og uden gutter, mens der endnu ikke er
       en sidemenu til at bære navnet. Se css/style.css. */
    document.body.classList.add('arbejder');
    udgange.forEach(function (id) {
      if ($(id)) $(id).classList.remove('skjult');
    });
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

  /* ============================================================
     GLEMT KODEN  (4/10)
     ------------------------------------------------------------
     MÅLT i databasen samme dag: chefens login (bogholderi@) var
     ALDRIG blevet brugt — oprettet 15/9, nul sessioner — og
     køkkenets iPad kørte på én session fra overdragelsesdagen.
     Den dag, den session dør, står personalet uden for døren, og
     vejen ind igen var at ringe til Lesreg.

     ⚠️ BESKEDEN ER DEN SAMME, OM E-MAILEN FINDES ELLER EJ. Ellers
     er loginskærmen en liste over, hvem der kan komme ind. Den
     står i sit eget felt og ikke i fejlfeltet — en mail på vej er
     ikke en fejl. Reglen om selve kaldet bor i Butik.auth. */
  var GLEMT_SVAR = 'Hvis der findes et login med den e-mail, er der nu sendt '
    + 'en mail med et link til at sætte en ny kode. Linket holder en time. '
    + 'Kig også i spam.';

  if ($('glemt-kode')) {
    $('glemt-kode').addEventListener('click', function () {
      var fejl = $('login-fejl');
      var besked = $('login-besked');
      fejl.classList.add('skjult');
      besked.classList.add('skjult');

      var email = $('email').value.trim();
      if (!email) {
        /* ⚠️ FELTET ER DER ALLEREDE — vi beder ikke om adressen i en
           prompt. Den, der har glemt sin kode, har som regel
           skrevet sin e-mail i forvejen. */
        fejl.textContent = 'Skriv din e-mail i feltet ovenfor først — '
          + 'så sender vi linket dertil.';
        fejl.classList.remove('skjult');
        $('email').focus();
        return;
      }

      var knap = $('glemt-kode');
      knap.disabled = true;
      knap.textContent = 'Sender…';

      Butik.auth.glemtKode(email)
        .then(function () {
          besked.textContent = GLEMT_SVAR;
          besked.classList.remove('skjult');
        })
        .catch(function (err) {
          fejl.textContent = err.message || 'Mailen kunne ikke sendes.';
          fejl.classList.remove('skjult');
        })
        .then(function () {
          knap.disabled = false;
          knap.textContent = 'Glemt koden?';
        });
    });
  }

  udgange.forEach(function (id) {
    if (!$(id)) return;
    $(id).addEventListener('click', function (e) {
      e.preventDefault();
      Butik.auth.logout();
      location.reload();
    });
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
