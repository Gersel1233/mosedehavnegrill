/* ============================================================
   DAGENS BESKED — ét banner, fire sider  (16/9)
   ------------------------------------------------------------
   Ejerens ord: "en lukkedag giver ikke muligheden for at sige
   noget på siden".

   MÅLT: beskeden FANDTES — `dags_regler.besked_titel` og
   `besked_til_gaester` har været der siden august — men kun
   forsiden viste den. En gæst, der gik direkte til bestil/, til
   bord/ eller scannede QR-koden ved bordet, mødte i stedet en
   sætning, der står fast i koden ("Køkkenet er lukket den dag")
   og aldrig personalets egen.

   ⚠️ DERFOR BOR TEGNINGEN HER OG IKKE FIRE STEDER. Fire kopier
   af den samme regel er fire steder, den kan skride fra sig selv
   — huset har betalt for det før (prisformateringen, klokkeslættet).
   Filen kender kun Butik og DOM'en, så den kan indlæses på alle
   fire sider, også dem der ikke kender forsidens havnegrillen.js.

   ⚠️ OG DER SKRIVES MED textContent, IKKE innerHTML. Feltet er
   personalets frie tekst, og den skal kunne indeholde hvad som
   helst uden at kunne lave om på siden. Prøven i
   tests/dagsregler.spec.js holder det fast med et <b>-forsøg.

   ⚠️ OG EN FEJL HER MÅ IKKE TAGE SIDEN MED SIG. Kaster opslaget
   (en dagsregel, der ikke findes, en tabel, der ikke er hentet),
   skjules banneret, og resten af siden tegnes færdig. Det er
   målt: 26/8 KASTEDE koden, banneret blev hængende skjult, og
   prøven sagde BESTOD om et sammenbrud.
   ============================================================ */

(function () {
  'use strict';

  var UGE = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag',
    'Fredag', 'Lørdag'];
  var MDR = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli',
    'august', 'september', 'oktober', 'november', 'december'];

  /* "Torsdag d. 27. august". Skrevet her og ikke hentet fra
     Admin.pænDato: den bor i personalesiden, og gæstesiden må
     ikke afhænge af en fil, den ikke indlæser. */
  /* ⚠️ UTC OG IKKE LOKAL TID — tro kopi af den, der stod i
     forside.js. En dato regnet i lokal tid kan lande på den
     forkerte ugedag natten mellem sommer- og vintertid, og
     "Lørdag d. 25. oktober" på en søndag er en fejl, ingen
     opdager før den står der. */
  function pænDag(iso) {
    var t = String(iso || '').split('-');
    if (t.length !== 3) return '';
    var dato = new Date(Date.UTC(+t[0], +t[1] - 1, +t[2]));
    return UGE[dato.getUTCDay()] + ' d. ' + (+t[2]) + '. ' + MDR[+t[1] - 1];
  }

  /* Er dagen lukket? Lukkedagene er afledt af kalenderen i
     store.js (afledLukkedage), og en af dem kan dække en periode —
     derfor både dato og slut_dato. */
  function lukkedagen(d, idag) {
    var liste = (d && d.lukkedage) || [];
    for (var i = 0; i < liste.length; i++) {
      var k = liste[i];
      if (!k || !k.dato) continue;
      if (k.dato <= idag && idag <= (k.slut_dato || k.dato)) return k;
    }
    return null;
  }

  window.MosedeDagsbesked = {
    /* d er de hentede data (Butik.hent()). Siden behøver ikke
       vide noget om dagsregler — den skal bare have banneret med
       i opmærkningen og kalde her, når data er hjemme. */
    vis: function (d) {
      var boks = document.getElementById('dagsbesked');
      if (!boks) return;

      var idag = '';
      var r = null;
      try {
        idag = Butik.nu().dato;
        r = Butik.dagsregel ? Butik.dagsregel(d, idag) : null;
      } catch (e) {
        r = null;
      }

      var tekst = r && String(r.besked_til_gaester || '').trim();
      var overskrift = r && String(r.besked_titel || '').trim();

      /* ⚠️ TO KILDER, ÉN AFGØRELSE — OG DEN BOR HER (16/9).

         Dagens egen besked (dags_regler) er skrevet om NETOP den
         dag: "kun mad ud af huset i dag". Lukkedagens besked
         (kalender.beskrivelse) dækker hele perioden — derfor bor
         den på lukningen og ikke i én række pr. dag; en
         vinterlukning ville ellers være halvfems rækker, og en
         gæst, der kigger på dag tre, ville intet se.

         Er der begge, vinder dagens egen: den er skrevet senere og
         om mindre. Rækkefølgen skal ligge ÉT sted — ellers svarer
         forsiden og QR-koden hver sit på den samme dag. */
      if (!tekst) {
        var luk = lukkedagen(d, idag);
        if (luk && String(luk.besked || '').trim()) {
          tekst = String(luk.besked).trim();
          overskrift = String(luk.aarsag || '').trim();
        }
      }

      if (!tekst) { boks.hidden = true; return; }

      var titel = document.getElementById('dagsbesked-titel');
      var krop = document.getElementById('dagsbesked-tekst');
      var dag = document.getElementById('dagsbesked-dag');

      /* Titlen er personalets egen. Har de ikke skrevet en, står
         der "I dag" — og ikke en tom overskrift, som ville
         efterlade et hul over teksten. */
      if (titel) titel.textContent = overskrift || 'I dag';
      if (krop) krop.textContent = tekst;
      if (dag) dag.textContent = pænDag(Butik.nu().dato);

      boks.hidden = false;
    },
  };
})();
