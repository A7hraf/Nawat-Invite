#!/usr/bin/env bash
# Render one theme's opening film in chunks, then encode.
#   scripts/film/render.sh <slug> <chunk 1|2|3|4|encode>
# Chunks 1-3 render every other frame (12 fps); chunk 4 renders the in-between
# frames of the seal break and flap fold, where interpolation would smear.
set -euo pipefail
cd "$(dirname "$0")/../.."
slug=$1; part=$2; out=.data/film/$slug
scene="${FILM_SCENE:-scripts/film/scene.py}"
render() { python3 "$scene" "$slug" "$out" --samples 8 --res 540 --step 2 --from "$1" --to "$2"; }
case $part in
  1) render 1 59 ;;
  2) render 61 119 ;;
  3) render 121 173
     for f in 175 177 179; do cp "$out/f_0173.png" "$out/f_$(printf %04d $f).png"; done ;;  # the hold is static
  4) render 30 84 ;;
  encode)
     [ -f "$out/f_0084.png" ] || render 30 84
     a=$(mktemp -d); b=$(mktemp -d); i=0
     for n in $(seq 1 2 179); do cp "$out/f_$(printf %04d $n).png" "$a/$(printf %04d $i).png"; i=$((i+1)); done
     ffmpeg -nostdin -v error -y -framerate 12 -i "$a/%04d.png" \
       -vf "minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" -start_number 1 "$b/%04d.png"
     # output frame k shows scene frame k; put the real renders back wherever they exist
     for f in "$out"/f_*.png; do n=$((10#$(basename "$f" .png | cut -c3-))); [ -f "$b/$(printf %04d $n).png" ] && cp "$f" "$b/$(printf %04d $n).png"; done
     ffmpeg -nostdin -v error -y -framerate 24 -start_number 1 -i "$b/%04d.png" \
       -vf "scale=720:1280:flags=lanczos,format=yuv420p" -c:v libx264 -preset veryfast -crf 21 -movflags +faststart -an "public/themes/$slug/opening.mp4"
     ffmpeg -nostdin -v error -y -i "$out/f_0001.png" -vf scale=720:1280:flags=lanczos -quality 80 "public/themes/$slug/opening-start.webp"
     rm -rf "$a" "$b"; ls -la "public/themes/$slug/opening.mp4" ;;
esac
