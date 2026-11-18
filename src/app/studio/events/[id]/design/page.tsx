import { redirect } from "next/navigation";
import { studioEvent } from "@/server/studio";
import { getBrandSettings } from "@/server/settings";
import { themeSettings } from "@/server/themes";
import { parseContent } from "@/lib/event-content";
import { themeBySlug } from "@/themes/catalog";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { ThemePicker } from "@/components/theme-picker";
import { saveDesignAction } from "../../../actions";

export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, ev } = await studioEvent(id);
  if (ctx.readOnly) redirect(`/studio/events/${ev.id}`);
  const [brand, ts] = await Promise.all([getBrandSettings(), themeSettings()]);
  const c = parseContent(ev.content);
  const t = themeBySlug(ev.themeSlug);
  const names = `${c.partner1.en || c.partner1.ar} & ${c.partner2.en || c.partner2.ar}`;
  return (
    <ActionForm action={saveDesignAction}>
      <input type="hidden" name="eventId" value={ev.id} />
      <section className="card row between">
        <div className="stack-sm"><h2>Accent colour</h2><div className="small muted">Optional: replaces the theme’s metal accent ({t?.palette.accent}).</div></div>
        <div className="row">
          <label className="sr-only" htmlFor="accent">Accent colour</label>
          <input id="accent" type="color" name="accent" defaultValue={c.accent ?? t?.palette.accent ?? "#C9A45C"} style={{ width: 54, height: 44, border: 0, background: "none" }} />
          <label className="check small"><input type="checkbox" name="accentDefault" defaultChecked={!c.accent} />Use the theme’s own accent</label>
        </div>
      </section>
      <ThemePicker allowed={ctx.ent.themes.tiers} tierOf={ts.tierOf} hidden={ts.hidden} value={ev.themeSlug} tierNames={brand.tierNames} names={names} />
      <div className="row"><SubmitButton className="btn btn-gold">Save theme</SubmitButton><a className="btn btn-ghost" href={`/studio/events/${ev.id}/preview`} target="_blank" rel="noopener">Preview</a></div>
    </ActionForm>
  );
}
