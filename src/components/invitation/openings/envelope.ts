import * as THREE from "three";
import { canvas2d, cardCanvas, createStage, easeInOut, easeOut, fibers, fontStack, metalGradient, noise, planarUV, runLoop, seg, sealCanvas, clamp01, type OpeningCallbacks, type OpeningHandle, type OpeningOptions } from "./common";

const W = 3.2, H = 2.2, TW = 1024, TH = 704;

function pattern(g: CanvasRenderingContext2D, w: number, h: number, kind: string, stroke: string) {
  g.strokeStyle = stroke; g.lineWidth = 1.6; const s = 64;
  for (let y = 0; y < h + s; y += s) for (let x = 0; x < w + s; x += s) {
    g.beginPath();
    if (kind === "waves") { g.moveTo(x - s / 2, y); g.quadraticCurveTo(x - s / 4, y - s / 4, x, y); g.quadraticCurveTo(x + s / 4, y + s / 4, x + s / 2, y); }
    else if (kind === "leaves") { g.ellipse(x, y, s * 0.12, s * 0.32, Math.PI / 5, 0, Math.PI * 2); g.moveTo(x - s * 0.25, y + s * 0.3); g.lineTo(x + s * 0.25, y - s * 0.3); }
    else if (kind === "stars") { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r = i % 2 ? s * 0.08 : s * 0.22; i ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + r, y); } g.closePath(); }
    else { g.moveTo(x, y - s * 0.42); g.lineTo(x + s * 0.42, y); g.lineTo(x, y + s * 0.42); g.lineTo(x - s * 0.42, y); g.closePath(); g.rect(x - s * 0.14, y - s * 0.14, s * 0.28, s * 0.28); }
    g.stroke();
  }
}

export async function mountEnvelope(canvas: HTMLCanvasElement, o: OpeningOptions, cb: OpeningCallbacks): Promise<OpeningHandle> {
  const sc = o.theme.scene, pal = o.theme.palette, f = fontStack(o.theme);
  const st = createStage(canvas, o, { width: W * 1.25, height: H * 2.1 });
  const { scene, camera, tex } = st;

  const paperColor = sc.paper ?? pal.paper;
  const paper = (withName: boolean) => {
    const [c, g] = canvas2d(TW, TH);
    const base = new THREE.Color(paperColor);
    const grd = g.createLinearGradient(0, 0, TW, TH); grd.addColorStop(0, base.clone().lerp(new THREE.Color("#ffffff"), 0.25).getStyle()); grd.addColorStop(1, base.getStyle()); g.fillStyle = grd; g.fillRect(0, 0, TW, TH);
    g.globalAlpha = 0.5; pattern(g, TW, TH, "lattice", base.clone().multiplyScalar(0.86).getStyle()); g.globalAlpha = 1;
    noise(g, TW, TH, 10); fibers(g, TW, TH, 500, 0.05);
    if (withName) {
      const cy = TH * 0.58; g.strokeStyle = "rgba(90,60,30,0.16)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, TH); g.lineTo(TW / 2, cy); g.lineTo(TW, TH); g.stroke();
      const sh = g.createLinearGradient(0, cy, 0, TH); sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(90,60,30,0.10)"); g.fillStyle = sh; g.beginPath(); g.moveTo(0, TH); g.lineTo(TW / 2, cy); g.lineTo(TW, TH); g.closePath(); g.fill();
      if (o.guestName) {
        g.fillStyle = metalGradient(g, TW * 0.3, 0, TW * 0.7, 0, pal.accentText); g.textAlign = "center";
        g.font = `italic 500 46px ${f.display}`; g.fillText(o.guestName.en || o.guestName.ar, TW / 2, TH * 0.855);
        if (o.guestName.en && o.guestName.ar) { g.font = `34px ${f.arabic}`; g.fillText(o.guestName.ar, TW / 2, TH * 0.935); }
      }
    }
    return c;
  };
  const bumpC = canvas2d(TW, TH); bumpC[1].fillStyle = "#808080"; bumpC[1].fillRect(0, 0, TW, TH); pattern(bumpC[1], TW, TH, "lattice", "#a8a8a8"); noise(bumpC[1], TW, TH, 18);
  const bump = tex(bumpC[0], false);
  const paperMat = (c: HTMLCanvasElement) => new THREE.MeshStandardMaterial({ map: tex(c), bumpMap: bump, bumpScale: 0.6, roughness: 0.82 });
  const liner = (w: number, h: number) => {
    const [c, g] = canvas2d(w, h);
    const base = new THREE.Color(sc.liner ?? pal.glow);
    const grd = g.createRadialGradient(w / 2, h * 0.2, 10, w / 2, h / 2, w * 0.7); grd.addColorStop(0, base.getStyle()); grd.addColorStop(1, base.clone().multiplyScalar(0.5).getStyle());
    g.fillStyle = grd; g.fillRect(0, 0, w, h); g.globalAlpha = 0.6; pattern(g, w, h, sc.pattern ?? "lattice", sc.linerLine ?? o.accent); g.globalAlpha = 1; noise(g, w, h, 8);
    return c;
  };

  const env = new THREE.Group(); scene.add(env);
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.32 }));
  shadowPlane.position.z = -1.4; shadowPlane.receiveShadow = true; scene.add(shadowPlane);

  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex(liner(TW, TH)), roughness: 0.7 }));
  back.position.z = -0.02; back.castShadow = true; env.add(back);
  const backOuter = new THREE.Mesh(new THREE.PlaneGeometry(W, H), paperMat(paper(false))); backOuter.rotation.y = Math.PI; backOuter.position.z = -0.025; env.add(backOuter);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(2.96, 2.03), new THREE.MeshStandardMaterial({ map: tex(cardCanvas(o)), roughness: 0.6, side: THREE.DoubleSide }));
  card.castShadow = true; env.add(card);
  const ps = new THREE.Shape(); ps.moveTo(-W / 2, -H / 2); ps.lineTo(W / 2, -H / 2); ps.lineTo(W / 2, H / 2); ps.lineTo(0, 0.02); ps.lineTo(-W / 2, H / 2); ps.closePath();
  const pocket = new THREE.Mesh(planarUV(new THREE.ShapeGeometry(ps)), paperMat(paper(true)));
  pocket.position.z = 0.02; pocket.castShadow = true; pocket.receiveShadow = true; env.add(pocket);

  const flapPivot = new THREE.Group(); flapPivot.position.set(0, H / 2, 0.035); env.add(flapPivot);
  const tipY = -H * 0.64;
  const fs = new THREE.Shape(); fs.moveTo(-W / 2, 0); fs.lineTo(W / 2, 0); fs.lineTo(0.22, tipY + 0.12); fs.quadraticCurveTo(0, tipY - 0.02, -0.22, tipY + 0.12); fs.closePath();
  const fGeo = planarUV(new THREE.ShapeGeometry(fs, 24));
  const [fc, fg] = canvas2d(TW, Math.round(TH * 0.64)); fg.drawImage(paper(false), 0, 0);
  fg.strokeStyle = metalGradient(fg, 0, 0, TW, 0, o.accent); fg.lineWidth = 3; fg.beginPath(); fg.moveTo(24, 10); fg.lineTo(TW / 2, fc.height - 34); fg.lineTo(TW - 24, 10); fg.stroke();
  const flapFront = new THREE.Mesh(fGeo, new THREE.MeshStandardMaterial({ map: tex(fc), bumpMap: bump, bumpScale: 0.6, roughness: 0.8 }));
  const flapBack = new THREE.Mesh(fGeo, new THREE.MeshStandardMaterial({ map: tex(liner(TW, 450)), roughness: 0.7, side: THREE.BackSide }));
  flapFront.castShadow = true; flapPivot.add(flapFront, flapBack);

  // Wax seal in two halves so it can break.
  const seal = new THREE.Group(); seal.position.set(0, H / 2 + tipY + 0.05, 0.05); env.add(seal);
  const prof = [[0.41, 0], [0.415, 0.015], [0.4, 0.04], [0.37, 0.066], [0.335, 0.088], [0.3, 0.1], [0.26, 0.105], [0, 0.105]].map(([x, y]) => new THREE.Vector2(x, y));
  const waxColor = sc.seal ?? pal.glow;
  const wax = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(waxColor), roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.3, envMapIntensity: 0.7, side: THREE.DoubleSide });
  const mono = new THREE.MeshPhysicalMaterial({ map: tex(sealCanvas(o, waxColor)), roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.3 });
  const wobble = (geo: THREE.BufferGeometry) => { const p = geo.attributes.position!; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); if (r > 0.25) { const a = Math.atan2(z, x); const k = 1 + 0.045 * Math.sin(a * 7) + 0.03 * Math.sin(a * 13 + 1.3) + 0.02 * Math.sin(a * 23 + 0.4); p.setX(i, x * k); p.setZ(i, z * k); } } geo.computeVertexNormals(); return geo; };
  const halves = ([[0, 1], [Math.PI, -1]] as const).map(([phi, side]) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(wobble(new THREE.LatheGeometry(prof, 40, phi, Math.PI)), wax); body.rotation.x = Math.PI / 2; body.castShadow = true;
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.27, 48, side > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI), mono); face.position.z = 0.107;
    g.add(body, face); g.userData.side = side; seal.add(g); return g;
  });

  const reset = () => {
    flapPivot.rotation.x = 0; flapPivot.position.z = 0.035;
    halves.forEach((h) => { h.position.set(0, 0, 0); h.rotation.set(0, 0, 0); h.visible = true; });
    seal.scale.setScalar(0.95); card.position.set(0, -0.04, 0); card.rotation.set(0, 0, 0);
    env.position.set(0, 0, 0); env.rotation.set(0, 0, 0); st.resetBurst(); fired = false;
  };
  let fired = false;
  reset();
  const target = new THREE.Vector3();
  const loop = runLoop(st, cb, o, (phase, t, s) => {
    target.set(0, 0, 0);
    if (phase === "idle") {
      const k = o.reducedMotion ? 0 : 1;
      env.rotation.x = THREE.MathUtils.lerp(env.rotation.x, -0.16 + st.pointer.y * 0.12 * k + Math.sin(t * 0.6) * 0.03 * k, 0.06);
      env.rotation.y = THREE.MathUtils.lerp(env.rotation.y, 0.22 + st.pointer.x * 0.25 * k + Math.sin(t * 0.45) * 0.06 * k, 0.06);
      env.rotation.z = Math.sin(t * 0.5) * 0.02 * k; env.position.y = Math.sin(t * 0.9) * 0.07 * k;
      seal.scale.setScalar(0.95 + Math.sin(t * 2.6) * 0.025 * k);
      camera.position.set(0, 0.15, st.baseZ);
    } else {
      env.rotation.x = THREE.MathUtils.lerp(env.rotation.x, -0.06, 0.08); env.rotation.y = THREE.MathUtils.lerp(env.rotation.y, 0, 0.08); env.rotation.z *= 0.9;
      seal.scale.setScalar(0.95 - Math.sin(seg(s, 0, 0.25) * Math.PI) * 0.09);
      if (s > 0.25 && !fired) { fired = true; const p = new THREE.Vector3(); seal.getWorldPosition(p); st.burst(p); }
      const brk = seg(s, 0.25, 1.6);
      halves.forEach((h) => { const sd = h.userData.side as number; h.position.x = sd * easeOut(brk) * 0.9; h.position.y = -brk * brk * 3.2; h.position.z = easeOut(brk) * 0.9; h.rotation.z = -sd * brk * 2.2; h.rotation.y = sd * brk * 1.4; h.visible = brk < 1; });
      const fo = easeInOut(seg(s, 0.5, 1.8)); flapPivot.rotation.x = -Math.PI * 0.98 * fo; flapPivot.position.z = 0.035 - 0.075 * clamp01((fo - 0.45) / 0.2);
      const up = easeInOut(seg(s, 1.7, 3.0));
      const away = easeInOut(seg(s, 2.9, 4.1)); env.position.y = -away * 5.2; env.position.z = -away * 1.5;
      const fly = easeInOut(seg(s, 2.9, 4.4));
      card.position.y = THREE.MathUtils.lerp(-0.04 + up * 2.25, 0.1 - env.position.y, fly);
      card.position.z = THREE.MathUtils.lerp(0, st.baseZ - 3.4 - env.position.z, fly);
      card.rotation.x = Math.sin(fly * Math.PI) * -0.25;
      camera.position.set(0, 0.15 + 0.2 * (1 - fly), st.baseZ);
      target.set(0, up * 0.8 * (1 - fly) + fly * 0.1, 0);
    }
    camera.lookAt(target);
  }, 4.3);

  return {
    open: loop.open,
    reset: () => { reset(); loop.restart(); },
    dispose: () => { loop.stop(); st.dispose(); },
  };
}
