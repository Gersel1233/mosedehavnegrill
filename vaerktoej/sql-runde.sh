#!/usr/bin/env bash
# ============================================================
#  KØR HELE SQL-RUNDEN — OG RÅB OP, NÅR EN FIL MÅLER INGENTING
#  ------------------------------------------------------------
#  ⚠️ HVORFOR FILEN FINDES: EN RØD RUNDE, DER LÆSTES SOM GRØN.
#
#  Runden blev hidtil kørt som en løkke i hånden:
#
#      for f in supabase/proev-*.sql; do psql -q -d fuld -f "$f"; done
#
#  og resultatet blev læst ved at tælle ordene BESTOD og FEJLEDE
#  i udskriften. **Målt 9/9: 1418 BESTOD, 0 FEJLEDE — og FIRE
#  filer knækkede undervejs.** Tre af dem skrev NUL rapportlinjer,
#  fordi den første fejl afbrød deres transaktion, og alt derefter
#  blev sprunget over med "current transaction is aborted".
#
#  En fil, der dør før sin første rapportlinje, forsvinder altså
#  ud af begge tal. Den ligner ikke en fejl — den ligner ingenting.
#  Og det er præcis husets ældste ar: en måling, der ikke rammer
#  det, den måler, siger "bestået".
#
#  ⚠️ DERFOR TÆLLER DEN HER TRE TING PR. FIL, ikke ét:
#    · BESTOD-linjer          (målte den noget?)
#    · FEJLEDE-linjer         (faldt en regel?)
#    · "transaction is aborted" (døde filen på sin egen kulisse?)
#
#  og den slutter med exit 1, hvis EN AF DE TRE ser forkert ud.
#  Et tal, man selv skal huske at kigge efter, bliver ikke kigget
#  efter — det skal være en udgang, der er rød.
#
#  ⚠️ OG DEN VED, HVOR MANGE FILER DER ER. Falder en fil helt ud
#  af mappen, ville summen bare blive mindre, og ingen ville se
#  det. Antallet står i rapporten, og tallet kommer fra DISKEN.
#
#  BRUG:
#    vaerktoej/byg-lokal-db.sh     # først: byg databasen
#    vaerktoej/sql-runde.sh        # så: kør runden
#
#  Miljø: PGHOST/PGPORT/PGUSER som psql normalt. DB-navnet kan
#  sættes med DB=… (standard "fuld").
# ============================================================
set -u

DB="${DB:-fuld}"
MAPPE="${MAPPE:-supabase}"

if ! psql -q -d "$DB" -c 'select 1' >/dev/null 2>&1; then
  echo "❌ Kan ikke nå databasen '$DB'."
  echo "   Kør vaerktoej/byg-lokal-db.sh først (og sæt PGHOST/PGPORT)."
  exit 1
fi

filer=("$MAPPE"/proev-*.sql)
if [ ! -e "${filer[0]}" ]; then
  echo "❌ Ingen proev-filer i $MAPPE/ — står du i repoets rod?"
  exit 1
fi

bestod_i_alt=0
fejlede_i_alt=0
knaekkede=()
tomme=()

printf '%-48s %7s %8s %8s\n' "FIL" "BESTOD" "FEJLEDE" "DØD"
printf '%s\n' "----------------------------------------------------------------------------"

for f in "${filer[@]}"; do
  ud="$(psql -q -d "$DB" -f "$f" 2>&1)"
  b=$(printf '%s' "$ud" | grep -c 'BESTOD')
  fe=$(printf '%s' "$ud" | grep -c 'FEJLEDE')
  # ⚠️ "aborted" er kendingen på en fil, der døde på sin egen
  #    opstilling. Uden den tælles en fil, der aldrig nåede sin
  #    første prøve, som en fil uden fejl.
  ab=$(printf '%s' "$ud" | grep -c 'current transaction is aborted')

  bestod_i_alt=$(( bestod_i_alt + b ))
  fejlede_i_alt=$(( fejlede_i_alt + fe ))

  maerke=""
  if [ "$ab" -gt 0 ]; then
    maerke="⚠️"
    # Den FØRSTE rigtige fejl er roden; resten er følgevirkninger.
    rod="$(printf '%s' "$ud" | grep -E '^psql.*ERROR' \
      | grep -v 'current transaction is aborted' \
      | grep -v 'savepoint' | head -1 | sed 's/^psql://')"
    knaekkede+=("$(basename "$f")${rod:+  →${rod}}")
  fi
  if [ "$b" -eq 0 ] && [ "$fe" -eq 0 ]; then
    tomme+=("$(basename "$f")")
    maerke="${maerke}💀"
  fi

  printf '%-48s %7s %8s %8s %s\n' "$(basename "$f")" "$b" "$fe" "$ab" "$maerke"
done

echo
echo "=============================================================================="
echo "  Filer:   ${#filer[@]}   (talt på disken)"
echo "  BESTOD:  $bestod_i_alt"
echo "  FEJLEDE: $fejlede_i_alt"
echo "=============================================================================="

daarligt=0

if [ "$fejlede_i_alt" -gt 0 ]; then
  echo
  echo "❌ $fejlede_i_alt regel(er) FALDT. Det er en rigtig fejl i databasen"
  echo "   eller i migreringen — læs linjerne ovenfor."
  daarligt=1
fi

if [ "${#tomme[@]}" -gt 0 ]; then
  echo
  echo "💀 ${#tomme[@]} FIL(ER) MÅLTE INGENTING — hverken BESTOD eller FEJLEDE."
  echo "   Det er værre end en rød linje: filen forsvinder ud af BEGGE tal,"
  echo "   og runden ser grøn ud, mens et værn står uden vagt."
  for t in "${tomme[@]}"; do echo "     · $t"; done
  daarligt=1
fi

if [ "${#knaekkede[@]}" -gt 0 ]; then
  echo
  echo "⚠️  ${#knaekkede[@]} FIL(ER) DØDE PÅ DERES EGEN OPSTILLING."
  echo "   Roden står efter pilen. Mønstret er husets eget, set fire gange:"
  echo "   prøven LÅNER ejerens virkelighed (hans varer, hans borde, hans"
  echo "   dag) i stedet for at have sin egen — og et værn, filen ikke"
  echo "   handler om, afviser den, før den når sin første prøve."
  for k in "${knaekkede[@]}"; do echo "     · $k"; done
  daarligt=1
fi

if [ "$daarligt" -eq 0 ]; then
  echo
  echo "✅ ALLE ${#filer[@]} FILER MÅLTE NOGET, OG INTET FALDT."
fi

exit "$daarligt"
