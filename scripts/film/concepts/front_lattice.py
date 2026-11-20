"""
Mashrabiya, front on: two pierced screens (carved wood or brass) fill the screen, lantern light
spilling through their stars. They slide apart, the light patterns sweep across, and beyond
them lies the painting.
"""
import math, os
import bpy
from mathutils import Vector
import lib
from lib import *

PW, PH = 1.62, 5.4


def star_mask(path, kind):
    from PIL import Image, ImageDraw, ImageFilter
    im = Image.new("L", (512, 1024), 0); d = ImageDraw.Draw(im); s = 96
    def star(cx, cy, r1, r2, n=8, rot=0):
        return [(cx + (r1 if k % 2 == 0 else r2) * math.cos(rot + k * math.pi / n), cy + (r1 if k % 2 == 0 else r2) * math.sin(rot + k * math.pi / n)) for k in range(2 * n)]
    for gx in range(0, 512 + s, s):
        for gy in range(0, 1024 + s, s):
            if kind == "stars":
                d.polygon(star(gx, gy, 36, 18, n=8), fill=255)
                d.ellipse((gx + s / 2 - 8, gy + s / 2 - 8, gx + s / 2 + 8, gy + s / 2 + 8), fill=255)
            else:   # interlace: octagons and crosses
                d.polygon(star(gx, gy, 34, 30, n=8, rot=math.pi / 8), fill=255)
                for a in range(4):
                    ang = a * math.pi / 2 + math.pi / 4
                    d.polygon([(gx + s / 2 + 14 * math.cos(ang + t), gy + s / 2 + 14 * math.sin(ang + t)) for t in (-0.5, 0.5, math.pi - 0.5, math.pi + 0.5)], fill=255)
    # solid frame
    d.rectangle((0, 0, 512, 22), fill=0); d.rectangle((0, 1002, 512, 1024), fill=0)
    d.rectangle((0, 0, 22, 1024), fill=0); d.rectangle((490, 0, 512, 1024), fill=0)
    im.filter(ImageFilter.GaussianBlur(1.0)).save(path)
    return path


def build(ctx):
    A = ctx["art"]; out = ctx["out"]
    colour_exact()
    world("studio", strength=0.05, rotate=0.4, camera_color=A.get("void", "#05060A"))
    glare = bloom(0.4, threshold=0.88)
    mk = star_mask(os.path.join(out, "_screen.png"), A.get("pattern", "stars"))
    if A.get("brass"):
        sm = gold("screen", A["brass"], rough=0.3)
    else:
        sm = mat("screen", hexrgb(A["wood"]), rough=0.6, coat=0.2, bump=(40, 0.2))
    m, nt, b = node_mat("screen-cut"); nt.nodes.remove(b)
    # reuse the screen's surface, punched by the mask in UV space
    src = sm.node_tree.nodes["Principled BSDF"]
    b2 = nt.nodes.new("ShaderNodeBsdfPrincipled")
    for k in ("Base Color", "Roughness", "Metallic", "Coat Weight", "Anisotropic"):
        try: b2.inputs[k].default_value = src.inputs[k].default_value
        except Exception: pass
    tc = nt.nodes.new("ShaderNodeTexCoord"); tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = image(mk, non_color=True)
    nt.links.new(tc.outputs["UV"], tx.inputs["Vector"])
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); ms = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(tx.outputs["Color"], ms.inputs[0]); nt.links.new(b2.outputs[0], ms.inputs[1]); nt.links.new(tr.outputs[0], ms.inputs[2])
    nt.links.new(ms.outputs[0], out_node(nt).inputs[0])
    frame_m = gold("frame", A.get("metal", "#C9A24E"), rough=0.3) if A.get("brass") else mat("frame", dim(hexrgb(A["wood"]), 0.8), rough=0.5, coat=0.3)
    panels = []
    for side in (-1, 1):
        root = bpy.data.objects.new(f"panel{side}", None); link(root); root.location = (side * PW / 2, 0, PH / 2)
        p = plane(f"screen{side}", PW, PH, rot=(math.radians(90), 0, 0), mat_=m, thick=0.05); p.parent = root
        for (sx, sz, lx, lz) in ((PW + 0.06, 0.08, 0, PH / 2), (PW + 0.06, 0.08, 0, -PH / 2), (0.08, PH, PW / 2, 0), (0.08, PH, -PW / 2, 0)):
            f_ = box("rail", (sx, 0.09, sz), loc=(lx, 0, lz), mat_=frame_m, bevel=0.01); f_.parent = root
        panels.append((root, side))
    # glowing backdrop of warm lantern light just behind the screens (until they part)
    gm = mat("glow", (0, 0, 0, 1), emit=hexrgb(A["light"]), emit_k=1.5)
    gsock = gm.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    for root, side in panels:
        g_ = plane(f"lantern-glow{side}", PW, PH, loc=(0, 0.35, 0), rot=(math.radians(90), 0, 0), mat_=gm); g_.parent = root
    lamp = area("behind", (0, 1.6, PH / 2), 3.0, 900, color=hexrgb(A["light"])[:3], aim=aim_empty((0, -4, PH / 2)))
    keyl = area("key", (-4.0, -4.5, 5.0), 1.5, A.get("key", 160), color=(1, 0.9, 0.78), aim=aim_empty((0, 0, PH / 2)))
    plane("floor", 12, 8, loc=(0, -3.5, 0), mat_=mat("floor", hexrgb(A.get("floor", "#1A140F")), rough=0.3, coat=0.5))

    cam, tgt = camera(lens=40, fstop=4.0)
    fh = PH - 0.3; D = fh / (36 / 40); zc = PH / 2
    t_go, t_open = 1.2, 3.6
    for root, side in panels:
        x0 = side * PW / 2
        key(root, T(0.0), location=Vector((x0, 0, zc)))
        key(root, T(t_go), location=Vector((x0, 0, zc)))
        key(root, T(t_go + 0.15), location=Vector((x0 + side * 0.03, 0, zc)))
        key(root, T(t_go + 0.4), location=Vector((x0 + side * 0.025, 0, zc)))
        key(root, T(t_open), location=Vector((x0 + side * (PW * 1.08), 0, zc)))
        key(root, T(t_open + 0.3), location=Vector((x0 + side * PW * 1.12, 0, zc)))
    for f, k in ((T(t_go), 1.5), (T(t_open - 0.4), 1.2), (T(t_open), 0.6)):
        gsock.default_value = k; gsock.keyframe_insert("default_value", frame=f)
    cam_path(cam, tgt, [
        (T(0.0), (0.0, -D - 0.5, zc), (0, 0, zc)),
        (T(t_go), (0.0, -D - 0.35, zc), (0, 0, zc)),
        (T(t_open), (0.0, -D * 0.7, zc), (0, 4, zc)),
    ])
    lib.END, c, Dp = through_painting(ctx, cam, tgt, t_open, t_open + 1.8, y_center=50.0, pw_w=24.0, k=5.0, light=A["light"], z_center=zc)
    key(cam, T(t_open + 0.9), location=Vector((0, -2.0, zc))); key(tgt, T(t_open + 0.9), location=Vector((0, 20, zc)))
    for f, v in ((T(0.0), 0.45), (T(t_open), 0.6), (lib.END - 12, 0.0)):
        glare.inputs["Strength"].default_value = v; glare.inputs["Strength"].keyframe_insert("default_value", frame=f)
    handheld(cam, tgt, 0.6, until=lib.END - 24)
