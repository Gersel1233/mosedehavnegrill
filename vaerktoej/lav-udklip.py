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

2) KANTEN GØRES SKARP. Alfakanalen strammes, så den bløde rampe
   bliver en kant på et par pixel. Gjorde man kun det – uden 1 –
   ville den lyse ring blive skarp i stedet for at forsvinde.

3) SILHUETTEN TRÆKKES IND. Der er klippet en smule uden om
   kuglerne, så de yderste par pixel er himmel fra fotoet – helt
   dækkende, så trin 1 rører dem ikke. Formen krymper derfor fire
   pixel hele vejen rundt. Det koster en procent af en kugle og
   fjerner den blågrå rand.

Til sidst forlænges ærmet på hånden, som bliver klippet af i en
snorlig linje ved billedets kant. Filmen sætter hånden med
overkanten i 525,5 og skalerer med 0,78, så ærmet skal nå til
mindst 1110 i scenens koordinater for at kameraet ikke kan løfte
det fri af de 1080 der er billede: række (1110-525,5)/0,78 ≈ 750.
Med luft til at stakken også vipper: 800.
"""

import os
import sys

from PIL import Image, ImageFilter

HER = os.path.dirname(__file__)
RAA = os.path.join(HER, '..', 'assets', 'raa')
UD = os.path.join(HER, '..', 'assets')

# Kanten: under dette regnes en pixel som luft, over som is.
# Rampen imellem er den bløde kant, og den bliver strammet hertil.
LAV, HOEJ = 0.42, 0.66

# Hvor mange gange farven trækkes udad. Kanten er 10-20 px, og
# hver runde flytter den én pixel – 22 dækker den bredeste.
RUNDER = 22

# Hvor mange pixel silhuetten trækkes ind. Randen af himmel er
# 3-6 px på de bredeste steder.
KRYMP = 4

AERME_HOEJDE = 800   # se regnestykket i toppen
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


def stram_kanten(im):
    """Gør den bløde kant skarp og trækker silhuetten lidt ind.

    Rækkefølgen: stram først, krymp så. Krympede man den bløde
    rampe, ville man bare flytte tågen, ikke fjerne den.

    Der sløres en halv pixel til sidst: en helt hård kant ville
    trappe synligt når kuglen roterer og skaleres i filmen."""
    a = im.getchannel('A')
    lav, hoej = LAV * 255, HOEJ * 255
    a = a.point(lambda v: 0 if v <= lav else (255 if v >= hoej else
                                             int(round((v - lav) / (hoej - lav) * 255))))
    for _ in range(KRYMP):
        a = a.filter(ImageFilter.MinFilter(3))
    a = a.filter(ImageFilter.GaussianBlur(0.6))
    r, g, b, _ = im.split()
    return Image.merge('RGBA', (r, g, b, a))


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
    billedet i stedet for at stoppe i en snorlig linje."""
    bredde, hoejde = im.size
    if hoejde >= AERME_HOEJDE:
        return im

    bund = sidste_faste_raekke(im)

    ny = Image.new('RGBA', (bredde, AERME_HOEJDE), (0, 0, 0, 0))
    ny.paste(im.crop((0, 0, bredde, bund)), (0, 0))
    stribe = im.crop((0, bund - AERME_STRIBE, bredde, bund))
    ny.paste(stribe.resize((bredde, AERME_HOEJDE - bund), Image.BILINEAR), (0, bund))
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
        # Ærmet forlænges FØR kanten strammes. Gjorde man det
        # bagefter, ville de rækker der strækkes allerede være
        # krympet, og så blev det forlængede ærme en halvgennem-
        # sigtig stribe med en synlig streg hvor den begyndte.
        if navn == 'cone-hand.png':
            ud = forlaeng_aermet(ud)
        ud = stram_kanten(ud)

        sti = os.path.join(UD, navn)
        ud.save(sti, optimize=True)
        efter = kant_farve(ud)
        print(f'{navn}: kant rgb{foer} → rgb{efter}, '
              f'{ud.size[0]}×{ud.size[1]}, {round(os.path.getsize(sti) / 1024)} kB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
