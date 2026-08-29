/* Fanen Forside: dagens kugler og billederne. Se js/admin/kerne.js
   for de to principper der gælder i alle admin-filerne.

   ⚠️ DAGENS RET BOR PÅ SIN EGEN FANE NU (29/8) — ugeplanen og
   hurtigfeltet er flyttet 1:1 til js/admin/dagensret.js, for
   retten skrives hver morgen og hører til i Dagen-gruppen, ikke
   mellem hjemmesidens pynt.

   Kuglelisten redigeres som tekst med én kugle pr. linje. Tavlen
   skiftes hver morgen af en travl medarbejder – dér er et
   tekstfelt hurtigere end en række felter der skal klikkes frem
   én ad gangen. */
(function () {
  'use strict';

  var $ = Admin.$;

  function tegnForside() {
    var ind = Admin.data.indstillinger || {};

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
  Admin.tegnere.push(tegnFotos);
})();
