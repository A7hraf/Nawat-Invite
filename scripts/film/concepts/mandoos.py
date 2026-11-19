"""
Mandoos: an Omani bridal chest of dark wood, studded and plated in brass, stands on a
woven mat in evening light. The hasp lifts, the lid opens on sea-blue silk, and the
invitation rises out of the chest to meet the guest.
"""
import math, os, random
import bpy
from mathutils import Vector
import lib
from lib import *

BW, BD, BH = 2.1, 1.3, 1.0
CARD_END = Vector((0, -0.6, 2.25))


def weave(path, c1, c2):
    from PIL import Image, ImageDraw
    im = Image.new("RGB", (512, 512), c1); d = ImageDraw.Draw(im)
    for y in range(0, 512, 32):
        for x in range(0, 512, 32):
            if ((x // 32) + (y // 32)) % 2: d.rectangle((x, y + 3, x + 32, y + 29), fill=c2)
            else: d.rectangle((x + 3, y, x + 29, y + 32), fill=c2)
    im.save(path)


def build(ctx):
    A = ctx["art"]; out = ctx["out"]; rnd = random.Random(ctx["seed"])
    world("sunset", strength=0.05, rotate=2.4, camera_color="#0B1218")
    wp = os.path.join(out, "_weave.png")
    weave(wp, tuple(int(A["mat"][0][i:i + 2], 16) for i in (1, 3, 5)), tuple(int(A["mat"][1][i:i + 2], 16) for i in (1, 3, 5)))
    mm, mnt, mb = image_mat("mat", wp, rough=0.9, bump_k=0.3)
    mp = mnt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (14, 14, 1)
    tc = [n for n in mnt.nodes if n.type == "TEX_COORD"][0]; tx = [n for n in mnt.nodes if n.type == "TEX_IMAGE"][0]
    mnt.links.new(tc.outputs["UV"], mp.inputs["Vector"]); mnt.links.new(mp.outputs[0], tx.inputs["Vector"])
    bpy.ops.mesh.primitive_circle_add(vertices=64, radius=2.6, fill_type="NGON", location=(0, 0.2, 0.004))
    mat_ob = bpy.context.object; mat_ob.data.materials.append(mm)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.uv.cube_project(); bpy.ops.object.mode_set(mode="OBJECT")
    plane("floor", 30, 30, loc=(0, 6, 0), mat_=mat("floor", hexrgb(A["floor"]), rough=0.6, bump=(6, 0.2)))
    wall = mat("wall", hexrgb(A["wall"]), rough=0.95, bump=(12, 0.3))
    plane("back", 30, 12, loc=(0, 4.0, 6), rot=(math.radians(90), 0, 0), mat_=wall)
    # arched window with the sea at dusk behind
    from concepts.doors import arch_outline, prism
    win = prism("window", [(x * 0.75 + 2.4, z * 0.7 + 1.2) for x, z in arch_outline()], 3.98, 4.0)
    sea = mat("dusk", (0, 0, 0, 1), emit=hexrgb(A["dusk"]), emit_k=2.2); win.data.materials.append(sea)

    wood_m = wood("mandoos-wood", hexrgb(A["wood"][0]), hexrgb(A["wood"][1]), scale=2.6, rough=0.4)
    brass = gold("brass", "#D2A955", rough=0.25)
    silk = satin("silk", hexrgb(A["silk"]))

    # hollow chest: four walls and a floor, the well lined with rumpled silk
    t_ = 0.07; hb = BH * 0.78
    box("front", (BW, t_, hb), loc=(0, -BD / 2 + t_ / 2, hb / 2), mat_=wood_m, bevel=0.015)
    box("back", (BW, t_, hb), loc=(0, BD / 2 - t_ / 2, hb / 2), mat_=wood_m, bevel=0.015)
    for sx in (-1, 1):
        box("side", (t_, BD, hb), loc=(sx * (BW / 2 - t_ / 2), 0, hb / 2), mat_=wood_m, bevel=0.015)
    box("bottom", (BW, BD, 0.1), loc=(0, 0, 0.05), mat_=wood_m)
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=60, y_subdivisions=40, size=1, location=(0, 0, hb * 0.86))
    lining = bpy.context.object; lining.scale = (BW - 2 * t_, BD - 2 * t_, 1)
    tx = bpy.data.textures.new("rumple", "CLOUDS"); tx.noise_scale = 0.18
    dp = lining.modifiers.new("d", "DISPLACE"); dp.texture = tx; dp.strength = 0.05
    for pg in lining.data.polygons: pg.use_smooth = True
    lining.data.materials.append(silk)
    for sx in (-1, 1):
        box("foot", (0.22, 0.22, 0.1), loc=(sx * (BW / 2 - 0.15), 0, 0.05), mat_=wood_m, bevel=0.02)
    # brass bands, corner plates and studs on the front
    fy = -BD / 2 - 0.005
    for z in (0.12, BH * 0.7):
        box("band", (BW + 0.01, 0.012, 0.06), loc=(0, fy, z), mat_=brass, bevel=0.003)
    for sx in (-1, 1):
        box("corner", (0.2, 0.012, 0.6), loc=(sx * (BW / 2 - 0.1), fy, 0.42), mat_=brass, bevel=0.003)
    for i in range(-9, 10):
        for j in range(0, 7):
            if (i + j) % 2: continue
            x = i * 0.085; z = 0.2 + j * 0.065
            if abs(x) < 0.2 and z > 0.35: continue
            s = sphere("stud", 0.017, loc=(x, fy - 0.005, z + 0.02), mat_=brass, seg=10); s.scale.y = 0.6
    box("lockplate", (0.26, 0.012, 0.3), loc=(0, fy - 0.004, 0.52), mat_=brass, bevel=0.01)

    # lid hinged at the back
    hinge = bpy.data.objects.new("hinge", None); link(hinge); hinge.location = (0, BD / 2, BH * 0.78)
    lid = box("lid", (BW + 0.04, BD + 0.04, 0.2), loc=(0, -BD / 2, 0.1), mat_=wood_m, bevel=0.03); lid.parent = hinge
    lid_in = box("lid-in", (BW - 0.16, BD - 0.16, 0.02), loc=(0, -BD / 2, -0.005), mat_=wood("lid-inner", dim(hexrgb(A["wood"][0]), 0.8), hexrgb(A["wood"][1]), scale=3.0), bevel=0.01); lid_in.parent = hinge
    for i in range(-10, 11):
        for yy in (-0.12, -BD + 0.12):
            st_ = sphere("lid-in-stud", 0.014, loc=(i * 0.095, yy, -0.02), mat_=brass, seg=8); st_.parent = hinge
    for x in (-0.6, 0, 0.6):
        b_ = box("lid-band", (0.08, BD + 0.06, 0.012), loc=(x, -BD / 2, 0.205), mat_=brass, bevel=0.003); b_.parent = hinge
    for i in range(-11, 12):
        s = sphere("lid-stud", 0.018, loc=(i * 0.09, -BD - 0.025, 0.1), mat_=brass, seg=10); s.parent = hinge
    hasp = box("hasp", (0.12, 0.015, 0.26), loc=(0, -BD - 0.03, 0.0), mat_=brass, bevel=0.005); hasp.parent = hinge

    # card lying in the chest on the silk
    relief = os.path.join(ctx["dir"], "relief.webp")
    crd, em = card(relief)
    rest = Vector((0, -0.02, BH * 0.78 * 0.86 + 0.06))
    key(crd, T(0.0), location=rest.copy(), rotation_euler=(0, 0, math.radians(90)), scale=Vector((0.55, 0.55, 1)))
    key(crd, T(3.0), location=rest.copy(), rotation_euler=(0, 0, math.radians(90)), scale=Vector((0.55, 0.55, 1)))
    key(crd, T(4.4), location=Vector((0, -0.2, BH + 0.9)), rotation_euler=(math.radians(45), 0, math.radians(25)), scale=Vector((0.8, 0.8, 1)))
    key(crd, T(6.2), location=CARD_END.copy(), rotation_euler=(math.radians(90), 0, 0), scale=Vector((1, 1, 1)))
    key(crd, lib.END, location=CARD_END.copy(), rotation_euler=(math.radians(90), 0, 0), scale=Vector((1, 1, 1)))

    key(hasp, T(0.0), rotation_euler=(0, 0, 0))
    key(hasp, T(0.8), rotation_euler=(0, 0, 0))
    key(hasp, T(1.3), rotation_euler=(math.radians(-80), 0, 0))
    key(hinge, T(0.0), rotation_euler=(0, 0, 0))
    key(hinge, T(1.4), rotation_euler=(0, 0, 0))
    key(hinge, T(3.2), rotation_euler=(math.radians(-108), 0, 0))

    # light
    aim = aim_empty((0, 0, 0.6))
    keyl = area("key", (-4.5, -2.5, 5.0), 0.8, 1500, color=(1, 0.82, 0.6), aim=aim)
    gobo(keyl, aim, window_mask(os.path.join(out, "_gobo.png"), seed=7), at=0.7, size=4.0)
    area("fill", (4, -5, 3), 6, 60, color=(0.6, 0.75, 1.0), aim=aim)
    area("rim", (2.8, 3.0, 3.2), 2, 700, color=(1, 0.72, 0.45), aim=aim)
    glow = point("chest-glow", (0, -0.1, BH * 0.9), 0, color=(1, 0.75, 0.45), radius=0.4)
    for f, k in ((T(1.6), 0), (T(3.2), 45)):
        glow.data.energy = k; glow.data.keyframe_insert("energy", frame=f)
    area("card-key", (-1.0, CARD_END.y - 2.6, 3.2), 1.4, 70, color=(1, 0.9, 0.78), aim=aim_empty(tuple(CARD_END)))
    pm = petal_mat("petal", hexrgb(A["petal"]))
    for i in range(22):
        a_ = rnd.uniform(0, math.tau); r = rnd.uniform(1.4, 2.4)
        rose_petal(rnd.uniform(0.1, 0.15), rnd.uniform(0.3, 0.8), pm, loc=(r * math.cos(a_), 0.2 + r * math.sin(a_) * 0.8, 0.01), rot=(0, 0, rnd.uniform(0, math.tau)))

    cam, tgt = camera(lens=40, fstop=2.0)
    D = fill_distance(lens=40)
    cam_path(cam, tgt, [
        (T(0.0), (1.9, -4.4, 1.5), (0, 0, 0.55)),
        (T(1.6), (1.5, -4.0, 1.7), (0, 0, 0.65)),
        (T(3.4), (0.6, -3.3, 2.5), (0, 0, 0.8)),
        (T(5.2), (0.1, CARD_END.y - D - 0.8, CARD_END.z + 0.1), (0, CARD_END.y, CARD_END.z - 0.1)),
        (T(6.6), (0.0, CARD_END.y - D, CARD_END.z), tuple(CARD_END)),
        (lib.END, (0.0, CARD_END.y - D, CARD_END.z), tuple(CARD_END)),
    ])
    end_lift(em, T(5.6), T(6.6), 0.28)
