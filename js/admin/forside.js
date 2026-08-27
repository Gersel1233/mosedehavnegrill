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

    /* ⚠️ EN KUGLE KAN VÆRE EN TEKST I STEDET FOR ET OBJEKT.

       Formen er {navn, farve}, og det er den, gem-knappen
       skriver. Men står der en gammel eller håndskrevet række i
       databasen — bare "Vanilje" som tekst — gav k.navn
       `undefined`, og MÅLT stod der tre linjer med ordet
       "undefined" i feltet.

       Det værste er ikke, at det ser forkert ud: trykker nogen
       Gem tavlen bagefter, står der "undefined" på forsiden, som
       gæsten kan læse. Et felt, der viser noget uforståeligt,
       skal ikke også kunne gemme det. */
    var kugler = Array.isArray(ind.dagens_kugler) ? ind.dagens_kugler : [];
    $('kugler').value = kugler.map(function (k) {
      if (typeof k === 'string') return k;
      if (!k || typeof k !== 'object') return '';
      return (k.navn || '') + (k.farve ? ' ' + k.farve : '');
    }).filter(function (l) { return l.trim(); }).join('\n');
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

  /* ============================================================
     UGENS RETTER
     ------------------------------------------------------------
     Dagens ret var ÉN indstilling: ét navn, én dag, én pris.
     Menukortets ugeplan stod halvt tom af netop den grund — der
     fandtes ikke et sted at skrive torsdagens ret, og køkkenet
     planlægger ugen om mandagen.

     Kræver supabase/dagens-retter.sql. Er tabellen der ikke,
     svarer Butik.hent med en tom liste, og planen står tom med en
     linje om hvorfor — i stedet for at give en fejl, ingen kan
     handle på.

     ANTALLET TÆLLES AF DATABASEN. Feltet her sætter startantallet;
     bremsen i dagens-retter.sql trækker fra ved hver bestilling og
     sætter udsolgt ved nul. Derfor sendes tallet KUN med, når
     nogen har rørt feltet — ellers ville et gem midt i en frokost
     skrive morgenens tal tilbage og gøre en udsolgt ret bestilbar
     igen.
     ============================================================ */
  var DAGE_FREM = 7;

  function isoPlus(iso, dage) {
    var d = new Date(iso + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + dage);
    return d.toISOString().slice(0, 10);
  }

  function retterPaa(dato) {
    return (Admin.data.dagens_retter || [])
      .filter(function (r) { return r.dato === dato; })
      .sort(function (a, b) {
        return (a.sortering || 0) - (b.sortering || 0) || (a.id || 0) - (b.id || 0);
      });
  }

  function tegnUgen() {
    var boks = $('uge-retter');
    if (!boks) return;
    Admin.tøm(boks);

    var iDag = Butik.nu().dato;

    for (var i = 0; i < DAGE_FREM; i++) {
      var iso = isoPlus(iDag, i);
      boks.appendChild(dagKort(iso, i === 0));
    }
  }

  function dagKort(iso, erIDag) {
    var kort = Admin.lav('div', 'uge-dag');
    kort.setAttribute('data-dag', iso);

    var hoved = Admin.lav('div', 'uge-hoved');
    hoved.appendChild(Admin.lav('strong', null,
      Admin.pænDato(iso) + (erIDag ? '' : '')));
    if (Butik.lukketDen && Butik.lukketDen(Admin.data, iso)) {
      hoved.appendChild(Admin.lav('span', 'maerke udsolgt', 'Lukket'));
    }
    kort.appendChild(hoved);

    var retter = retterPaa(iso);
    retter.forEach(function (r) { kort.appendChild(retRaekke(r, retter)); });
    kort.appendChild(nyRetFelt(iso, retter));
    return kort;
  }

  function retRaekke(r, alle) {
    var raekke = Admin.lav('div', 'admin-raekke uge-ret');
    raekke.setAttribute('data-ret', r.id);

    var navn = document.createElement('input');
    navn.type = 'text'; navn.className = 'navn'; navn.maxLength = 120;
    navn.value = r.navn;

    var pris = document.createElement('input');
    pris.type = 'text'; pris.className = 'smal'; pris.inputMode = 'decimal';
    pris.placeholder = 'kr.';
    pris.setAttribute('aria-label', 'Pris på ' + r.navn);
    pris.value = (r.pris === null || r.pris === undefined)
      ? '' : String(r.pris).replace('.', ',');

    var antal = document.createElement('input');
    antal.type = 'number'; antal.className = 'smal'; antal.min = '0'; antal.max = '999';
    antal.placeholder = 'antal';
    antal.setAttribute('aria-label', 'Portioner tilbage af ' + r.navn);
    antal.value = (r.antal_tilbage === null || r.antal_tilbage === undefined)
      ? '' : String(r.antal_tilbage);

    var udsolgt = document.createElement('input');
    udsolgt.type = 'checkbox';
    udsolgt.checked = !!r.udsolgt;
    var udsolgtMaerkat = Admin.lav('label', 'afkryds');
    udsolgtMaerkat.appendChild(udsolgt);
    udsolgtMaerkat.appendChild(document.createTextNode('Udsolgt'));

    var tekst = document.createElement('input');
    tekst.type = 'text'; tekst.className = 'vare-tekst-felt'; tekst.maxLength = 600;
    tekst.value = r.beskrivelse || '';
    tekst.placeholder = 'Beskrivelse (valgfri) — den linje gæsten læser';

    // Rørt antallet? Se noten øverst: tallet sendes kun med, hvis
    // nogen har skrevet i feltet.
    var roert = false;
    antal.addEventListener('input', function () { roert = true; });

    var gem = Admin.lav('button', 'knap', 'Gem');
    gem.type = 'button';
    gem.addEventListener('click', function () {
      var f = Butik.tjek.navn(navn.value, 'ret', 120) || Butik.tjek.pris(pris.value);
      if (f) return Admin.brøl(r.navn + ': ' + f);
      var ny = {
        id: r.id, dato: r.dato, navn: navn.value, beskrivelse: tekst.value,
        pris: pris.value, udsolgt: udsolgt.checked, aktiv: r.aktiv,
        sortering: r.sortering,
      };
      if (roert) ny.antal_tilbage = antal.value;
      Admin.gem(Butik.skrive.dagensRet(ny), navn.value + ' er gemt.');
    });

    var slet = Admin.lav('button', 'knap fare', 'Slet');
    slet.type = 'button';
    slet.addEventListener('click', function () {
      if (!window.confirm('Fjern "' + r.navn + '" fra ' + Admin.pænDato(r.dato) + '?')) return;
      Admin.gem(Butik.skrive.sletDagensRet(r.id), r.navn + ' er fjernet.');
    });

    raekke.appendChild(navn);
    raekke.appendChild(pris);
    raekke.appendChild(antal);
    raekke.appendChild(udsolgtMaerkat);
    raekke.appendChild(gem);
    raekke.appendChild(slet);
    raekke.appendChild(tekst);
    return raekke;
  }

  function nyRetFelt(iso, alle) {
    var raekke = Admin.lav('div', 'admin-raekke');

    var navn = document.createElement('input');
    navn.type = 'text'; navn.className = 'navn'; navn.maxLength = 120;
    navn.placeholder = 'Ny ret';
    navn.setAttribute('aria-label', 'Ny ret ' + Admin.pænDato(iso));

    var pris = document.createElement('input');
    pris.type = 'text'; pris.className = 'smal'; pris.inputMode = 'decimal';
    pris.placeholder = 'kr.';

    var antal = document.createElement('input');
    antal.type = 'number'; antal.className = 'smal'; antal.min = '0'; antal.max = '999';
    antal.placeholder = 'antal';

    var knap = Admin.lav('button', 'knap', 'Tilføj');
    knap.type = 'button';
    knap.addEventListener('click', function () {
      var f = Butik.tjek.navn(navn.value, 'ret', 120) || Butik.tjek.pris(pris.value);
      if (f) return Admin.brøl(f);

      /* SAMME VAGTHUND SOM PÅ DAGENS RET. Personalet skriver
         "Lukket i dag" i det felt, de har åbent — og så står
         beskeden på forsiden som en ret, man kan BESTILLE. */
      if (lignerBesked(navn.value) && !confirm('"' + navn.value.trim()
        + '" ligner en BESKED, ikke en ret.\n\n'
        + 'Ugens retter står på forsiden som noget, gæsterne kan BESTILLE. '
        + 'Er det en besked om lukning, hører den til i kalenderen.\n\n'
        + 'Læg den ind som en ret alligevel?')) return;

      var højeste = alle.reduce(function (m, r) {
        return Math.max(m, Number(r.sortering) || 0);
      }, 0);

      Admin.gem(Butik.skrive.dagensRet({
        dato: iso, navn: navn.value, pris: pris.value,
        antal_tilbage: antal.value, sortering: højeste + 1,
      }), navn.value + ' står nu på ' + Admin.pænDato(iso) + '.');
    });

    raekke.appendChild(navn);
    raekke.appendChild(pris);
    raekke.appendChild(antal);
    raekke.appendChild(knap);
    return raekke;
  }

  Admin.tegnere.push(tegnForside);
  Admin.tegnere.push(tegnUgen);
})();
