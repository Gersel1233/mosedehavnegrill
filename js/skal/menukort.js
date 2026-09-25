/* ============================================================
   MENUKORTET — HELE SIDEN KOMMER FRA DATABASEN

   Siden er til at LÆSE. Der er ingen plusknapper, ingen kurv og
   ingen sum: bestillingen sker ét sted, og knappen i bunden fører
   derhen. Den gamle udgave havde en kurv, men den kunne ikke
   følge med over på bestillingsformularen — gæsten lagde tre ting
   i den og begyndte forfra på forsiden.

   Tre afsnit fyldes ud:

     1) I dag        — dagens ret og dagens åbningstid
     2) Ugen         — én række pr. dag, syv dage frem
     3) Sortimentet  — ét kort pr. kategori fra admin

   REGLEN ER DEN SAMME SOM PÅ FORSIDEN: et afsnit uden noget at
   vise findes ikke. Ingen dagens ret → kortet "I dag" er væk.
   Intet menukort i databasen → sortimentet er væk, og der står en
   linje med telefonnummeret i stedet for en tom side.
   ============================================================ */

(function () {
  'use strict';

  if (!window.Butik) return;

  var MÅNEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december'];

  /* ---- ET ANSIGT PR. KATEGORI ----
     Listen bor i js/menu-emoji.js, fordi bordsiden skal have de
     SAMME tegn. To lister over det samme sortiment skrider fra
     hinanden: ejeren opretter "Vegansk", nogen føjer et tegn til
     den ene fil, og så har de to sider hver sit ansigt på den
     samme kategori. Se noten i filen.

     Mangler filen, får kategorien den neutrale tallerken i
     stedet for at siden går i stå — et manglende emoji er en
     skæv tegning, ikke en forkert oplysning om maden. */
  function emojiFor(k) {
    return window.MosedeEmoji ? window.MosedeEmoji.forKategori(k) : '🍽️';
  }

  function $(id) { return document.getElementById(id); }
  function tøm(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }
  function skjul(el) { if (el) el.style.display = 'none'; }

  function lav(tag, klasse, tekst) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (tekst !== undefined && tekst !== null) el.textContent = tekst;
    return el;
  }

  /* "89" → "89,-". Tom pris giver tom streng — og så skriver
     kaldstedet "spørg" i stedet. Aldrig et nul: 79 af
     forretningens varer har ikke fået en pris endnu, og et 0 ville
     stå som gratis. */
  /* ⚠️ ALIAS, IKKE KOPI (5/9). Reglen bor i Butik.kroner. */
  function kroner(p) { return Butik.kroner(p); }

  function prisMærke(p) {
    /* ⚠️ ET NUL ER GRATIS (10/9), og det er en anden regel end
       `kroner` — se noten ved `Butik.varePris` i store.js. */
    var t = Butik.varePris(p);
    return t ? lav('span', 'mk-pris', t) : lav('span', 'mk-pris mk-spoerg', 'spørg');
  }

  /* isoPlus bor i js/store.js (Butik.isoPlus) — én regel ét sted.
     ⚠️ OG IKKE i R (bestil-regler): den fil indlæses slet ikke på
     m-menukort.html, så R ville være undefined her. store.js er.
     Hvorfor middag og ikke midnat står i kommentaren dér. (17/9) */

  function datoTekst(iso) {
    var t = new Date(iso + 'T12:00:00Z');
    return t.getUTCDate() + '. ' + MÅNEDER[t.getUTCMonth()];
  }

  function ugedagFor(iso) {
    return (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7;
  }

  /* Dagens åbningstid, som den STÅR: ugeplanen, med kalenderens
     tidlige lukning skåret af og lukkedagen slået igennem. Uden
     det sidste kunne kortet sige "11–20" på en dag, lugen er
     lukket. */
  function åbentTekst(d, iso) {
    if (Butik.lukketDen(d, iso)) return 'Lukket';
    var plan = (d.aabningstider || []).filter(function (a) {
      return a.ugedag === ugedagFor(iso);
    })[0];
    if (!plan || plan.lukket || !plan.aabner || !plan.lukker) return 'Lukket';

    var lukker = plan.lukker;
    var tidligt = Butik.tidligLukning(d, iso);
    if (tidligt && Butik.tilMinutter(tidligt) < Butik.tilMinutter(lukker)) lukker = tidligt;

    var kort = function (t) { return Butik.klokken(t, 'kort'); };
    return kort(plan.aabner) + '–' + kort(lukker);
  }

  // ----------------------------------------------------------
  //  1) I DAG
  // ----------------------------------------------------------
  function visIDag(d) {
    var kort = $('mk-idag');
    var afsnit = $('mk-idag-afsnit');
    if (!kort) return;

    var i_dag = Butik.nu().dato;
    var retter = Butik.dagensRetter(d, i_dag);
    if (!retter.length) return skjul(afsnit);

    tøm(kort);

    var top = lav('div', 'mk-top');
    top.appendChild(lav('h3', null, 'I dag'));
    top.appendChild(lav('span', 'mk-naar',
      datoTekst(i_dag) + ' · ' + åbentTekst(d, i_dag)));
    kort.appendChild(top);

    /* FLERE RETTER SAMME DAG er en liste og ikke ét langt navn.
       Før stod "Stegt flæsk eller fiskefilet" i det samme felt med
       ÉN pris — og så var det gæsten, der skulle gætte, hvad de to
       kostede hver især. */
    retter.forEach(function (ret) {
      var række = lav('div', 'mk-ret');
      var txt = lav('div', 'mk-txt');
      txt.appendChild(lav('h4', null, ret.navn));
      txt.appendChild(lav('span', 'tag', ret.udsolgt ? 'Udsolgt' : 'Dagens ret'));
      if (ret.beskrivelse) txt.appendChild(lav('p', null, ret.beskrivelse));
      /* "Kun 3 tilbage" står KUN, når køkkenet har sat et antal —
         og tallet tælles ned af databasen selv ved hver
         bestilling, ikke af et menneske. Se dagens-retter.sql.

         ⚠️ GRÆNSEN BOR I Butik.faaTilbage (5/9). Den stod som et
         hårdkodet `<= 5` her, og de tre bestillingsveje viste
         slet ikke tallet. Fire skærme skal sige det SAMME om,
         hvornår en ret er ved at slippe op. */
      var faa = Butik.faaTilbage(ret);
      if (faa !== null) {
        txt.appendChild(lav('span', 'mk-faa', 'Kun ' + faa + ' tilbage'));
      }
      række.appendChild(txt);
      række.appendChild(prisMærke(ret.pris));
      if (ret.udsolgt) række.classList.add('mk-udsolgt');
      kort.appendChild(række);
    });
  }

  // ----------------------------------------------------------
  //  2) UGEN DER KOMMER
  //  ----------------------------------------------------------
  //  HELE UGEN ER RIGTIG NU. Den stod halvt tom — "Følger snart…"
  //  fra tirsdag og frem — fordi der kun fandtes ét felt til
  //  dagens ret. Tabellen dagens_retter gav resten af ugen et
  //  sted at stå, og køkkenet planlægger ugen om mandagen.
  //
  //  "Følger snart…" står stadig på de dage, der ikke er skrevet
  //  endnu. En opdigtet ret på torsdag ville være et løfte,
  //  køkkenet ikke har givet.
  // ----------------------------------------------------------
  function visUgen(d) {
    var boks = $('mk-uge');
    if (!boks) return;

    var i_dag = Butik.nu().dato;
    tøm(boks);

    /* ⚠️ DE TOMME DAGE EFTER I DAG SAMLES I ÉN LINJE (26/9) — samme
       regel som forsidens ugestribe fra 13/9 (kundens ord: "noget er
       forældet … kedelige"). Her stod "Følger snart…" syv gange i
       træk, når ugen ikke var lagt op — en side under opbygning. En
       lukket dag og "ingen dagens ret" står stadig: de er
       beslutninger, ikke huller. */
    var skjulte = 0;
    for (var i = 0; i < 7; i++) {
      var iso = Butik.isoPlus(i_dag, i);
      var række = lav('div', 'mk-dag' + (i === 0 ? ' mk-nu' : ''));
      række.setAttribute('data-dag', iso);

      var venstre = lav('div', 'mk-navn',
        Butik.UGEDAGE[ugedagFor(iso)] + (i === 0 ? ' · i dag' : ''));
      venstre.appendChild(lav('span', 'mk-dato', datoTekst(iso)));
      række.appendChild(venstre);

      var højre = lav('div');
      var dagens = Butik.dagensRetter(d, iso);
      if (dagens.length) {
        dagens.forEach(function (ret) {
          højre.appendChild(lav('h4', null,
            ret.navn + (ret.udsolgt ? ' · udsolgt' : '')));
          if (ret.beskrivelse) højre.appendChild(lav('p', null, ret.beskrivelse));
          var p = kroner(ret.pris);
          if (p) højre.appendChild(lav('span', 'mk-pris', p));
        });
      } else if (Butik.lukketDen(d, iso)) {
        højre.appendChild(lav('span', 'mk-tom', 'Lukket'));
      } else if (Butik.ingenDagensRet && Butik.ingenDagensRet(d, iso)) {
        /* Ejeren har TRYKKET, at der ingen er (31/8) — "Følger
           snart…" ville love en ret, køkkenet har sagt nej til. */
        /* ⚠️ "I DAG" KUN PÅ I DAG (26/9). Der stod "Ingen dagens ret i
           dag" ud for en torsdag, når det var mandag. */
        højre.appendChild(lav('span', 'mk-tom',
          'Ingen dagens ret' + (i === 0 ? ' i dag' : '') + ' — menukortet gælder'));
      } else {
        if (i > 0) { skjulte++; continue; }
        højre.appendChild(lav('span', 'mk-tom', 'Følger snart…'));
      }
      række.appendChild(højre);
      boks.appendChild(række);
    }
    if (skjulte) {
      boks.appendChild(lav('p', 'mk-uge-mere', 'Resten af ugen lægges op løbende.'));
    }
  }

  // ----------------------------------------------------------
  //  3) SORTIMENTET
  // ----------------------------------------------------------
  /* ============================================================
     ET FOTO BAG KATEGORIEN  (13/9)
     ------------------------------------------------------------
     Kundens ord: "inde på menukort siden laver vi f.eks ved retter
     en stegt flæsk med persillesovs som baggrundsbillede ... også
     sortimentet uden på, som vi har på forsiden". Smørrebrød og
     håndmadder er EJERENS egne fotos; resten er GENERERET (Sjinn),
     på kundens beslutning — samme kategori som tapasbillederne
     11/9. Skiftes de til rigtige fotos, er det én linje her.

     ⚠️ KENDINGEN ER NAVNET, og rækkefølgen betyder noget:
     "Sandwich og retter fra pladen" indeholder "retter", og
     "Burgere og sandwich" indeholder "sandwich" — derfor kun
     præcis "Retter" for stegt flæsket. En kategori uden et
     match får intet foto (tilkøb, tillæg, drikkevarer). "Vælg
     fyld" er slukket hos ejeren og står her kun, så den aldrig
     arver smørrebrødets foto.
     ============================================================ */
  var FOTOS = [
    [/håndmad/, 'billeder/selskab-anretning.webp'],
    [/fyld/, null],
    [/smørrebrød/, 'billeder/selskab-fade.webp'],
    [/fra pladen/, 'billeder/menu-pladen.jpg'],
    [/burger/, 'billeder/menu-burgere.jpg'],
    [/pølse/, 'billeder/menu-poelser.jpg'],
    [/^retter$/, 'billeder/menu-retter.jpg'],
    [/tapas/, 'billeder/tapas-1.jpg'],
    [/platte/, 'billeder/menu-platter.jpg'],
    [/slider/, 'billeder/menu-sliders.jpg'],
    [/kugle|ishorn/, 'billeder/menu-kugleis.jpg'],
    [/softice/, 'billeder/menu-softice.jpg'],
    /* Morgenmad, kaffe og drikkevarerne (13/9, samme beslutning).
       ⚠️ PRÆCIS "Morgenmad": "Tilkøb morgenmad" skal ikke have et
       foto, og det indeholder ordet. */
    [/^morgenmad$/, 'billeder/menu-morgenmad.jpg'],
    [/kaffe/, 'billeder/menu-kaffe.jpg'],
    [/^øl$/, 'billeder/menu-oel.jpg'],
    [/^vin\b|cava|champagne/, 'billeder/menu-vin.jpg'],
    [/sodavand/, 'billeder/menu-sodavand.jpg'],
  ];
  function fotoFor(k) {
    var n = String((k && k.navn) || '').toLowerCase().trim();
    for (var i = 0; i < FOTOS.length; i++) {
      if (FOTOS[i][0].test(n)) return FOTOS[i][1];
    }
    return null;
  }

  /* ============================================================
     VARENS LAG  (13/9)
     ------------------------------------------------------------
     Kundens idé: "trykke ind på sådan en ting inde i menukortet og
     læse hvad det er og sådan en lille beskrivelse".

     ⚠️ KUN VARER MED EN BESKRIVELSE KAN TRYKKES. De fleste af de 307
     har ingen ("Fadøl, lille", "Espresso") — et lag, der gentager
     navn og pris, er et tryk uden svar, og det føles som en fejl.
     Beskrivelserne skrives af ejeren i admin; forslagene dér er
     hans at godkende (js/admin/beskrivelsesforslag.js).

     ⚠️ TEKST, ALDRIG innerHTML — navnene og beskrivelserne skrives
     af ejeren, og et varenavn med HTML i skal stå som tekst.

     ⚠️ MAN BESTILLER STADIG IKKE HERINDE. Laget peger VIDERE: til
     smørrebrødssiden for smørrebrødet, til forsidens bestilling for
     det, udvalget sælger — og ingen steder hen for det, der ikke
     kan bestilles. Reglen er udvalgets egen, ikke en kopi.
     ============================================================ */
  var dataNu = null;
  var forrigeFokus = null;

  /* ⚠️ TAPASFADET HAR SIN EGEN BESTILLINGSSIDE (14/9). Kundens ord: "man
     skal også kunne bestille tapas her fra menukortet med knappen og en
     bedre beskrivelse … eller hav et link der siger læs mere og bestil
     tapas". Fadet er med vilje IKKE i forsidens udvalg (cateringens
     kategorier er lukkede), men det har m-tapas.html — dér står varslet,
     antal personer og tilkøbet. Uden en pris eller udsolgt: ingen knap,
     som alt andet. Kendingen er KATEGORIENS navn, samme mønster som
     fotoet i FOTOS ovenfor. */
  function erTapas(k) { return /tapas/i.test(String((k && k.navn) || '')); }

  function bestilVej(k, v) {
    if (!dataNu || !window.Butik || !Butik.udvalg) return null;
    if (v.udsolgt || !Butik.varePris(v.pris)) return null;
    if (erTapas(k)) return { href: 'm-tapas.html', ord: 'Læs mere og bestil tapas' };
    var u = Butik.udvalg(dataNu, 'uden-fyld') || {};
    if ((u.smoerKategorier || []).indexOf(k.id) !== -1) {
      return { href: 'h-smorrebrod.html', ord: 'Bestil smørrebrød' };
    }
    if ((u.bestilKategorier || []).indexOf(k.id) !== -1) {
      return { href: 'index.html#bestil', ord: 'Bestil på forsiden' };
    }
    return null;
  }

  function visVare(v, k, foto) {
    var lag = $('vare-lag');
    if (!lag) return;
    $('vare-kat').textContent = emojiFor(k) + ' ' + k.navn;
    var img = $('vare-foto');
    if (img) {
      if (foto) img.src = foto;
      else img.removeAttribute('src');
    }
    var tapas = erTapas(k);
    /* Fadets foto ER fadet — skarpt her og ikke sløret (menukort.css). */
    var hoved = $('vare-hoved');
    if (hoved) hoved.classList.toggle('skarp', tapas && !!foto);
    var tegn = $('vare-tegn');
    if (tegn) tegn.textContent = (window.MosedeEmoji && window.MosedeEmoji.forVare)
      ? window.MosedeEmoji.forVare(v, k) : emojiFor(k);
    $('vare-titel').textContent = v.navn;
    /* ⚠️ FADET KOSTER PR. PERSON (tapassiden regner antal × pris). Uden
       ordet læses 179,- som prisen for hele fadet. */
    var pris = Butik.varePris(v.pris);
    if (pris && tapas && !/pr\.\s*person/i.test(v.navn)) pris += ' pr. person';
    $('vare-pris').textContent = v.udsolgt ? 'Udsolgt i dag' : (pris || 'Spørg ved lugen');
    var beskr = String(v.beskrivelse || '').trim();
    var tekst = $('vare-tekst');
    var bits = $('vare-bits');
    if (!bits && tekst) {
      bits = lav('div', 'vare-lag-bits');
      bits.id = 'vare-bits';
      tekst.parentNode.insertBefore(bits, tekst.nextSibling);
    }
    if (bits) tøm(bits);
    /* ⚠️ FADETS INDHOLD SOM BRIKKER (14/9). Ejeren skriver det "·"-delt i
       admin → Menukort → Havnens tapas, og det stod som én lang linje med
       prikker. Som forsidens tapasafsnit: én linje, der siger hvad fadet
       er, og ét punkt pr. brik. Andre varer skriver deres beskrivelse som
       før. */
    var punkter = tapas ? beskr.split('·').map(function (s) { return s.trim(); })
      .filter(Boolean) : [];
    if (punkter.length > 1 && bits) {
      tekst.textContent = 'Havnens tapasfad — et fad til at dele. Det ligger der på det:';
      punkter.forEach(function (p) { bits.appendChild(lav('span', null, p)); });
    } else {
      tekst.textContent = beskr;
    }
    var cta = $('vare-cta');
    tøm(cta);
    var vej = bestilVej(k, v);
    if (vej) {
      var a = lav('a', 'g solid blk', vej.ord);
      a.href = vej.href;
      a.appendChild(lav('span', 'sheen'));
      cta.appendChild(a);
    }
    forrigeFokus = document.activeElement;
    lag.classList.add('open');
    var luk = $('vare-luk');
    if (luk) luk.focus();
  }

  function lukVare() {
    var lag = $('vare-lag');
    if (!lag || !lag.classList.contains('open')) return;
    lag.classList.remove('open');
    if (forrigeFokus && forrigeFokus.focus) forrigeFokus.focus();
  }

  (function () {
    var lag = $('vare-lag');
    if (!lag) return;
    if ($('vare-luk')) $('vare-luk').addEventListener('click', lukVare);
    lag.addEventListener('click', function (e) { if (e.target === lag) lukVare(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lukVare(); });
  })();

  function visSortiment(d) {
    dataNu = d;
    var boks = $('mk-kat');
    var afsnit = $('mk-kat-afsnit');
    var tom = $('mk-tom');
    if (!boks) return;

    var grupper = Butik.menu(d);
    /* ⚠️ AFSNITTENE ER EN GRUPPERING, IKKE EN NY SORTERING (9/9).
       `Butik.menuAfsnit` deler ejerens egne kategorier op på hans
       eget `afdeling`-felt og lader `sortering` stå urørt inde i
       hvert afsnit — pilene i admin bliver ved med at gøre det,
       de siger. Noten ved reglen i store.js bærer målingen. */
    var afsnitliste = Butik.menuAfsnit ? Butik.menuAfsnit(d) : null;
    tøm(boks);

    if (!grupper.length) {
      /* Ikke en tom side: en linje, der siger hvorfor, og et
         nummer, der virker. */
      if (tom) tom.style.display = '';
      return;
    }
    if (tom) skjul(tom);
    if (afsnit) afsnit.style.display = '';

    /* ⚠️ ÉT AFSNIT ER INGEN OPDELING.
       Har forretningen kun mad, ville en overskrift "Mad" over
       hele kortet være støj — og på en telefon er den plads, ingen
       bruger til noget. Med grunddata er der tre afsnit; med
       ejerens eget kort også tre. */
    var visAfsnit = !!afsnitliste && afsnitliste.length > 1;

    function tegnKategori(g) {
      /* ⚠️ DE UDSOLGTE STÅR PÅ KORTET NU  (2/9, kundens ja).

         Her stod det modsatte, og grunden var god: *"et kort, der
         tilbyder noget, køkkenet ikke har, er værre end et kort
         med én ret mindre."* Men argumentet trækker begge veje,
         og tre-veje-prøven gjorde det synligt: bestillingssiderne
         viser den udsolgte gennemstreget, kortet sorterede den
         helt fra — altså to lister over det SAMME sortiment, hvor
         den ene sagde, at retten ikke fandtes. En gæst, der har
         hørt om burgeren og ikke finder den på kortet, tror, den
         er taget af menuen.

         Kortet lover stadig ingenting: rækken er streget over og
         bærer ordet i stedet for prisen. Og noten om, at "der er
         ingen udsolgt-tilstand i designet", var forældet — dagens
         ret har haft .mk-udsolgt siden 24/8.

         ⚠️ EN KATEGORI, HVOR ALT ER UDSOLGT, FORSVINDER DERFOR
         IKKE LÆNGERE. Det er den samme regel én gang til: en
         kategori, der forsvinder, ligner en kategori, der er
         nedlagt. */
      /* ⚠️ Kortets række "Dagens ret" står ikke her (13/9) — retten
         står på "I dag" og i ugen med sit eget navn og sin egen
         pris. Reglen bor i Butik.erDagensRetVare; bestillingen
         spørger den samme. */
      var varer = g.varer.filter(function (v) {
        return !(Butik.erDagensRetVare && Butik.erDagensRetVare(v));
      });
      if (!varer.length) return;

      var kort = lav('div', 'panel');
      kort.setAttribute('data-kategori', g.kategori.navn);

      /* Fotoet er PYNT (alt="" og aria-hidden): varerne står i
         teksten ovenpå. loading="lazy", så siden ikke henter ti
         billeder, før gæsten ruller derned. */
      var foto = fotoFor(g.kategori);
      if (foto) {
        kort.classList.add('mk-foto-kort');
        var bg = lav('div', 'mk-bg');
        bg.setAttribute('aria-hidden', 'true');
        var img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = foto;
        bg.appendChild(img);
        kort.appendChild(bg);
        var slør = lav('div', 'mk-slor');
        slør.setAttribute('aria-hidden', 'true');
        kort.appendChild(slør);
      }

      kort.id = 'kat-' + g.kategori.id;

      var hoved = lav('div', 'mk-hoved');
      var tegn = lav('div', 'mk-tegn mk-' + (g.kategori.afdeling || 'mad'),
        emojiFor(g.kategori));
      tegn.setAttribute('aria-hidden', 'true');
      hoved.appendChild(tegn);
      hoved.appendChild(lav('h3', null, g.kategori.navn));
      /* Antallet ude til højre: en lang side bliver til en liste,
         man kan overskue, når man kan se hvor meget der er i hver
         kasse, før man ruller ned i den.

         ⚠️ DET TÆLLER DET, DER STÅR PÅ KORTET — de udsolgte med.
         Et tal, der siger 14, over en liste med 16 rækker, er en
         tæller, gæsten holder op med at stole på. Hvilke af dem
         der ikke er der i dag, siger stregen på rækken. */
      hoved.appendChild(lav('span', 'mk-antal',
        varer.length + (varer.length === 1 ? ' vare' : ' varer')));
      kort.appendChild(hoved);

      /* Noten hører til HELE kategorien — "På toastbrød eller
         rugbrød" gælder alle tolv slags pindemad. Skrevet på hver
         linje ville den fylde tolv gange og sige det samme. */
      if (g.kategori.note) kort.appendChild(lav('p', 'mk-note', g.kategori.note));

      var liste = lav('div', 'mk-liste');
      varer.forEach(function (v) {
        var linje = lav('div', 'mk-linje');
        linje.setAttribute('data-vare', v.navn);
        /* ⚠️ SAMME ANSIGT SOM PÅ BESTILLINGSSIDEN (1/9). Kortet
           og bestillingen er det SAMME sortiment set fra to
           skærme; ser den samme burger forskellig ud, tror
           gæsten, det er to burgere. Tegnet kommer fra den ene
           liste i MosedeEmoji — og det står i sit eget element,
           ikke inde i <h4>, så `data-vare` og overskriftens
           tekst bliver ved med at være varens navn. */
        if (window.MosedeEmoji && window.MosedeEmoji.forVare) {
          var vTegn = lav('span', 'mk-vare-tegn',
            window.MosedeEmoji.forVare(v, g.kategori));
          vTegn.setAttribute('aria-hidden', 'true');
          linje.appendChild(vTegn);
        }
        var txt = lav('div', 'mk-txt');
        txt.appendChild(lav('h4', null, v.navn));
        if (v.beskrivelse) txt.appendChild(lav('p', null, v.beskrivelse));
        linje.appendChild(txt);
        /* ⚠️ MÆRKATET I STEDET FOR PRISEN, IKKE VED SIDEN AF.
           En pris på en ret, køkkenet ikke har, er et tal, gæsten
           regner med. Ordet er det SAMME som på de tre
           bestillingsveje — "Udsolgt i dag" to steder og
           "Udsolgt" et tredje ville være tre udgaver af den samme
           oplysning. */
        if (v.udsolgt) {
          linje.classList.add('mk-udsolgt');
          linje.appendChild(lav('span', 'mk-pris mk-udsolgt-maerke',
            'Udsolgt i dag'));
        } else {
          linje.appendChild(prisMærke(v.pris));
        }
        if (String(v.beskrivelse || '').trim()) {
          linje.classList.add('mk-kan-aabnes');
          linje.setAttribute('role', 'button');
          linje.tabIndex = 0;
          linje.setAttribute('aria-haspopup', 'dialog');
          var mere = lav('span', 'mk-mere', '›');
          mere.setAttribute('aria-hidden', 'true');
          linje.appendChild(mere);
          linje.addEventListener('click', function () { visVare(v, g.kategori, foto); });
          linje.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); visVare(v, g.kategori, foto); }
          });
        }
        liste.appendChild(linje);
      });
      kort.appendChild(liste);
      boks.appendChild(kort);
    }

    if (visAfsnit) {
      afsnitliste.forEach(function (a) {
        var h = lav('h2', 'mk-afsnit', a.navn);
        h.id = 'afsnit-' + a.afdeling;
        boks.appendChild(h);
        a.grupper.forEach(tegnKategori);
      });
    } else {
      grupper.forEach(tegnKategori);
    }

    /* ⚠️ BÅNDET LÆSER SKÆRMEN, IKKE LISTEN. Derfor får det den
       samme rækkefølge som kortene af sig selv — og en chip kan
       ikke komme til at pege på et kort, der ikke blev tegnet. */
    visHop(grupper);

    hopTilHash();
  }

  /* ============================================================
     ET LINK MED #afsnit-is SKAL FAKTISK LANDE DER  (21/9)
     ------------------------------------------------------------
     Forsiden har fået "Se hele is-menukortet →", der peger på
     m-menukort.html#afsnit-is.

     ⚠️ OG CHROMIUM KLARER DET FAKTISK SELV — MÅLT 21/9.
     Her stod først "browseren når det ikke selv". Det er FORKERT.
     Falsificeringen afslørede det: prøven bestod uændret, da jeg
     fjernede kaldet. Målt med og uden, samme tal begge gange —
     scrollTop 1277, overskriften 272 px fra toppen. Chromium
     prøver hoppet igen, når elementet dukker op.

     ⚠️ SÅ HVORFOR STÅR DEN HER? Fordi jeg IKKE kunne måle Safari:
     WebKit er ikke installeret på maskinen, og gæsterne er på
     iPhone. Deferred fragment-navigation til et element, der
     tilføjes sent — og inde i en scroll-beholder med
     scroll-behavior: smooth — er historisk det mest ustabile
     hjørne i netop WebKit.

     Det er altså en sele, ikke en motor. Koster fire linjer, som
     ikke gør noget i Chromium, og redder linket, hvis Safari
     opfører sig som før. Kan nogen måle Safari og vise, at den
     også klarer det, må den gerne ryge.

     ⚠️ OG DEN RULLER IKKE, HVIS GÆSTEN ALLEREDE ER I GANG.
     Optegningen kaldes igen, hver gang data kommer ind på ny. Et
     hop midt i, at nogen læser, ville rykke siden væk under
     fingeren — derfor kun én gang pr. sidevisning.
     ============================================================ */
  var hoppet = false;

  function hopTilHash() {
    if (hoppet) return;
    var id = String(location.hash || '').replace(/^#/, '');
    if (!id) return;
    var maal = document.getElementById(id);
    if (!maal) return;
    hoppet = true;
    /* Lidt luft over overskriften, så den ikke klistrer til
       toppen af skærmen under den faste bjælke. */
    try {
      maal.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      maal.scrollIntoView();
    }
  }

  /* ---- HOP TIL ----
     Båndet bygges af de kategorier, der FAKTISK står på siden —
     ikke af listen fra databasen. En chip, der peger på et kort,
     der ikke blev tegnet, er en genvej til ingenting.

     ⚠️ "Alt udsolgt" er ikke længere en af de grunde (2/9) —
     kortet bliver stående med sine rækker streget over. Men en
     kategori uden ÉN eneste vare tegnes stadig ikke, og båndet
     skal blive ved med at læse skærmen og ikke databasen. */
  function visHop(grupper) {
    var bånd = $('mk-hop');
    if (!bånd) return;
    tøm(bånd);

    var kort = Array.prototype.slice.call(document.querySelectorAll('#mk-kat .panel'));
    if (kort.length < 2) return skjul(bånd);

    var chips = {};
    kort.forEach(function (k) {
      var g = grupper.filter(function (x) { return 'kat-' + x.kategori.id === k.id; })[0];
      if (!g) return;
      /* ⚠️ AFSNITTET STÅR OGSÅ I LISTEN (26/9). Kortet har
         overskrifterne Mad, Is og dessert og Drikke; listen ude i
         siden havde dem ikke, og tyve navne i én søjle er ikke til
         at finde rundt i. Etiketten er tekst, ikke en knap — og
         telefonens bånd skjuler den (menukort.css). */
      var før = k.previousElementSibling;
      if (før && før.classList.contains('mk-afsnit')) {
        var etiket = lav('span', 'mk-hop-afsnit', før.textContent);
        etiket.setAttribute('aria-hidden', 'true');
        bånd.appendChild(etiket);
      }
      /* Tegnet i sit eget element (26/9): på en computer er listen
         en ren tekstliste (menukort.css), på telefonen står det. */
      var chip = lav('button', null);
      var chipTegn = lav('span', 'mk-hop-tegn', emojiFor(g.kategori) + '  ');
      chipTegn.setAttribute('aria-hidden', 'true');
      chip.appendChild(chipTegn);
      chip.appendChild(document.createTextNode(g.kategori.navn));
      chip.type = 'button';
      chip.setAttribute('data-hop', g.kategori.navn);
      chip.addEventListener('click', function () {
        k.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      chips[k.id] = chip;
      bånd.appendChild(chip);
    });

    /* Den kategori, man kigger på, markerer sig selv — og ruller
       sig selv frem i båndet. Ellers kan man stå i "Øl" og se en
       stribe, hvor "Morgenmad" er markeret ude til venstre. */
    if (!window.IntersectionObserver) return;
    var spejder = new IntersectionObserver(function (poster) {
      poster.forEach(function (p) {
        if (!p.isIntersecting) return;
        Object.keys(chips).forEach(function (id) {
          var på = id === p.target.id;
          chips[id].classList.toggle('on', på);
          if (på && chips[id].scrollIntoView) {
            /* ⚠️ TO RETNINGER (26/9). På telefonen ruller båndet
               sidelæns; på en computer er det en lodret liste, der
               ruller for sig selv — og markeringen skal kunne ses dér
               også, ellers står "Øl" markeret under skærmens kant. */
            if (bånd.scrollWidth > bånd.clientWidth) {
              bånd.scrollTo({ left: Math.max(0, chips[id].offsetLeft - 70), behavior: 'smooth' });
            } else if (bånd.scrollHeight > bånd.clientHeight) {
              bånd.scrollTo({ top: Math.max(0, chips[id].offsetTop - bånd.clientHeight / 2 + chips[id].offsetHeight / 2), behavior: 'smooth' });
            }
          }
        });
      });
      /* ⚠️ RULLEROD'EN SKIFTER PAA EN TELEFON (5/9). Under 820 px
         er #sc ikke laengere en rullebeholder — det er dokumentet
         der ruller, saa Safari folder sin bundbjaelke sammen. Blev
         #sc staaende som root her, ville iagttageren maale mod en
         kasse paa 7500 px, og MAALT paa et skud: baandet markerede
         "Vaelg fyld til smoerrebroedet", mens gaesten stod i "Oel".
         havnegrillen.js har svaret; det slaas op, ikke gaettet. */
    }, { root: (typeof ioRod !== 'undefined' ? ioRod : $('sc')), rootMargin: '-124px 0px -70% 0px' });
    kort.forEach(function (k) { spejder.observe(k); });
  }

  /* ⚠️ SVARER DATABASEN IKKE, VISES INGEN PRISER  (25/9, aften).
     MÅLT i en browser: uden forbindelse stod kortet på kodens
     reservedata — "Smørrebrød 55,-", "Håndmad 24,-", "Softice, stor
     45,-" (den rigtige pris er 47) — og beskeden nedenunder kom aldrig
     frem, fordi listen jo ikke var tom. Mikkels ord: "Hvis databasen
     ikke svarer, må hjemmesiden aldrig vise forældede reservepriser.
     Vis i stedet en tydelig fejlbesked med caféens telefonnummer."
     Dagens ret og ugen skjules også: reservedataene ved intet om dem,
     og "Følger snart" ville være en påstand. Reglen for, HVORNÅR tallene
     er kodens egne, bor i Butik.reservedata — ét sted for hele huset. */
  function visNede() {
    ['mk-idag-afsnit', 'mk-uge-afsnit'].forEach(function (id) { skjul($(id)); });
    var sortiment = document.querySelector('#mk-kat-afsnit .mk-sortiment');
    skjul(sortiment);
    tøm($('mk-kat'));
    var tom = $('mk-tom');
    if (tom) {
      tom.className = 'nede-note';
      tom.setAttribute('role', 'status');
      tom.style.display = '';
    }
  }

  Butik.hent().then(function (d) {
    if (Butik.reservedata && Butik.reservedata(d)) { visNede(); return; }
    visIDag(d);
    visUgen(d);
    visSortiment(d);

    /* De nye kort er lavet EFTER, at designets indfald har kigget
       på siden — de står med opacity 0, til nogen ser dem. Uden
       det her ville hele menukortet være usynligt, til gæsten
       tilfældigvis rullede. */
    if (typeof io !== 'undefined' && io) {
      document.querySelectorAll('.rev:not(.in)').forEach(function (el) { io.observe(el); });
    }
    if (typeof revealFallback === 'function') revealFallback($('sc'));
  }).catch(function (fejl) {
    console.warn('Menukortets kobling fejlede:', fejl);
    visNede();
  });
}());
