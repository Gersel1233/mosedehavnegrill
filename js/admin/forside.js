/* Fanen Forside: billederne. Se js/admin/kerne.js for de to
   principper der gælder i alle admin-filerne.

   ⚠️ DAGENS RET BOR PÅ SIN EGEN FANE NU (29/8) — ugeplanen og
   hurtigfeltet er flyttet 1:1 til js/admin/dagensret.js, for
   retten skrives hver morgen og hører til i Dagen-gruppen, ikke
   mellem hjemmesidens pynt.
 */
(function () {
  'use strict';

  var $ = Admin.$;

  /* ⚠️ "DAGENS KUGLER" ER FJERNET (30/8). Kundens ord: "fjern
     det der lort, det bruger vi ikke."

     Han har ret i mere end det: kortet styrede INGENTING. Tavlen
     blev læst af js/side.js — den GAMLE forside — og den fil
     indlæses ikke af én eneste side efter sammenlægningen 30/8.
     Ejeren har altså kunnet skrive fem kugler med farvekoder ind
     i et felt, hvor de aldrig kom nogen steder hen.

     Indstillingen dagens_kugler bliver liggende i databasen; den
     rører ingenting, og en oprydning i data er en SQL-fil, ingen
     har brug for. */

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
    /* CATERINGSIDEN (4/9). Samme galleri som smørrebrødssidens:
       ét stort til venstre og to små til højre. Billeder af MADEN
       til et selskab — fadet på bordet, anretningen, kagen — ikke
       af lokalet: catering er den mad, der kører UD af huset. */
    { noegle: 'foto_catering_1', navn: 'Catering — det store',
      hvor: 'venstre side af galleriet på cateringsiden' },
    { noegle: 'foto_catering_2', navn: 'Catering — øverst til højre',
      hvor: 'det lille billede øverst til højre i galleriet' },
    { noegle: 'foto_catering_3', navn: 'Catering — nederst til højre',
      hvor: 'det lille billede nederst til højre i galleriet' },
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
    /* HISTORIEN OM HAVNEN (31/8). Fire pladser på historiesiden.
       ⚠️ DE GAMLE ARKIVBILLEDER LÆGGER VI IKKE IND FOR JER.
       Rettighederne til et arkivfoto er ikke vores at give
       videre, og siden her er en forretnings. Læg de billeder op,
       I selv har taget — eller har fået lov til at bruge. Uden et
       foto står en mørk flade med et tegn; siden ser hel ud. */
    { noegle: 'foto_historie_1', navn: 'Historien — havnen',
      hvor: 'første kapitel på "Historien om Mosede Havn"' },
    { noegle: 'foto_historie_2', navn: 'Historien — ankeret',
      hvor: 'kapitlet om ankeret fra 1710' },
    { noegle: 'foto_historie_3', navn: 'Historien — det gamle ishus',
      hvor: 'kapitlet om ishuset og grillen' },
    { noegle: 'foto_historie_4', navn: 'Historien — havnen i dag',
      hvor: 'sidste kapitel, før slutningen' },
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

  Admin.tegnere.push(tegnFotos);
})();
