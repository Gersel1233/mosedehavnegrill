/* ⚠️ IPAD'EN I KØKKENET LUKKER ALDRIG SIN FANE  (30/8)

   Kundens ord: "på admin siden skal de sige opdater, så man
   opdaterer hver gang."

   Han har fat i noget, der ikke kan ses: en browser, der har haft
   admin åben siden i mandags, kører mandagens kode. Udgiver vi en
   rettelse — en knap, der ikke virkede, en pris, der blev vist
   forkert — er den der ikke for dem, der har mest brug for den.
   Og INGEN opdager det, for siden ser helt rigtig ud.

   Workflowet stempler hver fil med commit'ets id (?v=…), så
   siden VED, hvilken udgave den selv er. Det eneste, der mangler,
   er at spørge, om der er kommet en nyere.

   ⚠️ DEN GENINDLÆSER ALDRIG AF SIG SELV. Personalet kan stå midt
   i en note eller en pris, og en side, der hopper under fingeren,
   er værre end en gammel side. Båndet siger til; mennesket
   bestemmer hvornår.

   ⚠️ OG DEN ER TAVS I ØVETILSTAND. Lokalt er stemplet ikke
   erstattet (det står som "__V__"), så der er intet at
   sammenligne — og en prøve skal ikke se et bånd, den ikke har
   bedt om. */
(function () {
  'use strict';

  /* Hvert kvarter. Oftere er der ingen grund til: en udgivelse
     tager selv et par minutter, og et bånd, der kommer et kvarter
     senere, er stadig samme vagt. */
  var HVOR_TIT = 15 * 60 * 1000;

  function minUdgave() {
    var s = document.querySelector('script[src*="?v="]');
    if (!s) return null;
    var m = String(s.getAttribute('src') || '').match(/[?&]v=([^&"']+)/);
    return m ? m[1] : null;
  }

  function hentUdgave() {
    /* Cache-brydet med et tal, browseren ikke kan have gemt.
       Uden det svarer den med præcis den side, vi allerede har —
       og så opdager vi aldrig noget. */
    return fetch('admin.html?frisk=' + Date.now(), { cache: 'no-store' })
      .then(function (svar) { return svar.ok ? svar.text() : null; })
      .then(function (tekst) {
        if (!tekst) return null;
        var m = tekst.match(/[?&]v=([^&"']+)/);
        return m ? m[1] : null;
      })
      .catch(function () { return null; });   // offline: ikke en fejl, bare ingen besked
  }

  function visBaand() {
    if (document.getElementById('ny-udgave')) return;

    var baand = document.createElement('div');
    baand.id = 'ny-udgave';
    baand.className = 'ny-udgave';
    baand.setAttribute('role', 'status');

    var tekst = document.createElement('div');
    tekst.className = 'ny-udgave-tekst';
    tekst.appendChild(Object.assign(document.createElement('b'),
      { textContent: 'Der er kommet en ny udgave' }));
    tekst.appendChild(Object.assign(document.createElement('span'),
      { textContent: 'Den her fane kører stadig den gamle. '
        + 'Gem det, du er i gang med, og tryk Opdater.' }));

    var knap = document.createElement('button');
    knap.type = 'button';
    knap.className = 'knap';
    knap.id = 'ny-udgave-knap';
    knap.textContent = 'Opdater';
    knap.addEventListener('click', function () {
      /* true tvinger forbi browserens cache i de browsere, der
         stadig lytter til den — og skader ikke i resten. */
      window.location.reload(true);
    });

    baand.appendChild(tekst);
    baand.appendChild(knap);

    /* ⚠️ SAMME STED SOM ØVETILSTANDENS BÅND, ikke øverst i <main>.
       main.midt spænder over HELE bredden, og sidemenuen ligger
       fast oven på den — et bånd sat ind som mains første barn
       lander delvis UNDER menuen og bliver klippet. Målt på et
       skud, ikke gættet. Her står det, hvor de andre bånd står. */
    var anker = document.getElementById('oeve-baand')
      || document.getElementById('kvittering');
    if (anker && anker.parentNode) anker.parentNode.insertBefore(baand, anker);
    else (document.querySelector('main.midt') || document.body).appendChild(baand);
  }

  /* nuVaerende er kun til prøverne: uden den kalder tjek() sin
     egen interne minUdgave(), og så kan en prøve ikke lade som om
     siden kører en anden udgave — den ville måle sig selv. Ét
     argument er billigere end en prøve, der ikke kan fejle. */
  function tjek(nuVaerende) {
    var min = nuVaerende || minUdgave();
    /* Ikke stemplet endnu (øvetilstand) — så er der ingenting at
       sammenligne, og båndet ville lyve. */
    if (!min || min === '__V__') return;

    hentUdgave().then(function (ny) {
      if (ny && ny !== '__V__' && ny !== min) visBaand();
    });
  }

  window.AdminOpdater = { tjek: tjek, visBaand: visBaand, minUdgave: minUdgave };

  document.addEventListener('DOMContentLoaded', function () {
    /* Første tjek efter et minut: siden skal have lov at loade
       færdig, før den bruger båndbredde på noget, der ikke haster. */
    setTimeout(tjek, 60 * 1000);
    setInterval(tjek, HVOR_TIT);

    /* ⚠️ OG NÅR IPAD'EN VÅGNER. Den ligger i dvale om natten, og
       en timer, der har stået stille i tolv timer, fyrer ikke af
       sig selv. Det er præcis den maskine, der har mest gammel
       kode i sig. */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) tjek();
    });
  });
}());
