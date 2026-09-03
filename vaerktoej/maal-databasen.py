#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Spørger PRODUKTIONEN, hvad der faktisk står i databasen.

   Kundens spørgsmål 3/9: *"ift alle sql'erne her hvad mangler jeg"*.

   ⚠️ SVARET LÆSES UD AF DATABASEN, IKKE AF PAPIRERNE. Noterne i
   CLAUDE.md har taget fejl mindst to gange — 26/8 stod der, at en
   manglende tabel "degraderede pænt", og 3/9 stod der ✅ på
   vare-billede.sql, som aldrig var kørt. En note er ikke et tjek.

   PostgREST svarer med en kode, der KAN måles udefra:
     42703  kolonnen findes ikke
     PGRST205 / 404  tabellen eller visningen findes ikke
     42501  kolonnen findes, men gæsten må ikke læse den (et VÆRN)
     200    den er der

   ⚠️ DEN KAN KUN SE KOLONNER, TABELLER OG VISNINGER. Udløsere,
      funktioner, CHECK-krav og adgangsregler er usynlige herfra —
      dem svarer supabase/er-vi-klar.sql på, og det står i
      rapporten, så ingen tror, den siger mere end den gør.

   ⚠️ OG DEN NÆGTER ALT ANDET END anon-nøglen. service_role ligger
      i dashboardet lige under anon og ligner den til forveksling.
      Rollen står i nøglens egen nyttelast, og den LÆSES.

   BRUG:  vaerktoej/maal-databasen.py
"""
import base64, json, os, re, sys, urllib.request, urllib.error

ROD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True

cfg = open(os.path.join(ROD, 'js', 'config.js'), encoding='utf-8').read()


def felt(navn):
    m = re.search(navn + r":\s*'([^']+)'", cfg)
    if not m:
        sys.exit('js/config.js mangler feltet %s' % navn)
    return m.group(1)


URL, NOEGLE = felt('url'), felt('anonKey')

# ⚠️ ROLLEN LÆSES AF NØGLEN SELV. Havnede service_role i
# js/config.js ved et uheld, ville scriptet ellers læse videre, som
# om intet var sket — og så var det det første sted, hele databasen
# kunne trækkes ud af.
krop = NOEGLE.split('.')[1]
krop += '=' * (-len(krop) % 4)
rolle = json.loads(base64.urlsafe_b64decode(krop)).get('role')
if rolle != 'anon':
    sys.exit('⚠️ NØGLEN I js/config.js HAR ROLLEN "%s" — kun anon må '
             'bruges her. Stop, og find ud af hvorfor.' % rolle)


def spoerg(sti):
    req = urllib.request.Request(
        URL + '/rest/v1/' + sti,
        headers={'apikey': NOEGLE, 'Authorization': 'Bearer ' + NOEGLE})
    try:
        urllib.request.urlopen(req, timeout=25).read()
        return 200, ''
    except urllib.error.HTTPError as e:
        try:
            svar = json.loads(e.read())
        except Exception:
            svar = {}
        return e.code, svar.get('code') or svar.get('message', '')
    except Exception as e:
        return 0, str(e)


def tabel(navn):
    return spoerg(navn + '?select=*&limit=1')


def kolonne(t, k):
    return spoerg(t + '?select=' + k + '&limit=1')


# (fil, hvad der måles, kald)  — rækkefølgen er CLAUDE.md's.
TJEK = [
  ('setup.sql',                  'tabellen bestillinger',      lambda: tabel('bestillinger')),
  ('flerlejer.sql',              'tabellen lokationer',        lambda: tabel('lokationer')),
  ('menukort.sql',               'tabellen menu_varer',        lambda: tabel('menu_varer')),
  ('forespoergsler.sql',         'tabellen forespoergsler',    lambda: tabel('forespoergsler')),
  ('kalender.sql',               'tabellen kalender',          lambda: tabel('kalender')),
  ('borde.sql',                  'tabellen bordbestillinger',  lambda: tabel('bordbestillinger')),
  ('udlejning.sql',              'tabellen udlejninger',       lambda: tabel('udlejninger')),
  ('skraldespand.sql',           'bestillinger.slettet',       lambda: kolonne('bestillinger', 'slettet')),
  ('logbog.sql',                 'tabellen logbog',            lambda: tabel('logbog')),
  # ⚠️ borde SPØRGES PÅ EN NAVNGIVEN KOLONNE, ALDRIG select=*.
  # bord-noegle.sql tager kolonnen `kode` fra anon med
  # KOLONNErettigheder, så `select=*` svarer 42501 for en gæst —
  # og en måling, der læser det som "tabellen mangler", peger på
  # bordkort.sql, som giver anon HELE tabellen tilbage.
  #
  # Præcis dét stod i er-vi-klar.sql linje 40 og blev rettet 30/8:
  # "en tjeklinje, der beder om det modsatte af det, den skal
  # beskytte, er værre end ingen tjeklinje". Den fælde gik jeg selv
  # i her, første gang scriptet blev kørt.
  ('bordkort.sql',               'tabellen borde',             lambda: kolonne('borde', 'nummer')),
  ('bord-loft.sql',              'visningen bord_travlhed',    lambda: tabel('bord_travlhed')),
  ('dagens-retter.sql',          'tabellen dagens_retter',     lambda: tabel('dagens_retter')),
  ('nyheder-fra-til.sql',        'nyheder.vis_fra',            lambda: kolonne('nyheder', 'vis_fra')),
  ('dagsregler.sql',             'tabellen dags_regler',       lambda: tabel('dags_regler')),
  ('dagsbesked-og-qr.sql',       'dags_regler.besked_titel',   lambda: kolonne('dags_regler', 'besked_titel')),
  ('menukort-antal-og-dage.sql', 'menu_varer.antal_tilbage',   lambda: kolonne('menu_varer', 'antal_tilbage')),
  ('menukort-antal-og-dage.sql', 'menu_kategorier.dage',       lambda: kolonne('menu_kategorier', 'dage')),
  ('nyheder-slags-og-billede.sql', 'nyheder.slags',            lambda: kolonne('nyheder', 'slags')),
  ('nyheder-slags-og-billede.sql', 'nyheder.billede',          lambda: kolonne('nyheder', 'billede')),
  ('forespoergsel-kalender.sql', 'visningen optagne_dage',     lambda: tabel('optagne_dage')),
  ('forespoergsel-kalender.sql', 'forespoergsler.detaljer',    lambda: kolonne('forespoergsler', 'detaljer')),
  ('arrangementer.sql',          'tabellen reservationer',     lambda: tabel('reservationer')),
  ('arrangementer.sql',          'kalender.tilmelding',        lambda: kolonne('kalender', 'tilmelding')),
  ('arrangementer.sql',          'visningen arrangement_pladser', lambda: tabel('arrangement_pladser')),
  ('bord-noegle.sql',            'borde.har_kode',             lambda: kolonne('borde', 'har_kode')),
  ('arrangement-info.sql',       'kalender.billede',           lambda: kolonne('kalender', 'billede')),
  ('arrangement-kategori.sql',   'kalender.kategori',          lambda: kolonne('kalender', 'kategori')),
  ('bestillingsnummer.sql',      'bestillinger.nummer',        lambda: kolonne('bestillinger', 'nummer')),
  ('bestillingsnummer.sql',      'tabellen bestillingsnumre',  lambda: tabel('bestillingsnumre')),
  ('vare-billede.sql',           'menu_varer.billede',         lambda: kolonne('menu_varer', 'billede')),
  ('bord-loft-pr-dag.sql',       'dags_regler.bord_loft',      lambda: kolonne('dags_regler', 'bord_loft')),
  ('bord-loft-pr-dag.sql',       'visningen bord_fyldte_dage', lambda: tabel('bord_fyldte_dage')),
  ('roller.sql',                 'admin_adgang.rolle',         lambda: kolonne('admin_adgang', 'rolle')),
  ('push.sql',                   'tabellen push_abonnementer', lambda: tabel('push_abonnementer')),
]

# ⚠️ ET VÆRN SER UD SOM EN FEJL UDEFRA — og skal ikke tælle som en.
# borde.kode er med vilje taget fra anon (kolonnerettigheder), så
# 42501 er det RIGTIGE svar. Uden linjen her ville rapporten bede
# nogen om at "rette" hele QR-nøglens fundament.
VAERN = [('bord-noegle.sql', 'borde.kode må IKKE kunne læses',
          lambda: kolonne('borde', 'kode'))]

print('MÅLT I PRODUKTIONEN MED ANON-NØGLEN  ·  %s' % URL.split('//')[1].split('.')[0])
print('=' * 66)
mangler = []
for fil, hvad, kald in TJEK:
    kode, grund = kald()
    ok = kode == 200
    if not ok:
        mangler.append((fil, hvad, grund or kode))
    print('  %s  %-32s %s' % ('✅' if ok else '❌', hvad,
                              '' if ok else '(%s) → %s' % (grund or kode, fil)))

print()
print('VÆRN — her er et NEJ det rigtige svar')
for fil, hvad, kald in VAERN:
    kode, grund = kald()
    ok = kode != 200
    print('  %s  %-32s %s' % ('✅' if ok else '❌', hvad,
                              '' if ok else '⚠️ GÆSTEN KAN LÆSE DEN — kør ' + fil))

print()
print('=' * 66)
if mangler:
    print('%d TING MANGLER:' % len(mangler))
    for fil in sorted({f for f, _, _ in mangler}):
        print('   · kør supabase/%s' % fil)
else:
    print('ALT DET, DER KAN MÅLES UDEFRA, ER PÅ PLADS.')
print()
print('⚠️ MEN MÅLINGEN KAN KUN SE KOLONNER, TABELLER OG VISNINGER.')
print('   Udløsere, funktioner, CHECK-krav og adgangsregler er')
print('   usynlige herfra. supabase/er-vi-klar.sql er den fil, der')
print('   svarer på dem — den skriver ingenting og siger ✅/❌ pr. linje.')
