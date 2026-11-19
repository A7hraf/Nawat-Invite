"""
Nawat opening films.

  python3 scripts/film/film.py <slug> <out_dir> [--still F] [--samples N] [--res 540] [--from A --to B --step S]

Each theme maps to a concept module in scripts/film/concepts/. Every film ends on the
theme's embossed card filling the frame, so the web page can cross-fade into it.
"""
import importlib, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib

args = sys.argv[1:]
SLUG, OUT = args[0], os.path.abspath(args[1])
def opt(name, default):
    return type(default)(args[args.index(name) + 1]) if name in args else default

theme = next(t for t in json.load(open(os.path.join(lib.ROOT, ".data", "themes.json"))) if t["slug"] == SLUG)

# theme -> (concept, art direction)
CONCEPTS = {
    "bab-al-noor":     ("doors", {"wall": "#CDB592", "wood": ("#6B4226", "#3B2314"), "inside": "#FFC983", "floor": "#B89B76", "studs": True, "hdri": "sunset", "petal": "#A01E2E"}),
    "andalus-zellige": ("doors", {"wall": "#EFE6D6", "wood": ("#9A6A3E", "#5C3A1E"), "inside": "#FFD9A0", "floor": "#D8CBB4", "tiles": ("#1F5E73", "#E3B65B", "#F4EEE2"), "hdri": "dawn", "rug": ("#1D3557", "#8C1C13", "#E3B65B"), "petal": "#E8A33D"}),
    "riad-jasmine":    ("doors", {"wall": "#E7C9B5", "wood": ("#3F6E64", "#22423B"), "inside": "#FFE2B8", "floor": "#E9DCC8", "petal": "#FBF7EE", "studs": True, "rug": ("#2F5248", "#E9DCC0", "#C79A4B"), "hdri": "park"}),
    "fanous-lantern":  ("lanterns", {"wall": "#7A5A44", "floor": "#5C4636", "glass": ["#F0A93B", "#C2303C", "#2E8A62", "#2E62B0", "#E8C25A"], "petal": "#B01E2D"}),
    "layali-celestial": ("sky", {"sky": "#0A1433", "horizon": "#5A3E6E", "sand": "#8C7A6A", "glow": "#FFB45E"}),
    "isfahan-mirror":  ("scroll", {"tiles": ("#EDE6D6", "#23467A", "#3E8E93", "#C9A045"), "paper": "#F3EAD7", "cord": "#1C3E78", "seal": "#1C3E78", "metal": "#D6B25E"}),
    "vellum-garden":   ("sleeve", {"linen": "#A9B59F", "ink": "#7E8F74", "twine": "#B79C77", "leaf": "#8FA59A", "rose": "#F6F1E8"}),
    "muscat-sea":      ("mandoos", {"wood": ("#5A3420", "#2C170C"), "silk": "#2D6F8E", "mat": ("#C9A877", "#A8875A"), "floor": "#2A2622", "wall": "#22414B", "dusk": "#6FA3BF", "petal": "#F2EADA"}),
    "dana-pearl":      ("shell", {"silk": "#B98A86", "shell": "#F2E4DC", "pearl": "#F7F1EA"}),
    "majlis-velvet":   ("curtains", {"velvet": "#6E1424", "wall": "#4A1C20", "floor": "#2E1A16", "rug": ("#5E1220", "#1E2338", "#D2A957"), "petal": "#9E1426"}),
    "mocha-champagne": ("gatefold", {"silk": "#B39478", "paper": "#E9DCC6", "foil": "#D4A84F", "ribbon": "#6B4A35", "rose": "#EADBC4", "leaf": "#8E9A84"}),
    "blanc-royale":    ("keepsake", {"box": "#F3EFE8", "ribbon": "#E8DCC4", "lining": "#F6F0E4", "marble": ("#EEEAE3", "#9C968D"), "rose": "#F8F3EA", "void": "#CFC8BE", "metal": "#D8B567"}),
    "emerald-deco":    ("keepsake", {"box": "#0F4A3A", "ribbon": "#D4AF63", "lining": "#E9DFC9", "marble": ("#1C2A26", "#C9B48A"), "rose": "#F1E7D2", "void": "#07120F", "emblem": "khatam", "key": 2000}),
    "rouge-noir":      ("keepsake", {"box": "#141012", "ribbon": "#8F1D26", "lining": "#7A1620", "marble": ("#121012", "#6A6066"), "rose": "#9C1324", "void": "#050304", "candle": "#1A1416", "key": 2200}),
    "garden-veil":     ("gatefold", {"silk": "#A7B39C", "paper": "#F4F0E6", "foil": "#C9A45E", "ribbon": "#8C9C82", "rose": "#F7F2EA", "leaf": "#8FA59A"}),
    "marble-peony":    ("gatefold", {"marble": ("#F1ECE7", "#B9AFA8"), "paper": "#F6E9E6", "foil": "#C99A86", "ribbon": "#D8A7A4", "rose": "#E9A9B2", "leaf": "#93A08C"}),
    "desert-rose":     ("scroll", {"tiles": ("#EADBC8", "#B5654A", "#D9A08A", "#C9A045"), "paper": "#F2E6D4", "cord": "#9E4A3A", "seal": "#9E4A3A", "metal": "#C9A045", "petal": "#C75B4F"}),
    "henna-night":     ("curtains", {"velvet": "#1E4A37", "wall": "#2E2416", "floor": "#22180F", "rug": ("#B4511A", "#1E3A2C", "#E2B04A"), "petal": "#E8901C"}),
    "blush-letter":    ("envelope", {}),
    "noir-monogram":   ("envelope", {}),
}

concept, art = CONCEPTS[SLUG]
mod = importlib.import_module("concepts." + concept)
lib.setup(opt("--samples", 16), opt("--res", 540))
ctx = {
    "slug": SLUG, "theme": theme, "P": theme["palette"], "S": theme["scene"], "art": art,
    "dir": os.path.join(lib.ROOT, "public", "themes", SLUG), "out": OUT, "seed": sum(map(ord, SLUG)),
}
os.makedirs(OUT, exist_ok=True)
mod.build(ctx)
lib.render(OUT, still=opt("--still", 0), first=opt("--from", 1), last=opt("--to", lib.END), step=opt("--step", 1))
