"""Derive a page palette from each theme's painting so page, film and art share one colour story.
   python3 scripts/palette/derive.py > .data/derived-palettes.json"""
import colorsys, json, os, sys
import numpy as np
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
th = json.load(open(os.path.join(ROOT, ".data", "themes.json")))

def hexs(c): return "#%02X%02X%02X" % tuple(int(max(0, min(255, round(v)))) for v in c)
def hls(c): return colorsys.rgb_to_hls(*(np.array(c) / 255))
def from_hls(h, l, s): return np.array(colorsys.hls_to_rgb(h, max(0, min(1, l)), max(0, min(1, s)))) * 255
def lum(c):
    c = np.array(c) / 255; c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True); return (la + 0.05) / (lb + 0.05)

out = {}
for t in th:
    img = Image.open(os.path.join(ROOT, "public/themes", t["slug"], "reveal.webp")).convert("RGB").resize((120, 214))
    px = np.asarray(img).reshape(-1, 3).astype(float)
    q = img.quantize(12, method=Image.Quantize.MEDIANCUT)
    pal = np.array(q.getpalette()[:36]).reshape(-1, 3).astype(float)
    counts = np.bincount(np.asarray(q).ravel(), minlength=12)
    cols = [(counts[i], pal[i]) for i in range(len(pal)) if counts[i] > 0]
    H = [(n, c, *hls(c)) for n, c in cols]          # n, rgb, h, l, s
    # hero hue: the most present colour with real saturation (weight by count * sat)
    hero = max(H, key=lambda x: x[0] * (x[4] ** 1.2) * (0.3 + min(x[3], 1 - x[3])))
    h0, s0 = hero[2], hero[4]
    # warm metallic accent: brightest saturated warm colour if present, else a lightened hero
    warm = [x for x in H if (x[2] < 0.15 or x[2] > 0.9) and x[4] > 0.25 and 0.35 < x[3] < 0.8]
    acc = max(warm, key=lambda x: x[0] * x[4]) if warm else hero
    ah, al, as_ = acc[2], acc[3], acc[4]
    night = from_hls(h0, 0.11, min(0.55, s0 * 0.9 + 0.1))
    night2 = from_hls(h0, 0.06, min(0.5, s0 * 0.8 + 0.1))
    glow = from_hls(h0, 0.36, min(0.6, s0 + 0.1))
    paper = from_hls(h0, 0.965, min(0.45, s0 * 0.5 + 0.08))
    paper2 = from_hls(h0, 0.985, min(0.4, s0 * 0.4 + 0.05))
    ink = from_hls(h0, 0.13, min(0.45, s0 * 0.7 + 0.08))
    muted = from_hls(h0, 0.4, min(0.25, s0 * 0.5))
    cream = from_hls(h0, 0.9, min(0.45, s0 * 0.6 + 0.1))
    mutedDark = from_hls(h0, 0.75, min(0.3, s0 * 0.5 + 0.05))
    accent = from_hls(ah, max(0.58, min(0.7, al)), max(0.45, min(0.75, as_)))
    accentText = from_hls(ah, 0.36, max(0.4, min(0.7, as_)))
    while contrast(accentText, paper) < 4.5: accentText = accentText * 0.9
    onAccent = night if contrast(night, accent) >= 4.5 else np.array([20, 16, 12.0])
    out[t["slug"]] = {k: hexs(v) for k, v in dict(night=night, night2=night2, glow=glow, paper=paper, paper2=paper2, ink=ink,
                      muted=muted, cream=cream, mutedDark=mutedDark, accent=accent, accentText=accentText, onAccent=onAccent).items()}
json.dump(out, sys.stdout, indent=1)
