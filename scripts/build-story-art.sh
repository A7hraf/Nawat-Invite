#!/bin/bash
# Builds the storybook art for every theme in public/themes/<slug>/:
#   reveal.webp  painted scene (from .data/painted/<slug>.png when present, else the existing photo)
#   relief.webp  the same scene as embossed ivory paper (scripts/make-relief.py)
#   venue.webp / closing.webp  crops of the painted scene
# Also copies the shared embossed envelope to public/themes/_shared/envelope.webp.
set -euo pipefail
cd "$(dirname "$0")/.."
TMP=$(mktemp -d)
[ -f .data/envelope.png ] && node -e 'require("sharp")(".data/envelope.png").resize(1080,1920,{fit:"fill"}).webp({quality:86}).toFile("public/themes/_shared/envelope.webp")'
for dir in public/themes/*/; do
  slug=$(basename "$dir"); [ "$slug" = "_shared" ] && continue
  if [ -f ".data/painted/$slug.png" ]; then
    python3 -c "
import cv2,sys
im=cv2.imread('.data/painted/$slug.png'); im=cv2.resize(im,(1080,1936),interpolation=cv2.INTER_LANCZOS4)[8:1928]
b=cv2.GaussianBlur(im,(0,0),1.2); im=cv2.addWeighted(im,1.35,b,-.35,0); cv2.imwrite('$TMP/$slug.png',im)"
    node -e "const s=require('sharp');const f='$TMP/$slug.png',d='$dir';Promise.all([
      s(f).webp({quality:86}).toFile(d+'reveal.webp'),
      s(f).extract({left:0,top:1040,width:1080,height:810}).resize(1200,900).webp({quality:82}).toFile(d+'venue.webp'),
      s(f).extract({left:90,top:560,width:900,height:1125}).resize(960,1200).webp({quality:82}).toFile(d+'closing.webp')])"
  else
    node -e "require('sharp')('${dir}reveal.webp').png().toFile('$TMP/$slug.png')"
  fi
  python3 scripts/make-relief.py "$TMP/$slug.png" "$TMP/$slug-relief.png"
  node -e "require('sharp')('$TMP/$slug-relief.png').webp({quality:84}).toFile('${dir}relief.webp')"
  rm -f "${dir}cover.webp"
  echo "✓ $slug"
done
rm -rf "$TMP"
