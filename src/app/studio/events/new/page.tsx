import { redirect } from "next/navigation";
import { requireStudio } from "@/server/auth/context";
import { listEvents } from "@/server/repo/events";
import { getBrandSettings } from "@/server/settings";
import { themeSettings } from "@/server/themes";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { ThemePicker } from "@/components/theme-picker";
import { createEventAction } from "../../actions";

export const metadata = { title: "New invitation" };

export default async function NewEventPage() {
  const ctx = await requireStudio();
  if (ctx.readOnly) redirect("/studio");
  const events = await listEvents(ctx.account.id);
  const [brand, ts] = await Promise.all([getBrandSettings(), themeSettings()]);
  const full = events.length >= ctx.ent.invitations.maxEvents;
  return (
    <main className="container">
      <div className="stack-sm"><div className="crumbs"><a href="/studio">My invitations</a> / New</div><h1>New invitation</h1></div>
      {full ? <div className="notice warn">Your plan includes {ctx.ent.invitations.maxEvents} invitation(s). Contact Nawat to add another.</div> : (
        <ActionForm action={createEventAction}>
          <section className="card stack">
            <h2>The couple</h2>
            <div className="form-grid">
              <div className="field"><label htmlFor="p1en">First name (English)</label><input className="input" id="p1en" name="p1en" required maxLength={40} placeholder="Sara" /></div>
              <div className="field"><label htmlFor="p2en">Second name (English)</label><input className="input" id="p2en" name="p2en" required maxLength={40} placeholder="Omar" /></div>
              <div className="field"><label htmlFor="p1ar">First name (Arabic)</label><input className="input" id="p1ar" name="p1ar" dir="rtl" lang="ar" maxLength={40} placeholder="سارة" /></div>
              <div className="field"><label htmlFor="p2ar">Second name (Arabic)</label><input className="input" id="p2ar" name="p2ar" dir="rtl" lang="ar" maxLength={40} placeholder="عمر" /></div>
              <div className="field"><label htmlFor="type">Occasion</label>
                <select className="input" id="type" name="type" defaultValue="WEDDING"><option value="ENGAGEMENT">Engagement</option><option value="WEDDING">Wedding</option><option value="RECEPTION">Reception</option><option value="HENNA">Henna night</option><option value="OTHER">Other celebration</option></select></div>
              <div className="field"><label htmlFor="startsAt">Date & time (Muscat)</label><input className="input" id="startsAt" name="startsAt" type="datetime-local" required /></div>
            </div>
          </section>
          <section className="stack">
            <h2>Choose a theme</h2>
            <ThemePicker allowed={ctx.ent.themes.tiers} tierOf={ts.tierOf} hidden={ts.hidden} tierNames={brand.tierNames} />
          </section>
          <div><SubmitButton className="btn btn-gold" pending="Creating…">Create invitation</SubmitButton></div>
        </ActionForm>
      )}
    </main>
  );
}
