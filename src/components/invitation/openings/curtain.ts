import * as THREE from "three";
import { canvas2d, cardCanvas, createStage, easeInOut, noise, runLoop, seg, type OpeningCallbacks, type OpeningHandle, type OpeningOptions } from "./common";

const W = 9, H = 8.4; // larger than the view so the curtain fills any screen

function velvetCanvas(c1: string, c2: string, accent: string, stars: boolean) {
  const w = 512, h = 1024;
  const [c, g] = canvas2d(w, h);
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, c2); grd.addColorStop(0.35, c1); grd.addColorStop(1, c2);
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  noise(g, w, h, 14);
  if (stars) {
    g.fillStyle = accent;
    for (let i = 0; i < 90; i++) { const x = Math.random() * w, y = Math.random() * h * 0.92, r = 1 + Math.random() * 2.4; g.globalAlpha = 0.35 + Math.random() * 0.6; g.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, rr = k % 2 ? r * 0.4 : r * 1.6; g[k ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
    g.globalAlpha = 1;
  }
  // embroidered hem
  g.fillStyle = accent; g.fillRect(0, h - 46, w, 6); g.fillRect(0, h - 30, w, 2);
  return c;
}

export async function mountCurtain(canvas: HTMLCanvasElement, o: OpeningOptions, cb: OpeningCallbacks): Promise<OpeningHandle> {
  const sc = o.theme.scene, pal = o.theme.palette;
  const st = createStage(canvas, o, { width: 3.4, height: 5 });
  const { scene, camera, tex } = st;

  // Stage behind the curtains: soft spotlight on the invitation card.
  const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ color: new THREE.Color(pal.night2), roughness: 1 }));
  back.position.z = -1.6; scene.add(back);
  const halo = (() => { const [c, g] = canvas2d(512, 512); const r = g.createRadialGradient(256, 256, 0, 256, 256, 256); r.addColorStop(0, new THREE.Color(sc.light ?? "#fff1d0").getStyle()); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, 512, 512); return c; })();
  const haloMesh = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: tex(halo), transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }));
  haloMesh.position.z = -1.5; scene.add(haloMesh);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.51), new THREE.MeshStandardMaterial({ map: tex(cardCanvas(o)), roughness: 0.6 }));
  card.position.set(0, 0.05, -1.2); scene.add(card);
  const spot = new THREE.SpotLight(new THREE.Color(sc.light ?? "#fff1d0"), 0, 12, Math.PI / 9, 0.6, 1.4);
  spot.position.set(0, 3, 2.5); spot.target = card; scene.add(spot);

  // Curtains: dense planes whose vertices fold and gather towards the sides.
  const map = tex(velvetCanvas(sc.fabric ?? pal.night, sc.fabric2 ?? pal.night2, o.accent, !!sc.stars));
  const velvet = new THREE.MeshPhysicalMaterial({ map, roughness: 0.85, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(sc.fabric ?? pal.night).lerp(new THREE.Color("#ffffff"), 0.45), side: THREE.DoubleSide });
  const makePanel = (side: 1 | -1) => {
    const geo = new THREE.PlaneGeometry(W / 2 + 0.15, H, 90, 24);
    geo.translate(-side * (W / 4 - 0.075), 0, 0); // panel centre; side=1 → left panel
    const base = Float32Array.from(geo.attributes.position!.array as Float32Array);
    const mesh = new THREE.Mesh(geo, velvet); mesh.castShadow = true; scene.add(mesh);
    return { mesh, base, side };
  };
  const panels = [makePanel(1), makePanel(-1)];
  const pose = (gather: number, t: number) => {
    for (const p of panels) {
      const pos = p.mesh.geometry.attributes.position!;
      const outer = -p.side * W / 2; // the edge each panel gathers towards
      for (let i = 0; i < pos.count; i++) {
        const x0 = p.base[i * 3]!, y0 = p.base[i * 3 + 1]!;
        const v = (H / 2 - y0) / H; // 0 top → 1 bottom
        const pull = gather * (0.82 - 0.25 * Math.pow(1 - v, 3)); // gathered more at the bottom like a tied-back drape
        const x = outer + (x0 - outer) * (1 - pull);
        const folds = (0.06 + 0.16 * gather) * Math.sin((x0 - outer) * 6) + 0.015 * Math.sin(t * 1.2 + x0 * 3 + y0);
        pos.setXYZ(i, x, y0 + (gather * 0.18 * v * v), folds);
      }
      pos.needsUpdate = true;
      p.mesh.geometry.computeVertexNormals();
    }
  };
  // Valance and tie ropes in metal
  const metal = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.accent), metalness: 1, roughness: 0.3 });
  const valance = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.32, 0.25), new THREE.MeshPhysicalMaterial({ map, roughness: 0.85, sheen: 1, sheenColor: velvet.sheenColor }));
  scene.add(valance);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, W + 0.6, 16), metal); rod.rotation.z = Math.PI / 2; scene.add(rod);
  const tassels = [-1, 1].map((sx) => { const t = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 16), metal); t.userData.sx = sx; t.rotation.z = Math.PI; t.visible = false; scene.add(t); return t; });

  const reset = () => { pose(0, 0); card.position.set(0, 0.05, -1.2); spot.intensity = 0; (haloMesh.material as THREE.MeshBasicMaterial).opacity = 0; tassels.forEach((t) => { t.visible = false; }); };
  reset();
  const target = new THREE.Vector3();
  /** Keep the valance at the top edge of whatever screen we are on. */
  const placeTrim = () => {
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * st.baseZ;
    const halfW = halfH * camera.aspect;
    valance.position.set(0, halfH - 0.16, 0.18);
    rod.position.set(0, halfH - 0.36, 0.33);
    tassels.forEach((tt) => tt.position.set((tt.userData.sx as number) * (halfW - 0.25), -0.3, 0.2));
  };
  const loop = runLoop(st, cb, o, (phase, t, s) => {
    const k = o.reducedMotion ? 0 : 1;
    placeTrim();
    if (phase === "idle") {
      pose(0.02 + Math.sin(t * 0.8) * 0.01 * k, t * k);
      camera.position.set(st.pointer.x * 0.3 * k, 0.1 + st.pointer.y * 0.15 * k, st.baseZ);
      target.set(0, 0, 0);
    } else {
      const g = easeInOut(seg(s, 0.1, 2.2));
      pose(g, t);
      tassels.forEach((tt) => { tt.visible = g > 0.7; });
      spot.intensity = g * 40;
      (haloMesh.material as THREE.MeshBasicMaterial).opacity = g * 0.65;
      const fly = easeInOut(seg(s, 1.9, 3.7));
      card.position.z = THREE.MathUtils.lerp(-1.2, st.baseZ - 2.9, fly);
      card.position.y = THREE.MathUtils.lerp(0.05, 0.1, fly);
      camera.position.set(0, 0.1, st.baseZ - easeInOut(seg(s, 1.2, 3.7)) * 0.8);
      target.set(0, 0.05, 0);
    }
    camera.lookAt(target);
  }, 3.8);
  return { open: loop.open, reset: () => { reset(); loop.restart(); }, dispose: () => { loop.stop(); st.dispose(); } };
}
