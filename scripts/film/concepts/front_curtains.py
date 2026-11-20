"""
Curtains, front on: heavy drapes (velvet, linen or sheer chiffon) in the painting's colours fill
the screen under a fringed pelmet. Light glows at the seam; the drapes are drawn aside with a
soft, weighted sway and gather to the sides, opening onto the painting itself.
"""
import math, os, random
import bpy
from mathutils import Vector
import lib
from lib import *

CW_ = 1.7      # half-width covered by each drape
HGT = 5.6


def fabric(A):
    kind = A.get("fabric", "velvet"); c = hexrgb(A["drape"])
    if kind == "velvet":
        return velvet("drape", c, sheen_tint=mix(c, (1, 0.9, 0.85, 1), 0.65))
    if kind == "sheer":
        m, nt, b = node_mat("drape"); nt.nodes.remove(b)
        tl = nt.nodes.new("ShaderNodeBsdfTranslucent"); tl.inputs["Color"].default_value = c
        df = nt.nodes.new("ShaderNodeBsdfDiffuse"); df.inputs["Color"].default_value = c
        tr = nt.nodes.new("ShaderNodeBsdfTransparent")
        m1 = nt.nodes.new("ShaderNodeMixShader"); m1.inputs[0].default_value = 0.5
        nt.links.new(df.outputs[0], m1.inputs[1]); nt.links.new(tl.outputs[0], m1.inputs[2])
        m2 = nt.nodes.new("ShaderNodeMixShader"); m2.inputs[0].default_value = 0.72
        nt.links.new(tr.outputs[0], m2.inputs[1]); nt.links.new(m1.outputs[0], m2.inputs[2])
        nt.links.new(m2.outputs[0], out_node(nt).inputs[0])
        return m
    return linen("drape", c)   # linen / tent canvas


def drape(name, side, m, fringe):
    nx, nz = 140, 56
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=nx, y_subdivisions=nz, size=1)
    ob = bpy.context.object; ob.name = name; me = ob.data
    for v in me.vertices:
        u, w = v.co.x + 0.5, v.co.y + 0.5
        v.co.x, v.co.y, v.co.z = u, 0.0, w
    for pg in me.polygons:
        pg.use_smooth = True
        zc = sum(me.vertices[i].co.z for i in pg.vertices) / len(pg.vertices)
        pg.material_index = 1 if zc < 0.025 else 0
    me.materials.append(m); me.materials.append(fringe)
    ob.shape_key_add(name="base")
    closed = ob.shape_key_add(name="closed"); sway = ob.shape_key_add(name="sway"); gathered = ob.shape_key_add(name="gathered")
    for i, v in enumerate(me.vertices):
        u, w = v.co.x, v.co.z
        fold = 0.06 * math.sin(u * 26 + 0.4 * math.sin(u * 7)) + 0.035 * math.sin(u * 11 + 1.3) + 0.02 * math.sin(u * 61 + w * 2)
        x_closed = side * (CW_ + 0.1 - u * (CW_ + 0.13))
        closed.data[i].co = Vector((x_closed, fold, w * HGT))
        # sway: the hem trails as the cloth is drawn
        lag = (1 - w) ** 2 * 0.45 * u
        sway.data[i].co = Vector((x_closed + side * (0.55 * u - lag), fold * 1.6, w * HGT + 0.02 * (1 - w)))
        gu = u * 0.2
        x_open = side * (CW_ + 0.1 - gu * (CW_ + 0.13)) - side * (1 - w) ** 2 * 0.1 * u
        gathered.data[i].co = Vector((x_open, 0.2 * math.sin(u * 26) + 0.05 * math.sin(u * 61) - 0.1 * u, w * HGT))
    return ob, closed, sway, gathered


def build(ctx):
    A = ctx["art"]; out = ctx["out"]
    colour_exact()
    world("studio", strength=0.06, rotate=0.4, camera_color=A.get("void", "#0A0606"))
    glare = bloom(0.3, threshold=0.92)
    m = fabric(A)
    trim = gold("trim", A.get("metal", "#C9A24E"), rough=0.3)
    fringe = gold("fringe", A.get("metal", "#C9A24E"), rough=0.45)
    curtains = []
    for side in (-1, 1):
        ob, closed, sway, gathered = drape(f"curtain{side}", side, m, fringe)
        curtains.append((ob, closed, sway, gathered))
    box("pelmet", (CW_ * 2 + 0.5, 0.25, 0.55), loc=(0, -0.25, HGT - 0.1), mat_=fabric(A) if A.get("fabric") != "sheer" else trim, bevel=0.04)
    box("pelmet-trim", (CW_ * 2 + 0.52, 0.27, 0.05), loc=(0, -0.25, HGT - 0.38), mat_=trim, bevel=0.01)
    for sx in (-1, 1):
        tb = torus("tieback", 0.2, 0.025, loc=(sx * (CW_ - 0.05), -0.32, 1.5), rot=(math.radians(90), 0, 0), mat_=trim)
        tas = cylinder("tassel", 0.05, 0.35, loc=(sx * (CW_ - 0.05), -0.32, 1.15), mat_=fringe, verts=16)
    seam = area("seam", (0, 0.8, HGT / 2), 0.3, 0, color=hexrgb(A["light"])[:3], aim=aim_empty((0, -3, HGT / 2)), size_y=HGT)
    aim = aim_empty((0, 0, HGT / 2))
    keyl = area("key", (-4.5, -3.5, 5.5), 1.5, A.get("key", 380), color=(1, 0.9, 0.78), aim=aim)
    area("fill", (4.5, -4.0, 2.0), 5.0, A.get("fill", 80), color=(0.92, 0.95, 1.0), aim=aim)

    cam, tgt = camera(lens=40, fstop=4.0)
    fh = HGT - 0.4
    D = fh / (36 / 40)
    zc = fh / 2
    t_go, t_open = 1.3, 3.8
    for ob, closed, sway, gathered in curtains:
        for f, c, s_, g in ((T(0.0), 1, 0, 0), (T(t_go), 1, 0, 0), (T(t_go + 0.25), 1, 0.08, 0),
                            (T(t_go + 1.2), 0.45, 0.55, 0.0), (T(t_open - 0.5), 0.05, 0.35, 0.6), (T(t_open), 0, 0.08, 0.95), (T(t_open + 0.5), 0, 0, 1)):
            for key_, v in ((closed, c), (sway, s_), (gathered, g)):
                key_.value = v; key_.keyframe_insert("value", frame=f)
    for f, k in ((T(0.0), 0.3), (T(t_go), 0.6), (T(t_go + 0.8), 2.0), (T(t_open), 0.0)):
        seam.data.energy = k * 100; seam.data.keyframe_insert("energy", frame=f)
    cam_path(cam, tgt, [
        (T(0.0), (0.0, -D - 0.6, zc), (0, 0, zc)),
        (T(t_go), (0.0, -D - 0.45, zc), (0, 0, zc)),
        (T(t_open), (0.0, -D * 0.7, zc * 0.9), (0, 4, zc * 0.9)),
    ])
    lib.END, c, Dp = through_painting(ctx, cam, tgt, t_open, t_open + 1.8, y_center=50.0, pw_w=24.0, k=5.0, light=A["light"], z_center=zc * 0.9)
    key(cam, T(t_open + 0.9), location=Vector((0, -2.5, zc * 0.9))); key(tgt, T(t_open + 0.9), location=Vector((0, 20, zc * 0.9)))
    for f, v in ((T(0.0), 0.3), (T(t_open), 0.5), (lib.END - 12, 0.0)):
        glare.inputs["Strength"].default_value = v; glare.inputs["Strength"].keyframe_insert("default_value", frame=f)
    handheld(cam, tgt, 0.6, until=lib.END - 24)
