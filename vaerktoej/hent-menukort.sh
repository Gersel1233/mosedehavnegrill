#!/usr/bin/env bash
# ============================================================
#  HENT HELE MENUKORTET UD AF DATABASEN  (3. sep 2026)
#  ------------------------------------------------------------
#  Kundens ord: "giv mig det hele som filer, da jeg skal lave
#  menukort." Filerne i menukort/ er et FOTO af databasen, ikke
#  en anden udgave af den: retter ejeren en pris i admin, er
#  filen forældet samme sekund. Kør scriptet igen i stedet for
#  at rette i filerne.
#
#  ⚠️ DEN LÆSER, OG KUN DET. Nøglen er anon-nøglen fra
#  js/config.js — den er offentlig med vilje og må kun læse (se
#  filens eget hoved). service_role må ALDRIG bruges her.
#
#  ⚠️ OG DEN LÆSER MOSEDE. Adressen tages fra js/config.js og
#  ikke fra et argument, netop for at der ikke findes en vej til
#  at pege den et andet sted hen.
#
#  BRUG:  vaerktoej/hent-menukort.sh
#  UD:    menukort/menukort.csv · .md · .json
# ============================================================
set -euo pipefail
ROD="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CFG="$ROD/js/config.js"

URL=$(grep -oE "https://[a-z0-9]+\.supabase\.co" "$CFG" | head -1)
KEY=$(grep -oE "eyJ[A-Za-z0-9_.-]+" "$CFG" | head -1)
LOK=$(grep -oE "lokation: *'[^']+'" "$CFG" | head -1 | sed "s/.*'\(.*\)'/\1/")
LOK=${LOK:-mosede}

[ -n "$URL" ] && [ -n "$KEY" ] || { echo "Kunne ikke læse url/nøgle af js/config.js"; exit 1; }

# WARN NOEGLEN SKAL VAERE anon - OG DET TJEKKES, IKKE ANTAGES.
# service_role ligger i Supabase-dashboardet lige UNDER anon og
# ligner den til forveksling; den springer alle adgangsregler
# over. Havnede den i js/config.js ved et uheld, ville scriptet
# her laese videre, som om intet var sket - og saa var det det
# foerste sted, hele databasen kunne traekkes ud af.
# Rollen staar i noeglens egen nyttelast; vi laeser den.
ROLLE=$(printf %s "$KEY" | python3 -c '
import base64, json, sys
d = sys.stdin.read().split(".")[1]
d += "=" * (-len(d) % 4)
print(json.loads(base64.urlsafe_b64decode(d)).get("role", ""))
')
if [ "$ROLLE" != "anon" ]; then
  echo "STOP: noeglen i js/config.js har rollen '$ROLLE' og ikke 'anon'." >&2
  echo "      Er det service_role, hoerer den ikke hjemme i klientkoden." >&2
  exit 1
fi
echo "Henter fra $URL (forretning: $LOK, rolle: $ROLLE)"

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
hent () {  # $1 = tabel, $2 = query
  curl -sS --max-time 40 --fail \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    "$URL/rest/v1/$1?$2" -o "$TMP/$1.json"
}
hent menu_kategorier "select=*&lokation_id=eq.$LOK&order=sortering"
hent menu_varer      "select=*&lokation_id=eq.$LOK&order=kategori_id,sortering"
hent indstillinger   "select=noegle,vaerdi&lokation_id=eq.$LOK"

python3 "$ROD/vaerktoej/skriv-menukort.py" "$TMP" "$ROD/menukort"
