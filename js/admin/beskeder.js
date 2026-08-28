/* Fanen Beskeder: dagens besked og sæson. Se js/admin/kerne.js
   for de to principper der gælder i alle admin-filerne. */
(function () {
  'use strict';

  var $ = Admin.$;

  function tegnBeskeder() {
    var ind = Admin.data.indstillinger || {};
    var b = ind.dagens_besked || { vis: false, tekst: '' };
    $('besked-vis').checked = !!b.vis;
    $('besked-tekst').value = b.tekst || '';

    var s = ind.saeson || { lukket: false, aabner_igen: '', besked: '' };
    $('saeson-lukket').checked = !!s.lukket;
    $('saeson-aabner').value = s.aabner_igen || '';
    $('saeson-besked').value = s.besked || '';
  }

  /* Tjek og skrivning ét sted, så knappen og autogem ikke kan
     komme til at gøre to forskellige ting. En TEKST betyder
     "ikke færdig endnu". */
  function samlBesked() {
    var vis = $('besked-vis').checked;
    var tekst = $('besked-tekst').value.trim();
    // At slå en tom besked til ville give en tom gul boks på
    // forsiden. Det er en fejl, ikke en tom besked.
    if (vis && !tekst) return 'Skriv en tekst, eller fjern hakket i "Vis beskeden".';
    return Butik.skrive.indstilling('dagens_besked', { vis: vis, tekst: tekst });
  }

  function samlSaeson() {
    return Butik.skrive.indstilling('saeson', {
      lukket: $('saeson-lukket').checked,
      aabner_igen: $('saeson-aabner').value.trim(),
      besked: $('saeson-besked').value.trim(),
    });
  }

  $('gem-besked').addEventListener('click', function () {
    var svar = samlBesked();
    if (typeof svar === 'string') return Admin.brøl(svar);
    /* ⚠️ KVITTERINGEN LØJ DEN ANDEN VEJ I FEM DAGE.
       Den sagde "den vises ikke på siden endnu", og det passede:
       beskeden havde ingen plads. Den fik en 28/8 — en rød stribe
       øverst på forsiden — og så var kvitteringen den forkerte.

       En kvittering skal sige, hvad der SKETE. Siger den mindre
       end sandheden, går personalet ned for at lede efter noget,
       de tror mangler; siger den mere, leder de efter noget, der
       ikke er der. Begge dele koster den samme tillid. */
    Admin.gem(svar, $('besked-vis').checked
      ? 'Beskeden står nu øverst på forsiden.'
      : 'Beskeden er slået fra og står ikke på siden.');
  });

  $('gem-saeson').addEventListener('click', function () {
    Admin.gem(samlSaeson(), $('saeson-lukket').checked
      ? 'Der står nu "Lukket for sæsonen" på forsiden.'
      : 'Sæsonlukningen er slået fra.');
  });

  /* ⚠️ SÆSONEN ER DEN, DER GØR MEST SKADE UGEMT. Et hak i "Lukket
     for sæsonen", der aldrig blev gemt, betyder en forside, der
     tager imod bestillinger, ingen laver. */
  Admin.autogem($('gem-besked').closest('.kort'), samlBesked);
  Admin.autogem($('gem-saeson').closest('.kort'), samlSaeson);

  Admin.tegnere.push(tegnBeskeder);
})();
