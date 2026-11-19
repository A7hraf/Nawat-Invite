"""
Velvet curtains: heavy wine-velvet drapes with a gold fringe fill the frame. They part
and gather to the sides, revealing a candlelit majlis where the invitation waits on a
brass easel under hanging lanterns. The camera walks in until the card fills the frame.
"""
import math, os, random
import bpy
from mathutils import Vector
import lib
from lib import *
from concepts.doors import rug_texture, arch_outline, prism
from concepts.lanterns import lantern, pierce_mask, pierced_metal

CARD_Y = 3.6
CW_ = 2.5      # half-stage width covered by each curtain when closed
HGT = 6.0


def drape(name, side, vel, fringe):
    """A curtain as a fine grid with two shape keys: closed (soft folds) and gathered."""
    nx, nz = 120, 48
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=nx, y_subdivisions=nz, size=1)
    ob = bpy.context.object; ob.name = name
    me = ob.data
    for v in me.vertices:
        u, w = v.co.x + 0.5, v.co.y + 0.5          # 0..1 across, 0..1 up
        v.co.x, v.co.y, v.co.z = u, 0.0, w
    for pg in me.polygons:
        pg.use_smooth = True
        zc = sum(me.vertices[i].co.z for i in pg.vertices) / len(pg.vertices)
        pg.material_index = 1 if zc < 0.02 else 0
    me.materials.append(vel); me.materials.append(fringe)
    ob.shape_key_add(name="base")
    closed = ob.shape_key_add(name="closed"); gathered = ob.shape_key_add(name="gathered")
    for i, v in enumerate(me.vertices):
        u, w = v.co.x, v.co.z
        # x from the outer edge (u=0) to the stage centre (u=1)
        x_closed = side * (CW_ + 0.15 - u * (CW_ + 0.18))
        y_closed = 0.09 * math.sin(u * 22) + 0.03 * math.sin(u * 51 + w * 2)
        closed.data[i].co = Vector((x_closed, y_closed, w * HGT))
        gu = u * 0.24
        sway = (1 - w) ** 2 * 0.12
        x_open = side * (CW_ + 0.15 - gu * (CW_ + 0.18)) - side * sway * u
        y_open = 0.22 * math.sin(u * 22) + 0.05 * math.sin(u * 51)
        gathered.data[i].co = Vector((x_open, y_open - 0.1 * u, w * HGT))
    return ob, closed, gathered


def build(ctx):
    A = ctx["art"]; out = ctx["out"]; rnd = random.Random(ctx["seed"])
    world("night", strength=0.05, camera_color="#0A0405")
    vel = velvet("velvet", hexrgb(A["velvet"]), sheen_tint=mix(hexrgb(A["velvet"]), (1, 0.85, 0.85, 1), 0.6))
    gold_m = gold("gold", "#D2A957", rough=0.28)
    fringe = gold("fringe", "#C99A45", rough=0.45)

    # room
    wall = mat("wall", hexrgb(A["wall"]), rough=0.92, bump=(10, 0.35))
    plane("floor", 16, 16, loc=(0, 4, 0), mat_=mat("floor", hexrgb(A["floor"]), rough=0.5, bump=(6, 0.15)))
    plane("back", 12, 8, loc=(0, 7.0, 4), rot=(math.radians(90), 0, 0), mat_=wall)
    for sx in (-1, 1):
        plane("side", 12, 8, loc=(sx * 3.6, 3.5, 4), rot=(math.radians(90), 0, math.radians(90)), mat_=wall)
    trim = gold("trim", "#B98C3E", rough=0.35)
    for nx in (-2.0, 0, 2.0):
        n_ = prism("niche", [(x * 0.5 + nx, z * 0.62 + 1.0) for x, z in arch_outline()], 6.97, 6.99)
        n_.data.materials.append(mat("niche", dim(hexrgb(A["wall"]), 0.45), rough=0.95))
        fr = prism("niche-frame", [(x * 0.55 + nx, z * 0.66 + 0.94) for x, z in arch_outline()], 6.985, 6.995); fr.data.materials.append(trim)
    rp = os.path.join(out, "_rug.png")
    rug_texture(rp, *[tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for c in A["rug"]], ctx["seed"])
    rm_, rnt, rb = image_mat("rug", rp, rough=0.95, bump_k=0.25); rb.inputs["Sheen Weight"].default_value = 0.8
    plane("rug", 2.2, 4.6, loc=(0, 2.4, 0.01), mat_=rm_, thick=0.012)
    # floor cushions either side
    for sx in (-1, 1):
        c_ = box("cushion", (0.9, 2.6, 0.32), loc=(sx * 2.6, 3.6, 0.16), mat_=velvet("cushion", dim(hexrgb(A["velvet"]), 0.9)), bevel=0.12, segs=4)
        b_ = box("bolster", (0.5, 2.6, 0.5), loc=(sx * 3.1, 3.6, 0.5), mat_=velvet("bolster", hexrgb(A["velvet"])), bevel=0.2, segs=4)

    # card on a brass easel
    relief = os.path.join(ctx["dir"], "relief.webp")
    cz = 0.34 + CH / 2
    crd, em = card(relief, loc=(0, CARD_Y, cz), rot=(math.radians(90), 0, 0))
    for sx in (-1, 1):
        cylinder("leg", 0.022, 3.1, loc=(sx * 0.42, CARD_Y + 0.35, 1.5), rot=(math.radians(-8), math.radians(sx * 6), 0), mat_=gold_m)
    box("ledge", (CW + 0.12, 0.12, 0.04), loc=(0, CARD_Y - 0.02, 0.32), mat_=gold_m, bevel=0.01)
    wax = mat("candle", hexrgb("#F4ECDC"), rough=0.5)
    flame_m = mat("flame", (1, 0.7, 0.35, 1), emit=(1, 0.6, 0.25, 1), emit_k=120)
    for (x, y, h) in [(-1.2, 2.1, 0.3), (1.25, 2.3, 0.42), (-1.0, 3.2, 0.5), (1.1, 3.4, 0.26), (-0.75, 1.3, 0.2), (0.8, 1.4, 0.34)]:
        cylinder("candle", 0.07, h, loc=(x, y, h / 2), mat_=wax, verts=20)
        fl = sphere("flame", 0.045, loc=(x, y, h + 0.06), mat_=flame_m, seg=12); fl.scale = (0.55, 0.55, 1.7)
        point("cl", (x, y, h + 0.14), 12, color=(1, 0.62, 0.32), radius=0.03)
    mp = os.path.join(out, "_pierce.png"); pierce_mask(mp, 0)
    for i, (x, y, z, s) in enumerate([(-1.5, 2.6, 3.4, 1.1), (1.6, 2.9, 3.1, 1.0), (0.0, 5.6, 3.8, 1.3)]):
        gm = mat(f"glass{i}", (1, 0.7, 0.4, 1), rough=0.2, emit=(1, 0.6, 0.3, 1), emit_k=1.0)
        lantern(f"lantern{i}", (x, y, z), s, pierced_metal(f"p{i}", mp, "#C9A24E", (1, 1, 1, 1)), gold_m, gm, 160 * s, (1, 0.66, 0.36), ctx["seed"] + i)
    pm = petal_mat("petal", hexrgb(A["petal"]))
    for i in range(30):
        rose_petal(rnd.uniform(0.11, 0.16), rnd.uniform(0.3, 0.8), pm, loc=(rnd.gauss(0, 0.5), rnd.uniform(0.4, 3.2), 0.026), rot=(0, 0, rnd.uniform(0, math.tau)))

    # curtains and pelmet at the front of the stage
    curtains = []
    for side in (-1, 1):
        ob, closed, gathered = drape(f"curtain{side}", side, vel, fringe)
        ob.location = (0, -0.4, 0)
        curtains.append((ob, closed, gathered))
    box("pelmet", (CW_ * 2 + 0.6, 0.25, 0.7), loc=(0, -0.5, HGT - 0.15), mat_=vel, bevel=0.05)
    box("pelmet-trim", (CW_ * 2 + 0.62, 0.27, 0.06), loc=(0, -0.5, HGT - 0.5), mat_=gold_m, bevel=0.01)
    for sx in (-1, 1):
        torus("tieback", 0.22, 0.03, loc=(sx * (CW_ - 0.1), -0.55, 1.6), rot=(math.radians(90), 0, 0), mat_=gold_m)
        box("frame", (0.3, 0.5, HGT + 0.4), loc=(sx * (CW_ + 0.3), -0.45, HGT / 2), mat_=mat("frame", dim(hexrgb(A["wall"]), 0.7), rough=0.9))

    for ob, closed, gathered in curtains:
        for f, c, g in ((T(0.0), 1, 0), (T(0.9), 1, 0), (T(3.4), 0, 1)):
            closed.value = c; closed.keyframe_insert("value", frame=f)
            gathered.value = g; gathered.keyframe_insert("value", frame=f)

    room = area("room", (0, 3.5, 5.6), 4.0, 140, color=(1, 0.75, 0.5), aim=aim_empty((0, 3.5, 0)))
    front = area("front", (0, -4.5, 3.0), 3.0, 300, color=(1, 0.86, 0.7), aim=aim_empty((0, -0.4, 2.5)))
    area("card-key", (-1.4, CARD_Y - 2.4, 3.2), 1.2, 140, color=(1, 0.88, 0.75), aim=aim_empty((0, CARD_Y, cz)))
    for f, k in ((T(0.0), 0.3), (T(1.0), 0.3), (T(3.2), 1.0)):
        room.data.energy = 140 * k; room.data.keyframe_insert("energy", frame=f)
    for f, k in ((T(0.0), 1.0), (T(3.0), 0.5), (T(5.0), 0.15)):
        front.data.energy = 300 * k; front.data.keyframe_insert("energy", frame=f)

    cam, tgt = camera(lens=35, fstop=2.2)
    D = fill_distance(lens=35)
    cam_path(cam, tgt, [
        (T(0.0), (0.0, -5.6, 2.6), (0, 0, 2.5)),
        (T(1.6), (0.0, -5.2, 2.5), (0, 0, 2.4)),
        (T(3.8), (0.0, -2.4, 2.0), (0, CARD_Y, 1.8)),
        (T(5.8), (0.0, CARD_Y - D - 0.5, cz + 0.05), (0, CARD_Y, cz)),
        (T(6.8), (0.0, CARD_Y - D, cz), (0, CARD_Y, cz)),
        (lib.END, (0.0, CARD_Y - D, cz), (0, CARD_Y, cz)),
    ])
    end_lift(em, T(5.8), T(6.8), 0.25)
