/* Fanen Forside: dagens ret og dagens kugler. Se js/admin/kerne.js
   for de to principper der gælder i alle admin-filerne.

   DE TO TING ER DET ENESTE PÅ FORSIDEN, DER SKIFTER FRA DAG TIL
   DAG. Det er hele grunden til, at de findes: en forside, hvor
   der står det samme i november som i juni, er der ingen grund
   til at kigge på to gange.

   Listen redigeres som tekst med én kugle pr. linje. Tavlen
   skiftes hver morgen af en travl medarbejder – dér er et
   tekstfelt hurtigere end en række felter der skal klikkes frem
   én ad gangen. */
(function () {
  'use strict';

  var $ = Admin.$;

  function tegnForside() {
    var ind = Admin.data.indstillinger || {};

    var ret = ind.dagens_ret || {};
    $('dagens-navn').value = ret.navn || '';
    $('dagens-desc').value = ret.beskrivelse || '';
    /* Prisen vises tom, når der ikke er en. Et "0" i feltet ville
       se ud som en pris, nogen havde skrevet. */
    $('dagens-pris').value = (typeof ret.pris === 'number' && isFinite(ret.pris))
      ? String(ret.pris).replace('.', ',') : '';

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

  /* Prisen skrives som 89 eller 89,50 — det er sådan, den står på
     et menukort. Tom er også et svar: så står der ingen pris på
     forsiden, og det er bedre end et gæt. */
  function laesPris(v) {
    var t = String(v || '').trim().replace(',', '.');
    if (!t) return { pris: null };
    var n = Number(t);
    if (!isFinite(n) || n < 0) return { fejl: 'Prisen skal være et tal — eller tom.' };
    if (n > 10000) return { fejl: 'Prisen ser forkert ud – over 10.000 kr.' };
    return { pris: Math.round(n * 100) / 100 };
  }

  /* VAGTHUNDEN — spiis' brief (22/8): personalet skriver "Lukket
     i dag" i feltet til dagens ret, fordi det er det felt, de har
     åbent — og så står beskeden på forsiden som en RET, man kan
     BESTILLE, med tæller og send-knap. Det er en fejl, de laver
     hele tiden derovre, og den rammer gæsten som en bestilling på
     ingenting.

     Ordlisten er kort med vilje: den skal fange beskeder, ikke
     retter. "Lukket landgang" er et opdigtet eksempel på et
     sammenstød — findes en ret en dag med et af ordene i, går
     man bare videre gennem spørgsmålet. Et spørgsmål er en pris,
     personalet kan betale; en bestilling på "Lukket i dag" er
     ikke. */
  function lignerBesked(tekst) {
    return /lukket|lukker|holder fri|ferie|åbner|aabner|kommer igen|udsolgt|ingen dagens ret/i
      .test(tekst);
  }

  $('gem-dagens').addEventListener('click', function () {
    var navn = $('dagens-navn').value.trim();
    if (!navn) {
      return Admin.brøl('Skriv retten — eller tryk Ryd, hvis der ikke er en i dag.');
    }
    var p = laesPris($('dagens-pris').value);
    if (p.fejl) return Admin.brøl(p.fejl);

    if (lignerBesked(navn) && !confirm('"' + navn + '" ligner en BESKED, ikke en ret.\n\n'
      + 'Dagens ret står på forsiden som noget, gæsterne kan BESTILLE — '
      + 'med antal og send-knap. Er det en besked om åbningstider eller '
      + 'lukning, hører den til i kalenderen (lukkedag eller tidlig '
      + 'lukning), ikke her.\n\n'
      + 'Gem den som dagens ret alligevel?')) return;

    Admin.gem(Butik.skrive.indstilling('dagens_ret', {
      navn: navn.slice(0, 80),
      beskrivelse: $('dagens-desc').value.trim().slice(0, 160),
      pris: p.pris,
    }), 'Dagens ret står på forsiden nu.');
  });

  $('ryd-dagens').addEventListener('click', function () {
    /* Spørgsmålet står her, fordi det IKKE kan fortrydes fra
       skærmen: teksten er væk, og den skal skrives igen. */
    if (!confirm('Ryd dagens ret?\n\nSå står der ingen dagens ret på forsiden.')) return;
    Admin.gem(Butik.skrive.indstilling('dagens_ret',
      { navn: '', beskrivelse: '', pris: null }),
    'Dagens ret er ryddet.');
  });

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
