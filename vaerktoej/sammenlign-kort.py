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
from kortene import KORT, PAASTANDE, AFGJORT   # noqa: E402

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


def valgTillaeg(v, valgnavn):
    """Tillægget for ét valg på en vare — eller None, hvis valget
       ikke findes.

       ⚠️ SAMME REGEL SOM Butik.prisMedValg I js/store.js. Et valg
       er enten en streng ("Vaffel") eller {navn, tillaeg}; en
       streng koster ingenting oveni."""
    for x in (v.get('valg') or []):
        if isinstance(x, dict):
            if x.get('navn') == valgnavn:
                return float(x.get('tillaeg') or 0)
        elif x == valgnavn:
            return 0.0
    return None


def slaaOp(db, dbnavn):
    """Kortets db-navn -> (rækker, pris) — og "vare|valg" regnes ud.

       ⚠️ ET VALG ER IKKE EN VARE, DER MANGLER. Kaffen har en
       Lille/Stor-vælger, og rapporten ledte efter en vare ved navn
       "Americano, stor". Den findes ikke og skal ikke findes — men
       PRISEN findes, som grundpris + tillæg. Uden det her råbte
       rapporten om ti huller, der var lukket, og en rapport, der
       råber forkert, er en rapport, ingen læser.

       Svaret er (None, None), når varen eller valget ikke findes."""
    if dbnavn and '|' in dbnavn:
        vare, valgnavn = dbnavn.split('|', 1)
        raekker = db.get(vare)
        if not raekker:
            return None, None
        grund = pris(raekker[0])
        t = valgTillaeg(raekker[0], valgnavn)
        if grund is None or t is None:
            return None, None
        return raekker, grund + t
    raekker = db.get(dbnavn)
    if not raekker:
        return None, None
    return raekker, pris(raekker[0])


def main():
    paakort, a_fejl, ukendt, ikke_maalt = set(), [], [], []
    afgjort_liste = []
    # ⚠️ SAMME VARE KAN STÅ PÅ TO KORT. Tartaren står både på
    # grillkortet og på smørrebrødskortet — og hvis de to siger
    # hver sit, opdager ingen det ved at holde ét kort op mod
    # databasen. Derfor samles hver vares priser PR. KORT først.
    pr_vare = {}

    for kortnavn, _, afsnit in KORT:
        # ⚠️ ET KORT, VI IKKE HAR FÅET, KAN IKKE MÅLES — OG MÅ IKKE
        # LADE SOM OM DET ER. Udgaven fra 3/9 står stadig i kortene.py
        # for de to, der manglede 25/9, så deres varer ikke forsvinder
        # ud af B-listen. Men at holde en GAMMEL pris op mod databasen
        # og kalde uenigheden en fejl ville fylde rapporten med støj,
        # og en rapport, hvor en fjerdedel er støj, læses ikke til ende
        # (arret fra Googles kvittering 9/9).
        if 'IKKE MODTAGET' in kortnavn:
            ikke_maalt.append(kortnavn)
            # Varerne tælles STADIG som "på et kort", så de ikke
            # pludselig dukker op i B som huller, vi ikke har.
            for _, poster in afsnit:
                for _navn, _p, _note, dbnavn in poster:
                    if dbnavn and not dbnavn.startswith('SAMLELINJE'):
                        paakort.add(dbnavn)
            continue
        for _, poster in afsnit:
            for navn, p_kort, _note, dbnavn in poster:
                if not dbnavn or dbnavn.startswith('SAMLELINJE'):
                    continue
                paakort.add(dbnavn)
                if p_kort not in (None, 0):
                    pr_vare.setdefault(dbnavn, []).append((kortnavn, navn, p_kort))
                raekker, p_db = slaaOp(db, dbnavn)
                if not raekker:
                    ukendt.append((kortnavn, navn, dbnavn))
                    continue
                if p_kort is None or p_kort == 0:
                    continue          # "spørg" og "samme pris"
                if p_db is None or float(p_kort) != p_db:
                    # Ejeren har afgjort nogle af dem — se AFGJORT i
                    # kortene.py. De hører ikke i A, for der er intet at
                    # rette i databasen; men de forsvinder ikke: ændrer
                    # det afgjorte tal sig, er de tilbage i A af sig selv.
                    afg = AFGJORT.get((kortnavn, navn))
                    if afg and p_db is not None and p_db == float(afg[0]):
                        afgjort_liste.append((kortnavn, navn, p_kort, p_db, afg[1]))
                    else:
                        a_fejl.append((kortnavn, navn, p_kort, p_db, dbnavn))

    print('SAMMENLIGNING AF DE SYV KORT MOD DATABASEN  ·  %s'
          % datetime.date.today().isoformat())
    print('=' * 62)
    print()
    if ikke_maalt:
        print('⚠️  KORT, DER IKKE ER MODTAGET — OG DERFOR IKKE MÅLT')
        for k in ikke_maalt:
            print('   %s' % k)
        print('   Deres varer tælles stadig med i B, så de ikke forsvinder.')
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
    print('A0 · AFGJORT AF EJEREN — KORTET ER TRYKT FORKERT')
    if not afgjort_liste:
        print('   ingen')
    else:
        print('   De står IKKE som uenighed: databasen har ret, og kortet')
        print('   skal rettes ved næste tryk. Ændrer databasen sig fra det')
        print('   afgjorte tal, dukker de op i A igen af sig selv.')
    for kortnavn, navn, p_kort, p_db, hvorfor in afgjort_liste:
        print('   %-34s kort %-5s  db %-5s   %s'
              % (navn, '%g' % p_kort, '%g' % p_db, hvorfor))

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

    # ------------------------------------------------------------
    #  D · POSTER PAA KORTENE, DER SLET IKKE ER VARER  (25/9)
    #  ------------------------------------------------------------
    #  ⚠️ ET HUL, DER VAR TAVST. En post med db-navn None blev
    #  sprunget over uden et ord — og sektion A kunne derfor ikke
    #  sige fra. Da kort 06 kom ind, stod der ti KAFFER I STOR til
    #  60-65 kr., som databasen slet ikke kender: en gaest laeser
    #  dem paa kortet og kan ikke bestille dem paa siden.
    #
    #  SAMLELINJE-posterne er ikke huller. De peger med vilje paa
    #  et andet kort ("Smoerrebroed — se smoerrebroedskortet"), og
    #  de er maerket i kortene.py.
    # ------------------------------------------------------------
    print()
    print('D · POSTER PÅ KORTENE, DER IKKE ER VARER I DATABASEN')
    print('   Gæsten kan læse dem på kortet, men ikke bestille dem på siden.')
    d_huller = 0
    for kortnavn, _, afsnit in KORT:
        for _, poster in afsnit:
            for post in poster:
                navn, p_kort, note, dbnavn = post
                if dbnavn is not None:
                    continue
                if str(navn).startswith('SAMLELINJE'):
                    continue
                d_huller += 1
                print('   %-42s kort %-7s [%s]'
                      % (navn[:42], '??' if p_kort is None else '%g,-' % p_kort,
                         kortnavn))
    if not d_huller:
        print('   ingen')

    print()
    print('C · PÅSTANDE PÅ KORTENE, DER IKKE ER VARER')
    print('   De kan ikke måles mod databasen. De skal bekræftes af ejeren.')
    for kortnavn, tekst in PAASTANDE:
        print('   · [%s] %s' % (kortnavn, tekst))

    print()
    print('=' * 62)
    print('%d prisuoverensstemmelser · %d varer uden for kortene · '
          '%d poster på kortene uden en vare'
          % (len(a_fejl) + len(ukendt), huller, d_huller))
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
