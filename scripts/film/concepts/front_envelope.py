"""
Embossed envelope, front on: the whole screen is the envelope, its paper embossed with lace,
in the painting's own colours. The seal cracks and its halves fall away, the flap lifts,
light pours out, and the camera drifts through the light into the painting itself, which
comes alive in depth and settles exactly on the painted scene the page shows next.
"""
import math, os, random
import bpy
from mathutils import Vector
import lib
from lib import *

W = 1.5
H = W * 16 / 9 * 1.0
FH = 1.25            # flap depth


def paper_emboss(name, color, lace, scale=1.6, strength=0.9, foil=None):
    m, nt, b = node_mat(name)
    b.inputs["Base Color"].default_value = color
    b.inputs["Roughness"].default_value = 0.62; b.inputs["Sheen Weight"].default_value = 0.35
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (scale, scale * H / W, 1)
    tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = image(lace, non_color=True)
    nt.links.new(tc.outputs["UV"], mp.inputs["Vector"]); nt.links.new(mp.outputs[0], tx.inputs["Vector"])
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = strength; bp.inputs["Distance"].default_value = 0.02
    nt.links.new(tx.outputs["Color"], bp.inputs["Height"])
    fib = nt.nodes.new("ShaderNodeTexNoise"); fib.inputs["Scale"].default_value = 300; fib.inputs["Detail"].default_value = 6
    nt.links.new(tc.outputs["Object"], fib.inputs["Vector"])
    bp2 = nt.nodes.new("ShaderNodeBump"); bp2.inputs["Strength"].default_value = 0.08
    nt.links.new(fib.outputs["Fac"], bp2.inputs["Height"]); nt.links.new(bp.outputs[0], bp2.inputs["Normal"])
    nt.links.new(bp2.outputs[0], b.inputs["Normal"])
    # raised lace catches a little more light: brighten the peaks slightly
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.inputs["A"].default_value = color; mx.inputs["B"].default_value = mix(color, (1, 1, 1, 1), 0.12)
    nt.links.new(tx.outputs["Color"], mx.inputs["Factor"]); nt.links.new(mx.outputs["Result"], b.inputs["Base Color"])
    return m


def tri(name, pts, mats, uvmap):
    from lib import mesh_obj
    ob = mesh_obj(name, [(x, 0, z) for x, z in pts], [list(range(len(pts)))], mats, uvs=uvmap)
    s = ob.modifiers.new("t", "SOLIDIFY"); s.thickness = 0.012; s.offset = 1; s.material_offset = 1 if len(mats) > 1 else 0
    bv = ob.modifiers.new("b", "BEVEL"); bv.width = 0.005; bv.segments = 2
    return ob


def build(ctx):
    A, P = ctx["art"], ctx["P"]; out = ctx["out"]; rnd = random.Random(ctx["seed"])
    lib.END = 204; lib.scn.frame_end = lib.END
    colour_exact()
    world("studio", strength=0.08, rotate=0.5, camera_color=A.get("void", "#000000"))
    glare = bloom(0.35, threshold=0.9)

    lace = damask(os.path.join(out, "_lace.png"), seed=ctx["seed"], kind=A.get("lace", "floral"))
    paper_c = hexrgb(A["paper"])
    body_m = paper_emboss("env-body", paper_c, lace)
    flap_m = paper_emboss("env-flap", mix(paper_c, (1, 1, 1, 1), 0.1), lace, scale=1.6, strength=1.0)
    # liner: the painting itself, softly, on the inside of the flap and the back
    lm, lnt, lb = image_mat("liner", os.path.join(ctx["dir"], "reveal.webp"), rough=0.55)
    lb.inputs["Emission Color"].default_value = (1, 1, 1, 1)
    inner = paper("env-inner", dim(paper_c, 0.92))

    uv = lambda co: ((co.x + W / 2) / W, (co.z + H / 2) / H)
    # back panel (liner side faces the camera), pocket (lower body), flap (hinged at the top)
    back = tri("back", [(-W / 2, -H / 2), (W / 2, -H / 2), (W / 2, H / 2), (-W / 2, H / 2)], [lm, inner], uv)
    back.location.y = 0.02
    notch = H / 2 - 0.55
    pocket = tri("pocket", [(-W / 2, -H / 2), (W / 2, -H / 2), (W / 2, H / 2 - 0.02), (0, notch), (-W / 2, H / 2 - 0.02)], [body_m, inner], uv)
    pocket.location.y = -0.004
    # gold foil edge on the pocket's V
    foil = gold("foil", A.get("metal", "#C9A24E"), rough=0.25)
    tip = [(0.18 * math.cos(math.pi + i * math.pi / 8), -FH + 0.18 + 0.18 * math.sin(math.pi + i * math.pi / 8) * 0.6) for i in range(9)]
    flap_pts = [(-W / 2, 0.0), (-0.24, -FH + 0.24)] + tip[1:-1] + [(0.24, -FH + 0.24), (W / 2, 0.0)]
    flap = tri("flap", flap_pts, [flap_m, lm], lambda co: ((co.x + W / 2) / W, (co.z + H) / H))
    hinge = bpy.data.objects.new("hinge", None); link(hinge); hinge.location = (0, -0.012, H / 2)
    flap.parent = hinge; flap.location = (0, 0, 0)
    # the flap's own gold edge
    for sx in (-1, 1):
        ln = cylinder("foil-f", 0.006, math.hypot(W / 2 - 0.24, FH - 0.24), mat_=foil, verts=8)
        ln.parent = hinge; ln.location = (sx * (W / 2 + 0.24) / 2, -0.008, -(FH - 0.24) / 2)
        ln.rotation_euler = (0, sx * math.atan2(W / 2 - 0.24, FH - 0.24), 0)

    # seal at the flap's tip, facing the camera
    emb = emblem(os.path.join(out, "_emb.png"), kind=A.get("emblem", "khatam"))
    sl, sr = wax_seal(0.24, hexrgb(A["seal"]), hexrgb(A.get("metal", "#C9A24E")), emb)
    seal_z = H / 2 - FH + 0.22
    seal_root = bpy.data.objects.new("seal-root", None); link(seal_root)
    seal_root.location = (0, -0.02, seal_z); seal_root.rotation_euler = (math.radians(90), 0, 0)
    for s in (sl, sr): s.parent = seal_root
    # a silk ribbon running under the seal

    # inner light: hidden behind the flap until it opens
    glow_m = mat("glow", (1, 1, 1, 1), emit=hexrgb(A["light"]), emit_k=0.0)
    glow_sock = glow_m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    gp = plane("inner-light", W * 0.9, 0.5, loc=(0, 0.01, H / 2 - 0.2), rot=(math.radians(90), 0, 0), mat_=glow_m)
    lamp = area("inner-lamp", (0, 0.3, H / 2 + 0.1), 1.2, 0, color=hexrgb(A["light"])[:3], aim=aim_empty((0, -2, H / 2 - 0.5)))

    # soft key light on the envelope
    aim = aim_empty((0, 0, 0))
    keyl = area("key", (-3.2, -3.4, 2.4), 2.0, 420, color=(1, 0.95, 0.88), aim=aim)
    area("fill", (3.5, -4.5, -1.0), 4.0, 35, color=(0.95, 0.96, 1.0), aim=aim)
    gobo(keyl, aim, window_mask(os.path.join(out, "_gobo.png"), seed=ctx["seed"] % 7, bars=22), at=0.55, size=3.2)

    cam, tgt = camera(lens=50, fstop=2.8)
    D = (H * 0.97) / (36 / 50)
    # ------------------------------------------------ timeline
    t_crack, t_flap0, t_flap1 = 0.9, 1.5, 3.0
    # seal: a tremor, the crack, then the halves fall under gravity, tumbling
    for s, sx in ((sl, -1), (sr, 1)):
        key(s, T(0.0), location=Vector((0, 0, 0)), rotation_euler=(0, 0, 0))
        key(s, T(t_crack - 0.12), location=Vector((0, 0, 0)), rotation_euler=(0, 0, 0))
        key(s, T(t_crack), location=Vector((0.012 * sx, 0, 0.004)), rotation_euler=(0, math.radians(3 * sx), 0))
        key(s, T(t_crack + 0.18), location=Vector((0.03 * sx, 0, 0.01)), rotation_euler=(0, math.radians(5 * sx), math.radians(-4 * sx)))
        # ballistic fall in seal space (seal Y = world -Z after the 90 degree tilt)
        for i, tt in enumerate([0.12 * k for k in range(1, 11)]):
            g = 9.0 * tt * tt
            key(s, T(t_crack + 0.18 + tt), location=Vector((0.03 * sx + 0.35 * sx * tt, -g, 0.25 * tt)),
                rotation_euler=(math.radians(-70 * tt), math.radians((5 + 80 * tt) * sx), math.radians((-4 - 140 * tt) * sx)))
    # flap: unsticks, lifts with a slight float, settles back against the top
    key(hinge, T(0.0), rotation_euler=(0, 0, 0))
    key(hinge, T(t_flap0), rotation_euler=(0, 0, 0))
    key(hinge, T(t_flap0 + 0.25), rotation_euler=(math.radians(-7), 0, 0))
    key(hinge, T(t_flap0 + 0.45), rotation_euler=(math.radians(-5), 0, 0))
    key(hinge, T(t_flap1 - 0.35), rotation_euler=(math.radians(-150), 0, 0))
    key(hinge, T(t_flap1), rotation_euler=(math.radians(-178), 0, 0))
    key(hinge, T(t_flap1 + 0.3), rotation_euler=(math.radians(-172), 0, 0))
    key(hinge, T(t_flap1 + 0.6), rotation_euler=(math.radians(-175), 0, 0))
    # light swells out of the envelope
    for f, k_ in ((T(t_flap0 + 0.3), 0.0), (T(t_flap1), 6.0), (T(4.2), 25.0)):
        glow_sock.default_value = k_; glow_sock.keyframe_insert("default_value", frame=f)
        lamp.data.energy = k_ * 30; lamp.data.keyframe_insert("energy", frame=f)
    cam_path(cam, tgt, [
        (T(0.0), (0.0, -D - 0.06, 0.02), (0, 0, 0.0)),
        (T(1.4), (0.0, -D, 0.0), (0, 0, 0.0)),
        (T(3.2), (0.0, -D + 0.6, 0.35), (0, 0, H / 2 - 0.35)),
        (T(4.4), (0.0, -0.4, H / 2 - 0.1), (0, 2, H / 2 - 0.2)),
    ])
    lib.END = into_painting(ctx, cam, tgt, 4.4, light=A["light"], glare=glare)
    lib.scn.frame_end = lib.END
    handheld(cam, tgt, 0.5, until=lib.END - 24)
    # drifting dust in the light
    dust_m = mat("dust", (1, 1, 1, 1), emit=hexrgb(A["light"]), emit_k=6)
    for i in range(22):
        d = sphere("dust", rnd.uniform(0.003, 0.006), loc=(rnd.uniform(-0.6, 0.6), rnd.uniform(-0.9, -0.3), rnd.uniform(0.9, 1.5)), mat_=dust_m, seg=6)
        d.scale = (0.001, 0.001, 0.001); key(d, T(2.4), location=d.location.copy(), scale=Vector((0.001, 0.001, 0.001)))
        key(d, T(3.2), scale=Vector((1, 1, 1)))
        key(d, T(4.4), location=d.location + Vector((rnd.uniform(-0.2, 0.2), rnd.uniform(-0.1, 0.1), rnd.uniform(0.1, 0.4))), scale=Vector((1, 1, 1)))
