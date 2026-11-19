"use client";
import { useEffect, useRef, useState } from "react";
import type { Strings } from "./i18n";
import { WaxSeal } from "./WaxSeal";

/**
 * Envelope opening in the style of luxury animated invitations: an embossed envelope sealed with wax.
 * Tapping the seal breaks it, the flap lifts and the embossed card rises out of the envelope.
 * The card itself (relief → painted colour bloom) is rendered by <StoryCard/> once the page opens.
 */
export function StoryOpening(p: {
  envelope: string; envelopeTint: string; liner: string; relief: string; faux?: boolean; tone: "light" | "dark"; accent: string; script: string; monogram: string;
  t: Strings; whoText: string; replayToken: number; reducedMotion: boolean; onBegin: () => void; onDone: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "seal" | "flap" | "rise">("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cbs = useRef({ onBegin: p.onBegin, onDone: p.onDone });
  useEffect(() => { cbs.current = { onBegin: p.onBegin, onDone: p.onDone }; });
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { if (p.replayToken) { timers.current.forEach(clearTimeout); setPhase("idle"); } }, [p.replayToken]);
  // Preload the card so it is ready when it rises.
  useEffect(() => { const i = new Image(); i.src = p.relief; }, [p.relief]);

  const open = () => {
    if (phase !== "idle") return;
    cbs.current.onBegin();
    const k = p.reducedMotion ? 0.25 : 1;
    setPhase("seal");
    const at = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms * k));
    at(650, () => setPhase("flap"));
    at(1650, () => setPhase("rise"));
    at(3300, () => cbs.current.onDone());
  };

  return (
    <div className={`sb-open ${phase} tone-${p.tone}`} style={{ ["--tint" as string]: p.envelopeTint, ["--liner" as string]: p.liner }}>
      <div className="sb-frame">
        <div className="sb-back" style={{ backgroundImage: `url(${p.envelope})` }}><i className="tint" /></div>
        <div className="sb-flap-wrap" aria-hidden="true">
          <div className="sb-flap">
            <div className="face front" style={{ backgroundImage: `url(${p.envelope})` }}><i className="tint" /></div>
            <div className="face inside" />
          </div>
        </div>
        <div className="sb-card" aria-hidden="true"><i className={p.faux ? "faux" : undefined} style={{ backgroundImage: `url(${p.relief})` }} /></div>
        <div className="sb-pocket" style={{ backgroundImage: `url(${p.envelope})` }} aria-hidden="true"><i className="tint" /></div>
        <button type="button" className="sb-seal" onClick={open} aria-label={p.t.tapSeal}>
          <span className="sl"><WaxSeal monogram={p.monogram} color={p.accent} script={p.script} size={132} half="left" /></span>
          <span className="sr"><WaxSeal monogram={p.monogram} color={p.accent} script={p.script} size={132} half="right" /></span>
        </button>
        <div className="sb-to">
          <div className="k">{p.t.forKicker}</div>
          <div className="w">{p.whoText}</div>
        </div>
        <div className="sb-hint" aria-hidden="true"><span>{p.t.tapSeal}</span></div>
      </div>
    </div>
  );
}

type Detail = { icon: "date" | "time" | "place"; label: string; value: string; href?: string };

/** The card after it leaves the envelope: embossed paper that blooms into the painted scene. */
export function StoryCard(p: {
  relief: string; painted: string; tone: "light" | "dark"; bism: boolean; kicker: string; n1: string; n2: string; amp: string; alt: string | null;
  message: string; families: string; details: Detail[]; scrollLabel: string; lang: "ar" | "en"; fx?: React.ReactNode;
}) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStep(4); return; }
    const ts = [setTimeout(() => setStep(1), 350), setTimeout(() => setStep(2), 1300), setTimeout(() => setStep(3), 2700), setTimeout(() => setStep(4), 4300)];
    return () => ts.forEach(clearTimeout);
  }, []);
  return (
    <section className={`sb-card-sec tone-${p.tone} s${step}`}>
      <div className={`layer relief${p.relief === p.painted ? " faux" : ""}`} style={{ backgroundImage: `url(${p.relief})` }} aria-hidden="true" />
      <div className="layer painted" style={{ backgroundImage: `url(${p.painted})` }} aria-hidden="true" />
      {p.fx}
      <div className="doves" aria-hidden="true">{[0, 1, 2].map((i) => <Dove key={i} i={i} />)}</div>
      <div className="txt">
        {p.bism && <div className="bism" lang="ar">بسم الله الرحمن الرحيم</div>}
        <div className="kick">{p.kicker}</div>
        <h1 className="names">
          <span className="w n1">{p.n1}</span>
          <span className="amp">{p.amp}</span>
          <span className="w n2">{p.n2}</span>
        </h1>
        {p.alt && <div className="alt" lang={p.lang === "ar" ? "en" : "ar"}>{p.alt}</div>}
        {p.message && <p className="msg">{p.message}</p>}
        {p.families && <p className="fam">{p.families}</p>}
        <ul className="det">
          {p.details.map((d, i) => (
            <li key={d.icon} style={{ transitionDelay: `${0.15 + i * 0.18}s` }}>
              <DetailIcon kind={d.icon} />
              <span className="l">{d.label}</span>
              {d.href ? <a className="v" href={d.href} target="_blank" rel="noopener noreferrer">{d.value}</a> : <span className="v">{d.value}</span>}
            </li>
          ))}
        </ul>
      </div>
      <div className="inv-cue" aria-hidden="true"><span>{p.scrollLabel}</span><i /></div>
    </section>
  );
}

function DetailIcon({ kind }: { kind: Detail["icon"] }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (kind === "date") return <svg {...common}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></svg>;
  if (kind === "time") return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
  return <svg {...common}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z" /><circle cx="12" cy="10" r="2.3" /></svg>;
}

function Dove({ i }: { i: number }) {
  return (
    <svg className={`dove d${i}`} viewBox="0 0 64 40" width={i === 1 ? 26 : 20}>
      <path className="wing w1" d="M30 22c-6-12-16-17-26-15 7 3 13 9 18 17Z" />
      <path d="M18 24c8-5 22-6 34-3 4 1 8-1 10-4-1 6-6 9-12 10-9 2-21 2-32-3Z" />
      <path className="wing w2" d="M34 21c4-11 13-17 24-17-6 4-11 10-14 18Z" />
    </svg>
  );
}
