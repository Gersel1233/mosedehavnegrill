/* Mosede Havnegrill — menudata. Priser er pladsholdere og hentes i produktion fra personalesiden. */
const MENU=[
{id:"populaert",title:"Mest bestilt",icon:"star",note:"Det gæsterne tager igen og igen.",groups:[
 {items:[["Dagens ret",95,"Skifter hver dag — se forsiden"],["Stjerneskud",149],["Havnens burger",119],["Fish'n chips",129],["Rejemad",75],["Soft ice, stor",45]]}]},

{id:"morgen",title:"Morgenmad og brunch",icon:"sun",note:"Serveres 8–11.",groups:[
 {name:"Morgenmad",items:[["All in one sandwich",65,"Toastbrød eller rugbrød · ost, skinke, spejlæg"],["Franskbrød med pålæg",45],["Rundstykke med pålæg",45]]},
 {name:"Tallerkener",items:[["Brunchtallerken",139,"Spejl- eller røræg, bacon, pølse, skyr med knas, pålæg, marmelade, frugt, grønt, pandekage, bønner i tomat, brød og smør"],["Engelsk morgenmad",129,"Spejlæg, 2 stk. bacon, bønner i tomat, pølse, stegte champignon, pandestegt tomat, ristet toastbrød og smør"]]},
 {name:"Tilkøb",kind:"add",items:[["Blødkogt æg",12],["Bacon, 2 stk.",20],["Pålæg",15],["Grønt",15],["Marmelade",10],["Smør",8],["Pølser",20],["Bønner i tomat",18],["Frugt",20],["Pandekage",20],["Wienerbrød, ½",18],["Kage",30]]}]},

{id:"retter",title:"Retter fra pladen",icon:"pan",groups:[
 {name:"Fisk",items:[["Stjerneskud",149],["Fish'n chips",129],["Fiskefilet",95],["Rejemad",75],["Rejecocktail",89],["Indbagte rejer med salat",95]]},
 {name:"Klassikere",items:[["Pariserbøf",139],["Tatarmad",125],["Hjemmelavet biksemad med spejlæg",119],["Hjemmelavet lun frikadelle",75],["Lun leverpostej med brød",65],["Lun delle med brød",75],["Lun steg med brød",79]]},
 {name:"Til deling",items:[["Nachos med ost og tilbehør",89,"Tilkøb: kylling el. kebab +25"],["Pølsemix",95],["Kebabmix, kylling el. kebab",99],["Nuggets med pommes",75],["Hjemmelavet hvidløgsbrød med ost og tomat",65],["Snackkurv med en dip",89],["Pommes frites",39],["Blandet salat",49,"Tilkøb: æg, tun, kylling, kebab el. pasta +20"]]}]},

{id:"sandwich",title:"Sandwich, toast og pita",icon:"sandwich",groups:[
 {items:[["Hjemmelavet cowboytoast",69],["Hjemmelavet skinke/ost-toast",55],["Pitabrød",75,"Tun, kebab eller kylling"],["Sandwich",79,"Æg, pålæg, hønsesalat, æggesalat, wienersalat, skinkesalat, kebab, kylling eller tun"],["Bøfsandwich",99]]}]},

{id:"poelser",title:"Pølser og hotdogs",icon:"hotdog",groups:[
 {name:"Ristet og frankfurter",items:[["Ristet pølse",35],["Ristet pølse med bacon",45],["Frankfurter",38],["Frankfurter med bacon",48],["Pølsebrød",10],["Kradser med det hele",55]]},
 {name:"Hotdogs",items:[["Fransk hotdog, alm.",45],["Fransk hotdog, stor",55],["Ristet hotdog, alm.",45],["Ristet hotdog, stor",55]]}]},

{id:"burgere",title:"Burgere",icon:"burger",groups:[
 {items:[["Havnens burger",119],["Dobbeltburger",139],["Bearnaiseburger",125],["Chilinaiseburger",125],["Cheeseburger",105],["Bacon-cheeseburger",119],["Kyllingburger",109],["Flæskestegsburger",115],["Frikadelleburger",99]]}]},

{id:"smoerrebroed",title:"Smørrebrød",icon:"bread",note:"Bestil ud af huset dagen før — vi laver det friskt.",groups:[
 {name:"Fisk",items:[["Fiskefilet med remoulade",65],["Fiskefilet med mayo og rejer",75],["Rejemad",75],["Sild",55],["Æg med rejer",69]]},
 {name:"Kød",items:[["Flæskesteg med surt",65],["Frikadelle med surt",60],["Roastbeef",65],["Rullepølse",55],["Dyrlægens natmad",65],["Hakkebøf",75],["Skinke med italiensk salat",60],["Spegepølse",55],["Leverpostej",50]]},
 {name:"Salater og grønt",items:[["Hønsesalat",60],["Wienersalat",60],["Æggesalat",55],["Skinkesalat",60],["Æggemad",50],["Kartoffelmad",50],["Ostemad",50]]},
 {name:"Platter",items:[["Platte",165,"Sammensat af dagens bedste — spørg ved lugen"]]}]},

{id:"hensyn",title:"Glutenfri, laktosefri og vegansk",icon:"leaf",note:"Sig til ved bestilling, så tilpasser vi. Vi laver også retter helt uden for kortet — spørg os.",groups:[
 {items:[["Glutenfri mad",0,"Glutenfrit brød til alt smørrebrød og burgere"],["Laktosefri mad",0],["Vegansk mad",0],["Vegansk smørrebrød",55,"Tomatmad · kartoffelmad · avokadomad"]]}]},

{id:"is",title:"Is og softice",icon:"cone",groups:[
 {name:"Kugleis",items:[["1 kugle",30],["2 kugler",50],["3 kugler",65],["4 kugler",80],["Ekstra kugle",18],["Løs vaffel",8],["Sauce, topping eller guf",8],["Softice-top",10]]},
 {name:"Softice",items:[["Softice, lille",35],["Softice, stor",45],["Bæger med topping",45],["Bæger med vaffelknas, softice og topping",55]]},
 {name:"Bubblewaffel og churros",items:[["Bubblewaffel med 1 kugle is og topping",65],["Bubblewaffel med 2 kugler is og topping",79],["Bubblewaffel med softice og topping",69],["Churros med sukker og kanel",45],["Churros med is og topping",65]]},
 {name:"Til hjemturen",items:[["Thermobox, ca. 6 kugler is",149],["Thermobox fyldt med softice",149]]}]},

{id:"kage",title:"Kager og pandekager",icon:"cake",groups:[
 {items:[["Hjemmelavede pandekager med sukker og syltetøj",45],["Hjemmelavede pandekager med is og sauce",65],["Hjemmebagt kage",30],["Gammeldags æblekage",55],["Kaffe og kage",65],["Kaffe og pandekage",85]]}]},

{id:"kaffe",title:"Kaffe og varme drikke",icon:"cup",groups:[
 {name:"Kaffe",items:[["Espresso",25],["Americano",30],["Cortado",32],["Macchiato",32],["Cappuccino",38],["Latte",40],["Flat white",40],["Chai latte",42]]},
 {name:"Koldt og ekstra",items:[["Latte ice",42],["Americano ice",35],["Iskugle i kaffen",10],["Ekstra shot",8],["Sirup",5]]},
 {name:"Andet varmt",items:[["The",28],["Kakao",35],["Irish coffee",75],["Lumumba, kold eller varm",75]]}]},

{id:"snacks",title:"Slik og snacks",icon:"bag",groups:[
 {items:[["Slik, chokolade og stænger",25],["Slikpose",35],["Nødder",30],["Flæskesvær",25],["Popcorn",25],["Chips",25]]}]},

{id:"sodavand",title:"Sodavand og juice",icon:"bottle",groups:[
 {items:[["Sodavand, juice, kakao eller isthe, lille",25],["Sodavand, juice, kakao eller isthe, stor",35],["Red Bull, alm. eller sukkerfri",35],["Capri-Sun",15],["Lille juice",18],["Mælk",15],["Cocio",25],["Kildevand",20],["Isvand",0,"Altid gratis"],["Smoothie",55],["Milkshake",55],["Slush ice",35]]}]},

{id:"vin",title:"Vin, cava og champagne",icon:"glass",groups:[
 {name:"Vin",items:[["Hvidvin, glas",65],["Hvidvin, flaske",295],["Rødvin, glas",65],["Rødvin, flaske",295],["Rosé, glas",65],["Rosé, flaske",295]]},
 {name:"Alkoholfri vin",items:[["Glas",50],["Flaske",225]]},
 {name:"Bobler",items:[["Cava, glas",65],["Cava, flaske",295],["Champagne, glas",110],["Champagne, flaske",595]]}]},

{id:"oel",title:"Øl",icon:"beer",groups:[
 {name:"Fadøl",items:[["Fadøl alm., stor",65],["Fadøl alm., lille",45],["Fadøl special, stor",75],["Fadøl special, lille",50]]},
 {name:"Flaske og dåse",items:[["Flaske- eller dåseøl",45],["Flaske- eller dåseøl, special",55],["Alkoholfri øl",40]]}]},

{id:"bar",title:"Drinks og shots",icon:"drink",groups:[
 {items:[["Drinks",85],["Cocktails",95],["RTD",50],["Snaps",35],["Bitter",35],["Shots",35]]}]},

{id:"selskab",title:"Til selskabet",icon:"party",note:"Bestilles mindst 3 dage før. Vi ringer og bekræfter.",groups:[
 {name:"Tapasfad",items:[["Tapasfad, pr. person",145,"5 slags ost · serranoskinke · chorizo · paté · hummus · oliven · cornichoner · frugt · grønt · baguette · smør · hjemmelavet chilimayo og tzatziki"]]},
 {name:"Receptionspindemad",note:"På toastbrød eller rugbrød · min. 20 stk.",items:[["Pindemad, pr. stk.",22,"Skinke og ost · hønsesalat · æggesalat · wienersalat · frikadelle · flæskesteg · leverpostej · æg · æg med rejer · roastbeef · spegepølse · laks"]]},
 {name:"Varme tilkøb",kind:"add",items:[["Hjemmelavede minifrikadeller, 10 stk.",95],["Hjemmelavet flæskesvær",45],["Miniburgere, 5 stk.",125],["Mini kyllingburgere, 5 stk.",125],["Mini fiskeburgere, 5 stk.",135],["Mini vegetarburgere, 5 stk.",115]]},
 {name:"Salat og grønt",kind:"add",items:[["Blandede salater",39],["Pastasalat",39],["Råkost",35],["Frugtfad",249],["Frugtsalat",45]]},
 {name:"Sødt og is",kind:"add",items:[["Vaniljecreme",35],["Vanilje-jordbær softice",45],["Isbar uden betjening",895],["Isbar med betjening",1495],["Chips",25],["Popcorn",25],["Slush ice",35],["Milkshake",55],["Smoothies",55],["Slikposer",35]]}]}
];
