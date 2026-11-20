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
HOLD = 12        # frames the last image is held before the page takes over
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
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
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
        d.polygon(star(140, 70), fill=255); d.polygon(star(140, 70, rot=math.pi / 8), fill=255)
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


# ------------------------------------------------------------------ hands
MODELS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")


def skin_mat(tone="#C99A7A"):
    """Skin: subsurface scattering, soft sheen, fine pore bump."""
    m, nt, b = node_mat("skin")
    b.inputs["Base Color"].default_value = hexrgb(tone)
    b.inputs["Subsurface Weight"].default_value = 0.35
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
    b.inputs["Subsurface Scale"].default_value = 0.04
    b.inputs["Roughness"].default_value = 0.48
    b.inputs["Sheen Weight"].default_value = 0.15
    b.inputs["Coat Weight"].default_value = 0.05
    bump_noise(nt, b, scale=900, strength=0.06, detail=3)
    return m


def hand(side="right", scale=6.0, tone="#C99A7A", sleeve=None):
    """Imports a rigged hand (25 joints, MIT, webxr-input-profiles), smooths it and gives it skin.
    Returns (root_empty, armature). Animate the root for the reach and pose_hand() for the fingers."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS, side + ".glb"))
    new = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in new if o.type == "ARMATURE")
    for o in new:
        if o.type == "MESH" and o.name.lower().startswith("icosphere"):
            bpy.data.objects.remove(o, do_unlink=True); continue
        if o.type == "MESH":
            o.data.materials.clear(); o.data.materials.append(skin_mat(tone))
            for p in o.data.polygons: p.use_smooth = True
            sd = o.modifiers.new("sub", "SUBSURF"); sd.levels = sd.render_levels = 2
    root = bpy.data.objects.new(side + "-hand", None); link(root)
    arm.parent = root; arm.scale = (scale, scale, scale)
    if sleeve:
        cuff = cylinder("cuff", 0.05 * scale, 0.2 * scale, mat_=sleeve, verts=32)
        cuff.parent = root; cuff.rotation_euler = (math.radians(90), 0, 0); cuff.location = (0, -0.1 * scale, 0)
    return root, arm


FINGERS = ("index-finger", "middle-finger", "ring-finger", "pinky-finger")


def pose_hand(arm, frame, curl=0.2, thumb=0.2, spread=0.0, pinch=0.0):
    """Curl 0 = open flat, 1 = fist. Keys every finger joint on `frame`."""
    pb = arm.pose.bones
    for i, f in enumerate(FINGERS):
        c = curl + (pinch * (0.4 if f == "index-finger" else 0.15))
        for j, seg in enumerate(("phalanx-proximal", "phalanx-intermediate", "phalanx-distal")):
            b = pb.get(f"{f}-{seg}")
            if not b: continue
            b.rotation_mode = "XYZ"
            b.rotation_euler = (math.radians(-c * (55 + 15 * j)), 0, math.radians((i - 1.5) * spread * 6) if j == 0 else 0)
            b.keyframe_insert("rotation_euler", frame=frame)
    for j, seg in enumerate(("thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal")):
        b = pb.get(seg)
        if not b: continue
        b.rotation_mode = "XYZ"
        b.rotation_euler = (math.radians(-thumb * 30), 0, math.radians(thumb * 20 * (1 if j == 0 else 0.5)))
        b.keyframe_insert("rotation_euler", frame=frame)


def human_arm(side="R", tone="#C69A7C", sleeve_color=None, scale=1.0):
    """Rigged forearm + hand from the MakeHuman CC0 base mesh (models/arm_r.blend); the left
    arm is the right one mirrored. Returns (root, rig). The root sits at the wrist with the
    forearm along -Y and the back of the hand facing +Z; the fingers point +Y."""
    path = os.path.join(MODELS, "arm_r.blend")
    with bpy.data.libraries.load(path) as (src, dst):
        dst.objects = [n for n in src.objects if n in ("arm", "arm-rig")]
    arm_ob = next(o for o in dst.objects if o.type == "MESH")
    rig = next(o for o in dst.objects if o.type == "ARMATURE")
    for o in (arm_ob, rig): link(o)
    arm_ob.data.materials.clear(); arm_ob.data.materials.append(skin_mat(tone))
    for m_ in arm_ob.modifiers:
        if m_.type == "SUBSURF": m_.levels = 1; m_.render_levels = 2
    wrist = rig.data.bones["wrist.R"].head_local.copy()
    elbow = rig.data.bones["lowerarm01.R"].head_local.copy()
    mid = rig.data.bones["finger3-1.R"].head_local.copy()
    root = bpy.data.objects.new(f"arm-{side}", None); link(root)
    piv = bpy.data.objects.new(f"arm-align-{side}", None); link(piv); piv.parent = root
    fwd = (wrist - elbow).normalized()
    # back of the hand: perpendicular to the forearm, toward the knuckles' outside
    side_v = (mid - wrist).cross(fwd)
    up = fwd.cross(side_v).normalized() if side_v.length > 1e-6 else Vector((0, 0, 1))
    from mathutils import Matrix
    up = -up   # fingers curl toward the palm; we want the back of the hand on +Z
    basis = Matrix((fwd.cross(up).normalized(), fwd, up)).transposed()   # columns = x, y, z
    piv.matrix_basis = basis.to_4x4().inverted()
    rig.parent = piv; rig.location = -wrist
    if side == "L": root.scale = (-scale, scale, scale)
    else: root.scale = (scale, scale, scale)
    if sleeve_color:
        sm = satin(f"sleeve-{side}", hexrgb(sleeve_color))
        cuff = cylinder(f"sleeve-{side}", 0.5, 4.0, mat_=sm, verts=48)
        cuff.parent = root; cuff.rotation_euler = (math.radians(90), 0, 0); cuff.location = (0, -2.45, 0)
        cuff.scale = (1, 0.92, 1)
        bv = cuff.modifiers.new("b", "BEVEL"); bv.width = 0.05; bv.segments = 3
    return root, rig


def pose_fingers(rig, frame, curl=0.0, thumb=0.0, spread=0.0, index=None, pinky=None):
    """curl: -0.3 (flat, slightly extended) .. 0 (relaxed rest) .. 1 (fist). Keyed on `frame`."""
    pb = rig.pose.bones
    for f in range(2, 6):
        c = index if (f == 2 and index is not None) else pinky if (f == 5 and pinky is not None) else curl
        for j in range(1, 4):
            b = pb.get(f"finger{f}-{j}.R")
            if not b: continue
            b.rotation_mode = "XYZ"
            b.rotation_euler = (math.radians((f - 3.5) * spread * 6) if j == 1 else 0, 0, math.radians(-c * (38 + 10 * j)))
            b.keyframe_insert("rotation_euler", frame=frame)
    for j in range(1, 4):
        b = pb.get(f"finger1-{j}.R")
        if not b: continue
        b.rotation_mode = "XYZ"
        b.rotation_euler = (0, 0, math.radians(-thumb * 30))
        b.keyframe_insert("rotation_euler", frame=frame)


def follow(hand_root, target, frames, offset=None):
    """Bakes hand_root's world transform so it moves rigidly with `target` over `frames`
    (an iterable of frame numbers). The offset is taken at the first frame unless given."""
    scn.frame_set(frames[0]); bpy.context.view_layer.update()
    if offset is None:
        offset = target.matrix_world.inverted() @ hand_root.matrix_world
    for f in frames:
        scn.frame_set(f); bpy.context.view_layer.update()
        m = target.matrix_world @ offset
        loc, rot, sc = m.decompose()
        hand_root.location = loc; hand_root.rotation_mode = "QUATERNION"; hand_root.rotation_quaternion = rot
        hand_root.keyframe_insert("location", frame=f); hand_root.keyframe_insert("rotation_quaternion", frame=f)
    return offset


def place(ob, frame, loc, rot):
    """Key a world pose (loc, euler degrees) on a hand root, using quaternions like follow()."""
    ob.rotation_mode = "QUATERNION"
    ob.location = Vector(loc); ob.rotation_quaternion = Euler(tuple(math.radians(r) for r in rot), "XYZ").to_quaternion()
    ob.keyframe_insert("location", frame=frame); ob.keyframe_insert("rotation_quaternion", frame=frame)


def handheld(cam, tgt=None, amount=1.0, until=None):
    """A breath of handheld camera: slow, small noise on the camera and its look-at target,
    faded out by frame `until` so the final card frame stays still."""
    rng = random.Random(1234)   # fixed: every render chunk must shake identically
    for ob, k in ((cam, 1.0), (tgt, 0.6)):
        if ob is None or not ob.animation_data or not ob.animation_data.action: continue
        for fc in fcurves(ob.animation_data.action):
            if fc.data_path != "location": continue
            n = fc.modifiers.new("NOISE"); n.scale = 34; n.phase = rng.uniform(0, 100)
            n.strength = 0.035 * amount * k
            if until:
                n.use_restricted_range = True; n.frame_start = 1; n.frame_end = until; n.blend_out = 30


def motion_blur(on=True, shutter=0.4):
    scn.render.use_motion_blur = on; scn.render.motion_blur_shutter = shutter


# ------------------------------------------------------------------ v3: frontal openings into the painting
def colour_exact():
    """Standard view: emission colours (the painting) come out exactly as in the image file."""
    scn.view_settings.view_transform = "Standard"; scn.view_settings.look = "None"
    scn.view_settings.exposure = 0.0; scn.view_settings.gamma = 1.0


def bloom(strength=0.6, threshold=0.85, size=7):
    """Compositor bloom; returns the glare node so its Strength can be keyed."""
    ng = bpy.data.node_groups.new("comp", "CompositorNodeTree")
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    rl = ng.nodes.new("CompositorNodeRLayers")
    gl = ng.nodes.new("CompositorNodeGlare")
    try: gl.inputs["Type"].default_value = "Bloom"
    except Exception: pass
    gl.inputs["Threshold"].default_value = threshold
    gl.inputs["Strength"].default_value = strength
    try: gl.inputs["Size"].default_value = size
    except Exception: pass
    go = ng.nodes.new("NodeGroupOutput")
    ng.links.new(rl.outputs["Image"], gl.inputs["Image"]); ng.links.new(gl.outputs[0], go.inputs[0])
    scn.compositing_node_group = ng
    scn.render.use_compositing = True
    return gl


def painting_world(painted, depth, width, center, k=0.5, res=(300, 520), margin=1.5):
    """The theme painting as a 2.5D relief (displaced by its depth map), emission-only so its
    colours stay exact. Lies in the XZ plane at y=center.y facing -Y. Returns (obj, displace)."""
    w, h = width, width * 16 / 9
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=res[0], y_subdivisions=res[1], size=1)
    ob = bpy.context.object; ob.name = "painting"
    ob.scale = (w * margin, h * margin, 1); bpy.ops.object.transform_apply(scale=True)
    for l in ob.data.uv_layers.active.data:   # the image covers the central 1/margin; edges mirror
        l.uv = ((l.uv[0] - 0.5) * margin + 0.5, (l.uv[1] - 0.5) * margin + 0.5)
    ob.rotation_euler = (math.radians(90), 0, 0); ob.location = center
    m, nt, b = node_mat("painting"); nt.nodes.remove(b)
    tc = nt.nodes.new("ShaderNodeTexCoord"); tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = image(painted); tx.interpolation = "Cubic"
    tx.extension = "MIRROR"
    nt.links.new(tc.outputs["UV"], tx.inputs["Vector"])
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = 1.0
    nt.links.new(tx.outputs["Color"], em.inputs["Color"]); nt.links.new(em.outputs[0], out_node(nt).inputs[0])
    ob.data.materials.append(m)
    tx_d = bpy.data.textures.new("depth", "IMAGE"); tx_d.image = image(depth, non_color=True); tx_d.extension = "REPEAT"; tx_d.use_mirror_x = tx_d.use_mirror_y = True
    d = ob.modifiers.new("depth", "DISPLACE"); d.texture = tx_d; d.texture_coords = "UV"; d.direction = "Z"
    d.mid_level = 0.0; d.strength = k
    ob.visible_shadow = False; ob.visible_diffuse = False; ob.visible_glossy = False
    return ob, d


def whiteout(cam, color=(1, 0.97, 0.92, 1)):
    """A sheet just in front of the lens; key its 'alpha' socket to flash to light and back."""
    m, nt, b = node_mat("whiteout"); nt.nodes.remove(b)
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = color; em.inputs["Strength"].default_value = 1.0
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out_node(nt).inputs[0])
    sheet = plane("whiteout", 4, 4, loc=(0, 0, -0.3), mat_=m)
    sheet.parent = cam
    sheet.visible_shadow = False; sheet.visible_diffuse = False; sheet.visible_glossy = False
    mx.inputs[0].default_value = 0.0
    return mx.inputs[0]


def wax_seal(r, color, metal, emblem_path, name="seal"):
    """Wax seal split in two halves along a wavy crack; returns (left, right). Lies in XY, faces +Z."""
    import numpy as np
    from PIL import Image as _I
    E = np.asarray(_I.open(emblem_path), dtype=np.float32) / 255.0
    def emb(x, y, rin):
        u = min(max((x / rin * 0.5 + 0.5) * (E.shape[1] - 1), 0), E.shape[1] - 1.001)
        v = min(max((0.5 - y / rin * 0.5) * (E.shape[0] - 1), 0), E.shape[0] - 1.001)
        i, j = int(v), int(u); fv, fu = v - i, u - j
        a = E[i, j] * (1 - fu) + E[i, j + 1] * fu; b = E[i + 1, j] * (1 - fu) + E[i + 1, j + 1] * fu
        return float(a * (1 - fv) + b * fv)
    rim = lambda a: r * (1 + 0.05 * math.sin(5 * a + 1.3) + 0.03 * math.sin(11 * a + 0.4) + 0.018 * math.sin(19 * a + 2.0))
    crack = lambda y: 0.064 * r * math.sin(y / r * 7.8 + 0.5) + 0.032 * r * math.sin(y / r * 19)
    def height(t, x, y):
        lip = 0.16 * r
        if t >= 0.80: q = (t - 0.80) / 0.20; return lip * math.sqrt(max(0.0, 1 - q * q)) ** 0.8
        if t >= 0.70: q = (t - 0.70) / 0.10; return 0.096 * r + (lip - 0.096 * r) * (0.5 - 0.5 * math.cos(q * math.pi))
        return 0.072 * r + 0.068 * r * emb(x, y, 0.7 * r)
    wm, nt, b = node_mat(name + "-wax")
    b.inputs["Roughness"].default_value = 0.4; b.inputs["Coat Weight"].default_value = 0.3; b.inputs["Coat Roughness"].default_value = 0.2
    at = nt.nodes.new("ShaderNodeVertexColor"); at.layer_name = "emb"
    rr = nt.nodes.new("ShaderNodeMapRange"); rr.inputs["From Min"].default_value = 0.72; rr.inputs["From Max"].default_value = 0.9
    nt.links.new(at.outputs["Color"], rr.inputs["Value"])
    mc = nt.nodes.new("ShaderNodeMix"); mc.data_type = "RGBA"; mc.inputs["A"].default_value = color; mc.inputs["B"].default_value = metal
    nt.links.new(rr.outputs[0], mc.inputs["Factor"]); nt.links.new(mc.outputs["Result"], b.inputs["Base Color"])
    mm = nt.nodes.new("ShaderNodeMath"); mm.operation = "MULTIPLY"; mm.inputs[1].default_value = 0.85
    nt.links.new(rr.outputs[0], mm.inputs[0]); nt.links.new(mm.outputs[0], b.inputs["Metallic"])
    halves = []
    for side in (-1, 1):
        rings, segs = 60, 130
        a0 = -math.pi / 2 if side > 0 else math.pi / 2
        bm = bmesh.new(); col = bm.loops.layers.color.new("emb"); grid = []
        for j in range(rings + 1):
            t = 0.003 + (1 - 0.003) * j / rings; row = []
            for k in range(segs + 1):
                a = a0 + math.pi * k / segs; rr_ = t * rim(a)
                x, y = rr_ * math.cos(a), rr_ * math.sin(a); z = height(t, x, y)
                x += crack(y) * max(0.0, 1 - abs(x) / r)
                row.append(bm.verts.new((x, y, z)))
            grid.append(row)
        top = []
        for j in range(rings):
            for k in range(segs):
                top.append(bm.faces.new((grid[j][k], grid[j][k + 1], grid[j + 1][k + 1], grid[j + 1][k])))
        ray = [grid[j][0] for j in range(rings, -1, -1)] + [grid[j][segs] for j in range(rings + 1)]
        base = [bm.verts.new((v.co.x, v.co.y, 0.0)) for v in ray]
        wall = []
        for i in range(len(ray) - 1):
            try: wall.append(bm.faces.new((ray[i], ray[i + 1], base[i + 1], base[i])))
            except ValueError: pass
        bmesh.ops.recalc_face_normals(bm, faces=top + wall)
        for f in top:
            f.smooth = True
            for l in f.loops:
                t = math.hypot(l.vert.co.x, l.vert.co.y) / r
                e = emb(l.vert.co.x, l.vert.co.y, 0.7 * r) if t < 0.7 else 0.0
                l[col] = (e, e, e, 1)
        me = bpy.data.meshes.new(f"{name}{side}"); bm.to_mesh(me); bm.free()
        ob = link(bpy.data.objects.new(f"{name}{side}", me)); me.materials.append(wm)
        halves.append(ob)
    return halves


def damask(path, seed=0, size=1024, kind="floral"):
    """Tileable classic damask (white = raised): an ogee lattice of fine double lines with a
    mirrored floral spray in every cell, for blind-embossing paper."""
    from PIL import Image as _I, ImageDraw as _D, ImageFilter as _F
    S = size; im = _I.new("L", (S, S), 0); d = _D.Draw(im)
    def leaf(cx, cy, ang, L, W_, fill):
        pts = []
        for i in range(21):
            t = i / 20; r = math.sin(math.pi * t) ** 0.9 * W_
            pts.append((cx + t * L * math.cos(ang) - r * math.sin(ang), cy + t * L * math.sin(ang) + r * math.cos(ang)))
        for i in range(20, -1, -1):
            t = i / 20; r = -math.sin(math.pi * t) ** 0.9 * W_ * 0.6
            pts.append((cx + t * L * math.cos(ang) - r * math.sin(ang), cy + t * L * math.sin(ang) + r * math.cos(ang)))
        d.polygon(pts, fill=fill)
    def fleur(cx, cy, sc):
        """Mirrored lotus: a tall central petal, two pairs of curling side petals, a pearl base."""
        leaf(cx, cy, -math.pi / 2, 120 * sc, 26 * sc, 250)
        for sgn in (-1, 1):
            leaf(cx, cy - 6 * sc, -math.pi / 2 + sgn * 0.62, 100 * sc, 22 * sc, 235)
            leaf(cx, cy + 4 * sc, -math.pi / 2 + sgn * 1.25, 78 * sc, 18 * sc, 215)
            pts = [(cx + sgn * sc * (18 + 60 * t), cy + sc * (10 + 40 * math.sin(t * math.pi) * 0.6 + 30 * t)) for t in [i / 20 for i in range(21)]]
            d.line(pts, fill=225, width=max(2, int(4 * sc)))
            ex, ey = pts[-1]; d.ellipse((ex - 6 * sc, ey - 6 * sc, ex + 6 * sc, ey + 6 * sc), fill=240)
        d.ellipse((cx - 13 * sc, cy + 6 * sc, cx + 13 * sc, cy + 30 * sc), fill=255)
    if kind == "geo":   # Art Deco geometry: nested diamonds, rays and stepped chevrons
        for gx in range(-1, 4):
            for gy in range(-1, 4):
                cx, cy = gx * S / 3, gy * S / 3
                for r, w_ in ((150, 4), (120, 2), (60, 5)):
                    d.polygon([(cx, cy - r), (cx + r * 0.7, cy), (cx, cy + r), (cx - r * 0.7, cy)], outline=255, width=w_)
                for k in range(12):
                    a = k * math.pi / 6
                    d.line([(cx + 64 * math.cos(a), cy + 64 * math.sin(a)), (cx + 100 * math.cos(a), cy + 100 * math.sin(a))], fill=220, width=2)
                d.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill=255)
        im.filter(_F.GaussianBlur(1.2)).save(path); return path
    if kind == "pearl":  # scallops edged in seed pearls
        for gy in range(-1, 9):
            for gx in range(-1, 6):
                cx = gx * S / 4 + (S / 8 if gy % 2 else 0); cy = gy * S / 7
                d.arc((cx - S / 8, cy - S / 8, cx + S / 8, cy + S / 8), 0, 180, fill=230, width=3)
                for k in range(9):
                    a = k * math.pi / 8
                    px, py = cx + (S / 8 - 14) * math.cos(a), cy + (S / 8 - 14) * math.sin(a)
                    d.ellipse((px - 7, py - 7, px + 7, py + 7), fill=255)
                d.ellipse((cx - 12, cy + S / 8 - 40, cx + 12, cy + S / 8 - 16), fill=245)
        im.filter(_F.GaussianBlur(1.4)).save(path); return path
    cell_w, cell_h = S / 2, S / 2
    for gx in range(-1, 3):
        for gy in range(-1, 3):
            cx = gx * cell_w + (cell_w / 2 if gy % 2 else 0); cy = gy * cell_h
            # ogee: two mirrored S-curves around the cell
            for sgn in (-1, 1):
                for off, w_ in ((0, 4), (12, 2)):
                    pts = [(cx + sgn * (cell_w / 2 - off) * math.sin(math.pi * t) ** 1.4, cy + cell_h * (t - 0.5)) for t in [i / 40 for i in range(41)]]
                    d.line(pts, fill=255, width=w_)
            fleur(cx, cy + cell_h * 0.12, 0.95)
            for k in range(6):
                a = k * math.tau / 6
                d.ellipse((cx + 26 * math.cos(a) - 9, cy - cell_h * 0.5 + 26 * math.sin(a) - 9, cx + 26 * math.cos(a) + 9, cy - cell_h * 0.5 + 26 * math.sin(a) + 9), fill=225)
    im = im.filter(_F.GaussianBlur(1.6))
    im.save(path)
    return path


def into_painting(ctx, cam, tgt, t_peak, light="#FFF3E6", glare=None, pw_w=12.0):
    """Shared ending: at t_peak the screen blooms to light, everything else is hidden, and the
    camera pulls back through the painting (2.5D from its depth map) to land on the exact
    flat image at T(t_peak + 3.5). Returns the end frame."""
    world_c = Vector((0, 40.0, 0))
    pw, pdisp = painting_world(os.path.join(ctx["dir"], "reveal.webp"), os.path.join(ctx["dir"], "depth.webp"), pw_w, world_c, k=0.0)
    Dp = (pw_w * 16 / 9) / (36 / cam.data.lens)
    wsock = whiteout(cam, color=mix(hexrgb(light), (1, 1, 1, 1), 0.6))
    a, b = T(t_peak - 0.65), T(t_peak)
    for f, v in ((a, 0.0), (b, 1.0), (b + 3, 1.0), (T(t_peak + 0.75), 0.0)):
        wsock.default_value = v; wsock.keyframe_insert("default_value", frame=f)
    keep = {"painting", "whiteout"}
    for o in bpy.data.objects:
        if o.hide_render: continue
        if o.type in ("MESH", "CURVE") and o.name not in keep:
            o.hide_render = False; o.keyframe_insert("hide_render", frame=b)
            o.hide_render = True; o.keyframe_insert("hide_render", frame=b + 1)
        if o.type == "LIGHT":
            o.hide_render = False; o.keyframe_insert("hide_render", frame=b)
            o.hide_render = True; o.keyframe_insert("hide_render", frame=b + 1)
    pw.hide_render = True; pw.keyframe_insert("hide_render", frame=b)
    pw.hide_render = False; pw.keyframe_insert("hide_render", frame=b + 1)
    end = T(t_peak + 2.6)
    for f, k_ in ((b + 1, 2.4), (T(t_peak + 1.6), 1.4), (end, 0.0)):
        pdisp.strength = k_; pdisp.keyframe_insert("strength", frame=f)
    for f, loc, at in ((b + 1, (1.1, world_c.y - Dp * 0.42, -2.2), (1.0, world_c.y, -2.6)),
                       (T(t_peak + 1.5), (0.3, world_c.y - Dp * 0.8, -0.5), (0.25, world_c.y, -0.6)),
                       (end, (0.0, world_c.y - Dp, 0.0), (0, world_c.y, 0)),
                       (end + HOLD, (0.0, world_c.y - Dp, 0.0), (0, world_c.y, 0))):
        key(cam, f, location=Vector(loc)); key(tgt, f, location=Vector(at))
    cam.data.dof.keyframe_insert("aperture_fstop", frame=b)
    keep_f = cam.data.dof.aperture_fstop
    cam.data.dof.aperture_fstop = 64; cam.data.dof.keyframe_insert("aperture_fstop", frame=b + 1)
    cam.data.dof.aperture_fstop = keep_f
    if glare is not None:
        for f, v in ((a, glare.inputs["Strength"].default_value), (b, 1.6), (T(t_peak + 0.7), 0.25), (end, 0.0)):
            glare.inputs["Strength"].default_value = v; glare.inputs["Strength"].keyframe_insert("default_value", frame=f)
    lib_end = end + HOLD
    globals()["END"] = lib_end; scn.frame_end = lib_end
    return lib_end


def through_painting(ctx, cam, tgt, t_go, t_land, y_center=11.0, pw_w=4.0, k=1.2, light="#FFE7C7", spill=200, z_center=None):
    """The painting stands beyond an opening (doors, curtains...). From t_go the camera travels
    through and lands at T(t_land) exactly framing the flat image. Returns the end frame."""
    c = Vector((0, y_center, pw_w * 16 / 9 / 2 if z_center is None else z_center))
    pw, pdisp = painting_world(os.path.join(ctx["dir"], "reveal.webp"), os.path.join(ctx["dir"], "depth.webp"), pw_w, c, k=k)
    Dp = (pw_w * 16 / 9) / (36 / cam.data.lens)
    end = T(t_land)
    for f, kk in ((T(t_go), k), (T((t_go + t_land) / 2), k * 0.7), (end, 0.0)):
        pdisp.strength = kk; pdisp.keyframe_insert("strength", frame=f)
    key(cam, end, location=Vector((0, c.y - Dp, c.z))); key(tgt, end, location=c.copy())
    key(cam, end + HOLD, location=Vector((0, c.y - Dp, c.z))); key(tgt, end + HOLD, location=c.copy())
    sp = area("spill", (0, 3, c.z), 3.0, spill, color=hexrgb(light)[:3], aim=aim_empty((0, -4, 1.5)))
    cam.data.dof.keyframe_insert("aperture_fstop", frame=T(t_go))
    f0 = cam.data.dof.aperture_fstop
    cam.data.dof.aperture_fstop = 64; cam.data.dof.keyframe_insert("aperture_fstop", frame=end - 6)
    cam.data.dof.aperture_fstop = f0
    scn.frame_end = end + HOLD
    return end + HOLD, c, Dp


def lattice_mat(name, color, mask_path, scale=(0.45, 0.9)):
    """Pierced screen: solid where the mask is black, open where white."""
    m, nt, b = node_mat(name)
    b.inputs["Base Color"].default_value = color; b.inputs["Roughness"].default_value = 0.5
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (scale[0], scale[1], 1)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); comb = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0]); nt.links.new(sep.outputs["X"], comb.inputs["X"]); nt.links.new(sep.outputs["Z"], comb.inputs["Y"])
    nt.links.new(comb.outputs[0], mp.inputs["Vector"])
    tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = image(mask_path, non_color=True); nt.links.new(mp.outputs[0], tx.inputs["Vector"])
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); ms = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(tx.outputs["Color"], ms.inputs[0]); nt.links.new(b.outputs[0], ms.inputs[1]); nt.links.new(tr.outputs[0], ms.inputs[2])
    nt.links.new(ms.outputs[0], out_node(nt).inputs[0])
    return m


def jali_mask(path):
    """Eight-point-star jali (white = open)."""
    from PIL import Image as _I, ImageDraw as _D, ImageFilter as _F
    im = _I.new("L", (512, 512), 0); d = _D.Draw(im); s = 64
    for gx in range(0, 512 + s, s):
        for gy in range(0, 512 + s, s):
            for rot in (0, math.pi / 4):
                d.polygon([(gx + 24 * math.cos(rot + k * math.pi / 2), gy + 24 * math.sin(rot + k * math.pi / 2)) for k in range(4)], fill=255)
            d.ellipse((gx + s / 2 - 7, gy + s / 2 - 7, gx + s / 2 + 7, gy + s / 2 + 7), fill=255)
    im.filter(_F.GaussianBlur(0.8)).save(path)
    return path
