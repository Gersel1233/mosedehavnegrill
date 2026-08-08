#!/usr/bin/env python3
"""Gør kundens fotos klar til web.

    python3 vaerktoej/lav-fotos.py

Læser de ubearbejdede kamerafiler i original/ og skriver de
webklare til billeder/. Kør den igen så tit du vil – originalerne
bliver ikke rørt.

Originalerne er 8 MB og 3072×5504 pixels. De er IKKE i repoet
(se .gitignore); de ligger i git-historikken på commit c05b208.
Mangler mappen, laver den ingenting og siger det.

------------------------------------------------------------------
TRE TING DER BETYDER NOGET
------------------------------------------------------------------
1) HØJDEN BLIVER BESKÅRET. To af billederne er portrætter på
   3072×5504, altså næsten dobbelt så høje som brede. Siden viser
   dem i felter der er 620-640 px høje og bredere end de er høje.
   Browseren hentede derfor 2150 rækker og smed de fleste væk:
   342 kB for et billede hvor man så en tredjedel.

   De beskæres nu til 3:4, centreret om motivet – kagerne på
   bordet, trædækket med parasollerne. Det er stadig portræt nok
   til en telefon, og der er ikke længere noget der hentes for at
   blive kasseret.

2) EXIF BLIVER SMIDT VÆK. Kamerafilerne indeholder GPS-position,
   oplysninger om apparatet og C2PA-signaturer. Det skal ikke
   ligge offentligt på en hjemmeside. Pillow tager kun de pixels
   den bliver bedt om, så metadataen forsvinder af sig selv – men
   det står her, for det er en bevidst egenskab og ikke et tilfælde.

3) KVALITET EFTER BRUG, PROGRESSIVE. 72 til kager og trædæk: en
   telefon med tre gange opløsning viser dem alligevel ved 1200 px
   i et felt på 390, og der er ingen der kan se forskellen på 72 og
   88 – filen er halvt så stor. Facaden får 68: den ligger i hero BAG et slør på
   56-68% og er samtidig det største billede siden henter først.
   Der er ingen der kan se en kompressionsfejl gennem det slør, og
   hver sparet kilobyte er en der er sparet FØR siden er brugbar.

   Progressive betyder at billedet kommer frem groft først og
   skarpt bagefter, i stedet for at male sig ned linje for linje.
"""

import os
import sys

from PIL import Image

HER = os.path.dirname(__file__)
IND = os.path.join(HER, '..', 'original')
UD = os.path.join(HER, '..', 'billeder')


# navn: (fil, beskæring, bredder, kvalitet)
#
# Beskæringen er (venstre, top, højre, bund) som brøkdele af
# billedet. Tallene er valgt efter motivet:
#
#   kager  – kagerne står i midterbåndet. 0,08-0,83 tager
#            havnen med foroven og voksdugen forneden, og
#            skærer den tomme himmel og forgrunden væk.
#   molen  – trædækket med borde og parasoller ligger i den
#            øverste to tredjedele. Forneden er der kun planker.
#   facade – ligger allerede på tværs og skal ikke beskæres.
FOTOS = {
    'kager': ('15a45d0c-7bca-4b29-9bfb-fdad8a4c9325.jpg',
              (0.0, 0.08, 1.0, 0.83), [1200, 700], 72),
    'molen': ('30af03ba-26ce-4bb7-b5cc-364a21c69470.jpg',
              (0.0, 0.06, 1.0, 0.81), [1200, 700], 72),
    'facade': ('a8ac1bee-af70-46d0-b380-a1dad2d19ac7 (1).jpg',
               None, [2400, 1400, 800], 68),
}


def main():
    if not os.path.isdir(IND):
        print(f'Fandt ikke {IND}. Kamerafilerne ligger i git-historikken '
              f'på commit c05b208.', file=sys.stderr)
        return 1

    for navn, (fil, beskaer, bredder, kvalitet) in FOTOS.items():
        sti = os.path.join(IND, fil)
        if not os.path.exists(sti):
            print(f'{navn}: mangler {fil} – sprunget over')
            continue

        im = Image.open(sti).convert('RGB')
        if beskaer:
            v, t, h, b = beskaer
            im = im.crop((int(v * im.width), int(t * im.height),
                          int(h * im.width), int(b * im.height)))

        for bredde in bredder:
            hoejde = round(bredde * im.height / im.width)
            # Lanczos: den bedste af Pillows nedskaleringer til fotos
            lille = im.resize((bredde, hoejde), Image.LANCZOS)
            ud = os.path.join(UD, f'{navn}-{bredde}.jpg')
            lille.save(ud, 'JPEG', quality=kvalitet, optimize=True, progressive=True)
            print(f'{navn}-{bredde}.jpg  {bredde}×{hoejde}  '
                  f'{round(os.path.getsize(ud) / 1024)} kB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
