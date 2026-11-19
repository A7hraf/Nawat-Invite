"""
Royal scroll: a rolled scroll with gilded rods, tied with a silk cord under a wax seal,
lies on a tiled table edged with mirror mosaic. The seal cracks, the cord slips away,
the scroll unrolls toward the guest and the camera rises over the revealed card.
"""
import math, os, random
import bpy
from mathutils import Vector
import lib
from lib import *


def tile_table(path, cols, seed):
    from PIL import Image, ImageDraw, ImageFilter
    rnd = random.Random(seed)
    c_bg, c1, c2, c3 = [tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for c in cols]
    N = 1024; s = 256
    im = Image.new("RGB", (N, N), c_bg); d = ImageDraw.Draw(im)
    for gx in range(0, N + s, s):
        for gy in range(0, N + s, s):
            for rot in (0, math.pi / 8):
                d.polygon([(gx + (110 if k % 2 == 0 else 78) * math.cos(rot + k * math.pi / 8), gy + (110 if k % 2 == 0 else 78) * math.sin(rot + k * math.pi / 8)) for k in range(16)], fill=c1)
            d.polygon([(gx + (70 if k % 2 == 0 else 40) * math.cos(k * math.pi / 8), gy + (70 if k % 2 == 0 else 40) * math.sin(k * math.pi / 8)) for k in range(16)], fill=c2)
            d.ellipse((gx - 18, gy - 18, gx + 18, gy + 18), fill=c3)
            hx, hy = gx + s / 2, gy + s / 2
            d.polygon([(hx, hy - 50), (hx + 50, hy), (hx, hy + 50), (hx - 50, hy)], fill=c2)
            d.polygon([(hx, hy - 24), (hx + 24, hy), (hx, hy + 24), (hx - 24, hy)], fill=c3)
    # grout lines and glaze variation
    for x in range(0, N, 64): d.line([(x, 0), (x, N)], fill=(232, 228, 216), width=2)
    for y in range(0, N, 64): d.line([(0, y), (N, y)], fill=(232, 228, 216), width=2)
    px = im.load()
    for _ in range(90000):
        x, y = rnd.randrange(N), rnd.randrange(N); r, g, b = px[x, y]; k = rnd.uniform(0.9, 1.06)
        px[x, y] = (min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k)))
    im.filter(ImageFilter.GaussianBlur(0.7)).save(path)


def scroll_card(relief):
    """Card material that is only visible above a moving 'unroll' line (object Y)."""
    m, em = card_material(relief)
    nt = m.node_tree
    out = out_node(nt); last = out.inputs[0].links[0].from_node
    tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    val = nt.nodes.new("ShaderNodeValue"); val.name = "unroll"
    gt = nt.nodes.new("ShaderNodeMath"); gt.operation = "GREATER_THAN"
    nt.links.new(sep.outputs["Y"], gt.inputs[0]); nt.links.new(val.outputs[0], gt.inputs[1])
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); ms = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(gt.outputs[0], ms.inputs[0]); nt.links.new(tr.outputs[0], ms.inputs[1]); nt.links.new(last.outputs[0], ms.inputs[2])
    nt.links.new(ms.outputs[0], out.inputs[0])
    return m, em, val.outputs[0]


def build(ctx):
    A, P = ctx["art"], ctx["P"]; out = ctx["out"]; rnd = random.Random(ctx["seed"])
    world("studio", strength=0.12, rotate=0.6, camera_color="#0E1420")
    tp = os.path.join(out, "_tiles.png"); tile_table(tp, A["tiles"], ctx["seed"])
    tm, tnt, tb = image_mat("tiles", tp, rough=0.12)
    tb.inputs["Coat Weight"].default_value = 0.7
    mp = tnt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (16, 16, 1)
    tc = [n for n in tnt.nodes if n.type == "TEX_COORD"][0]; tx = [n for n in tnt.nodes if n.type == "TEX_IMAGE"][0]
    tnt.links.new(tc.outputs["UV"], mp.inputs["Vector"]); tnt.links.new(mp.outputs[0], tx.inputs["Vector"])
    plane("table", 24, 24, loc=(0, 6, 0), mat_=tm)

    # rose petals scattered on the tiles
    pm = petal_mat("petal", hexrgb(A.get("petal", "#A3172B")))
    for i in range(28):
        a_ = rnd.uniform(0, math.tau); r = rnd.uniform(1.1, 2.6)
        rose_petal(rnd.uniform(0.11, 0.16), rnd.uniform(0.3, 0.8), pm, loc=(r * math.cos(a_), 0.2 + r * math.sin(a_) * 1.2, 0.004), rot=(0, 0, rnd.uniform(0, math.tau)))

    gold_m = gold("rod-gold", A.get("metal", "#D4AE5C"), rough=0.2)
    paper_back = paper("scroll-back", hexrgb(A.get("paper", "#F1E7D2")), strength=0.08)
    relief = os.path.join(ctx["dir"], "relief.webp")
    cm, em, unroll = scroll_card(relief)
    pb = paper("card-back", hexrgb(A.get("paper", "#F1E7D2")))
    crd = plane("card", CW, CH, loc=(0, 0, 0.012), mats=[cm])

    top_y = CH / 2
    bot_y = -CH / 2
    # fixed top rod
    cylinder("top-rod", 0.035, CW + 0.26, loc=(0, top_y + 0.1, 0.04), rot=(0, math.radians(90), 0), mat_=gold_m)
    for sx in (-1, 1):
        sphere("finial", 0.055, loc=(sx * (CW / 2 + 0.15), top_y + 0.1, 0.05), mat_=gold_m, seg=16)
    # the roll: paper wrapped around a gilded rod, rolling toward the guest
    roll = bpy.data.objects.new("roll", None); link(roll)
    r0, r1 = 0.17, 0.035
    rl = cylinder("roll-paper", 1.0, CW, loc=(0, 0, 0), rot=(0, math.radians(90), 0), mat_=paper_back, verts=64)
    rl.parent = roll
    rod = cylinder("bottom-rod", 0.03, CW + 0.26, rot=(0, math.radians(90), 0), mat_=gold_m); rod.parent = roll
    fins = []
    for sx in (-1, 1):
        f_ = sphere("finial", 0.055, loc=(sx * (CW / 2 + 0.15), 0, 0), mat_=gold_m, seg=16); f_.parent = roll
    # cord and seal across the roll
    silk = satin("cord", hexrgb(A.get("cord", "#8E1B2B")))
    cord = torus("cord", 1.0, 0.012, rot=(0, math.radians(90), 0), mat_=silk); cord.parent = roll
    seal_m = mat("seal", hexrgb(A.get("seal", "#8E1B2B")), rough=0.38, coat=0.3)
    emb = emblem(os.path.join(out, "_emb.png"))
    seal = cylinder("seal", 0.11, 0.03, mat_=seal_m, verts=48)
    bv = seal.modifiers.new("b", "BEVEL"); bv.width = 0.012; bv.segments = 4
    seal.parent = roll
    # tassels hanging off the cord
    tass = []
    for sx in (-1, 1):
        t_ = cylinder("tassel", 0.025, 0.2, mat_=silk, verts=16); t_.parent = roll
        tass.append((t_, sx))

    def roll_pose(f, y, r, spin, cord_on=1.0):
        s = r
        key(roll, f, location=Vector((0, y, r + 0.012)), rotation_euler=(spin, 0, 0))
        key(rl, f, scale=Vector((s, s, 1)))
        key(cord, f, scale=Vector((r + 0.012, r + 0.012, 1)) if cord_on else Vector((0.001, 0.001, 1)))
    # rolled & tied
    start_y = top_y - 0.12
    roll_pose(T(0.0), start_y, r0, 0)
    roll_pose(T(1.6), start_y, r0, 0)
    key(seal, T(0.0), location=Vector((0, 0, r0 + 0.01)), rotation_euler=(0, 0, 0), scale=Vector((1, 1, 1)))
    key(seal, T(1.3), location=Vector((0, 0, r0 + 0.01)), scale=Vector((1, 1, 1)))
    key(seal, T(1.8), location=Vector((0.0, -0.25, r0 + 0.25)), rotation_euler=(math.radians(-50), 0, 0.4), scale=Vector((1, 1, 1)))
    key(seal, T(2.2), location=Vector((0.0, -0.45, 0.0)), scale=Vector((0.001, 0.001, 0.001)))
    for t_, sx in tass:
        key(t_, T(0.0), location=Vector((sx * 0.07, -0.02, -0.02)), rotation_euler=(math.radians(15), sx * 0.2, 0))
        key(t_, T(1.5), location=Vector((sx * 0.07, -0.02, -0.02)))
        key(t_, T(2.2), location=Vector((sx * 0.4, -0.5, -0.1)), scale=Vector((1, 1, 1)))
        key(t_, T(2.3), scale=Vector((0.001, 0.001, 0.001)))
    # unroll: the roll travels down the card, its radius shrinking, spinning as it goes
    steps = [(T(1.8), 0.0), (T(2.6), 0.15), (T(3.6), 0.5), (T(4.6), 0.85), (T(5.2), 1.0)]
    length = start_y - (bot_y - 0.1)
    for f, k in steps:
        y = start_y - length * k
        r = r0 + (r1 - r0) * k
        spin = -(length * k) / ((r0 + r) / 2)
        roll_pose(f, y, r, spin, cord_on=0)
    unroll_sock = unroll
    for f, k in steps:
        y = start_y - length * k
        unroll_sock.default_value = y; unroll_sock.keyframe_insert("default_value", frame=f)
    unroll_sock.default_value = start_y; unroll_sock.keyframe_insert("default_value", frame=T(0.0))

    # light: warm window light with a soft gobo, cool fill from the mosaic
    aim = aim_empty((0, 0, 0))
    keyl = area("key", (-5.5, 4.0, 7.5), 0.6, 2600, color=(1, 0.9, 0.76), aim=aim)
    gobo(keyl, aim, window_mask(os.path.join(out, "_gobo.png"), seed=3), at=0.72, size=4.2)
    area("fill", (4.5, -5, 5), 7, 140, color=(0.85, 0.9, 1.0), aim=aim)
    area("rim", (3, 6, 2.5), 3, 500, color=(1, 0.85, 0.65), aim=aim)

    cam, tgt = camera(lens=50, fstop=1.4)
    H = fill_distance(lens=50)
    cam_path(cam, tgt, [
        (T(0.0), (0.5, -1.6, 3.0), (0, start_y - 0.2, 0.1)),
        (T(1.6), (0.4, -1.5, 2.8), (0, start_y - 0.15, 0.1)),
        (T(3.6), (0.2, -2.0, 3.3), (0, 0.1, 0.0)),
        (T(5.6), (0.0, -0.35, H + 0.3), (0, 0, 0.012)),
        (T(6.8), (0.0, -0.001, H + 0.012), (0, 0, 0.012)),
        (lib.END, (0.0, -0.001, H + 0.012), (0, 0, 0.012)),
    ])
    for f, v in ((T(5.6), 1.0), (T(6.8), 0.3)):
        keyl.data.energy = 2600 * v; keyl.data.keyframe_insert("energy", frame=f)
    end_lift(em, T(5.6), T(6.8), 0.25)
