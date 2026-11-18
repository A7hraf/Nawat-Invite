import type { Ornament as Kind } from "@/themes/catalog";

/** Divider drawn in the theme's accent colour. */
export function Ornament({ kind }: { kind: Kind }) {
  const common = { className: "inv-orn reveal", viewBox: "0 0 150 22", fill: "none", stroke: "currentColor", strokeWidth: 1.2, "aria-hidden": true } as const;
  switch (kind) {
    case "star": return <svg {...common}><path d="M0 11h55M95 11h55" /><path d="m75 2 2.6 6.4L84 11l-6.4 2.6L75 20l-2.6-6.4L66 11l6.4-2.6Z" /></svg>;
    case "arch": return <svg {...common}><path d="M0 18h50M100 18h50" /><path d="M58 20V12a17 17 0 0 1 34 0v8" /><path d="M66 20v-7a9 9 0 0 1 18 0v7" /></svg>;
    case "leaf": return <svg {...common}><path d="M0 11h56M94 11h56" /><path d="M75 3c6 4 6 12 0 16-6-4-6-12 0-16Z" /><path d="M63 11c3-4 7-4 9 0-2 4-6 4-9 0ZM87 11c-3-4-7-4-9 0 2 4 6 4 9 0Z" /></svg>;
    case "wave": return <svg {...common}><path d="M0 11c12-8 13 8 25 0s13 8 25 0 13 8 25 0 13 8 25 0 13 8 25 0 13 8 25 0" /></svg>;
    case "deco": return <svg {...common}><path d="M0 11h52M98 11h52" /><path d="M75 3 87 11 75 19 63 11Z" /><path d="M75 7l6 4-6 4-6-4Z" /><path d="M56 7v8M94 7v8" /></svg>;
    case "pearl": return <svg {...common}><path d="M0 11h54M96 11h54" />{[60, 67.5, 75, 82.5, 90].map((x, i) => <circle key={x} cx={x} cy={11} r={i === 2 ? 3.4 : 2} />)}</svg>;
    default: return <svg {...common}><path d="M0 11h55M95 11h55" /><path d="M75 4l7 7-7 7-7-7z" /><circle cx="61" cy="11" r="2" /><circle cx="89" cy="11" r="2" /></svg>;
  }
}
