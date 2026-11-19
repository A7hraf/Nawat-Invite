"""
Pearl shell: an iridescent scallop shell rests on draped silk among strands of pearls.
It opens on a glowing pearl, and the invitation rises out of the shell to meet the guest.
"""
import math, os, random
import bpy, bmesh
from mathutils import Vector
import lib
from lib import *

R = 1.35
CARD_END = Vector((0, -0.4, 2.2))


def nacre(name, color, film=420):
    m, nt, b = node_mat(name)
    b.inputs["Base Color"].default_value = color; b.inputs["Roughness"].default_value = 0.22
    b.inputs["Coat Weight"].default_value = 0.6; b.inputs["Coat Roughness"].default_value = 0.05
    b.inputs["Sheen Weight"].default_value = 0.4
    if "Thin Film Thickness" in b.inputs:
        b.inputs["Thin Film Thickness"].default_value = film; b.inputs["Thin Film IOR"].default_value = 1.45
    return m


def valve(name, mats, dome, ribs=17, flip=False):
    """One half of a scallop: a ribbed fan with a raised dome, hinge at the origin."""
    rings, segs = 40, 140
    a0, a1 = math.radians(-78), math.radians(78)
    bm = bmesh.new(); grid = []
    for j in range(rings + 1):
        t = j / rings
        row = []
        for k in range(segs + 1):
            u = k / segs; a = a0 + (a1 - a0) * u
            r = R * (0.08 + 0.92 * t)
            rib = 0.085 * t * (0.5 + 0.5 * math.cos((u * ribs) * math.tau)) ** 1.5
            edge = 1 - (2 * u - 1) ** 6
            z = dome * math.sin(math.pi * min(1, t * 1.05)) * (0.25 + 0.75 * edge) + rib
            x, y = r * math.sin(a), r * math.cos(a)
            row.append(bm.verts.new((x, y, -z if flip else z)))
        grid.append(row)
    for j in range(rings):
        for k in range(segs):
            f = bm.faces.new((grid[j][k], grid[j][k + 1], grid[j + 1][k + 1], grid[j + 1][k])); f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new(name, me))
    for m_ in mats: me.materials.append(m_)
    s = ob.modifiers.new("t", "SOLIDIFY"); s.thickness = 0.03; s.material_offset = 1
    return ob


def strand(points, r, pm):
    for (x, y, z) in points:
        sphere("pearl", r, loc=(x, y, z + r), mat_=pm, seg=16)


def build(ctx):
    A = ctx["art"]; out = ctx["out"]; rnd = random.Random(ctx["seed"])
    world("studio", strength=0.12, rotate=1.0, camera_color="#4E3D3A")
    # draped silk: a sheet with soft folds
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=300, y_subdivisions=300, size=1, location=(0, 1.2, 0))
    silk = bpy.context.object; silk.scale = (30, 30, 1)
    for v in silk.data.vertices:
        x, y = v.co.x * 30, v.co.y * 30
        v.co.z = (0.12 * math.sin(x * 1.3 + y * 0.4) + 0.07 * math.sin(x * 2.9 - y * 1.7 + 1) + 0.05 * math.sin(y * 3.3)) / 1.0
    for pg in silk.data.polygons: pg.use_smooth = True
    silk.data.materials.append(satin("silk", hexrgb(A["silk"])))
    silk.location.z = -0.12; silk.location.y = 8

    shell_out = nacre("shell-out", hexrgb(A["shell"]), film=300)
    shell_in = nacre("shell-in", mix(hexrgb(A["shell"]), (1, 1, 1, 1), 0.4), film=520)
    bottom = valve("bottom", [shell_in, shell_out], dome=0.42, flip=True, ribs=15)
    bottom.location = (0, 1.0, 0.44); bottom.rotation_euler = (0, 0, math.pi)
    hinge = bpy.data.objects.new("hinge", None); link(hinge); hinge.location = (0, 1.0, 0.46)
    top = valve("top", [shell_out, shell_in], dome=0.55, ribs=15); top.parent = hinge

    pearl_m = nacre("pearl", hexrgb(A["pearl"]), film=480)
    pm, pnt, pb = node_mat("pearl-glow")
    pb.inputs["Base Color"].default_value = hexrgb(A["pearl"]); pb.inputs["Roughness"].default_value = 0.15
    pb.inputs["Emission Color"].default_value = hexrgb("#FFF3E6"); pb.inputs["Coat Weight"].default_value = 0.8
    if "Thin Film Thickness" in pb.inputs: pb.inputs["Thin Film Thickness"].default_value = 480
    glow_sock = pb.inputs["Emission Strength"]; glow_sock.default_value = 0.0
    big = sphere("the-pearl", 0.16, loc=(0, -0.05, 0.56), mat_=pm, seg=48)
    plight = point("pearl-light", (0, -0.2, 0.75), 0, color=(1, 0.93, 0.85), radius=0.2)

    # strands of pearls trailing across the silk
    for s_ in range(4):
        x0, y0 = rnd.uniform(-2.2, 2.2), rnd.uniform(-1.6, 1.6)
        if abs(x0) < 1.5 and -2 < y0 < 0.8: x0 = math.copysign(1.8 + abs(x0) * 0.3, x0 if x0 else 1)
        ang = rnd.uniform(0, math.tau); pts = []
        for i in range(34):
            t = i * 0.07
            pts.append((x0 + t * math.cos(ang + 0.6 * math.sin(t * 1.4)), y0 + t * math.sin(ang + 0.6 * math.sin(t * 1.4)), 0.02))
        strand(pts, 0.032, pearl_m)

    # card asleep inside the shell
    relief = os.path.join(ctx["dir"], "relief.webp")
    crd, em = card(relief)
    rest = Vector((0, 0.3, 0.5))
    sc = 0.42
    key(crd, T(0.0), location=rest.copy(), rotation_euler=(0, 0, 0), scale=Vector((sc, sc, 1)))
    key(crd, T(3.2), location=rest.copy(), rotation_euler=(0, 0, 0), scale=Vector((sc, sc, 1)))
    key(crd, T(4.6), location=Vector((0, -0.1, 1.3)), rotation_euler=(math.radians(50), 0, math.radians(-12)), scale=Vector((0.75, 0.75, 1)))
    key(crd, T(6.2), location=CARD_END.copy(), rotation_euler=(math.radians(90), 0, 0), scale=Vector((1, 1, 1)))
    key(crd, lib.END, location=CARD_END.copy(), rotation_euler=(math.radians(90), 0, 0), scale=Vector((1, 1, 1)))
    # the pearl rolls aside as the card lifts
    key(big, T(3.0), location=Vector((0, -0.05, 0.56)))
    key(big, T(4.2), location=Vector((0.5, -0.2, 0.5)))

    key(hinge, T(0.0), rotation_euler=(0, 0, math.pi))
    key(hinge, T(1.2), rotation_euler=(0, 0, math.pi))
    key(hinge, T(1.45), rotation_euler=(math.radians(-6), 0, math.pi))
    key(hinge, T(3.2), rotation_euler=(math.radians(-95), 0, math.pi))
    for f, k in ((T(1.4), 0.0), (T(2.8), 2.5), (T(4.4), 0.8)):
        glow_sock.default_value = k; glow_sock.keyframe_insert("default_value", frame=f)
        plight.data.energy = k * 25; plight.data.keyframe_insert("energy", frame=f)

    aim = aim_empty((0, -0.3, 0.3))
    keyl = area("key", (-4.0, 2.5, 5.5), 0.7, 1100, color=(1, 0.94, 0.88), aim=aim)
    gobo(keyl, aim, window_mask(os.path.join(out, "_gobo.png"), seed=11), at=0.72, size=4.0)
    area("fill", (4, -4.5, 3.5), 6, 70, color=(0.95, 0.92, 1.0), aim=aim)
    area("rim", (1.5, 4.5, 2.5), 2.5, 600, color=(1, 0.88, 0.8), aim=aim)
    area("card-key", (-1.0, CARD_END.y - 2.6, 3.2), 1.4, 70, color=(1, 0.92, 0.84), aim=aim_empty(tuple(CARD_END)))

    cam, tgt = camera(lens=45, fstop=1.6)
    D = fill_distance(lens=45)
    cam_path(cam, tgt, [
        (T(0.0), (1.2, -3.4, 1.9), (0, 0.2, 0.5)),
        (T(1.6), (0.9, -3.1, 2.0), (0, 0.2, 0.55)),
        (T(3.2), (0.4, -2.8, 2.4), (0, 0.1, 0.8)),
        (T(5.0), (0.1, CARD_END.y - D - 0.8, CARD_END.z + 0.1), (0, CARD_END.y, CARD_END.z - 0.15)),
        (T(6.6), (0.0, CARD_END.y - D, CARD_END.z), tuple(CARD_END)),
        (lib.END, (0.0, CARD_END.y - D, CARD_END.z), tuple(CARD_END)),
    ])
    end_lift(em, T(5.6), T(6.6), 0.28)
