"use client";
import { useEffect, useRef, useState } from "react";
import type { Interaction } from "@/themes/catalog";
import type { Strings } from "./i18n";
import { HoldRing, WaxSeal } from "./WaxSeal";
import { useHold } from "./useHold";

type Props = {
  interaction: Interaction; cover: string; reveal: string | null; texture: string | null;
  accent: string; script: string; monogram: string;
  t: Strings; whoText: string; replayToken: number; reducedMotion: boolean;
  onBegin: () => void; onDone: () => void;
};

const OPEN_MS: Record<Interaction, number> = { seal: 2300, ribbon: 2400, gatefold: 2300, curtain: 2600 };

/**
 * Opening built from the theme's photographed artwork: the guest presses the wax seal, unties the
 * ribbon, opens the gatefold or parts the curtain, and the revealed scene comes forward.
 */
export function PhotoOpening(p: Props) {
  const [phase, setPhase] = useState<"idle" | "opening" | "done">("idle");
  const [ready, setReady] = useState(false);
  const begun = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbs = useRef({ onBegin: p.onBegin, onDone: p.onDone });
  useEffect(() => { cbs.current = { onBegin: p.onBegin, onDone: p.onDone }; });

  // Wait for the cover to decode so the guest never sees it pop in.
  useEffect(() => {
    const img = new Image();
    img.src = p.cover;
    img.decode().catch(() => undefined).finally(() => setReady(true));
    if (p.reveal) { const r = new Image(); r.src = p.reveal; }
  }, [p.cover, p.reveal]);

  const begin = () => { if (!begun.current) { begun.current = true; cbs.current.onBegin(); } };
  const open = () => {
    if (phase !== "idle") return;
    begin();
    setPhase("opening");
    timer.current = setTimeout(() => { setPhase("done"); cbs.current.onDone(); }, p.reducedMotion ? 500 : OPEN_MS[p.interaction]);
  };
  const hold = useHold(1100, open, { onStart: begin, disabled: phase !== "idle" });

  useEffect(() => {
    if (p.replayToken === 0) return;
    if (timer.current) clearTimeout(timer.current);
    begun.current = false; hold.reset(); setPhase("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.replayToken]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const k = p.interaction;
  const cls = `inv-photo k-${k} ${phase}${ready ? " ready" : ""}${p.reducedMotion ? " still" : ""}`;
  const prompt = k === "seal" ? p.t.holdSeal : k === "ribbon" ? p.t.untie : k === "curtain" ? p.t.partCurtain : p.t.openGate;
  const halves = k === "gatefold" || k === "curtain";
  const tex = p.texture && k === "curtain" ? `url(${p.texture})` : null;

  return (
    <div className={cls}>
      <div className="ph-reveal" style={{ backgroundImage: `url(${p.reveal ?? p.cover})` }} />
      {halves ? (
        <>
          <div className="ph-half ph-l" style={{ backgroundImage: tex ?? `url(${p.cover})` }} onClick={open} />
          <div className="ph-half ph-r" style={{ backgroundImage: tex ?? `url(${p.cover})` }} onClick={open} />
          {k === "curtain" && <div className="ph-valance" style={tex ? { backgroundImage: tex } : undefined} />}
        </>
      ) : (
        <div className="ph-cover" style={{ backgroundImage: `url(${p.cover})` }} onClick={k === "ribbon" ? open : undefined} />
      )}
      {k === "ribbon" && (
        <div className="ph-ribbon" aria-hidden="true">
          <i className="rv" /><i className="rh1" /><i className="rh2" />
          <svg className="bow" viewBox="0 0 200 120"><defs><linearGradient id="bowg" x1="0" x2="1"><stop offset="0" style={{ stopColor: `color-mix(in srgb, ${p.accent} 60%, #000)` }} /><stop offset=".5" style={{ stopColor: `color-mix(in srgb, ${p.accent} 70%, #fff)` }} /><stop offset="1" style={{ stopColor: `color-mix(in srgb, ${p.accent} 60%, #000)` }} /></linearGradient></defs>
            <path d="M100 60C70 20 22 8 18 34s40 40 82 26ZM100 60c30-40 78-52 82-26s-40 40-82 26Z" fill="url(#bowg)" /><path d="M100 60 70 116l14-4 6 10 10-62ZM100 60l30 56-14-4-6 10-10-62Z" fill="url(#bowg)" opacity=".92" /><ellipse cx="100" cy="60" rx="15" ry="13" fill={p.accent} /></svg>
        </div>
      )}
      {(k === "seal" || k === "gatefold") && (
        <button type="button" className="ph-seal" aria-label={prompt} {...(k === "seal" ? hold.handlers : { onClick: open })}>
          {k === "seal" && <HoldRing progress={hold.progress} size={196} />}
          <span className="sl"><WaxSeal monogram={p.monogram} color={p.accent} script={p.script} size={150} half="left" /></span>
          <span className="sr"><WaxSeal monogram={p.monogram} color={p.accent} script={p.script} size={150} half="right" /></span>
        </button>
      )}
      <div className="ph-vignette" />
      <div className={`inv-ui${phase !== "idle" ? " opening" : ""}`}>
        <div className="for"><div className="inv-kicker">{p.t.forKicker}</div><div className="who">{p.whoText}</div></div>
        <div style={{ flex: 1 }} />
        <div className="hint">
          {k === "seal"
            ? <div className="big" aria-hidden="true">{hold.holding ? p.t.keepHolding : prompt}</div>
            : <button type="button" onClick={open} className="big" style={{ background: "none", border: 0, color: "inherit", padding: 6 }}>{prompt}</button>}
          <div className="tick" />
          <button type="button" className="inv-skip" onClick={() => { begin(); if (timer.current) clearTimeout(timer.current); setPhase("done"); cbs.current.onDone(); }}>{p.t.skip}</button>
        </div>
      </div>
    </div>
  );
}
