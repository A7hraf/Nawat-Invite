"""
Gatefold, front on: a gatefold invitation fills the screen, its two doors foiled and embossed in
the painting's colours, held by a silk band and a wax seal. The seal breaks, the band slips down,
the doors swing open toward the guest and the painting lies within.
"""
import math, os
import bpy
from mathutils import Vector
import lib
from lib import *
from concepts.gatefold import foil_panel, foil_mat

GW, GH = 1.5, 1.5 * 16 / 9


def build(ctx):
    A = ctx["art"]; out = ctx["out"]
    colour_exact()
    world("studio", strength=0.1, rotate=0.4, camera_color=A.get("void", "#1A1512"))
    glare = bloom(0.3, threshold=0.92)
    paper_c = hexrgb(A["paper"]); foil_c = hexrgb(A["foil"])
    doors = []
    for side in (-1, 1):
        mk = os.path.join(out, f"_foil{side}.png"); foil_panel(None, mk, side, ctx["seed"])
        if A.get("vellum"):
            bp = botanical_print(os.path.join(out, "_botanical.png"), seed=ctx["seed"])
            fm = frosted(f"door{side}", color=paper_c, opacity=0.8, print_path=bp, print_color=foil_c)
        else:
            fm = foil_mat(f"door{side}", paper_c, foil_c, mk)
        back = paper(f"door-in{side}", mix(paper_c, (1, 1, 1, 1), 0.4))
        hinge = bpy.data.objects.new(f"g-hinge{side}", None); link(hinge); hinge.location = (side * GW / 2, 0, GH / 2)
        d_ = plane(f"door{side}", GW / 2 - 0.004, GH, rot=(math.radians(90), 0, 0), mats=[fm, back], thick=0.008)
        d_.location = (-side * (GW / 4 - 0.002), 0, 0); d_.parent = hinge
        doors.append((hinge, side))
    # silk band with a wax seal
    band_m = satin("band", hexrgb(A["band"]))
    band = box("band", (GW + 0.04, 0.012, 0.2), loc=(0, -0.02, GH * 0.42), mat_=band_m, bevel=0.004)
    emb = emblem(os.path.join(out, "_emb.png"), kind=A.get("emblem", "rose"))
    sl, sr = wax_seal(0.17, hexrgb(A["seal"]), foil_c, emb)
    seal_root = bpy.data.objects.new("seal-root", None); link(seal_root)
    seal_root.location = (0, -0.035, GH * 0.42); seal_root.rotation_euler = (math.radians(90), 0, 0)
    for s in (sl, sr): s.parent = seal_root
    aim = aim_empty((0, 0, GH / 2))
    keyl = area("key", (-3.2, -3.0, 3.6), 1.6, A.get("key", 300), color=(1, 0.93, 0.84), aim=aim)
    area("fill", (3.5, -3.5, 1.0), 4.0, A.get("fill", 70), color=(0.95, 0.96, 1.0), aim=aim)
    gobo(keyl, aim, window_mask(os.path.join(out, "_gobo.png"), seed=ctx["seed"] % 5, bars=20), at=0.55, size=3.2)
    seam = area("seam", (0, 0.5, GH / 2), 0.2, 0, color=hexrgb(A["light"])[:3], aim=aim_empty((0, -3, GH / 2)), size_y=GH)

    cam, tgt = camera(lens=50, fstop=2.8)
    D = (GH * 0.97) / (36 / 50); zc = GH / 2
    t_crack, t_open = 0.9, 3.4
    for s, sx in ((sl, -1), (sr, 1)):
        key(s, T(0.0), location=Vector((0, 0, 0)), rotation_euler=(0, 0, 0))
        key(s, T(t_crack - 0.1), location=Vector((0, 0, 0)), rotation_euler=(0, 0, 0))
        key(s, T(t_crack), location=Vector((0.01 * sx, 0, 0.004)), rotation_euler=(0, math.radians(3 * sx), 0))
        for tt in [0.12 * k for k in range(1, 11)]:
            g = 9.0 * tt * tt
            key(s, T(t_crack + 0.15 + tt), location=Vector((0.01 * sx + 0.3 * sx * tt, -g, 0.2 * tt)),
                rotation_euler=(math.radians(-60 * tt), math.radians((3 + 70 * tt) * sx), math.radians(-120 * tt * sx)))
    key(band, T(0.0), location=band.location.copy(), scale=Vector((1, 1, 1)))
    key(band, T(t_crack + 0.3), location=band.location.copy())
    for tt in [0.12 * k for k in range(1, 10)]:
        key(band, T(t_crack + 0.3 + tt), location=band.location + Vector((0, -0.05 * tt, -7.0 * tt * tt)))
    for hinge, side in doors:
        delay = 0.0 if side < 0 else 0.18
        key(hinge, T(0.0), rotation_euler=(0, 0, 0))
        key(hinge, T(t_crack + 0.9 + delay), rotation_euler=(0, 0, 0))
        key(hinge, T(t_crack + 1.15 + delay), rotation_euler=(0, 0, math.radians(-6) * side))
        key(hinge, T(t_open + delay - 0.3), rotation_euler=(0, 0, math.radians(-150) * side))
        key(hinge, T(t_open + delay), rotation_euler=(0, 0, math.radians(-172) * side))
        key(hinge, T(t_open + delay + 0.35), rotation_euler=(0, 0, math.radians(-165) * side))
    for f, k in ((T(0.0), 0.0), (T(t_crack + 0.9), 0.3), (T(t_crack + 1.4), 2.0), (T(t_open), 0.0)):
        seam.data.energy = k * 60; seam.data.keyframe_insert("energy", frame=f)
    cam_path(cam, tgt, [
        (T(0.0), (0.0, -D - 0.08, zc), (0, 0, zc)),
        (T(t_crack + 0.9), (0.0, -D - 0.02, zc), (0, 0, zc)),
        (T(t_open), (0.0, -D * 1.05, zc), (0, 4, zc)),
    ])
    lib.END, c, Dp = through_painting(ctx, cam, tgt, t_open, t_open + 1.8, y_center=36.0, pw_w=16.0, k=3.5, light=A["light"], z_center=zc)
    for f, v in ((T(0.0), 0.3), (T(t_open), 0.5), (lib.END - 12, 0.0)):
        glare.inputs["Strength"].default_value = v; glare.inputs["Strength"].keyframe_insert("default_value", frame=f)
    handheld(cam, tgt, 0.5, until=lib.END - 24)
