"""
Lantern night: pierced brass lanterns with coloured glass hang at many heights in a
dark courtyard, throwing star-shaped light across the walls. They sway gently; the
camera drifts up through them and settles on the card standing among candles.
"""
import math, os, random
import bpy
from mathutils import Vector
import lib
from lib import *

CARD_Y = 3.9


def pierce_mask(path, kind=0):
    from PIL import Image, ImageDraw, ImageFilter
    im = Image.new("L", (512, 512), 255); d = ImageDraw.Draw(im)
    s = 64
    for gx in range(0, 512 + s, s):
        for gy in range(0, 512 + s, s):
            ox = (s / 2) if (gy // s) % 2 else 0
            cx, cy = gx + ox, gy
            if kind == 0:   # stars
                for rot in (0, math.pi / 4):
                    d.polygon([(cx + 16 * math.cos(rot + k * math.pi / 2), cy + 16 * math.sin(rot + k * math.pi / 2)) for k in range(4)], fill=0)
            elif kind == 1:   # teardrops
                d.ellipse((cx - 8, cy - 16, cx + 8, cy + 10), fill=0); d.polygon([(cx - 7, cy - 6), (cx + 7, cy - 6), (cx, cy - 26)], fill=0)
            else:   # circles
                d.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), fill=0)
            d.ellipse((cx + s / 2 - 4, cy + s / 2 - 4, cx + s / 2 + 4, cy + s / 2 + 4), fill=0)
    im.filter(ImageFilter.GaussianBlur(0.6)).save(path)


def pierced_metal(name, mask, color, tint):
    m, nt, b = node_mat(name)
    b.inputs["Base Color"].default_value = hexrgb(color); b.inputs["Metallic"].default_value = 1; b.inputs["Roughness"].default_value = 0.32
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (3, 2, 1)
    tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = image(mask, non_color=True)
    nt.links.new(tc.outputs["UV"], mp.inputs["Vector"]); nt.links.new(mp.outputs[0], tx.inputs["Vector"])
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); tr.inputs["Color"].default_value = tint
    ms = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(tx.outputs["Color"], ms.inputs[0]); nt.links.new(tr.outputs[0], ms.inputs[1]); nt.links.new(b.outputs[0], ms.inputs[2])
    nt.links.new(ms.outputs[0], out_node(nt).inputs[0])
    return m


def lantern(name, loc, scale, body_m, cap_m, glow_m, power, color, sway_seed):
    """Hexagonal fanous: pierced body, domed cap, finial, chain, a flame inside."""
    root = bpy.data.objects.new(name, None); link(root); root.location = loc
    h = 0.62 * scale; r = 0.2 * scale
    parts = [
        cylinder("body", r, h, loc=(0, 0, 0), mat_=body_m, verts=6, smooth=False),
        cylinder("glass", r * 0.86, h * 0.92, loc=(0, 0, 0), mat_=glow_m, verts=6, smooth=False),
        cylinder("base", r * 1.15, 0.05 * scale, loc=(0, 0, -h / 2 - 0.02 * scale), mat_=cap_m, verts=6, smooth=False),
        cylinder("collar", r * 1.2, 0.05 * scale, loc=(0, 0, h / 2 + 0.02 * scale), mat_=cap_m, verts=6, smooth=False),
    ]
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=r * 1.15, radius2=0.02 * scale, depth=0.34 * scale, location=(0, 0, h / 2 + 0.2 * scale))
    cone = bpy.context.object; cone.data.materials.append(cap_m); parts.append(cone)
    parts.append(sphere("finial", 0.035 * scale, loc=(0, 0, h / 2 + 0.4 * scale), mat_=cap_m, seg=12))
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=r * 0.5, radius2=0.01, depth=0.16 * scale, location=(0, 0, -h / 2 - 0.12 * scale), rotation=(math.pi, 0, 0))
    tip = bpy.context.object; tip.data.materials.append(cap_m); parts.append(tip)
    chain = cylinder("chain", 0.006, 8.0, loc=(0, 0, h / 2 + 0.42 * scale + 4.0), mat_=cap_m, verts=8)
    parts.append(chain)
    for p in parts: p.parent = root
    lt = point(name + "-light", (0, 0, -0.02), power, color=color, radius=0.02); lt.parent = root
    # gentle sway around the chain's top
    rnd = random.Random(sway_seed)
    piv = bpy.data.objects.new(name + "-pivot", None); link(piv); piv.location = (loc[0], loc[1], loc[2] + 8.0)
    root.parent = piv; root.location = (0, 0, -8.0)
    ph = rnd.uniform(0, math.tau); amp = math.radians(rnd.uniform(0.6, 1.4))
    for f in range(1, lib.END + 1, 12):
        t = f / lib.FPS
        key(piv, f, rotation_euler=(amp * math.sin(t * 1.3 + ph), amp * 0.7 * math.cos(t * 1.1 + ph), rnd.uniform(-0.01, 0.01) + 0.15 * math.sin(t * 0.4 + ph)))
    return piv


def build(ctx):
    A, P, S = ctx["art"], ctx["P"], ctx["S"]
    out, rnd = ctx["out"], random.Random(ctx["seed"])
    world("night", strength=0.05, camera_color="#05060A")

    wall_m = mat("wall", hexrgb(A["wall"]), rough=0.93, bump=(12, 0.4))
    floor_m = marble("floor", hexrgb(A["floor"]), dim(hexrgb(A["floor"]), 0.5), scale=1.4, polish=0.2)
    plane("floor", 16, 16, loc=(0, 3, 0), mat_=floor_m)
    plane("back", 16, 10, loc=(0, 7.5, 5), rot=(math.radians(90), 0, 0), mat_=wall_m)
    for sx in (-1, 1):
        plane("side", 16, 10, loc=(sx * 4.5, 3, 5), rot=(math.radians(90), 0, math.radians(90)), mat_=wall_m)
    # arcade of arches on the back wall
    from concepts.doors import arch_outline, prism
    niche = mat("niche", dim(hexrgb(A["wall"]), 0.4), rough=0.95)
    for nx in (-2.6, 0, 2.6):
        n_ = prism("arch", [(x * 0.8 + nx, z * 0.85) for x, z in arch_outline()], 7.47, 7.49); n_.data.materials.append(niche)

    # night sky with stars above the courtyard
    sky, snt, sb = node_mat("sky"); snt.nodes.remove(sb)
    tc = snt.nodes.new("ShaderNodeTexCoord"); vn = snt.nodes.new("ShaderNodeTexVoronoi"); vn.inputs["Scale"].default_value = 60
    snt.links.new(tc.outputs["Object"], vn.inputs["Vector"])
    mr = snt.nodes.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.03; mr.inputs["From Max"].default_value = 0.0
    snt.links.new(vn.outputs["Distance"], mr.inputs["Value"])
    em_ = snt.nodes.new("ShaderNodeEmission"); em_.inputs["Color"].default_value = (0.9, 0.92, 1, 1)
    mul = snt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = 6
    snt.links.new(mr.outputs[0], mul.inputs[0]); snt.links.new(mul.outputs[0], em_.inputs["Strength"])
    bgc = snt.nodes.new("ShaderNodeEmission"); bgc.inputs["Color"].default_value = hexrgb("#0B1430"); bgc.inputs["Strength"].default_value = 0.6
    ad = snt.nodes.new("ShaderNodeAddShader"); snt.links.new(em_.outputs[0], ad.inputs[0]); snt.links.new(bgc.outputs[0], ad.inputs[1])
    snt.links.new(ad.outputs[0], out_node(snt).inputs[0])
    sp = plane("sky", 40, 40, loc=(0, 3, 10), rot=(math.pi, 0, 0), mat_=sky)
    sp.visible_diffuse = False; sp.visible_glossy = False; sp.visible_shadow = False

    masks = []
    for k in range(3):
        mp = os.path.join(out, f"_pierce{k}.png"); pierce_mask(mp, k); masks.append(mp)
    brass = gold("brass", A.get("metal", "#C9A24E"), rough=0.3)
    glass_cols = [hexrgb(c) for c in A["glass"]]
    flame_c = (1.0, 0.62, 0.3)

    spots_ = [(-1.9, 1.2, 3.3, 1.2), (1.7, 1.6, 3.7, 1.0), (-0.9, 2.6, 4.2, 0.9), (0.9, 2.9, 3.0, 1.1), (-3.6, 3.6, 2.9, 1.3),
              (3.6, 3.8, 2.7, 1.2), (-0.2, 0.4, 4.4, 0.8), (0.3, 6.6, 3.6, 1.3), (-1.6, 6.8, 2.6, 1.0), (1.9, 6.9, 3.0, 1.1),
              (-3.7, 1.8, 4.2, 0.9), (3.8, 2.0, 4.3, 0.9)]
    for i, (x, y, z, s) in enumerate(spots_):
        gc = glass_cols[i % len(glass_cols)]
        gm, gnt, gb = node_mat(f"glass{i}"); gnt.nodes.remove(gb)
        tr = gnt.nodes.new("ShaderNodeBsdfTransparent"); tr.inputs["Color"].default_value = mix(gc, (1, 1, 1, 1), 0.35)
        em = gnt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = gc; em.inputs["Strength"].default_value = 0.5
        ad = gnt.nodes.new("ShaderNodeAddShader"); gnt.links.new(tr.outputs[0], ad.inputs[0]); gnt.links.new(em.outputs[0], ad.inputs[1])
        gnt.links.new(ad.outputs[0], out_node(gnt).inputs[0])
        body = pierced_metal(f"pierced{i}", masks[i % 3], A.get("metal", "#C9A24E"), (1, 1, 1, 1))
        lantern(f"lantern{i}", (x, y, z), s, body, brass, gm, 190 * s, mix((*flame_c, 1), gc, 0.35)[:3], ctx["seed"] + i)

    # the card on a low brass table with candles and petals
    relief = os.path.join(ctx["dir"], "relief.webp")
    cz = 0.55 + CH / 2
    crd, emk = card(relief, loc=(0, CARD_Y, cz), rot=(math.radians(90), 0, 0))
    cylinder("table", 1.0, 0.06, loc=(0, CARD_Y, 0.5), mat_=brass, verts=8, smooth=False)
    cylinder("table-leg", 0.12, 0.5, loc=(0, CARD_Y, 0.25), mat_=brass, verts=8)
    box("stand", (0.08, 0.3, CH * 0.7), loc=(0, CARD_Y + 0.2, 0.55 + CH * 0.35), mat_=brass)
    wax = mat("candle", hexrgb("#F2E8D5"), rough=0.5)
    flame_m = mat("flame", (1, 0.7, 0.35, 1), emit=(1, 0.6, 0.25, 1), emit_k=120)
    for i, (x, y, h) in enumerate([(-0.75, CARD_Y - 0.35, 0.3), (0.72, CARD_Y - 0.4, 0.22), (-0.5, CARD_Y - 0.65, 0.16), (0.45, CARD_Y - 0.7, 0.34),
                                   (-1.8, CARD_Y - 1.2, 0.5), (1.9, CARD_Y - 1.0, 0.42), (-1.4, CARD_Y - 2.0, 0.3), (1.3, CARD_Y - 2.2, 0.36)]):
        base = 0.53 if abs(x) < 1 else 0.0
        cylinder("candle", 0.06, h, loc=(x, y, base + h / 2), mat_=wax, verts=20)
        fl = sphere("flame", 0.04, loc=(x, y, base + h + 0.05), mat_=flame_m, seg=12); fl.scale = (0.55, 0.55, 1.7)
        point("cl", (x, y, base + h + 0.13), 10, color=(1, 0.62, 0.32), radius=0.03)
    pm = petal_mat("petal", hexrgb(A.get("petal", "#9B1C2C")))
    for i in range(40):
        a = rnd.uniform(0, math.tau); r = rnd.uniform(1.2, 3.0)
        rose_petal(rnd.uniform(0.1, 0.15), rnd.uniform(0.3, 0.8), pm, loc=(r * math.cos(a), CARD_Y - 0.8 + r * math.sin(a) * 0.8, 0.005), rot=(0, 0, rnd.uniform(0, math.tau)))

    card_aim = aim_empty((0, CARD_Y, cz))
    area("card-key", (-1.4, CARD_Y - 2.6, 2.8), 1.4, 55, color=(1, 0.86, 0.7), aim=card_aim)
    area("fill", (0, -5, 1.5), 6.0, 60, color=(1, 0.75, 0.5), aim=aim_empty((0, 3, 1.5)))
    area("moon", (-4, -6, 8), 4.0, 50, color=(0.55, 0.65, 1.0), aim=aim_empty((0, 3, 2)))

    cam, tgt = camera(lens=35, fstop=1.6)
    D = fill_distance(lens=35)
    cam_path(cam, tgt, [
        (T(0.0), (0.4, -4.2, 1.0), (0.0, 2.2, 5.6)),
        (T(2.4), (0.3, -3.2, 1.4), (-0.2, 2.6, 4.4)),
        (T(4.2), (0.1, -0.9, 2.0), (0, CARD_Y, 2.2)),
        (T(6.0), (0.0, CARD_Y - D - 0.6, cz + 0.08), (0, CARD_Y, cz)),
        (T(7.0), (0.0, CARD_Y - D, cz), (0, CARD_Y, cz)),
        (lib.END, (0.0, CARD_Y - D, cz), (0, CARD_Y, cz)),
    ])
    end_lift(emk, T(5.8), T(7.0), 0.25)
