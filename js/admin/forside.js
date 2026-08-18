/* Fanen Forside: dagens kugler på tavlen. Se js/admin/kerne.js
   for de to principper der gælder i alle admin-filerne.

   Listen redigeres som tekst med én kugle pr. linje. Tavlen
   skiftes hver morgen af en travl medarbejder – dér er et
   tekstfelt hurtigere end en række felter der skal klikkes frem
   én ad gangen. */
(function () {
  'use strict';

  var $ = Admin.$;

  function tegnForside() {
    var ind = Admin.data.indstillinger || {};

    var kugler = Array.isArray(ind.dagens_kugler) ? ind.dagens_kugler : [];
    $('kugler').value = kugler.map(function (k) {
      return k.navn + (k.farve ? ' ' + k.farve : '');
    }).join('\n');
  }

  function linjer(v) {
    return String(v || '').split('\n')
      .map(function (l) { return l.trim(); })
      .filter(function (l) { return l.length > 0; });
  }

  $('gem-kugler').addEventListener('click', function () {
    var fejl = null;
    var kugler = linjer($('kugler').value).map(function (l) {
      // Farven står til sidst som #abc eller #aabbcc
      var m = l.match(/^(.*?)\s*(#[0-9a-fA-F]{3,8})?$/);
      var navn = (m[1] || '').trim();
      if (!navn) fejl = 'En linje mangler et navn.';
      if (navn.length > 60) fejl = '"' + navn.slice(0, 20) + '…" er for langt (højst 60 tegn).';
      return { navn: navn, farve: m[2] || '' };
    });
    if (fejl) return Admin.brøl(fejl);
    if (kugler.length > 20) return Admin.brøl('Højst 20 kugler. Der er ' + kugler.length + '.');

    Admin.gem(Butik.skrive.indstilling('dagens_kugler', kugler),
      kugler.length ? kugler.length + ' kugler er på tavlen.' : 'Tavlen er tømt, og afsnittet er skjult.');
  });

  Admin.tegnere.push(tegnForside);
})();
