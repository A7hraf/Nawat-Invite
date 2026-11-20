"""
Doors, front on: a pair of carved doors in an arched frame fills the screen, in the colours of
the theme's painting. A line of light glows at the seam, the latch gives, the doors swing
inward with weight, light floods out and the camera passes through into the painting.
"""
import math, os, random
import bpy
from mathutils import Vector
import lib
from lib import *
from concepts.doors import carving, arch_outline, prism, DW, DH


def carving_kind(path, kind, seed, w_px=600, h_px=1750):
    """Height map for one door leaf (white = raised)."""
    from PIL import Image, ImageDraw, ImageFilter
    if kind == "rosette":
        return carving(path, w_px, h_px, seed)
    im = Image.new("L", (w_px, h_px), 120); d = ImageDraw.Draw(im)
    b = int(w_px * 0.07)
    d.rectangle((0, 0, w_px, h_px), fill=205); d.rectangle((b, b, w_px - b, h_px - b), fill=120)
    def star(cx, cy, r1, r2, n=8, rot=0):
        return [(cx + (r1 if k % 2 == 0 else r2) * math.cos(rot + k * math.pi / n), cy + (r1 if k % 2 == 0 else r2) * math.sin(rot + k * math.pi / n)) for k in range(2 * n)]
    if kind == "studs":         # Omani door: carved frame bands, rows of domed studs, a central boss
        for y in (int(h_px * 0.33), int(h_px * 0.66)):
            d.rectangle((b, y - 18, w_px - b, y + 18), fill=210)
        for y in range(b + 70, h_px - b - 40, 92):
            for x in range(b + 60, w_px - b - 30, 88):
                d.ellipse((x - 22, y - 22, x + 22, y + 22), fill=255)
        for x in (b // 2, w_px - b // 2):
            for y in range(40, h_px, 46):
                d.ellipse((x - 10, y - 10, x + 10, y + 10), fill=160)
    elif kind == "girih":       # interlaced ten-point stars and kites
        s_ = 150
        for gy in range(-s_, h_px + s_, s_):
            for gx in range(-s_, w_px + s_, s_):
                ox = s_ / 2 if (gy // s_) % 2 else 0
                cx, cy = gx + ox, gy
                d.polygon(star(cx, cy, 70, 40, n=10), fill=240)
                d.polygon(star(cx, cy, 44, 26, n=10), fill=150)
                d.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), fill=250)
        d.rectangle((0, 0, w_px, b), fill=205); d.rectangle((0, h_px - b, w_px, h_px), fill=205)
        d.rectangle((0, 0, b, h_px), fill=205); d.rectangle((w_px - b, 0, w_px, h_px), fill=205)
    elif kind == "deco":        # Art Deco: sunburst fans and stepped chevrons
        cx = w_px if seed % 2 == 0 else 0
        for i, y in enumerate((int(h_px * 0.2), int(h_px * 0.5), int(h_px * 0.8))):
            for r in range(60, 330, 40):
                d.arc((cx - r, y - r, cx + r, y + r), 90 if cx else -90, 270 if cx else 90, fill=245, width=7)
            for k in range(9):
                a = math.pi / 2 + k * math.pi / 8 if cx else -math.pi / 2 + k * math.pi / 8
                d.line([(cx, y), (cx + 330 * math.cos(a), y + 330 * math.sin(a))], fill=235, width=5)
        for y in range(b + 20, h_px - b, 26):
            d.line([(b + 10, y), (b + 40, y)], fill=230, width=6)
    elif kind == "arabesque":   # Persian arabesque: ogee medallions with curling vines
        for i, (y, r) in enumerate(((h_px * 0.2, 150), (h_px * 0.5, 210), (h_px * 0.8, 150))):
            cx = w_px / 2
            pts = [(cx + r * math.sin(t) * (1 + 0.25 * math.cos(2 * t)), y - r * 1.25 * math.cos(t)) for t in [k * math.tau / 80 for k in range(80)]]
            d.polygon(pts, fill=225)
            pts2 = [(cx + (r - 26) * math.sin(t) * (1 + 0.25 * math.cos(2 * t)), y - (r - 26) * 1.25 * math.cos(t)) for t in [k * math.tau / 80 for k in range(80)]]
            d.polygon(pts2, fill=130)
            d.polygon(star(cx, y, r * 0.5, r * 0.32, n=8), fill=245)
            for sgn in (-1, 1):
                vine = [(cx + sgn * (r + 20 + 60 * math.sin(t * 3)), y - 200 + 400 * t) for t in [k / 40 for k in range(41)]]
                d.line(vine, fill=235, width=8)
    im.filter(ImageFilter.GaussianBlur(3)).save(path)


def door_mat(name, A, hpath):
    """Painted / lacquered / wood finish with the carving as a normal-strength bump and a
    darker tone in the recesses (ambient occlusion feel)."""
    m, nt, b = node_mat(name)
    tc = nt.nodes.new("ShaderNodeTexCoord"); tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = image(hpath, non_color=True)
    nt.links.new(tc.outputs["UV"], tx.inputs["Vector"])
    base = hexrgb(A["door"]); deep = dim(base, A.get("recess", 0.62))
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.inputs["A"].default_value = deep; mx.inputs["B"].default_value = base
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.35; mr.inputs["From Max"].default_value = 0.75
    nt.links.new(tx.outputs["Color"], mr.inputs["Value"]); nt.links.new(mr.outputs[0], mx.inputs["Factor"])
    out_c = mx.outputs["Result"]
    if A.get("grain"):
        w = nt.nodes.new("ShaderNodeTexWave"); w.wave_type = "BANDS"; w.bands_direction = "X"
        w.inputs["Scale"].default_value = 3.0; w.inputs["Distortion"].default_value = 9; w.inputs["Detail"].default_value = 8
        mpw = nt.nodes.new("ShaderNodeMapping"); mpw.inputs["Scale"].default_value = (5, 0.4, 1)
        nt.links.new(tc.outputs["Object"], mpw.inputs["Vector"]); nt.links.new(mpw.outputs[0], w.inputs["Vector"])
        mg_ = nt.nodes.new("ShaderNodeMix"); mg_.data_type = "RGBA"; mg_.blend_type = "MULTIPLY"; mg_.inputs["Factor"].default_value = 0.35
        rr = nt.nodes.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.7; rr.inputs["To Max"].default_value = 1.15
        nt.links.new(w.outputs["Fac"], rr.inputs["Value"])
        cmb = nt.nodes.new("ShaderNodeCombineColor"); nt.links.new(rr.outputs[0], cmb.inputs[0]); nt.links.new(rr.outputs[0], cmb.inputs[1]); nt.links.new(rr.outputs[0], cmb.inputs[2])
        nt.links.new(out_c, mg_.inputs["A"]); nt.links.new(cmb.outputs[0], mg_.inputs["B"]); out_c = mg_.outputs["Result"]
    if A.get("gild"):   # gold on the highest carving
        g = nt.nodes.new("ShaderNodeMapRange"); g.inputs["From Min"].default_value = 0.82; g.inputs["From Max"].default_value = 0.9
        nt.links.new(tx.outputs["Color"], g.inputs["Value"])
        mg = nt.nodes.new("ShaderNodeMix"); mg.data_type = "RGBA"; mg.inputs["B"].default_value = hexrgb(A["gild"])
        nt.links.new(out_c, mg.inputs["A"]); nt.links.new(g.outputs[0], mg.inputs["Factor"]); out_c = mg.outputs["Result"]
        nt.links.new(g.outputs[0], b.inputs["Metallic"])
    nt.links.new(out_c, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = A.get("rough", 0.45); b.inputs["Coat Weight"].default_value = A.get("coat", 0.3)
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.9; bp.inputs["Distance"].default_value = 0.03
    nt.links.new(tx.outputs["Color"], bp.inputs["Height"]); nt.links.new(bp.outputs[0], b.inputs["Normal"])
    return m


def build(ctx):
    A = ctx["art"]; out = ctx["out"]; rnd = random.Random(ctx["seed"])
    colour_exact()
    world("studio", strength=0.1, rotate=0.4, camera_color=A.get("void", "#0C0907"))
    glare = bloom(0.3, threshold=0.92)

    hpath = os.path.join(out, "_carving.png"); carving_kind(hpath, A.get("carving", "rosette"), ctx["seed"])
    dm = door_mat("door", A, hpath)
    wall_m = mat("wall", hexrgb(A["wall"]), rough=0.9, bump=(10, 0.35))
    trim = gold("trim", A.get("metal", "#C9A24E"), rough=0.3)
    # the wall (XZ plane at y=0) with the arched opening
    wall = box("wall", (12, 0.5, 12), loc=(0, 0.25, 3.0), mat_=wall_m)
    cut = prism("cut", [(x, z if z > 0 else -0.5) for x, z in arch_outline()], -1, 1.5); cut.hide_render = True; cut.hide_viewport = True
    bo = wall.modifiers.new("hole", "BOOLEAN"); bo.object = cut; bo.operation = "DIFFERENCE"; bo.solver = "EXACT"
    frame = prism("frame", [(x, z if z > 0 else -0.02) for x, z in arch_outline(inset=-0.16)], -0.06, 0.02); fcut = prism("fcut", [(x, z if z > 0 else -0.5) for x, z in arch_outline()], -1, 1); fcut.hide_render = True; fcut.hide_viewport = True
    fb = frame.modifiers.new("h", "BOOLEAN"); fb.object = fcut; fb.operation = "DIFFERENCE"; fb.solver = "EXACT"
    frame.data.materials.append(trim)
    # leaves, hinged at the jambs, opening inward (+Y)
    lw = DW / 2 - 0.01; leaves = []
    for side in (-1, 1):
        hinge = bpy.data.objects.new(f"hinge{side}", None); link(hinge); hinge.location = (side * DW / 2, 0.06, 0)
        body = box(f"leaf{side}", (lw, 0.1, DH), loc=(-side * lw / 2, 0.0, DH / 2), mat_=dm, bevel=0.012)
        face = plane(f"face{side}", lw - 0.02, DH - 0.02, rot=(math.radians(90), 0, 0), mat_=dm)
        face.location = (-side * lw / 2, -0.052, DH / 2); face.parent = hinge; body.parent = hinge
        ring = torus("ring", 0.1, 0.013, loc=(-side * (lw - 0.16), -0.09, DH * 0.46), rot=(math.radians(90), 0, 0), mat_=trim); ring.parent = hinge
        boss = cylinder("boss", 0.04, 0.03, loc=(-side * (lw - 0.16), -0.07, DH * 0.46 + 0.1), rot=(math.radians(90), 0, 0), mat_=trim); boss.parent = hinge
        if A.get("carving") == "studs":   # real domed brass studs on the stud grid
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.04)
            proto = bpy.context.object; proto.name = "stud"; proto.scale = (1, 0.55, 1)
            for p_ in proto.data.polygons: p_.use_smooth = True
            proto.data.materials.append(trim)
            bpx = int(600 * 0.07)
            for py in range(bpx + 70, 1750 - bpx - 40, 92):
                for px in range(bpx + 60, 600 - bpx - 30, 88):
                    st = proto.copy(); link(st)
                    lx = (px / 600) * lw; lz = DH - (py / 1750) * DH
                    st.location = (-side * lw + side * lx if side > 0 else -side * lw - lx * (-1), -0.075, lz)
                    st.location.x = (-side * (lw - lx))
                    st.parent = hinge
            bpy.data.objects.remove(proto, do_unlink=True)
        leaves.append((hinge, side))
    # the arch above the doors: a glowing lattice
    tym = prism("tympanum", [(x, z) for x, z in arch_outline() if z >= DH - 1e-6], 0.04, 0.08)
    tym.data.materials.append(lattice_mat("jali", hexrgb(A["door"]), jali_mask(os.path.join(out, "_jali.png"))))
    seam = area("seam", (0, 1.2, DH / 2), 0.4, 0, color=hexrgb(A["light"])[:3], aim=aim_empty((0, -3, DH / 2)), size_y=DH)
    # floor in front, catching the spill of light
    plane("floor", 12, 8, loc=(0, -3.5, 0), mat_=mat("floor", hexrgb(A["floor"]), rough=0.35, coat=0.4))

    aim = aim_empty((0, 0, DH / 2))
    keyl = area("key", (-6.0, -2.2, 4.2), 1.2, A.get("key", 300) * 1.3, color=(1, 0.93, 0.84), aim=aim)
    area("fill", (4.0, -5.0, 1.5), 5.0, A.get("fill", 120), color=(0.92, 0.95, 1.0), aim=aim)

    cam, tgt = camera(lens=40, fstop=4.0)
    fh = DH + DW / 2 * 1.15 + 0.6      # doorway height incl. arch, with a little wall
    D = fh / (36 / 40)
    zc = fh / 2 - 0.1
    t_latch, t_open = 1.2, 3.6
    for hinge, side in leaves:
        a = math.radians(105) * side
        key(hinge, T(0.0), rotation_euler=(0, 0, 0))
        key(hinge, T(t_latch), rotation_euler=(0, 0, 0))
        key(hinge, T(t_latch + 0.12), rotation_euler=(0, 0, a * 0.025))     # the latch gives
        key(hinge, T(t_latch + 0.5), rotation_euler=(0, 0, a * 0.02))       # a breath
        key(hinge, T(t_open - 0.9), rotation_euler=(0, 0, a * 0.55))
        key(hinge, T(t_open), rotation_euler=(0, 0, a * 0.97))
        key(hinge, T(t_open + 0.35), rotation_euler=(0, 0, a))
    for f, k in ((T(0.0), 0.0), (T(t_latch), 0.3), (T(t_latch + 0.3), 1.0), (T(t_open), 2.0)):
        seam.data.energy = k * 120; seam.data.keyframe_insert("energy", frame=f)
    cam_path(cam, tgt, [
        (T(0.0), (0.0, -D - 0.5, zc), (0, 0, zc)),
        (T(t_latch), (0.0, -D - 0.25, zc - 0.05), (0, 0, zc - 0.05)),
        (T(t_open), (0.0, -D * 0.6, zc * 0.85), (0, 4, zc * 0.85)),
    ])
    lib.END, c, Dp = through_painting(ctx, cam, tgt, t_open, t_open + 1.8, y_center=54.0, pw_w=26.0, k=5.0, light=A["light"], z_center=DH * 0.62)
    key(cam, T(t_open + 0.9), location=Vector((0, -1.4, DH * 0.6))); key(tgt, T(t_open + 0.9), location=Vector((0, 20, DH * 0.62)))
    for f, v in ((T(0.0), 0.3), (T(t_open), 0.6), (T(5.0), 0.5), (lib.END - 12, 0.0)):
        glare.inputs["Strength"].default_value = v; glare.inputs["Strength"].keyframe_insert("default_value", frame=f)
    handheld(cam, tgt, 0.6, until=lib.END - 24)
