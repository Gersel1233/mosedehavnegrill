#!/bin/sh
# ============================================================
#  HERO-VIDEOEN I LODRET FORMAT TIL TELEFONER
# ------------------------------------------------------------
#  Hero-videoen er 1280x720 i landskab. Heroen er 100svh høj, så
#  på en iPhone er rammen omkring 390x844 — altså LODRET, og
#  object-fit: cover gør så dette:
#
#    Browseren skalerer hele 1280x720 op til højde 844
#    (faktor 1,17), får 1500x844, og klipper 390 ud af de 1500.
#
#  Den afkoder altså 921.600 pixels for at vise en strimmel der
#  svarer til cirka 333 pixels kilde, opskaleret til 390. Det er
#  tre gange så meget arbejde som nødvendigt, ved 30 billeder i
#  sekundet, på det apparat der har mindst at give.
#
#  Kunden skrev at videoen hakkede på telefonen. Det er derfor.
#
#  Denne fil klipper midten ud i 9:16 og gemmer den i sin egen
#  fil. Resultatet ser ens ud — browseren viste allerede kun
#  midten — men der er 405x720 = 291.600 pixels at afkode i
#  stedet for 921.600.
#
#  DER ER INGEN LODRET KILDE. Begge råfiler i original/ er
#  1280x720 i landskab, så billedet kan ikke blive skarpere end
#  det er nu. Det kan blive billigere, og det er hvad der sker
#  her.
#
#  Kør:  sh vaerktoej/lav-hero-telefon.sh
# ============================================================
set -e

FF=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
KILDE=billeder/hero.mp4

# 405x720 er 9:16 med den fulde højde af kilden — ingen opskalering.
# Beskæringen er centreret: panoreringen er vandret, så motivet
# bevæger sig gennem rammen uanset hvor snittet ligger.
KLIP="crop=406:720:437:0"

# crf 26 og ikke 23: fladen er en tredjedel så stor, og en telefon
# der viser 390 px bredt kan ikke se forskellen. veryslow fordi
# filen laves én gang og hentes tusind gange.
"$FF" -y -i "$KILDE" -vf "$KLIP" \
  -c:v libx264 -profile:v main -preset veryslow -crf 26 \
  -pix_fmt yuv420p -movflags +faststart -an \
  billeder/hero-hoej.mp4

# WebM til de browsere der er bygget uden H.264 — blandt andet den
# Chromium testene kører i, hvilket er grunden til at videoen
# overhovedet kan afprøves.
"$FF" -y -i "$KILDE" -vf "$KLIP" \
  -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -deadline good -cpu-used 2 \
  -pix_fmt yuv420p -an \
  billeder/hero-hoej.webm

ls -l billeder/hero.mp4 billeder/hero-hoej.mp4 billeder/hero.webm billeder/hero-hoej.webm
