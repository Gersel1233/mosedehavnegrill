/* HAVNENS EGNE IKONER — ét sted.  (5/9)

   Kundens ord: "det skal ikke være billige lorte generic ikoner,
   de skal være gode, unikke og evt. animationer på." Det vender
   hans egen ordre fra 31/8 om emojier på retterne — det er hans
   beslutning, truffet efter rapporten om det generiske.

   ⚠️ REGLEN OM HVILKET ANSIGT EN RET FÅR BOR STADIG I
   js/menu-emoji.js. Filen her ved INTET om mad: den kender kun
   nøgler ("burger", "fisk", "kaffe") og tegner dem. Flytter
   nogen mønstrene herind, er der to lister over det samme igen.

   Stregen er husets: blæk (currentColor), 1,6 px på et 24-net,
   runde ender — og ÉN rød plet, hvor der er noget rødt at pege
   på: tomaten i burgeren, rødspættens pletter, vinen i glasset.
   Rødspætten er ikke en tilfældig fisk; det er Køge Bugts, og
   pletterne er sande.

   ⚠️ IKONERNE ER DOM-KNUDER, IKKE TEKST. Et emoji kunne sættes
   ind med textContent; det her er et <svg>. Læg det ALDRIG ind
   i en streng, der bygges med innerHTML sammen med ejerens
   varenavne — navnet skal stadig sættes som tekst (menuside-
   værnet fra 30/8).

   ⚠️ INGEN filter, INGEN gradient, INGEN masker. 264 rækker på
   menukortet tegner hver sit ikon, og et filter pr. række koster
   billeder i sekundet på en iPad (samme afvejning som admins
   glas 31/8). Bevægelsen er kun transform og opacity — det er
   det, gennemgangsprøven tillader.
*/
(function () {
  'use strict';

  var R = ' class="ik-rod"';         /* rød flade, ingen streg */
  var RS = ' class="ik-rod-streg"';  /* rød streg */

  var IKONER = {
    /* ---- mad ---- */
    burger:
      '<path d="M4 10.5C4 6.9 7.6 4.5 12 4.5s8 2.4 8 6z"/>' +
      '<path d="M9 7.6h.01M12.4 6.6h.01M15.4 7.9h.01"/>' +
      '<path d="M4.5 12h15"/>' +
      '<path d="M4 14c1.3-1.1 2.7-1.1 4 0s2.7 1.1 4 0 2.7-1.1 4 0 2.7 1.1 4 0"/>' +
      '<rect' + R + ' x="5" y="15.4" width="14" height="2" rx="1"/>' +
      '<path d="M4.5 18h15a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 18z"/>',
    hotdog:
      '<path d="M4 11.2c0-2 1.6-3.7 3.6-3.7h8.8c2 0 3.6 1.7 3.6 3.7"/>' +
      '<path d="M4 13.6c0 2 1.6 3.7 3.6 3.7h8.8c2 0 3.6-1.7 3.6-3.7"/>' +
      '<path d="M2.8 12.4h18.4" stroke-width="2.4"/>' +
      '<path' + RS + ' d="M7.5 12.4l1.8-1.3 1.8 1.3 1.8-1.3 1.8 1.3 1.8-1.3 1.8 1.3"/>',
    paalaeg:
      '<circle cx="12" cy="12" r="7.5"/>' +
      '<circle' + R + ' cx="9.4" cy="10.2" r="1.1"/>' +
      '<circle' + R + ' cx="14.2" cy="9.6" r="1.1"/>' +
      '<circle' + R + ' cx="11.6" cy="13.8" r="1.1"/>' +
      '<circle' + R + ' cx="15.2" cy="13.6" r="1.1"/>' +
      '<circle' + R + ' cx="8.6" cy="14.3" r=".8"/>',
    broed:
      '<g transform="rotate(-12 12 12)">' +
      '<path d="M5.5 10c0-2.2 1.4-3.8 3-3.8 1 0 1.6.6 3.5.6s2.5-.6 3.5-.6c1.6 0 3 1.6 3 3.8v7.4a1.4 1.4 0 0 1-1.4 1.4H6.9a1.4 1.4 0 0 1-1.4-1.4z"/>' +
      '<path d="M8 13.4c1-.9 2-.9 3 0s2 .9 3 0 1.4-.9 2-.4"/>' +
      '<circle' + R + ' cx="14.8" cy="10.6" r="1.5"/>' +
      '</g>',
    tapas:
      '<path d="M4 12.4h16l-1.4 5a2.4 2.4 0 0 1-2.3 1.8H7.7a2.4 2.4 0 0 1-2.3-1.8z"/>' +
      '<circle' + R + ' cx="9" cy="9.6" r="2.1"/>' +
      '<circle cx="14.6" cy="9.4" r="2.1"/>' +
      '<path d="M15.8 7.6l2.4-4.2"/>',
    pindemad:
      '<path d="M5 19 19 5"/>' +
      '<circle' + R + ' cx="9.2" cy="14.8" r="2"/>' +
      '<path d="M12.6 9.6 15 12l-2.4 2.4L10.2 12z"/>' +
      '<circle cx="15.6" cy="8.4" r="1.9"/>',
    platte:
      '<path d="M4 14a8 8 0 0 1 16 0"/>' +
      '<path d="M2.5 14h19"/>' +
      '<path d="M12 6V4.6"/>' +
      '<circle' + R + ' cx="12" cy="3.6" r="1.1"/>' +
      '<path d="M7.5 11.5c.6-1.6 1.8-2.8 3.3-3.4"/>',
    morgenmad:
      '<path d="M5.4 12.2c-.6-3.2 1.6-5.8 4.6-5.6 2 .2 3-1.6 5.2-1.2 2.8.4 4.6 3 4 5.8-.4 2-2.2 2.6-2.6 4.6-.4 2.4-2.8 3.4-5 3-3.4-.6-5.6-3.4-6.2-6.6z"/>' +
      '<circle' + R + ' cx="11.2" cy="12.2" r="2.3"/>',
    sandwich:
      '<path d="M3.5 18 12 5.5 20.5 18z"/>' +
      '<path d="M6.3 14.6c1-.8 2-.8 3 0s2 .8 3 0 2-.8 3 0 1.7.8 2.4 0"/>' +
      '<circle' + R + ' cx="12" cy="11.2" r="1.3"/>',
    salat:
      '<path d="M3.5 13h17l-1.4 4.6a2.2 2.2 0 0 1-2.1 1.6H7a2.2 2.2 0 0 1-2.1-1.6z"/>' +
      '<path d="M8 13c0-3.2 1.6-5.4 4-6.4 2.4 1 4 3.2 4 6.4"/>' +
      '<path d="M12 7.2V13"/>' +
      '<circle' + R + ' cx="17.2" cy="11.2" r="1.6"/>',
    fisk:
      '<path d="M2.5 12c0-3.4 4-6 8.6-6s8.4 2.6 8.4 6-3.8 6-8.4 6S2.5 15.4 2.5 12z"/>' +
      '<path class="ik-hale" d="M19.5 12l2.8-3.2v6.4z"/>' +
      '<path d="M6.8 10.6h.01"/>' +
      '<path d="M5.2 12.4c.6.9 1.4 1.4 2.3 1.4"/>' +
      '<circle' + R + ' cx="10.4" cy="13.2" r="1"/>' +
      '<circle' + R + ' cx="13.8" cy="10.4" r="1"/>' +
      '<circle' + R + ' cx="15" cy="14" r="1"/>',
    pommes:
      '<path d="M8.6 12V6.6M11 12V5.2M13.4 12V5.6M15.8 12V7.2"/>' +
      '<path' + R + ' d="M5.8 11.4h12.4l-1.2 8.6H7z"/>',
    rundstykke:
      '<ellipse cx="12" cy="13" rx="8.2" ry="5.6"/>' +
      '<path d="M8 10.8l1.6 1.6M12 9.6l1.6 1.6M15.8 10.6l-1.6 1.6"/>' +
      '<path d="M4.2 14.4c2 .8 4.6 1.2 7.8 1.2s5.8-.4 7.8-1.2"/>',
    aeg:
      '<path d="M12 3.6c3.4 0 6 4.6 6 9a6 6 0 0 1-12 0c0-4.4 2.6-9 6-9z"/>' +
      '<circle' + R + ' cx="12" cy="13.2" r="2.1"/>',
    kartoffel:
      '<path d="M5.5 13.2c0-4 3.2-7.6 7.2-7.6S19 8.6 19 12.2s-2.2 6.4-6.6 6.4S5.5 17 5.5 13.2z"/>' +
      '<path d="M9.2 10.8h.01M13.6 9.6h.01M11.4 14.4h.01M15.4 13.8h.01"/>',
    reje:
      '<path' + RS + ' d="M6.5 8.4c5.4-4.2 12-1 11.2 5-.6 4.2-5 6.4-9.2 5"/>' +
      '<path' + RS + ' d="M11.6 6.4l.6 3.2M15 7.2l-.4 3.4M17.2 10.4l-2.6 1.4"/>' +
      '<path' + RS + ' d="M8.5 18.4l-2.3 2.6M8.5 18.4l3.1 1.8"/>' +
      '<path d="M7.6 8.8h.01"/>',
    kylling:
      '<path d="M13 5.2c3.4-2 7.4.6 6.8 4.2-.4 2.4-2.6 3.8-4.6 5l-2.4 1.6-3.6-3.6 1.6-2.4c1.2-2 1-4.2 2.2-4.8z"/>' +
      '<path d="M9.2 12.4l-4 4"/>' +
      '<circle cx="4" cy="17.6" r="1.4"/>' +
      '<circle cx="6.4" cy="20" r="1.4"/>',
    boef:
      '<path d="M4.8 11c0-2.8 2.4-4.8 5.4-4.8 2.6 0 3.6 1.6 5.8 1.6 2 0 3.2 1.4 3.2 3.4 0 3.6-3.6 6.6-8 6.6-3.8 0-6.4-2.8-6.4-6.8z"/>' +
      '<path d="M8.8 10.4l2.4 3.2M12.4 9.6l2.4 3.2"/>',
    koed:
      '<circle cx="12" cy="14.8" r="4.6"/>' +
      '<path d="M12 10.2V7.4"/>' +
      '<path d="M9.6 2.8v3.4M12 2.6v3.6M14.4 2.8v3.4M9.6 6.2a2.4 2.4 0 0 0 4.8 0"/>' +
      '<path d="M10.2 14.2h.01M13.6 13.4h.01M12.2 16.8h.01"/>',
    pasta:
      '<path d="M9.4 3.8v4.6M12 3.8v4.6M14.6 3.8v4.6M9.4 8.4a2.6 2.6 0 0 0 5.2 0"/>' +
      '<path d="M12 11v9.6"/>' +
      '<path d="M5 13.4c2.2 1.6 4.4 1.8 7 .6 2.6 1.2 4.8 1 7-.6M5.6 16.4c2 1.4 4.2 1.4 6.4.2 2.2 1.2 4.4 1.2 6.4-.2"/>',
    nachos:
      '<path d="M4.5 6.5h15L12 19.5z"/>' +
      '<path d="M9.4 9.4h.01M13.8 8.9h.01M11.4 12.8h.01"/>' +
      '<circle' + R + ' cx="13.6" cy="12.2" r="1.3"/>',
    plante:
      '<path d="M12 20.4v-8.6"/>' +
      '<path d="M12 11.8c0-3.6-2.4-5.8-6.2-5.8 0 3.6 2.4 5.8 6.2 5.8z"/>' +
      '<path d="M12 11.8c0-3.6 2.4-5.8 6.2-5.8 0 3.6-2.4 5.8-6.2 5.8z"/>',
    aks:
      '<path d="M12 21V8"/>' +
      '<path d="M12 8c-2.6 0-3.8-1.6-3.8-3.8 2.6 0 3.8 1.6 3.8 3.8zM12 8c2.6 0 3.8-1.6 3.8-3.8-2.6 0-3.8 1.6-3.8 3.8z"/>' +
      '<path d="M12 12.4c-2.6 0-3.8-1.6-3.8-3.8 2.6 0 3.8 1.6 3.8 3.8zM12 12.4c2.6 0 3.8-1.6 3.8-3.8-2.6 0-3.8 1.6-3.8 3.8z"/>' +
      '<path d="M12 16.8c-2.6 0-3.8-1.6-3.8-3.8 2.6 0 3.8 1.6 3.8 3.8zM12 16.8c2.6 0 3.8-1.6 3.8-3.8-2.6 0-3.8 1.6-3.8 3.8z"/>',
    tomat:
      '<circle' + R + ' cx="12" cy="13.4" r="6.6"/>' +
      '<path d="M12 6.8V4.2M12 6.8l-2.6-1.6M12 6.8l2.6-1.6"/>',
    aeble:
      '<path' + R + ' d="M12 8.2c-3.2-2.2-6.6-.2-6.6 4 0 4.2 3.2 8.4 6.6 8.4s6.6-4.2 6.6-8.4c0-4.2-3.4-6.2-6.6-4z"/>' +
      '<path d="M12 8.2V5.4"/>' +
      '<path d="M12.2 6.6c1.2-1.6 2.8-1.8 4-1.2-.8 1.6-2.4 2.2-4 1.2z"/>',
    ost:
      '<path d="M4 9.6l16-4.4v13.2H4z"/>' +
      '<circle cx="9" cy="12.4" r="1.3"/><circle cx="13.6" cy="10.4" r="1.1"/><circle cx="11.6" cy="15.6" r="1"/>',
    /* ---- sødt og is ---- */
    softice:
      '<path d="M8.4 13.6 12 21.4l3.6-7.8"/>' +
      '<path d="M9.6 16.2h4.8M10.6 18.6h2.8"/>' +
      '<path d="M7.4 13.6c-2 0-2.3-2.8-.4-3.2C6 8 8.4 6.6 10 8c.2-2.8 3.6-3.4 4.4-1 2.2-1.4 4.8 1 3.6 3.4 2 .4 1.9 3.2-.2 3.2z"/>' +
      '<path' + R + ' d="M14.6 6.6c.6-1.4 1-2.2 2-2.8-.2 1.2-.6 2.2-1.4 3.2z"/>',
    kugleis:
      '<path d="M4.5 13.4h15l-1.2 4.4a2.4 2.4 0 0 1-2.3 1.8H8a2.4 2.4 0 0 1-2.3-1.8z"/>' +
      '<path d="M5.6 13.4a3.3 3.3 0 0 1 5.6-2.4M12.8 11a3.3 3.3 0 0 1 5.6 2.4"/>' +
      '<circle' + R + ' cx="12" cy="8.6" r="2.7"/>',
    vaffel:
      '<rect x="5" y="5" width="14" height="14" rx="2"/>' +
      '<path d="M5 9.7h14M5 14.3h14M9.7 5v14M14.3 5v14"/>' +
      '<circle' + R + ' cx="16.6" cy="7.4" r="1.6"/>',
    kage:
      '<path d="M5 10.6l14-3.2v11.2H5z"/>' +
      '<path d="M5 14.6l14-3.2"/>' +
      '<circle' + R + ' cx="14.8" cy="5.6" r="1.4"/>' +
      '<path d="M14.8 4.2c.4-.8.8-1.2 1.6-1.4"/>',
    slush:
      '<path d="M7 8.4h10l-1 11.6H8z"/>' +
      '<path d="M7 8.4a5 3.6 0 0 1 10 0"/>' +
      '<path' + RS + ' d="M13.4 8.4 16.2 3"/>' +
      '<path d="M7.5 14h9"/>',
    slik:
      '<ellipse' + R + ' cx="12" cy="12" rx="4.4" ry="3.4"/>' +
      '<path d="M7.6 12 4.4 9.4v5.2zM16.4 12l3.2-2.6v5.2z"/>',
    chokolade:
      '<rect x="5" y="5" width="14" height="14" rx="1.6"/>' +
      '<path d="M5 12h14M12 5v14"/>' +
      '<path' + R + ' d="M5.8 5.8h5.4v5.4H5.8z"/>',
    honning:
      '<path d="M7 9.4h10v9a2.2 2.2 0 0 1-2.2 2.2H9.2A2.2 2.2 0 0 1 7 18.4z"/>' +
      '<path d="M6.4 6.6h11.2v2.8H6.4z"/>' +
      '<rect' + R + ' x="9.4" y="12.6" width="5.2" height="3.6" rx=".6"/>',
    peanut:
      '<path d="M9.2 4.4c2.4 0 4 1.8 4 3.8 0 1.2-.6 2.2-.6 3.8s.6 2.6.6 3.8c0 2-1.6 3.8-4 3.8s-4-1.8-4-3.8c0-1.2.6-2.2.6-3.8S5.2 9.2 5.2 8.2c0-2 1.6-3.8 4-3.8z" transform="rotate(-30 12 12) translate(2.8 0)"/>' +
      '<path d="M10.2 8.6c1 1 1.6 2.2 1.8 3.4" transform="rotate(-30 12 12) translate(2.8 0)"/>',
    ske:
      '<path d="M4 13.4h16l-1.4 4.4a2.2 2.2 0 0 1-2.1 1.6H7.5a2.2 2.2 0 0 1-2.1-1.6z"/>' +
      '<path' + RS + ' d="M6.4 13.4h11.2"/>' +
      '<path d="M14.6 13.4l4-7.4"/>' +
      '<ellipse cx="19.6" cy="4.4" rx="1.5" ry="2.1" transform="rotate(28 19.6 4.4)"/>',
    /* ---- drikke ---- */
    sodavand:
      '<path d="M7 6.6h10l-1 13.4H8z"/>' +
      '<path' + RS + ' d="M13.4 6.6 16.4 2.4"/>' +
      '<path d="M7.6 11.2h8.8"/>' +
      '<circle class="ik-boble" cx="10.2" cy="16.2" r=".8"/>' +
      '<circle class="ik-boble" cx="13.2" cy="14" r=".8"/>' +
      '<circle class="ik-boble" cx="11.4" cy="13" r=".6"/>',
    kaffe:
      '<path d="M5 10h12v5a4.5 4.5 0 0 1-4.5 4.5h-3A4.5 4.5 0 0 1 5 15z"/>' +
      '<path d="M17 11.6h1.3a2.2 2.2 0 0 1 0 4.4H17"/>' +
      '<path class="ik-damp" d="M9 7.2c0-1.4 1-1.4 1-2.8"/>' +
      '<path class="ik-damp" d="M12.2 7.2c0-1.4 1-1.4 1-2.8"/>',
    te:
      '<path d="M5 10h12v5a4.5 4.5 0 0 1-4.5 4.5h-3A4.5 4.5 0 0 1 5 15z"/>' +
      '<path d="M17 11.6h1.3a2.2 2.2 0 0 1 0 4.4H17"/>' +
      '<path d="M11 10V5.4l3-1.2"/>' +
      '<rect' + R + ' x="13.4" y="2.6" width="3" height="2.4" rx=".5"/>',
    kakao:
      '<path d="M5 10h12v5a4.5 4.5 0 0 1-4.5 4.5h-3A4.5 4.5 0 0 1 5 15z"/>' +
      '<path d="M17 11.6h1.3a2.2 2.2 0 0 1 0 4.4H17"/>' +
      '<path class="ik-damp" d="M10.6 7.2c0-1.4 1-1.4 1-2.8"/>' +
      '<path' + R + ' d="M6.4 10h9.2c-.6 1.4-1.8 2.2-3.2 1.4-1 1-2.2.8-2.8-.2-.9.8-2.4.4-3.2-1.2z"/>',
    oel:
      '<path d="M6.5 8.4h11v10.6a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z"/>' +
      '<path d="M6.2 8.4c-1.8-.4-1.8-3.2.4-3 .2-2.6 3.4-3 4.4-1 1.2-2 4.4-1.8 4.8.6 2.2-.6 3.2 2 1.4 3.4"/>' +
      '<path d="M17.5 11h1.5a2.2 2.2 0 0 1 0 4.4h-1.5"/>' +
      '<circle class="ik-boble" cx="10" cy="17" r=".7"/>' +
      '<circle class="ik-boble" cx="13.4" cy="15" r=".7"/>' +
      '<circle class="ik-boble" cx="11.6" cy="12.8" r=".6"/>',
    vin:
      '<path d="M7 3.6h10c0 5-1.6 8.6-5 8.6S7 8.6 7 3.6z"/>' +
      '<path' + R + ' d="M7.9 7.6h8.2c-.7 2.4-2 3.6-4.1 3.6S8.6 10 7.9 7.6z"/>' +
      '<path d="M12 12.2v6.4M8.2 20.4h7.6"/>',
    cocktail:
      '<path d="M4 4.6h16l-8 9z"/>' +
      '<path d="M12 13.6v6.6M8.4 20.2h7.2"/>' +
      '<path d="M9.6 9.6l3.2-5"/>' +
      '<circle' + R + ' cx="9.6" cy="9.4" r="1.4"/>',
    maelk:
      '<path d="M7 8.4h10v11.2a.8.8 0 0 1-.8.8H7.8a.8.8 0 0 1-.8-.8z"/>' +
      '<path d="M7 8.4l1.6-4h6.8l1.6 4"/>' +
      '<circle' + R + ' cx="12" cy="14" r="1.6"/>',
    vand:
      '<path d="M12 3.6c3.6 4.6 6 8 6 11.4a6 6 0 0 1-12 0c0-3.4 2.4-6.8 6-11.4z"/>' +
      '<path d="M8.8 15a3.2 3.2 0 0 0 1.8 2.8"/>',
    /* ---- andet ---- */
    plus:
      '<circle cx="12" cy="12" r="8.4"/>' +
      '<path d="M12 8.2v7.6M8.2 12h7.6"/>',
    fest:
      '<path d="M3 6.6c4.2 4.4 13.8 4.4 18 0"/>' +
      '<path d="M6.6 9.2l1.6 3.4 1.6-3.2"/>' +
      '<path class="ik-rod ik-flag" d="M10.6 10.2 12 13.8l1.4-3.6z"/>' +
      '<path d="M14.2 9.4l1.6 3.2 1.6-3.4"/>',
    baad:
      '<g class="ik-vugge">' +
      '<path d="M3.5 14.6h17l-2.4 3.8H5.9z"/>' +
      '<path d="M12 4.6v10"/>' +
      '<path d="M12 6.4l5.6 8.2H12"/>' +
      '<path' + R + ' d="M12 4.2h3.2L12 6.2z"/>' +
      '</g>',
    tallerken:
      '<circle cx="12" cy="12" r="5.6"/>' +
      '<path d="M2.6 4.4v3.4a1.5 1.5 0 0 0 3 0V4.4M4.1 4.4v15.2"/>' +
      '<path d="M20.4 4.4c-1.4 1.8-1.8 4.4-1.4 6.8h1.4v8.4"/>',
    gryde:
      '<path d="M4 10.4h16v5.6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/>' +
      '<path d="M1.8 12.6H4M20 12.6h2.2"/>' +
      '<path d="M5.2 10.4c0-1.6 3-2.6 6.8-2.6s6.8 1 6.8 2.6"/>' +
      '<circle' + R + ' cx="12" cy="6.2" r="1.1"/>' +
      '<path class="ik-damp" d="M9.4 5.4c0-1.2.8-1.2.8-2.4"/>' +
      '<path class="ik-damp" d="M14.2 5.4c0-1.2.8-1.2.8-2.4"/>',
    bog:
      '<path d="M12 6.4c-2-1.6-4.8-2.2-8-2.2v13.6c3.2 0 6 .6 8 2.2 2-1.6 4.8-2.2 8-2.2V4.2c-3.2 0-6 .6-8 2.2z"/>' +
      '<path d="M12 6.4V20"/>' +
      '<path' + R + ' d="M15.4 4.4v5.4l1.4-1.1 1.4 1.1V4.6z"/>',
    musik:
      '<path d="M9 17.4V6.2l9-2v10.6"/>' +
      '<circle cx="6.6" cy="17.6" r="2.4"/>' +
      '<circle' + R + ' cx="15.6" cy="15" r="2.4"/>',
    pose:
      '<path d="M5.4 8.6h13.2l1 11.4H4.4z"/>' +
      '<path d="M9 8.6V7.2a3 3 0 0 1 6 0v1.4"/>' +
      '<circle' + R + ' cx="12" cy="14.4" r="1.4"/>',
    bil:
      '<path d="M3.6 16V12.4l2.2-4.2A2 2 0 0 1 7.6 7h8.8a2 2 0 0 1 1.8 1.2l2.2 4.2V16"/>' +
      '<path d="M3.6 16h16.8M6 12.4h12"/>' +
      '<circle cx="7.6" cy="17.2" r="1.7"/><circle cx="16.4" cy="17.2" r="1.7"/>' +
      '<circle' + R + ' cx="18.4" cy="14.2" r=".9"/>',
    ur:
      '<circle cx="12" cy="12" r="8.4"/>' +
      '<path d="M12 7.2V12l3.2 2"/>' +
      '<circle' + R + ' cx="12" cy="12" r="1"/>',
    megafon:
      '<path d="M4 10v4h3l7 4.4V5.6L7 10z"/>' +
      '<path class="ik-damp" d="M17.4 9.6a3.6 3.6 0 0 1 0 4.8"/>' +
      '<path class="ik-damp" d="M19.6 7.6a6.6 6.6 0 0 1 0 8.8"/>',
    anker:
      '<circle cx="12" cy="5.6" r="1.9"/>' +
      '<path d="M12 7.5V20.4M8.4 10.8h7.2"/>' +
      '<path d="M4.8 14a7.2 7.2 0 0 0 14.4 0"/>' +
      '<path d="M4.8 14l-1.4-1.6M4.8 14l2 .2M19.2 14l1.4-1.6M19.2 14l-2 .2"/>',
    noegle:
      '<circle cx="8" cy="9.6" r="4.2"/>' +
      '<path d="M11 12.6 19.2 20.8M15.6 17.2l2-2M17.6 19.2l2-2"/>' +
      '<circle' + R + ' cx="7.2" cy="8.8" r="1"/>',
  };

  var NS = 'http://www.w3.org/2000/svg';

  /* Tegner ét ikon som et <svg>. Nøglen SKAL findes — ellers
     svarer den null, og kalderen falder tilbage på emojiet. Det
     er med vilje: et tomt <svg> ville være en usynlig plads, og
     den ser ud som en fejl i listen. */
  function tegn(noegle, klasse) {
    var krop = IKONER[noegle];
    if (!krop) return null;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'ik ik-' + noegle + (klasse ? ' ' + klasse : ''));
    /* Indholdet er filens egne konstanter — aldrig ejerens tekst. */
    svg.innerHTML = krop;
    return svg;
  }

  /* De ikoner, der må røre på sig, gør det kun mens de er på
     skærmen: 21 kategorihoveder + forsidens fliser, der alle
     dampede på én gang uden for skærmen, ville koste billeder i
     sekundet for ingenting. */
  var io = null;
  function lever(el) {
    if (!('IntersectionObserver' in window)) { el.classList.add('lever'); return; }
    if (!io) {
      io = new IntersectionObserver(function (poster) {
        poster.forEach(function (p) { p.target.classList.toggle('lever', p.isIntersecting); });
      }, { rootMargin: '40px' });
    }
    io.observe(el);
  }

  /* Faste pladser i HTML'en: <span data-ikon="bog"></span>. Fyldes
     her, så index.html ikke skal bære path-data, der også ligger i
     filen — to kopier af det samme ikon skrider fra hinanden.
     data-lever="1" giver det bevægelse, når det er på skærmen. */
  function fyld(rod) {
    var alle = (rod || document).querySelectorAll('[data-ikon]');
    for (var i = 0; i < alle.length; i++) {
      var el = alle[i];
      if (el.querySelector('svg.ik')) continue;
      var svg = tegn(el.getAttribute('data-ikon'));
      if (!svg) continue;
      el.appendChild(svg);
      if (el.getAttribute('data-lever') === '1') lever(svg);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { fyld(); });
  else fyld();

  window.MosedeIkoner = {
    tegn: tegn,
    lever: lever,
    fyld: fyld,
    findes: function (n) { return Object.prototype.hasOwnProperty.call(IKONER, n); },
    NAVNE: Object.keys(IKONER),
  };
}());
