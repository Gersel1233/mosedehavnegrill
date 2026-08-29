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

  /* ============================================================
     BILLEDER PÅ FORSIDEN  (29/8)

     ⚠️ FIRE TOMME FIRKANTER STOD PÅ FORSIDEN. Designet leverede
     fire <image-slot> — tapasfadet og selskabernes tre — og uden
     et foto tegnede de sig som stiplede grå kasser med teksten
     "Foto: anretning" i midten. Kundens ord: "kedeligt hele
     vejen ned".

     Forsiden viser en farvet flade med et tegn i stedet, så den
     ser hel ud uden et foto. Fladen er en RESERVE, ikke et mål —
     her lægger ejeren de rigtige billeder op.

     ⚠️ SAMME SPAND OG SAMME KOMPRIMERING SOM NYHEDERNE.
     Butik.skrive.nyhedBillede skalerer og beskærer i browseren,
     før noget sendes; en ny vej op ville være en anden
     billedstørrelse på den samme forside. Ingen ny SQL:
     adresserne bor i indstillinger, som er nøgle/værdi.

     ⚠️ TEKSTEN VED HVER PLADS ER PLADSENS EGEN. Står der bare
     "Billede 1", ved ingen, hvor på siden det havner — og et
     foto af en sandwich i tapasfadets plads er en forkert
     oplysning om maden, ikke bare et skævt billede. */
  var FOTO_PLADSER = [
    /* ⚠️ TAPASFADET ER ÉT FOTO PÅ TO SIDER — forsidens
       tapas-afsnit og hele tapassiden. To felter til det samme
       fad ville betyde, at ejeren skiftede det ene og glemte det
       andet, og så ville gæsten se to forskellige fade på vejen
       fra forsiden til bestillingen. */
    { noegle: 'foto_tapas', navn: 'Tapasfadet',
      hvor: 'forsidens tapas-afsnit OG toppen af tapassiden' },
    /* ⚠️ NØGLERNE HEDDER STADIG foto_selskab_*, selv om galleriet
       flyttede til smørrebrødssiden (29/8). Et navneskifte ville
       betyde, at et foto, ejeren allerede HAVDE lagt op, forsvandt
       fra siden uden en fejl — nøglen i databasen ville ikke
       længere blive slået op. Teksten fortæller, hvor billedet
       havner; nøglen er bare en nøgle. */
    { noegle: 'foto_selskab_1', navn: 'Smørrebrød — det store',
      hvor: 'venstre side af galleriet på "Smørrebrød ud af huset"' },
    { noegle: 'foto_selskab_2', navn: 'Smørrebrød — øverst til højre',
      hvor: 'det lille billede øverst til højre i galleriet' },
    { noegle: 'foto_selskab_3', navn: 'Smørrebrød — nederst til højre',
      hvor: 'det lille billede nederst til højre i galleriet' },
    { noegle: 'foto_baglokale', navn: 'Baglokalet',
      hvor: 'billedet øverst på siden om udlejning af baglokalet' },
    /* Stemningsgalleriet i forsidens selskabsafsnit (29/8): tre
       fliser, der hver blænder roligt mellem TO fotos — 1 skifter
       med 4, 2 med 5, 3 med 6. Med kun det ene foto i parret står
       flisen stille, og uden ét eneste foto findes galleriet slet
       ikke på forsiden. Billeder af STEDET og stemningen — jul i
       baglokalet, terrassen, musik på dækket — ikke af maden:
       maden har sine egne pladser ovenfor. */
    { noegle: 'foto_stemning_1', navn: 'Stemning — det store felt',
      hvor: 'forsidens selskabsafsnit, det store felt til venstre' },
    { noegle: 'foto_stemning_4', navn: 'Stemning — det store felt, nr. 2',
      hvor: 'samme felt — de to skifter roligt mellem hinanden' },
    { noegle: 'foto_stemning_2', navn: 'Stemning — øverst til højre',
      hvor: 'forsidens selskabsafsnit, det lille felt øverst' },
    { noegle: 'foto_stemning_5', navn: 'Stemning — øverst til højre, nr. 2',
      hvor: 'samme felt — de to skifter roligt mellem hinanden' },
    { noegle: 'foto_stemning_3', navn: 'Stemning — nederst til højre',
      hvor: 'forsidens selskabsafsnit, det lille felt nederst' },
    { noegle: 'foto_stemning_6', navn: 'Stemning — nederst til højre, nr. 2',
      hvor: 'samme felt — de to skifter roligt mellem hinanden' },
  ];

  function tegnFotos() {
    var rod = $('foto-felter');
    if (!rod) return;
    var ind = (Admin.data && Admin.data.indstillinger) || {};

    /* ⚠️ FELTET TEGNES KUN OM, NÅR DER ER SKET NOGET. tegnere
       kører efter hvert gem, og en optegning under en igangværende
       upload ville rive filfeltet ud af siden, mens billedet var
       på vej op. Aftrykket er adresserne, i rækkefølge. */
    var aftryk = FOTO_PLADSER.map(function (p) {
      return String(ind[p.noegle] || '');
    }).join('|');
    if (rod.getAttribute('data-aftryk') === aftryk) return;
    rod.setAttribute('data-aftryk', aftryk);

    while (rod.firstChild) rod.removeChild(rod.firstChild);
    FOTO_PLADSER.forEach(function (p) { rod.appendChild(fotoRaekke(p, ind)); });
  }

  function fotoRaekke(p, ind) {
    var url = String(ind[p.noegle] || '').trim();

    var raekke = document.createElement('div');
    raekke.className = 'admin-raekke foto-raekke';
    raekke.setAttribute('data-foto', p.noegle);

    /* Er der et billede, står det HER — ikke som en adresse.
       Et navn på en fil siger ingenting om, hvad der er på det,
       og så lægger nogen det samme foto op to steder. */
    var mini = document.createElement(url ? 'img' : 'div');
    mini.className = 'foto-mini' + (url ? '' : ' tom');
    if (url) { mini.src = url; mini.alt = ''; } else { mini.textContent = '—'; }
    raekke.appendChild(mini);

    var midt = document.createElement('div');
    midt.className = 'foto-midt';
    var navn = document.createElement('strong');
    navn.textContent = p.navn;
    var hvor = document.createElement('span');
    hvor.className = 'hjaelp';
    hvor.textContent = p.hvor;
    midt.appendChild(navn);
    midt.appendChild(hvor);
    raekke.appendChild(midt);

    var vaelg = document.createElement('label');
    vaelg.className = 'knap lille';
    vaelg.textContent = url ? 'Skift' : 'Vælg foto';
    var fil = document.createElement('input');
    fil.type = 'file';
    fil.accept = 'image/jpeg,image/png,image/webp';
    fil.className = 'skjult-fil';
    fil.addEventListener('change', function () {
      var f = fil.files && fil.files[0];
      if (!f) return;
      Admin.kvitter('Lægger billedet op …');
      Butik.skrive.nyhedBillede(f).then(function (adresse) {
        return Admin.gem(Butik.skrive.indstilling(p.noegle, adresse),
          p.navn + ' er lagt op.');
      }).catch(function (e) {
        fil.value = '';
        Admin.brøl(e.message || String(e));
      });
    });
    vaelg.appendChild(fil);
    raekke.appendChild(vaelg);

    if (url) {
      var fjern = document.createElement('button');
      fjern.className = 'knap lille';
      fjern.textContent = 'Fjern';
      fjern.addEventListener('click', function () {
        /* TOMT, IKKE SLETTET. Adressen sættes til "", og forsiden
           tegner fladen igen af sig selv — filen i spanden rører
           vi ikke, for den kan være lagt op et andet sted. */
        Admin.gem(Butik.skrive.indstilling(p.noegle, ''),
          p.navn + ' er fjernet — fladen står igen.');
      });
      raekke.appendChild(fjern);
    }

    return raekke;
  }

  Admin.tegnere.push(tegnForside);
  Admin.tegnere.push(tegnUgen);
  Admin.tegnere.push(tegnFotos);
})();
