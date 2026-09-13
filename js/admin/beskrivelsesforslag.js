/* ============================================================
   FORSLAG TIL BESKRIVELSER  (13/9)
   ------------------------------------------------------------
   Kundens idé: gæsten skal kunne trykke på en vare på menukortet og
   læse, hvad den er. Det kræver en beskrivelse — og 180 af ejerens
   madvarer havde ingen.

   ⚠️ DET ER FORSLAG, OG DE STÅR KUN I ADMIN. En beskrivelse, vi
   skriver selv og lægger ud, er en påstand om køkkenets mad — og en
   forkert ingrediens er en allergirisiko. Derfor står forslaget
   under feltet på Menukort-fanen med knappen "Brug forslaget", og
   det er ETT TRYK DÉR, der gemmer det. Gæstesiden kender ikke filen.

   ⚠️ DE SIGER KUN DET, RETTEN KLASSISK ER — eller det, navnet
   allerede siger. Hvor vi ikke kan vide det ("Havnens burger"),
   beder forslaget ejeren skrive det selv i stedet for at gætte.

   Nøglen er varens NAVN med små bogstaver. Står der allerede en
   beskrivelse, vises forslaget ikke.
   ============================================================ */
(function () {
  'use strict';
  window.Admin = window.Admin || {};
  var F = {
    // Retter
    'lun delle eller steg': 'En lun, hjemmelavet frikadelle eller en skive steg.',
    'stjerneskud': 'Stegt og dampet fiskefilet på franskbrød med rejer, asparges, dressing og citron.',
    'fish’n’chips': 'Paneret fisk med pommes frites, remoulade og citron.',
    "fish'n'chips": 'Paneret fisk med pommes frites, remoulade og citron.',
    'fiskefilet med pommes': 'Paneret fiskefilet med pommes frites, remoulade og citron.',
    'pariserbøf': 'Hakkebøf på ristet brød med æggeblomme, kapers, peberrod, rødbeder og løg.',
    // Fra pladen
    'indbagte rejer med pommes': 'Sprøde indbagte rejer med pommes frites og dip.',
    'nuggets med pommes': 'Kyllingenuggets med pommes frites og dip.',
    'hjemmelavet cowboytoast': 'Varm toast fra pladen — skriv, hvad der er i den.',
    'pommes frites med dip': 'En portion sprøde pommes frites med dip.',
    'hjemmelavet lun frikadelle': 'Hjemmelavet frikadelle, serveret lun.',
    // Burgere og sandwich
    'flæskestegssandwich': 'Flæskesteg med sprød svær, rødkål og agurkesalat i blødt brød.',
    'frikadellesandwich': 'Hjemmelavet frikadelle i brød med rødkål, agurkesalat og dressing.',
    'kyllingeburger': 'Sprød kylling i burgerbolle med salat, tomat og dressing.',
    'havnens burger': 'Husets egen burger — skriv, hvad der er på den.',
    'bøfsandwich': 'Hakkebøf i blødt brød med brun sovs, rødbeder, agurk og ristede løg.',
    'cheesebaconburger': 'Bøf med ost og sprød bacon, salat, tomat og dressing i burgerbolle.',
    'dobbeltburger': 'To bøffer med ost, salat, tomat og dressing i burgerbolle.',
    'bearnaiseburger': 'Bøf med bearnaisesauce, salat og tomat i burgerbolle.',
    'chilinaiseburger': 'Bøf med stærk chilimayo, salat og tomat i burgerbolle.',
    'cheeseburger': 'Bøf med ost, salat, tomat, syltede agurker og dressing i burgerbolle.',
    'flæskestegsburger': 'Flæskesteg med sprød svær, rødkål og agurkesalat i burgerbolle.',
    'frikadelleburger': 'Hjemmelavet frikadelle med rødkål og dressing i burgerbolle.',
    // Pølser
    'pistolpølse': 'Pølse i et sprødt pistolbrød med sennep, ketchup og ristede løg.',
    'specialpølse med baconsvøb': 'Pølse svøbt i bacon, i brød med dressing.',
    'dürümrulle': 'Pølse rullet ind i en tynd dürüm med salat og dressing.',
    'ristet pølse': 'Ristet pølse med brød, sennep, ketchup og remoulade.',
    'ristet pølse med bacon': 'Ristet pølse svøbt i bacon, med brød og dressing.',
    'frankfurter med bacon': 'Frankfurter svøbt i bacon, med brød og dressing.',
    'kradser med det hele': 'Pølse med det hele: sennep, ketchup, remoulade, rå og ristede løg og agurk.',
    'ristet hotdog, lille': 'Ristet pølse i hotdogbrød med remoulade, ketchup, sennep, ristede løg og agurk.',
    'ristet hotdog, stor': 'Ristet pølse i hotdogbrød med remoulade, ketchup, sennep, ristede løg og agurk.',
    'fransk hotdog, alm.': 'Pølse i udhulet flute med dressing.',
    'fransk hotdog, stor': 'Pølse i udhulet flute med dressing.',
    // Sliders
    'slider med roastbeef': 'Lille blød bolle med roastbeef, remoulade og ristede løg.',
    'slider med hønsesalat': 'Lille blød bolle med hønsesalat.',
    'slider med æggesalat': 'Lille blød bolle med æggesalat.',
    'slider med leverpostej': 'Lille blød bolle med leverpostej.',
    'slider med æg': 'Lille blød bolle med æg.',
    'slider med æg og rejer': 'Lille blød bolle med æg og rejer.',
    'slider med flæskesteg': 'Lille blød bolle med flæskesteg og rødkål.',
    'slider med frikadelle': 'Lille blød bolle med frikadelle og rødkål.',
    'slider med spegepølse': 'Lille blød bolle med spegepølse.',
    'slider med laks': 'Lille blød bolle med laks.',
    // Morgenmad
    'rundstykke med pålæg': 'Friskt rundstykke med smør og pålæg.',
    'frugtmix': 'En skål frisk frugt.',
    'franskbrød med pålæg': 'Franskbrød med smør og pålæg.',
  };
  Admin.beskrivelsesForslag = function (navn) {
    return F[String(navn || '').trim().toLowerCase()] || null;
  };
})();
