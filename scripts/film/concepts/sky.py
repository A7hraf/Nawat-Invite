"""
Sky lanterns: paper lanterns drift up over moonlit dunes under a crescent moon. The
invitation rises with them out of the dunes, turns to face the guest and fills the frame.
"""
import math, os, random
import bpy
from mathutils import Vector
import lib
from lib import *

CARD_END = Vector((0, 4.0, 2.2))


def sky_backdrop(A, out):
    from PIL import Image, ImageDraw, ImageFilter
    m, nt, b = node_mat("sky"); nt.nodes.remove(b)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    els = ramp.color_ramp.elements
    els[0].position = 0.0; els[0].color = hexrgb(A["horizon"])
    els[1].position = 0.55; els[1].color = hexrgb(A["sky"])
    e = els.new(0.22); e.color = mix(hexrgb(A["horizon"]), hexrgb(A["sky"]), 0.6)
    nt.links.new(sep.outputs["Y"], ramp.inputs[0])
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = 1.0
    nt.links.new(ramp.outputs[0], em.inputs["Color"])
    vn = nt.nodes.new("ShaderNodeTexVoronoi"); vn.inputs["Scale"].default_value = 220
    nt.links.new(tc.outputs["Generated"], vn.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.06; mr.inputs["From Max"].default_value = 0.0
    nt.links.new(vn.outputs["Distance"], mr.inputs["Value"])
    sm = nt.nodes.new("ShaderNodeMath"); sm.operation = "MULTIPLY"; sm.inputs[1].default_value = 5.0
    sy = nt.nodes.new("ShaderNodeMath"); sy.operation = "MULTIPLY"
    nt.links.new(mr.outputs[0], sm.inputs[0]); nt.links.new(sm.outputs[0], sy.inputs[0]); nt.links.new(sep.outputs["Y"], sy.inputs[1])
    se = nt.nodes.new("ShaderNodeEmission"); se.inputs["Color"].default_value = (1, 0.97, 0.9, 1)
    nt.links.new(sy.outputs[0], se.inputs["Strength"])
    ad = nt.nodes.new("ShaderNodeAddShader"); nt.links.new(em.outputs[0], ad.inputs[0]); nt.links.new(se.outputs[0], ad.inputs[1])
    nt.links.new(ad.outputs[0], out_node(nt).inputs[0])
    bp = plane("sky", 120, 60, loc=(0, 45, 22), rot=(math.radians(90), 0, 0), mat_=m)
    bp.visible_diffuse = False; bp.visible_shadow = False; bp.visible_glossy = False
    # crescent moon with a soft halo
    mp = os.path.join(out, "_moon.png")
    im = Image.new("RGBA", (512, 512), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse((96, 96, 416, 416), fill=(255, 246, 225, 255)); d.ellipse((170, 60, 470, 380), fill=(0, 0, 0, 0))
    halo = im.filter(ImageFilter.GaussianBlur(28)); halo.alpha_composite(im); halo.save(mp)
    mm, mnt, mb = node_mat("moon"); mnt.nodes.remove(mb)
    tx = mnt.nodes.new("ShaderNodeTexImage"); tx.image = image(mp)
    tcm = mnt.nodes.new("ShaderNodeTexCoord"); mnt.links.new(tcm.outputs["UV"], tx.inputs["Vector"])
    me_ = mnt.nodes.new("ShaderNodeEmission"); me_.inputs["Strength"].default_value = 6
    mnt.links.new(tx.outputs["Color"], me_.inputs["Color"])
    trn = mnt.nodes.new("ShaderNodeBsdfTransparent"); mx = mnt.nodes.new("ShaderNodeMixShader")
    mnt.links.new(tx.outputs["Alpha"], mx.inputs[0]); mnt.links.new(trn.outputs[0], mx.inputs[1]); mnt.links.new(me_.outputs[0], mx.inputs[2])
    mnt.links.new(mx.outputs[0], out_node(mnt).inputs[0])
    mo = plane("moon", 7, 7, loc=(-9, 43, 24), rot=(math.radians(90), 0, math.radians(-12)), mat_=mm)
    mo.visible_diffuse = False; mo.visible_shadow = False


def build(ctx):
    A = ctx["art"]; rnd = random.Random(ctx["seed"]); out = ctx["out"]
    world("night", strength=0.06, camera_color=A["sky"])
    sky_backdrop(A, out)

    # dunes
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 18, 0)); dunes = bpy.context.object; dunes.scale = (90, 60, 1)
    bpy.ops.object.transform_apply(scale=True)
    sd = dunes.modifiers.new("s", "SUBSURF"); sd.subdivision_type = "SIMPLE"; sd.levels = sd.render_levels = 7
    tx = bpy.data.textures.new("dune", "CLOUDS"); tx.noise_scale = 9.0; tx.noise_depth = 1
    dp = dunes.modifiers.new("d", "DISPLACE"); dp.texture = tx; dp.strength = 3.2; dp.mid_level = 0.6
    for p in dunes.data.polygons: p.use_smooth = True
    sand, snt, sb = node_mat("sand"); sb.inputs["Base Color"].default_value = hexrgb(A["sand"]); sb.inputs["Roughness"].default_value = 0.95
    bump_noise(snt, sb, scale=400, strength=0.15)
    dunes.data.materials.append(sand)

    # paper sky lanterns
    paper_m, pnt, pb = node_mat("lantern-paper"); pnt.nodes.remove(pb)
    tr = pnt.nodes.new("ShaderNodeBsdfTranslucent"); tr.inputs["Color"].default_value = hexrgb("#FFC27A")
    em = pnt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = hexrgb(A["glow"])
    # brightest near the flame at the open bottom, dimmer toward the crown
    gtc = pnt.nodes.new("ShaderNodeTexCoord"); gsep = pnt.nodes.new("ShaderNodeSeparateXYZ"); pnt.links.new(gtc.outputs["Generated"], gsep.inputs[0])
    gmr = pnt.nodes.new("ShaderNodeMapRange"); gmr.inputs["To Min"].default_value = 4.5; gmr.inputs["To Max"].default_value = 0.8
    pnt.links.new(gsep.outputs["Z"], gmr.inputs["Value"]); pnt.links.new(gmr.outputs[0], em.inputs["Strength"])
    gcol = pnt.nodes.new("ShaderNodeMix"); gcol.data_type = "RGBA"; gcol.inputs["A"].default_value = hexrgb("#FFD08A"); gcol.inputs["B"].default_value = hexrgb("#E0662A")
    pnt.links.new(gsep.outputs["Z"], gcol.inputs["Factor"]); pnt.links.new(gcol.outputs["Result"], em.inputs["Color"])
    lw = pnt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.5
    ms = pnt.nodes.new("ShaderNodeMixShader"); pnt.links.new(lw.outputs["Facing"], ms.inputs[0])
    pnt.links.new(em.outputs[0], ms.inputs[1]); pnt.links.new(tr.outputs[0], ms.inputs[2])
    pnt.links.new(ms.outputs[0], out_node(pnt).inputs[0])
    rim_m = mat("rim", hexrgb("#3A2412"), rough=0.8)
    for i in range(95):
        far = rnd.random() ** 0.8
        y = 5.5 + far * 30
        x = rnd.uniform(-1, 1) * (3 + y * 0.7)
        if y < 9 and abs(x) < 2.4: x = math.copysign(2.4 + abs(x), x if x else 1)
        z0 = rnd.uniform(-1.0, 3.0) + far * rnd.uniform(0, 9)
        s = rnd.uniform(0.75, 1.15)
        root = bpy.data.objects.new(f"sl{i}", None); link(root)
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.19 * s, radius2=0.24 * s, depth=0.62 * s, end_fill_type="NOTHING")
        c = bpy.context.object; c.data.materials.append(paper_m); c.parent = root
        for p in c.data.polygons: p.use_smooth = True
        r_ = torus("ring", 0.19 * s, 0.008, loc=(0, 0, -0.31 * s), mat_=rim_m); r_.parent = root
        if i < 10 and y < 9:
            point(f"slp{i}", (0, 0, -0.1), 25, color=(1, 0.66, 0.35), radius=0.1).parent = root
        speed = rnd.uniform(0.18, 0.42) * (1 + far)
        ph = rnd.uniform(0, math.tau)
        for f in range(1, lib.END + 1, 18):
            t = (f - 1) / lib.FPS
            key(root, f, location=Vector((x + 0.15 * math.sin(t * 0.7 + ph), y + 0.1 * t, z0 + speed * t)),
                rotation_euler=(0.06 * math.sin(t + ph), 0.06 * math.cos(t * 0.8 + ph), t * 0.2 + ph))

    # the card rises from behind the near dune crest
    relief = os.path.join(ctx["dir"], "relief.webp")
    crd, emk = card(relief)
    key(crd, T(0.0), location=Vector((0.2, 6.5, -2.4)), rotation_euler=(math.radians(60), 0, math.radians(-8)))
    key(crd, T(2.6), location=Vector((0.2, 6.2, -1.2)), rotation_euler=(math.radians(66), 0, math.radians(-6)))
    key(crd, T(4.6), location=Vector((0.1, 5.0, 1.4)), rotation_euler=(math.radians(84), 0, math.radians(-2)))
    key(crd, T(6.4), location=CARD_END.copy(), rotation_euler=(math.radians(90), 0, 0))
    key(crd, lib.END, location=CARD_END.copy(), rotation_euler=(math.radians(90), 0, 0))
    glow = point("card-glow", (0, 0, 0), 0, color=(1, 0.7, 0.42), radius=0.3)
    glow.location = (0.6, CARD_END.y - 1.4, CARD_END.z + 0.4)
    for f, k in ((T(3.0), 0), (T(5.5), 60)):
        glow.data.energy = k; glow.data.keyframe_insert("energy", frame=f)
    area("moonlight", (-14, 30, 18), 8, 2600, color=(0.62, 0.72, 1.0), aim=aim_empty((0, 4, 0)))
    area("card-key", (-1.2, CARD_END.y - 2.6, 3.4), 1.6, 45, color=(1, 0.86, 0.68), aim=aim_empty(tuple(CARD_END)))

    cam, tgt = camera(lens=45, fstop=1.4)
    D = fill_distance(lens=45)
    cam_path(cam, tgt, [
        (T(0.0), (0.0, -1.5, 1.5), (0.0, 30, 7.5)),
        (T(2.8), (0.0, -1.2, 1.7), (0.0, 22, 5.0)),
        (T(4.8), (0.0, CARD_END.y - D - 1.5, CARD_END.z + 0.2), (0, 5.0, 1.6)),
        (T(6.6), (0.0, CARD_END.y - D, CARD_END.z), tuple(CARD_END)),
        (lib.END, (0.0, CARD_END.y - D, CARD_END.z), tuple(CARD_END)),
    ])
    end_lift(emk, T(5.8), T(6.8), 0.3)
