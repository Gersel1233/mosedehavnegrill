#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Holder de SYV TRYKTE KORT op mod databasen — post for post.

   Kundens ord (3/9): *"kan du give mig de endelige menukort og priser,
   så jeg kan give dem til Claude Code?"*

   ⚠️ KORTENE ER FACITLISTEN, DATABASEN ER SYSTEMET, og de to skal
   sige det samme. Et kort, der er trykt med 189, mens databasen
   siger 179, er ikke en skæv oplysning — det er en gæst, der har
   set en pris, og en kasse, der siger noget andet.

   Filen SKRIVER INGENTING. Den læser kortene af vaerktoej/kortene.py
   og databasen af den fil, hent-menukort.sh har hentet, og siger
   hvor de er uenige. Tre slags svar:

     A · priser, der ikke passer
     B · varer i databasen, som intet kort viser
     C · påstande på kortene, der ikke er varer

   BRUG:  vaerktoej/hent-menukort.sh          (henter databasen)
          vaerktoej/sammenlign-kort.py        (skriver rapporten)
"""
import json, os, sys, datetime

# ⚠️ INGEN .pyc. Python gemmer en oversat udgave af kortene.py i
# __pycache__ og genbruger den, hvis mtime OG STØRRELSE er uændret
# — og en prisrettelse fra 95 til 99 ændrer ingen af delene. MÅLT
# 3/9: rapporten sagde "ingen uenighed", mens filen på disken sagde
# 95 og 99. Det er husets egen regel om at måle virkeligheden, nu i
# Pythons forklædning.
sys.dont_write_bytecode = True

ROD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROD, 'vaerktoej'))
from kortene import KORT, PAASTANDE            # noqa: E402

KILDE = os.path.join(ROD, 'menukort', 'menukort.json')
if not os.path.exists(KILDE):
    sys.exit('Kør vaerktoej/hent-menukort.sh først — %s mangler.' % KILDE)

pakke = json.load(open(KILDE, encoding='utf-8'))
kat = {k['id']: k for k in pakke['kategorier']}
synlig = [v for v in pakke['varer']
          if v['aktiv'] and kat[v['kategori_id']]['aktiv']]
db = {}
for v in synlig:
    db.setdefault(v['navn'], []).append(v)

# Cateringens kategorier hører ikke på lugens kort — de sælges kun
# som selskab (mindst 10 personer). At de mangler er ikke et hul.
CATERING = {'Tapasfad', 'Platter', 'Sliders', 'Reception og pindemad',
            'Tilkøb ud af huset'}

# Kortene samler nogle kategorier i ÉN linje ("Æg, bacon, pålæg …
# 10,-"). Så er alle rækkerne dækket, selv om navnene ikke står.
SAMLET = {'Tilkøb morgenmad'}


def pris(v):
    p = v.get('pris')
    return None if p is None else float(p)


def main():
    paakort, a_fejl, ukendt = set(), [], []
    # ⚠️ SAMME VARE KAN STÅ PÅ TO KORT. Tartaren står både på
    # grillkortet og på smørrebrødskortet — og hvis de to siger
    # hver sit, opdager ingen det ved at holde ét kort op mod
    # databasen. Derfor samles hver vares priser PR. KORT først.
    pr_vare = {}

    for kortnavn, _, afsnit in KORT:
        for _, poster in afsnit:
            for navn, p_kort, _note, dbnavn in poster:
                if not dbnavn or dbnavn.startswith('SAMLELINJE'):
                    continue
                paakort.add(dbnavn)
                if p_kort not in (None, 0):
                    pr_vare.setdefault(dbnavn, []).append((kortnavn, navn, p_kort))
                raekker = db.get(dbnavn)
                if not raekker:
                    ukendt.append((kortnavn, navn, dbnavn))
                    continue
                p_db = pris(raekker[0])
                if p_kort is None or p_kort == 0:
                    continue          # "spørg" og "samme pris"
                if p_db is None or float(p_kort) != p_db:
                    a_fejl.append((kortnavn, navn, p_kort, p_db, dbnavn))

    print('SAMMENLIGNING AF DE SYV KORT MOD DATABASEN  ·  %s'
          % datetime.date.today().isoformat())
    print('=' * 62)
    print()
    print('A · PRISER, DER IKKE PASSER')
    if not a_fejl and not ukendt:
        print('   ingen')
    for kortnavn, navn, p_kort, p_db, dbnavn in a_fejl:
        print('   %-34s kort %-5s  db %-5s   [%s]'
              % (navn, '%g' % p_kort, '??' if p_db is None else '%g' % p_db, kortnavn))
    for kortnavn, navn, dbnavn in ukendt:
        print('   %-34s står IKKE i databasen som "%s"  [%s]'
              % (navn, dbnavn, kortnavn))

    print()
    print('A2 · KORT, DER SIGER HVER SIT OM DEN SAMME VARE')
    uenige = [(k, v) for k, v in sorted(pr_vare.items())
              if len({p for _, _, p in v}) > 1]
    if not uenige:
        print('   ingen')
    for dbnavn, rader in uenige:
        print('   %s:' % dbnavn)
        for kortnavn, navn, p in rader:
            print('        %-6s %-30s %s' % ('%g,-' % p, navn, kortnavn))

    print()
    print('B · VARER I DATABASEN, SOM INTET KORT VISER')
    huller = 0
    huller_liste = []
    for K in sorted(pakke['kategorier'], key=lambda a: a['sortering']):
        if not K['aktiv'] or K['navn'] in CATERING or K['navn'] in SAMLET:
            continue
        mangler = [v for v in synlig
                   if v['kategori_id'] == K['id'] and v['navn'] not in paakort]
        if not mangler:
            continue
        print('   ## %s' % K['navn'])
        for v in sorted(mangler, key=lambda a: (a['sortering'], a['id'])):
            p = pris(v)
            print('        %5s  %s' % ('??' if p is None else '%g' % p, v['navn']))
            huller_liste.append((K['navn'], v['navn'], p))
            huller += 1
    if not huller:
        print('   ingen')

    print()
    print('   (Cateringens kategorier og "Tilkøb morgenmad" er sprunget over')
    print('    med vilje — de hører ikke på lugens kort, eller de står som')
    print('    ÉN samlelinje. Se CATERING og SAMLET i filen her.)')

    print()
    print('C · PÅSTANDE PÅ KORTENE, DER IKKE ER VARER')
    print('   De kan ikke måles mod databasen. De skal bekræftes af ejeren.')
    for kortnavn, tekst in PAASTANDE:
        print('   · [%s] %s' % (kortnavn, tekst))

    print()
    print('=' * 62)
    print('%d prisuoverensstemmelser · %d varer uden for kortene'
          % (len(a_fejl) + len(ukendt), huller))
    print('Skrevet: %s' % facitliste(a_fejl, ukendt, huller_liste, uenige))


def facitliste(a_fejl, ukendt, huller_liste, uenige):
    """Skriver menukort/KORTENE-FACITLISTE.md — de syv kort som tekst,
       plus det, de og databasen er uenige om.

       ⚠️ DEN GENERERES, den skrives ikke i hånden. Kortene står i
       vaerktoej/kortene.py; en håndskrevet kopi ville skride fra
       dem, første gang et navn blev rettet — og så ville
       facitlisten være den fjerde udgave af det samme."""
    u = ['# De syv menukort — facitliste', '',
         'Skrevet af fra Mikkels færdige kort **%s** og holdt op mod'
         % datetime.date.today().isoformat(),
         'databasen post for post med `vaerktoej/sammenlign-kort.py`.', '',
         '**Kortene er facitlisten. Databasen er systemet. De to skal sige',
         'det samme** — et kort trykt med 189, mens kassen siger 179, er',
         'ikke en skæv oplysning, det er en gæst, der har set en pris.', '',
         '---', '']

    for kortnavn, manchet, afsnit in KORT:
        u.append('## %s' % kortnavn)
        u.append('')
        if manchet:
            u.append('*%s*' % manchet)
            u.append('')
        for anavn, poster in afsnit:
            u.append('### %s' % anavn)
            u.append('')
            u.append('| Vare | Pris | Note |')
            u.append('|---|---:|---|')
            for navn, p, note, _db in poster:
                if p is None:
                    vis = '**SPØRG**'
                elif p == 0:
                    vis = '—'
                else:
                    vis = '%g,-' % p
                u.append('| %s | %s | %s |' % (navn, vis, note or ''))
            u.append('')
        u.append('---')
        u.append('')

    u += ['## Hvad kortene og databasen er uenige om', '']

    if uenige:
        u += ['### ⚠️ Kortene siger hver sit om den samme vare', '',
              'Den her er den værste af slagsen: den findes ikke ved at holde',
              'ét kort op mod databasen, for begge kort kan se rigtige ud for',
              'sig selv. To trykte kort med to priser på den samme mad er en',
              'diskussion ved lugen.', '',
              '| Vare | Pris | Står på |', '|---|---:|---|']
        for dbnavn, rader in uenige:
            for kortnavn, navn, p in rader:
                u.append('| %s | **%g,-** | %s |' % (navn, p, kortnavn))
        u.append('')

    if a_fejl or ukendt:
        u += ['### Priser, der ikke passer', '',
              '| Vare | Kortet | Databasen | Kort |', '|---|---:|---:|---|']
        for kortnavn, navn, p_kort, p_db, _db in a_fejl:
            u.append('| %s | **%g,-** | %s | %s |'
                     % (navn, p_kort, '??' if p_db is None else '%g,-' % p_db, kortnavn))
        for kortnavn, navn, dbnavn in ukendt:
            u.append('| %s | — | findes ikke som "%s" | %s |' % (navn, dbnavn, kortnavn))
        u.append('')

    if huller_liste:
        u += ['### Varer i databasen, som intet kort viser', '',
              'De kan bestilles på hjemmesiden, ved lugen og fra bordet, men',
              'en gæst med et trykt kort i hånden ser dem ikke. Enten skal de',
              'på et kort, eller også skal de slukkes i admin.', '',
              '| Kategori | Vare | Pris |', '|---|---|---:|']
        for knavn, vnavn, p in huller_liste:
            u.append('| %s | %s | %s |'
                     % (knavn, vnavn, '??' if p is None else '%g,-' % p))
        u.append('')

    u += ['### Påstande på kortene, der ikke er varer', '',
          'De kan ikke måles mod databasen. De skal bekræftes af ejeren,',
          'før kortene trykkes.', '']
    for kortnavn, tekst in PAASTANDE:
        u.append('- **%s** — %s' % (kortnavn, tekst))
    u.append('')

    sti = os.path.join(ROD, 'menukort', 'KORTENE-FACITLISTE.md')
    io_open = open(sti, 'w', encoding='utf-8')
    io_open.write('\n'.join(u))
    io_open.close()
    return sti


if __name__ == '__main__':
    main()
