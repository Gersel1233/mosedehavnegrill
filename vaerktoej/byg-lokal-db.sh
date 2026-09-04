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
-- ⚠️ DEN HER SKAL LÆSE request.jwt.claims, ikke svare '{}'.
-- Supabase fylder indstillingen med den indloggedes claims, og
-- proev-filerne skifter identitet med
--   set local request.jwt.claims = '{"email":"..."}'
-- En stub, der altid svarer tomt, gør hver eneste RLS-prøve til
-- en maaling af ingenting: alle er den samme ukendte bruger.
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
do $$ begin
  create role anon;          exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role;  exception when duplicate_object then null; end $$;

-- ⚠️ SUPABASE GIVER anon OG authenticated RETTIGHEDER PAA HELE
--    public-skemaet som standard; det er RLS, der begraenser
--    dem. Uden de her linjer naegter den lokale database ALT, og
--    saa maaler enhver RLS-proeve ingenting: de negative proever
--    bestaar, fordi ingen kan noget, og de positive falder.
--    Maalt 2/9, da proev-roller.sql lod EJEREN falde paa 5 af 18.
--
--    ⚠️ OG DE SAETTES FOER filerne koeres, praecis som i skyen:
--    saa vinder en senere `revoke` i en migrering (fx
--    borde.kode i bord-noegle.sql) over standarden - i stedet
--    for at blive skyllet vaek af den.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
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
  bord-noegle arrangement-info arrangement-kategori bestilling-dato-vaern bestillingsnummer
  forespoergsel-kalender frokost smoerrebroed-forespoergsel
  bord-uden-telefon vare-billede bord-loft-pr-dag kortets-priser-3
  smoerrebroed-kortet ejerens-oplysninger tillaeg-hensyn
  kategori-dag-vaern-aktiv roller levering-og-mindsteantal
  dato-vaern-resten bordnummer bestilling-status push"

fejl=0
for f in $FILER; do
  [ -f "supabase/$f.sql" ] || { printf '  %-30s MANGLER\n' "$f.sql"; fejl=1; continue; }
  if ! out="$($Q -d "$DB" -f "supabase/$f.sql" 2>&1)"; then
    printf '  %-30s FEJL\n' "$f.sql"
    printf '%s\n' "$out" | grep -m2 ERROR | sed 's/^/      /'
    fejl=1
  fi
done

# ⚠️ OG PRODUKTIONEN ER STRENGERE END EN TOM DATABASE  (2/9).
#    Ejeren har trykket "Lås QR-koderne", så hans borde HAR en
#    nøgle — og `bestilling_bord_noegle` afviser da enhver
#    bestilling uden `bord_kode`. En prøve mod ulåste borde
#    består og siger intet om den virkelighed.
#    proev-bord-uden-telefon.sql faldt netop dér med 5 af 8.
#    Derfor låses to borde her: en prøve, der bruger ejerens
#    numre, falder lokalt i stedet for hos kunden.
psql -q -d "$DB" <<'SQL' >/dev/null 2>&1
insert into public.borde (lokation_id, nummer, aktiv)
select 'mosede', n, true from (values ('7'), ('9')) as v(n)
 where not exists (select 1 from public.borde
                    where lokation_id = 'mosede' and btrim(nummer) = v.n);
update public.borde set kode = 'K3F9X2'
 where lokation_id = 'mosede' and btrim(nummer) = '7';
update public.borde set kode = 'M7HJ2P'
 where lokation_id = 'mosede' and btrim(nummer) = '9';
SQL

# ⚠️ TALLET ER SVARET. Er der færre udløsere end i produktionen,
#    beviser en proev-fil ikke det, den påstår. 13 er, hvad
#    supabase/-mappen lægger på bestillinger i dag.
antal="$(psql -tAq -d "$DB" -c "select count(*) from pg_trigger
  where tgrelid='public.bestillinger'::regclass and not tgisinternal;")"
echo
laaste="$(psql -tAq -d "$DB" -c "select count(*) from public.borde
  where lokation_id='mosede' and kode is not null;")"
echo "  Udløsere på bestillinger: $antal (produktionen har 14)"
echo "  Låste borde:              $laaste (som hos ejeren)"
[ "$antal" -ge 14 ] || { echo "  ⚠️ FOR FÅ — en prøve her beviser mindre end den ser ud til."; fejl=1; }

# ⚠️ OG STANDARDRETTIGHEDERNE MAA IKKE HAVE SKYLLET ET VAERN VAEK.
#    borde.kode er beskyttet med KOLONNErettigheder (bord-noegle.sql)
#    og er hele QR-noeglens fundament: kunne gaesten laese kolonnen,
#    kunne enhver med anon-noeglen bygge alle 55 adresser.
# ⚠️ KUN SELECT. Foerste udgave talte ALLE rettighedstyper og
#    raabte paa INSERT og UPDATE, som anon ogsaa har paa alt
#    andet (RLS er porten). Vaernet handler om at LAESE kolonnen.
kode="$(psql -tAq -d "$DB" -c "select count(*) from information_schema.column_privileges
  where table_name='borde' and column_name='kode'
    and grantee='anon' and privilege_type='SELECT';")"
echo "  Gæsten må LÆSE borde.kode: $kode (skal være 0)"
[ "$kode" = "0" ] || { echo "  ⚠️ VÆRNET ER VÆK — se noten om kolonnerettigheder."; fejl=1; }
[ "$fejl" -eq 0 ] && echo "  ✅ Databasen '$DB' står klar." || echo "  ⚠️ Se linjerne ovenfor."
exit $fejl
