import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { canvas2d, cardCanvas, createStage, easeInOut, easeOut, metalGradient, noise, runLoop, seg, type OpeningCallbacks, type OpeningHandle, type OpeningOptions } from "./common";

const BW = 2.7, BH = 0.85, BD = 1.9, LH = 0.34;

/** Lid top: Art Deco fan for deco themes, a pearl medallion otherwise. */
function lidCanvas(o: OpeningOptions) {
  const w = 1024, h = 720, sc = o.theme.scene;
  const [c, g] = canvas2d(w, h);
  g.fillStyle = sc.surface ?? o.theme.palette.night; g.fillRect(0, 0, w, h);
  noise(g, w, h, 6);
  const m = metalGradient(g, 0, 0, w, h, o.accent);
  g.strokeStyle = m; g.lineWidth = 6; g.strokeRect(40, 40, w - 80, h - 80); g.lineWidth = 2; g.strokeRect(62, 62, w - 124, h - 124);
  const cx = w / 2, cy = h / 2;
  if (o.theme.ornament === "deco") {
    for (let i = 0; i < 13; i++) { const a = Math.PI + (i / 12) * Math.PI; g.beginPath(); g.moveTo(cx, cy + 120); g.lineTo(cx + Math.cos(a) * 300, cy + 120 + Math.sin(a) * 300); g.stroke(); }
    for (const r of [120, 200, 300]) { g.beginPath(); g.arc(cx, cy + 120, r, Math.PI, Math.PI * 2); g.stroke(); }
    for (const [x, y] of [[62, 62], [w - 62, 62], [62, h - 62], [w - 62, h - 62]] as const) { g.beginPath(); for (let k = 1; k <= 3; k++) { g.moveTo(x, y + (y < cy ? k * 26 : -k * 26)); g.lineTo(x + (x < cx ? k * 26 : -k * 26), y); } g.stroke(); }
  } else {
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.beginPath(); g.arc(cx + Math.cos(a) * 190, cy + Math.sin(a) * 190, 9, 0, Math.PI * 2); g.fillStyle = "rgba(255,255,255,.85)"; g.fill(); }
    g.beginPath(); g.arc(cx, cy, 150, 0, Math.PI * 2); g.stroke();
  }
  g.fillStyle = m; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `italic 500 110px "${o.theme.fonts.display}", serif`; g.fillText(o.monogram, cx, cy - (o.theme.ornament === "deco" ? 40 : 0));
  return c;
}

export async function mountBox(canvas: HTMLCanvasElement, o: OpeningOptions, cb: OpeningCallbacks): Promise<OpeningHandle> {
  const sc = o.theme.scene, pal = o.theme.palette;
  const st = createStage(canvas, o, { width: BW * 1.5, height: 3.6 });
  const { scene, camera, tex } = st;
  const pearl = o.theme.ornament === "pearl";

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.38 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -BH / 2 - 0.001; shadow.receiveShadow = true; scene.add(shadow);

  const lacquer = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(sc.surface ?? pal.night), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08,
    ...(pearl ? { iridescence: 0.8, iridescenceIOR: 1.6, sheen: 0.6, sheenColor: new THREE.Color("#ffffff") } : {}),
  });
  const metal = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.accent), metalness: 1, roughness: 0.26 });
  const lining = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(sc.lining ?? pal.paper), roughness: 0.9, sheen: 1, sheenColor: new THREE.Color("#ffffff") });

  const box = new THREE.Group(); scene.add(box);
  const base = new THREE.Mesh(new RoundedBoxGeometry(BW, BH, BD, 4, 0.08), lacquer); base.castShadow = true; base.receiveShadow = true; box.add(base);
  const well = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.24, BD - 0.24), lining); well.rotation.x = -Math.PI / 2; well.position.y = BH / 2 + 0.002; box.add(well);
  for (const y of [BH / 2 - 0.06, -BH / 2 + 0.06]) { const band = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.02, 0.035, BD + 0.02), metal); band.position.y = y; box.add(band); }

  const lidPivot = new THREE.Group(); lidPivot.position.set(0, BH / 2, -BD / 2); box.add(lidPivot);
  const lidTex = tex(lidCanvas(o));
  const lid = new THREE.Mesh(new RoundedBoxGeometry(BW + 0.04, LH, BD + 0.04, 4, 0.08), [lacquer, lacquer, new THREE.MeshPhysicalMaterial({ map: lidTex, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, ...(pearl ? { iridescence: 0.6 } : {}) }), lining, lacquer, lacquer]);
  lid.position.set(0, LH / 2, BD / 2 + 0.02); lid.castShadow = true; lidPivot.add(lid);
  const clasp = pearl
    ? new THREE.Mesh(new THREE.SphereGeometry(0.11, 48, 32), new THREE.MeshPhysicalMaterial({ color: 0xf7f3ef, roughness: 0.15, iridescence: 1, iridescenceIOR: 1.8, clearcoat: 1 }))
    : new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), metal);
  clasp.position.set(0, LH / 2 - 0.05, BD + 0.08); lid.add(clasp);

  const glowLight = new THREE.PointLight(new THREE.Color(sc.light ?? "#fff0c8"), 0, 6, 1.5); glowLight.position.set(0, BH / 2 + 0.5, 0); box.add(glowLight);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.51), new THREE.MeshStandardMaterial({ map: tex(cardCanvas(o)), roughness: 0.6, side: THREE.DoubleSide }));
  card.castShadow = true; box.add(card);

  const reset = () => { lidPivot.rotation.x = 0; glowLight.intensity = 0; card.position.set(0, BH / 2 + 0.01, 0.05); card.rotation.set(-Math.PI / 2, 0, 0.04); box.position.set(0, 0, 0); box.rotation.set(0, 0, 0); st.resetBurst(); fired = false; };
  let fired = false;
  reset();
  const target = new THREE.Vector3();
  const loop = runLoop(st, cb, o, (phase, t, s) => {
    const k = o.reducedMotion ? 0 : 1;
    const camY = 2.4, camZ = st.baseZ * 0.92;
    if (phase === "idle") {
      box.rotation.y = THREE.MathUtils.lerp(box.rotation.y, -0.35 + st.pointer.x * 0.35 * k + Math.sin(t * 0.4) * 0.08 * k, 0.05);
      box.position.y = Math.sin(t * 0.9) * 0.04 * k;
      lidPivot.rotation.x = -Math.max(0, Math.sin(t * 1.1)) * 0.025 * k; // the lid breathes
      camera.position.set(0, camY, camZ);
      target.set(0, 0.1, 0);
    } else {
      box.rotation.y = THREE.MathUtils.lerp(box.rotation.y, 0, 0.06);
      const lo = easeOut(seg(s, 0.2, 1.7));
      lidPivot.rotation.x = -1.95 * lo;
      glowLight.intensity = lo * 14;
      if (s > 0.6 && !fired) { fired = true; st.burst(new THREE.Vector3(0, BH / 2 + 0.3, 0.2)); }
      const rise = easeInOut(seg(s, 1.3, 2.6));
      const fly = easeInOut(seg(s, 2.5, 4.0));
      card.position.y = BH / 2 + 0.01 + rise * 1.0;
      card.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2, -0.32, rise);
      card.rotation.z = 0.04 * (1 - rise);
      // fly towards the camera, facing it
      const camPos = new THREE.Vector3(0, camY - fly * 1.3, camZ - fly * 1.2);
      camera.position.copy(camPos);
      card.position.lerp(new THREE.Vector3(0, camPos.y - 0.15, camPos.z - 2.9), fly);
      card.rotation.x = THREE.MathUtils.lerp(card.rotation.x, -0.05, fly);
      target.set(0, 0.1 + rise * 0.5, 0).lerp(card.position, fly);
    }
    camera.lookAt(target);
  }, 4.1);
  return { open: loop.open, reset: () => { reset(); loop.restart(); }, dispose: () => { loop.stop(); st.dispose(); } };
}
