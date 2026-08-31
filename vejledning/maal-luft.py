import sys, pypdfium2 as pdfium
from PIL import Image
pdf = sys.argv[1]
d = pdfium.PdfDocument(pdf)
tot = 0
print(f'{len(d)} sider')
for i in range(len(d)):
    im = d[i].render(scale=1.0).to_pil().convert('L')
    w, h = im.size
    px = im.load()
    # Find nederste raekke med blaek (spring sidefoden over: nederste 6%)
    grænse = int(h * 0.94)
    sidste = 0
    for y in range(grænse - 1, -1, -1):
        raekke = [px[x, y] for x in range(0, w, 3)]
        if min(raekke) < 235:          # noget moerkere end papiret
            sidste = y; break
    luft = grænse - sidste
    tot += luft
    print(f'  side {i+1}: indhold slutter {sidste}px af {grænse}px  ->  {luft}px tom  ({luft/grænse*100:.0f} %)')
print(f'  I ALT spildt: {tot}px  (~{tot/ (int(842*0.94)) :.1f} sider)')
