#!/bin/sh
# ============================================================
#  TAPASFILMEN: SKARP, 60 BILLEDER I SEKUNDET OG FARVEMÆRKET
# ------------------------------------------------------------
#  Mikkel 28/9: "tapas-siden er laggy med videoen og i dårlig
#  kvalitet". MÅLT på filerne fra 26/9:
#    · 24 billeder i sekundet. Ost, pølse og vin flyver ind i
#      billedet og sprang i hak på en telefon, der viser 120
#    · bløde i sig selv — computerens 1920×1080 var opskaleret
#      fra noget mindre, og telefonens er en SELVSTÆNDIG film
#      (bredere udsnit), ikke et klip af computerens
#    · ingen farvemærkning, og slutbilledet var trukket ud som
#      BT.601, mens browseren viser HD som BT.709 — 4 trin i rød
#      og grøn til forskel, når filmen tages væk
#
#  Kilderne er de to film opskaleret til 2K og 60 billeder i
#  sekundet (Higgsfield, ByteDance-opskalering, "aigc"). De ligger
#  IKKE i repoet (26 MB) — giv stierne med:
#
#    sh vaerktoej/lav-tapasfilm.sh kilde-16x9.mp4 kilde-4x3.mp4
#
#  MÅLT mod kilden ved skærmens opløsning (SSIM):
#    computer 1920×1080  gammel 0,953 → ny 0,979   2,8 MB
#    telefon  1200×900   gammel 0,946 → ny 0,973   1,5 MB
#  HEVC gav 0,984 på 2,5 MB — for lidt til en fil og en regel mere.
#
#  Plakaten (-start.jpg) og slutbilledet (-slut.jpg) er filmens
#  eget første og sidste billede, afkodet som BT.709 som i
#  browseren. Galleriet lægger filmen oven på slutbilledet og
#  tager den væk bagefter (js/skal/billedplads.js) — er de to ikke
#  ens, blinker det.
# ============================================================
set -e

KILDE_BRED=${1:?"giv 16:9-kilden med"}
KILDE_HOEJ=${2:?"giv 4:3-kilden med"}
FF=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")

# crf 26 og veryslow: filen laves én gang og hentes tusind gange.
# Farvemærket, så browseren ikke skal gætte.
lav() {
  kilde=$1; str=$2; navn=$3
  "$FF" -y -v error -i "$kilde" -vf "scale=$str:flags=lanczos" \
    -c:v libx264 -profile:v high -preset veryslow -crf 26 \
    -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
    -movflags +faststart -an "film/$navn.mp4"
  tmp=$(mktemp -d)
  "$FF" -y -v error -i "$kilde" -frames:v 1 \
    -vf "scale=$str:flags=lanczos:in_color_matrix=bt709:out_range=full" "$tmp/start.png"
  "$FF" -y -v error -sseof -0.1 -i "$kilde" -update 1 \
    -vf "scale=$str:flags=lanczos:in_color_matrix=bt709:out_range=full" "$tmp/slut.png"
  # Pillow med optimerede tabeller: ffmpegs egen JPEG var 30 % tungere
  # for det samme billede, og begge hentes, før filmen spiller.
  for del in start slut; do
    python3 -c "from PIL import Image; Image.open('$tmp/$del.png').convert('RGB').save('film/$navn-$del.jpg', quality=82, optimize=True, progressive=True)"
  done
  rm -rf "$tmp"
}

lav "$KILDE_BRED" 1920:1080 tapas-16x9
lav "$KILDE_HOEJ" 1200:900 tapas-4x3

ls -l film/tapas-*
