/* ============================================================
   FÆLLES OPFØRSEL – det alle sider har brug for

   Burgermenuen, årstallet i footeren, rutelinket og topmenuens
   glas. Det lå før inde i js/side.js, som kun forsiden indlæser.
   Da menukortet og smørrebrødssiden fik deres egne sider, skulle
   de samme ting virke der – og at skrive dem af tre steder er
   sådan tre sider langsomt kommer til at opføre sig forskelligt.

   Filen er bevidst uden afhængigheder: den kan indlæses før
   store.js og config.js og virker uden database. En burgermenu må
   ikke holde op med at åbne fordi Supabase er nede.
   ============================================================ */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Prisformatet ----------
     Datalaget svarer "89 kr.". På et menukort står der "89,-", og
     det skal se ens ud på forsiden, menukortet og
     smørrebrødssiden. Funktionen lå kun i side.js, og da menukortet
     fik sin egen side, stod der to forskellige priser på to sider
     af samme forretning.

     Tom pris giver tom streng. Fire varer står med "ca." på
     forretningens eget kort, og de skal vises uden pris – aldrig
     med et gæt. */
  /* Alias til den ENE formaterer (5/9). Den gamle udgave byttede
     " kr." ud med ",-" bagefter — og skrev "35,50,-". */
  window.MosedePris = function (p) {
    return window.Butik ? window.Butik.kroner(p) : '';
  };

  /* ---------- Årstallet ----------
     Skrives af koden, så footeren ikke står med 2026 i 2031. */
  var aar = $('aar');
  if (aar) aar.textContent = new Date().getFullYear();

  /* ---------- Rutevejledning ----------
     Alle "Find vej"-links bygges af oplysninger.js, så adressen
     kun står ét sted. Et link til Google Maps frem for et
     indlejret kort: kortet er hundredvis af kilobyte fremmed
     JavaScript, det sætter cookies, og gæsten skal alligevel
     videre i sin egen app for at få ruten. */
  if (window.MOSEDE) {
    var url = window.MOSEDE.ruteUrl();
    Array.prototype.forEach.call(
      document.querySelectorAll('#rute, #mobil-rute, [data-rute]'),
      function (a) { a.href = url; }
    );
  }

  /* ---------- Skuffemenuen ----------
     Den er et bundark nu — den glider op nedefra og dækker de
     nederste 88% af skærmen, med en dæmper over. Se noten ved
     .ark i css/style.css om hvorfor.

     Den skal stadig FJERNES fra tabuleringen og fra klik, når den
     er lukket. Både arket og dets dæmper er lag, der ligger oven
     på siden, og et gennemsigtigt lag der bliver liggende, fanger
     hvert klik bagefter – det er sket her før. */
  var ark = $('ark'), burger = $('burger'), luk = $('ark-luk');

  if (ark && burger) {
    var lukArk = function () {
      ark.classList.remove('aaben');
      document.body.classList.remove('ark-aaben');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      // Efter overgangen, ellers forsvinder skuffen med et snup
      setTimeout(function () {
        if (!ark.classList.contains('aaben')) ark.hidden = true;
      }, 450);
      burger.focus();
    };

    var aabnArk = function () {
      ark.hidden = false;
      requestAnimationFrame(function () {
        ark.classList.add('aaben');
        document.body.classList.add('ark-aaben');
        burger.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        var f = ark.querySelector('a');
        if (f) f.focus();
      });
    };

    burger.addEventListener('click', aabnArk);
    if (luk) luk.addEventListener('click', lukArk);
    ark.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') lukArk();
    });

    /* KLIK VED SIDEN AF LUKKER ARKET.

       Det er den gestus, alle kender fra telefonens egne ark: man
       rammer ved siden af, og tingen lukker. Krydset behøver man
       ikke ramme.

       Lytteren sidder på document og ikke på dæmperen, fordi
       dæmperen er et pseudoelement på body og altså ikke noget,
       man kan hænge en lytter på.

       BURGERENS EGET KLIK BOBLER OGSÅ HEROP, i samme øjeblik
       arket åbnes. Vagten på første linje sender det videre:
       aabnArk sætter .aaben inde i et requestAnimationFrame, så
       klassen er endnu ikke sat, når klikket når hertil.

       Vagten er en tidlig udgang, ikke det der BÆRER. Det er
       målt: fjernes den, bliver arket alligevel stående, fordi
       lukArk først sætter hidden efter 450 ms og tjekker klassen
       igen dér — og på det tidspunkt har rAF'et sat den. To lag
       mod det samme. Linjen bliver stående, fordi den sparer et
       unødigt lukArk-kald ved hvert klik på siden, og fordi den
       siger hvad meningen er.

       Der stod også en undtagelse for burgeren. Den er fjernet:
       dæmperen ligger på z-index 24 og topbjælken på 20, så
       burgeren er dækket, mens arket er åbent, og undtagelsen
       kunne aldrig udløses. En vagt, der ikke kan ramme, er kode
       den næste skal regne igennem for ingenting — og testen af
       den bestod uanset hvad. */
    document.addEventListener('click', function (e) {
      if (!ark.classList.contains('aaben')) return;
      if (ark.contains(e.target)) return;
      lukArk();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ark.classList.contains('aaben')) lukArk();
    });

    window.MosedeArk = { luk: lukArk, aabn: aabnArk };
  }

  /* ---------- Indtoningen ----------
     .rev-blokke starter usynlige og toner ind, når de kommer i
     syne. Motoren SKAL bo her og ikke i side.js: bestil/ og
     smørrebrødssiden har .rev-sektioner uden at indlæse side.js,
     og de stod med opacity 0 for evigt — hele smørrebrødssidens
     indhold var usynligt i luften, målt 22/8.

     Uden IntersectionObserver vises alt med det samme, og det
     samme gælder ved reduceret bevægelse — indholdet må ALDRIG
     kunne blive usynligt for evigt. */
  var roligtRev = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var blokke = document.querySelectorAll('.rev');
  if (!roligtRev && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '-8% 0px -12%' });
    Array.prototype.forEach.call(blokke, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(blokke, function (el) { el.classList.add('in'); });
  }

  /* ---------- Topmenuen bliver til glas ----------
     På forsiden først når man har rullet forbi hero – dér står
     menuen på et foto og skal være gennemsigtig. På undersiderne
     er der intet foto, så den er glas fra starten (klassen står i
     HTML'en) og skal ikke skifte. */
  var hd = $('hd');
  if (hd && !document.body.classList.contains('underside')) {
    window.addEventListener('scroll', function () {
      hd.classList.toggle('stuck', window.scrollY > window.innerHeight * 0.72);
    }, { passive: true });
  }
})();
