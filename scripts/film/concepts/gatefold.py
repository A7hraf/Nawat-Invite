"""
Gatefold: a gatefold invitation with gold-foiled doors, tied with a satin ribbon, lies on
draped silk among roses. The ribbon slides away, the two doors swing open, and the camera
rises over the card inside.
"""
import math, os, random
import bpy
from mathutils import Vector
import lib
from lib import *


def foil_panel(path, mask_path, side, seed):
    """Front of one gatefold door: border lines and half a medallion at the seam (white = foil)."""
    from PIL import Image, ImageDraw, ImageFilter
    w, h = 400, 1422
    im = Image.new("L", (w, h), 0); d = ImageDraw.Draw(im)
    for inset, wd in ((22, 9), (44, 4)):
        d.rectangle((inset, inset, w - inset, h - inset), outline=255, width=wd)
    cx = w if side < 0 else 0; cy = h // 2
    for r, wd in ((170, 9), (148, 4), (110, 6)):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=255, width=wd)
    for k in range(16):
        a = k * math.pi / 8
        d.line([(cx + 60 * math.cos(a), cy + 60 * math.sin(a)), (cx + 105 * math.cos(a), cy + 105 * math.sin(a))], fill=255, width=6)
    for yy in (90, h - 90):
        d.line([(60, yy), (w - 60, yy)], fill=255, width=4)
    im.filter(ImageFilter.GaussianBlur(0.8)).save(mask_path)


def foil_mat(name, paper_c, foil_c, mask):
    m, nt, b = node_mat(name)
    tc = nt.nodes.new("ShaderNodeTexCoord"); tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = image(mask, non_color=True)
    nt.links.new(tc.outputs["UV"], tx.inputs["Vector"])
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.inputs["A"].default_value = paper_c; mx.inputs["B"].default_value = foil_c
    nt.links.new(tx.outputs["Color"], mx.inputs["Factor"]); nt.links.new(mx.outputs["Result"], b.inputs["Base Color"])
    nt.links.new(tx.outputs["Color"], b.inputs["Metallic"])
    rr = nt.nodes.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.75; rr.inputs["To Max"].default_value = 0.22
    nt.links.new(tx.outputs["Color"], rr.inputs["Value"]); nt.links.new(rr.outputs[0], b.inputs["Roughness"])
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.35
    nt.links.new(tx.outputs["Color"], bp.inputs["Height"]); nt.links.new(bp.outputs[0], b.inputs["Normal"])
    b.inputs["Sheen Weight"].default_value = 0.3
    return m


def build(ctx):
    A = ctx["art"]; out = ctx["out"]; rnd = random.Random(ctx["seed"])
    world("studio", strength=0.14, rotate=2.0, camera_color="#2A211B")
    if A.get("marble"):
        plane("table", 30, 30, loc=(0, 6, 0), mat_=marble("marble", hexrgb(A["marble"][0]), hexrgb(A["marble"][1]), scale=0.45, polish=0.08))
    else:
        bpy.ops.mesh.primitive_grid_add(x_subdivisions=260, y_subdivisions=260, size=1, location=(0, 4, -0.1))
        silk = bpy.context.object; silk.scale = (24, 24, 1)
        for v in silk.data.vertices:
            x, y = v.co.x * 24, v.co.y * 24
            v.co.z = (0.09 * math.sin(x * 1.1 + y * 0.5) + 0.05 * math.sin(x * 2.6 - y * 1.9 + 1) + 0.04 * math.sin(y * 3.1)) / 1.0
        for pg in silk.data.polygons: pg.use_smooth = True
        silk.data.materials.append(satin("silk", hexrgb(A["silk"])))

    relief = os.path.join(ctx["dir"], "relief.webp")
    crd, em = card(relief, loc=(0, 0, 0.02))
    paper_c = hexrgb(A["paper"]); foil_c = hexrgb(A["foil"])
    doors = []
    for side in (-1, 1):
        mk = os.path.join(out, f"_foil{side}.png"); foil_panel(None, mk, side, ctx["seed"])
        fm = foil_mat(f"door{side}", paper_c, foil_c, mk)
        back = paper(f"door-in{side}", mix(paper_c, (1, 1, 1, 1), 0.5))
        hinge = bpy.data.objects.new(f"g-hinge{side}", None); link(hinge); hinge.location = (side * CW / 2, 0, 0.032)
        d_ = plane(f"door{side}", CW / 2 - 0.004, CH, loc=(-side * (CW / 4 - 0.002), 0, 0), mats=[fm, back], thick=0.005)
        d_.parent = hinge
        doors.append((hinge, side))

    # satin ribbon across the doors, with a bow at the seam
    sat = satin("ribbon", hexrgb(A["ribbon"]))
    tie = bpy.data.objects.new("tie", None); link(tie)
    band = box("band", (CW + 0.06, 0.16, 0.012), loc=(0, -0.2, 0.045), mat_=sat, bevel=0.004); band.parent = tie
    bw = bow("bow", sat, (0, -0.2, 0.06), size=0.2); bw.parent = tie

    pm = petal_mat("rose", hexrgb(A["rose"]))
    for (x, y, s, sd) in [(-1.25, 1.45, 0.34, 1), (1.3, -1.45, 0.38, 2), (-1.3, -1.3, 0.26, 3), (1.25, 1.05, 0.24, 4), (-1.45, 0.2, 0.2, 5)]:
        rose((x, y, 0.04), s, pm, seed=sd)
    leaf_m = mat("leaf", hexrgb(A["leaf"]), rough=0.55, sheen=0.5); stem_m = mat("stem", hexrgb("#6B5B4A"), rough=0.7)
    for (x, y, a, L) in [(-1.6, 0.9, 30, 1.1), (1.55, -0.1, 200, 1.2), (1.0, 2.0, 150, 0.9), (-1.0, -2.0, -20, 1.0)]:
        eucalyptus((x, y, 0.03), (0, 0, math.radians(a)), L, leaf_m, stem_m, seed=int(x * 7 + y * 3))
    for i in range(22):
        a_ = rnd.uniform(0, math.tau); r = rnd.uniform(1.2, 2.4)
        rose_petal(rnd.uniform(0.1, 0.15), rnd.uniform(0.3, 0.8), pm, loc=(r * math.cos(a_), r * math.sin(a_) * 1.2, 0.03), rot=(0, 0, rnd.uniform(0, math.tau)))

    aim = aim_empty((0, 0, 0))
    keyl = area("key", (-5.5, 4.0, 7.5), 0.6, 2200, color=(1, 0.9, 0.78), aim=aim)
    gobo(keyl, aim, window_mask(os.path.join(out, "_gobo.png"), seed=9), at=0.72, size=4.2)
    area("fill", (4.5, -5, 5), 7, 120, color=(0.9, 0.92, 1.0), aim=aim)
    area("rim", (3, 6, 2.5), 3, 420, color=(1, 0.85, 0.65), aim=aim)

    key(tie, T(0.0), location=Vector((0, 0, 0)), rotation_euler=(0, 0, 0))
    key(tie, T(1.3), location=Vector((0, 0, 0)))
    key(tie, T(2.5), location=Vector((2.8, -0.4, 0.12)), rotation_euler=(0, 0, math.radians(-20)))
    for hinge, side in doors:
        delay = 0.0 if side < 0 else 0.25
        key(hinge, T(0.0), rotation_euler=(0, 0, 0))
        key(hinge, T(2.3 + delay), rotation_euler=(0, 0, 0))
        key(hinge, T(3.0 + delay), rotation_euler=(0, side * math.radians(-95), 0))
        key(hinge, T(4.0 + delay), rotation_euler=(0, side * math.radians(-178), 0))

    cam, tgt = camera(lens=50, fstop=1.4)
    H = fill_distance(lens=50)
    cam_path(cam, tgt, [
        (T(0.0), (0.7, -2.5, 3.0), (0, 0.1, 0)),
        (T(2.0), (0.5, -2.2, 3.2), (0, 0.1, 0)),
        (T(4.2), (0.15, -1.1, H + 0.7), (0, 0.05, 0)),
        (T(6.4), (0.0, -0.001, H + 0.02), (0, 0, 0.02)),
        (lib.END, (0.0, -0.001, H + 0.02), (0, 0, 0.02)),
    ])
    for f, v in ((T(5.2), 1.0), (T(6.4), 0.35)):
        keyl.data.energy = 2200 * v; keyl.data.keyframe_insert("energy", frame=f)
    end_lift(em, T(5.2), T(6.4), 0.25)
