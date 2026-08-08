#!/usr/bin/env python3
"""Gør kundens udklip klar til isfilmen.

    python3 vaerktoej/lav-udklip.py

Læser assets/raa/*.png – dem kunden selv har klippet ud – og
skriver de færdige til assets/. Kør den igen så tit du vil:
råfilerne bliver aldrig rørt, så resultatet er det samme hver gang.

------------------------------------------------------------------
HVORFOR DEN FINDES
------------------------------------------------------------------
Udklippene har en blød kant på 10-20 pixel, og i den kant står der
lyse pixels fra det foto de er klippet ud af. Måler man dem, er
kanten i gennemsnit rgb(124,112,99) mens kuglens indre er
rgb(103,75,54) – altså en lys ring hele vejen rundt.

På en mørk baggrund ville det være en glød. På sandbaggrunden i
filmen bliver det en tåget rand, og det er præcis derfor kuglerne
ikke ser ud som om de svæver: de ser ud som klistermærker med et
skær omkring. Kunden sagde det selv – det skal ligne en animation.

TRE TING BLIVER GJORT, OG RÆKKEFØLGEN ER VIGTIG:

1) FARVEN TRÆKKES UDEFRA IND. Hver halvgennemsigtig pixel får
   farve fra de mere dækkende pixels ved siden af. Så er der ikke
   længere en lys ring at få frem, uanset hvor tynd kanten bliver.

2) HIMLEN FJERNES EFTER FARVE. Der er klippet en smule uden om
   kuglerne, så de yderste par pixel er baggrund fra fotoet – helt
   dækkende, så trin 1 rører dem ikke.

   Første forsøg krympede hele formen fire pixel for at komme af
   med den. Det virkede ikke: randen er 3-6 px de bredeste steder
   og under 1 px andre, så fire pixel var både for lidt og for
   meget. Kuglerne blev kantede der hvor der ikke var noget at
   fjerne, og der var stadig en blågrå rand tilbage foroven.

   Nu bliver den fundet i stedet for gættet. Baggrunden i fotoet er
   kold – en bleg blå himmel – og is er varm. Måler man de tolv
   yderste pixel af en kugle, er 7,0% af dem kolde (blå kanal lige
   så høj som den røde). Måler man kernen, er 0,0% kolde. Der er
   altså et rent skel, og de kolde pixels i kantbåndet er
   himmel – ikke is. De fjernes, og kun de.

3) KONTUREN GLATTES MED SLØRING, IKKE MED MORFOLOGI. Punkt 2
   arbejder pixel for pixel og efterlader tynde trævler udenfor og
   små hak indenfor.

   Første forsøg ryddede op med en åbning og en lukning – krymp og
   voks med Pillows MinFilter og MaxFilter. Det var en fejl, og det
   var DEN fejl kunden så: de filtre er FIRKANTEDE. Gentaget krymp
   og voks med en 3×3 firkant afhugger runde hjørner til lige
   facetter, så en kugle kommer ud som en ottekant. Kuglerne var
   ikke skåret dårligt af kunden – de blev skåret dårligt her.

   En gaussisk sløring efterfulgt af en tærskel gør det samme
   arbejde og er RUND. Trævler forsvinder, fordi de aldrig når op
   over tærsklen efter sløringen, hakkene fyldes, og kurverne
   bliver kurver.

   OG RADIUS SKAL VÆRE STOR. Kuglerne er klippet ud med et
   polygon-lasso: under den bløde kant ligger der lige linjer på
   10-20 pixel. Så længe kanten var tåget, kunne man ikke se dem;
   gør man kanten skarp, kommer ottekanten frem. En radius på 12
   pixel jævner dem helt ud på en kugle der er 358 pixel bred, og
   isens egen struktur inde i kuglen bliver ikke rørt – det er kun
   KONTUREN der bliver behandlet.

   Hånden får kun 8. Isen i keglen er klippet lige så groft som
   kuglerne, men hånden har rigtige detaljer i kanten: fingre, et
   serviet-hjørne, keglens kant. En finger er 80 pixel bred, så 8
   rører den ikke – men 12 ville begynde at slikke om hjørnerne på
   servietten.

Til sidst forlænges ærmet på hånden, som bliver klippet af i en
snorlig linje ved billedets kant. Ærmet skal nå UD AF billedet i
begge de formater filmen findes i, ellers står der en afskåret
firkant midt i billedet.

Det brede format (1920×1080) sætter hånden med overkanten i 525,5
og skalerer med 0,78. Ærmet skulle nå til 1110 i scenens
koordinater, altså række (1110−525,5)/0,78 ≈ 750, og 800 gav luft
til vippen.

DET HØJE FORMAT (1080×1350) KRÆVER MERE, og det var 800 ikke nok
til: dér står hånden med overkanten i 633,3 og skalerer med 1,05,
og til sidst zoomer kameraet ud til 0,60 om et drejepunkt i 34% af
højden. Regnestykket bagfra:

  459 + (633,3 + 1,05·A − 40 − 459) · 0,60  ≥  1350 + 40
                                        A   ≥  1350

Med 800 endte ærmet i y≈1031 af 1350 – en snorlig kant hen over
bordet, tydeligt som en fejl. 1400 giver plads plus luft.

Det gør ikke det brede format værre, tværtimod: dér gik ærmet
tidligere kun 20 px ud over kanten, nu 329.
"""

import os
import sys

from PIL import Image, ImageChops, ImageFilter

HER = os.path.dirname(__file__)
RAA = os.path.join(HER, '..', 'assets', 'raa')
UD = os.path.join(HER, '..', 'assets')

# Hvor mange gange farven trækkes udad. Kanten er 10-20 px, og
# hver runde flytter den én pixel – 22 dækker den bredeste.
RUNDER = 22

# Hvor langt ind fra kanten der ledes efter himmel. Randen er
# højst 6 px, men alfakanalens egen bløde rampe ligger uden om
# den, så der skal måles et stykke ind.
KANTBAAND = 12

# Hvor meget konturen jævnes ud, pr. fil. Se punkt 3 i toppen.
GLAT = { 'cone-hand.png': 8.0 }
GLAT_STANDARD = 12.0

# Blå kanal minus rød. Over dette regnes pixlen som himmel.
# Isen ligger på +39 til +48 (varm). Himlen ligger omkring nul
# eller derunder. 2 rammer imellem med god afstand til begge, og
# holder samtidig fingrene fra det hvide serviet-papir på keglen,
# hvor de to kanaler er lige store.
HIMMEL_GRAENSE = 2

AERME_HOEJDE = 1400  # se regnestykket i toppen
AERME_STRIBE = 10    # rækker der strækkes


def traek_farven_udad(im):
    """Giver de gennemsigtige pixels farve fra deres dækkende naboer.

    Uden dette sidder fotoets lyse baggrund stadig i kanten, og den
    kommer frem så snart kanten bliver skarp eller billedet
    skaleres op."""
    r, g, b, a = im.split()

    # Farven, men kun der hvor der er noget. Alt andet sættes til
    # sort, så det ikke trækker gennemsnittet med sig.
    daekker = a.point(lambda v: 255 if v > 200 else 0)
    farve = Image.merge('RGB', (r, g, b))
    farve.paste((0, 0, 0), (0, 0), daekker.point(lambda v: 255 - v))

    kendt = daekker
    for _ in range(RUNDER):
        # Ét skridt udad: max-filter breder både farven og
        # "her er der noget"-masken én pixel ud
        bredere_farve = farve.filter(ImageFilter.MaxFilter(3))
        bredere_kendt = kendt.filter(ImageFilter.MaxFilter(3))

        # Kun DE NYE pixels udfyldes. Ellers ville is-farven
        # langsomt blive lysere indefra og ud.
        nye = Image.eval(bredere_kendt, lambda v: v)
        nye.paste(0, (0, 0), kendt)
        farve.paste(bredere_farve, (0, 0), nye)
        kendt = bredere_kendt

    nr, ng, nb = farve.split()
    return Image.merge('RGBA', (nr, ng, nb, a))


def fjern_himlen(im):
    """Fjerner de kolde pixels i kantbåndet.

    Det er dem der er baggrund fra fotoet: klipperen har taget en
    smule for meget med, og de yderste par pixel er derfor bleg blå
    himmel i fuld dækning. Is, vaffel og hud er varme – rød kanal
    højere end blå – så de kan skilles fra hinanden på farve alene
    i stedet for at gætte en bredde at krympe med."""
    r, g, b, a = im.split()

    faste = a.point(lambda v: 255 if v > 200 else 0)
    indre = faste
    for _ in range(KANTBAAND):
        indre = indre.filter(ImageFilter.MinFilter(3))
    baand = ImageChops.subtract(faste, indre)      # kun de yderste 12 px

    # blaa - roed + 8, så der er plads til negative værdier
    forskel = ImageChops.subtract(b, r, 1, 8)
    kold = forskel.point(lambda v: 255 if v >= 8 + HIMMEL_GRAENSE else 0)

    fjern = ImageChops.multiply(kold, baand)
    return Image.merge('RGBA', (r, g, b, ImageChops.subtract(a, fjern)))


def form_konturen(im, radius):
    """Gør kanten skarp og konturen jævn – med en RUND sløring.

    Sløring og tærskel er en isotrop udjævning: den flytter grænsen
    til det sted hvor halvdelen af naboerne er dækket, og den kan
    ikke afhugge et hjørne til en facet, sådan som gentagne
    firkantede min- og maxfiltre gør.

    Kanten er HÅRD når denne er færdig. Blødheden lægges på til
    sidst af blød_kanten(), og der er en grund til at de to er
    skilt: se rækkefølgen i main()."""
    a = im.getchannel('A')
    a = a.filter(ImageFilter.GaussianBlur(radius))
    a = a.point(lambda v: 255 if v >= 128 else 0)

    r, g, b, _ = im.split()
    return Image.merge('RGBA', (r, g, b, a))


def bloed_kanten(im, radius=1.1):
    """En blød overgang på godt en pixel. En helt hård kant trapper
    synligt når kuglen roterer og skaleres."""
    r, g, b, a = im.split()
    return Image.merge('RGBA', (r, g, b, a.filter(ImageFilter.GaussianBlur(radius))))


def sidste_faste_raekke(im):
    """Nederste række hvor ærmet stadig er helt dækkende.

    Det er IKKE det samme som nederste række med noget i. De sidste
    sytten rækker af udklippet er en lodret udtoning: alfa falder
    fra 250 til 134, fordi der er visket blødt langs kanten. Strakte
    man dem, blev det forlængede ærme en halvgennemsigtig stribe
    med en synlig streg hvor den begyndte – og det så værre ud end
    den snorlige kant vi ville af med."""
    a = im.getchannel('A')
    ap = a.load()
    bredest = 0
    faste = []
    for y in range(im.height):
        n = sum(1 for x in range(im.width) if ap[x, y] > 250)
        faste.append(n)
        bredest = max(bredest, n)
    graense = bredest * 0.3
    for y in range(im.height - 1, -1, -1):
        if faste[y] >= graense:
            return y + 1
    return im.height


def forlaeng_aermet(im):
    """Strækker de nederste faste rækker, så ærmet går ud af
    billedet i stedet for at stoppe i en snorlig linje.

    EN RÅ STRÆKNING DUR IKKE, og det viste sig først da højformatet
    kom til. Ti rækker af et stribet ærme strakt over 800 pixel
    bliver en snorlig, knivskarp søjle med præcis parallelle
    lodrette striber – i det brede format lå den uden for billedet,
    men i det høje står den midt ned gennem rammen og ser ud som
    det den er: et billede der er trukket i.

    Tre ting gør den til en arm i stedet:

      SMALNER. Et ærme der går væk fra kameraet bliver smallere.
      Forlængelsen trækkes sammen til 86% af bredden nedefter, så
      siderne ikke er parallelle.

      MØRKERE. Lyset falder på vej ned i ærmet. Nederst er den nede
      på 68%, og det fjerner samtidig det meste af det stribede: en
      stribe man ikke kan se er ikke en stribe.

      BLØDERE. Armen er nærmere kameraet end isen, og det der er
      nærmere end fokus er uskarpt. Sløringen vokser nedefter.
    """
    bredde, hoejde = im.size
    if hoejde >= AERME_HOEJDE:
        return im

    bund = sidste_faste_raekke(im)
    laengde = AERME_HOEJDE - bund

    stribe = im.crop((0, bund - AERME_STRIBE, bredde, bund))
    hale = stribe.resize((bredde, laengde), Image.BILINEAR)

    # Mørkere og blødere nedefter. Rækkevis, for det er en gradient
    # langs én akse og der er ingen grund til at gøre det snedigt.
    px = hale.load()
    for y in range(laengde):
        f = y / max(1, laengde - 1)
        lys = 1.0 - 0.32 * f
        for x in range(bredde):
            r, g, b, a = px[x, y]
            px[x, y] = (int(r * lys), int(g * lys), int(b * lys), a)
    hale = hale.filter(ImageFilter.GaussianBlur(2.2))

    # Smalner. Hver række skaleres for sig, så kanten bliver en
    # blød kile og ikke et trin.
    kile = Image.new('RGBA', (bredde, laengde), (0, 0, 0, 0))
    for y in range(laengde):
        f = y / max(1, laengde - 1)
        w = max(2, int(round(bredde * (1.0 - 0.14 * f))))
        raekke = hale.crop((0, y, bredde, y + 1)).resize((w, 1), Image.BILINEAR)
        kile.paste(raekke, ((bredde - w) // 2, y))

    ny = Image.new('RGBA', (bredde, AERME_HOEJDE), (0, 0, 0, 0))
    ny.paste(im.crop((0, 0, bredde, bund)), (0, 0))
    ny.paste(kile, (0, bund))
    return ny


def kant_farve(im):
    """Gennemsnitsfarven i de halvgennemsigtige pixels. Bruges kun
    til at skrive et tal ud, så man kan se at det virkede."""
    a = im.getchannel('A')
    px, ap = im.load(), a.load()
    sum_r = sum_g = sum_b = n = 0
    for y in range(im.height):
        for x in range(im.width):
            if 20 < ap[x, y] < 235:
                p = px[x, y]
                sum_r += p[0]; sum_g += p[1]; sum_b += p[2]; n += 1
    if not n:
        return None
    return (round(sum_r / n), round(sum_g / n), round(sum_b / n))


def main():
    if not os.path.isdir(RAA):
        print(f'Fandt ikke {RAA}. Råfilerne skal ligge der.', file=sys.stderr)
        return 1

    for navn in sorted(os.listdir(RAA)):
        if not navn.endswith('.png'):
            continue
        raa = Image.open(os.path.join(RAA, navn)).convert('RGBA')
        foer = kant_farve(raa)

        ud = traek_farven_udad(raa)
        ud = fjern_himlen(ud)
        # Ærmet forlænges FØR konturen formes. Gjorde man det
        # bagefter, ville de rækker der strækkes allerede være
        # behandlet, og så blev det forlængede ærme en halvgennem-
        # sigtig stribe med en synlig streg hvor den begyndte.
        if navn == 'cone-hand.png':
            ud = forlaeng_aermet(ud)
        ud = form_konturen(ud, GLAT.get(navn, GLAT_STANDARD))

        # HIMLEN FJERNES IGEN, og det er ikke en dobbeltsikring.
        #
        # form_konturen slører alfakanalen med radius 12 og sætter
        # tærsklen bagefter. De kolde pixels der blev skåret væk
        # ovenfor, sidder 1-5 px inde fra kanten – altså langt inden
        # for 12 – så sløringen vaskede dem lige tilbage igen, og den
        # øverste kugle havde en tydelig blå kant i det færdige
        # billede. Det så man først i højformatet, hvor kuglerne er
        # 35% større.
        #
        # Rækkefølgen er derfor: form konturen HÅRDT, bid så de kolde
        # pixels ud af den færdige silhuet, og læg til sidst den ene
        # pixel blødhed på. Den er for lille til at kunne trække en
        # skal på 5 px tilbage.
        ud = fjern_himlen(ud)
        ud = bloed_kanten(ud)

        sti = os.path.join(UD, navn)
        ud.save(sti, optimize=True)
        efter = kant_farve(ud)
        print(f'{navn}: kant rgb{foer} → rgb{efter}, '
              f'{ud.size[0]}×{ud.size[1]}, {round(os.path.getsize(sti) / 1024)} kB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
