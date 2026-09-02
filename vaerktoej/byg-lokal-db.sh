#!/usr/bin/env bash
# ============================================================
#  BYG DEN LOKALE DATABASE AF DE RIGTIGE FILER  (2. sep 2026)
#  ------------------------------------------------------------
#  ⚠️ HVORFOR FILEN FINDES — FIRE FALD, SAMME MØNSTER
#
#  Fire gange er en proev-fil bestået lokalt og faldet hos
#  kunden, og hver gang var årsagen den samme: efterligningen
#  (vaerktoej/lokal-stub.sql) var MILDERE end skyen.
#
#    26/8  dagens_retter fandtes ikke i produktionen
#    30/8  lokationer.adresse er not null
#     1/9  mosede_bord_findes afviser et bord, der ikke findes
#     2/9  bestillinger har TRETTEN udløsere; stubben havde ÉN.
#          proev-bord-uden-telefon.sql bestod 8 af 8 lokalt og
#          faldt med 6 af 8 i Mosede-projektet
#
#  En stub, der bygges forfra i hånden, kan ikke andet end at
#  drive fra skyen. Den her bygger databasen af supabase/-mappens
#  EGNE filer, i den rækkefølge CLAUDE.md angiver — så værnene er
#  produktionens egen kode og ikke en gengivelse af den.
#
#  ⚠️ DEN RØRER ALDRIG SUPABASE. Den taler kun med en lokal
#  Postgres, og den dropper og genskaber sin egen database.
#
#  BRUG:
#    vaerktoej/byg-lokal-db.sh                 # bygger "fuld"
#    psql -d fuld -f supabase/proev-DIN-FIL.sql
#
#  Miljø: PGHOST/PGPORT/PGUSER som psql normalt. DB-navnet kan
#  sættes med DB=... foran kaldet.
# ============================================================
set -u
DB="${DB:-fuld}"
Q="psql -q -v ON_ERROR_STOP=1"

# ⚠️ Supabase har auth-skemaet; en lokal Postgres har ikke. Kun
#    de fire ting, setup.sql og adgangsreglerne slår op — ikke en
#    efterligning af Supabases login.
$Q -d postgres -c "drop database if exists $DB;" -c "create database $DB;" || exit 1
$Q -d "$DB" <<'SQL' || exit 1
create schema if not exists auth;
create table if not exists auth.users(id uuid primary key default gen_random_uuid(), email text);
create or replace function auth.uid()  returns uuid  language sql stable as $$ select null::uuid $$;
create or replace function auth.role() returns text  language sql stable as $$ select 'authenticated'::text $$;
create or replace function auth.jwt()  returns jsonb language sql stable as $$ select '{}'::jsonb $$;
do $$ begin
  create role anon;          exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role;  exception when duplicate_object then null; end $$;
SQL

# ⚠️ setup.sql standser med vilje, hvis chefens e-mail ikke er
#    udfyldt. Vi retter den i en KOPI — aldrig i repoet, hvor
#    pladsholderen er hele værnet.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
sed "s/'UDFYLD-CHEFENS-EMAIL@eksempel.dk'/'lokal@proeve.dk'/" supabase/setup.sql > "$TMP/setup.sql"
$Q -d "$DB" -f "$TMP/setup.sql" || exit 1

# Rækkefølgen er CLAUDE.md's. En fil, der mangler her, er en fil,
# prøverne ikke ved eksisterer — se noten om er-vi-klar.sql.
FILER="flerlejer bremse menukort forespoergsler kalender borde udlejning
  realtime spis-her levering skraldespand logbog bordkort restaurant
  bord-loft menukort-ud-af-huset menukort-resten menukort-ejerens-liste
  dagens-retter nyheder-fra-til pris-vaern dagsregler lukkedag-vaern
  dagsbesked-og-qr menukort-antal-og-dage nyheder-slags-og-billede
  kortets-priser bord-udeblev foresp-kontakt borde-55 arrangementer
  bord-noegle arrangement-info arrangement-kategori bestillingsnummer
  forespoergsel-kalender frokost smoerrebroed-forespoergsel
  bord-uden-telefon vare-billede bord-loft-pr-dag kortets-priser-3
  smoerrebroed-kortet ejerens-oplysninger tillaeg-hensyn push"

fejl=0
for f in $FILER; do
  [ -f "supabase/$f.sql" ] || { printf '  %-30s MANGLER\n' "$f.sql"; fejl=1; continue; }
  if ! out="$($Q -d "$DB" -f "supabase/$f.sql" 2>&1)"; then
    printf '  %-30s FEJL\n' "$f.sql"
    printf '%s\n' "$out" | grep -m2 ERROR | sed 's/^/      /'
    fejl=1
  fi
done

# ⚠️ TALLET ER SVARET. Er der færre udløsere end i produktionen,
#    beviser en proev-fil ikke det, den påstår. 13 er, hvad
#    supabase/-mappen lægger på bestillinger i dag.
antal="$(psql -tAq -d "$DB" -c "select count(*) from pg_trigger
  where tgrelid='public.bestillinger'::regclass and not tgisinternal;")"
echo
echo "  Udløsere på bestillinger: $antal (produktionen har 13)"
[ "$antal" -ge 13 ] || { echo "  ⚠️ FOR FÅ — en prøve her beviser mindre end den ser ud til."; fejl=1; }
[ "$fejl" -eq 0 ] && echo "  ✅ Databasen '$DB' står klar." || echo "  ⚠️ Se linjerne ovenfor."
exit $fejl
