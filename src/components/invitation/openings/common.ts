import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { ThemeDef } from "@/themes/catalog";

export type OpeningOptions = {
  theme: ThemeDef;
  accent: string;
  monogram: string;            // e.g. "S&O"
  names: { en: string; ar: string };
  guestName: { en: string; ar: string } | null;
  dateText: string;            // "17 · 12 · 2026"
  reducedMotion: boolean;
};
export type OpeningCallbacks = { onBegin: () => void; onDone: () => void };
export type OpeningHandle = { open: () => void; reset: () => void; dispose: () => void };

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

export function canvas2d(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!];
}

export function noise(g: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amount; d[i]! += n; d[i + 1]! += n; d[i + 2]! += n; }
  g.putImageData(im, 0, 0);
}

export function fibers(g: CanvasRenderingContext2D, w: number, h: number, n: number, a: number) {
  for (let i = 0; i < n; i++) {
    g.strokeStyle = `rgba(110,80,40,${Math.random() * a})`; g.lineWidth = Math.random() * 1.2;
    const x = Math.random() * w, y = Math.random() * h;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30, x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 50); g.stroke();
  }
}

export function metalGradient(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, base: string) {
  const c = new THREE.Color(base);
  const light = c.clone().lerp(new THREE.Color("#ffffff"), 0.45).getStyle();
  const dark = c.clone().multiplyScalar(0.7).getStyle();
  const grd = g.createLinearGradient(x0, y0, x1, y1);
  grd.addColorStop(0, dark); grd.addColorStop(0.45, base); grd.addColorStop(0.55, light); grd.addColorStop(1, dark);
  return grd;
}

export const fontStack = (t: ThemeDef) => ({ display: `"${t.fonts.display}", "Cormorant Garamond", Georgia, serif`, arabic: `"${t.fonts.arabic}", "Amiri", serif` });

/** Wait (briefly) for the theme fonts so canvas text uses them. */
export async function loadFonts(t: ThemeDef) {
  const f = fontStack(t);
  await Promise.race([
    Promise.all([document.fonts.load(`500 80px ${f.display}`), document.fonts.load(`italic 500 80px ${f.display}`), document.fonts.load(`40px ${f.arabic}`), document.fonts.load("600 20px Manrope")]),
    new Promise((r) => setTimeout(r, 2500)),
  ]).catch(() => undefined);
}

/** The invitation card that every opening reveals. */
export function cardCanvas(o: OpeningOptions, w = 1024, h = 704) {
  const t = o.theme, f = fontStack(t), p = t.palette;
  const [c, g] = canvas2d(w, h);
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, p.paper2); grd.addColorStop(1, p.paper); g.fillStyle = grd; g.fillRect(0, 0, w, h);
  noise(g, w, h, 6); fibers(g, w, h, 220, 0.03);
  const metal = metalGradient(g, 0, 0, w, h, o.accent);
  g.strokeStyle = metal; g.lineWidth = 4; g.strokeRect(30, 30, w - 60, h - 60); g.lineWidth = 1.5; g.strokeRect(44, 44, w - 88, h - 88);
  ([[44, 44, 1, 1], [w - 44, 44, -1, 1], [44, h - 44, 1, -1], [w - 44, h - 44, -1, -1]] as const).forEach(([x, y, sx, sy]) => { g.beginPath(); g.moveTo(x + sx * 46, y); g.quadraticCurveTo(x + sx * 14, y + sy * 14, x, y + sy * 46); g.stroke(); });
  g.textAlign = "center"; g.fillStyle = metal;
  g.font = `40px ${f.arabic}`; g.fillText("بسم الله الرحمن الرحيم", w / 2, 122);
  g.fillStyle = p.accentText; g.font = "600 20px Manrope, sans-serif"; g.fillText("T O G E T H E R   W I T H   T H E I R   F A M I L I E S", w / 2, 182);
  g.fillStyle = metal;
  const en = o.names.en || o.names.ar;
  let size = 128; g.font = `500 ${size}px ${f.display}`;
  while (g.measureText(en).width > w - 160 && size > 50) { size -= 6; g.font = `500 ${size}px ${f.display}`; }
  g.fillText(en, w / 2, 340);
  if (o.names.ar && o.names.en) { g.font = `60px ${f.arabic}`; g.fillText(o.names.ar, w / 2, 444); }
  g.fillRect(w / 2 - 70, 488, 140, 2);
  g.fillStyle = p.ink; g.font = `500 44px ${f.display}`; g.fillText(o.dateText, w / 2, 562);
  g.fillStyle = p.accentText; g.font = "600 20px Manrope, sans-serif"; g.fillText("M U S C A T", w / 2, 608);
  return c;
}

export function sealCanvas(o: OpeningOptions, waxColor: string, size = 512) {
  const f = fontStack(o.theme);
  const [c, g] = canvas2d(size, size);
  const base = new THREE.Color(waxColor);
  const r = g.createRadialGradient(size * 0.4, size * 0.35, 10, size / 2, size / 2, size / 2);
  r.addColorStop(0, base.clone().lerp(new THREE.Color("#ffffff"), 0.18).getStyle()); r.addColorStop(1, base.clone().multiplyScalar(0.8).getStyle());
  g.fillStyle = r; g.fillRect(0, 0, size, size);
  g.strokeStyle = "rgba(0,0,0,0.45)"; g.lineWidth = 6; g.beginPath(); g.arc(size / 2 + 2, size / 2 + 3, size * 0.4, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = "rgba(255,235,220,0.35)"; g.lineWidth = 4; g.beginPath(); g.arc(size / 2 - 1, size / 2 - 1, size * 0.4, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.fillStyle = "rgba(255,235,220,0.28)"; g.beginPath(); g.arc(size / 2 + Math.cos(a) * size * 0.345, size / 2 + Math.sin(a) * size * 0.345, 3, 0, Math.PI * 2); g.fill(); }
  g.textAlign = "center"; g.textBaseline = "middle"; g.font = `italic 500 ${size * 0.28}px ${f.display}`;
  g.fillStyle = "rgba(20,3,6,0.6)"; g.fillText(o.monogram, size / 2 + 3, size / 2 + 4);
  g.fillStyle = "rgba(255,235,225,0.5)"; g.fillText(o.monogram, size / 2 - 1, size / 2 - 1);
  g.fillStyle = base.clone().lerp(new THREE.Color("#ffffff"), 0.08).getStyle(); g.fillText(o.monogram, size / 2 + 1, size / 2 + 1);
  return c;
}

export function planarUV(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const b = geo.boundingBox!, p = geo.attributes.position!, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) - b.min.x) / (b.max.x - b.min.x); uv[i * 2 + 1] = (p.getY(i) - b.min.y) / (b.max.y - b.min.y); }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** Renderer, scene, lights, gold dust, burst particles and a resize-aware camera. */
export function createStage(canvas: HTMLCanvasElement, o: OpeningOptions, fit: { width: number; height: number }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const tex = (c: HTMLCanvasElement, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };

  scene.add(new THREE.HemisphereLight(0xffe9d0, new THREE.Color(o.theme.palette.night), 0.55));
  const key = new THREE.SpotLight(0xfff1dc, 60, 30, Math.PI / 7, 0.55, 1.6);
  key.position.set(-3.5, 5, 7); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; key.shadow.bias = -0.0004;
  scene.add(key, key.target);
  const rim = new THREE.PointLight(new THREE.Color(o.accent), 18, 14, 1.8); rim.position.set(3.5, 2.5, -2.5); scene.add(rim);

  // Gold dust
  const dotC = canvas2d(64, 64); const rg = dotC[1].createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, "rgba(255,245,215,1)"); rg.addColorStop(0.35, "rgba(235,210,150,.6)"); rg.addColorStop(1, "rgba(0,0,0,0)"); dotC[1].fillStyle = rg; dotC[1].fillRect(0, 0, 64, 64);
  const dot = tex(dotC[0]);
  const N = 240, pos = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 14; pos[i * 3 + 1] = (Math.random() - 0.5) * 10; pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 0.5; spd[i] = 0.08 + Math.random() * 0.22; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: dot, size: 0.07, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(o.accent).lerp(new THREE.Color("#fff3d6"), 0.4) }));
  scene.add(dust);
  const B = 90, bPos = new Float32Array(B * 3), bVel: THREE.Vector3[] = [];
  const burstGeo = new THREE.BufferGeometry(); burstGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
  const burstMat = new THREE.PointsMaterial({ map: dot, size: 0.11, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xf6e3b0 });
  scene.add(new THREE.Points(burstGeo, burstMat));
  const burst = (at: THREE.Vector3) => {
    bVel.length = 0;
    for (let i = 0; i < B; i++) { bPos[i * 3] = at.x; bPos[i * 3 + 1] = at.y; bPos[i * 3 + 2] = at.z + 0.1; const a = Math.random() * Math.PI * 2, s = 1.2 + Math.random() * 2.6; bVel.push(new THREE.Vector3(Math.cos(a) * s, Math.sin(a) * s, Math.random() * 1.5)); }
    burstGeo.attributes.position!.needsUpdate = true; burstMat.opacity = 1;
  };

  let baseZ = 8;
  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    baseZ = Math.max((fit.width / 2) / (Math.tan(fov / 2) * camera.aspect), (fit.height / 2) / Math.tan(fov / 2), 6.5);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  const pointer = new THREE.Vector2();
  const onMove = (e: PointerEvent) => pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
  window.addEventListener("pointermove", onMove);

  /** Per-frame updates shared by every opening. */
  const tick = (t: number, dt: number) => {
    const p = dustGeo.attributes.position!;
    for (let i = 0; i < N; i++) { let y = p.getY(i) + spd[i]! * dt; if (y > 5) y = -5; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * 0.3 + i) * 0.0015); }
    p.needsUpdate = true;
    if (burstMat.opacity > 0) {
      const bp = burstGeo.attributes.position!;
      for (let i = 0; i < B; i++) { const v = bVel[i]; if (!v) continue; v.multiplyScalar(0.965); v.y -= 1.2 * dt; bp.setXYZ(i, bp.getX(i) + v.x * dt, bp.getY(i) + v.y * dt, bp.getZ(i) + v.z * dt); }
      bp.needsUpdate = true; burstMat.opacity = Math.max(0, burstMat.opacity - dt * 0.6);
    }
  };

  const dispose = () => {
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onMove);
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) { for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose(); mat.dispose(); }
    });
    pmrem.dispose();
    renderer.dispose();
  };

  return { THREE, renderer, scene, camera, tex, key, rim, pointer, burst, tick, dispose, resetBurst: () => { burstMat.opacity = 0; }, get baseZ() { return baseZ; } };
}

export type Stage = ReturnType<typeof createStage>;

/** Animation loop with an "opening" timeline; `frame(phase, t, s)` gets seconds since open. */
export function runLoop(stage: Stage, cb: OpeningCallbacks, o: OpeningOptions, frame: (phase: "idle" | "open", t: number, s: number, dt: number) => void, duration: number) {
  const clock = new THREE.Clock();
  let phase: "idle" | "open" | "done" = "idle", t0 = 0, last = 0, raf = 0, running = true;
  const k = o.reducedMotion ? 0.55 : 1;
  const loop = () => {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const t = clock.getElapsedTime(), dt = Math.min(0.05, t - last); last = t;
    stage.tick(t, dt);
    if (phase !== "done") {
      const s = phase === "open" ? (t - t0) / k : 0;
      frame(phase === "open" ? "open" : "idle", t, s, dt);
      if (phase === "open" && s > duration) { phase = "done"; cb.onDone(); }
    }
    stage.renderer.render(stage.scene, stage.camera);
    if (phase === "done") { running = false; cancelAnimationFrame(raf); } // stop drawing once the card is shown
  };
  loop();
  return {
    open: () => { if (phase !== "idle") return; phase = "open"; t0 = clock.getElapsedTime(); cb.onBegin(); },
    restart: () => { phase = "idle"; if (!running) { running = true; loop(); } },
    stop: () => { running = false; cancelAnimationFrame(raf); },
  };
}
