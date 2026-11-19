"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Brings a painted scene to life with its depth map: parallax that follows the phone's
 * tilt (or the finger), a slow breathing camera drift, shimmering distant air, swaying
 * greenery, flickering warm lights and twinkles on bright highlights. Plain WebGL, one
 * full-screen pass. Falls back to nothing (the static painting stays) if anything fails.
 */
const VERT = `#version 300 es
in vec2 a; out vec2 vUv;
void main(){ vUv = a * 0.5 + 0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uImg; uniform sampler2D uDepth;
uniform vec2 uRes; uniform vec2 uImgSize; uniform float uT; uniform vec2 uOff; uniform float uFade;
in vec2 vUv; out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
vec2 cover(vec2 uv){ float ra = uRes.x / uRes.y, ri = uImgSize.x / uImgSize.y;
  vec2 s = ra > ri ? vec2(1.0, ri / ra) : vec2(ra / ri, 1.0); return (uv - 0.5) * s + 0.5; }
void main(){
  vec2 uv = cover(vUv);
  float z = 1.045 + 0.018 * (0.5 - 0.5 * cos(uT * 0.19));
  uv = (uv - 0.5) / z + 0.5 + vec2(0.006 * sin(uT * 0.11), 0.004 * sin(uT * 0.07 + 1.0));
  vec2 p = uv;
  for (int i = 0; i < 5; i++) { float d = texture(uDepth, p).r; p = uv + (d - 0.4) * uOff; }
  float d = texture(uDepth, p).r;
  float far = smoothstep(0.2, 0.03, d);
  p += far * (vec2(noise(p * 5.0 + vec2(uT * 0.06, 0.0)), noise(p * 5.0 + vec2(0.0, uT * 0.05))) - 0.5) * 0.007;
  vec3 c0 = texture(uImg, p).rgb;
  float green = smoothstep(0.015, 0.09, c0.g - max(c0.r, c0.b)) * smoothstep(0.1, 0.4, d);
  p.x += green * sin(uT * 1.15 + p.y * 34.0 + p.x * 9.0) * 0.0016;
  vec3 c = texture(uImg, p).rgb;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float warm = smoothstep(0.72, 0.95, lum) * smoothstep(0.0, 0.08, c.r - c.b);
  c *= 1.0 + warm * (noise(vec2(uT * 7.0, p.y * 50.0 + p.x * 20.0)) - 0.5) * 0.16;
  vec2 g = p * vec2(70.0, 124.0); vec2 id = floor(g); float h = hash(id); vec2 f = fract(g) - 0.5;
  float tw = pow(max(0.0, sin(uT * (1.2 + h * 2.4) + h * 40.0)), 14.0) * step(0.9, h) * smoothstep(0.68, 0.9, lum);
  float star = tw * (smoothstep(0.22, 0.0, length(f)) + 0.6 * smoothstep(0.05, 0.0, abs(f.x)) * smoothstep(0.4, 0.0, abs(f.y)) + 0.6 * smoothstep(0.05, 0.0, abs(f.y)) * smoothstep(0.4, 0.0, abs(f.x)));
  c += star * vec3(1.0, 0.96, 0.86);
  o = vec4(c, uFade);
}`;

export function depthUrlFor(painted: string): string | null {
  return /\/themes\/[a-z-]+\/reveal\.webp$/.test(painted) ? painted.replace(/reveal\.webp$/, "depth.webp") : null;
}

export function LivingScene({ painted, depth, active }: { painted: string; depth: string; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = ref.current; if (!cv) return;
    const gl = cv.getContext("webgl2", { alpha: true, premultipliedAlpha: false, antialias: false });
    if (!gl) return;
    let raf = 0, dead = false;
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const load = (src: string, unit: number) => new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image(); im.decoding = "async";
      im.onload = () => {
        const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        res(im);
      };
      im.onerror = rej; im.src = src;
    });

    // tilt / finger target, eased
    const tgt = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tgt.x = Math.max(-1, Math.min(1, e.gamma / 25)); tgt.y = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
    };
    const onMove = (e: PointerEvent) => { tgt.x = (e.clientX / innerWidth) * 2 - 1; tgt.y = (e.clientY / innerHeight) * 2 - 1; };
    addEventListener("deviceorientation", onTilt); addEventListener("pointermove", onMove, { passive: true });

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.75);
      cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr);
      gl.viewport(0, 0, cv.width, cv.height);
    };
    let imgSize: [number, number] = [1080, 1920];
    Promise.all([load(painted, 0), load(depth, 1)]).then(([im]) => {
      if (dead) return;
      imgSize = [im.naturalWidth, im.naturalHeight];
      gl.uniform1i(U("uImg"), 0); gl.uniform1i(U("uDepth"), 1);
      resize(); addEventListener("resize", resize);
      setReady(true);
      const t0 = performance.now();
      let fade = 0;
      const frame = (now: number) => {
        if (dead) return;
        raf = requestAnimationFrame(frame);
        if (document.hidden) return;
        const t = (now - t0) / 1000;
        cur.x += (tgt.x - cur.x) * 0.05; cur.y += (tgt.y - cur.y) * 0.05;
        fade = Math.min(1, fade + (activeRef.current ? 1 / 70 : 0));
        gl.uniform2f(U("uRes"), cv.width, cv.height); gl.uniform2f(U("uImgSize"), imgSize[0], imgSize[1]);
        gl.uniform1f(U("uT"), t); gl.uniform1f(U("uFade"), fade);
        gl.uniform2f(U("uOff"), 0.016 * Math.sin(t * 0.23) + 0.022 * cur.x, 0.01 * Math.sin(t * 0.17 + 1) + 0.016 * cur.y);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      raf = requestAnimationFrame(frame);
    }).catch(() => { /* no depth map: keep the static painting */ });

    return () => {
      dead = true; cancelAnimationFrame(raf);
      removeEventListener("deviceorientation", onTilt); removeEventListener("pointermove", onMove); removeEventListener("resize", resize);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [painted, depth]);

  return <canvas ref={ref} className={`layer living${ready ? " ready" : ""}`} aria-hidden="true" />;
}
