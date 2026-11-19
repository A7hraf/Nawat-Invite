"""Shared helpers for Nawat opening films (Blender / Cycles)."""
import math, os, random
import bpy, bmesh
from mathutils import Vector, Euler

def _root():
    d = os.path.dirname(os.path.abspath(__file__))
    while d != "/" and not os.path.exists(os.path.join(d, "package.json")): d = os.path.dirname(d)
    return d
ROOT = _root()
HDRI = os.path.join(os.path.dirname(__file__), "hdri")
FPS = 24
END = 180          # 7.5 s
CW, CH = 1.40, 1.40 * 16 / 9   # the invitation card, exactly 9:16
scn = None


def T(sec):
    return int(round(sec * FPS)) + 1


# ------------------------------------------------------------------ colour
def hexrgb(h, a=1.0):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return (*[x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c], a)


def mix(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(4))


def dim(c, k):
    return (c[0] * k, c[1] * k, c[2] * k, 1)


# ------------------------------------------------------------------ setup
def setup(samples, res_w, end=END):
    global scn
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    r, c = scn.render, scn.cycles
    r.engine = "CYCLES"; c.device = "CPU"
    c.samples = samples; c.use_adaptive_sampling = True; c.adaptive_threshold = 0.06
    c.use_denoising = True
    c.max_bounces = 4; c.diffuse_bounces = 2; c.glossy_bounces = 2; c.transmission_bounces = 2; c.transparent_max_bounces = 8
    c.caustics_reflective = False; c.caustics_refractive = False; c.blur_glossy = 1.0
    c.sample_clamp_indirect = 8.0
    r.resolution_x = res_w; r.resolution_y = int(res_w * 16 / 9)
    r.fps = FPS; scn.frame_start, scn.frame_end = 1, end
    r.use_motion_blur = False
    r.use_persistent_data = True
    scn.view_settings.view_transform = "AgX"
    scn.view_settings.look = "AgX - Medium High Contrast"
    r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGB"; r.image_settings.compression = 15
    return scn


def world(hdri="studio", strength=0.6, rotate=0.0, camera_color="#000000", tint=(1, 1, 1, 1)):
    """HDRI for light and reflections; the camera sees a flat colour (sets have their own backdrops)."""
    w = bpy.data.worlds.new("w"); scn.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0, 0, rotate)
    env = nt.nodes.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(os.path.join(HDRI, hdri + ".exr"))
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"]); nt.links.new(mp.outputs[0], env.inputs["Vector"])
    tint_n = nt.nodes.new("ShaderNodeMix"); tint_n.data_type = "RGBA"; tint_n.blend_type = "MULTIPLY"; tint_n.inputs["Factor"].default_value = 1
    nt.links.new(env.outputs["Color"], tint_n.inputs["A"]); tint_n.inputs["B"].default_value = tint
    bg = nt.nodes.new("ShaderNodeBackground"); bg.inputs["Strength"].default_value = strength
    nt.links.new(tint_n.outputs["Result"], bg.inputs["Color"])
    cam_bg = nt.nodes.new("ShaderNodeBackground"); cam_bg.inputs["Color"].default_value = hexrgb(camera_color)
    lp = nt.nodes.new("ShaderNodeLightPath"); mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lp.outputs["Is Camera Ray"], mx.inputs[0]); nt.links.new(bg.outputs[0], mx.inputs[1]); nt.links.new(cam_bg.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs[0])
    return w


# ------------------------------------------------------------------ materials
def node_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(b.outputs[0], out.inputs[0])
    return m, nt, b


def out_node(nt):
    return [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]


def image(path, non_color=False):
    img = bpy.data.images.load(path, check_existing=True)
    if non_color: img.colorspace_settings.name = "Non-Color"
    return img


def bump_noise(nt, b, scale=180.0, strength=0.12, detail=8, coords="Object"):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n1 = nt.nodes.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = scale; n1.inputs["Detail"].default_value = detail
    n2 = nt.nodes.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = scale / 9; n2.inputs["Detail"].default_value = 3
    nt.links.new(tc.outputs[coords], n1.inputs["Vector"]); nt.links.new(tc.outputs[coords], n2.inputs["Vector"])
    add = nt.nodes.new("ShaderNodeMath"); add.operation = "ADD"
    nt.links.new(n1.outputs["Fac"], add.inputs[0]); nt.links.new(n2.outputs["Fac"], add.inputs[1])
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = strength; bump.inputs["Distance"].default_value = 0.02
    nt.links.new(add.outputs[0], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return bump


def mat(name, color, rough=0.5, metal=0.0, sheen=0.0, coat=0.0, bump=None, spec=0.5, alpha=1.0, emit=None, emit_k=0.0):
    m, nt, b = node_mat(name)
    b.inputs["Base Color"].default_value = color if len(color) == 4 else (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Sheen Weight"].default_value = sheen
    b.inputs["Coat Weight"].default_value = coat; b.inputs["Coat Roughness"].default_value = 0.08
    b.inputs["Specular IOR Level"].default_value = spec
    if alpha < 1: b.inputs["Alpha"].default_value = alpha
    if emit:
        b.inputs["Emission Color"].default_value = emit; b.inputs["Emission Strength"].default_value = emit_k
    if bump: bump_noise(nt, b, *bump)
    return m


def paper(name, color, strength=0.12):
    return mat(name, color, rough=0.78, sheen=0.25, bump=(180, strength))


def gold(name="gold", color="#D9B36A", rough=0.22, brushed=True):
    m, nt, b = node_mat(name)
    b.inputs["Base Color"].default_value = hexrgb(color); b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = rough
    if brushed:
        b.inputs["Anisotropic"].default_value = 0.5
        bump_noise(nt, b, scale=900, strength=0.03, detail=2)
    return m


def velvet(name, color, sheen_tint=None):
    m, nt, b = node_mat(name)
    b.inputs["Base Color"].default_value = color
    b.inputs["Roughness"].default_value = 0.95
    b.inputs["Sheen Weight"].default_value = 1.0; b.inputs["Sheen Roughness"].default_value = 0.3
    b.inputs["Sheen Tint"].default_value = sheen_tint or mix(color, (1, 1, 1, 1), 0.55)
    b.inputs["Specular IOR Level"].default_value = 0.2
    bump_noise(nt, b, scale=60, strength=0.25)
    return m


def satin(name, color):
    m, nt, b = node_mat(name)
    b.inputs["Base Color"].default_value = color
    b.inputs["Roughness"].default_value = 0.28; b.inputs["Anisotropic"].default_value = 0.8
    b.inputs["Sheen Weight"].default_value = 0.6; b.inputs["Specular IOR Level"].default_value = 0.6
    return m


def disc(name, r, m, loc=(0, 0, 0), rings=40, segs=96):
    """Flat disc with planar UVs (0..1 over its diameter), for embossing with displace_image."""
    verts, faces = [(0, 0, 0)], []
    for j in range(1, rings + 1):
        rr = r * j / rings
        for k in range(segs): verts.append((rr * math.cos(k * math.tau / segs), rr * math.sin(k * math.tau / segs), 0))
    for k in range(segs): faces.append([0, 1 + k, 1 + (k + 1) % segs])
    for j in range(1, rings):
        a0, a1 = 1 + (j - 1) * segs, 1 + j * segs
        for k in range(segs): faces.append([a0 + k, a1 + k, a1 + (k + 1) % segs, a0 + (k + 1) % segs])
    ob = mesh_obj(name, verts, faces, [m], smooth=True, uvs=lambda co: (co.x / (2 * r) + 0.5, co.y / (2 * r) + 0.5))
    ob.location = loc
    return ob


def marble(name, base, vein, scale=1.6, polish=0.12):
    m, nt, b = node_mat(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = 12; n.inputs["Distortion"].default_value = 3.5
    w = nt.nodes.new("ShaderNodeTexWave"); w.inputs["Scale"].default_value = scale * 0.8; w.inputs["Distortion"].default_value = 9; w.inputs["Detail"].default_value = 10
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"]); nt.links.new(n.outputs["Color"], w.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = vein
    ramp.color_ramp.elements[1].position = 0.035; ramp.color_ramp.elements[1].color = base
    mid = ramp.color_ramp.elements.new(0.015); mid.color = mix(vein, base, 0.5)
    nt.links.new(w.outputs["Fac"], ramp.inputs[0]); nt.links.new(ramp.outputs[0], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = polish; b.inputs["Coat Weight"].default_value = 0.3
    return m


def wood(name, light, dark, scale=3.0, rough=0.45, ring_dir="X"):
    m, nt, b = node_mat(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    w = nt.nodes.new("ShaderNodeTexWave"); w.wave_type = "RINGS"; w.inputs["Scale"].default_value = scale; w.inputs["Distortion"].default_value = 6; w.inputs["Detail"].default_value = 6
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1, 14, 1) if ring_dir == "X" else (14, 1, 1)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"]); nt.links.new(mp.outputs[0], w.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = dark; ramp.color_ramp.elements[1].color = light
    nt.links.new(w.outputs["Fac"], ramp.inputs[0]); nt.links.new(ramp.outputs[0], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough; b.inputs["Coat Weight"].default_value = 0.25; b.inputs["Coat Roughness"].default_value = 0.25
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.15
    nt.links.new(w.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs[0], b.inputs["Normal"])
    return m


def linen(name, color):
    m, nt, b = node_mat(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    w1 = nt.nodes.new("ShaderNodeTexWave"); w1.wave_type = "BANDS"; w1.bands_direction = "X"; w1.inputs["Scale"].default_value = 90; w1.inputs["Distortion"].default_value = 2
    w2 = nt.nodes.new("ShaderNodeTexWave"); w2.wave_type = "BANDS"; w2.bands_direction = "Y"; w2.inputs["Scale"].default_value = 90; w2.inputs["Distortion"].default_value = 2
    nt.links.new(tc.outputs["Object"], w1.inputs["Vector"]); nt.links.new(tc.outputs["Object"], w2.inputs["Vector"])
    a2 = nt.nodes.new("ShaderNodeMath"); a2.operation = "MULTIPLY"
    nt.links.new(w1.outputs["Fac"], a2.inputs[0]); nt.links.new(w2.outputs["Fac"], a2.inputs[1])
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.3; bump.inputs["Distance"].default_value = 0.01
    nt.links.new(a2.outputs[0], bump.inputs["Height"]); nt.links.new(bump.outputs[0], b.inputs["Normal"])
    rm = nt.nodes.new("ShaderNodeMix"); rm.data_type = "RGBA"; rm.inputs["A"].default_value = dim(color, 0.9); rm.inputs["B"].default_value = color
    nt.links.new(a2.outputs[0], rm.inputs["Factor"]); nt.links.new(rm.outputs["Result"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.88; b.inputs["Sheen Weight"].default_value = 0.6
    return m


def image_mat(name, path, rough=0.6, emission=0.0, bump_k=0.0, alpha_path=None):
    m, nt, b = node_mat(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = image(path); tex.interpolation = "Cubic"
    nt.links.new(tc.outputs["UV"], tex.inputs["Vector"]); nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    if bump_k:
        bw = nt.nodes.new("ShaderNodeRGBToBW"); nt.links.new(tex.outputs["Color"], bw.inputs[0])
        bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump_k; bp.inputs["Distance"].default_value = 0.01
        nt.links.new(bw.outputs[0], bp.inputs["Height"]); nt.links.new(bp.outputs[0], b.inputs["Normal"])
    if emission:
        nt.links.new(tex.outputs["Color"], b.inputs["Emission Color"]); b.inputs["Emission Strength"].default_value = emission
    return m, nt, b


def card_material(relief_path):
    """The embossed card. Its emission is animated up at the end so the film's last frame
    matches the flat-lit relief the web page shows next."""
    m, nt, b = image_mat("card", relief_path, rough=0.7, bump_k=0.08)
    b.inputs["Sheen Weight"].default_value = 0.2
    tex = [n for n in nt.nodes if n.type == "TEX_IMAGE"][0]
    em = nt.nodes.new("ShaderNodeEmission"); nt.links.new(tex.outputs["Color"], em.inputs["Color"])
    em.inputs["Strength"].default_value = 0.0
    add = nt.nodes.new("ShaderNodeAddShader")
    nt.links.new(b.outputs[0], add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1]); nt.links.new(add.outputs[0], out_node(nt).inputs[0])
    return m, em.inputs["Strength"]


# ------------------------------------------------------------------ geometry
def link(ob):
    scn.collection.objects.link(ob); return ob


def mesh_obj(name, verts, faces, mats=(), smooth=False, uvs=None):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    if uvs:
        ul = me.uv_layers.new(name="UVMap")
        for poly in me.polygons:
            for li in poly.loop_indices:
                ul.data[li].uv = uvs(me.vertices[me.loops[li].vertex_index].co)
    for p in me.polygons: p.use_smooth = smooth
    for m_ in mats: me.materials.append(m_)
    return link(bpy.data.objects.new(name, me))


def box(name, size, loc=(0, 0, 0), mat_=None, bevel=0.0, segs=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.object; ob.name = name; ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        bv = ob.modifiers.new("bev", "BEVEL"); bv.width = bevel; bv.segments = segs; bv.limit_method = "ANGLE"
        for p in ob.data.polygons: p.use_smooth = True
        ob.data.shade_smooth() if hasattr(ob.data, "shade_smooth") else None
    if mat_: ob.data.materials.append(mat_)
    return ob


def plane(name, w, h, loc=(0, 0, 0), rot=(0, 0, 0), mat_=None, thick=0.0, mats=None):
    v = [(-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0)]
    ob = mesh_obj(name, v, [[0, 1, 2, 3]], mats or ([mat_] if mat_ else []),
                  uvs=lambda co: ((co.x + w / 2) / w, (co.y + h / 2) / h))
    ob.location = loc; ob.rotation_euler = rot
    if thick:
        s = ob.modifiers.new("t", "SOLIDIFY"); s.thickness = thick; s.offset = -1
        if mats and len(mats) > 1: s.material_offset = 1
    return ob


def card(relief_path, loc=(0, 0, 0), rot=(0, 0, 0), back_color=(0.9, 0.88, 0.84, 1)):
    m, em = card_material(relief_path)
    mb = paper("card-back", back_color)
    ob = plane("card", CW, CH, loc, rot, mats=[m, mb], thick=0.006)
    return ob, em


def cylinder(name, r, depth, loc=(0, 0, 0), rot=(0, 0, 0), mat_=None, verts=48, smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    ob = bpy.context.object; ob.name = name
    if smooth:
        for p in ob.data.polygons: p.use_smooth = True
    if mat_: ob.data.materials.append(mat_)
    return ob


def sphere(name, r, loc=(0, 0, 0), mat_=None, seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=loc)
    ob = bpy.context.object; ob.name = name
    for p in ob.data.polygons: p.use_smooth = True
    if mat_: ob.data.materials.append(mat_)
    return ob


def torus(name, R, r, loc=(0, 0, 0), rot=(0, 0, 0), mat_=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=48, minor_segments=16)
    ob = bpy.context.object; ob.name = name
    for p in ob.data.polygons: p.use_smooth = True
    if mat_: ob.data.materials.append(mat_)
    return ob


def displace_image(ob, path, strength, uv="UVMap", subdiv=0, direction="NORMAL"):
    if subdiv:
        sd = ob.modifiers.new("sub", "SUBSURF"); sd.subdivision_type = "SIMPLE"; sd.levels = sd.render_levels = subdiv
    tx = bpy.data.textures.new(ob.name + "-d", "IMAGE"); tx.image = image(path, non_color=True); tx.extension = "EXTEND"
    d = ob.modifiers.new("d", "DISPLACE"); d.texture = tx; d.texture_coords = "UV"; d.uv_layer = uv
    d.strength = strength; d.mid_level = 0; d.direction = direction
    return d


def rose_petal(size, curl, color_mat, loc, rot, cup=0.0):
    n = 16; bm = bmesh.new(); cl = bm.loops.layers.color.new("pv"); vs = []
    for i in range(n + 1):
        v = i / n
        w = (math.sin(math.pi * min(1, v * 1.08)) ** 0.7) * (0.55 + 0.45 * v) * 0.5
        row = []
        for j in range(n + 1):
            u = j / n * 2 - 1
            px, py = u * w * size, v * size * 1.1
            pz = curl * size * (u * u * 0.5) + cup * size * v * v
            row.append(bm.verts.new((px, py, pz)))
        vs.append(row)
    for i in range(n):
        for j in range(n):
            f = bm.faces.new((vs[i][j], vs[i][j + 1], vs[i + 1][j + 1], vs[i + 1][j])); f.smooth = True
            for l in f.loops:
                vv = l.vert.co.y / (size * 1.1)
                l[cl] = (min(1, 0.25 + vv * 1.3),) * 3 + (1,)
    me = bpy.data.meshes.new("petal"); bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new("petal", me)); ob.location = loc; ob.rotation_euler = rot
    s = ob.modifiers.new("t", "SOLIDIFY"); s.thickness = size * 0.012
    me.materials.append(color_mat)
    return ob


def petal_mat(name, color):
    """Rose petal: darker at the base (vertex colour), soft translucency, sheen."""
    m, nt, b = node_mat(name)
    a = nt.nodes.new("ShaderNodeVertexColor"); a.layer_name = "pv"
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.inputs["A"].default_value = dim(color, 0.45); mx.inputs["B"].default_value = color
    nt.links.new(a.outputs["Color"], mx.inputs["Factor"]); nt.links.new(mx.outputs["Result"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.45; b.inputs["Sheen Weight"].default_value = 0.7
    tr = nt.nodes.new("ShaderNodeBsdfTranslucent"); nt.links.new(mx.outputs["Result"], tr.inputs["Color"])
    ms = nt.nodes.new("ShaderNodeMixShader"); ms.inputs[0].default_value = 0.25
    nt.links.new(b.outputs[0], ms.inputs[1]); nt.links.new(tr.outputs[0], ms.inputs[2]); nt.links.new(ms.outputs[0], out_node(nt).inputs[0])
    bump_noise(nt, b, scale=30, strength=0.12)
    return m


def rose(loc, scale, pmat, seed=0, open_=1.0):
    """A procedural rose: spiralling petals that open outward ring by ring."""
    rnd = random.Random(seed); parts = []
    root = bpy.data.objects.new("rose", None); link(root); root.location = loc
    golden = math.radians(137.5)
    count = 26
    for i in range(count):
        k = i / (count - 1)
        a = i * golden + rnd.uniform(-0.1, 0.1)
        tilt = math.radians(8 + 80 * (k ** 1.2) * open_)
        size = scale * (0.35 + 0.75 * k)
        r = scale * 0.08 * k
        p = rose_petal(size, curl=0.9 - 0.5 * k, color_mat=pmat, loc=(r * math.cos(a), r * math.sin(a), scale * 0.12 * (1 - k)),
                       rot=(0, 0, 0), cup=0.35 * (1 - k))
        # stand the petal up, lean it out by `tilt`, face it outward
        p.rotation_euler = Euler((math.pi / 2 - tilt, 0, a - math.pi / 2), "ZXY")
        p.rotation_mode = "ZXY"
        p.parent = root
        parts.append(p)
    return root


def leaf(loc, rot, size, lmat):
    p = rose_petal(size, curl=0.25, color_mat=lmat, loc=loc, rot=rot, cup=0.08)
    p.scale = (0.55, 1.0, 1.0)
    return p


# ------------------------------------------------------------------ lights
def aim_empty(loc=(0, 0, 0)):
    e = bpy.data.objects.new("aim", None); link(e); e.location = loc; return e


def area(name, loc, size, power, color=(1, 1, 1), aim=None, shape="SQUARE", size_y=None):
    ld = bpy.data.lights.new(name, "AREA"); ld.size = size; ld.energy = power; ld.color = color[:3]; ld.shape = shape
    if size_y: ld.shape = "RECTANGLE"; ld.size_y = size_y
    lo = link(bpy.data.objects.new(name, ld)); lo.location = loc
    if aim:
        c = lo.constraints.new("TRACK_TO"); c.target = aim; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
    return lo


def point(name, loc, power, color=(1, 0.8, 0.55), radius=0.05):
    ld = bpy.data.lights.new(name, "POINT"); ld.energy = power; ld.color = color[:3]; ld.shadow_soft_size = radius
    lo = link(bpy.data.objects.new(name, ld)); lo.location = loc
    return lo


def spot(name, loc, power, aim, angle=0.6, blend=0.4, color=(1, 0.9, 0.75), radius=0.1):
    ld = bpy.data.lights.new(name, "SPOT"); ld.energy = power; ld.spot_size = angle; ld.spot_blend = blend; ld.color = color[:3]; ld.shadow_soft_size = radius
    lo = link(bpy.data.objects.new(name, ld)); lo.location = loc
    c = lo.constraints.new("TRACK_TO"); c.target = aim; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
    return lo


def gobo(light, aim, mask_path, at=0.72, size=4.2):
    kp = Vector(light.location)
    bpy.ops.mesh.primitive_plane_add(size=1, location=tuple(kp.lerp(Vector(aim.location), at)))
    g = bpy.context.object; g.name = "gobo"; g.scale = (size, size, 1)
    c = g.constraints.new("TRACK_TO"); c.target = aim; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
    m, nt, b = node_mat("gobo"); nt.nodes.remove(b)
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); hold = nt.nodes.new("ShaderNodeBsdfDiffuse"); hold.inputs[0].default_value = (0, 0, 0, 1)
    mx = nt.nodes.new("ShaderNodeMixShader"); gt = nt.nodes.new("ShaderNodeTexImage"); gt.image = image(mask_path, non_color=True)
    nt.links.new(gt.outputs["Color"], mx.inputs[0]); nt.links.new(hold.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out_node(nt).inputs[0])
    g.data.materials.append(m)
    g.visible_camera = False; g.visible_glossy = False; g.visible_diffuse = False
    return g


def window_mask(path, seed=1, leaves=True, bars=30):
    from PIL import Image, ImageDraw, ImageFilter
    rnd = random.Random(seed)
    g = Image.new("L", (1024, 1024), 255); d = ImageDraw.Draw(g)
    for x in (340, 684): d.rectangle((x - bars, 0, x + bars, 1024), fill=0)
    for y in (330, 660): d.rectangle((0, y - bars + 4, 1024, y + bars - 4), fill=0)
    if leaves:
        for _ in range(30):
            cx, cy = rnd.uniform(700, 1024), rnd.uniform(0, 420); rx, ry = rnd.uniform(30, 70), rnd.uniform(12, 24)
            d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=0)
    g.filter(ImageFilter.GaussianBlur(3)).save(path)
    return path


# ------------------------------------------------------------------ camera & animation
def camera(lens=50, fstop=1.2):
    cd = bpy.data.cameras.new("cam"); cd.lens = lens; cd.sensor_fit = "VERTICAL"; cd.sensor_height = 36
    cam = link(bpy.data.objects.new("cam", cd)); scn.camera = cam
    tgt = aim_empty(); tgt.name = "cam-target"
    c = cam.constraints.new("TRACK_TO"); c.target = tgt; c.track_axis = "TRACK_NEGATIVE_Z"; c.up_axis = "UP_Y"
    cd.dof.use_dof = True; cd.dof.focus_object = tgt; cd.dof.aperture_fstop = fstop; cd.dof.aperture_blades = 7
    return cam, tgt


def fill_distance(lens=50, margin=0.985):
    """Distance at which the 9:16 card exactly fills the frame."""
    return (CH * margin) / (36 / lens)


def key(ob, frame, **props):
    for k, v in props.items():
        setattr(ob, k, v); ob.keyframe_insert(data_path=k, frame=frame)


def key_value(sock_or_data, path, frame, value):
    setattr(sock_or_data, path, value); sock_or_data.keyframe_insert(path, frame=frame)


def fcurves(action):
    if hasattr(action, "fcurves") and len(getattr(action, "fcurves", [])):
        return list(action.fcurves)
    out = []
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for bag in strip.channelbags:
                out.extend(bag.fcurves)
    return out


def smooth_all():
    """Bezier, clamped auto handles: no overshoot, soft starts and stops."""
    for ac in bpy.data.actions:
        for fc in fcurves(ac):
            for k in fc.keyframe_points:
                k.interpolation = "BEZIER"; k.handle_left_type = k.handle_right_type = "AUTO_CLAMPED"


def cam_path(cam, tgt, keys):
    for f, loc, at in keys:
        key(cam, f, location=Vector(loc)); key(tgt, f, location=Vector(at))


def end_lift(em_socket, start, end, k=0.22):
    em_socket.default_value = 0.0; em_socket.keyframe_insert("default_value", frame=start)
    em_socket.default_value = k; em_socket.keyframe_insert("default_value", frame=end)


# ------------------------------------------------------------------ misc
def emblem(path, kind="khatam"):
    from PIL import Image, ImageDraw, ImageFilter
    im = Image.new("L", (1024, 1024), 0); d = ImageDraw.Draw(im); c = 512
    d.ellipse((c - 440, c - 440, c + 440, c + 440), fill=120)
    for i in range(32):
        a = i / 32 * math.tau; r = 400
        d.ellipse((c + r * math.cos(a) - 16, c + r * math.sin(a) - 16, c + r * math.cos(a) + 16, c + r * math.sin(a) + 16), fill=230)
    d.ellipse((c - 360, c - 360, c + 360, c + 360), fill=40)
    def star(r1, r2, n=8, rot=0):
        return [(c + (r1 if k % 2 == 0 else r2) * math.cos(rot + k * math.pi / n), c + (r1 if k % 2 == 0 else r2) * math.sin(rot + k * math.pi / n)) for k in range(2 * n)]
    if kind == "khatam":
        d.polygon(star(330, 250), fill=245); d.polygon(star(330, 250, rot=math.pi / 8), fill=245)
        d.polygon(star(230, 170), fill=110); d.polygon(star(230, 170, rot=math.pi / 8), fill=110)
        d.ellipse((c - 120, c - 120, c + 120, c + 120), fill=255); d.ellipse((c - 60, c - 60, c + 60, c + 60), fill=150)
    elif kind == "crescent":
        d.ellipse((c - 260, c - 260, c + 260, c + 260), fill=245); d.ellipse((c - 150, c - 300, c + 330, c + 180), fill=40)
        d.polygon(star(110, 45, n=5, rot=-math.pi / 2), fill=245)
    elif kind == "rose":
        for k in range(5):
            a = k * math.tau / 5
            d.ellipse((c + 150 * math.cos(a) - 150, c + 150 * math.sin(a) - 150, c + 150 * math.cos(a) + 150, c + 150 * math.sin(a) + 150), fill=200)
        d.ellipse((c - 130, c - 130, c + 130, c + 130), fill=245); d.ellipse((c - 55, c - 55, c + 55, c + 55), fill=140)
    im.filter(ImageFilter.GaussianBlur(7)).save(path)
    return path


def render(out, still=0, first=1, last=END, step=1):
    os.makedirs(out, exist_ok=True)
    smooth_all()
    if still:
        scn.frame_set(still)
        scn.render.filepath = os.path.join(out, f"still_{still:04d}.png")
        bpy.ops.render.render(write_still=True)
    else:
        scn.render.filepath = os.path.join(out, "f_####")
        scn.frame_start, scn.frame_end, scn.frame_step = first, last, step
        bpy.ops.render.render(animation=True)


def eucalyptus(loc, rot, length, leaf_m, stem_m, seed=0, leaves=9):
    """A sprig: gently curved stem with round, slightly cupped leaves in pairs."""
    rnd = random.Random(seed)
    root = bpy.data.objects.new("sprig", None); link(root); root.location = loc; root.rotation_euler = rot
    cd = bpy.data.curves.new("stem", "CURVE"); cd.dimensions = "3D"; cd.bevel_depth = 0.008; cd.bevel_resolution = 2
    sp = cd.splines.new("BEZIER"); sp.bezier_points.add(2)
    for i, p in enumerate(sp.bezier_points):
        t = i / 2
        p.co = (0.08 * math.sin(t * 2.2), t * length, 0.02 + 0.03 * math.sin(t * 3))
        p.handle_left_type = p.handle_right_type = "AUTO"
    st = link(bpy.data.objects.new("stem", cd)); cd.materials.append(stem_m); st.parent = root
    for k in range(leaves):
        t = 0.12 + 0.85 * k / max(1, leaves - 1)
        side = 1 if k % 2 == 0 else -1
        sz = 0.07 + 0.05 * (1 - t) + rnd.uniform(-0.01, 0.01)
        l = sphere("leaf", sz, loc=(0.08 * math.sin(t * 2.2) + side * sz * 0.9, t * length, 0.03), mat_=leaf_m, seg=16)
        l.scale = (1, 0.95, 0.08); l.rotation_euler = (rnd.uniform(-0.2, 0.2), side * rnd.uniform(0.1, 0.4), rnd.uniform(-0.5, 0.5)); l.parent = root
    return root


def frosted(name, color=(1, 1, 1, 1), opacity=0.55, print_path=None, print_color=(0.55, 0.62, 0.52, 1)):
    """Vellum / frosted film: translucent diffuse mixed with see-through, optional printed linework."""
    m, nt, b = node_mat(name); nt.nodes.remove(b)
    tl = nt.nodes.new("ShaderNodeBsdfTranslucent"); tl.inputs["Color"].default_value = color
    gl = nt.nodes.new("ShaderNodeBsdfGlossy"); gl.inputs["Roughness"].default_value = 0.35
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    a1 = nt.nodes.new("ShaderNodeMixShader"); a1.inputs[0].default_value = 0.12
    nt.links.new(tl.outputs[0], a1.inputs[1]); nt.links.new(gl.outputs[0], a1.inputs[2])
    mx = nt.nodes.new("ShaderNodeMixShader"); mx.inputs[0].default_value = opacity
    nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(a1.outputs[0], mx.inputs[2])
    last = mx
    if print_path:
        tc = nt.nodes.new("ShaderNodeTexCoord"); tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = image(print_path, non_color=True)
        nt.links.new(tc.outputs["UV"], tx.inputs["Vector"])
        ink = nt.nodes.new("ShaderNodeBsdfDiffuse"); ink.inputs["Color"].default_value = print_color
        m2 = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(tx.outputs["Color"], m2.inputs[0]); nt.links.new(mx.outputs[0], m2.inputs[1]); nt.links.new(ink.outputs[0], m2.inputs[2])
        last = m2
    nt.links.new(last.outputs[0], out_node(nt).inputs[0])
    return m


def botanical_print(path, seed=0, w=700, h=1250):
    """Fine line-drawn leaves and stems (white = ink) for vellum printing."""
    from PIL import Image, ImageDraw, ImageFilter
    rnd = random.Random(seed)
    im = Image.new("L", (w, h), 0); d = ImageDraw.Draw(im)
    for _ in range(9):
        x, y = rnd.uniform(0, w), rnd.uniform(0, h); ang = rnd.uniform(0, math.tau); L = rnd.uniform(160, 340)
        pts = [(x + math.cos(ang + 0.3 * math.sin(t * 3)) * L * t, y + math.sin(ang + 0.3 * math.sin(t * 3)) * L * t) for t in [i / 20 for i in range(21)]]
        d.line(pts, fill=255, width=3)
        for i in range(2, 20, 3):
            px, py = pts[i]
            for sd in (-1, 1):
                a = ang + sd * 0.9
                d.ellipse((px + math.cos(a) * 18 - 16, py + math.sin(a) * 18 - 9, px + math.cos(a) * 18 + 16, py + math.sin(a) * 18 + 9), outline=255, width=2)
    im.filter(ImageFilter.GaussianBlur(0.6)).save(path)
    return path


def twine_loop(name, w, h, r, m, loc=(0, 0, 0)):
    """A flat elliptical loop of cord around something w x h."""
    t = torus(name, 1.0, r, loc=loc, mat_=m); t.scale = (w / 2, h / 2, 1)
    return t


def bow(name, m, loc, size=0.12):
    root = bpy.data.objects.new(name, None); link(root); root.location = loc
    for sx in (-1, 1):
        lp = torus("loop", size * 0.55, size * 0.07, loc=(sx * size * 0.55, 0, 0.02), rot=(0, sx * math.radians(25), 0), mat_=m); lp.scale = (1.0, 0.55, 1); lp.parent = root
        tail = cylinder("tail", size * 0.06, size * 1.6, loc=(sx * size * 0.35, -size * 0.8, 0.005), rot=(math.radians(90), 0, sx * math.radians(25)), mat_=m); tail.parent = root
    knot = sphere("knot", size * 0.13, loc=(0, 0, 0.03), mat_=m, seg=16); knot.parent = root
    return root
