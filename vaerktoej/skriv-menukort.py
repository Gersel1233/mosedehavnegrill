#!/usr/bin/env python3
"""Skriver menukort/-filerne ud fra det, hent-menukort.sh har hentet.

⚠️ FILERNE ER ET FOTO, IKKE EN KILDE. Databasen er sandheden;
   ejeren retter priser i admin. Derfor står datoen øverst i hver
   fil, og derfor er der ingen vej fra filerne TILBAGE i
   databasen — en import ville være to steder at rette den samme
   pris, og de ville skride fra hinanden.

⚠️ OG DEN GÆTTER INGENTING. En vare uden pris skrives som tom i
   CSV'en og som "spørg" i den læsbare — aldrig som 0. Et beløb,
   vi finder på, er værre end ingen pris: gæsten regner med det.
"""
import csv, io, json, os, sys, datetime

ind, ud = sys.argv[1], sys.argv[2]
os.makedirs(ud, exist_ok=True)
J = lambda n: json.load(open(os.path.join(ind, n + '.json'), encoding='utf-8'))

kat_liste = J('menu_kategorier')
varer     = J('menu_varer')
indst     = {x['noegle']: x['vaerdi'] for x in J('indstillinger')}

kat = {k['id']: k for k in kat_liste}
bestilbare = {int(n) for n in (indst.get('bestilbare_kategorier') or [])}
# Smørrebrødets egne kategorier er ALTID bestilbare — se
# Butik.udvalg i js/store.js. Fluebenet findes ikke for dem.
import re
for k in kat_liste:
    if re.search(r'smørrebrød|håndmad|fyld', k['navn'] or '', re.I):
        bestilbare.add(k['id'])

DATO = datetime.date.today().isoformat()
AFD  = {'mad': 'Mad', 'is': 'Is', 'drikke': 'Drikke'}

def pris(v):
    p = v.get('pris')
    return '' if p is None else ('%g' % float(p))

def sorteret():
    for k in sorted(kat_liste, key=lambda x: (x['sortering'], x['id'])):
        egne = [v for v in varer if v['kategori_id'] == k['id']]
        yield k, sorted(egne, key=lambda x: (x['sortering'], x['id']))

# ---------------- CSV: den, man åbner i et regneark ----------------
with open(os.path.join(ud, 'menukort.csv'), 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['Kategori', 'Afdeling', 'Vare', 'Pris (kr.)', 'Beskrivelse',
                'Kategori vises', 'Vare vises', 'Udsolgt',
                'Kan bestilles online', 'Kategoriens dage', 'Kategorinote'])
    for k, egne in sorteret():
        for v in egne:
            w.writerow([
                k['navn'], AFD.get(k['afdeling'], k['afdeling']), v['navn'],
                pris(v), v.get('beskrivelse') or '',
                'ja' if k['aktiv'] else 'nej',
                'ja' if v['aktiv'] else 'nej',
                'ja' if v.get('udsolgt') else 'nej',
                'ja' if k['id'] in bestilbare else 'nej',
                k.get('dage') or 'alle', k.get('note') or '',
            ])

# ---------------- Markdown: den, man læser og designer efter ----------------
ud_md = io.StringIO()
ud_md.write('# Menukortet hos Mosede Havnecafe\n\n')
ud_md.write('Hentet direkte ud af databasen **%s**. Databasen er sandheden —\n' % DATO)
ud_md.write('retter ejeren en pris i admin, er filen her forældet samme sekund.\n')
ud_md.write('Kør `vaerktoej/hent-menukort.sh` igen i stedet for at rette i den.\n\n')

synlige = [v for v in varer if v['aktiv'] and kat[v['kategori_id']]['aktiv']]
ud_md.write('- **%d varer** i **%d kategorier** står på kortet\n'
            % (len(synlige), len([k for k in kat_liste if k['aktiv']])))
ud_md.write('- **%d** af dem har ingen pris (og skal ikke have en — se nederst)\n'
            % len([v for v in synlige if v.get('pris') is None]))
ud_md.write('- **%d** kan bestilles online, ved lugen og fra bordet\n\n'
            % len([v for v in synlige if v['kategori_id'] in bestilbare]))

for k, egne in sorteret():
    vis = [v for v in egne if v['aktiv']]
    if not k['aktiv'] or not vis:
        continue
    ud_md.write('## %s\n\n' % k['navn'])
    linje = [AFD.get(k['afdeling'], k['afdeling'])]
    linje.append('kan bestilles' if k['id'] in bestilbare
                 else 'kan ikke bestilles online')
    if (k.get('dage') or 'alle') != 'alle':
        linje.append('kun ' + k['dage'])
    ud_md.write('*%s*\n\n' % ' · '.join(linje))
    if k.get('note'):
        ud_md.write('> %s\n\n' % k['note'])
    for v in vis:
        p = pris(v)
        ud_md.write('- **%s** — %s' % (v['navn'], (p + ' kr.') if p else '_spørg_'))
        if v.get('udsolgt'):
            ud_md.write('  ·  UDSOLGT')
        if v.get('beskrivelse'):
            ud_md.write('\n  <br>%s' % v['beskrivelse'])
        ud_md.write('\n')
    ud_md.write('\n')

slukket = [k for k in kat_liste if not k['aktiv']]
if slukket:
    ud_md.write('## Ikke på kortet\n\n')
    ud_md.write('Kategorier, ejeren har slået fra. De er ikke slettet, '
                'og kan tændes igen i admin.\n\n')
    for k in slukket:
        ud_md.write('- %s (%d varer)\n'
                    % (k['navn'], len([v for v in varer if v['kategori_id'] == k['id']])))
    ud_md.write('\n')

ingen = [v for v in synlige if v.get('pris') is None]
if ingen:
    ud_md.write('## De varer, der med vilje står uden pris\n\n')
    for v in ingen:
        ud_md.write('- **%s** (%s) — %s\n'
                    % (v['navn'], kat[v['kategori_id']]['navn'],
                       v.get('beskrivelse') or 'ejeren har svaret "spørg"'))
    ud_md.write('\n')

open(os.path.join(ud, 'menukort.md'), 'w', encoding='utf-8').write(ud_md.getvalue())

# ---------------- JSON: den, en maskine skal bruge ----------------
json.dump({
    'hentet': DATO,
    'kilde': 'menu_kategorier + menu_varer + indstillinger (Mosede)',
    'kategorier': kat_liste, 'varer': varer,
    'bestilbare_kategorier': sorted(bestilbare),
}, open(os.path.join(ud, 'menukort.json'), 'w', encoding='utf-8'),
    ensure_ascii=False, indent=2)

print('  menukort/menukort.csv   %d rækker' % len(varer))
print('  menukort/menukort.md    %d varer på kortet' % len(synlige))
print('  menukort/menukort.json')
