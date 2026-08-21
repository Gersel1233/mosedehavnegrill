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
  window.MosedePris = function (p) {
    var s = window.Butik ? window.Butik.pris(p) : null;
    return s ? s.replace(' kr.', ',-') : '';
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

       Burgeren SKAL undtages. Uden det boblede dens eget klik op
       hertil i samme øjeblik, arket blev åbnet — og så lukkede
       det igen med det samme. Menuen kunne ikke åbnes. */
    document.addEventListener('click', function (e) {
      if (!ark.classList.contains('aaben')) return;
      if (ark.contains(e.target)) return;
      if (burger.contains(e.target)) return;
      lukArk();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ark.classList.contains('aaben')) lukArk();
    });

    window.MosedeArk = { luk: lukArk, aabn: aabnArk };
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
