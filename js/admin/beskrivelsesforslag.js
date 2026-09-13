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

   ⚠️ INGEN BESKEDER TIL EJEREN SOM FORSLAG (13/9). "Havnens burger" og
   "Hjemmelavet cowboytoast" stod med "skriv, hvad der er på den" — og
   "Brug alle forslag" ville have lagt den sætning ud til gæsterne. Kan vi
   ikke vide, hvad retten er, står der INTET forslag; ejeren skriver selv.

   Nøglen er varens NAVN med små bogstaver. Står der allerede en
   beskrivelse, vises forslaget ikke.
   ============================================================ */
(function () {
  'use strict';
  window.Admin = window.Admin || {};
  var F = {
    // ---- Retter ----
    'lun delle eller steg': 'En lun, saftig frikadelle eller en skive varm steg — klassisk og mættende.',
    'stjerneskud': 'Sprød stegt og mild dampet fiskefilet på franskbrød med rejer, asparges, dressing og citron.',
    'fish’n’chips': 'Gyldent paneret fisk med sprøde pommes frites, remoulade og en citronbåd.',
    "fish'n'chips": 'Gyldent paneret fisk med sprøde pommes frites, remoulade og en citronbåd.',
    'fiskefilet med pommes': 'Sprød paneret fiskefilet med pommes frites, remoulade og citron.',
    'pariserbøf': 'Saftig bøf på ristet brød med æggeblomme, kapers, peberrod, rødbeder og rå løg.',
    // ---- Fra pladen ----
    'indbagte rejer med pommes': 'Sprøde indbagte rejer med gyldne pommes frites og dip.',
    'nuggets med pommes': 'Sprøde kyllingenuggets med pommes frites og dip.',
    'pommes frites med dip': 'En portion gyldne, sprøde pommes frites med dip.',
    'hjemmelavet lun frikadelle': 'Lun, saftig frikadelle lige fra panden.',
    // ---- Burgere og sandwich ----
    'flæskestegssandwich': 'Saftig flæskesteg med sprød svær, rødkål og agurkesalat i blødt brød.',
    'frikadellesandwich': 'Lun frikadelle i blødt brød med rødkål, agurkesalat og dressing.',
    'kyllingeburger': 'Sprød kylling i en blød burgerbolle med salat, tomat og cremet dressing.',
    'bøfsandwich': 'Saftig bøf i blødt brød med brun sovs, rødbeder, agurk og ristede løg — den klassiske.',
    'cheesebaconburger': 'Saftig bøf med smeltet ost og sprød bacon, salat, tomat og dressing i ristet burgerbolle.',
    'dobbeltburger': 'To saftige bøffer med smeltet ost, salat, tomat og dressing — til den store sult.',
    'bearnaiseburger': 'Saftig bøf med cremet bearnaise, salat og tomat i ristet burgerbolle.',
    'chilinaiseburger': 'Saftig bøf med stærk chilimayo, salat og tomat i ristet burgerbolle.',
    'cheeseburger': 'Saftig bøf med smeltet ost, sprød salat, tomat, syltede agurker og dressing i ristet burgerbolle.',
    'flæskestegsburger': 'Saftig flæskesteg med sprød svær, rødkål og agurkesalat i ristet burgerbolle.',
    'frikadelleburger': 'Lun frikadelle med rødkål og dressing i ristet burgerbolle.',
    // ---- Pølser ----
    'pistolpølse': 'Pølse i et sprødt pistolbrød med sennep, ketchup og ristede løg.',
    'specialpølse med baconsvøb': 'Pølse svøbt i sprød bacon, i brød med dressing.',
    'dürümrulle': 'Pølse rullet ind i en tynd, varm dürüm med salat og dressing.',
    'ristet pølse': 'Ristet pølse med brød, sennep, ketchup og remoulade — som ved pølsevognen.',
    'ristet pølse med bacon': 'Ristet pølse svøbt i sprød bacon, med brød og dressing.',
    'frankfurter med bacon': 'Frankfurter svøbt i sprød bacon, med brød og dressing.',
    'kradser med det hele': 'Pølse med det hele: sennep, ketchup, remoulade, rå og ristede løg og agurkesalat.',
    'ristet hotdog, lille': 'Ristet pølse i blødt hotdogbrød med remoulade, ketchup, sennep, ristede løg og agurk.',
    'ristet hotdog, stor': 'Ristet pølse i blødt hotdogbrød med remoulade, ketchup, sennep, ristede løg og agurk.',
    'fransk hotdog, alm.': 'Pølse i en sprød, udhulet flute med dressing.',
    'fransk hotdog, stor': 'Pølse i en sprød, udhulet flute med dressing.',
    // ---- Sliders ----
    'slider med roastbeef': 'Lille blød bolle med roastbeef, remoulade og ristede løg.',
    'slider med hønsesalat': 'Lille blød bolle med cremet hønsesalat.',
    'slider med æggesalat': 'Lille blød bolle med cremet æggesalat.',
    'slider med leverpostej': 'Lille blød bolle med leverpostej.',
    'slider med æg': 'Lille blød bolle med æg.',
    'slider med æg og rejer': 'Lille blød bolle med æg og rejer.',
    'slider med flæskesteg': 'Lille blød bolle med flæskesteg og rødkål.',
    'slider med frikadelle': 'Lille blød bolle med frikadelle og rødkål.',
    'slider med spegepølse': 'Lille blød bolle med spegepølse.',
    'slider med laks': 'Lille blød bolle med laks.',
    // ---- Morgenmad ----
    'rundstykke med pålæg': 'Friskt rundstykke med smør og pålæg.',
    'frugtmix': 'En skål frisk, skåret frugt.',
    'franskbrød med pålæg': 'Franskbrød med smør og pålæg.',
    // ---- Isen ----
    'softice, lille': 'Cremet softice i sprød vaffel — med guf, sauce eller drys, hvis du vil.',
    'softice, stor': 'En stor, cremet softice i sprød vaffel — med guf, sauce eller drys, hvis du vil.',
    'sundae med frugt og sauce': 'Softice i bæger med frisk frugt og sauce.',
    'boblevaffel med 1 kugle': 'Lun, sprød boblevaffel med en kugle is.',
    'churros med sukker og kanel': 'Lune, sprøde churros vendt i sukker og kanel.',
    'churros med is og sauce': 'Lune, sprøde churros med is og sauce.',
  };
  Admin.beskrivelsesForslag = function (navn) {
    return F[String(navn || '').trim().toLowerCase()] || null;
  };
})();
