"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import type { PassView } from "@/server/services/gate";

type Result = { kind: "valid" | "complete" | "revoked" | "invalid" | "admitted"; pass?: PassView; message?: string } | null;

async function call<T>(body: object): Promise<T> {
  const res = await fetch("/api/gate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
  return json as T;
}

const time = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Muscat" }).format(new Date(iso)) : "");

export function Scanner({ eventId, title, initial, backHref }: { eventId: string; title: string; initial: { arrived: number; expected: number }; backHref: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [cam, setCam] = useState<"off" | "starting" | "on" | "denied">("off");
  const [result, setResult] = useState<Result>(null);
  const [count, setCount] = useState(1);
  const [stats, setStats] = useState(initial);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<PassView[]>([]);
  const [busy, setBusy] = useState(false);

  const show = useCallback((pass: PassView) => {
    setResult({ kind: pass.result, pass });
    setCount(Math.max(1, pass.admitCount - pass.admittedTotal));
    if (navigator.vibrate) navigator.vibrate(pass.result === "valid" ? 60 : [80, 60, 80]);
  }, []);

  /** Camera scans of the same code within 3 s are ignored; manual checks always run. */
  const verify = useCallback(async (code: string, manual = false) => {
    const now = Date.now();
    if (!manual && code === last.current.code && now - last.current.at < 3000) return;
    last.current = { code, at: now };
    try {
      const r = await call<{ pass?: PassView; invalid?: boolean }>({ op: "verify", eventId, code });
      if (r.pass) show(r.pass); else { setResult({ kind: "invalid" }); navigator.vibrate?.([80, 60, 80]); }
    } catch (e) { setResult({ kind: "invalid", message: (e as Error).message }); }
  }, [eventId, show]);

  // Camera loop: decode a frame every 250 ms.
  useEffect(() => {
    if (cam !== "starting") return;
    let stream: MediaStream | null = null, timer: ReturnType<typeof setInterval> | null = null, stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = video.current!; v.srcObject = stream; await v.play(); setCam("on");
        timer = setInterval(() => {
          const c = canvas.current; if (!c || v.readyState < 2) return;
          const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * 480) || 360;
          c.width = w; c.height = h;
          const g = c.getContext("2d", { willReadFrequently: true })!; g.drawImage(v, 0, 0, w, h);
          const img = g.getImageData(0, 0, w, h);
          const code = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
          if (code?.data) void verify(code.data);
        }, 250);
      } catch { setCam("denied"); }
    })();
    return () => { stopped = true; if (timer) clearInterval(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [cam, verify]);

  useEffect(() => {
    const i = setInterval(async () => { try { const r = await call<{ stats: { arrived: number; expected: number } }>({ op: "stats", eventId }); setStats(r.stats); } catch { /* offline */ } }, 15_000);
    return () => clearInterval(i);
  }, [eventId]);

  const doAdmit = async () => {
    if (!result?.pass) return;
    setBusy(true);
    try {
      const r = await call<{ pass: PassView; stats: { arrived: number; expected: number } }>({ op: "admit", eventId, passId: result.pass.passId, count });
      setResult({ kind: "admitted", pass: r.pass }); setStats(r.stats); setFound([]);
    } catch (e) { setResult({ ...result, message: (e as Error).message }); } finally { setBusy(false); }
  };

  const tone = !result ? null : result.kind === "valid" || result.kind === "admitted" ? { bg: "#E9F3EC", dot: "#2F6B4F", icon: "✓" } : result.kind === "complete" ? { bg: "#F6ECD9", dot: "#9A6A12", icon: "!" } : { bg: "#F6E4E4", dot: "#8C2F2F", icon: "×" };
  const p = result?.pass;
  const left = p ? p.admitCount - p.admittedTotal : 0;
  const headline = !result ? "" : result.kind === "admitted" ? `${p!.admittedTotal} of ${p!.admitCount} inside` : result.kind === "valid" ? `Welcome · party of ${p!.admitCount}` : result.kind === "complete" ? "Already checked in" : result.kind === "revoked" ? "This pass was cancelled" : "Not valid for this event";

  return (
    <main style={{ minHeight: "100svh", background: "#0E0A09", color: "#F7F2EA", padding: "18px 16px 28px" }}>
      <div style={{ maxWidth: 460, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="row between">
          <div><div className="kicker" style={{ color: "var(--gold)" }}>Entrance</div><div className="serif" style={{ fontSize: 24 }}>{title}</div></div>
          <a href={backHref} className="small" style={{ color: "#C9BBA9" }}>Back</a>
        </div>
        <div style={{ padding: "14px 16px", borderRadius: 16, background: "#1A1412" }} className="stack-sm">
          <div className="row between small"><span style={{ color: "#C9BBA9" }}>Arrived</span><strong>{stats.arrived} of {stats.expected}</strong></div>
          <div className="bar" style={{ background: "#2E2420" }}><i style={{ width: `${stats.expected ? Math.min(100, (stats.arrived / stats.expected) * 100) : 0}%` }} /></div>
        </div>

        <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", background: "#181210", aspectRatio: "4 / 3", display: "grid", placeItems: "center" }}>
          <video ref={video} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: cam === "on" ? "block" : "none" }} />
          <canvas ref={canvas} style={{ display: "none" }} />
          {cam !== "on" && (
            <div className="stack-sm" style={{ alignItems: "center", textAlign: "center", padding: 20 }}>
              {cam === "denied" ? <p className="small" style={{ color: "#E8B4B4", margin: 0 }}>Camera access was blocked. Allow the camera in your browser settings, or search by name below.</p> : <p className="small" style={{ color: "#C9BBA9", margin: 0 }}>Point the camera at the guest’s QR pass.</p>}
              <button className="btn btn-gold" type="button" onClick={() => setCam("starting")} disabled={cam === "starting"}>{cam === "starting" ? "Starting camera…" : "Start camera"}</button>
            </div>
          )}
          {cam === "on" && <div aria-hidden="true" style={{ position: "absolute", inset: "14% 22%", border: "3px solid rgba(201,164,92,.85)", borderRadius: 18 }} />}
        </div>

        {result && tone && (
          <div role="status" aria-live="assertive" style={{ borderRadius: 22, padding: 20, background: tone.bg, color: "#16110F" }} className="stack">
            <div className="row" style={{ gap: 14, flexWrap: "nowrap" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: tone.dot, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 20, flex: "none" }}>{tone.icon}</div>
              <div><div style={{ fontSize: 19, fontWeight: 800 }}>{headline}</div>
                {p && <div className="small">{p.name}{p.group ? ` · ${p.group}` : ""}{p.lastScanAt ? ` · last scan ${time(p.lastScanAt)}` : ""}</div>}
                {result.message && <div className="small" style={{ color: "#8C2F2F" }}>{result.message}</div>}</div>
            </div>
            {result.kind === "valid" && p && left > 0 && (
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <div className="row" style={{ border: "1px solid rgba(0,0,0,.2)", borderRadius: 12, padding: 3, gap: 2, flexWrap: "nowrap" }}>
                  <button type="button" className="btn btn-sm" style={{ background: "rgba(0,0,0,.06)" }} onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label="Fewer">−</button>
                  <strong style={{ minWidth: 30, textAlign: "center" }}>{count}</strong>
                  <button type="button" className="btn btn-sm" style={{ background: "rgba(0,0,0,.06)" }} onClick={() => setCount((c) => Math.min(left, c + 1))} aria-label="More">+</button>
                </div>
                <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={doAdmit} disabled={busy}>{busy ? "Recording…" : `Admit ${count}`}</button>
              </div>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResult(null)} style={{ alignSelf: "flex-start" }}>Next guest</button>
          </div>
        )}

        <form onSubmit={async (e) => { e.preventDefault(); if (q.trim().length < 2) return; try { const r = await call<{ results: PassView[] }>({ op: "search", eventId, q }); setFound(r.results); } catch { setFound([]); } }} className="row" style={{ flexWrap: "nowrap" }}>
          <label htmlFor="gq" className="sr-only">Find a guest</label>
          <input id="gq" className="input" style={{ background: "#1A1412", color: "#F7F2EA", borderColor: "#3A2F29" }} placeholder="Find by name, or paste a pass code" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-ghost" type="submit">Find</button>
        </form>
        {q.includes("/p/") && <button className="btn btn-gold btn-sm" type="button" onClick={() => void verify(q, true)}>Check this pass link</button>}
        {found.map((f) => (
          <button key={f.passId} type="button" onClick={() => show(f)} className="row between" style={{ padding: "12px 14px", borderRadius: 14, background: "#1A1412", border: "1px solid #3A2F29", color: "#F7F2EA", textAlign: "start" }}>
            <span><strong>{f.name}</strong><br /><span className="tiny" style={{ color: "#A99C8F" }}>{f.admittedTotal} of {f.admitCount} inside</span></span><span className="badge">{f.result === "complete" ? "Inside" : "Select"}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
