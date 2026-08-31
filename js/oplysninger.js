/* ============================================================
   VIRKSOMHEDENS OPLYSNINGER – ÉN KILDE

   Navn, adresse, telefon, e-mail, domæne og sociale profiler står
   HER og kun her. Sidetitler, JSON-LD til Google, footeren,
   "Vis rute", telefonlinks og delingsbilleder bygges alle af denne
   fil.

   Grunden er ikke ryddelighed. Det er at oplysninger der står tre
   steder, bliver tre forskellige oplysninger. Da denne fil blev
   lavet, stod adressen ét sted i HTML'en, ét sted i databasen og
   ét sted i en SQL-rettelse – og der findes allerede modstridende
   udgaver ude på nettet.

   ------------------------------------------------------------
   TRE TING ER IKKE BEKRÆFTET AF EJEREN ENDNU
   ------------------------------------------------------------
   De er markeret med BEKRAEFT nedenfor. Så længe `godkendt` står
   til false, skriver siden dem stadig – de er det bedste vi har –
   men der ligger en liste i README under "Ejeren skal bekræfte",
   og Google Virksomhedsprofil, Facebook og VisitDenmark skal
   rettes til det samme når svaret kommer.

   Der er IKKE gættet. Hvor der ikke findes et svar, står der en
   tom streng, og siden skjuler feltet frem for at finde på noget.
   ============================================================ */

window.MOSEDE = {

  /* Er oplysningerne gennemgået med ejeren? Sæt til true når de
     er, og fjern BEKRAEFT-noterne. Testene læser dette flag og
     minder om listen så længe den står åben. */
  godkendt: false,

  navn: 'Mosede Havnecafe',

  /* Det juridiske navn kan være et andet end skiltet. Står tomt
     indtil vi ved det – et gæt i JSON-LD er værre end ingenting,
     for Google sammenholder det med CVR og Krak. */
  juridiskNavn: '',

  adresse: {
    // BEKRAEFT: kunden har oplyst 20I (bogstavet I som i Ida).
    // Forretningens eget menukort skriver 20, og tredjeparter
    // skriver både 20 og 20L. Alle tre kan ikke være rigtige.
    vej: 'Havnevej 20I',
    postnr: '2670',
    by: 'Greve',
    land: 'DK',
  },

  /* Koordinater til JSON-LD og "Vis rute". Mosede Havn, målt på
     kortet – ikke på adressen, for havnen er stor og en rute til
     "Havnevej 20" lander ved indkørslen. */
  position: { lat: 55.5852, lng: 12.2834 },

  // BEKRAEFT: dette nummer står på forretningens eget menukort.
  // Nogle tredjepartssider viser et andet.
  telefon: '+4528871343',
  telefonPent: '28 87 13 43',

  /* E-mail til forespørgsler. Personalet kan skrive den i admin
     (indstillingen kontakt_email) – står den tom, viser siden kun
     telefonnummeret. Der er ingen opdigtet info@-adresse her. */
  email: '',

  /* ============================================================
     DE TO RIGTIGE ADRESSER  (28/8)
     ------------------------------------------------------------
     Oplyst af Mikkel. De dækker præcis det, systemet IKKE gør:
     et tilbud på et selskab, en ændring i en booking, et
     spørgsmål der skal skrives ned frem for siges i en telefon.

     ⚠️ DE ER DELT EFTER ÆRINDE, IKKE EFTER AFDELING. En gæst,
     der skriver om sin bordbestilling til selskabsadressen, får
     svar af den, der sidder med tilbud — og omvendt. Derfor
     står de med hver sin etiket alle de steder, de vises.

     ⚠️ OG DE ERSTATTER EN OPDIGTET ADRESSE. Indtil nu stod der
     hej@mosedehavnegrill.dk i bunden af ni sider. Den er
     designets pladsholder, den er på et forkert domæne, og en
     gæst, der skrev til den, nåede ingen. Ret den ALDRIG
     tilbage.

     Personalet kan skifte dem i admin → Kontakt
     (kontakt_email_selskab og kontakt_email_booking). */
  emailSelskab: 'selskab1@mosedehavnecafe.dk',
  emailBooking: 'booking1@mosedehavnecafe.dk',

  /* Domænet. GitHub Pages-adressen virker, men den bliver ikke
     indekseret ordentligt og kan ikke stå på en menutavle.
     BEKRAEFT: har forretningen et domæne i forvejen? Indtil det
     er afklaret, bruges Pages-adressen til canonical og sitemap,
     for en forkert canonical er værre end en midlertidig. */
  domaene: 'https://gersel1233.github.io/mosedehavnegrill',

  /* Sociale profiler. Kun dem vi har set. Tomme felter vises
     ikke – et link til en profil der ikke findes, er en
     blindgyde for både gæster og Google. */
  social: {
    facebook: '',
    instagram: '',
    google: '',       // Google Virksomhedsprofil
    /* Oplyst af Mikkel 31/8 — seneste kontrol 26-02-2026, glad
       smiley. Rapporten hedder "Mosede havn grill og ishus". */
    smiley: 'https://www.findsmiley.dk/app/1480560',
  },

  /* Prisklasse til JSON-LD. To kroner-tegn svarer til en
     grillbar: hovedretter i 50-120 kr, som menukortet viser. */
  prisklasse: '$$',

  /* Køkkentyper til JSON-LD. Google bruger dem til "grillbar i
     nærheden" og lignende. */
  koekken: ['Grill', 'Smørrebrød', 'Is'],
};

/* Hjælpere. De ligger her og ikke i side.js, fordi alle sider
   bruger dem – også dem der ikke indlæser forsidens kode. */
window.MOSEDE.fuldAdresse = function () {
  var a = window.MOSEDE.adresse;
  return a.vej + ', ' + a.postnr + ' ' + a.by;
};

/* Rutevejledning. Et link til Google Maps frem for et indlejret
   kort: kortet er 300-900 kB JavaScript fra en tredjepart, sætter
   cookies, og gæsten skal alligevel videre til sin egen app for
   at få ruten. */
window.MOSEDE.ruteUrl = function () {
  var m = window.MOSEDE;
  return 'https://www.google.com/maps/dir/?api=1&destination='
    + encodeURIComponent(m.navn + ', ' + m.fuldAdresse());
};
