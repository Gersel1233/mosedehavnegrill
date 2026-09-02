/* Personale: hvem må hvad, og hvem er holdt op. Se
   js/admin/kerne.js for de to principper, der gælder i alle
   admin-filerne.

   HVORFOR DEN FINDES
   ------------------------------------------------------------
   Logbogen har registreret HVEM siden 20/8 — men alle loggede
   ind som den samme, så den kunne ikke skelne. Og der var ingen
   vej til at lukke en medarbejder ude, når hun holdt op:
   adgangen ligger i `admin_adgang`, som browseren slet ikke
   havde rettigheder på, så ejeren skulle ind i Supabases
   dashboard for at slette en linje. Det holder man op med at
   gøre.

   ⚠️ SKÆRMEN ER PYNT, POLITIKKERNE ER VÆRNET
   ------------------------------------------------------------
   Fanen her — og de faner, den skjuler for en medarbejder — er
   bekvemmelighed. Det, der faktisk siger nej, er RLS og
   udløserne i supabase/roller.sql (18 × BESTOD, hvert værn set
   fejle). En skjult fane er stadig en fane, en nysgerrig kan
   kalde forbi; en politik er ikke.

   ⚠️ DEN SIDSTE EJER KAN IKKE FJERNES
   ------------------------------------------------------------
   Hverken af en anden eller af sig selv. Spærren er databasens
   (`mosede_sidste_ejer`), og den tæller EFTER ændringen, så den
   fanger sletning, deaktivering OG en degradering til
   medarbejder. Knapperne herunder er slået fra i det tilfælde,
   men det er en venlighed — svaret kommer fra databasen. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  /* ⚠️ FANERNE, DER IKKE ER MEDARBEJDERENS.

     De tre første er databasens: indstillinger, åbningstider og
     logbogen er ejerens i roller.sql, og en medarbejder, der
     åbnede dem, ville møde felter, der ikke kan gemmes.

     ⚠️ SALG ER ANDERLEDES, OG DET SKAL SIGES HØJT: den er skjult
     her, men den er IKKE beskyttet i databasen. Tallene regnes
     af bestillingerne, som personalet skal kunne læse for at
     lave maden. Fanen er altså en skærmbeslutning — ikke et
     værn. Skal omsætningen virkelig være lukket land, kræver det
     en visning med ejerens øjne, som optagne_dage har. */
  /* ⚠️ OG FANEN HER SELV. Første udgave glemte den — en
     medarbejder kunne åbne Personale og møde et tomt panel,
     fordi kortet indeni var skjult. Fundet af prøven, ikke ved
     at læse. */
  var KUN_EJER = ['p-tider', 'p-kontakt', 'p-historik', 'p-salg', 'p-personale'];

  function ejer() { return Admin.rolle !== 'medarbejder'; }

  /* Kaldes efter login og hver gang rollen er hentet. Fanerne
     bliver i opmærkningen — de skjules, så en senere ændring af
     rollen kan vise dem igen uden en genindlæsning. */
  function vekslFaner() {
    KUN_EJER.forEach(function (id) {
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-panel="' + id + '"], [data-gaa="' + id + '"]'),
        function (knap) { knap.hidden = !ejer(); });
    });
    /* Står man PÅ en skjult fane, når rollen kommer, flyttes man
       væk. Ellers ser en medarbejder et panel, hun ikke kan
       gemme i — og tror, systemet er i stykker.

       ⚠️ DEN ÅBNE FANE LÆSES AF SKÆRMEN (aria-selected), ikke af
       en variabel i koden. Det er den samme tilstand, kerne.js'
       visFane sætter, og den ene, en prøve også kan se. */
    var åben = document.querySelector('.faner button[aria-selected="true"]');
    if (!ejer() && åben && KUN_EJER.indexOf(åben.dataset.panel) !== -1) {
      Admin.visFane('p-overblik');
    }
    /* Kortet skjules OGSÅ — to lag, fordi fanen kan nås direkte
       med Admin.visFane fra et kort i overblikket. */
    var kort = $('personale-kort');
    if (kort) kort.hidden = !ejer();
  }

  Admin.vekslFaner = vekslFaner;

  // ----------------------------------------------------------
  //  LISTEN
  // ----------------------------------------------------------
  function tegn(liste) {
    var boks = $('personale-liste');
    if (!boks) return;
    Admin.tøm(boks);

    if (!liste || !liste.length) {
      boks.appendChild(lav('p', 'hjaelp',
        'Ingen på holdet endnu. Er supabase/roller.sql kørt?'));
      return;
    }

    /* Hvor mange aktive ejere er der? Er der én, kan hverken
       hans rolle, hans flueben eller hans linje røres — og
       knapperne siger det, i stedet for at lade ham prøve. */
    var ejere = liste.filter(function (p) {
      return p.aktiv !== false && p.rolle === 'ejer';
    });

    liste.forEach(function (p) {
      var sidste = ejere.length === 1 && p.aktiv !== false && p.rolle === 'ejer';
      var r = lav('div', 'admin-raekke');
      r.setAttribute('data-person', p.email);

      var navn = lav('div', 'pers-navn');
      navn.appendChild(lav('strong', null, p.navn || p.email));
      if (p.navn) navn.appendChild(lav('span', 'hjaelp', p.email));
      /* ⚠️ HUSETS EGEN .maerke.udsolgt — ikke en ny klasse. Første
         udgave skrev `b-maerke`, som INGEN stil kender, så
         "Lukket ude" stod som en tredje navnelinje i samme vægt
         som navnet. Målt på et skud. Og ordet er det samme som
         nyhedernes slukkede: en tilstand, ikke en handling. */
      if (p.aktiv === false) navn.appendChild(lav('span', 'maerke udsolgt', 'Lukket ude'));
      r.appendChild(navn);

      /* Rollen som to piller — den samme form som filtrene fik
         31/8, og af samme grund: to valg, der udelukker
         hinanden, er ikke to knapper. */
      var seg = lav('div', 'adm-seg');
      seg.setAttribute('role', 'group');
      seg.setAttribute('aria-label', 'Rolle for ' + (p.navn || p.email));
      [['ejer', 'Ejer'], ['medarbejder', 'Medarbejder']].forEach(function (v) {
        var b = lav('button', null, v[1]);
        b.type = 'button';
        b.setAttribute('data-rolle', v[0]);
        b.setAttribute('aria-pressed', p.rolle === v[0] ? 'true' : 'false');
        if (sidste && v[0] === 'medarbejder') {
          b.disabled = true;
          b.title = 'Der skal være mindst én aktiv ejer.';
        }
        b.addEventListener('click', function () {
          if (p.rolle === v[0]) return;
          gem(Object.assign({}, p, { rolle: v[0] }));
        });
        seg.appendChild(b);
      });
      r.appendChild(seg);

      var knapper = lav('div', 'knap-raekke');
      var slukKnap = lav('button', 'knap lille',
        p.aktiv === false ? 'Luk ind igen' : 'Luk ude');
      slukKnap.type = 'button';
      slukKnap.setAttribute('data-sluk', '');
      if (sidste) {
        slukKnap.disabled = true;
        slukKnap.title = 'Der skal være mindst én aktiv ejer.';
      }
      slukKnap.addEventListener('click', function () {
        gem(Object.assign({}, p, { aktiv: p.aktiv === false }));
      });
      knapper.appendChild(slukKnap);

      /* ⚠️ SLET ER SIDSTE UDVEJ OG STÅR SIDST. "Luk ude" er
         næsten altid det rigtige: rækken bliver stående, så
         logbogens navne stadig kan slås op. En slettet
         medarbejder er en logbog med en e-mail, ingen kan sætte
         et ansigt på. */
      var sletKnap = lav('button', 'knap lille', 'Slet');
      sletKnap.type = 'button';
      sletKnap.setAttribute('data-slet', '');
      if (sidste) {
        sletKnap.disabled = true;
        sletKnap.title = 'Der skal være mindst én aktiv ejer.';
      }
      sletKnap.addEventListener('click', function () {
        if (!window.confirm('Fjern ' + (p.navn || p.email)
            + ' helt? "Luk ude" beholder navnet i logbogen.')) return;
        Admin.gem(Butik.skrive.sletPersonale(p.email, p.lokation_id), 'Fjernet.')
          .then(hent);
      });
      knapper.appendChild(sletKnap);
      r.appendChild(knapper);

      boks.appendChild(r);
    });
  }

  function gem(p) {
    return Admin.gem(Butik.skrive.personale(p), 'Gemt.').then(hent);
  }

  function hent() {
    return Butik.hentPersonale().then(function (liste) {
      Admin.lister.personale = liste;
      tegn(liste);
    }).catch(function (e) {
      var boks = $('personale-liste');
      if (boks) {
        Admin.tøm(boks);
        /* ⚠️ EN FEJLET HENTNING OG EN TOM LISTE SER ENS UD. Derfor
           siger den her, hvad der er galt — og hvad man gør ved
           det. Det er som regel, at roller.sql ikke er kørt. */
        boks.appendChild(lav('p', 'fejl',
          Admin.forklarFejl ? Admin.forklarFejl(e) : String(e && e.message || e)));
      }
    });
  }

  Admin.hentPersonale = hent;
  Admin.hentVedFane('p-personale', hent);

  // ----------------------------------------------------------
  //  TILFØJ
  // ----------------------------------------------------------
  var tilfoej = $('pers-tilfoej');
  if (tilfoej) {
    tilfoej.addEventListener('click', function () {
      var mail = ($('pers-email') || {}).value || '';
      var valgt = document.querySelector('#pers-ny [data-nyrolle][aria-pressed="true"]');
      gem({
        email: mail,
        navn: ($('pers-navn') || {}).value || '',
        rolle: valgt ? valgt.getAttribute('data-nyrolle') : 'medarbejder',
        aktiv: true,
      }).then(function () {
        if ($('pers-email')) $('pers-email').value = '';
        if ($('pers-navn')) $('pers-navn').value = '';
      });
    });
  }

  /* Rollevælgeren på den nye — samme piller som på rækkerne.
     ⚠️ "Medarbejder" er valgt fra start: den, der tilføjer en ny,
     tilføjer som regel en, der skal stå ved lugen. Et fejltryk
     dér giver en ekstra ejer, og det opdager ingen. */
  Array.prototype.forEach.call(
    document.querySelectorAll('#pers-ny [data-nyrolle]'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(
          document.querySelectorAll('#pers-ny [data-nyrolle]'), function (x) {
            x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
          });
      });
    });

  // ----------------------------------------------------------
  //  ROLLEN HENTES VED LOGIN
  // ----------------------------------------------------------
  Admin.vedLogin.push(function () {
    return Butik.minRolle().then(function (r) {
      Admin.rolle = r;
      vekslFaner();
      if (ejer()) return hent();
      return null;
    }).catch(function () {
      /* ⚠️ KAN ROLLEN IKKE HENTES, ER MAN EJER. Filen er måske
         ikke kørt endnu, og et system, der låser sin egen ejer
         ude, fordi et kald fejlede, er værre end et uden roller.
         Databasen dømmer alligevel til sidst. */
      Admin.rolle = 'ejer';
      vekslFaner();
      return null;
    });
  });
}());
