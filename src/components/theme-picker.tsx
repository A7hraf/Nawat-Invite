import type { Tier } from "@/lib/entitlements";
import type { BrandSettings } from "@/lib/brand";
import { THEMES } from "@/themes/catalog";
import { ThemeSwatch } from "./theme-swatch";
import { IconLock } from "./ui/icons";

/** Radio grid of themes; themes outside the plan are shown locked. */
export function ThemePicker({ allowed, tierOf, hidden, value, tierNames, names }: {
  allowed: Tier[]; tierOf: Record<string, Tier>; hidden: Set<string>; value?: string; tierNames: BrandSettings["tierNames"]; names?: string;
}) {
  const visible = THEMES.filter((t) => !hidden.has(t.slug));
  const first = value ?? visible.find((t) => allowed.includes(tierOf[t.slug] ?? t.tier))?.slug;
  return (
    <div className="grid-3" role="radiogroup" aria-label="Theme">
      {visible.map((t) => {
        const tier = tierOf[t.slug] ?? t.tier;
        const ok = allowed.includes(tier);
        return (
          <label key={t.slug} className="theme-pick">
            <input type="radio" name="themeSlug" value={t.slug} defaultChecked={t.slug === first} disabled={!ok} aria-label={`${t.name.en}${ok ? "" : " (not in your plan)"}`} />
            <div className={`theme-card${ok ? "" : " locked"}`}>
              <ThemeSwatch theme={t} names={names} />
              <div className="b">
                <div className="row between"><strong>{t.name.en}</strong><span className={`badge ${tier === "ROYAL_SEAL" ? "wine" : tier === "GILDED" ? "gold" : ""}`}>{tierNames[tier].en}</span></div>
                <div className="tiny muted">{t.tagline.en}</div>
                {!ok && <div className="tiny row" style={{ color: "var(--gold-t)", gap: 6 }}><IconLock size={14} />Ask Nawat to upgrade</div>}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
