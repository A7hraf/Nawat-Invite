"""
Carved doors: a pair of hand-carved wooden doors in an arched wall. Light leaks through
the seam, the doors swing inward, warm light floods out, and the camera walks through
to the invitation standing on a brass easel inside.
"""
import math, os, random
import bpy, bmesh
from mathutils import Vector
import lib
from lib import *

DW, DH = 2.4, 3.5           # doorway: width, height of the straight part
AR = DW / 2                 # arch radius (pointed arch rises a bit higher)
WALL_T = 0.6
CARD_Y = 4.4


def carving(path, w_px, h_px, seed):
    """Height map of a carved door leaf: frame, three panels, rosettes and a star."""
    from PIL import Image, ImageDraw, ImageFilter
    rnd = random.Random(seed)
    im = Image.new("L", (w_px, h_px), 150); d = ImageDraw.Draw(im)
    b = int(w_px * 0.07)
    d.rectangle((0, 0, w_px, h_px), fill=200)
    d.rectangle((b, b, w_px - b, h_px - b), fill=110)
    panels = [(0.03, 0.22), (0.25, 0.70), (0.73, 0.97)]
    for (t0, t1) in panels:
        y0, y1 = int(b + (h_px - 2 * b) * t0), int(b + (h_px - 2 * b) * t1)
        x0, x1 = b + int(w_px * 0.06), w_px - b - int(w_px * 0.06)
        d.rectangle((x0, y0, x1, y1), fill=215)
        d.rectangle((x0 + 18, y0 + 18, x1 - 18, y1 - 18), fill=90)
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        r = min(x1 - x0, y1 - y0) * 0.36
        # eight-point star with a rosette inside
        for rot in (0, math.pi / 8):
            pts = [(cx + (r if k % 2 == 0 else r * 0.72) * math.cos(rot + k * math.pi / 8),
                    cy + (r if k % 2 == 0 else r * 0.72) * math.sin(rot + k * math.pi / 8)) for k in range(16)]
            d.polygon(pts, fill=230)
        d.ellipse((cx - r * 0.55, cy - r * 0.55, cx + r * 0.55, cy + r * 0.55), fill=120)
        for k in range(8):
            a = k * math.tau / 8
            px, py = cx + r * 0.32 * math.cos(a), cy + r * 0.32 * math.sin(a)
            d.ellipse((px - r * 0.16, py - r * 0.16, px + r * 0.16, py + r * 0.16), fill=235)
        d.ellipse((cx - r * 0.12, cy - r * 0.12, cx + r * 0.12, cy + r * 0.12), fill=255)
        # small corner rosettes in tall panels
        if t1 - t0 > 0.3:
            for (px, py) in ((x0 + 60, y0 + 60), (x1 - 60, y0 + 60), (x0 + 60, y1 - 60), (x1 - 60, y1 - 60)):
                d.ellipse((px - 30, py - 30, px + 30, py + 30), fill=225)
    im.filter(ImageFilter.GaussianBlur(4)).save(path)


def tile_texture(path, colors):
    """Zellige-like eight-point tile pattern for dados."""
    from PIL import Image, ImageDraw
    c1, c2, c3 = colors
    im = Image.new("RGB", (512, 512), c3); d = ImageDraw.Draw(im)
    s = 128
    for gx in range(0, 512 + s, s):
        for gy in range(0, 512 + s, s):
            for rot in (0, math.pi / 4):
                pts = [(gx + 54 * math.cos(rot + k * math.pi / 2), gy + 54 * math.sin(rot + k * math.pi / 2)) for k in range(4)]
                d.polygon(pts, fill=c1)
            d.ellipse((gx - 16, gy - 16, gx + 16, gy + 16), fill=c2)
            d.polygon([(gx + s / 2, gy + s / 2 - 22), (gx + s / 2 + 22, gy + s / 2), (gx + s / 2, gy + s / 2 + 22), (gx + s / 2 - 22, gy + s / 2)], fill=c2)
    for x in range(0, 512, 32): d.line([(x, 0), (x, 512)], fill=(235, 230, 220), width=1)
    for y in range(0, 512, 32): d.line([(0, y), (512, y)], fill=(235, 230, 220), width=1)
    im.save(path)


def rug_texture(path, field, border, accent, seed):
    from PIL import Image, ImageDraw, ImageFilter
    rnd = random.Random(seed)
    W_, H_ = 512, 1536
    im = Image.new("RGB", (W_, H_), field); d = ImageDraw.Draw(im)
    for i, (inset, col, wdt) in enumerate(((10, border, 46), (64, accent, 8), (80, border, 30), (118, accent, 4))):
        d.rectangle((inset, inset, W_ - inset, H_ - inset), outline=col, width=wdt)
    # repeating boteh / star motifs in the border band
    for y in range(40, H_ - 40, 60):
        for x in (32, W_ - 32):
            d.ellipse((x - 9, y - 9, x + 9, y + 9), fill=accent)
    for x in range(40, W_ - 40, 60):
        for y in (32, H_ - 32):
            d.ellipse((x - 9, y - 9, x + 9, y + 9), fill=accent)
    # three medallions down the field
    for cy in (H_ * 0.27, H_ * 0.5, H_ * 0.73):
        cx = W_ / 2
        for r, col in ((150, border), (118, accent), (96, field), (70, border), (40, accent)):
            pts = [(cx + r * 1.0 * math.cos(k * math.pi / 8) * (1 if k % 2 == 0 else 0.82), cy + r * 1.5 * math.sin(k * math.pi / 8) * (1 if k % 2 == 0 else 0.82)) for k in range(16)]
            d.polygon(pts, fill=col)
    # scattered small flowers in the field
    for _ in range(260):
        x, y = rnd.uniform(140, W_ - 140), rnd.uniform(140, H_ - 140)
        d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=accent if rnd.random() < 0.5 else border)
    im = im.filter(ImageFilter.GaussianBlur(0.8))
    # wool grain
    px = im.load()
    for _ in range(60000):
        x, y = rnd.randrange(W_), rnd.randrange(H_); r, g, b = px[x, y]; k = rnd.uniform(0.82, 1.1)
        px[x, y] = (min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k)))
    im.save(path)


def arch_outline(n=24, inset=0.0):
    """Doorway outline in the XZ plane: straight jambs and a slightly pointed arch."""
    w = DW / 2 - inset
    pts = [(-w, 0.0), (w, 0.0), (w, DH)]
    for i in range(1, n):
        t = i / n
        a = math.pi * t
        x = w * math.cos(a)
        z = DH + (AR - inset) * math.sin(a) * 1.15 + 0.18 * math.sin(a) ** 6
        pts.append((x, z))
    pts.append((-w, DH))
    return pts


def prism(name, outline, y0, y1):
    bm = bmesh.new()
    a = [bm.verts.new((x, y0, z)) for x, z in outline]
    b = [bm.verts.new((x, y1, z)) for x, z in outline]
    bm.faces.new(a); bm.faces.new(list(reversed(b)))
    n = len(a)
    for i in range(n):
        bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return link(bpy.data.objects.new(name, me))


def build(ctx):
    A, P = ctx["art"], ctx["P"]
    out, rnd = ctx["out"], random.Random(ctx["seed"])
    world(A.get("hdri", "sunset"), strength=0.08, rotate=1.2, camera_color="#050403")

    # ---------------- materials
    plaster = mat("plaster", hexrgb(A["wall"]), rough=0.92, bump=(14, 0.35))
    stucco = mat("stucco", mix(hexrgb(A["wall"]), (1, 1, 1, 1), 0.15), rough=0.85, bump=(40, 0.2))
    wood_m = wood("door-wood", hexrgb(A["wood"][0]), hexrgb(A["wood"][1]), scale=2.2, rough=0.5)
    brass = gold("brass", "#C9A04E", rough=0.3)
    floor_out = mat("floor", dim(hexrgb(A["floor"]), 0.7), rough=0.6, bump=(5, 0.3))
    floor_in = marble("floor-in", hexrgb(A["floor"]), dim(hexrgb(A["floor"]), 0.55), scale=1.2, polish=0.22)
    glow = hexrgb(A["inside"])

    # ---------------- wall with an arched opening
    wall = box("wall", (14, WALL_T, 9), loc=(0, WALL_T / 2, 4.5), mat_=plaster)
    cut = prism("cut", arch_outline(), -1, WALL_T + 1)
    bo = wall.modifiers.new("hole", "BOOLEAN"); bo.object = cut; bo.operation = "DIFFERENCE"; bo.solver = "EXACT"
    cut.hide_render = True; cut.hide_viewport = True
    # carved stucco frame around the arch
    frame_out = prism("frame", arch_outline(inset=-0.28), -0.08, 0.02)
    fcut = prism("fcut", arch_outline(), -1, 1); fcut.hide_render = True
    fb = frame_out.modifiers.new("h", "BOOLEAN"); fb.object = fcut; fb.operation = "DIFFERENCE"; fb.solver = "EXACT"
    frame_out.data.materials.append(stucco)
    bv = frame_out.modifiers.new("bev", "BEVEL"); bv.width = 0.02; bv.segments = 2
    # interior room
    plane("floor-out", 14, 9, loc=(0, -4.5, 0), mat_=floor_out)
    plane("floor-in", 10, 9, loc=(0, 4.5, 0.001), mat_=floor_in)
    inner_wall = mat("inner", mix(dim(hexrgb(A["wall"]), 0.75), glow, 0.25), rough=0.9, bump=(10, 0.3))
    back = plane("back-wall", 10, 7, loc=(0, 8.2, 3.5), rot=(math.radians(90), 0, 0), mat_=inner_wall)
    niche = mat("niche", dim(hexrgb(A["wall"]), 0.35), rough=0.95)
    for nx in (-2.2, 0, 2.2):
        n_ = prism("niche", [(x * 0.45 + nx, z * 0.62 + 0.9) for x, z in arch_outline()], 8.17, 8.19); n_.data.materials.append(niche)
    for sx in (-1, 1):
        plane(f"side-{sx}", 9, 7, loc=(sx * 3.4, 4.5, 3.5), rot=(math.radians(90), 0, math.radians(90)), mat_=inner_wall)
    plane("ceiling", 8, 9, loc=(0, 4.5, 6.2), rot=(math.pi, 0, 0), mat_=inner_wall)

    if A.get("tiles"):
        tpath = os.path.join(out, "_tiles.png")
        tile_texture(tpath, [tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for c in A["tiles"]])
        tm, tnt, tb = image_mat("tiles", tpath, rough=0.18)
        tb.inputs["Coat Weight"].default_value = 0.6
        mp = tnt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (6, 1.2, 1)
        tc = [n for n in tnt.nodes if n.type == "TEX_COORD"][0]; tx = [n for n in tnt.nodes if n.type == "TEX_IMAGE"][0]
        tnt.links.new(tc.outputs["UV"], mp.inputs["Vector"]); tnt.links.new(mp.outputs[0], tx.inputs["Vector"])
        for sx in (-1, 1):
            plane(f"dado-{sx}", 5.2, 1.1, loc=(sx * (DW / 2 + 0.35 + 2.6), -0.005, 0.55), rot=(math.radians(90), 0, 0), mat_=tm)
            plane(f"dado-in-{sx}", 8, 1.1, loc=(sx * 3.39, 4.5, 0.55), rot=(math.radians(90), 0, math.radians(-90 * sx)), mat_=tm)

    # ---------------- doors
    hpath = os.path.join(out, "_carving.png"); carving(hpath, 600, 1750, ctx["seed"])
    leaves = []
    lw = DW / 2 - 0.01
    for side in (-1, 1):
        hinge = bpy.data.objects.new(f"hinge{side}", None); link(hinge)
        hinge.location = (side * DW / 2, WALL_T * 0.5, 0)
        # leaf body
        body = box(f"leaf{side}", (lw, 0.11, DH - 0.02), loc=(0, 0, 0), mat_=wood_m, bevel=0.01)
        body.location = (-side * lw / 2, 0, DH / 2); body.parent = hinge
        # carved face (displaced grid) on the outside
        face = plane(f"face{side}", lw - 0.02, DH - 0.04, rot=(math.radians(90), 0, 0), mat_=wood_m)
        face.location = (-side * lw / 2, -0.056, DH / 2); face.parent = hinge
        sd = face.modifiers.new("sub", "SUBSURF"); sd.subdivision_type = "SIMPLE"; sd.levels = sd.render_levels = 7
        tx = bpy.data.textures.new(f"carve{side}", "IMAGE"); tx.image = image(hpath, non_color=True); tx.extension = "EXTEND"
        dsp = face.modifiers.new("d", "DISPLACE"); dsp.texture = tx; dsp.texture_coords = "UV"; dsp.strength = 0.05; dsp.mid_level = 0.5
        for p in face.data.polygons: p.use_smooth = True
        if A.get("studs"):
            for row_z in [0.25 + i * 0.42 for i in range(8)]:
                for k in range(3):
                    sx_ = -side * (0.1 + k * (lw - 0.2) / 2)
                    s = sphere("stud", 0.03, loc=(sx_, -0.075, row_z), mat_=brass, seg=12); s.scale.y = 0.6; s.parent = hinge
        # ring knocker near the meeting edge
        kn = torus(f"knock{side}", 0.11, 0.014, loc=(-side * (lw - 0.18), -0.09, 1.55), rot=(math.radians(90), 0, 0), mat_=brass); kn.parent = hinge
        bs = cylinder("boss", 0.045, 0.03, loc=(-side * (lw - 0.18), -0.075, 1.66), rot=(math.radians(90), 0, 0), mat_=brass); bs.parent = hinge
        leaves.append((hinge, side))

    # mashrabiya lattice in the arch above the doors, glowing from behind
    from PIL import Image, ImageDraw, ImageFilter
    lpath = os.path.join(out, "_lattice.png")
    im = Image.new("L", (1024, 512), 255); dl = ImageDraw.Draw(im)
    for x in range(0, 1024, 48):
        for y in range(0, 512, 48):
            dl.ellipse((x + 6, y + 6, x + 42, y + 42), fill=0)
    im.save(lpath)
    tym = prism("tympanum", [(x, z) for x, z in arch_outline() if z >= DH - 1e-6], WALL_T * 0.45, WALL_T * 0.55)
    lm, lnt, lb = node_mat("lattice")
    lb.inputs["Base Color"].default_value = hexrgb(A["wood"][1]); lb.inputs["Roughness"].default_value = 0.6
    tc = lnt.nodes.new("ShaderNodeTexCoord"); mpn = lnt.nodes.new("ShaderNodeMapping"); mpn.inputs["Scale"].default_value = (0.45, 0.9, 1)
    lt = lnt.nodes.new("ShaderNodeTexImage"); lt.image = image(lpath, non_color=True)
    lnt.links.new(tc.outputs["Object"], mpn.inputs["Vector"]); lnt.links.new(mpn.outputs[0], lt.inputs["Vector"])
    # map XZ of the arch onto the image
    sep = lnt.nodes.new("ShaderNodeSeparateXYZ"); comb = lnt.nodes.new("ShaderNodeCombineXYZ")
    lnt.links.new(mpn.outputs[0], sep.inputs[0]); lnt.links.new(sep.outputs["X"], comb.inputs["X"]); lnt.links.new(sep.outputs["Z"], comb.inputs["Y"])
    lnt.links.new(comb.outputs[0], lt.inputs["Vector"])
    trn = lnt.nodes.new("ShaderNodeBsdfTransparent"); ms = lnt.nodes.new("ShaderNodeMixShader")
    lnt.links.new(lt.outputs["Color"], ms.inputs[0]); lnt.links.new(trn.outputs[0], ms.inputs[1]); lnt.links.new(lb.outputs[0], ms.inputs[2])
    lnt.links.new(ms.outputs[0], out_node(lnt).inputs[0])
    tym.data.materials.append(lm)

    # ---------------- rug runner from the threshold to the easel
    rug_p = os.path.join(out, "_rug.png")
    rc = A.get("rug", ("#7A1F24", "#1E2A44", "#D9AE5F"))
    rug_texture(rug_p, *[tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for c in rc], ctx["seed"])
    rm_, rnt, rb = image_mat("rug", rug_p, rough=0.95, bump_k=0.25)
    rb.inputs["Sheen Weight"].default_value = 0.8
    plane("rug", 1.7, 3.9, loc=(0, 2.55, 0.012), mat_=rm_, thick=0.012)

    # brass wall lanterns either side of the door, outside
    glass = mat("lamp-glass", (1, 0.8, 0.5, 1), rough=0.2, emit=(1, 0.66, 0.32, 1), emit_k=18)
    for sx in (-1, 1):
        x = sx * (DW / 2 + 0.75)
        cylinder("sconce-glass", 0.11, 0.34, loc=(x, -0.2, 2.75), mat_=glass, verts=6)
        cylinder("sconce-cap", 0.15, 0.06, loc=(x, -0.2, 2.95), mat_=brass, verts=6)
        cylinder("sconce-base", 0.12, 0.05, loc=(x, -0.2, 2.56), mat_=brass, verts=6)
        box("sconce-arm", (0.04, 0.22, 0.04), loc=(x, -0.1, 2.75), mat_=brass)
        point("sconce", (x, -0.32, 2.75), 55, color=(1, 0.7, 0.4), radius=0.08)

    # ---------------- interior: easel, card, candles, petals
    relief = os.path.join(ctx["dir"], "relief.webp")
    cz = 0.32 + CH / 2
    crd, em = card(relief, loc=(0, CARD_Y, cz), rot=(math.radians(90), 0, 0))
    for sx in (-1, 1):
        leg = cylinder("leg", 0.022, 3.1, loc=(sx * 0.42, CARD_Y + 0.35, 1.5), rot=(math.radians(-8), math.radians(sx * 6), 0), mat_=brass)
    cylinder("leg-back", 0.022, 3.2, loc=(0, CARD_Y + 0.75, 1.5), rot=(math.radians(16), 0, 0), mat_=brass)
    box("ledge", (CW + 0.12, 0.12, 0.04), loc=(0, CARD_Y - 0.02, 0.3), mat_=brass, bevel=0.01)

    wax = mat("candle", hexrgb("#F4ECDC"), rough=0.5)
    flame_m = mat("flame", (1, 0.7, 0.35, 1), emit=(1, 0.62, 0.25, 1), emit_k=120)
    spots_ = [(-1.4, 2.3), (-1.5, 3.4), (1.45, 2.6), (1.35, 3.7), (-1.1, 5.4), (1.15, 5.6), (-1.25, 1.4), (1.3, 1.5), (-0.75, 4.5), (0.8, 4.6), (-1.6, 4.4), (1.65, 4.5)]
    for i, (x, y) in enumerate(spots_):
        h = 0.25 + (i % 3) * 0.18
        cylinder("candle", 0.07, h, loc=(x, y, h / 2), mat_=wax, verts=24)
        fl = sphere("flame", 0.045, loc=(x, y, h + 0.06), mat_=flame_m, seg=12); fl.scale = (0.55, 0.55, 1.7)
        point("cl", (x, y, h + 0.14), 14, color=(1, 0.62, 0.32), radius=0.03)

    petal_c = hexrgb(ctx["S"].get("liner") or P["glow"])
    if A.get("petal"):
        petal_c = hexrgb(A["petal"])
    pm = petal_mat("petal", mix(petal_c, (1, 1, 1, 1), 0.1))
    for i in range(34):
        x, y = rnd.gauss(0, 0.45), rnd.uniform(0.2, 3.9)
        rose_petal(rnd.uniform(0.12, 0.17), rnd.uniform(0.3, 0.8), pm, loc=(x, y, 0.026), rot=(0, 0, rnd.uniform(0, math.tau)))

    # ---------------- light
    room = area("room", (0, 4.6, 6.0), 4.0, 130, color=(1, 0.78, 0.52), aim=aim_empty((0, 4.6, 0)))
    card_aim = aim_empty((0, CARD_Y, cz))
    card_key = area("card-key", (-1.6, CARD_Y - 2.4, 3.2), 1.2, 260, color=(1, 0.9, 0.78), aim=card_aim)
    glow_wall = area("back-glow", (0, 7.6, 3.0), 5.0, 170, color=glow[:3], aim=aim_empty((0, 0, 2)))
    moon = area("moon", (-5, -7, 6), 3.0, 55, color=(0.62, 0.72, 1.0), aim=aim_empty((0, 0, 1.8)))
    rim = area("rim", (4, -3, 5), 2.0, 35, color=(1, 0.85, 0.7), aim=aim_empty((0, 0, 2)))

    # ---------------- animation
    cam, tgt = camera(lens=40, fstop=2.2)
    D = fill_distance(lens=40)
    door_z = 2.0
    cam_path(cam, tgt, [
        (T(0.0), (0.25, -8.6, 1.7), (0, 0, door_z)),
        (T(1.6), (0.15, -7.2, 1.75), (0, 0, door_z)),
        (T(3.6), (0.05, -3.6, 1.7), (0, 2.0, 1.75)),
        (T(5.6), (0.0, -0.2, cz + 0.05), (0, CARD_Y, cz)),
        (T(7.0), (0.0, CARD_Y - D, cz), (0, CARD_Y, cz)),
        (lib.END, (0.0, CARD_Y - D, cz), (0, CARD_Y, cz)),
    ])
    for hinge, side in leaves:
        a = math.radians(102) * (-side)
        key(hinge, T(0.0), rotation_euler=(0, 0, 0))
        key(hinge, T(1.1), rotation_euler=(0, 0, 0))
        key(hinge, T(1.35), rotation_euler=(0, 0, a * 0.04))   # the latch gives
        key(hinge, T(3.4), rotation_euler=(0, 0, a))
    # light inside swells as the doors open
    for f, k in ((T(0.0), 0.35), (T(1.2), 0.45), (T(3.0), 1.0)):
        for L, base in ((room, 130), (glow_wall, 170)):
            L.data.energy = base * k; L.data.keyframe_insert("energy", frame=f)
    for f, k in ((T(0.0), 1.0), (T(4.0), 1.0), (T(6.0), 0.25)):
        moon.data.energy = 55 * k; moon.data.keyframe_insert("energy", frame=f)
    end_lift(em, T(5.8), T(7.0), 0.25)
