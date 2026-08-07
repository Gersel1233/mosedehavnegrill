#!/usr/bin/env python3
"""Forlænger ærmet på assets/cone-hand.png.

HVORFOR: udklippet af hånden med keglen slutter brat. Ærmet bliver
klippet af i en snorlige vandret linje – række 697, hele vejen fra
x=25 til x=548 – fordi det gik ud over kanten på det foto det er
klippet ud af.

I filmen er det et problem i knap to sekunder. Hånden er sat så
dens underkant lander præcis ved billedets bund, men når kameraet
zoomer ud, omkring 5 til 7 sekunder inde, løftes den 20-25 pixel
op. Så kommer den snorlige kant til syne, og billedet ser ud som
det det er: et udklip lagt oven på noget andet.

REGNESTYKKET: filmen sætter hånden med overkanten i 525,5 og
skalerer med 0,78. Ærmet skal nå ned til mindst 1110 i scenens
koordinater, for at kameraet ikke kan løfte det fri af de 1080 der
er billede. Det svarer til række (1110-525,5)/0,78 ≈ 750. Med lidt
luft til at stakken også vipper en smule: 800.

HVAD DEN GØR: strækker de nederste ti rækker af ærmet ned til den
højde. Ærmet er lodret og næsten ensfarvet dernede, så det ligner
et ærme der fortsætter ud af billedet – hvilket er præcis hvad det
skal.

Kør: python3 vaerktoej/forlaeng-aerme.py

Den kan køres igen uden at gøre skade: er billedet allerede højt
nok, laver den ingenting. Kundens original ligger i git-historien
(commit 3b17a2a).
"""

import os
import sys

from PIL import Image

STI = os.path.join(os.path.dirname(__file__), '..', 'assets', 'cone-hand.png')
MAAL_HOEJDE = 800   # se regnestykket ovenfor
STRIBE = 10         # rækker der strækkes


def main():
    billede = Image.open(STI).convert('RGBA')
    bredde, hoejde = billede.size

    if hoejde >= MAAL_HOEJDE:
        print(f'Billedet er allerede {bredde}×{hoejde}, '
              f'og målet er {MAAL_HOEJDE}. Gør ingenting.')
        return 0

    kasse = billede.getbbox()
    bund = kasse[3] if kasse else hoejde     # nederste række med noget i

    ny = Image.new('RGBA', (bredde, MAAL_HOEJDE), (0, 0, 0, 0))
    ny.paste(billede.crop((0, 0, bredde, bund)), (0, 0))

    stribe = billede.crop((0, bund - STRIBE, bredde, bund))
    ny.paste(stribe.resize((bredde, MAAL_HOEJDE - bund), Image.BILINEAR), (0, bund))

    ny.save(STI, optimize=True)
    print(f'{bredde}×{hoejde} → {bredde}×{MAAL_HOEJDE} '
          f'(ærmet strakt fra række {bund}), '
          f'{round(os.path.getsize(STI) / 1024)} kB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
