"use client";
import { useEffect, useRef, useState } from "react";
import type { ThemeDef } from "@/themes/catalog";
import { mountOpening, webglAvailable, type OpeningHandle } from "./openings";
import type { Strings } from "./i18n";

type Props = {
  theme: ThemeDef; accent: string; monogram: string; names: { en: string; ar: string };
  guestName: { en: string; ar: string } | null; dateText: string;
  t: Strings; whoText: string; replayToken: number;
  onBegin: () => void; onDone: () => void;
};

/** Full-screen 3D opening. Falls back to a tappable seal when WebGL is unavailable. */
export function Opening(p: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handle = useRef<OpeningHandle | null>(null);
  const [gl, setGl] = useState<"loading" | "ready" | "fallback">("loading");
  const [opening, setOpening] = useState(false);
  const cbs = useRef({ onBegin: p.onBegin, onDone: p.onDone });
  useEffect(() => { cbs.current = { onBegin: p.onBegin, onDone: p.onDone }; });

  useEffect(() => {
    if (!webglAvailable()) { setGl("fallback"); return; }
    let disposed = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mountOpening(p.theme.opening, canvasRef.current!, {
      theme: p.theme, accent: p.accent, monogram: p.monogram, names: p.names, guestName: p.guestName, dateText: p.dateText, reducedMotion: reduced,
    }, { onBegin: () => { setOpening(true); cbs.current.onBegin(); }, onDone: () => cbs.current.onDone() })
      .then((h) => { if (disposed) h.dispose(); else { handle.current = h; setGl("ready"); } })
      .catch((e) => { console.error("3D opening failed", e); if (!disposed) setGl("fallback"); });
    return () => { disposed = true; handle.current?.dispose(); handle.current = null; };
    // the scene is built once per invitation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (p.replayToken === 0) return;
    setOpening(false);
    handle.current?.reset();
  }, [p.replayToken]);

  const open = () => {
    if (gl === "ready") handle.current?.open();
    else { setOpening(true); p.onBegin(); setTimeout(p.onDone, 900); }
  };

  return (
    <>
      <canvas ref={canvasRef} onClick={open} aria-hidden="true" style={{ display: gl === "fallback" ? "none" : "block" }} />
      {gl === "fallback" && <div className="inv-fallback"><button type="button" onClick={open} aria-label={p.t.tap}>{p.monogram}</button></div>}
      <div className={`inv-ui${opening ? " opening" : ""}`}>
        <div className="for"><div className="inv-kicker">{p.t.forKicker}</div><div className="who">{p.whoText}</div></div>
        <div style={{ flex: 1 }} />
        <div className="hint">
          <button type="button" onClick={open} className="big" style={{ background: "none", border: 0, color: "inherit", padding: 6 }}>{p.t.tap}</button>
          <div className="tick" />
          <button type="button" className="inv-skip" onClick={() => { setOpening(true); p.onBegin(); p.onDone(); }}>{p.t.skip}</button>
        </div>
      </div>
    </>
  );
}
