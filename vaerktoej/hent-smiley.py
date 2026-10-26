#!/usr/bin/env python3
# ============================================================
#  HENT DEN RIGTIGE SMILEY FRA FØDEVARESTYRELSEN  (25/10)
#  ------------------------------------------------------------
#  Mikkel: *"smiley'en kan du selv finde"* — de rigtige ikoner og
#  logoer øverst på forsiden.
#
#  Kører i udgivelsen (.github/workflows/deploy.yml), IKKE i browseren:
#  Fødevarestyrelsens API sender ingen CORS-headere, så en side kan ikke
#  spørge selv. Byggeserveren kan. Skriptet
#    1. slår Mosedes seneste kontrol op (findsmiley-id 1480560)
#    2. henter Fødevarestyrelsens EGEN smiley-tegning for det resultat
#       (glad / mellem / sur) til billeder/smiley-officiel.svg
#    3. bytter sidens tegnede smiley ud med den — øverst på forsiden og
#       i bunden af hver side — men kun i KOPIEN på byggeserveren
#
#  ⚠️ DET MÅ ALDRIG STOPPE EN UDGIVELSE. Svarer Fødevarestyrelsen ikke,
#     er svaret mærkeligt, eller er filen ikke en SVG, står den tegnede
#     smiley, som den altid har stået, og skriptet slutter med 0.
#
#  ⚠️ OG DET ER IKKE EN EFTERLIGNING. Den tegnede smiley stod, fordi et
#     hjemmelavet myndighedsmærke er værre end et tegn. Her er det
#     myndighedens egen fil, for virksomhedens eget seneste resultat —
#     og den følger med ved næste udgivelse, når resultatet skifter.
#
#  Prøv det lokalt uden net: python3 vaerktoej/hent-smiley.py --proev
# ============================================================
import json, os, re, sys, glob, urllib.request
from datetime import datetime

FINDSMILEY_ID = '1480560'
MODUL = 'de41d447-c77d-4fb8-9c7a-a6522c3f7827'   # findsmiley.dk's egen, offentlige
OFFICIEL = ('https://appsmiley.gold.extension.gopublic.dk/api/v1/virksomhedskontroller/'
            + FINDSMILEY_ID + '?module_id=' + MODUL)
# Reserve, hvis Fødevarestyrelsens svar skifter form: en åben tjeneste,
# der læser det samme API og giver adressen på det officielle ikon direkte.
RESERVE = 'https://smiley.nembestil.dev/?id=' + FINDSMILEY_ID
IKONMAPPE = 'https://cdn2.gopublic.dk/fvstfindsmiley/Media/639138261108180820/'
IKON = {1: 'smiley_glad.svg', 3: 'smiley_mellem.svg', 4: 'smiley_sur.svg'}
NAVN = {1: 'glad smiley', 3: 'smiley med lige mund', 4: 'sur smiley'}
TILLADTE_VAERTER = ('cdn2.gopublic.dk', 'www.findsmiley.dk', 'findsmiley.dk')
UD = 'billeder/smiley-officiel.svg'

TOP = re.compile(r'(<a class="smiley-kort glasraekke rev" href="https://www\.findsmiley\.dk[^"]*"[^>]*>'
                 r'<span class="gr-tegn" aria-hidden="true">)<svg class="ny-maerke-ill".*?</svg>', re.S)
BUND = re.compile(r'(<a class="smiley-linje" href="https://www\.findsmiley\.dk[^"]*"[^>]*>)'
                  r'<svg class="fod-ill".*?</svg>', re.S)


def hent(url, maks=400_000):
    req = urllib.request.Request(url, headers={'User-Agent': 'mosedehavnecafe.dk-udgivelse'})
    with urllib.request.urlopen(req, timeout=20) as svar:
        return svar.read(maks + 1)


def dato(v):
    s = str(v or '')[:19]
    for f in ('%Y-%m-%dT%H:%M:%S', '%Y-%m-%d', '%d-%m-%Y %H:%M:%S', '%d-%m-%Y'):
        try:
            return datetime.strptime(s[:len(datetime.now().strftime(f))], f)
        except ValueError:
            pass
    return None


def kode(v):
    """smileyIkonResultat kan være et tal, en tekst med et tal, eller et filnavn."""
    if isinstance(v, (int, float)):
        return int(v)
    s = str(v or '').lower()
    if 'glad' in s:
        return 1
    if 'mellem' in s:
        return 3
    if 'sur' in s:
        return 4
    m = re.fullmatch(r'\s*(\d)\s*', s)
    return int(m.group(1)) if m else None


def kontroller(o):
    """Alle kontroller i svaret, uanset hvor dybt de ligger."""
    if isinstance(o, dict):
        if 'kontroldato' in o and 'smileyIkonResultat' in o:
            yield o
        for v in o.values():
            yield from kontroller(v)
    elif isinstance(o, list):
        for v in o:
            yield from kontroller(v)


def seneste_officielt(svar):
    ks = [(dato(k.get('kontroldato')), kode(k.get('smileyIkonResultat'))) for k in kontroller(svar)]
    ks = [k for k in ks if k[0] and k[1]]
    if not ks:
        return None, None
    d, r = max(ks, key=lambda x: x[0])
    return r, d


def find_ikon(hent_json):
    """→ (ikonets adresse, resultat, dato) eller (None, None, None)."""
    resultat, dag = None, None
    try:
        resultat, dag = seneste_officielt(hent_json(OFFICIEL))
        print(f'smiley: Fødevarestyrelsen siger {resultat} ({dag:%d-%m-%Y})' if resultat
              else 'smiley: Fødevarestyrelsens svar havde ingen kontrol, jeg kunne læse')
    except Exception as e:
        print(f'smiley: Fødevarestyrelsen svarede ikke ({e})')
    if resultat in IKON:
        return IKONMAPPE + IKON[resultat], resultat, dag
    try:
        r = hent_json(RESERVE)
        url, res = r.get('PNG_1'), kode(r.get('seneste_kontrol'))
        if url and res in IKON:
            print(f'smiley: reserven siger {res}')
            return url, res, dato(r.get('seneste_kontrol_dato'))
    except Exception as e:
        print(f'smiley: reserven svarede heller ikke ({e})')
    return None, None, None


def er_svg(b):
    t = b[:2000].decode('utf-8', 'ignore').lower()
    return ('<svg' in t) and ('<script' not in b.decode('utf-8', 'ignore').lower()) and len(b) < 400_000


def byt_ud(rod, resultat):
    alt = NAVN.get(resultat, 'smiley')
    img_top = (f'<img class="ny-maerke-ill smiley-officiel" src="billeder/smiley-officiel.svg" '
               f'width="48" height="48" alt="" decoding="async">')
    antal = 0
    for f in sorted(glob.glob(os.path.join(rod, '*.html')) + glob.glob(os.path.join(rod, '*', 'index.html'))):
        s = open(f, encoding='utf-8').read()
        dybde = os.path.relpath(f, rod).count(os.sep)
        sti = '../' * dybde + 'billeder/smiley-officiel.svg'
        ny, n1 = TOP.subn(lambda m: m.group(1) + img_top.replace('billeder/smiley-officiel.svg', sti), s)
        ny, n2 = BUND.subn(lambda m: m.group(1) + (
            f'<img class="fod-ill smiley-officiel" src="{sti}" width="48" height="48" '
            f'alt="{alt} fra Fødevarestyrelsen" decoding="async">'), ny)
        if n1 or n2:
            open(f, 'w', encoding='utf-8').write(ny)
            antal += n1 + n2
    return antal


def kør(rod='.', hent_json=None, hent_fil=None):
    hent_json = hent_json or (lambda u: json.loads(hent(u)))
    hent_fil = hent_fil or hent
    url, resultat, _ = find_ikon(hent_json)
    if not url:
        print('smiley: ingen smiley fundet — den tegnede bliver stående')
        return 0
    vaert = re.sub(r'^https://([^/]+)/.*$', r'\1', url)
    if vaert not in TILLADTE_VAERTER:
        print(f'smiley: ikonet ligger et sted, jeg ikke kender ({vaert}) — den tegnede bliver stående')
        return 0
    try:
        b = hent_fil(url)
    except Exception as e:
        print(f'smiley: kunne ikke hente ikonet ({e}) — den tegnede bliver stående')
        return 0
    if not er_svg(b):
        print('smiley: ikonet var ikke en ren SVG — den tegnede bliver stående')
        return 0
    os.makedirs(os.path.join(rod, 'billeder'), exist_ok=True)
    open(os.path.join(rod, UD), 'wb').write(b)
    n = byt_ud(rod, resultat)
    print(f'smiley: {NAVN[resultat]} sat ind {n} steder')
    return n


if __name__ == '__main__':
    if '--proev' in sys.argv:
        import tempfile, shutil
        tmp = tempfile.mkdtemp()
        try:
            for f in glob.glob('*.html') + glob.glob('*/index.html'):
                os.makedirs(os.path.join(tmp, os.path.dirname(f)), exist_ok=True)
                shutil.copy(f, os.path.join(tmp, f))
            falsk = {'virksomhed': {'kontroller': [
                {'kontroldato': '2025-05-15T00:00:00', 'smileyIkonResultat': 1},
                {'kontroldato': '2026-02-26T00:00:00', 'smileyIkonResultat': 1}]}}
            svg = b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20"/></svg>'
            n = kør(tmp, hent_json=lambda u: falsk, hent_fil=lambda u: svg)
            print('PRØVE:', 'BESTOD' if n == 15 else f'FEJLEDE ({n} steder, forventede 15)')
        finally:
            shutil.rmtree(tmp)
        sys.exit(0)
    try:
        kør('.')
    except Exception as e:   # aldrig stoppe en udgivelse
        print(f'smiley: uventet fejl ({e}) — den tegnede bliver stående')
    sys.exit(0)
