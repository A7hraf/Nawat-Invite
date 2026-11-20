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
    "bab-al-noor":     ("front_doors", {"door": "#F1E2CF", "gild": "#D9A85C", "wall": "#E9C9A8", "floor": "#D8B796", "light": "#FFD6A3", "metal": "#D9A85C", "rough": 0.5, "recess": 0.78, "void": "#2A1A12"}),
    "bab-al-noor-old":     ("doors", {"wall": "#CDB592", "wood": ("#6B4226", "#3B2314"), "inside": "#FFC983", "floor": "#B89B76", "studs": True, "hdri": "sunset", "petal": "#A01E2E"}),
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
    "blush-letter":    ("front_envelope", {"paper": "#F3E4DF", "seal": "#B9727A", "metal": "#D9B07C", "light": "#FFD9C7", "ribbon": "#E7C3C0", "void": "#2A1E1F"}),
    "noir-monogram":   ("envelope", {}),
}
CONCEPTS.update({
    "andalus-zellige": ("front_doors", {"door": "#8A5A36", "grain": True, "carving": "girih", "gild": "#C9A24E", "wall": "#EDE3D1", "floor": "#CDBFA6", "light": "#FFD9A0", "metal": "#C9A24E", "recess": 0.55, "rough": 0.5, "void": "#1C1410"}),
    "riad-jasmine":    ("front_doors", {"door": "#2F6B63", "carving": "studs", "wall": "#F1E8D8", "floor": "#E5D9C5", "light": "#FFF0D2", "metal": "#C9A45C", "recess": 0.6, "void": "#1A2420"}),
    "isfahan-mirror":  ("front_doors", {"door": "#1E3A78", "carving": "arabesque", "gild": "#D8B45E", "wall": "#22355F", "floor": "#14203F", "light": "#FFD58A", "metal": "#D8B45E", "recess": 0.55, "coat": 0.6, "rough": 0.3, "key": 360, "void": "#070B18"}),
    "emerald-deco":    ("front_doors", {"door": "#0F4A3A", "carving": "deco", "gild": "#D4AF63", "wall": "#131816", "floor": "#1A1A1A", "light": "#FFF1D6", "metal": "#D4AF63", "recess": 0.5, "coat": 1.0, "rough": 0.22, "key": 380, "void": "#050807"}),
    "muscat-sea":      ("front_doors", {"door": "#6B4426", "grain": True, "carving": "studs", "wall": "#F2ECE2", "floor": "#D9CBB5", "light": "#FFC9A0", "metal": "#D3AA58", "recess": 0.55, "rough": 0.55, "void": "#20160E"}),
    "majlis-velvet":   ("front_curtains", {"drape": "#6E1424", "fabric": "velvet", "metal": "#D2A957", "light": "#FFC98A", "void": "#120406"}),
    "rouge-noir":      ("front_curtains", {"drape": "#3E0A10", "fabric": "velvet", "metal": "#C9A25A", "light": "#FFB27A", "key": 460, "void": "#050203"}),
    "henna-night":     ("front_curtains", {"drape": "#164A36", "fabric": "velvet", "metal": "#E2B04A", "light": "#FFC46E", "void": "#06120D"}),
    "desert-rose":     ("front_curtains", {"drape": "#D8A48C", "fabric": "linen", "metal": "#C9A045", "light": "#FFC59A", "key": 300, "void": "#2A1610"}),
    "garden-veil":     ("front_curtains", {"drape": "#F6F3EA", "fabric": "sheer", "metal": "#CDB98A", "light": "#FFF6E4", "key": 260, "void": "#DCE2D6"}),
    "layali-celestial": ("front_lattice", {"wood": "#1B2238", "pattern": "stars", "metal": "#D9B062", "light": "#FFC071", "void": "#03050C"}),
    "fanous-lantern":  ("front_lattice", {"brass": "#C99A4A", "pattern": "interlace", "metal": "#C99A4A", "light": "#FFB25E", "void": "#06070F", "key": 120}),
    "marble-peony":    ("front_gatefold", {"paper": "#F6EEEA", "foil": "#C99A86", "band": "#E2B5B4", "seal": "#D18B95", "light": "#FFE7E0", "void": "#3A2D2D", "emblem": "rose"}),
    "mocha-champagne": ("front_gatefold", {"paper": "#E9DCC6", "foil": "#C9A05A", "band": "#6B4A35", "seal": "#5A3A28", "light": "#FFE2B0", "void": "#1E140D", "emblem": "khatam"}),
    "vellum-garden":   ("front_gatefold", {"paper": "#F4F6EF", "foil": "#7E8F74", "band": "#B79C77", "seal": "#8FA58A", "light": "#FFF2DC", "void": "#2A3328", "emblem": "rose", "vellum": True}),
    "noir-monogram":   ("front_envelope", {"paper": "#2A292C", "seal": "#3B3B41", "metal": "#D9DCE2", "light": "#FFF1DA", "void": "#050505", "emblem": "crescent", "lace": "geo"}),
    "dana-pearl":      ("front_envelope", {"paper": "#F4EEE6", "seal": "#D9C3A6", "metal": "#E8D7B8", "light": "#FFF4E2", "void": "#2A2420", "emblem": "rose", "lace": "pearl"}),
    "blanc-royale":    ("front_envelope", {"paper": "#FBFAF7", "seal": "#E9E4DA", "metal": "#D8B567", "light": "#FFF8EC", "void": "#2A2724", "emblem": "khatam"}),
})

concept, art = CONCEPTS[SLUG]
mod = importlib.import_module("concepts." + concept)
lib.setup(opt("--samples", 16), opt("--res", 540))
ctx = {
    "slug": SLUG, "theme": theme, "P": theme["palette"], "S": theme["scene"], "art": art,
    "dir": os.path.join(lib.ROOT, "public", "themes", SLUG), "out": OUT, "seed": sum(map(ord, SLUG)),
}
os.makedirs(OUT, exist_ok=True)
mod.build(ctx)
if concept.startswith("front_"):
    lib.motion_blur(True, 0.4)
if "--info" in args:
    print("FILM_END", lib.scn.frame_end); sys.exit(0)
for _n in filter(None, os.environ.get("FILM_HIDE", "").split(",")):
    for _o in lib.bpy.data.objects:
        if _o.name.startswith(_n): _o.hide_render = True
        if _o.name.startswith(_n) and _o.animation_data: _o.animation_data_clear()
lib.render(OUT, still=opt("--still", 0), first=opt("--from", 1), last=min(opt("--to", lib.scn.frame_end), lib.scn.frame_end), step=opt("--step", 1))
