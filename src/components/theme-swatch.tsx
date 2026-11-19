import { bundledArt, themeFontHrefs, type ThemeDef } from "@/themes/catalog";

const MOMENT: Record<ThemeDef["interaction"], string> = { seal: "Hold the wax seal", ribbon: "Untie the ribbon", gatefold: "Open the gatefold", curtain: "Part the curtain" };

/** A preview tile: the theme's own photography, palette and type. */
export function ThemeSwatch({ theme: t, names = "Sara & Omar" }: { theme: ThemeDef; names?: string }) {
  const p = t.palette;
  const art = bundledArt(t);
  const img = art.reveal ?? art.cover;
  const [a, b] = names.split(" & ");
  return (
    <div className="sw" style={{ background: `radial-gradient(120% 90% at 50% 10%, ${p.glow}, ${p.night} 60%, ${p.night2})`, color: p.cream, position: "relative", overflow: "hidden" }}>
      {themeFontHrefs(t).slice(0, 3).map((h) => <link key={h} rel="stylesheet" href={h} precedence="default" />)}
      {img && <span aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.25), ${p.night}cc 78%), url(${img})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" }}>
        <div className="nm" style={{ fontFamily: `'${t.fonts.display}', serif`, lineHeight: 1 }}>{b ? a : names}</div>
        {b && <div style={{ fontFamily: `'${t.fonts.script}', cursive`, color: p.accent, fontSize: 30, lineHeight: 1 }}>&amp;</div>}
        {b && <div className="nm" style={{ fontFamily: `'${t.fonts.display}', serif`, lineHeight: 1 }}>{b}</div>}
        <div style={{ marginTop: 8, fontSize: 10, letterSpacing: ".24em", color: p.accent, textTransform: "uppercase" }}>{MOMENT[t.interaction]}</div>
      </div>
    </div>
  );
}
