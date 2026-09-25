/* ============================================================
   CATERINGSIDEN  (4/9)
   ------------------------------------------------------------
   Kundens ord: *"hele catering fanen skal altså bare være en knap
   til mailen booking men gør det pænt og ordentligt og der kommer
   billeder men det er der bare ikke endnu men hvor man kan læse
   om det."*

   Siden havde en forespørgselsformular og kørte derfor på
   js/skal/forespoergsel.js. Den er væk, og med den motorens to
   andre opgaver på siden: at fylde billedpladserne, og at skrive
   ejerens egen leveringstekst ind i faktalinjen.

   Filen her gør de to ting og intet andet. Den SKRIVER ingenting
   og henter ingenting nyt — den læser `indstillinger`, som alle
   sider læser i forvejen.

   ⚠️ TALLENE ER EJERENS, IKKE DESIGNETS. Faktalinjen sagde
   "Vi leverer og stiller op — eller I henter ved lugen og sparer
   leveringen", altså et løfte om opstilling, ingen har bekræftet,
   og ikke ét ord om hvor eller hvad det koster. Ejeren har
   svaret på begge dele (79 kr., Ishøj til Køge, længere ude efter
   aftale), og svaret bor i `Butik.leveringsTekst` — den samme
   funktion, forsiden og smørrebrødssiden spørger. To udgaver af
   "hvor langt kører I?" ville skride fra hinanden den dag, han
   retter sit område i admin, og begge ville se rigtige ud for sig
   selv.

   ⚠️ OG HTML'ENS TEKST ER RESERVEN. Går hentningen galt, står
   "Vi leverer — eller I henter ved lugen" som designet leverede
   den. En side, der taber sin faktalinje, når databasen driller,
   er værre end en, der siger lidt mindre.
   ============================================================ */
(function () {
  'use strict';

  if (!window.Butik) return;

  function fyld(indstillinger) {
    var i = indstillinger || {};

    if (window.MosedeBilledplads) window.MosedeBilledplads.fyld(i);

    var fakta = document.getElementById('lev-fakta');
    if (!fakta) return;

    /* ⚠️ ER LEVERING SLÅET FRA, RYGER HELE LINJEN. Fluebenet i
       admin → Åbningstider er forretningens ja til at køre ud;
       står det fra, ved vi hverken hvad, hvortil eller hvad det
       koster, og så må siden ikke love det. En faktalinje, der
       bliver stående med "Vi leverer", er et løfte på ejerens
       vegne — samme regel som den nedlagte mailadresse, hvor
       rækken går med linket (31/8).

       ⚠️ OG DET ER HTML'ENS TEKST, DER ER RESERVEN. Levering ER
       slået til i produktionen siden 2/9 med ejerens egne tal, så
       går hentningen galt, er "Vi leverer — eller I henter ved
       lugen" det sande svar. Undefined betyder "ikke hentet", og
       så bliver den stående. */
    if (i.levering === false) {
      var raekke = fakta.closest ? fakta.closest('.fact') : null;
      var vaek = raekke || fakta;
      if (vaek.parentNode) vaek.parentNode.removeChild(vaek);
      return;
    }
    if (i.levering !== true) return;

    var t = Butik.leveringsTekst(i, true);
    var fed = document.createElement('b');
    fed.textContent = t.faktaFed;
    fakta.textContent = '';
    fakta.appendChild(fed);
    fakta.appendChild(document.createTextNode(t.faktaResten));
  }

  /* ============================================================
     PRISERNE ER MENUKORTETS  (14/9)
     ------------------------------------------------------------
     Kundens ord: siden er "forældet og ikke up to date eller god og
     sælgende nok". En catering uden ét tal lader gæsten gætte, om
     det er 30 eller 300 kroner — og så ringer hun ikke.

     ⚠️ INGEN PRIS STÅR I HTML'EN. Et tal skrevet af ville være
     forkert den dag, ejeren retter en pris i admin, og siden ville
     se helt rigtig ud imens (designets 199 kr. stod i fire dage mod
     menukortets 179 på tapassiden, 9/9). Hvert punkt peger på sine
     kategorier med `data-fra` — et mønster på NAVNET, som
     menukortets egne regler — og får den laveste pris derfra.

     ⚠️ INGEN PRIS PÅ KORTET, INGEN LINJE. Kun aktive varer i aktive
     kategorier med en rigtig pris over nul; ellers står punktet,
     som det altid har gjort. "Fra 0,-" ville være et tilbud, ingen
     har givet.

     ⚠️ ENHEDEN STÅR VED PUNKTET (`data-enhed`): en slider er et
     stykke, et tapasfad er pr. person. Uden den ville "179,-" læses
     som prisen for hele fadet. */
  function priser(d) {
    /* ⚠️ ALDRIG KODENS EGNE TAL  (25/9, aften). Svarer databasen ikke,
       står siden på reservedataene — og så sagde punktet "fra 24,-
       stk." af en håndmad, koden selv har skrevet. Mikkels ord: "Hvis
       databasen ikke svarer, må hjemmesiden aldrig vise forældede
       reservepriser." Punkterne står uden tal, som når ejeren ikke har
       sat en pris. */
    if (Butik.reservedata && Butik.reservedata(d)) return;
    var kat = (d && d.menu_kategorier) || [];
    var varer = (d && d.menu_varer) || [];
    Array.prototype.forEach.call(document.querySelectorAll('[data-fra]'), function (el) {
      var m;
      try { m = new RegExp(el.getAttribute('data-fra'), 'i'); } catch (e) { return; }
      var ids = kat.filter(function (k) { return k.aktiv !== false && m.test(k.navn || ''); })
        .map(function (k) { return k.id; });
      var p = varer.filter(function (v) {
        return v.aktiv !== false && !v.udsolgt && ids.indexOf(v.kategori_id) >= 0;
      }).map(function (v) { return v.pris === null || v.pris === '' ? NaN : Number(v.pris); })
        .filter(function (n) { return isFinite(n) && n > 0; });
      if (!p.length) return;
      var lav = Math.min.apply(null, p);
      var hoej = Math.max.apply(null, p);
      /* `data-hvad` siger, HVILKEN del af punktet prisen gælder:
         "Platter og pindemad" er to slags med hver sin enhed, og en
         pris uden navn ville blive læst som prisen for en platte. */
      var hvad = el.getAttribute('data-hvad');
      el.textContent = (hvad ? hvad + ' ' : '') + (lav < hoej ? 'fra ' : '')
        + Butik.kroner(lav) + ' ' + (el.getAttribute('data-enhed') || 'stk.');
      el.hidden = false;
    });
  }

  Butik.hent().then(function (d) {
    fyld((d && d.indstillinger) || {});
    priser(d);
  }).catch(function (fejl) {
    /* ⚠️ PLADSERNE SKAL OP, OGSÅ NÅR HENTNINGEN FEJLER. De har
       ingen data bag sig; blev de stående som <image-slot>, ville
       en side med en nede database være den side, der har FLEST
       stiplede grå kasser — og det er lige præcis den dag, den
       skal se hel ud. */
    fyld({});
    if (window.console) console.warn('Cateringsiden kunne ikke hente:', fejl);
  });
}());
