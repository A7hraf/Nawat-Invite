import { useId } from "react";

/** Deterministic, slightly irregular outline so each seal looks hand-pressed rather than a perfect circle. */
function blob(r: number, wobble: number, lobes: number, seed: number) {
  const pts: string[] = [];
  const n = 72;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const d = r + Math.sin(a * lobes + seed) * wobble + Math.sin(a * (lobes * 2 + 3) + seed * 2.3) * wobble * 0.45;
    pts.push(`${(100 + Math.cos(a) * d).toFixed(2)},${(100 + Math.sin(a) * d).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

const OUTER = blob(92, 3.2, 7, 1.7);
const RIM = blob(70, 1.2, 5, 0.4);

/**
 * A wax seal drawn in SVG with the theme accent. Pure markup, so it renders on the server,
 * scales cleanly on retina screens and needs no image download.
 */
export function WaxSeal({ monogram, color, script, size = 160, className, half }: { monogram: string; color: string; script: string; size?: number; className?: string; half?: "left" | "right" }) {
  const id = useId().replace(/:/g, "");
  const clip = half === "left" ? "polygon(0 0, 52% 0, 47% 30%, 54% 52%, 46% 74%, 51% 100%, 0 100%)" : half === "right" ? "polygon(52% 0, 100% 0, 100% 100%, 51% 100%, 46% 74%, 54% 52%, 47% 30%)" : undefined;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 200 200" aria-hidden="true" style={clip ? { clipPath: clip } : undefined}>
      <defs>
        <radialGradient id={`w${id}`} cx="38%" cy="32%" r="75%">
          <stop offset="0" style={{ stopColor: `color-mix(in srgb, ${color} 55%, #fff)` }} />
          <stop offset=".35" style={{ stopColor: color }} />
          <stop offset=".8" style={{ stopColor: `color-mix(in srgb, ${color} 55%, #000)` }} />
          <stop offset="1" style={{ stopColor: `color-mix(in srgb, ${color} 35%, #000)` }} />
        </radialGradient>
        <radialGradient id={`r${id}`} cx="62%" cy="70%" r="70%">
          <stop offset="0" style={{ stopColor: `color-mix(in srgb, ${color} 70%, #000)` }} />
          <stop offset=".7" style={{ stopColor: color }} />
          <stop offset="1" style={{ stopColor: `color-mix(in srgb, ${color} 60%, #fff)` }} />
        </radialGradient>
        <filter id={`s${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity=".45" />
        </filter>
        <filter id={`t${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .18 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#s${id})`}>
        <path d={OUTER} fill={`url(#w${id})`} />
      </g>
      <path d={OUTER} fill="#000" filter={`url(#t${id})`} />
      <path d={RIM} fill={`url(#r${id})`} />
      <path d={RIM} fill="none" style={{ stroke: `color-mix(in srgb, ${color} 45%, #fff)` }} strokeOpacity=".55" strokeWidth="1.4" transform="translate(-1 -1)" />
      <circle cx="100" cy="100" r="58" fill="none" style={{ stroke: `color-mix(in srgb, ${color} 50%, #000)` }} strokeOpacity=".6" strokeWidth="1" strokeDasharray="1.5 3.2" />
      <text x="100" y="100" dy=".34em" textAnchor="middle" fontFamily={`"${script}", cursive`} fontSize={monogram.length > 3 ? 44 : 58}
        style={{ fill: `color-mix(in srgb, ${color} 42%, #000)`, stroke: `color-mix(in srgb, ${color} 55%, #fff)`, paintOrder: "stroke" }} strokeOpacity=".5" strokeWidth=".8">{monogram}</text>
      <ellipse cx="74" cy="62" rx="26" ry="12" fill="#fff" opacity=".16" transform="rotate(-28 74 62)" />
    </svg>
  );
}

/** Circular progress ring used for press-and-hold interactions. */
export function HoldRing({ progress, size }: { progress: number; size: number }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  return (
    <svg className="inv-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1.5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}
