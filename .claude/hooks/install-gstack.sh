#!/bin/bash
# ============================================================
# Henter gstack, naar en ny Claude-session starter.
#
# Sky-sessioner koerer i en maskine, der ryddes bagefter. Uden det
# her skulle gstack installeres i haanden hver eneste gang.
#
# To regler, der aldrig maa brydes:
#  1. Den maa ALDRIG faa en session til at fejle. Alt er pakket ind,
#     og den slutter altid med exit 0 - ogsaa naar alting gaar galt.
#  2. Den maa ikke tage lang tid, hvis gstack allerede er der.
# ============================================================
set +e
ROOT="$HOME/.claude/skills/gstack"
LOG="$HOME/.claude/gstack-install.log"

# allerede installeret? saa er vi faerdige med det samme.
# ⚠️ MAERKET ER SETUP'ENS, IKKE MAPPEN (15/9). Her stod `-d "$ROOT/bin"` -
# men bin/ ligger i selve repoet og findes, saa snart git clone er
# faerdig, ogsaa naar ./setup bagefter fejler (paa Mac'en: bun manglede).
# Saa troede hooken for evigt, at gstack var installeret, og proevede
# aldrig setup igen. .build-complete skrives foerst, naar setup har bygget.
if [ -f "$ROOT/browse/dist/.build-complete" ]; then exit 0; fi

# ⚠️ macOS HAR IKKE `timeout` (15/9). Den er GNU coreutils og findes i
# sky-maskinen, men ikke paa Mikkels Mac - saa `timeout 240 git clone`
# svarede "command not found", hooken skrev "kunne ikke hente gstack"
# og sluttede tavst. gstack blev ALDRIG hentet paa Mac'en. Findes
# hverken timeout eller gtimeout (brew install coreutils), koeres
# kommandoen uden loft - hookens eget loft i settings.json (600 s)
# gaelder stadig.
if command -v timeout >/dev/null 2>&1; then MAX="timeout"
elif command -v gtimeout >/dev/null 2>&1; then MAX="gtimeout"
else MAX=""; fi
loft() { local s="$1"; shift; if [ -n "$MAX" ]; then "$MAX" "$s" "$@"; else "$@"; fi; }

mkdir -p "$HOME/.claude/skills" 2>/dev/null
{
  echo "--- $(date -u +%FT%TZ) henter gstack (loft: ${MAX:-intet}) ---"
  # Er den hentet i forvejen (setup fejlede sidst), hentes den ikke igen -
  # git clone i en mappe, der findes, fejler, og saa naaede vi aldrig setup.
  if [ ! -d "$ROOT/.git" ]; then
    loft 240 git clone --single-branch --depth 1 \
      https://github.com/garrytan/gstack.git "$ROOT" 2>&1 || {
        echo "kunne ikke hente gstack - sessionen koerer videre uden"
        exit 0
      }
  fi
  # Chromium kan ikke hentes gennem proxyen her, men der ligger allerede
  # en. Byg den sti, gstack forventer, saa setup ikke spilder tid paa det.
  BRO=$(find /opt/pw-browsers -maxdepth 1 -name 'chromium-*' -type d 2>/dev/null | head -1)
  if [ -n "$BRO" ]; then export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1; fi
  cd "$ROOT" && loft 420 ./setup --quiet 2>&1
  echo "--- faerdig ---"
} >> "$LOG" 2>&1

exit 0
