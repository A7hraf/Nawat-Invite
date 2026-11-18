import { requireStaff } from "@/server/auth/context";
import { getDb, schema } from "@/server/db";
import { getBrandSettings } from "@/server/settings";
import { THEMES } from "@/themes/catalog";
import { ThemeSwatch } from "@/components/theme-swatch";
import { Switch } from "@/components/ui/form";
import { saveThemeAction } from "../actions";

export const metadata = { title: "Themes" };

export default async function ThemesPage() {
  await requireStaff();
  const db = await getDb();
  const rows = new Map((await db.select().from(schema.themes)).map((r) => [r.slug, r]));
  const brand = await getBrandSettings();
  return (
    <>
      <div className="stack-sm"><div className="kicker">Control Room</div><h1>Themes</h1><p className="muted" style={{ margin: 0 }}>Choose which tier unlocks each theme, hide a theme, or preview it with sample content.</p></div>
      <div className="grid-3">
        {THEMES.map((t) => {
          const r = rows.get(t.slug);
          return (
            <div key={t.slug} className="theme-card">
              <ThemeSwatch theme={t} />
              <div className="b">
                <div className="row between"><strong>{t.name.en}</strong><span className="tiny muted">{t.opening}</span></div>
                <div className="tiny muted">{t.inspiration}</div>
                <form action={saveThemeAction} className="row between" style={{ marginTop: 8 }}>
                  <input type="hidden" name="slug" value={t.slug} />
                  <label className="sr-only" htmlFor={`tier-${t.slug}`}>Tier</label>
                  <select id={`tier-${t.slug}`} className="input" name="tier" defaultValue={r?.tier ?? t.tier} style={{ width: 140, height: 38 }}>
                    <option value="IVORY">{brand.tierNames.IVORY.en}</option><option value="GILDED">{brand.tierNames.GILDED.en}</option><option value="ROYAL_SEAL">{brand.tierNames.ROYAL_SEAL.en}</option>
                  </select>
                  <Switch name="active" defaultChecked={r?.active ?? true} label={`${t.name.en} visible`} />
                  <button className="btn btn-ghost btn-sm" type="submit">Save</button>
                </form>
                <a className="small" href={`/preview/${t.slug}`} target="_blank" rel="noopener">Preview with sample content</a>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
