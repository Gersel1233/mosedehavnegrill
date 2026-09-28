# ============================================================
#  TAPASFADETS TEGNINGER  (28/9)
# ------------------------------------------------------------
#  Mikkels ord: *"tapas-delen ligner også noget generisk med de
#  små bølger"* — han valgte forslag 10: hver ting på fadet med
#  sin egen røde tegning.
#
#  Arket er tegnet i Higgsfield (GPT Image 2.5, gennemsigtig
#  baggrund, 4 × 4), job 49f48e0c. Arket ligger ikke i repoet
#  (2048 × 2048, flere MB) — giv stien med:
#
#    python3 vaerktoej/lav-tapastegn.py ark.png
#
#  ⚠️ BLÆK, IKKE ET BILLEDE AF BLÆK. Arket har hvide flader inde
#  i tegningerne (ostens snitflade, skålenes kant). Stod de hvide,
#  lå der hvide pletter på det creme papir. Her bliver hvidt til
#  gennemsigtigt og stregen til husets røde (#D62A3A), så
#  tegningen står som tryk på hvilken som helst flade.
#
#  128 × 128 px, WebP 80: vist i 44 px, og en iPhone tegner tre
#  pixels pr. punkt (132). 144/90 gav 217 kB for de 16 — skraveringen
#  er dyr at pakke, og forskellen kan ikke ses i 44 px.
# ============================================================
import sys
import numpy as np
from PIL import Image

ark = sys.argv[1] if len(sys.argv) > 1 else sys.exit('giv arket med')
NAVNE = ['ost', 'chorizo', 'skinke', 'pate', 'lakserilette', 'hummus', 'pesto', 'oliven',
         'cornichoner', 'frugt', 'broed', 'groent', 'dip', 'smoer', 'fad', 'baguette']
ROD = 'billeder/tapas-tegn/'
RØD = (0xD6, 0x2A, 0x3A)

a = np.asarray(Image.open(ark).convert('RGBA')).astype(np.float32) / 255
lys = a[..., :3].mean(axis=2)
blaek = np.clip((1.0 - lys) / 0.55, 0, 1) * a[..., 3]
c = blaek.shape[1] // 4

for i, navn in enumerate(NAVNE):
    r, k = divmod(i, 4)
    cel = blaek[r * c:(r + 1) * c, k * c:(k + 1) * c].copy()
    # Kun tegningens egen blok: den største sammenhængende række af
    # søjler og rækker med blæk. En stump af naboens tegning ude i
    # kanten (målt ved smørret) kommer ellers med i udsnittet.
    # Huller under 8 % af cellen lukkes først — dip-skålene er to
    # skåle med luft imellem, og de hører sammen.
    for akse in (0, 1):
        med = (cel > 0.08).sum(axis=akse) > 2
        lob, start = [], None
        for j, v in enumerate(list(med) + [False]):
            if v and start is None: start = j
            if not v and start is not None:
                lob.append([start, j]); start = None
        flet = [lob[0]]
        for a0, a1 in lob[1:]:
            if a0 - flet[-1][1] < c * 0.08: flet[-1][1] = a1
            else: flet.append([a0, a1])
        s0, s1 = max(flet, key=lambda x: x[1] - x[0])
        if akse == 0: cel[:, :s0] = 0; cel[:, s1:] = 0
        else: cel[:s0, :] = 0; cel[s1:, :] = 0
    ys, xs = np.where(cel > 0.08)
    side = max(ys.max() - ys.min(), xs.max() - xs.min())
    halv = side // 2 + int(side * 0.06)
    cy, cx = (ys.min() + ys.max()) // 2, (xs.min() + xs.max()) // 2
    ud = np.zeros((2 * halv, 2 * halv), dtype=np.float32)
    for yy in range(2 * halv):
        sy = cy - halv + yy
        if 0 <= sy < c:
            xa, xb = max(0, cx - halv), min(c, cx + halv)
            ud[yy, xa - (cx - halv):xb - (cx - halv)] = cel[sy, xa:xb]
    rgba = np.zeros((2 * halv, 2 * halv, 4), dtype=np.uint8)
    rgba[..., :3] = RØD
    rgba[..., 3] = (ud * 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').resize((128, 128), Image.LANCZOS) \
        .save(ROD + navn + '.webp', 'WEBP', quality=80, method=6)
    print(ROD + navn + '.webp')
