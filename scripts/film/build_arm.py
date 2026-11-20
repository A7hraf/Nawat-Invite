"""
Builds a rigged right forearm + hand from the MakeHuman 1.1 base mesh, skeleton and
weights (all CC0, see models/LICENSE-makehuman-CC0.txt) and saves models/arm_r.blend.

  python3 scripts/film/build_arm.py /path/to/makehuman/{base.obj,default.mhskel,default_weights.mhw}

The base mesh is in decimetres, Y up. Bones from the elbow down are kept; the mesh is cut
just below the elbow and the cut is hidden later by a sleeve cuff.
"""
import json, os, sys
import bpy, bmesh
from mathutils import Vector

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "arm_r.blend")
skel = json.load(open(os.path.join(SRC, "default.mhskel")))
wts = json.load(open(os.path.join(SRC, "default_weights.mhw")))["weights"]

# --- read the obj: all vertices (joint indices refer to these), faces of the "body" group
verts, faces, grp = [], [], None
for line in open(os.path.join(SRC, "base.obj")):
    if line.startswith("v "):
        x, y, z = map(float, line.split()[1:4]); verts.append(Vector((x, -z, y)))   # Y-up -> Z-up
    elif line.startswith("g "):
        grp = line.split()[1]
    elif line.startswith("f ") and grp == "body":
        faces.append([int(t.split("/")[0]) - 1 for t in line.split()[1:]])

def joint(name):
    ids = skel["joints"][name]
    return sum((verts[i] for i in ids), Vector()) / len(ids)

KEEP = [b for b in skel["bones"] if b.endswith(".R") and (b.startswith(("lowerarm", "wrist", "metacarpal", "finger")))]
# the forearm's weight decides which vertices belong to the arm
arm_w = {}
for b in KEEP:
    for vi, w in wts.get(b, []):
        arm_w[vi] = arm_w.get(vi, 0) + w
keep_v = {vi for vi, w in arm_w.items() if w > 0.35}
fs = [f for f in faces if all(v in keep_v for v in f)]
used = sorted({v for f in fs for v in f})
remap = {v: i for i, v in enumerate(used)}

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
me = bpy.data.meshes.new("arm")
me.from_pydata([verts[v] for v in used], [], [[remap[v] for v in f] for f in fs]); me.update()
ob = bpy.data.objects.new("arm", me); scn.collection.objects.link(ob)
for p in me.polygons: p.use_smooth = True

# --- armature from joint positions, rolls from MakeHuman's rotation planes
ad = bpy.data.armatures.new("arm-rig"); rig = bpy.data.objects.new("arm-rig", ad); scn.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode="EDIT")
eb = {}
for b in KEEP:
    d = skel["bones"][b]
    e = ad.edit_bones.new(b); e.head = joint(d["head"]); e.tail = joint(d["tail"])
    plane = skel["planes"].get(d["rotation_plane"]) if d.get("rotation_plane") else None
    if plane:
        p1, p2, p3 = (joint(j) for j in plane)
        n = (p2 - p1).cross(p3 - p2)
        if n.length > 1e-6: e.align_roll(n.normalized())
    eb[b] = e
for b, e in eb.items():
    par = skel["bones"][b]["parent"]
    if par in eb: e.parent = eb[par]; e.use_connect = False
bpy.ops.object.mode_set(mode="OBJECT")

for b in KEEP:
    vg = ob.vertex_groups.new(name=b)
    for vi, w in wts.get(b, []):
        if vi in remap: vg.add([remap[vi]], w, "REPLACE")
ob.parent = rig
mod = ob.modifiers.new("rig", "ARMATURE"); mod.object = rig
sd = ob.modifiers.new("sub", "SUBSURF"); sd.levels = sd.render_levels = 1
print("arm verts", len(used), "faces", len(fs), "bones", len(KEEP))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
