import * as THREE from "three";
import { canvas2d, cardCanvas, createStage, easeInOut, metalGradient, noise, planarUV, runLoop, seg, type OpeningCallbacks, type OpeningHandle, type OpeningOptions } from "./common";

const DW = 2.4;          // doorway width
const HS = 2.3;          // straight height before the arch
const HT = HS + DW / 2;  // total height

/** Carved door leaf texture: panels, studs and an arched fan, in the theme colours. */
function doorCanvas(surface: string, detail: string, mirrored: boolean) {
  const w = 512, h = 1024;
  const [c, g] = canvas2d(w, h);
  const base = new THREE.Color(surface);
  g.fillStyle = base.getStyle(); g.fillRect(0, 0, w, h);
  for (let i = 0; i < 140; i++) { g.strokeStyle = `rgba(0,0,0,${Math.random() * 0.06})`; g.lineWidth = 1 + Math.random() * 2; const x = Math.random() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, h * 0.3, x - 8, h * 0.6, x + 4, h); g.stroke(); }
  const dark = base.clone().multiplyScalar(0.72).getStyle(), light = base.clone().lerp(new THREE.Color("#ffffff"), 0.2).getStyle();
  const panel = (x: number, y: number, pw: number, ph: number) => {
    g.fillStyle = dark; g.fillRect(x, y, pw, ph);
    g.fillStyle = light; g.fillRect(x + 6, y + 6, pw - 12, ph - 12);
    g.fillStyle = base.getStyle(); g.fillRect(x + 12, y + 12, pw - 24, ph - 24);
    g.strokeStyle = metalGradient(g, x, y, x + pw, y + ph, detail); g.lineWidth = 3; g.strokeRect(x + 18, y + 18, pw - 36, ph - 36);
    // eight-point star in the centre
    const cx = x + pw / 2, cy = y + ph / 2, r = Math.min(pw, ph) * 0.22;
    g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r * 0.45 : r; g[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.stroke();
  };
  const top = h * (DW / 2 / HT) + 30;
  panel(56, top + 20, w - 112, 300); panel(56, top + 350, w - 112, 300);
  g.fillStyle = metalGradient(g, 0, 0, w, h, detail);
  for (let y = top; y < h - 30; y += 46) for (const x of [26, w - 26]) { g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill(); }
  // arched fan
  const ax = mirrored ? 0 : w, ay = top - 10;
  g.strokeStyle = metalGradient(g, 0, 0, w, top, detail); g.lineWidth = 3;
  for (let i = 1; i <= 4; i++) { g.beginPath(); g.arc(ax, ay, (w - 30) * (i / 4), mirrored ? -Math.PI / 2 : Math.PI, mirrored ? 0 : Math.PI * 1.5); g.stroke(); }
  noise(g, w, h, 12);
  return c;
}

export async function mountDoors(canvas: HTMLCanvasElement, o: OpeningOptions, cb: OpeningCallbacks): Promise<OpeningHandle> {
  const sc = o.theme.scene, pal = o.theme.palette;
  const st = createStage(canvas, o, { width: DW * 1.6, height: HT * 1.35 });
  const { scene, camera, tex } = st;

  // Back wall with a soft pattern
  const [wc, wg] = canvas2d(512, 512);
  wg.fillStyle = pal.night; wg.fillRect(0, 0, 512, 512);
  wg.strokeStyle = new THREE.Color(o.accent).multiplyScalar(0.35).getStyle(); wg.lineWidth = 1.5;
  for (let y = 0; y < 576; y += 64) for (let x = 0; x < 576; x += 64) { wg.beginPath(); wg.moveTo(x, y - 26); wg.lineTo(x + 26, y); wg.lineTo(x, y + 26); wg.lineTo(x - 26, y); wg.closePath(); wg.stroke(); }
  const wallTex = tex(wc); wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(6, 5);

  // The doorway: wall with an arched hole so light shows through the opening.
  const outer = new THREE.Shape(); outer.moveTo(-12, -9); outer.lineTo(12, -9); outer.lineTo(12, 11); outer.lineTo(-12, 11); outer.closePath();
  const hole = new THREE.Path(); hole.moveTo(-DW / 2, 0); hole.lineTo(DW / 2, 0); hole.lineTo(DW / 2, HS); hole.absarc(0, HS, DW / 2, 0, Math.PI, false); hole.lineTo(-DW / 2, 0);
  outer.holes.push(hole);
  const wallGeo = new THREE.ShapeGeometry(outer, 32);
  const wallUv = wallGeo.attributes.position!; const uv = new Float32Array(wallUv.count * 2);
  for (let i = 0; i < wallUv.count; i++) { uv[i * 2] = (wallUv.getX(i) + 12) / 24; uv[i * 2 + 1] = (wallUv.getY(i) + 9) / 20; }
  wallGeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 }));
  wall.position.set(0, -HT / 2 + 0.1, 0.02); wall.receiveShadow = true;

  const group = new THREE.Group(); group.position.y = -HT / 2 + 0.1; scene.add(group, wall);

  // Arch frame (extruded ring around the doorway)
  const fo = new THREE.Shape(); const fw = DW / 2 + 0.28;
  fo.moveTo(-fw, -0.05); fo.lineTo(fw, -0.05); fo.lineTo(fw, HS); fo.absarc(0, HS, fw, 0, Math.PI, false); fo.lineTo(-fw, -0.05);
  const fh = new THREE.Path(); fh.moveTo(-DW / 2, 0); fh.lineTo(DW / 2, 0); fh.lineTo(DW / 2, HS); fh.absarc(0, HS, DW / 2, 0, Math.PI, false); fh.lineTo(-DW / 2, 0);
  fo.holes.push(fh);
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(fo, { depth: 0.22, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3, curveSegments: 48 }),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(sc.frame ?? pal.paper), roughness: 0.55, metalness: 0.1 }));
  frame.position.z = 0.02; frame.castShadow = true; group.add(frame);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(DW / 2 + 0.14, 0.025, 12, 96, Math.PI), new THREE.MeshStandardMaterial({ color: new THREE.Color(o.accent), metalness: 1, roughness: 0.28 }));
  trim.position.set(0, HS, 0.27); group.add(trim);

  // Light and the invitation card waiting behind the doors
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(DW + 0.2, HT + 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(sc.light ?? "#ffe3a8") }));
  glow.position.set(0, HT / 2, -0.25); group.add(glow);
  const inner = new THREE.PointLight(new THREE.Color(sc.light ?? "#ffe3a8"), 0, 12, 1.6); inner.position.set(0, HT / 2, 1.2); group.add(inner);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 1.27), new THREE.MeshStandardMaterial({ map: tex(cardCanvas(o)), roughness: 0.6, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.08 }));
  card.position.set(0, HS * 0.62, -0.15); group.add(card);

  // Door leaves with hinges at the outer edges
  const leaf = (side: 1 | -1) => {
    const s = new THREE.Shape(), half = DW / 2 - 0.01;
    if (side > 0) { s.moveTo(0, 0); s.lineTo(half, 0); s.lineTo(half, HS + DW / 2); s.absarc(half, HS, half, Math.PI / 2, Math.PI, false); s.lineTo(0, 0); }
    else { s.moveTo(0, 0); s.lineTo(0, HS); s.absarc(-half, HS, half, 0, Math.PI / 2, false); s.lineTo(-half, 0); s.lineTo(0, 0); }
    const geo = planarUV(new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 40 }));
    const map = tex(doorCanvas(sc.surface ?? pal.paper, sc.detail ?? o.accent, side < 0));
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, roughness: 0.6, metalness: 0.05, bumpMap: map, bumpScale: 0.4 }));
    mesh.castShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 10, 32), new THREE.MeshStandardMaterial({ color: new THREE.Color(o.accent), metalness: 1, roughness: 0.25 }));
    ring.position.set(side * (half - 0.14), HS * 0.52, 0.12);
    const pivot = new THREE.Group(); pivot.position.set(-side * DW / 2, 0, 0.04); pivot.add(mesh, ring);
    group.add(pivot); return pivot;
  };
  const left = leaf(1), right = leaf(-1);

  const reset = () => { left.rotation.y = 0; right.rotation.y = 0; inner.intensity = 0; card.position.set(0, HS * 0.62, -0.15); card.scale.setScalar(1); };
  reset();
  const target = new THREE.Vector3();
  const loop = runLoop(st, cb, o, (phase, t, s) => {
    const k = o.reducedMotion ? 0 : 1;
    if (phase === "idle") {
      camera.position.set(st.pointer.x * 0.35 * k + Math.sin(t * 0.4) * 0.1 * k, 0.2 + st.pointer.y * 0.2 * k, st.baseZ);
      // a breath of light through the crack between the leaves
      left.rotation.y = 0.02 + Math.sin(t * 1.3) * 0.01 * k; right.rotation.y = -left.rotation.y;
      target.set(0, 0.1, 0);
    } else {
      const op = easeInOut(seg(s, 0.15, 2.0));
      left.rotation.y = 0.02 + op * 1.75; right.rotation.y = -left.rotation.y;
      inner.intensity = op * 30;
      const cardIn = easeInOut(seg(s, 1.6, 3.6));
      card.position.z = THREE.MathUtils.lerp(-0.15, st.baseZ - 2.6, cardIn);
      card.position.y = THREE.MathUtils.lerp(HS * 0.62, HT / 2 - 0.1 + 0.25, cardIn);
      const dolly = easeInOut(seg(s, 0.8, 3.6));
      camera.position.set(0, 0.2, st.baseZ - dolly * 1.6);
      target.set(0, 0.1 + dolly * 0.15, 0);
    }
    camera.lookAt(target);
  }, 3.7);
  return { open: loop.open, reset: () => { reset(); loop.restart(); }, dispose: () => { loop.stop(); st.dispose(); } };
}
