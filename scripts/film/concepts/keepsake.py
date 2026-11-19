"""
Keepsake box: a lacquered box with a gilded medallion, crossed with satin ribbon, sits
on marble among roses and candles. The ribbon slips away, the lid lifts off, and the
invitation rises from its satin nest to meet the guest.
"""
import math, os, random
import bpy
from mathutils import Vector
import lib
from lib import *

BW, BD, BH = 1.7, 2.6, 0.42
CARD_END = Vector((0, -0.6, 2.1))


def lacquer(name, color):
    m, nt, b = node_mat(name)
    b.inputs["Base Color"].default_value = color; b.inputs["Roughness"].default_value = 0.35
    b.inputs["Coat Weight"].default_value = 1.0; b.inputs["Coat Roughness"].default_value = 0.04
    return m


def build(ctx):
    A = ctx["art"]; out = ctx["out"]; rnd = random.Random(ctx["seed"])
    world("studio", strength=0.2, rotate=0.8, camera_color=A.get("void", "#111111"))
    plane("table", 30, 30, loc=(0, 6, 0), mat_=marble("marble", hexrgb(A["marble"][0]), hexrgb(A["marble"][1]), scale=0.45, polish=0.08))

    lac = lacquer("lacquer", hexrgb(A["box"]))
    gold_m = gold("gold", A.get("metal", "#D4AF63"), rough=0.22)
    sat = satin("ribbon", hexrgb(A["ribbon"]))
    lining = satin("lining", hexrgb(A["lining"]))

    t_ = 0.06
    box("b-front", (BW, t_, BH), loc=(0, -BD / 2 + t_ / 2, BH / 2), mat_=lac, bevel=0.02)
    box("b-back", (BW, t_, BH), loc=(0, BD / 2 - t_ / 2, BH / 2), mat_=lac, bevel=0.02)
    for sx in (-1, 1):
        box("b-side", (t_, BD, BH), loc=(sx * (BW / 2 - t_ / 2), 0, BH / 2), mat_=lac, bevel=0.02)
    box("b-bottom", (BW, BD, 0.05), loc=(0, 0, 0.025), mat_=lac)
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=50, y_subdivisions=70, size=1, location=(0, 0, BH * 0.8))
    nest = bpy.context.object; nest.scale = (BW - 2 * t_, BD - 2 * t_, 1)
    tx = bpy.data.textures.new("rumple", "CLOUDS"); tx.noise_scale = 0.2
    dp = nest.modifiers.new("d", "DISPLACE"); dp.texture = tx; dp.strength = 0.04
    for pg in nest.data.polygons: pg.use_smooth = True
    nest.data.materials.append(lining)

    lid = bpy.data.objects.new("lid", None); link(lid)
    top = box("lid-top", (BW + 0.06, BD + 0.06, 0.08), loc=(0, 0, 0.04), mat_=lac, bevel=0.025); top.parent = lid
    rim = box("lid-rim", (BW + 0.06, BD + 0.06, 0.16), loc=(0, 0, -0.04), mat_=lac, bevel=0.025); rim.parent = lid
    med = cylinder("medallion", 0.32, 0.03, loc=(0, 0, 0.095), mat_=gold_m, verts=64); med.parent = lid
    emb = emblem(os.path.join(out, "_emb.png"), kind=A.get("emblem", "khatam"))
    med2 = disc("medallion-face", 0.31, gold_m, loc=(0, 0, 0.112)); med2.parent = lid
    displace_image(med2, emb, 0.022, subdiv=1)
    for sx in (-1, 1):
        for sy in (-1, 1):
            c_ = box("corner", (0.16, 0.16, 0.01), loc=(sx * (BW / 2 - 0.05), sy * (BD / 2 - 0.05), 0.085), mat_=gold_m, bevel=0.004); c_.parent = lid
    lid_z = BH + 0.08

    # crossed ribbons and a bow
    tie = bpy.data.objects.new("tie", None); link(tie)
    r1 = box("rib1", (0.14, BD + 0.1, 0.01), loc=(0.45, 0, lid_z + 0.09), mat_=sat, bevel=0.003); r1.parent = tie
    r2 = box("rib2", (BW + 0.1, 0.14, 0.01), loc=(0, 0.75, lid_z + 0.09), mat_=sat, bevel=0.003); r2.parent = tie
    bw = bow("bow", sat, (0.45, 0.75, lid_z + 0.1), size=0.22); bw.parent = tie

    relief = os.path.join(ctx["dir"], "relief.webp")
    crd, em = card(relief)
    sc = 0.95
    rest = Vector((0, 0, BH * 0.8 + 0.06))
    key(crd, T(0.0), location=rest.copy(), rotation_euler=(0, 0, 0), scale=Vector((sc, sc, 1)))
    key(crd, T(3.4), location=rest.copy(), rotation_euler=(0, 0, 0), scale=Vector((sc, sc, 1)))
    key(crd, T(4.7), location=Vector((0, -0.2, 1.0)), rotation_euler=(math.radians(45), 0, math.radians(-10)), scale=Vector((1, 1, 1)))
    key(crd, T(6.2), location=CARD_END.copy(), rotation_euler=(math.radians(90), 0, 0), scale=Vector((1, 1, 1)))
    key(crd, lib.END, location=CARD_END.copy(), rotation_euler=(math.radians(90), 0, 0), scale=Vector((1, 1, 1)))

    key(tie, T(0.0), location=Vector((0, 0, 0)), rotation_euler=(0, 0, 0))
    key(tie, T(1.2), location=Vector((0, 0, 0)))
    key(tie, T(2.3), location=Vector((2.6, 0.8, 0.1)), rotation_euler=(0, 0, math.radians(-25)))
    key(lid, T(0.0), location=Vector((0, 0, lid_z)), rotation_euler=(0, 0, 0))
    key(lid, T(2.0), location=Vector((0, 0, lid_z)), rotation_euler=(0, 0, 0))
    key(lid, T(2.5), location=Vector((0, 0.05, lid_z + 0.25)), rotation_euler=(math.radians(-4), 0, 0))
    key(lid, T(3.6), location=Vector((0.4, 2.6, lid_z + 1.4)), rotation_euler=(math.radians(-35), 0, math.radians(8)))

    # roses and candles around
    pm = petal_mat("rose", hexrgb(A["rose"]))
    for (x, y, s, sd) in [(-1.45, 1.2, 0.36, 1), (1.4, -1.0, 0.34, 2), (-1.2, -1.5, 0.26, 3), (1.3, 1.6, 0.3, 4)]:
        rose((x, y, 0.02), s, pm, seed=sd)
    wax = mat("candle", hexrgb(A.get("candle", "#F3EADB")), rough=0.5)
    flame_m = mat("flame", (1, 0.7, 0.35, 1), emit=(1, 0.6, 0.25, 1), emit_k=120)
    for (x, y, h) in [(-1.7, 0.2, 0.9), (-1.95, 0.6, 0.6), (1.8, 0.4, 0.75), (2.0, -0.1, 0.5)]:
        cylinder("candle", 0.08, h, loc=(x, y, h / 2), mat_=wax, verts=24)
        fl = sphere("flame", 0.05, loc=(x, y, h + 0.07), mat_=flame_m, seg=12); fl.scale = (0.55, 0.55, 1.7)
        point("cl", (x, y, h + 0.16), 14, color=(1, 0.62, 0.32), radius=0.03)
    for i in range(20):
        a_ = rnd.uniform(0, math.tau); r = rnd.uniform(1.4, 2.6)
        rose_petal(rnd.uniform(0.1, 0.15), rnd.uniform(0.3, 0.8), pm, loc=(r * math.cos(a_), r * math.sin(a_) * 1.1, 0.004), rot=(0, 0, rnd.uniform(0, math.tau)))

    aim = aim_empty((0, 0, 0.3))
    keyl = area("key", (-4.5, 3.0, 6.0), 0.7, A.get("key", 1600), color=(1, 0.9, 0.78), aim=aim)
    gobo(keyl, aim, window_mask(os.path.join(out, "_gobo.png"), seed=13), at=0.72, size=4.0)
    area("fill", (4, -5, 4), 6, A.get("fill", 120), color=(0.85, 0.9, 1.0), aim=aim)
    area("rim", (2.5, 5, 2.5), 2.5, 500, color=(1, 0.85, 0.65), aim=aim)
    area("card-key", (-1.0, CARD_END.y - 2.6, 3.2), 1.4, 70, color=(1, 0.9, 0.8), aim=aim_empty(tuple(CARD_END)))

    cam, tgt = camera(lens=45, fstop=1.8)
    D = fill_distance(lens=45)
    cam_path(cam, tgt, [
        (T(0.0), (1.4, -3.8, 2.6), (0, 0, 0.4)),
        (T(1.8), (1.1, -3.5, 2.7), (0, 0, 0.45)),
        (T(3.4), (0.5, -3.2, 2.8), (0, 0, 0.7)),
        (T(5.0), (0.1, CARD_END.y - D - 0.8, CARD_END.z + 0.1), (0, CARD_END.y, CARD_END.z - 0.15)),
        (T(6.6), (0.0, CARD_END.y - D, CARD_END.z), tuple(CARD_END)),
        (lib.END, (0.0, CARD_END.y - D, CARD_END.z), tuple(CARD_END)),
    ])
    end_lift(em, T(5.6), T(6.6), 0.28)
