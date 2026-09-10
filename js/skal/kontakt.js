/* ============================================================
   DE TO E-MAILADRESSER I BUNDEN AF SIDEN  (28/8)

   Mikkel oplyste to rigtige adresser: selskab1@ og booking1@.
   De dækker det, systemet IKKE gør — et tilbud på et selskab, et
   spørgsmål der skal skrives ned frem for siges i en telefon.

   ⚠️ EN BORDBESTILLING ER IKKE ÉN AF DEM (28/8). Kundens ord:
   "bordbestilling skal foregå igennem systemet og admin og ikke
   igennem mail." En booking i en indbakke står ikke i tabellen,
   tæller ikke med i dagens billede og optager ingen pladser.
   Derfor hedder linket "Om din booking" og ikke "Bordbestilling":
   adressen er til spørgsmål om en booking, gæsten allerede HAR.

   ⚠️ DE ERSTATTER EN OPDIGTET ADRESSE. Der stod
   hej@mosedehavnegrill.dk i bunden af ni sider: designets
   pladsholder, på et forkert domæne, og en gæst, der skrev til
   den, nåede ingen. Ret den ALDRIG tilbage.

   ⚠️ ADRESSERNE STÅR I HTML'EN, og filen her bytter dem kun ud,
   hvis personalet har skrevet noget andet i admin → Kontakt.
   Samme regel som baglokalets vilkår: vi overskriver kun, når
   databasen har noget at sige. Skrev vi hele linjen i
   JavaScript, skulle de rigtige adresser stå to steder — i
   HTML'en som reserve OG her — og så ville den ene blive glemt.

   ⚠️ OG ET TOMT FELT I ADMIN SKJULER LINKET. Det er ikke det
   samme som "lad stå": har forretningen nedlagt adressen, skal
   den VÆK fra siden, ikke blive stående som et link, ingen
   læser. Derfor er der forskel på "feltet er aldrig sat" (så
   står HTML'ens adresse) og "feltet er sat til tomt" — se
   nedenfor.
   ============================================================ */
(function () {
  'use strict';

  if (!window.Butik) return;

  var LINKS = document.querySelectorAll('a[data-post]');
  /* ⚠️ OGSÅ DE SOCIALE. Filen sprang før fra, hvis siden ikke
     havde en mailadresse i bunden — og så ville en side med en
     Facebook-chip, men uden footer, beholde sit døde link. De to
     ting hører til den samme fane i admin, og de skal derfor
     leve eller dø sammen her. */
  var SOCIALE = document.querySelectorAll('a[data-social]');
  /* ⚠️ OG RUTERNE (8/9). Samme grund som de sociale: sprang filen
     fra på en side uden en mailadresse i bunden, ville rute-linket
     blive stående med REPOETS adresse, selv om ejeren havde rettet
     sin egen i admin. De tre ting hører til den samme fane. */
  var RUTER = document.querySelectorAll('[data-rute]');
  if (!LINKS.length && !SOCIALE.length && !RUTER.length) return;

  var NOEGLER = {
    selskab: 'kontakt_email_selskab',
    booking: 'kontakt_email_booking',
    /* ⚠️ HOVEDADRESSEN FIK SIN FØRSTE LÆSER 8/9. `kontakt_email`
       har stået i admin siden foråret og blev vist på INGEN side:
       de to andre er delt efter ÆRINDE (tilbud og booking), og
       jura-siden er den første, der skal skrive til forretningen
       om noget helt tredje — dine oplysninger. Samme mønster som
       ruten samme dag: nøglen fandtes, læseren manglede. */
    hoved: 'kontakt_email',
  };

  Butik.hent().then(function (d) {
    var i = (d && d.indstillinger) || {};

    Array.prototype.forEach.call(LINKS, function (a) {
      var noegle = NOEGLER[a.getAttribute('data-post')];
      if (!noegle) return;

      var vaerdi = i[noegle];
      // Aldrig sat: HTML'ens adresse er sandheden og bliver stående.
      if (vaerdi === undefined || vaerdi === null) return;

      var email = String(vaerdi).trim();
      if (!email) {
        /* Sat til tomt: adressen findes ikke længere. Linket ryger
           helt af siden — et mailto til en nedlagt adresse er en
           blindgyde, præcis som de tomme Facebook-links, der stod
           her før. */
        /* ⚠️ I kontaktblokken på forsiden sidder linket i en
           RÆKKE med sin egen etiket (31/8) — en etiket uden link
           er et spørgsmål uden svar, så rækken går med. Footeren
           er urørt: dér ER linket hele linjen. */
        var raekke = a.closest ? a.closest('[data-post-raekke]') : null;
        var vaek = raekke || a;
        if (vaek.parentNode) vaek.parentNode.removeChild(vaek);
        return;
      }

      /* ⚠️ EMNET SKAL MED OVER. Knapperne på siderne bærer et
         data-emne ("Selskab hos Mosede Havnecafe"), så personalet
         kan se, hvad mailen handler om, uden at åbne den. Uden
         linjen her tørrede en rettet adresse i admin emnet af, og
         forespørgslerne ville lande som "(intet emne)". */
      /* ⚠️ OG BREVET SKAL MED OVER (31/8). Kundens ord: knappen
         skal henvise til selskab1@ "med en præ-skrevet start".
         Uden linjen her tørrede kanalen her teksten af, præcis
         som den tørrede emnet af før 28/8 — gæsten fik et tomt
         mailvindue og skulle selv finde på, hvad hun skulle
         skrive, og personalet fik en mail uden dato og antal. */
      var emne = a.getAttribute('data-emne');
      var brev = a.getAttribute('data-brev');
      var dele = [];
      if (emne) dele.push('subject=' + encodeURIComponent(emne));
      if (brev) dele.push('body=' + encodeURIComponent(brev));
      a.href = 'mailto:' + email + (dele.length ? '?' + dele.join('&') : '');
      /* Etiketten bliver stående. Den siger, hvad adressen er TIL
         — "Selskaber & catering", "Send en mail" — og det er den
         oplysning, der får gæsten til at skrive det rigtige sted
         hen. En rå adresse i bunden af en side siger ingenting om,
         hvem der læser den. */
    });
    visSociale(i);
    visRuter(d);
    visCvr(i);
    visLevering(i);
  }).catch(function (fejl) {
    // Adresserne står i HTML'en. Går hentningen galt, står de der
    // stadig — det er hele grunden til, at de gør.
    if (window.console) console.warn('Kontaktadresserne kunne ikke hentes:', fejl);
    visSociale({});
    /* ⚠️ RUTEN SKAL VIRKE, OGSÅ NÅR DATABASEN ER NEDE. Adressen
       står i opmærkningen, præcis som mailadresserne — og en gæst,
       der er på vej ned til havnen, er den sidste, der skal møde et
       dødt link. Uden argument bygger reglen af repoets adresse. */
    visRuter(null);
    /* ⚠️ OG LEVERINGSLINJEN BLIVER STÅENDE, som den er skrevet i
       HTML'en. Den siger "vi leverer i nærområdet — ring, hvis du
       er i tvivl", og det er sandt uanset hvad databasen svarer.
       En tom linje ville ligne et område, forretningen ikke vil
       oplyse. */
    /* ⚠️ OG CVR-RÆKKEN BLIVER SKJULT, når vi ikke kan spørge.
       Et tomt CVR-felt på en jura-side er værre end ingen række:
       det ser ud som en oplysning, forretningen ikke vil give. */
    visCvr({});
  });

  /* ============================================================
     LEVERINGSOMRÅDET PÅ BETINGELSESSIDEN  (10/9)
     ------------------------------------------------------------
     Kundens svar: *"leveringen dækker radiusen Tune, Karlslunde,
     Greve, Ishøj, Solrød"*. Tallene bor i ejerens egne felter i
     admin, og `Butik.leveringsTekst` er den ENE regel — forsiden
     og smørrebrødssiden spørger den samme.

     ⚠️ SKREV BETINGELSESSIDEN SIT EGET OMRÅDE, ville den love ét
     og bestillingsformularen tage imod noget andet, første gang
     ejeren rettede sit felt. Det er sket tre gange med varsler
     (catering 30/8, smørrebrød 31/8, tapas 1/9), og det er
     dyrere her: en gæst i Køge, der læser sig til et ja og får
     et nej ved afsendelsen.

     ⚠️ OG LINJEN FINDES KUN PÅ DEN SIDE, DER HAR DEN. Fylderen
     kører på hver side (kontakt.js indlæses bredt), så den skal
     tie stille alle andre steder.
     ============================================================ */
  function visLevering(i) {
    var felt = document.querySelector('[data-levering-linje]');
    if (!felt || !Butik.leveringsTekst) return;
    var t = Butik.leveringsTekst(i || {});
    /* Er levering slået FRA i admin, eller mangler området, står
       designets egen linje. Vi lover ikke en radius, ejeren ikke
       har skrevet. */
    if (!t.omraade) return;
    felt.textContent = t.hint;
  }

  /* ============================================================
     CVR-NUMMERET  (8/9)
     ------------------------------------------------------------
     Kundens ord: *"vi skal sikre os at hjemmesiden overholder
     lovgivningen."*

     ⚠️ CVR ER LOVPLIGTIGT PÅ EN ERHVERVSSIDE (e-handelsloven
     § 7: navn, adresse, e-mail og CVR-nummer skal være let
     tilgængelige). Vi HAR det ikke — ejeren har ikke oplyst det.

     ⚠️ OG DET GÆTTES IKKE. Et CVR-nummer, der er tastet forkert,
     peger på en ANDEN virksomhed — det er ikke en tom rubrik, det
     er en forkert oplysning om, hvem gæsten handler med. Huset har
     en ordret regel mod opdigtede tal, og det her er den dyreste
     slags. Rækken er derfor `hidden`, til nummeret står i admin →
     Indstillinger, og så kommer den af sig selv.
     ============================================================ */
  function visCvr(i) {
    var felt = document.querySelector('[data-cvr]');
    var raekke = document.querySelector('[data-jura-cvr]');
    if (!felt || !raekke) return;

    /* Ejerens eget nummer slår filens tomme. Cifrene alene: en
       gæst, der skal slå det op i CVR-registret, skal ikke rette
       "DK 12 34 56 78" til noget andet først. */
    var raa = String((i || {}).cvr
      || (window.MOSEDE && window.MOSEDE.cvr) || '').replace(/\D/g, '');
    if (raa.length !== 8) { raekke.hidden = true; return; }

    /* Læses højt i grupper af to, som et telefonnummer. */
    felt.textContent = raa.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
    raekke.hidden = false;
  }

  /* ============================================================
     VIS RUTE  (8/9)
     ------------------------------------------------------------
     Kundens ord: *"vi mangler også at få fixet en rute ting og gør
     alt det her langt langt bedre."*

     ⚠️ MÅLT FØRST: der var NUL rute-links på hele hjemmesiden.
     `MOSEDE.ruteUrl()` har ligget i `js/oplysninger.js` hele
     tiden — og filens EGET hoved påstod, at *"Vis rute"* blev
     bygget af den. Ingen side spurgte den. Det er samme mønster
     som `Admin.pæntNavn` (6/9) og `Butik.maaBestille` (5/9):
     reglen fandtes, læseren manglede, og ingen kunne se det.

     ⚠️ OG ADRESSEN STOD TO GANGE I DET SAMME AFSNIT. "Find os"
     har adressen som sin overskrift OG som sidste række i
     kontaktblokken, 1000 px længere nede — to udgaver af den
     samme oplysning, og den nederste var den ENESTE række i
     blokken uden et link, altså den så slukket ud. Rækken er
     blevet ruten.

     ⚠️ DATABASEN VINDER OVER FILEN. Ejeren retter sin adresse i
     admin → Indstillinger; ruten skal føre til HANS adresse, ikke
     til repoets kopi. Reglen bor ét sted (`MOSEDE.ruteUrl`), og
     den får databasens adresse med her.
     ============================================================ */
  function visRuter(d) {
    var links = document.querySelectorAll('[data-rute]');
    if (!links.length) return;
    if (!window.MOSEDE || !window.MOSEDE.ruteUrl) return;

    var l = (d && d.lokationer && d.lokationer[0]) || null;
    /* ⚠️ KUN NÅR DER ER EN VEJ. `lokationer.adresse` er `not null`
       i databasen, men en tom streng er lovlig — og et rutelink
       til ", 2670 Greve" sender gæsten til postnummerets midte.
       Uden en vej bruges repoets adresse, som står i href'en. */
    var adr = l && String(l.adresse || '').trim()
      ? { navn: l.navn, vej: l.adresse, postnr: l.postnr, by: l.by }
      : null;
    var url = window.MOSEDE.ruteUrl(adr);

    Array.prototype.forEach.call(links, function (a) {
      a.href = url;
      /* Ruten fører VÆK fra siden. Uden target ville gæsten miste
         sin halvfyldte kurv ved at slå adressen op. */
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  /* ============================================================
     ⚠️ FEM DØDE LINKS PÅ FORSIDEN  (29/8)
     ------------------------------------------------------------
     Facebook, Instagram, Anmeldelser, "Følg os →" og "Læs
     anmeldelserne på Google →" pegede alle på "#". Gæsten
     trykker, siden hopper til toppen, og hun tror, det er hende,
     der gør noget forkert.

     Det er NØJAGTIG den fejl, der blev fjernet i footeren 28/8 —
     den stod bare stadig øverst på forsiden. Reglen har været i
     js/oplysninger.js hele tiden: "tomme felter vises ikke — et
     link til en profil, der ikke findes, er en blindgyde."

     ⚠️ ADRESSERNE ER EJERENS, OG DE FINDES IKKE ENDNU. Vi finder
     ikke på en Facebook-side. Indtil personalet skriver dem i
     admin → Kontakt, ryger linkene AF siden — de kommer igen af
     sig selv den dag, adressen er der.

     ⚠️ OG ET KORT, DER KUN ER EN KNAP, FORSVINDER MED DEN.
     "Følg os på Facebook" er en reklame for en side, vi ikke kan
     linke til; bliver knappen væk og kortet stående, står der en
     opfordring uden en vej. Samme med stjernelinjen. */
  function visSociale(i) {
    var links = document.querySelectorAll('a[data-social]');
    Array.prototype.forEach.call(links, function (a) {
      var navn = a.getAttribute('data-social');
      var url = String((i || {})['social_' + navn] || '').trim();

      if (url) {
        a.href = /^https?:\/\//i.test(url) ? url : 'https://' + url;
        a.target = '_blank';
        a.rel = 'noopener';
        return;
      }

      /* Ingen adresse: linket af siden.

         ⚠️ ET KORT, DER KUN ER EN KNAP, GÅR MED. "Følg os på
         Facebook" er en reklame for en side, vi ikke kan linke
         til; bliver knappen væk og kortet stående, står der en
         opfordring uden en vej.

         ⚠️ MEN KUN .promo. Stjernelinjen bærer også en SÆTNING
         ("Vores gæster giver os 4,8"), og den er designets
         pladsholder, som Mikkel udtrykkeligt har sagt bliver
         stående, til personalet retter tallene. At tage hele
         linjen ville være at træffe hans beslutning om igen —
         det er kun det døde link, der er vores at fjerne. */
      var kort = a.closest('.promo');
      if (kort && kort.querySelectorAll('a').length === 1) {
        if (kort.parentNode) kort.parentNode.removeChild(kort);
        return;
      }
      if (a.parentNode) a.parentNode.removeChild(a);
    });

    /* Er hele striben tom, skal den heller ikke stå og fylde en
       række med ingenting. */
    var stribe = document.querySelector('.social');
    if (stribe && !stribe.querySelector('a')) {
      stribe.parentNode.removeChild(stribe);
    }
  }
}());
