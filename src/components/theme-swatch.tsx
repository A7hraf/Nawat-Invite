import type { ThemeDef } from "@/themes/catalog";

/** A small preview tile in the theme's own palette and type. */
export function ThemeSwatch({ theme: t, names = "Sara & Omar" }: { theme: ThemeDef; names?: string }) {
  const p = t.palette;
  return (
    <div className="sw" style={{ background: `radial-gradient(120% 90% at 50% 10%, ${p.glow}, ${p.night} 60%, ${p.night2})`, color: p.cream }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <span style={{ width: 34, height: 34, borderRadius: "50%", background: `radial-gradient(circle at 34% 30%, ${p.accent}, ${p.accentText})`, boxShadow: "0 6px 14px rgba(0,0,0,.35)" }} />
        <div className="nm" style={{ fontFamily: `'${t.fonts.display}', serif` }}>{names}</div>
        <div style={{ fontSize: 11, letterSpacing: ".24em", color: p.accent, textTransform: "uppercase" }}>{t.opening === "envelope" ? "Envelope & seal" : t.opening === "doors" ? "Palace doors" : t.opening === "curtain" ? "Velvet curtain" : "Jewel box"}</div>
      </div>
    </div>
  );
}
