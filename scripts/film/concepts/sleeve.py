"""
Vellum sleeve: the invitation rests in a frosted vellum sleeve printed with botanicals,
tied with twine and a eucalyptus sprig, among white roses on linen. The twine slips
away, the sleeve glides off, and the camera settles over the card.
"""
import math, os, random
import bpy
from mathutils import Vector
import lib
from lib import *


def build(ctx):
    A = ctx["art"]; out = ctx["out"]; rnd = random.Random(ctx["seed"])
    world("studio", strength=0.18, rotate=2.2, camera_color="#20261F")
    plane("table", 20, 20, loc=(0, 3, 0), mat_=linen("linen", hexrgb(A["linen"])))

    relief = os.path.join(ctx["dir"], "relief.webp")
    crd, em = card(relief, loc=(0, 0, 0.008))
    bp = botanical_print(os.path.join(out, "_botanical.png"), seed=ctx["seed"])
    vm = frosted("vellum", color=(0.97, 0.98, 0.95, 1), opacity=0.62, print_path=bp, print_color=hexrgb(A["ink"]))
    sleeve = bpy.data.objects.new("sleeve", None); link(sleeve)
    top = plane("vellum-top", CW + 0.1, CH + 0.1, loc=(0, 0, 0.022), mat_=vm); top.parent = sleeve
    under = plane("vellum-under", CW + 0.1, CH + 0.1, loc=(0, 0, 0.003), mat_=vm); under.parent = sleeve

    tw = mat("twine", hexrgb(A["twine"]), rough=0.9, bump=(300, 0.4))
    tie = bpy.data.objects.new("tie", None); link(tie)
    band = twine_loop("band", 0.08, CH + 0.14, 0.008, tw, loc=(0.0, 0, 0.012)); band.scale = (0.012, (CH + 0.16) / 2, 1)
    band.rotation_euler = (0, math.radians(90), 0); band.parent = tie
    b2 = twine_loop("band2", CW + 0.16, 0.08, 0.008, tw, loc=(0, 0.25, 0.012)); b2.scale = ((CW + 0.16) / 2, 0.012, 1)
    b2.rotation_euler = (math.radians(90), 0, 0); b2.parent = tie
    bw = bow("bow", tw, (0.0, 0.25, 0.03), size=0.13); bw.parent = tie
    leaf_m = mat("euc-leaf", hexrgb(A["leaf"]), rough=0.55, sheen=0.6)
    stem_m = mat("euc-stem", hexrgb("#6B5B4A"), rough=0.7)
    sp = eucalyptus((0.15, 0.1, 0.03), (0, 0, math.radians(-35)), 0.9, leaf_m, stem_m, seed=1); sp.parent = tie

    # white roses and sprigs around
    pm = petal_mat("rose", hexrgb(A["rose"]))
    for (x, y, s, sd) in [(-1.25, 1.35, 0.32, 1), (1.3, -1.5, 0.36, 2), (-1.3, -1.25, 0.24, 3), (1.2, 1.0, 0.22, 4)]:
        rose((x, y, 0.02), s, pm, seed=sd)
    for (x, y, a, L) in [(-1.6, 0.4, 20, 1.3), (1.5, 0.1, 200, 1.2), (1.0, 1.9, 140, 1.0), (-0.9, -2.0, -30, 1.1), (1.7, -0.6, 160, 0.9)]:
        eucalyptus((x, y, 0.01), (0, 0, math.radians(a)), L, leaf_m, stem_m, seed=int(x * 10 + y))
    for i in range(18):
        a_ = rnd.uniform(0, math.tau); r = rnd.uniform(1.2, 2.4)
        rose_petal(rnd.uniform(0.1, 0.14), rnd.uniform(0.3, 0.8), pm, loc=(r * math.cos(a_), r * math.sin(a_) * 1.2, 0.004), rot=(0, 0, rnd.uniform(0, math.tau)))

    aim = aim_empty((0, 0, 0))
    keyl = area("key", (-5.5, 4.0, 7.5), 0.6, 2400, color=(1, 0.94, 0.84), aim=aim)
    gobo(keyl, aim, window_mask(os.path.join(out, "_gobo.png"), seed=5), at=0.72, size=4.2)
    area("fill", (4.5, -5, 5), 7, 160, color=(0.9, 0.95, 1.0), aim=aim)

    # twine slips off to the right, then the sleeve glides up and away
    key(tie, T(0.0), location=Vector((0, 0, 0)), rotation_euler=(0, 0, 0))
    key(tie, T(1.4), location=Vector((0, 0, 0)))
    key(tie, T(2.6), location=Vector((2.6, 0.5, 0.15)), rotation_euler=(0, 0, math.radians(-25)))
    key(sleeve, T(0.0), location=Vector((0, 0, 0)))
    key(sleeve, T(2.3), location=Vector((0, 0, 0)))
    key(sleeve, T(4.6), location=Vector((0.15, CH + 0.6, 0.06)))

    cam, tgt = camera(lens=50, fstop=1.4)
    H = fill_distance(lens=50)
    cam_path(cam, tgt, [
        (T(0.0), (0.6, -2.4, 3.2), (0, 0.1, 0)),
        (T(2.0), (0.45, -2.0, 3.3), (0, 0.15, 0)),
        (T(4.2), (0.15, -1.0, H + 0.6), (0, 0.05, 0)),
        (T(6.4), (0.0, -0.001, H + 0.008), (0, 0, 0.008)),
        (lib.END, (0.0, -0.001, H + 0.008), (0, 0, 0.008)),
    ])
    for f, v in ((T(5.2), 1.0), (T(6.4), 0.35)):
        keyl.data.energy = 2400 * v; keyl.data.keyframe_insert("energy", frame=f)
    end_lift(em, T(5.2), T(6.4), 0.25)
