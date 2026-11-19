"""
Nawat opening film: a 3D envelope that breaks its wax seal, opens, and hands the
card to the camera. Rendered with Blender (bpy) per theme.

  python3 scripts/film/scene.py <slug> <out_dir> [--still FRAME] [--samples N] [--res 720]

The last frames hold the theme's embossed card (relief.webp) full-frame so the
web StoryCard can take over without a visible cut.
"""
import json, math, os, sys
import bpy, bmesh
from mathutils import Vector

ROOT = os.path.dirname(os.path.abspath(__file__))
while ROOT != "/" and not os.path.exists(os.path.join(ROOT, "package.json")): ROOT = os.path.dirname(ROOT)
args = sys.argv[1:]
SLUG, OUT = args[0], os.path.abspath(args[1])
def opt(name, default):
    return type(default)(args[args.index(name) + 1]) if name in args else default
STILL = opt("--still", 0)
SAMPLES = opt("--samples", 20)
RES_W = opt("--res", 720)
FPS = 24
END = 180  # 7.5 s

theme = next(t for t in json.load(open(os.path.join(ROOT, ".data", "themes.json"))) if t["slug"] == SLUG)
P, S = theme["palette"], dict(theme["scene"])
# film-only art direction for themes whose web scene is not an envelope
S.update({
    "noir-monogram": {"paper": "#1E1D20", "seal": "#2A2A2E", "liner": "#0E0E10"},
    "rouge-noir": {"paper": "#17100F", "seal": "#8F1D26", "liner": "#5A1418"},
    "emerald-deco": {"paper": "#F3EEDF", "pattern": "deco"},
    "layali-celestial": {"pattern": "stars"},
    "isfahan-mirror": {"pattern": "stars"},
    "andalus-zellige": {"pattern": "lattice"},
}.get(SLUG, {}))
if not S.get("pattern"):
    S["pattern"] = {"deco": "deco", "star": "stars", "wave": "waves", "leaf": "leaves"}.get(theme.get("ornament"), "lattice")
DARK = theme["tone"] == "dark"
ART = os.path.join(ROOT, "public", "themes", SLUG)
os.makedirs(OUT, exist_ok=True)

def hexrgb(h, a=1.0):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, a)

def mix(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(4))

# ---------------------------------------------------------------- scene reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.engine = "CYCLES"
scn.cycles.device = "CPU"
scn.cycles.samples = SAMPLES
scn.cycles.use_adaptive_sampling = True
scn.cycles.adaptive_threshold = 0.05
scn.cycles.use_denoising = True
scn.cycles.max_bounces = 4
scn.cycles.diffuse_bounces = 2
scn.cycles.glossy_bounces = 2
scn.cycles.transmission_bounces = 2
scn.cycles.caustics_reflective = False
scn.cycles.caustics_refractive = False
scn.cycles.blur_glossy = 1.0
scn.render.resolution_x = RES_W
scn.render.resolution_y = int(RES_W * 16 / 9)
scn.render.fps = FPS
scn.frame_start, scn.frame_end = 1, END
scn.render.use_motion_blur = False
scn.render.motion_blur_shutter = 0.45
scn.view_settings.view_transform = "AgX"
scn.view_settings.look = "AgX - Medium High Contrast"
scn.render.use_persistent_data = True
scn.render.image_settings.file_format = "PNG"
scn.render.image_settings.color_mode = "RGB"
scn.render.image_settings.compression = 15

world = bpy.data.worlds.new("w"); scn.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = mix(hexrgb(P["night"]), (1, 1, 1, 1), 0.15) if DARK else hexrgb("#e9e2d6")
world.node_tree.nodes["Background"].inputs[1].default_value = 0.25 if DARK else 0.45

# ---------------------------------------------------------------- helpers
def node_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    return m, nt, bsdf

def image(path, non_color=False):
    img = bpy.data.images.load(path, check_existing=True)
    if non_color: img.colorspace_settings.name = "Non-Color"
    return img

def paper_bump(nt, bsdf, scale=180.0, strength=0.12):
    """Fine paper fibre: two noise layers into a bump node."""
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n1 = nt.nodes.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = scale; n1.inputs["Detail"].default_value = 8
    n2 = nt.nodes.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = scale / 9; n2.inputs["Detail"].default_value = 3
    nt.links.new(tc.outputs["Object"], n1.inputs["Vector"]); nt.links.new(tc.outputs["Object"], n2.inputs["Vector"])
    add = nt.nodes.new("ShaderNodeMath"); add.operation = "ADD"
    nt.links.new(n1.outputs["Fac"], add.inputs[0]); nt.links.new(n2.outputs["Fac"], add.inputs[1])
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = strength; bump.inputs["Distance"].default_value = 0.02
    nt.links.new(add.outputs[0], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return bump

def poly_obj(name, pts, z, thick=0.004, mats=(), faces=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([(x, y, 0) for x, y in pts], [], faces or [list(range(len(pts)))])
    me.update()
    ob = bpy.data.objects.new(name, me); scn.collection.objects.link(ob)
    ob.location.z = z
    # planar UVs in object space, normalised to the envelope box
    bm = bmesh.new(); bm.from_mesh(me)
    uv = bm.loops.layers.uv.new()
    for f in bm.faces:
        for l in f.loops:
            l[uv].uv = ((l.vert.co.x + W / 2) / W, (l.vert.co.y + H / 2) / H)
    bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    if thick:
        sol = ob.modifiers.new("thick", "SOLIDIFY"); sol.thickness = thick; sol.offset = -1
        sol.material_offset = 1 if len(mats) > 1 else 0
        sol.material_offset_rim = 0
        bev = ob.modifiers.new("bev", "BEVEL"); bev.width = 0.0015; bev.segments = 2; bev.limit_method = "ANGLE"
    return ob

def ease(ob, path):
    if ob.animation_data and ob.animation_data.action:
        for fc in _fcurves(ob.animation_data.action):
            for k in fc.keyframe_points:
                k.interpolation = "BEZIER"; k.easing = "AUTO"
                k.handle_left_type = k.handle_right_type = "AUTO_CLAMPED"

def _fcurves(action):
    # Blender 4.4+ layered actions keep curves in channelbags
    if hasattr(action, "fcurves") and len(getattr(action, "fcurves", [])):
        return list(action.fcurves)
    out = []
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for bag in strip.channelbags:
                out.extend(bag.fcurves)
    return out

def key(ob, frame, **props):
    for k, v in props.items():
        setattr(ob, k, v)
        ob.keyframe_insert(data_path=k, frame=frame)

# ---------------------------------------------------------------- dimensions
CW, CH = 1.40, 1.40 * 16 / 9          # card, exactly 9:16
W, H = 1.58, CH + 0.20                # envelope
FH = 1.30                             # flap depth

# ---------------------------------------------------------------- materials
env_col = hexrgb(S["paper"]) if S.get("paper") else mix(hexrgb(P["paper2"]), hexrgb(theme["envelope"]), 0.38)

m_paper, nt, b = node_mat("paper")
b.inputs["Base Color"].default_value = env_col
b.inputs["Roughness"].default_value = 0.78
b.inputs["Subsurface Radius"].default_value = (0.02, 0.015, 0.01)
b.inputs["Sheen Weight"].default_value = 0.25
b.inputs["Sheen Tint"].default_value = (1, 1, 1, 1)
paper_bump(nt, b)

m_inner, nt, b = node_mat("paper-inner")
b.inputs["Base Color"].default_value = mix(env_col, (0, 0, 0, 1), 0.1)
b.inputs["Roughness"].default_value = 0.85
paper_bump(nt, b)

# liner: the theme's liner colour and pattern; the lines are metallic foil
from PIL import Image, ImageDraw, ImageFilter
LINER = os.path.join(OUT, "_liner.png"); LMASK = os.path.join(OUT, "_liner_mask.png")
pat = S.get("pattern") or {"envelope": "lattice"}.get(theme.get("opening"), "lattice")
mk = Image.new("L", (1024, 1024), 0); md = ImageDraw.Draw(mk)
if pat == "lattice":
    for i in range(-8, 9):
        md.line([(i * 128, 0), (i * 128 + 1024, 1024)], fill=255, width=5); md.line([(i * 128 + 1024, 0), (i * 128, 1024)], fill=255, width=5)
    for x in range(0, 1025, 128):
        for y in range(64, 1025, 128): md.ellipse((x - 9, y - 9, x + 9, y + 9), fill=255)
elif pat == "waves":
    for y in range(0, 1100, 64):
        md.line([(x, y + 18 * math.sin(x / 1024 * math.tau * 4)) for x in range(0, 1025, 8)], fill=255, width=5)
elif pat == "stars":
    import random as _r; _r.seed(3)
    for _ in range(140):
        x, y, r = _r.uniform(0, 1024), _r.uniform(0, 1024), _r.uniform(5, 14)
        md.polygon([(x + (r if k % 2 == 0 else r * 0.4) * math.cos(k * math.pi / 4), y + (r if k % 2 == 0 else r * 0.4) * math.sin(k * math.pi / 4)) for k in range(8)], fill=255)
elif pat == "deco":
    for cx in range(0, 1025, 256):
        for cy in range(0, 1025, 256):
            for r in range(40, 130, 30): md.arc((cx - r, cy - r, cx + r, cy + r), 180, 360, fill=255, width=5)
else:  # leaves
    import random as _r; _r.seed(5)
    for _ in range(90):
        x, y, a_ = _r.uniform(0, 1024), _r.uniform(0, 1024), _r.uniform(0, math.pi)
        dx, dy = 34 * math.cos(a_), 34 * math.sin(a_)
        md.line([(x - dx, y - dy), (x + dx, y + dy)], fill=255, width=4)
        for t_ in (-0.5, 0, 0.5):
            px, py = x + dx * t_, y + dy * t_
            md.ellipse((px - 10 + dy * 0.3, py - 5 - dx * 0.3, px + 10 + dy * 0.3, py + 5 - dx * 0.3), fill=255)
mk = mk.filter(ImageFilter.GaussianBlur(1.2)); mk.save(LMASK)
m_liner, nt, b = node_mat("liner")
tc = nt.nodes.new("ShaderNodeTexCoord")
mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (2.2, 2.2 * H / W, 1)
mt = nt.nodes.new("ShaderNodeTexImage"); mt.image = image(LMASK, non_color=True)
nt.links.new(tc.outputs["UV"], mp.inputs["Vector"]); nt.links.new(mp.outputs[0], mt.inputs["Vector"])
lc = hexrgb(S.get("liner") or P["glow"]); gc = hexrgb(S.get("linerLine") or S.get("metal") or P["accent"])
mxl = nt.nodes.new("ShaderNodeMix"); mxl.data_type = "RGBA"; mxl.inputs["A"].default_value = lc; mxl.inputs["B"].default_value = gc
nt.links.new(mt.outputs["Color"], mxl.inputs["Factor"]); nt.links.new(mxl.outputs["Result"], b.inputs["Base Color"])
nt.links.new(mt.outputs["Color"], b.inputs["Metallic"])
rr = nt.nodes.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.62; rr.inputs["To Max"].default_value = 0.25
nt.links.new(mt.outputs["Color"], rr.inputs["Value"]); nt.links.new(rr.outputs[0], b.inputs["Roughness"])
b.inputs["Sheen Weight"].default_value = 0.4
paper_bump(nt, b, strength=0.05)

# card: the embossed relief, lit for real
m_card, nt, b = node_mat("card")
tc = nt.nodes.new("ShaderNodeTexCoord")
tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = image(os.path.join(ART, "relief.webp")); tex.interpolation = "Cubic"
nt.links.new(tc.outputs["UV"], tex.inputs["Vector"])
nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
b.inputs["Roughness"].default_value = 0.7
b.inputs["Sheen Weight"].default_value = 0.2
bw = nt.nodes.new("ShaderNodeRGBToBW"); nt.links.new(tex.outputs["Color"], bw.inputs[0])
bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.08; bump.inputs["Distance"].default_value = 0.01
nt.links.new(bw.outputs[0], bump.inputs["Height"]); nt.links.new(bump.outputs[0], b.inputs["Normal"])
# a slightly emissive lift so the card reads like the web relief once it fills the frame
em = nt.nodes.new("ShaderNodeEmission"); nt.links.new(tex.outputs["Color"], em.inputs["Color"])
cardEm = em.inputs["Strength"]; cardEm.default_value = 0.0
add = nt.nodes.new("ShaderNodeAddShader")
out = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
nt.links.new(b.outputs[0], add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1]); nt.links.new(add.outputs[0], out.inputs[0])

m_cardback, nt, b = node_mat("card-back")
b.inputs["Base Color"].default_value = hexrgb(P["paper2"]); b.inputs["Roughness"].default_value = 0.8

# wax
seal_hex = S.get("seal") or P["glow"]
m_wax, nt, b = node_mat("wax")
b.inputs["Base Color"].default_value = hexrgb(seal_hex)
b.inputs["Roughness"].default_value = 0.42
b.inputs["Coat Weight"].default_value = 0.25
b.inputs["Coat Roughness"].default_value = 0.25
attr = nt.nodes.new("ShaderNodeVertexColor"); attr.layer_name = "emb"
ramp = nt.nodes.new("ShaderNodeMapRange"); ramp.inputs["From Min"].default_value = 0.72; ramp.inputs["From Max"].default_value = 0.9
nt.links.new(attr.outputs["Color"], ramp.inputs["Value"])
mxc = nt.nodes.new("ShaderNodeMix"); mxc.data_type = "RGBA"; mxc.inputs["A"].default_value = mix(hexrgb(S.get("seal") or P["glow"]), (0, 0, 0, 1), 0.3); mxc.inputs["B"].default_value = hexrgb(S.get("metal") or P["accent"])
nt.links.new(ramp.outputs[0], mxc.inputs["Factor"]); nt.links.new(mxc.outputs["Result"], b.inputs["Base Color"])
gm_ = nt.nodes.new("ShaderNodeMath"); gm_.operation = "MULTIPLY"; gm_.inputs[1].default_value = 0.85
nt.links.new(ramp.outputs[0], gm_.inputs[0]); nt.links.new(gm_.outputs[0], b.inputs["Metallic"])
b.inputs["Subsurface Radius"].default_value = (0.05, 0.02, 0.01)
# gold dust in the emblem recesses
m_gold, nt, b = node_mat("gold")
b.inputs["Base Color"].default_value = hexrgb(S.get("metal") or P["accent"])
b.inputs["Metallic"].default_value = 1.0; b.inputs["Roughness"].default_value = 0.28

# table surface
m_table, nt, b = node_mat("table")
tc = nt.nodes.new("ShaderNodeTexCoord")
tex_path = os.path.join(ART, "texture.webp")
if DARK:
    b.inputs["Base Color"].default_value = mix(hexrgb(P["night"]), hexrgb(P["glow"]), 0.35)
    b.inputs["Roughness"].default_value = 0.9
    b.inputs["Sheen Weight"].default_value = 1.0
    b.inputs["Sheen Roughness"].default_value = 0.35
    b.inputs["Sheen Tint"].default_value = mix(hexrgb(P["glow"]), (1, 1, 1, 1), 0.4)
    if os.path.exists(tex_path):
        mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1.4, 1.4, 1)
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = image(tex_path)
        nt.links.new(tc.outputs["UV"], mp.inputs["Vector"]); nt.links.new(mp.outputs[0], tex.inputs["Vector"])
        mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "MULTIPLY"; mx.inputs["Factor"].default_value = 0.6
        mx.inputs["A"].default_value = b.inputs["Base Color"].default_value
        nt.links.new(tex.outputs["Color"], mx.inputs["B"]); nt.links.new(mx.outputs["Result"], b.inputs["Base Color"])
    paper_bump(nt, b, scale=60, strength=0.25)
else:
    # linen: woven waves in two directions
    # a tinted mid-tone linen so the ivory envelope stands out
    base = mix(hexrgb(S.get("liner") or P["glow"]), hexrgb(P["paper"]), 0.42)
    b.inputs["Base Color"].default_value = base
    b.inputs["Roughness"].default_value = 0.88
    b.inputs["Sheen Weight"].default_value = 0.6
    w1 = nt.nodes.new("ShaderNodeTexWave"); w1.wave_type = "BANDS"; w1.bands_direction = "X"; w1.inputs["Scale"].default_value = 90; w1.inputs["Distortion"].default_value = 2
    w2 = nt.nodes.new("ShaderNodeTexWave"); w2.wave_type = "BANDS"; w2.bands_direction = "Y"; w2.inputs["Scale"].default_value = 90; w2.inputs["Distortion"].default_value = 2
    nt.links.new(tc.outputs["Object"], w1.inputs["Vector"]); nt.links.new(tc.outputs["Object"], w2.inputs["Vector"])
    a2 = nt.nodes.new("ShaderNodeMath"); a2.operation = "MULTIPLY"
    nt.links.new(w1.outputs["Fac"], a2.inputs[0]); nt.links.new(w2.outputs["Fac"], a2.inputs[1])
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35; bump.inputs["Distance"].default_value = 0.01
    nt.links.new(a2.outputs[0], bump.inputs["Height"]); nt.links.new(bump.outputs[0], b.inputs["Normal"])
    ramp = nt.nodes.new("ShaderNodeMix"); ramp.data_type = "RGBA"; ramp.inputs["A"].default_value = mix(base, (0, 0, 0, 1), 0.08); ramp.inputs["B"].default_value = base
    nt.links.new(a2.outputs[0], ramp.inputs["Factor"]); nt.links.new(ramp.outputs["Result"], b.inputs["Base Color"])

# ---------------------------------------------------------------- geometry
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))
table = bpy.context.object; table.scale = (14, 14, 1); table.data.materials.append(m_table)

back = poly_obj("back", [(-W/2, -H/2), (W/2, -H/2), (W/2, H/2), (-W/2, H/2)], 0.004, mats=(m_liner, m_paper))

card = poly_obj("card", [(-CW/2, -CH/2), (CW/2, -CH/2), (CW/2, CH/2), (-CW/2, CH/2)], 0.011, thick=0.005, mats=(m_card, m_cardback))
# exact 0..1 UVs on the card itself
me = card.data; bm = bmesh.new(); bm.from_mesh(me); uv = bm.loops.layers.uv.active
for f in bm.faces:
    for l in f.loops: l[uv].uv = ((l.vert.co.x + CW/2) / CW, (l.vert.co.y + CH/2) / CH)
bm.to_mesh(me); bm.free()
card_rest_y = -0.03

notch = H/2 - 0.52
pocket = poly_obj("pocket", [(-W/2, -H/2), (W/2, -H/2), (W/2, H/2 - 0.03), (0, notch), (-W/2, H/2 - 0.03), (0, -H/2)], 0.019, mats=(m_paper, m_inner),
                  faces=[[5, 1, 2, 3], [0, 5, 3, 4]])
bottom = poly_obj("bottom-flap", [(-W/2, -H/2), (W/2, -H/2), (W*0.06, -0.02), (-W*0.06, -0.02)], 0.024, mats=(m_paper, m_inner))

# flap with a softly rounded point; origin on the hinge
tip = []
for i in range(9):
    a = math.pi + i * math.pi / 8
    tip.append((0.16 * math.cos(a), -FH + 0.16 + 0.16 * math.sin(a) * 0.55))
flap_pts = [(-W/2, 0.0)] + [(x * (1 + 0.0), y) for x, y in tip] + [(W/2, 0.0)]
flap_pts = [(-W/2, 0.0), (-0.22, -FH + 0.22)] + tip[1:-1] + [(0.22, -FH + 0.22), (W/2, 0.0)]
flap = poly_obj("flap", flap_pts, 0.0, mats=(m_paper, m_liner))
flap.location = (0, H/2, 0.03)
# UVs for the liner side: map flap space into envelope space
me = flap.data; bm = bmesh.new(); bm.from_mesh(me); uv = bm.loops.layers.uv.active
for f in bm.faces:
    for l in f.loops: l[uv].uv = ((l.vert.co.x + W/2) / W, (l.vert.co.y + H) / H)
bm.to_mesh(me); bm.free()

# wax seal: a soft irregular disc with a pressed emblem (height map)
EMB = os.path.join(OUT, "_emblem.png")
im = Image.new("L", (1024, 1024), 0); d = ImageDraw.Draw(im)
c = 512
# bold die: beaded ring, a deep eight-point khatam and a raised centre boss
d.ellipse((c-440, c-440, c+440, c+440), fill=120)
for i in range(32):
    a = i / 32 * math.tau; r = 400
    d.ellipse((c + r*math.cos(a) - 16, c + r*math.sin(a) - 16, c + r*math.cos(a) + 16, c + r*math.sin(a) + 16), fill=230)
d.ellipse((c-360, c-360, c+360, c+360), fill=40)
def star(r1, r2, n=8, rot=0):
    return [(c + (r1 if k % 2 == 0 else r2) * math.cos(rot + k * math.pi / n), c + (r1 if k % 2 == 0 else r2) * math.sin(rot + k * math.pi / n)) for k in range(2 * n)]
d.polygon(star(330, 250), fill=245)
d.polygon(star(330, 250, rot=math.pi / 8), fill=245)
d.polygon(star(230, 170), fill=110)
d.polygon(star(230, 170, rot=math.pi / 8), fill=110)
d.ellipse((c-120, c-120, c+120, c+120), fill=255)
d.ellipse((c-60, c-60, c+60, c+60), fill=150)
im = im.filter(ImageFilter.GaussianBlur(7)); im.save(EMB)

SEAL_R = 0.25
import numpy as np
EMB_A = np.asarray(Image.open(EMB), dtype=np.float32) / 255.0
def emb(x, y, r_in):
    u = (x / r_in * 0.5 + 0.5) * (EMB_A.shape[1] - 1); v = (0.5 - y / r_in * 0.5) * (EMB_A.shape[0] - 1)
    u = min(max(u, 0), EMB_A.shape[1] - 1.001); v = min(max(v, 0), EMB_A.shape[0] - 1.001)
    i, j = int(v), int(u); fv, fu = v - i, u - j
    a = EMB_A[i, j] * (1 - fu) + EMB_A[i, j + 1] * fu; b = EMB_A[i + 1, j] * (1 - fu) + EMB_A[i + 1, j + 1] * fu
    return float(a * (1 - fv) + b * fv)

def rim_r(a):
    return SEAL_R * (1 + 0.05 * math.sin(5 * a + 1.3) + 0.03 * math.sin(11 * a + 0.4) + 0.018 * math.sin(19 * a + 2.0))

def crack(y):
    return 0.016 * math.sin(y * 31 + 0.5) + 0.008 * math.sin(y * 77)

def height(t, x, y):
    R_IN = 0.70
    lip = 0.040
    if t >= 0.80:   # rounded outer lip falling to the paper
        q = (t - 0.80) / 0.20
        return lip * math.sqrt(max(0.0, 1 - q * q)) ** 0.8
    if t >= R_IN:   # raised ring around the pressed die
        q = (t - R_IN) / (0.80 - R_IN)
        return 0.024 + (lip - 0.024) * (0.5 - 0.5 * math.cos(q * math.pi))
    return 0.018 + 0.017 * emb(x, y, R_IN * SEAL_R * 1.0)

def make_seal(name, side):
    rings, segs = 70, 150
    a0 = -math.pi / 2 if side > 0 else math.pi / 2
    bm = bmesh.new()
    col = bm.loops.layers.color.new("emb")
    grid = []
    for j in range(rings + 1):
        t = 0.003 + (1 - 0.003) * j / rings
        row = []
        for k in range(segs + 1):
            a = a0 + math.pi * k / segs
            r = t * rim_r(a)
            x, y = r * math.cos(a), r * math.sin(a)
            z = height(t, x, y)
            x += crack(y) * max(0.0, 1 - abs(x) / SEAL_R)
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    top = []
    for j in range(rings):
        for k in range(segs):
            f = bm.faces.new((grid[j][k], grid[j][k + 1], grid[j + 1][k + 1], grid[j + 1][k]))
            top.append(f)
    # the broken face along the crack
    ray = [grid[j][0] for j in range(rings, -1, -1)] + [grid[j][segs] for j in range(rings + 1)]
    base = [bm.verts.new((v.co.x, v.co.y, 0.0)) for v in ray]
    wall = []
    for i in range(len(ray) - 1):
        try: wall.append(bm.faces.new((ray[i], ray[i + 1], base[i + 1], base[i])))
        except ValueError: pass
    bmesh.ops.recalc_face_normals(bm, faces=top + wall)
    for f in top:
        f.smooth = True
        for l in f.loops:
            t = math.hypot(l.vert.co.x, l.vert.co.y) / SEAL_R
            e = emb(l.vert.co.x, l.vert.co.y, 0.70 * SEAL_R) if t < 0.70 else 0.0
            l[col] = (e, e, e, 1)
    for f in wall: f.smooth = False
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scn.collection.objects.link(ob)
    ob.data.materials.append(m_wax)
    return ob

seal_y = H/2 - FH + 0.20
sealL, sealR = make_seal("sealL", -1), make_seal("sealR", 1)
for s_ in (sealL, sealR):
    s_.location = (0, seal_y, 0.030)

# scattered rose petals: curled heart-shaped sheets, translucent
m_petal, nt, b = node_mat("petal")
pc = hexrgb(S.get("liner") or P["glow"])
pc = mix(pc, (1, 1, 1, 1), 0.1 if DARK else 0.2)
attr = nt.nodes.new("ShaderNodeVertexColor"); attr.layer_name = "pv"
mxc = nt.nodes.new("ShaderNodeMix"); mxc.data_type = "RGBA"; mxc.inputs["A"].default_value = mix(pc, (0, 0, 0, 1), 0.35); mxc.inputs["B"].default_value = pc
nt.links.new(attr.outputs["Color"], mxc.inputs["Factor"]); nt.links.new(mxc.outputs["Result"], b.inputs["Base Color"])
b.inputs["Transmission Weight"].default_value = 0.0
b.inputs["Roughness"].default_value = 0.5; b.inputs["Sheen Weight"].default_value = 0.6
paper_bump(nt, b, scale=40, strength=0.15)
import random; random.seed(len(SLUG) * 13)
def petal(x, y, size, rot, curl):
    n = 22; bm = bmesh.new(); cl = bm.loops.layers.color.new("pv"); vs = []
    for i in range(n + 1):
        v = i / n
        w = (math.sin(math.pi * min(1, v * 1.08)) ** 0.7) * (0.55 + 0.45 * v) * 0.5
        row = []
        for j in range(n + 1):
            u = (j / n * 2 - 1)
            px, py = u * w * size, (v - 0.35) * size * 1.15
            notch = 0.06 * size * math.exp(-((u) ** 2) * 30) * max(0, v - 0.85) / 0.15
            py -= notch
            pz = curl * size * (u * u * 0.55 + (v - 0.45) ** 2 * 0.35) + 0.012
            row.append(bm.verts.new((px, py, pz)))
        vs.append(row)
    for i in range(n):
        for j in range(n):
            f = bm.faces.new((vs[i][j], vs[i][j + 1], vs[i + 1][j + 1], vs[i + 1][j])); f.smooth = True
            for l in f.loops:
                vv = (l.vert.co.y / (size * 1.15)) + 0.35
                l[cl] = (min(1, vv * 1.6),) * 3 + (1,)
    me = bpy.data.meshes.new("petal"); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new("petal", me); scn.collection.objects.link(ob)
    ob.location = (x, y, 0); ob.rotation_euler = (0, 0, rot)
    sol = ob.modifiers.new("t", "SOLIDIFY"); sol.thickness = 0.004
    me.materials.append(m_petal)
spots = [(-1.18, -1.2), (1.2, -0.62), (-1.22, 0.85), (1.15, 1.35), (0.92, -1.62), (-0.82, -1.78), (-1.35, 0.05), (1.32, 0.42), (-1.05, 1.6), (0.15, -1.85)]
for (x, y) in spots:
    petal(x + random.uniform(-0.08, 0.08), y + random.uniform(-0.08, 0.08), random.uniform(0.30, 0.40), random.uniform(0, math.tau), random.uniform(0.25, 0.6))

# ---------------------------------------------------------------- light: window light through a gobo
aim = bpy.data.objects.new("aim", None); scn.collection.objects.link(aim); aim.location = (0, 0.2, 0)
def area(name, loc, size, power, color, shape="SQUARE"):
    ld = bpy.data.lights.new(name, "AREA"); ld.size = size; ld.energy = power; ld.color = color; ld.shape = shape
    lo = bpy.data.objects.new(name, ld); scn.collection.objects.link(lo); lo.location = loc
    c = lo.constraints.new("TRACK_TO"); c.target = aim; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
    return lo
warm = (1.0, 0.9, 0.78)
keyl = area("key", (-6.5, 5.0, 8.5), 0.45, 5200 if DARK else 3000, warm)
fill = area("fill", (5.0, -6.0, 6.0), 8.0, 260 if DARK else 380, (0.88, 0.92, 1.0))
rim = area("rim", (3.0, 7.5, 2.6), 2.5, 900 if DARK else 600, tuple(mix(hexrgb(P["accent"]), (1, 1, 1, 1), 0.45)[:3]))
world.node_tree.nodes["Background"].inputs[1].default_value = 0.10 if DARK else 0.16

GOBO = os.path.join(OUT, "_gobo.png")
g = Image.new("L", (1024, 1024), 255); gd = ImageDraw.Draw(g)
for x in (340, 684): gd.rectangle((x - 30, 0, x + 30, 1024), fill=0)
for y in (330, 660): gd.rectangle((0, y - 26, 1024, y + 26), fill=0)
for i in range(26):   # a few leaves at the window's edge
    cx, cy = random.uniform(700, 1024), random.uniform(0, 420); rx, ry = random.uniform(30, 70), random.uniform(12, 24)
    gd.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=0)
g = g.filter(ImageFilter.GaussianBlur(3)); g.save(GOBO)
kp = Vector(keyl.location)
bpy.ops.mesh.primitive_plane_add(size=1, location=tuple(kp.lerp(Vector((0, 0.2, 0)), 0.72)))
gobo = bpy.context.object; gobo.scale = (4.2, 4.2, 1)
c = gobo.constraints.new("TRACK_TO"); c.target = aim; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
gm, nt, gb = node_mat("gobo")
nt.nodes.remove(gb)
outn = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
tr = nt.nodes.new("ShaderNodeBsdfTransparent"); hold = nt.nodes.new("ShaderNodeBsdfDiffuse"); hold.inputs[0].default_value = (0, 0, 0, 1)
mx = nt.nodes.new("ShaderNodeMixShader"); gt = nt.nodes.new("ShaderNodeTexImage"); gt.image = image(GOBO, non_color=True)
nt.links.new(gt.outputs["Color"], mx.inputs[0]); nt.links.new(hold.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2])
nt.links.new(mx.outputs[0], outn.inputs[0])
gobo.data.materials.append(gm)
gobo.visible_camera = False; gobo.visible_glossy = False; gobo.visible_diffuse = False

# ---------------------------------------------------------------- camera
cam_d = bpy.data.cameras.new("cam"); cam_d.lens = 50; cam_d.sensor_fit = "VERTICAL"; cam_d.sensor_height = 36
cam = bpy.data.objects.new("cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
target = bpy.data.objects.new("target", None); scn.collection.objects.link(target)
tt = cam.constraints.new("TRACK_TO"); tt.target = target; tt.track_axis = "TRACK_NEGATIVE_Z"; tt.up_axis = "UP_Y"
cam_d.dof.use_dof = True; cam_d.dof.focus_object = target; cam_d.dof.aperture_fstop = 0.9; cam_d.dof.aperture_blades = 7

# final framing: straight down, card filling the 9:16 frame
LIFT = 1.05
CARD_END = Vector((0, 0.15, LIFT))
cam_h = (CH * 0.985) / (36 / 50)   # visible height at distance = h * sensor/lens

def T(sec): return int(round(sec * FPS)) + 1

# opening shot: 3/4 view, slow push
key_cam = [
    (T(0.0), (0.45, -2.9, 5.0), (0, 0.15, 0.0)),
    (T(1.6), (0.32, -2.6, 4.6), (0, 0.22, 0.03)),
    (T(3.2), (0.18, -2.3, 5.2), (0, 0.55, 0.03)),
    (T(4.7), (0.08, -0.6, 6.0), (0, 1.75, 0.03)),
    (T(5.6), (0.03, -0.4, 5.4), (0, 0.9, 0.5)),
    (T(7.2), (0.0, CARD_END.y - 0.001, CARD_END.z + cam_h), tuple(CARD_END)),
    (END, (0.0, CARD_END.y - 0.001, CARD_END.z + cam_h), tuple(CARD_END)),
]
for f, loc, tgt in key_cam:
    key(cam, f, location=Vector(loc)); key(target, f, location=Vector(tgt))

# seal cracks and its halves slide apart
for s, side in ((sealL, -1), (sealR, 1)):
    key(s, T(0.0), location=Vector((0, seal_y, 0.030)), rotation_euler=(0, 0, 0))
    key(s, T(1.25), location=Vector((0, seal_y, 0.030)), rotation_euler=(0, 0, 0))
    key(s, T(1.55), location=Vector((0.03 * side, seal_y - 0.01, 0.034)), rotation_euler=(0, math.radians(4 * side), math.radians(-5 * side)))
    key(s, T(2.4), location=Vector((0.62 * side, seal_y - 0.55, 0.028)), rotation_euler=(0, math.radians(2 * side), math.radians(-32 * side)))

# flap opens
key(flap, T(0.0), rotation_euler=(0, 0, 0), location=Vector((0, H/2, 0.03)))
key(flap, T(1.7), rotation_euler=(0, 0, 0), location=Vector((0, H/2, 0.03)))
key(flap, T(2.45), rotation_euler=(math.radians(-95), 0, 0), location=Vector((0, H/2, 0.03)))
key(flap, T(3.1), rotation_euler=(math.radians(-176), 0, 0), location=Vector((0, H/2, 0.006)))
key(flap, T(3.4), rotation_euler=(math.radians(-180), 0, 0), location=Vector((0, H/2, 0.0045)))

# card slides fully out flat, then lifts toward the camera and settles
OUT_Y = card_rest_y + 2.66
key(card, T(0.0), location=Vector((0, card_rest_y, 0.011)), rotation_euler=(0, 0, 0))
key(card, T(2.9), location=Vector((0, card_rest_y, 0.011)), rotation_euler=(0, 0, 0))
key(card, T(4.7), location=Vector((0, OUT_Y, 0.011)), rotation_euler=(0, 0, 0))
key(card, T(5.0), location=Vector((0, OUT_Y - 0.05, 0.09)), rotation_euler=(math.radians(-3), 0, 0))
key(card, T(6.3), location=Vector((0, CARD_END.y + 0.25, LIFT * 0.9)), rotation_euler=(math.radians(-12), 0, 0))
key(card, T(7.2), location=CARD_END.copy(), rotation_euler=(0, 0, 0))
key(card, END, location=CARD_END.copy(), rotation_euler=(0, 0, 0))
cardEm.keyframe_insert("default_value", frame=T(6.0))
cardEm.default_value = 0.22; cardEm.keyframe_insert("default_value", frame=T(7.2))

kp_ = keyl.data.energy; fp_ = fill.data.energy
for f_, kv, fv in ((T(5.4), kp_, fp_), (T(7.2), kp_ * 0.3, fp_ * 3.2)):
    keyl.data.energy = kv; keyl.data.keyframe_insert("energy", frame=f_)
    fill.data.energy = fv; fill.data.keyframe_insert("energy", frame=f_)
for ob in (cam, target, sealL, sealR, flap, card):
    ease(ob, None)

# ---------------------------------------------------------------- render
for n in filter(None, os.environ.get("FILM_HIDE", "").split(",")):
    bpy.data.objects[n].hide_render = True
for n in filter(None, os.environ.get("FILM_NOMODS", "").split(",")):
    for m in list(bpy.data.objects[n].modifiers): bpy.data.objects[n].modifiers.remove(m)
scn.render.filepath = os.path.join(OUT, "f_####")
if STILL:
    scn.frame_set(STILL)
    scn.render.filepath = os.path.join(OUT, f"still_{STILL:04d}.png")
    bpy.ops.render.render(write_still=True)
else:
    first = opt("--from", 1); last = opt("--to", END)
    scn.frame_start, scn.frame_end, scn.frame_step = first, last, opt("--step", 1)
    bpy.ops.render.render(animation=True)
